import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHmac} from 'node:crypto';
import request from 'supertest';
import express from 'express';
import {baseApp,errors} from '../src/server/app.js';
import {addPublicAssets,addWebFallback} from '../src/server/static-assets.js';
import {configureAuth} from '../src/server/auth.js';
import {Postgres} from '../src/db/database.js';

test('fingerprinted assets bypass session work, cache immutably and never fall through to HTML',async t=>{
 const root=await mkdtemp(join(tmpdir(),'trialagents-assets-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(join(root,'assets'));await mkdir(join(root,'fonts'));
 await writeFile(join(root,'assets','index-AbCd1234.js'),'window.assetLoaded=true;');
 await writeFile(join(root,'assets','index-EfGh5678.css'),'body{color:green}');
 await writeFile(join(root,'assets','.private'),'not public');
 await writeFile(join(root,'index.html'),'<!doctype html><p>TrialAgents fixture</p>');
 await writeFile(join(root,'fonts','inter-variable.woff2'),'fixture font');
 const app=baseApp();addPublicAssets(app,root);let sessionCalls=0;
 app.use((_req,res,next)=>{sessionCalls++;res.set('Set-Cookie','fixture-session=refreshed; HttpOnly');next();});
 app.get('/api/private',(_req,res)=>res.set('Cache-Control','no-store').status(401).json({error:'unauthenticated'}));
 addWebFallback(app,root);app.use(errors);
 const cookie='trialy_session=existing-signed-in-fixture';
 const js=await request(app).get('/assets/index-AbCd1234.js').set('Cookie',cookie);
 assert.equal(js.status,200);assert.match(js.headers['content-type'],/javascript/);assert.match(js.headers['cache-control'],/max-age=31536000.*immutable/);
 assert.equal(js.headers['set-cookie'],undefined);assert.equal(sessionCalls,0);assert.ok(js.headers['content-security-policy']);
 const cached=await request(app).get('/assets/index-AbCd1234.js').set('Cookie',cookie).set('If-None-Match',js.headers.etag);
 assert.equal(cached.status,304);assert.equal(cached.headers['set-cookie'],undefined);assert.equal(sessionCalls,0);
 const css=await request(app).head('/assets/index-EfGh5678.css').set('Cookie',cookie);
 assert.equal(css.status,200);assert.match(css.headers['content-type'],/css/);assert.equal(css.headers['set-cookie'],undefined);
 for(const path of ['/assets/missing-12345678.js','/assets/','/assets/.private','/assets/%2e%2e%2findex.html']){
  const missing=await request(app).get(path).set('Cookie',cookie);
  assert.ok([403,404].includes(missing.status),path+': '+missing.status);assert.equal(missing.headers['cache-control'],'no-store');
  assert.doesNotMatch(missing.headers['content-type'],/html/);assert.equal(missing.headers['set-cookie'],undefined);
 }
 assert.equal((await request(app).post('/assets/index-AbCd1234.js')).status,405);assert.equal(sessionCalls,0);
 for(const path of ['/','/index.html','/apps/example']){
  const html=await request(app).get(path);assert.equal(html.status,200);assert.equal(html.headers['cache-control'],'no-cache');assert.match(html.text,/TrialAgents fixture/);
 }
 const font=await request(app).get('/fonts/inter-variable.woff2');assert.equal(font.status,200);assert.doesNotMatch(font.headers['cache-control'],/immutable/);assert.match(font.headers['cache-control'],/max-age=0/);
 const api=await request(app).get('/api/private');assert.equal(api.status,401);assert.equal(api.headers['cache-control'],'no-store');
 assert.equal((await request(app).get('/api/missing')).status,404);assert.equal((await request(app).get('/auth/missing')).status,404);
 assert.equal(sessionCalls,7);
});

test('signed-in asset requests drop from six database calls to zero while API session revocation remains active',async t=>{
 const root=await mkdtemp(join(tmpdir(),'trialagents-auth-assets-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(join(root,'assets'));await writeFile(join(root,'assets','index-AbCd1234.js'),'window.assetLoaded=true;');
 const secret='synthetic-static-session-secret-for-testing-only',sid='synthetic-session';
 const signature=createHmac('sha256',secret).update(sid).digest('base64').replace(/=+$/,'');
 const cookie='trialy_session='+encodeURIComponent(`s:${sid}.${signature}`);
 for(const early of [false,true]){
  let queries=0,sessionVersion=0;const statements:string[]=[];
  const query=async(sql:string)=>{queries++;statements.push(sql);
   if(sql.startsWith('SELECT sess FROM'))return {rows:[{sess:{userId:'synthetic-user',sessionVersion:0,cookie:{expires:new Date(Date.now()+60000).toISOString(),originalMaxAge:60000,httpOnly:true}}}]};
   if(sql.includes('SELECT session_version'))return {rows:[{session_version:sessionVersion}]};
   return {rows:[],rowCount:1};
  };
  const db=new Postgres('postgres://unused');db.pool={query,connect:async()=>({query,release(){}})} as any;
  const app=baseApp();if(early)addPublicAssets(app,root);
  const auth=configureAuth(app,db,{NODE_ENV:'test',SESSION_SECRET:secret,APP_PUBLIC_URL:'https://platform.example.invalid'});
  app.get('/api/probe',auth.human,(_req,res)=>res.set('Cache-Control','no-store').json({ok:true}));
  if(!early)app.use(express.static(root));app.use(errors);
  const asset=await request(app).get('/assets/index-AbCd1234.js').set('Cookie',cookie);
  assert.equal(asset.status,200);assert.equal(queries,early?0:6,JSON.stringify(statements));
  assert.equal(!!asset.headers['set-cookie'],!early);
  if(early){
   assert.equal((await request(app).get('/api/probe').set('Cookie',cookie)).status,200);
   sessionVersion=1;
   const revoked=await request(app).get('/api/probe').set('Cookie',cookie);assert.equal(revoked.status,401);assert.equal(revoked.body.error,'unauthenticated');
  }
 }
});
