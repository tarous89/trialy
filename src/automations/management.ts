import {Connectors} from '../connectors/service.js';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import type {Database} from '../db/database.js';
import {id,fail,ASSISTANT_NAMES,type Actor,type Assistant} from '../shared/schema.js';
import {actorAssistant,canEdit,ownedBy,requireAutomationOwner} from './ownership.js';
import {requireCurrentAction,requireHuman} from '../domain/write-authorization.js';
import {checksum} from '../domain/evidence.js';
import {chatServiceReview,checkServiceReview} from '../app-services/review.js';
import {access} from '../domain/permissions.js';
import {AppMonitoring} from '../app-services/monitoring.js';
import {AppActions} from '../app-services/service.js';
import {notificationRecipients} from '../app-services/notifications.js';
import {WorkspaceFoundation} from '../workspace/service.js';
import {appUrl} from '../shared/app-route.js';
import {adapter,AutomationService} from './service.js';
import {automationDependencies} from './dependencies.js';
export const automationKind=z.enum(['research','action']);
export const automationControl=z.object({kind:automationKind,automationId:id,expectedVersion:z.number().int().min(0),enabled:z.boolean()}).strict();
export const automationList=z.object({appId:id.optional(),query:z.string().max(100).default(''),executor:z.enum(['all','chatgpt','claude','trialagents']).default('all'),state:z.enum(['all','enabled','disabled']).default('all'),offset:z.number().int().min(0).max(100000).default(0)}).strict();
/** Management adapter over the existing stores. Never called by the app runtime. */
export class AutomationManagement{
 constructor(readonly db:Database){}
 async owner(a:Actor,w:string){const p=await access(this.db,a,w);if(p.role!=='owner')fail(403,'owner_required','Only the owner can manage app automations');}
 async options(a:Actor,w:string,appId:string){
  await this.owner(a,w);const f=new WorkspaceFoundation(this.db),p=await access(this.db,a,w),app=await f.component(this.db,a,w,appId);
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
 async list(a:Actor,w:string,input:unknown){await this.owner(a,w);const v=automationList.parse(input);
  const dependencies=await automationDependencies(this.db,w,a.userId);
  // Each research automation depends on its own assistant's runner.
  const runnerAssistants=new Map<string,Assistant>((await this.db.query('SELECT id,assistant FROM automation_runners WHERE workspace_id=$1 AND user_id=$2',[w,a.userId])).rows.map((r:any)=>[r.id,ownedBy(r)??'chatgpt']));
  const runnerOf=(d:any):Assistant=>runnerAssistants.get(d.runnerIds[0])??'chatgpt',setups=new Map<Assistant,any>();
  for(const assistant of new Set(dependencies.filter(d=>d.runnerIds.length).map(runnerOf)))setups.set(assistant,await new AutomationService(this.db).setup(a,w,0,{assistant}));
  const stateOf=(d:any)=>d?.runnerIds.length?setups.get(runnerOf(d))?.state:null;
  const blockedIds=dependencies.filter(d=>d.blockedReason||d.runnerIds.length&&stateOf(d)!=='ready').map(d=>d.id);
  const rows=(await this.db.query(`SELECT d.*,c.name AS app_name,c.archived AS app_archived FROM (
   SELECT m.id,m.app_id,m.workspace_id,m.user_id,m.version,'research' AS kind,coalesce(m.assistant,'chatgpt') AS executor,m.config->>'name' AS name,m.enabled,m.config->>'expiresAt' AS expires_at,coalesce(m.config->'automation'->'trigger',m.config->'schedule') AS trigger,m.created_at,
    concat_ws(E'\\n\\n',m.config->>'objective',m.config->>'instructions') AS prompt,NULL::jsonb AS steps,(m.config->'automation' IS NULL AND m.task IS NOT NULL) AS external_schedule,m.config->'automation'->>'runnerId' AS runner_id,m.assistant AS owner
   FROM app_monitors m WHERE m.deleted_at IS NULL AND m.archived_with_app_at IS NULL
   UNION ALL
   SELECT a.id,a.app_id,a.workspace_id,a.user_id,a.version,'action','trialagents',a.config->>'name',NOT a.paused,a.config->>'expiresAt',a.config->'trigger',a.created_at,NULL,a.config->'steps',false,NULL,a.assistant
   FROM app_actions a WHERE a.deleted_at IS NULL AND a.archived_with_app_at IS NULL AND a.follow_up_of IS NULL
  ) d JOIN workspace_components c ON c.id=d.app_id AND c.workspace_id=d.workspace_id
  WHERE d.workspace_id=$1 AND d.user_id=$2 AND ($3::uuid IS NULL OR d.app_id=$3)
   AND ($4='' OR position(lower($4) in lower(d.name||' '||c.name))>0)
   AND ($5='all' OR d.executor=$5) AND ($6='all' OR (d.enabled AND NOT c.archived AND NOT d.id=ANY($8::uuid[]))=($6='enabled'))
  ORDER BY d.created_at,d.id LIMIT 21 OFFSET $7`,[w,a.userId,v.appId??null,v.query,v.executor,v.state,v.offset,blockedIds])).rows;
  const visible=[];for(const row of rows.slice(0,20)){try{const c=await new WorkspaceFoundation(this.db).component(this.db,a,w,row.app_id,false);
   const {steps,external_schedule,runner_id,...definition}=row;
   const dependency=dependencies.find(d=>d.id===row.id&&d.kind===row.kind),connectionState=stateOf(dependency)??null;
   let blockedReason=dependency?.blockedReason??null;
   if(connectionState&&connectionState!=='ready')blockedReason??=runnerOf(dependency)==='claude'?'The Claude runner is paused or not connected. Finish setup in Claude to run this automation.':'ChatGPT is disabled. Finish setup in Connectors to run this automation.';
   const prompt=row.kind==='research'?row.prompt:(steps??[]).map((s:any)=>s.kind==='email'?`Email: ${s.subject}\n${s.text}`:s.kind==='connector'?`Run connector operation: ${s.operation}`:`Run app action: ${s.binding}`).join('\n\n');
   // E5: an email step is shown inside its research automation, with both connectors.
   const followUps=row.kind==='research'?(await this.db.query("SELECT id,version,NOT paused AS enabled,config->>'name' AS name,config->'steps' AS steps FROM app_actions WHERE follow_up_of=$1 AND deleted_at IS NULL AND user_id=$2 ORDER BY created_at,id",[row.id,a.userId])).rows.map((s:any)=>({id:s.id,version:s.version,kind:'action',enabled:s.enabled,name:s.name,recipients:(s.steps??[]).flatMap((x:any)=>x.to??[])})):[];
   const lastTest=(await this.db.query("SELECT id,status,delivery_status,created_at FROM (SELECT id,status,NULL::text AS delivery_status,created_at FROM automation_occurrences WHERE monitor_id=$1 AND user_id=$2 AND reason='test_run' UNION ALL SELECT id,status,delivery_status,created_at FROM app_service_jobs WHERE user_id=$2 AND payload->'test'->>'automationId'=$1::text) t ORDER BY created_at DESC LIMIT 1",[row.id,a.userId])).rows[0]??null;
   visible.push({...definition,followUps,connectors:[row.executor,...(followUps.length?['email']:[])],canEdit:canEdit(a,ownedBy({assistant:row.owner})),lastTest,prompt,blockedReason,services:dependency?.services??[],effectiveEnabled:row.enabled&&!blockedReason&&!c.archived&&!c.project_archived,connectionState,externalSchedule:external_schedule,app_url:appUrl({workspaceId:w,appId:c.id}),app_archived:c.archived||c.project_archived});
  }catch(e){if(![403,404].includes((e as any).status))throw e;}}
  return {rows:visible,nextOffset:rows.length>20?v.offset+20:null};
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
  const r=(await this.db.query(`SELECT * FROM ${table} WHERE deleted_at IS NULL AND id=$1 AND workspace_id=$2 AND user_id=$3`,[automationId,w,a.userId])).rows[0];if(!r)fail(404,'not_found','Automation unavailable');
  const c=await new WorkspaceFoundation(this.db).component(this.db,a,w,r.app_id,false);
  const controlRevision=(await this.db.query("SELECT coalesce(max(event_sequence),0)::text revision FROM audit_events WHERE workspace_id=$1 AND object_id=$2 AND action IN ('monitoring.controlled','app_action.paused')",[w,r.id])).rows[0].revision;
  return {id:r.id,version:r.version,kind,executor:kind==='research'?ownedBy(r)??'chatgpt':'trialagents',owner:ownedBy(r),canEdit:canEdit(a,ownedBy(r)),enabled:kind==='research'?r.enabled:!r.paused,controlRevision,lastError:kind==='action'?r.last_error??null:null,config:r.config,archivedWithApp:!!r.archived_with_app_at,app:{id:c.id,name:c.name,url:appUrl({workspaceId:w,appId:c.id}),archived:c.archived||c.project_archived},managementOnly:true,task:r.task??null};
 }
 async prepareControl(a:Actor,w:string,input:unknown){
  const change=automationControl.parse(input),automation=await this.read(a,w,change.kind,change.automationId);if(change.enabled)requireAutomationOwner(a,automation.owner);
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
  if(kind==='research'){
   const result=await new AppMonitoring(db).control(a,w,automationId,version,enabled);
   // E5: research and its email step switch on and off as one automation.
   const followUps=(await tx.query('SELECT id,paused FROM app_actions WHERE follow_up_of=$1 AND deleted_at IS NULL AND user_id=$2',[automationId,a.userId])).rows;
   for(const step of followUps)if(step.paused===enabled)await new AppActions(db).control(a,w,step.id,!enabled);
   return {...result,followUps:followUps.map(s=>s.id)};
  }
  return new AppActions(db).control(a,w,automationId,!enabled);
 });}
 async history(a:Actor,w:string,kind:'research'|'action',automationId:string,offset=0){await this.read(a,w,kind,automationId);
  if(kind==='research')return new AppMonitoring(this.db).runs(a,w,automationId,offset);
  // Summaries do not release historical record payloads or old execution prompts.
  const sql=`SELECT id,status,started_at,finished_at FROM (SELECT id,status,created_at AS started_at,finished_at FROM app_action_runs WHERE action_id=$1 AND user_id=$2 UNION ALL SELECT id,CASE status WHEN 'collecting' THEN 'queued' WHEN 'sending' THEN 'waiting' ELSE status END,created_at,finished_at FROM app_notification_batches WHERE action_id=$1 AND user_id=$2 UNION ALL SELECT id,status,created_at,finished_at FROM app_service_jobs WHERE user_id=$2 AND payload->'test'->>'automationId'=$1::text) h ORDER BY started_at DESC,id DESC LIMIT 21 OFFSET $3`;
  const rows=(await this.db.query(sql,[automationId,a.userId,offset])).rows;return {rows:rows.slice(0,20),nextOffset:rows.length>20?offset+20:null};
 }
}
