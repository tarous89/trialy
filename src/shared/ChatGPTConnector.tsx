import React,{useEffect,useRef,useState} from 'react';
import {AppPlatform} from './AppPlatform.js';
import {assistantUrl} from './AssistantLinks.js';
import {WorkerIcon} from './WorkerIcon.js';
import {Button} from './ui/Controls.js';
type Call=(name:string,args?:any)=>Promise<any>;
export function AssistantConnector({data,call:rawCall,onChanged,assistant,workspaceId}:{data:any;call:Call;onChanged:()=>void;assistant:'chatgpt'|'claude';workspaceId:string}){
 const name=assistant==='claude'?'Claude':'ChatGPT',platform=React.useContext(AppPlatform);
 const call=(tool:string,args:any={})=>rawCall(tool,tool==='read_automation_connector'?{...args,assistant}:args);
 const connectionRequest=`Connect TrialAgents background automations to ${name} in workspace ${workspaceId}. Read read_app_automation_guide and read_automation_setup and follow the setup steps for ${name}. Preserve my existing automations and schedules. Verify the connection before claiming it is ready.`;
 const openAssistant=()=>{const url=assistantUrl(name,connectionRequest);if(platform.openLink)platform.openLink(url);else window.open(url,'_blank','noopener,noreferrer');};
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[confirmation,setConfirmation]=useState<any>(null);
 const card=useRef<HTMLElement>(null),dialog=useRef<HTMLElement>(null),enabled=!!data.enabled,ready=enabled&&data.state==='ready';
 const close=()=>{setConfirmation(null);card.current?.querySelector<HTMLButtonElement>('.ty-connector-toggle')?.focus();};
 useEffect(()=>{if(!confirmation)return;const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy){e.preventDefault();close();}if(e.key==='Tab'){const buttons=dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');if(!buttons?.length)return;const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);},[!!confirmation,busy]);
 const toggle=async()=>{if(!data.enabled&&(data.canConfigure===false||!data.id&&(data.canPrepare??assistant==='chatgpt')===false)){openAssistant();return;}setBusy(true);setError('');setNotice('');try{
  const current=await call('read_automation_connector');
  if(!!current.enabled!==enabled){onChanged();setNotice('The connector status changed. Review its current status and try again.');return;}
  if(current.enabled){setConfirmation(current);return;}
  if(current.id)await call('control_automation_runner',{runnerId:current.id,expectedVersion:current.version,enabled:true});
  else{const review=await call('prepare_automation_setup',{preferences:{timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone}});await call('confirm_app_service_review',{reviewId:review.id,digest:review.digest,confirmed:true});}
  const updated=await call('read_automation_connector');
  if(updated.state==='awaiting_subscription')setNotice(`Setup saved. Finish your background connection in ${name} with TrialAgents connected.`);
  onChanged();
 }catch(e:any){setError(e.message??'The connector could not be changed. Try again.');}finally{setBusy(false);}};
 const disable=async()=>{setBusy(true);setError('');try{
  await call('control_automation_runner',{runnerId:confirmation.id,expectedVersion:confirmation.version,enabled:false,confirmed:true,impactDigest:confirmation.impactDigest});close();onChanged();
 }catch(e:any){try{const current=await call('read_automation_connector');if(!current.enabled){close();onChanged();return;}setConfirmation(current);setError('The connector or its automations may have changed. Review the current list below and try again.');}catch{setConfirmation(null);setError('The affected automations could not be checked. Refresh to check the connector status.');}}finally{setBusy(false);}};
 useEffect(()=>{if(data.state!=='connected_unverified')return;const timer=setInterval(onChanged,3000);return()=>clearInterval(timer);},[data.state]);
 const affected=(confirmation?.automations??[]).filter((a:any)=>a.enabled&&!a.appArchived);
 return <section className="ty-connector-card" aria-label={`${name} connector`} ref={card}>
  <div className="ty-connector-card-heading"><div className="ty-assistant-identity"><WorkerIcon worker={assistant}/><div><h2>{name}</h2><span className="ty-automation-state" data-state={ready?'enabled':data.state} data-enabled={ready}>{ready?'Connected':data.state==='loading'?'Checking…':data.state==='unavailable'?'Unavailable':data.state==='restricted'?'Owner managed':enabled?'Setup pending':data.id?'Paused':'Not connected'}</span></div></div><Button className="ty-connector-toggle" disabled={busy||['unavailable','loading','restricted'].includes(data.state)} onClick={()=>void toggle()}>{enabled?(ready?'Disable':'Stop setup'):data.id?'Enable':'Connect'}</Button></div>
  <p className="ty-connector-description-text">Research, analyze and update your apps with {name}.</p>
  {enabled&&['awaiting_subscription','connected_unverified'].includes(data.state)&&<p role="status">{data.state==='awaiting_subscription'?`Finish connecting in ${name} with TrialAgents.`:`Verifying the ${name} connection…`}</p>}
  {enabled&&!ready&&data.state!=='unavailable'&&<div className="ty-actions"><Button disabled={busy} onClick={openAssistant}>Continue in {name}</Button><Button disabled={busy} onClick={async()=>{try{await navigator.clipboard.writeText(connectionRequest);setNotice(`Connection request copied. Paste it into ${name} with TrialAgents connected.`);}catch{setNotice(`Ask ${name} with TrialAgents connected to finish your background connection.`);}}}>Copy connection request</Button><Button disabled={busy} onClick={onChanged}>Refresh status</Button></div>}
  {data.state==='unavailable'&&<p role="status">{name} status is temporarily unavailable. <Button onClick={onChanged}>Retry</Button></p>}
  {data.state==='restricted'&&<p className="ty-automation-help">The workspace owner manages this background connection.</p>}
  {data.automations?.length>0&&<details className="ty-connector-dependencies" open><summary>Automations using {name} ({data.automations?.length??0})</summary>{data.automations?.length?<ul>{data.automations.map((a:any)=><li key={a.kind+a.id}><span><strong>{a.name}</strong><small>{a.appName}</small></span><span className="ty-automation-state" data-state={(a.effectiveEnabled??(a.enabled&&ready&&!a.appArchived))?'enabled':'disabled'} data-enabled={a.effectiveEnabled??(a.enabled&&ready&&!a.appArchived)}>{(a.effectiveEnabled??(a.enabled&&ready&&!a.appArchived))?'Enabled':'Disabled'}</span></li>)}</ul>:<p>No automations use this connector yet.</p>}</details>}
  {notice&&<p role="status">{notice}</p>}{error&&!confirmation&&<p role="alert">{error}</p>}
  {confirmation&&<div className="ty-content-overlay"><section ref={dialog} className="ty-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby={`disable-${assistant}-title`} aria-describedby={`disable-${assistant}-impact`}><h2 id={`disable-${assistant}-title`}>Disable {name}?</h2><p id={`disable-${assistant}-impact`}>{affected.length?'These automations are expected to be interrupted until you enable it again:':'No enabled automations currently depend on this connector.'}</p>{affected.length>0&&<ul className="ty-connector-impact">{affected.map((a:any)=><li key={a.kind+a.id}><strong>{a.name}</strong><small>{a.appName}</small></li>)}</ul>}<p>Your saved automation settings and results will be kept.</p>{error&&<p role="alert">{error}</p>}<div className="ty-actions"><Button autoFocus disabled={busy} onClick={close}>Cancel</Button><Button disabled={busy} onClick={()=>void disable()}>Disable {name}</Button></div></section></div>}
 </section>;
}
