import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {Service} from '../src/domain/service.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {syncTemplateCatalog} from '../src/workspace/template-catalog.js';
import {dataAccessStep,prepareDataAccess,confirmDataAccess,declinedConnections,preparedChoices} from '../src/workspace/data-access.js';
import {contractRegistry,readerAccepts,isSuperset} from '../src/workspace/role-contracts.js';
import {readTemplateGuidance} from '../src/workspace/app-templates.js';
import type {Database,Connection} from '../src/db/database.js';
import type {Actor} from '../src/shared/schema.js';

/* Modular apps §7: the data access step and role-based connections, with the real installer and reviewed saves. */
async function setup(){
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const actor:Actor={userId:randomUUID(),origin:'human'};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'owner@example.invalid','Owner']);
 const f=new WorkspaceFoundation(db),s=new Service(db);
 await syncTemplateCatalog(db);
 await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.project-oversight' AND version='2.0.0'");
 const catalog=new AppTemplates(undefined,db);
 const P=await catalog.read({templateId:'life.project-oversight',version:'2.0.0'}),R=await catalog.read({templateId:'life.cash-runway',version:'2.1.0'});
 const install=async(w:string,t:any,name:string,choose:(step:any)=>any={}as any)=>{
  const target={install:{templateId:t.id,version:t.version,digest:t.digest,name,requestKey:randomUUID()}};
  const step=await dataAccessStep(f,actor,w,target);assert.equal(step.needed,true,'every app add shows the step');
  const choices=typeof choose==='function'?choose(step):choose;
  return {step,receipt:await confirmDataAccess(f,actor,w,{...target,...choices,stepDigest:step.digest})};
 };
 const comp=async(w:string,id:string)=>(await f.readComponent(actor,w,id)).component;
 const mapOf=(c:any)=>JSON.parse(JSON.parse(/^const templateConfiguration=(.+);\n/.exec(c.source)![1]).tableMap);
 const change=async(w:string,op:any)=>{const p=await f.preview(actor,w,op);return f.confirm(actor,w,p.id,p.digest);};
 const save=async(w:string,typeId:string,data:any)=>{const p=await s.preview(actor,w,{kind:'create_record',typeId,data});return (await s.commit(actor,p.id,p.digest)).objects[0].id as string;};
 const v=async(id:string)=>(await pg.query<any>('SELECT version FROM workspace_components WHERE id=$1',[id])).rows[0].version;
 const open=async(w:string,id:string,state:any={})=>{const c=await comp(w,id);return f.runFrontend(actor,w,{componentId:c.id,expectedVersion:c.version,state,event:{kind:'open'}});};
 return {pg,db,f,s,actor,P,R,install,comp,mapOf,change,save,v,open};
}
const closes=async(x:any,w:string,typeId:string)=>{
 const months=Array.from({length:40},(_,i)=>{const d=new Date(Date.UTC(2026,10+i,1));return {m:d.toISOString().slice(0,7),l:0,p:0,c:1000000-30000*(i+1),k:1000000-30000*(i+1)};});
 await x.save(w,typeId,{month:'2026-10-01',closing_balance:1000000,currency:'EUR',closed:true,metrics:JSON.stringify({v:2,asOf:'2026-10',currency:'EUR',months})});
};
async function customCloses(x:any,w:string,name:string,extra:any={}){
 const registry=await contractRegistry(),fields=registry.roles['runway.month_closes'].versions['runway.v2'].fields.map(f=>({...f,ai:true}));
 const typeId=(await (async()=>{const p=await x.s.preview(x.actor,w,{kind:'create_type',name:name+' table',fields});return (await x.s.commit(x.actor,p.id,p.digest)).objects[0].id;})()) as string;
 const manifest={version:1,scope:'workspace',fields:fields.map((f:any)=>({id:'mc_'+f.key,typeId,field:f.key,schemaVersion:0,kind:f.kind,mode:'write'})),roles:[{role:'runway.month_closes',contract:'runway.v2',typeId,...extra}]};
 const content={name,format:'frontend-js',source:"return {html:'<p>Closes</p>',state:input.state};",sourceAccess:'workspace',manifest,bindings:[{typeId,fields:fields.map((f:any)=>f.key)}]};
 return {typeId,content,manifest};
}

test('both install orders connect by role: Runway then Programs, and Programs then Runway (late connection through the step)',async()=>{
 const x=await setup();const {f,s,actor,P,R}=x;
 try{
  // Order 1: Runway first. Programs' step lists Runway's programs table and month closes; Connect is the default.
  const w1=await s.createWorkspace(actor,'Runway first');
  const r1=await x.install(w1.id,R,'Runway');assert.deepEqual(r1.step.existing,[]);assert.deepEqual(r1.step.consumers,[]);
  const rmap=x.mapOf(await x.comp(w1.id,r1.receipt.appId));
  const p1=await x.install(w1.id,P,'Programs');
  assert.deepEqual(p1.step.existing.map((r:any)=>[r.role,r.mode,r.choice===r.candidates[0].typeId]).sort(),[['programs','write',true],['runway.month_closes','read',true]]);
  assert.match(p1.receipt.dataAccess.summary,/Connects 2 tables/);
  const pmap=x.mapOf(await x.comp(w1.id,p1.receipt.appId));
  assert.equal(pmap.programs.typeId,rmap.programs.typeId);assert.equal(pmap['runway.month_closes'].typeId,rmap['runway.month_closes'].typeId);
  assert.equal((await x.pg.query<any>("SELECT count(*)::int n FROM audit_events WHERE action='workspace.data_access_step'")).rows[0].n,2,'every choice is logged');

  // Order 2: Programs alone first. Its optional Runway role stays declared and unconnected.
  const w2=await s.createWorkspace(actor,'Programs first');
  const p2=await x.install(w2.id,P,'Programs');
  const programs=await x.comp(w2.id,p2.receipt.appId);
  assert.deepEqual(programs.manifest.roles.find((r:any)=>r.role==='runway.month_closes'),{role:'runway.month_closes',contract:'runway.v2',optional:true,readOnly:true,fields:['month','currency','closed','metrics']});
  assert.match((await x.open(w2.id,programs.id,{section:'timeline'})).html,/Runway is not connected|No programs yet/);
  // Runway's step: reuse Programs' programs table (section 1) and give Programs read access to month closes (section 2).
  let runwayStep:any;
  const r2=await x.install(w2.id,R,'Runway',(step:any)=>{runwayStep=step;return {};});
  assert.deepEqual(runwayStep.existing.map((r:any)=>[r.role,r.candidates[0].apps]),[['programs',['Programs']]]);
  assert.deepEqual(runwayStep.consumers.map((c:any)=>[c.appName,c.role,c.mode,c.connect]),[['Programs','runway.month_closes','read',true]]);
  assert.match(r2.receipt.dataAccess.summary,/gives Programs read access to 1/);
  const rmap2=x.mapOf(await x.comp(w2.id,r2.receipt.appId)),after=await x.comp(w2.id,programs.id),pmap2=x.mapOf(after);
  assert.equal(pmap2['runway.month_closes'].typeId,rmap2['runway.month_closes'].typeId);assert.deepEqual(pmap2['runway.month_closes'].writableFields,[]);
  assert.equal(rmap2.programs.typeId,pmap2.programs.typeId,'one programs table');
  assert.ok(after.manifest.fields.filter((m:any)=>m.typeId===rmap2['runway.month_closes'].typeId).every((m:any)=>m.mode==='read'));
  assert.equal(after.manifest.roles.find((r:any)=>r.role==='runway.month_closes').typeId,rmap2['runway.month_closes'].typeId);
  // Programs now shows Runway's cash at its key milestones.
  const prog=await x.save(w2.id,pmap2.programs.typeId,{name:'TX-1',stage:'phase_1',status:'active',archived:false});
  await x.save(w2.id,pmap2['programs.plan_items'].typeId,{name:'IND filing',program_id:prog,item_type:'milestone',function:'regulatory',end_date:'2027-06-20',status:'planned',is_key:true,archived:false});
  await closes(x,w2.id,rmap2['runway.month_closes'].typeId);
  assert.match((await x.open(w2.id,programs.id,{section:'timeline'})).html,/EUR 760k · 25 months cushion/);

  // A later save with nothing new skips the step; a stale review is refused.
  const c=await x.comp(w2.id,r2.receipt.appId);
  const rename=await f.preview(actor,w2.id,{kind:'save_component',componentId:c.id,expectedVersion:c.version,projectId:c.project_id,content:{name:'Runway (board)',format:c.format,source:c.source,sourceAccess:c.source_access,resourceKind:c.resource_kind,manifest:c.manifest,bindings:c.bindings,assets:c.assets,execution:c.execution}});
  const quiet=await dataAccessStep(f,actor,w2.id,{previewId:rename.id,digest:rename.digest});assert.equal(quiet.needed,false,JSON.stringify([quiet.existing,quiet.consumers]));
  await assert.rejects(confirmDataAccess(f,actor,w2.id,{previewId:rename.id,digest:rename.digest,stepDigest:'0'.repeat(64)}),/Review the data access step again/);
 }finally{await x.pg.close();}
});

test('assistants prepare the step but never confirm it',async()=>{
 const x=await setup();const {f,s,actor,P,R}=x;
 try{
  const w=await s.createWorkspace(actor,'Assistant');await x.install(w.id,P,'Programs');
  const ai:Actor={...actor,origin:'ai'};
  const target={install:{templateId:R.id,version:R.version,digest:R.digest,name:'Runway',requestKey:randomUUID()}};
  const prepared=await prepareDataAccess(f,ai,w.id,{...target,consumers:[]});
  assert.match(prepared.confirmation,/cannot confirm/);assert.equal(prepared.access.canChange,false,'access is shown, not changed, inside an assistant');
  await assert.rejects(confirmDataAccess(f,ai,w.id,{...target,stepDigest:prepared.digest}),/cannot approve its own changes/);
  await assert.rejects(prepareDataAccess(f,ai,w.id,{...target,access:[{subject:'chatgpt',level:'none'}]}),/signed-in owner session/);
  // The user sees the prepared proposal in the review view and saves it there (the app-only Save action).
  const step=await dataAccessStep(f,ai,w.id,target);assert.deepEqual(await preparedChoices(f.db,ai,w.id,step),{connections:{},consumers:[],access:[]});
  const saved=await confirmDataAccess(f,{...ai,actionConfirmed:true},w.id,{...target,stepDigest:step.digest});assert.ok(saved.appId);
 }finally{await x.pg.close();}
});

test('a custom app provides a role: contract labels are validated and the installer connects to it',async()=>{
 const x=await setup();const {f,s,actor,P}=x;
 try{
  const w=await s.createWorkspace(actor,'Custom provider');
  const custom=await customCloses(x,w.id,'Board closes');
  const saved=await x.change(w.id,{kind:'save_component',projectId:null,content:custom.content});
  assert.equal((await x.pg.query<any>('SELECT app_id FROM role_writers WHERE type_id=$1',[custom.typeId])).rows[0].app_id,saved.id,'the first writer is registered');
  // Programs' step finds the custom app's table under runway.month_closes and binds it read-only.
  const p=await x.install(w.id,P,'Programs');
  const row=p.step.existing.find((r:any)=>r.role==='runway.month_closes');assert.deepEqual(row.candidates.map((c:any)=>[c.name,c.apps]),[['Board closes table',['Board closes']]]);
  assert.equal(x.mapOf(await x.comp(w.id,p.receipt.appId))['runway.month_closes'].typeId,custom.typeId);
  // Compatibility checks, exactly as template reuse: kinds, unknown core roles, unknown versions, read-only roles.
  const bad=(roles:any[],manifest:any=custom.manifest)=>f.preview(actor,w.id,{kind:'save_component',projectId:null,content:{...custom.content,name:'Bad',manifest:{...manifest,roles}}});
  await assert.rejects(bad([{role:'sites',contract:'core.v1',typeId:custom.typeId}]),/not a core role/);
  await assert.rejects(bad([{role:'runway.month_closes',contract:'runway.v9',typeId:custom.typeId}]),/no contract runway.v9/);
  await assert.rejects(bad([{role:'runway.month_closes',contract:'runway.v2',typeId:custom.typeId,readOnly:true}]),/declared read-only/);
  await assert.rejects(bad([{role:'programs',contract:'core.v1',typeId:custom.typeId}]),/does not match Programs core.v1/);
  // One writer per output role: a second writer is refused while the first is live; a read-only reader is fine.
  await assert.rejects(bad([{role:'runway.month_closes',contract:'runway.v2',typeId:custom.typeId}]),/Board closes writes Runway month closes/);
  const reader={...custom.manifest,fields:custom.manifest.fields.map((m:any)=>({...m,mode:'read'}))};
  await f.preview(actor,w.id,{kind:'save_component',projectId:null,content:{...custom.content,name:'Reader',manifest:{...reader,roles:[{role:'runway.month_closes',contract:'runway.v2',typeId:custom.typeId,readOnly:true}]}}});
 }finally{await x.pg.close();}
});

test('"Do not connect" is remembered per app and role until Connect is chosen explicitly',async()=>{
 const x=await setup();const {f,s,actor,P,R}=x;
 try{
  const w=await s.createWorkspace(actor,'Declined');
  const p=await x.install(w.id,P,'Programs');
  const r=await x.install(w.id,R,'Runway',(step:any)=>({consumers:step.consumers.map((c:any)=>({appId:c.appId,role:c.role,connect:false}))}));
  assert.equal(x.mapOf(await x.comp(w.id,p.receipt.appId))['runway.month_closes'],undefined,'nothing connects');
  assert.deepEqual((await declinedConnections(f,actor,w.id)).connections.map((c:any)=>[c.appName,c.role]),[['Programs','runway.month_closes']]);
  // Another provider of the same role is added later: the declined connection is not asked again.
  const custom=await customCloses(x,w.id,'Second closes');
  const preview=await f.preview(actor,w.id,{kind:'save_component',projectId:null,content:custom.content});
  const step=await dataAccessStep(f,actor,w.id,{previewId:preview.id,digest:preview.digest});
  assert.equal(step.needed,true);assert.deepEqual(step.consumers,[]);
  // Connect from the Access tab (a saved app target) lists it again, marked as remembered, and connecting clears the choice.
  const again=await dataAccessStep(f,actor,w.id,{componentId:p.receipt.appId});
  const row=again.existing.find((r:any)=>r.role==='runway.month_closes');assert.equal(row.remembered,true);
  const runwayCloses=x.mapOf(await x.comp(w.id,r.receipt.appId))['runway.month_closes'].typeId;assert.equal(row.choice,runwayCloses);
  await confirmDataAccess(f,actor,w.id,{componentId:p.receipt.appId,stepDigest:again.digest});
  assert.equal(x.mapOf(await x.comp(w.id,p.receipt.appId))['runway.month_closes'].typeId,runwayCloses);
  assert.deepEqual((await declinedConnections(f,actor,w.id)).connections,[]);
 }finally{await x.pg.close();}
});

test('archiving the writer: a custom replacement takes over only by explicit owner choice; the restored writer can only read',async()=>{
 const x=await setup();const {f,s,actor,P,R,pg}=x;
 try{
  const w=await s.createWorkspace(actor,'Writer');
  const r=await x.install(w.id,R,'Runway'),p=await x.install(w.id,P,'Programs');
  const closesType=x.mapOf(await x.comp(w.id,r.receipt.appId))['runway.month_closes'].typeId;
  assert.equal((await pg.query<any>('SELECT app_id FROM role_writers WHERE type_id=$1',[closesType])).rows[0].app_id,r.receipt.appId);
  const custom=await customCloses(x,w.id,'Replacement');
  const replacement=(name:string,takeover?:boolean)=>{const manifest={...custom.manifest,fields:custom.manifest.fields.map((m:any)=>({...m,typeId:closesType})),roles:[{role:'runway.month_closes',contract:'runway.v2',typeId:closesType}]};return f.preview(actor,w.id,{kind:'save_component',projectId:null,...(takeover?{roleWriterTakeover:['runway.month_closes']}:{}),content:{...custom.content,name,manifest,bindings:[{typeId:closesType,fields:custom.content.bindings[0].fields}]}});};
  await assert.rejects(replacement('Replacement'),/Runway writes Runway month closes/);
  await x.change(w.id,{kind:'archive_component',componentId:r.receipt.appId,expectedVersion:await x.v(r.receipt.appId),archived:true});
  await assert.rejects(replacement('Replacement'),/An owner can choose to take over/);
  const taken=await replacement('Replacement',true);const saved=await f.confirm(actor,w.id,taken.id,taken.digest);
  const writer=(await pg.query<any>('SELECT app_id,taken_over_from FROM role_writers WHERE type_id=$1',[closesType])).rows[0];assert.deepEqual([writer.app_id,writer.taken_over_from],[saved.id,r.receipt.appId]);
  // Restore Runway: it comes back, but writes to month closes are refused (it can still read them); the reader is unaffected.
  await x.change(w.id,{kind:'archive_component',componentId:r.receipt.appId,expectedVersion:await x.v(r.receipt.appId),archived:false});
  await assert.rejects(f.preview(actor,w.id,{kind:'apply_component_records',componentId:r.receipt.appId,expectedVersion:await x.v(r.receipt.appId),changes:[{kind:'create_record',typeId:closesType,data:{month:'2026-11-01',closing_balance:1,currency:'EUR'}}]}),/Replacement writes Runway month closes; Runway can read it/);
  await f.preview(actor,w.id,{kind:'apply_component_records',componentId:saved.id,expectedVersion:await x.v(saved.id),changes:[{kind:'create_record',typeId:closesType,data:{month:'2026-11-01',closing_balance:1,currency:'EUR'}}]});
  assert.doesNotMatch((await x.open(w.id,p.receipt.appId,{section:'timeline'})).html,/pg-banner bad|could not be shown/);
 }finally{await x.pg.close();}
});

test('contract versions: additive versions stay compatible, breaking ones need readers to declare them; the registry is in the guidance',async()=>{
 const registry=structuredClone(await contractRegistry());
 const v2=registry.roles['runway.month_closes'].versions['runway.v2'].fields;
 registry.roles['runway.month_closes'].versions['runway.v3']={fields:[...v2,{key:'board_note',name:'Board note',kind:'text'}]};
 registry.roles['runway.month_closes'].versions['runway.v4']={fields:v2.map(f=>f.key==='metrics'?{...f,kind:'number'}:f)};
 assert.equal(isSuperset(registry.roles['runway.month_closes'].versions['runway.v3'].fields,v2),true);
 assert.equal(readerAccepts(registry,'runway.month_closes',['runway.v2'],'runway.v3'),true,'readers of v2 keep working when the writer moves to a superset');
 assert.equal(readerAccepts(registry,'runway.month_closes',['runway.v2'],'runway.v4'),false,'a breaking version is not read by v2 readers');
 assert.equal(readerAccepts(registry,'runway.month_closes',['runway.v2','runway.v4'],'runway.v4'),true,'apps declare which versions they read');
 let text='',offset:number|null=0;while(offset!==null){const page=await readTemplateGuidance({resource:'contracts',offset});text+=page.text;offset=page.nextOffset;}const published=JSON.parse(text);
 assert.equal(published.registry,'role-contracts');assert.ok(published.roles.organizations.versions['core.v1']);assert.ok(published.roles['dataroom.engagement'].versions['dataroom.v1']);assert.equal(published.roles['runway.month_closes'].kind,'output');
});
