import {SavedRefreshNotice,savedViewUnavailable,type SavedRefreshPhase} from './SavedRefreshNotice.js';
import {AppUnavailable} from './AppUnavailable.js';
import type {WorkspaceRequestOptions} from './workspace-request.js';
import type {AppRoute} from './app-route.js';
import {AppPlatform,AppNavigation} from './AppPlatform.js';
import React,{useState,useRef,useEffect} from 'react';
import {FrontendCodeRuntime} from './FrontendCodeRuntime.js';
import {useFooterReview,pendingChanged,useApproveChange} from './PendingChanges.js';
import {EmbeddedNavigation} from './ui/PageNavigation.js';
type Call=(name:string,args:any,options?:WorkspaceRequestOptions)=>Promise<any>;
/** The footer's Save, Publish or Approve applies the visible app and its required new tables together (A6). */
export function TrackerDraft({preview,call,onSaved,onDiscard,onProposal,initialOutput}:{initialOutput?:any;preview:any;call:Call;onSaved:(component:any,output?:any,route?:AppRoute)=>void;onDiscard:()=>void;onProposal:(p:any)=>void}){
 const [busy,setBusy]=useState(false),[rendering,setRendering]=useState(true),[rendered,setRendered]=useState(false),[error,setError]=useState('');
 const invoke=(name:string,args:any={},options?:WorkspaceRequestOptions)=>call(name,{workspaceId:preview.workspaceId,...args},options);
 const platform=React.useContext(AppPlatform);
 const navigation=React.useContext(AppNavigation);
 const embedded=React.useContext(EmbeddedNavigation);
 const label=platform.enabled?'app':preview.body.content?.resourceKind==='visualization'?'dashboard':preview.body.content?.resourceKind==='form'?'form':'tracker';
 const activePreview=useRef(preview),savedReceipt=useRef<any>(null),saving=useRef(false),live=useRef(true);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const [savedPhase,setSavedPhase]=useState<SavedRefreshPhase>(null);
 const reviewReady=preview.reviewState==='ready';
 const revision=!!preview.body.componentId,stale=preview.previewStatus==='needs_preparing';
 const kind=(preview.changeClass??(revision?'revision':'new')) as 'new'|'revision'|'assistant';
 const approve=useApproveChange();
 // A6: the platform footer is the only place this change is approved, discarded or declined.
 // The footer appears once the change is on screen (or when it needs preparing again), as the first-save footer did:
 // appearing mid-render would resize the app frame under the person's first click.
 useFooterReview(savedReceipt.current||!(stale||reviewReady&&rendered)?null:{previewId:preview.id,kind,name:preview.body.content?.name??preview.body.setup?.name??null,
  status:stale?'needs_preparing':reviewReady?'ready':'preparing',busy,disabled:rendering||!rendered,
  summary:kind==='new'?`This ${label} is a preview. Save it to keep it.`:preview.appReview?.note??(kind==='assistant'?'Approving applies these changes for everyone who uses the app.':'Publishing applies this update for everyone who uses the app.'),
  details:revision?(preview.appReview?.changes??[]):undefined,onAction:save,onDismiss:discard});
 async function discard(){if(!reviewReady&&!stale)return;setBusy(true);try{await invoke('discard_workspace_preview',{previewId:activePreview.current.id,...(stale?{}:{digest:activePreview.current.digest})});if(activePreview.current.id!==preview.id)await invoke('discard_workspace_preview',{previewId:preview.id});pendingChanged();onDiscard();}catch(e){setError((e as Error).message);setBusy(false);}}
 async function save(){if(!reviewReady||saving.current||savedPhase==='unavailable')return;saving.current=true;setBusy(true);setError('');try{
  const p=activePreview.current;
  // I2, 3.4: a new app, or a change that affects access, connections or automations, opens the installation popup first.
  // Cancel keeps the preview and its footer.
  const receipt=savedReceipt.current??await approve((name,args)=>invoke(name,args),p,kind==='assistant'?'Approve':kind==='revision'?'Publish':'Install');if(!receipt)return;savedReceipt.current=receipt;pendingChanged();if(!live.current)return;setSavedPhase('refreshing');
  const result=await invoke('read_project_component',{componentId:receipt.id});
  if(p.id!==preview.id)await invoke('discard_workspace_preview',{previewId:preview.id}).catch(()=>{});
  const output=embedded?undefined:await invoke('run_component_frontend',{request:{componentId:result.component.id,expectedVersion:result.component.version,...(navigation?{route:navigation.route}:{}),event:{kind:'open'}}});
  if(live.current)onSaved(result.component,output,navigation?.route);
 }catch(e){if(!live.current)return;if(!savedReceipt.current)setError((e as Error).message);else setSavedPhase(savedViewUnavailable(e)?'unavailable':'failed');}finally{saving.current=false;if(live.current)setBusy(false);}}
 if(savedPhase==='unavailable')return <><SavedRefreshNotice phase={savedPhase}/><AppUnavailable onHome={onDiscard}/></>;
 return <section className="ty-tracker-preview"><SavedRefreshNotice phase={savedPhase} target="app" onRetry={()=>void save()}/>{!reviewReady&&<div role="status" className="ty-tracker-notice">Preparing app… Save will be available when the changes are ready.</div>}{error&&<p role="alert">{error}</p>}<div inert={!!savedPhase}><FrontendCodeRuntime active={!savedReceipt.current} initialOutput={initialOutput} previewId={preview.id} call={invoke} onProposal={onProposal} onHome={onDiscard} onBusyChange={setRendering} onRendered={()=>setRendered(true)}/></div></section>;
}

