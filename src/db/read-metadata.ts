import {requestMetrics} from './metrics.js';
import {isDeepStrictEqual} from 'node:util';
import type {Database,Connection} from './database.js';
import {databaseContext,withDatabaseContext} from './context.js';
import {fail} from '../shared/schema.js';

// Only deterministic permission/schema lookups. Never cache records, counts,
// audit events, pending previews, or anything across requests/actors.
const eligible=(sql:string)=>{
 const q=sql.replace(/\s+/g,' ').trim();
 return /^SELECT w\.\*, m\.role AS tenant_role,.* FROM workspaces w JOIN memberships m .* WHERE w\.id=\$1$/.test(q)
  || /^SELECT \* FROM (workspace_components|workspace_nodes|entity_types) WHERE id=\$1 AND workspace_id=\$2$/.test(q)
  || q==='SELECT fields FROM entity_types WHERE workspace_id=$1'
  || q==='SELECT fields FROM entity_types WHERE id=$1 AND workspace_id=$2'
  || q==='SELECT allowed_users,ai_enabled FROM document_access WHERE workspace_id=$1 UNION ALL SELECT allowed_users,ai_enabled FROM folder_access WHERE workspace_id=$1';
};
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
   if(entries.size>=256)return db.query(sql,values);
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
 try{
  const value=await read(scoped);
  // Deliberately bypass the cache. Bounded sequential checks avoid pool floods.
  for(const entry of entries.values())if(entry.hits){
   const current=await withDatabaseContext(entry.context,()=>db.query(entry.sql,entry.values));
   if(!isDeepStrictEqual(current.rows,(await entry.result).rows))fail(409,'access_changed','Access or schema changed; reload this page');
  }
  return value;
 }finally{entries.clear();sessions.delete(scoped);originals.delete(scoped);}
}
/** Explicit freshness boundary for reads that already recheck authorization. */
export function freshReadDatabase(db:Database):Database{return originals.get(db)??db;}
const originals=new WeakMap<Database,Database>();
