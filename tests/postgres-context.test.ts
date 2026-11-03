import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {Postgres} from '../src/db/database.js';
import {withActor,withDatabaseContext,databaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppMonitoring} from '../src/app-services/monitoring.js';
import {AppActions,dispatchAppActions} from '../src/app-services/service.js';

// Exercise the production transaction adapter, not a fixture that resets context itself.
async function fixture(t:any,migrations=false){
 const pg=new PGlite();t.after(()=>pg.close());
 if(migrations){for(const n of (await readdir('migrations')).filter(n=>n.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+n,'utf8'));await pg.exec(await readFile('ops/runtime-role.sql','utf8'));}
 const db=new Postgres('postgres://unused');
 db.pool={connect:async()=>({query:async(sql:string,values?:any[])=>{const r=await pg.query(sql,values);if(sql==='BEGIN'&&migrations)await pg.exec(databaseContext().service==='worker'?'SET LOCAL ROLE trialy_worker':'SET LOCAL ROLE trialy_runtime');return r;},release(){}})} as any;
 return {pg,db};
}
test('production transactions track nested actor scopes, serialize concurrent contexts and recover after savepoints',async t=>{
 const {db}=await fixture(t),a={userId:randomUUID(),origin:'human' as const},b={userId:randomUUID(),origin:'ai' as const};
 await withActor(a,()=>db.transaction(async tx=>{
  const who=async()=> (await tx.query("SELECT current_setting('trialy.actor_id') id,current_setting('trialy.origin') origin,current_setting('trialy.tool_id') tool")).rows[0];
  assert.deepEqual(await who(),{id:a.userId,origin:'human',tool:''});
  const result=await Promise.all([withActor({...b,accessToolId:randomUUID()},who),who(),withActor(b,who)]);
  assert.equal(result[0].id,b.userId);assert.ok(result[0].tool);assert.deepEqual(result[1],{id:a.userId,origin:'human',tool:''});assert.deepEqual(result[2],{id:b.userId,origin:'ai',tool:''});
  await tx.query('SAVEPOINT context_check');await withActor(b,who);await tx.query('ROLLBACK TO SAVEPOINT context_check');assert.equal((await withActor(b,who)).id,b.userId);
  await assert.rejects(tx.query('SELECT 1/0'));await tx.query('ROLLBACK TO SAVEPOINT context_check');assert.equal((await who()).id,a.userId);
 }));
});
test('worker dispatch uses the authorizing owner through the production adapter and still fails closed after revocation',async t=>{
 const {pg,db}=await fixture(t,true),a={userId:randomUUID(),origin:'human' as const};
 await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'owner@example.invalid','Owner']);
 const s=new Service(db),f=new WorkspaceFoundation(db),actions=new AppActions(db);
 const {w,action,monitor}=await withActor(a,async()=>{
  const w=await s.createWorkspace(a,'Dispatch context');await s.setAi(a,w.id,true);
  const p=await f.preview(a,w.id,{kind:'save_component',content:{name:'Dispatch fixture',format:'frontend-js',sourceAccess:'bindings',bindings:[],source:'return {html:"<p>Fixture</p>"};'}}),app=await f.confirm(a,w.id,p.id,p.digest);
  const monitors=new AppMonitoring(db),draft=await monitors.prepare(a,w.id,{config:{name:'Research',appId:app.id,objective:'Find public updates',instructions:'Review primary sources.',sourcePolicy:'Public sources',schedule:{description:'Weekly',timeZone:'UTC'},expiresAt:new Date(Date.now()+86400000).toISOString()}}),monitor=await monitors.confirm(a,w.id,draft.id,draft.digest);
  const review=await actions.prepare(a,w.id,{config:{name:'Owner notification',appId:app.id,appVersion:0,trigger:{kind:'database',source:'automation_runs',automationId:monitor.id,automationVersion:0,events:['updated'],fields:['status'],becomes:{field:'status',operator:'equals',value:'completed'}},steps:[{id:'email',kind:'email',to:['owner@example.invalid'],subject:'Update',text:'Requested update'}],expiresAt:new Date(Date.now()+86400000).toISOString()}});
  return {w,monitor,action:await actions.confirm(a,w.id,review.id,review.digest)};
 });
 await withDatabaseContext({service:'worker'},()=>dispatchAppActions(db));
 const state=(await pg.query<any>('SELECT paused,last_error,next_at FROM app_actions WHERE id=$1',[action.id])).rows[0];
 assert.equal(state.paused,false,JSON.stringify(state));assert.ok(state.next_at);
 assert.equal((await pg.query('SELECT id FROM app_notification_batches WHERE action_id=$1',[action.id])).rows.length,0);
 const runId=randomUUID();
 await pg.query("INSERT INTO app_monitor_runs(id,workspace_id,user_id,monitor_id,monitor_version,occurrence_key,status,config_snapshot,result,finished_at) SELECT $1,workspace_id,user_id,id,version,$2,'completed',config,'{\"summary\":\"Verified report\",\"savedChanges\":0}',now() FROM app_monitors WHERE id=$3",[runId,randomUUID(),monitor.id]);
 await pg.query("INSERT INTO audit_events(id,workspace_id,tenant_id,actor_id,action,object_id,origin) SELECT $1,id,tenant_id,$2,'monitoring.finished',$3,'ai' FROM workspaces WHERE id=$4",[randomUUID(),a.userId,runId,w.id]);
 await pg.query('UPDATE app_actions SET next_at=now() WHERE id=$1',[action.id]);
 await withDatabaseContext({service:'worker'},()=>dispatchAppActions(db));
 assert.equal((await pg.query('SELECT id FROM app_notification_batches WHERE action_id=$1',[action.id])).rows.length,1);
 await withActor(a,()=>s.setAi(a,w.id,false));await pg.query('UPDATE app_actions SET next_at=now() WHERE id=$1',[action.id]);
 await withDatabaseContext({service:'worker'},()=>dispatchAppActions(db));
 assert.equal((await pg.query<any>('SELECT paused FROM app_actions WHERE id=$1',[action.id])).rows[0].paused,true);
} );

test('app deletion removes every owners automation under runtime RLS without affecting other apps',async t=>{
 const {pg,db}=await fixture(t,true),a={userId:randomUUID(),origin:'human' as const},other=randomUUID();
 for(const id of [a.userId,other])await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$1::text)',[id,id+'@example.invalid']);
 const s=new Service(db),f=new WorkspaceFoundation(db);
 const {w,app,keep}=await withActor(a,async()=>{
  const w=await s.createWorkspace(a,'Delete context');
  const create=async(name:string)=>{const p=await f.preview(a,w.id,{kind:'save_component',content:{name,format:'frontend-js',sourceAccess:'bindings',bindings:[],source:'return {html:"<p>Fixture</p>"};'}});return f.confirm(a,w.id,p.id,p.digest);};
  return {w,app:await create('Delete'),keep:await create('Keep')};
 });
 for(const appId of [app.id,keep.id])for(const userId of [a.userId,other]){
  await pg.query("INSERT INTO app_monitors(id,workspace_id,user_id,app_id,config,scope_stamp) VALUES($1,$2,$3,$4,'{}','test')",[randomUUID(),w.id,userId,appId]);
  await pg.query("INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,approved_by) VALUES($1,$2,$3,$4,'{}',$3)",[randomUUID(),w.id,userId,appId]);
 }
 await withActor(a,async()=>{const p=await f.preview(a,w.id,{kind:'archive_component',componentId:app.id,expectedVersion:0,archived:true});await f.confirm(a,w.id,p.id,p.digest);});
 for(const table of ['app_monitors','app_actions']){
  const removed=(await pg.query<any>(`SELECT * FROM ${table} WHERE app_id=$1`,[app.id])).rows;
  assert.equal(removed.length,2);assert.ok(removed.every(r=>r.deleted_at));
  const retained=(await pg.query<any>(`SELECT * FROM ${table} WHERE app_id=$1`,[keep.id])).rows;
  assert.ok(retained.every(r=>!r.deleted_at));
 }
 await assert.rejects(pg.query('UPDATE app_monitors SET enabled=true,deleted_at=NULL WHERE app_id=$1',[app.id]),/deleted_monitor_disabled/);
 await assert.rejects(pg.query('UPDATE app_actions SET paused=false,deleted_at=NULL WHERE app_id=$1',[app.id]),/deleted_action_paused/);
});
