import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execute,LIMITS} from '../src/foundation/runtime.js';
import {cancellableReads} from '../src/db/cancellable-reads.js';
import type {Database} from '../src/db/database.js';
import {FrontendQueue} from '../src/workspace/frontend-queue.js';

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

test('Home read adapter completes the current query and prevents subsequent queries',async()=>{
 const entered=deferred(),finish=deferred(),controller=new AbortController();let queries=0,finished=false;
 const db:Database={query:async()=>{queries++;entered.resolve();await finish.promise;finished=true;return {rows:[],rowCount:0};},transaction:async fn=>fn(db),close:async()=>{}};
 const reads=cancellableReads(db,controller.signal),work=assert.rejects(reads.query('SELECT 1'),{name:'AbortError'});
 await entered.promise;controller.abort();assert.equal(finished,false);finish.resolve();await work;
 await assert.rejects(reads.query('SELECT 2'),{name:'AbortError'});assert.equal(queries,1);assert.equal(finished,true);
});
