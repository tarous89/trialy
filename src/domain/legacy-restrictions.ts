import type {Connection} from '../db/database.js';
import {fail,isAssistant} from '../shared/schema.js';
// A2, D1: access is set per table. Per-column permissions are retired: the ones that already exist
// (column rules in workspaces.permission_rules, workspace_access.hidden_fields) keep working exactly as before
// and can only be lifted, by an organization owner. Nothing here ever adds or tightens one.
type Level={read?:string;write?:string};
export function columnRetired():never{return fail(409,'column_permissions_retired','Per-column permissions are no longer offered. Put information for a different audience in its own table.');}
/** Entries of a person's hidden fields that hide this column: the bare key (every table) or "table:key". */
export const hiddenKeys=(hidden:string[]|null|undefined,typeId:string,field?:string)=>(hidden??[]).filter(k=>k===field||k===typeId+':'+field);
/** A column rule may only move toward "inherit": no new or tighter restriction, and no new per-column grant. */
export function assertColumnLoosens(next:Level,was:Level|undefined,hidden=false){
 const noRead=hidden||was?.read==='deny',noWrite=noRead||was?.write==='deny';
 if(next.read==='deny'&&!noRead||next.write==='deny'&&!noWrite||next.read==='allow'&&was?.read!=='allow'||next.write==='allow'&&was?.write!=='allow')columnRetired();
}
export async function hiddenFieldsOf(db:Connection,w:string,subject:string):Promise<string[]>{return isAssistant(subject)?[]:(await db.query('SELECT hidden_fields FROM workspace_access WHERE workspace_id=$1 AND user_id=$2',[w,subject])).rows[0]?.hidden_fields??[];}
/** Lift one hidden field for one person. A bare key hid the field in every table: every other table keeps it hidden. */
export async function liftHiddenField(tx:Connection,w:string,userId:string,typeId:string,field:string){
 const before:string[]=(await tx.query('SELECT hidden_fields FROM workspace_access WHERE workspace_id=$1 AND user_id=$2 FOR UPDATE',[w,userId])).rows[0]?.hidden_fields??[];
 if(!hiddenKeys(before,typeId,field).length)return null;
 const key=JSON.stringify([{key:field}]),others=before.includes(field)?(await tx.query('SELECT id FROM entity_types WHERE workspace_id=$1 AND id<>$2 AND (fields @> $3::jsonb OR archived_fields @> $3::jsonb)',[w,typeId,key])).rows.map(t=>t.id+':'+field):[];
 const after=[...new Set([...before.filter(k=>k!==field&&k!==typeId+':'+field),...others])];
 await tx.query('UPDATE workspace_access SET hidden_fields=$3 WHERE workspace_id=$1 AND user_id=$2',[w,userId,JSON.stringify(after)]);return {before,after};
}
export type LegacyRestriction={key:string;subject:string;resourceId:string;field:string;table:string;column:string;level:'Hidden'|'View only'};
/** The older column restrictions that still apply to one person or assistant, for the Access page. Owners only: the names are restricted information. */
export function legacyRestrictions(rules:any[],subject:string,hidden:string[],tables:{id:string;name:string;fields:any[];archived_fields?:any[]}[]):LegacyRestriction[]{
 const found=new Map<string,LegacyRestriction>(),columns=(t:any)=>[...t.fields,...(t.archived_fields??[])];
 const add=(typeId:string,field:string,level:'Hidden'|'View only')=>{const t=tables.find(x=>x.id===typeId),key=['column',typeId,field].join(':');if(t&&(level==='Hidden'||!found.has(key)))found.set(key,{key,subject,resourceId:typeId,field,table:t.name,column:columns(t).find((f:any)=>f.key===field)?.name??field,level});};
 for(const r of rules??[])if(r.subject===subject&&r.kind==='column'&&r.field&&(r.read==='deny'||r.write==='deny'))add(r.resourceId,r.field,r.read==='deny'?'Hidden':'View only');
 for(const k of hidden){const at=k.indexOf(':'),typed=at>0&&tables.some(t=>t.id===k.slice(0,at));if(typed)add(k.slice(0,at),k.slice(at+1),'Hidden');else for(const t of tables)if(columns(t).some((f:any)=>f.key===k))add(t.id,k,'Hidden');}
 return [...found.values()].sort((a,b)=>a.table.localeCompare(b.table)||a.column.localeCompare(b.column));
}
