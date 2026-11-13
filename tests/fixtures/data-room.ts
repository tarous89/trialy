import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execute} from '../../src/foundation/runtime.js';
import {appTemplates} from '../../src/workspace/app-templates.js';

/* Data Room 1.0.0 unit harness: the catalog entry prepared exactly as AppTemplates.operation prepends configuration, executed in
 * production QuickJS. Records are the fictional demo set; the exchange is a mock with the platform's response shapes (fictional state). */
export const entry=await appTemplates.read({templateId:'life.data-room',version:'1.0.0'});
export const schema=JSON.parse(await readFile('templates/source/data-room/schema.example.json','utf8'));
export const demo=JSON.parse(await readFile('templates/source/data-room/demo_data.json','utf8'));
export const roles=Object.keys(schema);
export const fullMap=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:Object.keys(schema[r].logicalFields)}]));
export const fullBindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
export const cfgFor=(map:any=fullMap,extra:any={})=>({...entry.defaults,tableMap:JSON.stringify(map),asOfOverride:'2026-11-13',...extra});
export const source=(config:any=cfgFor(),b:any[]=fullBindings)=>`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(b)};\n${entry.source}`;
export type Row={id:string,version:number,role:string,data:any};
export const fresh=():Row[]=>structuredClone(demo.records);
export const freshExchange=()=>structuredClone(demo.exchange);
const READS=['exchange.list','exchange.status','exchange.listSubmissions','exchange.listMessages','exchange.listQuestions','exchange.defaultEmail','exchange.prepareEmail','exchange.listEmails','exchange.notifications'];
export async function render(rows:Row[],state:any={},event:any={kind:'open',action:''},opts:any={}){
 const changes:any[]=[],calls:string[]=[],xwrites:any[]=[],X=opts.exchange=opts.exchange??freshExchange();
 const output:any=await execute(source(opts.config,opts.bindings),{saved:opts.saved??true,writable:opts.writable??true,state,event},async(name,v:any)=>{
  calls.push(name);
  if(name==='records.propose'){if(opts.failPropose)throw Error('denied');changes.push(...v);return {status:'proposed'};}
  if(name==='documents.list')return {documents:demo.documents,total:demo.documents.length,complete:true};
  if(name==='integrations.list')return {integrations:opts.integrations??[]};
  if(name==='exchange.listQuestions')return {questions:(opts.exchange??freshExchange()).questions.filter((q:any)=>!v.groupId||q.groupId===v.groupId),published:(opts.exchange??freshExchange()).published,nextOffset:null};
  if(name.startsWith('exchange.')){
   if(opts.saved===false)throw Error('Save the app to use external exchanges');
   if(!READS.includes(name)){if(!['click','submit'].includes(event.kind))throw Error('Request exchange changes from an explicit app control');if(xwrites.length)throw Error('One exchange change per action');xwrites.push({name,value:v});return {status:'review_required',kind:name,message:'TrialAgents shows this change for review; a person confirms it.'};}
   if(opts.exchangeFails)throw Error('exchange down');
   if(name==='exchange.list')return {groups:X.groups.filter((g:any)=>(!v.groupId||g.id===v.groupId)&&(!v.appRef||g.appRef===v.appRef)),nextOffset:null};
   if(name==='exchange.status'){for(const g of X.groups)for(const e of g.exchanges)if(e.id===v.exchangeId)return {exchangeId:e.id,recordId:e.recordId,status:e.status};throw Error('not found');}
   if(name==='exchange.listSubmissions')return {submissions:X.submissions.filter((s:any)=>s.groupId===v.groupId||s.exchangeId===v.exchangeId),nextOffset:null};
   if(name==='exchange.listMessages')return {messages:X.messages.filter((m:any)=>!v.groupId||m.groupId===v.groupId).slice().reverse(),nextOffset:null};
   if(name==='exchange.listEmails')return {emails:X.emails.filter((m:any)=>m.groupId===v.groupId),nextOffset:null};
   if(name==='exchange.defaultEmail')return {emailType:v.emailType,subject:'Platform subject',body:'Platform body {link}',source:opts.defaultSource??'app'};
   if(name==='exchange.prepareEmail')return opts.prepare?opts.prepare(v):{batchId:randomUUID(),digest:'d'.repeat(64),from:'Example Therapeutics at TrialAgents <no-reply@trialagents.com>',replyTo:'owner@example.invalid',emailType:v.emailType,scheduledAt:v.scheduleAt??null,defaultSource:'app',recipients:(v.exchangeIds??[]).map((id:string)=>({exchangeId:id,to:'x@example.invalid',recipientName:'X',subject:v.subject??'S',text:(v.overrides?.[id]?.body??v.body??'B')+'\n\nhttps://platform.trialagents.com/exchange#TOKEN',personalised:!!v.overrides?.[id]})),fixed:'The link, the sender identity and the footer are added by TrialAgents.'};
   return {notifications:[]};
  }
  if(name!=='records.read')throw Error('Unexpected capability '+name);
  if(opts.read)return opts.read(v,rows);
  const all=rows.filter(r=>r.role===v.typeId).map(r=>({id:r.id,version:r.version,data:r.data}));
  return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};
 });return {output,changes,calls,xwrites,html:output.html as string,state:output.state};
}
export function approve(rows:Row[],changes:any[]){for(const c of changes){if(c.kind==='create_record')rows.push({id:randomUUID(),version:0,role:c.typeId,data:c.data});else{const r=rows.find(x=>x.id===c.recordId)!;if(r.version!==c.expectedVersion)throw Error('stale version');r.data={...r.data,...c.data};r.version++;}}}
export const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ');

/* ---------- integration: disposable database, real catalog, installer, reviewed writes, exchange room and party pages ---------- */
export async function dataRoomSuite(){
 const {PGlite}=await import('@electric-sql/pglite');const {readdir}=await import('node:fs/promises');
 const {WorkspaceFoundation}=await import('../../src/workspace/service.js');const {Service}=await import('../../src/domain/service.js');
 const {AppTemplates}=await import('../../src/workspace/app-templates.js');const {syncTemplateCatalog,installCatalogApp}=await import('../../src/workspace/template-catalog.js');
 const {dataAccessStep,confirmDataAccess}=await import('../../src/workspace/data-access.js');
 const {baseApp,errors}=await import('../../src/server/app.js');const {addExternalExchange}=await import('../../src/server/external-exchange.js');
 const {listExchanges}=await import('../../src/domain/external-exchange.js');const {syncExchangeTracking:syncRoomTracking,runExchangeDigests:sendRoomDigests}=await import('../../src/domain/exchange-rooms.js');const {deliverExchangeEmails}=await import('../../src/app-services/exchange-email.js');
 const {default:request}=await import('supertest');
 process.env.EXCHANGE_EXPOSE_CODES='true';
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const db:any={query:(q:string,v:any)=>pg.query(q,v),transaction:(fn:any)=>pg.transaction((tx:any)=>fn(tx)),close:()=>pg.close()};
 // Supplier pages run under the platform's runtime role and row security, as in production (archived apps stop their links there).
 const {AsyncLocalStorage}=await import('node:async_hooks');const {setDatabaseContext}=await import('../../src/db/context.js');const storage=new AsyncLocalStorage<any>();
 const runtimeDb:any={query:async(q:string,v:any)=>storage.getStore()?.query(q,v)??runtimeDb.transaction((tx:any)=>tx.query(q,v)),transaction:async(fn:any)=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async(raw:any)=>{await raw.exec('SET LOCAL ROLE trialy_runtime');const tx={query:async(q:string,v:any)=>{await setDatabaseContext(raw);return raw.query(q,v);}};return storage.run(tx,()=>fn(tx));});},close:async()=>{}};
 const actor:any={userId:randomUUID(),origin:'human'},ai:any={...actor,origin:'ai'};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'owner@northwind.invalid','Robin Owner (fictional)']);
 const f=new WorkspaceFoundation(db),s=new Service(db);
 await syncTemplateCatalog(db);
 // Data Room 1.0.0 is a draft in the repository catalog; it is approved only inside this disposable database.
 await pg.query("UPDATE app_template_catalog SET status='approved' WHERE (template_id='life.data-room' AND version='1.0.0') OR (template_id='life.contracts' AND version='1.0.0')");
 const catalog=new AppTemplates(undefined,db);
 const T={room:await catalog.read({templateId:'life.data-room',version:'1.0.0'}),contracts:await catalog.read({templateId:'life.contracts',version:'1.0.0'}),programs:await catalog.read({templateId:'life.project-oversight',version:'2.1.0'})};
 const install=async(w:string,t:any,name:string,connections:Record<string,string>={})=>{const target={install:{templateId:t.id,version:t.version,digest:t.digest,name,requestKey:randomUUID()}};const step=await dataAccessStep(f,actor,w,target);
  return {step,receipt:step.needed?await confirmDataAccess(f,actor,w,{...target,connections,stepDigest:step.digest}):await installCatalogApp(f,actor,w,target.install)};};
 const comp=async(w:string,id:string)=>(await f.readComponent(actor,w,id)).component;
 const mapOf=(c:any)=>JSON.parse(JSON.parse(/^const templateConfiguration=(.+);\n/.exec(c.source)![1]).tableMap);
 /* The app as the person (or an assistant principal) uses it: one event per call, state carried over like the host frame does. */
 const app=(w:string,id:string,who:any=actor)=>{let state:any={};const view:any={state:()=>state,html:'',last:null as any,
  async ev(event:any){const c=await comp(w,id);const out:any=await f.runFrontend(who,w,{componentId:c.id,expectedVersion:c.version,state,event:{value:null,form:{},...event}});state=out.state;view.html=out.html;view.last=out;return out;},
  open:(st:any={})=>{state={...state,...st};return view.ev({kind:'open',action:''});},
  click:(action:string)=>view.ev({kind:'click',action}),
  change:(action:string,value:any)=>view.ev({kind:'change',action,value}),
  submit:(action:string,form:any={})=>view.ev({kind:'submit',action,form}),
  /* The trusted review: a person confirms exactly the proposal the host shows. */
  confirmations:0,
  async approve(out:any=view.last,who2:any=actor){if(!out?.proposal)throw Error('No proposal: '+(out?.state?.notice??''));const r=await f.confirm(who2,w,out.proposal.id,out.proposal.digest);view.confirmations++;await view.ev({kind:'open',action:''});return r;}};return view;};
 const rows=async(typeId:string)=>(await pg.query<any>("SELECT id,version,data FROM records WHERE type_id=$1 AND state<>'archived' ORDER BY created_at,id",[typeId])).rows;
 const save=async(w:string,typeId:string,data:any)=>{const p=await s.preview(actor,w,{kind:'create_record',typeId,data});return (await s.commit(actor,p.id,p.digest)).objects[0].id as string;};
 const doc=async(w:string,filename:string,body:string,aiReadable=false)=>{const p=await s.previewFile(actor,w,{filename,mime:'application/pdf',bytes:Buffer.from(body),ai:aiReadable});return (await s.commit(actor,p.id,p.digest)).objects[0].versionId as string;};
 const http=baseApp();addExternalExchange(http,new Service(runtimeDb));http.use(errors);
 /* A party on its own room page: verified by one-time code, as in the platform exchange tests. */
 const party=async(url:string,email:string)=>{const token=url.split('#')[1];const base=(session='')=>({get:(p='')=>request(http).get('/external-exchange'+p).set('x-trialy-exchange',token).set(session?{'x-trialy-exchange-session':session}:{}),post:(p:string,b:any)=>request(http).post('/external-exchange'+p).set('x-trialy-exchange',token).set(session?{'x-trialy-exchange-session':session}:{}).send(b)});
  let session='';const first=await base().get();if(first.body.verification?.required){const code=await base().post('/verify',{email});const ok=await base().post('/verify/confirm',{verificationId:code.body.verificationId,code:code.body.code});session=ok.body.session;}
  return base(session);};
 /* Links are read by the signed-in owner (as the platform's Collections page does), never by the app or an assistant. */
 const room=async(w:string,appRef:string):Promise<any>=>{const g=(await listExchanges(db,actor,w,{appRef})).groups[0];if(!g)throw Error('No room '+appRef);return g;};
 const links=async(w:string,appRef:string)=>Object.fromEntries((await room(w,appRef)).exchanges.map((e:any)=>[e.recordId,e.url]));
 const sent:any[]=[];const deliver=async()=>{while(await deliverExchangeEmails(db,async(payload:any,key:string)=>{sent.push(payload);return {id:'provider-'+key.slice(0,8)};}));};
 const version=async(id:string)=>(await pg.query<any>('SELECT version FROM workspace_components WHERE id=$1',[id])).rows[0].version as number;
 const track=()=>syncRoomTracking(db),digests=()=>sendRoomDigests(db);
 return {pg,db,actor,ai,f,s,T,install,comp,mapOf,app,rows,save,doc,party,room,links,sent,deliver,version,track,digests,runtimeDb};
}


/** The documented schema created through reviewed writes, the fictional demo records saved with real receipt IDs substituted into every
 * relationship, then the catalog app prepared with a manifest (as of 13 Nov 2026). Fictional exchange IDs are dropped: no room group exists yet. */
export async function dataRoomFixture(){
 const {PGlite}=await import('@electric-sql/pglite');const {readdir}=await import('node:fs/promises');
 const {WorkspaceFoundation}=await import('../../src/workspace/service.js');const {Service}=await import('../../src/domain/service.js');
 const {manifestFieldId}=await import('../../src/workspace/template-catalog.js');
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:any={query:(q:string,v:any)=>pg.query(q,v),transaction:(fn:any)=>pg.transaction((tx:any)=>fn(tx)),close:()=>pg.close()};
 const actor:any={userId:randomUUID(),origin:'human'};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'room@example.invalid','Data Room fixture']);
 const f=new WorkspaceFoundation(db),s=new Service(db),w=await s.createWorkspace(actor,'Data Room fixture');
 const save=async(op:any)=>{const p=await s.preview(actor,w.id,op);return s.commit(actor,p.id,p.digest);};
 const map:any={},bindings:any[]=[],fields:any[]=[];
 for(const [role,def] of Object.entries(schema) as [string,any][]){const id=(await save({kind:'create_type',name:def.name,fields:def.fields})).objects[0].id;
  map[role]={typeId:id,fields:def.logicalFields,writableFields:Object.keys(def.logicalFields)};bindings.push({typeId:id,fields:def.fields.map((x:any)=>x.key)});
  fields.push(...def.fields.map((x:any)=>({id:manifestFieldId(role,x.key),typeId:id,field:x.key,schemaVersion:0,kind:x.kind,mode:'write'})));}
 const ids:Record<string,string>={},drop=['exchange_group_id','exchange_id','message_id'];
 for(const r of demo.records as Row[]){const data=Object.fromEntries(Object.entries(r.data).filter(([k,v])=>v!==null&&!drop.includes(k)).map(([k,v])=>[k,typeof v==='string'&&ids[v]?ids[v]:(k==='level_ids'||k==='program_ids')&&typeof v==='string'?v.split(',').map(x=>ids[x.trim()]??x.trim()).join(','):v]));
  ids[r.id]=(await save({kind:'create_record',typeId:map[r.role].typeId,data})).objects[0].id;}
 const op=await appTemplates.operation(f,actor,w.id,{templateId:entry.id,version:entry.version,digest:entry.digest,name:'Data Room',configuration:{tableMap:JSON.stringify(map),asOfOverride:'2026-11-13'},bindings,manifest:{version:1,scope:'workspace',fields}} as any);
 const p=await f.preview(actor,w.id,op),receipt=await f.confirm(actor,w.id,p.id,p.digest),component=(await f.readComponent(actor,w.id,receipt.id)).component;
 return {pg,db,actor,f,s,w,component,map,ids};
}
