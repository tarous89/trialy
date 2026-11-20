import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {readApp} from '../src/workspace/apps.js';

async function setup(){
 const pg=new PGlite();const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const owner={userId:randomUUID(),origin:'human' as const},ai={...owner,origin:'ai' as const,assistant:'claude' as const};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[owner.userId,owner.userId,'pending@example.invalid','Pending']);
 const s=new Service(db),f=new WorkspaceFoundation(db),w=await s.createWorkspace(owner,'Pending');await s.setAi(owner,w.id,true);
 const table=await s.preview(owner,w.id,{kind:'create_type',name:'Items',fields:[{key:'name',name:'Name',kind:'text',ai:true}]}),typeId=(await s.commit(owner,table.id,table.digest)).objects[0].id;
 const content=(html:string)=>({name:'Pending app',format:'frontend-js',sourceAccess:'bindings',source:`return {html:${JSON.stringify(html)}};`,bindings:[{typeId,fields:['name']}]});
 return {db,s,f,w,owner,ai,typeId,content};
}

test('A6, B1, D10: a pending app change is durable, one per app, and needs preparing again when the app moved',async t=>{
 const {db,s,f,w,owner,ai,content}=await setup();
 try{
  const first=await f.preview(owner,w.id,{kind:'save_component',content:content('<h1>One</h1>')});
  const app=await f.confirm(owner,w.id,first.id,first.digest);

  await t.test('an assistant change is stored without expiry and classified for the footer',async()=>{
   const draft=await f.preview(ai,w.id,{kind:'save_component',componentId:app.id,expectedVersion:0,content:content('<h1>Two</h1>')});
   const row=(await db.query("SELECT change_class,origin,assistant,component_id,base_version,review_group,expires_at='9999-12-31 00:00:00+00'::timestamptz AS forever FROM workspace_previews WHERE id=$1",[draft.id])).rows[0];
   assert.deepEqual({...row},{change_class:'assistant',origin:'ai',assistant:'claude',component_id:app.id,base_version:0,review_group:app.id,forever:true});
   assert.deepEqual((await f.pendingAppChanges(owner,w.id)).changes.map(c=>[c.previewId,c.changeClass,c.status,c.name]),[[draft.id,'assistant','preparing','Pending app']]);
   const ready=await f.finalizeAppPreview(ai,w.id,draft.id,draft.digest);
   assert.equal((await f.pendingAppChanges(owner,w.id,app.id)).changes[0].status,'ready');
   // B1: opening the app brings the pending change back, from any device or session.
   const opened:any=await readApp(f,owner,{workspaceId:w.id,appId:app.id,source:'component'});
   assert.equal(opened.pendingChange.previewId,ready.preview.id);assert.equal(opened.pendingChange.digest,ready.preview.digest);
  });

  await t.test('a second change to the same app is refused instead of silently replacing the one under review',async()=>{
   const [pending]=(await f.pendingAppChanges(owner,w.id,app.id)).changes;
   await assert.rejects(f.preview(owner,w.id,{kind:'save_component',componentId:app.id,expectedVersion:0,content:content('<h1>Other</h1>')}),(e:any)=>e.code==='pending_change_exists'&&JSON.parse(e.message).previewId===pending.previewId);
   const update=await f.beginAppUpdate(ai,w.id,app.id,0);
   assert.equal((update as any).pendingChange.previewId,pending.previewId);
   assert.equal((await f.pendingAppChanges(owner,w.id,app.id)).changes.length,1,'starting an update keeps the change under review');
  });

  await t.test('unrelated access changes elsewhere leave the pending change ready',async()=>{
   const other=await s.preview(owner,w.id,{kind:'create_type',name:'Unrelated',fields:[{key:'name',name:'Name',kind:'text',ai:true}]});await s.commit(owner,other.id,other.digest);
   await db.query('UPDATE workspaces SET access_version=access_version+1 WHERE id=$1',[w.id]);
   assert.equal((await f.pendingAppChanges(owner,w.id,app.id)).changes[0].status,'ready');
  });

  await t.test('when the app changed underneath, the change is listed as needs preparing and cannot be approved',async()=>{
   const [pending]=(await f.pendingAppChanges(owner,w.id,app.id)).changes;
   // Someone else publishes a newer version meanwhile (simulated directly: only the version matters).
   await db.query('UPDATE workspace_components SET version=version+1 WHERE id=$1',[app.id]);
   const [stale]=(await f.pendingAppChanges(owner,w.id,app.id)).changes;
   assert.equal(stale.status,'needs_preparing');assert.equal(stale.reason,'app_changed');
   await assert.rejects(f.confirm(owner,w.id,pending.previewId,pending.digest));
   const resolved=await f.resolveTrackerPreview(owner,w.id,pending.previewId);
   assert.equal(resolved.pendingChange.status,'needs_preparing');
   await f.discard(owner,w.id,pending.previewId);
   assert.deepEqual((await f.pendingAppChanges(owner,w.id)).changes,[]);
  });

  await t.test('a new app awaiting its first save is listed as new',async()=>{
   const fresh=await f.preview(ai,w.id,{kind:'save_component',content:{...content('<h1>New</h1>'),name:'Brand new'}});
   const [change]=(await f.pendingAppChanges(owner,w.id)).changes;
   assert.deepEqual([change.previewId,change.changeClass,change.componentId,change.name],[fresh.id,'new',null,'Brand new']);
  });
 }finally{await db.close();}
});

test('D11: an assistant prepares app changes but only a person approves them, in the footer',async()=>{
 const {db,f,w,owner,ai,content}=await setup();
 try{
  const handlers=new Map<string,any>(),tools=new Map<string,any>();
  const {addWorkspaceMcp}=await import('../src/server/workspace-foundation.js');
  addWorkspaceMcp({registerTool:(name:string,spec:any,handler:any)=>{handlers.set(name,handler);tools.set(name,spec);}} as any,f,ai,(h:any)=>h,{});
  const draft=await f.preview(ai,w.id,{kind:'save_component',content:content('<h1>By Claude</h1>')}),ready=await f.finalizeAppPreview(ai,w.id,draft.id,draft.digest);
  // The tool the assistant calls refuses, however it is asked.
  await assert.rejects(handlers.get('confirm_workspace_change')({workspaceId:w.id,previewId:ready.preview.id,digest:ready.preview.digest,confirmed:true}),(e:any)=>e.code==='human_approval_required');
  // The footer's tool is visible to the TrialAgents view only, never to the assistant.
  assert.deepEqual(tools.get('approve_workspace_change')._meta.ui.visibility,['app']);
  assert.equal(tools.get('list_pending_app_changes').annotations.readOnlyHint,true);
  // A new app is saved through the installation popup (3.3), so the footer sends its reviewed choices.
  await assert.rejects(handlers.get('approve_workspace_change')({workspaceId:w.id,previewId:ready.preview.id,digest:ready.preview.digest,confirmed:true}),(e:any)=>e.code==='installation_required');
  const step=await handlers.get('read_app_installation')({workspaceId:w.id,previewId:ready.preview.id});
  const saved=await handlers.get('approve_workspace_change')({workspaceId:w.id,previewId:ready.preview.id,digest:ready.preview.digest,confirmed:true,installation:{stepDigest:step.digest}});
  assert.ok(saved.id);assert.deepEqual((await f.pendingAppChanges(owner,w.id)).changes,[]);
  // Changes that are not app changes keep their existing confirmation in the conversation.
  const project=await f.preview(ai,w.id,{kind:'create_node',nodeKind:'project',name:'Assistant project'});
  assert.ok((await handlers.get('confirm_workspace_change')({workspaceId:w.id,previewId:project.id,digest:project.digest,confirmed:true})).id);
 }finally{await db.close();}
});
