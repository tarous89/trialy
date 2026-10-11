import {randomUUID} from 'node:crypto';
import type {Database,Connection} from '../db/database.js';
import {Service} from '../domain/service.js';
import {access,typeAccess,visibleFields,projectData} from '../domain/permissions.js';
import {audit,revision,checksum} from '../domain/evidence.js';
import {fail,type Actor} from '../shared/schema.js';
import {maintenanceSchema,maintenanceBatch,workspaceOperation,type WorkspaceOperation} from './schema.js';
const J=JSON.stringify;
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
 async nodes(a:Actor,w:string){await this.policy(this.db,a,w);return {workspaceId:w,workspaceFoundation:true,nodes:(await this.db.query('SELECT * FROM workspace_nodes WHERE workspace_id=$1 ORDER BY name,id',[w])).rows};}
 async component(tx:Connection,a:Actor,w:string,id:string){
  await this.componentSourcePolicy(tx,a,w);
  const c=(await tx.query('SELECT * FROM workspace_components WHERE id=$1 AND workspace_id=$2',[id,w])).rows[0];
  if(!c)fail(404,'not_found','Component not found');
  await this.componentBindings(tx,a,w,c.bindings);return c;
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
  await this.componentSourcePolicy(this.db,a,w);if(projectId)await this.node(this.db,w,projectId);
  const rows=(await this.db.query('SELECT * FROM workspace_components WHERE workspace_id=$1 ORDER BY name,id',[w])).rows;
  const result=[];for(const c of rows){if(projectId&&c.project_id!==projectId)continue;try{await this.componentBindings(this.db,a,w,c.bindings);const {source,...metadata}=c;result.push(metadata);}catch{}}
  return result;
 }
 async readComponent(a:Actor,w:string,id:string){return {workspaceId:w,workspaceFoundation:true,component:await this.component(this.db,a,w,id)};}
 async componentHistory(a:Actor,w:string,id:string){
  await this.component(this.db,a,w,id);
  const rows=(await this.db.query("SELECT * FROM revisions WHERE workspace_id=$1 AND object_id=$2 AND object_kind='workspace_component' ORDER BY version DESC",[w,id])).rows;
  const result=[];for(const r of rows){try{await this.componentBindings(this.db,a,w,r.snapshot.bindings);result.push(r);}catch{}}return result;
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
 private async scopeStamp(tx:Connection,a:Actor,w:string,body:ReturnType<typeof maintenanceSchema.parse>){
  const project=await this.node(tx,w,body.projectId);if(project.kind!=='project')fail(400,'project_required','Choose a project');
  const types=[];for(const b of body.bindings){const {type,policy}=await typeAccess(tx,a,w,b.typeId,true);const fields=visibleFields(type.fields,policy,a);if(new Set(b.fields).size!==b.fields.length||b.fields.some(k=>!fields.some(f=>f.key===k&&!f.formula)))fail(403,'field_scope','Scope includes unavailable or calculated fields');types.push({id:type.id,version:type.version,fields:type.fields});}
  return checksum(J(types));
 }
 private async validate(tx:Connection,a:Actor,w:string,op:WorkspaceOperation){
  await this.policy(tx,a,w,true);
  if(op.kind==='create_node')await this.parent(tx,w,op.parentId);
  if(op.kind==='move_node'||op.kind==='rename_node'){const n=await this.node(tx,w,op.nodeId);if(n.version!==op.expectedVersion)fail(409,'stale_version','Project or folder changed');if(op.kind==='move_node')await this.parent(tx,w,op.parentId,op.nodeId);}
  if(op.kind==='save_component'||op.kind==='move_component'||op.kind==='archive_component'||op.kind==='restore_component'){
   await this.componentSourcePolicy(tx,a,w);
   if(op.kind==='save_component'||op.kind==='move_component'){const project=await this.node(tx,w,op.projectId);if(project.kind!=='project')fail(400,'project_required','Choose a project');}
   if(op.componentId){const c=await this.component(tx,a,w,op.componentId);if(c.version!==op.expectedVersion)fail(409,'stale_version','Component changed');}
   else if(op.kind==='save_component'&&op.expectedVersion!==undefined)fail(400,'invalid_version','New components have no expected version');
   if(op.kind==='save_component'){
    await this.componentBindings(tx,a,w,op.content.bindings);
    if(op.content.format==='json'){try{JSON.parse(op.content.source);}catch{fail(400,'invalid_json','Component source must be valid JSON');}}
   }
   if(op.kind==='restore_component'){const old=await this.componentRevision(tx,w,op.componentId,op.revisionVersion);await this.componentBindings(tx,a,w,old.bindings);}
  }
  if(op.kind==='save_scope'){
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
 async preview(a:Actor,w:string,input:unknown){
  const body=workspaceOperation.parse(input);await this.validate(this.db,a,w,body);
  await this.db.query('DELETE FROM workspace_previews WHERE expires_at<now()');
  const n=Number((await this.db.query('SELECT count(*) AS n FROM workspace_previews WHERE user_id=$1',[a.userId])).rows[0].n);if(n>=50)fail(429,'preview_limit','Too many pending previews');
  const schemaStamp=body.kind==='save_scope'?await this.scopeStamp(this.db,{...a,origin:'ai'},w,body.scope):null;
  const envelope={operation:body,schemaStamp};const draft={id:randomUUID(),workspaceId:w,workspaceFoundation:true,temporary:true,body,digest:checksum(J(envelope))};
  await this.db.query('INSERT INTO workspace_previews(id,workspace_id,user_id,body,digest) VALUES($1,$2,$3,$4,$5)',[draft.id,w,a.userId,J(envelope),draft.digest]);return draft;
 }
 async pending(a:Actor,w:string){await this.policy(this.db,a,w);const rows=(await this.db.query('SELECT * FROM workspace_previews WHERE workspace_id=$1 AND user_id=$2 AND expires_at>now() ORDER BY expires_at',[w,a.userId])).rows;const visible=[];for(const r of rows){try{await this.validate(this.db,a,w,r.body.operation);visible.push({id:r.id,workspaceId:w,workspaceFoundation:true,body:r.body.operation,digest:r.digest,expiresAt:r.expires_at});}catch{}}return visible;}
 async discard(a:Actor,w:string,id:string){await this.policy(this.db,a,w);await this.db.query('DELETE FROM workspace_previews WHERE id=$1 AND workspace_id=$2 AND user_id=$3',[id,w,a.userId]);return {discarded:true};}
 private async replay(tx:Connection,a:Actor,w:string,id:string,digest:string){const r=(await tx.query('SELECT * FROM workspace_receipts WHERE id=$1',[id])).rows[0];if(r){if(r.user_id!==a.userId||r.workspace_id!==w||r.digest!==digest)fail(409,'receipt_conflict','Request does not match its saved receipt');return r.result;}}
 async confirm(a:Actor,w:string,id:string,digest:string){return this.db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await this.policy(tx,a,w,true);const prior=await this.replay(tx,a,w,id,digest);if(prior)return prior;
  const draft=(await tx.query('SELECT * FROM workspace_previews WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND expires_at>now()',[id,w,a.userId])).rows[0];if(!draft||draft.digest!==digest)fail(409,'preview_expired','Preview unavailable');
  const op=workspaceOperation.parse(draft.body.operation);await this.validate(tx,a,w,op);
  if(op.kind==='save_scope'&&draft.body.schemaStamp!==await this.scopeStamp(tx,{...a,origin:'ai'},w,op.scope))fail(409,'schema_changed','Schema changed; prepare scope again');
  const result=await this.apply(tx,a,w,p,op);await tx.query('INSERT INTO workspace_receipts(id,workspace_id,user_id,digest,result) VALUES($1,$2,$3,$4,$5)',[id,w,a.userId,digest,J(result)]);await tx.query('DELETE FROM workspace_previews WHERE id=$1',[id]);return result;
 });}
 private async apply(tx:Connection,a:Actor,w:string,p:any,op:WorkspaceOperation):Promise<any>{
  let objectId:string=randomUUID(),version=0,before:any=null,after:any;
  if(op.kind==='create_node'){after={id:objectId,kind:op.nodeKind,name:op.name,parent_id:op.parentId,version};await tx.query('INSERT INTO workspace_nodes(id,workspace_id,kind,name,parent_id) VALUES($1,$2,$3,$4,$5)',[objectId,w,op.nodeKind,op.name,op.parentId]);}
  else if(op.kind==='move_node'||op.kind==='rename_node'){objectId=op.nodeId;before=await this.node(tx,w,objectId);version=before.version+1;after={...before,version,...(op.kind==='move_node'?{parent_id:op.parentId}:{name:op.name})};await tx.query('UPDATE workspace_nodes SET name=$1,parent_id=$2,version=$3 WHERE id=$4',[after.name,after.parent_id,version,objectId]);}
  else if(op.kind==='save_component'||op.kind==='move_component'||op.kind==='archive_component'||op.kind==='restore_component'){
   if(op.componentId){objectId=op.componentId;before=await this.component(tx,a,w,objectId);version=before.version+1;}
   if(op.kind==='save_component')after={...before,id:objectId,workspace_id:w,project_id:op.projectId,...op.content,version,archived:before?.archived??false};
   else if(op.kind==='move_component')after={...before,project_id:op.projectId,version};
   else if(op.kind==='archive_component')after={...before,archived:op.archived,version};
   else {const old=await this.componentRevision(tx,w,objectId,op.revisionVersion);after={...before,name:old.name,format:old.format,source:old.source,bindings:old.bindings,version};}
   if(before)await tx.query('UPDATE workspace_components SET project_id=$1,name=$2,format=$3,source=$4,bindings=$5,version=$6,archived=$7 WHERE id=$8',[after.project_id,after.name,after.format,after.source,J(after.bindings),version,after.archived,objectId]);
   else await tx.query('INSERT INTO workspace_components(id,workspace_id,project_id,name,format,source,bindings,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[objectId,w,after.project_id,after.name,after.format,after.source,J(after.bindings),a.userId]);
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
 async scope(tx:Connection,a:Actor,w:string,id:string){const s=(await tx.query('SELECT * FROM maintenance_scopes WHERE id=$1 AND workspace_id=$2 AND user_id=$3',[id,w,a.userId])).rows[0];if(!s)fail(404,'not_found','Maintenance scope not found');return s;}
 async scopes(a:Actor,w:string){await this.policy(this.db,a,w);const rows=(await this.db.query('SELECT * FROM maintenance_scopes WHERE workspace_id=$1 AND user_id=$2 ORDER BY created_at',[w,a.userId])).rows;const result=[];for(const r of rows){try{const stamp=await this.scopeStamp(this.db,{...a,origin:'ai'},w,maintenanceSchema.parse(r.body));result.push({...r,schemaChanged:stamp!==r.schema_stamp});}catch{/* Do not expose inaccessible field names or scope text. */}}return result;}
 async revoke(a:Actor,w:string,id:string){return this.db.transaction(async tx=>{await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await this.policy(tx,a,w,true),before=await this.scope(tx,a,w,id);if(before.revoked_at)return {id,revoked:true};await tx.query('UPDATE maintenance_scopes SET revoked_at=now(),version=version+1 WHERE id=$1',[id]);await revision(tx,a,w,id,'maintenance_scope',before.version+1,{...before,revoked:true});await audit(tx,a,p,'maintenance.revoked',id,null,{revoked:true});return {id,revoked:true};});}
 async maintain(a:Actor,w:string,input:unknown){
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
   if(v.changes.length){const draft=await service.preview(actor,w,{kind:'bulk_records',changes:v.changes});const receipt=await service.commit(actor,draft.id,draft.digest);ids.push(...receipt.objects.map((o:any)=>o.id));}
   const links=[];for(const l of v.links){await this.validate(tx,actor,w,l);links.push(await this.apply(tx,actor,w,p,l));}
   const result={workspaceId:w,workspaceFoundation:true,status:'saved',requestKey:v.requestKey,recordIds:ids,links};
   await tx.query('INSERT INTO workspace_receipts(id,workspace_id,user_id,digest,result) VALUES($1,$2,$3,$4,$5)',[v.requestKey,w,a.userId,digest,J(result)]);
   for(let i=0;i<v.changes.length;i++)await tx.query('INSERT INTO record_observations(id,workspace_id,record_id,scope_id,receipt_id,actor_id,data,source_label,interpretation) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[randomUUID(),w,ids[i],s.id,v.requestKey,a.userId,J(v.changes[i].data),v.sourceLabel,v.interpretation]);
   await audit(tx,actor,p,'maintenance.applied',s.id,null,{requestKey:v.requestKey,scopeVersion:s.version,recordIds:ids,sourceLabel:v.sourceLabel,interpretation:v.interpretation});return result;
  });
 }
 async evidence(a:Actor,w:string,recordId:string){
  const record=await this.record(this.db,a,w,recordId,false,true);
  const links=(await this.db.query('SELECT * FROM identity_links WHERE workspace_id=$1 AND (source_record_id=$2 OR preferred_record_id=$2) ORDER BY created_at',[w,recordId])).rows;
  const safe=[];for(const l of links){try{await this.record(this.db,a,w,l.source_record_id,false,true);await this.record(this.db,a,w,l.preferred_record_id,false,true);safe.push(l);}catch{}}
  const observations=(await this.db.query('SELECT * FROM record_observations WHERE workspace_id=$1 AND record_id=$2 ORDER BY created_at DESC LIMIT 100',[w,recordId])).rows.filter(o=>Object.keys(o.data).every(k=>record.fields.some((f:any)=>f.key===k)));
  return {recordId,links:safe,observations,historyAvailable:true};
 }
}
