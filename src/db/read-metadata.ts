import {requestMetrics} from './metrics.js';
import {isDeepStrictEqual} from 'node:util';
import {AsyncLocalStorage} from 'node:async_hooks';
import type {Database,Connection} from './database.js';
import {databaseContext,withDatabaseContext} from './context.js';
import {fail} from '../shared/schema.js';

// Only deterministic permission/schema lookups. Never cache records, counts,
// audit events, pending previews, or anything across requests/actors.
const MEMBER_ROLE='(SELECT m.role FROM app_members m WHERE m.app_id=workspace_components.id AND m.user_id=$3) AS member_role';
const eligible=(sql:string)=>{
 const q=sql.replace(/\s+/g,' ').trim();
 return /^SELECT w\.\*, m\.role AS tenant_role,.* FROM workspaces w JOIN memberships m .* WHERE w\.id=\$1$/.test(q)
  || /^SELECT \* FROM (workspace_components|workspace_nodes|entity_types) WHERE id=\$1 AND workspace_id=\$2$/.test(q)
  // The app permission lookup (toolPolicy in src/domain/effective-access.ts), with and without saved source.
  || q===`SELECT id,project_id,allowed_users,ai_enabled,source_access,bindings,manifest,team_default_role,${MEMBER_ROLE} FROM workspace_components WHERE id=$1 AND workspace_id=$2`
  || q===`SELECT *,${MEMBER_ROLE} FROM workspace_components WHERE id=$1 AND workspace_id=$2`
  || q==='SELECT trialy_security.app_role($1,$2) AS role'
  || q==='SELECT data_level,apps_level FROM assistant_limits WHERE workspace_id=$1 AND user_id=$2 AND assistant=$3'
  || q==='SELECT fields FROM entity_types WHERE workspace_id=$1'
  || q==='SELECT fields FROM entity_types WHERE id=$1 AND workspace_id=$2'
  || q==='SELECT source FROM workspace_components WHERE id=$1 AND workspace_id=$2'
  || q==='SELECT allowed_users,ai_enabled FROM document_access WHERE workspace_id=$1 UNION ALL SELECT allowed_users,ai_enabled FROM folder_access WHERE workspace_id=$1'
  // L2.1: the person's own open app view (the version and read access it was opened with), read before every check of a run.
  || q==="SELECT * FROM app_runtime_views WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND app_id=$4 AND (origin=$5 OR ($5='human' AND origin='ai')) AND expires_at>now()"
  // L2.1: an installed app's catalog origin and that published version's installer schema (immutable once published).
  || q==="SELECT snapshot->'catalogOrigin' AS origin FROM revisions WHERE workspace_id=$1 AND object_id=$2 AND object_kind='workspace_component' AND jsonb_typeof(snapshot->'catalogOrigin')='object' ORDER BY version DESC LIMIT 1"
  || q==='SELECT install_schema FROM app_template_catalog WHERE template_id=$1 AND version=$2'
  // L2.1: which approved template provides a role, and which apps bind each role (src/workspace/role-contracts.ts, integrations.ts).
  || q==="SELECT template_id,version,digest,payload->>'name' AS name FROM app_template_catalog WHERE template_id=$1 AND status='approved' ORDER BY created_at DESC LIMIT 1"
  || /^SELECT id,name,source,bindings,manifest,archived,created_at FROM workspace_components WHERE workspace_id=\$1 AND deleted_at IS NULL (AND NOT archived )?ORDER BY archived,created_at,id$/.test(q);
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Lookups of one row by id in one workspace, verified together (select list, table). */
const BY_ID=/^SELECT (\*|fields|source) FROM (workspace_components|workspace_nodes|entity_types) WHERE id=\$1 AND workspace_id=\$2$/;
// Bounded per request. Large accounts need one entry per app, project and table in each actor scope;
// beyond the bound every lookup would be repeated in full.
const ENTRY_LIMIT=4096;
const sessions=new WeakSet<Database>();
/** Request-local reuse with an uncached final check of every reused result.
 * A concurrent permission/schema/source change rejects the entire response.
 * Normal final access checks also continue to execute against the database.
 */
export async function withReadMetadata<T>(db:Database,read:(db:Database)=>Promise<T>):Promise<T>{
 if(sessions.has(db))return read(db);
 type Entry={sql:string;values:any[];context:ReturnType<typeof databaseContext>;result:Promise<any>;hits:number};
 const entries=new Map<string,Entry>();
 const query:Connection['query']=async(sql,values=[])=>{
  if(!eligible(sql))return db.query(sql,values);
  const context=structuredClone(databaseContext()),key=JSON.stringify([context,sql,values]);
  // L2.1: one column of a row already looked up in full in this scope is taken from that row (which is then verified).
  const column=BY_ID.exec(sql.replace(/\s+/g,' ').trim());
  if(column&&column[1]!=='*'&&!entries.has(key)){const full=entries.get(JSON.stringify([context,`SELECT * FROM ${column[2]} WHERE id=$1 AND workspace_id=$2`,values]));
   if(full){full.hits++;const metrics=requestMetrics();if(metrics&&full.hits>0)metrics.metadataHits++;const r=await full.result;return {rows:r.rows.map((row:any)=>({[column[1]]:structuredClone(row[column[1]])})),rowCount:r.rowCount};}}
  let entry=entries.get(key);
  if(entry){entry.hits++;const metrics=requestMetrics();if(metrics&&entry.hits>0)metrics.metadataHits++;}
  else{
   if(entries.size>=ENTRY_LIMIT)return db.query(sql,values);
   entry={sql,values:structuredClone(values),context,result:db.query(sql,values),hits:0};entries.set(key,entry);
   entry.result.catch(()=>{entries.delete(key);});
  }
  // Callers may enrich returned metadata. Never mutate the saved comparison.
  // PostgreSQL transaction results also contain parser/type functions. Only the
  // Connection contract is data; never structured-clone the driver's internals.
  const result=await entry.result;
  return {rows:structuredClone(result.rows),rowCount:result.rowCount};
 };
 const scoped:Database={query,transaction:fn=>db.transaction(fn),close:async()=>{}};
 sessions.add(scoped);originals.set(scoped,db);
 // A primed entry's first use is its own fresh read (hits starts below zero); only later uses are reuses and verified.
 primers.set(scoped,async(table,ids,workspace)=>{
  const context=structuredClone(databaseContext()),wanted=[...new Set(ids.filter(id=>typeof id==='string'&&UUID.test(id)).map(id=>id.toLowerCase()))].filter(id=>!entries.has(JSON.stringify([context,`SELECT * FROM ${table} WHERE id=$1 AND workspace_id=$2`,[id,workspace]])));
  if(!wanted.length)return;
  const rows=(await db.query(`SELECT * FROM ${table} WHERE id=ANY($1::uuid[]) AND workspace_id=$2`,[wanted,workspace])).rows;
  for(const id of wanted){const found=rows.filter((r:any)=>String(r.id).toLowerCase()===id);
   const put=(sql:string,result:any[])=>{const key=JSON.stringify([context,sql,[id,workspace]]);if(!entries.has(key)&&entries.size<ENTRY_LIMIT)entries.set(key,{sql,values:[id,workspace],context,result:Promise.resolve({rows:result,rowCount:result.length}),hits:-1});};
   put(`SELECT * FROM ${table} WHERE id=$1 AND workspace_id=$2`,found);
  }
 });
 try{
  const value=await read(scoped);
  // Deliberately bypass the cache. Bounded sequential checks avoid pool floods.
  // L2.1: reused lookups of one table by id in one workspace (an app's tables, its project chain) are verified together,
  // in one query per table, instead of one query each. Every reused row is still compared in full.
  const groups=new Map<string,{context:Entry['context'];table:string;workspace:any;items:{entry:Entry;select:string}[]}>();
  for(const entry of entries.values())if(entry.hits>0){
   const byId=BY_ID.exec(entry.sql.replace(/\s+/g,' ').trim());
   if(byId&&entry.values.length===2&&typeof entry.values[0]==='string'&&UUID.test(entry.values[0])){const key=JSON.stringify([entry.context,byId[2],entry.values[1]]);const g=groups.get(key);if(g)g.items.push({entry,select:byId[1]});else groups.set(key,{context:entry.context,table:byId[2],workspace:entry.values[1],items:[{entry,select:byId[1]}]});continue;}
   const current=await withDatabaseContext(entry.context,()=>db.query(entry.sql,entry.values));
   if(!isDeepStrictEqual(current.rows,(await entry.result).rows))fail(409,'access_changed','Access or schema changed; reload this page');
  }
  for(const g of groups.values()){
   if(g.items.length===1){const [{entry}]=g.items;const current=await withDatabaseContext(entry.context,()=>db.query(entry.sql,entry.values));if(!isDeepStrictEqual(current.rows,(await entry.result).rows))fail(409,'access_changed','Access or schema changed; reload this page');continue;}
   const current=await withDatabaseContext(g.context,()=>db.query(`SELECT id::text AS trialy_verify_id, * FROM ${g.table} WHERE id=ANY($1::uuid[]) AND workspace_id=$2`,[[...new Set(g.items.map(i=>String(i.entry.values[0]).toLowerCase()))],g.workspace]));
   for(const {entry,select} of g.items){
    const rows=current.rows.filter((r:any)=>r.trialy_verify_id===String(entry.values[0]).toLowerCase()).map((r:any)=>{const {trialy_verify_id:ignored,...row}=r;return select==='*'?row:{[select]:row[select]};});
    if(!isDeepStrictEqual(rows,(await entry.result).rows))fail(409,'access_changed','Access or schema changed; reload this page');
   }
  }
  return value;
 }finally{entries.clear();sessions.delete(scoped);originals.delete(scoped);primers.delete(scoped);}
}
const primers=new WeakMap<Database,(table:'entity_types'|'workspace_nodes'|'workspace_components',ids:string[],workspace:string)=>Promise<void>>();
/** L2.1: inside a request-wide scope, look up several rows of one table by id in one query, so the per-row lookups that
 * follow (each table check of an app) are served from it. Outside a scope this does nothing. */
export async function primeById(db:Database,table:'entity_types'|'workspace_nodes'|'workspace_components',ids:string[],workspace:string){
 const session=sessions.has(db)?db:ambientDatabases.has(db)?(sessions.has(originals.get(db)!)?originals.get(db)!:ambient.getStore()?.base===originals.get(db)?ambient.getStore()!.scoped:undefined):undefined;
 const prime=session&&primers.get(session);if(prime&&ids.length>1)await prime(table,ids,workspace);
}
/** True inside withReadMetadata: the caller already shares one request-wide reuse scope. */
export function inReadMetadata(db:Database){return sessions.has(db)||ambientDatabases.has(db)&&sessions.has(originals.get(db)!);}
/** Explicit freshness boundary for reads that already recheck authorization. */
export function freshReadDatabase(db:Database):Database{return originals.get(db)??db;}
const originals=new WeakMap<Database,Database>();

// Bounded reuse for code that reaches the database through one long-lived object (the app runtime).
const ambient=new AsyncLocalStorage<{base:Database;scoped:Database}>(),ambientDatabases=new WeakSet<Database>();
/** A database whose reads join the scope opened by readMetadataScope, and are otherwise unchanged. */
export function ambientReadDatabase(db:Database):Database{
 if(ambientDatabases.has(db))return db;
 const view:Database={query:(sql,values)=>{const scope=ambient.getStore();return (scope?.base===db?scope.scoped:db).query(sql,values);},transaction:fn=>db.transaction(fn),close:async()=>{}};
 ambientDatabases.add(view);originals.set(view,db);return view;
}
/** One bounded unit of read work (a single permission check or a single app data read): identical
 * permission/schema lookups inside it run once, and every reused result is verified uncached before
 * the unit returns. Nothing is reused between units, so each read an app makes is still checked. */
export function readMetadataScope<T>(db:Database,read:()=>Promise<T>):Promise<T>{
 const base=ambientDatabases.has(db)?originals.get(db):undefined;
 if(!base||ambient.getStore())return read();
 return withReadMetadata(base,scoped=>ambient.run({base,scoped},read));
}
