import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import express from 'express';
import {WorkspaceFoundation} from '../../src/workspace/service.js';
import {Service} from '../../src/domain/service.js';
import {AppTemplates} from '../../src/workspace/app-templates.js';
import {syncTemplateCatalog,installCatalogApp} from '../../src/workspace/template-catalog.js';
import {dataAccessStep,confirmDataAccess} from '../../src/workspace/data-access.js';
import type {Database,Connection} from '../../src/db/database.js';
import type {Actor} from '../../src/shared/schema.js';

/** A minimal multi-page PDF (Helvetica text only) for a fictional signed agreement: one array entry per page, one string per line. */
export function pdf(pages:string[][]){
 const objs:string[]=[];const add=(s:string)=>{objs.push(s);return objs.length;};
 const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 const pagesId=objs.length+1+pages.length*2;const kids:number[]=[];
 for(const lines of pages){
  const body='BT /F1 11 Tf 14 TL 56 780 Td '+lines.map(l=>'('+l.replace(/[\\()]/g,m=>'\\'+m)+') Tj T*').join(' ')+' ET';
  const content=add('<< /Length '+Buffer.byteLength(body,'latin1')+' >>\nstream\n'+body+'\nendstream');
  kids.push(add('<< /Type /Page /Parent '+pagesId+' 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 '+font+' 0 R >> >> /Contents '+content+' 0 R >>'));
 }
 add('<< /Type /Pages /Kids ['+kids.map(k=>k+' 0 R').join(' ')+'] /Count '+kids.length+' >>');
 const catalog=add('<< /Type /Catalog /Pages '+pagesId+' 0 R >>');
 let out='%PDF-1.4\n';const offsets:number[]=[];
 objs.forEach((o,i)=>{offsets.push(Buffer.byteLength(out,'latin1'));out+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});
 const xref=Buffer.byteLength(out,'latin1');
 out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n'+offsets.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objs.length+1)+' /Root '+catalog+' 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
 return Buffer.from(out,'latin1');
}

/** Fictional signed CDA (3 pages). Quotes used by the extraction tests are exact sentences on pages 1–3. */
export const SIGNED_CDA=[
 ['MUTUAL CONFIDENTIALITY AGREEMENT (FICTIONAL)','Between Example Therapeutics GmbH and Northwind Bio ApS.','This Agreement is effective as of 1 March 2025.','The purpose is to evaluate a co-development of PX-202.'],
 ['2. TERM','This Agreement shall remain in force until 1 March 2027.','3. CONFIDENTIALITY','The obligations of confidentiality shall survive for five (5) years after expiry.'],
 ['4. RETURN OF INFORMATION','Each Party shall return or destroy Confidential Information within thirty (30) days of a written request.','5. GOVERNING LAW','This Agreement is governed by the laws of Denmark.','Signed on 27 February 2025 by both Parties.'],
];

/** A disposable database with the catalog synced; Contracts 1.0.0 is approved only inside it. Installs go through the real Add app step. */
export async function contractsSuite(){
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const actor:Actor={userId:randomUUID(),origin:'human'};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'owner@example.invalid','Owner (fictional)']);
 const f=new WorkspaceFoundation(db),s=new Service(db);
 await syncTemplateCatalog(db);
 await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.contracts' AND version='1.0.0'");
 const catalog=new AppTemplates(undefined,db);
 const C=await catalog.read({templateId:'life.contracts',version:'1.0.0'}),P=await catalog.read({templateId:'life.project-oversight',version:'2.1.0'}),R=await catalog.read({templateId:'life.cash-runway',version:'2.1.0'});
 const install=async(w:string,t:any,name:string,connections:Record<string,string>={},extra:any={})=>{
  const target={install:{templateId:t.id,version:t.version,digest:t.digest,name,requestKey:randomUUID(),...extra}};
  const step=await dataAccessStep(f,actor,w,target);
  return {step,receipt:step.needed?await confirmDataAccess(f,actor,w,{...target,connections,stepDigest:step.digest}):await installCatalogApp(f,actor,w,target.install)};
 };
 const comp=async(w:string,id:string)=>(await f.readComponent(actor,w,id)).component;
 const mapOf=(c:any)=>JSON.parse(JSON.parse(/^const templateConfiguration=(.+);\n/.exec(c.source)![1]).tableMap);
 const save=async(w:string,typeId:string,data:any,who:Actor=actor)=>{const p=await s.preview(who,w,{kind:'create_record',typeId,data});return (await s.commit(who,p.id,p.digest)).objects[0].id as string;};
 const update=async(w:string,id:string,data:any)=>{const r=(await pg.query<any>('SELECT version FROM records WHERE id=$1',[id])).rows[0];const p=await s.preview(actor,w,{kind:'update_record',recordId:id,expectedVersion:r.version,data});return s.commit(actor,p.id,p.digest);};
 const run=async(w:string,id:string,state:any={},event:any={kind:'open'})=>{const c=await comp(w,id);return f.runFrontend(actor,w,{componentId:c.id,expectedVersion:c.version,state,event});};
 const approve=async(w:string,out:any)=>{if(!out.proposal)throw Error('No proposal: '+(out.state?.notice??''));return f.confirm(actor,w,out.proposal.id,out.proposal.digest);};
 const rows=async(typeId:string)=>(await pg.query<any>("SELECT id,version,data FROM records WHERE type_id=$1 AND state<>'archived' ORDER BY created_at,id",[typeId])).rows;
 const count=async(sql:string,args:any[])=>(await pg.query<any>(sql,args)).rows[0].n as number;
 const tables=(w:string)=>count('SELECT count(*)::int n FROM entity_types WHERE workspace_id=$1 AND deleted_at IS NULL',[w]);
 const version=async(id:string)=>(await pg.query<any>('SELECT version FROM workspace_components WHERE id=$1',[id])).rows[0].version as number;
 /** The real MCP endpoints, one per assistant principal: /claude (Claude host) and /mcp (ChatGPT host). */
 async function assistants(){
  const {addMcp}=await import('../../src/server/mcp.js');
  const app=express();app.use(express.json({limit:'60mb'}));
  addMcp(app,s,(req:any,_res:any,next:any)=>{req.actor={userId:actor.userId,origin:'ai',assistant:'claude'};next();},{path:'/claude',host:'claude'} as any);
  addMcp(app,s,(req:any,_res:any,next:any)=>{req.actor={userId:actor.userId,origin:'ai'};next();},{path:'/mcp',host:'chatgpt'} as any);
  const {default:request}=await import('supertest');let n=0;
  return (path:'/claude'|'/mcp')=>async(name:string,args:any)=>{const r=await request(app).post(path).set('Authorization','Bearer test-principal').set('Accept','application/json, text/event-stream').send({jsonrpc:'2.0',id:++n,method:'tools/call',params:{name,arguments:args}});
   const body=r.body&&Object.keys(r.body).length?r.body:JSON.parse(String(r.text).split('\n').find(l=>l.startsWith('data:'))?.slice(5)??'{}');const result=body.result;if(!result)throw Error('MCP error '+r.status+' '+String(r.text).slice(0,500));
   if(result.isError)throw Error(result.content?.map((c:any)=>c.text).join(' ')||'tool error');return result.structuredContent?.result??JSON.parse(result.content[0].text);};
 }
 return {pg,db,actor,f,s,C,P,R,install,comp,mapOf,save,update,run,approve,rows,count,tables,version,assistants};
}

const REF_KEYS=['counterparty_id','parent_id','program_id','study_id','agreement_id','milestone_id','organization_id'];
/** Contracts 1.0.0 on a disposable database: the documented schema created through reviewed writes, the fictional demo records
 * saved with real receipt IDs substituted into every relationship, then the catalog app prepared with a manifest (as of 12 Nov 2026). */
export async function contractsFixture(){
 const {manifestFieldId}=await import('../../src/workspace/template-catalog.js');
 const {appTemplates}=await import('../../src/workspace/app-templates.js');
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const actor:Actor={userId:randomUUID(),origin:'human'};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'contracts@example.invalid','Contracts fixture']);
 const f=new WorkspaceFoundation(db),s=new Service(db),w=await s.createWorkspace(actor,'Contracts fixture');
 async function save(op:any){const p=await s.preview(actor,w.id,op);return s.commit(actor,p.id,p.digest);}
 const schemas=JSON.parse(await readFile('templates/source/contracts/schema.example.json','utf8')),map:any={},bindings:any[]=[],fields:any[]=[];
 for(const [role,def] of Object.entries(schemas) as [string,any][]){
  const id=(await save({kind:'create_type',name:def.name,fields:def.fields})).objects[0].id;
  map[role]={typeId:id,fields:def.logicalFields,writableFields:Object.keys(def.logicalFields)};
  bindings.push({typeId:id,fields:def.fields.map((x:any)=>x.key)});
  fields.push(...def.fields.map((x:any)=>({id:manifestFieldId(role,x.key),typeId:id,field:x.key,schemaVersion:0,kind:x.kind,mode:'write'})));
 }
 const ids:Record<string,string>={};
 for(const r of JSON.parse(await readFile('templates/source/contracts/demo_data.json','utf8')).records){
  const data=Object.fromEntries(Object.entries(r.data).filter(([,v])=>v!==null).map(([k,v])=>[k,REF_KEYS.includes(k)&&ids[v as string]?ids[v as string]:v]));
  ids[r.id]=(await save({kind:'create_record',typeId:map[r.role].typeId,data})).objects[0].id;
 }
 const entry=await appTemplates.read({templateId:'life.contracts',version:'1.0.0'});
 const op=await appTemplates.operation(f,actor,w.id,{templateId:entry.id,version:entry.version,digest:entry.digest,name:'Contracts',configuration:{tableMap:JSON.stringify(map),asOfOverride:'2026-11-12'},bindings,manifest:{version:1,scope:'workspace',fields}});
 const p=await f.preview(actor,w.id,op),receipt=await f.confirm(actor,w.id,p.id,p.digest),component=(await f.readComponent(actor,w.id,receipt.id)).component;
 return {pg,db,actor,f,s,w,component,map,bindings,fields,save,ids,entry};
}
