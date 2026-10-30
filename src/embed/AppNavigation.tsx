import React,{useCallback,useRef,useState} from 'react';
import {AppNavigation} from '../shared/AppPlatform.js';
import {parseAppUrl,type AppRoute} from '../shared/app-route.js';
import {resolveAppLink} from '../shared/app-links.js';

/** Page navigation stays in the extension; leaving the app uses the host bridge. */
export function EmbeddedAppNavigation({appId,workspaceId,source,route:initialRoute,origin,openLink,children}:{appId:string;workspaceId:string;source:'component'|'preview';route:AppRoute;origin:string;openLink:(url:string)=>void;children:React.ReactNode}){
 const [route,setRoute]=useState(initialRoute),[reset,setReset]=useState(0),[pending,setPending]=useState<AppRoute|null>(null),[error,setError]=useState('');
 const dirty=useRef(false),setDirty=useCallback((value:boolean)=>{dirty.current=value;},[]);
 const navigate=(href:string)=>{
  const target=resolveAppLink(href,{appId,workspaceId,source,route},origin);
  if(!target){setError('This link is not available.');return;}
  if(target.kind!=='internal'){openLink(target.href);return;}
  const next=parseAppUrl(target.href)!.route;setError('');
  if(dirty.current)setPending(next);else setRoute(next);
 };
 return <AppNavigation.Provider value={{route,reset,location:{appId,workspaceId,source},navigate,setDirty}}>{error&&<p role="alert">{error}</p>}{children}{pending&&<div className="ty-content-overlay"><section className="ty-confirm-dialog" role="alertdialog" aria-modal="true" aria-label="Unsaved changes"><h3>Keep your edits?</h3><p>Your changes have not been saved.</p><button autoFocus onClick={()=>setPending(null)}>Keep editing</button><button onClick={()=>{setRoute(pending);setPending(null);setDirty(false);setReset(n=>n+1);}}>Discard edits and continue</button></section></div>}</AppNavigation.Provider>;
}
