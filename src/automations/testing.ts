import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Database} from '../db/database.js';
import {withActor} from '../db/context.js';
import {id,fail,type Actor} from '../shared/schema.js';
import {asOwner,ownedBy,requireAutomationOwner,runnerActor} from './ownership.js';
import {requireCurrentAction} from '../domain/write-authorization.js';
import {access} from '../domain/permissions.js';
import {audit} from '../domain/evidence.js';
import {Service} from '../domain/service.js';
import {AppActions} from '../app-services/service.js';
import {AppMonitoring} from '../app-services/monitoring.js';
import {expand} from '../app-services/schema.js';
import {notificationEmailsEnabled} from '../app-services/notifications.js';
import {enqueueServiceJob} from '../app-services/jobs.js';
import {adapter,AutomationService,signalWork} from './service.js';
import {readRunData} from './run-data.js';
export const testInput=z.object({kind:z.enum(['research','action']),automationId:id,expectedVersion:z.number().int().min(0),requestKey:id}).strict();

async function definition(db:Database,a:Actor,w:string,kind:string,automationId:string,version:number){
 const permission=await access(db,a,w);if(permission.role!=='owner')fail(403,'owner_required','Only the owner can test automations');
 const service=kind==='research'?new AppMonitoring(db):new AppActions(db),row=await service.row(a,w,automationId);
 if(row.user_id!==a.userId||row.version!==version)fail(409,'automation_changed','Reload this automation before testing');
 const exec=asOwner(a,ownedBy(row)),checked=kind==='research'?await (service as AppMonitoring).validate(exec,w,row.config):await (service as AppActions).validate(exec,w,row.config,row.scope_stamp);
 if(checked.stamp!==row.scope_stamp)fail(409,'scope_changed','Review this automation’s current access before testing');
 const user=(await db.query("SELECT email FROM users WHERE id=$1 AND subject NOT LIKE 'public-app|%'",[a.userId])).rows[0];if(!user)fail(403,'recipient_unavailable','Your account email is unavailable');
 return {row,email:user.email.toLowerCase(),permission};
}

/** Explicit user action. There is deliberately no recipient or message input. */
export async function testAutomation(db:Database,a:Actor,w:string,input:unknown){
 requireCurrentAction(a);const v=testInput.parse(input);
 return db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const d=adapter(tx),{row,email,permission}=await definition(d,a,w,v.kind,v.automationId,v.expectedVersion),key=`test:${v.kind}:${row.id}:${v.requestKey}`;requireAutomationOwner(a,ownedBy(row));
  const previous=(await tx.query("SELECT id,status FROM automation_occurrences WHERE workspace_id=$1 AND user_id=$2 AND occurrence_key=$3 UNION ALL SELECT id,status FROM app_service_jobs WHERE workspace_id=$1 AND user_id=$2 AND request_key=$3",[w,a.userId,key])).rows[0];if(previous)return {...previous,testRun:true,replayed:true};
  const count=Number((await tx.query("SELECT (SELECT count(*) FROM automation_occurrences WHERE workspace_id=$1 AND user_id=$2 AND reason='test_run' AND created_at>now()-interval '1 hour')+(SELECT count(*) FROM app_service_jobs WHERE workspace_id=$1 AND user_id=$2 AND payload->'test'->>'kind'='action' AND created_at>now()-interval '1 hour') AS n",[w,a.userId])).rows[0].n);
  if(count>=5)fail(429,'test_limit','You can start five tests per hour. Try again later.');
  if(v.kind==='research'){
   const s=new AutomationService(d),setup=row.config.automation?await s.setup(a,w,0,{runnerId:row.config.automation.runnerId}):null;if(!setup||setup.state!=='ready'||!row.enabled)fail(409,'test_unavailable',`Enable this research automation and connect ${ownedBy(row)==='claude'?'the Claude runner':'ChatGPT'} before testing`);
   if((await tx.query("SELECT id FROM automation_occurrences WHERE monitor_id=$1 AND status IN ('queued','running')",[row.id])).rows.length)fail(409,'test_busy','A run is already queued or active. Let it finish before testing.');
   const runId=randomUUID();await tx.query("INSERT INTO automation_occurrences(id,workspace_id,user_id,runner_id,monitor_id,monitor_version,occurrence_key,reason,due_at,input,retry_limit) VALUES($1,$2,$3,$4,$5,$6,$7,'test_run',now(),$8,1)",[runId,w,a.userId,setup.id,row.id,row.version,key,JSON.stringify({testRun:true,readOnly:true})]);
   await signalWork(tx,{...row,runner_id:setup.id},key,'work_due');await audit(tx,a,permission,'automation.test_requested',row.id,null,{kind:v.kind,testRunId:runId});
   return {id:runId,status:'queued',testRun:true,message:'Research test queued. It previews findings without saving records or changing the schedule. Its report is emailed only to your account.'};
  }
  if(row.config.steps.length!==1||row.config.steps[0].kind!=='email')fail(409,'test_unsupported','This action cannot be tested safely. Only email actions support isolated tests.');
  let context:any={record:{},steps:{}},sourceRunId:string|undefined,recordId:string|undefined,recordVersion:number|undefined;
  if(row.config.trigger.source==='automation_runs'){
   const run=(await tx.query("SELECT id FROM app_monitor_runs WHERE workspace_id=$1 AND user_id=$2 AND monitor_id=$3 AND monitor_version=$4 AND status='completed' AND NOT coalesce((result->>'testRun')::boolean,false) ORDER BY finished_at DESC LIMIT 1",[w,a.userId,row.config.trigger.automationId,row.config.trigger.automationVersion])).rows[0];
   if(!run)fail(409,'test_data_missing','Complete a research cycle first so this email can use its saved results');
   sourceRunId=run.id;context.run=await readRunData(d,a,w,row.config,'run:'+run.id);
  }else if(row.config.recordTypeId){
   const scoped={...a,origin:'ai' as const,accessToolId:row.app_id};const data=await withActor(scoped,()=>new Service(d).records(scoped,w,row.config.recordTypeId,{limit:1,offset:0}));const record=data.rows[0];
   if(!record)fail(409,'test_data_missing','Add an accessible app record before testing this email');
   recordId=record.id;recordVersion=record.version;context.record=Object.fromEntries(Object.entries(record.data).filter(([k])=>row.config.fields.includes(k)));context.recordId=record.id;
  }
  let message;try{message=expand({subject:row.config.steps[0].subject,text:row.config.steps[0].text},context);}catch{fail(409,'test_data_missing','The email needs saved results that are not available yet');}
  const job=await queueTestEmail(d,a,w,{kind:'action',automationId:row.id,version:row.version,sourceRunId,recordId,recordVersion},row.app_id,key,email,message);
  await audit(tx,a,permission,'automation.test_requested',row.id,null,{kind:v.kind,testRunId:job.id});
  return {...job,testRun:true,message:'Test email queued for your account only. Delivery limits still apply; the regular automation is unchanged.'};
 });
}
export async function queueTestEmail(db:Database,a:Actor,w:string,test:any,appId:string,key:string,email:string,message:{subject:string;text:string}){
 if(!notificationEmailsEnabled())fail(503,'notifications_paused','Email delivery is currently paused');
 return enqueueServiceJob(db,a,w,appId,'email',key,{origin:a.origin,...(a.assistant?{assistant:a.assistant}:{}),test,message:{to:[email],subject:('[Test] '+message.subject).slice(0,200),text:('TEST RUN · Sent only to your account. Regular schedules and recipients are unchanged.\n\n'+message.text).slice(0,20000)}},23*3600);
}
export async function authorizeTestEmail(db:Database,j:any){
 const a:Actor={userId:j.user_id,origin:'ai',...(j.payload.assistant==='claude'?{assistant:'claude' as const}:{})},t=j.payload.test,{row,email,permission}=await definition(db,a,j.workspace_id,t.kind,t.automationId,t.version);
 if(row.app_id!==j.app_id||j.kind!=='email'||j.payload.message.to.length!==1||j.payload.message.to[0]!==email)fail(403,'test_recipient','Test emails can only go to the signed-in account');
 if(t.kind==='research'){
  if(!row.enabled||!row.config.automation||(await new AutomationService(db).setup(a,j.workspace_id,0,{runnerId:row.config.automation.runnerId})).state!=='ready')fail(409,'test_stopped','Research or its connection was disabled');
  const run=(await db.query("SELECT id FROM app_monitor_runs WHERE id=$1 AND monitor_id=$2 AND user_id=$3 AND result->>'testRun'='true' AND status IN ('completed','no_update')",[t.sourceRunId,row.id,a.userId])).rows[0];if(!run)fail(409,'test_result_changed','Test result is unavailable');
 }else if(t.sourceRunId)await readRunData(db,a,j.workspace_id,row.config,'run:'+t.sourceRunId);
 if(t.recordId){const record=(await db.query("SELECT id FROM records WHERE id=$1 AND workspace_id=$2 AND version=$3 AND state<>'archived'",[t.recordId,j.workspace_id,t.recordVersion])).rows[0];if(!record)fail(409,'test_result_changed','The sample record changed. Run another test.');}
 return permission.tenant_id;
}
export async function dispatchTestReports(db:Database){
 const o=(await db.query("SELECT o.*,r.assistant FROM automation_occurrences o JOIN automation_runners r ON r.id=o.runner_id WHERE o.reason='test_run' AND o.status IN ('completed','no_update') AND o.completion_dispatched_at IS NULL ORDER BY o.finished_at LIMIT 1")).rows[0];if(!o)return false;
 return withActor(runnerActor(o),()=>db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[o.workspace_id]);const current=(await tx.query('SELECT * FROM automation_occurrences WHERE id=$1 FOR UPDATE',[o.id])).rows[0];if(current.completion_dispatched_at)return false;
  await tx.query('SAVEPOINT test_report');try{
   const d=adapter(tx),a:Actor=runnerActor(o),state=await definition(d,a,o.workspace_id,'research',o.monitor_id,o.monitor_version);
   await queueTestEmail(d,a,o.workspace_id,{kind:'research',automationId:o.monitor_id,version:o.monitor_version,sourceRunId:o.run_id},state.row.app_id,'test-report:'+o.id,state.email,{subject:state.row.config.name,text:o.result.summary+'\n\nSources:\n'+(o.result.sources??[]).map((s:any)=>s.title+' — '+s.url).join('\n')});
   await tx.query('UPDATE automation_occurrences SET completion_dispatched_at=now() WHERE id=$1',[o.id]);await tx.query('RELEASE SAVEPOINT test_report');
  }catch(e:any){await tx.query('ROLLBACK TO SAVEPOINT test_report');await tx.query("UPDATE automation_occurrences SET completion_dispatched_at=now(),result=result||$2::jsonb WHERE id=$1",[o.id,JSON.stringify({deliveryStatus:'blocked',deliveryNote:'Test report could not be queued; research results are retained.'})]);}
  return true;
 }));
}
