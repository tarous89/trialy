import {Connectors} from '../connectors/service.js';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import type {Database,Connection} from '../db/database.js';
import {id,fail,ASSISTANT_NAMES,type Actor,type Assistant} from '../shared/schema.js';
import {actorAssistant,canEdit,ownedBy,requireAutomationOwner} from './ownership.js';
import {requireCurrentAction,requireHuman} from '../domain/write-authorization.js';
import {checksum} from '../domain/evidence.js';
import {chatServiceReview,checkServiceReview} from '../app-services/review.js';
import {access} from '../domain/permissions.js';
import {requireAssistantApps} from '../domain/assistant-levels.js';
import {AppMonitoring} from '../app-services/monitoring.js';
import {AppActions} from '../app-services/service.js';
import {notificationRecipients} from '../app-services/notifications.js';
import {WorkspaceFoundation} from '../workspace/service.js';
import {appUrl} from '../shared/app-route.js';
import {adapter,AutomationService} from './service.js';
import {automationDependencies} from './dependencies.js';
import {requireAutomationManager,requireLinkedOwner} from './app-owners.js';
import {appRole as appRoleOf} from '../domain/app-roles.js';
import {audit} from '../domain/evidence.js';
import {syncDispatch} from './service.js';
import {monitoringConfig} from '../app-services/monitoring-schema.js';
export const automationKind=z.enum(['research','action']);
export const automationControl=z.object({kind:automationKind,automationId:id,expectedVersion:z.number().int().min(0),enabled:z.boolean()}).strict();
export const automationList=z.object({appId:id.optional(),query:z.string().max(100).default(''),executor:z.enum(['all','chatgpt','claude','trialagents']).default('all'),state:z.enum(['all','enabled','disabled']).default('all'),offset:z.number().int().min(0).max(100000).default(0)}).strict();
/** Management adapter over the existing stores. Never called by the app runtime. */
export class AutomationManagement{
 constructor(readonly db:Database){}
 /** T1: organization owners and owners of the app manage its automations (app-owners.ts). */
 async owner(a:Actor,w:string,appId?:string|null){return requireAutomationManager(this.db,a,w,appId,false);}
 async options(a:Actor,w:string,appId:string){
  await this.owner(a,w,appId);const f=new WorkspaceFoundation(this.db),p=await access(this.db,a,w),app=await f.component(this.db,a,w,appId);
  if(app.archived||app.project_archived)fail(409,'app_archived','Choose an active app');
  const tables=(await f.toolTables(a,w,appId)).map((t:any)=>({...t,fields:t.fields.filter((field:any)=>field.ai!==false&&app.bindings.some((b:any)=>b.typeId===t.id&&b.fields.includes(field.key)))}));
  const candidates=(await this.db.query("SELECT u.id,u.name,u.email FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.tenant_id=$1 AND u.subject NOT LIKE 'public-app|%' ORDER BY u.name,u.id",[p.tenant_id])).rows;
  const members=[];for(const member of candidates){try{await notificationRecipients(this.db,a,w,{appId,steps:[{kind:'email',to:[member.email]}]} as any);members.push(member);}catch(e){if(![403,404,409].includes((e as any).status))throw e;}}
  const owner=members.find(m=>m.id===a.userId);if(!owner)fail(403,'owner_required','Owner unavailable');
  const scopes=(await f.scopes(a,w)).filter((s:any)=>!s.revoked_at&&!s.schemaChanged&&!s.body.monitorId&&s.body.autoWrite&&Date.parse(s.body.expiresAt)>Date.now()&&s.body.projectId===app.project_id&&s.body.bindings.length===1&&s.body.bindings.every((b:any)=>b.fields.every((key:string)=>tables.some((t:any)=>t.id===b.typeId&&t.fields.some((field:any)=>field.key===key&&field.writable))))).map((s:any)=>({scopeId:s.id,version:s.version}));
  const researchAutomations=[];for(const row of (await this.db.query("SELECT * FROM app_monitors WHERE deleted_at IS NULL AND workspace_id=$1 AND user_id=$2 AND app_id=$3 ORDER BY created_at,id",[w,a.userId,appId])).rows){try{const service=new AppMonitoring(this.db);if(await service.historyVisible(a,w,row))researchAutomations.push({id:row.id,version:row.version,name:row.config.name,enabled:row.enabled});}catch(e){if(![403,404,409].includes((e as any).status))throw e;}}
  const connectors=[];const connectorService=new Connectors(this.db,(tx,actor,workspace,id)=>f.component(tx,actor,workspace,id));
  // Only expose inputs for authorized operations; never include credentials or raw connection config.
  for(const row of (await this.db.query('SELECT id FROM connectors WHERE workspace_id=$1 AND removed_at IS NULL',[w])).rows){
   const c=await connectorService.read(a,w,row.id);if(!c.config.enabled||c.credentialStatus==='missing')continue;
   const operations=c.config.operations.filter((o:any)=>o.apps.includes(appId)&&o.users.includes(a.userId)&&(a.origin!=='ai'||o.aiEnabled)&&!o.mappings.length&&o.parameters.every((p:any)=>p.kind!=='json')).map(o=>({id:o.id,name:o.name,parameters:o.parameters.filter(p=>!Object.hasOwn(o.constants,p.name))}));
   if(operations.length)connectors.push({id:c.id,name:c.config.name,version:c.version,operations});
  }
  return {assistant:actorAssistant(a),connectors,owner,researchAutomations,members:members.filter(m=>m.id!==owner.id),tables,writeScopes:scopes};
 }
 async list(a:Actor,w:string,input:unknown){const p=await this.owner(a,w);const v=automationList.parse(input);
  // T1: every automation of an app the caller owns, whoever it is linked to. Organization owners own every app (D4).
  const dependencies=await automationDependencies(this.db,w,null);
  // Each research automation depends on its linked owner's runner for its assistant. Other people's runners are read only for their state.
  const runners=new Map<string,any>((await this.db.query('SELECT id,assistant,user_id,enabled,verified_at FROM automation_runners WHERE workspace_id=$1',[w])).rows.map((r:any)=>[r.id,r]));
  const runnerOf=(d:any):Assistant=>ownedBy(runners.get(d.runnerIds[0])??{})??'chatgpt',setups=new Map<Assistant,any>();
  const mineRunner=(d:any)=>{const r=runners.get(d.runnerIds[0]);return !r||r.user_id===a.userId;};
  for(const assistant of new Set(dependencies.filter(d=>d.runnerIds.length&&mineRunner(d)).map(runnerOf)))setups.set(assistant,await new AutomationService(this.db).setup(a,w,0,{assistant}));
  const stateOf=(d:any)=>{if(!d?.runnerIds.length)return null;if(mineRunner(d))return setups.get(runnerOf(d))?.state;const r=runners.get(d.runnerIds[0]);return r.enabled&&r.verified_at?'ready':'not_connected';};
  const blockedIds=dependencies.filter(d=>d.blockedReason||d.runnerIds.length&&stateOf(d)!=='ready').map(d=>d.id);
  const rows=(await this.db.query(`SELECT d.*,c.name AS app_name,c.archived AS app_archived,lu.name AS linked_name FROM (
   SELECT m.id,m.app_id,m.workspace_id,m.user_id,m.version,'research' AS kind,coalesce(m.assistant,'chatgpt') AS executor,m.config->>'name' AS name,m.enabled,m.config->>'expiresAt' AS expires_at,coalesce(m.config->'automation'->'trigger',m.config->'schedule') AS trigger,m.created_at,
    concat_ws(E'\\n\\n',m.config->>'objective',m.config->>'instructions') AS prompt,NULL::jsonb AS steps,(m.config->'automation' IS NULL AND m.task IS NOT NULL) AS external_schedule,m.config->'automation'->>'runnerId' AS runner_id,m.assistant AS owner,m.off_reason
   FROM app_monitors m WHERE m.deleted_at IS NULL AND m.archived_with_app_at IS NULL AND m.archived_at IS NULL
   UNION ALL
   SELECT a.id,a.app_id,a.workspace_id,a.user_id,a.version,'action','trialagents',a.config->>'name',NOT a.paused,a.config->>'expiresAt',a.config->'trigger',a.created_at,NULL,a.config->'steps',false,NULL,a.assistant,a.last_error
   FROM app_actions a WHERE a.deleted_at IS NULL AND a.archived_with_app_at IS NULL AND a.archived_at IS NULL AND a.follow_up_of IS NULL
  ) d JOIN workspace_components c ON c.id=d.app_id AND c.workspace_id=d.workspace_id LEFT JOIN users lu ON lu.id=d.user_id
  WHERE d.workspace_id=$1 AND ($9::boolean OR d.user_id=$2 OR EXISTS(SELECT 1 FROM app_members am WHERE am.app_id=d.app_id AND am.user_id=$2 AND am.role='owner')) AND ($3::uuid IS NULL OR d.app_id=$3)
   AND ($4='' OR position(lower($4) in lower(d.name||' '||c.name))>0)
   AND ($5='all' OR d.executor=$5) AND ($6='all' OR (d.enabled AND NOT c.archived AND NOT d.id=ANY($8::uuid[]))=($6='enabled'))
  ORDER BY d.created_at,d.id LIMIT 21 OFFSET $7`,[w,a.userId,v.appId??null,v.query,v.executor,v.state,v.offset,blockedIds,p.role==='owner'])).rows;
  const visible=[];for(const row of rows.slice(0,20)){try{const c=await new WorkspaceFoundation(this.db).component(this.db,a,w,row.app_id,false);
   if(p.role!=='owner'&&row.user_id!==a.userId&&await appRoleOf(this.db,a,p,row.app_id)!=='owner')continue;
   const {steps,external_schedule,runner_id,linked_name,off_reason,...definition}=row,mine=row.user_id===a.userId,offReason=typeof off_reason==='string'&&off_reason.includes(' ')?off_reason:null;
   const dependency=dependencies.find(d=>d.id===row.id&&d.kind===row.kind),connectionState=stateOf(dependency)??null;
   let blockedReason=dependency?.blockedReason??null;
   if(connectionState&&connectionState!=='ready'&&!mine)blockedReason??=`${linked_name||'The linked owner'}'s ${ASSISTANT_NAMES[runnerOf(dependency)]} connection is not ready. Move this automation to your account to run it on yours.`;
   if(connectionState&&connectionState!=='ready')blockedReason??=runnerOf(dependency)==='claude'?'The Claude runner is paused or not connected. Finish setup in Claude to run this automation.':'ChatGPT is disabled. Finish setup in Connectors to run this automation.';
   const prompt=row.kind==='research'?row.prompt:(steps??[]).map((s:any)=>s.kind==='email'?`Email: ${s.subject}\n${s.text}`:s.kind==='connector'?`Run connector operation: ${s.operation}`:`Run app action: ${s.binding}`).join('\n\n');
   // E5: an email step is shown inside its research automation, with both connectors.
   const followUps=row.kind==='research'?(await this.db.query("SELECT id,version,NOT paused AS enabled,config->>'name' AS name,config->'steps' AS steps FROM app_actions WHERE follow_up_of=$1 AND deleted_at IS NULL AND user_id=$2 ORDER BY created_at,id",[row.id,row.user_id])).rows.map((s:any)=>({id:s.id,version:s.version,kind:'action',enabled:s.enabled,name:s.name,recipients:(s.steps??[]).flatMap((x:any)=>x.to??[])})):[];
   const lastTest=(await this.db.query("SELECT id,status,delivery_status,created_at FROM (SELECT id,status,NULL::text AS delivery_status,created_at FROM automation_occurrences WHERE monitor_id=$1 AND user_id=$2 AND reason='test_run' UNION ALL SELECT id,status,delivery_status,created_at FROM app_service_jobs WHERE user_id=$2 AND payload->'test'->>'automationId'=$1::text) t ORDER BY created_at DESC LIMIT 1",[row.id,row.user_id])).rows[0]??null;
   visible.push({...definition,followUps,connectors:[row.executor,...(followUps.length?['email']:[])],canEdit:mine&&canEdit(a,ownedBy({assistant:row.owner})),mine,offReason,linkedOwner:{id:row.user_id,name:linked_name??null},lastTest,prompt,blockedReason,services:dependency?.services??[],effectiveEnabled:row.enabled&&!blockedReason&&!c.archived&&!c.project_archived,connectionState,externalSchedule:external_schedule,app_url:appUrl({workspaceId:w,appId:c.id}),app_archived:c.archived||c.project_archived});
  }catch(e){if(![403,404].includes((e as any).status))throw e;}}
  // B2: read-only helpers installed with an app are shown under that app, never as entries of their own.
  const helpers=(await this.db.query('SELECT f.app_id,c.name AS app_name,array_agg(f.name ORDER BY f.name) AS names FROM foundation_functions f JOIN workspace_components c ON c.id=f.app_id AND c.workspace_id=f.workspace_id WHERE f.workspace_id=$1 AND f.app_id IS NOT NULL AND f.retired_at IS NULL AND NOT c.archived AND ($2::uuid IS NULL OR f.app_id=$2) GROUP BY f.app_id,c.name ORDER BY c.name,f.app_id',[w,v.appId??null])).rows.map((h:any)=>({appId:h.app_id,appName:h.app_name,names:h.names}));
  return {rows:visible,helpers,nextOffset:rows.length>20?v.offset+20:null};
 }
 async connector(a:Actor,w:string,assistant?:Assistant){
  await this.owner(a,w);const setup=await new AutomationService(this.db).setup(a,w,0,{assistant}),automations=[];
  for(const d of await automationDependencies(this.db,w,a.userId)){
   if(!setup.id||!d.runnerIds.includes(setup.id))continue;
   try{const app=await new WorkspaceFoundation(this.db).component(this.db,a,w,d.appId,false);
    const {runnerIds,...row}=d;automations.push({...row,appName:app.name,appArchived:app.archived||app.project_archived,effectiveEnabled:d.enabled&&!d.blockedReason&&setup.state==='ready'&&!app.archived&&!app.project_archived});
   }catch(e){if(![403,404].includes((e as any).status))throw e;}
  }
  const target=assistant??actorAssistant(a)??'chatgpt';
  return {...setup,assistant:target,canConfigure:a.origin!=='ai'||actorAssistant(a)===target,canPrepare:actorAssistant(a)===target||a.origin!=='ai'&&target==='chatgpt',effectiveEnabled:!!setup.enabled&&setup.state==='ready',automations,impactDigest:checksum(JSON.stringify({runnerId:setup.id,version:setup.version,automations}))};
 }
 async controlConnector(a:Actor,w:string,runnerId:string,enabled:boolean,version:number,confirmation?:{confirmed?:boolean;impactDigest?:string}){
  requireCurrentAction(a);return this.db.transaction(async tx=>{
   await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const db=adapter(tx),manage=new AutomationManagement(db),target=await new AutomationService(db).runner(a,w,runnerId,{readOnly:true}),current=await manage.connector(a,w,ownedBy(target)??'chatgpt');
   if(current.id!==runnerId||current.version!==version)fail(409,'runner_changed','The connector changed. Review its current status and try again.');
   if(!enabled&&(!confirmation?.confirmed||confirmation.impactDigest!==current.impactDigest))fail(409,'connector_impact_changed',`Review the current list of affected automations before disabling ${ASSISTANT_NAMES[ownedBy(target)??'chatgpt']}.`);
   return new AutomationService(db).control(a,w,runnerId,enabled,version);
  });
 }
 async readiness(a:Actor,w:string,automationId:string,requiredActionIds:string[]=[]){
  await this.owner(a,w);const research=await new AppMonitoring(this.db).read(a,w,automationId),runnerId=research.config?.automation?.runnerId,setup=await new AutomationService(this.db).setup(a,w,0,runnerId?{runnerId}:{});
  const blockers:{code:string;actionId?:string}[]=[];
  if(!research.enabled)blockers.push({code:'research_disabled'});
  if(research.availability!=='ready')blockers.push({code:research.availability});
  if(research.scheduleManagedBy!=='trialagents')blockers.push({code:'external_schedule'});
  if(setup.state!=='ready')blockers.push({code:'runner_'+setup.state});
  if(requiredActionIds.length&&research.completionSource?.status!=='ready')blockers.push({code:'completion_source_blocked'});
  const actions=[];for(const actionId of [...new Set(requiredActionIds)]){
   let state='ready';try{
    const service=new AppActions(this.db),action=await service.row(a,w,actionId),trigger=action.config.trigger;
    if(action.user_id!==a.userId||action.app_id!==research.app_id)state='action_unavailable';
    else if(action.paused)state='action_disabled';
    else if(trigger.kind!=='database'||trigger.source!=='automation_runs'||trigger.automationId!==automationId||trigger.automationVersion!==research.version)state='completion_link_changed';
    else await service.validate(a,w,action.config,action.scope_stamp);
   }catch(e){if(![400,403,404,409].includes((e as any).status))throw e;state=(e as any).code??'action_unavailable';}
   if(state!=='ready')blockers.push({code:state,actionId});actions.push({id:actionId,state});
  }
  return {state:blockers.length?'blocked':'ready',ready:!blockers.length,automationId,version:research.version,runner:{state:setup.state,verifiedAt:setup.verifiedAt??null},actions,blockers,nextDueAt:research.dispatch?.next_at??null,checkedAt:new Date().toISOString(),executed:false};
 }
 async read(a:Actor,w:string,kind:'research'|'action',automationId:string){await this.owner(a,w);
  const table=kind==='research'?'app_monitors':'app_actions';
  const r=(await this.db.query(`SELECT t.*,u.name AS linked_name FROM ${table} t LEFT JOIN users u ON u.id=t.user_id WHERE t.deleted_at IS NULL AND t.id=$1 AND t.workspace_id=$2`,[automationId,w])).rows[0];if(!r)fail(404,'not_found','Automation unavailable');
  // T1: the linked owner and every owner of the app read it; anyone else is told it does not exist.
  if(r.user_id!==a.userId)try{await this.owner(a,w,r.app_id);}catch(e){if((e as any).status===403)fail(404,'not_found','Automation unavailable');throw e;}
  const c=await new WorkspaceFoundation(this.db).component(this.db,a,w,r.app_id,false);
  const controlRevision=(await this.db.query("SELECT coalesce(max(event_sequence),0)::text revision FROM audit_events WHERE workspace_id=$1 AND object_id=$2 AND action IN ('monitoring.controlled','app_action.paused')",[w,r.id])).rows[0].revision;
  const mine=r.user_id===a.userId;
  return {id:r.id,version:r.version,kind,executor:kind==='research'?ownedBy(r)??'chatgpt':'trialagents',owner:ownedBy(r),mine,linkedOwner:{id:r.user_id,name:r.linked_name??null},canEdit:mine&&canEdit(a,ownedBy(r)),offReason:kind==='research'?r.off_reason??null:r.last_error??null,enabled:kind==='research'?r.enabled:!r.paused,controlRevision,archived:!!r.archived_at,lastError:kind==='action'?r.last_error??null:null,config:r.config,archivedWithApp:!!r.archived_with_app_at,app:{id:c.id,name:c.name,url:appUrl({workspaceId:w,appId:c.id}),archived:c.archived||c.project_archived},managementOnly:true,task:r.task??null};
 }
 async prepareControl(a:Actor,w:string,input:unknown){
  const change=automationControl.parse(input),automation=await this.read(a,w,change.kind,change.automationId);if(change.enabled){requireLinkedOwner(a,{user_id:automation.linkedOwner.id},automation.linkedOwner.name);requireAutomationOwner(a,automation.owner);}
  // A4: switching an automation on is an app change; switching one off stays possible at any level.
  if(change.enabled)requireAssistantApps(await access(this.db,a,w),a,true);
  if(automation.version!==change.expectedVersion)fail(409,'automation_changed','Reopen the current automation before changing it');
  const body={change,automation},reviewId=randomUUID(),digest=checksum(JSON.stringify(body));
  await this.db.query("INSERT INTO app_service_previews(id,workspace_id,user_id,kind,body,digest,assistant) VALUES($1,$2,$3,'automation_control',$4,$5,$6)",[reviewId,w,a.userId,JSON.stringify(body),digest,actorAssistant(a)]);
  return {id:reviewId,kind:'automation_control',digest,body,status:'review_required',...chatServiceReview(w,reviewId,'automation_control',digest,body)};
 }
 async confirmControl(a:Actor,w:string,reviewId:string,digest:string,review?:string){requireCurrentAction(a);return this.db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const db=adapter(tx),s=new AutomationManagement(db);
  await s.owner(a,w);await access(tx,a,w,true);
  await tx.query('SELECT id FROM app_service_previews WHERE id=$1 AND workspace_id=$2 AND user_id=$3 FOR UPDATE',[reviewId,w,a.userId]);
  const p=await new AppActions(db).preview(a,w,reviewId);if(p.kind!=='automation_control'||p.digest!==digest)fail(409,'review_changed','Review changed');checkServiceReview(a,w,p,review);if(p.consumed_at)return p.result;
  const v=automationControl.parse(p.body.change),current=await s.read(a,w,v.kind,v.automationId),before=p.body.automation;
  if(current.version!==v.expectedVersion||current.enabled!==before.enabled||current.controlRevision!==before.controlRevision)fail(409,'automation_changed','The automation changed after preparation. Read it and prepare the requested change again.');
  const result=await s.control(a,w,v.kind,v.automationId,v.expectedVersion,v.enabled);
  await tx.query('UPDATE app_service_previews SET consumed_at=now(),result=$2 WHERE id=$1',[p.id,JSON.stringify(result)]);return result;
 });}
 async control(a:Actor,w:string,kind:'research'|'action',automationId:string,version:number,enabled:boolean){requireCurrentAction(a);return this.db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const db=adapter(tx),s=new AutomationManagement(db),r=await s.read(a,w,kind,automationId);if(r.version!==version)fail(409,'automation_changed','Reopen the current automation before changing it');if(enabled&&(r.archivedWithApp||r.app.archived))fail(409,'app_archived',`Restore ${r.app.name} first. Its automations come back switched off for review.`);
  if(enabled&&r.archived)fail(409,'automation_archived','Restore this automation from Show archived first. It comes back switched off.');
  if(!r.mine){if(enabled)requireLinkedOwner(a,{user_id:r.linkedOwner.id},r.linkedOwner.name);return s.switchOff(tx,a,w,kind,automationId,'Switched off by an owner of the app.');}
  if(kind==='research'){
   const result=await new AppMonitoring(db).control(a,w,automationId,version,enabled);
   // E5: research and its email step switch on and off as one automation.
   const followUps=(await tx.query('SELECT id,paused FROM app_actions WHERE follow_up_of=$1 AND deleted_at IS NULL AND user_id=$2',[automationId,a.userId])).rows;
   for(const step of followUps)if(step.paused===enabled)await new AppActions(db).control(a,w,step.id,!enabled);
   return {...result,followUps:followUps.map(s=>s.id)};
  }
  return new AppActions(db).control(a,w,automationId,!enabled);
 });}
 async history(a:Actor,w:string,kind:'research'|'action',automationId:string,offset=0){const r=await this.read(a,w,kind,automationId);
  if(kind==='research'){
   if(r.mine)return new AppMonitoring(this.db).runs(a,w,automationId,offset);
   // A7: co-owners see every run; results only while the run's fields are readable to them now.
   const monitor=(await this.db.query('SELECT * FROM app_monitors WHERE id=$1',[automationId])).rows[0];let canRead=false;
   try{const config=monitoringConfig.parse(monitor.config);await new AppMonitoring(this.db).validate(a,w,{...config,writeScopes:[],storeResults:false} as any);canRead=true;}catch{canRead=false;}
   const rows=(await this.db.query('SELECT id,monitor_version,status,result,started_at,finished_at,expires_at FROM app_monitor_runs WHERE monitor_id=$1 ORDER BY started_at DESC,id DESC LIMIT 21 OFFSET $2',[automationId,offset])).rows;
   return {rows:rows.slice(0,20).map((x:any)=>{const visible=canRead&&x.monitor_version===monitor.version;return {...x,result:visible?x.result:null,resultWithheld:!visible};}),nextOffset:rows.length>20?offset+20:null};
  }
  // Summaries do not release historical record payloads or old execution prompts.
  const sql=`SELECT id,status,started_at,finished_at FROM (SELECT id,status,created_at AS started_at,finished_at FROM app_action_runs WHERE action_id=$1 AND user_id=$2 UNION ALL SELECT id,CASE status WHEN 'collecting' THEN 'queued' WHEN 'sending' THEN 'waiting' ELSE status END,created_at,finished_at FROM app_notification_batches WHERE action_id=$1 AND user_id=$2 UNION ALL SELECT id,status,created_at,finished_at FROM app_service_jobs WHERE user_id=$2 AND payload->'test'->>'automationId'=$1::text) h ORDER BY started_at DESC,id DESC LIMIT 21 OFFSET $3`;
  const rows=(await this.db.query(sql,[automationId,r.linkedOwner.id,offset])).rows;return {rows:rows.slice(0,20),nextOffset:rows.length>20?offset+20:null};
 }
 /** Switch off without the linked owner's rights: allowed for every owner of the app. Running work stops; nothing already sent is undone. */
 async switchOff(tx:Connection,a:Actor,w:string,kind:'research'|'action',automationId:string,reason:string){
  const p=await access(tx,a,w,true);
  if(kind==='research'){
   await tx.query("UPDATE automation_occurrences SET status='queued',claim_token=NULL,available_at=now() WHERE monitor_id=$1 AND status='running'",[automationId]);
   await tx.query("UPDATE app_monitor_runs SET status='cancelled',finished_at=now() WHERE monitor_id=$1 AND status='running'",[automationId]);
   await tx.query('UPDATE app_monitors SET enabled=false,updated_at=now(),off_reason=$2 WHERE id=$1',[automationId,reason]);
   await audit(tx,a,p,'monitoring.controlled',automationId,null,{enabled:false,linkedOwnerUnchanged:true});
   const steps=(await tx.query('SELECT id FROM app_actions WHERE follow_up_of=$1 AND deleted_at IS NULL AND NOT paused',[automationId])).rows;
   for(const step of steps){await tx.query('UPDATE app_actions SET paused=true,last_error=$2 WHERE id=$1',[step.id,reason]);await audit(tx,a,p,'app_action.paused',step.id,null,{paused:true});}
   return {id:automationId,enabled:false,hostTaskChanged:false,followUps:steps.map((x:any)=>x.id)};
  }
  await tx.query('UPDATE app_actions SET paused=true,last_error=$2 WHERE id=$1',[automationId,reason]);await audit(tx,a,p,'app_action.paused',automationId,null,{paused:true});
  return {id:automationId,paused:true};
 }
 /**
  * T1, D29: "Move to my account". The automation is linked to the person moving it and runs on their own
  * connection to the same assistant. Queued work is cancelled; the next run is scheduled from now (no replay).
  * Write permissions are never carried over: the mover's own rights are checked, and the automation stays on
  * only when it was on, their connection is ready and those checks pass. Otherwise it is off with the reason.
  */
 async move(a:Actor,w:string,kind:'research'|'action',automationId:string,expectedVersion:number){requireHuman(a);requireCurrentAction(a);return this.db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const db=adapter(tx),s=new AutomationManagement(db),r=await s.read(a,w,kind,automationId);
  if(r.version!==expectedVersion)fail(409,'automation_changed','Reopen the current automation before moving it');
  if(r.mine)fail(409,'already_linked','This automation is already linked to your account');
  await s.owner(a,w,r.app.id);const p=await access(tx,a,w,true),wasOn=r.enabled,from=r.linkedOwner;
  const me=(await tx.query('SELECT name FROM users WHERE id=$1',[a.userId])).rows[0]?.name??null;
  let cause:string|null=null;
  if(kind==='research'){
   const row=(await tx.query('SELECT * FROM app_monitors WHERE id=$1 FOR UPDATE',[automationId])).rows[0],config=row.config??{},assistant=ownedBy(row)??'chatgpt';
   await s.switchOff(tx,a,w,'research',automationId,'Moved to '+(me??'a new owner')+'.');
   await tx.query("UPDATE automation_occurrences SET status='cancelled',finished_at=now(),claim_token=NULL,lease_until=NULL WHERE monitor_id=$1 AND status IN ('queued','running','partial','blocked')",[automationId]);
   const runner=(await tx.query('SELECT id,enabled,verified_at FROM automation_runners WHERE workspace_id=$1 AND user_id=$2 AND assistant=$3',[w,a.userId,assistant])).rows[0];
   // Grants stay with the person who gave them. The mover's write access is set up again when they switch it on.
   const next={...config,writeScopes:[],...(config.automation?{automation:{...config.automation,runnerId:runner?.id??config.automation.runnerId}}:{})};
   await tx.query('UPDATE app_monitors SET user_id=$2,config=$3,version=version+1,updated_at=now() WHERE id=$1',[automationId,a.userId,JSON.stringify(next)]);
   await tx.query('UPDATE automation_dispatch SET user_id=$2,runner_id=coalesce($3,runner_id),next_at=NULL,diagnostic=$4 WHERE monitor_id=$1',[automationId,a.userId,runner?.id??null,'moved']);
   await tx.query('UPDATE app_actions SET user_id=$2,version=version+1 WHERE follow_up_of=$1 AND deleted_at IS NULL',[automationId,a.userId]);
   await tx.query('UPDATE automation_recipe_setups SET user_id=$2,revision=revision+1,updated_at=now() WHERE definition_id=$1 AND status<>$3',[automationId,a.userId,'cancelled']);
   if(!runner||!runner.enabled||!runner.verified_at)cause=`Connect ${ASSISTANT_NAMES[assistant]} to run this automation on your account, then switch it on.`;
   else if(config.storeResults&&config.writeScopes?.length)cause='Set up again: approve where this automation may save its results under your account, then switch it on.';
   else if(wasOn){
    try{await tx.query('SAVEPOINT move_on');const moved=(await tx.query('SELECT * FROM app_monitors WHERE id=$1',[automationId])).rows[0];
     const exec={userId:a.userId,origin:'ai' as const,...(assistant==='claude'?{assistant:'claude' as const}:{})};
     const checked=await new AppMonitoring(db).validate(exec,w,monitoringConfig.parse(moved.config));
     await tx.query('UPDATE app_monitors SET enabled=true,scope_stamp=$2,off_reason=NULL WHERE id=$1',[automationId,checked.stamp]);
     await syncDispatch(tx,a,w,automationId,moved.version,monitoringConfig.parse(moved.config));
     await tx.query('RELEASE SAVEPOINT move_on');
    }catch(e){await tx.query('ROLLBACK TO SAVEPOINT move_on');cause=`Switched off after the move: ${(e as any).message??'your access does not cover this automation'}`.slice(0,300);}
   }
  }else{
   const row=(await tx.query('SELECT * FROM app_actions WHERE id=$1 FOR UPDATE',[automationId])).rows[0];
   await tx.query('UPDATE app_actions SET user_id=$2,approved_by=$2,paused=true,version=version+1,last_error=$3 WHERE id=$1',[automationId,a.userId,'Moved to '+(me??'a new owner')+'.']);
   if(wasOn){
    try{await tx.query('SAVEPOINT move_on');const service=new AppActions(db),moved=await service.row(a,w,automationId);
     const checked=await service.validate(a,w,moved.config,moved.scope_stamp);
     if(checked.stamp!==moved.scope_stamp)throw Object.assign(new Error('Its tables or permissions differ under your account. Open it, review and save it again.'),{status:409});
     await tx.query('UPDATE app_actions SET paused=false,last_error=NULL WHERE id=$1',[automationId]);
     await tx.query('RELEASE SAVEPOINT move_on');
    }catch(e){await tx.query('ROLLBACK TO SAVEPOINT move_on');cause=`Switched off after the move: ${(e as any).message??'your access does not cover this automation'}`.slice(0,300);}
   }
   void row;
  }
  if(cause){if(kind==='research')await tx.query('UPDATE app_monitors SET enabled=false,off_reason=$2 WHERE id=$1',[automationId,cause]);else await tx.query('UPDATE app_actions SET paused=true,last_error=$2 WHERE id=$1',[automationId,cause]);}
  await audit(tx,a,p,'automation.moved',automationId,{linkedOwner:from.id},{linkedOwner:a.userId,kind,enabled:wasOn&&!cause});
  return {id:automationId,kind,movedFrom:from,linkedOwner:{id:a.userId,name:me},enabled:wasOn&&!cause,reason:cause};
 });}
 /** A9 (6.2): archive one automation. It stops, runs nothing and leaves the list; its history stays. Any owner of the app may do this. */
 async archive(a:Actor,w:string,kind:'research'|'action',automationId:string,expectedVersion:number){requireCurrentAction(a);return this.db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const db=adapter(tx),s=new AutomationManagement(db),r=await s.read(a,w,kind,automationId);
  if(r.version!==expectedVersion)fail(409,'automation_changed','Reopen the current automation before archiving it');if(r.archived)return {id:automationId,kind,archived:true};
  await s.owner(a,w,r.app.id);const p=await access(tx,a,w,true);
  await s.switchOff(tx,a,w,kind,automationId,'Archived.');
  if(kind==='research'){
   await tx.query("UPDATE automation_occurrences SET status='cancelled',finished_at=now(),claim_token=NULL,lease_until=NULL WHERE monitor_id=$1 AND status IN ('queued','running','partial','blocked')",[automationId]);
   await tx.query("UPDATE automation_dispatch SET next_at=NULL,diagnostic='archived' WHERE monitor_id=$1",[automationId]);
   await tx.query('UPDATE app_monitors SET archived_at=now() WHERE id=$1',[automationId]);
   await tx.query('UPDATE app_actions SET archived_at=now(),next_at=NULL WHERE follow_up_of=$1 AND deleted_at IS NULL',[automationId]);
  }else{
   await tx.query("UPDATE app_action_runs SET status='cancelled',finished_at=now(),lease_token=NULL,lease_until=NULL,diagnostic='automation_archived' WHERE action_id=$1 AND status IN ('queued','waiting')",[automationId]);
   await tx.query('UPDATE app_actions SET archived_at=now(),next_at=NULL WHERE id=$1',[automationId]);
  }
  await audit(tx,a,p,'automation.archived',automationId,null,{kind});return {id:automationId,kind,archived:true};
 });}
 /** A9: restore an archived automation. It comes back switched off; switching it on checks access and schedules from now. */
 async restore(a:Actor,w:string,kind:'research'|'action',automationId:string){requireCurrentAction(a);return this.db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const db=adapter(tx),s=new AutomationManagement(db),r=await s.read(a,w,kind,automationId);
  if(!r.archived)return {id:automationId,kind,restored:false};
  if(r.archivedWithApp||r.app.archived)fail(409,'app_archived',`Restore ${r.app.name} first.`);
  await s.owner(a,w,r.app.id);const p=await access(tx,a,w,true);
  if(kind==='research'){await tx.query('UPDATE app_monitors SET archived_at=NULL,updated_at=now() WHERE id=$1',[automationId]);await tx.query('UPDATE app_actions SET archived_at=NULL WHERE follow_up_of=$1 AND deleted_at IS NULL',[automationId]);}
  else await tx.query('UPDATE app_actions SET archived_at=NULL WHERE id=$1',[automationId]);
  await audit(tx,a,p,'automation.restored',automationId,null,{kind,enabled:false});return {id:automationId,kind,restored:true,enabled:false};
 });}
 /**
  * D25: code functions, code schedules and record rules tied to no app. Organization owners attach each to an
  * app or archive it; nothing new is created without an app.
  */
 async unassigned(a:Actor,w:string){
  const p=await access(this.db,a,w);if(p.role!=='owner')return {rows:[]};
  const rows=(await this.db.query(`SELECT 'function' AS kind,f.id,f.name,(f.retired_at IS NULL) AS enabled,f.created_at,NULL::text AS reason FROM foundation_functions f WHERE f.workspace_id=$1 AND f.app_id IS NULL AND f.retired_at IS NULL
   UNION ALL SELECT 'schedule',s.id,coalesce(f.name,'Code schedule'),NOT s.paused,s.created_at,s.off_reason FROM foundation_schedules s JOIN foundation_revisions v ON v.id=s.revision_id LEFT JOIN foundation_functions f ON f.id=v.function_id WHERE s.workspace_id=$1 AND s.archived_at IS NULL AND s.component_context IS NULL AND (f.id IS NULL OR f.app_id IS NULL)
   UNION ALL SELECT 'rule',r.id,r.name,NOT r.paused,r.created_at,r.off_reason FROM automations r WHERE r.workspace_id=$1 AND r.app_id IS NULL AND r.archived_at IS NULL
   ORDER BY created_at,id LIMIT 100`,[w])).rows;
  return {rows};
 }
 async resolveUnassigned(a:Actor,w:string,input:{kind:'function'|'schedule'|'rule';id:string;appId?:string;archive?:boolean}){requireHuman(a);requireCurrentAction(a);return this.db.transaction(async tx=>{
  const p=await access(tx,a,w,true);if(p.role!=='owner')fail(403,'owner_required','Only an organization owner can attach or archive unassigned automations');
  if(!input.archive&&!input.appId)fail(400,'app_required','Choose the app this belongs to, or archive it');
  if(input.appId){const c=await new WorkspaceFoundation(adapter(tx)).component(tx,a,w,input.appId);if(c.archived||c.project_archived)fail(409,'app_archived','Choose an active app');}
  const table=input.kind==='function'?'foundation_functions':input.kind==='schedule'?'foundation_schedules':'automations';
  const row=(await tx.query(`SELECT * FROM ${table} WHERE id=$1 AND workspace_id=$2 FOR UPDATE`,[input.id,w])).rows[0];if(!row)fail(404,'not_found','Item unavailable');
  if(input.archive){
   if(input.kind==='function')await tx.query('UPDATE foundation_functions SET retired_at=now() WHERE id=$1',[input.id]);
   else if(input.kind==='schedule')await tx.query("UPDATE foundation_schedules SET paused=true,archived_at=now(),off_reason=coalesce(off_reason,'Archived as unassigned.') WHERE id=$1",[input.id]);
   else await tx.query("UPDATE automations SET paused=true,archived_at=now(),off_reason=coalesce(off_reason,'Archived as unassigned.') WHERE id=$1",[input.id]);
  }else if(input.kind==='schedule'){
   const fn=(await tx.query('SELECT function_id FROM foundation_revisions WHERE id=$1',[row.revision_id])).rows[0]?.function_id;if(!fn)fail(409,'function_required','This schedule has no function to attach');
   await tx.query('UPDATE foundation_functions SET app_id=$2 WHERE id=$1 AND app_id IS NULL',[fn,input.appId]);
  }else await tx.query(`UPDATE ${table} SET app_id=$2 WHERE id=$1`,[input.id,input.appId]);
  await audit(tx,a,p,input.archive?'automation.unassigned_archived':'automation.assigned',input.id,null,{kind:input.kind,appId:input.appId??null});
  return {id:input.id,kind:input.kind,appId:input.appId??null,archived:!!input.archive};
 });}
}
