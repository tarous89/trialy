import type {Express} from 'express';
import {randomUUID,randomBytes,randomInt} from 'node:crypto';
import {z} from 'zod';
import {rateLimit} from 'express-rate-limit';
import {withDatabaseContext} from '../db/context.js';
import type {Connection,Database} from '../db/database.js';
import {Service,checksum} from '../domain/service.js';
import {typeAccess,visibleFields} from '../domain/permissions.js';
import {activeQuestions} from '../shared/questions.js';
import {id,fail,type Actor} from '../shared/schema.js';
import {logExchange} from '../domain/external-exchange.js';
import {roomView,visibleAnswers,gateState as groupGate,titleOf,viewable} from '../domain/exchange-room-model.js';
import {queueEmail,displayName,emailLimits} from '../app-services/exchange-email.js';

/**
 * Recipient side of external exchanges (docs/product/EXTERNAL_EXCHANGE.md §2.7).
 * The page holder is identified by the unguessable link token (X-Trialy-Exchange); row security
 * narrows every read and write to that one exchange. Optional email verification adds a one-time
 * code and a session token (X-Trialy-Exchange-Session). After the deadline the page is read-only;
 * revocation, group archival and app archival make the link unavailable while keeping all content.
 */
const MAX_FILE=25*1024*1024;
const scoped=(tx:Connection):Database=>({query:(q,v)=>tx.query(q,v),transaction:fn=>fn(tx),close:async()=>{}});
const token=z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export function addExternalExchange(app:Express,s:Service){
 const limited=rateLimit({windowMs:15*60000,limit:240,standardHeaders:true,legacyHeaders:false});
 app.use('/external-exchange',limited,(req,res,next)=>{res.set('Cache-Control','no-store');res.set('Referrer-Policy','no-referrer');const raw=token.parse(req.get('x-trialy-exchange'));withDatabaseContext({exchangeHash:checksum(raw)},next);});
 type Loaded=Awaited<ReturnType<typeof load>>;
 async function load(tx:Connection,req:any){
  const raw=token.parse(req.get('x-trialy-exchange'));
  const e=(await tx.query('SELECT * FROM exchanges WHERE token_hash=$1',[checksum(raw)])).rows[0];if(!e)fail(404,'not_found','This link is unavailable');
  const g=(await tx.query('SELECT * FROM exchange_groups WHERE id=$1',[e.group_id])).rows[0];if(!g)fail(404,'not_found','This link is unavailable');
  const session=req.get('x-trialy-exchange-session');let verified:any=null;
  if(g.verify_email&&session)verified=(await tx.query('SELECT email FROM exchange_verifications WHERE exchange_id=$1 AND session_hash=$2 AND verified_at IS NOT NULL AND session_expires_at>now()',[e.id,checksum(token.parse(session))])).rows[0]??null;
  // Rooms have no deadline: an ended room is unavailable (row security hides it), a request stays readable after its deadline.
  const closed=g.kind!=='room'&&new Date(e.expires_at).getTime()<=Date.now(),owner:Actor={userId:g.owner_id,origin:'human'};
  return {e,g,closed,owner,verified:!!verified,verifiedEmail:verified?.email??null,needsVerification:g.verify_email&&!verified};
 }
 const requireOpen=(x:Loaded)=>{if(x.closed)fail(403,'closed','Submissions closed on '+new Date(x.e.expires_at).toISOString().slice(0,10));};
 const requireVerified=(x:Loaded)=>{if(x.needsVerification)fail(403,'verification_required','Verify your email address first');};
 const gateState=(tx:Connection,x:Loaded)=>groupGate(tx,x.g,x.e);
 const fileShape=(f:any)=>({id:f.id,filename:f.filename,mime:f.mime,byteSize:f.byte_size,slot:f.slot,uploadedAt:f.created_at,accepted:!!f.version_id});
 async function model(tx:Connection,x:Loaded){
  const gate=await gateState(tx,x),documents=(x.g.documents as any[]).map(d=>({versionId:d.versionId,filename:d.filename,mime:d.mime,byteSize:d.byteSize,toSign:!!d.gate,locked:!(gate.unlocked||d.gate)}));
  const files=(await tx.query('SELECT f.*,a.version_id FROM exchange_files f LEFT JOIN exchange_file_acceptances a ON a.file_id=f.id WHERE f.exchange_id=$1 AND f.removed_at IS NULL ORDER BY f.created_at',[x.e.id])).rows;
  const submissions=(await tx.query('SELECT id,version,created_at FROM exchange_submissions WHERE exchange_id=$1 ORDER BY version DESC',[x.e.id])).rows.map(r=>({id:r.id,version:r.version,submittedAt:r.created_at,files:files.filter(f=>f.submission_id===r.id).map(fileShape)}));
  const draft=(await tx.query('SELECT data,updated_at FROM exchange_drafts WHERE exchange_id=$1',[x.e.id])).rows[0];
  let form:any=null;if(x.g.type_id){const {type,policy}=await typeAccess(tx,x.owner,x.e.workspace_id,x.g.type_id);const fields=visibleFields(type.fields,policy,x.owner).filter(f=>(x.g.fields as string[]).includes(f.key));form={fields:fields.map(({key,name,kind,required,options,multiple})=>({key,name,kind,required,options,multiple})),questions:x.g.questions,maxFiles:x.g.max_files,lastSubmitted:submissions[0]?(await tx.query('SELECT data FROM exchange_submissions WHERE id=$1',[submissions[0].id])).rows[0].data:null};}
  const slots=(x.g.slots as any[]).map(sl=>{const uploads=files.filter(f=>f.slot===sl.key);const accepted=uploads.find(f=>f.version_id);return {key:sl.key,label:sl.label,required:sl.required,status:accepted?'accepted':uploads.length?'received':'requested',files:uploads.map(fileShape)};});
  const messages=await listMessages(tx,x);
  return {title:x.g.title,summary:x.g.summary,dates:x.g.dates,sender:{name:x.g.sender_name,company:x.g.sender_company,logo:!!x.g.logo_version_id},privacyNotice:x.g.privacy_notice,recipient:{name:x.e.recipient_name,company:x.e.recipient_company,email:x.verifiedEmail},deadline:x.e.expires_at,closed:x.closed,messagesOpen:!x.closed||x.g.messages_after_deadline,verification:{required:x.g.verify_email,verified:x.verified},gate,documents,form,draft:draft?{data:draft.data,updatedAt:draft.updated_at,files:files.filter(f=>!f.submission_id&&!f.slot).map(fileShape)}:{data:{},updatedAt:null,files:files.filter(f=>!f.submission_id&&!f.slot).map(fileShape)},submissions,slots,messages,poweredBy:'TrialAgents'};
 }
 async function listMessages(tx:Connection,x:Loaded){
  const rows=(await tx.query("SELECT m.*,(SELECT 1 FROM exchange_message_reads r WHERE r.message_id=m.id AND r.reader='recipient' AND r.exchange_id=$1) AS read FROM exchange_messages m WHERE (m.exchange_id=$1) OR (m.kind='clarification' AND m.group_id=$2) ORDER BY m.created_at",[x.e.id,x.g.id])).rows;
  for(const m of rows)if(m.author==='workspace'&&!m.read)await tx.query("INSERT INTO exchange_message_reads(message_id,workspace_id,reader,exchange_id) VALUES($1,$2,'recipient',$3) ON CONFLICT DO NOTHING",[m.id,x.e.workspace_id,x.e.id]);
  return rows.map(m=>({id:m.id,kind:m.kind,author:m.author,from:m.author==='recipient'?'You':m.kind==='clarification'?x.g.sender_company:x.g.sender_name,question:m.kind==='clarification'&&m.question?'A recipient asked: '+m.question:null,body:m.body,createdAt:m.created_at}));
 }
 async function opened(tx:Connection,x:Loaded){
  if(x.g.kind==='room'&&!(await tx.query("SELECT 1 FROM exchange_events WHERE exchange_id=$1 AND kind='opened' LIMIT 1",[x.e.id])).rows.length)await logExchange(tx,x.e,'first_opened',{verified:x.verified});
  if(!(await tx.query("SELECT 1 FROM exchange_events WHERE exchange_id=$1 AND kind='opened' AND created_at>now()-interval '1 hour'",[x.e.id])).rows.length)await logExchange(tx,x.e,'opened',{verified:x.verified});
  // A visit that starts 30 minutes or more after the last one moves "since your last visit" forward.
  if(x.g.kind==='room')await tx.query("INSERT INTO exchange_visits(exchange_id,workspace_id) VALUES($1,$2) ON CONFLICT(exchange_id) DO UPDATE SET previous_seen_at=CASE WHEN exchange_visits.last_seen_at<now()-interval '30 minutes' THEN exchange_visits.last_seen_at ELSE exchange_visits.previous_seen_at END,last_seen_at=now()",[x.e.id,x.e.workspace_id]);
 }
 const roomOnly=(x:Loaded)=>{if(x.g.kind!=='room')fail(400,'room_only','This page has no room');};
 const notRoom=(x:Loaded)=>{if(x.g.kind==='room')fail(400,'room_mode','Ask your question in Q&A');};
 const docShape=(d:any)=>({documentId:d.documentId,versionId:d.versionId,title:titleOf(d),filename:d.filename,mime:d.mime,byteSize:d.byteSize,section:d.section?.number??null,level:d.levelName,viewOnly:!!d.viewOnly,viewable:viewable(d.mime),badge:d.badge,toSign:!!d.toSign});
 /** What one person sees in a room (§5): only the levels they hold; documents of a level whose entry step is incomplete are counted, not named. */
 async function roomModel(tx:Connection,x:Loaded){
  const gate=await gateState(tx,x),view=await roomView(tx,x.g,x.e,gate.unlocked),answers=await visibleAnswers(tx,x.g,x.e,view);
  const own=(await tx.query('SELECT id,body,section,document_id,created_at FROM exchange_questions WHERE exchange_id=$1 ORDER BY created_at',[x.e.id])).rows;
  const files=(await tx.query('SELECT f.*,a.version_id FROM exchange_files f LEFT JOIN exchange_file_acceptances a ON a.file_id=f.id WHERE f.exchange_id=$1 AND f.slot IS NOT NULL AND f.removed_at IS NULL ORDER BY f.created_at',[x.e.id])).rows;
  const levelSlots=new Map((x.g.levels as any[]).filter(l=>l.entry==='signed_document').map(l=>[l.slot,l.key]));
  const slots=(x.g.slots as any[]).filter(sl=>!levelSlots.has(sl.key)||(x.e.levels as string[]).includes(levelSlots.get(sl.key))).map(sl=>{const uploads=files.filter(f=>f.slot===sl.key),accepted=uploads.find(f=>f.version_id);return {key:sl.key,label:sl.label,required:sl.required,status:accepted?'accepted':uploads.length?'received':'requested',files:uploads.map(fileShape)};});
  const sections=new Map(view.index.map(sec=>[sec.number,sec.title]));
  return {mode:'room',title:x.g.title,summary:x.g.summary,dates:x.g.dates,sender:{name:x.g.sender_name,company:x.g.sender_company,logo:!!x.g.logo_version_id},privacyNotice:x.g.privacy_notice,recipient:{name:x.e.recipient_name,company:x.e.recipient_company,email:x.verifiedEmail},endsAt:x.e.expires_at,verification:{required:x.g.verify_email,verified:x.verified},gate,
   levels:view.levels.filter(l=>l.held).map(l=>({key:l.key,name:l.name,entry:l.entry,text:l.text,open:l.open,acknowledged:l.acknowledged,slot:l.slot,slotStatus:l.slotStatus})),lockedLevels:view.lockedByLevel,
   index:view.index.map(sec=>({number:sec.number,title:sec.title,count:sec.count,locked:sec.locked,documents:sec.documents.map(docShape)})),changes:view.changes.map(docShape),lastVisit:view.since,documentCount:view.open.length,slots,
   questions:own.map(q=>{const doc=q.document_id?view.open.find(d=>d.documentId===q.document_id):null;return {id:q.id,body:q.body,section:q.section&&sections.has(q.section)?{number:q.section,title:sections.get(q.section)}:null,document:doc?{documentId:doc.documentId,title:titleOf(doc)}:null,askedAt:q.created_at,answers:answers.filter(a=>a.questionId===q.id).map(a=>({id:a.id,body:a.body,visibility:a.visibility,edited:a.edited,createdAt:a.createdAt}))};}),
   published:answers.filter(a=>a.visibility!=='private'),poweredBy:'TrialAgents'};
 }
 app.get('/external-exchange',async(req,res)=>res.json(await s.db.transaction(async tx=>{const x=await load(tx,req);if(x.needsVerification)return {mode:x.g.kind,endsAt:x.e.expires_at,verification:{required:true,verified:false},title:x.g.title,sender:{name:x.g.sender_name,company:x.g.sender_company,logo:!!x.g.logo_version_id},deadline:x.e.expires_at,closed:x.closed,privacyNotice:x.g.privacy_notice,poweredBy:'TrialAgents'};await opened(tx,x);return x.g.kind==='room'?roomModel(tx,x):model(tx,x);})));
 app.post('/external-exchange/verify',async(req,res)=>{
  const input=z.object({email:z.string().trim().toLowerCase().email().max(200)}).parse(req.body);
  res.json(await s.db.transaction(async tx=>{const x=await load(tx,req);if(!x.g.verify_email)return {sent:false,reason:'not_required'};
   if(!(x.e.recipient_emails as string[]).includes(input.email))fail(400,'email_mismatch','Use the email address this page was sent to');
   const recent=Number((await tx.query("SELECT count(*) AS n FROM exchange_verifications WHERE exchange_id=$1 AND created_at>now()-interval '1 hour'",[x.e.id])).rows[0].n);if(recent>=emailLimits.verificationHourly)fail(429,'verification_limit','Too many codes were requested. Try again later.');
   const code=String(randomInt(0,1000000)).padStart(6,'0'),vid=randomUUID();
   await tx.query("INSERT INTO exchange_verifications(id,workspace_id,exchange_id,email,code_hash,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '15 minutes')",[vid,x.e.workspace_id,x.e.id,input.email,checksum(vid+':'+code)]);
   await queueEmail(tx,{workspaceId:x.e.workspace_id,groupId:x.g.id,exchangeId:x.e.id,emailType:'verification',to:input.email,fromName:displayName(x.g.sender_company),replyTo:null,subject:`Your verification code for ${x.g.title}`,text:`Your TrialAgents verification code is ${code}. It is valid for 15 minutes.\n\nEnter it on the page you opened to continue to "${x.g.title}" from ${x.g.sender_company}. If you did not request this code, ignore this email.\n\n—\nTrialAgents sends this on behalf of ${x.g.sender_company}. Report abuse: https://platform.trialagents.com/report-abuse`});
   return {sent:true,verificationId:vid,...(process.env.NODE_ENV==='test'||process.env.EXCHANGE_EXPOSE_CODES==='true'?{code}:{})};}));
 });
 app.post('/external-exchange/verify/confirm',async(req,res)=>{
  const input=z.object({verificationId:id,code:z.string().regex(/^\d{6}$/)}).parse(req.body);
  res.json(await s.db.transaction(async tx=>{const x=await load(tx,req);
   const v=(await tx.query('SELECT * FROM exchange_verifications WHERE id=$1 AND exchange_id=$2 AND expires_at>now() AND verified_at IS NULL FOR UPDATE',[input.verificationId,x.e.id])).rows[0];if(!v||v.attempts>=5)fail(400,'code_invalid','This code is no longer valid. Request a new one.');
   if(v.code_hash!==checksum(v.id+':'+input.code)){await tx.query('UPDATE exchange_verifications SET attempts=attempts+1 WHERE id=$1',[v.id]);fail(400,'code_invalid','That code is not right');}
   const session=randomBytes(32).toString('base64url');await tx.query("UPDATE exchange_verifications SET verified_at=now(),session_hash=$2,session_expires_at=now()+interval '7 days' WHERE id=$1",[v.id,checksum(session)]);
   await logExchange(tx,x.e,'verified',{email:v.email});return {session,email:v.email};}));
 });
 app.post('/external-exchange/acknowledge',async(req,res)=>{
  const input=z.object({name:z.string().trim().min(1).max(120),email:z.string().trim().toLowerCase().email().max(200),level:z.string().max(40).optional()}).parse(req.body);
  res.json(await s.db.transaction(async tx=>{const x=await load(tx,req);requireVerified(x);if(x.verifiedEmail&&x.verifiedEmail!==input.email)fail(400,'email_mismatch','Use your verified email address');
   if(input.level){roomOnly(x);const l=(x.g.levels as any[]).find(v=>v.key===input.level);if(!l||!(x.e.levels as string[]).includes(l.key))fail(404,'not_found','Level unavailable');if(l.entry!=='click_through')fail(400,'no_gate','No acknowledgement is required for this level');
    if(!(await tx.query("SELECT 1 FROM exchange_events WHERE exchange_id=$1 AND kind='level_acknowledged' AND detail->>'level'=$2",[x.e.id,l.key])).rows.length)await logExchange(tx,x.e,'level_acknowledged',{level:l.key,levelName:l.name,name:input.name,email:input.email,text:l.text??''});return {acknowledged:true,level:l.key};}
   if(x.g.gate!=='acknowledgement')fail(400,'no_gate','No acknowledgement is required');if(x.verifiedEmail&&x.verifiedEmail!==input.email)fail(400,'email_mismatch','Use your verified email address');
   const gate=await gateState(tx,x);if(!gate.acknowledged)await logExchange(tx,x.e,'acknowledged',{name:input.name,email:input.email,text:x.g.gate_text});return {acknowledged:true};}));
 });
 const sendFile=(res:any,filename:string,mime:string,bytes:Buffer)=>{res.set('Content-Type',/^(image|application\/pdf|text\/plain)/.test(mime)?mime:'application/octet-stream');res.set('Content-Disposition',`${/^image\//.test(mime)?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(filename)}`);res.set('X-Content-Type-Options','nosniff');res.send(bytes);};
 app.get('/external-exchange/logo',async(req,res)=>{const r=await s.db.transaction(async tx=>{const x=await load(tx,req);if(!x.g.logo_version_id)fail(404,'not_found','No logo');const d=(await tx.query('SELECT d.filename,d.mime,d.checksum,p.bytes FROM document_versions d JOIN document_payloads p ON p.version_id=d.id WHERE d.id=$1',[x.g.logo_version_id])).rows[0];if(!d)fail(404,'not_found','No logo');const bytes=Buffer.from(d.bytes);if(checksum(bytes)!==d.checksum)fail(500,'integrity_failure','Logo integrity check failed');return {...d,bytes};});res.set('Cache-Control','private, max-age=300');sendFile(res,r.filename,r.mime,r.bytes);});
 app.get('/external-exchange/documents/:versionId',async(req,res)=>{
  const versionId=id.parse(req.params.versionId);
  const r=await s.db.transaction(async tx=>{const x=await load(tx,req);requireVerified(x);const doc=x.g.kind==='room'?await roomDocument(tx,x,versionId):(x.g.documents as any[]).find(d=>d.versionId===versionId);if(!doc)fail(404,'not_found','Document unavailable');const gate=await gateState(tx,x);if(!gate.unlocked&&!doc.gate)fail(403,'locked',x.g.gate==='acknowledgement'?'Accept the confidentiality notice first':'This document unlocks after the signed document is accepted');
   if(doc.viewOnly)fail(403,'view_only','This document can be viewed on the page but not downloaded');
   const d=(await tx.query('SELECT d.filename,d.mime,d.checksum,p.bytes FROM document_versions d JOIN document_payloads p ON p.version_id=d.id WHERE d.id=$1',[versionId])).rows[0];if(!d)fail(404,'not_found','Document unavailable');const bytes=Buffer.from(d.bytes);if(checksum(bytes)!==d.checksum)fail(500,'integrity_failure','Original integrity check failed');
   await logExchange(tx,x.e,'downloaded',{versionId,documentId:doc.documentId,filename:d.filename,byteSize:bytes.length});return {...d,bytes};});
  sendFile(res,r.filename,r.mime,r.bytes);
 });
 /** A room document this person can open now, or nothing (documents at other levels are indistinguishable from missing ones). */
 async function roomDocument(tx:Connection,x:Loaded,versionId:string){const view=await roomView(tx,x.g,x.e,(await gateState(tx,x)).unlocked);return view.canSee(versionId);}
 async function original(tx:Connection,versionId:string){const d=(await tx.query('SELECT d.filename,d.mime,d.checksum,p.bytes FROM document_versions d JOIN document_payloads p ON p.version_id=d.id WHERE d.id=$1',[versionId])).rows[0];if(!d)fail(404,'not_found','Document unavailable');const bytes=Buffer.from(d.bytes);if(checksum(bytes)!==d.checksum)fail(500,'integrity_failure','Original integrity check failed');return {...d,bytes};}
 // Inline viewer (R4): PDF and images are shown on the page, never as an attachment; other types download.
 app.get('/external-exchange/view/:versionId',async(req,res)=>{const versionId=id.parse(req.params.versionId);const r=await s.db.transaction(async tx=>{const x=await load(tx,req);requireVerified(x);roomOnly(x);const doc=await roomDocument(tx,x,versionId);if(!doc)fail(404,'not_found','Document unavailable');if(!viewable(doc.mime))fail(400,'not_viewable','This document type downloads instead');return original(tx,versionId);});
  res.set('Content-Type',r.mime);res.set('Content-Disposition',`inline; filename*=UTF-8''${encodeURIComponent(r.filename)}`);res.set('X-Content-Type-Options','nosniff');res.set('Content-Security-Policy',"default-src 'none'; img-src 'self' data: blob:; style-src 'unsafe-inline'; sandbox");res.send(r.bytes);});
 // A viewed event per document version; repeat opens within 30 minutes continue the same viewer session.
 app.post('/external-exchange/views',async(req,res)=>{const input=z.object({versionId:id}).parse(req.body);res.json(await s.db.transaction(async tx=>{const x=await load(tx,req);requireVerified(x);roomOnly(x);const doc=await roomDocument(tx,x,input.versionId);if(!doc)fail(404,'not_found','Document unavailable');if(!viewable(doc.mime))fail(400,'not_viewable','This document type downloads instead');
  const recent=(await tx.query("SELECT id FROM exchange_views WHERE exchange_id=$1 AND version_id=$2 AND last_beat_at>now()-interval '30 minutes' ORDER BY last_beat_at DESC LIMIT 1",[x.e.id,input.versionId])).rows[0];if(recent)return {viewId:recent.id,continued:true};
  const viewId=randomUUID();await tx.query('INSERT INTO exchange_views(id,workspace_id,exchange_id,document_id,version_id) VALUES($1,$2,$3,$4,$5)',[viewId,x.e.workspace_id,x.e.id,doc.documentId,input.versionId]);
  await logExchange(tx,x.e,'viewed',{versionId:input.versionId,documentId:doc.documentId,viewId,title:titleOf(doc)});return {viewId,continued:false};}));});
 // Heartbeats while the viewer is visible: approximate seconds, at most 30 per beat and never more than the time since the last beat.
 app.post('/external-exchange/views/:viewId',async(req,res)=>{const viewId=id.parse(req.params.viewId),input=z.object({seconds:z.number().int().min(0).max(120)}).parse(req.body);res.json(await s.db.transaction(async tx=>{const x=await load(tx,req);requireVerified(x);roomOnly(x);
  const v=(await tx.query('SELECT *,extract(epoch FROM now()-last_beat_at) AS elapsed FROM exchange_views WHERE id=$1 AND exchange_id=$2 FOR UPDATE',[viewId,x.e.id])).rows[0];if(!v||!await roomDocument(tx,x,v.version_id))fail(404,'not_found','Viewer session unavailable');
  const add=Math.max(0,Math.min(input.seconds,30,Math.ceil(Number(v.elapsed))+2));await tx.query('UPDATE exchange_views SET seconds=seconds+$2,last_beat_at=now() WHERE id=$1',[viewId,add]);return {seconds:v.seconds+add};}));});
 // Search covers only what this person can open: document titles, file names, sections and the answers addressed to them.
 app.get('/external-exchange/search',async(req,res)=>{const q=z.string().trim().min(1).max(200).parse(req.query.q).toLowerCase();res.json(await s.db.transaction(async tx=>{const x=await load(tx,req);requireVerified(x);roomOnly(x);const view=await roomView(tx,x.g,x.e,(await gateState(tx,x)).unlocked),answers=await visibleAnswers(tx,x.g,x.e,view);
  const hit=(...t:(string|null|undefined)[])=>t.some(v=>v&&v.toLowerCase().includes(q));
  return {documents:view.open.filter(d=>hit(titleOf(d),d.filename,d.section?.number,d.section?.title)).map(docShape),answers:answers.filter(a=>hit(a.question,a.body)).map(a=>({id:a.id,question:a.question,body:a.body,visibility:a.visibility,createdAt:a.createdAt}))};}));});
 // Room Q&A (R6): questions with an optional reference to a section or document the person can see.
 app.post('/external-exchange/questions',async(req,res)=>{const input=z.object({body:z.string().trim().min(1).max(5000),section:z.string().max(40).optional(),documentId:id.optional()}).parse(req.body);res.json(await s.db.transaction(async tx=>{const x=await load(tx,req);requireVerified(x);roomOnly(x);const view=await roomView(tx,x.g,x.e,(await gateState(tx,x)).unlocked);
  if(input.documentId&&!view.open.some(d=>d.documentId===input.documentId))fail(404,'not_found','Document unavailable');if(input.section&&!view.open.some(d=>d.section?.number===input.section))fail(404,'not_found','Section unavailable');
  const questionId=randomUUID();await tx.query('INSERT INTO exchange_questions(id,workspace_id,group_id,exchange_id,body,section,document_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[questionId,x.e.workspace_id,x.g.id,x.e.id,input.body,input.section??null,input.documentId??null]);
  await logExchange(tx,x.e,'question',{questionId,section:input.section??null,documentId:input.documentId??null});return {id:questionId,askedAt:new Date().toISOString()};}));});
 const dataSchema=z.record(z.string(),z.union([z.string().max(50000),z.number().finite(),z.boolean(),z.array(z.union([z.string().max(50000),z.number().finite()])).max(100),z.null()]));
 async function formOf(tx:Connection,x:Loaded){if(!x.g.type_id)fail(400,'no_form','This exchange has no response form');const {type,policy}=await typeAccess(tx,x.owner,x.e.workspace_id,x.g.type_id);if(type.version!==x.g.type_version)fail(409,'form_changed','The form changed. Ask the sender for an update');const fields=visibleFields(type.fields,policy,x.owner).filter(f=>(x.g.fields as string[]).includes(f.key));const questions=(x.g.questions as any[]).length?x.g.questions:fields.map(f=>({field:f.key,required:f.required,help:''}));return {type,policy,fields,questions};}
 app.post('/external-exchange/draft',async(req,res)=>{
  const input=z.object({data:dataSchema}).parse(req.body);if(Buffer.byteLength(JSON.stringify(input.data))>100000)fail(413,'too_large','Response is too large');
  res.json(await s.db.transaction(async tx=>{const x=await load(tx,req);requireVerified(x);requireOpen(x);const {fields,questions}=await formOf(tx,x);const active=activeQuestions(questions,input.data);if(Object.keys(input.data).some(k=>!fields.some(f=>f.key===k)||!active.has(k)))fail(400,'invalid_field','Unexpected field');
   await tx.query('INSERT INTO exchange_drafts(exchange_id,workspace_id,data,updated_at) VALUES($1,$2,$3,now()) ON CONFLICT(exchange_id) DO UPDATE SET data=$3,updated_at=now()',[x.e.id,x.e.workspace_id,JSON.stringify(input.data)]);
   await logExchange(tx,x.e,'draft_saved',{fields:Object.keys(input.data).length});return {saved:true,updatedAt:new Date().toISOString()};}));
 });
 app.post('/external-exchange/files',async(req,res)=>{
  const input=z.object({filename:z.string().trim().min(1).max(250),mime:z.string().min(1).max(150),base64:z.string().max(Math.ceil(MAX_FILE/3)*4+8).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),slot:z.string().max(40).optional()}).parse(req.body);
  const bytes=Buffer.from(input.base64,'base64');if(!bytes.length||bytes.length>MAX_FILE)fail(413,'file_size','Each file must be nonempty and at most 25 MB');
  res.json(await s.db.transaction(async tx=>{const x=await load(tx,req);requireVerified(x);requireOpen(x);
   if(input.slot){const level=(x.g.levels as any[]).find(l=>l.entry==='signed_document'&&l.slot===input.slot);if(!(x.g.slots as any[]).some(sl=>sl.key===input.slot)||(level&&!(x.e.levels as string[]).includes(level.key)))fail(404,'not_found','Unknown document slot');}
   else{if(!x.g.type_id)fail(400,'no_form','This exchange has no response form');const n=Number((await tx.query('SELECT count(*) AS n FROM exchange_files WHERE exchange_id=$1 AND submission_id IS NULL AND slot IS NULL AND removed_at IS NULL',[x.e.id])).rows[0].n);if(n>=x.g.max_files)fail(400,'file_limit',`Attach at most ${x.g.max_files} files`);}
   const total=Number((await tx.query('SELECT coalesce(sum(byte_size),0) AS n FROM exchange_files WHERE exchange_id=$1',[x.e.id])).rows[0].n);if(total+bytes.length>500*1024*1024)fail(413,'file_capacity','This page has reached its file capacity');
   const fileId=randomUUID();await tx.query('INSERT INTO exchange_files(id,workspace_id,exchange_id,slot,filename,mime,byte_size,checksum,bytes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[fileId,x.e.workspace_id,x.e.id,input.slot??null,input.filename,input.mime,bytes.length,checksum(bytes),bytes]);
   const label=input.slot?(x.g.slots as any[]).find(sl=>sl.key===input.slot)?.label:null;await logExchange(tx,x.e,'uploaded',{fileId,filename:input.filename,byteSize:bytes.length,slot:input.slot??null,label});return {id:fileId,filename:input.filename,byteSize:bytes.length,slot:input.slot??null};}));
 });
 app.delete('/external-exchange/files/:fileId',async(req,res)=>{const fileId=id.parse(req.params.fileId);res.json(await s.db.transaction(async tx=>{const x=await load(tx,req);requireVerified(x);requireOpen(x);const r=(await tx.query('UPDATE exchange_files SET removed_at=now() WHERE id=$1 AND exchange_id=$2 AND submission_id IS NULL AND slot IS NULL AND removed_at IS NULL RETURNING id',[fileId,x.e.id])).rows[0];if(!r)fail(404,'not_found','Draft file not found');return {removed:true};}));});
 app.post('/external-exchange/submit',async(req,res)=>{
  const input=z.object({nonce:id,confirmed:z.literal(true),data:dataSchema}).parse(req.body);if(Buffer.byteLength(JSON.stringify(input.data))>100000)fail(413,'too_large','Response is too large');
  res.json(await s.db.transaction(async tx=>{const x=await load(tx,req);requireVerified(x);requireOpen(x);
   const old=(await tx.query('SELECT id,version,data FROM exchange_submissions WHERE exchange_id=$1 AND nonce=$2',[x.e.id,input.nonce])).rows[0];if(old){if(checksum(JSON.stringify(old.data,Object.keys(old.data).sort()))!==checksum(JSON.stringify(input.data,Object.keys(input.data).sort())))fail(409,'retry_mismatch','Submission differs from the original confirmation');return {id:old.id,version:old.version,status:'submitted'};}
   const {type,policy,fields,questions}=await formOf(tx,x),active=activeQuestions(questions,input.data);
   if(Object.keys(input.data).some(k=>!fields.some(f=>f.key===k)||!active.has(k)))fail(400,'invalid_field','Unexpected field');
   for(const q of questions)if(active.has(q.field)&&q.required&&(input.data[q.field]===undefined||input.data[q.field]===null||input.data[q.field]===''||(Array.isArray(input.data[q.field])&&!(input.data[q.field] as any[]).length)))fail(400,'required_question','Answer every required visible question');
   await new Service(scoped(tx)).validateData(tx,x.owner,x.e.workspace_id,{...type,fields:type.fields.map((f:any)=>({...f,unique:false}))},policy,input.data);
   const version=Number((await tx.query('SELECT coalesce(max(version),0)+1 AS v FROM exchange_submissions WHERE exchange_id=$1',[x.e.id])).rows[0].v),submissionId=randomUUID();
   await tx.query('INSERT INTO exchange_submissions(id,workspace_id,exchange_id,version,nonce,data) VALUES($1,$2,$3,$4,$5,$6)',[submissionId,x.e.workspace_id,x.e.id,version,input.nonce,JSON.stringify(input.data)]);
   const attached=(await tx.query('UPDATE exchange_files SET submission_id=$2 WHERE exchange_id=$1 AND submission_id IS NULL AND slot IS NULL AND removed_at IS NULL RETURNING id',[x.e.id,submissionId])).rows.length;
   await tx.query('DELETE FROM exchange_drafts WHERE exchange_id=$1',[x.e.id]);
   await logExchange(tx,x.e,'submitted',{submissionId,version,files:attached});return {id:submissionId,version,status:'submitted'};}));
 });
 app.get('/external-exchange/messages',async(req,res)=>res.json(await s.db.transaction(async tx=>{const x=await load(tx,req);requireVerified(x);notRoom(x);return {messages:await listMessages(tx,x),open:!x.closed||x.g.messages_after_deadline};})));
 app.post('/external-exchange/messages',async(req,res)=>{
  const input=z.object({body:z.string().trim().min(1).max(10000)}).parse(req.body);
  res.json(await s.db.transaction(async tx=>{const x=await load(tx,req);requireVerified(x);notRoom(x);if(x.closed&&!x.g.messages_after_deadline)fail(403,'closed','Messages are closed');
   const messageId=randomUUID();await tx.query("INSERT INTO exchange_messages(id,workspace_id,group_id,exchange_id,kind,author,body) VALUES($1,$2,$3,$4,'private','recipient',$5)",[messageId,x.e.workspace_id,x.g.id,x.e.id,input.body]);
   await logExchange(tx,x.e,'message',{messageId,author:'recipient'});return {id:messageId,createdAt:new Date().toISOString()};}));
 });
}
