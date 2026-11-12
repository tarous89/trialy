import React,{useEffect,useRef,useState} from 'react';
import {AppPlatform} from './AppPlatform.js';
import {Button} from './ui/Controls.js';
import {useDataAccessStep} from './DataAccessStep.js';
import './ui/data-access.css';
type Call=(name:string,args:any)=>Promise<any>;

/**
 * Opened from a subtle hint inside an app. Install: add the app that provides this data. Connect: show the app's own entries
 * and the other app's data side by side and let the user choose one source, used from then on. Nothing is merged.
 */
export function IntegrationDialog({call,appId,role,onClose,onChanged}:{call:Call;appId:string;role:string;onClose:()=>void;onChanged:()=>void}){
 const platform=React.useContext(AppPlatform);
 const [data,setData]=useState<any>(null),[choice,setChoice]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const requestKey=useRef(crypto.randomUUID());
 const tpl=(i:any)=>({id:i.templateId,version:i.version,digest:i.digest,name:i.name});
 // Inside ChatGPT or Claude the plugin installs and opens the new app; on the website the user stays here and can connect it.
 const dataAccess=useDataAccessStep(call,platform.useTemplate?async(target,choices)=>{await platform.useTemplate!(tpl(target.install),target.install.requestKey,{dataAccess:choices});return {embedded:true};}:undefined);
 const load=()=>call('read_app_integration',{appId,role}).then(d=>{setData(d);setChoice(d.providers[0]?.typeId??'own');}).catch(e=>setError((e as Error).message));
 useEffect(()=>{void load();},[appId,role]);
 async function add(){const t=data.template;setBusy(true);setError('');try{
  const install={templateId:t.templateId,version:t.version,digest:t.digest,name:t.name,requestKey:requestKey.current};
  const r=await dataAccess.gate({install},async()=>{if(platform.useTemplate){await platform.useTemplate(tpl(install),requestKey.current);return {embedded:true};}return call('install_app_template',install);});
  if(r?.embedded){onClose();return;}
  if(r){await load();onChanged();}
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function save(){setBusy(true);setError('');try{await call('choose_integration_source',{appId,expectedVersion:data.version,role,source:choice,confirmed:true});onChanged();onClose();}catch(e){setError((e as Error).message);setBusy(false);}}
 const lines=(s:any)=>s?.restricted?<small>Restricted</small>:<small>{s?.records??0} {s?.records===1?'entry':'entries'}{s?.recent?.length?' · '+s.recent.join(', '):''}</small>;
 const installing=data&&!data.providers.length;
 // While the add-app dialog is open it replaces this one.
 if(dataAccess.element)return dataAccess.element;
 return <div className="ty-content-overlay"><section className="ty-confirm-dialog ty-data-access" role="dialog" aria-modal="true" aria-labelledby="integration-title">
  {!data?<p role="status">{error||'Loading…'}</p>:installing&&data.restricted?<>
   <h2 id="integration-title">Data not available</h2>
   <p>The app that provides {data.name.toLowerCase()} is in your workspace, but you can’t read its data. Ask the account owner for access.</p>
   <div className="ty-actions"><Button variant="primary" onClick={onClose}>Close</Button></div>
  </>:installing?<>
   <h2 id="integration-title">Add {data.template?.name??'the app'}?</h2>
   <p>{data.template?.name} can provide the {data.name.toLowerCase()} for {data.appName}. Until then, you can enter it here.</p>
   {error&&<p role="alert">{error}</p>}
   <div className="ty-actions"><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy||!data.template} onClick={()=>void add()}>{busy?'Adding…':'Add '+(data.template?.name??'app')}</Button></div>
  </>:<>
   <h2 id="integration-title">Choose a data source</h2>
   <p>Where should {data.appName} get its {data.name.toLowerCase()}? This choice is kept.</p>
   <div className="ty-integration-options" role="radiogroup" aria-label="Data source">
    {data.providers.map((p:any)=><label key={p.typeId} className={choice===p.typeId?'is-selected':''}><input type="radio" name="source" checked={choice===p.typeId} disabled={busy} onChange={()=>setChoice(p.typeId)}/><span><strong>{p.appName}</strong>{lines(p)}</span></label>)}
    {data.own&&<label className={choice==='own'?'is-selected':''}><input type="radio" name="source" checked={choice==='own'} disabled={busy} onChange={()=>setChoice('own')}/><span><strong>{data.appName} entries</strong>{lines(data.own)}</span></label>}
   </div>
   {error&&<p role="alert">{error}</p>}
   <div className="ty-actions"><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy} onClick={()=>void save()}>{busy?'Saving…':'Use selected'}</Button></div>
  </>}
 </section></div>;
}
