import React,{useEffect,useRef,useState} from 'react';

type Call=(name:string,args?:any)=>Promise<any>;
const when=(at:string|Date)=>new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(at));

/**
 * A7: what happened in one app and to it, for the app's owners. The server decides who may read it and which
 * values an entry may show. Read-only: nothing is restored from here (A10).
 */
export function AppActivity({call,appId}:{call:Call;appId:string}){
 const [rows,setRows]=useState<any[]|null>(null),[next,setNext]=useState<number|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),seq=useRef(0);
 async function load(offset:number){
  const mine=++seq.current;setBusy(true);
  try{const page=await call('read_app_log',{appId,offset});if(mine!==seq.current)return;
   // New entries can arrive between two loads; never show one twice.
   setRows(old=>offset?[...(old??[]),...page.rows.filter((r:any)=>!(old??[]).some(o=>o.id===r.id))]:page.rows);setNext(page.nextOffset);setError('');
  }catch(e){if(mine===seq.current)setError((e as Error).message);}finally{if(mine===seq.current)setBusy(false);}
 }
 useEffect(()=>{setRows(null);setNext(null);void load(0);return()=>{seq.current++;};},[appId]);
 return <section className="ty-app-people" aria-label="Activity" aria-busy={busy}>
  <div className="ty-app-people-head"><h3>Activity</h3></div>
  {error&&<p role="alert">{error}</p>}
  {!rows&&!error&&<p role="status">Loading activity…</p>}
  {rows&&!rows.length&&<p className="ty-app-people-help">Nothing has happened in this app yet.</p>}
  {rows&&rows.length>0&&<ul className="ty-app-people-list">{rows.map(r=><li key={r.id}><span className="ty-app-people-name"><b>{r.description}</b><small>{r.actorName} · {when(r.at)}</small>
   {r.changes?.map((c:any,i:number)=><small key={i}>{c.field}: {c.before.text}{c.before.truncated?'…':''} → {c.after.text}{c.after.truncated?'…':''}</small>)}</span></li>)}</ul>}
  {next!==null&&<p className="ty-app-people-help"><button type="button" className="ty-button" disabled={busy} onClick={()=>void load(next)}>Load more</button></p>}
 </section>;
}
