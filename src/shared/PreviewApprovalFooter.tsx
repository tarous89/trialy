import React,{useLayoutEffect,useRef} from 'react';
import {Button} from './ui/Controls.js';
import './preview-approval.css';

/** First publication only. Ordinary app and platform saves stay in their pages. */
export function PreviewApprovalFooter({children,action,onAction,onDismiss,dismissLabel='Discard app',disabled=false,busy=false}:{children:React.ReactNode;action:string;onAction:()=>void;onDismiss?:()=>void;dismissLabel?:string;disabled?:boolean;busy?:boolean}){
 const footer=useRef<HTMLElement>(null);
 useLayoutEffect(()=>{
  const element=footer.current,workspace=element?.closest<HTMLElement>('.ty-workspace');
  if(!element||!workspace)return;
  const resize=()=>{if(!element.getClientRects().length)return;workspace.style.setProperty('--preview-footer-height',Math.ceil(element.getBoundingClientRect().height)+'px');window.dispatchEvent(new Event('resize'));};
  const observer=new ResizeObserver(resize);observer.observe(element);resize();
  return()=>{observer.disconnect();workspace.style.removeProperty('--preview-footer-height');window.dispatchEvent(new Event('resize'));};
 },[]);
 return <footer ref={footer} className="ty-preview-approval" aria-label="Save new app"><div className="ty-preview-approval-summary">{children}</div><div className="ty-preview-approval-actions">{onDismiss&&<Button disabled={busy} onClick={onDismiss}>{dismissLabel}</Button>}<Button variant="primary" disabled={disabled||busy} onClick={onAction}>{busy?'Saving…':action}</Button></div></footer>;
}
