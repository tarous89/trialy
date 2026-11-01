import test from 'node:test';
import assert from 'node:assert/strict';
import {cashFixture} from './fixtures/cash-runway.js';
import {prepareToolLayout} from '../src/workspace/tool-layout.js';
import {readCustomLayout} from '../src/shared/custom-layout.js';
import {randomUUID} from 'node:crypto';
test('installed cash app uses real manifest, reviewed writes and versioned native layout',async()=>{
 const x=await cashFixture();const {f,s,w,actor,component,map}=x;
 try{
  const run=(state:any={},event:any={kind:'open'})=>f.runFrontend(actor,w.id,{componentId:component.id,expectedVersion:component.version,state,event});
  const initial=await run();assert.equal(initial.connected,true);assert.match(initial.html,/EUR 950/);
  const add=await run({section:'ledger'},{kind:'click',action:'add:ledger'});
  const proposal=await run(add.state,{kind:'submit',action:'save-record',form:{name:'New budget',kind:'budget_out',period:'2026-11-01',amount:'120',currency:'EUR'}});
  assert.ok(proposal.proposal);assert.equal((await s.records(actor,w.id,map.ledger.typeId,{limit:100,offset:0})).rows.length,3);
  await f.confirm(actor,w.id,proposal.proposal.id,proposal.proposal.digest);
  const rows=(await s.records(actor,w.id,map.ledger.typeId,{limit:100,offset:0})).rows;assert.equal(rows.length,4);
  const record=rows.find((r:any)=>r.data.name==='New budget')!;
  const deletion=await run({confirm:{role:'ledger',id:record.id}},{kind:'click',action:'confirm-delete'});assert.ok(deletion.proposal);
  await f.confirm(actor,w.id,deletion.proposal.id,deletion.proposal.digest);assert.equal((await s.records(actor,w.id,map.ledger.typeId,{limit:100,offset:0})).rows.find((r:any)=>r.id===record.id)?.data.archived,true);
  const profile=readCustomLayout(component.source)!.profile;profile.tabs.reverse();profile.cols.ledger.reverse();profile.heading='Board cash';
  const request={componentId:component.id,expectedVersion:component.version,name:profile.heading,description:'',customLayout:profile};
  const preview=await prepareToolLayout(f,actor,w.id,request);
  assert.equal((await f.readComponent(actor,w.id,component.id)).component.source,component.source);
  await f.confirm(actor,w.id,preview.id,preview.digest);
  const saved=(await f.readComponent(actor,w.id,component.id)).component;
  assert.deepEqual(readCustomLayout(saved.source)!.profile,profile);assert.deepEqual(saved.bindings,component.bindings);assert.deepEqual(saved.manifest,component.manifest);
  const opened=await f.runFrontend(actor,w.id,{componentId:saved.id,expectedVersion:saved.version,state:{layout:{tabs:['overview'],cols:{},visible:{},heading:'Stale'}}});assert.match(opened.html,/Board cash/);
  await assert.rejects(prepareToolLayout(f,actor,w.id,request),/changed/);
  await assert.rejects(prepareToolLayout(f,{userId:randomUUID(),origin:'human'},w.id,{...request,expectedVersion:saved.version}));
  const ignored=await prepareToolLayout(f,actor,w.id,{...request,expectedVersion:saved.version,customLayout:{...profile,heading:'Ignored'}});await f.discard(actor,w.id,ignored.id);assert.equal((await f.readComponent(actor,w.id,saved.id)).component.name,'Board cash');
  const edit=await f.runFrontend(actor,w.id,{componentId:saved.id,expectedVersion:saved.version,event:{kind:'click',action:'edit:ledger:'+rows[0].id}});
  await x.save({kind:'update_record',recordId:rows[0].id,expectedVersion:rows[0].version,data:{name:'Concurrent edit'}});
  await assert.rejects(f.runFrontend(actor,w.id,{componentId:saved.id,expectedVersion:saved.version,state:edit.state,event:{kind:'submit',action:'save-record',form:{name:'Stale edit'}}}),/changed|version/i);
 }finally{await x.pg.close();}
});
