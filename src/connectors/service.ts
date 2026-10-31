import {enqueueServiceJob} from '../app-services/jobs.js';
import {appPublicUrl} from '../shared/public-url.js';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Database,Connection} from '../db/database.js';
import {withActor} from '../db/context.js';
import {access,typeAccess,visibleFields} from '../domain/permissions.js';
import {assertRecordScope} from '../domain/effective-access.js';
import {DerivedReader} from '../domain/derived-fields.js';
import {dependencies} from '../shared/formulas.js';
import {rulesFor} from '../domain/effective-access.js';
import {audit,checksum} from '../domain/evidence.js';
import {requireHuman} from '../domain/write-authorization.js';
import {fail,id,type Actor} from '../shared/schema.js';
import {connectorCall,connectorChange,connectorConfig,type ConnectorConfig,type ConnectorCall,type ConnectorOperation} from './schema.js';
import {connectorVault} from './secrets.js';
import {httpsTransport,type ConnectorTransport,type OutboundRequest} from './transport.js';

const J=JSON.stringify;
const editable=(p:any,a:Actor)=>!p.archived&&!['viewer','inspector'].includes(p.role)&&!rulesFor(p,a).some(r=>r.kind==='connection'&&(r.read==='deny'||r.write==='deny'));
type AppReader=(db:Connection,actor:Actor,workspaceId:string,appId:string)=>Promise<any>;
type Options={transport?:ConnectorTransport;vault?:ReturnType<typeof connectorVault>};
export class Connectors{
 constructor(private db:Database,private app:AppReader,private options:Options={}){}
 private async connection(tx:Connection,a:Actor,w:string,connectionId:string){
  const policy=await access(tx,a,w),row=(await tx.query('SELECT * FROM connectors WHERE id=$1 AND workspace_id=$2',[connectionId,w])).rows[0];
  if(!row)fail(404,'not_found','Connector unavailable');return {row,policy,config:connectorConfig.parse(row.config)};
 }
 private async manager(tx:Connection,a:Actor,w:string,connectionId?:string){
  const policy=await access(tx,a,w,true);
  if(!connectionId){if(policy.role!=='owner')fail(403,'connector_manage','Only an owner can create a connector');return policy;}
  const {config}=await this.connection(tx,a,w,connectionId);
  if(policy.role!=='owner'&&!config.managers.includes(a.userId))fail(403,'connector_manage','Connector management is not permitted');return policy;
 }
 async list(a:Actor,w:string,offset=0,query=''){
  const p=await access(this.db,a,w),values=[w,p.role==='owner',a.userId,a.origin==='ai'];
  const where="c.workspace_id=$1 AND c.removed_at IS NULL AND ($2::boolean OR c.config->'managers' ? $3::text OR EXISTS(SELECT 1 FROM jsonb_array_elements(c.config->'operations') o WHERE o->'users' ? $3::text AND (NOT $4::boolean OR o->>'aiEnabled'='true')))";
  const search=query?" AND c.config->>'name' ILIKE $6":"";
  const rows=(await this.db.query(`SELECT c.id,c.version,c.config->>'name' AS name,c.config->>'enabled' AS enabled,c.config->'auth'->>'kind' AS auth_kind,c.config->'managers' AS managers,EXISTS(SELECT 1 FROM connector_credentials s WHERE s.connection_id=c.id AND s.sealed<>'') AS configured FROM connectors c WHERE ${where}${search} ORDER BY c.created_at,c.id LIMIT 25 OFFSET $5`,[...values,offset,...(query?['%'+query+'%']:[])])).rows;
  const total=Number((await this.db.query(`SELECT count(*) AS n FROM connectors c WHERE ${where}${query?" AND c.config->>'name' ILIKE $5":''}`,[...values,...(query?['%'+query+'%']:[])])).rows[0].n);
  return {connections:rows.map(r=>({id:r.id,name:r.name,type:'generic_https',enabled:r.enabled==='true',version:r.version,credentialStatus:r.auth_kind==='none'?'not_required':r.configured?'configured':'missing',canManage:editable(p,a)&&(p.role==='owner'||r.managers.includes(a.userId))})),total,offset};
 }
 async read(a:Actor,w:string,connectionId:string){
  const {row,config,policy}=await this.connection(this.db,a,w,connectionId),manage=policy.role==='owner'||config.managers.includes(a.userId);
  const operations=config.operations.filter(o=>manage||o.users.includes(a.userId)&&(a.origin!=='ai'||o.aiEnabled));if(!operations.length&&!manage)fail(404,'not_found','Connector unavailable');
  const credential=(await this.db.query("SELECT rotated_at FROM connector_credentials WHERE connection_id=$1 AND workspace_id=$2 AND sealed<>''",[connectionId,w])).rows[0];
  // Invocation-only users receive operation handles and schemas, never source mappings or other users' grants.
  return {id:row.id,version:row.version,removed:!!row.removed_at,canManage:manage&&editable(policy,a),credentialStatus:config.auth.kind==='none'?'not_required':credential?'configured':'missing',rotatedAt:credential?.rotated_at??null,config:manage?config:{type:config.type,name:config.name,enabled:config.enabled,operations:operations.map(o=>({id:o.id,name:o.name,effect:o.effect,parameters:o.parameters,response:o.response,apps:o.apps,mappings:o.mappings.map(m=>({parameter:m.parameter,typeId:m.typeId,field:m.field})),constants:o.constants,destinations:o.destinations}))}};
 }
 async prepare(a:Actor,w:string,input:unknown){
  const v=connectorChange.parse(input);await this.manager(this.db,a,w,v.connectionId);
  if(v.connectionId){const {row}=await this.connection(this.db,a,w,v.connectionId);if(row.removed_at||row.version!==v.expectedVersion)fail(409,'connector_changed','Reload the connector before editing');}
  // No secrets accepted by this schema. Human confirmation is always separate from preparation.
  return this.review(a,w,'config',v);
 }
 private async review(a:Actor,w:string,kind:'config'|'invoke',body:unknown){
  if(a.origin==='worker')fail(403,'connector_worker','Workers need a future explicit connector grant');
  if(Buffer.byteLength(J(body))>100000)fail(413,'connector_review_size','Review exceeds the size limit');
  const reviewId=randomUUID(),digest=checksum(J(body));
  await this.db.query('INSERT INTO connector_reviews(id,workspace_id,user_id,origin,kind,digest,body) VALUES($1,$2,$3,$4,$5,$6,$7)',[reviewId,w,a.userId,a.origin,kind,digest,J(body)]);
  const url=new URL('/',appPublicUrl());url.searchParams.set('tab','connectors');url.searchParams.set('workspaceId',w);url.searchParams.set('connectorReview',reviewId);
  return {status:'review_required' as const,reviewId,digest,reviewUrl:url.href};
 }
 async readReview(a:Actor,w:string,reviewId:string){
  requireHuman(a);await access(this.db,a,w);
  const r=(await this.db.query('SELECT * FROM connector_reviews WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND expires_at>now()',[reviewId,w,a.userId])).rows[0];
  if(!r)fail(404,'not_found','Connector review unavailable');
  if(r.kind==='config')await this.manager(this.db,a,w,r.body.connectionId);
  else if((await this.inspect(this.db,{...a,origin:r.origin},w,r.body.call)).digest!==r.body.digest)fail(409,'connector_changed','Request data or permissions changed; review again');
  return {id:r.id,digest:r.digest,kind:r.kind,body:r.body,expiresAt:r.expires_at,consumed:!!r.consumed_at};
 }
 async confirmConfig(a:Actor,w:string,reviewId:string,digest:string){
  requireHuman(a);return this.db.transaction(async tx=>{
   const review=(await tx.query("SELECT * FROM connector_reviews WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND kind='config' AND expires_at>now() FOR UPDATE",[reviewId,w,a.userId])).rows[0];
   if(!review||review.digest!==digest)fail(409,'connector_review','Review is unavailable or changed');
   if(review.consumed_at)return review.result;
   const v=connectorChange.parse(review.body),p=await this.manager(tx,a,w,v.connectionId),connectionId=v.connectionId??randomUUID();
   let previous:any=null;
   if(v.connectionId){previous=(await tx.query('SELECT * FROM connectors WHERE id=$1 AND workspace_id=$2 FOR UPDATE',[connectionId,w])).rows[0];if(previous.removed_at||previous.version!==v.expectedVersion)fail(409,'connector_changed','Reload the connector before editing');
    // Credentials are destination- and auth-bound. Replacing either requires entering a new credential.
    if(previous.config.baseUrl!==v.config.baseUrl||J(previous.config.auth)!==J(v.config.auth))await tx.query("UPDATE connector_credentials SET sealed='',rotated_at=now() WHERE connection_id=$1",[connectionId]);
    await tx.query('UPDATE connectors SET config=$2,version=version+1,updated_at=now() WHERE id=$1',[connectionId,J(v.config)]);
   }else await tx.query('INSERT INTO connectors(id,workspace_id,tenant_id,config) VALUES($1,$2,$3,$4)',[connectionId,w,p.tenant_id,J(v.config)]);
   const result={id:connectionId,version:previous?previous.version+1:0};
   await audit(tx,a,p,'connector.configured',connectionId,previous?{version:previous.version}:null,{version:result.version,configHash:checksum(J(v.config))});
   await tx.query('UPDATE connector_reviews SET consumed_at=now(),result=$2 WHERE id=$1',[reviewId,J(result)]);return result;
  });
 }
 async replaceSecret(a:Actor,w:string,connectionId:string,input:unknown){
  requireHuman(a);const v=z.object({expectedVersion:z.number().int().min(0),secret:z.string().min(1).max(4096).refine(v=>!/[\r\n\u0000]/.test(v),'Invalid credential')}).strict().parse(input);
  return this.db.transaction(async tx=>{
   const p=await this.manager(tx,a,w,connectionId),row=(await tx.query('SELECT * FROM connectors WHERE id=$1 AND workspace_id=$2 FOR UPDATE',[connectionId,w])).rows[0];
   if(row.version!==v.expectedVersion||row.removed_at||row.config.auth.kind==='none')fail(409,'connector_changed','Reload the current authenticated connector');
   const sealed=(this.options.vault??connectorVault()).seal(v.secret,`${w}:${connectionId}`);
   await tx.query('INSERT INTO connector_credentials(connection_id,workspace_id,sealed) VALUES($1,$2,$3) ON CONFLICT(connection_id) DO UPDATE SET sealed=excluded.sealed,rotated_at=now()',[connectionId,w,sealed]);
   await tx.query('UPDATE connectors SET version=version+1,updated_at=now() WHERE id=$1',[connectionId]);
   await audit(tx,a,p,'connector.credential_replaced',connectionId,null,{configured:true});return {configured:true,version:row.version+1};
  });
 }
 async disable(a:Actor,w:string,connectionId:string,expectedVersion:number,remove=false){
  requireHuman(a);return this.db.transaction(async tx=>{
   const p=await this.manager(tx,a,w,connectionId),row=(await tx.query('SELECT * FROM connectors WHERE id=$1 AND workspace_id=$2 FOR UPDATE',[connectionId,w])).rows[0];if(row.version!==expectedVersion)fail(409,'connector_changed','Reload the connector');
   await tx.query("UPDATE connectors SET config=jsonb_set(config,'{enabled}','false'),version=version+1,updated_at=now(),removed_at=CASE WHEN $2 THEN now() ELSE removed_at END WHERE id=$1",[connectionId,remove]);
   if(remove)await tx.query("UPDATE connector_credentials SET sealed='',rotated_at=now() WHERE connection_id=$1",[connectionId]);
   await audit(tx,a,p,remove?'connector.removed':'connector.disabled',connectionId,{version:row.version},{version:row.version+1});return {id:connectionId,version:row.version+1,enabled:false};
  });
 }
 async inspect(tx:Connection,a:Actor,w:string,raw:unknown){
  const call=connectorCall.parse(raw);a={...a,accessToolId:call.appId};
  return withActor(a,async()=>{
   const {row,config,policy}=await this.connection(tx,a,w,call.connectionId);
   if(row.removed_at||!config.enabled||policy.archived||config.expiresAt&&Date.parse(config.expiresAt)<=Date.now())fail(403,'connector_disabled','Connector is disabled or expired');
   if(a.origin==='worker')fail(403,'connector_worker','Connector workers are not enabled');
   const app=await this.app(tx,a,w,call.appId);
   if(app.archived||app.project_archived||app.version!==call.appVersion)fail(409,'app_changed','Open the current app revision');
   const operation=config.operations.find(o=>o.id===call.operation);
   if(!operation||!operation.users.includes(a.userId)||!operation.apps.includes(app.id)||a.origin==='ai'&&!operation.aiEnabled)fail(403,'connector_use','This user or app cannot use the connector operation');
   const parameters:Record<string,unknown>={...operation.constants},stamps:any[]=[];
   const names=operation.parameters.map(p=>p.name),mapped=operation.mappings.map(m=>m.parameter);
   if(Object.keys(call.parameters).some(k=>!names.includes(k)||mapped.includes(k)||Object.hasOwn(operation.constants,k))||Object.keys(call.records).some(k=>!mapped.includes(k)))fail(400,'connector_parameters','Undeclared or overridden connector input');
   for(const m of operation.mappings){
    const recordId=call.records[m.parameter];if(!recordId||m.recordIds&&!m.recordIds.includes(recordId))fail(403,'connector_data','Record is outside the connector data scope');
    const binding=app.bindings.find((b:any)=>b.typeId===m.typeId);
    if(!binding?.fields.includes(m.field))fail(403,'connector_data','Field is not bound to this app');
    const {type,policy:tablePolicy}=await typeAccess(tx,a,w,m.typeId),fields=visibleFields(type.fields,tablePolicy,a);
    const field=fields.find(f=>f.key===m.field);if(!field)fail(403,'connector_data','Field is not readable');
    if(dependencies(field).some(key=>!operation.mappings.some(input=>input.typeId===m.typeId&&input.field===key)))fail(403,'connector_data','Derived inputs must also be permitted connector fields');
    await assertRecordScope(tx,tablePolicy,recordId);
    if(app.manifest?.scope==='project'&&!(await tx.query('SELECT id FROM project_records WHERE workspace_id=$1 AND project_id=$2 AND record_id=$3 AND revoked_at IS NULL',[w,app.project_id,recordId])).rows.length)fail(403,'connector_data','Record is outside the app data scope');
    const record=(await tx.query("SELECT id,type_id,version,data FROM records WHERE id=$1 AND workspace_id=$2 AND type_id=$3 AND state<>'archived'",[recordId,w,m.typeId])).rows[0];if(!record)fail(404,'not_found','Record unavailable');
    const allowed=Object.fromEntries(app.bindings.map((b:any)=>[b.typeId,b.fields.filter((field:string)=>operation.mappings.some(m=>m.typeId===b.typeId&&m.field===field))])),reader=new DerivedReader(tx,a,w,Object.keys(allowed),allowed);
    const resolved=await reader.read({...record,fields});
    if(!Object.hasOwn(resolved.data,m.field))fail(403,'connector_data','Computed field depends on unavailable data');
    parameters[m.parameter]=resolved.data[m.field];stamps.push({recordId,version:record.version,field:m.field});
   }
   Object.assign(parameters,call.parameters);
   for(const p of operation.parameters){const value=parameters[p.name];if(value===undefined){if(p.required)fail(400,'connector_parameters','Missing required connector parameter');continue;}
    if(value!==null&&(typeof value!==({text:'string',number:'number',boolean:'boolean',json:typeof value} as const)[p.kind]||typeof value==='string'&&value.length>64000||typeof value==='number'&&!Number.isFinite(value))||p.choices&&!p.choices.some(c=>c===value))fail(400,'connector_parameters','Connector parameter does not match its declared schema');
   }
   let path=operation.path;const rest={...parameters};for(const match of operation.path.matchAll(/\{([a-z][a-z0-9_]*)\}/g)){const value=parameters[match[1]];if(value===undefined||value===null||!/^[A-Za-z0-9_-]+$/.test(String(value)))fail(400,'connector_path','Path parameters must be identifiers');path=path.replace(match[0],encodeURIComponent(String(value)));delete rest[match[1]];}
   const url=new URL(path,config.baseUrl);if(url.origin!==new URL(config.baseUrl).origin)fail(400,'connector_destination','Operation leaves configured destination');
   let body:string|undefined;if(operation.method==='GET'){if(Object.values(rest).some(v=>v!==null&&typeof v==='object'))fail(400,'connector_parameters','JSON inputs require a body request');for(const [k,v] of Object.entries(rest))url.searchParams.set(k,String(v??''));}else body=J(rest);
   const request={url:url.href,method:operation.method,...(body?{body}:{}),headers:{accept:operation.response.format==='json'?'application/json':'text/plain',...(body?{'content-type':'application/json'}:{})}};
   if(Buffer.byteLength(J(request))>65536)fail(413,'connector_request_size','Connector request exceeds 64 KiB');
   const stamp={connectionVersion:row.version,appVersion:app.version,accessVersion:policy.access_version,stamps,request},digest=checksum(J(stamp));
   return {call,row,config,operation,request,digest,reviewRequired:operation.effect!=='read'||Object.keys(call.parameters).length>0};
  });
 }
 async prepareCall(a:Actor,w:string,input:unknown){
  const built=await this.inspect(this.db,a,w,input);return this.review(a,w,'invoke',{call:built.call,connectionVersion:built.row.version,request:built.request,digest:built.digest});
 }
 async call(a:Actor,w:string,input:unknown,queued=false){
  const built=await this.inspect(this.db,a,w,input);
  if(queued||built.operation.execution==='background'){const job=(await this.db.query('SELECT id,status,payload FROM app_service_jobs WHERE workspace_id=$1 AND user_id=$2 AND request_key=$3',[w,a.userId,'connector:'+built.call.connectionId+':'+built.call.requestKey])).rows[0];if(job){if(job.payload.digest!==built.digest)fail(409,'connector_request_key','This request key belongs to another request');return {id:job.id,status:job.status,replayed:true};}}
  const previous=(await this.db.query('SELECT * FROM connector_invocations WHERE connection_id=$1 AND workspace_id=$2 AND user_id=$3 AND request_key=$4',[built.call.connectionId,w,a.userId,built.call.requestKey])).rows[0];
  if(previous){if(previous.digest!==built.digest)fail(409,'connector_request_key','This request key belongs to another request');return {id:previous.id,status:previous.status==='running'&&Date.now()>new Date(previous.deadline_at).getTime()?'unknown':previous.status,result:previous.result,replayed:true};}
  if(built.reviewRequired)return this.review(a,w,'invoke',{call:built.call,connectionVersion:built.row.version,request:built.request,digest:built.digest});
  return queued||built.operation.execution==='background'?this.queue(a,w,built.call,built.digest):this.dispatch(a,w,built.call,built.digest);
 }
 async confirmInvocation(a:Actor,w:string,reviewId:string,digest:string){
  requireHuman(a);const review=await this.readReview(a,w,reviewId);if(review.kind!=='invoke'||review.digest!==digest)fail(409,'connector_review','Review is unavailable or changed');
  const stored=(await this.db.query('SELECT origin FROM connector_reviews WHERE id=$1 AND user_id=$2',[reviewId,a.userId])).rows[0];
  // Approval never upgrades an AI-origin request to the human's broader data visibility.
  const actor={...a,origin:stored.origin},built=await this.inspect(this.db,actor,w,review.body.call);
  if(built.operation.execution==='background')return this.queue(actor,w,built.call,built.digest,reviewId);
  return this.dispatch(actor,w,review.body.call,review.body.digest,reviewId);
 }
 async queue(a:Actor,w:string,call:ConnectorCall,digest:string,reviewId?:string){
  const built=await this.inspect(this.db,a,w,call);if(built.digest!==digest)fail(409,'connector_changed','Request changed');
  if(built.reviewRequired&&!reviewId)fail(403,'connector_review','Review this request');
  if(reviewId){const r=await this.readReview({...a,origin:'human'},w,reviewId);if(r.body.digest!==digest)fail(409,'connector_changed','Request changed');}
  return enqueueServiceJob(this.db,a,w,call.appId,'connector','connector:'+call.connectionId+':'+call.requestKey,{origin:a.origin,call,digest,reviewId:reviewId??null},built.operation.timeoutSeconds+60);
 }
 async executeAuthorized(a:Actor,w:string,input:unknown,authorize:()=>Promise<void>,signal?:AbortSignal){
  await authorize();const built=await this.inspect(this.db,a,w,input);return this.dispatch(a,w,built.call,built.digest,undefined,authorize,signal);
 }
 private async dispatch(a:Actor,w:string,call:ConnectorCall,digest:string,reviewId?:string,authorized?:()=>Promise<void>,signal?:AbortSignal){
  const scoped={...a,accessToolId:call.appId};return withActor(scoped,async()=>{
   const reservation=await this.db.transaction(async tx=>{
    await tx.query('SELECT id FROM connectors WHERE id=$1 AND workspace_id=$2 FOR UPDATE',[call.connectionId,w]);
    const built=await this.inspect(tx,scoped,w,call);if(built.digest!==digest)fail(409,'connector_changed','Request data or permissions changed; review again');
    await authorized?.();if(built.reviewRequired&&!reviewId&&!authorized)fail(403,'connector_review','Review this request before sending');
    const previous=(await tx.query('SELECT * FROM connector_invocations WHERE connection_id=$1 AND user_id=$2 AND request_key=$3',[call.connectionId,a.userId,call.requestKey])).rows[0];
    if(previous){if(previous.digest!==digest)fail(409,'connector_request_key','This request key belongs to another request');if(previous.status==='running'&&Date.now()>new Date(previous.deadline_at).getTime()){await tx.query("UPDATE connector_invocations SET status='unknown',completed_at=now() WHERE id=$1 AND status='running'",[previous.id]);previous.status='unknown';}return {previous};}
    if(reviewId){const review=(await tx.query("SELECT * FROM connector_reviews WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND kind='invoke' AND expires_at>now() FOR UPDATE",[reviewId,w,a.userId])).rows[0];if(!review||review.body.digest!==digest||review.consumed_at)fail(409,'connector_review','Review is unavailable or already used');await tx.query('UPDATE connector_reviews SET consumed_at=now() WHERE id=$1',[reviewId]);}
    // Crash recovery is conservative: uncertain requests never become retryable automatically.
    await tx.query("UPDATE connector_invocations SET status='unknown',completed_at=now() WHERE connection_id=$1 AND status='running' AND deadline_at<now()",[call.connectionId]);
    const counts=(await tx.query("SELECT count(*) FILTER(WHERE created_at>now()-interval '1 minute') AS recent,count(*) FILTER(WHERE created_at>now()-interval '1 minute' AND app_id=$2) AS app_recent,count(*) FILTER(WHERE status='running') AS active FROM connector_invocations WHERE connection_id=$1",[call.connectionId,call.appId])).rows[0];
    if(Number(counts.recent)>=built.config.requestsPerMinute||Number(counts.app_recent)>=built.config.requestsPerAppPerMinute||Number(counts.active)>=3)fail(429,'connector_limit','Connector request limit reached');
    let secret='';if(built.config.auth.kind!=='none'){const credential=(await tx.query('SELECT sealed FROM connector_credentials WHERE connection_id=$1 AND workspace_id=$2',[call.connectionId,w])).rows[0];if(!credential?.sealed)fail(409,'connector_credential','Configure this connector credential in the trusted app');secret=(this.options.vault??connectorVault()).open(credential.sealed,`${w}:${call.connectionId}`);}
    const invocationId=randomUUID();await tx.query("INSERT INTO connector_invocations(id,workspace_id,connection_id,user_id,app_id,operation,request_key,digest,status,effect,review_id,request_bytes,deadline_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'running',$9,$10,$11,$12)",[invocationId,w,call.connectionId,a.userId,call.appId,call.operation,call.requestKey,digest,built.operation.effect,reviewId??null,Buffer.byteLength(built.request.url)+Buffer.byteLength(built.request.body??''),new Date(Date.now()+(built.operation.timeoutSeconds+10)*1000)]);
    return {built,invocationId,secret};
   });
   if(reservation.previous){const p=reservation.previous;return {id:p.id,status:p.status,result:p.result,replayed:true};}
   const {built,invocationId,secret}=reservation;
   const request:OutboundRequest={...built!.request,timeoutMs:built!.operation.timeoutSeconds*1000,signal,headers:{...built!.request.headers},authorize:async()=>{await authorized?.();if((await this.inspect(this.db,scoped,w,call)).digest!==digest)fail(409,'connector_changed','Request changed before dispatch');}};
   if(built!.config.auth.kind==='bearer')request.headers.authorization='Bearer '+secret;
   if(built!.config.auth.kind==='header')request.headers[built!.config.auth.header]=secret!;
   let status='unknown',result:unknown=null,httpStatus:number|null=null,responseBytes=0,duration=0;const started=Date.now();
   try{
    const response=await (this.options.transport??httpsTransport)(request);httpStatus=response.status;responseBytes=response.bytes;duration=response.durationMs;
    if(response.status<200||response.status>=300)status=built!.operation.effect==='read'?'failed':'unknown';
    else{result=filterResponse(response.body,built!.operation,secret!);status='succeeded';}
   }catch{status=built!.operation.effect==='read'?'failed':'unknown';duration=Date.now()-started;}
   const completed=await this.db.query("UPDATE connector_invocations SET status=$2,result=$3,http_status=$4,response_bytes=$5,duration_ms=$6,completed_at=now() WHERE id=$1 AND status='running' RETURNING status",[invocationId,status,J(result),httpStatus,responseBytes,duration]);
   if(!completed.rows.length){status='unknown';result=null;}
   // An in-flight revoke cannot undo a provider action, but it must prevent result disclosure.
   const current=await this.inspect(this.db,scoped,w,call);if(current.digest!==digest)fail(409,'connector_changed','Connector or data changed while the request was running; inspect Activity');
   return {id:invocationId,status,result};
  });
 }
 async activity(a:Actor,w:string,connectionId:string,offset=0){
  const {config,policy}=await this.connection(this.db,a,w,connectionId),manage=policy.role==='owner'||config.managers.includes(a.userId);
  if(!manage&&!config.operations.some(o=>o.users.includes(a.userId)&&(a.origin!=='ai'||o.aiEnabled)))fail(404,'not_found','Connector unavailable');
  const values=[connectionId,w,manage?null:a.userId];
  const where='connection_id=$1 AND workspace_id=$2 AND ($3::uuid IS NULL OR user_id=$3)';
  const stale="status='running' AND deadline_at<now()";
  const rows=(await this.db.query(`SELECT id,user_id,app_id,operation,CASE WHEN ${stale} THEN 'unknown' ELSE status END AS status,http_status,request_bytes,response_bytes,duration_ms,created_at,completed_at,review_id FROM connector_invocations WHERE ${where} ORDER BY created_at DESC,id LIMIT 25 OFFSET $4`,[...values,offset])).rows;
  const totals=(await this.db.query(`SELECT count(*) AS calls,count(*) FILTER(WHERE status IN ('failed','unknown') OR (${stale})) AS errors,coalesce(sum(request_bytes+response_bytes),0) AS bytes,coalesce(sum(duration_ms),0) AS duration_ms FROM connector_invocations WHERE ${where}`,values)).rows[0];return {rows,totals,offset};
 }
 async responseChange(a:Actor,w:string,invocationId:string,input:unknown){
  const v=z.object({typeId:id,recordId:id.optional(),expectedVersion:z.number().int().min(0).optional(),row:z.number().int().min(0).max(99).optional(),mapping:z.record(z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),z.string().regex(/^[a-z][a-z0-9_]{0,63}$/))}).strict().parse(input);
  await access(this.db,a,w);
  const receipt=(await this.db.query("SELECT * FROM connector_invocations WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND status='succeeded'",[invocationId,w,a.userId])).rows[0];if(!receipt)fail(404,'not_found','Connector result unavailable');
  return withActor({...a,accessToolId:receipt.app_id},async()=>{
   const {config,row}=await this.connection(this.db,a,w,receipt.connection_id),app=await this.app(this.db,{...a,accessToolId:receipt.app_id},w,receipt.app_id);
   if(row.removed_at||!config.enabled||config.expiresAt&&Date.parse(config.expiresAt)<=Date.now()||app.archived||app.project_archived)fail(403,'connector_disabled','Connector or app is unavailable');
   const operation=config.operations.find(o=>o.id===receipt.operation&&o.users.includes(a.userId)&&o.apps.includes(app.id)&&(a.origin!=='ai'||o.aiEnabled)),destination=operation?.destinations.find(d=>d.typeId===v.typeId),binding=app.bindings.find((b:any)=>b.typeId===v.typeId);
   if(!operation||!destination||!binding)fail(403,'connector_destination','This destination is not permitted');
   const values=Array.isArray(receipt.result)?receipt.result[v.row??0]:receipt.result;
   if(!values||typeof values!=='object'||Array.isArray(values)||Object.keys(v.mapping).length===0||Object.entries(v.mapping).some(([field,response])=>!destination.fields.includes(field)||!binding.fields.includes(field)||!operation.response.fields.includes(response)||!Object.hasOwn(values,response)))fail(403,'connector_destination','Response mapping exceeds the permitted fields');
   const data=Object.fromEntries(Object.entries(v.mapping).map(([field,response])=>[field,values[response]]));
   const change=v.recordId?{kind:'update_record',recordId:v.recordId,expectedVersion:v.expectedVersion,data}:{kind:'create_record',typeId:v.typeId,data};
   if(v.recordId){const record=(await this.db.query('SELECT type_id FROM records WHERE id=$1 AND workspace_id=$2',[v.recordId,w])).rows[0];if(!record||record.type_id!==v.typeId||v.expectedVersion===undefined)fail(400,'connector_destination','Select the current destination record');}
   return {kind:'apply_component_records',componentId:app.id,expectedVersion:app.version,changes:[change]};
  });
 }
}
export function filterResponse(raw:string,operation:ConnectorOperation,secret:string):unknown{
 if(Buffer.byteLength(raw)>65536)fail(413,'connector_response_size','Connector response exceeds 64 KiB');
 const redact=(v:unknown):unknown=>{if(typeof v==='string'){let text=v;for(const token of secret?[secret,encodeURIComponent(secret),Buffer.from(secret).toString('base64')]:[])text=text.split(token).join('[redacted]');return text;}if(Array.isArray(v))return v.map(redact);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,value])=>[String(redact(k)),redact(value)]));return v;};
 if(operation.response.format==='text')return redact(raw);
 const data=JSON.parse(raw),pick=(r:unknown)=>{if(!r||typeof r!=='object'||Array.isArray(r))fail(502,'connector_response','Expected an object response');return Object.fromEntries(operation.response.fields.filter(f=>Object.hasOwn(r,f)).map(f=>[f,redact((r as any)[f])]));};
 return Array.isArray(data)?data.slice(0,100).map(pick):pick(data);
}
