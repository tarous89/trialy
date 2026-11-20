import React,{useEffect,useRef,useState} from 'react';
import {usePlatformChrome} from './PlatformChrome.js';

type Call=(name:string,args?:any)=>Promise<any>;
type Level='edit'|'view'|'blocked';
type Area='data'|'apps';
const LEVELS:Level[]=['edit','view','blocked'],LABEL:Record<Level,string>={edit:'Edit',view:'View only',blocked:'Blocked'},RANK:Record<Level,number>={blocked:0,view:1,edit:2};
const AREAS:{id:Area;name:string;what:string}[]=[{id:'data',name:'Data',what:'Reading and changing records'},{id:'apps',name:'Apps',what:'Building and changing apps and automations'}];
const lower=(a:Level,b:Level):Level=>RANK[a]<RANK[b]?a:b;

/** Loads the levels once and saves one change at a time; the result is said in the platform message. */
function useAssistantLevels(call:Call,save:'set_assistant_maximum'|'set_my_assistant_limit',saved:(assistant:string,area:string,level:Level)=>string){
 const [data,setData]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),chrome=usePlatformChrome(),seq=useRef(0);
 useEffect(()=>{const mine=++seq.current;call('read_assistant_levels').then(v=>{if(mine!==seq.current)return;/* An answer in an unexpected shape (an older server, a host without this call) must not take the page down. */if(Array.isArray(v?.assistants))setData(v);else setData({unavailable:true});}).catch(e=>{if(mine===seq.current)setError((e as Error).message);});return()=>{seq.current++;};},[]);
 async function change(assistant:any,current:Record<Area,Level>,area:Area,level:Level){
  setBusy(true);
  try{setData(await call(save,{assistant:assistant.id,...current,[area]:level}));chrome.notify({kind:'success',message:saved(assistant.name,AREAS.find(a=>a.id===area)!.name,level)});}
  catch(e){chrome.notify({kind:'error',message:(e as Error).message});}
  finally{setBusy(false);}
 }
 return {data,error,busy,change};
}
function LevelSelect({label,value,options,disabled,onChange}:{label:string;value:Level;options:Level[];disabled:boolean;onChange:(level:Level)=>void}){
 return <select aria-label={label} value={value} disabled={disabled} onChange={e=>onChange(e.target.value as Level)}>{options.map(l=><option key={l} value={l}>{LABEL[l]}</option>)}</select>;
}
function Grid({title,help,busy,children}:{title:string;help:string;busy:boolean;children:React.ReactNode}){
 return <section className="ty-assistant-levels" aria-label={title} aria-busy={busy}><h3>{title}</h3><p className="ty-assistant-levels-help">{help}</p>
  <div className="ty-assistant-levels-grid" role="table"><div role="row"><span role="columnheader">Assistant</span>{AREAS.map(a=><span key={a.id} role="columnheader" title={a.what}>{a.name}</span>)}</div>{children}</div></section>;
}

/**
 * A4: the most each assistant may do for anyone in the organization. Organization owners change it;
 * everyone else sees it. Placed on the Access page by the page that owns it.
 */
export function AssistantMaximums({call}:{call:Call}){
 const {data,error,busy,change}=useAssistantLevels(call,'set_assistant_maximum',(assistant,area,level)=>`${assistant} is now ${LABEL[level]} for ${area.toLowerCase()} for everyone`);
 if(data?.unavailable)return null;
 if(error)return <section className="ty-assistant-levels" aria-label="Assistants"><p role="alert">{error}</p></section>;
 if(!data)return <section className="ty-assistant-levels" aria-label="Assistants"><p role="status">Loading assistants…</p></section>;
 return <Grid title="Assistants" help="The most ChatGPT and Claude can do for anyone in your organization. Each person can set a tighter limit for themself under Connections." busy={busy}>
  {data.assistants.map((x:any)=><div role="row" key={x.id}><b role="cell">{x.name}</b>{AREAS.map(a=><span role="cell" key={a.id}>{data.canSetMaximum
   ?<LevelSelect label={`${x.name}: ${a.name}`} value={x.maximum[a.id]} options={LEVELS} disabled={busy} onChange={level=>void change(x,x.maximum,a.id,level)}/>
   :<span className="ty-role">{LABEL[x.maximum[a.id] as Level]}</span>}</span>)}</div>)}
 </Grid>;
}

/**
 * A4: a person's own limit for each assistant. It can only tighten: the choices stop at the organization maximum,
 * and the assistant never does more than the person may do themself.
 */
export function MyAssistantLimits({call,connected}:{call:Call;connected?:string[]}){
 const {data,error,busy,change}=useAssistantLevels(call,'set_my_assistant_limit',(assistant,area,level)=>`${assistant} is now ${LABEL[level]} for ${area.toLowerCase()} when it works for you`);
 if(data?.unavailable)return null;
 if(error)return <section className="ty-assistant-levels" aria-label="Your assistants"><p role="alert">{error}</p></section>;
 if(!data)return <section className="ty-assistant-levels" aria-label="Your assistants"><p role="status">Loading assistants…</p></section>;
 const older=data.assistants.some((x:any)=>AREAS.some(a=>RANK[x.effective[a.id] as Level]<RANK[lower(x.mine[a.id],x.maximum[a.id])]));
 return <Grid title="Your assistants" help="Limits what this assistant can do for you. It can never do more than you can." busy={busy}>
  {data.assistants.map((x:any)=><div role="row" key={x.id}><b role="cell">{x.name}{connected&&<small>{connected.includes(x.id)?'Connected':'Not connected'}</small>}</b>{AREAS.map(a=>{const most=x.maximum[a.id] as Level,shown=lower(x.mine[a.id],most);
   return <span role="cell" key={a.id}>{data.canSetMine?<LevelSelect label={`${x.name}: ${a.name}`} value={shown} options={LEVELS.filter(l=>RANK[l]<=RANK[most])} disabled={busy} onChange={level=>void change(x,x.mine,a.id,level)}/>:<span className="ty-role">{LABEL[shown]}</span>}
    {most!=='edit'&&<small>Your organization allows {LABEL[most]} at most</small>}</span>;})}</div>)}
  {older&&<p className="ty-assistant-levels-help">An earlier setting by an organization owner still limits an assistant here. An organization owner can change it under Access.</p>}
 </Grid>;
}
