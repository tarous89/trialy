import test from 'node:test';
import assert from 'node:assert/strict';
import {execute,runtimeWaiting} from '../src/foundation/runtime.js';
import {createRequestMetrics,withRequestMetrics,requestMetrics} from '../src/db/metrics.js';
import {withActor,databaseContext} from '../src/db/context.js';
const until=async(check:()=>boolean)=>{const end=Date.now()+15000;while(!check()){if(Date.now()>end)throw Error('timed out');await new Promise(r=>setTimeout(r,20));}};
const none=async()=>null;
test('the next runtime process is prepared ahead of the request, and no state survives between runs',async()=>{
 delete process.env.APP_RUNTIME_WARM;
 assert.deepEqual(runtimeWaiting(),{waiting:0,ready:0});
 const cold=createRequestMetrics();
 assert.equal(await withRequestMetrics(cold,()=>execute('globalThis.leak=41;return 1;',{},none)),1);
 assert.equal(cold.sandboxRuns,1);
 await until(()=>runtimeWaiting().ready===1);assert.deepEqual(runtimeWaiting(),{waiting:1,ready:1});
 const warm=createRequestMetrics();
 // A fresh process and runtime: nothing the previous run left behind is visible.
 assert.deepEqual(await withRequestMetrics(warm,()=>execute('return {leak:typeof globalThis.leak,input,echo:tools.call("echo",{n:2})};',{a:1},async(name,value)=>({name,value}))),{leak:'undefined',input:{a:1},echo:{name:'echo',value:{n:2}}});
 assert.equal(warm.sandboxStartupMs,0);assert.equal(warm.capabilityCalls,1);
 await until(()=>runtimeWaiting().ready===1);
 // The prepared process was started while another caller was active. Its reads still run as this caller.
 const seen:any[]=[];const who=async()=>{seen.push({actor:databaseContext().actor?.userId,metrics:requestMetrics()});return null;};
 const first=createRequestMetrics(),second=createRequestMetrics();
 await withActor({userId:'first',origin:'human'},()=>withRequestMetrics(first,()=>execute('tools.call("who");return 1;',{},who)));
 await until(()=>runtimeWaiting().ready===1);
 await withActor({userId:'second',origin:'human'},()=>withRequestMetrics(second,()=>execute('tools.call("who");return 1;',{},who)));
 assert.deepEqual(seen.map(s=>s.actor),['first','second']);assert.equal(seen[0].metrics,first);assert.equal(seen[1].metrics,second);
 assert.equal(first.capabilityCalls,1);assert.equal(second.capabilityCalls,1);
 await until(()=>runtimeWaiting().ready===1);
 assert.equal(await execute('tools.call("who");return 1;',{},who),1);assert.equal(seen[2].actor,undefined);assert.equal(seen[2].metrics,undefined);
 await until(()=>runtimeWaiting().ready===1);
 // Limits and failures behave as before on a prepared process.
 await assert.rejects(execute('while(true){}',{},none,AbortSignal.timeout(300)),/cancelled/);
 await until(()=>runtimeWaiting().ready===1);
 await assert.rejects(execute('throw new Error("x")',{},none),/execution_failed/);
 await until(()=>runtimeWaiting().ready===1);
 // Two runs at once: one takes the prepared process, the other starts its own.
 assert.deepEqual(await Promise.all([execute('return 1;',{},none),execute('return 2;',{},none)]),[1,2]);
 await until(()=>runtimeWaiting().ready===1);assert.equal(runtimeWaiting().waiting,1);
 // Switched off: nothing waits once the prepared process is used.
 process.env.APP_RUNTIME_WARM='0';
 try{assert.equal(await execute('return 3;',{},none),3);await new Promise(r=>setTimeout(r,200));assert.deepEqual(runtimeWaiting(),{waiting:0,ready:0});}
 finally{delete process.env.APP_RUNTIME_WARM;}
});
