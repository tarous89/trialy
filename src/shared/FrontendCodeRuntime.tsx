import {TrackerRecordForm} from './TrackerRecordForm.js';
import React,{useEffect,useRef,useState} from 'react';
import {useAccessRecheck} from './useAccessRecheck.js';
type Call=(name:string,args:Record<string,unknown>)=>Promise<any>;
export function FrontendCodeRuntime({component,previewId,call,onProposal,onUnavailable,onAccess,onBusyChange,onRendered}:{component?:any;previewId?:string;call:Call;onProposal:(p:any)=>void;onUnavailable?:(message:string)=>void;onAccess?:()=>void;onBusyChange?:(busy:boolean)=>void;onRendered?:()=>void}){
 const frame=useRef<HTMLIFrameElement>(null),output=useRef<any>(null),state=useRef<any>(null),busyRef=useRef(false),channel=useRef(crypto.randomUUID()),live=useRef(true);
 const standard=component?.source?.startsWith('const config=');
 const [ready,setReady]=useState(false),[height,setHeight]=useState(620),[adding,setAdding]=useState(false);
 const [frameUrl,setFrameUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[proposal,setProposal]=useState<any>(null);
 const checking=useRef(false),eventQueue=useRef<any[]>([]),blocked=useRef(false);
 function clearOutput(){eventQueue.current=[];output.current=null;state.current=null;setFrameUrl('');setReady(false);setProposal(null);}
 useAccessRecheck(()=>{if(!component||checking.current)return;checking.current=true;void call('check_component_access',{componentId:component.id}).then(r=>{if(r.version!==component.version)throw Error('Interface changed; reopen it to review the current revision');}).catch(e=>{if(live.current){clearOutput();setError((e as Error).message);onUnavailable?.((e as Error).message);}}).finally(()=>{checking.current=false;});},!!component);
 const send=()=>{if(output.current)frame.current?.contentWindow?.postMessage({kind:'trialy.render',channel:channel.current,html:output.current.html,css:output.current.css,controls:output.current.controls,connected:output.current.connected},'*');};
 async function run(event:any={kind:'open'}){
  if(event.action==='tracker:add'){if(component)setAdding(true);return;}if(event.action==='tracker:access'){onAccess?.();return;}
  if(blocked.current)return;if(busyRef.current){if(eventQueue.current.length<50)eventQueue.current.push(event);return;}busyRef.current=true;setBusy(true);onBusyChange?.(true);setError('');
  try{const result=await call('run_component_frontend',{request:{...(previewId?{previewId}:{componentId:component.id,expectedVersion:component.version}),state:state.current,event}});
   if(!live.current)return;if(result.boundEdit){blocked.current=true;eventQueue.current=[];setProposal(result.proposal);return;}output.current=result;setFrameUrl(result.frameUrl);state.current=result.state;setProposal(result.proposal);if(result.proposal){blocked.current=true;eventQueue.current=[];}send();
  }catch(e){if(live.current){clearOutput();setError((e as Error).message);}}finally{busyRef.current=false;onBusyChange?.(false);if(live.current){setBusy(false);if(eventQueue.current.length&&!blocked.current)void run(eventQueue.current.shift());}}
 }
 useEffect(()=>{live.current=true;void run();return()=>{live.current=false;};},[]);
 useEffect(()=>{const receive=(e:MessageEvent)=>{if(e.source!==frame.current?.contentWindow)return;if(e.data?.kind==='trialy.ready'){setReady(true);send();}
  else if(e.data?.kind==='trialy.rendered'&&e.data.channel===channel.current){onRendered?.();}
  else if(e.data?.kind==='trialy.resize'&&e.data.channel===channel.current&&Number.isFinite(e.data.height)){setHeight(Math.max(200,Math.min(20000,e.data.height)));}
  else if(e.data?.kind==='trialy.event'&&e.data.channel===channel.current&&!proposal)void run(e.data.event);
 };window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[proposal]);
 useEffect(()=>{if(!frameUrl||ready)return;const timer=setTimeout(()=>setError('The host did not open the isolated frame. Try the interface in the standalone workspace.'),8000);return()=>clearTimeout(timer);},[frameUrl,ready]);
 return <section className="ty-tracker-surface" aria-label="Tracker">{previewId&&<p>Preview · edits become available after saving this tracker.</p>}
 {error&&<p role="alert">{error}</p>}<div className="ty-actions">{!standard&&component?.manifest?.fields.some((f:any)=>f.mode==='write')&&<button disabled={busy||!!proposal} onClick={()=>setAdding(true)}>Add record</button>}<details hidden={standard}><summary>Advanced</summary><button disabled={busy||!!proposal} onClick={()=>void run()}>Reload interface</button></details>{busy&&<span role="status">Updating…</span>}</div>{adding&&<TrackerRecordForm component={component} call={call} onPreview={p=>{setAdding(false);onProposal(p);}} onClose={()=>setAdding(false)}/>}
 {proposal&&<aside><p>{proposal.body?.kind==='save_component'?'Review these layout changes before saving.':'Review these record changes before saving.'}</p><button onClick={()=>onProposal(proposal)}>Review proposed changes</button><button onClick={async()=>{try{await call('discard_workspace_preview',{previewId:proposal.id});setProposal(null);blocked.current=false;}catch(e){setError((e as Error).message);}}}>Discard changes</button></aside>}
 {frameUrl&&!ready&&<p role="status">Opening isolated interface…</p>}
 {frameUrl&&<iframe ref={frame} title="Saved frontend code" sandbox="allow-scripts" referrerPolicy="no-referrer" src={frameUrl} onLoad={send} style={{width:'100%',height:height+'px',border:0,borderRadius:8}}/>}
 </section>;
}
