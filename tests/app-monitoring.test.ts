import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {AsyncLocalStorage} from 'node:async_hooks';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,setDatabaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppMonitoring} from '../src/app-services/monitoring.js';
import {monitoringConfig} from '../src/app-services/monitoring-schema.js';
import {readTrackerDesign} from '../src/server/tracker-design.js';
import type {Actor} from '../src/shared/schema.js';

test('monitoring is optional, independent of templates and guarded by production permissions',async t=>{
 const pg=new PGlite();for(const name of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+name,'utf8'));await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();const db:Database={query:async(s,v)=>{const tx=storage.getStore();return tx?tx.query(s,v):db.transaction(t=>t.query(s,v));},transaction:async fn=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async raw=>{await raw.exec('SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(s,v)=>{await setDatabaseContext(raw as any);return raw.query(s,v) as any;}};return storage.run(tx,()=>fn(tx));});},close:()=>pg.close()};
 const owner:Actor={userId:randomUUID(),origin:'human'},other:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...owner,origin:'ai'};
 for(const a of [owner,other])await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,a.userId+'@example.invalid','Synthetic']);
 const s=new Service(db),f=new WorkspaceFoundation(db),m=new AppMonitoring(db);
 try{await withActor(owner,async()=>{
  const w=await s.createWorkspace(owner,'Monitoring tests');await s.setAi(owner,w.id,true);
  const save=async(op:any)=>{const p=await s.preview(owner,w.id,op);return s.commit(owner,p.id,p.digest);},change=async(op:any)=>{const p=await f.preview(owner,w.id,op);return f.confirm(owner,w.id,p.id,p.digest);};
  const project=await change({kind:'create_node',nodeKind:'project',name:'Existing project'});
  const empty=await change({kind:'save_component',projectId:project.id,content:{name:'Independent calculator',format:'frontend-js',sourceAccess:'bindings',source:'return {html:"<p>42</p>"};',bindings:[]}});
  const original=JSON.stringify((await pg.query('SELECT * FROM workspace_components WHERE id=$1',[empty.id])).rows[0]);
  const table=(await save({kind:'create_type',name:'Evidence',fields:[{key:'name',name:'Name',kind:'text'},{key:'url',name:'Source',kind:'text'},{key:'notes',name:'Notes',kind:'text'},{key:'secret',name:'Private',kind:'text',ai:false}]})).objects[0].id;
  const rid=(await save({kind:'create_record',typeId:table,data:{name:'Existing',url:'https://example.org/first',notes:'Outside monitor reads',secret:'Never disclose'}})).objects[0].id;
  const expiry=new Date(Date.now()+86400000).toISOString();
  const config=(extra:any={})=>monitoringConfig.parse({name:'Optional research',appId:empty.id,objective:'Collect eligible source-backed signals',instructions:'Read current evidence, find relevant changes, deduplicate and summarize.',sourcePolicy:'Primary public sources only; flag uncertainty.',schedule:{description:'Every weekday morning',timeZone:'Europe/Berlin'},expiresAt:expiry,...extra});
  const create=async(extra:any={})=>{const p=await m.prepare(owner,w.id,{config:config(extra)});return m.confirm(owner,w.id,p.id,p.digest);};
  const start=async(id:string,key=randomUUID(),version=0)=>withActor(ai,()=>m.start(ai,w.id,{monitorId:id,expectedVersion:version,occurrenceKey:key}));
  let readOnly:any,writer:any,scope:any;
  await t.test('empty custom apps attach only through exact approval; no schema or source changes',async()=>{
   assert.deepEqual((await m.list(owner,w.id,empty.id)).rows,[]);
   const draft=await m.prepare(owner,w.id,{config:config()});assert.equal((await m.list(owner,w.id,empty.id)).rows.length,0);
   await withActor(ai,()=>assert.rejects(m.confirm(ai,w.id,draft.id,draft.digest),/approve/));await assert.rejects(m.confirm(owner,w.id,draft.id,'0'.repeat(64)),/changed/);
   readOnly=await m.confirm(owner,w.id,draft.id,draft.digest);assert.deepEqual(await m.confirm(owner,w.id,draft.id,draft.digest),readOnly);assert.equal(readOnly.taskCreated,false);
   assert.equal(JSON.stringify((await pg.query('SELECT * FROM workspace_components WHERE id=$1',[empty.id])).rows[0]),original);
   assert.equal((await m.read(ai,w.id,readOnly.id)).context.schemas.length,0);assert.equal((await m.read(ai,w.id,readOnly.id)).taskStatus,'not_observed');
   await withActor(other,()=>assert.rejects(m.read(other,w.id,readOnly.id)));
   await withActor(other,async()=>assert.equal((await db.query('SELECT id FROM app_monitors')).rows.length,0));
  });
  await t.test('read-only cycles record honest results, coverage and occurrence retries',async()=>{
   const key=randomUUID(),run=await start(readOnly.id,key);assert.equal((await start(readOnly.id,key)).id,run.id);await assert.rejects(start(readOnly.id),/progress/);
   await assert.rejects(m.records(ai,w.id,run.id,table),/outside/);
   const outcome={runId:run.id,status:'no_update',summary:'No relevant events found in the sources checked.',coverage:{through:new Date(Date.now()-1000).toISOString(),notes:'Reviewed the configured public sources.'}};
   const result=await m.finish(ai,w.id,outcome);assert.equal(result.savedChanges,0);assert.equal((await m.finish(ai,w.id,outcome)).replayed,true);assert.equal((await start(readOnly.id,key)).status,'no_update');
   await assert.rejects(m.finish(ai,w.id,{...outcome,summary:'Different final result'}),/finished/);
   assert.ok((await m.read(owner,w.id,readOnly.id)).coverage_through);
   await assert.rejects(db.query("UPDATE app_monitor_runs SET status='running' WHERE id=$1",[run.id]),/immutable/);
  });
  await t.test('task associations are idempotent metadata and never claim to create or control the host task',async()=>{
   const input={monitorId:readOnly.id,expectedVersion:0,taskId:'synthetic-task',schedule:'BEGIN:VEVENT\nRRULE:FREQ=DAILY\nEND:VEVENT',timeZone:'Europe/Berlin',timingMode:'flexible_schedule'};
   assert.equal((await m.link(ai,w.id,input)).taskStatus,'not_observed');await m.link(ai,w.id,input);
   const second=await create({name:'Another objective'});await assert.rejects(m.link(ai,w.id,{...input,monitorId:second.id}),/already/);
   await assert.rejects(m.link(ai,w.id,{...input,timeZone:'UTC'}),/timezone/);
  });
  await t.test('explicit reads and pre-existing single-table write scopes preserve field boundaries',async()=>{
   const body={autoWrite:true,expiresAt:expiry,projectId:project.id,purpose:'Evidence collection',inclusionCriteria:'Eligible signals',sourcePolicy:'Primary sources',basis:'tracking',bindings:[{typeId:table,fields:['name','url']}],allowCreate:true,allowUpdate:true,maxChanges:5};
   scope=await change({kind:'save_scope',scope:body});
   writer=await create({name:'Bound evidence collection',readBindings:[{typeId:table,fields:['name','url']}],writeScopes:[{scopeId:scope.id,version:0}],maxChangesPerRun:2});
   await assert.rejects(create({readBindings:[{typeId:table,fields:['secret']}]}),/unavailable/);
   const run=await start(writer.id),page=await m.records(ai,w.id,run.id,table);assert.equal(page.rows[0].id,rid);assert.deepEqual(Object.keys(page.rows[0].data).sort(),['name','url']);assert.equal(page.nextOffset,null);
   const batch={scopeId:scope.id,expectedScopeVersion:0,requestKey:randomUUID(),sourceLabel:'https://example.org/new',interpretation:'Confirmed relevant event',changes:[{kind:'create_record',typeId:table,data:{name:'New signal',url:'https://example.org/new'}}]};
   const receipt=await withActor(ai,()=>f.maintain(ai,w.id,batch,undefined,false,run.id));assert.equal(receipt.status,'saved');assert.deepEqual(await withActor(ai,()=>f.maintain(ai,w.id,batch,undefined,false,run.id)),receipt);
   const recovered=await m.readRun(ai,w.id,run.id);assert.equal(recovered.status,'running');assert.equal(recovered.receipts[0].request_key,batch.requestKey);assert.deepEqual(recovered.receipts[0].record_ids,receipt.recordIds);
   await assert.rejects(withActor(ai,()=>f.maintain(ai,w.id,{...batch,interpretation:'Changed payload'},undefined,false,run.id)),/match/);
   await assert.rejects(withActor(ai,()=>f.maintain(ai,w.id,{...batch,requestKey:randomUUID(),changes:[...batch.changes,...batch.changes]},undefined,false,run.id)),/limit/);
   await assert.rejects(m.finish(ai,w.id,{runId:run.id,status:'no_update',summary:'Nothing changed'}),/saved changes/);
   const result=await m.finish(ai,w.id,{runId:run.id,status:'completed',summary:'One new signal saved.',sources:[{url:'https://example.org/new',title:'Primary announcement'}]});assert.equal(result.savedChanges,1);assert.deepEqual(result.receiptIds,[batch.requestKey]);
   const next=await start(writer.id);await assert.rejects(withActor(ai,()=>f.maintain(ai,w.id,batch,undefined,false,next.id)),/another/);await m.finish(ai,w.id,{runId:next.id,status:'blocked',summary:'Stopped duplicate write attempt.'});
  });
  await t.test('disable stops in-flight operations without touching apps or reusable grants',async()=>{
   const run=await start(writer.id),before=JSON.stringify((await pg.query('SELECT * FROM maintenance_scopes WHERE id=$1',[scope.id])).rows[0]);
   const result=await m.control(owner,w.id,writer.id,0,false);assert.equal(result.hostTaskChanged,false);await assert.rejects(m.records(ai,w.id,run.id,table),/stopped/);await assert.rejects(start(writer.id),/current/);
   assert.equal((await m.read(ai,w.id,writer.id)).availability,'disabled');assert.equal((await m.read(ai,w.id,writer.id)).config,undefined);
   assert.equal(JSON.stringify((await pg.query('SELECT * FROM maintenance_scopes WHERE id=$1',[scope.id])).rows[0]),before);assert.equal(JSON.stringify((await pg.query('SELECT * FROM workspace_components WHERE id=$1',[empty.id])).rows[0]),original);
   await m.control(owner,w.id,writer.id,0,true);assert.equal((await m.read(ai,w.id,writer.id)).availability,'ready');
  });
  await t.test('configuration revisions stop old runs, retain task association and require schedule reconciliation',async()=>{
   const occurrenceKey=randomUUID(),run=await start(readOnly.id,occurrenceKey),p=await m.prepare(owner,w.id,{monitorId:readOnly.id,expectedVersion:0,config:config({objective:'Refined objective'})}),changed=await m.confirm(owner,w.id,p.id,p.digest);assert.equal(changed.version,1);
   const read=await m.read(owner,w.id,readOnly.id);assert.equal(read.task.id,'synthetic-task');assert.equal(read.scheduleNeedsSync,true);assert.equal(read.coverage_through,null);assert.equal((await start(readOnly.id,occurrenceKey,1)).status,'cancelled');
   await assert.rejects(m.finish(ai,w.id,{runId:run.id,status:'completed',summary:'Old configuration result'}),/finished/);
   const next=await start(readOnly.id,randomUUID(),1);await assert.rejects(m.finish(ai,w.id,{runId:next.id,status:'partial',summary:'Incomplete',coverage:{through:new Date().toISOString(),notes:'Gaps'}}));await m.finish(ai,w.id,{runId:next.id,status:'partial',summary:'Source unavailable; no coverage advanced.'});
  });
  await t.test('compatible app publication does not invalidate the separate monitoring configuration',async()=>{
   await change({kind:'save_component',componentId:empty.id,expectedVersion:0,projectId:project.id,content:{name:'Independent calculator',format:'frontend-js',sourceAccess:'bindings',source:'return {html:"<p>43</p>"};',bindings:[]}});
   assert.equal((await m.read(ai,w.id,writer.id)).availability,'ready');const run=await start(writer.id);await m.finish(ai,w.id,{runId:run.id,status:'no_update',summary:'No new signals.'});
  });
  await t.test('revoked or expired permissions stop writes and withhold historical result bodies',async()=>{
   const run=await start(writer.id);await f.revoke(owner,w.id,scope.id);await assert.rejects(m.records(ai,w.id,run.id,table),/permission/);assert.equal((await m.read(ai,w.id,writer.id)).availability,'authorization_required');
   const history=await m.runs(ai,w.id,writer.id);assert.ok(history.rows.every(r=>r.result===null&&r.resultWithheld));await m.finish(ai,w.id,{runId:run.id,status:'blocked',summary:'Permission revoked; no more work performed.'});
   const expiryMonitor=await create({maxRunsPerDay:1}),first=await start(expiryMonitor.id);await m.finish(ai,w.id,{runId:first.id,status:'no_update',summary:'No update.'});await assert.rejects(start(expiryMonitor.id),/limit/);
   await pg.query("UPDATE app_monitors SET config=jsonb_set(config,'{expiresAt}',to_jsonb($2::text)) WHERE id=$1",[expiryMonitor.id,new Date(Date.now()-1000).toISOString()]);await assert.rejects(start(expiryMonitor.id),/expired/);
  });
  await t.test('schema changes between preparation and approval cannot silently broaden monitoring',async()=>{
   const draft=await m.prepare(owner,w.id,{config:config({readBindings:[{typeId:table,fields:['name']}]})});
   await save({kind:'update_type',typeId:table,expectedVersion:0,name:'Evidence',fields:[{key:'name',name:'Reinterpreted field',kind:'text'},{key:'url',name:'Source',kind:'text'},{key:'notes',name:'Notes',kind:'text'},{key:'secret',name:'Private',kind:'text',ai:false}]});
   await assert.rejects(m.confirm(owner,w.id,draft.id,draft.digest),/changed/);
   const guide=await readTrackerDesign({resource:'monitoring'});assert.match(guide.text,/ANY saved app/);assert.match(guide.text,/read_app_monitor_records/);
  });
 });}finally{await pg.close();}
});
