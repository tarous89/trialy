import {withReadMetadata,freshReadDatabase} from '../db/read-metadata.js';
import {z} from 'zod';
import {id,fail,type Actor} from '../shared/schema.js';
import type {Database} from '../db/database.js';
import {schemaCatalog} from './catalog.js';
import {activeProject} from '../domain/project-context.js';
import {access,typeAccess,visibleFields} from '../domain/permissions.js';
import {DerivedReader} from '../domain/derived-fields.js';
export const databaseRequest=z.object({typeId:id,projectId:id.optional(),offset:z.number().int().min(0).max(1000000).default(0),limit:z.number().int().min(1).max(100).default(25),query:z.string().max(500).default(''),sortField:z.string().max(64).optional(),descending:z.boolean().default(false)}).strict();
export async function databasePage(db:Database,a:Actor,w:string,input:unknown){return withReadMetadata(db,db=>databasePageRead(db,a,w,input));}
async function databasePageRead(db:Database,a:Actor,w:string,input:unknown){
 const v=databaseRequest.parse(input);if(v.projectId)await activeProject(db,a,w,v.projectId);
 const policy=await access(db,a,w);const canEdit=!['viewer','inspector'].includes(policy.role)&&!policy.archived;
 const table=(await schemaCatalog(db,a,w,{typeId:v.typeId})).tables[0];if(!table)fail(404,'not_found','Table unavailable');
 if(!table.readable)return {table,canEdit:false,rows:[],total:null,nextOffset:null,schemaOnly:true};
 const {type,policy:tablePolicy}=await typeAccess(db,a,w,v.typeId),fields=visibleFields(type.fields,tablePolicy,a),keys=fields.map(f=>f.key);
 if(v.sortField&&!keys.includes(v.sortField))fail(403,'sort_scope','Sort field is unavailable');
 if(!keys.length)return {table,canEdit:false,rows:[],total:null,nextOffset:null,schemaOnly:true};
 // Search/sort/count only the selected project and permitted JSON projection.
 const selection=`SELECT r.id,r.version,r.created_at,(SELECT coalesce(jsonb_object_agg(key,value),'{}'::jsonb) FROM jsonb_each(r.data) WHERE key=ANY($3::text[])) AS data FROM records r WHERE r.workspace_id=$1 AND r.type_id=$2 AND r.state NOT IN ('archived','superseded') AND ($4::uuid IS NULL OR EXISTS(SELECT 1 FROM project_records p WHERE p.workspace_id=$1 AND p.project_id=$4 AND p.record_id=r.id AND p.revoked_at IS NULL))`;
 const params=[w,v.typeId,keys,v.projectId??null,v.query];
 const total=Number((await db.query(`SELECT count(*) AS n FROM (${selection}) visible WHERE $5='' OR data::text ILIKE '%'||$5||'%'`,params)).rows[0].n);
 const rows=(await db.query(`SELECT id,version,data FROM (${selection}) visible WHERE $5='' OR data::text ILIKE '%'||$5||'%' ORDER BY CASE WHEN $6::text IS NOT NULL THEN data->$6 END ${v.descending?'DESC':'ASC'} NULLS LAST,created_at,id LIMIT $7 OFFSET $8`,[...params,v.sortField??null,v.limit,v.offset])).rows;
 if(Buffer.byteLength(JSON.stringify(rows))>1048576)fail(413,'page_limit','This page is too large; request fewer records');
 const reader=new DerivedReader(db,a,w);reader.prime(v.typeId,type,tablePolicy);const resolved=await Promise.all(rows.map(r=>reader.read({...r,type_id:v.typeId})));
 const current=await typeAccess(freshReadDatabase(db),a,w,v.typeId);if(JSON.stringify(visibleFields(current.type.fields,current.policy,a))!==JSON.stringify(fields))fail(409,'access_changed','Access or schema changed; reload this table');
 if(v.projectId)await activeProject(freshReadDatabase(db),a,w,v.projectId);
 for(const field of table.fields){const original=type.fields.find((f:any)=>f.key===field.key);if(field.readable)(field as any).options=original?.options??[];}
 return {table,canDelete:policy.role==='owner'&&keys.length===type.fields.length,canEdit:canEdit&&table.fields.some((f:any)=>f.writable),rows:resolved.map(r=>({id:r.id,version:r.version,data:r.data})),total,nextOffset:v.offset+rows.length<total?v.offset+rows.length:null,schemaOnly:false};
}

