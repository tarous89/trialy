import React,{useState} from 'react';
import {usePlatformChrome} from '../shared/PlatformChrome.js';
type Removal={name:string;apps:number;automations:number};
/** A11: what removing this person changes, in plain words. */
export function removalEffects(r:Removal,done=false){
 const apps=r.apps===1?'Their app':`Their ${r.apps} apps`,automations=r.automations===1?'1 automation':`${r.automations} automations`;
 return [r.apps?`${apps} ${done?'moved':'will move'} to you.`:'',r.automations?`${automations} ${done?r.automations===1?'was':'were':'will be'} switched off.`:''].filter(Boolean).join(' ');
}
/** Remove one team member from the organization, after showing what will happen. */
export function RemoveMember({api,base,member,onRemoved}:{api:(p:string,m?:string,b?:unknown)=>Promise<any>;base:string;member:{id:string;name:string};onRemoved:()=>void}){
 const chrome=usePlatformChrome(),[plan,setPlan]=useState<Removal|null>(null),[busy,setBusy]=useState(false),path=`${base}/members/${member.id}`;
 const run=async(work:()=>Promise<void>)=>{setBusy(true);try{await work();}catch(e){chrome.notify({kind:'error',message:(e as Error).message});}finally{setBusy(false);}};
 return <><button className="ty-button" disabled={busy} onClick={()=>void run(async()=>setPlan(await api(path+'/removal')))}>Remove</button>
  {plan&&<div className="ty-content-overlay"><section className="ty-confirm-dialog" role="alertdialog" aria-modal="true" aria-label={`Remove ${plan.name}`}><h2>Remove {plan.name} from the organization?</h2>
   <p>{plan.name} will lose access to everything in this organization. {removalEffects(plan)}</p>
   <div className="ty-actions"><button className="ty-button" autoFocus disabled={busy} onClick={()=>setPlan(null)}>Cancel</button><button className="ty-button ty-button--primary" disabled={busy} onClick={()=>void run(async()=>{const done:Removal=await api(path,'DELETE');setPlan(null);chrome.notify({kind:'success',message:`${done.name} was removed from the organization. ${removalEffects(done,true)}`.trim()});onRemoved();})}>Remove {plan.name}</button></div>
  </section></div>}</>;
}
