import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {AsyncLocalStorage} from 'node:async_hooks';
import {PGlite} from '@electric-sql/pglite';
import {withActor,setDatabaseContext} from '../src/db/context.js';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
test('app deletion cleans only unused empty fields and dependent workflows under runtime RLS',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());for(const n of (await readdir('migrations')).filter(x=>x.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+n,'utf8'));await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();const db:Database={query:async(q,v)=>storage.getStore()?.query(q,v)??db.transaction(tx=>tx.query(q,v)),transaction:async fn=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async raw=>{await raw.exec('SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(q,v)=>{await setDatabaseContext(raw as any);return raw.query(q,v) as any;}};return storage.run(tx,()=>fn(tx));});},close:()=>pg.close()};
 const a={userId:randomUUID(),origin:'human' as const},other=randomUUID();for(const id of [a.userId,other])await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[id,id+'@example.invalid','Cleanup']);
 await withActor(a,async()=>{
  const s=new Service(db),f=new WorkspaceFoundation(db),w=await s.createWorkspace(a,'Cleanup'),project={id:randomUUID()};await pg.query("INSERT INTO workspace_nodes(id,workspace_id,name,kind) VALUES($1,$2,'Apps','project')",[project.id,w.id]);
  const createTable=async(name:string,keys:string[])=>{const p=await s.preview(a,w.id,{kind:'create_type',name,fields:keys.map(key=>({key,name:key,kind:key==='zero'?'number':key==='false'?'boolean':'text',ai:true}))});return (await s.commit(a,p.id,p.digest)).objects[0].id;};
  const createApp=async(name:string,typeId:string,keys:string[])=>{const id=randomUUID();await pg.query("INSERT INTO workspace_components(id,workspace_id,project_id,name,format,source,bindings,source_access,created_by) VALUES($1,$2,$3,$4,'frontend-js','return {html:\"<h1>App</h1>\"};',$5,'bindings',$6)",[id,w.id,project.id,name,JSON.stringify([{typeId,fields:keys}]),a.userId]);return id;};
  const save=async(op:any)=>{const p=await f.preview(a,w.id,op);return f.confirm(a,w.id,p.id,p.digest);};
  const keys=['empty','blank','array','populated','zero','false','archived','shared'];const type=await createTable('Mixed fields',keys),app=await createApp('Delete me',type,keys),shared=await createApp('Restricted shared app',type,['shared']);
  await pg.query('UPDATE workspace_components SET ai_enabled=false WHERE id=$1',[shared]);
  await pg.query('INSERT INTO records(id,workspace_id,type_id,data) VALUES($1,$2,$3,$4)',[randomUUID(),w.id,type,JSON.stringify({empty:null,blank:'',array:[],populated:'Keep this',zero:0,false:false})]);
  await pg.query("INSERT INTO records(id,workspace_id,type_id,data,state) VALUES($1,$2,$3,$4,'archived')",[randomUUID(),w.id,type,JSON.stringify({archived:'Archived value'})]);
  const monitor=randomUUID(),action=randomUUID();
  await pg.query("INSERT INTO app_monitors(id,workspace_id,user_id,app_id,config,scope_stamp) VALUES($1,$2,$3,$4,'{}','stamp')",[monitor,w.id,other,app]);
  await pg.query("INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,approved_by) VALUES($1,$2,$3,$4,'{}',$3)",[action,w.id,other,app]);
  await save({kind:'archive_component',componentId:app,expectedVersion:0,archived:true});
  assert.deepEqual((await pg.query<any>('SELECT fields FROM entity_types WHERE id=$1',[type])).rows[0].fields.map((f:any)=>f.key),['populated','zero','false','archived','shared']);
  assert.equal((await pg.query<any>('SELECT count(*)::int n FROM records WHERE type_id=$1',[type])).rows[0].n,2);
  assert.ok((await pg.query<any>('SELECT deleted_at FROM app_monitors WHERE id=$1',[monitor])).rows[0].deleted_at);assert.ok((await pg.query<any>('SELECT deleted_at FROM app_actions WHERE id=$1',[action])).rows[0].deleted_at);
  assert.equal((await pg.query<any>("SELECT count(*)::int n FROM audit_events WHERE action='app.empty_fields_removed' AND object_id=$1",[type])).rows[0].n,1);
  assert.equal((await pg.query<any>("SELECT count(*)::int n FROM revisions WHERE object_kind='type' AND object_id=$1 AND version=1",[type])).rows[0].n,1);

  const partialType=await createTable('Partial',['keep','remove']),partial=await createApp('Partial',partialType,['keep','remove']),affected=randomUUID(),unaffected=randomUUID(),followup=randomUUID();
  for(const [id,field] of [[affected,'remove'],[unaffected,'keep']])await pg.query('INSERT INTO app_monitors(id,workspace_id,user_id,app_id,config,scope_stamp) VALUES($1,$2,$3,$4,$5,$6)',[id,w.id,other,partial,JSON.stringify({readBindings:[{typeId:partialType,fields:[field]}]}),'stamp']);
  await pg.query('INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,approved_by) VALUES($1,$2,$3,$4,$5,$3)',[followup,w.id,other,partial,JSON.stringify({trigger:{source:'automation_runs',automationId:affected}})]);
  const run=randomUUID(),job=randomUUID();await pg.query("INSERT INTO app_service_jobs(id,workspace_id,user_id,app_id,kind,request_key,digest,payload,deadline_at) VALUES($1,$2,$3,$4,'email','cleanup-job','digest','{}',now()+interval '1 day')",[job,w.id,other,partial]);
  await pg.query("INSERT INTO app_action_runs(id,workspace_id,user_id,action_id,action_version,occurrence,pending_job) VALUES($1,$2,$3,$4,0,'cleanup-run',$5)",[run,w.id,other,followup,job]);
  await save({kind:'save_component',componentId:partial,expectedVersion:0,projectId:project.id,content:{name:'Partial',format:'frontend-js',source:'return {html:"<h1>Partial</h1>"};',sourceAccess:'bindings',bindings:[{typeId:partialType,fields:['keep']}]}});
  assert.ok((await pg.query<any>('SELECT deleted_at FROM app_monitors WHERE id=$1',[affected])).rows[0].deleted_at);assert.equal((await pg.query<any>('SELECT deleted_at FROM app_monitors WHERE id=$1',[unaffected])).rows[0].deleted_at,null);assert.ok((await pg.query<any>('SELECT deleted_at FROM app_actions WHERE id=$1',[followup])).rows[0].deleted_at);
  assert.equal((await pg.query<any>('SELECT status FROM app_service_jobs WHERE id=$1',[job])).rows[0].status,'cancelled');assert.equal((await pg.query<any>('SELECT status FROM app_action_runs WHERE id=$1',[run])).rows[0].status,'cancelled');
  assert.deepEqual((await pg.query<any>('SELECT fields FROM entity_types WHERE id=$1',[partialType])).rows[0].fields.map((f:any)=>f.key),['keep']);
  const empty=await createTable('Empty app',['empty']),emptyApp=await createApp('Empty app',empty,['empty']);await save({kind:'archive_component',componentId:emptyApp,expectedVersion:0,archived:true});assert.deepEqual((await pg.query<any>('SELECT fields FROM entity_types WHERE id=$1',[empty])).rows[0].fields,[]);
  const rollbackType=await createTable('Rollback',['empty']),rollbackApp=await createApp('Rollback',rollbackType,['empty']);
  await assert.rejects(()=>db.transaction(async()=>{await save({kind:'archive_component',componentId:rollbackApp,expectedVersion:0,archived:true});throw Error('rollback cleanup');}),/rollback cleanup/);
  assert.equal((await pg.query<any>('SELECT archived FROM workspace_components WHERE id=$1',[rollbackApp])).rows[0].archived,false);assert.equal((await pg.query<any>('SELECT jsonb_array_length(fields) n FROM entity_types WHERE id=$1',[rollbackType])).rows[0].n,1);
  // A derived field in the retained schema protects its empty source column.
  const derivedType=await createTable('Derived dependency',['source','keep']),derivedApp=await createApp('Derived app',derivedType,['source']);
  await pg.query("UPDATE entity_types SET fields=fields || $2::jsonb WHERE id=$1",[derivedType,JSON.stringify([{key:'computed',name:'Computed',kind:'text',ai:true,computed:{source:'return input.source;',fields:['source']}}])]);
  await save({kind:'archive_component',componentId:derivedApp,expectedVersion:0,archived:true});assert.equal((await pg.query<any>('SELECT fields FROM entity_types WHERE id=$1',[derivedType])).rows[0].fields.some((f:any)=>f.key==='source'),true);
  // The helper does not reveal eligibility across accounts.
  await withActor({userId:other,origin:'human'},async()=>assert.deepEqual((await db.query('SELECT trialy_security.unused_app_fields($1,$2,$3) k',[w.id,type,['populated']])).rows,[]));
 });
});
