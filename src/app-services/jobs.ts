import {randomUUID,createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import type {Database} from '../db/database.js';
import {withActor} from '../db/context.js';
import {access} from '../domain/permissions.js';
import {checksum} from '../domain/evidence.js';
import {fail,type Actor} from '../shared/schema.js';
import {Connectors} from '../connectors/service.js';
import {WorkspaceFoundation} from '../workspace/service.js';
const J=JSON.stringify;
export async function enqueueServiceJob(db:Database,a:Actor,w:string,appId:string|null,kind:'email'|'connector',requestKey:string,payload:any,seconds=300){
 await access(db,a,w);if(Buffer.byteLength(J(payload))>150000)fail(413,'job_size','Request is too large');
 const digest=checksum(J(payload));return db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);
  const previous=(await tx.query('SELECT id,status,digest FROM app_service_jobs WHERE workspace_id=$1 AND user_id=$2 AND request_key=$3',[w,a.userId,requestKey])).rows[0];if(previous){if(previous.digest!==digest)fail(409,'request_changed','Request key already used');return {id:previous.id,status:previous.status,replayed:true};}
  const n=Number((await tx.query("SELECT count(*) AS n FROM app_service_jobs WHERE workspace_id=$1 AND created_at>now()-interval '24 hours'",[w])).rows[0].n);if(n>=1000)fail(429,'job_limit','Daily workspace action limit reached');
  const id=randomUUID();await tx.query('INSERT INTO app_service_jobs(id,workspace_id,user_id,app_id,kind,request_key,digest,payload,deadline_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,w,a.userId,appId,kind,requestKey,digest,J(payload),new Date(Date.now()+Math.min(86400000,Math.max(60000,seconds*1000)))]);return {id,status:'queued'};
 });
}
export async function serviceJob(db:Database,a:Actor,w:string,id:string,appId?:string){
 await access(db,a,w);const j=(await db.query('SELECT * FROM app_service_jobs WHERE id=$1 AND workspace_id=$2 AND user_id=$3',[id,w,a.userId])).rows[0];if(!j||appId&&j.app_id!==appId)fail(404,'not_found','Job unavailable');
 await authorizeJob(db,j,true);return {id:j.id,status:j.status,result:j.result,diagnostic:j.diagnostic,deliveryStatus:j.delivery_status,createdAt:j.created_at,finishedAt:j.finished_at};
}
export async function authorizeJob(db:Database,j:any,reading=false){
 const a:Actor={userId:j.user_id,origin:j.payload.origin??'ai',...(j.app_id?{accessToolId:j.app_id}:{})};
 return withActor(a,async()=>{
  if(j.payload.action){const {AppActions}=await import('./service.js');await new AppActions(db).authorizeRun(j.payload.action.runId,j.payload.action.version,reading);}
  else if(j.kind==='connector'){const f=new WorkspaceFoundation(db),c=new Connectors(db,(tx,a,w,id)=>f.component(tx,a,w,id)),b=await c.inspect(db,a,j.workspace_id,j.payload.call);if(b.digest!==j.payload.digest)fail(409,'connector_changed','Connector request changed');if(b.reviewRequired){const r=(await db.query("SELECT * FROM connector_reviews WHERE id=$1 AND user_id=$2 AND kind='invoke'",[j.payload.reviewId,j.user_id])).rows[0];if(!r||r.body.digest!==j.payload.digest)fail(403,'connector_review','Missing exact approval');}}
  else if(j.payload.invitation&&!reading){const {checkInvitationDelivery}=await import('./sharing.js');await checkInvitationDelivery(db,j);}
  else if(!j.payload.invitation)fail(403,'job_authority','Job has no active authority');
  return a;
 });
}
export type EmailTransport=(payload:{from:string;to:string[];subject:string;text:string;headers?:Record<string,string>},key:string,signal:AbortSignal)=>Promise<{id:string}>;
export const resendEmail:EmailTransport=async(payload,key,signal)=>{
 const apiKey=process.env.APP_NOTIFICATION_RESEND_API_KEY??process.env.RESEND_API_KEY;if(!apiKey)throw Object.assign(Error('Email service is not configured'),{permanent:true});
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+apiKey,'content-type':'application/json','Idempotency-Key':key},body:J(payload),signal});
 if(!response.ok)throw Object.assign(Error('Email provider rejected request'),{permanent:response.status>=400&&response.status<500&&response.status!==429});
 const body=await response.json() as any;if(typeof body.id!=='string')throw Error('Invalid email receipt');return {id:body.id};
};
export async function processServiceJob(db:Database,options:{email?:EmailTransport;connector?:Connectors;kind?:'email';signal?:AbortSignal}={}){
 // Never blindly resubmit an interrupted external operation. Email retries share the same provider key.
 await db.query("UPDATE app_service_jobs SET status='unknown',diagnostic='interrupted_request',finished_at=now() WHERE status='running' AND lease_until<now() AND kind='connector'");
 await db.query("UPDATE app_service_jobs SET status='queued',available_at=now(),lease_token=NULL,lease_until=NULL WHERE status='running' AND lease_until<now() AND kind='email'");
 const j=await db.transaction(async tx=>{const row=(await tx.query("SELECT * FROM app_service_jobs WHERE status='queued' AND available_at<=now() AND ($1::text IS NULL OR kind=$1) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1",[options.kind??null])).rows[0];if(!row)return null;const token=randomUUID();await tx.query("UPDATE app_service_jobs SET status='running',lease_token=$2,lease_until=now()+interval '45 seconds',attempts=attempts+1 WHERE id=$1",[row.id,token]);return {...row,lease_token:token,attempts:row.attempts+1};});if(!j)return false;
 const controller=new AbortController(),stop=()=>controller.abort();options.signal?.addEventListener('abort',stop,{once:true});let checking=false;
 const heartbeat=setInterval(()=>{if(checking)return;checking=true;void db.query("UPDATE app_service_jobs SET lease_until=now()+interval '45 seconds' WHERE id=$1 AND status='running' AND lease_token=$2 RETURNING id",[j.id,j.lease_token]).then(r=>{if(!r.rows.length)controller.abort();}).catch(()=>controller.abort()).finally(()=>{checking=false;});},10000);
 const timeout=setTimeout(()=>controller.abort(),Math.max(1,new Date(j.deadline_at).getTime()-Date.now()));
 const active=async()=>{const current=(await db.query('SELECT status,lease_token FROM app_service_jobs WHERE id=$1',[j.id])).rows[0];if(controller.signal.aborted||current?.status!=='running'||current.lease_token!==j.lease_token)fail(409,'job_stopped','Job stopped');return authorizeJob(db,j);};
 try{
  const a=await active();let result:any,providerId:string|null=null;
  if(j.kind==='email'){
   const message=z.object({to:z.array(z.email()).min(1).max(20),subject:z.string().min(1).max(200),text:z.string().min(1).max(20000),appName:z.string().max(100).optional()}).parse(j.payload.message);
   if((await db.query('SELECT email FROM notification_suppressions WHERE email=ANY($1::text[])',[message.to.map(e=>e.toLowerCase())])).rows.length)throw Object.assign(Error('Recipient suppressed'),{permanent:true});
   if(j.attempts>6||Date.now()-new Date(j.created_at).getTime()>23*3600000)throw Object.assign(Error('Retry window exceeded'),{permanent:true});
   await active();const display=(message.appName??'TrialAgents').replace(/[<>\r\n"]/g,'').slice(0,80);
   result=await (options.email??resendEmail)({from:`${display}${display==='TrialAgents'?'':' via TrialAgents'} <notifications@trialagents.com>`,to:message.to,subject:message.subject,text:message.text},j.id,AbortSignal.any([controller.signal,AbortSignal.timeout(20000)]));providerId=result.id;
  }else{
   const f=new WorkspaceFoundation(db),c=options.connector??new Connectors(db,(tx,a,w,id)=>f.component(tx,a,w,id));result=await withActor(a,()=>c.executeAuthorized(a,j.workspace_id,j.payload.call,async()=>{await active();},controller.signal));if(result.status!=='succeeded')throw Object.assign(Error('Connector outcome '+result.status),{unknown:result.status==='unknown',permanent:true});
  }
  await db.query("UPDATE app_service_jobs SET status='succeeded',result=$2,provider_id=$3,delivery_status=$4,finished_at=now(),lease_until=NULL WHERE id=$1 AND status='running' AND lease_token=$5",[j.id,J(result),providerId,j.kind==='email'?'accepted':null,j.lease_token]);
 }catch(e:any){
  const retry=j.kind==='email'&&!e.permanent&&![403,404,409].includes(e.status)&&j.attempts<6&&Date.now()+300000<new Date(j.deadline_at).getTime();
  await db.query("UPDATE app_service_jobs SET status=$2,diagnostic=$3,available_at=$4,finished_at=CASE WHEN $2='queued' THEN NULL ELSE now() END,lease_until=NULL WHERE id=$1 AND status='running' AND lease_token=$5",[j.id,retry?'queued':e.unknown||j.kind==='connector'&&!e.permanent?'unknown':'failed',e.status?'authorization_unavailable':e.permanent?'provider_rejected':'request_failed',new Date(Date.now()+Math.min(300000,1000*2**j.attempts)),j.lease_token]);
 }finally{clearInterval(heartbeat);clearTimeout(timeout);options.signal?.removeEventListener('abort',stop);}return true;
}
export async function receiveDeliveryEvent(db:Database,raw:Buffer,headers:Record<string,any>,secret=process.env.RESEND_WEBHOOK_SECRET){
 if(!secret)fail(503,'webhook_unconfigured','Delivery tracking unavailable');const id=String(headers['svix-id']??''),stamp=String(headers['svix-timestamp']??''),signature=String(headers['svix-signature']??'');
 if(!id||id.length>200||!/^\d+$/.test(stamp)||Math.abs(Date.now()/1000-Number(stamp))>300)fail(401,'webhook_signature','Invalid event signature');
 const expected=createHmac('sha256',Buffer.from(secret.replace(/^whsec_/,''),'base64')).update(id+'.'+stamp+'.').update(raw).digest();
 if(!signature.split(' ').some(part=>{const [version,s]=part.split(',');const actual=Buffer.from(s??'','base64');return version==='v1'&&actual.length===expected.length&&timingSafeEqual(actual,expected);}))fail(401,'webhook_signature','Invalid event signature');
 const event=z.object({type:z.enum(['email.sent','email.delivered','email.bounced','email.complained','email.failed','email.delivery_delayed','email.suppressed']),data:z.object({email_id:z.string().max(200),to:z.array(z.email()).max(100).default([])})}).parse(JSON.parse(raw.toString()));
 await db.query('SELECT trialy_security.ingest_notification_event($1,$2,$3,$4::jsonb)',[id,event.data.email_id,event.type,J(event.data.to)]);return {received:true};
}
export async function applyDeliveryEvents(db:Database){
 await db.query("UPDATE app_service_jobs j SET delivery_status=e.event_type FROM notification_events e WHERE j.provider_id=e.provider_id AND e.id=(SELECT e2.id FROM notification_events e2 WHERE e2.provider_id=e.provider_id ORDER BY CASE e2.event_type WHEN 'email.complained' THEN 7 WHEN 'email.bounced' THEN 6 WHEN 'email.suppressed' THEN 5 WHEN 'email.failed' THEN 4 WHEN 'email.delivered' THEN 3 WHEN 'email.delivery_delayed' THEN 2 ELSE 1 END DESC,e2.created_at DESC,e2.id DESC LIMIT 1) AND j.delivery_status IS DISTINCT FROM e.event_type");
 await db.query("INSERT INTO notification_suppressions(email,reason) SELECT DISTINCT lower(value),event_type FROM notification_events CROSS JOIN LATERAL jsonb_array_elements_text(recipients) WHERE event_type IN ('email.bounced','email.complained','email.suppressed') ON CONFLICT(email) DO NOTHING");
}
