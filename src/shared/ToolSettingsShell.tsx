import React,{useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {vividTheme} from './vivid.generated.js';
import {Vivid} from './Vivid.js';
// Shadow boundary prevents the app's generic section/input rules from redesigning the template.
// Only :root becomes :host: body/tbody and every other original selector remain unchanged.
const adapter=':host{display:block;min-width:0}fieldset{border:0;padding:0;margin:0;min-width:0}button:disabled{cursor:default;opacity:.5}.ty-content-overlay{position:fixed;inset:0;z-index:50;background:rgba(14,36,39,.28);display:grid;place-items:center}.ty-confirm-dialog{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:24px;max-width:560px;margin:16px}.settings-actions{display:flex;gap:9px;justify-content:flex-end}.settings-edit-switch{display:flex!important;gap:8px;align-items:center}';
export function ToolSettingsShell({active,onBack,onLayout,onAccess,disabled=false,actions,children}:{active:'Layout'|'Access';onBack:()=>void;onLayout?:()=>void;onAccess?:()=>void;disabled?:boolean;actions?:React.ReactNode;children:React.ReactNode}){
 const host=useRef<HTMLDivElement>(null),[body,setBody]=useState<HTMLElement|null>(null);
 useLayoutEffect(()=>{const shadow=host.current!.shadowRoot??host.current!.attachShadow({mode:'open'});const style=document.createElement('style');style.textContent=vividTheme.replaceAll(':root',':host')+'\n'+adapter;const target=document.createElement('body');shadow.replaceChildren(style,target);setBody(target);return()=>{shadow.replaceChildren();};},[]);
 return <div className="ty-tool-settings" ref={host}>{body&&createPortal(<Vivid name="page" slots={{content:<section id="settingsPage" aria-label="Tool settings">
 <Vivid name="settingsTop" slots={{back:<button className="secondary" disabled={disabled} onClick={onBack}>← Back to tracker</button>,actions}}/>
 <Vivid name="heading" slots={{title:'Tool settings',description:'Manage the layout, shared fields, and who can access this tracker.'}}/>
 <Vivid name="settingsTabs" slots={{tabs:['Layout','Access'].map(tab=><Vivid key={tab} name="settingsTab" slots={{label:tab==='Access'?'Access control':tab,class:active===tab?'active':'',selected:String(active===tab)}} disabled={disabled} onClick={tab==='Layout'?onLayout:onAccess}/>)}}/>
 <Vivid name="settingsContent" slots={{content:children}}/>
 </section>}}/>,body)}</div>;
}
