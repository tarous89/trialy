import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import variant from '@jitl/quickjs-wasmfile-release-sync';
import {newQuickJSWASMModuleFromVariant,newVariant} from 'quickjs-emscripten-core';
import {execute} from '../src/foundation/runtime.js';
import {CATALOG_APPS,catalogDemo} from '../scripts/lib/catalog-demo.js';
import {startEngine,readKey,type EngineApp} from '../src/frame-engine/engine-core.js';
import {createStore,createLocalApp,localOutput,FILLABLE_READS,SEEDED_READS,STORE_TTL} from '../src/frame-engine/local-runtime.js';
import {browserSwitches,isV2Source,effectiveSource} from '../src/workspace/browser-runtime.js';
import {KIT_SOURCE} from '../src/shared/app-kit.js';
import {READ_CAPABILITIES} from '../src/workspace/app-capabilities.js';
import {documentCapabilities} from '../src/workspace/app-documents.js';
import {appExchangeReads} from '../src/domain/external-exchange.js';

/* 5.1, 5.2: the browser test of each switched-on catalog app. Its published source runs in the server runtime and in
 * the frame engine (the same QuickJS release without asyncify, kept alive between events) on the fictional demo
 * records. Every screen must come out identical, and the frame must make each screen from the reads the server
 * seeded with the first one, without asking the server. A version is switched on in templates/browser-runtime.json
 * only while this test passes for it. No database, network or browser. */
const require=createRequire(import.meta.url);
const wasm=(await readFile(require.resolve('@jitl/quickjs-wasmfile-release-sync/package.json').replace(/package\.json$/,'')+'dist/emscripten-module.wasm')).buffer;
const engine=await startEngine({wasm,create:options=>newQuickJSWASMModuleFromVariant(newVariant(variant as any,options) as any)});
// Each app is tested at the version switched on in templates/browser-runtime.json, whatever the seed names: an earlier
// version stays switched on (and tested) while installed copies still run it, after a rebuilt version is approved (D41).
const APPS=CATALOG_APPS.flatMap(a=>(browserSwitches().compat[a.id]??[]).map(version=>({...a,version})));
const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8'));
const availability=JSON.parse(await readFile('templates/catalog-availability.json','utf8')).apps;

test('the frame reads exactly what read_app_data serves, and seeds only reads',()=>{
 for(const name of READ_CAPABILITIES)assert.ok(FILLABLE_READS.has(name),name);
 for(const name of [...documentCapabilities,...appExchangeReads,'files.list'])assert.ok(FILLABLE_READS.has(name),name);
 assert.equal(FILLABLE_READS.size,READ_CAPABILITIES.size+documentCapabilities.length+appExchangeReads.length+1);
 for(const name of SEEDED_READS)assert.ok(!/propose|save|run|invoke|call|send|create|update|delete/.test(name.split('.')[1]),name);
});

test('every switched-on catalog app runs in the browser, and the switch names only versions this test covers',async()=>{
 const on=Object.entries(availability).filter(([,v]:any)=>v.platform&&v.chatgpt&&v.claude).map(([k])=>k).sort();
 const tested=new Set(APPS.map(a=>a.id+'@'+a.version));
 for(const [id,versions] of Object.entries(browserSwitches().compat))for(const version of versions)assert.ok(tested.has(id+'@'+version),`${id} ${version} is tested here`);
 // The approved version of every switched-on app runs in the browser: it is v2, or its unchanged code is switched on above.
 for(const id of on){const version=seed[id].version,entry=JSON.parse(await readFile(`templates/apps/${id}-${version}.json`,'utf8'));
  assert.ok(isV2Source(entry.source)||(browserSwitches().compat[id]??[]).includes(version),`${id} ${version} runs in the browser`);}
});

for(const app of APPS)test(`${app.id}: every screen renders identically in the frame and on the server, from seeded reads`,async()=>{
 const d=await catalogDemo(app),{source,screens}=d,entry={version:d.version};
 assert.equal(isV2Source(source),false);assert.equal(effectiveSource(source),source);
 const answer=d.answer,base={saved:true,writable:true};
 // The server: each event is a fresh single-use run; every read is recorded as the server seeds them.
 const reference:any[]=[],seeded:any[]=[];let state:any=null;
 const events=[{kind:'open',action:'',value:null,form:{}},...screens.map(id=>({kind:'click',action:'nav:'+id,value:null,form:{}}))];
 for(const [i,event] of events.entries()){
  const out:any=await execute(source,{...base,state,event},async(name,input)=>{try{const result=answer(name,input);if(i===0)seeded.push({name,input:input??{},result});return result;}catch(e){if(i===0)seeded.push({name,input,error:(e as Error).message});throw e;}});
  reference.push({html:out.html,css:out.css??'',state:out.state??null});if(i===0)state=out.state??null;else state=reference[0].state;
 }
 // The frame: one kept-alive app; reads come only from the store, which holds what the first screen read.
 const loaded:EngineApp=engine.load(source),store=createStore();store.seed(seeded);
 const local=createLocalApp({app:loaded,version:'v1',store,input:base});
 let filled=0;
 try{
  for(const [i,event] of events.entries()){
   const from=i===0?null:reference[0].state;
   let result=local.run(from,event);
   // A screen that reads something the first one did not: the frame asks for those reads once (read_app_data) and runs again.
   for(let round=0;result.kind==='reads'&&round<3;round++){filled++;store.seed(result.reads.map(r=>{try{return {...r,result:answer(r.name,r.input)};}catch(e){return {...r,error:(e as Error).message};}}));result=local.run(from,event);}
   assert.equal(result.kind,'painted',`${event.action||'open'}: made in the frame (${(result as any).reason??''})`);
   const out=(result as any).output;
   assert.deepEqual({html:out.html,css:out.css,state:out.state},reference[i],`${event.action||'open'}: identical to the server`);
  }
 }finally{loaded.dispose();}
 console.log(JSON.stringify({app:app.id,version:entry.version,screens:events.length,seededReads:seeded.length,extraReadRounds:filled}));
});

test('local runtime: outside effects go to the server, failed reads fail as on the server, outputs are checked',()=>{
 const code=`const r=tools.call('records.read',{typeId:'t'});if(input.event.action==='save')tools.call('records.propose',[{kind:'create_record',typeId:'t',data:{}}]);
  if(input.event.action==='swallow'){try{tools.call('actions.run',{})}catch(e){}}
  if(input.event.action==='missing'){try{tools.call('records.read',{typeId:'other'})}catch(e){}}
  if(input.event.action==='bad')return {html:'x',extra:1};
  return {html:'<p>'+r.rows.length+'</p>',state:{n:r.rows.length}};`;
 const app=engine.load(code),store=createStore();store.seed([{name:'records.read',input:{typeId:'t'},result:{rows:[{id:'a',version:0,data:{}}],total:1,limit:25,offset:0}}]);
 const local=createLocalApp({app,version:'v1',store,input:{saved:true,writable:true}});
 try{
  assert.deepEqual(local.run(null,{kind:'click',action:'nav'}),{kind:'painted',output:{html:'<p>1</p>',css:'',state:{n:1}},saves:[],misses:[],rollback:null});
  assert.equal(local.run(null,{kind:'click',action:'save'}).kind,'server');
  // An app that catches the refusal still goes to the server: the refusal is recorded, not only thrown.
  assert.deepEqual(local.run(null,{kind:'click',action:'swallow'}),{kind:'server',reason:'action:actions.run'});
  assert.deepEqual(local.run(null,{kind:'click',action:'missing'}),{kind:'reads',reads:[{name:'records.read',input:{typeId:'other'}}]});
  assert.equal(local.run(null,{kind:'click',action:'bad'}).kind,'server');
  store.seed([{name:'records.read',input:{typeId:'other'},error:'This table is restricted'}]);
  assert.equal(local.run(null,{kind:'click',action:'missing'}).kind,'painted');
 }finally{app.dispose();}
 assert.equal(readKey('records.read',{b:1,a:{d:2,c:1}}),readKey('records.read',{a:{c:1,d:2},b:1}));
 assert.equal(localOutput({html:'x',controls:[{slot:'a',fieldId:'b',recordId:'c'}]},'v1'),null);
 assert.equal(localOutput({html:'x',notice:{kind:'info',message:'Hi'}},'v1'),null);
 assert.deepEqual(localOutput({html:'x',notice:{kind:'info',message:'Hi'}},'v2'),{html:'x',css:'',state:null,notice:{kind:'info',message:'Hi'}});
});

test('local store: entries expire, a reset replaces them, and a v2 save patches every stored copy of the record',()=>{
 let now=1000;const store=createStore(()=>now);
 store.seed([{name:'records.read',input:{typeId:'t'},result:{rows:[{id:'a',version:1,data:{name:'Old',stage:'x'}},{id:'b',version:1,data:{name:'B'}}],total:2,limit:25,offset:0}},
  {name:'records.readMany',input:{reads:[{typeId:'t'}]},result:{results:[{rows:[{id:'a',version:1,data:{name:'Old'}}],total:1}]}}]);
 store.patch([{kind:'update_record',recordId:'a',expectedVersion:1,data:{name:'New'}},{kind:'archive_record',recordId:'b',expectedVersion:1}]);
 assert.deepEqual(store.get('records.read',{typeId:'t'}).result,{rows:[{id:'a',version:1,data:{name:'New',stage:'x'}}],total:1,limit:25,offset:0});
 assert.equal(store.get('records.readMany',{reads:[{typeId:'t'}]}).result.results[0].rows[0].data.name,'New');
 now+=STORE_TTL+1;assert.equal(store.get('records.read',{typeId:'t'}),null);
 store.seed([{name:'roles.list',input:{},result:{roles:[]}}],true);assert.equal(store.size(),1);
 store.seed([{name:'records.propose',input:{},result:{}}]);assert.equal(store.size(),1,'only reads are stored');
});

test('v2 in the frame: records.save shows at once and goes to the server; a missing read shows first and is filled after',()=>{
 const code=`'use trialagents v2';
  const e=kit.edit(input.event,{amount:'number'});if(e)tools.call('records.save',{changes:[{kind:'update_record',recordId:e.recordId,expectedVersion:e.version,data:{[e.field]:e.value}}]});
  const r=tools.call('records.read',{typeId:'t'}),more=input.event.action==='nav:more'?tools.call('records.read',{typeId:'u'}):null;
  return {html:kit.page(kit.table({columns:[{key:'amount',label:'Amount',edit:{kind:'number'}}],rows:r.rows}))+(more?(more.pending?'<p>Loading</p>':'<p>'+more.total+'</p>'):''),state:{},notice:e?kit.notice('success','Saved'):undefined};`;
 assert.ok(isV2Source(code));
 const app=engine.load(KIT_SOURCE+'\n'+code),store=createStore();
 store.seed([{name:'records.read',input:{typeId:'t'},result:{rows:[{id:'r1',version:3,data:{amount:5}}],total:1,limit:25,offset:0}}]);
 const local=createLocalApp({app,version:'v2',store,input:{saved:true,writable:true,appRole:'editor',context:null}});
 try{
  const saved=local.run({},{kind:'change',action:'edit:r1:amount:3',value:'7',form:{}});
  assert.equal(saved.kind,'painted');
  assert.deepEqual((saved as any).saves,[{kind:'update_record',recordId:'r1',expectedVersion:3,data:{amount:7}}]);
  assert.match((saved as any).output.html,/value="7"/,'the new value shows at once');
  assert.deepEqual((saved as any).output.notice,{kind:'success',message:'Saved'});
  store.restore((saved as any).rollback);assert.equal(store.get('records.read',{typeId:'t'}).result.rows[0].data.amount,5,'a failed save rolls back');
  const pending=local.run({},{kind:'click',action:'nav:more',value:null,form:{}});
  assert.equal(pending.kind,'painted');assert.match((pending as any).output.html,/Loading/);assert.deepEqual((pending as any).misses,[{name:'records.read',input:{typeId:'u'}}]);
  store.seed([{name:'records.read',input:{typeId:'u'},result:{rows:[],total:4,limit:25,offset:0}}]);
  assert.match((local.run({},{kind:'click',action:'nav:more',value:null,form:{}}) as any).output.html,/<p>4<\/p>/);
  // A save outside a person's own click, change or submit is not optimistic: it goes to the server.
  assert.equal(local.run({},{kind:'refresh',action:'edit:r1:amount:3',value:'9',form:{}}).kind,'server');
 }finally{app.dispose();}
});

// P5: after a save the frame applies the saved rows (new versions) and knows which stored reads to fetch again.
test('the store applies saved rows and lists the stored reads of changed tables',()=>{
 const store=createStore();
 store.seed([{name:'records.read',input:{typeId:'t1',limit:25},result:{rows:[{id:'a',version:1,data:{name:'A',amount:1}},{id:'b',version:1,data:{name:'B',amount:2}}],total:2}},
  {name:'records.readMany',input:{reads:[{typeId:'t2'},{typeId:'t1',limit:5}]},result:{results:[{rows:[{id:'x',version:3,data:{n:1}}],total:1},{rows:[{id:'a',version:1,data:{name:'A'}}],total:1}]}},
  {name:'records.summarize',input:{typeId:'t3'},result:{totals:{count:1}}},{name:'documents.list',input:{},result:{documents:[]}}]);
 store.apply([{id:'a',typeId:'t1',version:2,data:{name:'A',amount:9,hidden:'x'}}]);
 const first=store.get('records.read',{typeId:'t1',limit:25}).result.rows;
 assert.deepEqual(first[0],{id:'a',version:2,data:{name:'A',amount:9}});assert.deepEqual(first[1],{id:'b',version:1,data:{name:'B',amount:2}});
 assert.deepEqual(store.get('records.readMany',{reads:[{typeId:'t2'},{typeId:'t1',limit:5}]}).result.results[1].rows[0],{id:'a',version:2,data:{name:'A'}});
 const stale=store.readsOf(['t1']);assert.deepEqual(stale.map(r=>r.name),['records.read','records.readMany']);assert.deepEqual(store.readsOf([]),[]);
 store.drop(stale.slice(1));assert.equal(store.get('records.readMany',{reads:[{typeId:'t2'},{typeId:'t1',limit:5}]}),null);assert.ok(store.get('records.summarize',{typeId:'t3'}));
});

