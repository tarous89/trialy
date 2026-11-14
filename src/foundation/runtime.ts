import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { AppError } from '../shared/schema.js';
import {requestMetrics} from '../db/metrics.js';
export const RUNTIME='quickjs-wasm-0.32.0-v1';
export const LIMITS={wallMs:15000,hostGraceMs:5000,memoryBytes:64*1024*1024,outputBytes:1024*1024,calls:100};
export function execute(source:string,input:unknown,call:(name:string,input:unknown)=>Promise<unknown>,signal?:AbortSignal,onDetached?:(settled:Promise<void>)=>void):Promise<unknown>{
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new Error('cancelled'));return;}
  const metrics=requestMetrics(),started=performance.now();if(metrics)metrics.sandboxRuns++;
  const child=fork(fileURLToPath(new URL('./runtime-child.mjs',import.meta.url)),[],{execArgv:['--max-old-space-size=96'],stdio:['ignore','ignore','ignore','ipc'],env:{NODE_ENV:'production'}});
  let done=false,ready=false,calls=0,calling=false,total=0,stopping:{error?:Error;value?:unknown}|undefined;
  let hostSettled:Promise<void>|undefined,grace:ReturnType<typeof setTimeout>|undefined;
  const settle=()=>{if(done)return;done=true;clearTimeout(grace);if(metrics)metrics.sandboxMs+=performance.now()-started;stopping!.error?reject(stopping!.error):resolve(stopping!.value);};
  const stop=(error?:Error,value?:unknown)=>{
   if(done)return;
   // Stop guest computation immediately. Frontend callers can free capacity
   // after a bounded grace period while the started host call keeps its receipt
   // lifetime and the caller keeps the same user/app locked until it settles.
   // Other callers retain their existing lifetime (e.g. worker transactions).
   stopping??={error,value};clearTimeout(timer);signal?.removeEventListener('abort',cancel);child.kill('SIGKILL');
   if(calling){if(onDetached&&!grace)grace=setTimeout(()=>{if(done)return;if(metrics)metrics.runtimeDetached++;onDetached(hostSettled!);settle();},LIMITS.hostGraceMs);return;}
   settle();
  };
  const cancel=()=>stop(new Error('cancelled'));signal?.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(()=>stop(new Error('execution_timeout')),LIMITS.wallMs);
  child.on('message',async(m:any)=>{
   if(done||stopping)return;
   if(m.kind==='ready'){if(!ready&&metrics)metrics.sandboxStartupMs+=performance.now()-started;ready=true;return;}
   if(m.kind==='call'){
    if(calling||++calls>LIMITS.calls||typeof m.raw!=='string'||m.raw.length>LIMITS.outputBytes){stop(new Error('capability_limit'));return;}
    calling=true;let hostFinished!:()=>void;hostSettled=new Promise<void>(resolve=>{hostFinished=resolve;});const callStarted=performance.now();if(metrics)metrics.capabilityCalls++;
    try{const request=JSON.parse(m.raw);const value=await call(request.name,request.input);if(stopping)return;const raw=JSON.stringify(value??null),bytes=Buffer.byteLength(raw);total+=bytes;if(metrics)metrics.capabilityBytes+=bytes;if(total>4*LIMITS.outputBytes)throw new Error('Read budget exceeded');if(!done)child.send({kind:'reply',ok:true,raw});}
    catch(e){if(!done&&!stopping)child.send({kind:'reply',ok:false,error:e instanceof AppError?e.message:'Capability unavailable'});}
    finally{if(metrics)metrics.capabilityMs+=performance.now()-callStarted;calling=false;hostFinished();if(stopping)stop();}
   }else if(m.kind==='done'){
    if(!m.ok)stop(new Error('execution_failed'));else try{if(typeof m.raw!=='string'||Buffer.byteLength(m.raw)>LIMITS.outputBytes)throw new Error('output_limit');stop(undefined,JSON.parse(m.raw));}catch{stop(new Error('output_limit'));}
   }
  });child.once('error',()=>stop(new Error('runtime_unavailable')));child.once('exit',()=>stop(new Error('execution_interrupted')));
  child.send({kind:'start',source,input,deadline:Date.now()+LIMITS.wallMs-500});
 });
}
