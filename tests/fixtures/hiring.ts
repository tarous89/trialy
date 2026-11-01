import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {WorkspaceFoundation} from '../../src/workspace/service.js';
import {Service} from '../../src/domain/service.js';
import {appTemplates} from '../../src/workspace/app-templates.js';
import type {Database,Connection} from '../../src/db/database.js';
import type {Actor} from '../../src/shared/schema.js';
export async function hiringFixture(){
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const actor:Actor={userId:randomUUID(),origin:'human'};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'hiring@example.invalid','Hiring fixture']);
 const f=new WorkspaceFoundation(db),s=new Service(db),w=await s.createWorkspace(actor,'Hiring fixture');
 async function save(op:any){const p=await s.preview(actor,w.id,op);return s.commit(actor,p.id,p.digest);}
 const schemas=JSON.parse(await readFile('templates/source/biotech-hiring/schema.example.json','utf8')),map:any={},bindings:any[]=[],fields:any[]=[];
 for(const [role,def]of Object.entries(schemas) as [string,any][]){
  const id=(await save({kind:'create_type',name:def.name,fields:def.fields})).objects[0].id;
  map[role]={typeId:id,fields:def.logicalFields,writableFields:Object.keys(def.logicalFields)};
  bindings.push({typeId:id,fields:def.fields.map((x:any)=>x.key)});
  fields.push(...def.fields.map((x:any)=>({id:role+'_'+x.key,typeId:id,field:x.key,schemaVersion:0,kind:x.kind,mode:'write'})));
 }
 const personId=(await save({kind:'create_record',typeId:map.staff.typeId,data:{name:'Active scientist',fte:1,status:'Active',function:'CMC',available_from:'2026-11',archived:false}})).objects[0].id;
 const projectId=(await save({kind:'create_record',typeId:map.projects.typeId,data:{name:'Scale-up',status:'Active',activity_type:'CMC',archived:false}})).objects[0].id;
 await save({kind:'create_record',typeId:map.allocations.typeId,data:{name:'Scale-up allocation',person_id:personId,project_id:projectId,month:'2026-11',fte:.5,status:'Committed',archived:false}});
 await save({kind:'create_record',typeId:map.scenarios.typeId,data:{name:'Extra contractor',hire_shift_months:0,hiring_fte:0,contractor_fte:1,archived:false}});
 await save({kind:'create_record',typeId:map.requests.typeId,data:{name:'Analytical scientist',role:'Scientist',status:'Pending',fte:.5,target_start:'2026-12',archived:false}});
 const entry=await appTemplates.read({templateId:'life.hiring-resource-management'});
 const op=await appTemplates.operation(f,actor,w.id,{templateId:entry.id,version:entry.version,digest:entry.digest,name:'Biotech Hiring & Resource Management',configuration:{tableMap:JSON.stringify(map),planMonth:'2026-11'},bindings,manifest:{version:1,scope:'workspace',fields}});
 const p=await f.preview(actor,w.id,op),receipt=await f.confirm(actor,w.id,p.id,p.digest),component=(await f.readComponent(actor,w.id,receipt.id)).component;
 return {pg,db,actor,f,s,w,component,map,save,personId,projectId};
}
