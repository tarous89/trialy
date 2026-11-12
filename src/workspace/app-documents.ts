import {z} from 'zod';
import type {Database} from '../db/database.js';
import {Service} from '../domain/service.js';
import {fail,id,type Actor} from '../shared/schema.js';

/**
 * Platform documents inside saved apps (docs/FRONTEND_CODE.md, "Documents"). An app sees exactly the saved originals the
 * signed-in user (or assistant principal) may see in Documents: the same document, folder and AI-readable rules apply.
 * Uploading is never done by app code: a `data-trialy-document="upload"` button asks the host to open the platform upload
 * review (explicit confirmation), after which the app re-renders and can list the new version.
 * Reads are bounded: 200 newest versions, 20 search hits, 12,000-character text chunks, and a quote check that returns no text.
 */
export const documentCapabilities=['documents.list','documents.search','documents.text','documents.quote'] as const;
const listInput=z.object({limit:z.number().int().min(1).max(200).default(100)}).strict();
const searchInput=z.object({query:z.string().trim().min(1).max(500)}).strict();
const textInput=z.object({versionId:id,offset:z.number().int().min(0).default(0)}).strict();
const quoteInput=z.object({versionId:id,quote:z.string().trim().min(8).max(2000),page:z.number().int().min(1).max(100000).nullable().optional()}).strict();
const norm=(s:string)=>s.toLowerCase().replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();

export async function appDocuments(db:Database,a:Actor,w:string,saved:boolean,name:string,value:unknown){
 // Unsaved previews (including assistant drafts) never read workspace documents.
 if(!saved)return {unavailable:true,message:'Save the app to use documents'};
 const s=new Service(db);
 let visible:any[];
 try{visible=await s.documents(a,w);}catch(e){if((e as any).status===403)return {unavailable:true,message:'Documents are not available for you here'};throw e;}
 const latest=new Map<string,number>();for(const d of visible)latest.set(d.document_id,Math.max(latest.get(d.document_id)??0,d.version));
 const shape=(d:any)=>({documentId:d.document_id,versionId:d.id,version:d.version,latest:latest.get(d.document_id)===d.version,filename:d.filename,mime:d.mime,byteSize:d.byte_size,aiReadable:!!d.ai_enabled,extraction:d.extraction_status??'pending',uploadedOn:new Date(d.created_at).toISOString().slice(0,10)});
 if(name==='documents.list'){const v=listInput.parse(value??{});return {documents:visible.slice(0,v.limit).map(shape),total:visible.length,complete:visible.length<=v.limit};}
 if(name==='documents.search'){
  const v=searchInput.parse(value);const r=await s.search(a,w,v.query);
  return {hits:r.hits.map((h:any)=>({documentId:h.document_id,versionId:h.version_id,version:h.version,filename:h.filename,passage:String(h.passage??'').slice(0,600),pages:(h.sections??[]).map((x:any)=>Number(x.page)).filter((n:number)=>Number.isFinite(n))})),coverage:r.coverage};
 }
 if(name==='documents.text'){const v=textInput.parse(value);const t=await s.documentText(a,w,v.versionId,v.offset);return {versionId:t.versionId,version:t.version,filename:t.filename,status:t.status,offset:t.offset,text:t.text,hasMore:t.hasMore};}
 if(name==='documents.quote'){
  // Verification aid: does this exact sentence occur in the extracted text (and on the stated page)? Never returns document text.
  const v=quoteInput.parse(value);const d=visible.find(x=>x.id===v.versionId);if(!d)fail(404,'not_found','Document not found');
  const e=(await db.query('SELECT status,text_content,sections FROM extractions WHERE version_id=$1',[v.versionId])).rows[0];
  if(!e||!['ready','partial'].includes(e.status))return {versionId:v.versionId,status:e?.status??'pending',found:null,page:null,pages:[]};
  const q=norm(v.quote),pages=(Array.isArray(e.sections)?e.sections:[]).filter((x:any)=>norm(String(x?.text??'')).includes(q)).map((x:any)=>Number(x.page)).filter((n:number)=>Number.isFinite(n));
  const found=pages.length>0||norm(String(e.text_content??'')).includes(q);
  return {versionId:v.versionId,status:e.status,found,page:v.page??null,pages:[...new Set(pages)].slice(0,20),onPage:v.page?pages.includes(v.page):null};
 }
 fail(403,'capability_unavailable','This interface capability is unavailable');
}
