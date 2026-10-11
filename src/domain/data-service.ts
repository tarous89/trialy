import type {Connection,Database} from '../db/database.js';
import {PostgresOriginalStore,type OriginalStore} from '../db/originals.js';
import {access,typeAccess,visibleFields,projectData,folderAllowed} from './permissions.js';
import {viewFields,viewConfigSchema,fail,type Actor,type Field,type RecordQuery} from '../shared/schema.js';
import {checksum} from './evidence.js';
const json=JSON.stringify;
/** Permission-filtered data/query/document foundation, independent of business builders. */
export class DataService {
 constructor(public db:Database,public maxFileBytes=25*1024*1024,protected originals:OriginalStore=new PostgresOriginalStore()){}
 async workspaces(a:Actor) {
  const rows=(await this.db.query(`SELECT w.id,w.name,w.ai_enabled,m.role FROM workspaces w JOIN memberships m ON m.tenant_id=w.tenant_id AND m.user_id=$1 LEFT JOIN workspace_access wa ON wa.workspace_id=w.id AND wa.user_id=$1 WHERE m.role='owner' OR wa.user_id IS NOT NULL ORDER BY w.created_at`,[a.userId])).rows;
  const result=[];for(const w of rows) {try {await access(this.db,a,w.id);result.push(w);}catch {}}return result;
 }
 async types(a:Actor,w:string) {
  const p=await access(this.db,a,w);const rows=(await this.db.query('SELECT * FROM entity_types WHERE workspace_id=$1 ORDER BY created_at,name',[w])).rows;
  return rows.filter(t=>!p.allowed_types||p.allowed_types.includes(t.id)).map(t=>({...t,fields:visibleFields(t.fields,{...p,typeId:t.id},a)}));
 }
 protected async recordQuery(a:Actor,w:string,t:string,opts:RecordQuery={},connection:Connection=this.db) {
  const {type,policy}=await typeAccess(connection,a,w,t);const fields=visibleFields(type.fields,policy,a);

  // Search only visible keys; restricted fields must not leak through matching/counts.
  const args:any[]=[w,t];let where='workspace_id=$1 AND type_id=$2';
  if(opts.state==='archived')where+=" AND state='archived'";else if(opts.state!=='all')where+=" AND state<>'archived'";
  if(opts.q){args.push(fields.map(f=>f.key),opts.q);where+=` AND EXISTS (SELECT 1 FROM jsonb_each_text(data) v WHERE v.key=ANY($3::text[]) AND strpos(lower(v.value),lower($4))>0)`;}
  let config:any={};
  if(opts.viewId){const v=(await connection.query('SELECT * FROM saved_views WHERE id=$1 AND workspace_id=$2 AND type_id=$3',[opts.viewId,w,t])).rows[0];if(!v||viewFields(viewConfigSchema.parse(v.config)).some(k=>!fields.some(f=>f.key===k)))fail(404,'not_found','View not available');config=v.config;}
  const bind=(v:unknown)=>{args.push(v);return `$${args.length}`;};
  for(const f of config.filters??[]){const key=bind(f.field);
   if(f.operator==='empty')where+=` AND (data->${key}::text IS NULL OR data->${key}::text IN ('null'::jsonb,'""'::jsonb))`;
   else if(f.operator==='contains')where+=` AND strpos(lower(data->>${key}::text),lower(${bind(String(f.value))}::text))>0`;
   else where+=` AND data->${key}::text=${bind(json(f.value))}::jsonb`;
  }
  if(opts.dueBefore){const field=opts.dateField??config.dateField;if(!field||!fields.some(f=>f.key===field&&f.kind==='date'))fail(400,'invalid_date_field','Choose an accessible date field');where+=` AND NULLIF(data->>${bind(field)}::text,'')<=${bind(opts.dueBefore)}::text`; }
  if(opts.month){const field=opts.dateField??config.dateField;if(!field||!fields.some(f=>f.key===field&&f.kind==='date'))fail(400,'invalid_date_field','Choose an accessible date field');where+=` AND left(data->>${bind(field)}::text,7)=${bind(opts.month)}::text`;}
  return {args,where,fields,config};
 }
 async records(a:Actor,w:string,t:string,opts:RecordQuery={}) {
  const {args,where,fields,config}=await this.recordQuery(a,w,t,opts);
  const limit=Math.min(100,Math.max(1,opts.limit??50)),offset=Math.max(0,opts.offset??0);
  const total=Number((await this.db.query(`SELECT count(*) AS count FROM records WHERE ${where}`,args)).rows[0].count);
  const bind=(v:unknown)=>{args.push(v);return `$${args.length}`;};
  const order=config.sort?`NULLIF(data->${bind(config.sort.field)}::text,'null'::jsonb) ${config.sort.direction==='desc'?'DESC':'ASC'} NULLS LAST,created_at,id`:'created_at,id';
  const rows=(await this.db.query(`SELECT * FROM records WHERE ${where} ORDER BY ${order} LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,limit,offset])).rows;
  return {rows:rows.map(r=>({...r,data:projectData(r.data,fields)})),total,limit,offset,month:opts.month};
 }
 async aggregate(a:Actor,w:string,t:string,opts:RecordQuery&{groupBy?:string;metric?:string}={}) {
  const {args,where,fields}=await this.recordQuery(a,w,t,opts);
  if(opts.groupBy&&!fields.some(f=>f.key===opts.groupBy))fail(400,'invalid_field','Group field unavailable');
  if(opts.metric&&!fields.some(f=>f.key===opts.metric&&['number','money'].includes(f.kind)))fail(400,'invalid_field','Numeric field unavailable');
  const bind=(v:unknown)=>{args.push(v);return `$${args.length}`;};
  const metric=opts.metric?bind(opts.metric):null;
  const numeric=metric?`CASE WHEN jsonb_typeof(data->${metric}::text)='number' THEN (data->>${metric}::text)::numeric END`:'NULL::numeric';
  const group=opts.groupBy?`data->>${bind(opts.groupBy)}::text`:'NULL::text';
  const totals=(await this.db.query(`SELECT count(*)::int AS count,sum(${numeric}) AS sum,avg(${numeric}) AS average,min(${numeric}) AS minimum,max(${numeric}) AS maximum FROM records WHERE ${where}`,args.slice(0,opts.groupBy?-1:undefined))).rows[0];
  const groups=opts.groupBy?(await this.db.query(`SELECT ${group} AS label,count(*)::int AS count,sum(${numeric}) AS sum,avg(${numeric}) AS average FROM records WHERE ${where} GROUP BY ${group} ORDER BY count(*) DESC,${group} NULLS LAST LIMIT 201`,args)).rows:[];
  return {totals,groups:groups.slice(0,200),groupsTruncated:groups.length>200,metric:opts.metric??null,scope:'All matching authorised records'};
 }
 async recordHistory(a:Actor,w:string,recordId:string,offset=0) {
  const r=(await this.db.query('SELECT * FROM records WHERE id=$1 AND workspace_id=$2',[recordId,w])).rows[0];
  if(!r)fail(404,'not_found','Record not found');
  const {type,policy}=await typeAccess(this.db,a,w,r.type_id);
  const fields=visibleFields(type.fields,policy,a);
  const revisions=(await this.db.query("SELECT version,snapshot,actor_id,created_at FROM revisions WHERE workspace_id=$1 AND object_id=$2 AND object_kind='record' ORDER BY version DESC LIMIT 51 OFFSET $3",[w,recordId,offset])).rows;
  return {recordId,typeId:r.type_id,currentVersion:r.version,typeVersion:type.version,fields,
   canRestore:!['viewer','inspector'].includes(policy.role)&&fields.length===type.fields.length&&!['archived','superseded'].includes(r.state),
   offset,hasMore:revisions.length>50,revisions:revisions.slice(0,50).map(v=>({version:v.version,actorId:v.actor_id,createdAt:v.created_at,state:v.snapshot.state,data:projectData(v.snapshot.data??{},fields)}))};
 }
 async documentPermission(tx:Connection,a:Actor,w:string,documentId:string,version=false){
  const p=await access(tx,a,w);const rules=(await tx.query(`SELECT r.* FROM document_access r WHERE r.workspace_id=$1 AND r.document_id=${version?'(SELECT document_id FROM document_versions WHERE id::text=$2 AND workspace_id=$1)':'$2::uuid'}`,[w,documentId])).rows[0];
  if(rules&&((p.role!=='owner'&&rules.allowed_users!==null&&!rules.allowed_users.includes(a.userId))||(a.origin==='ai'&&!rules.ai_enabled)))fail(404,'not_found','Document not found');
  const control=(await tx.query(`SELECT folder FROM document_controls WHERE workspace_id=$1 AND document_id=${version?'(SELECT document_id FROM document_versions WHERE id::text=$2 AND workspace_id=$1)':'$2::uuid'}`,[w,documentId])).rows[0];const folders=(await tx.query('SELECT * FROM folder_access WHERE workspace_id=$1',[w])).rows;if(!folderAllowed(control?.folder??'',folders,a,p.role))fail(404,'not_found','Document not found');
 }
 async documents(a:Actor,w:string) {
  const p=await access(this.db,a,w);if(!p.document_scope)fail(403,'restricted_documents','Document access for restricted views is not enabled');
  const rows=(await this.db.query(`SELECT d.*,e.status AS extraction_status,c.linked_record_id AS control_record_id,c.reviewer_id,c.expires_on,c.folder,c.status AS review_status,c.reviewed_version_id,c.version AS control_version FROM document_versions d JOIN extractions e ON e.version_id=d.id LEFT JOIN document_controls c ON c.document_id=d.document_id AND ($2=false OR ((SELECT latest.ai_enabled FROM document_versions latest WHERE latest.document_id=d.document_id ORDER BY latest.version DESC LIMIT 1)=true AND (c.reviewed_version_id IS NULL OR EXISTS(SELECT 1 FROM document_versions reviewed WHERE reviewed.id=c.reviewed_version_id AND reviewed.ai_enabled=true)))) WHERE d.workspace_id=$1 ${a.origin==='ai'?'AND d.ai_enabled=true':''} ORDER BY d.created_at DESC`,[w,a.origin==='ai'])).rows;
  const rules=(await this.db.query('SELECT * FROM document_access WHERE workspace_id=$1',[w])).rows;
  const folders=(await this.db.query('SELECT * FROM folder_access WHERE workspace_id=$1',[w])).rows,controls=(await this.db.query('SELECT document_id,folder FROM document_controls WHERE workspace_id=$1',[w])).rows;
  return rows.filter(d=>{const rule=rules.find(r=>r.document_id===d.document_id);return folderAllowed(controls.find(c=>c.document_id===d.document_id)?.folder??'',folders,a,p.role)&&(!rule||((p.role==='owner'||rule.allowed_users===null||rule.allowed_users.includes(a.userId))&&(a.origin!=='ai'||rule.ai_enabled)));});
 }
 async original(a:Actor,w:string,id:string) {
  const docs=await this.documents(a,w);const d=docs.find(x=>x.id===id);if(!d)fail(404,'not_found','Document not found');
  const bytes=await this.originals.get(this.db,id);if(!bytes)fail(500,'source_missing','Original is unavailable');if(checksum(bytes)!==d.checksum)fail(500,'integrity_failure','The original failed its integrity check');return {...d,bytes};
 }
 async documentText(a:Actor,w:string,versionId:string,offset=0) {
  const d=(await this.documents(a,w)).find(d=>d.id===versionId);if(!d)fail(404,'not_found','Document not found');
  const e=(await this.db.query('SELECT status,text_content,tables,table_status FROM extractions WHERE version_id=$1',[versionId])).rows[0];
  const text=['ready','partial'].includes(e?.status)?e.text_content??'':'';
  return {documentId:d.document_id,versionId,version:d.version,filename:d.filename,status:e?.status??'pending',tables:offset===0?(e.tables??[]):[],tableStatus:e.table_status,offset,text:text.slice(offset,offset+12000),hasMore:offset+12000<text.length};
 }
 async search(a:Actor,w:string,q:string) {
  const docs=await this.documents(a,w);const ids=docs.map(d=>d.id);
  const coverage={total:docs.length,pending:docs.filter(d=>d.extraction_status==='pending').length,unavailable:docs.filter(d=>d.extraction_status==='unavailable').length,partial:docs.filter(d=>d.extraction_status==='partial').length};
  const hits=(await this.db.query(`SELECT d.id AS version_id,d.document_id,d.filename,d.version,(SELECT coalesce(jsonb_agg(hit),'[]'::jsonb) FROM (SELECT jsonb_build_object('page',section->'page','text',ts_headline('simple',section->>'text',plainto_tsquery('simple',$2),'StartSel=,StopSel=,MaxWords=60,MinWords=15')) AS hit FROM jsonb_array_elements(e.sections) section WHERE to_tsvector('simple',coalesce(section->>'text','')) @@ plainto_tsquery('simple',$2) LIMIT 5) evidence) AS sections,ts_headline('simple',e.text_content,plainto_tsquery('simple',$2),'StartSel=,StopSel=,MaxWords=60,MinWords=15') AS passage FROM extractions e JOIN document_versions d ON d.id=e.version_id WHERE e.version_id=ANY($1::uuid[]) AND e.status IN ('ready','partial') AND e.search_vector @@ plainto_tsquery('simple',$2) ORDER BY ts_rank(e.search_vector,plainto_tsquery('simple',$2)) DESC LIMIT 20`,[ids,q])).rows;
  return {hits,coverage};
 }
 async views(a:Actor,w:string) {
  const types=await this.types(a,w);
  // A hidden filter/sort/group must not influence membership, counts or order.
  return (await this.db.query('SELECT * FROM saved_views WHERE workspace_id=$1 ORDER BY name,id',[w])).rows.filter(v=>{
   const t=types.find(t=>t.id===v.type_id);if(!t)return false;
   return viewFields(viewConfigSchema.parse(v.config)).every(k=>t.fields.some((f:Field)=>f.key===k));
  });
 }
}
