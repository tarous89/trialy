import {withWorkspaceActivity} from '../shared/WorkspaceActivity.js';
import {TemplateCatalog} from '../shared/TemplateCatalog.js';
import {WorkspaceView,type WorkspaceViewState} from '../shared/WorkspaceView.js';
import {createViewContextPublisher,viewContextText} from './view-context.js';
import {EmbeddedConnectors} from './Connectors.js';
import {AutomationsPage} from '../shared/AutomationsPage.js';
import {SystemNotice} from '../shared/SystemNotice.js';
import {AppUnavailable} from '../shared/AppUnavailable.js';
import {EmbeddedAppNavigation} from './AppNavigation.js';
import type {AppRoute} from '../shared/app-route.js';
import {AppPlatform} from '../shared/AppPlatform.js';
import {loadTrackerDisplay} from './tracker-loading.js';
import {DisplayTransition} from './display-transition.js';
import {CreationCenter} from '../shared/CreationCenter.js';
import {AccessPage,AccessHost} from '../shared/AccessPanel.js';
import {MultiValueInput} from '../shared/MultiValueInput.js';
import {TrackerDraft} from '../shared/TrackerDraft.js';
import {ComponentEditor} from '../shared/ComponentEditor.js';
import {FrontendCodeRuntime} from '../shared/FrontendCodeRuntime.js';
import {PageActions} from '../shared/PageActions.js';
import {ChangeSummary} from '../shared/ChangeSummary.js';
import {HomePanel} from '../shared/HomePanel.js';
import {LogsPanel} from '../shared/LogsPanel.js';
import {WorkspaceShell} from '../shared/ui/WorkspaceShell.js';
import {ResourcesPanel} from '../shared/ResourcesPanel.js';
import {DatabasePanel} from '../shared/DatabasePanel.js';
import {WorkspaceNavigation,ProjectFilter} from '../shared/WorkspaceNavigation.js';
import {AppShell} from '../shared/AppShell.js';
declare const __TRIALY_APP_URL__:string;
import {GuestPreview} from '../shared/GuestPreview.js';
import {ReferenceInput} from '../shared/ReferenceInput.js';
import {ProjectsPanel} from '../shared/ProjectsPanel.js';
import {FoundationPanel} from '../shared/FoundationPanel.js';
import {editableData} from '../shared/formulas.js';
import React,{useState,useRef,useEffect} from 'react';
import {Icon} from '../shared/ui/Icon.js';
import {createRoot} from 'react-dom/client';
import {App} from '@modelcontextprotocol/ext-apps';
import {RecordHistory} from '../shared/RecordHistory.js';
import {DocumentText,extractionLabel} from '../shared/DocumentText.js';
import {FieldEditor} from '../shared/FieldEditor.js';
import {DocumentControls} from '../shared/DocumentControls.js';
import {BulkImport} from '../shared/BulkImport.js';
import {ViewPicker,RecordView} from '../shared/WorkspaceViews.js';
import type {Field} from '../shared/schema.js';
const bridge=new App({name:'TrialAgents workspace',version:'0.2.37'},{availableDisplayModes:['inline','fullscreen']},{autoResize:true});
// Only hosts whose server asks for it (Claude) switch to full screen, once per display; others keep their default.
// Same approach as the Intel workspace: retry when the host reports its display modes later, never re-open after the user exits.
let fullscreenWanted=false,fullscreenRequested=false,fullscreenPending=false;
function requestFullscreen(ctx:any=bridge.getHostContext()){
 if(!fullscreenWanted||fullscreenRequested||fullscreenPending)return;
 if(ctx?.displayMode==='fullscreen'){fullscreenRequested=true;return;}
 if(!ctx?.availableDisplayModes?.includes('fullscreen'))return;
 fullscreenRequested=true;fullscreenPending=true;
 void bridge.requestDisplayMode({mode:'fullscreen'}).catch(()=>{/* Keep the inline view; do not keep changing the host display. */}).finally(()=>{fullscreenPending=false;});
}
// Only the Claude widget resource carries this marker; ChatGPT never shows Claude-only controls.
const claudeHost=(()=>{try{return JSON.parse(document.getElementById('trialy-host')?.textContent||'null')==='claude';}catch{return false;}})();
const displayListeners=new Set<()=>void>();
bridge.onhostcontextchanged=ctx=>{requestFullscreen({...bridge.getHostContext(),...ctx});displayListeners.forEach(f=>f());};
/** Claude only: offer Expand while the workspace is shown inline and the host supports full screen. */
function useCanExpand(){
 const read=()=>{const ctx:any=bridge.getHostContext();return claudeHost&&ctx?.displayMode!=='fullscreen'&&!!ctx?.availableDisplayModes?.includes('fullscreen');};
 const [can,setCan]=useState(read);
 useEffect(()=>{const update=()=>setCan(read());displayListeners.add(update);update();return()=>{displayListeners.delete(update);};},[]);
 return can;
}
function expandWorkspace(){void bridge.requestDisplayMode({mode:'fullscreen'}).catch(()=>{/* The host keeps the inline view. */});}
// Present only in the Claude resource: Claude blocks nested frames from the platform origin, so apps render with srcdoc.
function inlineFrameDocument(){try{const text=document.getElementById('trialy-frame-document')?.textContent;const value=text?JSON.parse(text):undefined;return typeof value==='string'?value:undefined;}catch{return undefined;}}
function unwrap(result:any){if(result.isError)throw Object.assign(new Error(result.content?.find((c:any)=>c.type==='text')?.text??'The action could not complete.'),result.structuredContent?.error??{});return result.structuredContent?.result;}
async function call(name:string,args:Record<string,unknown>={}){const request=()=>bridge.callServerTool({name,arguments:args});return unwrap(await (name==='check_component_access'?request():withWorkspaceActivity(request)));}
function Workspace(){
 const [trackerRoute,setTrackerRoute]=useState<AppRoute>({path:'/'});
 const [platform,setPlatform]=useState<{enabled:boolean;origin:string;frameDocument?:string}>(()=>({enabled:true,origin:__TRIALY_APP_URL__,frameDocument:inlineFrameDocument()}));
 const [viewDetails,setViewDetails]=useState<Record<string,WorkspaceViewState>>({});
 const reportView=React.useCallback((key:string,value:WorkspaceViewState|null)=>setViewDetails(old=>{const next={...old};if(value)next[key]=value;else delete next[key];return next;}),[]);
 const mediaCache=useRef(new Map<string,Promise<string>>());
 const readTemplateMedia=React.useCallback((id:string,version:string,kind:'screenshot'|'preview')=>{const key=id+'@'+version+':'+kind;let promise=mediaCache.current.get(key);if(!promise){promise=bridge.callServerTool({name:'read_app_template_media',arguments:{templateId:id,version,kind}}).then(r=>{if(r.isError||typeof r._meta?.templateMedia!=='string')throw Error('Template preview unavailable');return r._meta.templateMedia as string;}).catch(e=>{mediaCache.current.delete(key);throw e;});mediaCache.current.set(key,promise);}return promise;},[]);
 const canExpand=useCanExpand();
 const [identity,setIdentity]=useState<{name?:string;email?:string}>({});
 const [appUpdating,setAppUpdating]=useState(false);
 const [unavailableReason,setUnavailableReason]=useState<'missing'|'load'|'schema'>('missing'),retryDisplay=useRef<(()=>void)|null>(null);
 const transition=useRef(new DisplayTransition()),[trackerOutput,setTrackerOutput]=useState<any>(null);
 const [openedTracker,setOpenedTracker]=useState<any>(null),[trackerPreview,setTrackerPreview]=useState<any>(null);
 const [projectId,setProjectId]=useState(''),[visited,setVisited]=useState<string[]>(['home']);
 const [guest,setGuest]=useState<any>(null);
 const navigationEpoch=useRef(0);
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [state,setState]=useState<any>({workspaces:[],types:[],templates:[]}),[typeId,setTypeId]=useState(''),[rows,setRows]=useState<any[]>([]),[total,setTotal]=useState(0),[offset,setOffset]=useState(0);
 const [form,setForm]=useState<any>(null),[draft,setDraft]=useState<Record<string,any>>({}),[preview,setPreview]=useState<any>(null),[query,setQuery]=useState('');
 const [view,setView]=useState('loading'),[documents,setDocuments]=useState<any[]>([]),[document,setDocument]=useState<any>(null),[search,setSearch]=useState<any>(null),[docQuery,setDocQuery]=useState(''),[versions,setVersions]=useState<any>(null);
 React.useEffect(()=>{setIdentity({});if(!ready||!state.viewerId)return;let active=true;void bridge.callServerTool({name:'read_connected_account',arguments:{}}).then(result=>{if(active&&!result.isError){setIdentity((result._meta as any)?.accountIdentity??{});setPlatform(current=>{const next=(result._meta as any)?.appPlatform;return next?{...next,frameDocument:current.frameDocument}:current;});}}).catch(()=>{});return()=>{active=false;};},[ready,state.viewerId]);

 const [organizationIncoming,setOrganizationIncoming]=useState<any>(null);
 const [foundationIncoming,setFoundationIncoming]=useState<any>(null);
 const recordRequest=useRef(0);
 const [importing,setImporting]=useState(false),[controlledDocument,setControlledDocument]=useState<any>(null);
 const [month,setMonth]=useState(new Date().toISOString().slice(0,7)),[summary,setSummary]=useState<any>(null);
 const [views,setViews]=useState<any[]>([]),[viewId,setViewId]=useState('');
 const [homeAppActive,setHomeAppActive]=useState(false);
 const homeAppVisible=useRef(false),visibleSurface=useRef(view);visibleSurface.current=view;
 const onHomeAppVisibility=React.useCallback((visible:boolean)=>{homeAppVisible.current=visible;setHomeAppActive(visible);},[]);
 const visibleApp=useRef(false);visibleApp.current=view==='tracker'&&!!(openedTracker||trackerPreview);
 const returnHome=()=>{if(!state.viewerId)void call('initialize_account').then(setState).catch(()=>{});navigationEpoch.current++;transition.current.reset();setView('home');setOpenedTracker(null);setTrackerPreview(null);setTrackerOutput(null);setError('');setNotice('');setHomeRevision(r=>r+1);window.dispatchEvent(new CustomEvent('trialy:navigate',{detail:'home'}));};
 const activeView=views.find(v=>v.id===viewId&&v.type_id===typeId&&v.workspace_id===state.workspaceId);
 const table=state.types.find((t:any)=>t.id===typeId),fields:Field[]=table?.fields??[];
 React.useEffect(()=>{setVisited(v=>v.includes(view)?v:[...v,view]);},[view]);
 React.useEffect(()=>{setProjectId('');setVisited([view]);},[state.workspaceId]);
 const [creationKind,setCreationKind]=useState('tracker'),[homeRevision,setHomeRevision]=useState(0),[automationsRevision,setAutomationsRevision]=useState(0);
 const chatNew=()=>void run(async()=>{const result=await bridge.sendMessage({role:'user',content:[{type:'text',text:'I want to build a new app in TrialAgents. Ask me what I want to build, or suggest a few useful ideas to choose from.'}]});if(result.isError)throw Error('Could not start the conversation. Please tell ChatGPT what you would like to build.');});
 const startNew=(kind:string)=>{if(kind==='app'&&state.workspaceId){setView('templates');return;}if(guest||!state.workspaceId){chatNew();return;}setCreationKind(kind);setView('create');};
 const useTemplate=React.useCallback(async(template:any,requestKey:string,options:{createNew?:boolean;sharedTables?:Record<string,string>;dataAccess?:any}={})=>withWorkspaceActivity(async()=>{
  const epoch=++navigationEpoch.current;transition.current.reset();
  const install={templateId:template.id,version:template.version,digest:template.digest,name:template.name,requestKey,...(options.createNew?{createNew:true}:{})};
  // With a reviewed data access step, Save commits the app, its connections and access together (app-only action).
  const installed=options.dataAccess?await call('confirm_data_access',{workspaceId:state.workspaceId,install,...options.dataAccess,confirmed:true}):await call('install_app_template',{workspaceId:state.workspaceId,...install,...(options.sharedTables?{sharedTables:options.sharedTables}:{}),confirmed:true});
  setHomeRevision(n=>n+1);
  const data=await call('open_app',{workspaceId:installed.workspaceId,appId:installed.appId,source:'component'}),{account,resolved,output}=await loadTrackerDisplay(data,call,()=>{});
  if(epoch!==navigationEpoch.current)return;
  if(resolved.screen==='tracker-unavailable')throw Error('Your app was installed. Open Apps to try opening it again.');
  setState(account);setTrackerRoute(resolved.route??{path:'/'});setTrackerOutput(output);setOpenedTracker(resolved.component);setTrackerPreview(null);setView('tracker');setAppUpdating(false);setError('');setNotice('');
 }),[state.workspaceId]);
 const contextView=view==='tracker'||(view==='home'&&homeAppActive)?'app':view;
 const details=Object.values(viewDetails).filter(d=>d.view===contextView||(['app','database'].includes(contextView)&&d.view==='access-control'));
 const detail=Object.assign({},...details.map(d=>Object.fromEntries(Object.entries(d).filter(([,v])=>v!==undefined))));
 const contextText=viewContextText({view:contextView,workspaceId:state.workspaceId,...(view==='tracker'?{appId:openedTracker?.id??trackerPreview?.id,appName:openedTracker?.name,appVersion:openedTracker?.version,route:trackerRoute.path}:{}),...detail});
 const publishView=React.useMemo(()=>createViewContextPublisher(async text=>{await bridge.updateModelContext({content:[{type:'text',text}]});}),[]);
 useEffect(()=>{if(!ready||!bridge.getHostCapabilities()?.updateModelContext?.text)return;const timer=setTimeout(()=>publishView(contextText),250);return()=>clearTimeout(timer);},[ready,contextText,publishView]);
 const openApp=()=>{void bridge.openLink({url:platform.origin+(state.workspaceId?'/?workspaceId='+encodeURIComponent(state.workspaceId):'')});};
 const openSettings=()=>{void bridge.openLink({url:platform.origin+'/?tab=access'+(state.workspaceId?'&workspaceId='+encodeURIComponent(state.workspaceId):'')});};
 const noAccessibleWorkspace=!!state.viewerId&&!state.workspaceId&&!state.workspaces?.length;
 const navigation=<WorkspaceNavigation selected={view} onSelect={setView} onSettings={openSettings}/>;
 async function run(fn:()=>Promise<void>){const epoch=navigationEpoch.current;setBusy(true);setError('');try{await fn();}catch(e){if(epoch===navigationEpoch.current)setError((e as Error).message);}finally{if(epoch===navigationEpoch.current)setBusy(false);}}
 async function records(workspaceId:string,id:string,page=0,q='',savedViewId=viewId,calendarMonth=month,allViews=views){const request=++recordRequest.current;setRows([]);setTotal(0);setSummary(null);
  const selectedView=allViews.find(v=>v.id===savedViewId),dateField=selectedView?.config.dateField;
  const args={workspaceId,typeId:id,limit:25,offset:page,q,...(savedViewId?{viewId:savedViewId}:{}),...(selectedView?.kind==='calendar'&&dateField?{month:calendarMonth,dateField}:{})};
  const data=await call('read_records',args);if(request!==recordRequest.current)return;setRows(data.rows);setTotal(data.total);setOffset(page);
  if(selectedView?.kind==='dashboard'){const sums=await call('summarize_records',{...args,...(selectedView.config.groupBy?{groupBy:selectedView.config.groupBy}:{}),...(selectedView.config.metric?{metric:selectedView.config.metric}:{})});if(request===recordRequest.current)setSummary(sums);}
 }
 async function open(workspaceId?:string){setVersions(null);setDocument(null);setSearch(null);setDocuments([]);const data=await call('open_workspace',workspaceId?{workspaceId}:{});setState(data);const vs=data.workspaceId?await call('list_views',{workspaceId:data.workspaceId}):[];setViews(vs);const selected=data.types.find((t:any)=>t.id===typeId)?.id??data.types[0]?.id??'';setTypeId(selected);setQuery('');const kept=vs.find((v:any)=>v.id===viewId&&v.type_id===selected)?.id??'';setViewId(kept);if(selected&&view==='records')await records(data.workspaceId,selected,0,'',kept,month,vs);else{setRows([]);setTotal(0);}if(view==='documents'&&data.workspaceId)setDocuments(await call('list_documents',{workspaceId:data.workspaceId}));}
 React.useEffect(()=>{let active=true;
 const navigate=()=>{navigationEpoch.current++;setBusy(false);setError('');setNotice('');transition.current.reset();};window.addEventListener('trialy:navigate',navigate);
 const showPlatform=(message='',workspaceId?:string,destination='home')=>{const epoch=++navigationEpoch.current;transition.current.reset();setView(destination);if(destination==='automations')setAutomationsRevision(n=>n+1);setOpenedTracker(null);setTrackerPreview(null);setTrackerOutput(null);setError(message);void call('open_workspace',workspaceId?{workspaceId}:{}).then(account=>{if(active&&epoch===navigationEpoch.current)setState(account);}).catch(()=>{if(active&&epoch===navigationEpoch.current)retainDisplay();});};
 const retainDisplay=(e?:any)=>{setAppUpdating(false);setUnavailableReason(e?.code==='manifest_stale'?'schema':e&&![401,403,404].includes(e.status)?'load':'missing');setError('');setNotice('');if(!visibleApp.current&&!(visibleSurface.current==='home'&&homeAppVisible.current)){setOpenedTracker(null);setTrackerPreview(null);setTrackerOutput(null);setView('unavailable');}};
 const receive=(result:any)=>{if(!active)return;try{
  const data=unwrap(result);if(data?.displayIntent==='background')return;
  if(data?.preferredDisplayMode==='fullscreen'){fullscreenWanted=true;requestFullscreen();}
  if(['app-link','tracker','tracker-preview'].includes(data?.screen))retryDisplay.current=()=>receive(result);
  if(data?.screen==='app-link'){const epoch=++navigationEpoch.current;void call('open_app',{appId:data.appId,workspaceId:data.workspaceId,source:data.source??'component',route:data.route??{path:'/'}}).then(display=>{if(active&&epoch===navigationEpoch.current)receive({structuredContent:{result:display}});}).catch(e=>{if(active&&epoch===navigationEpoch.current)retainDisplay(e);});return;}
  if(data?.screen==='automations'){showPlatform('',data.workspaceId,'automations');return;}
  if(data?.screen==='platform'){showPlatform('',data.workspaceId);return;}
  if(data?.guestDraft){setGuest((current:any)=>current?.handle.id===data.handle.id?{...current,...data,bundle:data.bundle??current.bundle}:data);return;}
  const saved=data?.screen==='tracker'&&data.component, draft=data?.screen==='tracker-preview'&&data.preview;
  if(saved||draft){
   const key=data.workspaceId+':'+(saved?'saved:'+saved.id+':'+saved.version+(data.appUpdating?':updating':''):'draft:'+draft.id+':'+draft.digest)+':'+JSON.stringify(data.route??{path:'/'});
   void transition.current.show(key,()=>{const epoch=++navigationEpoch.current;return loadTrackerDisplay(data,call,account=>{if(active&&epoch===navigationEpoch.current)setState((old:any)=>old.viewerId===account.viewerId?old:{...old,...account});});},({account,resolved,output})=>{
    if(!active)return;
    if(resolved.screen==='tracker-unavailable'){retainDisplay();return;}
    setState(account);setTrackerRoute(resolved.route??{path:'/'});setTrackerOutput(output);setOpenedTracker(resolved.component||null);setTrackerPreview(resolved.component?null:resolved.preview||null);setView('tracker');setAppUpdating(!!resolved.appUpdating);setError('');setNotice('');
   },e=>{if(active)retainDisplay(e);});
  }else if(data?.screen==='tracker-unavailable'){retainDisplay();
  }else if(data?.workspaces&&data?.types){
   navigationEpoch.current++;
   void transition.current.show('home:'+(data.viewerId??'')+':'+data.workspaceId,async()=>data.workspaceId?await call('list_views',{workspaceId:data.workspaceId}):[],vs=>{if(!active)return;setState(data);setViews(vs);setView('home');setOpenedTracker(null);setTrackerPreview(null);setTrackerOutput(null);setViewId('');setTypeId('');setRows([]);setError('');},()=>{if(active)retainDisplay();});
  }
 }catch(e){retainDisplay(e);}};
 bridge.ontoolresult=receive;
 void bridge.connect().then(()=>{displayListeners.forEach(f=>f());if(active)setReady(true);}).catch(e=>{if(active)retainDisplay();});
 return()=>{active=false;transition.current.reset();window.removeEventListener('trialy:navigate',navigate);};},[]);
 async function prepare(operation:unknown){const p=await call('prepare_change',{workspaceId:state.workspaceId,operation});setPreview(p);setForm(null);setVersions(null);setImporting(false);}
 function input(f:Field){if(f.formula||f.computed||f.lookup)return <output>{String(draft[f.key]??'Calculated when saved')}</output>;if(['relationship','person','document','table','field'].includes(f.kind))return <ReferenceInput field={f} value={draft[f.key]} onChange={v=>setDraft(d=>({...d,[f.key]:v}))} load={(query,offset)=>call('reference_options',{workspaceId:state.workspaceId,typeId,field:f.key,query,offset})}/>;const value=draft[f.key]??'';const set=(v:any)=>setDraft(d=>({...d,[f.key]:v}));if(f.multiple)return <MultiValueInput field={f} value={value} onChange={set}/>;if(f.kind==='boolean')return <input type="checkbox" checked={!!value} onChange={e=>set(e.target.checked)}/>;if(f.kind==='select')return <select value={value} required={f.required} onChange={e=>set(e.target.value)}><option value="">Choose…</option>{f.options?.map(o=><option key={o}>{o}</option>)}</select>;return <input value={value} required={f.required} type={['number','money'].includes(f.kind)?'number':f.kind==='date'?'date':'text'} placeholder={f.kind==='relationship'?'Related record ID':undefined} onChange={e=>set(['number','money'].includes(f.kind)?e.target.value===''?null:Number(e.target.value):e.target.value)}/>;}
 if(guest)return <WorkspaceShell embedded appView selected="home" onNavigate={()=>openApp()} accountName="Guest" onNew={startNew} onOpenApp={openApp}><GuestPreview key={guest.handle.id} draft={guest} call={call} openLink={async url=>{const r=await bridge.openLink({url});if(r.isError)throw Error('Could not open account');}} onSaved={async receipt=>{await call('list_workspaces');await open(receipt.workspaceId);setView('home');setGuest(null);}}/></WorkspaceShell>;
 return <AppPlatform.Provider value={{...platform,readTemplateMedia,useTemplate,openLink:url=>{void bridge.openLink({url});}}}><WorkspaceView.Provider value={reportView}><AccessHost.Provider value={url=>{void bridge.openLink({url});}}><WorkspaceShell embedded working={view==='tracker'&&appUpdating} headerActions={canExpand?<button className="ty-host-open" onClick={expandWorkspace} title="Expand the workspace to full screen"><Icon name="expand" size={16}/>Expand</button>:undefined} appView={view==='tracker'||(view==='home'&&homeAppActive)} selected={view==='templates'?'templates':view==='connectors'?'connectors':view==='automations'?'automations':view==='access-control'?'access-control':view==='logs'?'logs':['database','records'].includes(view)?'database':'home'} onNavigate={d=>{if(d==='settings'){openSettings();return;}navigationEpoch.current++;setBusy(false);transition.current.reset();setError('');setNotice('');setView(d);}} accountName={identity.name??(state.viewerId?"Connected":"Account")} accountEmail={identity.email} onNew={startNew} onOpenApp={openApp}><div className="ty-page ty-fixed ty-embed-content">{error&&<SystemNotice error message={error} onDismiss={()=>setError('')}/>}{view==='unavailable'&&<AppUnavailable onHome={returnHome} reason={unavailableReason} onRetry={retryDisplay.current?()=>retryDisplay.current?.():undefined}/>}{notice&&<SystemNotice message={notice} onDismiss={()=>setNotice('')}/>}{view!=='unavailable'&&!ready&&<div aria-busy="true" aria-label="Loading account"/>}{view==='templates'&&state.workspaceId&&<TemplateCatalog call={(name,args)=>call(name,['list_app_templates','read_app_template','read_app_template_media'].includes(name)?args:{workspaceId:state.workspaceId,...args})}/>}
{view==='create'&&state.workspaceId&&<CreationCenter key={creationKind} kind={creationKind} call={(name,args)=>call(name,{workspaceId:state.workspaceId,...args})} onChat={chatNew} onClose={()=>setView('home')} onCreated={()=>{setHomeRevision(r=>r+1);setView('home');void open(state.workspaceId);}}/>}{state.guestWelcome&&<section className="ty-empty"><h2>Your work, connected.</h2><p>{state.message}</p><button className="primary" onClick={()=>void run(async()=>{await call('list_workspaces');await open();})}>Connect your account</button><p>One account for your projects, trackers, forms, dashboards and automations. No workspace setup.</p></section>}

 {!state.guestWelcome&&(state.viewerId||state.workspaceId)&&<><nav>{view==='records'&&<><select aria-label="Table" value={typeId} disabled={busy} onChange={e=>{setTypeId(e.target.value);setViewId('');setForm(null);setVersions(null);setView('records');setQuery('');void run(()=>records(state.workspaceId,e.target.value,0,'',''));}}>{!state.types.length&&<option value="">No tables yet</option>}{state.types.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</select><button disabled={busy} onClick={()=>{setView('records');setForm({kind:'table'});setDraft({name:'',fields:[{key:'name',name:'Name',kind:'text',required:true,ai:true,multiple:true}]});}}>New table</button>{table&&<><button disabled={busy} onClick={()=>{setForm({kind:'table',table});setDraft({name:table.name,fields:table.fields});}}>Edit fields</button><button disabled={busy} onClick={()=>setImporting(true)}>Import CSV</button></>}{table&&<button disabled={busy} onClick={()=>{setView('records');setForm({kind:'record'});setDraft({});}}>Add record</button>}</>}</nav>
 {view==='records'&&table&&<><form className="search" onSubmit={e=>{e.preventDefault();void run(()=>records(state.workspaceId,typeId,0,query));}}><input placeholder="Search accessible fields" value={query} onChange={e=>setQuery(e.target.value)}/><button disabled={busy}>Search</button></form><ViewPicker key={state.workspaceId+typeId} views={views.filter(v=>v.type_id===typeId)} selectedId={activeView?.id??''} fields={fields} typeId={typeId} busy={busy} onSelect={id=>{setViewId(id);void run(()=>records(state.workspaceId,typeId,0,query,id));}} onPrepare={operation=>run(()=>prepare(operation))}/><RecordView onBulk={operation=>run(()=>prepare(operation))} loadReferences={(f,query,offset)=>call('reference_options',{workspaceId:state.workspaceId,typeId,field:f.key,query,offset})} key={state.workspaceId+typeId+viewId} rows={rows} summary={summary} month={month} onMonth={m=>{setMonth(m);void run(()=>records(state.workspaceId,typeId,0,query,viewId,m));}} fields={fields} kind={activeView?.kind??'table'} config={activeView?.config} total={total} busy={busy} onEdit={r=>{setForm({kind:'record',record:r});setDraft(r.data);}} onHistory={r=>run(async()=>{setForm(null);setVersions(await call('record_versions',{workspaceId:state.workspaceId,recordId:r.id}));})}/><footer><span>{total} records</span><button disabled={!offset||busy} onClick={()=>run(()=>records(state.workspaceId,typeId,offset-25,query))}>Previous</button><button disabled={offset+25>=total||busy} onClick={()=>run(()=>records(state.workspaceId,typeId,offset+25,query))}>Next</button></footer></>}
 {view==='documents'&&<section><h2>Source documents</h2><p>Saved originals and their extracted text.</p><button disabled={busy} onClick={()=>{setForm({kind:'upload'});setDraft({});}}>Add document</button><form className="search" onSubmit={e=>{e.preventDefault();void run(async()=>setSearch(await call('search_documents',{workspaceId:state.workspaceId,query:docQuery})));}}><input required value={docQuery} onChange={e=>setDocQuery(e.target.value)} placeholder="Search extracted text"/><button disabled={busy}>Search documents</button></form>{search&&<div><p>{search.hits.length} matching passages · {search.coverage.unavailable} unavailable · {search.coverage.partial} partial · {search.coverage.pending} pending</p>{search.hits.map((h:any)=><article key={h.version_id}><strong>{h.filename} · v{h.version}</strong><p>{h.passage}</p></article>)}</div>}<div className="scroll"><table><thead><tr><th>Document</th><th>Version</th><th>Text availability</th><th/></tr></thead><tbody>{documents.map(d=><tr key={d.id}><td>{d.filename}</td><td>{d.version}</td><td>{extractionLabel(d.extraction_status)}</td><td><button disabled={busy} onClick={()=>run(async()=>setDocument(await call('read_document_text',{workspaceId:state.workspaceId,versionId:d.id})))}>Read text</button><button onClick={()=>setControlledDocument(d)}>Document controls</button><button disabled={busy} onClick={()=>run(async()=>{const r=await bridge.callServerTool({name:'download_original',arguments:{workspaceId:state.workspaceId,versionId:d.id}});if(r.isError)throw Error('Original download failed');const file=(r._meta as any)?.file;const downloaded=await bridge.downloadFile({contents:[{type:'resource',resource:{uri:'file:///'+encodeURIComponent(file.filename),mimeType:file.mime,blob:file.base64}}]});if(downloaded.isError)throw Error('Download was not completed by the host.');})}>Download</button>{!documents.some(x=>x.document_id===d.document_id&&x.version>d.version)&&<button disabled={busy} onClick={()=>{setForm({kind:'upload',document:d});setDraft({});}}>New version</button>}</td></tr>)}</tbody></table></div>{!documents.length&&<p>No AI-accessible documents in this workspace.</p>}</section>}
 {view==='tracker'&&appUpdating&&<div role="status" className="ty-tracker-notice">Updating app… You can continue using the saved version.</div>}{view==='tracker'&&(openedTracker||trackerPreview)&&<EmbeddedAppNavigation key={(openedTracker?.id??trackerPreview.id)+':'+JSON.stringify(trackerRoute)} appId={openedTracker?.id??trackerPreview.id} workspaceId={state.workspaceId} source={openedTracker?'component':'preview'} route={trackerRoute} origin={platform.origin} openLink={url=>{void bridge.openLink({url});}}>
 {view==='tracker'&&openedTracker&&!['save_component','create_tracker'].includes(trackerPreview?.body?.kind)&&<div inert={!!trackerPreview}><ComponentEditor initialOutput={trackerOutput} key={openedTracker.id+':'+openedTracker.version} component={openedTracker} projects={[]} call={(name,args)=>call(name,{workspaceId:state.workspaceId,...args})} onBack={returnHome} onPreview={p=>{setTrackerOutput(null);setTrackerPreview(p);}}/></div>}
 {view==='tracker'&&trackerPreview&&(['save_component','create_tracker'].includes(trackerPreview.body?.kind)?<TrackerDraft initialOutput={trackerOutput} key={trackerPreview.id+':'+trackerPreview.digest} preview={trackerPreview} call={call} onProposal={p=>{setTrackerOutput(null);setTrackerPreview(p);}} onSaved={(component,_output,route={path:'/'})=>{navigationEpoch.current++;transition.current.adopt(state.workspaceId+':saved:'+component.id+':'+component.version+':'+JSON.stringify(route));setTrackerRoute({path:'/'});setTrackerOutput(null);setTrackerPreview(null);setOpenedTracker(null);setHomeRevision(r=>r+1);setView('home');setNotice('');}} onDiscard={()=>{setTrackerPreview(null);if(!openedTracker)setView('home');}}/>:<section className="ty-tracker-preview"><PageActions action="Save changes" busy={busy} onAction={()=>void run(async()=>{const receipt=await call('confirm_workspace_change',{workspaceId:trackerPreview.workspaceId,previewId:trackerPreview.id,digest:trackerPreview.digest,confirmed:true});const data=await call('read_project_component',{workspaceId:trackerPreview.workspaceId,componentId:receipt.id});const output=await call('run_component_frontend',{workspaceId:trackerPreview.workspaceId,request:{componentId:data.component.id,expectedVersion:data.component.version,event:{kind:'open'}}});transition.current.adopt(trackerPreview.workspaceId+':saved:'+data.component.id+':'+data.component.version);setTrackerOutput(output);setTrackerPreview(null);setOpenedTracker(data.component);setNotice('');})} onDismiss={()=>void run(async()=>{await call('discard_workspace_preview',{workspaceId:trackerPreview.workspaceId,previewId:trackerPreview.id});setTrackerPreview(null);if(!openedTracker)setView('home');})}>Your record changes are ready to save.</PageActions></section>)}
 </EmbeddedAppNavigation>}
 {view==='home'&&noAccessibleWorkspace&&<section className="ty-access-page"><div className="ty-page-heading"><h1>Apps</h1></div><div className="ty-empty"><h2>Account connected · access not enabled</h2><p>Your TrialAgents account is connected, but no account database is available to ChatGPT. Your owner can review ChatGPT access in TrialAgents.</p><div className="ty-actions"><button className="ty-button ty-button--primary" onClick={()=>void bridge.openLink({url:platform.origin+'/?tab=access-control'})}>Review ChatGPT access</button><button className="ty-button" disabled={busy} onClick={()=>void run(()=>open())}>Check access again</button></div></div></section>}
 {visited.includes('home')&&!noAccessibleWorkspace&&<div hidden={view!=='home'}><WorkspaceView.Provider value={view==='home'?reportView:null}><HomePanel active={view==='home'} onBrowseTemplates={()=>setView('templates')} onAppVisibilityChange={onHomeAppVisibility} onCompose={async message=>{const result=await bridge.sendMessage({role:"user",content:[{type:"text",text:message}]});if(result.isError)throw Error("Could not send the request to chat. Please type it in the conversation.");}} onLegacyAutomations={()=>setView('automations')} viewerId={state.viewerId} key={state.viewerId+':'+state.workspaceId+':'+homeRevision} workspaceId={state.workspaceId??''} types={state.types} call={call} onDocuments={()=>{setView('documents');void run(async()=>setDocuments(await call('list_documents',{workspaceId:state.workspaceId})));}}/></WorkspaceView.Provider></div>}
 {view==='connectors'&&state.workspaceId&&<EmbeddedConnectors key={state.workspaceId} workspaceId={state.workspaceId} call={call}/>}
 {view==='automations'&&state.workspaceId&&<AutomationsPage key={state.workspaceId+':'+automationsRevision} call={(name,args)=>call(name,{...args,workspaceId:state.workspaceId})}/>}
 {view==='automations'&&!state.workspaceId&&<section className="ty-page"><h1>Automations</h1><p>Connect an accessible account to manage automations.</p></section>}
 {view==='access-control'&&<section className="ty-access-page"><AccessPage call={call} initialWorkspaceId={state.workspaceId} openLink={url=>{void bridge.openLink({url});}}/></section>}
 {view==='logs'&&!state.workspaceId&&<section className="ty-page"><h1>Logs</h1><p>No events to show.</p></section>}
 {view==='logs'&&state.workspaceId&&<LogsPanel workspaceId={state.workspaceId??''} call={call} onDownload={async(name,text)=>{const bytes=new TextEncoder().encode(text);let binary='';for(const b of bytes)binary+=String.fromCharCode(b);const result=await bridge.downloadFile({contents:[{type:'resource',resource:{uri:'file:///'+name,mimeType:'text/csv',blob:btoa(binary)}}]});if(result.isError)throw Error('Download was not completed by the host.');}}/>}

 {visited.includes('projects')&&<div hidden={view!=='projects'}><ProjectsPanel key={state.workspaceId} workspaceId={state.workspaceId??''} types={state.types} call={call} incoming={organizationIncoming}/></div>}
 {visited.includes('code')&&<div hidden={view!=='code'}><FoundationPanel key={state.workspaceId} workspaceId={state.workspaceId??''} types={state.types} call={call} incoming={foundationIncoming}/></div>}
 {(['trackers','forms','visuals'] as const).map(key=>visited.includes(key)&&<div key={key+state.workspaceId} hidden={view!==key}><ResourcesPanel workspaceId={state.workspaceId??''} kind={key==='trackers'?'tracker':key==='forms'?'form':'visualization'} projectId={projectId} types={state.types} call={call}/></div>)}
 {visited.includes('database')&&<div hidden={view!=='database'}><WorkspaceView.Provider value={view==='database'?reportView:null}><DatabasePanel contextActive={view==='database'} onDownload={async(name,text)=>{const bytes=new TextEncoder().encode(text);let binary='';for(const b of bytes)binary+=String.fromCharCode(b);const result=await bridge.downloadFile({contents:[{type:'resource',resource:{uri:'file:///'+name,mimeType:'text/csv',blob:btoa(binary)}}]});if(result.isError)throw Error('Download was not completed by the host.');}} key={state.workspaceId} workspaceId={state.workspaceId??''} call={call} onAccess={id=>{void bridge.openLink({url:platform.origin+'/?tab=database&access=1'+(id?'&workspaceId='+encodeURIComponent(id):'')});}} onOpenTable={id=>{setTypeId(id);setView('records');void run(()=>records(state.workspaceId,id,0,'',''));}}/></WorkspaceView.Provider></div>}</>}
 {versions&&<RecordHistory key={versions.recordId} history={versions} busy={busy} onClose={()=>setVersions(null)} onPage={offset=>run(async()=>setVersions(await call('record_versions',{workspaceId:state.workspaceId,recordId:versions.recordId,offset})))} onRestore={operation=>run(()=>prepare(operation))}/>}
 {document&&<DocumentText document={document} busy={busy} onClose={()=>setDocument(null)} onPage={offset=>run(async()=>setDocument(await call('read_document_text',{workspaceId:state.workspaceId,versionId:document.versionId,offset})))}/>}
 {importing&&<BulkImport typeId={typeId} fields={fields} busy={busy} onClose={()=>setImporting(false)} onPreview={operation=>run(()=>prepare(operation))}/>}
 {form?.kind==='upload'&&<section className="panel"><h2>{form.document?'New document version':'Add original document'}</h2><input aria-label="Original file" type="file" onChange={e=>setDraft({file:e.target.files?.[0]})}/><p>This original will be available to ChatGPT. Preview it before saving. Extraction happens after the original is saved.</p><button disabled={busy} onClick={()=>setForm(null)}>Cancel</button><button disabled={busy||!draft.file} onClick={()=>run(async()=>{const f:File=draft.file;if(f.size>25*1024*1024)throw Error('Choose a file under 25 MiB');const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('File could not be read'));reader.readAsDataURL(f);});setPreview(await call('preview_document_upload',{workspaceId:state.workspaceId,filename:f.name,mime:f.type||'application/octet-stream',base64,...(form.document?{documentId:form.document.document_id,expectedVersion:form.document.version}:{})}));setForm(null);})}>Preview original</button></section>}
 {form&&form.kind!=='upload'&&<section className="panel"><h2>{form.kind==='table'?'New table':form.record?'Edit record':'New record'}</h2><form onSubmit={e=>{e.preventDefault();void run(()=>prepare(form.kind==='table'?{kind:form.table?'update_type':'create_type',...(form.table?{typeId:form.table.id,expectedVersion:form.table.version}:{}),name:draft.name,fields:draft.fields}:form.record?{kind:'update_record',recordId:form.record.id,expectedVersion:form.record.version,data:editableData(fields,draft)}:{kind:'create_record',typeId,data:editableData(fields,draft)}));}}>{form.kind==='table'?<label>Table name<input required value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))}/></label>:fields.map(f=><label key={f.key}>{f.name}{f.required?' *':''}{input(f)}</label>)}{form.kind==='table'&&<FieldEditor fields={draft.fields} types={state.types} existing={form.table?.fields} onChange={fields=>setDraft(d=>({...d,fields}))}/>}<footer><button type="button" onClick={()=>setForm(null)}>Cancel</button><button disabled={busy}>Preview changes</button></footer></form></section>}
 {controlledDocument&&<DocumentControls key={controlledDocument.id} document={controlledDocument} busy={busy} onClose={()=>setControlledDocument(null)} onPreview={op=>run(async()=>{setPreview(await call('prepare_change',{workspaceId:state.workspaceId,operation:op}));setControlledDocument(null);})}/>}
 {preview&&<section className="panel"><small>PREVIEW · NOT SAVED</small><h2>Review before saving</h2><ChangeSummary value={preview.summary}/><footer><button disabled={busy} onClick={()=>run(async()=>{await call('discard_preview',{previewId:preview.id});setPreview(null);})}>Discard</button><button disabled={busy} onClick={()=>run(async()=>{await call('commit_change',{previewId:preview.id,digest:preview.digest,confirmed:true});setPreview(null);setNotice('Saved to TrialAgents.');await open(preview.workspaceId);})}>Confirm and save</button></footer></section>}
 </div></WorkspaceShell></AccessHost.Provider></WorkspaceView.Provider></AppPlatform.Provider>;
}
createRoot(document.getElementById('root')!).render(<Workspace/>);



