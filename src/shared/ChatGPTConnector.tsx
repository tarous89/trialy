import React,{useEffect,useRef,useState} from 'react';
import {Button} from './ui/Controls.js';
type Call=(name:string,args?:any)=>Promise<any>;
export function ChatGPTConnector({data,call,onChanged}:{data:any;call:Call;onChanged:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[confirmation,setConfirmation]=useState<any>(null);
 const card=useRef<HTMLElement>(null),dialog=useRef<HTMLElement>(null),enabled=!!data.enabled,ready=enabled&&data.state==='ready';
 const close=()=>{setConfirmation(null);card.current?.querySelector<HTMLButtonElement>('.ty-connector-toggle')?.focus();};
 useEffect(()=>{if(!confirmation)return;const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy){e.preventDefault();close();}if(e.key==='Tab'){const buttons=dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');if(!buttons?.length)return;const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);},[!!confirmation,busy]);
 const toggle=async()=>{setBusy(true);setError('');setNotice('');try{
  const current=await call('read_automation_connector');
  if(!!current.enabled!==enabled){onChanged();setNotice('The connector status changed. Review its current status and try again.');return;}
  if(current.enabled){setConfirmation(current);return;}
  if(current.id)await call('control_automation_runner',{runnerId:current.id,expectedVersion:current.version,enabled:true});
  else{const review=await call('prepare_automation_setup',{preferences:{timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone}});await call('confirm_app_service_review',{reviewId:review.id,digest:review.digest,confirmed:true});}
  const updated=await call('read_automation_connector');
  if(updated.state==='awaiting_subscription')setNotice('Setup saved. Ask ChatGPT with TrialAgents connected to finish your background connection.');
  onChanged();
 }catch(e:any){setError(e.message??'The connector could not be changed. Try again.');}finally{setBusy(false);}};
 const disable=async()=>{setBusy(true);setError('');try{
  await call('control_automation_runner',{runnerId:confirmation.id,expectedVersion:confirmation.version,enabled:false,confirmed:true,impactDigest:confirmation.impactDigest});close();onChanged();
 }catch(e:any){try{const current=await call('read_automation_connector');if(!current.enabled){close();onChanged();return;}setConfirmation(current);setError('The connector or its automations may have changed. Review the current list below and try again.');}catch{setConfirmation(null);setError('The affected automations could not be checked. Refresh to check the connector status.');}}finally{setBusy(false);}};
 useEffect(()=>{if(data.state!=='connected_unverified')return;const timer=setInterval(onChanged,3000);return()=>clearInterval(timer);},[data.state]);
 const affected=(confirmation?.automations??[]).filter((a:any)=>a.enabled&&!a.appArchived);
 return <section className="ty-connector-card" aria-label="ChatGPT connector" ref={card}>
  <div className="ty-connector-card-heading"><div><h2>ChatGPT</h2><span className="ty-automation-state" data-state={ready?'enabled':'disabled'} data-enabled={ready}>{ready?'Enabled':'Disabled'}</span></div><Button className="ty-connector-toggle" disabled={busy||data.state==='unavailable'} onClick={()=>void toggle()}>{enabled?(ready?'Disable':'Stop setup'):'Enable'}</Button></div>
  {enabled&&['awaiting_subscription','connected_unverified'].includes(data.state)&&<p role="status">{data.state==='awaiting_subscription'?'Finish connecting in ChatGPT with TrialAgents.':'Verifying the ChatGPT connection…'}</p>}
  {enabled&&!ready&&data.state!=='unavailable'&&<div className="ty-actions"><Button disabled={busy} onClick={async()=>{try{await navigator.clipboard.writeText('Finish connecting TrialAgents background automations to ChatGPT in my workspace. Read read_app_automation_guide and read_automation_setup, then complete the shared event subscription and verification. Preserve my existing automations and their schedules.');setNotice('Connection request copied. Paste it into ChatGPT with TrialAgents connected.');}catch{setNotice('Ask ChatGPT with TrialAgents connected to finish your background connection.');}}}>Copy connection request</Button><Button disabled={busy} onClick={onChanged}>Refresh status</Button></div>}
  {data.state==='unavailable'&&<p role="status">ChatGPT is temporarily unavailable.</p>}
  {data.automations&&<details className="ty-connector-dependencies" open><summary>Automations using ChatGPT ({data.automations?.length??0})</summary>{data.automations?.length?<ul>{data.automations.map((a:any)=><li key={a.kind+a.id}><span><strong>{a.name}</strong><small>{a.appName}</small></span><span className="ty-automation-state" data-state={(a.effectiveEnabled??(a.enabled&&ready&&!a.appArchived))?'enabled':'disabled'} data-enabled={a.effectiveEnabled??(a.enabled&&ready&&!a.appArchived)}>{(a.effectiveEnabled??(a.enabled&&ready&&!a.appArchived))?'Enabled':'Disabled'}</span></li>)}</ul>:<p>No automations use this connector yet.</p>}</details>}
  {notice&&<p role="status">{notice}</p>}{error&&!confirmation&&<p role="alert">{error}</p>}
  {confirmation&&<div className="ty-content-overlay"><section ref={dialog} className="ty-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="disable-chatgpt-title" aria-describedby="disable-chatgpt-impact"><h2 id="disable-chatgpt-title">Disable ChatGPT?</h2><p id="disable-chatgpt-impact">{affected.length?'These automations are expected to be interrupted until you enable ChatGPT again:':'No enabled automations currently depend on this connector.'}</p>{affected.length>0&&<ul className="ty-connector-impact">{affected.map((a:any)=><li key={a.kind+a.id}><strong>{a.name}</strong><small>{a.appName}</small></li>)}</ul>}<p>Your saved automation settings and results will be kept.</p>{error&&<p role="alert">{error}</p>}<div className="ty-actions"><Button autoFocus disabled={busy} onClick={close}>Cancel</Button><Button disabled={busy} onClick={()=>void disable()}>Disable ChatGPT</Button></div></section></div>}
 </section>;
}
