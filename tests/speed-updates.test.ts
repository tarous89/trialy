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
import {catalogBody} from '../src/workspace/catalog-source.js';
import {readAppUpdate} from '../src/workspace/app-update.js';
import {applySpeedUpdates,speedOnlyCompatible} from '../src/workspace/speed-updates.js';

/* 7.2 (P11, D14, D15): a version its publisher declared speed-only, and that passes the machine check, reaches unchanged
 * copies automatically, with a revision and an audit entry; a customized copy is skipped; a speed-only version that
 * changes options is never applied. */
test('a speed-only version updates unchanged copies automatically and skips customized ones',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  await syncTemplateCatalog(db);
  const id='life.contracts',from='1.1.1';
  const owner={userId:randomUUID(),origin:'human' as const},human={...owner,actionConfirmed:true} as any;
  await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[owner.userId,owner.userId,owner.userId+'@example.invalid','Speed']);
  const service=new Service(db),catalog=new AppTemplates(undefined,db),f=new WorkspaceFoundation(db),w=await service.createWorkspace(owner,'Speed');
  const old=await catalog.read({templateId:id,version:from});
  const install=(name:string)=>installCatalogApp(f,human,w.id,{templateId:id,version:from,digest:old.digest,name,requestKey:randomUUID(),createNew:true});
  const plain=await install('Contracts'),custom=await install('Contracts custom');
  const c=(await f.readComponent(owner,w.id,custom.appId)).component;
  const edited=await f.preview(owner,w.id,{kind:'save_component',componentId:c.id,expectedVersion:c.version,projectId:c.project_id,content:{name:c.name,source:c.source+'\n/* local change */',format:c.format,sourceAccess:c.source_access,resourceKind:c.resource_kind,manifest:c.manifest,bindings:c.bindings,assets:c.assets??[],execution:c.execution??[]}});
  await f.confirm(human,w.id,edited.id,edited.digest);
  const row=(await pg.query<any>('SELECT payload,install_schema FROM app_template_catalog WHERE template_id=$1 AND version=$2',[id,from])).rows[0];
  // A speed-only version that also changes an option fails the machine check and is never applied.
  const changed={...row.payload,version:'1.1.2',speedOnly:true,source:row.payload.source+'\n/* faster */',options:{...row.payload.options,pageSize:{...row.payload.options.pageSize,description:'Changed'}}};
  assert.equal(speedOnlyCompatible(row.payload,changed,row.install_schema,row.install_schema),false);
  await pg.query("INSERT INTO app_template_catalog(template_id,version,status,digest,payload,install_schema) VALUES($1,'1.1.2','approved',$2,$3,$4)",[id,'a'.repeat(64),JSON.stringify(changed),JSON.stringify(row.install_schema)]);
  assert.equal(await applySpeedUpdates(db),0);
  // Not declared speed-only: same code change, but nobody's copy moves.
  const undeclared={...row.payload,version:'1.1.3',source:row.payload.source+'\n/* faster */'};
  await pg.query("INSERT INTO app_template_catalog(template_id,version,status,digest,payload,install_schema) VALUES($1,'1.1.3','approved',$2,$3,$4)",[id,'b'.repeat(64),JSON.stringify(undeclared),JSON.stringify(row.install_schema)]);
  assert.equal(await applySpeedUpdates(db),0);
  const speed={...row.payload,version:'1.1.4',speedOnly:true,source:row.payload.source+'\n/* faster still */'};
  await pg.query("INSERT INTO app_template_catalog(template_id,version,status,digest,payload,install_schema) VALUES($1,'1.1.4','approved',$2,$3,$4)",[id,'c'.repeat(64),JSON.stringify(speed),JSON.stringify(row.install_schema)]);
  const before=(await f.readComponent(owner,w.id,plain.appId)).component,customBefore=(await f.readComponent(owner,w.id,custom.appId)).component;
  assert.equal(await applySpeedUpdates(db),1);
  const after=(await f.readComponent(owner,w.id,plain.appId)).component;
  assert.equal(catalogBody(after.source),speed.source);assert.equal(after.version,before.version+1);
  assert.equal(after.source.slice(0,after.source.length-speed.source.length),before.source.slice(0,before.source.length-row.payload.source.length),'configuration and bindings lines kept');
  for(const key of ['name','bindings','manifest','project_id','execution'])assert.deepEqual(after[key],before[key],key);
  assert.deepEqual((await f.readComponent(owner,w.id,custom.appId)).component.source,customBefore.source,'customized copy skipped');
  const rev=(await pg.query<any>("SELECT snapshot->'catalogOrigin' AS o FROM revisions WHERE object_id=$1 AND object_kind='workspace_component' ORDER BY version DESC LIMIT 1",[after.id])).rows[0].o;
  assert.deepEqual(rev,{id,version:'1.1.4',digest:'c'.repeat(64)});
  const ev=(await pg.query<any>("SELECT origin,actor_id,after_value FROM audit_events WHERE object_id=$1 AND action='component.speed_updated'",[after.id])).rows;
  assert.equal(ev.length,1);assert.equal(ev[0].origin,'platform');assert.equal(ev[0].actor_id,owner.userId);assert.equal(ev[0].after_value.automatic,true);
  // The header says so once, while the app is at that version; a second pass changes nothing.
  assert.deepEqual((await readAppUpdate(f,owner,w.id,plain.appId) as any).recent?.toVersion,'1.1.4');
  assert.equal(await applySpeedUpdates(db),0);
  const opened:any=await f.readComponent(owner,w.id,plain.appId,true);assert.ok(opened.initialOutput?.html?.length>0,'the updated app opens');
 }finally{await pg.close();}
});
