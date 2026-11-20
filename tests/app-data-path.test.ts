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
