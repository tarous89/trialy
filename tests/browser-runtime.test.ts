import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {Service} from '../src/domain/service.js';
import type {Database,Connection} from '../src/db/database.js';
import type {Actor} from '../src/shared/schema.js';
import {isV2Source,browserMode,effectiveSource} from '../src/workspace/browser-runtime.js';
import {KIT_SOURCE,KIT_VERSION} from '../src/shared/app-kit.js';
import {frontendFrameDocument,framePolicy,FRAME_SCRIPT} from '../src/shared/frontend-frame.js';
import {FRAME_ENGINE_SCRIPT} from '../src/shared/frame-engine.js';
import {bundledAppFont} from '../src/workspace/design-quality.js';

/* 5.1, 5.2, 5.3 on the server: what the frame receives to run an app itself, the v2 contract (records.save, notice,
 * the caller's app role, the person's remembered context) and the frame document's policy and size. */
async function setup(){
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const actor:Actor={userId:randomUUID(),origin:'human'};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'owner@example.invalid','Owner']);
 const f=new WorkspaceFoundation(db),s=new Service(db),w=(await s.createWorkspace(actor,'Browser runtime')).id;
 const change=async(op:any)=>{const p=await f.preview(actor,w,op);return f.confirm(actor,w,p.id,p.digest);};
 const p=await s.preview(actor,w,{kind:'create_type',name:'Deals',fields:[{key:'name',name:'Name',kind:'text',required:true,ai:true},{key:'amount',name:'Amount',kind:'number',ai:true}]});
 const typeId=(await s.commit(actor,p.id,p.digest)).objects[0].id as string;
 const save=async(source:string)=>{const saved=await change({kind:'save_component',projectId:null,content:{name:'Deals',format:'frontend-js',source,sourceAccess:'workspace',
  manifest:{version:1,scope:'workspace',fields:[{id:'name',typeId,field:'name',schemaVersion:0,kind:'text',mode:'write'},{id:'amount',typeId,field:'amount',schemaVersion:0,kind:'number',mode:'write'}]},bindings:[{typeId,fields:['name','amount']}]}});
  return {appId:saved.id as string,version:(await f.component(db,actor,w,saved.id)).version as number};};
 return {pg,db,f,s,w,actor,typeId,save,change};
}
const v2=(typeId:string)=>`'use trialagents v2';
const T=${JSON.stringify(typeId)},e=input.event,ed=kit.edit(e,{amount:'number'});
if(ed)tools.call('records.save',{changes:[{kind:'update_record',recordId:ed.recordId,expectedVersion:ed.version,data:{[ed.field]:ed.value}}]});
if(e.action==='add')tools.call('records.save',{changes:[{kind:'create_record',typeId:T,data:{name:'New',amount:1}}]});
if(e.action==='program')return {html:'<p>picked</p>',state:{},context:{program:e.value}};
const rows=tools.call('records.read',{typeId:T,limit:50}).rows;
return {html:kit.page(kit.table({columns:[{key:'name',label:'Name'},{key:'amount',label:'Amount',edit:{kind:'number'}}],rows}))+'<p>'+input.appRole+' '+JSON.stringify(input.context)+' '+(input.viewport?input.viewport.width:'')+'</p>',state:{n:rows.length},...(ed?{notice:kit.notice('success','Saved')}:{})};`;

test('5.3: the v2 marker, the kit ahead of v2 code only, and the frame policy with the engine',async()=>{
 assert.ok(isV2Source(`'use trialagents v2';\nreturn {html:''}`));
 assert.ok(isV2Source(`const templateConfiguration={};\nconst templateBindings=[];\n"use trialagents v2";\nreturn {html:''}`));
 assert.ok(!isV2Source(`const a=1;\nconst b=2;\nconst c=3;\n'use trialagents v2';`),'the marker belongs at the top');
 assert.ok(!isV2Source(`return {html:'use trialagents v2'}`));
 assert.equal(effectiveSource('return {html:""}'),'return {html:""}');
 assert.ok(effectiveSource(`'use trialagents v2';\nreturn {html:''}`).startsWith(KIT_SOURCE));
 const policy=framePolicy();
 assert.ok(policy.includes("'wasm-unsafe-eval'"),'WebAssembly for the engine');
 assert.ok(!policy.includes("'unsafe-eval'"),'no eval');assert.ok(policy.includes("connect-src 'none'"));assert.ok(policy.includes("form-action 'none'"));
 const doc=await frontendFrameDocument(bundledAppFont);
 assert.ok(doc.includes(FRAME_ENGINE_SCRIPT)&&doc.includes(FRAME_SCRIPT));
 assert.match(doc,/<script type="application\/x-trialy-engine" id="trialy-engine-binary">[A-Za-z0-9+/=]+<\/script>/,'the engine binary is a data block, not a script');
 // Size budget (5.8): the frame document with the engine, compressed as it is served.
 const gz=gzipSync(Buffer.from(doc)).length;console.log(JSON.stringify({frameDocumentBytes:doc.length,frameDocumentGzip:gz}));
 assert.ok(gz<720*1024,`frame document ${gz} bytes compressed, budget 720 KB`);
});

test('5.1, 5.3: a v2 app gets its code, reads, kit styles and input for the frame; records.save saves directly; context and notice',async()=>{
 const x=await setup();const {f,w,actor,typeId,db,s}=x;
 try{
  const {appId,version}=await x.save(v2(typeId));
  const p=await s.preview(actor,w,{kind:'create_record',typeId,data:{name:'Acme',amount:5}});const rec=(await s.commit(actor,p.id,p.digest)).objects[0];
  const open=await f.runFrontend(actor,w,{componentId:appId,expectedVersion:version,browser:{source:true},viewport:{width:'phone',coarse:true}});
  assert.equal(open.runtime,'trialy-frontend-js-v2');
  assert.equal(open.browser.mode,'v2');assert.equal(open.browser.version,'v2');assert.ok(open.browser.source.startsWith(KIT_SOURCE));assert.equal(open.browser.styles.kit,KIT_VERSION);
  assert.deepEqual(open.browser.input,{saved:true,writable:true,appRole:'owner',context:null,viewport:{width:'phone',coarse:true}});
  assert.equal(open.browser.reads.length,1);assert.equal(open.browser.reads[0].name,'records.read');assert.equal(open.browser.reads[0].result.rows[0].data.name,'Acme');
  assert.equal(open.browser.reset,false);assert.match(open.html,/owner null phone/);assert.match(open.css,/trialagents-kit/);
  const again=await f.runFrontend(actor,w,{componentId:appId,expectedVersion:version,viewId:open.viewId,browser:{source:false}});
  assert.equal(again.browser.source,undefined,'the code is sent only when the frame lacks it');
  // A person's edit saves directly in the same request and the frame's store is replaced.
  const edited=await f.runFrontend(actor,w,{componentId:appId,expectedVersion:version,viewId:open.viewId,browser:{source:false},requestKey:randomUUID(),state:open.state,event:{kind:'change',action:`edit:${rec.id}:amount:${rec.version}`,value:'9',form:{}}});
  assert.equal(edited.saved.status,'saved');assert.equal(edited.browser.reset,true);assert.equal(edited.browser.reads[0].result.rows[0].data.amount,9);
  assert.equal(edited.proposal,null);
  // records.save is refused outside a person's own click, edit or form (the app sees the refusal; nothing is saved).
  await assert.rejects(f.runFrontend(actor,w,{componentId:appId,expectedVersion:version,event:{kind:'refresh',action:'add',value:null,form:{}}}),/execution_failed/);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM records WHERE type_id=$1 AND data->>'name'='New'",[typeId])).rows[0].n,0);
  // G4: the working context is remembered for this person and comes back as input.context.
  await f.runFrontend(actor,w,{componentId:appId,expectedVersion:version,viewId:open.viewId,state:{},event:{kind:'change',action:'program',value:'P-7',form:{}}});
  assert.deepEqual(await f.appContext(actor,w,appId),{program:'P-7'});
  const reopened=await f.runFrontend(actor,w,{componentId:appId,expectedVersion:version,browser:{source:false}});
  assert.deepEqual(reopened.browser.input.context,{program:'P-7'});assert.match(reopened.html,/\{"program":"P-7"\}/);
  await f.setAppContext(actor,w,{componentId:appId,context:{program:'P-8'}});assert.deepEqual(await f.appContext(actor,w,appId),{program:'P-8'});
  await assert.rejects(f.setAppContext(actor,w,{componentId:appId,context:{big:'x'.repeat(5000)}}),/4 KB/);
  // Another person never sees this person's context (row security is checked in tests with the runtime role).
  assert.equal((await db.query('SELECT count(*)::int AS n FROM app_person_context',[])).rows[0].n,1);
 }finally{await x.db.close();}
});

test('5.2: custom code stays on server mode; v1 code cannot use records.save; the emergency switch',async()=>{
 const x=await setup();const {f,w,actor,typeId}=x;
 try{
  const custom=await x.save(`const rows=tools.call('records.read',{typeId:${JSON.stringify(typeId)}}).rows;if(input.event.action==='save')tools.call('records.save',{changes:[]});return {html:'<p>'+rows.length+'</p>',state:{}};`);
  const out=await f.runFrontend(actor,w,{componentId:custom.appId,expectedVersion:custom.version,browser:{source:true}});
  assert.deepEqual(out.browser,{mode:'server',reason:'customized'});assert.equal(out.runtime,'trialy-frontend-js-v1');
  const plain=await f.runFrontend(actor,w,{componentId:custom.appId,expectedVersion:custom.version});assert.equal(plain.browser,undefined,'nothing is added unless the frame asks');
  await assert.rejects(f.runFrontend(actor,w,{componentId:custom.appId,expectedVersion:custom.version,viewId:out.viewId,requestKey:randomUUID(),event:{kind:'click',action:'save',value:null,form:{}}}),/execution_failed|v2/);
  process.env.APP_BROWSER_RUNTIME='off';
  try{const {appId,version}=await x.save(v2(typeId));const off=await f.runFrontend(actor,w,{componentId:appId,expectedVersion:version,browser:{source:true}});assert.deepEqual(off.browser,{mode:'server',reason:'switched_off'});assert.equal(off.runtime,'trialy-frontend-js-v2','the app still runs, on the server');}
  finally{delete process.env.APP_BROWSER_RUNTIME;}
  assert.deepEqual(await browserMode(x.db,{format:'frontend-js',source:'return {html:""}'},{kind:'command'}),{mode:'server',reason:'command'});
 }finally{await x.db.close();}
});

test('5.1: read_app_data fills an app\'s document reads for the frame; outside effects are still refused',async()=>{
 const x=await setup();const {f,w,actor,typeId}=x;
 try{
  const {appId,version}=await x.save(`const d=tools.call('documents.list',{});return {html:'<p>'+d.documents.length+'</p>',state:{}};`);
  const r=await f.readAppData(actor,w,{componentId:appId,expectedVersion:version,reads:[{name:'documents.list',input:{}},{name:'records.read',input:{typeId}}]});
  assert.equal(r.results[0].ok,true);assert.ok(Array.isArray(r.results[0].value.documents));assert.equal(r.results[1].ok,true);
  await assert.rejects(f.readAppData(actor,w,{componentId:appId,expectedVersion:version,reads:[{name:'records.propose',input:[]}]}),/reads only/);
  await assert.rejects(f.readAppData(actor,w,{componentId:appId,expectedVersion:version,reads:[{name:'exchange.send',input:{}}]}),/reads only/);
 }finally{await x.db.close();}
});
