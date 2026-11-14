import React,{useEffect,useRef,useState} from 'react';

/**
 * Room page for an external exchange in room mode (docs/product/EXTERNAL_EXCHANGE.md §5): Room · Q&A.
 * Numbered index with search and New / Updated badges, the person's levels with their entry step,
 * an inline viewer for PDF and images (approximate visible time is reported while it is open), and
 * questions with private and published answers. Everything shown comes from the server, which only
 * returns what this person's levels allow.
 */
type TabId='update'|'room'|'archive'|'qa';
/** Rooms show Room · Q&A; update rooms (§6) show the update first, documents only when there are any, and earlier updates of the series. */
function tabsFor(page:any):{id:TabId;label:string}[]{
 if(!page.update)return [{id:'room',label:'Room'},{id:'qa',label:'Q&A'}];
 const hasDocuments=page.index.length>0||page.levels.some((l:any)=>!l.open);
 return [{id:'update',label:'Update'},...(hasDocuments?[{id:'room' as const,label:'Documents'}]:[]),...(page.series?.archive?.length?[{id:'archive' as const,label:'Earlier updates'}]:[]),...(page.qa?[{id:'qa' as const,label:'Q&A'}]:[])];
}
const fmtDate=(d:string)=>new Date(d).toLocaleString(undefined,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const fmtSize=(n:number)=>n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
const readFile=(file:File)=>new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]!);r.onerror=()=>reject(Error('File could not be read'));r.readAsDataURL(file);});
type Props={page:any;headers:Record<string,string>;call:(path?:string,method?:string,body?:unknown)=>Promise<any>;refresh:()=>Promise<any>;header:React.ReactNode;footer:React.ReactNode};
export function RecipientRoom({page,headers,call,refresh,header,footer}:Props){
 const TABS=tabsFor(page);
 const [tab,setTab]=useState<TabId>(TABS[0]!.id),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [query,setQuery]=useState(''),[results,setResults]=useState<any>(null),[viewer,setViewer]=useState<{doc:any;url:string;viewId:string}|null>(null);
 const [ack,setAck]=useState<Record<string,{name:string;email:string}>>({}),[question,setQuestion]=useState(''),[reference,setReference]=useState('');
 const tabRefs=useRef<(HTMLButtonElement|null)[]>([]),closeRef=useRef<HTMLButtonElement|null>(null);
 async function act(fn:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 function onTabKey(e:React.KeyboardEvent,index:number){const n=TABS.length;let next=index;if(e.key==='ArrowRight')next=(index+1)%n;else if(e.key==='ArrowLeft')next=(index-1+n)%n;else if(e.key==='Home')next=0;else if(e.key==='End')next=n-1;else return;e.preventDefault();setTab(TABS[next].id);tabRefs.current[next]?.focus();}
 const bytes=async(path:string)=>{const r=await fetch('/external-exchange'+path,{headers});if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(d.message??'Document unavailable');}return r.blob();};
 async function download(d:any){await act(async()=>{const url=URL.createObjectURL(await bytes('/documents/'+d.versionId)),a=document.createElement('a');a.href=url;a.download=d.filename;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});}
 async function open(d:any){await act(async()=>{const {viewId}=await call('/views','POST',{versionId:d.versionId});const url=URL.createObjectURL(await bytes('/view/'+d.versionId));setViewer({doc:d,url,viewId});});}
 function closeViewer(){if(viewer)URL.revokeObjectURL(viewer.url);setViewer(null);}
 // Heartbeats while the viewer is open and the page is visible: approximate seconds only.
 useEffect(()=>{if(!viewer)return;closeRef.current?.focus();let last=Date.now();const beat=()=>{const seconds=Math.min(30,Math.round((Date.now()-last)/1000));last=Date.now();if(seconds>0&&document.visibilityState==='visible')void call('/views/'+viewer.viewId,'POST',{seconds}).catch(()=>{});};
  const timer=setInterval(beat,15000),onVisibility=()=>{if(document.visibilityState==='visible')last=Date.now();else beat();},onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')closeViewer();};
  document.addEventListener('visibilitychange',onVisibility);document.addEventListener('keydown',onKey);return ()=>{beat();clearInterval(timer);document.removeEventListener('visibilitychange',onVisibility);document.removeEventListener('keydown',onKey);};},[viewer?.viewId]);
 async function search(e:React.FormEvent){e.preventDefault();if(!query.trim()){setResults(null);return;}await act(async()=>setResults(await call('/search?q='+encodeURIComponent(query.trim()))));}
 async function upload(files:FileList|null,slot:string){const f=files?.[0];if(!f)return;await act(async()=>{if(!f.size||f.size>25*1024*1024)throw Error('The file must be nonempty and at most 25 MB');await call('/files','POST',{filename:f.name,mime:f.type||'application/octet-stream',base64:await readFile(f),slot});await refresh();setNotice('Signed document uploaded. The sender will review it.');});}
 const docRow=(d:any)=><li key={d.versionId} className="xp-row"><div className="xp-row-main"><strong>{d.section?<span className="xp-num">{d.section}</span>:null}{d.title}{d.badge&&<span className={'xp-chip xp-badge'+(d.badge==='new'?' is-good':' is-wait')}>{d.badge==='new'?'New':'Updated'}</span>}</strong><small>{fmtSize(d.byteSize)} · {d.level??'Room'}{d.viewOnly?' · view only':''}{d.toSign?' · to sign':''}</small></div>
  <div className="xp-actions" style={{marginTop:0}}>{d.viewable&&<button className="xp-button" disabled={busy} onClick={()=>void open(d)} aria-label={`View ${d.title}`}>View</button>}{!d.viewOnly&&<button className="xp-button" disabled={busy} onClick={()=>void download(d)} aria-label={`Download ${d.title}`}>Download</button>}</div></li>;
 const sections=page.index as any[],refs=[...sections.map((s:any)=>({value:'s:'+s.number,label:`${s.number?s.number+' ':''}${s.title}`})),...sections.flatMap((s:any)=>s.documents.map((d:any)=>({value:'d:'+d.documentId,label:d.title})))];
 const gate=page.gate,needsGroupAck=gate?.kind==='acknowledgement'&&!gate.acknowledged;
 return <main className="xp"><a className="xp-skip" href="#xp-content">Skip to content</a>{header}
  <div role="tablist" aria-label="Sections" className="xp-tabs xp-wrap">{TABS.map((t,i)=><button key={t.id} ref={el=>{tabRefs.current[i]=el;}} role="tab" id={'tab-'+t.id} aria-selected={tab===t.id} aria-controls={'panel-'+t.id} tabIndex={tab===t.id?0:-1} className="xp-tab" onClick={()=>setTab(t.id)} onKeyDown={e=>onTabKey(e,i)}>{t.label}{t.id==='room'&&page.changes.length>0&&<span className="xp-count" aria-label={`${page.changes.length} new or updated`}>{page.changes.length}</span>}</button>)}</div>
  <div className="xp-wrap xp-main" id="xp-content">
   {notice&&<p className="xp-notice" role="status">{notice}</p>}{error&&<p className="xp-error" role="alert">{error}</p>}
   {page.update&&<UpdatePanel page={page} hidden={tab!=='update'} call={call} refresh={refresh}/>}
   {page.series?.archive?.length>0&&<section role="tabpanel" id="panel-archive" aria-labelledby="tab-archive" hidden={tab!=='archive'} className="xp-panel"><h2>Earlier updates</h2><p className="xp-muted" style={{marginBottom:12}}>Earlier updates{page.series.name?` of ${page.series.name}`:''} sent to you, newest first.</p>
    <ul className="xp-archive">{page.series.archive.map((u:any)=><li key={u.link}><a href={u.link} onClick={e=>{e.preventDefault();location.assign(u.link);location.reload();}}>{u.title}</a><span className="xp-muted">Sent {fmtDate(u.sentAt)}</span></li>)}</ul></section>}
   <section role="tabpanel" id="panel-room" aria-labelledby="tab-room" hidden={tab!=='room'} className="xp-panel"><h2>{page.update?'Documents':'Room'}</h2>
    {page.summary&&!page.update&&<p className="xp-pre" style={{marginBottom:12}}>{page.summary}</p>}
    <p className="xp-muted" style={{marginBottom:12}}>Your access: {page.levels.map((l:any)=>l.name).join(', ')||'Room'}. {page.lastVisit?`New and Updated mark changes since your last visit on ${fmtDate(page.lastVisit)}.`:'New and Updated will mark changes after this visit.'}</p>
    {needsGroupAck&&<AckForm title="Confidentiality notice" text={gate.text} busy={busy} value={ack.group} email={page.recipient?.email} onChange={v=>setAck({...ack,group:v})} onSubmit={()=>act(async()=>{await call('/acknowledge','POST',ack.group);await refresh();setNotice('Thank you. The documents are now available.');})}/>}
    {page.levels.filter((l:any)=>!l.open).map((l:any)=><div key={l.key} className="xp-notice is-warn"><h3 style={{marginTop:0}}>{l.name}: {page.lockedLevels.find((x:any)=>x.key===l.key)?.documents??0} more documents</h3>
     {l.entry==='click_through'?<AckForm title="" text={l.text} busy={busy} value={ack[l.key]} email={page.recipient?.email} onChange={v=>setAck({...ack,[l.key]:v})} onSubmit={()=>act(async()=>{await call('/acknowledge','POST',{...ack[l.key],level:l.key});await refresh();setNotice(`${l.name} is now open.`);})}/>
     :<><p>These open once the sender accepts your signed document ({l.slotStatus==='received'?'received, waiting for review':'not uploaded yet'}). Download the document to sign below.</p>{l.slotStatus!=='received'&&<label className="xp-button" style={{cursor:'pointer',marginTop:8,display:'inline-block'}}>Upload signed document<input type="file" style={{position:'absolute',width:1,height:1,opacity:0}} disabled={busy} onChange={e=>{void upload(e.target.files,l.slot);e.target.value='';}} aria-label={`Upload signed document for ${l.name}`}/></label>}</>}</div>)}
    {page.changes.length>0&&<><h3>What changed since your last visit</h3><ul className="xp-list">{page.changes.map(docRow)}</ul></>}
    <form role="search" className="xp-search" onSubmit={search}><label className="xp-field" style={{flex:1,marginBottom:0}}><span>Search the room</span><input type="search" value={query} onChange={e=>{setQuery(e.target.value);if(!e.target.value)setResults(null);}}/></label><button className="xp-button" disabled={busy}>Search</button></form>
    {results&&<div aria-live="polite"><h3>Results</h3>{results.documents.length||results.answers.length?<ul className="xp-list">{results.documents.map(docRow)}{results.answers.map((a:any)=><li key={a.id} className="xp-row"><div className="xp-row-main"><strong>Answer</strong><small>{a.body}</small></div></li>)}</ul>:<p className="xp-muted">Nothing matches.</p>}</div>}
    <h3>Index</h3>{sections.length?<ol className="xp-index">{sections.map((s:any)=><li key={s.number||'other'}><h4><span className="xp-num">{s.number}</span>{s.title}<span className="xp-muted"> · {s.count} document{s.count===1?'':'s'}</span></h4><ul className="xp-list">{s.documents.map(docRow)}</ul></li>)}</ol>:<p className="xp-muted">No documents are open to you yet.</p>}
   </section>
   {TABS.some(t=>t.id==='qa')&&<section role="tabpanel" id="panel-qa" aria-labelledby="tab-qa" hidden={tab!=='qa'} className="xp-panel"><h2>Q&amp;A</h2><p className="xp-muted" style={{marginBottom:12}}>Your questions go to {page.sender.company}. Answers to you are private unless the sender publishes them; published answers never name who asked.</p>
    <form onSubmit={e=>{e.preventDefault();void act(async()=>{const [k,v]=reference.split(':');await call('/questions','POST',{body:question,...(k==='s'?{section:v}:k==='d'?{documentId:v}:{})});setQuestion('');setReference('');await refresh();setNotice('Question sent.');});}}>
     <label className="xp-field"><span>Your question</span><textarea required maxLength={5000} value={question} onChange={e=>setQuestion(e.target.value)} disabled={busy}/></label>
     <label className="xp-field"><span>About (optional)</span><select value={reference} onChange={e=>setReference(e.target.value)} disabled={busy}><option value="">The room in general</option>{refs.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></label>
     <button className="xp-button is-primary" disabled={busy||!question.trim()}>Ask</button></form>
    <h3>Your questions</h3>{page.questions.length?<ul className="xp-thread">{page.questions.map((q:any)=><li key={q.id} className="xp-msg is-mine"><div className="xp-msg-meta"><strong>You asked</strong><span>{fmtDate(q.askedAt)}</span>{(q.document||q.section)&&<span>About {q.document?.title??`${q.section.number} ${q.section.title}`}</span>}</div><p className="xp-pre">{q.body}</p>
     {q.answers.length?q.answers.map((a:any)=><div key={a.id} className="xp-answer"><div className="xp-msg-meta"><strong>{a.visibility==='private'?`Answer from ${page.sender.company}`:'Published answer'}</strong><span>{fmtDate(a.createdAt)}{a.edited?' · corrected':''}</span></div><p className="xp-pre">{a.body}</p></div>):<p className="xp-muted">Waiting for an answer.</p>}</li>)}</ul>:<p className="xp-muted">You have not asked anything yet.</p>}
    <h3>Published answers</h3>{page.published.length?<ul className="xp-thread">{page.published.map((a:any)=><li key={a.id} className="xp-msg is-clarification"><div className="xp-msg-meta"><strong>{a.visibility==='level'?'For your access level':'For everyone in the room'}</strong><span>{fmtDate(a.createdAt)}{a.edited?' · corrected':''}</span>{a.document&&<span>About {a.document.title}</span>}</div>{a.question&&<p className="xp-msg-q">{a.question}</p>}<p className="xp-pre">{a.body}</p></li>)}</ul>:<p className="xp-muted">No answers have been published yet.</p>}
   </section>}
  </div>
  {viewer&&<div className="xp-viewer" role="dialog" aria-modal="true" aria-label={viewer.doc.title}><div className="xp-viewer-bar"><strong>{viewer.doc.title}</strong>{viewer.doc.viewOnly&&<span className="xp-muted">View only</span>}<button ref={closeRef} className="xp-button" onClick={closeViewer}>Close</button></div>
   {viewer.doc.mime==='application/pdf'?<iframe title={viewer.doc.title} src={viewer.url} className="xp-viewer-frame"/>:<img alt={viewer.doc.title} src={viewer.url} className="xp-viewer-image"/>}</div>}
  {footer}</main>;
}
/** The update (§6 U1/U3): sanitised content from the server, with an "I can help" box at each ask. A link from the email (?ask=key) opens that ask. */
function UpdatePanel({page,hidden,call,refresh}:{page:any;hidden:boolean;call:Props['call'];refresh:Props['refresh']}){
 const wanted=useRef(new URLSearchParams(location.search).get('ask'));
 return <section role="tabpanel" id="panel-update" aria-labelledby="tab-update" hidden={hidden} className="xp-panel"><h2 className="xp-visually-hidden" style={{position:'absolute',width:1,height:1,overflow:'hidden',clip:'rect(0 0 0 0)'}}>Update</h2>
  <article className="xp-content">{page.update.segments.map((s:any,i:number)=>s.html!==undefined?<div key={i} dangerouslySetInnerHTML={{__html:s.html}}/>:<AskBox key={s.ask.key} ask={page.update.asks.find((a:any)=>a.key===s.ask.key)??s.ask} company={page.sender.company} focus={wanted.current===s.ask.key} call={call} refresh={refresh}/>)}</article>
  <p className="xp-muted" style={{marginTop:24,fontSize:14}}>{page.update.confidentiality}{page.update.updatedAt?` Updated ${fmtDate(page.update.updatedAt)}.`:''}</p></section>;
}
function AskBox({ask,company,focus,call,refresh}:{ask:any;company:string;focus:boolean;call:Props['call'];refresh:Props['refresh']}){
 const [open,setOpen]=useState(focus),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false),[nonce,setNonce]=useState(()=>crypto.randomUUID());
 const box=useRef<HTMLDivElement|null>(null),area=useRef<HTMLTextAreaElement|null>(null),id='ask-'+ask.key,responses:any[]=ask.responses??[];
 useEffect(()=>{if(focus){box.current?.scrollIntoView({block:'center'});area.current?.focus();}},[]);
 async function send(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{await call('/asks','POST',{askKey:ask.key,note,nonce});setDone(true);setOpen(false);setNote('');setNonce(crypto.randomUUID());await refresh();}catch(x){setError((x as Error).message);}finally{setBusy(false);}}
 return <div ref={box} id={id} className={'xp-ask'+(focus?' is-focus':'')} role="group" aria-labelledby={id+'-text'}><p id={id+'-text'} className="xp-pre">{ask.text}</p>
  {responses.length>0&&<p className="xp-muted" role="status">{done?`Thank you. ${company} has been told you can help.`:`You offered to help on ${fmtDate(responses[responses.length-1].respondedAt)}.`}</p>}
  {!open?<button className="xp-button is-primary" onClick={()=>setOpen(true)} aria-expanded={false} aria-controls={id+'-form'}>{responses.length?'Send another note':'I can help'}</button>
  :<form id={id+'-form'} onSubmit={send}><label className="xp-field"><span>Note for {company} (optional)</span><textarea ref={area} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} disabled={busy}/></label>
   <div className="xp-actions"><button className="xp-button is-primary" disabled={busy}>Send</button><button type="button" className="xp-button is-link" onClick={()=>setOpen(false)} disabled={busy}>Cancel</button></div>
   <p className="xp-muted" style={{marginTop:8,fontSize:14}}>Only {company} sees that you responded.</p></form>}
  {error&&<p className="xp-error" role="alert">{error}</p>}</div>;
}
function AckForm({title,text,busy,value,email,onChange,onSubmit}:{title:string;text:string;busy:boolean;value?:{name:string;email:string};email?:string|null;onChange:(v:{name:string;email:string})=>void;onSubmit:()=>void}){
 const v=value??{name:'',email:email??''};
 return <form onSubmit={e=>{e.preventDefault();onSubmit();}}>{title&&<h3 style={{marginTop:0}}>{title}</h3>}<p className="xp-pre" style={{marginBottom:12}}>{text}</p>
  <label className="xp-field"><span>Your name</span><input required autoComplete="name" value={v.name} onChange={e=>onChange({...v,name:e.target.value})}/></label>
  <label className="xp-field"><span>Your email</span><input type="email" required autoComplete="email" value={v.email} readOnly={!!email} onChange={e=>onChange({...v,email:e.target.value})}/></label>
  <button className="xp-button is-primary" disabled={busy}>I accept</button><p className="xp-muted" style={{marginTop:8}}>Your name, email and the time are recorded with the sender.</p></form>;
}
