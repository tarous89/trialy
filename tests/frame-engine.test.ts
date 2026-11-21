import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import variant from '@jitl/quickjs-wasmfile-release-sync';
import {newQuickJSWASMModuleFromVariant,newVariant} from 'quickjs-emscripten-core';
import {execute} from '../src/foundation/runtime.js';
import {appTemplates} from '../src/workspace/app-templates.js';
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
const APPS:{id:string;directory:string}[]=[
 {id:'life.cash-runway',directory:'cash-runway'},{id:'life.contracts',directory:'contracts'},{id:'life.cro-selection',directory:'cro-selection'},
 {id:'life.data-room',directory:'data-room'},{id:'life.investor-crm',directory:'investor-crm'},{id:'life.investor-updates',directory:'investor-updates'},
 {id:'life.partnership-tracker',directory:'partnership-tracker'},{id:'life.project-oversight',directory:'project-oversight'},
 {id:'life.deal-radar',directory:'radars/deal-radar'},{id:'life.funding-radar',directory:'radars/funding-radar'},{id:'life.literature-radar',directory:'radars/literature-radar'},
 {id:'life.market-radar',directory:'radars/market-radar'},{id:'life.patent-radar',directory:'radars/patent-radar'},{id:'life.pipeline-radar',directory:'radars/pipeline-radar'},
 {id:'life.regulatory-radar',directory:'radars/regulatory-radar'},{id:'life.trial-radar',directory:'radars/trial-radar'},
];
const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8'));
const availability=JSON.parse(await readFile('templates/catalog-availability.json','utf8')).apps;

test('the frame reads exactly what read_app_data serves, and seeds only reads',()=>{
 for(const name of READ_CAPABILITIES)assert.ok(FILLABLE_READS.has(name),name);
 for(const name of [...documentCapabilities,...appExchangeReads,'files.list'])assert.ok(FILLABLE_READS.has(name),name);
 assert.equal(FILLABLE_READS.size,READ_CAPABILITIES.size+documentCapabilities.length+appExchangeReads.length+1);
 for(const name of SEEDED_READS)assert.ok(!/propose|save|run|invoke|call|send|create|update|delete/.test(name.split('.')[1]),name);
});

test('every switched-on catalog app is in this test, and the switch names only versions this test covers',()=>{
 const on=Object.entries(availability).filter(([,v]:any)=>v.platform&&v.chatgpt&&v.claude).map(([k])=>k).sort();
 assert.deepEqual(APPS.map(a=>a.id).sort(),on);
 for(const [id,versions] of Object.entries(browserSwitches().compat))for(const version of versions)assert.equal(version,seed[id]?.version,`${id} ${version} is the version tested here`);
});

/** Platform answers for the demo records, shaped as the platform answers them (filters, search and sort before paging). */
function fixture(demo:any){
 const rows=demo.records,X=demo.exchange,documents=demo.documents??[];
 const one=(input:any)=>{
  let selected=rows.filter((r:any)=>r.role===input.typeId&&Object.entries(input.filters??{}).every(([k,x])=>String(r.data[k])===x)&&(!input.q||Object.values(r.data).some(x=>String(x).toLowerCase().includes(String(input.q).toLowerCase()))));
  if(input.sort){const f=input.sort.field,d=input.sort.direction==='desc'?-1:1;selected=selected.slice().sort((a:any,b:any)=>{const x=a.data[f],y=b.data[f];if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return (typeof x==='number'?x-y:String(x).localeCompare(String(y)))*d;});}
  const limit=input.limit??25,offset=input.offset??0;
  return {rows:selected.slice(offset,offset+limit).map(({id,version,data}:any)=>({id,version,data})),total:selected.length,limit,offset};
 };
 return (name:string,input:any):any=>{
  if(name==='records.read')return one(input);
  if(name==='records.readMany')return {results:input.reads.map(one)};
  if(name==='integrations.list')return {integrations:[]};
  if(name==='roles.list')return {roles:[]};
  if(name==='documents.list')return {documents,total:documents.length,complete:true};
  if(name==='files.list')return {files:[]};
  if(name==='exchange.list'&&X)return {groups:X.groups.filter((g:any)=>(!input.groupId||g.id===input.groupId)&&(!input.appRef||g.appRef===input.appRef)),nextOffset:null};
  if(name==='exchange.status'&&X){for(const g of X.groups)for(const e of g.exchanges)if(e.id===input.exchangeId)return {exchangeId:e.id,recordId:e.recordId,status:e.status};throw new Error('Exchange not found');}
  if(name==='exchange.listSubmissions'&&X)return {submissions:X.submissions.filter((s:any)=>s.groupId===input.groupId||s.exchangeId===input.exchangeId),nextOffset:null};
  if(name==='exchange.listMessages'&&X)return {messages:X.messages.filter((m:any)=>!input.groupId||m.groupId===input.groupId).slice().reverse(),nextOffset:null};
  if(name==='exchange.listEmails'&&X)return {emails:X.emails.filter((m:any)=>m.groupId===input.groupId),nextOffset:null};
  if(name==='exchange.defaultEmail'&&X)return {emailType:input.emailType,subject:'Platform subject',body:'Platform body {link}',source:'app'};
  if(name==='exchange.notifications'&&X)return {notifications:[]};
  if(name.startsWith('exchange.'))return X?{items:[],nextOffset:null}:(()=>{throw new Error('Capability unavailable');})();
  throw new Error('Capability unavailable');
 };
}

for(const app of APPS)test(`${app.id}: every screen renders identically in the frame and on the server, from seeded reads`,async()=>{
 const root=`templates/source/${app.directory}`,schema=JSON.parse(await readFile(`${root}/schema.example.json`,'utf8'));
 const demo=JSON.parse(await readFile(`${root}/demo_data.json`,'utf8'));
 const entry=await appTemplates.read({templateId:app.id,version:seed[app.id].version});
 const roles=Object.entries(schema) as [string,{logicalFields:Record<string,string>;readOnly?:boolean}][];
 const bindings=roles.map(([role,s])=>({typeId:role,fields:Object.values(s.logicalFields)}));
 const tableMap=Object.fromEntries(roles.map(([role,s])=>[role,{typeId:role,fields:s.logicalFields,writableFields:s.readOnly?[]:Object.keys(s.logicalFields)}]));
 const configuration={...entry.defaults,tableMap:JSON.stringify(tableMap),asOfOverride:demo.asOf??'2026-11-13'};
 const source=`const templateConfiguration=${JSON.stringify(configuration)};\nconst templateBindings=${JSON.stringify(bindings)};\n${entry.source}`;
 assert.equal(isV2Source(source),false);assert.equal(effectiveSource(source),source);
 const layout=/^const templateLayoutSchema=(.+);$/m.exec(String(entry.source));
 const screens:string[]=layout?JSON.parse(layout[1]).screens.map((s:any)=>s.id):['settings'];
 const answer=fixture(demo),base={saved:true,writable:true};
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
