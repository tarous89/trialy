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
  || q==='SELECT allowed_users,ai_enabled FROM document_access WHERE workspace_id=$1 UNION ALL SELECT allowed_users,ai_enabled FROM folder_access WHERE workspace_id=$1';
};
// Bounded per request. Large accounts need one entry per app, project and table in each actor scope;
// beyond the bound every lookup would be repeated in full.
const ENTRY_LIMIT=4096;
// Table definitions are looked up one table at a time by many checks. Inside one unit they can be loaded for all of an
// app's tables in one query (primeEntityTypes) and verified in one query at the end; the results are the same rows.
const TYPE_ROW='SELECT * FROM entity_types WHERE id=$1 AND workspace_id=$2',TYPE_FIELDS='SELECT fields FROM entity_types WHERE id=$1 AND workspace_id=$2';
const TYPE_BATCH='SELECT * FROM entity_types WHERE workspace_id=$1 AND id=ANY($2::uuid[])';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const primers=new WeakMap<Database,(workspaceId:string,typeIds:string[])=>Promise<void>>();
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
  let entry=entries.get(key);
  if(entry){entry.hits++;const metrics=requestMetrics();if(metrics)metrics.metadataHits++;}
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
 // One query loads the definitions of several tables into this unit. Entries start unused: one that is then used is
 // verified at the end like any other reused result.
 primers.set(scoped,async(workspaceId,typeIds)=>{
  const context=structuredClone(databaseContext()),keyOf=(sql:string,typeId:string)=>JSON.stringify([context,sql,[typeId,workspaceId]]);
  const missing=[...new Set(typeIds)].filter(t=>UUID.test(t)&&!entries.has(keyOf(TYPE_ROW,t)));
  if(missing.length<2||entries.size+missing.length*2>ENTRY_LIMIT)return;
  let rows:any[];try{rows=(await db.query(TYPE_BATCH,[workspaceId,missing])).rows;}catch{return;}
  const by=new Map(rows.map((r:any)=>[r.id,r]));
  for(const t of missing){const row=by.get(t);
   for(const [sql,found] of [[TYPE_ROW,row?[row]:[]],[TYPE_FIELDS,row?[{fields:row.fields}]:[]]] as [string,any[]][]){const key=keyOf(sql,t);if(!entries.has(key))entries.set(key,{sql,values:[t,workspaceId],context,result:Promise.resolve({rows:found,rowCount:found.length}),hits:0});}}
 });
 try{
  const value=await read(scoped);
  const changed=()=>fail(409,'access_changed','Access or schema changed; reload this page');
  // Deliberately bypass the cache. Table definitions are verified together, one query per workspace and caller.
  const tables=new Map<string,{context:Entry['context'];workspaceId:string;entries:Entry[]}>();
  for(const entry of entries.values())if(entry.hits&&(entry.sql===TYPE_ROW||entry.sql===TYPE_FIELDS)&&UUID.test(String(entry.values[0]))){
   const key=JSON.stringify([entry.context,entry.values[1]]),group=tables.get(key)??{context:entry.context,workspaceId:entry.values[1] as string,entries:[] as Entry[]};group.entries.push(entry);tables.set(key,group);}
  for(const group of tables.values()){
   const current=await withDatabaseContext(group.context,()=>db.query(TYPE_BATCH,[group.workspaceId,[...new Set(group.entries.map(e=>e.values[0]))]])),by=new Map(current.rows.map((r:any)=>[r.id,r]));
   for(const entry of group.entries){const row=by.get(entry.values[0]),now=entry.sql===TYPE_ROW?(row?[row]:[]):(row?[{fields:row.fields}]:[]);if(!isDeepStrictEqual(now,(await entry.result).rows))changed();}
  }
  // Bounded sequential checks avoid pool floods.
  for(const entry of entries.values())if(entry.hits&&!(entry.sql===TYPE_ROW||entry.sql===TYPE_FIELDS)||entry.hits&&!UUID.test(String(entry.values[0]))){
   const current=await withDatabaseContext(entry.context,()=>db.query(entry.sql,entry.values));
   if(!isDeepStrictEqual(current.rows,(await entry.result).rows))changed();
  }
  return value;
 }finally{entries.clear();sessions.delete(scoped);originals.delete(scoped);primers.delete(scoped);}
}
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
/** Loads the definitions of these tables into the current unit with one query (see withReadMetadata). Outside a unit,
 * or for a single table, it does nothing; every later lookup is then made as before. */
export async function primeEntityTypes(db:Database|Connection,workspaceId:string,typeIds:string[]):Promise<void>{
 const scope=ambient.getStore(),target=sessions.has(db as Database)?db as Database:scope&&(scope.base===db||originals.get(db as Database)===scope.base)?scope.scoped:undefined;
 await (target&&primers.get(target))?.(workspaceId,typeIds);
}
