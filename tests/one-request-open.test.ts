import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import request from 'supertest';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {syncTemplateCatalog,installCatalogApp} from '../src/workspace/template-catalog.js';
import {readApp} from '../src/workspace/apps.js';
import {baseApp,addApi,errors} from '../src/server/app.js';
import {primeEarlyRead,takeEarlyRead,dropEarlyReads,earlyReadKey} from '../src/shared/early-reads.js';
test('opening a custom app returns its first render with the read; the Apps page and app open are readable by GET',async()=>{
 process.env.SIMPLE_APPS_ENABLED='true';
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  await syncTemplateCatalog(db);
  const owner={userId:randomUUID(),origin:'human' as const},human={...owner,actionConfirmed:true} as any;
  await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[owner.userId,owner.userId,'open@example.invalid','Open']);
  const service=new Service(db),w=await service.createWorkspace(owner,'Open'),f=new WorkspaceFoundation(db);
  const t=(await new AppTemplates(undefined,db).list({limit:50})).templates.find(t=>t.engine==='frontend-js'&&t.functionCount>0)!;
  const app=await installCatalogApp(f,human,w.id,{templateId:t.id,version:t.version,digest:t.digest,name:t.name,requestKey:randomUUID()});
  // Without includeOutput nothing runs, as before.
  const plain:any=await f.readComponent(owner,w.id,app.appId);assert.equal(plain.initialOutput,undefined);
  const opened:any=await f.readComponent(owner,w.id,app.appId,true);
  assert.equal(opened.component.id,app.appId);assert.equal(typeof opened.initialOutput.html,'string');assert.ok(opened.initialOutput.html.length>0);
  assert.ok(opened.initialOutput.viewId);assert.ok(opened.initialOutput.frameUrl);
  // The same first render the client would otherwise request next.
  const separate:any=await f.runFrontend(owner,w.id,{componentId:app.appId,expectedVersion:opened.component.version,event:{kind:'open'}});
  assert.equal(opened.initialOutput.html,separate.html);
  // A first render that cannot be produced never fails the read; the client then renders and reports as before.
  const failing=Object.create(f);failing.runFrontend=async()=>{throw Object.assign(Error('This interface is busy'),{status:429,code:'runtime_busy'});};
  const fallback:any=await failing.readComponent(owner,w.id,app.appId,true);assert.equal(fallback.component.id,app.appId);assert.equal(fallback.initialOutput,undefined);
  const location={appId:app.appId,workspaceId:w.id,source:'component',route:{path:'/'}};
  assert.equal((await readApp(f,owner,location) as any).initialOutput,undefined);
  assert.ok((await readApp(f,owner,location,true) as any).initialOutput.html);
  // Someone without access gets no render and no app.
  const stranger={userId:randomUUID(),origin:'human' as const};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[stranger.userId,stranger.userId,'stranger@example.invalid','Stranger']);
  await assert.rejects(readApp(f,stranger,location,true),(e:any)=>e.status===404);
  let actor:any=owner;const http=baseApp();addApi(http,service,(req:any,_res:any,next:any)=>{req.actor=actor;req.session={csrf:'x'};next();});http.use(errors);
  const byGet=await request(http).get('/api/account/home');
  const byPost=await request(http).post('/api/account/home').send({query:'',kind:'all',projectId:'',sort:'updated',offset:0,limit:20});
  assert.equal(byGet.status,200);assert.deepEqual(byGet.body,byPost.body);assert.equal(byGet.body.resources.filter((r:any)=>r.source==='component').length,1);assert.equal(byGet.headers['cache-control'],'no-store');
  assert.equal((await request(http).get('/api/account/home?limit=1000')).status,400);
  const resolved=await request(http).get('/api/apps/resolve').set('X-App-Location',JSON.stringify(location));
  assert.equal(resolved.status,200);assert.equal(resolved.body.component.id,app.appId);assert.ok(resolved.body.initialOutput.html);assert.equal(resolved.headers['cache-control'],'no-store');
  assert.equal((await request(http).get('/api/apps/resolve').set('X-App-Location','not-json')).status,400);assert.equal((await request(http).get('/api/apps/resolve')).status,400);
  actor=stranger;assert.equal((await request(http).get('/api/apps/resolve').set('X-App-Location',JSON.stringify(location))).status,404);
 }finally{await pg.close();}
});
test('an early read is used once, by the matching request only, and never when it failed',async()=>{
 const args={query:'',kind:'all',projectId:'',sort:'updated',offset:0,limit:20},reordered={limit:20,offset:0,sort:'updated',projectId:'',kind:'all',query:''};
 assert.equal(earlyReadKey('home',args),earlyReadKey('home',reordered));
 let fallbacks=0;const fallback=async()=>{fallbacks++;return 'normal';};
 primeEarlyRead(earlyReadKey('home',args),async()=>'early');
 assert.equal(await takeEarlyRead(earlyReadKey('home',{...args,sort:'name'}),fallback),'normal');
 assert.equal(await takeEarlyRead(earlyReadKey('home',reordered),fallback),'early');
 assert.equal(await takeEarlyRead(earlyReadKey('home',args),fallback),'normal');assert.equal(fallbacks,2);
 primeEarlyRead('failed',async()=>{throw Error('401');});assert.equal(await takeEarlyRead('failed',fallback),'normal');
 primeEarlyRead('dropped',async()=>'early');dropEarlyReads();assert.equal(await takeEarlyRead('dropped',fallback),'normal');
});
