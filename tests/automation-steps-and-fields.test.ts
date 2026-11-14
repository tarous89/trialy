import {appFunction,readAppFunctions,validateAppFunctions} from '../src/workspace/app-functions-schema.js';
import {Foundation} from '../src/foundation/service.js';
import {runFoundation} from '../src/foundation/worker.js';
import {dispatchNotificationBatch} from '../src/app-services/notifications.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {trackerOperation} from '../src/workspace/tracker-template.js';
import {prepareToolLayout} from '../src/workspace/tool-layout.js';
import {standardTracker} from '../src/workspace/standard-tracker.js';
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
 research:{...research,briefBinding:'brief',readBindings:[{role:'signals.items',fields:'all'}],writeBindings:[{role:'signals.items',fields:'all',exceptFields:['owner_note'],allowCreate:true,allowUpdate:true}]},
 email:{summaryBinding:'summary',subject:'Signals digest',text:'{{run.summary}}'}});
const alert=automationRecipe.parse({key:'alert',name:'Signals alert',description:'Email after the scan when it found something relevant.',trigger:{kind:'after',recipe:'scan',when:'meaningful'},email:{summaryBinding:'summary',subject:'Signals alert',text:'Open Signals to review.'}});

const functions=[appFunction.parse({name:'brief',purpose:'Prepare the research brief from current app data.',source:"const data=tools.call('records.read',{typeId:appRoles['signals.items']});return {context:JSON.stringify(data.rows)};",inputContract:{type:'object'},outputContract:{type:'object',required:['context']},scope:{capabilities:['records.read'],roles:['signals.items'],documents:false}}),appFunction.parse({name:'summary',purpose:'Summarize saved signals; skip empty updates.',source:"const data=tools.call('records.read',{typeId:appRoles['signals.items']});return {nonEmpty:data.rows.length>0,text:'Saved '+data.rows.length+' signals',subject:'App-written digest'};",inputContract:{type:'object'},outputContract:{type:'object',required:['nonEmpty','text']},scope:{capabilities:['records.read'],roles:['signals.items'],documents:false}})];
test('E7 declarations reject unsafe or unbound code and expose metadata without source',()=>{
 const value={functions,recommendedAutomations:[scanDigest,alert]};validateAppFunctions(value,['signals.items']);
 for(const bad of [{...functions[0],scope:{...functions[0].scope,capabilities:['changes.propose']}},{...functions[0],scope:{...functions[0].scope,documents:true}},{...functions[0],scope:{...functions[0].scope,roles:['unknown']}}])assert.throws(()=>validateAppFunctions({functions:[bad]},['signals.items']));
 assert.throws(()=>validateAppFunctions({functions:[functions[0],functions[0]]},['signals.items']),/duplicate/);
 assert.throws(()=>validateAppFunctions({...value,functions:[]},['signals.items']),/Missing app function/);
 assert.equal(readAppFunctions({functions:[{name:'broken'},functions[0]]}).functions.length,1);
 // Custom apps can reference reviewed existing execution bindings without redeclaring their source.
 validateAppFunctions({recommendedAutomations:[scanDigest,alert]},[],['brief','summary']);
});

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
  const payload=appTemplateEntry.parse({id:'test.signals',version:'1.0.0',name:'Signals',description:'Synthetic fixture',tags:[],whenToUse:'Tests',whenNotToUse:'Production',instructions:'Use the supplied bindings.',engine:'frontend-js',options:{tableMap:{type:'string',description:'Tables'}},source:"return {html:'<main><h1>Signals</h1></main>'};",functions,recommendedAutomations:[scanDigest,alert]});
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
  const installedApp=(await f.readComponent(a,w,installed.appId)).component;assert.equal(installedApp.execution.length,2);assert.ok(installedApp.execution.every((b:any)=>!b.grantId));
  const catalog=new AppTemplates(undefined,db),metadata=await catalog.read({templateId:payload.id});assert.equal(metadata.functions[0].source,undefined);assert.ok((await catalog.read({templateId:payload.id,includeFunctionSource:true})).functions[0].source);
  assert.equal(step.functions.length,2);

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
   assert.equal((await withActor(ai,()=>monitoring.brief(ai,w,claimed.runId))).state,'preparing');await worker(()=>runFoundation(db));const brief=await withActor(ai,()=>monitoring.brief(ai,w,claimed.runId));assert.equal(brief.state,'ready',JSON.stringify(brief));assert.ok(typeof brief.context==='string');
   return {write,finish};
  };

  await t.test('E7: summary delivery uses app code and empty results create no delivery',async()=>{
   const actions=new AppActions(db),binding=installedApp.execution.find((b:any)=>b.name==='summary');
   const p=await actions.prepare(a,w,{config:{name:'E7 manual summary',appId:installed.appId,appVersion:0,trigger:{kind:'manual'},steps:[{id:'email',kind:'email',to:['owner@example.invalid'],subject:'Fallback',text:'Fallback prose',summary:{binding:binding.name,revisionId:binding.revisionId}}],expiresAt:new Date(Date.now()+86400000).toISOString()}}),action=await actions.confirm(a,w,p.id,p.digest);
   const deliver=async()=>{const batch=await actions.runNow(a,w,action.id,randomUUID());const tick=async()=>{await pg.query('UPDATE app_notification_batches SET not_before=now() WHERE id=$1',[batch.id]);await worker(()=>dispatchNotificationBatch(db));};await tick();await worker(()=>runFoundation(db));await tick();return (await pg.query<any>('SELECT * FROM app_notification_batches WHERE id=$1',[batch.id])).rows[0];};
   const empty=await deliver();assert.equal(empty.status,'cancelled');assert.equal(empty.diagnostic,'empty_summary');assert.equal((await pg.query('SELECT id FROM app_service_jobs WHERE app_id=$1',[installed.appId])).rows.length,0);
   await save({kind:'create_record',typeId,data:{title:'Existing signal'}});
   await deliver();const job=(await pg.query<any>('SELECT payload FROM app_service_jobs WHERE app_id=$1',[installed.appId])).rows[0];assert.equal(job.payload.message.text,'Saved 1 signals');assert.equal(job.payload.message.subject,'App-written digest');
   await pg.query('UPDATE app_actions SET paused=true WHERE id=$1',[action.id]);
  });
  await t.test('E7: installation retries preserve revisions; second installations get fresh helpers',async()=>{
   const next={install:{...target.install,name:'Second Signals',requestKey:randomUUID()}},step2=await dataAccessStep(f,a,w,next),input={...next,connections:{},access:[],stepDigest:step2.digest,automations:[]};
   const second=await confirmDataAccess(f,a,w,input),c=(await f.readComponent(a,w,second.appId)).component;
   assert.equal(c.execution.length,2);assert.ok(c.execution.every((b:any)=>!installedApp.execution.some((x:any)=>x.revisionId===b.revisionId)));assert.deepEqual(await confirmDataAccess(f,a,w,input),second);
   const foundation=new Foundation(db);await assert.rejects(foundation.invoke(a,w,{revisionId:c.execution[0].revisionId,input:{}},randomUUID()),/exact app binding/);
   await assert.rejects(foundation.invoke(a,w,{revisionId:c.execution[0].revisionId,input:{},componentContext:{id:installed.appId,version:0,binding:'brief'}},randomUUID()),/differs/);
  });

  await t.test('E6: the scan writes only granted fields and never the excluded one',async()=>{
   const run=await claimRun();
   await assert.rejects(run.write({title:'Blocked',owner_note:'Assistant text'}),/exceeds approved fields/);
   const saved=await run.write({title:'Trial status changed',status:'recruiting'});assert.equal(saved.recordIds.length,1);
   assert.equal((await run.finish('One new signal')).result.savedChanges,1);
  });

  await t.test('E5: a completed run releases its email step exactly once',async()=>{
   for(let i=0;i<2;i++){await pg.query("UPDATE app_actions SET next_at=now()-interval '1 day' WHERE id=$1",[stepId]);await worker(()=>dispatchAppActions(db));}
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
   const cc=(await f.readComponent(a,w,copy.id)).component;assert.equal(cc.execution.length,2);assert.ok(cc.execution.every((b:any)=>!c.execution.some((x:any)=>x.revisionId===b.revisionId)));const copiedConfig=(await pg.query<any>('SELECT config FROM app_monitors WHERE app_id=$1',[copy.id])).rows[0].config;assert.equal(copiedConfig.brief.revisionId,cc.execution.find((b:any)=>b.name==='brief').revisionId);
   const monitor=(await pg.query<any>('SELECT id FROM app_monitors WHERE app_id=$1',[copy.id])).rows[0],steps=(await pg.query<any>('SELECT paused,follow_up_of FROM app_actions WHERE app_id=$1 AND follow_up_of IS NOT NULL',[copy.id])).rows;
   assert.equal(steps.length,1);assert.equal(steps[0].follow_up_of,monitor.id);assert.equal(steps[0].paused,true);
  });
  await t.test('E7: helper reads stay inside the app fields on a shared table and current Access denials apply',async()=>{
   const type=(await pg.query<any>('SELECT * FROM entity_types WHERE id=$1',[typeId])).rows[0];await save({kind:'update_type',typeId,expectedVersion:type.version,name:type.name,fields:[...type.fields,{key:'private_note',name:'Private note',kind:'text'}]});
   await save({kind:'create_record',typeId,data:{title:'Visible',private_note:'MUST_NOT_LEAK'}});
   const c=(await f.readComponent(a,w,installed.appId)).component,foundation=new Foundation(db),args={revisionId:c.execution[0].revisionId,componentContext:{id:c.id,version:c.version,binding:c.execution[0].name},input:{}};
   const run=await foundation.invoke(a,w,args,randomUUID());await worker(()=>runFoundation(db));const done=await foundation.run(a,w,run.id);assert.equal(done.status,'succeeded',JSON.stringify(done));assert.ok(!JSON.stringify(done.result).includes('MUST_NOT_LEAK'));
   await pg.query('UPDATE workspaces SET permission_rules=$2 WHERE id=$1',[w,JSON.stringify([{subject:'chatgpt',kind:'tool',resourceId:c.id,read:'deny',write:'deny'}])]);await assert.rejects(foundation.invoke(a,w,args,randomUUID()));await pg.query("UPDATE workspaces SET permission_rules='[]' WHERE id=$1",[w]);
  });
  await t.test('E7: tracker layout and field additions preserve safe helper bindings',async()=>{
   const built=await trackerOperation(f,a,w,{name:'Helper tracker',description:'',scope:'workspace',tabs:[{name:'Signals',typeId,columns:[{field:'title'}]}]});
   Object.assign(built.content.manifest,{automationRoles:{'signals.items':typeId},functions});
   const draft=await f.preview(a,w,built),saved=await f.confirm(a,w,draft.id,draft.digest);let c=(await f.readComponent(a,w,saved.id)).component;
   const original=c.execution,config=standardTracker(c.source)!.config;
   const tabs=config.tabs.map((tab:any,i:number)=>({originalIndex:i,typeId:tab.typeId,name:tab.name,visible:true,columns:tab.columns.map((col:any)=>({fieldId:col.fieldId,field:col.field,label:col.label,visible:col.visible!==false}))}));
   const layout=await prepareToolLayout(f,a,w,{componentId:c.id,expectedVersion:c.version,name:'Renamed helper tracker',description:'',tabs});await f.confirm(a,w,layout.id,layout.digest);c=(await f.readComponent(a,w,c.id)).component;assert.deepEqual(c.execution,original);
   const type=(await pg.query<any>('SELECT version FROM entity_types WHERE id=$1',[typeId])).rows[0];
   const extended=await prepareToolLayout(f,a,w,{componentId:c.id,expectedVersion:c.version,name:c.name,description:'',tabs:[{...tabs[0],columns:[...tabs[0].columns,{field:'layout_extra',label:'Extra',visible:true}]}],extendTables:[{typeId,expectedVersion:type.version,newFields:[{key:'layout_extra',name:'Extra',kind:'text'}]}]});await f.confirm(a,w,extended.id,extended.digest);c=(await f.readComponent(a,w,c.id)).component;assert.deepEqual(c.execution,original);assert.ok(c.bindings[0].fields.includes('layout_extra'));
  });
  await t.test('E7: corrupt optional declarations and disabled assistants leave the app installable',async()=>{
   const broken={...payload,id:'test.corrupt-functions',functions:[{name:'brief',scope:{documents:true}}]},hash=recipeDigest(broken);await pg.query("INSERT INTO app_template_catalog(template_id,version,status,digest,payload,install_schema) SELECT $1,version,status,$2,$3,install_schema FROM app_template_catalog WHERE template_id=$4",[broken.id,hash,JSON.stringify(broken),payload.id]);
   assert.ok((await catalog.list()).templates.some(t=>t.id===broken.id));await s.setAi(a,w,false);
   for(const [templateId,digest] of [[broken.id,hash],[payload.id,recipeDigest(payload)]]){const request={install:{templateId,version:payload.version,digest,name:'Inert code',requestKey:randomUUID(),createNew:true}},step=await dataAccessStep(f,a,w,request);const saved=await confirmDataAccess(f,a,w,{...request,connections:{},access:[],stepDigest:step.digest,automations:[]});const c=(await f.readComponent(a,w,saved.appId)).component;assert.equal(c.execution.length,templateId===broken.id?0:2);}
   await s.setAi(a,w,true);
  });
  await t.test('E7: a helper persistence failure rolls back the core installation',async()=>{
   const counts=async()=>Promise.all(['workspace_components','entity_types','foundation_functions'].map(async table=>(await pg.query<any>('SELECT count(*) AS n FROM '+table)).rows[0].n));const before=await counts();
   await pg.exec("CREATE FUNCTION test_helper_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic helper persistence failure'; END $$; CREATE TRIGGER test_helper_failure BEFORE INSERT ON foundation_revisions FOR EACH ROW EXECUTE FUNCTION test_helper_failure();");
   try{const request={install:{...target.install,name:'Must roll back',requestKey:randomUUID()}},step=await dataAccessStep(f,a,w,request);await assert.rejects(confirmDataAccess(f,a,w,{...request,connections:{},access:[],stepDigest:step.digest,automations:[]}),/synthetic helper persistence failure/);assert.deepEqual(await counts(),before);}finally{await pg.exec('DROP TRIGGER test_helper_failure ON foundation_revisions; DROP FUNCTION test_helper_failure();');}
  });
  await t.test('E7: plain app saves and source restores retain helpers; removal retires brief and summary dependants',async()=>{
   let c=(await f.readComponent(a,w,installed.appId)).component;
   const p=await f.preview(a,w,{kind:'save_component',componentId:c.id,expectedVersion:c.version,projectId:c.project_id,content:{name:'Renamed Signals',format:c.format,source:c.source,bindings:c.bindings}});await f.confirm(a,w,p.id,p.digest);
   c=(await f.readComponent(a,w,c.id)).component;assert.deepEqual(c.execution,installedApp.execution);
   const r=await f.preview(a,w,{kind:'restore_component',componentId:c.id,expectedVersion:c.version,revisionVersion:0});await f.confirm(a,w,r.id,r.digest);
   c=(await f.readComponent(a,w,c.id)).component;assert.deepEqual(c.execution,installedApp.execution);
   const q=await f.preview(a,w,{kind:'save_component',componentId:c.id,expectedVersion:c.version,projectId:c.project_id,content:{name:c.name,format:c.format,source:c.source,bindings:c.bindings,manifest:c.manifest,execution:[]}});await f.confirm(a,w,q.id,q.digest);
   assert.ok((await pg.query<any>('SELECT deleted_at FROM app_monitors WHERE id=$1',[monitorId])).rows[0].deleted_at);
   assert.ok((await pg.query<any>('SELECT deleted_at FROM app_actions WHERE id=$1',[alertSetup.definition_id])).rows[0].deleted_at);const removed=(await f.readComponent(a,w,c.id)).component;const edit=await f.preview(a,w,{kind:'save_component',componentId:removed.id,expectedVersion:removed.version,projectId:removed.project_id,content:{name:'Still removed',format:removed.format,source:removed.source,bindings:removed.bindings}});await f.confirm(a,w,edit.id,edit.digest);assert.deepEqual((await f.readComponent(a,w,c.id)).component.execution,[]);
  });
 });}finally{delete process.env.APP_AUTOMATION_RECIPES_ENABLED;await pg.close();}
});
