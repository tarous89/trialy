import type {Connection} from '../db/database.js';
import {typeAccess,visibleFields} from '../domain/permissions.js';
import {derived} from '../shared/formulas.js';
import {fail,type Actor} from '../shared/schema.js';

/**
 * E6: a dynamic binding approves "every field of this table that the app binds, minus exceptFields".
 * It is re-resolved at every check, so adding, renaming or removing app fields never needs re-approval,
 * while it can never reach beyond the app's current binding or the actor's current read/write access.
 */
export type FieldBinding={typeId:string;fields:string[];dynamic?:true;exceptFields?:string[]};

export async function resolveBinding<T extends FieldBinding>(db:Connection,a:Actor,w:string,app:{bindings:{typeId:string;fields:string[]}[]},b:T,write=false):Promise<T>{
 if(!b.dynamic)return b;
 const bound=app.bindings.find(x=>x.typeId===b.typeId);if(!bound)fail(403,'monitoring_fields','This table is no longer connected to the app');
 const {type,policy}=await typeAccess(db,a,w,b.typeId,write),except=new Set(b.exceptFields??[]);
 const allowed=new Set(visibleFields(type.fields,policy,a).filter(f=>!write||policy.write_fields.includes(f.key)&&!derived(f)).map(f=>f.key));
 const fields=bound!.fields.filter(k=>allowed.has(k)&&!except.has(k));
 if(!fields.length)fail(403,'monitoring_fields','No fields of this table remain available to the automation');
 return {...b,fields};
}

/** Stamp identity of a binding: dynamic bindings are identified by table and exclusions, not by field list or schema version. */
export const dynamicStamp=(b:FieldBinding)=>({id:b.typeId,dynamic:true,except:[...(b.exceptFields??[])].sort()});
