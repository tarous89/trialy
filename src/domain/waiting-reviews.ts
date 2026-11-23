import type {Database} from '../db/database.js';
import {access} from './permissions.js';
import {isExchangeOperation} from './external-exchange.js';
import {fail,type Actor} from '../shared/schema.js';
import type {Service} from './service.js';
import {WorkspaceFoundation} from '../workspace/service.js';
import {Foundation} from '../foundation/service.js';
import {AppActions} from '../app-services/service.js';

/**
 * Approval screen (docs/TOOL_PERMISSIONS.md): every review an assistant prepared outside an app, waiting for the person.
 * The assistant prepares; the person approves or declines on the review page, which calls approve/decline here through
 * tools the assistant cannot call. Each source keeps its own checks: these functions only route to them.
 *
 * - automation: automation reviews (app_service_previews); their review page is the existing automation review.
 * - workspace: workspace changes that are not app changes (workspace_previews, origin ai, change_class other).
 * - code: code-lab function, permission and schedule previews an assistant prepared (foundation_previews).
 * - run: changes a finished code run proposes and nobody saved yet (foundation_runs); who started it is not recorded.
 */
export type WaitingSource='automation'|'workspace'|'code'|'run';
export const WAITING_SOURCES:WaitingSource[]=['automation','workspace','code','run'];
export type WaitingReview={source:WaitingSource;reviewId:string;digest:string;kind:string;title:string;assistant:string|null;expiresAt:string|null;approveWhere:'here'|'website'};

/** Only a person sends, publishes, replies or accepts outside the workspace (service.ts); approve those on the website. */
const PERSON_ONLY=['send_exchange_email','publish_exchange_clarification','accept_exchange_submission','accept_exchange_file','reply_exchange','reply_exchanges'];
const WORKSPACE_TITLES:Record<string,string>={
 create_node:'Create a project',rename_node:'Rename a project',create_collection_link:'Share a form or live view',
 revoke_collection_link:'Stop a shared link',setup_tracking:'Set up tracking',
 save_table_mapping:'Save a table mapping',revoke_table_mapping:'Remove a table mapping',link_cross_table_identity:'Link records across tables',
 unlink_cross_table_identity:'Unlink records across tables',prefer_record_fact:'Use a record value',send_exchange_email:'Send an email',
};
const sentence=(kind:string)=>{const t=kind.replaceAll('_',' ');return t.charAt(0).toUpperCase()+t.slice(1);};
const named=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim().slice(0,120):null;
const iso=(v:unknown)=>{if(!v)return null;const d=new Date(v as any);return d.getUTCFullYear()>=9999?null:d.toISOString();};
function workspaceTitle(op:any){const base=WORKSPACE_TITLES[op?.kind]??sentence(String(op?.kind??'change'));const name=named(op?.name)??named(op?.title)??named(op?.setup?.name);return name?`${base}: ${name}`:base;}
function codeTitle(kind:string,body:any){
 if(kind==='function')return 'Save function: '+(named(body?.name)??named(body?.function?.name)??'new function');
 if(kind==='grant'){const n=Array.isArray(body?.typeIds)?body.typeIds.length:1;return `Allow a function to change ${n===1?'one table':n+' tables'}`;}
 return 'Schedule a function';
}

export class WaitingReviews{
 readonly db:Database;private ws:WorkspaceFoundation;private code:Foundation;private actions:AppActions;
 constructor(s:Service){this.db=s.db;this.ws=new WorkspaceFoundation(s.db);this.code=new Foundation(s.db,s);this.actions=new AppActions(s.db);}

 /** Everything waiting, newest sources first. A source the person cannot use (automations off, no code lab) lists nothing. */
 async list(a:Actor,w:string):Promise<WaitingReview[]>{
  await access(this.db,a,w);
  const parts=await Promise.all([this.automation(a,w),this.workspace(a,w),this.codePreviews(a,w),this.runs(a,w)].map(p=>p.catch(()=>[] as WaitingReview[])));
  return parts.flat();
 }
 private async automation(a:Actor,w:string):Promise<WaitingReview[]>{
  return (await this.actions.waiting(a,w)).map(r=>({source:'automation' as const,reviewId:r.reviewId,digest:r.digest,kind:r.kind,title:r.title,assistant:r.assistant??null,expiresAt:r.expiresAt,approveWhere:'here' as const}));
 }
 private async workspace(a:Actor,w:string):Promise<WaitingReview[]>{
  // pending() applies every visibility and staleness check; the row columns say who prepared it.
  const mine=(await this.db.query("SELECT id,assistant FROM workspace_previews WHERE workspace_id=$1 AND user_id=$2 AND origin='ai' AND change_class='other' AND expires_at>now()",[w,a.userId])).rows;
  if(!mine.length)return [];
  const by=new Map(mine.map((r:any)=>[r.id,r.assistant]));
  return (await this.ws.pending(a,w)).filter((p:any)=>by.has(p.id)).map((p:any)=>({source:'workspace' as const,reviewId:p.id,digest:p.digest,kind:p.body?.kind??'change',title:workspaceTitle(p.body),assistant:by.get(p.id)??null,expiresAt:iso(p.expiresAt),approveWhere:isExchangeOperation(p.body)&&PERSON_ONLY.includes(p.body.kind)?'website' as const:'here' as const}));
 }
 private async codePreviews(a:Actor,w:string):Promise<WaitingReview[]>{
  const mine=(await this.db.query('SELECT id,assistant FROM foundation_previews WHERE workspace_id=$1 AND user_id=$2 AND assistant IS NOT NULL AND expires_at>now()',[w,a.userId])).rows;
  if(!mine.length)return [];
  const by=new Map(mine.map((r:any)=>[r.id,r.assistant]));
  return (await this.code.pendingApprovals(a,w)).filter((p:any)=>by.has(p.id)).map((p:any)=>({source:'code' as const,reviewId:p.id,digest:p.digest,kind:p.kind,title:codeTitle(p.kind,p.body),assistant:by.get(p.id)??null,expiresAt:iso(p.expiresAt),approveWhere:'here' as const}));
 }
 private async runs(a:Actor,w:string):Promise<WaitingReview[]>{
  const rows=(await this.db.query("SELECT r.id,r.proposal_digest,r.expires_at FROM foundation_runs r WHERE r.workspace_id=$1 AND r.user_id=$2 AND r.status='succeeded' AND r.proposal IS NOT NULL AND NOT r.cancel_requested AND r.expires_at>now() AND NOT EXISTS (SELECT 1 FROM foundation_receipts c WHERE c.id=r.id) ORDER BY r.expires_at DESC LIMIT 20",[w,a.userId])).rows;
  return rows.map((r:any)=>({source:'run' as const,reviewId:r.id,digest:r.proposal_digest,kind:'run_changes',title:'Save changes from a code run',assistant:null,expiresAt:iso(r.expires_at),approveWhere:'here' as const}));
 }

 /** The review page: what will be saved, exactly. Automation reviews use their own page (read_app_service_review). */
 async read(a:Actor,w:string,source:WaitingSource,id:string){
  const item=(await this.list(a,w)).find(r=>r.source===source&&r.reviewId===id);
  if(!item)fail(404,'not_found','This review is no longer waiting: it was saved, declined, expired or changed. Ask your assistant to prepare it again.');
  let details:unknown;
  if(source==='workspace'){const {id:_i,workspaceId:_w,workspaceFoundation:_f,digest:_d,expiresAt:_e,...rest}=(await this.ws.pending(a,w)).find((p:any)=>p.id===id) as any;details=rest;}
  else if(source==='code')details=(await this.code.pendingApprovals(a,w)).find((p:any)=>p.id===id)?.body;
  else if(source==='run'){const r=(await this.db.query('SELECT proposal,result FROM foundation_runs WHERE id=$1 AND workspace_id=$2 AND user_id=$3',[id,w,a.userId])).rows[0];details={proposal:r?.proposal,result:r?.result??null};}
  else details=(await this.actions.preview(a,w,id)).body;
  return {...item,details};
 }

 /** Approve on the review page: the person's click, with the digest they saw. */
 async approve(a:Actor,w:string,source:WaitingSource,id:string,digest:string){
  const person:Actor={...a,actionConfirmed:true,footerApproval:true};
  if(source==='workspace'){
   const row=(await this.db.query("SELECT change_class FROM workspace_previews WHERE id=$1 AND workspace_id=$2 AND user_id=$3",[id,w,a.userId])).rows[0];
   if(!row)fail(404,'not_found','Review unavailable');
   if(row.change_class!=='other')fail(409,'app_change','Approve app changes in the approval footer of the app itself');
   return this.ws.confirm(person,w,id,digest,null);
  }
  if(source==='code'){
   const row=(await this.db.query('SELECT kind FROM foundation_previews WHERE id=$1 AND workspace_id=$2 AND user_id=$3',[id,w,a.userId])).rows[0];
   if(!row)fail(404,'not_found','Review unavailable');
   return row.kind==='function'?this.code.saveFunction(person,w,id,digest):this.code.confirmControl(person,w,id,digest);
  }
  if(source==='run')return this.code.commit(person,w,id,digest);
  fail(400,'automation_review','Approve automation reviews on their review page');
 }

 /** Decline: removes an unsaved review; never anything saved. */
 async decline(a:Actor,w:string,source:WaitingSource,id:string){
  const person:Actor={...a,actionConfirmed:true,footerApproval:true};
  if(source==='automation')return this.actions.decline(person,w,id);
  if(source==='workspace'){await this.ws.discard(person,w,id);return {status:'declined',source,reviewId:id};}
  if(source==='code'){await this.code.discardFunction(person,w,id);return {status:'declined',source,reviewId:id};}
  const r=(await this.db.query("UPDATE foundation_runs SET expires_at=now() WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND status='succeeded' AND NOT EXISTS (SELECT 1 FROM foundation_receipts c WHERE c.id=$1) RETURNING id",[id,w,a.userId])).rows[0];
  if(!r)fail(404,'not_found','Review unavailable or already saved');
  return {status:'declined',source,reviewId:id};
 }
}
