import {testAutomation,authorizeTestEmail,dispatchTestReports} from '../src/automations/testing.js';
import {processServiceJob} from '../src/app-services/jobs.js';
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
import {AutomationManagement} from '../src/automations/management.js';
import {AutomationService} from '../src/automations/service.js';
import {AutomationEvents,deliverAutomationEvent,signedHeaders} from '../src/automations/events.js';
import {dispatchDue,dispatchDaily,recoverWork,isolatedAutomationStep,dispatchCompletions} from '../src/automations/worker.js';
import {localInstant,nextCalendar} from '../src/automations/schedules.js';
import {schedule} from '../src/automations/schema.js';
import {AppActions,processAppAction,dispatchAppActions} from '../src/app-services/service.js';
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
  const resultDraft=await domain.preview(human,w.id,{kind:'create_type',name:'Research results',fields:[{key:'name',name:'Name',kind:'text'}]}),resultTable=(await domain.commit(human,resultDraft.id,resultDraft.digest)).objects[0].id;
  const saveReport=async(runId:string,monitorId:string,name:string)=>{const {config}=await m.read(ai,w.id,monitorId);return withActor(ai,()=>f.maintain(ai,w.id,{scopeId:config.writeScopes[0].scopeId,expectedScopeVersion:0,requestKey:randomUUID(),sourceLabel:'Reviewed research',interpretation:'Completed report',changes:[{kind:'create_record',typeId:resultTable,data:{name}}]},undefined,false,runId));};
  const preview=await f.preview(human,w.id,{kind:'save_component',content:{name:'Always available',format:'frontend-js',sourceAccess:'bindings',source:'return {html:"<h1>Saved app</h1>"};',bindings:[{typeId:resultTable,fields:['name']}]}}),app=await f.confirm(human,w.id,preview.id,preview.digest);
  let original=(await pg.query<any>('SELECT source,version,bindings FROM workspace_components WHERE id=$1',[app.id])).rows[0];
  const p=await s.prepare(ai,w.id,{preferences:{time:'06:00',timeZone:'Europe/Berlin'}});await assert.rejects(s.confirm(ai,w.id,p.id,p.digest),/approve/);const runner=await s.confirm(human,w.id,p.id,p.digest);
  const v={name:'automation.ready',arguments:{workspaceId:w.id,runnerId:runner.id},delivery:{mode:'webhook',url:'https://callbacks.example.org/events',secret:'whsec_'+randomBytes(32).toString('base64')}};
  await t.test('OAuth alone does not claim readiness; verified subscription round trip does',async()=>{
   const draft=await m.prepare(ai,w.id,{config:{name:'Connection gate test',appId:app.id,objective:'Check sources',instructions:'Research public sources',sourcePolicy:'Primary sources',schedule:{description:'Tomorrow',timeZone:'UTC'},expiresAt:new Date(Date.now()+86400000*7).toISOString(),automation:{runnerId:runner.id,trigger:{kind:'once',at:new Date(Date.now()+86400000).toISOString()}}}});
   await assert.rejects(m.confirm(human,w.id,draft.id,draft.digest),(e:any)=>e.code==='runner_not_ready'&&e.message.includes('awaiting_subscription'));
   const pending=await s.setup(human,w.id);assert.equal(pending.state,'awaiting_subscription');assert.ok('nextStep' in pending);assert.equal(pending.nextStep?.kind,'activate_host_event_subscription');assert.equal(pending.nextStep?.hostAutomationCount,1);assert.equal((pending.nextStep as any).recovery.maxRetries,1);assert.equal((pending.nextStep as any).recovery.tool,'automations.create');assert.ok((pending.nextStep as any).recovery.onActionNotFound.includes('peek_existing_tasks'));const events=new AutomationEvents(db,transport);const sub=await events.subscribe(ai,v);const checking=await s.setup(human,w.id);assert.equal(checking.state,'connected_unverified');assert.equal(checking.canActivate,false);assert.equal(checking.nextStep.kind,'wait_for_background_verification');assert.equal(checking.verification.status,'queued');await assert.rejects(m.confirm(human,w.id,draft.id,draft.digest),(e:any)=>e.code==='runner_not_ready');assert.equal((await events.subscribe(ai,v)).id,sub.id);
   const work=(await s.agenda(ai,w.id,runner.id)).rows[0];const claim:any=await s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:work.id,requestKey:randomUUID()});assert.equal(claim.verification,true);const [verified]=await Promise.all([s.setup(human,w.id,1),new Promise<void>((resolve,reject)=>setTimeout(()=>{void s.finish(ai,w.id,{occurrenceId:work.id,claimToken:claim.claimToken}).then(()=>resolve(),reject);},25))]);assert.equal(verified.state,'ready');
   const saved=await m.confirm(human,w.id,draft.id,draft.digest),manage=new AutomationManagement(db);assert.deepEqual((await manage.options(human,w.id,app.id)).writeScopes,[],'Run-bound grants are not offered for reuse by another automation');assert.equal((await manage.readiness(human,w.id,saved.id)).ready,true);
   await m.control(human,w.id,saved.id,0,false);await s.control(human,w.id,runner.id,false,0);await assert.rejects(m.control(human,w.id,saved.id,0,true),(e:any)=>e.code==='runner_not_ready');await s.control(human,w.id,runner.id,true,1);await pg.query('UPDATE automation_runners SET version=0 WHERE id=$1',[runner.id]);
   assert.equal((await manage.readiness(human,w.id,saved.id)).ready,false);
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
   const appDraft=await f.preview(human,w.id,{kind:'save_component',projectId:project.id,content:{name:'Signal results',format:'frontend-js',sourceAccess:'bindings',source:'return {html:"<p>Results</p>"};',bindings:[{typeId:table,fields:['name']}]}}),resultApp=await f.confirm(human,w.id,appDraft.id,appDraft.digest);
   const config2={...config,appId:resultApp.id,name:'Resumable signals',authoringKey:'signals-weekly',readBindings:[{typeId:table,fields:['name']}],writeScopes:[{scopeId:scope.id,version:0}],maxChangesPerRun:1};
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
  await t.test('completion preflight identifies app field gaps without widening research or notification access',async()=>{
   const tableDraft=await domain.preview(human,w.id,{kind:'create_type',name:'Scope signals',fields:[{key:'name',name:'Name',kind:'text'},{key:'signal',name:'Signal',kind:'text'}]}),tid=(await domain.commit(human,tableDraft.id,tableDraft.digest)).objects[0].id;
   const content={name:'Scope test app',format:'frontend-js',sourceAccess:'bindings',source:'return {html:"<h1>Scope test</h1>"};',bindings:[{typeId:tid,fields:['name']}]};
   const appDraft=await f.preview(human,w.id,{kind:'save_component',content}),linked=await f.confirm(human,w.id,appDraft.id,appDraft.digest);
   const draft=await m.prepare(ai,w.id,{config:{...config,appId:linked.id,readBindings:[{typeId:tid,fields:['name','signal']}]}});
   assert.equal(draft.preflight.researchReady,true);assert.equal(draft.preflight.followUpReady,false);assert.ok(draft.preflight.appAccessReview);assert.equal(draft.preflight.appAccessReview.ownerApprovalRequired,true);assert.deepEqual(draft.preflight.appAccessReview.read.arguments,{workspaceId:w.id,componentId:linked.id,includeOutput:false});assert.equal(draft.preflight.appAccessReview.prepare.arguments.expectedVersion,0);assert.deepEqual(draft.preflight.appAccessReview.addBindings,[{typeId:tid,fields:['signal']}]);
   assert.equal(draft.completionSource.status,'blocked');assert.deepEqual(draft.completionSource.missingBindings,[{typeId:tid,fields:['signal']}]);
   const mon=await m.confirm(human,w.id,draft.id,draft.digest),read=await m.read(ai,w.id,mon.id);
   assert.equal(read.availability,'ready');assert.equal(read.completionSource.status,'blocked');
   const actions=new AppActions(db),email={name:'Signal email',appId:linked.id,appVersion:0,trigger:{kind:'database',source:'automation_runs',automationId:mon.id,automationVersion:0,events:['updated'],fields:['status'],becomes:{field:'status',operator:'equals',value:'completed'}},steps:[{id:'notify',kind:'email',to:[human.userId+'@example.invalid'],subject:'Research report',text:'{{run.summary}}'}],expiresAt:expiry};
   await assert.rejects(actions.prepare(human,w.id,{config:email}),(e:any)=>e.code==='run_source_scope'&&e.message.includes('read_app_monitoring.completionSource'));
   assert.deepEqual((await f.component(db,human,w.id,linked.id)).bindings,content.bindings);
   assert.equal((await pg.query<any>('SELECT id FROM app_actions WHERE app_id=$1',[linked.id])).rows.length,0);
   const projectDraft=await f.preview(human,w.id,{kind:'create_node',nodeKind:'project',name:'Completion scope test'}),project=await f.confirm(human,w.id,projectDraft.id,projectDraft.digest);
   const scopeDraft=await f.preview(human,w.id,{kind:'save_scope',scope:{projectId:project.id,autoWrite:true,expiresAt:expiry,purpose:'Evidence updates',inclusionCriteria:'Relevant signals',sourcePolicy:'Primary sources',basis:'tracking',bindings:[{typeId:tid,fields:['name','signal']}],allowCreate:true,allowUpdate:true,maxChanges:5}}),scope=await f.confirm(human,w.id,scopeDraft.id,scopeDraft.digest);
   await assert.rejects(m.prepare(ai,w.id,{config:{...config,appId:linked.id,readBindings:[{typeId:tid,fields:['name']}],writeScopes:[{scopeId:scope.id,version:0}]}}),(e:any)=>e.code==='monitoring_write_scope','New research cannot activate with a result destination outside the app');
   // Explicitly reviewed app access alignment unblocks the same research source.
   const update=await f.preview(human,w.id,{kind:'save_component',componentId:linked.id,expectedVersion:0,content:{...content,bindings:[{typeId:tid,fields:['name','signal']}]}});await f.confirm(human,w.id,update.id,update.digest);
   assert.equal((await m.read(ai,w.id,mon.id)).completionSource.status,'ready');const ready=await m.prepare(ai,w.id,{config:{...config,appId:linked.id,readBindings:[{typeId:tid,fields:['name','signal']}]}});assert.equal(ready.preflight.followUpReady,true);assert.equal(ready.preflight.appAccessReview,null);assert.deepEqual(ready.preflight.nextSteps,[]);
   assert.equal((await actions.prepare(human,w.id,{config:{...email,appVersion:1}})).status,'review_required');
   await m.control(human,w.id,mon.id,0,false);
  });
  await t.test('run database triggers fan out once, preserve reports and stop delivery after access changes',async()=>{
   // Scope-only fixtures above share the same due time; isolate this producer from their queue order.
   await pg.query('UPDATE automation_dispatch SET next_at=NULL');
   await pg.query("UPDATE automation_occurrences SET status='blocked' WHERE status='queued'");
   const actions=new AppActions(db),p=await m.prepare(ai,w.id,{config:{...config,name:'Report producer'}}),mon=await m.confirm(human,w.id,p.id,p.digest);
   const actionConfig={name:'Research email',appId:app.id,appVersion:0,trigger:{kind:'database',source:'automation_runs',automationId:mon.id,automationVersion:0,events:['updated'],fields:['status'],becomes:{field:'status',operator:'equals',value:'completed'}},steps:[{id:'notify',kind:'email',to:[human.userId+'@example.invalid'],subject:'Research report',text:'{{run.summary}} / {{run.savedChanges}}'}],expiresAt:expiry};
   const create=async(config:any)=>{const draft=await actions.prepare(human,w.id,{config});return actions.confirm(human,w.id,draft.id,draft.digest);};
   await assert.rejects(create({...actionConfig,trigger:{kind:'manual'}}),/Run fields/);
   await assert.rejects(create({...actionConfig,steps:[{...actionConfig.steps[0],text:'{{steps.research.summary}}'}],trigger:{kind:'manual'}}),/database trigger/);
   await assert.rejects(create({...actionConfig,trigger:{...actionConfig.trigger,automationVersion:1}}),/current research/);
   const action=await create(actionConfig),second=await create({...actionConfig,name:'Independent consumer'}),quiet=await create({...actionConfig,name:'Only changed data',trigger:{...actionConfig.trigger,includeEmpty:false}});
   const manage=new AutomationManagement(db);assert.equal((await manage.readiness(human,w.id,mon.id,[action.id,second.id])).ready,true);
   await actions.control(human,w.id,second.id,true);const blocked=await manage.readiness(human,w.id,mon.id,[action.id,second.id]);assert.equal(blocked.ready,false);assert.ok(blocked.blockers.some(b=>b.actionId===second.id&&b.code==='action_disabled'));await actions.control(human,w.id,second.id,false);
   await m.control(human,w.id,mon.id,0,false);assert.equal((await manage.list(human,w.id,{query:'Research email',state:'disabled'})).rows.find(r=>r.id===action.id)?.effectiveEnabled,false);await m.control(human,w.id,mon.id,0,true);
   await pg.query('UPDATE automation_runners SET verified_at=NULL WHERE id=$1',[runner.id]);assert.equal((await m.read(human,w.id,mon.id)).execution.canRun,false);assert.ok((await s.agenda(ai,w.id,runner.id)).rows.every(r=>r.reason==='verification'));const pendingRows=(await manage.list(human,w.id,{})).rows;for(const id of [mon.id,action.id]){const row=pendingRows.find(r=>r.id===id);assert.equal(row?.connectionState,'connected_unverified');assert.equal(row?.enabled,true,'Saved intent is retained');assert.equal(row?.effectiveEnabled,false);assert.match(row?.blockedReason??'',/Connectors/);assert.ok((await manage.list(human,w.id,{state:'disabled'})).rows.some(r=>r.id===id));assert.ok(!(await manage.list(human,w.id,{state:'enabled'})).rows.some(r=>r.id===id));}const connector=await manage.connector(human,w.id);assert.equal(connector.effectiveEnabled,false);assert.equal(connector.automations.find(d=>d.id===action.id)?.effectiveEnabled,false);assert.equal((await manage.readiness(human,w.id,mon.id,[action.id])).ready,false);await pg.query('UPDATE automation_runners SET verified_at=now() WHERE id=$1',[runner.id]);
   await assert.rejects(m.prepare(ai,w.id,{config:{...config,automation:{...config.automation,completionActionId:action.id,completionActionVersion:0}}}),/database-triggered/);
   const tick=async(id:string)=>{await pg.query("UPDATE app_actions SET next_at=now()-interval '1 day' WHERE id=$1",[id]);await withDatabaseContext({service:'worker'},()=>dispatchAppActions(db));};
   await tick(action.id);assert.equal((await pg.query<any>('SELECT id FROM app_notification_batches WHERE action_id=$1',[action.id])).rows.length,0);
   await withDatabaseContext({service:'worker'},()=>dispatchDue(db));const o=(await s.agenda(ai,w.id,runner.id)).rows.find((r:any)=>r.monitor_id===mon.id),c:any=await s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:o.id,requestKey:randomUUID()});
   await assert.rejects(actions.runNow(human,w.id,action.id,randomUUID()),/committed research run/);
   await assert.rejects(actions.enqueue(human,w.id,action.id,'run:'+c.runId,undefined,[],{run:{summary:'Forged report'}}),/eligible completed/);
   const finish={occurrenceId:o.id,claimToken:c.claimToken,result:{status:'completed',summary:'Confirmed final report'}};
   await assert.rejects(s.finish(ai,w.id,finish),(e:any)=>e.code==='results_not_saved');
   await saveReport(c.runId,mon.id,'Confirmed final report');await s.finish(ai,w.id,finish);await s.finish(ai,w.id,finish);
   await pg.query('UPDATE automation_runners SET verified_at=NULL WHERE id=$1',[runner.id]);await assert.rejects(actions.enqueue(human,w.id,action.id,'run:'+c.runId),(e:any)=>e.code==='run_source_connection');await tick(action.id);const waiting=(await pg.query<any>('SELECT paused,last_error FROM app_actions WHERE id=$1',[action.id])).rows[0];assert.equal(waiting.paused,false);assert.equal(waiting.last_error,'awaiting_chatgpt_connection');await pg.query('UPDATE automation_runners SET verified_at=now() WHERE id=$1',[runner.id]);assert.equal((await manage.list(human,w.id,{})).rows.find(r=>r.id===action.id)?.effectiveEnabled,true);
   await tick(action.id);await tick(action.id);await tick(second.id);await tick(quiet.id);
   const runs=(await pg.query<any>('SELECT * FROM app_notification_batches WHERE action_id=$1',[action.id])).rows;
   assert.equal(runs.length,1);assert.equal(runs[0].source_run_id,c.runId);
   assert.equal((await pg.query<any>('SELECT id FROM app_notification_batches WHERE action_id=$1',[second.id])).rows.length,1);
   assert.equal((await pg.query<any>('SELECT id FROM app_notification_batches WHERE action_id=$1',[quiet.id])).rows.length,1);
   assert.equal((await pg.query<any>('SELECT context FROM app_notification_items WHERE batch_id=$1',[runs[0].id])).rows[0].context.run.summary,'Confirmed final report');
   // A second logical run must retain its own report even while the first waits.
   const again={id:randomUUID()};await pg.query("INSERT INTO automation_occurrences(id,workspace_id,user_id,runner_id,monitor_id,monitor_version,occurrence_key,due_at,reason) VALUES($1,$2,$3,$4,$5,0,$6,now(),'scheduled_due')",[again.id,w.id,human.userId,runner.id,mon.id,randomUUID()]);const next:any=await s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:again.id,requestKey:randomUUID()});
   await saveReport(next.runId,mon.id,'Second completed report');await s.finish(ai,w.id,{occurrenceId:again.id,claimToken:next.claimToken,result:{status:'completed',summary:'Second completed report'}});await tick(action.id);
   assert.equal((await pg.query<any>('SELECT id FROM app_notification_batches WHERE action_id=$1',[action.id])).rows.length,2);
   await pg.query('UPDATE app_actions SET event_cursor=0 WHERE id=$1',[action.id]);await tick(action.id);
   assert.equal((await pg.query<any>('SELECT id FROM app_notification_batches WHERE action_id=$1',[action.id])).rows.length,2,'Replay must not duplicate reports');
   for(const status of ['failed','no_update']){
    const id=randomUUID();await pg.query("INSERT INTO automation_occurrences(id,workspace_id,user_id,runner_id,monitor_id,monitor_version,occurrence_key,due_at,reason) VALUES($1,$2,$3,$4,$5,0,$6,now(),'scheduled_due')",[id,w.id,human.userId,runner.id,mon.id,randomUUID()]);
    const claimed:any=await s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:id,requestKey:randomUUID()});await s.finish(ai,w.id,{occurrenceId:id,claimToken:claimed.claimToken,result:{status,summary:'No completion report'}});await tick(action.id);
    assert.equal((await pg.query<any>('SELECT id FROM app_notification_batches WHERE action_id=$1',[action.id])).rows.length,2,status+' must not notify');
   }
   // Rendering uses server-sourced run fields and current permissions.
   await actions.control(human,w.id,second.id,true);const {dispatchNotificationBatch}=await import('../src/app-services/notifications.js');
   await pg.query('UPDATE automation_runners SET verified_at=NULL WHERE id=$1',[runner.id]);await pg.query("UPDATE app_notification_batches SET not_before=now()-interval '1 day' WHERE id=$1",[runs[0].id]);await withDatabaseContext({service:'worker'},()=>dispatchNotificationBatch(db));const waitingBatch=(await pg.query<any>('SELECT status,diagnostic FROM app_notification_batches WHERE id=$1',[runs[0].id])).rows[0];assert.equal(waitingBatch.status,'collecting');assert.equal(waitingBatch.diagnostic,'awaiting_chatgpt_connection');
   await pg.query('UPDATE automation_runners SET verified_at=now() WHERE id=$1',[runner.id]);await pg.query("UPDATE app_notification_batches SET not_before=now()-interval '1 day' WHERE id=$1",[runs[0].id]);await withDatabaseContext({service:'worker'},()=>dispatchNotificationBatch(db));
   const jobs=(await pg.query<any>("SELECT * FROM app_service_jobs WHERE payload->'notification'->>'batchId'=$1",[runs[0].id])).rows;assert.equal(jobs.length,1);assert.equal(jobs[0].payload.message.text,'Confirmed final report / 1');
   const {processServiceJob}=await import('../src/app-services/jobs.js');let delivered=0;
   await pg.query('UPDATE automation_runners SET verified_at=NULL WHERE id=$1',[runner.id]);await withDatabaseContext({service:'worker'},()=>processServiceJob(db,{email:async()=>{delivered++;return {id:'must-not-send'};}}));const waitingJob=(await pg.query<any>('SELECT status,diagnostic,attempts FROM app_service_jobs WHERE id=$1',[jobs[0].id])).rows[0];assert.equal(delivered,0);assert.equal(waitingJob.status,'queued');assert.equal(waitingJob.diagnostic,'awaiting_chatgpt_connection');assert.equal(waitingJob.attempts,0);
   await pg.query('UPDATE automation_runners SET verified_at=now() WHERE id=$1',[runner.id]);await pg.query("UPDATE app_service_jobs SET available_at=now()-interval '1 minute' WHERE id=$1",[jobs[0].id]);await m.control(human,w.id,mon.id,0,false);
   await withDatabaseContext({service:'worker'},()=>processServiceJob(db,{email:async()=>{delivered++;return {id:'must-not-send'};}}));assert.equal(delivered,0);
   assert.equal((await pg.query<any>('SELECT status FROM automation_occurrences WHERE id=$1',[o.id])).rows[0].status,'completed');
   assert.deepEqual((await pg.query<any>('SELECT source,version,bindings FROM workspace_components WHERE id=$1',[app.id])).rows[0],original);
   // A compatible app publication can invalidate the consumer without rerunning research.
   const revision=await f.preview(human,w.id,{kind:'save_component',componentId:app.id,expectedVersion:0,content:{name:'Always available',format:'frontend-js',sourceAccess:'bindings',source:'return {html:"<h1>Updated saved app</h1>"};',bindings:[{typeId:resultTable,fields:['name']}]}});await f.confirm(human,w.id,revision.id,revision.digest);await m.control(human,w.id,mon.id,0,true);
   assert.equal((await m.read(ai,w.id,mon.id)).availability,'ready');await tick(action.id);
   assert.equal((await pg.query<any>('SELECT status FROM automation_occurrences WHERE id=$1',[o.id])).rows[0].status,'completed');
   original=(await pg.query<any>('SELECT source,version,bindings FROM workspace_components WHERE id=$1',[app.id])).rows[0];
  });
  await t.test('email starts enabled and explains its pause when the linked research changes',async()=>{
   const actions=new AppActions(db),manage=new AutomationManagement(db),draft=await m.prepare(ai,w.id,{config:{...config,name:'Versioned email producer'}}),mon=await m.confirm(human,w.id,draft.id,draft.digest);
   const actionDraft=await actions.prepare(human,w.id,{config:{name:'Versioned report email',appId:app.id,appVersion:original.version,trigger:{kind:'database',source:'automation_runs',automationId:mon.id,automationVersion:0,events:['updated'],fields:['status'],becomes:{field:'status',operator:'equals',value:'completed'}},steps:[{id:'notify',kind:'email',to:[human.userId+'@example.invalid'],subject:'Research report',text:'{{run.summary}}'}],expiresAt:expiry}}),email=await actions.confirm(human,w.id,actionDraft.id,actionDraft.digest);
   const listed=async()=>(await manage.list(human,w.id,{appId:app.id,query:'Versioned report email'})).rows[0];
   assert.equal((await listed()).enabled,true);assert.equal((await listed()).blockedReason,null);
   const edit=await m.prepare(human,w.id,{monitorId:mon.id,expectedVersion:0,config:{...config,name:'Versioned email producer',instructions:'Use the updated research criteria.'}});await m.confirm(human,w.id,edit.id,edit.digest);
   await pg.query("UPDATE app_actions SET next_at=now()-interval '10 days' WHERE id=$1",[email.id]);await withDatabaseContext({service:'worker'},()=>dispatchAppActions(db));
   const paused=await listed();assert.equal(paused.enabled,false);assert.match(paused.blockedReason!,/Research changed/);assert.equal((await pg.query<any>('SELECT last_error FROM app_actions WHERE id=$1',[email.id])).rows[0].last_error,'run_source_changed');
   await assert.rejects(actions.control(human,w.id,email.id,false),(e:any)=>e.code==='run_source_changed');assert.equal((await pg.query<any>('SELECT id FROM app_notification_batches WHERE action_id=$1',[email.id])).rows.length,0);
  });
  await t.test('previously approved manual completion chains remain compatible',async()=>{
   const actions=new AppActions(db),d=await actions.prepare(human,w.id,{config:{name:'Legacy action',appId:app.id,appVersion:original.version,trigger:{kind:'manual'},steps:[{id:'notify',kind:'email',to:[human.userId+'@example.invalid'],subject:'Legacy report',text:'Saved report'}],expiresAt:expiry}}),action=await actions.confirm(human,w.id,d.id,d.digest);
   const p=await m.prepare(ai,w.id,{config:{...config,name:'Legacy producer'}}),mon=await m.confirm(human,w.id,p.id,p.digest);
   // Seed the pre-upgrade linkage without exposing its creation through new APIs.
   await pg.query("UPDATE app_monitors SET config=jsonb_set(config,'{automation,completionActionId}',to_jsonb($2::text)) WHERE id=$1",[mon.id,action.id]);await pg.query("UPDATE app_monitors SET config=jsonb_set(config,'{automation,completionActionVersion}','0'::jsonb) WHERE id=$1",[mon.id]);
   await pg.query("UPDATE app_actions SET config=jsonb_set(config,'{steps,0,text}',to_jsonb($2::text)) WHERE id=$1",[action.id,'{{steps.research.summary}}']);
   const id=randomUUID();await pg.query("INSERT INTO automation_occurrences(id,workspace_id,user_id,runner_id,monitor_id,monitor_version,occurrence_key,due_at,reason,completion_action_id,completion_action_version) VALUES($1,$2,$3,$4,$5,0,$6,now(),'scheduled_due',$7,0)",[id,w.id,human.userId,runner.id,mon.id,randomUUID(),action.id]);
   const claimed:any=await s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:id,requestKey:randomUUID()});await saveReport(claimed.runId,mon.id,'Legacy report preserved');await s.finish(ai,w.id,{occurrenceId:id,claimToken:claimed.claimToken,result:{status:'completed',summary:'Legacy report preserved'}});
   await withDatabaseContext({service:'worker'},()=>dispatchCompletions(db));await withDatabaseContext({service:'worker'},()=>dispatchCompletions(db));assert.equal((await pg.query<any>('SELECT id FROM app_notification_batches WHERE action_id=$1',[action.id])).rows.length,1);
  });
  await t.test('subscription refresh, rotation, expiry, unsubscribe and delivery signatures',async()=>{
   const events=new AutomationEvents(db,transport),existing=await events.subscribe(ai,v),newKey='whsec_'+randomBytes(32).toString('base64');assert.equal((await events.subscribe(ai,{...v,delivery:{...v.delivery,secret:newKey}})).id,existing.id);
   let captured:any;await pg.query("UPDATE automation_outbox SET available_at=now(),status='queued' WHERE id=(SELECT id FROM automation_outbox ORDER BY created_at LIMIT 1)");
   await withDatabaseContext({service:'worker'},()=>deliverAutomationEvent(db,async req=>{await req.authorize?.();captured=req;return response('{}');}));assert.ok(captured);const hdr=captured.headers,expected=signedHeaders(newKey,hdr['webhook-id'],captured.body,existing.id,Number(hdr['webhook-timestamp']));assert.equal(hdr['webhook-signature'].split(' ')[0],expected['webhook-signature']);assert.equal(hdr['webhook-signature'].split(' ').length,2);assert.equal((await s.setup(human,w.id)).state,'ready');
   await events.unsubscribe(ai,{name:v.name,arguments:v.arguments,delivery:{mode:'webhook',url:v.delivery.url}});await events.unsubscribe(ai,{name:v.name,arguments:v.arguments,delivery:{mode:'webhook',url:v.delivery.url}});assert.equal((await s.setup(human,w.id)).state,'awaiting_subscription');
   assert.equal((await events.subscribe(ai,v)).id,existing.id);
   await pg.query('UPDATE automation_subscriptions SET expires_at=now()-interval \'1 second\' WHERE id=$1',[existing.id]);assert.equal((await s.setup(human,w.id)).state,'awaiting_subscription');
   assert.equal((await events.subscribe(ai,v)).id,existing.id);
   const checks=(await s.agenda(ai,w.id,runner.id)).rows;assert.equal(checks.length,1);assert.equal(checks[0].reason,'verification');const verification:any=await s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:checks[0].id,requestKey:randomUUID()});await s.finish(ai,w.id,{occurrenceId:checks[0].id,claimToken:verification.claimToken});assert.equal((await s.setup(human,w.id)).canActivate,true);
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
  await t.test('isolated tests pin recipients, deduplicate, preserve schedules and prevent research writes',async()=>{
   await pg.query("UPDATE automation_occurrences SET status='blocked' WHERE status IN ('queued','running')");
   const actions=new AppActions(db),prep=await actions.prepare(human,w.id,{config:{name:'Test email',appId:app.id,appVersion:(await f.component(db,human,w.id,app.id)).version,trigger:{kind:'manual'},steps:[{id:'notify',kind:'email',to:[human.userId+'@example.invalid'],subject:'Saved subject',text:'Saved message'}],expiresAt:expiry}}),action=await actions.confirm(human,w.id,prep.id,prep.digest);
   // Stored production recipients must never become test recipients.
   await pg.query("UPDATE app_actions SET config=jsonb_set(config,'{steps,0,to}',$2::jsonb),paused=true WHERE id=$1",[action.id,JSON.stringify(['teammate@example.invalid'])]);
   const input={kind:'action',automationId:action.id,expectedVersion:0,requestKey:randomUUID()};
   await assert.rejects(testAutomation(db,human,w.id,{...input,to:['attacker@example.invalid']}));
   await withActor(other,()=>assert.rejects(testAutomation(db,other,w.id,input)));
   const job=await testAutomation(db,human,w.id,input);assert.equal((await testAutomation(db,human,w.id,input)).id,job.id);
   const payload=(await pg.query<any>('SELECT * FROM app_service_jobs WHERE id=$1',[job.id])).rows[0];assert.deepEqual(payload.payload.message.to,[human.userId+'@example.invalid']);assert.match(payload.payload.message.subject,/^\[Test\]/);
   await assert.rejects(authorizeTestEmail(db,{...payload,payload:{...payload.payload,message:{...payload.payload.message,to:['attacker@example.invalid']}}}),(e:any)=>e.code==='test_recipient');
   let sent:any;await withDatabaseContext({service:'worker'},()=>processServiceJob(db,{email:async message=>{sent=message;return {id:'synthetic-test'};}}));assert.deepEqual(sent.to,[human.userId+'@example.invalid']);
   assert.equal((await pg.query<any>('SELECT paused FROM app_actions WHERE id=$1',[action.id])).rows[0].paused,true);
   const save=async(op:any)=>{const p=await domain.preview(human,w.id,op);return domain.commit(human,p.id,p.digest);};
   const tid=(await save({kind:'create_type',name:'Test preview records',fields:[{key:'name',name:'Name',kind:'text'}]})).objects[0].id;
   const projectDraft=await f.preview(human,w.id,{kind:'create_node',nodeKind:'project',name:'Test preview'}),project=await f.confirm(human,w.id,projectDraft.id,projectDraft.digest);
   const scopeDraft=await f.preview(human,w.id,{kind:'save_scope',scope:{projectId:project.id,autoWrite:true,expiresAt:expiry,purpose:'Test preview',inclusionCriteria:'Eligible',sourcePolicy:'Primary sources',basis:'tracking',bindings:[{typeId:tid,fields:['name']}],allowCreate:true,allowUpdate:true,maxChanges:5}}),scope=await f.confirm(human,w.id,scopeDraft.id,scopeDraft.digest);
   const testDraft=await f.preview(human,w.id,{kind:'save_component',projectId:project.id,content:{name:'Test output',format:'frontend-js',sourceAccess:'bindings',source:'return {html:"<p>Test output</p>"};',bindings:[{typeId:tid,fields:['name']}]}}),testApp=await f.confirm(human,w.id,testDraft.id,testDraft.digest);
   const p=await m.prepare(human,w.id,{config:{...config,appId:testApp.id,name:'Isolated research',readBindings:[{typeId:tid,fields:['name']}],writeScopes:[{scopeId:scope.id,version:0}],automation:{runnerId:runner.id,trigger:{kind:'after_success',minutes:60}}}}),mon=await m.confirm(human,w.id,p.id,p.digest);
   const before=(await pg.query<any>('SELECT * FROM automation_dispatch WHERE monitor_id=$1',[mon.id])).rows[0];
   const test=await testAutomation(db,human,w.id,{kind:'research',automationId:mon.id,expectedVersion:0,requestKey:randomUUID()}),packet:any=await s.claim(ai,w.id,{runnerId:runner.id,occurrenceId:test.id,requestKey:randomUUID()});assert.equal(packet.reason,'test_run');assert.match(packet.testInstructions,/Read-only/);
   await withActor(ai,()=>assert.rejects(f.maintain(ai,w.id,{scopeId:scope.id,expectedScopeVersion:0,requestKey:randomUUID(),sourceLabel:'https://example.org/source',interpretation:'Test',changes:[{kind:'create_record',typeId:tid,data:{name:'Must not save'}}]},undefined,false,packet.runId),(e:any)=>e.code==='test_read_only'));
   await s.finish(ai,w.id,{occurrenceId:test.id,claimToken:packet.claimToken,result:{status:'completed',summary:'Test research preview',sources:[],coverage:{through:new Date().toISOString(),notes:'Must not advance coverage'}}});
   assert.deepEqual((await pg.query<any>('SELECT * FROM automation_dispatch WHERE monitor_id=$1',[mon.id])).rows[0],before);assert.equal((await m.row(human,w.id,mon.id)).coverage_through,null);
   assert.equal((await pg.query<any>("SELECT id FROM audit_events WHERE object_id=$1 AND action='monitoring.finished'",[packet.runId])).rows.length,0);
   await withDatabaseContext({service:'worker'},()=>dispatchTestReports(db));await withDatabaseContext({service:'worker'},()=>dispatchTestReports(db));
   const reports=(await pg.query<any>("SELECT * FROM app_service_jobs WHERE request_key=$1",['test-report:'+test.id])).rows;assert.equal(reports.length,1);assert.deepEqual(reports[0].payload.message.to,[human.userId+'@example.invalid']);
   await authorizeTestEmail(db,reports[0]);
   // A test shares production suppression/delivery budgets rather than bypassing them.
   let additional=0;await withDatabaseContext({service:'worker'},()=>processServiceJob(db,{email:async()=>{additional++;return {id:'must-wait'};}}));assert.equal(additional,0);
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
