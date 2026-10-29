import {z} from 'zod';
import {id,fail,type Actor} from '../shared/schema.js';
import type {Connection} from '../db/database.js';
import {typeAccess,visibleFields} from '../domain/permissions.js';
import {derived} from '../shared/formulas.js';
export const resourceKind=z.enum(['generic','tracker','form','visualization']);
export const resourceManifest=z.object({version:z.literal(1),scope:z.enum(['project','workspace']).default('project'),fields:z.array(z.object({id:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),typeId:id,field:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),schemaVersion:z.number().int().min(0),kind:z.string().min(1).max(30),mode:z.enum(['read','write']),label:z.string().min(1).max(100).optional()}).strict()).min(1).max(200)}).strict();
export type Manifest=z.infer<typeof resourceManifest>;
export async function validateResource(db:Connection,a:Actor,w:string,c:any,partial=false){
 const kind=c.resourceKind??c.resource_kind??'generic',raw=c.manifest;
 if(kind!=='generic'&&!raw)fail(400,'manifest_required','Trackers, forms and dashboards require a connected-data manifest');
 if(!raw)return;
 const m=resourceManifest.parse(raw);
 if(c.format!=='frontend-js')fail(400,'manifest_format','Connected resources use frontend-js');
 if(new Set(m.fields.map(f=>f.id)).size!==m.fields.length)fail(400,'duplicate_control','Manifest field IDs must be unique');
 for(const b of c.bindings){
  let pair;try{pair=await typeAccess(db,a,w,b.typeId);}catch(e){if(partial)continue;throw e;}const {type,policy}=pair,visible=visibleFields(type.fields,policy,a);
  for(const key of b.fields)if(!m.fields.some(f=>f.typeId===b.typeId&&f.field===key))fail(400,'unmapped_binding','Every bound field must be declared in the manifest');
  for(const f of m.fields.filter(f=>f.typeId===b.typeId)){
   const field=visible.find(k=>k.key===f.field);
   if(partial&&!field)continue;
   if(!b.fields.includes(f.field)||!field)fail(403,'manifest_binding','Manifest references an unavailable or undeclared field');
   if(type.version!==f.schemaVersion||field.kind!==f.kind)fail(409,'manifest_stale','Schema changed; review the resource bindings again');
   if(f.mode==='write'&&derived(field))fail(400,'derived_read_only','Calculated fields are read-only');
  }
 }
 if(m.fields.some(f=>!c.bindings.some((b:any)=>b.typeId===f.typeId)))fail(400,'unmapped_binding','Manifest table must be in component bindings');
}
export function requireManifestWrite(c:any,typeId:string,keys:string[]){
 if(c.manifest&&keys.some(key=>!c.manifest.fields.some((f:any)=>f.typeId===typeId&&f.field===key&&f.mode==='write')))fail(403,'manifest_write','Write exceeds the reviewed manifest');
}

