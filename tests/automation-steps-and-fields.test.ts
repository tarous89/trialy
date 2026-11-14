/**
 * E5 (research + email in one automation) and E6 (research access resolved from the fields that exist at run time).
 * Readable fixture: one owner, one workspace, a "Signals" app with a `signals` table (title, detail, status, owner_note).
 * The research may write title/detail/status but never owner_note (exceptFields). All data is synthetic; no provider calls.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {AsyncLocalStorage} from 'node:async_hooks';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,withDatabaseContext,setDatabaseContext,databaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {appTemplateEntry} from '../src/workspace/app-templates.js';
import {dataAccessStep,confirmDataAccess} from '../src/workspace/data-access.js';
import {automationRecipe,readRecipes,validateRecipeDeclarations} from '../src/automations/recipes-schema.js';
import {reconcileRecipeSetups,recipeDigest} from '../src/automations/recipes.js';
import {AutomationManagement} from '../src/automations/management.js';
import {AutomationService} from '../src/automations/service.js';
import {AppMonitoring} from '../src/app-services/monitoring.js';
import {AppActions,dispatchAppActions} from '../src/app-services/service.js';
import type {Actor} from '../src/shared/schema.js';

const weekly={kind:'calendar',frequency:'weekly',anchor:'2026-11-16',time:'07:00',timeZone:'Europe/Paris',weekdays:[1]};
const research={objective:'Find new signals for the active scopes.',instructions:'Read the brief, save new signals with sources, then finish with findings.',sourcePolicy:'Named sources first; the web by default.'};
/** E5: one automation, research then email. E6: every app field of the table except owner_note. */
const scanDigest=automationRecipe.parse({key:'scan',name:'Signals scan + digest',description:'Weekly research that saves signals, then a digest email.',trigger:weekly,
 research:{...research,readBindings:[{role:'signals.items',fields:'all'}],writeBindings:[{role:'signals.items',fields:'all',exceptFields:['owner_note'],allowCreate:true,allowUpdate:true}]},
 email:{subject:'Signals digest',text:'{{run.summary}}'}});
const alert=automationRecipe.parse({key:'alert',name:'Signals alert',description:'Email after the scan when it found something relevant.',trigger:{kind:'after',recipe:'scan',when:'meaningful'},email:{subject:'Signals alert',text:'Open Signals to review.'}});

test('E5/E6 declarations: combined steps and run-time fields validate; misuse is rejected',()=>{
 validateRecipeDeclarations({recommendedAutomations:[scanDigest,alert]});
 assert.deepEqual(readRecipes({recommendedAutomations:[scanDigest,alert]}).recommended.map(r=>r.key),['scan','alert'],'an after-recipe may follow a combined research automation');
 const bad=(patch:any)=>automationRecipe.safeParse({...scanDigest,...patch}).success;
 assert.equal(bad({email:{...scanDigest.email,memberField:'owner'}}),false,'the email step reports the run, not a record');
 assert.equal(bad({research:undefined,email:{...scanDigest.email,when:'completed'}}),false,'email.when needs a research step');
 assert.equal(bad({research:undefined,email:undefined}),false,'a recipe needs research or email');
 assert.equal(bad({research:{...scanDigest.research,readBindings:[{role:'signals.items',fields:['title'],exceptFields:['detail']}]}}),false,'exceptFields only with fields:"all"');
});

test('E5 and E6 end to end on restricted roles',async t=>{
 process.env.APP_AUTOMATION_RECIPES_ENABLED='true';
 const pg=new PGlite();for(const name of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+name,'utf8'));
 await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();
 const db:Database={query:async(s,v)=>{const tx=storage.getStore();return tx?tx.query(s,v):db.transaction(t=>t.query(s,v));},transaction:async fn=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async raw=>{await raw.exec(databaseContext().service==='worker'?'SET LOCAL ROLE trialy_worker':'SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(s,v)=>{await setDatabaseContext(raw as any);return raw.query(s,v) as any;}};return storage.run(tx,()=>fn(tx));});},close:()=>pg.close()};
 const a:Actor={userId:randomUUID(),origin:'human'};
 await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'owner@example.invalid','Owner']);
 const worker=<T>(fn:()=>T)=>withDatabaseContext({service:'worker'},fn);
 try{await withActor(a,async()=>{
  const f=new WorkspaceFoundation(db),s=new Service(db),w=(await s.createWorkspace(a,'Signals tests')).id;await s.setAi(a,w,true);
  const save=async(op:any)=>{const p=await s.preview(a,w,op);return s.commit(a,p.id,p.digest);};
  // Synthetic ready runner: no host subscription or provider request is made.
  const automation=new AutomationService(db),rp=await automation.prepare(a,w,{preferences:{time:'06:00',timeZone:'Europe/Paris'}}),runner=await automation.confirm(a,w,rp.id,rp.digest),family=randomUUID(),client=randomUUID();
  await pg.query("INSERT INTO oauth_tokens(hash,user_id,client_id,kind,family,expires_at) VALUES($1,$2,$3,'refresh',$4,$5)",[randomUUID(),a.userId,client,family,Date.now()+86400000]);
  await pg.query("INSERT INTO automation_subscriptions(id,workspace_id,user_id,runner_id,identity_hash,connection_family,client_id,callback,secret,expires_at,callback_verified_at) VALUES($1,$2,$3,$4,$5,$6,$7,'https://example.invalid/events','synthetic',now()+interval '1 day',now())",[randomUUID(),w,a.userId,runner.id,randomUUID(),family,client]);
  await pg.query('UPDATE automation_runners SET verified_at=now() WHERE id=$1',[runner.id]);
  const ai:Actor={...a,origin:'ai',connectionFamily:family,clientId:client};

  const fields=[{key:'title',name:'Title',kind:'text'},{key:'detail',name:'Detail',kind:'text'},{key:'status',name:'Status',kind:'text'},{key:'owner_note',name:'Owner note',kind:'text'}];
  const payload=appTemplateEntry.parse({id:'test.signals',version:'1.0.0',name:'Signals',description:'Synthetic fixture',tags:[],whenToUse:'Tests',whenNotToUse:'Production',instructions:'Use the supplied bindings.',engine:'frontend-js',options:{tableMap:{type:'string',description:'Tables'}},source:"return {html:'<main><h1>Signals</h1></main>'};",recommendedAutomations:[scanDigest,alert]});
  const digest=recipeDigest(payload);
  await pg.query("INSERT INTO app_template_catalog(template_id,version,status,digest,payload,install_schema) VALUES($1,$2,'approved',$3,$4,$5)",[payload.id,payload.version,digest,JSON.stringify(payload),JSON.stringify({'signals.items':{name:'Signals',fields,logicalFields:Object.fromEntries(fields.map(x=>[x.key,x.key]))}})]);
  const target={install:{templateId:payload.id,version:payload.version,digest,name:'Signals',requestKey:randomUUID(),createNew:true}},step=await dataAccessStep(f,a,w,target);
  assert.deepEqual(step.automations.map((r:any)=>r.key),['scan','alert'],'two rows in the install popup: scan + digest, alert');
  const installed=await confirmDataAccess(f,a,w,{...target,connections:{},access:[],stepDigest:step.digest,automations:step.automations.map((r:any)=>({key:r.key,enabled:true,settings:{}}))});
  // The alert waits for its parent research; release the wait only once the scan is set up.
  for(let i=0;i<6;i++){await worker(()=>reconcileRecipeSetups(db));await pg.query("UPDATE automation_recipe_setups SET available_at=now() WHERE app_id=$1 AND status='pending' AND EXISTS(SELECT 1 FROM automation_recipe_setups p WHERE p.app_id=$1 AND p.recipe_key='scan' AND p.status<>'pending')",[installed.appId]);}
  const setups=(await pg.query<any>('SELECT * FROM automation_recipe_setups WHERE app_id=$1',[installed.appId])).rows,scan=setups.find(r=>r.recipe_key==='scan'),alertSetup=setups.find(r=>r.recipe_key==='alert');
  assert.ok(setups.every(r=>r.status==='active'),JSON.stringify(setups.map(r=>[r.recipe_key,r.status,r.diagnostic])));
  const monitorId=scan.definition_id,stepId=scan.follow_up_id;

  await t.test('E5: one setup creates the research and its bound email step',async()=>{
   assert.equal(scan.definition_kind,'research');assert.ok(stepId,'the email step is recorded on the same setup');
   const email=(await pg.query<any>('SELECT * FROM app_actions WHERE id=$1',[stepId])).rows[0];
   assert.equal(email.follow_up_of,monitorId);assert.equal(email.config.trigger.automationId,monitorId);assert.equal(email.config.trigger.meaningful,true);
   assert.deepEqual(email.config.steps[0].to,['owner@example.invalid'],'recipients default to the owner');
   const alertAction=(await pg.query<any>('SELECT * FROM app_actions WHERE id=$1',[alertSetup.definition_id])).rows[0];
   assert.equal(alertAction.follow_up_of,null,'a separate after-recipe stays its own automation');assert.equal(alertAction.config.trigger.automationId,monitorId);
  });

  await t.test('E5: Automations shows one row with both connectors; the toggle switches both',async()=>{
   const m=new AutomationManagement(db),list=(await m.list(a,w,{appId:installed.appId})).rows;
   const row=list.find((r:any)=>r.id===monitorId);assert.deepEqual(row.connectors,['chatgpt','email']);assert.equal(row.followUps[0].id,stepId);
   assert.ok(!list.some((r:any)=>r.id===stepId),'the email step is not listed on its own');assert.ok(list.some((r:any)=>r.id===alertSetup.definition_id));
   const monitor=await m.read(a,w,'research',monitorId);await m.control(a,w,'research',monitorId,monitor.version,false);
   assert.equal((await pg.query<any>('SELECT paused FROM app_actions WHERE id=$1',[stepId])).rows[0].paused,true);
   await m.control(a,w,'research',monitorId,monitor.version,true);
   assert.equal((await pg.query<any>('SELECT paused FROM app_actions WHERE id=$1',[stepId])).rows[0].paused,false);
  });

  const monitoring=new AppMonitoring(db),typeId=(await f.readComponent(a,w,installed.appId)).component.manifest.automationRoles['signals.items'];
  await t.test('E6: "all" bindings are stored as run-time bindings with exclusions',async()=>{
   const read=await monitoring.read(ai,w,monitorId);
   assert.equal(read.config.readBindings[0].dynamic,true);
   const grant=read.context.writeScopes[0].body.bindings[0];assert.equal(grant.dynamic,true);assert.deepEqual(grant.exceptFields,['owner_note']);
   assert.deepEqual(grant.fields.sort(),['detail','status','title'],'the excluded field is never granted');
  });

  /** One scheduled occurrence, claimed by the runner; returns a writer bound to that run. */
  const claimRun=async()=>{
   const current=(await pg.query<any>('SELECT version FROM app_monitors WHERE id=$1',[monitorId])).rows[0].version,occurrence=randomUUID();
   await pg.query("INSERT INTO automation_occurrences(id,workspace_id,user_id,runner_id,monitor_id,monitor_version,occurrence_key,due_at,reason) VALUES($1,$2,$3,$4,$5,$6,$7,now(),'scheduled_due')",[occurrence,w,a.userId,runner.id,monitorId,current,randomUUID()]);
   const claimed:any=await withActor(ai,()=>automation.claim(ai,w,{runnerId:runner.id,occurrenceId:occurrence,requestKey:randomUUID()}));
   const grant=(await monitoring.read(ai,w,monitorId)).config.writeScopes[0];
   const write=(data:Record<string,unknown>)=>withActor(ai,()=>f.maintain(ai,w,{scopeId:grant.scopeId,expectedScopeVersion:grant.version,requestKey:randomUUID(),sourceLabel:'https://example.org/signal',interpretation:'Synthetic signal',changes:[{kind:'create_record',typeId,data}]},undefined,false,claimed.runId));
   const finish=(summary:string)=>withActor(ai,()=>automation.finish(ai,w,{occurrenceId:occurrence,claimToken:claimed.claimToken,result:{status:'completed',summary,findings:[{title:'Signal',detail:summary,relevant:true}]}}));
   return {write,finish};
  };

  await t.test('E6: the scan writes only granted fields and never the excluded one',async()=>{
   const run=await claimRun();
   await assert.rejects(run.write({title:'Blocked',owner_note:'Assistant text'}),/exceeds approved fields/);
   const saved=await run.write({title:'Trial status changed',status:'recruiting'});assert.equal(saved.recordIds.length,1);
   assert.equal((await run.finish('One new signal')).result.savedChanges,1);
  });

  await t.test('E5: a completed run releases its email step exactly once',async()=>{
   for(let i=0;i<2;i++){await pg.query('UPDATE app_actions SET next_at=now() WHERE id=$1',[stepId]);await worker(()=>dispatchAppActions(db));}
   assert.equal((await pg.query('SELECT * FROM app_notification_occurrences WHERE action_id=$1',[stepId])).rows.length,1);
  });

  await t.test('E6: adding and removing app fields keeps research and its email running without re-approval',async()=>{
   const app=(await f.readComponent(a,w,installed.appId)).component,type=(await pg.query<any>('SELECT version FROM entity_types WHERE id=$1',[typeId])).rows[0];
   // A user adds a custom "phase" field and shows it in the app (manifest declares it, as field customization does).
   await save({kind:'update_type',typeId,expectedVersion:type.version,name:'Signals',fields:[...fields,{key:'phase',name:'Phase',kind:'text'}]});
   const manifest={...app.manifest,fields:[...app.manifest.fields,{...app.manifest.fields.find((x:any)=>x.field==='title'),id:'phase',field:'phase',label:'Phase'}]};
   const p=await f.preview(a,w,{kind:'save_component',componentId:app.id,expectedVersion:app.version,projectId:app.project_id,content:{name:app.name,format:app.format,source:app.source,sourceAccess:app.source_access,manifest,execution:app.execution,bindings:app.bindings.map((b:any)=>b.typeId===typeId?{...b,fields:[...b.fields,'phase']}:b)}});await f.confirm(a,w,p.id,p.digest);
   const read=await monitoring.read(ai,w,monitorId);assert.equal(read.availability,'ready','no re-approval after a field is added');
   assert.ok(read.context.writeScopes[0].body.bindings[0].fields.includes('phase'),'the new field is granted at run time');
   const email=(await pg.query<any>('SELECT * FROM app_actions WHERE id=$1',[stepId])).rows[0],checked=await new AppActions(db).validate(a,w,email.config,email.scope_stamp);
   assert.equal(checked.stamp,email.scope_stamp,'the email step is unaffected by field edits');
   const run=await claimRun();assert.equal((await run.write({title:'Phase moved',phase:'Phase 3'})).recordIds.length,1);await run.finish('Phase change');
   // The user then removes "detail" from the app; the scan skips it instead of failing.
   const current=(await f.readComponent(a,w,installed.appId)).component;
   const q=await f.preview(a,w,{kind:'save_component',componentId:current.id,expectedVersion:current.version,projectId:current.project_id,content:{name:current.name,format:current.format,source:current.source,sourceAccess:current.source_access,manifest:{...current.manifest,fields:current.manifest.fields.filter((x:any)=>x.field!=='detail')},execution:current.execution,bindings:current.bindings.map((b:any)=>b.typeId===typeId?{...b,fields:b.fields.filter((k:string)=>k!=='detail')}:b)}});await f.confirm(a,w,q.id,q.digest);
   const after=await monitoring.read(ai,w,monitorId);assert.equal(after.availability,'ready','no re-approval after a field is removed');
   assert.ok(!after.context.writeScopes[0].body.bindings[0].fields.includes('detail'));
   const later=await claimRun();await assert.rejects(later.write({title:'Old field',detail:'Removed'}));
   assert.equal((await later.write({title:'Still running'})).recordIds.length,1);await later.finish('Continues after removal');
  });

  await t.test('E5: editing the research keeps its email step attached to the new version',async()=>{
   const row=(await pg.query<any>('SELECT * FROM app_monitors WHERE id=$1',[monitorId])).rows[0],{writeScopes,...config}=row.config;
   const p=await monitoring.prepare(a,w,{monitorId,expectedVersion:row.version,config:{...config,writeScopes,instructions:config.instructions+' Prefer registry records.'}}),saved=await monitoring.confirm(a,w,p.id,p.digest);
   const email=(await pg.query<any>('SELECT config FROM app_actions WHERE id=$1',[stepId])).rows[0];assert.equal(email.config.trigger.automationVersion,saved.version);
   const alertAction=(await pg.query<any>('SELECT config FROM app_actions WHERE id=$1',[alertSetup.definition_id])).rows[0];assert.notEqual(alertAction.config.trigger.automationVersion,saved.version,'a separate after-automation still needs its own review');
  });

  await t.test('E5: copying the app keeps the email step grouped and switched off',async()=>{
   const c=(await f.readComponent(a,w,installed.appId)).component,p=await f.preview(a,w,{kind:'copy_component',sourceComponentId:c.id,expectedVersion:c.version,projectId:c.project_id,name:'Signals copy',copyAutomations:true}),copy=await f.confirm(a,w,p.id,p.digest);
   const monitor=(await pg.query<any>('SELECT id FROM app_monitors WHERE app_id=$1',[copy.id])).rows[0],steps=(await pg.query<any>('SELECT paused,follow_up_of FROM app_actions WHERE app_id=$1 AND follow_up_of IS NOT NULL',[copy.id])).rows;
   assert.equal(steps.length,1);assert.equal(steps[0].follow_up_of,monitor.id);assert.equal(steps[0].paused,true);
  });
 });}finally{delete process.env.APP_AUTOMATION_RECIPES_ENABLED;await pg.close();}
});
