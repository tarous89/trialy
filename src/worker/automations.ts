import {nextDaily,localDay} from '../shared/schedules.js';
import { randomUUID } from 'node:crypto';
import type { Database } from '../db/database.js';
import { access } from '../domain/permissions.js';
import { audit,Service } from '../domain/service.js';
export async function runAutomation(db:Database):Promise<boolean>{return db.transaction(async tx=>{
 const rule=(await tx.query('SELECT * FROM automations WHERE paused=false AND next_run<=now() ORDER BY next_run FOR UPDATE SKIP LOCKED LIMIT 1')).rows[0];if(!rule)return false;
 await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[rule.workspace_id]);
 let eventIds:string[]=[];
 if(rule.schedule&&rule.schedule.kind!=='daily'){
  const action=rule.schedule.kind==='records.changed'?'record.':'document.saved';
  const events=(await tx.query('SELECT id,event_sequence FROM audit_events WHERE workspace_id=$1 AND event_sequence>$2 AND origin<>\'worker\' AND strpos(action,$3)=1 ORDER BY event_sequence LIMIT 200',[rule.workspace_id,rule.event_cursor,action])).rows;
  if(!events.length){await tx.query("UPDATE automations SET next_run=now()+interval '30 seconds' WHERE id=$1",[rule.id]);return true;}
  eventIds=events.map(e=>e.id);rule.event_cursor=events[events.length-1].event_sequence;
 }
 const actor={userId:rule.owner_id,origin:'worker' as const};let p:any;let reason='';
 try{p=await access(tx,actor,rule.workspace_id,true);}catch{reason='permission_unavailable';}
 if((rule.action||(rule.schedule&&rule.schedule.kind!=='daily'))&&p?.role!=='owner')reason='permission_unavailable';
 const grant=(await tx.query('SELECT * FROM action_grants WHERE id=$1 FOR UPDATE',[rule.grant_id])).rows[0];
 if(!grant||grant.revoked_at||grant.used_at||grant.user_id!==rule.owner_id||grant.workspace_id!==rule.workspace_id||grant.action!==(rule.action?.kind==='create_record'?'records.create':rule.action?.kind==='remind_me'?'reminders.create':'reports.prepare')||grant.destination!==(rule.action?.kind==='create_record'?rule.action.typeId:rule.workspace_id))reason='permission_unavailable';
 // Legacy grants are not upgraded into the new write authorization contract.
 if(rule.action?.kind==='create_record')reason='permission_unavailable';
 const id=randomUUID();let summary:any={reason};let due:any;
 if(!reason&&rule.conditions){try{const scoped:Database={query:(q,v)=>tx.query(q,v),transaction:fn=>fn(tx),close:async()=>{}};const service=new Service(scoped),c=rule.conditions;const today=localDay(new Date(),rule.schedule?.timeZone??'UTC');const until=new Date(Date.parse(today+'T00:00:00Z')+c.daysAhead*86400000).toISOString().slice(0,10);due={count:(await service.aggregate(actor,rule.workspace_id,c.typeId,{dateField:c.dateField,viewId:c.viewId,dueBefore:until})).totals.count,through:until,typeId:c.typeId,dateField:c.dateField};}catch{reason='permission_unavailable';}}

 if(!reason&&rule.action&&due&&due.count===0)reason='condition_not_met';
 if(reason)summary={title:rule.name,reason};
 if(!reason){
  const tables=(await tx.query('SELECT t.id,t.name,count(r.id)::int AS records FROM entity_types t LEFT JOIN records r ON r.type_id=t.id AND r.workspace_id=t.workspace_id WHERE t.workspace_id=$1 GROUP BY t.id,t.name ORDER BY t.name',[rule.workspace_id])).rows.filter(t=>!p.allowed_types||p.allowed_types.includes(t.id));
  summary={title:rule.name,eventIds,tables:due?undefined:tables,due,generatedAt:new Date().toISOString(),source:'Committed workspace records; no AI inference'};
  if(rule.action?.kind==='create_record'){await tx.query('SAVEPOINT automation_action');try{const scoped:Database={query:(q,v)=>tx.query(q,v),transaction:fn=>fn(tx),close:async()=>{}};const service=new Service(scoped);const preview=await service.preview(actor,rule.workspace_id,rule.action);const saved=await service.commit(actor,preview.id,preview.digest);summary={title:rule.name,eventIds,created:saved.objects,source:'Explicitly authorised draft record creation'};await tx.query('RELEASE SAVEPOINT automation_action');}catch{await tx.query('ROLLBACK TO SAVEPOINT automation_action');reason='action_failed';summary={title:rule.name,reason};}}
  if(!reason){if(!grant.future)await tx.query('UPDATE action_grants SET used_at=now() WHERE id=$1',[grant.id]);await audit(tx,actor,p,rule.action?.kind==='create_record'?'automation.record_created':rule.action?.kind==='remind_me'?'reminder.created':'report.prepared',id,null,{automationId:rule.id,grantId:grant.id});}
 }
 await tx.query('INSERT INTO automation_runs(id,automation_id,workspace_id,status,summary) VALUES($1,$2,$3,$4,$5)',[id,rule.id,rule.workspace_id,reason?'skipped':'completed',JSON.stringify(summary)]);
 if(!reason&&rule.action?.kind==='remind_me')await tx.query('INSERT INTO inbox_reminders(id,workspace_id,user_id,automation_id,run_id) VALUES($1,$2,$3,$4,$5)',[randomUUID(),rule.workspace_id,rule.owner_id,rule.id,id]);
 const next=rule.schedule?.kind==='daily'?nextDaily(rule.schedule,new Date()):new Date(Date.now()+(rule.schedule?30000:rule.interval_minutes*60000));await tx.query('UPDATE automations SET next_run=$2,paused=$3,event_cursor=$4 WHERE id=$1',[rule.id,next,(!!reason&&reason!=='condition_not_met')||(!reason&&!grant?.future),rule.event_cursor]);return true;
});}
