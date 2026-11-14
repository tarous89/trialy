import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Connection,Database} from '../db/database.js';
import {fail,type Actor} from '../shared/schema.js';
import {checksum} from '../domain/evidence.js';
import {appPublicUrl,PLATFORM_ORIGIN} from '../shared/public-url.js';
import type {EmailTransport} from './jobs.js';
import {updateEmailHtml,emailContentText,checkEmailClients,type StoredContent} from '../domain/exchange-update-content.js';

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
export const REQUEST_EMAIL_TYPES=['invitation','reminder','clarification','message','revoked'] as const;
/** Room emails (§5 R8): access granted is the room invitation; the digest goes out automatically only with owner-approved text. */
export const ROOM_EMAIL_TYPES=['access_granted','access_changed','documents_updated','question_answered','answer_published','access_ending','access_revoked','update'] as const;
/** The update email (§6 U2): the room's rendered content as the body, in an HTML part and a plain-text part. */
export const UPDATE_EMAIL_TYPE='update' as const;
export const EMAIL_TYPES=['invitation','reminder','clarification','message','extended','revoked',...ROOM_EMAIL_TYPES] as const;
export type EmailType=typeof EMAIL_TYPES[number];
/** Which email types fit a group: request types for requests, room types for rooms; "extended" for both. */
export function emailTypeFits(kind:string,type:EmailType){if(type===UPDATE_EMAIL_TYPE)return kind==='room';return type==='extended'||(kind==='room'?(ROOM_EMAIL_TYPES as readonly string[]).includes(type):(REQUEST_EMAIL_TYPES as readonly string[]).includes(type));}
export const PLACEHOLDERS=['recipient_name','recipient_company','sender_name','sender_company','title','deadline','link','message','levels','documents'] as const;
export const emailTextSchema=z.object({subject:z.string().trim().min(1).max(200),body:z.string().trim().min(1).max(10000)}).strict();
export const emailDefaultsSchema=z.partialRecord(z.enum(EMAIL_TYPES),emailTextSchema);
export const platformDefaults:Record<EmailType,{subject:string;body:string}>={
 invitation:{subject:'{title} — your response is requested by {deadline}',body:'Dear {recipient_name},\n\n{sender_name} from {sender_company} has invited {recipient_company} to respond to "{title}".\n\nOpen your page to read the brief, download the documents and submit your response by {deadline}:\n{link}\n\nYou can save a draft and come back until the deadline.'},
 reminder:{subject:'Reminder: {title} is due {deadline}',body:'Dear {recipient_name},\n\nThis is a reminder that your response to "{title}" is due by {deadline}.\n\nOpen your page to review or submit your response:\n{link}'},
 clarification:{subject:'Clarification published: {title}',body:'Dear {recipient_name},\n\nA clarification was published for all recipients of "{title}":\n\n{message}\n\nRead it on your page:\n{link}'},
 message:{subject:'New message about {title}',body:'Dear {recipient_name},\n\n{sender_name} from {sender_company} wrote to you about "{title}":\n\n{message}\n\nReply on your page:\n{link}'},
 extended:{subject:'Deadline extended: {title}',body:'Dear {recipient_name},\n\nThe deadline for "{title}" has been extended to {deadline}.\n\nOpen your page:\n{link}'},
 revoked:{subject:'Access closed: {title}',body:'Dear {recipient_name},\n\n{sender_name} from {sender_company} has closed your access to "{title}". Anything you already submitted is kept by the sender.\n\nIf you have questions, reply to this email.'},
 access_granted:{subject:'Access to {title}',body:'Dear {recipient_name},\n\n{sender_name} from {sender_company} has given {recipient_company} access to "{title}" ({levels}).\n\nOpen the room to read the index, view the documents and ask questions:\n{link}\n\nAccess: {deadline}.'},
 access_changed:{subject:'Your access to {title} changed',body:'Dear {recipient_name},\n\nYour access to "{title}" now covers: {levels}.\n\nOpen the room:\n{link}'},
 documents_updated:{subject:'New and updated documents in {title}',body:'Dear {recipient_name},\n\nThese documents were added or updated in "{title}" since your last update:\n\n{documents}\n\nOpen the room:\n{link}'},
 question_answered:{subject:'Your question about {title} was answered',body:'Dear {recipient_name},\n\n{sender_name} from {sender_company} answered your question about "{title}":\n\n{message}\n\nRead it in the room:\n{link}'},
 answer_published:{subject:'New answer in {title}',body:'Dear {recipient_name},\n\nAn answer was published in "{title}":\n\n{message}\n\nRead it in the room:\n{link}'},
 access_ending:{subject:'Your access to {title} ends soon',body:'Dear {recipient_name},\n\nYour access to "{title}" ends on {deadline}. If you need more time, reply to this email.\n\nOpen the room:\n{link}'},
 access_revoked:{subject:'Access closed: {title}',body:'Dear {recipient_name},\n\n{sender_name} from {sender_company} has closed your access to "{title}".\n\nIf you have questions, reply to this email.'},
 update:{subject:'{title}',body:'Dear {recipient_name},\n\n{sender_name} from {sender_company} shared "{title}" with you. The full update follows; you can also read it online.'}
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
/** The "I can help" link of one ask: the person's page, opened at that ask (nothing is recorded until they confirm there). */
export const askLink=(token:string,key:string)=>new URL('/exchange?ask='+encodeURIComponent(key)+'#'+token,appPublicUrl()).toString();
/** Content images: one address per update that names no recipient (no open tracking). */
export const contentImageUrl=(imageToken:string,versionId:string)=>new URL(`/exchange-content/${imageToken}/${versionId}`,appPublicUrl()).toString();
export const unsubscribeLink=(emailId:string)=>new URL('/exchange-unsubscribe/'+emailId,appPublicUrl()).toString();
/** Emails of a series group carry a one-click unsubscribe (RFC 8058) for that series. */
export const seriesLabel=(group:any)=>group.series_name||`updates from ${group.sender_company}`;
export function unsubscribeHeaders(emailId:string){return {'List-Unsubscribe':`<${unsubscribeLink(emailId)}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'};}
/** Whether an address left a group's series. Series are per app: the same key in another app is another series. */
export async function unsubscribedAt(tx:Connection,group:{workspace_id:string;app_id:string|null;series:string|null},email:string):Promise<string|null>{
 if(!group.series)return null;
 return (await tx.query('SELECT created_at FROM exchange_unsubscribes WHERE workspace_id=$1 AND app_id IS NOT DISTINCT FROM $2 AND series=$3 AND email=$4',[group.workspace_id,group.app_id,group.series,email.toLowerCase()])).rows[0]?.created_at??null;
}
/**
 * The update email exactly as sent (§6 U2): the editable intro, then the rendered content (asks as
 * "I can help" links), the personal "view online" link, the confidentiality footer, the sender footer
 * and, for a series, the unsubscribe link. One tree gives both the HTML and the plain-text part.
 */
export function renderUpdateEmail(text:{subject:string;body:string},values:EmailValues,sender:{name:string;company:string;email:string},group:any,exchange:any,emailId:string){
 const content=group.content as StoredContent,link=values.link,subject=clean(fill(text.subject,values)).slice(0,200),intro=fill(text.body,values).replace(/\r\n/g,'\n').trim();
 const ask=content.asks.length?(key:string)=>askLink(exchange.link_token,key):null,image=(v:string)=>contentImageUrl(group.image_token,v);
 const confidentiality=fill(content.confidentiality,values).trim(),unsubscribe=group.series?unsubscribeLink(emailId):null,foot=footer(sender,link,emailId);
 const contentText=emailContentText(content,ask);
 const plain=`${intro}\n\n${contentText}\n\nView online: ${link}\n\n${confidentiality}${foot}${unsubscribe?`\nUnsubscribe from ${seriesLabel(group)}: ${unsubscribe}`:''}`;
 const html=updateEmailHtml({subject,preheader:content.preheader||contentText.replace(/\s+/g,' ').slice(0,140),intro,content,imageUrl:image,askUrl:ask,link,confidentiality,footer:foot,unsubscribeUrl:unsubscribe,seriesLabel:seriesLabel(group)});
 return {subject,text:plain,html,headers:unsubscribe?unsubscribeHeaders(emailId):{},clientChecks:checkEmailClients(html,plain,{link,unsubscribe:!!unsubscribe})};
}
export const formatDeadline=(d:Date|string|null)=>d===null||d===undefined?'until access is revoked':new Date(d).toLocaleString('en-GB',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC';
/** Names of the levels a person holds, in the group's order (room emails). */
export const levelNames=(group:any,exchange:any)=>((group.levels??[]) as any[]).filter(l=>((exchange.levels??[]) as string[]).includes(l.key)).map(l=>l.name).join(', ')||'the room';
export function emailValues(group:any,exchange:any,sender:{name:string;company:string},message='',documents=''):EmailValues{
 return {recipient_name:exchange.recipient_name||'recipient',recipient_company:exchange.recipient_company||'your organization',sender_name:sender.name,sender_company:sender.company,title:group.title,deadline:group.kind==='room'&&exchange.expires_at?'until '+formatDeadline(exchange.expires_at):formatDeadline(exchange.expires_at),link:exchangeLink(exchange.link_token),message,levels:levelNames(group,exchange),documents};
}
/** The link is left out of emails that tell a person their access ended. */
export const linkless=(type:EmailType)=>type==='revoked'||type==='access_revoked';
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
/** Emails a person causes themselves or that go to workspace members are never series mail. */
const notSeriesMail=(type:string)=>type==='verification'||type==='workspace_notification';
async function leftSeries(tx:Connection,groupId:string|null|undefined,type:string,to:string){if(!groupId||notSeriesMail(type))return false;const g=(await tx.query('SELECT workspace_id,app_id,series FROM exchange_groups WHERE id=$1',[groupId])).rows[0];return !!g&&!!await unsubscribedAt(tx,g,to);}
export async function queueEmail(tx:Connection,m:{id?:string;workspaceId:string;groupId?:string|null;exchangeId?:string|null;batchId?:string|null;emailType:string;to:string;fromName:string;replyTo:string|null;subject:string;text:string;html?:string|null;headers?:Record<string,string>}):Promise<QueuedEmail>{
 const id=m.id??randomUUID(),to=m.to.toLowerCase(),left=await leftSeries(tx,m.groupId,m.emailType,to),status=left||(await suppressed(tx,to))?'suppressed':'queued';
 await tx.query('INSERT INTO exchange_emails(id,workspace_id,group_id,exchange_id,batch_id,email_type,to_email,from_name,reply_to,subject,text,status,diagnostic,html,headers) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)',[id,m.workspaceId,m.groupId??null,m.exchangeId??null,m.batchId??null,m.emailType,to,m.fromName,m.replyTo,m.subject,m.text,status,left?'unsubscribed':status==='suppressed'?'suppression_list':null,m.html??null,JSON.stringify(m.headers??{})]);
 return {id,status};
}
/** A system email (clarification, message, extension, revocation, verification code) rendered from the resolved default. */
export async function queueExchangeNotice(tx:Connection,a:Actor,w:string,p:any,group:any,exchange:any,type:EmailType,message=''){
 const sender=await senderIdentity(tx,{userId:group.owner_id,origin:'human'},w,p),text=await resolveDefault(tx,w,group,type),values=emailValues(group,exchange,{name:sender.senderName,company:sender.senderCompany},message);
 const recipients:string[]=exchange.recipient_emails;await assertEmailBudget(tx,w,recipients);const queued=[];
 for(const to of recipients){const id=randomUUID();const rendered=renderEmail(text,values,{name:sender.senderName,company:sender.senderCompany,email:sender.replyTo},linkless(type)?null:values.link,id);queued.push(await queueEmail(tx,{id,workspaceId:w,groupId:group.id,exchangeId:exchange.id,emailType:type,to,fromName:sender.displayName,replyTo:sender.replyTo,subject:rendered.subject,text:rendered.text}));}
 return queued;
}
/**
 * Room notices (§5 R8) sent as part of a reviewed operation (answer, published answer, access change,
 * revocation): rendered in the review exactly as they are queued after a person confirms, with batch
 * text edits, per-recipient personalisation and the display-name choice. Deterministic, so the
 * confirmation can compare it with the review: the report-abuse link carries no per-email id.
 */
export const noticeEmailSchema=z.object({subject:z.string().trim().min(1).max(200).optional(),body:z.string().trim().min(1).max(10000).optional(),overrides:z.record(z.string().uuid(),z.object({subject:z.string().trim().min(1).max(200).optional(),body:z.string().trim().min(1).max(10000).optional()}).strict()).default({}),nameKind:z.enum(['organization','person','custom']).optional(),customName:z.string().max(80).optional()}).strict();
export type NoticeEmail=z.infer<typeof noticeEmailSchema>;
export async function renderNotices(tx:Connection,a:Actor,w:string,p:any,group:any,exchanges:any[],type:EmailType,message:string,option:NoticeEmail|undefined,documentsFor?:(e:any)=>Promise<string>){
 const o=option??{overrides:{}},overrides=o.overrides??{};if(Object.keys(overrides).some(id=>!exchanges.some(e=>e.id===id)))fail(400,'override_scope','Personalise only recipients of this email');
 const sender=await senderIdentity(tx,a,w,p,{nameKind:o.nameKind,customName:o.customName}),base=await resolveDefault(tx,w,group,type),batchText={subject:o.subject??base.subject,body:o.body??base.body},emails=[];
 for(const e of exchanges){const x=overrides[e.id]??{},text={subject:x.subject??batchText.subject,body:x.body??batchText.body},values=emailValues(group,e,{name:sender.senderName,company:sender.senderCompany},message,documentsFor?await documentsFor(e):'');
  for(const to of e.recipient_emails as string[])emails.push({exchangeId:e.id,to,personalised:!!(x.subject||x.body),...renderEmail(text,values,{name:sender.senderName,company:sender.senderCompany,email:sender.replyTo},linkless(type)?null:values.link,'')});}
 return {emailType:type,from:`${sender.displayName} <${FROM_ADDRESS}>`,displayName:sender.displayName,replyTo:sender.replyTo,defaultSource:base.source,batchText,emails};
}
export async function queueNotices(tx:Connection,w:string,group:any,rendered:Awaited<ReturnType<typeof renderNotices>>){
 await assertEmailBudget(tx,w,rendered.emails.map(e=>e.to));const queued=[];
 for(const m of rendered.emails)queued.push(await queueEmail(tx,{workspaceId:w,groupId:group.id,exchangeId:m.exchangeId,emailType:rendered.emailType,to:m.to,fromName:rendered.displayName,replyTo:rendered.replyTo,subject:m.subject,text:m.text}));
 return queued;
}
export const prepareEmailSchema=z.object({groupId:z.string().uuid(),emailType:z.enum(EMAIL_TYPES),exchangeIds:z.array(z.string().uuid()).min(1).max(200).optional(),subject:z.string().trim().min(1).max(200).optional(),body:z.string().trim().min(1).max(10000).optional(),overrides:z.record(z.string().uuid(),z.object({subject:z.string().trim().min(1).max(200).optional(),body:z.string().trim().min(1).max(10000).optional()}).strict()).default({}),message:z.string().max(5000).default(''),nameKind:z.enum(['organization','person','custom']).optional(),customName:z.string().max(80).optional(),scheduleAt:z.iso.datetime().optional()}).strict();
export type PrepareEmail=z.infer<typeof prepareEmailSchema>;
/**
 * Build the batch exactly as it will be sent: one rendered email per recipient address of each selected
 * exchange, from the batch text (default or edited) with optional per-recipient personalisation.
 * Recipients are limited to the exchanges' recipient lists. Stored with a digest for human confirmation.
 */
export async function prepareExchangeEmail(tx:Connection,a:Actor,w:string,p:any,group:any,exchanges:any[],input:PrepareEmail,documentsFor?:(e:any)=>Promise<string>){
 if(!emailTypeFits(group.kind??'request',input.emailType))fail(400,'email_type',`${input.emailType} emails are not used for ${group.kind==='room'?'rooms':'requests'}`);
 if(input.emailType===UPDATE_EMAIL_TYPE&&!group.content)fail(400,'no_content','Add the update content to this room before sending an update email');
 const selected=input.exchangeIds?exchanges.filter(e=>input.exchangeIds!.includes(e.id)):exchanges;
 if(input.exchangeIds&&selected.length!==new Set(input.exchangeIds).size)fail(404,'not_found','Choose recipients of this exchange group');
 if(!selected.length)fail(400,'no_recipients','This group has no active recipients');
 if(Object.keys(input.overrides).some(id=>!selected.some(e=>e.id===id)))fail(400,'override_scope','Personalise only selected recipients');
 if(input.scheduleAt&&selected.some(e=>e.expires_at&&new Date(input.scheduleAt!).getTime()>=new Date(e.expires_at).getTime()))fail(400,'schedule_late','Schedule reminders before every selected deadline');
 if(input.scheduleAt&&new Date(input.scheduleAt).getTime()<Date.now())fail(400,'schedule_past','Schedule a future time');
 const sender=await senderIdentity(tx,a,w,p,{nameKind:input.nameKind,customName:input.customName}),base=await resolveDefault(tx,w,group,input.emailType);
 const batchText={subject:input.subject??base.subject,body:input.body??base.body},id=randomUUID(),rendered:any[]=[],excluded:{exchangeId:string;to:string;reason:'unsubscribed';at:string}[]=[];
 const senderParts={name:sender.senderName,company:sender.senderCompany,email:sender.replyTo};
 for(const e of selected){const o=input.overrides[e.id]??{},text={subject:o.subject??batchText.subject,body:o.body??batchText.body},values=emailValues(group,e,{name:sender.senderName,company:sender.senderCompany},input.message,documentsFor?await documentsFor(e):'');
  for(const to of e.recipient_emails as string[]){
   // An address that left this series gets nothing more from it; the review lists it instead.
   const left=await unsubscribedAt(tx,group,to);if(left){excluded.push({exchangeId:e.id,to,reason:'unsubscribed',at:left});continue;}
   const emailId=randomUUID(),common={emailId,exchangeId:e.id,to,recipientName:e.recipient_name,personalised:!!(o.subject||o.body)};
   if(input.emailType===UPDATE_EMAIL_TYPE){rendered.push({...common,...renderUpdateEmail(text,values,senderParts,group,e,emailId)});continue;}
   const r=renderEmail(text,values,senderParts,linkless(input.emailType)?null:values.link,emailId);
   rendered.push(group.series?{...common,subject:r.subject,text:r.text+`\nUnsubscribe from ${seriesLabel(group)}: ${unsubscribeLink(emailId)}`,html:null,headers:unsubscribeHeaders(emailId)}:{...common,...r});}}
 if(!rendered.length)fail(400,'no_recipients',excluded.length?'Every selected recipient unsubscribed from this series':'This group has no active recipients');
 const envelope={id,groupId:group.id,emailType:input.emailType,from:`${sender.displayName} <${FROM_ADDRESS}>`,replyTo:sender.replyTo,scheduledAt:input.scheduleAt??null,batchText,overrides:input.overrides,emails:rendered.map(r=>({exchangeId:r.exchangeId,to:r.to,subject:r.subject,text:r.text,personalised:r.personalised,...(r.html?{html:r.html}:{}),...(r.headers&&Object.keys(r.headers).length?{headers:r.headers}:{})}))},digest=checksum(JSON.stringify(envelope));
 await tx.query('INSERT INTO exchange_email_batches(id,workspace_id,group_id,email_type,display_name,reply_to,sender_user_id,subject_template,body_template,overrides,rendered,digest,scheduled_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',[id,w,group.id,input.emailType,sender.displayName,sender.replyTo,a.userId,batchText.subject,batchText.body,JSON.stringify(input.overrides),JSON.stringify(rendered),digest,input.scheduleAt??null,a.userId]);
 await rememberSender(tx,a,w,sender.kind,sender.customName);
 return {batchId:id,digest,from:envelope.from,replyTo:sender.replyTo,displayName:sender.displayName,nameKind:sender.kind,scheduledAt:input.scheduleAt??null,emailType:input.emailType,defaultSource:base.source,batchText,recipients:rendered.map(r=>({exchangeId:r.exchangeId,to:r.to,recipientName:r.recipientName,subject:r.subject,text:r.text,personalised:r.personalised,...(r.html?{html:r.html}:{}),...(r.headers&&Object.keys(r.headers).length?{headers:r.headers}:{}),...(r.clientChecks?{clientChecks:r.clientChecks}:{})})),excluded,fixed:input.emailType===UPDATE_EMAIL_TYPE?'The content, the personal link, "I can help" links, the confidentiality footer, the sender identity (From, Reply-To), the footer and the unsubscribe link are added by TrialAgents and cannot be removed.':'The link, the sender identity (From, Reply-To) and the footer are added by TrialAgents and cannot be removed.',confirmation:'A person confirms this batch through workspace review (send_exchange_email with this batchId and digest). Assistants can draft, edit and personalise but never send.'};
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
async function queueBatch(tx:Connection,b:any){const queued=[];for(const r of b.rendered as any[])queued.push(await queueEmail(tx,{id:r.emailId,workspaceId:b.workspace_id,groupId:b.group_id,exchangeId:r.exchangeId,batchId:b.id,emailType:b.email_type,to:r.to,fromName:b.display_name,replyTo:b.reply_to,subject:r.subject,text:r.text,html:r.html??null,headers:r.headers??{}}));return queued;}
/** Reminders the owner approved in advance: queued at the scheduled time with the saved text, skipping exchanges revoked or closed since. */
export async function runScheduledExchangeBatches(db:Database){
 const due=(await db.query("SELECT * FROM exchange_email_batches WHERE status='confirmed' AND scheduled_at<=now() ORDER BY scheduled_at LIMIT 20")).rows;
 for(const b of due)await db.transaction(async tx=>{
  const current=(await tx.query("SELECT * FROM exchange_email_batches WHERE id=$1 AND status='confirmed' FOR UPDATE",[b.id])).rows[0];if(!current)return;
  const live=(await tx.query('SELECT e.id FROM exchanges e JOIN exchange_groups g ON g.id=e.group_id WHERE e.group_id=$1 AND e.revoked_at IS NULL AND (e.expires_at IS NULL OR e.expires_at>now()) AND NOT g.archived',[b.group_id])).rows.map(r=>r.id);
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
  if(await leftSeries(db as any,row.group_id,row.email_type,row.to_email))throw Object.assign(Error('Recipient unsubscribed'),{permanent:true,code:'unsubscribed'});
  if(row.attempts>6||Date.now()-new Date(row.created_at).getTime()>23*3600000)throw Object.assign(Error('Retry window exceeded'),{permanent:true});
  const headers=row.headers&&Object.keys(row.headers).length?row.headers:null;
  const result=await send({from:`${row.from_name} <${FROM_ADDRESS}>`,to:[row.to_email],subject:row.subject,text:row.text,...(row.html?{html:row.html}:{}),...(headers?{headers}:{}),...(row.reply_to?{reply_to:row.reply_to}:{})},row.id,AbortSignal.any([signal??new AbortController().signal,AbortSignal.timeout(20000)]));
  await db.query("UPDATE exchange_emails SET status='sent',provider_id=$2,sent_at=now(),updated_at=now(),diagnostic=NULL WHERE id=$1",[row.id,result.id]);
 }catch(e:any){
  const permanent=e.permanent||row.attempts>=6;
  await db.query("UPDATE exchange_emails SET status=$2,diagnostic=$3,available_at=$4,updated_at=now() WHERE id=$1",[row.id,permanent?(e.code==='suppression_list'||e.code==='unsubscribed'?'suppressed':'failed'):'queued',e.code==='suppression_list'||e.code==='unsubscribed'?e.code:permanent?'provider_rejected':'request_failed',new Date(Date.now()+Math.min(300000,1000*2**row.attempts))]);
 }
 return true;
}
/** Provider delivery events (shared webhook) → delivery status; bounces and complaints join the suppression list. */
export async function applyExchangeDeliveryEvents(db:Database){
 await db.query(`UPDATE exchange_emails x SET status=CASE e.event_type WHEN 'email.delivered' THEN 'delivered' WHEN 'email.bounced' THEN 'bounced' WHEN 'email.complained' THEN 'complained' WHEN 'email.failed' THEN 'failed' WHEN 'email.suppressed' THEN 'suppressed' ELSE x.status END,diagnostic=e.event_type,updated_at=now()
  FROM notification_events e WHERE x.provider_id=e.provider_id AND x.status IN ('sent','delivered') AND e.id=(SELECT e2.id FROM notification_events e2 WHERE e2.provider_id=e.provider_id ORDER BY CASE e2.event_type WHEN 'email.complained' THEN 7 WHEN 'email.bounced' THEN 6 WHEN 'email.suppressed' THEN 5 WHEN 'email.failed' THEN 4 WHEN 'email.delivered' THEN 3 ELSE 1 END DESC,e2.created_at DESC LIMIT 1) AND e.event_type IN ('email.delivered','email.bounced','email.complained','email.failed','email.suppressed')`);
 await db.query("INSERT INTO notification_suppressions(email,reason) SELECT DISTINCT lower(value),event_type FROM notification_events CROSS JOIN LATERAL jsonb_array_elements_text(recipients) WHERE event_type IN ('email.bounced','email.complained','email.suppressed') ON CONFLICT(email) DO NOTHING");
}
/**
 * Assistants draft and prepare but never see recipient links (§2.5, §10): personal page links (also with
 * an ask), unsubscribe links and update image addresses are replaced before anything reaches an assistant.
 * Batches, reviews and sends keep the real links, so a person still reviews exactly what is sent.
 */
const PAGE_LINK=/https?:\/\/[^\s"'<>]*?\/exchange(?:\?[^#\s"'<>]*)?#[A-Za-z0-9_-]{43}/g,UNSUBSCRIBE_LINK=/https?:\/\/[^\s"'<>]*?\/exchange-unsubscribe\/[0-9a-f-]{36}/g,IMAGE_ADDRESS=/\/exchange-content\/[A-Za-z0-9_-]{43}\//g;
export function redactExchangeLinks<T>(value:T):T{
 const s=JSON.stringify(value);if(s===undefined)return value;
 const r=s.replace(PAGE_LINK,'[personal link]').replace(UNSUBSCRIBE_LINK,'[unsubscribe link]').replace(IMAGE_ADDRESS,'/exchange-content/[update]/');
 return r===s?value:JSON.parse(r);
}
