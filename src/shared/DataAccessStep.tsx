import React,{useEffect,useRef,useState} from 'react';
import {Button} from './ui/Controls.js';
import {Icon} from './ui/Icon.js';
import './ui/data-access.css';
type Call=(name:string,args:any)=>Promise<any>;
export type DataAccessChoices={connections:Record<string,string>;consumers:{appId:string;role:string;connect:boolean}[];access:{subject:string;level:string}[]};
const levelLabel:Record<string,string>={none:'No access',view:'Can view',edit:'Can edit',read:'Read',propose:'Read and propose'};

/** Footer summary, as the server words it: "Connects 3 tables, gives Programs read access to 1, team access unchanged". */
export function dataAccessSummary(step:any,c:DataAccessChoices){
 const connected=step.existing.filter((r:any)=>(c.connections[r.role]??r.choice)!=='skip').length;
 const apps=step.consumers.filter((x:any)=>c.consumers.find(y=>y.appId===x.appId&&y.role===x.role)?.connect??x.connect);
 const current=new Map([...step.access.people,...step.access.workers].map((x:any)=>[x.id,x.level]));
 const changed=c.access.filter(x=>current.get(x.subject)!==x.level).length;
 const parts=[connected?`Connects ${connected} ${connected===1?'table':'tables'}`:'Connects no existing tables'];
 if(apps.length)parts.push(`gives ${[...new Set(apps.map((x:any)=>x.appName))].join(', ')}${apps.every((x:any)=>x.mode==='read')?' read':''} access to ${apps.length}`);
 parts.push(changed?`changes access for ${changed}`:'team access unchanged');
 return parts.join(', ');
}

/**
 * The data access step (modular apps §7): one popup in the style of the Access tab, shown on every app add or save
 * with new or changed bindings. Save commits the app, its connections and access together; Cancel changes nothing.
 */
export function DataAccessDialog({step,onSave,onCancel}:{step:any;onSave:(choices:DataAccessChoices)=>Promise<void>;onCancel:()=>void}){
 const prepared=step.prepared??{};
 const [connections,setConnections]=useState<Record<string,string>>(()=>Object.fromEntries(step.existing.map((r:any)=>[r.role,prepared.connections?.[r.role]??r.choice])));
 const [consumers,setConsumers]=useState<Record<string,boolean>>(()=>Object.fromEntries(step.consumers.map((c:any)=>[c.appId+':'+c.role,prepared.consumers?.find((x:any)=>x.appId===c.appId&&x.role===c.role)?.connect??c.connect])));
 const [levels,setLevels]=useState<Record<string,string>>(()=>Object.fromEntries([...step.access.people,...step.access.workers].map((x:any)=>[x.id,prepared.access?.find((y:any)=>y.subject===x.id)?.level??x.level])));
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{dialog.current?.showModal?.();},[]);
 const choices=():DataAccessChoices=>({connections,consumers:step.consumers.map((c:any)=>({appId:c.appId,role:c.role,connect:consumers[c.appId+':'+c.role]})),access:Object.entries(levels).map(([subject,level])=>({subject,level}))});
 async function save(){setBusy(true);setError('');try{await onSave(choices());}catch(e){setError((e as Error).message);setBusy(false);}}
 const toggle=(label:string,value:boolean,set:(v:boolean)=>void,skip='Do not connect',disabled=false)=><div className="ty-data-access-toggle" role="radiogroup" aria-label={label}>
  <button type="button" role="radio" aria-checked={value} className={value?'is-selected':''} disabled={disabled||busy} onClick={()=>set(true)}>Connect</button>
  <button type="button" role="radio" aria-checked={!value} className={!value?'is-selected':''} disabled={busy} onClick={()=>set(false)}>{skip}</button></div>;
 const mode=(m:string)=><span className={'ty-data-access-mode '+(m==='write'?'is-write':'is-read')}>{m==='write'?'Read & write':'Read'}</span>;
 const title=step.target?.name?`Data access for ${step.target.name}`:'Data access';
 return <dialog ref={dialog} className="ty-data-access" aria-label="Data access" onCancel={e=>{e.preventDefault();if(!busy)onCancel();}}>
  <div className="ty-data-access-head"><h2>{title}</h2><p>Choose which existing data this app connects to, which other apps can use its data, and who can use it. Nothing connects until you save.</p></div>
  <div className="ty-access-grid ty-data-access-grid" role="table" aria-label="Data access">
   <div className="ty-access-grid-section" role="row"><h3>Existing data this app can use</h3></div>
   {step.existing.length?step.existing.map((r:any)=>{const value=connections[r.role],selected=r.candidates.find((c:any)=>c.typeId===value)??r.candidates.find((c:any)=>!c.restricted),connect=value!=='skip';
    return <div key={r.role} role="row" className={`ty-access-grid-row ${connect?'':'is-changed'}`} data-role={r.role}>
     <div role="cell" className="ty-access-resource-name"><Icon name="database" size={16}/><span><strong>{selected?.name??r.name}</strong><small>{r.name} · <code>{r.role}</code>{r.contract?' '+r.contract:''}{selected?.apps?.length?' · used by '+selected.apps.join(', '):''}{selected&&!selected.restricted&&selected.records!==null?` · ${selected.records} ${selected.records===1?'record':'records'}`:''}{selected?.restricted?' · restricted':''}{r.remembered?' · you chose not to connect before':''}</small>
      {r.candidates.length>1&&connect&&<select aria-label={'Table for '+r.name} value={value} disabled={busy} onChange={e=>setConnections({...connections,[r.role]:e.target.value})}>{r.candidates.map((c:any)=><option key={c.typeId} value={c.typeId} disabled={c.restricted}>{c.name}{c.restricted?' (restricted)':''}</option>)}</select>}</span></div>
     <div role="cell">{mode(r.mode)}</div>
     <div role="cell">{toggle(r.name,connect,v=>setConnections({...connections,[r.role]:v?(selected&&!selected.restricted?selected.typeId:'skip'):'skip'}),r.optional?'Do not connect':'Use separate data',!selected||selected.restricted)}</div>
    </div>;}):<p className="ty-access-empty">No existing tables match this app’s roles.</p>}
   <div className="ty-access-grid-section" role="row"><h3>Other apps that can use this app’s data</h3></div>
   {step.consumers.length?step.consumers.map((c:any)=>{const key=c.appId+':'+c.role;return <div key={key} role="row" className={`ty-access-grid-row ${consumers[key]?'':'is-changed'}`} data-consumer={key}>
     <div role="cell" className="ty-access-resource-name"><Icon name="tracker" size={16}/><span><strong>{c.appName}</strong><small>{c.name} · <code>{c.role}</code> {c.contract}</small></span></div>
     <div role="cell">{mode(c.mode)}</div>
     <div role="cell">{toggle(c.appName+' · '+c.name,consumers[key],v=>setConsumers({...consumers,[key]:v}))}</div>
    </div>;}):<p className="ty-access-empty">No other app is waiting for this app’s data.</p>}
   <div className="ty-access-grid-section" role="row"><h3>Who can use this app</h3></div>
   {[...step.access.people.map((p:any)=>({...p,icon:'eye' as const})),...step.access.workers.map((x:any)=>({...x,icon:'automation' as const}))].map((x:any)=><div key={x.id} role="row" className={`ty-access-grid-row ${levels[x.id]!==x.level?'is-changed':''}`} data-subject={x.id}>
     <div role="cell" className="ty-access-resource-name"><Icon name={x.icon} size={16}/><span><strong>{x.name}</strong><small>{x.role?x.role[0].toUpperCase()+x.role.slice(1):x.hint}</small></span></div>
     <div role="cell"/>
     <div role="cell"><select aria-label={'Access for '+x.name} className={'permission-select '+(levels[x.id]==='none'?'is-restricted':levels[x.id]==='edit'||levels[x.id]==='propose'?'can-edit':'can-view')} value={levels[x.id]} disabled={busy||!step.access.canChange} onChange={e=>setLevels({...levels,[x.id]:e.target.value})}>{x.levels.map((l:string)=><option key={l} value={l}>{levelLabel[l]}</option>)}</select></div>
    </div>)}
   {(step.access.note||(!step.access.people.length&&!step.access.workers.length))&&<p className="ty-access-empty">{step.access.note??'Access follows the project.'}</p>}
  </div>
  {error&&<p role="alert">{error}</p>}
  <div className="ty-data-access-foot"><p className="ty-data-access-summary" role="status">{dataAccessSummary(step,choices())}.</p><div className="ty-actions"><Button disabled={busy} onClick={onCancel}>Cancel</Button><Button variant="primary" disabled={busy} onClick={()=>void save()}>{busy?'Saving…':'Save'}</Button></div></div>
 </dialog>;
}

/**
 * Gate for an app add or save: reads the step for the target; when nothing is new, runs `fallback` (the plain save).
 * Otherwise shows the step and resolves with the receipt of the reviewed save, or null on Cancel.
 */
export function useDataAccessStep(call:Call,save?:(target:any,choices:DataAccessChoices&{stepDigest:string})=>Promise<any>){
 const [open,setOpen]=useState<{step:any;target:any;resolve:(r:any)=>void}|null>(null);
 async function gate(target:any,fallback:()=>Promise<any>):Promise<any>{
  const step=await call('read_data_access',target).catch(()=>null);
  if(!step?.needed)return fallback();
  return new Promise(resolve=>setOpen({step,target,resolve}));
 }
 const element=open&&<DataAccessDialog key={open.step.digest} step={open.step} onCancel={()=>{open.resolve(null);setOpen(null);}} onSave={async choices=>{const receipt=save?await save(open.target,{...choices,stepDigest:open.step.digest}):await call('confirm_data_access',{...open.target,...choices,stepDigest:open.step.digest,confirmed:true});open.resolve(receipt);setOpen(null);}}/>;
 return {gate,element};
}

/** Access tab: connections the user chose not to make, each reopened with Connect in the same data access step. */
export function DataConnections({call,refreshKey}:{call:Call;refreshKey?:unknown}){
 const [items,setItems]=useState<any[]>([]),[reload,setReload]=useState(0),[error,setError]=useState(''),dataAccess=useDataAccessStep(call);
 useEffect(()=>{let live=true;call('list_data_connections',{}).then(r=>{if(live)setItems(r?.connections??[]);}).catch(()=>{if(live)setItems([]);});return()=>{live=false;};},[refreshKey,reload]);
 if(!items.length)return dataAccess.element||null;
 async function connect(appId:string){setError('');try{await dataAccess.gate({componentId:appId},async()=>null);setReload(n=>n+1);}catch(e){setError((e as Error).message);}}
 return <section className="ty-data-connections" aria-label="Data connections not made"><h3>Data connections not made</h3><p>You chose “Do not connect” for these. They are not asked again on save.</p>
  <ul>{items.map(c=><li key={c.appId+':'+c.role}><span><strong>{c.appName}</strong> · {c.name} <code>{c.role}</code></span><Button onClick={()=>void connect(c.appId)}>Connect</Button></li>)}</ul>{error&&<p role="alert">{error}</p>}{dataAccess.element}</section>;
}
