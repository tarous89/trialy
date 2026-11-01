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
import {monitoringFinish} from '../app-services/monitoring-schema.js';
import {backgroundMetadata} from './ui-resource.js';
import {AutomationManagement,automationList,automationKind} from '../automations/management.js';
export function addAutomationApi(app:Express,db:Database){
 const s=new AutomationService(db),base='/api/workspaces/:workspaceId/app-services/automations';
 const manage=new AutomationManagement(db),page=z.coerce.number().int().min(0).max(100000).default(0);
 app.get(base+'/options',async(req,res)=>res.json(await manage.options(req.actor!,id.parse(req.params.workspaceId),id.parse(req.query.appId))));
 app.get(base+'/definitions',async(req,res)=>res.json(await manage.list(req.actor!,id.parse(req.params.workspaceId),{...req.query,offset:page.parse(req.query.offset)})));
 app.get(base+'/definitions/:kind/:automationId',async(req,res)=>res.json(await manage.read(req.actor!,id.parse(req.params.workspaceId),automationKind.parse(req.params.kind),id.parse(req.params.automationId))));
 app.get(base+'/definitions/:kind/:automationId/history',async(req,res)=>res.json(await manage.history(req.actor!,id.parse(req.params.workspaceId),automationKind.parse(req.params.kind),id.parse(req.params.automationId),page.parse(req.query.offset))));
 app.post(base+'/definitions/:kind/:automationId/control',async(req,res)=>{const v=z.object({expectedVersion:z.number().int().min(0),enabled:z.boolean()}).strict().parse(req.body);res.json(await manage.control(req.actor!,id.parse(req.params.workspaceId),automationKind.parse(req.params.kind),id.parse(req.params.automationId),v.expectedVersion,v.enabled));});
 app.get(base,async(req,res)=>res.json(await s.setup(req.actor!,id.parse(req.params.workspaceId))));
 app.post(base+'/prepare',async(req,res)=>res.json(await s.prepare(req.actor!,id.parse(req.params.workspaceId),req.body)));
 app.post(base+'/:runnerId/control',async(req,res)=>{const v=z.object({enabled:z.boolean(),expectedVersion:z.number().int().min(0)}).strict().parse(req.body);res.json(await s.control(req.actor!,id.parse(req.params.workspaceId),id.parse(req.params.runnerId),v.enabled,v.expectedVersion));});
 app.get(base+'/:runnerId/agenda',async(req,res)=>res.json(await s.agenda(req.actor!,id.parse(req.params.workspaceId),id.parse(req.params.runnerId),z.coerce.number().int().min(0).default(0).parse(req.query.offset))));
 app.post(base+'/:runnerId/disconnect',async(req,res)=>{const a=req.actor!,w=id.parse(req.params.workspaceId);requireHuman(a);const r=await s.runner(a,w,id.parse(req.params.runnerId));await db.query('UPDATE automation_subscriptions SET enabled=false WHERE runner_id=$1',[r.id]);res.json({disconnected:true,hostSubscriptionStopped:false});});
 app.post(base+'/occurrences/:occurrenceId/retry',async(req,res)=>{const v=z.object({delivery:z.boolean().default(false)}).strict().parse(req.body);res.json(await s.retry(req.actor!,id.parse(req.params.workspaceId),id.parse(req.params.occurrenceId),v.delivery));});
}
export function addAutomationMcp(server:McpServer,db:Database,a:Actor|undefined,safe:any,metadata:any){
 const s=new AutomationService(db),register=(name:string,description:string,schema:any,read:boolean,fn:(v:any)=>Promise<any>)=>server.registerTool(name,{description,inputSchema:{workspaceId:id,...schema},annotations:{readOnlyHint:read,destructiveHint:false,openWorldHint:false},_meta:backgroundMetadata(metadata)},safe(fn));
 const manage=new AutomationManagement(db);
 register('list_app_automations','List owner-managed app automations across apps: ChatGPT research and TrialAgents actions. Optional, paginated management; no app loading dependency. Reuse existing IDs and authoring keys.',automationList.shape,true,({workspaceId,...v})=>manage.list(a!,workspaceId,v));
 register('read_app_automation','Read an owner-managed automation for editing, including disabled definitions. This is configuration, not an execution authorization. Edit using prepare_app_monitoring for research or prepare_app_action for actions; preserve IDs and expectedVersion. No standalone deletion.',{kind:automationKind,automationId:id},true,v=>manage.read(a!,v.workspaceId,v.kind,v.automationId));
 register('read_app_automation_history','Read bounded outcome history without historical record payloads.',{kind:automationKind,automationId:id,offset:z.number().int().min(0).max(100000).default(0)},true,v=>manage.history(a!,v.workspaceId,v.kind,v.automationId,v.offset));
 register('read_automation_setup','Read optional background connection status and setup instructions. Account connection alone does not activate work. Never claim verified background execution without ready status.',{},true,v=>s.setup(a!,v.workspaceId));
 register('prepare_automation_setup','Prepare owner review for the shared background runner, daily time and IANA timezone. No task or subscription is created by this operation.',runnerChange.shape,false,({workspaceId,...v})=>s.prepare(a!,workspaceId,v));
 register('read_app_automation_guide','Read current instructions for optional app automation setup, app authoring and shared execution. Apps remain independent of automation availability.',{},true,async()=>({version:'1.1.1',guide:await readFile('plugin/trialy/skills/trialy-workspace/references/SHARED_AUTOMATIONS.md','utf8')}));
 register('read_automation_agenda','Read bounded due and unfinished work from the shared queue. Server determines eligibility; do not infer due work from chat history or record timestamps.',{runnerId:id,offset:z.number().int().min(0).default(0)},true,v=>s.agenda(a!,v.workspaceId,v.runnerId,v.offset));
 register('claim_automation_work','Claim one due authorized job. Use a stable UUID requestKey for retries. A finished occurrence must not be executed again. Returns current instructions and prior run IDs for receipt reconciliation.',claimInput.shape,false,({workspaceId,...v})=>s.claim(a!,workspaceId,v));
 register('checkpoint_automation_work','Persist bounded research progress and stable request keys under the active claim. Does not mark the research completed or alter app content.',checkpointInput.shape,false,({workspaceId,...v})=>s.checkpoint(a!,workspaceId,v));
 register('finish_automation_work','Record the outcome of a claimed shared job. Only complete/no-update work may advance coverage. TrialAgents dispatches any separately approved email action. Never send emails through ChatGPT.',{occurrenceId:id,claimToken:id,result:z.object(monitoringFinish.shape).omit({runId:true}).optional()},false,({workspaceId,...v})=>s.finish(a!,workspaceId,v));
 if(automationsEnabled()){
  server.server.registerCapabilities({events:{}} as any);
  const handle=(fn:(p:any)=>Promise<any>)=>async(request:any)=>{if(!a)throw new McpError(-32001,'Connect TrialAgents first');try{return await fn(request.params??{});}catch(e:any){throw new McpError(e.code==='callback_verification'?-32015:-32602,e.status?e.message:'Automation setup could not complete',e.code==='callback_verification'?{reason:'challenge_failed'}:undefined);}};
  server.server.setRequestHandler(z.object({method:z.literal('events/list'),params:z.object({cursor:z.string().optional()}).optional()}) as any,handle(async()=>({events:[eventDefinition]})));
  server.server.setRequestHandler(z.object({method:z.literal('events/subscribe'),params:subscribeParams}) as any,handle(p=>new AutomationEvents(db).subscribe(a!,p)));
  server.server.setRequestHandler(z.object({method:z.literal('events/unsubscribe'),params:unsubscribeParams}) as any,handle(p=>new AutomationEvents(db).unsubscribe(a!,p)));
 }
}
