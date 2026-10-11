// This host never evaluates guest source with Node. Only QuickJS inside bounded WASM does.
import { RELEASE_ASYNC, newVariant, newQuickJSAsyncWASMModuleFromVariant } from 'quickjs-emscripten';
const MAX = 1024 * 1024;
let pending;
process.on('message', async message => {
 if (message.kind === 'reply') { if (pending) { const done=pending; pending=undefined; done(message); } return; }
 if (message.kind !== 'start') return;
 try {
  const memory = new WebAssembly.Memory({initial:256,maximum:1024}); // Hard 64 MiB WASM ceiling.
  const module = await newQuickJSAsyncWASMModuleFromVariant(newVariant(RELEASE_ASYNC,{wasmMemory:memory}));
  if(module.getWasmMemory()!==memory) throw new Error('memory_boundary_unavailable');
  const rt=module.newRuntime();rt.setMemoryLimit(16*1024*1024);rt.setMaxStackSize(256*1024);
  rt.setInterruptHandler(()=>Date.now()>message.deadline);
  const vm=rt.newContext();
  const call=vm.newAsyncifiedFunction('__call',async handle=>{
   const raw=vm.getString(handle);if(raw.length>MAX)throw new Error('Request too large');
   const reply=await new Promise(resolve=>{pending=resolve;process.send({kind:'call',raw});});
   if(!reply.ok)throw new Error(reply.error);
   return vm.newString(reply.raw);
  });vm.setProp(vm.global,'__call',call);call.dispose();
  // Only JSON strings cross the host/guest boundary. No host objects, imports or network API.
  const source=`(function(){'use strict';const bridge=globalThis.__call;delete globalThis.__call;
   const tools=Object.freeze({call:(name,input={})=>JSON.parse(bridge(JSON.stringify({name,input}))),list:()=>JSON.parse(bridge(JSON.stringify({name:'tools.list',input:{}})))});
   const input=JSON.parse(${JSON.stringify(JSON.stringify(message.input))});
   const value=(function(input,tools){${message.source}\n})(input,tools);
   if(value && typeof value.then==='function')throw new Error('Use synchronous tools.call; async functions are not supported in this runtime');
   const result=JSON.stringify(value===undefined?null:value);if(result.length>${MAX})throw new Error('Output limit exceeded');return result;})()`;
  const result=await vm.evalCodeAsync(source,'function.js');
  if(result.error){result.error.dispose();process.send({kind:'done',ok:false,error:'execution_failed'});}
  else {const raw=vm.getString(result.value);result.value.dispose();process.send({kind:'done',ok:true,raw});}
  vm.dispose();rt.dispose();
 } catch {process.send?.({kind:'done',ok:false,error:'execution_failed'});}
});
