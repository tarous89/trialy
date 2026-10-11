import {randomUUID,createHash} from 'node:crypto';
import type {Connection} from '../db/database.js';
import type {Actor} from '../shared/schema.js';
const json=JSON.stringify;
export const checksum=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
export async function audit(tx:Connection,a:Actor,p:any,action:string,objectId:string|null,before:unknown,after:unknown,reason?:string) {
 await tx.query('INSERT INTO audit_events(id,workspace_id,tenant_id,actor_id,action,object_id,origin,before_value,after_value,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[randomUUID(),p.id,p.tenant_id,a.userId,action,objectId,a.origin,json(before),json(after),reason??null]);
}
export async function revision(tx:Connection,a:Actor,w:string,id:string,kind:string,version:number,snapshot:unknown) {
 await tx.query('INSERT INTO revisions(id,workspace_id,object_id,object_kind,version,snapshot,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),w,id,kind,version,json(snapshot),a.userId]);
}
