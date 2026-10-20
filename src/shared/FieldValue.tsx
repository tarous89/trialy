import React from 'react';
import type {Field} from './schema.js';
export function FieldValue({field,row,renderer}:{field:Field;row:any;renderer?:any}){
 const status=row.derived?.[field.key],v=row.data[field.key],r=renderer??field.renderer;
 if(status?.status==='error')return <span role="status" title={status.code}>Calculation unavailable</span>;
 if(v===null||v===undefined)return <span>—</span>;
 const text=Array.isArray(v)?v.join(', '):String(v),display=row.display?.[field.key];
 if(r?.kind==='code'&&display?.text!==undefined){
  if(display.kind==='badge')return <span className="badge">{display.text}</span>;
  if(display.kind==='progress'&&typeof display.value==='number')return <span><progress aria-label={field.name} max={Math.max(1,(display.max??100)-(display.min??0))} value={Math.max(0,display.value-(display.min??0))}/>{display.text}</span>;
  return <span>{display.text}</span>;
 }
 if(r?.kind==='badge')return <span className="badge">{text}</span>;
 if(r?.kind==='progress'&&typeof v==='number'){const min=r.min??0,max=r.max??100;return <span><progress aria-label={field.name} max={max-min||100} value={Math.max(0,v-min)}/><small>{text}</small></span>;}
 if(r?.kind==='number'&&typeof v==='number')return <span>{r.prefix??''}{v.toLocaleString(undefined,{maximumFractionDigits:r.decimals??2,minimumFractionDigits:r.decimals??0})}{r.suffix??''}</span>;
 return <span title={display?.error}>{text}</span>;
}
