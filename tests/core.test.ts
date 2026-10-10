import { test } from 'node:test';
import request from 'supertest';
import { upsertIdentity } from '../src/server/identity.js';
import { baseApp, errors } from '../src/server/app.js';
import { addMcp } from '../src/server/mcp.js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import type { Database, Connection } from '../src/db/database.js';
import { Service } from '../src/domain/service.js';
import { runAutomation } from '../src/worker/automations.js';
import { runOne } from '../src/worker/processor.js';
import { AppError, type Actor } from '../src/shared/schema.js';
const error=(code:string)=>(e:unknown)=>e instanceof AppError&&e.code===code;
test('Shared backend: access, committed history, original preservation and retrieval',async t=>{
 const pg=new PGlite();await pg.exec(await readFile('migrations/001_core.sql','utf8'));await pg.exec(await readFile('migrations/002_controlled_work.sql','utf8'));
 const db:Database={query:(sql,v)=>pg.query(sql,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const s=new Service(db);const owner:Actor={userId:randomUUID(),origin:'human'},other:Actor={userId:randomUUID(),origin:'human'};
 for(const a of [owner,other])await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'test@example.invalid','Test']);
 const w=await s.createWorkspace(owner,'Study A'),w2=await s.createWorkspace(other,'Study B');let typeId='',recordId='';
 const save=async(op:unknown)=>{const p=await s.preview(owner,w.id,op);return s.commit(owner,p.id,p.digest);};
 await t.test('tenant isolation and explicit AI permission',async()=>{
  await assert.rejects(s.types(other,w.id),error('not_found'));
  await assert.rejects(s.types({...owner,origin:'ai'},w.id),error('ai_disabled'));
  await s.setAi(owner,w.id,true);
  assert.equal((await s.workspaces(other)).length,1);assert.equal((await s.workspaces(owner))[0].id,w.id);
 });
 await t.test('preview discard, version zero, idempotency and stale updates',async()=>{
  const fields=[{key:'name',name:'Name',kind:'text',required:true},{key:'budget',name:'Budget',kind:'money',ai:false}];
  const discarded=await s.preview(owner,w.id,{kind:'create_type',name:'Unused',fields});await s.discard(owner,discarded.id);assert.equal((await s.types(owner,w.id)).length,0);
  const p=await s.preview(owner,w.id,{kind:'create_type',name:'CROs',fields});const r=await s.commit(owner,p.id,p.digest);assert.deepEqual(await s.commit(owner,p.id,p.digest),r);typeId=r.objects[0].id;
  const record=await save({kind:'create_record',typeId,data:{name:'Example CRO',budget:5000}});recordId=record.objects[0].id;
  const update=await s.preview(owner,w.id,{kind:'update_record',recordId,expectedVersion:0,data:{name:'Updated CRO'}});
  await save({kind:'update_record',recordId,expectedVersion:0,data:{name:'Other update'}});
  await assert.rejects(s.commit(owner,update.id,update.digest),error('stale_version'));
  assert.equal((await s.records(owner,w.id,typeId)).rows[0].version,1);
  await assert.rejects(db.query('UPDATE audit_events SET action=$1',['tampered']),/append-only/);
 });
 await t.test('AI field restriction applies to reads, matching and writes',async()=>{
  const ai:Actor={...owner,origin:'ai'};
  const records=await s.records(ai,w.id,typeId);assert.equal(records.rows[0].data.budget,undefined);
  assert.equal((await s.records(ai,w.id,typeId,{q:'5000'})).total,0);
  const table=(await s.types(owner,w.id))[0];
  await assert.rejects(s.preview(ai,w.id,{kind:'update_type',typeId,expectedVersion:0,name:table.name,fields:table.fields.map((f:any)=>({...f,ai:true}))}),error('restricted_configuration'));
  await assert.rejects(s.preview(ai,w.id,{kind:'update_record',recordId,expectedVersion:1,data:{budget:1}}),error('invalid_field'));
 });
 await t.test('original save is independent of processing; a failed file does not block another',async()=>{
  const original=Buffer.from('This trial proposal includes oncology services and monitoring.');
  for(const file of [{filename:'unsupported.bin',mime:'application/octet-stream',bytes:Buffer.from([0,1,2])},{filename:'proposal.txt',mime:'text/plain',bytes:original}]){const p=await s.previewFile(owner,w.id,{...file,ai:true});await s.commit(owner,p.id,p.digest);}
  await runOne(db);await runOne(db);
  const docs=await s.documents(owner,w.id);assert.equal(docs.find(d=>d.filename==='unsupported.bin').extraction_status,'unavailable');
  const good=docs.find(d=>d.filename==='proposal.txt');assert.equal(good.extraction_status,'ready');assert.deepEqual((await s.original(owner,w.id,good.id)).bytes,original);
  const found=await s.search({...owner,origin:'ai'},w.id,'oncology');assert.equal(found.hits.length,1);assert.equal(found.coverage.unavailable,1);
  await assert.rejects(s.original(other,w.id,good.id),error('not_found'));
 });
 await t.test('standing authorisation is scoped and revocable',async()=>{
  const g=await s.grant(owner,w.id,'documents.import','proposals',true);await s.revoke(owner,w.id,g.id);assert.ok((await s.grants(owner,w.id))[0].revoked_at);
 });
 await t.test('template installation is atomic and does not overwrite collisions',async()=>{
  const p=await s.preview(other,w2.id,{kind:'install_template',template:'rfp-oversight'});const r=await s.commit(other,p.id,p.digest);assert.equal(r.objects.length,6);
  const again=await s.preview(other,w2.id,{kind:'install_template',template:'rfp-oversight'});await assert.rejects(s.commit(other,again.id,again.digest));assert.equal((await s.types(other,w2.id)).length,6);
 });
 await t.test('scoped colleague access, reviewed revisions, schedules and export',async()=>{
  await s.share(owner,w.id,other.userId,'viewer',['budget'],[typeId],true);
  assert.equal((await s.records(other,w.id,typeId)).rows[0].data.budget,undefined);
  await assert.rejects(s.preview(other,w.id,{kind:'create_record',typeId,data:{name:'No'}}),error('forbidden'));
  await s.unshare(owner,w.id,other.userId);await assert.rejects(s.types(other,w.id),error('not_found'));
  const review=await s.transition(owner,w.id,recordId,1,'in_review','Ready for review');
  const approved=await s.transition(owner,w.id,recordId,review.version,'approved','Reviewed the exact record');
  await save({kind:'update_record',recordId,expectedVersion:approved.version,data:{name:'Revised after approval'}});
  assert.equal((await s.records(owner,w.id,typeId)).rows[0].state,'in_review');
  const grant=await s.grant(owner,w.id,'reports.prepare',w.id,false);
  const p=await s.preview(owner,w.id,{kind:'create_automation',name:'Daily overview',grantId:grant.id,intervalMinutes:1440});await s.commit(owner,p.id,p.digest);
  assert.equal(await runAutomation(db),true);assert.equal(await runAutomation(db),false);
  assert.equal((await s.runs(owner,w.id))[0].status,'completed');assert.ok((await s.grants(owner,w.id)).find(g=>g.id===grant.id).used_at);
  const exp=await s.exportWorkspace(owner,w.id);assert.equal(exp.documents.length,2);assert.equal(exp.approvals.length,1);assert.ok(exp.revisions.length>0);assert.ok(exp.audit_events.length>0);
 });
 await t.test('MCP transport calls the permission-filtered shared backend',async()=>{
  const app=baseApp();addMcp(app,s,(req,_res,next)=>{req.actor={...owner,origin:'ai'};next();});app.use(errors);
  const response=await request(app).post('/mcp').set('Accept','application/json, text/event-stream').send({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'read_records',arguments:{workspaceId:w.id,typeId}}});
  assert.equal(response.status,200);assert.equal(response.body.result.isError,undefined);
  assert.equal(response.body.result.structuredContent.result.rows[0].data.budget,undefined);
  const denied=await request(app).post('/mcp').set('Accept','application/json, text/event-stream').send({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'list_tables',arguments:{workspaceId:w2.id}}});
  assert.equal(denied.body.result.isError,true);
 });
 await t.test('ChatGPT-first identity and first workspace need no standalone detour',async()=>{
  const issuer='https://identity.example.invalid/';
  const uid=await upsertIdentity(db,issuer,'new-user');
  assert.equal(await upsertIdentity(db,issuer,'new-user','person@example.invalid','Example Person'),uid);
  assert.equal(await upsertIdentity(db,issuer,'new-user'),uid);
  assert.equal((await db.query('SELECT name FROM users WHERE id=$1',[uid])).rows[0].name,'Example Person');
  assert.notEqual(await upsertIdentity(db,issuer,'different-user','person@example.invalid'),uid);
  const actor:Actor={userId:uid,origin:'ai'};
  const app=baseApp();addMcp(app,s,(req,_res,next)=>{req.actor=actor;next();});app.use(errors);
  const invoke=(name:string,args={})=>request(app).post('/mcp').set('Accept','application/json, text/event-stream').send({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}});
  const welcome=await invoke('open_workspace');assert.equal(welcome.body.result.structuredContent.result.canCreateInitialWorkspace,true);
  assert.equal((await s.workspaces(actor)).length,0);
  const created=await invoke('create_initial_workspace',{name:'My study',confirmed:true,allowAi:true});assert.equal(created.body.result.isError,undefined);
  const opened=await invoke('open_workspace');assert.equal(opened.body.result.structuredContent.result.workspaces.length,1);
  const again=await invoke('create_initial_workspace',{name:'Duplicate',confirmed:true,allowAi:true});assert.equal(again.body.result.isError,true);assert.equal((await s.workspaces(actor)).length,1);
  const listed=await request(app).post('/mcp').set('Accept','application/json, text/event-stream').send({jsonrpc:'2.0',id:2,method:'tools/list',params:{}});
  const entry=listed.body.result.tools.find((t:any)=>t.name==='open_workspace');assert.deepEqual(entry._meta['openai/ui'].entrypoints,[{type:'global'},{type:'thread'}]);
  await s.setAi({...actor,origin:'human'},opened.body.result.structuredContent.result.workspaceId,false);
  const restricted=await invoke('open_workspace');assert.equal(restricted.body.result.structuredContent.result.workspaces.length,0);assert.equal(restricted.body.result.structuredContent.result.canCreateInitialWorkspace,false);
 });
 await db.close();
});
