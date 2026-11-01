import {dispatchNotificationBatch,reserveNotification} from '../src/app-services/notifications.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {AsyncLocalStorage} from 'node:async_hooks';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,withDatabaseContext,setDatabaseContext,databaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppActions,dispatchAppActions} from '../src/app-services/service.js';
import {AppSharing} from '../src/app-services/sharing.js';
import {processServiceJob} from '../src/app-services/jobs.js';
import {actionConfig} from '../src/app-services/schema.js';
import {type Actor} from '../src/shared/schema.js';

test('notification guardrails use production roles and mocked delivery',async t=>{
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

  const tenant=(await pg.query<any>('SELECT tenant_id FROM workspaces WHERE id=$1',[w.id])).rows[0].tenant_id;
  const readyNotifications=async()=>pg.query("UPDATE app_notification_batches SET not_before=now() WHERE status IN ('collecting','sending')");
  const notify=async()=>{await readyNotifications();await worker(()=>dispatchNotificationBatch(db));};
  const clear=async()=>{await pg.query("UPDATE app_actions SET paused=true");await pg.query("UPDATE app_notification_batches SET status='cancelled' WHERE status IN ('collecting','sending')");await pg.query("UPDATE app_service_jobs SET status='cancelled',finished_at=now() WHERE status IN ('queued','running')");await pg.query('UPDATE app_notification_reservations SET released=true');};
  const dbConfig=(overrides:any={})=>({trigger:{kind:'database',typeId,events:['created','updated'],fields:['status'],becomes:{field:'status',operator:'equals',value:'Ready'}},recordTypeId:typeId,fields:['name','status'],steps:[{id:'notify',kind:'email',to:['owner@example.invalid'],subject:'Ready',text:'Review {{record.name}}'}],...overrides});
  const tick=async(actionId:string)=>{await pg.query('UPDATE app_actions SET next_at=now() WHERE id=$1',[actionId]);await worker(()=>dispatchAppActions(db));};
  await t.test('1,000 committed updates coalesce to one notification and one recipient delivery',async()=>{
   const a=await create(dbConfig({maxRunsPerDay:1}));
   await pg.query(`WITH inserted AS (INSERT INTO records(id,type_id,workspace_id,data) SELECT gen_random_uuid(),$1::uuid,$2::uuid,jsonb_build_object('name','Lead '||i,'status','Ready') FROM generate_series(1,1000) i RETURNING id)
    INSERT INTO audit_events(id,workspace_id,tenant_id,actor_id,action,object_id,origin,before_value,after_value) SELECT gen_random_uuid(),$2::uuid,$3::uuid,$4::uuid,'record.updated',id,'ai','{"data":{"status":"Pending"}}','{"data":{"status":"Ready"}}' FROM inserted`,[typeId,w.id,tenant,owner.userId]);
   for(let i=0;i<11;i++)await tick(a.id);
   const batches=(await pg.query<any>('SELECT * FROM app_notification_batches WHERE action_id=$1',[a.id])).rows;assert.equal(batches.length,1);
   assert.equal((await pg.query<any>('SELECT count(*)::int n FROM app_notification_items WHERE batch_id=$1',[batches[0].id])).rows[0].n,1000);
   assert.equal((await pg.query<any>('SELECT paused FROM app_actions WHERE id=$1',[a.id])).rows[0].paused,false);
   await worker(()=>dispatchNotificationBatch(db));assert.equal((await pg.query<any>('SELECT count(*)::int n FROM app_service_jobs')).rows[0].n,0,'settling delay must apply');
   await notify();let sends=0;await worker(()=>processServiceJob(db,{email:async msg=>{sends++;assert.deepEqual(msg.to,['owner@example.invalid']);assert.match(msg.text,/1000 items/);assert.ok(msg.text.includes(`/apps/${app.id}?workspaceId=${w.id}`));return {id:'bulk-provider'};}}));assert.equal(sends,1);
   await notify();assert.equal((await actions.status(owner,w.id,batches[0].id)).status,'succeeded');
   await tick(a.id);assert.equal((await pg.query<any>('SELECT count(*)::int n FROM app_notification_batches WHERE action_id=$1',[a.id])).rows[0].n,1);await clear();
  });
  await t.test('daily/interval and recipient restrictions cannot be bypassed by MCP configuration',async()=>{
   assert.throws(()=>config({trigger:{kind:'interval',minutes:1}}),/daily/);
   assert.throws(()=>config({steps:[{id:'one',kind:'email',to:['owner@example.invalid'],subject:'One',text:'One'},{id:'two',kind:'email',to:['owner@example.invalid'],subject:'Two',text:'Two'}]}),/separate/);
   await assert.rejects(create({steps:[{id:'notify',kind:'email',to:['stranger@example.invalid'],subject:'No',text:'No'}]}),/registered team member/);
   assert.equal((await db.query('SELECT * FROM app_notification_reservations')).rows.length,0,'Global recipient activity must remain private');
  });
  await t.test('meaningful edits restart settling; unrelated edits do not; reversed conditions cancel',async()=>{
   const a=await create(dbConfig());const id=(await save({kind:'create_record',typeId,data:{name:'Original',status:'Ready'}})).objects[0].id;await tick(a.id);
   const batch=(await pg.query<any>('SELECT * FROM app_notification_batches WHERE action_id=$1',[a.id])).rows[0];
   await save({kind:'update_record',recordId:id,expectedVersion:0,data:{name:'Changed',status:'Ready'}});await notify();assert.ok(Date.parse((await pg.query<any>('SELECT not_before FROM app_notification_batches WHERE id=$1',[batch.id])).rows[0].not_before)>Date.now());
   await save({kind:'update_record',recordId:id,expectedVersion:1,data:{name:'Changed',status:'Ready',private:'Unrelated'}});await notify();assert.equal((await pg.query<any>('SELECT count(*)::int n FROM app_service_jobs WHERE payload->\'notification\'->>\'batchId\'=$1',[batch.id])).rows[0].n,1);
   await save({kind:'update_record',recordId:id,expectedVersion:2,data:{name:'Changed',status:'Done'}});let sends=0;await worker(()=>processServiceJob(db,{email:async()=>{sends++;return {id:'must-not-send'};}}));assert.equal(sends,0);await notify();assert.equal((await actions.status(owner,w.id,batch.id)).status,'cancelled');await clear();
  });
  await t.test('archive and paused approval invalidate queued messages',async()=>{
   const a=await create(dbConfig());const id=(await save({kind:'create_record',typeId,data:{name:'Archive me',status:'Ready'}})).objects[0].id;await tick(a.id);await notify();await pg.query("UPDATE records SET state='archived' WHERE id=$1",[id]);
   let sends=0;await worker(()=>processServiceJob(db,{email:async()=>{sends++;return {id:'no'};}}));assert.equal(sends,0);await clear();
   const manual=await create(),r=await actions.runNow(owner,w.id,manual.id,randomUUID());await notify();await actions.control(owner,w.id,manual.id,true);await worker(()=>processServiceJob(db,{email:async()=>{sends++;return {id:'no'};}}));assert.equal(sends,0);await clear();
  });
  await t.test('recipient permission revocation cancels delivery and releases unused allowance',async()=>{
   const preview=await sharing.prepare(owner,w.id,{appId:app.id,appVersion:0,kind:'email',email:'invitee@example.invalid',mode:'view',reviewedSource:true}),share=await sharing.confirm(owner,w.id,preview.id,preview.digest);
   const invitation=(await pg.query<any>('SELECT * FROM app_service_jobs WHERE request_key=$1',['share:'+share.id])).rows[0];
   const token=invitation.payload.message.text.match(/join-app#([A-Za-z0-9_-]{43})/)[1];await withActor(invitee,()=>sharing.accept(invitee,token));
   await pg.query("UPDATE app_service_jobs SET status='cancelled' WHERE id=$1",[invitation.id]);
   const action=await create({steps:[{id:'notify',kind:'email',to:['invitee@example.invalid'],subject:'Review',text:'Review your app'}]});await actions.runNow(owner,w.id,action.id,randomUUID());await notify();
   await sharing.revoke(owner,w.id,share.id);let sends=0;await worker(()=>processServiceJob(db,{email:async()=>{sends++;return {id:'no'};}}));assert.equal(sends,0);
   assert.equal((await pg.query<any>('SELECT count(*)::int n FROM app_notification_reservations WHERE NOT released')).rows[0].n,0);await clear();
  });
  await t.test('an old worker cannot claim guarded jobs during a rolling deploy',async()=>{
   const action=await create();await actions.runNow(owner,w.id,action.id,randomUUID());await notify();
   await assert.rejects(worker(()=>db.query("UPDATE app_service_jobs SET status='running' WHERE status='queued'")),/worker upgrade required/);
   const job=(await pg.query<any>("SELECT * FROM app_service_jobs WHERE status='queued'")).rows[0];
   const legacy={...job.payload};delete legacy.notification;
   await assert.rejects(worker(()=>db.query("INSERT INTO app_service_jobs(id,workspace_id,user_id,app_id,kind,request_key,digest,payload,deadline_at) VALUES($1,$2,$3,$4,'email',$5,$6,$7,now()+interval '1 day')",[randomUUID(),w.id,owner.userId,app.id,randomUUID(),'legacy',JSON.stringify(legacy)])),/policy required/);await clear();
  });
  await t.test('changed queued content settles again before a fresh, unattempted delivery',async()=>{
   const a=await create(dbConfig()),id=(await save({kind:'create_record',typeId,data:{name:'Before',status:'Ready'}})).objects[0].id;await tick(a.id);await notify();
   await save({kind:'update_record',recordId:id,expectedVersion:0,data:{name:'After',status:'Ready'}});let sends=0;
   const email=async(msg:any)=>{sends++;assert.match(msg.text,/After/);return {id:'fresh'};};
   await worker(()=>processServiceJob(db,{email}));assert.equal(sends,0);
   await notify();await notify();await notify();await worker(()=>processServiceJob(db,{email}));assert.equal(sends,1);await clear();
  });
  await t.test('malformed templates fail visibly without reserving quota forever',async()=>{
   const a=await create({steps:[{id:'notify',kind:'email',to:['owner@example.invalid'],subject:'Review',text:'{{steps.missing.result}}'}]}),r=await actions.runNow(owner,w.id,a.id,randomUUID());await notify();
   assert.equal((await actions.status(owner,w.id,r.id)).status,'failed');assert.equal((await pg.query<any>('SELECT count(*)::int n FROM app_notification_reservations WHERE NOT released')).rows[0].n,0);await clear();
  });
  await t.test('queue capacity includes other authorizing users and stops abnormal growth',async()=>{
   const a=await create();await pg.query("INSERT INTO app_notification_batches(id,workspace_id,tenant_id,user_id,app_id,action_id,action_version) SELECT gen_random_uuid(),$1,$2,$3,$4,$5,i FROM generate_series(1,100) i",[w.id,tenant,invitee.userId,app.id,a.id]);
   assert.equal((await db.query('SELECT trialy_security.notification_capacity($1) available',[tenant])).rows[0].available,false);
   const r=await actions.runNow(owner,w.id,a.id,randomUUID());assert.equal(r.status,'blocked');assert.equal((await pg.query<any>('SELECT paused FROM app_actions WHERE id=$1',[a.id])).rows[0].paused,true);await clear();
  });
  await t.test('global hourly reservations serialize competing apps/accounts; account limit counts recipients',async()=>{
   const tenant2=randomUUID();await pg.query('INSERT INTO tenants(id,name) VALUES($1,$2)',[tenant2,'Other account']);
   const attempts=await Promise.all([worker(()=>reserveNotification(db,tenant,'shared@example.invalid',randomUUID())),worker(()=>reserveNotification(db,tenant2,'shared@example.invalid',randomUUID()))]);assert.equal(attempts.filter(v=>v.allowed).length,1);
   await pg.query('UPDATE app_notification_reservations SET released=true');
   for(let i=0;i<15;i++)assert.equal((await worker(()=>reserveNotification(db,tenant,`member${i}@example.invalid`,randomUUID()))).allowed,true);
   assert.equal((await worker(()=>reserveNotification(db,tenant,'member16@example.invalid',randomUUID()))).allowed,false);await clear();
  });
  await t.test('calendar allowance applies once per local day even after an hour',async()=>{
   const a=await create();const calendar={actionId:a.id,trigger:{kind:'calendar',frequency:'daily',anchor:'2026-01-01',time:'09:00',timeZone:'Europe/Berlin',interval:1,weekdays:[1],monthDay:1,monthEnd:'last_day'} as any};
   assert.equal((await worker(()=>reserveNotification(db,tenant,'owner@example.invalid',randomUUID(),false,calendar))).allowed,true);
   await pg.query("UPDATE app_notification_reservations SET reserved_at=now()-interval '2 hours'");assert.equal((await worker(()=>reserveNotification(db,tenant,'owner@example.invalid',randomUUID(),false,calendar))).allowed,false);await clear();
  });
  await t.test('ordinary allowance exhaustion defers a live rule without losing pending items',async()=>{
   await worker(()=>reserveNotification(db,tenant,'owner@example.invalid',randomUUID()));const a=await create();const r=await actions.runNow(owner,w.id,a.id,randomUUID());await notify();assert.equal((await actions.status(owner,w.id,r.id)).status,'queued');assert.equal((await pg.query<any>('SELECT paused FROM app_actions WHERE id=$1',[a.id])).rows[0].paused,false);assert.ok((await pg.query<any>('SELECT * FROM app_notification_items WHERE batch_id=$1',[r.id])).rows.length);await clear();
  });
  await t.test('lost provider response retries the same immutable email and reservation once',async()=>{
   const a=await create(),key=randomUUID(),r=await actions.runNow(owner,w.id,a.id,key);assert.equal((await actions.runNow(owner,w.id,a.id,key)).id,r.id);await notify();let calls=0;const keys=new Set();const email=async(_msg:any,key:string)=>{keys.add(key);if(++calls===1)throw Error('response lost');return {id:'deduplicated-provider-id'};};
   await worker(()=>processServiceJob(db,{email}));await pg.query("UPDATE app_service_jobs SET available_at=now() WHERE status='queued'");await worker(()=>processServiceJob(db,{email}));assert.equal(calls,2);assert.equal(keys.size,1);assert.equal((await pg.query<any>('SELECT count(*)::int n FROM app_notification_reservations WHERE NOT released')).rows[0].n,1);await notify();assert.equal((await actions.status(owner,w.id,r.id)).status,'succeeded');await clear();
  });
  await t.test('a long pause preserves unattempted work beyond the provider retry window',async()=>{
   const a=await create();await actions.runNow(owner,w.id,a.id,randomUUID());await notify();let sends=0;
   const email=async()=>{sends++;return {id:'after-pause'};},realNow=Date.now;
   Date.now=()=>realNow()+86400000;try{await worker(()=>processServiceJob(db,{email}));assert.equal(sends,0);}finally{Date.now=realNow;}
   await notify();await notify();await worker(()=>processServiceJob(db,{email}));assert.equal(sends,1);await clear();
  });
  await t.test('emergency stop applies to already queued app email, without cancelling work',async()=>{
   const a=await create(),r=await actions.runNow(owner,w.id,a.id,randomUUID());await notify();process.env.APP_NOTIFICATION_EMAILS_ENABLED='false';let sends=0;try{await worker(()=>processServiceJob(db,{email:async()=>{sends++;return {id:'no'};}}));assert.equal(sends,0);assert.equal((await actions.status(owner,w.id,r.id)).status,'waiting');}finally{delete process.env.APP_NOTIFICATION_EMAILS_ENABLED;}await clear();
  });
 });}finally{await pg.close();}
});
