import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {syncTemplateCatalog,installCatalogApp} from '../src/workspace/template-catalog.js';
import {catalogBody,isCatalogSource} from '../src/workspace/catalog-source.js';
import {readAppUpdate,prepareAppUpdate} from '../src/workspace/app-update.js';
const RELEASES:[string,string,string][]=[['life.cash-runway','2.2.0','2.2.1'],['life.contracts','1.1.0','1.1.1'],['life.cro-selection','2.1.0','2.1.1'],['life.data-room','1.1.0','1.1.1'],['life.investor-crm','2.0.0','2.0.1'],['life.investor-updates','1.0.0','1.0.1'],['life.partnership-tracker','2.2.0','2.2.1'],['life.project-oversight','2.2.0','2.2.1'],
 ['life.deal-radar','1.0.0','1.0.1'],['life.funding-radar','1.0.0','1.0.1'],['life.literature-radar','2.0.0','2.0.1'],['life.market-radar','1.0.0','1.0.1'],['life.patent-radar','1.0.0','1.0.1'],['life.pipeline-radar','1.0.0','1.0.1'],['life.regulatory-radar','1.0.0','1.0.1'],['life.trial-radar','1.0.0','1.0.1']];
test('an installed catalog app updates to the newer version of the same app: only its template code changes, after review',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  await syncTemplateCatalog(db);
  // As in production: the earlier versions are approved too.
  for(const [id,old] of RELEASES)await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id=$1 AND version=$2",[id,old]);
  const owner={userId:randomUUID(),origin:'human' as const},human={...owner,actionConfirmed:true} as any,viewer={userId:randomUUID(),origin:'human' as const};
  for(const u of [owner,viewer])await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[u.userId,u.userId,u.userId+'@example.invalid','Update']);
  const service=new Service(db),catalog=new AppTemplates(undefined,db),f=new WorkspaceFoundation(db);
  for(const [id,old,next] of RELEASES){
   // One workspace per app keeps shared tables out of the comparison.
   const w=await service.createWorkspace(owner,id);
   const from=await catalog.read({templateId:id,version:old}),to=await catalog.read({templateId:id,version:next});
   const installed=await installCatalogApp(f,human,w.id,{templateId:id,version:old,digest:from.digest,name:from.name,requestKey:randomUUID(),createNew:true});
   const before=(await f.readComponent(owner,w.id,installed.appId)).component;
   assert.equal(catalogBody(before.source),from.source,id);
   const offer:any=await readAppUpdate(f,owner,w.id,installed.appId);
   assert.deepEqual({...offer},{available:true,componentId:before.id,expectedVersion:before.version,templateId:id,name:to.name,fromVersion:old,toVersion:next,toDigest:to.digest,canUpdate:true},id);
   // Reading the offer and preparing the review change nothing.
   const prepared=await prepareAppUpdate(f,owner,w.id,{componentId:before.id,expectedVersion:before.version,toVersion:next,toDigest:to.digest});
   assert.deepEqual(prepared.update,{name:to.name,fromVersion:old,toVersion:next});
   assert.equal((await f.readComponent(owner,w.id,installed.appId)).component.source,before.source,id);
   await f.confirm(human,w.id,prepared.preview.id,prepared.preview.digest);
   const after=(await f.readComponent(owner,w.id,installed.appId)).component;
   assert.equal(after.version,before.version+1,id);
   // The configuration and bindings lines are kept exactly; only the template code behind them is replaced.
   assert.equal(catalogBody(after.source),to.source,id);
   assert.equal(after.source.slice(0,after.source.length-to.source!.length),before.source.slice(0,before.source.length-from.source!.length),id);
   for(const key of ['name','bindings','manifest','project_id','source_access','resource_kind','allowed_users','ai_enabled','assets','execution','format'])assert.deepEqual(after[key],before[key],id+' '+key);
   assert.equal(await isCatalogSource(db,after.source),true,id);
   const origin=(await pg.query<any>("SELECT snapshot->'catalogOrigin' AS o FROM revisions WHERE workspace_id=$1 AND object_id=$2 AND object_kind='workspace_component' ORDER BY version DESC LIMIT 1",[w.id,after.id])).rows[0].o;
   assert.deepEqual(origin,{id,version:next,digest:to.digest},id);
   assert.deepEqual(await readAppUpdate(f,owner,w.id,installed.appId),{available:false,reason:'current'},id);
   // The updated app opens.
   const opened:any=await f.readComponent(owner,w.id,installed.appId,true);assert.ok(opened.initialOutput?.html?.length>0,id+' renders after the update');
  }
 }finally{await pg.close();}
});
test('no update is offered or prepared for changed code, stale requests, or people who cannot change the app',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  await syncTemplateCatalog(db);
  const [id,old,next]=RELEASES[1];await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id=$1 AND version=$2",[id,old]);
  const owner={userId:randomUUID(),origin:'human' as const},human={...owner,actionConfirmed:true} as any,viewer={userId:randomUUID(),origin:'human' as const},stranger={userId:randomUUID(),origin:'human' as const};
  for(const u of [owner,viewer,stranger])await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[u.userId,u.userId,u.userId+'@example.invalid','Update']);
  const service=new Service(db),catalog=new AppTemplates(undefined,db),f=new WorkspaceFoundation(db),w=await service.createWorkspace(owner,'Update');
  await service.share(owner,w.id,viewer.userId,'viewer',[],null,true);
  const from=await catalog.read({templateId:id,version:old}),to=await catalog.read({templateId:id,version:next});
  const app=await installCatalogApp(f,human,w.id,{templateId:id,version:old,digest:from.digest,name:from.name,requestKey:randomUUID(),createNew:true});
  const c=(await f.readComponent(owner,w.id,app.appId)).component,request={componentId:c.id,expectedVersion:c.version,toVersion:next,toDigest:to.digest};
  // A viewer sees that an update exists but cannot start it; someone outside the workspace sees nothing.
  assert.equal((await readAppUpdate(f,viewer,w.id,c.id) as any).canUpdate,false);
  await assert.rejects(prepareAppUpdate(f,viewer,w.id,request));
  await assert.rejects(readAppUpdate(f,stranger,w.id,c.id),(e:any)=>e.status===404);
  await assert.rejects(prepareAppUpdate(f,stranger,w.id,request),(e:any)=>e.status===404);
  // Stale or mismatched requests are refused.
  await assert.rejects(prepareAppUpdate(f,owner,w.id,{...request,expectedVersion:c.version+1}),(e:any)=>e.code==='stale_version');
  await assert.rejects(prepareAppUpdate(f,owner,w.id,{...request,toDigest:'0'.repeat(64)}),(e:any)=>e.code==='template_changed');
  await assert.rejects(prepareAppUpdate(f,owner,w.id,{...request,toVersion:old,toDigest:from.digest}),(e:any)=>e.code==='template_changed');
  // The newest version withdrawn: nothing to update to.
  await pg.query("UPDATE app_template_catalog SET status='draft' WHERE template_id=$1 AND version=$2",[id,next]);
  assert.deepEqual(await readAppUpdate(f,owner,w.id,c.id),{available:false,reason:'current'});
  await assert.rejects(prepareAppUpdate(f,owner,w.id,request),(e:any)=>e.code==='update_unavailable');
  await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id=$1 AND version=$2",[id,next]);
  // Code someone changed is never replaced.
  const edited=await f.preview(owner,w.id,{kind:'save_component',componentId:c.id,expectedVersion:c.version,projectId:c.project_id,content:{name:c.name,source:c.source+'\n/* local change */',format:c.format,sourceAccess:c.source_access,resourceKind:c.resource_kind,manifest:c.manifest,bindings:c.bindings,assets:c.assets??[],execution:c.execution??[]}});
  await f.confirm(human,w.id,edited.id,edited.digest);
  assert.deepEqual(await readAppUpdate(f,owner,w.id,c.id),{available:false,reason:'changed_or_unlisted'});
  await assert.rejects(prepareAppUpdate(f,owner,w.id,{...request,expectedVersion:c.version+1}),(e:any)=>e.code==='update_unavailable');
 }finally{await pg.close();}
});
