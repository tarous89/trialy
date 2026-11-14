import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {WorkspaceFoundation} from '../../src/workspace/service.js';
import {Service} from '../../src/domain/service.js';
import {appTemplates} from '../../src/workspace/app-templates.js';
import {manifestFieldId} from '../../src/workspace/template-catalog.js';
import type {Database,Connection} from '../../src/db/database.js';
import type {Actor} from '../../src/shared/schema.js';
/** Runway 2.1.0 on a disposable database: the documented 13-table schema created through reviewed writes, then the catalog app prepared with a manifest. */
export async function cashFixture(){
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const actor:Actor={userId:randomUUID(),origin:'human'};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'runway@example.invalid','Finance fixture']);
 const f=new WorkspaceFoundation(db),s=new Service(db),w=await s.createWorkspace(actor,'Runway fixture');
 async function save(op:any){const p=await s.preview(actor,w.id,op);return s.commit(actor,p.id,p.digest);}
 const schemas=JSON.parse(await readFile('templates/source/cash-runway/archive/2.1.0/schema.example.json','utf8')),map:any={},bindings:any[]=[],fields:any[]=[];
 for(const [role,def]of Object.entries(schemas) as [string,any][]){
  const id=(await save({kind:'create_type',name:def.name,fields:def.fields})).objects[0].id;
  map[role]={typeId:id,fields:def.logicalFields,writableFields:Object.keys(def.logicalFields)};
  bindings.push({typeId:id,fields:def.fields.map((x:any)=>x.key)});
  fields.push(...def.fields.map((x:any)=>({id:manifestFieldId(role,x.key),typeId:id,field:x.key,schemaVersion:0,kind:x.kind,mode:'write'})));
 }
 const create=async(role:string,data:any)=>(await save({kind:'create_record',typeId:map[role].typeId,data})).objects[0].id;
 await create('runway.settings',{reporting_currency:'EUR',runway_target_months:18,trailing_window_months:3,loaded_cost_pct:0,min_cash_reserve:0,opening_balance:1000,opening_date:'2026-09-30'});
 const program=await create('programs',{name:'Fixture program',stage:'preclinical',archived:false});
 await create('runway.plan_lines',{name:'Rent',direction:'spend',category:'Facilities',driver:'monthly',amount:100,currency:'EUR',start_month:'2026-10-01',status:'committed',archived:false});
 const entry=await appTemplates.read({templateId:'life.cash-runway',version:'2.1.0'});
 const op=await appTemplates.operation(f,actor,w.id,{templateId:entry.id,version:entry.version,digest:entry.digest,name:'Runway',configuration:{tableMap:JSON.stringify(map)},bindings,manifest:{version:1,scope:'workspace',fields}});
 const p=await f.preview(actor,w.id,op),receipt=await f.confirm(actor,w.id,p.id,p.digest),component=(await f.readComponent(actor,w.id,receipt.id)).component;
 return {pg,db,actor,f,s,w,component,map,save,program};
}
