import type pg from 'pg';
import {requestMetrics} from '../db/metrics.js';

// Exact connect-pg-simple 10 query for our configured table. Other queries pass through.
const TOUCH='UPDATE "session" SET expire = to_timestamp($1) WHERE sid = $2 RETURNING sid';
const DISTINCT_TOUCH='UPDATE "session" SET expire = to_timestamp($1) WHERE sid = $2 AND expire IS DISTINCT FROM to_timestamp($1) RETURNING sid';

/** Share only in-flight identical expiry writes, never sessions, reads or authorization results. */
export function sessionWritePool(pool:pg.Pool):pg.Pool{
 const pending=new Map<string,Promise<pg.QueryResult>>();
 return new Proxy(pool,{get(target,key){
  if(key==='query')return (sql:string,values?:any[])=>{
   if(sql!==TOUCH||!Array.isArray(values)||values.length!==2||!Number.isFinite(values[0])||typeof values[1]!=='string'){
    // A save, destroy, regeneration or prune must separate writes on either side of it.
    // Forget sharing only; already-started writes and their callbacks still finish normally.
    if(typeof sql!=='string'||!/^\s*SELECT\b/i.test(sql))pending.clear();
    return target.query(sql,values);
   }
   const metrics=requestMetrics(),id=JSON.stringify(values),existing=pending.get(id);
   if(existing){if(metrics)metrics.sessionTouchesCoalesced++;return existing;}
   // PostgreSQL stores expiry to whole seconds. Avoid a new row version when another
   // request/process already persisted this exact expiry; do not round to a larger window.
   const query=target.query(DISTINCT_TOUCH,values).then(result=>{
    if(metrics){metrics.sessionTouchWrites+=result.rowCount??0;if(result.rowCount===0)metrics.sessionTouchNoops++;}
    return result;
   }).finally(()=>{if(pending.get(id)===query)pending.delete(id);});
   pending.set(id,query);return query;
  };
  const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
 }});
}
