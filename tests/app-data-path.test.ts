import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {Service} from '../src/domain/service.js';
import type {Database,Connection} from '../src/db/database.js';
import type {Actor} from '../src/shared/schema.js';

/* Session 4 data path: reads without the sandbox (4.3), direct save (4.4) and Undo (4.6), on the real runtime. */
export async function setup(){
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const actor:Actor={userId:randomUUID(),origin:'human'};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'owner@example.invalid','Owner']);
 const f=new WorkspaceFoundation(db),s=new Service(db),w=(await s.createWorkspace(actor,'Data path')).id;
 const change=async(op:any)=>{const p=await f.preview(actor,w,op);return f.confirm(actor,w,p.id,p.digest);};
 const table=async(name:string,fields:any[])=>{const p=await s.preview(actor,w,{kind:'create_type',name,fields});return (await s.commit(actor,p.id,p.digest)).objects[0].id as string;};
 return {pg,db,f,s,w,actor,change,table};
}
type X=Awaited<ReturnType<typeof setup>>;
/** A small custom app: lists items, adds one on submit, renames on change, deletes on click. */
const source=(typeId:string)=>`const T=${JSON.stringify(typeId)};
const e=input.event;
if(e.kind==='submit'&&e.action==='add')tools.call('records.propose',[{kind:'create_record',typeId:T,data:{name:e.form.name,qty:Number(e.form.qty||0)}}]);
if(e.kind==='change'&&e.action.startsWith('rename:')){const [,id,v]=e.action.split(':');tools.call('records.propose',[{kind:'update_record',recordId:id,expectedVersion:Number(v),data:{name:e.value}}]);}
if(e.kind==='click'&&e.action.startsWith('delete:')){const [,id,v]=e.action.split(':');tools.call('records.propose',[{kind:'archive_record',recordId:id,expectedVersion:Number(v)}]);}
const rows=tools.call('records.read',{typeId:T,limit:50,offset:0}).rows;
return {html:'<form data-action="add"><input name="name"><button>Add</button></form><p>'+rows.length+' items</p>',state:{count:rows.length}};`;
export async function app(x:X,extraFields:any[]=[]){
 const typeId=await x.table('Items',[{key:'name',name:'Name',kind:'text',required:true,ai:true},{key:'qty',name:'Qty',kind:'number',ai:true,range:{min:0}},{key:'team',name:'Team',kind:'text',ai:true},...extraFields]);
 const content={name:'Items',format:'frontend-js',source:source(typeId),sourceAccess:'workspace',manifest:{version:1,scope:'workspace',fields:[{id:'name',typeId,field:'name',schemaVersion:0,kind:'text',mode:'write'},{id:'qty',typeId,field:'qty',schemaVersion:0,kind:'number',mode:'write'},{id:'team',typeId,field:'team',schemaVersion:0,kind:'text',mode:'write'}]},bindings:[{typeId,fields:['name','qty','team']}]};
 const saved=await x.change({kind:'save_component',projectId:null,content});
 return {typeId,appId:saved.id as string,version:(await x.f.component(x.db,x.actor,x.w,saved.id)).version as number};
}

test('4.3 read_app_data serves the same reads as the running app, once checked, reads only; records.summarize covers all data',async()=>{
 const x=await setup();const {f,s,w,actor,db}=x;
 try{
  const {typeId,appId,version}=await app(x);
  for(const [i,team] of ['Ops','Ops','Med'].entries()){const p=await s.preview(actor,w,{kind:'create_record',typeId,data:{name:'Item '+i,qty:i+1,team}});await s.commit(actor,p.id,p.digest);}
  const other=await x.table('Other',[{key:'name',name:'Name',kind:'text',ai:true}]);
  const out=await f.readAppData(actor,w,{componentId:appId,expectedVersion:version,reads:[
   {name:'records.read',input:{typeId,limit:2,offset:0}},
   {name:'records.summarize',input:{typeId,metric:'qty',groupBy:'team'}},
   {name:'records.read',input:{typeId:other}},
  ]});
  assert.equal(out.version,version);assert.ok(out.viewId);
  const [page,sums,unbound]=out.results;
  assert.equal(page.ok,true);assert.equal(page.value.rows.length,2);assert.equal(page.value.total,3);
  assert.equal(sums.value.totals.count,3,'totals use the full data, not the loaded page');assert.equal(Number(sums.value.totals.sum),6);
  assert.deepEqual(sums.value.groups.map((g:any)=>[g.label,g.count]),[['Ops',2],['Med',1]]);
  assert.deepEqual([unbound.ok,unbound.error.code],[false,'binding_required'],'a read outside the app is refused per read');
  // The same read through the running app returns the same rows.
  const run=await f.runFrontend(actor,w,{componentId:appId,expectedVersion:version,state:null,event:{kind:'open',action:'',value:null,form:{}}});
  assert.equal(run.state.count,3);
  // Only reads: anything that writes, runs or sends is refused before any read is made.
  await assert.rejects(f.readAppData(actor,w,{componentId:appId,expectedVersion:version,reads:[{name:'records.propose',input:[]}]}),/reads only/);
  const bad=await f.readAppData(actor,w,{componentId:appId,expectedVersion:version,reads:[{name:'records.summarize',input:{typeId,metric:'secret'}}]});
  assert.equal(bad.results[0].error.code,'summary_field','only bound fields are summarized');
  // A stale app version is refused as a whole.
  await assert.rejects(f.readAppData(actor,w,{componentId:appId,expectedVersion:version+5,reads:[{name:'roles.list',input:{}}]}));
  // Someone without access to the app reads nothing.
  const stranger:Actor={userId:randomUUID(),origin:'human'};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[stranger.userId,stranger.userId,'x@example.invalid','X']);
  await assert.rejects(f.readAppData(stranger,w,{componentId:appId,expectedVersion:version,reads:[{name:'records.read',input:{typeId}}]}));
 }finally{await db.close();}
});

const open=(x:X,appId:string,version:number,viewId?:string)=>x.f.runFrontend(x.actor,x.w,{componentId:appId,expectedVersion:version,...(viewId?{viewId}:{}),state:null,event:{kind:'open',action:'',value:null,form:{}}});
const count=async(x:X,typeId:string,state="state<>'archived'")=>(await x.db.query(`SELECT count(*)::int AS n FROM records WHERE type_id=$1 AND ${state}`,[typeId])).rows[0].n;

test('4.4 a person\'s edit in an app saves directly in one request, once, and the screen shows the saved data',async()=>{
 const x=await setup();const {f,w,actor,db}=x;
 try{
  const {typeId,appId,version}=await app(x),first=await open(x,appId,version);
  // A submit that proposes a record saves it at once: no review, no preview row, and the returned screen already shows it.
  const key=randomUUID(),submit={componentId:appId,expectedVersion:version,viewId:first.viewId,requestKey:key,state:first.state,event:{kind:'submit' as const,action:'add',value:null,form:{name:'Vials',qty:'3'}}};
  const out=await f.runFrontend(actor,w,submit);
  assert.equal(out.proposal,null,'no review step for record edits');assert.equal(out.saved.status,'saved');
  assert.equal(out.state.count,1,'the screen is rendered from the saved data');assert.equal(out.saved.rows[0].data.name,'Vials');assert.ok(out.saved.undoId);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM workspace_previews WHERE workspace_id=$1",[w])).rows[0].n,0);
  // Retrying the same request never saves twice.
  const again=await f.runFrontend(actor,w,submit);assert.equal(again.saved.retried,true);assert.equal(await count(x,typeId),1);
  // The same key with another change is refused.
  await assert.rejects(f.runFrontend(actor,w,{...submit,event:{...submit.event,form:{name:'Other'}}}),(e:any)=>e.code==='receipt_mismatch');
  // Validation runs once on the direct path, with every problem reported.
  await assert.rejects(f.saveAppRecords(actor,w,{componentId:appId,expectedVersion:version,requestKey:randomUUID(),changes:[{kind:'create_record',typeId,data:{qty:-2}}]}),(e:any)=>e.details.issues.map((i:any)=>i.code).join()==='required_field,out_of_range');
  // Opening an app never saves on its own: changes made while opening keep their review.
  assert.equal(await count(x,typeId),1);
  // The audit names the direct edit.
  const audit=(await db.query("SELECT after_value FROM audit_events WHERE action='component.records_applied' ORDER BY created_at DESC LIMIT 1")).rows[0].after_value;
  assert.equal(audit.direct,true);
 }finally{await db.close();}
});

test('4.4 D17 two people: different fields both save; the same field shows the newer value and is not saved',async()=>{
 const x=await setup();const {f,s,w,actor,db}=x;
 try{
  const {typeId,appId,version}=await app(x);
  const p=await s.preview(actor,w,{kind:'create_record',typeId,data:{name:'Kit',qty:1,team:'Ops'}});const rec=(await s.commit(actor,p.id,p.digest)).objects[0];
  const save=(data:any)=>f.saveAppRecords(actor,w,{componentId:appId,expectedVersion:version,requestKey:randomUUID(),changes:[{kind:'update_record',recordId:rec.id,expectedVersion:0,data}]});
  const one=await save({qty:5});assert.equal(one.rows[0].version,1);
  // Read at version 0, a change to another field still saves, on top of the newer version.
  const two=await save({team:'Med'});assert.deepEqual([two.rows[0].data.qty,two.rows[0].data.team,two.rows[0].version],[5,'Med',2]);
  // The same field, changed since version 0: refused with the newer value, nothing written.
  await assert.rejects(save({qty:9}),(e:any)=>{assert.equal(e.code,'stale_value');assert.deepEqual(e.details.fields,['qty']);assert.equal(e.details.row.data.qty,5);return true;});
  assert.equal((await db.query('SELECT version FROM records WHERE id=$1',[rec.id])).rows[0].version,2);
 }finally{await db.close();}
});

test('4.4 A4 assistants: Data = Edit saves directly through app commands; View only is refused',async()=>{
 const x=await setup();const {f,w,actor,db}=x;
 try{
  const {typeId,appId,version}=await app(x),ai:Actor={...actor,origin:'ai',assistant:'claude'};
  const saved=await f.saveAppRecords(ai,w,{componentId:appId,expectedVersion:version,requestKey:randomUUID(),changes:[{kind:'create_record',typeId,data:{name:'From Claude'}}]});
  assert.equal(saved.rows[0].data.name,'From Claude');
  await db.query("INSERT INTO assistant_limits(workspace_id,user_id,assistant,data_level,apps_level) VALUES($1,$2,'claude','view','edit') ON CONFLICT(workspace_id,user_id,assistant) DO UPDATE SET data_level='view'",[w,actor.userId]);
  await assert.rejects(f.saveAppRecords(ai,w,{componentId:appId,expectedVersion:version,requestKey:randomUUID(),changes:[{kind:'create_record',typeId,data:{name:'Blocked'}}]}),(e:any)=>e.code==='assistant_data_view_only');
  assert.equal(await count(x,typeId),1);
 }finally{await db.close();}
});

test('4.6 delete is an archive; Undo reverses your own edit, add and delete in the same open app and refuses a changed record',async()=>{
 const x=await setup();const {f,s,w,actor,db}=x;
 try{
  const {typeId,appId,version}=await app(x),view=(await open(x,appId,version)).viewId;
  const save=(changes:any[])=>f.saveAppRecords(actor,w,{componentId:appId,expectedVersion:version,viewId:view,requestKey:randomUUID(),changes});
  const added=await save([{kind:'create_record',typeId,data:{name:'Box',qty:2}}]),id=added.rows[0].id;
  const edited=await save([{kind:'update_record',recordId:id,expectedVersion:0,data:{qty:7}}]);
  const deleted=await save([{kind:'archive_record',recordId:id,expectedVersion:1}]);
  assert.equal(deleted.rows[0].state,'archived');assert.equal(await count(x,typeId),0,'a delete is an archive');
  assert.equal(await count(x,typeId,"state='archived'"),1,'nothing is removed');
  const list=await f.listUndo(actor,w,{componentId:appId,viewId:view});
  assert.deepEqual(list.actions.map((a:any)=>a.label),['Delete record','Edit qty','Add record']);
  // Undo the delete, then the edit: the record is back with its earlier value.
  const undone=await f.undoAppChange(actor,w,{componentId:appId,viewId:view,undoId:deleted.undoId});assert.equal(undone.rows[0].state,'draft');
  await assert.rejects(f.undoAppChange(actor,w,{componentId:appId,viewId:view,undoId:deleted.undoId}),(e:any)=>e.code==='undo_used');
  // The add's Undo is refused while the record is at a later version than the add left it.
  await assert.rejects(f.undoAppChange(actor,w,{componentId:appId,viewId:view,undoId:added.undoId}),(e:any)=>e.code==='undo_stale');
  const back=await f.undoAppChange(actor,w,{componentId:appId,viewId:view,undoId:edited.undoId});
  assert.equal(back.rows[0].data.qty,2);
  // Only your own actions, only in the same open app view.
  const other:Actor={userId:randomUUID(),origin:'human'};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[other.userId,other.userId,'o@example.invalid','O']);
  await assert.rejects(f.undoAppChange(other,w,{componentId:appId,viewId:view,undoId:added.undoId}));
  await assert.rejects(f.undoAppChange(actor,w,{componentId:appId,viewId:randomUUID(),undoId:added.undoId}),(e:any)=>e.code==='undo_unavailable');
  // Someone else's later change blocks Undo of yours.
  const fresh=await save([{kind:'create_record',typeId,data:{name:'Jar'}}]),jar=fresh.rows[0];
  const p=await s.preview(actor,w,{kind:'update_record',recordId:jar.id,expectedVersion:0,data:{qty:1}});await s.commit(actor,p.id,p.digest);
  await assert.rejects(f.undoAppChange(actor,w,{componentId:appId,viewId:view,undoId:fresh.undoId}),(e:any)=>e.code==='undo_stale');
  // History stays append-only: every step is a new revision.
  assert.equal((await db.query("SELECT count(*)::int AS n FROM revisions WHERE object_id=$1 AND object_kind='record'",[id])).rows[0].n,5);
  // An app click that deletes saves directly too.
  const run=await f.runFrontend(actor,w,{componentId:appId,expectedVersion:version,viewId:view,requestKey:randomUUID(),state:null,event:{kind:'click',action:`delete:${jar.id}:1`,value:null,form:{}}});
  assert.equal(run.saved.rows[0].state,'archived');
 }finally{await db.close();}
});

test('4.4, 4.6 under the restricted database role: direct save, conflicts and Undo; another person sees no Undo entry',async()=>{
 const {setDatabaseContext,databaseContext,withActor}=await import('../src/db/context.js');
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
  const setup:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  const db:Database={query:(q,v)=>db.transaction(tx=>tx.query(q,v)),transaction:fn=>pg.transaction(async tx=>{await tx.exec(databaseContext().service==='worker'?'SET LOCAL ROLE trialy_worker':'SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return fn(tx as Connection);}),close:async()=>{}};
  const owner:Actor={userId:randomUUID(),origin:'human'},other:Actor={userId:randomUUID(),origin:'human'};
  for(const a of [owner,other])await setup.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,a.userId+'@example.invalid','P']);
  const boot=new Service(setup),w=(await boot.createWorkspace(owner,'Restricted')).id;await boot.share(owner,w,other.userId,'editor',[],null,false);
  const p=await boot.preview(owner,w,{kind:'create_type',name:'Items',fields:[{key:'name',name:'Name',kind:'text',required:true,ai:true},{key:'qty',name:'Qty',kind:'number',ai:true},{key:'team',name:'Team',kind:'text',ai:true}]});const typeId=(await boot.commit(owner,p.id,p.digest)).objects[0].id;
  const f=new WorkspaceFoundation(db),as=<T>(a:Actor,fn:()=>Promise<T>)=>withActor(a,fn);
  const content={name:'Items',format:'frontend-js',source:'return {html:"<p>Items</p>",state:null};',sourceAccess:'workspace',manifest:{version:1,scope:'workspace',fields:[{id:'name',typeId,field:'name',schemaVersion:0,kind:'text',mode:'write'},{id:'qty',typeId,field:'qty',schemaVersion:0,kind:'number',mode:'write'}]},bindings:[{typeId,fields:['name','qty']}]};
  const appId=(await as(owner,async()=>{const d=await f.preview(owner,w,{kind:'save_component',projectId:null,content});return f.confirm(owner,w,d.id,d.digest);})).id;
  const view=(await as(owner,()=>f.runFrontend(owner,w,{componentId:appId,expectedVersion:0}))).viewId;
  const saved=await as(owner,()=>f.saveAppRecords(owner,w,{componentId:appId,expectedVersion:0,viewId:view,requestKey:randomUUID(),changes:[{kind:'create_record',typeId,data:{name:'Box',qty:1}}]}));
  assert.equal(saved.rows[0].data.name,'Box');assert.ok(saved.undoId);
  // The other person cannot see or use the owner's Undo entry, even with its id.
  assert.equal((await as(other,()=>db.query('SELECT count(*)::int AS n FROM app_undo_entries',[]))).rows[0].n,0);
  await assert.rejects(as(other,()=>f.undoAppChange(other,w,{componentId:appId,viewId:view,undoId:saved.undoId})));
  const undone=await as(owner,()=>f.undoAppChange(owner,w,{componentId:appId,viewId:view,undoId:saved.undoId}));assert.equal(undone.rows[0].state,'archived');
 }finally{await pg.close();}
});

test('4.4 an edit that changes no value is checked but not written',async()=>{
 const x=await setup();const {f,s,w,actor,db}=x;
 try{
  const {typeId,appId,version}=await app(x);
  const p=await s.preview(actor,w,{kind:'create_record',typeId,data:{name:'Same',qty:1}});const rec=(await s.commit(actor,p.id,p.digest)).objects[0];
  const same=await f.saveAppRecords(actor,w,{componentId:appId,expectedVersion:version,requestKey:randomUUID(),changes:[{kind:'update_record',recordId:rec.id,expectedVersion:0,data:{name:'Same'}}]});
  assert.equal(same.unchanged,true);assert.deepEqual(same.rows,[]);assert.equal((await db.query('SELECT version FROM records WHERE id=$1',[rec.id])).rows[0].version,0);
  const stranger:Actor={userId:randomUUID(),origin:'human'};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[stranger.userId,stranger.userId,'s@example.invalid','S']);
  await assert.rejects(f.saveAppRecords(stranger,w,{componentId:appId,expectedVersion:version,requestKey:randomUUID(),changes:[{kind:'update_record',recordId:rec.id,expectedVersion:0,data:{name:'Same'}}]}),'no answer without access');
 }finally{await db.close();}
});
