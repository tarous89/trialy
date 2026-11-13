import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Connection,Database} from '../db/database.js';
import {fail,type Actor} from '../shared/schema.js';
import {checksum} from '../domain/evidence.js';
import {appPublicUrl,PLATFORM_ORIGIN} from '../shared/public-url.js';
import type {EmailTransport} from './jobs.js';

/**
 * Outbound email for external exchanges (docs/product/EXTERNAL_EXCHANGE.md §2.3).
 * Every message is sent from no-reply@trialagents.com with a display name that always ends
 * in " at TrialAgents", Reply-To the sending person, links only (no attachments, no tracking
 * pixels), a fixed footer naming the sender and organization, and a report-abuse link.
 * Text is prepared from defaults with placeholders, edited for the batch or personalised per
 * recipient, shown exactly as it will be sent, and confirmed by a person before anything is queued.
 */
export const FROM_ADDRESS='no-reply@trialagents.com';
export const SUFFIX=' at TrialAgents';
export const EMAIL_TYPES=['invitation','reminder','clarification','message','extended','revoked'] as const;
export type EmailType=typeof EMAIL_TYPES[number];
export const PLACEHOLDERS=['recipient_name','recipient_company','sender_name','sender_company','title','deadline','link','message'] as const;
export const emailTextSchema=z.object({subject:z.string().trim().min(1).max(200),body:z.string().trim().min(1).max(10000)}).strict();
export const emailDefaultsSchema=z.partialRecord(z.enum(EMAIL_TYPES),emailTextSchema);
export const platformDefaults:Record<EmailType,{subject:string;body:string}>={
 invitation:{subject:'{title} — your response is requested by {deadline}',body:'Dear {recipient_name},\n\n{sender_name} from {sender_company} has invited {recipient_company} to respond to "{title}".\n\nOpen your page to read the brief, download the documents and submit your response by {deadline}:\n{link}\n\nYou can save a draft and come back until the deadline.'},
 reminder:{subject:'Reminder: {title} is due {deadline}',body:'Dear {recipient_name},\n\nThis is a reminder that your response to "{title}" is due by {deadline}.\n\nOpen your page to review or submit your response:\n{link}'},
 clarification:{subject:'Clarification published: {title}',body:'Dear {recipient_name},\n\nA clarification was published for all recipients of "{title}":\n\n{message}\n\nRead it on your page:\n{link}'},
 message:{subject:'New message about {title}',body:'Dear {recipient_name},\n\n{sender_name} from {sender_company} wrote to you about "{title}":\n\n{message}\n\nReply on your page:\n{link}'},
 extended:{subject:'Deadline extended: {title}',body:'Dear {recipient_name},\n\nThe deadline for "{title}" has been extended to {deadline}.\n\nOpen your page:\n{link}'},
 revoked:{subject:'Access closed: {title}',body:'Dear {recipient_name},\n\n{sender_name} from {sender_company} has closed your access to "{title}". Anything you already submitted is kept by the sender.\n\nIf you have questions, reply to this email.'}
};
export type EmailValues=Record<typeof PLACEHOLDERS[number],string>;
export const fill=(template:string,values:EmailValues)=>template.replace(/\{([a-z_]+)\}/g,(m,key)=>key in values?values[key as keyof EmailValues]:m);
const clean=(s:string)=>s.replace(/[\r\n<>"]/g,' ').replace(/\s+/g,' ').trim();
/** The name part is editable; the suffix is fixed so recipients always see where the email comes from. */
export function displayName(namePart:string){const part=clean(namePart).replace(/\s+at TrialAgents$/i,'').slice(0,60);if(!part)fail(400,'display_name','Choose a display name');return part+SUFFIX;}
export const reportAbuseUrl=(emailId?:string)=>`${PLATFORM_ORIGIN}/report-abuse${emailId?'?email='+encodeURIComponent(emailId):''}`;
export function footer(sender:{name:string;company:string;email:string},link:string|null,emailId:string){
 return `\n\n—\nSent by ${clean(sender.name)} (${clean(sender.company)}) through TrialAgents. Replies go to ${sender.email}${link?'; you can also answer on your page: '+link:''}.\nTrialAgents sends this email on behalf of ${clean(sender.company)} and never shares your address. Report abuse: ${reportAbuseUrl(emailId)}`;
}
/** Rendered exactly as sent: placeholders filled, the link always present, the footer always appended. */
export function renderEmail(text:{subject:string;body:string},values:EmailValues,sender:{name:string;company:string;email:string},link:string|null,emailId:string){
 const subject=clean(fill(text.subject,values)).slice(0,200);let body=fill(text.body,values).replace(/\r\n/g,'\n').trim();
 if(link&&!body.includes(link))body+=`\n\nYour page: ${link}`;
 return {subject,text:body+footer(sender,link,emailId)};
}
export const exchangeLink=(token:string)=>new URL('/exchange#'+token,appPublicUrl()).toString();
export const formatDeadline=(d:Date|string)=>new Date(d).toLocaleString('en-GB',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC';
export function emailValues(group:any,exchange:any,sender:{name:string;company:string},message=''):EmailValues{
 return {recipient_name:exchange.recipient_name||'recipient',recipient_company:exchange.recipient_company||'your organization',sender_name:sender.name,sender_company:sender.company,title:group.title,deadline:formatDeadline(exchange.expires_at),link:exchangeLink(exchange.link_token),message};
}
/** Workspace default (saved by the workspace) replaces the app default, which replaces the platform default. */
export async function resolveDefault(tx:Connection,w:string,group:any|null,type:EmailType){
 const saved=(await tx.query('SELECT subject,body FROM exchange_email_defaults WHERE workspace_id=$1 AND email_type=$2',[w,type])).rows[0];
 if(saved)return {subject:saved.subject,body:saved.body,source:'workspace' as const};
 const app=group?.email_defaults?.[type];if(app?.subject&&app?.body)return {subject:app.subject,body:app.body,source:'app' as const};
 return {...platformDefaults[type],source:'platform' as const};
}
export async function senderIdentity(tx:Connection,a:Actor,w:string,p:any,choice?:{nameKind?:'organization'|'person'|'custom';customName?:string}){
 const user=(await tx.query('SELECT email,name FROM users WHERE id=$1',[a.userId])).rows[0];if(!user)fail(404,'not_found','Sender unavailable');
 const tenant=(await tx.query('SELECT name FROM tenants WHERE id=$1',[p.tenant_id])).rows[0];
 const saved=(await tx.query('SELECT name_kind,custom_name FROM exchange_sender_preferences WHERE workspace_id=$1 AND user_id=$2',[w,a.userId])).rows[0];
 const kind=choice?.nameKind??saved?.name_kind??'organization',custom=choice?.customName??saved?.custom_name??'';
 const organization=tenant?.name??p.name,firstName=String(user.name).trim().split(/\s+/)[0]||user.name;
 const part=kind==='organization'?organization:kind==='person'?firstName:custom;
 return {kind,customName:custom,displayName:displayName(part),replyTo:String(user.email).toLowerCase(),senderName:user.name,senderCompany:organization,firstName,organization};
}
export async function rememberSender(tx:Connection,a:Actor,w:string,kind:string,customName:string){
 await tx.query('INSERT INTO exchange_sender_preferences(workspace_id,user_id,name_kind,custom_name,updated_at) VALUES($1,$2,$3,$4,now()) ON CONFLICT(workspace_id,user_id) DO UPDATE SET name_kind=$3,custom_name=$4,updated_at=now()',[w,a.userId,kind,customName]);
}
export const emailLimits={get workspaceDaily(){return Number(process.env.EXCHANGE_EMAIL_DAILY_LIMIT??200);},get recipientDaily(){return Number(process.env.EXCHANGE_EMAIL_RECIPIENT_DAILY_LIMIT??20);},verificationHourly:5};
// The suppression list is worker-readable; web paths skip the check (never fail a transaction on it) and the worker re-checks before every send.
async function suppressed(tx:Connection,email:string){if(!(await tx.query("SELECT has_table_privilege('notification_suppressions','SELECT') AS ok")).rows[0]?.ok)return false;return !!(await tx.query('SELECT email FROM notification_suppressions WHERE email=$1',[email.toLowerCase()])).rows.length;}
/** Per-workspace and per-recipient daily limits apply to every queued message; the batch fails as a whole before anything is queued. */
export async function assertEmailBudget(tx:Connection,w:string,recipients:string[]){
 const n=Number((await tx.query("SELECT count(*) AS n FROM exchange_emails WHERE workspace_id=$1 AND created_at>now()-interval '24 hours' AND status<>'suppressed'",[w])).rows[0].n);
 if(n+recipients.length>emailLimits.workspaceDaily)fail(429,'email_limit',`This workspace can send ${emailLimits.workspaceDaily} exchange emails per day; ${n} were sent in the last 24 hours`);
 for(const to of new Set(recipients.map(e=>e.toLowerCase()))){const r=Number((await tx.query("SELECT count(*) AS n FROM exchange_emails WHERE workspace_id=$1 AND to_email=$2 AND created_at>now()-interval '24 hours' AND status<>'suppressed'",[w,to])).rows[0].n);if(r+recipients.filter(e=>e.toLowerCase()===to).length>emailLimits.recipientDaily)fail(429,'email_limit',`${to} already received ${emailLimits.recipientDaily} emails today`);}
}
export type QueuedEmail={id:string;status:'queued'|'suppressed'};
export async function queueEmail(tx:Connection,m:{id?:string;workspaceId:string;groupId?:string|null;exchangeId?:string|null;batchId?:string|null;emailType:string;to:string;fromName:string;replyTo:string|null;subject:string;text:string}):Promise<QueuedEmail>{
 const id=m.id??randomUUID(),to=m.to.toLowerCase(),status=(await suppressed(tx,to))?'suppressed':'queued';
 await tx.query('INSERT INTO exchange_emails(id,workspace_id,group_id,exchange_id,batch_id,email_type,to_email,from_name,reply_to,subject,text,status,diagnostic) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',[id,m.workspaceId,m.groupId??null,m.exchangeId??null,m.batchId??null,m.emailType,to,m.fromName,m.replyTo,m.subject,m.text,status,status==='suppressed'?'suppression_list':null]);
 return {id,status};
}
/** A system email (clarification, message, extension, revocation, verification code) rendered from the resolved default. */
export async function queueExchangeNotice(tx:Connection,a:Actor,w:string,p:any,group:any,exchange:any,type:EmailType,message=''){
 const sender=await senderIdentity(tx,{userId:group.owner_id,origin:'human'},w,p),text=await resolveDefault(tx,w,group,type),values=emailValues(group,exchange,{name:sender.senderName,company:sender.senderCompany},message);
 const recipients:string[]=exchange.recipient_emails;await assertEmailBudget(tx,w,recipients);const queued=[];
 for(const to of recipients){const id=randomUUID();const rendered=renderEmail(text,values,{name:sender.senderName,company:sender.senderCompany,email:sender.replyTo},type==='revoked'?null:values.link,id);queued.push(await queueEmail(tx,{id,workspaceId:w,groupId:group.id,exchangeId:exchange.id,emailType:type,to,fromName:sender.displayName,replyTo:sender.replyTo,subject:rendered.subject,text:rendered.text}));}
 return queued;
}
export const prepareEmailSchema=z.object({groupId:z.string().uuid(),emailType:z.enum(EMAIL_TYPES),exchangeIds:z.array(z.string().uuid()).min(1).max(200).optional(),subject:z.string().trim().min(1).max(200).optional(),body:z.string().trim().min(1).max(10000).optional(),overrides:z.record(z.string().uuid(),z.object({subject:z.string().trim().min(1).max(200).optional(),body:z.string().trim().min(1).max(10000).optional()}).strict()).default({}),message:z.string().max(5000).default(''),nameKind:z.enum(['organization','person','custom']).optional(),customName:z.string().max(80).optional(),scheduleAt:z.iso.datetime().optional()}).strict();
export type PrepareEmail=z.infer<typeof prepareEmailSchema>;
/**
 * Build the batch exactly as it will be sent: one rendered email per recipient address of each selected
 * exchange, from the batch text (default or edited) with optional per-recipient personalisation.
 * Recipients are limited to the exchanges' recipient lists. Stored with a digest for human confirmation.
 */
export async function prepareExchangeEmail(tx:Connection,a:Actor,w:string,p:any,group:any,exchanges:any[],input:PrepareEmail){
 const selected=input.exchangeIds?exchanges.filter(e=>input.exchangeIds!.includes(e.id)):exchanges;
 if(input.exchangeIds&&selected.length!==new Set(input.exchangeIds).size)fail(404,'not_found','Choose recipients of this exchange group');
 if(!selected.length)fail(400,'no_recipients','This group has no active recipients');
 if(Object.keys(input.overrides).some(id=>!selected.some(e=>e.id===id)))fail(400,'override_scope','Personalise only selected recipients');
 if(input.scheduleAt&&selected.some(e=>new Date(input.scheduleAt!).getTime()>=new Date(e.expires_at).getTime()))fail(400,'schedule_late','Schedule reminders before every selected deadline');
 if(input.scheduleAt&&new Date(input.scheduleAt).getTime()<Date.now())fail(400,'schedule_past','Schedule a future time');
 const sender=await senderIdentity(tx,a,w,p,{nameKind:input.nameKind,customName:input.customName}),base=await resolveDefault(tx,w,group,input.emailType);
 const batchText={subject:input.subject??base.subject,body:input.body??base.body},id=randomUUID(),rendered=[];
 for(const e of selected){const o=input.overrides[e.id]??{},text={subject:o.subject??batchText.subject,body:o.body??batchText.body},values=emailValues(group,e,{name:sender.senderName,company:sender.senderCompany},input.message);
  for(const to of e.recipient_emails as string[]){const emailId=randomUUID();rendered.push({emailId,exchangeId:e.id,to,recipientName:e.recipient_name,personalised:!!(o.subject||o.body),...renderEmail(text,values,{name:sender.senderName,company:sender.senderCompany,email:sender.replyTo},input.emailType==='revoked'?null:values.link,emailId)});}}
 const envelope={id,groupId:group.id,emailType:input.emailType,from:`${sender.displayName} <${FROM_ADDRESS}>`,replyTo:sender.replyTo,scheduledAt:input.scheduleAt??null,batchText,overrides:input.overrides,emails:rendered.map(r=>({exchangeId:r.exchangeId,to:r.to,subject:r.subject,text:r.text,personalised:r.personalised}))},digest=checksum(JSON.stringify(envelope));
 await tx.query('INSERT INTO exchange_email_batches(id,workspace_id,group_id,email_type,display_name,reply_to,sender_user_id,subject_template,body_template,overrides,rendered,digest,scheduled_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',[id,w,group.id,input.emailType,sender.displayName,sender.replyTo,a.userId,batchText.subject,batchText.body,JSON.stringify(input.overrides),JSON.stringify(rendered),digest,input.scheduleAt??null,a.userId]);
 await rememberSender(tx,a,w,sender.kind,sender.customName);
 return {batchId:id,digest,from:envelope.from,replyTo:sender.replyTo,displayName:sender.displayName,nameKind:sender.kind,scheduledAt:input.scheduleAt??null,emailType:input.emailType,defaultSource:base.source,batchText,recipients:rendered.map(r=>({exchangeId:r.exchangeId,to:r.to,recipientName:r.recipientName,subject:r.subject,text:r.text,personalised:r.personalised})),fixed:'The link, the sender identity (From, Reply-To) and the footer are added by TrialAgents and cannot be removed.',confirmation:'A person confirms this batch through workspace review (send_exchange_email with this batchId and digest). Assistants can draft, edit and personalise but never send.'};
}
export async function batchReview(tx:Connection,w:string,batchId:string,digest:string){
 const b=(await tx.query('SELECT * FROM exchange_email_batches WHERE id=$1 AND workspace_id=$2',[batchId,w])).rows[0];if(!b)fail(404,'not_found','Email batch unavailable');
 if(b.digest!==digest)fail(409,'batch_changed','Prepare the email again');if(b.status!=='prepared')fail(409,'batch_used','This batch was already confirmed or cancelled');
 return b;
}
/** Human confirmation turns the prepared batch into queued messages (or a scheduled reminder using the saved text). */
export async function confirmExchangeBatch(tx:Connection,a:Actor,w:string,batchId:string,digest:string){
 const b=await batchReview(tx,w,batchId,digest),rendered:any[]=b.rendered;await assertEmailBudget(tx,w,rendered.map(r=>r.to));
 await tx.query("UPDATE exchange_email_batches SET status=$2,confirmed_at=now(),confirmed_by=$3 WHERE id=$1",[b.id,b.scheduled_at?'confirmed':'sent',a.userId]);
 if(b.scheduled_at)return {batchId:b.id,scheduledAt:b.scheduled_at,queued:[]};
 return {batchId:b.id,scheduledAt:null,queued:await queueBatch(tx,b)};
}
async function queueBatch(tx:Connection,b:any){const queued=[];for(const r of b.rendered as any[])queued.push(await queueEmail(tx,{id:r.emailId,workspaceId:b.workspace_id,groupId:b.group_id,exchangeId:r.exchangeId,batchId:b.id,emailType:b.email_type,to:r.to,fromName:b.display_name,replyTo:b.reply_to,subject:r.subject,text:r.text}));return queued;}
/** Reminders the owner approved in advance: queued at the scheduled time with the saved text, skipping exchanges revoked or closed since. */
export async function runScheduledExchangeBatches(db:Database){
 const due=(await db.query("SELECT * FROM exchange_email_batches WHERE status='confirmed' AND scheduled_at<=now() ORDER BY scheduled_at LIMIT 20")).rows;
 for(const b of due)await db.transaction(async tx=>{
  const current=(await tx.query("SELECT * FROM exchange_email_batches WHERE id=$1 AND status='confirmed' FOR UPDATE",[b.id])).rows[0];if(!current)return;
  const live=(await tx.query('SELECT e.id FROM exchanges e JOIN exchange_groups g ON g.id=e.group_id WHERE e.group_id=$1 AND e.revoked_at IS NULL AND e.expires_at>now() AND NOT g.archived',[b.group_id])).rows.map(r=>r.id);
  const rendered=(current.rendered as any[]).filter(r=>live.includes(r.exchangeId));const p=(await tx.query('SELECT id,tenant_id FROM workspaces WHERE id=$1',[b.workspace_id])).rows[0];
  await queueBatch(tx,{...current,rendered});await tx.query("UPDATE exchange_email_batches SET status='sent' WHERE id=$1",[b.id]);
  await tx.query('INSERT INTO audit_events(id,workspace_id,tenant_id,actor_id,action,object_id,origin,after_value) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),b.workspace_id,p.tenant_id,current.confirmed_by,'exchange.reminder_sent',b.id,'worker',JSON.stringify({emailType:current.email_type,recipients:rendered.map(r=>r.to),skipped:(current.rendered as any[]).length-rendered.length,approvedAt:current.confirmed_at})]);
 });
 return due.length;
}
/** Worker delivery through the configured provider. Returns false when nothing was waiting. */
export async function deliverExchangeEmails(db:Database,send:EmailTransport,signal?:AbortSignal){
 const row=await db.transaction(async tx=>{const r=(await tx.query("SELECT * FROM exchange_emails WHERE status='queued' AND available_at<=now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1")).rows[0];if(!r)return null;await tx.query("UPDATE exchange_emails SET attempts=attempts+1,available_at=now()+interval '2 minutes',updated_at=now() WHERE id=$1",[r.id]);return {...r,attempts:r.attempts+1};});
 if(!row)return false;
 try{
  if(await suppressed(db,row.to_email))throw Object.assign(Error('Recipient suppressed'),{permanent:true,code:'suppression_list'});
  if(row.attempts>6||Date.now()-new Date(row.created_at).getTime()>23*3600000)throw Object.assign(Error('Retry window exceeded'),{permanent:true});
  const result=await send({from:`${row.from_name} <${FROM_ADDRESS}>`,to:[row.to_email],subject:row.subject,text:row.text,...(row.reply_to?{reply_to:row.reply_to}:{})},row.id,AbortSignal.any([signal??new AbortController().signal,AbortSignal.timeout(20000)]));
  await db.query("UPDATE exchange_emails SET status='sent',provider_id=$2,sent_at=now(),updated_at=now(),diagnostic=NULL WHERE id=$1",[row.id,result.id]);
 }catch(e:any){
  const permanent=e.permanent||row.attempts>=6;
  await db.query("UPDATE exchange_emails SET status=$2,diagnostic=$3,available_at=$4,updated_at=now() WHERE id=$1",[row.id,permanent?(e.code==='suppression_list'?'suppressed':'failed'):'queued',e.code==='suppression_list'?'suppression_list':permanent?'provider_rejected':'request_failed',new Date(Date.now()+Math.min(300000,1000*2**row.attempts))]);
 }
 return true;
}
/** Provider delivery events (shared webhook) → delivery status; bounces and complaints join the suppression list. */
export async function applyExchangeDeliveryEvents(db:Database){
 await db.query(`UPDATE exchange_emails x SET status=CASE e.event_type WHEN 'email.delivered' THEN 'delivered' WHEN 'email.bounced' THEN 'bounced' WHEN 'email.complained' THEN 'complained' WHEN 'email.failed' THEN 'failed' WHEN 'email.suppressed' THEN 'suppressed' ELSE x.status END,diagnostic=e.event_type,updated_at=now()
  FROM notification_events e WHERE x.provider_id=e.provider_id AND x.status IN ('sent','delivered') AND e.id=(SELECT e2.id FROM notification_events e2 WHERE e2.provider_id=e.provider_id ORDER BY CASE e2.event_type WHEN 'email.complained' THEN 7 WHEN 'email.bounced' THEN 6 WHEN 'email.suppressed' THEN 5 WHEN 'email.failed' THEN 4 WHEN 'email.delivered' THEN 3 ELSE 1 END DESC,e2.created_at DESC LIMIT 1) AND e.event_type IN ('email.delivered','email.bounced','email.complained','email.failed','email.suppressed')`);
 await db.query("INSERT INTO notification_suppressions(email,reason) SELECT DISTINCT lower(value),event_type FROM notification_events CROSS JOIN LATERAL jsonb_array_elements_text(recipients) WHERE event_type IN ('email.bounced','email.complained','email.suppressed') ON CONFLICT(email) DO NOTHING");
}
