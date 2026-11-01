import {AppUnavailable} from './AppUnavailable.js';
import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AppPlatform,AppNavigation,APP_BRAND} from './AppPlatform.js';
import {appUrl,parseAppUrl} from './app-route.js';
import {resolveAppLink} from './app-links.js';
import {ComponentEditor} from './ComponentEditor.js';
import {TrackerDraft} from './TrackerDraft.js';
import {FoundationPanel} from './FoundationPanel.js';
import {CollectionsPanel} from './CollectionsPanel.js';
import {ChangeSummary} from './ChangeSummary.js';
import {Button} from './ui/Controls.js';
import './ui/design.css';import './ui/brand.css';import './ui/scroll.css';import './app-pages.css';
type Call=(name:string,args:any)=>Promise<any>;
export function StandaloneApp({signedIn,loading=false,call,api}:{signedIn:boolean;loading?:boolean;call:Call;api:(path:string,method?:string,body?:unknown)=>Promise<any>}){
 const [url,setUrl]=useState(location.pathname+location.search),current=useMemo(()=>parseAppUrl(url),[url]);
 const [reset,setReset]=useState(0),[loadFailed,setLoadFailed]=useState(false);
 const [loaded,setLoaded]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[proposal,setProposal]=useState<any>(null),[pending,setPending]=useState<string|null>(null),[reload,setReload]=useState(0);
 const dirty=useRef(false),activeUrl=useRef(url);const setDirty=useCallback((value:boolean)=>{dirty.current=value;},[]);
 const assign=(next:string,replace=false)=>{if(replace)history.replaceState(null,'',next);else history.pushState(null,'',next);activeUrl.current=next;setUrl(next);};
 const navigate=(href:string)=>{if(!current)return;const target=resolveAppLink(href,current,location.origin);if(!target){setError('This link is not available.');return;}if(target.kind!=='internal'){window.open(target.href,'_blank','noopener,noreferrer');return;}if(dirty.current||proposal){setPending(target.href);return;}assign(target.href);};
 useEffect(()=>{const pop=()=>{const next=location.pathname+location.search;if(dirty.current||proposal){history.pushState(null,'',activeUrl.current);setPending(next);}else{activeUrl.current=next;setUrl(next);}};const unload=(e:BeforeUnloadEvent)=>{if(dirty.current||proposal){e.preventDefault();e.returnValue='';}};window.addEventListener('popstate',pop);window.addEventListener('beforeunload',unload);return()=>{window.removeEventListener('popstate',pop);window.removeEventListener('beforeunload',unload);};},[proposal]);
 useEffect(()=>{if(!signedIn||!current)return;let live=true;setLoadFailed(false);setLoaded((old:any)=>old?.appId===current.appId&&old?.workspaceId===current.workspaceId&&old?.source===current.source?old:null);void api('/api/apps/resolve','POST',current).then(r=>{if(live){setLoaded({...r,loadedRevision:reload});document.title=r.component?.name??r.resource?.name??'App';}}).catch(e=>{if(live){setLoadFailed(true);if([401,403,404].includes(e.status))setLoaded(null);}});return()=>{live=false;};},[signedIn,current?.appId,current?.workspaceId,current?.source,reload]);
 const invoke=(name:string,args:any={})=>call(name,{workspaceId:current?.workspaceId,...args});
 const goHome=()=>{if(dirty.current||proposal){setPending('/?tab=home');return;}location.assign(APP_BRAND.home+'?tab=home');};
 const component=loaded?.component??loaded?.preview?.component;
 const watermark=<a className="ty-app-watermark" href={APP_BRAND.website} onClick={e=>{if(dirty.current||proposal){e.preventDefault();setPending(APP_BRAND.website);}}}><img src="/trialagents-mark-white.png" width="18" height="18" alt="" aria-hidden="true"/>{APP_BRAND.watermark}</a>;
 return <AppPlatform.Provider value={{enabled:true,origin:location.origin}}><div className="ty-workspace ty-standalone"><div className="ty-main-column"><main id="ty-main"><AppNavigation.Provider value={current?{route:current.route,reset,navigate,setDirty}:null}>
 {!current?<AppUnavailable onHome={goHome}/>:loading?<div aria-busy="true" aria-label="Loading app"/>:!signedIn?<section className="ty-empty"><h1>Sign in to open this app</h1><a className="ty-button ty-button--primary" href={'/auth/login?returnTo='+encodeURIComponent(appUrl(current))}>Sign in</a></section>:<>
 {error&&<div role="alert"><p>{error}</p></div>}{!loaded&&(loadFailed?<AppUnavailable onHome={goHome}/>:<div aria-busy="true" aria-label="Loading app"/>)}
 {component&&<ComponentEditor key={component.id+':'+loaded.loadedRevision} component={component} projects={[]} call={invoke} onBack={goHome} onPreview={setProposal}/>}
 {!component&&loaded?.preview?.preview&&<TrackerDraft preview={loaded.preview.preview} call={invoke} onSaved={c=>{setDirty(false);assign(appUrl({...current,appId:c.id,source:'component'}),true);}} onDiscard={goHome} onProposal={setProposal}/>}
 {loaded?.source==='function'&&<FoundationPanel workspaceId={current.workspaceId} types={[]} call={call} initialRevisionId={loaded.resource.revisionId}/>}
 {loaded?.source==='collection'&&<CollectionsPanel call={invoke} onBack={goHome} onPreview={setProposal} initialLinkId={current.appId}/>}
 {loaded?.source==='legacy'&&<LegacyApp api={api} workspaceId={current.workspaceId} resource={loaded.resource}/>}
 {proposal&&<div className="ty-content-overlay"><section className="ty-confirm-dialog" role="dialog" aria-modal="true" aria-label="Review app changes"><h2>Review changes</h2><ChangeSummary value={proposal.summary??proposal.body}/><div className="ty-actions"><Button disabled={busy} onClick={()=>{void invoke('discard_workspace_preview',{previewId:proposal.id}).then(()=>{setProposal(null);setDirty(false);setReload(n=>n+1);}).catch(e=>setError(e.message));}}>Cancel</Button><Button variant="primary" disabled={busy} onClick={()=>{setBusy(true);void invoke('confirm_workspace_change',{previewId:proposal.id,digest:proposal.digest,confirmed:true}).then(()=>{setProposal(null);setDirty(false);setReload(n=>n+1);}).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}>Save changes</Button></div></section></div>}
 </>}
 {pending&&<div className="ty-content-overlay"><section className="ty-confirm-dialog" role="alertdialog" aria-modal="true" aria-label="Unsaved changes"><h3>Keep your edits?</h3><p>Your changes have not been saved.</p><Button autoFocus onClick={()=>setPending(null)}>Keep editing</Button><Button onClick={()=>{const next=pending;setPending(null);setDirty(false);setProposal(null);if(next===APP_BRAND.website)location.assign(APP_BRAND.website);else if(next==='/'||next==='/?tab=home')location.assign('/?tab=home');else{setReset(n=>n+1);assign(next);}}}>Discard edits and continue</Button></section></div>}
 </AppNavigation.Provider></main>{watermark}</div></div></AppPlatform.Provider>;
}
function LegacyApp({api,workspaceId,resource}:{api:(p:string,m?:string,b?:unknown)=>Promise<any>;workspaceId:string;resource:any}){
 const [paused,setPaused]=useState(resource.status==='Paused'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <section><div className="ty-page-heading"><h1>{resource.name}</h1></div><p>{resource.description}</p><Button disabled={busy} onClick={()=>{setBusy(true);void api(`/api/workspaces/${workspaceId}/automations/${resource.id}/pause`,'POST',{paused:!paused}).then(()=>setPaused(!paused)).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}>{paused?'Resume':'Pause'}</Button>{error&&<p role="alert">{error}</p>}<p><a href={'/?tab=logs&workspaceId='+workspaceId} target="_blank" rel="noopener noreferrer">View execution history</a></p></section>;
}
