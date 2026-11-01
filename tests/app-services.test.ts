import {dispatchNotificationBatch} from '../src/app-services/notifications.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHmac} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {AsyncLocalStorage} from 'node:async_hooks';
import {PGlite} from '@electric-sql/pglite';
import request from 'supertest';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,withDatabaseContext,setDatabaseContext,databaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppActions,processAppAction,dispatchAppActions,recordDue,nextAction,actionRequestKey} from '../src/app-services/service.js';
import {AppSharing} from '../src/app-services/sharing.js';
import {processServiceJob,serviceJob,receiveDeliveryEvent,applyDeliveryEvents} from '../src/app-services/jobs.js';
import {actionConfig,expand} from '../src/app-services/schema.js';
import {Foundation} from '../src/foundation/service.js';
import {runFoundation} from '../src/foundation/worker.js';
import {Connectors} from '../src/connectors/service.js';
import {connectorConfig,connectorOperation} from '../src/connectors/schema.js';
import {baseApp,errors} from '../src/server/app.js';
import {addPublicAppServices} from '../src/server/app-services.js';
import {id,type Actor} from '../src/shared/schema.js';

test('action dates, typed templates and timeouts',()=>{
 assert.equal(connectorOperation.parse({id:'llm',name:'LLM',method:'POST',path:'/v1/responses',effect:'write',execution:'background',response:{fields:['output']},users:[],apps:[]}).timeoutSeconds,300);
 assert.equal(recordDue('2026-11-15',{kind:'record_date',typeId:randomUUID(),field:'date',time:'09:00',timeZone:'Europe/Berlin',offsetMinutes:-60})?.toISOString(),'2026-11-15T07:00:00.000Z');
 assert.equal(recordDue('2026-11-15T08:30:00Z',{kind:'record_date',typeId:randomUUID(),field:'date',time:'09:00',timeZone:'UTC',offsetMinutes:60})?.toISOString(),'2026-11-15T09:30:00.000Z');
 assert.equal(nextAction({trigger:{kind:'calendar',time:'09:00',timeZone:'UTC',weekdays:[1]}} as any,new Date('2026-11-13T12:00:00Z'))?.toISOString(),'2026-11-16T09:00:00.000Z');
 assert.deepEqual(expand({messages:[{role:'user',content:'{{record.name}}'}]},{record:{name:'Test'}}),{messages:[{role:'user',content:'Test'}]});
 assert.throws(()=>expand('{{record.constructor}}',{record:{}}));assert.equal(id.parse(actionRequestKey('step')),actionRequestKey('step'));
});

test('durable app services run with the restricted production roles',async t=>{
 const pg=new PGlite();for(const name of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+name,'utf8'));
 await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();
 const db:Database={query:async(s,v)=>{const tx=storage.getStore();return tx?tx.query(s,v):db.transaction(t=>t.query(s,v));},transaction:async fn=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async raw=>{await raw.exec(databaseContext().service==='worker'?'SET LOCAL ROLE trialy_worker':'SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(s,v)=>{await setDatabaseContext(raw as any);return raw.query(s,v) as any;}};return storage.run(tx,()=>fn(tx));});},close:()=>pg.close()};
 const owner:Actor={userId:randomUUID(),origin:'human'},invitee:Actor={userId:randomUUID(),origin:'human'},wrong:Actor={userId:randomUUID(),origin:'human'};
 for(const [a,email] of [[owner,'owner@example.invalid'],[invitee,'invitee@example.invalid'],[wrong,'wrong@example.invalid']] as const)await pg.query<any>('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,email,'Synthetic']);
 const s=new Service(db),f=new WorkspaceFoundation(db),actions=new AppActions(db),sharing=new AppSharing(db);
 const worker=<T>(fn:()=>T)=>withDatabaseContext({service:'worker'},fn);
 try{await withActor(owner,async()=>{
  const w=await s.createWorkspace(owner,'App services tests');await s.setAi(owner,w.id,true);
  const save=async(op:any)=>{const p=await s.preview(owner,w.id,op);return s.commit(owner,p.id,p.digest);};
  const typeId=(await save({kind:'create_type',name:'Tasks',fields:[{key:'name',name:'Name',kind:'text'},{key:'status',name:'Status',kind:'text'},{key:'private',name:'Private',kind:'text',ai:false}]})).objects[0].id;
  const recordId=(await save({kind:'create_record',typeId,data:{name:'First',status:'Pending',private:'Do not disclose'}})).objects[0].id;
  const p=await f.preview(owner,w.id,{kind:'save_component',content:{name:'Task app',format:'frontend-js',sourceAccess:'bindings',source:`const p=tools.call('records.read',{typeId:'${typeId}',limit:10,offset:0});return {html:'<p>'+p.rows.map(r=>r.data.name).join(', ')+'</p>'};`,bindings:[{typeId,fields:['name','status']}]}}),app=await f.confirm(owner,w.id,p.id,p.digest);
  const config=(overrides:any={})=>actionConfig.parse({name:'Notify',appId:app.id,appVersion:0,trigger:{kind:'manual'},steps:[{id:'notify',kind:'email',to:['owner@example.invalid'],subject:'Task notification',text:'Synthetic notification'}],expiresAt:new Date(Date.now()+86400000).toISOString(),...overrides});
  const create=async(overrides:any={})=>{const draft=await actions.prepare(owner,w.id,{config:config(overrides)});return actions.confirm(owner,w.id,draft.id,draft.digest);};
  const ready=async()=>{await pg.exec("UPDATE app_action_runs SET lease_until=NULL WHERE status='waiting'");await pg.exec("UPDATE app_notification_batches SET not_before=now() WHERE status IN ('collecting','sending')");};
  const notification=async()=>{await ready();await worker(()=>dispatchNotificationBatch(db));};
  await t.test('exact human approval, idempotent execution, durable retries and delivery receipts',async()=>{
   const draft=await actions.prepare(owner,w.id,{config:config()});await assert.rejects(actions.confirm({...owner,origin:'ai'},w.id,draft.id,draft.digest));
   const action=await actions.confirm(owner,w.id,draft.id,draft.digest);assert.deepEqual(await actions.confirm(owner,w.id,draft.id,draft.digest),action);
   const key=randomUUID(),run=await actions.runNow(owner,w.id,action.id,key);assert.equal((await actions.runNow(owner,w.id,action.id,key)).id,run.id);
   await notification();const job=(await pg.query<any>('SELECT * FROM app_service_jobs')).rows[0] as any;assert.equal(job.status,'queued');
   let sends=0;const email=async(_m:any,k:string)=>{sends++;assert.equal(k,job.id);if(sends===1)throw Error('connection reset');return {id:'synthetic-provider-id'};};
   await worker(()=>processServiceJob(db,{email}));assert.equal((await pg.query<any>('SELECT status FROM app_service_jobs WHERE id=$1',[job.id])).rows[0].status,'queued');
   await pg.query<any>("UPDATE app_service_jobs SET available_at=now() WHERE id=$1",[job.id]);await worker(()=>processServiceJob(db,{email}));
   await notification();assert.equal((await actions.status(owner,w.id,run.id)).status,'succeeded');assert.equal(sends,2);
   assert.equal((await serviceJob(db,owner,w.id,job.id)).deliveryStatus,'accepted');await assert.rejects(db.query('UPDATE app_service_jobs SET payload=$2 WHERE id=$1',[job.id,'{}']),/immutable/);
   const secret='whsec_'+randomBytes(32).toString('base64'),raw=Buffer.from(JSON.stringify({type:'email.bounced',data:{email_id:'synthetic-provider-id',to:['owner@example.invalid']}})),stamp=String(Math.floor(Date.now()/1000)),eventId='synthetic-event';const signature=createHmac('sha256',Buffer.from(secret.slice(6),'base64')).update(eventId+'.'+stamp+'.').update(raw).digest('base64'),headers={'svix-id':eventId,'svix-timestamp':stamp,'svix-signature':'v1,'+signature};
   await receiveDeliveryEvent(db,raw,headers,secret);await receiveDeliveryEvent(db,raw,headers,secret);assert.equal((await pg.query<any>('SELECT count(*) n FROM notification_events')).rows[0].n,1);await assert.rejects(receiveDeliveryEvent(db,Buffer.from('{}'),headers,secret));await worker(()=>applyDeliveryEvents(db));assert.equal((await serviceJob(db,owner,w.id,job.id)).deliveryStatus,'email.bounced');
   // A late sent event cannot erase a bounce.
   await pg.query<any>("INSERT INTO notification_events(id,provider_id,event_type) VALUES('late','synthetic-provider-id','email.sent')");await worker(()=>applyDeliveryEvents(db));assert.equal((await serviceJob(db,owner,w.id,job.id)).deliveryStatus,'email.bounced');
  });
  await t.test('revocation and cancellation stop queued effects and remain visible in history',async()=>{
   const action=await create(),run=await actions.runNow(owner,w.id,action.id,randomUUID());await notification();await actions.control(owner,w.id,action.id,true);let sends=0;await worker(()=>processServiceJob(db,{email:async()=>{sends++;return {id:'unexpected'};}}));assert.equal(sends,0);await notification();assert.equal((await actions.status(owner,w.id,run.id)).status,'cancelled');
   await actions.control(owner,w.id,action.id,false);const cancelled=await actions.runNow(owner,w.id,action.id,randomUUID());await actions.cancel(owner,w.id,cancelled.id);assert.equal((await actions.status(owner,w.id,cancelled.id)).status,'cancelled');
  });
  await t.test('database changes dispatch after commit, deduplicate events and reject loops',async()=>{
   const action=await create({trigger:{kind:'database',typeId,events:['updated'],fields:['status'],becomes:{field:'status',operator:'equals',value:'Done'}},recordTypeId:typeId,fields:['name','status']});
   await save({kind:'update_record',recordId,expectedVersion:0,data:{name:'First',status:'Done',private:'Do not disclose'}});await worker(()=>dispatchAppActions(db));
   const rows=(await pg.query<any>('SELECT * FROM app_notification_batches WHERE action_id=$1',[action.id])).rows;assert.equal(rows.length,1);assert.equal((await pg.query<any>('SELECT record_id FROM app_notification_items WHERE batch_id=$1',[rows[0].id])).rows[0].record_id,recordId);await pg.query<any>('UPDATE app_actions SET next_at=now() WHERE id=$1',[action.id]);await worker(()=>dispatchAppActions(db));assert.equal((await pg.query<any>('SELECT * FROM app_notification_batches WHERE action_id=$1',[action.id])).rows.length,1);
   await assert.rejects(actions.enqueue(owner,w.id,action.id,'loop',recordId,[action.id]),/cycle/);await actions.cancel(owner,w.id,rows[0].id as string);await actions.control(owner,w.id,action.id,true);
  });
  await t.test('background LLM-shaped requests are persisted and survive a slow provider',async()=>{
   let calls=0;const c=new Connectors(db,(tx,a,w,id)=>f.component(tx,a,w,id),{transport:async r=>{calls++;assert.equal(r.timeoutMs,300000);assert.deepEqual(JSON.parse(r.body!).messages,[{role:'user',content:'Synthetic prompt'}]);await new Promise(resolve=>setTimeout(resolve,11000));return {status:200,body:'{"output":"Synthetic result","secret":"hidden"}',bytes:53,durationMs:11000};}});
   const cfg=connectorConfig.parse({name:'Synthetic LLM',baseUrl:'https://example.invalid',auth:{kind:'none'},operations:[{id:'generate',name:'Generate',method:'POST',path:'/generate',effect:'write',execution:'background',parameters:[{name:'messages',kind:'json'}],response:{fields:['output']},users:[owner.userId],apps:[app.id],aiEnabled:true}]});
   const review=await c.prepare(owner,w.id,{config:cfg}),connection=await c.confirmConfig(owner,w.id,review.reviewId,review.digest);
   const input={connectionId:connection.id,appId:app.id,appVersion:0,operation:'generate',requestKey:randomUUID(),parameters:{messages:[{role:'user',content:'Synthetic prompt'}]}},pending:any=await c.call(owner,w.id,input);assert.equal(pending.status,'review_required');const job=await c.confirmInvocation(owner,w.id,pending.reviewId,pending.digest);assert.equal(job.status,'queued');assert.equal(calls,0);
   await worker(()=>processServiceJob(db,{connector:c}));const result=await serviceJob(db,owner,w.id,job.id);assert.equal(result.status,'succeeded');assert.deepEqual(result.result.result,{output:'Synthetic result'});await worker(()=>processServiceJob(db,{connector:c}));assert.equal(calls,1);
  });
  await t.test('one-time and recurring dispatch deduplicate an occurrence',async()=>{
   for(const trigger of [{kind:'once',at:new Date(Date.now()-1000).toISOString()},{kind:'calendar',frequency:'daily',anchor:new Date().toISOString().slice(0,10),time:'09:00',timeZone:'UTC'}]){const action=await create({trigger});await pg.query('UPDATE app_actions SET next_at=now() WHERE id=$1',[action.id]);await worker(()=>dispatchAppActions(db));const rs=(await pg.query<any>('SELECT * FROM app_notification_batches WHERE action_id=$1',[action.id])).rows;assert.equal(rs.length,1);await worker(()=>dispatchAppActions(db));assert.equal((await pg.query<any>('SELECT * FROM app_notification_batches WHERE action_id=$1',[action.id])).rows.length,1);await actions.cancel(owner,w.id,rs[0].id);await actions.control(owner,w.id,action.id,true);}
  });
  await t.test('public sharing has a separate identity, bounded data, revocation and exact write reviews',async()=>{
   const draft=await sharing.prepare(owner,w.id,{appId:app.id,appVersion:0,kind:'public',mode:'edit',reviewedSource:true}),share=await sharing.confirm(owner,w.id,draft.id,draft.digest),token=share.url!.split('#')[1];
   const ctx=await sharing.publicContext(token);assert.notEqual(ctx.a.userId,owner.userId);assert.ok(!(await s.members(owner,w.id)).some(u=>u.user_id===ctx.a.userId));assert.ok(!(await f.sharingMembers(owner,w.id)).some(u=>u.id===ctx.a.userId));await withActor(ctx.a,async()=>{const read=await f.runFrontend(ctx.a,w.id,{componentId:app.id,expectedVersion:0});assert.match(read.html,/First/);assert.ok(!JSON.stringify(read).includes('Do not disclose'));await withActor({userId:ctx.a.userId,origin:'human'},()=>assert.rejects(s.records({userId:ctx.a.userId,origin:'human'},w.id,typeId,{limit:10,offset:0})));});
   const web=baseApp();addPublicAppServices(web,db,(_req,res)=>{res.sendStatus(401);});web.use(errors);
   assert.equal((await request(web).post('/public-app/call').set('X-TrialAgents-Share',token).send({name:'open'})).status,200);
   assert.equal((await request(web).post('/public-app/call').set('X-TrialAgents-Share',token).send({name:'read_project_component',args:{componentId:randomUUID()}})).status,403);
   const preview=await request(web).post('/public-app/call').set('X-TrialAgents-Share',token).send({name:'prepare_workspace_change',args:{operation:{kind:'apply_component_records',componentId:app.id,expectedVersion:0,changes:[{kind:'update_record',recordId,expectedVersion:1,data:{name:'Public update',status:'Done'}}]}}});assert.equal(preview.status,200,JSON.stringify(preview.body));
   const commit=await request(web).post('/public-app/call').set('X-TrialAgents-Share',token).send({name:'confirm_workspace_change',args:{previewId:preview.body.id,digest:preview.body.digest}});assert.equal(commit.status,200,JSON.stringify(commit.body));
   await pg.query('UPDATE workspace_components SET allowed_users=$2 WHERE id=$1',[app.id,JSON.stringify([owner.userId])]);assert.ok((await sharing.list(owner,w.id,app.id)).some(s=>s.id===share.id));await sharing.revoke(owner,w.id,share.id);await assert.rejects(sharing.publicContext(token));await pg.query('UPDATE workspace_components SET allowed_users=NULL WHERE id=$1',[app.id]);
  });
  await t.test('email invitations require possession and the matching account without broad database access',async()=>{
   const draft=await sharing.prepare(owner,w.id,{appId:app.id,appVersion:0,kind:'email',email:'invitee@example.invalid',mode:'view',reviewedSource:true}),share=await sharing.confirm(owner,w.id,draft.id,draft.digest),job=(await pg.query<any>("SELECT * FROM app_service_jobs WHERE request_key=$1",['share:'+share.id])).rows[0] as any,token=job.payload.message.text.match(/join-app#([A-Za-z0-9_-]{43})/)[1];
   await withActor(wrong,()=>assert.rejects(sharing.accept(wrong,token),/email/));await withActor(invitee,()=>sharing.accept(invitee,token));
   await withActor({...invitee,accessToolId:app.id},async()=>{assert.equal((await f.component(db,invitee,w.id,app.id)).id,app.id);await assert.rejects(s.records(invitee,w.id,typeId,{limit:10,offset:0}));});
   await sharing.revoke(owner,w.id,share.id);await withActor(invitee,()=>assert.rejects(f.component(db,invitee,w.id,app.id)));
  });
  await t.test('record-date triggers queue once for each due date after approval',async()=>{
   const table=(await save({kind:'create_type',name:'Deadlines',fields:[{key:'due',name:'Due',kind:'date'}]})).objects[0].id,date=new Date(Date.now()+86400000).toISOString().slice(0,10),rid=(await save({kind:'create_record',typeId:table,data:{due:date}})).objects[0].id;
   const draft=await f.preview(owner,w.id,{kind:'save_component',content:{name:'Deadline app',format:'frontend-js',sourceAccess:'bindings',source:'return {html:"<p>Dates</p>"};',bindings:[{typeId:table,fields:['due']}]}}),dated=await f.confirm(owner,w.id,draft.id,draft.digest),action=await create({appId:dated.id,trigger:{kind:'record_date',typeId:table,field:'due',time:'09:00',timeZone:'UTC'},recordTypeId:table,fields:['due']});
   const due=new Date(date+'T10:00:00Z');await worker(()=>dispatchAppActions(db,due));const rs=(await pg.query<any>('SELECT * FROM app_notification_batches WHERE action_id=$1',[action.id])).rows;assert.equal(rs.length,1);assert.equal((await pg.query<any>('SELECT record_id FROM app_notification_items WHERE batch_id=$1',[rs[0].id])).rows[0].record_id,rid);await worker(()=>dispatchAppActions(db,new Date(due.getTime()+60000)));assert.equal((await pg.query<any>('SELECT * FROM app_notification_batches WHERE action_id=$1',[action.id])).rows.length,1);await actions.cancel(owner,w.id,rs[0].id);await actions.control(owner,w.id,action.id,true);
  });
  await t.test('bound functions commit once and a paused action blocks its pending write',async()=>{
   const foundation=new Foundation(db),preview=await foundation.prepareFunction(owner,w.id,{name:'Mark complete',source:`const r=tools.call('records.read',{typeId:'${typeId}'}).rows.find(r=>r.id===input.recordId);tools.call('changes.propose',[{kind:'update_record',recordId:r.id,expectedVersion:r.version,data:{status:'Processed'}}]);return {processed:true};`,scope:{typeIds:[typeId],capabilities:['records.read','changes.propose'],documents:false},inputContract:{type:'object'},outputContract:{type:'object'}}),fn=await foundation.saveFunction(owner,w.id,preview.id,preview.digest),grant=await foundation.grant(owner,w.id,{revisionId:fn.revisionId,typeIds:[typeId],fields:['status'],maxChanges:1,future:true});
   const draft=await f.preview(owner,w.id,{kind:'save_component',content:{name:'Action runner',format:'frontend-js',sourceAccess:'bindings',source:'return {html:"<p>Run</p>"};',bindings:[{typeId,fields:['name','status']}],execution:[{name:'complete',revisionId:fn.revisionId,grantId:grant.id}]}}),runner=await f.confirm(owner,w.id,draft.id,draft.digest);
   const action=await create({appId:runner.id,recordTypeId:typeId,fields:['name','status'],steps:[{id:'complete',kind:'function',binding:'complete',input:{recordId:'{{recordId}}'}}]});
   const first=await actions.runNow(owner,w.id,action.id,randomUUID(),recordId);await worker(()=>processAppAction(db));await worker(()=>runFoundation(db));await worker(()=>runFoundation(db));await ready();await worker(()=>processAppAction(db));assert.equal((await actions.status(owner,w.id,first.id)).status,'succeeded');assert.equal((await f.record(db,owner,w.id,recordId)).data.status,'Processed');
   const next=await actions.runNow(owner,w.id,action.id,randomUUID(),recordId);await worker(()=>processAppAction(db));await worker(()=>runFoundation(db));await actions.control(owner,w.id,action.id,true);await worker(()=>runFoundation(db));await ready();await worker(()=>processAppAction(db));assert.equal((await actions.status(owner,w.id,next.id)).status,'failed');
  });
 });}finally{await pg.close();}
});
