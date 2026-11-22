import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {workspaceHome} from '../src/workspace/home.js';
test('legacy account receives one default project; archived projects and tool placements remain intact',async()=>{
 const pg=new PGlite();try{
 for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')&&f<'039').sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:f=>pg.transaction(tx=>f(tx as Connection)),close:()=>pg.close()},a={userId:randomUUID(),origin:'human' as const};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'old@example.invalid','Old account']);
 await pg.exec(await readFile('migrations/041_effective_access.sql','utf8'));
 // The current code reads the helper ownership columns of migration 078; this partial schema needs them too.
 await pg.exec('ALTER TABLE foundation_functions ADD COLUMN app_id uuid, ADD COLUMN retired_at timestamptz');
 await pg.exec('CREATE TABLE assistant_limits(workspace_id uuid,user_id uuid,assistant text,data_level text,apps_level text)');
 // Current code reads the separate Claude switches added by migration 057; this legacy schema only needs the columns.
 await pg.exec("ALTER TABLE workspaces ADD COLUMN claude_enabled boolean NOT NULL DEFAULT false;ALTER TABLE workspace_access ADD COLUMN claude_enabled boolean NOT NULL DEFAULT false;");
 // Likewise the archive-first columns from migration 060.
 await pg.exec("ALTER TABLE workspace_components ADD COLUMN deleted_at timestamptz;ALTER TABLE entity_types ADD COLUMN archived_fields jsonb NOT NULL DEFAULT '[]',ADD COLUMN archived_at timestamptz,ADD COLUMN deleted_at timestamptz;");
 // The lean app index (loading speed L1.1) names the app columns of later migrations (060, 081 and the Home placement columns) and reads app_members.
 await pg.exec("ALTER TABLE workspace_components ADD COLUMN IF NOT EXISTS archived_at timestamptz,ADD COLUMN IF NOT EXISTS team_default_role text NOT NULL DEFAULT 'editor',ADD COLUMN IF NOT EXISTS home_project_id uuid,ADD COLUMN IF NOT EXISTS home_placement_version integer NOT NULL DEFAULT 0,ADD COLUMN IF NOT EXISTS resource_kind text NOT NULL DEFAULT 'generic',ADD COLUMN IF NOT EXISTS manifest jsonb,ADD COLUMN IF NOT EXISTS source_access text NOT NULL DEFAULT 'workspace',ADD COLUMN IF NOT EXISTS assets jsonb NOT NULL DEFAULT '[]',ADD COLUMN IF NOT EXISTS execution jsonb NOT NULL DEFAULT '[]';CREATE TABLE IF NOT EXISTS app_members(workspace_id uuid,app_id uuid,user_id uuid,role text);ALTER TABLE entity_types ADD COLUMN IF NOT EXISTS origin_app_id uuid;");const service=new Service(db),old=await service.createWorkspace(a,'Legacy'),deleted=await service.createWorkspace(a,'Deleted starter');await service.setAi(a,old.id,true);
 const archivedId=randomUUID();await db.query("INSERT INTO workspace_nodes(id,workspace_id,kind,name,archived) VALUES($1,$2,'project','Project 1',true)",[archivedId,deleted.id]);
 const migration=await readFile('migrations/039_existing_account_project.sql','utf8');await pg.exec(migration);await pg.exec(migration);
 const projects=(await workspaceHome(db,a,old.id)).projects;assert.equal(projects.length,1);assert.equal(projects[0].name,'Project 1');assert.ok(projects[0].createdAt);
 assert.deepEqual((await workspaceHome(db,{...a,origin:'ai'},old.id)).projects,projects);
 assert.equal((await workspaceHome(db,a,deleted.id)).projects.length,0);assert.equal((await db.query('SELECT count(*) AS n FROM workspace_nodes WHERE workspace_id=$1',[deleted.id])).rows[0].n,1);
 assert.equal((await db.query("SELECT count(*) AS n FROM audit_events WHERE object_id=$1 AND action='project.created'",[projects[0].id])).rows[0].n,1);
 await pg.exec(await readFile('migrations/040_project_description.sql','utf8'));const f=new WorkspaceFoundation(db),id=projects[0].id;
 const edit=await f.preview(a,old.id,{kind:'rename_node',nodeId:id,expectedVersion:0,name:'Outreach',description:'Plan vendor outreach'});
 assert.equal((await f.nodes(a,old.id)).nodes[0].description,'');await f.confirm(a,old.id,edit.id,edit.digest);
 assert.equal((await f.nodes(a,old.id)).nodes[0].description,'Plan vendor outreach');
 const rename=await f.preview(a,old.id,{kind:'rename_node',nodeId:id,expectedVersion:1,name:'Outreach 2'});await f.confirm(a,old.id,rename.id,rename.digest);
 assert.equal((await f.nodes(a,old.id)).nodes[0].description,'Plan vendor outreach');
 await assert.rejects(()=>f.preview(a,old.id,{kind:'rename_node',nodeId:id,expectedVersion:0,name:'Stale',description:'Wrong'}));

 }finally{await pg.close();}
});

