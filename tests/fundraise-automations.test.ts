import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {Service} from '../src/domain/service.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {syncTemplateCatalog,installCatalogApp} from '../src/workspace/template-catalog.js';
import {dataAccessStep,confirmDataAccess} from '../src/workspace/data-access.js';
import {withActor,withDatabaseContext,setDatabaseContext,databaseContext} from '../src/db/context.js';
import {AutomationService} from '../src/automations/service.js';
import {AutomationEvents} from '../src/automations/events.js';
import {AutomationManagement} from '../src/automations/management.js';
import {AppMonitoring} from '../src/app-services/monitoring.js';
import {reconcileRecipeSetups} from '../src/automations/recipes.js';
import {readRecipes,validateRecipeDeclarations} from '../src/automations/recipes-schema.js';
import {validateAppFunctions} from '../src/workspace/app-functions-schema.js';
import {nextCalendar} from '../src/automations/schedules.js';
import {AppActions,dispatchAppActions} from '../src/app-services/service.js';
import {dispatchNotificationBatch} from '../src/app-services/notifications.js';
import {runFoundation} from '../src/foundation/worker.js';
import type {Database,Connection} from '../src/db/database.js';
import type {Actor} from '../src/shared/schema.js';

/* FUNDRAISE.md §8 (revised 14 Nov 2026) end to end, on a disposable database with every migration and the runtime role:
 * the real catalog installer offers the three install recommendations selected; Add app enables them after commit; investor
 * research may only create organizations and proposed investor profiles; the weekly digest is the app's read-only helper
 * (E7) applying the app's own rules; the signed-commitment notice fires once on the transition. Fictional data only. */
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ');
const day=(n:number)=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
async function suite(){
 const pg=new PGlite();for(const n of (await readdir('migrations')).filter(x=>x.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+n,'utf8'));await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();
 const db:Database={query:async(q,v)=>storage.getStore()?.query(q,v)??db.transaction(tx=>tx.query(q,v)),transaction:async fn=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async raw=>{await raw.exec(databaseContext().service==='worker'?'SET LOCAL ROLE trialy_worker':'SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(q,v)=>{await setDatabaseContext(raw as any);return raw.query(q,v) as any;}};return storage.run(tx,()=>fn(tx));});},close:()=>pg.close()};
 const raw:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const human:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...human,origin:'ai',connectionFamily:randomUUID(),clientId:randomUUID()};
 await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[human.userId,'cfo@northwind.invalid','CFO (fictional)']);
 await pg.query("INSERT INTO oauth_tokens(hash,user_id,client_id,kind,family,expires_at) VALUES($1,$2,$3,'refresh',$4,$5)",[randomUUID(),human.userId,ai.clientId,ai.connectionFamily,Date.now()+86400000]);
 await syncTemplateCatalog(raw);
 // Fundraise 2.0.0 is a draft in the repository catalog; it is approved only inside this disposable database.
 await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.investor-crm' AND version='2.0.0'");
 const f=new WorkspaceFoundation(db),s=new Service(db),F=await new AppTemplates(undefined,db).read({templateId:'life.investor-crm',version:'2.0.0'});
 const install=async(w:string,name:string,choose=true)=>{const target={install:{templateId:F.id,version:F.version,digest:F.digest,name,requestKey:randomUUID()}};const step=await dataAccessStep(f,human,w,target);
  return {step,receipt:step.needed?await confirmDataAccess(f,human,w,{...target,connections:{},stepDigest:step.digest,...(step.automations.length?{automations:step.automations.map((r:any)=>({key:r.key,enabled:choose,settings:{}}))}:{})}):await installCatalogApp(f,human,w,target.install)};};
 const comp=async(w:string,id:string)=>(await f.readComponent(human,w,id)).component;
 const mapOf=(c:any)=>JSON.parse(JSON.parse(/^const templateConfiguration=(.+);\n/.exec(c.source)![1]).tableMap);
 const rows=async(typeId:string)=>(await pg.query<any>("SELECT id,version,data FROM records WHERE type_id=$1 AND state<>'archived' ORDER BY created_at,id",[typeId])).rows;
 const save=async(w:string,typeId:string,data:any)=>{const p=await s.preview(human,w,{kind:'create_record',typeId,data});return (await s.commit(human,p.id,p.digest)).objects[0].id as string;};
 const workspace=async(name:string)=>{const w=(await s.createWorkspace(human,name)).id;await s.setAi(human,w,true);return w;};
 const reconcile=async(appId:string)=>{for(let i=0;i<4;i++){while(await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(db)));await pg.query("UPDATE automation_recipe_setups SET available_at=now() WHERE app_id=$1 AND status='pending'",[appId]);}
  return (await pg.query<any>('SELECT recipe_key,status,diagnostic,definition_id,definition_version FROM automation_recipe_setups WHERE app_id=$1 ORDER BY recipe_key',[appId])).rows;};
 const open=async(w:string,id:string,state:any={})=>{const c=await comp(w,id);return f.runFrontend(human,w,{componentId:c.id,expectedVersion:c.version,state,event:{kind:'open'}});};
 return {pg,db,human,ai,f,s,F,install,comp,mapOf,rows,save,workspace,reconcile,open};
}
const worker=<T>(fn:()=>T)=>withDatabaseContext({service:'worker'},fn);

test('declarations: three install recommendations, two read-only helpers bound by name, strict catalog validation',async()=>{
 const entry=JSON.parse(await readFile('templates/apps/life.investor-crm-2.0.0.json','utf8')),roles=Object.keys(JSON.parse(await readFile('templates/source/investor-crm/schema.example.json','utf8')));
 validateRecipeDeclarations(entry);const fns=validateAppFunctions(entry,roles);
 assert.deepEqual(readRecipes(entry).recommended.map(r=>r.key),['round_digest','signed_commitment','investor_research']);
 assert.deepEqual(fns.map(f=>f.name),['round_digest','research_brief']);
 for(const f of fns){assert.deepEqual(f.scope.capabilities,['records.read'],'helpers only read');assert.equal(f.scope.documents,false);assert.ok(!f.scope.roles.some(r=>r.startsWith('dataroom.')||r==='programs.plan_items'),'optional integration roles stay out of helper scope');}
 const research=readRecipes(entry).recommended.find(r=>r.key==='investor_research')!.research!;
 assert.deepEqual(research.writeBindings!.map(b=>[b.role,b.allowCreate,b.allowUpdate]),[['organizations',true,false],['fundraise.investor_profiles',true,false]],'research only creates');
 const profileFields=research.writeBindings![1].fields as string[];for(const k of ['tier','intro_path','archived'])assert.ok(!profileFields.includes(k),k+' is the user\'s');
 assert.match(research.instructions,/profile_status proposed/);assert.match(research.instructions,/never contact anyone/);
 // Settings stores no schedule, recipient or on/off: those live on the automation.
 const settings=JSON.parse(await readFile('templates/source/investor-crm/schema.example.json','utf8'))['fundraise.settings'].fields.map((x:any)=>x.key);
 assert.ok(!settings.some((k:string)=>/digest|schedule|recipient|cadence/.test(k)));
});

test('Add app enables digest, signed notice and research; research creates only proposed investors; the digest applies the app rules; the notice fires once; archive pauses',async()=>{
 const x=await suite();const oldKey=process.env.CONNECTOR_ENCRYPTION_KEY;process.env.CONNECTOR_ENCRYPTION_KEY=randomBytes(32).toString('base64');process.env.APP_AUTOMATION_RECIPES_ENABLED='true';
 const transport=async(req:any)=>{const body=JSON.parse(req.body);return {status:200,body:body.type==='verification'?JSON.stringify({challenge:body.challenge}):'{}',bytes:2,durationMs:1};};
 try{await withActor(x.human,async()=>{
  const w=await x.workspace('Seed raise');
  const s=new AutomationService(x.db),m=new AppMonitoring(x.db),manage=new AutomationManagement(x.db);
  const rp=await s.prepare(x.ai,w,{preferences:{time:'06:00',timeZone:'Europe/Berlin'}});const runner=await s.confirm(x.human,w,rp.id,rp.digest);
  await new AutomationEvents(x.db,transport).subscribe(x.ai,{name:'automation.ready',arguments:{workspaceId:w,runnerId:runner.id},delivery:{mode:'webhook',url:'https://callbacks.example.org/events',secret:'whsec_'+randomBytes(32).toString('base64')}} as any);
  const verify=(await s.agenda(x.ai,w,runner.id)).rows[0],vc:any=await s.claim(x.ai,w,{runnerId:runner.id,occurrenceId:verify.id,requestKey:randomUUID()});
  const [ready]=await Promise.all([s.setup(x.human,w,1),new Promise<void>((res,rej)=>setTimeout(()=>{void s.finish(x.ai,w,{occurrenceId:verify.id,claimToken:vc.claimToken}).then(()=>res(),rej);},25))]);assert.equal(ready.state,'ready');

  const {step,receipt}=await x.install(w,'Fundraise');assert.deepEqual(step.automations.map((r:any)=>r.key),['round_digest','signed_commitment','investor_research']);
  const id=receipt.appId,c0=await x.comp(w,id),map=x.mapOf(c0),T=(r:string)=>map[r].typeId;
  assert.deepEqual(c0.execution.map((b:any)=>b.name).sort(),['research_brief','round_digest'],'helpers installed with the app');
  const setups=await x.reconcile(id);assert.deepEqual(setups.map((r:any)=>[r.recipe_key,r.status]),[['investor_research','active'],['round_digest','active'],['signed_commitment','active']],JSON.stringify(setups));
  const S=(k:string)=>setups.find((r:any)=>r.recipe_key===k);
  // Research stores results in the app: create-only on organizations and investor profiles, nothing else.
  const mon={id:S('investor_research').definition_id};const mr=await m.read(x.ai,w,mon.id);assert.equal(mr.config.storeResults,true);
  const grants=mr.context.writeScopes.map((g:any,i:number)=>({scopeId:mr.config.writeScopes[i].scopeId,version:mr.config.writeScopes[i].version,typeId:g.body.bindings[0].typeId,create:g.body.allowCreate,update:g.body.allowUpdate}));
  assert.deepEqual(grants.map((g:any)=>[g.typeId,g.create,g.update]).sort(),[[T('organizations'),true,false],[T('fundraise.investor_profiles'),true,false]].sort());
  const monthly=(readRecipes(x.F).recommended.find(r=>r.key==='investor_research') as any).trigger,due=(await x.pg.query<any>('SELECT next_at FROM automation_dispatch WHERE monitor_id=$1',[mon.id])).rows[0]?.next_at;
  assert.equal(new Date(due).toISOString(),nextCalendar(monthly,new Date()).toISOString(),'first Monday of the month, 07:00 Europe/Berlin');assert.equal(new Date(due).getUTCDay(),1);
  const digestAction=(await x.pg.query<any>('SELECT id,config FROM app_actions WHERE id=$1',[S('round_digest').definition_id])).rows[0];
  assert.equal(digestAction.config.trigger.kind,'calendar');assert.equal(digestAction.config.steps[0].summary.binding,'round_digest');assert.deepEqual(digestAction.config.steps[0].to,['cfo@northwind.invalid']);
  assert.equal((await manage.readiness(x.human,w,mon.id,[])).ready,true);

  // Fictional round: signed EUR 2.0M (lead), verbal 1.0M, soft 0.5M, a signed USD amount (flagged), a stale conversation, a follow-up due.
  const round=await x.save(w,T('fundraise.rounds'),{name:'Seed 2026 (fictional)',round_type:'seed',target_amount:10000000,currency:'EUR',status:'active',opened_on:day(-60),archived:false});
  const org=async(name:string)=>x.save(w,T('organizations'),{name,org_type:'investor',website:'https://'+name.split(' ')[0].toLowerCase()+'.example.invalid',archived:false});
  const [alder,birch,cedar,dune,elm,fern]=await Promise.all(['Alder Ventures (fictional)','Birch Capital (fictional)','Cedar Angels (fictional)','Dune Partners (fictional)','Elm Bio Fund (fictional)','Fern Health VC (fictional)'].map(org));
  const opp=(o:string,data:any)=>x.save(w,T('fundraise.opportunities'),{round_id:round,organization_id:o,currency:'EUR',archived:false,...data});
  await opp(alder,{stage:'committed',interest:'signed',amount_committed:2000000,is_lead:true,offer_status:'received',last_activity_on:day(-2)});
  const birchOpp=await opp(birch,{stage:'term_sheet',interest:'verbal',amount_indicated:1000000,last_activity_on:day(-3),next_step:'Send the updated model',next_due:day(1)});
  await opp(cedar,{stage:'partner_meeting',interest:'soft',amount_indicated:500000,last_activity_on:day(-1)});
  await opp(dune,{stage:'committed',interest:'signed',amount_committed:750000,currency:'USD',last_activity_on:day(-1)});
  await opp(elm,{stage:'contacted',interest:'none',last_activity_on:day(-30)});
  await x.save(w,T('fundraise.investor_profiles'),{organization_id:fern,investor_type:'generalist_vc',profile_status:'proposed',source:'https://news.example.invalid/fern',source_date:day(-5),archived:false});

  // Research run: the brief comes from the app helper; the runner creates one organization and one proposed profile.
  const occurrence=randomUUID();await x.pg.query("INSERT INTO automation_occurrences(id,workspace_id,user_id,runner_id,monitor_id,monitor_version,occurrence_key,due_at,reason) VALUES($1,$2,$3,$4,$5,$6,$7,now(),'scheduled_due')",[occurrence,w,x.human.userId,runner.id,mon.id,S('investor_research').definition_version,'monthly-'+randomUUID()]);
  const claim:any=await s.claim(x.ai,w,{runnerId:runner.id,occurrenceId:occurrence,requestKey:randomUUID()});
  assert.equal((await withActor(x.ai,()=>m.brief(x.ai,w,claim.runId))).state,'preparing');await worker(()=>runFoundation(x.db));const brief=await withActor(x.ai,()=>m.brief(x.ai,w,claim.runId));assert.equal(brief.state,'ready',JSON.stringify(brief));
  const ctx=JSON.parse(brief.context);assert.equal(ctx.rounds[0].name,'Seed 2026 (fictional)');assert.equal(ctx.complete,true);
  assert.deepEqual(ctx.knownInvestors.map((k:any)=>[k.name,k.status]),[['Fern Health VC (fictional)','proposed']]);assert.equal(ctx.investorOrganizationsWithoutProfile.length,5,'existing investors to link instead of duplicating');
  const G=(t:string)=>grants.find((g:any)=>g.typeId===t)!,write=(t:string,changes:any[])=>withActor(x.ai,()=>x.f.maintain(x.ai,w,{scopeId:G(t).scopeId,expectedScopeVersion:G(t).version,requestKey:randomUUID(),sourceLabel:'https://news.example.invalid',interpretation:'Public investor evidence (fictional)',changes} as any,undefined,false,claim.runId));
  const created=await write(T('organizations'),[{kind:'create_record',typeId:T('organizations'),data:{name:'Gorse Life Sciences (fictional)',org_type:'investor',website:'https://gorse.example.invalid'}}]) as any;
  const gorse=(await x.rows(T('organizations'))).find((r:any)=>r.data.name==='Gorse Life Sciences (fictional)')!.id;assert.ok(created);
  await write(T('fundraise.investor_profiles'),[{kind:'create_record',typeId:T('fundraise.investor_profiles'),data:{organization_id:gorse,investor_type:'specialist_ls_vc',profile_status:'proposed',source:'https://news.example.invalid/gorse-seed',source_date:day(-10),notes:'Led a fictional preclinical seed.'}}]);
  const fernProfile=(await x.rows(T('fundraise.investor_profiles'))).find((r:any)=>r.data.organization_id===fern)!;
  await assert.rejects(()=>write(T('fundraise.investor_profiles'),[{kind:'update_record',recordId:fernProfile.id,expectedVersion:fernProfile.version,data:{profile_status:'accepted'}}]),'research cannot accept investors');
  assert.equal(grants.some((g:any)=>g.typeId===T('fundraise.opportunities')),false);await assert.rejects(()=>write(T('fundraise.investor_profiles'),[{kind:'create_record',typeId:T('fundraise.opportunities'),data:{round_id:round,organization_id:gorse,stage:'target',interest:'none',currency:'EUR'}}]),'research cannot touch the pipeline');
  await s.finish(x.ai,w,{occurrenceId:occurrence,claimToken:claim.claimToken,result:{status:'completed',summary:'Fundraise investor research: 1 proposed'}});
  const inv=text((await x.open(w,id,{section:'investors',invTab:'proposed'})).html);assert.match(inv,/Gorse Life Sciences \(fictional\)/);
  const pipe=text((await x.open(w,id,{section:'pipeline'})).html);assert.doesNotMatch(pipe,/Gorse Life Sciences/,'proposed investors stay out of the pipeline');

  // Weekly digest: the installed helper writes the text; same numbers as the Overview screen.
  const actions=new AppActions(x.db),deliver=async(actionId:string)=>{const batch=await actions.runNow(x.human,w,actionId,randomUUID());const tick=async()=>{await x.pg.query('UPDATE app_notification_batches SET not_before=now() WHERE id=$1',[batch.id]);await worker(()=>dispatchNotificationBatch(x.db));};await tick();await worker(()=>runFoundation(x.db));await tick();return (await x.pg.query<any>('SELECT * FROM app_notification_batches WHERE id=$1',[batch.id])).rows[0];};
  await deliver(digestAction.id);const job=(await x.pg.query<any>("SELECT payload FROM app_service_jobs WHERE app_id=$1 ORDER BY created_at DESC LIMIT 1",[id])).rows[0];assert.ok(job,'digest delivered');
  const mail=job.payload.message.text as string;
  assert.match(job.payload.message.subject,/^Fundraise · week of \d+ \w{3}$/);assert.deepEqual(job.payload.message.to,['cfo@northwind.invalid']);
  assert.match(mail,/Seed 2026 \(fictional\): raised EUR 2,000,000 of EUR 10,000,000 \(20%\)/);
  assert.match(mail,/Verbal EUR 1,000,000 · Soft EUR 500,000 \(not counted as raised\)/);
  assert.match(mail,/Lead: Alder Ventures \(fictional\) · term sheet received/);
  assert.match(mail,/Due this week \(1\):\n· \d+ \w{3} Birch Capital \(fictional\): Send the updated model/);
  assert.match(mail,/Stale, no activity for more than 14 days \(1\):\n· Elm Bio Fund \(fictional\) \(Contacted, 30 days\)/);
  assert.match(mail,/1 amount in another currency than EUR excluded from totals\./);
  assert.match(mail,/2 proposed investors waiting for review in Investors\./);
  const overview=text((await x.open(w,id,{section:'overview'})).html);assert.match(overview,/Raised EUR 2,000,000 of EUR 10,000,000 \(20%\)/,'the app shows the same line');

  // Signed commitment notice: once, on the transition to signed; a later edit of the same opportunity sends nothing new.
  const notice=S('signed_commitment').definition_id;
  const fire=async()=>{await x.pg.query("UPDATE app_actions SET next_at=now()-interval '1 second' WHERE id=$1",[notice]);while(await worker(()=>dispatchAppActions(x.db)));return (await x.pg.query<any>('SELECT i.record_id FROM app_notification_items i JOIN app_notification_batches b ON b.id=i.batch_id WHERE b.action_id=$1 ORDER BY i.record_id',[notice])).rows.map((r:any)=>r.record_id).sort();};
  const signedAtCreation=(await x.rows(T('fundraise.opportunities'))).filter((r:any)=>r.data.interest==='signed').map((r:any)=>r.id).sort();
  assert.deepEqual(await fire(),signedAtCreation,'opportunities created as signed are noticed once each');
  const b=(await x.rows(T('fundraise.opportunities'))).find((r:any)=>r.id===birchOpp)!;
  let p=await x.s.preview(x.human,w,{kind:'update_record',recordId:b.id,expectedVersion:b.version,data:{interest:'signed',stage:'committed',amount_committed:1000000}});await x.s.commit(x.human,p.id,p.digest);
  assert.deepEqual(await fire(),[...signedAtCreation,birchOpp].sort(),'the transition to signed adds one notice');
  const b2=(await x.rows(T('fundraise.opportunities'))).find((r:any)=>r.id===birchOpp)!;
  p=await x.s.preview(x.human,w,{kind:'update_record',recordId:b2.id,expectedVersion:b2.version,data:{next_step:'Countersign'}});await x.s.commit(x.human,p.id,p.digest);
  assert.deepEqual(await fire(),[...signedAtCreation,birchOpp].sort(),'no second notice without a new transition');

  // Archiving the app pauses research and both emails.
  const pv=await x.f.preview(x.human,w,{kind:'archive_component',componentId:id,expectedVersion:(await x.comp(w,id)).version,archived:true});await x.f.confirm(x.human,w,pv.id,pv.digest);
  assert.ok((await x.pg.query<any>('SELECT archived_with_app_at FROM app_monitors WHERE id=$1',[mon.id])).rows[0].archived_with_app_at);
  for(const a of [digestAction.id,notice])assert.ok((await x.pg.query<any>('SELECT archived_with_app_at FROM app_actions WHERE id=$1',[a])).rows[0].archived_with_app_at);
 });}finally{process.env.CONNECTOR_ENCRYPTION_KEY=oldKey;delete process.env.APP_AUTOMATION_RECIPES_ENABLED;await x.pg.close();}
});

test('opting out at Add app and having no runner: the app installs and works; nothing becomes active',async()=>{
 const x=await suite();process.env.APP_AUTOMATION_RECIPES_ENABLED='true';
 try{await withActor(x.human,async()=>{
  const w=await x.workspace('No runner');const {receipt}=await x.install(w,'Fundraise');
  for(let i=0;i<4;i++)await worker(()=>reconcileRecipeSetups(x.db));
  const rows=(await x.pg.query<any>('SELECT recipe_key,status FROM automation_recipe_setups WHERE app_id=$1 ORDER BY recipe_key',[receipt.appId])).rows;
  assert.deepEqual(rows.map((r:any)=>r.recipe_key),['investor_research','round_digest','signed_commitment']);
  assert.notEqual(rows.find((r:any)=>r.recipe_key==='investor_research').status,'active','research needs a ready runner');
  for(const section of ['overview','pipeline','investors','round','activity','engagement','settings'])assert.match(text((await x.open(w,receipt.appId,{section})).html),/Fundraise/,section);
  const w2=await x.workspace('Opted out');const out=await x.install(w2,'Fundraise copy',false);await worker(()=>reconcileRecipeSetups(x.db));
  assert.equal((await x.pg.query<any>("SELECT count(*)::int AS n FROM automation_recipe_setups WHERE app_id=$1 AND status='active'",[out.receipt.appId])).rows[0].n,0);
 });}finally{delete process.env.APP_AUTOMATION_RECIPES_ENABLED;await x.pg.close();}
});
