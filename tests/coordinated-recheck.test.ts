import {test} from 'node:test';
import assert from 'node:assert/strict';
import {coordinatedRecheck} from '../src/shared/coordinated-recheck.js';
function timer(){let now=0,id=0;const jobs=new Map<number,{at:number;fn:()=>void}>();return {clock:{now:()=>now,set:(fn:()=>void,ms:number)=>{jobs.set(++id,{at:now+ms,fn});return id;},clear:(key:number)=>{jobs.delete(key);}},tick(ms:number){const until=now+ms;for(;;){const next=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>until)break;now=next[1].at;jobs.delete(next[0]);next[1].fn();}now=until;},jobs};}
const settle=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
test('return event bursts share one pending read, with no completed-result cache',async()=>{
 const t=timer(),reasons:string[]=[];let finish!:()=>void;
 const scheduler=coordinatedRecheck(async reason=>{reasons.push(reason);await new Promise<void>(r=>finish=r);},t.clock);
 scheduler.request('return');scheduler.request('return');scheduler.request('interval');t.tick(99);await settle();assert.deepEqual(reasons,[]);
 t.tick(1);await settle();assert.deepEqual(reasons,['return']);
 scheduler.request('return');scheduler.request('interval');t.tick(30000);await settle();assert.equal(reasons.length,1,'no overlapping read');
 finish();await settle();scheduler.request('return');t.tick(100);await settle();assert.equal(reasons.length,2,'a later return performs a fresh read');finish();await settle();scheduler.dispose();
});
test('automatic checks have a minimum interval; disposal cancels queued and running checks',async()=>{
 const t=timer();let calls=0,signal:AbortSignal|undefined;
 const s=coordinatedRecheck((_reason,current)=>{calls++;signal=current;},t.clock);
 s.request('interval');t.tick(0);await settle();assert.equal(calls,1);
 s.request('return');t.tick(999);await settle();assert.equal(calls,1);t.tick(1);await settle();assert.equal(calls,2);
 s.request('return');s.dispose();t.tick(1000);await settle();assert.equal(calls,2);assert.equal(t.jobs.size,0);
 const running=coordinatedRecheck((_reason,current)=>{signal=current;return new Promise(()=>{});},t.clock);
 running.request('return');t.tick(100);await settle();assert.equal(signal?.aborted,false);running.dispose();assert.equal(signal?.aborted,true);
});
test('a failed check can be retried and a disposed scheduled microtask cannot start',async()=>{
 const t=timer();let calls=0;const s=coordinatedRecheck(async()=>{calls++;throw Error('Network failure');},t.clock);
 s.request('interval');t.tick(0);await settle();s.request('return');t.tick(1000);await settle();assert.equal(calls,2);
 const cancelled=coordinatedRecheck(()=>{calls++;},t.clock);cancelled.request('interval');t.tick(0);cancelled.dispose();await settle();assert.equal(calls,2);s.dispose();
});
test('a return during a running interval is queued once, including when that check fails',async()=>{
 const t=timer(),reasons:string[]=[];let reject!:(e:Error)=>void;
 const s=coordinatedRecheck(reason=>{reasons.push(reason);if(reasons.length===1)return new Promise<void>((_,r)=>reject=r);},t.clock);
 s.request('interval');t.tick(0);await settle();s.request('return');s.request('return');s.request('interval');
 t.tick(2000);await settle();assert.deepEqual(reasons,['interval']);reject(Error('temporary'));await settle();
 t.tick(99);await settle();assert.equal(reasons.length,1);t.tick(1);await settle();assert.deepEqual(reasons,['interval','return']);
 t.tick(5000);await settle();assert.equal(reasons.length,2);s.dispose();
});
test('disposing a running check discards its queued return',async()=>{
 const t=timer();let finish!:()=>void,calls=0;const s=coordinatedRecheck(()=>{calls++;return new Promise<void>(r=>finish=r);},t.clock);
 s.request('interval');t.tick(0);await settle();s.request('return');s.dispose();finish();await settle();t.tick(5000);await settle();assert.equal(calls,1);assert.equal(t.jobs.size,0);
});
