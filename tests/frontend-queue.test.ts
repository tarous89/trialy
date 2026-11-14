import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FrontendQueue} from '../src/workspace/frontend-queue.js';
import {createRequestMetrics,withRequestMetrics} from '../src/db/metrics.js';

test('published capacity is bounded, same app serializes, users rotate and release is idempotent',async()=>{
 const queue=new FrontendQueue(2),order:string[]=[];
 const first=await queue.acquire('a','a:app'),second=await queue.acquire('a','a:other');
 const a1=queue.acquire('a','a:app').then(release=>{order.push('a1');return release;});
 const a2=queue.acquire('a','a:other').then(release=>{order.push('a2');return release;});
 const b=queue.acquire('b','b:app').then(release=>{order.push('b');return release;});
 const c=queue.acquire('c','c:app').then(release=>{order.push('c');return release;});
 first();const releaseB=await b;assert.deepEqual(order,['b']);
 first();await Promise.resolve();assert.deepEqual(order,['b']);
 releaseB();const releaseC=await c;assert.deepEqual(order,['b','c']);
 releaseC();const releaseA1=await a1;assert.deepEqual(order,['b','c','a1']);
 releaseA1();await Promise.resolve();assert.deepEqual(order,['b','c','a1']); // a:other is still occupied
 second();(await a2)();assert.deepEqual(order,['b','c','a1','a2']);
 (await queue.acquire('c','c:app'))();
});

test('queue limits and deadlines return busy without running work; draft capacity is independent',async()=>{
 const queue=new FrontendQueue(1,2,1,30),drafts=new FrontendQueue(1),metrics=createRequestMetrics();
 await withRequestMetrics(metrics,async()=>{
  const release=await queue.acquire('a','one');
  const expired=assert.rejects(queue.acquire('b','two'),(e:any)=>e.status===429&&e.code==='runtime_busy');
  await assert.rejects(queue.acquire('b','three'),(e:any)=>e.code==='runtime_busy');
  const expired2=assert.rejects(queue.acquire('c','four'),(e:any)=>e.code==='runtime_busy');
  await assert.rejects(queue.acquire('d','five'),(e:any)=>e.code==='runtime_busy');
  (await drafts.acquire('a','draft'))();
  await Promise.all([expired,expired2]);release();
  (await queue.acquire('b','two'))();
 });
 assert.equal(metrics.runtimeQueued,2);assert.equal(metrics.runtimeBusy,4);assert.ok(metrics.runtimeQueueMs>=30);
});

test('cancelled waiters are removed immediately and never consume a later slot',async()=>{
 const queue=new FrontendQueue(1,1,1),release=await queue.acquire('a','one'),controller=new AbortController();
 const cancelled=assert.rejects(queue.acquire('b','two',controller.signal),{name:'AbortError'});
 controller.abort();await cancelled;
 const next=queue.acquire('c','three');release();(await next)();
 await assert.rejects(queue.acquire('b','two',controller.signal),{name:'AbortError'});
 (await queue.acquire('b','two'))();
});
