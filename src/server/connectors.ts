import type {Express} from 'express';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {id,type Actor} from '../shared/schema.js';
import type {WorkspaceFoundation} from '../workspace/service.js';
import {Connectors} from '../connectors/service.js';
import {connectorApproval,connectorChange,connectorCall} from '../connectors/schema.js';
export const connectorsFor=(f:WorkspaceFoundation)=>new Connectors(f.db,(tx,a,w,appId)=>f.component(tx,a,w,appId));
export function addConnectorApi(app:Express,f:WorkspaceFoundation){
 const c=connectorsFor(f),base='/api/workspaces/:workspaceId/connectors';
 const context=(req:any)=>({a:req.actor as Actor,w:id.parse(req.params.workspaceId)}),offset=z.coerce.number().int().min(0).max(1000000).default(0);
 app.get(base,async(req,res)=>{const {a,w}=context(req);res.json(await c.list(a,w,offset.parse(req.query.offset)));});
 app.post(`${base}/prepare`,async(req,res)=>{const {a,w}=context(req);res.json(await c.prepare(a,w,req.body));});
 app.get(`${base}/reviews/:reviewId`,async(req,res)=>{const {a,w}=context(req);res.json(await c.readReview(a,w,id.parse(req.params.reviewId)));});
 app.post(`${base}/reviews/:reviewId/confirm`,async(req,res)=>{const {a,w}=context(req),v=connectorApproval.parse(req.body),reviewId=id.parse(req.params.reviewId),review=await c.readReview(a,w,reviewId);res.json(review.kind==='config'?await c.confirmConfig(a,w,reviewId,v.digest):await c.confirmInvocation(a,w,reviewId,v.digest));});
 app.post(`${base}/call`,async(req,res)=>{const {a,w}=context(req);res.json(await c.call(a,w,req.body));});
 app.post(`${base}/results/:invocationId/propose`,async(req,res)=>{const {a,w}=context(req);res.json(await f.preview(a,w,await c.responseChange(a,w,id.parse(req.params.invocationId),req.body)));});
 app.get(`${base}/:connectionId/activity`,async(req,res)=>{const {a,w}=context(req);res.json(await c.activity(a,w,id.parse(req.params.connectionId),offset.parse(req.query.offset)));});
 app.post(`${base}/:connectionId/credential`,async(req,res)=>{const {a,w}=context(req);res.json(await c.replaceSecret(a,w,id.parse(req.params.connectionId),req.body));});
 app.post(`${base}/:connectionId/disable`,async(req,res)=>{const {a,w}=context(req),v=z.object({expectedVersion:z.number().int().min(0),remove:z.boolean().default(false),confirmed:z.literal(true)}).strict().parse(req.body);res.json(await c.disable(a,w,id.parse(req.params.connectionId),v.expectedVersion,v.remove));});
 app.get(`${base}/:connectionId`,async(req,res)=>{const {a,w}=context(req);res.json(await c.read(a,w,id.parse(req.params.connectionId)));});
}
// Additive builder operations. Credential entry and approval intentionally have no model tool.
export function addConnectorMcp(server:McpServer,f:WorkspaceFoundation,a:Actor,safe:any,metadata:any){
 const c=connectorsFor(f),register=(name:string,description:string,inputSchema:any,readOnlyHint:boolean,fn:(v:any)=>Promise<any>)=>server.registerTool(name,{description,inputSchema,annotations:{readOnlyHint,openWorldHint:false,destructiveHint:false},_meta:metadata},safe(fn));
 register('list_connectors','Discover authorized outbound connectors. Never request credentials in chat.',{workspaceId:id,offset:z.number().int().min(0).default(0)},true,v=>c.list(a,v.workspaceId,v.offset));
 register('read_connector','Read safe connector configuration, operation schemas and credential status; never secret values.',{workspaceId:id,connectionId:id},true,v=>c.read(a,v.workspaceId,v.connectionId));
 register('prepare_connector','Prepare a generic HTTPS connector or revise its configuration, app/user bindings and field mappings. No credentials accepted. Requires human review in the trusted app before saving.',{workspaceId:id,...connectorChange.shape},false,({workspaceId,...v})=>c.prepare(a,workspaceId,v));
 register('prepare_connector_call','Prepare an exact connector request for human review. This tool never dispatches external requests.',{workspaceId:id,...connectorCall.shape},false,({workspaceId,...v})=>c.prepareCall(a,workspaceId,v));
 register('read_connector_activity','Read authorized usage counters and receipt metadata. No raw request bodies, headers or credentials.',{workspaceId:id,connectionId:id,offset:z.number().int().min(0).default(0)},true,v=>c.activity(a,v.workspaceId,v.connectionId,v.offset));
}
