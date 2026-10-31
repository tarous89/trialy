import {trackerOperation} from '../src/workspace/tracker-template.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {workspaceHome} from '../src/workspace/home.js';
import {AppSharing} from '../src/app-services/sharing.js';
import {withActor} from '../src/db/context.js';

test('draft execution and review stay separate from published apps and public links',async()=>{
 const pg=new PGlite();let hold=false,entered!:()=>void,release!:()=>void;
 const started=new Promise<void>(r=>entered=r),gate=new Promise<void>(r=>release=r);
 const db:Database={query:async(sql,args)=>{if(hold&&sql.includes('octet_length(selected::text)')){hold=false;entered();await gate;}return pg.query(sql,args) as any;},transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const owner={userId:randomUUID(),origin:'human' as const},ai={...owner,origin:'ai' as const};
  await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[owner.userId,owner.userId,'publisher@example.invalid','Publisher']);
  const s=new Service(db),f=new WorkspaceFoundation(db),sharing=new AppSharing(db),w=await s.createWorkspace(owner,'Publication');await s.setAi(owner,w.id,true);
  const tablePreview=await s.preview(owner,w.id,{kind:'create_type',name:'Items',fields:[{key:'name',name:'Name',kind:'text',ai:true}]}),typeId=(await s.commit(owner,tablePreview.id,tablePreview.digest)).objects[0].id;
  const content={name:'Published app',format:'frontend-js',sourceAccess:'bindings',source:'return {html:"<h1>Published</h1>"};',bindings:[{typeId,fields:['name']}]};
  const initial=await f.preview(owner,w.id,{kind:'save_component',content}),saved=await f.confirm(owner,w.id,initial.id,initial.digest);
  const sharePreview=await sharing.prepare(owner,w.id,{appId:saved.id,appVersion:0,kind:'public',reviewedSource:true}),share=await sharing.confirm(owner,w.id,sharePreview.id,sharePreview.digest),token=share.url!.split('#')[1];
  const before=await f.checkComponentAccess(owner,w.id,saved.id);
  const operation={kind:'save_component',componentId:saved.id,expectedVersion:0,content:{...content,source:`tools.call('records.read',{typeId:'${typeId}'});return {html:'<h1>Draft only</h1>'};`}};
  const draft=await f.preview(ai,w.id,operation);hold=true;
  const draftRun=f.runFrontend(ai,w.id,{previewId:draft.id});await started;
  try{
   const live=await f.runFrontend(owner,w.id,{componentId:saved.id,expectedVersion:0});assert.match(live.html,/Published/);assert.equal(live.temporary,false);
   const secondClient=await f.runFrontend(ai,w.id,{componentId:saved.id,expectedVersion:0});assert.match(secondClient.html,/Published/);
   const publicView=await sharing.publicContext(token);assert.equal(publicView.c.version,0);assert.match(publicView.c.source,/Published/);
   assert.deepEqual(await f.checkComponentAccess(owner,w.id,saved.id),before);
  }finally{release();}
  assert.match((await draftRun).html,/Draft only/);
  const extra=await f.preview(ai,w.id,{kind:'save_component',content:{...content,name:'Unfinished app'}});
  assert.deepEqual((await workspaceHome(db,owner,w.id)).resources.map(r=>r.id),[saved.id]);assert.ok((await workspaceHome(db,ai,w.id)).resources.some(r=>r.id===extra.id));
  await f.discard(ai,w.id,extra.id);
  // Unrelated workspace changes must not invalidate the current viewer's app access.
  await db.query('UPDATE workspaces SET access_version=access_version+1 WHERE id=$1',[w.id]);
  assert.equal((await f.checkComponentAccess(owner,w.id,saved.id)).accessStamp,before.accessStamp);
  // Re-prepare after that explicit access change; publication remains exact and atomic.
  const final=await f.preview(ai,w.id,operation),stale=await f.preview(ai,w.id,operation);
  await f.confirm({...ai,actionConfirmed:true},w.id,final.id,final.digest);
  await assert.rejects(f.confirm({...ai,actionConfirmed:true},w.id,stale.id,stale.digest),/changed/);
  assert.equal((await f.readComponent(owner,w.id,saved.id)).component.version,1);
  const publicView=await sharing.publicContext(token);assert.equal(publicView.c.version,1);
  assert.match((await withActor(publicView.a,()=>f.runFrontend(publicView.a,w.id,{componentId:saved.id,expectedVersion:1}))).html,/Draft only/);
  await sharing.revoke(owner,w.id,share.id);await assert.rejects(sharing.publicContext(token));
 }finally{release?.();await db.close();}
});

test('open publications keep compatible reads and writes with current permissions and schema checks',async()=>{
 const pg=new PGlite();const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const owner={userId:randomUUID(),origin:'human' as const},member={userId:randomUUID(),origin:'human' as const};
  for(const a of [owner,member])await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,a.userId+'@example.invalid','Viewer']);
  const s=new Service(db),f=new WorkspaceFoundation(db),w=await s.createWorkspace(owner,'Pinned publications');await s.setAi(owner,w.id,true);
  const save=async(op:any)=>{const p=await s.preview(owner,w.id,op);return s.commit(owner,p.id,p.digest);};
  const publish=async(op:any)=>{const p=await f.preview(owner,w.id,op);return f.confirm(owner,w.id,p.id,p.digest);};
  const fields=[{key:'name',name:'Name',kind:'text',ai:true},{key:'note',name:'Note',kind:'text',ai:true}];
  const typeId=(await save({kind:'create_type',name:'Items',fields})).objects[0].id;
  const row=(await save({kind:'create_record',typeId,data:{name:'Original',note:'Keep'}})).objects[0].id;
  const source=(title:string)=>`const page=tools.call('records.read',{typeId:'${typeId}'});if(input.event.action==='rename')tools.call('records.propose',[{kind:'update_record',recordId:'${row}',expectedVersion:page.rows[0].version,data:{name:input.event.value}}]);return {html:'<h1>${title}</h1>',state:page};`;
  const content={name:'Continuity',format:'frontend-js',sourceAccess:'bindings',source:source('Version zero'),bindings:[{typeId,fields:['name','note']}]};
  const app=await publish({kind:'save_component',content});await s.share(owner,w.id,member.userId,'editor',[],null,true);
  const loaded=await f.runFrontend(owner,w.id,{componentId:app.id,expectedVersion:0});
  const memberLoaded=await f.runFrontend(member,w.id,{componentId:app.id,expectedVersion:0});
  const sharing=new AppSharing(db),sp=await sharing.prepare(owner,w.id,{appId:app.id,appVersion:0,kind:'public',mode:'edit',reviewedSource:true}),share=await sharing.confirm(owner,w.id,sp.id,sp.digest),token=share.url!.split('#')[1];
  const publicContext=await sharing.publicContext(token),publicLoaded=await withActor(publicContext.a,()=>f.runFrontend(publicContext.a,w.id,{componentId:app.id,expectedVersion:0}));
  const old={componentId:app.id,expectedVersion:0,viewId:loaded.viewId};
  const pending=await f.runFrontend(owner,w.id,{...old,event:{kind:'click',action:'rename',value:'Saved after publish'}});
  await publish({kind:'save_component',componentId:app.id,expectedVersion:0,content:{...content,source:source('Version one')}});
  assert.equal((await f.checkComponentAccess(owner,w.id,app.id,loaded.viewId)).version,1);
  await f.confirm(owner,w.id,pending.proposal.id,pending.proposal.digest);
  const stillOld=await f.runFrontend(owner,w.id,old);assert.match(stillOld.html,/Version zero/);assert.equal(stillOld.state.rows[0].data.name,'Saved after publish');
  assert.match((await f.runFrontend(owner,w.id,{componentId:app.id,expectedVersion:1})).html,/Version one/);
  await assert.rejects(f.runFrontend(owner,w.id,{componentId:app.id,expectedVersion:0}),/newer app version/);
  await assert.rejects(f.runFrontend(member,w.id,old),/session needs a refresh/);
  await assert.rejects(f.runFrontend({...owner,origin:'ai'},w.id,old),/session needs a refresh/);
  await assert.rejects(f.runFrontend(owner,w.id,{...old,expectedVersion:1}),/session needs a refresh/);
  await assert.rejects(f.runFrontend(owner,w.id,{...old,viewId:randomUUID()}),/session needs a refresh/);
  // Additive schema changes do not break existing field writes.
  await save({kind:'update_type',typeId,expectedVersion:0,name:'Items',fields:[...fields,{key:'extra',name:'Extra',kind:'text',ai:true}]});
  const compatible=await f.runFrontend(owner,w.id,{...old,event:{kind:'click',action:'rename',value:'Compatible save'}});await f.confirm(owner,w.id,compatible.proposal.id,compatible.proposal.digest);
  // Changing a field contract rejects both a new write and a pending reviewed write.
  const pendingSchema=await f.runFrontend(owner,w.id,{...old,event:{kind:'click',action:'rename',value:'Must not commit'}});
  // Simulate the result of an explicitly reviewed schema migration.
  const migrated=(await db.query('SELECT fields FROM entity_types WHERE id=$1',[typeId])).rows[0].fields.map((field:any)=>field.key==='name'?{...field,required:true}:field);
  await db.query('UPDATE entity_types SET fields=$2,version=version+1 WHERE id=$1',[typeId,JSON.stringify(migrated)]);
  await assert.rejects(f.confirm(owner,w.id,pendingSchema.proposal.id,pendingSchema.proposal.digest),/no longer compatible/);
  await assert.rejects(f.runFrontend(owner,w.id,{...old,event:{kind:'click',action:'rename',value:'Must not save'}}),/no longer compatible/);
  assert.equal((await f.checkComponentAccess(owner,w.id,app.id,loaded.viewId)).version,1);
  assert.equal((await s.records(owner,w.id,typeId)).rows[0].data.name,'Compatible save');
  // A freshly opened generic app can use the revised schema, without requiring a code edit.
  const fresh=await f.runFrontend(owner,w.id,{componentId:app.id,expectedVersion:1});const freshEdit=await f.runFrontend(owner,w.id,{componentId:app.id,expectedVersion:1,viewId:fresh.viewId,event:{kind:'click',action:'rename',value:'Fresh save'}});await f.confirm(owner,w.id,freshEdit.proposal.id,freshEdit.proposal.digest);
  // Removing a field leaves the loaded view available, but writes to it fail.
  await db.query('UPDATE entity_types SET fields=$2,version=version+1 WHERE id=$1',[typeId,JSON.stringify(migrated.filter((field:any)=>field.key==='note'))]);
  await f.checkComponentAccess(owner,w.id,app.id,loaded.viewId);await assert.rejects(f.runFrontend(owner,w.id,{...old,event:{kind:'click',action:'rename',value:'Removed'}}),/no longer compatible/);
  const pc=await sharing.publicContext(token,true);assert.match((await withActor(pc.a,()=>f.runFrontend(pc.a,w.id,{componentId:app.id,expectedVersion:0,viewId:publicLoaded.viewId}))).html,/Version zero/);
  const publicWrite=await withActor(pc.a,()=>f.preview(pc.a,w.id,{kind:'apply_component_records',componentId:app.id,expectedVersion:0,viewId:publicLoaded.viewId,changes:[{kind:'update_record',recordId:row,expectedVersion:3,data:{note:'Still compatible'}}]}));
  await withActor(pc.a,()=>f.confirm(pc.a,w.id,publicWrite.id,publicWrite.digest));
  // Removing read permission is distinct from changing a schema or publishing code.
  await s.share(owner,w.id,member.userId,'editor',['note'],null,true);
  await assert.rejects(f.checkComponentAccess(member,w.id,app.id,memberLoaded.viewId),/access.*changed/);
  const partialOp=await trackerOperation(f,owner,w.id,{name:'Partial visibility',description:'Access changes during an open session',tabs:[{name:'Notes',typeId,columns:[{field:'note'}]}]}),partialApp=await publish({...partialOp,content:{...partialOp.content,sourceAccess:'bindings'}});
  const partial=await f.runFrontend(member,w.id,{componentId:partialApp.id,expectedVersion:0});
  await s.share(owner,w.id,member.userId,'editor',[],null,true);
  await f.runFrontend(member,w.id,{componentId:partialApp.id,expectedVersion:0,viewId:partial.viewId});
  await s.share(owner,w.id,member.userId,'editor',['note'],null,true);
  await assert.rejects(f.checkComponentAccess(member,w.id,partialApp.id,partial.viewId),/access.*changed/);
  await sharing.revoke(owner,w.id,share.id);await assert.rejects(sharing.publicContext(token,true));
  await db.query("UPDATE app_runtime_views SET expires_at=now()-interval '1 second' WHERE id=$1",[loaded.viewId]);
  await assert.rejects(f.runFrontend(owner,w.id,old),/session needs a refresh/);
 }finally{await db.close();}
});
