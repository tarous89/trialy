import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {AsyncLocalStorage} from 'node:async_hooks';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,withDatabaseContext,setDatabaseContext,databaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {syncTemplateCatalog,installCatalogApp} from '../src/workspace/template-catalog.js';
import {dataAccessStep,confirmDataAccess} from '../src/workspace/data-access.js';
import {AppMonitoring} from '../src/app-services/monitoring.js';
import {AutomationService} from '../src/automations/service.js';
import {AutomationEvents} from '../src/automations/events.js';
import {AutomationManagement} from '../src/automations/management.js';
import {reconcileRecipeSetups} from '../src/automations/recipes.js';
import {readRecipes} from '../src/automations/recipes-schema.js';
import {dispatchDue} from '../src/automations/worker.js';
import {nextCalendar} from '../src/automations/schedules.js';
import {AppActions,dispatchAppActions} from '../src/app-services/service.js';
import {inspectAppDesign} from '../src/workspace/design-quality.js';
import type {Actor} from '../src/shared/schema.js';

/* PARTNERSHIPS.md §13 end to end: disposable database with every migration and the runtime role, the real catalog installer and
 * Use existing data? step, the app in the production runtime, reviewed record changes confirmed by a person, the shared research runner,
 * the run-completed email action and its delivery job, and archive first. Fictional data only; no deployed account is used. */
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ');
async function suite(){
 const pg=new PGlite();for(const n of (await readdir('migrations')).filter(x=>x.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+n,'utf8'));await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();
 const db:Database={query:async(q,v)=>storage.getStore()?.query(q,v)??db.transaction(tx=>tx.query(q,v)),transaction:async fn=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async raw=>{await raw.exec(databaseContext().service==='worker'?'SET LOCAL ROLE trialy_worker':'SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(q,v)=>{await setDatabaseContext(raw as any);return raw.query(q,v) as any;}};return storage.run(tx,()=>fn(tx));});},close:()=>pg.close()};
 const raw:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const human:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...human,origin:'ai',connectionFamily:randomUUID(),clientId:randomUUID()};
 await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[human.userId,'anna@northwind.invalid','Anna (fictional)']);
 await pg.query("INSERT INTO oauth_tokens(hash,user_id,client_id,kind,family,expires_at) VALUES($1,$2,$3,'refresh',$4,$5)",[randomUUID(),human.userId,ai.clientId,ai.connectionFamily,Date.now()+86400000]);
 await syncTemplateCatalog(raw);
 // Partnerships 2.0.0, Contracts and Data Room are drafts in the repository catalog; they are approved only inside this disposable database.
 await pg.query("UPDATE app_template_catalog SET status='approved' WHERE (template_id='life.partnership-tracker' AND version='2.0.0') OR (template_id='life.contracts' AND version='1.0.0') OR (template_id='life.data-room' AND version='1.0.0')");
 const f=new WorkspaceFoundation(db),s=new Service(db),catalog=new AppTemplates(undefined,db);
 const T={bd:await catalog.read({templateId:'life.partnership-tracker',version:'2.0.0'}),contracts:await catalog.read({templateId:'life.contracts',version:'1.0.0'}),room:await catalog.read({templateId:'life.data-room',version:'1.0.0'}),programs:await catalog.read({templateId:'life.project-oversight',version:'2.1.0'})};
 const install=async(w:string,t:any,name:string,connections:Record<string,string>={})=>{const target={install:{templateId:t.id,version:t.version,digest:t.digest,name,requestKey:randomUUID()}};const step=await dataAccessStep(f,human,w,target);
  return {step,receipt:step.needed?await confirmDataAccess(f,human,w,{...target,connections,stepDigest:step.digest,...(step.automations.length?{automations:step.automations.map((r:any)=>({key:r.key,enabled:true,settings:{}}))}:{})}):await installCatalogApp(f,human,w,target.install)};};
 const comp=async(w:string,id:string)=>(await f.readComponent(human,w,id)).component;
 const mapOf=(c:any)=>JSON.parse(JSON.parse(/^const templateConfiguration=(.+);\n/.exec(c.source)![1]).tableMap);
 const app=(w:string,id:string,who:Actor=human)=>{let state:any={};const v:any={html:'',last:null,state:()=>state,
  async ev(event:any){const c=await comp(w,id);const out:any=await f.runFrontend(who,w,{componentId:c.id,expectedVersion:c.version,state,event:{value:null,form:{},...event}});state=out.state;v.html=out.html;v.last=out;return out;},
  open:(st:any={})=>{state={...state,...st};return v.ev({kind:'open',action:''});},click:(a:string)=>v.ev({kind:'click',action:a}),change:(a:string,value:any)=>v.ev({kind:'change',action:a,value}),submit:(a:string,form:any={})=>v.ev({kind:'submit',action:a,form}),
  async approve(out:any=v.last){if(!out?.proposal)throw Error('No proposal: '+(out?.state?.notice??''));const r=await f.confirm(human,w,out.proposal.id,out.proposal.digest);await v.ev({kind:'open',action:''});return r;}};return v;};
 const rows=async(typeId:string)=>(await pg.query<any>("SELECT id,version,data FROM records WHERE type_id=$1 AND state<>'archived' ORDER BY created_at,id",[typeId])).rows;
 const save=async(w:string,typeId:string,data:any)=>{const p=await s.preview(human,w,{kind:'create_record',typeId,data});return (await s.commit(human,p.id,p.digest)).objects[0].id as string;};
 const workspace=async(name:string)=>{const w=(await s.createWorkspace(human,name)).id;await s.setAi(human,w,true);return w;};
 return {pg,db,human,ai,f,s,T,install,comp,mapOf,app,rows,save,workspace};
}
const SCREENS=['overview','pipeline','partners','conferences','activity','research','settings'];

test('Acceptance 9 and package: install alone, with Contracts and Data Room (any order), partner archived, a tab removed, reinstall restore; design gate',async()=>{
 const x=await suite();
 try{await withActor(x.human,async()=>{
  // Alone: shared roles and its own tables; agreements (read-only) is not created; Data Room data gets the app's own manual tables.
  const w=await x.workspace('Partnerships alone');const {receipt}=await x.install(w,x.T.bd,'Partnerships');const id=receipt.appId,c=await x.comp(w,id),map=x.mapOf(c);
  assert.equal(Object.keys(map).length,17);assert.ok(!map.agreements,'Contracts output is only connected, never created');assert.ok(map['dataroom.access_grants']&&map['dataroom.access_grants'].writableFields.length>0,'own manual table');
  assert.deepEqual((c.manifest.roles??[]).filter((r:any)=>r.role==='agreements').map((r:any)=>[r.optional,r.readOnly,r.typeId??null]),[[true,true,null]]);
  const ui=x.app(w,id),frames:any[]=[];for(const section of SCREENS){const out=await ui.open({section,panel:null});assert.doesNotMatch(text(out.html),/could not be shown|Partial data/,section);frames.push({name:section,html:out.html,css:out.css});}
  assert.deepEqual((await inspectAppDesign(frames)).issues,[]);
  // First records from an empty start: standard categories, a partner, an asset, an opportunity (each reviewed).
  await ui.open({section:'settings'});await ui.click('std-cats');await ui.approve();assert.deepEqual((await x.rows(map['partnerships.tag_categories'].typeId)).map((r:any)=>r.data.name).sort(),['Asset group','Channel','Conference']);
  const org=await x.save(w,map.organizations.typeId,{name:'Cedarline Pharma (fictional)',org_type:'partner',archived:false}),prog=await x.save(w,map.programs.typeId,{name:'NWB-101 (fictional)',code:'NWB-101',stage:'phase_1',archived:false});
  await ui.open({section:'pipeline'});await ui.click('add:opps');await ui.change('draft:organization_id',org);await ui.submit('save-record',{name:'Cedarline: NWB-101',organization_id:org,program_id:prog,direction:'out_license',owner:'Anna'});await ui.approve();
  const opp=(await x.rows(map['partnerships.opportunities'].typeId))[0];assert.deepEqual([opp.data.stage,opp.data.owner],['identified','Anna']);
  // Without Contracts, the CDA link is a manual reference.
  await ui.click('open:opp:'+opp.id);assert.match(text(ui.html),/CDA \(manual reference\)/);
  // Contracts and Data Room installed later share organizations; Partnerships keeps working on its own tables (no late reconnection).
  const k=await x.install(w,x.T.contracts,'Contracts'),r=await x.install(w,x.T.room,'Data Room');const km=x.mapOf(await x.comp(w,k.receipt.appId)),rm=x.mapOf(await x.comp(w,r.receipt.appId));
  assert.equal(km.organizations.typeId,map.organizations.typeId);assert.equal(rm.organizations.typeId,map.organizations.typeId);assert.equal(rm.programs.typeId,map.programs.typeId);
  for(const s of SCREENS){await ui.open({section:s,panel:null});assert.doesNotMatch(text(ui.html),/could not be shown|Partial data/,s);}
  const change=async(op:any)=>{const pv=await x.f.preview(x.human,w,op);return x.f.confirm(x.human,w,pv.id,pv.digest);};
  await change({kind:'archive_component',componentId:k.receipt.appId,expectedVersion:(await x.comp(w,k.receipt.appId)).version,archived:true});
  await ui.open({section:'pipeline'});assert.match(text(ui.html),/Cedarline: NWB-101/);
  // Remove one tab (Research) in the layout: nothing is deleted.
  const cc=await x.comp(w,id),cfg=JSON.parse(/^const templateConfiguration=(.+);\n/.exec(cc.source)![1]);
  await change({kind:'save_component',componentId:cc.id,expectedVersion:cc.version,projectId:cc.project_id,content:{name:cc.name,format:'frontend-js',source:cc.source.replace(/^const templateConfiguration=(.+);\n/,()=>'const templateConfiguration='+JSON.stringify({...cfg,layoutProfile:JSON.stringify({visible:{research:false}})})+';\n'),sourceAccess:cc.source_access??'workspace',bindings:cc.bindings,manifest:cc.manifest}});
  await ui.open({section:'overview'});assert.doesNotMatch(ui.html,/aria-label="Research"/);assert.equal((await x.rows(map['partnerships.opportunities'].typeId)).length,1);
  // Archive the app, reinstall offers the restore first; restoring keeps every record.
  await change({kind:'archive_component',componentId:id,expectedVersion:(await x.comp(w,id)).version,archived:true});
  await assert.rejects(()=>installCatalogApp(x.f,x.human,w,{templateId:x.T.bd.id,version:x.T.bd.version,digest:x.T.bd.digest,name:'Partnerships',requestKey:randomUUID()}),/Restore your archived Partnerships app/);
  await change({kind:'archive_component',componentId:id,expectedVersion:(await x.comp(w,id)).version,archived:false});assert.equal((await x.rows(map['partnerships.opportunities'].typeId)).length,1);

  // Installed after Contracts and Data Room: agreements and dataroom.v1 connect at install (read-only); CDA status and engagement show.
  const w2=await x.workspace('Deal pack');const k2=await x.install(w2,x.T.contracts,'Contracts'),r2=await x.install(w2,x.T.room,'Data Room');const km2=x.mapOf(await x.comp(w2,k2.receipt.appId)),rm2=x.mapOf(await x.comp(w2,r2.receipt.appId));
  const pharma=await x.save(w2,km2.organizations.typeId,{name:'Cedarline Pharma (fictional)',org_type:'partner',archived:false});
  const cda=await x.save(w2,km2.agreements.typeId,{name:'CDA: Cedarline (mutual)',counterparty_id:pharma,agreement_type:'cda_nda',status:'active',effective_date:'2026-09-20',archived:false});
  const room='00000000-0000-4000-8000-0000000000aa',grant=await x.save(w2,rm2['dataroom.access_grants'].typeId,{room_id:room,room_name:'NWB-101 licensing room',room_purpose:'licensing',organization_id:pharma,recipient_email:'chloe@cedarline.invalid',granted_on:'2026-10-02',status:'active',source:'tracked'});
  await x.save(w2,rm2['dataroom.engagement'].typeId,{grant_id:grant,organization_id:pharma,document_ref:'d1',document_title:'Key data package',view_count:6,seconds_viewed:1420,last_viewed_on:'2026-11-11',source:'tracked'});
  const b=await x.install(w2,x.T.bd,'Partnerships');const roles=Object.fromEntries(b.step.tables.map((t:any)=>[t.role,t.choice]));
  for(const role of ['organizations','agreements','dataroom.access_grants','dataroom.engagement'])assert.ok(roles[role]&&roles[role]!=='new','Use existing data? offers '+role);
  const bm=x.mapOf(await x.comp(w2,b.receipt.appId));assert.equal(bm.agreements.typeId,km2.agreements.typeId);assert.deepEqual(bm.agreements.writableFields,[]);assert.equal(bm['dataroom.access_grants'].typeId,rm2['dataroom.access_grants'].typeId);assert.deepEqual(bm['dataroom.access_grants'].writableFields,[]);
  const prog2=await x.save(w2,bm.programs.typeId,{name:'NWB-101 (fictional)',code:'NWB-101',stage:'phase_1',archived:false});
  const o2=await x.save(w2,bm['partnerships.opportunities'].typeId,{name:'Cedarline: NWB-101 licence',organization_id:pharma,program_id:prog2,direction:'out_license',stage:'cda',owner:'Anna',archived:false});
  const ui2=x.app(w2,b.receipt.appId);await ui2.open({});await ui2.click('open:opp:'+o2);await ui2.submit('save-gates',{cda_agreement_id:cda,dataroom_room_id:room,term_sheet_agreement_id:'',agreement_id:''});await ui2.approve();
  await ui2.click('open:opp:'+o2);const t2=text(ui2.html);assert.match(t2,/CDA CDA: Cedarline \(mutual\) Signed, active/);assert.match(t2,/Data room NWB-101 licensing room Active/);assert.match(t2,/Engagement: 6 views, about 24 min, last 11 Nov 2026/);
  assert.doesNotMatch(ui2.html,/Record data room access by hand/,'linked Data Room data is read-only here');
 });}finally{await x.pg.close();}
});

test('Acceptance 2, 6 and 8: after-meeting log with stage history through the reviewed path; funnel matches; assistants only propose',async()=>{
 const x=await suite();
 try{await withActor(x.human,async()=>{
  const w=await x.workspace('Meetings');const {receipt}=await x.install(w,x.T.bd,'Partnerships');const id=receipt.appId,map=x.mapOf(await x.comp(w,id)),T=(r:string)=>map[r].typeId;
  const org=await x.save(w,T('organizations'),{name:'Ironvale Pharma (fictional)',org_type:'partner',archived:false}),liam=await x.save(w,T('people'),{name:'Liam Stand',organization_id:org,title:'Head of External Innovation',archived:false});
  const prog=await x.save(w,T('programs'),{name:'NWB-101 (fictional)',code:'NWB-101',stage:'phase_1',archived:false});
  const ui=x.app(w,id);await ui.open({section:'pipeline'});await ui.click('add:opps');await ui.submit('save-record',{name:'Ironvale: Japan rights',organization_id:org,program_id:prog,direction:'out_license',owner:'Marc'});await ui.approve();
  const opp=(await x.rows(T('partnerships.opportunities')))[0];
  await ui.click('open:opp:'+opp.id);await ui.submit('move-stage',{to:'contacted',on:'2026-11-10'});await ui.approve();
  // One message after the meeting: one review with the activity (materials with versions), the stage change with history and two follow-ups.
  await ui.click('panel:log:'+opp.id);await ui.change('f:log:to','non_confidential');
  await ui.submit('save-log',{kind:'meeting',occurred_on:'2026-11-12',organization_id:org,opportunity_id:opp.id,team:'Marc',summary:'Deck walk-through.',['p_'+liam]:'on',to:'non_confidential',fu1_title:'Send CMC summary',fu1_owner:'Anna',fu1_due:'2026-11-17',fu2_title:'Book a call',fu2_owner:'Marc',fu2_due:'2026-11-20'});
  const proposal=ui.last.proposal;assert.ok(proposal,ui.last.state.notice);
  // Nothing is written before approval, and an assistant cannot approve it.
  assert.equal((await x.rows(T('partnerships.activities'))).length,0);
  await assert.rejects(()=>x.f.confirm(x.ai,w,proposal.id,proposal.digest));
  await ui.approve(ui.last);
  const hist=(await x.rows(T('partnerships.stage_history'))).map((h:any)=>[h.data.from_stage,h.data.to_stage,h.data.opportunity_id]);
  assert.deepEqual(hist,[['identified','contacted',opp.id],['contacted','non_confidential',opp.id]]);
  assert.equal((await x.rows(T('partnerships.follow_ups'))).length,2);const act=(await x.rows(T('partnerships.activities')))[0];assert.equal(act.data.person_ids,liam);
  assert.equal((await x.rows(T('partnerships.opportunities')))[0].data.stage,'non_confidential');
  // Funnel from the stored history: identified 1, contacted 1, non-confidential 1, then 0.
  await ui.open({section:'pipeline',mode:'funnel',panel:null});assert.match(text(ui.html),/Identified 1 Contacted 1 100% Non-confidential 1 100% CDA 0 0%/);
  // An assistant running the app gets a proposal it cannot confirm; a person confirms it.
  const bot=x.app(w,id,x.ai);await bot.open({});await bot.click('open:opp:'+opp.id);await bot.submit('move-stage',{to:'lost',on:'2026-11-14',reason:'No budget'});
  assert.ok(bot.last.proposal);await assert.rejects(()=>x.f.confirm(x.ai,w,bot.last.proposal.id,bot.last.proposal.digest));assert.equal((await x.rows(T('partnerships.opportunities')))[0].data.stage,'non_confidential');
 });}finally{await x.pg.close();}
});

test('Acceptance 4, 7, 8 and 9: Add app selects research, digest and briefs; research saves signals, targets and a report; the digest reaches members only; schedule changes on the automation; archive pauses',async()=>{
 const x=await suite();const oldKey=process.env.CONNECTOR_ENCRYPTION_KEY;process.env.CONNECTOR_ENCRYPTION_KEY=randomBytes(32).toString('base64');process.env.APP_AUTOMATION_RECIPES_ENABLED='true';
 const transport=async(req:any)=>{const body=JSON.parse(req.body);return {status:200,body:body.type==='verification'?JSON.stringify({challenge:body.challenge}):'{}',bytes:2,durationMs:1};};
 const reconcile=async(appId:string)=>{for(let i=0;i<4;i++){while(await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(x.db)));await x.pg.query("UPDATE automation_recipe_setups SET available_at=now() WHERE app_id=$1 AND status='pending'",[appId]);}
  return (await x.pg.query<any>('SELECT recipe_key,status,diagnostic,definition_id,definition_version FROM automation_recipe_setups WHERE app_id=$1 ORDER BY recipe_key',[appId])).rows;};
 try{await withActor(x.human,async()=>{
  const w=await x.workspace('Research');
  // The user's runner (connected and verified once), before the app is added.
  const s=new AutomationService(x.db),m=new AppMonitoring(x.db),manage=new AutomationManagement(x.db);
  const rp=await s.prepare(x.ai,w,{preferences:{time:'06:00',timeZone:'Europe/Berlin'}});const runner=await s.confirm(x.human,w,rp.id,rp.digest);
  await new AutomationEvents(x.db,transport).subscribe(x.ai,{name:'automation.ready',arguments:{workspaceId:w,runnerId:runner.id},delivery:{mode:'webhook',url:'https://callbacks.example.org/events',secret:'whsec_'+randomBytes(32).toString('base64')}} as any);
  const verify=(await s.agenda(x.ai,w,runner.id)).rows[0],vc:any=await s.claim(x.ai,w,{runnerId:runner.id,occurrenceId:verify.id,requestKey:randomUUID()});
  const [ready]=await Promise.all([s.setup(x.human,w,1),new Promise<void>((res,rej)=>setTimeout(()=>{void s.finish(x.ai,w,{occurrenceId:verify.id,claimToken:vc.claimToken}).then(()=>res(),rej);},25))]);assert.equal(ready.state,'ready');
  // Add app: the three install recommendations are offered selected; one approval installs the app and enables them after commit.
  const {step,receipt}=await x.install(w,x.T.bd,'Partnerships');assert.deepEqual(step.automations.map((r:any)=>r.key),['partner_research','partner_digest','meeting_briefs']);
  const id=receipt.appId,map=x.mapOf(await x.comp(w,id)),T=(r:string)=>map[r].typeId;assert.ok(T('partnerships.research_reports'));
  const setups=await reconcile(id);assert.deepEqual(setups.map((r:any)=>[r.recipe_key,r.status]),[['meeting_briefs','active'],['partner_digest','active'],['partner_research','active']],JSON.stringify(setups));
  const S=(k:string)=>setups.find((r:any)=>r.recipe_key===k),mon={id:S('partner_research').definition_id,version:S('partner_research').definition_version};
  // Research must store its results: one create-only grant on signals and one on research reports, nothing else; briefs only on briefs.
  const scopes=async(monitorId:string)=>{const r=await m.read(x.ai,w,monitorId);assert.equal(r.config.storeResults,true);return r.context.writeScopes.map((g:any,i:number)=>({scopeId:r.config.writeScopes[i].scopeId,typeId:g.body.bindings[0].typeId,create:g.body.allowCreate,update:g.body.allowUpdate}));};
  const rs=await scopes(mon.id);assert.deepEqual(rs.map((g:any)=>[g.typeId,g.create,g.update]).sort(),[[T('partnerships.research_reports'),true,false],[T('partnerships.signals'),true,false]].sort());
  assert.deepEqual((await scopes(S('meeting_briefs').definition_id)).map((g:any)=>[g.typeId,g.create,g.update]),[[T('partnerships.briefs'),true,false]]);
  const digest=(await x.pg.query<any>('SELECT id,config FROM app_actions WHERE id=$1',[S('partner_digest').definition_id])).rows[0];assert.equal(digest.config.trigger.automationId,mon.id);assert.deepEqual(digest.config.steps[0].to,['anna@northwind.invalid']);
  const weekly=(readRecipes(x.T.bd).recommended[0] as any).trigger,due=(await x.pg.query<any>('SELECT next_at FROM automation_dispatch WHERE monitor_id=$1',[mon.id])).rows[0]?.next_at;
  assert.equal(new Date(due).toISOString(),nextCalendar(weekly,new Date()).toISOString(),'weekly on Monday at 07:00 Europe/Berlin');assert.equal(new Date(due).getUTCDay(),1);
  assert.equal((await manage.readiness(x.human,w,mon.id,[digest.id])).ready,true);
  const prog=await x.save(w,T('programs'),{name:'NWB-101 (fictional)',code:'NWB-101',stage:'phase_1',archived:false});
  const maple=await x.save(w,T('organizations'),{name:'Maplecrest Pharma (fictional)',org_type:'partner',archived:false}),quill=await x.save(w,T('organizations'),{name:'Quillmont Bio (fictional)',org_type:'company',archived:false});
  await x.save(w,T('partnerships.opportunities'),{name:'Maplecrest: NWB-101',organization_id:maple,program_id:prog,direction:'out_license',stage:'cda',stage_on:'2026-11-10',owner:'Anna',archived:false});
  await x.save(w,T('partnerships.asset_profiles'),{program_id:prog,directions:'["out_license"]',research_focus:'Fibrosis deals',status:'active'});
  const ui=x.app(w,id);await ui.open({section:'settings'});assert.doesNotMatch(ui.html,/digest_cadence|pt-schedule/);assert.match(text(ui.html),/No research report yet/);
  // A run is due: claim, save three signals and two target suggestions, then the report (also required when nothing is found), finish with its summary.
  await x.pg.query("INSERT INTO automation_occurrences(id,workspace_id,user_id,runner_id,monitor_id,monitor_version,occurrence_key,due_at,reason) VALUES($1,$2,$3,$4,$5,$6,$7,now(),'scheduled_due')",[randomUUID(),w,x.human.userId,runner.id,mon.id,mon.version,'weekly-'+randomUUID()]);
  const occ=(await s.agenda(x.ai,w,runner.id)).rows.find((r:any)=>r.monitor_id===mon.id)!,c:any=await s.claim(x.ai,w,{runnerId:runner.id,occurrenceId:occ.id,requestKey:randomUUID()});
  const sigScope=rs.find((g:any)=>g.typeId===T('partnerships.signals'))!.scopeId,repScope=rs.find((g:any)=>g.typeId===T('partnerships.research_reports'))!.scopeId;
  const today=new Date().toISOString().slice(0,10),sig=(kind:string,title:string,org:string|null,why:string)=>({kind:'create_record',typeId:T('partnerships.signals'),data:{kind,title,why,source_url:'https://news.example.invalid/'+encodeURIComponent(title),found_on:today,status:'new',program_id:prog,organization_id:org,run_id:c.runId}});
  const batch={scopeId:sigScope,expectedScopeVersion:0,requestKey:randomUUID(),sourceLabel:'https://news.example.invalid',interpretation:'Public partner signals (fictional)',changes:[
   sig('deal','Maplecrest licensed a fibrosis asset (fictional)',maple,'Active in fibrosis; overlaps NWB-101.'),sig('financing','Maplecrest raised a fictional bond',maple,'Budget for in-licensing.'),sig('people','Maplecrest named a new CSO (fictional)',maple,'New decision maker.'),
   sig('target_suggestion','Quillmont Bio (fictional)',quill,'Inhaled formulation know-how fits NWB-101.'),sig('target_suggestion','Rivermint Oncology (fictional)',null,'Lung franchise build-out.')]};
  await withActor(x.ai,()=>x.f.maintain(x.ai,w,batch as any,undefined,false,c.runId));
  await assert.rejects(()=>withActor(x.ai,()=>x.f.maintain(x.ai,w,{...batch,requestKey:randomUUID(),changes:[{kind:'create_record',typeId:T('partnerships.opportunities'),data:{name:'Self-created',organization_id:quill,program_id:prog,direction:'out_license',stage:'identified',owner:'Bot'}}]} as any,undefined,false,c.runId)),'research cannot create opportunities');
  const firstSig=(await x.rows(T('partnerships.signals')))[0];
  await assert.rejects(()=>withActor(x.ai,()=>x.f.maintain(x.ai,w,{...batch,requestKey:randomUUID(),changes:[{kind:'update_record',recordId:firstSig.id,expectedVersion:firstSig.version,data:{status:'accepted'}}]} as any,undefined,false,c.runId)),'research cannot change or accept signals');
  await ui.open({section:'research',rsub:'targets'});{const tt=text(ui.html);assert.match(tt,/Quillmont Bio \(fictional\)/);assert.match(tt,/Rivermint Oncology \(fictional\)/);}
  await ui.open({section:'settings'});const summary=/id="pt-digest-subject">([^<]*)</.exec(ui.html)![1]+'\n'+/id="pt-digest">([\s\S]*?)<\/pre>/.exec(ui.html)![1].replace(/&#39;/g,"'").replace(/&amp;/g,'&');
  await withActor(x.ai,()=>x.f.maintain(x.ai,w,{scopeId:repScope,expectedScopeVersion:0,requestKey:randomUUID(),sourceLabel:'https://news.example.invalid',interpretation:'Weekly research report (fictional)',changes:[{kind:'create_record',typeId:T('partnerships.research_reports'),data:{run_on:today,run_id:c.runId,cadence:'weekly',period:'this week',summary,new_signals:3,new_targets:2,sources:JSON.stringify([{title:'Fictional deal note',url:'https://news.example.invalid/x'}]),written_by:'claude'}}]} as any,undefined,false,c.runId));
  await s.finish(x.ai,w,{occurrenceId:occ.id,claimToken:c.claimToken,result:{status:'completed',summary}});
  await ui.open({section:'research',rsub:'runs'});assert.match(text(ui.html),/this week 3 2 Partnerships · /);
  // The digest fires once on the completed run; the delivered text is the digest (§6 format, about 150 words, members only).
  const action={id:digest.id};
  const {dispatchNotificationBatch}=await import('../src/app-services/notifications.js');const {processServiceJob}=await import('../src/app-services/jobs.js');
  await x.pg.query("UPDATE app_actions SET next_at=now()-interval '1 day' WHERE id=$1",[action.id]);await withDatabaseContext({service:'worker'},()=>dispatchAppActions(x.db));
  const batches=(await x.pg.query<any>('SELECT id FROM app_notification_batches WHERE action_id=$1',[action.id])).rows;assert.equal(batches.length,1);
  await x.pg.query("UPDATE app_notification_batches SET not_before=now()-interval '1 day' WHERE id=$1",[batches[0].id]);await withDatabaseContext({service:'worker'},()=>dispatchNotificationBatch(x.db));
  const sent:any[]=[];await x.pg.query("UPDATE app_service_jobs SET available_at=now()-interval '1 minute'");await withDatabaseContext({service:'worker'},()=>processServiceJob(x.db,{email:async(p:any)=>{sent.push(p);return {id:'provider-1'};}}));
  assert.equal(sent.length,1);const mail=JSON.stringify(sent[0]);assert.match(mail,/anna@northwind\.invalid/);assert.doesNotMatch(mail,/cedarline|maplecrest\.invalid|quillmont\.invalid/i);
  const body=String(sent[0].text??sent[0].message?.text??JSON.parse(mail).text??'');const txt=body||mail;
  assert.match(txt,/Partnerships · week of \d+ \w+: 0 moved · 0 due · 3 new signals/);assert.match(txt,/Suggested targets: 2 for NWB-101 \(review\)/);
  assert.ok(summary.split(/\s+/).filter(w=>/[A-Za-z0-9]/.test(w)).length<=150);assert.doesNotMatch(summary,/Moved:|Due this week:|Stalled:/,'empty sections are left out');
  // One suggestion is accepted in the app (reviewed): an opportunity at Identified, source research.
  const sugg=(await x.rows(T('partnerships.signals'))).find((r:any)=>r.data.title==='Quillmont Bio (fictional)');
  await ui.open({section:'research'});await ui.click('panel:accept:'+sugg.id);await ui.submit('accept-signal',{organization_id:quill,program_id:prog,direction:'co_development',owner:'Anna',priority:'medium'});await ui.approve();
  const created=(await x.rows(T('partnerships.opportunities'))).find((r:any)=>r.data.organization_id===quill);assert.deepEqual([created.data.stage,created.data.source],['identified','research']);
  assert.equal((await x.rows(T('partnerships.signals'))).find((r:any)=>r.id===sugg.id).data.status,'accepted');
  // The schedule is changed on the automation (the app stores none): daily, then monthly, through the exact review.
  for(const trig of [{...weekly,frequency:'daily',weekdays:undefined},{...weekly,frequency:'monthly',weekdays:undefined,monthDay:1,anchor:'2026-11-01'}]){const cur=await m.read(x.ai,w,mon.id),t2=JSON.parse(JSON.stringify(trig));
   const p2=await m.prepare(x.ai,w,{monitorId:mon.id,expectedVersion:cur.version,config:{...cur.config,automation:{...cur.config.automation,trigger:t2}}});await m.confirm(x.human,w,p2.id,p2.digest);
   const next=(await x.pg.query<any>('SELECT next_at FROM automation_dispatch WHERE monitor_id=$1',[mon.id])).rows[0].next_at;assert.equal(new Date(next).toISOString(),nextCalendar((await m.read(x.ai,w,mon.id)).config.automation.trigger,new Date()).toISOString());}
  // Archiving the app pauses research, briefs and the digest; restoring brings them back switched off.
  const change=async(op:any)=>{const pv=await x.f.preview(x.human,w,op);return x.f.confirm(x.human,w,pv.id,pv.digest);};
  await change({kind:'archive_component',componentId:id,expectedVersion:(await x.comp(w,id)).version,archived:true});
  for(const k of ['partner_research','meeting_briefs'])assert.ok((await x.pg.query<any>('SELECT archived_with_app_at FROM app_monitors WHERE id=$1',[S(k).definition_id])).rows[0].archived_with_app_at,k);
  assert.ok((await x.pg.query<any>('SELECT archived_with_app_at FROM app_actions WHERE id=$1',[action.id])).rows[0].archived_with_app_at);
  assert.equal((await manage.readiness(x.human,w,mon.id,[action.id])).ready,false);
 });}finally{process.env.CONNECTOR_ENCRYPTION_KEY=oldKey;delete process.env.APP_AUTOMATION_RECIPES_ENABLED;await x.pg.close();}
});

test('Recipes: without a ready background runner nothing is activated, setup stays visible and every screen works',async()=>{
 const x=await suite();process.env.APP_AUTOMATION_RECIPES_ENABLED='true';
 try{await withActor(x.human,async()=>{
  const w=await x.workspace('Blocked');
  const {receipt}=await x.install(w,x.T.bd,'Partnerships');
  for(let i=0;i<4;i++)await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(x.db));
  const rows=(await x.pg.query<any>('SELECT recipe_key,status FROM automation_recipe_setups WHERE app_id=$1 ORDER BY recipe_key',[receipt.appId])).rows;
  assert.deepEqual(rows.map((r:any)=>r.recipe_key),['meeting_briefs','partner_digest','partner_research']);assert.ok(rows.every((r:any)=>r.status!=='active'),'no runner yet: nothing is active');
  assert.equal((await x.pg.query('SELECT id FROM app_monitors WHERE app_id=$1',[receipt.appId])).rows.length,0);
  const ui=x.app(w,receipt.appId);for(const section of SCREENS){await ui.open({section});assert.doesNotMatch(ui.html,/could not be shown|pt-banner bad/,section);}
 });}finally{delete process.env.APP_AUTOMATION_RECIPES_ENABLED;await x.pg.close();}
});
