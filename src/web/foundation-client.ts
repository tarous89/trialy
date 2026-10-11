export function foundationClient(api:(path:string,method?:string,body?:unknown)=>Promise<any>){return async(name:string,v:Record<string,any>)=>{
 const b=`/api/workspaces/${v.workspaceId}/foundation`;
 const routes:Record<string,[string,string?,unknown?]>={
 discard_function_preview:[`${b}/functions/previews/${v.previewId}`,'DELETE'],
 prepare_run_artifact:[`${b}/runs/${v.runId}/artifact`,'POST',{filename:v.filename,index:v.index}],commit_change:[`/api/previews/${v.previewId}/commit`,'POST',{digest:v.digest,confirmed:v.confirmed}],
 run_code:[`${b}/runs`,'POST',{program:v.program,requestKey:v.requestKey}],list_code_runs:[`${b}/runs`],inspect_code_run:[`${b}/runs/${v.runId}`],cancel_code_run:[`${b}/runs/${v.runId}/cancel`,'POST',{}],confirm_code_changes:[`${b}/runs/${v.runId}/commit`,'POST',{digest:v.digest,confirmed:v.confirmed}],
 list_functions:[`${b}/functions`],read_function_revision:[`${b}/revisions/${v.revisionId}`],preview_function:[`${b}/functions/preview`,'POST',v.function],confirm_function:[`${b}/functions/${v.previewId}/save`,'POST',{digest:v.digest,confirmed:v.confirmed}],invoke_function:[`${b}/invoke`,'POST',{invocation:v.invocation,requestKey:v.requestKey}],
 list_execution_grants:[`${b}/grants`],confirm_execution_grant:[`${b}/grants`,'POST',{...v.grant,confirmed:v.confirmed}],revoke_execution_grant:[`${b}/grants/${v.grantId}`,'DELETE'],list_code_schedules:[`${b}/schedules`],confirm_code_schedule:[`${b}/schedules`,'POST',{schedule:v.schedule,confirmed:v.confirmed}],pause_code_schedule:[`${b}/schedules/${v.scheduleId}/pause`,'POST',{paused:v.paused}]
 };const route=routes[name];if(!route)throw new Error('Unknown foundation action');return api(...route);
};}
