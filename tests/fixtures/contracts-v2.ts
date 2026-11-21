import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execute} from '../../src/foundation/runtime.js';
import {appTemplates} from '../../src/workspace/app-templates.js';
import {effectiveSource,isV2Source} from '../../src/workspace/browser-runtime.js';

/* Contracts 2.0.0 rendered in the production QuickJS runtime with stub tools, exactly as the platform runs a v2 catalog
 * app: generated configuration lines, then the kit (effectiveSource), then the app. Fixtures are the fictional demo records. */
export const entry=await appTemplates.read({templateId:'life.contracts',version:'2.0.0'});
export const schema=JSON.parse(await readFile('templates/source/contracts/schema.example.json','utf8'));
export const demo=JSON.parse(await readFile('templates/source/contracts/demo_data.json','utf8')).records;
const roles=Object.keys(schema);
export const fullMap=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:Object.keys(schema[r].logicalFields)}]));
export const fullBindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
export const cfgFor=(map:any=fullMap,extra:any={})=>({...entry.defaults,tableMap:JSON.stringify(map),asOfOverride:'2026-11-12',...extra});
export const prepared=(config:any=cfgFor(),b:any[]=fullBindings)=>`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(b)};\n${entry.source}`;
export type Row={id:string,version:number,role:string,data:any};
export const fresh=():Row[]=>structuredClone(demo);
export const DOCS=[{documentId:'00000000-0000-4000-8000-0000000000a6',versionId:'00000000-0000-4000-8000-0000000000b6',version:0,latest:true,filename:'Corvane supply agreement (signed).pdf',mime:'application/pdf',byteSize:200000,aiReadable:true,extraction:'ready',uploadedOn:'2025-09-23'},
 {documentId:'00000000-0000-4000-8000-0000000000a7',versionId:'00000000-0000-4000-8000-0000000000b7',version:0,latest:true,filename:'Lab lease (scan).pdf',mime:'application/pdf',byteSize:900000,aiReadable:false,extraction:'unavailable',uploadedOn:'2024-01-05'}];
export type Opts={config?:any;bindings?:any[];saved?:boolean;writable?:boolean;appRole?:'owner'|'editor'|'viewer';viewport?:any;context?:any;pending?:(typeId:string)=>boolean;docs?:any;undo?:any[];integrations?:any[];quote?:(v:any)=>any;failSave?:boolean;totalFor?:(typeId:string)=>number|undefined};
/** One event, as the server runs it. Saves are collected (not applied); reads come from rows. */
export async function render(rows:Row[],state:any={},event:any={kind:'open',action:''},opts:Opts={}){
 const saves:any[]=[],calls:{name:string,input:any}[]=[];
 const code=effectiveSource(prepared(opts.config,opts.bindings));
 const page=(v:any)=>{if(opts.pending?.(v.typeId))return {pending:true,rows:[],total:null,limit:v.limit,offset:v.offset};const all=rows.filter(r=>r.role===v.typeId).map(r=>({id:r.id,version:r.version,data:r.data}));return {rows:all.slice(v.offset??0,(v.offset??0)+(v.limit??25)),total:opts.totalFor?.(v.typeId)??all.length,limit:v.limit??25,offset:v.offset??0};};
 const output:any=await execute(code,{saved:opts.saved??true,writable:opts.writable??true,appRole:opts.appRole??'owner',context:opts.context??null,...(opts.viewport?{viewport:opts.viewport}:{}),state,event},async(name,v:any)=>{
  calls.push({name,input:v});
  if(name==='records.readMany')return {results:v.reads.map(page)};
  if(name==='records.read')return page(v);
  if(name==='records.save'){if(opts.failSave)throw Error('denied');saves.push(...v.changes);return {status:'saving',count:v.changes.length};}
  if(name==='undo.list')return {entries:opts.undo??[]};
  if(name==='undo.run')return {status:'undone'};
  if(name==='integrations.list')return {integrations:opts.integrations??[{role:'programs.plan_items',name:'Plan items',source:'own',chosen:false,provider:'Programs',offer:'install'}]};
  if(name==='documents.list')return opts.docs??{documents:DOCS,total:DOCS.length,complete:true};
  if(name==='documents.search')return {hits:[{documentId:DOCS[0].documentId,versionId:DOCS[0].versionId,version:0,filename:DOCS[0].filename,passage:'annual capacity reservation fee of EUR 300,000',pages:[7]}],coverage:{total:2,pending:0,unavailable:1,partial:0}};
  if(name==='documents.quote')return opts.quote?opts.quote(v):{versionId:v.versionId,status:'ready',found:true,page:v.page,pages:[v.page],onPage:true};
  throw Error('Capability unavailable: '+name);
 });
 return {output,saves,calls,html:output.html as string,state:output.state,notice:output.notice};
}
/** Applies saved changes the way records.save does (expected versions checked). */
export function apply(rows:Row[],changes:any[]){for(const c of changes){if(c.kind==='create_record')rows.push({id:randomUUID(),version:0,role:c.typeId,data:c.data});
 else if(c.kind==='archive_record'){const i=rows.findIndex(x=>x.id===c.recordId);if(i<0||rows[i].version!==c.expectedVersion)throw Error('stale version');rows.splice(i,1);}
 else{const r=rows.find(x=>x.id===c.recordId)!;if(r.version!==c.expectedVersion)throw Error('stale version '+c.recordId);r.data={...r.data,...c.data};r.version++;}}}
export const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ');
export const SCREENS=['overview','agreements','families','obligations','cdas','pipeline','counterparties','milestones','settings'];
export {isV2Source};
