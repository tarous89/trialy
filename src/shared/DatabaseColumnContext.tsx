import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
type Props={field:any;table:any;call:(name:string,args:any)=>Promise<any>;onSaved:(value:any)=>void;disabled:boolean;onDirty:(dirty:boolean)=>void};
export function DatabaseColumnContext({field,table}:Props){
 const [open,setOpen]=useState(false),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(open)dialog.current?.showModal();},[open]);
 return <div className="ty-db-context"><span>{field.kind} · {field.multiple?'multiple':'single'} · </span><button ref={trigger} className="ty-db-context-toggle" aria-label={'Context for '+field.name} aria-haspopup="dialog" onClick={()=>setOpen(true)}>Context</button>{open&&createPortal(<dialog ref={dialog} className="ty-context-dialog" onClose={()=>{setOpen(false);trigger.current?.focus();}}><h2>Column context</h2><dl><dt>Column</dt><dd>{field.name}</dd><dt>Table</dt><dd>{table.name}</dd><dt>Data type</dt><dd>{field.kind} · {field.multiple?'Multiple values':'Single value'}</dd></dl><div className="ty-context-copy">{field.description||'No context added.'}</div><p>View only. This meaning is shared by tools using this column. Create a separate column for a different meaning.</p><div className="ty-actions"><button className="ty-button ty-button--secondary" onClick={()=>dialog.current?.close()}>Close</button></div></dialog>,document.body)}</div>;
}
