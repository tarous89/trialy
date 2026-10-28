import React,{useEffect,useState} from 'react';
import {interfaceSchema} from '../workspace/ui.js';
type Call=(name:string,args:Record<string,unknown>)=>Promise<any>;
function LiveTable({component,block,index,call,onPreview}:{component:any;block:any;index:number;call:Call;onPreview:(p:any)=>void}){
 const [result,setResult]=useState<any>(null),[offset,setOffset]=useState(0),[error,setError]=useState(''),[edit,setEdit]=useState<any>(null),[value,setValue]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;setResult(null);setError('');setEdit(null);call('render_project_component',{componentId:component.id,block:index,offset}).then(r=>{if(active)setResult(r);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[component.id,component.version,index,offset]);
 async function save(){setBusy(true);setError('');try{
  const typed=edit.field.kind==='boolean'?value==='true':['number','money'].includes(edit.field.kind)?(value===''?null:Number(value)):value;
  if(typeof typed==='number'&&!Number.isFinite(typed))throw new Error('Enter a valid number');
  onPreview(await call('prepare_workspace_change',{operation:{kind:'edit_component_record',componentId:component.id,expectedVersion:result.componentVersion,recordId:edit.row.id,recordVersion:edit.row.version,field:edit.field.key,value:typed}}));
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section style={{minWidth:0}}><h3>{block.title}</h3>{error&&<p role="alert">{error}</p>}{!result&&!error&&<p>Loading…</p>}{result&&<><div style={{overflowX:'auto',maxWidth:'100%'}}><table><thead><tr>{block.fields.map((key:string)=><th key={key}>{result.fields.find((f:any)=>f.key===key)?.name??key}</th>)}</tr></thead><tbody>{result.rows.map((row:any)=><tr key={row.id}>{block.fields.map((key:string)=>{const field=result.fields.find((f:any)=>f.key===key),editing=edit?.row.id===row.id&&edit?.field.key===key;return <td key={key}>{editing?<>
 {field.kind==='boolean'?<select value={value} onChange={e=>setValue(e.target.value)}><option value="true">Yes</option><option value="false">No</option></select>:field.kind==='select'?<select value={value} onChange={e=>setValue(e.target.value)}><option value=""/>{field.options?.map((o:string)=><option key={o}>{o}</option>)}</select>:<input aria-label={field.name} value={value} onChange={e=>setValue(e.target.value)} type={field.kind==='date'?'date':['number','money'].includes(field.kind)?'number':'text'}/>}
 <button disabled={busy} onClick={save}>Review save to database</button><button onClick={()=>setEdit(null)}>Cancel</button></>:<button disabled={!result.editable||!!field?.formula} title={field?.formula?'Calculated from source fields':'Edit the shared database value'} onClick={()=>{setEdit({row,field});setValue(String(row.data[key]??''));}}>{String(row.data[key]??'—')}</button>}</td>;})}</tr>)}</tbody></table></div><p>{result.total} records · Changes save to shared records and appear in other views.</p><button disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-25))}>Previous</button><button disabled={offset+result.rows.length>=result.total} onClick={()=>setOffset(offset+25)}>Next</button></>}</section>;
}
export function ComponentRuntime({component,call,onPreview}:{component:any;call:Call;onPreview:(p:any)=>void}){
 let parsed;try{parsed=interfaceSchema.safeParse(JSON.parse(component.source));}catch{return <p>Interface configuration is invalid.</p>;}
 if(!parsed.success)return <p>Interface configuration is invalid.</p>;
 if(component.archived)return <p>This component is archived. Unarchive it to reopen the live interface.</p>;
 return <div style={{display:'grid',gridTemplateColumns:parsed.data.layout==='grid'?'repeat(auto-fit,minmax(min(100%,320px),1fr))':'1fr',gap:20}}>{parsed.data.blocks.map((b,i)=>b.kind==='text'?<section key={i}>{b.heading?<h3>{b.text}</h3>:<p style={{whiteSpace:'pre-wrap'}}>{b.text}</p>}</section>:<LiveTable key={i} component={component} block={b} index={i} call={call} onPreview={onPreview}/>)}</div>;
}
