import type {Connection} from '../db/database.js';
import {fail,type Actor} from '../shared/schema.js';
import {access} from '../domain/permissions.js';
import {requireAppOwner} from '../domain/app-roles.js';

/**
 * T1 (session 6, package 6.1): automations belong to their app, and every owner of the app manages them.
 * An organization owner owns every app (D4). Without an app, a person may manage automations when they own
 * at least one app in the workspace (they still need the app check before touching a definition).
 */
export async function requireAutomationManager(db:Connection,a:Actor,w:string,appId?:string|null,write=true){
 const p=await access(db,a,w,write);
 if(p.role==='owner')return p;
 if(appId){await requireAppOwner(db,a,p,appId,'Only an owner of this app can manage its automations');return p;}
 const owns=(await db.query("SELECT 1 FROM app_members m JOIN workspace_components c ON c.id=m.app_id WHERE m.workspace_id=$1 AND m.user_id=$2 AND m.role='owner' AND c.deleted_at IS NULL LIMIT 1",[w,a.userId])).rows.length>0;
 if(!owns)fail(403,'owner_required','Only an owner of an app can manage its automations');
 return p;
}

/**
 * The linked owner is the person an automation runs as (D23, D27). A co-owner may see, switch off, archive
 * and move it, but changing what it does or switching it on would start work under someone else's rights:
 * that needs "Move to my account" first (D29 then decides whether it stays on).
 */
export function requireLinkedOwner(a:Actor,row:{user_id:string},linkedName?:string|null){
 if(row.user_id===a.userId)return;
 fail(409,'move_required',`This automation runs as ${linkedName||'another owner'}. Move it to your account to change it or switch it on.`);
}
