import React,{useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import {INFO_MS,newNoticeId,noticeSlot} from './notice-slot.js';
import './ui/notices.css';

let host:HTMLDivElement|null=null,users=0;
/**
 * The platform's shared system message (U2): one at a time, bottom right, outside page layout.
 * Info and success close after five seconds; an error stays until dismissed and yields only to a newer error.
 */
export function SystemNotice({message,onDismiss,error=false,children}:{message:string;onDismiss:()=>void;error?:boolean;children?:React.ReactNode}){
 const [target,setTarget]=useState<HTMLElement|null>(null),dismiss=useRef(onDismiss),id=useRef(0);dismiss.current=onDismiss;if(!id.current)id.current=newNoticeId();
 const visible=useSyncExternalStore(noticeSlot.subscribe,()=>noticeSlot.visible()===id.current,()=>false);
 useEffect(()=>{
  if(!host){host=document.createElement('div');host.className='ty-system-notices';document.body.append(host);}
  users++;setTarget(host);
  return()=>{if(!--users){host?.remove();host=null;}};
 },[]);
 useEffect(()=>{
  if(!message)return;
  // A replaced message is dismissed for good, so it cannot reappear when the newer one closes.
  for(const replaced of noticeSlot.show(id.current,error,()=>dismiss.current()))queueMicrotask(replaced.dismiss);
  const timer=error?undefined:setTimeout(()=>dismiss.current(),INFO_MS);
  return()=>{if(timer)clearTimeout(timer);noticeSlot.hide(id.current);};
 },[message,error]);
 return target&&message&&visible?createPortal(<div className={'ty-system-notice'+(error?' ty-system-notice--error':'')} role={error?'alert':'status'} aria-atomic="true"><div>{message}{children}</div><button type="button" aria-label={error?'Dismiss error':'Dismiss notification'} onClick={onDismiss}>×</button></div>,target):null;
}
