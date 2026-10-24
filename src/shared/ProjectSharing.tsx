import {PageBack} from './ui/PageNavigation.js';
import React,{useEffect,useState} from 'react';
export function ProjectSharing({target,component=false,call,onPreview,onBack}:{target:any;component?:boolean;call:(n:string,v:Record<string,unknown>)=>Promise<any>;onPreview:(p:any)=>void;onBack:()=>void}){
 const [members,setMembers]=useState<any[]>([]),[all,setAll]=useState(target.allowed_users==null),[users,setUsers]=useState<string[]>(target.allowed_users??[]),[ai,setAi]=useState(target.ai_enabled!==false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{call('list_project_sharing_members',{}).then(setMembers).catch(e=>setError(e.message));},[]);
 return <section aria-label="Sharing"><PageBack onClick={onBack}>← Back</PageBack><h3>Sharing: {target.name}</h3><p>Only the owner can change these settings. Workspace and parent-folder restrictions still apply. These settings do not grant access to database records or original documents. The human owner retains access.</p>
 {error&&<p role="alert">{error}</p>}<label><input type="checkbox" checked={all} onChange={e=>setAll(e.target.checked)}/>All eligible workspace members</label>
 {!all&&members.map(m=><label key={m.id}><input type="checkbox" checked={users.includes(m.id)} onChange={()=>setUsers(users.includes(m.id)?users.filter(id=>id!==m.id):[...users,m.id])}/>{m.name}</label>)}
 <label><input type="checkbox" checked={ai} onChange={e=>setAi(e.target.checked)}/>Allow ChatGPT, subject to each user's existing AI permissions</label>
 <button disabled={busy} onClick={async()=>{setBusy(true);setError('');try{onPreview(await call('prepare_workspace_change',{operation:{kind:component?'set_component_access':'set_project_access',...(component?{componentId:target.id}:{nodeId:target.id}),expectedVersion:target.version,allowedUsers:all?null:users,ai}}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>Review sharing change</button>
 </section>;
}
