import React,{useEffect,useState,useSyncExternalStore} from 'react';
let pending=0;const listeners=new Set<()=>void>();
const notify=()=>listeners.forEach(fn=>fn());
/** Every completion, including rejection, releases its own activity slot. */
export async function withWorkspaceActivity<T>(work:()=>Promise<T>):Promise<T>{pending++;notify();try{return await work();}finally{pending--;notify();}}
const subscribe=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
export function WorkspaceProgress({active=false}:{active?:boolean}){
 const count=useSyncExternalStore(subscribe,()=>pending,()=>0)+(active?1:0),[visible,setVisible]=useState(false);
 useEffect(()=>{if(!count){setVisible(false);return;}const timer=setTimeout(()=>setVisible(true),150);return()=>clearTimeout(timer);},[!!count]);
 return visible&&count>0?<div className="ty-workspace-progress" role="progressbar" aria-label="Working" aria-valuetext="Operation in progress"><span/></div>:null;
}
