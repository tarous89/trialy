import test from 'node:test';import assert from 'node:assert/strict';
import {hiringFixture} from './fixtures/hiring.js';import {prepareToolLayout} from '../src/workspace/tool-layout.js';import {readCustomLayout} from '../src/shared/custom-layout.js';
test('hiring template saves real scalar schema, reviewed CRUD, stale edit rejection and persistent native layout',async()=>{
 const x=await hiringFixture(),{f,s,actor,w,map}=x;let component=x.component;
 const run=(state:any={},event:any={kind:'open'})=>f.runFrontend(actor,w.id,{componentId:component.id,expectedVersion:component.version,state,event});
 try{
  assert.equal((await run()).connected,true);
  const add=await run({screen:'requests'},{kind:'click',action:'new|requests'});
  const proposal=await run(add.state,{kind:'submit',action:'save-record',form:{name:'Hire one',targetStart:'2026-12',fte:'1',status:'Pending'}});assert.ok(proposal.proposal);
  const list=()=>s.records(actor,w.id,map.requests.typeId,{limit:100,offset:0});assert.equal((await list()).rows.length,1);
  await f.confirm(actor,w.id,proposal.proposal.id,proposal.proposal.digest);const rows=(await list()).rows;assert.equal(rows.length,2);
  const record=rows.find((r:any)=>r.data.name==='Hire one')!;assert.equal(record.data.target_start,'2026-12');
  const edit=await run({}, {kind:'click',action:'edit|requests|'+record.id});await x.save({kind:'update_record',recordId:record.id,expectedVersion:record.version,data:{name:'Concurrent'}});
  await assert.rejects(run(edit.state,{kind:'submit',action:'save-record',form:{name:'Stale'}}),/changed|version/i);
  const duplicate=await run({}, {kind:'click',action:'duplicate|requests|'+record.id});const dup=await run(duplicate.state,{kind:'submit',action:'save-record',form:{name:'Duplicate',status:'Approved'}});assert.ok(dup.proposal);await f.confirm(actor,w.id,dup.proposal.id,dup.proposal.digest);assert.equal((await list()).rows.find((r:any)=>r.data.name==='Duplicate (copy)')?.data.status,'Draft');
  const del=await run({}, {kind:'click',action:'delete|requests|'+record.id});const archive=await run(del.state,{kind:'click',action:'confirm-delete'});assert.ok(archive.proposal);await f.confirm(actor,w.id,archive.proposal.id,archive.proposal.digest);assert.equal((await list()).rows.find((r:any)=>r.id===record.id)?.data.archived,true);
  const profile=readCustomLayout(component.source)!.profile;profile.tabs.reverse();profile.cols.staff.reverse();
  const args={componentId:component.id,expectedVersion:component.version,name:component.name,description:'',customLayout:profile};
  const preview=await prepareToolLayout(f,actor,w.id,args);assert.equal((await f.readComponent(actor,w.id,component.id)).component.source,component.source);
  await f.confirm(actor,w.id,preview.id,preview.digest);component=(await f.readComponent(actor,w.id,component.id)).component;assert.deepEqual(readCustomLayout(component.source)!.profile,profile);assert.deepEqual(component.manifest,x.component.manifest);
  await assert.rejects(prepareToolLayout(f,actor,w.id,args),/changed/);
  const before=component.source;const ignored=await prepareToolLayout(f,actor,w.id,{...args,expectedVersion:component.version,customLayout:{...profile,heading:'Ignored'}});await f.discard(actor,w.id,ignored.id);assert.equal((await f.readComponent(actor,w.id,component.id)).component.source,before);
 }finally{await x.pg.close();}
});
