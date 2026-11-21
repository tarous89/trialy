import type {Database} from '../db/database.js';
import {fail,ASSISTANT_NAMES,type Actor} from '../shared/schema.js';
import {access} from '../domain/permissions.js';
import {audit} from '../domain/evidence.js';
import {requireCurrentAction} from '../domain/write-authorization.js';
import {requireAutomationManager,requireLinkedOwner} from './app-owners.js';
import {schedule as scheduleSchema,type AutomationSchedule} from './schema.js';
import {adapter,syncDispatch} from './service.js';
import {ownedBy} from './ownership.js';
import {monitoringConfig} from '../app-services/monitoring-schema.js';

/**
 * Session 6, package 6.6 (T7): retire legacy monitoring, one monitor at a time.
 * A legacy monitor has no TrialAgents schedule (config.automation) and was run by a per-app host task.
 * The migration proposes a structured schedule from its saved description, shows a verification report
 * (schedule, recipients, where it writes, last completed run) and, once confirmed, moves it onto the
 * shared runner. From then on the legacy start is fenced off (start refuses a monitor with a TrialAgents
 * schedule). A paused monitor stays paused. The platform cannot stop the host task: the report says so.
 */
const WEEKDAYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
export function proposeSchedule(description:string,timeZone:string,today=new Date()):AutomationSchedule{
 const text=description.toLowerCase(),anchor=today.toISOString().slice(0,10);
 const clock=text.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/),ampm=text.match(/\b(1[0-2]|0?[1-9])\s*(am|pm)\b/);
 const hour=clock?Number(clock[1]):ampm?(Number(ampm[1])%12)+(ampm[2]==='pm'?12:0):9,minute=clock?Number(clock[2]):0;
 const time=`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
 const days=WEEKDAYS.map((d,i)=>text.includes(d)||text.includes(d.slice(0,3)+' ')?i:-1).filter(i=>i>=0);
 const base={kind:'calendar' as const,time,timeZone,anchor};
 if(/\b(daily|every day|each day|weekday|business day)/.test(text))return scheduleSchema.parse({...base,frequency:'daily',...(/weekday|business day/.test(text)?{frequency:'weekly',weekdays:[1,2,3,4,5]}:{})}) as AutomationSchedule;
 if(/\bmonth/.test(text)){const day=text.match(/\b([12]?\d|3[01])(st|nd|rd|th)\b/);return scheduleSchema.parse({...base,frequency:'monthly',monthDay:day?Number(day[1]):1}) as AutomationSchedule;}
 return scheduleSchema.parse({...base,frequency:'weekly',weekdays:days.length?days:[1]}) as AutomationSchedule;
}

export async function legacyMonitors(db:Database,a:Actor,w:string){
 await requireAutomationManager(db,a,w,null,false);
 const rows=(await db.query(`SELECT m.id,m.app_id,m.version,m.enabled,m.config,m.task,m.coverage_through,m.assistant,m.user_id,u.name AS linked_name,c.name AS app_name FROM app_monitors m JOIN workspace_components c ON c.id=m.app_id LEFT JOIN users u ON u.id=m.user_id
  WHERE m.workspace_id=$1 AND m.deleted_at IS NULL AND m.archived_at IS NULL AND m.config->'automation' IS NULL ORDER BY m.created_at,m.id LIMIT 100`,[w])).rows;
 const out=[];for(const r of rows){try{await requireAutomationManager(db,a,w,r.app_id,false);}catch{continue;}out.push(await report(db,w,r));}
 return {rows:out};
}
async function report(db:Database,w:string,r:any){
 const last=(await db.query("SELECT id,finished_at,result->'coverage'->>'through' AS through FROM app_monitor_runs WHERE monitor_id=$1 AND status IN ('completed','no_update') ORDER BY finished_at DESC NULLS LAST LIMIT 1",[r.id])).rows[0]??null;
 const recipients=(await db.query("SELECT config->'steps' AS steps FROM app_actions WHERE follow_up_of=$1 AND deleted_at IS NULL",[r.id])).rows.flatMap((x:any)=>(x.steps??[]).flatMap((s:any)=>s.to??[]));
 const description=String(r.config?.schedule?.description??''),timeZone=String(r.config?.schedule?.timeZone??'UTC');
 let proposed:AutomationSchedule|null=null;try{proposed=proposeSchedule(description,timeZone);}catch{proposed=null;}
 return {id:r.id,appId:r.app_id,appName:r.app_name,name:r.config?.name??'Research',version:r.version,enabled:r.enabled,linkedOwner:{id:r.user_id,name:r.linked_name??null},
  assistant:ownedBy(r)??'chatgpt',hostTask:r.task?{id:r.task.id??null,schedule:r.task.schedule??null}:null,
  verification:{schedule:{description,timeZone,proposed},recipients,writeTables:(r.config?.writeScopes??[]).length?'Saves results in the app (approved write permission)':r.config?.storeResults?'Saves results in the app (needs setting up again)':'Reads only',
   lastCompletedRun:last?{id:last.id,finishedAt:last.finished_at,coverageThrough:last.through??r.coverage_through??null}:null},
  afterMigration:r.enabled?'Stays on if your connection is ready; otherwise it is switched off with the reason.':'Stays switched off.',
  hostTaskNote:r.task?'TrialAgents cannot pause the task in the assistant. Pause or delete it there after the move; from now on it can no longer start runs.':null};
}

export async function migrateLegacyMonitor(db:Database,a:Actor,w:string,input:{monitorId:string;expectedVersion:number;trigger?:unknown}){requireCurrentAction(a);return db.transaction(async tx=>{
 await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);
 const row=(await tx.query('SELECT m.*,u.name AS linked_name,c.name AS app_name FROM app_monitors m JOIN workspace_components c ON c.id=m.app_id LEFT JOIN users u ON u.id=m.user_id WHERE m.id=$1 AND m.workspace_id=$2 AND m.deleted_at IS NULL FOR UPDATE OF m',[input.monitorId,w])).rows[0];
 if(!row)fail(404,'not_found','Monitor unavailable');
 await requireAutomationManager(tx,a,w,row.app_id);requireLinkedOwner(a,row,row.linked_name);
 if(row.config?.automation)fail(409,'already_migrated','This monitor already runs on the TrialAgents schedule');
 if(row.version!==input.expectedVersion)fail(409,'monitoring_changed','Reload this monitor before moving it');
 const before=await report(adapter(tx),w,row),assistant=ownedBy(row)??'chatgpt';
 const trigger=input.trigger?scheduleSchema.parse(input.trigger):before.verification.schedule.proposed;
 if(!trigger)fail(400,'schedule_required','Choose when this research should run');
 const runner=(await tx.query('SELECT id,enabled,verified_at FROM automation_runners WHERE workspace_id=$1 AND user_id=$2 AND assistant=$3',[w,a.userId,assistant])).rows[0];
 if(!runner)fail(409,'runner_not_ready',`Connect ${ASSISTANT_NAMES[assistant]} for background research first (read_automation_setup), then move this monitor.`);
 const config=monitoringConfig.parse({...row.config,automation:{runnerId:runner.id,trigger,initialLookbackDays:7,catchUp:'coalesce'}});
 const ready=runner.enabled&&!!runner.verified_at,on=row.enabled&&ready,coverage=before.verification.lastCompletedRun?.coverageThrough??row.coverage_through??null;
 // The host task can no longer start runs: legacy start refuses a monitor with a TrialAgents schedule.
 await tx.query('UPDATE app_monitors SET config=$2,version=version+1,task=NULL,coverage_through=$3,enabled=$4,off_reason=$5,updated_at=now() WHERE id=$1',[row.id,JSON.stringify(config),coverage,on,row.enabled&&!on?`Switched off after moving to the TrialAgents schedule: connect ${ASSISTANT_NAMES[assistant]} and switch it on.`:null]);
 await tx.query("UPDATE app_monitor_runs SET status='cancelled',finished_at=now() WHERE monitor_id=$1 AND status='running'",[row.id]);
 await syncDispatch(tx,a,w,row.id,row.version+1,config);
 const p=await access(tx,a,w,true);
 await audit(tx,a,p,'monitoring.legacy_migrated',row.id,{schedule:row.config?.schedule??null,task:row.task?{id:row.task.id??null}:null},{trigger,enabled:on,report:before.verification});
 return {id:row.id,version:row.version+1,enabled:on,trigger,report:before.verification,hostTaskNote:before.hostTaskNote};
});}
