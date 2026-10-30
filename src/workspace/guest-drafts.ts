import {appPublicUrl,PLATFORM_ORIGIN} from '../shared/public-url.js';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Database} from '../db/database.js';
import {id,fieldsSchema,fail,type Actor} from '../shared/schema.js';
import {componentContent} from './schema.js';
import {frontendOutput,frontendRead,frontendRequest} from './frontend.js';
import {execute} from '../foundation/runtime.js';
import {Service} from '../domain/service.js';
import {WorkspaceFoundation} from './service.js';
import {checksum} from '../domain/evidence.js';
import {access,typeAccess} from '../domain/permissions.js';
import {requireHuman} from '../domain/write-authorization.js';
const draftValues=z.record(z.string(),z.union([z.string().max(50000),z.number().finite(),z.boolean(),z.array(z.union([z.string().max(50000),z.number().finite()])).max(100),z.null()]));
export const guestHandle=z.object({id,token:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).strict();
export const guestBundle=z.object({
 name:z.string().trim().min(1).max(100),
 tables:z.array(z.object({id,name:z.string().min(1).max(100),fields:fieldsSchema,
 rows:z.array(z.object({id,data:draftValues}).strict()).max(200).default([])}).strict()).max(10).default([]),
 components:z.array(componentContent).min(1).max(10)
}).strict().superRefine((v,ctx)=>{
 const ids=v.tables.flatMap(t=>[t.id,...t.rows.map(r=>r.id)]);
 if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',message:'Use distinct draft table and record IDs'});
 if(v.tables.reduce((n,t)=>n+t.rows.length,0)>200)ctx.addIssue({code:'custom',message:'A temporary tracker supports up to 200 initial records'});
 for(const t of v.tables)for(const f of t.fields)if(['person','document','relationship','table','field'].includes(f.kind)||f.lookup)ctx.addIssue({code:'custom',message:'Create account-linked reference fields after saving the temporary tracker'});
 for(const c of v.components){
  if(c.assets.length||c.execution.length||c.sourceAccess!=='workspace')ctx.addIssue({code:'custom',message:'Connect and save before attaching account files, execution or sharing permissions'});
  if(!['frontend-js','text','markdown','json','html','javascript'].includes(c.format))ctx.addIssue({code:'custom',message:'Use frontend-js for an interactive temporary interface'});
  for(const b of c.bindings){const t=v.tables.find(t=>t.id===b.typeId);if(!t||b.fields.some(k=>!t.fields.some(f=>f.key===k)))ctx.addIssue({code:'custom',message:'Bind only fields included in this temporary tracker'});}
 }
});
export const guestDestination=z.object({workspaceId:id,tables:z.array(z.object({draftTypeId:id,typeId:id.optional(),expectedVersion:z.number().int().min(0).optional(),reason:z.string().trim().min(1).max(500).optional()}).strict()).max(10)}).strict();
function compatible(draft:any,existing:any){return draft.fields.every((f:any)=>{const e=existing.fields.find((x:any)=>x.key===f.key);return e&&e.kind===f.kind&&!!e.multiple===!!f.multiple&&JSON.stringify(e.options??[])===JSON.stringify(f.options??[])&&!e.computed&&!e.lookup;})&&existing.fields.every((e:any)=>!e.required||draft.fields.some((f:any)=>f.key===e.key));}
export type GuestBundle=z.infer<typeof guestBundle>;
const active=new Set<string>();
export class GuestDrafts{
 constructor(readonly db:Database){}
 async create(_input:unknown){
  fail(401,'account_required','Connect your TrialAgents account before creating a project or tool.');
 }
 async read(input:unknown){
  const handle=guestHandle.parse(input);
  const row=(await this.db.query('SELECT * FROM guest_drafts WHERE id=$1 AND capability_hash=$2',[handle.id,checksum(handle.token)])).rows[0];
  if(!row)fail(404,'draft_missing','This temporary tracker is unavailable');
  // Capability holders get a receipt, never access to the saved account contents.
  if(row.receipt)return {guestDraft:true,handle,status:'saved',receipt:row.receipt};
  if(new Date(row.expires_at).getTime()<=Date.now())fail(410,'draft_expired','This temporary tracker expired. Ask ChatGPT to prepare it again.');
  return {guestDraft:true,handle,status:'temporary',bundle:row.body as GuestBundle,digest:row.digest,expiresAt:new Date(row.expires_at).toISOString(),saveUrl:new URL('/save-preview',appPublicUrl(process.env,PLATFORM_ORIGIN)).href+'#preview='+encodeURIComponent(JSON.stringify(handle))};
 }
 async run(input:unknown){
  const v=z.object({handle:guestHandle,component:z.number().int().min(0).max(9),request:frontendRequest}).strict().parse(input);
  const draft=await this.read(v.handle);if(!draft.bundle)fail(409,'already_saved','Open the saved tracker to continue');
  const c=draft.bundle.components[v.component];if(!c||c.format!=='frontend-js')fail(400,'not_executable','Choose frontend-js code');
  if(Buffer.byteLength(JSON.stringify(v.request))>150000)fail(413,'input_limit','Interface input is too large');
  if(active.size>=2||active.has(v.handle.id))fail(429,'runtime_busy','Another preview is running. Retry shortly.');active.add(v.handle.id);
  try{
   const output=frontendOutput.parse(await execute(c.source,{state:v.request.state,event:v.request.event},async(name,args)=>{
    if(name!=='records.read')fail(403,'preview_read_only','Temporary code can only read its bound preview tables. Save before proposing database changes.');
    const q=frontendRead.parse(args),binding=c.bindings.find(b=>b.typeId===q.typeId),t=draft.bundle!.tables.find(t=>t.id===q.typeId);
    if(!binding||!t)fail(403,'binding_required','Table is not bound to this preview');
    return {rows:t.rows.slice(q.offset,q.offset+q.limit).map(r=>({id:r.id,version:0,data:Object.fromEntries(Object.entries(r.data).filter(([k])=>binding.fields.includes(k)))})),total:t.rows.length,limit:q.limit,offset:q.offset};
   }));
   const controls=(output.controls??[]).map(item=>{const f=c.manifest?.fields.find(f=>f.id===item.fieldId),table=draft.bundle!.tables.find(t=>t.id===f?.typeId),row=table?.rows.find(r=>r.id===item.recordId),field=table?.fields.find(x=>x.key===f?.field);if(!f||!row||!field||!c.bindings.some(b=>b.typeId===table!.id&&b.fields.includes(field.key)))fail(400,'invalid_control','Preview control must refer to a bound draft field');return {slot:item.slot,label:f.label??field.name,kind:field.kind,value:row.data[field.key]??null,options:field.options??[],editable:false,action:''};});
   return {...output,controls,connected:!!c.manifest,temporary:true,frameUrl:new URL('/frontend/frame',appPublicUrl()).href};
  }finally{active.delete(v.handle.id);}
 }
 async destinations(a:Actor,input:unknown){
  requireHuman(a);const draft=await this.read(input);if(!draft.bundle)return [];
  const spaces=await new Service(this.db).workspaces(a),result=[];
  for(const space of spaces){const policy=await access(this.db,a,space.id);if(policy.role!=='owner'||policy.archived||!policy.ai_enabled)continue;
   const tables=(await this.db.query('SELECT id,name,fields,version FROM entity_types WHERE workspace_id=$1',[space.id])).rows;
   result.push({id:space.id,name:space.name,tables:draft.bundle.tables.map(t=>({draftTypeId:t.id,candidates:tables.filter(e=>compatible(t,e)&&t.fields.every(f=>e.fields.find((x:any)=>x.key===f.key)?.ai)).map(e=>({id:e.id,name:e.name,version:e.version}))}))});
  }return result;
 }
 async claim(a:Actor,input:unknown,digest:string,destinationInput?:unknown){
  requireHuman(a);const handle=guestHandle.parse(input),destination=destinationInput?guestDestination.parse(destinationInput):null;
  return this.db.transaction(async tx=>{
   const r=(await tx.query('SELECT * FROM guest_drafts WHERE id=$1 AND capability_hash=$2 FOR UPDATE',[handle.id,checksum(handle.token)])).rows[0];
   if(!r)fail(404,'draft_missing','Temporary tracker unavailable');
   if(r.digest!==digest)fail(409,'draft_changed','Review the exact tracker before saving');
   if(r.receipt){if(r.claimed_by!==a.userId)fail(409,'account_changed','This tracker was saved to a different account. No work was transferred.');return r.receipt;}
   if(new Date(r.expires_at).getTime()<=Date.now())fail(410,'draft_expired','Temporary tracker expired');
   const body=guestBundle.parse(r.body);
   const db:Database={query:(sql,v)=>tx.query(sql,v),transaction:fn=>fn(tx),close:async()=>{}};
   const service=new Service(db),f=new WorkspaceFoundation(db);
   // Every operation uses existing validation, write authorization, revisions and audit.
   // The outer transaction makes the whole import and receipt atomic.
   let w:any;
   if(destination){const p=await access(db,a,destination.workspaceId,true);if(p.role!=='owner'||!p.ai_enabled)fail(403,'destination_access','Choose an owned workspace with ChatGPT access already enabled');w={id:destination.workspaceId};
    if(destination.tables.length!==body.tables.length||new Set(destination.tables.map(t=>t.draftTypeId)).size!==body.tables.length||destination.tables.some(t=>!body.tables.some(b=>b.id===t.draftTypeId)))fail(400,'destination_mapping','Review every draft table exactly once');
   }else{w=await service.createWorkspace(a,body.name,{initialAiWorkspace:false});await service.setAi(a,w.id,true);}
   const change=async(op:unknown)=>{const p=await service.preview(a,w.id,op);return service.commit(a,p.id,p.digest);};
   const organization=async(op:unknown)=>{const p=await f.preview(a,w.id,op);return f.confirm(a,w.id,p.id,p.digest);};
   const project=await organization({kind:'create_node',nodeKind:'project',name:body.name});
   const mapping=new Map<string,string>(),versions=new Map<string,number>(),records=[];
   for(const t of body.tables){
    const chosen=destination?.tables.find(v=>v.draftTypeId===t.id);let tableId:string;
    if(chosen?.typeId){const {type}=await typeAccess(db,a,w.id,chosen.typeId,true);
     if(type.version!==chosen.expectedVersion||!compatible(t,type)||!t.fields.every(f=>type.fields.find((x:any)=>x.key===f.key)?.ai))fail(409,'destination_changed','Destination schema changed or is incompatible; review the mapping again');
     tableId=type.id;versions.set(t.id,type.version);
    }else{if(destination&&!chosen?.reason)fail(400,'mapping_reason','Explain why existing fields cannot represent this draft before creating a table');
     const saved=await change({kind:'create_type',name:t.name,fields:t.fields});tableId=saved.objects[0].id;versions.set(t.id,0);
    }mapping.set(t.id,tableId);
    for(const row of t.rows){const saved=await change({kind:'create_record',typeId:tableId,data:row.data});mapping.set(row.id,saved.objects[0].id);records.push({recordId:saved.objects[0].id,expectedVersion:0});}
   }
   if(records.length)await organization({kind:'link_project_records',projectId:project.id,expectedProjectVersion:0,records,reason:'Initial tracker saved by its account owner'});
   const components=[];
   for(const c of body.components){
    const source=c.source.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,x=>mapping.get(x)??x);
    const result=await organization({kind:'save_component',projectId:project.id,content:{...c,source,...(c.manifest?{manifest:{...c.manifest,fields:c.manifest.fields.map(f=>({...f,typeId:mapping.get(f.typeId)!,schemaVersion:versions.get(f.typeId)!}))}}:{}),bindings:c.bindings.map(b=>({...b,typeId:mapping.get(b.typeId)!}))}});components.push(result.id);
   }
   const receipt={destinationReview:destination,status:'saved',workspaceId:w.id,projectId:project.id,componentIds:components,savedAt:new Date().toISOString()};
   await tx.query('UPDATE guest_drafts SET claimed_by=$2,receipt=$3,body=NULL WHERE id=$1',[handle.id,a.userId,JSON.stringify(receipt)]);
   return receipt;
  });
 }
}
