import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {runtimeConnection} from '../src/db/runtime-connection.js';
import {provisionRuntime} from '../scripts/provision-runtime.js';
import {runtimeRoleAudit} from '../src/db/runtime-policy.js';
import type {Database,Connection} from '../src/db/database.js';
test('private migration hook provisions separate audited web/worker logins idempotently',async()=>{
 const pg=new PGlite();try{for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+f,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:f=>pg.transaction(tx=>f({query:async(q,v)=>q.startsWith('-- Run as')?(await tx.exec(q),{rows:[]}):tx.query(q,v) as any})),close:async()=>{}};
 for(const kind of ['web','worker'] as const){const env={DATABASE_URL:'postgres://owner:bootstrap@example.invalid/trialy',TRIALY_RUNTIME_PASSWORD:'x'.repeat(43),TRIALY_RUNTIME_KIND:kind,REQUIRE_RESTRICTED_DATABASE_ROLE:'false',MIGRATION_DATABASE_URL:'postgres://owner:bootstrap@example.invalid/trialy'};
 await provisionRuntime(db,env);await provisionRuntime(db,env);
 const url=new URL(runtimeConnection(env,kind));assert.equal(url.username,'trialy_'+kind+'_login');assert.equal(url.password,'x'.repeat(43));assert.equal(env.TRIALY_RUNTIME_PASSWORD,undefined);assert.equal(env.MIGRATION_DATABASE_URL,undefined);assert.equal(env.REQUIRE_RESTRICTED_DATABASE_ROLE,'true');
 await pg.exec('SET ROLE trialy_'+kind+'_login');const audit=await runtimeRoleAudit(db);assert.equal(audit.restricted,true,JSON.stringify(audit));assert.equal((await db.query("SELECT pg_has_role(current_user,'trialy_worker','MEMBER') AS worker")).rows[0].worker,kind==='worker');await pg.exec('RESET ROLE');
 }
 await assert.rejects(provisionRuntime(db,{TRIALY_RUNTIME_PASSWORD:"bad'",TRIALY_RUNTIME_KIND:'web'}),/Invalid/);
 assert.throws(()=>runtimeConnection({DATABASE_URL:'postgres://example.invalid/db',TRIALY_RUNTIME_PASSWORD:'bad'},'web'),/Invalid/);
 }finally{await pg.close();}
});
