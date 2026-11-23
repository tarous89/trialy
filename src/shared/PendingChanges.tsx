import React,{useCallback,useContext,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Button} from './ui/Controls.js';
import './preview-approval.css';
import {InstallationPopup} from './DataAccessStep.js';
import {coordinatedRecheck} from './coordinated-recheck.js';
import type {WorkspaceRequestOptions} from './workspace-request.js';

/**
 * A6, B1: one approval footer for pending app changes, in every host (website, standalone app, ChatGPT, Claude).
 *
 * - The server keeps each pending change until it is resolved (no expiry, D10), so the footer comes back after
 *   leaving the app, signing out or switching device: the provider reads them with `list_pending_app_changes`.
 * - The page that shows a change registers it as the on-screen review (`useFooterReview`), with the exact
 *   approve and discard actions. Only a change that is on screen can be approved: nobody approves blind.
 * - Every other pending change is listed with Open and Discard, so it is never lost.
 *
 * Labels follow A6: Save / Discard for a new app before installation, Publish / Discard for an app revision,
 * Approve / Decline for an assistant's change. Changes made to records or platform content on an app page use
 * Save changes / Discard.
 */
export type PendingChange={previewId:string;digest:string;componentId:string|null;name:string|null;changeClass:'new'|'revision'|'assistant';status:'ready'|'preparing'|'needs_preparing';reason?:'app_changed'|'app_unavailable'|'access_changed';assistant?:string|null;review?:{title?:string;changes?:string[]}};
/** Approval screen: a review an assistant prepared outside an app (automation, workspace change, code lab, code run), waiting for the person. */
export type WaitingReview={source:'automation'|'workspace'|'code'|'run';reviewId:string;digest:string;kind:string;title:string;assistant?:string|null;expiresAt:string|null;approveWhere?:'here'|'website'};
export type FooterReview={previewId?:string;kind:'new'|'revision'|'assistant'|'content';name?:string|null;summary?:React.ReactNode;details?:string[];
 onAction:()=>Promise<void>|void;onDismiss:()=>Promise<void>|void;disabled?:boolean;busy?:boolean;actionLabel?:string;status?:PendingChange['status']};
export type Approve=(call:(name:string,args:any)=>Promise<any>,preview:{id:string;digest:string},label?:string)=>Promise<any|null>;
type Value={changes:PendingChange[];refresh:()=>void;review:FooterReview|null;setReview:(r:FooterReview|null)=>void;open?:(c:PendingChange)=>void;discard:(c:PendingChange)=>Promise<void>;approve:Approve;reviews:WaitingReview[];openReview?:(r:WaitingReview)=>void;declineReview:(r:WaitingReview)=>Promise<void>};
const Context=React.createContext<Value|null>(null);
export const PENDING_CHANGED='trialy:pending-changes';
/** Tell every footer in this page that pending changes were created, approved or discarded. */
export const pendingChanged=()=>{try{window.dispatchEvent(new Event(PENDING_CHANGED));}catch{/* no window in tests */}};

/** The review screen's calls: a saved or declined review leaves every footer on the page. */
export function withReviewRefresh<T extends (name:string,args:any)=>Promise<any>>(call:T):T{
 return (async(name:string,args:any)=>{const r=await call(name,args);if(['confirm_app_service_review','approve_waiting_review','decline_waiting_review'].includes(name))pendingChanged();return r;}) as T;
}
const ASSISTANT:Record<string,string>={chatgpt:'ChatGPT',claude:'Claude'};
export function footerLabels(kind:FooterReview['kind'],name?:string|null){
 const app=name?`“${name}”`:'this app';
 if(kind==='new')return {action:'Save app',dismiss:'Discard',title:`New app ${app} is not saved yet`};
 if(kind==='assistant')return {action:'Approve',dismiss:'Decline',title:`Changes to ${app} are waiting for your approval`};
 if(kind==='revision')return {action:'Publish',dismiss:'Discard',title:`Changes to ${app} are not published yet`};
 return {action:'Save changes',dismiss:'Discard',title:'Your changes are ready to save'};
}
const reasonText:Record<string,string>={app_changed:'The app changed since this was prepared. Ask your assistant to prepare it again, or discard it.',app_unavailable:'The app is no longer available. Discard this change.',access_changed:'Access to the app or its tables changed since this was prepared. Ask your assistant to prepare it again, or discard it.'};

export function PendingChangesProvider({children,call,workspaceId,onOpen,onOpenReview}:{children:React.ReactNode;call:(name:string,args:any,options?:WorkspaceRequestOptions)=>Promise<any>;workspaceId?:string|null;onOpen?:(c:PendingChange)=>void;onOpenReview?:(r:WaitingReview)=>void}){
 const [changes,setChanges]=useState<PendingChange[]>([]),[review,setReview]=useState<FooterReview|null>(null),[reviews,setReviews]=useState<WaitingReview[]>([]);
 const latest=useRef(0);
 const read=useCallback((background:boolean)=>{
  if(!workspaceId){setChanges([]);setReviews([]);return;}
  const n=++latest.current;
  // Automation reviews are optional (automations can be off, or the person may not manage them): a failed read lists none.
  const waiting=call('list_waiting_reviews',{workspaceId},{background}).then(r=>{if(n===latest.current)setReviews(Array.isArray(r)?r:[]);}).catch(()=>{if(n===latest.current)setReviews([]);});
  return Promise.all([waiting,call('list_pending_app_changes',{workspaceId},{background}).then(r=>{if(n===latest.current)setChanges(Array.isArray(r?.changes)?r.changes:[]);}).catch(()=>{/* The footer is additive; a failed read keeps the last list. */})]).then(()=>{});
 },[call,workspaceId]);
 const refresh=useCallback(()=>{void read(false);},[read]);
 useEffect(()=>{
  refresh();
  // Coming back to the tab is not the person's action: one quiet read per focus/visibility burst,
  // never the global progress bar. Creating, approving or discarding a change stays foreground.
  const returned=coordinatedRecheck(()=>read(true));
  const again=()=>{if(document.visibilityState!=='hidden')returned.request('return');};
  window.addEventListener(PENDING_CHANGED,refresh);window.addEventListener('focus',again);document.addEventListener('visibilitychange',again);
  return()=>{returned.dispose();window.removeEventListener(PENDING_CHANGED,refresh);window.removeEventListener('focus',again);document.removeEventListener('visibilitychange',again);};
 },[refresh,read]);
 const discard=useCallback(async(c:PendingChange)=>{await call('discard_workspace_preview',{workspaceId,previewId:c.previewId});pendingChanged();},[call,workspaceId]);
 const declineReview=useCallback(async(r:WaitingReview)=>{await call('decline_waiting_review',{workspaceId,source:r.source,reviewId:r.reviewId});pendingChanged();},[call,workspaceId]);
 const [popup,setPopup]=useState<{kind:'app'|'change';step:any;label:string;resolve:(choices:any|null)=>void}|null>(null);
 const approve=useCallback<Approve>((send,preview,label='Install')=>approveWithReview(send,preview,(kind,step)=>new Promise(resolve=>setPopup({kind,step,label,resolve}))),[]);
 const value=useMemo(()=>({changes,refresh,review,setReview,open:onOpen,discard,approve,reviews,openReview:onOpenReview,declineReview}),[changes,refresh,review,onOpen,discard,approve,reviews,onOpenReview,declineReview]);
 return <Context.Provider value={value}>{children}{popup&&<InstallationPopup kind={popup.kind} key={popup.step.digest} step={popup.step} actionLabel={popup.kind==='app'?'Install':popup.label}
  onCancel={()=>{popup.resolve(null);setPopup(null);}} onInstall={async choices=>{popup.resolve(choices);setPopup(null);}}/>}</Context.Provider>;
}

/**
 * I2, 3.4: approve an app change from the view. When the server answers that the change needs the installation popup
 * (a new app, or a change that affects access, table connections or automations), the popup opens with exactly what
 * the server returned; the approval is then sent again with the reviewed choices. Cancel resolves with null.
 */
export async function approveWithReview(call:(name:string,args:any)=>Promise<any>,preview:{id:string;digest:string},ask:(kind:'app'|'change',step:any)=>Promise<any|null>){
 const send=(installation?:any)=>call('approve_workspace_change',{previewId:preview.id,digest:preview.digest,confirmed:true,...(installation?{installation}:{})});
 const review=async(kind:'app'|'change',step:any)=>{const choices=await ask(kind,step);if(!choices)return null;const receipt=await send({...choices,stepDigest:step.digest});pendingChanged();return receipt;};
 // Read what the popup must show first, so one approval is sent, with the reviewed choices when there are any.
 let step:any;try{step=await call('read_app_installation',{previewId:preview.id});}catch{step=undefined;}
 if(step&&step.impact===undefined&&step.project)return review('app',step);
 if(step?.impact)return review('change',step.impact);
 try{return await send();}catch(e){
  // The app or its tables changed between the read and the approval: show what the server now requires.
  if((e as any)?.code!=='installation_required')throw e;
  let required:any;try{required=JSON.parse((e as Error).message).step;}catch{throw e;}
  return review(required?.kind==='change'?'change':'app',required);
 }
}
/** The provider's approval: the view's way to approve an app change, with the popup when needed. */
export function useApproveChange():Approve{
 const value=useContext(Context);
 return value?.approve??((call,preview)=>approveWithReview(call,preview,async()=>{throw Error('Review this change in TrialAgents before saving it.');}));
}

/** The page showing a change makes it the footer's on-screen review for as long as it is mounted. */
export function useFooterReview(review:FooterReview|null){
 const value=useContext(Context),set=value?.setReview;
 const current=useRef(review);current.current=review;
 // Actions are read through the ref so that a re-render of the page never re-registers or flickers the footer.
 const stable=useMemo(()=>review&&{...review,onAction:()=>current.current?.onAction(),onDismiss:()=>current.current?.onDismiss()},
  [review?.previewId,review?.kind,review?.name,review?.disabled,review?.busy,review?.status,review?.actionLabel,JSON.stringify(review?.details??null),typeof review?.summary==='string'?review?.summary:!!review?.summary]);
 useLayoutEffect(()=>{if(!set)return;set(stable);return()=>set(null);},[set,stable]);
 return !!value;
}

/** Rendered once by the shell, at the bottom of the main area. */
export function PendingChangesFooter(){
 const value=useContext(Context);
 const footer=useRef<HTMLElement>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[list,setList]=useState(false);
 // A change the assistant is still preparing is not ready for anyone to review; it appears once it is finalized.
 const review=value?.review??null,others=(value?.changes??[]).filter(c=>c.previewId!==review?.previewId&&c.status!=='preparing'),waiting=value?.reviews??[];
 const shown=!!review||others.length>0||waiting.length>0,count=others.length+waiting.length;
 useLayoutEffect(()=>{
  const element=footer.current,workspace=element?.closest<HTMLElement>('.ty-workspace');
  if(!shown||!element||!workspace)return;
  // 5.4: the footer's height is the platform's footer inset; the shared message sits above it (it lives outside the workspace element).
  const root=document.documentElement,resize=()=>{if(!element.getClientRects().length)return;const h=Math.ceil(element.getBoundingClientRect().height)+'px';workspace.style.setProperty('--preview-footer-height',h);root.style.setProperty('--preview-footer-height',h);window.dispatchEvent(new Event('resize'));};
  const observer=new ResizeObserver(resize);observer.observe(element);resize();
  return()=>{observer.disconnect();workspace.style.removeProperty('--preview-footer-height');root.style.removeProperty('--preview-footer-height');window.dispatchEvent(new Event('resize'));};
 },[shown]);
 useEffect(()=>{setError('');},[review?.previewId]);
 if(!value||!shown)return null;
 async function act(fn:()=>Promise<void>|void){setBusy(true);setError('');try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const more=count>0&&<div className="ty-pending-more">
  <button type="button" className="ty-pending-more-toggle" aria-expanded={list} onClick={()=>setList(!list)}>{review?`${count} more pending ${count===1?'change':'changes'}`:count===1?'1 pending change':`${count} pending changes`}</button>
  {list&&<ul aria-label="Pending changes">{others.map(c=>{const l=footerLabels(c.changeClass,c.name);return <li key={c.previewId}><span>{l.title}{c.assistant&&c.changeClass!=='new'?` · prepared by ${ASSISTANT[c.assistant]??c.assistant}`:''}{c.status==='needs_preparing'?' · needs preparing again':c.status==='preparing'?' · still being prepared':''}</span>
   <span className="ty-pending-actions">{value.open&&c.status!=='needs_preparing'&&<Button disabled={busy} onClick={()=>{setList(false);value.open!(c);}}>Open</Button>}<Button disabled={busy} onClick={()=>void act(()=>value.discard(c))}>{l.dismiss}</Button></span></li>;})}{waiting.map(r=><li key={r.source+':'+r.reviewId}><span>{r.title}{r.assistant?` · prepared by ${ASSISTANT[r.assistant]??r.assistant}`:''}</span>
   <span className="ty-pending-actions">{value.openReview&&<Button disabled={busy} onClick={()=>{setList(false);value.openReview!(r);}}>Open</Button>}<Button disabled={busy} onClick={()=>void act(()=>value.declineReview(r))}>Decline</Button></span></li>)}</ul>}
 </div>;
 if(!review){
  // Nothing on screen: say what is waiting and let the person open it to review. Approval needs the change on screen.
  if(!others.length){
   // Only assistant reviews outside apps: the review screen shows the exact details and its own Approve.
   const [r]=waiting;
   return <footer ref={footer} className="ty-preview-approval ty-pending-footer" aria-label="Waiting for your approval"><div className="ty-preview-approval-summary">{waiting.length===1?<><strong>{r.title} is waiting for your approval</strong>{r.assistant&&<p>Prepared by {ASSISTANT[r.assistant]??r.assistant}. Review the exact details before approving.</p>}</>:<strong>{waiting.length} reviews are waiting for your approval</strong>}{error&&<p role="alert">{error}</p>}{waiting.length>1&&more}</div>
    <div className="ty-preview-approval-actions">{waiting.length===1&&<><Button disabled={busy} onClick={()=>void act(()=>value.declineReview(r))}>Decline</Button>{value.openReview&&<Button variant="primary" disabled={busy} onClick={()=>value.openReview!(r)}>Review</Button>}</>}</div></footer>;
  }
  const [first]=others,l=footerLabels(first.changeClass,first.name);
  return <footer ref={footer} className="ty-preview-approval ty-pending-footer" aria-label="Pending changes"><div className="ty-preview-approval-summary">{others.length===1?<><strong>{l.title}</strong>{first.status==='needs_preparing'&&<p>{reasonText[first.reason??'app_changed']}</p>}</>:<strong>{others.length} app changes are waiting for you</strong>}{error&&<p role="alert">{error}</p>}{count>1&&more}</div>
   <div className="ty-preview-approval-actions">{others.length===1&&<>{<Button disabled={busy} onClick={()=>void act(()=>value.discard(first))}>{l.dismiss}</Button>}{value.open&&first.status!=='needs_preparing'&&<Button variant="primary" disabled={busy||first.status==='preparing'} onClick={()=>value.open!(first)}>Review</Button>}</>}</div></footer>;
 }
 const l=footerLabels(review.kind,review.name),stale=review.status==='needs_preparing',preparing=review.status==='preparing';
 return <footer ref={footer} className="ty-preview-approval ty-pending-footer" aria-label={l.title}><div className="ty-preview-approval-summary">
  <strong>{l.title}</strong>
  {stale?<p>{reasonText[(value.changes.find(c=>c.previewId===review.previewId)?.reason)??'app_changed']}</p>:preparing?<p>Still being prepared. You can review it when it is ready.</p>:review.summary&&<div>{review.summary}</div>}
  {!stale&&!!review.details?.length&&<details className="ty-pending-details"><summary>What changes</summary><ul>{review.details.map(d=><li key={d}>{d}</li>)}</ul></details>}
  {error&&<p role="alert">{error}</p>}{more}
 </div><div className="ty-preview-approval-actions">
  <Button disabled={busy||review.busy} onClick={()=>void act(review.onDismiss)}>{l.dismiss}</Button>
  {!stale&&<Button variant="primary" disabled={busy||review.busy||review.disabled||preparing} onClick={()=>void act(review.onAction)}>{busy||review.busy?'Saving…':review.actionLabel??l.action}</Button>}
 </div></footer>;
}

/** A change prepared on an app page (configuration, archive, records) shown in the footer instead of a dialog. */
export function ProposalReview({proposal,summary,busy,onAction,onDismiss}:{proposal:any;summary?:React.ReactNode;busy?:boolean;onAction:(approve:Approve)=>Promise<void>;onDismiss:()=>Promise<void>}){
 const approve=useApproveChange();
 const op=proposal.body??{},app=['save_component','create_tracker'].includes(op.kind);
 const kind:FooterReview['kind']=app?(op.componentId?(proposal.changeClass==='assistant'?'assistant':'revision'):'new'):'content';
 useFooterReview({previewId:proposal.id,kind,name:op.content?.name??null,summary,busy,onAction:()=>onAction(approve),onDismiss,details:proposal.appReview?.changes});
 return null;
}
