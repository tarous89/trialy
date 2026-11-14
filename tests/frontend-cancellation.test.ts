import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppActions} from '../src/app-services/service.js';
import {Connectors} from '../src/connectors/service.js';
import {createRequestMetrics,withRequestMetrics} from '../src/db/metrics.js';
import {LIMITS} from '../src/foundation/runtime.js';
const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(r=>{resolve=r;});return {promise,resolve};};

test('frontend cancellation preserves real action and connector receipts after grace without replay',{timeout:30000},async t=>{
 const previous=process.env.SIMPLE_APPS_ENABLED;process.env.SIMPLE_APPS_ENABLED='true';
 t.after(()=>{if(previous===undefined)delete process.env.SIMPLE_APPS_ENABLED;else process.env.SIMPLE_APPS_ENABLED=previous;});
 const pg=new PGlite();t.after(()=>pg.close());for(const name of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+name,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const actor={userId:randomUUID(),origin:'human' as const};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'fixture@example.invalid','Fixture']);
 const s=new Service(db),f=new WorkspaceFoundation(db),w=await s.createWorkspace(actor,'Cancellation fixture');await s.setAi(actor,w.id,true);
 const source="tools.call(input.event.action,JSON.parse(input.event.form.args));tools.call('actions.list',{});return {html:'done'};";
 const draft=await f.preview(actor,w.id,{kind:'save_component',content:{name:'Cancellation app',format:'frontend-js',sourceAccess:'bindings',source,bindings:[]}}),app=await f.confirm(actor,w.id,draft.id,draft.digest);
 const connector=new Connectors(db,(tx,a,w,id)=>f.component(tx,a,w,id),{transport:async()=>{throw Error('No provider should be called');}});
 const connectorReview=await connector.prepare(actor,w.id,{config:{name:'Synthetic connector',baseUrl:'https://example.invalid',auth:{kind:'none'},operations:[{id:'lookup',name:'Lookup',method:'GET',path:'/',effect:'read',aiEnabled:true,response:{fields:['value']},users:[actor.userId],apps:[app.id]}]}}),connection=await connector.confirmConfig(actor,w.id,connectorReview.reviewId,connectorReview.digest);
 const run=async(action:string,args:any,entered:ReturnType<typeof deferred>,finish:ReturnType<typeof deferred>,hostDone:ReturnType<typeof deferred>)=>{
  const controller=new AbortController(),metrics=createRequestMetrics();let settled=false;
  const execution=withRequestMetrics(metrics,()=>f.runFrontend(actor,w.id,{componentId:app.id,expectedVersion:0,event:{kind:'click',action,form:{args:JSON.stringify(args)}}},controller.signal)).finally(()=>{settled=true;});
  const rejected=assert.rejects(execution,/cancelled/);await entered.promise;
  // Advance only the post-abort grace; let the actual database receipt finish
  // after the request has already settled. No provider is contacted.
  t.mock.timers.enable({apis:['setTimeout']});controller.abort();assert.equal(settled,false);
  t.mock.timers.tick(LIMITS.hostGraceMs);await rejected;assert.equal(settled,true);assert.equal(metrics.runtimeDetached,1);t.mock.timers.reset();
  finish.resolve();await hostDone.promise;assert.equal(metrics.capabilityCalls,1);
 };
 await t.test('started action persists its status and idempotency receipt',async t=>{
  const actions=new AppActions(db),draft=await actions.prepare(actor,w.id,{config:{name:'Synthetic action',appId:app.id,appVersion:0,trigger:{kind:'manual'},steps:[{id:'lookup',kind:'connector',connectionId:connection.id,connectionVersion:0,operation:'lookup'}],expiresAt:new Date(Date.now()+86400000).toISOString()}}),action=await actions.confirm(actor,w.id,draft.id,draft.digest);
  const entered=deferred(),finish=deferred(),hostDone=deferred(),original=AppActions.prototype.runNow;let calls=0,receipt:any;
  t.mock.method(AppActions.prototype,'runNow',async function(this:AppActions,...args:Parameters<AppActions['runNow']>){calls++;entered.resolve();await finish.promise;try{receipt=await original.apply(this,args);return receipt;}finally{hostDone.resolve();}});
  const key=randomUUID();await run('actions.run',{actionId:action.id,requestKey:key},entered,finish,hostDone);
  assert.equal(calls,1);assert.ok(receipt.id);assert.equal((await actions.status(actor,w.id,receipt.id)).id,receipt.id);
  assert.equal((await original.call(actions,actor,w.id,action.id,key)).id,receipt.id);
 });
 await t.test('started connector enqueue persists one durable job receipt',async t=>{
  const entered=deferred(),finish=deferred(),hostDone=deferred();let calls=0;
  const original=Connectors.prototype.call;t.mock.method(Connectors.prototype,'call',async function(...args:Parameters<Connectors['call']>){calls++;entered.resolve();await finish.promise;try{return await original.apply(connector,args);}finally{hostDone.resolve();}});
  const key=randomUUID();await run('connectors.call',{connectionId:connection.id,operation:'lookup',requestKey:key},entered,finish,hostDone);
  const receipts=(await db.query('SELECT * FROM app_service_jobs WHERE request_key=$1',['connector:'+connection.id+':'+key])).rows;
  assert.equal(calls,1);assert.equal(receipts.length,1);assert.equal(receipts[0].status,'queued');
  const replay:any=await original.call(connector,actor,w.id,{connectionId:connection.id,appId:app.id,appVersion:0,operation:'lookup',requestKey:key},true);assert.equal(replay.id,receipts[0].id);assert.equal(replay.replayed,true);
 });
 const cancelled=new AbortController();cancelled.abort();const metrics=createRequestMetrics();await assert.rejects(withRequestMetrics(metrics,()=>f.runFrontend(actor,w.id,{componentId:app.id},cancelled.signal)),{name:'AbortError'});assert.equal(metrics.sandboxRuns,0);
});
