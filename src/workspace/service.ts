import {Foundation} from '../foundation/service.js';
import {z} from 'zod';
import {id} from '../shared/schema.js';
import {requireHuman,type WriteAuthorization} from '../domain/write-authorization.js';
import {execute} from '../foundation/runtime.js';
import {frontendRequest,frontendOutput,frontendRead,componentRecordChanges} from './frontend.js';
import {interfaceSchema} from './ui.js';
import {randomUUID} from 'node:crypto';
import type {Database,Connection} from '../db/database.js';
import {Service} from '../domain/service.js';
import {access,typeAccess,visibleFields,projectData} from '../domain/permissions.js';
import {audit,revision,checksum} from '../domain/evidence.js';
import {fail,type Actor} from '../shared/schema.js';
import {maintenanceSchema,maintenanceBatch,workspaceOperation,type WorkspaceOperation} from './schema.js';
const J=JSON.stringify;
const activeFrontends=new Set<string>();
const adapter=(tx:Connection):Database=>({query:tx.query.bind(tx),transaction:fn=>fn(tx),close:async()=>{}});
export class WorkspaceFoundation {
 constructor(public db:Database){}
 // Project-level sharing comes later. Avoid leaking project/scope metadata to partial-access members.
 async policy(tx:Connection,a:Actor,w:string,write=false){
  const p=await access(tx,a,w,write);
  if(p.allowed_types!==null||p.hidden_fields.length)fail(403,'workspace_scope','Workspace organization currently requires full workspace access');
  return p;
 }
 async node(tx:Connection,w:string,id:string){const r=(await tx.query('SELECT * FROM workspace_nodes WHERE id=$1 AND workspace_id=$2',[id,w])).rows[0];if(!r)fail(404,'not_found','Project or folder not found');return r;}
 async nodeAccess(tx:Connection,a:Actor,w:string,id:string){
  const p=await this.policy(tx,a,w);let current:string|null=id;const chain:any[]=[];
  while(current){const n=await this.node(tx,w,current);if(chain.some(v=>v.id===n.id))fail(409,'folder_cycle','Invalid folder hierarchy');
   if((p.role!=='owner'&&n.allowed_users!==null&&!n.allowed_users.includes(a.userId))||(a.origin==='ai'&&!n.ai_enabled))fail(404,'not_found','Project or folder not found');chain.push(n);current=n.parent_id;}
  return chain;
 }
 async activeNode(tx:Connection,a:Actor,w:string,id:string){const chain=await this.nodeAccess(tx,a,w,id);if(chain.some(n=>n.archived))fail(409,'project_archived','Restore the archived project or folder before continuing');return chain;}
 private intersect(left:string[]|null,right:string[]|null){return left===null?right:right===null?left:left.filter(id=>right.includes(id));}
 private async moveRestrictions(tx:Connection,a:Actor,w:string,nodeId:string,own:any){
  const chain=await this.nodeAccess(tx,a,w,nodeId);let users=own.allowed_users??null,ai=own.ai_enabled??true;
  for(const n of chain){users=this.intersect(users,n.allowed_users);ai=ai&&n.ai_enabled;}return {users,ai};
 }
 async sharingMembers(a:Actor,w:string){const p=await this.policy(this.db,a,w);if(p.role!=='owner')fail(403,'owner_required','Only the workspace owner may change sharing');return (await this.db.query('SELECT u.id,u.name FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.tenant_id=$1 ORDER BY u.name,u.id',[p.tenant_id])).rows;}
 async nodes(a:Actor,w:string){await this.policy(this.db,a,w);const nodes=[];for(const n of (await this.db.query('SELECT * FROM workspace_nodes WHERE workspace_id=$1 ORDER BY name,id',[w])).rows){try{const chain=await this.nodeAccess(this.db,a,w,n.id);nodes.push({...n,effective_archived:chain.some(n=>n.archived)});}catch{}}return {workspaceId:w,workspaceFoundation:true,nodes};}
 async component(tx:Connection,a:Actor,w:string,id:string){
  await this.componentSourcePolicy(tx,a,w);
  const c=(await tx.query('SELECT * FROM workspace_components WHERE id=$1 AND workspace_id=$2',[id,w])).rows[0];
  if(!c)fail(404,'not_found','Component not found');
  const p=await this.policy(tx,a,w);const chain=await this.nodeAccess(tx,a,w,c.project_id);
  if((p.role!=='owner'&&c.allowed_users!==null&&!c.allowed_users.includes(a.userId))||(a.origin==='ai'&&!c.ai_enabled))fail(404,'not_found','Component not found');
  await this.componentBindings(tx,a,w,c.bindings);return {...c,project_archived:chain.some(n=>n.archived)};
 }
 private async componentSourcePolicy(tx:Connection,a:Actor,w:string){
  const p=await this.policy(tx,a,w);
  // Source can embed copied values outside declared bindings. Until provenance-aware
  // component grants exist, never expose it to an actor with a partial data view.
  const rules=(await tx.query('SELECT allowed_users,ai_enabled FROM document_access WHERE workspace_id=$1 UNION ALL SELECT allowed_users,ai_enabled FROM folder_access WHERE workspace_id=$1',[w])).rows;
  const privateFiles=a.origin==='ai'?(await tx.query('SELECT id FROM document_versions WHERE workspace_id=$1 AND ai_enabled=false LIMIT 1',[w])).rows.length:0;
  if(privateFiles||rules.some(r=>(p.role!=='owner'&&r.allowed_users!==null&&!r.allowed_users.includes(a.userId))||(a.origin==='ai'&&!r.ai_enabled)))fail(403,'component_scope','Saved source currently requires unrestricted document access');
  const types=(await tx.query('SELECT fields FROM entity_types WHERE workspace_id=$1',[w])).rows;
  if(types.some(t=>visibleFields(t.fields,p,a).length!==t.fields.length))fail(403,'component_scope','Saved source currently requires access to every workspace field');
 }
 private async componentBindings(tx:Connection,a:Actor,w:string,bindings:any[]){
  for(const b of bindings){const {type,policy}=await typeAccess(tx,a,w,b.typeId);const fields=visibleFields(type.fields,policy,a);
   if(new Set(b.fields).size!==b.fields.length||b.fields.some((k:string)=>!fields.some(f=>f.key===k)))fail(403,'component_binding','Component references unavailable fields');}
 }
 async components(a:Actor,w:string,projectId?:string){
  await this.componentSourcePolicy(this.db,a,w);if(projectId)await this.nodeAccess(this.db,a,w,projectId);
  const rows=(await this.db.query('SELECT * FROM workspace_components WHERE workspace_id=$1 ORDER BY name,id',[w])).rows;
  const result=[];for(const c of rows){if(projectId&&c.project_id!==projectId)continue;try{const checked=await this.component(this.db,a,w,c.id);const {source,...metadata}=checked;result.push(metadata);}catch{}}
  return result;
 }
 async invokeComponent(a:Actor,w:string,input:unknown){
  const v=z.object({componentId:id,expectedVersion:z.number().int().min(0),binding:z.string().min(1).max(64),input:z.unknown().default(null),requestKey:id}).strict().parse(input);
  const c=await this.component(this.db,a,w,v.componentId),binding=c.execution.find((b:any)=>b.name===v.binding);if(!binding||c.archived||c.project_archived||c.version!==v.expectedVersion)fail(409,'component_changed','Open the current component and function binding');
  return new Foundation(this.db).invoke(a,w,{revisionId:binding.revisionId,input:v.input,...(binding.grantId?{grantId:binding.grantId}:{}),componentContext:{id:c.id,version:c.version,binding:binding.name}},v.requestKey);
 }
 async runFrontend(a:Actor,w:string,input:unknown){
  const request=frontendRequest.parse(input);if(Buffer.byteLength(J(request))>150000)fail(400,'input_limit','Interface input is too large');
  let content:any,version:number|undefined;
  if(request.componentId){const c=await this.component(this.db,a,w,request.componentId);if(c.archived||c.project_archived||c.format!=='frontend-js'||c.version!==request.expectedVersion)fail(409,'component_changed','Open the current active code revision');content=c;version=c.version;}
  else {const draft=(await this.db.query('SELECT * FROM workspace_previews WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND expires_at>now()',[request.previewId,w,a.userId])).rows[0];if(!draft||draft.body.operation.kind!=='save_component'||draft.body.operation.content.format!=='frontend-js')fail(404,'not_found','Code preview unavailable');await this.validate(this.db,a,w,draft.body.operation);content=draft.body.operation.content;}
  const key=w+':'+a.userId;if(activeFrontends.size>=2||activeFrontends.has(key))fail(429,'runtime_busy','Another interface is running; try again shortly');activeFrontends.add(key);
  const changes:any[]=[],invocations:any[]=[];
  try{
   const output=frontendOutput.parse(await execute(content.source,{state:request.state,event:request.event},async(name,value)=>{
    if(name==='functions.invoke'){
     if(!request.componentId)fail(403,'preview_read_only','Unsaved interfaces cannot queue functions');
     const v=z.object({binding:z.string().min(1).max(64),input:z.unknown().default(null),requestKey:id}).strict().parse(value);
     if(invocations.length>=3)fail(429,'run_limit','At most three function requests per interface event');if(!content.execution.some((b:any)=>b.name===v.binding))fail(403,'component_binding','Function is not bound');
     invocations.push(v);return {status:'pending_render_completion',requestKey:v.requestKey};
    }
    if(name==='functions.status'){
     if(!request.componentId)fail(403,'preview_read_only','Open a saved interface');
     const v=z.object({requestKey:id}).strict().parse(value);const r=(await this.db.query('SELECT id,component_context FROM foundation_runs WHERE workspace_id=$1 AND user_id=$2 AND request_key=$3',[w,a.userId,v.requestKey])).rows[0];if(!r||r.component_context?.id!==request.componentId||r.component_context?.version!==version)fail(404,'not_found','Component run not found');return new Foundation(this.db).run(a,w,r.id);
    }
    if(name==='records.read'){
     const v=frontendRead.parse(value),binding=content.bindings.find((b:any)=>b.typeId===v.typeId);if(!binding)fail(403,'binding_required','Table is not bound to this component');
     if(request.componentId)await this.component(this.db,a,w,request.componentId);
     await typeAccess(this.db,a,w,v.typeId);
     // Project in PostgreSQL and bound each row before materializing it in the web process.
     const rows=(await this.db.query(`SELECT id,version,CASE WHEN octet_length(selected::text)<=100000 THEN selected ELSE NULL END AS data FROM (
      SELECT id,version,(SELECT coalesce(jsonb_object_agg(key,value),'{}'::jsonb) FROM jsonb_each(data) WHERE key=ANY($3::text[])) AS selected
      FROM records WHERE workspace_id=$1 AND type_id=$2 AND state<>'archived' ORDER BY created_at,id LIMIT $4 OFFSET $5) page`,[w,v.typeId,binding.fields,v.limit,v.offset])).rows;
     if(rows.some(r=>r.data===null))fail(400,'read_limit','A record exceeds the interface read budget');
     const total=Number((await this.db.query("SELECT count(*) AS n FROM records WHERE workspace_id=$1 AND type_id=$2 AND state<>'archived'",[w,v.typeId])).rows[0].n);
     return {rows,total,limit:v.limit,offset:v.offset};
    }
    if(name==='records.propose'){
     if(!request.componentId)fail(403,'preview_read_only','Unsaved interface previews cannot propose database changes');
     const next=componentRecordChanges.parse(value);if(changes.length+next.length>50)fail(400,'change_limit','Too many proposed changes');changes.push(...next);return {status:'proposed',count:next.length};
    }
    fail(403,'capability_unavailable','This interface capability is unavailable');
   }));
   if(Buffer.byteLength(J(output.state))>100000)fail(400,'state_limit','Interface state is too large');
   // Recheck after execution; a concurrent revoke/edit must not release its output.
   if(request.componentId){const current=await this.component(this.db,a,w,request.componentId);if(current.version!==version||current.archived||current.project_archived)fail(409,'component_changed','Interface changed while running');}
   else {const draft=(await this.db.query('SELECT * FROM workspace_previews WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND expires_at>now()',[request.previewId,w,a.userId])).rows[0];if(!draft)fail(409,'preview_expired','Preview unavailable');await this.validate(this.db,a,w,draft.body.operation);}
   const {proposal,queued}=await this.db.transaction(async tx=>{
    await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const f=new WorkspaceFoundation(adapter(tx));
    if(request.componentId){const c=await f.component(tx,a,w,request.componentId);if(c.version!==version||c.archived||c.project_archived)fail(409,'component_changed','Interface changed');}
    const proposal=changes.length?await f.preview(a,w,{kind:'apply_component_records',componentId:request.componentId,expectedVersion:version,changes}):null;
    const queued=[];for(const v of invocations)queued.push(await f.invokeComponent(a,w,{...v,componentId:request.componentId,expectedVersion:version}));return {proposal,queued};
   });
   return {queued,runtime:'trialy-frontend-js-v1',frameUrl:new URL('/frontend/frame',process.env.PUBLIC_URL??process.env.RENDER_EXTERNAL_URL??'http://localhost:3000').toString(),...output,proposal,temporary:!request.componentId};
  }finally{activeFrontends.delete(key);}
 }
 private parseInterface(content:any){
  let spec;try{spec=interfaceSchema.parse(JSON.parse(content.source));}catch{fail(400,'invalid_interface','Use a valid trialy-ui-v1 interface description');}
  for(const b of spec.blocks)if(b.kind==='table'&&!content.bindings.some((v:any)=>v.typeId===b.typeId&&b.fields.every(k=>v.fields.includes(k))))fail(400,'invalid_binding','Every interface table field must have a declared data binding');
  return spec;
 }
 async renderComponent(a:Actor,w:string,id:string,blockIndex:number,offset=0){
  const c=await this.component(this.db,a,w,id);if(c.archived||c.project_archived||c.format!=='trialy-ui')fail(400,'not_runnable','Choose an active Trialy interface');
  const spec=this.parseInterface(c),block=spec.blocks[blockIndex];if(!block||block.kind!=='table')fail(400,'invalid_block','Choose a table block');
  const result=await new Service(this.db).records(a,w,block.typeId,{limit:50,offset});const {type,policy}=await typeAccess(this.db,a,w,block.typeId);
  return {componentVersion:c.version,fields:type.fields.filter((f:any)=>block.fields.includes(f.key)),editable:block.editable&&!['viewer','inspector'].includes(policy.role)&&!policy.archived,...result,rows:result.rows.map(r=>({...r,data:Object.fromEntries(block.fields.map(k=>[k,r.data[k]??null]))}))};
 }
 async readComponent(a:Actor,w:string,id:string){return {workspaceId:w,workspaceFoundation:true,component:await this.component(this.db,a,w,id)};}
 async componentHistory(a:Actor,w:string,id:string){
  await this.component(this.db,a,w,id);
  const rows=(await this.db.query("SELECT * FROM revisions WHERE workspace_id=$1 AND object_id=$2 AND object_kind='workspace_component' ORDER BY version DESC",[w,id])).rows;
  const result=[];for(const r of rows){try{await this.nodeAccess(this.db,a,w,r.snapshot.project_id);await this.componentBindings(this.db,a,w,r.snapshot.bindings);result.push(r);}catch{}}return result;
 }
 private async componentRevision(tx:Connection,w:string,id:string,version:number){
  const r=(await tx.query("SELECT snapshot FROM revisions WHERE workspace_id=$1 AND object_id=$2 AND object_kind='workspace_component' AND version=$3",[w,id,version])).rows[0];
  if(!r)fail(404,'not_found','Component revision not found');return r.snapshot;
 }
 private async parent(tx:Connection,w:string,parentId:string|null,nodeId?:string){
  const visited=new Set<string>(nodeId?[nodeId]:[]);let id=parentId;
  while(id){if(visited.has(id))fail(409,'folder_cycle','A folder cannot contain itself');visited.add(id);const n=await this.node(tx,w,id);if(n.kind!=='folder')fail(400,'invalid_parent','Choose a folder as the destination');id=n.parent_id;}
 }
 async record(tx:Connection,a:Actor,w:string,id:string,write=false,full=false){
  const r=(await tx.query('SELECT * FROM records WHERE id=$1 AND workspace_id=$2',[id,w])).rows[0];if(!r)fail(404,'not_found','Record not found');
  const {type,policy}=await typeAccess(tx,a,w,r.type_id,write);const fields=visibleFields(type.fields,policy,a);
  if(full&&fields.length!==type.fields.length)fail(403,'record_scope','Identity decisions require access to all fields of both records');
  return {...r,data:projectData(r.data,fields),fields};
 }
 private async scopeStamp(tx:Connection,a:Actor,w:string,body:ReturnType<typeof maintenanceSchema.parse>,allowArchived=false){
  const chain=await (allowArchived?this.nodeAccess(tx,a,w,body.projectId):this.activeNode(tx,a,w,body.projectId));const project=chain[0];if(project.kind!=='project')fail(400,'project_required','Choose a project');
  const types=[];for(const b of body.bindings){const {type,policy}=await typeAccess(tx,a,w,b.typeId,true);const fields=visibleFields(type.fields,policy,a);if(new Set(b.fields).size!==b.fields.length||b.fields.some(k=>!fields.some(f=>f.key===k&&!f.formula)))fail(403,'field_scope','Scope includes unavailable or calculated fields');types.push({id:type.id,version:type.version,fields:type.fields});}
  const restricted=chain.filter(n=>n.allowed_users!==null||!n.ai_enabled);return checksum(J(restricted.length?{types,access:restricted.map(n=>({id:n.id,users:n.allowed_users,ai:n.ai_enabled}))}:types));
 }
 async recordFacts(a:Actor,w:string,recordId:string,offset=0){
  const record=await this.record(this.db,a,w,recordId);if(!Number.isInteger(offset)||offset<0)fail(400,'invalid_offset','Invalid page');
  const rows=(await this.db.query('SELECT f.*,r.reason AS retraction_reason,r.actor_id AS retracted_by,r."authorization" AS retraction_authorization,r.created_at AS retracted_at FROM record_facts f LEFT JOIN record_fact_retractions r ON r.fact_id=f.id WHERE f.workspace_id=$1 AND f.record_id=$2 ORDER BY f.created_at DESC,f.id DESC LIMIT 100 OFFSET $3',[w,recordId,offset])).rows;
  const facts=[];for(const fact of rows){if(!record.fields.some((f:any)=>f.key===fact.field_key))continue;try{if(fact.project_id)await this.nodeAccess(this.db,a,w,fact.project_id);facts.push(fact);}catch{}}
  return {recordId,recordVersion:record.version,currentValues:record.data,facts,nextOffset:rows.length===100?offset+100:null,interpretation:'Candidate values preserve source labels and context. Current values change only through a separately reviewed preference. Labels are supplied evidence descriptions, not independent verification.'};
 }
 private async factReview(tx:Connection,a:Actor,w:string,op:Extract<WorkspaceOperation,{kind:'record_fact'|'prefer_record_fact'|'retract_record_fact'}>){
  const fact=op.kind==='record_fact'?null:(await tx.query('SELECT f.* FROM record_facts f LEFT JOIN record_fact_retractions r ON r.fact_id=f.id WHERE f.id=$1 AND f.workspace_id=$2 AND r.fact_id IS NULL',[op.factId,w])).rows[0];
  if(op.kind!=='record_fact'&&!fact)fail(404,'not_found','Active fact not found');
  const record=await this.record(tx,a,w,op.kind==='record_fact'?op.recordId:fact.record_id,true),field=op.kind==='record_fact'?op.field:fact.field_key;
  if(!record.fields.some((f:any)=>f.key===field&&!f.formula))fail(403,'field_scope','Field is unavailable or calculated');
  if(op.kind!=='retract_record_fact'&&(record.version!==op.expectedVersion||['archived','superseded','approved'].includes(record.state)))fail(409,'stale_version','Choose the current editable record');
  const projectId=op.kind==='record_fact'?op.projectId:fact.project_id;
  if(projectId){const project=(await this.activeNode(tx,a,w,projectId))[0];if(project.kind!=='project')fail(400,'project_required','Choose a project context');}
  if(op.kind==='record_fact'&&op.validFrom&&op.validUntil&&op.validFrom>op.validUntil)fail(400,'date_range','Start must precede end');
  if(op.kind==='prefer_record_fact'&&(fact.project_id||fact.valid_from||fact.valid_until))fail(400,'contextual_fact','Contextual or dated facts stay contextual. Prepare a separate explicit current-value correction if appropriate.');
  const value=op.kind==='record_fact'?op.value:fact.value;
  if(op.kind!=='retract_record_fact'){const {type,policy}=await typeAccess(tx,a,w,record.type_id,true);await new Service(adapter(tx)).validateData(tx,a,w,type,policy,{[field]:value},true,record.id);}
  return {recordId:record.id,typeId:record.type_id,recordVersion:record.version,field,before:record.data[field]??null,value,fact:fact??{projectId:op.kind==='record_fact'?op.projectId:null,validFrom:op.kind==='record_fact'?op.validFrom:null,validUntil:op.kind==='record_fact'?op.validUntil:null},effect:op.kind==='prefer_record_fact'?'Update the current value, retaining all alternatives and history':op.kind==='retract_record_fact'?'Mark this candidate withdrawn; do not change the current value':'Store a candidate value; do not change the current value'};
 }
 async projectRecords(a:Actor,w:string,projectId:string,offset=0){
  const project=(await this.nodeAccess(this.db,a,w,projectId))[0];if(project.kind!=='project')fail(400,'project_required','Choose a project');
  if(!Number.isInteger(offset)||offset<0)fail(400,'invalid_offset','Invalid page');
  const rows=(await this.db.query('SELECT * FROM project_records WHERE workspace_id=$1 AND project_id=$2 AND revoked_at IS NULL ORDER BY created_at,id LIMIT 100 OFFSET $3',[w,projectId,offset])).rows;
  const records=[];for(const link of rows){try{const record=await this.record(this.db,a,w,link.record_id);records.push({link,record});}catch{}}
  return {projectId,records,nextOffset:rows.length===100?offset+100:null,shared:true};
 }
 private async projectLinksReview(tx:Connection,a:Actor,w:string,op:Extract<WorkspaceOperation,{kind:'link_project_records'|'unlink_project_record'}>){
  if(op.kind==='unlink_project_record'){
   const link=(await tx.query('SELECT * FROM project_records WHERE id=$1 AND workspace_id=$2',[op.linkId,w])).rows[0];if(!link||link.revoked_at||link.version!==op.expectedVersion)fail(409,'stale_version','Project link changed');
   const project=(await this.activeNode(tx,a,w,link.project_id))[0];const record=await this.record(tx,a,w,link.record_id,true);
   return {projectId:project.id,projectName:project.name,records:[{id:record.id,typeId:record.type_id,version:record.version,state:record.state}],action:'unlink',retains:'The shared record and its history remain available in the workspace and other projects.'};
  }
  const project=(await this.activeNode(tx,a,w,op.projectId))[0];if(project.kind!=='project')fail(400,'project_required','Choose a project');if(project.version!==op.expectedProjectVersion)fail(409,'stale_version','Project changed');
  if(new Set(op.records.map(r=>r.recordId)).size!==op.records.length)fail(400,'duplicate_record','Select each record only once');
  const records=[];for(const entry of op.records){const record=await this.record(tx,a,w,entry.recordId,true);if(record.version!==entry.expectedVersion||['archived','superseded'].includes(record.state))fail(409,'stale_version','Choose the current active record');
   if((await tx.query('SELECT id FROM project_records WHERE workspace_id=$1 AND project_id=$2 AND record_id=$3 AND revoked_at IS NULL',[w,project.id,record.id])).rows.length)fail(409,'already_linked','A selected record is already linked to this project');
   records.push({id:record.id,typeId:record.type_id,version:record.version,state:record.state});
  }
  return {projectId:project.id,projectName:project.name,records,action:'link',retains:'Records are shared references, not copies. Project sharing does not grant additional access to record data.'};
 }
 private async nodeArchive(tx:Connection,a:Actor,w:string,op:Extract<WorkspaceOperation,{kind:'archive_node'}>){
  const policy=await this.policy(tx,a,w,true);if(policy.role!=='owner')fail(403,'owner_required','Only the workspace owner may archive a project or folder');
  const chain=await this.nodeAccess(tx,a,w,op.nodeId),node=chain[0];
  if(node.version!==op.expectedVersion||node.archived===op.archived)fail(409,'stale_version','Project state changed; prepare again');
  if(chain.slice(1).some(n=>n.archived))fail(409,'project_archived','Restore the parent folder first');
  const nodes=(await tx.query(`WITH RECURSIVE tree AS (SELECT * FROM workspace_nodes WHERE workspace_id=$1 AND id=$2 UNION ALL SELECT n.* FROM workspace_nodes n JOIN tree t ON n.parent_id=t.id WHERE n.workspace_id=$1) SELECT id,name,kind,version,archived FROM tree ORDER BY id LIMIT 1001`,[w,node.id])).rows;
  if(nodes.length>1000)fail(400,'archive_limit','Archive smaller folders first');
  for(const n of nodes)await this.nodeAccess(tx,a,w,n.id);
  const ids=nodes.map(n=>n.id),components=[];
  for(const c of (await tx.query('SELECT id FROM workspace_components WHERE workspace_id=$1 AND project_id=ANY($2::uuid[]) ORDER BY id',[w,ids])).rows){const v=await this.component(tx,a,w,c.id);components.push({id:v.id,name:v.name,version:v.version,execution:v.execution});}
  const scopes=(await tx.query('SELECT id,version,user_id FROM maintenance_scopes WHERE workspace_id=$1 AND project_id=ANY($2::uuid[]) AND revoked_at IS NULL ORDER BY id',[w,ids])).rows;
  const schedules=(await tx.query("SELECT id,revision_id,component_context FROM foundation_schedules WHERE workspace_id=$1 AND component_context->>'id'=ANY($2::text[]) AND NOT paused ORDER BY id",[w,components.map(c=>c.id)])).rows;
  return {nodeId:node.id,name:node.name,archived:op.archived,nodes,components,scopes,schedules,consequence:op.archived?'Retain all source and shared data. Revoke task scopes, clear component function bindings, pause attached schedules. Independently invoked workspace functions are unchanged.':'Restore organization access only. Old task scopes, function bindings and schedules are not reactivated.'};
 }
 private async componentCopy(tx:Connection,a:Actor,w:string,op:Extract<WorkspaceOperation,{kind:'copy_component'}>){
  const source=await this.component(tx,a,w,op.sourceComponentId);
  if(source.version!==op.expectedVersion)fail(409,'stale_version','Source component changed; prepare a new copy');
  if(source.format==='trialy-ui')fail(400,'legacy_format','Create frontend-js code instead of copying the legacy renderer');
  const project=(await this.activeNode(tx,a,w,op.projectId))[0];if(project.kind!=='project')fail(400,'project_required','Choose a project');
  const keep=await this.moveRestrictions(tx,a,w,source.project_id,source);
  return {name:op.name,format:source.format,source:source.source,bindings:source.bindings,execution:[],allowed_users:keep.users,ai_enabled:keep.ai,archived:false,copiedFrom:{componentId:source.id,version:source.version}};
 }
 private async crossTableReview(tx:Connection,a:Actor,w:string,op:Extract<WorkspaceOperation,{kind:'link_cross_table_identity'|'unlink_cross_table_identity'}>){
  const old=op.kind==='unlink_cross_table_identity'?(await tx.query('SELECT * FROM cross_table_links WHERE id=$1 AND workspace_id=$2',[op.linkId,w])).rows[0]:null;
  if(op.kind==='unlink_cross_table_identity'&&(!old||old.revoked_at||old.version!==op.expectedVersion))fail(409,'stale_version','Cross-table link changed');
  const source=await this.record(tx,a,w,old?.source_record_id??(op as any).sourceRecordId,true,true),preferred=await this.record(tx,a,w,old?.preferred_record_id??(op as any).preferredRecordId,true,true);
  const pairs=op.kind==='link_cross_table_identity'?op.fieldPairs:old.field_pairs;
  const schemaStamp=checksum(J([source.type_id,source.fields,preferred.type_id,preferred.fields]));
  if(op.kind==='link_cross_table_identity'){
   if(source.type_id===preferred.type_id)fail(400,'identity_type','Use same-table identity links for records of the same type');
   if(source.version!==op.sourceVersion||preferred.version!==op.preferredVersion)fail(409,'stale_version','Cross-table source changed');
   if([source,preferred].some(r=>r.state==='archived'||r.state==='superseded'))fail(409,'inactive_record','Choose active records');
   if(new Set(pairs.map((v:any)=>v.sourceField)).size!==pairs.length||new Set(pairs.map((v:any)=>v.preferredField)).size!==pairs.length)fail(400,'mapping_duplicate','Map each field at most once');
   for(const pair of pairs){const s=source.fields.find((f:any)=>f.key===pair.sourceField),t=preferred.fields.find((f:any)=>f.key===pair.preferredField);
    if(!s||!t||s.kind!==t.kind||s.formula||t.formula||s.targetTypeId!==t.targetTypeId)fail(400,'mapping_fields','Choose compatible visible fields; computed fields and relationship retargeting are not supported');
   }
   if((await tx.query('SELECT id FROM cross_table_links WHERE workspace_id=$1 AND revoked_at IS NULL AND ((source_record_id=$2 AND preferred_record_id=$3) OR (source_record_id=$3 AND preferred_record_id=$2))',[w,source.id,preferred.id])).rows.length)fail(409,'identity_conflict','These records already have an active cross-table link');
  }
  return {source:{id:source.id,typeId:source.type_id,version:source.version,data:source.data},preferred:{id:preferred.id,typeId:preferred.type_id,version:preferred.version,data:preferred.data},fieldPairs:pairs,schemaStamp,effect:op.kind==='link_cross_table_identity'?'Record a direct identity claim and field correspondence; preserve both records and every value':'Withdraw this identity claim; preserve both records and history'};
 }
 async crossTableLinks(a:Actor,w:string,recordId:string,offset=0){
  await this.record(this.db,a,w,recordId,false,true);
  const rows=(await this.db.query('SELECT * FROM cross_table_links WHERE workspace_id=$1 AND (source_record_id=$2 OR preferred_record_id=$2) ORDER BY created_at,id LIMIT 101 OFFSET $3',[w,recordId,offset])).rows,links=[];
  for(const link of rows.slice(0,100)){
   let source:any,preferred:any;
   try{source=await this.record(this.db,a,w,link.source_record_id,false,true);preferred=await this.record(this.db,a,w,link.preferred_record_id,false,true);}catch(e){if([403,404].includes((e as any).status))continue;throw e;}
   const schemaChanged=link.schema_stamp!==checksum(J([source.type_id,source.fields,preferred.type_id,preferred.fields]));
   links.push({...link,schemaChanged,source:{id:source.id,typeId:source.type_id,version:source.version,data:source.data},preferred:{id:preferred.id,typeId:preferred.type_id,version:preferred.version,data:preferred.data},comparisons:schemaChanged?[]:link.field_pairs.map((pair:any)=>({...pair,sourcePresent:Object.hasOwn(source.data,pair.sourceField),preferredPresent:Object.hasOwn(preferred.data,pair.preferredField),sourceValue:source.data[pair.sourceField]??null,preferredValue:preferred.data[pair.preferredField]??null,conflict:J(source.data[pair.sourceField])!==J(preferred.data[pair.preferredField])}))});
  }
  return {recordId,links,nextOffset:rows.length>100?offset+100:null,interpretation:'Direct reviewed identity claims only. No transitive merge, value propagation, permission grant or relationship/action retargeting. Changed schemas require a new mapping review.'};
 }
 private async validate(tx:Connection,a:Actor,w:string,op:WorkspaceOperation){
  await this.policy(tx,a,w,true);
  if(op.kind==='link_cross_table_identity'||op.kind==='unlink_cross_table_identity')await this.crossTableReview(tx,a,w,op);
  if(['record_fact','prefer_record_fact','retract_record_fact'].includes(op.kind))await this.factReview(tx,a,w,op as Extract<WorkspaceOperation,{kind:'record_fact'|'prefer_record_fact'|'retract_record_fact'}>);
  if(op.kind==='link_project_records'||op.kind==='unlink_project_record')await this.projectLinksReview(tx,a,w,op);
  if(op.kind==='archive_node')await this.nodeArchive(tx,a,w,op);
  if(op.kind==='copy_component')await this.componentCopy(tx,a,w,op);
  if(op.kind==='apply_maintenance'){const scope=await this.scope(tx,a,w,op.batch.scopeId);if(scope.revoked_at||scope.version!==op.batch.expectedScopeVersion)fail(409,'scope_changed','Maintenance scope changed');if(scope.schema_stamp!==await this.scopeStamp(tx,{...a,origin:'ai'},w,maintenanceSchema.parse(scope.body)))fail(409,'schema_changed','Scope requires renewed review');}
  if(op.kind==='create_node'){await this.parent(tx,w,op.parentId);if(op.parentId)await this.activeNode(tx,a,w,op.parentId);}
  if(op.kind==='move_node'||op.kind==='rename_node'){const n=(await this.activeNode(tx,a,w,op.nodeId))[0];if(n.version!==op.expectedVersion)fail(409,'stale_version','Project or folder changed');if(op.kind==='move_node'){await this.parent(tx,w,op.parentId,op.nodeId);if(op.parentId)await this.activeNode(tx,a,w,op.parentId);}}
  if(op.kind==='save_component'||op.kind==='move_component'||op.kind==='archive_component'||op.kind==='restore_component'){
   await this.componentSourcePolicy(tx,a,w);
   if(op.kind==='save_component'||op.kind==='move_component'){const project=(await this.activeNode(tx,a,w,op.projectId))[0];if(project.kind!=='project')fail(400,'project_required','Choose a project');}
   if(op.componentId){const c=await this.component(tx,a,w,op.componentId);if(c.project_archived)fail(409,'project_archived','Restore the project before editing components');if(c.version!==op.expectedVersion)fail(409,'stale_version','Component changed');}
   else if(op.kind==='save_component'&&op.expectedVersion!==undefined)fail(400,'invalid_version','New components have no expected version');
   if(op.kind==='save_component'){
    if(op.content.format==='trialy-ui'){if(!op.componentId||(await this.component(tx,a,w,op.componentId)).format!=='trialy-ui')fail(400,'legacy_format','Save ChatGPT-written code using frontend-js; trialy-ui is retained only for existing items');this.parseInterface(op.content);}
    if(op.componentId&&(await this.component(tx,a,w,op.componentId)).project_id!==op.projectId)fail(400,'move_required','Use the explicit move operation to change project');
    await this.componentBindings(tx,a,w,op.content.bindings);
    if(new Set(op.content.execution.map(e=>e.name)).size!==op.content.execution.length)fail(400,'duplicate_binding','Function binding names must be unique');
    const foundation=new Foundation(adapter(tx));
    for(const e of op.content.execution){const r=await foundation.revision(a,w,e.revisionId);for(const typeId of r.body.scope.typeIds){const {type,policy}=await typeAccess(tx,{...a,origin:'ai'},w,typeId);const binding=op.content.bindings.find(b=>b.typeId===typeId);if(!binding||visibleFields(type.fields,policy,{...a,origin:'ai'}).some(f=>!binding.fields.includes(f.key)))fail(403,'function_binding','Function execution needs explicit bindings for every readable field of its declared tables');}if(e.grantId){const g=(await foundation.grants(a,w)).find(g=>g.id===e.grantId);if(!g||g.authorization_version!==1||g.revoked_at||new Date(g.expires_at).getTime()<=Date.now()||g.revision_id!==e.revisionId)fail(403,'grant_unavailable','Choose a current permission for this function revision');}}

    if(op.content.format==='json'){try{JSON.parse(op.content.source);}catch{fail(400,'invalid_json','Component source must be valid JSON');}}
   }
   if(op.kind==='restore_component'){const old=await this.componentRevision(tx,w,op.componentId,op.revisionVersion);await this.nodeAccess(tx,a,w,old.project_id);await this.componentBindings(tx,a,w,old.bindings);}
  }
  if(op.kind==='apply_component_records'){
   const c=await this.component(tx,a,w,op.componentId);if(c.archived||c.project_archived||c.format!=='frontend-js'||c.version!==op.expectedVersion)fail(409,'component_changed','Interface changed');
   for(const change of op.changes){
    const record=change.kind==='update_record'?await this.record(tx,a,w,change.recordId,true):null;
    if(record&&change.kind==='update_record'&&record.version!==change.expectedVersion)fail(409,'stale_version','Record changed');
    const typeId=change.kind==='create_record'?change.typeId:record!.type_id;
    const binding=c.bindings.find((b:any)=>b.typeId===typeId);const {type,policy}=await typeAccess(tx,a,w,typeId,true);const fields=visibleFields(type.fields,policy,a);
    if(!binding||Object.keys(change.data).some(k=>!binding.fields.includes(k)||!fields.some(f=>f.key===k&&!f.formula)))fail(403,'binding_required','Write exceeds component data bindings');
   }
  }
  if(op.kind==='edit_component_record'){
   const c=await this.component(tx,a,w,op.componentId);if(c.archived||c.project_archived||c.version!==op.expectedVersion||c.format!=='trialy-ui')fail(409,'component_changed','Interface changed');
   const record=await this.record(tx,a,w,op.recordId,true);if(record.version!==op.recordVersion)fail(409,'stale_version','Record changed');
   const spec=this.parseInterface(c);if(!spec.blocks.some(b=>b.kind==='table'&&b.editable&&b.typeId===record.type_id&&b.fields.includes(op.field))||!record.fields.some((f:any)=>f.key===op.field&&!f.formula))fail(403,'field_scope','This field is not editable in this interface');
  }
  if(op.kind==='set_project_access'||op.kind==='set_component_access'){
   const p=await this.policy(tx,a,w,true);if(p.role!=='owner')fail(403,'owner_required','Only the workspace owner may change sharing');
   const target=op.kind==='set_project_access'?await this.node(tx,w,op.nodeId):(await tx.query('SELECT * FROM workspace_components WHERE id=$1 AND workspace_id=$2',[op.componentId,w])).rows[0];
   if(!target||target.version!==op.expectedVersion)fail(409,'stale_version','Sharing target changed');
   const members=(await tx.query('SELECT user_id FROM memberships WHERE tenant_id=$1',[p.tenant_id])).rows;
   if(op.allowedUsers?.some(id=>!members.some(m=>m.user_id===id)))fail(400,'invalid_user','Choose existing organization members');
  }
  if(op.kind==='save_scope'){
   if(op.scope.autoWrite&&Date.parse(op.scope.expiresAt!)<=Date.now())fail(400,'grant_expired','Choose a future expiry');
   await this.scopeStamp(tx,{...a,origin:'ai'},w,op.scope);
   if(op.scopeId){const old=await this.scope(tx,a,w,op.scopeId);if(old.version!==op.expectedVersion)fail(409,'stale_version','Maintenance scope changed');}
  }
  if(op.kind==='link_identity'){
   const s=await this.record(tx,a,w,op.sourceRecordId,true,true),t=await this.record(tx,a,w,op.preferredRecordId,true,true);
   if(s.id===t.id||s.type_id!==t.type_id)fail(400,'identity_type','Link distinct records of the same type');
   if(s.version!==op.sourceVersion||t.version!==op.preferredVersion)fail(409,'stale_version','Identity source changed');
   // Keep explicit stars, never silently create chains/transitive merges.
   const conflict=await tx.query('SELECT id FROM identity_links WHERE workspace_id=$1 AND revoked_at IS NULL AND (source_record_id=$2 OR source_record_id=$3 OR preferred_record_id=$2)',[w,s.id,t.id]);
   if(conflict.rows.length)fail(409,'identity_conflict','Review existing identity links before changing the preferred record');
  }
  if(op.kind==='unlink_identity'){const l=(await tx.query('SELECT * FROM identity_links WHERE id=$1 AND workspace_id=$2',[op.linkId,w])).rows[0];if(!l||l.revoked_at||l.version!==op.expectedVersion)fail(409,'stale_version','Identity link changed');await this.record(tx,a,w,l.source_record_id,true,true);await this.record(tx,a,w,l.preferred_record_id,true,true);}
 }
 private async accessStamp(tx:Connection,w:string){return checksum(J((await tx.query('SELECT id,allowed_users,ai_enabled,parent_id,archived FROM workspace_nodes WHERE workspace_id=$1 ORDER BY id',[w])).rows)+J((await tx.query('SELECT id,allowed_users,ai_enabled,project_id FROM workspace_components WHERE workspace_id=$1 ORDER BY id',[w])).rows));}
 async previewFieldChanges(a:Actor,w:string,body:WorkspaceOperation){
  const service=new Service(this.db);
  if(body.kind==='prefer_record_fact'){const review=await this.factReview(this.db,a,w,body);return service.fieldDiff(this.db,a,w,{kind:'update_record',recordId:review.recordId,expectedVersion:body.expectedVersion,data:{[review.field]:review.value},reason:body.reason});}
  if(body.kind==='apply_component_records'||body.kind==='apply_maintenance')return service.fieldDiff(this.db,a,w,{kind:'bulk_records',changes:body.kind==='apply_maintenance'?body.batch.changes:body.changes});
  if(body.kind==='edit_component_record')return service.fieldDiff(this.db,a,w,{kind:'update_record',recordId:body.recordId,expectedVersion:body.recordVersion,data:{[body.field]:body.value}});
  return [];
 }
 async preview(a:Actor,w:string,input:unknown){
  const body=workspaceOperation.parse(input);await this.validate(this.db,a,w,body);
  await this.db.query('DELETE FROM workspace_previews WHERE expires_at<now()');
  const n=Number((await this.db.query('SELECT count(*) AS n FROM workspace_previews WHERE user_id=$1',[a.userId])).rows[0].n);if(n>=50)fail(429,'preview_limit','Too many pending previews');
  const schemaStamp=body.kind==='save_scope'?await this.scopeStamp(this.db,{...a,origin:'ai'},w,body.scope):null;
  const fieldChanges=await this.previewFieldChanges(a,w,body);const accessStamp=await this.accessStamp(this.db,w);const factReview=['record_fact','prefer_record_fact','retract_record_fact'].includes(body.kind)?await this.factReview(this.db,a,w,body as Extract<WorkspaceOperation,{kind:'record_fact'|'prefer_record_fact'|'retract_record_fact'}>):undefined;const projectLinks=body.kind==='link_project_records'||body.kind==='unlink_project_record'?await this.projectLinksReview(this.db,a,w,body):undefined;const projectArchive=body.kind==='archive_node'?await this.nodeArchive(this.db,a,w,body):undefined;const componentCopy=body.kind==='copy_component'?await this.componentCopy(this.db,a,w,body):undefined;const crossTableReview=body.kind==='link_cross_table_identity'||body.kind==='unlink_cross_table_identity'?await this.crossTableReview(this.db,a,w,body):undefined;const envelope={crossTableReview,operation:body,schemaStamp,accessStamp,fieldChanges,componentCopy,projectArchive,projectLinks,factReview};const draft={id:randomUUID(),workspaceId:w,workspaceFoundation:true,temporary:true,body,crossTableReview,fieldChanges,componentCopy,projectArchive,projectLinks,factReview,digest:checksum(J(envelope))};
  await this.db.query('INSERT INTO workspace_previews(id,workspace_id,user_id,body,digest) VALUES($1,$2,$3,$4,$5)',[draft.id,w,a.userId,J(envelope),draft.digest]);return draft;
 }
 async pending(a:Actor,w:string){await this.policy(this.db,a,w);const rows=(await this.db.query('SELECT * FROM workspace_previews WHERE workspace_id=$1 AND user_id=$2 AND expires_at>now() ORDER BY expires_at',[w,a.userId])).rows;const visible=[];for(const r of rows){try{await this.validate(this.db,a,w,r.body.operation);if((r.body.operation.kind==='link_cross_table_identity'||r.body.operation.kind==='unlink_cross_table_identity')&&!(await this.db.query('SELECT $1::jsonb=$2::jsonb AS same',[J(r.body.crossTableReview),J(await this.crossTableReview(this.db,a,w,r.body.operation))])).rows[0].same)continue;visible.push({id:r.id,workspaceId:w,workspaceFoundation:true,body:r.body.operation,crossTableReview:r.body.crossTableReview,componentCopy:r.body.componentCopy,projectArchive:r.body.projectArchive,projectLinks:r.body.projectLinks,factReview:r.body.factReview,fieldChanges:r.body.fieldChanges??[],digest:r.digest,expiresAt:r.expires_at});}catch{}}return visible;}
 async discard(a:Actor,w:string,id:string){await this.policy(this.db,a,w);await this.db.query('DELETE FROM workspace_previews WHERE id=$1 AND workspace_id=$2 AND user_id=$3',[id,w,a.userId]);return {discarded:true};}
 private async replay(tx:Connection,a:Actor,w:string,id:string,digest:string){const r=(await tx.query('SELECT * FROM workspace_receipts WHERE id=$1',[id])).rows[0];if(r){if(r.user_id!==a.userId||r.workspace_id!==w||r.digest!==digest)fail(409,'receipt_conflict','Request does not match its saved receipt');return r.result;}}
 async confirm(a:Actor,w:string,id:string,digest:string){requireHuman(a);return this.db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await this.policy(tx,a,w,true);const prior=await this.replay(tx,a,w,id,digest);if(prior)return prior;
  const draft=(await tx.query('SELECT * FROM workspace_previews WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND expires_at>now()',[id,w,a.userId])).rows[0];if(!draft||draft.digest!==digest)fail(409,'preview_expired','Preview unavailable');
  const op=workspaceOperation.parse(draft.body.operation);await this.validate(tx,a,w,op);
  if(draft.body.accessStamp!==await this.accessStamp(tx,w))fail(409,'access_changed','Project access or organization changed; prepare a new preview');
  if((op.kind==='link_cross_table_identity'||op.kind==='unlink_cross_table_identity')&&!(await tx.query('SELECT $1::jsonb=$2::jsonb AS same',[J(draft.body.crossTableReview),J(await this.crossTableReview(tx,a,w,op))])).rows[0].same)fail(409,'stale_version','Cross-table mapping or values changed; prepare again');
  if(op.kind==='save_scope'&&draft.body.schemaStamp!==await this.scopeStamp(tx,{...a,origin:'ai'},w,op.scope))fail(409,'schema_changed','Schema changed; prepare scope again');
  if(draft.body.fieldChanges&&!(await tx.query('SELECT $1::jsonb=$2::jsonb AS same',[J(draft.body.fieldChanges),J(await new WorkspaceFoundation(adapter(tx)).previewFieldChanges(a,w,op))])).rows[0].same)fail(409,'stale_version','Field changes differ; prepare again');
  if(['record_fact','prefer_record_fact','retract_record_fact'].includes(op.kind)&&!(await tx.query('SELECT $1::jsonb=$2::jsonb AS same',[J(draft.body.factReview),J(await this.factReview(tx,a,w,op as Extract<WorkspaceOperation,{kind:'record_fact'|'prefer_record_fact'|'retract_record_fact'}>))])).rows[0].same)fail(409,'stale_version','Fact or current value changed; prepare again');
  if((op.kind==='link_project_records'||op.kind==='unlink_project_record')&&!(await tx.query('SELECT $1::jsonb=$2::jsonb AS same',[J(draft.body.projectLinks),J(await this.projectLinksReview(tx,a,w,op))])).rows[0].same)fail(409,'stale_version','Linked records changed; prepare again');
  if(op.kind==='archive_node'&&!(await tx.query('SELECT $1::jsonb=$2::jsonb AS same',[J(draft.body.projectArchive),J(await this.nodeArchive(tx,a,w,op))])).rows[0].same)fail(409,'stale_version','Project contents changed; prepare archival again');
  if(op.kind==='copy_component'&&!(await tx.query('SELECT $1::jsonb=$2::jsonb AS same',[J(draft.body.componentCopy),J(await this.componentCopy(tx,a,w,op))])).rows[0].same)fail(409,'stale_version','Copy contents changed; prepare again');
  const result=await this.apply(tx,a,w,p,op,{kind:'approval',id,digest,context:'workspace_preview'});await tx.query('INSERT INTO workspace_receipts(id,workspace_id,user_id,digest,result) VALUES($1,$2,$3,$4,$5)',[id,w,a.userId,digest,J(result)]);await tx.query('DELETE FROM workspace_previews WHERE id=$1',[id]);return result;
 });}
 private async apply(tx:Connection,a:Actor,w:string,p:any,op:WorkspaceOperation,authorization?:WriteAuthorization):Promise<any>{
  if(op.kind==='link_cross_table_identity'||op.kind==='unlink_cross_table_identity'){
   const review=await this.crossTableReview(tx,a,w,op),linkId=op.kind==='unlink_cross_table_identity'?op.linkId:randomUUID(),version=op.kind==='unlink_cross_table_identity'?op.expectedVersion+1:0;
   if(op.kind==='link_cross_table_identity')await tx.query('INSERT INTO cross_table_links(id,workspace_id,source_record_id,preferred_record_id,field_pairs,schema_stamp,rationale,created_by,"authorization") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[linkId,w,review.source.id,review.preferred.id,J(op.fieldPairs),review.schemaStamp,op.rationale,a.userId,J(authorization)]);
   else await tx.query('UPDATE cross_table_links SET revoked_at=now(),version=version+1,revoked_by=$2,revocation_reason=$3,revocation_authorization=$4 WHERE id=$1',[linkId,a.userId,op.reason,J(authorization)]);
   const snapshot={...review,version,active:op.kind==='link_cross_table_identity',authorization};
   await revision(tx,a,w,linkId,'cross_table_link',version,snapshot);await audit(tx,a,p,'workspace.'+op.kind,linkId,null,snapshot,op.kind==='link_cross_table_identity'?op.rationale:op.reason);
   return {workspaceId:w,workspaceFoundation:true,status:'saved',id:linkId,version};
  }
  if(op.kind==='apply_maintenance')return new WorkspaceFoundation(adapter(tx)).maintain(a,w,op.batch,authorization);
  if(op.kind==='apply_component_records'){
   const service=new Service(adapter(tx));const draft=await service.preview(a,w,{kind:'bulk_records',changes:op.changes});const saved=await service.commit(a,draft.id,draft.digest,authorization);
   await audit(tx,a,p,'component.records_applied',op.componentId,null,{componentVersion:op.expectedVersion,records:saved.objects});
   return {workspaceId:w,workspaceFoundation:true,status:'saved',id:op.componentId,receipt:saved};
  }
  if(op.kind==='edit_component_record'){
   const service=new Service(adapter(tx));const draft=await service.preview(a,w,{kind:'update_record',recordId:op.recordId,expectedVersion:op.recordVersion,data:{[op.field]:op.value}});
   const saved=await service.commit(a,draft.id,draft.digest,authorization);return {workspaceId:w,workspaceFoundation:true,status:'saved',id:op.componentId,recordId:op.recordId,receipt:saved};
  }
  if(op.kind==='record_fact'||op.kind==='prefer_record_fact'||op.kind==='retract_record_fact'){
   const review=await this.factReview(tx,a,w,op),factId=op.kind==='record_fact'?randomUUID():op.factId;
   if(op.kind==='record_fact')await tx.query('INSERT INTO record_facts(id,workspace_id,record_id,type_id,field_key,value,project_id,valid_from,valid_until,source_label,rationale,record_version,actor_id,"authorization") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',[factId,w,review.recordId,review.typeId,review.field,J(op.value),op.projectId??null,op.validFrom??null,op.validUntil??null,op.sourceLabel,op.rationale,review.recordVersion,a.userId,J(authorization)]);
   else if(op.kind==='retract_record_fact')await tx.query('INSERT INTO record_fact_retractions(fact_id,workspace_id,actor_id,reason,"authorization") VALUES($1,$2,$3,$4,$5)',[factId,w,a.userId,op.reason,J(authorization)]);
   else {const service=new Service(adapter(tx)),draft=await service.preview(a,w,{kind:'update_record',recordId:review.recordId,expectedVersion:op.expectedVersion,data:{[review.field]:review.value},reason:op.reason});await service.commit(a,draft.id,draft.digest,authorization);}
   await audit(tx,a,p,'workspace.'+op.kind,factId,null,{...review,authorization},op.kind==='record_fact'?op.rationale:op.reason);
   return {workspaceId:w,workspaceFoundation:true,status:'saved',id:factId,recordId:review.recordId};
  }
  if(op.kind==='link_project_records'||op.kind==='unlink_project_record'){
   const review=await this.projectLinksReview(tx,a,w,op),links=[];
   for(const record of review.records){const linkId=op.kind==='unlink_project_record'?op.linkId:randomUUID(),version=op.kind==='unlink_project_record'?op.expectedVersion+1:0;
    if(op.kind==='unlink_project_record')await tx.query('UPDATE project_records SET revoked_at=now(),version=version+1 WHERE id=$1',[linkId]);
    else await tx.query('INSERT INTO project_records(id,workspace_id,project_id,record_id,created_by,reason) VALUES($1,$2,$3,$4,$5,$6)',[linkId,w,review.projectId,record.id,a.userId,op.reason]);
    const snapshot={projectId:review.projectId,recordId:record.id,version,active:op.kind==='link_project_records',authorization};
    await revision(tx,a,w,linkId,'project_record',version,snapshot);await audit(tx,a,p,'workspace.'+op.kind,linkId,null,snapshot,op.reason);links.push({id:linkId,recordId:record.id,version});
   }return {workspaceId:w,workspaceFoundation:true,status:'saved',projectId:review.projectId,links};
  }
  let objectId:string=randomUUID(),version=0,before:any=null,after:any;
  if(op.kind==='archive_node'){
   const review=await this.nodeArchive(tx,a,w,op);objectId=op.nodeId;before=await this.node(tx,w,objectId);version=before.version+1;after={...before,archived:op.archived,version,authorization};
   await tx.query('UPDATE workspace_nodes SET archived=$1,version=$2 WHERE id=$3',[op.archived,version,objectId]);
   if(op.archived){
    for(const c of review.components){const prior=(await tx.query('SELECT * FROM workspace_components WHERE id=$1',[c.id])).rows[0];const next={...prior,execution:[],version:prior.version+1};await tx.query("UPDATE workspace_components SET execution='[]'::jsonb,version=version+1 WHERE id=$1",[c.id]);await revision(tx,a,w,c.id,'workspace_component',next.version,next);await audit(tx,a,p,'component.project_archived',c.id,{version:prior.version,execution:prior.execution},{version:next.version,execution:[],projectArchive:objectId,authorization},op.reason);}
    for(const scope of review.scopes){const prior=(await tx.query('SELECT * FROM maintenance_scopes WHERE id=$1',[scope.id])).rows[0];await revision(tx,a,w,scope.id,'maintenance_scope',scope.version+1,{...prior,revoked:true});await tx.query('UPDATE maintenance_scopes SET revoked_at=now(),version=version+1 WHERE id=$1',[scope.id]);await audit(tx,a,p,'scope.project_archived',scope.id,{version:scope.version},{revoked:true,version:scope.version+1,projectArchive:objectId,authorization},op.reason);}
    for(const schedule of review.schedules){await tx.query('UPDATE foundation_schedules SET paused=true WHERE id=$1',[schedule.id]);await audit(tx,a,p,'schedule.project_archived',schedule.id,{paused:false},{paused:true,projectArchive:objectId,authorization},op.reason);}
   }
  }
  else if(op.kind==='create_node'){after={id:objectId,kind:op.nodeKind,name:op.name,parent_id:op.parentId,version};await tx.query('INSERT INTO workspace_nodes(id,workspace_id,kind,name,parent_id) VALUES($1,$2,$3,$4,$5)',[objectId,w,op.nodeKind,op.name,op.parentId]);}
  else if(op.kind==='copy_component'){
   const content=await this.componentCopy(tx,a,w,op);after={...content,id:objectId,workspace_id:w,project_id:op.projectId,version};
   await tx.query('INSERT INTO workspace_components(id,workspace_id,project_id,name,format,source,bindings,created_by,execution,allowed_users,ai_enabled) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[objectId,w,op.projectId,content.name,content.format,content.source,J(content.bindings),a.userId,J([]),content.allowed_users===null?null:J(content.allowed_users),content.ai_enabled]);
  }
  else if(op.kind==='set_project_access'||op.kind==='set_component_access'){
   const table=op.kind==='set_project_access'?'workspace_nodes':'workspace_components';objectId=op.kind==='set_project_access'?op.nodeId:op.componentId;
   before=(await tx.query(`SELECT * FROM ${table} WHERE id=$1 AND workspace_id=$2`,[objectId,w])).rows[0];version=before.version+1;after={...before,allowed_users:op.allowedUsers,ai_enabled:op.ai,version};
   await tx.query(`UPDATE ${table} SET allowed_users=$1,ai_enabled=$2,version=$3 WHERE id=$4`,[op.allowedUsers===null?null:J(op.allowedUsers),op.ai,version,objectId]);
  }
  else if(op.kind==='move_node'||op.kind==='rename_node'){objectId=op.nodeId;before=await this.node(tx,w,objectId);version=before.version+1;after={...before,version,...(op.kind==='move_node'?{parent_id:op.parentId}:{name:op.name})};const keep=op.kind==='move_node'?await this.moveRestrictions(tx,a,w,objectId,before):{users:before.allowed_users,ai:before.ai_enabled};after={...after,allowed_users:keep.users,ai_enabled:keep.ai};await tx.query('UPDATE workspace_nodes SET name=$1,parent_id=$2,version=$3,allowed_users=$5,ai_enabled=$6 WHERE id=$4',[after.name,after.parent_id,version,objectId,keep.users===null?null:J(keep.users),keep.ai]);}
  else if(op.kind==='save_component'||op.kind==='move_component'||op.kind==='archive_component'||op.kind==='restore_component'){
   if(op.componentId){objectId=op.componentId;before=await this.component(tx,a,w,objectId);version=before.version+1;}
   if(op.kind==='save_component')after={...before,id:objectId,workspace_id:w,project_id:op.projectId,...op.content,version,archived:before?.archived??false};
   else if(op.kind==='move_component'){const keep=await this.moveRestrictions(tx,a,w,before.project_id,before);after={...before,project_id:op.projectId,version,allowed_users:keep.users,ai_enabled:keep.ai};}
   else if(op.kind==='archive_component')after={...before,archived:op.archived,version};
   else {const old=await this.componentRevision(tx,w,objectId,op.revisionVersion);after={...before,name:old.name,format:old.format,source:old.source,bindings:old.bindings,execution:[],version};}
   if(before)await tx.query('UPDATE workspace_components SET project_id=$1,name=$2,format=$3,source=$4,bindings=$5,version=$6,archived=$7,allowed_users=$9,ai_enabled=$10,execution=$11 WHERE id=$8',[after.project_id,after.name,after.format,after.source,J(after.bindings),version,after.archived,objectId,after.allowed_users==null?null:J(after.allowed_users),after.ai_enabled??true,J(after.execution??[])]);
   else await tx.query('INSERT INTO workspace_components(id,workspace_id,project_id,name,format,source,bindings,created_by,execution) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[objectId,w,after.project_id,after.name,after.format,after.source,J(after.bindings),a.userId,J(after.execution??[])]);
  }
  else if(op.kind==='save_scope'){
   const stamp=await this.scopeStamp(tx,{...a,origin:'ai'},w,op.scope);
   if(op.scopeId){objectId=op.scopeId;before=await this.scope(tx,a,w,objectId);version=before.version+1;await tx.query('UPDATE maintenance_scopes SET project_id=$1,body=$2,schema_stamp=$3,version=$4,revoked_at=NULL WHERE id=$5',[op.scope.projectId,J(op.scope),stamp,version,objectId]);}
   else await tx.query('INSERT INTO maintenance_scopes(id,workspace_id,user_id,project_id,body,schema_stamp) VALUES($1,$2,$3,$4,$5,$6)',[objectId,w,a.userId,op.scope.projectId,J(op.scope),stamp]);
   after={id:objectId,body:op.scope,version,schemaStamp:stamp};
  }else if(op.kind==='link_identity'){
   after={id:objectId,...op,version};await tx.query('INSERT INTO identity_links(id,workspace_id,source_record_id,preferred_record_id,rationale,created_by) VALUES($1,$2,$3,$4,$5,$6)',[objectId,w,op.sourceRecordId,op.preferredRecordId,op.rationale,a.userId]);
  }else {objectId=op.linkId;before=(await tx.query('SELECT * FROM identity_links WHERE id=$1',[objectId])).rows[0];version=before.version+1;await tx.query('UPDATE identity_links SET revoked_at=now(),version=$1 WHERE id=$2',[version,objectId]);after={id:objectId,revoked:true,reason:op.reason,version};}
  await revision(tx,a,w,objectId,op.kind.includes('component')?'workspace_component':op.kind==='save_scope'?'maintenance_scope':op.kind.includes('identity')?'identity_link':'workspace_node',version,after);await audit(tx,a,p,'workspace.'+op.kind,objectId,before,after);
  return {workspaceId:w,workspaceFoundation:true,status:'saved',id:objectId,version};
 }
 async scope(tx:Connection,a:Actor,w:string,id:string){const s=(await tx.query('SELECT * FROM maintenance_scopes WHERE id=$1 AND workspace_id=$2 AND user_id=$3',[id,w,a.userId])).rows[0];if(!s)fail(404,'not_found','Maintenance scope not found');await this.nodeAccess(tx,a,w,s.project_id);return s;}
 async scopes(a:Actor,w:string){await this.policy(this.db,a,w);const rows=(await this.db.query('SELECT * FROM maintenance_scopes WHERE workspace_id=$1 AND user_id=$2 ORDER BY created_at',[w,a.userId])).rows;const result=[];for(const r of rows){try{const stamp=await this.scopeStamp(this.db,{...a,origin:'ai'},w,maintenanceSchema.parse(r.body),true);result.push({...r,schemaChanged:stamp!==r.schema_stamp});}catch{/* Do not expose inaccessible field names or scope text. */}}return result;}
 async revoke(a:Actor,w:string,id:string){return this.db.transaction(async tx=>{await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await this.policy(tx,a,w,true),before=await this.scope(tx,a,w,id);if(before.revoked_at)return {id,revoked:true};await tx.query('UPDATE maintenance_scopes SET revoked_at=now(),version=version+1 WHERE id=$1',[id]);await revision(tx,a,w,id,'maintenance_scope',before.version+1,{...before,revoked:true});await audit(tx,a,p,'maintenance.revoked',id,null,{revoked:true});return {id,revoked:true};});}
 async prepareBackfill(a:Actor,w:string,input:unknown){
  const batch=maintenanceBatch.parse(input);if(batch.links.length||batch.changes.some(c=>c.kind!=='update_record'))fail(400,'backfill_scope','Backfill fills approved fields on existing records; it does not create records or identity links');
  for(const change of batch.changes){if(change.kind!=='update_record')continue;const record=await this.record(this.db,a,w,change.recordId,true);for(const field of Object.keys(change.data)){if(record.data[field]!==undefined&&record.data[field]!==null&&record.data[field]!=='')fail(409,'existing_value','Backfill does not replace existing values; prepare an explicit correction');}}
  return this.maintain(a,w,batch,undefined,true);
 }
 async maintain(a:Actor,w:string,input:unknown,approval?:WriteAuthorization,previewOnly=false){
  const v=maintenanceBatch.parse(input),digest=checksum(J(v));const actor:Actor={...a,origin:'ai'};
  return this.db.transaction(async tx=>{
   await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await this.policy(tx,actor,w,true);
   const s=await this.scope(tx,actor,w,v.scopeId);const body=maintenanceSchema.parse(s.body);
   if(s.revoked_at||s.version!==v.expectedScopeVersion)fail(409,'scope_changed','Maintenance permission changed');
   if(s.schema_stamp!==await this.scopeStamp(tx,actor,w,body))fail(409,'schema_changed','Review maintenance scope for the changed schema');
   const prior=await this.replay(tx,actor,w,v.requestKey,digest);if(prior)return prior;
   if(v.changes.length+v.links.length>body.maxChanges)fail(400,'batch_limit','Batch exceeds approved limit');
   const service=new Service(adapter(tx));const ids:string[]=[];
   // Validate complete batch before saving; transaction also rolls back any later failure.
   for(const c of v.changes){const t=c.kind==='create_record'?c.typeId:(await this.record(tx,actor,w,c.recordId,true)).type_id;const b=body.bindings.find(b=>b.typeId===t);if(!b||Object.keys(c.data).some(k=>!b.fields.includes(k))||(c.kind==='create_record'?!body.allowCreate:!body.allowUpdate))fail(403,'maintenance_scope','Change exceeds approved fields or operations');}
   if(v.links.length&&!body.allowIdentityLinks)fail(403,'maintenance_scope','Identity links not authorized');
   for(const l of v.links){await this.validate(tx,actor,w,l);const r=await this.record(tx,actor,w,l.sourceRecordId);if(!body.bindings.some(b=>b.typeId===r.type_id))fail(403,'maintenance_scope','Identity outside scope');}
   if(v.changes.length)await service.validate(tx,actor,w,{kind:'bulk_records',changes:v.changes});
   const permitted=body.autoWrite&&body.bindings.length===1&&!!body.expiresAt&&Date.parse(body.expiresAt)>Date.now();
   if(!approval&&(previewOnly||!permitted)){
    const priorDraft=(await tx.query("SELECT * FROM workspace_previews WHERE workspace_id=$1 AND user_id=$2 AND body->'operation'->'batch'->>'requestKey'=$3 AND expires_at>now() LIMIT 1",[w,a.userId,v.requestKey])).rows[0];
    if(priorDraft){if(!(await tx.query("SELECT $1::jsonb=$2::jsonb AS same",[J(priorDraft.body.operation.batch),J(v)])).rows[0].same)fail(409,'request_conflict','Request already has a different pending proposal');return {workspaceId:w,workspaceFoundation:true,temporary:true,id:priorDraft.id,body:priorDraft.body.operation,fieldChanges:priorDraft.body.fieldChanges,digest:priorDraft.digest};}
    return new WorkspaceFoundation(adapter(tx)).preview(actor,w,{kind:'apply_maintenance',batch:v});
   }
   const authorization=approval??{kind:'maintenance_grant' as const,id:s.id,version:s.version,context:'type:'+body.bindings[0].typeId};
   if(v.changes.length){const draft=await service.preview(actor,w,{kind:'bulk_records',changes:v.changes});const receipt=await service.commit(actor,draft.id,draft.digest,authorization);ids.push(...receipt.objects.map((o:any)=>o.id));}
   const links=[];for(const l of v.links){await this.validate(tx,actor,w,l);links.push(await this.apply(tx,actor,w,p,l,authorization));}
   const result={workspaceId:w,workspaceFoundation:true,status:'saved',requestKey:v.requestKey,recordIds:ids,links};
   await tx.query('INSERT INTO workspace_receipts(id,workspace_id,user_id,digest,result) VALUES($1,$2,$3,$4,$5)',[v.requestKey,w,a.userId,digest,J(result)]);
   for(let i=0;i<v.changes.length;i++)await tx.query('INSERT INTO record_observations(id,workspace_id,record_id,scope_id,receipt_id,actor_id,data,source_label,interpretation) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[randomUUID(),w,ids[i],s.id,v.requestKey,a.userId,J(v.changes[i].data),v.sourceLabel,v.interpretation]);
   await audit(tx,actor,p,'maintenance.applied',s.id,null,{requestKey:v.requestKey,scopeVersion:s.version,recordIds:ids,sourceLabel:v.sourceLabel,interpretation:v.interpretation});return result;
  });
 }
 async identity(a:Actor,w:string,recordId:string,includeRelationships=true){
  const root=await this.record(this.db,a,w,recordId,false,true);
  const link=(await this.db.query('SELECT * FROM identity_links WHERE workspace_id=$1 AND source_record_id=$2 AND revoked_at IS NULL',[w,recordId])).rows[0];
  const preferred=link?await this.record(this.db,a,w,link.preferred_record_id,false,true):root;
  const aliases=(await this.db.query('SELECT * FROM identity_links WHERE workspace_id=$1 AND preferred_record_id=$2 AND revoked_at IS NULL ORDER BY id LIMIT 101',[w,preferred.id])).rows;
  if(aliases.length>100)fail(413,'identity_limit','Identity group exceeds the current 100-alias read limit');
  const originals=[preferred];for(const l of aliases)originals.push(await this.record(this.db,a,w,l.source_record_id,false,true));
  const fields=preferred.fields;const conflicts=fields.flatMap((field:any)=>{
   const values=originals.filter(r=>Object.hasOwn(r.data,field.key)).map(r=>({recordId:r.id,value:r.data[field.key]}));
   return new Set(values.map(v=>J(v.value))).size>1?[{field:field.key,values}]:[];
  });
  const observations=[];for(const r of originals){const e=await this.evidence(a,w,r.id);observations.push(...e.observations);}
  const relationships=[];
  if(includeRelationships){
   const service=new Service(this.db),types=await service.types(a,w),ids=originals.map(r=>r.id);
   for(const type of types){for(const field of type.fields.filter((f:any)=>f.kind==='relationship'&&f.targetTypeId===root.type_id)){
    if(relationships.length>=100)break;
    const rows=(await this.db.query('SELECT id FROM records WHERE workspace_id=$1 AND type_id=$2 AND data->>$3=ANY($4::text[]) ORDER BY id LIMIT $5',[w,type.id,field.key,ids,100-relationships.length])).rows;
    for(const row of rows){const r=await this.record(this.db,a,w,row.id);relationships.push({typeId:type.id,typeName:type.name,field:field.key,recordId:r.id,version:r.version,data:r.data});}
   }}
  }
  return {recordId,preferredRecordId:preferred.id,typeId:root.type_id,preferredValues:preferred.data,originals:originals.map(r=>({id:r.id,version:r.version,data:r.data})),links:aliases,conflicts,observations,relationships,relationshipsLimit:100,interpretation:'Preferred record is an accepted interpretation, not a destructive merge. Original facts and relationship destinations remain unchanged.'};
 }
 async candidates(a:Actor,w:string,typeIds:string[],query:string){
  const service=new Service(this.db),groups=[];
  for(const typeId of typeIds){const {type}=await typeAccess(this.db,a,w,typeId);const rows=await service.records(a,w,typeId,{q:query,limit:25});groups.push({typeId,typeName:type.name,candidates:rows.rows,total:rows.total});}
  return {groups,meaning:'Text candidates only; ChatGPT must assess semantic identity and propose any link for approval. Similar names are not proof.'};
 }
 async evidence(a:Actor,w:string,recordId:string){
  const record=await this.record(this.db,a,w,recordId,false,true);
  const links=(await this.db.query('SELECT * FROM identity_links WHERE workspace_id=$1 AND (source_record_id=$2 OR preferred_record_id=$2) ORDER BY created_at',[w,recordId])).rows;
  const safe=[];for(const l of links){try{await this.record(this.db,a,w,l.source_record_id,false,true);await this.record(this.db,a,w,l.preferred_record_id,false,true);safe.push(l);}catch{}}
  const observations=(await this.db.query('SELECT * FROM record_observations WHERE workspace_id=$1 AND record_id=$2 ORDER BY created_at DESC LIMIT 100',[w,recordId])).rows.filter(o=>Object.keys(o.data).every(k=>record.fields.some((f:any)=>f.key===k)));
  const allowed=[];for(const o of observations){try{if(o.scope_id){const scope=(await this.db.query('SELECT project_id FROM maintenance_scopes WHERE id=$1 AND workspace_id=$2',[o.scope_id,w])).rows[0];if(!scope)continue;await this.nodeAccess(this.db,a,w,scope.project_id);}allowed.push(o);}catch{}}
  return {recordId,links:safe,observations:allowed,historyAvailable:true};
 }
}
