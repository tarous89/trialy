import {randomUUID,randomBytes} from 'node:crypto';
import {z} from 'zod';
import type {Connection,Database} from '../db/database.js';
import {id,fail,type Actor} from '../shared/schema.js';
import {questionsSchema,questionProblem} from '../shared/questions.js';
import {derived} from '../shared/formulas.js';
import {access,typeAccess,visibleFields,projectData} from './permissions.js';
import {toolPolicy} from './effective-access.js';
import {audit,checksum} from './evidence.js';
import {requireHuman,requireCurrentAction,type WriteAuthorization} from './write-authorization.js';
import {Service} from './service.js';
import {EMAIL_TYPES,emailDefaultsSchema,emailTextSchema,exchangeLink,prepareEmailSchema,prepareExchangeEmail,batchReview,confirmExchangeBatch,queueExchangeNotice,resolveDefault,senderIdentity,queueEmail,emailValues,platformDefaults,noticeEmailSchema,renderNotices,queueNotices,PLACEHOLDERS,type EmailType} from '../app-services/exchange-email.js';
import {documentItemSchema,documentPlacementSchema,levelKey,levelSchema,trackingSchema,roomOperations,roomOperationKinds,roomDays,roomEnded,type RoomOperation} from './exchange-room-model.js';
import {levelUnlockNotice,roomReview,commitRoomOperation,roomStatus,levelsProblem,documentsProblem,placed,trackingReview,liveRoomExchanges,digestDocuments,listExchangeQuestions,requireRoom} from './exchange-rooms.js';

/**
 * External exchange (docs/product/EXTERNAL_EXCHANGE.md): exchange groups with one time-limited,
 * unguessable page per recipient. Every workspace-side write is a reviewed workspace operation;
 * sending, publishing and accepting are confirmed by a person. Received content is kept forever.
 */
const adapter=(tx:Connection):Database=>({query:(q,v)=>tx.query(q,v),transaction:fn=>fn(tx),close:async()=>{}});
const J=JSON.stringify;
const simple=(f:any)=>!['document','relationship','person'].includes(f.kind)&&!derived(f);
const email=z.string().trim().toLowerCase().email().max(200);
const slotSchema=z.object({key:z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),label:z.string().trim().min(1).max(120),required:z.boolean().default(false)}).strict();
const dateSchema=z.object({label:z.string().trim().min(1).max(80),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).strict();
export const briefSchema=z.object({title:z.string().trim().min(1).max(160),summary:z.string().max(20000).default(''),dates:z.array(dateSchema).max(20).default([]),senderName:z.string().trim().max(120).optional(),senderCompany:z.string().trim().max(160).optional(),privacyNotice:z.string().max(2000).optional(),gate:z.enum(['none','acknowledgement','signed_document']).optional(),gateText:z.string().max(5000).optional(),gateSlot:z.string().max(40).optional(),verifyEmail:z.boolean().optional(),messagesAfterDeadline:z.boolean().optional()}).strict();
export const exchangeGroupSchema=briefSchema.extend({appId:id.optional(),appRef:z.string().trim().min(1).max(200).optional(),kind:z.enum(['request','room']).default('request'),levels:z.array(levelSchema).max(10).default([]),tracking:trackingSchema.optional(),notifyEngagement:z.boolean().default(false),quietDays:z.number().int().min(1).max(365).default(10),logoVersionId:id.optional(),documents:z.array(z.union([id,documentItemSchema])).max(200).default([]),gateDocument:id.optional(),typeId:id.optional(),fields:z.array(z.string().max(64)).max(100).default([]),questions:questionsSchema.optional(),maxFiles:z.number().int().min(0).max(10).default(10),slots:z.array(slotSchema).max(20).default([]),emailDefaults:emailDefaultsSchema.default({})}).strict();
export const recipientSchema=z.object({emails:z.array(email).min(1).max(5),name:z.string().trim().max(120).default(''),company:z.string().trim().max(160).default(''),recordId:id.optional()}).strict();
/** Record changes an app carries with a reviewed exchange operation (e.g. the invited supplier's status); validated and committed with it, in one transaction. */
export const exchangeRecordChanges=z.object({componentId:id,expectedVersion:z.number().int().min(0),viewId:id.optional(),changes:z.array(z.record(z.string(),z.unknown())).min(1).max(50)}).strict();
const withRecords={records:exchangeRecordChanges.optional()};
export const exchangeOperations=[
 z.object({kind:z.literal('create_exchange_group'),config:exchangeGroupSchema}).strict(),
 z.object({kind:z.literal('invite_exchange'),groupId:id,recipients:z.array(recipientSchema).min(1).max(100),days:roomDays.optional(),levels:z.array(levelKey).min(1).max(10).optional()}).strict(),
 z.object({kind:z.literal('update_exchange_brief'),groupId:id,expectedVersion:z.number().int().min(1),brief:briefSchema.partial()}).strict(),
 z.object({kind:z.literal('share_exchange_documents'),groupId:id,expectedVersion:z.number().int().min(1),add:z.array(z.union([id,documentItemSchema])).max(50).default([]),update:z.array(documentPlacementSchema).max(200).default([]),remove:z.array(id).max(50).default([]),logoVersionId:id.nullable().optional(),gateDocument:id.nullable().optional()}).strict(),
 z.object({kind:z.literal('request_exchange_document'),groupId:id,expectedVersion:z.number().int().min(1),slot:slotSchema}).strict(),
 z.object({kind:z.literal('extend_exchange'),exchangeId:id,days:roomDays,notify:z.boolean().default(true),...withRecords}).strict(),
 z.object({kind:z.literal('revoke_exchange'),exchangeId:id,reason:z.string().trim().min(1).max(1000),notify:z.boolean().default(false),email:noticeEmailSchema.optional(),...withRecords}).strict(),
 z.object({kind:z.literal('accept_exchange_submission'),submissionId:id,data:z.record(z.string(),z.union([z.string().max(50000),z.number().finite(),z.boolean(),z.array(z.union([z.string().max(50000),z.number().finite()])).max(100),z.null()])),target:z.enum(['new','bound']).default('new'),...withRecords}).strict(),
 z.object({kind:z.literal('accept_exchange_file'),fileId:id,ai:z.boolean().default(false),notify:z.boolean().default(false),...withRecords}).strict(),
 z.object({kind:z.literal('reply_exchange'),exchangeId:id,body:z.string().trim().min(1).max(10000),notify:z.boolean().default(true),...withRecords}).strict(),
 z.object({kind:z.literal('reply_exchanges'),replies:z.array(z.object({exchangeId:id,body:z.string().trim().min(1).max(10000)}).strict()).min(1).max(100),notify:z.boolean().default(true),...withRecords}).strict(),
 z.object({kind:z.literal('publish_exchange_clarification'),groupId:id,question:z.string().trim().max(5000).default(''),body:z.string().trim().min(1).max(10000),sourceMessageId:id.optional(),notify:z.boolean().default(true),...withRecords}).strict(),
 z.object({kind:z.literal('save_exchange_email_default'),emailType:z.enum(EMAIL_TYPES),text:emailTextSchema.nullable()}).strict(),
 z.object({kind:z.literal('send_exchange_email'),batchId:id,digest:z.string().length(64),...withRecords}).strict(),
 ...roomOperations
] as const;
export const exchangeOperationKinds=exchangeOperations.map(s=>s.shape.kind.value);
export type ExchangeOperation=z.infer<typeof exchangeOperations[number]>;
export const isExchangeOperation=(op:any):op is ExchangeOperation=>exchangeOperationKinds.includes(op?.kind);
const isRoomOperation=(op:ExchangeOperation):op is RoomOperation=>roomOperationKinds.includes(op.kind);
const defaultGateText='The documents and information on this page are confidential. By continuing you agree to use them only to prepare your response and not to share them outside your organization.';
const defaultPrivacy='This page is operated by TrialAgents on behalf of the sender. Personal data is limited to your name, email address, organization and what you submit; it is shared only with the sender\'s workspace.';

/** Owners always may; members need the "Send to people outside the workspace" right and app edit access. */
export async function exchangeAuthority(tx:Connection,a:Actor,w:string,appId:string|null,write:boolean){
 const p=await access(tx,a,w,write);
 if(write&&p.role!=='owner'){const r=(await tx.query('SELECT external_send FROM workspace_access WHERE workspace_id=$1 AND user_id=$2',[w,a.userId])).rows[0];if(!r?.external_send)fail(403,'external_send_required','"Send to people outside the workspace" is not granted to you');}
 if(appId){const t=await toolPolicy(tx,a,p,appId);const c=(await tx.query('SELECT id,name,archived,deleted_at FROM workspace_components WHERE id=$1 AND workspace_id=$2',[appId,w])).rows[0];if(!c||c.deleted_at)fail(404,'not_found','App unavailable');if(write&&c.archived)fail(409,'app_archived','Restore the app before changing its exchanges');if(write&&!t.grant.write)fail(403,'tool_access','Editing this app is not permitted');}
 return p;
}
export async function groupRow(tx:Connection,w:string,groupId:string){const g=(await tx.query('SELECT * FROM exchange_groups WHERE id=$1 AND workspace_id=$2',[groupId,w])).rows[0];if(!g)fail(404,'not_found','Exchange group not found');return g;}
export async function exchangeRow(tx:Connection,w:string,exchangeId:string){const e=(await tx.query('SELECT * FROM exchanges WHERE id=$1 AND workspace_id=$2',[exchangeId,w])).rows[0];if(!e)fail(404,'not_found','Exchange not found');return e;}
const publicExchange=(e:any)=>({id:e.id,groupId:e.group_id,recordId:e.record_id,recipientName:e.recipient_name,recipientCompany:e.recipient_company,recipientEmails:e.recipient_emails,levels:e.levels??[],expiresAt:e.expires_at,revokedAt:e.revoked_at,createdAt:e.created_at,version:e.version});
const publicGroup=(g:any)=>({id:g.id,appId:g.app_id,appRef:g.app_ref??null,kind:g.kind,levels:g.levels,digest:g.digest?{subject:g.digest.subject,body:g.digest.body,displayName:g.digest.displayName,approvedAt:g.digest.approvedAt}:null,notifyEngagement:g.notify_engagement,quietDays:g.quiet_days,title:g.title,summary:g.summary,dates:g.dates,senderName:g.sender_name,senderCompany:g.sender_company,logoVersionId:g.logo_version_id,privacyNotice:g.privacy_notice,gate:g.gate,gateText:g.gate_text,gateSlot:g.gate_slot,verifyEmail:g.verify_email,messagesAfterDeadline:g.messages_after_deadline,documents:g.documents,typeId:g.type_id,fields:g.fields,questions:g.questions,maxFiles:g.max_files,slots:g.slots,emailDefaults:g.email_defaults,archived:g.archived,version:g.version,createdAt:g.created_at});
/** Access events written by the recipient page and by workspace actions; both the per-exchange log and the workspace audit trail. */
export async function logExchange(tx:Connection,exchange:any,kind:string,detail:Record<string,unknown>,actor?:Actor){
 await tx.query('INSERT INTO exchange_events(id,workspace_id,exchange_id,kind,detail) VALUES($1,$2,$3,$4,$5)',[randomUUID(),exchange.workspace_id,exchange.id,kind,J(detail)]);
 const g=(await tx.query('SELECT owner_id FROM exchange_groups WHERE id=$1',[exchange.group_id])).rows[0],ws=(await tx.query('SELECT tenant_id FROM workspaces WHERE id=$1',[exchange.workspace_id])).rows[0];
 await tx.query('INSERT INTO audit_events(id,workspace_id,tenant_id,actor_id,action,object_id,origin,after_value) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),exchange.workspace_id,ws.tenant_id,actor?.userId??g.owner_id,'exchange.'+kind,exchange.id,actor?.origin??'external',J({...detail,exchangeId:exchange.id,groupId:exchange.group_id,recordId:exchange.record_id})]);
}
export async function documentRows(tx:Connection,a:Actor,w:string,versionIds:string[]){
 if(!versionIds.length)return [];const visible=await new Service(adapter(tx)).documents(a,w);
 return versionIds.map(v=>{const d=visible.find((d:any)=>d.id===v);if(!d)fail(404,'not_found','Document unavailable: '+v);return {versionId:d.id,documentId:d.document_id,filename:d.filename,mime:d.mime,byteSize:d.byte_size};});
}
async function formReview(tx:Connection,a:Actor,w:string,typeId:string|undefined,fields:string[],questions:any[]|undefined){
 if(!typeId){if(fields.length||questions?.length)fail(400,'type_required','Questions need a response table');return {type:null,fields:[],questions:[]};}
 const {type,policy}=await typeAccess(tx,a,w,typeId),visible=visibleFields(type.fields,policy,a);
 if(new Set(fields).size!==fields.length||fields.some(k=>!visible.some(f=>f.key===k&&simple(f))))fail(400,'invalid_field','Choose distinct permitted simple fields');
 if(visible.some(f=>f.required&&!fields.includes(f.key)))fail(400,'required_field','Include every required field');
 const selected=visible.filter(f=>fields.includes(f.key)),q=questions??selected.map(f=>({field:f.key,required:f.required,help:''}));const problem=questionProblem(q,selected);if(problem)fail(400,'invalid_questions',problem);
 return {type,fields:selected,questions:q};
}
export async function exchangeReview(tx:Connection,a:Actor,w:string,op:ExchangeOperation):Promise<any>{
 if(op.kind==='create_exchange_group'){
  const c=op.config,p=await exchangeAuthority(tx,a,w,c.appId??null,true);
  if(c.kind==='room'){if(c.typeId||c.fields.length||c.questions?.length||c.maxFiles!==10)fail(400,'room_form','Rooms have no response form; people ask questions instead');}
  else if(c.levels.length||c.tracking||c.notifyEngagement)fail(400,'room_only','Levels, tracked tables and engagement notifications are room settings');
  const items=c.documents.map(x=>typeof x==='string'?{versionId:x}:x);if(new Set(items.map(i=>i.versionId)).size!==items.length)fail(400,'duplicate_document','Share each document once');
  const form=c.kind==='room'?{type:null,fields:[],questions:[]}:await formReview(tx,a,w,c.typeId,c.fields,c.questions),rows=await documentRows(tx,a,w,items.map(i=>i.versionId)),documents=rows.map((r,i)=>placed(r,items[i]));
  const roomProblem=levelsProblem(c.levels,c.slots)??documentsProblem(c.kind,c.levels,documents);if(roomProblem)fail(400,'invalid_room',roomProblem);
  const tracking=c.kind==='room'?await trackingReview(tx,a,w,c.tracking):[];
  const logo=c.logoVersionId?(await documentRows(tx,a,w,[c.logoVersionId]))[0]:null;if(logo&&!/^image\/(png|jpeg|gif|webp|svg\+xml)$/.test(logo.mime))fail(400,'logo_format','The logo must be a PNG, JPEG, GIF, WebP or SVG document');
  const sender=await senderIdentity(tx,a,w,p),gate=c.gate??(c.kind==='room'&&c.levels.length?'none':documents.length?'acknowledgement':'none');
  if(gate==='signed_document'&&!c.slots.some(s=>s.key===c.gateSlot))fail(400,'gate_slot','Name the requested document slot that unlocks the other documents');
  if(c.gateDocument&&!documents.some(d=>d.versionId===c.gateDocument))fail(400,'gate_document','The document to sign must be among the shared documents');
  if(new Set(c.slots.map(s=>s.key)).size!==c.slots.length)fail(400,'duplicate_slot','Slot keys must be unique');
  return {group:{...c,gate,gateText:c.gateText??(gate==='none'?'':defaultGateText),verifyEmail:c.verifyEmail??documents.length>0,senderName:c.senderName||sender.senderName,senderCompany:c.senderCompany||sender.senderCompany,privacyNotice:c.privacyNotice??defaultPrivacy,documents:documents.map(d=>({...d,gate:d.versionId===c.gateDocument})),typeVersion:form.type?.version??null,questions:form.questions,tracking},effect:c.kind==='room'?'Create a room. People are given access separately; nothing is sent yet.'+(tracking.length?' TrialAgents keeps '+tracking.map((t:any)=>`"${t.name}"`).join(' and ')+' current from room activity (source "tracked"); people and assistants cannot edit those fields.':''):'Create an exchange group. Recipients are invited separately; nothing is sent yet.'};
 }
 if(op.kind==='send_exchange_email'){const b=await batchReview(tx,w,op.batchId,op.digest),g=await groupRow(tx,w,b.group_id);await exchangeAuthority(tx,a,w,g.app_id,true);const recipients=await Promise.all((b.rendered as any[]).map(async(r:any)=>{const e=await exchangeRow(tx,w,r.exchangeId);return {to:r.to,exchangeId:e.id,deadline:e.expires_at};}));return {plan:{title:g.title,documents:(g.documents as any[]).map(d=>d.filename),requestedDocuments:(g.slots as any[]).map(s=>s.label),gate:g.gate,emailVerification:g.verify_email,recipients},batchId:b.id,digest:b.digest,emailType:b.email_type,from:b.display_name,replyTo:b.reply_to,scheduledAt:b.scheduled_at,emails:(b.rendered as any[]).map(r=>({to:r.to,exchangeId:r.exchangeId,subject:r.subject,text:r.text,personalised:r.personalised})),effect:b.scheduled_at?'Approve this reminder now; it is sent at the scheduled time with exactly this text.':'Send these emails exactly as shown. Only a person can confirm.'};}
 if(op.kind==='save_exchange_email_default'){await exchangeAuthority(tx,a,w,null,true);return {emailType:op.emailType,text:op.text,placeholders:PLACEHOLDERS.map(k=>`{${k}}`),effect:op.text?'Save this workspace default; it replaces the app default for this email type.':'Remove the workspace default; the app or platform default applies again.'};}
 if(op.kind==='accept_exchange_submission'){
  const s=(await tx.query('SELECT s.*,x.record_id,x.group_id FROM exchange_submissions s JOIN exchanges x ON x.id=s.exchange_id LEFT JOIN exchange_acceptances acc ON acc.submission_id=s.id WHERE s.id=$1 AND s.workspace_id=$2 AND acc.submission_id IS NULL',[op.submissionId,w])).rows[0];if(!s)fail(409,'submission_unavailable','Submission is unavailable or already accepted');
  const g=await groupRow(tx,w,s.group_id);await exchangeAuthority(tx,a,w,g.app_id,true);if(!g.type_id)fail(400,'no_form','This exchange has no response table');
  const {type,policy}=await typeAccess(tx,a,w,g.type_id);if(visibleFields(type.fields,policy,a).length!==type.fields.length)fail(403,'response_scope','Acceptance requires visibility of every table field');
  const service=new Service(adapter(tx));let target:any;
  if(op.target==='bound'){if(!s.record_id)fail(400,'no_bound_record','This exchange is not bound to a record');const r=(await tx.query('SELECT id,type_id,version FROM records WHERE id=$1 AND workspace_id=$2',[s.record_id,w])).rows[0];if(!r||r.type_id!==g.type_id)fail(409,'record_mismatch','The bound record belongs to another table');await service.validate(tx,a,w,{kind:'update_record',recordId:r.id,expectedVersion:r.version,data:op.data});target={kind:'update_record',recordId:r.id,expectedVersion:r.version};}
  else {await service.validate(tx,a,w,{kind:'create_record',typeId:g.type_id,data:op.data});target={kind:'create_record',typeId:g.type_id};}
  return {submissionId:s.id,exchangeId:s.exchange_id,version:s.version,typeId:g.type_id,typeVersion:type.version,original:s.data,proposed:op.data,target,effect:op.target==='bound'?'Update the bound record with reviewed values; keep the versioned submission.':'Create one record with reviewed values; keep the versioned submission.'};
 }
 if(op.kind==='accept_exchange_file'){
  const f=(await tx.query('SELECT f.id,f.exchange_id,f.slot,f.filename,f.mime,f.byte_size,f.checksum,f.submission_id,x.group_id FROM exchange_files f JOIN exchanges x ON x.id=f.exchange_id LEFT JOIN exchange_file_acceptances acc ON acc.file_id=f.id WHERE f.id=$1 AND f.workspace_id=$2 AND acc.file_id IS NULL AND f.removed_at IS NULL AND (f.submission_id IS NOT NULL OR f.slot IS NOT NULL)',[op.fileId,w])).rows[0];if(!f)fail(409,'file_unavailable','File is unavailable, unsubmitted or already accepted');
  const g=await groupRow(tx,w,f.group_id),p=await exchangeAuthority(tx,a,w,g.app_id,true);if(p.role!=='owner')fail(403,'owner_required','A workspace owner accepts received files');
  // Room: the signed document of a level opens that level for this person only; with notify, they get the access-changed email shown here.
  const unlock=op.notify?await levelUnlockNotice(tx,a,w,g,{...await exchangeRow(tx,w,f.exchange_id)},f.slot):null;
  return {fileId:f.id,exchangeId:f.exchange_id,slot:f.slot,filename:f.filename,mime:f.mime,byteSize:f.byte_size,checksum:f.checksum,ai:op.ai,...(unlock?{unlocks:unlock.level,email:unlock.email}:{}),effect:'Save this received file as a TrialAgents document'+(f.slot===g.gate_slot&&g.gate==='signed_document'?' and unlock the other shared documents for this recipient':'')+(unlock?` and open the ${unlock.level} level for this person, emailing them the access change shown`:'')+'. Unaccepted uploads stay out of AI reach.'};
 }
 if(op.kind==='reply_exchange'){const e=await exchangeRow(tx,w,op.exchangeId),g=await groupRow(tx,w,e.group_id);await exchangeAuthority(tx,a,w,g.app_id,true);if(e.revoked_at)fail(409,'exchange_revoked','This exchange was revoked');return {exchangeId:e.id,recipient:e.recipient_name||e.recipient_emails[0],body:op.body,notify:op.notify,email:op.notify?await noticePreview(tx,w,g,e,'message',op.body):null,effect:'Post a private message visible only to this recipient'+(op.notify?' and email them a notice with a link':'')+'.'};}
 if(op.kind==='reply_exchanges'){
  if(new Set(op.replies.map(r=>r.exchangeId)).size!==op.replies.length)fail(400,'duplicate_recipient','One message per recipient');
  const out=[];for(const r of op.replies){const e=await exchangeRow(tx,w,r.exchangeId),g=await groupRow(tx,w,e.group_id);await exchangeAuthority(tx,a,w,g.app_id,true);if(e.revoked_at)fail(409,'exchange_revoked','An exchange in this batch was revoked');out.push({exchangeId:e.id,recipient:e.recipient_name||e.recipient_emails[0],body:r.body,email:op.notify?await noticePreview(tx,w,g,e,'message',r.body):null});}
  return {replies:out,notify:op.notify,effect:'Post one private message to each of these recipients, visible only to that recipient'+(op.notify?', and email each a notice with a link':'')+'.'};
 }
 if(op.kind==='publish_exchange_clarification'){
  const g=await groupRow(tx,w,op.groupId);await exchangeAuthority(tx,a,w,g.app_id,true);
  if(op.sourceMessageId){const m=(await tx.query("SELECT id FROM exchange_messages WHERE id=$1 AND group_id=$2 AND kind='private' AND author='recipient'",[op.sourceMessageId,g.id])).rows[0];if(!m)fail(404,'not_found','Source question not found in this group');}
  const live=await liveExchanges(tx,g.id);
  return {groupId:g.id,question:op.question,body:op.body,recipients:live.length,askerShownAs:op.question?'A recipient asked':null,notify:op.notify,emails:op.notify?await Promise.all(live.map(e=>noticePreview(tx,w,g,e,'clarification',(op.question?'A recipient asked: '+op.question+'\n\n':'')+op.body))):[],effect:'Publish to every recipient of this group without naming the asker'+(op.notify?', with an email notice to each':'')+'.'};
 }
 if(isRoomOperation(op))return roomReview(tx,a,w,op);
 const g=op.kind==='invite_exchange'||op.kind==='update_exchange_brief'||op.kind==='share_exchange_documents'||op.kind==='request_exchange_document'?await groupRow(tx,w,op.groupId):await groupRow(tx,w,(await exchangeRow(tx,w,op.exchangeId)).group_id);
 await exchangeAuthority(tx,a,w,g.app_id,true);if(g.archived)fail(409,'group_archived','This exchange group is archived');
 if(op.kind!=='invite_exchange'&&op.kind!=='extend_exchange'&&op.kind!=='revoke_exchange'&&op.expectedVersion!==g.version)fail(409,'stale_version','Exchange group changed; prepare again');
 if(op.kind==='invite_exchange'){
  const recipients=[];for(const r of op.recipients){if(new Set(r.emails).size!==r.emails.length)fail(400,'duplicate_email','Recipient emails must be distinct');let record=null;if(r.recordId){const row=(await tx.query('SELECT id,type_id,version FROM records WHERE id=$1 AND workspace_id=$2',[r.recordId,w])).rows[0];if(!row)fail(404,'not_found','Record not found: '+r.recordId);await typeAccess(tx,a,w,row.type_id);record={id:row.id,typeId:row.type_id,version:row.version};}recipients.push({...r,record});}
  if(g.kind==='room'){
   const keys=(g.levels as any[]).map(l=>l.key),levels=op.levels?keys.filter(k=>op.levels!.includes(k)):keys.slice(0,1);if(op.levels&&(levels.length!==new Set(op.levels).size))fail(400,'invalid_level','Choose levels of this room');
   const accessTable=(await tx.query("SELECT type_id FROM exchange_tracked_tables WHERE group_id=$1 AND role='access'",[g.id])).rows[0];
   if(accessTable&&recipients.some(r=>r.record?.typeId!==accessTable.type_id))fail(400,'access_record','Bind each person to their record in the room\'s access table');
   return {groupId:g.id,title:g.title,kind:'room',recipients,days:op.days??null,ends:op.days?`after ${op.days} days`:'until revoked',levels,levelNames:(g.levels as any[]).filter(l=>levels.includes(l.key)).map(l=>l.name),verifyEmail:g.verify_email,gate:g.gate,effect:'Give each person their own private link to this room at the levels shown. No email is sent until an access-granted email is prepared and confirmed.'};
  }
  if(op.levels)fail(400,'room_only','Levels are room settings');if(op.days===undefined)fail(400,'days_required','Choose a deadline of 1 to 90 days');if(op.days>90)fail(400,'deadline_limit','Deadlines are at most 90 days away');
  return {groupId:g.id,title:g.title,recipients,days:op.days,verifyEmail:g.verify_email,gate:g.gate,effect:'Create one private link per recipient. No email is sent until a batch is prepared and confirmed.'};
 }
 if(op.kind==='update_exchange_brief'){const b=op.brief;if(b.gate==='signed_document'&&!(g.slots as any[]).some(s=>s.key===(b.gateSlot??g.gate_slot)))fail(400,'gate_slot','Name an existing requested document slot');return {groupId:g.id,version:g.version,before:publicGroup(g),brief:b,effect:'Update the brief and settings for every recipient of this group.'};}
 if(op.kind==='share_exchange_documents'){
  const current:any[]=g.documents,items=op.add.map(x=>typeof x==='string'?{versionId:x}:x).filter(i=>!current.some(d=>d.versionId===i.versionId)),add=(await documentRows(tx,a,w,items.map(i=>i.versionId))).map((r,i)=>placed(r,items[i]));
  if(op.remove.some(v=>!current.some(d=>d.versionId===v))||op.update.some(u=>!current.some(d=>d.versionId===u.versionId)))fail(404,'not_found','Document is not shared');
  const logo=op.logoVersionId?(await documentRows(tx,a,w,[op.logoVersionId]))[0]:null;if(logo&&!/^image\//.test(logo.mime))fail(400,'logo_format','The logo must be an image');
  const gateDocument=op.gateDocument===undefined?current.find(d=>d.gate)?.versionId??null:op.gateDocument;
  const documents=[...current.filter(d=>!op.remove.includes(d.versionId)).map(d=>{const u=op.update.find(x=>x.versionId===d.versionId);return u?placed(d,u):d;}),...add].map(d=>({...d,gate:d.versionId===gateDocument}));
  if(gateDocument&&!documents.some(d=>d.gate))fail(400,'gate_document','The document to sign must be among the shared documents');
  const problem=documentsProblem(g.kind,g.levels,documents);if(problem)fail(400,'invalid_room',problem);
  return {groupId:g.id,version:g.version,add,update:op.update,remove:op.remove,logo:op.logoVersionId===undefined?undefined:logo,documents,effect:g.kind==='room'?'Share these documents in the room at their sections and levels; each person sees only the levels they hold, and every view and download is logged.':'Share these documents with every recipient of this group; each download is logged.'};}
 if(op.kind==='request_exchange_document'){if((g.slots as any[]).some(s=>s.key===op.slot.key))fail(409,'duplicate_slot','Slot already requested');return {groupId:g.id,version:g.version,slot:op.slot,effect:'Ask every recipient to upload this document.'};}
 const e=await exchangeRow(tx,w,op.exchangeId);
 if(op.kind==='extend_exchange'){if(e.revoked_at)fail(409,'exchange_revoked','This exchange was revoked');// Deterministic between preview and confirmation: an expired deadline extends from the start of today (UTC), a live one from itself.
  const today=new Date();today.setUTCHours(0,0,0,0);const base=new Date(e.expires_at).getTime()>Date.now()?new Date(e.expires_at).getTime():today.getTime(),expiresAt=new Date(base+op.days*86400000);if(g.kind==='room'&&!e.expires_at)fail(400,'no_end_date','This access has no end date');if(expiresAt.getTime()-Date.now()>(g.kind==='room'?730:90)*86400000)fail(400,'deadline_limit',g.kind==='room'?'Room access ends at most 730 days away':'Deadlines are at most 90 days away');return {exchangeId:e.id,recipient:e.recipient_name||e.recipient_emails[0],from:e.expires_at,to:expiresAt.toISOString(),notify:op.notify,email:op.notify?await noticePreview(tx,w,g,{...e,expires_at:expiresAt},'extended'):null,effect:'Extend this recipient\'s deadline.'};}
 if(e.revoked_at)fail(409,'exchange_revoked','Already revoked');
 if(g.kind==='room'){const p=await access(tx,a,w,true),r=op.notify?await renderNotices(tx,a,w,p,g,[e],'access_revoked','',op.email):null;return {exchangeId:e.id,recipient:e.recipient_name||e.recipient_emails[0],reason:op.reason,notify:op.notify,email:r?{...r,emails:r.emails.map(m=>({exchangeId:m.exchangeId,to:m.to,subject:m.subject,text:m.text,personalised:m.personalised}))}:null,effect:'Stop this person\'s access immediately'+(op.notify?' and send the email shown':'')+'. Their views, downloads and questions stay on record.'};}
 return {exchangeId:e.id,recipient:e.recipient_name||e.recipient_emails[0],reason:op.reason,notify:op.notify,email:op.notify?await noticePreview(tx,w,g,e,'revoked'):null,effect:'Stop this link immediately. Everything already received stays.'};
}
async function noticePreview(tx:Connection,w:string,g:any,e:any,type:EmailType,message=''){const p=(await tx.query('SELECT id,name,tenant_id FROM workspaces WHERE id=$1',[w])).rows[0];const sender=await senderIdentity(tx,{userId:g.owner_id,origin:'human'},w,p),text=await resolveDefault(tx,w,g,type);const values=emailValues(g,e,{name:sender.senderName,company:sender.senderCompany},message);return {to:e.recipient_emails,subject:(text.subject as string).replace(/\{([a-z_]+)\}/g,(m,k)=>(values as any)[k]??m),source:text.source};}
export async function liveExchanges(tx:Connection,groupId:string){return (await tx.query('SELECT * FROM exchanges WHERE group_id=$1 AND revoked_at IS NULL ORDER BY created_at',[groupId])).rows;}
export async function commitExchangeOperation(tx:Connection,a:Actor,w:string,op:ExchangeOperation,authorization?:WriteAuthorization):Promise<any>{
 // Sends, publications, replies, acceptances, revocations and every room change (access, levels, answers, documents, digest) are confirmed by a person.
 requireCurrentAction(a);if(['send_exchange_email','publish_exchange_clarification','accept_exchange_submission','accept_exchange_file','reply_exchange','reply_exchanges','revoke_exchange',...roomOperationKinds].includes(op.kind))requireHuman(a);
 if(op.kind==='invite_exchange'&&(await groupRow(tx,w,op.groupId)).kind==='room')requireHuman(a);
 const review=await exchangeReview(tx,a,w,op),p=await access(tx,a,w,true);
 if(isRoomOperation(op))return commitRoomOperation(tx,a,w,op,review,authorization);
 if(op.kind==='create_exchange_group'){
  const g=review.group,groupId=randomUUID();
  const now=new Date().toISOString(),documents=g.kind==='room'?(g.documents as any[]).map(d=>({...d,addedAt:now})):g.documents;
  await tx.query('INSERT INTO exchange_groups(id,workspace_id,owner_id,app_id,title,summary,dates,sender_name,sender_company,logo_version_id,privacy_notice,gate,gate_text,gate_slot,verify_email,messages_after_deadline,documents,type_id,type_version,fields,questions,max_files,slots,email_defaults,kind,levels,notify_engagement,quiet_days,app_ref) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)',[groupId,w,a.userId,g.appId??null,g.title,g.summary,J(g.dates),g.senderName,g.senderCompany,g.logoVersionId??null,g.privacyNotice,g.gate,g.gateText,g.gateSlot??null,g.verifyEmail,g.messagesAfterDeadline??true,J(documents),g.typeId??null,g.typeVersion,J(g.fields),J(g.questions),g.kind==='room'?0:g.maxFiles,J(g.slots),J(g.emailDefaults),g.kind,J(g.levels),g.notifyEngagement,g.quietDays,g.appRef??null]);
  for(const t of g.tracking as any[])await tx.query('INSERT INTO exchange_tracked_tables(group_id,workspace_id,role,type_id,fields) VALUES($1,$2,$3,$4,$5)',[groupId,w,t.role,t.typeId,J(t.fields)]);
  await audit(tx,a,p,'exchange.group_created',groupId,null,{...review,authorization,appId:g.appId??null});return {status:'saved',groupId,group:publicGroup(await groupRow(tx,w,groupId))};
 }
 if(op.kind==='invite_exchange'){
  const g=await groupRow(tx,w,op.groupId),created=[];
  for(const r of review.recipients){const raw=randomBytes(32).toString('base64url'),exchangeId=randomUUID();await tx.query('INSERT INTO exchanges(id,workspace_id,group_id,record_id,recipient_name,recipient_company,recipient_emails,token_hash,link_token,expires_at,levels) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,CASE WHEN $10::int IS NULL THEN NULL ELSE now()+$10::int*interval \'1 day\' END,$11)',[exchangeId,w,g.id,r.record?.id??null,r.name,r.company,J(r.emails),checksum(raw),raw,op.days??null,J(review.levels??[])]);const e=await exchangeRow(tx,w,exchangeId);await logExchange(tx,e,'invited',{recipients:r.emails,recordId:r.record?.id??null,days:op.days??null,levels:review.levels??[],authorization},a);created.push({...publicExchange(e),url:exchangeLink(raw)});}
  return {status:'saved',groupId:g.id,exchanges:created};
 }
 if(op.kind==='update_exchange_brief'){
  const b=op.brief,sets:string[]=[],values:any[]=[op.groupId,w];const set=(col:string,v:any)=>{values.push(v);sets.push(`${col}=$${values.length}`);};
  if(b.title!==undefined)set('title',b.title);if(b.summary!==undefined)set('summary',b.summary);if(b.dates!==undefined)set('dates',J(b.dates));if(b.senderName!==undefined)set('sender_name',b.senderName);if(b.senderCompany!==undefined)set('sender_company',b.senderCompany);if(b.privacyNotice!==undefined)set('privacy_notice',b.privacyNotice);if(b.gate!==undefined)set('gate',b.gate);if(b.gateText!==undefined)set('gate_text',b.gateText);if(b.gateSlot!==undefined)set('gate_slot',b.gateSlot);if(b.verifyEmail!==undefined)set('verify_email',b.verifyEmail);if(b.messagesAfterDeadline!==undefined)set('messages_after_deadline',b.messagesAfterDeadline);
  await tx.query(`UPDATE exchange_groups SET ${[...sets,'version=version+1'].join(',')} WHERE id=$1 AND workspace_id=$2`,values);const g=await groupRow(tx,w,op.groupId);await audit(tx,a,p,'exchange.brief_updated',g.id,review.before,{...publicGroup(g),authorization});return {status:'saved',group:publicGroup(g)};
 }
 if(op.kind==='share_exchange_documents'){const before=await groupRow(tx,w,op.groupId),now=new Date().toISOString(),documents=before.kind==='room'?(review.documents as any[]).map(d=>d.addedAt?d:{...d,addedAt:now}):review.documents;await tx.query(`UPDATE exchange_groups SET documents=$3,version=version+1${op.logoVersionId!==undefined?',logo_version_id=$4':''} WHERE id=$1 AND workspace_id=$2`,[op.groupId,w,J(documents),...(op.logoVersionId!==undefined?[op.logoVersionId]:[])]);const g=await groupRow(tx,w,op.groupId);await audit(tx,a,p,'exchange.documents_shared',g.id,null,{add:review.add,remove:op.remove,authorization});return {status:'saved',group:publicGroup(g)};}
 if(op.kind==='request_exchange_document'){await tx.query('UPDATE exchange_groups SET slots=slots||$3::jsonb,version=version+1 WHERE id=$1 AND workspace_id=$2',[op.groupId,w,J([op.slot])]);const g=await groupRow(tx,w,op.groupId);await audit(tx,a,p,'exchange.document_requested',g.id,null,{slot:op.slot,authorization});return {status:'saved',group:publicGroup(g)};}
 if(op.kind==='extend_exchange'){await tx.query('UPDATE exchanges SET expires_at=$3,version=version+1 WHERE id=$1 AND workspace_id=$2',[op.exchangeId,w,review.to]);const e=await exchangeRow(tx,w,op.exchangeId),g=await groupRow(tx,w,e.group_id);await logExchange(tx,e,'extended',{from:review.from,to:review.to,authorization},a);const emails=op.notify?await queueExchangeNotice(tx,a,w,p,g,e,'extended'):[];return {status:'saved',exchange:publicExchange(e),emails};}
 if(op.kind==='revoke_exchange'){await tx.query('UPDATE exchanges SET revoked_at=now(),version=version+1 WHERE id=$1 AND workspace_id=$2',[op.exchangeId,w]);const e=await exchangeRow(tx,w,op.exchangeId),g=await groupRow(tx,w,e.group_id);await logExchange(tx,e,'revoked',{reason:op.reason,authorization},a);const emails=!op.notify?[]:g.kind==='room'?await queueNotices(tx,w,g,review.email):await queueExchangeNotice(tx,a,w,p,g,e,'revoked');return {status:'saved',exchange:publicExchange(e),emails,kept:'All received submissions, files and messages are kept.'};}
 if(op.kind==='accept_exchange_submission'){
  const service=new Service(adapter(tx)),draft=await service.preview(a,w,{...review.target,data:op.data});const receipt=await service.commit(a,draft.id,draft.digest,authorization);
  const recordId=review.target.kind==='update_record'?review.target.recordId:receipt.objects[0].id,e=await exchangeRow(tx,w,review.exchangeId);
  await tx.query('INSERT INTO exchange_acceptances(submission_id,workspace_id,exchange_id,record_id,actor_id) VALUES($1,$2,$3,$4,$5)',[op.submissionId,w,e.id,recordId,a.userId]);
  await logExchange(tx,e,'accepted',{submissionId:op.submissionId,version:review.version,recordId,target:op.target,authorization},a);return {status:'saved',submissionId:op.submissionId,recordId,receipt};
 }
 if(op.kind==='accept_exchange_file'){
  const f=(await tx.query('SELECT * FROM exchange_files WHERE id=$1 AND workspace_id=$2',[op.fileId,w])).rows[0],bytes=Buffer.from(f.bytes);if(checksum(bytes)!==f.checksum)fail(500,'integrity_failure','Original integrity check failed');
  const service=new Service(adapter(tx)),draft=await service.previewFile(a,w,{filename:f.filename,mime:f.mime,bytes,ai:op.ai}),receipt=await service.commit(a,draft.id,draft.digest,authorization),versionId=receipt.objects[0].versionId;
  const e=await exchangeRow(tx,w,f.exchange_id);await tx.query('INSERT INTO exchange_file_acceptances(file_id,workspace_id,exchange_id,version_id,actor_id) VALUES($1,$2,$3,$4,$5)',[f.id,w,e.id,versionId,a.userId]);
  await logExchange(tx,e,'file_accepted',{fileId:f.id,slot:f.slot,versionId,ai:op.ai,authorization},a);
  const unlock=op.notify?await levelUnlockNotice(tx,a,w,await groupRow(tx,w,e.group_id),e,f.slot):null;
  return {status:'saved',fileId:f.id,versionId,emails:unlock?.email?await queueNotices(tx,w,await groupRow(tx,w,e.group_id),unlock.email):[]};
 }
 if(op.kind==='reply_exchange'){
  const e=await exchangeRow(tx,w,op.exchangeId),g=await groupRow(tx,w,e.group_id),messageId=randomUUID();
  await tx.query("INSERT INTO exchange_messages(id,workspace_id,group_id,exchange_id,kind,author,body,author_id) VALUES($1,$2,$3,$4,'private','workspace',$5,$6)",[messageId,w,g.id,e.id,op.body,a.userId]);
  await logExchange(tx,e,'message',{messageId,author:'workspace',authorization},a);const emails=op.notify?await queueExchangeNotice(tx,a,w,p,g,e,'message',op.body):[];return {status:'saved',messageId,emails};
 }
 if(op.kind==='reply_exchanges'){
  const sent=[];for(const r of op.replies){const e=await exchangeRow(tx,w,r.exchangeId),g=await groupRow(tx,w,e.group_id),messageId=randomUUID();
   await tx.query("INSERT INTO exchange_messages(id,workspace_id,group_id,exchange_id,kind,author,body,author_id) VALUES($1,$2,$3,$4,'private','workspace',$5,$6)",[messageId,w,g.id,e.id,r.body,a.userId]);
   await logExchange(tx,e,'message',{messageId,author:'workspace',authorization},a);sent.push({exchangeId:e.id,messageId,emails:op.notify?await queueExchangeNotice(tx,a,w,p,g,e,'message',r.body):[]});}
  return {status:'saved',messages:sent};
 }
 if(op.kind==='publish_exchange_clarification'){
  const g=await groupRow(tx,w,op.groupId),messageId=randomUUID();
  await tx.query("INSERT INTO exchange_messages(id,workspace_id,group_id,exchange_id,kind,author,question,body,author_id,source_message_id) VALUES($1,$2,$3,NULL,'clarification','workspace',$4,$5,$6,$7)",[messageId,w,g.id,op.question||null,op.body,a.userId,op.sourceMessageId??null]);
  await audit(tx,a,p,'exchange.clarification',messageId,null,{groupId:g.id,question:op.question,sourceMessageId:op.sourceMessageId??null,authorization});
  const emails=[];if(op.notify)for(const e of await liveExchanges(tx,g.id))emails.push(...await queueExchangeNotice(tx,a,w,p,g,e,'clarification',(op.question?'A recipient asked: '+op.question+'\n\n':'')+op.body));
  return {status:'saved',messageId,emails};
 }
 if(op.kind==='save_exchange_email_default'){
  if(op.text)await tx.query('INSERT INTO exchange_email_defaults(workspace_id,email_type,subject,body,updated_by,updated_at) VALUES($1,$2,$3,$4,$5,now()) ON CONFLICT(workspace_id,email_type) DO UPDATE SET subject=$3,body=$4,updated_by=$5,updated_at=now()',[w,op.emailType,op.text.subject,op.text.body,a.userId]);
  else await tx.query('DELETE FROM exchange_email_defaults WHERE workspace_id=$1 AND email_type=$2',[w,op.emailType]);
  await audit(tx,a,p,'exchange.email_default_saved',null,null,{emailType:op.emailType,text:op.text,authorization});return {status:'saved',emailType:op.emailType};
 }
 const result=await confirmExchangeBatch(tx,a,w,op.batchId,op.digest);const b=(await tx.query('SELECT * FROM exchange_email_batches WHERE id=$1',[op.batchId])).rows[0];
 for(const r of b.rendered as any[]){const e=await exchangeRow(tx,w,r.exchangeId);await logExchange(tx,e,b.scheduled_at?'reminder_approved':'email_sent',{batchId:b.id,emailType:b.email_type,to:r.to,subject:r.subject,from:b.display_name,replyTo:b.reply_to,scheduledAt:b.scheduled_at,authorization},a);}
 return {status:'saved',...result};
}

/** Read-only status for app UIs: opened, verified, acknowledged, downloads, draft, submitted version, documents back, unread. */
export async function exchangeStatus(tx:Connection,e:any,group:any){
 const events=(await tx.query('SELECT kind,detail,created_at FROM exchange_events WHERE exchange_id=$1 ORDER BY created_at',[e.id])).rows;
 const first=(k:string)=>events.find(x=>x.kind===k)?.created_at??null,last=(k:string)=>[...events].reverse().find(x=>x.kind===k)?.created_at??null;
 const submitted=(await tx.query('SELECT s.id,s.version,s.created_at,acc.record_id FROM exchange_submissions s LEFT JOIN exchange_acceptances acc ON acc.submission_id=s.id WHERE s.exchange_id=$1 ORDER BY s.version DESC LIMIT 1',[e.id])).rows[0];
 const draft=(await tx.query('SELECT updated_at FROM exchange_drafts WHERE exchange_id=$1',[e.id])).rows[0];
 const files=(await tx.query('SELECT f.id,f.slot,f.filename,f.created_at,acc.version_id FROM exchange_files f LEFT JOIN exchange_file_acceptances acc ON acc.file_id=f.id WHERE f.exchange_id=$1 AND f.slot IS NOT NULL AND f.removed_at IS NULL ORDER BY f.created_at',[e.id])).rows;
 const documentsBack=(group.slots as any[]).map(s=>{const received=files.filter(f=>f.slot===s.key),accepted=received.find(f=>f.version_id);return {slot:s.key,label:s.label,required:s.required,status:accepted?'accepted':received.length?'received':'requested',fileId:(accepted??received[received.length-1])?.id??null,versionId:accepted?.version_id??null,receivedAt:received[received.length-1]?.created_at??null};});
 const unread=Number((await tx.query("SELECT count(*) AS n FROM exchange_messages m WHERE m.exchange_id=$1 AND m.author='recipient' AND NOT EXISTS(SELECT 1 FROM exchange_message_reads r WHERE r.message_id=m.id AND r.reader='workspace')",[e.id])).rows[0].n);
 const closed=!!e.revoked_at||(!!e.expires_at&&new Date(e.expires_at).getTime()<=Date.now());
 if(group.kind==='room')return {kind:'room',opened:first('opened'),lastOpened:last('opened'),verified:first('verified'),acknowledged:first('acknowledged'),levelAcknowledgements:events.filter(x=>x.kind==='level_acknowledged').map(x=>({level:x.detail.level,name:x.detail.name,at:x.created_at})),documentsBack,downloads:events.filter(x=>x.kind==='downloaded').map(x=>({versionId:x.detail.versionId,filename:x.detail.filename,at:x.created_at})),...await roomStatus(tx,e,group),expiresAt:e.expires_at,revokedAt:e.revoked_at,closed,state:e.revoked_at?'revoked':closed?'ended':first('opened')?'active':'invited'};
 return {opened:first('opened'),lastOpened:last('opened'),verified:first('verified'),acknowledged:first('acknowledged'),downloads:events.filter(x=>x.kind==='downloaded').map(x=>({versionId:x.detail.versionId,filename:x.detail.filename,at:x.created_at})),draftSavedAt:draft?.updated_at??null,submitted:submitted?{version:submitted.version,at:submitted.created_at,submissionId:submitted.id,accepted:!!submitted.record_id,recordId:submitted.record_id}:null,documentsBack,unreadMessages:unread,expiresAt:e.expires_at,revokedAt:e.revoked_at,closed,state:e.revoked_at?'revoked':closed?'closed':submitted?'submitted':draft?'draft':first('opened')?'opened':'invited'};
}
export async function listExchanges(db:Connection,a:Actor,w:string,q:{groupId?:string;appId?:string;appRef?:string;offset?:number}){
 const groups=(await db.query('SELECT * FROM exchange_groups WHERE workspace_id=$1 AND ($2::uuid IS NULL OR id=$2) AND ($3::uuid IS NULL OR app_id=$3) AND ($5::text IS NULL OR app_ref=$5) ORDER BY created_at DESC LIMIT 26 OFFSET $4',[w,q.groupId??null,q.appId??null,q.offset??0,q.appRef??null])).rows;
 const result=[];for(const g of groups.slice(0,25)){try{await exchangeAuthority(db,a,w,g.app_id,false);}catch(e){if([403,404].includes((e as any).status))continue;throw e;}
  const exchanges=[];for(const e of (await db.query('SELECT * FROM exchanges WHERE group_id=$1 ORDER BY created_at',[g.id])).rows)exchanges.push({...publicExchange(e),...(a.origin==='human'?{url:exchangeLink(e.link_token)}:{}),status:await exchangeStatus(db,e,g)});
  result.push({...publicGroup(g),exchanges});}
 return {groups:result,nextOffset:groups.length>25?(q.offset??0)+25:null,interpretation:'Per-recipient exchanges with their current status. Links are shown to signed-in people only; assistants prepare emails with prepare_exchange_email instead of handling links.'};
}
export async function listExchangeSubmissions(db:Connection,a:Actor,w:string,q:{groupId?:string;exchangeId?:string;offset?:number}){
 const rows=(await db.query('SELECT s.*,x.group_id,x.record_id,x.recipient_name,acc.record_id AS accepted_record_id,acc.created_at AS accepted_at FROM exchange_submissions s JOIN exchanges x ON x.id=s.exchange_id LEFT JOIN exchange_acceptances acc ON acc.submission_id=s.id WHERE s.workspace_id=$1 AND ($2::uuid IS NULL OR x.group_id=$2) AND ($3::uuid IS NULL OR s.exchange_id=$3) ORDER BY s.created_at DESC,s.id LIMIT 26 OFFSET $4',[w,q.groupId??null,q.exchangeId??null,q.offset??0])).rows;
 const submissions=[];for(const s of rows.slice(0,25)){const g=await groupRow(db,w,s.group_id);try{await exchangeAuthority(db,a,w,g.app_id,false);}catch(e){if([403,404].includes((e as any).status))continue;throw e;}
  let data:any=null;if(a.origin==='human'||s.accepted_record_id){const {type,policy}=await typeAccess(db,a,w,g.type_id);data=projectData(s.data,visibleFields(type.fields,policy,a));}
  const files=(await db.query('SELECT f.id,f.filename,f.mime,f.byte_size,f.checksum,acc.version_id FROM exchange_files f LEFT JOIN exchange_file_acceptances acc ON acc.file_id=f.id WHERE f.submission_id=$1 ORDER BY f.created_at',[s.id])).rows.map(f=>({id:f.id,filename:f.filename,mime:f.mime,byteSize:f.byte_size,accepted:!!f.version_id,versionId:f.version_id,aiReadable:!!f.version_id&&'after acceptance, per document permissions'}));
  submissions.push({id:s.id,exchangeId:s.exchange_id,groupId:s.group_id,boundRecordId:s.record_id,recipientName:s.recipient_name,version:s.version,submittedAt:s.created_at,accepted:!!s.accepted_record_id,recordId:s.accepted_record_id,acceptedAt:s.accepted_at,data,files});}
 return {submissions,nextOffset:rows.length>25?(q.offset??0)+25:null,interpretation:a.origin==='ai'?'Unverified external statements. Field values are shown once a person accepted the submission; unaccepted uploads are not readable. Propose accept_exchange_submission for human review.':'Unverified external statements until accepted. Files stay out of AI reach until accepted as documents.'};
}
export async function listExchangeMessages(db:Connection,a:Actor,w:string,q:{groupId?:string;exchangeId?:string;offset?:number;markRead?:boolean}){
 const rows=(await db.query("SELECT m.*,x.recipient_name FROM exchange_messages m LEFT JOIN exchanges x ON x.id=m.exchange_id WHERE m.workspace_id=$1 AND ($2::uuid IS NULL OR m.group_id=$2) AND ($3::uuid IS NULL OR m.exchange_id=$3 OR (m.kind='clarification' AND m.group_id=(SELECT group_id FROM exchanges WHERE id=$3))) ORDER BY m.created_at DESC,m.id LIMIT 26 OFFSET $4",[w,q.groupId??null,q.exchangeId??null,q.offset??0])).rows;
 const messages=[];for(const m of rows.slice(0,25)){const g=await groupRow(db,w,m.group_id);try{await exchangeAuthority(db,a,w,g.app_id,false);}catch(e){if([403,404].includes((e as any).status))continue;throw e;}
  const read=!!(await db.query("SELECT 1 FROM exchange_message_reads WHERE message_id=$1 AND reader='workspace'",[m.id])).rows.length;
  if(q.markRead&&a.origin==='human'&&!read&&m.author==='recipient')await db.query("INSERT INTO exchange_message_reads(message_id,workspace_id,reader,exchange_id) VALUES($1,$2,'workspace',NULL) ON CONFLICT DO NOTHING",[m.id,w]);
  messages.push({id:m.id,groupId:m.group_id,exchangeId:m.exchange_id,kind:m.kind,author:m.author,recipientName:m.kind==='private'?m.recipient_name:null,question:m.question,body:m.body,sourceMessageId:m.source_message_id,createdAt:m.created_at,read:read||m.author!=='recipient'});}
 return {messages,nextOffset:rows.length>25?(q.offset??0)+25:null};
}
export async function exchangeEmailDefault(db:Connection,a:Actor,w:string,q:{groupId?:string;emailType:EmailType}){
 await access(db,a,w);const g=q.groupId?await groupRow(db,w,q.groupId):null;if(g)await exchangeAuthority(db,a,w,g.app_id,false);
 const text=await resolveDefault(db,w,g,q.emailType);return {emailType:q.emailType,...text,platformDefault:platformDefaults[q.emailType],placeholders:PLACEHOLDERS.map(k=>`{${k}}`)};
}
export async function prepareExchangeEmailBatch(db:Database,a:Actor,w:string,input:unknown){
 const v=prepareEmailSchema.parse(input);return db.transaction(async tx=>{const g=await groupRow(tx,w,v.groupId),p=await exchangeAuthority(tx,a,w,g.app_id,true);if(g.archived)fail(409,'group_archived','This exchange group is archived');const live=g.kind==='room'?await liveRoomExchanges(tx,g.id):(await liveExchanges(tx,g.id)).filter(e=>new Date(e.expires_at).getTime()>Date.now()||v.emailType==='revoked');return prepareExchangeEmail(tx,a,w,p,g,live,v,v.emailType==='documents_updated'?e=>digestDocuments(tx,g,e):undefined);});
}
export async function readExchangeEmails(db:Connection,a:Actor,w:string,q:{groupId?:string;exchangeId?:string;offset?:number}){
 const rows=(await db.query('SELECT x.id,x.group_id,x.exchange_id,x.batch_id,x.email_type,x.to_email,x.from_name,x.reply_to,x.subject,x.status,x.diagnostic,x.created_at,x.sent_at FROM exchange_emails x WHERE x.workspace_id=$1 AND ($2::uuid IS NULL OR x.group_id=$2) AND ($3::uuid IS NULL OR x.exchange_id=$3) ORDER BY x.created_at DESC LIMIT 51 OFFSET $4',[w,q.groupId??null,q.exchangeId??null,q.offset??0])).rows;
 const emails=[];for(const x of rows.slice(0,50)){if(x.group_id){const g=await groupRow(db,w,x.group_id);try{await exchangeAuthority(db,a,w,g.app_id,false);}catch(e){if([403,404].includes((e as any).status))continue;throw e;}}emails.push({id:x.id,groupId:x.group_id,exchangeId:x.exchange_id,batchId:x.batch_id,emailType:x.email_type,to:x.to_email,from:x.from_name,replyTo:x.reply_to,subject:x.subject,status:x.status,diagnostic:x.diagnostic,createdAt:x.created_at,sentAt:x.sent_at});}
 return {emails,nextOffset:rows.length>50?(q.offset??0)+50:null};
}
/** In-app and email notifications for the workspace: group owner plus members holding the external-send right. */
export async function notifyWorkspace(tx:Connection,exchange:any,kind:'submission'|'message'|'document'|'deadline'|'first_open'|'question'|'access_ending'|'hot'|'quiet',title:string){
 const g=await groupRow(tx,exchange.workspace_id,exchange.group_id),ws=(await tx.query('SELECT id,name,tenant_id FROM workspaces WHERE id=$1',[exchange.workspace_id])).rows[0];
 const members=(await tx.query("SELECT u.id,u.email FROM users u WHERE u.id=$1 OR u.id IN (SELECT user_id FROM workspace_access WHERE workspace_id=$2 AND external_send AND role<>'inspector')",[g.owner_id,exchange.workspace_id])).rows;
 const link=`${exchangeLink('').split('/exchange#')[0]}/?tab=home&workspaceId=${exchange.workspace_id}`;
 for(const m of members){await tx.query('INSERT INTO exchange_notifications(id,workspace_id,user_id,exchange_id,kind,title) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),exchange.workspace_id,m.id,exchange.id,kind,title]);
  try{await queueEmail(tx,{workspaceId:exchange.workspace_id,groupId:g.id,exchangeId:exchange.id,emailType:'workspace_notification',to:m.email,fromName:'TrialAgents',replyTo:null,subject:`${title} — ${g.title}`,text:`${title} in "${g.title}" (${exchange.recipient_name||exchange.recipient_emails[0]}).\n\nOpen TrialAgents: ${link}\n\n—\nTrialAgents sends this to registered members of ${ws.name}. Report abuse: ${exchangeLink('').split('/exchange#')[0]}/report-abuse`});}catch{}}
}
export async function listExchangeNotifications(db:Connection,a:Actor,w:string,markRead=false){
 await access(db,a,w);const rows=(await db.query('SELECT n.id,n.exchange_id,n.kind,n.title,n.created_at,n.read_at,x.group_id,x.recipient_name FROM exchange_notifications n JOIN exchanges x ON x.id=n.exchange_id WHERE n.workspace_id=$1 AND n.user_id=$2 ORDER BY n.created_at DESC LIMIT 50',[w,a.userId])).rows;
 if(markRead&&a.origin==='human')await db.query('UPDATE exchange_notifications SET read_at=now() WHERE workspace_id=$1 AND user_id=$2 AND read_at IS NULL',[w,a.userId]);
 return {notifications:rows.map(r=>({id:r.id,exchangeId:r.exchange_id,groupId:r.group_id,recipientName:r.recipient_name,kind:r.kind,title:r.title,createdAt:r.created_at,read:!!r.read_at}))};
}
/** Worker: turn recipient-side events (submitted, message, uploaded document, deadline passed) into workspace notifications, once each. */
export async function dispatchExchangeNotifications(db:Database){
 const events=(await db.query("SELECT v.*,e.workspace_id AS w FROM exchange_events v JOIN exchanges e ON e.id=v.exchange_id WHERE v.kind IN ('submitted','message','uploaded','deadline_passed','first_opened','question','access_ending','hot','quiet') AND (v.kind<>'message' OR v.detail->>'author'='recipient') AND (v.kind<>'uploaded' OR v.detail->>'slot' IS NOT NULL) AND NOT EXISTS(SELECT 1 FROM exchange_events n WHERE n.exchange_id=v.exchange_id AND n.kind='notified' AND n.detail->>'eventId'=v.id::text) ORDER BY v.created_at LIMIT 100")).rows;
 for(const v of events)await db.transaction(async tx=>{const e=await exchangeRow(tx,v.workspace_id,v.exchange_id);const kind=({submitted:'submission',message:'message',uploaded:'document',deadline_passed:'deadline',first_opened:'first_open',question:'question',access_ending:'access_ending',hot:'hot',quiet:'quiet'} as const)[v.kind as 'submitted'];const title=v.kind==='submitted'?`New submission (version ${v.detail.version})`:v.kind==='message'?'New message':v.kind==='uploaded'?`Document uploaded: ${v.detail.label??v.detail.slot}`:v.kind==='first_opened'?'Opened the room for the first time':v.kind==='question'?'Question asked':v.kind==='access_ending'?'Access ends within 7 days':v.kind==='hot'?'Hot party: frequent recent views':v.kind==='quiet'?'Quiet party: no recent visit':'Deadline passed';await notifyWorkspace(tx,e,kind,title);await tx.query('INSERT INTO exchange_events(id,workspace_id,exchange_id,kind,detail) VALUES($1,$2,$3,$4,$5)',[randomUUID(),e.workspace_id,e.id,'notified',J({eventId:v.id,kind})]);});
 return events.length;
}
/** Deadline passed: one event per exchange once its deadline is behind us (worker sweep); the notification follows. */
export async function sweepExchangeDeadlines(db:Database){
 const due=(await db.query("SELECT e.* FROM exchanges e JOIN exchange_groups g ON g.id=e.group_id WHERE g.kind='request' AND e.revoked_at IS NULL AND e.expires_at<=now() AND e.expires_at>now()-interval '7 days' AND NOT g.archived AND NOT EXISTS(SELECT 1 FROM exchange_events v WHERE v.exchange_id=e.id AND v.kind='deadline_passed') LIMIT 100")).rows;
 for(const e of due)await db.transaction(async tx=>{await logExchange(tx,e,'deadline_passed',{expiresAt:e.expires_at});});
 return due.length;
}
/** The app a reviewed operation belongs to, so a running app can only touch its own exchange groups. */
export async function exchangeOperationApp(db:Connection,w:string,op:ExchangeOperation):Promise<string|null>{
 if(op.kind==='create_exchange_group')return op.config.appId??null;
 if(op.kind==='save_exchange_email_default')return null;
 if(op.kind==='reply_exchanges'){const apps=new Set<string|null>();for(const r of op.replies)apps.add((await groupRow(db,w,(await exchangeRow(db,w,r.exchangeId)).group_id)).app_id);if(apps.size!==1)fail(400,'exchange_scope','Reply to recipients of one app at a time');return [...apps][0];}
 if('groupId' in op)return (await groupRow(db,w,op.groupId)).app_id;
 if('exchangeId' in op)return (await groupRow(db,w,(await exchangeRow(db,w,op.exchangeId)).group_id)).app_id;
 if(op.kind==='answer_exchange_question'){const q=(await db.query('SELECT group_id FROM exchange_questions WHERE id=$1 AND workspace_id=$2',[op.questionId,w])).rows[0];if(!q)fail(404,'not_found','Question not found');return (await groupRow(db,w,q.group_id)).app_id;}
 const row=op.kind==='send_exchange_email'?(await db.query('SELECT group_id FROM exchange_email_batches WHERE id=$1 AND workspace_id=$2',[op.batchId,w])).rows[0]
  :op.kind==='accept_exchange_submission'?(await db.query('SELECT x.group_id FROM exchange_submissions s JOIN exchanges x ON x.id=s.exchange_id WHERE s.id=$1 AND s.workspace_id=$2',[op.submissionId,w])).rows[0]
  :(await db.query('SELECT x.group_id FROM exchange_files f JOIN exchanges x ON x.id=f.exchange_id WHERE f.id=$1 AND f.workspace_id=$2',[op.fileId,w])).rows[0];
 if(!row)fail(404,'not_found','Exchange item not found');return (await groupRow(db,w,row.group_id)).app_id;
}
export const appExchangeWrites:Record<string,ExchangeOperation['kind']>={'exchange.createGroup':'create_exchange_group','exchange.invite':'invite_exchange','exchange.updateBrief':'update_exchange_brief','exchange.shareDocuments':'share_exchange_documents','exchange.requestDocument':'request_exchange_document','exchange.extend':'extend_exchange','exchange.revoke':'revoke_exchange','exchange.sendEmail':'send_exchange_email','exchange.acceptSubmission':'accept_exchange_submission','exchange.acceptFile':'accept_exchange_file','exchange.reply':'reply_exchange','exchange.replyAll':'reply_exchanges','exchange.publishClarification':'publish_exchange_clarification','exchange.saveDefaultEmail':'save_exchange_email_default','exchange.defineLevels':'define_exchange_levels','exchange.setLevels':'set_exchange_levels','exchange.replaceDocument':'replace_exchange_document','exchange.answer':'answer_exchange_question','exchange.publishAnswer':'publish_exchange_answer','exchange.approveDigest':'approve_exchange_digest','exchange.archiveGroup':'archive_exchange_group'};
export const appExchangeReads=['exchange.list','exchange.status','exchange.listSubmissions','exchange.listMessages','exchange.defaultEmail','exchange.prepareEmail','exchange.listEmails','exchange.notifications','exchange.listQuestions'] as const;
/** Read-side capabilities for a saved app; every result is limited to groups created by that app. */
export async function appExchangeRead(db:Database,a:Actor,w:string,appId:string,name:string,value:unknown){
 const v=(value??{}) as any,own=async(groupId?:string,exchangeId?:string)=>{const gid=groupId??(exchangeId?(await exchangeRow(db,w,exchangeId)).group_id:undefined);if(gid&&(await groupRow(db,w,gid)).app_id!==appId)fail(403,'exchange_scope','This exchange group belongs to another app');};
 if(name==='exchange.list')return listExchanges(db,a,w,{appId,groupId:v.groupId,appRef:typeof v.appRef==='string'?v.appRef.slice(0,200):undefined,offset:v.offset});
 if(name==='exchange.status'){await own(undefined,id.parse(v.exchangeId));const e=await exchangeRow(db,w,v.exchangeId),g=await groupRow(db,w,e.group_id);await exchangeAuthority(db,a,w,g.app_id,false);return {exchangeId:e.id,recordId:e.record_id,status:await exchangeStatus(db,e,g)};}
 if(name==='exchange.listSubmissions'){await own(v.groupId,v.exchangeId);if(!v.groupId&&!v.exchangeId)fail(400,'scope_required','Pass groupId or exchangeId');return listExchangeSubmissions(db,a,w,v);}
 if(name==='exchange.listMessages'){await own(v.groupId,v.exchangeId);if(!v.groupId&&!v.exchangeId)fail(400,'scope_required','Pass groupId or exchangeId');return listExchangeMessages(db,a,w,{...v,markRead:a.origin==='human'&&v.markRead!==false});}
 if(name==='exchange.defaultEmail'){await own(v.groupId);return exchangeEmailDefault(db,a,w,{groupId:v.groupId,emailType:v.emailType});}
 if(name==='exchange.prepareEmail'){await own(id.parse(v.groupId));return prepareExchangeEmailBatch(db,a,w,v);}
 if(name==='exchange.listEmails'){await own(v.groupId,v.exchangeId);if(!v.groupId&&!v.exchangeId)fail(400,'scope_required','Pass groupId or exchangeId');return readExchangeEmails(db,a,w,v);}
 if(name==='exchange.notifications')return listExchangeNotifications(db,a,w,false);
 if(name==='exchange.listQuestions'){await own(v.groupId,v.exchangeId);if(!v.groupId&&!v.exchangeId)fail(400,'scope_required','Pass groupId or exchangeId');return listExchangeQuestions(db,a,w,v);}
 fail(400,'unknown_capability','Unknown exchange capability');
}

/** Whether people outside the workspace may already see this group (an email was sent, a reminder approved, or a recipient opened a page).
 * Until then, preparing a group is not communication, so an app may apply it on a person's click without a separate review. */
export async function exchangeReachedOutside(db:Connection,q:{groupId?:string;exchangeId?:string}){
 return !!(await db.query("SELECT 1 FROM exchange_events v JOIN exchanges e ON e.id=v.exchange_id WHERE v.kind IN ('email_sent','reminder_approved','opened','verified','acknowledged','submitted','message') AND (e.group_id=$1 OR e.id=$2) LIMIT 1",[q.groupId??null,q.exchangeId??null])).rows.length;
}
/** Exchange operations that change only what nobody outside has seen yet. Everything else that reaches recipients is reviewed. */
export const preparationKinds=['create_exchange_group','invite_exchange','update_exchange_brief','share_exchange_documents','request_exchange_document','extend_exchange'] as const;
