import type {Connection} from '../db/database.js';
import {fail as refuse,failWith} from '../shared/schema.js';
/**
 * Session 6, package 6.9 (X2, D35): every file that arrives from outside is screened before anyone can
 * open, accept or hand it to an assistant. Screening checks the type is allowed, the content matches the
 * type, the size, and blocks executables, documents with macros and encrypted archives or documents.
 * A malware scanner is a separate service decision (owner action O6); this is not one.
 */
export type Screening={status:'passed'|'failed';reason:string|null;kind:string|null};
export const SCREENING_MAX_BYTES=5*1024*1024;
const EXTENSIONS:Record<string,string>={pdf:'pdf',png:'png',jpg:'jpeg',jpeg:'jpeg',gif:'gif',webp:'webp',txt:'text',csv:'text',md:'text',tsv:'text',json:'text',xml:'text',
 docx:'ooxml',xlsx:'ooxml',pptx:'ooxml',doc:'ole',xls:'ole',ppt:'ole',odt:'zip',ods:'zip',odp:'zip',zip:'zip',rtf:'text'};
const BLOCKED=/\.(exe|dll|com|scr|bat|cmd|ps1|psm1|vbs|vbe|js|jse|wsf|wsh|msi|msp|jar|apk|app|sh|bash|zsh|py|pl|rb|php|hta|cpl|lnk|iso|img|dmg|docm|dotm|xlsm|xltm|xlam|pptm|potm|ppam|sldm)$/i;
const starts=(b:Buffer,sig:number[],at=0)=>sig.every((x,i)=>b[at+i]===x);
const has=(b:Buffer,text:string)=>b.includes(Buffer.from(text,'latin1'));
function magic(b:Buffer):string|null{
 if(starts(b,[0x25,0x50,0x44,0x46]))return 'pdf';
 if(starts(b,[0x89,0x50,0x4e,0x47]))return 'png';
 if(starts(b,[0xff,0xd8,0xff]))return 'jpeg';
 if(starts(b,[0x47,0x49,0x46,0x38]))return 'gif';
 if(starts(b,[0x52,0x49,0x46,0x46])&&starts(b,[0x57,0x45,0x42,0x50],8))return 'webp';
 if(starts(b,[0x50,0x4b,0x03,0x04])||starts(b,[0x50,0x4b,0x05,0x06]))return 'zip';
 if(starts(b,[0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]))return 'ole';
 if(starts(b,[0x4d,0x5a])||starts(b,[0x7f,0x45,0x4c,0x46])||starts(b,[0xcf,0xfa,0xed,0xfe])||starts(b,[0xfe,0xed,0xfa,0xcf])||starts(b,[0xca,0xfe,0xba,0xbe])||starts(b,[0x23,0x21]))return 'executable';
 return null;
}
const looksLikeText=(b:Buffer)=>{const n=Math.min(b.length,4096);for(let i=0;i<n;i++){const c=b[i]!;if(c===0)return false;}return true;};
/** Local file headers of a zip: an encrypted entry sets bit 0 of the general-purpose flag. */
function zipEntries(b:Buffer){const names:string[]=[];let encrypted=false;for(let i=0;i+30<=b.length&&names.length<2000;){if(!starts(b,[0x50,0x4b,0x03,0x04],i)){const next=b.indexOf(Buffer.from([0x50,0x4b,0x03,0x04]),i+1);if(next<0)break;i=next;continue;}
 const flag=b.readUInt16LE(i+6),size=b.readUInt32LE(i+18),nameLength=b.readUInt16LE(i+26),extra=b.readUInt16LE(i+28);if(flag&1)encrypted=true;names.push(b.subarray(i+30,i+30+nameLength).toString('utf8'));
 i+=30+nameLength+extra+(flag&8?0:size);if(flag&8)i++;}
 return {names,encrypted};}

export function screenFile(f:{filename:string;mime?:string|null;bytes:Buffer},maxBytes=SCREENING_MAX_BYTES):Screening{
 const fail=(reason:string,kind:string|null=null):Screening=>({status:'failed',reason,kind});
 const name=f.filename.toLowerCase(),ext=name.includes('.')?name.slice(name.lastIndexOf('.')+1):'';
 if(!f.bytes.length)return fail('The file is empty.');
 if(f.bytes.length>maxBytes)return fail(`The file is larger than ${Math.round(maxBytes/1048576)} MB.`);
 if(BLOCKED.test(name))return fail(/m$/.test(ext)&&/^(doc|dot|xls|xlt|xla|ppt|pot|ppa|sld)/.test(ext)?'Documents with macros are not accepted. Save it without macros and try again.':'Programs and scripts are not accepted.');
 const expected=EXTENSIONS[ext],found=magic(f.bytes);
 if(found==='executable')return fail('Programs and scripts are not accepted.');
 if(!expected)return fail('This file type is not accepted. Send a PDF, an image, a text or CSV file, or an Office document.');
 if(expected==='text'){if(found||!looksLikeText(f.bytes))return fail('The file content does not match its type.');return {status:'passed',reason:null,kind:'text'};}
 if(expected==='ooxml'||expected==='zip'){
  if(found!=='zip')return fail('The file content does not match its type.');
  const z=zipEntries(f.bytes);if(z.encrypted)return fail('Encrypted or password-protected files are not accepted. Send it without a password.');
  if(expected==='ooxml'){if(!z.names.includes('[Content_Types].xml'))return fail('The file content does not match its type.');if(z.names.some(n=>/vbaProject\.bin$/i.test(n)))return fail('Documents with macros are not accepted. Save it without macros and try again.');}
  if(z.names.some(n=>BLOCKED.test(n.toLowerCase())))return fail('The archive contains programs or scripts.');
  return {status:'passed',reason:null,kind:expected};
 }
 if(expected==='ole'){
  if(found!=='ole')return fail('The file content does not match its type.');
  if(has(f.bytes,'_VBA_PROJECT')||has(f.bytes,'V\0B\0A\0'))return fail('Documents with macros are not accepted. Save it without macros and try again.');
  if(has(f.bytes,'E\0n\0c\0r\0y\0p\0t\0e\0d\0P\0a\0c\0k\0a\0g\0e'))return fail('Encrypted or password-protected files are not accepted. Send it without a password.');
  return {status:'passed',reason:null,kind:'ole'};
 }
 if(found!==expected)return fail('The file content does not match its type.');
 if(expected==='pdf'&&/\/Encrypt\b/.test(f.bytes.subarray(0,Math.min(f.bytes.length,2*1024*1024)).toString('latin1')))return fail('Encrypted or password-protected files are not accepted. Send it without a password.');
 return {status:'passed',reason:null,kind:expected};
}
/** The message a submitter sees: whether to retry, and with what. */
export function screeningRefusal(filename:string,s:Screening){return {code:'file_screening',retry:true,message:`${filename}: ${s.reason} Nothing was sent; you can try again.`};}
/** Refuses an upload that fails screening; the submitter is told to retry with another file. */
export function requireScreened(f:{filename:string;mime?:string|null;bytes:Buffer},maxBytes=SCREENING_MAX_BYTES){const s=screenFile(f,maxBytes);if(s.status==='failed'){const r=screeningRefusal(f.filename,s);failWith(422,r.code,r.message,{retry:true,reason:s.reason});}return s;}
/** Before a received file is opened or accepted: screen files stored before screening existed, refuse failed ones. */
export async function ensureScreened(tx:Connection,table:'exchange_files'|'submission_files',id:string){
 const f=(await tx.query(`SELECT id,filename,mime,bytes,screening_status,screening_reason FROM ${table} WHERE id=$1`,[id])).rows[0];if(!f)return;
 let status=f.screening_status,reason=f.screening_reason;
 if(status==='not_screened'){const s=screenFile({filename:f.filename,mime:f.mime,bytes:Buffer.from(f.bytes)},25*1024*1024);status=s.status;reason=s.reason;await tx.query(`UPDATE ${table} SET screening_status=$2,screening_reason=$3 WHERE id=$1`,[id,status,reason]);}
 if(status==='failed')refuse(409,'file_screening_failed',`${f.filename} did not pass screening: ${reason} It cannot be opened or accepted.`);
}
