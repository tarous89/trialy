import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execute} from '../../src/foundation/runtime.js';
import {appTemplates} from '../../src/workspace/app-templates.js';
import {effectiveSource} from '../../src/workspace/browser-runtime.js';

/* CRO Selection 3.0.0 (v2) unit harness: the catalog entry prepared as the host prepends configuration, with the kit in front of it
 * (effectiveSource), executed in production QuickJS. Records are the fictional demo set; the exchange is a mock with the platform's
 * response shapes. records.readMany and records.save behave as on the server; `pending` simulates the frame's reads still on their way. */
export const entry=await appTemplates.read({templateId:'life.cro-selection',version:'3.0.0'});
export const schema=JSON.parse(await readFile('templates/source/cro-selection/schema.example.json','utf8'));
export const demo=JSON.parse(await readFile('templates/source/cro-selection/demo_data.json','utf8'));
export const roles=Object.keys(schema);
export const fullMap=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:Object.keys(schema[r].logicalFields)}]));
export const fullBindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
export const cfgFor=(map:any=fullMap,extra:any={})=>({...entry.defaults,tableMap:JSON.stringify(map),asOfOverride:'2026-11-13',...extra});
export const source=(config:any=cfgFor(),b:any[]=fullBindings)=>effectiveSource(`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(b)};\n${entry.source}`);
export type Row={id:string,version:number,role:string,data:any};
export const fresh=():Row[]=>structuredClone(demo.records);
export const freshExchange=()=>structuredClone(demo.exchange);
const READS=['exchange.list','exchange.status','exchange.listSubmissions','exchange.listMessages','exchange.defaultEmail','exchange.prepareEmail','exchange.listEmails','exchange.notifications'];
export async function render(rows:Row[],state:any={},event:any={kind:'open',action:''},opts:any={}){
 const saves:any[]=[],calls:string[]=[],xwrites:any[]=[],reads:any[]=[],X=opts.exchange??freshExchange();let layout:any=null;
 const page=(v:any)=>{if(opts.pending&&opts.pending(v))return {pending:true,rows:[],total:null};const all=rows.filter(r=>r.role===v.typeId).map(r=>({id:r.id,version:r.version,data:r.data}));return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length,limit:v.limit,offset:v.offset};};
 const input={saved:opts.saved??true,writable:opts.writable??true,appRole:opts.appRole??'owner',context:opts.context??null,viewport:{width:'wide',coarse:false},state,event:{value:null,form:{},...event}};
 const output:any=await execute(source(opts.config,opts.bindings),input,async(name,v:any)=>{
  calls.push(name);
  if(name==='records.propose')throw Error('records.propose belongs to v1');
  if(name==='records.save'){if(!['click','change','submit'].includes(input.event.kind)&&!(input.event.kind==='command'&&opts.requestKey))throw Error("Save records from a person's own click, edit or form");if(opts.failSave)throw Error('denied');saves.push(...v.changes);return {status:'saving',count:v.changes.length};}
  if(name==='records.readMany'){reads.push(v.reads);return {results:v.reads.map(page)};}
  if(name==='records.read'){reads.push([v]);return page(v);}
  if(name==='undo.list')return {actions:opts.undo??[]};
  if(name==='undo.run'){if(!['click','submit'].includes(input.event.kind))throw Error('Undo runs from a click');return {status:'undone'};}
  if(name==='layout.propose'){if(layout)throw Error('One layout proposal per action');layout=v;return {status:'proposed'};}
  if(name==='documents.list')return opts.pendingDocs?{pending:true}:{documents:demo.documents,total:demo.documents.length,complete:true};
  if(name.startsWith('exchange.')){
   if(opts.saved===false)throw Error('Save the app to use external exchanges');
   if(!READS.includes(name)){if(!['click','submit'].includes(input.event.kind))throw Error('Request exchange changes from an explicit app control');if(xwrites.length)throw Error('One exchange change per action');xwrites.push({name,value:v});return {status:'review_required',kind:name,message:'TrialAgents shows this change for review; a person confirms it.'};}
   if(opts.pendingExchange)return {pending:true};
   if(name==='exchange.list')return {groups:X.groups.filter((g:any)=>(!v.groupId||g.id===v.groupId)&&(!v.appRef||g.appRef===v.appRef)),nextOffset:null};
   if(name==='exchange.status'){for(const g of X.groups)for(const e of g.exchanges)if(e.id===v.exchangeId)return {exchangeId:e.id,recordId:e.recordId,status:e.status};throw Error('not found');}
   if(name==='exchange.listSubmissions')return {submissions:X.submissions.filter((s:any)=>s.groupId===v.groupId||s.exchangeId===v.exchangeId),nextOffset:null};
   if(name==='exchange.listMessages')return {messages:X.messages.filter((m:any)=>!v.groupId||m.groupId===v.groupId).slice().reverse(),nextOffset:null};
   if(name==='exchange.listEmails')return {emails:X.emails.filter((m:any)=>m.groupId===v.groupId),nextOffset:null};
   if(name==='exchange.defaultEmail')return {emailType:v.emailType,subject:'Platform subject',body:'Platform body {link}',source:'app'};
   if(name==='exchange.prepareEmail')return {batchId:randomUUID(),digest:'d'.repeat(64),from:'Example Therapeutics at TrialAgents <no-reply@trialagents.com>',replyTo:'owner@example.invalid',emailType:v.emailType,scheduledAt:v.scheduleAt??null,defaultSource:'app',recipients:(v.exchangeIds??[]).map((id:string)=>({exchangeId:id,to:'x@example.invalid',recipientName:'X',subject:v.subject??'S',text:(v.body??'B')+'\n\nhttps://platform.trialagents.com/exchange#TOKEN',personalised:!!v.overrides?.[id]})),fixed:'The link, the sender identity and the footer are added by TrialAgents.'};
   return {notifications:[]};
  }
  throw Error('Unexpected capability '+name);
 });return {output,saves,calls,xwrites,reads,layout,html:output.html as string,state:output.state,notice:output.notice};
}
/** Applies saved changes as the server would after a direct save. */
export function apply(rows:Row[],changes:any[]){for(const c of changes){if(c.kind==='create_record')rows.push({id:randomUUID(),version:1,role:c.typeId,data:c.data});else{const i=rows.findIndex(x=>x.id===c.recordId);if(i<0)throw Error('missing');if(rows[i].version!==c.expectedVersion)throw Error('stale version');if(c.kind==='archive_record'){rows.splice(i,1);continue;}rows[i].data={...rows[i].data,...c.data};rows[i].version++;}}}
export const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ');
