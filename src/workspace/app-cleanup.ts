import type {Connection} from '../db/database.js';
import type {Actor} from '../shared/schema.js';
import {typeAccess,visibleFields} from '../domain/permissions.js';
import {audit,revision} from '../domain/evidence.js';

/** Called inside the app save transaction, after workflow cancellation. Never rewrites records. */
export async function cleanupRemovedAppFields(tx:Connection,a:Actor,w:string,p:any,before:any,after:any){
 if(p.role!=='owner'||!before)return;
 const remaining=after.archived?[]:after.bindings;
 for(const binding of before.bindings??[]){
  const candidates=binding.fields.filter((key:string)=>!remaining.some((b:any)=>b.typeId===binding.typeId&&b.fields.includes(key)));
  if(!candidates.length)continue;
  let access;try{access=await typeAccess(tx,a,w,binding.typeId,true);}catch(e){if([403,404].includes((e as any).status))continue;throw e;}
  const {type,policy}=access;
  // Schema cleanup cannot broaden the deleting app editor's database rights.
  if(visibleFields(type.fields,policy,a).length!==type.fields.length||type.fields.some((f:any)=>!policy.write_fields.includes(f.key)))continue;
  await tx.query('SELECT id FROM entity_types WHERE id=$1 FOR UPDATE',[type.id]);
  const removed=(await tx.query('SELECT trialy_security.unused_app_fields($1,$2,$3) AS key',[w,type.id,candidates])).rows.map(r=>r.key);
  if(!removed.length)continue;
  const fields=type.fields.filter((f:any)=>!removed.includes(f.key)),next={...type,fields,version:type.version+1};
  // An all-empty schema becomes a retained, invisible table identity. No records,
  // immutable history or foreign keys are deleted; schema history remains auditable.
  await tx.query('UPDATE entity_types SET fields=$1,version=$2 WHERE id=$3',[JSON.stringify(fields),next.version,type.id]);
  await revision(tx,a,w,type.id,'type',next.version,next);
  await audit(tx,a,p,'app.empty_fields_removed',type.id,type,next,`Removed unused empty fields after changing app ${after.id}`);
 }
}
