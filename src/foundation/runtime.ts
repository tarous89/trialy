import { fork, type ChildProcess } from 'node:child_process';
import { AsyncLocalStorage } from 'node:async_hooks';
import { fileURLToPath } from 'node:url';
import { AppError } from '../shared/schema.js';
import {requestMetrics} from '../db/metrics.js';
export const RUNTIME='quickjs-wasm-0.32.0-v1';
export const LIMITS={wallMs:15000,hostGraceMs:5000,memoryBytes:64*1024*1024,outputBytes:1024*1024,calls:100};
// A process started ahead of time must carry nothing from the request that happened to trigger it:
// it is started outside every request scope, and each run binds its replies to its own caller below.
const outsideRequests=AsyncLocalStorage.snapshot();
type Waiting={child:ChildProcess;ready:boolean;gone:boolean};
const waiting:Waiting[]=[];
/** Processes kept started ahead of the next run (default 1, 0 to 4). Each idle one holds memory. */
const warmCount=()=>{const n=Number(process.env.APP_RUNTIME_WARM??1);return Number.isInteger(n)&&n>=0&&n<=4?n:1;};
function start():Waiting{
 const child=fork(fileURLToPath(new URL('./runtime-child.mjs',import.meta.url)),[],{execArgv:['--max-old-space-size=96'],stdio:['ignore','ignore','ignore','ipc'],env:{NODE_ENV:'production'}});
 const entry:Waiting={child,ready:false,gone:false},leave=()=>{entry.gone=true;const i=waiting.indexOf(entry);if(i>=0)waiting.splice(i,1);};
 child.on('message',(m:any)=>{if(m?.kind==='ready')entry.ready=true;});child.once('error',leave);child.once('exit',leave);
 return entry;
}
/** A process serves one run and is then killed, exactly as before. Only its start-up is moved ahead
 * of the request: after a run, the next process is started and waits, unreferenced, for the next run. */
function refill(){while(waiting.length<warmCount()){const entry=outsideRequests(start);entry.child.unref();(entry.child.channel as any)?.unref?.();waiting.push(entry);}}
function take():Waiting{
 for(let entry=waiting.shift();entry;entry=waiting.shift())if(!entry.gone&&entry.child.connected&&entry.child.exitCode===null){entry.child.ref();(entry.child.channel as any)?.ref?.();return entry;}
 return start();
}
/** For tests and diagnostics: processes waiting, and how many have finished preparing. */
export const runtimeWaiting=()=>({waiting:waiting.length,ready:waiting.filter(w=>w.ready).length});
export function execute(source:string,input:unknown,call:(name:string,input:unknown)=>Promise<unknown>,signal?:AbortSignal,onDetached?:(settled:Promise<void>)=>void):Promise<unknown>{
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new Error('cancelled'));return;}
  const metrics=requestMetrics(),started=performance.now();if(metrics)metrics.sandboxRuns++;
  // Capability calls arrive as process messages. They run in this caller's scope (actor, database
  // security context, request counters), never in the scope the process was started in.
  const asCaller=AsyncLocalStorage.snapshot();
  const taken=take(),child=taken.child;
  let done=false,ready=taken.ready,calls=0,calling=false,total=0,stopping:{error?:Error;value?:unknown}|undefined;
  let hostSettled:Promise<void>|undefined,grace:ReturnType<typeof setTimeout>|undefined;
  const settle=()=>{if(done)return;done=true;clearTimeout(grace);setImmediate(refill);if(metrics)metrics.sandboxMs+=performance.now()-started;stopping!.error?reject(stopping!.error):resolve(stopping!.value);};
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
  child.on('message',(m:any)=>asCaller(async()=>{
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
  }));child.once('error',()=>asCaller(()=>stop(new Error('runtime_unavailable'))));child.once('exit',()=>asCaller(()=>stop(new Error('execution_interrupted'))));
  child.send({kind:'start',source,input,deadline:Date.now()+LIMITS.wallMs-500});
 });
}
