import test from 'node:test';
import assert from 'node:assert/strict';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import {Postgres} from '../src/db/database.js';
import {createRequestMetrics,metricSummary,withRequestMetrics} from '../src/db/metrics.js';
import {measuredSessionPool} from '../src/server/session-metrics.js';
import {execute} from '../src/foundation/runtime.js';

test('Postgres metrics include transaction and context calls on success and rollback',async()=>{
 const db=new Postgres('postgres://unused'),statements:string[]=[];let releases=0;
 db.pool={connect:async()=>({query:async(sql:string)=>{statements.push(sql);if(sql==='SELECT broken')throw Error('fixture failure');return {rows:[{value:1}],rowCount:1};},release(){releases++;}})} as any;
 const one=createRequestMetrics();await withRequestMetrics(one,()=>db.query('SELECT 1'));
 assert.equal(one.queryCount,1);assert.equal(one.databaseRoundTrips,4);assert.equal(one.transactions,1);assert.equal(one.contextSets,1);
 const batch=createRequestMetrics();await withRequestMetrics(batch,()=>db.transaction(async tx=>{await tx.query('SELECT 1');await tx.query('SELECT 2');}));
 assert.equal(batch.queryCount,2);assert.equal(batch.databaseRoundTrips,5);assert.equal(batch.contextSets,1);
 const failed=createRequestMetrics();await assert.rejects(withRequestMetrics(failed,()=>db.query('SELECT broken')),/fixture failure/);
 assert.equal(failed.databaseRoundTrips,4);assert.equal(statements.at(-1),'ROLLBACK');assert.equal(releases,3);
 assert.ok(one.postgresMs>=0);assert.ok(one.poolWaitMs>=0);
});

test('the actual session store retains get, set, touch and destroy while counting its queries',async()=>{
 const sql:string[]=[];let saved:any=null;const pool={query:async(statement:string,values:any[])=>{
  sql.push(statement);
  if(statement.startsWith('INSERT'))saved=values[0];
  if(statement.startsWith('DELETE'))saved=null;
  return {rows:statement.startsWith('SELECT')&&saved?[{sess:saved}]:[],rowCount:1};
 }} as any;
 const Store=connectPg(session),store=new Store({pool:measuredSessionPool(pool),pruneSessionInterval:false});
 const metrics=createRequestMetrics(),value={cookie:{expires:new Date(Date.now()+60000)},userId:'fixture-user'} as any;
 try{await withRequestMetrics(metrics,async()=>{
  await new Promise<void>((resolve,reject)=>store.set('fixture-session',value,e=>e?reject(e):resolve()));
  const restored=await new Promise((resolve,reject)=>store.get('fixture-session',(e,s)=>e?reject(e):resolve(s)));assert.deepEqual(restored,value);
  await new Promise<void>(resolve=>store.touch('fixture-session',value,resolve));
  await new Promise<void>((resolve,reject)=>store.destroy('fixture-session',e=>e?reject(e):resolve()));
 });}finally{store.close();}
 assert.equal(metrics.sessionQueries,4);assert.equal(metrics.databaseRoundTrips,4);assert.equal(metrics.queryCount,0);
 assert.equal(sql.length,4);assert.ok(sql.some(q=>q.startsWith('UPDATE')));assert.equal(saved,null);
 assert.doesNotMatch(JSON.stringify(metricSummary(metrics)),/fixture-user|fixture-session|SELECT|INSERT/);
});

test('concurrent request scopes keep session successes and failures separate',async()=>{
 const pool=measuredSessionPool({query:async(sql:string)=>{await Promise.resolve();if(sql==='fail')throw Error('fixture');return {rows:[]};}} as any);
 const left=createRequestMetrics(),right=createRequestMetrics();
 await Promise.all([
  withRequestMetrics(left,async()=>{await pool.query('first');await pool.query('second');}),
  withRequestMetrics(right,()=>assert.rejects(pool.query('fail'),/fixture/)),
 ]);
 assert.equal(left.databaseRoundTrips,2);assert.equal(right.databaseRoundTrips,1);assert.equal(right.sessionQueries,1);
});

test('sandbox metrics measure startup, capability work and failures without recording payloads',async()=>{
 const metrics=createRequestMetrics();
 const value=await withRequestMetrics(metrics,()=>execute('return tools.call("fixture",input);',{secret:'fixture-private-value'},async(_name,input)=>input));
 assert.deepEqual(value,{secret:'fixture-private-value'});
 assert.equal(metrics.sandboxRuns,1);assert.equal(metrics.capabilityCalls,1);assert.ok(metrics.capabilityBytes>0);
 assert.ok(metrics.sandboxStartupMs>0);assert.ok(metrics.sandboxMs>=metrics.sandboxStartupMs);assert.ok(metrics.sandboxMs>=metrics.capabilityMs);
 assert.doesNotMatch(JSON.stringify(metricSummary(metrics)),/fixture|secret/);
 const failed=createRequestMetrics();await assert.rejects(withRequestMetrics(failed,()=>execute('throw Error("fixture-private-value")',{},async()=>null)),/execution_failed/);
 assert.equal(failed.sandboxRuns,1);assert.ok(failed.sandboxMs>0);assert.equal(failed.capabilityCalls,0);
});
