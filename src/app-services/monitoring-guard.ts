import type {Connection} from '../db/database.js';
import {fail,type Actor} from '../shared/schema.js';
import {monitoringConfig} from './monitoring-schema.js';

// Caller holds the workspace lock. Configuration changes, disable and record saves
// use that same lock so revocation cannot race a monitoring write.
export async function monitoringRun(tx:Connection,a:Actor,w:string,runId:string,active=true){
 const run=(await tx.query('SELECT * FROM app_monitor_runs WHERE id=$1 AND workspace_id=$2 AND user_id=$3',[runId,w,a.userId])).rows[0];
 if(!run)fail(404,'not_found','Monitoring run unavailable');
 const monitor=(await tx.query('SELECT * FROM app_monitors WHERE id=$1 AND workspace_id=$2 AND user_id=$3',[run.monitor_id,w,a.userId])).rows[0];
 if(!monitor)fail(404,'not_found','Monitoring unavailable');
 const config=monitoringConfig.parse(monitor.config);
 if(active&&(!monitor.enabled||monitor.version!==run.monitor_version||run.status!=='running'||Date.parse(run.expires_at)<=Date.now()||Date.parse(config.expiresAt)<=Date.now()))fail(409,'monitoring_stopped','Monitoring changed, expired or stopped. Read its current configuration before continuing.');
 if(active&&config.automation){
  const allowed=process.env.APP_AUTOMATIONS_ENABLED!=='false'&&(await tx.query(`SELECT o.id FROM automation_occurrences o JOIN automation_runners r ON r.id=o.runner_id
   JOIN automation_subscriptions s ON s.runner_id=r.id AND s.enabled AND s.expires_at>now()
   WHERE o.run_id=$1 AND o.status='running' AND o.lease_until>now() AND r.enabled AND r.id=$2
   AND EXISTS(SELECT 1 FROM oauth_tokens t WHERE t.user_id=s.user_id AND t.family::text=s.connection_family AND t.client_id=s.client_id AND t.expires_at>$3)`,[runId,config.automation.runnerId,Date.now()])).rows.length;
  if(!allowed)fail(409,'automation_stopped','Background execution stopped; saved app data remains available');
 }
 return {run,monitor,config};
}

// Shared retries belong to one logical occurrence. Saved receipts remain immutable
// and count against its original budget across all execution attempts.
export async function monitoringReceiptRuns(tx:Connection,runId:string,shared:boolean):Promise<string[]>{
 if(!shared)return [runId];
 const rows=(await tx.query(`SELECT prior.run_id FROM automation_attempts current
 JOIN automation_attempts prior ON prior.occurrence_id=current.occurrence_id
 WHERE current.run_id=$1 AND prior.run_id IS NOT NULL`,[runId])).rows;
 return rows.length?rows.map(r=>r.run_id):[runId];
}
