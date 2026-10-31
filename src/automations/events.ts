import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import type {Database} from '../db/database.js';
import {withActor} from '../db/context.js';
import {checksum} from '../domain/evidence.js';
import {connectorVault} from '../connectors/secrets.js';
import {httpsTransport,type ConnectorTransport} from '../connectors/transport.js';
import {id,fail,type Actor} from '../shared/schema.js';
import {AutomationService,activeSubscription,adapter,signalWork,connectionActive,automationsEnabled} from './service.js';
const args=z.object({workspaceId:id,runnerId:id}).strict();
const callback=z.url().max(2048).refine(v=>{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&(!u.port||u.port==='443');},'Use a public HTTPS callback');
const secret=z.string().max(120).regex(/^whsec_[A-Za-z0-9+/]+={0,2}$/).refine(v=>{const b=Buffer.from(v.slice(6),'base64');return b.length>=24&&b.length<=64&&b.toString('base64')===v.slice(6);},'Invalid signing key');
export const subscribeParams=z.object({name:z.literal('automation.ready'),arguments:args,delivery:z.object({mode:z.literal('webhook'),url:callback,secret}).strict(),cursor:z.string().nullable().optional(),ttlMs:z.number().int().min(60000).max(30*86400000).nullable().optional()}).strict();
export const unsubscribeParams=z.object({name:z.literal('automation.ready'),arguments:args,delivery:z.object({mode:z.literal('webhook'),url:callback}).strict()}).strict();
export const eventDefinition={name:'automation.ready',description:'Approved TrialAgents app work is due. Includes the daily agenda and configured time/database triggers. Fetch current work with read_automation_agenda and execute only claimed, authorized jobs.',delivery:['webhook'],inputSchema:z.toJSONSchema(args),payloadSchema:{type:'object',properties:{runnerId:{type:'string'},workspaceId:{type:'string'},reason:{type:'string'}},required:['runnerId','workspaceId','reason'],additionalProperties:false}};
export function signedHeaders(key:string,eventId:string,body:string,subscriptionId:string,stamp=Math.floor(Date.now()/1000)){
 return {'content-type':'application/json','webhook-id':eventId,'webhook-timestamp':String(stamp),'webhook-signature':'v1,'+createHmac('sha256',Buffer.from(key.slice(6),'base64')).update(eventId+'.'+stamp+'.'+body).digest('base64'),'X-MCP-Subscription-Id':subscriptionId};
}
export class AutomationEvents{
 constructor(readonly db:Database,readonly transport:ConnectorTransport=httpsTransport){}
 async subscribe(a:Actor,input:unknown){
  if(!automationsEnabled())fail(503,'automation_unavailable','Background automation is unavailable');
  const v=subscribeParams.parse(input),s=new AutomationService(this.db),r=await s.runner(a,v.arguments.workspaceId,v.arguments.runnerId);if(!r.enabled||!a.connectionFamily||!a.clientId)fail(403,'setup_required','Approve setup using the connected account first');
  const identity=checksum(JSON.stringify([a.userId,a.clientId,a.connectionFamily,r.id,v.delivery.url])),old=(await this.db.query('SELECT * FROM automation_subscriptions WHERE identity_hash=$1',[identity])).rows[0],subscriptionId=old?.id??`${identity.slice(0,8)}-${identity.slice(8,12)}-8${identity.slice(13,16)}-a${identity.slice(17,20)}-${identity.slice(20,32)}`;
  const vault=connectorVault(),sealed=vault.seal(v.delivery.secret,'automation:'+subscriptionId),challenge=randomUUID(),eventId=randomUUID(),body=JSON.stringify({type:'verification',challenge});
  const cached=old?.enabled&&Date.parse(old.callback_verified_at)>Date.now()-300000&&vault.open(old.secret,'automation:'+subscriptionId)===v.delivery.secret;
  if(!cached){let response;try{response=await this.transport({url:v.delivery.url,method:'POST',body,headers:signedHeaders(v.delivery.secret,eventId,body,subscriptionId),timeoutMs:10000,signal:AbortSignal.timeout(10000)});}catch{fail(400,'callback_verification','Background callback could not be verified');}
  let echoed='';try{echoed=JSON.parse(response.body).challenge??'';}catch{}
  if(response.status<200||response.status>=300||typeof echoed!=='string'||Buffer.byteLength(echoed)!==Buffer.byteLength(challenge)||!timingSafeEqual(Buffer.from(echoed),Buffer.from(challenge)))fail(400,'callback_verification','Background callback could not be verified');}
  const until=new Date(Date.now()+Math.min(v.ttlMs??7*86400000,7*86400000));
  return this.db.transaction(async tx=>{
   await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[r.workspace_id]);const current=await new AutomationService(adapter(tx)).runner(a,r.workspace_id,r.id);if(!current.enabled||!await connectionActive(tx,{user_id:a.userId,connection_family:a.connectionFamily,client_id:a.clientId}))fail(403,'connection_revoked','Connection is inactive');
   await tx.query('UPDATE automation_subscriptions SET enabled=false WHERE runner_id=$1 AND enabled AND expires_at<=now()',[r.id]);
   const active=(await tx.query('SELECT * FROM automation_subscriptions WHERE runner_id=$1 AND enabled',[r.id])).rows[0];if(active&&!await connectionActive(tx,active))await tx.query('UPDATE automation_subscriptions SET enabled=false WHERE id=$1',[active.id]);
   const existing=(await tx.query('SELECT * FROM automation_subscriptions WHERE runner_id=$1 AND enabled',[r.id])).rows[0];
   if(existing&&existing.identity_hash!==identity)fail(409,'runner_subscribed','This runner already has a subscription. Stop the old subscription before reconnecting it');
   const rotated=existing&&vault.open(existing.secret,'automation:'+subscriptionId)!==v.delivery.secret;
   if(rotated)await tx.query("UPDATE automation_subscriptions SET previous_secret=secret,previous_secret_until=now()+interval '5 minutes' WHERE id=$1",[subscriptionId]);
   await tx.query(`INSERT INTO automation_subscriptions(id,workspace_id,user_id,runner_id,identity_hash,connection_family,client_id,callback,secret,expires_at,callback_verified_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now()) ON CONFLICT(identity_hash) DO UPDATE SET secret=EXCLUDED.secret,expires_at=EXCLUDED.expires_at,enabled=true,callback_verified_at=now()`,[subscriptionId,r.workspace_id,a.userId,r.id,identity,a.connectionFamily,a.clientId,v.delivery.url,sealed,until]);
   if(!existing){await tx.query('UPDATE automation_runners SET verified_at=NULL WHERE id=$1',[r.id]);const oid=randomUUID();await tx.query("INSERT INTO automation_occurrences(id,workspace_id,user_id,runner_id,occurrence_key,due_at,reason) VALUES($1,$2,$3,$4,$5,now(),'verification')",[oid,r.workspace_id,a.userId,r.id,'verification:'+subscriptionId+':'+eventId]);await signalWork(tx,r,'verification:'+eventId,'verification');}
   return {id:subscriptionId,refreshBefore:until.toISOString(),cursor:null,truncated:false};
  });
 }
 async unsubscribe(a:Actor,input:unknown){const v=unsubscribeParams.parse(input),r=await new AutomationService(this.db).runner(a,v.arguments.workspaceId,v.arguments.runnerId);if(!a.connectionFamily||!a.clientId)fail(403,'connection_required','Use the connected account');const identity=checksum(JSON.stringify([a.userId,a.clientId,a.connectionFamily,r.id,v.delivery.url]));await this.db.query('UPDATE automation_subscriptions SET enabled=false WHERE identity_hash=$1',[identity]);return {};}
}
export async function deliverAutomationEvent(db:Database,transport:ConnectorTransport=httpsTransport){
 if(!automationsEnabled())return false;
 const event=await db.transaction(async tx=>{await tx.query("UPDATE automation_outbox SET status='queued',lease_token=NULL WHERE status='sending' AND lease_until<now()");const e=(await tx.query("SELECT * FROM automation_outbox WHERE status='queued' AND available_at<=now() ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1")).rows[0];if(!e)return null;const token=randomUUID();await tx.query("UPDATE automation_outbox SET status='sending',attempts=attempts+1,lease_token=$2,lease_until=now()+interval '30 seconds' WHERE id=$1",[e.id,token]);return {...e,attempts:e.attempts+1,lease_token:token};});if(!event)return false;
 return withActor({userId:event.user_id,origin:'ai'},async()=>{
  let status='failed',diagnostic='delivery_failed',retry=false,subscriptionId:string|null=null;
  try{
   const runner=await new AutomationService(db).runner({userId:event.user_id,origin:'ai'},event.workspace_id,event.runner_id),subscription=await activeSubscription(db,event.runner_id);if(!runner.enabled||!subscription){status=runner.enabled?'queued':'cancelled';diagnostic='subscription_unavailable';retry=runner.enabled;}
   else{
    subscriptionId=subscription.id;const key=connectorVault().open(subscription.secret,'automation:'+subscription.id),body=JSON.stringify({eventId:event.id,name:'automation.ready',timestamp:new Date(event.created_at).toISOString(),data:{runnerId:event.runner_id,workspaceId:event.workspace_id,reason:event.reason},cursor:null});
    const headers=signedHeaders(key,event.id,body,subscription.id);if(subscription.previous_secret&&Date.parse(subscription.previous_secret_until)>Date.now())headers['webhook-signature']+=' '+signedHeaders(connectorVault().open(subscription.previous_secret,'automation:'+subscription.id),event.id,body,subscription.id,Number(headers['webhook-timestamp']))['webhook-signature'];
    const response=await transport({url:subscription.callback,method:'POST',body,headers,timeoutMs:10000,signal:AbortSignal.timeout(10000),authorize:async()=>{const latest=await activeSubscription(db,event.runner_id),r=await new AutomationService(db).runner({userId:event.user_id,origin:'ai'},event.workspace_id,event.runner_id);if(!r.enabled||latest?.id!==subscription.id||latest.secret!==subscription.secret)throw Error('revoked');}});
    if(response.status>=200&&response.status<300){status='accepted';diagnostic='accepted';}
    else if(response.status===410){await db.query('UPDATE automation_subscriptions SET enabled=false WHERE id=$1',[subscription.id]);diagnostic='subscription_expired';}
    else {diagnostic=response.status===413?'payload_rejected':'delivery_rejected';retry=response.status===429||response.status>=500;}
   }
  }catch{retry=true;}
  const retrying=retry&&event.attempts<6;await db.query(`UPDATE automation_outbox SET status=$2,diagnostic=$3,subscription_id=$4,available_at=$5,delivered_at=CASE WHEN $2='accepted' THEN now() ELSE delivered_at END,lease_until=NULL WHERE id=$1 AND status='sending' AND lease_token=$6`,[event.id,retrying?'queued':status==='queued'?'failed':status,diagnostic,subscriptionId,new Date(Date.now()+Math.min(3600000,60000*2**event.attempts)),event.lease_token]);return true;
 });
}
