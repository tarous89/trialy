import {settle,tookEffect} from './settle.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {croFixture} from './fixtures/cro.js';import {prepareToolLayout} from '../src/workspace/tool-layout.js';import {readCustomLayout} from '../src/shared/custom-layout.js';
test('CRO uses real scalar schema, reviewed CRUD, stale edit/archive rejection and persistent native layout',async()=>{
 const x=await croFixture(),{f,s,actor,w,map}=x;let component=x.component;
 const run=(state:any={},event:any={kind:'open'})=>f.runFrontend(actor,w.id,{componentId:component.id,expectedVersion:component.version,state,event});
 try{
  assert.equal((await run()).connected,true);
  const add=await run({view:'work'},{kind:'click',action:'create:tasks'});
  const proposal=await run(add.state,{kind:'submit',action:'record-save',form:{name:'New deliverable',projectId:x.projectId,due:'2026-12-01',status:'Planned'}});assert.ok(tookEffect(proposal));
  const list=()=>s.records(actor,w.id,map.tasks.typeId,{limit:100,offset:0});assert.equal((await list()).rows.length,2,'D16 (4.4): saved directly');
  await settle(f,actor,w.id,proposal);const record=(await list()).rows.find((r:any)=>r.data.name==='New deliverable')!;assert.equal(record.data.project_id,x.projectId);
  const edit=await run({}, {kind:'click',action:'edit:tasks:'+record.id});const del=await run({}, {kind:'click',action:'delete:tasks:'+record.id});await x.save({kind:'update_record',recordId:record.id,expectedVersion:record.version,data:{name:'Concurrent'}});
  await assert.rejects(run(edit.state,{kind:'submit',action:'record-save',form:{name:'Stale'}}),/changed|version/i);
  // D17 (4.4): the concurrent edit changed another field, so the delete (archived flag) still saves; put the record back for the rest of the scenario.
  const removed=await run(del.state,{kind:'click',action:'delete-confirm'});assert.ok(tookEffect(removed));if(removed.proposal)await settle(f,actor,w.id,removed);
  {const r=(await s.records(actor,w.id,map.tasks.typeId,{state:'all',limit:100,offset:0})).rows.find((v:any)=>v.id===record.id)!;if(r.data.archived)await x.save({kind:'update_record',recordId:r.id,expectedVersion:r.version,data:{archived:false}});}
  const duplicate=await run({}, {kind:'click',action:'duplicate:tasks:'+record.id});const dup=await run(duplicate.state,{kind:'submit',action:'record-save',form:{name:'Duplicate'}});assert.ok(tookEffect(dup));await settle(f,actor,w.id,dup);assert.equal((await list()).rows.length,3);
  const freshDel=await run({}, {kind:'click',action:'delete:tasks:'+record.id});const archive=await run(freshDel.state,{kind:'click',action:'delete-confirm'});assert.ok(tookEffect(archive));await settle(f,actor,w.id,archive);assert.equal((await list()).rows.find((r:any)=>r.id===record.id)?.data.archived,true);
  const parent=await run({}, {kind:'click',action:'delete:projects:'+x.projectId});const blocked=await run(parent.state,{kind:'click',action:'delete-confirm'});assert.ok(!blocked.proposal);assert.match(blocked.html,/still has linked records/);
  const profile=readCustomLayout(component.source)!.profile;profile.tabs.reverse();profile.cols.tasks.reverse();
  const args={componentId:component.id,expectedVersion:component.version,name:component.name,description:'',customLayout:profile};
  const preview=await prepareToolLayout(f,actor,w.id,args);assert.equal((await f.readComponent(actor,w.id,component.id)).component.source,component.source);
  await f.confirm(actor,w.id,preview.id,preview.digest);component=(await f.readComponent(actor,w.id,component.id)).component;assert.deepEqual(readCustomLayout(component.source)!.profile,profile);assert.deepEqual(component.manifest,x.component.manifest);
  await assert.rejects(prepareToolLayout(f,actor,w.id,args),/changed/);
  const ignored=await prepareToolLayout(f,actor,w.id,{...args,expectedVersion:component.version,customLayout:{...profile,heading:'Ignored'}});await f.discard(actor,w.id,ignored.id);assert.equal((await f.readComponent(actor,w.id,component.id)).component.source,component.source);
 }finally{await x.pg.close();}
});
