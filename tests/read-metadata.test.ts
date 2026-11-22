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
/* P6: the definitions of an app's tables are loaded with one query per unit and verified with one query at its end. */
test('table definitions are loaded and verified together, give the same rows, and a change still discards the response',async()=>{
 const {primeEntityTypes}=await import('../src/db/read-metadata.js');
 const w='11111111-1111-4111-8111-111111111111',ids=['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'];
 const fields='SELECT fields FROM entity_types WHERE id=$1 AND workspace_id=$2';
 let table:Record<string,any>=Object.fromEntries(ids.slice(0,2).map((id,i)=>[id,{id,workspace_id:w,name:'T'+i,version:1,fields:[{key:'name'}]}])),single=0,batch=0;
 const db:Database={query:async(q:string,v:any=[])=>{
  if(q.includes('id=ANY')){batch++;return {rows:(v[1] as string[]).filter(id=>table[id]).map(id=>structuredClone(table[id]))} as any;}
  single++;const row=table[v[0]];return {rows:row?[q.startsWith('SELECT fields')?{fields:structuredClone(row.fields)}:structuredClone(row)]:[]} as any;},transaction:fn=>fn(db),close:async()=>{}};
 await withReadMetadata(db,async scoped=>{
  await primeEntityTypes(scoped,w,ids);
  for(const id of ids){assert.deepEqual((await scoped.query(sql,[id,w])).rows,table[id]?[table[id]]:[]);assert.deepEqual((await scoped.query(fields,[id,w])).rows,table[id]?[{fields:table[id].fields}]:[]);}
 });
 assert.equal(single,0,'no lookup per table');assert.equal(batch,2,'one query to load and one to verify');
 // A table changed, or removed, while the unit ran: nothing is returned.
 await assert.rejects(withReadMetadata(db,async scoped=>{await primeEntityTypes(scoped,w,ids);await scoped.query(sql,[ids[0],w]);table={...table,[ids[0]]:{...table[ids[0]],version:2}};return 'must not return';}),/Access or schema changed/);
 await assert.rejects(withReadMetadata(db,async scoped=>{await primeEntityTypes(scoped,w,ids);await scoped.query(fields,[ids[1],w]);const {[ids[1]]:gone,...rest}=table;table=rest;return 'must not return';}),/Access or schema changed/);
 // Outside a unit, and for one table, nothing is loaded ahead.
 batch=0;await primeEntityTypes(db,w,ids);await withReadMetadata(db,scoped=>primeEntityTypes(scoped,w,[ids[0]]));assert.equal(batch,0);
});
