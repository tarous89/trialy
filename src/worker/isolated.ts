import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Extraction } from './processor.js';
export function isolatedExtract(bytes:Buffer,mime:string):Promise<Extraction>{return new Promise((resolve,reject)=>{
 const child=fork(fileURLToPath(new URL('./extract-child.ts',import.meta.url)),[],{execArgv:['--import','tsx'],detached:true,stdio:['ignore','ignore','ignore','ipc'],env:{PATH:process.env.PATH,NODE_ENV:process.env.NODE_ENV}});
 let done=false;const finish=(error?:Error,result?:Extraction)=>{if(done)return;done=true;clearTimeout(timer);try{if(child.pid)process.kill(-child.pid,'SIGKILL');}catch{child.kill('SIGKILL');}if(error)reject(error);else resolve(result!);};
 const timer=setTimeout(()=>finish(new Error('processing_timeout')),120000);
 child.once('message',(message:any)=>{if(message.ok)finish(undefined,message.result);else{const e=Object.assign(new Error(message.diagnostic),{permanent:message.permanent});finish(e);}});
 child.once('error',e=>finish(e));child.once('exit',()=>{if(!done)finish(new Error('processing_interrupted'));});
 child.send({base64:bytes.toString('base64'),mime});
});}
