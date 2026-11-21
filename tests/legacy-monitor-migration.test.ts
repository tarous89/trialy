import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,setDatabaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {legacyMonitors,migrateLegacyMonitor,proposeSchedule} from '../src/automations/legacy-migration.js';
import type {Actor} from '../src/shared/schema.js';

// Session 6, package 6.6 (T7): older monitors move to the TrialAgents schedule one at a time, with a verification report.
test('a saved schedule description becomes a proposed TrialAgents schedule',()=>{
 const today=new Date('2026-11-21T10:00:00Z');
 assert.deepEqual((({frequency,weekdays,time})=>({frequency,weekdays,time}))(proposeSchedule('Every Monday at 08:30',"Europe/Paris",today) as any),{frequency:'weekly',weekdays:[1],time:'08:30'});
 assert.equal((proposeSchedule('Daily at 7am','UTC',today) as any).frequency,'daily');
 assert.equal((proposeSchedule('Daily at 7am','UTC',today) as any).time,'07:00');
 assert.deepEqual((proposeSchedule('Weekdays 9:00','UTC',today) as any).weekdays,[1,2,3,4,5]);
 assert.equal((proposeSchedule('Monthly on the 15th','UTC',today) as any).monthDay,15);
 assert.deepEqual((proposeSchedule('Whenever useful','UTC',today) as any).weekdays,[1],'without a clear cadence: weekly on Monday at 09:00, for the person to confirm');
});

test('moving a legacy monitor reports what it does, fences the host task and keeps paused monitors paused',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
  const setup:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  const db:Database={query:(q,v)=>db.transaction(tx=>tx.query(q,v)),transaction:fn=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return fn(tx as Connection);}),close:async()=>{}};
  const one=async(q:string,v:unknown[]=[])=>((await setup.query(q,v)).rows as any[])[0];
  const owner:Actor={userId:randomUUID(),origin:'human'};
  await setup.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[owner.userId,owner.userId,'owner@example.invalid','Owner']);
  const w=(await new Service(setup).createWorkspace(owner,'Main')).id,f=new WorkspaceFoundation(db);
  const change=(op:any)=>withActor(owner,async()=>{const p=await f.preview(owner,w,op);return f.confirm(owner,w,p.id,p.digest);});
  const project=await change({kind:'create_node',nodeKind:'project',name:'Work'}),app=await change({kind:'save_component',projectId:project.id,content:{name:'Deals',format:'text',source:'Deals'}});
  const config=(name:string)=>({name,appId:app.id,objective:'Find news',instructions:'Look for news',sourcePolicy:'Public sources',schedule:{description:'Every Monday at 08:30',timeZone:'Europe/Paris'}});
  const on=randomUUID(),paused=randomUUID(),runner=randomUUID();
  await setup.query("INSERT INTO app_monitors(id,workspace_id,user_id,app_id,config,scope_stamp,enabled,task,assistant) VALUES($1,$2,$3,$4,$5,'s',true,$6,'chatgpt')",[on,w,owner.userId,app.id,JSON.stringify(config('Weekly news')),JSON.stringify({id:'task-1',schedule:'Mondays 08:30'})]);
  await setup.query("INSERT INTO app_monitors(id,workspace_id,user_id,app_id,config,scope_stamp,enabled,assistant) VALUES($1,$2,$3,$4,$5,'s',false,'chatgpt')",[paused,w,owner.userId,app.id,JSON.stringify(config('Paused news'))]);
  await setup.query("INSERT INTO app_monitor_runs(id,workspace_id,user_id,monitor_id,monitor_version,occurrence_key,status,config_snapshot,result,finished_at) VALUES($1,$2,$3,$4,0,'o1','completed','{}',$5,now()-interval '2 days')",[randomUUID(),w,owner.userId,on,JSON.stringify({summary:'ok',coverage:{through:'2026-11-19T00:00:00.000Z'}})]);
  const listed=await withActor(owner,()=>legacyMonitors(db,owner,w));
  const report:any=listed.rows.find((r:any)=>r.id===on);
  assert.equal(report.verification.schedule.proposed.frequency,'weekly');
  assert.equal(report.verification.lastCompletedRun.coverageThrough,'2026-11-19T00:00:00.000Z');
  assert.match(report.hostTaskNote,/cannot pause the task/);
  // A background connection is needed first.
  await assert.rejects(withActor(owner,()=>migrateLegacyMonitor(db,owner,w,{monitorId:on,expectedVersion:0})),(e:any)=>e.code==='runner_not_ready');
  await setup.query("INSERT INTO automation_runners(id,workspace_id,user_id,preferences,next_daily_at,enabled,verified_at,assistant) VALUES($1,$2,$3,$4,now(),true,now(),'chatgpt')",[runner,w,owner.userId,JSON.stringify({time:'06:00',timeZone:'Europe/Paris'})]);
  const moved=await withActor(owner,()=>migrateLegacyMonitor(db,owner,w,{monitorId:on,expectedVersion:0}));
  assert.equal(moved.enabled,true);
  const row=await one('SELECT config,task,coverage_through,version FROM app_monitors WHERE id=$1',[on]);
  assert.equal(row.config.automation.runnerId,runner);assert.equal(row.task,null);assert.equal(row.version,1);
  assert.ok(new Date(row.coverage_through).getTime()===Date.parse('2026-11-19T00:00:00.000Z'),'coverage continues from the last completed run');
  assert.ok((await one('SELECT next_at FROM automation_dispatch WHERE monitor_id=$1',[on])).next_at,'the next run is scheduled');
  assert.ok(await one("SELECT 1 FROM audit_events WHERE action='monitoring.legacy_migrated' AND object_id=$1",[on]));
  await assert.rejects(withActor(owner,()=>migrateLegacyMonitor(db,owner,w,{monitorId:on,expectedVersion:1})),(e:any)=>e.code==='already_migrated');
  const stayed=await withActor(owner,()=>migrateLegacyMonitor(db,owner,w,{monitorId:paused,expectedVersion:0}));
  assert.equal(stayed.enabled,false,'a paused monitor stays paused');
  assert.equal((await withActor(owner,()=>legacyMonitors(db,owner,w))).rows.length,0);
 }finally{await pg.close();}
});
