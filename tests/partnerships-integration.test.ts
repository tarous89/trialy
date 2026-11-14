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
  return {step,receipt:step.needed?await confirmDataAccess(f,human,w,{...target,connections,stepDigest:step.digest}):await installCatalogApp(f,human,w,target.install)};};
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
  assert.equal(Object.keys(map).length,16);assert.ok(!map.agreements,'Contracts output is only connected, never created');assert.ok(map['dataroom.access_grants']&&map['dataroom.access_grants'].writableFields.length>0,'own manual table');
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

test('Acceptance 4, 7, 8 and 9: weekly research on the runner writes signals and two targets; one accepted; the digest email reaches members only; cadence change; archive pauses',async()=>{
 const x=await suite();const oldKey=process.env.CONNECTOR_ENCRYPTION_KEY;process.env.CONNECTOR_ENCRYPTION_KEY=randomBytes(32).toString('base64');
 const transport=async(req:any)=>{const body=JSON.parse(req.body);return {status:200,body:body.type==='verification'?JSON.stringify({challenge:body.challenge}):'{}',bytes:2,durationMs:1};};
 try{await withActor(x.human,async()=>{
  const w=await x.workspace('Research');const {receipt}=await x.install(w,x.T.bd,'Partnerships');const id=receipt.appId,map=x.mapOf(await x.comp(w,id)),T=(r:string)=>map[r].typeId;
  const prog=await x.save(w,T('programs'),{name:'NWB-101 (fictional)',code:'NWB-101',stage:'phase_1',archived:false});
  const maple=await x.save(w,T('organizations'),{name:'Maplecrest Pharma (fictional)',org_type:'partner',archived:false}),quill=await x.save(w,T('organizations'),{name:'Quillmont Bio (fictional)',org_type:'company',archived:false});
  await x.save(w,T('partnerships.opportunities'),{name:'Maplecrest: NWB-101',organization_id:maple,program_id:prog,direction:'out_license',stage:'cda',stage_on:'2026-11-10',owner:'Anna',archived:false});
  await x.save(w,T('partnerships.asset_profiles'),{program_id:prog,directions:'["out_license"]',research_focus:'Fibrosis deals',status:'active'});
  const ui=x.app(w,id);await ui.open({section:'settings'});
  await ui.submit('save-settings',{digest_cadence:'weekly',digest_day:'mon',digest_time:'07:00',time_zone:'Europe/Berlin',stalled_days:'21',research_enabled:'on',digest_recipients:'anna@northwind.invalid',team:'Anna, Marc'});await ui.approve();
  const trigger=()=>JSON.parse(/id="pt-schedule">([^<]*)</.exec(ui.html)![1].replace(/&quot;/g,'"'));
  await ui.open({section:'settings'});const weekly=trigger();assert.deepEqual([weekly.frequency,weekly.weekdays,weekly.time,weekly.timeZone],['weekly',[1],'07:00','Europe/Berlin']);
  // The user's runner (connected and verified once), then one research worker for the app with the Settings schedule and a create-only signals scope.
  const s=new AutomationService(x.db),m=new AppMonitoring(x.db),actions=new AppActions(x.db),manage=new AutomationManagement(x.db);
  const rp=await s.prepare(x.ai,w,{preferences:{time:'06:00',timeZone:'Europe/Berlin'}});const runner=await s.confirm(x.human,w,rp.id,rp.digest);
  await new AutomationEvents(x.db,transport).subscribe(x.ai,{name:'automation.ready',arguments:{workspaceId:w,runnerId:runner.id},delivery:{mode:'webhook',url:'https://callbacks.example.org/events',secret:'whsec_'+randomBytes(32).toString('base64')}} as any);
  const verify=(await s.agenda(x.ai,w,runner.id)).rows[0],vc:any=await s.claim(x.ai,w,{runnerId:runner.id,occurrenceId:verify.id,requestKey:randomUUID()});
  const [ready]=await Promise.all([s.setup(x.human,w,1),new Promise<void>((res,rej)=>setTimeout(()=>{void s.finish(x.ai,w,{occurrenceId:verify.id,claimToken:vc.claimToken}).then(()=>res(),rej);},25))]);assert.equal(ready.state,'ready');
  const expiry=new Date(Date.now()+30*86400000).toISOString();
  const projectDraft=await x.f.preview(x.human,w,{kind:'create_node',nodeKind:'project',name:'Partner research'} as any),project=await x.f.confirm(x.human,w,projectDraft.id,projectDraft.digest);
  const sigFields=['organization_id','opportunity_id','program_id','kind','title','why','source_url','published_on','found_on','status','run_id'];
  const scopeDraft=await x.f.preview(x.human,w,{kind:'save_scope',scope:{projectId:project.id,autoWrite:true,expiresAt:expiry,purpose:'Partner signals',inclusionCriteria:'New public signals for active assets',sourcePolicy:'Public sources',basis:'tracking',bindings:[{typeId:T('partnerships.signals'),fields:sigFields}],allowCreate:true,allowUpdate:false,maxChanges:20}} as any),scope=await x.f.confirm(x.human,w,scopeDraft.id,scopeDraft.digest);
  const X=JSON.parse(await readFile('templates/source/partnership-tracker/automation.examples.json','utf8'));
  const config={...X.research,appId:id,expiresAt:expiry,readBindings:[{typeId:T('partnerships.signals'),fields:sigFields},{typeId:T('partnerships.opportunities'),fields:['name','organization_id','program_id','stage','owner']}],writeScopes:[{scopeId:scope.id,version:0}],automation:{runnerId:runner.id,trigger:weekly,initialLookbackDays:30,catchUp:'coalesce'}};
  const mp=await m.prepare(x.ai,w,{config});const mon=await m.confirm(x.human,w,mp.id,mp.digest);
  const due=(await x.pg.query<any>('SELECT next_at FROM automation_dispatch WHERE monitor_id=$1',[mon.id])).rows[0]?.next_at;
  assert.equal(new Date(due).toISOString(),nextCalendar(weekly,new Date()).toISOString(),'weekly on Monday at 07:00 Europe/Berlin');assert.equal(new Date(due).getUTCDay(),1);
  // The digest: an email action on that research run becoming completed, to members only. A partner's address is refused.
  const appVersion=(await x.comp(w,id)).version,dg={...X.digest,appId:id,appVersion,expiresAt:expiry,trigger:{...X.digest.trigger,automationId:mon.id,automationVersion:0},steps:[{...X.digest.steps[0],to:['anna@northwind.invalid']}]};
  const create=async(c:any)=>{const d=await actions.prepare(x.human,w,{config:c});return actions.confirm(x.human,w,d.id,d.digest);};
  await assert.rejects(()=>create({...dg,name:'To a partner',steps:[{...dg.steps[0],to:['chloe@cedarline.invalid']}]}),/registered team member/);
  const action=await create(dg);assert.equal((await manage.readiness(x.human,w,mon.id,[action.id])).ready,true);
  // A run is due: claim, save three signals and two target suggestions under the scope (no other table), finish with the digest summary.
  await x.pg.query("INSERT INTO automation_occurrences(id,workspace_id,user_id,runner_id,monitor_id,monitor_version,occurrence_key,due_at,reason) VALUES($1,$2,$3,$4,$5,0,$6,now(),'scheduled_due')",[randomUUID(),w,x.human.userId,runner.id,mon.id,'weekly-'+randomUUID()]);
  const occ=(await s.agenda(x.ai,w,runner.id)).rows.find((r:any)=>r.monitor_id===mon.id)!,c:any=await s.claim(x.ai,w,{runnerId:runner.id,occurrenceId:occ.id,requestKey:randomUUID()});
  const today=new Date().toISOString().slice(0,10),sig=(kind:string,title:string,org:string|null,why:string)=>({kind:'create_record',typeId:T('partnerships.signals'),data:{kind,title,why,source_url:'https://news.example.invalid/'+encodeURIComponent(title),found_on:today,status:'new',program_id:prog,organization_id:org,run_id:c.runId}});
  const batch={scopeId:scope.id,expectedScopeVersion:0,requestKey:randomUUID(),sourceLabel:'https://news.example.invalid',interpretation:'Public partner signals (fictional)',changes:[
   sig('deal','Maplecrest licensed a fibrosis asset (fictional)',maple,'Active in fibrosis; overlaps NWB-101.'),sig('financing','Maplecrest raised a fictional bond',maple,'Budget for in-licensing.'),sig('people','Maplecrest named a new CSO (fictional)',maple,'New decision maker.'),
   sig('target_suggestion','Quillmont Bio (fictional)',quill,'Inhaled formulation know-how fits NWB-101.'),sig('target_suggestion','Rivermint Oncology (fictional)',null,'Lung franchise build-out.')]};
  await withActor(x.ai,()=>x.f.maintain(x.ai,w,batch as any,undefined,false,c.runId));
  await assert.rejects(()=>withActor(x.ai,()=>x.f.maintain(x.ai,w,{...batch,requestKey:randomUUID(),changes:[{kind:'create_record',typeId:T('partnerships.opportunities'),data:{name:'Self-created',organization_id:quill,program_id:prog,direction:'out_license',stage:'identified',owner:'Bot'}}]} as any,undefined,false,c.runId)),'research cannot create opportunities');
  await ui.open({section:'research',rsub:'targets'});{const tt=text(ui.html);assert.match(tt,/Quillmont Bio \(fictional\)/);assert.match(tt,/Rivermint Oncology \(fictional\)/);}
  await ui.open({section:'settings'});const summary=/id="pt-digest-subject">([^<]*)</.exec(ui.html)![1]+'\n'+/id="pt-digest">([\s\S]*?)<\/pre>/.exec(ui.html)![1].replace(/&#39;/g,"'").replace(/&amp;/g,'&');
  await s.finish(x.ai,w,{occurrenceId:occ.id,claimToken:c.claimToken,result:{status:'completed',summary}});
  // The email action fires once on the completed run; the delivered text is the digest (§6 format, about 150 words, members only).
  const {dispatchNotificationBatch}=await import('../src/app-services/notifications.js');const {processServiceJob}=await import('../src/app-services/jobs.js');
  await x.pg.query("UPDATE app_actions SET next_at=now()-interval '1 day' WHERE id=$1",[action.id]);await withDatabaseContext({service:'worker'},()=>dispatchAppActions(x.db));
  const batches=(await x.pg.query<any>('SELECT id FROM app_notification_batches WHERE action_id=$1',[action.id])).rows;assert.equal(batches.length,1);
  await x.pg.query("UPDATE app_notification_batches SET not_before=now()-interval '1 day' WHERE id=$1",[batches[0].id]);await withDatabaseContext({service:'worker'},()=>dispatchNotificationBatch(x.db));
  const sent:any[]=[];await x.pg.query("UPDATE app_service_jobs SET available_at=now()-interval '1 minute'");await withDatabaseContext({service:'worker'},()=>processServiceJob(x.db,{email:async(p:any)=>{sent.push(p);return {id:'provider-1'};}}));
  assert.equal(sent.length,1);const mail=JSON.stringify(sent[0]);assert.match(mail,/anna@northwind\.invalid/);assert.doesNotMatch(mail,/cedarline|maplecrest\.invalid|quillmont\.invalid/i);
  const body=String(sent[0].text??sent[0].message?.text??JSON.parse(mail).text??'');const txt=body||mail;
  assert.match(txt,/Partnerships · week of \d+ \w+: 0 moved · 0 due · 3 new signals/);assert.match(txt,/New about your targets: .*· 0 more|New about your targets: [^\n]*/);assert.match(txt,/Suggested targets: 2 for NWB-101 \(review\)/);
  assert.ok(summary.split(/\s+/).filter(w=>/[A-Za-z0-9]/.test(w)).length<=150);assert.doesNotMatch(summary,/Moved:|Due this week:|Stalled:/,'empty sections are left out');
  // One suggestion is accepted in the app (reviewed): an opportunity at Identified, source research.
  const sugg=(await x.rows(T('partnerships.signals'))).find((r:any)=>r.data.title==='Quillmont Bio (fictional)');
  await ui.open({section:'research'});await ui.click('panel:accept:'+sugg.id);await ui.submit('accept-signal',{organization_id:quill,program_id:prog,direction:'co_development',owner:'Anna',priority:'medium'});await ui.approve();
  const created=(await x.rows(T('partnerships.opportunities'))).find((r:any)=>r.data.organization_id===quill);assert.deepEqual([created.data.stage,created.data.source],['identified','research']);
  assert.equal((await x.rows(T('partnerships.signals'))).find((r:any)=>r.id===sugg.id).data.status,'accepted');
  // Switching to daily (and monthly) in Settings changes the schedule the research worker uses.
  await ui.open({section:'settings'});await ui.submit('save-settings',{digest_cadence:'daily',digest_time:'07:00',time_zone:'Europe/Berlin',stalled_days:'21',research_enabled:'on'});await ui.approve();await ui.open({section:'settings'});const daily=trigger();assert.equal(daily.frequency,'daily');
  const mp2=await m.prepare(x.ai,w,{monitorId:mon.id,expectedVersion:0,config:{...config,automation:{...config.automation,trigger:daily}}});await m.confirm(x.human,w,mp2.id,mp2.digest);
  const due2=(await x.pg.query<any>('SELECT next_at FROM automation_dispatch WHERE monitor_id=$1',[mon.id])).rows[0].next_at;assert.equal(new Date(due2).toISOString(),nextCalendar(daily,new Date()).toISOString());
  await ui.submit('save-settings',{digest_cadence:'monthly',digest_time:'07:00',time_zone:'Europe/Berlin',stalled_days:'21',research_enabled:'on'});await ui.approve();await ui.open({section:'settings'});const monthly=trigger();
  const mp3=await m.prepare(x.ai,w,{monitorId:mon.id,expectedVersion:1,config:{...config,automation:{...config.automation,trigger:monthly}}});await m.confirm(x.human,w,mp3.id,mp3.digest);
  const due3=new Date((await x.pg.query<any>('SELECT next_at FROM automation_dispatch WHERE monitor_id=$1',[mon.id])).rows[0].next_at);assert.equal(due3.toISOString(),nextCalendar(monthly,new Date()).toISOString());
  // Archiving the app pauses the research and digest automations; restoring brings them back switched off.
  const change=async(op:any)=>{const pv=await x.f.preview(x.human,w,op);return x.f.confirm(x.human,w,pv.id,pv.digest);};
  await change({kind:'archive_component',componentId:id,expectedVersion:(await x.comp(w,id)).version,archived:true});
  assert.ok((await x.pg.query<any>('SELECT archived_with_app_at FROM app_monitors WHERE id=$1',[mon.id])).rows[0].archived_with_app_at);assert.ok((await x.pg.query<any>('SELECT archived_with_app_at FROM app_actions WHERE id=$1',[action.id])).rows[0].archived_with_app_at);
  assert.equal((await manage.readiness(x.human,w,mon.id,[action.id])).ready,false);
 });}finally{process.env.CONNECTOR_ENCRYPTION_KEY=oldKey;await x.pg.close();}
});
