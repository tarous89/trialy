import {randomUUID} from 'node:crypto';
import type {Database,Connection} from '../db/database.js';
import {withActor} from '../db/context.js';
import {AppMonitoring} from '../app-services/monitoring.js';
import {AppActions,recordDue} from '../app-services/service.js';
import {matches} from '../app-services/schema.js';
import {monitoringConfig} from '../app-services/monitoring-schema.js';
import {localDay} from '../shared/schedules.js';
import {adapter,signalWork,automationsEnabled,activeSubscription} from './service.js';
import {dailyDue,nextCalendar} from './schedules.js';
const J=JSON.stringify;
async function occurrence(tx:Connection,d:any,key:string,reason:string,due:Date,input:any,config?:any){
 const id=randomUUID(),r=(await tx.query(`INSERT INTO automation_occurrences(id,workspace_id,user_id,runner_id,monitor_id,monitor_version,occurrence_key,reason,due_at,input,completion_action_id,completion_action_version)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(runner_id,occurrence_key) DO NOTHING RETURNING id`,[id,d.workspace_id,d.user_id,d.runner_id??d.id,d.monitor_id??null,d.monitor_version??null,key,reason,due,J(input),config?.automation?.completionActionId??null,config?.automation?.completionActionVersion??null])).rows[0];
 if(r)await signalWork(tx,d,'due:'+Math.floor(Date.now()/30000),'work_due');return r?.id;
}
export async function dispatchDaily(db:Database,now=new Date()){
 const candidate=(await db.query('SELECT id,user_id,workspace_id FROM automation_runners WHERE enabled AND next_daily_at<=$1 ORDER BY next_daily_at,id LIMIT 1',[now])).rows[0];if(!candidate)return false;
 return withActor({userId:candidate.user_id,origin:'ai'},()=>db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[candidate.workspace_id]);const r=(await tx.query('SELECT * FROM automation_runners WHERE id=$1 AND enabled AND next_daily_at<=$2 FOR UPDATE',[candidate.id,now])).rows[0];if(!r)return false;
  const day=localDay(now,r.preferences.timeZone),hasWork=(await tx.query("SELECT id FROM automation_occurrences WHERE runner_id=$1 AND status IN ('queued','running') AND due_at<=$2 LIMIT 1",[r.id,now])).rows.length;
  if(r.preferences.emptyChecks||hasWork)await occurrence(tx,r,'daily:'+day,'daily_check',now,{localDate:day});
  await tx.query('UPDATE automation_runners SET next_daily_at=$2 WHERE id=$1',[r.id,dailyDue(r.preferences.time,r.preferences.timeZone,now)]);return true;
 }));
}
export async function dispatchDue(db:Database,now=new Date()){
 const candidate=(await db.query(`SELECT d.monitor_id,d.user_id,d.workspace_id FROM automation_dispatch d JOIN automation_runners r ON r.id=d.runner_id
 WHERE r.enabled AND d.next_at<=$1 AND (d.retry_at IS NULL OR d.retry_at<=$1) ORDER BY d.next_at,d.monitor_id LIMIT 1`,[now])).rows[0];if(!candidate)return false;
 return withActor({userId:candidate.user_id,origin:'ai'},()=>db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[candidate.workspace_id]);const d=(await tx.query('SELECT * FROM automation_dispatch WHERE monitor_id=$1 AND next_at<=$2 FOR UPDATE',[candidate.monitor_id,now])).rows[0];if(!d)return false;
  await tx.query('SAVEPOINT optional_dispatch');
  try{
   const a={userId:d.user_id,origin:'ai' as const},m=new AppMonitoring(adapter(tx)),row=await m.row(a,d.workspace_id,d.monitor_id),c=monitoringConfig.parse(row.config);
   if(!row.enabled||!c.automation||row.version!==d.monitor_version)throw Error('disabled_or_changed');
   const checked=await m.validate(a,d.workspace_id,c);if(checked.stamp!==row.scope_stamp)throw Error('scope_changed');
   const pending=Number((await tx.query("SELECT count(*) AS n FROM automation_occurrences WHERE monitor_id=$1 AND status IN ('queued','running','partial','blocked')",[d.monitor_id])).rows[0].n),capacity=Math.max(0,100-pending);if(!capacity){await tx.query("UPDATE automation_dispatch SET retry_at=$2,diagnostic='queue_capacity' WHERE monitor_id=$1",[d.monitor_id,new Date(now.getTime()+60000)]);await tx.query('RELEASE SAVEPOINT optional_dispatch');return true;}
   const t=c.automation.trigger,coverageFrom=row.coverage_through??new Date(now.getTime()-c.automation.initialLookbackDays*86400000).toISOString();let next:Date|null=null,cursor=d.event_cursor,scan=d.scan_cursor;
   if(t.kind==='database'){
    const events=(await tx.query('SELECT e.*,r.type_id FROM audit_events e LEFT JOIN records r ON r.id=e.object_id WHERE e.workspace_id=$1 AND e.event_sequence>$2 ORDER BY e.event_sequence LIMIT $3',[d.workspace_id,cursor,capacity])).rows;
    for(const e of events){cursor=e.event_sequence;if(e.type_id!==t.typeId||e.source_run_id)continue;const kind=e.action==='record.created'?'created':['record.deleted','record.archived','record.creation_archived'].includes(e.action)?'deleted':e.action.startsWith('record.')?'updated':null;if(!kind||!t.events.includes(kind))continue;
     const before=e.before_value?.data??{},after=e.after_value?.data??{};if(t.fields.length&&!t.fields.some(f=>J(before[f])!==J(after[f])))continue;if(t.becomes&&(!matches(after,[t.becomes])||matches(before,[t.becomes])))continue;
     await occurrence(tx,d,`${d.monitor_id}:${d.monitor_version}:event:${e.event_sequence}`,'database_trigger',new Date(e.created_at),{recordId:e.object_id,eventSequence:e.event_sequence,event:kind,coverageFrom,coverageThrough:now.toISOString()},c);
    }next=new Date(now.getTime()+30000);
   }else if(t.kind==='record_date'){
    const rows=(await tx.query("SELECT id,data FROM records WHERE workspace_id=$1 AND type_id=$2 AND state<>'archived' AND ($3::uuid IS NULL OR id>$3) ORDER BY id LIMIT $4",[d.workspace_id,t.typeId,scan,capacity])).rows;
    for(const r of rows){const due=recordDue(r.data[t.field],t);if(due&&due<=now&&due>=new Date(d.activated_at))await occurrence(tx,d,`${d.monitor_id}:${d.monitor_version}:date:${r.id}:${due.toISOString()}`,'scheduled_due',due,{recordId:r.id,coverageFrom,coverageThrough:now.toISOString()},c);}
    scan=rows.length===capacity?rows.at(-1)!.id:null;next=new Date(now.getTime()+(scan?1000:30000));
   }else{
    const due=new Date(d.next_at);await occurrence(tx,d,`${d.monitor_id}:${d.monitor_version}:time:${due.toISOString()}`,'scheduled_due',due,{coverageFrom,coverageThrough:c.automation.catchUp==='replay'?due.toISOString():now.toISOString(),catchUp:c.automation.catchUp},c);
    if(t.kind==='calendar')next=nextCalendar(t,c.automation.catchUp==='coalesce'?now:due);
   }
   await tx.query('UPDATE automation_dispatch SET next_at=$2,event_cursor=$3,scan_cursor=$4,diagnostic=NULL,retry_at=NULL WHERE monitor_id=$1',[d.monitor_id,next,cursor,scan]);await tx.query('RELEASE SAVEPOINT optional_dispatch');
  }catch{await tx.query('ROLLBACK TO SAVEPOINT optional_dispatch');await tx.query("UPDATE automation_dispatch SET diagnostic='authorization_or_schedule_unavailable',retry_at=$2 WHERE monitor_id=$1",[d.monitor_id,new Date(now.getTime()+3600000)]);}
  return true;
 }));
}
export async function recoverWork(db:Database,now=new Date()){
 const rows=(await db.query("SELECT id,user_id,workspace_id FROM automation_occurrences WHERE status='running' AND lease_until<=$1 ORDER BY lease_until LIMIT 10",[now])).rows;
 for(const row of rows)await withActor({userId:row.user_id,origin:'ai'},()=>db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[row.workspace_id]);const o=(await tx.query("SELECT * FROM automation_occurrences WHERE id=$1 AND status='running' AND lease_until<=$2 FOR UPDATE",[row.id,now])).rows[0];if(!o)return;
  if(o.run_id)await tx.query("UPDATE app_monitor_runs SET status='failed',finished_at=now(),result=$2 WHERE id=$1 AND status='running'",[o.run_id,J({summary:'Execution deadline passed. Saved receipts are retained; coverage is unchanged.'})]);
  await tx.query("UPDATE automation_occurrences SET status=$2,available_at=$3,result=$4 WHERE id=$1",[o.id,o.attempts<o.retry_limit?'queued':'blocked',new Date(now.getTime()+15*60000),J({summary:'Execution interrupted; reconcile previous receipts before continuing.'})]);
  if(o.attempts<o.retry_limit)await signalWork(tx,o,`recovery:${o.id}:${o.attempts}`,'continuation');
 }));
 // Only one watchdog wake per runner/time bucket, with a daily bound. It never assumes delivery means execution.
 const stale=(await db.query(`SELECT r.* FROM automation_runners r WHERE r.enabled AND EXISTS(SELECT 1 FROM automation_occurrences o WHERE o.runner_id=r.id AND o.status='queued' AND o.available_at<=$1 AND o.due_at<=$2)
 AND NOT EXISTS(SELECT 1 FROM automation_occurrences o WHERE o.runner_id=r.id AND o.status='running') ORDER BY r.id LIMIT 10`,[now,new Date(now.getTime()-30*60000)])).rows;
 for(const r of stale){const count=Number((await db.query("SELECT count(*) AS n FROM automation_outbox WHERE runner_id=$1 AND reason='continuation' AND created_at>now()-interval '24 hours'",[r.id])).rows[0].n);if(count<8)await signalWork(db,r,'watchdog:'+Math.floor(now.getTime()/3600000),'continuation');}
 return rows.length>0;
}
export async function dispatchCompletions(db:Database){
 const o=(await db.query("SELECT * FROM automation_occurrences WHERE status='completed' AND completion_action_id IS NOT NULL AND completion_dispatched_at IS NULL ORDER BY finished_at LIMIT 1")).rows[0];if(!o)return false;
 return withActor({userId:o.user_id,origin:'ai'},()=>db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[o.workspace_id]);const current=(await tx.query('SELECT * FROM automation_occurrences WHERE id=$1 FOR UPDATE',[o.id])).rows[0];if(current.completion_dispatched_at)return false;
  await tx.query('SAVEPOINT completion_dispatch');try{
   const db=adapter(tx),a={userId:o.user_id,origin:'ai' as const},monitor=await new AppMonitoring(db).row(a,o.workspace_id,o.monitor_id),r=(await tx.query('SELECT enabled FROM automation_runners WHERE id=$1',[o.runner_id])).rows[0];
   if(!r?.enabled||!monitor.enabled||monitor.version!==o.monitor_version)throw Error('paused_or_changed');
   const actions=new AppActions(db),action=await actions.row(a,o.workspace_id,o.completion_action_id);if(action.version!==o.completion_action_version)throw Error('action_changed');
   const run=await actions.enqueue(a,o.workspace_id,action.id,'automation:'+o.id);await tx.query('UPDATE app_action_runs SET results=$2 WHERE id=$1 AND step=0 AND status=$3',[run.id,J({research:{summary:o.result.summary,sources:o.result.sources??[],receiptIds:o.result.receiptIds??[]}}),'queued']);
   await tx.query('UPDATE automation_occurrences SET completion_dispatched_at=now() WHERE id=$1',[o.id]);await tx.query('RELEASE SAVEPOINT completion_dispatch');
  }catch{await tx.query('ROLLBACK TO SAVEPOINT completion_dispatch');await tx.query("UPDATE automation_occurrences SET completion_dispatched_at=now(),result=result||$2::jsonb WHERE id=$1",[o.id,J({deliveryStatus:'blocked',deliveryNote:'Follow-up action needs owner review; research and saved data are retained.'})]);}
  return true;
 }));
}
export async function isolatedAutomationStep(fn:()=>Promise<unknown>,report:(code:string)=>void=()=>{}){try{return await fn();}catch{report('automation_background_unavailable');return false;}}
export async function automationTick(db:Database,report?:(code:string)=>void){if(!automationsEnabled())return;for(const task of [dispatchDue,dispatchDaily,recoverWork,dispatchCompletions])await isolatedAutomationStep(()=>task(db),report);}
