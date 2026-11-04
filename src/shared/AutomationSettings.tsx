import React,{useEffect,useState} from 'react';
import {Button} from './ui/Controls.js';
import {AutomationScheduleEditor,scheduleLabel} from './AutomationScheduleEditor.js';
type Call=(name:string,args:any)=>Promise<any>;
export const connectionLabels:Record<string,string>={not_enabled:'Connect ChatGPT',awaiting_subscription:'Awaiting ChatGPT connection',connected_unverified:'Verifying ChatGPT connection',ready:'ChatGPT connection verified',paused:'ChatGPT connection paused',unavailable:'ChatGPT connection unavailable'};
// This boundary wraps only optional management controls, never app content.
export class AutomationBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{
 state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?null:this.props.children;}
}
export function AutomationSetupReview({call,review}:{call:Call;review:any}){
 const [saved,setSaved]=useState(!!review.result),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),p=review.body.preferences;
 return <section aria-label="Background automation setup"><h1>{saved?'Background preferences saved':'Enable app automations with ChatGPT'}</h1>
 <p>Daily check at {p.time} · {p.timeZone}. Approved app triggers can also request work when it becomes due.</p>
 <p>Requested execution: a supported ChatGPT Work chat, the latest highest-capability model available in your subscription, and high reasoning. TrialAgents cannot verify or change model settings through the current task tools.</p><p>Only explicitly configured automations can run. Database permissions and email recipients remain separately controlled. Background work uses the connected ChatGPT account's available allowance.</p>
 {saved?<p role="status">Return to ChatGPT to establish and verify the event subscription. Your apps are available while setup is pending.</p>:<Button disabled={busy} variant="primary" onClick={async()=>{setBusy(true);try{await call('confirm_app_service_review',{reviewId:review.id,digest:review.digest});setSaved(true);}catch{setNotice('Setup could not be saved. Your apps and existing preferences are unchanged.');}finally{setBusy(false);}}}>Approve background setup</Button>}
 {notice&&<p role="status">{notice}</p>}</section>;
}
export function AutomationEditor({call,monitor,onClose}:{call:Call;monitor:any;onClose:()=>void}){
 const [config,setConfig]=useState<any>(()=>structuredClone(monitor.config)),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const field=(key:string,value:any)=>setConfig((c:any)=>({...c,[key]:value}));
 const trigger=config.automation?.trigger;
 const [options,setOptions]=useState<any>(null);
 useEffect(()=>{let live=true;call('read_app_automation_options',{appId:config.appId}).then(v=>{if(live)setOptions(v);}).catch(()=>{});return()=>{live=false;};},[config.appId]);
 const bindings=options?.tables.map((t:any)=>({typeId:t.id,name:t.name,fields:t.fields.map((f:any)=>f.key),fieldLabels:Object.fromEntries(t.fields.map((f:any)=>[f.key,f.name??f.key])),fieldKinds:Object.fromEntries(t.fields.map((f:any)=>[f.key,f.kind]))}))??config.readBindings;
 return <section aria-label="Edit automation"><h3>Edit {config.name}</h3><form onSubmit={async e=>{e.preventDefault();setBusy(true);setNotice('');try{const review=await call('prepare_app_monitoring',{monitorId:monitor.id,expectedVersion:monitor.version,config:{...config,schedule:{...config.schedule,description:trigger?scheduleLabel(trigger):config.schedule.description}}});await call('confirm_app_service_review',{reviewId:review.id,digest:review.digest,...(review.confirmation?{kind:review.confirmation.kind}:{}),...(review.review?{review:review.review}:{}),confirmed:true});onClose();}catch{setNotice('Changes were not saved. Your draft is retained.');}finally{setBusy(false);}}}>
 <label>Objective<textarea value={config.objective} onChange={e=>field('objective',e.target.value)}/></label><label>Instructions<textarea rows={6} value={config.instructions} onChange={e=>field('instructions',e.target.value)}/></label><label>Sources and eligibility<textarea rows={3} value={config.sourcePolicy} onChange={e=>field('sourcePolicy',e.target.value)}/></label>
 {trigger&&<AutomationScheduleEditor value={trigger} executor="chatgpt" bindings={bindings} onChange={t=>setConfig((c:any)=>({...c,schedule:{...c.schedule,...(t.timeZone?{timeZone:t.timeZone}:{})},automation:{...c.automation,trigger:t}}))}/>}
 <p>Current data permissions remain in effect. Changes to access or email recipients require their own review.</p><div className="ty-actions"><Button type="submit" disabled={busy}>{busy?'Saving…':'Save changes'}</Button><Button disabled={busy} onClick={onClose}>Ignore changes</Button></div></form>
 {notice&&<p role="status">{notice}</p>}</section>;
}
