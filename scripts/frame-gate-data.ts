// 5.8: prints, for each switched-on catalog app, what the server would send the frame with the first screen (code,
// seeded reads, styles) and what the server renders for every screen, as JSON. Read by tests/visual/frame-runtime.spec.cjs.
import {execute} from '../src/foundation/runtime.js';
import {CATALOG_APPS,REBUILT_APPS,catalogDemo} from './lib/catalog-demo.js';
import {existsSync} from 'node:fs';
import {runtimeStyles,sourceDigest,runtimeCssFor,effectiveSource} from '../src/workspace/browser-runtime.js';
import {readKey} from '../src/frame-engine/engine-core.js';
import {V2_EXAMPLE_SOURCE,v2ExampleAnswer} from './lib/v2-example.js';
const only=process.argv[2]?.split(',');const out:any[]=[];
/** Every read any screen makes, answered: what read_app_data would return for the frame's missing reads. */
const table=(answer:(n:string,i:any)=>any,reads:Map<string,any>)=>async(name:string,input:any)=>{const key=readKey(name,input??{});try{const result=answer(name,input);reads.set(key,{name,input:input??{},result});return result;}catch(e){reads.set(key,{name,input:input??{},error:(e as Error).message});throw e;}};
for(const app of CATALOG_APPS.filter(a=>!only||only.includes(a.id))){
 const d=await catalogDemo(app),base={saved:true,writable:true},reads:any[]=[],screens:any[]=[],all=new Map<string,any>(),answer=table(d.answer,all);
 const open:any=await execute(d.source,{...base,state:null,event:{kind:'open',action:'',value:null,form:{}}},async(name,input)=>{try{const result=d.answer(name,input);reads.push({name,input:input??{},result});return result;}catch(e){reads.push({name,input,error:(e as Error).message});throw e;}});
 for(const id of d.screens){const o:any=await execute(d.source,{...base,state:open.state??null,event:{kind:'click',action:'nav:'+id,value:null,form:{}}},answer);screens.push({action:'nav:'+id,html:o.html});}
 out.push({id:d.id,version:d.version,open:{html:open.html,css:runtimeCssFor(d.source,open.html)+(open.css??''),state:open.state??null},screens,
  browser:{mode:'compat',version:'v1',digest:sourceDigest(d.source),reads,reset:false,input:base,styles:runtimeStyles(d.source),source:d.source},answers:[...all.values()]});
}
// 7.5: the rebuilt catalog apps (v2), as an owner sees them; their screens are the navigation the first screen offers.
for(const app of REBUILT_APPS.filter(a=>(!only||only.includes(a.id+'@'+a.version))&&existsSync(`templates/apps/${a.id}-${a.version}.json`))){
 const d=await catalogDemo(app),code=effectiveSource(d.source),base={saved:true,writable:true,appRole:'owner',context:null},reads:any[]=[],all=new Map<string,any>(),answer=table(d.answer,all);
 const open:any=await execute(code,{...base,state:null,event:{kind:'open',action:'',value:null,form:{}}},async(name,input)=>{try{const result=d.answer(name,input);reads.push({name,input:input??{},result});return result;}catch(e){reads.push({name,input,error:(e as Error).message});throw e;}});
 // After the first screen the frame adds its own width class (input.viewport), so each width has its own server screens.
 const screens:any[]=[],screensBy:any={};
 for(const width of ['wide','panel','phone']){screensBy[width]=[];for(const action of [...new Set([...String(open.html).matchAll(/data-action="(nav:[^"]+)"/g)].map(m=>m[1]))]){const o:any=await execute(code,{...base,viewport:{width,coarse:false},state:open.state??null,event:{kind:'click',action,value:null,form:{}}},answer);screensBy[width].push({action,html:o.html});}}
 screens.push(...screensBy.wide);
 out.push({id:d.id,version:d.version,open:{html:open.html,css:runtimeCssFor(d.source,open.html)+(open.css??''),state:open.state??null},screens,
  browser:{mode:'v2',version:'v2',digest:sourceDigest(code),reads,reset:false,input:base,styles:runtimeStyles(d.source),source:code},answers:[...all.values()],rebuilt:true,screensBy});
}
if(!only||only.includes('v2-example')){
 const code=effectiveSource(V2_EXAMPLE_SOURCE),base={saved:true,writable:true,appRole:'editor',context:null},reads:any[]=[],all=new Map<string,any>(),answer=table(v2ExampleAnswer,all);
 const open:any=await execute(code,{...base,state:null,event:{kind:'open',action:'',value:null,form:{}}},async(name,input)=>{const r=await answer(name,input);reads.push({name,input:input??{},result:r});return r;});
 out.push({id:'v2-example',version:'1',open:{html:open.html,css:runtimeCssFor(V2_EXAMPLE_SOURCE,open.html)+(open.css??''),state:open.state},screens:[{action:'nav:board'}],
  browser:{mode:'v2',version:'v2',digest:sourceDigest(code),reads,reset:false,input:base,styles:runtimeStyles(V2_EXAMPLE_SOURCE),source:code},answers:[...all.values()]});
}
process.stdout.write(JSON.stringify(out));
