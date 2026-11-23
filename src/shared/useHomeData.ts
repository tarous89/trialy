import {useEffect,useRef,useState} from 'react';
import {useAccessRecheck} from './useAccessRecheck.js';
import type {WorkspaceRequestOptions as Options} from './workspace-request.js';
import {knownHome,rememberHome,forgetHome} from './last-known.js';
const empty=()=>({projects:[],resources:[],total:0});
/** Home content refreshes on return/local changes; idle checks read metadata only. */
export function useHomeData(scope:string,args:any,refresh:number,active:boolean,load:(args:any,options:Options)=>Promise<any>,check:(options:Options)=>Promise<any>){
 const key=JSON.stringify([scope,args]),current=useRef(key);current.current=key;
 const [data,setData]=useState<any>(empty),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[valid,setValid]=useState(false),[archiveRevision,setArchiveRevision]=useState(0),[reload,setReload]=useState(0);
 const loaded=useRef(''),revision=useRef<string|undefined>(undefined),previousQuery=useRef(args.query),pending=useRef<{controller:AbortController;promise?:Promise<void>}|undefined>(undefined);
 const trigger=useRef({key,refresh,reload,active:false}),readGeneration=useRef(0);
 // L4.1: remembered basics only stand in for a screen's first read; after a changed revision or lost access never again.
 const mayRemember=useRef(true);
 useEffect(()=>{
  const previous=trigger.current;trigger.current={key,refresh,reload,active};
  if(!active)return;
  // Only automatic revalidation is quiet. Opening this panel, changing filters,
  // saving and explicit retry stay foreground, even if a check is also due.
  const background=previous.active&&previous.key===key&&previous.refresh===refresh&&previous.reload!==reload;
  readGeneration.current++;
  const read={controller:new AbortController(),promise:undefined as Promise<void>|undefined};pending.current=read;
  const delay=previousQuery.current===args.query?0:150;previousQuery.current=args.query;
  // L4.1: on a return visit the last known basics for this exact read are shown at once (marked remembered: being
  // checked) and the read that replaces them is quiet. Nothing is decided from them: the read checks access as always.
  const remembered=mayRemember.current&&loaded.current!==key?knownHome(key):undefined;
  setLoading(loaded.current!==key&&!remembered);if(loaded.current!==key)setData(remembered??empty());setFailed(false);
  const timer=setTimeout(()=>{read.promise=load(args,{signal:read.controller.signal,background:background||!!remembered}).then(result=>{
   if(read.controller.signal.aborted||current.current!==key)return;
   // Checked basics of the same revision keep what was built from them (the archive is not mounted again).
   const confirmed=!!remembered?.revision&&remembered.revision===result.revision;
   if(!confirmed&&(!loaded.current||!result.revision||revision.current!==result.revision))setArchiveRevision(n=>n+1);
   loaded.current=key;revision.current=result.revision;setData(result);setValid(true);setFailed(false);
   rememberHome(key,result);
  }).catch(e=>{
   if(read.controller.signal.aborted||current.current!==key)return;
   if([401,403,404].includes(e?.status)||e?.code==='access_changed'){setData(empty());setValid(false);revision.current=undefined;mayRemember.current=false;forgetHome();}
   setFailed(true);
  }).finally(()=>{if(pending.current===read){pending.current=undefined;setLoading(false);}});},delay);
  return()=>{clearTimeout(timer);read.controller.abort();if(pending.current===read)pending.current=undefined;};
 },[key,refresh,reload,active]);
 useAccessRecheck(async(reason,signal)=>{
  // The same full read already satisfies a focus/visibility burst. Local mutations
  // and changed filters still replace it through the effect above.
  if(pending.current){await pending.current.promise;return;}
  if(reason==='return'||!revision.current){setReload(n=>n+1);return;}
  const captured=key,generation=readGeneration.current;
  const superseded=()=>signal.aborted||current.current!==captured||!!pending.current||readGeneration.current!==generation;
  try{
   const next=await check({signal,background:true});if(superseded())return;
   if(next?.revision!==revision.current){
    // A revision can mean revoked fields/rows. Do not retain them if reload fails.
    setData(empty());setValid(false);loaded.current='';revision.current=undefined;mayRemember.current=false;forgetHome();setReload(n=>n+1);
   }
  }catch(e){
   if(superseded())return;
   const error=e as any;
   // A host may still have the previous tool catalog. Fall back to the existing
   // authorized read rather than silently losing periodic access revalidation.
   if(error?.code===-32601||/unknown.*(?:tool|action)|(?:tool|action|method).*(?:not found|not available)|unsupported.*(?:tool|method)/i.test(error?.message??'')){setReload(n=>n+1);return;}
   if([401,403,404].includes(error?.status)){setData(empty());setValid(false);revision.current=undefined;mayRemember.current=false;forgetHome();setFailed(true);}
  }
 // The effect above already refreshes when Home is re-enabled or changes scope.
 },active,key,false);
 return {data,setData,loading,failed,valid,archiveRevision,invalidateArchives:()=>setValid(false)};
}
