import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {contractsSuite,pdf,SIGNED_CDA} from './fixtures/contracts.js';
import {appIntegrations,readIntegration,chooseIntegrationSource} from '../src/workspace/integrations.js';
import {readCatalogInstallation,installCatalogApp} from '../src/workspace/template-catalog.js';
import {archivedItems} from '../src/workspace/archive.js';
import {AccessGrid} from '../src/domain/access-grid.js';
import {runOne} from '../src/worker/processor.js';
import {prepareToolLayout} from '../src/workspace/tool-layout.js';
import {readCustomLayout} from '../src/shared/custom-layout.js';

const contract=JSON.parse(await readFile('templates/core-contract/v1.json','utf8'));
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ');

/* Acceptance 6 and 9 (MODULAR_APPS_AND_SHARED_DATA.md §3 rule 9, §6, §7.1) with the real Add app step, installer and integration dialog. */
test('Contracts alone with own milestones; Programs added later is offered, chosen and read only; Programs archived; tab removed; reinstall; reverse order connects at install',async()=>{
 const x=await contractsSuite();const {pg,f,s,actor,C,P}=x;
 try{
  // 1. Install alone: nine tables (agreements, organizations, people, programs, studies, own milestones, settings, terms, obligations).
  const w=(await s.createWorkspace(actor,'Contracts first')).id;
  assert.deepEqual((await readCatalogInstallation(x.db,actor,w,{templateId:C.id,version:C.version})).roles,[]);
  const c=await x.install(w,C,'Contracts');const app=c.receipt.appId;assert.equal(await x.tables(w),9);
  const map=x.mapOf(await x.comp(w,app));
  assert.deepEqual((await pg.query<any>('SELECT fields FROM entity_types WHERE id=$1',[map.agreements.typeId])).rows[0].fields.map((f:any)=>f.key),contract.roles.agreements.fields.map((f:any)=>f.key));
  const manifest=(await x.comp(w,app)).manifest;
  assert.deepEqual(manifest.roles.map((r:any)=>[r.role,r.contract,!!r.optional,!!r.integration,!!r.readOnly]).sort(),[['agreements','core.v1',false,false,false],['organizations','core.v1',false,false,false],['people','core.v1',true,false,false],['programs','core.v1',true,false,false],['studies','core.v1',true,false,false],['programs.plan_items','programs.v2',true,true,false],['contracts.settings','contracts.v1',false,false,false],['contracts.terms','contracts.v1',false,false,false],['contracts.obligations','contracts.v1',false,false,false]].sort());
  const empty=(await x.run(w,app)).html;assert.match(empty,/No agreements yet/);assert.doesNotMatch(empty,/ct-banner bad|could not be shown/);
  assert.deepEqual((await appIntegrations(x.db,actor,w,await x.comp(w,app))).find((i:any)=>i.role==='programs.plan_items'),{role:'programs.plan_items',name:'Program plan items',source:'own',chosen:false,provider:'Programs',offer:'install'});
  assert.match((await x.run(w,app,{section:'settings'})).html,/Works with Programs\. <button[^>]*data-trialy-integration="install programs\.plan_items"/);
  // Own milestone entries and an agreement that expires before the key milestone (entered through the app, reviewed).
  const prog=await x.save(w,map.programs.typeId,{name:'PX-101',stage:'phase_1',status:'active',archived:false});
  const org=await x.save(w,map.organizations.typeId,{name:'Corvane Biologics',org_type:'cdmo',archived:false});
  const msOpen=await x.run(w,app,{section:'settings'},{kind:'click',action:'add:milestones'});
  await x.approve(w,await x.run(w,app,msOpen.state,{kind:'submit',action:'save-record',form:{name:'Phase 1 topline data',program_id:prog,item_type:'milestone',end_date:'2028-03-31',status:'planned',is_key:'true'}}));
  const agOpen=await x.run(w,app,{section:'register'},{kind:'click',action:'add:agreements'});
  const created=await x.run(w,app,agOpen.state,{kind:'submit',action:'save-record',form:{name:'Supply agreement — Corvane',agreement_type:'cmo_supply',counterparty_id:org,status:'active',program_id:prog,effective_date:'2025-10-01',expiry_date:'2027-09-30',total_value:'2400000',currency:'EUR'}});
  assert.equal((await x.rows(map.agreements.typeId)).length,0,'nothing written before approval');await x.approve(w,created);
  const agId=(await x.rows(map.agreements.typeId))[0].id;
  // The starting key terms follow once the agreement has its ID: notice deadline stored on save (30 Sep 2027 − 180 d = 3 Apr 2027).
  await x.approve(w,await x.run(w,app,created.state,{kind:'click',action:'pending-save:0'}));
  {const o=await x.run(w,app,{},{kind:'click',action:'terms:'+agId});await x.approve(w,await x.run(w,app,o.state,{kind:'submit',action:'save-terms',form:{renewal:'option',notice_days:'180',renewal_term_months:'24'}}));}
  assert.equal((await x.rows(map['contracts.terms'].typeId))[0].data.notice_deadline,'2027-04-03');
  const ownMs=(await x.rows(map['programs.plan_items'].typeId))[0].id;
  const obOpen=await x.run(w,app,{section:'obligations'},{kind:'click',action:'add:obligations'});
  await x.approve(w,await x.run(w,app,obOpen.state,{kind:'submit',action:'save-record',form:{agreement_id:agId,title:'Milestone fee on topline data',kind:'payment',direction:'we_owe',trigger:'Phase 1 topline data',milestone_id:ownMs,amount:'250000',currency:'EUR',status:'open'}}));
  assert.match(text((await x.run(w,app)).html),/Supply agreement — Corvane Expires 30 Sep 2027, before Phase 1 topline data \(31 Mar 2028\)/);

  // 2. Add Programs: it reuses Contracts' programs table (adds its health fields); Contracts keeps its own milestones and now offers "Use its milestones".
  const p=await x.install(w,P,'Programs');const pmap=x.mapOf(await x.comp(w,p.receipt.appId));
  assert.equal(pmap.programs.typeId,map.programs.typeId,'one shared programs table');
  assert.equal(x.mapOf(await x.comp(w,app))['programs.plan_items'].typeId,map['programs.plan_items'].typeId);
  assert.equal((await appIntegrations(x.db,actor,w,await x.comp(w,app))).find((i:any)=>i.role==='programs.plan_items').offer,'connect');
  assert.match((await x.run(w,app,{section:'settings'})).html,/Programs is in your workspace\. <button[^>]*data-trialy-integration="connect programs\.plan_items"[^>]*>Use its milestones/);
  const pms=await x.save(w,pmap['programs.plan_items'].typeId,{name:'First patient dosed',program_id:prog,item_type:'milestone',function:'clinical',end_date:'2027-12-15',status:'planned',is_key:true,archived:false});
  const both=await readIntegration(f,actor,w,{appId:app,role:'programs.plan_items'});
  assert.equal(both.own!.records,1);assert.deepEqual(both.providers.map((q:any)=>[q.appName,q.typeId,q.records]),[['Programs',pmap['programs.plan_items'].typeId,1]]);
  await assert.rejects(chooseIntegrationSource(f,{...actor,origin:'ai'},w,{appId:app,expectedVersion:both.version,role:'programs.plan_items',source:pmap['programs.plan_items'].typeId}),/cannot approve its own changes/);
  await chooseIntegrationSource(f,actor,w,{appId:app,expectedVersion:both.version,role:'programs.plan_items',source:pmap['programs.plan_items'].typeId});
  const linked=await x.comp(w,app),lmap=x.mapOf(linked);
  assert.equal(lmap['programs.plan_items'].typeId,pmap['programs.plan_items'].typeId);assert.deepEqual(lmap['programs.plan_items'].writableFields,[]);
  assert.ok(linked.manifest.fields.filter((m:any)=>m.typeId===pmap['programs.plan_items'].typeId).every((m:any)=>m.mode==='read'));
  assert.equal(await x.count("SELECT count(*)::int n FROM records WHERE type_id=$1 AND state<>'archived'",[map['programs.plan_items'].typeId]),1,'own entries stay in Database; nothing merged');
  const ls=text((await x.run(w,app,{section:'settings'})).html);assert.match(ls,/From Programs, read only here/);assert.match(ls,/First patient dosed/);assert.doesNotMatch(ls,/Phase 1 topline data/);
  // Milestone-linked obligations read Programs (read only): link one through the app, see the name and the "expires before" check from Programs.
  const ob=(await x.rows(map['contracts.obligations'].typeId))[0];
  const ed=await x.run(w,app,{section:'obligations'},{kind:'click',action:'edit:obligations:'+ob.id});
  await x.approve(w,await x.run(w,app,ed.state,{kind:'submit',action:'save-record',form:{milestone_id:pms,trigger:'First patient dosed'}}));
  const lo=text((await x.run(w,app,{section:'obligations'})).html);assert.match(lo,/Milestone: First patient dosed \(15 Dec 2027\)/);
  assert.match(text((await x.run(w,app)).html),/Expires 30 Sep 2027, before First patient dosed \(15 Dec 2027\)/);
  assert.equal((await x.run(w,app,{section:'settings'})).html.includes('data-action="add:milestones"'),false,'no manual milestone entry once linked');

  // 3. Archive Programs: Contracts keeps working with the same milestones (its table stays).
  const records=await x.count('SELECT count(*)::int n FROM records WHERE workspace_id=$1',[w]);
  const change=async(op:any)=>{const pv=await f.preview(actor,w,op);return f.confirm(actor,w,pv.id,pv.digest);};
  await change({kind:'archive_component',componentId:p.receipt.appId,expectedVersion:await x.version(p.receipt.appId),archived:true});
  assert.equal(await x.count('SELECT count(*)::int n FROM records WHERE workspace_id=$1',[w]),records);
  for(const sct of ['overview','register','families','obligations','cdas','pipeline','settings']){const h=(await x.run(w,app,{section:sct})).html;assert.doesNotMatch(h,/ct-banner bad|could not be shown/,sct);}
  assert.match(text((await x.run(w,app)).html),/before First patient dosed/);

  // 4. Remove one tab (people) and add it back: nothing deleted, the same table reconnects.
  const c2=await x.comp(w,app),peopleType=lmap.people.typeId;
  const withMap=(src:string,m:any)=>src.replace(/^const templateConfiguration=(.+);\n/,(_:string,json:string)=>'const templateConfiguration='+JSON.stringify({...JSON.parse(json),tableMap:JSON.stringify(m)})+';\n');
  const revise=async(m:any,b:any[],man:any[])=>{const cc=await x.comp(w,app);return change({kind:'save_component',componentId:cc.id,expectedVersion:cc.version,projectId:cc.project_id,content:{name:cc.name,format:'frontend-js',source:withMap(cc.source,m),sourceAccess:cc.source_access??'workspace',bindings:b,manifest:{...cc.manifest,fields:man}}});};
  const noPeople={...lmap};delete noPeople.people;
  await revise(noPeople,c2.bindings.filter((b:any)=>b.typeId!==peopleType),c2.manifest.fields.filter((m:any)=>m.typeId!==peopleType));
  assert.doesNotMatch((await x.run(w,app,{},{kind:'click',action:'details:agreements:'+agId})).html,/Contacts at|could not be shown/);
  assert.equal(await x.count('SELECT count(*)::int n FROM records WHERE workspace_id=$1',[w]),records);
  await revise(lmap,c2.bindings,c2.manifest.fields);assert.equal(x.mapOf(await x.comp(w,app)).people.typeId,peopleType);
  assert.match((await x.run(w,app,{},{kind:'click',action:'details:agreements:'+agId})).html,/Contacts at Corvane Biologics/);

  // 5. Archive first and reinstall: fields kept, automation back switched off, restore offered before a new copy.
  const action=randomUUID();await pg.query("INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,approved_by) VALUES($1,$2,$3,$4,'{\"name\":\"Weekly contract digest\"}',$3)",[action,w,actor.userId,app]);
  const fieldsBefore=(await pg.query<any>('SELECT id,fields,archived_fields FROM entity_types WHERE workspace_id=$1 ORDER BY id',[w])).rows;
  await change({kind:'archive_component',componentId:app,expectedVersion:await x.version(app),archived:true});
  assert.deepEqual((await pg.query<any>('SELECT id,fields,archived_fields FROM entity_types WHERE workspace_id=$1 ORDER BY id',[w])).rows,fieldsBefore);
  assert.ok((await archivedItems(f,actor,w,{kind:'apps'})).items.some((i:any)=>i.id===app));
  await assert.rejects(()=>installCatalogApp(f,actor,w,{templateId:C.id,version:C.version,digest:C.digest,name:'Contracts',requestKey:randomUUID()}),/Restore your archived Contracts app/);
  await change({kind:'archive_component',componentId:app,expectedVersion:await x.version(app),archived:false});
  const j=(await pg.query<any>('SELECT paused,deleted_at FROM app_actions WHERE id=$1',[action])).rows[0];assert.deepEqual([j.paused,j.deleted_at],[true,null]);
  assert.match(text((await x.run(w,app)).html),/Supply agreement — Corvane/);

  // Reverse order: Programs first; Contracts connects its plan items at install (Connect is the default), read only.
  const w2=(await s.createWorkspace(actor,'Programs first')).id;
  const p2=await x.install(w2,P,'Programs');const p2map=x.mapOf(await x.comp(w2,p2.receipt.appId));
  const c3=await x.install(w2,C,'Contracts');
  assert.deepEqual(c3.step.tables.map((t:any)=>t.role).sort(),['people','programs','programs.plan_items']);
  const c3map=x.mapOf(await x.comp(w2,c3.receipt.appId));
  assert.equal(c3map['programs.plan_items'].typeId,p2map['programs.plan_items'].typeId);assert.deepEqual(c3map['programs.plan_items'].writableFields,[]);
  assert.equal(c3map.programs.typeId,p2map.programs.typeId);
  assert.equal((await appIntegrations(x.db,actor,w2,await x.comp(w2,c3.receipt.appId))).find((i:any)=>i.role==='programs.plan_items').source,'linked');
  assert.doesNotMatch((await x.run(w2,c3.receipt.appId,{section:'settings'})).html,/data-trialy-integration|ct-banner bad/);
  // Explicit separate data creates Contracts' own tables even with Programs present.
  const sep=await x.install(w2,C,'Contracts separate',{programs:'new',people:'new','programs.plan_items':'new'},{createNew:true});
  assert.notEqual(x.mapOf(await x.comp(w2,sep.receipt.appId))['programs.plan_items'].typeId,p2map['programs.plan_items'].typeId);
 }finally{await x.pg.close();}
});

test('acceptance 7: with Runway installed first, Contracts reuses its agreements table and Runway plan lines link to agreements created in Contracts',async()=>{
 const x=await contractsSuite();const {s,actor,C,R}=x;
 try{
  const w=(await s.createWorkspace(actor,'Runway first')).id;
  const r=await x.install(w,R,'Runway');const rmap=x.mapOf(await x.comp(w,r.receipt.appId));
  const plan=await readCatalogInstallation(x.db,actor,w,{templateId:C.id,version:C.version});
  const ag=plan.roles.find((q:any)=>q.role==='agreements');assert.deepEqual(ag.candidates[0].apps,['Runway']);
  assert.deepEqual(ag.candidates[0].addFields,['parent_id','program_id','study_id','total_value','currency','signed_on','owner']);
  const c=await x.install(w,C,'Contracts');const cmap=x.mapOf(await x.comp(w,c.receipt.appId));
  assert.equal(cmap.agreements.typeId,rmap.agreements.typeId);assert.equal(cmap.organizations.typeId,rmap.organizations.typeId);assert.equal(cmap.programs.typeId,rmap.programs.typeId);
  assert.equal(await x.count("SELECT count(*)::int n FROM entity_types WHERE workspace_id=$1 AND name ILIKE '%agreements' AND deleted_at IS NULL",[w]),1,'one agreements table');
  // Runway still opens after the additive fields.
  assert.doesNotMatch((await x.run(w,r.receipt.appId)).html,/could not be calculated|not bound/);
  const org=await x.save(w,cmap.organizations.typeId,{name:'Helix Clinical Research',org_type:'cro',archived:false});
  const open=await x.run(w,c.receipt.appId,{section:'register'},{kind:'click',action:'add:agreements'});
  await x.approve(w,await x.run(w,c.receipt.appId,open.state,{kind:'submit',action:'save-record',form:{name:'SOW 1 — PX-101 Phase 1 conduct',agreement_type:'sow_work_order',counterparty_id:org,status:'active',total_value:'1200000',currency:'EUR',effective_date:'2025-01-15',expiry_date:'2027-12-31'}}));
  const agId=(await x.rows(cmap.agreements.typeId))[0].id;
  // Runway's plan-line editor lists the agreement created in Contracts; a reviewed Runway line stores its record ID.
  const lines=(await x.run(w,r.receipt.appId,{},{kind:'click',action:'add:lines'}));
  assert.match(lines.html,new RegExp('<option value="'+agId+'"[^>]*>SOW 1 — PX-101 Phase 1 conduct'));
  const line=await x.save(w,rmap['runway.plan_lines'].typeId,{name:'Helix SOW 1 fees',direction:'spend',category:'Clinical',agreement_id:agId,counterparty_id:org,driver:'monthly',amount:50000,currency:'EUR',start_month:'2026-12-01',end_month:'2027-11-01',status:'committed',archived:false});
  assert.equal((await x.rows(rmap['runway.plan_lines'].typeId)).find((q:any)=>q.id===line).data.agreement_id,agId);
 }finally{await x.pg.close();}
});

test('acceptance 8: a Data Room or custom app reads agreements and contracts.obligations per the registry; only Contracts writes the output',async()=>{
 const x=await contractsSuite();const {s,f,actor,C}=x;
 try{
  const w=(await s.createWorkspace(actor,'Data room')).id;
  const c=await x.install(w,C,'Contracts');const cmap=x.mapOf(await x.comp(w,c.receipt.appId));
  const org=await x.save(w,cmap.organizations.typeId,{name:'Northwind Bio',org_type:'company',archived:false});
  const ag=await x.save(w,cmap.agreements.typeId,{name:'Mutual CDA — Northwind Bio',agreement_type:'cda_nda',counterparty_id:org,status:'active',signed_on:'2025-02-27',archived:false});
  await x.save(w,cmap['contracts.obligations'].typeId,{agreement_id:ag,title:'Return information on request',kind:'other',direction:'they_owe',status:'open',verified:true,archived:false});
  const agFields=['name','agreement_type','status','counterparty_id','signed_on'],obFields=['agreement_id','title','kind','direction','status','verified'];
  const source=`const a=tools.call('records.read',{typeId:${JSON.stringify(cmap.agreements.typeId)},limit:10,offset:0,filters:{}});const o=tools.call('records.read',{typeId:${JSON.stringify(cmap['contracts.obligations'].typeId)},limit:10,offset:0,filters:{}});const r=tools.call('roles.list',{});return {html:'<p>'+a.rows.map(x=>x.data.name+' ('+x.data.agreement_type+')').join(', ')+' | '+o.rows.map(x=>x.data.title+(x.data.verified?' verified':'')).join(', ')+' | '+r.roles.map(x=>x.role+':'+x.contract+':'+x.readOnly).join(',')+'</p>',css:'',state:{}};`;
  const manifest=(mode:string)=>({version:1,scope:'workspace',fields:[...agFields.map(k=>({id:'agreements_'+k,typeId:cmap.agreements.typeId,field:k,schemaVersion:0,kind:k==='signed_on'?'date':'text',mode:'read'})),...obFields.map(k=>({id:'obligations_'+k,typeId:cmap['contracts.obligations'].typeId,field:k,schemaVersion:0,kind:k==='verified'?'boolean':['kind','direction','status'].includes(k)?'select':'text',mode}))],
   roles:[{role:'agreements',contract:'core.v1',readOnly:true,typeId:cmap.agreements.typeId},{role:'contracts.obligations',contract:'contracts.v1',...(mode==='read'?{readOnly:true}:{}),typeId:cmap['contracts.obligations'].typeId}]});
  const content=(mode:string)=>({name:'Data Room (custom)',format:'frontend-js',source,sourceAccess:'workspace',bindings:[{typeId:cmap.agreements.typeId,fields:agFields},{typeId:cmap['contracts.obligations'].typeId,fields:obFields}],manifest:manifest(mode)});
  // A writer declaration is refused while Contracts is the live writer of the output.
  await assert.rejects((async()=>{const pv=await f.preview(actor,w,{kind:'save_component',projectId:null,content:content('write')} as any);await f.confirm(actor,w,pv.id,pv.digest);})(),/writes Contract obligations|role_writer|Bind it read-only/);
  const pv=await f.preview(actor,w,{kind:'save_component',projectId:null,content:content('read')} as any);const saved=await f.confirm(actor,w,pv.id,pv.digest);
  const out=await f.runFrontend(actor,w,{componentId:saved.id,expectedVersion:(await x.comp(w,saved.id)).version,event:{kind:'open'}});
  assert.match(text(out.html),/Mutual CDA — Northwind Bio \(cda_nda\) \| Return information on request verified \| agreements:core\.v1:true,contracts\.obligations:contracts\.v1:true/);
 }finally{await x.pg.close();}
});

/* Acceptance 3: extraction by Claude and by ChatGPT, each through its own MCP connection (/claude and /mcp), on real uploaded originals
 * whose text the real worker extracted. The proposals below are what this assistant read from the fictional originals: exact quotes and pages. */
test('acceptance 3: Claude and ChatGPT each propose terms and obligations with quotes and pages; nothing is verified without a person; non-AI-readable originals are reported',async()=>{
 const x=await contractsSuite();const {pg,s,f,actor,C}=x;
 try{
  const w=(await s.createWorkspace(actor,'Extraction')).id;await pg.query('UPDATE workspaces SET ai_enabled=true,claude_enabled=true WHERE id=$1',[w]);
  const c=await x.install(w,C,'Contracts');const app=c.receipt.appId,map=x.mapOf(await x.comp(w,app));
  const org=await x.save(w,map.organizations.typeId,{name:'Northwind Bio',org_type:'company',archived:false});
  const org2=await x.save(w,map.organizations.typeId,{name:'Brightwater Data Services',org_type:'other',archived:false});
  // The person uploads two signed originals through the platform upload (the same preview and commit the in-app dialog calls).
  const upload=async(name:string,bytes:Buffer,ai:boolean)=>{const p=await s.previewFile(actor,w,{filename:name,mime:'application/pdf',bytes,ai});return (await s.commit(actor,p.id,p.digest)).objects[0];};
  const cda=await upload('Northwind CDA (signed, fictional).pdf',pdf(SIGNED_CDA),true);
  const dpa=await upload('Brightwater DPA (signed, fictional).pdf',pdf([['DATA PROCESSING AGREEMENT (FICTIONAL)','This Agreement starts on 1 December 2025 and ends on 31 December 2026.'],['It renews automatically for twelve (12) months unless terminated on thirty (30) days written notice.','The Processor shall notify a personal data breach within seventy-two (72) hours.']]),true);
  const scan=await upload('Lab lease (scan, not AI-readable).pdf',pdf([['LEASE (FICTIONAL)','Rent is EUR 20,000 per month.']]),false);
  while(await runOne(x.db));
  const call=await x.assistants(),claude=call('/claude'),chatgpt=call('/mcp');
  // Each assistant sees only AI-readable originals; the scan is not listed and cannot be read (reported, never guessed).
  for(const ask of [claude,chatgpt]){const docs=await ask('list_documents',{workspaceId:w});const ids=docs.map((d:any)=>d.id);assert.ok(ids.includes(cda.versionId)&&ids.includes(dpa.versionId));assert.ok(!ids.includes(scan.versionId));
   await assert.rejects(ask('read_document_text',{workspaceId:w,versionId:scan.versionId}),/not found|could not|unavailable/i);}
  const commit=async(p:any)=>(await s.commit({...actor,actionConfirmed:true} as any,p.id,p.digest)).objects;
  const propose=async(ask:any,op:any)=>commit(await ask('prepare_change',{workspaceId:w,operation:op}));

  // Claude: reads the CDA and proposes the agreement, then its terms (quotes with pages) once the agreement ID exists.
  const ctext=await claude('read_document_text',{workspaceId:w,versionId:cda.versionId});assert.equal(ctext.status,'ready');
  for(const q of ['This Agreement shall remain in force until 1 March 2027.','The obligations of confidentiality shall survive for five (5) years after expiry.','This Agreement is governed by the laws of Denmark.'])assert.ok(ctext.text.includes(q),q);
  const [cAg]=await propose(claude,{kind:'create_record',typeId:map.agreements.typeId,data:{name:'Mutual CDA — Northwind Bio',agreement_type:'cda_nda',counterparty_id:org,status:'active',effective_date:'2025-03-01',expiry_date:'2027-03-01',signed_on:'2025-02-27',archived:false}});
  const quotes={confidentiality_years:{quote:'The obligations of confidentiality shall survive for five (5) years after expiry.',page:2},governing_law:{quote:'This Agreement is governed by the laws of Denmark.',page:3},purpose:{quote:'The purpose is to evaluate a co-development of PX-202.',page:1}};
  await propose(claude,{kind:'create_record',typeId:map['contracts.terms'].typeId,data:{agreement_id:cAg.id,confidentiality_years:5,confidentiality_end:'2032-03-01',cda_direction:'mutual',purpose:'Evaluate a co-development of PX-202',governing_law:'Denmark',document_id:cda.id,document_version_id:cda.versionId,extraction_status:'proposed',source_quotes:JSON.stringify(quotes)}});
  await propose(claude,{kind:'create_record',typeId:map['contracts.obligations'].typeId,data:{agreement_id:cAg.id,title:'Return or destroy information on request',kind:'other',direction:'they_owe',trigger:'Written request',status:'open',verified:false,source_quote:'Each Party shall return or destroy Confidential Information within thirty (30) days of a written request.',source_page:3,source_document_version_id:cda.versionId,archived:false}});

  // ChatGPT: reads the DPA and proposes its agreement, terms and obligation.
  const gtext=await chatgpt('read_document_text',{workspaceId:w,versionId:dpa.versionId});assert.ok(gtext.text.includes('The Processor shall notify a personal data breach within seventy-two (72) hours.'));
  const [gAg]=await propose(chatgpt,{kind:'create_record',typeId:map.agreements.typeId,data:{name:'Data processing agreement — Brightwater',agreement_type:'data_processing',counterparty_id:org2,status:'active',effective_date:'2025-12-01',expiry_date:'2026-12-31',archived:false}});
  await propose(chatgpt,{kind:'create_record',typeId:map['contracts.terms'].typeId,data:{agreement_id:gAg.id,renewal:'automatic',renewal_term_months:12,notice_days:30,notice_deadline:'2026-12-01',document_id:dpa.id,document_version_id:dpa.versionId,extraction_status:'proposed',source_quotes:JSON.stringify({renewal:{quote:'It renews automatically for twelve (12) months unless terminated on thirty (30) days written notice.',page:2},notice_days:{quote:'It renews automatically for twelve (12) months unless terminated on thirty (30) days written notice.',page:2}})}});
  await propose(chatgpt,{kind:'create_record',typeId:map['contracts.obligations'].typeId,data:{agreement_id:gAg.id,title:'Breach notification within 72 hours',kind:'notice',direction:'they_owe',trigger:'Personal data breach',status:'open',verified:false,source_quote:'The Processor shall notify a personal data breach within seventy-two (72) hours.',source_page:1,source_document_version_id:dpa.versionId,archived:false}});

  // Both principals' proposals are in the register, unverified and not counted.
  const ov=text((await x.run(w,app)).html);assert.match(ov,/4 unverified extractions/);assert.match(ov,/Mutual CDA — Northwind Bio Proposed key terms from the assistant/);assert.match(ov,/Data processing agreement — Brightwater Proposed key terms/);
  assert.equal((await x.rows(map['contracts.obligations'].typeId)).filter((r:any)=>r.data.verified===true).length,0);
  // In the app, the quotes are checked against the real extracted text: the CDA quote on page 2 is found; the DPA quote's page 1 is wrong (it is on page 2).
  const rv=await x.run(w,app,{},{kind:'click',action:'review:'+cAg.id});const rvt=text(rv.html);
  assert.match(rvt,/survive for five \(5\) years after expiry\.” \(p\. 2\) Quote found on page 2/);assert.match(rvt,/governed by the laws of Denmark\.” \(p\. 3\) Quote found on page 3/);assert.match(rvt,/within thirty \(30\) days of a written request\.” \(p\. 3\) Quote found on page 3/);
  assert.match(text((await x.run(w,app,{},{kind:'click',action:'review:'+gAg.id})).html),/within seventy-two \(72\) hours\.” \(p\. 1\) Found, but on page 2/);
  // An assistant cannot verify once the owner adds the documented column rules (Database → column, deny Claude and ChatGPT writes).
  const obBefore=(await x.rows(map['contracts.obligations'].typeId)).find((r:any)=>r.data.agreement_id===cAg.id).id;
  // Without the rule the platform would let the assistant prepare it (the human review is then the only barrier): the preview is discarded unused.
  const loose=await claude('prepare_change',{workspaceId:w,operation:{kind:'update_record',recordId:obBefore,expectedVersion:0,data:{verified:true}}});await claude('discard_preview',{previewId:loose.id});
  const grid=new AccessGrid(x.db),rules=['verified'].map(field=>({kind:'column',resourceId:map['contracts.obligations'].typeId,field})).concat(['extraction_status','verified_by','verified_on'].map(field=>({kind:'column',resourceId:map['contracts.terms'].typeId,field})));
  const access=async()=>(await pg.query<any>('SELECT access_version FROM workspaces WHERE id=$1',[w])).rows[0]?.access_version;
  const version=(await grid.read(actor,w)).version??await access();
  await grid.save(actor,w,{expectedVersion:version,changes:rules.flatMap(r=>(['claude','chatgpt'] as const).map(subject=>({subject,...r,read:true,write:false})))});
  const obId=(await x.rows(map['contracts.obligations'].typeId)).find((r:any)=>r.data.agreement_id===cAg.id).id;
  for(const ask of [claude,chatgpt]){const e=await ask('prepare_change',{workspaceId:w,operation:{kind:'update_record',recordId:obId,expectedVersion:0,data:{verified:true}}}).then(()=>null,(err:any)=>err);assert.match(String(e?.message),/Editing is restricted for one or more fields/);}
  // A person verifies in the app: named, dated, one reviewed batch.
  const done=await x.run(w,app,rv.state,{kind:'submit',action:'review-submit',form:{verified_by:'Owner (fictional)',terms_decision:'verify',['ob_'+obId]:'verify'}});
  await x.approve(w,done);
  const t=(await x.rows(map['contracts.terms'].typeId)).find((r:any)=>r.data.agreement_id===cAg.id).data;
  assert.deepEqual([t.extraction_status,t.verified_by,t.confidentiality_end],['verified','Owner (fictional)','2032-03-01']);assert.match(String(t.verified_on),/^\d{4}-\d{2}-\d{2}$/);
  assert.equal((await x.rows(map['contracts.obligations'].typeId)).find((r:any)=>r.id===obId).data.verified,true);
  // The in-app documents capability: the person sees all three originals with their AI-readable flag; the CDA answer uses the verified terms.
  const det=text((await x.run(w,app,{},{kind:'click',action:'details:agreements:'+cAg.id})).html);assert.match(det,/Northwind CDA \(signed, fictional\)\.pdf · v0 AI-readable Yes Text extraction Ready/);assert.match(det,/Extraction Verified by Owner \(fictional\)/);
  const at=await x.run(w,app,{},{kind:'click',action:'attach:'+gAg.id});assert.match(at.html,/Lab lease \(scan, not AI-readable\)\.pdf · v0 · [0-9-]+ · not AI-readable/);
  assert.match(text((await x.run(w,app,{section:'cdas',cdaQuery:'northwind'})).html),/Yes — 1 active CDA with Northwind Bio .*Mutual · signed 27 Feb 2025 · term to 1 Mar 2027 · confidential until 1 Mar 2032/);
  const search=text((await x.run(w,app,{section:'register',query:'seventy-two',docSearch:true})).html);assert.match(search,/In signed originals Data processing agreement — Brightwater Brightwater DPA \(signed, fictional\)\.pdf · page 2/);
 }finally{await x.pg.close();}
});

test('reviewed saves through the platform: native layout, the upload event attaches a new original, and a stale edit is rejected',async()=>{
 const x=await contractsSuite();const {s,f,actor,C}=x;
 try{
  const w=(await s.createWorkspace(actor,'Layout')).id;const c=await x.install(w,C,'Contracts');const app=c.receipt.appId,map=x.mapOf(await x.comp(w,app));
  const org=await x.save(w,map.organizations.typeId,{name:'Kestrel Advisory Ltd',org_type:'other',archived:false});
  const ag=await x.save(w,map.agreements.typeId,{name:'Advisory agreement — Kestrel',agreement_type:'consulting_advisory',counterparty_id:org,status:'active',archived:false});
  // Upload through the app's dialog path, then the app receives the version and proposes the attachment.
  const p=await s.previewFile(actor,w,{filename:'Kestrel advisory (signed).pdf',mime:'application/pdf',bytes:pdf([['ADVISORY AGREEMENT (FICTIONAL)']]),ai:true});const doc=(await s.commit(actor,p.id,p.digest)).objects[0];
  const up=await x.run(w,app,{},{kind:'change',action:'document:uploaded:attach:'+ag,value:doc.versionId});assert.match(text(up.html),/Attach the signed original to Advisory agreement — Kestrel/);
  await x.approve(w,await x.run(w,app,up.state,{kind:'click',action:'confirm-attach'}));
  const t=(await x.rows(map['contracts.terms'].typeId))[0].data;assert.deepEqual([t.agreement_id,t.document_id,t.document_version_id,t.extraction_status],[ag,doc.id,doc.versionId,'none']);
  // Native layout save and reload.
  const comp=await x.comp(w,app),profile=readCustomLayout(comp.source)!.profile;profile.tabs.reverse();profile.heading='Agreements';
  const pv=await prepareToolLayout(f,actor,w,{componentId:comp.id,expectedVersion:comp.version,name:'Agreements',description:'',customLayout:profile});await f.confirm(actor,w,pv.id,pv.digest);
  const saved=await x.comp(w,app);assert.deepEqual(saved.bindings,comp.bindings);assert.deepEqual(saved.manifest,comp.manifest);assert.match((await x.run(w,app,{layout:{heading:'Stale'}})).html,/<h1 class="ct-title">Agreements<\/h1>/);
  // Stale edit: the record changed after the editor opened; the server rejects the old version.
  const e=await x.run(w,app,{},{kind:'click',action:'edit:agreements:'+ag});await x.update(w,ag,{owner:'Concurrent'});
  await assert.rejects(x.run(w,app,e.state,{kind:'submit',action:'save-record',form:{owner:'Stale'}}),/changed|version|stale/i);
  assert.equal((await x.rows(map.agreements.typeId))[0].data.owner,'Concurrent');
  // Unsaved previews never read documents.
  const {appDocuments}=await import('../src/workspace/app-documents.js');assert.deepEqual(await appDocuments(x.db,actor,w,false,'documents.list',{}),{unavailable:true,message:'Save the app to use documents'});
 }finally{await x.pg.close();}
});
