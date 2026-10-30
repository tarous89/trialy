import React from 'react';
import type {HomeResource} from './HomeView.js';
import './app-covers.css';

const palettes=[
 ['#e2eee7','#b7d6c1','#285d49'],
 ['#e6ebf5','#becfe7','#385879'],
 ['#f4eadd','#e4c6a4','#815b34'],
 ['#efe7f3','#d4bcdf','#705283'],
 ['#f4e5e4','#e2bdb6','#88534c'],
 ['#e2efef','#afd2d2','#31686d'],
] as const;
/** An app keeps its identity across renames, moves and refreshes. No app code runs here. */
function identity(r:HomeResource){let h=2166136261;for(const c of r.id)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;}
export function appAppearance(r:HomeResource):React.CSSProperties{
 const h=identity(r),[paper,tint,ink]=palettes[h%palettes.length];
 return {'--app-paper':paper,'--app-tint':tint,'--app-ink':ink,'--app-angle':`${110+h%100}deg`,'--tool-tone':ink} as React.CSSProperties;
}
export function AppCover({resource:r,children}:{resource:HomeResource;children:React.ReactNode}){
 const motif=identity(r)%4;
 const initials=r.name.trim().split(/\s+/).slice(0,2).map(word=>Array.from(word)[0]??'').join('').toLocaleUpperCase();
 const hasSnapshot=!!r.preview||!!r.snapshot?.columns.length;
 return <div className={`ty-app-cover ty-app-cover--${motif} ${hasSnapshot?'has-snapshot':'has-monogram'}`}>
  <svg className="ty-app-cover-art" viewBox="0 0 320 180" fill="none" aria-hidden="true">
   {motif===0?<g>{[36,64,92,120].map(radius=><circle key={radius} cx="257" cy="48" r={radius}/>)}</g>
    :motif===1?<g transform="rotate(-28 220 90)">{[0,1,2,3].map(i=><rect key={i} x={130+i*28} y="-35" width="20" height="255" rx="10"/>)}</g>
    :motif===2?<g>{[0,1,2].map(i=><rect key={i} x={142+i*24} y={-12+i*24} width="132" height="132" rx="30" transform={`rotate(18 ${208+i*24} ${54+i*24})`}/>)}</g>
    :<g>{[0,1,2,3,4].map(i=><path key={i} d={`M${140+i*26} -20 C${20+i*26} 95 ${340+i*26} 90 ${170+i*26} 220`}/>)}</g>}
  </svg>
  <span className="ty-app-cover-mark">{initials||'A'}</span>
  {hasSnapshot?<div className="ty-app-cover-window">{children}</div>:<span className="ty-app-cover-wordmark">{r.name}</span>}
 </div>;
}
