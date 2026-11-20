import type {Database,Connection} from '../db/database.js';
import {fail,type Actor} from '../shared/schema.js';
import {access} from './permissions.js';
import {audit} from './evidence.js';

/**
 * A11 (default D8): an organization owner removes a team member.
 *
 * The person loses membership, access and personal rules in every workspace of the organization.
 * Their app Owner roles move to the owner who removes them, and their automations are switched off
 * with a reason. The checks here give plain messages; trialy_security.remove_member repeats them
 * and makes every change in one transaction.
 */
export type RemovalSummary={userId:string;name:string;workspaces:number;apps:number;automations:number;automationKinds:{records:number;schedules:number;research:number;actions:number}};
export const removalReason=(name:string|null)=>`Switched off because ${name?.trim()||'this person'} left the organization.`;

export class MemberRemoval{
 constructor(readonly db:Database){}

 private async check(tx:Connection,a:Actor,w:string,userId:string){
  if(a.origin!=='human')fail(403,'owner_required','Only a signed-in organization owner can remove team members');
  const p=await access(tx,a,w);if(p.tenant_role!=='owner')fail(403,'owner_required','Only an organization owner can remove team members');
  if(userId===a.userId)fail(400,'self_removal','You cannot remove yourself. Ask another owner to do it.');
  const member=(await tx.query('SELECT u.name,m.role,m.kind FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.tenant_id=$1 AND m.user_id=$2',[p.tenant_id,userId])).rows[0];
  if(!member||member.kind==='public_link')fail(404,'not_found','This person is not in your organization');
  if(member.role==='owner')fail(409,'owner_member',`${member.name} is an owner. Make them a member first, then remove them.`);
  return {p,member};
 }

 /** What removing this person will change. Changes nothing. */
 async preview(a:Actor,w:string,userId:string):Promise<RemovalSummary>{
  const {member}=await this.check(this.db,a,w,userId);
  return {userId,name:member.name,...(await this.db.query('SELECT trialy_security.member_removal($1,$2) AS summary',[w,userId])).rows[0].summary};
 }

 async remove(a:Actor,w:string,userId:string):Promise<RemovalSummary>{
  return this.db.transaction(async tx=>{
   // No workspace lock here: the function locks every workspace of the organization in one order.
   const {p,member}=await this.check(tx,a,w,userId);
   const summary=(await tx.query('SELECT trialy_security.remove_member($1,$2,$3) AS summary',[w,userId,removalReason(member.name)])).rows[0].summary;
   await audit(tx,a,p,'member.removed',userId,{name:member.name,role:member.role,kind:member.kind},summary);
   return {userId,name:member.name,...summary};
  });
 }
}
