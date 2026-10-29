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
