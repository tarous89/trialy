import {settle,tookEffect} from './settle.js';
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
import {dispatchDue} from '../src/automations/worker.js';
import {dispatchAppActions} from '../src/app-services/service.js';
import {dispatchNotificationBatch} from '../src/app-services/notifications.js';
import {runFoundation} from '../src/foundation/worker.js';
import type {Database,Connection} from '../src/db/database.js';
import type {Actor} from '../src/shared/schema.js';

/* PROGRAMS.md §14 end to end, on a disposable database with every migration and the runtime role: the real catalog installer
 * offers the six install recommendations selected; Add app enables them after commit; the weekly digest research may only create a
 * digest; member notices compile to record-date email actions routed to the record's member; an assignment queues one email to that
 * member; with no runner the app still installs and the notices still work. Fictional data only. */
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
 // Programs 2.2.0 is a draft until the owner approves it; it is approved only inside this disposable database.
 await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.project-oversight' AND version='2.2.1'");
 const f=new WorkspaceFoundation(db),s=new Service(db),F=await new AppTemplates(undefined,db).read({templateId:'life.project-oversight',version:'2.2.1'});
 const install=async(w:string,name:string,choose=true)=>{const target={install:{templateId:F.id,version:F.version,digest:F.digest,name,requestKey:randomUUID()}};const step=await dataAccessStep(f,human,w,target);
  return {step,receipt:step.needed?await confirmDataAccess(f,human,w,{...target,connections:{},stepDigest:step.digest,...(step.automations.length?{automations:step.automations.map((r:any)=>({key:r.key,enabled:choose,settings:{}}))}:{})}):await installCatalogApp(f,human,w,target.install)};};
 const comp=async(w:string,id:string)=>(await f.readComponent(human,w,id)).component;
 const mapOf=(c:any)=>JSON.parse(JSON.parse(/^const templateConfiguration=(.+);\n/.exec(c.source)![1]).tableMap);
 const rows=async(typeId:string)=>(await pg.query<any>("SELECT id,version,data FROM records WHERE type_id=$1 AND state<>'archived' ORDER BY created_at,id",[typeId])).rows;
 const save=async(w:string,typeId:string,data:any)=>{const p=await s.preview(human,w,{kind:'create_record',typeId,data});return (await s.commit(human,p.id,p.digest)).objects[0].id as string;};
 const workspace=async(name:string)=>{const w=(await s.createWorkspace(human,name)).id;await s.setAi(human,w,true);return w;};
 const reconcile=async(appId:string)=>{for(let i=0;i<4;i++){while(await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(db)));await pg.query("UPDATE automation_recipe_setups SET available_at=now() WHERE app_id=$1 AND status='pending'",[appId]);}
  return (await pg.query<any>('SELECT recipe_key,status,diagnostic,definition_id,definition_version,follow_up_id FROM automation_recipe_setups WHERE app_id=$1 ORDER BY recipe_key',[appId])).rows;};
 const open=async(w:string,id:string,state:any={})=>{const c=await comp(w,id);return f.runFrontend(human,w,{componentId:c.id,expectedVersion:c.version,state,event:{kind:'open'}});};
 return {pg,db,human,ai,f,s,F,install,comp,mapOf,rows,save,workspace,reconcile,open};
}
const worker=<T>(fn:()=>T)=>withDatabaseContext({service:'worker'},fn);
const KEYS=['item_assigned','item_due','raid_assigned','raid_review','team_added','weekly_digest'];

test('Add app enables the AI digest and five member notices; the digest only creates digests; an assignment notifies the member',async()=>{
 const x=await suite();const oldKey=process.env.CONNECTOR_ENCRYPTION_KEY;process.env.CONNECTOR_ENCRYPTION_KEY=randomBytes(32).toString('base64');
 const transport=async(req:any)=>{const body=JSON.parse(req.body);return {status:200,body:body.type==='verification'?JSON.stringify({challenge:body.challenge}):'{}',bytes:2,durationMs:1};};
 try{await withActor(x.human,async()=>{
  const w=await x.workspace('Programs team');
  const s=new AutomationService(x.db),m=new AppMonitoring(x.db),manage=new AutomationManagement(x.db);
  const rp=await s.prepare(x.ai,w,{preferences:{time:'06:00',timeZone:'Europe/Berlin'}});const runner=await s.confirm(x.human,w,rp.id,rp.digest);
  await new AutomationEvents(x.db,transport).subscribe(x.ai,{name:'automation.ready',arguments:{workspaceId:w,runnerId:runner.id},delivery:{mode:'webhook',url:'https://callbacks.example.org/events',secret:'whsec_'+randomBytes(32).toString('base64')}} as any);
  const verify=(await s.agenda(x.ai,w,runner.id)).rows[0],vc:any=await s.claim(x.ai,w,{runnerId:runner.id,occurrenceId:verify.id,requestKey:randomUUID()});
  const [ready]=await Promise.all([s.setup(x.human,w,1),new Promise<void>((res,rej)=>setTimeout(()=>{void s.finish(x.ai,w,{occurrenceId:verify.id,claimToken:vc.claimToken}).then(()=>res(),rej);},25))]);assert.equal(ready.state,'ready');

  const {step,receipt}=await x.install(w,'Programs');assert.deepEqual(step.automations.map((r:any)=>r.key).sort(),KEYS);
  const id=receipt.appId,c0=await x.comp(w,id),map=x.mapOf(c0),T=(r:string)=>map[r].typeId;
  assert.deepEqual(c0.execution.map((b:any)=>b.name).sort(),['digest_brief','digest_email'],'helpers installed with the app');
  const setups=await x.reconcile(id);assert.deepEqual(setups.map((r:any)=>[r.recipe_key,r.status]),KEYS.map(k=>[k,'active']),JSON.stringify(setups));
  const S=(k:string)=>setups.find((r:any)=>r.recipe_key===k);
  // The AI digest stores results in the app: create-only on programs.digests, nothing else; one automation with its email step.
  const mon=S('weekly_digest').definition_id,mr=await m.read(x.ai,w,mon);assert.equal(mr.config.storeResults,true);
  assert.deepEqual(mr.context.writeScopes.map((g:any)=>[g.body.bindings[0].typeId,g.body.allowCreate,g.body.allowUpdate]),[[T('programs.digests'),true,false]]);
  assert.ok(S('weekly_digest').follow_up_id,'the email is a step of the same automation');
  assert.equal((await manage.readiness(x.human,w,mon,[])).ready,true);
  // Member notices: record-date email actions on the app-kept dates, routed by the record's member field, owner as fallback.
  const action=async(k:string)=>(await x.pg.query<any>('SELECT id,config FROM app_actions WHERE id=$1',[S(k).definition_id])).rows[0];
  for(const [k,role,field,member] of [['team_added','programs.team','added_on','member_id'],['item_assigned','programs.plan_items','assigned_on','owner_member_id'],['item_due','programs.plan_items','remind_on','owner_member_id'],['raid_assigned','programs.raid','assigned_on','owner_member_id'],['raid_review','programs.raid','remind_on','owner_member_id']]){
   const a=await action(k);assert.equal(a.config.trigger.kind,'record_date',k);assert.equal(a.config.trigger.typeId,T(role),k);assert.equal(a.config.trigger.field,field,k);assert.equal(a.config.steps[0].memberField,member,k);assert.deepEqual(a.config.steps[0].to,['cfo@northwind.invalid'],k);}

  // A fictional plan, saved through the app's own proposals: the owner (the signed-in member) is on the team with a member ID.
  const program=await x.save(w,T('programs'),{name:'PX-101 (fictional)',stage:'ind_enabling',status:'active',archived:false});
  const run=async(state:any,event:any)=>{const c=await x.comp(w,id);return x.f.runFrontend(x.human,w,{componentId:c.id,expectedVersion:c.version,state,event});};
  const commit=async(state:any,event:any)=>{const out:any=await run(state,event);assert.ok(tookEffect(out),'the app saved a change: '+JSON.stringify(out.state?.notice));await settle(x.f,x.human,w,out);return out;};
  let st:any=(await run({section:'settings'},{kind:'click',action:'add:team'})).state;
  await commit(st,{kind:'submit',action:'save-record',form:{program_id:program,name:'Morgan Lee',member_id:x.human.userId,role:'CMC lead'}});
  const team=(await x.rows(T('programs.team')))[0];assert.equal(team.data.added_on,day(0),'added today: the welcome notice date');
  st=(await run({section:'plan'},{kind:'click',action:'add:items'})).state;
  await commit(st,{kind:'submit',action:'save-record',form:{name:'GMP batch',program_id:program,item_type:'milestone',function:'cmc',owner:'Morgan Lee',end_date:day(30),status:'planned',is_key:'false'}});
  const it=(await x.rows(T('programs.plan_items')))[0];
  assert.deepEqual([it.data.owner_member_id,it.data.assigned_on,it.data.remind_on],[x.human.userId,day(0),day(23)]);

  // The scheduler finds today's assignment: one email batch for the member (one due action per dispatch call).
  const dispatchAll=async()=>{for(let i=0;i<20&&await worker(()=>dispatchAppActions(x.db));i++);};
  const assign=await action('item_assigned');
  // The notice is due at 08:00 Berlin on the assignment date. Before that hour (00:00 to 07:00 UTC in winter) nothing is due yet,
  // so the test moves the hour to 00:00 to stay independent of when it runs.
  await x.pg.query("UPDATE app_actions SET config=jsonb_set(config,'{trigger,time}',to_jsonb($2::text)),next_at=now()-interval '1 second' WHERE id=$1",[assign.id,'00:00']);await dispatchAll();
  const batches=(await x.pg.query<any>('SELECT id FROM app_notification_batches WHERE action_id=$1',[assign.id])).rows;assert.equal(batches.length,1,'one assignment email');
  await x.pg.query('UPDATE app_notification_batches SET not_before=now() WHERE id=$1',[batches[0].id]);await worker(()=>dispatchNotificationBatch(x.db));
  const job=(await x.pg.query<any>("SELECT payload FROM app_service_jobs WHERE app_id=$1 ORDER BY created_at DESC LIMIT 1",[id])).rows[0];assert.ok(job,'assignment notice delivered to the outbox');
  assert.deepEqual(job.payload.message.to,['cfo@northwind.invalid']);assert.match(job.payload.message.subject,/Programs: you own GMP batch/);assert.match(job.payload.message.text,new RegExp('End date: '+day(30)));
  // The reminder is not due yet: nothing is queued for it.
  const due=await action('item_due');await x.pg.query("UPDATE app_actions SET next_at=now()-interval '1 second' WHERE id=$1",[due.id]);await dispatchAll();
  assert.equal((await x.pg.query<any>('SELECT count(*)::int AS n FROM app_notification_batches WHERE action_id=$1',[due.id])).rows[0].n,0);

  // The digests tab shows a saved digest; archiving the app pauses everything.
  await x.save(w,T('programs.digests'),{run_on:day(0),period:'this week',summary:'Programs · this week: 1 item needs attention',attention_count:1,written_by:'claude'});
  assert.match(text((await x.open(w,id,{section:'updates',upTab:'digests'})).html),/Programs · this week: 1 item needs attention/);
  const pv=await x.f.preview(x.human,w,{kind:'archive_component',componentId:id,expectedVersion:(await x.comp(w,id)).version,archived:true});await x.f.confirm(x.human,w,pv.id,pv.digest);
  assert.ok((await x.pg.query<any>('SELECT archived_with_app_at FROM app_monitors WHERE id=$1',[mon])).rows[0].archived_with_app_at);
  for(const k of KEYS.filter(k=>k!=='weekly_digest'))assert.ok((await x.pg.query<any>('SELECT archived_with_app_at FROM app_actions WHERE id=$1',[S(k).definition_id])).rows[0].archived_with_app_at,k);
 });}finally{process.env.CONNECTOR_ENCRYPTION_KEY=oldKey;await x.pg.close();}
});

test('no runner: the app installs and works, the notices are active and the AI digest waits for setup; opting out activates nothing',async()=>{
 const x=await suite();
 try{await withActor(x.human,async()=>{
  const w=await x.workspace('No runner');const {receipt}=await x.install(w,'Programs');
  const rows=await x.reconcile(receipt.appId);
  assert.deepEqual(rows.map((r:any)=>[r.recipe_key,r.status==='active']),KEYS.map(k=>[k,k!=='weekly_digest']),'the AI digest needs a ready runner; the notices do not');
  for(const section of ['overview','timeline','plan','decisions','raid','updates','settings'])assert.match(text((await x.open(w,receipt.appId,{section})).html),/Programs/,section);
  const w2=await x.workspace('Opted out');const out=await x.install(w2,'Programs copy',false);await worker(()=>reconcileRecipeSetups(x.db));
  assert.equal((await x.pg.query<any>("SELECT count(*)::int AS n FROM automation_recipe_setups WHERE app_id=$1 AND status='active'",[out.receipt.appId])).rows[0].n,0);
 });}finally{await x.pg.close();}
});
