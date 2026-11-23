import React from 'react';
/** L2.5 / L4.1: an app's frame while its first screen loads: its name and, when last known (src/shared/last-known.ts),
 * its tab names. Shown at once; the app replaces it when its first screen arrives. */
export function AppOpeningFrame({name,tabs=[],before}:{name?:string;tabs?:string[];before?:React.ReactNode}){
 return <section className="ty-page ty-fixed ty-app-opening" aria-busy="true">{before}<h1>{name}</h1>{tabs.length>0&&<div className="ty-known-tabs" aria-hidden="true">{tabs.map((t,i)=><span key={i}>{t}</span>)}</div>}<div className="ty-runtime-loading" aria-label="Loading app"/></section>;
}
