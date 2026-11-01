import test from 'node:test';import assert from 'node:assert/strict';
import {feasibilityFixture} from './fixtures/feasibility.js';import {prepareToolLayout} from '../src/workspace/tool-layout.js';import {readCustomLayout} from '../src/shared/custom-layout.js';
test('Feasibility template uses real mappings, reviewed saves, duplicate/archive protection and native layout persistence',async()=>{
 const x=await feasibilityFixture(),{f,s,actor,w,map}=x;let component=x.component;
 const run=(state:any={},event:any={kind:'open'})=>f.runFrontend(actor,w.id,{componentId:component.id,expectedVersion:component.version,state,event});
 try{
  const initial=await run();assert.equal(initial.connected,true);assert.doesNotMatch(initial.html,/unavailable or exceed/);
  const add=await run({tab:'sites'},{kind:'click',action:'new:sites'});
  const proposal=await run(add.state,{kind:'submit',action:'save',form:{name:'New institution',country:'Germany',status:'Draft'}});assert.ok(proposal.proposal,proposal.html);
  const list=()=>s.records(actor,w.id,map.sites.typeId,{limit:100,offset:0});const count=(await list()).rows.length;
  await f.confirm(actor,w.id,proposal.proposal.id,proposal.proposal.digest);const record=(await list()).rows.find((r:any)=>r.data.name==='New institution')!;assert.equal((await list()).rows.length,count+1);
  const edit=await run({}, {kind:'click',action:'edit:sites:'+record.id});const del=await run({}, {kind:'click',action:'delete:sites:'+record.id});await x.save({kind:'update_record',recordId:record.id,expectedVersion:record.version,data:{name:'Concurrent'}});
  const stale=await run(edit.state,{kind:'submit',action:'save',form:{name:'Stale'}});assert.ok(!stale.proposal);assert.match(stale.html,/version changed/);
  const staleArchive=await run(del.state,{kind:'click',action:'confirm-delete'});assert.ok(!staleArchive.proposal);assert.match(staleArchive.html,/version changed/);
  const duplicate=await run({}, {kind:'click',action:'copy:sites:'+record.id});const dup=await run(duplicate.state,{kind:'submit',action:'save',form:{name:'Duplicate'}});assert.ok(dup.proposal);await f.confirm(actor,w.id,dup.proposal.id,dup.proposal.digest);assert.equal((await list()).rows.find((r:any)=>r.data.name==='Duplicate')?.data.status,'Draft');
  const freshDel=await run({}, {kind:'click',action:'delete:sites:'+record.id});const archive=await run(freshDel.state,{kind:'click',action:'confirm-delete'});assert.ok(archive.proposal);await f.confirm(actor,w.id,archive.proposal.id,archive.proposal.digest);assert.equal((await list()).rows.find((r:any)=>r.id===record.id)?.data.archived,true);
  const parent=await run({}, {kind:'click',action:'delete:sites:'+x.ids['s-berlin']});const blocked=await run(parent.state,{kind:'click',action:'confirm-delete'});assert.ok(!blocked.proposal);assert.match(blocked.html,/linked records/);
  const response=await run({}, {kind:'click',action:'edit:responses:'+x.ids['r-k-101-1']});
  const invalid=await run(response.state,{kind:'submit',action:'save',form:{answer:'Changed',rating:'1'}});assert.ok(!invalid.proposal);assert.match(invalid.html,/fresh review/);
  const reset=await run(response.state,{kind:'submit',action:'save',form:{answer:'Changed',status:'Draft'}});assert.ok(reset.proposal);await f.confirm(actor,w.id,reset.proposal.id,reset.proposal.digest);
  const row=(await s.records(actor,w.id,map.responses.typeId,{limit:100,offset:0})).rows.find((r:any)=>r.id===x.ids['r-k-101-1'])!;assert.equal(row.data.status,'Draft');assert.equal(row.data.reviewer,null);
  const profile=readCustomLayout(component.source)!.profile;profile.tabs.reverse();profile.cols.sites.reverse();profile.heading='Our feasibility workspace';
  const args={componentId:component.id,expectedVersion:component.version,name:component.name,description:'',customLayout:profile};const preview=await prepareToolLayout(f,actor,w.id,args);assert.equal((await f.readComponent(actor,w.id,component.id)).component.source,component.source);
  await f.confirm(actor,w.id,preview.id,preview.digest);component=(await f.readComponent(actor,w.id,component.id)).component;assert.deepEqual(readCustomLayout(component.source)!.profile,profile);assert.deepEqual(component.manifest,x.component.manifest);
  assert.match((await run({layout:{heading:'Stale'}})).html,/Our feasibility workspace/);await assert.rejects(prepareToolLayout(f,actor,w.id,args),/changed/);
  const ignored=await prepareToolLayout(f,actor,w.id,{...args,expectedVersion:component.version,customLayout:{...profile,heading:'Ignored'}});await f.discard(actor,w.id,ignored.id);assert.equal((await f.readComponent(actor,w.id,component.id)).component.source,component.source);
 }finally{await x.pg.close();}
});
