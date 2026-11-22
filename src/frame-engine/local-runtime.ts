// P4, P2, P5 (5.1, 5.3): the frame's local store and event loop for one open app. Plain JavaScript without DOM use, so the
// frame bundle and the Node tests run the same code. The store holds only what the server already sent this open view
// (D20: memory only, never the device). Anything with an outside effect is never run here: the event goes to the server.
import {readKey,type EngineApp} from './engine-core.js';
export type LocalStore={seed(reads:any[]|undefined,reset?:boolean):void;get(name:string,input:unknown):any;snapshot():Map<string,any>;restore(snapshot:Map<string,any>):void;size():number;patch(changes:any[]|undefined):void;apply(rows:any[]|undefined):void;readsOf(typeIds:string[]|undefined):{name:string;input:unknown}[];drop(reads:{name:string;input:unknown}[]):void};
export type LocalResult={kind:'painted';output:any;saves:any[];misses:{name:string;input:unknown}[];rollback:Map<string,any>|null}|{kind:'reads';reads:{name:string;input:unknown}[]}|{kind:'server';reason:string};

const RECORD_READS=['records.read','records.readMany','records.get','records.summarize','project.records','project.relationships','roles.list','integrations.list'];
/** Reads the frame may ask the server to fill with read_app_data: the app's record reads (src/workspace/app-capabilities.ts)
 * and its own documents, exchange and file lists, each answered as inside the app's sandboxed run. */
export const FILLABLE_READS=new Set([...RECORD_READS,'documents.list','documents.search','documents.text','documents.quote','files.list',
 'exchange.list','exchange.status','exchange.listSubmissions','exchange.listMessages','exchange.defaultEmail','exchange.prepareEmail','exchange.listEmails','exchange.notifications','exchange.listQuestions','exchange.previewContent','exchange.listResponses','exchange.series']);
/** Reads the server seeds with a render. */
export const SEEDED_READS=FILLABLE_READS;
/** How long a stored read answers a local render (the same window as the standard tracker's page cache). */
export const STORE_TTL=120000;
const STATE_BYTES=100000,HTML_CHARS=200000,CSS_CHARS=50000;

export function createStore(now=()=>Date.now()):LocalStore{
 let entries=new Map<string,any>();
 return {
  /** Adds the reads a server render made: [{name,input,result}] or [{name,input,error}]. */
  seed(reads:any[]|undefined,reset=false){if(reset)entries=new Map();const at=now();for(const r of reads??[])if(r&&typeof r.name==='string'&&SEEDED_READS.has(r.name))entries.set(readKey(r.name,r.input),{at,name:r.name,input:r.input,...('error' in r?{error:String(r.error)}:{result:r.result})});},
  get(name:string,input:unknown){const hit=entries.get(readKey(name,input));if(!hit||now()-hit.at>STORE_TTL)return null;return hit;},
  snapshot(){return new Map([...entries].map(([k,v])=>[k,structuredClone(v)]));},
  restore(snapshot:Map<string,any>){entries=snapshot;},
  size(){return entries.size;},
  /** After a save: the saved rows (their new version and values) replace the same records in every stored read, so the
   * next edit carries the version the save produced. */
  apply(rows:any[]|undefined){
   const saved=new Map<string,any>();for(const r of rows??[])if(r&&typeof r.id==='string'&&typeof r.version==='number')saved.set(r.id,r);
   if(!saved.size)return;
   const row=(r:any)=>{const s=r&&typeof r==='object'&&typeof r.id==='string'?saved.get(r.id):null;return s?{...r,version:s.version,...(r.data&&typeof r.data==='object'&&s.data&&typeof s.data==='object'?{data:{...r.data,...Object.fromEntries(Object.entries(s.data).filter(([k])=>k in r.data))}}:{})}:r;};
   const page=(p:any):any=>!p||typeof p!=='object'?p:Array.isArray(p.rows)?{...p,rows:p.rows.map(row)}:Array.isArray(p.records)?{...p,records:p.records.map(row)}:row(p);
   for(const [k,v] of entries){if(!('result' in v))continue;const r=v.result;entries.set(k,{...v,result:r&&Array.isArray(r.results)?{...r,results:r.results.map(page)}:page(r)});}
  },
  /** The stored record reads that touch these tables (to fetch again after a save), oldest first. */
  readsOf(typeIds:string[]|undefined){
   const ids=(typeIds??[]).filter(t=>typeof t==='string'&&t);if(!ids.length)return [];
   return [...entries.values()].filter(v=>typeof v.name==='string'&&RECORD_READS.includes(v.name)&&(v.name.startsWith('project.')||ids.some(t=>JSON.stringify(v.input??{}).includes(t)))).map(v=>({name:v.name,input:v.input}));
  },
  drop(reads:{name:string;input:unknown}[]){for(const r of reads)entries.delete(readKey(r.name,r.input));},
  /** v2 optimistic save: changed values show at once in every stored read that holds the record. */
  patch(changes:any[]|undefined){
   const updates=new Map<string,any>(),archived=new Set<string>();
   for(const c of changes??[]){if(c?.kind==='update_record'&&c.recordId&&c.data&&typeof c.data==='object')updates.set(c.recordId,{...(updates.get(c.recordId)??{}),...c.data});else if(c?.kind==='archive_record'&&c.recordId)archived.add(c.recordId);}
   if(!updates.size&&!archived.size)return;
   const row=(r:any)=>r&&typeof r==='object'&&typeof r.id==='string'&&updates.has(r.id)&&r.data&&typeof r.data==='object'?{...r,data:{...r.data,...updates.get(r.id)}}:r;
   const page=(p:any):any=>{if(!p||typeof p!=='object')return p;if(Array.isArray(p.rows)){const kept=p.rows.filter((r:any)=>!archived.has(r?.id));return {...p,rows:kept.map(row),...(typeof p.total==='number'?{total:p.total-(p.rows.length-kept.length)}:{})};}if(Array.isArray(p.records))return {...p,records:p.records.filter((r:any)=>!archived.has(r?.id)).map(row)};return row(p);};
   for(const [k,v] of entries){if(!('result' in v))continue;const r=v.result;entries.set(k,{...v,result:r&&Array.isArray(r.results)?{...r,results:r.results.map(page)}:page(r)});}
  },
 };
}

/** What a v2 app sees for a read that is still on its way (P2: show first, fill in after). */
function pendingShape(name:string,input:any):any{
 if(name==='records.read')return {pending:true,rows:[],total:null,limit:input?.limit??25,offset:input?.offset??0};
 if(name==='records.readMany')return {pending:true,results:(Array.isArray(input?.reads)?input.reads:[]).map((r:any)=>pendingShape('records.read',r))};
 if(name==='records.summarize')return {pending:true,totals:null,groups:[]};
 if(name==='project.records')return {pending:true,records:[],nextOffset:null};
 if(name==='project.relationships')return {pending:true,relationships:[],nextOffset:null};
 return {pending:true};
}

/** Checks a local output the way the server does (frontendOutput, state limit, no server-resolved controls). */
export function localOutput(out:any,version:string):any{
 if(!out||typeof out!=='object'||Array.isArray(out))return null;
 const allowed=version==='v2'?['html','css','state','notice','context']:['html','css','state','controls'];
 if(Object.keys(out).some(k=>!allowed.includes(k)))return null;
 if(typeof out.html!=='string'||out.html.length>HTML_CHARS)return null;
 if(out.css!==undefined&&(typeof out.css!=='string'||out.css.length>CSS_CHARS))return null;
 // Bound data controls are resolved by the server (values, edit rights, versions): such a screen comes from the server.
 if(out.controls!==undefined&&(!Array.isArray(out.controls)||out.controls.length))return null;
 const state=out.state===undefined?null:out.state;let wire;try{wire=JSON.stringify(state);}catch{return null;}
 if(new TextEncoder().encode(wire).length>STATE_BYTES)return null;
 const notice=out.notice&&typeof out.notice==='object'&&['info','success','error'].includes(out.notice.kind)&&typeof out.notice.message==='string'?{kind:out.notice.kind,message:out.notice.message.slice(0,300)}:undefined;
 return {html:out.html,css:out.css??'',state,...(notice?{notice}:{}),...(version==='v2'&&out.context!==undefined?{context:out.context}:{})};
}

/**
 * One open app in the frame. `app` is the loaded engine app (engine-core loadApp), `input` the parts of the input the
 * server gave this view (saved, writable, route; v2 also appRole, context, viewport).
 * run(state,event) returns one of:
 *  {kind:'painted',output,saves,misses}  the screen was made locally; v2 saves go to the server in the background;
 *                                        v2 misses are fetched and the event is made again
 *  {kind:'reads',reads}                  v1: the screen needs reads the store lacks; fetch them and run again
 *  {kind:'server',reason}                the event goes to the server (an outside effect, or something only it can do)
 */
export function createLocalApp({app,version,store,input}:{app:EngineApp;version:string;store:LocalStore;input:Record<string,unknown>}){
 return {
  version,
  run(state:unknown,event:any):LocalResult{
   const misses:{name:string;input:unknown}[]=[],seen=new Set<string>(),saves:any[]=[];let server:string|null=null;const before=version==='v2'?store.snapshot():null;
   const bridge=(raw:string):string=>{
    const request=JSON.parse(raw),name=request?.name,value=request?.input;
    if(SEEDED_READS.has(name)){
     const hit=store.get(name,value);
     if(hit){if('error' in hit)throw new Error(hit.error);return JSON.stringify(hit.result??null);}
     if(!FILLABLE_READS.has(name)){server??='read:'+name;throw new Error('Server action');}
     const key=readKey(name,value);if(!seen.has(key)){seen.add(key);misses.push({name,input:value});}
     if(version==='v2')return JSON.stringify(pendingShape(name,value));
     throw new Error('Data is loading');
    }
    // v2 direct save: the value shows at once; the event goes to the server, which saves it (one request) and confirms.
    if(version==='v2'&&name==='records.save'){
     const changes=Array.isArray(value?.changes)?value.changes:null;
     if(!changes||!changes.length||changes.length>50||!['click','change','submit'].includes(event?.kind)){server??='save';throw new Error('Server action');}
     saves.push(...changes);store.patch(changes);return JSON.stringify({status:'saving',count:changes.length});
    }
    server??='action:'+name;throw new Error('Server action');
   };
   let raw:any;
   try{raw=app.render({...input,state,event},bridge);}catch{if(before)store.restore(before);if(!server&&misses.length&&version!=='v2')return {kind:'reads',reads:misses};return {kind:'server',reason:server??(misses.length?'reads':'error')};}
   if(server){if(before)store.restore(before);return {kind:'server',reason:server};}
   if(misses.length&&version!=='v2')return {kind:'reads',reads:misses};
   const output=localOutput(raw,version);
   if(!output){if(before)store.restore(before);return {kind:'server',reason:'output'};}
   return {kind:'painted',output,saves,misses,rollback:before};
  },
 };
}
