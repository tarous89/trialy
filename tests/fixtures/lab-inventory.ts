import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execute} from '../../src/foundation/runtime.js';
import {appTemplates} from '../../src/workspace/app-templates.js';

/* Lab Inventory 2.0.0 unit harness: the catalog entry prepared exactly as AppTemplates.operation prepends configuration, executed in
 * production QuickJS. Records are the fictional demo set (as of 14 Nov 2026). */
const read=await appTemplates.read({templateId:'life.inventory-management',version:'2.0.0'});
export const entry={...read,source:read.source as string};
export const schema=JSON.parse(await readFile('templates/source/inventory-management/schema.example.json','utf8'));
export const demo=JSON.parse(await readFile('templates/source/inventory-management/demo_data.json','utf8'));
export const roles=Object.keys(schema);
export const fullMap=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:schema[r].readOnly?[]:Object.keys(schema[r].logicalFields)}]));
export const fullBindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
export const cfgFor=(map:any=fullMap,extra:any={})=>({...entry.defaults,tableMap:JSON.stringify(map),asOfOverride:'2026-11-14',...extra});
export const source=(config:any=cfgFor(),b:any[]=fullBindings)=>`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(b)};\n${entry.source}`;
export type Row={id:string,version:number,role:string,data:any};
export const fresh=():Row[]=>structuredClone(demo.records);
export async function render(rows:Row[],state:any={},event:any={kind:'open',action:''},opts:any={}){
 const changes:any[]=[],calls:string[]=[];
 const output:any=await execute(source(opts.config,opts.bindings),{saved:opts.saved??true,writable:opts.writable??true,state,event:{value:null,form:{},...event},...(opts.route?{route:opts.route}:{})},async(name,v:any)=>{
  calls.push(name);
  if(name==='records.propose'){if(opts.failPropose)throw Error('denied');changes.push(...v);return {status:'proposed'};}
  if(name!=='records.read')throw Error('Unexpected capability '+name);
  if(opts.read)return opts.read(v,rows);
  let all=rows.filter(r=>r.role===v.typeId).map(r=>({id:r.id,version:r.version,data:r.data}));
  if(v.sort){const k=v.sort.field,d=v.sort.direction==='desc'?-1:1;all=all.sort((a,b)=>String(a.data[k]??'').localeCompare(String(b.data[k]??''))*d);}
  return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};
 });return {output,changes,calls,html:output.html as string,state:output.state};
}
export function approve(rows:Row[],changes:any[]){const ids:string[]=[];for(const c of changes){if(c.kind==='create_record'){const id=randomUUID();ids.push(id);rows.push({id,version:0,role:c.typeId,data:c.data});}else{const r=rows.find(x=>x.id===c.recordId)!;if(r.version!==c.expectedVersion)throw Error('stale version');r.data={...r.data,...c.data};r.version++;ids.push(r.id);}}return ids;}
/* A small session: one event per call, state carried over like the host frame does; approve() applies the last proposal. */
export function session(rows:Row[],opts:any={}){let state:any={},last:any=null;const s={
 get state(){return state;},get last(){return last;},get html(){return last?.html??'';},
 async ev(event:any){last=await render(rows,state,event,opts);state=last.state;return last;},
 open:(st:any={})=>{state={...state,...st};return s.ev({kind:'open',action:''});},
 click:(action:string)=>s.ev({kind:'click',action}),
 change:(action:string,value:any)=>s.ev({kind:'change',action,value}),
 submit:(action:string,form:any={},value:any=null)=>s.ev({kind:'submit',action,form,value}),
 approve(){if(!last?.changes.length)throw Error('No proposal: '+(last?.state?.notice??''));const ids=approve(rows,last.changes);return ids;}};return s;}
export const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ');
export const byRole=(rows:Row[],role:string)=>rows.filter(r=>r.role===role);

/* ---------- integration: disposable database, real catalog, Add app step, reviewed writes, MCP assistants ---------- */
export async function labSuite(){
 const {PGlite}=await import('@electric-sql/pglite');
 const {WorkspaceFoundation}=await import('../../src/workspace/service.js');const {Service}=await import('../../src/domain/service.js');
 const {AppTemplates}=await import('../../src/workspace/app-templates.js');const {syncTemplateCatalog,installCatalogApp}=await import('../../src/workspace/template-catalog.js');
 const {dataAccessStep,confirmDataAccess}=await import('../../src/workspace/data-access.js');
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:any={query:(q:string,v:any)=>pg.query(q,v),transaction:(fn:any)=>pg.transaction((tx:any)=>fn(tx)),close:()=>pg.close()};
 const actor:any={userId:randomUUID(),origin:'human'};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'lab@example.invalid','Mia Novak (fictional)']);
 const f=new WorkspaceFoundation(db),s=new Service(db);
 await syncTemplateCatalog(db);
 // Lab Inventory 2.0.0 is a draft in the repository catalog; it is approved only inside this disposable database.
 await pg.query("UPDATE app_template_catalog SET status='approved' WHERE (template_id='life.inventory-management' AND version='2.0.0') OR (template_id='life.contracts' AND version='1.0.0')");
 const catalog=new AppTemplates(undefined,db);
 const T={lab:await catalog.read({templateId:'life.inventory-management',version:'2.0.0'}),contracts:await catalog.read({templateId:'life.contracts',version:'1.0.0'}),programs:await catalog.read({templateId:'life.project-oversight',version:'2.1.0'})};
 const install=async(w:string,t:any,name:string,connections:Record<string,string>={},extra:any={})=>{const target={install:{templateId:t.id,version:t.version,digest:t.digest,name,requestKey:randomUUID(),...extra}};const step=await dataAccessStep(f,actor,w,target);
  return {step,receipt:step.needed?await confirmDataAccess(f,actor,w,{...target,connections,stepDigest:step.digest}):await installCatalogApp(f,actor,w,target.install)};};
 const comp=async(w:string,id:string)=>(await f.readComponent(actor,w,id)).component;
 const mapOf=(c:any)=>JSON.parse(JSON.parse(/^const templateConfiguration=(.+);\n/.exec(c.source)![1]).tableMap);
 const rows=async(typeId:string)=>(await pg.query<any>("SELECT id,version,data FROM records WHERE type_id=$1 AND state<>'archived' ORDER BY created_at,id",[typeId])).rows;
 const save=async(w:string,typeId:string,data:any)=>{const p=await s.preview(actor,w,{kind:'create_record',typeId,data});return (await s.commit(actor,p.id,p.digest)).objects[0].id as string;};
 const version=async(id:string)=>(await pg.query<any>('SELECT version FROM workspace_components WHERE id=$1',[id])).rows[0].version as number;
 const tables=async(w:string)=>(await pg.query<any>('SELECT count(*)::int n FROM entity_types WHERE workspace_id=$1 AND deleted_at IS NULL',[w])).rows[0].n as number;
 /* The app as a person (or an assistant principal) uses it: one event per call, state carried over like the host frame does. */
 const app=(w:string,id:string,who:any=actor,route?:any)=>{let state:any={};const view:any={state:()=>state,html:'',last:null as any,
  async ev(event:any){const c=await comp(w,id);const out:any=await f.runFrontend(who,w,{componentId:c.id,expectedVersion:c.version,state,event:{value:null,form:{},...event},...(route?{route}:{})});state=out.state;view.html=out.html;view.last=out;return out;},
  open:(st:any={})=>{state={...state,...st};return view.ev({kind:'open',action:''});},
  click:(action:string)=>view.ev({kind:'click',action}),change:(action:string,value:any)=>view.ev({kind:'change',action,value}),
  submit:(action:string,form:any={},value:any=null)=>view.ev({kind:'submit',action,form,value}),
  async approve(out:any=view.last,who2:any=actor){if(!out?.proposal)throw Error('No proposal: '+(out?.state?.notice??''));const r=await f.confirm(who2,w,out.proposal.id,out.proposal.digest);await view.ev({kind:'open',action:''});return r;}};return view;};
 /** The real MCP endpoints, one per assistant principal: /claude (Claude host) and /mcp (ChatGPT host). */
 async function assistants(){
  const {default:express}=await import('express');const {addMcp}=await import('../../src/server/mcp.js');
  const ex=express();ex.use(express.json({limit:'10mb'}));
  addMcp(ex,s,(req:any,_res:any,next:any)=>{req.actor={userId:actor.userId,origin:'ai',assistant:'claude'};next();},{path:'/claude',host:'claude'} as any);
  addMcp(ex,s,(req:any,_res:any,next:any)=>{req.actor={userId:actor.userId,origin:'ai'};next();},{path:'/mcp',host:'chatgpt'} as any);
  const {default:request}=await import('supertest');let n=0;
  return (path:'/claude'|'/mcp')=>async(name:string,args:any)=>{const r=await request(ex).post(path).set('Authorization','Bearer test-principal').set('Accept','application/json, text/event-stream').send({jsonrpc:'2.0',id:++n,method:'tools/call',params:{name,arguments:args}});
   const body=r.body&&Object.keys(r.body).length?r.body:JSON.parse(String(r.text).split('\n').find(l=>l.startsWith('data:'))?.slice(5)??'{}');const result=body.result;if(!result)throw Error('MCP error '+r.status+' '+String(r.text).slice(0,500));
   if(result.isError)throw Error(result.content?.map((c:any)=>c.text).join(' ')||'tool error');return result.structuredContent?.result??JSON.parse(result.content[0].text);};
 }
 return {pg,db,actor,f,s,T,install,comp,mapOf,rows,save,version,tables,app,assistants};
}

/** The documented schema created through reviewed writes, the fictional demo records saved with real receipt IDs substituted into every
 * relationship, then the catalog app prepared with a manifest (as of 14 Nov 2026), as the browser test uses it. */
export async function labFixture(){
 const {PGlite}=await import('@electric-sql/pglite');
 const {WorkspaceFoundation}=await import('../../src/workspace/service.js');const {Service}=await import('../../src/domain/service.js');
 const {manifestFieldId}=await import('../../src/workspace/template-catalog.js');
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:any={query:(q:string,v:any)=>pg.query(q,v),transaction:(fn:any)=>pg.transaction((tx:any)=>fn(tx)),close:()=>pg.close()};
 const actor:any={userId:randomUUID(),origin:'human'};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'lab@example.invalid','Lab Inventory fixture']);
 const f=new WorkspaceFoundation(db),s=new Service(db),w=await s.createWorkspace(actor,'Lab Inventory fixture');
 const save=async(op:any)=>{const p=await s.preview(actor,w.id,op);return s.commit(actor,p.id,p.digest);};
 const map:any={},bindings:any[]=[],fields:any[]=[];
 for(const [role,def] of Object.entries(schema) as [string,any][]){const id=(await save({kind:'create_type',name:def.name,fields:def.fields})).objects[0].id;
  map[role]={typeId:id,fields:def.logicalFields,writableFields:def.readOnly?[]:Object.keys(def.logicalFields)};bindings.push({typeId:id,fields:def.fields.map((x:any)=>x.key)});
  fields.push(...def.fields.map((x:any)=>({id:manifestFieldId(role,x.key),typeId:id,field:x.key,schemaVersion:0,kind:x.kind,mode:def.readOnly?'read':'write'})));}
 const ids:Record<string,string>={},order=['organizations','programs','agreements','labinventory.settings','labinventory.categories','labinventory.locations','labinventory.items','labinventory.requests','labinventory.orders','labinventory.lots','labinventory.movements'];
 const sub=(v:any)=>typeof v==='string'&&ids[v]?ids[v]:typeof v==='string'&&v.includes(',')&&v.split(',').every(x=>ids[x])?v.split(',').map(x=>ids[x]).join(','):v;
 const deferred:any[]=[];
 for(const role of order)for(const r of (demo.records as Row[]).filter(x=>x.role===role)){
  // Locations refer to earlier locations; requests and orders refer to each other (order_id is set after both exist).
  const data=Object.fromEntries(Object.entries(r.data).filter(([k,v])=>v!==null&&!(role==='labinventory.requests'&&k==='order_id')&&!(role==='labinventory.settings'&&k==='program_approvers')).map(([k,v])=>[k,sub(v)]));
  ids[r.id]=(await save({kind:'create_record',typeId:map[role].typeId,data})).objects[0].id;
  if(role==='labinventory.requests'&&r.data.order_id)deferred.push([ids[r.id],r.data.order_id]);}
 for(const [rid,oid] of deferred)await save({kind:'update_record',recordId:rid,expectedVersion:0,data:{order_id:ids[oid]}});
 const op=await appTemplates.operation(f,actor,w.id,{templateId:entry.id,version:entry.version,digest:entry.digest,name:'Lab Inventory',configuration:{tableMap:JSON.stringify(map),asOfOverride:'2026-11-14'},bindings,manifest:{version:1,scope:'workspace',fields}} as any);
 const p=await f.preview(actor,w.id,op),receipt=await f.confirm(actor,w.id,p.id,p.digest),component=(await f.readComponent(actor,w.id,receipt.id)).component;
 return {pg,db,actor,f,s,w,component,map,ids};
}
