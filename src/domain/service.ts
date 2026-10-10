import { randomUUID, createHash } from 'node:crypto';
import type { Connection, Database } from '../db/database.js';
import { operationSchema, fail, type Actor, type Field, type Operation } from '../shared/schema.js';
import { access, typeAccess, visibleFields, projectData } from './permissions.js';
import { templates, templateLinks } from './templates.js';
export type FileOperation={kind:'save_document';filename:string;mime:string;bytes:Buffer;ai:boolean;documentId?:string;expectedVersion?:number};
type Preview={id:string;actorId:string;workspaceId:string;operation:Operation|FileOperation;digest:string;expires:number};
const json=(v:unknown)=>JSON.stringify(v);
export const checksum=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
export async function audit(tx:Connection,a:Actor,p:any,action:string,objectId:string|null,before:unknown,after:unknown,reason?:string) {
 await tx.query('INSERT INTO audit_events(id,workspace_id,tenant_id,actor_id,action,object_id,origin,before_value,after_value,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[randomUUID(),p.id,p.tenant_id,a.userId,action,objectId,a.origin,json(before),json(after),reason??null]);
}
async function revision(tx:Connection,a:Actor,w:string,id:string,kind:string,version:number,snapshot:unknown) {
 await tx.query('INSERT INTO revisions(id,workspace_id,object_id,object_kind,version,snapshot,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),w,id,kind,version,json(snapshot),a.userId]);
}
export class Service {
 private previews=new Map<string,Preview>();
 constructor(public db:Database,public maxFileBytes=25*1024*1024) {}
 sweep() {for(const [k,p] of this.previews) if(p.expires<Date.now()) this.previews.delete(k);}
 async workspaces(a:Actor) {
  const rows=(await this.db.query(`SELECT w.id,w.name,w.ai_enabled,m.role FROM workspaces w JOIN memberships m ON m.tenant_id=w.tenant_id AND m.user_id=$1 LEFT JOIN workspace_access wa ON wa.workspace_id=w.id AND wa.user_id=$1 WHERE m.role='owner' OR wa.user_id IS NOT NULL ORDER BY w.created_at`,[a.userId])).rows;
  const result=[];for(const w of rows) {try {await access(this.db,a,w.id);result.push(w);}catch {}}return result;
 }
 async createWorkspace(a:Actor,name:string,options:{initialAiWorkspace?:boolean}={}) {
  if(a.origin!=='human'&&!options.initialAiWorkspace) fail(403,'human_required','Confirm creation of your first AI-accessible workspace');
  return this.db.transaction(async tx=>{
   const user=(await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[a.userId])).rows[0];if(!user)fail(401,'unauthenticated','Sign in required');
   if(options.initialAiWorkspace&&(await tx.query('SELECT user_id FROM memberships WHERE user_id=$1',[a.userId])).rows.length)fail(409,'workspace_exists','Your account already has a workspace. Open an authorised workspace or manage its AI access.');
   const member=(await tx.query("SELECT tenant_id FROM memberships WHERE user_id=$1 AND role='owner' ORDER BY tenant_id LIMIT 1",[a.userId])).rows[0];
   const tenantId=member?.tenant_id??randomUUID();
   if(!member){await tx.query('INSERT INTO tenants(id,name) VALUES($1,$2)',[tenantId,`${name} organisation`]);await tx.query("INSERT INTO memberships VALUES($1,$2,'owner')",[tenantId,a.userId]);}
   const id=randomUUID();await tx.query('INSERT INTO workspaces(id,tenant_id,name,ai_enabled) VALUES($1,$2,$3,$4)',[id,tenantId,name,!!options.initialAiWorkspace]);
   await audit(tx,a,{id,tenant_id:tenantId},'workspace.created',id,null,{name,ai_enabled:!!options.initialAiWorkspace});return {id,name};
  });
 }
 async types(a:Actor,w:string) {
  const p=await access(this.db,a,w);const rows=(await this.db.query('SELECT * FROM entity_types WHERE workspace_id=$1 ORDER BY created_at,name',[w])).rows;
  return rows.filter(t=>!p.allowed_types||p.allowed_types.includes(t.id)).map(t=>({...t,fields:visibleFields(t.fields,p,a)}));
 }
 async records(a:Actor,w:string,t:string,opts:{q?:string;limit?:number;offset?:number}={}) {
  const {type,policy}=await typeAccess(this.db,a,w,t);const fields=visibleFields(type.fields,policy,a);
  const limit=Math.min(100,Math.max(1,opts.limit??50)), offset=Math.max(0,opts.offset??0);
  // Search only visible keys; restricted fields must not leak through matching/counts.
  const args:any[]=[w,t];let where='workspace_id=$1 AND type_id=$2';
  if(opts.q){args.push(fields.map(f=>f.key),opts.q);where+=` AND EXISTS (SELECT 1 FROM jsonb_each_text(data) v WHERE v.key=ANY($3::text[]) AND strpos(lower(v.value),lower($4))>0)`;}
  const total=Number((await this.db.query(`SELECT count(*) AS count FROM records WHERE ${where}`,args)).rows[0].count);
  const rows=(await this.db.query(`SELECT * FROM records WHERE ${where} ORDER BY created_at,id LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,limit,offset])).rows;
  return {rows:rows.map(r=>({...r,data:projectData(r.data,fields)})),total,limit,offset};
 }
 async recordHistory(a:Actor,w:string,recordId:string,offset=0) {
  const r=(await this.db.query('SELECT * FROM records WHERE id=$1 AND workspace_id=$2',[recordId,w])).rows[0];
  if(!r)fail(404,'not_found','Record not found');
  const {type,policy}=await typeAccess(this.db,a,w,r.type_id);
  const fields=visibleFields(type.fields,policy,a);
  const revisions=(await this.db.query("SELECT version,snapshot,actor_id,created_at FROM revisions WHERE workspace_id=$1 AND object_id=$2 AND object_kind='record' ORDER BY version DESC LIMIT 51 OFFSET $3",[w,recordId,offset])).rows;
  return {recordId,typeId:r.type_id,currentVersion:r.version,typeVersion:type.version,fields,
   canRestore:policy.role!=='viewer'&&fields.length===type.fields.length&&!['archived','superseded'].includes(r.state),
   offset,hasMore:revisions.length>50,revisions:revisions.slice(0,50).map(v=>({version:v.version,actorId:v.actor_id,createdAt:v.created_at,state:v.snapshot.state,data:projectData(v.snapshot.data??{},fields)}))};
 }
 private async restoreData(tx:Connection,a:Actor,w:string,op:Extract<Operation,{kind:'restore_record'}>) {
  const r=(await tx.query('SELECT * FROM records WHERE id=$1 AND workspace_id=$2',[op.recordId,w])).rows[0];
  if(!r)fail(404,'not_found','Record not found');
  const {type,policy}=await typeAccess(tx,a,w,r.type_id,true);
  if(r.version!==op.expectedVersion||type.version!==op.expectedTypeVersion)fail(409,'stale_version','Record or fields changed. Refresh and preview again.');
  if(['archived','superseded'].includes(r.state))fail(409,'controlled_record','Archived records cannot be restored here');
  if(visibleFields(type.fields,policy,a).length!==type.fields.length)fail(403,'restricted_restore','Restoring requires access to every current field');
  if(op.sourceVersion>=r.version)fail(400,'invalid_revision','Choose an earlier version');
  const source=(await tx.query("SELECT snapshot FROM revisions WHERE workspace_id=$1 AND object_id=$2 AND object_kind='record' AND version=$3",[w,op.recordId,op.sourceVersion])).rows[0];
  if(!source)fail(404,'not_found','Version not found');
  const data=Object.fromEntries(type.fields.map((f:Field)=>[f.key,source.snapshot.data[f.key]??null]));
  await this.validateData(tx,a,w,type,policy,data);
  return {data,state:r.state==='approved'?'in_review':r.state};
 }
 async validateData(tx:Connection,a:Actor,w:string,type:any,policy:any,data:Record<string,any>,partial=false) {
  const fields=visibleFields(type.fields,policy,a);
  for(const key of Object.keys(data)) if(!fields.some(f=>f.key===key))fail(400,'invalid_field','A field is unavailable or unknown');
  for(const f of fields){const v=data[f.key];if(partial&&v===undefined)continue;
   if(v===undefined||v===null||v===''){if(f.required)fail(400,'required_field',`${f.name} is required`);continue;}
   if(['number','money'].includes(f.kind)&&typeof v!=='number')fail(400,'invalid_value',`${f.name} must be a number`);
   if(f.kind==='boolean'&&typeof v!=='boolean')fail(400,'invalid_value',`${f.name} must be true or false`);
   if(!['number','money','boolean'].includes(f.kind)&&typeof v!=='string')fail(400,'invalid_value',`${f.name} must be text`);
   if(f.kind==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v))))fail(400,'invalid_value',`${f.name} must be a date`);
   if(f.kind==='select'&&!f.options?.includes(v))fail(400,'invalid_value',`${f.name} has an invalid option`);
   if(f.kind==='relationship'){const r=(await tx.query('SELECT id,type_id FROM records WHERE id::text=$1 AND workspace_id=$2',[v,w])).rows[0];if(!r||(f.targetTypeId&&r.type_id!==f.targetTypeId))fail(400,'invalid_reference','Related record is unavailable');await typeAccess(tx,a,w,r.type_id);}
  }
  if(!partial && type.fields.some((f:Field)=>f.required&&!fields.some(x=>x.key===f.key)))fail(403,'restricted_required','Creation requires a field you cannot access');
 }
 async validate(tx:Connection,a:Actor,w:string,op:Operation|FileOperation) {
  const p=await access(tx,a,w,true);
  if(['create_type','update_type','install_template','create_view'].includes(op.kind)&&p.role!=='owner')fail(403,'owner_required','Only the owner may configure this workspace');
  if(op.kind==='save_document'&&(p.allowed_types!==null||p.hidden_fields.length))fail(403,'restricted_documents','Document access for restricted views is not enabled');
  if(op.kind==='update_type'){const {type}=await typeAccess(tx,a,w,op.typeId,true);if(a.origin==='ai'&&type.fields.some((f:Field)=>!f.ai))fail(403,'restricted_configuration','Edit tables containing model-restricted fields in the standalone application');if(type.version!==op.expectedVersion)fail(409,'stale_version','Table changed; preview again');const populated=Number((await tx.query('SELECT count(*) AS n FROM records WHERE type_id=$1 AND workspace_id=$2',[op.typeId,w])).rows[0].n)>0;if(populated){for(const old of type.fields){const next=op.fields.find(f=>f.key===old.key);if(!next||next.kind!==old.kind||json(next.options)!==json(old.options)||next.targetTypeId!==old.targetTypeId||(!old.required&&next.required))fail(409,'migration_required','Existing data requires an explicit field migration; use an optional new field instead');}if(op.fields.some(f=>f.required&&!type.fields.some((old:Field)=>old.key===f.key)))fail(409,'migration_required','New fields on populated tables must be optional');}}
  if(op.kind==='restore_record')await this.restoreData(tx,a,w,op);
  if(op.kind==='create_record'){const t=await typeAccess(tx,a,w,op.typeId,true);await this.validateData(tx,a,w,t.type,t.policy,op.data);}
  if(op.kind==='update_record'){const r=(await tx.query('SELECT * FROM records WHERE id=$1 AND workspace_id=$2',[op.recordId,w])).rows[0];if(!r)fail(404,'not_found','Record not found');const t=await typeAccess(tx,a,w,r.type_id,true);if(r.version!==op.expectedVersion)fail(409,'stale_version','The record changed. Refresh and preview again.');if(['archived','superseded'].includes(r.state))fail(409,'controlled_record','Controlled record requires a new reviewed revision; direct editing is disabled');await this.validateData(tx,a,w,t.type,t.policy,op.data,true);}
  if(op.kind==='create_automation') {const g=(await tx.query('SELECT * FROM action_grants WHERE id=$1 AND workspace_id=$2 AND user_id=$3',[op.grantId,w,a.userId])).rows[0];if(!g||g.revoked_at||g.used_at||g.action!=='reports.prepare'||g.destination!==w)fail(403,'invalid_grant','Choose an active report permission for this workspace');}
  if(op.kind==='create_view') {const t=await typeAccess(tx,a,w,op.typeId);const keys=visibleFields(t.type.fields,t.policy,a).map(f=>f.key);if([...(op.config.columns??[]),op.config.dateField,op.config.groupBy].filter(Boolean).some(k=>!keys.includes(k!)))fail(400,'invalid_field','View contains unavailable fields');}
  if(op.kind==='install_template'&&!templates.some(t=>t.id===op.template))fail(400,'template_unknown','Template not found');
  if(op.kind==='save_document'&&op.documentId){const prev=(await tx.query('SELECT * FROM document_versions WHERE document_id=$1 AND workspace_id=$2 ORDER BY version DESC LIMIT 1',[op.documentId,w])).rows[0];if(!prev)fail(404,'not_found','Document not found');if(prev.version!==op.expectedVersion)fail(409,'stale_version','Document changed; preview again');if(a.origin==='ai'&&!prev.ai_enabled)fail(403,'ai_disabled','Document unavailable');}
  return p;
 }
 async preview(a:Actor,w:string,input:unknown) {const op=operationSchema.parse(input);return this.prepare(a,w,op);}
 async previewFile(a:Actor,w:string,input:{filename:string;mime:string;bytes:Buffer;ai:boolean;documentId?:string;expectedVersion?:number}) {
  if(!input.bytes.length||input.bytes.length>this.maxFileBytes)fail(413,'file_size','File is empty or exceeds the upload limit');
  if(input.filename.length>250||input.mime.length>150)fail(400,'file_metadata','File metadata is too long');
  return this.prepare(a,w,{kind:'save_document',...input});
 }
 private async prepare(a:Actor,w:string,op:Operation|FileOperation) {
  await this.validate(this.db,a,w,op);this.sweep();
  const memory=Array.from(this.previews.values()).reduce((sum,p)=>sum+(p.operation.kind==='save_document'?p.operation.bytes.length:Buffer.byteLength(json(p.operation))),0);
  if(this.previews.size>=1000||memory+(op.kind==='save_document'?op.bytes.length:Buffer.byteLength(json(op)))>100*1024*1024)fail(503,'preview_capacity','Preview capacity reached; discard old previews and retry');
  const summary=op.kind==='restore_record'?{...op,...await this.restoreData(this.db,a,w,op)}:op.kind==='save_document'?{...op,bytes:undefined,byteSize:op.bytes.length,checksum:checksum(op.bytes)}:op;
  const p:Preview={id:randomUUID(),actorId:a.userId,workspaceId:w,operation:op,digest:checksum(json(summary)),expires:Date.now()+24*3600000};this.previews.set(p.id,p);
  return {id:p.id,digest:p.digest,workspaceId:w,expiresAt:new Date(p.expires).toISOString(),status:'preview',summary};
 }
 async discard(a:Actor,id:string) {const p=this.previews.get(id);if(p?.actorId!==a.userId)fail(404,'not_found','Preview not found');this.previews.delete(id);return {status:'discarded'};}
 async receipt(a:Actor,id:string) {const r=(await this.db.query('SELECT * FROM commit_receipts WHERE preview_id=$1 AND actor_id=$2',[id,a.userId])).rows[0];if(!r)fail(404,'not_found','Save receipt not found');await access(this.db,a,r.workspace_id);return r.result;}
 async commit(a:Actor,id:string,digest:string) {
  const result=await this.db.transaction(async tx=>{
   // Serialise retries of the same logical save, including concurrent requests.
   await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))',[id]);
   const existing=(await tx.query('SELECT * FROM commit_receipts WHERE preview_id=$1',[id])).rows[0];
   if(existing){if(existing.actor_id!==a.userId||existing.digest!==digest)fail(409,'receipt_mismatch','Save does not match this confirmation');await access(tx,a,existing.workspace_id);return existing.result;}
   const p=this.previews.get(id);if(!p||p.actorId!==a.userId||p.expires<Date.now())fail(410,'preview_expired','Preview expired; prepare it again');
   if(p.digest!==digest)fail(409,'preview_mismatch','Preview changed; review it again');
   // Workspace lock serialises permissions/configuration changes with commits.
   await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[p.workspaceId]);
   const policy=await this.validate(tx,a,p.workspaceId,p.operation);
   const objects=await this.apply(tx,a,p.workspaceId,p.operation,policy);
   const result={status:'saved',previewId:id,objects,savedAt:new Date().toISOString()};
   await tx.query('INSERT INTO commit_receipts(preview_id,actor_id,workspace_id,digest,result) VALUES($1,$2,$3,$4,$5)',[id,a.userId,p.workspaceId,digest,json(result)]);return result;
  });this.previews.delete(id);return result;
 }
 private async apply(tx:Connection,a:Actor,w:string,op:Operation|FileOperation,p:any):Promise<any[]> {
  if(op.kind==='install_template'){
   const template=templates.find(t=>t.id===op.template)!;const result:any[]=[];
   // Name collision aborts this whole transaction rather than merging unrelated configuration.
   for(const table of template.tables){const links=templateLinks[table.name]??{};const fields=table.fields.map(f=>{const target=result.find(t=>t.name===links[f.key]);return target?{...f,kind:'relationship' as const,targetTypeId:target.id}:f;});result.push(...await this.apply(tx,a,w,{kind:'create_type',name:table.name,fields},p));}
   await audit(tx,a,p,'template.installed',null,null,{template:template.id,version:template.version});return result;
  }
  if(op.kind==='create_type'){
   const id=randomUUID();await tx.query('INSERT INTO entity_types(id,workspace_id,name,fields) VALUES($1,$2,$3,$4)',[id,w,op.name,json(op.fields)]);
   await revision(tx,a,w,id,'type',0,op);await audit(tx,a,p,'type.created',id,null,op);return [{id,kind:'type',version:0,name:op.name}];
  }
  if(op.kind==='update_type'){const old=(await tx.query('SELECT * FROM entity_types WHERE id=$1 AND workspace_id=$2',[op.typeId,w])).rows[0];const version=old.version+1;await tx.query('UPDATE entity_types SET name=$1,fields=$2,version=$3 WHERE id=$4',[op.name,json(op.fields),version,op.typeId]);await revision(tx,a,w,op.typeId,'type',version,op);await audit(tx,a,p,'type.updated',op.typeId,{name:old.name,fields:old.fields},op);return [{id:op.typeId,kind:'type',version}];}
  if(op.kind==='create_record'||op.kind==='update_record'){
   const before=op.kind==='update_record'?(await tx.query('SELECT * FROM records WHERE id=$1 AND workspace_id=$2 FOR UPDATE',[op.recordId,w])).rows[0]:null;
   const id=before?.id??randomUUID(), version=before?before.version+1:0, data={...before?.data,...op.data};
   const state=before?.state==='approved'?'in_review':before?.state??'draft';
   if(before)await tx.query('UPDATE records SET data=$1,version=$2,state=$4,updated_at=now() WHERE id=$3',[json(data),version,id,state]);
   else await tx.query('INSERT INTO records(id,type_id,workspace_id,data) VALUES($1,$2,$3,$4)',[id,op.kind==='create_record'?op.typeId:null,w,json(data)]);
   await revision(tx,a,w,id,'record',version,{data,state});await audit(tx,a,p,before?'record.updated':'record.created',id,before?{data:before.data,state:before.state}:null,{data,state},op.kind==='update_record'?op.reason:undefined);return [{id,kind:'record',version}];
  }
  if(op.kind==='restore_record'){
   const restored=await this.restoreData(tx,a,w,op);
   const result=await this.apply(tx,a,w,{kind:'update_record',recordId:op.recordId,expectedVersion:op.expectedVersion,data:restored.data,reason:op.reason},p);
   await audit(tx,a,p,'record.restored',op.recordId,{version:op.expectedVersion},{sourceVersion:op.sourceVersion,version:op.expectedVersion+1},op.reason);return result;
  }
  if(op.kind==='create_automation'){const id=randomUUID();await tx.query('INSERT INTO automations(id,workspace_id,owner_id,grant_id,name,interval_minutes,next_run) VALUES($1,$2,$3,$4,$5,$6,now())',[id,w,a.userId,op.grantId,op.name,op.intervalMinutes]);await revision(tx,a,w,id,'automation',0,op);await audit(tx,a,p,'automation.created',id,null,op);return [{id,kind:'automation',version:0}];}
  if(op.kind==='create_view'){
   const id=randomUUID();await tx.query('INSERT INTO saved_views(id,workspace_id,name,kind,type_id,config) VALUES($1,$2,$3,$4,$5,$6)',[id,w,op.name,op.viewKind,op.typeId,json(op.config)]);await revision(tx,a,w,id,'view',0,op);await audit(tx,a,p,'view.created',id,null,op);return [{id,kind:'view',version:0}];
  }
  const id=randomUUID(), documentId=op.documentId??randomUUID(),version=op.expectedVersion!==undefined?op.expectedVersion+1:0;
  const meta={id,documentId,version,filename:op.filename,mime:op.mime,checksum:checksum(op.bytes),byteSize:op.bytes.length,ai:op.ai};
  await tx.query('INSERT INTO document_versions(id,document_id,workspace_id,filename,mime,byte_size,checksum,version,ai_enabled,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,documentId,w,op.filename,op.mime,op.bytes.length,meta.checksum,version,op.ai,a.userId]);
  await tx.query('INSERT INTO document_payloads VALUES($1,$2)',[id,op.bytes]);await tx.query('INSERT INTO extractions(version_id) VALUES($1)',[id]);
  await tx.query("INSERT INTO jobs(id,workspace_id,kind,payload) VALUES($1,$2,'extract',$3)",[randomUUID(),w,json({versionId:id})]);
  await revision(tx,a,w,documentId,'document',version,meta);await audit(tx,a,p,'document.saved',documentId,null,meta);return [{id:documentId,versionId:id,kind:'document',version}];
 }
 async documents(a:Actor,w:string) {
  const p=await access(this.db,a,w);if(p.allowed_types!==null||p.hidden_fields.length)fail(403,'restricted_documents','Document access for restricted views is not enabled');
  return (await this.db.query(`SELECT d.*,e.status AS extraction_status FROM document_versions d JOIN extractions e ON e.version_id=d.id WHERE d.workspace_id=$1 ${a.origin==='ai'?'AND d.ai_enabled=true':''} ORDER BY d.created_at DESC`,[w])).rows;
 }
 async original(a:Actor,w:string,id:string) {
  const docs=await this.documents(a,w);const d=docs.find(x=>x.id===id);if(!d)fail(404,'not_found','Document not found');
  const b=(await this.db.query('SELECT bytes FROM document_payloads WHERE version_id=$1',[id])).rows[0];const bytes=Buffer.from(b.bytes);if(checksum(bytes)!==d.checksum)fail(500,'integrity_failure','The original failed its integrity check');return {...d,bytes};
 }
 async documentText(a:Actor,w:string,versionId:string,offset=0) {
  const d=(await this.documents(a,w)).find(d=>d.id===versionId);if(!d)fail(404,'not_found','Document not found');
  const e=(await this.db.query('SELECT status,text_content FROM extractions WHERE version_id=$1',[versionId])).rows[0];
  const text=['ready','partial'].includes(e?.status)?e.text_content??'':'';
  return {documentId:d.document_id,versionId,version:d.version,filename:d.filename,status:e?.status??'pending',offset,text:text.slice(offset,offset+12000),hasMore:offset+12000<text.length};
 }
 async search(a:Actor,w:string,q:string) {
  const docs=await this.documents(a,w);const ids=docs.map(d=>d.id);
  const coverage={total:docs.length,pending:docs.filter(d=>d.extraction_status==='pending').length,unavailable:docs.filter(d=>d.extraction_status==='unavailable').length,partial:docs.filter(d=>d.extraction_status==='partial').length};
  const hits=(await this.db.query(`SELECT d.id AS version_id,d.document_id,d.filename,d.version,e.sections,ts_headline('simple',e.text_content,plainto_tsquery('simple',$2),'StartSel=,StopSel=,MaxWords=60,MinWords=15') AS passage FROM extractions e JOIN document_versions d ON d.id=e.version_id WHERE e.version_id=ANY($1::uuid[]) AND e.status IN ('ready','partial') AND e.search_vector @@ plainto_tsquery('simple',$2) ORDER BY ts_rank(e.search_vector,plainto_tsquery('simple',$2)) DESC LIMIT 20`,[ids,q])).rows;
  return {hits,coverage};
 }
 async history(a:Actor,w:string) {const p=await access(this.db,a,w);if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','History is available to the human workspace owner');return (await this.db.query('SELECT * FROM audit_events WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 200',[w])).rows;}
 async views(a:Actor,w:string) {const p=await access(this.db,a,w);const types=await this.types(a,w);return (await this.db.query('SELECT * FROM saved_views WHERE workspace_id=$1 ORDER BY name',[w])).rows.filter(v=>types.some(t=>t.id===v.type_id)).map(v=>({...v,config:{...v.config,columns:(v.config.columns??[]).filter((k:string)=>types.find(t=>t.id===v.type_id)?.fields.some((f:Field)=>f.key===k))}}));}
 async setAi(a:Actor,w:string,enabled:boolean) {return this.db.transaction(async tx=>{await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w,true);if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','Human owner required');await tx.query('UPDATE workspaces SET ai_enabled=$1 WHERE id=$2',[enabled,w]);await audit(tx,a,p,'workspace.ai_access',w,{enabled:p.ai_enabled},{enabled});return {enabled};});}
 async grant(a:Actor,w:string,action:string,destination:string,future:boolean) {return this.db.transaction(async tx=>{const p=await access(tx,a,w,true);if(a.origin!=='human')fail(403,'human_required','Human authorisation required');const id=randomUUID();await tx.query('INSERT INTO action_grants(id,workspace_id,user_id,action,destination,future) VALUES($1,$2,$3,$4,$5,$6)',[id,w,a.userId,action,destination,future]);await audit(tx,a,p,'permission.granted',id,null,{action,destination,future});return {id};});}
 async grants(a:Actor,w:string) {await access(this.db,a,w);return (await this.db.query('SELECT * FROM action_grants WHERE workspace_id=$1 AND user_id=$2 ORDER BY created_at DESC',[w,a.userId])).rows;}
 async revoke(a:Actor,w:string,id:string) {return this.db.transaction(async tx=>{const p=await access(tx,a,w,true);if(a.origin!=='human')fail(403,'human_required','Human authorisation required');const g=(await tx.query('UPDATE action_grants SET revoked_at=now() WHERE id=$1 AND workspace_id=$2 AND user_id=$3 RETURNING id',[id,w,a.userId])).rows[0];if(!g)fail(404,'not_found','Permission not found');await audit(tx,a,p,'permission.revoked',id,null,{revoked:true});return {id};});}
 async members(a:Actor,w:string){const p=await access(this.db,a,w);if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','Human owner required');return (await this.db.query('SELECT a.*,u.name,u.email FROM workspace_access a JOIN users u ON u.id=a.user_id WHERE a.workspace_id=$1',[w])).rows;}
 async share(a:Actor,w:string,userId:string,role:string,hiddenFields:string[],allowedTypes:string[]|null,ai:boolean){return this.db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w,true);if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','Human owner required');
  if(userId===a.userId)fail(400,'self_share','Your owner role is managed at organisation level');
  if(!(await tx.query('SELECT id FROM users WHERE id=$1',[userId])).rows.length)fail(404,'not_found','Ask this colleague to sign in first and share their user ID');
  const existing=(await tx.query('SELECT role FROM memberships WHERE tenant_id=$1 AND user_id=$2',[p.tenant_id,userId])).rows[0];if(existing?.role==='owner')fail(400,'owner_role','Another organisation owner cannot be restricted here');
  if(allowedTypes){const types=(await tx.query('SELECT id FROM entity_types WHERE workspace_id=$1',[w])).rows;if(allowedTypes.some(id=>!types.some(t=>t.id===id)))fail(400,'invalid_type','A table is not in this workspace');}
  await tx.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'viewer') ON CONFLICT DO NOTHING",[p.tenant_id,userId]);
  const before=(await tx.query('SELECT * FROM workspace_access WHERE workspace_id=$1 AND user_id=$2',[w,userId])).rows[0]??null;
  await tx.query('INSERT INTO workspace_access(workspace_id,user_id,role,hidden_fields,allowed_types,ai_enabled) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(workspace_id,user_id) DO UPDATE SET role=excluded.role,hidden_fields=excluded.hidden_fields,allowed_types=excluded.allowed_types,ai_enabled=excluded.ai_enabled',[w,userId,role,json(hiddenFields),allowedTypes===null?null:json(allowedTypes),ai]);
  await audit(tx,a,p,'access.changed',userId,before,{role,hiddenFields,allowedTypes,ai});return {userId,role};
 });}
 async unshare(a:Actor,w:string,userId:string){return this.db.transaction(async tx=>{await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w,true);if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','Human owner required');const before=(await tx.query('DELETE FROM workspace_access WHERE workspace_id=$1 AND user_id=$2 RETURNING *',[w,userId])).rows[0];if(!before)fail(404,'not_found','Access not found');await audit(tx,a,p,'access.revoked',userId,before,null);return {userId};});}
 async transition(a:Actor,w:string,recordId:string,expectedVersion:number,state:'in_review'|'approved'|'archived',meaning:string){return this.db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w,true);if(a.origin!=='human')fail(403,'human_required','Review decisions require a human');
  const r=(await tx.query('SELECT * FROM records WHERE id=$1 AND workspace_id=$2 FOR UPDATE',[recordId,w])).rows[0];if(!r)fail(404,'not_found','Record not found');await typeAccess(tx,a,w,r.type_id,true);
  if(p.hidden_fields.length||p.allowed_types!==null)fail(403,'full_review_required','Review requires full workspace access');
  if(r.version!==expectedVersion)fail(409,'stale_version','Record changed; review the latest version');
  if(r.state==='archived'||(state==='approved'&&r.state!=='in_review'))fail(409,'invalid_state','Submit the current draft for review first');
  const version=r.version+1;await tx.query('UPDATE records SET state=$1,version=$2,updated_at=now() WHERE id=$3',[state,version,recordId]);
  if(state==='approved')await tx.query('INSERT INTO approvals(id,workspace_id,record_id,record_version,actor_id,meaning) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),w,recordId,version,a.userId,meaning]);
  await revision(tx,a,w,recordId,'record',version,{data:r.data,state});await audit(tx,a,p,'record.'+state,recordId,{state:r.state,version:r.version},{state,version},meaning);return {id:recordId,version,state};
 });}
 async exportWorkspace(a:Actor,w:string){return this.db.transaction(async tx=>{
  // Block concurrent workspace commits for a consistent original/history snapshot.
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w);if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','Human owner required');
  const documents=(await tx.query('SELECT d.*,p.bytes FROM document_versions d JOIN document_payloads p ON p.version_id=d.id WHERE d.workspace_id=$1',[w])).rows.map(d=>{const bytes=Buffer.from(d.bytes);if(checksum(bytes)!==d.checksum)fail(500,'integrity_failure','Original integrity check failed');return {...d,bytes:undefined,base64:bytes.toString('base64')};});
  const result:any={format:'trialy-export',formatVersion:1,workspace:{id:w,name:p.name},exportedAt:new Date().toISOString(),documents};
  for(const table of ['entity_types','records','saved_views','revisions','approvals','audit_events','automations','automation_runs'])result[table]=(await tx.query(`SELECT * FROM ${table} WHERE workspace_id=$1 ORDER BY id`,[w])).rows;
  await audit(tx,a,p,'workspace.exported',w,null,{formatVersion:1,documents:documents.length});return result;
 });}
 async automations(a:Actor,w:string){await access(this.db,a,w);return (await this.db.query('SELECT * FROM automations WHERE workspace_id=$1 AND owner_id=$2 ORDER BY created_at',[w,a.userId])).rows;}
 async runs(a:Actor,w:string){await access(this.db,a,w);const allowed=(await this.types(a,w)).map(t=>t.id);return (await this.db.query('SELECT r.* FROM automation_runs r JOIN automations a ON a.id=r.automation_id WHERE r.workspace_id=$1 AND a.owner_id=$2 ORDER BY r.created_at DESC LIMIT 50',[w,a.userId])).rows.map(r=>({...r,summary:{...r.summary,tables:r.summary.tables?.filter((t:any)=>allowed.includes(t.id))}}));}
 async pause(a:Actor,w:string,id:string,paused:boolean){return this.db.transaction(async tx=>{const p=await access(tx,a,w,true);if(a.origin!=='human')fail(403,'human_required','Human authorisation required');const before=(await tx.query('UPDATE automations SET paused=$1,version=version+1 WHERE id=$2 AND workspace_id=$3 AND owner_id=$4 RETURNING *',[paused,id,w,a.userId])).rows[0];if(!before)fail(404,'not_found','Automation not found');await revision(tx,a,w,id,'automation',before.version,before);await audit(tx,a,p,'automation.paused',id,null,{paused});return {id,paused};});}

}
