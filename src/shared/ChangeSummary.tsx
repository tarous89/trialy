import React from 'react';
const label=(key:string)=>key.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ').replace(/^./,s=>s.toUpperCase());
function Value({value,depth=0}:{value:any;depth?:number}):React.ReactNode{
 if(value===null||value===undefined)return <span>—</span>;
 if(typeof value!=='object')return <span>{typeof value==='boolean'?(value?'Yes':'No'):String(value)}</span>;
 if(depth>5)return <span>See technical details</span>;
 if(Array.isArray(value))return value.length?<ul>{value.map((v,i)=><li key={i}><Value value={v} depth={depth+1}/></li>)}</ul>:<span>None</span>;
 return <dl className="ty-change-fields">{Object.entries(value).filter(([k])=>!['digest','accessStamp','viewId'].includes(k)&&!(k==='source'&&typeof value.format==='string')).map(([k,v])=><React.Fragment key={k}><dt>{label(k)}</dt><dd><Value value={v} depth={depth+1}/></dd></React.Fragment>)}</dl>;
}
export function ChangeSummary({value}:{value:any}){
 const op=value?.operation??value;
 return <div className="ty-change-summary"><Value value={op}/><details><summary>Technical details</summary><pre>{JSON.stringify(value,null,2)}</pre></details></div>;
}
