import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AsyncLocalStorage} from 'node:async_hooks';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,withDatabaseContext,setDatabaseContext,databaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {appTemplateEntry,AppTemplates} from '../src/workspace/app-templates.js';
import {dataAccessStep,confirmDataAccess} from '../src/workspace/data-access.js';
import {automationRecipe,readRecipes,validateRecipeDeclarations} from '../src/automations/recipes-schema.js';
import {readAppRecipes,reconcileRecipeSetups,prepareAppRecipe,confirmAppRecipe,cancelRecipeSetup,recipeDigest} from '../src/automations/recipes.js';
import {schedule} from '../src/automations/schema.js';
import {nextCalendar} from '../src/automations/schedules.js';
import {withinCatchUp} from '../src/app-services/service.js';
import {meaningfulRun} from '../src/automations/run-data.js';
import {Foundation} from '../src/foundation/service.js';
import {runFoundation} from '../src/foundation/worker.js';
import {AppActions,dispatchAppActions} from '../src/app-services/service.js';
import {dispatchNotificationBatch} from '../src/app-services/notifications.js';
import {AppMonitoring} from '../src/app-services/monitoring.js';
import {AutomationService} from '../src/automations/service.js';
import type {Actor} from '../src/shared/schema.js';

const trigger={kind:'calendar',frequency:'weekly',anchor:'2026-11-01',time:'09:00',timeZone:'Europe/Berlin',weekdays:[1]};
const email=automationRecipe.parse({key:'weekly_notice',name:'Weekly review',description:'Review the app each Monday.',trigger,email:{subject:'Weekly review',text:'Open the app to review your work.'}});
const research=automationRecipe.parse({key:'research',name:'Research',description:'Review reliable sources weekly.',trigger,research:{objective:'Find meaningful updates.',instructions:'Propose relevant findings with citations.',sourcePolicy:'Use primary sources.',readBindings:[{role:'test.tasks',fields:['name']}]}});
const contextual=automationRecipe.parse({...email,key:'entry_reminder',contextRole:'test.tasks',trigger:{kind:'record_date',role:'test.tasks',field:'due',time:'09:00',timeZone:'Europe/Berlin'},email:{...email.email,fields:['name']}});

test('portable recipe validation isolates bad optional declarations and duplicate keys',()=>{
 assert.equal(readRecipes({}).recipes.length,0);
 assert.equal(readRecipes({recommendedAutomations:[email,{key:'invalid'}]}).recommended.length,1);
 assert.equal(readRecipes({recommendedAutomations:[email],automationFeatures:[email]}).recipes.length,0);
 assert.equal(readRecipes({recommendedAutomations:[{...email,contextRole:'tasks'}]}).recipes.length,0);
 assert.equal(readRecipes({recommendedAutomations:[{...email,trigger:{kind:'after',recipe:'missing'}}]}).recipes.length,0);
 assert.equal(readRecipes({recommendedAutomations:Array.from({length:10},(_,n)=>({...email,key:'recipe_'+n}))}).recommended.length,10);
});
test('monthly weekday and business-day schedules retain timezone and skip absent fifth weekdays',()=>{
 const parse=(monthRule:any)=>schedule.parse({...trigger,frequency:'monthly',monthRule}) as any;
 assert.equal(nextCalendar(parse({kind:'weekday',nth:5,weekday:1}),new Date('2026-11-01T00:00Z')).toISOString(),'2026-11-30T08:00:00.000Z');
 assert.equal(nextCalendar(parse({kind:'weekday',nth:5,weekday:1}),new Date('2026-12-01T00:00Z')).toISOString(),'2027-03-29T07:00:00.000Z');
 assert.equal(nextCalendar(parse({kind:'business_day',nth:3}),new Date('2026-11-01T00:00Z')).toISOString(),'2026-11-04T08:00:00.000Z');
});
test('catch-up uses local dates across DST and meaningful results include unsaved proposals',()=>{
 assert.equal(withinCatchUp(new Date('2026-10-24T22:30Z'),new Date('2026-11-01T22:00Z'),'Europe/Berlin',7),true);
 assert.equal(withinCatchUp(new Date('2026-10-23T22:30Z'),new Date('2026-11-01T22:00Z'),'Europe/Berlin',7),false);
 assert.equal(meaningfulRun({savedChanges:0,findings:[{relevant:true}]}),true);
 assert.equal(meaningfulRun({savedChanges:0,findings:[{relevant:false}]}),false);
});

test('an invalid optional bundled recipe leaves the gallery usable but cannot be published',async()=>{
 const root=await mkdtemp(join(tmpdir(),'recipe-catalog-'));
 try{
  const files=(await readdir('templates/apps')).filter(n=>n.endsWith('.json'));
  const good=JSON.parse(await readFile('templates/apps/'+files[0],'utf8'));
  const broken={...good,id:'test.bad-recipe',recommendedAutomations:[{...email,trigger:{kind:'unsupported'}}]};
  await writeFile(join(root,'good.json'),JSON.stringify(good));await writeFile(join(root,'bad.json'),JSON.stringify(broken));
  const catalog=new AppTemplates(root);assert.equal((await catalog.list()).total,2);
  assert.equal(readRecipes(await catalog.read({templateId:broken.id})).recipes.length,0);
  assert.throws(()=>validateRecipeDeclarations(broken));
 }finally{await rm(root,{recursive:true,force:true});}
});

test('install approvals and optional reconciliation use real restricted roles',async t=>{
 process.env.APP_AUTOMATION_RECIPES_ENABLED='true';
 const pg=new PGlite();for(const name of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+name,'utf8'));
 await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();
 const db:Database={query:async(s,v)=>{const tx=storage.getStore();return tx?tx.query(s,v):db.transaction(t=>t.query(s,v));},transaction:async fn=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async raw=>{await raw.exec(databaseContext().service==='worker'?'SET LOCAL ROLE trialy_worker':'SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(s,v)=>{await setDatabaseContext(raw as any);return raw.query(s,v) as any;}};return storage.run(tx,()=>fn(tx));});},close:()=>pg.close()};
 const a:Actor={userId:randomUUID(),origin:'human'},other:Actor={userId:randomUUID(),origin:'human'};
 for(const actor of [a,other])await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,actor===a?'owner@example.invalid':'other@example.invalid','Owner']);
 try{await withActor(a,async()=>{
  const f=new WorkspaceFoundation(db),s=new Service(db),w=(await s.createWorkspace(a,'Recipe tests')).id;await s.setAi(a,w,true);
  const payload=appTemplateEntry.parse({id:'test.recipes',version:'1.0.0',name:'Recipe app',description:'Synthetic fixture',tags:[],whenToUse:'Tests',whenNotToUse:'Production',instructions:'Use the supplied bindings.',engine:'frontend-js',options:{tableMap:{type:'string',description:'Tables'}},source:"return {html:'<main><h1>Recipe app</h1><p>Saved app</p></main>'};",recommendedAutomations:[email,research],automationFeatures:[contextual]});
  const digest=recipeDigest(payload);await pg.query("INSERT INTO app_template_catalog(template_id,version,status,digest,payload,install_schema) VALUES($1,$2,'approved',$3,$4,$5)",[payload.id,payload.version,digest,JSON.stringify(payload),JSON.stringify({'test.tasks':{name:'Tasks',fields:[{key:'name',name:'Name',kind:'text'},{key:'due',name:'Due',kind:'date'}],logicalFields:{name:'name',due:'due'}}})]);
  const install=async(name:string,selected=['weekly_notice','research'])=>{
   const target={install:{templateId:payload.id,version:payload.version,digest,name,requestKey:randomUUID(),createNew:true}};
   const step=await dataAccessStep(f,a,w,target);assert.equal(step.automations.length,2);assert.equal(step.needed,true);
   const input={...target,connections:{},access:[],automations:step.automations.map(r=>({key:r.key,enabled:selected.includes(r.key),settings:{}})),stepDigest:step.digest};
   return {input,receipt:await confirmDataAccess(f,a,w,input)};
  };
  const first=await install('First');
  await t.test('installation commits pending intents and replay never duplicates or changes choices',async()=>{
   assert.equal(first.receipt.automationStatus,'pending');assert.equal(first.receipt.automations.length,2);
   assert.equal((await pg.query('SELECT id FROM app_actions')).rows.length,0);
   assert.deepEqual(await confirmDataAccess(f,a,w,first.input),first.receipt);
   await assert.rejects(confirmDataAccess(f,a,w,{...first.input,automations:[]}),/Request differs/);
   assert.equal((await f.readComponent(a,w,first.receipt.appId)).component.name,'First');
  });
  await t.test('independent recipes settle separately; missing runner never fails the app',async()=>{
   for(let i=0;i<3;i++)await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(db));
   const rows=(await pg.query<any>('SELECT * FROM automation_recipe_setups WHERE app_id=$1',[first.receipt.appId])).rows;
   assert.equal(rows.find(r=>r.recipe_key==='research').status,'needs_setup');assert.equal(rows.find(r=>r.recipe_key==='weekly_notice').status,'active');
   assert.equal((await f.readComponent(a,w,first.receipt.appId)).component.name,'First');
   const action=rows.find(r=>r.recipe_key==='weekly_notice').definition_id;await pg.query('UPDATE app_actions SET paused=true WHERE id=$1',[action]);
   await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(db));assert.equal((await pg.query<any>('SELECT paused FROM app_actions WHERE id=$1',[action])).rows[0].paused,true);
  });
  await t.test('a second copy gets independent automations; opt-out creates none',async()=>{
   const second=await install('Second',['weekly_notice']);assert.notEqual(second.receipt.appId,first.receipt.appId);
   await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(db));
   assert.equal((await pg.query('SELECT id FROM app_actions')).rows.length,2);
   const third=await install('Third',[]);assert.equal(third.receipt.automations.filter((x:any)=>x.status!=='opted_out').length,0);assert.equal(third.receipt.automationStatus,'none');
  });
  await t.test('owner and exact assistant review checks are retained',async()=>{
   await assert.rejects(withActor(other,()=>readAppRecipes(db,other,w,first.receipt.appId)));
   const ai:Actor={userId:a.userId,origin:'ai'};const review=await withActor(ai,()=>prepareAppRecipe(db,ai,w,{appId:first.receipt.appId,key:'research'}));
   await assert.rejects(withActor(ai,()=>confirmAppRecipe(db,ai,w,review.id,review.digest,review.review)));
   await assert.rejects(withActor({...ai,actionConfirmed:true},()=>confirmAppRecipe(db,{...ai,actionConfirmed:true},w,review.id,review.digest,'changed')));
   await assert.rejects(withActor({...ai,assistant:'claude',actionConfirmed:true},()=>confirmAppRecipe(db,{...ai,assistant:'claude',actionConfirmed:true},w,review.id,review.digest,review.review)));
   const saved=await withActor({...ai,actionConfirmed:true},()=>confirmAppRecipe(db,{...ai,actionConfirmed:true},w,review.id,review.digest,review.review));assert.equal(saved.status,'pending');
   const row=(await pg.query<any>('SELECT revision FROM automation_recipe_setups WHERE id=$1',[saved.id])).rows[0];await cancelRecipeSetup(db,a,w,saved.id,row.revision);
   await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(db));assert.equal((await pg.query<any>('SELECT status FROM automation_recipe_setups WHERE id=$1',[saved.id])).rows[0].status,'cancelled');
  });
  await t.test('contextual features reuse one definition per entry and keep the actual namespaced role',async()=>{
   const copy=await install('Context app',[]),c=(await f.readComponent(a,w,copy.receipt.appId)).component,typeId=c.manifest.automationRoles['test.tasks'];
   const ids=[];
   for(const name of ['First entry','Second entry']){const p=await s.preview(a,w,{kind:'create_record',typeId,data:{name,due:'2027-01-10'}});ids.push((await s.commit(a,p.id,p.digest)).objects[0].id);}
   const setUp=async(recordId:string)=>{const p=await prepareAppRecipe(db,a,w,{appId:c.id,key:contextual.key,contextRecordId:recordId});assert.ok(p.body.contextLabel);return confirmAppRecipe(db,a,w,p.id,p.digest);};
   const firstSetup=await setUp(ids[0]);assert.equal((await setUp(ids[0])).id,firstSetup.id);assert.notEqual((await setUp(ids[1])).id,firstSetup.id);
   for(let i=0;i<2;i++)await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(db));
   const definitions=(await pg.query<any>('SELECT config FROM app_actions WHERE app_id=$1',[c.id])).rows;
   assert.deepEqual(definitions.map(r=>r.config.trigger.recordId).sort(),ids.sort());assert.ok(definitions.every(r=>r.config.trigger.typeId===typeId));
   assert.equal((await setUp(ids[0])).status,'existing');
  });
  await t.test('apps without tables retain later features and interrupted setup retries cannot change approval',async()=>{
   const payload2={...payload,id:'test.no-data',recommendedAutomations:[email],automationFeatures:[]},digest2=recipeDigest(payload2);
   await pg.query("INSERT INTO app_template_catalog(template_id,version,status,digest,payload,install_schema) VALUES($1,$2,'approved',$3,$4,'{}')",[payload2.id,payload2.version,digest2,JSON.stringify(payload2)]);
   const target={install:{templateId:payload2.id,version:payload2.version,digest:digest2,name:'No data app',requestKey:randomUUID(),createNew:true}},step=await dataAccessStep(f,a,w,target);
   const saved=await confirmDataAccess(f,a,w,{...target,connections:{},access:[],stepDigest:step.digest,automations:[{key:email.key,enabled:true,settings:{}}]});
   assert.equal((await f.readComponent(a,w,saved.appId)).component.bindings.length,0);assert.equal((await readAppRecipes(db,a,w,saved.appId)).recipes.length,1);
   let failOnce=true;const interrupted:Database={...db,transaction:fn=>db.transaction(tx=>fn({...tx,query:async(sql,args)=>{if(failOnce&&sql.includes('FROM automation_recipe_approvals')){failOnce=false;throw Object.assign(Error('Retry transaction'),{code:'40001'});}return tx.query(sql,args);}}))};
   await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(interrupted));
   const setup=(await pg.query<any>('SELECT * FROM automation_recipe_setups WHERE app_id=$1',[saved.appId])).rows[0];assert.equal(setup.status,'pending');assert.equal(setup.attempts,1);
   await assert.rejects(withDatabaseContext({service:'worker'},()=>db.query("UPDATE automation_recipe_approvals SET digest='changed' WHERE setup_id=$1",[setup.id])));
   await pg.query('UPDATE automation_recipe_setups SET available_at=now() WHERE id=$1',[setup.id]);await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(db));
   assert.equal((await pg.query('SELECT id FROM app_actions WHERE app_id=$1',[saved.appId])).rows.length,1);
  });
  await t.test('summary code is isolated and empty output creates no delivery',async()=>{
   const foundation=new Foundation(db),actions=new AppActions(db),worker=<T>(fn:()=>T)=>withDatabaseContext({service:'worker'},fn);
   for(const nonEmpty of [false,true]){
    const p=await foundation.prepareFunction(a,w,{name:'Summary',source:`return {nonEmpty:${nonEmpty},subject:'Summary',text:'Reviewed summary'};`,scope:{capabilities:[],typeIds:[],documents:false},inputContract:{type:'object'},outputContract:{type:'object',required:['nonEmpty','text']}});
    const fn=await foundation.saveFunction(a,w,p.id,p.digest);
    const draft=await f.preview(a,w,{kind:'save_component',content:{name:'Summary app',format:'frontend-js',source:"return {html:'<main>Summary app</main>'};",bindings:[],execution:[{name:'summary',revisionId:fn.revisionId}]}}),c=await f.confirm(a,w,draft.id,draft.digest);
    const approval=await actions.prepare(a,w,{config:{name:'Summary email',appId:c.id,appVersion:0,trigger:{kind:'manual'},steps:[{id:'email',kind:'email',to:['owner@example.invalid'],subject:'Review',text:'Fallback',summary:{binding:'summary',revisionId:fn.revisionId}}],expiresAt:new Date(Date.now()+86400000).toISOString()}});
    const action=await actions.confirm(a,w,approval.id,approval.digest),batch=await actions.runNow(a,w,action.id,randomUUID());
    const tick=async()=>{await pg.query('UPDATE app_notification_batches SET not_before=now() WHERE id=$1',[batch.id]);await worker(()=>dispatchNotificationBatch(db));};
    await tick();const row=(await pg.query<any>('SELECT * FROM app_notification_batches WHERE id=$1',[batch.id])).rows[0];assert.ok(row.summary_run_id);
    assert.equal((await pg.query('SELECT id FROM app_service_jobs WHERE app_id=$1',[c.id])).rows.length,0);
    await worker(()=>runFoundation(db));await tick();
    const final=(await pg.query<any>('SELECT * FROM app_notification_batches WHERE id=$1',[batch.id])).rows[0];
    if(!nonEmpty){assert.equal(final.diagnostic,'empty_summary');assert.equal(final.status,'cancelled');}
    else{const jobs=(await pg.query<any>('SELECT payload FROM app_service_jobs WHERE app_id=$1',[c.id])).rows;assert.equal(jobs.length,1);assert.equal(jobs[0].payload.message.text,'Reviewed summary');}
   }
  });
  await t.test('archiving and restoring an app cannot revive pending setup',async()=>{
   const copy=await install('Archive test',['weekly_notice']);
   await s.share(a,w,other.userId,'editor',[],null,false);await pg.query('UPDATE workspace_components SET created_by=$2 WHERE id=$1',[copy.receipt.appId,other.userId]);
   for(const archived of [true,false])await withActor(other,async()=>{const c=(await f.readComponent(other,w,copy.receipt.appId)).component,p=await f.preview(other,w,{kind:'archive_component',componentId:c.id,expectedVersion:c.version,archived});await f.confirm(other,w,p.id,p.digest);});
   await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(db));
   assert.equal((await pg.query<any>('SELECT status FROM automation_recipe_setups WHERE app_id=$1',[copy.receipt.appId])).rows[0].status,'cancelled');
  });
  await t.test('date reminders catch up once, coalesce, and reroute an unsent reassignment to a current member',async()=>{
   const save=async(op:any)=>{const p=await s.preview(a,w,op);return s.commit(a,p.id,p.digest);},worker=<T>(fn:()=>T)=>withDatabaseContext({service:'worker'},fn);
   await pg.query('UPDATE app_actions SET paused=true');await pg.query("UPDATE app_notification_batches SET status='cancelled' WHERE status IN ('collecting','sending')");
   const typeId=(await save({kind:'create_type',name:'Reminder tasks',fields:[{key:'name',name:'Name',kind:'text'},{key:'due',name:'Due',kind:'date'},{key:'assignee',name:'Assignee',kind:'text'}]})).objects[0].id;
   const draft=await f.preview(a,w,{kind:'save_component',content:{name:'Reminder app',format:'frontend-js',sourceAccess:'bindings',source:"return {html:'<main>Reminders</main>'};",bindings:[{typeId,fields:['name','due','assignee']}]}}),c=await f.confirm(a,w,draft.id,draft.digest);
   await s.share(a,w,other.userId,'viewer',[],[typeId],false);
   const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10),old=new Date(Date.now()-9*86400000).toISOString().slice(0,10);const recordIds:string[]=[];
   for(const [name,due] of [['One',yesterday],['Two',yesterday],['Old',old]])recordIds.push((await save({kind:'create_record',typeId,data:{name,due,assignee:a.userId}})).objects[0].id);
   const actions=new AppActions(db),p=await actions.prepare(a,w,{config:{name:'Date review',appId:c.id,appVersion:0,recordTypeId:typeId,fields:['name','due','assignee'],trigger:{kind:'record_date',typeId,field:'due',time:'09:00',timeZone:'UTC',catchUpDays:7},steps:[{id:'email',kind:'email',to:['owner@example.invalid'],memberField:'assignee',subject:'Reminder',text:'Review {{record.name}}'}],expiresAt:new Date(Date.now()+86400000).toISOString()}}),action=await actions.confirm(a,w,p.id,p.digest);
   for(let i=0;i<2;i++){await pg.query('UPDATE app_actions SET next_at=now() WHERE id=$1',[action.id]);await worker(()=>dispatchAppActions(db));}
   assert.equal((await pg.query('SELECT * FROM app_notification_occurrences WHERE action_id=$1',[action.id])).rows.length,2,'old dates are skipped and repeated scans do not duplicate occurrences');
   const batches=(await pg.query<any>('SELECT * FROM app_notification_batches WHERE action_id=$1',[action.id])).rows;assert.equal(batches.length,1,'same-member reminders coalesce');
   await save({kind:'update_record',recordId:recordIds[0],expectedVersion:0,data:{name:'One',due:yesterday,assignee:other.userId}});
   for(let i=0;i<3;i++){await pg.query("UPDATE app_notification_batches SET not_before=now() WHERE action_id=$1 AND status='collecting'",[action.id]);await worker(()=>dispatchNotificationBatch(db));}
   const routed=(await pg.query<any>('SELECT b.id,r.email,i.record_id FROM app_notification_batches b JOIN app_notification_recipients r ON r.batch_id=b.id JOIN app_notification_items i ON i.batch_id=b.id WHERE b.action_id=$1',[action.id])).rows;
   assert.equal(routed.find(r=>r.record_id===recordIds[0]).email,'other@example.invalid');assert.equal(routed.find(r=>r.record_id===recordIds[1]).email,'owner@example.invalid');
   assert.equal((await pg.query('SELECT * FROM app_notification_occurrences WHERE action_id=$1',[action.id])).rows.length,2,'rerouting preserves occurrence identities');
  });
  await t.test('a pinned research brief runs once and proposal-only completion triggers its separate email',async()=>{
   const foundation=new Foundation(db),monitoring=new AppMonitoring(db),actions=new AppActions(db),worker=<T>(fn:()=>T)=>withDatabaseContext({service:'worker'},fn);
   await pg.query('UPDATE app_actions SET paused=true');await pg.query("UPDATE app_notification_batches SET status='cancelled' WHERE status IN ('collecting','sending')");
   const fp=await foundation.prepareFunction(a,w,{name:'Brief',source:"return {context:{scope:'Reviewed app context'}};",scope:{capabilities:[],typeIds:[]},inputContract:{type:'object'},outputContract:{type:'object',required:['context']}}),fn=await foundation.saveFunction(a,w,fp.id,fp.digest);
   const cp=await f.preview(a,w,{kind:'save_component',content:{name:'Research app',format:'frontend-js',source:"return {html:'<main>Research</main>'};",execution:[{name:'brief',revisionId:fn.revisionId}]}}),c=await f.confirm(a,w,cp.id,cp.digest),expiresAt=new Date(Date.now()+86400000).toISOString();
   const mp=await monitoring.prepare(a,w,{config:{name:'Research',appId:c.id,objective:'Find relevant changes',instructions:'Propose findings with sources.',sourcePolicy:'Primary sources.',brief:{binding:'brief',revisionId:fn.revisionId},schedule:{description:'Manual test',timeZone:'UTC'},expiresAt}}),monitor=await monitoring.confirm(a,w,mp.id,mp.digest);
   const ap=await actions.prepare(a,w,{config:{name:'Research email',appId:c.id,appVersion:0,trigger:{kind:'database',source:'automation_runs',automationId:monitor.id,automationVersion:0,includeEmpty:false,meaningful:true,events:['updated'],fields:['status'],becomes:{field:'status',operator:'equals',value:'completed'}},steps:[{id:'email',kind:'email',to:['owner@example.invalid'],subject:'Findings',text:'{{run.summary}}'}],expiresAt}}),action=await actions.confirm(a,w,ap.id,ap.digest);
   const run=await monitoring.start(a,w,{monitorId:monitor.id,expectedVersion:0,occurrenceKey:randomUUID()});
   assert.equal((await monitoring.brief(a,w,run.id)).state,'preparing');assert.equal((await monitoring.brief(a,w,run.id)).state,'preparing');
   await worker(()=>runFoundation(db));const brief=await monitoring.brief(a,w,run.id);assert.equal(brief.state,'ready');assert.deepEqual(brief.context,{scope:'Reviewed app context'});
   assert.equal((await pg.query('SELECT id FROM foundation_runs WHERE request_key=$1',[run.id])).rows.length,1);
   const finished=await monitoring.finish(a,w,{runId:run.id,status:'completed',summary:'A relevant proposal',findings:[{title:'Proposal',detail:'Requires owner review before saving.',relevant:true}]});assert.equal(finished.savedChanges,0);
   for(let i=0;i<2;i++){await pg.query('UPDATE app_actions SET next_at=now() WHERE id=$1',[action.id]);await worker(()=>dispatchAppActions(db));}
   assert.equal((await pg.query('SELECT * FROM app_notification_occurrences WHERE action_id=$1',[action.id])).rows.length,1);
   await monitoring.control(a,w,monitor.id,0,false);await pg.query('UPDATE app_notification_batches SET not_before=now() WHERE action_id=$1',[action.id]);await worker(()=>dispatchNotificationBatch(db));
   assert.equal((await pg.query<any>('SELECT status FROM app_notification_batches WHERE action_id=$1',[action.id])).rows[0].status,'cancelled');
  });
  await t.test('a ready runner materializes the approved chain; a changed connection needs fresh setup',async()=>{
   const automation=new AutomationService(db),p=await automation.prepare(a,w,{preferences:{time:'06:00',timeZone:'Europe/Berlin'}}),runner=await automation.confirm(a,w,p.id,p.digest),family=randomUUID(),client=randomUUID();
   // Synthetic readiness fixture only: no host subscription or provider request is made.
   await pg.query("INSERT INTO oauth_tokens(hash,user_id,client_id,kind,family,expires_at) VALUES($1,$2,$3,'refresh',$4,$5)",[randomUUID(),a.userId,client,family,Date.now()+86400000]);
   await pg.query("INSERT INTO automation_subscriptions(id,workspace_id,user_id,runner_id,identity_hash,connection_family,client_id,callback,secret,expires_at,callback_verified_at) VALUES($1,$2,$3,$4,$5,$6,$7,'https://example.invalid/events','synthetic',now()+interval '1 day',now())",[randomUUID(),w,a.userId,runner.id,randomUUID(),family,client]);
   await pg.query('UPDATE automation_runners SET verified_at=now() WHERE id=$1',[runner.id]);
   const chain={...payload,id:'test.chain',automationFeatures:[],recommendedAutomations:[research,{...email,key:'findings_email',trigger:{kind:'after',recipe:'research',when:'meaningful'}}]},digest=recipeDigest(chain);
   await pg.query("INSERT INTO app_template_catalog(template_id,version,status,digest,payload,install_schema) SELECT $1,version,status,$2,$3,install_schema FROM app_template_catalog WHERE template_id=$4",[chain.id,digest,JSON.stringify(chain),payload.id]);
   const installChain=async(name:string)=>{const target={install:{templateId:chain.id,version:chain.version,digest,name,requestKey:randomUUID(),createNew:true}},step=await dataAccessStep(f,a,w,target);return confirmDataAccess(f,a,w,{...target,connections:{},access:[],stepDigest:step.digest,automations:step.automations.map(r=>({key:r.key,enabled:true,settings:{}}))});};
   const installed=await installChain('Ready chain');
   for(let i=0;i<4;i++){await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(db));if(i%2===1)await pg.query("UPDATE automation_recipe_setups SET available_at=now() WHERE app_id=$1 AND status='pending'",[installed.appId]);}
   const definitions=(await pg.query<any>('SELECT * FROM automation_recipe_setups WHERE app_id=$1',[installed.appId])).rows;assert.ok(definitions.every(r=>r.status==='active'),JSON.stringify(definitions.map(r=>[r.recipe_key,r.status,r.diagnostic])));
   const monitor=definitions.find(r=>r.recipe_key==='research'),child=definitions.find(r=>r.recipe_key==='findings_email'),action=(await pg.query<any>('SELECT config FROM app_actions WHERE id=$1',[child.definition_id])).rows[0];
   assert.equal(action.config.trigger.automationId,monitor.definition_id);assert.equal(action.config.trigger.automationVersion,monitor.definition_version);assert.equal(action.config.trigger.meaningful,true);
   const changed=await installChain('Changed runner');await automation.control(a,w,runner.id,false,0);await automation.control(a,w,runner.id,true,1);
   for(let i=0;i<4;i++){await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(db));if(i%2===1)await pg.query("UPDATE automation_recipe_setups SET available_at=now() WHERE app_id=$1 AND status='pending'",[changed.appId]);}
   assert.equal((await pg.query<any>("SELECT diagnostic FROM automation_recipe_setups WHERE app_id=$1 AND recipe_key='research'",[changed.appId])).rows[0].diagnostic,'runner_changed');
   assert.equal((await pg.query('SELECT id FROM app_monitors WHERE app_id=$1',[changed.appId])).rows.length,0);
   // Both definition kinds can be recreated after deletion, retaining historical receipts.
   for(const [key,table] of [['research','app_monitors'],['findings_email','app_actions']]){
    const old=(await pg.query<any>('SELECT * FROM automation_recipe_setups WHERE app_id=$1 AND recipe_key=$2',[installed.appId,key])).rows[0];
    await pg.query(`UPDATE ${table} SET deleted_at=now(),${table==='app_monitors'?'enabled=false':'paused=true'} WHERE id=$1`,[old.definition_id]);
    const listed=(await readAppRecipes(db,a,w,installed.appId)).setups.find(x=>x.id===old.id);assert.equal(listed.status,'cancelled');assert.equal(listed.definition_id,null);
    const review=await prepareAppRecipe(db,a,w,{appId:installed.appId,key}),saved=await confirmAppRecipe(db,a,w,review.id,review.digest);assert.equal(saved.status,'pending');
    await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(db));
    const fresh=(await pg.query<any>('SELECT * FROM automation_recipe_setups WHERE id=$1',[old.id])).rows[0];assert.equal(fresh.status,'active',fresh.diagnostic);assert.notEqual(fresh.definition_id,old.definition_id);
    assert.ok((await pg.query<any>(`SELECT deleted_at FROM ${table} WHERE id=$1`,[old.definition_id])).rows[0].deleted_at);
   }
  });
  await t.test('optional resolution errors happen after install and leave a reviewable setup',async()=>{
   const target={install:{templateId:payload.id,version:payload.version,digest,name:'Isolated optional failure',requestKey:randomUUID(),createNew:true}},step=await dataAccessStep(f,a,w,target);
   // This is a valid trigger shape, but it changes this recipe's reviewed trigger scope.
   const saved=await confirmDataAccess(f,a,w,{...target,connections:{},access:[],stepDigest:step.digest,automations:[{key:email.key,enabled:true,settings:{trigger:contextual.trigger}}]});
   assert.equal((await f.readComponent(a,w,saved.appId)).component.name,target.install.name);
   await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(db));
   assert.equal((await pg.query<any>('SELECT status FROM automation_recipe_setups WHERE app_id=$1',[saved.appId])).rows[0].status,'needs_setup');
   assert.equal((await pg.query('SELECT id FROM app_actions WHERE app_id=$1',[saved.appId])).rows.length,0);
   assert.equal((await f.readComponent(a,w,saved.appId)).component.name,target.install.name);
   const omitted={install:{...target.install,name:'No reviewed choices',requestKey:randomUUID()}};
   const omittedStep=await dataAccessStep(f,a,w,omitted),result=await confirmDataAccess(f,a,w,{...omitted,connections:{},access:[],stepDigest:omittedStep.digest});
   assert.ok(result.automations.every((x:any)=>x.status==='not_reviewed'));
   assert.equal((await pg.query('SELECT id FROM automation_recipe_setups WHERE app_id=$1',[result.appId])).rows.length,0);
  });
  await t.test('fresh approval replaces pending settings and copies preserve assistant ownership without activation',async()=>{
   const installed=await install('Pending edits',[]),claude:Actor={...a,origin:'ai',assistant:'claude',actionConfirmed:true};
   await withActor(claude,async()=>{
    const setup=async(time:string)=>{const review=await prepareAppRecipe(db,claude,w,{appId:installed.receipt.appId,key:email.key,settings:{trigger:{...email.trigger,time}}});const saved=await confirmAppRecipe(db,claude,w,review.id,review.digest,review.review);assert.deepEqual(await confirmAppRecipe(db,claude,w,review.id,review.digest,review.review),saved);return saved;};
    const first=await setup('10:30'),second=await setup('11:30');assert.equal(first.id,second.id);
    const row=(await pg.query<any>('SELECT * FROM automation_recipe_setups WHERE id=$1',[first.id])).rows[0];assert.equal(row.revision,1);assert.equal(row.body.recipe.trigger.time,'11:30');
    assert.equal((await pg.query('SELECT id FROM automation_recipe_approvals WHERE setup_id=$1',[first.id])).rows.length,2);
   });
   await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(db));
   const original=(await pg.query<any>('SELECT * FROM app_actions WHERE app_id=$1',[installed.receipt.appId])).rows[0];assert.equal(original.config.trigger.time,'11:30');assert.equal(original.assistant,'claude');
   const c=(await f.readComponent(a,w,installed.receipt.appId)).component,p=await f.preview(a,w,{kind:'copy_component',sourceComponentId:c.id,expectedVersion:c.version,projectId:c.project_id,name:'Claude copy',copyAutomations:true}),copy=await f.confirm(a,w,p.id,p.digest);
   const action=(await pg.query<any>('SELECT * FROM app_actions WHERE app_id=$1',[copy.id])).rows[0],setup=(await pg.query<any>('SELECT * FROM automation_recipe_setups WHERE app_id=$1',[copy.id])).rows[0];
   assert.equal(action.assistant,'claude');assert.equal(action.paused,true);assert.equal(setup.assistant,'claude');assert.equal(setup.definition_id,action.id);
   assert.equal((await pg.query('SELECT id FROM automation_recipe_approvals WHERE setup_id=$1',[setup.id])).rows.length,0);
   await assert.rejects(withActor({...a,origin:'ai',actionConfirmed:true},()=>prepareAppRecipe(db,{...a,origin:'ai',actionConfirmed:true},w,{appId:copy.id,key:email.key}).then(p=>confirmAppRecipe(db,{...a,origin:'ai',actionConfirmed:true},w,p.id,p.digest,p.review))),/Claude|claude/);
  });
 });}finally{delete process.env.APP_AUTOMATION_RECIPES_ENABLED;await pg.close();}
});
