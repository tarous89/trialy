import type {Database} from '../db/database.js';
import type {Actor} from '../shared/schema.js';
import {Service} from '../domain/service.js';
import {checksum} from '../domain/evidence.js';

// An invalidation hint, never an authorization decision or write token. Hash
// tuple identities, not source/record/document content. xmin also detects legacy
// writes that do not increment access_version. Keep every tuple in the digest:
// count + max(xmin) can miss changes to other rows or out-of-order commits.
// XOR of distinct SHA-256 tuple hashes plus a count uses constant aggregate
// state, with no sorted JSON array proportional to the workspace's history.
const group=(kind:string,from:string,fields:string,where:string,tuple=`jsonb_build_array(${fields})::text`)=>
 `SELECT '${kind}' AS kind,jsonb_build_array(count(*),coalesce(bit_xor(('x'||encode(sha256(convert_to(${tuple},'UTF8')),'hex'))::bit(256))::text,'')) AS versions FROM ${from} WHERE ${where}`;
const metadata:[string,string][]=[
 ['entity_types','id'],['workspace_nodes','id'],['workspace_components','id'],
 // Historical versions can still be attached or restrict AI source access.
 ['document_versions','id'],['document_access','document_id'],['document_controls','document_id'],
 ['folder_access','folder'],['foundation_functions','id']
];
// UUID keys and xmin have unambiguous text forms; avoid per-row JSON encoding
// for the large history tables. Arbitrary text/composite values keep JSON.
const parts=metadata.map(([table,key])=>group(table,`${table} t`,`t.workspace_id,t.${key},t.xmin::text`,'workspace_id=ANY($1::uuid[])',key==='folder'?undefined:`t.workspace_id::text||':'||t.${key}::text||':'||t.xmin::text`));
parts.push(
 group('project_records','project_records','id,xmin::text','workspace_id=ANY($1::uuid[]) AND revoked_at IS NULL',"id::text||':'||xmin::text"),
 group('workspaces','workspaces','id,xmin::text','id=ANY($1::uuid[])'),
 group('membership','memberships','tenant_id,xmin::text','user_id=$2 AND tenant_id IN (SELECT tenant_id FROM workspaces WHERE id=ANY($1::uuid[]))'),
 group('person','workspace_access','workspace_id,xmin::text','user_id=$2 AND workspace_id=ANY($1::uuid[])'),
 group('links','external_links','id,xmin::text','workspace_id=ANY($1::uuid[]) AND revoked_at IS NULL AND expires_at>now()'),
 group('previews','workspace_previews','id,xmin::text','workspace_id=ANY($1::uuid[]) AND user_id=$2 AND expires_at>now()'),
 // Execution timestamps change during normal worker runs, not Home metadata.
 group('schedules','foundation_schedules','id,revision_id,paused','workspace_id=ANY($1::uuid[]) AND user_id=$2'),
 group('automations','automations','id,name,paused,interval_minutes,home_project_id,home_placement_version','workspace_id=ANY($1::uuid[])'),
 ...['app_monitors','app_actions'].map(table=>group(table,table,"id,app_id,config->>'name',archived_with_app_at,deleted_at",'workspace_id=ANY($1::uuid[]) AND user_id=$2 AND archived_with_app_at IS NOT NULL'))
);
/** Uses ordinary actor-scoped queries/RLS. No private rows or identifiers leave this function. */
export async function homeRevision(db:Database,a:Actor){
 return homeRevisionForWorkspaces(db,a,await new Service(db).workspaces(a));
}
/** Internal only: reuse the authorized directory already read for a full Home response. */
export async function homeRevisionForWorkspaces(db:Database,a:Actor,spaces:{id:string}[]){
 // Fixed-size aggregate state/output does not make the scans constant work.
 const rows=spaces.length?(await db.query("SELECT kind,encode(sha256(convert_to(versions::text,'UTF8')),'hex') AS digest FROM ("+parts.join(' UNION ALL ')+') metadata ORDER BY kind',[spaces.map(w=>w.id),a.userId])).rows:[];
 return {revision:checksum(JSON.stringify([a.userId,a.origin,a.assistant??'chatgpt',spaces.map(w=>w.id),rows]))};
}
