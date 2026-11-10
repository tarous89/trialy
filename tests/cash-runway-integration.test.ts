import test from 'node:test';
import assert from 'node:assert/strict';
import {cashFixture} from './fixtures/cash-runway.js';
import {prepareToolLayout} from '../src/workspace/tool-layout.js';
import {readCustomLayout} from '../src/shared/custom-layout.js';
import {syncTemplateCatalog,installCatalogApp} from '../src/workspace/template-catalog.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {randomUUID} from 'node:crypto';
test('installed Runway uses the real manifest, reviewed writes and versioned native layout',async()=>{
 const x=await cashFixture();const {f,s,w,actor,component,map}=x;
 try{
  const run=(state:any={},event:any={kind:'open'})=>f.runFrontend(actor,w.id,{componentId:component.id,expectedVersion:component.version,state,event});
  const lines=async()=>(await s.records(actor,w.id,map.lines.typeId,{limit:100,offset:0})).rows;
  // 1,000 opening at Sep 2026, 100/month rent: closing cash stays ≥ 0 for 10 months.
  const initial=await run();assert.equal(initial.connected,true);assert.match(initial.html,/Cash lasts until Jul 2027/);assert.match(initial.html,/10 months/);
  const add=await run({section:'plan'},{kind:'click',action:'add:lines'});
  const proposal=await run(add.state,{kind:'submit',action:'save-record',form:{name:'Assay',direction:'spend',category:'Research',program_id:x.program,driver:'one_off',amount:'250',currency:'EUR',start_month:'2026-11',status:'committed'}});
  assert.ok(proposal.proposal,proposal.state?.notice);assert.equal((await lines()).length,1);
  await f.confirm(actor,w.id,proposal.proposal.id,proposal.proposal.digest);
  const rows=await lines();assert.equal(rows.length,2);const record=rows.find((r:any)=>r.data.name==='Assay')!;
  assert.equal(record.data.start_month,'2026-11-01');assert.equal(record.data.program_id,x.program);
  assert.match((await run()).html,/Cash lasts until Apr 2027/);
  const archive=await run({section:'plan',confirm:{kind:'archive',role:'lines',id:record.id,version:record.version}},{kind:'click',action:'confirm-archive'});assert.ok(archive.proposal);
  await f.confirm(actor,w.id,archive.proposal.id,archive.proposal.digest);assert.equal((await lines()).find((r:any)=>r.id===record.id)?.data.archived,true);
  const profile=readCustomLayout(component.source)!.profile;profile.tabs.reverse();profile.cols.lines.reverse();profile.heading='Board runway';
  const request={componentId:component.id,expectedVersion:component.version,name:profile.heading,description:'',customLayout:profile};
  const preview=await prepareToolLayout(f,actor,w.id,request);
  assert.equal((await f.readComponent(actor,w.id,component.id)).component.source,component.source);
  await f.confirm(actor,w.id,preview.id,preview.digest);
  const saved=(await f.readComponent(actor,w.id,component.id)).component;
  assert.deepEqual(readCustomLayout(saved.source)!.profile,profile);assert.deepEqual(saved.bindings,component.bindings);assert.deepEqual(saved.manifest,component.manifest);
  const opened=await f.runFrontend(actor,w.id,{componentId:saved.id,expectedVersion:saved.version,state:{layout:{tabs:['overview'],cols:{},visible:{},heading:'Stale'}}});assert.match(opened.html,/Board runway/);
  await assert.rejects(prepareToolLayout(f,actor,w.id,request),/changed/);
  await assert.rejects(prepareToolLayout(f,{userId:randomUUID(),origin:'human'},w.id,{...request,expectedVersion:saved.version}));
  const ignored=await prepareToolLayout(f,actor,w.id,{...request,expectedVersion:saved.version,customLayout:{...profile,heading:'Ignored'}});await f.discard(actor,w.id,ignored.id);assert.equal((await f.readComponent(actor,w.id,saved.id)).component.name,'Board runway');
  const rent=(await lines()).find((r:any)=>r.data.name==='Rent')!;
  const edit=await f.runFrontend(actor,w.id,{componentId:saved.id,expectedVersion:saved.version,event:{kind:'click',action:'edit:lines:'+rent.id}});
  await x.save({kind:'update_record',recordId:rent.id,expectedVersion:rent.version,data:{name:'Concurrent edit'}});
  await assert.rejects(f.runFrontend(actor,w.id,{componentId:saved.id,expectedVersion:saved.version,state:edit.state,event:{kind:'submit',action:'save-record',form:{name:'Stale edit'}}}),/changed|version/i);
 }finally{await x.pg.close();}
});
test('the 2.0.0 installer schema creates thirteen empty tables and an app that opens with no automation',async()=>{
 const x=await cashFixture();
 try{
  await syncTemplateCatalog(x.db);const row=(await x.db.query("SELECT status,install_schema FROM app_template_catalog WHERE template_id='life.cash-runway' AND version='2.0.0'")).rows[0];
  assert.equal(row.status,'draft');assert.equal(Object.keys(row.install_schema).length,13);
  assert.equal((await x.db.query("SELECT status FROM app_template_catalog WHERE template_id='life.cash-runway' AND version='1.2.2'")).rows[0].status,'approved');
  await x.db.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.cash-runway' AND version='2.0.0'");// test database only
  const t=await new AppTemplates(undefined,x.db).read({templateId:'life.cash-runway',version:'2.0.0'});
  const w=await x.s.createWorkspace(x.actor,'Install'),before=(await x.db.query('SELECT count(*)::int n FROM entity_types WHERE workspace_id=$1',[w.id])).rows[0].n;
  const app=await installCatalogApp(x.f,x.actor,w.id,{templateId:t.id,version:t.version,digest:t.digest,name:'Runway',requestKey:randomUUID()});
  assert.equal((await x.db.query('SELECT count(*)::int n FROM entity_types WHERE workspace_id=$1',[w.id])).rows[0].n-before,13);
  assert.equal((await x.db.query('SELECT count(*)::int n FROM records WHERE workspace_id=$1',[w.id])).rows[0].n,0);
  const c=(await x.f.readComponent(x.actor,w.id,app.appId)).component;
  const out=await x.f.runFrontend(x.actor,w.id,{componentId:c.id,expectedVersion:c.version,event:{kind:'open'}});
  assert.match(out.html,/Set up your first runway/);assert.doesNotMatch(out.html,/not bound|could not be calculated/);
  const settings=await x.f.runFrontend(x.actor,w.id,{componentId:c.id,expectedVersion:c.version,state:{section:'settings'},event:{kind:'click',action:'edit-settings'}});
  const p=await x.f.runFrontend(x.actor,w.id,{componentId:c.id,expectedVersion:c.version,state:settings.state,event:{kind:'submit',action:'save-record',form:{reporting_currency:'EUR',opening_balance:'5000',opening_date:'2026-10-31',runway_target_months:'18',trailing_window_months:'3'}}});
  assert.ok(p.proposal,p.state?.notice);await x.f.confirm(x.actor,w.id,p.proposal.id,p.proposal.digest);
  assert.match((await x.f.runFrontend(x.actor,w.id,{componentId:c.id,expectedVersion:c.version,event:{kind:'open'}})).html,/Cash lasts beyond Oct 2031/);
 }finally{await x.pg.close();}
});
