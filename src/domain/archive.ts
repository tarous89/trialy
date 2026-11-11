import type {Connection} from '../db/database.js';
import type {Actor,Field} from '../shared/schema.js';
import {fail} from '../shared/schema.js';
import {access,typeAccess} from './permissions.js';
import {applyTypePolicy} from './effective-access.js';
import {audit,revision} from './evidence.js';

/** An archived field keeps its definition; record values are never rewritten. */
export type ArchivedField={field:Field;archivedAt:string;archivedBy:string|null;appId:string|null};
const J=JSON.stringify;
export const archivedFieldsOf=(row:any):ArchivedField[]=>Array.isArray(row?.archived_fields)?row.archived_fields:[];

/**
 * Resolve a table for an app save that may bind archived fields again. Archived
 * definitions are merged back so validation and policy can see them; nothing is
 * written here. Ordinary reads keep using typeAccess, which never sees them.
 */
export async function typeAccessIncludingArchived(db:Connection,a:Actor,w:string,typeId:string,write=false){
 // Common case: typeAccess already loads the whole row, including archived_fields.
 let resolved:Awaited<ReturnType<typeof typeAccess>>|null=null;
 try{resolved=await typeAccess(db,a,w,typeId,write);}catch(e){if((e as any).status!==404)throw e;}
 if(resolved&&!archivedFieldsOf(resolved.type).length)return resolved;
 const row=resolved?.type??(await db.query('SELECT * FROM entity_types WHERE id=$1 AND workspace_id=$2',[typeId,w])).rows[0];
 if(!row||row.deleted_at||!resolved&&!archivedFieldsOf(row).length)fail(404,'not_found','Table not found');
 const archived=archivedFieldsOf(row).filter(x=>!row.fields.some((f:Field)=>f.key===x.field.key));
 const type={...row,fields:[...row.fields,...archived.map(x=>x.field)]},p=await access(db,a,w,write),policy=await applyTypePolicy(db,a,p,type);
 if(!policy.read_fields.length)fail(404,'not_found','Table not found');if(write&&!policy.write_fields.length)fail(403,'field_read_only','This table is read-only');
 return {type,policy};
}

/** What a reviewed app save will restore, or cannot restore, before it is confirmed. */
export async function bindingRestores(db:Connection,w:string,bindings:{typeId:string;fields:string[]}[]){
 const restores:{typeId:string;table:string;tableArchived:boolean;fields:{key:string;name:string}[]}[]=[],unavailable:{typeId:string;table:string|null;fields:string[]}[]=[];
 if(!bindings?.length)return {restores,unavailable};
 const rows=(await db.query('SELECT id,name,fields,archived_fields,archived_at,deleted_at FROM entity_types WHERE workspace_id=$1 AND id=ANY($2::uuid[])',[w,bindings.map(b=>b.typeId).filter(id=>/^[0-9a-f-]{36}$/i.test(id))])).rows;
 for(const b of bindings){
  const row=rows.find((r:any)=>r.id===b.typeId);
  // A missing row is a draft table created in the same save; tables are never hard-deleted.
  if(!row)continue;
  if(row.deleted_at){unavailable.push({typeId:b.typeId,table:row.name,fields:b.fields});continue;}
  const archived=archivedFieldsOf(row).filter(x=>b.fields.includes(x.field.key)&&!row.fields.some((f:Field)=>f.key===x.field.key));
  const missing=b.fields.filter(k=>!row.fields.some((f:Field)=>f.key===k)&&!archived.some(x=>x.field.key===k));
  if(archived.length||row.archived_at)restores.push({typeId:row.id,table:row.name,tableArchived:!!row.archived_at,fields:archived.map(x=>({key:x.field.key,name:x.field.name}))});
  if(missing.length)unavailable.push({typeId:row.id,table:row.name,fields:missing});
 }
 return {restores,unavailable};
}

/** Move unused empty fields into the archived list. An emptied schema archives its table. */
export async function archiveFields(tx:Connection,a:Actor,w:string,p:any,type:any,keys:string[],appId:string|null,reason:string){
 const now=new Date().toISOString(),moved=type.fields.filter((f:Field)=>keys.includes(f.key));if(!moved.length)return;
 const fields=type.fields.filter((f:Field)=>!keys.includes(f.key));
 const archivedFields=[...archivedFieldsOf(type).filter(x=>!keys.includes(x.field.key)),...moved.map((field:Field)=>({field,archivedAt:now,archivedBy:a.userId,appId}))];
 const tableArchived=!fields.length&&!type.archived_at,version=type.version+1;
 await tx.query('UPDATE entity_types SET fields=$1,archived_fields=$2,version=$3,archived_at=CASE WHEN $5 THEN now() ELSE archived_at END,archived_by=CASE WHEN $5 THEN $6::uuid ELSE archived_by END WHERE id=$4',[J(fields),J(archivedFields),version,type.id,tableArchived,a.userId]);
 const next={id:type.id,name:type.name,fields,archivedFields,version,archived:tableArchived||!!type.archived_at};
 await revision(tx,a,w,type.id,'type',version,next);
 await audit(tx,a,p,'field.archived',type.id,{fields:type.fields.map((f:Field)=>f.key)},{archived:moved.map((f:Field)=>({key:f.key,name:f.name})),appId},reason);
 if(tableArchived)await audit(tx,a,p,'table.archived',type.id,{name:type.name,archived:false},{name:type.name,archived:true,appId},reason);
}

/**
 * Bring archived fields (and their table) back into the active schema. Owner
 * only, because it changes the shared schema. Name clashes add "(restored)".
 */
export async function restoreArchivedSchema(tx:Connection,a:Actor,w:string,p:any,typeId:string,keys:string[]|'all',options:{appId?:string|null;reason:string}){
 if(p.role!=='owner')fail(403,'owner_required','Only the workspace owner can restore archived fields and tables');
 const row=(await tx.query('SELECT * FROM entity_types WHERE id=$1 AND workspace_id=$2 FOR UPDATE',[typeId,w])).rows[0];
 if(!row||row.deleted_at)fail(404,'table_deleted','This table was deleted permanently and cannot be restored');
 const archived=archivedFieldsOf(row),wanted=keys==='all'?archived.map(x=>x.field.key):keys;
 const missing=wanted.filter(k=>!archived.some(x=>x.field.key===k)&&!row.fields.some((f:Field)=>f.key===k));
 if(missing.length)fail(404,'field_unavailable',`These fields were deleted permanently: ${missing.join(', ')}`);
 const fields=[...row.fields],restored:{key:string;name:string}[]=[];
 for(const item of archived.filter(x=>wanted.includes(x.field.key))){
  if(fields.some(f=>f.key===item.field.key))continue;
  const name=fields.some(f=>f.name===item.field.name)?`${item.field.name} (restored)`.slice(0,100):item.field.name;
  fields.push({...item.field,name});restored.push({key:item.field.key,name});
 }
 const unarchive=!!row.archived_at&&fields.length>0;
 if(!restored.length&&!unarchive)return {typeId,fields:[],tableRestored:false,name:row.name};
 const clash=unarchive&&(await tx.query('SELECT 1 FROM entity_types WHERE workspace_id=$1 AND id<>$2 AND name=$3 AND archived_at IS NULL AND deleted_at IS NULL',[w,typeId,row.name])).rows.length>0;
 const name=clash?`${row.name} (restored)`.slice(0,100):row.name,archivedFields=archived.filter(x=>!wanted.includes(x.field.key)),version=row.version+1;
 await tx.query('UPDATE entity_types SET name=$1,fields=$2,archived_fields=$3,version=$4,archived_at=CASE WHEN $6 THEN NULL ELSE archived_at END,archived_by=CASE WHEN $6 THEN NULL ELSE archived_by END WHERE id=$5',[name,J(fields),J(archivedFields),version,typeId,unarchive]);
 await revision(tx,a,w,typeId,'type',version,{id:typeId,name,fields,archivedFields,version});
 if(restored.length)await audit(tx,a,p,'field.restored',typeId,{archived:restored.map(f=>f.key)},{restored,appId:options.appId??null},options.reason);
 if(unarchive)await audit(tx,a,p,'table.restored',typeId,{name:row.name,archived:true},{name,archived:false,appId:options.appId??null},options.reason);
 return {typeId,fields:restored,tableRestored:unarchive,name};
}

/** Restore everything a reviewed app save binds again, inside that save's transaction. */
export async function restoreBoundSchema(tx:Connection,a:Actor,w:string,p:any,bindings:{typeId:string;fields:string[]}[],appId:string,appName:string){
 const {restores}=await bindingRestores(tx,w,bindings),done=[];
 for(const r of restores){if(!r.fields.length)continue;const binding=bindings.find(b=>b.typeId===r.typeId)!;done.push(await restoreArchivedSchema(tx,a,w,p,r.typeId,binding.fields.filter(k=>r.fields.some(f=>f.key===k)),{appId,reason:`Bound again by app ${appName}`}));}
 return done;
}
