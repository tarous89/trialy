import test from 'node:test';import assert from 'node:assert/strict';
import {resourceFixture} from './fixtures/resource.js';import {prepareToolLayout} from '../src/workspace/tool-layout.js';import {readCustomLayout} from '../src/shared/custom-layout.js';
test('resource template uses real mappings, reviewed saves, duplicate/archive protection and native layout persistence',async()=>{
 const x=await resourceFixture(),{f,s,actor,w,map}=x;let component=x.component;
 const run=(state:any={},event:any={kind:'open'})=>f.runFrontend(actor,w.id,{componentId:component.id,expectedVersion:component.version,state,event});
 try{
  const initial=await run();assert.equal(initial.connected,true);assert.doesNotMatch(initial.html,/summaries are withheld/);
  const add=await run({screen:'schedule'},{kind:'click',action:'new:bookings'});
  const proposal=await run(add.state,{kind:'submit',action:'save-record',form:{name:'New booking',personId:x.personId,projectId:x.projectId,week:'2026-11-09',hours:'10',status:'Confirmed'}});assert.ok(proposal.proposal);
  const list=()=>s.records(actor,w.id,map.bookings.typeId,{limit:100,offset:0});assert.equal((await list()).rows.length,1);
  await f.confirm(actor,w.id,proposal.proposal.id,proposal.proposal.digest);const record=(await list()).rows.find((r:any)=>r.data.name==='New booking')!;assert.equal(record.data.person_id,x.personId);assert.equal(record.data.week,'2026-11-09');
  const edit=await run({}, {kind:'click',action:'edit:bookings:'+record.id});const del=await run({}, {kind:'click',action:'archive:bookings:'+record.id});await x.save({kind:'update_record',recordId:record.id,expectedVersion:record.version,data:{name:'Concurrent'}});
  const stale=await run(edit.state,{kind:'submit',action:'save-record',form:{name:'Stale'}});assert.ok(!stale.proposal);assert.match(stale.html,/Record changed/);
  const staleArchive=await run(del.state,{kind:'click',action:'confirm-archive'});assert.ok(!staleArchive.proposal);assert.match(staleArchive.html,/Record changed/);
  const duplicate=await run({}, {kind:'click',action:'duplicate:bookings:'+record.id});const dup=await run(duplicate.state,{kind:'submit',action:'save-record',form:{name:'Duplicate'}});assert.ok(dup.proposal);await f.confirm(actor,w.id,dup.proposal.id,dup.proposal.digest);assert.equal((await list()).rows.find((r:any)=>r.data.name==='Duplicate (copy)')?.data.status,'Tentative');
  const freshDel=await run({}, {kind:'click',action:'archive:bookings:'+record.id});const archive=await run(freshDel.state,{kind:'click',action:'confirm-archive'});assert.ok(archive.proposal);await f.confirm(actor,w.id,archive.proposal.id,archive.proposal.digest);assert.equal((await list()).rows.find((r:any)=>r.id===record.id)?.data.archived,true);
  const parent=await run({}, {kind:'click',action:'archive:projects:'+x.projectId});const blocked=await run(parent.state,{kind:'click',action:'confirm-archive'});assert.ok(!blocked.proposal);assert.match(blocked.html,/linked records/);
  const profile=readCustomLayout(component.source)!.profile;profile.tabs.reverse();profile.cols.people.reverse();profile.heading='Our resourcing';
  const args={componentId:component.id,expectedVersion:component.version,name:component.name,description:'',customLayout:profile};const preview=await prepareToolLayout(f,actor,w.id,args);assert.equal((await f.readComponent(actor,w.id,component.id)).component.source,component.source);
  await f.confirm(actor,w.id,preview.id,preview.digest);component=(await f.readComponent(actor,w.id,component.id)).component;assert.deepEqual(readCustomLayout(component.source)!.profile,profile);assert.deepEqual(component.manifest,x.component.manifest);
  assert.match((await run({layout:{heading:'Stale'}})).html,/Our resourcing/);await assert.rejects(prepareToolLayout(f,actor,w.id,args),/changed/);
  const ignored=await prepareToolLayout(f,actor,w.id,{...args,expectedVersion:component.version,customLayout:{...profile,heading:'Ignored'}});await f.discard(actor,w.id,ignored.id);assert.equal((await f.readComponent(actor,w.id,component.id)).component.source,component.source);
 }finally{await x.pg.close();}
});
