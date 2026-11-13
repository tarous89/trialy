import type pg from 'pg';
import {measureDatabaseQuery,requestMetrics} from '../db/metrics.js';

/** connect-pg-simple 10 uses the pool's promise query API; keep its SQL and session lifecycle unchanged. */
export function measuredSessionPool(pool:pg.Pool):pg.Pool{
 return new Proxy(pool,{get(target,key){
  if(key==='query')return (sql:string,values?:any[])=>measureDatabaseQuery(requestMetrics(),()=>target.query(sql,values),true);
  const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
 }});
}
