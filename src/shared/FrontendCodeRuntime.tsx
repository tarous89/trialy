import {withWorkspaceActivity} from './WorkspaceActivity.js';
import {SavedRefreshNotice,savedViewUnavailable,type SavedRefreshPhase} from './SavedRefreshNotice.js';
import type {WorkspaceRequestOptions} from './workspace-request.js';
import {useWorkspaceView} from './WorkspaceView.js';
import {SystemNotice} from './SystemNotice.js';
import {parseAppUrl} from './app-route.js';
import {AppPlatform,AppNavigation} from './AppPlatform.js';
import {ConnectorReview} from './ConnectorsPanel.js';
import {mergeTrackerSnapshot,SNAPSHOT_TTL} from './tracker-cache.js';
import {FrontendReads} from './frontend-reads.js';
import {retryFrontendBusy} from './frontend-retry.js';
import {ChangeSummary} from './ChangeSummary.js';
import {EmbeddedNavigation} from './ui/PageNavigation.js';
import {TrackerRecordForm} from './TrackerRecordForm.js';
import React,{useEffect,useRef,useState} from 'react';
import {useAccessRecheck} from './useAccessRecheck.js';
import {AppUnavailable} from './AppUnavailable.js';
import {IntegrationDialog} from './IntegrationDialog.js';
import {DocumentUploadDialog} from './DocumentUploadDialog.js';
type Call=(name:string,args:Record<string,unknown>,options?:WorkspaceRequestOptions)=>Promise<any>;
const navigationRead=(event:any)=>event.kind==='open'||/^(tab:|next$|prev$|previous$|filter:|sort:|sort-field:|sort$|search$|query$|overview-next$|overview-previous$|overview-panel$)/.test(event.action??'');
export function FrontendCodeRuntime({active=true,component,previewId,initialOutput,call,onProposal,onUnavailable,onHome,onAccess,onLayout,onBusyChange,onRendered,onUpdated}:{active?:boolean;component?:any;previewId?:string;initialOutput?:any;call:Call;onProposal:(p:any)=>void;onUnavailable?:(message:string)=>void;onHome?:()=>void;onAccess?:()=>void;onLayout?:()=>void;onBusyChange?:(busy:boolean)=>void;onRendered?:()=>void;onUpdated?:(component:any)=>void}){
 const platform=React.useContext(AppPlatform),navigation=React.useContext(AppNavigation),navigationRef=useRef(navigation);navigationRef.current=navigation;
 const platformRef=useRef(platform);platformRef.current=platform;
 const [connectorReviews,setConnectorReviews]=useState<any[]>([]),[customDirty,setCustomDirty]=useState(false);
 const embedded=React.useContext(EmbeddedNavigation);
 const frame=useRef<HTMLIFrameElement>(null),output=useRef<any>(null),state=useRef<any>(null),busyRef=useRef(false),channel=useRef(crypto.randomUUID()),live=useRef(true),current=useRef(component);
 const [recordReview,setRecordReview]=useState<any>(null);
 const [detailsOpen,setDetailsOpen]=useState(false),[standard,setStandard]=useState(false),[ready,setReady]=useState(false),[height,setHeight]=useState(620),[adding,setAdding]=useState(component?.resource_kind==='form'),[footer,setFooter]=useState<any>(null);
 const [frameUrl,setFrameUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[proposal,setProposal]=useState<any>(null);
 const [reviewProposal,setReviewProposal]=useState(false);
 const [loadFailed,setLoadFailed]=useState(false);
 const [retryEvent,setRetryEvent]=useState<any>(null);
 const [schemaChanged,setSchemaChanged]=useState(false);
 const [savedPhase,setSavedPhase]=useState<SavedRefreshPhase>(null);
 const saveTask=useRef<Promise<boolean>|null>(null);
 const updateBanner=useRef<HTMLDivElement>(null);
 const [publishedUpdate,setPublishedUpdate]=useState(false),[confirmUpdate,setConfirmUpdate]=useState(false);
 const [,setViewRevision]=useState(0);
 const tab=output.current?.tracker?.config?.tabs?.[state.current?.tab];
 useWorkspaceView({view:'app',appId:component?.id??previewId,appName:component?.name,appVersion:component?.version,route:navigation?.route.path,section:state.current?.settings?'Settings':tab?.name,tableId:tab?.typeId,fields:tab?.columns?.map((c:any)=>({key:c.field,name:c.label??c.field}))},!loadFailed);
 const localEdits=!!footer||!!recordReview||!!proposal||customDirty;
 const localEditsRef=useRef(localEdits);localEditsRef.current=localEdits;
 const checking=useRef(false),eventQueue=useRef<any[]>([]),blocked=useRef(false),saveReceipt=useRef<any>(null),approvedAction=useRef<string|null>(null);
 const navigationReads=useRef(new FrontendReads());
 const requests=useRef(new AbortController());
 // Track each foreground waiter, including a click joining an optional prefetch.
 const readFrontend=(request:any,options:WorkspaceRequestOptions={})=>{
  const signal=options.signal??requests.current.signal;
  return withWorkspaceActivity(()=>navigationReads.current.run(request,request=>retryFrontendBusy(request,()=>call('run_component_frontend',{request},{background:true,signal}),()=>live.current&&!signal.aborted),!!output.current?.tracker),options);
 };
 function clearOutput(){cancelPrefetch();setSavedPhase(saveReceipt.current?.saved?'unavailable':null);setRecordReview(null);saveReceipt.current=null;approvedAction.current=null;setDetailsOpen(false);eventQueue.current=[];output.current=null;state.current=null;setFrameUrl('');setReady(false);setProposal(null);setFooter(null);setCustomDirty(false);blocked.current=false;navigationRef.current?.setDirty(false);}
 function revoke(){const saved=!!saveReceipt.current?.saved;clearOutput();setLoadFailed(true);if(!saved)onUnavailable?.('No app is available');}
 function viewRequest(c=current.current){return {componentId:c.id,expectedVersion:c.version,...(output.current?.viewId?{viewId:output.current.viewId}:{})};}
 function actionError(e:unknown){const status=(e as any)?.status;if(saveReceipt.current&&!saveReceipt.current.saved&&status>=400&&status<500)saveReceipt.current=null;setError(saveReceipt.current?.saved?'Your changes were saved, but the app could not reload them. You can retry loading the saved data.':(e as Error).message||'This action could not complete. Your work is still here.');}
 const unavailable=savedViewUnavailable;
 async function loadPublished(afterSave=false){
  if(!current.current)return false;
  const receipt=afterSave?saveReceipt.current:null;
  cancelPrefetch();busyRef.current=true;setBusy(true);
  try{
   const read=await call('read_project_component',{componentId:current.current.id}),next=read.component;
   const result=await readFrontend({componentId:next.id,expectedVersion:next.version,event:{kind:'open'},...(navigationRef.current?{route:navigationRef.current.route}:{})});
   if(!live.current||afterSave&&saveReceipt.current!==receipt)return false;
   current.current=next;output.current=mergeTrackerSnapshot(null,result);state.current=result.state;setStandard(!!result.tracker);setFrameUrl(result.frameUrl);setProposal(result.proposal);setConnectorReviews(result.connectorReviews??[]);setFooter(null);setRecordReview(null);setCustomDirty(false);saveReceipt.current=null;setSavedPhase(null);blocked.current=!!result.proposal;eventQueue.current=[];setPublishedUpdate(false);setConfirmUpdate(false);setReviewProposal(false);setError('');setRetryEvent(null);setLoadFailed(false);setSchemaChanged(false);send();prefetch(result);onUpdated?.(next);return true;
  }catch(e){if(afterSave)throw e;if(live.current){setConfirmUpdate(false);setSchemaChanged((e as any)?.code==='manifest_stale');if(unavailable(e)){revoke();}else {setLoadFailed(!output.current);setError((e as Error).message||'The latest version could not load. Your work is still here.');}}}
  finally{busyRef.current=false;if(live.current){setBusy(false);if(eventQueue.current.length&&!blocked.current)void run(eventQueue.current.shift());}}
 }
 useAccessRecheck((_reason,signal)=>{if(!current.current||checking.current||busyRef.current)return;checking.current=true;const c=current.current;return call('check_component_access',{componentId:c.id,...(output.current?.viewId?{viewId:output.current.viewId}:{})}).then(r=>{
  if(signal.aborted||!live.current||c!==current.current)return;
  if(r.version!==c.version)setPublishedUpdate(true);
 }).catch(e=>{if(!signal.aborted&&live.current&&c===current.current){if(unavailable(e)){revoke();}else if(e?.code==='app_view_expired')setPublishedUpdate(true);/* A temporary network failure must never remove the app. */}}).finally(()=>{checking.current=false;});},active&&!!component&&savedPhase!=='unavailable',component?.id);
 const prefetchTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),generation=useRef(0);
 function cancelPrefetch(){generation.current++;clearTimeout(prefetchTimer.current);}
 function prefetch(result:any){
  if((!current.current&&!previewId)||!result.tracker||result.proposal)return;
  clearTimeout(prefetchTimer.current);
  const captured=generation.current,c=current.current,model=result.tracker,st=structuredClone(result.state);
  const visible=model.config.tabs.map((t:any,i:number)=>t.visible!==false?i:-1).filter((i:number)=>i>=0);
  const candidates=visible.filter((i:number)=>i!==st.tab).sort((a:number,b:number)=>Math.abs(a-st.tab)-Math.abs(b-st.tab)).slice(0,2).map((i:number)=>({action:'tab:'+i,tab:i,offset:st.offsets?.[i]||0}));
  if(st.tab>=0){const page=model.pages.find((p:any)=>p.request.typeId===model.config.tabs[st.tab].typeId&&p.request.limit>0&&p.request.offset===(st.offsets?.[st.tab]||0));if(page&&page.request.offset+page.request.limit<page.result.total)candidates.unshift({action:'next',tab:st.tab,offset:page.request.offset+page.request.limit});}
  const needed=candidates.filter(({tab,offset}:{tab:number;offset:number})=>{const t=model.config.tabs[tab],limit=Math.min(model.config.pageSize||25,Math.max(1,Math.floor(480/t.columns.length))),filters=JSON.stringify(Object.entries(st.filters?.[tab]||{}).filter(([,v])=>v!=='').sort());const page=model.pages.find((p:any)=>p.request.typeId===t.typeId&&(p.request.q||'')===(st.queries?.[tab]||'')&&JSON.stringify(p.request.sort||null)===JSON.stringify(st.sorts?.[tab]?{field:st.sorts[tab],direction:st.sortDescending?'desc':'asc'}:null)&&p.request.limit===limit&&p.request.offset===offset&&JSON.stringify(Object.entries(p.request.filters||{}).sort())===filters&&Date.now()-p.receivedAt<SNAPSHOT_TTL);return !page||page.result.rows.some((r:any)=>t.columns.some((f:any)=>!model.cachedControls?.[f.fieldId+':'+r.id]));});
  if(!needed.length)return;
  prefetchTimer.current=setTimeout(async()=>{for(const {action} of needed){try{
   if(!live.current||busyRef.current||generation.current!==captured)return;
   const next=await readFrontend({...(c?viewRequest(c):{previewId}),...(navigationRef.current?{route:navigationRef.current.route}:{}),state:st,event:{kind:'click',action}},{background:true});
   if(!live.current||generation.current!==captured||busyRef.current||!output.current||next.accessVersion!==output.current.accessVersion)return;
   const merged=mergeTrackerSnapshot(output.current,next);output.current={...output.current,tracker:merged.tracker};
   frame.current?.contentWindow?.postMessage({kind:'trialy.cache',channel:channel.current,tracker:merged.tracker},'*');
  }catch{/* Optional prefetch does not replace the view. */}}},150);
 }
 const send=()=>{if(output.current)frame.current?.contentWindow?.postMessage({kind:'trialy.render',channel:channel.current,html:output.current.html,css:output.current.css,controls:output.current.controls,connected:output.current.connected,state:output.current.state,tracker:output.current.tracker,navigationOnly:embedded,appLinks:platformRef.current.enabled,appOrigin:platformRef.current.origin,linkContext:navigationRef.current?.location??parseAppUrl(location.pathname+location.search)??(component?{appId:component.id,workspaceId:component.workspace_id,source:'component'}:null)},'*');};
 useEffect(()=>{if(ready)send();},[platform.enabled,platform.origin]);
 async function run(event:any={kind:'open'}){
  if(event.action==='tracker:layout'){onLayout?.();return;}if(event.action==='tracker:access'){onAccess?.();return;}
  if(blocked.current)return;if(busyRef.current){if(/^tab:/.test(event.action||''))eventQueue.current=eventQueue.current.filter(e=>!/^tab:/.test(e.action||''));if(eventQueue.current.length<50)eventQueue.current.push(event);return;}cancelPrefetch();busyRef.current=true;setBusy(true);onBusyChange?.(true);setError('');if(event.action==='bound-batch')frame.current?.contentWindow?.postMessage({kind:'trialy.save-start',channel:channel.current},'*');
  try{
   const c=current.current,explicitApproval=approvedAction.current===event.action;approvedAction.current=null;
   if(['tracker:create'].includes(event.action)||/^tracker:(duplicate|delete):/.test(event.action)){
    if(!c||!output.current?.tracker?.writable)throw Error('This tracker is read-only.');
    const model=output.current.tracker,tab=model.config.tabs[state.current?.newRow?.tab??state.current?.tab];
    if(!tab)throw Error('Select a table first.');
    let p:any;
    if(event.action==='tracker:create'){
     const raw=JSON.parse(event.form.data),data:Record<string,unknown>={};
     for(const f of tab.columns.filter((f:any)=>f.editable)){
      let v=raw[f.field];if(v===undefined||v==='')continue;
      if(f.multiple){v=String(v).split('\n').filter(Boolean);if(['number','money'].includes(f.kind))v=v.map(Number);}
      else if(['number','money'].includes(f.kind))v=Number(v);
      data[f.field]=v;
     }
     p=await call('prepare_workspace_change',{operation:{kind:'apply_component_records',...viewRequest(c),changes:[{kind:'create_record',typeId:tab.typeId,data}]}});
    }else{
     const recordId=event.action.split(':')[2],row=model.pages.filter((p:any)=>p.request.typeId===tab.typeId).flatMap((p:any)=>p.result.rows).find((r:any)=>r.id===recordId);
     if(!row)throw Error('Record unavailable; reopen the table.');
     if(event.action.startsWith('tracker:delete:'))p=await call('prepare_change',{operation:{kind:'database_changes',typeId:tab.typeId,updates:[],deletions:[{recordId,expectedVersion:row.version}]}});
     else{
      const data=Object.fromEntries(tab.columns.filter((f:any)=>f.editable&&Object.hasOwn(row.data,f.field)).map((f:any)=>[f.field,row.data[f.field]]));
      p=await call('prepare_workspace_change',{operation:{kind:'apply_component_records',...viewRequest(c),changes:[{kind:'create_record',typeId:tab.typeId,data}]}});
     }
    }
    if(event.action==='tracker:create'&&explicitApproval){saveReceipt.current={proposal:p};await finishSave();}
    else setRecordReview({proposal:p,deletion:event.action.startsWith('tracker:delete:')});
    return;
   }
   const request:any={...(previewId?{previewId}:viewRequest(c)),state:state.current,event,...(navigationRef.current?{route:navigationRef.current.route}:{})};
   let result;
   try{result=await readFrontend(request);}catch(e){
    // Renew only navigation reads. Never replay a write or discard a local draft.
    if(!['app_view_expired','app_view_incompatible'].includes((e as any)?.code)||localEditsRef.current||!c||!(navigationRead(event)))throw e;
    const {viewId,...renewed}=request;result=await readFrontend(renewed);
   }
   setRetryEvent(null);
   if(!live.current)return;
   // A completed tracker cell edit or explicit app action approves the visible edits. The server still validates a precise proposal and its digest before committing.
   if(result.proposal&&explicitApproval&&(event.action==='bound-batch'||event.action==='save-layout'&&output.current?.tracker)){
    const p=result.proposal;saveReceipt.current={proposal:p};
    await finishSave();return;
   }
   // A proposal has not changed persisted data yet. Keep the user's submitted
   // fields visible instead of rendering the pre-save database values over them.
   if(result.proposal){setProposal(result.proposal);setReviewProposal(true);blocked.current=true;eventQueue.current=[];return;}
   result=mergeTrackerSnapshot(output.current,result);output.current=result;state.current=result.state;setStandard(!!result.tracker);setFrameUrl(result.frameUrl);setProposal(result.proposal);setConnectorReviews(result.connectorReviews??[]);setCustomDirty(false);setLoadFailed(false);setSchemaChanged(false);
   if(result.proposal){blocked.current=true;eventQueue.current=[];}send();prefetch(result);
  }catch(e){if(live.current){setSchemaChanged((e as any)?.code==='manifest_stale');if(navigationRead(event)){
   if(unavailable(e)){clearOutput();setLoadFailed(true);onUnavailable?.('No app is available');}
   else if(!output.current&&current.current&&(e as any)?.code!=='runtime_busy')await loadPublished();
   else {setLoadFailed(!output.current);if(['app_view_expired','component_changed','app_view_incompatible'].includes((e as any)?.code))setPublishedUpdate(true);else {actionError(e);setRetryEvent(event);}}
  }else {actionError(e);if(event.action==='bound-batch'&&!saveReceipt.current)setRetryEvent(event);}}}finally{busyRef.current=false;onBusyChange?.(false);if(live.current){setBusy(false);frame.current?.contentWindow?.postMessage({kind:'trialy.save-idle',channel:channel.current,blocked:!!saveReceipt.current||!!proposal},'*');if(eventQueue.current.length&&!blocked.current)void run(eventQueue.current.shift());}}
 }
 function finishSave(){
  if(saveTask.current)return saveTask.current;
  const task=completeSave().finally(()=>{if(saveTask.current===task)saveTask.current=null;});saveTask.current=task;return task;
 }
 async function completeSave(){
  cancelPrefetch();
  const receipt=saveReceipt.current,p=receipt.proposal;
  if(!receipt.saved){await call(receipt.deletion?'commit_change':'confirm_workspace_change',{previewId:p.id,digest:p.digest,confirmed:true});receipt.saved=true;}
  if(!live.current)return false;
  if(saveReceipt.current!==receipt){setSavedPhase('unavailable');return false;}
  // Acknowledged writes are complete. Freeze the retained view until an
  // authorized reload succeeds; neither retries nor old frame events may resave.
  setSavedPhase('refreshing');setFooter(null);setRecordReview(null);setProposal(null);setReviewProposal(false);setCustomDirty(false);setRetryEvent(null);setError('');blocked.current=true;eventQueue.current=[];approvedAction.current=null;navigationRef.current?.setDirty(false);
  frame.current?.contentWindow?.postMessage({kind:'trialy.save-start',channel:channel.current},'*');
  try{
   if(p.body?.kind==='save_component'||receipt.reloadLatest){if(!await loadPublished(true))return false;}
   else{
    receipt.reloadRequest??={...viewRequest(),...(navigationRef.current?{route:navigationRef.current.route}:{}),state:{...state.current,settings:false,layoutDraft:null,detail:null,newRow:null},event:{kind:'open'}};
    let result;
    try{result=await readFrontend(receipt.reloadRequest);}catch(e){
     // Renew an expired read lease without replaying the acknowledged action or
     // changing the loaded app version. Other failures retain the retry notice.
     if(!receipt.reloadRequest.viewId||!['app_view_expired','app_view_incompatible'].includes((e as any)?.code))throw e;
     const {viewId,...renewed}=receipt.reloadRequest;receipt.reloadRequest=renewed;
     result=await readFrontend(renewed);
    }
    if(!live.current||saveReceipt.current!==receipt)return false;
    result=mergeTrackerSnapshot(null,result);output.current=result;state.current=result.state;setFrameUrl(result.frameUrl);setSchemaChanged(false);send();prefetch(result);
   }
  }catch(e){
   if(!live.current||saveReceipt.current!==receipt)return false;
   if(unavailable(e))revoke();else {setSavedPhase('failed');setSchemaChanged((e as any)?.code==='manifest_stale');}
   return false;
  }
  setSavedPhase(null);setAdding(false);blocked.current=false;saveReceipt.current=null;frame.current?.contentWindow?.postMessage({kind:'trialy.save-idle',channel:channel.current,blocked:false},'*');return true;
 }
 async function retrySaved(latest=false){if(busyRef.current)return;if(latest&&saveReceipt.current?.saved)saveReceipt.current.reloadLatest=true;busyRef.current=true;setBusy(true);try{await finishSave();}catch(e){actionError(e);}finally{busyRef.current=false;if(live.current)setBusy(false);}}
 useEffect(()=>{live.current=true;if(requests.current.signal.aborted)requests.current=new AbortController();if(initialOutput){output.current=mergeTrackerSnapshot(null,initialOutput);state.current=initialOutput.state;setStandard(!!initialOutput.tracker);setFrameUrl(initialOutput.frameUrl);setProposal(initialOutput.proposal);onBusyChange?.(false);prefetch(output.current);}else void run();return()=>{live.current=false;cancelPrefetch();requests.current.abort();};},[]);
 const [integration,setIntegration]=useState<{role:string}|null>(null);
 const [upload,setUpload]=useState<{context:string}|null>(null);
 const routeKey=JSON.stringify([navigation?.route,navigation?.reset]),lastRoute=useRef(routeKey),lastReset=useRef(navigation?.reset);
 useEffect(()=>{if(lastRoute.current!==routeKey){lastRoute.current=routeKey;if(lastReset.current!==navigation?.reset){lastReset.current=navigation?.reset;state.current=null;blocked.current=false;setProposal(null);setFooter(null);setRecordReview(null);}setCustomDirty(false);void run();}},[routeKey]);
 useEffect(()=>{navigation?.setDirty(localEdits);return()=>navigation?.setDirty(false);},[localEdits,navigation?.setDirty]);
 useEffect(()=>{if(component&&component!==current.current){current.current=component;void run();}},[component]);
 useEffect(()=>{const receive=(e:MessageEvent)=>{if(e.source!==frame.current?.contentWindow)return;if(e.data?.kind==='trialy.ready'){setReady(true);send();}
  else if(e.data.channel===channel.current){
   if(saveReceipt.current?.saved&&!['trialy.rendered','trialy.resize'].includes(e.data.kind))return;
   if(e.data.kind==='trialy.link'&&typeof e.data.href==='string')navigationRef.current?.navigate(e.data.href);
   else if(e.data.kind==='trialy.integration'&&typeof e.data.role==='string'&&current.current?.id)setIntegration({role:e.data.role});
   else if(e.data.kind==='trialy.document'&&e.data.action==='upload'&&current.current?.id&&!busyRef.current)setUpload({context:String(e.data.context??'').slice(0,200)});
   else if(e.data.kind==='trialy.dirty'){if(e.data.dirty)navigationRef.current?.setDirty(true);setCustomDirty(!!e.data.dirty);}
   else if(e.data.kind==='trialy.approve'&&output.current?.tracker&&['bound-batch','tracker:create','save-layout'].includes(e.data.action))approvedAction.current=e.data.action;
   else if(e.data.kind==='trialy.notice')setError(e.data.message);
   else if(e.data.kind==='trialy.rendered')onRendered?.();
   else if(e.data.kind==='trialy.footer')setFooter(e.data.footer);
   else if(e.data.kind==='trialy.state'){const old=state.current,next=e.data.state;state.current=next;if(old?.tab!==next?.tab||old?.settings!==next?.settings)setViewRevision(n=>n+1);setDetailsOpen(!!next?.detail);if(output.current&&(old?.tab!==next?.tab||JSON.stringify(old?.offsets)!==JSON.stringify(next?.offsets)||JSON.stringify(old?.filters)!==JSON.stringify(next?.filters))){cancelPrefetch();prefetch({...output.current,state:next});}}
   else if(e.data.kind==='trialy.resize'&&!output.current?.tracker&&Number.isFinite(e.data.height))setHeight(Math.max(200,Math.min(20000,e.data.height)));
   else if(e.data.kind==='trialy.event'&&!proposal){state.current=e.data.state??state.current;void run(e.data.event);}
  }
 };window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[proposal]);
 useEffect(()=>{if(!detailsOpen)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[detailsOpen]);
 useEffect(()=>{const banner=updateBanner.current,workspace=banner?.closest<HTMLElement>('.ty-workspace');if(!banner||!workspace)return;const resize=()=>{workspace.style.setProperty('--ty-update-space',Math.ceil(banner.getBoundingClientRect().height+16)+'px');if(standard&&frame.current)setHeight(Math.max(200,window.innerHeight-frame.current.getBoundingClientRect().top));};resize();const observer=new ResizeObserver(resize);observer.observe(banner);return()=>{observer.disconnect();workspace.style.removeProperty('--ty-update-space');};},[publishedUpdate,standard]);
 useEffect(()=>{if(!standard||!frame.current)return;const size=()=>{const top=frame.current?.getBoundingClientRect().top??72,workspace=frame.current?.closest<HTMLElement>('.ty-workspace'),review=workspace?.querySelector<HTMLElement>('.ty-preview-approval:not([hidden] *)'),bottom=review?review.getBoundingClientRect().top:window.innerHeight;setHeight(Math.max(200,bottom-top));};size();window.addEventListener('resize',size);const observer=new ResizeObserver(size);observer.observe(document.documentElement);return()=>{window.removeEventListener('resize',size);observer.disconnect();};},[standard,frameUrl,ready,adding,publishedUpdate,savedPhase]);
 useEffect(()=>{if(!frameUrl||ready)return;const timer=setTimeout(()=>setLoadFailed(true),8000);return()=>clearTimeout(timer);},[frameUrl,ready]);
 const retryLoad=()=>{if(saveReceipt.current?.saved){void retrySaved();return;}setLoadFailed(false);if(frameUrl&&!ready&&frame.current){frame.current.src=frameUrl;}else void (current.current?loadPublished():run());};
 if(loadFailed&&!ready&&!frameUrl)return <><SavedRefreshNotice phase={savedPhase}/><AppUnavailable onHome={onHome} onRetry={savedPhase==='unavailable'?undefined:retryLoad} reason={savedPhase==='unavailable'?'missing':schemaChanged?'schema':'load'}/></>;
 return <section className={`ty-tracker-surface ${standard?'ty-tracker--standard':''} ${detailsOpen?'ty-tracker--details':''}`} aria-label={platform.enabled?"App":"Tracker"}>{integration&&current.current&&<IntegrationDialog call={call} appId={current.current.id} role={integration.role} onClose={()=>setIntegration(null)} onChanged={()=>void loadPublished()}/>}
 {upload&&current.current&&<DocumentUploadDialog call={call} onClose={()=>setUpload(null)} onSaved={(versionId)=>{const context=upload.context;setUpload(null);void run({kind:'change',action:'document:uploaded'+(context?':'+context:''),value:versionId,form:{}});}}/>}
 {schemaChanged&&ready&&<div role="status">The saved app is still here. Its connected fields changed and need review.</div>}
 {error&&<SystemNotice error message={error} onDismiss={()=>setError('')}/>}{retryEvent&&<div className="ty-actions"><button className="ty-button" disabled={busy} onClick={()=>{if(retryEvent.action==='bound-batch')approvedAction.current='bound-batch';void run(retryEvent);}}>{retryEvent.action==='bound-batch'?'Retry save':'Retry loading'}</button></div>}{saveReceipt.current&&!saveReceipt.current.saved&&!busy&&<div className="ty-runtime-recovery"><button onClick={()=>void retrySaved()}>Retry save</button></div>}
 {!adding&&<SavedRefreshNotice phase={savedPhase} onRetry={()=>void retrySaved()}/>}
 {publishedUpdate&&<div ref={updateBanner} className="ty-app-update" role="status"><span>This app has been updated. Refresh when you’re ready.</span><button disabled={busy} onClick={()=>saveReceipt.current?.saved?void retrySaved(true):localEditsRef.current?setConfirmUpdate(true):void loadPublished()}>Refresh to latest version</button></div>}
 {confirmUpdate&&<div className="ty-content-overlay"><section className="ty-confirm-dialog" role="alertdialog" aria-modal="true" aria-label="Load published update"><h2>Discard your unsaved edits?</h2><p>Your local edits will be discarded when the published update loads.</p><button onClick={()=>setConfirmUpdate(false)}>Keep editing</button><button disabled={busy} onClick={()=>void loadPublished()}>Discard edits and load update</button></section></div>}
 {!standard&&ready&&<div className="ty-actions"><button disabled={busy||!!proposal} onClick={()=>saveReceipt.current?.saved?void retrySaved(true):current.current?(localEditsRef.current?setConfirmUpdate(true):void loadPublished()):void run()}>Refresh</button></div>}
 {adding&&<div className="ty-record-entry"><SavedRefreshNotice phase={savedPhase} onRetry={()=>void retrySaved()}/><div inert={!!savedPhase}><TrackerRecordForm initialTypeId={output.current?.tracker?.config.tabs[state.current?.tab]?.typeId} component={{...current.current,viewId:output.current?.viewId}} call={call} onPreview={async p=>{try{if(saveReceipt.current)await call('discard_workspace_preview',{previewId:p.id});else saveReceipt.current={proposal:p};if(await finishSave())setAdding(false);setError('');}catch(e){actionError(e);throw e;}}} onClose={()=>setAdding(false)}/></div></div>}
 {recordReview&&<div className="ty-content-overlay"><section className="ty-confirm-dialog" role="dialog" aria-modal="true" aria-label="Review record change"><h2>{recordReview.deletion?'Delete record?':'Duplicate record?'}</h2><p>{recordReview.deletion?'Remove this record from active tables. Its history is retained.':'Create a new record with these values.'}</p><ChangeSummary value={recordReview.proposal.summary??recordReview.proposal.body}/><button className="ty-button" disabled={busy||!!saveReceipt.current?.saved} onClick={async()=>{setBusy(true);try{await call(recordReview.deletion?'discard_preview':'discard_workspace_preview',{previewId:recordReview.proposal.id});saveReceipt.current=null;setRecordReview(null);setError('');}catch(e){actionError(e);}finally{setBusy(false);}}}>Cancel</button><button className="ty-button ty-button--primary" disabled={busy} onClick={async()=>{setBusy(true);try{saveReceipt.current??={proposal:recordReview.proposal,deletion:recordReview.deletion};await finishSave();}catch(e){actionError(e);}finally{setBusy(false);}}}>{recordReview.deletion?'Delete record':'Duplicate record'}</button></section></div>}
 {connectorReviews[0]&&embedded?<div className="ty-actions"><a className="ty-button ty-button--primary" href={connectorReviews[0].reviewUrl} target="_blank" rel="noopener noreferrer">Review request in TrialAgents</a></div>:connectorReviews[0]&&<ConnectorReview reviewId={connectorReviews[0].reviewId} call={call} onClose={()=>setConnectorReviews(r=>r.slice(1))} onConfirmed={result=>{setConnectorReviews(r=>r.slice(1));void run({kind:'click',action:'connector:completed',form:{result:JSON.stringify(result)}});}}/>}
 {reviewProposal&&proposal&&<div className="ty-content-overlay"><section className="ty-confirm-dialog" role="dialog" aria-modal="true" aria-label="Review app changes"><h2>Review changes</h2><ChangeSummary value={proposal.summary??proposal.body}/><button disabled={busy} onClick={async()=>{try{await call('discard_workspace_preview',{previewId:proposal.id});setProposal(null);setReviewProposal(false);blocked.current=false;}catch(e){actionError(e);}}}>Keep editing</button><button disabled={busy} onClick={async()=>{setBusy(true);try{saveReceipt.current??={proposal};await finishSave();setError('');}catch(e){setReviewProposal(false);actionError(e);}finally{setBusy(false);}}}>Save changes</button></section></div>}
 {!ready&&(loadFailed?<div role="status">The app is taking longer to load. <button onClick={retryLoad}>Retry loading</button></div>:<div className="ty-runtime-loading" aria-busy="true" aria-label="Loading app"/>)}
 {frameUrl&&<iframe inert={adding||!!recordReview||!!savedPhase} ref={frame} title="Saved frontend code" sandbox={platform.enabled?"allow-scripts allow-popups allow-popups-to-escape-sandbox":"allow-scripts"} referrerPolicy="no-referrer" src={platform.frameDocument?undefined:frameUrl} srcDoc={platform.frameDocument} onLoad={send} style={{width:'100%',height:detailsOpen?'100%':height+'px',border:0,display:'block'}}/>}
 </section>;
}

