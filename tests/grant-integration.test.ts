import test from 'node:test';import assert from 'node:assert/strict';
import {grantFixture} from './fixtures/grant.js';import {prepareToolLayout} from '../src/workspace/tool-layout.js';import {readCustomLayout} from '../src/shared/custom-layout.js';
test('Grant actual schemas, catalog preparation, reviewed CRUD, versions and layout persistence',async()=>{
 const x=await grantFixture();let component=x.component;const {f,s,actor,w,map}=x;
 const run=(state:any={},event:any={kind:'open'})=>f.runFrontend(actor,w.id,{componentId:component.id,expectedVersion:component.version,state,event});const click=(action:string)=>({kind:'click',action}),submit=(form:any)=>({kind:'submit',action:'submit',form});
 try{
  assert.doesNotMatch((await run()).html,/Incomplete authorized data/);
  const add=await run({},click('add:opportunities'));const proposal=await run(add.state,submit({title:'New grant',funder:'Funder',status:'Watchlist',currency:'EUR'}));assert.ok(proposal.proposal,proposal.html);
  await f.confirm(actor,w.id,proposal.proposal.id,proposal.proposal.digest);
  const list=()=>s.records(actor,w.id,map.opportunities.typeId,{limit:100,offset:0});const r=(await list()).rows.find((r:any)=>r.data.title==='New grant')!;
  const edit=await run({},click('edit:opportunities:'+r.id)),del=await run({},click('archive:opportunities:'+r.id));await x.save({kind:'update_record',recordId:r.id,expectedVersion:r.version,data:{title:'Concurrent'}});
  const stale=await run(edit.state,submit({title:'Stale'}));assert.ok(!stale.proposal);assert.match(stale.html,/version changed/);assert.equal((stale.state as any).draft.title,'Stale');
  assert.ok(!(await run(del.state,click('confirm-archive'))).proposal);
  const duplicate=await run((await run({},click('duplicate:opportunities:'+r.id))).state,submit({title:'Copied grant',funder:'Funder'}));assert.ok(duplicate.proposal);await f.confirm(actor,w.id,duplicate.proposal.id,duplicate.proposal.digest);
  const archive=await run((await run({},click('archive:opportunities:'+r.id))).state,click('confirm-archive'));assert.ok(archive.proposal);await f.confirm(actor,w.id,archive.proposal.id,archive.proposal.digest);assert.equal((await list()).rows.find((row:any)=>row.id===r.id)?.data.archived,true);
  const appCopy=await run((await run({},click('duplicate:applications:'+x.ids.app004))).state,submit({project:'Copied application'}));assert.ok(appCopy.proposal,appCopy.html);await f.confirm(actor,w.id,appCopy.proposal.id,appCopy.proposal.digest);
  const copied=(await s.records(actor,w.id,map.applications.typeId,{limit:100,offset:0})).rows.find((row:any)=>row.data.project==='Copied application')!;assert.equal(copied.data.stage,'Researching');assert.equal(copied.data.eligibility_decision,'Pending');assert.equal(copied.data.awarded_amount,null);assert.equal(copied.data.award_date,null);
  const profile=readCustomLayout(component.source)!.profile;profile.tabs.reverse();profile.cols.opportunities.reverse();profile.heading='Our grant pipeline';const args={componentId:component.id,expectedVersion:component.version,name:component.name,description:'',customLayout:profile};
  const preview=await prepareToolLayout(f,actor,w.id,args);await f.confirm(actor,w.id,preview.id,preview.digest);component=(await f.readComponent(actor,w.id,component.id)).component;assert.deepEqual(readCustomLayout(component.source)!.profile,profile);assert.match((await run({screen:'pulse'})).html,/Our grant pipeline/);assert.deepEqual(component.manifest,x.component.manifest);await assert.rejects(prepareToolLayout(f,actor,w.id,args),/changed/);
 }finally{await x.pg.close();}
});
