import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execute,LIMITS} from '../src/foundation/runtime.js';
import {cancellableReads} from '../src/db/cancellable-reads.js';
import type {Database} from '../src/db/database.js';
import {FrontendQueue} from '../src/workspace/frontend-queue.js';
import {createRequestMetrics,withRequestMetrics} from '../src/db/metrics.js';

const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(r=>{resolve=r;});return {promise,resolve};};
for(const name of ['records.read','actions.run','connectors.call'])test(`cancel during ${name} waits for the host call and never starts the next step`,async()=>{
 const controller=new AbortController(),entered=deferred(),finish=deferred(),queue=new FrontendQueue(1),release=await queue.acquire('a','app');
 let calls=0,receipts=0,settled=false,admitted=false;
 const execution=execute(`tools.call('${name}');tools.call('next');return 'done';`,{},async()=>{calls++;entered.resolve();await finish.promise;receipts++;return {receipt:'durable'};},controller.signal).finally(()=>{settled=true;release();});
 const rejected=assert.rejects(execution,/cancelled/);await entered.promise;
 controller.abort();const next=queue.acquire('b','other').then(release=>{admitted=true;release();});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);assert.equal(admitted,false);assert.equal(receipts,0);
 finish.resolve();await Promise.all([rejected,next]);assert.equal(receipts,1);assert.equal(calls,1);assert.equal(admitted,true);
});

test('sandbox deadline stops computation but cannot release an unfinished host call',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const entered=deferred(),finish=deferred();let completed=false,settled=false;
 const execution=execute("tools.call('connectors.call');return 'done';",{},async()=>{entered.resolve();await finish.promise;completed=true;return {};}).finally(()=>{settled=true;});
 const rejected=assert.rejects(execution,/execution_timeout/);await entered.promise;t.mock.timers.tick(LIMITS.wallMs);
 await Promise.resolve();assert.equal(settled,false);finish.resolve();await rejected;assert.equal(completed,true);
});

for(const reason of ['deadline','abort'])for(const fails of [false,true])test(`${reason}: stuck host call frees admission after grace, then ${fails?'fails safely':'finishes its receipt'} in background`,async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const controller=new AbortController(),entered=deferred(),finish=deferred(),hostDone=deferred(),queue=new FrontendQueue(1),release=await queue.acquire('a','app'),metrics=createRequestMetrics();
 let calls=0,receipts=0,settled=false;
 const execution=withRequestMetrics(metrics,()=>execute("tools.call('actions.run');tools.call('next');return 'done';",{},async()=>{
  calls++;entered.resolve();await finish.promise;if(fails)throw Error('host failed');receipts++;return {receipt:'durable'};
 },controller.signal,work=>{release.detachUntil(work);void work.then(hostDone.resolve);})).finally(()=>{settled=true;release();});
 const rejected=assert.rejects(execution,reason==='deadline'?/execution_timeout/:/cancelled/);await entered.promise;
 if(reason==='deadline')t.mock.timers.tick(LIMITS.wallMs);else controller.abort();
 t.mock.timers.tick(LIMITS.hostGraceMs-1);await Promise.resolve();assert.equal(settled,false);
 t.mock.timers.tick(1);await rejected;assert.equal(settled,true);assert.equal(receipts,0);assert.equal(metrics.runtimeDetached,1);
 // Another app runs even though the first host call is still unresolved.
 (await queue.acquire('b','other'))();let sameStarted=false;
 const same=queue.acquire('a','app').then(release=>{sameStarted=true;return release;});await Promise.resolve();assert.equal(sameStarted,false);
 finish.resolve();await hostDone.promise;(await same)();assert.equal(calls,1);assert.equal(receipts,fails?0:1);
});

test('Home read adapter completes the current query and prevents subsequent queries',async()=>{
 const entered=deferred(),finish=deferred(),controller=new AbortController();let queries=0,finished=false;
 const db:Database={query:async()=>{queries++;entered.resolve();await finish.promise;finished=true;return {rows:[],rowCount:0};},transaction:async fn=>fn(db),close:async()=>{}};
 const reads=cancellableReads(db,controller.signal),work=assert.rejects(reads.query('SELECT 1'),{name:'AbortError'});
 await entered.promise;controller.abort();assert.equal(finished,false);finish.resolve();await work;
 await assert.rejects(reads.query('SELECT 2'),{name:'AbortError'});assert.equal(queries,1);assert.equal(finished,true);
});
