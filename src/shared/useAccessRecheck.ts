import {useEffect,useRef} from 'react';
/** Revalidate visible cached views on return and every 30s; never re-execute generated code. */
export function useAccessRecheck(check:()=>void,enabled=true){
 const latest=useRef(check);latest.current=check;
 useEffect(()=>{if(!enabled)return;const run=()=>{if(document.visibilityState==='visible')latest.current();};
 window.addEventListener('focus',run);document.addEventListener('visibilitychange',run);const timer=setInterval(run,30000);
 return()=>{window.removeEventListener('focus',run);document.removeEventListener('visibilitychange',run);clearInterval(timer);};},[enabled]);
}
