import React,{useState,useRef,useEffect} from 'react';
export function MultiValueInput({field,value,onChange,disabled=false}:{field:any;value:any;onChange:(v:any)=>void;disabled?:boolean}){
 const normalize=(v:any):any[]=>Array.isArray(v)?v:v==null||v===''?[]:[v];
 const [values,setValues]=useState<any[]>(()=>normalize(value)),sent=useRef(JSON.stringify(value));
 useEffect(()=>{if(JSON.stringify(value)!==sent.current){setValues(normalize(value));sent.current=JSON.stringify(value);}},[value]);
 const change=(next:any[])=>{setValues(next);const clean=next.filter(v=>v!=='');sent.current=JSON.stringify(clean);onChange(clean);};
 const rows=values.length?values:[''];
 return <span className="ty-multi-input" role="group" aria-label={field.name+' values'}>{rows.map((v,i)=><span className="ty-multi-row" key={i}>{field.kind==='select'?<select aria-label={i?field.name+' '+(i+1):field.name} disabled={disabled} value={v} required={field.required&&i===0} onChange={e=>{const next=[...rows];next[i]=e.target.value;change(next);}}><option value="">Choose…</option>{field.options?.map((o:string)=><option key={o}>{o}</option>)}</select>:<input aria-label={i?field.name+' '+(i+1):field.name} disabled={disabled} required={field.required&&i===0} type={['number','money'].includes(field.kind)?'number':'text'} step="any" value={v} onChange={e=>{const next=[...rows];next[i]=e.target.value===''?'':['number','money'].includes(field.kind)?Number(e.target.value):e.target.value;change(next);}}/>}{rows.length>1&&<button type="button" disabled={disabled} aria-label={'Remove '+field.name+' '+(i+1)} onClick={()=>change(rows.filter((_,n)=>n!==i))}>×</button>}</span>)}<button type="button" disabled={disabled||rows.length>=100} onClick={()=>change([...rows,''])}>+ Add value</button></span>;
}
