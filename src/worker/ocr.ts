import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec=promisify(execFile);
export async function ocr(bytes:Buffer,mime:string){
 const dir=await mkdtemp(join(tmpdir(),'trialy-ocr-'));try{
  const input=join(dir,'source');await writeFile(input,bytes,{mode:0o600});let pages:string[]=[];
  if(mime==='application/pdf'){
   await exec('pdftoppm',['-f','1','-l','20','-scale-to','2000','-png',input,join(dir,'page')],{timeout:60000,maxBuffer:1024*1024});
   pages=(await readdir(dir)).filter(n=>/^page-\d+\.png$/.test(n)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(n=>join(dir,n));
  }else pages=[input];
  const sections=[];for(let i=0;i<pages.length;i++){
   const dest=join(dir,`ocr-${i}`);await exec('tesseract',[pages[i],dest,'-l','eng'],{timeout:30000,maxBuffer:1024*1024});
   const text=(await readFile(dest+'.txt','utf8')).trim();sections.push({page:i+1,text});
  }
  // OCR is always labelled partial: recognition fidelity and page coverage are not guaranteed.
  return {text:sections.map(p=>p.text).join('\n\n'),sections,method:'tesseract-eng',partial:true};
 }finally{await rm(dir,{recursive:true,force:true});}
}
