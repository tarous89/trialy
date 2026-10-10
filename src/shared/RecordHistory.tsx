import React,{useState} from 'react';
import type {Field} from './schema.js';

export function RecordHistory({history,busy,onClose,onPage,onRestore}:{history:any;busy:boolean;onClose:()=>void;onPage:(offset:number)=>void;onRestore:(operation:unknown)=>void}) {
 const [reason,setReason]=useState('');
 return <section className="record-history"><h2>Saved version history</h2><p>Current version: {history.currentVersion}. Restoring creates a new revision. Previous versions and approvals stay in the history.</p>
 <button type="button" onClick={onClose}>Close history</button>
 {history.canRestore&&<label>Reason for restoration<input maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explain the correction"/></label>}
 {!history.canRestore&&<p>History is read-only here. Restoration requires edit access to all current fields and an editable record.</p>}
 {history.revisions.map((v:any)=><details key={v.version}><summary>Version {v.version} · {v.state.replaceAll('_',' ')} · {new Date(v.createdAt).toLocaleString()}</summary><small>Actor: {v.actorId}</small>
 <dl className="preview-values">{history.fields.map((f:Field)=><React.Fragment key={f.key}><dt>{f.name}</dt><dd>{String(v.data[f.key]??'—')}</dd></React.Fragment>)}</dl>
 {history.canRestore&&v.version<history.currentVersion&&<button type="button" disabled={busy||!reason.trim()} onClick={()=>onRestore({kind:'restore_record',recordId:history.recordId,sourceVersion:v.version,expectedVersion:history.currentVersion,expectedTypeVersion:history.typeVersion,reason:reason.trim()})}>Preview restoring version {v.version}</button>}
 </details>)}
 <footer><button type="button" disabled={busy||history.offset===0} onClick={()=>onPage(Math.max(0,history.offset-50))}>Newer versions</button><button type="button" disabled={busy||!history.hasMore} onClick={()=>onPage(history.offset+50)}>Older versions</button></footer>
 </section>;
}
