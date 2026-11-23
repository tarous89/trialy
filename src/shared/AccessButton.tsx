import React,{useState} from 'react';
import type {AccessScope} from './AccessPanel.js';
import {appScreen} from './app-screens.js';
type Call=(name:string,args:any)=>Promise<any>;
// L4.5: the button stays with the first screen; the access screen it opens comes from app-screens.tsx.
const AccessPanel=appScreen('AccessPanel');
export function AccessButton({call,scope}:{call:Call;scope:AccessScope}){const [open,setOpen]=useState(false);return <><button className="ty-button ty-button--secondary" aria-label={'Access · '+scope.name} onClick={()=>setOpen(true)}>Access</button>{open&&<div className="ty-content-overlay"><div className="ty-access-dialog" role="dialog" aria-modal="true" aria-label={'Access · '+scope.name}><AccessPanel call={call} scope={scope} onClose={()=>setOpen(false)}/></div></div>}</>;}
