import {applyTypePolicy} from '../domain/effective-access.js';
import {z} from 'zod';
import type {Connection} from '../db/database.js';
import {access,visibleFields} from '../domain/permissions.js';
import {derived} from '../shared/formulas.js';
import {id,fieldSchema,type Actor} from '../shared/schema.js';
export const catalogRequest=z.object({offset:z.number().int().min(0).max(1000000).default(0),limit:z.number().int().min(1).max(25).default(10),typeId:id.optional()}).strict();
/** Metadata is deliberately projected: never return field code, defaults, samples or records. */
export async function schemaCatalog(db:Connection,a:Actor,w:string,input:unknown={}){
 const v=catalogRequest.parse(input),p=await access(db,a,w);
 const rows=(await db.query('SELECT id,name,version,fields,concept FROM entity_types WHERE workspace_id=$1 AND ($2::uuid IS NULL OR id=$2) ORDER BY name,id LIMIT $3 OFFSET $4',[w,v.typeId??null,v.limit+1,v.offset])).rows;
 const tables=[];for(const t of rows.slice(0,v.limit)){
  const policy=await applyTypePolicy(db,a,p,t);const visible=visibleFields(t.fields,policy,a);const readable=visible.length>0;
  if(p.direct_data===false&&!readable)continue;
  const fields=t.fields.map((f:any)=>{const read=visible.some(k=>k.key===f.key);return {key:f.key,name:f.name,kind:f.kind,required:f.required,multiple:!!f.multiple,targetTypeId:f.targetTypeId??null,derived:derived(f),readable:read,writable:read&&!derived(f)&&!p.archived&&policy.write_fields.includes(f.key)};});
  tables.push({id:t.id,name:t.name,version:t.version,concept:t.concept??null,readable,fields});
 }
 return {workspaceId:w,tables,nextOffset:rows.length>v.limit?v.offset+v.limit:null,policy:'Schema visibility grants no access to entries, counts, execution or writes.'};
}
export const matchRequest=z.object({name:z.string().trim().min(1).max(100),kind:fieldSchema.shape.kind,typeId:id.optional(),concept:z.enum(['person','organization','project','location']).optional(),offset:z.number().int().min(0).max(1000000).default(0)}).strict();
const words=(s:string)=>new Set(s.toLocaleLowerCase().replace(/[_-]/g,' ').split(/[^\p{L}\p{N}]+/u).filter(Boolean));
export async function fieldCandidates(db:Connection,a:Actor,w:string,input:unknown){
 const v=matchRequest.parse(input),page=await schemaCatalog(db,a,w,{offset:v.offset,limit:25,typeId:v.typeId}),wanted=words(v.name);
 const candidates=page.tables.flatMap(t=>t.fields.filter((f:any)=>f.kind===v.kind).map((f:any)=>{
  const names=words(f.name+' '+f.key),overlap=[...wanted].filter(k=>names.has(k)).length;
  return {typeId:t.id,table:t.name,tableVersion:t.version,concept:t.concept,field:f,score:(v.concept&&t.concept===v.concept?20:0)+overlap*10+(f.name.toLocaleLowerCase()===v.name.toLocaleLowerCase()?20:0)};
 })).sort((a,b)=>b.score-a.score||a.typeId.localeCompare(b.typeId)||a.field.key.localeCompare(b.field.key));
 return {candidates,nextOffset:page.nextOffset,decision:'Candidates are suggestions, never automatic semantic matches. Prefer reuse; check entity, project context, meaning, units and cardinality. Schema-only candidates require permission to read/write. Page to completion before concluding no existing field is suitable.'};
}

/** One permission-filtered catalog over the existing account database; no copies. */
export const accountCatalogRequest=catalogRequest.omit({typeId:true});
export async function accountCatalog(db:import('../db/database.js').Database,a:Actor,input:unknown={}){
 const v=accountCatalogRequest.parse(input),{Service}=await import('../domain/service.js');
 const spaces=await new Service(db).workspaces(a);
 if(!spaces.length)return {tables:[],nextOffset:null};
 const rows=(await db.query('SELECT id,workspace_id FROM entity_types WHERE workspace_id=ANY($1::uuid[]) ORDER BY name,id LIMIT $2 OFFSET $3',[spaces.map(s=>s.id),v.limit+1,v.offset])).rows;
 const tables=[];
 for(const row of rows.slice(0,v.limit)){
  const page=await schemaCatalog(db,a,row.workspace_id,{typeId:row.id,limit:1});
  if(page.tables[0])tables.push({...page.tables[0],workspaceId:row.workspace_id});
 }
 return {tables,nextOffset:rows.length>v.limit?v.offset+v.limit:null};
}

