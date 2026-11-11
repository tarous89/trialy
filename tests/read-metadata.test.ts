import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withReadMetadata,freshReadDatabase} from '../src/db/read-metadata.js';
import {withActor,databaseContext} from '../src/db/context.js';
import type {Database} from '../src/db/database.js';
const sql='SELECT * FROM entity_types WHERE id=$1 AND workspace_id=$2';
function fixture(){
 let version=0,count=0;
 const db:Database={query:async()=>{count++;return {rows:[{version,actor:databaseContext().actor?.userId}] as any};},transaction:fn=>fn(db),close:async()=>{}};
 return {db,count:()=>count,change:()=>version++};
}
test('metadata is reused only within a read and is checked again before returning',async()=>{
 const f=fixture();await withReadMetadata(f.db,async db=>{for(let i=0;i<10;i++){const r=await db.query(sql,['t','w']);assert.equal(r.rows[0].version,0);r.rows[0].version=99;}});assert.equal(f.count(),2);
 await withReadMetadata(f.db,db=>db.query(sql,['t','w']));assert.equal(f.count(),3);
});
test('concurrent permission/schema change discards the response; explicit fresh checks bypass reuse',async()=>{
 const f=fixture();await assert.rejects(withReadMetadata(f.db,async db=>{await db.query(sql,['t','w']);f.change();await db.query(sql,['t','w']);return 'must not return';}),/Access or schema changed/);
 await withReadMetadata(f.db,async db=>{await db.query(sql,['t','w']);f.change();assert.equal((await freshReadDatabase(db).query(sql,['t','w'])).rows[0].version,2);});
});
test('runtime actor and tool contexts never share metadata, including nested reads',async()=>{
 const f=fixture();await withReadMetadata(f.db,async db=>{
  const read=(userId:string,accessToolId?:string)=>withActor({userId,origin:'human',accessToolId},()=>withReadMetadata(db,inner=>inner.query(sql,['t','w'])));
  assert.equal((await read('owner')).rows[0].actor,'owner');assert.equal((await read('member')).rows[0].actor,'member');await read('owner','tool');assert.equal(f.count(),3);
 });
});
test('rows and counts are never cached',async()=>{
 const f=fixture();await withReadMetadata(f.db,async db=>{for(let i=0;i<2;i++){await db.query('SELECT * FROM records');await db.query('SELECT count(*) FROM records');}});assert.equal(f.count(),4);
});
test('PostgreSQL parser functions are excluded from cloned transaction metadata',async()=>{
 let calls=0;const row={id:'table',fields:[{key:'name'}]};
 // node-postgres Result includes non-cloneable _parsers and _types properties;
 // the production transaction adapter returns this richer driver result.
 const db:Database={query:async()=>{calls++;return {rows:[row] as any,rowCount:1,_parsers:[(value:string)=>value],_types:{getTypeParser:()=>String}};},transaction:fn=>fn(db),close:async()=>{}};
 await withReadMetadata(db,async inner=>{const first=await inner.query(sql,['t','w']);assert.deepEqual(Object.keys(first).sort(),['rowCount','rows']);first.rows[0].fields[0].key='changed';const second=await inner.query(sql,['t','w']);assert.equal(second.rows[0].fields[0].key,'name');assert.equal(second.rowCount,1);});assert.equal(calls,2);assert.equal(row.fields[0].key,'name');
});
test('final checks share one transaction and keep each reused entry\'s own context',async()=>{
 let transactions=0;const seen:string[]=[];
 const conn={query:async()=>{seen.push(databaseContext().actor?.userId??'');return {rows:[{actor:databaseContext().actor?.userId}] as any};}};
 const db:Database={query:conn.query,transaction:async fn=>{transactions++;return fn(conn);},close:async()=>{}};
 await withReadMetadata(db,async inner=>{
  for(const userId of ['owner','member'])for(let i=0;i<2;i++)await withActor({userId,origin:'human'},()=>inner.query(sql,['t','w']));
  await inner.query('SELECT fields FROM entity_types WHERE workspace_id=$1',['w']);
 });
 // Two reused entries are checked in one transaction; the unreused entry is not rechecked.
 assert.equal(transactions,1);assert.deepEqual(seen,['owner','member','','owner','member']);
 transactions=0;await withReadMetadata(db,inner=>inner.query(sql,['t','w']));assert.equal(transactions,0);
});
test('a failed final check rejects the response even when it runs inside the shared check transaction',async()=>{
 let version=0;const conn={query:async()=>({rows:[{version}] as any})};
 const db:Database={query:conn.query,transaction:async fn=>fn(conn),close:async()=>{}};
 await assert.rejects(withReadMetadata(db,async inner=>{await inner.query(sql,['t','w']);version++;await inner.query(sql,['t','w']);return 'must not return';}),/Access or schema changed/);
});
