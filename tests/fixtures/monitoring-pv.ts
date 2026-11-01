import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {WorkspaceFoundation} from '../../src/workspace/service.js';
import {Service} from '../../src/domain/service.js';
import {appTemplates} from '../../src/workspace/app-templates.js';
import type {Database,Connection} from '../../src/db/database.js';
import type {Actor} from '../../src/shared/schema.js';
export async function monitoringPvFixture(){
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const actor:Actor={userId:randomUUID(),origin:'human'};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'monitoring@example.invalid','Monitoring and PV fixture']);
 const f=new WorkspaceFoundation(db),s=new Service(db),w=await s.createWorkspace(actor,'Monitoring and PV fixture');
 async function save(op:any){const p=await s.preview(actor,w.id,op);return s.commit(actor,p.id,p.digest);}
 const schemas=JSON.parse(await readFile('templates/source/co06-trial-monitoring-pv/schema.example.json','utf8')),map:any={},bindings:any[]=[],fields:any[]=[];
 for(const [role,def]of Object.entries(schemas) as [string,any][]){
  const id=(await save({kind:'create_type',name:def.name,fields:def.fields})).objects[0].id;
  map[role]={typeId:id,fields:def.logicalFields,writableFields:Object.keys(def.logicalFields)};
  bindings.push({typeId:id,fields:def.fields.map((x:any)=>x.key)});
  fields.push(...def.fields.map((x:any)=>({id:role+'_'+x.key,typeId:id,field:x.key,schemaVersion:0,kind:x.kind,mode:'write'})));
 }
 const demo=JSON.parse(await readFile('templates/source/co06-trial-monitoring-pv/demo_data.json','utf8')).records;
 const ids:any={};for(const r of demo)ids[r.id]=randomUUID();
 for(const role of ['studies','sites','visits','findings','agreements','obligations','activities','snapshots'])for(const r of demo.filter((x:any)=>x.role===role)){
  const data=Object.fromEntries(Object.entries(r.data).filter(([k])=>schemas[role].logicalFields[k]).map(([k,v])=>[schemas[role].logicalFields[k],k.endsWith('_id')?ids[String(v)]||null:v===''?null:v]));
  // Schema creation and every row use the normal reviewed database path.
  const id=(await save({kind:'create_record',typeId:map[role].typeId,data})).objects[0].id;ids[r.id]=id;
 }
 const entry=await appTemplates.read({templateId:'life.co-trial-monitoring-pv'});
 const op=await appTemplates.operation(f,actor,w.id,{templateId:entry.id,version:entry.version,digest:entry.digest,name:'Monitoring and PV Management',configuration:{asOfDate:"2026-11-01",tableMap:JSON.stringify(map)},bindings,manifest:{version:1,scope:'workspace',fields}});
 const p=await f.preview(actor,w.id,op),receipt=await f.confirm(actor,w.id,p.id,p.digest),component=(await f.readComponent(actor,w.id,receipt.id)).component;
 return {pg,db,actor,f,s,w,component,map,save,ids};
}
