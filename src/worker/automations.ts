import { randomUUID } from 'node:crypto';
import type { Database } from '../db/database.js';
import { access } from '../domain/permissions.js';
import { audit,Service } from '../domain/service.js';
export async function runAutomation(db:Database):Promise<boolean>{return db.transaction(async tx=>{
 const rule=(await tx.query('SELECT * FROM automations WHERE paused=false AND next_run<=now() ORDER BY next_run FOR UPDATE SKIP LOCKED LIMIT 1')).rows[0];if(!rule)return false;
 await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[rule.workspace_id]);
 const actor={userId:rule.owner_id,origin:'worker' as const};let p:any;let reason='';
 try{p=await access(tx,actor,rule.workspace_id,true);}catch{reason='permission_unavailable';}
 const grant=(await tx.query('SELECT * FROM action_grants WHERE id=$1 FOR UPDATE',[rule.grant_id])).rows[0];
 if(!grant||grant.revoked_at||grant.used_at||grant.user_id!==rule.owner_id||grant.workspace_id!==rule.workspace_id||grant.action!=='reports.prepare'||grant.destination!==rule.workspace_id)reason='permission_unavailable';
 const id=randomUUID();let summary:any={reason};let due:any;
 if(!reason&&rule.conditions){try{const scoped:Database={query:(q,v)=>tx.query(q,v),transaction:fn=>fn(tx),close:async()=>{}};const service=new Service(scoped),c=rule.conditions;const until=new Date(Date.now()+c.daysAhead*86400000).toISOString().slice(0,10);due={count:(await service.aggregate(actor,rule.workspace_id,c.typeId,{dateField:c.dateField,viewId:c.viewId,dueBefore:until})).totals.count,through:until,typeId:c.typeId,dateField:c.dateField};}catch{reason='permission_unavailable';}}

 if(reason)summary={reason};
 if(!reason){
  const tables=(await tx.query('SELECT t.id,t.name,count(r.id)::int AS records FROM entity_types t LEFT JOIN records r ON r.type_id=t.id AND r.workspace_id=t.workspace_id WHERE t.workspace_id=$1 GROUP BY t.id,t.name ORDER BY t.name',[rule.workspace_id])).rows.filter(t=>!p.allowed_types||p.allowed_types.includes(t.id));
  summary={title:rule.name,tables:due?undefined:tables,due,generatedAt:new Date().toISOString(),source:'Committed workspace records; no AI inference'};
  if(!grant.future)await tx.query('UPDATE action_grants SET used_at=now() WHERE id=$1',[grant.id]);
  await audit(tx,actor,p,'report.prepared',id,null,{automationId:rule.id,grantId:grant.id});
 }
 await tx.query('INSERT INTO automation_runs(id,automation_id,workspace_id,status,summary) VALUES($1,$2,$3,$4,$5)',[id,rule.id,rule.workspace_id,reason?'skipped':'completed',JSON.stringify(summary)]);
 await tx.query("UPDATE automations SET next_run=now()+interval '1 minute'*interval_minutes,paused=$2 WHERE id=$1",[rule.id,!!reason||!grant?.future]);return true;
});}
