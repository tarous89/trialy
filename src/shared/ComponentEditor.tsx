import {FrontendCodeRuntime} from './FrontendCodeRuntime.js';
import {ComponentRuntime} from './ComponentRuntime.js';
import {ProjectSharing} from './ProjectSharing.js';
import React,{useState} from 'react';
type Call=(name:string,args:Record<string,unknown>)=>Promise<any>;
export function ComponentEditor({component,projects,call,onBack,onPreview}:{component:any;projects:any[];call:Call;onBack:()=>void;onPreview:(p:any)=>void}){
 const [showInterface,setShowInterface]=useState(['frontend-js','trialy-ui'].includes(component.format));
 const [sharing,setSharing]=useState(false);
 const [name,setName]=useState(component.name??''),[source,setSource]=useState(component.source??''),[format,setFormat]=useState(component.format??'frontend-js');
 const [project,setProject]=useState(component.project_id),[history,setHistory]=useState<any[]|null>(null),[revision,setRevision]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function act(fn:()=>Promise<void>){setError('');setBusy(true);try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function prepare(operation:any){onPreview(await call('prepare_workspace_change',{operation}));}
 const target={componentId:component.id,expectedVersion:component.version};
 if(showInterface)return <section><button onClick={onBack}>← Project</button><h3>{component.name}</h3><button onClick={()=>setShowInterface(false)}>Edit configuration / history</button>{component.format==='frontend-js'?<FrontendCodeRuntime key={component.id+':'+component.version} component={component} call={call} onProposal={onPreview}/>:<ComponentRuntime component={component} call={call} onPreview={onPreview}/>}</section>;
 if(sharing)return <ProjectSharing target={component} component call={call} onPreview={onPreview} onBack={()=>setSharing(false)}/>;
 return <section aria-label="Saved component"><button onClick={onBack}>← Project</button>{error&&<p role="alert">{error}</p>}
 {revision?<><button onClick={()=>setRevision(null)}>← Revision list</button><h3>Revision {revision.version}</h3><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{revision.snapshot.source}</pre><p>Recovery creates a new revision. It keeps the current project and archive state.</p><button disabled={busy} onClick={()=>act(()=>prepare({kind:'restore_component',...target,revisionVersion:revision.version}))}>Review recovery</button></>
 :history?<><button onClick={()=>setHistory(null)}>← Component</button><h3>Revision history</h3>{history.map(r=><p key={r.id}><button onClick={()=>setRevision(r)}>Revision {r.version} · {r.snapshot.name}</button></p>)}</>
 :<><h3>{component.id?'Edit saved component':'New component'}</h3><p>Frontend code runs under the documented HTML/CSS/JavaScript render/event contract. Other HTML and JavaScript formats are source-only. Saving does not change linked database records.</p>
 <label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Format<select value={format} onChange={e=>setFormat(e.target.value)}>{['frontend-js','text','markdown','json','javascript','html',...(component.format==='trialy-ui'?['trialy-ui']:[])].map(f=><option key={f}>{f}</option>)}</select></label>
 <label>Source / configuration<textarea rows={16} value={source} onChange={e=>setSource(e.target.value)} spellCheck={false}/></label>
 <button disabled={busy||!name.trim()} onClick={()=>act(()=>prepare({kind:'save_component',projectId:component.project_id,...(component.id?target:{}),content:{name,format,source,bindings:component.bindings??[]}}))}>Review save</button>
 {component.id&&<>{['frontend-js','trialy-ui'].includes(component.format)&&<button onClick={()=>setShowInterface(true)}>Open interface</button>}<button onClick={()=>setSharing(true)}>Sharing</button><button disabled={busy} onClick={()=>act(async()=>setHistory(await call('read_component_history',{componentId:component.id}))) }>Revision history</button>
 <label>Move to project<select value={project} onChange={e=>setProject(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button disabled={busy||project===component.project_id} onClick={()=>act(()=>prepare({kind:'move_component',...target,projectId:project}))}>Review move</button>
 <button disabled={busy} onClick={()=>act(()=>prepare({kind:'archive_component',...target,archived:!component.archived}))}>{component.archived?'Review unarchive':'Review archive'}</button><p>Revision {component.version}. Moves and recovery preserve the component ID, data bindings, and history.</p></>}
 </>}
 </section>;
}
