import React from 'react';
import type {Field} from './schema.js';

/** Read-only (A10): earlier values are not restored from history. Corrections are normal edits. */
export function RecordHistory({history,busy,onClose,onPage}:{history:any;busy:boolean;onClose:()=>void;onPage:(offset:number)=>void}) {
 return <section className="record-history"><h2>Saved version history</h2><p>Current version: {history.currentVersion}. This history is read-only. To correct a value, edit the record.</p>
 <button type="button" onClick={onClose}>Close history</button>
 {history.revisions.map((v:any)=><details key={v.version}><summary>Version {v.version} · {v.state.replaceAll('_',' ')} · {new Date(v.createdAt).toLocaleString()}</summary><small>Actor: {v.actorId}</small>
 <dl className="preview-values">{history.fields.map((f:Field)=><React.Fragment key={f.key}><dt>{f.name}</dt><dd>{String(v.data[f.key]??'—')}</dd></React.Fragment>)}</dl>
 </details>)}
 <footer><button type="button" disabled={busy||history.offset===0} onClick={()=>onPage(Math.max(0,history.offset-25))}>Newer versions</button><button type="button" disabled={busy||!history.hasMore} onClick={()=>onPage(history.offset+25)}>Older versions</button></footer>
 </section>;
}
