import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {WorkspaceFoundation} from '../../src/workspace/service.js';
import {Service} from '../../src/domain/service.js';
import {appTemplates} from '../../src/workspace/app-templates.js';
import {manifestFieldId} from '../../src/workspace/template-catalog.js';
import type {Database,Connection} from '../../src/db/database.js';
import type {Actor} from '../../src/shared/schema.js';
const REF_KEYS=['program_id','predecessor_id','plan_item_id','linked_item_id'];
/** Programs 2.0.0 on a disposable database: the documented schema created through reviewed writes, the fictional demo records
 * saved with real receipt IDs substituted into every relationship, then the catalog app prepared with a manifest. */
export async function programsFixture(opts:{demo?:boolean}={}){
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const actor:Actor={userId:randomUUID(),origin:'human'};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'programs@example.invalid','Programs fixture']);
 const f=new WorkspaceFoundation(db),s=new Service(db),w=await s.createWorkspace(actor,'Programs fixture');
 async function save(op:any){const p=await s.preview(actor,w.id,op);return s.commit(actor,p.id,p.digest);}
 const schemas=JSON.parse(await readFile('templates/source/project-oversight/schema.example.json','utf8')),map:any={},bindings:any[]=[],fields:any[]=[];
 for(const [role,def] of Object.entries(schemas) as [string,any][]){
  const id=(await save({kind:'create_type',name:def.name,fields:def.fields})).objects[0].id;
  map[role]={typeId:id,fields:def.logicalFields,writableFields:def.readOnly?[]:Object.keys(def.logicalFields)};
  bindings.push({typeId:id,fields:def.fields.map((x:any)=>x.key)});
  fields.push(...def.fields.map((x:any)=>({id:manifestFieldId(role,x.key),typeId:id,field:x.key,schemaVersion:0,kind:x.kind,mode:def.readOnly?'read':'write'})));
 }
 const ids:Record<string,string>={};
 if(opts.demo!==false){const demo=JSON.parse(await readFile('templates/source/project-oversight/demo_data.json','utf8')).records;
  for(const r of demo){const data=Object.fromEntries(Object.entries(r.data).filter(([,v])=>v!==null).map(([k,v])=>[k,REF_KEYS.includes(k)?ids[v as string]:v]));
   ids[r.id]=(await save({kind:'create_record',typeId:map[r.role].typeId,data})).objects[0].id;}}
 const entry=await appTemplates.read({templateId:'life.project-oversight',version:'2.0.0'});
 const op=await appTemplates.operation(f,actor,w.id,{templateId:entry.id,version:entry.version,digest:entry.digest,name:'Programs',configuration:{tableMap:JSON.stringify(map),asOfOverride:'2026-11-11'},bindings,manifest:{version:1,scope:'workspace',fields}});
 const p=await f.preview(actor,w.id,op),receipt=await f.confirm(actor,w.id,p.id,p.digest),component=(await f.readComponent(actor,w.id,receipt.id)).component;
 return {pg,db,actor,f,s,w,component,map,bindings,fields,save,ids,entry};
}
