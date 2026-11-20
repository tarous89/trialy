import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';

// I1: migration 079 moves every project to the top level and copies down what it inherited from its folders.
test('flattening folders keeps each inherited restriction and leaves folders as archived history',async()=>{
 const pg=new PGlite();
 try{
  const files=(await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort(),at=files.indexOf('079_projects_without_folders.sql');assert.ok(at>0);
  for(const file of files.slice(0,at))await pg.exec(await readFile('migrations/'+file,'utf8'));
  // The current application reads personal assistant limits with every access check (migration 085). A stand-in table lets it build the old state; it is dropped before the later migrations run.
  await pg.exec('CREATE TABLE assistant_limits(workspace_id uuid,user_id uuid,assistant text,data_level text,apps_level text)');
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  const owner={userId:randomUUID(),origin:'human' as const},member={userId:randomUUID(),origin:'human' as const},other={userId:randomUUID(),origin:'human' as const};
  for(const u of [owner,member,other])await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[u.userId,u.userId,u.userId+'@example.invalid','User']);
  const s=new Service(db),w=await s.createWorkspace(owner,'Folders');
  for(const u of [member,other])await s.share(owner,w.id,u.userId,'editor',[],null,true);
  const node=async(kind:string,name:string,parent:string|null,extra:{users?:string[]|null;ai?:boolean;archived?:boolean}={})=>{const id=randomUUID();await db.query('INSERT INTO workspace_nodes(id,workspace_id,kind,name,parent_id,allowed_users,ai_enabled,archived) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,w.id,kind,name,parent,extra.users===undefined||extra.users===null?null:JSON.stringify(extra.users),extra.ai??true,extra.archived??false]);return id;};
  const outer=await node('folder','Outer',null,{users:[member.userId,other.userId],ai:false});
  const inner=await node('folder','Inner',outer,{users:[member.userId]});
  const nested=await node('project','Nested',inner,{users:[member.userId,other.userId]});
  const open=await node('project','Open',outer);
  const archivedFolder=await node('folder','Old',null,{archived:true});
  const sleeping=await node('project','Sleeping',archivedFolder);
  const top=await node('project','Top',null,{users:[other.userId]});
  // A per-person rule on a folder applied to the projects inside it. An allow on the project does not beat a deny above it.
  const rules=[{subject:other.userId,kind:'project',resourceId:outer,read:'deny',write:'inherit'},{subject:other.userId,kind:'project',resourceId:nested,read:'allow',write:'allow'},{subject:member.userId,kind:'project',resourceId:inner,read:'allow',write:'deny'},{subject:member.userId,kind:'project',resourceId:top,read:'allow',write:'inherit'}];
  await db.query('UPDATE workspaces SET permission_rules=$2 WHERE id=$1',[w.id,JSON.stringify(rules)]);
  const version=(await db.query('SELECT access_version FROM workspaces WHERE id=$1',[w.id])).rows[0].access_version;
  await pg.exec('DROP TABLE assistant_limits');
  for(const file of files.slice(at))await pg.exec(await readFile('migrations/'+file,'utf8'));
  const row=async(id:string)=>(await db.query('SELECT * FROM workspace_nodes WHERE id=$1',[id])).rows[0];
  for(const id of [nested,open,sleeping,top])assert.equal((await row(id)).parent_id,null);
  assert.deepEqual((await row(nested)).allowed_users,[member.userId]);assert.equal((await row(nested)).ai_enabled,false);assert.equal((await row(nested)).archived,false);
  assert.deepEqual((await row(open)).allowed_users,[member.userId,other.userId]);assert.equal((await row(open)).ai_enabled,false);
  assert.equal((await row(sleeping)).archived,true);
  assert.deepEqual((await row(top)).allowed_users,[other.userId]);assert.equal((await row(top)).version,0);
  for(const id of [outer,inner,archivedFolder]){const f=await row(id);assert.equal(f.kind,'folder');assert.equal(f.archived,true);assert.equal(f.parent_id,null);}
  const saved=(await db.query('SELECT permission_rules,access_version FROM workspaces WHERE id=$1',[w.id])).rows[0];assert.ok(saved.access_version>version);
  const rule=(subject:string,resourceId:string)=>saved.permission_rules.filter((r:any)=>r.kind==='project'&&r.subject===subject&&r.resourceId===resourceId);
  assert.deepEqual(rule(other.userId,nested).map((r:any)=>[r.read,r.write]),[['deny','allow']]);
  assert.deepEqual(rule(other.userId,open).map((r:any)=>[r.read,r.write]),[['deny','inherit']]);
  assert.deepEqual(rule(member.userId,nested).map((r:any)=>[r.read,r.write]),[['allow','deny']]);
  assert.deepEqual(rule(member.userId,top).map((r:any)=>[r.read,r.write]),[['allow','inherit']]);
  // Through the application: what was hidden stays hidden, and nothing new can be nested or made a folder.
  const f=new WorkspaceFoundation(db),names=async(a:any)=>(await f.nodes(a,w.id)).nodes.filter((n:any)=>n.kind==='project').map((n:any)=>n.name).sort();
  assert.deepEqual(await names(member),['Nested','Open','Sleeping']);
  assert.deepEqual(await names(other),['Sleeping','Top']);
  assert.deepEqual(await names({...owner,origin:'ai'}),['Sleeping','Top']);
  await assert.rejects(db.query("INSERT INTO workspace_nodes(id,workspace_id,kind,name) VALUES($1,$2,'folder','New folder')",[randomUUID(),w.id]),/workspace_nodes_no_active_folder/);
  await assert.rejects(db.query("INSERT INTO workspace_nodes(id,workspace_id,kind,name,parent_id) VALUES($1,$2,'project','Child',$3)",[randomUUID(),w.id,top]),/workspace_nodes_top_level/);
  const restore=f.preview(owner,w.id,{kind:'archive_node',nodeId:outer,expectedVersion:(await row(outer)).version,archived:false,reason:'Bring the folder back'});
  await assert.rejects(restore,(e:any)=>e.code==='folders_removed');
 }finally{await pg.close();}
});
