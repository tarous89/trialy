import React,{useEffect,useState} from 'react';
export function TemplateUpgrades({api,base,onPreview}:{api:(p:string)=>Promise<any>;base:string;onPreview:(op:any)=>void}){
 const [items,setItems]=useState<any[]>([]),[error,setError]=useState('');
 useEffect(()=>{void api(base+'/template-upgrades').then(setItems).catch(e=>setError(e.message));},[base]);
 return <div className="settings-card"><div><h2>Template upgrades</h2><p>Upgrades preview additions while preserving local edits and saved records. Conflicting field changes require an explicit migration. Older installations without a tracked baseline are preserved and cannot be upgraded automatically.</p>{items.map(t=><div key={t.templateId}><strong>{t.templateId}</strong><p>Installed v{t.installedVersion} · Available v{t.availableVersion}</p>{t.availableVersion>t.installedVersion&&<button onClick={()=>onPreview({kind:'upgrade_template',template:t.templateId,expectedVersion:t.installedVersion})}>Preview upgrade</button>}</div>)}{!items.length&&<p>No tracked installations yet.</p>}{error&&<p role="alert">{error}</p>}</div></div>;
}
