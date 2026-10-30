import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
type Props={field:any;table:any;call:(name:string,args:any)=>Promise<any>;onSaved:(value:any)=>void;disabled:boolean;onDirty:(dirty:boolean)=>void};
export function DatabaseColumnContext({field,table}:Props){
 const [open,setOpen]=useState(false),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(open)dialog.current?.showModal();},[open]);
 return <div className="ty-db-context"><button ref={trigger} className="ty-db-context-toggle" aria-label={'Details for '+field.name} aria-haspopup="dialog" onClick={()=>setOpen(true)}>Details</button>{open&&createPortal(<dialog ref={dialog} className="ty-context-dialog ty-column-details" aria-labelledby="ty-column-details-title" onClose={()=>{setOpen(false);trigger.current?.focus();}}><div className="ty-details-heading"><h2 id="ty-column-details-title">Column details</h2></div><dl className="ty-details-grid"><div><dt>Table</dt><dd>{table.name}</dd></div><div><dt>Column</dt><dd>{field.name}</dd></div><div><dt>Data type</dt><dd>{field.kind}</dd></div><div><dt>Multiple values</dt><dd>{field.multiple?'true':'false'}</dd></div><div className="ty-details-context"><dt>Context</dt><dd className="ty-context-copy">{field.description||'No context added.'}</dd></div></dl><p>Read only. These details are shared by apps using this column.</p><div className="ty-actions"><button className="ty-button ty-button--secondary" onClick={()=>dialog.current?.close()}>Close</button></div></dialog>,document.body)}</div>;
}
