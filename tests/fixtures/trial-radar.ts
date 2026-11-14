import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execute} from '../../src/foundation/runtime.js';
import {appTemplates} from '../../src/workspace/app-templates.js';

/* Trial Radar 1.0.0 unit harness (Bio Radars kit). The catalog entry is prepared exactly as AppTemplates.operation prepends configuration and
 * executed in production QuickJS. records.read behaves like the platform: exact-match filters on string values, search over values, sort with
 * empty values last (select fields in option order), then paging; total counts all matches. Functions run in the same QuickJS runtime with
 * the injected appRoles map. Records are the fictional demo set (as of 16 Nov 2026). */
export const entry=await appTemplates.read({templateId:'life.trial-radar',version:'1.0.0',includeFunctionSource:true} as any);
export const root='templates/source/radars/trial-radar/';
export const radar=JSON.parse(await readFile(root+'radar.json','utf8'));
export const schema=JSON.parse(await readFile(root+'schema.example.json','utf8'));
export const demo=JSON.parse(await readFile(root+'demo_data.json','utf8'));
export const roles=Object.keys(schema).filter(r=>r!=='programs');
export const fullMap=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:(schema[r].readOnly?[]:Object.keys(schema[r].logicalFields))}]));
export const fullBindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields) as string[]}));
export const cfgFor=(map:any=fullMap,extra:any={})=>({...entry.defaults,tableMap:JSON.stringify(map),asOfOverride:demo.asOf,...extra});
export const source=(config:any=cfgFor(),b:any[]=fullBindings)=>`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(b)};\n${entry.source}`;
export type Row={id:string,version:number,role:string,data:any};
export const fresh=():Row[]=>structuredClone(demo.records);
export const T=(name:'settings'|'scopes'|'trials'|'events'|'runs')=>'trialradar.'+name;

const str=(v:any)=>v===null||v===undefined?null:typeof v==='object'?JSON.stringify(v):String(v);
/** Platform-shaped read (src/workspace/service.ts records.read and src/domain/data-service.ts). */
export function platformRead(rows:Row[],v:any,fieldsOf:(typeId:string)=>any[]=t=>schema[t]?.fields??[]){
 let all=rows.filter(r=>r.role===v.typeId);
 for(const [k,x] of Object.entries(v.filters||{}))all=all.filter(r=>str(r.data[k])===x);
 if(v.q){const q=String(v.q).toLowerCase();all=all.filter(r=>Object.values(r.data).some(x=>x!==null&&x!==undefined&&String(typeof x==='object'?JSON.stringify(x):x).toLowerCase().includes(q)));}
 if(v.month&&v.dateField)all=all.filter(r=>String(r.data[v.dateField]||'').slice(0,7)===v.month);
 if(v.sort){const f=v.sort.field,dir=v.sort.direction==='desc'?-1:1,def=fieldsOf(v.typeId).find((x:any)=>x.key===f),opts=def?.options??null;
  const val=(r:Row)=>{const x=r.data[f];if(x===null||x===undefined||x==='')return null;if(opts)return opts.indexOf(x);if(def&&['number','money'].includes(def.kind))return Number(x);return String(x).toLowerCase();};
  all=all.slice().sort((a,b)=>{const x=val(a),y=val(b);if(x===null&&y===null)return 0;if(x===null)return 1;if(y===null)return -1;return (x<y?-1:x>y?1:0)*dir;});}
 const limit=v.limit===undefined?25:v.limit,offset=v.offset||0;
 return {rows:limit===0?[]:all.slice(offset,offset+limit).map(r=>({id:r.id,version:r.version,data:r.data})),total:all.length};
}
export async function render(rows:Row[],state:any={},event:any={kind:'open',action:''},opts:any={}){
 const changes:any[]=[],calls:any[]=[];
 const output:any=await execute(source(opts.config,opts.bindings),{saved:opts.saved??true,writable:opts.writable??true,state,event:{value:null,form:{},...event}},async(name,v:any)=>{
  calls.push({name,v});
  if(name==='records.propose'){if(opts.failPropose)throw Error('denied');changes.push(...v);return {status:'proposed'};}
  if(name!=='records.read')throw Error('Unexpected capability '+name);
  if(opts.read)return opts.read(v,rows);
  return platformRead(rows,v,opts.fieldsOf);
 });return {output,changes,calls,html:output.html as string,state:output.state};
}
export function approve(rows:Row[],changes:any[]){for(const c of changes){if(c.kind==='create_record')rows.push({id:randomUUID(),version:0,role:c.typeId,data:c.data});else{const r=rows.find(x=>x.id===c.recordId)!;if(r.version!==c.expectedVersion)throw Error('stale version');r.data={...r.data,...c.data};r.version++;}}}
export const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ');
/** A session carries state like the host frame and applies approved proposals to the rows. */
export function session(rows:Row[],opts:any={}){let state:any={};const s:any={html:'',changes:[] as any[],calls:[] as any[],
 async ev(event:any){const out=await render(rows,state,event,opts);state=out.state;s.html=out.html;s.changes=out.changes;s.calls=out.calls;s.state=state;return out;},
 open:(st:any={})=>{state={...state,...st};return s.ev({kind:'open',action:''});},
 click:(action:string)=>s.ev({kind:'click',action}),change:(action:string,value:any)=>s.ev({kind:'change',action,value}),submit:(action:string,form:any={})=>s.ev({kind:'submit',action,form}),
 approve(){approve(rows,s.changes);s.changes=[];return s.ev({kind:'open',action:''});}};return s;}
/** Runs one of the radar's installed read-only functions in production QuickJS. tables.list returns the schema (plus custom fields). */
export async function runFunction(name:string,rows:Row[],input:any={},opts:any={}){
 const fn=entry.functions.find((f:any)=>f.name===name);if(!fn)throw Error('No function '+name);
 const appRoles=Object.fromEntries(fn.scope.roles.map((r:string)=>[r,r]));
 const src=`const appRoles=Object.freeze(${JSON.stringify(appRoles)});\n${fn.source}`;const calls:any[]=[];
 const out:any=await execute(src,input,async(call,v:any)=>{calls.push({call,v});
  if(call==='tables.list')return fn.scope.roles.map((r:string)=>({id:r,name:r,fields:(schema[r]?.fields??[]).concat(opts.extraFields?.[r]??[])}));
  if(call==='records.read'){if(!fn.scope.roles.includes(v.typeId))throw Error('capability_denied');return platformRead(rows,v,(t)=>(schema[t]?.fields??[]).concat(opts.extraFields?.[t]??[]));}
  throw Error('capability_denied '+call);});
 return {out,calls};
}
