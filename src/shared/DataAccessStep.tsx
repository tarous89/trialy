import {RecipeChoices,defaultRecipeChoices,type RecipeSelection} from './RecipeChoices.js';
import React,{useState} from 'react';
import {Button} from './ui/Controls.js';
import './ui/data-access.css';
type Call=(name:string,args:any)=>Promise<any>;
export type DataAccessChoices={automations?:RecipeSelection[];connections:Record<string,string>;access:{subject:string;level:string}[];projectId?:string;teamDefault?:string};
const levelLabel:Record<string,string>={none:'No access',view:'Can view',edit:'Can edit',read:'Can read',propose:'Can propose edits'};
const teamLabel:Record<string,string>={editor:'Editor',viewer:'Viewer',none:'No access'};
const teamHelp:Record<string,string>={editor:'Team members can use the app and edit its records.',viewer:'Team members can open the app and read its records.',none:'Only people you add in Access can open the app.'};
const useLabel:Record<string,string>={read:'Read',write:'Read/write'};
const unavailable:Record<string,string>={archived:'Archived',not_available:'Not available to you'};

/**
 * I2, I3: the one installation popup. App name and purpose, then three sections in order: Project and team access,
 * Table connections, Optional automations. One Install action and one Cancel. Technical detail stays expandable.
 * `kind="catalog"` shows a catalog template's step; `kind="app"` the first save of any other new app.
 */
export function InstallationPopup({kind,step,onInstall,onCancel,actionLabel='Install'}:{kind:'catalog'|'app'|'change';step:any;onInstall:(choices:any)=>Promise<void>;onCancel:()=>void;actionLabel?:string}){
 if(kind==='change')return <ChangePopup step={step} onInstall={onInstall} onCancel={onCancel} actionLabel={actionLabel}/>;
 const catalog=kind==='catalog';
 const [project,setProject]=useState<string>(step.project?.choice??'');
 const [team,setTeam]=useState<string>(step.team?.choice??'editor');
 const [choices,setChoices]=useState<Record<string,string>>(()=>Object.fromEntries((step.tables??[]).filter((t:any)=>catalog||t.status!=='new').map((t:any)=>catalog?[t.role,step.prepared?.[t.role]??t.choice]:[t.typeId,t.choice])));
 const subjects=catalog?[...(step.access?.people??[]),...(step.access?.assistants??[])]:[];
 const [levels,setLevels]=useState<Record<string,string>>(()=>Object.fromEntries(subjects.map((x:any)=>[x.id,x.level])));
 const [automations,setAutomations]=useState(()=>defaultRecipeChoices(step.automations??[]));
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function install(){setBusy(true);setError('');try{
  const base={projectId:project||undefined,teamDefault:team};
  await onInstall(catalog?{...base,automations,connections:choices,access:subjects.filter((x:any)=>levels[x.id]!==x.level).map((x:any)=>({subject:x.id,level:levels[x.id]}))}:{...base,connections:choices});
 }catch(e){setError((e as Error).message);setBusy(false);}}
 const tables:any[]=step.tables??[];
 return <div className="ty-content-overlay"><section className="ty-confirm-dialog ty-data-access ty-installation" role="dialog" aria-modal="true" aria-labelledby="installation-title">
  <h2 id="installation-title">Install {step.app?.name??step.app}</h2>
  {(step.app?.purpose??step.purpose)&&<p className="ty-installation-purpose">{step.app?.purpose??step.purpose}</p>}

  <h3 className="ty-data-access-subhead">Project and team access</h3>
  <ul className="ty-data-access-list">
   <li><span>Project</span><select aria-label="Project" value={project} disabled={busy||!(step.project?.options?.length>1)} onChange={e=>setProject(e.target.value)}>{(step.project?.options??[]).map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></li>
   <li><span>Team members</span><select aria-label="Team access" value={team} disabled={busy} onChange={e=>setTeam(e.target.value)}>{(step.team?.options??['editor','viewer','none']).map((r:string)=><option key={r} value={r}>{teamLabel[r]}</option>)}</select></li>
  </ul>
  <p className="ty-installation-note">You become the app’s owner. {teamHelp[team]} Moving the app to a project does not change who can see its data.</p>
  {subjects.length>0&&<details className="ty-app-functions"><summary>Individual access</summary><ul className="ty-data-access-list">{subjects.map((x:any)=><li key={x.id}><span>{x.name}</span><select aria-label={'Access for '+x.name} value={levels[x.id]} disabled={busy} onChange={e=>setLevels({...levels,[x.id]:e.target.value})}>{x.levels.map((l:string)=><option key={l} value={l}>{levelLabel[l]}</option>)}</select></li>)}</ul></details>}

  <h3 className="ty-data-access-subhead">Table connections</h3>
  {!tables.length?<p className="ty-installation-note">The app gets its own new tables.</p>:<ul className="ty-data-access-list ty-installation-tables">{tables.map((t:any)=>catalog?<CatalogRow key={t.role} t={t} value={choices[t.role]} busy={busy} onChange={v=>setChoices({...choices,[t.role]:v})}/>:<AppRow key={t.typeId} t={t} value={choices[t.typeId]} busy={busy} onChange={v=>setChoices({...choices,[t.typeId]:v})}/>)}</ul>}

  <h3 className="ty-data-access-subhead">Optional automations</h3>
  {catalog&&!!step.automations?.length?<RecipeChoices recipes={step.automations} value={automations} onChange={setAutomations} recipient={step.automationRecipient} runners={step.automationRunners} disabled={busy}/>
   :!catalog&&step.automations?.length?<><ul className="ty-data-access-list">{step.automations.map((x:any)=><li key={x.key}><span>{x.name}{x.purpose?<small> · {x.purpose}</small>:null}{x.schedule?<small> · {x.schedule}</small>:null}</span></li>)}</ul><p className="ty-installation-note">{step.automationNote}</p></>
   :<p className="ty-installation-note">None.</p>}
  {!!step.functions?.length&&<details className="ty-app-functions"><summary>Includes {step.functions.length} read-only {step.functions.length===1?'function':'functions'} for app briefs and summaries</summary><ul>{step.functions.map((f:any)=><li key={f.name}>{f.purpose}</li>)}</ul><p>They can read this app’s permitted data. You control access in Access.</p></details>}
  {error&&<p role="alert">{error}</p>}
  <div className="ty-actions"><Button disabled={busy} onClick={onCancel}>Cancel</Button><Button variant="primary" disabled={busy} onClick={()=>void install()}>{busy?'Installing…':actionLabel}</Button></div>
 </section></div>;
}

/**
 * 3.4 (A4, I2): an approved change to an existing app that affects access, table connections or automations.
 * The same popup, showing only the affected sections.
 */
function ChangePopup({step,onInstall,onCancel,actionLabel}:{step:any;onInstall:(choices:any)=>Promise<void>;onCancel:()=>void;actionLabel:string}){
 const [choices,setChoices]=useState<Record<string,string>>(()=>Object.fromEntries((step.tables??[]).map((t:any)=>[t.typeId,t.choice])));
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function apply(){setBusy(true);setError('');try{await onInstall({connections:choices});}catch(e){setError((e as Error).message);setBusy(false);}}
 return <div className="ty-content-overlay"><section className="ty-confirm-dialog ty-data-access ty-installation" role="dialog" aria-modal="true" aria-labelledby="installation-title">
  <h2 id="installation-title">Review changes to {step.app?.name??'this app'}</h2>
  <p className="ty-installation-purpose">This change affects who can see the app, the tables it uses or its automations.</p>
  {step.access&&<><h3 className="ty-data-access-subhead">Project and team access</h3><p className="ty-installation-note">{step.access.text}</p></>}
  {(step.tables?.length>0||step.removedTables?.length>0)&&<><h3 className="ty-data-access-subhead">Table connections</h3>
   {step.tables?.length>0&&<ul className="ty-data-access-list ty-installation-tables">{step.tables.map((t:any)=><AppRow key={t.typeId} t={t} value={choices[t.typeId]} busy={busy} onChange={v=>setChoices({...choices,[t.typeId]:v})}/>)}</ul>}
   {step.removedTables?.length>0&&<p className="ty-installation-note">No longer used: {step.removedTables.join(', ')}. Their records stay in place.</p>}</>}
  {(step.automations?.added?.length>0||step.automations?.removed?.length>0)&&<><h3 className="ty-data-access-subhead">Optional automations</h3>
   {step.automations.added.length>0&&<p className="ty-installation-note">Added: {step.automations.added.join(', ')}.</p>}
   {step.automations.removed.length>0&&<p className="ty-installation-note">Removed: {step.automations.removed.join(', ')}.</p>}</>}
  {error&&<p role="alert">{error}</p>}
  <div className="ty-actions"><Button disabled={busy} onClick={onCancel}>Cancel</Button><Button variant="primary" disabled={busy} onClick={()=>void apply()}>{busy?'Saving…':actionLabel}</Button></div>
 </section></div>;
}

/** I3, I4: a catalog role. The suggested existing table, its source and use, then Use existing or Create new on the row. */
function CatalogRow({t,value,busy,onChange}:{t:any;value:string;busy:boolean;onChange:(v:string)=>void}){
 const connect=value!=='new',chosen=t.candidates.find((c:any)=>c.typeId===value)??t.candidates[0];
 return <li>
  <span>{t.candidates.length>1&&connect?<select aria-label={'Table for '+t.name} value={value} disabled={busy} onChange={e=>onChange(e.target.value)}>{t.candidates.map((c:any)=><option key={c.typeId} value={c.typeId}>{c.name}</option>)}</select>:<strong>{connect?chosen.name:t.name}</strong>}
   <small className="ty-installation-source">{connect?`${chosen.apps?.length?'From '+chosen.apps.join(', '):'From Database'} · ${t.readOnly?'Read':'Read/write'}`:t.alternative==='skip'?'Not used':'New table · Read/write'}</small></span>
  <div className="ty-data-access-choice" role="radiogroup" aria-label={t.name}>
   <button type="button" role="radio" aria-checked={connect} disabled={busy} onClick={()=>onChange(t.candidates[0].typeId)}>Use existing</button>
   <button type="button" role="radio" aria-checked={!connect} disabled={busy} onClick={()=>onChange('new')}>{t.alternative==='skip'?'Don’t use':'Create new'}</button>
  </div></li>;
}

/** I4, I5: a table a new app connects to. Read or Read/write on an existing table, or a new empty table. Unavailable sources say so. */
function AppRow({t,value,busy,onChange}:{t:any;value:string;busy:boolean;onChange:(v:string)=>void}){
 if(t.status==='new')return <li><span><strong>{t.name}</strong><small className="ty-installation-source">New table · Read/write</small></span></li>;
 const off=t.status==='unavailable';
 return <li className={off?'is-unavailable':undefined}>
  <span><strong>{t.name}</strong><small className="ty-installation-source">{off?`Unavailable · ${unavailable[t.reason]??'Not available'}`:`${t.own?'Created for this app':'From '+(t.source??'Database')} · ${value==='new'?'replaced by a new table':useLabel[value]??useLabel[t.intended]}`}</small>
   {!off&&t.apps?.length>0&&value==='read'&&t.intended==='write'&&<small className="ty-installation-source">Also used by {t.apps.join(', ')}. Read only unless you allow writing.</small>}</span>
  <div className="ty-data-access-choice" role="radiogroup" aria-label={t.name}>
   {t.options.filter((o:string)=>o!=='new').map((o:string)=><button key={o} type="button" role="radio" aria-checked={value===o} disabled={busy} onClick={()=>onChange(o)}>{t.options.includes('read')&&t.options.includes('write')?(o==='read'?'Use, read only':'Use, read/write'):'Use existing'}</button>)}
   <button type="button" role="radio" aria-checked={value==='new'} disabled={busy} onClick={()=>onChange('new')}>Create new</button>
  </div></li>;
}

/** @deprecated name kept for older imports: the catalog installation popup. */
export function DataAccessDialog({step,onSave,onCancel}:{step:any;onSave:(choices:DataAccessChoices)=>Promise<void>;onCancel:()=>void}){return <InstallationPopup kind="catalog" step={step} onInstall={onSave} onCancel={onCancel}/>;}

/**
 * I2: every catalog installation shows the installation popup and resolves with the installation receipt, or null on Cancel.
 * There is no installation without it: the server refuses a template install that skips the popup.
 */
export function useDataAccessStep(call:Call,save?:(target:any,choices:DataAccessChoices&{stepDigest:string})=>Promise<any>){
 const [open,setOpen]=useState<{step:any;target:any;resolve:(r:any)=>void}|null>(null);
 async function gate(target:any):Promise<any>{
  const step=await call('read_data_access',target);
  return new Promise(resolve=>setOpen({step,target,resolve}));
 }
 const element=open&&<InstallationPopup kind="catalog" key={open.step.digest} step={open.step} onCancel={()=>{open.resolve(null);setOpen(null);}} onInstall={async choices=>{const receipt=save?await save(open.target,{...choices,stepDigest:open.step.digest}):await call('confirm_data_access',{...open.target,...choices,stepDigest:open.step.digest,confirmed:true});open.resolve(receipt);setOpen(null);}}/>;
 return {gate,element};
}
