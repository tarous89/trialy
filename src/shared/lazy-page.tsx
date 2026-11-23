import React,{useEffect,useState} from 'react';
/**
 * Loading speed (docs/scopes/LOADING_SPEED_2026-11-22.md, L1.5 and L4.5): pages a first screen never shows are loaded in
 * a second step. A lazy module is downloaded once: started by preload() right after the first screen, or by the first
 * page that needs it; every page that needs it joins that one download. Until it arrives a page shows its frame (its
 * heading and a quiet placeholder, never the loading bar). If it fails, the frame offers Retry, which loads it again.
 */
export type LazyState<M>={status:'idle'|'loading'|'ready'|'failed';module?:M};
export type LazyModule<M>={state():LazyState<M>;preload():Promise<M|undefined>;retry():void;subscribe(listener:()=>void):()=>void};
/** retry: what Retry does after a failure. The default loads again; a browser that keeps a failed import() of the same
 * address (Chromium does) needs another way, such as reloading the page (the website passes it). */
export function lazyModule<M>(load:()=>Promise<M>,options:{retry?:()=>void}={}):LazyModule<M>{
 let state:LazyState<M>={status:'idle'},running:Promise<M|undefined>|null=null;
 const listeners=new Set<()=>void>();
 const set=(next:LazyState<M>)=>{state=next;listeners.forEach(f=>f());};
 const preload=()=>{
  if(state.status==='ready')return Promise.resolve(state.module);
  if(running)return running;
  set({status:'loading'});
  running=load().then(module=>{running=null;set({status:'ready',module});return module;},()=>{running=null;set({status:'failed'});return undefined;});
  return running;
 };
 return {state:()=>state,preload,retry(){if(state.status!=='failed')return;if(options.retry){options.retry();return;}set({status:'idle'});void preload();},subscribe(listener){listeners.add(listener);return()=>{listeners.delete(listener);};}};
}
/** The module's state, re-rendering when it changes. Mounting starts the download if it has not started yet. */
export function useLazyModule<M>(module:LazyModule<M>){
 const [,changed]=useState(0);
 useEffect(()=>{const update=()=>changed(n=>n+1);const stop=module.subscribe(update);void module.preload();update();return stop;},[module]);
 return module.state();
}
export type FrameProps={failed:boolean;retry:()=>void};
/** A component of a lazy module; its frame until the module arrives. */
export function lazyComponent<M,C extends React.ComponentType<any>>(module:LazyModule<M>,pick:(m:M)=>C,Frame:(props:FrameProps)=>React.ReactElement|null,name='LazyPage'){
 function Lazy(props:React.ComponentProps<C>){
  const current=useLazyModule(module);
  if(current.module){const Component=pick(current.module) as React.ComponentType<any>;return <Component {...props}/>;}
  return <Frame failed={current.status==='failed'} retry={module.retry}/>;
 }
 Lazy.displayName='Lazy('+name+')';
 return Lazy;
}
const Failed=({label,retry}:{label:string;retry:()=>void})=><div className="ty-empty" role="alert"><p>{label} could not be loaded.</p><button className="ty-button ty-button--primary" onClick={retry}>Retry</button></div>;
/** The frame of a full page: its heading at once, the content when the module arrives. */
export const pageFrame=(title:string)=>function PageFrame({failed,retry}:FrameProps){
 return <section className="ty-page ty-late-page" aria-busy={failed?undefined:true} data-late-page=""><div className="ty-page-heading"><h1>{title}</h1></div>{failed?<Failed label="This page" retry={retry}/>:<div className="ty-runtime-loading" aria-label={'Loading '+title}/>}</section>;
};
/** The frame of a part of a page (a dialog or a control). */
export const inlineFrame=(label:string)=>function InlineFrame({failed,retry}:FrameProps){
 return failed?<Failed label={label} retry={retry}/>:<div className="ty-runtime-loading" aria-label={'Loading '+label} data-late-page=""/>;
};
/** Nothing until the module arrives (a page whose own frame is drawn elsewhere). */
export const quietFrame=()=>function QuietFrame({failed,retry}:FrameProps){return failed?<Failed label="This page" retry={retry}/>:null;};
