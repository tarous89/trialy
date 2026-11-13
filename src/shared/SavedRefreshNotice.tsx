import React from 'react';
export type SavedRefreshPhase='refreshing'|'failed'|'unavailable'|null;
export const savedViewUnavailable=(e:any)=>e?.code==='component_archived'||[401,403,404].includes(e?.status);
/** A durable acknowledgement, separate from a transient save error. */
export function SavedRefreshNotice({phase,onRetry,target='data'}:{phase:SavedRefreshPhase;onRetry?:()=>void;target?:'data'|'app'}){
 if(!phase)return null;
 return <div role="status" aria-atomic="true" data-save-status={phase} style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:12,padding:'12px 16px',margin:'8px 0',border:'1px solid #cadbce',borderRadius:8,background:'#f0f7f2',color:'#244b36'}}><span>{phase==='refreshing'?'Saved. Updating this view…':phase==='unavailable'?'Saved. This app is no longer available.':'Saved. This view could not refresh.'}</span>{phase==='failed'&&onRetry&&<button className="ty-button secondary" type="button" onClick={onRetry}>Reload saved {target}</button>}</div>;
}
