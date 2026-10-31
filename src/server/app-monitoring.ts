import type {Express} from 'express';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {id,type Actor} from '../shared/schema.js';
import {WorkspaceFoundation} from '../workspace/service.js';
import {maintenanceBatch} from '../workspace/schema.js';
import {AppMonitoring} from '../app-services/monitoring.js';
import {monitoringChange,monitoringTask,monitoringStart,monitoringFinish} from '../app-services/monitoring-schema.js';
import {backgroundMetadata} from './ui-resource.js';
const page={offset:z.number().int().min(0).default(0)};
export function addAppMonitoringApi(app:Express,f:WorkspaceFoundation){
 const s=new AppMonitoring(f.db),b='/api/workspaces/:workspaceId/app-services/monitoring',context=(req:any)=>({a:req.actor as Actor,w:id.parse(req.params.workspaceId)});
 app.get(b,async(req,res)=>{const {a,w}=context(req);res.json(await s.list(a,w,id.parse(req.query.appId),z.coerce.number().int().min(0).default(0).parse(req.query.offset)));});
 app.post(b+'/prepare',async(req,res)=>{const {a,w}=context(req);res.json(await s.prepare(a,w,req.body));});
 app.get(b+'/:monitorId',async(req,res)=>{const {a,w}=context(req);res.json(await s.read(a,w,id.parse(req.params.monitorId)));});
 app.post(b+'/:monitorId/control',async(req,res)=>{const {a,w}=context(req),v=z.object({expectedVersion:z.number().int().min(0),enabled:z.boolean()}).strict().parse(req.body);res.json(await s.control(a,w,id.parse(req.params.monitorId),v.expectedVersion,v.enabled));});
 app.post(b+'/:monitorId/detach-task',async(req,res)=>{const {a,w}=context(req),v=z.object({expectedVersion:z.number().int().min(0),hostTaskPaused:z.literal(true)}).strict().parse(req.body);res.json(await s.detach(a,w,id.parse(req.params.monitorId),v.expectedVersion));});
 app.get(b+'/:monitorId/runs',async(req,res)=>{const {a,w}=context(req);res.json(await s.runs(a,w,id.parse(req.params.monitorId),z.coerce.number().int().min(0).default(0).parse(req.query.offset)));});
}
export function addAppMonitoringMcp(server:McpServer,f:WorkspaceFoundation,a:Actor,safe:any,metadata:any){
 const s=new AppMonitoring(f.db),register=(name:string,description:string,schema:any,read:boolean,fn:(v:any)=>Promise<any>)=>server.registerTool(name,{description,inputSchema:{workspaceId:id,...schema},annotations:{readOnlyHint:read,openWorldHint:false,destructiveHint:false},_meta:backgroundMetadata(metadata)},safe(fn));
 register('prepare_app_monitoring','Prepare optional recurring research, analysis or reporting for ANY saved app, including custom apps and apps without records. Does not edit the app, create a ChatGPT task, or grant data permissions. Read read_app_monitoring_guide first. Returns an exact owner review link. Templates are optional.',monitoringChange.shape,false,({workspaceId,...v})=>s.prepare(a,workspaceId,v));
 register('list_app_monitoring','List your optional monitoring configurations for a saved app. Read before creating a task to avoid duplicates. External ChatGPT task state is not observed.',{appId:id,...page},true,v=>s.list(a,v.workspaceId,v.appId,v.offset));
 register('read_app_monitoring','Read current monitoring instructions, authorized field/scope bindings, last coverage, task association and a durable task prompt. Always read at the start of a scheduled run; stop unless availability is ready. Contains no app source and makes no changes.',{monitorId:id},true,v=>s.read(a,v.workspaceId,v.monitorId));
 register('link_app_monitoring_task','Record the task ID, exact schedule and timezone returned by ChatGPT scheduling after successful creation or update. This only records an association; it does not create, verify, pause or reschedule the external task. Never invent an ID or report its live status.',monitoringTask.shape,false,({workspaceId,...v})=>s.link(a,workspaceId,v));
 register('start_app_monitor_run','Start one authorized monitoring cycle, or reconcile an interrupted occurrence. Use a stable occurrenceKey for the same scheduled occurrence. Do not rerun a finished occurrence. Overlapping runs are rejected; a two-hour run deadline bounds abandoned work.',monitoringStart.shape,false,({workspaceId,...v})=>s.start(a,workspaceId,v));
 register('read_app_monitor_records','Read a bounded page of current records using only the active run\'s approved read fields. Paginate nextOffset; a partial page is not the complete dataset.',{runId:id,typeId:id,...page},true,v=>s.records(a,v.workspaceId,v.runId,v.typeId,v.offset));
 register('maintain_app_monitor_records','Save source-backed findings ONLY through this active run\'s existing scoped ongoing write permission. Rechecks current authorization and run limits in the same transaction as saving; records durable receipts. Stable requestKey retries are idempotent. Does not create permissions, change schema, or edit app code. If permission is missing, report findings in ChatGPT for user review instead.',{runId:id,batch:maintenanceBatch},false,v=>f.maintain(a,v.workspaceId,v.batch,undefined,false,v.runId));
 register('finish_app_monitor_run','Record the final monitoring result and agent-reported source coverage. Saved counts come from verified receipts. Only completed/no_update may advance coverage; partial, blocked and failed runs must disclose gaps. Retry identical input safely. Do not claim a proposal was saved.',monitoringFinish.shape,false,({workspaceId,...v})=>s.finish(a,workspaceId,v));
 register('read_app_monitor_runs','Read monitoring run history and verified save counts. This private operational history is separate from the app\'s reports and published content.',{monitorId:id,...page},true,v=>s.runs(a,v.workspaceId,v.monitorId,v.offset));
 register('read_app_monitor_run','Reconcile an interrupted monitoring run. Returns paginated verified save request keys, payload digests and saved record IDs, including while a run is still running. Read all pages before deciding what remains; never blindly replay unknown writes.',{runId:id,...page},true,v=>s.readRun(a,v.workspaceId,v.runId,v.offset));
}
