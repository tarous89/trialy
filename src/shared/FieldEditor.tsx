import React from 'react';
import type {Field} from './schema.js';
export function FieldEditor({fields,onChange,types,existing=[]}:{fields:Field[];onChange:(fields:Field[])=>void;types:any[];existing?:Field[]}) {
 const change=(index:number,patch:Partial<Field>)=>onChange(fields.map((f,i)=>i===index?{...f,...patch}:f));
 return <fieldset><legend>Fields</legend>{fields.map((f,i)=><div className="field-definition" key={i}>
 <label>Name<input required maxLength={100} value={f.name} onChange={e=>change(i,{name:e.target.value})}/></label>
 <label>Key<input required pattern="[a-z][a-z0-9_]{0,63}" disabled={existing.some(x=>x.key===f.key)} value={f.key} onChange={e=>change(i,{key:e.target.value})}/></label>
 <label>Type<select value={f.kind} onChange={e=>change(i,{kind:e.target.value as Field['kind'],options:undefined,targetTypeId:undefined,formula:undefined})}>{['text','number','money','date','boolean','select','relationship','person','document'].map(k=><option key={k}>{k}</option>)}</select></label>
 {f.kind==='select'&&<label>Options (one per line)<textarea required value={(f.options??[]).join('\n')} onChange={e=>change(i,{options:e.target.value.split('\n')})}/></label>}
 {f.kind==='relationship'&&<label>Related table<select required value={f.targetTypeId??''} onChange={e=>change(i,{targetTypeId:e.target.value})}><option value="">Choose…</option>{types.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></label>}
 {['number','money'].includes(f.kind)&&<><label>Calculation<select value={f.formula?.operator??''} onChange={e=>change(i,{formula:e.target.value?{operator:e.target.value as any,fields:[]}:undefined,required:false,unique:false})}><option value="">Entered value</option>{['sum','product','difference','ratio'].map(op=><option key={op}>{op}</option>)}</select></label>{f.formula&&<label>Source field keys, in order<input required value={f.formula.fields.join(',')} onChange={e=>change(i,{formula:{...f.formula!,fields:e.target.value.split(',').map(k=>k.trim())}})}/></label>}</>}
 <label><input disabled={!!f.formula} type="checkbox" checked={f.required} onChange={e=>change(i,{required:e.target.checked})}/>Required</label>
 <label><input type="checkbox" checked={f.ai} onChange={e=>change(i,{ai:e.target.checked})}/>AI readable</label>
 <label><input disabled={!!f.formula} type="checkbox" checked={!!f.unique} onChange={e=>change(i,{unique:e.target.checked})}/>Unique when filled</label>
 {!existing.some(x=>x.key===f.key)&&<button type="button" onClick={()=>onChange(fields.filter((_,n)=>n!==i))}>Remove</button>}
 </div>)}<button type="button" disabled={fields.length>=100} onClick={()=>onChange([...fields,{key:`field_${fields.length+1}`,name:'New field',kind:'text',ai:true,required:false}])}>Add field</button><p>Changes affecting existing values may require an explicit data migration.</p></fieldset>;
}
