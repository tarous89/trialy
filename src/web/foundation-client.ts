export function foundationClient(api:(path:string,method?:string,body?:unknown)=>Promise<any>){return async(name:string,v:Record<string,any>)=>{
 const b=`/api/workspaces/${v.workspaceId}/foundation`;
 const o=`/api/workspaces/${v.workspaceId}/organization`;
 const routes:Record<string,[string,string?,unknown?]>={
 read_activity_changes:[`${o}/activity/${v.eventId}`],
 prepare_tool_layout:[`${o}/tool-layout`,'POST',Object.fromEntries(Object.entries(v).filter(([k])=>k!=='workspaceId'))],
 prepare_tool_template:[`${o}/tracker-template`,'POST',Object.fromEntries(Object.entries(v).filter(([k])=>k!=='workspaceId'))],
 read_access_grid_draft:[`/api/workspaces/${v.workspaceId}/access-grid/reviews/${v.reviewId}`],
 read_access_directory:['/api/account/access'],
 read_access_grid:[`/api/workspaces/${v.workspaceId}/access-grid?subject=${encodeURIComponent(v.subject??'all')}`],
 save_access_grid:[`/api/workspaces/${v.workspaceId}/access-grid`,'POST',v.batch],
 list_tool_tables:[`${o}/components/${v.componentId}/tables`],
 tool_reference_options:[`${o}/components/${v.componentId}/references/${v.typeId}/${encodeURIComponent(v.field)}?q=${encodeURIComponent(v.query??'')}&offset=${v.offset??0}`],
 read_effective_access:[`/api/workspaces/${v.workspaceId}/effective-access`],
 explain_effective_access:[`/api/workspaces/${v.workspaceId}/effective-access/${v.subject}`],
 update_effective_access:[`/api/workspaces/${v.workspaceId}/effective-access`,'POST',v.change],
 read_account_home:['/api/account/home','POST',Object.fromEntries(Object.entries(v).filter(([k])=>k!=='workspaceId'))],
 read_account_schema:['/api/account/schema','POST',{offset:v.offset??0,limit:v.limit??25}],
 reference_options:[`/api/workspaces/${v.workspaceId}/types/${v.typeId}/references/${encodeURIComponent(v.field)}?q=${encodeURIComponent(v.query??'')}&offset=${v.offset??0}`],
 move_tool:[`${o}/tools/move`,'POST',Object.fromEntries(Object.entries(v).filter(([k])=>k!=='workspaceId'))],
 read_workspace_home:[`${o}/home`,'POST',Object.fromEntries(Object.entries(v).filter(([k])=>k!=='workspaceId'))],
 read_workspace_activity:[`${o}/activity`,'POST',Object.fromEntries(Object.entries(v).filter(([k])=>k!=='workspaceId'))],
 check_component_access:[`${o}/components/${v.componentId}/access`],
 read_database_table:[`${o}/database`,'POST',Object.fromEntries(Object.entries(v).filter(([k])=>k!=='workspaceId'))],
 read_workspace_schema:[`${o}/schema`,'POST',{offset:v.offset??0,limit:v.limit??10,...(v.typeId?{typeId:v.typeId}:{})}],find_field_candidates:[`${o}/field-candidates`,'POST',Object.fromEntries(Object.entries(v).filter(([k])=>k!=='workspaceId'))],
 list_execution_approvals:[`${b}/approvals`],prepare_execution_control:[`${b}/approvals`,'POST',{kind:v.kind,config:v.config}],confirm_execution_control:[`${b}/approvals/${v.previewId}/confirm`,'POST',{digest:v.digest,confirmed:v.confirmed}],
 read_shared_identity:[`${o}/identities/${v.recordId}`],find_identity_candidates:[`${o}/identity-candidates`,'POST',{typeIds:v.typeIds,query:v.query}],
 list_collection_responses:[`${o}/collection-responses?offset=${v.offset??0}`],read_operational_status:[`${o}/operational-status`],list_project_relationships:[`${o}/projects/${v.projectId}/relationships?offset=${v.offset??0}`],list_table_mappings:[`${o}/table-mappings?offset=${v.offset??0}`],list_cross_table_links:[`${o}/records/${v.recordId}/cross-table-links?offset=${v.offset??0}`],prepare_record_backfill:[`${o}/backfill`,'POST',v.batch],list_record_facts:[`${o}/records/${v.recordId}/facts?offset=${v.offset??0}`],list_project_records:[`/api/workspaces/${v.workspaceId}/organization/projects/${v.projectId}/records?offset=${v.offset??0}`],list_creation_archives:[`/api/workspaces/${v.workspaceId}/creation-archives?offset=${v.offset??0}`],list_pending_changes:[`/api/workspaces/${v.workspaceId}/previews`],list_field_changes:[`/api/workspaces/${v.workspaceId}/field-changes?offset=${v.offset??0}${['typeId','recordId','actorId','authorizationId','changeSetId','authorizationKind','since','until'].filter(k=>v[k]).map(k=>'&'+k+'='+encodeURIComponent(v[k])).join('')}`],prepare_change:[`/api/workspaces/${v.workspaceId}/previews`,'POST',v.operation],discard_preview:[`/api/previews/${v.previewId}`,'DELETE'],
 invoke_component_function:[`${o}/functions/invoke`,'POST',v.request],
 run_component_frontend:[`${o}/frontend/run`,'POST',v.request],
 render_project_component:[`${o}/components/${v.componentId}/render?block=${v.block}&offset=${v.offset??0}`],
 list_project_sharing_members:[`${o}/sharing-members`],
 list_project_components:[`${o}/components${v.projectId?'?projectId='+encodeURIComponent(v.projectId):''}`],read_project_component:[`${o}/components/${v.componentId}`],read_component_history:[`${o}/components/${v.componentId}/history`],
 list_workspace_projects:[o],list_workspace_previews:[`${o}/previews`],prepare_workspace_change:[`${o}/previews`,'POST',v.operation],confirm_workspace_change:[`${o}/previews/${v.previewId}/confirm`,'POST',{digest:v.digest,confirmed:v.confirmed}],discard_workspace_preview:[`${o}/previews/${v.previewId}`,'DELETE'],list_maintenance_scopes:[`${o}/scopes`],revoke_maintenance_scope:[`${o}/scopes/${v.scopeId}`,'DELETE'],maintain_workspace_records:[`${o}/maintain`,'POST',v.batch],read_record_evidence:[`${o}/evidence/${v.recordId}`],
 discard_function_preview:[`${b}/functions/previews/${v.previewId}`,'DELETE'],
 prepare_run_artifact:[`${b}/runs/${v.runId}/artifact`,'POST',{filename:v.filename,index:v.index}],commit_change:[`/api/previews/${v.previewId}/commit`,'POST',{digest:v.digest,confirmed:v.confirmed}],
 run_code:[`${b}/runs`,'POST',{program:v.program,requestKey:v.requestKey}],list_code_runs:[`${b}/runs`],inspect_code_run:[`${b}/runs/${v.runId}`],cancel_code_run:[`${b}/runs/${v.runId}/cancel`,'POST',{}],confirm_code_changes:[`${b}/runs/${v.runId}/commit`,'POST',{digest:v.digest,confirmed:v.confirmed}],
 list_functions:[`${b}/functions`],read_function_revision:[`${b}/revisions/${v.revisionId}`],preview_function:[`${b}/functions/preview`,'POST',v.function],confirm_function:[`${b}/functions/${v.previewId}/save`,'POST',{digest:v.digest,confirmed:v.confirmed}],invoke_function:[`${b}/invoke`,'POST',{invocation:v.invocation,requestKey:v.requestKey}],
 list_execution_grants:[`${b}/grants`],confirm_execution_grant:[`${b}/grants`,'POST',{...v.grant,confirmed:v.confirmed}],revoke_execution_grant:[`${b}/grants/${v.grantId}`,'DELETE'],list_code_schedules:[`${b}/schedules`],confirm_code_schedule:[`${b}/schedules`,'POST',{schedule:v.schedule,confirmed:v.confirmed}],pause_code_schedule:[`${b}/schedules/${v.scheduleId}/pause`,'POST',{paused:v.paused}]
 };const route=routes[name];if(!route)throw new Error('Unknown foundation action');return api(...route);
};}

