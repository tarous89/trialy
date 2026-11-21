import test from 'node:test';
import assert from 'node:assert/strict';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {isV2Source} from '../src/workspace/browser-runtime.js';
import {contractsSuite} from './fixtures/contracts.js';

const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ');

/* Contracts 2.0.0 (7.3, 7.4) on a disposable database: the draft is approved only inside this test, installed through the
 * real Add app step, opened, and edited with direct saves (records.save) in the production runtime. Contracts has no app
 * commands. The released 1.1.1 installs from its archived schema with the same tables. */
test('Contracts 2.0.0: install, open, direct saves with expected versions, archive, and the same tables as 1.1.1',async()=>{
 const x=await contractsSuite();const {pg,f,s,actor}=x;
 try{
  await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.contracts' AND version='2.0.0'");
  const T=await new AppTemplates(undefined,x.db).read({templateId:'life.contracts',version:'2.0.0'});
  assert.equal(T.version,'2.0.0');assert.ok(isV2Source(T.source));
  // Same installer schema: a 2.0.0 install creates the same nine tables with the same fields as a 1.1.1 install.
  const w1=(await s.createWorkspace(actor,'Contracts 1.1.1')).id,old=await x.install(w1,x.C,'Contracts');
  const w=(await s.createWorkspace(actor,'Contracts 2.0.0')).id,c=await x.install(w,T,'Contracts');const app=c.receipt.appId;
  assert.equal(await x.tables(w),9);
  const fieldsOf=async(ws:string,id:string)=>{const m=x.mapOf(await x.comp(ws,id));return Object.fromEntries(await Promise.all(Object.entries(m).map(async([role,v]:any)=>[role,(await pg.query<any>('SELECT fields FROM entity_types WHERE id=$1',[v.typeId])).rows[0].fields])));};
  assert.deepEqual(await fieldsOf(w,app),await fieldsOf(w1,old.receipt.appId));
  const map=x.mapOf(await x.comp(w,app));

  // Open: the empty app offers its first action; nothing is written while opening; no own header or banner.
  const open=await x.run(w,app);
  assert.equal(open.runtime,'trialy-frontend-js-v2');assert.match(open.html,/No agreements yet/);assert.match(open.html,/data-action="add:agreements">Add agreement/);
  assert.doesNotMatch(open.html,/<header|<h1|ct-banner/);assert.match(open.css,/@layer trialagents-kit/);
  assert.equal((await x.rows(map.agreements.typeId)).length,0);
  // Settings are an owner's screen; the installer is the app's owner.
  assert.match(open.html,/data-action="nav:settings"/);

  // A counterparty from the side panel, saved directly.
  const orgOpen=await x.run(w,app,{screen:'counterparties'},{kind:'click',action:'add:organizations'});
  assert.match(orgOpen.html,/aria-label="Add organization"/);
  const orgSaved=await x.run(w,app,orgOpen.state,{kind:'submit',action:'save:record',form:{name:'Corvane Biologics',org_type:'cdmo',country:'Belgium'}});
  assert.ok(orgSaved.saved,'saved directly, no review');assert.equal(orgSaved.proposal??null,null);
  const org=(await x.rows(map.organizations.typeId))[0];assert.equal(org.data.name,'Corvane Biologics');
  // The screen is rendered again from the saved data in the same request.
  assert.match(orgSaved.html,/<input class="k-cell" type="text" value="Corvane Biologics" data-action="edit:[^:]+:name:0"/);

  // An agreement, then its key terms open on the next screen (a save cannot reference the record it creates).
  const agOpen=await x.run(w,app,{screen:'agreements'},{kind:'click',action:'add:agreements'});
  const agSaved=await x.run(w,app,agOpen.state,{kind:'submit',action:'save:record',form:{name:'Supply agreement — Corvane',agreement_type:'cmo_supply',counterparty_id:org.id,status:'active',effective_date:'2025-10-01',expiry_date:'2027-09-30',total_value:'2400000',currency:'EUR'}});
  assert.ok(agSaved.saved);const ag=(await x.rows(map.agreements.typeId))[0];assert.equal(ag.data.total_value,2400000);
  assert.match(agSaved.html,/aria-label="Key terms: Supply agreement — Corvane"/);
  const kt=await x.run(w,app,agSaved.state,{kind:'submit',action:'save:terms',form:{renewal:'option',notice_days:'180',renewal_term_months:'24'}});
  assert.ok(kt.saved);const t=(await x.rows(map['contracts.terms'].typeId))[0];
  assert.equal(t.data.notice_deadline,'2027-04-03','30 Sep 2027 − 180 days, stored with the terms');assert.equal(t.data.agreement_id,ag.id);

  // One inline edit: the status cell carries the version shown; it saves at once with status_since.
  const reg=await x.run(w,app,{screen:'agreements'});
  const cell=new RegExp('data-action="(edit:'+ag.id+':status:'+ag.version+')"').exec(reg.html);assert.ok(cell,'inline status cell with the shown version');
  const edited=await x.run(w,app,reg.state,{kind:'change',action:cell![1],value:'terminated'});
  assert.ok(edited.saved);assert.equal(edited.notice?.message,'Status saved');
  const after=(await x.rows(map.agreements.typeId))[0];assert.equal(after.data.status,'terminated');assert.equal(after.version,ag.version+1);
  // The same stale cell again is refused by the platform, never overwritten.
  await assert.rejects(x.run(w,app,reg.state,{kind:'change',action:cell![1],value:'expired'}));
  assert.equal((await x.rows(map.agreements.typeId))[0].data.status,'terminated');

  // Archive is archive_record: the record leaves the register, its history stays.
  const arch=await x.run(w,app,{screen:'counterparties',panel:{kind:'detail',role:'organizations',id:org.id}},{kind:'click',action:'archive:organizations:'+org.id});
  assert.ok(arch.saved);assert.equal((await x.rows(map.organizations.typeId)).length,0);
  assert.equal((await pg.query<any>("SELECT state FROM records WHERE id=$1",[org.id])).rows[0].state,'archived');
  // No record write anywhere went through a review.
  assert.equal((await pg.query<any>("SELECT count(*)::int n FROM workspace_previews WHERE workspace_id=$1 AND body->'operation'->>'kind'='apply_component_records'",[w])).rows[0].n,0);
 }finally{await pg.close();}
});
