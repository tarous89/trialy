import test from 'node:test';import assert from 'node:assert/strict';
import {notebookFixture} from './fixtures/notebook.js';import {prepareToolLayout} from '../src/workspace/tool-layout.js';import {readCustomLayout} from '../src/shared/custom-layout.js';
test('Notebook actual schemas, catalog preparation, reviewed CRUD, versions and layout persistence',async()=>{
 const x=await notebookFixture();let component=x.component;const {f,s,actor,w,map}=x;
 const run=(state:any={},event:any={kind:'open'})=>f.runFrontend(actor,w.id,{componentId:component.id,expectedVersion:component.version,state,event});const click=(action:string)=>({kind:'click',action}),submit=(form:any)=>({kind:'submit',action:'save',form});
 try{
  assert.doesNotMatch((await run()).html,/Some authorized notebook data is unavailable/);
  const add=await run({},click('new:projects'));const proposal=await run(add.state,submit({name:'New research project'}));assert.ok(proposal.proposal,proposal.html);
  await f.confirm(actor,w.id,proposal.proposal.id,proposal.proposal.digest);
  const list=()=>s.records(actor,w.id,map.projects.typeId,{limit:100,offset:0});const r=(await list()).rows.find((r:any)=>r.data.name==='New research project')!;
  const edit=await run({},click('edit:projects:'+r.id)),del=await run({},click('delete:projects:'+r.id));await x.save({kind:'update_record',recordId:r.id,expectedVersion:r.version,data:{name:'Concurrent'}});
  const stale=await run(edit.state,submit({name:'Stale'}));assert.ok(!stale.proposal);assert.match(stale.html,/version changed/);assert.equal((stale.state as any).editor.draft.name,'Stale');
  assert.ok(!(await run(del.state,click('confirm-delete'))).proposal);
  const duplicate=await run((await run({},click('copy:projects:'+r.id))).state,submit({name:'Copied project'}));assert.ok(duplicate.proposal);await f.confirm(actor,w.id,duplicate.proposal.id,duplicate.proposal.digest);
  const archive=await run((await run({},click('delete:projects:'+r.id))).state,click('confirm-delete'));assert.ok(archive.proposal);await f.confirm(actor,w.id,archive.proposal.id,archive.proposal.digest);assert.equal((await list()).rows.find((row:any)=>row.id===r.id)?.data.archived,true);
  const profile=readCustomLayout(component.source)!.profile;profile.tabs.reverse();profile.cols.projects.reverse();profile.heading='Our notebook';const args={componentId:component.id,expectedVersion:component.version,name:component.name,description:'',customLayout:profile};
  const preview=await prepareToolLayout(f,actor,w.id,args);await f.confirm(actor,w.id,preview.id,preview.digest);component=(await f.readComponent(actor,w.id,component.id)).component;assert.deepEqual(readCustomLayout(component.source)!.profile,profile);assert.match((await run()).html,/Our notebook/);assert.deepEqual(component.manifest,x.component.manifest);await assert.rejects(prepareToolLayout(f,actor,w.id,args),/changed/);
 }finally{await x.pg.close();}
});
