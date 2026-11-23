import {AppPlatform} from './AppPlatform.js';
import {useWorkspaceView} from './WorkspaceView.js';
import React,{useEffect,useRef,useState} from 'react';
import {Button,SearchField} from './ui/Controls.js';
import {templateGallery,templateMediaUrl} from './template-gallery.js';
import {useDataAccessStep} from './DataAccessStep.js';
import {useLoadTiming} from './useLoadTiming.js';
import {knownTemplates,rememberTemplates} from './last-known.js';
type Call=(name:string,args:any,options?:{background?:boolean})=>Promise<any>;
/** L3.1: the last template list this page showed, by catalog fingerprint (catalog data only; no account data). */
let heldCatalog:{catalog:string;templates:any[]}|undefined;
export function TemplateCatalog({call}:{call:Call}){
 const platform=React.useContext(AppPlatform);
 const [templates,setTemplates]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[query,setQuery]=useState(''),[team,setTeam]=useState(''),[workflow,setWorkflow]=useState(''),[busy,setBusy]=useState(''),[selected,setSelected]=useState<any>(null),[expanded,setExpanded]=useState(false);
 useWorkspaceView({view:'templates',templateId:selected?.id,templateVersion:selected?.version});
 useLoadTiming('templates',loading,!error);
 const requests=useRef(new Map<string,string>()),dialog=useRef<HTMLDialogElement>(null);
 // Existing tables the app can use: connect each one or create a new one (skipped when there are none).
 const dataAccess=useDataAccessStep(call,platform.useTemplate?async(target,choices)=>{const t=templates.find(x=>x.id===target.install.templateId);await platform.useTemplate!(t,target.install.requestKey,{createNew:!!target.install.createNew,dataAccess:choices});return {embedded:true};}:undefined);
 // L4.1: the list this person last saw on this device, when this page holds none yet; checked by its fingerprint as above.
 useEffect(()=>{let live=true;const held=heldCatalog??=knownTemplates();
  const show=(all:any[])=>{setTemplates(all);const id=new URLSearchParams(location.search).get('template');if(id)setSelected(all.find(t=>t.id===id)??null);};
  // L3.1: a list already shown in this page is shown again at once and checked quietly by its catalog fingerprint;
  // while the catalog is unchanged nothing is re-read or re-sent. A changed catalog replaces it.
  if(held){show(held.templates);setLoading(false);}
  void (async()=>{const all=[];let offset:number|null=0,catalog='';while(offset!==null){const r=await call('list_app_templates',{limit:50,offset,...(held&&offset===0?{catalog:held.catalog}:{})},held?{background:true}:undefined);if(r.unchanged)return;catalog=r.catalog;all.push(...r.templates);offset=r.nextOffset;}
   if(catalog){heldCatalog={catalog,templates:all};rememberTemplates(heldCatalog);}if(live)show(all);})().catch(e=>{if(live&&!held)setError(e.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[]);
 useEffect(()=>{if(selected)dialog.current?.showModal();else dialog.current?.close();},[selected]);
 function close(){setSelected(null);setExpanded(false);}
 async function install(t:any,createNew=false){setError('');setBusy(t.id);const key=t.id+'@'+t.version+(createNew?':new':'');const stored='trialy:install-request:'+key;let requestKey=requests.current.get(key);if(!requestKey){try{requestKey=sessionStorage.getItem(stored)??undefined;}catch{}requestKey??=crypto.randomUUID();requests.current.set(key,requestKey);try{sessionStorage.setItem(stored,requestKey);}catch{}}
  // The key survives a reload, so retrying an interrupted install returns the same app. It is dropped once the install is confirmed.
  const settled=()=>{requests.current.delete(key);try{sessionStorage.removeItem(stored);}catch{}};try{
  setSelected(null);
  const target={install:{templateId:t.id,version:t.version,digest:t.digest,name:t.name,requestKey,...(createNew?{createNew:true}:{})}};
  const r=await dataAccess.gate(target);
  if(!r)return;settled();if(r.embedded)return;if(r.automationStatus==='pending')try{sessionStorage.setItem('trialy:automation-install:'+r.appId,'pending');}catch{}location.assign(r.url);}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 const visible=templates.filter(t=>{const m=templateGallery[t.id];return (!team||m?.team===team)&&(!workflow||m?.workflow===workflow)&&query.toLowerCase().split(/\s+/).every(term=>(t.name+' '+t.description+' '+t.tags.join(' ')).toLowerCase().includes(term));});
 return <section className="ty-template-catalog" aria-label="App templates"><div className="ty-template-catalog-heading"><div><h1>App templates</h1><p>Find your next app. Preview it, then make it yours.</p></div></div><div className="ty-gallery-filters"><SearchField label="Search templates" placeholder="Search by name or workflow…" value={query} onChange={setQuery}/>{(['Team','Workflow'] as const).map(label=><label key={label}>{label}<select aria-label={label} value={label==='Team'?team:workflow} onChange={e=>(label==='Team'?setTeam:setWorkflow)(e.target.value)}><option value="">All {label==='Team'?'teams':'workflows'}</option>{[...new Set(templates.map(t=>templateGallery[t.id]?.[label==='Team'?'team':'workflow']).filter(Boolean))].sort().map(v=><option key={v}>{v}</option>)}</select></label>)}</div>{dataAccess.element}{error&&!selected&&<p role="alert">{error}</p>}{loading?<p role="status">Loading templates…</p>:<><p className="ty-gallery-count" role="status">{visible.length} {visible.length===1?'template':'templates'}</p>{!visible.length?<div className="ty-empty"><h2>No templates match</h2><p>Try another search or clear your filters.</p><Button onClick={()=>{setQuery('');setTeam('');setWorkflow('');}}>Clear filters</Button></div>:<div className="ty-gallery-grid">{visible.map(t=><article key={t.id} className="ty-gallery-card" onPointerEnter={()=>preparePreview(platform,t)} onFocus={()=>preparePreview(platform,t)}><TemplateImage template={t}/><div className="ty-gallery-card-body"><small>{templateGallery[t.id]?.team??'App template'}</small><h2>{t.name}</h2><p className="ty-gallery-summary">{templateGallery[t.id]?.summary??t.name+' for your team.'}</p><p className="ty-gallery-assistants">Customizable and usable in ChatGPT and Claude.</p><div className="ty-gallery-actions"><Button onClick={()=>{setSelected(t);setExpanded(false);}}>Preview</Button><Button variant="primary" disabled={!!busy} onClick={()=>void install(t)}>{busy===t.id?'Adding…':'Use'}</Button></div></div></article>)}</div>}</>}
 <dialog ref={dialog} className={`ty-template-preview ${expanded?'is-expanded':''}`} aria-label={selected?selected.name+' preview':'Template preview'} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}}>{selected&&<div className="ty-template-preview-inner"><header><div><h2>{selected.name}</h2><small>Interactive preview · sample data</small></div><div className="ty-gallery-actions"><button className="ty-preview-icon" aria-label={expanded?'Exit fullscreen preview':'Fullscreen preview'} title={expanded?'Exit fullscreen':'Fullscreen preview'} onClick={()=>setExpanded(!expanded)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={expanded?'M9 3v6H3m12-6v6h6M9 21v-6H3m12 6v-6h6':'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6'}/></svg></button><Button variant="primary" disabled={!!busy} onClick={()=>void install(selected)}>{busy?'Adding…':'Use'}</Button><button className="ty-preview-icon" aria-label="Close preview" onClick={close}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></div></header>{error&&<p role="alert">{error}</p>}{!expanded&&<p className="ty-preview-description">{selected.description}</p>}<TemplatePreview key={selected.id} template={selected}/></div>}</dialog>
 </section>;
}

function useTemplateMedia(template:any,kind:'preview'){
 const platform=React.useContext(AppPlatform),[media,setMedia]=useState(''),[error,setError]=useState(false);
 useEffect(()=>{if(!platform.readTemplateMedia)return;let live=true;setMedia('');setError(false);void platform.readTemplateMedia(template.id,template.version,kind,template.digest).then(value=>{if(live)setMedia(value);}).catch(()=>{if(live)setError(true);});return()=>{live=false;};},[template.id,template.version,template.digest,kind,platform.readTemplateMedia]);
 return {media,error,embedded:!!platform.readTemplateMedia};
}
/** L3.4: a card's interactive preview is prepared when the card is hovered or focused, quietly (no loading bar), and kept by
 * its catalog digest: the website's browser keeps the exact address, the plugin widget keeps the answer. */
const preparedPreviews=new Set<string>();
function preparePreview(platform:React.ContextType<typeof AppPlatform>,t:any){
 const key=t.id+'@'+t.version+'#'+t.digest;if(!t.digest||preparedPreviews.has(key))return;preparedPreviews.add(key);
 const forget=()=>{preparedPreviews.delete(key);};
 if(platform.readTemplateMedia){void platform.readTemplateMedia(t.id,t.version,'preview',t.digest).catch(forget);return;}
 // Browsers keep frame documents apart from other requests, so the preview is prepared the way it is shown: in a frame.
 // This one is hidden and runs no scripts; its document stays in the browser cache under the exact address.
 const frame=document.createElement('iframe');frame.hidden=true;frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');frame.setAttribute('sandbox','');frame.referrerPolicy='no-referrer';
 const done=()=>{clearTimeout(timer);frame.remove();},timer=setTimeout(()=>{forget();done();},30000);
 frame.addEventListener('load',done,{once:true});frame.src=templateMediaUrl(t.id,t.version,'preview',t.digest);document.body.appendChild(frame);
}
/** L3.3: once the host refuses one direct card image, the others are read through the host instead. */
let directCardsRefused=false;
function TemplateImage({template:t}:{template:any}){
 const platform=React.useContext(AppPlatform);
 // L3.2: the website shows the card-size image, kept by the browser for good under its catalog digest.
 if(!platform.readTemplateMedia)return <img className="ty-gallery-screenshot" src={templateMediaUrl(t.id,t.version,'card',t.digest)} alt={`${t.name} screenshot`} loading="lazy" width="720" height="480"/>;
 return <EmbeddedTemplateImage template={t}/>;
}
function EmbeddedTemplateImage({template:t}:{template:any}){
 const platform=React.useContext(AppPlatform),direct=directCardsRefused?undefined:platform.templateCardUrl?.(t);
 const [mode,setMode]=useState<'direct'|'read'|'error'>(direct?'direct':'read'),[media,setMedia]=useState(''),ref=useRef<HTMLImageElement>(null);
 // Read through the host only once the card is on screen (or about to be): one batched request for the cards shown.
 useEffect(()=>{if(mode!=='read')return;let live=true;const element=ref.current;
  const read=()=>{void (platform.readTemplateCard?platform.readTemplateCard(t):platform.readTemplateMedia!(t.id,t.version,'card',t.digest)).then(value=>{if(live)setMedia(value);}).catch(()=>{if(live)setMode('error');});};
  if(!element||typeof IntersectionObserver==='undefined'){read();return()=>{live=false;};}
  const watch=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){watch.disconnect();read();}},{rootMargin:'200px'});watch.observe(element);
  return()=>{live=false;watch.disconnect();};
 },[mode,t.id,t.version,t.digest]);
 if(mode==='error')return <div className="ty-gallery-screenshot" role="img" aria-label={t.name+' screenshot unavailable'}>Preview image unavailable</div>;
 return <img ref={ref} className="ty-gallery-screenshot" src={mode==='direct'?direct:(media||undefined)} onError={mode==='direct'?()=>{directCardsRefused=true;setMode('read');}:undefined} alt={`${t.name} screenshot`} loading="lazy" width="720" height="480"/>;
}
function TemplatePreview({template:t}:{template:any}){const {media,error,embedded}=useTemplateMedia(t,'preview');return error?<p role="alert">Preview could not be loaded. Close and reopen it to retry.</p>:embedded&&!media?<p role="status">Loading preview…</p>:<iframe title={`${t.name} interactive preview`} src={embedded?undefined:templateMediaUrl(t.id,t.version,'preview',t.digest)} srcDoc={embedded?media:undefined} sandbox="allow-scripts" referrerPolicy="no-referrer"/>;}
