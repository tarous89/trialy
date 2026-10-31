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
