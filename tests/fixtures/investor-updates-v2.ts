import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execute} from '../../src/foundation/runtime.js';
import {appTemplates} from '../../src/workspace/app-templates.js';
import {effectiveSource,isV2Source} from '../../src/workspace/browser-runtime.js';
import {fakeExchange} from './investor-updates.js';

/* Investor Updates 2.0.0 unit harness: the catalog entry prepared as AppTemplates.operation prepends configuration, with the kit
 * placed ahead of v2 code exactly as the runtime does (effectiveSource), executed in production QuickJS on the fictional demo set.
 * records.save, records.readMany, undo.list and undo.run use the platform's shapes; a read can be made pending as in the frame. */
export const entry=await appTemplates.read({templateId:'life.investor-updates',version:'2.0.0'});
export const root='templates/source/investor-updates/';
export const schema=JSON.parse(await readFile(root+'schema.example.json','utf8'));
export const demo=JSON.parse(await readFile(root+'demo_data.json','utf8'));
export const roles=Object.keys(schema);
export const fullMap=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:Object.keys(schema[r].logicalFields)}]));
export const fullBindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
export const cfgFor=(map:any=fullMap,extra:any={})=>({...entry.defaults,tableMap:JSON.stringify(map),asOfOverride:demo.asOf,companyName:demo.companyName,...extra});
export const rawSource=(config:any=cfgFor(),b:any[]=fullBindings)=>`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(b)};\n${entry.source}`;
export const source=(config?:any,b?:any[])=>effectiveSource(rawSource(config,b));
export {isV2Source,fakeExchange};
export type Row={id:string,version:number,role:string,data:any};
export const fresh=():Row[]=>structuredClone(demo.records);
export const T=(r:string)=>'investorupdates.'+r;
export const id=(role:string,pred:(d:any)=>boolean)=>(demo.records as Row[]).find(r=>r.role===role&&pred(r.data))!.id;
/** Applies saved changes to the rows like the platform: a stale version is refused. */
export function apply(rows:Row[],changes:any[]){for(const c of changes){if(c.kind==='create_record')rows.push({id:randomUUID(),version:0,role:c.typeId,data:c.data});else if(c.kind==='archive_record'){const i=rows.findIndex(x=>x.id===c.recordId);if(i<0||rows[i].version!==c.expectedVersion)throw Error('stale version');rows.splice(i,1);}else{const r=rows.find(x=>x.id===c.recordId)!;if(r.version!==c.expectedVersion)throw Error('stale version');r.data={...r.data,...c.data};r.version++;}}}
export async function render(rows:Row[],state:any={},event:any={kind:'open',action:''},opts:any={}){
 const saves:any[]=[],calls:string[]=[],layouts:any[]=[],proposals:any[]=[];const xc=opts.exchange??fakeExchange();
 const read=(v:any)=>{if(opts.pending?.includes(v.typeId))return {pending:true,rows:[],total:null,limit:v.limit,offset:v.offset};if(opts.read)return opts.read(v,rows);const all=rows.filter(r=>r.role===v.typeId).map(r=>({id:r.id,version:r.version,data:r.data}));return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length,limit:v.limit,offset:v.offset};};
 const input={saved:opts.saved??true,writable:opts.writable??true,appRole:opts.appRole??'owner',context:opts.context??null,...(opts.viewport?{viewport:opts.viewport}:{}),state,event:{value:null,form:{},...event}};
 const output:any=await execute(source(opts.config,opts.bindings),input,async(name,v:any)=>{
  calls.push(name+(v&&v.typeId?'('+v.typeId.replace('investorupdates.','')+')':''));
  if(name==='records.save'){if(!['click','change','submit','command'].includes(input.event.kind))throw Error('Save records from a person\'s own click, edit or form');saves.push(...v.changes);return {status:'saving',count:v.changes.length};}
  if(name==='records.propose'){proposals.push(...v);return {status:'proposed'};}
  if(name==='records.read')return read(v);
  if(name==='records.readMany')return {results:v.reads.map(read)};
  if(name==='undo.list')return {actions:opts.undo??[]};
  if(name==='undo.run')return {status:'undone'};
  if(name==='documents.list')return opts.documents===false?{unavailable:true}:{documents:opts.docs??demo.documents,total:(opts.docs??demo.documents).length,complete:true};
  if(name==='layout.propose'){layouts.push(v);return {status:'proposed'};}
  if(name.startsWith('exchange.'))return xc.handle(name,v);
  throw Error('Unexpected capability '+name);
 });return {output,saves,proposals,calls,layouts,exchange:xc,html:output.html as string,state:output.state,notice:output.notice};
}
export const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ');
/** A small session: carries state like the frame; saves are applied and the screen is made again from the saved data (event open). */
export function session(rows:Row[],opts:any={}){let state:any={};const xc=opts.exchange??fakeExchange();const s:any={html:'',saves:[] as any[],exchange:xc,
 async ev(event:any){const out=await render(rows,state,event,{...opts,exchange:xc});s.saves=out.saves;s.notice=out.notice;s.calls=out.calls;s.out=out;
  if(out.saves.length&&!opts.manual){apply(rows,out.saves);const again=await render(rows,out.state,{kind:'open',action:''},{...opts,exchange:xc});state=again.state;s.html=again.html;s.state=state;s.after=again;return out;}
  state=out.state;s.html=out.html;s.state=state;return out;},
 open:(st:any={})=>{state={...state,...st};return s.ev({kind:'open',action:''});},
 click:(action:string,form:any={})=>s.ev({kind:'click',action,form}),change:(action:string,value:any)=>s.ev({kind:'change',action,value}),submit:(action:string,form:any={})=>s.ev({kind:'submit',action,form})};return s;}
export const command=async(rows:Row[],cid:string,input:any={},opts:any={})=>{const r=await render(rows,null,{kind:'command',action:cid,value:JSON.stringify(input),form:{}},opts);return {...r.state.command,saves:r.saves,layouts:r.layouts,html:r.html,calls:r.calls};};
