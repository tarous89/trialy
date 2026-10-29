import { randomUUID } from 'node:crypto';
import type { Connection } from '../db/database.js';
import { fail } from '../shared/schema.js';
// Called only after OIDC/JWT verification. Never link identities by email.
export async function upsertIdentity(db:Connection,issuer:string,subject:string,email='',name='') {
 if(!subject)fail(401,'invalid_identity','Identity could not be verified');
 const key=`${issuer}|${subject}`;
 const r=await db.query(`INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)
 ON CONFLICT(subject) DO UPDATE SET email=COALESCE(NULLIF($3,''),users.email),name=COALESCE(NULLIF($5,''),users.name) RETURNING id`,[randomUUID(),key,email,name||'TrialAgents user',name]);
 return r.rows[0].id as string;
}
