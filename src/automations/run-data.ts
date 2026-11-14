import type {Database} from '../db/database.js';
import {fail,type Actor} from '../shared/schema.js';
import type {ActionConfig} from '../app-services/schema.js';
import {AppMonitoring} from '../app-services/monitoring.js';
import {monitoringConfig} from '../app-services/monitoring-schema.js';
import {AutomationService} from './service.js';
import {completionScope,completionScopeResolution} from './completion-scope.js';

export const runFields=['id','automationId','automationVersion','status','completedAt','summary','findings','sources','savedChanges','receiptIds','recordIds','coverage'] as const;
export function meaningfulRun(result:any){return !!result?.savedChanges||!!result?.findings?.some((f:any)=>f.relevant===true);}
export function runTrigger(c:ActionConfig){return c.trigger.kind==='database'&&c.trigger.source==='automation_runs'?c.trigger:null;}

/** System run rows are read-only. Neither app record edits nor supplied template
 * context can produce a completion or expand the approved source's data access. */
export async function validateRunSource(db:Database,a:Actor,w:string,c:ActionConfig){
 const t=runTrigger(c);if(!t)return null;
 const service=new AppMonitoring(db),row=await service.row(a,w,t.automationId!);
 if(row.app_id!==c.appId||row.version!==t.automationVersion)fail(409,'run_source_changed','Select the current research automation for this app');
 const config=monitoringConfig.parse(row.config),app=await service.app(a,w,c.appId);
 if(completionScope(app.bindings,config.readBindings,[]).status==='blocked')fail(403,'run_source_scope','Research reads fields outside the linked app. Read read_app_monitoring.completionSource for the missing bindings. '+completionScopeResolution);
 let checked;try{checked=await service.validate(a,w,config);}catch(e){if(['monitoring_fields','monitoring_write_scope','field_scope','schema_changed'].includes((e as any)?.code))fail(403,'run_source_scope','Research data access no longer matches the linked app. '+completionScopeResolution);throw e;}
 if(checked.stamp!==row.scope_stamp||checked.completionSource.status!=='ready')fail(403,'run_source_scope','Research run access changed or exceeds this app. '+completionScopeResolution);
 return row;
}

export async function readRunData(db:Database,a:Actor,w:string,c:ActionConfig,occurrence:string){
 const source=await validateRunSource(db,a,w,c),t=runTrigger(c);
 if(!source||!t||!occurrence.startsWith('run:'))fail(400,'run_required','This database trigger requires a committed research run');
 if(!source.enabled||process.env.APP_AUTOMATIONS_ENABLED==='false')fail(403,'run_source_paused','The source research automation is paused');
 if(source.config.automation){const setup=await new AutomationService(db).setup(a,w,0,{runnerId:source.config.automation.runnerId});if(setup.id!==source.config.automation.runnerId||!setup.enabled)fail(403,'run_source_paused','The research connection is disabled');if(setup.state!=='ready')fail(503,'run_source_connection','Waiting for the research connection to be verified');}
 const id=occurrence.slice(4);if(!/^[0-9a-f-]{36}$/i.test(id))fail(400,'run_required','Invalid research run');
 const run=(await db.query("SELECT * FROM app_monitor_runs WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND monitor_id=$4 AND monitor_version=$5 AND status='completed'",[id,w,a.userId,source.id,source.version])).rows[0];
 if(!run||run.result?.testRun||!run.finished_at||(t.meaningful?!meaningfulRun(run.result):t.includeEmpty===false&&!run.result?.savedChanges))fail(409,'run_unavailable','No eligible completed research run');
 return {id:run.id,automationId:source.id,automationVersion:source.version,status:'completed',completedAt:new Date(run.finished_at).toISOString(),summary:run.result.summary,findings:run.result.findings??[],sources:run.result.sources??[],savedChanges:run.result.savedChanges??0,receiptIds:run.result.receiptIds??[],recordIds:run.result.recordIds??[],coverage:run.result.coverage??null};
}
