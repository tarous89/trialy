import {addAppMcp} from '../src/server/apps.js';
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
  const tools=new Map<string,any>();addAppMcp({registerTool:(name:string,config:any,handler:any)=>tools.set(name,{config,handler})} as any,f,actor,(fn:any)=>fn,{});
  const mediaTool=tools.get('read_app_template_media');assert.deepEqual(mediaTool.config._meta.ui.visibility,['app']);assert.equal(mediaTool.config.annotations.readOnlyHint,true);
  const sample=list.templates[0],mediaArgs={templateId:sample.id,version:sample.version};
  const screenshot=await mediaTool.handler({...mediaArgs,kind:'screenshot'});assert.deepEqual(screenshot.content,[]);assert.equal(screenshot._meta.templateMedia.startsWith('data:image/jpeg;base64,'),true);assert.equal(JSON.stringify(screenshot.structuredContent).includes('base64'),false);
  const previewMedia=await mediaTool.handler({...mediaArgs,kind:'preview'});assert.match(previewMedia._meta.templateMedia,/http-equiv="Content-Security-Policy"/);assert.match(previewMedia._meta.templateMedia,/connect-src 'none'/);
  for(const t of list.templates){
   assert.ok((await templateMedia(catalog,t.id,t.version,'preview')).toString().includes('<html'),t.id);
   const image=await templateMedia(catalog,t.id,t.version,'screenshot');assert.ok(Buffer.isBuffer(image)&&image[0]===255&&image[1]===216,t.id);
   const request={templateId:t.id,version:t.version,digest:t.digest,name:t.name,requestKey:randomUUID()};
   const app=await installCatalogApp(f,actor,workspace.id,request);
   assert.ok(app.appId,t.id);assert.deepEqual(await installCatalogApp(f,actor,workspace.id,request),app);
   const saved=await f.readComponent(actor,workspace.id,app.appId);assert.equal(saved.component.name,t.name);
  }
  assert.equal((await db.query('SELECT count(*)::int AS n FROM records WHERE workspace_id=$1',[workspace.id])).rows[0].n,0);
  await service.setAi(actor,workspace.id,true);
  const ai={...actor,origin:'ai' as const},aiTools=new Map<string,any>();addAppMcp({registerTool:(name:string,config:any,handler:any)=>aiTools.set(name,{config,handler})} as any,f,ai,(fn:any)=>fn,{});
  const installTool=aiTools.get('install_app_template');assert.deepEqual(installTool.config._meta.ui.visibility,['app']);assert.equal(installTool.config.annotations.readOnlyHint,false);
  const approved=list.templates[1],aiRequest={templateId:approved.id,version:approved.version,digest:approved.digest,name:approved.name,requestKey:randomUUID()};
  await assert.rejects(()=>installCatalogApp(f,ai,workspace.id,aiRequest),/human|confirm|authoriz|approv/i);
  const installed=await installTool.handler({workspaceId:workspace.id,...aiRequest,confirmed:true});assert.ok(installed.appId);
  assert.deepEqual(await installTool.handler({workspaceId:workspace.id,...aiRequest,confirmed:true}),installed);
  const claudeInstalled=await installCatalogApp(f,{...ai,assistant:'claude',actionConfirmed:true},workspace.id,{...aiRequest,requestKey:randomUUID()});assert.ok(claudeInstalled.appId);
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
  assert.equal((await mediaTool.handler({templateId:t.id,version:t.version,kind:'preview'})).isError,true);
  await assert.rejects(()=>templateMedia(catalog,t.id,t.version,'preview'));
  await assert.rejects(()=>templateMedia(catalog,'../../etc/passwd',t.version,'screenshot'));await assert.rejects(()=>installCatalogApp(f,actor,workspace.id,request));
  await assert.rejects(()=>installCatalogApp(f,{...actor,origin:'ai'},workspace.id,request));
  await assert.rejects(()=>installCatalogApp(f,{...actor,userId:randomUUID()},workspace.id,request));
  assert.equal((await catalog.list({limit:50})).total,22);
 }finally{await pg.close();}
});

test('migration 062 approves Programs 2.1.0 once, if an earlier deployment imported it as a draft; a later withdrawal sticks',async()=>{
 const pg=new PGlite();
 try{
  const files=(await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort(),last=files.find(f=>f.startsWith('062_'))!;
  for(const file of files.filter(f=>f<last))await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
  await syncTemplateCatalog(db);
  const status=async()=>Object.fromEntries((await pg.query<any>("SELECT template_id||'@'||version AS k,status FROM app_template_catalog ORDER BY 1")).rows.map(r=>[r.k,r.status]));
  // As in production: 2.1.0 was imported as a draft by the deployment of #134, while 2.0.0 was approved.
  await pg.query("UPDATE app_template_catalog SET status='draft' WHERE template_id='life.project-oversight' AND version='2.1.0'");
  await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.project-oversight' AND version='2.0.0'");
  const before=await status();
  await pg.exec(await readFile('migrations/'+last,'utf8'));await syncTemplateCatalog(db);
  const after=await status();
  assert.equal(after['life.project-oversight@2.1.0'],'approved');assert.equal(after['life.project-oversight@2.0.0'],'approved','2.0.0 stays available');
  for(const [k,v] of Object.entries(before))if(k!=='life.project-oversight@2.1.0')assert.equal(after[k],v,k);
  // An operator withdrawal afterwards is not undone by later deployments.
  await pg.query("UPDATE app_template_catalog SET status='draft' WHERE template_id='life.project-oversight' AND version='2.1.0'");await syncTemplateCatalog(db);
  assert.equal((await status())['life.project-oversight@2.1.0'],'draft');
 }finally{await pg.close();}
});
