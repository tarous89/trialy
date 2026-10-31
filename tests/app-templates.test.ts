import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {AppTemplates,appTemplates,readTemplateGuidance} from '../src/workspace/app-templates.js';
import {reuseAppOperation} from '../src/workspace/app-reuse.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {Service} from '../src/domain/service.js';
import {addAppMcp} from '../src/server/apps.js';
import type {Database,Connection} from '../src/db/database.js';
import type {Actor} from '../src/shared/schema.js';

test('catalog discovers added versions dynamically, bounds results, and rejects stale content',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'app-catalog-'));
 try{
  const original=await readFile('templates/apps/simple.calculator-1.0.0.json','utf8');await writeFile(join(dir,'one.json'),original);
  const catalog=new AppTemplates(dir);assert.equal((await catalog.list()).total,1);
  const t=await catalog.read({templateId:'simple.calculator'});assert.ok(t.configurationSchema);assert.equal((await catalog.list()).templates[0].id,t.id);assert.equal('source' in (await catalog.list()).templates[0],false);
  await writeFile(join(dir,'two.json'),JSON.stringify({...JSON.parse(original),id:'another.calculator',name:'Another calculator'}));assert.equal((await catalog.list()).total,2);assert.equal((await catalog.list({limit:1})).nextOffset,1);
  await writeFile(join(dir,'v2.json'),JSON.stringify({...JSON.parse(original),version:'2.0.0',defaults:{heading:'New default',currency:'USD'}}));assert.equal((await catalog.read({templateId:t.id})).version,'2.0.0');assert.equal((await catalog.read({templateId:t.id,version:t.version})).digest,t.digest);
  const input={templateId:t.id,version:t.version,digest:t.digest,name:'Estimate'};const op=await catalog.operation({} as any,{} as any,'unused',input);assert.ok(op.content.source.includes('Budget estimate'));
  await writeFile(join(dir,'one.json'),original+'\n');await assert.rejects(catalog.operation({} as any,{} as any,'unused',input),/changed/);
  const current=await catalog.read({templateId:t.id,version:t.version});await assert.rejects(catalog.operation({} as any,{} as any,'unused',{...input,digest:current.digest,configuration:{unknown:true}}),/Unknown/);
  await assert.rejects(catalog.read({templateId:'../../secret'}));assert.equal((await catalog.list({query:'no such template'})).total,0);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('templates and app reuse preserve review, source access, isolated data and source versions',async()=>{
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 try{
  const a:Actor={userId:randomUUID(),origin:'human'},other:Actor={userId:randomUUID(),origin:'human'};
  for(const u of [a,other])await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[u.userId,u.userId,'fixture@example.invalid','Fixture']);
  const f=new WorkspaceFoundation(db),s=new Service(db),w=await s.createWorkspace(a,'Template tests');
  const registered=new Map<string,any>();addAppMcp({registerTool:(n:string,m:any,run:any)=>registered.set(n,{m,run})} as any,f,a,(fn:any)=>fn,{ui:{resourceUri:'ui://trialy/test'}});
  assert.equal(registered.get('list_app_templates').m._meta.ui?.resourceUri,undefined);assert.equal(registered.get('read_app_template').m._meta.ui?.resourceUri,undefined);assert.equal(registered.get('prepare_app_from_existing').m._meta.ui.resourceUri,'ui://trialy/test');
  const guideTool=registered.get('read_app_template_guidance');assert.equal(guideTool.m._meta.ui?.resourceUri,undefined);assert.equal(guideTool.m.annotations.readOnlyHint,true);assert.equal((await guideTool.run({resource:'usage'})).structuredContent.result.sha256,(await readTemplateGuidance({resource:'usage'})).sha256);
  for(const templateId of ['simple.calculator','simple.checklist']){
   const t=await appTemplates.read({templateId});const result=await registered.get('prepare_app_from_template').run({workspaceId:w.id,templateId,version:t.version,digest:t.digest,name:templateId});assert.equal(result.screen,'tracker-preview');assert.ok(result.initialOutput.html.includes('<h1>'));assert.equal((await db.query('SELECT id FROM workspace_components')).rows.length,0);await f.discard(a,w.id,result.preview.id);
  }
  const t=await appTemplates.read({templateId:'vivid.tracker'});assert.equal(t.configurationSchema.type,'object');
  const table=randomUUID();const configuration={omitSource:true,description:'Research outreach',showExample:false,newTables:[{id:table,name:'Prospects',fields:[{key:'name',name:'Name',kind:'text',ai:true}]}],tabs:[{name:'Prospects',typeId:table,columns:[{field:'name'}]}]};
  const operation=await appTemplates.operation(f,a,w.id,{templateId:t.id,version:t.version,digest:t.digest,name:'Original',configuration});const rendered=await f.prepareRenderedTracker(a,w.id,operation);assert.equal(rendered.preview.body.catalogOrigin.digest,t.digest);assert.equal((await s.types(a,w.id)).length,0);
  const saved=await f.confirm(a,w.id,rendered.preview.id,rendered.preview.digest),c=(await f.readComponent(a,w.id,saved.id)).component;assert.equal((await s.types(a,w.id)).length,1);
  const recordDraft=await s.preview(a,w.id,{kind:'create_record',typeId:c.bindings[0].typeId,data:{name:'Original record'}});await s.commit(a,recordDraft.id,recordDraft.digest);
  const input={appId:c.id,expectedVersion:c.version,name:'Shared copy',mode:'shared_data'};
  await assert.rejects(reuseAppOperation(f,other,w.id,input));
  const copy=await f.prepareRenderedTracker(a,w.id,await reuseAppOperation(f,a,w.id,input));const receipt=await f.confirm(a,w.id,copy.preview.id,copy.preview.digest),copied=(await f.readComponent(a,w.id,receipt.id)).component;
  assert.notEqual(copied.id,c.id);assert.deepEqual(copied.bindings,c.bindings);assert.deepEqual(copied.execution,[]);assert.deepEqual(copied.assets,[]);assert.deepEqual(copied.allowed_users,[a.userId]);assert.equal(copied.ai_enabled,false);
  const fresh=randomUUID();const separate=await f.prepareRenderedTracker(a,w.id,await reuseAppOperation(f,a,w.id,{...input,mode:'separate_data',configuration:{...configuration,newTables:[{...configuration.newTables[0],id:fresh,name:'New prospects'}],tabs:[{name:'New prospects',typeId:fresh,columns:[{field:'name'}]}]}}));
  assert.equal((await s.types(a,w.id)).length,1);const separateReceipt=await f.confirm(a,w.id,separate.preview.id,separate.preview.digest),separateApp=(await f.readComponent(a,w.id,separateReceipt.id)).component;assert.notEqual(separateApp.bindings[0].typeId,c.bindings[0].typeId);assert.equal((await db.query('SELECT id FROM records')).rows.length,1);
  await assert.rejects(reuseAppOperation(f,a,w.id,{...input,mode:'separate_data'}),/Provide new/);
  await assert.rejects(f.prepareRenderedTracker(a,w.id,await reuseAppOperation(f,a,w.id,{...input,mode:'separate_data',content:{format:'frontend-js',source:c.source,bindings:c.bindings,manifest:c.manifest}})),/original tables/);
  const stale=await f.prepareRenderedTracker(a,w.id,await reuseAppOperation(f,a,w.id,input));await db.query('UPDATE workspace_components SET version=version+1 WHERE id=$1',[c.id]);await assert.rejects(f.confirm(a,w.id,stale.preview.id,stale.preview.digest),/changed/);
  await db.query('UPDATE workspace_components SET version=version-1,ai_enabled=false WHERE id=$1',[c.id]);await assert.rejects(reuseAppOperation(f,{...a,origin:'ai'},w.id,input));
  const current=(await f.readComponent(a,w.id,c.id)).component;assert.equal(current.name,'Original');assert.equal((await db.query('SELECT id FROM records')).rows.length,1);
 }finally{await pg.close();}
});


test('current templates expose useful documentation and optional task contracts while released versions remain readable',async()=>{
 const catalog=await appTemplates.list();assert.equal(catalog.guidance.tool,'read_app_template_guidance');
 for(const summary of catalog.templates){
  const t=await appTemplates.read({templateId:summary.id});assert.ok(t.documentation?.quickStart.length);assert.ok(t.documentation?.examples.length);assert.ok(t.documentation?.dataContract);assert.ok(t.documentation?.lifecycle);
  assert.ok(['optional','none'].includes(t.documentation?.tasks.mode??''));if(t.id.startsWith('simple.'))assert.equal(t.documentation?.tasks.mode,'none');assert.equal(t.guidance.tool,catalog.guidance.tool);
 }
 assert.equal((await appTemplates.read({templateId:'vivid.tracker',version:'1.1.0'})).version,'1.1.0');
 for(const resource of ['usage','authoring']){
  let offset:number|null=0,text='',digest='';
  do{const page=await readTemplateGuidance({resource,offset});assert.ok(page.text.length<=12000);if(digest)assert.equal(page.sha256,digest);digest=page.sha256;text+=page.text;offset=page.nextOffset;}while(offset!==null);
  const file=resource==='usage'?'TEMPLATE_USAGE.md':'TEMPLATE_AUTHORING.md';assert.equal(text,await readFile('templates/'+file,'utf8'));
 }
 await assert.rejects(readTemplateGuidance({resource:'../../secret'}));await assert.rejects(readTemplateGuidance({offset:999999}));
});
