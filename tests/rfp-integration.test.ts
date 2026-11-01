import test from 'node:test';import assert from 'node:assert/strict';
import {rfpFixture} from './fixtures/rfp.js';import {prepareToolLayout} from '../src/workspace/tool-layout.js';import {readCustomLayout} from '../src/shared/custom-layout.js';
test('RFP template uses real mappings, reviewed saves, duplicate/archive protection and native layout persistence',async()=>{
 const x=await rfpFixture(),{f,s,actor,w,map}=x;let component=x.component;
 const run=(state:any={},event:any={kind:'open'})=>f.runFrontend(actor,w.id,{componentId:component.id,expectedVersion:component.version,state,event});
 try{
  const initial=await run();assert.equal(initial.connected,true);assert.doesNotMatch(initial.html,/Some authorized data/);
  const add=await run({screen:'intake'},{kind:'click',action:'add:bids'});
  const proposal=await run(add.state,{kind:'submit',action:'save-record',form:{name:'New sponsor bid',sponsor:'Test sponsor',due:'2026-12-12',valueEstimate:'100',currency:'USD',status:'New',decision:'Undecided'}});assert.ok(proposal.proposal,proposal.html);
  const list=()=>s.records(actor,w.id,map.bids.typeId,{limit:100,offset:0});assert.equal((await list()).rows.length,3);
  await f.confirm(actor,w.id,proposal.proposal.id,proposal.proposal.digest);const record=(await list()).rows.find((r:any)=>r.data.name==='New sponsor bid')!;assert.equal(record.data.value_estimate,100);assert.equal(record.data.currency,'USD');
  const edit=await run({}, {kind:'click',action:'edit:bids:'+record.id});const del=await run({}, {kind:'click',action:'del:bids:'+record.id});await x.save({kind:'update_record',recordId:record.id,expectedVersion:record.version,data:{name:'Concurrent'}});
  const stale=await run(edit.state,{kind:'submit',action:'save-record',form:{name:'Stale'}});assert.ok(!stale.proposal);assert.match(stale.html,/Record changed/);
  const staleArchive=await run(del.state,{kind:'click',action:'archive'});assert.ok(!staleArchive.proposal);assert.match(staleArchive.html,/Record changed/);
  const duplicate=await run({}, {kind:'click',action:'dup:bids:'+record.id});const dup=await run(duplicate.state,{kind:'submit',action:'save-record',form:{name:'Duplicate'}});assert.ok(dup.proposal);await f.confirm(actor,w.id,dup.proposal.id,dup.proposal.digest);assert.equal((await list()).rows.find((r:any)=>r.data.name==='Duplicate')?.data.status,'New');
  const freshDel=await run({}, {kind:'click',action:'del:bids:'+record.id});const archive=await run(freshDel.state,{kind:'click',action:'archive'});assert.ok(archive.proposal);await f.confirm(actor,w.id,archive.proposal.id,archive.proposal.digest);assert.equal((await list()).rows.find((r:any)=>r.id===record.id)?.data.archived,true);
  const parent=await run({}, {kind:'click',action:'del:bids:'+x.ids['demo-bids-001']});const blocked=await run(parent.state,{kind:'click',action:'archive'});assert.ok(!blocked.proposal);assert.match(blocked.html,/dependent/);
  const openReuse=await run({bidId:x.ids['demo-bids-001']},{kind:'click',action:'reuse:'+x.ids['demo-library-001']});
  const select=await run(openReuse.state,{kind:'change',action:'reuse-question',value:x.questionId});
  const reuse=await run(select.state,{kind:'submit',action:'reuse-save',form:{questionId:x.questionId}});assert.ok(reuse.proposal,reuse.html);await f.confirm(actor,w.id,reuse.proposal.id,reuse.proposal.digest);
  const q=(await s.records(actor,w.id,map.questions.typeId,{limit:100,offset:0})).rows.find((r:any)=>r.id===x.questionId)!;assert.equal(q.data.status,'Drafted');assert.equal(q.data.approved_on,null);assert.equal(q.data.library_id,x.ids['demo-library-001']);
  const profile=readCustomLayout(component.source)!.profile;profile.tabs.reverse();profile.cols.bids.reverse();profile.heading='Our bid workspace';
  const args={componentId:component.id,expectedVersion:component.version,name:component.name,description:'',customLayout:profile};const preview=await prepareToolLayout(f,actor,w.id,args);assert.equal((await f.readComponent(actor,w.id,component.id)).component.source,component.source);
  await f.confirm(actor,w.id,preview.id,preview.digest);component=(await f.readComponent(actor,w.id,component.id)).component;assert.deepEqual(readCustomLayout(component.source)!.profile,profile);assert.deepEqual(component.manifest,x.component.manifest);
  assert.match((await run({layout:{heading:'Stale'}})).html,/Our bid workspace/);await assert.rejects(prepareToolLayout(f,actor,w.id,args),/changed/);
  const ignored=await prepareToolLayout(f,actor,w.id,{...args,expectedVersion:component.version,customLayout:{...profile,heading:'Ignored'}});await f.discard(actor,w.id,ignored.id);assert.equal((await f.readComponent(actor,w.id,component.id)).component.source,component.source);
 }finally{await x.pg.close();}
});
