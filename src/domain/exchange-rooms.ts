import {randomUUID} from 'node:crypto';
import type {Connection,Database} from '../db/database.js';
import {fail,type Actor} from '../shared/schema.js';
import {typeAccess,access} from './permissions.js';
import {audit} from './evidence.js';
import {exchangeAuthority,groupRow,exchangeRow,logExchange,documentRows} from './external-exchange.js';
import {renderNotices,queueNotices,levelNames,type NoticeEmail} from '../app-services/exchange-email.js';
import {ACCESS_TRACKED,ENGAGEMENT_FIELDS,DELIVERY_FIELDS,DELIVERY_STATUS,RESPONSE_FIELDS,RESPONSE_CONTEXT,TRACKED_FIELD_KIND,levelStates,roomView,changedSince,documentLines,gateState,roomEnded,titleOf,type RoomOperation,type RoomDocument} from './exchange-room-model.js';

/**
 * Room extension (docs/product/EXTERNAL_EXCHANGE.md §5): levels, documents replaced in place, room
 * Q&A, the pre-approved digest, room sweeps and the tracked output tables. Every workspace-side
 * write is a reviewed operation that a person confirms; tracked tables are written only here, by the
 * platform, from exchange events.
 */
const J=JSON.stringify;
const today=()=>new Date().toISOString().slice(0,10);
const day=(d:any)=>d?new Date(d).toISOString().slice(0,10):null;
export const requireRoom=(g:any)=>{if(g.kind!=='room')fail(400,'room_only','This works in room mode only');};
/** Live people of a room: not revoked and not past their end date. */
export async function liveRoomExchanges(tx:Connection,groupId:string){return (await tx.query('SELECT * FROM exchanges WHERE group_id=$1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now()) ORDER BY created_at',[groupId])).rows;}

/** Levels: unique keys; a signed-document level names an existing requested-document slot. */
export function levelsProblem(levels:any[],slots:any[]){
 if(new Set(levels.map(l=>l.key)).size!==levels.length)return 'Level keys must be unique';
 for(const l of levels)if(l.entry==='signed_document'&&!slots.some(s=>s.key===l.slot))return `Level "${l.name}" needs the requested-document slot that unlocks it`;
 return null;
}
/** Room placement on top of the platform document row; only given keys are stored, so request groups keep their earlier shape. */
export function placed(row:any,item:any){const out:any={...row};for(const k of ['title','section','order','level','viewOnly','toSign'])if(item?.[k]!==undefined)out[k]=item[k];return out;}
export function documentsProblem(kind:string,levels:any[],documents:any[]){
 if(kind!=='room'&&documents.some(d=>d.section||d.order!==undefined||d.level||d.viewOnly||d.toSign||d.title))return 'Sections, order, levels and view-only are room settings';
 if(levels.length&&documents.some(d=>!levels.some(l=>l.key===d.level)))return 'Give every shared document one of the room levels';
 if(!levels.length&&documents.some(d=>d.level))return 'Define levels before assigning documents to them';
 return null;
}
/** Bound output tables (R7): the access table needs status and last_seen_on, the engagement table document_ref and view_count; present fields must have compatible kinds. */
export async function trackingReview(tx:Connection,a:Actor,w:string,tracking:{accessTypeId?:string;engagementTypeId?:string;deliveryTypeId?:string;responsesTypeId?:string}|undefined){
 const result:any[]=[];if(!tracking)return result;
 const check=async(role:'access'|'engagement'|'delivery'|'responses',typeId:string,required:string[],keys:string[])=>{
  const {type}=await typeAccess(tx,a,w,typeId,true),fields:any[]=type.fields;
  for(const k of required)if(!fields.some(f=>f.key===k))fail(400,'tracking_field',`The ${role} table needs a "${k}" field`);
  const present=keys.filter(k=>fields.some(f=>f.key===k));
  for(const k of present){const f=fields.find(x=>x.key===k),want=TRACKED_FIELD_KIND[k];const ok=want==='number'?['number','money'].includes(f.kind):want==='date'?['date','text'].includes(f.kind):['text','select'].includes(f.kind);if(!ok||f.multiple||f.formula||f.computed||f.lookup)fail(400,'tracking_field',`"${k}" in the ${role} table must be a single ${want} field`);
   // A delivery record is created by the app before anything is sent, so the fields TrialAgents fills cannot be required.
   if(role==='delivery'&&f.required)fail(400,'tracking_field',`"${k}" in the delivery table is filled by TrialAgents and cannot be required`);
   if(f.kind==='select'){const need=k==='status'?(role==='delivery'?DELIVERY_STATUS:['invited','active','revoked','expired']):k==='source'?['tracked']:[];if(need.some(v=>!(f.options??[]).includes(v)))fail(400,'tracking_field',`"${k}" in the ${role} table needs the options ${need.join(', ')}`);}}
  result.push({role,typeId,name:type.name,fields:role==='engagement'?['*']:present,writes:present});
 };
 if(tracking.accessTypeId)await check('access',tracking.accessTypeId,['status','last_seen_on'],[...ACCESS_TRACKED]);
 if(tracking.engagementTypeId)await check('engagement',tracking.engagementTypeId,['document_ref','view_count'],Object.keys(ENGAGEMENT_FIELDS));
 if(tracking.deliveryTypeId)await check('delivery',tracking.deliveryTypeId,['status','read_count'],Object.keys(DELIVERY_FIELDS));
 if(tracking.responsesTypeId)await check('responses',tracking.responsesTypeId,['ask_key','responded_on'],[...Object.keys(RESPONSE_FIELDS),...RESPONSE_CONTEXT]);
 if(tracking.accessTypeId&&tracking.deliveryTypeId)fail(400,'tracking_tables','Bind people to an access table (rooms) or a delivery table (updates), not both');
 const ids=Object.values(tracking).filter(Boolean);if(new Set(ids).size!==ids.length)fail(400,'tracking_tables',tracking.accessTypeId&&tracking.accessTypeId===tracking.engagementTypeId?'Use separate access and engagement tables':'Use a separate table for each tracked role');
 return result;
}
const noticeRecipients=(emails:any[])=>emails.map(m=>({exchangeId:m.exchangeId,to:m.to,subject:m.subject,text:m.text,personalised:m.personalised}));
/** The access-changed email when an accepted signed document opens a level for one person (rendered as sent; queued on confirm). */
export async function levelUnlockNotice(tx:Connection,a:Actor,w:string,g:any,e:any,slot:string|null){
 const level=(g.levels as any[]??[]).find(l=>l.entry==='signed_document'&&l.slot===slot);if(g.kind!=='room'||!level)return null;
 return {level:level.name as string,email:await notices(tx,a,w,g,[e],'access_changed','',undefined)};
}
async function notices(tx:Connection,a:Actor,w:string,g:any,exchanges:any[],type:any,message:string,email:NoticeEmail|undefined,documentsFor?:(e:any)=>Promise<string>){
 const p=await access(tx,a,w,true);const r=await renderNotices(tx,a,w,p,g,exchanges,type,message,email,documentsFor);
 return {...r,emails:noticeRecipients(r.emails)};
}
async function questionRow(tx:Connection,w:string,questionId:string){const q=(await tx.query('SELECT * FROM exchange_questions WHERE id=$1 AND workspace_id=$2',[questionId,w])).rows[0];if(!q)fail(404,'not_found','Question not found');return q;}
/** Since when a digest covers documents for this person: their last digest, else the approval. */
async function digestSince(tx:Connection,g:any,e:any){const last=(await tx.query("SELECT created_at FROM exchange_events WHERE exchange_id=$1 AND kind='digest_sent' ORDER BY created_at DESC LIMIT 1",[e.id])).rows[0];return last?.created_at??g.digest?.approvedAt??e.created_at;}
export async function digestItems(tx:Connection,g:any,e:any,since?:any){const view=await roomView(tx,g,e,(await gateState(tx,g,e)).unlocked);return changedSince(view,since??await digestSince(tx,g,e));}
export const digestDocuments=async(tx:Connection,g:any,e:any)=>{const items=await digestItems(tx,g,e);return items.length?documentLines(items):'No new or updated documents.';};

export async function roomReview(tx:Connection,a:Actor,w:string,op:RoomOperation):Promise<any>{
 if(op.kind==='set_exchange_levels'){
  const e=await exchangeRow(tx,w,op.exchangeId),g=await groupRow(tx,w,e.group_id);await exchangeAuthority(tx,a,w,g.app_id,true);requireRoom(g);if(g.archived)fail(409,'group_archived','This room is archived');if(e.revoked_at)fail(409,'exchange_revoked','Access was revoked');
  const keys=new Set((g.levels as any[]).map(l=>l.key));if(op.levels.some(k=>!keys.has(k))||new Set(op.levels).size!==op.levels.length)fail(400,'invalid_level','Choose distinct levels of this room');
  const ordered=(g.levels as any[]).filter(l=>op.levels.includes(l.key)).map(l=>l.key),next={...e,levels:ordered};
  if(op.entered.some(k=>!ordered.includes(k)||(g.levels as any[]).find(l=>l.key===k)?.entry==='none'))fail(400,'entry_scope','Record an entry step only for levels with a step that this person gets');if(op.entered.length&&!op.enteredNote)fail(400,'entry_note','Say how the entry step was met (for example the date the CDA was signed)');
  const enteredNames=(g.levels as any[]).filter(l=>op.entered.includes(l.key)).map(l=>l.name);
  return {exchangeId:e.id,recipient:e.recipient_name||e.recipient_emails[0],from:e.levels,to:ordered,levels:levelNames(g,next),entryRecorded:enteredNames,enteredNote:op.enteredNote??null,added:ordered.filter(k=>!(e.levels as string[]).includes(k)),removed:(e.levels as string[]).filter(k=>!ordered.includes(k)),notify:op.notify,email:op.notify?await notices(tx,a,w,g,[next],'access_changed','',op.email):null,effect:'Change the levels this person can open'+(enteredNames.length?`; record the entry step for ${enteredNames.join(', ')} as met (${op.enteredNote})`:'')+(op.notify?' and send them the email shown':'')+'. Documents at other levels stay invisible to them.'};
 }
 if(op.kind==='answer_exchange_question'){
  const q=await questionRow(tx,w,op.questionId),g=await groupRow(tx,w,q.group_id),e=await exchangeRow(tx,w,q.exchange_id);await exchangeAuthority(tx,a,w,g.app_id,true);if(g.archived)fail(409,'group_archived','This room is archived');
  if(op.supersedes){const old=(await tx.query("SELECT id FROM exchange_answers WHERE id=$1 AND question_id=$2 AND visibility='private'",[op.supersedes,q.id])).rows[0];if(!old)fail(404,'not_found','The answer to replace is not a private answer to this question');}
  const live=!e.revoked_at&&!roomEnded(e);
  return {questionId:q.id,exchangeId:e.id,recipient:e.recipient_name||e.recipient_emails[0],question:q.body,body:op.body,supersedes:op.supersedes??null,notify:op.notify&&live,email:op.notify&&live?await notices(tx,a,w,g,[e],'question_answered',op.body,op.email):null,effect:(op.supersedes?'Add a corrected answer':'Answer privately')+'; only the person who asked sees it'+(op.notify&&live?', with the email shown':'')+'. Answers cannot be changed after sending.'};
 }
 const g=await groupRow(tx,w,op.groupId);await exchangeAuthority(tx,a,w,g.app_id,true);
 if(op.kind==='archive_exchange_group'){if(g.archived===op.archived)fail(409,'unchanged',op.archived?'Already archived':'Not archived');return {groupId:g.id,title:g.title,archived:op.archived,live:(await liveRoomExchanges(tx,g.id)).length,effect:op.archived?'Archive this exchange group: every link stops working and tracked tables stop updating. Everything received is kept.':'Restore this exchange group: links that have not expired or been revoked work again.'};}
 requireRoom(g);if(g.archived)fail(409,'group_archived','This room is archived');
 if(op.kind==='publish_exchange_answer'){
  const q=op.questionId?await questionRow(tx,w,op.questionId):null;if(q&&q.group_id!==g.id)fail(404,'not_found','Question not found in this room');
  if(op.scope==='level'&&!(g.levels as any[]).some(l=>l.key===op.level))fail(400,'invalid_level','Choose a level of this room');if(op.scope==='room'&&op.level)fail(400,'invalid_level','A room-wide answer has no level');
  if(op.supersedes){const old=(await tx.query("SELECT id FROM exchange_answers WHERE id=$1 AND group_id=$2 AND visibility<>'private'",[op.supersedes,g.id])).rows[0];if(!old)fail(404,'not_found','The answer to replace is not a published answer of this room');}
  const recipients=(await liveRoomExchanges(tx,g.id)).filter(e=>op.scope==='room'||(e.levels as string[]).includes(op.level!));
  // A question about a document reaches only people who can see that document's level.
  const ref=q?.document_id?(g.documents as RoomDocument[]).find(d=>d.documentId===q.document_id):null;
  if(ref?.level&&recipients.some(e=>!(e.levels as string[]).includes(ref.level!)))fail(400,'level_scope',`This question refers to a document at a level not everyone in this ${op.scope==='room'?'room':'level'} holds; publish it to that level`);
  const question=op.question??q?.body??'';
  return {groupId:g.id,questionId:q?.id??null,scope:op.scope,level:op.level??null,levelName:op.level?(g.levels as any[]).find(l=>l.key===op.level).name:null,question,askerShownAs:question?'A participant asked':null,body:op.body,supersedes:op.supersedes??null,recipients:recipients.length,notify:op.notify,email:op.notify&&recipients.length?await notices(tx,a,w,g,recipients,'answer_published',(question?'A participant asked: '+question+'\n\n':'')+op.body,op.email):null,effect:`Publish to ${op.scope==='room'?'everyone in this room':'everyone holding this level'} without naming the asker`+(op.notify?', with the emails shown':'')+'. Answers cannot be changed after sending.'};
 }
 if(op.expectedVersion!==g.version)fail(409,'stale_version','Exchange group changed; prepare again');
 if(op.kind==='define_exchange_levels'){
  const problem=levelsProblem(op.levels,g.slots);if(problem)fail(400,'invalid_levels',problem);
  const keys=new Set(op.levels.map(l=>l.key)),removed=(g.levels as any[]).filter(l=>!keys.has(l.key)).map(l=>l.key);
  if((g.documents as any[]).some(d=>removed.includes(d.level)))fail(409,'level_in_use','Move the documents of a level before removing it');
  if((await liveRoomExchanges(tx,g.id)).some(e=>(e.levels as string[]).some(k=>removed.includes(k))))fail(409,'level_in_use','Change the access of people holding a level before removing it');
  if(!(g.levels as any[]).length&&(g.documents as any[]).length)fail(409,'level_documents','Share documents again with a level for each');
  return {groupId:g.id,version:g.version,before:g.levels,levels:op.levels,removed,effect:'Set the ordered levels of this room and the entry step of each.'};
 }
 if(op.kind==='replace_exchange_document'){
  const current=(g.documents as RoomDocument[]).find(d=>d.versionId===op.versionId);if(!current)fail(404,'not_found','Document is not shared in this room');
  const [next]=await documentRows(tx,a,w,[op.newVersionId]);if(next!.documentId!==current.documentId)fail(400,'other_document','Choose a newer version of the same document');
  const versions=(await tx.query('SELECT id,version FROM document_versions WHERE id=ANY($1::uuid[])',[[op.versionId,op.newVersionId]])).rows;if(Number(versions.find(v=>v.id===op.newVersionId).version)<=Number(versions.find(v=>v.id===op.versionId).version))fail(400,'older_version','Choose a newer version of the document');
  return {groupId:g.id,version:g.version,title:titleOf(current),section:current.section??null,level:current.level??null,order:current.order??null,from:op.versionId,to:op.newVersionId,filename:next!.filename,effect:'Show this newer version in the same place, at the same level, marked Updated. Earlier views stay on record.'};
 }
 // approve_exchange_digest
 const p=await access(tx,a,w,true);
 if(!op.text)return {groupId:g.id,version:g.version,text:null,before:g.digest?{subject:g.digest.subject,body:g.digest.body}:null,effect:'Stop the automatic daily digest. Document updates can still be emailed with a reviewed send.'};
 const live=await liveRoomExchanges(tx,g.id);
 const sample=await renderNotices(tx,a,w,p,g,live,'documents_updated','',{subject:op.text.subject,body:op.text.body,overrides:{},nameKind:op.nameKind,customName:op.customName},e=>digestDocuments(tx,g,e));
 return {groupId:g.id,version:g.version,text:op.text,from:sample.from,replyTo:sample.replyTo,displayName:sample.displayName,today:noticeRecipients(sample.emails),effect:'Approve this digest text. Once a day, each person with new or updated documents at their levels receives it with their own list (as shown for today); nothing else is sent automatically.'};
}

export async function commitRoomOperation(tx:Connection,a:Actor,w:string,op:RoomOperation,review:any,authorization:unknown):Promise<any>{
 const p=await access(tx,a,w,true);
 if(op.kind==='set_exchange_levels'){
  await tx.query('UPDATE exchanges SET levels=$3,version=version+1 WHERE id=$1 AND workspace_id=$2',[op.exchangeId,w,J(review.to)]);const e=await exchangeRow(tx,w,op.exchangeId),g=await groupRow(tx,w,e.group_id);
  await logExchange(tx,e,'levels_changed',{from:review.from,to:review.to,authorization},a);for(const level of op.entered)await logExchange(tx,e,'level_entry_recorded',{level,note:op.enteredNote,authorization},a);return {status:'saved',exchangeId:e.id,levels:e.levels,emails:review.email?await queueNotices(tx,w,g,review.email):[]};
 }
 if(op.kind==='answer_exchange_question'){
  const q=await questionRow(tx,w,op.questionId),e=await exchangeRow(tx,w,q.exchange_id),g=await groupRow(tx,w,q.group_id),answerId=randomUUID();
  await tx.query("INSERT INTO exchange_answers(id,workspace_id,group_id,question_id,exchange_id,visibility,body,author_id,supersedes) VALUES($1,$2,$3,$4,$5,'private',$6,$7,$8)",[answerId,w,g.id,q.id,e.id,op.body,a.userId,op.supersedes??null]);
  await logExchange(tx,e,'answered',{questionId:q.id,answerId,supersedes:op.supersedes??null,authorization},a);return {status:'saved',answerId,emails:review.email?await queueNotices(tx,w,g,review.email):[]};
 }
 const g=await groupRow(tx,w,op.groupId);
 if(op.kind==='archive_exchange_group'){await tx.query('UPDATE exchange_groups SET archived=$3,version=version+1 WHERE id=$1 AND workspace_id=$2',[g.id,w,op.archived]);await audit(tx,a,p,op.archived?'exchange.group_archived':'exchange.group_restored',g.id,{archived:g.archived},{archived:op.archived,authorization});return {status:'saved',groupId:g.id,archived:op.archived};}
 if(op.kind==='publish_exchange_answer'){
  const answerId=randomUUID();
  await tx.query('INSERT INTO exchange_answers(id,workspace_id,group_id,question_id,exchange_id,visibility,level,question,body,author_id,supersedes) VALUES($1,$2,$3,$4,NULL,$5,$6,$7,$8,$9,$10)',[answerId,w,g.id,review.questionId,op.scope,op.level??null,review.question||null,op.body,a.userId,op.supersedes??null]);
  await audit(tx,a,p,'exchange.answer_published',answerId,null,{groupId:g.id,scope:op.scope,level:op.level??null,questionId:review.questionId,supersedes:op.supersedes??null,recipients:review.recipients,authorization});
  return {status:'saved',answerId,emails:review.email?await queueNotices(tx,w,g,review.email):[]};
 }
 if(op.kind==='define_exchange_levels'){await tx.query('UPDATE exchange_groups SET levels=$3,version=version+1 WHERE id=$1 AND workspace_id=$2',[g.id,w,J(op.levels)]);await audit(tx,a,p,'exchange.levels_defined',g.id,{levels:review.before},{levels:op.levels,authorization});return {status:'saved',groupId:g.id,levels:op.levels};}
 if(op.kind==='replace_exchange_document'){
  const [next]=await documentRows(tx,a,w,[op.newVersionId]),now=new Date().toISOString();
  const documents=(g.documents as RoomDocument[]).map(d=>d.versionId===op.versionId?{...d,versionId:next!.versionId,filename:next!.filename,mime:next!.mime,byteSize:next!.byteSize,updatedAt:now,previous:[...(d.previous??[]),d.versionId]}:d);
  await tx.query('UPDATE exchange_groups SET documents=$3,version=version+1 WHERE id=$1 AND workspace_id=$2',[g.id,w,J(documents)]);
  await audit(tx,a,p,'exchange.document_replaced',g.id,{versionId:op.versionId},{versionId:op.newVersionId,title:review.title,section:review.section,level:review.level,authorization});return {status:'saved',groupId:g.id,versionId:op.newVersionId};
 }
 const digest=op.text?{subject:op.text.subject,body:op.text.body,displayName:review.displayName,replyTo:review.replyTo,senderUserId:a.userId,nameKind:op.nameKind??null,customName:op.customName??null,approvedBy:a.userId,approvedAt:new Date().toISOString()}:null;
 await tx.query('UPDATE exchange_groups SET digest=$3,version=version+1 WHERE id=$1 AND workspace_id=$2',[g.id,w,digest?J(digest):null]);
 await audit(tx,a,p,digest?'exchange.digest_approved':'exchange.digest_stopped',g.id,null,{text:op.text,from:review.from??null,authorization});return {status:'saved',groupId:g.id,digest};
}

/** Engagement for app UIs (R4): per document views, approximate seconds, downloads and last seen, with a per-version breakdown. */
export async function roomStatus(tx:Connection,e:any,g:any){
 const views=(await tx.query('SELECT document_id,version_id,count(*)::int AS views,coalesce(sum(seconds),0)::int AS seconds,max(last_beat_at) AS last FROM exchange_views WHERE exchange_id=$1 GROUP BY document_id,version_id',[e.id])).rows;
 const downloads=(await tx.query("SELECT detail->>'versionId' AS version_id,detail->>'documentId' AS document_id,count(*)::int AS n,max(created_at) AS last FROM exchange_events WHERE exchange_id=$1 AND kind='downloaded' GROUP BY 1,2",[e.id])).rows;
 const docs=(g.documents as RoomDocument[]).map(d=>{const ids=[d.versionId,...(d.previous??[])],v=views.filter(x=>x.document_id===d.documentId),dl=downloads.filter(x=>x.document_id===d.documentId||ids.includes(x.version_id));const last=[...v.map(x=>x.last),...dl.map(x=>x.last)].filter(Boolean).sort((a,b)=>new Date(b).getTime()-new Date(a).getTime())[0]??null;
  return {documentId:d.documentId,versionId:d.versionId,title:titleOf(d),section:d.section?.number??null,level:d.level??null,views:v.reduce((n,x)=>n+x.views,0),seconds:v.reduce((n,x)=>n+x.seconds,0),downloads:dl.reduce((n,x)=>n+x.n,0),lastSeen:last,versions:ids.map(id=>({versionId:id,current:id===d.versionId,views:v.find(x=>x.version_id===id)?.views??0,seconds:v.find(x=>x.version_id===id)?.seconds??0,downloads:dl.filter(x=>x.version_id===id).reduce((n,x)=>n+x.n,0)}))};});
 const questions=Number((await tx.query('SELECT count(*) AS n FROM exchange_questions WHERE exchange_id=$1',[e.id])).rows[0].n),digest=(await tx.query("SELECT max(created_at) AS at FROM exchange_events WHERE exchange_id=$1 AND kind='digest_sent'",[e.id])).rows[0].at;
 // Open levels and the access history (for an app's disclosure record): grants, level changes, recorded and completed entry steps, emails, revocation.
 const openLevels=(await levelStates(tx,g,e)).filter(l=>l.open).map(l=>l.key);
 const history=(await tx.query("SELECT kind,detail,created_at FROM exchange_events WHERE exchange_id=$1 AND kind IN ('invited','levels_changed','level_entry_recorded','level_acknowledged','file_accepted','extended','revoked','email_sent') ORDER BY created_at",[e.id])).rows.map(x=>({kind:x.kind,at:x.created_at,...(x.kind==='levels_changed'?{from:x.detail.from,to:x.detail.to}:x.kind==='invited'?{levels:x.detail.levels??null}:['level_entry_recorded','level_acknowledged'].includes(x.kind)?{level:x.detail.level??null,note:x.detail.note??null}:x.kind==='email_sent'?{emailType:x.detail.emailType}:x.kind==='extended'?{to:x.detail.to}:{})}));
 return {levels:e.levels,levelNames:levelNames(g,e),openLevels,history,documents:docs,questions,digestSentAt:digest};
}

export async function listExchangeQuestions(db:Connection,a:Actor,w:string,q:{groupId?:string;exchangeId?:string;offset?:number}){
 const rows=(await db.query('SELECT q.*,x.recipient_name,x.recipient_company FROM exchange_questions q JOIN exchanges x ON x.id=q.exchange_id WHERE q.workspace_id=$1 AND ($2::uuid IS NULL OR q.group_id=$2) AND ($3::uuid IS NULL OR q.exchange_id=$3) ORDER BY q.created_at DESC,q.id LIMIT 26 OFFSET $4',[w,q.groupId??null,q.exchangeId??null,q.offset??0])).rows;
 const questions=[];for(const r of rows.slice(0,25)){const g=await groupRow(db,w,r.group_id);try{await exchangeAuthority(db,a,w,g.app_id,false);}catch(e){if([403,404].includes((e as any).status))continue;throw e;}
  const answers=(await db.query('SELECT id,visibility,level,body,supersedes,created_at FROM exchange_answers WHERE question_id=$1 ORDER BY created_at',[r.id])).rows;const doc=r.document_id?(g.documents as RoomDocument[]).find(d=>d.documentId===r.document_id):null;
  questions.push({id:r.id,groupId:r.group_id,exchangeId:r.exchange_id,recipientName:r.recipient_name,recipientCompany:r.recipient_company,body:r.body,section:r.section,documentId:r.document_id,documentTitle:doc?titleOf(doc):null,documentLevel:doc?.level??null,askedAt:r.created_at,answers:answers.map(x=>({id:x.id,visibility:x.visibility,level:x.level,body:x.body,supersedes:x.supersedes,createdAt:x.created_at})),answered:answers.length>0});}
 const published=q.groupId?(await db.query("SELECT id,question_id,visibility,level,question,body,supersedes,created_at FROM exchange_answers WHERE group_id=$1 AND visibility<>'private' ORDER BY created_at DESC LIMIT 50",[q.groupId])).rows.map(x=>({id:x.id,questionId:x.question_id,visibility:x.visibility,level:x.level,question:x.question,body:x.body,supersedes:x.supersedes,createdAt:x.created_at})):[];
 return {questions,published,nextOffset:rows.length>25?(q.offset??0)+25:null,interpretation:'Questions from people in a room, with their answers. Draft answers with answer_exchange_question (private) or publish_exchange_answer (room or level, asker anonymised) through prepare_workspace_change; a person confirms.'};
}

/**
 * Tracked output tables (R7): the platform keeps the bound access record's status, last_seen_on and
 * source, and one engagement row per person and document, current from exchange events. These are
 * system writes labelled source "tracked" and need no review; the database refuses the same writes
 * from people and assistants. Archived groups (or archived apps) stop updating.
 */
export async function syncExchangeTracking(db:Database){
 const due=(await db.query(`SELECT e.id,e.workspace_id,m.marker FROM exchanges e JOIN exchange_groups g ON g.id=e.group_id
  CROSS JOIN LATERAL (SELECT greatest((SELECT max(created_at) FROM exchange_events v WHERE v.exchange_id=e.id),(SELECT max(last_beat_at) FROM exchange_views x WHERE x.exchange_id=e.id),(SELECT max(created_at) FROM exchange_ask_responses r WHERE r.exchange_id=e.id),(SELECT max(updated_at) FROM exchange_emails m WHERE m.exchange_id=e.id AND m.email_type='update'),e.created_at,CASE WHEN e.expires_at<=now() THEN e.expires_at END) AS marker) m
  WHERE g.kind='room' AND NOT g.archived AND EXISTS(SELECT 1 FROM exchange_tracked_tables t WHERE t.group_id=g.id)
  AND (g.app_id IS NULL OR NOT EXISTS(SELECT 1 FROM workspace_components c WHERE c.id=g.app_id AND (c.archived OR c.deleted_at IS NOT NULL)))
  AND m.marker>coalesce((SELECT synced_until FROM exchange_tracking_state s WHERE s.exchange_id=e.id),'-infinity'::timestamptz) ORDER BY m.marker LIMIT 50`)).rows;
 for(const d of due)await db.transaction(async tx=>{await trackExchange(tx,d.id,d.workspace_id);await tx.query('INSERT INTO exchange_tracking_state(exchange_id,workspace_id,synced_until,synced_at) VALUES($1,$2,$3,now()) ON CONFLICT(exchange_id) DO UPDATE SET synced_until=$3,synced_at=now()',[d.id,d.workspace_id,d.marker]);});
 return due.length;
}
async function trackExchange(tx:Connection,exchangeId:string,w:string){
 const e=await exchangeRow(tx,w,exchangeId),g=await groupRow(tx,w,e.group_id),tables=(await tx.query('SELECT * FROM exchange_tracked_tables WHERE group_id=$1',[g.id])).rows;
 await tx.query("SELECT set_config('trialy.tracked_write','on',true),set_config('trialy.write_authorization',$1,true)",[J({kind:'tracked',origin:'tracked',actorId:g.owner_id,source:'exchange',groupId:g.id,exchangeId:e.id})]);
 const typeOf=async(typeId:string)=>(await tx.query('SELECT id,fields FROM entity_types WHERE id=$1',[typeId])).rows[0];
 const fit=(fields:any[],data:Record<string,any>)=>Object.fromEntries(Object.entries(data).filter(([k,v])=>{const f=fields.find(x=>x.key===k);return f&&(v===null||f.kind!=='select'||(f.options??[]).includes(v));}));
 const write=async(typeId:string,role:'access'|'engagement'|'delivery'|'responses',ref:string,data:Record<string,any>,recordId?:string|null,initial:Record<string,any>={})=>{
  const t=await typeOf(typeId);if(!t)return;const values=fit(t.fields,data);
  let id=recordId??(await tx.query('SELECT record_id FROM exchange_tracked_records WHERE exchange_id=$1 AND role=$2 AND document_ref=$3',[e.id,role,ref])).rows[0]?.record_id;
  const before=id?(await tx.query('SELECT * FROM records WHERE id=$1 AND type_id=$2',[id,typeId])).rows[0]:null;if(id&&!before)return;
  if(before){const next={...before.data,...values};if(J(next)===J(before.data))return;const version=before.version+1;await tx.query('UPDATE records SET data=$1,version=$2,updated_at=now() WHERE id=$3',[J(next),version,id]);await tx.query("INSERT INTO revisions(id,workspace_id,object_id,object_kind,version,snapshot,actor_id) VALUES($1,$2,$3,'record',$4,$5,$6)",[randomUUID(),w,id,version,J({data:next,state:before.state,source:'tracked'}),g.owner_id]);}
  else{id=randomUUID();const created={...fit(t.fields,initial),...values};await tx.query('INSERT INTO records(id,type_id,workspace_id,data) VALUES($1,$2,$3,$4)',[id,typeId,w,J(created)]);await tx.query("INSERT INTO revisions(id,workspace_id,object_id,object_kind,version,snapshot,actor_id) VALUES($1,$2,$3,'record',0,$4,$5)",[randomUUID(),w,id,J({data:created,state:'draft',source:'tracked'}),g.owner_id]);}
  await tx.query('INSERT INTO exchange_tracked_records(workspace_id,group_id,exchange_id,role,document_ref,record_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(exchange_id,role,document_ref) DO NOTHING',[w,g.id,e.id,role,ref,id]);
 };
 const lastOpen=(await tx.query("SELECT max(created_at) AS at FROM exchange_events WHERE exchange_id=$1 AND kind='opened'",[e.id])).rows[0].at;
 const accessTable=tables.find(t=>t.role==='access'),engagementTable=tables.find(t=>t.role==='engagement'),deliveryTable=tables.find(t=>t.role==='delivery'),responsesTable=tables.find(t=>t.role==='responses');
 // Update extension (§6): the bound delivery record keeps the person's status and read facts; each "I can help" becomes one responses record.
 let bound:any=null;
 if(deliveryTable&&e.record_id){bound=(await tx.query('SELECT data FROM records WHERE id=$1 AND type_id=$2',[e.record_id,deliveryTable.type_id])).rows[0]?.data??null;
  if(bound){const d=await deliveryFacts(tx,e);await write(deliveryTable.type_id,'delivery','',{status:d.status,sent_on:d.sentOn,first_read_on:d.firstReadOn,last_read_on:d.lastReadOn,read_count:d.readCount,exchange_id:e.id,source:'tracked'},e.record_id);}}
 if(responsesTable){
  const t=await typeOf(responsesTable.type_id),status=t?.fields.find((f:any)=>f.key==='status');
  for(const r of (await tx.query('SELECT * FROM exchange_ask_responses WHERE exchange_id=$1 ORDER BY created_at',[e.id])).rows){
   if((await tx.query('SELECT 1 FROM exchange_tracked_records WHERE exchange_id=$1 AND role=$2 AND document_ref=$3',[e.id,'responses',r.id])).rows.length)continue;
   const context=Object.fromEntries(RESPONSE_CONTEXT.filter(k=>bound&&bound[k]!==undefined).map(k=>[k,bound[k]]));
   await write(responsesTable.type_id,'responses',r.id,{...context,ask_key:r.ask_key,ask_text:r.ask_text,responded_on:day(r.created_at),message:r.note||null,delivery_id:e.record_id??null,exchange_id:e.id,response_id:r.id,source:'tracked'},null,status?.kind==='select'&&(status.options??[]).includes('new')?{status:'new'}:{});
  }}
 let grant:any=null;
 if(accessTable&&e.record_id){grant=(await tx.query('SELECT data FROM records WHERE id=$1 AND type_id=$2',[e.record_id,accessTable.type_id])).rows[0]?.data??null;
  if(grant)await write(accessTable.type_id,'access','',{status:e.revoked_at?'revoked':roomEnded(e)?'expired':lastOpen?'active':'invited',last_seen_on:day(lastOpen),source:'tracked'},e.record_id);}
 if(engagementTable){
  const views=(await tx.query('SELECT document_id,count(*)::int AS n,coalesce(sum(seconds),0)::int AS seconds,min(started_at) AS first,max(last_beat_at) AS last FROM exchange_views WHERE exchange_id=$1 GROUP BY document_id',[e.id])).rows;
  const downloads=(await tx.query("SELECT coalesce(v.detail->>'documentId',d.document_id::text) AS document_id,count(*)::int AS n FROM exchange_events v LEFT JOIN document_versions d ON d.id::text=v.detail->>'versionId' WHERE v.exchange_id=$1 AND v.kind='downloaded' GROUP BY 1",[e.id])).rows;
  for(const documentId of new Set([...views.map(v=>v.document_id),...downloads.map(x=>x.document_id)].filter(Boolean))){
   const v=views.find(x=>x.document_id===documentId),doc=(g.documents as RoomDocument[]).find(x=>x.documentId===documentId);
   await write(engagementTable.type_id,'engagement',documentId,{grant_id:e.record_id??e.id,organization_id:grant?.organization_id??null,person_id:grant?.person_id??null,document_ref:documentId,document_title:doc?titleOf(doc):null,first_viewed_on:day(v?.first),last_viewed_on:day(v?.last),view_count:v?.n??0,seconds_viewed:v?.seconds??0,downloads:downloads.find(x=>x.document_id===documentId)?.n??0,source:'tracked',as_of:today(),section_id:doc?.section?.number??null});
  }
 }
 await tx.query("SELECT set_config('trialy.tracked_write','',true)");
}

/** What the delivery record shows (§6): revoked, read (opened the page), sent (an update email was handed to the provider), bounced, or queued. */
export async function deliveryFacts(tx:Connection,e:any){
 const opened=(await tx.query("SELECT count(*)::int AS n,min(created_at) AS first,max(created_at) AS last FROM exchange_events WHERE exchange_id=$1 AND kind='opened'",[e.id])).rows[0];
 const mails=(await tx.query("SELECT status,sent_at,created_at FROM exchange_emails WHERE exchange_id=$1 AND email_type='update' ORDER BY created_at",[e.id])).rows;
 const delivered=mails.filter(m=>['sent','delivered'].includes(m.status)),bounced=mails.some(m=>['bounced','complained','failed'].includes(m.status));
 const status=e.revoked_at?'revoked':opened.n?'read':delivered.length?'sent':bounced?'bounced':'queued';
 return {status,sentOn:day(delivered[0]?.sent_at??delivered[0]?.created_at),firstReadOn:day(opened.first),lastReadOn:day(opened.last),readCount:Number(opened.n),bounced,emails:mails.map(m=>m.status)};
}
/** Daily digest (R8): sent automatically only for rooms whose owner approved the text; lists only documents the person can open. */
export async function runExchangeDigests(db:Database){
 const rows=(await db.query(`SELECT e.id,e.workspace_id FROM exchanges e JOIN exchange_groups g ON g.id=e.group_id WHERE g.kind='room' AND g.digest IS NOT NULL AND NOT g.archived AND e.revoked_at IS NULL AND (e.expires_at IS NULL OR e.expires_at>now())
  AND (g.app_id IS NULL OR NOT EXISTS(SELECT 1 FROM workspace_components c WHERE c.id=g.app_id AND (c.archived OR c.deleted_at IS NOT NULL)))
  AND NOT EXISTS(SELECT 1 FROM exchange_events v WHERE v.exchange_id=e.id AND v.kind='digest_sent' AND v.created_at>now()-interval '20 hours') ORDER BY e.created_at LIMIT 100`)).rows;
 let sent=0;
 for(const r of rows)await db.transaction(async tx=>{
  const e=await exchangeRow(tx,r.workspace_id,r.id),g=await groupRow(tx,r.workspace_id,e.group_id),items=await digestItems(tx,g,e);if(!items.length)return;
  const owner:Actor={userId:g.digest.senderUserId,origin:'human'},p=(await tx.query('SELECT id,name,tenant_id FROM workspaces WHERE id=$1',[r.workspace_id])).rows[0];
  const rendered=await renderNotices(tx,owner,r.workspace_id,p,g,[e],'documents_updated','',{subject:g.digest.subject,body:g.digest.body,overrides:{},nameKind:g.digest.nameKind??undefined,customName:g.digest.customName??undefined},async()=>documentLines(items));
  try{const queued=await queueNotices(tx,r.workspace_id,g,rendered);await logExchange(tx,e,'digest_sent',{documents:items.map(i=>i.versionId),emails:queued.map(q=>q.id),approvedAt:g.digest.approvedAt});sent++;}catch(err){if((err as any).status!==429)throw err;}
 });
 return sent;
}
/** Room sweeps: access ending (7 days ahead) and ended, and — when the room asks for it — hot and quiet parties. Each becomes one event, then one workspace notification. */
export async function sweepExchangeRooms(db:Database){
 const log=async(sql:string,kind:string,detail:(e:any)=>any)=>{const due=(await db.query(sql)).rows;for(const e of due)await db.transaction(tx=>logExchange(tx,e,kind,detail(e)));return due.length;};
 const live="g.kind='room' AND NOT g.archived AND e.revoked_at IS NULL";
 let n=await log(`SELECT e.* FROM exchanges e JOIN exchange_groups g ON g.id=e.group_id WHERE ${live} AND e.expires_at>now() AND e.expires_at<=now()+interval '7 days' AND NOT EXISTS(SELECT 1 FROM exchange_events v WHERE v.exchange_id=e.id AND v.kind='access_ending' AND v.created_at>coalesce((SELECT max(created_at) FROM exchange_events x WHERE x.exchange_id=e.id AND x.kind='extended'),'-infinity'::timestamptz)) LIMIT 100`,'access_ending',e=>({expiresAt:e.expires_at}));
 n+=await log(`SELECT e.* FROM exchanges e JOIN exchange_groups g ON g.id=e.group_id WHERE ${live} AND e.expires_at<=now() AND e.expires_at>now()-interval '30 days' AND NOT EXISTS(SELECT 1 FROM exchange_events v WHERE v.exchange_id=e.id AND v.kind='access_ended') LIMIT 100`,'access_ended',e=>({expiresAt:e.expires_at}));
 const engaged=`${live} AND g.notify_engagement AND (e.expires_at IS NULL OR e.expires_at>now())`;
 n+=await log(`SELECT e.* FROM exchanges e JOIN exchange_groups g ON g.id=e.group_id WHERE ${engaged} AND NOT EXISTS(SELECT 1 FROM exchange_events v WHERE v.exchange_id=e.id AND v.kind='hot' AND v.created_at>now()-interval '7 days')
  AND ((SELECT count(*) FROM exchange_views x WHERE x.exchange_id=e.id AND x.started_at>now()-interval '7 days')>=5
   OR (SELECT count(*) FROM exchange_views x CROSS JOIN LATERAL jsonb_array_elements(g.documents) d WHERE x.exchange_id=e.id AND x.started_at>now()-interval '7 days' AND d->>'documentId'=x.document_id::text AND jsonb_array_length(g.levels)>1 AND d->>'level'<>(g.levels->0->>'key'))>=3) LIMIT 100`,'hot',()=>({rule:'5 opens in 7 days, or 3 opens above the first level'}));
 n+=await log(`SELECT e.*,g.quiet_days FROM exchanges e JOIN exchange_groups g ON g.id=e.group_id CROSS JOIN LATERAL (SELECT max(created_at) AS at FROM exchange_events v WHERE v.exchange_id=e.id AND v.kind='opened') o WHERE ${engaged} AND o.at IS NOT NULL AND o.at<now()-g.quiet_days*interval '1 day'
  AND NOT EXISTS(SELECT 1 FROM exchange_events v WHERE v.exchange_id=e.id AND v.kind='quiet' AND v.created_at>o.at) LIMIT 100`,'quiet',e=>({quietDays:e.quiet_days??null}));
 return n;
}
