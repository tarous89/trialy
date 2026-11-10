import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {AsyncLocalStorage} from 'node:async_hooks';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,withDatabaseContext,setDatabaseContext,databaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {AppMonitoring} from '../src/app-services/monitoring.js';
import {AutomationManagement} from '../src/automations/management.js';
import {AutomationService} from '../src/automations/service.js';
import {AutomationEvents,deliverAutomationEvent,CLAUDE_FIRE_BETA} from '../src/automations/events.js';
import {AccessManagement} from '../src/domain/access-management.js';
import type {Actor} from '../src/shared/schema.js';

const FIRE='https://api.anthropic.com/v1/claude_code/routines/trig_01SYNTHETICTESTTRIGGER/fire',TOKEN='sk-ant-oat01-synthetic_test_token_value';

test('ChatGPT and Claude each own their runner and automations; either can pause the other',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());for(const n of (await readdir('migrations')).filter(x=>x.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+n,'utf8'));await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();const db:Database={query:async(q,v)=>storage.getStore()?.query(q,v)??db.transaction(tx=>tx.query(q,v)),transaction:async fn=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async raw=>{await raw.exec(databaseContext().service==='worker'?'SET LOCAL ROLE trialy_worker':'SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(q,v)=>{await setDatabaseContext(raw as any);return raw.query(q,v) as any;}};return storage.run(tx,()=>fn(tx));});},close:()=>pg.close()};
 const human:Actor={userId:randomUUID(),origin:'human'};
 const chatgpt:Actor={...human,origin:'ai',connectionFamily:randomUUID(),clientId:randomUUID()};
 const claude:Actor={...human,origin:'ai',assistant:'claude',connectionFamily:randomUUID(),clientId:randomUUID()};
 await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[human.userId,human.userId+'@example.invalid','Synthetic']);
 for(const [a,assistant] of [[chatgpt,'chatgpt'],[claude,'claude']] as const)await pg.query("INSERT INTO oauth_tokens(hash,user_id,client_id,kind,family,expires_at,assistant) VALUES($1,$2,$3,'refresh',$4,$5,$6)",[randomUUID(),human.userId,a.clientId,a.connectionFamily,Date.now()+86400000,assistant]);
 const oldKey=process.env.CONNECTOR_ENCRYPTION_KEY;process.env.CONNECTOR_ENCRYPTION_KEY=randomBytes(32).toString('base64');t.after(()=>{process.env.CONNECTOR_ENCRYPTION_KEY=oldKey;});
 const sent:any[]=[];const transport=async(req:any)=>{sent.push(req);return {status:200,body:JSON.stringify({type:'routine_fire',claude_code_session_id:'session_synthetic'}),bytes:10,durationMs:1};};
 const as=<T>(a:Actor,fn:()=>Promise<T>)=>withActor(a,fn);

 await as(human,async()=>{
  const domain=new Service(db),m=new AppMonitoring(db),s=new AutomationService(db),manage=new AutomationManagement(db),w=await domain.createWorkspace(human,'Assistant automations');await domain.setAi(human,w.id,true);
  // The app itself is not under test; insert it directly so no code sandbox is needed.
  const app={id:randomUUID()};await pg.query("INSERT INTO workspace_components(id,workspace_id,name,format,source,source_access,created_by,project_id) VALUES($1,$2,'Tracker','frontend-js','return {html:\"<h1>Tracker</h1>\"};','bindings',$3,(SELECT id FROM workspace_nodes WHERE workspace_id=$2 ORDER BY created_at LIMIT 1))",[app.id,w.id,human.userId]);

  // Separate runners per assistant.
  const pg1=await as(chatgpt,()=>s.prepare(chatgpt,w.id,{preferences:{time:'06:00',timeZone:'Europe/Berlin'}})),chatgptRunner=await s.confirm(human,w.id,pg1.id,pg1.digest);
  const pc1=await as(claude,()=>s.prepare(claude,w.id,{preferences:{time:'07:00',timeZone:'Europe/Berlin'}})),claudeRunner=await s.confirm(human,w.id,pc1.id,pc1.digest);
  assert.notEqual(chatgptRunner.id,claudeRunner.id);
  assert.deepEqual((await pg.query<any>('SELECT assistant FROM automation_runners ORDER BY assistant')).rows.map(r=>r.assistant),['chatgpt','claude']);
  assert.equal((await s.setup(human,w.id)).id,chatgptRunner.id,'Web defaults to the ChatGPT runner as before');
  const claudeSetup:any=await as(claude,()=>s.setup(claude,w.id));
  assert.equal(claudeSetup.id,claudeRunner.id);assert.equal(claudeSetup.state,'awaiting_subscription');assert.equal(claudeSetup.nextStep.kind,'connect_claude_routine');assert.match(claudeSetup.dispatcherPrompt,/routine-fire-payload/);

  // A review prepared in Claude cannot be confirmed in ChatGPT.
  const pc2=await as(claude,()=>s.prepare(claude,w.id,{expectedVersion:0,preferences:{time:'08:00',timeZone:'Europe/Berlin'}}));
  await assert.rejects(as(chatgpt,()=>s.confirm({...chatgpt,actionConfirmed:true},w.id,pc2.id,pc2.digest,(pc2 as any).review)),(e:any)=>e.code==='other_assistant_review');

  // Each assistant uses only its own runner.
  await assert.rejects(as(claude,()=>s.agenda(claude,w.id,chatgptRunner.id)),(e:any)=>e.code==='runner_unavailable');
  await assert.rejects(as(chatgpt,()=>s.agenda(chatgpt,w.id,claudeRunner.id)),(e:any)=>e.code==='runner_unavailable');
  const events=new AutomationEvents(db,transport);
  await assert.rejects(as(claude,()=>events.subscribe(claude,{name:'automation.ready',arguments:{workspaceId:w.id,runnerId:claudeRunner.id},delivery:{mode:'webhook',url:'https://callbacks.example.org/x',secret:'whsec_'+randomBytes(32).toString('base64')}})),(e:any)=>e.code==='runner_kind');
  await assert.rejects(as(claude,()=>events.connectClaude({...claude,actionConfirmed:true},{workspaceId:w.id,runnerId:claudeRunner.id,fireUrl:'https://evil.example/fire',token:TOKEN})));
  await assert.rejects(as(chatgpt,()=>events.connectClaude({...chatgpt,actionConfirmed:true},{workspaceId:w.id,runnerId:claudeRunner.id,fireUrl:FIRE,token:TOKEN})),(e:any)=>e.code==='runner_unavailable');

  // Connect the Claude task; TrialAgents fires it once to verify.
  await as(claude,()=>events.connectClaude({...claude,actionConfirmed:true},{workspaceId:w.id,runnerId:claudeRunner.id,fireUrl:FIRE,token:TOKEN}));
  assert.equal((await as(claude,()=>s.setup(claude,w.id))).state,'connected_unverified');
  await withDatabaseContext({service:'worker'},()=>deliverAutomationEvent(db,transport));
  assert.equal(sent.length,1);assert.equal(sent[0].url,FIRE);assert.equal(sent[0].headers.authorization,'Bearer '+TOKEN);assert.equal(sent[0].headers['anthropic-beta'],CLAUDE_FIRE_BETA);assert.ok(!sent[0].body.includes(TOKEN));
  const stored=(await pg.query<any>("SELECT secret,kind FROM automation_subscriptions WHERE runner_id=$1",[claudeRunner.id])).rows[0];assert.equal(stored.kind,'claude_fire');assert.ok(!stored.secret.includes(TOKEN),'Token is stored encrypted');
  const work=(await as(claude,()=>s.agenda(claude,w.id,claudeRunner.id))).rows[0];const claim:any=await as(claude,()=>s.claim(claude,w.id,{runnerId:claudeRunner.id,occurrenceId:work.id,requestKey:randomUUID()}));
  await as(claude,()=>s.finish(claude,w.id,{occurrenceId:work.id,claimToken:claim.claimToken}));
  assert.equal((await as(claude,()=>s.setup(claude,w.id))).state,'ready');

  // Wakes are coalesced to respect Claude's per-task start limit.
  await pg.query("INSERT INTO automation_outbox(id,workspace_id,user_id,runner_id,event_key,reason) VALUES($1,$2,$3,$4,'synthetic-wake','work_due')",[randomUUID(),w.id,human.userId,claudeRunner.id]);
  await withDatabaseContext({service:'worker'},()=>deliverAutomationEvent(db,transport));assert.equal(sent.length,1,'A second wake within two minutes is delayed, not sent');

  // Claude research belongs to Claude.
  const config={name:'Claude research',appId:app.id,objective:'Find public signals',instructions:'Check approved sources.',sourcePolicy:'Primary sources only.',schedule:{description:'Tomorrow',timeZone:'UTC'},expiresAt:new Date(Date.now()+7*86400000).toISOString(),automation:{runnerId:claudeRunner.id,trigger:{kind:'once',at:new Date(Date.now()+86400000).toISOString()}}};
  await assert.rejects(as(chatgpt,()=>m.prepare(chatgpt,w.id,{config})),(e:any)=>e.code==='runner_unavailable','ChatGPT cannot schedule research on the Claude runner');
  const draft=await as(claude,()=>m.prepare(claude,w.id,{config})),saved=await m.confirm(human,w.id,draft.id,draft.digest);
  assert.equal((await pg.query<any>('SELECT assistant FROM app_monitors WHERE id=$1',[saved.id])).rows[0].assistant,'claude');
  const listed:any=await as(chatgpt,()=>manage.list(chatgpt,w.id,{}));const row=listed.rows.find((r:any)=>r.id===saved.id);assert.equal(row.executor,'claude');assert.equal(row.canEdit,false);

  // ChatGPT may pause Claude's research but not edit or resume it.
  await assert.rejects(as(chatgpt,()=>m.prepare(chatgpt,w.id,{monitorId:saved.id,expectedVersion:0,config:{...config,name:'Edited by ChatGPT'}})),(e:any)=>e.code==='other_assistant_automation');
  const pause=await as(chatgpt,()=>manage.prepareControl(chatgpt,w.id,{kind:'research',automationId:saved.id,expectedVersion:0,enabled:false}));
  await as(chatgpt,()=>manage.confirmControl({...chatgpt,actionConfirmed:true},w.id,pause.id,pause.digest,(pause as any).review));
  assert.equal((await pg.query<any>('SELECT enabled FROM app_monitors WHERE id=$1',[saved.id])).rows[0].enabled,false);
  await assert.rejects(as(chatgpt,()=>manage.prepareControl(chatgpt,w.id,{kind:'research',automationId:saved.id,expectedVersion:0,enabled:true})),(e:any)=>e.code==='other_assistant_automation');
  await as(human,()=>m.control(human,w.id,saved.id,0,true));
  assert.equal((await pg.query<any>('SELECT enabled FROM app_monitors WHERE id=$1',[saved.id])).rows[0].enabled,true,'The owner on the web can resume anything');

  // Runner pause across assistants; resuming stays with the runner's assistant.
  await as(chatgpt,()=>s.control({...chatgpt,actionConfirmed:true},w.id,claudeRunner.id,false,0));
  await assert.rejects(as(chatgpt,()=>s.control({...chatgpt,actionConfirmed:true},w.id,claudeRunner.id,true,1)),(e:any)=>e.code==='runner_unavailable');
  await as(claude,()=>s.control({...claude,actionConfirmed:true},w.id,claudeRunner.id,true,1));

  // Switching Claude off under Access stops its background runner from working, without touching ChatGPT.
  const am=new AccessManagement(db),ov=await am.overview(human,w.id);await am.update(human,w.id,{expectedVersion:ov.version,subject:'claude',claude:false});
  await assert.rejects(as(claude,()=>s.setup(claude,w.id)));
  assert.equal((await as(chatgpt,()=>s.setup(chatgpt,w.id))).id,chatgptRunner.id);
 });
});
