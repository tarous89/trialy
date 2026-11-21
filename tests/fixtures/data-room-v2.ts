import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execute} from '../../src/foundation/runtime.js';
import {appTemplates} from '../../src/workspace/app-templates.js';
import {effectiveSource} from '../../src/workspace/browser-runtime.js';

/* Data Room 2.0.0 unit harness (v2 contract): the catalog entry prepared as AppTemplates.operation prepends configuration, with the
 * kit placed ahead of it as the runtime does (effectiveSource), executed in production QuickJS. Records are the fictional demo set;
 * the exchange is a mock with the platform's response shapes. A `pending` option answers chosen reads as the browser frame does
 * while they are on their way. */
export const entry=await appTemplates.read({templateId:'life.data-room',version:'2.0.0'});
export const schema=JSON.parse(await readFile('templates/source/data-room/schema.example.json','utf8'));
export const demo=JSON.parse(await readFile('templates/source/data-room/demo_data.json','utf8'));
export const roles=Object.keys(schema);
export const fullMap=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:Object.keys(schema[r].logicalFields)}]));
export const fullBindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
export const cfgFor=(map:any=fullMap,extra:any={})=>({...entry.defaults,tableMap:JSON.stringify(map),asOfOverride:'2026-11-13',...extra});
export const source=(config:any=cfgFor(),b:any[]=fullBindings)=>effectiveSource(`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(b)};\n${entry.source}`);
export type Row={id:string,version:number,role:string,data:any};
export const fresh=():Row[]=>structuredClone(demo.records);
export const freshExchange=()=>structuredClone(demo.exchange);
const READS=['exchange.list','exchange.status','exchange.listSubmissions','exchange.listMessages','exchange.listQuestions','exchange.defaultEmail','exchange.prepareEmail','exchange.listEmails','exchange.notifications'];
export async function render(rows:Row[],state:any={},event:any={kind:'open',action:''},opts:any={}){
 const saves:any[]=[],calls:string[]=[],xwrites:any[]=[],layouts:any[]=[],undo:any[]=[],X=opts.exchange=opts.exchange??freshExchange();
 const pending=(name:string,v:any)=>typeof opts.pending==='function'?opts.pending(name,v):false;
 const readOne=(v:any)=>{if(pending('records.read',v))return {pending:true,rows:[],total:null,limit:v.limit,offset:v.offset};const all=rows.filter(r=>r.role===v.typeId).map(r=>({id:r.id,version:r.version,data:r.data}));return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};};
 const input={saved:opts.saved??true,writable:opts.writable??true,appRole:opts.appRole??'owner',context:opts.context??null,viewport:opts.viewport??{width:'wide',coarse:false},state,event:{value:null,form:{},...event}};
 const output:any=await execute(source(opts.config,opts.bindings),input,async(name,v:any)=>{
  calls.push(name);
  if(name==='records.save'){
   if(!['click','change','submit'].includes(event.kind)&&!(event.kind==='command'&&opts.requestKey!==false))throw Error('Save records from a person\'s own click, edit or form');
   if(!Array.isArray(v?.changes)||!v.changes.length||v.changes.length>50)throw Error('changes: between 1 and 50');
   if(opts.failSave)throw Error(opts.failSave);saves.push(...v.changes);return {status:'saving',count:v.changes.length};}
  if(name==='records.propose')throw Error('records.propose is not part of the v2 contract');
  if(name==='undo.list'){undo.push('list');return {actions:opts.undo??[]};}
  if(name==='undo.run'){undo.push(v);return {status:'undone'};}
  if(name==='layout.propose'){layouts.push(v);return {status:'proposed'};}
  if(name==='documents.list'){if(pending(name,v))return {pending:true};return {documents:demo.documents,total:demo.documents.length,complete:true};}
  if(name==='integrations.list')return {integrations:[]};
  if(name.startsWith('exchange.')){
   if(pending(name,v))return {pending:true};
   if(opts.saved===false)throw Error('Save the app to use external exchanges');
   if(name==='exchange.listQuestions')return {questions:X.questions.filter((q:any)=>!v.groupId||q.groupId===v.groupId),published:X.published,nextOffset:null};
   if(!READS.includes(name)){if(!['click','submit'].includes(event.kind))throw Error('Request exchange changes from an explicit app control');if(xwrites.length)throw Error('One exchange change per action');xwrites.push({name,value:v});
    if(opts.quiet?.includes(name))return {status:'saved',kind:name,...(name==='exchange.invite'?{exchanges:v.recipients.map(()=>({id:randomUUID()}))}:{})};
    return {status:'review_required',kind:name,message:'TrialAgents shows this change for review; a person confirms it.'};}
   if(name==='exchange.list')return {groups:X.groups.filter((g:any)=>(!v.groupId||g.id===v.groupId)&&(!v.appRef||g.appRef===v.appRef)),nextOffset:null};
   if(name==='exchange.status'){for(const g of X.groups)for(const e of g.exchanges)if(e.id===v.exchangeId)return {exchangeId:e.id,recordId:e.recordId,status:e.status};throw Error('not found');}
   if(name==='exchange.listSubmissions')return {submissions:X.submissions.filter((s:any)=>s.groupId===v.groupId||s.exchangeId===v.exchangeId),nextOffset:null};
   if(name==='exchange.listMessages')return {messages:X.messages.filter((m:any)=>!v.groupId||m.groupId===v.groupId).slice().reverse(),nextOffset:null};
   if(name==='exchange.listEmails')return {emails:X.emails.filter((m:any)=>m.groupId===v.groupId),nextOffset:null};
   if(name==='exchange.prepareEmail')return {batchId:randomUUID(),digest:'d'.repeat(64),from:'Example Therapeutics at TrialAgents <no-reply@trialagents.com>',replyTo:'owner@example.invalid',emailType:v.emailType,scheduledAt:v.scheduleAt??null,recipients:(v.exchangeIds??[]).map((id:string)=>({exchangeId:id,to:'x@example.invalid',subject:v.subject??'S',text:(v.overrides?.[id]?.body??v.body??'B')+'\n\nhttps://platform.trialagents.com/exchange#TOKEN',personalised:!!v.overrides?.[id]}))};
   return {notifications:[]};
  }
  if(name==='records.readMany'){if(!Array.isArray(v.reads)||v.reads.length>12)throw Error('readMany: at most 12 reads');if(v.reads.some((r:any)=>pending('records.read',r)))return {pending:true,results:v.reads.map((r:any)=>({pending:true,rows:[],total:null,limit:r.limit,offset:r.offset}))};return {results:v.reads.map(readOne)};}
  if(name!=='records.read')throw Error('Unexpected capability '+name);
  return readOne(v);
 });
 return {output,saves,calls,xwrites,layouts,undo,html:output.html as string,state:output.state,notice:output.notice as any};
}
/* A direct save as the platform applies it: version checks, then the screen is made again from the saved data (event open). */
export function apply(rows:Row[],changes:any[]){for(const c of changes){if(c.kind==='create_record')rows.push({id:randomUUID(),version:0,role:c.typeId,data:c.data});else{const i=rows.findIndex(x=>x.id===c.recordId);const r=rows[i]!;if(r.version!==c.expectedVersion)throw Error('stale version');if(c.kind==='archive_record'){rows.splice(i,1);continue;}r.data={...r.data,...c.data};r.version++;}}}
export const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ');
