import React,{useEffect,useRef,useState} from 'react';
import type {Field} from './schema.js';
export function ReferenceInput({field,value,onChange,load}:{field:Field;value:any;onChange:(v:any)=>void;load:(query:string,offset:number)=>Promise<any>}){
 const [query,setQuery]=useState(''),[page,setPage]=useState<any>({options:[],hasMore:false}),[offset,setOffset]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false);const current=useRef(0);
 useEffect(()=>{const request=++current.current;setBusy(true);const timer=setTimeout(()=>{void load(query,offset).then(p=>{if(request===current.current){setPage(p);setError('');}}).catch(()=>{if(request===current.current)setError('References could not be loaded');}).finally(()=>{if(request===current.current)setBusy(false);});},200);return()=>{clearTimeout(timer);current.current++;};},[query,offset,field.key,field.targetTypeId]);
 const selected:string[]=field.multiple?(Array.isArray(value)?value:[]):value?[String(value)]:[];
 const options=[...selected.filter(id=>!page.options.some((o:any)=>o.id===id)).map(id=>({id,label:`Selected reference · ${id}`})),...page.options];
 return <span className="reference-input"><input aria-label={`Search ${field.name}`} placeholder="Search available references" value={query} onChange={e=>{setQuery(e.target.value);setOffset(0);}}/>
 <select aria-label={field.name} multiple={!!field.multiple} required={field.required} value={field.multiple?selected:selected[0]??''} onChange={e=>onChange(field.multiple?[...e.target.selectedOptions].map(o=>o.value):e.target.value||null)}>{!field.multiple&&<option value="">Choose…</option>}{options.map((o:any)=><option key={o.id} value={o.id}>{o.label}</option>)}</select>
 {field.multiple&&<small>Choose multiple entries using Ctrl/Cmd. {selected.length} selected.</small>}
 <button type="button" disabled={busy||!offset} onClick={()=>setOffset(Math.max(0,offset-50))}>Previous</button><button type="button" disabled={busy||!page.hasMore} onClick={()=>setOffset(offset+50)}>Next</button>{error&&<small role="alert">{error}</small>}</span>;
}
