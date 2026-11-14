import {test} from 'node:test';
import assert from 'node:assert/strict';
import {retryFrontendBusy} from '../src/shared/frontend-retry.js';
const busy=Object.assign(new Error('busy'),{code:'runtime_busy',status:429});
test('navigation busy retry is bounded with backoff and retains the exact request',async()=>{
 for(const event of [{kind:'open'},{kind:'click',action:'tab:companies'},{kind:'change',action:'filter:status',value:'active'}]){
  let calls=0;const waits:number[]=[];const request={event,state:{tab:2},viewId:'same'};
  assert.equal(await retryFrontendBusy(request,async()=>{if(++calls<3)throw busy;return 'ready';},()=>true,async ms=>{waits.push(ms);}), 'ready');
  assert.equal(calls,3);assert.ok(waits[0]>=250&&waits[0]<350);assert.ok(waits[1]>=750&&waits[1]<850);
 }
 let calls=0;await assert.rejects(retryFrontendBusy({event:{kind:'open'}},async()=>{calls++;throw busy;},()=>true,async()=>{}));assert.equal(calls,3);
});
test('saves, actions, other failures and abandoned views never retry',async()=>{
 for(const event of [{kind:'submit',action:'search'},{kind:'click',action:'save-layout'},{kind:'click',action:'verify'},{kind:'change',action:'bound:field'},{kind:'click',action:'tab:1',form:{draft:'keep'}}]){
  let calls=0;await assert.rejects(retryFrontendBusy({event},async()=>{calls++;throw busy;}));assert.equal(calls,1);
 }
 for(const code of ['execution_timeout','temporary','access_changed','not_found']){
  let calls=0;await assert.rejects(retryFrontendBusy({event:{kind:'open'}},async()=>{calls++;throw Object.assign(Error(code),{code});}));assert.equal(calls,1);
 }
 let calls=0,current=true;await assert.rejects(retryFrontendBusy({event:{kind:'open'}},async()=>{calls++;throw busy;},()=>current,async()=>{current=false;}));assert.equal(calls,1);
});
