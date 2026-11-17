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
import {TOOL_POLICY_QUERY} from '../src/domain/effective-access.js';
test('Apps page still loads after archiving an app that owns helpers, without reading app source for table checks',async()=>{
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
  const helpers=before.resources.filter((r:any)=>r.source==='function').length;assert.ok(helpers>0);
  // Table checks made for an app read its permission columns, never its saved source.
  assert.ok(seen.includes(TOOL_POLICY_QUERY));
  const c=(await f.readComponent(owner,w.id,apps[0].appId)).component;
  const p=await f.preview(owner,w.id,{kind:'archive_component',componentId:c.id,expectedVersion:c.version,archived:true});await f.confirm(human,w.id,p.id,p.digest);
  const after=await accountHome(db,owner,{limit:50});
  assert.deepEqual(after.resources.filter((r:any)=>r.source==='component').map((r:any)=>r.id),[apps[1].appId]);
  const remaining=after.resources.filter((r:any)=>r.source==='function').length;
  assert.ok(remaining>0&&remaining<helpers);
 }finally{await pg.close();}
});
