import type {Database} from '../src/db/database.js';
import {readFile} from 'node:fs/promises';
/** Runs only in the existing private-network migration hook; never logs credentials. */
export async function provisionRuntime(db:Database,env:NodeJS.ProcessEnv){
 const password=env.TRIALY_RUNTIME_PASSWORD;if(!password)return;
 if(!/^[A-Za-z0-9_-]{43,128}$/.test(password))throw Error('Invalid runtime database secret configuration');
 const kind=env.TRIALY_RUNTIME_KIND;if(kind!=='web'&&kind!=='worker')throw Error('TRIALY_RUNTIME_KIND must be web or worker');
 const login=kind==='web'?'trialy_web_login':'trialy_worker_login';
 try{await db.transaction(async tx=>{
  await tx.query('SELECT pg_advisory_xact_lock(873469)');await tx.query(await readFile('ops/runtime-role.sql','utf8'));
  const existing=(await tx.query('SELECT oid FROM pg_roles WHERE rolname=$1',[login])).rows[0];
  if(!existing)await tx.query(`CREATE ROLE ${login} LOGIN INHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);
  // The validated secret contains no SQL delimiters. Do not surface driver errors containing this statement.
  await tx.query(`ALTER ROLE ${login} WITH LOGIN INHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE PASSWORD '${password}'`);
  await tx.query(`GRANT ${kind==='worker'?'trialy_worker':'trialy_runtime'} TO ${login}`);
  if(kind==='web')await tx.query(`REVOKE trialy_worker FROM ${login}`);
 });}catch(e){const code=(e as {code?:string}).code;throw Error('Runtime role provisioning failed'+(code&&/^[A-Z0-9]{5}$/.test(code)?' (SQLSTATE '+code+')':'')+'; inspect role privileges inside the private migration environment. No credentials logged.');}
}
