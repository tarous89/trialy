import React,{useContext,useEffect,useRef,useState} from 'react';
import {AppPlatform} from './AppPlatform.js';
import {SystemNotice} from './SystemNotice.js';
import type {WorkspaceRequestOptions} from './workspace-request.js';
type Call=(name:string,args:any,options?:WorkspaceRequestOptions)=>Promise<any>;
/** A newer published version of this installed catalog app, when updating changes only its code.
 * Website only for now: the embedded hosts have no update tools, so nothing is asked of them. */
export function useAppUpdate(component:any,call:Call){
 const platform=useContext(AppPlatform),website=!platform.readTemplateMedia&&!platform.useTemplate;
 const [offer,setOffer]=useState<any>(null);
 useEffect(()=>{
  setOffer(null);if(!website||!component?.id||component.format!=='frontend-js')return;let live=true;
  // Quiet: an app without an update, or a failed check, shows nothing and never delays the app.
  void call('read_app_update',{componentId:component.id},{background:true}).then(o=>{if(live&&o?.available&&o.canUpdate)setOffer(o);}).catch(()=>{});
  return()=>{live=false;};
 },[website,component?.id,component?.version]);
 return offer;
}
/** Review and confirm the update. Only the app's code changes; data, layout, access and automations stay. */
export function AppUpdateDialog({offer,call,onUpdated,onClose}:{offer:any;call:Call;onUpdated:(component:any,output?:any)=>void;onClose:()=>void}){
 const [review,setReview]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 const live=useRef(true),saved=useRef(false);useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 async function act(fn:()=>Promise<void>){if(busy)return;setBusy(true);setError('');try{await fn();}catch(e){if(live.current)setError((e as Error).message||'The update could not complete. Try again.');}finally{if(live.current)setBusy(false);}}
 useEffect(()=>{void act(async()=>{const r=await call('prepare_app_update',{componentId:offer.componentId,expectedVersion:offer.expectedVersion,toVersion:offer.toVersion,toDigest:offer.toDigest});if(live.current)setReview(r.preview);});},[]);
 const cancel=()=>act(async()=>{if(review&&!saved.current)await call('discard_workspace_preview',{previewId:review.id}).catch(()=>{});onClose();});
 const confirm=()=>act(async()=>{
  // A lost response is never a second save: once confirmed, only the reload is retried.
  if(!saved.current){await call('confirm_workspace_change',{previewId:review.id,digest:review.digest,confirmed:true});saved.current=true;}
  const r=await call('read_project_component',{componentId:offer.componentId,includeOutput:true});
  if(live.current){setDone(true);onUpdated(r.component,r.initialOutput);}
 });
 if(done)return <SystemNotice message={`${offer.name} updated to version ${offer.toVersion}.`} onDismiss={onClose}/>;
 return <div className="ty-content-overlay"><section className="ty-confirm-dialog" role="dialog" aria-modal="true" aria-label="Update app"><h2>Update {offer.name} to version {offer.toVersion}?</h2>
  <p>This replaces the app's code with the newer published version ({offer.fromVersion} to {offer.toVersion}). Your records, tables, layout, settings, access and automations stay as they are.</p>
  {error&&<p role="alert">{error}</p>}{!review&&!error&&<p role="status">Preparing the update…</p>}
  <div className="settings-actions"><button className="secondary" disabled={busy} onClick={()=>void cancel()}>{saved.current?'Close':'Cancel'}</button><button className="primary" disabled={busy||!review} onClick={()=>void confirm()}>{busy&&review?'Updating…':saved.current?'Reload app':'Update app'}</button></div>
 </section></div>;
}
