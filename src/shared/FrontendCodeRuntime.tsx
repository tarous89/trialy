import React,{useEffect,useRef,useState} from 'react';
type Call=(name:string,args:Record<string,unknown>)=>Promise<any>;
export function FrontendCodeRuntime({component,previewId,call,onProposal}:{component?:any;previewId?:string;call:Call;onProposal:(p:any)=>void}){
 const frame=useRef<HTMLIFrameElement>(null),output=useRef<any>(null),state=useRef<any>(null),busyRef=useRef(false),channel=useRef(crypto.randomUUID()),live=useRef(true);
 const [ready,setReady]=useState(false);
 const [frameUrl,setFrameUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[proposal,setProposal]=useState<any>(null);
 const send=()=>{if(output.current)frame.current?.contentWindow?.postMessage({kind:'trialy.render',channel:channel.current,html:output.current.html,css:output.current.css,controls:output.current.controls,connected:output.current.connected},'*');};
 async function run(event:any={kind:'open'}){
  if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');
  try{const result=await call('run_component_frontend',{request:{...(previewId?{previewId}:{componentId:component.id,expectedVersion:component.version}),state:state.current,event}});
   if(!live.current)return;if(result.boundEdit){setProposal(result.proposal);return;}output.current=result;setFrameUrl(result.frameUrl);state.current=result.state;setProposal(result.proposal);send();
  }catch(e){if(live.current)setError((e as Error).message);}finally{busyRef.current=false;if(live.current)setBusy(false);}
 }
 useEffect(()=>{live.current=true;void run();return()=>{live.current=false;};},[]);
 useEffect(()=>{const receive=(e:MessageEvent)=>{if(e.source!==frame.current?.contentWindow)return;if(e.data?.kind==='trialy.ready'){setReady(true);send();}
  else if(e.data?.kind==='trialy.event'&&e.data.channel===channel.current&&!proposal)void run(e.data.event);
 };window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[proposal]);
 useEffect(()=>{if(!frameUrl||ready)return;const timer=setTimeout(()=>setError('The host did not open the isolated frame. Try the interface in the standalone workspace.'),8000);return()=>clearTimeout(timer);},[frameUrl,ready]);
 return <section aria-label="ChatGPT-written interface"><p>{previewId?'Unsaved code preview · database writes disabled':'Saved code · changes require review before saving'}</p>
 {error&&<p role="alert">{error}</p>}<div className="toolbar"><button disabled={busy||!!proposal} onClick={()=>void run()}>Reload interface</button>{busy&&<span role="status">Running…</span>}</div>
 {proposal&&<aside><p>The interface proposed database changes. They have not been saved.</p><button onClick={()=>onProposal(proposal)}>Review proposed changes</button><button onClick={async()=>{try{await call('discard_workspace_preview',{previewId:proposal.id});setProposal(null);}catch(e){setError((e as Error).message);}}}>Discard changes</button></aside>}
 {frameUrl&&!ready&&<p role="status">Opening isolated interface…</p>}
 {frameUrl&&<iframe ref={frame} title="Saved frontend code" sandbox="allow-scripts" referrerPolicy="no-referrer" src={frameUrl} onLoad={send} style={{width:'100%',height:'65vh',border:'1px solid #dbe5df',borderRadius:8}}/>}
 </section>;
}
