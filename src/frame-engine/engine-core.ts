// P4, P2 (5.1, architecture E): the app engine that runs inside the sandboxed app frame. It is the same QuickJS release
// the server runs (src/foundation/runtime-child.mjs), in its build without asyncify: reads are answered synchronously from
// the frame's local store, so nothing in the guest has to wait. Only JSON strings cross the guest boundary, as on the server.
// Plain JavaScript with no DOM use, so the same file runs in the frame bundle and in Node (tests/frame-engine.test.ts).

/** Same output and request ceilings as src/foundation/runtime-child.mjs and src/foundation/runtime.ts. */
export const ENGINE_LIMITS=Object.freeze({outputBytes:1024*1024,memoryBytes:16*1024*1024,stackBytes:256*1024,wallMs:15000,calls:100});
/** The smallest valid WebAssembly module (header only). Compiling it shows at once whether the host's policy allows WebAssembly. */
const TINY=new Uint8Array([0,97,115,109,1,0,0,0]);
const MAX=ENGINE_LIMITS.outputBytes;

/** The guest wrapper. It matches the server's wrapper, except that the app function is kept and called once per event
 * instead of the whole source being evaluated again for every event (spike 1.9, section 7). */
export function guestWrapper(source:string){
 return `(function(){'use strict';const bridge=globalThis.__call;delete globalThis.__call;
   const tools=Object.freeze({call:(name,input={})=>JSON.parse(bridge(JSON.stringify({name,input}))),list:()=>JSON.parse(bridge(JSON.stringify({name:'tools.list',input:{}})))});
   const app=function(input,tools){${source}\n};
   globalThis.__render=function(raw){const value=app(JSON.parse(raw),tools);
    if(value && typeof value.then==='function')throw new Error('Use synchronous tools.call; async functions are not supported in this runtime');
    const result=JSON.stringify(value===undefined?null:value);if(result.length>${MAX})throw new Error('Output limit exceeded');return result;};})()`;
}

/**
 * Starts the engine. `create(options)` makes the QuickJS module (newQuickJSWASMModuleFromVariant with the sync variant);
 * `wasm` is the engine binary. Throws `wasm_blocked` when the host's policy refuses WebAssembly, so the frame stays on
 * server mode (D21).
 */
export async function startEngine({create,wasm}:{create:(options:any)=>Promise<any>;wasm:ArrayBuffer}):Promise<{load:(source:string)=>EngineApp}>{
 try{await WebAssembly.compile(TINY);}catch(e){const error:any=new Error('wasm_blocked');error.cause=e;throw error;}
 // Same hard 64 MiB WebAssembly memory ceiling as the server's child process.
 const memory=new WebAssembly.Memory({initial:256,maximum:1024});
 const module=await create({wasmBinary:wasm,wasmMemory:memory});
 return {load:(source:string)=>loadApp(module,source)};
}

/** Loads one app's source into a fresh runtime and context. The context lives while the app stays open. */
export function loadApp(module:any,source:string):EngineApp{
 const rt=module.newRuntime();rt.setMemoryLimit(ENGINE_LIMITS.memoryBytes);rt.setMaxStackSize(ENGINE_LIMITS.stackBytes);
 let deadline=Infinity,current:((raw:string)=>string)|null=null,calls=0;rt.setInterruptHandler(()=>Date.now()>deadline);
 const vm=rt.newContext();
 const call=vm.newFunction('__call',(handle:any)=>{
  const raw=vm.getString(handle);
  if(++calls>ENGINE_LIMITS.calls||raw.length>MAX)throw new Error('capability_limit');
  if(!current)throw new Error('Capability unavailable');
  return vm.newString(current(raw));
 });
 vm.setProp(vm.global,'__call',call);call.dispose();
 deadline=Date.now()+ENGINE_LIMITS.wallMs;
 const loaded=vm.evalCode(guestWrapper(source),'function.js');deadline=Infinity;
 if(loaded.error){loaded.error.dispose();vm.dispose();rt.dispose();throw new Error('source_failed');}
 loaded.value.dispose();
 const fn=vm.getProp(vm.global,'__render');
 let disposed=false;
 return {
  /** Renders one event. `bridge(raw)` answers each tools.call with a JSON string or throws. Returns the parsed output. */
  render(input:unknown,bridge:(raw:string)=>string){
   if(disposed)throw new Error('app_unloaded');
   current=bridge;calls=0;deadline=Date.now()+ENGINE_LIMITS.wallMs;
   const arg=vm.newString(JSON.stringify(input));let r;
   try{r=vm.callFunction(fn,vm.undefined,arg);}finally{arg.dispose();current=null;deadline=Infinity;}
   if(r.error){r.error.dispose();throw new Error('execution_failed');}
   const out=vm.getString(r.value);r.value.dispose();
   if(out.length>MAX)throw new Error('output_limit');
   return JSON.parse(out);
  },
  dispose(){if(disposed)return;disposed=true;try{fn.dispose();vm.dispose();rt.dispose();}catch{}},
 };
}

export type EngineApp={render(input:unknown,bridge:(raw:string)=>string):any;dispose():void};
/** Canonical key of a read: the capability name and its input with object keys sorted, so the same read always matches. */
export function readKey(name:string,input:unknown):string{
 const canon=(v:any):any=>Array.isArray(v)?v.map(canon):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v;
 return name+'|'+JSON.stringify(canon(input===undefined?{}:input));
}
