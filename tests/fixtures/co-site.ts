import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {WorkspaceFoundation} from '../../src/workspace/service.js';
import {Service} from '../../src/domain/service.js';
import {appTemplates} from '../../src/workspace/app-templates.js';
import type {Database,Connection} from '../../src/db/database.js';
import type {Actor} from '../../src/shared/schema.js';
export async function coSiteFixture(){
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const actor:Actor={userId:randomUUID(),origin:'human'};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'co03@example.invalid','CO03 fixture']);
 const f=new WorkspaceFoundation(db),s=new Service(db),w=await s.createWorkspace(actor,'CO03 fixture');
 async function save(op:any){const p=await s.preview(actor,w.id,op);return s.commit(actor,p.id,p.digest);}
 const schemas=JSON.parse(await readFile('templates/source/co-site-feasibility/schema.example.json','utf8')),map:any={},bindings:any[]=[],fields:any[]=[];
 for(const [role,def]of Object.entries(schemas) as [string,any][]){
  const id=(await save({kind:'create_type',name:def.name,fields:def.fields})).objects[0].id;
  map[role]={typeId:id,fields:def.logicalFields,writableFields:Object.keys(def.logicalFields)};
  bindings.push({typeId:id,fields:def.fields.map((x:any)=>x.key)});
  fields.push(...def.fields.map((x:any)=>({id:role+'_'+x.key,typeId:id,field:x.key,schemaVersion:0,kind:x.kind,mode:'write'})));
 }
 const demo=JSON.parse(await readFile('templates/source/co-site-feasibility/demo_data.json','utf8')).records;
 const ids:any={},saved:any[]=[];for(const r of demo)ids[r.id]=randomUUID();
 for(const role of ['studies','sites','investigators','candidates','criteria','responses','evaluations','startup'])for(const r of demo.filter((x:any)=>x.role===role)){
  const data=Object.fromEntries(Object.entries(r.data).filter(([k])=>schemas[role].logicalFields[k]).map(([k,v])=>[schemas[role].logicalFields[k],['study_id','site_id','lead_investigator_id','candidate_id','criterion_id'].includes(k)?ids[String(v)]||null:v===''?null:v]));
  if(role==='evaluations'&&data.status!=='Draft'){
   const candidate=saved.find(x=>x.id===data.candidate_id);
   data.evidence_snapshot=saved.filter(x=>x.role==='criteria'&&x.data.study_id===candidate.data.study_id).map(q=>{const a=saved.find(x=>x.role==='responses'&&x.data.candidate_id===candidate.id&&x.data.criterion_id===q.id);return q.id+':'+q.version+':'+q.data.version+':'+(a?.id||'-')+':'+(a?.version||'-');}).sort().join('|');
  }
  // Schema creation and every row use the normal reviewed database path.
  const id=(await save({kind:'create_record',typeId:map[role].typeId,data})).objects[0].id;ids[r.id]=id;saved.push({id,role,version:0,data});
 }
 const entry=await appTemplates.read({templateId:'life.co-site-feasibility'});
 const op=await appTemplates.operation(f,actor,w.id,{templateId:entry.id,version:entry.version,digest:entry.digest,name:'Sponsor Site Feasibility',configuration:{tableMap:JSON.stringify(map),asOfDate:'2026-11-01'},bindings,manifest:{version:1,scope:'workspace',fields}});
 const p=await f.preview(actor,w.id,op),receipt=await f.confirm(actor,w.id,p.id,p.digest),component=(await f.readComponent(actor,w.id,receipt.id)).component;
 return {pg,db,actor,f,s,w,component,map,save,ids};
}
