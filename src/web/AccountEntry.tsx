import React from 'react';
import '../shared/account.css';

export function AccountEntry({brand,signInHref,error,onDemo}:{brand:string;signInHref:string;error?:string;onDemo?:()=>void}){
 return <main className="ty-account-entry">
  <header className="ty-entry-header">
   <a className="ty-entry-brand" href="https://trialagents.com/" target="_blank" rel="noopener noreferrer" aria-label="TrialAgents home (opens in a new tab)"><img src="/trialagents-mark-black.png" width="32" height="32" alt=""/><span>{brand}</span></a>
   <a className="ty-entry-home" href="https://trialagents.com/">← Back to home</a>
  </header>
  <div className="ty-entry-body"><section className="ty-entry-panel" aria-labelledby="ty-entry-title">
   <img className="ty-entry-mark" src="/trialagents-mark-black.png" width="52" height="52" alt=""/>
   <h1 id="ty-entry-title">Your projects.<br/>Your tools.</h1>
   <p className="ty-entry-subtitle">Bring your projects, tools and data together with ChatGPT.<br/>Explore in preview. Save when you're ready.</p>
   <a className="ty-entry-primary" href={signInHref}>Sign in to {brand} →</a>
   {onDemo&&<button className="ty-entry-demo" onClick={onDemo}>Open local demo</button>}
   <p className="ty-entry-note">Designed for clinical operations. Not fit for patient-level data.</p>
   {error&&<p className="ty-entry-error" role="alert">{error}</p>}
  </section></div>
 </main>;
}
