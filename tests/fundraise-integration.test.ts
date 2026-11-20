import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {fundraiseFixture} from './fixtures/fundraise.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {Service} from '../src/domain/service.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {prepareToolLayout} from '../src/workspace/tool-layout.js';
import {readCustomLayout} from '../src/shared/custom-layout.js';
import {syncTemplateCatalog,installCatalogApp,readCatalogInstallation} from '../src/workspace/template-catalog.js';
import {dataAccessStep,confirmDataAccess} from '../src/workspace/data-access.js';
import {appIntegrations,readIntegration,chooseIntegrationSource} from '../src/workspace/integrations.js';
import {contractRegistry,withTemplateBindings} from '../src/workspace/role-contracts.js';
import {archivedItems} from '../src/workspace/archive.js';
import type {Database,Connection} from '../src/db/database.js';
import type {Actor} from '../src/shared/schema.js';

const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ');

test('installed Fundraise: an activity and last_activity_on in one reviewed save, native layout and stale-edit rejection',async()=>{
 const x=await fundraiseFixture();const {f,s,w,actor,component,map}=x;
 try{
  const run=(state:any={},event:any={kind:'open'})=>f.runFrontend(actor,w.id,{componentId:component.id,expectedVersion:component.version,state,event});
  const rows=async(role:string)=>(await s.records(actor,w.id,map[role].typeId,{limit:200,offset:0})).rows;
  const opened=await run();assert.equal(opened.connected,true);assert.match(text(opened.html),/Raised EUR 5,000,000 of EUR 15,000,000 \(33\.3%\)/);
  const org=(await rows('organizations')).find((r:any)=>r.data.name==='Fjordhaven Partners')!;
  const opp=(await rows('fundraise.opportunities')).find((r:any)=>r.data.organization_id===org.id)!;
  const before=(await rows('fundraise.activities')).length;
  const open=await run({section:'activity'},{kind:'click',action:'add:acts:'+opp.id});
  const p=await run(open.state,{kind:'submit',action:'save-record',form:{opportunity_id:opp.id,activity_on:'2026-11-10',kind:'call',summary:'Partner meeting booked'}});
  assert.ok(p.proposal,p.state?.notice);assert.equal((await rows('fundraise.activities')).length,before,'nothing written before approval');
  await f.confirm(actor,w.id,p.proposal.id,p.proposal.digest);
  assert.equal((await rows('fundraise.activities')).length,before+1);
  assert.equal((await rows('fundraise.opportunities')).find((r:any)=>r.id===opp.id)!.data.last_activity_on,'2026-11-10','same reviewed save');
  // Native layout: presentation only, versioned review, re-read on every render.
  const profile=readCustomLayout(component.source)!.profile;profile.tabs.reverse();profile.cols.investors.reverse();profile.heading='Seed raise';
  const preview=await prepareToolLayout(f,actor,w.id,{componentId:component.id,expectedVersion:component.version,name:profile.heading,description:'',customLayout:profile});
  await f.confirm(actor,w.id,preview.id,preview.digest);const saved=(await f.readComponent(actor,w.id,component.id)).component;
  assert.deepEqual(readCustomLayout(saved.source)!.profile,profile);assert.deepEqual(saved.bindings,component.bindings);assert.deepEqual(saved.manifest,component.manifest);
  assert.match((await f.runFrontend(actor,w.id,{componentId:saved.id,expectedVersion:saved.version,state:{layout:{heading:'Stale'}}})).html,/Seed raise/);
  // A record changed after the editor opened is rejected by the server, never overwritten.
  const cur=(await rows('fundraise.opportunities')).find((r:any)=>r.id===opp.id)!;
  const e2=await f.runFrontend(actor,w.id,{componentId:saved.id,expectedVersion:saved.version,event:{kind:'click',action:'edit:opps:'+cur.id}});
  await x.save({kind:'update_record',recordId:cur.id,expectedVersion:cur.version,data:{next_step:'Concurrent edit'}});
  await assert.rejects(f.runFrontend(actor,w.id,{componentId:saved.id,expectedVersion:saved.version,state:e2.state,event:{kind:'submit',action:'save-record',form:{next_step:'Stale edit'}}}),/changed|version|stale/i);
  assert.equal((await rows('fundraise.opportunities')).find((r:any)=>r.id===cur.id)!.data.next_step,'Concurrent edit');
 }finally{await x.pg.close();}
});

/* Section 12 criterion 6 and modular apps §7: Fundraise works alone with manual entries, then a provider of dataroom.v1
 * (here a custom app, because the catalog has no Data Room template yet) and Programs are added; the user chooses the
 * provider's data inside the app; archiving the provider leaves Fundraise working. Then the same with the providers first. */
async function setup(){
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const actor:Actor={userId:randomUUID(),origin:'human'};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'owner@example.invalid','Owner']);
 const f=new WorkspaceFoundation(db),s=new Service(db);
 await syncTemplateCatalog(db);
 // Fundraise 2.0.0 is approved by the seed; Programs 2.1.0 (this suite's partner app) was withdrawn by migration 075, so both are
 // approved only inside this disposable database, keeping the setup independent of the seed.
 await pg.query("UPDATE app_template_catalog SET status='approved' WHERE (template_id='life.investor-crm' AND version='2.0.1') OR (template_id='life.project-oversight' AND version='2.1.0')");
 const catalog=new AppTemplates(undefined,db);
 const F=await catalog.read({templateId:'life.investor-crm',version:'2.0.1'}),P=await catalog.read({templateId:'life.project-oversight',version:'2.1.0'});
 const install=async(w:string,t:any,name:string,connections:Record<string,string>={})=>{
  const target={install:{templateId:t.id,version:t.version,digest:t.digest,name,requestKey:randomUUID()}};
  const step=await dataAccessStep(f,actor,w,target);
  return {step,receipt:step.needed?await confirmDataAccess(f,actor,w,{...target,connections,stepDigest:step.digest}):await installCatalogApp(f,actor,w,target.install)};
 };
 const comp=async(w:string,id:string)=>(await f.readComponent(actor,w,id)).component;
 const mapOf=(c:any)=>JSON.parse(JSON.parse(/^const templateConfiguration=(.+);\n/.exec(c.source)![1]).tableMap);
 const save=async(w:string,typeId:string,data:any)=>{const p=await s.preview(actor,w,{kind:'create_record',typeId,data});return (await s.commit(actor,p.id,p.digest)).objects[0].id as string;};
 const change=async(w:string,op:any)=>{const p=await f.preview(actor,w,op);return f.confirm(actor,w,p.id,p.digest);};
 const open=async(w:string,id:string,state:any={})=>{const c=await comp(w,id);return f.runFrontend(actor,w,{componentId:c.id,expectedVersion:c.version,state,event:{kind:'open'}});};
 const offers=async(w:string,id:string)=>Object.fromEntries((await appIntegrations(db,actor,w,await comp(w,id))).map((x:any)=>[x.role,x]));
 const count=async(typeId:string)=>(await pg.query<any>("SELECT count(*)::int n FROM records WHERE type_id=$1 AND state<>'archived'",[typeId])).rows[0].n as number;
 const tables=async(w:string)=>(await pg.query<any>('SELECT count(*)::int n FROM entity_types WHERE workspace_id=$1 AND deleted_at IS NULL',[w])).rows[0].n as number;
 const v=async(id:string)=>(await pg.query<any>('SELECT version FROM workspace_components WHERE id=$1',[id])).rows[0].version;
 // A custom app (built by Claude or ChatGPT) that provides both dataroom.v1 roles and is their writer.
 async function dataRoom(w:string,name='Data Room'){
  const registry=await contractRegistry(),out:any={},fields:any[]=[],bindings:any[]=[],roles:any[]=[];
  for(const role of ['dataroom.access_grants','dataroom.engagement']){
   const defs=registry.roles[role].versions['dataroom.v1'].fields.map(x=>({...x,ai:true}));
   const p=await s.preview(actor,w,{kind:'create_type',name:name+' · '+registry.roles[role].name,fields:defs});const typeId=(await s.commit(actor,p.id,p.digest)).objects[0].id as string;
   out[role]=typeId;fields.push(...defs.map((x:any)=>({id:role.replace('.','_')+'_'+x.key,typeId,field:x.key,schemaVersion:0,kind:x.kind,mode:'write'})));bindings.push({typeId,fields:defs.map((x:any)=>x.key)});roles.push({role,contract:'dataroom.v1',typeId});
  }
  const saved=await change(w,{kind:'save_component',projectId:null,content:{name,format:'frontend-js',source:"return {html:'<p>Rooms</p>',state:input.state};",sourceAccess:'workspace',manifest:{version:1,scope:'workspace',fields,roles},bindings}});
  return {appId:saved.id as string,...out};
 }
 return {pg,db,f,s,actor,F,P,install,comp,mapOf,save,change,open,offers,count,tables,v,dataRoom};
}

test('integration test, Fundraise first: manual engagement and milestones, then "Use its data" for a Data Room provider and Programs; archiving the provider leaves Fundraise working',async()=>{
 const x=await setup();const {f,actor,F,P}=x;
 try{
  const w=(await x.s.createWorkspace(actor,'Fundraise first')).id;
  const fr=await x.install(w,F,'Fundraise');assert.deepEqual(fr.step.tables,[],'nothing to connect: no dialog rows');
  const id=fr.receipt.appId,map=x.mapOf(await x.comp(w,id));
  assert.equal(await x.tables(w),12,'organizations, people, seven Fundraise tables and three own integration tables');
  for(const role of ['dataroom.access_grants','dataroom.engagement','programs.plan_items']){assert.ok(map[role].typeId,role);assert.ok(map[role].writableFields.length>0,role+' is writable (own entries)');}
  let o=await x.offers(w,id);
  assert.deepEqual([o['dataroom.access_grants'].source,o['dataroom.engagement'].source,o['programs.plan_items'].source],['own','own','own']);
  // Data Room 1.1.0 and Programs 2.1.0 are approved, so the platform offers "Add Data Room" and "Add Programs".
  assert.equal(o['dataroom.access_grants'].offer,'install');assert.equal(o['programs.plan_items'].offer,'install');
  // Manual data: an investor, a round, an opportunity, access and views entered in Fundraise's own tables; one own milestone for a tranche.
  const northlake=await x.save(w,map.organizations.typeId,{name:'Northlake Bio Ventures',org_type:'investor',archived:false});
  await x.save(w,map['fundraise.investor_profiles'].typeId,{organization_id:northlake,investor_type:'specialist_ls_vc',profile_status:'accepted',tier:'a',archived:false});
  const round=await x.save(w,map['fundraise.rounds'].typeId,{name:'Seed 2026',round_type:'seed',target_amount:15000000,currency:'EUR',status:'active',archived:false});
  await x.save(w,map['fundraise.opportunities'].typeId,{round_id:round,organization_id:northlake,stage:'due_diligence',interest:'verbal',amount_indicated:6000000,currency:'EUR',archived:false});
  const ownGrant=await x.save(w,map['dataroom.access_grants'].typeId,{organization_id:northlake,room_name:'Seed room (manual)',status:'active',granted_on:'2026-11-01',source:'manual'});
  await x.save(w,map['dataroom.engagement'].typeId,{grant_id:ownGrant,organization_id:northlake,document_title:'Deck',first_viewed_on:'2026-11-02',last_viewed_on:'2026-11-02',view_count:1,source:'docsend'});
  const ownMile=await x.save(w,map['programs.plan_items'].typeId,{name:'Lead candidate nomination',program_id:'PX-101',item_type:'milestone',end_date:'2027-06-30',status:'planned',is_key:true});
  await x.save(w,map['fundraise.tranches'].typeId,{round_id:round,tranche_no:1,amount:7500000,currency:'EUR',condition:'First close',status:'expected'});
  await x.save(w,map['fundraise.tranches'].typeId,{round_id:round,tranche_no:2,amount:7500000,currency:'EUR',condition:'Lead candidate nominated',milestone_id:ownMile,expected_on:'2027-07-31',status:'expected'});
  let eng=text((await x.open(w,id,{section:'engagement'})).html);
  assert.match(eng,/Your own entries/);assert.match(eng,/Northlake Bio Ventures — Seed room \(manual\)/);assert.match(eng,/Deck/);assert.match(eng,/Add Data Room/,'Data Room 1.1.0 is published, so it is offered');assert.doesNotMatch(eng,/Use its data/);
  let rd=(await x.open(w,id,{section:'round'})).html;
  assert.match(rd,/Works with Programs\. <button type="button" class="fr-linkbtn" data-trialy-integration="install programs\.plan_items">Add Programs<\/button>/);
  assert.match(text(rd),/Lead candidate nominated Lead candidate nomination 31 Jul 2027 Expected On track \(planned, 30 Jun 2027\)/);assert.match(text(rd),/First close — — Expected No milestone/);

  // Add a provider of dataroom.v1 (a custom app). The line changes to "Use its data".
  const room=await x.dataRoom(w);
  await x.save(w,room['dataroom.access_grants'],{room_id:'r1',room_name:'Seed 2026 room (tracked)',room_purpose:'financing',organization_id:northlake,granted_on:'2026-11-03',status:'active',source:'tracked'});
  const providerGrant=(await x.pg.query<any>("SELECT id FROM records WHERE type_id=$1",[room['dataroom.access_grants']])).rows[0].id;
  for(const d of [5,3,1].map(n=>new Date(Date.now()-n*86400000).toISOString().slice(0,10)))await x.save(w,room['dataroom.engagement'],{grant_id:providerGrant,organization_id:northlake,document_ref:'doc-'+d,document_title:'Tracked doc '+d,first_viewed_on:d,last_viewed_on:d,view_count:1,source:'tracked',as_of:d});
  o=await x.offers(w,id);assert.equal(o['dataroom.access_grants'].offer,'connect');assert.equal(o['dataroom.engagement'].offer,'connect');assert.equal(o['dataroom.access_grants'].provider,'Data Room');
  eng=(await x.open(w,id,{section:'engagement'})).html;
  assert.match(eng,/Data Room is in your workspace\. <button type="button" class="fr-linkbtn" data-trialy-integration="connect dataroom\.access_grants">Use its data<\/button>/);
  // The platform dialog shows both sources side by side; the user chooses the provider for access, then for views.
  const g=await readIntegration(f,actor,w,{appId:id,role:'dataroom.access_grants'});
  assert.equal(g.own!.records,1);assert.deepEqual(g.providers.map((p:any)=>[p.appName,p.typeId,p.records]),[['Data Room',room['dataroom.access_grants'],1]]);
  await assert.rejects(chooseIntegrationSource(f,{...actor,origin:'ai'},w,{appId:id,expectedVersion:g.version,role:'dataroom.access_grants',source:room['dataroom.access_grants']}),/cannot approve its own changes/);
  await chooseIntegrationSource(f,actor,w,{appId:id,expectedVersion:g.version,role:'dataroom.access_grants',source:room['dataroom.access_grants']});
  assert.match((await x.open(w,id,{section:'engagement'})).html,/data-trialy-integration="connect dataroom\.engagement"[^>]*>Use its view data/);
  const e=await readIntegration(f,actor,w,{appId:id,role:'dataroom.engagement'});
  await chooseIntegrationSource(f,actor,w,{appId:id,expectedVersion:e.version,role:'dataroom.engagement',source:room['dataroom.engagement']});
  const after=x.mapOf(await x.comp(w,id));
  for(const role of ['dataroom.access_grants','dataroom.engagement']){assert.equal(after[role].typeId,room[role]);assert.deepEqual(after[role].writableFields,[]);}
  assert.equal(await x.count(map['dataroom.access_grants'].typeId),1,'manual entries stay in Database');assert.equal(await x.count(map['dataroom.engagement'].typeId),1);
  o=await x.offers(w,id);assert.equal(o['dataroom.access_grants'].source,'linked');assert.equal(o['dataroom.access_grants'].offer,null);
  eng=(await x.open(w,id,{section:'engagement'})).html;const et=text(eng);
  assert.match(et,/From the linked Data Room, read-only/);assert.match(et,/Seed 2026 room \(tracked\)/);assert.doesNotMatch(et,/Seed room \(manual\)/);
  assert.match(et,/Hot Northlake Bio Ventures Viewed 3 times this week/);assert.doesNotMatch(eng,/data-trialy-integration|add:grants|add:views/);
  // The running app cannot write the provider's tables: the editor opens read-only and a submit proposes nothing.
  {const c=await x.comp(w,id);const a=await f.runFrontend(actor,w,{componentId:id,expectedVersion:c.version,state:{section:'engagement'},event:{kind:'click',action:'add:grants'}});
   const b=await f.runFrontend(actor,w,{componentId:id,expectedVersion:c.version,state:a.state,event:{kind:'submit',action:'save-record',form:{organization_id:northlake,status:'active'}}});
   assert.ok(!b.proposal);assert.match(b.state.notice,/You cannot change the data-room access table/);}

  // Programs: added to the workspace, then chosen as the milestone source. Own milestones stay in Database.
  const prog=await x.install(w,P,'Programs');const pmap=x.mapOf(await x.comp(w,prog.receipt.appId));
  assert.equal((await x.offers(w,id))['programs.plan_items'].offer,'connect');
  assert.match((await x.open(w,id,{section:'round'})).html,/Programs is in your workspace\. <button[^>]*data-trialy-integration="connect programs\.plan_items"[^>]*>Use its milestones<\/button>/);
  const px=await x.save(w,pmap.programs.typeId,{name:'PX-101',stage:'preclinical',status:'active',archived:false});
  const ind=await x.save(w,pmap['programs.plan_items'].typeId,{name:'IND submission',program_id:px,item_type:'milestone',function:'regulatory',end_date:'2027-03-31',status:'at_risk',is_key:true,archived:false});
  const m=await readIntegration(f,actor,w,{appId:id,role:'programs.plan_items'});assert.equal(m.own!.records,1);assert.equal(m.providers[0].appName,'Programs');
  await chooseIntegrationSource(f,actor,w,{appId:id,expectedVersion:m.version,role:'programs.plan_items',source:pmap['programs.plan_items'].typeId});
  // Tranche 2 still points at the own milestone, which Fundraise no longer reads; pointing a tranche at a Programs milestone uses its status.
  await x.save(w,x.mapOf(await x.comp(w,id))['fundraise.tranches'].typeId,{round_id:round,tranche_no:3,amount:1000000,currency:'EUR',condition:'IND filed',milestone_id:ind,status:'expected'});
  rd=text((await x.open(w,id,{section:'round'})).html);
  assert.match(rd,/Lead candidate nominated Milestone unavailable/);assert.match(rd,/IND filed IND submission — Expected Milestone at risk/);assert.match(rd,/From Programs \(plan items\), read-only here/);
  assert.equal(await x.count(map['programs.plan_items'].typeId),1,'own milestone entries stay in Database');

  // Archive the provider: Fundraise keeps working. Archive first keeps the provider's tables, so its data stays readable, labelled read-only.
  const records=await x.count(room['dataroom.access_grants']);
  await x.change(w,{kind:'archive_component',componentId:room.appId,expectedVersion:await x.v(room.appId),archived:true});
  assert.equal(await x.count(room['dataroom.access_grants']),records);
  const archived=text((await x.open(w,id,{section:'engagement'})).html);assert.match(archived,/From the linked Data Room, read-only/);assert.doesNotMatch(archived,/could not be shown|fr-banner bad/);
  assert.match(text((await x.open(w,id)).html),/Seed 2026 · Seed · Active/);
  // A table that an app still binds cannot be permanently deleted (archive first), so "unavailable" is reached only when the
  // provider's data is not readable for the viewer; that state is covered in tests/fundraise.test.ts (engagement test).
  for(const section of ['overview','pipeline','investors','round','activity','settings'])assert.doesNotMatch((await x.open(w,id,{section})).html,/could not be shown/,section);
 }finally{await x.pg.close();}
});

test('integration test, providers first: Fundraise connects the Data Room provider and Programs at install, read-only, and creates no own tables for them',async()=>{
 const x=await setup();const {actor,F,P}=x;
 try{
  const w=(await x.s.createWorkspace(actor,'Providers first')).id;
  const room=await x.dataRoom(w);const prog=await x.install(w,P,'Programs');const pmap=x.mapOf(await x.comp(w,prog.receipt.appId));
  const before=await x.tables(w);
  const plan=await readCatalogInstallation(x.db,actor,w,{templateId:F.id,version:F.version});
  assert.deepEqual(plan.roles.map((r:any)=>r.role).sort(),['dataroom.access_grants','dataroom.engagement','people','programs.plan_items']);
  const fr=await x.install(w,F,'Fundraise');
  // The Use existing data? dialog lists one row per connectable table; Connect is the default.
  assert.deepEqual(fr.step.tables.map((t:any)=>[t.role,t.alternative]).sort(),[['dataroom.access_grants','new'],['dataroom.engagement','new'],['people','new'],['programs.plan_items','new']]);
  const map=x.mapOf(await x.comp(w,fr.receipt.appId));
  assert.equal(map['dataroom.access_grants'].typeId,room['dataroom.access_grants']);assert.equal(map['dataroom.engagement'].typeId,room['dataroom.engagement']);assert.equal(map['programs.plan_items'].typeId,pmap['programs.plan_items'].typeId);
  for(const role of ['dataroom.access_grants','dataroom.engagement','programs.plan_items'])assert.deepEqual(map[role].writableFields,[],role+' is read-only');
  assert.equal(map.people.typeId,pmap.people.typeId,'one shared people table');
  assert.equal(await x.tables(w)-before,8,'organizations and seven Fundraise tables; no own data-room or milestone tables');
  const o=await x.offers(w,fr.receipt.appId);for(const role of ['dataroom.access_grants','dataroom.engagement','programs.plan_items']){assert.equal(o[role].source,'linked',role);assert.equal(o[role].offer,null);}
  // The provider writes; Fundraise reads.
  const org=await x.save(w,map.organizations.typeId,{name:'Calder Life Sciences Fund',org_type:'investor',archived:false});
  await x.save(w,room['dataroom.access_grants'],{room_name:'Seed room',organization_id:org,status:'active',granted_on:'2026-11-01',source:'tracked'});
  const eng=(await x.open(w,fr.receipt.appId,{section:'engagement'})).html;
  assert.match(text(eng),/From the linked Data Room, read-only/);assert.match(text(eng),/Never opened Calder Life Sciences Fund Has access, never opened \(Seed room\)/);assert.doesNotMatch(eng,/data-trialy-integration|add:grants/);
  // Programs still opens and edits its plan items (Fundraise is a reader only).
  assert.doesNotMatch((await x.open(w,prog.receipt.appId)).html,/pg-banner bad|could not be shown/);
  // Choosing Create new instead gives Fundraise its own tables, as when installed alone.
  const w2=(await x.s.createWorkspace(actor,'Providers first, own data')).id;await x.dataRoom(w2);
  const own=await x.install(w2,F,'Fundraise',{'dataroom.access_grants':'new','dataroom.engagement':'new'});
  const omap=x.mapOf(await x.comp(w2,own.receipt.appId));assert.ok(omap['dataroom.access_grants'].writableFields.length>0);
  assert.equal((await x.offers(w2,own.receipt.appId))['dataroom.access_grants'].offer,'connect','the line still offers the provider later');
 }finally{await x.pg.close();}
});

/* MODULAR_APPS_AND_SHARED_DATA.md §3 rule 9 for Fundraise: install alone; install with other apps; delete one; remove one tab; reinstall.
 * Plus the archive-first checks (§6): archive/restore keeps every field and brings automations back switched off; a removed tab
 * re-added reconnects the same table; archived apps are listed for the owner. */
test('rule 9 modularity and archive first: alone, shared organizations and people, provider deleted, tab removed, reinstall',async()=>{
 const x=await setup();const {f,actor,F,P,pg}=x;
 try{
  const w=(await x.s.createWorkspace(actor,'Suite')).id;
  // 1. Alone: opens with "No round yet" and no error.
  const fr=await x.install(w,F,'Fundraise');const id=fr.receipt.appId,map=x.mapOf(await x.comp(w,id));
  const alone=text((await x.open(w,id)).html);assert.match(alone,/No round yet/);assert.doesNotMatch(alone,/could not be shown|Partial data/);
  const contract=JSON.parse(await readFile('templates/core-contract/v1.json','utf8'));
  assert.deepEqual((await pg.query<any>('SELECT fields FROM entity_types WHERE id=$1',[map.organizations.typeId])).rows[0].fields.map((f:any)=>f.key),contract.roles.organizations.fields.map((f:any)=>f.key));
  // fundraise.tranches: Fundraise is the registered single writer of its output.
  assert.equal((await pg.query<any>("SELECT app_id,contract FROM role_writers WHERE type_id=$1",[map['fundraise.tranches'].typeId])).rows[0]?.app_id,id);
  // 2. With another app: Programs installed afterwards connects Fundraise's people table (reuse, never copy).
  const prog=await x.install(w,P,'Programs');assert.equal(x.mapOf(await x.comp(w,prog.receipt.appId)).people.typeId,map.people.typeId);
  const round=await x.save(w,map['fundraise.rounds'].typeId,{name:'Seed 2026',round_type:'seed',target_amount:1000000,currency:'EUR',status:'active',archived:false});
  const records=(await pg.query<any>('SELECT count(*)::int n FROM records WHERE workspace_id=$1',[w])).rows[0].n;
  // 3. Delete the other app: Programs is archived; nothing is deleted and Fundraise is unaffected.
  await x.change(w,{kind:'archive_component',componentId:prog.receipt.appId,expectedVersion:await x.v(prog.receipt.appId),archived:true});
  assert.equal((await pg.query<any>('SELECT count(*)::int n FROM records WHERE workspace_id=$1',[w])).rows[0].n,records);
  assert.match(text((await x.open(w,id)).html),/Seed 2026 · Seed · Active/);
  // 4. Remove one tab: unbind the data-room views table. Engagement says so; records stay; re-adding reconnects the same table.
  const c=await x.comp(w,id),views=map['dataroom.engagement'].typeId;
  const withMap=(src:string,m:any)=>src.replace(/^const templateConfiguration=(.+);\n/,(_:string,json:string)=>'const templateConfiguration='+JSON.stringify({...JSON.parse(json),tableMap:JSON.stringify(m)})+';\n');
  const revise=async(m:any,b:any[],man:any[])=>{const cur=await x.comp(w,id);return x.change(w,{kind:'save_component',componentId:cur.id,expectedVersion:cur.version,projectId:cur.project_id,content:{name:cur.name,format:'frontend-js',source:withMap(cur.source,m),sourceAccess:cur.source_access??'workspace',bindings:b,manifest:{...cur.manifest,fields:man}}});};
  await x.save(w,views,{document_title:'Kept',view_count:1});
  const unbound={...map};delete unbound['dataroom.engagement'];
  await revise(unbound,c.bindings.filter((b:any)=>b.typeId!==views),c.manifest.fields.filter((m:any)=>m.typeId!==views));
  assert.match(text((await x.open(w,id,{section:'engagement'})).html),/This app has no data-room views table/);
  assert.equal(await x.count(views),1,'records stay');
  await revise(map,c.bindings,c.manifest.fields);assert.equal(x.mapOf(await x.comp(w,id))['dataroom.engagement'].typeId,views);
  assert.match(text((await x.open(w,id,{section:'engagement'})).html),/Kept/);
  // 5. Archive first and reinstall. An app automation is attached so restore can be checked.
  const action=randomUUID();await pg.query("INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,approved_by) VALUES($1,$2,$3,$4,'{\"name\":\"Weekly round digest\"}',$3)",[action,w,actor.userId,id]);
  const fieldsBefore=(await pg.query<any>('SELECT id,fields,archived_fields FROM entity_types WHERE workspace_id=$1 ORDER BY id',[w])).rows;
  await x.change(w,{kind:'archive_component',componentId:id,expectedVersion:await x.v(id),archived:true});
  assert.deepEqual((await pg.query<any>('SELECT id,fields,archived_fields FROM entity_types WHERE workspace_id=$1 ORDER BY id',[w])).rows,fieldsBefore,'archiving keeps every field');
  assert.ok((await archivedItems(f,actor,w,{kind:'apps'})).items.some((i:any)=>i.id===id),'listed for the owner under Show archived');
  await x.change(w,{kind:'archive_component',componentId:id,expectedVersion:await x.v(id),archived:false});
  assert.deepEqual((await pg.query<any>('SELECT id,fields,archived_fields FROM entity_types WHERE workspace_id=$1 ORDER BY id',[w])).rows,fieldsBefore,'restoring keeps every field');
  const j=(await pg.query<any>('SELECT paused,deleted_at FROM app_actions WHERE id=$1',[action])).rows[0];assert.deepEqual([j.paused,j.deleted_at],[true,null],'automation back switched off');
  assert.match(text((await x.open(w,id)).html),/Seed 2026 · Seed · Active/);
  // "Install a new copy" without a choice starts fresh; it never takes over the output writer of the first copy's tranches.
  const copy=await installCatalogApp(f,actor,w,{templateId:F.id,version:F.version,digest:F.digest,name:'Fundraise copy',requestKey:randomUUID(),createNew:true});
  assert.notEqual(x.mapOf(await x.comp(w,copy.appId))['fundraise.tranches'].typeId,map['fundraise.tranches'].typeId);
 }finally{await x.pg.close();}
});

/* FUNDRAISE.md §8a end to end: what Claude or ChatGPT does to add a custom field, as three reviewed changes on the real platform:
 * (1) the field on the opportunities table, (2) an app revision that binds it (table map, binding, manifest; no source change),
 * (3) registering it in settings.custom_fields. Then a person edits it in the app through the reviewed path. */
test('customization: a custom field added by an assistant through reviewed changes works without a source change',async()=>{
 const x=await setup();const {f,actor,F}=x;
 try{
  const w=(await x.s.createWorkspace(actor,'Customized')).id;const fr=await x.install(w,F,'Fundraise');const id=fr.receipt.appId,map=x.mapOf(await x.comp(w,id));
  const T=(r:string)=>map[r].typeId;
  const round=await x.save(w,T('fundraise.rounds'),{name:'Seed',round_type:'seed',currency:'EUR',status:'active',archived:false});
  const org=await x.save(w,T('organizations'),{name:'Quayside Ventures (fictional)',org_type:'investor',archived:false});
  const opp=await x.save(w,T('fundraise.opportunities'),{round_id:round,organization_id:org,stage:'contacted',interest:'none',currency:'EUR',archived:false});
  const settingsRow=await x.save(w,T('fundraise.settings'),{default_currency:'EUR',stale_days:14});
  const body=(src:string)=>src.replace(/^const templateConfiguration=.+;\nconst templateBindings=.+;\n/,''),sourceBefore=body((await x.comp(w,id)).source);
  // (1) Schema: one optional select field on the opportunities table.
  const type=(await x.pg.query<any>('SELECT * FROM entity_types WHERE id=$1',[T('fundraise.opportunities')])).rows[0];
  const field={key:'syndicate_role',name:'Syndicate role',kind:'select',required:false,multiple:false,ai:true,options:['Lead','Co-lead','Follower']};
  {const pv=await x.s.preview(actor,w,{kind:'update_type',concept:type.concept??null,typeId:type.id,expectedVersion:type.version,name:type.name,fields:[...type.fields,field]} as any);await x.s.commit(actor,pv.id,pv.digest);}
  const schemaVersion=(await x.pg.query<any>('SELECT version FROM entity_types WHERE id=$1',[type.id])).rows[0].version;
  // (2) App revision: table map, binding and manifest gain the field; the app source is unchanged.
  const c=await x.comp(w,id),m2=structuredClone(map);m2['fundraise.opportunities'].fields.syndicate_role='syndicate_role';m2['fundraise.opportunities'].writableFields.push('syndicate_role');
  const bindings=c.bindings.map((b:any)=>b.typeId===type.id?{...b,fields:[...b.fields,'syndicate_role']}:b);
  // Two configuration lines change (the table map and the template bindings); the app body below them does not.
  const source=withTemplateBindings(c.source.replace(/^const templateConfiguration=(.+);\n/,(_:string,json:string)=>'const templateConfiguration='+JSON.stringify({...JSON.parse(json),tableMap:JSON.stringify(m2)})+';\n'),bindings);
  const sample=c.manifest.fields.find((mf:any)=>mf.typeId===type.id);
  const manifest={...c.manifest,fields:[...c.manifest.fields,{...sample,id:sample.id.replace(/[^_]+$/,'')+'syndicate_role',field:'syndicate_role',kind:'select',schemaVersion}]};
  await x.change(w,{kind:'save_component',componentId:c.id,expectedVersion:c.version,projectId:c.project_id,content:{name:c.name,format:'frontend-js',source,sourceAccess:c.source_access??'workspace',bindings,manifest}});
  const c2=await x.comp(w,id);assert.equal(body(c2.source),sourceBefore,'no change to the app body');
  assert.deepEqual(c2.execution.map((b:any)=>b.name).sort(),c.execution.map((b:any)=>b.name).sort(),'installed helpers are kept by the revision');
  // (3) Settings: register the field (a reviewed record change).
  const sr=(await x.pg.query<any>('SELECT version FROM records WHERE id=$1',[settingsRow])).rows[0];
  let p=await x.s.preview(actor,w,{kind:'update_record',recordId:settingsRow,expectedVersion:sr.version,data:{custom_fields:JSON.stringify([{table:'opportunities',key:'syndicate_role',label:'Syndicate role',kind:'select',options:['Lead','Co-lead','Follower']}]),stage_labels:JSON.stringify({first_meeting:'Intro call'})}});await x.s.commit(actor,p.id,p.digest);
  const settings=text((await x.open(w,id,{section:'settings'})).html);assert.match(settings,/Syndicate role Opportunities · Select \(Lead, Co-lead, Follower\)/);assert.doesNotMatch(settings,/not bound to this app yet/);
  assert.match(text((await x.open(w,id,{section:'pipeline'})).html),/Intro call 0/);
  // A person edits the field through the app's reviewed save.
  const run=(state:any,event:any)=>x.comp(w,id).then(cc=>f.runFrontend(actor,w,{componentId:cc.id,expectedVersion:cc.version,state,event}));
  const ed=await run({section:'pipeline'},{kind:'click',action:'edit:opps:'+opp});assert.match(ed.html,/name="syndicate_role"/);
  const sv:any=await run(ed.state,{kind:'submit',action:'save-record',form:{syndicate_role:'Lead'}});await f.confirm(actor,w,sv.proposal.id,sv.proposal.digest);
  assert.equal((await x.pg.query<any>('SELECT data FROM records WHERE id=$1',[opp])).rows[0].data.syndicate_role,'Lead');
  assert.match(text((await x.open(w,id,{section:'pipeline',detail:{role:'opps',id:opp}})).html),/Syndicate role Lead/);
 }finally{await x.pg.close();}
});

/* Publication (owner approval, 14 Nov 2026): the seed names 2.0.0, so the catalog sync imports it approved; migration 072
 * withdraws Investor CRM 1.0.1 once, as it would on the production catalog where 1.0.1 is approved. */
test('publication: seed approves Fundraise 2.0.0; migration 072 withdraws 1.0.1; installed 1.0.1 JSON unchanged',async()=>{
 const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8'));assert.deepEqual(seed['life.investor-crm'],{schema:'templates/source/investor-crm/schema.example.json',version:'2.0.1'});// 2.0.1 since 18 November 2026
 const ret=JSON.parse(await readFile('templates/catalog-retirements.json','utf8')).retirements.find((r:any)=>r.templateId==='life.investor-crm');assert.deepEqual([ret.version,ret.replacedBy],['1.0.1','life.investor-crm@2.0.0']);
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
  await syncTemplateCatalog(db);
  const status=async(v:string)=>(await pg.query<any>("SELECT status FROM app_template_catalog WHERE template_id='life.investor-crm' AND version=$1",[v])).rows[0]?.status;
  assert.equal(await status('2.0.1'),'approved','the sync after migrations imports the seeded version approved');assert.equal(await status('2.0.0'),'draft','in a new database the seed imports only 2.0.1 approved');
  // Production state before this deployment: 1.0.1 approved. The one-time migration withdraws it.
  await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.investor-crm' AND version='1.0.1'");
  await pg.exec(await readFile('migrations/072_approve_fundraise_2_0_0.sql','utf8'));
  assert.equal(await status('1.0.1'),'draft');assert.equal(await status('2.0.1'),'approved');
  const listed=(await new AppTemplates(undefined,db).list({query:'Fundraise'} as any)).templates.filter((t:any)=>t.id==='life.investor-crm').map((t:any)=>t.version);assert.deepEqual(listed,['2.0.1']);
 }finally{await pg.close();}
});
