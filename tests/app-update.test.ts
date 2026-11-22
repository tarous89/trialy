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
/* 7.1 (A3, D41): a new major version that names the installed version in upgradeFrom is an owner-approved upgrade.
 * Records, the connected tables (bindings and tableMap) and the settings it still has carry across; settings it no longer
 * has are listed and dropped. Editors are refused before anything is prepared. */
test('an owner upgrades an installed copy to a new major version: records, connections and settings carry across',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  await syncTemplateCatalog(db);
  const [id,,from]=RELEASES[1];
  const owner={userId:randomUUID(),origin:'human' as const},human={...owner,actionConfirmed:true} as any,editor={userId:randomUUID(),origin:'human' as const};
  for(const u of [owner,editor])await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[u.userId,u.userId,u.userId+'@example.invalid','Upgrade']);
  const service=new Service(db),catalog=new AppTemplates(undefined,db),f=new WorkspaceFoundation(db),w=await service.createWorkspace(owner,'Upgrade');
  await service.share(owner,w.id,editor.userId,'editor',[],null,true);
  const old=await catalog.read({templateId:id,version:from,includeFunctionSource:true});
  const app=await installCatalogApp(f,human,w.id,{templateId:id,version:from,digest:old.digest,name:old.name,requestKey:randomUUID(),createNew:true});
  const before=(await f.readComponent(owner,w.id,app.appId)).component;
  // A major version with the same tables and helpers, one option removed and one added.
  const row=(await pg.query<any>('SELECT payload,install_schema FROM app_template_catalog WHERE template_id=$1 AND version=$2',[id,from])).rows[0];
  const payload={...row.payload,version:'9.0.0',upgradeFrom:[from],source:row.payload.source+'\n/* rebuilt */',options:{...row.payload.options,newChoice:{type:'string',description:'A new business choice.',default:'standard'}},defaults:{...row.payload.defaults}};
  delete payload.options.layoutProfile;delete payload.defaults.layoutProfile;
  await pg.query("INSERT INTO app_template_catalog(template_id,version,status,digest,payload,install_schema) VALUES($1,'9.0.0','approved',$2,$3,$4)",[id,'f'.repeat(64),JSON.stringify(payload),JSON.stringify(row.install_schema)]);
  const offer:any=await readAppUpdate(f,owner,w.id,app.appId);
  assert.equal(offer.available,true);assert.equal(offer.kind,'upgrade');assert.equal(offer.toVersion,'9.0.0');assert.equal(offer.canUpdate,true);
  assert.ok(offer.settings.removed.includes('layoutProfile'));assert.ok(offer.settings.added.includes('newChoice'));assert.ok(offer.settings.kept.includes('tableMap'));
  // An editor sees no upgrade they can start, and is refused before anything is prepared.
  assert.equal((await readAppUpdate(f,editor,w.id,app.appId) as any).canUpdate,false);
  const request={componentId:before.id,expectedVersion:before.version,toVersion:'9.0.0',toDigest:'f'.repeat(64)};
  await assert.rejects(prepareAppUpdate(f,editor,w.id,request),(e:any)=>e.code==='app_owner_required');
  const prepared:any=await prepareAppUpdate(f,owner,w.id,request);assert.equal(prepared.update.kind,'upgrade');
  await f.confirm(human,w.id,prepared.preview.id,prepared.preview.digest);
  const after=(await f.readComponent(owner,w.id,app.appId)).component;
  assert.equal(catalogBody(after.source),payload.source);
  const config=(s:string)=>JSON.parse(/^const templateConfiguration=(.+);\n/.exec(s)![1]),bindingsLine=(s:string)=>s.split('\n')[1];
  const was=config(before.source),now=config(after.source);
  assert.equal(now.tableMap,was.tableMap,'connections carry across');assert.equal(now.newChoice,'standard');assert.equal('layoutProfile' in now,false);
  for(const k of Object.keys(was).filter(k=>k!=='layoutProfile'))assert.deepEqual(now[k],was[k],'setting '+k);
  assert.equal(bindingsLine(after.source),bindingsLine(before.source));
  for(const key of ['name','bindings','manifest','project_id','execution'])assert.deepEqual(after[key],before[key],key);
  assert.deepEqual(await readAppUpdate(f,owner,w.id,app.appId),{available:false,reason:'current'});
  // Without upgradeFrom naming the installed version, a major version is not offered.
  const other=await installCatalogApp(f,human,w.id,{templateId:id,version:from,digest:old.digest,name:old.name+' 2',requestKey:randomUUID(),createNew:true});
  await pg.query("UPDATE app_template_catalog SET payload=jsonb_set(payload,'{upgradeFrom}','[]'::jsonb),digest='e'||repeat('f',63) WHERE template_id=$1 AND version='9.0.0'",[id]);
  assert.deepEqual(await readAppUpdate(f,owner,w.id,other.appId),{available:false,reason:'needs_review'});
 }finally{await pg.close();}
});
/* 7.1 (D41) with the real catalog: an installed Contracts 1.1.1 moves to the rebuilt 2.0.0 once its owner approves that
 * version, and still can after 1.1.1 is withdrawn. Until it moves, the withdrawn version keeps running in the browser. */
test('a real installed copy upgrades to the rebuilt version, also after its own version is withdrawn',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  await syncTemplateCatalog(db);
  const id='life.contracts',from='1.1.1',to='2.0.0';
  const owner={userId:randomUUID(),origin:'human' as const},human={...owner,actionConfirmed:true} as any;
  await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[owner.userId,owner.userId,owner.userId+'@example.invalid','Upgrade']);
  const service=new Service(db),catalog=new AppTemplates(undefined,db),f=new WorkspaceFoundation(db),w=await service.createWorkspace(owner,'Upgrade');
  const old=await catalog.read({templateId:id,version:from,includeFunctionSource:true});
  const app=await installCatalogApp(f,human,w.id,{templateId:id,version:from,digest:old.digest,name:old.name,requestKey:randomUUID(),createNew:true});
  const before=(await f.readComponent(owner,w.id,app.appId)).component;
  // The rebuilt version is a draft until its owner approves it: nothing is offered.
  assert.deepEqual(await readAppUpdate(f,owner,w.id,app.appId),{available:false,reason:'current'});
  await pg.query("UPDATE app_template_catalog SET status='approved',updated_at=now() WHERE template_id=$1 AND version=$2",[id,to]);
  let offer:any=await readAppUpdate(f,owner,w.id,app.appId);
  assert.equal(offer.kind,'upgrade');assert.equal(offer.fromVersion,from);assert.equal(offer.toVersion,to);
  // The earlier version is withdrawn: the copy is still that version, not a customized app.
  await pg.query("UPDATE app_template_catalog SET status='draft',updated_at=now() WHERE template_id=$1 AND version=$2",[id,from]);
  offer=await readAppUpdate(f,owner,w.id,app.appId);
  assert.equal(offer.available,true);assert.equal(offer.kind,'upgrade');assert.equal(offer.toVersion,to);
  const v1:any=await f.runFrontend(owner,w.id,{componentId:before.id,expectedVersion:before.version,browser:{source:true}});
  assert.equal(v1.runtime,'trialy-frontend-js-v1');assert.equal(v1.browser.mode,'compat');
  const prepared:any=await prepareAppUpdate(f,owner,w.id,{componentId:before.id,expectedVersion:before.version,toVersion:to,toDigest:offer.toDigest});
  await f.confirm(human,w.id,prepared.preview.id,prepared.preview.digest);
  const after=(await f.readComponent(owner,w.id,app.appId)).component;
  const config=(s:string)=>JSON.parse(/^const templateConfiguration=(.+);\n/.exec(s)![1]);
  assert.equal(config(after.source).tableMap,config(before.source).tableMap,'connections carry across');
  assert.deepEqual(after.bindings,before.bindings);
  const v2:any=await f.runFrontend(owner,w.id,{componentId:after.id,expectedVersion:after.version,browser:{source:true}});
  assert.equal(v2.runtime,'trialy-frontend-js-v2');assert.equal(v2.browser.mode,'v2');assert.equal(v2.connected,false);
  assert.match(v2.html,/class="k-app"/);assert.doesNotMatch(v2.html,/<header|<h1|could not be shown/);
  assert.deepEqual(await readAppUpdate(f,owner,w.id,app.appId),{available:false,reason:'current'});
 }finally{await pg.close();}
});
