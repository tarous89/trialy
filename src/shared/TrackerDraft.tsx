import type {AppRoute} from './app-route.js';
import {AppPlatform,AppNavigation} from './AppPlatform.js';
import React,{useState,useRef} from 'react';
import {FrontendCodeRuntime} from './FrontendCodeRuntime.js';
import {ActionFooter} from './ActionFooter.js';
import {EmbeddedNavigation} from './ui/PageNavigation.js';
import {Button} from './ui/Controls.js';
type Call=(name:string,args:any)=>Promise<any>;
/** The save click approves the visible tracker and its required new tables together. */
export function TrackerDraft({preview,call,onSaved,onDiscard,onProposal,initialOutput}:{initialOutput?:any;preview:any;call:Call;onSaved:(component:any,output?:any,route?:AppRoute)=>void;onDiscard:()=>void;onProposal:(p:any)=>void}){
 const [busy,setBusy]=useState(false),[rendering,setRendering]=useState(true),[rendered,setRendered]=useState(false),[error,setError]=useState('');
 const invoke=(name:string,args:any={})=>call(name,{workspaceId:preview.workspaceId,...args});
 const platform=React.useContext(AppPlatform);
 const navigation=React.useContext(AppNavigation);
 const embedded=React.useContext(EmbeddedNavigation);
 const label=platform.enabled?'app':preview.body.content?.resourceKind==='visualization'?'dashboard':preview.body.content?.resourceKind==='form'?'form':'tracker';
 const activePreview=useRef(preview),savedReceipt=useRef<any>(null);
 const revision=!!preview.body.componentId;
 async function discard(){setBusy(true);try{await invoke('discard_workspace_preview',{previewId:activePreview.current.id});if(activePreview.current.id!==preview.id)await invoke('discard_workspace_preview',{previewId:preview.id});onDiscard();}catch(e){setError((e as Error).message);setBusy(false);}}
 async function save(){setBusy(true);setError('');try{
  const p=activePreview.current;
  const receipt=savedReceipt.current??await invoke('confirm_workspace_change',{previewId:p.id,digest:p.digest,confirmed:true});savedReceipt.current=receipt;setRendered(false);
  const result=await invoke('read_project_component',{componentId:receipt.id});
  if(p.id!==preview.id)await invoke('discard_workspace_preview',{previewId:preview.id}).catch(()=>{});
  const output=embedded?undefined:await invoke('run_component_frontend',{request:{componentId:result.component.id,expectedVersion:result.component.version,...(navigation?{route:navigation.route}:{}),event:{kind:'open'}}});
  onSaved(result.component,output,navigation?.route);
 }catch(e){if(!savedReceipt.current)setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="ty-tracker-preview">{error&&<p role="alert">{error}</p>}{revision&&rendered&&!savedReceipt.current&&<div className="ty-app-revision-actions" aria-label="App update review"><Button disabled={busy} onClick={()=>void discard()}>Ignore changes</Button><Button variant="primary" disabled={rendering||busy} onClick={()=>void save()}>Save changes</Button></div>}<FrontendCodeRuntime initialOutput={initialOutput} previewId={preview.id} call={invoke} onProposal={onProposal} onHome={onDiscard} onBusyChange={setRendering} onRendered={()=>setRendered(true)}/>{!revision&&rendered&&!savedReceipt.current&&<ActionFooter showDismissLabel variant="primary" action={'Save '+label} disabled={rendering} busy={busy} onAction={()=>void save()} dismissLabel={"Discard "+label} onDismiss={()=>void discard()}>This {label} is a preview. Save it to keep it.</ActionFooter>}</section>;
}

