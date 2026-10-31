import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FrontendReads} from '../src/shared/frontend-reads.js';
test('navigation shares only an identical pending read in the same app instance',async()=>{
 const reads=new FrontendReads();let calls=0,release!:(v:any)=>void;const call=()=>{calls++;return new Promise(resolve=>{release=resolve;});};
 const request={componentId:'one',expectedVersion:1,viewId:'view',state:{tab:0},event:{kind:'click',action:'tab:1'}};
 const first=reads.run(request,call,true),click=reads.run({...request,event:{...request.event,value:'',form:{}}},call,true);assert.equal(calls,1);assert.equal(first,click);release({html:'Ready'});await first;
 const again=reads.run(request,call,true);assert.equal(calls,2);release({html:'Fresh'});await again;
 const other=new FrontendReads(),finished=async()=>{calls++;return {};};
 await Promise.all([reads.run(request,finished,true),other.run(request,finished,true),reads.run({...request,viewId:'another'},finished,true),reads.run({...request,state:{tab:2}},finished,true)]);assert.equal(calls,6);
 await Promise.all([reads.run({...request,event:{kind:'click',action:'save-layout'}},finished,true),reads.run({...request,event:{kind:'click',action:'save-layout'}},finished,true),reads.run(request,finished,false),reads.run(request,finished,false)]);assert.equal(calls,10);
 const fail=()=>Promise.reject(Error('temporary'));await assert.rejects(reads.run(request,fail,true));await reads.run(request,finished,true);assert.equal(calls,11);
});
