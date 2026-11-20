import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import request from 'supertest';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,setDatabaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {Organization} from '../src/domain/organization.js';
import {access} from '../src/domain/permissions.js';
import {baseApp,addApi,errors} from '../src/server/app.js';
import type {Actor} from '../src/shared/schema.js';

// R1: several organization owners, never none. A8: billing is for organization owners.
test('owners promote team members and step down to member; one owner always remains; billing is for owners',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
  const setup:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  // The deployed service: restricted role, with the acting person in the database context.
  const db:Database={query:(q,v)=>db.transaction(tx=>tx.query(q,v)),transaction:fn=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return fn(tx as Connection);}),close:async()=>{}};
  const person=():Actor=>({userId:randomUUID(),origin:'human'}),owner=person(),alice=person(),bob=person(),gina=person(),solo=person(),stranger=person();
  for(const [a,name] of [[owner,'Owner'],[alice,'Alice'],[bob,'Bob'],[gina,'Gina'],[solo,'Solo'],[stranger,'Stranger']] as const)await setup.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,name.toLowerCase()+'@example.invalid',name]);
  const boot=new Service(setup),w=(await boot.createWorkspace(owner,'Main')).id,w2=(await boot.createWorkspace(owner,'Second')).id,old=(await boot.createWorkspace(owner,'Old')).id,own=(await boot.createWorkspace(solo,'Solo')).id;
  for(const a of [alice,bob,gina])await boot.share(owner,w,a.userId,'editor',[],null,false);
  // A guest reaches apps only, never the data directly.
  await setup.query('UPDATE workspace_access SET direct_data=false WHERE workspace_id=$1 AND user_id=$2',[w,gina.userId]);
  await setup.query('UPDATE workspaces SET archived=true WHERE id=$1',[old]);
  const invitation=randomUUID();await setup.query("INSERT INTO workspace_invitations(id,workspace_id,owner_id,token_hash,label,role,allowed_types,expires_at) VALUES($1,$2,$3,$4,'Colleague','editor','[]',now()+interval '7 days')",[invitation,w,owner.userId,randomUUID()]);
  const org=new Organization(db),s=new Service(db);
  const set=(a:Actor,target:Actor,role:'owner'|'member',space=w)=>withActor(a,()=>org.setOwner(a,space,target.userId,role));
  const refused=(code:string,message?:RegExp)=>(e:any)=>{assert.equal(e.code,code);if(message)assert.match(e.message,message);return true;};
  const organizationRole=async(a:Actor)=>(await setup.query('SELECT m.role FROM memberships m JOIN workspaces ws ON ws.tenant_id=m.tenant_id WHERE ws.id=$1 AND m.user_id=$2',[w,a.userId])).rows[0]?.role;
  const version=async(space:string)=>(await setup.query('SELECT access_version FROM workspaces WHERE id=$1',[space])).rows[0].access_version;
  const audited=async(action:string,space:string,target:Actor)=>(await setup.query('SELECT actor_id,after_value FROM audit_events WHERE workspace_id=$1 AND action=$2 AND object_id=$3 ORDER BY event_sequence',[space,action,target.userId])).rows;
  const role=async(a:Actor,space:string,write=false)=>(await withActor(a,()=>access(db,a,space,write))).role;

  // Who may: a signed-in owner. Not a team member, not an assistant, not someone outside the organization.
  await assert.rejects(set(bob,alice,'owner'),refused('owner_required',/Only organization owners/));
  await assert.rejects(set({...owner,origin:'ai'},alice,'owner'),refused('human_required'));
  await assert.rejects(set(stranger,alice,'owner'),refused('not_found'));
  // Whom: team members only.
  await assert.rejects(set(owner,gina,'owner'),refused('not_team_member',/team first/));
  await assert.rejects(set(owner,stranger,'owner'),refused('not_found'));
  assert.equal(await organizationRole(alice),'viewer');

  // Promote: Alice owns the organization, so every workspace opens for her without an access row.
  await assert.rejects(role(alice,w2),refused('not_found'));
  const before=[await version(w),await version(w2),await version(old)];
  assert.deepEqual(await set(owner,alice,'owner'),{userId:alice.userId,role:'owner',changed:true});
  assert.equal(await organizationRole(alice),'owner');assert.equal(await role(alice,w2,true),'owner');
  assert.deepEqual([await version(w),await version(w2),await version(old)],[before[0]+1,before[1]+1,before[2]],'access is refreshed in every active workspace');
  for(const space of [w,w2]){const event=await audited('organization.owner_added',space,alice);assert.equal(event.length,1);assert.equal(event[0].actor_id,owner.userId);assert.deepEqual(event[0].after_value,{owner:true});}
  assert.deepEqual(await set(owner,alice,'owner'),{userId:alice.userId,role:'owner',changed:false},'asking twice changes nothing');
  assert.equal((await audited('organization.owner_added',w,alice)).length,1);

  // The team list names the owners, with or without an access row.
  const team=await withActor(alice,()=>s.members(alice,w));
  assert.deepEqual(team.map((m:any)=>[m.name,m.role,m.organization_owner,m.kind]),[['Alice','owner',true,'member'],['Owner','owner',true,'member'],['Bob','editor',false,'member'],['Gina','editor',false,'guest']]);
  assert.deepEqual(team[1].allowed_types,null);assert.equal(team[1].user_id,owner.userId);assert.equal(team[2].email,'bob@example.invalid');

  // Demote: the first owner had no access rows. He becomes an editor in every active workspace and keeps working.
  assert.equal((await setup.query('SELECT 1 FROM workspace_access WHERE user_id=$1',[owner.userId])).rows.length,0);
  assert.deepEqual(await set(alice,owner,'member'),{userId:owner.userId,role:'member',changed:true});
  assert.equal(await organizationRole(owner),'editor');
  assert.deepEqual((await setup.query('SELECT workspace_id,role,direct_data,ai_enabled FROM workspace_access WHERE user_id=$1 ORDER BY workspace_id',[owner.userId])).rows,[w,w2].sort().map(workspace_id=>({workspace_id,role:'editor',direct_data:true,ai_enabled:true})));
  assert.equal(await role(owner,w,true),'editor');assert.equal(await role(owner,w2,true),'editor');
  assert.deepEqual((await withActor(owner,()=>s.workspaces(owner))).map((x:any)=>x.id).sort(),[w,w2].sort());
  await assert.rejects(role(owner,old),refused('not_found'),'an archived workspace takes no new access');
  const removed=await audited('organization.owner_removed',w,owner);assert.equal(removed.length,1);assert.equal(removed[0].actor_id,alice.userId);assert.deepEqual(removed[0].after_value,{owner:false,editorAccessAdded:true,invitationsRevoked:[invitation]});
  assert.equal((await audited('organization.owner_removed',w2,owner)).length,1);
  assert.ok((await setup.query('SELECT revoked_at FROM workspace_invitations WHERE id=$1',[invitation])).rows[0].revoked_at,'his pending invitation ends with his owner role');
  // A former owner is a team member like any other.
  await assert.rejects(withActor(owner,()=>s.members(owner,w)),refused('owner_required'));
  await assert.rejects(set(owner,owner,'owner'),refused('owner_required'));

  // The last owner stays. The database rule is the backstop; people get a plain message first.
  await assert.rejects(set(alice,alice,'member'),refused('last_owner',/at least one owner/));
  assert.equal(await organizationRole(alice),'owner');
  await assert.rejects(set(solo,solo,'member',own),refused('last_owner'),'also alone in the organization, where the database rule does not apply');
  // With a second owner, an owner may step down. Her own access row is kept, the missing one is added.
  await set(alice,bob,'owner');
  assert.deepEqual(await set(alice,alice,'member'),{userId:alice.userId,role:'member',changed:true});
  assert.equal(await role(alice,w,true),'editor');assert.equal(await role(alice,w2,true),'editor');
  assert.deepEqual((await audited('organization.owner_removed',w,alice))[0].after_value,{owner:false,editorAccessAdded:false});
  await assert.rejects(set(bob,bob,'member'),refused('last_owner'));
  await assert.rejects(setup.query("UPDATE memberships SET role='editor' WHERE user_id=$1",[bob.userId]),/at least one owner/);

  // Over HTTP: the role change next to the member routes, and billing for owners only.
  let actor:Actor=bob;const app=baseApp();addApi(app,s,(req:any,_res:any,next:any)=>{req.actor=actor;withActor(actor,next);});app.use(errors);
  const post=(target:Actor,body:unknown)=>request(app).post(`/api/workspaces/${w}/members/${target.userId}/organization-role`).send(body as any);
  assert.equal((await post(alice,{role:'admin'})).status,400);
  const promoted=await post(alice,{role:'owner'});assert.equal(promoted.status,200);assert.deepEqual(promoted.body,{userId:alice.userId,role:'owner',changed:true});
  const last=await post(alice,{role:'member'});assert.equal(last.status,200);
  const kept=await post(bob,{role:'member'});assert.equal(kept.status,409);assert.deepEqual(kept.body,{error:'last_owner',message:'An organization needs at least one owner'});
  actor=alice;const denied=await post(bob,{role:'member'});assert.equal(denied.status,403);assert.equal(denied.body.error,'owner_required');
  for(const [method,path] of [['get',''],['post','/checkout'],['post','/portal']] as const){const r=await request(app)[method]('/api/account/subscription'+path).send({});assert.equal(r.status,403,path);assert.deepEqual(r.body,{error:'owner_required',message:'Only organization owners can manage billing'});}
  actor=bob;const billing=await request(app).get('/api/account/subscription');assert.equal(billing.status,200);assert.equal(billing.body.plan,'personal');
  actor=solo;assert.equal((await request(app).get('/api/account/subscription')).status,200,'an owner of another organization manages their own billing');
 }finally{await pg.close();}
});
