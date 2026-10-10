import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {ocr} from './ocr.js';
const exec=promisify(execFile);
export async function pdfText(bytes:Buffer){
 const directory=await mkdtemp(join(tmpdir(),'trialy-pdf-'));
 try{
  const file=join(directory,'source.pdf');await writeFile(file,bytes,{mode:0o600});
  const {stdout}=await exec('pdftotext',['-f','1','-l','200','-layout','-enc','UTF-8',file,'-'],{timeout:60000,maxBuffer:10*1024*1024});
  const pages=stdout.split('\f');if(!pages.at(-1)?.trim())pages.pop();
  const sections=pages.map((text,i)=>({page:i+1,text:text.trim()}));if(!sections.some(p=>p.text))return await ocr(bytes,'application/pdf');
  const tables:{page:number;rows:string[][]}[]=[];
  for(const section of sections){let rows:string[][]=[];const flush=()=>{if(rows.length>=2&&tables.length<10)tables.push({page:section.page,rows:rows.slice(0,50).map(r=>r.slice(0,30).map(c=>c.slice(0,500)))});rows=[];};for(const line of section.text.split('\n')){const cells=line.trim().split(/\s{2,}/);if(cells.length>1)rows.push(cells);else flush();}flush();}
  // Layout-derived columns are tentative. The 200-page cap and blank pages are disclosed.
  return {text:sections.map(s=>s.text).join('\n\n'),sections,method:'poppler-layout',partial:sections.length>=200||sections.some(s=>!s.text),tables,tableStatus:tables.length?'partial' as const:'unavailable' as const};
 }finally{await rm(directory,{recursive:true,force:true});}
}
