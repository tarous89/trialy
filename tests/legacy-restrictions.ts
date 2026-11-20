import type {Connection} from '../src/db/database.js';
// A2, D1: per-column permissions can no longer be created through any interface. Older organizations still have them,
// and they must keep being enforced, so tests seed them directly, the way they already exist in those databases.
type Db={query:Connection['query']};
type Level='inherit'|'allow'|'deny';
/** True for the refusal every interface gives when asked for a new or tighter column restriction. */
export const retired=(e:any)=>e?.status===409&&e?.code==='column_permissions_retired';
/** An older column rule in workspaces.permission_rules. Defaults to hidden (read and write denied). Replaces a rule for the same subject and column. */
export async function seedColumnRule(db:Db,workspaceId:string,rule:{subject:string;resourceId:string;field:string;read?:Level;write?:Level}){
 const r={subject:rule.subject,kind:'column',resourceId:rule.resourceId,field:rule.field,read:rule.read??'deny',write:rule.write??'deny'};
 await db.query(`UPDATE workspaces SET permission_rules=(SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM jsonb_array_elements(permission_rules) x WHERE NOT(x->>'subject'=$2 AND x->>'kind'='column' AND x->>'resourceId'=$3 AND x->>'field'=$4))||$5::jsonb,access_version=access_version+1 WHERE id=$1`,[workspaceId,r.subject,r.resourceId,r.field,JSON.stringify([r])]);
}
/** Older hidden fields in workspace_access.hidden_fields: a bare key hides it in every table, "table:key" in one. The person must already have access. */
export async function seedHiddenFields(db:Db,workspaceId:string,userId:string,fields:string[]){
 const done=await db.query('UPDATE workspace_access SET hidden_fields=$3::jsonb WHERE workspace_id=$1 AND user_id=$2 RETURNING user_id',[workspaceId,userId,JSON.stringify(fields)]);
 if(!done.rows.length)throw Error('Share the workspace with this person before seeding hidden fields');
 await db.query('UPDATE workspaces SET access_version=access_version+1 WHERE id=$1',[workspaceId]);
}
