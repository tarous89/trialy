import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import request from 'supertest';
import session from 'express-session';
import type {Database,Connection} from '../src/db/database.js';
import {baseApp,errors} from '../src/server/app.js';
import {addLocalAuth} from '../src/server/auth.js';
import {addMcp} from '../src/server/mcp.js';
import {Service} from '../src/domain/service.js';
import {oauthPublicUrl,PLATFORM_ORIGIN} from '../src/shared/public-url.js';
test('signup returns to OAuth; PKCE, replay, refresh and revocation are enforced',async()=>{
 const pg=new PGlite();for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+f,'utf8'));
 const db:Database={query:(sql,v)=>pg.query(sql,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const app=baseApp();app.use(session({secret:'synthetic-session-secret-for-testing-only',resave:false,saveUninitialized:false}));const auth=addLocalAuth(app,db,'https://trialy.example');addMcp(app,new Service(db),auth.ai);app.use(errors);
 const client=await request(app).post('/register').send({client_name:'Synthetic ChatGPT',redirect_uris:['https://chatgpt.com/connector/oauth/synthetic'],token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code']});assert.equal(client.status,201,client.text);
 const verifier='a'.repeat(43),challenge=createHash('sha256').update(verifier).digest('base64url');const redirect='https://chatgpt.com/connector/oauth/synthetic';
 const browser=request.agent(app);const start=await browser.get('/authorize').query({response_type:'code',client_id:client.body.client_id,redirect_uri:redirect,scope:'trialy',resource:'https://trialy.example/mcp',state:'original-chatgpt-state',code_challenge:challenge,code_challenge_method:'S256'});assert.equal(start.status,302,start.text);
 const login=await browser.get(new URL(start.headers.location).pathname+new URL(start.headers.location).search);assert.equal(login.status,200);
 const csrf=login.text.match(/name="csrf" value="([^"]+)"/)![1];
 assert.equal((await browser.post('/auth/signup').type('form').send({email:'test@example.invalid',password:'shortpw',intendedUse:'accepted',csrf:'wrong'})).status,403);
 const signup=await browser.post('/auth/signup').type('form').send({email:'test@example.invalid',password:'shortpw',intendedUse:'accepted',csrf});assert.equal(signup.headers.location,'/auth/consent');
 const consent=await browser.get('/auth/consent');assert.equal(consent.status,200,consent.text);assert.ok(consent.headers['content-security-policy'].includes('https://chatgpt.com'));
 const approval=await browser.post('/auth/consent').type('form').send({decision:'approve',csrf:consent.text.match(/name="csrf" value="([^"]+)"/)![1]});assert.equal(approval.status,303);const callback=new URL(approval.headers.location);assert.equal(callback.origin,'https://chatgpt.com');assert.equal(callback.searchParams.get('state'),'original-chatgpt-state');
 const exchange={grant_type:'authorization_code',client_id:client.body.client_id,code:callback.searchParams.get('code'),redirect_uri:redirect,resource:'https://trialy.example/mcp',code_verifier:verifier};
 assert.equal((await request(app).post('/token').type('form').send({...exchange,code_verifier:'b'.repeat(43)})).status,400);
 const tokens=await request(app).post('/token').type('form').send(exchange);assert.equal(tokens.status,200,tokens.text);
 assert.equal((await request(app).post('/token').type('form').send(exchange)).status,400);
 const opened=await request(app).post('/mcp').set('Authorization','Bearer '+tokens.body.access_token).set('Accept','application/json, text/event-stream').send({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'open_workspace',arguments:{}}});assert.equal(opened.status,200);assert.equal(opened.body.result.structuredContent.result.canCreateInitialWorkspace,false);
 assert.equal(opened.body.result.structuredContent.result.workspaces.length,1);assert.ok(opened.body.result.structuredContent.result.workspaceId);
 const refreshed=await request(app).post('/token').type('form').send({grant_type:'refresh_token',client_id:client.body.client_id,refresh_token:tokens.body.refresh_token});assert.equal(refreshed.status,200,refreshed.text);
 assert.equal((await request(app).post('/token').type('form').send({grant_type:'refresh_token',client_id:client.body.client_id,refresh_token:tokens.body.refresh_token})).status,400);
 await assert.rejects(auth.provider.verifyAccessToken(refreshed.body.access_token));
 // A pending consent cannot be approved under a different account binding.
 const second=await browser.get('/authorize').query({response_type:'code',client_id:client.body.client_id,redirect_uri:redirect,scope:'trialy',resource:'https://trialy.example/mcp',state:'second-state',code_challenge:challenge,code_challenge_method:'S256'});
 await browser.get(new URL(second.headers.location).pathname+new URL(second.headers.location).search);
 const secondConsent=await browser.get('/auth/consent');assert.equal(secondConsent.status,200);
 await db.query("UPDATE oauth_data SET data=jsonb_set(data,'{userId}',to_jsonb($1::text)) WHERE kind='pending'",['different-user']);
 assert.equal((await browser.post('/auth/consent').type('form').send({decision:'approve',csrf:secondConsent.text.match(/name="csrf" value="([^"]+)"/)![1]})).status,409);
 // Account-wide revocation covers browser sessions, tokens and pending consent.
 const securityCsrf=secondConsent.text.match(/name="csrf" value="([^"]+)"/)![1];
 const other=request.agent(app);
 const otherLogin=await other.get('/auth/login');
 const loginCsrf=otherLogin.text.match(/name="csrf" value="([^"]+)"/)![1];
 assert.equal((await other.post('/auth/login').type('form').send({email:'test@example.invalid',password:'shortpw',csrf:loginCsrf})).status,303);
 const user=(await db.query('SELECT user_id FROM local_accounts')).rows[0];
 await db.query('INSERT INTO oauth_tokens(hash,user_id,client_id,kind,family,expires_at) VALUES($1,$2,$3,$4,$5,$6)',[createHash('sha256').update('synthetic-live-token').digest('hex'),user.user_id,client.body.client_id,'access','synthetic-family',Date.now()+60000]);
 assert.equal((await browser.post('/auth/security').set('x-csrf-token',securityCsrf).send({action:'password_changed',currentPassword:'wrong-password',newPassword:'new-synthetic-password-456'})).status,403);
 assert.equal((await db.query('SELECT count(*) FROM account_security_events')).rows[0].count,0);
 assert.equal((await browser.post('/auth/security').send({action:'access_revoked',currentPassword:'shortpw'})).status,403);
 assert.equal((await browser.post('/auth/security').set('x-csrf-token',securityCsrf).send({action:'password_changed',currentPassword:'shortpw',newPassword:'new-synthetic-password-456'})).status,200);
 assert.equal((await other.get('/auth/connections')).status,401);
 await assert.rejects(auth.provider.verifyAccessToken('synthetic-live-token'));
 const again=await browser.get('/auth/login');const againCsrf=again.text.match(/name="csrf" value="([^"]+)"/)![1];
 assert.equal((await browser.post('/auth/login').type('form').send({email:'test@example.invalid',password:'shortpw',csrf:againCsrf})).status,401);
 assert.equal((await browser.post('/auth/login').type('form').send({email:'test@example.invalid',password:'new-synthetic-password-456',csrf:againCsrf})).status,303);
 const history=await browser.get('/auth/security');assert.equal(history.body.events[0].action,'password_changed');
 await assert.rejects(db.query('DELETE FROM account_security_events'));
 const enabled=process.env.SIMPLE_APPS_ENABLED;process.env.SIMPLE_APPS_ENABLED='true';
 try{for(const destination of ['/apps/'+randomUUID()+'/company?workspaceId='+randomUUID()+'&source=component&recordId='+randomUUID(),'/?tab=connectors&workspaceId='+randomUUID()+'&connectorReview='+randomUUID()]){
  const returning=request.agent(app),form=await returning.get('/auth/login').query({returnTo:destination});
  const result=await returning.post('/auth/login').type('form').send({email:'test@example.invalid',password:'new-synthetic-password-456',csrf:form.text.match(/name="csrf" value="([^"]+)"/)![1]});assert.equal(result.headers.location,destination);
  assert.equal((await returning.get('/auth/login')).headers.location,'/','Return path is consumed after sign-in');
 }}finally{if(enabled===undefined)delete process.env.SIMPLE_APPS_ENABLED;else process.env.SIMPLE_APPS_ENABLED=enabled;}
 await db.close();
});

test('canonical domain advertises platform URLs and preserves only the explicit legacy OAuth resource',async()=>{
 const pg=new PGlite();for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+f,'utf8'));
 const db:Database={query:(sql,v)=>pg.query(sql,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const old='https://trialy-web.onrender.com',canonical=PLATFORM_ORIGIN,redirect='https://chatgpt.com/connector/oauth/domain-test';
 const prior={PUBLIC_URL:process.env.PUBLIC_URL,APP_PUBLIC_URL:process.env.APP_PUBLIC_URL};
 const make=(base:string,legacy?:string)=>{const app=baseApp();app.use(session({secret:'synthetic-domain-migration-test-only',resave:false,saveUninitialized:false}));const auth=addLocalAuth(app,db,base,'synthetic-domain-migration-mfa-key-only',legacy);addMcp(app,new Service(db),auth.ai);app.use(errors);return {app,auth};};
 try{
  const before=make(old);const client=await request(before.app).post('/register').send({client_name:'Synthetic domain client',redirect_uris:[redirect],token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code']});assert.equal(client.status,201);
  const browser=request.agent(before.app),verifier='a'.repeat(43),authorize={response_type:'code',client_id:client.body.client_id,redirect_uri:redirect,scope:'trialy',resource:old+'/mcp',state:'domain-migration-state',code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'};
  const started=await browser.get('/authorize').query(authorize),target=new URL(started.headers.location);
  const login=await browser.get(target.pathname+target.search),csrf=login.text.match(/name="csrf" value="([^"]+)"/)![1];
  await browser.post('/auth/signup').type('form').send({email:'domain-migration@example.invalid',password:'synthetic-password',intendedUse:'accepted',csrf});
  const consent=await browser.get('/auth/consent'),approved=await browser.post('/auth/consent').type('form').send({decision:'approve',csrf:consent.text.match(/name="csrf" value="([^"]+)"/)![1]});
  const exchanged=await request(before.app).post('/token').type('form').send({grant_type:'authorization_code',client_id:client.body.client_id,code:new URL(approved.headers.location).searchParams.get('code'),code_verifier:verifier,redirect_uri:redirect,resource:old+'/mcp'});assert.equal(exchanged.status,200);
  process.env.PUBLIC_URL=canonical;process.env.APP_PUBLIC_URL=canonical;
  const after=make(canonical,old+'/mcp');
  const metadata=await request(after.app).get('/.well-known/oauth-authorization-server');assert.equal(metadata.status,200);assert.equal(metadata.body.issuer,canonical+'/');
  for(const field of ['authorization_endpoint','token_endpoint','registration_endpoint','revocation_endpoint'])assert.equal(new URL(metadata.body[field]).origin,canonical);
  const resource=await request(after.app).get('/.well-known/oauth-protected-resource/mcp');assert.equal(resource.body.resource,canonical+'/mcp');assert.deepEqual(resource.body.authorization_servers,[canonical+'/']);
  const cached=await request(after.app).get('/authorize').set('Host','trialy-web.onrender.com').query(authorize);assert.equal(cached.status,302);assert.equal(new URL(cached.headers.location).origin,canonical);
  const next=await request(after.app).get('/authorize').query({...authorize,resource:canonical+'/mcp'});assert.equal(next.status,302);assert.equal(new URL(next.headers.location).origin,canonical);
  const mcp=(payload:any,bearer?:string)=>{const call=request(after.app).post('/mcp').set('Accept','application/json, text/event-stream');if(bearer)call.set('Authorization','Bearer '+bearer);return call.send({jsonrpc:'2.0',id:1,...payload});};
  assert.equal((await mcp({method:'tools/list'},exchanged.body.access_token)).status,200,'Pre-migration access token remains usable');
  const denied=await mcp({method:'tools/list'},'invalid-token');assert.equal(denied.status,401);assert.equal(denied.headers['www-authenticate'],`Bearer resource_metadata="${canonical}/.well-known/oauth-protected-resource/mcp"`);
  const challenge=await mcp({method:'tools/call',params:{name:'initialize_account',arguments:{}}});assert.deepEqual(challenge.body.result._meta['mcp/www_authenticate'],[`Bearer resource_metadata="${canonical}/.well-known/oauth-protected-resource/mcp"`]);
  const listed=await mcp({method:'resources/list'}),uri=listed.body.result.resources.find((r:any)=>r.name==='workspace').uri;
  const widget=await mcp({method:'resources/read',params:{uri}}),content=widget.body.result.contents[0];assert.deepEqual(content._meta.ui.csp.frameDomains,[canonical]);assert.ok(!content.text.includes(old),'Bundled widget never falls back to Render');
  const refreshed=await request(after.app).post('/token').type('form').send({grant_type:'refresh_token',client_id:client.body.client_id,refresh_token:exchanged.body.refresh_token,resource:old+'/mcp'});assert.equal(refreshed.status,200,'Pre-migration refresh token remains usable with the old resource');
  for(const wrong of ['https://other.example/mcp',old+'/mcp?extra=1',old+'/other',canonical+'/other']){
   const denied=await request(after.app).post('/token').type('form').send({grant_type:'refresh_token',client_id:client.body.client_id,refresh_token:refreshed.body.refresh_token,resource:wrong});assert.equal(denied.status,400,wrong);
  }
  const canonicalRefresh=await request(after.app).post('/token').type('form').send({grant_type:'refresh_token',client_id:client.body.client_id,refresh_token:refreshed.body.refresh_token,resource:canonical+'/mcp'});assert.equal(canonicalRefresh.status,200);
  const replay=await request(after.app).post('/token').type('form').send({grant_type:'refresh_token',client_id:client.body.client_id,refresh_token:refreshed.body.refresh_token,resource:canonical+'/mcp'});assert.equal(replay.status,400);
  await assert.rejects(after.auth.provider.verifyAccessToken(canonicalRefresh.body.access_token));
  const noAlias=make(canonical);await assert.rejects(noAlias.auth.provider.authorize(client.body,{...authorize,redirectUri:redirect,scopes:['trialy'],codeChallenge:authorize.code_challenge,resource:new URL(old+'/mcp')} as any,{} as any),/Wrong resource/);
  for(const invalid of ['http://legacy.example/mcp','https://user:secret@legacy.example/mcp','https://legacy.example/mcp?x=1','https://legacy.example/other'])assert.throws(()=>make(canonical,invalid));
 }finally{for(const key of ['PUBLIC_URL','APP_PUBLIC_URL'] as const){if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key];}await db.close();}
});

test('OAuth origin is explicit and validated',()=>{
 assert.equal(oauthPublicUrl({NODE_ENV:'production'}),PLATFORM_ORIGIN);
 assert.equal(oauthPublicUrl({PUBLIC_URL:PLATFORM_ORIGIN,RENDER_EXTERNAL_URL:'https://trialy-web.onrender.com'}),PLATFORM_ORIGIN);
 for(const PUBLIC_URL of ['http://platform.trialagents.com','https://user:secret@platform.trialagents.com','https://platform.trialagents.com/path','https://platform.trialagents.com?x=1','https://platform.trialagents.com#x'])assert.throws(()=>oauthPublicUrl({NODE_ENV:'production',PUBLIC_URL}));
});
