import {withActor,setDatabaseContext} from '../src/db/context.js';
import {test} from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFile,readdir} from 'node:fs/promises';import {randomUUID} from 'node:crypto';
import {Service} from '../src/domain/service.js';import {WorkspaceFoundation} from '../src/workspace/service.js';import {AccessManagement} from '../src/domain/access-management.js';import type {Actor} from '../src/shared/schema.js';import type {Database,Connection} from '../src/db/database.js';
test('effective grants: tool edits, source transparency, restrictions, ChatGPT inheritance and revocation',async()=>{
 const pg=new PGlite();for(const path of (await readdir('migrations')).filter(p=>p.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+path,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:f=>pg.transaction(tx=>f(tx as Connection)),close:()=>pg.close()};try{
 const owner:Actor={userId:randomUUID(),origin:'human'},sarah:Actor={userId:randomUUID(),origin:'human'};for(const a of [owner,sarah])await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,a.userId+'@example.invalid',a===owner?'Owner':'Sarah']);
 const s=new Service(db),f=new WorkspaceFoundation(db),permissions=new AccessManagement(db),w=await s.createWorkspace(owner,'Account');assert.equal((await s.workspaces({...owner,origin:'ai'})).length,1);
 const save=async(op:any)=>{const p=await s.preview(owner,w.id,op);return s.commit(owner,p.id,p.digest);};const change=async(op:any)=>{const p=await f.preview(owner,w.id,op);return f.confirm(owner,w.id,p.id,p.digest);};
 const table=(await save({kind:'create_type',name:'Vendors',fields:[{key:'name',name:'Name',kind:'text',ai:true},{key:'status',name:'Status',kind:'text',ai:true},{key:'secret',name:'Secret',kind:'text',ai:true}]})).objects[0].id;
 const record=(await save({kind:'create_record',typeId:table,data:{name:'Acme',status:'Pending',secret:'Private'}})).objects[0].id;
 const project=await change({kind:'create_node',nodeKind:'project',name:'Selection'});await change({kind:'link_project_records',projectId:project.id,expectedProjectVersion:0,records:[{recordId:record,expectedVersion:0}],reason:'Include vendor'});
 const content={name:'Tool X',format:'frontend-js',sourceAccess:'bindings',resourceKind:'tracker',manifest:{version:1,scope:'project',fields:[{id:'status',typeId:table,field:'status',schemaVersion:0,kind:'text',mode:'write'},{id:'name',typeId:table,field:'name',schemaVersion:0,kind:'text',mode:'read'}]},bindings:[{typeId:table,fields:['name','status']}],source:`const p=tools.call('records.read',{typeId:'${table}'});return {html:p.rows.map(r=>'<div data-trialy-slot="status_'+r.id+'"></div>').join(''),state:p,controls:p.rows.map(r=>({slot:'status_'+r.id.replaceAll('-',''),fieldId:'status',recordId:r.id}))};`};
 const tool=await change({kind:'save_component',projectId:project.id,content});const otherTool=await change({kind:'save_component',projectId:project.id,content:{...content,name:'Tool Y'}});
 await s.share(owner,w.id,sarah.userId,'editor',[],[],true);
 const update=async(subject:string,settings:any)=>permissions.update(owner,w.id,{expectedVersion:(await permissions.overview(owner,w.id)).version,subject,...settings});
 await update(sarah.userId,{databaseBrowse:false,directData:false,rule:{kind:'tool',resourceId:tool.id,read:'allow',write:'allow'}});
 assert.deepEqual(await s.types(sarah,w.id),[]);await assert.rejects(s.records(sarah,w.id,table));
 await update(sarah.userId,{rule:{kind:'tool',resourceId:otherTool.id,read:'allow',write:'allow'}});
 const first:any=await f.runFrontend(sarah,w.id,{componentId:tool.id,expectedVersion:0});assert.equal(first.controls[0].editable,true);assert.equal(first.state.rows[0].data.secret,undefined);
 const explanation=await permissions.explain(owner,w.id,sarah.userId);const status=explanation.tables[0].fields.find((x:any)=>x.key==='status');assert.equal(status.write,true);assert.equal(status.sources[0].name,'Tool X');assert.equal(status.sources[0].scope,'Project records');assert.equal(status.sources.length,2);assert.equal(explanation.databaseBrowse,false);
 await pg.exec(await readFile('ops/runtime-role.sql','utf8'));const runtime:Database={query:(q,v)=>runtime.transaction(tx=>tx.query(q,v)),transaction:fn=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return fn(tx as Connection);}),close:async()=>{}};const rf=new WorkspaceFoundation(runtime);
 const restrictedRun:any=await withActor(sarah,()=>rf.runFrontend(sarah,w.id,{componentId:tool.id,expectedVersion:0}));assert.equal(restrictedRun.state.rows.length,1);assert.equal(restrictedRun.state.rows[0].data.secret,undefined);
 const scopedTables=await withActor(sarah,()=>rf.toolTables(sarah,w.id,tool.id));assert.deepEqual(scopedTables[0].fields.map((x:any)=>x.key),['name','status']);assert.equal(scopedTables[0].fields.find((x:any)=>x.key==='status').writable,true);
 await update(sarah.userId,{role:'viewer'});
 const create=await withActor(sarah,()=>rf.preview(sarah,w.id,{kind:'apply_component_records',componentId:tool.id,expectedVersion:0,changes:[{kind:'create_record',typeId:table,data:{status:'New'}}]}));
 const created=await withActor(sarah,()=>rf.confirm(sarah,w.id,create.id,create.digest));const createdId=created.receipt.objects[0].id;
 assert.equal((await db.query('SELECT record_id FROM project_records WHERE project_id=$1 AND record_id=$2 AND revoked_at IS NULL',[project.id,createdId])).rows.length,1);
 const afterCreate:any=await withActor(sarah,()=>rf.runFrontend(sarah,w.id,{componentId:tool.id,expectedVersion:0}));assert.equal(afterCreate.state.rows.length,2);
 await update(sarah.userId,{role:'inspector'});const inspector=await permissions.explain(owner,w.id,sarah.userId);assert.equal(inspector.tables[0].fields.find((x:any)=>x.key==='status').write,false);
 await update(sarah.userId,{role:'editor',chatgpt:true});
 const proposal=await f.runFrontend(sarah,w.id,{componentId:tool.id,expectedVersion:0,event:{kind:'change',action:`bound:status:${record}:0`,value:'Contacted'}});assert.ok(proposal.proposal);await f.confirm(sarah,w.id,proposal.proposal.id,proposal.proposal.digest);assert.equal((await s.records(owner,w.id,table)).rows.find((r:any)=>r.id===record)?.data.status,'Contacted');const otherRead:any=await f.runFrontend(sarah,w.id,{componentId:otherTool.id,expectedVersion:0});assert.equal(otherRead.controls.find((r:any)=>r.action.includes(record))?.value,'Contacted');
 const pending=await f.preview(sarah,w.id,{kind:'apply_component_records',componentId:tool.id,expectedVersion:0,changes:[{kind:'update_record',recordId:record,expectedVersion:1,data:{status:'Must not save'}}]});
 await update(sarah.userId,{rule:{kind:'column',resourceId:table,field:'status',read:'inherit',write:'deny'}});
 await assert.rejects(f.confirm(sarah,w.id,pending.id,pending.digest));const otherBlocked:any=await f.runFrontend(sarah,w.id,{componentId:otherTool.id,expectedVersion:0});assert.equal(otherBlocked.controls[0].editable,false);
 for(const actor of [sarah,{...sarah,origin:'ai' as const}]){const read:any=await f.runFrontend(actor,w.id,{componentId:tool.id,expectedVersion:0});assert.equal(read.controls[0].editable,false);await assert.rejects(f.preview(actor,w.id,{kind:'apply_component_records',componentId:tool.id,expectedVersion:0,changes:[{kind:'update_record',recordId:record,expectedVersion:1,data:{status:'Bypass'}}]}));}
 await update(sarah.userId,{rule:{kind:'column',resourceId:table,field:'status',read:'deny',write:'deny'}});await assert.rejects(f.runFrontend(sarah,w.id,{componentId:tool.id,expectedVersion:0}),/unavailable/); // arbitrary saved source fails closed when its bindings become restricted
 await assert.rejects(permissions.update({...owner,origin:'ai'},w.id,{expectedVersion:0,subject:sarah.userId,databaseBrowse:true}),/signed-in/);
 await assert.rejects(permissions.update(sarah,w.id,{expectedVersion:0,subject:sarah.userId,databaseBrowse:true}),/owner/);
 await update(sarah.userId,{rule:{kind:'tool',resourceId:tool.id,read:'inherit',write:'inherit'}});await assert.rejects(f.runFrontend(sarah,w.id,{componentId:tool.id,expectedVersion:0}));
 }finally{await pg.close();}
});
