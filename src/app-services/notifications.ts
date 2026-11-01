import {randomUUID} from 'node:crypto';
import type {Connection,Database} from '../db/database.js';
import {withActor} from '../db/context.js';
import {access,typeAccess,visibleFields} from '../domain/permissions.js';
import {checksum} from '../domain/evidence.js';
import {fail,type Actor} from '../shared/schema.js';
import {localDay} from '../shared/schedules.js';
import {appPublicUrl} from '../shared/public-url.js';
import {appUrl} from '../shared/app-route.js';
import {WorkspaceFoundation} from '../workspace/service.js';
import {actionConfig,expand,matches,type ActionConfig} from './schema.js';
import {enqueueServiceJob} from './jobs.js';
const J=JSON.stringify;
const adapter=(tx:Connection):Database=>({query:tx.query.bind(tx),transaction:fn=>fn(tx),close:async()=>{}});
export const notificationPolicy={settleSeconds:120,recipientMinutes:60,accountDailyLimit:15,maxItems:1000,maxPendingBatches:100} as const;
export const notificationEmail=(c:ActionConfig)=>c.steps.length===1&&c.steps[0].kind==='email';
export const notificationEmailsEnabled=()=>process.env.APP_NOTIFICATION_EMAILS_ENABLED!=='false';
const later=(seconds:number)=>new Date(Date.now()+seconds*1000);

/** Recipients are registered account members, never addresses read from app records.
 * Validate each recipient's current app AND data access. Owner approval does not
 * grant another recipient access to the author's fields or research results. */
export async function notificationRecipients(db:Database,a:Actor,w:string,c:ActionConfig,onlyEmail?:string){
 const p=await access(db,a,w),f=new WorkspaceFoundation(db),app=await f.component(db,{...a,accessToolId:c.appId},w,c.appId);
 const emails=[...new Set(c.steps.filter(s=>s.kind==='email').flatMap(s=>s.to).map(e=>e.trim().toLowerCase()))];
 const found=[];
 for(const email of emails.filter(e=>!onlyEmail||e===onlyEmail.toLowerCase())){
  const members=(await db.query("SELECT u.id,u.email FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.tenant_id=$1 AND lower(u.email)=$2 AND u.subject NOT LIKE 'public-app|%'",[p.tenant_id,email])).rows;
  if(members.length!==1)fail(403,'notification_recipient','Choose a registered team member with access to this app');
  const member=members[0],recipient:Actor={userId:member.id,origin:'human',accessToolId:c.appId};
  await withActor(recipient,async()=>{
   await f.component(db,recipient,w,c.appId);
   // Reports may contain any bound field. Require that the recipient can read
   // the same app data, including section/column restrictions, at send time.
   for(const b of app.bindings){const {type,policy}=await typeAccess(db,recipient,w,b.typeId);const fields=visibleFields(type.fields,policy,recipient);if(b.fields.some((k:string)=>!fields.some(v=>v.key===k)))fail(403,'notification_recipient_scope','Recipient cannot read this app’s notification data');}
  });
  found.push({id:member.id,email});
 }
 if(!found.length)fail(403,'notification_recipient','No approved recipient is available');return found;
}
function relevantFields(c:ActionConfig){
 const t=c.trigger,fields=new Set(c.conditions.map(q=>q.field));
 if(t.kind==='database'){for(const f of t.fields)fields.add(f);if(t.becomes)fields.add(t.becomes.field);}
 if(t.kind==='record_date')fields.add(t.field);
 for(const m of J(c.steps).matchAll(/\{\{\s*record\.([a-z][a-z0-9_]*)\s*\}\}/g))fields.add(m[1]);
 return [...fields].sort();
}
async function itemState(db:Database,a:Actor,w:string,c:ActionConfig,recordId:string|null,occurrence:string){
 if(!recordId)return {signature:'no-record',data:{}};
 const actor={...a,accessToolId:c.appId};
 return withActor(actor,async()=>{
  const r=await new WorkspaceFoundation(db).record(db,actor,w,recordId);
  if(r.type_id!==c.recordTypeId||r.state==='archived'||!matches(r.data,c.conditions))return null;
  const t=c.trigger;if(t.kind==='database'&&t.becomes&&!matches(r.data,[t.becomes]))return null;
  if(t.kind==='record_date'){
   const {recordDue}=await import('./service.js'),due=recordDue(r.data[t.field],t);
   if(!due||occurrence!==`date:${recordId}:${due.toISOString()}`)return null;
  }
  const fields=relevantFields(c);if(fields.some(k=>!r.fields.some((f:any)=>f.key===k)))fail(403,'notification_fields','Notification field access changed');
  return {signature:checksum(J(fields.map(k=>[k,r.data[k]??null]))),data:Object.fromEntries(c.fields.map(k=>[k,r.data[k]??null]))};
 });
}
export async function enqueueNotification(db:Database,a:Actor,w:string,row:any,c:ActionConfig,occurrence:string,recordId?:string,context:any={}){
 const old=(await db.query('SELECT b.id,b.status FROM app_notification_occurrences o JOIN app_notification_batches b ON b.id=o.batch_id WHERE o.action_id=$1 AND o.action_version=$2 AND o.occurrence=$3',[row.id,row.version,occurrence])).rows[0];
 if(old)return {id:old.id,status:old.status==='collecting'?'queued':old.status,replayed:true,notification:true};
 const p=await access(db,a,w);await db.query('INSERT INTO app_notification_account_locks(tenant_id) VALUES($1) ON CONFLICT DO NOTHING',[p.tenant_id]);await db.query('SELECT tenant_id FROM app_notification_account_locks WHERE tenant_id=$1 FOR UPDATE',[p.tenant_id]);
 const state=await itemState(db,a,w,c,recordId??null,occurrence);if(!state)return {id:null,status:'cancelled',diagnostic:'condition_no_longer_met'};
 let batch=(await db.query("SELECT * FROM app_notification_batches WHERE action_id=$1 AND action_version=$2 AND status='collecting' FOR UPDATE",[row.id,row.version])).rows[0];
 const key=recordId??(occurrence.startsWith('automation:')?'research':'scheduled');
 const capacity=(await db.query('SELECT trialy_security.notification_capacity($1) AS available',[p.tenant_id])).rows[0].available;
 const items=batch?Number((await db.query('SELECT count(*) AS n FROM app_notification_items WHERE batch_id=$1 AND item_key<>$2',[batch.id,key])).rows[0].n):0;
 if(items>=notificationPolicy.maxItems||!batch&&!capacity){
  await db.query("UPDATE app_actions SET paused=true,last_error='notification_backlog_review' WHERE id=$1",[row.id]);
  if(batch)await db.query("UPDATE app_notification_batches SET status='blocked',diagnostic='notification_backlog_review' WHERE id=$1",[batch.id]);
  return {id:batch?.id??null,status:'blocked',diagnostic:'notification_backlog_review'};
 }
 if(!batch){const recipients=await notificationRecipients(db,a,w,c);batch={id:randomUUID()};await db.query('INSERT INTO app_notification_batches(id,workspace_id,tenant_id,user_id,app_id,action_id,action_version,not_before,origin) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[batch.id,w,p.tenant_id,a.userId,c.appId,row.id,row.version,later(notificationPolicy.settleSeconds),a.origin]);
  for(const r of recipients)await db.query('INSERT INTO app_notification_recipients(batch_id,user_id,email) VALUES($1,$2,$3)',[batch.id,r.id,r.email]);
 }
 const previous=(await db.query('SELECT signature,context FROM app_notification_items WHERE batch_id=$1 AND item_key=$2',[batch.id,key])).rows[0];
 await db.query('INSERT INTO app_notification_items(batch_id,item_key,record_id,signature,context,occurrence) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(batch_id,item_key) DO UPDATE SET record_id=EXCLUDED.record_id,signature=EXCLUDED.signature,context=EXCLUDED.context,occurrence=EXCLUDED.occurrence',[batch.id,key,recordId??null,state.signature,J(context),occurrence]);
 if(!previous||previous.signature!==state.signature||J(previous.context)!==J(context))await db.query('UPDATE app_notification_batches SET not_before=$2 WHERE id=$1',[batch.id,later(notificationPolicy.settleSeconds)]);
 await db.query('INSERT INTO app_notification_occurrences(action_id,action_version,occurrence,batch_id) VALUES($1,$2,$3,$4)',[row.id,row.version,occurrence,batch.id]);
 return {id:batch.id,status:'queued',notification:true};
}
async function currentBatch(db:Database,b:any){
 const {AppActions}=await import('./service.js'),a:Actor={userId:b.user_id,origin:b.origin},s=new AppActions(db),row=await s.row(a,b.workspace_id,b.action_id),c=actionConfig.parse(row.config);
 if(row.paused||row.version!==b.action_version||!notificationEmail(c)||!['collecting','sending'].includes(b.status))fail(409,'notification_stopped','Notification is no longer active');
 const checked=await s.validate(a,b.workspace_id,c);if(checked.stamp!==row.scope_stamp)fail(409,'notification_scope','Notification access changed');
 const items=(await db.query('SELECT * FROM app_notification_items WHERE batch_id=$1 ORDER BY item_key',[b.id])).rows;
 const valid=[];let changed=false;
 for(const i of items){
  try{
   if(i.occurrence.startsWith('automation:')){
    const parent=(await db.query("SELECT o.id FROM automation_occurrences o JOIN automation_runners r ON r.id=o.runner_id JOIN app_monitors m ON m.id=o.monitor_id WHERE o.id=$1 AND o.status='completed' AND r.enabled AND m.enabled AND m.version=o.monitor_version AND o.completion_action_id=$2 AND o.completion_action_version=$3",[i.occurrence.slice(11),b.action_id,b.action_version])).rows[0];
    if(process.env.APP_AUTOMATIONS_ENABLED==='false'||!parent)continue;
   }
   const state=await itemState(db,a,b.workspace_id,c,i.record_id,i.occurrence);if(!state)continue;
   if(state.signature!==i.signature)changed=true;
   valid.push({...i,...state});
  }catch(e:any){if(![403,404,409].includes(e.status))throw e;}
 }
 return {a,c,row,component:checked.component,valid,changed};
}
/** All reservations are serialized across accounts, without exposing global
 * recipient activity to account users. Ambiguous provider outcomes retain quota. */
export async function reserveNotification(db:Database,tenant:string,email:string,jobId:string,attempt=false,calendar?:{actionId:string;trigger:ActionConfig['trigger']}){
 email=email.trim().toLowerCase();
 return db.transaction(async tx=>{
  await tx.query('SELECT id FROM app_notification_guard WHERE id=1 FOR UPDATE');
  const enabled=(await tx.query('SELECT enabled FROM app_notification_guard WHERE id=1')).rows[0]?.enabled;
  if(!notificationEmailsEnabled()||!enabled)return {allowed:false,nextAt:later(60),reason:'notifications_paused'};
  const limit=Number((await tx.query('SELECT daily_limit FROM app_notification_allowances WHERE tenant_id=$1',[tenant])).rows[0]?.daily_limit??notificationPolicy.accountDailyLimit);
  const recipient=(await tx.query("SELECT max(coalesce(attempted_at,reserved_at))+interval '1 hour' AS next FROM app_notification_reservations WHERE email=$1 AND job_id<>$2 AND NOT released AND coalesce(attempted_at,reserved_at)>now()-interval '1 hour'",[email,jobId])).rows[0]?.next;
  const budget=(await tx.query("SELECT count(*) AS n,min(coalesce(attempted_at,reserved_at))+interval '24 hours' AS next FROM app_notification_reservations WHERE tenant_id=$1 AND job_id<>$2 AND NOT released AND coalesce(attempted_at,reserved_at)>now()-interval '24 hours'",[tenant,jobId])).rows[0];
  let calendarNext=0;const day=calendar?.trigger.kind==='calendar'?localDay(new Date(),calendar.trigger.timeZone):null;
  if(day&&(await tx.query('SELECT job_id FROM app_notification_reservations WHERE action_id=$1 AND email=$2 AND local_day=$3 AND job_id<>$4 AND NOT released LIMIT 1',[calendar!.actionId,email,day,jobId])).rows.length){const {nextAction}=await import('./service.js');calendarNext=nextAction({trigger:calendar!.trigger} as ActionConfig)!.getTime();}
  const next=Math.max(calendarNext,recipient?Date.parse(recipient):0,Number(budget.n)>=limit?Date.parse(budget.next):0);
  if(next>Date.now())return {allowed:false,nextAt:new Date(next+1000),reason:'notification_allowance'};
  await tx.query('INSERT INTO app_notification_reservations(job_id,tenant_id,email,attempted_at,action_id,local_day) VALUES($1,$2,$3,CASE WHEN $4 THEN now() END,$5,$6) ON CONFLICT(job_id) DO UPDATE SET released=false,attempted_at=CASE WHEN $4 THEN now() ELSE app_notification_reservations.attempted_at END,local_day=EXCLUDED.local_day',[jobId,tenant,email,attempt,calendar?.actionId??null,day]);
  return {allowed:true,nextAt:new Date(),reason:'reserved'};
 });
}
export async function authorizeNotificationJob(db:Database,j:any,reading=false){
 const n=j.payload.notification,b=(await db.query('SELECT * FROM app_notification_batches WHERE id=$1',[n.batchId])).rows[0];
 if(!b||b.workspace_id!==j.workspace_id||b.user_id!==j.user_id||b.app_id!==j.app_id)fail(403,'notification_scope','Notification unavailable');
 if(reading){await access(db,{userId:j.user_id,origin:'human'},j.workspace_id);return;}
 const {c,valid,changed}=await currentBatch(db,b),recipients=await notificationRecipients(db,{userId:b.user_id,origin:b.origin},b.workspace_id,c,j.payload.message.to[0]);
 if(recipients[0].id!==n.recipientId)fail(403,'notification_recipient','Recipient changed');
 const digest=checksum(J(valid.map(i=>[i.item_key,i.signature,i.context])));
 if(changed||!valid.length||digest!==n.digest)fail(409,'notification_changed','Pending notification changed');
}
export async function dispatchNotificationBatch(db:Database){
 if(!notificationEmailsEnabled())return false;
 const candidate=(await db.query("SELECT * FROM app_notification_batches WHERE status IN ('collecting','sending') AND not_before<=now() ORDER BY created_at,id LIMIT 1")).rows[0];if(!candidate)return false;
 return withActor({userId:candidate.user_id,origin:'ai'},()=>db.transaction(async tx=>{
  // Action first, matching enqueue/approval ordering. The batch cannot change
  // between eligibility checks, freezing the payload and reserving its allowance.
  await tx.query('SELECT id FROM app_actions WHERE id=$1 FOR UPDATE',[candidate.action_id]);
  const b=(await tx.query("SELECT * FROM app_notification_batches WHERE id=$1 AND status IN ('collecting','sending') AND not_before<=now() FOR UPDATE",[candidate.id])).rows[0];if(!b)return false;
  const d=adapter(tx);let state;
  try{state=await currentBatch(d,b);}catch(e:any){if(![403,404,409].includes(e.status))throw e;await tx.query("UPDATE app_notification_batches SET status='cancelled',diagnostic='authorization_changed',finished_at=now() WHERE id=$1",[b.id]);return true;}
  const {a,c,component,valid,changed}=state;
  if(!valid.length){await tx.query("UPDATE app_notification_batches SET status='cancelled',diagnostic='condition_no_longer_met',finished_at=now() WHERE id=$1",[b.id]);return true;}
  if(changed){for(const i of valid)await tx.query('UPDATE app_notification_items SET signature=$3 WHERE batch_id=$1 AND item_key=$2',[b.id,i.item_key,i.signature]);await tx.query('UPDATE app_notification_batches SET not_before=$2 WHERE id=$1',[b.id,later(notificationPolicy.settleSeconds)]);return true;}
  const recipients=(await tx.query('SELECT * FROM app_notification_recipients WHERE batch_id=$1 ORDER BY user_id',[b.id])).rows;
  let next=later(86400),pending=false;
  for(const r of recipients){
   if(r.status==='queued'){
    const j=(await tx.query('SELECT * FROM app_service_jobs WHERE id=$1',[r.job_id])).rows[0];
    if(['queued','running'].includes(j.status)){pending=true;next=new Date(Math.min(next.getTime(),later(2).getTime()));continue;}
    if(j.diagnostic==='notification_changed'&&!(await tx.query('SELECT job_id FROM app_notification_reservations WHERE job_id=$1 AND attempted_at IS NOT NULL',[j.id])).rows.length){await tx.query("UPDATE app_notification_recipients SET status='pending',job_id=NULL WHERE batch_id=$1 AND user_id=$2",[b.id,r.user_id]);await tx.query('UPDATE app_notification_reservations SET released=true WHERE job_id=$1 AND attempted_at IS NULL',[j.id]);pending=true;next=new Date(Math.min(next.getTime(),later(120).getTime()));continue;}
    await tx.query('UPDATE app_notification_recipients SET status=$3,diagnostic=$4 WHERE batch_id=$1 AND user_id=$2',[b.id,r.user_id,['succeeded','cancelled','unknown'].includes(j.status)?j.status:'failed',j.diagnostic]);continue;
   }
   if(r.status!=='pending')continue;
   try{const current=await notificationRecipients(d,a,b.workspace_id,c,r.email);if(current[0].id!==r.user_id)throw Object.assign(Error('changed'),{status:403});}catch(e:any){if(![403,404,409].includes(e.status))throw e;await tx.query("UPDATE app_notification_recipients SET status='cancelled',diagnostic='recipient_access_changed' WHERE batch_id=$1 AND user_id=$2",[b.id,r.user_id]);continue;}
   const jobId=randomUUID(),budget=await reserveNotification(d,b.tenant_id,r.email,jobId,false,{actionId:b.action_id,trigger:c.trigger});
   if(!budget.allowed){pending=true;next=new Date(Math.min(next.getTime(),budget.nextAt.getTime()));await tx.query('UPDATE app_notification_recipients SET diagnostic=$3 WHERE batch_id=$1 AND user_id=$2',[b.id,r.user_id,budget.reason]);continue;}
   const step=c.steps[0],context={record:valid[0].data,recordId:valid[0].record_id,steps:valid[0].context},multiple=valid.length>1;
   let expanded;try{expanded=multiple?{}:expand(step,context);}catch{await tx.query("UPDATE app_notification_recipients SET status='failed',diagnostic='notification_template' WHERE batch_id=$1 AND user_id=$2",[b.id,r.user_id]);await tx.query('UPDATE app_notification_reservations SET released=true WHERE job_id=$1 AND attempted_at IS NULL',[jobId]);continue;}
   const message={to:[r.email],appName:component.name,subject:multiple?`Pending items in ${component.name}`.slice(0,200):expanded.subject,text:multiple?`You have ${valid.length} items awaiting attention in ${component.name}.\n\nOpen the app to review the current items:\n${appPublicUrl()}${appUrl({workspaceId:b.workspace_id,appId:b.app_id})}`:expanded.text};
   const payload={origin:b.origin,action:{runId:b.id,version:b.action_version},notification:{batchId:b.id,recipientId:r.user_id,digest:checksum(J(valid.map(i=>[i.item_key,i.signature,i.context])))},message};
   let job;try{job=await enqueueServiceJob(d,a,b.workspace_id,b.app_id,'email','notification:'+jobId,payload,23*3600,jobId);}catch(e:any){if(![413,429].includes(e.status))throw e;await tx.query('UPDATE app_notification_reservations SET released=true WHERE job_id=$1 AND attempted_at IS NULL',[jobId]);if(e.status===429){pending=true;next=new Date(Math.min(next.getTime(),later(3600).getTime()));}else await tx.query("UPDATE app_notification_recipients SET status='failed',diagnostic='notification_size' WHERE batch_id=$1 AND user_id=$2",[b.id,r.user_id]);continue;}
   await tx.query("UPDATE app_notification_recipients SET status='queued',job_id=$3,diagnostic=NULL WHERE batch_id=$1 AND user_id=$2",[b.id,r.user_id,job.id]);
   await tx.query("UPDATE app_notification_batches SET status='sending' WHERE id=$1",[b.id]);pending=true;next=new Date(Math.min(next.getTime(),later(2).getTime()));
  }
  const remaining=(await tx.query("SELECT status FROM app_notification_recipients WHERE batch_id=$1 AND status IN ('pending','queued')",[b.id])).rows.length;
  if(!remaining){const outcomes=(await tx.query('SELECT status FROM app_notification_recipients WHERE batch_id=$1',[b.id])).rows.map(r=>r.status);await tx.query('UPDATE app_notification_batches SET status=$2,finished_at=now() WHERE id=$1',[b.id,outcomes.some(s=>['failed','unknown'].includes(s))?'failed':outcomes.includes('succeeded')?'succeeded':'cancelled']);}
  else await tx.query('UPDATE app_notification_batches SET not_before=$2,diagnostic=$3 WHERE id=$1',[b.id,next,pending?'waiting_for_delivery':null]);
  return true;
 }));
}
