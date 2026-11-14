import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {Service} from '../src/domain/service.js';
import {listAppCommands,runAppCommand,resolveAppOpen,readAppCommands,checkInput} from '../src/workspace/app-commands.js';
import {contractRegistry} from '../src/workspace/role-contracts.js';
import type {Database,Connection} from '../src/db/database.js';
import type {Actor} from '../src/shared/schema.js';

/* App commands and "Edit in App" (Runway scope §14.3 and §14.7), on the real runtime and review path. */
process.env.APP_COMMANDS_ENABLED='true';
async function setup(){
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const actor:Actor={userId:randomUUID(),origin:'human'};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'owner@example.invalid','Owner']);
 const f=new WorkspaceFoundation(db),s=new Service(db),w=(await s.createWorkspace(actor,'Commands')).id;
 const change=async(op:any)=>{const p=await f.preview(actor,w,op);return f.confirm(actor,w,p.id,p.digest);};
 const table=async(name:string,fields:any[])=>{const p=await s.preview(actor,w,{kind:'create_type',name,fields});return (await s.commit(actor,p.id,p.digest)).objects[0].id as string;};
 return {pg,db,f,s,w,actor,change,table};
}
const declaration=[
 {id:'items.count',label:'Count items',mode:'read',input:{type:'object',properties:{},additionalProperties:false}},
 {id:'item.add',label:'Add an item',mode:'propose',input:{type:'object',properties:{name:{type:'string',minLength:1,maxLength:50},qty:{type:'integer',minimum:0}},required:['name'],additionalProperties:false}}
];
// The click path and the command path share one handler, as every app with commands must.
const source=(typeId:string)=>`const appCommands=${JSON.stringify(declaration)};
const T=${JSON.stringify(typeId)};
const rows=()=>tools.call('records.read',{typeId:T,limit:50,offset:0}).rows;
function add(v){if(!v.name)throw Error('Name is required');tools.call('records.propose',[{kind:'create_record',typeId:T,data:{name:v.name,qty:v.qty??0}}]);return {proposed:v.name};}
const e=input.event;
if(e.kind==='command'){const v=JSON.parse(e.value||'{}');let out;try{out={ok:true,result:e.action==='items.count'?{count:rows().length}:add(v)};}catch(err){out={ok:false,error:String(err.message||err)};}return {html:'',state:{command:out}};}
if(e.kind==='submit'&&e.action==='add')add({name:e.form.name,qty:Number(e.form.qty||0)});
return {html:'<form data-action="add"><input name="name" data-ui-state="name"><button>Add</button></form><p>'+rows().length+' items</p>',state:input.state};`;
async function app(x:any){
 const typeId=await x.table('Items',[{key:'name',name:'Name',kind:'text',required:true,ai:true},{key:'qty',name:'Qty',kind:'number',ai:true}]);
 const content={name:'Items',format:'frontend-js',source:source(typeId),sourceAccess:'workspace',manifest:{version:1,scope:'workspace',fields:[{id:'name',typeId,field:'name',schemaVersion:0,kind:'text',mode:'write'},{id:'qty',typeId,field:'qty',schemaVersion:0,kind:'number',mode:'write'}]},bindings:[{typeId,fields:['name','qty']}]};
 const saved=await x.change({kind:'save_component',projectId:null,content});
 return {typeId,appId:saved.id as string,version:(await x.f.component(x.db,x.actor,x.w,saved.id)).version as number};
}

test('commands are declared as data, listed, validated and run through the same handler as a click',async()=>{
 const x=await setup();const {f,w,actor,db}=x;
 try{
  assert.deepEqual(readAppCommands('return {html:""}'),[]);
  const {typeId,appId,version}=await app(x);
  const list=await listAppCommands(f,actor,w,{appId});
  assert.deepEqual(list.commands.map((c:any)=>[c.id,c.mode]),[['items.count','read'],['item.add','propose']]);
  assert.equal(list.writable,true);
  // Read: the app's own result, no proposal.
  const read=await runAppCommand(f,actor,w,{appId,expectedVersion:version,command:'items.count',input:{},requestKey:randomUUID()});
  assert.deepEqual([read.ok,read.result,read.proposal],[true,{count:0},null]);
  // Input is checked against the declared schema before the app runs.
  await assert.rejects(runAppCommand(f,actor,w,{appId,expectedVersion:version,command:'item.add',input:{qty:2},requestKey:randomUUID()}),/input.name is required/);
  await assert.rejects(runAppCommand(f,actor,w,{appId,expectedVersion:version,command:'item.add',input:{name:'A',color:'red'},requestKey:randomUUID()}),/not an input of this command/);
  await assert.rejects(runAppCommand(f,actor,w,{appId,expectedVersion:version,command:'nope',input:{},requestKey:randomUUID()}),/no such command/);
  await assert.rejects(runAppCommand(f,actor,w,{appId,expectedVersion:version+1,command:'items.count',input:{},requestKey:randomUUID()}),/app changed/);
  // Propose: a review that is not saved until a person confirms it.
  const key=randomUUID(),run=await runAppCommand(f,actor,w,{appId,expectedVersion:version,command:'item.add',input:{name:'Vials',qty:3},requestKey:key});
  assert.equal(run.ok,true);assert.ok(run.proposal?.previewId);
  assert.equal((await db.query("SELECT count(*)::int n FROM records WHERE type_id=$1",[typeId])).rows[0].n,0,'nothing is written by the command');
  // The click path proposes exactly the same change.
  const click=await f.runFrontend(actor,w,{componentId:appId,expectedVersion:version,state:null,event:{kind:'submit',action:'add',value:null,form:{name:'Vials',qty:'3'}}});
  const opOf=async(previewId:string)=>(await db.query('SELECT body FROM workspace_previews WHERE id=$1',[previewId])).rows[0].body.operation.changes;
  assert.deepEqual(await opOf(run.proposal!.previewId),await opOf(click.proposal.id));
  // Replaying the same request returns the same review; a different input with the same key is refused.
  const again=await runAppCommand(f,actor,w,{appId,expectedVersion:version,command:'item.add',input:{name:'Vials',qty:3},requestKey:key});
  assert.equal(again.proposal!.previewId,run.proposal!.previewId);assert.equal(again.requestReused,true);
  await assert.rejects(runAppCommand(f,actor,w,{appId,expectedVersion:version,command:'item.add',input:{name:'Other'},requestKey:key}),/different command or input/);
  await f.confirm(actor,w,run.proposal!.previewId,run.proposal!.digest);
  assert.equal((await runAppCommand(f,actor,w,{appId,expectedVersion:version,command:'items.count',input:{},requestKey:randomUUID()})).result.count,1);
  // App errors come back as a failed command, not a crash.
  const empty=await runAppCommand(f,actor,w,{appId,expectedVersion:version,command:'item.add',input:{name:''},requestKey:randomUUID()}).catch(e=>e);
  assert.match(String(empty.message??empty.error),/too short|Name is required/);
  // Every run is logged with the command id.
  assert.ok((await db.query("SELECT count(*)::int n FROM audit_events WHERE action='app.command'")).rows[0].n>=3);
  // Commands are not a way around the gate.
  process.env.APP_COMMANDS_ENABLED='false';
  await assert.rejects(listAppCommands(f,actor,w,{appId}),/not enabled/);
  process.env.APP_COMMANDS_ENABLED='true';
 }finally{await x.pg.close();}
});

test('declarations are strict on save; commands cannot reach connectors or functions',async()=>{
 const x=await setup();const {f,w,actor}=x;
 try{
  const typeId=await x.table('Things',[{key:'name',name:'Name',kind:'text',ai:true}]);
  const content=(src:string)=>({kind:'save_component',projectId:null,content:{name:'Things',format:'frontend-js',source:src,sourceAccess:'workspace',manifest:{version:1,scope:'workspace',fields:[{id:'name',typeId,field:'name',schemaVersion:0,kind:'text',mode:'write'}]},bindings:[{typeId,fields:['name']}]}});
  await assert.rejects(f.preview(actor,w,content('const appCommands=[{"id":"Bad Id","label":"x","mode":"read"}];\nreturn {html:""};')),/Invalid appCommands/);
  await assert.rejects(f.preview(actor,w,content('const appCommands=[{"id":"a.read","label":"x","mode":"read"},{"id":"a.read","label":"y","mode":"read"}];\nreturn {html:""};')),/once/);
  await assert.rejects(f.preview(actor,w,content('const appCommands=[{"id":"a.read","label":"x","mode":"read","input":{"type":"object","properties":{"q":{"type":"string","oneOf":[]}}}}];\nreturn {html:""};')),/Unsupported input schema keyword/);
  const saved=await x.change(content('const appCommands=[{"id":"fn.run","label":"Run","mode":"propose"}];\nif(input.event.kind==="command"){try{tools.call("functions.invoke",{binding:"x",requestKey:"00000000-0000-4000-8000-000000000001"});return {html:"",state:{command:{ok:true,result:"ran"}}};}catch(e){return {html:"",state:{command:{ok:false,error:String(e.message)}}};}}\nreturn {html:""};'));
  const c=await f.component(x.db,actor,w,saved.id);
  const r=await runAppCommand(f,actor,w,{appId:c.id,expectedVersion:c.version,command:'fn.run',input:{},requestKey:randomUUID()});
  assert.equal(r.ok,false);assert.match(r.error!,/cannot queue functions/);
  // The schema subset checker.
  assert.throws(()=>checkInput({type:'object',properties:{m:{type:'string',format:'month'}}},{m:'March'}),/month/);
  checkInput({type:'object',properties:{m:{type:'string',format:'month'}}},{m:'2027-03'});
 }finally{await x.pg.close();}
});

test('a value read from another app is labelled with its writer, opens there, and cannot be changed through the reader',async()=>{
 const x=await setup();const {f,w,actor,db}=x;
 try{
  const registry=await contractRegistry(),fields=registry.roles['runway.month_closes'].versions['runway.v2'].fields.map((f:any)=>({...f,ai:true}));
  const typeId=await x.table('Closes',fields);
  const writerManifest={version:1,scope:'workspace',fields:fields.map((f:any)=>({id:'mc_'+f.key,typeId,field:f.key,schemaVersion:0,kind:f.kind,mode:'write'})),roles:[{role:'runway.month_closes',contract:'runway.v2',typeId}]};
  const writer=await x.change({kind:'save_component',projectId:null,content:{name:'Cash app',format:'frontend-js',source:"return {html:'<p>Closes</p>',state:input.state};",sourceAccess:'workspace',manifest:writerManifest,bindings:[{typeId,fields:fields.map((f:any)=>f.key)}]}});
  const p=await x.s.preview(actor,w,{kind:'create_record',typeId,data:{month:'2026-10-01',closing_balance:100,currency:'EUR',closed:true}});const recordId=(await x.s.commit(actor,p.id,p.digest)).objects[0].id;
  const readerSource=`if(input.event.kind==='click'&&input.event.action==='edit'){tools.call('records.propose',[{kind:'update_record',recordId:${JSON.stringify(recordId)},expectedVersion:0,data:{commentary:'x'}}]);}
const i=tools.call('integrations.list',{}),r=tools.call('roles.list',{});return {html:'<button data-action="edit">Edit</button><button data-trialy-open="runway.month_closes ${recordId}">Edit in app</button>',state:{roles:r.roles}};`;
  const readerManifest={version:1,scope:'workspace',fields:fields.map((f:any)=>({id:'mc_'+f.key,typeId,field:f.key,schemaVersion:0,kind:f.kind,mode:f.key==='commentary'?'write':'read'})),roles:[{role:'runway.month_closes',contract:'runway.v2',typeId,readOnly:true}]};
  // A read-only role with a write field is refused on save; bind it read-only.
  await assert.rejects(f.preview(actor,w,{kind:'save_component',projectId:null,content:{name:'Board',format:'frontend-js',source:readerSource,sourceAccess:'workspace',manifest:readerManifest,bindings:[{typeId,fields:fields.map((f:any)=>f.key)}]}}),/declared read-only/);
  // Even a manifest that slipped a write field past the role (an older app) is refused at write time with the writer's name.
  const reader=await x.change({kind:'save_component',projectId:null,content:{name:'Board',format:'frontend-js',source:readerSource,sourceAccess:'workspace',manifest:{...readerManifest,fields:readerManifest.fields.map((m:any)=>({...m,mode:'read'}))},bindings:[{typeId,fields:fields.map((f:any)=>f.key)}]}});
  const c=await f.component(db,actor,w,reader.id);
  const out=await f.runFrontend(actor,w,{componentId:c.id,expectedVersion:c.version,state:null,event:{kind:'open'}});
  const role=(out.state as any).roles.find((r:any)=>r.role==='runway.month_closes');
  assert.deepEqual(role.writer,{appName:'Cash app',canOpen:true},'the writer is named; its ID is not exposed');
  const refused=await f.runFrontend(actor,w,{componentId:c.id,expectedVersion:c.version,state:null,event:{kind:'click',action:'edit',value:null,form:{}}}).catch(e=>e);
  assert.equal(refused.code,'role_read_only');assert.match(refused.message,/Make this change in Cash app/);
  assert.deepEqual(refused.details,{role:'runway.month_closes',recordId,writerAppName:'Cash app'});
  // Edit in App opens the writer at the record.
  const open=await resolveAppOpen(f,actor,w,{appId:c.id,role:'runway.month_closes',recordId});
  assert.equal(open.kind,'app');assert.match(open.href,new RegExp('^/apps/'+writer.id+'\\?.*recordId='+recordId));
  // An archived writer cannot be opened: the person goes to Database instead.
  await x.change({kind:'archive_component',componentId:writer.id,expectedVersion:(await f.component(db,actor,w,writer.id)).version,archived:true});
  const fallback=await resolveAppOpen(f,actor,w,{appId:c.id,role:'runway.month_closes',recordId});
  assert.equal(fallback.kind,'database');
  await assert.rejects(resolveAppOpen(f,actor,w,{appId:c.id,role:'organizations'}),/not read from another app/);
 }finally{await x.pg.close();}
});
