import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import './ui/notices.css';

let host:HTMLDivElement|null=null,users=0;
/** Transient operation feedback lives outside page layout, in one shared stack. */
export function SystemNotice({message,onDismiss,error=false,children}:{message:string;onDismiss:()=>void;error?:boolean;children?:React.ReactNode}){
 const [target,setTarget]=useState<HTMLElement|null>(null),dismiss=useRef(onDismiss);dismiss.current=onDismiss;
 useEffect(()=>{
  if(!host){host=document.createElement('div');host.className='ty-system-notices';document.body.append(host);}
  users++;setTarget(host);
  return()=>{if(!--users){host?.remove();host=null;}};
 },[]);
 useEffect(()=>{if(!target||!message)return;const timer=setTimeout(()=>dismiss.current(),3000);return()=>clearTimeout(timer);},[message,target]);
 return target&&message?createPortal(<div className={'ty-system-notice'+(error?' ty-system-notice--error':'')} role={error?'alert':'status'} aria-atomic="true"><div>{message}{children}</div><button type="button" aria-label={error?'Dismiss error':'Dismiss notification'} onClick={onDismiss}>×</button></div>,target):null;
}
