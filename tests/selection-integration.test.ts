import test from 'node:test';import assert from 'node:assert/strict';
import {selectionFixture} from './fixtures/selection.js';import {prepareToolLayout} from '../src/workspace/tool-layout.js';import {readCustomLayout} from '../src/shared/custom-layout.js';
test('CRO Selection creates/reopens and performs reviewed CRUD with actual schemas and native layout',async()=>{
 const x=await selectionFixture(),{f,s,actor,w,map}=x;let component=x.component;
 const run=(state:any={},event:any={kind:'open'})=>f.runFrontend(actor,w.id,{componentId:component.id,expectedVersion:component.version,state,event});
 const click=(action:string)=>({kind:'click',action}),submit=(form:any)=>({kind:'submit',action:'save-record',form});
 try{
  assert.doesNotMatch((await run()).html,/bindings are absent/);
  const add=await run({},click('add:vendors'));const proposal=await run(add.state,submit({name:'New CRO'}));assert.ok(proposal.proposal,proposal.html);
  const list=()=>s.records(actor,w.id,map.vendors.typeId,{limit:100,offset:0});const before=(await list()).rows.length;
  await f.confirm(actor,w.id,proposal.proposal.id,proposal.proposal.digest);const r=(await list()).rows.find((r:any)=>r.data.name==='New CRO')!;assert.equal((await list()).rows.length,before+1);
  const edit=await run({},click('edit:vendors:'+r.id));const del=await run({},click('archive:vendors:'+r.id));await x.save({kind:'update_record',recordId:r.id,expectedVersion:r.version,data:{name:'Concurrent CRO'}});
  const stale=await run(edit.state,submit({name:'Stale'}));assert.ok(!stale.proposal);assert.match(stale.html,/version changed/);
  const staleArchive=await run(del.state,click('confirm-archive'));assert.ok(!staleArchive.proposal);assert.match(staleArchive.html,/version changed/);
  const dup=await run({},click('duplicate:vendors:'+r.id));const duplicate=await run(dup.state,submit({name:'Duplicated CRO'}));assert.ok(duplicate.proposal);await f.confirm(actor,w.id,duplicate.proposal.id,duplicate.proposal.digest);
  const del2=await run({},click('archive:vendors:'+r.id));const archive=await run(del2.state,click('confirm-archive'));assert.ok(archive.proposal);await f.confirm(actor,w.id,archive.proposal.id,archive.proposal.digest);assert.equal((await list()).rows.find((row:any)=>row.id===r.id)?.data.archived,true);
  const linked=await run({},click('archive:vendors:'+x.ids.ven001));assert.ok(!(await run(linked.state,click('confirm-archive'))).proposal);
  const decision=await run({selectionId:x.ids.sel001},click('edit:decisions:'+x.ids.dec001));const approval=await run(decision.state,submit({status:'Approved',approver:'Sponsor owner',approvedAt:'2026-11-01'}));assert.ok(approval.proposal,approval.html);await f.confirm(actor,w.id,approval.proposal.id,approval.proposal.digest);
  const profile=readCustomLayout(component.source)!.profile;profile.tabs.reverse();profile.cols.vendors.reverse();profile.heading='Our CRO selection';
  const args={componentId:component.id,expectedVersion:component.version,name:component.name,description:'',customLayout:profile};const preview=await prepareToolLayout(f,actor,w.id,args);await f.confirm(actor,w.id,preview.id,preview.digest);component=(await f.readComponent(actor,w.id,component.id)).component;
  assert.deepEqual(readCustomLayout(component.source)!.profile,profile);assert.deepEqual(component.manifest,x.component.manifest);assert.match((await run()).html,/Our CRO selection/);await assert.rejects(prepareToolLayout(f,actor,w.id,args),/changed/);
  const ignored=await prepareToolLayout(f,actor,w.id,{...args,expectedVersion:component.version,customLayout:{...profile,heading:'Ignored'}});await f.discard(actor,w.id,ignored.id);assert.equal((await f.readComponent(actor,w.id,component.id)).component.source,component.source);
 }finally{await x.pg.close();}
});
