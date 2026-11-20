// Spike 1.9: the script that runs inside the sandboxed app frame (and, for the Worker probe, inside a blob Worker).
// It is bundled by build.mjs into one inline <script> whose SHA-256 goes into the frame CSP, exactly as the product
// frame does it (src/shared/frontend-frame.ts). No network is used: the WASM bytes are a base64 string in the script.
import {createStore} from '../store.mjs';

const MAX=1024*1024; // same output/request ceiling as src/foundation/runtime-child.mjs
const LIMITS={memoryBytes:16*1024*1024,stackBytes:256*1024,wallMs:15000}; // as runtime-child.mjs / runtime.ts
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const message=e=>String(e&&e.message||e);
// The smallest valid module: only the header. Used to see what the CSP says about WebAssembly, independent of the engine.
const TINY=new Uint8Array([0,97,115,109,1,0,0,0]);

export function install(engine){
 const scriptStartMs=performance.now();
 const isWorker=typeof WorkerGlobalScope!=='undefined'&&self instanceof WorkerGlobalScope;
 const scriptText=isWorker?null:document.currentScript&&document.currentScript.textContent;
 const violations=[];
 self.addEventListener('securitypolicyviolation',e=>violations.push({directive:e.effectiveDirective,blocked:e.blockedURI,disposition:e.disposition}));
 let bytes=null,quickjs=null;

 const boot=(async()=>{
  const result={ok:false,variant:engine.name,worker:isWorker,scriptStartMs};
  try{await WebAssembly.compile(TINY);result.wasmAllowed=true;}catch(e){result.wasmAllowed=false;result.wasmError=message(e);}
  // Checked here, in the frame's own script: code evaluated through the DevTools protocol is exempt from the CSP.
  try{result.nativeFunction=new Function('return 1+1')()===2;}catch(e){result.nativeFunction=false;result.nativeError=message(e);}
  try{
   const t0=performance.now();
   const binary=atob(engine.wasmBase64);bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
   const t1=performance.now();
   // Same hard 64 MiB WASM ceiling as the server child process.
   const memory=new WebAssembly.Memory({initial:256,maximum:1024});
   quickjs=await Promise.race([engine.create({wasmBinary:bytes.buffer.slice(0),wasmMemory:memory}),sleep(20000).then(()=>{throw new Error('engine start timed out');})]);
   const t2=performance.now();
   const c=newContext(),r=c.vm.evalCode('1+1');if(r.error){r.error.dispose();throw new Error('probe evaluation failed');}
   const two=c.vm.getNumber(r.value);r.value.dispose();c.dispose();if(two!==2)throw new Error('probe evaluation returned '+two);
   const t3=performance.now();
   Object.assign(result,{ok:true,wasmBytes:bytes.length,decodeMs:t1-t0,instantiateMs:t2-t1,contextMs:t3-t2,bootMs:t3-scriptStartMs,readyAtMs:t3});
  }catch(e){result.error=message(e);}
  result.violations=violations.slice();
  return result;
 })();

 function newContext(){
  const rt=quickjs.newRuntime();rt.setMemoryLimit(LIMITS.memoryBytes);rt.setMaxStackSize(LIMITS.stackBytes);
  let deadline=Infinity;rt.setInterruptHandler(()=>Date.now()>deadline);
  const vm=rt.newContext();
  return {rt,vm,arm:()=>{deadline=Date.now()+LIMITS.wallMs;},dispose:()=>{vm.dispose();rt.dispose();}};
 }

 // ---- one loaded app: source evaluated once, then any number of renders ----
 let app=null;
 function unload(){if(app&&app.dispose)try{app.dispose();}catch{}app=null;}
 /** mode 'quickjs': the source runs in the QuickJS context. mode 'native': new Function in this frame (needs 'unsafe-eval'). */
 function loadApp({source,data,mode}){
  unload();
  const store=createStore(data),meter={storeMs:0,calls:0};
  // Only JSON strings cross the boundary, in both modes, as on the server.
  const bridge=raw=>{const t=performance.now();try{meter.calls++;if(raw.length>MAX)throw new Error('Request too large');const request=JSON.parse(raw);return JSON.stringify(store(request.name,request.input)??null);}finally{meter.storeMs+=performance.now()-t;}};
  const t0=performance.now();
  if(mode==='native'){
   const fn=new Function('input','tools','"use strict";'+source+'\n');
   const tools=Object.freeze({call:(name,input={})=>JSON.parse(bridge(JSON.stringify({name,input})))});
   app={mode,meter,render:raw=>{const value=fn(JSON.parse(raw),tools);const out=JSON.stringify(value===undefined?null:value);if(out.length>MAX)throw new Error('Output limit exceeded');return out;},memory:()=>null};
  }else{
   const c=newContext(),vm=c.vm;
   const call=vm.newFunction('__call',handle=>vm.newString(bridge(vm.getString(handle))));vm.setProp(vm.global,'__call',call);call.dispose();
   // The server wrapper (runtime-child.mjs) with one change: the app function is kept and called once per render,
   // instead of the whole source being evaluated again for every event.
   const wrapper=`(function(){'use strict';const bridge=globalThis.__call;delete globalThis.__call;
    const tools=Object.freeze({call:(name,input={})=>JSON.parse(bridge(JSON.stringify({name,input}))),list:()=>JSON.parse(bridge(JSON.stringify({name:'tools.list',input:{}})))});
    const app=function(input,tools){${source}\n};
    globalThis.__render=function(raw){const value=app(JSON.parse(raw),tools);
     if(value && typeof value.then==='function')throw new Error('Use synchronous tools.call; async functions are not supported in this runtime');
     const result=JSON.stringify(value===undefined?null:value);if(result.length>${MAX})throw new Error('Output limit exceeded');return result;};})()`;
   c.arm();const loaded=vm.evalCode(wrapper,'function.js');
   if(loaded.error){const detail=vm.dump(loaded.error);loaded.error.dispose();c.dispose();throw new Error('source did not load: '+JSON.stringify(detail));}
   loaded.value.dispose();
   const fn=vm.getProp(vm.global,'__render');
   app={mode,meter,dispose:()=>{fn.dispose();c.dispose();},
    render:raw=>{c.arm();const arg=vm.newString(raw),r=vm.callFunction(fn,vm.undefined,arg);arg.dispose();
     if(r.error){const detail=vm.dump(r.error);r.error.dispose();throw new Error('render failed: '+JSON.stringify(detail));}
     const out=vm.getString(r.value);r.value.dispose();return out;},
    memory:()=>{const h=c.rt.computeMemoryUsage(),usage=vm.dump(h);h.dispose();return {usedBytes:usage.memory_used_size,mallocBytes:usage.malloc_size};}};
  }
  return {loadMs:performance.now()-t0,mode};
 }
 function renderOnce(state,event){
  const input={saved:true,writable:true,state,event:{value:null,form:{},...event}};
  app.meter.storeMs=0;app.meter.calls=0;
  const t0=performance.now(),out=JSON.parse(app.render(JSON.stringify(input))),ms=performance.now()-t0;
  return {ms,storeMs:app.meter.storeMs,calls:app.meter.calls,out};
 }
 // An approximation of the product frame's paint (frontend-frame.ts: parse into a template, walk every element and
 // attribute, replace the root, set the style sheet) followed by a forced style and layout pass. Paint itself is not timed.
 function domApply(out){
  const t0=performance.now(),template=document.createElement('template');template.innerHTML=out.html;
  let nodes=0;(function walk(parent){for(const node of Array.from(parent.childNodes)){if(node.nodeType!==1)continue;nodes++;node.localName.toLowerCase();for(const attr of Array.from(node.attributes))attr.name.toLowerCase();walk(node);}})(template.content);
  document.getElementById('root').replaceChildren(template.content);document.getElementById('app-css').textContent=out.css||'';
  void document.documentElement.offsetHeight;
  return {ms:performance.now()-t0,nodes};
 }
 /** Renders each event n times, interleaved (event 1, event 2, event 1, ...), yielding to the browser between renders. */
 async function bench({state,events,n,dom}){
  const series=events.map(e=>({label:e.label,renderMs:[],storeMs:[],domMs:[],calls:0,htmlChars:0,nodes:0}));
  const before=app.memory();
  for(let i=0;i<n;i++)for(let k=0;k<events.length;k++){
   const r=renderOnce(state,events[k].event),s=series[k];s.renderMs.push(r.ms);s.storeMs.push(r.storeMs);s.calls=r.calls;s.htmlChars=r.out.html.length;
   if(dom&&!isWorker){const d=domApply(r.out);s.domMs.push(d.ms);s.nodes=d.nodes;}
   await sleep(0);
  }
  return {series,memoryBefore:before,memoryAfter:app.memory()};
 }

 // ---- probes ----
 /** Checks that the CPU rate set from outside really applies to this frame: a plain JavaScript loop and a loop inside QuickJS. */
 function calibrate(){
  const js=[],wasm=[];
  for(let k=0;k<3;k++){const t=performance.now();let x=0;for(let i=0;i<2e7;i++)x=(x+i*i)%1000003;js.push(performance.now()-t);}
  if(quickjs){const c=newContext();for(let k=0;k<3;k++){const t=performance.now();const r=c.vm.evalCode('(function(){let x=0;for(let i=0;i<2e5;i++)x=(x+i*i)%1000003;return x;})()');if(r.error){r.error.dispose();throw new Error('calibration loop failed');}r.value.dispose();wasm.push(performance.now()-t);}c.dispose();}
  return {jsLoopMs:Math.min(...js),quickjsLoopMs:wasm.length?Math.min(...wasm):null,deviceIndex:deviceIndex()};
 }
 // A device-speed index modelled on the two loops of Lighthouse's BenchmarkIndex (string building with garbage collection,
 // and array copying), written out here. It was not produced by Lighthouse; it only places this machine and each CPU rate
 // on a familiar scale.
 function deviceIndex(){
  const gc=()=>{const start=Date.now();let iterations=0;while(Date.now()-start<500){let s='';for(let j=0;j<10000;j++)s+='a';if(s.length===1)throw new Error('unreachable');iterations++;}return Math.round(iterations/10/((Date.now()-start)/1000));};
  const copy=()=>{const a=[],b=[];for(let i=0;i<100000;i++)a[i]=b[i]=i;const start=Date.now();let iterations=0;while(iterations%10!==0||Date.now()-start<500){const src=iterations%2===0?a:b,tgt=iterations%2===0?b:a;for(let j=0;j<src.length;j++)tgt[j]=src[j];iterations++;}return Math.round(iterations/10/((Date.now()-start)/1000));};
  return (gc()+copy())/2;
 }
 function synthetic(size){const b=new Uint8Array(size);b.set(TINY);const payload=size-13;b[8]=0;b[9]=(payload&127)|128;b[10]=((payload>>>7)&127)|128;b[11]=((payload>>>14)&127)|128;b[12]=(payload>>>21)&127;b[13]=1;b[14]=120;return b;}
 /** Synchronous compile and instantiate on this thread: the engine binary, and padded modules around Chromium's main-thread limit. */
 async function syncProbe(sizes){
  const out={thread:isWorker?'worker':'main',engine:null,synthetic:[]};
  if(bytes){try{const t=performance.now();new WebAssembly.Module(bytes);out.engine={bytes:bytes.length,syncCompile:{ok:true,ms:performance.now()-t}};}catch(e){out.engine={bytes:bytes.length,syncCompile:{ok:false,error:message(e)}};}}
  for(const size of sizes){
   const b=synthetic(size),row={bytes:size};
   try{new WebAssembly.Module(b);row.syncCompile={ok:true};}catch(e){row.syncCompile={ok:false,error:message(e)};}
   try{const m=await WebAssembly.compile(b);row.asyncCompile={ok:true};try{new WebAssembly.Instance(m);row.syncInstantiate={ok:true};}catch(e){row.syncInstantiate={ok:false,error:message(e)};}
    try{await WebAssembly.instantiate(m);row.asyncInstantiate={ok:true};}catch(e){row.asyncInstantiate={ok:false,error:message(e)};}}
   catch(e){row.asyncCompile={ok:false,error:message(e)};}
   out.synthetic.push(row);
  }
  return out;
 }
 /** Starts this same script as a blob Worker, boots the engine there and renders one event. */
 function workerProbe(job){
  return new Promise(resolve=>{
   let worker,done=false;const finish=v=>{if(done)return;done=true;clearTimeout(timer);try{worker&&worker.terminate();}catch{}resolve({...v,violations:violations.slice()});};
   const timer=setTimeout(()=>finish({ok:false,stage:'timeout'}),30000);
   try{worker=new Worker(URL.createObjectURL(new Blob([scriptText],{type:'text/javascript'})));}catch(e){finish({ok:false,stage:'construct',error:message(e)});return;}
   worker.onerror=e=>finish({ok:false,stage:'error',error:e.message||'Worker failed to start'});
   worker.onmessage=e=>finish(e.data);
   worker.postMessage(job);
  });
 }

 if(isWorker){
  self.onmessage=async e=>{
   const started=await boot;if(!started.ok){self.postMessage({ok:false,stage:'boot',boot:started});return;}
   try{const job=e.data,load=loadApp({source:job.source,data:job.data,mode:'quickjs'}),r=renderOnce(job.state,job.event);
    self.postMessage({ok:true,boot:started,loadMs:load.loadMs,renderMs:r.ms,htmlChars:r.out.html.length,html:r.out.html,sync:await syncProbe(job.sizes??[])});}
   catch(err){self.postMessage({ok:false,stage:'render',boot:started,error:message(err)});}
  };
  return;
 }
 self.__spike={boot,violations,loadApp,unload,calibrate,syncProbe,workerProbe,bench,
  render:(state,event,dom)=>{const r=renderOnce(state,event),d=dom?domApply(r.out):null;return {ms:r.ms,storeMs:r.storeMs,calls:r.calls,domMs:d&&d.ms,nodes:d&&d.nodes,out:r.out};}};
}
