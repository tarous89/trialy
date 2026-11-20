import {derived} from './formulas.js';
import React,{useState} from 'react';
import {csvRows} from './csv.js';
import type {Field} from './schema.js';

type Issue={field:string|null;row:number|null;code:string;message:string};
type RowReport={row:number;status:'ready'|'problem'|'duplicate'|'conflict';data:Record<string,unknown>|null;issues:Issue[];matches?:{row?:number;recordId?:string;key:string;differences?:string[]}[]};
export type ImportReport={tableName:string;headerIssues:Issue[];rows:RowReport[];summary:{ready:number;problem:number;duplicate:number;conflict:number;total:number}};

const STATUS:Record<RowReport['status'],string>={ready:'Ready',problem:'Needs fixing',duplicate:'Already there',conflict:'Conflicting values'};
function explain(r:RowReport){
 if(r.status==='problem')return r.issues.map(i=>i.message).join('; ');
 return (r.matches??[]).map(m=>`${m.key} matches ${m.row?`row ${m.row}`:'a saved record'}${m.differences?.length?` with different ${m.differences.join(', ')}`:''}`).join('; ');
}

/**
 * X3, X4 (4.2): the server checks the whole file first and reports every problem by row. Only rows without problems,
 * duplicates or conflicts are offered for import; nothing is merged or corrected automatically.
 */
export function BulkImport({typeId,fields,busy,onPreview,onCheck,onClose}:{typeId:string;fields:Field[];busy:boolean;onPreview:(operation:unknown)=>Promise<void>;onCheck:(input:{typeId:string;headers:string[];rows:string[][]})=>Promise<ImportReport>;onClose:()=>void}) {
 const [text,setText]=useState(''),[error,setError]=useState(''),[report,setReport]=useState<ImportReport|null>(null),[checking,setChecking]=useState(false);
 const ready=report?.rows.filter(r=>r.status==='ready')??[];
 const check=async()=>{setError('');setReport(null);setChecking(true);try{
  const rows=csvRows(text,201);const headers=rows.shift();if(!headers?.length||!rows.length)throw Error('Include a header and at least one data row.');if(rows.length>200)throw Error('Import up to 200 rows at a time.');
  setReport(await onCheck({typeId,headers,rows}));
 }catch(e){setError((e as Error).message);}finally{setChecking(false);}};
 return <section className="bulk-import"><h2>Import records</h2><p>CSV columns: {fields.filter(f=>!derived(f)).map(f=>f.name).join(', ')}. Up to 200 rows. Numbers like 1,234.5 and dates like 2026-11-20 are read as written; ambiguous values are reported, not guessed.</p>
 <input aria-label="CSV file" type="file" accept=".csv,text/csv" onChange={async e=>{try{const f=e.target.files?.[0];if(f){if(f.size>1024*1024)throw Error('Choose a CSV under 1 MiB.');setText(await f.text());setReport(null);setError('');}}catch(e){setError((e as Error).message);}}}/>
 <textarea aria-label="CSV contents" rows={8} value={text} onChange={e=>{setText(e.target.value);setReport(null);}} maxLength={1048576}/>
 {error&&<p role="alert">{error}</p>}
 {report&&<div className="import-report" aria-live="polite">
  {report.headerIssues.length?<ul className="import-issues">{report.headerIssues.map((i,n)=><li key={n}>{i.message}</li>)}</ul>:<>
  <p><strong>{report.summary.ready} of {report.summary.total} rows are ready.</strong>{report.summary.problem?` ${report.summary.problem} need fixing.`:''}{report.summary.duplicate?` ${report.summary.duplicate} are already there.`:''}{report.summary.conflict?` ${report.summary.conflict} conflict with existing values.`:''}</p>
  {report.rows.some(r=>r.status!=='ready')&&<table className="import-rows"><thead><tr><th>Row</th><th>Status</th><th>Details</th></tr></thead><tbody>{report.rows.filter(r=>r.status!=='ready').map(r=><tr key={r.row} data-status={r.status}><td>{r.row}</td><td>{STATUS[r.status]}</td><td>{explain(r)}</td></tr>)}</tbody></table>}
  {report.rows.some(r=>r.status!=='ready')&&<p className="import-note">Fix these rows in the file and check again, or import only the ready rows. Rows that match a record are never merged.</p>}</>}
 </div>}
 <button disabled={busy} onClick={onClose}>Cancel</button>
 <button disabled={busy||checking||!text} onClick={()=>void check()}>{report?'Check again':'Check import'}</button>
 {report&&ready.length>0&&<button className="primary" disabled={busy} onClick={async()=>{try{setError('');await onPreview({kind:'bulk_records',changes:ready.map(r=>({kind:'create_record',typeId,data:r.data}))});}catch(e){setError((e as Error).message);}}}>Preview {ready.length===report.summary.total?'import':`${ready.length} ready rows`}</button>}
 </section>;
}
