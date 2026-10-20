import {dependencies} from '../shared/formulas.js';
import type { Connection } from '../db/database.js';
import type { Actor, Field } from '../shared/schema.js';
import { fail } from '../shared/schema.js';
export async function access(db:Connection, actor:Actor, workspaceId:string, write=false) {
 const r=(await db.query(`SELECT w.*, m.role AS tenant_role, a.role AS workspace_role, a.hidden_fields, a.allowed_types, a.ai_enabled AS user_ai
 FROM workspaces w JOIN memberships m ON m.tenant_id=w.tenant_id AND m.user_id=$2
 LEFT JOIN workspace_access a ON a.workspace_id=w.id AND a.user_id=$2 WHERE w.id=$1`,[workspaceId,actor.userId])).rows[0];
 if(!r || (r.tenant_role!=='owner' && !r.workspace_role)) fail(404,'not_found','Workspace not found');
 const role=r.tenant_role==='owner'?'owner':r.workspace_role;
 if(write&&r.archived)fail(409,'workspace_archived','Workspace is read-only while archived');
 if(write && ['viewer','inspector'].includes(role)) fail(403,'forbidden','Editing is not permitted');
 if(actor.origin==='ai' && (!r.ai_enabled || (role!=='owner' && !r.user_ai))) fail(403,'ai_disabled','AI access is not permitted');
 let allowedTypes=role==='owner'?null:r.allowed_types;
 if(actor.origin==='ai'&&r.ai_hidden_types?.length){const types=(await db.query('SELECT id FROM entity_types WHERE workspace_id=$1',[workspaceId])).rows;allowedTypes=types.map(t=>t.id).filter(id=>!r.ai_hidden_types.includes(id)&&(!allowedTypes||allowedTypes.includes(id)));}
 return {...r,role,document_scope:role==='owner'||(r.allowed_types===null&&!(r.hidden_fields??[]).length),hidden_fields:role==='owner'?[]:(r.hidden_fields??[]),allowed_types:allowedTypes};
}
export async function typeAccess(db:Connection, actor:Actor, workspaceId:string, typeId:string, write=false) {
 const p=await access(db,actor,workspaceId,write);
 if(p.allowed_types && !p.allowed_types.includes(typeId)) fail(404,'not_found','Table not found');
 const t=(await db.query('SELECT * FROM entity_types WHERE id=$1 AND workspace_id=$2',[typeId,workspaceId])).rows[0];
 if(!t) fail(404,'not_found','Table not found');
 return {type:t,policy:{...p,typeId}};
}
export function visibleFields(fields:Field[], policy:any, actor:Actor) {let visible=fields.filter(f=>!policy.hidden_fields.includes(f.key) && !policy.hidden_fields.includes(`${policy.typeId}:${f.key}`) && (!f.targetTypeId||!policy.allowed_types||policy.allowed_types.includes(f.targetTypeId)) && (actor.origin!=='ai'||f.ai));for(let i=0;i<fields.length;i++){const next=visible.filter(f=>dependencies(f).every(k=>visible.some(v=>v.key===k)));if(next.length===visible.length)break;visible=next;}return visible;}
export function projectData(data:Record<string,unknown>, fields:Field[]) {return Object.fromEntries(fields.filter(f=>Object.hasOwn(data,f.key)).map(f=>[f.key,data[f.key]]));}

export function folderAllowed(folder:string,rules:any[],actor:Actor,role:string){return rules.filter(r=>folder===r.folder||folder.startsWith(r.folder+'/')).every(r=>(role==='owner'||r.allowed_users===null||r.allowed_users.includes(actor.userId))&&(actor.origin!=='ai'||r.ai_enabled));}

