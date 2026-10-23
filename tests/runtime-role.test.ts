import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';import {runtimeRoleAudit,enforceRuntimeRole} from '../src/db/runtime-policy.js';
test('runtime role forbids DDL and history mutation; audit rejects owner and privilege regression',async()=>{
 const pg=new PGlite();try{for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+f,'utf8'));const db:any={query:(s:string,v:any[])=>pg.query(s,v)};
 assert.equal((await runtimeRoleAudit(db)).restricted,false);await assert.rejects(enforceRuntimeRole(db,true),/overprivileged/);
 await pg.exec(await readFile('ops/runtime-role.sql','utf8'));await pg.exec('SET ROLE trialy_runtime');
 const audit=await runtimeRoleAudit(db);assert.equal(audit.restricted,true,JSON.stringify(audit));await enforceRuntimeRole(db,true);
 for(const sql of ['CREATE TABLE forbidden_test(id int)','TRUNCATE records','DELETE FROM revisions','UPDATE document_payloads SET bytes=bytes','DELETE FROM audit_events'])await assert.rejects(pg.exec(sql),/permission denied/);
 await pg.exec('SELECT id FROM records LIMIT 1');await pg.exec('RESET ROLE');await pg.exec('GRANT TRUNCATE ON records TO trialy_runtime');await pg.exec('SET ROLE trialy_runtime');assert.ok((await runtimeRoleAudit(db)).failures.includes('truncate:records'));
 }finally{await pg.close();}
});
