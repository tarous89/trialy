import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {AsyncLocalStorage} from 'node:async_hooks';
import {PGlite} from '@electric-sql/pglite';
import express from 'express';
import request from 'supertest';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,setDatabaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppMonitoring} from '../src/app-services/monitoring.js';
import {AppActions} from '../src/app-services/service.js';
import {AppSharing} from '../src/app-services/sharing.js';
import {AutomationEvents} from '../src/automations/events.js';
import {AutomationService} from '../src/automations/service.js';
import {serviceReview} from '../src/app-services/review.js';
import {AccessGrid} from '../src/domain/access-grid.js';
import {addAutomationMcp} from '../src/server/automations.js';
import type {Actor} from '../src/shared/schema.js';

test('ChatGPT confirms exact automation reviews under the real AI identity and runtime database role',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());
 for(const n of (await readdir('migrations')).filter(x=>x.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+n,'utf8'));
 await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();
 const db:Database={query:async(q,v)=>storage.getStore()?.query(q,v)??db.transaction(tx=>tx.query(q,v)),transaction:async fn=>{
  const current=storage.getStore();if(current)return fn(current);
  return pg.transaction(async raw=>{await raw.exec('SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(q,v)=>{await setDatabaseContext(raw as any);return raw.query(q,v) as any;}};return storage.run(tx,()=>fn(tx));});
 },close:()=>pg.close()};
 const owner:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...owner,origin:'ai',clientId:randomUUID(),connectionFamily:randomUUID()},other:Actor={userId:randomUUID(),origin:'ai'};
 for(const a of [owner,other])await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,a.userId+'@example.invalid','Synthetic']);
 const key=process.env.CONNECTOR_ENCRYPTION_KEY;process.env.CONNECTOR_ENCRYPTION_KEY=randomBytes(32).toString('base64');t.after(()=>{if(key===undefined)delete process.env.CONNECTOR_ENCRYPTION_KEY;else process.env.CONNECTOR_ENCRYPTION_KEY=key;});
 await pg.query("INSERT INTO oauth_tokens(hash,user_id,client_id,kind,family,expires_at) VALUES($1,$2,$3,'refresh',$4,$5)",[randomUUID(),owner.userId,ai.clientId,ai.connectionFamily,Date.now()+86400000]);
 const domain=new Service(db),f=new WorkspaceFoundation(db),setup=new AutomationService(db),monitors=new AppMonitoring(db),actions=new AppActions(db);
 const w=await withActor(owner,()=>domain.createWorkspace(owner,'Chat approval tests'));
 await withActor(owner,()=>domain.setAi(owner,w.id,true));
 const app=await withActor(owner,async()=>{
  const p=await f.preview(owner,w.id,{kind:'save_component',content:{name:'Approval fixture',format:'frontend-js',sourceAccess:'bindings',source:'return {html:"<h1>Fixture</h1>"};',bindings:[]}});
  return f.confirm(owner,w.id,p.id,p.digest);
 });
 let current=ai;
 const http=express();http.use(express.json());http.post('/mcp',async(req,res)=>{
  const server=new McpServer({name:'approval-test',version:'1'}),actor=current;
  const safe=(fn:any)=>async(v:any)=>withActor(actor,async()=>{try{const result=await fn(v);return {content:[{type:'text',text:JSON.stringify(result)}],structuredContent:{result}};}catch(e:any){return {isError:true,content:[{type:'text',text:e.message}],structuredContent:{code:e.code}};}});
  addAutomationMcp(server,db,actor,safe,{ui:{resourceUri:'ui://test'},'openai/outputTemplate':'ui://test'});
  const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});res.on('close',()=>{void transport.close();void server.close();});await server.connect(transport);await transport.handleRequest(req,res,req.body);
 });
 const rpc=async(method:string,params:any={})=>(await request(http).post('/mcp').set('Accept','application/json, text/event-stream').send({jsonrpc:'2.0',id:1,method,params})).body;
 const call=async(name:string,args:any)=>(await rpc('tools/call',{name,arguments:{workspaceId:w.id,...args}})).result;
 const confirm=(p:any,overrides:any={})=>call('confirm_app_service_review',{reviewId:p.id,kind:p.kind,digest:p.digest,review:p.review,confirmed:true,...overrides});
 const saved=(r:any)=>{assert.ok(!r.isError,JSON.stringify(r));return r.structuredContent.result;};
 let runner:any,monitor:any,action:any;
 await t.test('new tools are quiet and require explicit confirmed exact review; setup replay is idempotent',async()=>{
  const tools=(await rpc('tools/list')).result.tools,tool=tools.find((v:any)=>v.name==='confirm_app_service_review');
  assert.equal(tool.annotations.readOnlyHint,false);assert.equal(tool.annotations.idempotentHint,true);assert.equal(tool._meta['openai/outputTemplate'],undefined);assert.ok(tool.inputSchema.required.includes('review'));assert.ok(tool.inputSchema.required.includes('confirmed'));
  const p=saved(await call('prepare_automation_setup',{preferences:{time:'06:00',timeZone:'Europe/Berlin'}}));
  await withActor(ai,()=>assert.rejects(setup.confirm(ai,w.id,p.id,p.digest,p.review),/approve/));
  assert.equal((await confirm(p,{confirmed:false})).isError,true);
  assert.equal((await confirm(p,{review:p.review.replace('06:00','07:00')})).structuredContent.code,'review_changed');
  assert.equal((await confirm(p,{kind:'action'})).structuredContent.code,'review_changed');
  const read=saved(await call('read_app_service_review',{reviewId:p.id}));assert.equal(read.review,p.review,'JSONB key order must not change the exact review');
  runner=saved(await confirm(p));assert.equal(runner.subscriptionCreated,false);assert.deepEqual(saved(await confirm(p)),runner);
  assert.equal(saved(await call('read_automation_setup',{})).state,'awaiting_subscription');
  assert.equal((await pg.query<any>('SELECT count(*) AS n FROM automation_runners')).rows[0].n,1);
 });
 const config={appId:app.id,name:'Weekly public research',objective:'Find new public signals',instructions:'Research public primary sources; save only within existing write scopes.',sourcePolicy:'Primary public sources',schedule:{description:'Every Friday at 09:00',timeZone:'Europe/Berlin'},expiresAt:'2099-01-01T00:00:00Z',automation:{runnerId:'',trigger:{kind:'calendar',frequency:'weekly',weekdays:[5],time:'09:00',timeZone:'Europe/Berlin',anchor:'2026-11-02'}}};
 await t.test('research confirmation creates only the agreed schedule, without new data grants',async()=>{
  config.automation.runnerId=runner.id;
  const p=await withActor(ai,()=>monitors.prepare(ai,w.id,{config}));
  await withActor(ai,()=>assert.rejects(monitors.confirm(ai,w.id,p.id,p.digest,p.review),/approve/));
  const beforeConnection=saved(await call('read_app_service_review',{reviewId:p.id}));assert.equal(beforeConnection.review,p.review);assert.equal(beforeConnection.preflight.researchReady,false);assert.equal(beforeConnection.preflight.runner.state,'awaiting_subscription');assert.equal(beforeConnection.preflight.nextSteps[0].kind,'connect_runner');
  assert.equal((await confirm(p)).structuredContent.code,'runner_not_ready');assert.equal((await pg.query<any>('SELECT count(*) AS n FROM app_monitors')).rows[0].n,0);
  await withActor(ai,()=>new AutomationEvents(db,async req=>{const body=JSON.stringify({challenge:JSON.parse(req.body!).challenge});return {status:200,body,bytes:body.length,durationMs:1};}).subscribe(ai,{name:'automation.ready',arguments:{workspaceId:w.id,runnerId:runner.id},delivery:{mode:'webhook',url:'https://callbacks.example.org/events',secret:'whsec_'+randomBytes(32).toString('base64')}}));
  assert.equal((await confirm(p)).structuredContent.code,'runner_not_ready');
  const work=saved(await call('read_automation_agenda',{runnerId:runner.id})).rows[0],claim=saved(await call('claim_automation_work',{runnerId:runner.id,occurrenceId:work.id,requestKey:randomUUID()}));saved(await call('finish_automation_work',{occurrenceId:work.id,claimToken:claim.claimToken}));
  const afterConnection=saved(await call('read_app_service_review',{reviewId:p.id}));assert.equal(afterConnection.preflight.researchReady,true);assert.equal(afterConnection.digest,p.digest);assert.equal(afterConnection.review,p.review);
  monitor=saved(await confirm(p));assert.equal(monitor.scheduleManagedBy,'trialagents');assert.equal(monitor.taskCreated,false);assert.deepEqual(saved(await confirm(p)),monitor);
  const row=(await pg.query<any>('SELECT config FROM app_monitors WHERE id=$1',[monitor.id])).rows[0];assert.deepEqual(row.config.writeScopes,[]);
  assert.equal((await pg.query<any>('SELECT count(*) AS n FROM maintenance_scopes')).rows[0].n,0);
 });
 await t.test('email action approval preserves recipients and never sends during confirmation',async()=>{
  const p=await withActor(ai,()=>actions.prepare(ai,w.id,{config:{appId:app.id,appVersion:0,name:'Approved follow-up',trigger:{kind:'manual'},expiresAt:'2099-01-01T00:00:00Z',steps:[{id:'email',kind:'email',to:[owner.userId+'@example.invalid'],subject:'Reviewed subject',text:'Reviewed message'}]}}));
  await withActor(ai,()=>assert.rejects(actions.confirm(ai,w.id,p.id,p.digest,p.review),/approve/));
  assert.equal((await confirm(p,{review:p.review.replace('Reviewed subject','Changed subject')})).structuredContent.code,'review_changed');
  action=saved(await confirm(p));assert.deepEqual(saved(await confirm(p)),action);
  assert.equal((await pg.query<any>('SELECT count(*) AS n FROM app_service_jobs')).rows[0].n,0);
  assert.equal((await pg.query<any>('SELECT count(*) AS n FROM app_action_runs')).rows[0].n,0);
 });
 await t.test('audit retains AI origin; no human impersonation',async()=>{
  const rows=(await pg.query<any>("SELECT action,origin FROM audit_events WHERE action IN ('automation.setup_approved','monitoring.authorized','app_action.authorized') ORDER BY action")).rows;
  assert.equal(rows.length,3);assert.ok(rows.every(r=>r.origin==='ai'));
 });
 await t.test('wrong owners, disabled AI access, expired reviews and stale versions cannot confirm',async()=>{
  const p=await withActor(ai,()=>setup.prepare(ai,w.id,{expectedVersion:0,preferences:{time:'07:00',timeZone:'Europe/Berlin'}}));
  current=other;assert.equal((await confirm(p)).isError,true);assert.equal((await call('read_app_service_review',{reviewId:p.id})).isError,true);current=ai;
  await withActor(owner,()=>domain.share(owner,w.id,other.userId,'editor',[],null,true));current=other;assert.equal((await confirm(p)).structuredContent.code,'owner_required');current=ai;
  await withActor(owner,()=>domain.setAi(owner,w.id,false));assert.equal((await confirm(p)).isError,true);await withActor(owner,()=>domain.setAi(owner,w.id,true));
  const grid=new AccessGrid(db);await withActor(owner,async()=>{const v=(await grid.read(owner,w.id,'chatgpt')).version;await grid.save(owner,w.id,{expectedVersion:v,changes:[{subject:'chatgpt',kind:'connection',resourceId:w.id,read:true,write:false}]});});
  assert.equal((await confirm(p)).structuredContent.code,'connection_read_only');
  await withActor(owner,async()=>{const v=(await grid.read(owner,w.id,'chatgpt')).version;await grid.save(owner,w.id,{expectedVersion:v,changes:[{subject:'chatgpt',kind:'connection',resourceId:w.id,read:true,write:true}]});});
  const expiredId=randomUUID(),expired={...p,id:expiredId,review:serviceReview(w.id,expiredId,'automation_setup',p.digest,p.body)};
  await pg.query("INSERT INTO app_service_previews(id,workspace_id,user_id,kind,body,digest,expires_at) VALUES($1,$2,$3,'automation_setup',$4,$5,now()-interval '1 second')",[expired.id,w.id,owner.userId,JSON.stringify(p.body),p.digest]);assert.equal((await confirm(expired)).structuredContent.code,'review_changed');
  const stale=await withActor(ai,()=>setup.prepare(ai,w.id,{expectedVersion:0,preferences:{timeZone:'Europe/Berlin'}}));assert.equal(saved(await confirm(p)).version,1);assert.equal((await confirm(stale)).structuredContent.code,'runner_changed');
  const revision=await withActor(ai,()=>monitors.prepare(ai,w.id,{monitorId:monitor.id,expectedVersion:0,config}));
  const rival=await withActor(ai,()=>monitors.prepare(ai,w.id,{monitorId:monitor.id,expectedVersion:0,config:{...config,objective:'Revised public objective'}}));
  saved(await confirm(revision));assert.equal((await confirm(rival)).structuredContent.code,'monitoring_changed');
 });
 await t.test('revoking app AI access blocks both review disclosure and confirmation',async()=>{
  const p=await withActor(ai,()=>monitors.prepare(ai,w.id,{config}));
  await pg.query('UPDATE workspace_components SET ai_enabled=false WHERE id=$1',[app.id]);
  assert.equal((await call('read_app_service_review',{reviewId:p.id})).isError,true);assert.equal((await confirm(p)).isError,true);
  await pg.query('UPDATE workspace_components SET ai_enabled=true WHERE id=$1',[app.id]);
 });
 await t.test('website approval stays compatible and sharing stays human-only',async()=>{
  const p=await withActor(owner,()=>setup.prepare(owner,w.id,{expectedVersion:1,preferences:{timeZone:'Europe/Berlin'}}));
  assert.equal((await withActor(owner,()=>setup.confirm(owner,w.id,p.id,p.digest))).saved,true);
  const sharing=new AppSharing(db);await withActor(ai,()=>assert.rejects(sharing.confirm({...ai,actionConfirmed:true},w.id,randomUUID(),'0'.repeat(64)),/approve/));
 });
});
