import express from 'express';
import request from 'supertest';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {addAutomationMcp} from '../src/server/automations.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {AsyncLocalStorage} from 'node:async_hooks';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,withDatabaseContext,setDatabaseContext,databaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppMonitoring} from '../src/app-services/monitoring.js';
import {AutomationService} from '../src/automations/service.js';
import {AutomationEvents,deliverAutomationEvent,signedHeaders} from '../src/automations/events.js';
import {dispatchDue,dispatchDaily,recoverWork,isolatedAutomationStep,dispatchCompletions} from '../src/automations/worker.js';
import {localInstant,nextCalendar} from '../src/automations/schedules.js';
import {schedule} from '../src/automations/schema.js';
import {AppActions,processAppAction} from '../src/app-services/service.js';
import type {Actor} from '../src/shared/schema.js';

test('calendar schedules resolve DST, weekly anchors and month end without completion drift',()=>{
 assert.equal(localInstant('2026-03-29','02:30','Europe/Berlin').toISOString(),'2026-03-29T01:00:00.000Z');
 assert.equal(localInstant('2026-10-25','02:30','Europe/Berlin').toISOString(),'2026-10-25T00:30:00.000Z');
 const weekly=schedule.parse({kind:'calendar',frequency:'weekly',time:'06:00',timeZone:'Europe/Berlin',anchor:'2026-10-19',interval:2,weekdays:[1]}) as any;
 assert.equal(nextCalendar(weekly,new Date('2026-10-20T12:00Z')).toISOString(),'2026-11-02T05:00:00.000Z');
 const monthly=schedule.parse({kind:'calendar',frequency:'monthly',time:'06:00',timeZone:'UTC',anchor:'2026-01-01',monthDay:31}) as any;
 assert.equal(nextCalendar(monthly,new Date('2026-02-01T00:00Z')).toISOString(),'2026-02-28T06:00:00.000Z');
});

test('shared automations isolate failures, preserve saved apps and enforce reviewed scope',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());for(const n of (await readdir('migrations')).filter(x=>x.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+n,'utf8'));await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();const db:Database={query:async(q,v)=>storage.getStore()?.query(q,v)??db.transaction(tx=>tx.query(q,v)),transaction:async fn=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async raw=>{await raw.exec(databaseContext().service==='worker'?'SET LOCAL ROLE trialy_worker':'SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(q,v)=>{await setDatabaseContext(raw as any);return raw.query(q,v) as any;}};return storage.run(tx,()=>fn(tx));});},close:()=>pg.close()};
 const human:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...human,origin:'ai',connectionFamily:randomUUID(),clientId:randomUUID()},other:Actor={userId:randomUUID(),origin:'human'};
 for(const a of [human,other])await pg.query<any>('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[a.userId,a.userId+'@example.invalid','Synthetic']);
 await pg.query<any>("INSERT INTO oauth_tokens(hash,user_id,client_id,kind,family,expires_at) VALUES($1,$2,$3,'refresh',$4,$5)",[randomUUID(),human.userId,ai.clientId,ai.connectionFamily,Date.now()+86400000]);
 const oldKey=process.env.CONNECTOR_ENCRYPTION_KEY;process.env.CONNECTOR_ENCRYPTION_KEY=randomBytes(32).toString('base64');
 const response=(body:string,status=200)=>({status,body,bytes:body.length,durationMs:1});let deliveries=0;
 const transport=async(req:any)=>{deliveries++;const body=JSON.parse(req.body);if(body.type==='verification')return response(JSON.stringify({challenge:body.challenge}));return response('{}');};
 try{await withActor(human,async()=>{
  const domain=new Service(db),f=new WorkspaceFoundation(db),m=new AppMonitoring(db),s=new AutomationService(db),w=await domain.createWorkspace(human,'Automation tests');await domain.setAi(human,w.id,true);
  const preview=await f.preview(human,w.id,{kind:'save_component',content:{name:'Always available',format:'frontend-js',sourceAccess:'bindings',source:'return {html:"<h1>Saved app</h1>"};',bindings:[]}}),app=await f.confirm(human,w.id,preview.id,preview.digest);
  const original=(await pg.query<any>('SELECT source,version,bindings FROM workspace_components WHERE id=$1',[app.id])).rows[0];
  const p=await s.prepare(ai,w.id,{preferences:{time:'06:00',timeZone:'Europe/Berlin'}});await assert.rejects(s.confirm(ai,w.id,p.id,p.digest),/approve/);const runner=await s.confirm(human,w.id,p.id,p.digest);
  const v={name:'automation.ready',arguments:{workspaceId:w.id,runnerId:runner.id},delivery:{mode:'webhook',url:'https://callbacks.example.org/events',secret:'whsec_'+randomBytes(32).toString('base64')}};
  await t.test('OAuth alone does not claim readiness; verified subscription round trip does',async()=>{
   assert.equal((await s.setup(human,w.id)).state,'awaiting_subscription');const events=new AutomationEvents(db,transport);const sub=await events.subscribe(ai,v);assert.equal((await s.setup(human,w.id)).state,'connected_unverified');assert.equal((await events.subscribe(ai,v)).id,sub.id);
   const work=(await s.agenda(ai,w.id,runner.id)).rows[0];const claim:any=await s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:work.id,requestKey:randomUUID()});assert.equal(claim.verification,true);await s.finish(ai,w.id,{occurrenceId:work.id,claimToken:claim.claimToken});assert.equal((await s.setup(human,w.id)).state,'ready');
   await withActor(other,()=>assert.rejects(s.setup(other,w.id)));await withActor(other,async()=>assert.equal((await db.query('SELECT id FROM automation_runners')).rows.length,0));
  });
  const expiry=new Date(Date.now()+7*86400000).toISOString();
  const config={name:'Research signals',appId:app.id,objective:'Find relevant public signals',instructions:'Check approved public sources and report evidence.',sourcePolicy:'Primary public sources only.',schedule:{description:'Daily at 06:00',timeZone:'Europe/Berlin'},expiresAt:expiry,automation:{runnerId:runner.id,trigger:{kind:'once',at:new Date(Date.now()-1000).toISOString()}}};
  let monitor:any,work:any,claim:any;
  await t.test('due jobs share the runner, snapshots stay stable, and research failures do not affect apps',async()=>{
   const p=await m.prepare(ai,w.id,{config});monitor=await m.confirm(human,w.id,p.id,p.digest);await withDatabaseContext({service:'worker'},()=>dispatchDue(db));
   const jobs=(await s.agenda(ai,w.id,runner.id)).rows;work=jobs.find((j:any)=>j.monitor_id===monitor.id);assert.ok(work);
   const key=randomUUID();claim=await s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:work.id,requestKey:key});assert.equal((await s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:work.id,requestKey:key}) as any).runId,claim.runId);await assert.rejects(s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:work.id,requestKey:randomUUID()}),/already/);
   await assert.rejects(m.start(ai,w.id,{monitorId:monitor.id,expectedVersion:0,occurrenceKey:randomUUID()}),/runner/);
   await s.checkpoint(ai,w.id,{occurrenceId:work.id,claimToken:claim.claimToken,checkpoint:{summary:'Source reviewed; more work needed.'}});
   await s.finish(ai,w.id,{occurrenceId:work.id,claimToken:claim.claimToken,result:{status:'partial',summary:'A source is temporarily unavailable.'}});
   assert.equal((await m.read(human,w.id,monitor.id)).coverage_through,null);assert.deepEqual((await pg.query<any>('SELECT source,version,bindings FROM workspace_components WHERE id=$1',[app.id])).rows[0],original);
  });
  await t.test('callback failure is separate from app reads and completion',async()=>{
   let errors=0;assert.equal(await isolatedAutomationStep(async()=>{throw Error('scheduler offline');},()=>errors++),false);assert.equal(errors,1);
   await withDatabaseContext({service:'worker'},()=>deliverAutomationEvent(db,async()=>{throw Error('callback offline');}));
   assert.ok((await f.component(db,human,w.id,app.id)).source.includes('Saved app'));assert.deepEqual((await pg.query<any>('SELECT source,version,bindings FROM workspace_components WHERE id=$1',[app.id])).rows[0],original);
   assert.equal((await pg.query<any>('SELECT coverage_through FROM app_monitors WHERE id=$1',[monitor.id])).rows[0].coverage_through,null);
  });
  await t.test('daily empty check is once per local date; paused runner blocks future work',async()=>{
   await pg.query<any>('UPDATE automation_runners SET next_daily_at=$2 WHERE id=$1',[runner.id,new Date(Date.now()-1000)]);await withDatabaseContext({service:'worker'},()=>dispatchDaily(db));await withDatabaseContext({service:'worker'},()=>dispatchDaily(db));
   const rows=(await s.agenda(ai,w.id,runner.id)).rows.filter((r:any)=>r.reason==='daily_check');assert.equal(rows.length,1);
   const c:any=await s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:rows[0].id,requestKey:randomUUID()});await s.control(human,w.id,runner.id,false,0);await assert.rejects(s.finish(ai,w.id,{occurrenceId:rows[0].id,claimToken:c.claimToken}),/active/);assert.ok((await f.component(db,human,w.id,app.id)).source.includes('Saved app'));
   await s.control(human,w.id,runner.id,true,1);
  });
  await t.test('expired claims recover without overwriting original receipts',async()=>{
   await pg.query<any>("UPDATE automation_occurrences SET status='queued',available_at=now() WHERE id=$1",[work.id]);const c:any=await s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:work.id,requestKey:randomUUID()});
   await pg.query<any>('UPDATE automation_occurrences SET lease_until=now()-interval \'1 second\' WHERE id=$1',[work.id]);await withDatabaseContext({service:'worker'},()=>recoverWork(db));assert.equal((await pg.query<any>('SELECT status FROM app_monitor_runs WHERE id=$1',[c.runId])).rows[0].status,'failed');await assert.rejects(s.checkpoint(ai,w.id,{occurrenceId:work.id,claimToken:c.claimToken,checkpoint:{summary:'Late writer'}}),/active/);
  });
  await t.test('resumed research reuses saved receipts, retains one budget and preserves completed records',async()=>{
   // Finish the earlier recovery case so this independent objective can claim work.
   await pg.query("UPDATE automation_occurrences SET status='blocked' WHERE id=$1",[work.id]);
   const save=async(op:any)=>{const p=await domain.preview(human,w.id,op);return domain.commit(human,p.id,p.digest);};
   const table=(await save({kind:'create_type',name:'Signals',fields:[{key:'name',name:'Name',kind:'text'}]})).objects[0].id;
   const projectDraft=await f.preview(human,w.id,{kind:'create_node',nodeKind:'project',name:'Research permissions'}),project=await f.confirm(human,w.id,projectDraft.id,projectDraft.digest);
   const scopeDraft=await f.preview(human,w.id,{kind:'save_scope',scope:{projectId:project.id,autoWrite:true,expiresAt:expiry,purpose:'Signals',inclusionCriteria:'Eligible',sourcePolicy:'Primary sources',basis:'tracking',bindings:[{typeId:table,fields:['name']}],allowCreate:true,allowUpdate:true,maxChanges:5}}),scope=await f.confirm(human,w.id,scopeDraft.id,scopeDraft.digest);
   const config2={...config,name:'Resumable signals',authoringKey:'signals-weekly',readBindings:[{typeId:table,fields:['name']}],writeScopes:[{scopeId:scope.id,version:0}],maxChangesPerRun:1};
   const p=await m.prepare(ai,w.id,{config:config2}),mon=await m.confirm(human,w.id,p.id,p.digest);await assert.rejects(m.prepare(ai,w.id,{config:config2}),/existing automation/);
   await withDatabaseContext({service:'worker'},()=>dispatchDue(db));const o=(await s.agenda(ai,w.id,runner.id)).rows.find((o:any)=>o.monitor_id===mon.id)!;
   const c:any=await s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:o.id,requestKey:randomUUID()}),batch={scopeId:scope.id,expectedScopeVersion:0,requestKey:randomUUID(),sourceLabel:'https://example.org/signal',interpretation:'Reviewed evidence',changes:[{kind:'create_record',typeId:table,data:{name:'Saved before interruption'}}]};
   const receipt=await withActor(ai,()=>f.maintain(ai,w.id,batch,undefined,false,c.runId));assert.equal(receipt.status,'saved');
   await s.finish(ai,w.id,{occurrenceId:o.id,claimToken:c.claimToken,result:{status:'partial',summary:'Saved one record; source fetch failed afterwards.'}});
   assert.equal((await pg.query<any>('SELECT count(*)::int AS n FROM records WHERE type_id=$1',[table])).rows[0].n,1);
   assert.equal((await s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:o.id,requestKey:c.claimToken})).status,'already_attempted');
   await pg.query('UPDATE automation_occurrences SET available_at=now() WHERE id=$1',[o.id]);const resumed:any=await s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:o.id,requestKey:randomUUID()});assert.notEqual(resumed.runId,c.runId);assert.deepEqual(resumed.previousRunIds,[c.runId]);
   assert.deepEqual(await withActor(ai,()=>f.maintain(ai,w.id,batch,undefined,false,resumed.runId)),receipt);
   await assert.rejects(withActor(ai,()=>f.maintain(ai,w.id,{...batch,requestKey:randomUUID()},undefined,false,resumed.runId)),/limit/);
   await assert.rejects(s.finish(ai,w.id,{occurrenceId:o.id,claimToken:resumed.claimToken,result:{status:'no_update',summary:'No changes'}}),/saved changes/);
   const final=await s.finish(ai,w.id,{occurrenceId:o.id,claimToken:resumed.claimToken,result:{status:'completed',summary:'One confirmed signal.'}});assert.equal(final.result.savedChanges,1);assert.deepEqual(final.result.receiptIds,[batch.requestKey]);
   assert.equal((await pg.query<any>('SELECT count(*)::int AS n FROM records WHERE type_id=$1',[table])).rows[0].n,1);
   // A failed follow-up configuration never rolls back the completed research.
   await pg.query("UPDATE automation_occurrences SET result=result||'{\"deliveryStatus\":\"blocked\"}'::jsonb WHERE id=$1",[o.id]);await s.retry(human,w.id,o.id,true);assert.equal((await pg.query<any>('SELECT status FROM automation_occurrences WHERE id=$1',[o.id])).rows[0].status,'completed');
   await s.retry(human,w.id,work.id);assert.equal((await pg.query<any>('SELECT attempts FROM automation_occurrences WHERE id=$1',[work.id])).rows[0].attempts,2);
   const before=JSON.stringify((await pg.query<any>('SELECT * FROM workspace_components WHERE id=$1',[app.id])).rows[0]);
   const changed=await m.prepare(ai,w.id,{monitorId:mon.id,expectedVersion:0,config:{...config2,instructions:'Use revised criteria and source list.'}});await m.confirm(human,w.id,changed.id,changed.digest);assert.equal(JSON.stringify((await pg.query<any>('SELECT * FROM workspace_components WHERE id=$1',[app.id])).rows[0]),before);
  });
  await t.test('database triggers are durable, duplicate-safe and exclude automated-write loops',async()=>{
   const save=async(op:any)=>{const p=await domain.preview(human,w.id,op);return domain.commit(human,p.id,p.digest);};
   const tid=(await save({kind:'create_type',name:'Trigger signals',fields:[{key:'name',name:'Name',kind:'text'}]})).objects[0].id;
   const p=await m.prepare(ai,w.id,{config:{...config,name:'Triggered signals',readBindings:[{typeId:tid,fields:['name']}],automation:{runnerId:runner.id,trigger:{kind:'database',typeId:tid,events:['created','updated'],fields:['name']}}}}),mon=await m.confirm(human,w.id,p.id,p.digest);
   const record=(await save({kind:'create_record',typeId:tid,data:{name:'New signal'}})).objects[0].id;
   for(let i=0;i<4;i++)await withDatabaseContext({service:'worker'},()=>dispatchDue(db));let jobs=(await pg.query<any>('SELECT * FROM automation_occurrences WHERE monitor_id=$1',[mon.id])).rows;assert.equal(jobs.length,1,JSON.stringify({dispatch:(await pg.query<any>('SELECT monitor_id,next_at,diagnostic,retry_at FROM automation_dispatch')).rows,events:(await pg.query<any>('SELECT action,source_run_id,event_sequence,after_value FROM audit_events WHERE object_id=$1',[record])).rows}));assert.equal(jobs[0].input.recordId,record);
   await pg.query('UPDATE automation_dispatch SET next_at=now() WHERE monitor_id=$1',[mon.id]);await withDatabaseContext({service:'worker'},()=>dispatchDue(db));assert.equal((await pg.query<any>('SELECT id FROM automation_occurrences WHERE monitor_id=$1',[mon.id])).rows.length,1);
   await pg.query("INSERT INTO audit_events(id,workspace_id,tenant_id,actor_id,action,object_id,origin,source_run_id,after_value) VALUES($1,$2,$3,$4,'record.updated',$5,'ai',$6,$7)",[randomUUID(),w.id,(await pg.query<any>('SELECT tenant_id FROM workspaces WHERE id=$1',[w.id])).rows[0].tenant_id,human.userId,record,randomUUID(),JSON.stringify({data:{name:'Automatic update'}})]);
   await pg.query('UPDATE automation_dispatch SET next_at=now() WHERE monitor_id=$1',[mon.id]);await withDatabaseContext({service:'worker'},()=>dispatchDue(db));assert.equal((await pg.query<any>('SELECT id FROM automation_occurrences WHERE monitor_id=$1',[mon.id])).rows.length,1);
   await m.control(human,w.id,mon.id,0,false);assert.equal((await s.agenda(ai,w.id,runner.id)).rows.find((r:any)=>r.monitor_id===mon.id).status,'paused');
  });
  await t.test('follow-up dispatch is once only; pausing stops effects while research remains completed',async()=>{
   await pg.query("UPDATE automation_occurrences SET status='blocked' WHERE status='queued'");
   const actions=new AppActions(db),draft=await actions.prepare(human,w.id,{config:{name:'Research email',appId:app.id,appVersion:0,trigger:{kind:'manual'},steps:[{id:'notify',kind:'email',to:['delivered@resend.dev'],subject:'Research report',text:'{{steps.research.summary}}'}],expiresAt:expiry}}),action=await actions.confirm(human,w.id,draft.id,draft.digest);
   const p=await m.prepare(ai,w.id,{config:{...config,name:'Report and notify',automation:{...config.automation,completionActionId:action.id,completionActionVersion:0}}}),mon=await m.confirm(human,w.id,p.id,p.digest);await withDatabaseContext({service:'worker'},()=>dispatchDue(db));const o=(await s.agenda(ai,w.id,runner.id)).rows.find((r:any)=>r.monitor_id===mon.id),c:any=await s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:o.id,requestKey:randomUUID()});
   await s.finish(ai,w.id,{occurrenceId:o.id,claimToken:c.claimToken,result:{status:'completed',summary:'Confirmed final report'}});await withDatabaseContext({service:'worker'},()=>dispatchCompletions(db));await withDatabaseContext({service:'worker'},()=>dispatchCompletions(db));const runs=(await pg.query<any>('SELECT * FROM app_action_runs WHERE action_id=$1',[action.id])).rows;assert.equal(runs.length,1);assert.equal(runs[0].results.research.summary,'Confirmed final report');
   await m.control(human,w.id,mon.id,0,false);await assert.rejects(actions.authorizeRun(runs[0].id),/stopped or changed/);await withDatabaseContext({service:'worker'},()=>processAppAction(db));assert.equal((await pg.query<any>('SELECT count(*)::int AS n FROM app_service_jobs')).rows[0].n,0);assert.equal((await pg.query<any>('SELECT status FROM automation_occurrences WHERE id=$1',[o.id])).rows[0].status,'completed');
   assert.deepEqual((await pg.query<any>('SELECT source,version,bindings FROM workspace_components WHERE id=$1',[app.id])).rows[0],original);
  });
  await t.test('subscription refresh, rotation, expiry, unsubscribe and delivery signatures',async()=>{
   const events=new AutomationEvents(db,transport),existing=await events.subscribe(ai,v),newKey='whsec_'+randomBytes(32).toString('base64');assert.equal((await events.subscribe(ai,{...v,delivery:{...v.delivery,secret:newKey}})).id,existing.id);
   let captured:any;await pg.query("UPDATE automation_outbox SET available_at=now(),status='queued' WHERE id=(SELECT id FROM automation_outbox ORDER BY created_at LIMIT 1)");
   await withDatabaseContext({service:'worker'},()=>deliverAutomationEvent(db,async req=>{await req.authorize?.();captured=req;return response('{}');}));assert.ok(captured);const hdr=captured.headers,expected=signedHeaders(newKey,hdr['webhook-id'],captured.body,existing.id,Number(hdr['webhook-timestamp']));assert.equal(hdr['webhook-signature'].split(' ')[0],expected['webhook-signature']);assert.equal(hdr['webhook-signature'].split(' ').length,2);assert.equal((await s.setup(human,w.id)).state,'ready');
   await events.unsubscribe(ai,{name:v.name,arguments:v.arguments,delivery:{mode:'webhook',url:v.delivery.url}});await events.unsubscribe(ai,{name:v.name,arguments:v.arguments,delivery:{mode:'webhook',url:v.delivery.url}});assert.equal((await s.setup(human,w.id)).state,'awaiting_subscription');
   assert.equal((await events.subscribe(ai,v)).id,existing.id);
   await pg.query('UPDATE automation_subscriptions SET expires_at=now()-interval \'1 second\' WHERE id=$1',[existing.id]);assert.equal((await s.setup(human,w.id)).state,'awaiting_subscription');
   assert.equal((await events.subscribe(ai,v)).id,existing.id);
   await assert.rejects(events.subscribe(ai,{...v,delivery:{...v.delivery,url:'http://127.0.0.1'}}));
   await assert.rejects(new AutomationEvents(db,async()=>response('wrong')).subscribe(ai,{...v,delivery:{...v.delivery,url:'https://callbacks.example.org/invalid'}}),/verified/);
  });
  await t.test('bounded host batches signal the remaining agenda without repeating completed work',async()=>{
   await pg.query("UPDATE automation_occurrences SET status='blocked' WHERE status='queued'");const current=await s.runner(human,w.id,runner.id);assert.ok(current.enabled);
   const ids=[randomUUID(),randomUUID()];for(const oid of ids)await pg.query("INSERT INTO automation_occurrences(id,workspace_id,user_id,runner_id,occurrence_key,due_at,reason) VALUES($1,$2,$3,$4,$5,now(),'daily_check')",[oid,w.id,human.userId,runner.id,'test-drain:'+oid]);
   const c:any=await s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:ids[0],requestKey:randomUUID()});await s.finish(ai,w.id,{occurrenceId:ids[0],claimToken:c.claimToken});
   const event=(await pg.query<any>("SELECT * FROM automation_outbox WHERE runner_id=$1 AND event_key LIKE 'drain:%' ORDER BY created_at DESC LIMIT 1",[runner.id])).rows[0];assert.ok(event);assert.ok(new Date(event.available_at).getTime()>Date.now());assert.equal((await pg.query<any>('SELECT status FROM automation_occurrences WHERE id=$1',[ids[1]])).rows[0].status,'queued');
   const replay=await s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:ids[0],requestKey:randomUUID()});assert.equal(replay.status,'completed');
  });
  await t.test('connection revocation blocks claims without hiding saved apps',async()=>{
   await pg.query<any>('DELETE FROM oauth_tokens WHERE family=$1',[ai.connectionFamily]);assert.equal((await s.setup(human,w.id)).state,'awaiting_subscription');await pg.query<any>('UPDATE automation_occurrences SET available_at=now() WHERE id=$1',[work.id]);await assert.rejects(s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:work.id,requestKey:randomUUID()}),/inactive/);assert.deepEqual((await pg.query<any>('SELECT source,version,bindings FROM workspace_components WHERE id=$1',[app.id])).rows[0],original);
  });
 });}finally{if(oldKey)process.env.CONNECTOR_ENCRYPTION_KEY=oldKey;else delete process.env.CONNECTOR_ENCRYPTION_KEY;}
});


test('MCP exposes events and quiet execution tools through the actual SDK transport',async()=>{
 const app=express();app.use(express.json());
 const actor:Actor={userId:randomUUID(),origin:'ai'};
 app.post('/mcp',async(req,res)=>{const server=new McpServer({name:'automation-test',version:'1'});const noDb={query:async()=>{throw Error('Unexpected database call');}} as unknown as Database;addAutomationMcp(server,noDb,actor,(fn:any)=>async(v:any)=>({content:[{type:'text',text:JSON.stringify(await fn(v))}]}),{ui:{resourceUri:'ui://must-stay-hidden'},'openai/outputTemplate':'ui://must-stay-hidden'});const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});res.on('close',()=>{void transport.close();void server.close();});await server.connect(transport);await transport.handleRequest(req,res,req.body);});
 const rpc=(method:string,params:any={})=>request(app).post('/mcp').set('Accept','application/json, text/event-stream').send({jsonrpc:'2.0',id:1,method,params});
 const initialized=await rpc('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'test',version:'1'}});assert.ok(initialized.body.result,String(initialized.status)+' '+initialized.text);assert.deepEqual(initialized.body.result.capabilities.events,{});
 const listed=await rpc('events/list');assert.equal(listed.body.result.events[0].name,'automation.ready');
 const tools=await rpc('tools/list');const claim=tools.body.result.tools.find((v:any)=>v.name==='claim_automation_work');assert.equal(claim.annotations.readOnlyHint,false);assert.equal(claim._meta?.['openai/outputTemplate'],undefined);
 const guide=await rpc('tools/call',{name:'read_app_automation_guide',arguments:{workspaceId:randomUUID()}});assert.match(guide.body.result.content[0].text,/Saved batches are atomic/);
 const invalid=await rpc('events/subscribe',{name:'unknown'});assert.ok(invalid.body.error);
});
