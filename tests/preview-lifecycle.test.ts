import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {addWorkspaceMcp} from '../src/server/workspace-foundation.js';

test('reproduce draft lifecycle error and verify an authorized recovery path',async t=>{
 const pg=new PGlite();const db:Database={query:(s,v)=>pg.query(s,v) as any,transaction:f=>pg.transaction(tx=>f(tx as Connection)),close:()=>pg.close()};
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const a={userId:randomUUID(),origin:'ai' as const};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'diagnostic@example.invalid','Diagnostic']);
  const s=new Service(db),f=new WorkspaceFoundation(db),w=await s.createWorkspace({...a,origin:'human'},'Diagnostic');
  const handlers=new Map<string,any>();addWorkspaceMcp({registerTool:(name:string,_schema:any,handler:any)=>handlers.set(name,handler)} as any,f,a,(handler:any)=>handler,{});
  // Use an existing authorized table to match the screenshot's reuse of existing data.
  const p=await s.preview({...a,origin:'human'},w.id,{kind:'create_type',name:'Companies',fields:[{key:'name',name:'Company',kind:'text',ai:true}]});const typeId=(await s.commit({...a,origin:'human'},p.id,p.digest)).objects[0].id;
  const create=()=>handlers.get('prepare_tracker')({workspaceId:w.id,name:'Biotech Design Partner Outreach',description:'Diagnostic fixture',tabs:[{name:'Companies',typeId,columns:[{field:'name'}]}],showExample:false,omitSource:true});
  const fresh=await create();
  await t.test('fresh preparation returns a rendered bundle and honest display status',async()=>{
   assert.equal(fresh.saveStatus,'unsaved');assert.ok(fresh.initialOutput?.tracker);assert.equal(fresh.previewStatus,'prepared');assert.equal(fresh.displayStatus,'awaiting_client');
   const out=await f.runFrontend(a,w.id,{previewId:fresh.preview.id});assert.ok(out.tracker);assert.equal(out.tracker.config.pageSize,25);
   const row=(await db.query('SELECT expires_at-now() AS remaining FROM workspace_previews WHERE id=$1',[fresh.preview.id])).rows[0];console.log('fresh draft remaining lifetime',row.remaining);
  });
  const saved=await f.confirm({...a,origin:"human"},w.id,fresh.preview.id,fresh.preview.digest);
  const unavailable=async(previewId:string,actor=a,workspace=w.id)=>assert.rejects(f.runFrontend(actor,workspace,{previewId}),{message:'Code preview unavailable'});
  await t.test('replaying a saved draft reproduces the exact screenshot error',()=>unavailable(fresh.preview.id));
  await t.test('saved draft can be recovered through its owner-scoped receipt',async()=>{
   const receipt=(await db.query('SELECT result FROM workspace_receipts WHERE id=$1 AND workspace_id=$2 AND user_id=$3',[fresh.preview.id,w.id,a.userId])).rows[0];assert.equal(receipt.result.id,saved.id);
   const reopened=await f.readComponent(a,w.id,receipt.result.id,true);assert.ok(reopened.initialOutput?.tracker);const recovered=await f.resolveTrackerPreview(a,w.id,fresh.preview.id);assert.equal(recovered.screen,'tracker');assert.equal(recovered.component.id,saved.id);
  });
  await t.test('failed initial rendering rolls back the new preview',async()=>{
   const before=Number((await db.query('SELECT count(*) AS n FROM workspace_previews')).rows[0].n),original=WorkspaceFoundation.prototype.runFrontend;
   WorkspaceFoundation.prototype.runFrontend=async()=>{throw Error('Diagnostic render failure');};
   try{await assert.rejects(create(),/Diagnostic render failure/);}finally{WorkspaceFoundation.prototype.runFrontend=original;}
   assert.equal(Number((await db.query('SELECT count(*) AS n FROM workspace_previews')).rows[0].n),before);
  });
  const expired=await create();await db.query("UPDATE workspace_previews SET expires_at=now()-interval '1 second' WHERE id=$1",[expired.preview.id]);
  await t.test('expired draft resolves to an explicit expired state',async()=>{assert.equal((await f.resolveTrackerPreview(a,w.id,expired.preview.id)).previewStatus,'expired');});
  const discarded=await create();await f.discard(a,w.id,discarded.preview.id);
  await t.test('discarded draft resolves to an unavailable state',async()=>{assert.equal((await f.resolveTrackerPreview(a,w.id,discarded.preview.id)).previewStatus,'unavailable');});
  const active=await create();
  await t.test('wrong workspace produces the same error',()=>unavailable(active.preview.id,a,randomUUID()));
  await t.test('wrong account produces the same error and cannot use the saved receipt',async()=>{
   const other={...a,userId:randomUUID()};await unavailable(active.preview.id,other);await assert.rejects(f.resolveTrackerPreview(other,w.id,fresh.preview.id));
   assert.equal((await db.query('SELECT result FROM workspace_receipts WHERE id=$1 AND workspace_id=$2 AND user_id=$3',[fresh.preview.id,w.id,other.userId])).rows.length,0);
  });
 }finally{await db.close();}
});

import {loadTrackerDisplay,trackerLoadError} from '../src/embed/tracker-loading.js';
test('account loads independently, old results resolve, and fresh bundles avoid a second render',async()=>{
 let initialized=false;const calls:string[]=[];
 const call=async(name:string)=>{calls.push(name);if(name==='initialize_account')return {viewerId:'u'};if(name==='list_tables')return [];throw Error('Code preview unavailable');};
 await assert.rejects(loadTrackerDisplay({screen:'tracker-preview',workspaceId:'w',preview:{id:'old'}},call,()=>{initialized=true;}),/Code preview unavailable/);assert.equal(initialized,true);
 assert.ok(calls.includes('resolve_tracker_preview'));assert.doesNotMatch(trackerLoadError(Error('INVALID_ARGUMENT Code preview unavailable')),/INVALID_ARGUMENT/);
 calls.length=0;await loadTrackerDisplay({screen:'tracker-preview',workspaceId:'w',preview:{id:'new'},preparedAt:new Date().toISOString(),initialOutput:{html:'ready'}},call,()=>{});
 assert.deepEqual(calls.sort(),['initialize_account','list_tables']);
});

test('a preview saved between resolution and rendering opens its receipt without a false error',async()=>{
 let resolutions=0;const call=async(name:string)=>{
  if(name==='initialize_account')return {viewerId:'u'};
  if(name==='list_tables')return [];
  if(name==='resolve_tracker_preview'){resolutions++;return resolutions===1?{screen:'tracker-preview',workspaceId:'w',preview:{id:'draft'}}:{screen:'tracker',workspaceId:'w',component:{id:'saved',version:0},recoveredFromPreview:true,initialOutput:{html:'saved'}};}
  if(name==='run_component_frontend')throw Error('Code preview unavailable');
  throw Error(name);
 };
 const result=await loadTrackerDisplay({screen:'tracker-preview',workspaceId:'w',preview:{id:'draft'}},call,()=>{});
 assert.equal(result.resolved.component.id,'saved');assert.equal(result.output.html,'saved');assert.equal(resolutions,2);
});
