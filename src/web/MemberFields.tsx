import React from 'react';
export function MemberFields({types,allowedTypes,hidden,onChange}:{types:any[];allowedTypes:string[]|null;hidden:string;onChange:(value:string)=>void}){
 const keys=hidden.split(',').map(k=>k.trim()).filter(Boolean);
 function toggle(typeId:string,key:string,allow:boolean){let next=keys.filter(k=>k!==`${typeId}:${key}`);if(allow&&next.includes(key)){next=next.filter(k=>k!==key);for(const t of types)if(t.id!==typeId&&t.fields.some((f:any)=>f.key===key))next.push(`${t.id}:${key}`);}if(!allow)next.push(`${typeId}:${key}`);onChange([...new Set(next)].join(', '));}
 return <><h3>Allowed fields</h3>{types.filter(t=>allowedTypes===null||allowedTypes.includes(t.id)).map(t=><details key={t.id}><summary>{t.name}</summary>{t.fields.map((f:any)=><label className="check" key={f.key}><input type="checkbox" checked={!keys.includes(f.key)&&!keys.includes(`${t.id}:${f.key}`)} onChange={e=>toggle(t.id,f.key,e.target.checked)}/>{f.name}</label>)}</details>)}<p>New fields are available unless restricted. Calculations stay hidden when their inputs are hidden.</p></>;
}
