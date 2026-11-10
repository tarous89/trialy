import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import request from 'supertest';
import session from 'express-session';
import type {Database,Connection} from '../src/db/database.js';
import {baseApp,errors} from '../src/server/app.js';
import {addLocalAuth} from '../src/server/auth.js';
import {addMcp} from '../src/server/mcp.js';
import {CLAUDE_MCP_PATH} from '../src/server/local-oauth.js';
import {Service} from '../src/domain/service.js';
import {AccessManagement} from '../src/domain/access-management.js';
import {AccessGrid} from '../src/domain/access-grid.js';

const BASE='https://trialy.example',CLAUDE_CALLBACK='https://claude.ai/api/mcp/auth_callback',CHATGPT_CALLBACK='https://chatgpt.com/connector/oauth/synthetic';
const accept='application/json, text/event-stream';
const call=(name:string,args:Record<string,unknown>={})=>({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}});

async function setup(){
 const pg=new PGlite();for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+f,'utf8'));
 const db:Database={query:(sql,v)=>pg.query(sql,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const app=baseApp();app.use(session({secret:'synthetic-session-secret-for-testing-only',resave:false,saveUninitialized:false}));
 const auth=addLocalAuth(app,db,BASE);const service=new Service(db);
 addMcp(app,service,auth.ai);addMcp(app,service,auth.claude,{path:CLAUDE_MCP_PATH,host:'claude'});app.use(errors);
 return {db,app,auth};
}
/** Full browser OAuth: register, authorize, sign up or sign in, consent and exchange. */
async function connect(app:any,browser:any,redirect:string,resource:string,signup:boolean){
 const client=await request(app).post('/register').send({client_name:redirect.includes('claude')?'Claude':'ChatGPT',redirect_uris:[redirect],token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code']});assert.equal(client.status,201,client.text);
 const verifier='c'.repeat(43),challenge=createHash('sha256').update(verifier).digest('base64url');
 const start=await browser.get('/authorize').query({response_type:'code',client_id:client.body.client_id,redirect_uri:redirect,scope:'trialy',resource,state:'state-'+resource,code_challenge:challenge,code_challenge_method:'S256'});assert.equal(start.status,302,start.text);
 const target=new URL(start.headers.location);const login=await browser.get(target.pathname+target.search);
 if(login.status===200){const csrf=login.text.match(/name="csrf" value="([^"]+)"/)![1];
  const step=signup?await browser.post('/auth/signup').type('form').send({firstName:'Test',lastName:'User',email:'claude@example.invalid',password:'synthetic-password-123',intendedUse:'accepted',csrf}):await browser.post('/auth/login').type('form').send({email:'claude@example.invalid',password:'synthetic-password-123',csrf});
  assert.equal(step.headers.location,'/auth/consent');}
 const consent=await browser.get('/auth/consent');assert.equal(consent.status,200,consent.text);assert.ok(consent.text.includes(new URL(redirect).origin),'Consent shows the return hostname');
 const approval=await browser.post('/auth/consent').type('form').send({decision:'approve',csrf:consent.text.match(/name="csrf" value="([^"]+)"/)![1]});const callback=new URL(approval.headers.location);assert.equal(callback.origin,new URL(redirect).origin);
 const tokens=await request(app).post('/token').type('form').send({grant_type:'authorization_code',client_id:client.body.client_id,code:callback.searchParams.get('code'),redirect_uri:redirect,resource,code_verifier:verifier});assert.equal(tokens.status,200,tokens.text);
 return {clientId:client.body.client_id,...tokens.body};
}

test('Claude connects through its own endpoint and stays a separate principal from ChatGPT',async()=>{
 const {db,app}=await setup();
 // Unauthenticated Claude requests get a real 401 pointing at the endpoint's own resource metadata.
 const anonymous=await request(app).post(CLAUDE_MCP_PATH).set('Accept',accept).send({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'claude',version:'1'}}});
 assert.equal(anonymous.status,401);assert.match(anonymous.headers['www-authenticate'],/resource_metadata="https:\/\/trialy\.example\/\.well-known\/oauth-protected-resource\/claude\/mcp"/);
 const metadata=await request(app).get('/.well-known/oauth-protected-resource/claude/mcp');assert.equal(metadata.status,200);
 assert.equal(metadata.body.resource,BASE+CLAUDE_MCP_PATH);assert.deepEqual(metadata.body.scopes_supported,['trialy']);assert.equal(metadata.body.authorization_servers[0],BASE+'/');
 // ChatGPT's endpoint keeps optional sign-in.
 assert.equal((await request(app).post('/mcp').set('Accept',accept).send(call('open_workspace'))).status,200);

 const browser=request.agent(app);
 const claude=await connect(app,browser,CLAUDE_CALLBACK,BASE+CLAUDE_MCP_PATH,true);
 const opened=await request(app).post(CLAUDE_MCP_PATH).set('Authorization','Bearer '+claude.access_token).set('Accept',accept).send(call('open_workspace'));
 assert.equal(opened.status,200,opened.text);const workspaceId=opened.body.result.structuredContent.result.workspaceId;assert.ok(workspaceId,'First Claude connection initializes the account with Claude enabled');
 const listed=await request(app).post(CLAUDE_MCP_PATH).set('Authorization','Bearer '+claude.access_token).set('Accept',accept).send({jsonrpc:'2.0',id:2,method:'tools/list',params:{}});
 const names=listed.body.result.tools.map((t:any)=>t.name);assert.ok(names.includes('open_workspace'));assert.ok(!names.includes('preview_tracker'),'Guest-only tools are not offered to Claude');
 // Research runs on the ChatGPT runner; Claude can read automations but cannot run or change research.
 const blocked=await request(app).post(CLAUDE_MCP_PATH).set('Authorization','Bearer '+claude.access_token).set('Accept',accept).send(call('claim_automation_work',{workspaceId,runnerId:workspaceId,occurrenceId:workspaceId,requestKey:workspaceId}));
 assert.equal(blocked.body.result.isError,true);assert.equal(blocked.body.result.structuredContent.error.code,'claude_runner_unavailable');
 assert.ok(names.includes('list_app_automations'),'Automation reads stay available to Claude');
 // Tokens only work on the endpoint they were issued for.
 assert.equal((await request(app).post('/mcp').set('Authorization','Bearer '+claude.access_token).set('Accept',accept).send(call('open_workspace'))).status,401);
 const chatgpt=await connect(app,browser,CHATGPT_CALLBACK,BASE+'/mcp',false);
 assert.equal((await request(app).post(CLAUDE_MCP_PATH).set('Authorization','Bearer '+chatgpt.access_token).set('Accept',accept).send(call('open_workspace'))).status,401);
 const token=(await db.query("SELECT assistant,resource FROM oauth_tokens WHERE kind='access' ORDER BY assistant")).rows;assert.deepEqual(token.map((r:any)=>r.assistant),['chatgpt','claude']);assert.equal(token[0].resource,null);

 // The owner switches Claude off; ChatGPT is unaffected, and the reverse.
 const user=(await db.query('SELECT user_id FROM local_accounts')).rows[0].user_id,owner={userId:user,origin:'human' as const},am=new AccessManagement(db);
 const overview=await am.overview(owner,workspaceId);assert.deepEqual(overview.connections.map((c:any)=>c.id),['chatgpt','claude']);
 await am.update(owner,workspaceId,{expectedVersion:overview.version,subject:'claude',claude:false});
 const claudeOff=await request(app).post(CLAUDE_MCP_PATH).set('Authorization','Bearer '+claude.access_token).set('Accept',accept).send(call('list_workspaces'));assert.deepEqual(claudeOff.body.result.structuredContent.result,[]);
 const chatgptOn=await request(app).post('/mcp').set('Authorization','Bearer '+chatgpt.access_token).set('Accept',accept).send(call('list_workspaces'));assert.equal(chatgptOn.body.result.structuredContent.result.length,1);
 const v2=(await am.overview(owner,workspaceId)).version;await am.update(owner,workspaceId,{expectedVersion:v2,subject:'claude',claude:true});
 const v3=(await am.overview(owner,workspaceId)).version;await am.update(owner,workspaceId,{expectedVersion:v3,subject:'chatgpt',chatgpt:false});
 assert.equal((await request(app).post(CLAUDE_MCP_PATH).set('Authorization','Bearer '+claude.access_token).set('Accept',accept).send(call('list_workspaces'))).body.result.structuredContent.result.length,1);
 assert.deepEqual((await request(app).post('/mcp').set('Authorization','Bearer '+chatgpt.access_token).set('Accept',accept).send(call('list_workspaces'))).body.result.structuredContent.result,[]);

 // Inside Claude the access grid shows only Claude's connection; the web shows both.
 const grid=await new AccessGrid(db).read({userId:user,origin:'ai',assistant:'claude'},workspaceId);assert.deepEqual(grid.connections.map((c:any)=>c.id),['claude']);
 const webGrid=await new AccessGrid(db).read(owner,workspaceId,'claude');assert.ok(webGrid.rows.some((r:any)=>r.kind==='connection'&&r.name==='Claude'));
 // Assistants can only be restricted, never granted extra access.
 await assert.rejects(am.update(owner,workspaceId,{expectedVersion:(await am.overview(owner,workspaceId)).version,subject:'claude',rule:{kind:'database',resourceId:workspaceId,read:'allow',write:'allow'}}),/only add restrictions/);
 // Permission changes from Claude are never saved directly.
 await assert.rejects(am.update({userId:user,origin:'ai',assistant:'claude'},workspaceId,{expectedVersion:0,subject:'claude',claude:true}),/signed-in owner session/);
 await db.close();
});

test('Claude refresh tolerates a parallel duplicate; ChatGPT keeps strict replay detection',async()=>{
 const {db,app}=await setup();const browser=request.agent(app);
 const claude=await connect(app,browser,CLAUDE_CALLBACK,BASE+CLAUDE_MCP_PATH,true);
 const refresh=(t:any)=>request(app).post('/token').type('form').send({grant_type:'refresh_token',client_id:t.clientId,refresh_token:t.refresh_token});
 const first=await refresh(claude);assert.equal(first.status,200,first.text);
 const duplicate=await refresh(claude);assert.equal(duplicate.status,200,'Duplicate within the grace window is not treated as theft');
 await db.query("UPDATE oauth_tokens SET used_at=used_at-60000 WHERE used_at IS NOT NULL");
 assert.equal((await refresh(claude)).status,400,'Replay after the window revokes the connection');
 assert.equal((await refresh({clientId:claude.clientId,refresh_token:first.body.refresh_token})).status,400);
 const chatgpt=await connect(app,browser,CHATGPT_CALLBACK,BASE+'/mcp',false);
 assert.equal((await refresh(chatgpt)).status,200);assert.equal((await refresh(chatgpt)).status,400,'ChatGPT replay is still rejected immediately');
 await db.close();
});

test('Claude Code loopback callbacks register; other plain-HTTP callbacks stay rejected',async()=>{
 const {db,app}=await setup();
 const register=(uri:string)=>request(app).post('/register').send({client_name:'Claude Code',redirect_uris:[uri],token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code']});
 assert.equal((await register('http://localhost:3118/callback')).status,201);
 assert.equal((await register('http://127.0.0.1:49152/callback')).status,201);
 assert.equal((await register('http://example.com/callback')).status,400);
 assert.equal((await register('http://localhost.example.com/callback')).status,400);
 await db.close();
});

test('migration copies existing ChatGPT restrictions to Claude and keeps inspectors human-only',async()=>{
 const pg=new PGlite();const files=(await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort();
 for(const f of files.filter(f=>f<'057'))await pg.exec(await readFile('migrations/'+f,'utf8'));
 const [t,o,m,i,w,table]=['a','b','c','d','e','f'].map(x=>`00000000-0000-0000-0000-0000000000${x}1`);
 await pg.exec(`INSERT INTO tenants VALUES ('${t}','T');INSERT INTO users(id,subject,email,name) VALUES ('${o}','o','o@x','O'),('${m}','m','m@x','M'),('${i}','i','i@x','I');
  INSERT INTO memberships VALUES ('${t}','${o}','owner'),('${t}','${m}','viewer'),('${t}','${i}','viewer');
  INSERT INTO workspaces(id,tenant_id,name,ai_enabled,permission_rules) VALUES ('${w}','${t}','W',false,'[{"subject":"chatgpt","kind":"table","resourceId":"${table}","read":"deny","write":"deny"},{"subject":"${m}","kind":"connection","resourceId":"${w}","read":"inherit","write":"deny"}]');
  INSERT INTO workspace_access(workspace_id,user_id,role,ai_enabled) VALUES ('${w}','${m}','editor',true),('${w}','${i}','inspector',false);`);
 for(const f of files.filter(f=>f>='057'))await pg.exec(await readFile('migrations/'+f,'utf8'));
 const ws=(await pg.query<any>('SELECT claude_enabled,permission_rules FROM workspaces')).rows[0];assert.equal(ws.claude_enabled,false,'A workspace with AI switched off keeps Claude off');
 assert.ok(ws.permission_rules.some((r:any)=>r.subject==='claude'&&r.kind==='table'&&r.read==='deny'));
 assert.ok(ws.permission_rules.some((r:any)=>r.subject===m&&r.kind==='connection'&&r.field==='claude'&&r.write==='deny'));
 const people=(await pg.query<any>('SELECT user_id,claude_enabled FROM workspace_access ORDER BY user_id')).rows;assert.deepEqual(people.map((r:any)=>r.claude_enabled),[true,false]);
 await pg.exec(`UPDATE workspace_access SET claude_enabled=true WHERE user_id='${i}'`);
 assert.equal((await pg.query<any>(`SELECT claude_enabled FROM workspace_access WHERE user_id='${i}'`)).rows[0].claude_enabled,false,'Inspectors cannot be given Claude access');
 await pg.close();
});
