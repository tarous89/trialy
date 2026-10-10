import {pdfText} from './pdf.js';
import {csvRows} from '../shared/csv.js';
import { randomUUID } from 'node:crypto';
import type { Database } from '../db/database.js';
import { ocr } from './ocr.js';
import { checksum } from '../domain/service.js';
export type Extraction={text:string;sections:{page?:number;text:string}[];method:string;partial?:boolean;tables?:{page?:number;rows:string[][]}[];tableStatus?:'ready'|'partial'|'unavailable'};
export async function extract(bytes:Buffer,mime:string):Promise<Extraction> {
 if(['text/plain','text/csv','text/markdown','application/json'].includes(mime)) {const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);let tables:Extraction['tables']=[],tableStatus:Extraction['tableStatus']='unavailable';if(mime==='text/csv'){try{const rows=csvRows(text);tables=[{rows:rows.slice(0,50).map(r=>r.slice(0,30).map(c=>c.slice(0,500)))}];tableStatus=rows.length>50||rows.some(r=>r.length>30||r.some(c=>c.length>500))?'partial':'ready';}catch{}}return {text,sections:[{text}],method:'utf8',tables,tableStatus};}
 if(mime==='application/vnd.openxmlformats-officedocument.wordprocessingml.document') {const mammoth=await import('mammoth');const result=await mammoth.extractRawText({buffer:bytes});return {text:result.value,sections:[{text:result.value}],method:'mammoth',partial:result.messages.length>0};}
 if(['image/png','image/jpeg','image/tiff'].includes(mime))return ocr(bytes,mime);
 if(mime==='application/pdf')return pdfText(bytes);
 const e=new Error('unsupported_format') as Error&{permanent:boolean};e.permanent=true;throw e;
}
export async function runOne(db:Database,processor=extract):Promise<boolean> {
 const job:any=await db.transaction(async tx=>{
  const j=(await tx.query("SELECT * FROM jobs WHERE kind='extract' AND ((status='queued' AND run_after<=now()) OR (status='running' AND lease_until<now())) ORDER BY run_after FOR UPDATE SKIP LOCKED LIMIT 1")).rows[0];if(!j)return null;
  // A crashed worker also consumes an attempt. Bound recovery instead of looping forever.
  if(j.attempts>=2){await tx.query("UPDATE jobs SET status='unavailable',diagnostic='attempt_limit',lease_until=NULL WHERE id=$1",[j.id]);await tx.query("UPDATE extractions SET status='unavailable',diagnostic='attempt_limit',updated_at=now() WHERE version_id=$1 AND status='pending'",[j.payload.versionId]);return {exhausted:true};}
  const token=randomUUID();await tx.query("UPDATE jobs SET status='running',attempts=attempts+1,lease_token=$2,lease_until=now()+interval '5 minutes' WHERE id=$1",[j.id,token]);return {...j,token,attempts:j.attempts+1};
 });
 if(!job)return false;if(job.exhausted)return true;
 let result:Extraction|undefined;let diagnostic='';let permanent=false;
 try{
  const d=(await db.query('SELECT d.mime,d.checksum,p.bytes FROM document_versions d JOIN document_payloads p ON p.version_id=d.id WHERE d.id=$1 AND d.workspace_id=$2',[job.payload.versionId,job.workspace_id])).rows[0];
  if(!d)throw new Error('source_missing');const bytes=Buffer.from(d.bytes);if(checksum(bytes)!==d.checksum)throw new Error('source_integrity');
  result=await processor(bytes,d.mime);if(!result.text.trim()){diagnostic='no_text_available';permanent=true;}
 }catch(e){diagnostic=e instanceof Error?e.message.slice(0,100):'processing_failed';permanent=!!(e as any)?.permanent;}
 await db.transaction(async tx=>{
  const current=(await tx.query('SELECT lease_token,status FROM jobs WHERE id=$1 FOR UPDATE',[job.id])).rows[0];if(current.lease_token!==job.token||current.status!=='running')return;
  if(result&&!diagnostic){await tx.query("UPDATE extractions SET status=$2,text_content=$3,sections=$4,method=$5,tables=$6,table_status=$7,processor_version='2',diagnostic=NULL,updated_at=now() WHERE version_id=$1",[job.payload.versionId,result.partial?'partial':'ready',result.text,JSON.stringify(result.sections),result.method,JSON.stringify(result.tables??[]),result.tableStatus??'unavailable']);await tx.query("UPDATE jobs SET status='done',lease_until=NULL WHERE id=$1",[job.id]);}
  else {const retry=!permanent&&job.attempts<2;await tx.query("UPDATE jobs SET status=$2,diagnostic=$3,lease_until=NULL,run_after=now()+interval '10 seconds' WHERE id=$1",[job.id,retry?'queued':'unavailable',diagnostic]);if(!retry)await tx.query("UPDATE extractions SET status='unavailable',diagnostic=$2,updated_at=now() WHERE version_id=$1",[job.payload.versionId,diagnostic]);}
 });return true;
}
