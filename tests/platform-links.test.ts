import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {frameLinkTarget,resolveAppLink,platformUrl} from '../src/shared/app-links.js';

test('U4: one link contract from an app to the platform Access, Logs and Automations pages',()=>{
 const current={appId:randomUUID(),workspaceId:randomUUID(),source:'component' as const,route:{path:'/'}};
 for(const destination of ['access','logs','automations'] as const){
  const target=resolveAppLink('platform:'+destination,current,'https://platform.example');
  assert.deepEqual(target,{kind:'platform',destination,href:platformUrl(destination,current.workspaceId,current.appId)});
  assert.ok(frameLinkTarget('platform:'+destination,'https://platform.example',current),'the frame lets the link through');
 }
 assert.equal(platformUrl('logs','w','a'),'/?tab=logs&workspaceId=w&appId=a');
 assert.equal(platformUrl('access','w','a'),'/?tab=access-control&workspaceId=w&appId=a');
 // Only the three administration pages: anything else under platform: is refused.
 for(const href of ['platform:billing','platform:logs?x=1','platform:','platform:LOGS'])assert.equal(resolveAppLink(href,current,'https://platform.example'),null,href);
 assert.equal(frameLinkTarget('platform:billing','https://platform.example',current),null);
});

test('U5, A3: only an owner of the app changes its layout and settings',async()=>{
 const pg=new PGlite();const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const owner={userId:randomUUID(),origin:'human' as const},member={userId:randomUUID(),origin:'human' as const};
  for(const a of [owner,member])await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,a.userId+'@example.invalid','Person']);
  const s=new Service(db),f=new WorkspaceFoundation(db),w=await s.createWorkspace(owner,'Settings');
  const t=await s.preview(owner,w.id,{kind:'create_type',name:'Items',fields:[{key:'name',name:'Name',kind:'text',ai:true}]}),typeId=(await s.commit(owner,t.id,t.digest)).objects[0].id;
  // The app reports what the platform answered, so the test reads the platform's own message.
  const source="if(input.event.action==='layout'){try{tools.call('layout.propose',{heading:'Renamed'});}catch(e){return {html:'<p>'+String(e&&e.message||e)+'</p>'};}}return {html:'<h1>App</h1>'};";
  const p=await f.preview(owner,w.id,{kind:'save_component',content:{name:'Settings app',format:'frontend-js',sourceAccess:'bindings',source,bindings:[{typeId,fields:['name']}]}});
  const app=await f.confirm(owner,w.id,p.id,p.digest);await s.share(owner,w.id,member.userId,'editor',[],null,true);
  const click=(a:any)=>f.runFrontend(a,w.id,{componentId:app.id,expectedVersion:0,event:{kind:'click',action:'layout'}});
  assert.match((await click(member)).html,/Only an owner of this app can change its layout and settings/);
  // The owner passes the same check (what the layout itself contains is validated afterwards, as before).
  assert.doesNotMatch((await click(owner)).html,/Only an owner/);
 }finally{await db.close();}
});
