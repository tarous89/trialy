import {mergeTrackerSnapshot,SNAPSHOT_TTL} from './tracker-cache.js';
import {ChangeSummary} from './ChangeSummary.js';
import {EmbeddedNavigation} from './ui/PageNavigation.js';
import {TrackerRecordForm} from './TrackerRecordForm.js';
import {ActionFooter} from './ActionFooter.js';
import React,{useEffect,useRef,useState} from 'react';
import {useAccessRecheck} from './useAccessRecheck.js';
type Call=(name:string,args:Record<string,unknown>)=>Promise<any>;
export function FrontendCodeRuntime({component,previewId,initialOutput,call,onProposal,onUnavailable,onAccess,onLayout,onBusyChange,onRendered,onUpdated}:{component?:any;previewId?:string;initialOutput?:any;call:Call;onProposal:(p:any)=>void;onUnavailable?:(message:string)=>void;onAccess?:()=>void;onLayout?:()=>void;onBusyChange?:(busy:boolean)=>void;onRendered?:()=>void;onUpdated?:(component:any)=>void}){
 const embedded=React.useContext(EmbeddedNavigation);
 const frame=useRef<HTMLIFrameElement>(null),output=useRef<any>(null),state=useRef<any>(null),busyRef=useRef(false),channel=useRef(crypto.randomUUID()),live=useRef(true),current=useRef(component);
 const [recordReview,setRecordReview]=useState<any>(null);
 const [detailsOpen,setDetailsOpen]=useState(false),[standard,setStandard]=useState(false),[ready,setReady]=useState(false),[height,setHeight]=useState(620),[adding,setAdding]=useState(component?.resource_kind==='form'),[footer,setFooter]=useState<any>(null);
 const [frameUrl,setFrameUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[proposal,setProposal]=useState<any>(null);
 const checking=useRef(false),eventQueue=useRef<any[]>([]),blocked=useRef(false),saveReceipt=useRef<any>(null),approvedAction=useRef<string|null>(null);
 function clearOutput(){cancelPrefetch();setRecordReview(null);saveReceipt.current=null;approvedAction.current=null;setDetailsOpen(false);eventQueue.current=[];output.current=null;state.current=null;setFrameUrl('');setReady(false);setProposal(null);setFooter(null);}
 useAccessRecheck(()=>{if(!current.current||checking.current||busyRef.current)return;checking.current=true;const c=current.current;void call('check_component_access',{componentId:c.id}).then(r=>{if(output.current?.accessVersion!==undefined&&r.accessVersion!==output.current.accessVersion)throw Error('Access changed. Reopen this tool to load permitted data.');if(r.version!==current.current.version)throw Error('Interface changed; reopen it to review the current revision');}).catch(e=>{if(live.current){clearOutput();setError((e as Error).message);onUnavailable?.((e as Error).message);}}).finally(()=>{checking.current=false;});},!!component);
 const prefetchTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),generation=useRef(0);
 function cancelPrefetch(){generation.current++;clearTimeout(prefetchTimer.current);}
 function prefetch(result:any){
  if((!current.current&&!previewId)||!result.tracker||result.proposal)return;
  clearTimeout(prefetchTimer.current);
  const captured=generation.current,c=current.current,model=result.tracker,st=structuredClone(result.state);
  const visible=model.config.tabs.map((t:any,i:number)=>t.visible!==false?i:-1).filter((i:number)=>i>=0);
  const candidates=visible.filter((i:number)=>i!==st.tab).sort((a:number,b:number)=>Math.abs(a-st.tab)-Math.abs(b-st.tab)).slice(0,2).map((i:number)=>({action:'tab:'+i,tab:i,offset:st.offsets?.[i]||0}));
  if(st.tab>=0){const page=model.pages.find((p:any)=>p.request.typeId===model.config.tabs[st.tab].typeId&&p.request.limit>0&&p.request.offset===(st.offsets?.[st.tab]||0));if(page&&page.request.offset+page.request.limit<page.result.total)candidates.unshift({action:'next',tab:st.tab,offset:page.request.offset+page.request.limit});}
  const needed=candidates.filter(({tab,offset}:{tab:number;offset:number})=>{const t=model.config.tabs[tab],limit=Math.min(model.config.pageSize||25,Math.max(1,Math.floor(480/t.columns.length))),filters=JSON.stringify(Object.entries(st.filters?.[tab]||{}).filter(([,v])=>v!=='').sort());const page=model.pages.find((p:any)=>p.request.typeId===t.typeId&&p.request.limit===limit&&p.request.offset===offset&&JSON.stringify(Object.entries(p.request.filters||{}).sort())===filters&&Date.now()-p.receivedAt<SNAPSHOT_TTL);return !page||page.result.rows.some((r:any)=>t.columns.some((f:any)=>!model.cachedControls?.[f.fieldId+':'+r.id]));});
  if(!needed.length)return;
  prefetchTimer.current=setTimeout(async()=>{for(const {action} of needed){try{
   if(!live.current||busyRef.current||generation.current!==captured)return;
   const next=await call('run_component_frontend',{request:{...(c?{componentId:c.id,expectedVersion:c.version}:{previewId}),state:st,event:{kind:'click',action}}});
   if(!live.current||generation.current!==captured||busyRef.current||!output.current||next.accessVersion!==output.current.accessVersion)return;
   const merged=mergeTrackerSnapshot(output.current,next);output.current={...output.current,tracker:merged.tracker};
   frame.current?.contentWindow?.postMessage({kind:'trialy.cache',channel:channel.current,tracker:merged.tracker},'*');
  }catch{/* Optional prefetch does not replace the view. */}}},150);
 }
 const send=()=>{if(output.current)frame.current?.contentWindow?.postMessage({kind:'trialy.render',channel:channel.current,html:output.current.html,css:output.current.css,controls:output.current.controls,connected:output.current.connected,state:output.current.state,tracker:output.current.tracker,navigationOnly:embedded},'*');};
 const frameAction=(action:string)=>{approvedAction.current=action==='save-edits'?'bound-batch':action==='save-layout'?'save-layout':null;frame.current?.contentWindow?.postMessage({kind:'trialy.action',channel:channel.current,action},'*');};
 async function run(event:any={kind:'open'}){
  if(event.action==='tracker:layout'){onLayout?.();return;}if(event.action==='tracker:access'){onAccess?.();return;}
  if(blocked.current)return;if(busyRef.current){if(/^tab:/.test(event.action||''))eventQueue.current=eventQueue.current.filter(e=>!/^tab:/.test(e.action||''));if(eventQueue.current.length<50)eventQueue.current.push(event);return;}cancelPrefetch();busyRef.current=true;setBusy(true);onBusyChange?.(true);setError('');
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
     p=await call('prepare_workspace_change',{operation:{kind:'apply_component_records',componentId:c.id,expectedVersion:c.version,changes:[{kind:'create_record',typeId:tab.typeId,data}]}});
    }else{
     const recordId=event.action.split(':')[2],row=model.pages.filter((p:any)=>p.request.typeId===tab.typeId).flatMap((p:any)=>p.result.rows).find((r:any)=>r.id===recordId);
     if(!row)throw Error('Record unavailable; reopen the table.');
     if(event.action.startsWith('tracker:delete:'))p=await call('prepare_change',{operation:{kind:'database_changes',typeId:tab.typeId,updates:[],deletions:[{recordId,expectedVersion:row.version}]}});
     else{
      const data=Object.fromEntries(tab.columns.filter((f:any)=>f.editable&&Object.hasOwn(row.data,f.field)).map((f:any)=>[f.field,row.data[f.field]]));
      p=await call('prepare_workspace_change',{operation:{kind:'apply_component_records',componentId:c.id,expectedVersion:c.version,changes:[{kind:'create_record',typeId:tab.typeId,data}]}});
     }
    }
    if(event.action==='tracker:create'&&explicitApproval){saveReceipt.current={proposal:p};await finishSave();}
    else setRecordReview({proposal:p,deletion:event.action.startsWith('tracker:delete:')});
    return;
   }
   let result=await call('run_component_frontend',{request:{...(previewId?{previewId}:{componentId:c.id,expectedVersion:c.version}),state:state.current,event}});
   if(!live.current)return;
   // The footer click approves the visible edits. The server still validates a precise proposal and its digest before committing.
   if(result.proposal&&explicitApproval&&(event.action==='bound-batch'||event.action==='save-layout'&&output.current?.tracker)){
    const p=result.proposal;saveReceipt.current={proposal:p};
    await finishSave();return;
   }
   result=mergeTrackerSnapshot(output.current,result);output.current=result;state.current=result.state;setStandard(!!result.tracker);setFrameUrl(result.frameUrl);setProposal(result.proposal);
   if(result.proposal){blocked.current=true;eventQueue.current=[];}send();prefetch(result);
  }catch(e){if(live.current)setError((e as Error).message);}finally{busyRef.current=false;onBusyChange?.(false);if(live.current){setBusy(false);if(eventQueue.current.length&&!blocked.current)void run(eventQueue.current.shift());}}
 }
 async function finishSave(){
  cancelPrefetch();
  const receipt=saveReceipt.current,p=receipt.proposal;
  if(!receipt.saved){await call(receipt.deletion?'commit_change':'confirm_workspace_change',{previewId:p.id,digest:p.digest,confirmed:true});receipt.saved=true;}
  const read=await call('read_project_component',{componentId:current.current.id});current.current=read.component;
  let result=await call('run_component_frontend',{request:{componentId:current.current.id,expectedVersion:current.current.version,state:{...state.current,settings:false,layoutDraft:null,detail:null,newRow:null},event:{kind:'open'}}});
  result=mergeTrackerSnapshot(null,result);output.current=result;state.current=result.state;setFrameUrl(result.frameUrl);setFooter(null);setRecordReview(null);saveReceipt.current=null;send();prefetch(result);onUpdated?.(current.current);
 }
 useEffect(()=>{live.current=true;if(initialOutput){output.current=mergeTrackerSnapshot(null,initialOutput);state.current=initialOutput.state;setStandard(!!initialOutput.tracker);setFrameUrl(initialOutput.frameUrl);setProposal(initialOutput.proposal);onBusyChange?.(false);prefetch(output.current);}else void run();return()=>{live.current=false;cancelPrefetch();};},[]);
 useEffect(()=>{if(component&&component!==current.current){current.current=component;void run();}},[component]);
 useEffect(()=>{const receive=(e:MessageEvent)=>{if(e.source!==frame.current?.contentWindow)return;if(e.data?.kind==='trialy.ready'){setReady(true);send();}
  else if(e.data.channel===channel.current){
   if(e.data.kind==='trialy.approve'&&output.current?.tracker&&['bound-batch','tracker:create'].includes(e.data.action))approvedAction.current=e.data.action;
   else if(e.data.kind==='trialy.notice')setError(e.data.message);
   else if(e.data.kind==='trialy.rendered')onRendered?.();
   else if(e.data.kind==='trialy.footer')setFooter(e.data.footer);
   else if(e.data.kind==='trialy.state'){const old=state.current,next=e.data.state;state.current=next;setDetailsOpen(!!next?.detail);if(output.current&&(old?.tab!==next?.tab||JSON.stringify(old?.offsets)!==JSON.stringify(next?.offsets)||JSON.stringify(old?.filters)!==JSON.stringify(next?.filters))){cancelPrefetch();prefetch({...output.current,state:next});}}
   else if(e.data.kind==='trialy.resize'&&!output.current?.tracker&&Number.isFinite(e.data.height))setHeight(Math.max(200,Math.min(20000,e.data.height)));
   else if(e.data.kind==='trialy.event'&&!proposal){state.current=e.data.state??state.current;void run(e.data.event);}
  }
 };window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[proposal]);
 useEffect(()=>{if(!detailsOpen)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[detailsOpen]);
 useEffect(()=>{if(!standard||!frame.current)return;const size=()=>{const top=frame.current?.getBoundingClientRect().top??72;setHeight(Math.max(200,window.innerHeight-top));};size();window.addEventListener('resize',size);const observer=new ResizeObserver(size);observer.observe(document.documentElement);return()=>{window.removeEventListener('resize',size);observer.disconnect();};},[standard,frameUrl,ready,adding]);
 useEffect(()=>{if(!frameUrl||ready)return;const timer=setTimeout(()=>setError('The host did not open the isolated frame. Try the interface in the standalone workspace.'),8000);return()=>clearTimeout(timer);},[frameUrl,ready]);
 return <section className={`ty-tracker-surface ${standard?'ty-tracker--standard':''} ${detailsOpen?'ty-tracker--details':''}`} aria-label="Tracker">
 {error&&<div className="ty-runtime-error" role="alert">{error}{saveReceipt.current&&<button onClick={async()=>{setBusy(true);try{await finishSave();setError('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>Retry save</button>}</div>}
 {!standard&&ready&&<div className="ty-actions"><button disabled={busy||!!proposal} onClick={()=>void run()}>Refresh</button></div>}
 {adding&&<div className="ty-record-entry"><TrackerRecordForm initialTypeId={output.current?.tracker?.config.tabs[state.current?.tab]?.typeId} component={current.current} call={call} onPreview={async p=>{try{if(saveReceipt.current)await call('discard_workspace_preview',{previewId:p.id});else saveReceipt.current={proposal:p};await finishSave();setAdding(false);setError('');}catch(e){setError((e as Error).message);throw e;}}} onClose={()=>setAdding(false)}/></div>}
 {recordReview&&<div className="ty-content-overlay"><section className="ty-confirm-dialog" role="dialog" aria-modal="true" aria-label="Review record change"><h2>{recordReview.deletion?'Delete record?':'Duplicate record?'}</h2><p>{recordReview.deletion?'Remove this record from active tables. Its history is retained.':'Create a new record with these values.'}</p><ChangeSummary value={recordReview.proposal.summary??recordReview.proposal.body}/><button className="ty-button" disabled={busy||!!saveReceipt.current?.saved} onClick={async()=>{setBusy(true);try{await call(recordReview.deletion?'discard_preview':'discard_workspace_preview',{previewId:recordReview.proposal.id});saveReceipt.current=null;setRecordReview(null);setError('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>Cancel</button><button className="ty-button ty-button--primary" disabled={busy} onClick={async()=>{setBusy(true);try{saveReceipt.current??={proposal:recordReview.proposal,deletion:recordReview.deletion};await finishSave();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>{recordReview.deletion?'Delete record':'Duplicate record'}</button></section></div>}
 {proposal&&<ActionFooter action="Save changes" onAction={()=>onProposal(proposal)} onDismiss={async()=>{try{await call('discard_workspace_preview',{previewId:proposal.id});setProposal(null);blocked.current=false;}catch(e){setError((e as Error).message);}}}>Your changes are ready to save.</ActionFooter>}
 {footer&&!proposal&&<ActionFooter action={footer.kind==='edits'?'Save edits':'Save layout'} busy={busy} disabled={!!saveReceipt.current} onAction={()=>frameAction(footer.kind==='edits'?'save-edits':'save-layout')} dismissLabel={footer.kind==='edits'?'Ignore edits':'Discard layout changes'} onDismiss={()=>frameAction(footer.kind==='edits'?'discard-edits':'discard-layout')}>{footer.kind==='edits'?`${footer.count} field ${footer.count===1?'edit is':'edits are'} ready to save.`:'Your layout changes are ready to save.'}</ActionFooter>}
 {!ready&&<p className="ty-runtime-loading" role="status">Opening tracker…</p>}
 {frameUrl&&<iframe inert={adding||!!recordReview} ref={frame} title="Saved frontend code" sandbox="allow-scripts" referrerPolicy="no-referrer" src={frameUrl} onLoad={send} style={{width:'100%',height:detailsOpen?'100%':height+'px',border:0,display:'block'}}/>}
 </section>;
}

