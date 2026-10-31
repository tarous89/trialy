import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import type {Connection} from '../db/database.js';
import {fail,type Actor} from '../shared/schema.js';
import {typeAccess,visibleFields} from '../domain/permissions.js';

export const incompatible=()=>fail(409,'app_view_incompatible','This action is no longer compatible with the app’s data. Your work is still here. Refresh to use the latest version.');

/** Tokens identify a previously authorized publication, not arbitrary historical source. */
export async function openRuntimeView(db:Connection,a:Actor,w:string,current:any,expectedVersion:number|undefined,viewId?:string){
 if(viewId){
  const view=(await db.query('SELECT * FROM app_runtime_views WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND app_id=$4 AND (origin=$5 OR ($5=\'human\' AND origin=\'ai\')) AND expires_at>now()',[viewId,w,a.userId,current.id,a.origin])).rows[0];
  if(!view||view.version!==expectedVersion)fail(409,'app_view_expired','This app session needs a refresh. Your work is still here.');
  return view;
 }
 if(current.version!==expectedVersion)fail(409,'component_changed','A newer app version is available. Refresh to open it.');
 const schemas:Record<string,any>={};
 for(const b of current.bindings){const row=(await db.query('SELECT fields FROM entity_types WHERE id=$1 AND workspace_id=$2',[b.typeId,w])).rows[0];if(!row)continue;let readable:string[]=[],project:string|null=null;try{const pair=await typeAccess(db,a,w,b.typeId);readable=visibleFields(pair.type.fields,pair.policy,a).filter(f=>b.fields.includes(f.key)).map(f=>f.key);project=pair.policy.scope_project;}catch(e){if(![403,404].includes((e as any).status))throw e;}schemas[b.typeId]={fields:row.fields,readable,project};}
 // SELECT guards a publication racing the initial read. An issued view survives later releases.
 const view=(await db.query(`INSERT INTO app_runtime_views(id,workspace_id,user_id,app_id,origin,version,component,schemas,read_access)
 SELECT $1,$2,$3,id,$5,version,$7,$8,$9 FROM workspace_components WHERE id=$4 AND workspace_id=$2 AND version=$6 RETURNING *`,[randomUUID(),w,a.userId,current.id,a.origin,current.version,JSON.stringify(current),JSON.stringify(schemas),JSON.stringify(Object.fromEntries(Object.entries(schemas).map(([id,s])=>[id,s.readable])))])).rows[0];
 if(!view)fail(409,'component_changed','A newer app version is available. Refresh to open it.');
 return view;
}

/** Schema removals are compatibility failures; explicit permission losses are revocations. */
export async function assertRuntimeReadAccess(db:Connection,a:Actor,w:string,current:any,view:any){
 const seen:Record<string,string[]>={};
 for(const b of view.component.bindings){
  const table=(await db.query('SELECT fields FROM entity_types WHERE id=$1 AND workspace_id=$2',[b.typeId,w])).rows[0];
  const active=current.bindings.find((v:any)=>v.typeId===b.typeId);
  const keys=(view.read_access[b.typeId]??[]).filter((key:string)=>active?.fields.includes(key)&&table?.fields.some((f:any)=>f.key===key));
  if(!table||!active)continue;
  let pair;try{pair=await typeAccess(db,a,w,b.typeId);}catch(e){if(![403,404].includes((e as any).status))throw e;if(!keys.length)continue;fail(403,'runtime_access_revoked','Your access to this app’s data has changed. Reopen the app with your current permissions.');}
  const visible=visibleFields(pair.type.fields,pair.policy,a);
  if(keys.length&&pair.policy.scope_project!==view.schemas[b.typeId]?.project||keys.some((key:string)=>!visible.some(f=>f.key===key)))fail(403,'runtime_access_revoked','Your access to this app’s data has changed. Reopen the app with your current permissions.');
  const readable=visible.filter(f=>b.fields.includes(f.key)).map(f=>f.key);
  if(readable.some(key=>!view.read_access[b.typeId]?.includes(key)))seen[b.typeId]=readable;
 }
 // Record newly granted visibility before releasing it; later revocation must also
 // remove cached values that were not visible when this view first opened.
 if(Object.keys(seen).length)await db.query(`UPDATE app_runtime_views SET read_access=(SELECT jsonb_object_agg(key,values) FROM (SELECT key,jsonb_agg(DISTINCT field) AS values FROM (SELECT key,jsonb_array_elements(value) AS field FROM jsonb_each(read_access) UNION ALL SELECT key,jsonb_array_elements(value) FROM jsonb_each($2::jsonb)) fields GROUP BY key) merged) WHERE id=$1`,[view.id,JSON.stringify(seen)]);
}

export function assertRuntimeScope(current:any,pinned:any){
 if(current.format!=='frontend-js'||current.project_id!==pinned.project_id||current.manifest?.scope!==pinned.manifest?.scope)incompatible();
}

export function assertRuntimeWriteSchema(view:any,typeId:string,fields:any[],keys:string[]){
 for(const key of keys){
  const before=view.schemas[typeId]?.fields.find((f:any)=>f.key===key),after=fields.find(f=>f.key===key);
  // Labels and display choices can change safely; changes to the value contract cannot.
  const contract=(f:any)=>{if(!f)return null;const {name,renderer,ai,...rest}=f;return rest;};
  if(!before||!after||!isDeepStrictEqual(contract(before),contract(after)))incompatible();
 }
}
