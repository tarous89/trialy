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
 return {run,monitor,config};
}
