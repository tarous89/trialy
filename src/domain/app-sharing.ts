import {z} from 'zod';
import type {Database} from '../db/database.js';
import {fail,id,type Actor} from '../shared/schema.js';
import {access} from './permissions.js';
import {applyTypePolicy,type AccessRule} from './effective-access.js';
import {appRole,requireAppOwner,roleRank,type AppRoleOrNone} from './app-roles.js';
import {requireHuman} from './write-authorization.js';
import {audit} from './evidence.js';

/**
 * R3–R5, A1, A5: who holds which role on one app, and changing it.
 *
 * An owner may set any role. An editor may grant Editor or Viewer, a viewer may grant Viewer.
 * Lowering or removing a role, and undoing a removal, is for owners. The database function
 * trialy_security.set_app_role applies the same rules again.
 */
export const appRoleChange=z.object({appId:id,userId:id,role:z.enum(['owner','editor','viewer','none'])}).strict();
export const teamDefaultChange=z.object({appId:id,role:z.enum(['editor','viewer','none'])}).strict();
const J=JSON.stringify;

/** The access rule that carries one person's role on one app. Guests receive the app's data scope; team members keep their own table access. */
export function roleRule(c:any,target:string,role:AppRoleOrNone,guest:boolean,existing?:AccessRule):AccessRule{
 const write=role==='editor'||role==='owner';
 const rule:AccessRule={...(existing?.shareId?{shareId:existing.shareId}:{}),subject:target,kind:'tool',resourceId:c.id,read:role==='none'?'deny':'allow',write:write?'allow':'deny'};
 if(guest&&role!=='none')rule.bindings=c.bindings.map((b:any)=>({toolId:c.id,typeId:b.typeId,fields:b.fields,writable:write?b.fields.filter((key:string)=>!c.manifest||c.manifest.fields.some((f:any)=>f.typeId===b.typeId&&f.field===key&&f.mode==='write')):[],projectId:c.manifest?.scope==='project'?c.project_id:null}));
 return rule;
}

export class AppRoles{
 constructor(readonly db:Database){}

 /** Everyone who could hold a role on this app, with the role they hold now. Visible to anyone who can open the app. */
 async members(a:Actor,w:string,appId:string){
  const p=await access(this.db,a,w),mine=await appRole(this.db,a,p,appId);if(!mine)fail(404,'not_found','App unavailable');
  const c=(await this.db.query('SELECT id,name,team_default_role FROM workspace_components WHERE id=$1 AND workspace_id=$2 AND deleted_at IS NULL',[appId,w])).rows[0];if(!c)fail(404,'not_found','App unavailable');
  const rows=(await this.db.query(`SELECT u.id,u.name,u.email,ms.role AS tenant_role,ms.kind,wa.role AS workspace_role,trialy_security.app_role($1,u.id) AS role,am.role AS recorded,am.granted_at,g.id AS granted_by,g.name AS granted_by_name
   FROM memberships ms JOIN users u ON u.id=ms.user_id LEFT JOIN workspace_access wa ON wa.workspace_id=$2 AND wa.user_id=u.id
   LEFT JOIN app_members am ON am.app_id=$1 AND am.user_id=u.id LEFT JOIN users g ON g.id=am.granted_by
   WHERE ms.tenant_id=$3 AND ms.kind<>'public_link' AND (ms.role='owner' OR wa.user_id IS NOT NULL) ORDER BY u.name,u.id`,[appId,w,p.tenant_id])).rows;
  const owner=mine==='owner';
  return {appId,name:c.name,role:mine,teamDefault:c.team_default_role,
   // What the acting person may hand out. Only owners lower or remove.
   canGrant:(['viewer','editor','owner'] as const).filter(r=>roleRank(r)<=roleRank(mine)),canLower:owner,canSetTeamDefault:owner,
   people:rows.filter(r=>owner||r.kind==='member').map(r=>{const organizationOwner=r.tenant_role==='owner'||r.workspace_role==='owner',granted=r.recorded&&r.recorded===r.role;return {userId:r.id,name:r.name,...(owner?{email:r.email}:{}),kind:r.kind,role:(r.role??'none') as AppRoleOrNone,organizationOwner,self:r.id===a.userId,
    // "Team default" when nobody set a role for this person.
    source:organizationOwner?'organization_owner':granted?'granted':r.role?'team_default':'none',...(granted?{grantedBy:r.granted_by_name,grantedById:r.granted_by,grantedAt:r.granted_at}:{})};})};
 }

 async setRole(a:Actor,w:string,input:unknown){
  requireHuman(a);const v=appRoleChange.parse(input);
  return this.db.transaction(async tx=>{
   await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);
   const p=await access(tx,a,w,true),mine=await appRole(tx,a,p,v.appId);if(!mine)fail(404,'not_found','App unavailable');
   const c=(await tx.query('SELECT id,name,project_id,bindings,manifest,source_access FROM workspace_components WHERE id=$1 AND workspace_id=$2 AND deleted_at IS NULL AND NOT archived',[v.appId,w])).rows[0];if(!c)fail(404,'not_found','App unavailable');
   if(v.userId===a.userId)fail(400,'own_role','You cannot change your own role');
   const t=(await tx.query('SELECT u.name,ms.role AS tenant_role,ms.kind,wa.role AS workspace_role,wa.direct_data FROM memberships ms JOIN users u ON u.id=ms.user_id LEFT JOIN workspace_access wa ON wa.workspace_id=$1 AND wa.user_id=ms.user_id WHERE ms.tenant_id=$2 AND ms.user_id=$3',[w,p.tenant_id,v.userId])).rows[0];
   if(!t||(!t.workspace_role&&t.tenant_role!=='owner'))fail(404,'not_in_team','Add this person to the team first');
   if(t.tenant_role==='owner'||t.workspace_role==='owner')fail(400,'organization_owner','Organization owners already own every app');
   const guest=t.kind!=='member';
   if(guest&&mine!=='owner')fail(403,'app_owner_required','Only an app owner can change a guest\'s access');
   if(guest&&v.role==='owner')fail(400,'guest_owner','Only team members can own an app');
   const theirs=((await tx.query('SELECT trialy_security.app_role($1,$2) AS role',[v.appId,v.userId])).rows[0].role??'none') as AppRoleOrNone;
   const existing=(p.permission_rules??[]).find((r:AccessRule)=>r.subject===v.userId&&r.kind==='tool'&&r.resourceId===v.appId) as AccessRule|undefined;
   if(mine!=='owner'){
    if(roleRank(v.role)<roleRank(theirs)||existing?.read==='deny')fail(403,'app_owner_required','Only an app owner can lower or remove access');
    if(roleRank(v.role)>roleRank(mine))fail(403,'role_above_own',mine==='viewer'?'As a viewer you can share this app for viewing only':'As an editor you can grant Editor or Viewer');
   }
   const write=v.role==='editor'||v.role==='owner';
   if(guest&&v.role!=='none'&&c.source_access!=='bindings')fail(409,'review_tool_source','This app holds saved data in its code. Save a reviewed connected-data version before sharing it with a guest.');
   const rule=roleRule(c,v.userId,v.role,guest,existing);
   await tx.query('SELECT trialy_security.set_app_role($1,$2,$3,$4)',[v.appId,v.userId,v.role,J(rule)]);
   await audit(tx,a,p,'app.role_changed',v.appId,{userId:v.userId,role:theirs},{userId:v.userId,role:v.role,grantedBy:a.userId});
   // A5: tell the person sharing when the recipient cannot see tables the app uses. Sharing an app never widens table access.
   // An Editor or Owner whose table access is view-only can use the app but not change records in those tables (R4).
   const blockedTables:string[]=[],readOnlyTables:string[]=[];
   if(!guest&&v.role!=='none'){const target:Actor={userId:v.userId,origin:'human',accessToolId:v.appId} as Actor;
    try{const tp=await access(tx,target,w);for(const b of c.bindings){const type=(await tx.query('SELECT * FROM entity_types WHERE id=$1 AND workspace_id=$2',[b.typeId,w])).rows[0];if(!type)continue;const policy=await applyTypePolicy(tx,target,tp,type);if(!policy.read_fields.length)blockedTables.push(type.name);else if(write&&!policy.write_fields.length)readOnlyTables.push(type.name);}}catch{/* The warning is advisory; the grant itself is already decided. */}}
   return {appId:v.appId,userId:v.userId,name:t.name,role:v.role,previous:theirs,blockedTables,readOnlyTables};
  });
 }

 /** A1: the role team members hold when nobody set one for them. Guests never receive it (D7). */
 async setTeamDefault(a:Actor,w:string,input:unknown){
  requireHuman(a);const v=teamDefaultChange.parse(input);
  return this.db.transaction(async tx=>{
   await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);
   const p=await access(tx,a,w,true);await requireAppOwner(tx,a,p,v.appId,'Only an owner of this app can change the team default');
   const before=(await tx.query('SELECT team_default_role FROM workspace_components WHERE id=$1 AND workspace_id=$2 AND deleted_at IS NULL',[v.appId,w])).rows[0];if(!before)fail(404,'not_found','App unavailable');
   if(before.team_default_role!==v.role){await tx.query('UPDATE workspace_components SET team_default_role=$1 WHERE id=$2 AND workspace_id=$3',[v.role,v.appId,w]);await tx.query('UPDATE workspaces SET access_version=access_version+1 WHERE id=$1',[w]);await audit(tx,a,p,'app.team_default_changed',v.appId,{teamDefault:before.team_default_role},{teamDefault:v.role});}
   return {appId:v.appId,teamDefault:v.role};
  });
 }
}
