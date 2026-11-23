import {templateCardAddress} from '../shared/template-gallery.js';
import {workspaceRequestOptions,type WorkspaceRequestOptions} from '../shared/workspace-request.js';
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
import {PendingChangesProvider,ProposalReview,type PendingChange} from '../shared/PendingChanges.js';
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
import {earlyReadKey,EARLY_HOME} from '../shared/early-reads.js';
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
/** 5.4 (P9): follow the host's display (inline or fullscreen) and the width and height it gives the view. */
function applyHostDisplay(ctx:any){const root=document.documentElement,mode=ctx?.displayMode==='fullscreen'?'fullscreen':'inline',d=ctx?.containerDimensions??{};
 root.dataset.tyDisplay=mode;for(const [name,value] of [['--ty-host-width',d.width??d.maxWidth],['--ty-host-height',d.height??d.maxHeight]] as const){if(typeof value==='number'&&value>0)root.style.setProperty(name,value+'px');else root.style.removeProperty(name);}}
applyHostDisplay(bridge.getHostContext());
bridge.onhostcontextchanged=ctx=>{const merged={...bridge.getHostContext(),...ctx};applyHostDisplay(merged);requestFullscreen(merged);displayListeners.forEach(f=>f());};
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
/** L2.6: an "open app" result carries the app's first screen as widget-only metadata (never shown to the assistant). */
function withFirstScreen(result:any){const data=unwrap(result),first=result?._meta?.['trialagents/initialOutput'];return first&&data?.screen==='tracker'&&data.component&&!data.initialOutput?{...data,initialOutput:first}:data;}
function unwrap(result:any){if(result.isError)throw Object.assign(new Error(result.content?.find((c:any)=>c.type==='text')?.text??'The action could not complete.'),result.structuredContent?.error??{});return result.structuredContent?.result;}
// D11: inside ChatGPT or Claude, a Save the view sends is the person's click. It goes through the view-only tool;
// the tool of the same purpose that the assistant can call refuses app changes.
const viewTool=(name:string)=>name==='confirm_workspace_change'?'approve_workspace_change':name;
/** call(), returning the whole tool result (with its widget-only metadata) instead of only the result data. */
async function callResult(name:string,args:Record<string,unknown>={}){name=viewTool(name);const result=await withWorkspaceActivity(()=>bridge.callServerTool({name,arguments:args}),workspaceRequestOptions(name,args,undefined));unwrap(result);return result;}
async function call(name:string,args:Record<string,unknown>={},options?:WorkspaceRequestOptions){name=viewTool(name);return unwrap(await withWorkspaceActivity(()=>bridge.callServerTool({name,arguments:args},{signal:options?.signal}),workspaceRequestOptions(name,args,options)));}
function Workspace(){
 const [trackerRoute,setTrackerRoute]=useState<AppRoute>({path:'/'});
 const [platform,setPlatform]=useState<{enabled:boolean;origin:string;frameDocument?:string}>(()=>({enabled:true,origin:__TRIALY_APP_URL__,frameDocument:inlineFrameDocument()}));
 const [viewDetails,setViewDetails]=useState<Record<string,WorkspaceViewState>>({});
 const reportView=React.useCallback((key:string,value:WorkspaceViewState|null)=>setViewDetails(old=>{const next={...old};if(value)next[key]=value;else delete next[key];return next;}),[]);
 const mediaCache=useRef(new Map<string,Promise<string>>());
 // L3.4: media of an exact version are kept for this view by catalog digest (a preview is read once, when its card is hovered or focused).
 const readTemplateMedia=React.useCallback((id:string,version:string,kind:'screenshot'|'card'|'preview',digest?:string)=>{const key=id+'@'+version+'#'+(digest??'')+':'+kind;let promise=mediaCache.current.get(key);if(!promise){promise=bridge.callServerTool({name:'read_app_template_media',arguments:{templateId:id,version,kind}}).then(r=>{if(r.isError||typeof r._meta?.templateMedia!=='string')throw Error('Template preview unavailable');return r._meta.templateMedia as string;}).catch(e=>{mediaCache.current.delete(key);throw e;});mediaCache.current.set(key,promise);}return promise;},[]);
 // L3.3: card images the host will not load directly are read for the cards on screen in one request (at most 12 per
 // request); if that fails, each card is read on its own as before. Quiet: never the loading bar.
 const cardQueue=useRef<{items:{t:any;resolve:(v:string)=>void;reject:(e:unknown)=>void}[];timer?:ReturnType<typeof setTimeout>}>({items:[]});
 const readTemplateCard=React.useCallback((t:{id:string;version:string;digest:string})=>{const key=t.id+'@'+t.version+'#'+t.digest+':card';let promise=mediaCache.current.get(key);if(promise)return promise;
  promise=new Promise<string>((resolve,reject)=>{const q=cardQueue.current;q.items.push({t,resolve,reject});q.timer??=setTimeout(()=>{const batch=q.items.splice(0);q.timer=undefined;
   for(let i=0;i<batch.length;i+=12){const part=batch.slice(i,i+12);void bridge.callServerTool({name:'read_app_template_cards',arguments:{items:part.map(x=>({templateId:x.t.id,version:x.t.version}))}}).then(r=>{const cards=r.isError?undefined:r._meta?.templateCards as Record<string,string>|undefined;if(!cards)throw Error('Template cards unavailable');for(const x of part){const v=cards[x.t.id+'@'+x.t.version];if(typeof v==='string')x.resolve(v);else x.reject(Error('Template card unavailable'));}})
    .catch(()=>{for(const x of part)readTemplateMedia(x.t.id,x.t.version,'card',x.t.digest).then(x.resolve,x.reject);});}
  },40);}).catch(e=>{mediaCache.current.delete(key);throw e;});
  mediaCache.current.set(key,promise);return promise;},[readTemplateMedia]);
 // Where the host allows images from the platform origin (declared in the widget's resource domains), cards load directly.
 const templateCardUrl=React.useCallback((t:{id:string;version:string;digest:string})=>t.digest?templateCardAddress(new URL(platform.origin).origin,claudeHost?'claude':'chatgpt',t):undefined,[platform.origin]);
 const canExpand=useCanExpand();
 const [identity,setIdentity]=useState<{name?:string;email?:string}>({});
 const [appUpdating,setAppUpdating]=useState(false);
 const [unavailableReason,setUnavailableReason]=useState<'missing'|'load'|'schema'>('missing'),retryDisplay=useRef<(()=>void)|null>(null);
 const transition=useRef(new DisplayTransition()),[trackerOutput,setTrackerOutput]=useState<any>(null);
 const [openedTracker,setOpenedTracker]=useState<any>(null),[trackerPreview,setTrackerPreview]=useState<any>(null);
 const [projectId,setProjectId]=useState(''),[visited,setVisited]=useState<string[]>(['home']);
 const [guest,setGuest]=useState<any>(null);
 const navigationEpoch=useRef(0),receiveRef=useRef<((result:any)=>void)|null>(null);
 // U4: an app's platform:logs and platform:automations links open those pages here, with the app selected.
 const [platformApp,setPlatformApp]=useState<string|null>(null);
 useEffect(()=>{const open=(e:Event)=>{const d=(e as CustomEvent).detail;if(!d?.destination)return;navigationEpoch.current++;transition.current.reset();setPlatformApp(d.appId??null);setView(d.destination==='access'?'access-control':d.destination);};window.addEventListener('trialy:platform-page',open);return()=>window.removeEventListener('trialy:platform-page',open);},[]);
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [state,setState]=useState<any>({workspaces:[],types:[],templates:[]}),[typeId,setTypeId]=useState(''),[rows,setRows]=useState<any[]>([]),[total,setTotal]=useState(0),[offset,setOffset]=useState(0);
 /** L2.6: the account and table list arrive after the app is shown; until then only the app's workspace is set. */
 const showDetails=(details:Promise<any>,workspaceId:string,current:()=>boolean)=>{setState((old:any)=>old.workspaceId===workspaceId?old:{...old,workspaceId});void details.then(account=>{if(current())setState(account);}).catch(()=>{});};
 const [form,setForm]=useState<any>(null),[draft,setDraft]=useState<Record<string,any>>({}),[preview,setPreview]=useState<any>(null),[query,setQuery]=useState('');
 const [view,setView]=useState('loading'),[documents,setDocuments]=useState<any[]>([]),[document,setDocument]=useState<any>(null),[search,setSearch]=useState<any>(null),[docQuery,setDocQuery]=useState(''),[versions,setVersions]=useState<any>(null);
 React.useEffect(()=>{setIdentity({});if(!ready||!state.viewerId)return;let active=true;void bridge.callServerTool({name:'read_connected_account',arguments:{}}).then(result=>{if(active&&!result.isError){setIdentity((result._meta as any)?.accountIdentity??{});setPlatform(current=>{const next=(result._meta as any)?.appPlatform;return next?{...next,frameDocument:current.frameDocument}:current;});}}).catch(()=>{});return()=>{active=false;};},[ready,state.viewerId]);

 const [organizationIncoming,setOrganizationIncoming]=useState<any>(null);
 const [foundationIncoming,setFoundationIncoming]=useState<any>(null);
 const recordRequest=useRef(0);
 const [importing,setImporting]=useState(false),[controlledDocument,setControlledDocument]=useState<any>(null);
 const [month,setMonth]=useState(new Date().toISOString().slice(0,7)),[summary,setSummary]=useState<any>(null);
 const [views,setViews]=useState<any[]>([]),[viewId,setViewId]=useState('');
 const stateRef=useRef<any>(state);stateRef.current=state;
 // L1.6: the first Apps home page from the assistant's open_workspace result, used once while fresh (as the website's early reads are).
 const firstHome=useRef<{at:number;viewer:string;value:any}|null>(null);
 const rememberHome=(data:any)=>{firstHome.current=data?.home&&data.viewerId?{at:Date.now(),viewer:data.viewerId,value:data.home}:null;};
 const homeFromResult=(args:any,options:any)=>{const first=firstHome.current;firstHome.current=null;if(first&&first.viewer===stateRef.current?.viewerId&&Date.now()-first.at<=15000&&earlyReadKey('home',args)===earlyReadKey('home',EARLY_HOME))return Promise.resolve(first.value);return call('read_account_home',args,options);};
 const loadViews=(workspaceId?:string)=>{if(!workspaceId){setViews([]);return;}void call('list_views',{workspaceId}).then(vs=>{if(stateRef.current?.workspaceId===workspaceId)setViews(vs);}).catch(()=>{});};
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
  // Install commits the app, its project, team access, connections and automations together (app-only action).
  // I2: every installation carries the choices reviewed in the installation popup.
  if(!options.dataAccess)throw Error('Review the installation before adding this app.');
  const installed=await call('confirm_data_access',{workspaceId:state.workspaceId,install,...options.dataAccess,confirmed:true});
  setHomeRevision(n=>n+1);
  const opened=await callResult('open_app',{workspaceId:installed.workspaceId,appId:installed.appId,source:'component'}),data=withFirstScreen(opened),{details,resolved,output}=await loadTrackerDisplay(data,call,()=>{});
  if(epoch!==navigationEpoch.current)return;
  if(resolved.screen==='tracker-unavailable')throw Error('Your app was installed. Open Apps to try opening it again.');
  showDetails(details,resolved.workspaceId,()=>epoch===navigationEpoch.current);setTrackerRoute(resolved.route??{path:'/'});setTrackerOutput(output);setOpenedTracker(resolved.component);setTrackerPreview(null);setView('tracker');setAppUpdating(false);setError('');setNotice(installed.automationStatus==='pending'?'App added. Automation setup continues in the background.':'');
 }),[state.workspaceId]);
 const contextView=view==='tracker'||(view==='home'&&homeAppActive)?'app':view;
 const details=Object.values(viewDetails).filter(d=>d.view===contextView||(['app','database'].includes(contextView)&&d.view==='access-control'));
 const detail=Object.assign({},...details.map(d=>Object.fromEntries(Object.entries(d).filter(([,v])=>v!==undefined))));
 const contextText=viewContextText({view:contextView,workspaceId:state.workspaceId,...(view==='tracker'?{appId:openedTracker?.id??trackerPreview?.id}:{}),...detail});
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
 async function open(workspaceId?:string){setVersions(null);setDocument(null);setSearch(null);setDocuments([]);const data=await call('open_workspace',workspaceId?{workspaceId}:{});rememberHome(data);setState(data);const vs=data.workspaceId?await call('list_views',{workspaceId:data.workspaceId}):[];setViews(vs);const selected=data.types.find((t:any)=>t.id===typeId)?.id??data.types[0]?.id??'';setTypeId(selected);setQuery('');const kept=vs.find((v:any)=>v.id===viewId&&v.type_id===selected)?.id??'';setViewId(kept);if(selected&&view==='records')await records(data.workspaceId,selected,0,'',kept,month,vs);else{setRows([]);setTotal(0);}if(view==='documents'&&data.workspaceId)setDocuments(await call('list_documents',{workspaceId:data.workspaceId}));}
 React.useEffect(()=>{let active=true;
 const navigate=()=>{navigationEpoch.current++;setBusy(false);setError('');setNotice('');transition.current.reset();};window.addEventListener('trialy:navigate',navigate);
 const showPlatform=(message='',workspaceId?:string,destination='home')=>{const epoch=++navigationEpoch.current;transition.current.reset();setView(destination);if(destination==='automations')setAutomationsRevision(n=>n+1);setOpenedTracker(null);setTrackerPreview(null);setTrackerOutput(null);setError(message);void call('open_workspace',workspaceId?{workspaceId}:{}).then(account=>{if(active&&epoch===navigationEpoch.current)setState(account);}).catch(()=>{if(active&&epoch===navigationEpoch.current)retainDisplay();});};
 const retainDisplay=(e?:any)=>{setAppUpdating(false);setUnavailableReason(e?.code==='manifest_stale'?'schema':e&&![401,403,404].includes(e.status)?'load':'missing');setError('');setNotice('');if(!visibleApp.current&&!(visibleSurface.current==='home'&&homeAppVisible.current)){setOpenedTracker(null);setTrackerPreview(null);setTrackerOutput(null);setView('unavailable');}};
 const receive=(result:any)=>{if(!active)return;try{
  const data=withFirstScreen(result);if(data?.displayIntent==='background')return;
  if(data?.preferredDisplayMode==='fullscreen'){fullscreenWanted=true;requestFullscreen();}
  if(['app-link','tracker','tracker-preview'].includes(data?.screen))retryDisplay.current=()=>receive(result);
  if(data?.screen==='app-link'){const epoch=++navigationEpoch.current;void callResult('open_app',{appId:data.appId,workspaceId:data.workspaceId,source:data.source??'component',route:data.route??{path:'/'}}).then(opened=>{if(active&&epoch===navigationEpoch.current)receive(opened);}).catch(e=>{if(active&&epoch===navigationEpoch.current)retainDisplay(e);});return;}
  if(data?.screen==='automations'){showPlatform('',data.workspaceId,'automations');return;}
  if(data?.screen==='platform'){showPlatform('',data.workspaceId);return;}
  if(data?.guestDraft){setGuest((current:any)=>current?.handle.id===data.handle.id?{...current,...data,bundle:data.bundle??current.bundle}:data);return;}
  const saved=data?.screen==='tracker'&&data.component, draft=data?.screen==='tracker-preview'&&data.preview;
  if(saved||draft){
   const key=data.workspaceId+':'+(saved?'saved:'+saved.id+':'+saved.version+(data.appUpdating?':updating':''):'draft:'+draft.id+':'+draft.digest)+':'+JSON.stringify(data.route??{path:'/'});
   let epoch=0;
   void transition.current.show(key,()=>{epoch=++navigationEpoch.current;return loadTrackerDisplay(data,call,account=>{if(active&&epoch===navigationEpoch.current)setState((old:any)=>old.viewerId===account.viewerId?old:{...old,...account});});},({details,resolved,output})=>{
    if(!active)return;
    if(resolved.screen==='tracker-unavailable'){retainDisplay();return;}
    showDetails(details,resolved.workspaceId,()=>active&&epoch===navigationEpoch.current);setTrackerRoute(resolved.route??{path:'/'});setTrackerOutput(output);setOpenedTracker(resolved.component||null);setTrackerPreview(resolved.component?null:resolved.preview||null);setView('tracker');setAppUpdating(!!resolved.appUpdating);setError('');setNotice('');
   },e=>{if(active)retainDisplay(e);});
  }else if(data?.screen==='tracker-unavailable'){retainDisplay();
  }else if(data?.workspaces&&data?.types){
   navigationEpoch.current++;
   rememberHome(data);
   // L1.6: Home paints from the result; saved views (used by the database screens) follow in the background.
   void transition.current.show('home:'+(data.viewerId??'')+':'+data.workspaceId,async()=>[],()=>{if(!active)return;setState(data);loadViews(data.workspaceId);setView('home');setOpenedTracker(null);setTrackerPreview(null);setTrackerOutput(null);setViewId('');setTypeId('');setRows([]);setError('');},()=>{if(active)retainDisplay();});
  }
 }catch(e){retainDisplay(e);}};
 bridge.ontoolresult=receive;receiveRef.current=receive;
 void bridge.connect().then(()=>{displayListeners.forEach(f=>f());if(active)setReady(true);}).catch(e=>{if(active)retainDisplay();});
 return()=>{active=false;transition.current.reset();window.removeEventListener('trialy:navigate',navigate);};},[]);
 async function prepare(operation:unknown){const p=await call('prepare_change',{workspaceId:state.workspaceId,operation});setPreview(p);setForm(null);setVersions(null);setImporting(false);}
 function input(f:Field){if(f.formula||f.computed||f.lookup)return <output>{String(draft[f.key]??'Calculated when saved')}</output>;if(['relationship','person','document','table','field'].includes(f.kind))return <ReferenceInput field={f} value={draft[f.key]} onChange={v=>setDraft(d=>({...d,[f.key]:v}))} load={(query,offset)=>call('reference_options',{workspaceId:state.workspaceId,typeId,field:f.key,query,offset})}/>;const value=draft[f.key]??'';const set=(v:any)=>setDraft(d=>({...d,[f.key]:v}));if(f.multiple)return <MultiValueInput field={f} value={value} onChange={set}/>;if(f.kind==='boolean')return <input type="checkbox" checked={!!value} onChange={e=>set(e.target.checked)}/>;if(f.kind==='select')return <select value={value} required={f.required} onChange={e=>set(e.target.value)}><option value="">Choose…</option>{f.options?.map(o=><option key={o}>{o}</option>)}</select>;return <input value={value} required={f.required} type={['number','money'].includes(f.kind)?'number':f.kind==='date'?'date':'text'} placeholder={f.kind==='relationship'?'Related record ID':undefined} onChange={e=>set(['number','money'].includes(f.kind)?e.target.value===''?null:Number(e.target.value):e.target.value)}/>;}
 if(guest)return <WorkspaceShell embedded appView selected="home" onNavigate={()=>openApp()} accountName="Guest" onNew={startNew} onOpenApp={openApp}><GuestPreview key={guest.handle.id} draft={guest} call={call} openLink={async url=>{const r=await bridge.openLink({url});if(r.isError)throw Error('Could not open account');}} onSaved={async receipt=>{await call('list_workspaces');await open(receipt.workspaceId);setView('home');setGuest(null);}}/></WorkspaceShell>;
 // A6, B1: Review in the footer opens the pending change itself; approval happens on screen, in the footer.
 const openPending=(c:PendingChange)=>{if(!state.workspaceId)return;void call('open_app',{appId:c.previewId,workspaceId:state.workspaceId,source:'preview',route:{path:'/'}}).then(display=>receiveRef.current?.({structuredContent:{result:display}})).catch(e=>setError((e as Error).message));};
 return <AppPlatform.Provider value={{...platform,readTemplateMedia,readTemplateCard,templateCardUrl,useTemplate,openLink:url=>{void bridge.openLink({url});}}}><WorkspaceView.Provider value={reportView}><AccessHost.Provider value={url=>{void bridge.openLink({url});}}><PendingChangesProvider call={call} workspaceId={state.workspaceId} onOpen={openPending}><WorkspaceShell embedded working={view==='tracker'&&appUpdating} headerActions={canExpand?<button className="ty-host-open" onClick={expandWorkspace} title="Expand the workspace to full screen"><Icon name="expand" size={16}/>Expand</button>:undefined} appView={view==='tracker'||(view==='home'&&homeAppActive)} selected={view==='templates'?'templates':view==='connectors'?'connectors':view==='automations'?'automations':view==='access-control'?'access-control':view==='logs'?'logs':['database','records'].includes(view)?'database':'home'} onNavigate={d=>{if(d==='settings'){openSettings();return;}navigationEpoch.current++;setBusy(false);transition.current.reset();setError('');setNotice('');setView(d);}} accountName={identity.name??(state.viewerId?"Connected":"Account")} accountEmail={identity.email} onNew={startNew} onOpenApp={openApp}><div className="ty-page ty-fixed ty-embed-content">{error&&<SystemNotice error message={error} onDismiss={()=>setError('')}/>}{view==='unavailable'&&<AppUnavailable onHome={returnHome} reason={unavailableReason} onRetry={retryDisplay.current?()=>retryDisplay.current?.():undefined}/>}{notice&&<SystemNotice message={notice} onDismiss={()=>setNotice('')}>{notice.startsWith('App added. Automation setup')&&<button onClick={()=>{setView('automations');setNotice('');}}>View Automations</button>}</SystemNotice>}{view!=='unavailable'&&!ready&&<div aria-busy="true" aria-label="Loading account"/>}{view==='templates'&&state.workspaceId&&<TemplateCatalog call={(name,args)=>call(name,['list_app_templates','read_app_template','read_app_template_media'].includes(name)?args:{workspaceId:state.workspaceId,...args})}/>}
{view==='create'&&state.workspaceId&&<CreationCenter key={creationKind} kind={creationKind} call={(name,args,options)=>call(name,{workspaceId:state.workspaceId,...args},options)} onChat={chatNew} onClose={()=>setView('home')} onCreated={()=>{setHomeRevision(r=>r+1);setView('home');void open(state.workspaceId);}}/>}{state.guestWelcome&&<section className="ty-empty"><h2>Your work, connected.</h2><p>{state.message}</p><button className="primary" onClick={()=>void run(async()=>{await call('list_workspaces');await open();})}>Connect your account</button><p>One account for your projects, trackers, forms, dashboards and automations. No workspace setup.</p></section>}

 {!state.guestWelcome&&(state.viewerId||state.workspaceId)&&<><nav>{view==='records'&&<><select aria-label="Table" value={typeId} disabled={busy} onChange={e=>{setTypeId(e.target.value);setViewId('');setForm(null);setVersions(null);setView('records');setQuery('');void run(()=>records(state.workspaceId,e.target.value,0,'',''));}}>{!state.types.length&&<option value="">No tables yet</option>}{state.types.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</select><button disabled={busy} onClick={()=>{setView('records');setForm({kind:'table'});setDraft({name:'',fields:[{key:'name',name:'Name',kind:'text',required:true,ai:true,multiple:true}]});}}>New table</button>{table&&<><button disabled={busy} onClick={()=>{setForm({kind:'table',table});setDraft({name:table.name,fields:table.fields});}}>Edit fields</button><button disabled={busy} onClick={()=>setImporting(true)}>Import CSV</button></>}{table&&<button disabled={busy} onClick={()=>{setView('records');setForm({kind:'record'});setDraft({});}}>Add record</button>}</>}</nav>
 {view==='records'&&table&&<><form className="search" onSubmit={e=>{e.preventDefault();void run(()=>records(state.workspaceId,typeId,0,query));}}><input placeholder="Search accessible fields" value={query} onChange={e=>setQuery(e.target.value)}/><button disabled={busy}>Search</button></form><ViewPicker key={state.workspaceId+typeId} views={views.filter(v=>v.type_id===typeId)} selectedId={activeView?.id??''} fields={fields} typeId={typeId} busy={busy} onSelect={id=>{setViewId(id);void run(()=>records(state.workspaceId,typeId,0,query,id));}} onPrepare={operation=>run(()=>prepare(operation))}/><RecordView onBulk={operation=>run(()=>prepare(operation))} loadReferences={(f,query,offset)=>call('reference_options',{workspaceId:state.workspaceId,typeId,field:f.key,query,offset})} key={state.workspaceId+typeId+viewId} rows={rows} summary={summary} month={month} onMonth={m=>{setMonth(m);void run(()=>records(state.workspaceId,typeId,0,query,viewId,m));}} fields={fields} kind={activeView?.kind??'table'} config={activeView?.config} total={total} busy={busy} onEdit={r=>{setForm({kind:'record',record:r});setDraft(r.data);}} onHistory={r=>run(async()=>{setForm(null);setVersions(await call('record_versions',{workspaceId:state.workspaceId,recordId:r.id}));})}/><footer><span>{total} records</span><button disabled={!offset||busy} onClick={()=>run(()=>records(state.workspaceId,typeId,offset-25,query))}>Previous</button><button disabled={offset+25>=total||busy} onClick={()=>run(()=>records(state.workspaceId,typeId,offset+25,query))}>Next</button></footer></>}
 {view==='documents'&&<section><h2>Source documents</h2><p>Saved originals and their extracted text.</p><button disabled={busy} onClick={()=>{setForm({kind:'upload'});setDraft({});}}>Add document</button><form className="search" onSubmit={e=>{e.preventDefault();void run(async()=>setSearch(await call('search_documents',{workspaceId:state.workspaceId,query:docQuery})));}}><input required value={docQuery} onChange={e=>setDocQuery(e.target.value)} placeholder="Search extracted text"/><button disabled={busy}>Search documents</button></form>{search&&<div><p>{search.hits.length} matching passages · {search.coverage.unavailable} unavailable · {search.coverage.partial} partial · {search.coverage.pending} pending</p>{search.hits.map((h:any)=><article key={h.version_id}><strong>{h.filename} · v{h.version}</strong><p>{h.passage}</p></article>)}</div>}<div className="scroll"><table><thead><tr><th>Document</th><th>Version</th><th>Text availability</th><th/></tr></thead><tbody>{documents.map(d=><tr key={d.id}><td>{d.filename}</td><td>{d.version}</td><td>{extractionLabel(d.extraction_status)}</td><td><button disabled={busy} onClick={()=>run(async()=>setDocument(await call('read_document_text',{workspaceId:state.workspaceId,versionId:d.id})))}>Read text</button><button onClick={()=>setControlledDocument(d)}>Document controls</button><button disabled={busy} onClick={()=>run(async()=>{const r=await bridge.callServerTool({name:'download_original',arguments:{workspaceId:state.workspaceId,versionId:d.id}});if(r.isError)throw Error('Original download failed');const file=(r._meta as any)?.file;const downloaded=await bridge.downloadFile({contents:[{type:'resource',resource:{uri:'file:///'+encodeURIComponent(file.filename),mimeType:file.mime,blob:file.base64}}]});if(downloaded.isError)throw Error('Download was not completed by the host.');})}>Download</button>{!documents.some(x=>x.document_id===d.document_id&&x.version>d.version)&&<button disabled={busy} onClick={()=>{setForm({kind:'upload',document:d});setDraft({});}}>New version</button>}</td></tr>)}</tbody></table></div>{!documents.length&&<p>No AI-accessible documents in this workspace.</p>}</section>}
 {view==='tracker'&&appUpdating&&<div role="status" className="ty-tracker-notice">Updating app… You can continue using the saved version.</div>}{view==='tracker'&&(openedTracker||trackerPreview)&&<EmbeddedAppNavigation key={(openedTracker?.id??trackerPreview.id)+':'+JSON.stringify(trackerRoute)} appId={openedTracker?.id??trackerPreview.id} workspaceId={state.workspaceId} source={openedTracker?'component':'preview'} route={trackerRoute} origin={platform.origin} openLink={url=>{void bridge.openLink({url});}}>
 {view==='tracker'&&openedTracker&&!['save_component','create_tracker'].includes(trackerPreview?.body?.kind)&&<div inert={!!trackerPreview}><ComponentEditor initialOutput={trackerOutput} key={openedTracker.id+':'+openedTracker.version} component={openedTracker} projects={[]} call={(name,args,options)=>call(name,{workspaceId:state.workspaceId,...args},options)} onBack={returnHome} onPreview={p=>{setTrackerOutput(null);setTrackerPreview(p);}}/></div>}
 {view==='tracker'&&trackerPreview&&(['save_component','create_tracker'].includes(trackerPreview.body?.kind)?<TrackerDraft initialOutput={trackerOutput} key={trackerPreview.id+':'+trackerPreview.digest} preview={trackerPreview} call={call} onProposal={p=>{setTrackerOutput(null);setTrackerPreview(p);}} onSaved={(component,_output,route={path:'/'})=>{navigationEpoch.current++;transition.current.adopt(state.workspaceId+':saved:'+component.id+':'+component.version+':'+JSON.stringify(route));setTrackerRoute({path:'/'});setTrackerOutput(null);setTrackerPreview(null);setOpenedTracker(null);setHomeRevision(r=>r+1);setView('home');setNotice('');}} onDiscard={()=>{setTrackerPreview(null);if(!openedTracker)setView('home');}}/>:<ProposalReview key={trackerPreview.id} proposal={trackerPreview} busy={busy} summary="Your record changes are ready to save." onAction={()=>run(async()=>{const receipt=await call('confirm_workspace_change',{workspaceId:trackerPreview.workspaceId,previewId:trackerPreview.id,digest:trackerPreview.digest,confirmed:true});const data=await call('read_project_component',{workspaceId:trackerPreview.workspaceId,componentId:receipt.id});const output=await call('run_component_frontend',{workspaceId:trackerPreview.workspaceId,request:{componentId:data.component.id,expectedVersion:data.component.version,event:{kind:'open'}}});transition.current.adopt(trackerPreview.workspaceId+':saved:'+data.component.id+':'+data.component.version);setTrackerOutput(output);setTrackerPreview(null);setOpenedTracker(data.component);setNotice('');})} onDismiss={()=>run(async()=>{await call('discard_workspace_preview',{workspaceId:trackerPreview.workspaceId,previewId:trackerPreview.id});setTrackerPreview(null);if(!openedTracker)setView('home');})}/>)}
 </EmbeddedAppNavigation>}
 {view==='home'&&noAccessibleWorkspace&&<section className="ty-access-page"><div className="ty-page-heading"><h1>Apps</h1></div><div className="ty-empty"><h2>Account connected · access not enabled</h2><p>Your TrialAgents account is connected, but no account database is available to ChatGPT. Your owner can review ChatGPT access in TrialAgents.</p><div className="ty-actions"><button className="ty-button ty-button--primary" onClick={()=>void bridge.openLink({url:platform.origin+'/?tab=access-control'})}>Review ChatGPT access</button><button className="ty-button" disabled={busy} onClick={()=>void run(()=>open())}>Check access again</button></div></div></section>}
 {visited.includes('home')&&!noAccessibleWorkspace&&<div hidden={view!=='home'}><WorkspaceView.Provider value={view==='home'?reportView:null}><HomePanel active={view==='home'} onBrowseTemplates={()=>setView('templates')} onAppVisibilityChange={onHomeAppVisibility} onCompose={async message=>{const result=await bridge.sendMessage({role:"user",content:[{type:"text",text:message}]});if(result.isError)throw Error("Could not send the request to chat. Please type it in the conversation.");}} onLegacyAutomations={()=>setView('automations')} viewerId={state.viewerId} key={state.viewerId+':'+state.workspaceId+':'+homeRevision} workspaceId={state.workspaceId??''} types={state.types} call={call} loadHome={homeFromResult} onDocuments={()=>{setView('documents');void run(async()=>setDocuments(await call('list_documents',{workspaceId:state.workspaceId})));}}/></WorkspaceView.Provider></div>}
 {view==='connectors'&&state.workspaceId&&<EmbeddedConnectors key={state.workspaceId} workspaceId={state.workspaceId} call={call}/>}
 {view==='automations'&&state.workspaceId&&<AutomationsPage key={state.workspaceId+':'+automationsRevision+':'+(platformApp??'')} appId={platformApp??undefined} call={(name,args)=>call(name,{...args,workspaceId:state.workspaceId})}/>}
 {view==='automations'&&!state.workspaceId&&<section className="ty-page"><h1>Automations</h1><p>Connect an accessible account to manage automations.</p></section>}
 {view==='access-control'&&<section className="ty-access-page"><AccessPage call={call} initialWorkspaceId={state.workspaceId} openLink={url=>{void bridge.openLink({url});}}/></section>}
 {view==='logs'&&!state.workspaceId&&<section className="ty-page"><h1>Logs</h1><p>No events to show.</p></section>}
 {view==='logs'&&state.workspaceId&&<LogsPanel key={platformApp??''} initialAppId={platformApp??undefined} workspaceId={state.workspaceId??''} call={call} onDownload={async(name,text)=>{const bytes=new TextEncoder().encode(text);let binary='';for(const b of bytes)binary+=String.fromCharCode(b);const result=await bridge.downloadFile({contents:[{type:'resource',resource:{uri:'file:///'+name,mimeType:'text/csv',blob:btoa(binary)}}]});if(result.isError)throw Error('Download was not completed by the host.');}}/>}

 {visited.includes('projects')&&<div hidden={view!=='projects'}><ProjectsPanel key={state.workspaceId} workspaceId={state.workspaceId??''} types={state.types} call={call} incoming={organizationIncoming}/></div>}
 {visited.includes('code')&&<div hidden={view!=='code'}><FoundationPanel key={state.workspaceId} workspaceId={state.workspaceId??''} types={state.types} call={call} incoming={foundationIncoming}/></div>}
 {(['trackers','forms','visuals'] as const).map(key=>visited.includes(key)&&<div key={key+state.workspaceId} hidden={view!==key}><ResourcesPanel workspaceId={state.workspaceId??''} kind={key==='trackers'?'tracker':key==='forms'?'form':'visualization'} projectId={projectId} types={state.types} call={call}/></div>)}
 {visited.includes('database')&&<div hidden={view!=='database'}><WorkspaceView.Provider value={view==='database'?reportView:null}><DatabasePanel contextActive={view==='database'} onDownload={async(name,text)=>{const bytes=new TextEncoder().encode(text);let binary='';for(const b of bytes)binary+=String.fromCharCode(b);const result=await bridge.downloadFile({contents:[{type:'resource',resource:{uri:'file:///'+name,mimeType:'text/csv',blob:btoa(binary)}}]});if(result.isError)throw Error('Download was not completed by the host.');}} key={state.workspaceId} workspaceId={state.workspaceId??''} call={call} onAccess={id=>{void bridge.openLink({url:platform.origin+'/?tab=database&access=1'+(id?'&workspaceId='+encodeURIComponent(id):'')});}} onOpenTable={id=>{setTypeId(id);setView('records');void run(()=>records(state.workspaceId,id,0,'',''));}}/></WorkspaceView.Provider></div>}</>}
 {versions&&<RecordHistory key={versions.recordId} history={versions} busy={busy} onClose={()=>setVersions(null)} onPage={offset=>run(async()=>setVersions(await call('record_versions',{workspaceId:state.workspaceId,recordId:versions.recordId,offset})))}/>}
 {document&&<DocumentText document={document} busy={busy} onClose={()=>setDocument(null)} onPage={offset=>run(async()=>setDocument(await call('read_document_text',{workspaceId:state.workspaceId,versionId:document.versionId,offset})))}/>}
 {importing&&<BulkImport typeId={typeId} fields={fields} busy={busy} onClose={()=>setImporting(false)} onCheck={input=>call('check_import',{workspaceId:state.workspaceId,...input})} onPreview={operation=>run(()=>prepare(operation))}/>}
 {form?.kind==='upload'&&<section className="panel"><h2>{form.document?'New document version':'Add original document'}</h2><input aria-label="Original file" type="file" onChange={e=>setDraft({file:e.target.files?.[0]})}/><p>This original will be available to ChatGPT. Preview it before saving. Extraction happens after the original is saved.</p><button disabled={busy} onClick={()=>setForm(null)}>Cancel</button><button disabled={busy||!draft.file} onClick={()=>run(async()=>{const f:File=draft.file;if(f.size>25*1024*1024)throw Error('Choose a file under 25 MiB');const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('File could not be read'));reader.readAsDataURL(f);});setPreview(await call('preview_document_upload',{workspaceId:state.workspaceId,filename:f.name,mime:f.type||'application/octet-stream',base64,...(form.document?{documentId:form.document.document_id,expectedVersion:form.document.version}:{})}));setForm(null);})}>Preview original</button></section>}
 {form&&form.kind!=='upload'&&<section className="panel"><h2>{form.kind==='table'?'New table':form.record?'Edit record':'New record'}</h2><form onSubmit={e=>{e.preventDefault();void run(()=>prepare(form.kind==='table'?{kind:form.table?'update_type':'create_type',...(form.table?{typeId:form.table.id,expectedVersion:form.table.version}:{}),name:draft.name,fields:draft.fields}:form.record?{kind:'update_record',recordId:form.record.id,expectedVersion:form.record.version,data:editableData(fields,draft)}:{kind:'create_record',typeId,data:editableData(fields,draft)}));}}>{form.kind==='table'?<label>Table name<input required value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))}/></label>:fields.map(f=><label key={f.key}>{f.name}{f.required?' *':''}{input(f)}</label>)}{form.kind==='table'&&<FieldEditor fields={draft.fields} types={state.types} existing={form.table?.fields} onChange={fields=>setDraft(d=>({...d,fields}))}/>}<footer><button type="button" onClick={()=>setForm(null)}>Cancel</button><button disabled={busy}>Preview changes</button></footer></form></section>}
 {controlledDocument&&<DocumentControls key={controlledDocument.id} document={controlledDocument} busy={busy} onClose={()=>setControlledDocument(null)} onPreview={op=>run(async()=>{setPreview(await call('prepare_change',{workspaceId:state.workspaceId,operation:op}));setControlledDocument(null);})}/>}
 {preview&&<section className="panel"><small>PREVIEW · NOT SAVED</small><h2>Review before saving</h2><ChangeSummary value={preview.summary}/><footer><button disabled={busy} onClick={()=>run(async()=>{await call('discard_preview',{previewId:preview.id});setPreview(null);})}>Discard</button><button disabled={busy} onClick={()=>run(async()=>{await call('commit_change',{previewId:preview.id,digest:preview.digest,confirmed:true});setPreview(null);setNotice('Saved to TrialAgents.');await open(preview.workspaceId);})}>Confirm and save</button></footer></section>}
 </div></WorkspaceShell></PendingChangesProvider></AccessHost.Provider></WorkspaceView.Provider></AppPlatform.Provider>;
}
createRoot(document.getElementById('root')!).render(<Workspace/>);



