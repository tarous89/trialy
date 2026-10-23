import type {Connection} from './database.js';
/** Audits database authority, not application field policies or RLS correctness. */
export async function runtimeRoleAudit(db:Connection){
 const role=(await db.query(`SELECT current_user AS name,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb FROM pg_roles WHERE rolname=current_user`)).rows[0];
 const tables=(await db.query(`SELECT c.relname AS name,pg_has_role(current_user,c.relowner,'USAGE') AS owner_authority,
 has_table_privilege(current_user,c.oid,'TRUNCATE') AS can_truncate,
 has_table_privilege(current_user,c.oid,'UPDATE') AS can_update,
 has_table_privilege(current_user,c.oid,'DELETE') AS can_delete
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'`)).rows;
 const schema=(await db.query("SELECT has_schema_privilege(current_user,'public','CREATE') AS can_create")).rows[0];
 const immutable=new Set(['document_versions','document_payloads','revisions','audit_events','approvals','commit_receipts','submission_acceptances','foundation_revisions','foundation_receipts','workspace_receipts']);
 const failures:string[]=[];
 if(!role)failures.push('role_missing');
 if(role?.rolsuper||role?.rolbypassrls||role?.rolcreaterole||role?.rolcreatedb)failures.push('elevated_role');
 if(schema.can_create)failures.push('schema_create');
 for(const t of tables){if(t.owner_authority)failures.push('owner:'+t.name);if(t.can_truncate)failures.push('truncate:'+t.name);if(immutable.has(t.name)&&(t.can_update||t.can_delete))failures.push('mutable_history:'+t.name);}
 return {role:role?.name,restricted:failures.length===0,failures,scope:'Role privileges only; this does not verify tenant or field isolation'};
}
export async function enforceRuntimeRole(db:Connection,required=process.env.REQUIRE_RESTRICTED_DATABASE_ROLE==='true'){
 if(!required)return;const audit=await runtimeRoleAudit(db);if(!audit.restricted)throw Error('Runtime database role is overprivileged; run db:runtime-audit using the intended restricted connection');
}
