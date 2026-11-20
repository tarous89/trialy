import React,{useEffect,useState} from 'react';
import {usePlatformChrome} from './PlatformChrome.js';
import {Button} from './ui/Controls.js';
import {grantedWhen} from './AppPeople.js';

/** A5, U3: asking for access to an app and answering such a request, shown with the platform's own page, header and message. */
type Api=(path:string,method?:string,body?:unknown)=>Promise<any>;
type Target={api:Api;workspaceId:string;appId:string};
const SENT="Request sent. You'll get an email when someone answers.";
const path=(workspaceId:string,appId:string,requestId?:string)=>`/api/workspaces/${workspaceId}/apps/${appId}/access-requests${requestId?'/'+requestId:''}`;
const verb=(role:string)=>role==='editor'?'edit':'view';

/** The one page for an app a person cannot open, or can no longer open. It never shows the app's name or content. */
export function NoAppAccess({api,workspaceId,appId,onHome}:Target&{onHome:()=>void}){
 const chrome=usePlatformChrome(),[role,setRole]=useState<'viewer'|'editor'>('viewer'),[state,setState]=useState<'loading'|'ask'|'sent'|'closed'>('loading'),[busy,setBusy]=useState(false);
 useEffect(()=>{chrome.setAppName(null);chrome.setAppStatus(null);document.title='TrialAgents';},[chrome.setAppName,chrome.setAppStatus]);
 // A request that is still open is shown as sent. Someone outside this organization cannot ask.
 useEffect(()=>{let live=true;setState('loading');void api(path(workspaceId,appId)).then(r=>{if(live)setState(r.mine?'sent':'ask');},()=>{if(live)setState('closed');});return()=>{live=false;};},[workspaceId,appId]);
 const send=()=>{setBusy(true);void api(path(workspaceId,appId),'POST',{role}).then(()=>{setState('sent');chrome.notify({kind:'success',message:SENT});},e=>chrome.notify({kind:'error',message:e.message})).finally(()=>setBusy(false));};
 return <section className="ty-empty ty-no-access" aria-label="No access"><h2>You don't have access to this app.</h2>
  {state==='sent'&&<p role="status">{SENT}</p>}
  {state==='ask'&&<fieldset><legend className="ty-sr">Access to ask for</legend>{(['viewer','editor'] as const).map(r=><label key={r}><input type="radio" name="ty-access-role" checked={role===r} onChange={()=>setRole(r)}/>{r==='viewer'?'View':'Edit'}</label>)}</fieldset>}
  <div className="ty-actions">{state==='ask'&&<Button variant="primary" disabled={busy} onClick={send}>Request access</Button>}<Button onClick={onHome}>Return to Apps</Button></div></section>;
}

/** A quiet "View only" in the platform header, with one control to ask for edit access. Renders nothing itself. */
export function ViewOnlyStatus({api,workspaceId,appId}:Target){
 const {notify,setAppStatus}=usePlatformChrome(),[asked,setAsked]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{
  const ask=()=>{setBusy(true);void api(path(workspaceId,appId),'POST',{role:'editor'}).then(()=>{setAsked(true);notify({kind:'success',message:SENT});},e=>notify({kind:'error',message:e.message})).finally(()=>setBusy(false));};
  setAppStatus(asked?{label:'View only · Edit access requested'}:{label:'View only',action:{label:'Request edit access',onSelect:ask,disabled:busy}});
  return()=>setAppStatus(null);
 },[asked,busy,workspaceId,appId,notify,setAppStatus]);
 return null;
}

/** Opened from the email. Whoever may give the access answers here; the first answer counts. */
export function AccessRequestDialog({api,workspaceId,appId,requestId,onClose}:Target&{requestId:string;onClose:()=>void}){
 const {notify}=usePlatformChrome(),[request,setRequest]=useState<any>(null),[busy,setBusy]=useState(false);
 // The person who asked has nothing to answer here.
 useEffect(()=>{let live=true;void api(path(workspaceId,appId,requestId)).then(r=>{if(!live)return;if(r.name)setRequest(r);else onClose();},e=>{if(live){notify({kind:'error',message:e.message});onClose();}});return()=>{live=false;};},[workspaceId,appId,requestId]);
 if(!request)return null;
 const answer=(approve:boolean)=>{setBusy(true);void api(path(workspaceId,appId,requestId),'POST',{approve}).then(r=>{
  if(r.alreadyHandled){setRequest(r);return;}
  // The same words as "People and roles" when table access holds the person back.
  notify(!approve?{kind:'success',message:`You declined ${r.name}'s request.`}:r.blockedTables?.length?{kind:'info',message:`${r.name} can now ${verb(r.role)} this app, but cannot see ${r.blockedTables.join(', ')}. Sharing an app does not open its tables.`}
   :r.readOnlyTables?.length?{kind:'info',message:`${r.name} can now ${verb(r.role)} this app, but can only view ${r.readOnlyTables.join(', ')}. An organization owner sets table access.`}:{kind:'success',message:`${r.name} can now ${verb(r.role)} this app.`});onClose();
 },e=>notify({kind:'error',message:e.message})).finally(()=>setBusy(false));};
 const pending=request.status==='pending';
 return <div className="ty-content-overlay"><section className="ty-confirm-dialog" role="dialog" aria-modal="true" aria-label="Access request"><h2>{request.name} asks to {verb(request.role)} this app</h2>
  {request.note&&<p className="ty-access-request-note">{request.note}</p>}
  {pending?<p>{request.canApprove?`Approving lets ${request.name} ${verb(request.role)} this app.`:'Only an owner of this app can answer this request.'}</p>
   :<p role="status">{request.status==='cancelled'?`${request.name} withdrew this request.`:`Already handled by ${request.decidedBy} on ${grantedWhen(request.decidedAt)}. The request was ${request.status}.`}</p>}
  <div className="ty-actions"><Button disabled={busy} autoFocus={!pending} onClick={onClose}>{pending?'Not now':'Close'}</Button>{pending&&request.canDecline&&<Button disabled={busy} onClick={()=>answer(false)}>Decline</Button>}{pending&&request.canApprove&&<Button variant="primary" disabled={busy} onClick={()=>answer(true)}>Approve</Button>}</div></section></div>;
}
