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
  assert.equal((await catalog.list({limit:50})).total,32);// 32 approved since migration 077 withdrew Sponsor RFP Management
  // templates/catalog-availability.json: the 16 current apps are on for the platform, ChatGPT and Claude; the 16 older apps are off everywhere.
  const list=await new AppTemplates(undefined,db,'platform').list({limit:50});assert.equal(list.total,16);
  for(const channel of ['chatgpt','claude'] as const)assert.deepEqual((await new AppTemplates(undefined,db,channel).list({limit:50})).templates.map(t=>t.id),list.templates.map(t=>t.id));
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
  // I2: Use always goes through the installation popup; installing without it is refused.
  await assert.rejects(installTool.handler({workspaceId:workspace.id,...aiRequest,confirmed:true}),(e:any)=>e.code==='installation_required');
  const step=await aiTools.get('read_data_access').handler({workspaceId:workspace.id,install:aiRequest});assert.equal(step.needed,true);assert.equal(step.team.choice,'editor');assert.ok(step.project.choice);
  const confirmInstall=()=>aiTools.get('confirm_data_access').handler({workspaceId:workspace.id,install:aiRequest,stepDigest:step.digest,confirmed:true});
  const installed=await confirmInstall();assert.ok(installed.appId);
  assert.deepEqual(await confirmInstall(),installed);
  const claudeInstalled=await installCatalogApp(f,{...ai,assistant:'claude',actionConfirmed:true,footerApproval:true},workspace.id,{...aiRequest,requestKey:randomUUID()});assert.ok(claudeInstalled.appId);
  const candidate=list.templates[1],broken={templateId:candidate.id,version:candidate.version,digest:candidate.digest,name:candidate.name,requestKey:randomUUID()};
  const before=(await db.query('SELECT count(*)::int n FROM entity_types')).rows[0].n;
  await db.query("UPDATE app_template_catalog SET install_schema=install_schema || $2::jsonb WHERE template_id=$1 AND version=$3",[candidate.id,JSON.stringify({zz_invalid:{name:'Invalid schema',fields:[{key:'!',name:'Invalid',kind:'text'}],logicalFields:{}}}),candidate.version]);
  await assert.rejects(()=>installCatalogApp(f,actor,workspace.id,broken));
  assert.equal((await db.query('SELECT count(*)::int n FROM entity_types')).rows[0].n,before);
  await db.query("UPDATE app_template_catalog SET install_schema=install_schema - 'zz_invalid' WHERE template_id=$1 AND version=$2",[candidate.id,candidate.version]);
  await pg.exec(await readFile('ops/runtime-role.sql','utf8'));await pg.exec('SET ROLE trialy_runtime');
  assert.equal((await db.query('SELECT count(DISTINCT template_id)::int n FROM app_template_catalog')).rows[0].n,32);// the runtime role sees approved templates only
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
  assert.equal((await catalog.list({limit:50})).total,31);
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

test('migration 063 approves Contracts 1.0.0 once, if an earlier deployment imported it as a draft; a later withdrawal sticks',async()=>{
 const pg=new PGlite();
 try{
  const files=(await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort(),last=files.find(f=>f.startsWith('063_'))!;
  for(const file of files.filter(f=>f<last))await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
  await syncTemplateCatalog(db);
  const status=async()=>Object.fromEntries((await pg.query<any>("SELECT template_id||'@'||version AS k,status FROM app_template_catalog ORDER BY 1")).rows.map(r=>[r.k,r.status]));
  // As in production: the deployment of #140 imported Contracts 1.0.0 as a draft.
  await pg.query("UPDATE app_template_catalog SET status='draft' WHERE template_id='life.contracts' AND version='1.0.0'");
  const before=await status();assert.equal(before['life.contracts@1.0.0'],'draft');
  await pg.exec(await readFile('migrations/'+last,'utf8'));await syncTemplateCatalog(db);
  const after=await status();assert.equal(after['life.contracts@1.0.0'],'approved');
  for(const [k,v] of Object.entries(before))if(k!=='life.contracts@1.0.0')assert.equal(after[k],v,k);
  const catalog=new AppTemplates(undefined,db);assert.ok((await catalog.list({query:'contracts'})).templates.some((t:any)=>t.id==='life.contracts'));// the seed now names 1.1.0 (migration 073)
  // An operator withdrawal afterwards is not undone by later deployments.
  await pg.query("UPDATE app_template_catalog SET status='draft' WHERE template_id='life.contracts' AND version='1.0.0'");await syncTemplateCatalog(db);
  assert.equal((await status())['life.contracts@1.0.0'],'draft');
 }finally{await pg.close();}
});

test('migration 075 publishes Programs 2.2.0 in place of 2.1.0, from the live catalog state, once',async()=>{
 const pg=new PGlite();
 try{
  const files=(await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort(),last=files.find(f=>f.startsWith('075_approve_programs'))!;
  for(const file of files.filter(f=>f<last))await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
  await syncTemplateCatalog(db);
  const status=async()=>Object.fromEntries((await pg.query<any>("SELECT template_id||'@'||version AS k,status FROM app_template_catalog ORDER BY 1")).rows.map(r=>[r.k,r.status]));
  // Live state before this deployment: 2.1.0 approved (migration 062), 2.2.0 imported earlier as a draft or not at all.
  await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.project-oversight' AND version='2.1.0'");
  await pg.query("DELETE FROM app_template_catalog WHERE template_id='life.project-oversight' AND version='2.2.0'");
  const before=await status();
  await pg.exec(await readFile('migrations/'+last,'utf8'));await syncTemplateCatalog(db);
  // The seed now names 2.2.1 (18 November 2026), so 2.2.0 is imported as a draft here and 2.2.1 is the approved version.
  const after=await status();assert.equal(after['life.project-oversight@2.1.0'],'draft');assert.equal(after['life.project-oversight@2.2.0'],'draft');assert.equal(after['life.project-oversight@2.2.1'],'approved');
  for(const [k,v] of Object.entries(before))if(!k.startsWith('life.project-oversight@'))assert.equal(after[k],v,k);
  const listed=(await new AppTemplates(undefined,db).list({query:'programs'})).templates.filter((t:any)=>t.id==='life.project-oversight');
  assert.deepEqual(listed.map((t:any)=>t.version),['2.2.1']);
  const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8'));assert.deepEqual(seed['life.project-oversight'],{schema:'templates/source/project-oversight/schema.example.json',version:'2.2.1'});
  const gallery=JSON.parse(await readFile('resources/template-gallery/manifest.json','utf8'));assert.ok(gallery['life.project-oversight@2.2.0'],'gallery media for 2.2.0');assert.ok(gallery['life.project-oversight@2.2.1'],'gallery media for 2.2.1');
  // A later operator decision is not undone.
  await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.project-oversight' AND version='2.1.0'");await syncTemplateCatalog(db);
  assert.equal((await status())['life.project-oversight@2.1.0'],'approved');
 }finally{await pg.close();}
});

test('migration 073 publishes Contracts 1.1.0 in place of 1.0.0, from the live catalog state, once',async()=>{
 const pg=new PGlite();
 try{
  const files=(await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort(),last=files.find(f=>f.startsWith('073_approve_contracts'))!;
  for(const file of files.filter(f=>f<last))await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
  await syncTemplateCatalog(db);
  const status=async()=>Object.fromEntries((await pg.query<any>("SELECT template_id||'@'||version AS k,status FROM app_template_catalog ORDER BY 1")).rows.map(r=>[r.k,r.status]));
  // Live state before this deployment: 1.0.0 approved (migration 063), 1.1.0 not yet imported.
  await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.contracts' AND version='1.0.0'");
  await pg.query("DELETE FROM app_template_catalog WHERE template_id='life.contracts' AND version='1.1.0'");
  const before=await status();
  await pg.exec(await readFile('migrations/'+last,'utf8'));await syncTemplateCatalog(db);
  // The seed now names 1.1.1 (18 November 2026), so 1.1.0 is imported as a draft here and 1.1.1 is the approved version.
  const after=await status();assert.equal(after['life.contracts@1.0.0'],'draft');assert.equal(after['life.contracts@1.1.0'],'draft');assert.equal(after['life.contracts@1.1.1'],'approved');
  for(const [k,v] of Object.entries(before))if(!k.startsWith('life.contracts@'))assert.equal(after[k],v,k);
  const listed=(await new AppTemplates(undefined,db).list({query:'contracts'})).templates.filter((t:any)=>t.id==='life.contracts');
  assert.deepEqual(listed.map((t:any)=>t.version),['1.1.1']);
  // Seed and retirement record match; a later operator decision is not undone.
  const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8'));assert.deepEqual(seed['life.contracts'],{schema:'templates/source/contracts/schema.example.json',version:'1.1.1'});
  await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.contracts' AND version='1.0.0'");await syncTemplateCatalog(db);
  assert.equal((await status())['life.contracts@1.0.0'],'approved');
 }finally{await pg.close();}
});

test('migration 074 publishes the Bio Radars and Literature Radar 2.0.0 in place of 1.2.2, from the live catalog state, once',async()=>{
 const pg=new PGlite();
 try{
  const files=(await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort(),last=files.find(f=>f.startsWith('074_approve_bio_radars'))!;
  for(const file of files.filter(f=>f<last))await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
  await syncTemplateCatalog(db);
  const status=async()=>Object.fromEntries((await pg.query<any>("SELECT template_id||'@'||version AS k,status FROM app_template_catalog ORDER BY 1")).rows.map(r=>[r.k,r.status]));
  const radars=['life.pipeline-radar@1.0.0','life.deal-radar@1.0.0','life.funding-radar@1.0.0','life.patent-radar@1.0.0','life.market-radar@1.0.0','life.regulatory-radar@1.0.0','life.literature-radar@2.0.0'];
  // Live state before this deployment: Literature 1.2.2 approved, none of the radars imported.
  await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.literature-radar' AND version='1.2.2'");
  for(const k of radars){const [id,v]=k.split('@');await pg.query('DELETE FROM app_template_catalog WHERE template_id=$1 AND version=$2',[id,v]);}
  const before=await status();
  await pg.exec(await readFile('migrations/'+last,'utf8'));await syncTemplateCatalog(db);
  const after=await status();assert.equal(after['life.literature-radar@1.2.2'],'draft');
  // The seed now names the next patch of each radar (18 November 2026): the versions published here are imported as drafts and their successors are approved.
  const next=(k:string)=>k.replace(/\d+$/,n=>String(Number(n)+1));
  for(const k of radars){assert.equal(after[k],'draft',k);assert.equal(after[next(k)],'approved',next(k));}
  for(const [k,v] of Object.entries(before))if(!k.startsWith('life.literature-radar@'))assert.equal(after[k],v,k);
  const catalog=new AppTemplates(undefined,db);
  assert.deepEqual((await catalog.list({query:'literature'})).templates.filter((t:any)=>t.id==='life.literature-radar').map((t:any)=>t.version),['2.0.1']);
  const listed=(await catalog.list({limit:50})).templates.map((t:any)=>t.id);for(const k of radars)assert.ok(listed.includes(k.split('@')[0]),k);
  // Seed and retirement record match; a later operator decision is not undone.
  const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8')),ret=JSON.parse(await readFile('templates/catalog-retirements.json','utf8')).retirements;
  for(const k of radars){const [id,v]=next(k).split('@');assert.equal(seed[id].version,v,k);}
  assert.ok(ret.some((r:any)=>r.templateId==='life.literature-radar'&&r.version==='1.2.2'&&r.replacedBy==='life.literature-radar@2.0.0'));
  await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.literature-radar' AND version='1.2.2'");await syncTemplateCatalog(db);
  assert.equal((await status())['life.literature-radar@1.2.2'],'approved');
 }finally{await pg.close();}
});

test('migration 077 publishes CRO Selection 2.1.0 in place of CRO Selection 1.0.1 and Sponsor RFP Management 1.0.1, from the live catalog state, once',async()=>{
 const pg=new PGlite();
 try{
  const files=(await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort(),last=files.find(f=>f.startsWith('077_approve_cro_selection'))!;
  for(const file of files.filter(f=>f<last))await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
  await syncTemplateCatalog(db);
  const status=async()=>Object.fromEntries((await pg.query<any>("SELECT template_id||'@'||version AS k,status FROM app_template_catalog ORDER BY 1")).rows.map(r=>[r.k,r.status]));
  // Live state before this deployment: both 1.0.1 versions approved, the 2.0.0 draft imported, 2.1.0 not yet imported.
  await pg.query("UPDATE app_template_catalog SET status='approved' WHERE version='1.0.1' AND template_id IN ('life.cro-selection','life.sponsor-rfp-management')");
  await pg.query("UPDATE app_template_catalog SET status='draft' WHERE template_id='life.cro-selection' AND version='2.0.0'");
  await pg.query("DELETE FROM app_template_catalog WHERE template_id='life.cro-selection' AND version='2.1.0'");
  const before=await status();
  await pg.exec(await readFile('migrations/'+last,'utf8'));await syncTemplateCatalog(db);
  const after=await status();
  // The seed now names 2.1.1 (18 November 2026), so 2.1.0 is imported as a draft here and 2.1.1 is the approved version.
  assert.deepEqual(['life.cro-selection@1.0.1','life.sponsor-rfp-management@1.0.1','life.cro-selection@2.0.0','life.cro-selection@2.1.0','life.cro-selection@2.1.1'].map(k=>after[k]),['draft','draft','draft','draft','approved']);
  for(const [k,v] of Object.entries(before))if(!['life.cro-selection@1.0.1','life.sponsor-rfp-management@1.0.1'].includes(k))assert.equal(after[k],v,k);
  const catalog=new AppTemplates(undefined,db);
  assert.deepEqual((await catalog.list({query:'cro selection'})).templates.filter((t:any)=>t.id==='life.cro-selection').map((t:any)=>t.version),['2.1.1']);
  assert.ok(!(await catalog.list({query:'sponsor rfp'})).templates.some((t:any)=>t.id==='life.sponsor-rfp-management'),'withdrawn from the gallery');
  const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8'));assert.deepEqual(seed['life.cro-selection'],{schema:'templates/source/cro-selection/schema.example.json',version:'2.1.1'});assert.equal(seed['life.sponsor-rfp-management'],undefined);
  // A later operator decision is not undone by later deployments.
  await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.sponsor-rfp-management' AND version='1.0.1'");await syncTemplateCatalog(db);
  assert.equal((await status())['life.sponsor-rfp-management@1.0.1'],'approved');
 }finally{await pg.close();}
});

test('the batched-read release of all 16 switched-on apps is the listed version; the versions it follows stay approved for installed copies',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
  const status=async()=>Object.fromEntries((await pg.query<any>("SELECT template_id||'@'||version AS k,status FROM app_template_catalog ORDER BY 1")).rows.map(r=>[r.k,r.status]));
  const releases:[string,string,string][]=[['life.cash-runway','2.2.0','2.2.1'],['life.contracts','1.1.0','1.1.1'],['life.cro-selection','2.1.0','2.1.1'],['life.data-room','1.1.0','1.1.1'],['life.investor-crm','2.0.0','2.0.1'],['life.investor-updates','1.0.0','1.0.1'],['life.partnership-tracker','2.2.0','2.2.1'],['life.project-oversight','2.2.0','2.2.1'],
   ['life.deal-radar','1.0.0','1.0.1'],['life.funding-radar','1.0.0','1.0.1'],['life.literature-radar','2.0.0','2.0.1'],['life.market-radar','1.0.0','1.0.1'],['life.patent-radar','1.0.0','1.0.1'],['life.pipeline-radar','1.0.0','1.0.1'],['life.regulatory-radar','1.0.0','1.0.1'],['life.trial-radar','1.0.0','1.0.1']];
  const availability=JSON.parse(await readFile('templates/catalog-availability.json','utf8')).apps;
  assert.deepEqual(releases.map(r=>r[0]).sort(),Object.keys(availability).filter(id=>availability[id].platform||availability[id].chatgpt||availability[id].claude).sort(),'every switched-on app, and only those');
  // Live state before this deployment: the earlier versions imported and approved, the new ones not yet imported.
  await syncTemplateCatalog(db);
  for(const [id,old,next] of releases){await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id=$1 AND version=$2",[id,old]);await pg.query('DELETE FROM app_template_catalog WHERE template_id=$1 AND version=$2',[id,next]);}
  const before=await status();
  // This deployment has no catalog migration: the sync imports the seeded versions approved and changes nothing else.
  await syncTemplateCatalog(db);
  const after=await status(),added=new Set(releases.map(([id,,next])=>id+'@'+next));
  for(const [id,old,next] of releases){assert.equal(after[id+'@'+next],'approved',id);assert.equal(after[id+'@'+old],'approved',id+': installed copies of '+old+' stay approved catalog code');}
  for(const [k,v] of Object.entries(before))assert.equal(after[k],v,k);
  for(const k of Object.keys(after))if(!(k in before))assert.ok(added.has(k),k);
  const catalog=new AppTemplates(undefined,db),listed=(await catalog.list({limit:50})).templates;
  const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8')),ret=JSON.parse(await readFile('templates/catalog-retirements.json','utf8')).retirements;
  const gallery=JSON.parse(await readFile('resources/template-gallery/manifest.json','utf8')),installers=JSON.parse(await readFile('templates/catalog-installers.json','utf8'));
  for(const [id,old,next] of releases){
   // New installs and the gallery use the new version; the earlier one is not retired.
   assert.equal(listed.find((t:any)=>t.id===id)?.version,next,id);assert.equal((await catalog.read({templateId:id})).version,next,id);assert.equal(seed[id].version,next,id);
   assert.ok(!ret.some((r:any)=>r.templateId===id&&r.version===old),id);
   // Both versions keep their own installer schema, preview and gallery image; the released one is never changed.
   assert.ok(gallery[id+'@'+old]&&gallery[id+'@'+next],id);assert.match(installers[id+'@'+old],/\/archive\//,id);
   // 7.3: once a rebuilt major version follows (a draft until approved), this release is archived too; the newest version is never archived.
   const newest=Object.keys(installers).filter(k=>k.startsWith(id+'@')).map(k=>k.slice(id.length+1)).sort((a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);return x[0]-y[0]||x[1]-y[1]||x[2]-y[2];}).pop()!;
   assert.doesNotMatch(installers[id+'@'+newest],/\/archive\//,id);if(newest!==next)assert.match(installers[id+'@'+next],/\/archive\//,id);
   for(const version of [old,next])assert.ok((await templateMedia(catalog,id,version,'preview')).toString().includes('<html'),id+'@'+version);
   const released=JSON.parse(await readFile(`templates/apps/${id}-${old}.json`,'utf8')),current=JSON.parse(await readFile(`templates/apps/${id}-${next}.json`,'utf8'));
   assert.equal(released.name,current.name,id);assert.deepEqual(Object.keys(released.options??{}),Object.keys(current.options??{}),id);
   assert.match(current.source,/records\.readMany/,id);assert.doesNotMatch(released.source,/records\.readMany/,id);
  }
 }finally{await pg.close();}
});

