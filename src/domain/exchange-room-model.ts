import {z} from 'zod';
import type {Connection} from '../db/database.js';
import {id,fail} from '../shared/schema.js';
import {emailTextSchema,noticeEmailSchema} from '../app-services/exchange-email.js';

/**
 * Room extension of external exchanges (docs/product/EXTERNAL_EXCHANGE.md §5): schemas and the one
 * place that decides what a person may see. The recipient page, search, "what changed", published
 * answers, the digest and room emails all go through roomView, so levels are enforced the same way
 * everywhere (row security enforces the same rule for documents and answers in the database).
 */
export const levelKey=z.string().regex(/^[a-z][a-z0-9_]{0,39}$/);
export const levelSchema=z.object({key:levelKey,name:z.string().trim().min(1).max(80),entry:z.enum(['none','click_through','signed_document']).default('none'),text:z.string().max(5000).optional(),slot:z.string().max(40).optional()}).strict();
export const sectionSchema=z.object({number:z.string().trim().regex(/^[0-9A-Za-z]{1,6}(\.[0-9A-Za-z]{1,6}){0,4}$/,'Use section numbers like 4 or 4.2'),title:z.string().trim().min(1).max(160)}).strict();
export const documentItemSchema=z.object({versionId:id,title:z.string().trim().min(1).max(200).optional(),section:sectionSchema.optional(),order:z.number().int().min(0).max(100000).optional(),level:levelKey.optional(),viewOnly:z.boolean().optional(),toSign:z.boolean().optional()}).strict();
export const documentPlacementSchema=documentItemSchema.omit({versionId:true}).extend({versionId:id}).strict();
export const trackingSchema=z.object({accessTypeId:id.optional(),engagementTypeId:id.optional()}).strict();
export const roomDays=z.number().int().min(1).max(730);
const expectedVersion=z.number().int().min(1);
export const roomOperations=[
 z.object({kind:z.literal('define_exchange_levels'),groupId:id,expectedVersion,levels:z.array(levelSchema).min(1).max(10)}).strict(),
 z.object({kind:z.literal('set_exchange_levels'),exchangeId:id,levels:z.array(levelKey).min(1).max(10),notify:z.boolean().default(true),email:noticeEmailSchema.optional()}).strict(),
 z.object({kind:z.literal('replace_exchange_document'),groupId:id,expectedVersion,versionId:id,newVersionId:id}).strict(),
 z.object({kind:z.literal('answer_exchange_question'),questionId:id,body:z.string().trim().min(1).max(10000),supersedes:id.optional(),notify:z.boolean().default(true),email:noticeEmailSchema.optional()}).strict(),
 z.object({kind:z.literal('publish_exchange_answer'),groupId:id,questionId:id.optional(),question:z.string().trim().max(5000).optional(),body:z.string().trim().min(1).max(10000),scope:z.enum(['room','level']),level:levelKey.optional(),supersedes:id.optional(),notify:z.boolean().default(true),email:noticeEmailSchema.optional()}).strict(),
 z.object({kind:z.literal('approve_exchange_digest'),groupId:id,expectedVersion,text:emailTextSchema.nullable(),nameKind:z.enum(['organization','person','custom']).optional(),customName:z.string().max(80).optional()}).strict(),
 z.object({kind:z.literal('archive_exchange_group'),groupId:id,archived:z.boolean()}).strict()
] as const;
export type RoomOperation=z.infer<typeof roomOperations[number]>;
export const roomOperationKinds=roomOperations.map(s=>s.shape.kind.value) as string[];

/** Access table fields the platform owns, and every engagement field it writes (the engagement table is platform-only). */
export const ACCESS_TRACKED=['status','last_seen_on','source'] as const;
export const ENGAGEMENT_FIELDS:Record<string,'text'|'number'|'date'>={grant_id:'text',organization_id:'text',person_id:'text',document_ref:'text',document_title:'text',first_viewed_on:'date',last_viewed_on:'date',view_count:'number',seconds_viewed:'number',downloads:'number',source:'text',as_of:'date',section_id:'text'};
export const TRACKED_FIELD_KIND:Record<string,'text'|'number'|'date'>={status:'text',last_seen_on:'date',source:'text',...ENGAGEMENT_FIELDS};

/** Friendly refusal before the database trigger refuses the same write. */
export async function assertUntracked(tx:Connection,typeId:string,data:Record<string,unknown>,existing?:{data:Record<string,unknown>}|null,state=false){
 const rows=(await tx.query('SELECT fields FROM exchange_tracked_tables WHERE type_id=$1',[typeId])).rows;if(!rows.length)return;
 const tracked=new Set(rows.flatMap(r=>r.fields as string[]));
 const same=(a:unknown,b:unknown)=>JSON.stringify(a??null)===JSON.stringify(b??null);
 if(tracked.has('*')&&(!existing||state||Object.keys(data).some(k=>!same(data[k],existing.data[k]))))fail(403,'tracked_record','This table is recorded by TrialAgents from exchange activity; people and assistants cannot edit it');
 const touched=Object.keys(data).filter(k=>tracked.has(k)&&(existing?!same(data[k],existing.data[k]):!same(data[k],null)&&data[k]!==''));
 if(touched.length)fail(403,'tracked_field',`${touched.join(', ')} ${touched.length===1?'is':'are'} recorded by TrialAgents from exchange activity and cannot be edited`);
}

export type RoomDocument={versionId:string;documentId:string;filename:string;mime:string;byteSize:number;title?:string;section?:{number:string;title:string};order?:number;level?:string;viewOnly?:boolean;toSign?:boolean;gate?:boolean;addedAt?:string;updatedAt?:string;previous?:string[]};
const sectionKey=(n:string)=>n.split('.').map(p=>/^\d+$/.test(p)?p.padStart(6,'0'):p.toLowerCase()).join('.');
export const compareSections=(a:string,b:string)=>a===''?1:b===''?-1:sectionKey(a)<sectionKey(b)?-1:sectionKey(a)>sectionKey(b)?1:0;
export const titleOf=(d:RoomDocument)=>d.title||d.filename;
export const viewable=(mime:string)=>/^(application\/pdf|image\/(png|jpeg|gif|webp))$/.test(mime);
/** Level entry state for one person: held, entry complete, acknowledgement, slot status. */
export async function levelStates(tx:Connection,g:any,e:any){
 const held=new Set((e.levels??[]) as string[]);
 const acks=(await tx.query("SELECT detail,created_at FROM exchange_events WHERE exchange_id=$1 AND kind='level_acknowledged' ORDER BY created_at",[e.id])).rows;
 const files=(await tx.query('SELECT f.slot,f.created_at,a.version_id FROM exchange_files f LEFT JOIN exchange_file_acceptances a ON a.file_id=f.id WHERE f.exchange_id=$1 AND f.slot IS NOT NULL AND f.removed_at IS NULL',[e.id])).rows;
 return ((g.levels??[]) as any[]).map((l,order)=>{const ack=acks.find(x=>x.detail.level===l.key),slotFiles=files.filter(f=>f.slot===l.slot),accepted=slotFiles.some(f=>f.version_id);
  const open=held.has(l.key)&&(l.entry==='none'||(l.entry==='click_through'&&!!ack)||(l.entry==='signed_document'&&accepted));
  return {key:l.key as string,name:l.name as string,order,entry:l.entry as string,text:l.entry==='click_through'?(l.text||''):'',slot:l.entry==='signed_document'?l.slot:null,held:held.has(l.key),open,acknowledged:ack?{name:ack.detail.name,at:ack.created_at}:null,slotStatus:l.entry==='signed_document'?(accepted?'accepted':slotFiles.length?'received':'requested'):null};});
}
/**
 * Everything one person may see in a room. Documents at levels they do not hold are absent (not
 * locked: absent). Documents at a held level whose entry step is incomplete are counted but not
 * named, except the document to sign for that level. groupOpen is the group-wide gate (if any).
 */
export async function roomView(tx:Connection,g:any,e:any,groupOpen=true){
 const levels=await levelStates(tx,g,e),hasLevels=levels.length>0;
 const visit=(await tx.query('SELECT last_seen_at,previous_seen_at FROM exchange_visits WHERE exchange_id=$1',[e.id])).rows[0];
 const since=visit?.previous_seen_at?new Date(visit.previous_seen_at).getTime():null;
 const all=(g.documents as RoomDocument[]).filter(d=>!hasLevels||levels.some(l=>l.held&&l.key===d.level));
 const documents=all.map(d=>{const l=levels.find(x=>x.key===d.level),open=(groupOpen||!!d.gate)&&(!hasLevels||!!l?.open||!!d.toSign);
  const added=d.addedAt?new Date(d.addedAt).getTime():0,updated=d.updatedAt?new Date(d.updatedAt).getTime():0;
  const badge=since===null?null:added>since?'new':updated>since?'updated':null;
  return {...d,open,levelName:l?.name??null,badge:open?badge:null};});
 const open=documents.filter(d=>d.open);
 const sections=new Map<string,{number:string;title:string;documents:typeof open;locked:number}>();
 for(const d of documents){const n=d.section?.number??'';if(!sections.has(n))sections.set(n,{number:n,title:d.section?.title??'Other documents',documents:[],locked:0});const s=sections.get(n)!;if(d.open)s.documents.push(d);else s.locked++;}
 // Sections holding only locked documents are left out: their numbers and titles are not shown either.
 const index=[...sections.values()].filter(s=>s.documents.length).sort((a,b)=>compareSections(a.number,b.number)).map(s=>({...s,count:s.documents.length,documents:s.documents.sort((a,b)=>(a.order??0)-(b.order??0)||titleOf(a).localeCompare(titleOf(b)))}));
 const lockedByLevel=levels.filter(l=>l.held&&!l.open).map(l=>({key:l.key,name:l.name,documents:documents.filter(d=>d.level===l.key&&!d.open).length}));
 return {levels,documents,open,index,lockedByLevel,since:visit?.previous_seen_at??null,changes:open.filter(d=>d.badge),canSee:(versionId:string)=>open.find(d=>d.versionId===versionId)??null};
}
/** Documents added or updated after a moment, among those the person can open (digest and documents_updated emails). */
export function changedSince(view:Awaited<ReturnType<typeof roomView>>,since:Date|string|null){
 const t=since?new Date(since).getTime():0;
 return view.open.filter(d=>Math.max(d.addedAt?new Date(d.addedAt).getTime():0,d.updatedAt?new Date(d.updatedAt).getTime():0)>t)
  .map(d=>({versionId:d.versionId,documentId:d.documentId,title:titleOf(d),section:d.section?.number??'',kind:(d.addedAt?new Date(d.addedAt).getTime():0)>t?'new':'updated'}));
}
export const documentLines=(items:{title:string;section:string;kind:string}[])=>items.map(i=>`- ${i.section?i.section+' ':''}${i.title}${i.kind==='updated'?' (updated)':' (new)'}`).join('\n');
/** Answers addressed to this person: private to them, room-wide, or for a level they hold; latest edit only; references they cannot see are dropped. */
export async function visibleAnswers(tx:Connection,g:any,e:any,view:Awaited<ReturnType<typeof roomView>>){
 const rows=(await tx.query("SELECT a.*,q.section,q.document_id FROM exchange_answers a LEFT JOIN exchange_questions q ON q.id=a.question_id WHERE a.group_id=$1 AND (a.visibility='room' OR (a.visibility='private' AND a.exchange_id=$2) OR (a.visibility='level' AND $3::jsonb ? a.level)) ORDER BY a.created_at",[g.id,e.id,JSON.stringify(e.levels??[])])).rows;
 const superseded=new Set(rows.map(r=>r.supersedes).filter(Boolean));
 return rows.filter(r=>!superseded.has(r.id)).map(r=>{const doc=r.document_id?view.open.find(d=>d.documentId===r.document_id):null,section=r.section&&view.open.some(d=>d.section?.number===r.section)?r.section:null;
  return {id:r.id,questionId:r.question_id,visibility:r.visibility,level:r.visibility==='level'?r.level:null,question:r.visibility==='private'?null:r.question?'A participant asked: '+r.question:null,body:r.body,section,document:doc?{documentId:doc.documentId,title:titleOf(doc)}:null,edited:!!r.supersedes,createdAt:r.created_at};});
}
/** The group-wide confidentiality gate (§2.2), shared by requests and rooms. */
export async function gateState(tx:Connection,g:any,e:any){
 const acknowledged=(await tx.query("SELECT detail,created_at FROM exchange_events WHERE exchange_id=$1 AND kind='acknowledged' ORDER BY created_at LIMIT 1",[e.id])).rows[0];
 const signed=g.gate==='signed_document'?!!(await tx.query('SELECT 1 FROM exchange_files f JOIN exchange_file_acceptances a ON a.file_id=f.id WHERE f.exchange_id=$1 AND f.slot=$2',[e.id,g.gate_slot])).rows.length:true;
 const unlocked=g.gate==='none'||(g.gate==='acknowledgement'&&!!acknowledged)||(g.gate==='signed_document'&&signed);
 return {kind:g.gate as string,text:g.gate_text as string,slot:g.gate_slot as string|null,acknowledged:acknowledged?{name:acknowledged.detail.name,email:acknowledged.detail.email,at:acknowledged.created_at}:null,unlocked};
}
export const roomEnded=(e:any)=>!!e.expires_at&&new Date(e.expires_at).getTime()<=Date.now();
