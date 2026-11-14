import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execute} from '../../src/foundation/runtime.js';
import {appTemplates} from '../../src/workspace/app-templates.js';

/* Partnerships 2.0.0 unit harness: the catalog entry prepared exactly as AppTemplates.operation prepends configuration, executed in
 * production QuickJS. Records are the fictional demo set (as of 14 Nov 2026); documents and integrations use the platform response shapes. */
export const entry=await appTemplates.read({templateId:'life.partnership-tracker',version:'2.0.0'});
export const root='templates/source/partnership-tracker/';
export const schema=JSON.parse(await readFile(root+'schema.example.json','utf8'));
export const demo=JSON.parse(await readFile(root+'demo_data.json','utf8'));
export const roles=Object.keys(schema);
export const fullMap=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:(schema[r].readOnly?[]:Object.keys(schema[r].logicalFields))}]));
export const fullBindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
export const cfgFor=(map:any=fullMap,extra:any={})=>({...entry.defaults,tableMap:JSON.stringify(map),asOfOverride:demo.asOf,...extra});
export const source=(config:any=cfgFor(),b:any[]=fullBindings)=>`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(b)};\n${entry.source}`;
export type Row={id:string,version:number,role:string,data:any};
export const fresh=():Row[]=>structuredClone(demo.records);
/** Map without the given roles (an app installed without Contracts or Data Room). */
export const without=(...drop:string[])=>Object.fromEntries(Object.entries(fullMap).filter(([r])=>!drop.includes(r)));
export async function render(rows:Row[],state:any={},event:any={kind:'open',action:''},opts:any={}){
 const changes:any[]=[],calls:string[]=[];
 const output:any=await execute(source(opts.config,opts.bindings),{saved:opts.saved??true,writable:opts.writable??true,state,event:{value:null,form:{},...event}},async(name,v:any)=>{
  calls.push(name);
  if(name==='records.propose'){if(opts.failPropose)throw Error('denied');changes.push(...v);return {status:'proposed'};}
  if(name==='documents.list')return opts.documents===false?{unavailable:true}:{documents:demo.documents,total:demo.documents.length,complete:true};
  if(name==='integrations.list')return {integrations:opts.integrations??[]};
  if(name!=='records.read')throw Error('Unexpected capability '+name);
  if(opts.read)return opts.read(v,rows);
  const all=rows.filter(r=>r.role===v.typeId).map(r=>({id:r.id,version:r.version,data:r.data}));
  return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};
 });return {output,changes,calls,html:output.html as string,state:output.state};
}
export function approve(rows:Row[],changes:any[]){for(const c of changes){if(c.kind==='create_record')rows.push({id:randomUUID(),version:0,role:c.typeId,data:c.data});else{const r=rows.find(x=>x.id===c.recordId)!;if(r.version!==c.expectedVersion)throw Error('stale version');r.data={...r.data,...c.data};r.version++;}}}
export const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ');
/** A small session: carries state like the host frame and applies approved proposals to the rows. */
export function session(rows:Row[],opts:any={}){let state:any={};const s:any={html:'',changes:[] as any[],
 async ev(event:any){const out=await render(rows,state,event,opts);state=out.state;s.html=out.html;s.changes=out.changes;s.state=state;return out;},
 open:(st:any={})=>{state={...state,...st};return s.ev({kind:'open',action:''});},
 click:(action:string)=>s.ev({kind:'click',action}),change:(action:string,value:any)=>s.ev({kind:'change',action,value}),submit:(action:string,form:any={})=>s.ev({kind:'submit',action,form}),
 async approve(){if(!s.changes.length)throw Error('No proposal: '+(state.notice??''));approve(rows,s.changes);s.changes=[];return s.ev({kind:'open',action:''});}};return s;}
export const id=(role:string,pred:(d:any)=>boolean)=>(demo.records as Row[]).find(r=>r.role===role&&pred(r.data))!.id;

/** The documented schema created through reviewed writes, the fictional demo records saved with real receipt IDs substituted into every
 * reference (including IDs inside JSON and comma lists), then the catalog app prepared with a manifest (as of 14 Nov 2026). */
export async function partnershipsFixture(){
 const {PGlite}=await import('@electric-sql/pglite');const {readdir}=await import('node:fs/promises');
 const {WorkspaceFoundation}=await import('../../src/workspace/service.js');const {Service}=await import('../../src/domain/service.js');
 const {manifestFieldId}=await import('../../src/workspace/template-catalog.js');
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:any={query:(q:string,v:any)=>pg.query(q,v),transaction:(fn:any)=>pg.transaction((tx:any)=>fn(tx)),close:()=>pg.close()};
 const actor:any={userId:randomUUID(),origin:'human'};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'anna@northwind.invalid','Partnerships fixture']);
 const f=new WorkspaceFoundation(db),s=new Service(db),w=await s.createWorkspace(actor,'Partnerships fixture');
 const save=async(op:any)=>{const p=await s.preview(actor,w.id,op);return s.commit(actor,p.id,p.digest);};
 const map:any={},bindings:any[]=[],fields:any[]=[];
 for(const [role,def] of Object.entries(schema) as [string,any][]){const typeId=(await save({kind:'create_type',name:def.name,fields:def.fields})).objects[0].id,ro=!!def.readOnly;
  map[role]={typeId,fields:def.logicalFields,writableFields:ro?[]:Object.keys(def.logicalFields)};bindings.push({typeId,fields:def.fields.map((x:any)=>x.key)});
  fields.push(...def.fields.map((x:any)=>({id:manifestFieldId(role,x.key),typeId,field:x.key,schemaVersion:0,kind:x.kind,mode:ro?'read':'write'})));}
 const ids:Record<string,string>={},swap=(v:string)=>v.replace(/0{8}-0{4}-4000-8000-\d{12}/g,m=>ids[m]??m);
 for(const r of demo.records as Row[]){const data=Object.fromEntries(Object.entries(r.data).filter(([,v])=>v!==null).map(([k,v])=>[k,typeof v==='string'?swap(v):v]));
  ids[r.id]=(await save({kind:'create_record',typeId:map[r.role].typeId,data})).objects[0].id;}
 // Two fictional platform documents (non-confidential materials), saved through the reviewed file path.
 const docs:string[]=[];for(const name of ['NWB-101 non-confidential deck.pdf','NWB-202 one-pager.pdf']){const p=await s.previewFile(actor,w.id,{filename:name,mime:'application/pdf',bytes:Buffer.from('%PDF fictional '+name),ai:false});docs.push((await s.commit(actor,p.id,p.digest)).objects[0].versionId);}
 const op=await appTemplates.operation(f,actor,w.id,{templateId:entry.id,version:entry.version,digest:entry.digest,name:'Partnerships',configuration:{tableMap:JSON.stringify(map),asOfOverride:demo.asOf},bindings,manifest:{version:1,scope:'workspace',fields}} as any);
 const p=await f.preview(actor,w.id,op),receipt=await f.confirm(actor,w.id,p.id,p.digest),component=(await f.readComponent(actor,w.id,receipt.id)).component;
 return {pg,db,actor,f,s,w,component,map,ids,docs};
}
