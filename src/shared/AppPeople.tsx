import React,{useEffect,useRef,useState} from 'react';
import {usePlatformChrome} from './PlatformChrome.js';

type Call=(name:string,args?:any)=>Promise<any>;
type Role='owner'|'editor'|'viewer'|'none';
const LABEL:Record<Role,string>={owner:'Owner',editor:'Editor',viewer:'Viewer',none:'No access'},RANK:Record<Role,number>={none:0,viewer:1,editor:2,owner:3};
const WHAT:Record<Role,string>={owner:'Can change the app, its settings and who has access',editor:'Can add and change information',viewer:'Can look, not change',none:'Cannot open the app'};
/** "20 Nov 2026, 14:05 CET" — the zone is part of the record (A5). */
export const grantedWhen=(at:string|Date)=>new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date(at));

/**
 * R3–R5, A1, A5: who can use one app and in which role.
 * Everyone who can open the app sees the list. What each person may change follows the server:
 * owners set any role and the team default, editors and viewers can share up to their own role.
 * Inside an assistant the list is read-only; roles are changed by a signed-in person in TrialAgents.
 */
export function AppPeople({call,appId,readOnly=false,onManage}:{call:Call;appId:string;readOnly?:boolean;onManage?:()=>void}){
 const [data,setData]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[asking,setAsking]=useState<{person:any;role:Role}|null>(null),[requests,setRequests]=useState<any[]>([]);
 const chrome=usePlatformChrome(),seq=useRef(0);
 async function load(){const mine=++seq.current;try{const value=await call('read_app_members',{appId});if(mine===seq.current){setData(value);setError('');}}catch(e){if(mine===seq.current)setError((e as Error).message);}
  // Open access requests this person may answer (A5). Not available inside an assistant; the list simply stays empty there.
  if(!readOnly)try{const open=await call('read_app_access_requests',{appId});if(mine===seq.current)setRequests(open.requests??[]);}catch{if(mine===seq.current)setRequests([]);}}
 async function answer(r:any,approve:boolean){setBusy(true);try{const done=await call('decide_app_access_request',{appId,requestId:r.id,approve});chrome.notify(done.alreadyHandled?{kind:'info',message:`Already answered${done.decidedBy?' by '+done.decidedBy:''}`}:{kind:'success',message:approve?`${r.name} is now ${LABEL[r.role as Role]}`:`Request from ${r.name} declined`});await load();}catch(e){chrome.notify({kind:'error',message:(e as Error).message});}finally{setBusy(false);}}
 useEffect(()=>{setData(null);void load();return()=>{seq.current++;};},[appId]);
 async function apply(person:any,role:Role){
  setAsking(null);setBusy(true);
  try{const r=await call('set_app_role',{appId,userId:person.userId,role});
   chrome.notify(r.blockedTables?.length?{kind:'info',message:`${person.name} is now ${LABEL[role]}, but cannot see ${r.blockedTables.join(', ')}. Sharing an app does not open its tables.`}
    :r.readOnlyTables?.length?{kind:'info',message:`${person.name} is now ${LABEL[role]}, but can only view ${r.readOnlyTables.join(', ')}. An organization owner sets table access.`}
    :{kind:'success',message:role==='none'?`${person.name} no longer has access`:`${person.name} is now ${LABEL[role]}`});
   await load();
  }catch(e){chrome.notify({kind:'error',message:(e as Error).message});}finally{setBusy(false);}
 }
 function choose(person:any,role:Role){if(role===person.role)return;if(RANK[role]<RANK[person.role as Role])setAsking({person,role});else void apply(person,role);}
 async function teamDefault(role:string){setBusy(true);try{await call('set_app_team_default',{appId,role});chrome.notify({kind:'success',message:role==='none'?'Only people with a role of their own can open this app':`Team members without a role of their own are now ${LABEL[role as Role]}s`});await load();}catch(e){chrome.notify({kind:'error',message:(e as Error).message});}finally{setBusy(false);}}
 if(error)return <section className="ty-app-people" aria-label="People and roles"><p role="alert">{error}</p></section>;
 if(!data)return <section className="ty-app-people" aria-label="People and roles"><p role="status">Loading people…</p></section>;
 const canChange=!readOnly,owner=data.role==='owner';
 // Owners may set anything. Everyone else may only raise someone up to their own role.
 const options=(p:any):Role[]=>owner?['owner','editor','viewer','none']:(['viewer','editor','owner'] as Role[]).filter(r=>data.canGrant.includes(r)&&RANK[r]>RANK[p.role as Role]);
 const why=(p:any)=>p.source==='organization_owner'?'Organization owner':p.source==='granted'?`Granted by ${p.grantedBy??'someone who left'} on ${grantedWhen(p.grantedAt)}`:p.source==='team_default'?'Team default':p.kind==='guest'?'Guest':'';
 const people=[...data.people].sort((a:any,b:any)=>RANK[b.role as Role]-RANK[a.role as Role]||a.name.localeCompare(b.name));
 return <section className="ty-app-people" aria-label="People and roles" aria-busy={busy}>
  <div className="ty-app-people-head"><h3>People and roles</h3><span className={'ty-role ty-role--'+data.role}>You: {LABEL[data.role as Role]}</span></div>
  {requests.length>0&&<ul className="ty-app-people-list ty-app-people-requests" aria-label="Access requests">{requests.map((r:any)=><li key={r.id}><span className="ty-app-people-name"><b>{r.name} asks to {r.role==='editor'?'edit':'view'} this app</b>{r.note&&<small>{r.note}</small>}</span><span className="ty-actions">{r.canDecline&&<button type="button" className="ty-button" disabled={busy} onClick={()=>void answer(r,false)}>Decline</button>}{r.canApprove&&<button type="button" className="ty-button ty-button--primary" disabled={busy} onClick={()=>void answer(r,true)}>Approve</button>}</span></li>)}</ul>}
  {owner&&<label className="ty-app-people-default"><span><b>Team default</b><small>The role team members have when nobody set one for them. Guests never get it.</small></span>
   <select aria-label="Team default role" value={data.teamDefault} disabled={!canChange||busy} onChange={e=>void teamDefault(e.target.value)}><option value="editor">Editor</option><option value="viewer">Viewer</option><option value="none">No access</option></select></label>}
  <ul className="ty-app-people-list">{people.map((p:any)=>{const choices=options(p),fixed=!canChange||p.self||p.organizationOwner||!choices.length;
   return <li key={p.userId}><span className="ty-app-people-name"><b>{p.name}{p.self?' (you)':''}</b><small>{[owner&&p.email,why(p)].filter(Boolean).join(' · ')}</small></span>
    {fixed?<span className={'ty-role ty-role--'+p.role} title={WHAT[p.role as Role]}>{LABEL[p.role as Role]}</span>
    :<select aria-label={'Role for '+p.name} value={p.role} disabled={busy} title={WHAT[p.role as Role]} onChange={e=>choose(p,e.target.value as Role)}>{!choices.includes(p.role)&&<option value={p.role}>{LABEL[p.role as Role]}</option>}{choices.map(r=><option key={r} value={r}>{LABEL[r]}</option>)}</select>}</li>;})}</ul>
  {!owner&&canChange&&data.canGrant.length>0&&<p className="ty-app-people-help">You can share this app with teammates as {data.canGrant.filter((r:Role)=>r!=='owner').map((r:Role)=>LABEL[r]).join(' or ')}. Only an owner can lower or remove access.</p>}
  {readOnly&&<p className="ty-app-people-help">Roles are changed by a signed-in person in TrialAgents.{onManage&&<> <button type="button" className="ty-button" onClick={onManage}>Open TrialAgents</button></>}</p>}
  {asking&&<div className="ty-content-overlay"><section className="ty-confirm-dialog" role="alertdialog" aria-modal="true" aria-label="Change access"><h2>{asking.role==='none'?`Remove ${asking.person.name}'s access?`:`Make ${asking.person.name} ${asking.role==='editor'?'an Editor':'a Viewer'}?`}</h2>
   <p>{asking.role==='none'?`${asking.person.name} will no longer be able to open this app. Only an owner can give access back.`:`${asking.person.name} will have less access than now: ${WHAT[asking.role].toLowerCase()}.`}</p>
   <div className="ty-actions"><button className="ty-button" autoFocus onClick={()=>setAsking(null)}>Cancel</button><button className="ty-button ty-button--primary" onClick={()=>void apply(asking.person,asking.role)}>{asking.role==='none'?'Remove access':'Change role'}</button></div></section></div>}
 </section>;
}
