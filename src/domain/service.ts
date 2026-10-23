import {activeProject} from './project-context.js';
import {validateDerived,DerivedReader,validateRenderer} from './derived-fields.js';
import {fieldChangeQuerySchema,type FieldChangeQuery} from '../shared/schema.js';
import {requireCurrentAction,requireHuman,setWriteAuthorization,type WriteAuthorization} from './write-authorization.js';
import {DataService} from './data-service.js';
import {checksum,audit,revision} from './evidence.js';
export {checksum,audit} from './evidence.js';
import {templateDiff,adoptionDiff} from './template-upgrades.js';
import {nextDaily} from '../shared/schedules.js';
import {calculate,formulaOrder,editableData,derived} from '../shared/formulas.js';
import { randomUUID, createHash } from 'node:crypto';
import type { Connection, Database } from '../db/database.js';
import { operationSchema, viewFields, viewConfigSchema, fail, type Actor, type Field, type Operation, type RecordQuery } from '../shared/schema.js';
import { access, typeAccess, visibleFields, projectData, folderAllowed } from './permissions.js';
import {PostgresOriginalStore,type OriginalStore} from '../db/originals.js';
import { templates, templateLinks } from './templates.js';
export type FileOperation={kind:'save_document';filename:string;mime:string;bytes:Buffer;ai:boolean;documentId?:string;expectedVersion?:number;submissionFileId?:string};
type Preview={id:string;actorId:string;workspaceId:string;operation:Operation|FileOperation;digest:string;expires:number;schemaFingerprint?:string;migrationFingerprint?:string};
const json=(v:unknown)=>JSON.stringify(v);
export class Service extends DataService {
 constructor(db:Database,maxFileBytes=25*1024*1024,originals:OriginalStore=new PostgresOriginalStore()) {super(db,maxFileBytes,originals);}
 async sweep() {await this.db.query('DELETE FROM data_previews WHERE expires_at<=now()');await this.db.query('DELETE FROM guest_drafts WHERE expires_at<=now() AND receipt IS NULL');}
 async ensureAccount(a:Actor){
  if(!['human','ai'].includes(a.origin))fail(403,'account_required','Connect your account first');
  await this.db.transaction(async tx=>{
   const user=(await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[a.userId])).rows[0];if(!user)fail(401,'unauthenticated','Sign in required');
   if((await tx.query('SELECT user_id FROM memberships WHERE user_id=$1 LIMIT 1',[a.userId])).rows.length)return;
   const db:Database={query:(q,v)=>tx.query(q,v),transaction:fn=>fn(tx),close:async()=>{}};
   await new Service(db).createWorkspace(a,'My account',{initialAiWorkspace:true});
  });
  return this.workspaces(a);
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
  const data=Object.fromEntries(type.fields.filter((f:Field)=>!derived(f)).map((f:Field)=>[f.key,source.snapshot.data[f.key]??null]));
  await this.validateData(tx,a,w,type,policy,data,false,op.recordId);
  return {data,state:r.state==='approved'?'in_review':r.state};
 }
 private async migrationData(tx:Connection,a:Actor,w:string,op:Extract<Operation,{kind:'migrate_type'}>){
  const {type,policy}=await typeAccess(tx,a,w,op.typeId,true);if(a.origin!=='human'||policy.role!=='owner')fail(403,'owner_required','Field migrations require the human owner');
  if(type.version!==op.expectedVersion)fail(409,'stale_version','Table changed');await validateDerived(tx,a,w,op.typeId,op.fields);
  for(const [key,map] of Object.entries(op.mappings)){if(!op.fields.some(f=>f.key===key&&!derived(f))||!type.fields.some((f:Field)=>f.key===map.from))fail(400,'invalid_mapping','Choose current source fields and editable destination fields');}
  const records=(await tx.query('SELECT * FROM records WHERE workspace_id=$1 AND type_id=$2 ORDER BY id LIMIT 201',[w,op.typeId])).rows;if(records.length>200)fail(409,'migration_limit','Interactive migrations support at most 200 records');
  if(records.some(r=>['archived','superseded'].includes(r.state)))fail(409,'controlled_record','Archived or superseded records cannot be migrated here');
  const nextType={...type,fields:op.fields.map(f=>({...f,unique:false}))};const changed=[];
  for(const r of records){const data:Record<string,any>={};for(const f of op.fields.filter(f=>!derived(f))){const mapping=op.mappings[f.key],source=mapping?.from??f.key;let value=r.data[source]??null;
   if(value!==null&&value!==''){switch(mapping?.conversion??'copy'){case 'text':value=String(value);break;case 'number':if(typeof value!=='number'&&(typeof value!=='string'||!value.trim()))fail(400,'invalid_conversion','Numeric conversion has an empty or non-text input');value=Number(value);if(!Number.isFinite(value))fail(400,'invalid_conversion','A value cannot convert to a finite number');break;case 'boolean':if(!['true','false','yes','no',true,false].includes(value))fail(400,'invalid_conversion','Boolean conversion requires true/false or yes/no');value=value===true||value==='true'||value==='yes';break;}}
   data[f.key]=value;
  }await this.validateData(tx,a,w,nextType,policy,data,false,r.id);changed.push({id:r.id,version:r.version,before:r.data,data:calculate(op.fields,data),state:r.state==='approved'?'in_review':r.state});}
  for(const f of op.fields.filter(f=>f.unique)){const values=changed.map(r=>r.data[f.key]).filter(v=>v!==null&&v!==undefined&&v!=='').map(json);if(new Set(values).size!==values.length)fail(409,'duplicate_value','Converted values do not satisfy uniqueness');}
  if(Buffer.byteLength(json(changed))>1024*1024)fail(409,'migration_limit','Migration preview exceeds 1 MiB; use smaller tables');
  return {before:type,records:changed,fingerprint:checksum(json(records.map(r=>[r.id,r.version])))};
 }
 async validateData(tx:Connection,a:Actor,w:string,type:any,policy:any,data:Record<string,any>,partial=false,recordId?:string) {
  const fields=visibleFields(type.fields,policy,a);
  for(const key of Object.keys(data)) if(!fields.some(f=>f.key===key&&!derived(f)))fail(400,'invalid_field','A field is unavailable or unknown');
  for(const f of fields){if(derived(f))continue;const v=data[f.key];if(partial&&v===undefined)continue;
   if(v===undefined||v===null||v===''){if(f.required)fail(400,'required_field',`${f.name} is required`);continue;}
   if(f.multiple){
    if(!Array.isArray(v)||v.length>100||new Set(v).size!==v.length||v.some(x=>typeof x!=='string'))fail(400,'invalid_reference','Use up to 100 distinct reference IDs');
    if(f.required&&!v.length)fail(400,'required_field',`${f.name} is required`);
    for(const value of v)await this.validateData(tx,a,w,{...type,fields:[{...f,multiple:false,required:false,unique:false}]},policy,{[f.key]:value},true,recordId);
    continue;
   }
   if(f.kind==='table')await typeAccess(tx,a,w,String(v));
   if(f.kind==='field'){const t=await typeAccess(tx,a,w,f.targetTypeId!);if(!visibleFields(t.type.fields,t.policy,a).some(x=>x.key===v))fail(400,'invalid_reference','Field is unavailable');}
   if(['number','money'].includes(f.kind)&&typeof v!=='number')fail(400,'invalid_value',`${f.name} must be a number`);
   if(f.kind==='boolean'&&typeof v!=='boolean')fail(400,'invalid_value',`${f.name} must be true or false`);
   if(!['number','money','boolean'].includes(f.kind)&&typeof v!=='string')fail(400,'invalid_value',`${f.name} must be text`);
   if(f.kind==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v))fail(400,'invalid_value',`${f.name} must be a date`);
   if(f.kind==='select'&&!f.options?.includes(v))fail(400,'invalid_value',`${f.name} has an invalid option`);
   if(f.unique){const duplicate=(await tx.query("SELECT id FROM records WHERE workspace_id=$1 AND type_id=$2 AND data->$3::text=$4::jsonb AND ($5::uuid IS NULL OR id<>$5) LIMIT 1",[w,type.id,f.key,json(v),recordId??null])).rows[0];if(duplicate)fail(409,'duplicate_value',`${f.name} must be unique`);}
   if(f.kind==='person'){const person=(await tx.query('SELECT u.id FROM users u JOIN memberships m ON m.user_id=u.id WHERE u.id::text=$1 AND m.tenant_id=$2',[v,policy.tenant_id])).rows[0];if(!person)fail(400,'invalid_reference','Person is not a member of this organisation');}
   if(f.kind==='document'){await this.documentPermission(tx,a,w,String(v),true);if(!policy.document_scope)fail(403,'restricted_documents','Document references are unavailable for this access scope');const doc=(await tx.query('SELECT id FROM document_versions WHERE id::text=$1 AND workspace_id=$2 AND ($3=false OR ai_enabled=true)',[v,w,a.origin==='ai'])).rows[0];if(!doc)fail(400,'invalid_reference','Document version is unavailable');}
   if(f.kind==='relationship'){const r=(await tx.query("SELECT id,type_id FROM records WHERE id::text=$1 AND workspace_id=$2 AND state NOT IN ('archived','superseded')",[v,w])).rows[0];if(!r||(f.targetTypeId&&r.type_id!==f.targetTypeId))fail(400,'invalid_reference','Related record is unavailable');await typeAccess(tx,a,w,r.type_id);}
  }
  if(!partial && type.fields.some((f:Field)=>f.required&&!fields.some(x=>x.key===f.key)))fail(403,'restricted_required','Creation requires a field you cannot access');
 }
 async validate(tx:Connection,a:Actor,w:string,op:Operation|FileOperation) {
  const p=await access(tx,a,w,op.kind!=='set_workspace_policy');
  if(op.kind==='request_review'){
   if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','A human owner must route reviews');
   const r=(await tx.query('SELECT * FROM records WHERE id=$1 AND workspace_id=$2',[op.recordId,w])).rows[0];if(!r)fail(404,'not_found','Record not found');
   if(r.version!==op.expectedVersion)fail(409,'stale_version','Record changed; preview again');if(['archived','superseded','approved'].includes(r.state))fail(409,'invalid_state','Choose a draft or record in review');
   const reviewer=await access(tx,{userId:op.reviewerId,origin:'human'},w,true);if(reviewer.hidden_fields.length||reviewer.allowed_types!==null)fail(403,'full_review_required','The reviewer needs full workspace editing access');
   if((await tx.query('SELECT r.id FROM record_review_requests r LEFT JOIN record_review_decisions d ON d.request_id=r.id WHERE r.record_id=$1 AND d.request_id IS NULL',[op.recordId])).rows.length)fail(409,'review_pending','Cancel or complete the existing request before rerouting');
   if(op.dueOn&&(Number.isNaN(Date.parse(op.dueOn))||new Date(op.dueOn).toISOString().slice(0,10)!==op.dueOn))fail(400,'invalid_date','Choose a valid due date');
  }
  if(op.kind==='accept_submission'){requireCurrentAction(a);if(p.role!=='owner')fail(403,'owner_required','A human owner must review external submissions');const submission=(await tx.query('SELECT f.id FROM form_submissions f LEFT JOIN submission_acceptances accepted ON accepted.submission_id=f.id WHERE f.id=$1 AND f.workspace_id=$2 AND f.type_id=$3 AND accepted.submission_id IS NULL',[op.submissionId,w,op.typeId])).rows[0];if(!submission)fail(409,'submission_unavailable','Submission is unavailable or already accepted');const linked=(await tx.query('SELECT l.project_id FROM external_links l JOIN form_submissions s ON s.link_id=l.id WHERE s.id=$1 AND s.workspace_id=$2',[op.submissionId,w])).rows[0];if(linked?.project_id)await activeProject(tx,a,w,linked.project_id);await this.validate(tx,a,w,{kind:'create_record',typeId:op.typeId,data:op.data});}
  if(['create_type','update_type','install_template','create_view','update_view'].includes(op.kind)&&p.role!=='owner')fail(403,'owner_required','Only the owner may configure this workspace');
  if(op.kind==='migrate_type')await this.migrationData(tx,a,w,op);
  if(op.kind==='adopt_template'){if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','Human owner required for template adoption');await adoptionDiff(tx,w,op.template,op.mapping);}
  if(op.kind==='upgrade_template'){if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','Human owner required for template upgrades');const diff=await templateDiff(tx,w,op.template);if(diff.installedVersion!==op.expectedVersion||diff.availableVersion<=diff.installedVersion)fail(409,'no_upgrade','No newer template is available for this baseline');}
  if(op.kind==='set_workspace_policy'){
   if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','The human owner must confirm workspace policy');
   if(p.policy_version!==op.expectedVersion)fail(409,'stale_version','Workspace policy changed; refresh');
   const previous=p.retention_until?new Date(p.retention_until).toISOString().slice(0,10):null;
   if(op.retentionUntil&&(Number.isNaN(Date.parse(op.retentionUntil))||new Date(op.retentionUntil).toISOString().slice(0,10)!==op.retentionUntil))fail(400,'invalid_date','Retention date is invalid');
   if(previous&&(!op.retentionUntil||op.retentionUntil<previous))fail(409,'retention_protected','An established retention date cannot be shortened');
  }
  if(op.kind==='document_controls'){
   await this.documentPermission(tx,a,w,op.documentId);
   if(op.folder&&(op.folder!==op.folder.trim()||op.folder.startsWith('/')||op.folder.endsWith('/')||op.folder.includes('//')))fail(400,'invalid_folder','Use a folder path with single slashes');
   if(!p.document_scope)fail(403,'restricted_documents','Document controls are unavailable for this access scope');
   const d=(await tx.query('SELECT id,ai_enabled FROM document_versions WHERE document_id=$1 AND workspace_id=$2 ORDER BY version DESC LIMIT 1',[op.documentId,w])).rows[0];if(!d||(a.origin==='ai'&&!d.ai_enabled))fail(404,'not_found','Document not found');
   const c=(await tx.query('SELECT version,folder FROM document_controls WHERE document_id=$1 AND workspace_id=$2',[op.documentId,w])).rows[0];if((c?.version??-1)!==op.expectedVersion)fail(409,'stale_version','Document controls changed');
   if((c?.folder??'')!==op.folder){const rules=(await tx.query('SELECT * FROM folder_access WHERE workspace_id=$1',[w])).rows;if(rules.some(r=>[c?.folder??'',op.folder].some(f=>f===r.folder||f.startsWith(r.folder+'/')))&&(a.origin!=='human'||p.role!=='owner'))fail(403,'owner_required','Moving documents into or out of controlled folders requires the human owner');}
   if(op.linkedRecordId){const r=(await tx.query('SELECT type_id FROM records WHERE id=$1 AND workspace_id=$2',[op.linkedRecordId,w])).rows[0];if(!r)fail(400,'invalid_reference','Linked record not found');await typeAccess(tx,a,w,r.type_id);}
   if(op.reviewerId&&!(await tx.query('SELECT user_id FROM memberships WHERE tenant_id=$1 AND user_id=$2',[p.tenant_id,op.reviewerId])).rows.length)fail(400,'invalid_reference','Reviewer is not an organisation member');
   if(op.expiresOn&&(Number.isNaN(Date.parse(op.expiresOn))||new Date(op.expiresOn).toISOString().slice(0,10)!==op.expiresOn))fail(400,'invalid_date','Expiry date is invalid');
  }
  if(op.kind==='save_document'&&op.submissionFileId){if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','Human owner required');const source=(await tx.query('SELECT f.checksum FROM submission_files f LEFT JOIN submission_file_acceptances accepted ON accepted.file_id=f.id WHERE f.id=$1 AND f.workspace_id=$2 AND accepted.file_id IS NULL',[op.submissionFileId,w])).rows[0];if(!source||source.checksum!==checksum(op.bytes)||op.documentId)fail(409,'source_unavailable','Source is unavailable or already accepted');}
  if(op.kind==='save_document'&&op.documentId)await this.documentPermission(tx,a,w,op.documentId);
  if(op.kind==='save_document'&&(!p.document_scope))fail(403,'restricted_documents','Document access for restricted views is not enabled');
  if(op.kind==='create_type'||op.kind==='update_type')await validateDerived(tx,a,w,op.kind==='update_type'?op.typeId:undefined,op.fields);
  if(op.kind==='archive_created_record'||op.kind==='restore_archived_creation')await this.creationArchive(tx,a,w,op);
  if(op.kind==='reverse_field_change'||op.kind==='reverse_field_changes')await this.reverseBatch(tx,a,w,op);
  if(op.kind==='update_type'){const {type}=await typeAccess(tx,a,w,op.typeId,true);if(a.origin==='ai'&&type.fields.some((f:Field)=>!f.ai))fail(403,'restricted_configuration','Edit tables containing model-restricted fields in the standalone application');if(type.version!==op.expectedVersion)fail(409,'stale_version','Table changed; preview again');const populated=Number((await tx.query('SELECT count(*) AS n FROM records WHERE type_id=$1 AND workspace_id=$2',[op.typeId,w])).rows[0].n)>0;if(populated){for(const old of type.fields){const next=op.fields.find(f=>f.key===old.key);if(!next||next.kind!==old.kind||json([next.formula?.operator,next.formula?.fields])!==json([old.formula?.operator,old.formula?.fields])||json(next.options)!==json(old.options)||next.targetTypeId!==old.targetTypeId||!!next.multiple!==!!old.multiple||!!next.computed!==!!old.computed||!!next.lookup!==!!old.lookup||(!old.required&&next.required))fail(409,'migration_required','Existing data requires an explicit field migration; use an optional new field instead');}if(op.fields.some(f=>(f.required||f.formula)&&!type.fields.some((old:Field)=>old.key===f.key)))fail(409,'migration_required','New fields on populated tables must be optional');}}
  if(op.kind==='bulk_records'){for(const change of op.changes)await this.validate(tx,a,w,change);}
  if(op.kind==='restore_record')await this.restoreData(tx,a,w,op);
  if(op.kind==='update_type'){for(const f of op.fields.filter(f=>f.unique)){const rows=(await tx.query("SELECT 1 FROM records WHERE workspace_id=$1 AND type_id=$2 AND data->$3::text IS NOT NULL AND data->$3::text NOT IN ('null'::jsonb,'\"\"'::jsonb) GROUP BY data->$3::text HAVING count(*)>1 LIMIT 1",[w,op.typeId,f.key])).rows;if(rows.length)fail(409,'duplicate_value','Existing values must be unique before enabling this rule');}}
  if(op.kind==='create_record'){const t=await typeAccess(tx,a,w,op.typeId,true);await this.validateData(tx,a,w,t.type,t.policy,op.data);}
  if(op.kind==='update_record'){const r=(await tx.query('SELECT * FROM records WHERE id=$1 AND workspace_id=$2',[op.recordId,w])).rows[0];if(!r)fail(404,'not_found','Record not found');const t=await typeAccess(tx,a,w,r.type_id,true);if(r.version!==op.expectedVersion)fail(409,'stale_version','The record changed. Refresh and preview again.');if(['archived','superseded'].includes(r.state))fail(409,'controlled_record','Controlled record requires a new reviewed revision; direct editing is disabled');await this.validateData(tx,a,w,t.type,t.policy,op.data,true,op.recordId);}
  if(op.kind==='create_automation'&&op.schedule&&op.schedule.kind!=='daily'&&(a.origin!=='human'||p.role!=='owner'))fail(403,'owner_required','Event summaries require the human workspace owner');
  if(op.kind==='create_automation'&&op.conditions){await this.recordQuery(a,w,op.conditions.typeId,{viewId:op.conditions.viewId,dateField:op.conditions.dateField,dueBefore:new Date().toISOString().slice(0,10)},tx);}
  if(op.kind==='create_automation') {if(op.action&&(a.origin!=='human'||p.role!=='owner'))fail(403,'owner_required','Human owner required for automated actions');if(op.action?.kind==='create_record'){if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','A human owner must authorise automated record creation');await this.validate(tx,a,w,op.action);}const g=(await tx.query('SELECT * FROM action_grants WHERE id=$1 AND workspace_id=$2 AND user_id=$3',[op.grantId,w,a.userId])).rows[0];if(!g||g.revoked_at||g.used_at||g.action!==(op.action?.kind==='create_record'?'records.create':op.action?.kind==='remind_me'?'reminders.create':'reports.prepare')||g.destination!==(op.action?.kind==='create_record'?op.action.typeId:w))fail(403,'invalid_grant','Choose an active permission matching this action and destination');}
  if(op.kind==='create_view'||op.kind==='update_view') {
   const t=await typeAccess(tx,a,w,op.typeId),fields=visibleFields(t.type.fields,t.policy,a),keys=fields.map(f=>f.key);
   if(viewFields(op.config).some(k=>!keys.includes(k)))fail(400,'invalid_field','View contains unavailable fields');
   for(const [key,r] of Object.entries(op.config.renderers??{}))validateRenderer(fields.find(f=>f.key===key)!,r);
   if(op.config.endDateField&&fields.find(f=>f.key===op.config.endDateField)?.kind!=='date')fail(400,'invalid_date_field','Choose an end-date field');
   if(op.config.metric&&!fields.some(f=>f.key===op.config.metric&&['number','money'].includes(f.kind)))fail(400,'invalid_field','Choose an accessible numeric metric');
   if(op.config.dateField&&fields.find(f=>f.key===op.config.dateField)?.kind!=='date')fail(400,'invalid_date_field','Choose a date field');
   if(['calendar','timeline'].includes(op.viewKind)&&!op.config.dateField)fail(400,'date_required','Choose a date field for this view');
   for(const f of op.config.filters){const field=fields.find(x=>x.key===f.field)!;
    if(f.operator!=='empty'&&f.value===undefined)fail(400,'invalid_filter','A filter value is required');
    if(f.operator==='contains'&&(typeof f.value!=='string'||['number','money','boolean'].includes(field.kind)))fail(400,'invalid_filter','Contains requires a text field and text value');
    if(f.operator==='equals'&&f.value!==null){const expected=['number','money'].includes(field.kind)?'number':field.kind==='boolean'?'boolean':'string';if(typeof f.value!==expected)fail(400,'invalid_filter','Filter value does not match the field type');}
   }
   if(op.kind==='update_view'){
    const old=(await tx.query('SELECT * FROM saved_views WHERE id=$1 AND workspace_id=$2',[op.viewId,w])).rows[0];
    if(!old||old.type_id!==op.typeId)fail(404,'not_found','View not found');
    if(viewFields(viewConfigSchema.parse(old.config)).some(k=>!keys.includes(k)))fail(403,'restricted_configuration','This view contains restricted fields');
    if(old.version!==op.expectedVersion)fail(409,'stale_version','View changed. Refresh and preview again.');
   }
  }
  if(op.kind==='install_template'&&!templates.some(t=>t.id===op.template))fail(400,'template_unknown','Template not found');
  if(op.kind==='save_document'&&op.documentId){const prev=(await tx.query('SELECT * FROM document_versions WHERE document_id=$1 AND workspace_id=$2 ORDER BY version DESC LIMIT 1',[op.documentId,w])).rows[0];if(!prev)fail(404,'not_found','Document not found');if(prev.version!==op.expectedVersion)fail(409,'stale_version','Document changed; preview again');if(a.origin==='ai'&&!prev.ai_enabled)fail(403,'ai_disabled','Document unavailable');}
  return p;
 }
 async fieldDiff(tx:Connection,a:Actor,w:string,op:Operation|FileOperation):Promise<any[]> {
  if(op.kind==='bulk_records')return (await Promise.all(op.changes.map(c=>this.fieldDiff(tx,a,w,c)))).flat();
  if(op.kind==='reverse_field_change'||op.kind==='reverse_field_changes'){const records=await this.reverseBatch(tx,a,w,op);return (await Promise.all(records.map(async r=>{const {type,policy}=await typeAccess(tx,a,w,r.record.type_id);return visibleFields(type.fields,policy,a).filter(f=>Object.hasOwn(r.record.data,f.key)!==Object.hasOwn(r.data,f.key)||json(r.record.data[f.key])!==json(r.data[f.key])).map(f=>({typeId:r.record.type_id,recordId:r.record.id,field:f.key,label:f.name,derived:!!derived(f),beforePresent:Object.hasOwn(r.record.data,f.key),before:r.record.data[f.key]??null,afterPresent:Object.hasOwn(r.data,f.key),after:r.data[f.key]??null}));}))).flat();}
  if(op.kind!=='create_record'&&op.kind!=='update_record'&&op.kind!=='restore_record')return [];
  const record=op.kind==='create_record'?null:(await tx.query('SELECT * FROM records WHERE id=$1 AND workspace_id=$2',[op.recordId,w])).rows[0];
  const typeId=op.kind==='create_record'?op.typeId:record.type_id;
  const {type,policy}=await typeAccess(tx,a,w,typeId);const fields=visibleFields(type.fields,policy,a);
  const before=record?.data??{},input=op.kind==='restore_record'?(await this.restoreData(tx,a,w,op)).data:op.data,after=calculate(type.fields,{...before,...input});
  return fields.filter(f=>Object.hasOwn(before,f.key)!==Object.hasOwn(after,f.key)||json(before[f.key])!==json(after[f.key])).map(f=>({typeId,recordId:record?.id??null,field:f.key,label:f.name,derived:!!derived(f),beforePresent:Object.hasOwn(before,f.key),before:before[f.key]??null,afterPresent:Object.hasOwn(after,f.key),after:after[f.key]??null}));
 }
 async pendingChanges(a:Actor,w:string){
  const policy=await access(this.db,a,w);const rows=(await this.db.query('SELECT id,digest,summary,body,expires_at,schema_fingerprint FROM data_previews WHERE workspace_id=$1 AND actor_id=$2 AND expires_at>now() ORDER BY expires_at LIMIT 100',[w,a.userId])).rows;
  // Stored reviews can contain copied values: require visibility of all current fields.
  if(policy.allowed_types!==null||policy.hidden_fields.length)return [];
  const types=(await this.db.query('SELECT fields FROM entity_types WHERE workspace_id=$1',[w])).rows;
  if(a.origin==='ai'&&types.some(t=>t.fields.some((f:Field)=>!f.ai)))return [];
  const result=[];for(const r of rows){if(!r.summary)continue;if(r.schema_fingerprint&&r.schema_fingerprint!==checksum(json((await this.db.query('SELECT id,version FROM entity_types WHERE workspace_id=$1 ORDER BY id',[w])).rows)))continue;try{await this.validate(this.db,a,w,r.body.kind==='save_document'?{...r.body,bytes:Buffer.alloc(1)}:r.body);result.push({id:r.id,digest:r.digest,summary:r.summary,workspaceId:w,status:'preview',expiresAt:r.expires_at});}catch{}}
  return result;
 }
 private async creationArchive(tx:Connection,a:Actor,w:string,op:Extract<Operation,{kind:'archive_created_record'|'restore_archived_creation'}>){
  const event=op.kind==='restore_archived_creation'?(await tx.query("SELECT * FROM audit_events WHERE id=$1 AND workspace_id=$2 AND action='record.creation_archived'",[op.archiveEventId,w])).rows[0]:null;
  if(op.kind==='restore_archived_creation'&&!event)fail(404,'not_found','Archive event not found');
  const record=(await tx.query('SELECT * FROM records WHERE id=$1 AND workspace_id=$2',[op.kind==='archive_created_record'?op.recordId:event.object_id,w])).rows[0];if(!record)fail(404,'not_found','Record not found');
  const {type,policy}=await typeAccess(tx,a,w,record.type_id,true);
  if(visibleFields(type.fields,policy,a).length!==type.fields.length)fail(403,'full_record_required','Reviewing a whole-record archive requires access to every field');
  if(record.version!==op.expectedVersion)fail(409,'stale_version','Record changed; review its current history');
  if(op.kind==='archive_created_record'){
   if(record.version!==0||record.state!=='draft')fail(409,'controlled_record','Only an unchanged new draft can be archived as a creation reversal');
   // Inspect dependencies across the workspace without exposing restricted values or object names.
   const dependencies=(await tx.query(`SELECT 1 FROM records r JOIN entity_types t ON t.id=r.type_id CROSS JOIN LATERAL jsonb_array_elements(t.fields) f
    WHERE r.workspace_id=$1 AND r.id<>$2 AND f->>'kind'='relationship' AND (f->>'targetTypeId'=$3 OR f->>'targetTypeId' IS NULL) AND (r.data->>(f->>'key')=$4 OR r.data->(f->>'key') @> to_jsonb(ARRAY[$4::text]))
    UNION ALL SELECT 1 FROM cross_table_links WHERE workspace_id=$1 AND (source_record_id=$2 OR preferred_record_id=$2) AND revoked_at IS NULL
    UNION ALL SELECT 1 FROM record_facts WHERE workspace_id=$1 AND record_id=$2
    UNION ALL SELECT 1 FROM project_records WHERE workspace_id=$1 AND record_id=$2 AND revoked_at IS NULL
    UNION ALL SELECT 1 FROM identity_links WHERE workspace_id=$1 AND revoked_at IS NULL AND (source_record_id=$2 OR preferred_record_id=$2)
    UNION ALL SELECT 1 FROM document_controls WHERE workspace_id=$1 AND linked_record_id=$2
    UNION ALL SELECT 1 FROM record_review_requests WHERE workspace_id=$1 AND record_id=$2
    UNION ALL SELECT 1 FROM submission_acceptances WHERE workspace_id=$1 AND record_id=$2 LIMIT 1`,[w,record.id,record.type_id,record.id])).rows;
   if(dependencies.length)fail(409,'record_dependencies','This entry has linked work. Review that work before choosing an archival action.');
   if(!(await tx.query("SELECT id FROM revisions WHERE workspace_id=$1 AND object_id=$2 AND object_kind='record' AND version=0",[w,record.id])).rows.length)fail(409,'creation_unavailable','Original creation evidence is unavailable');
  }else{
   if(record.state!=='archived'||record.version!==event.after_value.version)fail(409,'stale_version','This archive is no longer the current record version');
   await this.validateData(tx,a,w,type,policy,editableData(type.fields,record.data),false,record.id);
  }
  return {record,typeName:type.name,beforeState:record.state,afterState:op.kind==='archive_created_record'?'archived':'draft',archiveEventId:event?.id??null};
 }
 async creationArchives(a:Actor,w:string,offset=0){
  await access(this.db,a,w);if(!Number.isInteger(offset)||offset<0)fail(400,'invalid_offset','Invalid page');
  const rows=(await this.db.query(`SELECT e.id,e.object_id AS record_id,e.actor_id,e.created_at,e.reason,e.action,e.before_value,e.after_value,r.type_id,r.version AS current_version,r.state AS current_state FROM audit_events e JOIN records r ON r.id=e.object_id AND r.workspace_id=e.workspace_id WHERE e.workspace_id=$1 AND e.action IN ('record.creation_archived','record.creation_restored') ORDER BY e.created_at DESC,e.id DESC LIMIT 100 OFFSET $2`,[w,offset])).rows;
  const events=[];for(const row of rows){try{const {type,policy}=await typeAccess(this.db,a,w,row.type_id);if(visibleFields(type.fields,policy,a).length!==type.fields.length)continue;events.push({...row,typeName:type.name});}catch{}}
  return {events,nextOffset:rows.length===100?offset+100:null};
 }
 private async reverseBatch(tx:Connection,a:Actor,w:string,op:Extract<Operation,{kind:'reverse_field_change'|'reverse_field_changes'}>){
  const entries=op.kind==='reverse_field_change'?[op]:op.changes;
  if(new Set(entries.map(e=>e.changeId)).size!==entries.length)fail(400,'duplicate_change','Select each change only once');
  const grouped=new Map<string,{record:any;data:any;changeIds:string[];keys:Set<string>}>();
  for(const entry of entries){
   const change=(await tx.query('SELECT * FROM record_field_changes WHERE id=$1 AND workspace_id=$2',[entry.changeId,w])).rows[0];if(!change)fail(404,'not_found','Change not found');
   const {type,policy}=await typeAccess(tx,a,w,change.type_id,true);const f=visibleFields(type.fields,policy,a).find(f=>f.key===change.field_key);if(!f||derived(f))fail(403,'field_scope','This field cannot be reversed directly');
   let group=grouped.get(change.record_id);
   if(!group){const record=(await tx.query('SELECT * FROM records WHERE id=$1 AND workspace_id=$2',[change.record_id,w])).rows[0];group={record,data:{...record.data},changeIds:[],keys:new Set()};grouped.set(record.id,group);}
   const {record}=group;
   if(record.version!==entry.expectedVersion||record.version!==change.record_version)fail(409,'stale_version','Later changes exist. Prepare an explicit correction instead.');
   if(['archived','superseded','approved'].includes(record.state))fail(409,'controlled_record','This record requires a reviewed revision');
   if(group.keys.has(change.field_key))fail(400,'duplicate_field','Select only one change per field');
   group.keys.add(change.field_key);group.changeIds.push(change.id);
   if(change.before_present)group.data[change.field_key]=change.before_value;else delete group.data[change.field_key];
  }
  // Compose all selected fields first, then validate the resulting records before any write.
  for(const g of grouped.values()){const {type,policy}=await typeAccess(tx,a,w,g.record.type_id,true);await this.validateData(tx,a,w,type,policy,editableData(type.fields,g.data),false,g.record.id);g.data=calculate(type.fields,g.data);}
  return [...grouped.values()];
 }
 async fieldChanges(a:Actor,w:string,query:Partial<FieldChangeQuery>={}){
  query=fieldChangeQuerySchema.parse(query);await access(this.db,a,w);const offset=query.offset??0;
  if(query.since&&query.until&&query.since>query.until)fail(400,'date_range','Start must precede end');
  const rows=(await this.db.query(`SELECT * FROM record_field_changes WHERE workspace_id=$1 AND ($2::uuid IS NULL OR type_id=$2) AND ($3::uuid IS NULL OR record_id=$3) AND ($5::uuid IS NULL OR actor_id=$5) AND ($6::text IS NULL OR "authorization"->>'id'=$6) AND ($7::text IS NULL OR coalesce("authorization"->>'kind','unattributed')=$7) AND ($8::timestamptz IS NULL OR created_at >= $8) AND ($9::timestamptz IS NULL OR created_at <= $9) AND ($10::text IS NULL OR "authorization"->>'changeSetId'=$10) ORDER BY created_at DESC,id DESC LIMIT 100 OFFSET $4`,[w,query.typeId??null,query.recordId??null,offset,query.actorId??null,query.authorizationId??null,query.authorizationKind??null,query.since??null,query.until??null,query.changeSetId??null])).rows;
  const visible=[];for(const r of rows){try{const {type,policy}=await typeAccess(this.db,a,w,r.type_id);const field=visibleFields(type.fields,policy,a).find(f=>f.key===r.field_key);if(!field&&!(a.origin==='human'&&policy.role==='owner'&&!type.fields.some((f:Field)=>f.key===r.field_key)))continue;visible.push({...r,typeName:type.name,fieldName:field?.name??r.field_key,derived:!!field?.formula});}catch{}}
  return {changes:visible,nextOffset:rows.length===100?offset+100:null};
 }
 async preview(a:Actor,w:string,input:unknown) {const op=operationSchema.parse(input);return this.prepare(a,w,op);}
 async previewFile(a:Actor,w:string,input:{filename:string;mime:string;bytes:Buffer;ai:boolean;documentId?:string;expectedVersion?:number;submissionFileId?:string}) {
  if(!input.bytes.length||input.bytes.length>this.maxFileBytes)fail(413,'file_size','File is empty or exceeds the upload limit');
  if(input.filename.length>250||input.mime.length>150)fail(400,'file_metadata','File metadata is too long');
  return this.prepare(a,w,{kind:'save_document',...input});
 }
 private async prepare(a:Actor,w:string,op:Operation|FileOperation) {
  const schemaFingerprint=['create_type','update_type','migrate_type','create_view','update_view','create_record','update_record','bulk_records','accept_submission','upgrade_template','adopt_template','reverse_field_change','reverse_field_changes','archive_created_record','restore_archived_creation'].includes(op.kind)?checksum(json((await this.db.query('SELECT id,version FROM entity_types WHERE workspace_id=$1 ORDER BY id',[w])).rows)):undefined;
  await this.validate(this.db,a,w,op);await this.sweep();
  let summary:any=op.kind==='restore_record'?{...op,...await this.restoreData(this.db,a,w,op)}:op.kind==='save_document'?{...op,bytes:undefined,byteSize:op.bytes.length,checksum:checksum(op.bytes)}:op;
  if(op.kind==='create_record'||op.kind==='update_record'||op.kind==='accept_submission'){
   const before=op.kind==='update_record'?(await this.db.query('SELECT * FROM records WHERE id=$1 AND workspace_id=$2',[op.recordId,w])).rows[0]:null;
   const {type,policy}=await typeAccess(this.db,a,w,before?.type_id??(op.kind!=='update_record'?op.typeId:''));
   summary={...op,data:projectData(calculate(type.fields,{...before?.data,...op.data}),visibleFields(type.fields,policy,a))};
  }
  if(schemaFingerprint&&schemaFingerprint!==checksum(json((await this.db.query('SELECT id,version FROM entity_types WHERE workspace_id=$1 ORDER BY id',[w])).rows)))fail(409,'stale_version','Table configuration changed. Prepare again.');
  const migration=op.kind==='migrate_type'?await this.migrationData(this.db,a,w,op):undefined;if(migration)summary={...op,beforeFields:migration.before.fields,records:migration.records};
  if(op.kind==='adopt_template')summary={...op,diff:await adoptionDiff(this.db,w,op.template,op.mapping)};
  if(op.kind==='request_review'){const r=(await this.db.query('SELECT data,state FROM records WHERE id=$1 AND workspace_id=$2',[op.recordId,w])).rows[0];const u=(await this.db.query('SELECT name FROM users WHERE id=$1',[op.reviewerId])).rows[0];summary={...op,reviewerName:u.name,record:r.data,resultingVersion:op.expectedVersion+1};}
  if(op.kind==='upgrade_template')summary={...op,diff:await templateDiff(this.db,w,op.template)};
  if(op.kind==='archive_created_record'||op.kind==='restore_archived_creation'){const review=await this.creationArchive(this.db,a,w,op);summary={...op,typeName:review.typeName,recordId:review.record.id,data:review.record.data,beforeState:review.beforeState,afterState:review.afterState,retains:'Original values, files, references and history are retained. External actions are not undone.'};}
  if(op.kind==='update_type'){
   const rows=(await this.db.query('SELECT * FROM records WHERE workspace_id=$1 AND type_id=$2 ORDER BY id LIMIT 5',[w,op.typeId])).rows;
   const proxy:Connection={query:async(sql,values)=>{const result=await this.db.query(sql,values);return {...result,rows:result.rows.map((r:any)=>r.id===op.typeId&&r.fields?{...r,fields:op.fields}:r)};} };
   const reader=new DerivedReader(proxy,a,w);summary={...summary,calculationPreview:await Promise.all(rows.map(r=>reader.read(r)))};
  }
  const fieldChanges=await this.fieldDiff(this.db,a,w,op);
  if(fieldChanges.length)summary={...summary,fieldChanges};
  const p:Preview={id:randomUUID(),actorId:a.userId,workspaceId:w,operation:op,schemaFingerprint,migrationFingerprint:migration?.fingerprint,digest:checksum(json(summary)),expires:Date.now()+24*3600000};
  await this.db.transaction(async tx=>{
   await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);
   await this.validate(tx,a,w,op);
   const body=op.kind==='save_document'?{...op,bytes:undefined}:op;
   const bytes=op.kind==='save_document'?op.bytes:null;
   const size=Buffer.byteLength(json(body))+(bytes?.length??0);
   const usage=(await tx.query('SELECT count(*) AS n,coalesce(sum(byte_size),0) AS bytes FROM data_previews WHERE workspace_id=$1 AND expires_at>now()',[w])).rows[0];
   if(Number(usage.n)>=1000||Number(usage.bytes)+size>100*1024*1024)fail(503,'preview_capacity','Workspace preview capacity reached; discard old previews and retry');
   await tx.query('INSERT INTO data_previews(id,workspace_id,actor_id,body,file_bytes,digest,schema_fingerprint,migration_fingerprint,expires_at,byte_size,summary) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[p.id,w,a.userId,json(body),bytes,p.digest,p.schemaFingerprint??null,p.migrationFingerprint??null,new Date(p.expires),size,json(summary)]);
  });
  return {id:p.id,digest:p.digest,workspaceId:w,expiresAt:new Date(p.expires).toISOString(),status:'preview',summary};
 }
 async discard(a:Actor,id:string) {const r=await this.db.query('DELETE FROM data_previews WHERE id=$1 AND actor_id=$2 RETURNING id',[id,a.userId]);if(!r.rows.length)fail(404,'not_found','Preview not found');return {status:'discarded'};}
 async receipt(a:Actor,id:string) {const r=(await this.db.query('SELECT * FROM commit_receipts WHERE preview_id=$1 AND actor_id=$2',[id,a.userId])).rows[0];if(!r)fail(404,'not_found','Save receipt not found');await access(this.db,a,r.workspace_id);return r.result;}
 async commit(a:Actor,id:string,digest:string,authorization?:WriteAuthorization) {
  if(!authorization)requireCurrentAction(a);
  const result=await this.db.transaction(async tx=>{
   // Serialise retries of the same logical save, including concurrent requests.
   await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))',[id]);
   const existing=(await tx.query('SELECT * FROM commit_receipts WHERE preview_id=$1',[id])).rows[0];
   if(existing){if(existing.actor_id!==a.userId||existing.digest!==digest)fail(409,'receipt_mismatch','Save does not match this confirmation');await access(tx,a,existing.workspace_id);return existing.result;}
   const row=(await tx.query('SELECT * FROM data_previews WHERE id=$1 AND actor_id=$2 AND expires_at>now() FOR UPDATE',[id,a.userId])).rows[0];
   if(!row)fail(410,'preview_expired','Preview expired; prepare it again');
   const p:Preview={id:row.id,actorId:row.actor_id,workspaceId:row.workspace_id,operation:row.body.kind==='save_document'?{...row.body,bytes:Buffer.from(row.file_bytes)}:row.body,digest:row.digest,expires:new Date(row.expires_at).getTime(),schemaFingerprint:row.schema_fingerprint,migrationFingerprint:row.migration_fingerprint};
   if(p.digest!==digest)fail(409,'preview_mismatch','Preview changed; review it again');
   // Workspace lock serialises permissions/configuration changes with commits.
   await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[p.workspaceId]);
   if(p.schemaFingerprint&&p.schemaFingerprint!==checksum(json((await tx.query('SELECT id,version FROM entity_types WHERE workspace_id=$1 ORDER BY id',[p.workspaceId])).rows)))fail(409,'stale_version','Table configuration changed. Prepare the preview again.');
   const policy=await this.validate(tx,a,p.workspaceId,p.operation);
   if(p.operation.kind==='migrate_type'&&p.migrationFingerprint!==(await this.migrationData(tx,a,p.workspaceId,p.operation)).fingerprint)fail(409,'stale_version','Records changed since migration preview');
   await setWriteAuthorization(tx,a,{...(authorization??{kind:'approval',id,digest,context:'data_preview'}),changeSetId:id,...(p.operation.kind==='reverse_field_change'?{reverses:p.operation.changeId}:p.operation.kind==='reverse_field_changes'?{reverses:p.operation.changes.map(c=>c.changeId)}:{})});
   const objects=await this.apply(tx,a,p.workspaceId,p.operation,policy);
   const result={status:'saved',previewId:id,objects,savedAt:new Date().toISOString()};
   await tx.query('INSERT INTO commit_receipts(preview_id,actor_id,workspace_id,digest,result) VALUES($1,$2,$3,$4,$5)',[id,a.userId,p.workspaceId,digest,json(result)]);
   await tx.query('DELETE FROM data_previews WHERE id=$1',[id]);return result;
  });return result;
 }
 private async apply(tx:Connection,a:Actor,w:string,op:Operation|FileOperation,p:any):Promise<any[]> {
  if(op.kind==='archive_created_record'||op.kind==='restore_archived_creation'){
   const change=await this.creationArchive(tx,a,w,op),record=change.record,version=record.version+1;
   const authorization=(await tx.query("SELECT current_setting('trialy.write_authorization',true) AS value")).rows[0].value;
   await tx.query('UPDATE records SET state=$1,version=$2,updated_at=now() WHERE id=$3',[change.afterState,version,record.id]);
   await revision(tx,a,w,record.id,'record',version,{data:record.data,state:change.afterState});
   await audit(tx,a,p,op.kind==='archive_created_record'?'record.creation_archived':'record.creation_restored',record.id,{state:record.state,version:record.version},{state:change.afterState,version,archiveEventId:change.archiveEventId,authorization:authorization?JSON.parse(authorization):null},op.reason);
   return [{id:record.id,kind:'record',version,state:change.afterState}];
  }
  if(op.kind==='request_review'){
   const r=(await tx.query('SELECT * FROM records WHERE id=$1',[op.recordId])).rows[0],version=r.version+1,id=randomUUID();
   await tx.query("UPDATE records SET state='in_review',version=$2,updated_at=now() WHERE id=$1",[r.id,version]);
   await revision(tx,a,w,r.id,'record',version,{data:r.data,state:'in_review'});
   await tx.query('INSERT INTO record_review_requests(id,workspace_id,record_id,record_version,reviewer_id,requested_by,note,due_on) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,w,r.id,version,op.reviewerId,a.userId,op.note,op.dueOn]);
   await audit(tx,a,p,'record.in_review',r.id,{state:r.state,version:r.version},{state:'in_review',version},op.note);
   await audit(tx,a,p,'review.requested',r.id,{state:r.state,version:r.version},{requestId:id,reviewerId:op.reviewerId,version,note:op.note,dueOn:op.dueOn});return [{id:r.id,kind:'review_request',requestId:id,version}];
  }
  if(op.kind==='set_workspace_policy'){
   await tx.query('UPDATE workspaces SET archived=$2,legal_hold=$3,retention_until=$4,policy_version=policy_version+1 WHERE id=$1',[w,op.archived,op.legalHold,op.retentionUntil]);
   await revision(tx,a,w,w,'workspace_policy',p.policy_version+1,op);await audit(tx,a,p,'workspace.policy',w,{archived:p.archived,legalHold:p.legal_hold,retentionUntil:p.retention_until},op,op.reason);return [{id:w,kind:'workspace_policy',version:p.policy_version+1}];
  }
  if(op.kind==='migrate_type'){
   const migration=await this.migrationData(tx,a,w,op),version=op.expectedVersion+1;
   await tx.query('UPDATE entity_types SET name=$1,fields=$2,version=$3 WHERE id=$4',[op.name,json(op.fields),version,op.typeId]);
   await revision(tx,a,w,op.typeId,'type',version,op);await audit(tx,a,p,'type.migrated',op.typeId,migration.before,op,op.reason);
   for(const r of migration.records){await tx.query('UPDATE records SET data=$1,version=version+1,state=$2,updated_at=now() WHERE id=$3',[json(r.data),r.state,r.id]);await revision(tx,a,w,r.id,'record',r.version+1,{data:r.data,state:r.state});await audit(tx,a,p,'record.migrated',r.id,{data:r.before},{data:r.data,state:r.state},op.reason);}
   return [{id:op.typeId,kind:'type',version},...migration.records.map(r=>({id:r.id,kind:'record',version:r.version+1}))];
  }
  if(op.kind==='document_controls'){
   const old=(await tx.query('SELECT * FROM document_controls WHERE document_id=$1',[op.documentId])).rows[0];const version=op.expectedVersion+1;
   await tx.query('INSERT INTO document_controls(document_id,workspace_id,linked_record_id,reviewer_id,expires_on,folder,version) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(document_id) DO UPDATE SET linked_record_id=$3,reviewer_id=$4,expires_on=$5,folder=$6,version=$7',[op.documentId,w,op.linkedRecordId,op.reviewerId,op.expiresOn,op.folder,version]);
   await revision(tx,a,w,op.documentId,'document_controls',version,op);await audit(tx,a,p,'document.controls',op.documentId,old??null,op);return [{id:op.documentId,kind:'document_controls',version}];
  }
  if(op.kind==='accept_submission'){const result=await this.apply(tx,a,w,{kind:'create_record',typeId:op.typeId,data:op.data},p);await tx.query('INSERT INTO submission_acceptances(submission_id,workspace_id,record_id,actor_id) VALUES($1,$2,$3,$4)',[op.submissionId,w,result[0]!.id,a.userId]);const linked=(await tx.query('SELECT l.project_id FROM external_links l JOIN form_submissions s ON s.link_id=l.id WHERE s.id=$1 AND s.workspace_id=$2',[op.submissionId,w])).rows[0];if(linked?.project_id){await activeProject(tx,a,w,linked.project_id);await tx.query('INSERT INTO project_records(id,workspace_id,project_id,record_id,created_by,reason) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),w,linked.project_id,result[0]!.id,a.userId,'Accepted submission '+op.submissionId]);}
await audit(tx,a,p,'submission.accepted',op.submissionId,null,{recordId:result[0]!.id,projectId:linked?.project_id??null});return result;}
  if(op.kind==='bulk_records'){const objects:any[]=[];for(const change of op.changes){await this.validate(tx,a,w,change);objects.push(...await this.apply(tx,a,w,change,p));}return objects;}
  if(op.kind==='adopt_template'){const diff=await adoptionDiff(tx,w,op.template,op.mapping);if(diff.conflicts.length)fail(409,'migration_required',diff.conflicts.join('; '));await tx.query('INSERT INTO template_installations(workspace_id,template_id,version,tables) VALUES($1,$2,$3,$4)',[w,op.template,diff.version,json(diff.baseline)]);await audit(tx,a,p,'template.adopted',null,null,{template:op.template,version:diff.version,mapping:op.mapping});return [{id:w,kind:'template_adoption',template:op.template,version:diff.version}];}
  if(op.kind==='upgrade_template'){
   const diff=await templateDiff(tx,w,op.template);if(diff.conflicts.length)fail(409,'migration_required',diff.conflicts.join('; '));const result:any[]=[];const baseline=[...diff.baseline];
   for(const change of diff.additions){const update={kind:'update_type' as const,typeId:change.typeId,expectedVersion:change.expectedVersion,name:change.name,fields:change.fields};await this.validate(tx,a,w,update);result.push(...await this.apply(tx,a,w,update,p));}
   for(const table of diff.newTables){const links=templateLinks[table.name]??{},fields=table.fields.map((f:Field)=>{const target=baseline.find((t:any)=>t.name===links[f.key]);return target?{...f,kind:'relationship' as const,targetTypeId:target.id}:f;});const created=await this.apply(tx,a,w,{kind:'create_type',name:table.name,fields},p);result.push(...created);baseline.push({id:created[0]!.id,name:table.name,fields});}
   // Store the upstream baseline, not the user's customised schema.
   const template=templates.find(t=>t.id===op.template)!;
   for(const table of baseline){const canonical=template.tables.find(t=>t.name===table.name);if(canonical)table.fields=canonical.fields.map(f=>{const target=baseline.find(t=>t.name===templateLinks[table.name]?.[f.key]);return target?{...f,kind:'relationship',targetTypeId:target.id}:f;});}
   await tx.query('UPDATE template_installations SET version=$3,tables=$4,updated_at=now() WHERE workspace_id=$1 AND template_id=$2',[w,op.template,diff.availableVersion,json(baseline)]);await audit(tx,a,p,'template.upgraded',null,{version:diff.installedVersion},{version:diff.availableVersion,template:op.template,changes:result});return result;
  }
  if(op.kind==='install_template'){
   const template=templates.find(t=>t.id===op.template)!;const result:any[]=[];
   // Name collision aborts this whole transaction rather than merging unrelated configuration.
   for(const table of template.tables){const links=templateLinks[table.name]??{};const fields=table.fields.map(f=>{const target=result.find(t=>t.name===links[f.key]);return target?{...f,kind:'relationship' as const,targetTypeId:target.id}:f;});result.push(...await this.apply(tx,a,w,{kind:'create_type',name:table.name,fields},p));}
   const baseline=[];for(const table of result){const current=(await tx.query('SELECT fields FROM entity_types WHERE id=$1',[table.id])).rows[0];baseline.push({id:table.id,name:table.name,fields:current.fields});}await tx.query('INSERT INTO template_installations(workspace_id,template_id,version,tables) VALUES($1,$2,$3,$4)',[w,template.id,template.version,json(baseline)]);
   await audit(tx,a,p,'template.installed',null,null,{template:template.id,version:template.version});return result;
  }
  if(op.kind==='create_type'){
   const id=randomUUID();await tx.query('INSERT INTO entity_types(id,workspace_id,name,fields,concept) VALUES($1,$2,$3,$4,$5)',[id,w,op.name,json(op.fields),op.concept??null]);
   await revision(tx,a,w,id,'type',0,op);await audit(tx,a,p,'type.created',id,null,op);return [{id,kind:'type',version:0,name:op.name}];
  }
  if(op.kind==='update_type'){const old=(await tx.query('SELECT * FROM entity_types WHERE id=$1 AND workspace_id=$2',[op.typeId,w])).rows[0];const version=old.version+1;await tx.query('UPDATE entity_types SET name=$1,fields=$2,version=$3,concept=$5 WHERE id=$4',[op.name,json(op.fields),version,op.typeId,op.concept===undefined?old.concept:op.concept]);await revision(tx,a,w,op.typeId,'type',version,{...op,concept:op.concept===undefined?old.concept:op.concept});await audit(tx,a,p,'type.updated',op.typeId,{name:old.name,fields:old.fields,concept:old.concept},{...op,concept:op.concept===undefined?old.concept:op.concept});return [{id:op.typeId,kind:'type',version}];}
  if(op.kind==='create_record'||op.kind==='update_record'){
   const before=op.kind==='update_record'?(await tx.query('SELECT * FROM records WHERE id=$1 AND workspace_id=$2 FOR UPDATE',[op.recordId,w])).rows[0]:null;
   const id=before?.id??randomUUID(), version=before?before.version+1:0, rawData={...before?.data,...op.data};
   const table=(await tx.query('SELECT fields FROM entity_types WHERE id=$1',[before?.type_id??(op.kind==='create_record'?op.typeId:null)])).rows[0];const data=calculate(table.fields,rawData);
   const state=before?.state==='approved'?'in_review':before?.state??'draft';
   if(before)await tx.query('UPDATE records SET data=$1,version=$2,state=$4,updated_at=now() WHERE id=$3',[json(data),version,id,state]);
   else await tx.query('INSERT INTO records(id,type_id,workspace_id,data) VALUES($1,$2,$3,$4)',[id,op.kind==='create_record'?op.typeId:null,w,json(data)]);
   await revision(tx,a,w,id,'record',version,{data,state});await audit(tx,a,p,before?'record.updated':'record.created',id,before?{data:before.data,state:before.state}:null,{data,state},op.kind==='update_record'?op.reason:undefined);return [{id,kind:'record',version}];
  }
  if(op.kind==='reverse_field_change'||op.kind==='reverse_field_changes'){
   const groups=await this.reverseBatch(tx,a,w,op),objects=[];
   for(const {record,data,changeIds} of groups){const version=record.version+1;
    await tx.query('UPDATE records SET data=$1,version=$2,updated_at=now() WHERE id=$3',[json(data),version,record.id]);
    await revision(tx,a,w,record.id,'record',version,{data,state:record.state});await audit(tx,a,p,'record.reversed',record.id,{data:record.data},{data,changeIds},op.reason);objects.push({id:record.id,kind:'record',version});
   }return objects;
  }
  if(op.kind==='restore_record'){
   const restored=await this.restoreData(tx,a,w,op);
   const result=await this.apply(tx,a,w,{kind:'update_record',recordId:op.recordId,expectedVersion:op.expectedVersion,data:restored.data,reason:op.reason},p);
   await audit(tx,a,p,'record.restored',op.recordId,{version:op.expectedVersion},{sourceVersion:op.sourceVersion,version:op.expectedVersion+1},op.reason);return result;
  }
  if(op.kind==='create_automation'){const id=randomUUID();await tx.query('INSERT INTO automations(id,workspace_id,owner_id,grant_id,name,interval_minutes,next_run,conditions,schedule,event_cursor,action) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,(SELECT coalesce(max(event_sequence),0) FROM audit_events WHERE workspace_id=$2),$10)',[id,w,a.userId,op.grantId,op.name,op.intervalMinutes,op.schedule?.kind==='daily'?nextDaily(op.schedule,new Date()):new Date(),json(op.conditions??null),json(op.schedule??null),json(op.action??null)]);await revision(tx,a,w,id,'automation',0,op);await audit(tx,a,p,'automation.created',id,null,op);return [{id,kind:'automation',version:0}];}
  if(op.kind==='update_view'){
   const old=(await tx.query('SELECT * FROM saved_views WHERE id=$1 AND workspace_id=$2',[op.viewId,w])).rows[0],version=old.version+1;
   await tx.query('UPDATE saved_views SET name=$1,kind=$2,config=$3,version=$4 WHERE id=$5',[op.name,op.viewKind,json(op.config),version,op.viewId]);
   await revision(tx,a,w,op.viewId,'view',version,op);await audit(tx,a,p,'view.updated',op.viewId,old,op);return [{id:op.viewId,kind:'view',version}];
  }
  if(op.kind==='create_view'){
   const id=randomUUID();await tx.query('INSERT INTO saved_views(id,workspace_id,name,kind,type_id,config) VALUES($1,$2,$3,$4,$5,$6)',[id,w,op.name,op.viewKind,op.typeId,json(op.config)]);await revision(tx,a,w,id,'view',0,op);await audit(tx,a,p,'view.created',id,null,op);return [{id,kind:'view',version:0}];
  }
  const id=randomUUID(), documentId=op.documentId??randomUUID(),version=op.expectedVersion!==undefined?op.expectedVersion+1:0;
  const meta={id,documentId,version,filename:op.filename,mime:op.mime,checksum:checksum(op.bytes),byteSize:op.bytes.length,ai:op.ai,...(op.submissionFileId?{submissionFileId:op.submissionFileId,sourceIdentity:"External link holder; identity not verified"}:{})};
  await tx.query('INSERT INTO document_versions(id,document_id,workspace_id,filename,mime,byte_size,checksum,version,ai_enabled,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,documentId,w,op.filename,op.mime,op.bytes.length,meta.checksum,version,op.ai,a.userId]);
  await this.originals.put(tx,id,op.bytes);await tx.query('INSERT INTO extractions(version_id) VALUES($1)',[id]);
  await tx.query("INSERT INTO jobs(id,workspace_id,kind,payload) VALUES($1,$2,'extract',$3)",[randomUUID(),w,json({versionId:id})]);
  if(op.documentId){const control=(await tx.query("UPDATE document_controls SET status=CASE WHEN status='approved' THEN 'in_review' ELSE status END,version=version+1 WHERE document_id=$1 RETURNING *",[documentId])).rows[0];if(control)await revision(tx,a,w,documentId,'document_controls',control.version,control);}
  if(op.submissionFileId)await tx.query('INSERT INTO submission_file_acceptances(file_id,workspace_id,version_id,actor_id) VALUES($1,$2,$3,$4)',[op.submissionFileId,w,id,a.userId]);
  await revision(tx,a,w,documentId,'document',version,meta);await audit(tx,a,p,'document.saved',documentId,null,meta);return [{id:documentId,versionId:id,kind:'document',version}];
 }
 async inspectionAccess(tx:Connection,a:Actor,w:string){const p=await access(tx,a,w);if(p.role==='owner')return;const rules=(await tx.query('SELECT allowed_users FROM document_access WHERE workspace_id=$1 UNION ALL SELECT allowed_users FROM folder_access WHERE workspace_id=$1 UNION ALL SELECT allowed_users FROM workspace_nodes WHERE workspace_id=$1 UNION ALL SELECT allowed_users FROM workspace_components WHERE workspace_id=$1',[w])).rows;if(rules.some(r=>r.allowed_users!==null&&!r.allowed_users.includes(a.userId)))fail(403,'restricted_inspection','Full inspection is unavailable with restricted documents or projects');}
 async templateUpgrades(a:Actor,w:string){const p=await access(this.db,a,w);if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','Human owner required');const installed=(await this.db.query('SELECT template_id FROM template_installations WHERE workspace_id=$1',[w])).rows;return Promise.all(installed.map(t=>templateDiff(this.db,w,t.template_id)));}
 async accessRules(a:Actor,w:string){const p=await access(this.db,a,w);if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','Human owner required');return {version:p.access_version,aiHiddenTypes:p.ai_hidden_types,folders:(await this.db.query('SELECT * FROM folder_access WHERE workspace_id=$1',[w])).rows,documents:(await this.db.query('SELECT * FROM document_access WHERE workspace_id=$1',[w])).rows};}
 async setAccessRules(a:Actor,w:string,input:{expectedVersion:number;aiHiddenTypes:string[];folder?:{name:string;allowedUsers:string[]|null;ai:boolean};document?:{documentId:string;allowedUsers:string[]|null;ai:boolean;expectedVersion:number}}){return this.db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w,true);if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','Human owner required');
  if(p.access_version!==input.expectedVersion)fail(409,'stale_version','Access rules changed; refresh before saving');
  const types=(await tx.query('SELECT id FROM entity_types WHERE workspace_id=$1',[w])).rows;
  if(input.aiHiddenTypes.some(id=>!types.some(t=>t.id===id)))fail(400,'invalid_type','Table not found');
  await tx.query('UPDATE workspaces SET ai_hidden_types=$2,access_version=access_version+1 WHERE id=$1',[w,json(input.aiHiddenTypes)]);
  if(input.folder){const f=input.folder;if(!f.name.trim()||f.name!==f.name.trim()||f.name.endsWith('/')||f.name.startsWith('/')||f.name.includes('//'))fail(400,'invalid_folder','Use a folder name or a path with single slashes');const members=(await tx.query('SELECT user_id FROM memberships WHERE tenant_id=$1',[p.tenant_id])).rows;if(f.allowedUsers?.some(id=>!members.some(m=>m.user_id===id)))fail(400,'invalid_user','Choose organisation members');const before=(await tx.query('SELECT * FROM folder_access WHERE workspace_id=$1 AND folder=$2',[w,f.name])).rows[0];await tx.query('INSERT INTO folder_access(workspace_id,folder,allowed_users,ai_enabled) VALUES($1,$2,$3,$4) ON CONFLICT(workspace_id,folder) DO UPDATE SET allowed_users=excluded.allowed_users,ai_enabled=excluded.ai_enabled,version=folder_access.version+1',[w,f.name,f.allowedUsers===null?null:json(f.allowedUsers),f.ai]);await audit(tx,a,p,'folder.access_changed',w,before??null,f);}
  if(input.document){const d=input.document;if(!(await tx.query('SELECT id FROM document_versions WHERE workspace_id=$1 AND document_id=$2',[w,d.documentId])).rows.length)fail(404,'not_found','Document not found');
   const before=(await tx.query('SELECT * FROM document_access WHERE document_id=$1',[d.documentId])).rows[0];if((before?.version??-1)!==d.expectedVersion)fail(409,'stale_version','Document permissions changed; refresh');
   const members=(await tx.query('SELECT user_id FROM memberships WHERE tenant_id=$1',[p.tenant_id])).rows;
   if(d.allowedUsers?.some(id=>!members.some(m=>m.user_id===id)))fail(400,'invalid_user','Choose organisation members');
   await tx.query('INSERT INTO document_access(document_id,workspace_id,allowed_users,ai_enabled) VALUES($1,$2,$3,$4) ON CONFLICT(document_id) DO UPDATE SET allowed_users=excluded.allowed_users,ai_enabled=excluded.ai_enabled,version=document_access.version+1',[d.documentId,w,d.allowedUsers===null?null:json(d.allowedUsers),d.ai]);
   await audit(tx,a,p,'document.access_changed',d.documentId,before??null,d);
  }
  await audit(tx,a,p,'tables.ai_access',w,{aiHiddenTypes:p.ai_hidden_types},{aiHiddenTypes:input.aiHiddenTypes});return {ok:true};
 });}
 async history(a:Actor,w:string,opts:{offset?:number;action?:string;actorId?:string}={}) {await this.inspectionAccess(this.db,a,w);const p=await access(this.db,a,w);if(a.origin!=='human'||!['owner','inspector'].includes(p.role)||!p.document_scope)fail(403,'owner_required','Audit is available to unrestricted human owners and inspectors');return (await this.db.query('SELECT * FROM audit_events WHERE workspace_id=$1 AND ($2::text IS NULL OR strpos(action,$2)>0) AND ($3::uuid IS NULL OR actor_id=$3) ORDER BY created_at DESC,id DESC LIMIT 200 OFFSET $4',[w,opts.action??null,opts.actorId??null,opts.offset??0])).rows;}
 async setAi(a:Actor,w:string,enabled:boolean) {return this.db.transaction(async tx=>{await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w,enabled);if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','Human owner required');await tx.query('UPDATE workspaces SET ai_enabled=$1 WHERE id=$2',[enabled,w]);await audit(tx,a,p,'workspace.ai_access',w,{enabled:p.ai_enabled},{enabled});return {enabled};});}
 async grant(a:Actor,w:string,action:string,destination:string,future:boolean) {return this.db.transaction(async tx=>{await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w,true);if(a.origin!=='human')fail(403,'human_required','Human authorisation required');const id=randomUUID();await tx.query('INSERT INTO action_grants(id,workspace_id,user_id,action,destination,future) VALUES($1,$2,$3,$4,$5,$6)',[id,w,a.userId,action,destination,future]);await audit(tx,a,p,'permission.granted',id,null,{action,destination,future});return {id};});}
 async grants(a:Actor,w:string) {await access(this.db,a,w);return (await this.db.query('SELECT * FROM action_grants WHERE workspace_id=$1 AND user_id=$2 ORDER BY created_at DESC',[w,a.userId])).rows;}
 async revoke(a:Actor,w:string,id:string) {return this.db.transaction(async tx=>{await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w);if(a.origin!=='human')fail(403,'human_required','Human authorisation required');const g=(await tx.query('UPDATE action_grants SET revoked_at=now() WHERE id=$1 AND workspace_id=$2 AND user_id=$3 RETURNING id',[id,w,a.userId])).rows[0];if(!g)fail(404,'not_found','Permission not found');await audit(tx,a,p,'permission.revoked',id,null,{revoked:true});return {id};});}
 async members(a:Actor,w:string){const p=await access(this.db,a,w);if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','Human owner required');return (await this.db.query('SELECT a.*,u.name,u.email FROM workspace_access a JOIN users u ON u.id=a.user_id WHERE a.workspace_id=$1',[w])).rows;}
 async share(a:Actor,w:string,userId:string,role:string,hiddenFields:string[],allowedTypes:string[]|null,ai:boolean){if(role==='inspector')ai=false;return this.db.transaction(async tx=>{
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
 async unshare(a:Actor,w:string,userId:string){return this.db.transaction(async tx=>{await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w);if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','Human owner required');const before=(await tx.query('DELETE FROM workspace_access WHERE workspace_id=$1 AND user_id=$2 RETURNING *',[w,userId])).rows[0];if(!before)fail(404,'not_found','Access not found');await audit(tx,a,p,'access.revoked',userId,before,null);return {userId};});}
 async transition(a:Actor,w:string,recordId:string,expectedVersion:number,state:'in_review'|'approved'|'archived',meaning:string){return this.db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w,true);if(a.origin!=='human')fail(403,'human_required','Review decisions require a human');
  const r=(await tx.query('SELECT * FROM records WHERE id=$1 AND workspace_id=$2 FOR UPDATE',[recordId,w])).rows[0];if(!r)fail(404,'not_found','Record not found');await typeAccess(tx,a,w,r.type_id,true);
  if(p.hidden_fields.length||p.allowed_types!==null)fail(403,'full_review_required','Review requires full workspace access');
  if(r.version!==expectedVersion)fail(409,'stale_version','Record changed; review the latest version');
  if(r.state==='archived'||(state==='approved'&&r.state!=='in_review'))fail(409,'invalid_state','Submit the current draft for review first');
  const routed=(await tx.query('SELECT q.* FROM record_review_requests q LEFT JOIN record_review_decisions d ON d.request_id=q.id WHERE q.record_id=$1 AND d.request_id IS NULL',[recordId])).rows[0];
  if(routed){if(state!=='approved'||routed.reviewer_id!==a.userId)fail(403,'assigned_reviewer','Only the assigned reviewer may approve; cancel the request before another transition');if(routed.record_version!==r.version)fail(409,'stale_review','This request covers an older version. Cancel and request a fresh review');}
  const version=r.version+1;await tx.query('UPDATE records SET state=$1,version=$2,updated_at=now() WHERE id=$3',[state,version,recordId]);
  if(state==='approved')await tx.query('INSERT INTO approvals(id,workspace_id,record_id,record_version,actor_id,meaning) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),w,recordId,version,a.userId,meaning]);
  if(routed)await tx.query("INSERT INTO record_review_decisions(request_id,workspace_id,actor_id,outcome,meaning,resulting_version) VALUES($1,$2,$3,'approved',$4,$5)",[routed.id,w,a.userId,meaning,version]);
  await revision(tx,a,w,recordId,'record',version,{data:r.data,state});await audit(tx,a,p,'record.'+state,recordId,{state:r.state,version:r.version},{state,version},meaning);return {id:recordId,version,state};
 });}
 async workspacePolicy(a:Actor,w:string){const p=await access(this.db,a,w);if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','Human owner required');return {archived:p.archived,legalHold:p.legal_hold,retentionUntil:p.retention_until,version:p.policy_version};}
 async acknowledgeDocument(a:Actor,w:string,versionId:string,meaning:string){return this.db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w);if(p.archived)fail(409,'workspace_archived','Workspace is read-only while archived');if(a.origin!=='human')fail(403,'human_required','A person must acknowledge the exact source');
  if(!p.document_scope)fail(403,'restricted_documents','Document access unavailable');await this.documentPermission(tx,a,w,versionId,true);
  const d=(await tx.query('SELECT id FROM document_versions WHERE id=$1 AND workspace_id=$2',[versionId,w])).rows[0];if(!d)fail(404,'not_found','Document not found');
  const old=(await tx.query('SELECT * FROM acknowledgements WHERE document_version_id=$1 AND actor_id=$2',[versionId,a.userId])).rows[0];if(old)return old;
  const id=randomUUID();await tx.query('INSERT INTO acknowledgements(id,workspace_id,document_version_id,actor_id,meaning) VALUES($1,$2,$3,$4,$5)',[id,w,versionId,a.userId,meaning]);await audit(tx,a,p,'document.acknowledged',versionId,null,{acknowledgementId:id},meaning);return {id,versionId};
 });}
 async reviewDocument(a:Actor,w:string,versionId:string,expectedVersion:number,state:'in_review'|'approved',meaning:string){return this.db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w,true);if(a.origin!=='human')fail(403,'human_required','A person must review the source');
  if(!p.document_scope)fail(403,'restricted_documents','Document access unavailable');await this.documentPermission(tx,a,w,versionId,true);
  const d=(await tx.query('SELECT * FROM document_versions WHERE id=$1 AND workspace_id=$2',[versionId,w])).rows[0];if(!d)fail(404,'not_found','Document not found');
  const latest=(await tx.query('SELECT id FROM document_versions WHERE document_id=$1 ORDER BY version DESC LIMIT 1',[d.document_id])).rows[0];if(latest.id!==versionId)fail(409,'stale_version','Review the latest original');
  const old=(await tx.query('SELECT * FROM document_controls WHERE document_id=$1',[d.document_id])).rows[0];if((old?.version??-1)!==expectedVersion)fail(409,'stale_version','Document controls changed');
  if(state==='approved'&&(old?.status!=='in_review'||(old.reviewer_id&&old.reviewer_id!==a.userId)))fail(403,'review_required','The assigned reviewer must review the submitted document');
  const version=expectedVersion+1;await tx.query('INSERT INTO document_controls(document_id,workspace_id,status,reviewed_version_id,version) VALUES($1,$2,$3,$4,$5) ON CONFLICT(document_id) DO UPDATE SET status=$3,reviewed_version_id=$4,version=$5',[d.document_id,w,state,versionId,version]);
  await revision(tx,a,w,d.document_id,'document_controls',version,{...old,status:state,reviewedVersionId:versionId});await audit(tx,a,p,'document.'+state,d.document_id,old??null,{versionId,state},meaning);return {id:d.document_id,version,state};
 });}
 async exportWorkspace(a:Actor,w:string){return this.db.transaction(async tx=>{
  // Block concurrent workspace commits for a consistent original/history snapshot.
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w);if(a.origin!=='human'||!['owner','inspector'].includes(p.role)||!p.document_scope)fail(403,'owner_required','Unrestricted human owner or inspector required');
  await this.inspectionAccess(tx,a,w);
  const documents=(await tx.query('SELECT d.*,p.bytes FROM document_versions d JOIN document_payloads p ON p.version_id=d.id WHERE d.workspace_id=$1',[w])).rows.map(d=>{const bytes=Buffer.from(d.bytes);if(checksum(bytes)!==d.checksum)fail(500,'integrity_failure','Original integrity check failed');return {...d,bytes:undefined,base64:bytes.toString('base64')};});
  const result:any={format:'trialy-export',formatVersion:1,workspace:{id:w,name:p.name},exportedAt:new Date().toISOString(),documents};
  result.external_links=(await tx.query('SELECT id,workspace_id,owner_id,kind,name,type_id,type_version,fields,view_id,view_version,questions,file_request,project_id,expires_at,revoked_at,created_at FROM external_links WHERE workspace_id=$1',[w])).rows;
  result.submission_files=(await tx.query('SELECT * FROM submission_files WHERE workspace_id=$1',[w])).rows.map(f=>{const bytes=Buffer.from(f.bytes);if(checksum(bytes)!==f.checksum)fail(500,'integrity_failure','Source integrity check failed');return {...f,bytes:undefined,base64:bytes.toString('base64')};});
  result.workspace_invitations=(await tx.query('SELECT id,workspace_id,owner_id,label,role,allowed_types,expires_at,revoked_at,accepted_by,accepted_at,created_at FROM workspace_invitations WHERE workspace_id=$1',[w])).rows;
  result.workspace_policies=[{archived:p.archived,legalHold:p.legal_hold,retentionUntil:p.retention_until,version:p.policy_version}];
  for(const table of ['document_controls','document_access','folder_access','acknowledgements','form_submissions','submission_acceptances','submission_file_acceptances','record_review_requests','record_review_decisions','inbox_reminders','template_installations','entity_types','records','saved_views','revisions','approvals','audit_events','automations','automation_runs'])result[table]=(await tx.query(`SELECT * FROM ${table} WHERE workspace_id=$1`,[w])).rows;
  for(const table of ['table_mappings','table_mapping_revocations','cross_table_links','record_facts','record_fact_retractions','project_records','record_field_changes','workspace_nodes','workspace_components','maintenance_scopes','workspace_receipts','identity_links','record_observations','foundation_functions','foundation_grants','foundation_schedules','foundation_receipts'])result[table]=(await tx.query(`SELECT * FROM ${table} WHERE workspace_id=$1`,[w])).rows;
  result.foundation_revisions=(await tx.query('SELECT r.* FROM foundation_revisions r JOIN foundation_functions f ON f.id=r.function_id WHERE f.workspace_id=$1',[w])).rows;
  await audit(tx,a,p,'workspace.exported',w,null,{formatVersion:1,documents:documents.length});return result;
 });}
 async automations(a:Actor,w:string){await access(this.db,a,w);const rows=(await this.db.query('SELECT * FROM automations WHERE workspace_id=$1 AND owner_id=$2 ORDER BY created_at',[w,a.userId])).rows;const result=[];for(const r of rows){if(r.conditions){try{await this.recordQuery(a,w,r.conditions.typeId,{viewId:r.conditions.viewId,dateField:r.conditions.dateField,dueBefore:'9999-12-31'});}catch{continue;}}if(r.action?.kind==='create_record'){try{const {type,policy}=await typeAccess(this.db,a,w,r.action.typeId);if(Object.keys(r.action.data).some(k=>!visibleFields(type.fields,policy,a).some(f=>f.key===k)))continue;}catch{continue;}}result.push(r);}return result;}
 async runs(a:Actor,w:string){await access(this.db,a,w);const allowed=(await this.types(a,w)).map(t=>t.id);const rows=(await this.db.query('SELECT r.*,a.conditions,a.action FROM automation_runs r JOIN automations a ON a.id=r.automation_id WHERE r.workspace_id=$1 AND a.owner_id=$2 ORDER BY r.created_at DESC LIMIT 50',[w,a.userId])).rows;const result=[];for(const r of rows){if(r.action?.kind==='create_record'){try{const {type,policy}=await typeAccess(this.db,a,w,r.action.typeId);if(Object.keys(r.action.data).some(k=>!visibleFields(type.fields,policy,a).some(f=>f.key===k)))throw Error();}catch{result.push({id:r.id,status:'unavailable',created_at:r.created_at,summary:{title:'Run unavailable under current access'}});continue;}}if(r.conditions){try{await this.recordQuery(a,w,r.conditions.typeId,{viewId:r.conditions.viewId,dateField:r.conditions.dateField,dueBefore:'9999-12-31'});}catch{result.push({id:r.id,status:'unavailable',created_at:r.created_at,summary:{title:'Report unavailable under current access'}});continue;}}result.push({...r,summary:{...r.summary,eventIds:a.origin==='ai'?undefined:r.summary.eventIds,tables:r.summary.tables?.filter((t:any)=>allowed.includes(t.id))}});}return result;}
 async pause(a:Actor,w:string,id:string,paused:boolean){return this.db.transaction(async tx=>{await tx.query('SELECT id FROM automations WHERE id=$1 AND workspace_id=$2 AND owner_id=$3 FOR UPDATE',[id,w,a.userId]);await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w,!paused);if(a.origin!=='human')fail(403,'human_required','Human authorisation required');const before=(await tx.query('UPDATE automations SET paused=$1,version=version+1 WHERE id=$2 AND workspace_id=$3 AND owner_id=$4 RETURNING *',[paused,id,w,a.userId])).rows[0];if(!before)fail(404,'not_found','Automation not found');await revision(tx,a,w,id,'automation',before.version,before);await audit(tx,a,p,'automation.paused',id,null,{paused});return {id,paused};});}

}

