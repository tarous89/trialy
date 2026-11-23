import type {WorkspaceRequestOptions} from './workspace-request.js';
import {WorkspaceShell} from './ui/WorkspaceShell.js';
import {AssistantLinks} from './AssistantLinks.js';
import {SystemNotice} from './SystemNotice.js';
import {AppUnavailable,NoAccessPage} from './AppUnavailable.js';
import {NoAppAccess,ViewOnlyStatus,AccessRequestDialog} from './AppAccess.js';
import {takeEarlyRead,earlyReadKey} from './early-reads.js';
import {fetchAppCode} from './app-code.js';
import {openBrowserRequest} from './FrontendCodeRuntime.js';
/** L2.2: the website's app open also asks for what the app frame needs to run the app itself (never the code inline). */
export function appResolveHeaders(location:unknown):Record<string,string>{const browser=openBrowserRequest();return {'X-App-Location':JSON.stringify(location),...(browser?{'X-App-Browser':JSON.stringify(browser)}:{})};}
import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AppPlatform,AppNavigation,APP_BRAND} from './AppPlatform.js';
import {appUrl,parseAppUrl,accessRequestParam} from './app-route.js';
import {resolveAppLink} from './app-links.js';
import {ComponentEditor} from './ComponentEditor.js';
import {TrackerDraft} from './TrackerDraft.js';
import {FoundationPanel} from './FoundationPanel.js';
import {CollectionsPanel} from './CollectionsPanel.js';
import {ChangeSummary} from './ChangeSummary.js';
import {Button} from './ui/Controls.js';
import {PendingChangesProvider,ProposalReview,type PendingChange} from './PendingChanges.js';
import './ui/design.css';import './ui/brand.css';import './ui/scroll.css';import './app-pages.css';
import {AppOpeningFrame} from './AppOpeningFrame.js';
import {firstScreenShown} from './first-screen.js';
import {knownApp,rememberApp,forgetApp,appTabNames} from './last-known.js';
type Call=(name:string,args:any,options?:WorkspaceRequestOptions)=>Promise<any>;
export function StandaloneApp({signedIn,loading=false,call,api,accountName='Account',accountEmail}:{accountName?:string;accountEmail?:string;signedIn:boolean;loading?:boolean;call:Call;api:(path:string,method?:string,body?:unknown,options?:WorkspaceRequestOptions)=>Promise<any>}){
 const [url,setUrl]=useState(location.pathname+location.search),current=useMemo(()=>parseAppUrl(url),[url]);
 const [reset,setReset]=useState(0),[loadFailed,setLoadFailed]=useState(false),[loadStatus,setLoadStatus]=useState(0);
 const [loaded,setLoaded]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[proposal,setProposal]=useState<any>(null),[pending,setPending]=useState<string|null>(null),[reload,setReload]=useState(0);
 const [automationNotice,setAutomationNotice]=useState(false);
 useEffect(()=>{if(!loaded||!current)return;try{const key='trialy:automation-install:'+current.appId;if(sessionStorage.getItem(key)){sessionStorage.removeItem(key);setAutomationNotice(true);}}catch{}},[loaded,current?.appId]);
 const dirty=useRef(false),activeUrl=useRef(url);const setDirty=useCallback((value:boolean)=>{dirty.current=value;},[]);
 const assign=(next:string,replace=false)=>{if(replace)history.replaceState(null,'',next);else history.pushState(null,'',next);activeUrl.current=next;setUrl(next);};
 const navigate=(href:string)=>{if(!current)return;const target=resolveAppLink(href,current,location.origin);if(!target){setError('This link is not available.');return;}if(target.kind==='external'){window.open(target.href,'_blank','noopener,noreferrer');return;}if(dirty.current||proposal){setPending(target.href);return;}if(target.kind==='platform'){location.assign(target.href);return;}assign(target.href);};
 useEffect(()=>{const pop=()=>{const next=location.pathname+location.search;if(dirty.current||proposal){history.pushState(null,'',activeUrl.current);setPending(next);}else{activeUrl.current=next;setUrl(next);}};const unload=(e:BeforeUnloadEvent)=>{if(dirty.current||proposal){e.preventDefault();e.returnValue='';}};window.addEventListener('popstate',pop);window.addEventListener('beforeunload',unload);return()=>{window.removeEventListener('popstate',pop);window.removeEventListener('beforeunload',unload);};},[proposal]);
 useEffect(()=>{if(!signedIn||!current)return;let live=true;setLoadFailed(false);setLoaded((old:any)=>old?.appId===current.appId&&old?.workspaceId===current.workspaceId&&old?.source===current.source?old:null);void takeEarlyRead(earlyReadKey('app',current),()=>api('/api/apps/resolve','GET',undefined,{headers:appResolveHeaders(current)})).then(r=>{if(live){setLoaded({...r,loadedRevision:reload});firstScreenShown();document.title=r.component?.name??r.resource?.name??'App';if(current.source==='component'&&r.component)rememberApp(current.workspaceId,current.appId,{name:r.component.name,tabs:appTabNames(r.component)});}}).catch(e=>{if(live){setLoadFailed(true);setLoadStatus(e.status??0);if([401,403,404].includes(e.status)){setLoaded(null);forgetApp(current.workspaceId,current.appId);}}});return()=>{live=false;};},[signedIn,current?.appId,current?.workspaceId,current?.source,reload]);
 const invoke=(name:string,args:any={},options?:WorkspaceRequestOptions)=>call(name,{workspaceId:current?.workspaceId,...args},options);
 // L4.1: a return visit shows the app's last known name and tab names at once, while it loads (never its records).
 const remembered=signedIn&&current?.source==='component'?knownApp(current.workspaceId,current.appId):undefined;
 const platformNavigate=(tab:string,kind?:string)=>{const next='/?tab='+encodeURIComponent(tab==='settings'?'access':tab)+(kind?'&new='+encodeURIComponent(kind):'')+(current?.workspaceId?'&workspaceId='+current.workspaceId:'');if(dirty.current||proposal){setPending(next);return;}location.assign(next);};
 const goHome=()=>{if(dirty.current||proposal){setPending('/?tab=home');return;}location.assign(APP_BRAND.home+'?tab=home');};
 const component=loaded?.component??loaded?.preview?.component;
 // A5: an emailed link names the request to answer. It is kept across sign-in and shown once the app is open.
 const requestKey=current?'trialy:access-request:'+current.appId:'';
 const [accessRequest,setAccessRequest]=useState<string|null>(()=>{const asked=accessRequestParam(location.search);try{if(asked&&requestKey)sessionStorage.setItem(requestKey,asked);return asked??(requestKey?sessionStorage.getItem(requestKey):null);}catch{return asked;}});
 const closeAccessRequest=()=>{setAccessRequest(null);try{sessionStorage.removeItem(requestKey);}catch{}if(current&&accessRequestParam(location.search))assign(appUrl(current),true);};
 // U3: one plain page for an app this person cannot open, or can no longer open.
 const noAccess=current?.source==='component'?<NoAppAccess key={current.appId} api={api} workspaceId={current.workspaceId} appId={current.appId} onHome={goHome}/>:null;

 // A6, B1: pending app changes come back from the server; Review opens the change itself, never approves it blind.
 const openPending=(c:PendingChange)=>{if(!current)return;const next=appUrl({workspaceId:current.workspaceId,appId:c.previewId,source:'preview'});if(dirty.current||proposal){setPending(next);return;}setReset(n=>n+1);assign(next);};
 const pendingCall=useCallback((name:string,args:any,options?:WorkspaceRequestOptions)=>call(name,args,options),[call]);
 return <AppPlatform.Provider value={{enabled:true,origin:location.origin,loadAppCode:fetchAppCode}}><PendingChangesProvider call={pendingCall} workspaceId={signedIn?current?.workspaceId:null} onOpen={openPending}><WorkspaceShell headerActions={component&&current?<AssistantLinks iconsOnly prompt={'Customize my TrialAgents app (app ID '+current.appId+', workspace ID '+current.workspaceId+'). Read the saved app before making changes.'}/>:undefined} appView selected="home" accountName={accountName} accountEmail={accountEmail} onNavigate={platformNavigate} onNew={kind=>platformNavigate("create",kind)}><AppNavigation.Provider value={current?{route:current.route,reset,navigate,setDirty}:null}>
 {!current?<AppUnavailable onHome={goHome}/>:loading?<div aria-busy="true" aria-label="Loading app"/>:!signedIn?<section className="ty-empty"><h1>Sign in to open this app</h1><a className="ty-button ty-button--primary" href={'/auth/login?returnTo='+encodeURIComponent(appUrl(current))}>Sign in</a></section>:<>
 {automationNotice&&<SystemNotice message="App added. Automation setup continues in the background." onDismiss={()=>setAutomationNotice(false)}><button onClick={()=>platformNavigate('automations')}>View Automations</button></SystemNotice>}
 {error&&<SystemNotice error message={error} onDismiss={()=>setError('')}/>}{!loaded&&(loadFailed?([403,404].includes(loadStatus)&&noAccess)||<AppUnavailable onHome={goHome} reason={[401,403,404].includes(loadStatus)?'missing':'load'} onRetry={()=>setReload(n=>n+1)}/>:remembered?<AppOpeningFrame name={remembered.name} tabs={remembered.tabs}/>:<div aria-busy="true" aria-label="Loading app"/>)}
 {loaded?.component?.app_role==='viewer'&&<ViewOnlyStatus key={loaded.component.id} api={api} workspaceId={current.workspaceId} appId={loaded.component.id}/>}
 {loaded?.component&&accessRequest&&<AccessRequestDialog key={accessRequest} api={api} workspaceId={current.workspaceId} appId={loaded.component.id} requestId={accessRequest} onClose={closeAccessRequest}/>}
 <NoAccessPage.Provider value={noAccess}>
 {component&&<ComponentEditor key={component.id+':'+loaded.loadedRevision} initialOutput={loaded.initialOutput} component={component} projects={[]} call={invoke} onBack={goHome} onPreview={setProposal}/>}
 {!component&&loaded?.preview?.preview&&<TrackerDraft preview={loaded.preview.preview} call={invoke} onSaved={c=>{setDirty(false);assign(appUrl({...current,appId:c.id,source:'component'}),true);}} onDiscard={goHome} onProposal={setProposal}/>}
 {loaded?.source==='function'&&<FoundationPanel workspaceId={current.workspaceId} types={[]} call={call} initialRevisionId={loaded.resource.revisionId}/>}
 {loaded?.source==='collection'&&<CollectionsPanel call={invoke} onBack={goHome} onPreview={setProposal} initialLinkId={current.appId}/>}
 {loaded?.source==='legacy'&&<LegacyApp api={api} workspaceId={current.workspaceId} resource={loaded.resource}/>}
 </NoAccessPage.Provider>
 {proposal&&<ProposalReview key={proposal.id} proposal={proposal} busy={busy} summary={<ChangeSummary value={proposal.summary??proposal.body}/>}
  onDismiss={async()=>{try{await invoke('discard_workspace_preview',{previewId:proposal.id});setProposal(null);setDirty(false);setReload(n=>n+1);}catch(e){setError((e as Error).message);}}}
  onAction={async approve=>{setBusy(true);try{const app=['save_component','create_tracker'].includes(proposal.body?.kind);if(app){if(!await approve(invoke,proposal,'Publish'))return;}else await invoke('confirm_workspace_change',{previewId:proposal.id,digest:proposal.digest,confirmed:true});setProposal(null);setDirty(false);setReload(n=>n+1);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}/>}
 </>}
 {pending&&<div className="ty-content-overlay"><section className="ty-confirm-dialog" role="alertdialog" aria-modal="true" aria-label="Unsaved changes"><h3>Keep your edits?</h3><p>Your changes have not been saved.</p><Button autoFocus onClick={()=>setPending(null)}>Keep editing</Button><Button onClick={()=>{const next=pending;setPending(null);setDirty(false);setProposal(null);if(next===APP_BRAND.website)location.assign(APP_BRAND.website);else if(next==='/'||next.startsWith('/?tab='))location.assign(next);else{setReset(n=>n+1);assign(next);}}}>Discard edits and continue</Button></section></div>}
 </AppNavigation.Provider></WorkspaceShell></PendingChangesProvider></AppPlatform.Provider>;
}
function LegacyApp({api,workspaceId,resource}:{api:(p:string,m?:string,b?:unknown)=>Promise<any>;workspaceId:string;resource:any}){
 const [paused,setPaused]=useState(resource.status==='Paused'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <section><div className="ty-page-heading"><h1>{resource.name}</h1></div><p>{resource.description}</p><Button disabled={busy} onClick={()=>{setBusy(true);void api(`/api/workspaces/${workspaceId}/automations/${resource.id}/pause`,'POST',{paused:!paused}).then(()=>setPaused(!paused)).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}>{paused?'Resume':'Pause'}</Button>{error&&<p role="alert">{error}</p>}<p><a href={'/?tab=logs&workspaceId='+workspaceId}>View execution history</a></p></section>;
}
