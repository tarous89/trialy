import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Connection,Database} from '../db/database.js';
import {fail,id,type Actor} from '../shared/schema.js';
import {appPublicUrl} from '../shared/public-url.js';
import {enqueueServiceJob} from '../app-services/jobs.js';
import {access} from './permissions.js';
import {appRole,roleRank,type AppRoleOrNone} from './app-roles.js';
import {AppRoles} from './app-sharing.js';
import {requireHuman} from './write-authorization.js';
import {audit} from './evidence.js';

/**
 * A5: a team member who cannot open an app, or can only view it, asks for access.
 * Everyone who may grant the requested role is told by email; the first answer counts.
 * Approving goes through AppRoles.setRole, so the same grant rules apply as in "People and roles".
 * The person who asked never receives the app's name here: they may not be able to open it.
 */
export const accessRequest=z.object({appId:id,role:z.enum(['viewer','editor']),note:z.string().trim().max(500).optional()}).strict();
export const accessDecision=z.object({appId:id,requestId:id,approve:z.boolean()}).strict();
const verb=(role:string)=>role==='editor'?'edit':'view';
/** An access rule that removed this person from the app: only an owner undoes a removal. */
const removed=(p:any,appId:string,userId:string)=>(p.permission_rules??[]).some((r:any)=>r.subject===userId&&r.kind==='tool'&&r.resourceId===appId&&r.read==='deny');
/** Who may answer: an owner always; an editor or viewer up to their own role. */
const VIEW_ONLY=['viewer','inspector'];
/** A person who is view-only in the organization cannot change roles (AppRoles.setRole refuses them), so they are not asked. */
const granting=(p:any,mine:AppRoleOrNone|null)=>VIEW_ONLY.includes(p.role)?null:mine;
const mayGrant=(mine:AppRoleOrNone|null,role:string,wasRemoved:boolean)=>mine==='owner'||!wasRemoved&&roleRank(mine)>=roleRank(role as AppRoleOrNone);
/** What the person who asked sees. No app name, no names of the people who answer. */
const own=(r:any)=>({id:r.id,appId:r.app_id,role:r.requested_role,note:r.note,status:r.status,createdAt:r.created_at,decidedAt:r.decided_at});
const ONE=`SELECT r.*,u.name,d.name AS decided_by_name,trialy_security.app_role(r.app_id,r.user_id) AS holds,EXISTS(SELECT 1 FROM workspace_access wa WHERE wa.workspace_id=r.workspace_id AND wa.user_id=r.user_id) AS in_team FROM app_access_requests r JOIN users u ON u.id=r.user_id LEFT JOIN users d ON d.id=r.decided_by WHERE r.workspace_id=$1 AND r.app_id=$2`;
/** What a person who may answer sees. */
const open=(r:any,p:any,mine:AppRoleOrNone|null)=>{const pending=r.status==='pending';return {...own(r),userId:r.user_id,name:r.name,...(r.decided_by?{decidedBy:r.decided_by_name,decidedById:r.decided_by}:{}),canApprove:pending&&mayGrant(granting(p,mine),r.requested_role,removed(p,r.app_id,r.user_id)),canDecline:pending&&granting(p,mine)==='owner'};};

export class AccessRequests{
 constructor(readonly db:Database){}

 /** Email is best effort: the request stays open and listed for the people who can answer it. */
 private async email(a:Actor,w:string,appId:string,key:string,step:'asked'|'answered',requestId:string,to:string,subject:string,text:string){
  try{await enqueueServiceJob(this.db,a,w,appId,'email',key,{origin:'human',accessRequest:{id:requestId,step},message:{to:[to],subject,text}},23*3600);return true;}
  catch(e:any){console.error(JSON.stringify({event:'access_request_email_not_queued',step,code:e?.code??null}));return false;}
 }

 async request(a:Actor,w:string,input:unknown){
  requireHuman(a);const v=accessRequest.parse(input),p=await access(this.db,a,w);
  const made=await this.db.transaction(async tx=>{
   const me=(await tx.query(`SELECT u.name,ms.kind,trialy_security.app_role($1,u.id) AS role,(SELECT c.name FROM workspace_components c WHERE c.id=$1 AND c.workspace_id=$2 AND c.deleted_at IS NULL AND NOT c.archived) AS app
    FROM memberships ms JOIN users u ON u.id=ms.user_id WHERE ms.tenant_id=$3 AND ms.user_id=$4`,[v.appId,w,p.tenant_id,a.userId])).rows[0];
   if(me?.kind!=='member')fail(403,'team_member_required','Only team members can ask for access');
   if(me.app===null)fail(404,'not_found','App unavailable');
   if(roleRank(me.role)>=roleRank(v.role))fail(409,'already_has_access','You already have this access');
   const pending=(await tx.query("SELECT * FROM app_access_requests WHERE app_id=$1 AND user_id=$2 AND status='pending' FOR UPDATE",[v.appId,a.userId])).rows[0];
   if(pending){
    if(roleRank(v.role)<=roleRank(pending.requested_role))return {r:pending,me};
    const r=(await tx.query('UPDATE app_access_requests SET requested_role=$2,note=coalesce($3,note) WHERE id=$1 RETURNING *',[pending.id,v.role,v.note||null])).rows[0];
    await audit(tx,a,p,'app.access_requested',v.appId,{requestId:r.id,role:pending.requested_role},{requestId:r.id,role:v.role});return {r,me};
   }
   if(Number((await tx.query("SELECT count(*) AS n FROM app_access_requests WHERE app_id=$1 AND user_id=$2 AND created_at>now()-interval '24 hours'",[v.appId,a.userId])).rows[0].n)>=3)fail(429,'request_limit','You asked several times today. Please try again tomorrow.');
   const r=(await tx.query("INSERT INTO app_access_requests(id,workspace_id,app_id,user_id,requested_role,note) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(app_id,user_id) WHERE status='pending' DO NOTHING RETURNING *",[randomUUID(),w,v.appId,a.userId,v.role,v.note||null])).rows[0];
   // Two requests at the same moment: the other one is the request.
   if(!r)return {r:(await tx.query("SELECT * FROM app_access_requests WHERE app_id=$1 AND user_id=$2 AND status='pending'",[v.appId,a.userId])).rows[0],me};
   await audit(tx,a,p,'app.access_requested',v.appId,null,{requestId:r.id,role:v.role});return {r,me};
  });
  const {r,me}=made,wasRemoved=removed(p,r.app_id,a.userId),link=appPublicUrl()+'/apps/'+r.app_id+'?workspaceId='+w+'&accessRequest='+r.id;
  // Team members only: guests and public links never answer a request.
  const team=(await this.db.query(`SELECT u.id,u.email,trialy_security.app_role($1,u.id) AS role FROM memberships ms JOIN users u ON u.id=ms.user_id LEFT JOIN workspace_access wa ON wa.workspace_id=$2 AND wa.user_id=u.id
   WHERE ms.tenant_id=$3 AND ms.kind='member' AND u.id<>$4 AND (ms.role='owner' OR wa.role<>ALL($5::text[])) ORDER BY u.id`,[r.app_id,w,p.tenant_id,a.userId,VIEW_ONLY])).rows.filter(g=>mayGrant(g.role,r.requested_role,wasRemoved));
  let emailed=0;
  for(const g of team)if(await this.email(a,w,r.app_id,'access-request:'+r.id+':'+r.requested_role+':'+g.id,'asked',r.id,g.email,`${me.name} asks to ${verb(r.requested_role)} ${me.app}`,
   `${me.name} asks to ${verb(r.requested_role)} ${me.app} in TrialAgents.${r.note?'\n\nTheir note: '+r.note:''}\n\nOpen the app to answer:\n${link}\n\nEveryone who can give this access received this email. The first answer counts.`))emailed++;
  return {...own(r),emailed:emailed>0};
 }

 /** Open requests the acting person may answer, and their own open request for this app. */
 async list(a:Actor,w:string,appId:string){
  const p=await access(this.db,a,w),mine=await appRole(this.db,a,p,appId);
  const rows=(await this.db.query(ONE+" AND r.status='pending' ORDER BY r.created_at,r.id",[w,appId])).rows,mineRow=rows.find(r=>r.user_id===a.userId);
  return {appId,role:mine,mine:mineRow?own(mineRow):null,
   // A request is moot once the person holds the role, or has left the team.
   requests:mine?rows.filter(r=>r.user_id!==a.userId&&r.in_team&&roleRank(r.holds)<roleRank(r.requested_role)).map(r=>open(r,p,mine)).filter(r=>r.canApprove):[]};
 }

 /** One request, open or answered: for the person who asked and for people who may answer it. */
 async read(a:Actor,w:string,appId:string,requestId:string){
  const p=await access(this.db,a,w),mine=await appRole(this.db,a,p,appId),r=(await this.db.query(ONE+' AND r.id=$3',[w,appId,requestId])).rows[0];
  if(r?.user_id===a.userId)return own(r);
  if(!r||roleRank(mine)<roleRank(r.requested_role))fail(404,'not_found','This request is not available');
  return open(r,p,mine);
 }

 async decide(a:Actor,w:string,input:unknown){
  requireHuman(a);const v=accessDecision.parse(input);
  const done=await this.db.transaction(async tx=>{
   // One transaction: the request row is locked first, so the first answer wins and a later one sees it.
   const db:Database={query:tx.query.bind(tx),transaction:fn=>fn(tx),close:async()=>{}};
   const locked=(await tx.query('SELECT id FROM app_access_requests WHERE id=$1 AND workspace_id=$2 AND app_id=$3 FOR UPDATE',[v.requestId,w,v.appId])).rows[0];
   const p=await access(tx,a,w),mine=await appRole(tx,a,p,v.appId),r=locked&&(await tx.query(ONE+' AND r.id=$3',[w,v.appId,v.requestId])).rows[0];
   if(!r||!mine||r.user_id===a.userId)fail(404,'not_found','This request is not available');
   if(r.status!=='pending'){if(roleRank(mine)<roleRank(r.requested_role))fail(404,'not_found','This request is not available');return {result:{...open(r,p,mine),alreadyHandled:true},tell:null as any};}
   await access(tx,a,w,true);let tables:{blockedTables:string[];readOnlyTables:string[]}={blockedTables:[],readOnlyTables:[]};
   if(!v.approve){if(mine!=='owner')fail(403,'app_owner_required','Only an owner of this app can decline a request');}
   // The grant itself is made and checked by the same code as "People and roles". Someone who holds the role already keeps it as it is.
   else if(roleRank(r.holds)<roleRank(r.requested_role)){const granted=await new AppRoles(db).setRole(a,w,{appId:v.appId,userId:r.user_id,role:r.requested_role});tables={blockedTables:granted.blockedTables,readOnlyTables:granted.readOnlyTables};}
   else if(roleRank(mine)<roleRank(r.requested_role))fail(403,'role_above_own','You cannot give this access');
   const status=v.approve?'approved':'declined';
   await tx.query('UPDATE app_access_requests SET status=$2,decided_by=$3,decided_at=now() WHERE id=$1',[r.id,status,a.userId]);
   await audit(tx,a,p,'app.access_request_decided',v.appId,{requestId:r.id,status:'pending'},{requestId:r.id,userId:r.user_id,role:r.requested_role,status});
   const after=(await tx.query(ONE+' AND r.id=$3',[w,v.appId,v.requestId])).rows[0],names=(await tx.query('SELECT (SELECT email FROM users WHERE id=$1) AS email,(SELECT name FROM workspace_components WHERE id=$2) AS app',[r.user_id,v.appId])).rows[0];
   return {result:{...open(after,p,mine),alreadyHandled:false,...tables},tell:{...names,by:after.decided_by_name,role:r.requested_role,approved:v.approve}};
  });
  if(done.tell){const t=done.tell,link=appPublicUrl()+'/apps/'+v.appId+'?workspaceId='+w;
   // A declined person may not be able to open the app, so that email does not name it.
   await this.email(a,w,v.appId,'access-answer:'+v.requestId,'answered',v.requestId,t.email,t.approved?`You can now ${verb(t.role)} ${t.app}`:'Your access request was declined',
    t.approved?`${t.by} gave you access to ${verb(t.role)} ${t.app} in TrialAgents.\n\nOpen the app:\n${link}`:`Your request to ${verb(t.role)} an app in TrialAgents was declined.\n\nYou can ask again from the app page:\n${link}`);}
  return done.result;
 }

 /** The person who asked withdraws an open request. */
 async cancel(a:Actor,w:string,appId:string,requestId:string){
  requireHuman(a);
  return this.db.transaction(async tx=>{
   const p=await access(tx,a,w),r=(await tx.query('SELECT * FROM app_access_requests WHERE id=$1 AND workspace_id=$2 AND app_id=$3 AND user_id=$4 FOR UPDATE',[requestId,w,appId,a.userId])).rows[0];
   if(!r)fail(404,'not_found','This request is not available');
   if(r.status!=='pending')return {...own(r),alreadyHandled:true};
   const after=(await tx.query("UPDATE app_access_requests SET status='cancelled',decided_by=$2,decided_at=now() WHERE id=$1 RETURNING *",[r.id,a.userId])).rows[0];
   await audit(tx,a,p,'app.access_request_cancelled',appId,{requestId:r.id,status:'pending'},{requestId:r.id,role:r.requested_role,status:'cancelled'});
   return {...own(after),alreadyHandled:false};
  });
 }
}

/** Run by the email worker just before sending: a request is announced only while it is open, an answer only by the person who gave it. */
export async function checkAccessRequestDelivery(db:Connection,j:any){
 const r=(await db.query('SELECT user_id,status,decided_by FROM app_access_requests WHERE id=$1 AND workspace_id=$2 AND app_id=$3',[j.payload.accessRequest.id,j.workspace_id,j.app_id])).rows[0];
 if(!r||(j.payload.accessRequest.step==='asked'?r.status!=='pending'||r.user_id!==j.user_id:!['approved','declined'].includes(r.status)||r.decided_by!==j.user_id))fail(403,'request_unavailable','This access request is no longer open');
 await access(db,{userId:j.user_id,origin:'human'},j.workspace_id);
}
