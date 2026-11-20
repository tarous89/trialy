import type {Connection,Database} from '../db/database.js';
import {access} from './permissions.js';
import {audit} from './evidence.js';
import {fail,type Actor} from '../shared/schema.js';
const LAST_OWNER='An organization needs at least one owner';
/** A8: billing and subscription are for organization owners. True when this person owns at least one organization. */
export const ownsAnOrganization=async(db:Connection,userId:string)=>(await db.query("SELECT 1 FROM memberships WHERE user_id=$1 AND role='owner' LIMIT 1",[userId])).rows.length>0;
/** R1: an organization can have several owners and never none. */
export class Organization{
 constructor(private db:Database){}
 /**
  * An owner makes a team member an owner, or makes an owner (also themselves) a team member again.
  * A former owner keeps working as an editor: owners need no access row, a team member does, so the missing ones are added.
  */
 async setOwner(a:Actor,w:string,userId:string,role:'owner'|'member'){
  if(a.origin!=='human')fail(403,'human_required','Only a signed-in person can change organization owners');
  return this.db.transaction(async tx=>{
   const p=await access(tx,a,w);if(p.role!=='owner')fail(403,'owner_required','Only organization owners can change owners');
   if(p.archived)fail(409,'workspace_archived','Workspace is read-only while archived');
   // Workspaces first, then people: the order every other access change locks in.
   const spaces=(await tx.query('SELECT id,tenant_id,archived FROM workspaces WHERE tenant_id=$1 ORDER BY id FOR UPDATE',[p.tenant_id])).rows.filter(s=>!s.archived);
   const owners=(await tx.query("SELECT user_id FROM memberships WHERE tenant_id=$1 AND role='owner' FOR UPDATE",[p.tenant_id])).rows.map(r=>r.user_id);
   if(!owners.includes(a.userId))fail(403,'owner_required','Only organization owners can change owners');
   const target=(await tx.query('SELECT role,kind FROM memberships WHERE tenant_id=$1 AND user_id=$2 FOR UPDATE',[p.tenant_id,userId])).rows[0];
   if(!target||target.kind==='public_link')fail(404,'not_found','This person is not in your organization');
   if(target.kind!=='member')fail(409,'not_team_member','Add this person to the team first');
   if((target.role==='owner')===(role==='owner'))return {userId,role,changed:false};
   let added:string[]=[],revoked:any[]=[];
   if(role==='member'){
    if(owners.length<2)fail(409,'last_owner',LAST_OWNER);
    added=(await tx.query("INSERT INTO workspace_access(workspace_id,user_id,role) SELECT id,$2::uuid,'editor' FROM workspaces WHERE tenant_id=$1 AND NOT archived ON CONFLICT DO NOTHING RETURNING workspace_id",[p.tenant_id,userId])).rows.map(r=>r.workspace_id);
    // Invitations work only while the person who sent them is an owner, so pending ones end here instead of failing later.
    revoked=(await tx.query('UPDATE workspace_invitations SET revoked_at=now() WHERE owner_id=$2 AND accepted_by IS NULL AND revoked_at IS NULL AND workspace_id IN (SELECT id FROM workspaces WHERE tenant_id=$1 AND NOT archived) RETURNING id,workspace_id',[p.tenant_id,userId])).rows;
   }
   await tx.query('UPDATE workspaces SET access_version=access_version+1 WHERE tenant_id=$1 AND NOT archived',[p.tenant_id]);
   // Recorded in every workspace of the organization: each one gains or loses an owner.
   for(const s of spaces){const ended=revoked.filter(r=>r.workspace_id===s.id).map(r=>r.id);await audit(tx,a,s,role==='owner'?'organization.owner_added':'organization.owner_removed',userId,{owner:role!=='owner'},role==='owner'?{owner:true}:{owner:false,editorAccessAdded:added.includes(s.id),...(ended.length?{invitationsRevoked:ended}:{})});}
   // Last, so a person stepping down still holds the owner's rights for the changes above.
   await tx.query('UPDATE memberships SET role=$3 WHERE tenant_id=$1 AND user_id=$2',[p.tenant_id,userId,role==='owner'?'owner':'editor']);
   return {userId,role,changed:true};
  }).catch(e=>{if(String(e?.message).includes(LAST_OWNER))fail(409,'last_owner',LAST_OWNER);throw e;});
 }
}
