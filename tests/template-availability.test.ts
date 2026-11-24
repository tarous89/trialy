import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {syncTemplateCatalog,installCatalogApp,readCatalogInstallation} from '../src/workspace/template-catalog.js';
import {dataAccessStep} from '../src/workspace/data-access.js';
import {availabilityFile,templateAvailable,templateChannel} from '../src/workspace/template-availability.js';

const current=['life.cash-runway','life.contracts','life.cro-selection','life.data-room','life.deal-radar','life.funding-radar','life.investor-crm','life.investor-updates','life.literature-radar','life.market-radar','life.partnership-tracker','life.patent-radar','life.pipeline','life.pipeline-radar','life.project-oversight','life.regulatory-radar','life.trial-radar'];

test('every catalog app has platform, ChatGPT and Claude switches; only current apps are on',async()=>{
 const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8')),{apps}=availabilityFile.parse(JSON.parse(await readFile('templates/catalog-availability.json','utf8')));
 assert.deepEqual(Object.keys(apps).sort(),Object.keys(seed).sort());
 for(const [id,s] of Object.entries(apps)){const on=current.includes(id);assert.deepEqual(s,{platform:on,chatgpt:on,claude:on},id);}
 assert.equal(templateAvailable('life.inventory-management','platform'),false);
 assert.equal(templateAvailable('life.cro-selection','claude'),true);
 assert.equal(templateChannel({userId:'u',origin:'human'}),'platform');
 assert.equal(templateChannel({userId:'u',origin:'ai'}),'chatgpt');
 assert.equal(templateChannel({userId:'u',origin:'ai',assistant:'claude'}),'claude');
});

test('switched-off apps are hidden and cannot be installed; installed copies keep working',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  await syncTemplateCatalog(db);
  const human={userId:randomUUID(),origin:'human' as const};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[human.userId,human.userId,'availability@example.invalid','Availability tester']);
  const service=new Service(db),workspace=await service.createWorkspace(human,'Availability'),f=new WorkspaceFoundation(db);
  const all=new AppTemplates(undefined,db),old=(await all.read({templateId:'life.inventory-management'}));
  for(const channel of ['platform','chatgpt','claude'] as const){
   const c=new AppTemplates(undefined,db,channel);
   assert.deepEqual((await c.list({limit:50})).templates.map(t=>t.id).sort(),current);
   await assert.rejects(()=>c.read({templateId:old.id}),/unavailable/i);
   await assert.rejects(()=>c.identity({templateId:old.id,version:old.version}),/unavailable/i);
  }
  const request={templateId:old.id,version:old.version,digest:old.digest,name:old.name,requestKey:randomUUID()};
  await assert.rejects(()=>installCatalogApp(f,human,workspace.id,request),/unavailable/i);
  await assert.rejects(()=>readCatalogInstallation(db,human,workspace.id,{templateId:old.id,version:old.version}),/unavailable/i);
  await assert.rejects(()=>dataAccessStep(f,human,workspace.id,{install:{templateId:old.id,version:old.version}}),/unavailable/i);
  await service.setAi(human,workspace.id,true);
  for(const assistant of [undefined,'claude'] as const)await assert.rejects(()=>installCatalogApp(f,{...human,origin:'ai',actionConfirmed:true,...(assistant?{assistant}:{})},workspace.id,{...request,requestKey:randomUUID()}),/unavailable/i);
  // A current app still installs from every channel.
  const runway=await new AppTemplates(undefined,db,'platform').read({templateId:'life.cash-runway'});
  assert.ok((await installCatalogApp(f,human,workspace.id,{templateId:runway.id,version:runway.version,digest:runway.digest,name:runway.name,requestKey:randomUUID()})).appId);
 }finally{await pg.close();}
});
