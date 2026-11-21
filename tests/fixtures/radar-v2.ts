import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execute} from '../../src/foundation/runtime.js';
import {appTemplates} from '../../src/workspace/app-templates.js';
import {effectiveSource} from '../../src/workspace/browser-runtime.js';

/* Bio Radars on kit 2.0.0 (v2 app contract) in production QuickJS: the catalog entry is prepared as AppTemplates.operation prepends the
 * configuration, the platform kit is put in front exactly as the runtime does (effectiveSource), and the stub tools answer like the
 * platform: records.read / records.readMany with exact-match filters, search, sort with empty values last and paging; records.save
 * collects the changes and applies them as the direct save does (expectedVersion checked); undo.list and undo.run; output.context is
 * kept for the person like the platform does. pendingFor makes the named tables answer { pending: true } as the frame does for a read
 * on its way. Records are each radar's fictional demo set (as of 16 Nov 2026). */
export type Row={id:string,version:number,role:string,data:any};
export async function radarV2(slug:string){
 const root='templates/source/radars/'+slug+'/';
 const radar=JSON.parse(await readFile(root+'radar.json','utf8'));
 const entry=await appTemplates.read({templateId:radar.id,version:radar.version,includeFunctionSource:true} as any);
 const schema=JSON.parse(await readFile(root+'schema.example.json','utf8'));
 const demo=JSON.parse(await readFile(root+'demo_data.json','utf8'));
 const roles=Object.keys(schema).filter(r=>r!=='programs');
 const fullMap=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:(schema[r].readOnly?[]:Object.keys(schema[r].logicalFields))}]));
 const fullBindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields) as string[]}));
 const cfgFor=(map:any=fullMap,extra:any={})=>({...entry.defaults,tableMap:JSON.stringify(map),asOfOverride:demo.asOf,...extra});
 const source=(config:any=cfgFor(),b:any[]=fullBindings)=>effectiveSource(`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(b)};\n${entry.source}`);
 const fresh=():Row[]=>structuredClone(demo.records);
 const T=(name:string)=>radar.prefix+'.'+(name==='tracker'?radar.trackerTable:name);
 const str=(v:any)=>v===null||v===undefined?null:typeof v==='object'?JSON.stringify(v):String(v);
 function platformRead(rows:Row[],v:any){
  let all=rows.filter(r=>r.role===v.typeId);
  for(const [k,x] of Object.entries(v.filters||{}))all=all.filter(r=>str(r.data[k])===x);
  if(v.q){const q=String(v.q).toLowerCase();all=all.filter(r=>Object.values(r.data).some(x=>x!==null&&x!==undefined&&String(x).toLowerCase().includes(q)));}
  if(v.sort){const f=v.sort.field,dir=v.sort.direction==='desc'?-1:1,def=(schema[v.typeId]?.fields??[]).find((x:any)=>x.key===f),opts=def?.options??null;
   const val=(r:Row)=>{const x=r.data[f];if(x===null||x===undefined||x==='')return null;if(opts)return opts.indexOf(x);if(def&&['number','money'].includes(def.kind))return Number(x);return String(x).toLowerCase();};
   all=all.slice().sort((a,b)=>{const x=val(a),y=val(b);if(x===null&&y===null)return 0;if(x===null)return 1;if(y===null)return -1;return (x<y?-1:x>y?1:0)*dir;});}
  const limit=v.limit===undefined?25:v.limit,offset=v.offset||0;
  return {rows:limit===0?[]:all.slice(offset,offset+limit).map(r=>({id:r.id,version:r.version,data:r.data})),total:all.length};
 }
 const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ');
 function apply(rows:Row[],changes:any[]){for(const c of changes){if(c.kind==='create_record')rows.push({id:randomUUID(),version:0,role:c.typeId,data:c.data});else{const i=rows.findIndex(x=>x.id===c.recordId);if(i<0)throw Error('missing record');const r=rows[i];if(r.version!==c.expectedVersion)throw Error('stale_value');if(c.kind==='archive_record'){rows.splice(i,1);continue;}r.data={...r.data,...c.data};r.version++;}}}
 /** A session: state and context carried like the frame and the platform; a save is applied and the screen rendered again with "open". */
 function session(rows:Row[],opts:any={}){
  let state:any={},context:any=null;const undo:any[]=[];
  const s:any={html:'',out:null,saves:[] as any[],calls:[] as any[],notices:[] as any[],
   async ev(event:any){
    const saves:any[]=[],calls:any[]=[];
    const run=async(ev:any)=>execute(source(opts.config,opts.bindings),{saved:opts.saved??true,writable:opts.writable??true,appRole:opts.appRole??'owner',context,state,event:{value:null,form:{},...ev}},async(name,v:any)=>{
     calls.push({name,v});
     if(name==='records.save'){if(!['click','change','submit'].includes(ev.kind))throw Error('save_interaction');saves.push(...v.changes);return {status:'saving',count:v.changes.length};}
     if(name==='records.propose')throw Error('records.propose is v1');
     if(name==='undo.list')return {actions:undo.slice().reverse()};
     if(name==='undo.run'){const u=undo.find(x=>x.undoId===v.undoId);if(!u)throw Error('Nothing to undo');undo.splice(undo.indexOf(u),1);for(const [id,data] of u.reverse){const r=rows.find(x=>x.id===id);if(r){r.data={...r.data,...data};r.version++;}}return {undone:true,label:u.label};}
     const pending=(t:string)=>(opts.pendingFor??[]).includes(t);
     if(name==='records.readMany')return {results:v.reads.map((q:any)=>pending(q.typeId)?{pending:true,rows:[],total:null}:opts.read?opts.read(q,rows):platformRead(rows,q))};
     if(name==='records.read')return pending(v.typeId)?{pending:true,rows:[],total:null}:opts.read?opts.read(v,rows):platformRead(rows,v);
     throw Error('Unexpected capability '+name);
    });
    let out:any=await run(event);
    s.saves=saves;s.calls=calls;if(out.notice)s.notices.push(out.notice);
    if(saves.length){
     const before=saves.filter((c:any)=>c.kind!=='create_record').map((c:any)=>{const r=rows.find(x=>x.id===c.recordId);return [c.recordId,Object.fromEntries(Object.keys(c.data??{}).map(k=>[k,r?.data[k]??null]))];});
     apply(rows,saves);undo.push({undoId:randomUUID(),label:'Edit',reverse:before});
     state=out.state;if(out.context!==undefined)context=out.context;s.first=out;
     out=await run({kind:'open',action:''});
    }
    state=out.state;if(out.context!==undefined)context=out.context;s.html=out.html;s.out=out;s.state=state;s.context=context;return out;
   },
   open:(st:any={})=>{state={...state,...st};return s.ev({kind:'open',action:''});},
   click:(action:string)=>s.ev({kind:'click',action}),change:(action:string,value:any)=>s.ev({kind:'change',action,value}),submit:(action:string,form:any={})=>s.ev({kind:'submit',action,form}),
   setContext(c:any){context=c;}};
  return s;
 }
 return {root,radar,entry,schema,demo,roles,fullMap,fullBindings,cfgFor,source,fresh,T,platformRead,text,session};
}
