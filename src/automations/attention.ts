import {randomUUID} from 'node:crypto';
import type {Connection} from '../db/database.js';

/**
 * Session 6, package 6.3 (T3, T2, U2). One classifier for every automation failure.
 * - temporary: retried on the same run at 5, 15 and 60 minutes; the automation stays on and later runs continue.
 * - permission / connection / setup: runs stop and the automation shows "Needs attention" with the cause,
 *   until a later check passes. The owners of the app get one alert for it.
 */
export type FailureKind='temporary'|'permission'|'connection'|'setup';
export type Failure={kind:FailureKind;cause:string;code:string};
/** Minutes before retry 1, 2 and 3 of the same run (T3). */
export const RETRY_MINUTES=[5,15,60] as const;
export const retryDelayMinutes=(failures:number)=>RETRY_MINUTES[Math.min(Math.max(failures,1),RETRY_MINUTES.length)-1];
export const retryAt=(failures:number,now=new Date())=>new Date(now.getTime()+retryDelayMinutes(failures)*60000);

const PERMISSION=/^(owner_required|app_owner_required|forbidden|monitoring_fields|monitoring_write_scope|brief_scope|assistant_[a-z_]+|data_level[a-z_]*|apps_level[a-z_]*|column_permissions_retired|role_read_only|recipient_[a-z_]+|access_[a-z_]+|not_found|tool_unavailable)$/;
const CONNECTION=/^(runner_[a-z_]+|run_source_connection|awaiting_[a-z_]+_connection|connector_[a-z_]+|credential_[a-z_]+|connection_[a-z_]+|subscription_[a-z_]+)$/;
const SETUP=/^(disabled_or_changed|scope_changed|schema_changed|action_scope_changed|monitoring_expired|automation_expired|action_expired|result_storage_required|completion_link_changed|app_archived|monitoring_changed|automation_changed|invalid_calendar|setup_required)$/;

/** T5 (6.4): what the running assistant's Data level means for an automation. */
const CAUSES:Record<string,Failure>={
 assistant_data_blocked:{kind:'permission',code:'assistant_data_blocked',cause:'The assistant it runs on is Blocked for data in this organization, so it cannot run.'},
 assistant_data_view:{kind:'permission',code:'assistant_data_view',cause:'The assistant it runs on is View only for data, so it cannot save its results. Raise the level to Edit or remove the write.'},
 write_setup_required:{kind:'setup',code:'write_setup_required',cause:'Set up again: it was saved to ask for review of each change, which no longer exists. Save it again to write directly.'}
};
export function classifyFailure(e:unknown):Failure{
 const err=e as any,code=String(err?.code??err?.message??'unknown').slice(0,80),status=Number(err?.status??0);
 if(CAUSES[code])return CAUSES[code];
 if(status===429||/^(waiting_for_allowance|rate_limited|queue_capacity|timeout|version_moved|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN)$/.test(code))return {kind:'temporary',code,cause:'A temporary problem. It is retried automatically.'};
 if(CONNECTION.test(code))return {kind:'connection',code,cause:'The connection this automation runs on is not ready. Reconnect it, then the automation continues.'};
 if(SETUP.test(code))return {kind:'setup',code,cause:code==='monitoring_expired'||code==='automation_expired'||code==='action_expired'?'Its end date has passed. Set a new end date or archive it.':'Its tables, fields or settings changed. Open it, review and save it again.'};
 if(status===401||status===403||PERMISSION.test(code))return {kind:'permission',code,cause:'The person it runs as no longer has the access it needs. Restore their access or move it to an owner who has it.'};
 if(status===404||status===409||status===400)return {kind:'setup',code,cause:status===404?'Something it uses is no longer available. Open it, review and save it again.':'Its tables, fields or settings changed. Open it, review and save it again.'};
 return {kind:'temporary',code,cause:'A temporary problem. It is retried automatically.'};
}

/** Records Needs attention once per cause and raises one alert for the owners of the app. Returns true when this is new. */
export async function needsAttention(tx:Connection,row:{id:string;workspace_id:string;app_id:string;needs_attention_cause?:string|null},kind:'research'|'action',failure:Failure){
 const table=kind==='research'?'app_monitors':'app_actions';
 if(row.needs_attention_cause===failure.cause)return false;
 await tx.query(`UPDATE ${table} SET needs_attention_cause=$2,needs_attention_at=now() WHERE id=$1`,[row.id,failure.cause]);
 await alertOnce(tx,row,kind,'attention:'+failure.code,'needs_attention',failure.cause);
 return true;
}
export async function clearAttention(tx:Connection,id:string,kind:'research'|'action'){
 const table=kind==='research'?'app_monitors':'app_actions';
 await tx.query(`UPDATE ${table} SET needs_attention_cause=NULL,needs_attention_at=NULL WHERE id=$1 AND needs_attention_cause IS NOT NULL`,[id]);
}
/** One alert per run: the key is the run (or the cause), so retries and later checks never alert again. */
export async function alertOnce(tx:Connection,row:{id:string;workspace_id:string;app_id:string},kind:'research'|'action',key:string,alert:'failed'|'needs_attention',cause:string){
 const r=await tx.query('INSERT INTO automation_alerts(id,workspace_id,app_id,automation_id,automation_kind,alert_key,kind,cause) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(automation_id,alert_key) DO NOTHING RETURNING id',[randomUUID(),row.workspace_id,row.app_id,row.id,kind,key.slice(0,200),alert,cause.slice(0,500)]);
 return r.rows.length>0;
}
/** D30: the organization's minimum interval for recurring research, in minutes. */
export async function minimumInterval(tx:Connection,workspaceId:string){
 return Number((await tx.query('SELECT t.automation_min_interval_minutes AS n FROM workspaces w JOIN tenants t ON t.id=w.tenant_id WHERE w.id=$1',[workspaceId])).rows[0]?.n??60);
}
