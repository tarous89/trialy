import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,setDatabaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppRoles,roleRule} from '../src/domain/app-sharing.js';
import type {Actor} from '../src/shared/schema.js';

// R1–R5, A1, A3, A5: app Owner, Editor and Viewer, enforced by the application and again by the database.
test('whoever creates an app owns it; roles are granted up to your own and lowered only by owners',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
  const setup:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  // The deployed service: restricted role, with the acting person in the database context.
  const db:Database={query:(q,v)=>db.transaction(tx=>tx.query(q,v)),transaction:fn=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return fn(tx as Connection);}),close:async()=>{}};
  const person=():Actor=>({userId:randomUUID(),origin:'human'}),owner=person(),alice=person(),bob=person(),vic=person(),eve=person();
  for(const [a,name] of [[owner,'Owner'],[alice,'Alice'],[bob,'Bob'],[vic,'Vic'],[eve,'Eve']] as const)await setup.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,name.toLowerCase()+'@example.invalid',name]);
  const boot=new Service(setup),w=(await boot.createWorkspace(owner,'Roles')).id;
  for(const a of [alice,bob,vic,eve])await boot.share(owner,w,a.userId,'editor',[],null,false);
  const f=new WorkspaceFoundation(db),roles=new AppRoles(db);
  const change=(a:Actor,op:any)=>withActor(a,async()=>{const p=await f.preview(a,w,op);return f.confirm(a,w,p.id,p.digest);});
  const role=async(viewer:Actor,target:Actor)=>(await withActor(viewer,()=>roles.members(viewer,w,app.id))).people.find(p=>p.userId===target.userId);
  const grant=(a:Actor,target:Actor,r:string)=>withActor(a,()=>roles.setRole(a,w,{appId:app.id,userId:target.userId,role:r}));
  const project=await change(owner,{kind:'create_node',nodeKind:'project',name:'Work'});
  const app=await change(alice,{kind:'save_component',projectId:project.id,content:{name:'Pipeline',format:'text',source:'v1'}});

  // The creator owns the app; the organization owner owns every app; the rest of the team gets the default (Editor).
  const first=await withActor(alice,()=>roles.members(alice,w,app.id));
  assert.equal(first.role,'owner');assert.equal(first.teamDefault,'editor');assert.deepEqual(first.canGrant,['viewer','editor','owner']);
  assert.equal((await role(alice,alice))!.role,'owner');assert.equal((await role(alice,owner))!.source,'organization_owner');
  assert.deepEqual([(await role(alice,bob))!.role,(await role(alice,bob))!.source],['editor','team_default']);

  // An editor works with the data but cannot change code, settings or who may open the app.
  const edit=(a:Actor,version:number,source:string)=>change(a,{kind:'save_component',componentId:app.id,expectedVersion:version,projectId:project.id,content:{name:'Pipeline',format:'text',source}});
  await assert.rejects(edit(bob,app.version,'by bob'),/owner of this app/);
  await assert.rejects(change(bob,{kind:'archive_component',componentId:app.id,expectedVersion:app.version,archived:true}),/owner of this app/);
  await assert.rejects(change(bob,{kind:'set_component_access',componentId:app.id,expectedVersion:app.version,allowedUsers:[bob.userId],ai:true}),/owner of this app/);
  await assert.rejects(withActor(bob,()=>roles.setTeamDefault(bob,w,{appId:app.id,role:'none'})),/owner of this app/);
  // The app owner and the organization owner can.
  const v2=await edit(alice,app.version,'v2'),v3=await edit(owner,v2.version,'v3');assert.equal(v3.version,v2.version+1);

  // Team default: Viewer makes the team read-only, None hides the app from people without a role of their own.
  await withActor(alice,()=>roles.setTeamDefault(alice,w,{appId:app.id,role:'viewer'}));
  assert.equal((await role(alice,bob))!.role,'viewer');assert.equal((await withActor(bob,()=>f.components(bob,w))).length,1);
  await withActor(alice,()=>roles.setTeamDefault(alice,w,{appId:app.id,role:'none'}));
  assert.equal((await role(alice,bob))!.role,'none');assert.equal((await withActor(bob,()=>f.components(bob,w))).length,0);
  await assert.rejects(withActor(bob,()=>roles.members(bob,w,app.id)),/App unavailable/);
  assert.equal((await withActor(alice,()=>f.components(alice,w))).length,1,'the owner is never capped by the team default');

  // Granting: owner any role, editor up to Editor, viewer only Viewer. The record shows who granted it.
  const granted=await grant(alice,bob,'editor');assert.equal(granted.previous,'none');assert.deepEqual(granted.blockedTables,[]);
  const bobNow=(await role(alice,bob))!;assert.deepEqual([bobNow.role,bobNow.source,bobNow.grantedBy],['editor','granted','Alice']);assert.ok(bobNow.grantedAt);
  assert.deepEqual((await withActor(bob,()=>roles.members(bob,w,app.id))).canGrant,['viewer','editor']);
  await assert.rejects(grant(bob,vic,'owner'),/Editor or Viewer/);
  await grant(bob,vic,'viewer');assert.equal((await role(alice,vic))!.grantedBy,'Bob');
  await assert.rejects(grant(vic,eve,'editor'),/viewing only/);
  await grant(vic,eve,'viewer');assert.equal((await role(alice,eve))!.role,'viewer');
  await assert.rejects(grant(alice,alice,'viewer'),/own role/);
  await assert.rejects(grant(alice,owner,'viewer'),/already own every app/);

  // Lowering and removing is for owners, and so is undoing a removal.
  await assert.rejects(grant(bob,vic,'none'),/lower or remove/);
  await assert.rejects(grant(vic,bob,'viewer'),/lower or remove/);
  await grant(alice,vic,'none');assert.equal((await role(alice,vic))!.role,'none');
  await assert.rejects(grant(bob,vic,'viewer'),/lower or remove/);
  await assert.rejects(withActor(vic,()=>f.component(db,vic,w,app.id)),/access|not found/i);

  // A co-owner gains everything an owner can do.
  await assert.rejects(edit(bob,v3.version,'still not'),/owner of this app/);
  await grant(alice,bob,'owner');const v4=await edit(bob,v3.version,'v4');assert.equal(v4.version,v3.version+1);
  await grant(bob,vic,'viewer');assert.equal((await role(bob,vic))!.role,'viewer');

  // The database applies the same rules to a caller that skips the application checks.
  const rule=(target:Actor,r:any)=>JSON.stringify(roleRule({id:app.id,bindings:[]},target.userId,r,false));
  await assert.rejects(withActor(vic,()=>db.query('SELECT trialy_security.set_app_role($1,$2,$3,$4)',[app.id,eve.userId,'editor',rule(eve,'editor')])),/up to your own/);
  await assert.rejects(withActor(eve,()=>db.query('SELECT trialy_security.set_app_role($1,$2,$3,$4)',[app.id,vic.userId,'none',rule(vic,'none')])),/lower or remove/);
  await assert.rejects(withActor(bob,()=>db.query('SELECT trialy_security.set_app_role($1,$2,$3,$4)',[app.id,vic.userId,'viewer',rule(vic,'editor')])),/Invalid access rule/);
  await assert.rejects(withActor({...bob,origin:'ai'},()=>db.query('SELECT trialy_security.set_app_role($1,$2,$3,$4)',[app.id,vic.userId,'viewer',rule(vic,'viewer')])),/signed-in person/);
  await assert.rejects(withActor(eve,()=>db.query("UPDATE workspace_components SET source='taken over' WHERE id=$1",[app.id])),/Only an owner of this app/);
  await assert.rejects(withActor(eve,()=>db.query("UPDATE workspace_components SET team_default_role='editor' WHERE id=$1",[app.id])),/Only an owner of this app/);
  await assert.rejects(withActor(eve,()=>db.query("INSERT INTO app_members(workspace_id,app_id,user_id,role) VALUES($1,$2,$3,'owner')",[w,app.id,eve.userId])),/permission denied|row-level security/);
  assert.equal((await withActor(eve,()=>db.query('SELECT trialy_security.app_role($1,$2) AS role',[app.id,eve.userId]))).rows[0].role,'viewer');

  // R1: an organization keeps at least one owner.
  await assert.rejects(setup.query("UPDATE memberships SET role='editor' WHERE user_id=$1",[owner.userId]),/at least one owner/);
  await setup.query("UPDATE memberships SET role='owner' WHERE user_id=$1",[alice.userId]);
  await setup.query("UPDATE memberships SET role='editor' WHERE user_id=$1",[owner.userId]);
 }finally{await pg.close();}
});
