import test from 'node:test';
import assert from 'node:assert/strict';
import {Postgres,withReadBatch} from '../src/db/database.js';
import {createRequestMetrics,withRequestMetrics} from '../src/db/metrics.js';
import {withActor} from '../src/db/context.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const db=new Postgres('postgres://unused'),log:string[]=[];let connections=0,held=0,maxHeld=0,releases=0;
 db.pool={connect:async()=>{const n=++connections;held++;maxHeld=Math.max(maxHeld,held);return {query:async(sql:string)=>{log.push(n+':'+(sql.startsWith('SELECT set_config')?'CONTEXT':sql));if(sql==='SELECT broken')throw Error('fixture failure');return {rows:[{value:1}],rowCount:1};},release(){held--;releases++;}};}} as any;
 return {db,log,stats:()=>({connections,held,maxHeld,releases})};
}
test('consecutive standalone reads in one request share a transaction and commit when the request pauses',async()=>{
 const {db,log,stats}=fixture(),metrics=createRequestMetrics();
 await withRequestMetrics(metrics,()=>withReadBatch(async()=>{
  await db.query('SELECT 1');await db.query('SELECT 2');await Promise.all([db.query('SELECT 3'),db.query('SELECT 4')]);
  assert.deepEqual(log,['1:BEGIN','1:CONTEXT','1:SELECT 1','1:SELECT 2','1:SELECT 3','1:SELECT 4']);
  // Non-database work (app code, a connector, a file read) never runs inside the batch transaction.
  await tick();await tick();
  assert.equal(log.at(-1),'1:COMMIT');assert.equal(stats().held,0);
  await db.query('SELECT 5');
 }));
 await tick();await tick();
 assert.deepEqual(log.slice(7),['2:BEGIN','2:CONTEXT','2:SELECT 5','2:COMMIT']);
 assert.equal(metrics.queryCount,5);assert.equal(metrics.databaseRoundTrips,11);assert.equal(metrics.transactions,2);
 assert.deepEqual(stats(),{connections:2,held:0,maxHeld:1,releases:2});
});
test('writes, locks and failures keep their standalone behavior inside a batch',async()=>{
 const {db,log,stats}=fixture();
 await withReadBatch(async()=>{
  await db.query('SELECT 1');
  await db.query('UPDATE t SET a=1');
  // Durable before the caller continues.
  assert.deepEqual(log,['1:BEGIN','1:CONTEXT','1:SELECT 1','1:UPDATE t SET a=1','1:COMMIT']);
  await db.query('SELECT id FROM t FOR UPDATE');assert.equal(log.at(-1),'2:COMMIT');
  await db.query('SELECT trialy_security.fn($1)');assert.equal(log.at(-1),'3:COMMIT');
  await db.query('WITH x AS (DELETE FROM t RETURNING 1) SELECT 1');assert.equal(log.at(-1),'4:COMMIT');
  await db.query('SELECT 2');
  await assert.rejects(db.query('SELECT broken'),/fixture failure/);
  assert.equal(log.at(-1),'5:ROLLBACK');assert.equal(stats().held,0);
  // The next read starts cleanly after a failure.
  await db.query('SELECT 3');assert.deepEqual(log.slice(-3),['6:BEGIN','6:CONTEXT','6:SELECT 3']);
 });
 await tick();await tick();assert.equal(log.at(-1),'6:COMMIT');assert.equal(stats().held,0);
});
test('an explicit transaction never shares or waits behind a held batch connection',async()=>{
 const {db,log,stats}=fixture();
 await withReadBatch(async()=>{
  await db.query('SELECT 1');
  await db.transaction(async tx=>{await tx.query('UPDATE t SET a=1');await db.query('SELECT 2');});
  assert.deepEqual(log,['1:BEGIN','1:CONTEXT','1:SELECT 1','1:COMMIT','2:BEGIN','2:CONTEXT','2:UPDATE t SET a=1','3:BEGIN','3:CONTEXT','3:SELECT 2','2:COMMIT']);
  await assert.rejects(db.transaction(async tx=>{await tx.query('SELECT broken');}),/fixture failure/);
 });
 await tick();await tick();assert.equal(stats().held,0);assert.ok(log.includes('3:COMMIT'));
});
test('the security context is re-set when the actor scope changes inside a batch, and requests never share one',async()=>{
 const {db,log}=fixture(),a={userId:'00000000-0000-4000-8000-000000000001',origin:'human' as const};
 await withReadBatch(async()=>{
  await withActor(a,()=>db.query('SELECT 1'));
  await withActor({...a,accessToolId:'00000000-0000-4000-8000-000000000002'},()=>db.query('SELECT 2'));
  await withActor(a,()=>db.query('SELECT 3'));
 });
 assert.deepEqual(log,['1:BEGIN','1:CONTEXT','1:SELECT 1','1:CONTEXT','1:SELECT 2','1:CONTEXT','1:SELECT 3']);
 await tick();await tick();log.length=0;
 await Promise.all([withReadBatch(()=>db.query('SELECT 1')),withReadBatch(()=>db.query('SELECT 2'))]);
 assert.equal(new Set(log.filter(l=>l.endsWith('BEGIN')).map(l=>l.split(':')[0])).size,2);
 await tick();await tick();log.length=0;
 // Outside a request, and with the switch off, behavior is unchanged.
 await db.query('SELECT 1');assert.deepEqual(log.map(l=>l.split(':')[1]),['BEGIN','CONTEXT','SELECT 1','COMMIT']);
 process.env.DB_READ_BATCHING='false';log.length=0;
 try{await withReadBatch(async()=>{await db.query('SELECT 1');await db.query('SELECT 2');});}finally{delete process.env.DB_READ_BATCHING;}
 assert.equal(log.filter(l=>l.endsWith('COMMIT')).length,2);
});
