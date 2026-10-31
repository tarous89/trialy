import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {Foundation} from '../src/foundation/service.js';
import {runFoundation} from '../src/foundation/worker.js';
import type {Actor} from '../src/shared/schema.js';
test('Approval default, single-type standing permission, per-field evidence and reversible corrections',async()=>{
 const pg=new PGlite();try{
  for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+f,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
  const a:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...a,origin:'ai'};
  await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'test@example.invalid','Tester']);
  const s=new Service(db),f=new WorkspaceFoundation(db),w=await s.createWorkspace(a,'Approvals');await s.setAi(a,w.id,true);
  const save=async(op:any)=>{const p=await s.preview(a,w.id,op);return s.commit(a,p.id,p.digest);};
  const confirm=async(op:any)=>{const p=await f.preview(ai,w.id,op);await assert.rejects(f.confirm(ai,w.id,p.id,p.digest),/cannot approve/);return f.confirm(a,w.id,p.id,p.digest);};
  const type=(await save({kind:'create_type',name:'Partners',fields:[{key:'name',name:'Name',kind:'text'},{key:'note',name:'Note',kind:'text'},{key:'secret',name:'Secret',kind:'text',ai:false}]})).objects[0].id;
  const project=await confirm({kind:'create_node',nodeKind:'project',name:'Tracking'});
  const scope={projectId:project.id,purpose:'Track partners',inclusionCriteria:'Selected partners',sourcePolicy:'User supplied updates',basis:'tracking',bindings:[{typeId:type,fields:['name','note']}],allowCreate:true,allowUpdate:true};
  const permission=await confirm({kind:'save_scope',scope});
  const batch={requestKey:randomUUID(),scopeId:permission.id,expectedScopeVersion:0,sourceLabel:'User input',interpretation:'Named partner',changes:[{kind:'create_record',typeId:type,data:{name:'Original',note:null}}]};
  const draft=await f.maintain(ai,w.id,batch);assert.equal(draft.temporary,true);assert.equal((await s.records(a,w.id,type)).total,0);
  assert.equal((await f.maintain(ai,w.id,batch)).id,draft.id);assert.equal(draft.fieldChanges.length,2);
  const saved=await f.confirm(a,w.id,draft.id,draft.digest),recordId=saved.recordIds[0];
  let history=(await s.fieldChanges(a,w.id)).changes;assert.equal(history.length,2);assert.equal(history[0].authorization.id,draft.id);assert.equal(history[0].authorization.kind,'approval');
  const p=await s.preview(ai,w.id,{kind:'update_record',recordId,expectedVersion:0,data:{name:'Revised'}});assert.equal(p.summary.fieldChanges[0].before,'Original');await assert.rejects(s.commit(ai,p.id,p.digest),/cannot approve/);await s.commit(a,p.id,p.digest);
  const delta=(await s.fieldChanges(a,w.id)).changes.find(c=>c.field_key==='name'&&c.record_version===1)!;
  await save({kind:'reverse_field_change',changeId:delta.id,expectedVersion:1,reason:'Correct change'});
  assert.equal((await s.records(a,w.id,type)).rows[0].data.name,'Original');history=(await s.fieldChanges(a,w.id)).changes;assert.ok(history.some(c=>c.authorization.reverses===delta.id));
  await assert.rejects(s.preview(a,w.id,{kind:'reverse_field_change',changeId:delta.id,expectedVersion:2,reason:'Cannot overwrite later work'}),/Later changes/);
  await save({kind:'update_record',recordId,expectedVersion:2,data:{secret:'Hidden'}});assert.ok(!(await s.fieldChanges(ai,w.id)).changes.some(c=>c.field_key==='secret'));
  await assert.rejects(db.query('DELETE FROM record_field_changes WHERE id=$1',[delta.id]),/append-only/);
  await assert.rejects(f.preview(a,w.id,{kind:'save_scope',scope:{...scope,autoWrite:true,expiresAt:new Date(Date.now()+86400000).toISOString(),bindings:[...scope.bindings,{typeId:randomUUID(),fields:['name']}]}}),/one data type/);
  const standing=await confirm({kind:'save_scope',scope:{...scope,autoWrite:true,expiresAt:new Date(Date.now()+86400000).toISOString()}});
  const automatic=await f.maintain(ai,w.id,{...batch,requestKey:randomUUID(),scopeId:standing.id,changes:[{kind:'update_record',recordId,expectedVersion:3,data:{name:'Allowed'}}]});assert.equal(automatic.status,'saved');
  assert.ok((await s.fieldChanges(a,w.id)).changes.some(c=>c.authorization.kind==='maintenance_grant'&&c.authorization.id===standing.id));
  await f.revoke(a,w.id,standing.id);await assert.rejects(f.maintain(ai,w.id,{...batch,requestKey:randomUUID(),scopeId:standing.id}),/permission changed/);
  await assert.rejects(new Foundation(db).grant(ai,w.id,{revisionId:randomUUID(),typeIds:[type],maxChanges:1,future:true}),/cannot approve/);

  const cleanType=(await save({kind:'create_type',name:'Organizations',fields:[{key:'name',name:'Name',kind:'text'}]})).objects[0].id;
  const x=(await save({kind:'create_record',typeId:cleanType,data:{name:'Example Ltd'}})).objects[0].id;
  const y=(await save({kind:'create_record',typeId:cleanType,data:{name:'Example'}})).objects[0].id;
  const linked=await confirm({kind:'link_identity',sourceRecordId:y,preferredRecordId:x,sourceVersion:0,preferredVersion:0,rationale:'User reviewed the same organization'});
  const entity=await f.identity(ai,w.id,y);assert.equal(entity.preferredRecordId,x);assert.equal(entity.originals.length,2);assert.equal(entity.conflicts[0].field,'name');
  assert.equal((await f.candidates(ai,w.id,[cleanType],'Example')).groups[0].total,2);
  await confirm({kind:'unlink_identity',linkId:linked.id,expectedVersion:0,reason:'Keep separate'});assert.equal((await f.identity(ai,w.id,y)).preferredRecordId,y);assert.equal((await s.records(a,w.id,cleanType)).total,2);
  await assert.rejects(f.identity(ai,w.id,recordId),/all fields/);

  const engine=new Foundation(db);const functionPreview=await engine.prepareFunction(ai,w.id,{name:'Create candidate',source:'tools.call("changes.propose",[{kind:"create_record",typeId:input.typeId,data:{name:"Queued candidate"}}]);return {ready:true};',scope:{capabilities:['changes.propose'],typeIds:[cleanType],documents:false},inputContract:{type:'object'},outputContract:{type:'object'}});
  await assert.rejects(engine.saveFunction(ai,w.id,functionPreview.id,functionPreview.digest),/cannot approve/);
  const fn=await engine.saveFunction(a,w.id,functionPreview.id,functionPreview.digest);
  // Full-source access intentionally excludes human-only fields; keep the execution fixture in its own workspace.
  const ew=await s.createWorkspace(a,'Execution components');await s.setAi(a,ew.id,true);
  const ep=await f.preview(a,ew.id,{kind:'create_node',nodeKind:'project',name:'Functions'});const eproject=await f.confirm(a,ew.id,ep.id,ep.digest);
  const fp=await engine.prepareFunction(a,ew.id,{name:'Echo',source:'return input;',scope:{capabilities:[],typeIds:[],documents:false},inputContract:{type:'any'},outputContract:{type:'any'}});const echo=await engine.saveFunction(a,ew.id,fp.id,fp.digest);
  const componentDraft=await f.preview(a,ew.id,{kind:'save_component',projectId:eproject.id,content:{name:'Runnable code',format:'frontend-js',source:'return {html:"<p>Ready</p>"};',execution:[{name:'echo',revisionId:echo.revisionId}]}});
  const component=await f.confirm(a,ew.id,componentDraft.id,componentDraft.digest);
  const run=await f.invokeComponent(ai,ew.id,{componentId:component.id,expectedVersion:0,binding:'echo',input:{test:42},requestKey:randomUUID()});await runFoundation(db);assert.deepEqual((await engine.run(a,ew.id,run.id)).result,{test:42});
  const staleCopy=await f.preview(ai,ew.id,{kind:'copy_component',sourceComponentId:component.id,expectedVersion:0,projectId:eproject.id,name:'Stale copy'});
  const archive=await f.preview(a,ew.id,{kind:'archive_component',componentId:component.id,expectedVersion:0,archived:true});await f.confirm(a,ew.id,archive.id,archive.digest);
  await assert.rejects(f.confirm(a,ew.id,staleCopy.id,staleCopy.digest),/Source component changed/);
  await assert.rejects(engine.run(ai,ew.id,run.id),/Component changed/);
  await assert.rejects(f.invokeComponent(ai,ew.id,{componentId:component.id,expectedVersion:0,binding:'echo',input:null,requestKey:randomUUID()}),/current component/);
  const duplicateKey=randomUUID();
  const source=`tools.call('functions.invoke',{binding:'echo',requestKey:'${duplicateKey}',input:1});tools.call('functions.invoke',{binding:'echo',requestKey:'${duplicateKey}',input:2});return {html:'<p>Test</p>'};`;
  const atomicDraft=await f.preview(a,ew.id,{kind:'save_component',projectId:eproject.id,content:{name:'Atomic requests',format:'frontend-js',source,execution:[{name:'echo',revisionId:echo.revisionId}]}});const atomic=await f.confirm(a,ew.id,atomicDraft.id,atomicDraft.digest);
  await assert.rejects(f.runFrontend(ai,ew.id,{componentId:atomic.id,expectedVersion:0}));assert.equal((await db.query('SELECT id FROM foundation_runs WHERE request_key=$1',[duplicateKey])).rows.length,0);
  const destDraft=await f.preview(a,ew.id,{kind:'create_node',nodeKind:'project',name:'Copies'});const dest=await f.confirm(a,ew.id,destDraft.id,destDraft.digest);
  const restrict=await f.preview(a,ew.id,{kind:'set_project_access',nodeId:eproject.id,expectedVersion:0,allowedUsers:[a.userId],ai:false});await f.confirm(a,ew.id,restrict.id,restrict.digest);
  const copyOp={kind:'copy_component',sourceComponentId:component.id,expectedVersion:1,projectId:dest.id,name:'Independent copy'};
  await assert.rejects(f.preview(ai,ew.id,copyOp),/not found/);
  const copyPreview=await f.preview(a,ew.id,copyOp);assert.deepEqual(copyPreview.componentCopy?.execution,[]);assert.equal(copyPreview.componentCopy?.ai_enabled,false);
  const copy=await f.confirm(a,ew.id,copyPreview.id,copyPreview.digest);assert.notEqual(copy.id,component.id);assert.equal(copy.version,0);
  const copied=await f.component(db,a,ew.id,copy.id);assert.deepEqual(copied.execution,[]);assert.deepEqual(copied.allowed_users,[a.userId]);assert.equal(copied.archived,false);assert.equal(copied.ai_enabled,false);assert.equal(copied.source,'return {html:"<p>Ready</p>"};');
  await assert.rejects(f.component(db,ai,ew.id,copy.id),/not found/);
  assert.deepEqual(await f.confirm(a,ew.id,copyPreview.id,copyPreview.digest),copy);
  const control=await engine.prepareControl(ai,w.id,'grant',{revisionId:fn.revisionId,typeIds:[cleanType],maxChanges:2,future:true});await assert.rejects(engine.confirmControl(ai,w.id,control.id,control.digest),/cannot approve/);const g=await engine.confirmControl(a,w.id,control.id,control.digest);assert.equal(g.fields[0],'name');assert.deepEqual(await engine.confirmControl(a,w.id,control.id,control.digest),g);
  assert.ok((await s.exportWorkspace(a,w.id)).record_field_changes.length>0);
 }finally{await pg.close();}
});

test('Selected reversal is atomic, groups fields per record, and retains filtered authorization evidence',async()=>{
 const pg=new PGlite();try{
  for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+f,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
  const a:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...a,origin:'ai'};
  await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'batch@example.invalid','Tester']);
  const s=new Service(db),w=await s.createWorkspace(a,'Batch reversal');await s.setAi(a,w.id,true);
  const save=async(op:any)=>{const p=await s.preview(a,w.id,op);return s.commit(a,p.id,p.digest);};
  const typeId=(await save({kind:'create_type',name:'Values',fields:[{key:'name',name:'Name',kind:'text'},{key:'note',name:'Note',kind:'text'},{key:'secret',name:'Secret',kind:'text',ai:false}]})).objects[0].id;
  const first=(await save({kind:'create_record',typeId,data:{name:'First',note:'Old',secret:'Private'}})).objects[0].id;
  const second=(await save({kind:'create_record',typeId,data:{name:'Second'}})).objects[0].id;
  const update=await save({kind:'bulk_records',changes:[{kind:'update_record',recordId:first,expectedVersion:0,data:{name:'Changed',note:'New',secret:'New private'}},{kind:'update_record',recordId:second,expectedVersion:0,data:{name:'Also changed'}}]});
  const query={changeSetId:update.previewId};const all=(await s.fieldChanges(a,w.id,query)).changes;assert.equal(all.length,4);
  assert.equal((await s.fieldChanges(ai,w.id,query)).changes.length,3);
  assert.equal((await s.fieldChanges(a,w.id,{...query,actorId:randomUUID()})).changes.length,0);
  assert.equal((await s.fieldChanges(a,w.id,{...query,authorizationKind:'maintenance_grant'})).changes.length,0);
  assert.equal((await s.fieldChanges(a,w.id,{...query,since:'2100-01-01T00:00:00.000Z'})).changes.length,0);
  const operation={kind:'reverse_field_changes',changes:all.map(c=>({changeId:c.id,expectedVersion:c.record_version})),reason:'Undo reviewed batch'};
  await assert.rejects(s.preview(ai,w.id,operation),/cannot be reversed/);
  await assert.rejects(s.preview(a,w.id,{...operation,changes:[operation.changes[0],operation.changes[0]]}),/only once/);
  const preview=await s.preview(a,w.id,operation);assert.equal(preview.summary.fieldChanges.length,4);
  await assert.rejects(s.commit(ai,preview.id,preview.digest),/cannot approve/);
  const undone=await s.commit(a,preview.id,preview.digest);assert.equal(undone.objects.length,2);assert.ok(undone.objects.every((o:any)=>o.version===2));
  assert.deepEqual(await s.commit(a,preview.id,preview.digest),undone);
  const records=(await s.records(a,w.id,typeId)).rows;assert.equal(records.find(r=>r.id===first).data.note,'Old');assert.equal(records.find(r=>r.id===second).data.name,'Second');
  const ledger=(await s.fieldChanges(a,w.id,{changeSetId:preview.id})).changes;assert.equal(ledger.length,4);assert.deepEqual(new Set(ledger[0].authorization.reverses),new Set(all.map(c=>c.id)));
  const stale=await s.preview(a,w.id,{...operation,changes:ledger.map(c=>({changeId:c.id,expectedVersion:2}))});
  await save({kind:'update_record',recordId:second,expectedVersion:2,data:{name:'Later work'}});
  await assert.rejects(s.commit(a,stale.id,stale.digest),/Later changes/);
  assert.equal((await s.records(a,w.id,typeId)).rows.find(r=>r.id===first).version,2);
  assert.equal((await s.fieldChanges(a,w.id,{changeSetId:stale.id})).changes.length,0);
 }finally{await pg.close();}
});

test('Creation archival preserves data, checks linked work, requires approval and restores through new history',async()=>{
 const pg=new PGlite();try{
  for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+f,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
  const a:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...a,origin:'ai'};
  await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'archive@example.invalid','Tester']);
  const s=new Service(db),w=await s.createWorkspace(a,'Archive');await s.setAi(a,w.id,true);
  const save=async(op:any)=>{const p=await s.preview(a,w.id,op);return s.commit(a,p.id,p.digest);};
  const type=(await save({kind:'create_type',name:'New entries',fields:[{key:'a',name:'A',kind:'number'},{key:'b',name:'B',kind:'number'},{key:'total',name:'Total',kind:'number',formula:{operator:'sum',fields:['a','b']}}]})).objects[0].id;
  const record=(await save({kind:'create_record',typeId:type,data:{a:2,b:3}})).objects[0].id;
  const operation={kind:'archive_created_record',recordId:record,expectedVersion:0,reason:'Unwanted import'};
  const preview=await s.preview(ai,w.id,operation);assert.equal(preview.summary.data.total,5);assert.equal(preview.summary.afterState,'archived');
  await assert.rejects(s.commit(ai,preview.id,preview.digest),/cannot approve/);
  const archived=await s.commit(a,preview.id,preview.digest);assert.equal(archived.objects[0].state,'archived');assert.deepEqual(await s.commit(a,preview.id,preview.digest),archived);
  assert.equal((await s.records(a,w.id,type)).total,0);assert.equal((await s.aggregate(a,w.id,type)).totals.count,0);
  assert.equal((await s.records(a,w.id,type,{state:'archived'})).rows[0].data.total,5);assert.equal((await s.records(a,w.id,type,{state:'all'})).total,1);
  const event=(await s.creationArchives(a,w.id)).events[0];assert.equal(event.after_value.authorization.changeSetId,preview.id);
  await save({kind:'restore_archived_creation',archiveEventId:event.id,expectedVersion:1,reason:'Keep the entry'});
  assert.equal((await s.records(a,w.id,type)).rows[0].data.total,5);assert.equal((await s.creationArchives(a,w.id)).events.length,2);
  await assert.rejects(s.preview(a,w.id,{kind:'restore_archived_creation',archiveEventId:event.id,expectedVersion:2,reason:'Duplicate restore'}),/no longer/);
  // Derived fields are recalculated when reversing an editable input.
  await save({kind:'update_record',recordId:record,expectedVersion:2,data:{a:7}});
  const change=(await s.fieldChanges(a,w.id,{recordId:record})).changes.find(c=>c.record_version===3&&c.field_key==='a');
  await save({kind:'reverse_field_change',changeId:change.id,expectedVersion:3,reason:'Restore input'});assert.equal((await s.records(a,w.id,type)).rows[0].data.total,5);
  // A new incoming relationship after preview must invalidate the save, even from a hidden table.
  const other=(await save({kind:'create_record',typeId:type,data:{a:1,b:1}})).objects[0].id;
  const references=(await save({kind:'create_type',name:'References',fields:[{key:'target',name:'Target',kind:'relationship',targetTypeId:type,ai:false}]})).objects[0].id;
  const beforeLink=await s.preview(a,w.id,{...operation,recordId:other});
  await save({kind:'create_record',typeId:references,data:{target:other}});
  await assert.rejects(s.commit(a,beforeLink.id,beforeLink.digest),/linked work/);assert.equal((await s.records(a,w.id,type)).total,2);
  await assert.rejects(s.preview(ai,w.id,{...operation,recordId:other}),/linked work/);
  const privateRecord=(await save({kind:'create_record',typeId:references,data:{}})).objects[0].id;
  await assert.rejects(s.preview(ai,w.id,{...operation,recordId:privateRecord}),/every field/);
  const protectedDraft=await s.preview(a,w.id,{...operation,recordId:privateRecord});await s.commit(a,protectedDraft.id,protectedDraft.digest);
  assert.ok(!(await s.creationArchives(ai,w.id)).events.some(e=>e.record_id===privateRecord));
  assert.equal((await s.exportWorkspace(a,w.id)).records.find((r:any)=>r.id===record).data.total,5);
  await assert.rejects(db.query('DELETE FROM audit_events WHERE id=$1',[event.id]),/append-only/);
 }finally{await pg.close();}
});

test('Folder archival retains contents and invalidates attached execution without reviving it on restore',async()=>{
 const pg=new PGlite();try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
  const a:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...a,origin:'ai'};
  await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'project-archive@example.invalid','Tester']);
  const s=new Service(db),f=new WorkspaceFoundation(db),engine=new Foundation(db),w=await s.createWorkspace(a,'Projects');await s.setAi(a,w.id,true);
  const confirm=async(op:any)=>{const p=await f.preview(a,w.id,op);return f.confirm(a,w.id,p.id,p.digest);};
  const tp=await s.preview(a,w.id,{kind:'create_type',name:'Entries',fields:[{key:'name',name:'Name',kind:'text'}]});const typeId=(await s.commit(a,tp.id,tp.digest)).objects[0].id;
  const folder=await confirm({kind:'create_node',nodeKind:'folder',name:'Folder'}),project=await confirm({kind:'create_node',nodeKind:'project',name:'Project',parentId:folder.id});
  const fp=await engine.prepareFunction(a,w.id,{name:'Echo',source:'return input;',scope:{capabilities:[],typeIds:[],documents:false},inputContract:{type:'any'},outputContract:{type:'any'}});const fn=await engine.saveFunction(a,w.id,fp.id,fp.digest);
  const component=await confirm({kind:'save_component',projectId:project.id,content:{name:'Runner',format:'frontend-js',source:'return {html:"<p>Retained</p>"};',execution:[{name:'echo',revisionId:fn.revisionId}]}});
  const scope=await confirm({kind:'save_scope',scope:{projectId:project.id,purpose:'Track entries',inclusionCriteria:'Chosen entries',sourcePolicy:'User input',basis:'tracking',bindings:[{typeId,fields:['name']}],allowCreate:true,allowUpdate:true,autoWrite:true,expiresAt:new Date(Date.now()+86400000).toISOString()}});
  const context={id:component.id,version:0,binding:'echo'};
  const schedule=await engine.schedule(a,w.id,{revisionId:fn.revisionId,input:null,intervalMinutes:60,componentContext:context});
  const queued=await f.invokeComponent(ai,w.id,{componentId:component.id,expectedVersion:0,binding:'echo',input:{retained:true},requestKey:randomUUID()});
  const op={kind:'archive_node',nodeId:folder.id,expectedVersion:0,archived:true,reason:'End this work'};
  const stale=await f.preview(ai,w.id,op);assert.equal(stale.projectArchive?.components.length,1);
  await confirm({kind:'save_component',projectId:project.id,content:{name:'Later component',format:'text',source:'Keep me'}});
  await assert.rejects(f.confirm(a,w.id,stale.id,stale.digest),/changed/);
  const preview=await f.preview(ai,w.id,op);await assert.rejects(f.confirm(ai,w.id,preview.id,preview.digest),/cannot approve/);
  await f.confirm(a,w.id,preview.id,preview.digest);
  assert.equal((await f.nodes(a,w.id)).nodes.find(n=>n.id===project.id).effective_archived,true);
  const c=await f.component(db,a,w.id,component.id);assert.equal(c.project_archived,true);assert.deepEqual(c.execution,[]);assert.equal(c.version,1);assert.match(c.source,/Retained/);
  assert.ok((await db.query('SELECT revoked_at FROM maintenance_scopes WHERE id=$1',[scope.id])).rows[0].revoked_at);
  assert.equal((await engine.schedules(a,w.id)).find(x=>x.id===schedule.id).paused,true);
  await assert.rejects(engine.run(ai,w.id,queued.id),/Component changed/);
  await assert.rejects(f.runFrontend(ai,w.id,{componentId:component.id,expectedVersion:1}),(e:any)=>e.code==='component_archived');
  await assert.rejects(f.preview(a,w.id,{kind:'move_node',nodeId:project.id,expectedVersion:0,parentId:null}),/Restore/);
  await confirm({...op,expectedVersion:1,archived:false,reason:'Reopen organization'});
  assert.equal((await f.nodes(a,w.id)).nodes.find(n=>n.id===project.id).effective_archived,false);
  assert.deepEqual((await f.component(db,a,w.id,component.id)).execution,[]);
  await assert.rejects(engine.checkComponent(ai,w.id,context,fn.revisionId),/Component changed/);
  assert.equal((await engine.schedules(a,w.id)).find(x=>x.id===schedule.id).paused,true);
  const exported=await s.exportWorkspace(a,w.id);assert.equal(exported.workspace_components.length,2);assert.ok(exported.revisions.some((r:any)=>r.object_id===component.id&&r.version===1));
 }finally{await pg.close();}
});
