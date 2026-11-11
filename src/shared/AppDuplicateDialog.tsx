import React,{useRef,useState} from 'react';
import {Button} from './ui/Controls.js';
import {useDataAccessStep} from './DataAccessStep.js';
export function AppDuplicateDialog({app,call,onClose,onCopied}:{app:{id:string;name:string};call:(name:string,args:any)=>Promise<any>;onClose:()=>void;onCopied:(included:boolean)=>void}){
 const pending=useRef<any>(null),dataAccess=useDataAccessStep(call);
 const [includeAutomations,setIncludeAutomations]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <div className="ty-content-overlay">{dataAccess.element}<section className="ty-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="duplicate-app-title"><h2 id="duplicate-app-title">Duplicate {app.name}?</h2><p>The copy uses the same connected data.</p>
  <label className="ty-project-access-toggle"><input type="checkbox" checked={includeAutomations} disabled={busy||!!pending.current} onChange={e=>setIncludeAutomations(e.target.checked)}/><span>Include automations</span></label>
  <p>{includeAutomations?'Copied automations start disabled. Review and enable them from Automations when you’re ready.':'Only the app will be copied.'}</p>
  {error&&<p role="alert">{error}</p>}<div className="ty-actions"><Button autoFocus disabled={busy} onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{
   if(!pending.current){const {component:c}=await call('read_project_component',{componentId:app.id});
   pending.current=await call('prepare_workspace_change',{operation:{kind:'copy_component',sourceComponentId:c.id,expectedVersion:c.version,projectId:c.project_id,name:(c.name+' — Copy').slice(0,100),copyAutomations:includeAutomations}});}
   const p=pending.current;
   // Adding an app opens the data access step (copies keep the same connected data; other apps may now connect to it).
   const saved=await dataAccess.gate({previewId:p.id,digest:p.digest},()=>call('confirm_workspace_change',{previewId:p.id,digest:p.digest,confirmed:true}));if(!saved)return;onCopied(includeAutomations);
  }catch(e:any){if([404,409].includes(e.status))pending.current=null;setError(e.message??'The app could not be duplicated. Try again.');}finally{setBusy(false);}}}>{busy?'Duplicating…':'Duplicate app'}</Button></div>
 </section></div>;
}
