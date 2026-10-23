import {TrackerRecordForm} from './TrackerRecordForm.js';
import {ActionFooter} from './ActionFooter.js';
import React,{useEffect,useRef,useState} from 'react';
import {useAccessRecheck} from './useAccessRecheck.js';
type Call=(name:string,args:Record<string,unknown>)=>Promise<any>;
export function FrontendCodeRuntime({component,previewId,call,onProposal,onUnavailable,onAccess,onBusyChange,onRendered,onUpdated}:{component?:any;previewId?:string;call:Call;onProposal:(p:any)=>void;onUnavailable?:(message:string)=>void;onAccess?:()=>void;onBusyChange?:(busy:boolean)=>void;onRendered?:()=>void;onUpdated?:(component:any)=>void}){
 const frame=useRef<HTMLIFrameElement>(null),output=useRef<any>(null),state=useRef<any>(null),busyRef=useRef(false),channel=useRef(crypto.randomUUID()),live=useRef(true),current=useRef(component);
 const [standard,setStandard]=useState(false),[ready,setReady]=useState(false),[height,setHeight]=useState(620),[adding,setAdding]=useState(false),[footer,setFooter]=useState<any>(null);
 const [frameUrl,setFrameUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[proposal,setProposal]=useState<any>(null);
 const checking=useRef(false),eventQueue=useRef<any[]>([]),blocked=useRef(false),saveReceipt=useRef<any>(null),approvedAction=useRef<string|null>(null);
 function clearOutput(){eventQueue.current=[];output.current=null;state.current=null;setFrameUrl('');setReady(false);setProposal(null);setFooter(null);}
 useAccessRecheck(()=>{if(!current.current||checking.current||busyRef.current)return;checking.current=true;const c=current.current;void call('check_component_access',{componentId:c.id}).then(r=>{if(r.version!==current.current.version)throw Error('Interface changed; reopen it to review the current revision');}).catch(e=>{if(live.current){clearOutput();setError((e as Error).message);onUnavailable?.((e as Error).message);}}).finally(()=>{checking.current=false;});},!!component);
 const send=()=>{if(output.current)frame.current?.contentWindow?.postMessage({kind:'trialy.render',channel:channel.current,html:output.current.html,css:output.current.css,controls:output.current.controls,connected:output.current.connected,state:output.current.state,tracker:output.current.tracker},'*');};
 const frameAction=(action:string)=>{approvedAction.current=action==='save-edits'?'bound-batch':action==='save-layout'?'save-layout':null;frame.current?.contentWindow?.postMessage({kind:'trialy.action',channel:channel.current,action},'*');};
 async function run(event:any={kind:'open'}){
  if(event.action==='tracker:add'){if(current.current)setAdding(true);return;}if(event.action==='tracker:access'){onAccess?.();return;}
  if(blocked.current)return;if(busyRef.current){if(eventQueue.current.length<50)eventQueue.current.push(event);return;}busyRef.current=true;setBusy(true);onBusyChange?.(true);setError('');
  try{
   const c=current.current,explicitApproval=approvedAction.current===event.action;approvedAction.current=null;
   let result=await call('run_component_frontend',{request:{...(previewId?{previewId}:{componentId:c.id,expectedVersion:c.version}),state:state.current,event}});
   if(!live.current)return;
   // The footer click approves the visible edits. The server still validates a precise proposal and its digest before committing.
   if(result.proposal&&explicitApproval&&(event.action==='bound-batch'||event.action==='save-layout'&&output.current?.tracker)){
    const p=result.proposal;saveReceipt.current={proposal:p};
    await finishSave();return;
   }
   output.current=result;state.current=result.state;setStandard(!!result.tracker);setFrameUrl(result.frameUrl);setProposal(result.proposal);
   if(result.proposal){blocked.current=true;eventQueue.current=[];}send();
  }catch(e){if(live.current)setError((e as Error).message);}finally{busyRef.current=false;onBusyChange?.(false);if(live.current){setBusy(false);if(eventQueue.current.length&&!blocked.current)void run(eventQueue.current.shift());}}
 }
 async function finishSave(){
  const receipt=saveReceipt.current,p=receipt.proposal;
  if(!receipt.saved){await call('confirm_workspace_change',{previewId:p.id,digest:p.digest,confirmed:true});receipt.saved=true;}
  const read=await call('read_project_component',{componentId:current.current.id});current.current=read.component;
  const result=await call('run_component_frontend',{request:{componentId:current.current.id,expectedVersion:current.current.version,state:{...state.current,settings:false,layoutDraft:null,detail:null},event:{kind:'open'}}});
  output.current=result;state.current=result.state;setFrameUrl(result.frameUrl);setFooter(null);saveReceipt.current=null;send();onUpdated?.(current.current);
 }
 useEffect(()=>{live.current=true;void run();return()=>{live.current=false;};},[]);
 useEffect(()=>{if(component&&component!==current.current){current.current=component;void run();}},[component]);
 useEffect(()=>{const receive=(e:MessageEvent)=>{if(e.source!==frame.current?.contentWindow)return;if(e.data?.kind==='trialy.ready'){setReady(true);send();}
  else if(e.data.channel===channel.current){
   if(e.data.kind==='trialy.rendered')onRendered?.();
   else if(e.data.kind==='trialy.footer')setFooter(e.data.footer);
   else if(e.data.kind==='trialy.state')state.current=e.data.state;
   else if(e.data.kind==='trialy.resize'&&!output.current?.tracker&&Number.isFinite(e.data.height))setHeight(Math.max(200,Math.min(20000,e.data.height)));
   else if(e.data.kind==='trialy.event'&&!proposal){state.current=e.data.state??state.current;void run(e.data.event);}
  }
 };window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[proposal]);
 useEffect(()=>{if(!standard||!frame.current)return;const size=()=>{const top=frame.current?.getBoundingClientRect().top??72;setHeight(Math.max(200,window.innerHeight-top));};size();window.addEventListener('resize',size);const observer=new ResizeObserver(size);observer.observe(document.documentElement);return()=>{window.removeEventListener('resize',size);observer.disconnect();};},[standard,frameUrl,ready,adding]);
 useEffect(()=>{if(!frameUrl||ready)return;const timer=setTimeout(()=>setError('The host did not open the isolated frame. Try the interface in the standalone workspace.'),8000);return()=>clearTimeout(timer);},[frameUrl,ready]);
 return <section className={`ty-tracker-surface ${standard?'ty-tracker--standard':''}`} aria-label="Tracker">
 {error&&<div className="ty-runtime-error" role="alert">{error}{saveReceipt.current&&<button onClick={async()=>{setBusy(true);try{await finishSave();setError('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>Retry save</button>}</div>}
 {!standard&&ready&&<div className="ty-actions"><button disabled={busy||!!proposal} onClick={()=>void run()}>Refresh</button></div>}
 {adding&&<div className="ty-record-entry"><TrackerRecordForm initialTypeId={output.current?.tracker?.config.tabs[state.current?.tab]?.typeId} component={current.current} call={call} onPreview={async p=>{try{if(saveReceipt.current)await call('discard_workspace_preview',{previewId:p.id});else saveReceipt.current={proposal:p};await finishSave();setAdding(false);setError('');}catch(e){setError((e as Error).message);throw e;}}} onClose={()=>setAdding(false)}/></div>}
 {proposal&&<ActionFooter action="Save changes" onAction={()=>onProposal(proposal)} onDismiss={async()=>{try{await call('discard_workspace_preview',{previewId:proposal.id});setProposal(null);blocked.current=false;}catch(e){setError((e as Error).message);}}}>Your changes are ready to save.</ActionFooter>}
 {footer&&!proposal&&<ActionFooter action={footer.kind==='edits'?'Save edits':'Save layout'} busy={busy} disabled={!!saveReceipt.current} onAction={()=>frameAction(footer.kind==='edits'?'save-edits':'save-layout')} dismissLabel={footer.kind==='edits'?'Ignore edits':'Discard layout changes'} onDismiss={()=>frameAction(footer.kind==='edits'?'discard-edits':'discard-layout')}>{footer.kind==='edits'?`${footer.count} field ${footer.count===1?'edit is':'edits are'} ready to save.`:'Your layout changes are ready to save.'}</ActionFooter>}
 {!ready&&<p className="ty-runtime-loading" role="status">Opening tracker…</p>}
 {frameUrl&&<iframe inert={adding} ref={frame} title="Saved frontend code" sandbox="allow-scripts" referrerPolicy="no-referrer" src={frameUrl} onLoad={send} style={{width:'100%',height:height+'px',border:0,display:'block'}}/>}
 </section>;
}
