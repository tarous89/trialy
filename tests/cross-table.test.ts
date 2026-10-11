import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {maintenanceBatch} from '../src/workspace/schema.js';
import {DataCapabilities} from '../src/foundation/data.js';
import {scopeSchema} from '../src/foundation/schema.js';
import type {Actor} from '../src/shared/schema.js';
test('Cross-table claims preserve originals, require exact human approval and never widen single-table reads',async()=>{
 const pg=new PGlite();try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
  const a:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...a,origin:'ai'};
  await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'cross@example.invalid','Tester']);
  const s=new Service(db),f=new WorkspaceFoundation(db),w=await s.createWorkspace(a,'Cross-table');await s.setAi(a,w.id,true);
  const save=async(op:any)=>{const p=await s.preview(a,w.id,op);return s.commit(a,p.id,p.digest);};
  const t1=(await save({kind:'create_type',name:'Organizations',fields:[{key:'name',name:'Name',kind:'text'}]})).objects[0].id;
  const t2=(await save({kind:'create_type',name:'Conference companies',fields:[{key:'label',name:'Label',kind:'text'},{key:'count',name:'Count',kind:'number'}]})).objects[0].id;
  const r1=(await save({kind:'create_record',typeId:t1,data:{name:'Example Limited'}})).objects[0].id,r2=(await save({kind:'create_record',typeId:t2,data:{label:'Example',count:1}})).objects[0].id;
  const op={kind:'link_cross_table_identity',sourceRecordId:r2,preferredRecordId:r1,sourceVersion:0,preferredVersion:0,fieldPairs:[{sourceField:'label',preferredField:'name'}],rationale:'User supplied registration identifies the same company'};
  const draft=await f.preview(ai,w.id,op);assert.equal(draft.crossTableReview?.source.data.label,'Example');await assert.rejects(f.confirm(ai,w.id,draft.id,draft.digest),/cannot approve/);
  const saved=await f.confirm(a,w.id,draft.id,draft.digest);assert.deepEqual(await f.confirm(a,w.id,draft.id,draft.digest),saved);
  const linked=await f.crossTableLinks(ai,w.id,r1);assert.equal(linked.links.length,1);assert.equal(linked.links[0].comparisons[0].conflict,true);assert.equal(linked.links[0].authorization.id,draft.id);
  assert.equal((await s.records(a,w.id,t1)).rows[0].version,0);assert.equal((await s.records(a,w.id,t2)).rows[0].data.label,'Example');
  await assert.rejects(f.preview(a,w.id,op),/already have/);
  await assert.rejects(f.preview(a,w.id,{...op,fieldPairs:[{sourceField:'count',preferredField:'name'}]}),/compatible/);
  await assert.rejects(s.preview(a,w.id,{kind:'archive_created_record',recordId:r2,expectedVersion:0,reason:'Linked record'}),/linked work/);
  assert.equal(maintenanceBatch.safeParse({requestKey:randomUUID(),scopeId:randomUUID(),expectedScopeVersion:0,sourceLabel:'Source',interpretation:'Match',links:[op]}).success,false);
  const code=new DataCapabilities(s,ai,w.id,scopeSchema.parse({capabilities:['entities.read'],typeIds:[t1],documents:false}));
  const identity=await code.invoke('entities.read',{typeId:t1,recordId:r1}) as any;assert.equal(identity.originals.length,1);assert.ok(!JSON.stringify(identity).includes('Example"'));
  // Human-hidden table field cannot be exposed by following a visible record's link.
  await db.query("UPDATE entity_types SET fields=jsonb_set(fields,'{0,ai}','false') WHERE id=$1",[t2]);
  assert.equal((await f.crossTableLinks(ai,w.id,r1)).links.length,0);
  await assert.rejects(f.preview(ai,w.id,{kind:'unlink_cross_table_identity',linkId:saved.id,expectedVersion:0,reason:'Hidden'}),/all fields/);
  assert.equal((await f.crossTableLinks(a,w.id,r1)).links[0].schemaChanged,true);
  assert.deepEqual((await f.crossTableLinks(a,w.id,r1)).links[0].comparisons,[]);
  const undo=await f.preview(a,w.id,{kind:'unlink_cross_table_identity',linkId:saved.id,expectedVersion:0,reason:'Incorrect match'});
  await save({kind:'update_record',recordId:r1,expectedVersion:0,data:{name:'Updated Example'}});
  assert.ok(!(await f.pending(a,w.id)).some(p=>p.id===undo.id));await assert.rejects(f.confirm(a,w.id,undo.id,undo.digest),/changed/);
  const retry=await f.preview(a,w.id,{kind:'unlink_cross_table_identity',linkId:saved.id,expectedVersion:0,reason:'Incorrect match'});await f.confirm(a,w.id,retry.id,retry.digest);
  assert.ok((await f.crossTableLinks(a,w.id,r1)).links[0].revoked_at);assert.equal((await s.records(a,w.id,t1)).rows[0].data.name,'Updated Example');
  const stale=await f.preview(a,w.id,{...op,preferredVersion:1});await save({kind:'update_record',recordId:r2,expectedVersion:0,data:{label:'Changed source'}});await assert.rejects(f.confirm(a,w.id,stale.id,stale.digest),/changed/);
  const exported=await s.exportWorkspace(a,w.id);assert.equal(exported.cross_table_links.length,1);assert.ok(exported.revisions.filter((v:any)=>v.object_kind==='cross_table_link').length===2);
 }finally{await pg.close();}
});
