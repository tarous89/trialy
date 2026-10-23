import {ChangeSummary} from './ChangeSummary.js';
import React,{useEffect,useState} from 'react';
import {ComponentEditor} from './ComponentEditor.js';
import {CollectionsPanel} from './CollectionsPanel.js';
import {QuestionEditor} from '../web/QuestionEditor.js';
import type {Question} from './questions.js';
type Call=(name:string,args:any)=>Promise<any>;
export function ResourcesPanel({workspaceId,kind,projectId='',types,call}:{workspaceId:string;kind:'tracker'|'form'|'visualization';projectId?:string;types:any[];call:Call}){
 const [items,setItems]=useState<any[]>([]),[projects,setProjects]=useState<any[]>([]),[selected,setSelected]=useState<any>(null),[preview,setPreview]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[url,setUrl]=useState('');
 const [collections,setCollections]=useState(false),[newForm,setNewForm]=useState(false),[name,setName]=useState(''),[typeId,setTypeId]=useState(''),[keys,setKeys]=useState<string[]>([]),[questions,setQuestions]=useState<Question[]>([]),[days,setDays]=useState(30);
 const invoke=(name:string,args:any={})=>call(name,{workspaceId,...args});
 async function act(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function refresh(){const [rows,nodes]=await Promise.all([invoke('list_project_components',projectId?{projectId}:{}),invoke('list_workspace_projects')]);setItems(rows);setProjects(nodes.nodes.filter((p:any)=>p.kind==='project'));}
 useEffect(()=>{setSelected(null);setPreview(null);setNewForm(false);setCollections(false);},[workspaceId,kind]);
 useEffect(()=>{void act(refresh);},[workspaceId,projectId,kind]);
 const fields=(types.find(t=>t.id===typeId)?.fields??[]).filter((f:any)=>!f.formula&&!f.computed&&!f.lookup&&!['document','relationship','person','table','field'].includes(f.kind));
 useEffect(()=>{setQuestions(old=>keys.map(field=>old.find(q=>q.field===field)??{field,required:!!fields.find((f:any)=>f.key===field)?.required,help:''}));},[keys]);
 const title=kind==='tracker'?'Trackers':kind==='form'?'Forms':'Visualizations';
 return <section className="resource-page"><h2>{title}</h2>{error&&<p role="alert">{error}</p>}{url&&<label>Share this link<input readOnly value={url} onFocus={e=>e.target.select()}/></label>}
 {preview?<section><h3>Review before saving</h3><ChangeSummary value={preview.body}/><button disabled={busy} onClick={()=>act(async()=>{await invoke('discard_workspace_preview',{previewId:preview.id});setPreview(null);})}>Discard</button><button disabled={busy} onClick={()=>act(async()=>{const r=await invoke('confirm_workspace_change',{previewId:preview.id,digest:preview.digest,confirmed:true});setUrl(r.url??'');setPreview(null);setNewForm(false);setSelected(null);await refresh();})}>Confirm save</button></section>
 :selected?<ComponentEditor key={selected.id} component={selected} projects={projects} call={invoke} onBack={()=>setSelected(null)} onPreview={setPreview}/>
 :collections?<CollectionsPanel call={invoke} onBack={()=>setCollections(false)} onPreview={setPreview}/>
 :newForm?<form onSubmit={e=>{e.preventDefault();void act(async()=>setPreview(await invoke('prepare_workspace_change',{operation:{kind:'create_collection_link',config:{kind:'form',name,typeId,fields:keys,questions,days,...(projectId?{projectId}:{})}}})));}}><h3>New public form</h3><p>Anyone with the link can submit without signing in. Responses enter your review inbox before becoming working records.</p><label>Title<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label><label>Existing table<select required value={typeId} onChange={e=>{setTypeId(e.target.value);setKeys([]);}}><option value="">Choose a table</option>{types.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><p>Reuse existing fields below. Ask ChatGPT to prepare any missing fields with a schema review.</p>{fields.map((f:any)=><label key={f.key}><input type="checkbox" checked={keys.includes(f.key)} onChange={()=>setKeys(keys.includes(f.key)?keys.filter(k=>k!==f.key):[...keys,f.key])}/>{f.name}{f.required?' (required)':''}</label>)}{!!keys.length&&<QuestionEditor fields={fields} questions={questions} onChange={setQuestions}/>}<label>Link valid for days<input type="number" min={1} max={90} value={days} onChange={e=>setDays(Number(e.target.value))}/></label><button type="button" onClick={()=>setNewForm(false)}>Cancel</button><button disabled={busy||!keys.length}>Review form and link</button></form>
 :<><p>{kind==='visualization'?'Read-only views of connected data.':kind==='tracker'?'Track ongoing work using shared records across projects.':'Collect information through connected forms and public links.'}</p>{kind==='form'&&<><button onClick={()=>setNewForm(true)}>New public form</button><button onClick={()=>setCollections(true)}>All workspace links and responses</button></>}
 {items.filter(c=>c.resource_kind===kind).map(c=><article key={c.id}><button disabled={busy} onClick={()=>act(async()=>setSelected((await invoke('read_project_component',{componentId:c.id})).component))}>{c.name}</button><small> {projects.find(p=>p.id===c.project_id)?.name??'Project'} · revision {c.version}{c.archived?' · archived':''}</small></article>)}
 {!items.some(c=>c.resource_kind===kind)&&<p>No saved {title.toLowerCase()} here yet. Ask ChatGPT to build one using your existing data.</p>}
 {!!items.some(c=>c.resource_kind==='generic')&&<details><summary>Existing unclassified components</summary><p>These keep their original behavior. Classify a component after reviewing its field connections.</p>{items.filter(c=>c.resource_kind==='generic').map(c=><p key={c.id}><button onClick={()=>act(async()=>setSelected((await invoke('read_project_component',{componentId:c.id})).component))}>{c.name}</button></p>)}</details>}
 <button disabled={busy} onClick={()=>act(refresh)}>Refresh</button></>}
 </section>;
}
