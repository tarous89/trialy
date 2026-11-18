import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execute} from '../../src/foundation/runtime.js';
import {appTemplates} from '../../src/workspace/app-templates.js';

/* Investor Updates 1.0.0 unit harness: the catalog entry prepared exactly as AppTemplates.operation prepends configuration, executed in
 * production QuickJS. Records are the fictional demo set (as of 15 Nov 2026). Exchange reads and writes use the platform response shapes
 * (status saved for preparation, review_required for sends), and record the calls so tests can assert what the app asked for. */
export const entry=await appTemplates.read({templateId:'life.investor-updates',version:'1.0.1'});
export const root='templates/source/investor-updates/';
export const schema=JSON.parse(await readFile(root+'schema.example.json','utf8'));
export const demo=JSON.parse(await readFile(root+'demo_data.json','utf8'));
export const roles=Object.keys(schema);
export const fullMap=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:Object.keys(schema[r].logicalFields)}]));
export const fullBindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
export const cfgFor=(map:any=fullMap,extra:any={})=>({...entry.defaults,tableMap:JSON.stringify(map),asOfOverride:demo.asOf,companyName:demo.companyName,...extra});
export const source=(config:any=cfgFor(),b:any[]=fullBindings)=>`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(b)};\n${entry.source}`;
export type Row={id:string,version:number,role:string,data:any};
export const fresh=():Row[]=>structuredClone(demo.records);
export const without=(...drop:string[])=>Object.fromEntries(Object.entries(fullMap).filter(([r])=>!drop.includes(r)));
/** A fake exchange: groups by appRef, links per delivery record, prepared batches; it never sends anything. */
export function fakeExchange(){const x:any={groups:[] as any[],calls:[] as any[],unsubscribes:{} as Record<string,string[]>,emails:{} as Record<string,any[]>};
 x.handle=(name:string,v:any)=>{x.calls.push({name,v});
  if(name==='exchange.series')return {series:v.series,updates:[],unsubscribes:(x.unsubscribes[v.series]??[]).map((email:string)=>({email}))};
  if(name==='exchange.list')return {groups:x.groups.filter((g:any)=>!v.appRef||g.appRef===v.appRef),nextOffset:null};
  if(name==='exchange.listEmails')return {emails:x.emails[v.groupId]??[]};
  if(name==='exchange.createGroup'){const g={id:randomUUID(),appRef:v.appRef,config:v,exchanges:[] as any[]};x.groups.push(g);return {status:'saved',groupId:g.id,group:{id:g.id}};}
  if(name==='exchange.invite'){const g=x.groups.find((g:any)=>g.id===v.groupId);const ex=v.recipients.map((r:any)=>({id:randomUUID(),recordId:r.recordId,emails:r.emails}));g.exchanges.push(...ex);return {status:'saved',exchanges:ex};}
  if(name==='exchange.prepareEmail'){const g=x.groups.find((g:any)=>g.id===v.groupId);const un=new Set(x.unsubscribes[g.config.series]??[]);const ex=g.exchanges.filter((e:any)=>!v.exchangeIds||v.exchangeIds.includes(e.id));
   return {batchId:randomUUID(),digest:'d'.repeat(64),from:'Northwind Bio (fictional) at TrialAgents <no-reply@trialagents.com>',replyTo:'anna@northwind.invalid',excluded:ex.filter((e:any)=>un.has(e.emails[0])).map((e:any)=>({to:e.emails[0],reason:'unsubscribed'})),recipients:ex.filter((e:any)=>!un.has(e.emails[0])).map((e:any)=>({exchangeId:e.id,to:e.emails[0],subject:v.subject,text:v.body+'\n\n[content]\n\nView online: [personal link]',html:'<html>'+g.config.content.html+'</html>',clientChecks:{gmail:[],outlook:[],appleMail:[],text:[]}}))};}
  if(['exchange.sendEmail','exchange.reply','exchange.replyAll','exchange.publishClarification','exchange.updateContent'].includes(name))return {status:'review_required',kind:name};
  throw Error('Unexpected exchange capability '+name);};
 return x;}
export async function render(rows:Row[],state:any={},event:any={kind:'open',action:''},opts:any={}){
 const changes:any[]=[],calls:string[]=[],layouts:any[]=[];const xc=opts.exchange??fakeExchange();
 const output:any=await execute(source(opts.config,opts.bindings),{saved:opts.saved??true,writable:opts.writable??true,state,event:{value:null,form:{},...event}},async(name,v:any)=>{
  calls.push(name);
  if(name==='records.propose'){if(opts.failPropose)throw Error('denied');changes.push(...v);return {status:'proposed'};}
  if(name==='documents.list')return opts.documents===false?{unavailable:true}:{documents:opts.docs??demo.documents,total:(opts.docs??demo.documents).length,complete:true};
  if(name==='layout.propose'){layouts.push(v);return {status:'proposed'};}
  if(name.startsWith('exchange.'))return xc.handle(name,v);
  if(name!=='records.read')throw Error('Unexpected capability '+name);
  if(opts.read)return opts.read(v,rows);
  const all=rows.filter(r=>r.role===v.typeId).map(r=>({id:r.id,version:r.version,data:r.data}));
  return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};
 });return {output,changes,calls,layouts,exchange:xc,html:output.html as string,state:output.state};
}
export function approve(rows:Row[],changes:any[]){for(const c of changes){if(c.kind==='create_record')rows.push({id:randomUUID(),version:0,role:c.typeId,data:c.data});else{const r=rows.find(x=>x.id===c.recordId)!;if(r.version!==c.expectedVersion)throw Error('stale version');r.data={...r.data,...c.data};r.version++;}}}
export const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ');
/** A small session: carries state like the host frame and applies approved proposals to the rows. */
export function session(rows:Row[],opts:any={}){let state:any={};const xc=opts.exchange??fakeExchange();const s:any={html:'',changes:[] as any[],exchange:xc,
 async ev(event:any){const out=await render(rows,state,event,{...opts,exchange:xc});state=out.state;s.html=out.html;s.changes=out.changes;s.state=state;s.calls=out.calls;return out;},
 open:(st:any={})=>{state={...state,...st};return s.ev({kind:'open',action:''});},
 click:(action:string,form:any={})=>s.ev({kind:'click',action,form}),change:(action:string,value:any)=>s.ev({kind:'change',action,value}),submit:(action:string,form:any={})=>s.ev({kind:'submit',action,form}),
 async approve(){if(!s.changes.length)throw Error('No proposal: '+(state.notice??''));approve(rows,s.changes);s.changes=[];return s.ev({kind:'open',action:''});}};return s;}
/** Runs one app command the way run_app_command does: no state, {kind:'command', action:id, value:JSON input}. */
export const command=async(rows:Row[],cid:string,input:any={},opts:any={})=>{const r=await render(rows,null,{kind:'command',action:cid,value:JSON.stringify(input),form:{}},opts);return {...r.state.command,changes:r.changes,layouts:r.layouts,html:r.html,calls:r.calls};};
export const id=(role:string,pred:(d:any)=>boolean)=>(demo.records as Row[]).find(r=>r.role===role&&pred(r.data))!.id;

/** The documented schema created through reviewed writes, the fictional demo records saved with real receipt IDs substituted into every
 * reference (including IDs inside JSON lists), then the catalog app prepared with a manifest (as of 15 Nov 2026). Tracked delivery and
 * response facts are left out: TrialAgents writes those only from exchange activity. */
export async function investorUpdatesFixture(){
 const {PGlite}=await import('@electric-sql/pglite');const {readdir}=await import('node:fs/promises');
 const {WorkspaceFoundation}=await import('../../src/workspace/service.js');const {Service}=await import('../../src/domain/service.js');
 const {manifestFieldId}=await import('../../src/workspace/template-catalog.js');
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:any={query:(q:string,v:any)=>pg.query(q,v),transaction:(fn:any)=>pg.transaction((tx:any)=>fn(tx)),close:()=>pg.close()};
 const actor:any={userId:randomUUID(),origin:'human'};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'anna@northwind.invalid','Investor Updates fixture']);
 const f=new WorkspaceFoundation(db),s=new Service(db),w=await s.createWorkspace(actor,'Investor Updates fixture');
 const save=async(op:any)=>{const p=await s.preview(actor,w.id,op);return s.commit(actor,p.id,p.digest);};
 const map:any={},bindings:any[]=[],fields:any[]=[];
 for(const [role,def] of Object.entries(schema) as [string,any][]){const typeId=(await save({kind:'create_type',name:def.name,fields:def.fields})).objects[0].id;
  map[role]={typeId,fields:def.logicalFields,writableFields:Object.keys(def.logicalFields)};bindings.push({typeId,fields:def.fields.map((x:any)=>x.key)});
  fields.push(...def.fields.map((x:any)=>({id:manifestFieldId(role,x.key),typeId,field:x.key,schemaVersion:0,kind:x.kind,mode:'write'})));}
 const ids:Record<string,string>={},swap=(v:string)=>v.replace(/0{8}-0{4}-4000-8000-\d{12}/g,m=>ids[m]??m);
 for(const r of demo.records as Row[]){const data=Object.fromEntries(Object.entries(r.data).filter(([,v])=>v!==null).map(([k,v])=>[k,typeof v==='string'?swap(v):v]));
  ids[r.id]=(await save({kind:'create_record',typeId:map[r.role].typeId,data})).objects[0].id;}
 const op=await appTemplates.operation(f,actor,w.id,{templateId:entry.id,version:entry.version,digest:entry.digest,name:'Investor Updates',configuration:{tableMap:JSON.stringify(map),asOfOverride:demo.asOf,companyName:demo.companyName},bindings,manifest:{version:1,scope:'workspace',fields}} as any);
 const p=await f.preview(actor,w.id,op),receipt=await f.confirm(actor,w.id,p.id,p.digest),component=(await f.readComponent(actor,w.id,receipt.id)).component;
 return {pg,db,actor,f,s,w,component,map,ids};
}
