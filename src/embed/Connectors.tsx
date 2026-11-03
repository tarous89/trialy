import React,{useEffect,useState} from 'react';
import {ChatGPTConnector} from '../shared/ChatGPTConnector.js';
import {Button,SearchField} from '../shared/ui/Controls.js';
import {PagePagination} from '../shared/ui/PagePagination.js';
type Call=(name:string,args:any)=>Promise<any>;
export function EmbeddedConnectors({workspaceId,call}:{workspaceId:string;call:Call}){
 const [data,setData]=useState<any>(null),[chat,setChat]=useState<any>(null),[selected,setSelected]=useState<any>(null),[query,setQuery]=useState(''),[offset,setOffset]=useState(0),[revision,setRevision]=useState(0),[error,setError]=useState('');
 const invoke=async(name:string,args:any={})=>{
  if(name==='control_automation_runner')args={...args,confirmed:true};
  if(name==='confirm_app_service_review'){const review=await call('read_app_service_review',{workspaceId,reviewId:args.reviewId});args={...args,kind:review.kind,review:review.review};}
  return call(name,{...args,workspaceId});
 };
 useEffect(()=>{let live=true;setError('');setData(null);void invoke('list_connectors',{offset,query}).then(r=>{if(live)setData(r);}).catch(e=>{if(live)setError(e.message);});void invoke('read_automation_connector').then(r=>{if(live)setChat(r);}).catch(e=>{if(live&&e.status!==403)setError(e.message);});return()=>{live=false;};},[workspaceId,offset,query,revision]);
 const open=async(id:string)=>{setError('');try{setSelected(await invoke('read_connector',{connectionId:id}));}catch(e:any){setError(e.message);}};
 return <section className="ty-connectors"><div className="ty-page-heading"><h1>{selected?.config?.name??'Connectors'}</h1>{selected&&<Button onClick={()=>setSelected(null)}>Back to connectors</Button>}</div>{error&&<p role="alert">{error}</p>}{selected?<><p>{selected.config.description}</p><p>{selected.config.enabled?'Enabled':'Disabled'} · Credentials: {selected.credentialStatus?.replaceAll('_',' ')??'Not available'}</p><h2>Operations</h2>{selected.config.operations.map((op:any)=><section className="settings-card" key={op.id}><h3>{op.name}</h3><p>{op.method} {op.path}</p><p>{op.effect==='read'?'Read data':'External action'}</p></section>)}</>:<><SearchField label="Search connectors" value={query} onChange={v=>{setQuery(v);setOffset(0);}}/>{chat&&offset===0&&'chatgpt'.includes(query.toLowerCase().trim())&&<ChatGPTConnector data={chat} call={invoke} onChanged={()=>setRevision(n=>n+1)}/>} {!data?<p role="status">Loading connectors…</p>:<><div className="ty-layout-scroll"><table><thead><tr><th>Name</th><th>Status</th><th/></tr></thead><tbody>{data.connections.map((c:any)=><tr key={c.id}><td>{c.name}</td><td>{c.enabled?'Enabled':'Disabled'}</td><td><Button onClick={()=>void open(c.id)}>Open</Button></td></tr>)}</tbody></table></div><PagePagination offset={offset} pageSize={25} total={data.total} busy={false} onPage={setOffset}/></>}</>}</section>;
}
