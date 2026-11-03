/** Host routing failures are distinct from callback and background execution failures. */
export const subscriptionRecovery={
 tool:'automations.create',protocolMethod:'events/subscribe',maxRetries:1,
 onActionNotFound:['rediscover_host_tools','list_event_sources','discover_webhook_schema','peek_existing_tasks','read_automation_setup','retry_once_if_absent'],
 instruction:'events/subscribe is a host-to-server MCP protocol method, not a model-callable TrialAgents tool or action. Use the currently discovered Automations create tool and exact event schema. On 404 Action not found, refresh tool/event discovery, reconcile host tasks and read setup; retry once only if neither a matching task nor active subscription exists. Reuse an existing task instead of creating a duplicate. If it still fails, report the actual tool name, connector ID, event, error and attempt time. A 404 is not background verification delay. A plugin administrator may need to rescan its MCP actions/events; do not claim that rescan occurred unless verified.'
};

export function automationPreflight(workspaceId:string,checked:any,setup:{state:string;canActivate:boolean;nextStep?:unknown}|null){
 const missing=checked.completionSource.missingBindings;
 const appAccess=missing.length?{
  kind:'review_app_bindings',ownerApprovalRequired:true,
  read:{tool:'read_project_component',arguments:{workspaceId,componentId:checked.app.id,includeOutput:false}},
  prepare:{tool:'prepare_app',arguments:{workspaceId,appId:checked.app.id,expectedVersion:checked.app.version}},
  addBindings:missing,
  instruction:'Read the current saved app. Prepare a versioned app revision adding only these required fields to bindings and its manifest, using current schemas. Preserve source, layout, project, existing bindings, field modes, source audience, assets and execution bindings. Explain the exact app-access expansion and obtain the authorized owner approval through the existing app review flow. Do not grant database access, widen sharing, remove requested fields or invent a new schema to bypass this check. After saving, re-read this automation review; do not recreate the research review when its scope is unchanged.'
 }:null;
 return {researchReady:setup?.canActivate??false,followUpReady:!!setup?.canActivate&&!missing.length,
  runner:setup?{state:setup.state,canActivate:setup.canActivate,nextStep:setup.canActivate?null:setup.nextStep}:null,
  completionSource:checked.completionSource,appAccessReview:appAccess,
  nextSteps:[...(!setup?.canActivate?[{kind:setup?'connect_runner':'legacy_schedule',nextStep:setup?.nextStep??null}]:[]),...(appAccess?[appAccess]:[])],
  instruction:'For requested research plus email or another app action, resolve every next step before claiming the chain ready. Continue approved repair work in this conversation; preparation and diagnosis alone are not activation.'};
}
