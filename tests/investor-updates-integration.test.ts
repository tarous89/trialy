import {settle,tookEffect} from './settle.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {AsyncLocalStorage} from 'node:async_hooks';
import {PGlite} from '@electric-sql/pglite';
import request from 'supertest';
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
import {reconcileRecipeSetups,prepareAppRecipe,confirmAppRecipe} from '../src/automations/recipes.js';
import {dispatchAppActions} from '../src/app-services/service.js';
import {dispatchNotificationBatch} from '../src/app-services/notifications.js';
import {runFoundation} from '../src/foundation/worker.js';
import {listAppCommands,runAppCommand} from '../src/workspace/app-commands.js';
import {baseApp,errors} from '../src/server/app.js';
import {addExternalExchange} from '../src/server/external-exchange.js';
import {syncExchangeTracking} from '../src/domain/exchange-rooms.js';
import {deliverExchangeEmails} from '../src/app-services/exchange-email.js';
import {checksPassed} from '../src/domain/exchange-update-content.js';
import type {Actor} from '../src/shared/schema.js';

/* INVESTOR_UPDATES.md §14 end to end on a disposable database with every migration and the runtime role: the real catalog installer and
 * Use existing data? step, the app in the production runtime, reviewed record changes confirmed by a person, the recipe path with and
 * without a runner, research create-only grants, the weekly digest helper, the external exchange (update rooms) with one confirmed send,
 * tracked deliveries and responses, unsubscribe, answers, and archive first. Fictional data only; no deployed account; no email leaves. */
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ');
const SCREENS=['overview','updates','investors','plans','settings'];
const J=JSON.stringify;
const worker=<T>(fn:()=>T)=>withDatabaseContext({service:'worker'},fn);
async function suite(){
 const pg=new PGlite();for(const n of (await readdir('migrations')).filter(x=>x.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+n,'utf8'));await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();
 const db:Database={query:async(q,v)=>storage.getStore()?.query(q,v)??db.transaction(tx=>tx.query(q,v)),transaction:async fn=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async raw=>{await raw.exec(databaseContext().service==='worker'?'SET LOCAL ROLE trialy_worker':'SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(q,v)=>{await setDatabaseContext(raw as any);return raw.query(q,v) as any;}};return storage.run(tx,()=>fn(tx));});},close:()=>pg.close()};
 const raw:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const human:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...human,origin:'ai',connectionFamily:randomUUID(),clientId:randomUUID()};
 await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[human.userId,'anna@northwind.invalid','Anna (fictional)']);
 await pg.query("INSERT INTO oauth_tokens(hash,user_id,client_id,kind,family,expires_at) VALUES($1,$2,$3,'refresh',$4,$5)",[randomUUID(),human.userId,ai.clientId,ai.connectionFamily,Date.now()+86400000]);
 await syncTemplateCatalog(raw);
 // Investor Updates 1.0.0 is approved by the seed (owner approval, 17 Nov 2026).
 assert.equal((await pg.query<any>("SELECT status FROM app_template_catalog WHERE template_id='life.investor-updates' AND version='1.0.1'")).rows[0].status,'approved');
 await pg.query("UPDATE app_template_catalog SET status='approved' WHERE (template_id='life.investor-updates' AND version='1.0.1') OR (template_id='life.investor-crm' AND version='2.0.1')");
 const f=new WorkspaceFoundation(db),s=new Service(db),catalog=new AppTemplates(undefined,db);
 const T={iu:await catalog.read({templateId:'life.investor-updates',version:'1.0.1'}),fr:await catalog.read({templateId:'life.investor-crm',version:'2.0.1'})};
 const install=async(w:string,t:any,name:string,choose=true)=>{const target={install:{templateId:t.id,version:t.version,digest:t.digest,name,requestKey:randomUUID()}};const step=await dataAccessStep(f,human,w,target);
  return {step,receipt:step.needed?await confirmDataAccess(f,human,w,{...target,connections:{},stepDigest:step.digest,...(step.automations.length?{automations:step.automations.map((r:any)=>({key:r.key,enabled:choose,settings:{}}))}:{})}):await installCatalogApp(f,human,w,target.install)};};
 const comp=async(w:string,id:string)=>(await f.readComponent(human,w,id)).component;
 const mapOf=(c:any)=>JSON.parse(JSON.parse(/^const templateConfiguration=(.+);\n/.exec(c.source)![1]).tableMap);
 const app=(w:string,id:string,who:Actor=human)=>{let state:any={};const v:any={html:'',last:null,state:()=>state,
  async ev(event:any){const c=await comp(w,id);const out:any=await f.runFrontend(who,w,{componentId:c.id,expectedVersion:c.version,state,event:{value:null,form:{},...event}});state=out.state;v.html=out.html;v.last=out;return out;},
  open:(st:any={})=>{state={...state,...st};return v.ev({kind:'open',action:''});},click:(a:string,form:any={})=>v.ev({kind:'click',action:a,form}),submit:(a:string,form:any={})=>v.ev({kind:'submit',action:a,form}),
  async approve(out:any=v.last){if(!tookEffect(out))throw Error('No proposal: '+(out?.state?.notice??''));const r=await settle(f,human,w,out);await v.ev({kind:'open',action:''});return r;}};return v;};
 const rows=async(typeId:string)=>(await pg.query<any>("SELECT id,version,data FROM records WHERE type_id=$1 AND state<>'archived' ORDER BY created_at,id",[typeId])).rows;
 const save=async(w:string,typeId:string,data:any)=>{const p=await s.preview(human,w,{kind:'create_record',typeId,data});return (await s.commit(human,p.id,p.digest)).objects[0].id as string;};
 const workspace=async(name:string)=>{const w=(await s.createWorkspace(human,name)).id;await s.setAi(human,w,true);await pg.query("UPDATE tenants SET name='Northwind Bio (fictional)' WHERE id=(SELECT tenant_id FROM workspaces WHERE id=$1)",[w]);return w;};
 const reconcile=async(appId:string)=>{for(let i=0;i<4;i++){while(await worker(()=>reconcileRecipeSetups(db)));await pg.query("UPDATE automation_recipe_setups SET available_at=now() WHERE app_id=$1 AND status='pending'",[appId]);}
  return (await pg.query<any>('SELECT recipe_key,context_key,status,diagnostic,definition_id,definition_version FROM automation_recipe_setups WHERE app_id=$1 ORDER BY recipe_key,context_key',[appId])).rows;};
 const runner=async(w:string)=>{const transport=async(req:any)=>{const body=JSON.parse(req.body);return {status:200,body:body.type==='verification'?JSON.stringify({challenge:body.challenge}):'{}',bytes:2,durationMs:1};};
  const as=new AutomationService(db),rp=await as.prepare(ai,w,{preferences:{time:'06:00',timeZone:'Europe/Berlin'}});const r=await as.confirm(human,w,rp.id,rp.digest);
  await new AutomationEvents(db,transport).subscribe(ai,{name:'automation.ready',arguments:{workspaceId:w,runnerId:r.id},delivery:{mode:'webhook',url:'https://callbacks.example.org/events',secret:'whsec_'+randomBytes(32).toString('base64')}} as any);
  const verify=(await as.agenda(ai,w,r.id)).rows[0],vc:any=await as.claim(ai,w,{runnerId:r.id,occurrenceId:verify.id,requestKey:randomUUID()});
  const [ready]=await Promise.all([as.setup(human,w,1),new Promise<void>((res,rej)=>setTimeout(()=>{void as.finish(ai,w,{occurrenceId:verify.id,claimToken:vc.claimToken}).then(()=>res(),rej);},25))]);assert.equal(ready.state,'ready');return {as,runner:r};};
 const change=async(w:string,op:any)=>{const pv=await f.preview(human,w,op);return f.confirm(human,w,pv.id,pv.digest);};
 return {pg,db,raw,human,ai,f,s,T,install,comp,mapOf,app,rows,save,workspace,reconcile,runner,change};
}
type Suite=Awaited<ReturnType<typeof suite>>;
/** Standard setup through the app (one review), then people, recipients and a monthly board plan saved through reviewed writes
 * (the click paths for those are covered by the unit and command tests; this keeps the suite inside the CI time budget). */
async function seed(x:Suite,w:string,id:string){const map=x.mapOf(await x.comp(w,id)),T=(r:string)=>map[r].typeId;const ui=x.app(w,id);
 await ui.open({section:'overview'});await ui.click('setup-standard');await ui.approve();
 const cats=await x.rows(T('investorupdates.categories')),cat=(k:string)=>cats.find((c:any)=>c.data.kind===k).id,tpls=await x.rows(T('investorupdates.templates'));
 const firm=await x.save(w,T('organizations'),{name:'Alder Ventures (fictional)',org_type:'investor',archived:false});
 const person=async(name:string,email:string,cs:string[],org:string|null=firm)=>{const pid=await x.save(w,T('people'),{name,email,organization_id:org,archived:false});
  await x.save(w,T('investorupdates.recipients'),{person_id:pid,organization_id:org,category_ids:J(cs),share_class_ids:'[]',status:'receives',source:'manual',archived:false});return pid;};
 const people={mara:await person('Mara Okafor','mara@alder.example.invalid',[cat('board'),cat('investors')]),jonas:await person('Jonas Weber','jonas@birch.example.invalid',[cat('board')]),priya:await person('Priya Natarajan','priya@natarajan.example.invalid',[cat('board')],null),omar:await person('Omar Haddad','omar@dune.example.invalid',[cat('shareholders')])};
 await x.save(w,T('investorupdates.plans'),{name:'Board – monthly update',format:'email',template_id:tpls.find((t:any)=>t.data.kind==='board_monthly').id,category_ids:J([cat('board')]),sources:J({apps:['runway'],document_ids:[],notes:'',exclusions:''}),cadence:'monthly',send_by_day:7,timezone:'Europe/Berlin',approver_1:'Felix',approver_2:'Anna',status:'active',next_period_end:'2000-01-31',archived:false});
 const plan=(await x.rows(T('investorupdates.plans')))[0];return {map,T,ui,cat,people,plan,tpls};}

test('install: four recommendations offered on; standard records at first use; Needs setup without a runner; rule 9 modularity with Fundraise; archive first',async()=>{
 const x=await suite();process.env.APP_AUTOMATION_RECIPES_ENABLED='true';
 try{await withActor(x.human,async()=>{
  // Fundraise first: Investor Updates connects its people and organizations and never writes its own tables.
  const w=await x.workspace('Board and investors');const fr=await x.install(w,x.T.fr,'Fundraise',false),frMap=x.mapOf(await x.comp(w,fr.receipt.appId));
  const {step,receipt}=await x.install(w,x.T.iu,'Investor Updates');const id=receipt.appId,c=await x.comp(w,id),map=x.mapOf(c);
  assert.deepEqual(step.automations.map((r:any)=>r.key),['meeting_before_draft','ready_for_review','new_response','weekly_digest'],'four install recommendations, all offered on');
  assert.equal(map.people.typeId,frMap.people.typeId);assert.equal(map.organizations.typeId,frMap.organizations.typeId);
  const frOwn=Object.entries(frMap).filter(([k])=>k.startsWith('fundraise.')).map(([,v]:any)=>v.typeId);assert.ok(!c.bindings.some((b:any)=>frOwn.includes(b.typeId)),'no Fundraise table is bound');
  assert.deepEqual(c.execution.map((b:any)=>b.name).sort(),['meeting_brief','plan_brief','updates_digest'],'helpers installed with the app');
  // Install creates empty tables; the standard categories and templates come with one review on first use.
  for(const r of ['categories','templates','share_classes'])assert.equal((await x.rows(map['investorupdates.'+r].typeId)).length,0,r);
  // The design gate runs in tests/investor-updates.test.ts and the browser test; here every screen opens on the real path.
  const ui=x.app(w,id);for(const section of SCREENS){const out=await ui.open({section,panel:null});assert.doesNotMatch(text(out.html),/could not be shown|Partial data/,section);}
  await ui.open({section:'overview'});await ui.click('setup-standard');assert.ok((await x.rows(map['investorupdates.categories'].typeId)).length>0,'D16 (4.4): saved directly');await ui.approve();
  assert.deepEqual((await x.rows(map['investorupdates.categories'].typeId)).map((r:any)=>r.data.kind).sort(),['board','investors','shareholders']);assert.equal((await x.rows(map['investorupdates.templates'].typeId)).length,5);assert.equal((await x.rows(map['investorupdates.share_classes'].typeId)).length,0);
  // No runner: the drafting automation needs setup; the email automations (no runner needed) are active.
  const setups=await x.reconcile(id);assert.deepEqual(setups.map((r:any)=>r.recipe_key),['meeting_before_draft','new_response','ready_for_review','weekly_digest']);
  assert.notEqual(setups.find((r:any)=>r.recipe_key==='meeting_before_draft').status,'active');for(const k of ['new_response','ready_for_review','weekly_digest'])assert.equal(setups.find((r:any)=>r.recipe_key===k).status,'active',k);
  // Archive first: archiving pauses the automations; restoring brings the app back with them switched off.
  const acts=setups.filter((r:any)=>r.status==='active').map((r:any)=>r.definition_id);
  await x.change(w,{kind:'archive_component',componentId:id,expectedVersion:(await x.comp(w,id)).version,archived:true});
  for(const a of acts)assert.ok((await x.pg.query<any>('SELECT archived_with_app_at FROM app_actions WHERE id=$1',[a])).rows[0].archived_with_app_at);
  assert.equal((await x.rows(map['investorupdates.categories'].typeId)).length,3,'records stay');
  await x.change(w,{kind:'archive_component',componentId:id,expectedVersion:(await x.comp(w,id)).version,archived:false});
  for(const a of acts){const r=(await x.pg.query<any>('SELECT paused,archived_with_app_at FROM app_actions WHERE id=$1',[a])).rows[0];assert.equal(r.paused,true,'automations return switched off');}
  // Opting out at Add app: nothing becomes active; the app is fully usable.
  const w2=await x.workspace('Opted out');const out=await x.install(w2,x.T.iu,'Investor Updates',false);await x.reconcile(out.receipt.appId);
  assert.equal((await x.pg.query<any>("SELECT count(*)::int AS n FROM automation_recipe_setups WHERE app_id=$1 AND status='active'",[out.receipt.appId])).rows[0].n,0);
  for(const section of SCREENS)assert.doesNotMatch(text((await x.app(w2,out.receipt.appId).open({section})).html),/could not be shown/,section);
 });}finally{delete process.env.APP_AUTOMATION_RECIPES_ENABLED;await x.pg.close();}
});

test('automations on the real recipe path: research create-only; Set up the plan\'s scheduled draft once per plan; dedup by plan + period; ready-for-review and the digest; empty digest suppressed',async()=>{
 const x=await suite();process.env.APP_AUTOMATION_RECIPES_ENABLED='true';const oldKey=process.env.CONNECTOR_ENCRYPTION_KEY;process.env.CONNECTOR_ENCRYPTION_KEY=randomBytes(32).toString('base64');
 try{await withActor(x.human,async()=>{
  const w=await x.workspace('Automations');const {as,runner}=await x.runner(w);const m=new AppMonitoring(x.db);
  const {receipt}=await x.install(w,x.T.iu,'Investor Updates');const id=receipt.appId;
  // The empty workspace: the weekly digest has nothing to report and sends nothing.
  let setups=await x.reconcile(id);assert.ok(setups.every((r:any)=>r.status==='active'),J(setups));
  const S=(k:string,ctx='')=>setups.find((r:any)=>r.recipe_key===k&&r.context_key===ctx);
  const digestId=S('weekly_digest').definition_id;
  const tick=async(b:string)=>{await x.pg.query('UPDATE app_notification_batches SET not_before=now() WHERE id=$1',[b]);await worker(()=>dispatchNotificationBatch(x.db));};
  // The dispatcher may first settle the occurrence (two minutes); the test moves the clock past it, at most three times.
  const runDigest=async(actionId:string)=>{let b:any;for(let i=0;i<3&&!b;i++){await x.pg.query("UPDATE app_actions SET next_at=now()-interval '1 second' WHERE id=$1",[actionId]);await worker(()=>dispatchAppActions(x.db));
   b=(await x.pg.query<any>('SELECT id FROM app_notification_batches WHERE action_id=$1 ORDER BY created_at DESC',[actionId])).rows[0];}if(b){await tick(b.id);await worker(()=>runFoundation(x.db));await tick(b.id);}return b;};
  const sd=await seed(x,w,id);const {T,ui,plan}=sd;
  // Research grants: the agenda draft may only create updates rows.
  const mr=await m.read(x.ai,w,S('meeting_before_draft').definition_id);assert.equal(mr.config.storeResults,true);
  assert.deepEqual(mr.context.writeScopes.map((g:any)=>[g.body.bindings[0].typeId,g.body.allowCreate,g.body.allowUpdate]),[[T('investorupdates.updates'),true,false]]);
  const upRead=mr.config.readBindings.find((b:any)=>b.typeId===T('investorupdates.updates'));assert.equal(upRead.dynamic,true,'fields:"all" follows the app fields (E6)');
  // Set up the plan's scheduled draft (an app feature with the plan as context); one exact approval by a person.
  const review=await withActor(x.ai,()=>prepareAppRecipe(x.db,x.ai,w,{appId:id,key:'scheduled_draft',contextRecordId:plan.id}));
  await assert.rejects(()=>withActor(x.ai,()=>confirmAppRecipe(x.db,x.ai,w,review.id,review.digest,review.review)),'assistants never confirm');
  const ok=await confirmAppRecipe(x.db,x.human,w,review.id,review.digest,review.review);assert.equal(ok.status,'pending');
  setups=await x.reconcile(id);const feat=S('scheduled_draft',plan.id);assert.equal(feat.status,'active',J(setups));
  const again=await prepareAppRecipe(x.db,x.human,w,{appId:id,key:'scheduled_draft',contextRecordId:plan.id});assert.equal((await confirmAppRecipe(x.db,x.human,w,again.id,again.digest,again.review)).status,'existing','one automation per installed app, feature and plan');
  const mon=await m.read(x.ai,w,feat.definition_id);assert.equal(mon.config.automation.trigger.kind,'record_date');assert.equal(mon.config.automation.trigger.recordId,plan.id);assert.equal(mon.config.automation.trigger.field,'next_period_end');
  // A run: the brief comes from plan_brief; research creates one draft for the period, in review; it can neither update nor touch other tables.
  const occ=async()=>{await x.pg.query("INSERT INTO automation_occurrences(id,workspace_id,user_id,runner_id,monitor_id,monitor_version,occurrence_key,due_at,reason,input) VALUES($1,$2,$3,$4,$5,$6,$7,now(),'scheduled_due',$8)",[randomUUID(),w,x.human.userId,runner.id,feat.definition_id,feat.definition_version,'p-'+randomUUID(),J({recordId:plan.id})]);
   const o=(await as.agenda(x.ai,w,runner.id)).rows.find((r:any)=>r.monitor_id===feat.definition_id)!;const c:any=await as.claim(x.ai,w,{runnerId:runner.id,occurrenceId:o.id,requestKey:randomUUID()});
   await withActor(x.ai,()=>m.brief(x.ai,w,c.runId));await worker(()=>runFoundation(x.db));const b=await withActor(x.ai,()=>m.brief(x.ai,w,c.runId));assert.equal(b.state,'ready',J(b));return {o,c,ctx:JSON.parse(b.context)};};
  const run1=await occ();assert.equal(run1.ctx.plan.id,plan.id);assert.match(run1.ctx.instruction,/Create one/);assert.equal(run1.ctx.categories[0].kind,'board');assert.ok(run1.ctx.template.sections.length>0);
  const scope=mon.context.writeScopes[0],grant={scopeId:mon.config.writeScopes[0].scopeId,version:mon.config.writeScopes[0].version};assert.deepEqual([scope.body.allowCreate,scope.body.allowUpdate],[true,false]);
  const write=(changes:any[],runId:string)=>withActor(x.ai,()=>x.f.maintain(x.ai,w,{scopeId:grant.scopeId,expectedScopeVersion:grant.version,requestKey:randomUUID(),sourceLabel:'TrialAgents sources (fictional)',interpretation:'Scheduled draft (fictional)',changes} as any,undefined,false,runId));
  const draft={format:'email',plan_id:plan.id,kind:'scheduled',period:run1.ctx.plan.period,title:'Board – monthly update · '+run1.ctx.plan.period,category_ids:J(JSON.parse(plan.data.category_ids)),status:'in_review',blocks:J([{id:'b1',type:'metrics',level:'investors',items:[{label:'Runway',value:'14.2',unit:'months',fact:'f1'}]}]),facts:J([{id:'f1',claim:'Runway',value:14.2,unit:'months',source:{kind:'chat',date:'2026-11-01'}}]),asks:'[]',document_ids:'[]',drafted_by:'claude',drafted_on:new Date().toISOString().slice(0,10)};
  await write([{kind:'create_record',typeId:T('investorupdates.updates'),data:draft}],run1.c.runId);
  const created=(await x.rows(T('investorupdates.updates')))[0];assert.equal(created.data.status,'in_review');
  await assert.rejects(()=>write([{kind:'update_record',recordId:created.id,expectedVersion:created.version,data:{status:'approved'}}],run1.c.runId),'research never approves or updates');
  await assert.rejects(()=>write([{kind:'create_record',typeId:T('investorupdates.deliveries'),data:{update_id:created.id,recipient_id:'x',category_id:'x',level:'board',email:'x@y.invalid'}}],run1.c.runId),'research cannot touch other tables');
  await as.finish(x.ai,w,{occurrenceId:run1.o.id,claimToken:run1.c.claimToken,result:{status:'completed',summary:'Drafted the board update.'}});
  // The second run for the same period: the brief says skip, and the app refuses a duplicate too.
  const run2=await occ();assert.match(run2.ctx.instruction,/already has an update/);assert.equal(run2.ctx.existing_update.id,created.id);await as.finish(x.ai,w,{occurrenceId:run2.o.id,claimToken:run2.c.claimToken,result:{status:'no_update',summary:'Already drafted.'}});
  // Ready for review: the database automation fires on the transition to in_review and emails the owner.
  const rr=S('ready_for_review').definition_id,rcfg=(await x.pg.query<any>('SELECT config FROM app_actions WHERE id=$1',[rr])).rows[0].config;assert.equal(rcfg.trigger.kind,'database');assert.deepEqual(rcfg.trigger.becomes,{field:'status',operator:'equals',value:'in_review'});assert.deepEqual(rcfg.steps[0].to,['anna@northwind.invalid']);
  // The weekly digest now reports the draft waiting; the installed helper writes it.
  assert.ok(await runDigest(digestId),'a digest batch');
  const job=(await x.pg.query<any>("SELECT payload FROM app_service_jobs WHERE app_id=$1 ORDER BY created_at DESC LIMIT 1",[id])).rows[0];assert.ok(job,'digest delivered');
  assert.match(job.payload.message.subject,/^Investor Updates · week of \d+ \w{3}$/);assert.match(job.payload.message.text,/Drafts waiting \(1\):\n· Board – monthly update · \d{4}-\d{2} \(in review\)/);assert.deepEqual(job.payload.message.to,['anna@northwind.invalid']);
  // Archiving the app pauses research and email automations, including the plan feature.
  await x.change(w,{kind:'archive_component',componentId:id,expectedVersion:(await x.comp(w,id)).version,archived:true});
  for(const k of ['meeting_before_draft'])assert.ok((await x.pg.query<any>('SELECT archived_with_app_at FROM app_monitors WHERE id=$1',[S(k).definition_id])).rows[0].archived_with_app_at,k);
  assert.ok((await x.pg.query<any>('SELECT archived_with_app_at FROM app_monitors WHERE id=$1',[feat.definition_id])).rows[0].archived_with_app_at);
  await x.change(w,{kind:'archive_component',componentId:id,expectedVersion:(await x.comp(w,id)).version,archived:false});
  assert.equal((await x.pg.query<any>('SELECT enabled FROM app_monitors WHERE id=$1',[feat.definition_id])).rows[0].enabled,false,'research returns switched off');
  void ui;
  // A workspace with nothing to report: the weekly digest sends nothing (nonEmpty:false).
  const w2=await x.workspace('Quiet');const quiet=await x.install(w2,x.T.iu,'Investor Updates');const qs=await x.reconcile(quiet.receipt.appId);
  await runDigest(qs.find((r:any)=>r.recipe_key==='weekly_digest').definition_id);
  assert.equal((await x.pg.query<any>("SELECT count(*)::int AS n FROM app_service_jobs WHERE app_id=$1",[quiet.receipt.appId])).rows[0].n,0,'nothing to report sends nothing');
 });}finally{process.env.CONNECTOR_ENCRYPTION_KEY=oldKey;delete process.env.APP_AUTOMATION_RECIPES_ENABLED;await x.pg.close();}
});

test('exchange: one confirmed send (assistants cannot confirm), tracked deliveries and responses, questions answered privately and to everyone, unsubscribe, archive stops links; commands only propose',async()=>{
 const x=await suite();
 try{await withActor(x.human,async()=>{
  const w=await x.workspace('Send');const {receipt}=await x.install(w,x.T.iu,'Investor Updates',false);const id=receipt.appId;const sd=await seed(x,w,id);const {T,ui,plan,people}=sd;
  // The October board update, approved, with an ask.
  const today=new Date().toISOString().slice(0,10),period=today.slice(0,7);
  const uid=await x.save(w,T('investorupdates.updates'),{format:'email',plan_id:plan.id,kind:'scheduled',period,title:'Board – monthly update · October (fictional)',category_ids:plan.data.category_ids,status:'approved',approved_1_by:'Felix',approved_2_by:'Anna',approved_on:today,
   blocks:J([{id:'b1',type:'text',level:'everyone',text:'Runway is 14.2 months.'},{id:'b2',type:'metrics',level:'investors',items:[{label:'Runway',value:'14.2',unit:'months',fact:'f1'}]},{id:'b3',type:'callout',level:'board',tone:'lowlight',text:'Board only: licensing talks.'},{id:'b4',type:'asks',level:'everyone',items:[{key:'cmo_intro',text:'Introductions to an oncology CMO'}]}]),facts:J([{id:'f1',claim:'Runway',value:14.2,unit:'months',source:{kind:'chat',date:today}}]),asks:J([{key:'cmo_intro',text:'Introductions to an oncology CMO'}]),drafted_by:'claude',drafted_on:today});
  await ui.open({section:'updates'});await ui.click('send-open:'+uid);await ui.click('prepare-recipients');await ui.approve();
  const ds=await x.rows(T('investorupdates.deliveries'));assert.equal(ds.length,3,'Mara, Jonas and Priya (board); Omar is not in the send');assert.ok(ds.every((d:any)=>d.data.level==='board'&&!d.data.status));
  await ui.click('send-open:'+uid);await ui.click('create-links');assert.match(ui.last.state.notice,/Private links are ready \(3 people\)/);assert.equal(ui.last.proposal??null,null,'links need no review');
  const g=(await x.pg.query<any>("SELECT * FROM exchange_groups WHERE app_ref=$1",['update:'+uid+':board_h_q'])).rows[0];assert.ok(g,'one update room for the board version');assert.equal(g.series,'plan:'+plan.id);assert.equal(g.kind,'room');
  assert.match(g.content.html,/Board only: licensing talks/);assert.deepEqual(g.content.asks.map((a:any)=>a.key),['cmo_intro','question']);
  await ui.submit('prepare-email',{version:'board_h_q',subject:'October board update',body:'Dear {recipient_name},\n\nOur October update.'});const batch=ui.last.state.batch;assert.equal(batch.recipients.length,3);
  for(const r of batch.recipients)assert.ok(checksPassed(r.checks),J(r.checks));
  const sendOut=await ui.click('confirm-send');const proposal=sendOut.proposal;assert.ok(proposal,ui.last.state.notice);
  assert.equal((await x.rows(T('investorupdates.updates'))).find((u:any)=>u.id===uid).data.status,'approved','nothing changes before the person confirms');
  await assert.rejects(()=>x.f.confirm(x.ai,w,proposal.id,proposal.digest),'assistants cannot confirm a send');
  await x.f.confirm(x.human,w,proposal.id,proposal.digest);
  const sentU=(await x.rows(T('investorupdates.updates'))).find((u:any)=>u.id===uid);assert.deepEqual([sentU.data.status,JSON.parse(sentU.data.exchange_group_id).board_h_q],['sent',g.id],'the update locks in the same confirmation');
  assert.ok((await x.rows(T('investorupdates.plans')))[0].data.next_period_end>plan.data.next_period_end,'the plan moves to the next period');
  const mails:any[]=[];while(await deliverExchangeEmails(x.raw,async(m:any,key:string)=>{mails.push(m);return {id:'p-'+key};}));assert.equal(mails.length,3,'one email per person');
  for(const m of mails){assert.ok(m.html.includes('Runway is 14.2 months.')&&m.text.includes('Runway'),'the full update in the body');assert.match(m.subject,/October board update/);}
  const tok=(m:any)=>/\/exchange#([A-Za-z0-9_-]+)/.exec(m.text)![1];const byTo=(e:string)=>mails.find(m=>m.to[0]===e);
  const server=baseApp();addExternalExchange(server,new Service(x.db));server.use(errors);const api=(t:string)=>({get:(p='')=>request(server).get('/external-exchange'+p).set('x-trialy-exchange',t),post:(p:string,b:any)=>request(server).post('/external-exchange'+p).set('x-trialy-exchange',t).send(b)});
  const mara=api(tok(byTo('mara@alder.example.invalid'))),jonas=api(tok(byTo('jonas@birch.example.invalid')));
  assert.equal((await mara.get()).status,200);assert.equal((await jonas.get()).status,200);
  assert.equal((await mara.post('/asks',{askKey:'cmo_intro',note:'I know two oncology CMOs.',nonce:randomUUID()})).status,200);
  assert.equal((await jonas.post('/asks',{askKey:'question',note:'Does the budget include the GLP tox extension?',nonce:randomUUID()})).status,200);
  await worker(()=>syncExchangeTracking(x.raw));
  const dl=await x.rows(T('investorupdates.deliveries'));assert.equal(dl.filter((d:any)=>d.data.status==='read').length,2,'two read on their page');assert.ok(dl.every((d:any)=>d.data.exchange_id));
  const rs=await x.rows(T('investorupdates.responses'));assert.deepEqual(rs.map((r:any)=>[r.data.ask_key,r.data.status,r.data.update_id]).sort(),[['cmo_intro','new',uid],['question','new',uid]]);
  // Tracked fields are not editable by people or assistants.
  const mr=dl.find((d:any)=>d.data.status==='read');await assert.rejects(x.s.preview(x.human,w,{kind:'update_record',recordId:mr.id,expectedVersion:mr.version,data:{read_count:0}}).then(p=>x.s.commit(x.human,p.id,p.digest)),/recorded by TrialAgents/);
  const help=rs.find((r:any)=>r.data.ask_key==='cmo_intro'),q=rs.find((r:any)=>r.data.ask_key==='question');
  await assert.rejects(x.s.preview(x.human,w,{kind:'update_record',recordId:help.id,expectedVersion:help.version,data:{message:'edited'}}).then(p=>x.s.commit(x.human,p.id,p.digest)),/recorded by TrialAgents/);
  await ui.open({section:'overview'});assert.match(text(ui.html),/Jonas Weber Question Does the budget include the GLP tox extension\?/);
  // A follow-up on the offer of help stays editable.
  await ui.click('open:response:'+help.id);await ui.submit('save-response',{status:'following_up',owner:'Anna',follow_up_due:today});await ui.approve();assert.equal((await x.rows(T('investorupdates.responses'))).find((r:any)=>r.id===help.id).data.status,'following_up');
  // The private answer reaches only Jonas; the record joins the same confirmation.
  await ui.click('open:response:'+q.id);await ui.submit('send-answer',{answer:'Yes, the GLP tox extension is included (fictional).',scope:'private'});const ans=ui.last.proposal;assert.ok(ans,ui.last.state.notice);await assert.rejects(()=>x.f.confirm(x.ai,w,ans.id,ans.digest));
  await x.f.confirm(x.human,w,ans.id,ans.digest);const qa=(await x.rows(T('investorupdates.responses'))).find((r:any)=>r.id===q.id);assert.deepEqual([qa.data.answer_scope,qa.data.status],['private','answered']);
  const msgs=(await x.pg.query<any>("SELECT exchange_id,body FROM exchange_messages WHERE group_id=$1 AND author<>'recipient'",[g.id])).rows;assert.deepEqual(msgs.map((m:any)=>m.exchange_id),[q.data.exchange_id],'only the asker');
  // A second question answered to everyone invited: one message per live link, the asker not named.
  assert.equal((await mara.post('/asks',{askKey:'question',note:'When is the next board meeting?',nonce:randomUUID()})).status,200);await worker(()=>syncExchangeTracking(x.raw));
  const q2=(await x.rows(T('investorupdates.responses'))).find((r:any)=>r.data.ask_key==='question'&&!r.data.answered_on);await ui.click('open:response:'+q2.id);await ui.submit('send-answer',{answer:'On 4 December (fictional).',scope:'group'});await ui.approve();
  const all=(await x.pg.query<any>("SELECT exchange_id,body FROM exchange_messages WHERE group_id=$1 AND author<>'recipient' AND body LIKE 'A question was asked%'",[g.id])).rows;assert.equal(all.length,3);assert.ok(all.every((m:any)=>!/Mara/.test(m.body)));
  // Unsubscribe (one click, recorded per address and series): Priya is excluded from the next send of the series.
  const priyaMail=byTo('priya@natarajan.example.invalid'),unsub=new URL(priyaMail.headers['List-Unsubscribe'].slice(1,-1)).pathname;assert.equal((await request(server).post(unsub).type('form').send('List-Unsubscribe=One-Click')).status,200);
  const nov=await x.save(w,T('investorupdates.updates'),{format:'email',plan_id:plan.id,kind:'one_off',title:'Board flash (fictional)',category_ids:plan.data.category_ids,status:'approved',approved_1_by:'Felix',approved_2_by:'Anna',blocks:J([{id:'b1',type:'text',level:'everyone',text:'Flash.'}]),facts:'[]',drafted_on:today});
  const rd=await runAppCommand(x.f,x.human,w,{appId:id,expectedVersion:(await x.comp(w,id)).version,command:'update.read',input:{update_id:nov},requestKey:randomUUID()});assert.equal(rd.ok,true,rd.error);
  assert.ok(rd.result.recipients.excluded.some((e:any)=>e.name==='Priya Natarajan'&&/unsubscribed/.test(e.reason)));assert.equal(rd.result.recipients.people,2);
  // Assistants: commands propose only (a person confirms), there is no send command, and links never reach them.
  const c=await x.comp(w,id),cl=await listAppCommands(x.f,x.ai,w,{appId:c.id});assert.equal(cl.commands.length,39);assert.ok(!cl.commands.some((k:any)=>/send|approve/.test(k.id)));
  const dr=await runAppCommand(x.f,x.ai,w,{appId:c.id,expectedVersion:c.version,command:'update.create_draft',input:{format:'email',title:'Draft from chat',category_ids:JSON.parse(plan.data.category_ids),kind:'one_off'},requestKey:randomUUID()});assert.equal(dr.ok,true,dr.error);assert.ok(tookEffect(dr));
  // A4 (4.4): the draft is a record change, so with Data = Edit it saves directly; sending it still needs a person.
  assert.ok(dr.saved);assert.equal(dr.proposal,null);assert.ok((await x.rows(T('investorupdates.updates'))).some((u:any)=>u.data.title==='Draft from chat'));
  const bot=x.app(w,id,x.ai);await bot.open({section:'updates'});await bot.click('send-open:'+uid);assert.doesNotMatch(J(bot.last),new RegExp(tok(byTo('mara@alder.example.invalid'))),'no recipient link reaches an assistant');
  // Archive first: archiving the app stops the online links; restoring makes them available again.
  await x.change(w,{kind:'archive_component',componentId:id,expectedVersion:(await x.comp(w,id)).version,archived:true});assert.equal((await mara.get()).status,404);
  await x.change(w,{kind:'archive_component',componentId:id,expectedVersion:(await x.comp(w,id)).version,archived:false});assert.equal((await mara.get()).status,200);
  void people;
 });}finally{await x.pg.close();}
});
