import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accountReads} from '../src/web/account-reads.js';
const gate=()=>{let release!:(value:string)=>void;const promise=new Promise<string>(r=>release=r);return {promise,release};};
for(const oldFirst of [false,true])test(`post-write account read supersedes a pending read (old settles first: ${oldFirst})`,async()=>{
 const reads=accountReads(),old=gate(),fresh=gate();let visible='',applied=0;
 const work=(g:ReturnType<typeof gate>)=>async(current:()=>boolean)=>{const value=await g.promise;if(current()){visible=value;applied++;}};
 const pending=reads.run(work(old));assert.equal(reads.run(()=>{throw Error('must coalesce');}),pending);
 const updated=reads.run(work(fresh),true);assert.notEqual(updated,pending);
 if(oldFirst){old.release('old workspace list');await pending;assert.equal(visible,'');assert.equal(reads.run(()=>{throw Error('must join fresh');}),updated);}
 fresh.release('new workspace included');await updated;
 if(!oldFirst){old.release('old workspace list');await pending;}
 assert.equal(visible,'new workspace included');assert.equal(applied,1);
 await reads.run(async current=>{assert.equal(current(),true);visible='later read';});assert.equal(visible,'later read');
});
test('a failed fresh account read can retry without accepting a stale success or failure',async()=>{
 const reads=accountReads(),old=gate();let currentOld=true;
 const pending=reads.run(async current=>{await old.promise;currentOld=current();});
 await assert.rejects(reads.run(async()=>{throw Error('offline');},true),/offline/);
 old.release('stale');await pending;assert.equal(currentOld,false);
 await reads.run(async current=>assert.equal(current(),true));
});
