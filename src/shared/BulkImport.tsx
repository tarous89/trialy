import React,{useState} from 'react';
import {csvRecords} from './csv.js';
import type {Field} from './schema.js';
export function BulkImport({typeId,fields,busy,onPreview,onClose}:{typeId:string;fields:Field[];busy:boolean;onPreview:(operation:unknown)=>Promise<void>;onClose:()=>void}) {
 const [text,setText]=useState(''),[error,setError]=useState('');
 return <section className="bulk-import"><h2>Import records</h2><p>CSV columns: {fields.filter(f=>!f.formula).map(f=>f.key).join(', ')}. Up to 200 records; nothing is saved until you confirm the preview.</p>
 <input aria-label="CSV file" type="file" accept=".csv,text/csv" onChange={async e=>{try{const f=e.target.files?.[0];if(f){if(f.size>1024*1024)throw Error('Choose a CSV under 1 MiB.');setText(await f.text());setError('');}}catch(e){setError((e as Error).message);}}}/>
 <textarea aria-label="CSV contents" rows={8} value={text} onChange={e=>setText(e.target.value)} maxLength={1048576}/>
 {error&&<p role="alert">{error}</p>}<button disabled={busy} onClick={onClose}>Cancel</button><button disabled={busy||!text} onClick={async()=>{try{setError('');await onPreview({kind:'bulk_records',changes:csvRecords(text,fields).map(data=>({kind:'create_record',typeId,data}))});}catch(e){setError((e as Error).message);}}}>Preview import</button></section>;
}
