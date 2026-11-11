import test from 'node:test';
import assert from 'node:assert/strict';
import {cashFixture} from './fixtures/cash-runway.js';
import {prepareToolLayout} from '../src/workspace/tool-layout.js';
import {readCustomLayout} from '../src/shared/custom-layout.js';
import {syncTemplateCatalog,installCatalogApp,manifestFieldId} from '../src/workspace/template-catalog.js';
import {appTemplates} from '../src/workspace/app-templates.js';
import {readFile} from 'node:fs/promises';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {randomUUID} from 'node:crypto';
test('installed Runway uses the real manifest, reviewed writes and versioned native layout',async()=>{
 const x=await cashFixture();const {f,s,w,actor,component,map}=x;
 try{
  const run=(state:any={},event:any={kind:'open'})=>f.runFrontend(actor,w.id,{componentId:component.id,expectedVersion:component.version,state,event});
  const lines=async()=>(await s.records(actor,w.id,map['runway.plan_lines'].typeId,{limit:100,offset:0})).rows;
  // 1,000 opening at Sep 2026, 100/month rent: closing cash stays ≥ 0 for 10 months.
  const initial=await run();assert.equal(initial.connected,true);assert.match(initial.html,/Cash lasts until Jul 2027/);assert.match(initial.html,/10 months/);
  const add=await run({section:'plan'},{kind:'click',action:'add:lines'});
  const proposal=await run(add.state,{kind:'submit',action:'save-record',form:{name:'Assay',direction:'spend',category:'Research',program_id:x.program,driver:'one_off',amount:'250',currency:'EUR',start_month:'2026-11',status:'committed'}});
  assert.ok(proposal.proposal,proposal.state?.notice);assert.equal((await lines()).length,1);
  await f.confirm(actor,w.id,proposal.proposal.id,proposal.proposal.digest);
  const rows=await lines();assert.equal(rows.length,2);const record=rows.find((r:any)=>r.data.name==='Assay')!;
  assert.equal(record.data.start_month,'2026-11-01');assert.equal(record.data.program_id,x.program);
  assert.match((await run()).html,/Cash lasts until Apr 2027/);
  const archive=await run({section:'plan',confirm:{kind:'archive',role:'lines',id:record.id,version:record.version}},{kind:'click',action:'confirm-archive'});assert.ok(archive.proposal);
  await f.confirm(actor,w.id,archive.proposal.id,archive.proposal.digest);assert.equal((await lines()).find((r:any)=>r.id===record.id)?.data.archived,true);
  const profile=readCustomLayout(component.source)!.profile;profile.tabs.reverse();profile.cols.lines.reverse();profile.heading='Board runway';
  const request={componentId:component.id,expectedVersion:component.version,name:profile.heading,description:'',customLayout:profile};
  const preview=await prepareToolLayout(f,actor,w.id,request);
  assert.equal((await f.readComponent(actor,w.id,component.id)).component.source,component.source);
  await f.confirm(actor,w.id,preview.id,preview.digest);
  const saved=(await f.readComponent(actor,w.id,component.id)).component;
  assert.deepEqual(readCustomLayout(saved.source)!.profile,profile);assert.deepEqual(saved.bindings,component.bindings);assert.deepEqual(saved.manifest,component.manifest);
  const opened=await f.runFrontend(actor,w.id,{componentId:saved.id,expectedVersion:saved.version,state:{layout:{tabs:['overview'],cols:{},visible:{},heading:'Stale'}}});assert.match(opened.html,/Board runway/);
  await assert.rejects(prepareToolLayout(f,actor,w.id,request),/changed/);
  await assert.rejects(prepareToolLayout(f,{userId:randomUUID(),origin:'human'},w.id,{...request,expectedVersion:saved.version}));
  const ignored=await prepareToolLayout(f,actor,w.id,{...request,expectedVersion:saved.version,customLayout:{...profile,heading:'Ignored'}});await f.discard(actor,w.id,ignored.id);assert.equal((await f.readComponent(actor,w.id,saved.id)).component.name,'Board runway');
  const rent=(await lines()).find((r:any)=>r.data.name==='Rent')!;
  const edit=await f.runFrontend(actor,w.id,{componentId:saved.id,expectedVersion:saved.version,event:{kind:'click',action:'edit:lines:'+rent.id}});
  await x.save({kind:'update_record',recordId:rent.id,expectedVersion:rent.version,data:{name:'Concurrent edit'}});
  await assert.rejects(f.runFrontend(actor,w.id,{componentId:saved.id,expectedVersion:saved.version,state:edit.state,event:{kind:'submit',action:'save-record',form:{name:'Stale edit'}}}),/changed|version/i);
 }finally{await x.pg.close();}
});
test('the approved 2.1.0 catalog entry replaces 2.0.0 and 1.2.2 and its installer creates thirteen empty tables and an app that opens with no automation',async()=>{
 const x=await cashFixture();
 try{
  await syncTemplateCatalog(x.db);const row=(await x.db.query("SELECT status,install_schema FROM app_template_catalog WHERE template_id='life.cash-runway' AND version='2.1.0'")).rows[0];
  // Owner-approved replacement: a fresh catalog approves 2.1.0 and lists it instead of 2.0.0 and 1.2.2.
  assert.equal(row.status,'approved');assert.equal(Object.keys(row.install_schema).length,13);
  for(const old of ['1.2.2','2.0.0'])assert.equal((await x.db.query("SELECT status FROM app_template_catalog WHERE template_id='life.cash-runway' AND version=$1",[old])).rows[0].status,'draft');
  const catalog=new AppTemplates(undefined,x.db),listed=(await catalog.list({query:'runway'})).templates.find(t=>t.id==='life.cash-runway');assert.equal(listed?.version,'2.1.0');assert.equal(listed?.name,'Runway');
  const t=await catalog.read({templateId:'life.cash-runway'});assert.equal(t.version,'2.1.0');
  const w=await x.s.createWorkspace(x.actor,'Install'),before=(await x.db.query('SELECT count(*)::int n FROM entity_types WHERE workspace_id=$1',[w.id])).rows[0].n;
  const app=await installCatalogApp(x.f,x.actor,w.id,{templateId:t.id,version:t.version,digest:t.digest,name:'Runway',requestKey:randomUUID()});
  assert.equal((await x.db.query('SELECT count(*)::int n FROM entity_types WHERE workspace_id=$1',[w.id])).rows[0].n-before,13);
  assert.equal((await x.db.query('SELECT count(*)::int n FROM records WHERE workspace_id=$1',[w.id])).rows[0].n,0);
  const c=(await x.f.readComponent(x.actor,w.id,app.appId)).component;
  const out=await x.f.runFrontend(x.actor,w.id,{componentId:c.id,expectedVersion:c.version,event:{kind:'open'}});
  assert.match(out.html,/Set up your first runway/);assert.doesNotMatch(out.html,/not bound|could not be calculated/);
  const settings=await x.f.runFrontend(x.actor,w.id,{componentId:c.id,expectedVersion:c.version,state:{section:'settings'},event:{kind:'click',action:'edit-settings'}});
  const p=await x.f.runFrontend(x.actor,w.id,{componentId:c.id,expectedVersion:c.version,state:settings.state,event:{kind:'submit',action:'save-record',form:{reporting_currency:'EUR',opening_balance:'5000',opening_date:'2026-10-31',runway_target_months:'18',trailing_window_months:'3'}}});
  assert.ok(p.proposal,p.state?.notice);await x.f.confirm(x.actor,w.id,p.proposal.id,p.proposal.digest);
  assert.match((await x.f.runFrontend(x.actor,w.id,{componentId:c.id,expectedVersion:c.version,event:{kind:'open'}})).html,/Cash lasts beyond Oct 2031/);
 }finally{await x.pg.close();}
});

/* MODULAR_APPS_AND_SHARED_DATA.md §3 rule 9: install alone; install with its partner apps; delete a partner app;
 * remove one tab; reinstall. The app keeps working with correct, explicitly labelled data at each step.
 * Hand calculation: opening 1,000,000 at Jun 2026, spend 30,000/month → closing Mar 2029 = 10,000, Apr 2029 < 0:
 * 33 months. The Programs key milestone (Jun 2027, 12 months out) has 640,000 cash and a 21-month cushion. */
test('rule 9 modularity: alone, with Programs, Programs deleted, binding removed, reinstall',async()=>{
 const x=await cashFixture();const {pg,db,f,s,actor}=x;
 try{
  await syncTemplateCatalog(db);
  const t=await new AppTemplates(undefined,db).read({templateId:'life.cash-runway',version:'2.1.0'});
  const contract=JSON.parse(await readFile('templates/core-contract/v1.json','utf8'));
  const open=async(w:string,id:string)=>{const c=(await f.readComponent(actor,w,id)).component;return f.runFrontend(actor,w,{componentId:c.id,expectedVersion:c.version,event:{kind:'open'}});};
  const change=async(w:string,op:any)=>{const p=await f.preview(actor,w,op);return f.confirm(actor,w,p.id,p.digest);};
  const save=async(w:string,typeId:string,data:any)=>{const p=await s.preview(actor,w,{kind:'create_record',typeId,data});return (await s.commit(actor,p.id,p.digest)).objects[0].id as string;};
  const table=async(w:string,name:string,fields:any[])=>{const p=await s.preview(actor,w,{kind:'create_type',name,fields});return (await s.commit(actor,p.id,p.digest)).objects[0].id as string;};
  const count=async(sql:string,args:any[])=>(await pg.query<any>(sql,args)).rows[0].n as number;

  // 1. Install alone: empty contract-shaped tables, an app that explains what is missing and works.
  const w1=await s.createWorkspace(actor,'Alone');
  const alone=await installCatalogApp(f,actor,w1.id,{templateId:t.id,version:t.version,digest:t.digest,name:'Runway',requestKey:randomUUID()});
  assert.equal(await count('SELECT count(*)::int n FROM entity_types WHERE workspace_id=$1',[w1.id]),13);
  const programsTable=(await pg.query<any>("SELECT fields FROM entity_types WHERE workspace_id=$1 AND name='Runway · Programs'",[w1.id])).rows[0];
  assert.deepEqual(programsTable.fields.map((f:any)=>f.key),contract.roles.programs.fields.filter((f:any)=>!f.owner).map((f:any)=>f.key));
  const c1=(await f.readComponent(actor,w1.id,alone.appId)).component;assert.ok(c1.manifest.fields.some((m:any)=>m.id==='runway_plan_lines_name'));
  assert.match((await open(w1.id,alone.appId)).html,/Set up your first runway/);

  // 2. Install with its partner: the Programs app already owns the core programs table and its plan_items output.
  const w2=await s.createWorkspace(actor,'Suite'),project=randomUUID();await pg.query("INSERT INTO workspace_nodes(id,workspace_id,name,kind) VALUES($1,$2,'Apps','project')",[project,w2.id]);
  const programs=await table(w2.id,'Programs',contract.roles.programs.fields.map(({owner,...f}:any)=>f));// as Programs would create it, including its owned fields
  const planFields=[{key:'name',name:'Name',kind:'text',required:true},{key:'program_id',name:'Program',kind:'text'},{key:'item_type',name:'Item type',kind:'select',options:['milestone','activity']},{key:'end_date',name:'End date',kind:'date'},{key:'status',name:'Status',kind:'select',options:['planned','in_progress','done','at_risk','cancelled']},{key:'is_key',name:'Key milestone',kind:'boolean'},{key:'archived',name:'Archived',kind:'boolean'}].map(f=>({multiple:false,ai:true,required:false,...f}));
  const planItems=await table(w2.id,'Programs · Plan items',planFields);
  const programsApp=randomUUID();await pg.query("INSERT INTO workspace_components(id,workspace_id,project_id,name,format,source,bindings,source_access,created_by) VALUES($1,$2,$3,'Programs','frontend-js','return {html:\"<h1>Programs</h1>\",css:\"\",state:{}};',$4,'bindings',$5)",[programsApp,w2.id,project,JSON.stringify([{typeId:programs,fields:contract.roles.programs.fields.map((f:any)=>f.key)},{typeId:planItems,fields:planFields.map(f=>f.key)}]),actor.userId]);
  const tx1=await save(w2.id,programs,{name:'TX-1',stage:'phase_1',status:'active',health:'green',archived:false});
  await save(w2.id,planItems,{name:'IND filing',program_id:tx1,item_type:'milestone',end_date:'2027-06-20',status:'planned',is_key:true,archived:false});
  // Reuse, never copy: Runway binds the existing programs table and reads plan_items; it creates only its own tables.
  const schemas=JSON.parse(await readFile('templates/source/cash-runway/schema.example.json','utf8')),map:any={},bindings:any[]=[],fields:any[]=[];
  for(const [role,def] of Object.entries(schemas) as [string,any][]){
   const typeId=role==='programs'?programs:await table(w2.id,'Runway · '+def.name,def.fields),keys=def.fields.map((f:any)=>f.key);
   map[role]={typeId,fields:def.logicalFields,writableFields:Object.keys(def.logicalFields)};bindings.push({typeId,fields:keys});
   fields.push(...keys.map((k:string)=>({id:manifestFieldId(role,k),typeId,field:k,schemaVersion:0,kind:def.fields.find((f:any)=>f.key===k).kind,mode:'write'})));
  }
  const planKeys=planFields.map(f=>f.key);map['programs.plan_items']={typeId:planItems,fields:Object.fromEntries(planKeys.map(k=>[k,k])),writableFields:[]};
  bindings.push({typeId:planItems,fields:planKeys});fields.push(...planKeys.map(k=>({id:manifestFieldId('programs.plan_items',k),typeId:planItems,field:k,schemaVersion:0,kind:planFields.find(f=>f.key===k)!.kind,mode:'read'})));
  const op=await appTemplates.operation(f,actor,w2.id,{templateId:t.id,version:t.version,digest:t.digest,name:'Runway',projectId:project,configuration:{tableMap:JSON.stringify(map)},bindings,manifest:{version:1,scope:'workspace',fields}});
  const runway=(await change(w2.id,op)).id;
  assert.equal(await count("SELECT count(*)::int n FROM entity_types WHERE workspace_id=$1 AND name ILIKE '%programs'",[w2.id]),1,'one shared programs table');
  await save(w2.id,map['runway.settings'].typeId,{reporting_currency:'EUR',opening_balance:1000000,opening_date:'2026-06-30',runway_target_months:18,trailing_window_months:3,loaded_cost_pct:0,min_cash_reserve:0});
  const L=(name:string,o:any)=>save(w2.id,map['runway.plan_lines'].typeId,{name,direction:'spend',driver:'monthly',currency:'EUR',start_month:'2026-07-01',status:'committed',archived:false,...o});
  await L('Rent',{category:'Facilities',amount:10000});await L('TX-1 CRO',{category:'Clinical',amount:20000,program_id:tx1});
  const suite=(await open(w2.id,runway)).html;
  assert.match(suite,/Cash lasts until Mar 2029, 21 months after IND filing\./);assert.match(suite,/IND filing<\/strong><\/td><td>TX-1<\/td><td>Jun 2027<\/td><td class="num">EUR 640,000<\/td>.*21 months.*Programs app/);
  const records=await count('SELECT count(*)::int n FROM records WHERE workspace_id=$1',[w2.id]);

  // 3. Delete the partner app: Programs is archived; shared data stays and Runway keeps using it, still labelled.
  const v=async(id:string)=>(await pg.query<any>('SELECT version FROM workspace_components WHERE id=$1',[id])).rows[0].version;
  await change(w2.id,{kind:'archive_component',componentId:programsApp,expectedVersion:await v(programsApp),archived:true});
  assert.equal(await count('SELECT count(*)::int n FROM records WHERE workspace_id=$1',[w2.id]),records);
  for(const id of [programs,planItems])assert.equal((await pg.query<any>('SELECT archived_at FROM entity_types WHERE id=$1',[id])).rows[0].archived_at,null);
  const afterPartner=(await open(w2.id,runway)).html;assert.match(afterPartner,/Cash lasts until Mar 2029, 21 months after IND filing\./);assert.match(afterPartner,/<td>TX-1<\/td>/);

  // 4. Remove one tab: unbind the Programs milestones from Runway. Runway works alone; no record or table is deleted.
  const current=(await f.readComponent(actor,w2.id,runway)).component;
  const unboundMap={...map};delete unboundMap['programs.plan_items'];
  const withMap=(src:string,m:any)=>src.replace(/^const templateConfiguration=(.+);\n/,(_:string,json:string)=>'const templateConfiguration='+JSON.stringify({...JSON.parse(json),tableMap:JSON.stringify(m)})+';\n');
  const revise=async(m:any,b:any[],man:any[])=>{const c=(await f.readComponent(actor,w2.id,runway)).component;return change(w2.id,{kind:'save_component',componentId:runway,expectedVersion:c.version,projectId:project,content:{name:c.name,format:'frontend-js',source:withMap(c.source,m),sourceAccess:'workspace',bindings:b,manifest:{version:1,scope:'workspace',fields:man}}});};
  await revise(unboundMap,bindings.filter(b=>b.typeId!==planItems),fields.filter(m=>m.typeId!==planItems));
  const tabless=(await open(w2.id,runway)).html;assert.match(tabless,/Cash lasts until Mar 2029\./);assert.match(tabless,/Only Runway milestones are shown/);assert.doesNotMatch(tabless,/IND filing|could not be calculated|rw-banner bad/);
  assert.equal(await count('SELECT count(*)::int n FROM records WHERE workspace_id=$1',[w2.id]),records);
  assert.deepEqual((await pg.query<any>('SELECT fields FROM entity_types WHERE id=$1',[planItems])).rows[0].fields.map((f:any)=>f.key),planKeys,'the archived Programs app still protects its fields');
  // Re-adding the binding reconnects the same table.
  await revise(map,bindings,fields);assert.match((await open(w2.id,runway)).html,/21 months after IND filing/);
  assert.equal((await f.readComponent(actor,w2.id,runway)).component.bindings.filter((b:any)=>b.typeId===planItems).length,1);

  // 5. Reinstall: the archived Runway is offered first; restoring brings back the same data; "start fresh" keeps the old data.
  await change(w1.id,{kind:'archive_component',componentId:alone.appId,expectedVersion:await v(alone.appId),archived:true});
  const tablesBefore=await count('SELECT count(*)::int n FROM entity_types WHERE workspace_id=$1',[w1.id]);
  await assert.rejects(()=>installCatalogApp(f,actor,w1.id,{templateId:t.id,version:t.version,digest:t.digest,name:'Runway',requestKey:randomUUID()}),/Restore your archived Runway app/);
  await change(w1.id,{kind:'archive_component',componentId:alone.appId,expectedVersion:await v(alone.appId),archived:false});
  const restored=(await f.readComponent(actor,w1.id,alone.appId)).component;assert.equal(restored.archived,false);assert.deepEqual(restored.bindings,c1.bindings);
  assert.match((await open(w1.id,alone.appId)).html,/Set up your first runway/);
  const fresh=await installCatalogApp(f,actor,w1.id,{templateId:t.id,version:t.version,digest:t.digest,name:'Runway',requestKey:randomUUID(),createNew:true});
  assert.notEqual(fresh.appId,alone.appId);assert.equal(await count('SELECT count(*)::int n FROM entity_types WHERE workspace_id=$1',[w1.id]),tablesBefore+13);
  assert.deepEqual((await f.readComponent(actor,w1.id,alone.appId)).component.bindings,c1.bindings,'the original app keeps its own tables');
 }finally{await x.pg.close();}
});
