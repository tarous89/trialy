import test from 'node:test';import assert from 'node:assert/strict';import {inventoryFixture} from './fixtures/inventory.js';import {prepareToolLayout} from '../src/workspace/tool-layout.js';import {readCustomLayout} from '../src/shared/custom-layout.js';
test('Inventory real catalog/DB: atomic stock race, replay, failure rollback, layout',async()=>{
 const x=await inventoryFixture();let component=x.component;const {f,s,actor,w,map}=x;
 const run=(state:any={},event:any={kind:'open'})=>f.runFrontend(actor,w.id,{componentId:component.id,expectedVersion:component.version,state,event});
 const submit=(form:any)=>({kind:'submit',action:'save-movement',form});
 try{
  assert.doesNotMatch((await run()).html,/movement integrity|withheld/);
  const lot=(await s.records(actor,w.id,map.lots.typeId,{limit:100,offset:0})).rows[0];
  const item=(await s.records(actor,w.id,map.items.typeId,{limit:100,offset:0})).rows.find((r:any)=>r.id===lot.data.item_id)!;
  const loc=lot.data.location_id;const base={name:'Atomic receipt',date:'2026-11-01',item_id:item.id,lot_id:lot.id,kind:'Receipt',quantity:'10',unit:item.data.unit,to_location_id:loc};
  const a=await run({},submit(base)),b=await run({},submit({...base,name:'Concurrent receipt'}));assert.ok(a.proposal,a.html);assert.ok(b.proposal,b.html);
  const saved=await f.confirm(actor,w.id,a.proposal.id,a.proposal.digest);assert.deepEqual(await f.confirm(actor,w.id,a.proposal.id,a.proposal.digest),saved);
  await assert.rejects(f.confirm(actor,w.id,b.proposal.id,b.proposal.digest),/changed/);
  const after=(await s.records(actor,w.id,map.lots.typeId,{limit:100,offset:0})).rows.find((r:any)=>r.id===lot.id)!;assert.equal(after.data.stock_revision,1);assert.equal(after.version,lot.version+1);
  let moves=(await s.records(actor,w.id,map.movements.typeId,{limit:100,offset:0})).rows;assert.equal(moves.filter((r:any)=>r.data.name===base.name).length,1);assert.equal(moves.filter((r:any)=>r.data.name==='Concurrent receipt').length,0);
  // Two distinct withdrawals against the same current lot: only one may commit.
  const use={...base,name:'Withdrawal A',kind:'Use',quantity:'8',from_location_id:loc,to_location_id:''};
  const u=await run({},submit(use)),v=await run({},submit({...use,name:'Withdrawal B'}));assert.ok(u.proposal,u.html);assert.ok(v.proposal,v.html);
  await f.confirm(actor,w.id,u.proposal.id,u.proposal.digest);await assert.rejects(f.confirm(actor,w.id,v.proposal.id,v.proposal.digest),/changed/);
  assert.doesNotMatch((await run()).html,/movement integrity|withheld/);
  const duplicate=await run({},submit(use));assert.ok(!duplicate.proposal);assert.match(duplicate.html,/already exists|Not enough/);
  // Invalid second operation cannot leave a counter-only write behind.
  const current=(await s.records(actor,w.id,map.lots.typeId,{limit:100,offset:0})).rows.find((r:any)=>r.id===lot.id)!;
  await assert.rejects(async()=>{const p=await f.preview(actor,w.id,{kind:'apply_component_records',componentId:component.id,expectedVersion:component.version,changes:[{kind:'update_record',recordId:lot.id,expectedVersion:current.version,data:{stock_revision:999}},{kind:'create_record',typeId:map.movements.typeId,data:{name:'Invalid only'}}]});await f.confirm(actor,w.id,p.id,p.digest);});
  assert.equal((await s.records(actor,w.id,map.lots.typeId,{limit:100,offset:0})).rows.find((r:any)=>r.id===lot.id)!.data.stock_revision,2);
  const profile=readCustomLayout(component.source)!.profile;profile.tabs.reverse();profile.cols.items.reverse();const args={componentId:component.id,expectedVersion:component.version,name:component.name,description:'',customLayout:profile};
  const preview=await prepareToolLayout(f,actor,w.id,args);await f.confirm(actor,w.id,preview.id,preview.digest);component=(await f.readComponent(actor,w.id,component.id)).component;assert.deepEqual(readCustomLayout(component.source)!.profile,profile);assert.deepEqual(component.manifest,x.component.manifest);await assert.rejects(prepareToolLayout(f,actor,w.id,args),/changed/);
 }finally{await x.pg.close();}
});
