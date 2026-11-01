import React,{useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {vividTheme} from './vivid.generated.js';
import {Vivid} from './Vivid.js';
// Shadow boundary prevents the app's generic section/input rules from redesigning the template.
// Only :root becomes :host: body/tbody and every other original selector remain unchanged.
const adapter='.settings-section label.settings-edit-switch{display:flex;align-items:center;justify-content:flex-start;gap:10px;margin:16px 0;font-weight:400}.settings-section .settings-edit-switch input[type=checkbox]{appearance:auto;display:inline-block;flex:0 0 18px;width:18px;height:18px;min-height:18px;margin:0;padding:0;accent-color:var(--accent)}:host{display:block;min-width:0}fieldset{border:0;padding:0;margin:0;min-width:0}button:disabled{cursor:default;opacity:.5}.ty-content-overlay{position:fixed;inset:0;z-index:50;background:rgba(14,36,39,.28);display:grid;place-items:center}.ty-confirm-dialog{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:24px;max-width:560px;margin:16px}.settings-actions{display:flex;gap:9px;align-items:center;justify-content:flex-end}.settings-actions .iconbutton{display:inline-flex;align-items:center;justify-content:center;flex:none}.secondary{gap:8px}.theme-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}.settings-edit-switch{display:flex!important;gap:8px;align-items:center}';
export function ToolSettingsShell({active,onBack,onLayout,onAccess,onStyle,disabled=false,actions,children,noun='tracker'}:{noun?:'tracker'|'app';active:'Layout'|'Style'|'Access';onBack:()=>void;onLayout?:()=>void;onStyle?:()=>void;onAccess?:()=>void;disabled?:boolean;actions?:React.ReactNode;children:React.ReactNode}){
 const host=useRef<HTMLDivElement>(null),[body,setBody]=useState<HTMLElement|null>(null);
 useLayoutEffect(()=>{const shadow=host.current!.shadowRoot??host.current!.attachShadow({mode:'open'});const style=document.createElement('style');style.textContent=vividTheme.replaceAll(':root',':host')+'\n'+adapter;const target=document.createElement('body');shadow.replaceChildren(style,target);setBody(target);return()=>{shadow.replaceChildren();};},[]);
 return <div className="ty-tool-settings" ref={host}>{body&&createPortal(<Vivid name="page" slots={{content:<section id="settingsPage" aria-label="App settings">
 <Vivid name="settingsTop" slots={{back:<button className="secondary" disabled={disabled} onClick={onBack}>← Back to {noun}</button>,actions}}/>
 <Vivid name="heading" slots={{title:'App settings',description:'Manage the layout, shared fields, and who can access this '+noun+'.'}}/>
 <Vivid name="settingsTabs" slots={{tabs:(onStyle?['Layout','Style','Access']:['Layout','Access']).map(tab=><Vivid key={tab} name="settingsTab" slots={{label:tab==='Access'?'Access control':tab,class:active===tab?'active':'',selected:String(active===tab)}} disabled={disabled} onClick={tab==='Layout'?onLayout:tab==='Style'?onStyle:onAccess}/>)}}/>
 <Vivid name="settingsContent" slots={{content:children}}/>
 </section>}}/>,body)}</div>;
}
