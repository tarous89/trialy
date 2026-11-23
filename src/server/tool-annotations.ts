import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Tool annotation policy (permission prompts, 23 November 2026).
 *
 * Claude and ChatGPT ask the person to approve every call of a tool that is not marked `readOnlyHint:true`, ask more
 * firmly for `destructiveHint:true`, and warn for `openWorldHint:true`. TrialAgents enforces its own approvals (the
 * approval footer, Access), so the host's prompt should only appear where a call itself saves, sends or deletes
 * something the person keeps. This table is the one place those three hints are corrected; registrations elsewhere
 * keep their own values for every tool not listed here.
 */

/** Calls that save nothing the person keeps: they open a view, set up the caller's own account storage idempotently,
 * or create, mark or discard the assistant's own temporary, unsaved preview. Saving a preview is a separate step. */
export const PREVIEW_ONLY_TOOLS:ReadonlySet<string>=new Set([
 'open_workspace','initialize_account','create_initial_workspace',
 'prepare_change','discard_preview',
 'prepare_tracker','prepare_tracker_revision','begin_app_update','finalize_app_preview','discard_workspace_preview',
 'prepare_workspace_change','prepare_exchange_email','prepare_record_backfill',
 'prepare_execution_control','preview_function','discard_function_preview','prepare_run_artifact',
 'prepare_automation_setup','prepare_app_automation_control','prepare_app_automation_feature',
]);

/** Writes that neither delete nor overwrite saved data: stopping a run, pausing a schedule, moving an item. */
export const NON_DESTRUCTIVE_WRITE_TOOLS:ReadonlySet<string>=new Set(['cancel_code_run','pause_code_schedule','move_tool']);

/** Writes that stay inside the person's own TrialAgents account (no public internet, no outside recipients). */
export const CLOSED_WORLD_TOOLS:ReadonlySet<string>=new Set(['confirm_app_service_review','connect_claude_runner']);

export function correctedAnnotations(name:string,annotations:Record<string,unknown>|undefined){
 if(!annotations)return annotations;
 if(PREVIEW_ONLY_TOOLS.has(name))return {...annotations,readOnlyHint:true,destructiveHint:false,openWorldHint:false};
 let next=annotations;
 if(NON_DESTRUCTIVE_WRITE_TOOLS.has(name))next={...next,destructiveHint:false};
 if(CLOSED_WORLD_TOOLS.has(name))next={...next,openWorldHint:false};
 return next;
}

/** Applies the policy to every tool registered on this server afterwards. */
export function applyAnnotationPolicy(server:McpServer){
 const register=server.registerTool.bind(server) as any;
 (server as any).registerTool=(name:string,config:any,handler:any)=>register(name,config?.annotations?{...config,annotations:correctedAnnotations(name,config.annotations)}:config,handler);
}
