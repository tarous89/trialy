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
import type {Actor} from '../src/shared/schema.js';

// Session 6, package 6.1 (T1, A7, D23–D25, D29): automations belong to their app and every owner of the app manages them.
test('co-owners see, switch off and move an automation someone else set up; editors cannot; the database agrees',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
  const setup:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  const db:Database={query:(q,v)=>db.transaction(tx=>tx.query(q,v)),transaction:fn=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return fn(tx as Connection);}),close:async()=>{}};
  const one=async(q:string,v:unknown[]=[])=>((await setup.query(q,v)).rows as any[])[0];
  const person=():Actor=>({userId:randomUUID(),origin:'human'}),owner=person(),alice=person(),bob=person(),eve=person();
  for(const [a,name] of [[owner,'Owner'],[alice,'Alice'],[bob,'Bob'],[eve,'Eve']] as const)await setup.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,name.toLowerCase()+'@example.invalid',name]);
  const boot=new Service(setup),w=(await boot.createWorkspace(owner,'Main')).id;
  for(const a of [alice,bob,eve])await boot.share(owner,w,a.userId,'editor',[],null,false);
  const f=new WorkspaceFoundation(db),manage=new AutomationManagement(db);
  const change=(a:Actor,op:any)=>withActor(a,async()=>{const p=await f.preview(a,w,op);return f.confirm(a,w,p.id,p.digest);});
  const project=await change(owner,{kind:'create_node',nodeKind:'project',name:'Work'});
  const app=await change(alice,{kind:'save_component',projectId:project.id,content:{name:'Deals',format:'text',source:'Deals'}});
  // Alice created the app (Owner), Bob is a co-owner, Eve works in it as an Editor through the team default.
  await setup.query("INSERT INTO app_members(workspace_id,app_id,user_id,role,granted_by) VALUES($1,$2,$3,'owner',$4)",[w,app.id,bob.userId,alice.userId]);
  const research=randomUUID(),action=randomUUID();
  await setup.query("INSERT INTO app_monitors(id,workspace_id,user_id,app_id,config,scope_stamp,enabled) VALUES($1,$2,$3,$4,$5,'s',true)",[research,w,alice.userId,app.id,JSON.stringify({name:'Weekly research'})]);
  await setup.query("INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,approved_by,paused) VALUES($1,$2,$3,$4,$5,$3,false)",[action,w,alice.userId,app.id,JSON.stringify({name:'Digest',trigger:{kind:'schedule'},steps:[]})]);
  await setup.query("INSERT INTO app_monitor_runs(id,workspace_id,user_id,monitor_id,monitor_version,occurrence_key,status,config_snapshot,finished_at) VALUES($1,$2,$3,$4,0,'o1','completed','{}',now())",[randomUUID(),w,alice.userId,research]);

  // Database: the co-owner reads the app's automation rows; the editor reads none.
  const visible=(a:Actor,q:string)=>withActor(a,()=>db.query(q)).then(r=>r.rows.length);
  assert.equal(await visible(bob,'SELECT id FROM app_monitors'),1);
  assert.equal(await visible(bob,'SELECT id FROM app_monitor_runs'),1);
  assert.equal(await visible(eve,'SELECT id FROM app_monitors'),0);
  assert.equal(await visible(eve,'SELECT id FROM app_monitor_runs'),0);
  assert.equal(await visible(owner,'SELECT id FROM app_monitors'),1,'an organization owner owns every app (D4)');

  // Application: the co-owner lists both, linked to Alice; the editor is refused.
  const listed=await withActor(bob,()=>manage.list(bob,w,{}));
  assert.deepEqual(listed.rows.map((r:any)=>[r.kind,r.mine,r.linkedOwner.name]).sort(),[['action',false,'Alice'],['research',false,'Alice']]);
  assert.ok(listed.rows.every((r:any)=>r.canEdit===false));
  await assert.rejects(withActor(eve,()=>manage.list(eve,w,{})),(e:any)=>e.status===403);
  await assert.rejects(withActor(eve,()=>manage.read(eve,w,'research',research)),(e:any)=>e.status===403||e.status===404);
  const history=await withActor(bob,()=>manage.history(bob,w,'research',research));
  assert.equal(history.rows.length,1,'A7: owners of the app see its run history');
  assert.equal(history.rows[0].result,null,'results stay withheld unless the fields are readable now');

  // Switching off works for any owner; switching on someone else's automation needs a move first.
  const read=await withActor(bob,()=>manage.read(bob,w,'research',research));
  await withActor(bob,()=>manage.control(bob,w,'research',research,read.version,false));
  assert.equal((await one('SELECT enabled,off_reason,user_id FROM app_monitors WHERE id=$1',[research])).enabled,false);
  assert.equal((await one('SELECT user_id FROM app_monitors WHERE id=$1',[research])).user_id,alice.userId,'switching off does not change the linked owner');
  await assert.rejects(withActor(bob,()=>manage.control(bob,w,'research',research,read.version,true)),(e:any)=>e.code==='move_required');
  await assert.rejects(withActor(bob,()=>manage.prepareControl(bob,w,{kind:'research',automationId:research,expectedVersion:read.version,enabled:true})),(e:any)=>e.code==='move_required');

  // Move to my account (D29): Bob has no research connection yet, so it moves switched off with the reason.
  await assert.rejects(withActor(eve,()=>manage.move(eve,w,'research',research,read.version)),(e:any)=>[403,404].includes(e.status));
  const moved=await withActor(bob,()=>manage.move(bob,w,'research',research,read.version));
  assert.equal(moved.linkedOwner.id,bob.userId);
  assert.equal(moved.movedFrom.name,'Alice');
  const after=await one('SELECT user_id,enabled,version FROM app_monitors WHERE id=$1',[research]);
  assert.equal(after.user_id,bob.userId);assert.equal(after.enabled,false);assert.equal(after.version,read.version+1);
  assert.ok(await one("SELECT 1 FROM audit_events WHERE action='automation.moved' AND object_id=$1",[research]));
  await assert.rejects(withActor(bob,()=>manage.move(bob,w,'research',research,after.version)),(e:any)=>e.code==='already_linked');
  const mine=(await withActor(bob,()=>manage.list(bob,w,{}))).rows.find((r:any)=>r.id===research);
  assert.equal(mine.mine,true);assert.equal(mine.linkedOwner.name,'Bob');

  // The action moves too; it was on, but Bob's own checks decide whether it stays on.
  const actionRead=await withActor(bob,()=>manage.read(bob,w,'action',action));
  const movedAction=await withActor(bob,()=>manage.move(bob,w,'action',action,actionRead.version));
  assert.equal(movedAction.linkedOwner.id,bob.userId);
  const actionAfter=await one('SELECT user_id,paused,last_error FROM app_actions WHERE id=$1',[action]);
  assert.equal(actionAfter.user_id,bob.userId);
  if(actionAfter.paused)assert.ok(actionAfter.last_error,'a moved automation that is switched off says why');

  // D25: something tied to no app is listed for organization owners to attach or archive.
  const rule=randomUUID(),grant=randomUUID();
  await setup.query("INSERT INTO action_grants(id,workspace_id,user_id,action,destination) VALUES($1,$2,$3,'create_record','records')",[grant,w,owner.userId]);
  {
   await setup.query("INSERT INTO automations(id,workspace_id,owner_id,grant_id,name,interval_minutes,next_run) VALUES($1,$2,$3,$4,'Old rule',60,now())",[rule,w,owner.userId,grant]);
   const unassigned=await withActor(owner,()=>manage.unassigned(owner,w));
   assert.ok(unassigned.rows.some((r:any)=>r.id===rule&&r.kind==='rule'));
   assert.deepEqual((await withActor(bob,()=>manage.unassigned(bob,w))).rows,[],'only organization owners see Unassigned');
   await withActor(owner,()=>manage.resolveUnassigned(owner,w,{kind:'rule',id:rule,appId:app.id}));
   assert.equal((await one('SELECT app_id FROM automations WHERE id=$1',[rule])).app_id,app.id);
  }
 }finally{await pg.close();}
});
