import {testAutomation,testInput} from '../automations/testing.js';
import {readFile} from 'node:fs/promises';
import {z} from 'zod';
import {McpError} from '@modelcontextprotocol/sdk/types.js';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Express} from 'express';
import type {Database} from '../db/database.js';
import {id,fail,type Actor} from '../shared/schema.js';
import {requireHuman} from '../domain/write-authorization.js';
import {AutomationService,automationsEnabled} from '../automations/service.js';
import {AutomationEvents,eventDefinition,subscribeParams,unsubscribeParams} from '../automations/events.js';
import {runnerChange,claimInput,checkpointInput} from '../automations/schema.js';
import {monitoringFinish,monitoringChange} from '../app-services/monitoring-schema.js';
import {actionChange} from '../app-services/schema.js';
import {backgroundMetadata} from './ui-resource.js';
import {AutomationManagement,automationList,automationKind,automationControl} from '../automations/management.js';
import {AppActions} from '../app-services/service.js';
import {AppMonitoring} from '../app-services/monitoring.js';
import {automationPreflight} from '../automations/setup-contract.js';
import {chatServiceReview} from '../app-services/review.js';
export function addAutomationApi(app:Express,db:Database){
 const s=new AutomationService(db),base='/api/workspaces/:workspaceId/app-services/automations';
 const manage=new AutomationManagement(db),page=z.coerce.number().int().min(0).max(100000).default(0);
 app.post(base+'/test',async(req,res)=>res.json(await testAutomation(db,req.actor!,id.parse(req.params.workspaceId),req.body)));
 app.get(base+'/options',async(req,res)=>res.json(await manage.options(req.actor!,id.parse(req.params.workspaceId),id.parse(req.query.appId))));
 app.get(base+'/definitions',async(req,res)=>res.json(await manage.list(req.actor!,id.parse(req.params.workspaceId),{...req.query,offset:page.parse(req.query.offset)})));
 app.get(base+'/definitions/:kind/:automationId',async(req,res)=>res.json(await manage.read(req.actor!,id.parse(req.params.workspaceId),automationKind.parse(req.params.kind),id.parse(req.params.automationId))));
 app.get(base+'/definitions/:kind/:automationId/history',async(req,res)=>res.json(await manage.history(req.actor!,id.parse(req.params.workspaceId),automationKind.parse(req.params.kind),id.parse(req.params.automationId),page.parse(req.query.offset))));
 app.post(base+'/definitions/:kind/:automationId/control',async(req,res)=>{const v=z.object({expectedVersion:z.number().int().min(0),enabled:z.boolean()}).strict().parse(req.body);res.json(await manage.control(req.actor!,id.parse(req.params.workspaceId),automationKind.parse(req.params.kind),id.parse(req.params.automationId),v.expectedVersion,v.enabled));});
 app.post(base+'/definitions/prepare-control',async(req,res)=>res.json(await manage.prepareControl(req.actor!,id.parse(req.params.workspaceId),req.body)));
 app.get(base,async(req,res)=>res.json(await s.setup(req.actor!,id.parse(req.params.workspaceId))));
 app.get(base+'/connector',async(req,res)=>res.json(await manage.connector(req.actor!,id.parse(req.params.workspaceId))));
 app.post(base+'/prepare',async(req,res)=>res.json(await s.prepare(req.actor!,id.parse(req.params.workspaceId),req.body)));
 app.post(base+'/:runnerId/control',async(req,res)=>{const v=z.object({enabled:z.boolean(),expectedVersion:z.number().int().min(0),confirmed:z.boolean().optional(),impactDigest:z.string().max(100).optional()}).strict().parse(req.body);res.json(await manage.controlConnector(req.actor!,id.parse(req.params.workspaceId),id.parse(req.params.runnerId),v.enabled,v.expectedVersion,v));});
 app.get(base+'/:runnerId/agenda',async(req,res)=>res.json(await s.agenda(req.actor!,id.parse(req.params.workspaceId),id.parse(req.params.runnerId),z.coerce.number().int().min(0).default(0).parse(req.query.offset))));
 app.post(base+'/:runnerId/disconnect',async(req,res)=>{const a=req.actor!,w=id.parse(req.params.workspaceId);requireHuman(a);const r=await s.runner(a,w,id.parse(req.params.runnerId));await db.query('UPDATE automation_subscriptions SET enabled=false WHERE runner_id=$1',[r.id]);res.json({disconnected:true,hostSubscriptionStopped:false});});
 app.post(base+'/occurrences/:occurrenceId/retry',async(req,res)=>{const v=z.object({delivery:z.boolean().default(false)}).strict().parse(req.body);res.json(await s.retry(req.actor!,id.parse(req.params.workspaceId),id.parse(req.params.occurrenceId),v.delivery));});
}
export function addAutomationMcp(server:McpServer,db:Database,a:Actor|undefined,safe:any,metadata:any){
 const s=new AutomationService(db),register=(name:string,description:string,schema:any,read:boolean,fn:(v:any)=>Promise<any>)=>server.registerTool(name,{description,inputSchema:{workspaceId:id,...schema},annotations:{readOnlyHint:read,destructiveHint:false,openWorldHint:false},_meta:backgroundMetadata(metadata)},safe(fn));
 const manage=new AutomationManagement(db);
 register('test_app_automation','Run an explicitly requested isolated test. Research is read-only; email is sent only to the authenticated account. Does not change regular schedules, recipients or enabled status. Never call automatically after saving.',testInput.shape,false,({workspaceId,...v})=>testAutomation(db,{...a!,actionConfirmed:true},workspaceId,v));
 register('read_automation_connector','Read the shared connector and its dependent automations without displaying or refreshing the extension.',{},true,v=>manage.connector(a!,v.workspaceId));
 server.registerTool('control_automation_runner',{description:'Apply the connected owner’s explicit Enable or Disable action in the connector card. Disabling requires the current affected-automation digest and confirmation. Does not execute work.',inputSchema:{workspaceId:id,runnerId:id,expectedVersion:z.number().int().min(0),enabled:z.boolean(),confirmed:z.literal(true),impactDigest:z.string().max(100).optional()},annotations:{readOnlyHint:false,destructiveHint:true,openWorldHint:false},_meta:{...backgroundMetadata(metadata),ui:{visibility:['app']}}},safe((v:any)=>manage.controlConnector({...a!,actionConfirmed:true},v.workspaceId,v.runnerId,v.enabled,v.expectedVersion,v)));
 register('list_app_automations','Start here for requests such as update my tracker every Friday: list owner-managed TrialAgents automations, including ChatGPT research and TrialAgents actions. Use read_app_automation_guide for new recurring app work, not a separate ChatGPT scheduled task. Optional, paginated management; no app loading dependency. Reuse existing IDs and authoring keys. Explain saved/enabled/readiness status in chat; an extension or link alone is not a response. The shared runner is separate from app automations.',automationList.shape,true,({workspaceId,...v})=>manage.list(a!,workspaceId,v));
 register('read_app_automation','Read an owner-managed automation for editing, including disabled definitions. This is configuration, not an execution authorization. Enable or disable using prepare_app_automation_control then confirm_app_service_review. Edit using prepare_app_monitoring for research or prepare_app_action for actions; preserve IDs and expectedVersion. No standalone deletion.',{kind:automationKind,automationId:id},true,v=>manage.read(a!,v.workspaceId,v.kind,v.automationId));
 register('read_app_automation_readiness','Final check before claiming an automation is active. Checks the saved research, verified runner, current permissions and every requested follow-up action. Pass all requiredActionIds for research-to-email or connector workflows. This does not run research or send test messages.',{automationId:id,requiredActionIds:z.array(id).max(20).default([])},true,v=>manage.readiness(a!,v.workspaceId,v.automationId,v.requiredActionIds));
 register('read_app_automation_history','Read bounded outcome history without historical record payloads.',{kind:automationKind,automationId:id,offset:z.number().int().min(0).max(100000).default(0)},true,v=>manage.history(a!,v.workspaceId,v.kind,v.automationId,v.offset));
 register('read_automation_setup','Check the shared runner before configuring recurring app work in TrialAgents. If not enabled, pending or unavailable, follow read_app_automation_guide to resolve setup; do not fall back to a per-app ChatGPT scheduled task. Account connection alone does not activate work. Follow nextStep; waitSeconds (max 20) waits only for an already connected runner. New research activation is blocked until canActivate=true. Never finish verification in the foreground.',{waitSeconds:z.number().int().min(0).max(20).default(0)},true,v=>s.setup(a!,v.workspaceId,v.waitSeconds));
 register('prepare_automation_setup','Prepare owner review for the shared background runner, daily time and IANA timezone. Returns an exact review for confirm_app_service_review in ChatGPT and a website review link. No task or subscription is created by this operation.',runnerChange.shape,false,({workspaceId,...v})=>s.prepare(a!,workspaceId,v));
 register('prepare_app_automation_control','Prepare enabling or disabling an existing research or action automation. Returns its exact saved instructions, recipients, scope and requested state for confirm_app_service_review. A user request to activate or repair that workflow already authorizes the requested state; do not ask them to click Enable in the website. Never enable unrelated or replaced definitions.',automationControl.shape,false,({workspaceId,...v})=>manage.prepareControl(a!,workspaceId,v));
 const reviewKind=z.enum(['automation_setup','monitoring','action','automation_control']);
 register('read_app_service_review','Read an exact pending or saved automation review owned by the connected user. Returns the configuration, current preflight with exact app-binding repair steps, and review string for confirmation in ChatGPT. Resolve requested follow-up access before activation; do not stop at reporting a fixable mismatch. Does not authorize or execute anything. Sharing reviews remain in TrialAgents.',{reviewId:id},true,async v=>{
  await s.owner(a!,v.workspaceId);
  const r=await new AppActions(db).preview(a!,v.workspaceId,v.reviewId),parsed=reviewKind.safeParse(r.kind);
  if(!parsed.success)fail(403,'review_kind','This review requires the authenticated TrialAgents app');
  const kind=parsed.data;let preflight:any;
  if(kind==='monitoring'){
   const config=monitoringChange.parse(r.body.change).config,checked=await new AppMonitoring(db).validate(a!,v.workspaceId,config,true);
   preflight=automationPreflight(v.workspaceId,checked,config.automation?await s.setup(a!,v.workspaceId):null);
   if(checked.stamp!==r.body.scopeStamp)fail(409,'scope_changed','Monitoring fields or permissions changed after preparation');
  }
  if(kind==='automation_control')await manage.read(a!,v.workspaceId,r.body.change.kind,r.body.change.automationId);
  if(kind==='action')await new AppActions(db).validate(a!,v.workspaceId,actionChange.parse(r.body).config);
  return {id:r.id,kind,digest:r.digest,body:r.body,...(preflight?{preflight}:{}),expiresAt:r.expires_at,status:r.consumed_at?'saved':'review_required',result:r.result,...chatServiceReview(v.workspaceId,r.id,kind,r.digest,r.body)};
 });
 server.registerTool('confirm_app_service_review',{description:'Save and authorize the exact prepared TrialAgents automation after agreement with the user in the current conversation. Supports shared runner setup, recurring research, app actions and enabling or disabling saved definitions. For a user request such as email me the update, the authenticated account recipient is already identified; no separate address confirmation is needed. Use the user’s existing explicit request as authorization for that workflow, and request clarification only for genuinely missing decisions. Pass the unchanged review string and digest returned by preparation or read_app_service_review. Authorization permits repeated future execution only within that configuration. Current owner, connection, scope, expiry and version checks still apply. Opens the Automations page after successful app automation confirmation, showing the saved status. Does not create a host subscription or execute the action immediately.',inputSchema:{workspaceId:id,reviewId:id,kind:reviewKind,digest:z.string().length(64),review:z.string().min(2).max(1000000),confirmed:z.literal(true)},annotations:{readOnlyHint:false,destructiveHint:true,idempotentHint:true,openWorldHint:true},_meta:metadata},safe(async(v:any)=>{
  const actor={...a!,actionConfirmed:true};
  if(v.kind==='automation_setup')return {...await s.confirm(actor,v.workspaceId,v.reviewId,v.digest,v.review),displayIntent:'background'};
  const result=v.kind==='automation_control'?await manage.confirmControl(actor,v.workspaceId,v.reviewId,v.digest,v.review):v.kind==='monitoring'?await new AppMonitoring(db).confirm(actor,v.workspaceId,v.reviewId,v.digest,v.review):await new AppActions(db).confirm(actor,v.workspaceId,v.reviewId,v.digest,v.review);
  return {...result,workspaceId:v.workspaceId,screen:'automations',displayIntent:'navigate'};
 }));
 register('read_app_automation_guide','Default guide for all new recurring work on a TrialAgents app, including weekly tracker updates. Store schedules and instructions in TrialAgents Automations; use one shared ChatGPT event runner, not a task per app. Pending setup is not permission to use a different scheduler. Follow its end-to-end setup checklist: runner connection is only a prerequisite; continue through saved enabled app automations, all requested follow-ups and final readiness. Apps remain independent of automation availability.',{},true,async()=>({version:'1.4.3',guide:await readFile(new URL('../../resources/workspace/references/SHARED_AUTOMATIONS.md',import.meta.url),'utf8')}));
 register('read_automation_agenda','Read bounded due and unfinished work from the shared queue. Server determines eligibility; do not infer due work from chat history or record timestamps.',{runnerId:id,offset:z.number().int().min(0).default(0)},true,v=>s.agenda(a!,v.workspaceId,v.runnerId,v.offset));
 register('claim_automation_work','Claim one due authorized job. Use a stable UUID requestKey for retries. A finished occurrence must not be executed again. Returns current instructions and prior run IDs for receipt reconciliation.',claimInput.shape,false,({workspaceId,...v})=>s.claim(a!,workspaceId,v));
 register('checkpoint_automation_work','Persist bounded research progress and stable request keys under the active claim. Does not mark the research completed or alter app content.',checkpointInput.shape,false,({workspaceId,...v})=>s.checkpoint(a!,workspaceId,v));
 register('finish_automation_work','Record the outcome of a claimed shared job. Only complete/no-update work may advance coverage. TrialAgents dispatches any separately approved email action. Never send emails through ChatGPT.',{occurrenceId:id,claimToken:id,result:z.object(monitoringFinish.shape).omit({runId:true}).optional()},false,({workspaceId,...v})=>s.finish(a!,workspaceId,v));
 if(automationsEnabled()){
  server.server.registerCapabilities({events:{}} as any);
  const handle=(fn:(p:any)=>Promise<any>)=>async(request:any)=>{if(!a)throw new McpError(-32001,'Connect TrialAgents first');try{const result=await fn(request.params??{});if(process.env.NODE_ENV!=='test')console.info(JSON.stringify({event:'mcp_event_operation',method:request.method,outcome:'succeeded'}));return result;}catch(e:any){if(process.env.NODE_ENV!=='test')console.warn(JSON.stringify({event:'mcp_event_operation',method:request.method,outcome:'failed',code:e.status?e.code:'unexpected'}));throw new McpError(e.code==='callback_verification'?-32015:-32602,e.status?e.message:'Automation setup could not complete',e.code==='callback_verification'?{reason:'challenge_failed'}:undefined);}};
  server.server.setRequestHandler(z.object({method:z.literal('events/list'),params:z.object({cursor:z.string().optional()}).optional()}) as any,handle(async()=>({events:[eventDefinition]})));
  server.server.setRequestHandler(z.object({method:z.literal('events/subscribe'),params:subscribeParams}) as any,handle(p=>new AutomationEvents(db).subscribe(a!,p)));
  server.server.setRequestHandler(z.object({method:z.literal('events/unsubscribe'),params:unsubscribeParams}) as any,handle(p=>new AutomationEvents(db).unsubscribe(a!,p)));
 }
}
