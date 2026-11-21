import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,setDatabaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AutomationManagement} from '../src/automations/management.js';
import {classifyFailure} from '../src/automations/attention.js';
import {monitoringConfig} from '../src/app-services/monitoring-schema.js';
import type {Actor} from '../src/shared/schema.js';

// Session 6, package 6.4 (T5, D27, D28, D31).
test('the running assistant\'s Data level decides whether research can run or write; review-each-change permissions need setting up again; an end date is optional',()=>{
 assert.match(classifyFailure({status:403,code:'assistant_data_blocked'}).cause,/cannot run/);
 assert.match(classifyFailure({status:403,code:'assistant_data_view'}).cause,/cannot save its results/);
 const again=classifyFailure({status:409,code:'write_setup_required'});assert.equal(again.kind,'setup');assert.match(again.cause,/Set up again/);
 const base={name:'Watch',appId:randomUUID(),objective:'Find news',instructions:'Look for news',sourcePolicy:'Public sources',schedule:{description:'Weekly',timeZone:'Europe/Paris'}};
 assert.equal(monitoringConfig.parse(base).expiresAt,undefined,'D31: no end date is needed');
});

test('run history shows what each run applied and delivered, for every owner of the app',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
  const setup:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  const db:Database={query:(q,v)=>db.transaction(tx=>tx.query(q,v)),transaction:fn=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return fn(tx as Connection);}),close:async()=>{}};
  const owner:Actor={userId:randomUUID(),origin:'human'};
  await setup.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[owner.userId,owner.userId,'owner@example.invalid','Owner']);
  const w=(await new Service(setup).createWorkspace(owner,'Main')).id,f=new WorkspaceFoundation(db),manage=new AutomationManagement(db);
  const change=(op:any)=>withActor(owner,async()=>{const p=await f.preview(owner,w,op);return f.confirm(owner,w,p.id,p.digest);});
  const project=await change({kind:'create_node',nodeKind:'project',name:'Work'}),app=await change({kind:'save_component',projectId:project.id,content:{name:'Deals',format:'text',source:'Deals'}});
  const runner=randomUUID(),monitor=randomUUID(),run=randomUUID(),occ=randomUUID(),action=randomUUID(),actionRun=randomUUID(),job=randomUUID();
  await setup.query("INSERT INTO automation_runners(id,workspace_id,user_id,preferences,next_daily_at) VALUES($1,$2,$3,'{}',now())",[runner,w,owner.userId]);
  await setup.query("INSERT INTO app_monitors(id,workspace_id,user_id,app_id,config,scope_stamp,enabled) VALUES($1,$2,$3,$4,$5,'s',false)",[monitor,w,owner.userId,app.id,JSON.stringify({name:'Research'})]);
  await setup.query("INSERT INTO app_monitor_runs(id,workspace_id,user_id,monitor_id,monitor_version,occurrence_key,status,config_snapshot,result,finished_at) VALUES($1,$2,$3,$4,0,'o1','completed','{}',$5,now())",[run,w,owner.userId,monitor,JSON.stringify({summary:'Found two',savedChanges:2})]);
  await setup.query("INSERT INTO automation_occurrences(id,workspace_id,user_id,runner_id,monitor_id,monitor_version,occurrence_key,due_at,reason,status,run_id) VALUES($1,$2,$3,$4,$5,0,'k',now(),'scheduled_due','completed',$6)",[occ,w,owner.userId,runner,monitor,run]);
  await setup.query("INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,approved_by,paused,follow_up_of) VALUES($1,$2,$3,$4,$5,$3,true,$6)",[action,w,owner.userId,app.id,JSON.stringify({name:'Email'}),monitor]);
  await setup.query("INSERT INTO app_action_runs(id,workspace_id,user_id,action_id,action_version,occurrence,status) VALUES($1,$2,$3,$4,0,$5,'succeeded')",[actionRun,w,owner.userId,action,'automation:'+occ]);
  await setup.query("INSERT INTO app_service_jobs(id,workspace_id,user_id,app_id,kind,request_key,digest,payload,status,deadline_at,delivery_status) VALUES($1,$2,$3,$4,'email','r','d','{}','succeeded',now()+interval '1 day','email.delivered')",[job,w,owner.userId,app.id]);
  await setup.query('INSERT INTO app_action_effects(run_id,step,job_id) VALUES($1,0,$2)',[actionRun,job]);
  const research=await withActor(owner,()=>manage.history(owner,w,'research',monitor));
  assert.deepEqual(research.rows.map((r:any)=>[r.status,r.applied,r.delivered]),[['completed',2,'Delivered']]);
  const email=await withActor(owner,()=>manage.history(owner,w,'action',action));
  assert.deepEqual(email.rows.map((r:any)=>[r.status,r.delivered]),[['succeeded','Delivered']]);
 }finally{await pg.close();}
});
