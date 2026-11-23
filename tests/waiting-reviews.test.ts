import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
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
import {Foundation} from '../src/foundation/service.js';
import {addWorkspaceMcp} from '../src/server/workspace-foundation.js';
import {addFoundationMcp} from '../src/server/foundation-mcp.js';
import {addWaitingReviewsMcp} from '../src/server/waiting-reviews.js';
import {applyAnnotationPolicy,PERSON_ONLY_SAVE_TOOLS} from '../src/server/tool-annotations.js';
import type {Actor} from '../src/shared/schema.js';

// Tool permissions, approval screen (docs/TOOL_PERMISSIONS.md): the assistant prepares; the person approves or declines on
// the review page. Runs under the restricted runtime role with the real database context, as in production.
test('approval screen: workspace and code-lab reviews wait for the person, who approves or declines them',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());
 for(const n of (await readdir('migrations')).filter(x=>x.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+n,'utf8'));
 await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();
 const db:Database={query:async(q,v)=>storage.getStore()?.query(q,v)??db.transaction(tx=>tx.query(q,v)),transaction:async fn=>{
  const current=storage.getStore();if(current)return fn(current);
  return pg.transaction(async raw=>{await raw.exec('SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(q,v)=>{await setDatabaseContext(raw as any);return raw.query(q,v) as any;}};return storage.run(tx,()=>fn(tx));});
 },close:()=>pg.close()};
 const owner:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...owner,origin:'ai',assistant:'claude',clientId:randomUUID(),connectionFamily:randomUUID()} as Actor;
 await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[owner.userId,owner.userId,owner.userId+'@example.invalid','Synthetic']);
 await pg.query("INSERT INTO oauth_tokens(hash,user_id,client_id,kind,family,expires_at) VALUES($1,$2,$3,'refresh',$4,$5)",[randomUUID(),owner.userId,(ai as any).clientId,(ai as any).connectionFamily,Date.now()+86400000]);
 const domain=new Service(db),f=new WorkspaceFoundation(db),engine=new Foundation(db,domain);
 const w=await withActor(owner,()=>domain.createWorkspace(owner,'Approval screen tests'));
 await withActor(owner,()=>domain.setAi(owner,w.id,true));
 const http=express();http.use(express.json());http.post('/mcp',async(req,res)=>{
  const server=new McpServer({name:'waiting-reviews-test',version:'1'});applyAnnotationPolicy(server);
  const safe=(fn:any)=>async(v:any)=>withActor(ai,async()=>{try{const result=await fn(v);return {content:[{type:'text',text:JSON.stringify(result)}],structuredContent:{result}};}catch(e:any){return {isError:true,content:[{type:'text',text:e.message}],structuredContent:{code:e.code}};}});
  const metadata={ui:{resourceUri:'ui://test'},'openai/outputTemplate':'ui://test'};
  addWorkspaceMcp(server,f,ai,safe,metadata);addFoundationMcp(server,engine,ai,safe,metadata);addWaitingReviewsMcp(server,domain,ai,safe,metadata);
  const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});res.on('close',()=>{void transport.close();void server.close();});await server.connect(transport);await transport.handleRequest(req,res,req.body);
 });
 const rpc=async(method:string,params:any={})=>(await request(http).post('/mcp').set('Accept','application/json, text/event-stream').send({jsonrpc:'2.0',id:1,method,params})).body;
 const call=async(name:string,args:any)=>(await rpc('tools/call',{name,arguments:{workspaceId:w.id,...args}})).result;
 const saved=(r:any)=>{assert.ok(!r.isError,JSON.stringify(r));return r.structuredContent.result;};
 const waiting=async()=>saved(await call('list_waiting_reviews',{}));

 await t.test('every save the person makes is hidden from the assistant; showing and reading never ask the host',async()=>{
  const tools=(await rpc('tools/list')).result.tools,find=(n:string)=>tools.find((v:any)=>v.name===n);
  for(const name of PERSON_ONLY_SAVE_TOOLS){const tool=find(name);if(!tool)continue;assert.deepEqual(tool._meta?.ui?.visibility,['app'],name);assert.match(tool.description,/not available to the assistant/,name);}
  for(const name of ['confirm_workspace_change','confirm_function','confirm_execution_control','confirm_code_changes'])assert.ok(find(name),name+' is registered here');
  for(const name of ['approve_waiting_review','decline_waiting_review'])assert.deepEqual(find(name)._meta.ui.visibility,['app'],name);
  for(const name of ['list_waiting_reviews','read_waiting_review','show_review'])assert.equal(find(name).annotations.readOnlyHint,true,name);
  assert.equal(find('show_review')._meta['openai/outputTemplate'],'ui://test','show_review opens the extension');
 });

 await t.test('a workspace change waits, shows its exact details and saves only with the digest the person saw',async()=>{
  const p=saved(await call('prepare_workspace_change',{operation:{kind:'create_node',nodeKind:'project',name:'Outreach'}}));
  const row=(await waiting()).find((r:any)=>r.reviewId===p.id);
  assert.deepEqual({...row,expiresAt:undefined},{source:'workspace',reviewId:p.id,digest:p.digest,kind:'create_node',title:'Create a project: Outreach',assistant:'claude',expiresAt:undefined,approveWhere:'here'});
  const read=saved(await call('read_waiting_review',{source:'workspace',reviewId:p.id}));assert.equal(read.details.body.name,'Outreach');
  const shown=saved(await call('show_review',{source:'workspace',reviewId:p.id}));assert.equal(shown.screen,'review');assert.equal(shown.source,'workspace');assert.match(shown.reviewUrl,new RegExp('waitingReview=workspace:'+p.id));
  assert.equal((await call('approve_waiting_review',{source:'workspace',reviewId:p.id,digest:'0'.repeat(64),confirmed:true})).isError,true,'a changed review is never saved blind');
  saved(await call('approve_waiting_review',{source:'workspace',reviewId:p.id,digest:p.digest,confirmed:true}));
  assert.equal((await pg.query<any>("SELECT count(*) AS n FROM workspace_nodes WHERE workspace_id=$1 AND name='Outreach'",[w.id])).rows[0].n,1);
  assert.ok(!(await waiting()).some((r:any)=>r.reviewId===p.id),'a saved review leaves the list');
 });

 await t.test('Decline removes an unsaved workspace change; the person\'s own previews are not waiting for them',async()=>{
  const p=saved(await call('prepare_workspace_change',{operation:{kind:'create_node',nodeKind:'project',name:'Declined'}}));
  saved(await call('decline_waiting_review',{source:'workspace',reviewId:p.id}));
  assert.ok(!(await waiting()).some((r:any)=>r.reviewId===p.id));
  assert.equal((await call('approve_waiting_review',{source:'workspace',reviewId:p.id,digest:p.digest,confirmed:true})).isError,true,'a declined review cannot be approved');
  const mine=await withActor(owner,()=>f.preview(owner,w.id,{kind:'create_node',nodeKind:'project',name:'My own'}));
  assert.ok(!(await waiting()).some((r:any)=>r.reviewId===mine.id));
  assert.equal((await call('read_waiting_review',{source:'workspace',reviewId:mine.id})).isError,true);
 });

 await t.test('a code-lab function the assistant prepared waits and is saved on approval; one the person prepared does not wait',async()=>{
  const fn={name:'Weekly summary',source:'return {ok:true};',scope:{typeIds:[],documents:false,capabilities:[]},inputContract:{type:'object'},outputContract:{type:'object'}};
  const p=saved(await call('preview_function',{function:fn}));
  const row=(await waiting()).find((r:any)=>r.reviewId===p.id);
  assert.equal(row?.source,'code');assert.equal(row.kind,'function');assert.equal(row.title,'Save function: Weekly summary');assert.equal(row.assistant,'claude');
  assert.equal(saved(await call('read_waiting_review',{source:'code',reviewId:p.id})).details.name,'Weekly summary');
  saved(await call('approve_waiting_review',{source:'code',reviewId:p.id,digest:p.digest,confirmed:true}));
  assert.equal((await pg.query<any>("SELECT count(*) AS n FROM foundation_functions WHERE workspace_id=$1 AND name='Weekly summary'",[w.id])).rows[0].n,1);
  assert.ok(!(await waiting()).some((r:any)=>r.reviewId===p.id));
  const mine=await withActor(owner,()=>engine.prepareFunction(owner,w.id,{...fn,name:'Mine'}));
  assert.ok(!(await waiting()).some((r:any)=>r.reviewId===mine.id),'a person\'s own preview records no assistant');
  const declined=saved(await call('preview_function',{function:{...fn,name:'Not wanted'}}));
  saved(await call('decline_waiting_review',{source:'code',reviewId:declined.id}));
  assert.ok(!(await waiting()).some((r:any)=>r.reviewId===declined.id));
 });

 await t.test('older monitors: show_review opens Automations, where the person moves them',async()=>{
  const shown=saved(await call('show_review',{source:'legacy_monitors'}));assert.equal(shown.screen,'automations');assert.match(shown.reviewUrl,/tab=automations/);
  assert.equal((await call('show_review',{source:'workspace'})).isError,true,'other sources need a reviewId');
 });
});
