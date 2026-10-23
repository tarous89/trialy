import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {setDatabaseContext,withActor} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {Foundation} from '../src/foundation/service.js';
import {workspaceHome} from '../src/workspace/home.js';
import {moveTool} from '../src/workspace/tool-placement.js';
import type {Actor} from '../src/shared/schema.js';
test('account setup is automatic and idempotent; standalone tools move without changing data or access',async()=>{
 const pg=new PGlite();try{
 for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const admin:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
 const db:Database={query:(q,v)=>db.transaction(tx=>tx.query(q,v)),transaction:fn=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return fn(tx as Connection);}),close:async()=>{}};
 const owner:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...owner,origin:'ai',actionConfirmed:true},other:Actor={userId:randomUUID(),origin:'human'};
 for(const a of [owner,other])await admin.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,a.userId+'@example.invalid','Synthetic owner']);
 await withActor(ai,async()=>{
 const s=new Service(db),f=new WorkspaceFoundation(db),engine=new Foundation(db);
 const spaces=await s.ensureAccount(ai);assert.equal(spaces.length,1);const w=spaces[0].id;
 assert.equal((await s.ensureAccount(ai))[0].id,w);assert.equal((await admin.query('SELECT count(*) AS n FROM workspaces')).rows[0].n,1);
 const save=async(op:any)=>{const p=await f.preview(ai,w,op);return f.confirm(ai,w,p.id,p.digest);};
 const standalone=await save({kind:'save_component',content:{name:'Independent tracker',format:'frontend-js',source:'return {html:"<h1>Ready</h1>"};'}});
 assert.equal((await f.readComponent(ai,w,standalone.id)).component.project_id,null);
 const project=await save({kind:'create_node',nodeKind:'project',name:'Project A'});
 const second=await save({kind:'create_node',nodeKind:'project',name:'Project B'});
 let home=await workspaceHome(db,ai,w,{projectId:'unassigned'});assert.equal(home.resources.length,1);
 const move=async(id:string,source:string,projectId:string|null,expectedVersion:number)=>moveTool(db,ai,w,{toolId:id,source,projectId,expectedVersion,confirmed:true});
 await move(standalone.id,'component',project.id,0);
 assert.equal((await workspaceHome(db,ai,w,{projectId:project.id})).resources.length,1);
 assert.equal((await f.readComponent(ai,w,standalone.id)).component.project_id,null,'Organization must not change database scope');
 await assert.rejects(move(standalone.id,'component',null,0),/moved elsewhere/);
 await move(standalone.id,'component',second.id,1);await move(standalone.id,'component',null,2);
 assert.equal((await workspaceHome(db,ai,w,{projectId:'unassigned'})).resources.length,1);
 const scoped=await save({kind:'save_component',projectId:project.id,content:{name:'Scoped tool',format:'frontend-js',source:'return {html:"ok"};'}});
 await move(scoped.id,'component',null,0);assert.equal((await f.readComponent(ai,w,scoped.id)).component.project_id,project.id);
 const functionPreview=await engine.prepareFunction(ai,w,{name:'Automation',source:'return null;',scope:{capabilities:[],typeIds:[],documents:false},inputContract:{type:'any'},outputContract:{type:'any'}});
 const fn=await engine.saveFunction(ai,w,functionPreview.id,functionPreview.digest);await move(fn.functionId,'function',second.id,0);assert.ok((await workspaceHome(db,ai,w,{projectId:second.id})).resources.some(r=>r.id===fn.functionId));await move(fn.functionId,'function',null,1);
 const dp=await s.preview(ai,w,{kind:'create_type',name:'Intake',fields:[{key:'name',name:'Name',kind:'text',ai:true}]});const type=(await s.commit(ai,dp.id,dp.digest)).objects[0].id;
 const tracker=await save({kind:'save_component',content:{name:'Bound independent tracker',format:'frontend-js',resourceKind:'tracker',bindings:[{typeId:type,fields:['name']}],manifest:{version:1,scope:'workspace',fields:[{id:'name',typeId:type,field:'name',schemaVersion:0,kind:'text',mode:'write'}]},source:`const rows=tools.call('records.read',{typeId:'${type}'});return {html:'<p>'+rows.total+'</p>'};`}});
 const rendered=await f.runFrontend(ai,w,{componentId:tracker.id,expectedVersion:0});assert.match(rendered.html,/<p>0<\/p>/);
 await move(tracker.id,'component',project.id,0);await move(tracker.id,'component',null,1);assert.equal((await f.readComponent(ai,w,tracker.id)).component.manifest.scope,'workspace');
 const form=await save({kind:'create_collection_link',config:{kind:'form',name:'Public form',typeId:type,fields:['name'],days:7}});
 const link=(await workspaceHome(db,ai,w,{kind:'form'})).resources[0];await move(link.id,'collection',project.id,0);await move(link.id,'collection',null,1);assert.ok(form.url);
 await assert.rejects(moveTool(db,{...ai,origin:'worker'},w,{toolId:standalone.id,source:'component',projectId:null,expectedVersion:3,confirmed:true}),/cannot approve/);
 await assert.rejects(move(standalone.id,'component',randomUUID(),3),/not found/);
 // A move does not remove inherited restrictions from the original data project.
 const restriction=await f.preview(owner,w,{kind:'set_project_access',nodeId:project.id,expectedVersion:0,allowedUsers:[owner.userId],ai:false});await f.confirm(owner,w,restriction.id,restriction.digest);
 assert.ok(!(await workspaceHome(db,ai,w)).resources.some(r=>r.id===scoped.id));
 await assert.rejects(move(scoped.id,'component',null,1),/unavailable/);
 await withActor(owner,()=>s.setAi(owner,w,false));assert.deepEqual(await s.ensureAccount(ai),[],'Never recreate storage to bypass denied AI access');
 });
 await withActor(other,async()=>{const s=new Service(db),spaces=await s.ensureAccount(other);assert.equal(spaces.length,1);assert.equal((await workspaceHome(db,other,spaces[0].id)).resources.length,0);});
 }finally{await pg.close();}
});
