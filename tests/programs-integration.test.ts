import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {programsFixture} from './fixtures/programs.js';
import {prepareToolLayout} from '../src/workspace/tool-layout.js';
import {readCustomLayout} from '../src/shared/custom-layout.js';
import {syncTemplateCatalog,installCatalogApp,readCatalogInstallation} from '../src/workspace/template-catalog.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {archivedItems} from '../src/workspace/archive.js';

test('installed Programs: exact reviewed slip save, native layout and stale-edit rejection',async()=>{
 const x=await programsFixture();const {f,s,w,actor,component,map}=x;
 try{
  const run=(state:any={},event:any={kind:'open'})=>f.runFrontend(actor,w.id,{componentId:component.id,expectedVersion:component.version,state,event});
  const rows=async(role:string)=>(await s.records(actor,w.id,map[role].typeId,{limit:200,offset:0})).rows;
  const ind=(await rows('programs.plan_items')).find((r:any)=>r.data.name==='IND submission')!;
  const opened=await run();assert.equal(opened.connected,true);assert.match(opened.html,/Candidate selection · PX-202, 15 Dec 2026/);
  const edit=await run({section:'plan'},{kind:'click',action:'edit:items:'+ind.id});
  const p=await run(edit.state,{kind:'submit',action:'save-record',form:{end_date:'2027-04-21',slip_reason:'regulatory'}});
  assert.ok(p.proposal,p.state?.notice);assert.equal((await rows('programs.slips')).length,2,'nothing written before approval');
  await f.confirm(actor,w.id,p.proposal.id,p.proposal.digest);
  const slips=await rows('programs.slips');assert.equal(slips.length,3);const slip=slips.find((r:any)=>r.data.plan_item_id===ind.id)!;
  assert.deepEqual([slip.data.old_end,slip.data.new_end,slip.data.days,slip.data.reason],['2027-03-31','2027-04-21',21,'regulatory']);
  assert.equal((await rows('programs.plan_items')).find((r:any)=>r.id===ind.id)!.data.end_date,'2027-04-21');
  // Native layout: presentation only, versioned review, re-read on every render.
  const profile=readCustomLayout(component.source)!.profile;profile.tabs.reverse();profile.cols.items.reverse();profile.heading='Board programs';
  const preview=await prepareToolLayout(f,actor,w.id,{componentId:component.id,expectedVersion:component.version,name:profile.heading,description:'',customLayout:profile});
  await f.confirm(actor,w.id,preview.id,preview.digest);const saved=(await f.readComponent(actor,w.id,component.id)).component;
  assert.deepEqual(readCustomLayout(saved.source)!.profile,profile);assert.deepEqual(saved.bindings,component.bindings);assert.deepEqual(saved.manifest,component.manifest);
  assert.match((await f.runFrontend(actor,w.id,{componentId:saved.id,expectedVersion:saved.version,state:{layout:{heading:'Stale'}}})).html,/Board programs/);
  // A record changed after the editor opened is rejected by the server, never overwritten.
  const cur=(await rows('programs.plan_items')).find((r:any)=>r.data.name==='Pilot tox')!;
  const e2=await f.runFrontend(actor,w.id,{componentId:saved.id,expectedVersion:saved.version,event:{kind:'click',action:'edit:items:'+cur.id}});
  await x.save({kind:'update_record',recordId:cur.id,expectedVersion:cur.version,data:{notes:'Concurrent edit'}});
  await assert.rejects(f.runFrontend(actor,w.id,{componentId:saved.id,expectedVersion:saved.version,state:e2.state,event:{kind:'submit',action:'save-record',form:{notes:'Stale edit'}}}),/changed|version|stale/i);
  assert.equal((await rows('programs.plan_items')).find((r:any)=>r.id===cur.id)!.data.notes,'Concurrent edit');
 }finally{await x.pg.close();}
});

/* MODULAR_APPS_AND_SHARED_DATA.md §3 rule 9 for Programs: install alone; install with Runway; delete Runway;
 * remove one tab; reinstall. Plus the archive-first checks (§6) that are on main: archive/restore keeps every field and
 * brings automations back switched off; a removed tab re-added reconnects the same tables; archived apps are listed for the owner. */
test('rule 9 modularity with the real installer: alone, with Runway (reuse, never copy), Runway deleted, tab removed, reinstall',async()=>{
 const x=await programsFixture({demo:false});const {pg,db,f,s,actor}=x;
 try{
  await syncTemplateCatalog(db);
  // 2.0.0 is approved only inside this test database when the seed does not already approve it.
  await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.project-oversight' AND version='2.0.0'");
  const catalog=new AppTemplates(undefined,db);
  const P=await catalog.read({templateId:'life.project-oversight',version:'2.0.0'}),RW=await catalog.read({templateId:'life.cash-runway',version:'2.1.0'});
  const contract=JSON.parse(await readFile('templates/core-contract/v1.json','utf8'));
  const install=(w:string,t:any,name:string,extra:any={})=>installCatalogApp(f,actor,w,{templateId:t.id,version:t.version,digest:t.digest,name,requestKey:randomUUID(),...extra});
  const comp=async(w:string,id:string)=>(await f.readComponent(actor,w,id)).component;
  const open=async(w:string,id:string,state:any={})=>{const c=await comp(w,id);return f.runFrontend(actor,w,{componentId:c.id,expectedVersion:c.version,state,event:{kind:'open'}});};
  const change=async(w:string,op:any)=>{const p=await f.preview(actor,w,op);return f.confirm(actor,w,p.id,p.digest);};
  const save=async(w:string,typeId:string,data:any)=>{const p=await s.preview(actor,w,{kind:'create_record',typeId,data});return (await s.commit(actor,p.id,p.digest)).objects[0].id as string;};
  const count=async(sql:string,args:any[])=>(await pg.query<any>(sql,args)).rows[0].n as number;
  const tables=(w:string)=>count('SELECT count(*)::int n FROM entity_types WHERE workspace_id=$1 AND deleted_at IS NULL',[w]);
  const mapOf=(c:any)=>JSON.parse(JSON.parse(/^const templateConfiguration=(.+);\n/.exec(c.source)![1]).tableMap);
  const v=async(id:string)=>(await pg.query<any>('SELECT version FROM workspace_components WHERE id=$1',[id])).rows[0].version;

  // 1. Install alone: nine new tables (programs, people and seven app tables); Runway's read-only output is never created.
  const w1=await s.createWorkspace(actor,'Alone');
  assert.deepEqual((await readCatalogInstallation(db,actor,w1.id,{templateId:P.id,version:P.version})).roles,[]);
  const alone=await install(w1.id,P,'Programs');
  assert.equal(await tables(w1.id),9);
  const m1=mapOf(await comp(w1.id,alone.appId));assert.ok(m1.people.typeId);assert.equal(m1['runway.month_closes'],undefined);
  assert.deepEqual((await pg.query<any>('SELECT fields FROM entity_types WHERE id=$1',[m1.programs.typeId])).rows[0].fields.map((f:any)=>f.key),contract.roles.programs.fields.map((f:any)=>f.key));
  const a1=(await open(w1.id,alone.appId)).html;assert.match(a1,/No programs yet/);assert.match(a1,/Runway is not connected|No programs yet/);assert.doesNotMatch(a1,/pg-banner bad|could not be shown/);

  // 2. Install with Runway: Programs reuses Runway's programs table (adding only its optional health fields) and connects
  //    Runway's month closes read-only. One programs table in the workspace.
  const w2=await s.createWorkspace(actor,'Suite');
  const runway=await install(w2.id,RW,'Runway');const rmap=mapOf(await comp(w2.id,runway.appId));
  const before=await tables(w2.id);
  const plan=await readCatalogInstallation(db,actor,w2.id,{templateId:P.id,version:P.version});
  assert.deepEqual(plan.roles.map((r:any)=>r.role).sort(),['programs','runway.month_closes']);
  assert.deepEqual(plan.roles.find((r:any)=>r.role==='programs').candidates[0].addFields,['health','health_rationale','health_date']);
  assert.deepEqual(plan.roles.find((r:any)=>r.role==='programs').candidates[0].apps,['Runway']);
  const programs=await install(w2.id,P,'Programs');
  assert.equal(await tables(w2.id)-before,8,'only the seven Programs app tables and people (Runway has none) are created');
  assert.equal(await count("SELECT count(*)::int n FROM entity_types WHERE workspace_id=$1 AND name ILIKE '%programs' AND deleted_at IS NULL",[w2.id]),1,'one shared programs table');
  const pmap=mapOf(await comp(w2.id,programs.appId));assert.equal(pmap.programs.typeId,rmap.programs.typeId);assert.equal(pmap['runway.month_closes'].typeId,rmap['runway.month_closes'].typeId);
  assert.deepEqual(pmap['runway.month_closes'].writableFields,[]);
  assert.ok((await comp(w2.id,programs.appId)).manifest.fields.filter((m:any)=>m.typeId===rmap['runway.month_closes'].typeId).every((m:any)=>m.mode==='read'));
  // Runway still opens after the additive schema change.
  {const rh=(await open(w2.id,runway.appId)).html;assert.match(rh,/Set up your first runway/);assert.doesNotMatch(rh,/could not be calculated|not bound/);}
  // Data: one program and a key milestone, entered in Programs; one fictional Runway close (as Runway freezes it).
  const prog=await save(w2.id,pmap.programs.typeId,{name:'TX-1',stage:'phase_1',status:'active',archived:false});
  await save(w2.id,pmap['programs.plan_items'].typeId,{name:'IND filing',program_id:prog,item_type:'milestone',function:'regulatory',end_date:'2027-06-20',status:'planned',is_key:true,archived:false});
  const months=Array.from({length:40},(_,i)=>{const d=new Date(Date.UTC(2026,10+i,1));return {m:d.toISOString().slice(0,7),l:0,p:0,c:1000000-30000*(i+1),k:1000000-30000*(i+1)};});
  await save(w2.id,rmap['runway.month_closes'].typeId,{month:'2026-10-01',closing_balance:1000000,currency:'EUR',closed:true,metrics:JSON.stringify({v:2,asOf:'2026-10',currency:'EUR',months})});
  // By hand: Jun 2027 is month 8 → 1,000,000 − 8 × 30,000 = 760,000; first negative month is month 34 (Aug 2029) → cushion = Jul 2027 … Jul 2029 = 25 months (Runway: cash-out index − 1 − milestone index).
  const suite=(await open(w2.id,programs.appId,{section:'timeline'})).html;
  assert.match(suite,/IND filing<\/strong>.*EUR 760k · 25 months cushion/);assert.match(suite,/Runway snapshot Oct 2026/);
  const records=await count('SELECT count(*)::int n FROM records WHERE workspace_id=$1',[w2.id]);

  // 3. Delete the partner app: Runway is archived; its snapshots stay readable and Programs keeps the same labelled markers.
  await change(w2.id,{kind:'archive_component',componentId:runway.appId,expectedVersion:await v(runway.appId),archived:true});
  assert.equal(await count('SELECT count(*)::int n FROM records WHERE workspace_id=$1',[w2.id]),records);
  const afterRunway=(await open(w2.id,programs.appId,{section:'timeline'})).html;assert.match(afterRunway,/EUR 760k · 25 months cushion/);assert.match(afterRunway,/TX-1/);assert.doesNotMatch(afterRunway,/pg-banner bad/);

  // 4. Remove one tab: unbind Runway's closes from Programs. Markers hide with a note; nothing is deleted; re-adding reconnects the same table.
  const c2=await comp(w2.id,programs.appId),closesType=pmap['runway.month_closes'].typeId;
  const withMap=(src:string,m:any)=>src.replace(/^const templateConfiguration=(.+);\n/,(_:string,json:string)=>'const templateConfiguration='+JSON.stringify({...JSON.parse(json),tableMap:JSON.stringify(m)})+';\n');
  const revise=async(m:any,b:any[],man:any[])=>{const c=await comp(w2.id,programs.appId);return change(w2.id,{kind:'save_component',componentId:c.id,expectedVersion:c.version,projectId:c.project_id,content:{name:c.name,format:'frontend-js',source:withMap(c.source,m),sourceAccess:c.source_access??'workspace',bindings:b,manifest:{...c.manifest,fields:man}}});};
  const unbound={...pmap};delete unbound['runway.month_closes'];
  await revise(unbound,c2.bindings.filter((b:any)=>b.typeId!==closesType),c2.manifest.fields.filter((m:any)=>m.typeId!==closesType));
  const tabless=(await open(w2.id,programs.appId,{section:'timeline'})).html;assert.match(tabless,/Runway is not connected to this app, so cash markers are hidden/);assert.doesNotMatch(tabless,/cushion<\/span>|pg-banner bad/);assert.match(tabless,/IND filing/);
  assert.equal(await count('SELECT count(*)::int n FROM records WHERE workspace_id=$1',[w2.id]),records);
  assert.equal((await pg.query<any>('SELECT archived_at FROM entity_types WHERE id=$1',[closesType])).rows[0].archived_at,null,'the archived Runway app still protects its table');
  await revise(pmap,c2.bindings,c2.manifest.fields);
  assert.match((await open(w2.id,programs.appId,{section:'timeline'})).html,/EUR 760k · 25 months cushion/);
  assert.equal(mapOf(await comp(w2.id,programs.appId))['runway.month_closes'].typeId,closesType);

  // 5. Archive-first checks and reinstall. An app automation is attached so restore can be checked.
  const action=randomUUID();await pg.query("INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,approved_by) VALUES($1,$2,$3,$4,'{\"name\":\"Slip notice\"}',$3)",[action,w2.id,actor.userId,programs.appId]);
  const fieldsBefore=(await pg.query<any>('SELECT id,fields,archived_fields FROM entity_types WHERE workspace_id=$1 ORDER BY id',[w2.id])).rows;
  await change(w2.id,{kind:'archive_component',componentId:programs.appId,expectedVersion:await v(programs.appId),archived:true});
  assert.deepEqual((await pg.query<any>('SELECT id,fields,archived_fields FROM entity_types WHERE workspace_id=$1 ORDER BY id',[w2.id])).rows,fieldsBefore,'archiving keeps every field');
  const listed=await archivedItems(f,actor,w2.id,{kind:'apps'});assert.ok(listed.items.some((i:any)=>i.id===programs.appId),'listed for the owner under Show archived');
  await assert.rejects(()=>install(w2.id,P,'Programs'),/Restore your archived Programs app/);
  await change(w2.id,{kind:'archive_component',componentId:programs.appId,expectedVersion:await v(programs.appId),archived:false});
  assert.deepEqual((await pg.query<any>('SELECT id,fields,archived_fields FROM entity_types WHERE workspace_id=$1 ORDER BY id',[w2.id])).rows,fieldsBefore,'restoring keeps every field');
  const j=(await pg.query<any>('SELECT paused,deleted_at FROM app_actions WHERE id=$1',[action])).rows[0];assert.deepEqual([j.paused,j.deleted_at],[true,null],'automation back switched off');
  assert.match((await open(w2.id,programs.appId,{section:'timeline'})).html,/EUR 760k · 25 months cushion/);
  // "Install a new copy" without a choice starts fresh; an explicit separate-data choice never touches the shared table.
  const freshCopy=await install(w2.id,P,'Programs copy',{createNew:true});assert.notEqual(mapOf(await comp(w2.id,freshCopy.appId)).programs.typeId,pmap.programs.typeId);
  const w3=await s.createWorkspace(actor,'Separate');await install(w3.id,RW,'Runway');const t3=await tables(w3.id);
  const separate=await install(w3.id,P,'Programs',{sharedTables:{programs:'new','runway.month_closes':'new'}});assert.equal(await tables(w3.id)-t3,9);assert.equal(mapOf(await comp(w3.id,separate.appId))['runway.month_closes'],undefined);
  // Two compatible programs tables: the installer asks instead of guessing.
  await assert.rejects(()=>install(w2.id,P,'Programs three'),/Choose which existing Programs table/);
 }finally{await x.pg.close();}
});
