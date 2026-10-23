import React,{useEffect,useState,useRef} from 'react';
import {FrontendCodeRuntime} from './FrontendCodeRuntime.js';
import {ActionFooter} from './ActionFooter.js';
import {Select} from './ui/Controls.js';
type Call=(name:string,args:any)=>Promise<any>;
/** The save click approves the visible tracker and its required new tables together. */
export function TrackerDraft({preview,call,onSaved,onDiscard,onProposal}:{preview:any;call:Call;onSaved:(component:any)=>void;onDiscard:()=>void;onProposal:(p:any)=>void}){
 const [projectId,setProjectId]=useState(preview.body.setup?.projectId??preview.body.projectId??''),[projects,setProjects]=useState<any[]>([]),[busy,setBusy]=useState(false),[rendering,setRendering]=useState(true),[rendered,setRendered]=useState(false),[error,setError]=useState('');
 const invoke=(name:string,args:any={})=>call(name,{workspaceId:preview.workspaceId,...args});
 useEffect(()=>{let live=true;void invoke('list_workspace_projects').then(r=>{if(live)setProjects(r.nodes.filter((n:any)=>n.kind==='project'&&!n.effective_archived));}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[]);
 const activePreview=useRef(preview),savedReceipt=useRef<any>(null);
 const newTracker=preview.body.kind==='create_tracker';
 const scope=preview.body.content?.manifest?.scope;
 async function save(){setBusy(true);setError('');try{
  let p=activePreview.current;const original=p.body.setup?.projectId??p.body.projectId??null;
  if(!savedReceipt.current&&(projectId||null)!==original){const body=structuredClone(preview.body);if(newTracker)body.setup.projectId=projectId||null;else body.projectId=projectId||null;p=await invoke('prepare_workspace_change',{operation:body});activePreview.current=p;}
  const receipt=savedReceipt.current??await invoke('confirm_workspace_change',{previewId:p.id,digest:p.digest,confirmed:true});savedReceipt.current=receipt;
  const result=await invoke('read_project_component',{componentId:receipt.id});
  if(p.id!==preview.id)await invoke('discard_workspace_preview',{previewId:preview.id}).catch(()=>{});
  onSaved(result.component);
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="ty-tracker-preview">{error&&<p role="alert">{error}</p>}<FrontendCodeRuntime previewId={preview.id} call={invoke} onProposal={onProposal} onBusyChange={setRendering} onRendered={()=>setRendered(true)}/><ActionFooter action={savedReceipt.current?'Open saved tracker':'Save tracker'} disabled={rendering||!rendered} busy={busy} onAction={()=>void save()} dismissLabel="Discard tracker" onDismiss={savedReceipt.current?undefined:async()=>{setBusy(true);try{await invoke('discard_workspace_preview',{previewId:activePreview.current.id});if(activePreview.current.id!==preview.id)await invoke('discard_workspace_preview',{previewId:preview.id});onDiscard();}catch(e){setError((e as Error).message);setBusy(false);}}}><span>{newTracker?'Save this tracker and its connected fields to':'Save this tracker to'}</span>{!savedReceipt.current&&!preview.body.componentId&&scope!=='project'?<Select label="Save to" value={projectId} onChange={setProjectId} options={[{value:'',label:'Home'},...projects.map(p=>({value:p.id,label:p.name}))]}/>:<span>{projects.find(p=>p.id===projectId)?.name??'Home'}.</span>}</ActionFooter></section>;
}
