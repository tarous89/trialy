import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import request from 'supertest';
import {addApi,baseApp,errors} from '../src/server/app.js';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,setDatabaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppRoles} from '../src/domain/app-sharing.js';
import {AppSharing} from '../src/app-services/sharing.js';
import {MemberRemoval} from '../src/domain/member-removal.js';
import type {Actor} from '../src/shared/schema.js';

// A11 (default D8): an organization owner removes a team member, inherits their apps and their automations are switched off.
test('removing a team member ends all their access, moves their apps to the remover and switches off their automations',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
  const setup:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  // The deployed service: restricted role, with the acting person in the database context.
  const db:Database={query:(q,v)=>db.transaction(tx=>tx.query(q,v)),transaction:fn=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return fn(tx as Connection);}),close:async()=>{}};
  const rows=async(q:string,v:unknown[]=[])=>(await setup.query(q,v)).rows as any[],one=async(q:string,v:unknown[]=[])=>(await rows(q,v))[0];
  const person=():Actor=>({userId:randomUUID(),origin:'human'}),owner=person(),second=person(),alice=person(),bob=person(),eve=person(),gus=person(),stranger=person();
  for(const [a,name] of [[owner,'Owner'],[second,'Second'],[alice,'Alice'],[bob,'Bob'],[eve,'Eve'],[gus,'Gus'],[stranger,'Stranger']] as const)await setup.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,name.toLowerCase()+'@example.invalid',name]);
  const boot=new Service(setup),w=(await boot.createWorkspace(owner,'Main')).id,w2=(await boot.createWorkspace(owner,'Second')).id;
  await boot.createWorkspace(stranger,'Elsewhere');
  for(const a of [second,alice,bob,eve,gus])await boot.share(owner,w,a.userId,'editor',[],null,false);
  await boot.share(owner,w2,alice.userId,'editor',[],null,false);await boot.share(owner,w2,bob.userId,'editor',[],null,false);
  await setup.query("UPDATE memberships SET role='owner' WHERE user_id=$1",[second.userId]);
  await setup.query("UPDATE memberships SET kind='guest' WHERE user_id=$1",[gus.userId]);
  const f=new WorkspaceFoundation(db),roles=new AppRoles(db),sharing=new AppSharing(db),removal=new MemberRemoval(db);
  const change=(a:Actor,op:any)=>withActor(a,async()=>{const p=await f.preview(a,w,op);return f.confirm(a,w,p.id,p.digest);});
  const save=(a:Actor,name:string)=>change(a,{kind:'save_component',projectId:project.id,content:{name,format:'text',source:name}});
  const project=await change(owner,{kind:'create_node',nodeKind:'project',name:'Work'}),restricted=await change(owner,{kind:'create_node',nodeKind:'project',name:'Restricted'});

  // Alice owns one app alone, co-owns a second with Bob and a third with the owner, holds a Viewer role on a fourth and is in two audience lists.
  const solo=await save(alice,'Solo'),shared=await save(bob,'Shared'),third=await save(bob,'Third'),listed=await save(owner,'Listed');
  const linked=await change(owner,{kind:'save_component',projectId:project.id,content:{name:'Linked',format:'frontend-js',sourceAccess:'bindings',source:'return {html:"<p>Linked</p>"};',bindings:[]}});
  await withActor(bob,()=>roles.setRole(bob,w,{appId:shared.id,userId:alice.userId,role:'owner'}));
  await withActor(owner,()=>roles.setRole(owner,w,{appId:linked.id,userId:alice.userId,role:'owner'}));
  await withActor(bob,()=>roles.setRole(bob,w,{appId:third.id,userId:alice.userId,role:'viewer'}));
  await change(owner,{kind:'set_component_access',componentId:listed.id,expectedVersion:listed.version,allowedUsers:[alice.userId,bob.userId],ai:true});
  await change(owner,{kind:'set_project_access',nodeId:restricted.id,expectedVersion:restricted.version,allowedUsers:[alice.userId,bob.userId,eve.userId,gus.userId],ai:true});
  await setup.query("INSERT INTO folder_access(workspace_id,folder,allowed_users) VALUES($1,'Private',$2)",[w,JSON.stringify([alice.userId,bob.userId])]);
  // Personal rules in the second workspace of the same organization, next to somebody else's rule.
  const rule=(a:Actor)=>({subject:a.userId,kind:'table',resourceId:randomUUID(),read:'deny',write:'deny'});
  await setup.query('UPDATE workspaces SET permission_rules=$2 WHERE id=$1',[w2,JSON.stringify([rule(alice),rule(bob),rule(alice)])]);
  // A public link Alice shared from an app she co-owns, an app invitation addressed to her and one addressed to somebody else.
  const draft=await withActor(alice,()=>sharing.prepare(alice,w,{appId:linked.id,appVersion:linked.version,kind:'public',mode:'view',reviewedSource:true})),link=await withActor(alice,()=>sharing.confirm(alice,w,draft.id,draft.digest)),token=link.url!.split('#')[1];
  assert.equal((await sharing.publicContext(token)).c.id,linked.id);
  const invite=async(email:string)=>{const id=randomUUID();await setup.query("INSERT INTO app_shares(id,workspace_id,app_id,app_version,owner_id,kind,email,token_hash,config,expires_at) VALUES($1,$2,$3,0,$4,'email',$5,$6,'{}',now()+interval '7 days')",[id,w,third.id,bob.userId,email,randomUUID()]);return id;};
  const backDoor=await invite('alice@example.invalid'),other=await invite('zed@example.invalid');

  // One automation of every kind for Alice, and the same for Bob.
  const automationsOf=async(a:Actor)=>{
   const ids={grant:randomUUID(),records:randomUUID(),fn:randomUUID(),revision:randomUUID(),schedule:randomUUID(),runner:randomUUID(),research:randomUUID(),run:randomUUID(),occurrence:randomUUID(),outbox:randomUUID(),step:randomUUID(),action:randomUUID(),setup:randomUUID()},u=a.userId;
   await setup.query("INSERT INTO action_grants(id,workspace_id,user_id,action,destination,future) VALUES($1,$2::uuid,$3,'reports.prepare',$2::text,true)",[ids.grant,w,u]);
   await setup.query("INSERT INTO automations(id,workspace_id,owner_id,grant_id,name,interval_minutes,next_run) VALUES($1,$2,$3,$4,'Daily report',1440,now()+interval '1 day')",[ids.records,w,u,ids.grant]);
   await setup.query("INSERT INTO foundation_functions(id,workspace_id,user_id,name) VALUES($1,$2,$3,$4)",[ids.fn,w2,u,'fn-'+u]);
   await setup.query("INSERT INTO foundation_revisions(id,function_id,version,body,digest,runtime) VALUES($1,$2,1,'{}','d','js')",[ids.revision,ids.fn]);
   await setup.query("INSERT INTO foundation_schedules(id,workspace_id,user_id,revision_id,input,interval_minutes) VALUES($1,$2,$3,$4,'{}',60)",[ids.schedule,w2,u,ids.revision]);
   await setup.query("INSERT INTO automation_runners(id,workspace_id,user_id,preferences,next_daily_at) VALUES($1,$2,$3,'{}',now()+interval '1 day')",[ids.runner,w,u]);
   await setup.query("INSERT INTO app_monitors(id,workspace_id,user_id,app_id,config,scope_stamp) VALUES($1,$2,$3,$4,$5,'s')",[ids.research,w,u,solo.id,JSON.stringify({name:'Research'})]);
   await setup.query("INSERT INTO app_monitor_runs(id,workspace_id,user_id,monitor_id,monitor_version,occurrence_key,config_snapshot,expires_at) VALUES($1,$2,$3,$4,0,'k','{}',now()+interval '1 hour')",[ids.run,w,u,ids.research]);
   await setup.query("INSERT INTO automation_occurrences(id,workspace_id,user_id,runner_id,monitor_id,monitor_version,occurrence_key,due_at,reason) VALUES($1,$2,$3,$4,$5,0,'k',now(),'schedule')",[ids.occurrence,w,u,ids.runner,ids.research]);
   await setup.query("INSERT INTO automation_outbox(id,workspace_id,user_id,runner_id,event_key,reason) VALUES($1,$2,$3,$4,'k','work_ready')",[ids.outbox,w,u,ids.runner]);
   await setup.query("INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,approved_by,follow_up_of) VALUES($1,$2,$3,$4,$5,$3,$6)",[ids.step,w,u,solo.id,JSON.stringify({name:'Email step'}),ids.research]);
   await setup.query("INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,approved_by) VALUES($1,$2,$3,$4,$5,$3)",[ids.action,w,u,solo.id,JSON.stringify({name:'Action'})]);
   await setup.query("INSERT INTO automation_recipe_setups(id,workspace_id,user_id,app_id,recipe_key,body,digest) VALUES($1,$2,$3,$4,'r','{}','d')",[ids.setup,w,u,solo.id]);
   return ids;
  };
  const hers=await automationsOf(alice),his=await automationsOf(bob);
  const running=async(ids:typeof hers)=>({records:!(await one('SELECT paused FROM automations WHERE id=$1',[ids.records])).paused,schedule:!(await one('SELECT paused FROM foundation_schedules WHERE id=$1',[ids.schedule])).paused,research:(await one('SELECT enabled FROM app_monitors WHERE id=$1',[ids.research])).enabled,
   step:!(await one('SELECT paused FROM app_actions WHERE id=$1',[ids.step])).paused,action:!(await one('SELECT paused FROM app_actions WHERE id=$1',[ids.action])).paused,runner:(await one('SELECT enabled FROM automation_runners WHERE id=$1',[ids.runner])).enabled,
   run:(await one('SELECT status FROM app_monitor_runs WHERE id=$1',[ids.run])).status,occurrence:(await one('SELECT status FROM automation_occurrences WHERE id=$1',[ids.occurrence])).status,outbox:(await one('SELECT status FROM automation_outbox WHERE id=$1',[ids.outbox])).status,setup:(await one('SELECT status FROM automation_recipe_setups WHERE id=$1',[ids.setup])).status});
  const on={records:true,schedule:true,research:true,step:true,action:true,runner:true,run:'running',occurrence:'queued',outbox:'queued',setup:'pending'};
  assert.deepEqual(await running(hers),on);

  // The preview says what will happen and changes nothing.
  const expected={userId:alice.userId,name:'Alice',workspaces:2,apps:3,automations:4,automationKinds:{records:1,schedules:1,research:1,actions:1}};
  assert.deepEqual(await withActor(owner,()=>removal.preview(owner,w,alice.userId)),expected);
  let actor:Actor=owner;const web=baseApp();addApi(web,new Service(db),(req,_res,next)=>{req.actor=actor;withActor(actor,next);});web.use(errors);const route=`/api/workspaces/${w}/members/${alice.userId}`;
  const shown=await request(web).get(route+'/removal');assert.deepEqual([shown.status,shown.body],[200,expected]);
  actor=eve;assert.equal((await request(web).get(route+'/removal')).status,403);assert.equal((await request(web).delete(route)).status,403);actor=owner;
  assert.equal((await rows('SELECT 1 FROM memberships WHERE user_id=$1',[alice.userId])).length,1);assert.deepEqual(await running(hers),on);

  // Who may not remove whom. The database refuses the same cases for a caller that skips the application checks.
  const remove=(a:Actor,target:Actor)=>withActor(a,()=>removal.remove(a,w,target.userId)),sql=(a:Actor,target:Actor)=>withActor(a,()=>db.query('SELECT trialy_security.remove_member($1,$2,NULL)',[w,target.userId]));
  await assert.rejects(remove(eve,alice),/Only an organization owner/);
  await assert.rejects(withActor(eve,()=>removal.preview(eve,w,alice.userId)),/Only an organization owner/);
  await assert.rejects(remove({...owner,origin:'ai'},alice),/signed-in organization owner/);
  await assert.rejects(remove(owner,owner),/cannot remove yourself/);
  await assert.rejects(remove(owner,second),/is an owner/);
  await assert.rejects(remove(owner,stranger),/not in your organization/);
  await assert.rejects(remove(stranger,alice),/not found/i);
  await assert.rejects(sql(eve,alice),/Only an organization owner/);
  await assert.rejects(sql(stranger,alice),/Only an organization owner/);
  await assert.rejects(sql({...owner,origin:'ai'},alice),/signed-in organization owner/);
  await assert.rejects(sql(owner,owner),/cannot remove yourself/);
  await assert.rejects(sql(owner,second),/Make this person a member first/);
  await assert.rejects(sql(owner,stranger),/not in your organization/);
  await assert.rejects(withActor(eve,()=>db.query('SELECT trialy_security.member_removal($1,$2)',[w,alice.userId])),/Only an organization owner/);
  await assert.rejects(withActor(owner,()=>db.query('DELETE FROM memberships WHERE user_id=$1',[alice.userId])),/permission denied/);
  assert.equal((await rows('SELECT 1 FROM memberships WHERE user_id=$1',[alice.userId])).length,1);assert.deepEqual(await running(hers),on);
  assert.equal((await withActor(alice,()=>f.components(alice,w))).length,5,'Alice opens the apps until she is removed');

  // The removal.
  const versions=await rows('SELECT id,access_version FROM workspaces WHERE id=ANY($1::uuid[]) ORDER BY id',[[w,w2]]);
  const removed=await request(web).delete(route);assert.deepEqual([removed.status,removed.body],[200,expected]);
  assert.equal((await rows('SELECT 1 FROM memberships WHERE user_id=$1',[alice.userId])).length,0);
  assert.equal((await rows('SELECT 1 FROM workspace_access WHERE user_id=$1',[alice.userId])).length,0);
  assert.equal((await rows("SELECT 1 FROM workspaces ws,jsonb_array_elements(ws.permission_rules) r WHERE r->>'subject'=$1",[alice.userId])).length,0);
  assert.equal((await rows("SELECT 1 FROM workspaces ws,jsonb_array_elements(ws.permission_rules) r WHERE ws.id=$1 AND r->>'subject'=$2",[w2,bob.userId])).length,1,'other people keep their rules');
  assert.deepEqual((await rows('SELECT id,access_version FROM workspaces WHERE id=ANY($1::uuid[]) ORDER BY id',[[w,w2]])).map(r=>r.access_version),versions.map(r=>r.access_version+1));
  assert.deepEqual((await one('SELECT allowed_users FROM workspace_components WHERE id=$1',[listed.id])).allowed_users,[bob.userId]);
  assert.deepEqual((await one('SELECT allowed_users FROM workspace_nodes WHERE id=$1',[restricted.id])).allowed_users,[bob.userId,eve.userId,gus.userId]);
  assert.deepEqual((await one("SELECT allowed_users FROM folder_access WHERE workspace_id=$1 AND folder='Private'",[w])).allowed_users,[bob.userId]);
  // The remover owns her apps now; the co-owner keeps his role; her other roles are gone.
  const appOwners=async(appId:string)=>(await rows("SELECT user_id,granted_by FROM app_members WHERE app_id=$1 AND role='owner'",[appId])).map(r=>[r.user_id,r.granted_by]);
  assert.deepEqual(await appOwners(solo.id),[[owner.userId,owner.userId]]);
  assert.deepEqual((await appOwners(shared.id)).sort(),[[bob.userId,bob.userId],[owner.userId,owner.userId]].sort());
  assert.deepEqual(await appOwners(linked.id),[[owner.userId,owner.userId]]);
  assert.equal((await rows('SELECT 1 FROM app_members WHERE user_id=$1',[alice.userId])).length,0);
  assert.equal((await withActor(bob,()=>roles.members(bob,w,shared.id))).role,'owner');
  // Her public link stays with the app and still opens; the invitation addressed to her is revoked, the other one is not.
  assert.equal((await one('SELECT owner_id FROM app_shares WHERE id=$1',[link.id])).owner_id,owner.userId);
  assert.equal((await sharing.publicContext(token)).c.id,linked.id);
  assert.ok((await one('SELECT revoked_at FROM app_shares WHERE id=$1',[backDoor])).revoked_at);assert.equal((await one('SELECT revoked_at FROM app_shares WHERE id=$1',[other])).revoked_at,null);
  // Her automations are off, with the reason. Bob's keep running.
  const why='Switched off because Alice left the organization.';
  assert.deepEqual(await running(hers),{records:false,schedule:false,research:false,step:false,action:false,runner:false,run:'cancelled',occurrence:'cancelled',outbox:'cancelled',setup:'cancelled'});
  assert.deepEqual(await running(his),on);
  for(const [table,id] of [['automations',hers.records],['foundation_schedules',hers.schedule],['app_monitors',hers.research],['automation_runners',hers.runner]] as const)assert.equal((await one(`SELECT off_reason FROM ${table} WHERE id=$1`,[id])).off_reason,why,table);
  assert.equal((await one('SELECT last_error FROM app_actions WHERE id=$1',[hers.action])).last_error,why);
  assert.equal((await one("SELECT count(*)::int AS n FROM revisions WHERE object_id=$1 AND object_kind='automation'",[hers.records])).n,1);
  assert.equal((await one('SELECT off_reason FROM app_monitors WHERE id=$1',[his.research])).off_reason,null);
  // The reason goes when an automation is switched on again.
  await setup.query('UPDATE app_monitors SET enabled=true WHERE id=$1',[hers.research]);assert.equal((await one('SELECT off_reason FROM app_monitors WHERE id=$1',[hers.research])).off_reason,null);
  await setup.query('UPDATE foundation_schedules SET paused=false WHERE id=$1',[hers.schedule]);assert.equal((await one('SELECT off_reason FROM foundation_schedules WHERE id=$1',[hers.schedule])).off_reason,null);

  // She can no longer open anything, through the application or straight from the database.
  await assert.rejects(withActor(alice,()=>f.components(alice,w)),/not found/i);
  await assert.rejects(withActor(alice,()=>f.component(db,alice,w,solo.id)),/not found/i);
  assert.equal((await withActor(alice,()=>db.query('SELECT id FROM workspaces WHERE id=ANY($1::uuid[])',[[w,w2]]))).rows.length,0);
  assert.equal((await withActor(alice,()=>db.query('SELECT id FROM workspace_components WHERE workspace_id=$1',[w]))).rows.length,0);
  // The record of what happened.
  const logged=await one("SELECT actor_id,object_id,before_value,after_value FROM audit_events WHERE action='member.removed'");
  assert.deepEqual([logged.actor_id,logged.object_id,logged.before_value.name,logged.after_value.apps,logged.after_value.automations],[owner.userId,alice.userId,'Alice',3,4]);
  await assert.rejects(remove(owner,alice),/not in your organization/);

  // A guest is removed the same way. Everybody else is untouched.
  assert.deepEqual(await remove(second,gus),{userId:gus.userId,name:'Gus',workspaces:1,apps:0,automations:0,automationKinds:{records:0,schedules:0,research:0,actions:0}});
  assert.deepEqual((await rows('SELECT user_id FROM memberships WHERE tenant_id=(SELECT tenant_id FROM workspaces WHERE id=$1) AND kind<>$2 ORDER BY user_id',[w,'public_link'])).map(r=>r.user_id),[owner,second,bob,eve].map(a=>a.userId).sort());
  assert.equal((await withActor(bob,()=>f.components(bob,w))).length,5);
 }finally{await pg.close();}
});
