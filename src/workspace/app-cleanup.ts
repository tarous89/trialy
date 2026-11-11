import type {Connection} from '../db/database.js';
import type {Actor} from '../shared/schema.js';
import {typeAccess,visibleFields} from '../domain/permissions.js';
import {archiveFields} from '../domain/archive.js';

/**
 * Called inside an app save transaction (bindings removed) or a permanent app
 * deletion, after workflow retirement. Never on archive: archiving an app keeps
 * its bindings, which protect their fields until the app is deleted permanently.
 * Unused empty fields are archived, not removed; values and history are kept.
 */
export async function cleanupRemovedAppFields(tx:Connection,a:Actor,w:string,p:any,before:any,after:any){
 if(p.role!=='owner'||!before)return;
 const remaining=after.bindings??[];
 for(const binding of before.bindings??[]){
  const candidates=binding.fields.filter((key:string)=>!remaining.some((b:any)=>b.typeId===binding.typeId&&b.fields.includes(key)));
  if(!candidates.length)continue;
  let access;try{access=await typeAccess(tx,a,w,binding.typeId,true);}catch(e){if([403,404].includes((e as any).status))continue;throw e;}
  const {type,policy}=access;
  // Schema cleanup cannot broaden the app editor's database rights.
  if(visibleFields(type.fields,policy,a).length!==type.fields.length||type.fields.some((f:any)=>!policy.write_fields.includes(f.key)))continue;
  await tx.query('SELECT id FROM entity_types WHERE id=$1 FOR UPDATE',[type.id]);
  const unused=(await tx.query('SELECT trialy_security.unused_app_fields($1,$2,$3) AS key',[w,type.id,candidates])).rows.map(r=>r.key);
  if(!unused.length)continue;
  const current=(await tx.query('SELECT * FROM entity_types WHERE id=$1',[type.id])).rows[0];
  await archiveFields(tx,a,w,p,current,unused,after.id??before.id,`Archived unused empty fields after changing app ${after.name??before.name}`);
 }
}
