import React,{useEffect,useRef,useState} from 'react';
import {FrontendCodeRuntime} from './FrontendCodeRuntime.js';
export function GuestPreview({draft,call,openLink,onSaved}:{draft:any;call:(name:string,args:any)=>Promise<any>;openLink:(url:string)=>Promise<void>;onSaved:(receipt:any)=>Promise<void>}){
 const [component,setComponent]=useState(0),[status,setStatus]=useState(draft.status),[receipt,setReceipt]=useState(draft.receipt),[error,setError]=useState(''),[connecting,setConnecting]=useState(false),[clock,setClock]=useState(Date.now());
 const current=useRef(draft.handle.id),live=useRef(true),checking=useRef(false);
 useEffect(()=>{if(draft.status==='saved'){setStatus('saved');setReceipt(draft.receipt);setConnecting(false);}},[draft.status]);
 useEffect(()=>{live.current=true;const timer=setInterval(()=>setClock(Date.now()),30000);return()=>{live.current=false;clearInterval(timer);};},[]);
 async function check(){if(checking.current)return;checking.current=true;try{const next=await call('open_tracker_preview',{handle:draft.handle});if(!live.current||current.current!==next.handle.id)return;if(next.status==='saved'){setReceipt(next.receipt);setStatus('saved');setConnecting(false);setError('');}}catch(e){if(live.current){setError((e as Error).message);setConnecting(false);}}finally{checking.current=false;}}
 useEffect(()=>{if(!connecting)return;let attempts=0;const timer=setInterval(()=>{if(++attempts>40){setConnecting(false);return;}void check();},3000);const focus=()=>void check();window.addEventListener('focus',focus);return()=>{clearInterval(timer);window.removeEventListener('focus',focus);};},[connecting]);
 const bundle=draft.bundle,selected=bundle?.components[component],expired=!!draft.expiresAt&&new Date(draft.expiresAt).getTime()<=clock;
 const remaining=Math.max(1,Math.ceil((new Date(draft.expiresAt).getTime()-clock)/3600000));
 const url=draft.saveUrl;
 return <main><header><div><small>TRIALY · {status==='saved'?'SAVED':'TEMPORARY PREVIEW'}</small><h1>{bundle?.name??'Your tracker'}</h1></div></header>
 {bundle&&<><nav aria-label="Pages">{bundle.components.map((c:any,i:number)=><button key={i} aria-pressed={component===i} onClick={()=>setComponent(i)}>{c.name}</button>)}</nav>
 {selected?.format==='frontend-js'?<FrontendCodeRuntime key={component} previewId={draft.handle.id} call={(_name,args)=>call('run_tracker_preview',{handle:draft.handle,component,request:args.request})} onProposal={()=>{}}/>:<section><pre>{selected?.source}</pre></section>}
 {bundle.tables.map((t:any)=><details key={t.id}><summary>{t.name} · {t.rows.length} records</summary><div className="scroll"><table><thead><tr>{t.fields.map((f:any)=><th key={f.key}>{f.name}</th>)}</tr></thead><tbody>{t.rows.map((r:any)=><tr key={r.id}>{t.fields.map((f:any)=><td key={f.key}>{String(r.data[f.key]??'')}</td>)}</tr>)}</tbody></table></div></details>)}</>}
 <footer className="guest-save-footer" style={{position:'sticky',bottom:0,background:'#f4f7f5',borderTop:'1px solid #baccc2',padding:'16px 0',marginTop:20}}>
 <span role="status">{status==='saved'?'Saved to TrialAgents.':expired?'This temporary preview has expired.':`Available for up to ${remaining} hour${remaining===1?'':'s'}. Save it to keep it.`}</span>
 {status==='saved'?<button onClick={()=>onSaved(receipt).catch(e=>setError(e.message))}>Open saved workspace</button>:<><button disabled={expired||connecting} onClick={async()=>{setError('');try{await openLink(url);if(live.current)setConnecting(true);}catch{setError('The connection page did not open. Use the link below to continue.');}}}>{connecting?'Waiting for your account…':'Save to your account'}</button><button onClick={()=>void check()}>Check save status</button></>}
 {connecting&&<small>Your current preview stays here while you connect and save.</small>}
 {error&&<p role="alert">{error} {url&&!expired&&<a href={url} target="_blank" rel="noreferrer">Open save page</a>}</p>}
 </footer></main>;
}
