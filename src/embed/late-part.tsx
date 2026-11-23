import React,{useEffect,useState} from 'react';
import type * as LatePages from './late-pages.js';
/**
 * L4.5 (docs/scopes/LOADING_SPEED_2026-11-22.md, section 6 item 9): the widget's second part, the pages the first screen
 * never shows (src/embed/late-pages.tsx). scripts/build-embed.ts writes it to dist/widget-parts/<file> and names it here.
 * It is one quiet download started right after the first screen is shown:
 *  1. from the platform origin (`/widget-parts/<file>`, a script with subresource integrity), where the host allows it;
 *  2. otherwise through the assistant (`read_widget_part`, checked against the same integrity before it runs);
 *  3. if both fail, a screen that needs it shows its frame with Retry.
 * A screen opened before it arrives shows its frame at once and fills in when it arrives; it never starts a second download.
 * Never the loading bar: nothing here goes through withWorkspaceActivity. The single-file build (TRIALY_WIDGET_SINGLE_FILE=1)
 * carries the part inline, so it is ready before the first screen.
 */
export type LatePagesModule=typeof LatePages;
declare const __TRIALY_LATE_PART__:{file:string;integrity:string};
export type LatePartState={status:'idle'|'loading'|'ready'|'failed';module?:LatePagesModule;via?:'inline'|'origin'|'assistant'};
let state:LatePartState={status:'idle'},running:Promise<LatePagesModule|undefined>|null=null;
let config:{origin:string;readThroughAssistant:(file:string)=>Promise<string>}|null=null;
const listeners=new Set<()=>void>();
function set(next:LatePartState){state=next;(globalThis as any).__trialyLatePart=next.status+(next.via?':'+next.via:'');listeners.forEach(f=>f());}
/** Part two sets this global when it runs (scripts/build-embed.ts, globalName). */
function present():LatePagesModule|undefined{const module=(globalThis as any).__trialyLatePages;return module&&typeof module==='object'?module as LatePagesModule:undefined;}
export function configureLatePart(value:NonNullable<typeof config>){config=value;}
export function latePartState(){return state;}
function fromOrigin(origin:string,part:{file:string;integrity:string}){
 return new Promise<LatePagesModule>((resolve,reject)=>{
  const script=document.createElement('script');
  const finish=(error?:Error)=>{clearTimeout(timer);script.onload=script.onerror=null;const module=error?undefined:present();if(module)resolve(module);else reject(error??Error('Widget part not registered'));};
  const timer=setTimeout(()=>finish(Error('Widget part timed out')),20000);
  script.onload=()=>finish();script.onerror=()=>finish(Error('Widget part refused'));
  // Subresource integrity: the file must be byte for byte the one this widget was built with. CORS mode is needed for it;
  // the server answers with Access-Control-Allow-Origin: * (the file is public code, like the widget itself).
  script.integrity=part.integrity;script.crossOrigin='anonymous';script.async=true;
  script.src=new URL('/widget-parts/'+part.file,origin).href;
  document.head.appendChild(script);
 });
}
async function sha384(text:string){
 const subtle=globalThis.crypto?.subtle;if(!subtle)return undefined;
 const bytes=new Uint8Array(await subtle.digest('SHA-384',new TextEncoder().encode(text)));let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
 return 'sha384-'+btoa(binary);
}
async function throughAssistant(part:{file:string;integrity:string}){
 const text=await config!.readThroughAssistant(part.file);
 if(typeof text!=='string'||!text)throw Error('Widget part unavailable');
 const digest=await sha384(text);if(digest!==undefined&&digest!==part.integrity)throw Error('Widget part does not match this widget');
 // The widget itself is an inline script, so an inline script element runs wherever the widget runs.
 const script=document.createElement('script');script.textContent=text;document.head.appendChild(script);script.remove();
 const module=present();if(!module)throw Error('Widget part blocked');
 return module;
}
/** Starts the download once; later calls join it. Resolves undefined when every way failed (the screens show Retry). */
export function startLatePart():Promise<LatePagesModule|undefined>{
 if(state.status==='ready')return Promise.resolve(state.module);
 if(running)return running;
 const inline=present();
 if(inline){set({status:'ready',module:inline,via:'inline'});return Promise.resolve(inline);}
 const part=__TRIALY_LATE_PART__;
 if(!part.file||!config){set({status:'failed'});return Promise.resolve(undefined);}
 set({status:'loading'});
 const {origin}=config;
 running=(async()=>{
  let module:LatePagesModule|undefined,via:LatePartState['via'];
  try{module=await fromOrigin(origin,part);via='origin';}catch{/* The host refused the platform origin: try the assistant. */}
  if(!module)try{module=await throughAssistant(part);via='assistant';}catch{/* Both failed: screens show Retry. */}
  running=null;
  set(module?{status:'ready',module,via}:{status:'failed'});
  return module;
 })();
 return running;
}
export function retryLatePart(){if(state.status!=='failed')return;set({status:'idle'});void startLatePart();}
/** The part's state, re-rendering when it changes. Mounting starts the download if it has not started yet. */
export function useLatePart(){
 const [,changed]=useState(0);
 useEffect(()=>{const update=()=>changed(n=>n+1);listeners.add(update);void startLatePart();update();return()=>{listeners.delete(update);};},[]);
 return state;
}
import {pageFrame,inlineFrame,type FrameProps} from '../shared/lazy-page.js';
export {pageFrame,inlineFrame};
export function lateComponent<K extends keyof LatePagesModule>(name:K,Frame:(props:FrameProps)=>React.ReactElement|null){
 function Late(props:React.ComponentProps<LatePagesModule[K]>){
  const current=useLatePart();
  if(current.module){const Component=current.module[name] as React.ComponentType<any>;return <Component {...props}/>;}
  return <Frame failed={current.status==='failed'} retry={retryLatePart}/>;
 }
 Late.displayName='Late('+String(name)+')';
 return Late;
}
