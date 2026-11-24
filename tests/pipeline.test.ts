import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {execute} from '../src/foundation/runtime.js';
import {appTemplates,AppTemplates} from '../src/workspace/app-templates.js';
import {effectiveSource,isV2Source} from '../src/workspace/browser-runtime.js';
import {syncTemplateCatalog,installCatalogApp} from '../src/workspace/template-catalog.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import type {Database,Connection} from '../src/db/database.js';

/* Pipeline 1.0.0 (life.pipeline): the platform version of the standalone prototype in prototypes/pipeline, run in the
 * production QuickJS runtime with stub tools exactly as the platform runs a v2 catalog app (configuration lines, the kit,
 * the app). Fixtures are the fictional demo records (the prototype's NorthTherapeutics sample). */
const entry=await appTemplates.read({templateId:'life.pipeline',version:'1.0.0'});
const schema=JSON.parse(await readFile('templates/source/pipeline/schema.example.json','utf8'));
const demo=JSON.parse(await readFile('templates/source/pipeline/demo_data.json','utf8')).records;
const roles=Object.keys(schema);
const fullMap=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:Object.keys(schema[r].logicalFields)}]));
const fullBindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
type Row={id:string,version:number,role:string,data:any};
const fresh=():Row[]=>structuredClone(demo);
const SCREENS=['overview','programs','timeline','deliverables','risks','changes','digest','settings'];
type Opts={appRole?:'owner'|'editor'|'viewer';writable?:boolean;saved?:boolean;context?:any;viewport?:any;pending?:(t:string)=>boolean;map?:any};
async function render(rows:Row[],state:any={},event:any={kind:'open',action:''},opts:Opts={}){
 const saves:any[]=[],calls:{name:string,input:any}[]=[];
 const config={...entry.defaults,tableMap:JSON.stringify(opts.map??fullMap),asOfOverride:'2027-02-15'};
 const code=effectiveSource(`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(fullBindings)};\n${entry.source}`);
 const page=(v:any)=>{if(opts.pending?.(v.typeId))return {pending:true,rows:[],total:null};const all=rows.filter(r=>r.role===v.typeId).map(r=>({id:r.id,version:r.version,data:r.data}));return {rows:all.slice(v.offset??0,(v.offset??0)+(v.limit??25)),total:all.length};};
 const output:any=await execute(code,{saved:opts.saved??true,writable:opts.writable??true,appRole:opts.appRole??'owner',context:opts.context??null,...(opts.viewport?{viewport:opts.viewport}:{}),state,event},async(name,v:any)=>{
  calls.push({name,input:v});
  if(name==='records.readMany')return {results:v.reads.map(page)};
  if(name==='records.read')return page(v);
  if(name==='records.save'){saves.push(...v.changes);return {status:'saving',count:v.changes.length};}
  if(name==='undo.list')return {actions:[]};
  if(name==='documents.list')return {documents:[{documentId:'d1',versionId:'v-memo',filename:'Batch review memo.pdf'}]};
  throw Error('Capability unavailable: '+name);
 });
 return {output,saves,calls,html:output.html as string,state:output.state,notice:output.notice};
}
function apply(rows:Row[],changes:any[]){for(const c of changes){if(c.kind==='create_record')rows.push({id:randomUUID(),version:0,role:c.typeId,data:c.data});
 else if(c.kind==='archive_record'){const i=rows.findIndex(x=>x.id===c.recordId);assert.ok(i>=0);rows.splice(i,1);}
 else{const r=rows.find(x=>x.id===c.recordId)!;assert.equal(r.version,c.expectedVersion,'expected version of '+r.data.name);r.data={...r.data,...c.data};r.version++;}}}
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/\s+/g,' ');
const byName=(rows:Row[],name:string)=>rows.find(r=>r.data.name===name)!;
/** Opens a record's side panel, changes form values, then submits; returns the save run. */
async function edit(rows:Row[],id:string,form:Record<string,string>,extra:string[]=[]){
 let s=(await render(rows,{screen:'programs'},{kind:'click',action:'rec:'+id})).state;
 for(const a of extra)s=(await render(rows,s,{kind:'click',action:a,form:{}})).state;
 s=(await render(rows,s,{kind:'change',action:'draft',form:{_f:'record',...form}})).state;
 return render(rows,s,{kind:'submit',action:'form:save',form:{_f:'record',...form}});
}

test('package: a v2 frontend-js app on its own installer schema, registered as a draft catalog version with gallery media',async()=>{
 assert.equal(entry.version,'1.0.0');assert.equal(entry.engine,'frontend-js');assert.equal(entry.name,'Pipeline');
 assert.equal(entry.source!.split('\n')[0],"'use trialagents v2';");assert.ok(isV2Source(`const templateConfiguration={};\nconst templateBindings=[];\n${entry.source}`));
 const installers=JSON.parse(await readFile('templates/catalog-installers.json','utf8'));assert.equal(installers['life.pipeline@1.0.0'],'templates/source/pipeline/schema.example.json');
 assert.deepEqual(roles,['organizations','people','pipeline.items','pipeline.events','pipeline.digests','pipeline.settings']);
 for(const r of roles.filter(r=>r.startsWith('pipeline.')))assert.equal(schema[r].contract,'pipeline.v1',r);
 for(const r of ['organizations','people'])assert.equal(schema[r].contract,'core.v1',r);
 for(const f of Object.values(schema).flatMap((r:any)=>r.fields) as any[])assert.equal(f.multiple,false,f.key);
 // Platform version, not the standalone one: no browser storage, sign-in, own header, per-person email settings or prepared reports.
 const src=entry.source!;
 assert.doesNotMatch(src,/localStorage|sessionStorage|FileReader|password|sign.?in|records\.propose|<h1|<header|showModal|<dialog|mailTypes|Owner email notifications|Design review|prepared example/i);
 for(const k of ['quickStart','dataContract','interactionContract','lifecycle','limitations','examples','tasks'])assert.ok((entry.documentation as any)[k],k);
 const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8'));assert.equal(seed['life.pipeline'],undefined,'a draft until the owner approves it');
 const gallery=JSON.parse(await readFile('resources/template-gallery/manifest.json','utf8'));assert.ok(gallery['life.pipeline@1.0.0']);
});

test('every screen renders at every width with no header, banner or footer of its own; opening never writes',async()=>{
 const rows=fresh();
 for(const width of ['wide','panel','phone'])for(const screen of SCREENS){
  const r=await render(rows,{screen},{kind:'open',action:''},{viewport:{width}});
  assert.match(r.html,/^<div class="k-app pl">/,screen);assert.doesNotMatch(r.html,/<header|<h1|<footer|role="alert"/,screen);
  assert.match(r.html,new RegExp('data-action="nav:'+screen+'" aria-current="page"'),screen);
  assert.equal(r.saves.length,0,'opening never writes');assert.deepEqual(r.output.context,{screen,program:''});
 }
 const o=text((await render(rows)).html);
 assert.match(o,/Active programs 3 Pending decisions 2 Programs at risk 1/);
 assert.match(o,/Lung cancer development NT-101 Lung cancer Phase 1 Clinical supply released 26 Feb 11 days left €114,000 \/ €380,000/);
 assert.match(o,/Awaiting owner approval Plan item Owner Complete batch review Maya Chen Review completion/);
 // The screen comes back on the next visit; Settings is for owners only.
 assert.match((await render(rows,{},{kind:'open'},{context:{screen:'risks'}})).html,/data-action="nav:risks" aria-current="page"/);
 const ed=await render(rows,{screen:'overview'},{kind:'open'},{appRole:'editor'});assert.doesNotMatch(ed.html,/nav:settings/);
 assert.doesNotMatch((await render(rows,{screen:'settings'},{kind:'open'},{appRole:'editor'})).html,/name="currency"/);
});

test('forecasts follow changes field by field, and an open risk flags downstream work and ancestors',async()=>{
 const rows=fresh();const prog=text((await render(rows,{screen:'programs'})).html);
 assert.match(prog,/Clinical supply released ⚑ Milestone 20 Feb €82,000/,'the change revises the milestone date and budget');
 assert.match(prog,/Finalize CRO scope ▬ Activity 16 Feb €12,000 Alex Reed Planned 1 risk/);
 assert.match(prog,/Preclinical study ready ⚑ Milestone 22 Feb €92,000 Alex Reed Planned 1 risk 1 change/,'the CRO risk reaches the milestone that depends on the activity');
 // Closing the risk removes its contribution.
 const risk=byName(rows,'CRO signature pending');risk.data.risk_status='Closed';
 assert.match(text((await render(rows)).html),/Programs at risk 0/);
});

test('completion: an owner approval is required, recorded with the owner and date, and saved with the status',async()=>{
 const rows=fresh(),a1=byName(rows,'Complete batch review');
 const refused=await edit(rows,a1.id,{status:'Completed'});assert.equal(refused.saves.length,0);assert.match(refused.html,/Owner approval is required to complete this item\./);
 let s=(await render(rows,{screen:'overview'},{kind:'click',action:'rec:'+a1.id})).state;
 s=(await render(rows,s,{kind:'click',action:'approve',form:{_f:'record'}})).state;assert.equal(s.panel.confirm,'approve');
 s=(await render(rows,s,{kind:'click',action:'approve:confirm',form:{_f:'record'}})).state;
 const saved=await render(rows,s,{kind:'submit',action:'form:save',form:{_f:'record'}});
 assert.equal(saved.saves.length,1);assert.deepEqual([saved.saves[0].data.status,saved.saves[0].data.approved_on,saved.saves[0].data.approved_owner],['Completed','2027-02-15','Maya Chen']);
 assert.equal(saved.saves[0].expectedVersion,1);assert.equal(saved.notice.kind,'success');assert.equal(saved.state.panel,null);
 apply(rows,saved.saves);assert.doesNotMatch((await render(rows)).html,/Awaiting owner approval/);
});

test('dependencies gate status: a required child blocks completion and Pending applies only when a decision remains',async()=>{
 const rows=fresh(),m1=byName(rows,'Clinical supply released');
 const pending=await edit(rows,byName(rows,'Lead nominated').id,{status:'Pending'});assert.match(pending.html,/Pending applies when only a decision remains\./);
 // m1 needs its decision (required to complete); approving it is refused while the decision is open.
 const r=await render(rows,(await render(rows,{},{kind:'click',action:'rec:'+m1.id})).state,{kind:'click',action:'approve',form:{_f:'record'}});
 assert.doesNotMatch(r.html,/data-action="approve"/,'no approve control while a mandatory dependency is open');
 // A start rule on an open child refuses In progress for the parent.
 const m3=byName(rows,'Lead nominated'),a3=byName(rows,'Review assay readout');a3.data.parent_rule='start';
 const blocked=await edit(rows,m3.id,{status:'In progress'});assert.equal(blocked.saves.length,0);assert.match(blocked.html,/Resolve the mandatory dependency before changing this status\./);
});

test('a deliverable logged on an item moves it In progress, in the same save as the event',async()=>{
 const rows=fresh(),a3=byName(rows,'Review assay readout');
 let s=(await render(rows,{screen:'deliverables'},{kind:'click',action:'new:Deliverable'})).state;
 s=(await render(rows,s,{kind:'change',action:'pick:item',value:a3.id,form:{_f:'record'}})).state;
 const form={_f:'record',name:'Assay report',end:'2027-02-14',owner:'Sam Bell',signoff:'Sam Bell',format:'Document'};
 s=(await render(rows,s,{kind:'change',action:'draft',form})).state;
 const saved=await render(rows,s,{kind:'submit',action:'form:save',form});
 assert.equal(saved.saves.length,2);assert.equal(saved.saves[0].kind,'create_record');assert.equal(saved.saves[0].data.item_ids,a3.id);assert.equal(saved.saves[0].data.event_type,'Deliverable');
 assert.deepEqual(saved.saves[1],{kind:'update_record',recordId:a3.id,expectedVersion:1,data:{status:'In progress'}});
});

test('a new plan item saves with its parent and reopens after the save; child items need the saved ID',async()=>{
 const rows=fresh(),p3=byName(rows,'Discovery lead selection');
 let s=(await render(rows,{screen:'programs'},{kind:'click',action:'new:Milestone'})).state;
 assert.match((await render(rows,s)).html,/Child items can be added once this item is saved\./);
 const form={_f:'record',name:'Candidate selected',end:'2027-03-01',owner:'Sam Bell',status:'Planned',h_parents_id_0:p3.id,h_parents_rule_0:'finish'};
 s=(await render(rows,s,{kind:'change',action:'draft',form})).state;
 const saved=await render(rows,s,{kind:'submit',action:'form:save',form});
 assert.equal(saved.saves.length,1);const d=saved.saves[0].data;assert.deepEqual([d.item_type,d.parent_id,d.parent_rule,d.end_date,d.start_date],['Milestone',p3.id,'finish','2027-03-01','2027-03-01']);
 apply(rows,saved.saves);const again=await render(rows,saved.state,{kind:'refresh',action:''});
 assert.equal(again.state.panel.draft.name,'Candidate selected');assert.equal(again.state.reopen,null);assert.match(again.html,/Edit milestone/);
});

test('a parent cannot be deleted while records name it; deleting a leaf archives it',async()=>{
 const rows=fresh(),p1=byName(rows,'Lung cancer development'),a3=byName(rows,'Review assay readout');
 let s=(await render(rows,{},{kind:'click',action:'rec:'+p1.id})).state;s=(await render(rows,s,{kind:'click',action:'delete',form:{_f:'record'}})).state;
 const blocked=await render(rows,s,{kind:'click',action:'delete:confirm',form:{_f:'record'}});assert.equal(blocked.saves.length,0);assert.match(blocked.html,/Reassign or remove the child items and events/);
 s=(await render(rows,{},{kind:'click',action:'rec:'+a3.id})).state;s=(await render(rows,s,{kind:'click',action:'delete',form:{_f:'record'}})).state;
 const done=await render(rows,s,{kind:'click',action:'delete:confirm',form:{_f:'record'}});assert.deepEqual(done.saves,[{kind:'archive_record',recordId:a3.id,expectedVersion:1}]);
});

test('settings hold only the app settings and save for owners; files come from the platform upload',async()=>{
 const rows=fresh();const page=await render(rows,{screen:'settings'});
 assert.deepEqual([...page.html.matchAll(/name="([a-z_]+)"/g)].map(m=>m[1]),['currency','date_format']);
 const saved=await render(rows,{screen:'settings'},{kind:'submit',action:'settings:save',form:{currency:'USD',date_format:'YYYY-MM-DD'}});
 assert.deepEqual(saved.saves[0].data,{currency:'USD',date_format:'YYYY-MM-DD'});
 const viewer=await render(rows,{screen:'settings'},{kind:'submit',action:'settings:save',form:{currency:'USD'}},{appRole:'editor'});assert.equal(viewer.saves.length,0);
 apply(rows,saved.saves);assert.match(text((await render(rows)).html),/US\$114,000 \/ US\$380,000 .*2027-02-26/);
 const a3=byName(rows,'Review assay readout');let s=(await render(rows,{},{kind:'click',action:'rec:'+a3.id})).state;
 assert.match((await render(rows,s)).html,/data-trialy-document="upload draft"/);
 s=(await render(rows,s,{kind:'change',action:'document:uploaded:draft',value:'v-memo'})).state;assert.deepEqual(s.panel.draft.files,[{v:'v-memo',n:'Batch review memo.pdf'}]);
});

test('the digest is built from the records and saved to the archive; the app commands read the same figures',async()=>{
 const rows=fresh();const d=text((await render(rows,{screen:'digest'})).html);
 assert.match(d,/Week of 9 Feb .*Change · CRO scope revised \(15 Feb\)/);assert.match(d,/Decision due 17 Feb · Release batch for clinical use, Maya Chen/);
 const saved=await render(rows,{screen:'digest'},{kind:'click',action:'digest:save'});
 assert.equal(saved.saves[0].typeId,'pipeline.digests');assert.deepEqual([saved.saves[0].data.kind,saved.saves[0].data.period_start,saved.saves[0].data.period_end],['Weekly','2027-02-09','2027-02-15']);
 const cmd=async(id:string,input:any={})=>(await render(rows,{},{kind:'command',action:id,value:JSON.stringify(input)})).state.command;
 const ov=await cmd('overview.read');assert.equal(ov.ok,true);assert.deepEqual(ov.result.awaiting_owner_approval.map((x:any)=>x.name),['Complete batch review']);
 const plan=await cmd('plan.read');const m1=plan.result.items.find((x:any)=>x.name==='Clinical supply released');assert.deepEqual([m1.forecast_end,m1.forecast_budget,m1.baseline_end],['2027-02-20',82000,'2027-02-18']);
 assert.equal((await cmd('events.read',{event_type:'Risk'})).result.events.length,1);
 assert.equal((await cmd('digest.read',{kind:'Monthly'})).result.title,'February portfolio digest');
});

test('loading, missing tables and viewers are honest',async()=>{
 const rows=fresh();
 assert.match((await render(rows,{},{kind:'open'},{pending:t=>t==='pipeline.items'})).html,/Loading…/);
 const {['pipeline.events']:_,...noEvents}=fullMap as any;assert.match(text((await render(rows,{},{kind:'open'},{map:noEvents})).html),/The event table is not connected to this app\./);
 const v=await render(rows,{},{kind:'open'},{appRole:'viewer'});assert.doesNotMatch(v.html,/data-action="add"/);
});

test('installs from the catalog into new tables with the platform installer',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  await syncTemplateCatalog(db);
  assert.equal((await db.query("SELECT status FROM app_template_catalog WHERE template_id='life.pipeline' AND version='1.0.0'")).rows[0]?.status,'draft','imported as a draft');
  await db.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.pipeline'");
  const owner={userId:randomUUID(),origin:'human' as const},human={...owner,actionConfirmed:true} as any;
  await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[owner.userId,owner.userId,'pipeline@example.invalid','Pipeline']);
  const w=await new Service(db).createWorkspace(owner,'Pipeline'),f=new WorkspaceFoundation(db),t=await new AppTemplates(undefined,db).read({templateId:'life.pipeline',version:'1.0.0'});
  const app=await installCatalogApp(f,human,w.id,{templateId:t.id,version:t.version,digest:t.digest,name:t.name,requestKey:randomUUID(),createNew:true});
  const c=(await f.readComponent(owner,w.id,app.appId)).component;
  assert.deepEqual(c.manifest.roles.map((r:any)=>r.role).sort(),['organizations','people','pipeline.digests','pipeline.events','pipeline.items','pipeline.settings']);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM records')).rows[0].n,0,'no sample records are installed');
 }finally{await pg.close();}
});

test('design check under the current rules on every screen and the record side panels',{skip:process.env.APP_DESIGN_CHECKS==='off'?'APP_DESIGN_CHECKS=off':false},async()=>{
 const {inspectAppDesign}=await import('../src/workspace/design-quality.js'),{runtimeCssFor}=await import('../src/workspace/browser-runtime.js');
 const rows=fresh(),frames:any[]=[],add=(name:string,o:any)=>frames.push({name,html:o.html,css:runtimeCssFor(entry.source!,o.html)+o.output.css});
 for(const s of SCREENS)add(s,await render(rows,{screen:s}));
 add('add record',await render(rows,{},{kind:'click',action:'add'}));
 add('plan item',await render(rows,{},{kind:'click',action:'rec:'+byName(rows,'Clinical supply released').id}));
 add('change',await render(rows,{screen:'changes'},{kind:'click',action:'rec:'+byName(rows,'Release date and budget revised').id}));
 for(const part of [frames.slice(0,6),frames.slice(6)]){const r=await inspectAppDesign(part,'current');assert.deepEqual(r.issues,[]);assert.equal(r.status,'passed');}
});
