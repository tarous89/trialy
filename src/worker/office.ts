import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import type {Extraction} from './processor.js';
const exec=promisify(execFile);
export async function officeText(bytes:Buffer,kind:'xlsx'|'pptx'):Promise<Extraction>{
 const directory=await mkdtemp(join(tmpdir(),'trialy-office-'));
 try{const file=join(directory,'source');await writeFile(file,bytes,{mode:0o600});const {stdout}=await exec('python3',[fileURLToPath(new URL('./office.py',import.meta.url)),file,kind],{timeout:60000,maxBuffer:20*1024*1024});return JSON.parse(stdout);}
 finally{await rm(directory,{recursive:true,force:true});}
}
