import React,{useEffect,useState} from 'react';
import {MyAssistantLimits} from '../shared/AssistantLevels.js';
/** Connected assistants: what each may do for the signed-in person (A4), and disconnecting. */
export function Connections({api,call}:{api:(path:string,method?:string,body?:unknown)=>Promise<any>;call?:(name:string,args?:any)=>Promise<any>}){
 const [items,setItems]=useState<any[]>([]),[error,setError]=useState('');
 const reload=()=>api('/auth/connections').then(setItems).catch(e=>setError(e.message));useEffect(()=>{void reload();},[]);
 return <div className="settings-card"><div><h2>Connections</h2>{call&&<MyAssistantLimits call={call} connected={[...new Set(items.map(i=>i.assistant).filter(Boolean))]}/>}<p>Disconnecting revokes that connection's access and refresh tokens.</p>{items.map(i=><div key={i.family}><strong>{i.name}</strong> <button onClick={()=>void api('/auth/connections/revoke','POST',{family:i.family}).then(reload).catch(e=>setError(e.message))}>Disconnect</button></div>)}{!items.length&&<p>No active application connections.</p>}{error&&<p role="alert">{error}</p>}</div></div>;
}
