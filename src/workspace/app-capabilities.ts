import {z} from 'zod';
import {fail,id,type Actor} from '../shared/schema.js';
import type {Database} from '../db/database.js';
import {typeAccess,visibleFields} from '../domain/permissions.js';
import {DerivedReader} from '../domain/derived-fields.js';
import {Service} from '../domain/service.js';
import {appRoles} from './role-contracts.js';
import {appIntegrations} from './integrations.js';
import {frontendRead} from './frontend.js';
import {LIMITS} from '../foundation/runtime.js';

/** Several record reads in one call. */
export const READ_BATCH_LIMIT=12;
/** What an app may read: these never write, run, send or call out, so they need no sandbox, queue or review. */
export const READ_CAPABILITIES=new Set(['records.read','records.readMany','records.get','records.summarize','project.records','project.relationships','roles.list','integrations.list']);
const J=JSON.stringify;
export const summarizeInput=z.object({typeId:id,groupBy:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/).optional(),metric:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/).optional(),q:z.string().max(500).optional()}).strict();

/** The parts of WorkspaceFoundation the read capabilities use. */
export type CapabilityHost={
 db:Database;
 record(tx:any,a:Actor,w:string,id:string,write?:boolean,full?:boolean):Promise<any>;
 projectRecords(a:Actor,w:string,projectId:string,offset?:number,typeIds?:string[]):Promise<{records:any[];nextOffset:number|null}>;
 projectRelationships(a:Actor,w:string,projectId:string,offset?:number,typeIds?:string[]):Promise<{relationships:any[];nextOffset:number|null}>;
 roleWriters(a:Actor,w:string,roles:any[]):Promise<Record<string,any>>;
};
export type CapabilityContext={
 /** The saved app (null for an unsaved preview). */
 componentId:string|null;
 /** The app as the caller may use it (projected sections, bindings, manifest, project). */
 content:any;
 /** Tables of an unsaved preview that do not exist yet; reads return nothing. */
 draftTables?:string[];
 /** Run before each record read of a custom app (the sandbox path); read_app_data checks once per request instead (P6). */
 recheck?:()=>Promise<unknown>;
 signal?:AbortSignal;
};

/**
 * P3, P6, P8 (4.3): the single authority for what an app may read. The sandboxed run of an app's code and the
 * read_app_data endpoint use the same class, so a read returns the same rows by either path. Every read is limited to
 * the app's bindings, the caller's own table and field permissions and the app's project scope.
 * Caches hold one request's permission lookups and resolved rows; the tracker renderer reuses them for its controls.
 */
export class AppCapabilities{
 readonly tableCache=new Map<string,Promise<any>>();
 readonly pageRecords=new Map<string,any>();
 readonly resolvedPages=new Map<string,any>();
 readonly pageReader:DerivedReader;
 private batchedReads=0;private inBatch=false;
 constructor(private host:CapabilityHost,private a:Actor,private w:string,private ctx:CapabilityContext){
  const bound=Object.fromEntries(ctx.content.bindings.map((b:any)=>[b.typeId,b.fields]));
  this.pageReader=new DerivedReader(host.db,a,w,Object.keys(bound),bound);
 }
 tableAccess(typeId:string){if(!this.tableCache.has(typeId))this.tableCache.set(typeId,typeAccess(this.host.db,this.a,this.w,typeId));return this.tableCache.get(typeId)!;}
 handles(name:string){return READ_CAPABILITIES.has(name)&&(name!=='records.get'||process.env.SIMPLE_APPS_ENABLED==='true');}
 async call(name:string,value:unknown):Promise<any>{
  const {a,w,ctx,host}=this,content=ctx.content,componentId=ctx.componentId;
  ctx.signal?.throwIfAborted();
  if(name==='project.records'||name==='project.relationships'){
   const v=z.object({offset:z.number().int().min(0).max(1000000).default(0)}).strict().parse(value);
   const typeIds=content.bindings.map((b:any)=>b.typeId),projectId=content.project_id;
   if(!projectId)fail(400,'project_required','This independent app has no project data scope. Use bound records.read instead.');
   const projectRecord=(record:any)=>{const binding=content.bindings.find((b:any)=>b.typeId===(record.type_id??record.typeId));return {id:record.id,typeId:record.type_id??record.typeId,version:record.version,data:Object.fromEntries(Object.entries(record.data).filter(([k])=>binding.fields.includes(k)))};};
   if(name==='project.records'){const page=await host.projectRecords(a,w,projectId,v.offset,typeIds);return {projectId,records:page.records.map(r=>projectRecord(r.record)),nextOffset:page.nextOffset};}
   const page=await host.projectRelationships(a,w,projectId,v.offset,typeIds);return {projectId,relationships:page.relationships.filter(r=>content.bindings.find((b:any)=>b.typeId===r.source.typeId)?.fields.includes(r.field)).map(r=>({field:r.field,label:r.label,source:projectRecord(r.source),target:projectRecord(r.target)})),nextOffset:page.nextOffset};
  }
  // Role-based connections: which declared roles are connected, to which bound table (modular apps §7). No records.
  if(name==='roles.list'){const roles=await appRoles(host.db,w,{...content,id:componentId}),writers=await host.roleWriters(a,w,roles);return {roles:roles.map(r=>({...(writers[r.role]?{writer:writers[r.role]}:{}),role:r.role,name:r.name,contract:r.contract,connected:!!r.typeId,typeId:r.typeId??null,optional:!!r.optional,readOnly:!!r.readOnly,writable:r.writable,fields:(content.manifest?.fields??[]).filter((f:any)=>f.typeId===r.typeId).map((f:any)=>({id:f.id,field:f.field,mode:f.mode}))}))};}
  // In-app integrations: where each integration's data comes from and the subtle offer to show (install, connect or none).
  if(name==='integrations.list'){const app={...content,id:componentId},writers=await host.roleWriters(a,w,await appRoles(host.db,w,app));return {integrations:(await appIntegrations(host.db,a,w,app)).map((x:any)=>writers[x.role]?{...x,writer:writers[x.role]}:x)};}
  if(name==='records.get'&&process.env.SIMPLE_APPS_ENABLED==='true'){
   if(!componentId)fail(403,'preview_read_only','Open a saved app to read a record detail');
   const v=z.object({recordId:id}).strict().parse(value),record=await host.record(host.db,a,w,v.recordId);
   const binding=content.bindings.find((b:any)=>b.typeId===record.type_id);
   if(!binding||record.state==='archived')fail(404,'not_found','Record unavailable');
   if(content.manifest?.scope==='project'&&!(await host.db.query('SELECT id FROM project_records WHERE workspace_id=$1 AND project_id=$2 AND record_id=$3 AND revoked_at IS NULL',[w,content.project_id,record.id])).rows.length)fail(404,'not_found','Record unavailable');
   const resolved=await this.pageReader.read({...record,data:Object.fromEntries(Object.entries(record.data).filter(([key])=>binding.fields.includes(key)))});
   return {id:record.id,typeId:record.type_id,version:record.version,data:resolved.data};
  }
  // Several record reads in one call. Each read is checked exactly like records.read (binding,
  // permissions, filters, limits) and the call and size budgets still apply; permission
  // lookups are made once for the batch and verified before it returns.
  if(name==='records.readMany'){
   const v=z.object({reads:z.array(z.unknown()).min(1).max(READ_BATCH_LIMIT)}).strict().parse(value);
   if((this.batchedReads+=v.reads.length)>LIMITS.calls)fail(400,'capability_limit','This app made too many reads');
   // The app is rechecked once for the batch, before its first read; each read is still checked against its own table.
   await ctx.recheck?.();
   const results=[];this.inBatch=true;try{for(const read of v.reads){ctx.signal?.throwIfAborted();results.push(await this.call('records.read',read));}}finally{this.inBatch=false;}
   return {results};
  }
  // P3 (4.3): totals and calculations on the full matching data, never just the loaded page.
  if(name==='records.summarize'){
   const v=summarizeInput.parse(value),binding=content.bindings.find((b:any)=>b.typeId===v.typeId);if(!binding)fail(403,'binding_required','Table is not bound to this component');
   if((ctx.draftTables??[]).includes(v.typeId))return {totals:{count:0,sum:null,average:null,minimum:null,maximum:null,unavailable:0},groups:[],groupsTruncated:false,metric:v.metric??null};
   if(content.manifest?.scope==='project')fail(400,'summary_scope','Totals for project-scoped apps are not available yet; read the project records instead.');
   for(const key of [v.groupBy,v.metric])if(key&&!binding.fields.includes(key))fail(403,'summary_field','Summarize only bound fields');
   const {scope,...result}=await new Service(host.db).aggregate(a,w,v.typeId,{groupBy:v.groupBy,metric:v.metric,q:v.q},content.bindings.map((b:any)=>b.typeId));
   return result;
  }
  if(name==='records.read'){
   if((ctx.draftTables??[]).includes((value as any)?.typeId)){const v=frontendRead.parse(value);return {rows:[],total:0,limit:v.limit,offset:v.offset};}
   const v=frontendRead.parse(value),binding=content.bindings.find((b:any)=>b.typeId===v.typeId);if(!binding)fail(403,'binding_required','Table is not bound to this component');
   if(!this.inBatch)await ctx.recheck?.();
   let linkedTable;try{linkedTable=await this.tableAccess(v.typeId);}catch(e){if((e as any).status===403||(e as any).status===404)return {unavailable:true,message:'This table is restricted',rows:[],total:null,limit:v.limit,offset:v.offset};throw e;}const readableKeys=visibleFields(linkedTable.type.fields,linkedTable.policy,a).filter(f=>binding.fields.includes(f.key)).map(f=>f.key);
   if(Object.keys(v.filters).length>8||Object.keys(v.filters).some(k=>!readableKeys.includes(k)))fail(403,'filter_field','Filter only readable bound fields');
   const sortField=v.sort?linkedTable.type.fields.find((f:any)=>f.key===v.sort!.field&&readableKeys.includes(f.key)):undefined;
   if(v.sort&&!sortField)fail(403,'sort_field','Sort only readable bound fields');
   if(sortField&&(sortField.formula||sortField.computed||sortField.lookup))fail(400,'sort_field','Sorting calculated fields is not supported');
   const scalar="NULLIF(CASE WHEN jsonb_typeof(data->$8)='array' THEN data->$8->>0 ELSE data->>$8 END,'')";
   const sortValue=sortField&&['number','money'].includes(sortField.kind)?`CASE WHEN ${scalar} ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (${scalar})::numeric END`:sortField?.kind==='select'?`array_position($9::text[],${scalar})`:`lower(${scalar})`;
   const order=v.sort?`${sortValue} ${v.sort.direction==='desc'?'DESC':'ASC'} NULLS LAST,created_at,id`:'created_at,id';
   const where="workspace_id=$1 AND type_id=$2 AND state<>'archived' AND NOT EXISTS(SELECT 1 FROM jsonb_each_text($7::jsonb) filter WHERE NOT (CASE WHEN jsonb_typeof(records.data->filter.key)='array' THEN (records.data->filter.key) @> jsonb_build_array(filter.value) ELSE records.data->>filter.key=filter.value END IS TRUE)) AND ($6::uuid IS NULL OR EXISTS(SELECT 1 FROM project_records pr WHERE pr.workspace_id=$1 AND pr.project_id=$6 AND pr.record_id=records.id AND pr.revoked_at IS NULL)) AND ($10::text='' OR EXISTS(SELECT 1 FROM jsonb_each_text(records.data) search WHERE search.key=ANY($3::text[]) AND strpos(lower(search.value),lower($10))>0))";
   const args=[w,v.typeId,readableKeys,v.limit,v.offset,content.manifest?.scope==='project'?content.project_id:null,J(v.filters),v.sort?.field??null,sortField?.options??[],v.q??''];
   // Typed parameters are shared by count and page queries. All predicates and ordering precede LIMIT.
   const parameters='WITH params AS (SELECT $4::int,$5::int,$8::text,$9::text[]) ';
   const rows=v.limit===0?[]:(await host.db.query(parameters+`SELECT id,version,CASE WHEN octet_length(selected::text)<=100000 THEN selected ELSE NULL END AS data FROM (
    SELECT id,version,(SELECT coalesce(jsonb_object_agg(key,value),'{}'::jsonb) FROM jsonb_each(data) WHERE key=ANY($3::text[])) AS selected
    FROM records WHERE ${where} ORDER BY ${order} LIMIT $4 OFFSET $5) page`,args)).rows;
   if(rows.some((r:any)=>r.data===null))fail(400,'read_limit','A record exceeds the interface read budget');
   const total=Number((await host.db.query(parameters+`SELECT count(*) AS n FROM records WHERE ${where}`,args)).rows[0].n);
   this.pageReader.prime(v.typeId,linkedTable.type,linkedTable.policy);
   // SQL already applied this exact project scope before returning these rows.
   if(linkedTable.policy.scope_project===(content.manifest?.scope==='project'?content.project_id:null))this.pageReader.authorizeRows(rows.map((r:any)=>r.id));
   const resolved=await Promise.all(rows.map(async(r:any)=>{const record={...r,type_id:v.typeId,fields:visibleFields(linkedTable.type.fields,linkedTable.policy,a)};this.pageRecords.set(r.id,record);const {fields:ignored,...value}=await this.pageReader.read(record);this.resolvedPages.set(r.id,value);return value;}));return {tableName:linkedTable.type.name,rows:resolved,total,limit:v.limit,offset:v.offset};
  }
  fail(403,'capability_unavailable','This interface capability is unavailable');
 }
}
