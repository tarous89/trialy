// Spike 1.9 side check, in Node: does a kept-alive QuickJS context grow with the number of renders?
// Same wrapper as frame/harness.mjs, QuickJS release sync build, Partnerships with demo data.
//   node scripts/spikes/frame-engine/memory-check.mjs
import {createRequire} from 'node:module';
import {loadFixtures,createStore,inputFor} from './fixtures.mjs';
const {getQuickJS}=createRequire(import.meta.url)('quickjs-emscripten');
const quickjs=await getQuickJS(),app=(await loadFixtures())[0];
const rt=quickjs.newRuntime();rt.setMemoryLimit(16*1024*1024);rt.setMaxStackSize(256*1024);const vm=rt.newContext();
const store=createStore(app.data.demo);
const call=vm.newFunction('__call',h=>{const r=JSON.parse(vm.getString(h));return vm.newString(JSON.stringify(store(r.name,r.input)??null));});vm.setProp(vm.global,'__call',call);call.dispose();
vm.unwrapResult(vm.evalCode(`(function(){'use strict';const bridge=globalThis.__call;delete globalThis.__call;
 const tools=Object.freeze({call:(name,input={})=>JSON.parse(bridge(JSON.stringify({name,input})))});
 const app=function(input,tools){${app.source}\n};globalThis.__render=function(raw){return JSON.stringify(app(JSON.parse(raw),tools));};})()`)).dispose();
const fn=vm.getProp(vm.global,'__render');
const render=(state,event)=>{const arg=vm.newString(JSON.stringify(inputFor(state,event))),r=vm.unwrapResult(vm.callFunction(fn,vm.undefined,arg));arg.dispose();const out=JSON.parse(vm.getString(r));r.dispose();return out;};
const used=()=>{const h=rt.computeMemoryUsage(),u=vm.dump(h);h.dispose();return u.memory_used_size;};
const first=render({},{kind:'open',action:''});console.log(`${app.id} ${app.version}: QuickJS heap in use after the first render: ${used()} bytes`);
let low=Infinity,high=0;
for(let i=1;i<=600;i++){
 render(first.state,{kind:'click',action:app.nav});render(first.state,{kind:'open',action:''});const now=used();low=Math.min(low,now);high=Math.max(high,now);
 if([1,5,30,100,300,600].includes(i))console.log(`after ${i*2} renders: ${now} bytes`);
}
console.log(`lowest ${low}, highest ${high} bytes over 1200 renders`);
