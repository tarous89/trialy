import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {workspaceHome} from '../src/workspace/home.js';
test('legacy account receives one default project; archived projects and tool placements remain intact',async()=>{
 const pg=new PGlite();try{
 for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')&&f<'039').sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:f=>pg.transaction(tx=>f(tx as Connection)),close:()=>pg.close()},a={userId:randomUUID(),origin:'human' as const};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'old@example.invalid','Old account']);
 const service=new Service(db),old=await service.createWorkspace(a,'Legacy'),deleted=await service.createWorkspace(a,'Deleted starter');await service.setAi(a,old.id,true);
 const archivedId=randomUUID();await db.query("INSERT INTO workspace_nodes(id,workspace_id,kind,name,archived) VALUES($1,$2,'project','Project 1',true)",[archivedId,deleted.id]);
 const migration=await readFile('migrations/039_existing_account_project.sql','utf8');await pg.exec(migration);await pg.exec(migration);
 const projects=(await workspaceHome(db,a,old.id)).projects;assert.equal(projects.length,1);assert.equal(projects[0].name,'Project 1');assert.ok(projects[0].createdAt);
 assert.deepEqual((await workspaceHome(db,{...a,origin:'ai'},old.id)).projects,projects);
 assert.equal((await workspaceHome(db,a,deleted.id)).projects.length,0);assert.equal((await db.query('SELECT count(*) AS n FROM workspace_nodes WHERE workspace_id=$1',[deleted.id])).rows[0].n,1);
 assert.equal((await db.query("SELECT count(*) AS n FROM audit_events WHERE object_id=$1 AND action='project.created'",[projects[0].id])).rows[0].n,1);
 }finally{await pg.close();}
});
