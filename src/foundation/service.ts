import {WorkspaceFoundation} from '../workspace/service.js';
import {requireHuman} from '../domain/write-authorization.js';
import {nextDaily} from '../shared/schedules.js';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Database,Connection} from '../db/database.js';
import {Service,audit,checksum} from '../domain/service.js';
import {access,typeAccess,visibleFields} from '../domain/permissions.js';
import {fail,id,type Actor,recordWriteSchema} from '../shared/schema.js';
import {programSchema,functionSchema,scopeSchema,invokeSchema,scheduleSchema,checkContract,capabilityNames,foundationOperationSchema,type Scope} from './schema.js';
import {RUNTIME} from './runtime.js';
const J=JSON.stringify;
const ai=(actor:Actor):Actor=>({...actor,origin:'ai'});
export const grantSchema=z.object({revisionId:id,typeIds:z.array(id).length(1),expiresAt:z.iso.datetime().optional(),fields:z.array(z.string().min(1).max(64)).min(1).max(100).optional(),expectedTypeVersion:z.number().int().min(0).optional(),maxChanges:z.number().int().min(1).max(200),future:z.boolean()}).strict();
export class Foundation {
 constructor(public db:Database,public data=new Service(db)){}
 private async policy(a:Actor,w:string,write=false){return access(this.db,ai(a),w,write);}
 async stamps(a:Actor,w:string,connection:Connection=this.db){
  const p=await access(connection,ai(a),w);
  const schemas=(await connection.query('SELECT id,version FROM entity_types WHERE workspace_id=$1 ORDER BY id',[w])).rows;
  const docRules=(await connection.query('SELECT * FROM document_access WHERE workspace_id=$1 ORDER BY document_id',[w])).rows;
  const folders=(await connection.query('SELECT * FROM folder_access WHERE workspace_id=$1 ORDER BY folder',[w])).rows;
  const controls=(await connection.query('SELECT document_id,folder,linked_record_id,version FROM document_controls WHERE workspace_id=$1 ORDER BY document_id',[w])).rows;
  const records=(await connection.query('SELECT id,version FROM records WHERE workspace_id=$1 ORDER BY id',[w])).rows;
  const documents=(await connection.query('SELECT id,ai_enabled FROM document_versions WHERE workspace_id=$1 ORDER BY id',[w])).rows;
  return {access:checksum(J({p,schemas,docRules,folders,documents,controls})),data:checksum(J({schemas,records,documents,controls}))};
 }
 async checkComponent(a:Actor,w:string,context:{id:string;version:number;binding:string}|undefined|null,revisionId?:string|null,grantId?:string|null){
  if(!context)return;
  const c=(await new WorkspaceFoundation(this.db).readComponent(ai(a),w,context.id)).component;
  if(c.archived||c.project_archived||c.version!==context.version)fail(409,'component_changed','Component changed or was archived; review its execution binding again');
  const binding=c.execution.find((b:any)=>b.name===context.binding);
  if(!binding||binding.revisionId!==revisionId||(binding.grantId??null)!==(grantId??null))fail(403,'component_binding','Function or permission differs from reviewed component binding');
  const r=await this.revision(a,w,binding.revisionId);for(const typeId of r.body.scope.typeIds){const {type,policy}=await typeAccess(this.db,ai(a),w,typeId);const declared=c.bindings.find((b:any)=>b.typeId===typeId);if(!declared||visibleFields(type.fields,policy,ai(a)).some(f=>!declared.fields.includes(f.key)))fail(403,'component_binding','Function reads exceed current component bindings');}

 }
 async validateScope(a:Actor,w:string,scope:Scope){await this.policy(a,w);for(const t of scope.typeIds)await typeAccess(this.db,ai(a),w,t);}
 async enqueue(a:Actor,w:string,input:unknown,requestKey:string,revisionId?:string,scheduleId?:string,grantId?:string,componentContext?:{id:string;version:number;binding:string}){
  await this.checkComponent(a,w,componentContext,revisionId,grantId);
  id.parse(requestKey);const program=programSchema.parse(input);await this.validateScope(a,w,program.scope);
  const digest=checksum(J({program,revisionId:revisionId??null,grantId:grantId??null,componentContext:componentContext??null}));
  const existing=(await this.db.query('SELECT id,source_digest FROM foundation_runs WHERE user_id=$1 AND request_key=$2',[a.userId,requestKey])).rows[0];
  if(existing){if(existing.source_digest!==digest)fail(409,'request_conflict','Request ID already used for a different program');return {id:existing.id,workspaceId:w,status:'accepted'};}
  const row=await this.db.transaction(async tx=>{
   await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[a.userId]);
   const replay=(await tx.query('SELECT id,source_digest FROM foundation_runs WHERE user_id=$1 AND request_key=$2',[a.userId,requestKey])).rows[0];if(replay){if(replay.source_digest!==digest)fail(409,'request_conflict','Request ID already used');return {id:replay.id,workspaceId:w,status:'accepted'};}
   const quota=(await tx.query("SELECT count(*) AS n,coalesce(sum(octet_length(program::text)+coalesce(octet_length(result::text),0)+coalesce(octet_length(proposal::text),0)),0) AS bytes FROM foundation_runs WHERE user_id=$1 AND created_at>now()-interval '24 hours'",[a.userId])).rows[0];if(Number(quota.n)>=200||Number(quota.bytes)>=50*1024*1024)fail(429,'experiment_quota','Daily experiment limit reached');
   const count=Number((await tx.query("SELECT count(*) AS n FROM foundation_runs WHERE user_id=$1 AND status IN ('queued','running')",[a.userId])).rows[0].n);
   if(count>=5)fail(429,'run_limit','At most five pending runs per user');
   const runId=randomUUID();await tx.query(`INSERT INTO foundation_runs(id,workspace_id,user_id,revision_id,schedule_id,grant_id,request_key,program,source_digest,status,component_context) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'queued',$10)`,[runId,w,a.userId,revisionId??null,scheduleId??null,grantId??null,requestKey,J(program),digest,componentContext?J(componentContext):null]);return {id:runId,workspaceId:w,status:'queued'};
  });return row;
 }
 async run(a:Actor,w:string,runId:string){
  await this.policy(a,w);const r=(await this.db.query('SELECT * FROM foundation_runs WHERE id=$1 AND workspace_id=$2 AND user_id=$3',[runId,w,a.userId])).rows[0];
  if(!r)fail(404,'not_found','Run not found');
  await this.checkComponent(a,w,r.component_context,r.revision_id,r.grant_id);
  if(new Date(r.expires_at).getTime()<Date.now()||(r.access_stamp&&(await this.stamps(a,w)).access!==r.access_stamp)) return {...r,program:undefined,lease_token:undefined,result:null,proposal:null,proposal_digest:null,diagnostic:'access_changed',expired:new Date(r.expires_at).getTime()<Date.now()};
  const fieldChanges=[];if(r.proposal)for(const op of r.proposal)fieldChanges.push(...await this.data.fieldDiff(this.db,ai(a),w,op));const {lease_token,program,...safe}=r;return {...safe,fieldChanges,workspaceId:w,temporary:true,expired:new Date(r.expires_at).getTime()<Date.now()};
 }
 async previewArtifact(a:Actor,w:string,runId:string,filename:string,index?:number){
  const r=await this.run(a,w,runId);if(r.status!=='succeeded'||r.diagnostic==='access_changed'||r.expired)fail(409,'result_unavailable','Result unavailable');
  let bytes=Buffer.from(J(r.result)),mime='application/json';
  if(index!==undefined){const artifact=z.object({filename:z.string().min(1).max(250),mime:z.string().min(1).max(150),base64:z.string().max(1400000).regex(/^[A-Za-z0-9+/]*={0,2}$/)}).parse(r.result?.artifacts?.[index]);bytes=Buffer.from(artifact.base64,'base64');mime=artifact.mime;}
  if(bytes.length>1024*1024)fail(413,'artifact_limit','Artifact exceeds 1 MiB');
  return this.data.previewFile(ai(a),w,{filename:z.string().min(1).max(250).parse(filename),mime,bytes,ai:true});
 }
 async runs(a:Actor,w:string){await this.policy(a,w);return (await this.db.query('SELECT r.id,r.revision_id,r.status,r.created_at,r.finished_at,r.expires_at,r.diagnostic,r.proposal_digest,EXISTS(SELECT 1 FROM foundation_receipts c WHERE c.id=r.id) AS committed FROM foundation_runs r WHERE r.workspace_id=$1 AND r.user_id=$2 ORDER BY r.created_at DESC LIMIT 100',[w,a.userId])).rows;}
 async cancel(a:Actor,w:string,runId:string){await this.policy(a,w);await this.db.query("UPDATE foundation_runs SET cancel_requested=true,status='cancelled',finished_at=now() WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND status IN ('queued','running')",[runId,w,a.userId]);return {id:runId};}
 async prepareFunction(a:Actor,w:string,input:unknown){
  const body=functionSchema.parse(input);await this.policy(a,w,true);await this.validateScope(a,w,body.scope);
  if(body.functionId)await this.ownedFunction(a,w,body.functionId);
  if(Number((await this.db.query('SELECT count(*) AS n FROM foundation_previews WHERE user_id=$1 AND expires_at>now()',[a.userId])).rows[0].n)>=50)fail(429,'preview_limit','At most 50 pending function previews');
  const preview={id:randomUUID(),workspaceId:w,digest:checksum(J({body,runtime:RUNTIME})),body,runtime:RUNTIME,temporary:true};
  await this.db.query('INSERT INTO foundation_previews(id,workspace_id,user_id,body,digest) VALUES($1,$2,$3,$4,$5)',[preview.id,w,a.userId,J(body),preview.digest]);return preview;
 }
 async pendingApprovals(a:Actor,w:string){
  await this.policy(a,w);const rows=(await this.db.query('SELECT * FROM foundation_previews WHERE workspace_id=$1 AND user_id=$2 AND expires_at>now() ORDER BY expires_at',[w,a.userId])).rows;const result=[];
  for(const r of rows){try{if(r.kind==='function')await this.validateScope(a,w,r.body.scope);else {await this.revision(a,w,r.body.revisionId);if(r.kind==='grant'){const {type,policy}=await typeAccess(this.db,ai(a),w,r.body.typeIds[0]);const visible=visibleFields(type.fields,policy,ai(a));if(r.body.fields.some((k:string)=>!visible.some(f=>f.key===k)))continue;}}result.push({id:r.id,kind:r.kind,workspaceId:w,body:r.body,digest:r.digest,expiresAt:r.expires_at});}catch{}}
  return result;
 }
 async prepareControl(a:Actor,w:string,kind:'grant'|'schedule',input:unknown){
  let body:any=kind==='grant'?grantSchema.parse(input):scheduleSchema.parse(input);await this.policy(a,w,true);await this.revision(a,w,body.revisionId);
  if(kind==='grant'){
   const {type,policy}=await typeAccess(this.db,ai(a),w,body.typeIds[0],true);if(body.expectedTypeVersion!==undefined&&body.expectedTypeVersion!==type.version)fail(409,'schema_changed','Review the updated schema');
   body={...body,fields:body.fields??visibleFields(type.fields,policy,ai(a)).filter(f=>!f.formula).map(f=>f.key),expectedTypeVersion:type.version,expiresAt:body.expiresAt??new Date(Date.now()+30*86400000).toISOString()};
  }
  if(Number((await this.db.query('SELECT count(*) AS n FROM foundation_previews WHERE user_id=$1 AND expires_at>now()',[a.userId])).rows[0].n)>=50)fail(429,'preview_limit','Too many pending approvals');
  const result={id:randomUUID(),workspaceId:w,kind,body,digest:checksum(J({kind,body})),temporary:true};
  await this.db.query('INSERT INTO foundation_previews(id,workspace_id,user_id,kind,body,digest) VALUES($1,$2,$3,$4,$5,$6)',[result.id,w,a.userId,kind,J(body),result.digest]);return result;
 }
 async confirmControl(a:Actor,w:string,id:string,digest:string){requireHuman(a);return this.db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);await access(tx,a,w,true);const replay=await this.receipt(tx,a,w,id,digest);if(replay)return replay;
  const r=(await tx.query('SELECT * FROM foundation_previews WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND expires_at>now()',[id,w,a.userId])).rows[0];if(!r||r.digest!==digest||!['grant','schedule'].includes(r.kind))fail(409,'preview_unavailable','Review expired or changed');
  const f=new Foundation(this.adapter(tx));const result=r.kind==='grant'?await f.grant(a,w,r.body):await f.schedule(a,w,r.body);
  await this.storeReceipt(tx,a,w,id,digest,r.kind,result);await tx.query('DELETE FROM foundation_previews WHERE id=$1',[id]);return result;
 });}
 async discardFunction(a:Actor,w:string,previewId:string){await this.policy(a,w);await this.db.query('DELETE FROM foundation_previews WHERE id=$1 AND workspace_id=$2 AND user_id=$3',[previewId,w,a.userId]);return {id:previewId,discarded:true};}
 private async ownedFunction(a:Actor,w:string,functionId:string){const f=(await this.db.query('SELECT * FROM foundation_functions WHERE id=$1 AND workspace_id=$2 AND user_id=$3',[functionId,w,a.userId])).rows[0];if(!f)fail(404,'not_found','Function not found');return f;}
 async functions(a:Actor,w:string){await this.policy(a,w);return (await this.db.query('SELECT f.*,r.id AS revision_id,r.digest,r.runtime FROM foundation_functions f JOIN foundation_revisions r ON r.function_id=f.id AND r.version=f.version WHERE f.workspace_id=$1 AND f.user_id=$2 ORDER BY f.created_at DESC',[w,a.userId])).rows;}
 async revision(a:Actor,w:string,revisionId:string){await this.policy(a,w);const r=(await this.db.query('SELECT r.* FROM foundation_revisions r JOIN foundation_functions f ON f.id=r.function_id WHERE r.id=$1 AND f.workspace_id=$2 AND f.user_id=$3',[revisionId,w,a.userId])).rows[0];if(!r)fail(404,'not_found','Revision not found');await this.validateScope(a,w,r.body.scope);return r;}
 async saveFunction(a:Actor,w:string,previewId:string,digest:string){
  requireHuman(a);
  return this.db.transaction(async tx=>{
   const p=await access(tx,ai(a),w,true);await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);
   const receipt=await this.receipt(tx,a,w,previewId,digest);if(receipt)return receipt;
   const draft=(await tx.query('SELECT * FROM foundation_previews WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND expires_at>now()',[previewId,w,a.userId])).rows[0];
   if(!draft||draft.kind!=='function'||draft.digest!==digest)fail(409,'preview_unavailable','Preview expired or changed');
   const body=functionSchema.parse(draft.body);const f=new Foundation(this.adapter(tx));await f.validateScope(a,w,body.scope);
   const functionId=body.functionId??randomUUID();let version=0;
   if(body.functionId){const current=await f.ownedFunction(a,w,functionId);if(current.version!==body.expectedVersion)fail(409,'stale_version','Function changed');version=current.version+1;await tx.query('UPDATE foundation_functions SET name=$1,version=$2 WHERE id=$3',[body.name,version,functionId]);}
   else await tx.query('INSERT INTO foundation_functions(id,workspace_id,user_id,name) VALUES($1,$2,$3,$4)',[functionId,w,a.userId,body.name]);
   const revisionId=randomUUID();await tx.query('INSERT INTO foundation_revisions(id,function_id,version,body,digest,runtime) VALUES($1,$2,$3,$4,$5,$6)',[revisionId,functionId,version,J(body),digest,RUNTIME]);
   const result={functionId,revisionId,version,digest};await audit(tx,ai(a),p,'function.saved',functionId,null,result);
   await this.storeReceipt(tx,a,w,previewId,digest,'function',result);await tx.query('DELETE FROM foundation_previews WHERE id=$1',[previewId]);return result;
  });
 }
 async invoke(a:Actor,w:string,input:unknown,requestKey:string){const v=invokeSchema.parse(input),r=await this.revision(a,w,v.revisionId);if(r.runtime!==RUNTIME)fail(409,'runtime_unavailable','This function runtime is unavailable');checkContract(r.body.inputContract,v.input);if(v.grantId){const g=(await this.grants(a,w)).find(g=>g.id===v.grantId);if(!g||g.authorization_version!==1||new Date(g.expires_at).getTime()<=Date.now()||g.revoked_at||(!g.future&&g.used_at)||g.revision_id!==r.id)fail(403,'grant_unavailable','Permission unavailable');}return this.enqueue(a,w,{source:r.body.source,scope:r.body.scope,toolCatalog:r.body.toolCatalog,dependencies:r.body.dependencies,input:v.input},requestKey,r.id,undefined,v.grantId,v.componentContext);}
 adapter(tx:Connection):Database{return {query:tx.query.bind(tx),transaction:fn=>fn(tx),close:async()=>{}};}
 private async receipt(tx:Connection,a:Actor,w:string,receiptId:string,digest:string){const r=(await tx.query('SELECT * FROM foundation_receipts WHERE id=$1 AND workspace_id=$2 AND user_id=$3',[receiptId,w,a.userId])).rows[0];if(r&&r.digest!==digest)fail(409,'digest_mismatch','Confirmation does not match');return r?.result;}
 private async storeReceipt(tx:Connection,a:Actor,w:string,receiptId:string,digest:string,kind:string,result:unknown){await tx.query('INSERT INTO foundation_receipts(id,workspace_id,user_id,digest,kind,result) VALUES($1,$2,$3,$4,$5,$6)',[receiptId,w,a.userId,digest,kind,J(result)]);}
 async commit(a:Actor,w:string,runId:string,digest:string,standingGrantId?:string){if(!standingGrantId)requireHuman(a);return this.db.transaction(async tx=>{
  const p=await access(tx,ai(a),w,true);await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);
  const receipt=await this.receipt(tx,a,w,runId,digest);if(receipt)return receipt;
  const r=(await tx.query("SELECT * FROM foundation_runs WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND status='succeeded' AND NOT cancel_requested AND expires_at>now() FOR UPDATE",[runId,w,a.userId])).rows[0];
  if(!r||!r.proposal||r.proposal_digest!==digest)fail(409,'proposal_unavailable','Proposal expired or unavailable');
  await new Foundation(this.adapter(tx)).checkComponent(a,w,r.component_context,r.revision_id,standingGrantId??r.grant_id);
  const stamp=await this.stamps(a,w,tx);if(stamp.data!==r.data_stamp||stamp.access!==r.access_stamp)fail(409,'stale_proposal','Data or permissions changed. Run again.');
  const changes=z.array(foundationOperationSchema).min(1).max(200).parse(r.proposal);
  if(standingGrantId){
   const recordChanges=z.array(recordWriteSchema).min(1).max(200).parse(changes);
   const g=(await tx.query('SELECT * FROM foundation_grants WHERE id=$1 AND workspace_id=$2 AND user_id=$3 FOR UPDATE',[standingGrantId,w,a.userId])).rows[0];
   if(!g||g.authorization_version!==1||!g.expires_at||new Date(g.expires_at).getTime()<=Date.now()||g.revoked_at||(!g.future&&g.used_at)||g.revision_id!==r.revision_id||changes.length>g.max_changes)fail(403,'grant_unavailable','Execution permission unavailable');
   for(const change of recordChanges){const t=change.kind==='create_record'?change.typeId:(await tx.query('SELECT type_id FROM records WHERE id=$1 AND workspace_id=$2',[change.recordId,w])).rows[0]?.type_id;if(!g.type_ids.includes(t)||Object.keys(change.data).some(k=>!g.field_scope.includes(k)))fail(403,'grant_scope','Change outside permission');const current=await typeAccess(tx,ai(a),w,t,true);if(checksum(J({version:current.type.version,fields:current.type.fields}))!==g.schema_stamp)fail(409,'schema_changed','Review permission after schema changes');}
   if(!g.future)await tx.query('UPDATE foundation_grants SET used_at=now() WHERE id=$1',[g.id]);
  }
  await tx.query("SELECT set_config('trialy.run_id',$1,true)",[runId]);
  const s=new Service(this.adapter(tx));const objects:any[]=[];
  const operations=changes.every(c=>c.kind==='create_record'||c.kind==='update_record')?[{kind:'bulk_records',changes}]:changes;
  for(const operation of operations){const preview=await s.preview(ai(a),w,operation);const receipt=await s.commit(ai(a),preview.id,preview.digest,standingGrantId?{kind:'execution_grant',id:standingGrantId,version:1,context:runId}:{kind:'approval',id:runId,digest,context:'code_run'});objects.push(...receipt.objects);}
  const result={objects};
  const provenance={runId,revisionId:r.revision_id,sourceDigest:r.source_digest,proposalDigest:digest,grantId:standingGrantId??null,receipt:result};
  await audit(tx,ai(a),p,'execution.committed',runId,null,provenance);await this.storeReceipt(tx,a,w,runId,digest,'changes',provenance);return provenance;
 });}
 async grants(a:Actor,w:string){await this.policy(a,w);const rows=(await this.db.query('SELECT * FROM foundation_grants WHERE workspace_id=$1 AND user_id=$2 ORDER BY created_at DESC',[w,a.userId])).rows;const result=[];for(const g of rows){try{for(const id of g.type_ids){const {type,policy}=await typeAccess(this.db,ai(a),w,id);const fields=visibleFields(type.fields,policy,ai(a));if(g.field_scope?.some((k:string)=>!fields.some(f=>f.key===k)))throw new Error('hidden');}result.push(g);}catch{}}return result;}
 async grant(a:Actor,w:string,input:unknown){
  requireHuman(a);const v=grantSchema.parse(input);const r=await this.revision(a,w,v.revisionId);const p=await this.policy(a,w,true);
  if(!r.body.scope.capabilities.includes('changes.propose')||v.typeIds.some(t=>!r.body.scope.typeIds.includes(t)))fail(400,'grant_scope','Grant exceeds function scope');
  const expires=v.expiresAt?new Date(v.expiresAt):new Date(Date.now()+30*86400000);if(expires.getTime()<=Date.now())fail(400,'grant_expired','Choose a future expiry');
  const grantId=randomUUID();return this.db.transaction(async tx=>{
   await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const {type,policy}=await typeAccess(tx,ai(a),w,v.typeIds[0],true);
   const allowed=visibleFields(type.fields,policy,ai(a)).filter(f=>!f.formula).map(f=>f.key);const fields=v.fields??allowed;if(fields.some(k=>!allowed.includes(k)))fail(403,'field_scope','Permission includes unavailable fields');if(v.expectedTypeVersion!==undefined&&v.expectedTypeVersion!==type.version)fail(409,'schema_changed','Review current schema');const stamp=checksum(J({version:type.version,fields:type.fields}));
   await tx.query('INSERT INTO foundation_grants(id,workspace_id,user_id,revision_id,type_ids,max_changes,future,authorization_version,expires_at,field_scope,schema_stamp) VALUES($1,$2,$3,$4,$5,$6,$7,1,$8,$9,$10)',[grantId,w,a.userId,v.revisionId,J(v.typeIds),v.maxChanges,v.future,expires,J(fields),stamp]);
   await audit(tx,a,p,'execution.granted',grantId,null,{...v,expiresAt:expires.toISOString(),fields,authorizationVersion:1});return {id:grantId,...v,expiresAt:expires.toISOString(),fields};
  });
 }
 async revoke(a:Actor,w:string,grantId:string){const p=await this.policy(a,w);return this.db.transaction(async tx=>{await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const r=await tx.query('UPDATE foundation_grants SET revoked_at=now() WHERE id=$1 AND workspace_id=$2 AND user_id=$3 RETURNING id',[grantId,w,a.userId]);if(!r.rows.length)fail(404,'not_found','Grant not found');await audit(tx,a,p,'execution.revoked',grantId,null,{});return {id:grantId};});}
 async schedule(a:Actor,w:string,input:unknown){requireHuman(a);const v=scheduleSchema.parse(input);await this.checkComponent(a,w,v.componentContext,v.revisionId,v.grantId);await this.policy(a,w,true);const r=await this.revision(a,w,v.revisionId);checkContract(r.body.inputContract,v.input);if(v.grantId){const g=(await this.grants(a,w)).find(g=>g.id===v.grantId);if(!g||g.authorization_version!==1||new Date(g.expires_at).getTime()<=Date.now()||g.revoked_at||g.revision_id!==r.id||!g.future)fail(403,'grant_unavailable','Choose an active future permission for this revision');}
  const scheduleId=randomUUID();const p=await this.policy(a,w,true);return this.db.transaction(async tx=>{const cursor=(await tx.query('SELECT coalesce(max(event_sequence),0) AS cursor FROM audit_events WHERE workspace_id=$1',[w])).rows[0].cursor;
  const next=v.trigger?.kind==='daily'?nextDaily(v.trigger,new Date()):new Date();await tx.query('INSERT INTO foundation_schedules(id,workspace_id,user_id,revision_id,input,grant_id,interval_minutes,trigger,event_cursor,next_at,component_context) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[scheduleId,w,a.userId,r.id,J(v.input),v.grantId??null,v.intervalMinutes,v.trigger?J(v.trigger):null,cursor,next,v.componentContext?J(v.componentContext):null]);await audit(tx,a,p,'execution.scheduled',scheduleId,null,v);return {id:scheduleId,...v};});}
 async schedules(a:Actor,w:string){await this.policy(a,w);return (await this.db.query('SELECT id,revision_id,interval_minutes,paused,next_at,grant_id,trigger,component_context FROM foundation_schedules WHERE workspace_id=$1 AND user_id=$2 ORDER BY created_at DESC',[w,a.userId])).rows;}
 async pause(a:Actor,w:string,scheduleId:string,paused:boolean){const p=await this.policy(a,w,!paused);return this.db.transaction(async tx=>{const result=await tx.query('UPDATE foundation_schedules SET paused=$1 WHERE id=$2 AND workspace_id=$3 AND user_id=$4 RETURNING id',[paused,scheduleId,w,a.userId]);if(!result.rows.length)fail(404,'not_found','Schedule not found');await audit(tx,a,p,'execution.schedule_paused',scheduleId,null,{paused});return {id:scheduleId,paused};});}
}
