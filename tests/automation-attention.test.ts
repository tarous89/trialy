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
import {dispatchAppActions} from '../src/app-services/service.js';
import {classifyFailure,retryAt,RETRY_MINUTES} from '../src/automations/attention.js';
import type {Actor} from '../src/shared/schema.js';

// Session 6, package 6.3 (T3, T2, U2, D30).
test('one classifier: temporary failures retry at 5, 15 and 60 minutes; access, connection and setup failures need attention',()=>{
 assert.deepEqual(RETRY_MINUTES,[5,15,60]);
 const now=new Date('2026-11-21T10:00:00Z');
 assert.deepEqual([1,2,3,4].map(n=>(retryAt(n,now).getTime()-now.getTime())/60000),[5,15,60,60]);
 assert.equal(classifyFailure({status:429}).kind,'temporary');
 assert.equal(classifyFailure(new Error('ECONNRESET')).kind,'temporary');
 assert.equal(classifyFailure({status:503,code:'provider_unavailable'}).kind,'temporary');
 assert.equal(classifyFailure({status:403,code:'app_owner_required'}).kind,'permission');
 assert.equal(classifyFailure({status:409,code:'runner_not_ready'}).kind,'connection');
 assert.equal(classifyFailure({status:403,code:'action_expired'}).kind,'setup','an end date that passed is Needs attention (D31), not a permission problem');
 assert.equal(classifyFailure({status:409,code:'scope_changed'}).kind,'setup');
});

test('an action whose end date passed shows Needs attention with the cause and alerts once (D31); the minimum interval is an organization setting',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
  const setup:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  const db:Database={query:(q,v)=>db.transaction(tx=>tx.query(q,v)),transaction:fn=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return fn(tx as Connection);}),close:async()=>{}};
  const one=async(q:string,v:unknown[]=[])=>((await setup.query(q,v)).rows as any[])[0];
  const owner:Actor={userId:randomUUID(),origin:'human'};
  await setup.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[owner.userId,owner.userId,'owner@example.invalid','Owner']);
  const w=(await new Service(setup).createWorkspace(owner,'Main')).id,f=new WorkspaceFoundation(db),manage=new AutomationManagement(db);
  const change=(op:any)=>withActor(owner,async()=>{const p=await f.preview(owner,w,op);return f.confirm(owner,w,p.id,p.digest);});
  const project=await change({kind:'create_node',nodeKind:'project',name:'Work'}),app=await change({kind:'save_component',projectId:project.id,content:{name:'Deals',format:'text',source:'Deals'}});
  const action=randomUUID(),config={name:'Digest',appId:app.id,appVersion:0,trigger:{kind:'interval',minutes:120},steps:[{id:'run',kind:'function',binding:'refresh'}],expiresAt:new Date(Date.now()-60000).toISOString()};
  await setup.query("INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,approved_by,paused,next_at,assistant) VALUES($1,$2,$3,$4,$5,$3,false,now()-interval '1 minute',NULL)",[action,w,owner.userId,app.id,JSON.stringify(config)]);
  const before=Date.now();
  assert.equal(await dispatchAppActions(setup),true);
  const row=await one('SELECT paused,needs_attention_cause,next_at,last_error FROM app_actions WHERE id=$1',[action]);
  assert.equal(row.paused,true,'an end date that passed is a set-up-again cause: it stays off until saved again');
  assert.match(row.needs_attention_cause,/end date/);assert.equal(row.last_error,'action_expired');void before;
  await setup.query("UPDATE app_actions SET paused=false,next_at=now()-interval '1 minute' WHERE id=$1",[action]);
  await dispatchAppActions(setup);
  assert.equal(Number((await one('SELECT count(*) AS n FROM automation_alerts WHERE automation_id=$1',[action])).n),1,'one alert for the cause, however often it is checked');
  const listed=(await withActor(owner,()=>manage.list(owner,w,{}))).rows.find((r:any)=>r.id===action);
  assert.match(listed.needsAttention,/end date/);
  const alerts=await withActor(owner,()=>manage.alerts(owner,w));assert.equal(alerts.rows.length,1);
  await withActor(owner,()=>manage.dismissAlert(owner,w,alerts.rows[0].id));
  assert.equal((await withActor(owner,()=>manage.alerts(owner,w))).rows.length,0);

  // P7 (6.7): a database-triggered action with nothing new since its cursor waits without scanning or checking access.
  const quiet=randomUUID(),latest=Number((await one('SELECT coalesce(max(event_sequence),0) AS n FROM audit_events WHERE workspace_id=$1',[w])).n);
  await setup.query("INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,approved_by,paused,next_at,event_cursor) VALUES($1,$2,$3,$4,$5,$3,false,now()-interval '1 minute',$6)",[quiet,w,owner.userId,app.id,JSON.stringify({...config,name:'Quiet',trigger:{kind:'database',typeId:randomUUID(),events:['created']}}),latest]);
  await setup.query("UPDATE app_actions SET next_at=now()+interval '1 hour' WHERE id=$1",[action]);
  await dispatchAppActions(setup);
  const q=await one('SELECT needs_attention_cause,next_at FROM app_actions WHERE id=$1',[quiet]);
  assert.equal(q.needs_attention_cause,null,'no access check ran (its end date passed, which a check would report)');
  assert.ok(new Date(q.next_at).getTime()>Date.now(),'it simply waits for the next poll');
  // D30: default 60 minutes, changed by an organization owner within 15 to 1440.
  assert.equal((await withActor(owner,()=>manage.settings(owner,w))).minIntervalMinutes,60);
  await withActor(owner,()=>manage.saveSettings(owner,w,30));
  assert.equal((await withActor(owner,()=>manage.settings(owner,w))).minIntervalMinutes,30);
  await assert.rejects(withActor(owner,()=>manage.saveSettings(owner,w,5)),(e:any)=>e.code==='invalid_interval');
 }finally{await pg.close();}
});
