import express,{type Express,type RequestHandler} from 'express';
import {rateLimit} from 'express-rate-limit';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {id,fail,type Actor} from '../shared/schema.js';
import {AppActions} from '../app-services/service.js';
import {AppSharing,sharingConfig} from '../app-services/sharing.js';
import {actionChange} from '../app-services/schema.js';
import {serviceJob,receiveDeliveryEvent} from '../app-services/jobs.js';
import {withActor} from '../db/context.js';
import {WorkspaceFoundation} from '../workspace/service.js';
import type {Database} from '../db/database.js';
import {appUrl} from '../shared/app-route.js';
export function addPublicAppServices(app:Express,db:Database,human:RequestHandler){
 const sharing=new AppSharing(db),f=new WorkspaceFoundation(db);
 app.post('/notifications/webhook',express.raw({type:'application/json',limit:'128kb'}),async(req,res)=>res.json(await receiveDeliveryEvent(db,(req as any).rawBody??req.body,req.headers)));
 app.post('/api/app-invitation/accept',human,async(req,res)=>res.json(await sharing.accept(req.actor!,req.body.token)));
 app.post('/public-app/call',rateLimit({windowMs:60000,limit:60}),async(req,res)=>{
  const {s,a,c}=await sharing.publicContext(req.get('x-trialagents-share'));const v=z.object({name:z.string().max(80),args:z.record(z.string(),z.unknown()).default({})}).strict().parse(req.body),args:any=v.args;
  res.set('Cache-Control','no-store');res.set('Referrer-Policy','no-referrer');
  const result=await withActor(a,async()=>{const w=s.workspace_id;
   if(v.name==='open')return {component:c,workspaceId:w,mode:s.config.mode};
   if(args.componentId&&args.componentId!==c.id)fail(403,'share_scope','App is outside this link');
   if(v.name==='run_component_frontend'){if(args.request?.componentId!==c.id||args.request?.previewId)fail(403,'share_scope','App is outside this link');return f.runFrontend(a,w,args.request);}
   if(v.name==='check_component_access')return f.checkComponentAccess(a,w,c.id);
   if(v.name==='read_project_component')return f.readComponent(a,w,c.id,false);
   if(v.name==='list_tool_tables')return f.toolTables(a,w,c.id);
   if(v.name==='tool_reference_options')return f.toolReferences(a,w,c.id,id.parse(args.typeId),z.string().parse(args.field),String(args.query??''),Number(args.offset??0));
   if(v.name==='prepare_workspace_change'){if(s.config.mode!=='edit'||args.operation?.kind!=='apply_component_records'||args.operation.componentId!==c.id)fail(403,'share_scope','Only edits to this app are allowed');return f.preview(a,w,args.operation);}
   if(['confirm_workspace_change','discard_workspace_preview'].includes(v.name)){const row=(await db.query('SELECT body FROM workspace_previews WHERE id=$1 AND workspace_id=$2 AND user_id=$3',[id.parse(args.previewId),w,a.userId])).rows[0];if(s.config.mode!=='edit'||row?.body?.operation?.kind!=='apply_component_records'||row.body.operation.componentId!==c.id)fail(403,'share_scope','This change is outside the shared app');return v.name==='confirm_workspace_change'?f.confirm(a,w,args.previewId,z.string().length(64).parse(args.digest)):f.discard(a,w,args.previewId);}
   fail(403,'share_scope','This action is not available through the public link');
  });res.json(result);
 });
}
export function addAppServicesApi(app:Express,f:WorkspaceFoundation){
 const b='/api/workspaces/:workspaceId/app-services',actions=new AppActions(f.db),sharing=new AppSharing(f.db),context=(req:any)=>({a:req.actor as Actor,w:id.parse(req.params.workspaceId)});
 app.get(`${b}/actions`,async(req,res)=>{const {a,w}=context(req);res.json(await actions.list(a,w,req.query.appId?id.parse(req.query.appId):undefined,z.coerce.number().int().min(0).default(0).parse(req.query.offset)));});
 app.post(`${b}/actions/prepare`,async(req,res)=>{const {a,w}=context(req);res.json(await actions.prepare(a,w,req.body));});
 app.post(`${b}/sharing/prepare`,async(req,res)=>{const {a,w}=context(req);res.json(await sharing.prepare(a,w,req.body));});
 app.get(`${b}/sharing/:appId`,async(req,res)=>{const {a,w}=context(req);res.json(await sharing.list(a,w,id.parse(req.params.appId)));});
 app.post(`${b}/sharing/:shareId/revoke`,async(req,res)=>{const {a,w}=context(req);res.json(await sharing.revoke(a,w,id.parse(req.params.shareId)));});
 app.get(`${b}/reviews/:reviewId`,async(req,res)=>{const {a,w}=context(req);res.json(await actions.preview(a,w,id.parse(req.params.reviewId)));});
 app.post(`${b}/reviews/:reviewId/confirm`,async(req,res)=>{const {a,w}=context(req),v=z.object({digest:z.string().length(64),confirmed:z.literal(true)}).strict().parse(req.body),r=await actions.preview(a,w,id.parse(req.params.reviewId));res.json(r.kind==='sharing'?await sharing.confirm(a,w,r.id,v.digest):await actions.confirm(a,w,r.id,v.digest));});
 app.post(`${b}/actions/:actionId/run`,async(req,res)=>{const {a,w}=context(req),v=z.object({requestKey:id,recordId:id.optional()}).strict().parse(req.body);res.json(await actions.runNow(a,w,id.parse(req.params.actionId),v.requestKey,v.recordId));});
 app.post(`${b}/actions/:actionId/pause`,async(req,res)=>{const {a,w}=context(req);res.json(await actions.control(a,w,id.parse(req.params.actionId),z.boolean().parse(req.body.paused)));});
 app.get(`${b}/runs`,async(req,res)=>{const {a,w}=context(req);res.json(await actions.runs(a,w,req.query.appId?id.parse(req.query.appId):undefined,z.coerce.number().int().min(0).default(0).parse(req.query.offset)));});
 app.get(`${b}/runs/:runId`,async(req,res)=>{const {a,w}=context(req);res.json(await actions.status(a,w,id.parse(req.params.runId)));});
 app.post(`${b}/runs/:runId/cancel`,async(req,res)=>{const {a,w}=context(req);res.json(await actions.cancel(a,w,id.parse(req.params.runId)));});
 app.get(`${b}/jobs/:jobId`,async(req,res)=>{const {a,w}=context(req);res.json(await serviceJob(f.db,a,w,id.parse(req.params.jobId)));});
}
export function addAppServicesMcp(server:McpServer,f:WorkspaceFoundation,a:Actor,safe:any,metadata:any){
 const actions=new AppActions(f.db),sharing=new AppSharing(f.db),register=(name:string,description:string,schema:any,read:boolean,fn:(v:any)=>Promise<any>)=>server.registerTool(name,{description,inputSchema:{workspaceId:id,...schema},annotations:{readOnlyHint:read,openWorldHint:!read,destructiveHint:false},_meta:metadata},safe(fn));
 register('prepare_app_action','Prepare a scoped app action with manual, recurring, one-time date, record date or committed database-change triggers. Steps can send TrialAgents email notifications, call configured APIs including LLMs, and invoke bound functions. Returns an exact human review link. Approval authorizes repeated execution only within the named app/data/recipient/expiry scope. No effects run during preparation.',actionChange.shape,false,({workspaceId,...v})=>actions.prepare(a,workspaceId,v));
 register('list_app_actions','Read authorized saved app actions, their triggers and status. Does not execute them.',{appId:id.optional(),offset:z.number().int().min(0).default(0)},true,v=>actions.list(a,v.workspaceId,v.appId,v.offset));
 register('run_app_action','Run a previously human-authorized app action within its current approved scope. Use only when the user requests execution. Stable requestKey prevents duplicate runs.',{actionId:id,requestKey:id,recordId:id.optional()},false,v=>actions.runNow(a,v.workspaceId,v.actionId,v.requestKey,v.recordId));
 register('read_app_action_run','Read current status and permitted results of your app action run.',{runId:id},true,v=>actions.status(a,v.workspaceId,v.runId));
 register('read_app_action_runs','Read bounded execution history without running or refreshing the workspace.',{appId:id.optional(),offset:z.number().int().min(0).default(0)},true,v=>actions.runs(a,v.workspaceId,v.appId,v.offset));
 register('read_app_service_job','Read the status of an authorized long-running connector request or notification. Provider acceptance is distinct from email delivery.',{jobId:id},true,v=>serviceJob(f.db,a,v.workspaceId,v.jobId));
 register('prepare_app_sharing','Prepare sharing with a specific email or an anonymous public link. Recipient uses their TrialAgents account; there are no app-specific accounts or seats. Requires explicit source disclosure review and exact app/data access approval. Returns a trusted review link; no invitation is sent until approved.',sharingConfig.shape,false,({workspaceId,...v})=>sharing.prepare(a,workspaceId,v));
}
