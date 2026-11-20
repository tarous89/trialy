import type {Connection} from '../db/database.js';
import {typeAccess} from '../domain/permissions.js';
import {toolPolicy} from '../domain/effective-access.js';
import {access} from '../domain/permissions.js';
import {fail,type Actor} from '../shared/schema.js';

/**
 * A13 (package 3.6): dependency warnings for app and schema changes.
 *
 * When a change would remove or redefine something another app, view, link or automation relies on, the preparation
 * returns a concise report (`dependencies`) with each affected resource and the expected effect. With nothing
 * affected, the ordinary flow continues silently and no report is returned.
 *
 * Saving rechecks the report. An app change with an unresolved breaking dependency is refused: the assistant chooses a
 * compatible change, or the person resolves the dependency first (for example by archiving the automation). This
 * replaces the silent retirement of an app's automations by the database trigger when a save removed what they used;
 * the trigger stays as a last safety net for other paths. A schema change is refused only when its dependencies changed
 * since it was prepared, so nothing is saved against a report the person did not see.
 */
export type Dependency={kind:'automation'|'app'|'view'|'link';id:string;name:string;effect:string;breaking:boolean;appId?:string|null};
type Removed={typeId:string;fields:string[];whole:boolean};

async function report(db:Connection,a:Actor,w:string,removed:Removed[],removedExecution:string[],self:string|null):Promise<Dependency[]>{
 if(!removed.length&&!removedExecution.length)return [];
 const rows:any[]=(await db.query('SELECT trialy_security.dependency_report($1,$2::jsonb,$3::text[],$4) AS r',[w,JSON.stringify(removed),removedExecution,self])).rows[0]?.r??[];
 // Keep dependency details within the caller's access: an app the caller cannot open is counted, not named.
 const p=await access(db,a,w),visible=new Map<string,boolean>();
 const canOpen=async(appId:string)=>{if(!visible.has(appId)){let ok=false;try{ok=!!(await toolPolicy(db,{...a,accessToolId:appId},p,appId)).role;}catch{ok=false;}visible.set(appId,ok);}return visible.get(appId)!;};
 const out:Dependency[]=[],seen=new Set<string>();
 for(const r of rows){
  const key=r.kind+':'+r.id;if(seen.has(key))continue;seen.add(key);
  const named=!r.appId||await canOpen(r.appId);
  out.push({kind:r.kind,id:named?r.id:'hidden',name:named?r.name:r.kind==='app'?'An app you cannot open':'An automation of an app you cannot open',effect:r.effect,breaking:!!r.breaking,...(r.appId&&named?{appId:r.appId}:{})});
 }
 return out.sort((x,y)=>Number(y.breaking)-Number(x.breaking)||x.kind.localeCompare(y.kind)||x.name.localeCompare(y.name));
}

/** What an app change removes: whole tables, fields of tables it keeps, and helpers. */
export async function appChangeDependencies(db:Connection,a:Actor,w:string,op:any):Promise<Dependency[]>{
 if(!['save_component','create_tracker'].includes(op?.kind)||!op.componentId)return [];
 const prev=(await db.query('SELECT bindings,execution FROM workspace_components WHERE id=$1 AND workspace_id=$2 AND deleted_at IS NULL',[op.componentId,w])).rows[0];
 if(!prev)return [];
 // A tracker revision is rebuilt from its setup at save; its bindings follow its tabs.
 const next:any[]=op.kind==='save_component'?op.content?.bindings??[]:(op.setup?.tabs??[]).map((t:any)=>({typeId:t.typeId,fields:(t.columns??[]).map((c:any)=>c.field)}));
 const removed:Removed[]=[];
 for(const b of prev.bindings??[]){
  const n=next.filter((x:any)=>x.typeId===b.typeId);
  if(!n.length){removed.push({typeId:b.typeId,fields:b.fields,whole:true});continue;}
  const kept=new Set(n.flatMap((x:any)=>x.fields)),gone=b.fields.filter((k:string)=>!kept.has(k));
  if(gone.length)removed.push({typeId:b.typeId,fields:gone,whole:false});
 }
 const after=new Set((op.kind==='save_component'?op.content?.execution??prev.execution??[]:prev.execution??[]).map((x:any)=>x.name));
 const removedExecution=(prev.execution??[]).map((x:any)=>x.name).filter((n:string)=>!after.has(n));
 return report(db,a,w,removed,removedExecution,op.componentId);
}

/** What a table change removes or redefines: fields that disappear or change kind. */
export async function schemaChangeDependencies(db:Connection,a:Actor,w:string,op:any):Promise<Dependency[]>{
 if(!['update_type','migrate_type'].includes(op?.kind))return [];
 let type:any;try{type=(await typeAccess(db,a,w,op.typeId)).type;}catch{return [];}
 const fields=(type.fields??[]).filter((f:any)=>{const n=(op.fields??[]).find((x:any)=>x.key===f.key);return !n||n.kind!==f.kind||!!n.multiple!==!!f.multiple;}).map((f:any)=>f.key);
 return fields.length?report(db,a,w,[{typeId:op.typeId,fields,whole:false}],[],null):[];
}

/** The concise text form returned to an assistant together with the structured list. */
export function dependencySummary(items:Dependency[]){
 const breaking=items.filter(x=>x.breaking);
 return {dependencies:items,dependencySummary:items.map(x=>`${x.kind==='automation'?'Automation':x.kind==='app'?'App':x.kind==='view'?'View':'Link'} “${x.name}” ${x.effect}.`).join(' '),
  ...(breaking.length?{dependencyNote:'Choose a change that keeps these working, or ask the person how to proceed. A change that breaks them cannot be saved.'}:{})};
}

/** At save: an app change with a breaking dependency is refused, with the current report. */
export function refuseBreaking(items:Dependency[]){
 const breaking=items.filter(x=>x.breaking);
 if(breaking.length)fail(409,'dependency_breaks',JSON.stringify({message:'This change would break what relies on the app. Prepare a compatible change, or resolve these first.',...dependencySummary(items)}));
}
