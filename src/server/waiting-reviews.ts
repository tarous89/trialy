import type {Express} from 'express';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {id,fail,type Actor} from '../shared/schema.js';
import type {Service} from '../domain/service.js';
import {WaitingReviews,WAITING_SOURCES,type WaitingSource} from '../domain/waiting-reviews.js';
import {AppActions} from '../app-services/service.js';
import {backgroundMetadata} from './ui-resource.js';
import {appPublicUrl} from '../shared/public-url.js';

/**
 * Approval screen (docs/TOOL_PERMISSIONS.md). The assistant prepares a review and calls show_review; the person approves
 * or declines it on the review page. approve_waiting_review and decline_waiting_review are app-only: the host hides them
 * from the assistant, and the server marks their calls as the person's click (footerApproval), as approve_workspace_change.
 */
const source=z.enum(WAITING_SOURCES as [WaitingSource,...WaitingSource[]]);
const reviewUrl=(w:string,s:WaitingSource|'legacy_monitors',reviewId?:string)=>appPublicUrl()+(s==='automation'?`/?tab=apps&workspaceId=${w}&serviceReview=${reviewId}`:s==='legacy_monitors'?`/?tab=automations&workspaceId=${w}`:`/?tab=review&workspaceId=${w}&waitingReview=${s}:${reviewId}`);

export function addWaitingReviewsMcp(server:McpServer,s:Service,a:Actor|undefined,safe:any,metadata:any){
 const reviews=new WaitingReviews(s),quiet=backgroundMetadata(metadata),appOnly={...quiet,ui:{visibility:['app']}};
 const ro={readOnlyHint:true,destructiveHint:false,openWorldHint:false};
 server.registerTool('list_waiting_reviews',{title:'Waiting for approval',description:'List reviews an assistant prepared that wait for the person to approve or decline in TrialAgents: automations, workspace changes that are not app changes, code-lab functions, permissions and schedules, and changes from code runs. Read only.',inputSchema:{workspaceId:id},annotations:ro,_meta:quiet},safe((v:any)=>reviews.list(a!,v.workspaceId)));
 server.registerTool('read_waiting_review',{title:'Read waiting review',description:'The exact details of one waiting review, as its review page shows them. Read only; approving is the person’s step.',inputSchema:{workspaceId:id,source,reviewId:id},annotations:ro,_meta:quiet},safe((v:any)=>reviews.read(a!,v.workspaceId,v.source,v.reviewId)));
 server.registerTool('show_review',{title:'Show review for approval',description:'Required after preparing anything the person must approve: an automation review (prepare_automation_setup, prepare_app_monitoring, prepare_app_action, prepare_app_automation_control, prepare_app_automation_feature; source automation), a workspace change that is not an app change (prepare_workspace_change; source workspace), a code-lab function, permission or schedule (preview_function, prepare_execution_control; source code), or changes from a code run (source run, reviewId is the runId). Opens that exact review in the extension, where the person approves or declines it; you cannot approve it. Moving an older monitor: source legacy_monitors, no reviewId, opens Automations where the person moves it. Where the host shows no extension, give the returned reviewUrl. Read only.',inputSchema:{workspaceId:id,source:z.enum(['automation','workspace','code','run','legacy_monitors']).default('automation'),reviewId:id.optional()},annotations:ro,_meta:metadata},safe(async(v:any)=>{
  if(v.source==='legacy_monitors')return {screen:'automations',workspaceId:v.workspaceId,approval:'person',reviewUrl:reviewUrl(v.workspaceId,'legacy_monitors')};
  if(!v.reviewId)fail(400,'invalid_input','reviewId is required for this source');
  if(v.source==='automation'){const r=await new AppActions(s.db).preview(a!,v.workspaceId,v.reviewId);if(r.consumed_at)fail(409,'review_saved','This review is already saved');
   return {screen:'review',source:'automation',workspaceId:v.workspaceId,reviewId:r.id,kind:r.kind,approval:'person',reviewUrl:reviewUrl(v.workspaceId,'automation',r.id)};}
  const r=await reviews.read(a!,v.workspaceId,v.source,v.reviewId);
  return {screen:'review',source:r.source,workspaceId:v.workspaceId,reviewId:r.reviewId,kind:r.kind,title:r.title,approval:'person',approveWhere:r.approveWhere,reviewUrl:reviewUrl(v.workspaceId,r.source,r.reviewId)};
 }));
 server.registerTool('approve_waiting_review',{title:'Approve',description:'Approve on the TrialAgents review page: saves the exact review with the person’s click. Not available to the assistant.',inputSchema:{workspaceId:id,source,reviewId:id,digest:z.string().length(64),confirmed:z.literal(true)},annotations:{readOnlyHint:false,destructiveHint:true,openWorldHint:false},_meta:appOnly},safe((v:any)=>reviews.approve(a!,v.workspaceId,v.source,v.reviewId,v.digest)));
 server.registerTool('decline_waiting_review',{title:'Decline',description:'Decline on the TrialAgents approval footer or review page: removes an unsaved review. Not available to the assistant.',inputSchema:{workspaceId:id,source,reviewId:id},annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},_meta:appOnly},safe((v:any)=>reviews.decline(a!,v.workspaceId,v.source,v.reviewId)));
}

/** The website's routes: the signed-in person (human origin) lists, reads, approves and declines. */
export function addWaitingReviewsApi(app:Express,s:Service){
 const reviews=new WaitingReviews(s),b='/api/workspaces/:workspaceId/waiting-reviews';
 const at=(req:any)=>({a:req.actor as Actor,w:id.parse(req.params.workspaceId),source:req.params.source?source.parse(req.params.source):undefined as any,reviewId:req.params.reviewId?id.parse(req.params.reviewId):undefined as any});
 app.get(b,async(req,res)=>{const {a,w}=at(req);res.set('Cache-Control','no-store').json(await reviews.list(a,w));});
 app.get(`${b}/:source/:reviewId`,async(req,res)=>{const {a,w,source:src,reviewId}=at(req);res.set('Cache-Control','no-store').json(await reviews.read(a,w,src,reviewId));});
 app.post(`${b}/:source/:reviewId/approve`,async(req,res)=>{const {a,w,source:src,reviewId}=at(req),v=z.object({digest:z.string().length(64),confirmed:z.literal(true)}).strict().parse(req.body);res.json(await reviews.approve(a,w,src,reviewId,v.digest));});
 app.delete(`${b}/:source/:reviewId`,async(req,res)=>{const {a,w,source:src,reviewId}=at(req);res.json(await reviews.decline(a,w,src,reviewId));});
}
