import {templateMedia} from '../src/workspace/template-media.js';
import {withActor,setDatabaseContext} from '../src/db/context.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {syncTemplateCatalog,installCatalogApp} from '../src/workspace/template-catalog.js';
test('catalog approval, complete suite installation, retry and tenant isolation',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  await syncTemplateCatalog(db);const catalog=new AppTemplates(undefined,db);
  const list=await catalog.list({limit:50});assert.equal(list.total,23);
  const actor={userId:randomUUID(),origin:'human' as const};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'catalog@example.invalid','Catalog tester']);
  const service=new Service(db),workspace=await service.createWorkspace(actor,'Catalog'),f=new WorkspaceFoundation(db);
  for(const t of list.templates){
   assert.ok((await templateMedia(catalog,t.id,t.version,'preview')).toString().includes('<html'),t.id);
   const image=await templateMedia(catalog,t.id,t.version,'screenshot');assert.ok(Buffer.isBuffer(image)&&image[0]===255&&image[1]===216,t.id);
   const request={templateId:t.id,version:t.version,digest:t.digest,name:t.name,requestKey:randomUUID()};
   const app=await installCatalogApp(f,actor,workspace.id,request);
   assert.ok(app.appId,t.id);assert.deepEqual(await installCatalogApp(f,actor,workspace.id,request),app);
   const saved=await f.readComponent(actor,workspace.id,app.appId);assert.equal(saved.component.name,t.name);
  }
  assert.equal((await db.query('SELECT count(*)::int AS n FROM records WHERE workspace_id=$1',[workspace.id])).rows[0].n,0);
  const candidate=list.templates[1],broken={templateId:candidate.id,version:candidate.version,digest:candidate.digest,name:candidate.name,requestKey:randomUUID()};
  const before=(await db.query('SELECT count(*)::int n FROM entity_types')).rows[0].n;
  await db.query("UPDATE app_template_catalog SET install_schema=install_schema || $2::jsonb WHERE template_id=$1 AND version=$3",[candidate.id,JSON.stringify({zz_invalid:{name:'Invalid schema',fields:[{key:'!',name:'Invalid',kind:'text'}],logicalFields:{}}}),candidate.version]);
  await assert.rejects(()=>installCatalogApp(f,actor,workspace.id,broken));
  assert.equal((await db.query('SELECT count(*)::int n FROM entity_types')).rows[0].n,before);
  await db.query("UPDATE app_template_catalog SET install_schema=install_schema - 'zz_invalid' WHERE template_id=$1 AND version=$2",[candidate.id,candidate.version]);
  await pg.exec(await readFile('ops/runtime-role.sql','utf8'));await pg.exec('SET ROLE trialy_runtime');
  assert.equal((await db.query('SELECT count(DISTINCT template_id)::int n FROM app_template_catalog')).rows[0].n,23);
  await assert.rejects(()=>db.query("UPDATE app_template_catalog SET status='approved'"));
  await pg.exec('RESET ROLE');
  const runtime:Database={query:(q,v)=>runtime.transaction(tx=>tx.query(q,v)),transaction:fn=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return fn(tx as Connection);}),close:async()=>{}};
  await withActor(actor,()=>installCatalogApp(new WorkspaceFoundation(runtime),actor,workspace.id,broken));
  const t=list.templates[0],request={templateId:t.id,version:t.version,digest:t.digest,name:t.name,requestKey:randomUUID()};
  await db.query("UPDATE app_template_catalog SET status='draft' WHERE template_id=$1",[t.id]);await syncTemplateCatalog(db);
  await assert.rejects(()=>catalog.read({templateId:t.id}));
  await assert.rejects(()=>templateMedia(catalog,t.id,t.version,'preview'));
  await assert.rejects(()=>templateMedia(catalog,'../../etc/passwd',t.version,'screenshot'));await assert.rejects(()=>installCatalogApp(f,actor,workspace.id,request));
  await assert.rejects(()=>installCatalogApp(f,{...actor,origin:'ai'},workspace.id,request));
  await assert.rejects(()=>installCatalogApp(f,{...actor,userId:randomUUID()},workspace.id,request));
  assert.equal((await catalog.list({limit:50})).total,22);
 }finally{await pg.close();}
});
