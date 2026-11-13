import type {Database} from '../db/database.js';
import type {Actor} from '../shared/schema.js';
import {Service} from '../domain/service.js';
import {checksum} from '../domain/evidence.js';

// Only current metadata tuple identities, never source, records or document bytes.
// xmin detects updates even on legacy paths that do not bump access_version.
// This is an invalidation hint, NOT an authorization decision or a write token.
const metadata:[string,string][]=[
 ['entity_types','id'],['workspace_nodes','id'],['workspace_components','id'],
 ['document_versions','id'],['document_access','document_id'],['document_controls','document_id'],
 ['folder_access','folder'],['project_records','id'],['foundation_functions','id']
];
const parts=metadata.map(([table,key])=>`SELECT '${table}' AS kind,coalesce(jsonb_agg(jsonb_build_array(t.${key},t.xmin::text) ORDER BY t.${key}),'[]') AS versions FROM ${table} t WHERE workspace_id=ANY($1::uuid[])`);
parts.push(
 "SELECT 'workspaces',coalesce(jsonb_agg(jsonb_build_array(id,xmin::text) ORDER BY id),'[]') FROM workspaces WHERE id=ANY($1::uuid[])",
 "SELECT 'membership',coalesce(jsonb_agg(jsonb_build_array(tenant_id,xmin::text) ORDER BY tenant_id),'[]') FROM memberships WHERE user_id=$2 AND tenant_id IN (SELECT tenant_id FROM workspaces WHERE id=ANY($1::uuid[]))",
 "SELECT 'person',coalesce(jsonb_agg(jsonb_build_array(workspace_id,xmin::text) ORDER BY workspace_id),'[]') FROM workspace_access WHERE user_id=$2 AND workspace_id=ANY($1::uuid[])",
 "SELECT 'links',coalesce(jsonb_agg(jsonb_build_array(id,xmin::text) ORDER BY id),'[]') FROM external_links WHERE workspace_id=ANY($1::uuid[]) AND revoked_at IS NULL AND expires_at>now()",
 "SELECT 'previews',coalesce(jsonb_agg(jsonb_build_array(id,xmin::text) ORDER BY id),'[]') FROM workspace_previews WHERE workspace_id=ANY($1::uuid[]) AND user_id=$2 AND expires_at>now()",
 // Execution timestamps change during normal worker runs, not Home permissions/content.
 "SELECT 'schedules',coalesce(jsonb_agg(jsonb_build_array(id,revision_id,paused) ORDER BY id),'[]') FROM foundation_schedules WHERE workspace_id=ANY($1::uuid[]) AND user_id=$2",
 "SELECT 'automations',coalesce(jsonb_agg(jsonb_build_array(id,name,paused,interval_minutes,home_project_id,home_placement_version) ORDER BY id),'[]') FROM automations WHERE workspace_id=ANY($1::uuid[])",
 ...['app_monitors','app_actions'].map(table=>`SELECT '${table}',coalesce(jsonb_agg(jsonb_build_array(id,app_id,config->>'name',archived_with_app_at,deleted_at) ORDER BY id),'[]') FROM ${table} WHERE workspace_id=ANY($1::uuid[]) AND user_id=$2 AND archived_with_app_at IS NOT NULL`)
);
/** Uses ordinary actor-scoped queries/RLS. No grants, private rows or identifiers leave this function. */
export async function homeRevision(db:Database,a:Actor){
 return homeRevisionForWorkspaces(db,a,await new Service(db).workspaces(a));
}
/** Internal only: reuse the authorized directory already read for a full Home response. */
export async function homeRevisionForWorkspaces(db:Database,a:Actor,spaces:{id:string}[]){
 // Hash each metadata group in PostgreSQL so only bounded digests cross the wire.
 // The database still scans the matching metadata rows; this is not constant work.
 const rows=spaces.length?(await db.query("SELECT kind,encode(sha256(convert_to(versions::text,'UTF8')),'hex') AS digest FROM ("+parts.join(' UNION ALL ')+') metadata ORDER BY kind',[spaces.map(w=>w.id),a.userId])).rows:[];
 return {revision:checksum(JSON.stringify([a.userId,a.origin,a.assistant??'chatgpt',spaces.map(w=>w.id),rows]))};
}
