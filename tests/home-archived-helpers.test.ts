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
import {accountHome} from '../src/workspace/home.js';
import {AutomationManagement} from '../src/automations/management.js';
import {TOOL_POLICY_QUERY} from '../src/domain/effective-access.js';
test('App helpers stay off the Apps page and are listed under their app, also after an app is archived',async()=>{
 const pg=new PGlite(),seen:string[]=[];
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>{seen.push(q);return pg.query(q,v) as any;},transaction:fn=>pg.transaction(tx=>fn({query:(q:string,v?:any[])=>{seen.push(q);return tx.query(q,v);}} as Connection)),close:async()=>{}};
  await syncTemplateCatalog(db);
  const owner={userId:randomUUID(),origin:'human' as const},human={...owner,actionConfirmed:true} as any;
  await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[owner.userId,owner.userId,'helpers@example.invalid','Helpers']);
  const w=await new Service(db).createWorkspace(owner,'Helpers'),f=new WorkspaceFoundation(db);
  const withHelpers=(await new AppTemplates(undefined,db).list({limit:50})).templates.filter(t=>t.functionCount>0).slice(0,2);
  assert.equal(withHelpers.length,2);
  const apps=[];for(const t of withHelpers)apps.push(await installCatalogApp(f,human,w.id,{templateId:t.id,version:t.version,digest:t.digest,name:t.name,requestKey:randomUUID()}));
  seen.length=0;
  const before=await accountHome(db,owner,{limit:50});
  assert.equal(before.resources.filter((r:any)=>r.source==='component').length,2);
  // B2: helpers installed with an app are never Apps entries of their own; they are listed under their app in Automations.
  assert.equal(before.resources.filter((r:any)=>r.source==='function').length,0);
  const listed=await new AutomationManagement(db).list(owner,w.id,{});
  assert.deepEqual(listed.helpers.map((h:any)=>h.appId).sort(),apps.map(x=>x.appId).sort());assert.ok(listed.helpers.every((h:any)=>h.names.length>0));
  assert.equal(Number((await db.query('SELECT count(*) FROM foundation_functions WHERE app_id IS NULL OR retired_at IS NOT NULL')).rows[0].count),0);
  // Table checks made for an app read its permission columns, never its saved source.
  assert.ok(seen.includes(TOOL_POLICY_QUERY));
  // A helper the app no longer uses is retired (kept for audit, hidden everywhere) and revived when used again.
  const execution=(await db.query('SELECT execution FROM workspace_components WHERE id=$1',[apps[1].appId])).rows[0].execution;
  await db.query("UPDATE workspace_components SET execution='[]' WHERE id=$1",[apps[1].appId]);
  assert.ok(Number((await db.query('SELECT count(*) FROM foundation_functions WHERE app_id=$1 AND retired_at IS NOT NULL',[apps[1].appId])).rows[0].count)>0);
  assert.deepEqual((await new AutomationManagement(db).list(owner,w.id,{})).helpers.map((h:any)=>h.appId),[apps[0].appId]);
  await db.query('UPDATE workspace_components SET execution=$2 WHERE id=$1',[apps[1].appId,JSON.stringify(execution)]);
  assert.equal(Number((await db.query('SELECT count(*) FROM foundation_functions WHERE retired_at IS NOT NULL')).rows[0].count),0);
  // The migration links and retires helpers saved before app ownership was recorded.
  const total=Number((await db.query('SELECT count(*) FROM foundation_functions')).rows[0].count);
  await db.query("UPDATE workspace_components SET execution=(SELECT jsonb_agg(e) FROM (SELECT e FROM jsonb_array_elements(execution) e OFFSET 1) x) WHERE id=$1",[apps[1].appId]);
  await db.query('UPDATE foundation_functions SET app_id=NULL,retired_at=NULL');
  const migration=await readFile('migrations/078_app_helper_ownership.sql','utf8');
  for(const statement of migration.split(/;\s*\n/).filter(x=>/^(--[^\n]*\n)*UPDATE foundation_functions/.test(x.trim())))await pg.exec(statement);
  assert.equal(Number((await db.query('SELECT count(*) FROM foundation_functions WHERE app_id IS NOT NULL')).rows[0].count),total);
  assert.equal(Number((await db.query('SELECT count(*) FROM foundation_functions WHERE retired_at IS NOT NULL')).rows[0].count),1);
  await db.query('UPDATE workspace_components SET execution=$2 WHERE id=$1',[apps[1].appId,JSON.stringify(execution)]);
  const c=(await f.readComponent(owner,w.id,apps[0].appId)).component;
  const p=await f.preview(owner,w.id,{kind:'archive_component',componentId:c.id,expectedVersion:c.version,archived:true});await f.confirm(human,w.id,p.id,p.digest);
  const after=await accountHome(db,owner,{limit:50});
  assert.deepEqual(after.resources.filter((r:any)=>r.source==='component').map((r:any)=>r.id),[apps[1].appId]);
  assert.equal(after.resources.filter((r:any)=>r.source==='function').length,0);
  assert.deepEqual((await new AutomationManagement(db).list(owner,w.id,{})).helpers.map((h:any)=>h.appId),[apps[1].appId]);
 }finally{await pg.close();}
});
