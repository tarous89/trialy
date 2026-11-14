import {useEffect,useRef} from 'react';
import {coordinatedRecheck,type RecheckReason} from './coordinated-recheck.js';
/** Revalidate visible cached views on return and every 30s; never re-execute generated code. */
export function useAccessRecheck(check:(reason:RecheckReason,signal:AbortSignal)=>void|Promise<void>,enabled=true,scopeKey='',recheckOnEnable=true){
 const latest=useRef(check),wasActive=useRef(false);latest.current=check;
 useEffect(()=>{if(!enabled)return;const scheduled=coordinatedRecheck((reason,signal)=>{if(document.visibilityState==='visible')return latest.current(reason,signal);});
 if(wasActive.current&&recheckOnEnable)scheduled.request('return');wasActive.current=true;
 const returned=()=>{if(document.visibilityState==='visible')scheduled.request('return');};
 window.addEventListener('focus',returned);document.addEventListener('visibilitychange',returned);
 const timer=setInterval(()=>{if(document.visibilityState==='visible')scheduled.request('interval');},30000);
 return()=>{scheduled.dispose();window.removeEventListener('focus',returned);document.removeEventListener('visibilitychange',returned);clearInterval(timer);};},[enabled,scopeKey,recheckOnEnable]);
}
