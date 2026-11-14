import {RecipeChoices,defaultRecipeChoices,type RecipeSelection} from './RecipeChoices.js';
import React,{useState} from 'react';
import {Button} from './ui/Controls.js';
import './ui/data-access.css';
type Call=(name:string,args:any)=>Promise<any>;
export type DataAccessChoices={automations?:RecipeSelection[];connections:Record<string,string>;access:{subject:string;level:string}[]};
const levelLabel:Record<string,string>={none:'No access',view:'Can view',edit:'Can edit',read:'Can read',propose:'Can propose edits'};

/** Shown when an app is added: per existing table, connect it or create a new one; and who can use the app. */
export function DataAccessDialog({step,onSave,onCancel}:{step:any;onSave:(choices:DataAccessChoices)=>Promise<void>;onCancel:()=>void}){
 const [choices,setChoices]=useState<Record<string,string>>(()=>Object.fromEntries(step.tables.map((t:any)=>[t.role,step.prepared?.[t.role]??t.choice])));
 const subjects=[...(step.access?.people??[]),...(step.access?.assistants??[])];
 const [levels,setLevels]=useState<Record<string,string>>(()=>Object.fromEntries(subjects.map((x:any)=>[x.id,x.level])));
 const [automations,setAutomations]=useState(()=>defaultRecipeChoices(step.automations??[]));
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const connectAll=()=>setChoices(Object.fromEntries(step.tables.map((t:any)=>[t.role,choices[t.role]!=='new'?choices[t.role]:t.candidates[0].typeId])));
 async function save(){setBusy(true);setError('');try{await onSave({automations,connections:choices,access:subjects.filter((x:any)=>levels[x.id]!==x.level).map((x:any)=>({subject:x.id,level:levels[x.id]}))});}catch(e){setError((e as Error).message);setBusy(false);}}
 return <div className="ty-content-overlay"><section className="ty-confirm-dialog ty-data-access" role="dialog" aria-modal="true" aria-labelledby="data-access-title">
  <h2 id="data-access-title">{step.tables.length?'Use existing data?':`Add ${step.app}`}</h2>
  {step.tables.length>0&&<p>{step.app} can connect to tables already in your database.</p>}
  {step.tables.length>1&&<div className="ty-data-access-all"><Button variant="quiet" disabled={busy} onClick={connectAll}>Connect all</Button></div>}
  {step.tables.length>0&&<ul className="ty-data-access-list">{step.tables.map((t:any)=>{const value=choices[t.role],connect=value!=='new';return <li key={t.role}>
   {t.candidates.length>1&&connect?<select aria-label={'Table for '+t.name} value={value} disabled={busy} onChange={e=>setChoices({...choices,[t.role]:e.target.value})}>{t.candidates.map((c:any)=><option key={c.typeId} value={c.typeId}>{c.name}</option>)}</select>:<span>{t.candidates[0].name}</span>}
   <div className="ty-data-access-choice" role="radiogroup" aria-label={t.name}>
    <button type="button" role="radio" aria-checked={connect} disabled={busy} onClick={()=>setChoices({...choices,[t.role]:t.candidates[0].typeId})}>Connect</button>
    <button type="button" role="radio" aria-checked={!connect} disabled={busy} onClick={()=>setChoices({...choices,[t.role]:'new'})}>{t.alternative==='skip'?'Don’t use':'Create new'}</button>
   </div></li>;})}</ul>}
  {subjects.length>0&&<><h3 className="ty-data-access-subhead">Who can use it</h3>
  <ul className="ty-data-access-list">{subjects.map((x:any)=><li key={x.id}><span>{x.name}</span><select aria-label={'Access for '+x.name} value={levels[x.id]} disabled={busy} onChange={e=>setLevels({...levels,[x.id]:e.target.value})}>{x.levels.map((l:string)=><option key={l} value={l}>{levelLabel[l]}</option>)}</select></li>)}</ul></>}
  {!!step.automations?.length&&<RecipeChoices recipes={step.automations} value={automations} onChange={setAutomations} recipient={step.automationRecipient} runners={step.automationRunners} disabled={busy}/>}
  {error&&<p role="alert">{error}</p>}
  <div className="ty-actions"><Button disabled={busy} onClick={onCancel}>Cancel</Button><Button variant="primary" disabled={busy} onClick={()=>void save()}>{busy?'Adding…':'Add app'}</Button></div>
 </section></div>;
}

/**
 * Gate for adding a template: with no existing tables to connect, runs `fallback` (the app gets new tables).
 * Otherwise shows the dialog and resolves with the installation receipt, or null on Cancel.
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
