import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {operationalStatus} from '../src/domain/operations.js';
import type {Actor} from '../src/shared/schema.js';
test('Task setup, project relationships, exact alias correction, collection consent and scoped generated interfaces',async()=>{
 const pg=new PGlite();try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
  const a:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...a,origin:'ai'},editor:Actor={userId:randomUUID(),origin:'human'};
  for(const actor of [a,editor])await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,actor.userId+'@example.invalid','Tester']);
  const s=new Service(db),f=new WorkspaceFoundation(db),w=await s.createWorkspace(a,'Foundation flow');await s.setAi(a,w.id,true);
  const save=async(op:any)=>{const p=await s.preview(a,w.id,op);return s.commit(a,p.id,p.digest);};
  const approve=async(op:any)=>{const p=await f.preview(ai,w.id,op);return f.confirm(a,w.id,p.id,p.digest);};
  const project=await approve({kind:'create_node',nodeKind:'project',name:'Engagement'});
  const setup={kind:'setup_tracking',projectId:project.id,expectedProjectVersion:0,purpose:'Keep track of companies',inclusionCriteria:'Companies selected for engagement',sourcePolicy:'Information supplied for this task',basis:'tracking',table:{kind:'new',concept:'organization',name:'Companies',fields:[{key:'name',name:'Name',kind:'text',unique:true}]},initialRows:[{name:'Original'},{name:'Alternative'}]};
  const draft=await f.preview(ai,w.id,setup);assert.equal((await s.types(a,w.id)).length,0);await assert.rejects(f.confirm(ai,w.id,draft.id,draft.digest),/cannot approve/);
  await assert.rejects(f.preview(ai,w.id,{...setup,initialRows:[{name:'Duplicate'},{name:'Duplicate'}]}),/duplicate/);
  const configured=await f.confirm(a,w.id,draft.id,draft.digest);assert.equal((await s.types(a,w.id))[0].concept,'organization');assert.equal((await f.projectRecords(a,w.id,project.id)).records.length,2);assert.equal((await f.scopes(ai,w.id))[0].body.autoWrite,false);assert.deepEqual(await f.confirm(a,w.id,draft.id,draft.digest),configured);
  const [source,target]=configured.recordIds;
  const link=await approve({kind:'link_identity',sourceRecordId:source,preferredRecordId:target,sourceVersion:0,preferredVersion:0,rationale:'Possible duplicate'});
  // Unique names prevent copying until this is explicitly removed from the schema.
  await assert.rejects(f.preview(ai,w.id,{kind:'propagate_linked_values',sourceRecordId:source,sourceVersion:0,fields:['name'],targets:[{recordId:target,expectedVersion:0,linkId:link.id,linkKind:'same_table'}],reason:'Explicit correction'}),/unique/);
  await save({kind:'update_type',typeId:configured.typeId,expectedVersion:0,name:'Companies',fields:[{key:'name',name:'Name',kind:'text'}]});
  const correction={kind:'propagate_linked_values',sourceRecordId:source,sourceVersion:0,fields:['name'],targets:[{recordId:target,expectedVersion:0,linkId:link.id,linkKind:'same_table'}],reason:'Explicit correction'};
  const cp=await f.preview(ai,w.id,correction);assert.equal(cp.fieldChanges[0].before,'Alternative');assert.equal(cp.fieldChanges[0].after,'Original');await f.confirm(a,w.id,cp.id,cp.digest);
  assert.ok((await s.fieldChanges(a,w.id)).changes.some(c=>c.authorization.id===cp.id));assert.equal((await s.records(a,w.id,configured.typeId)).rows.find(r=>r.id===source).version,0);
  await assert.rejects(f.preview(ai,w.id,correction),/changed/);
  const contacts=(await save({kind:'create_type',name:'Contacts',fields:[{key:'name',name:'Name',kind:'text'},{key:'company',name:'Company',kind:'relationship',targetTypeId:configured.typeId}]})).objects[0].id;
  const person=(await save({kind:'create_record',typeId:contacts,data:{name:'Contact',company:source}})).objects[0].id;
  await approve({kind:'link_project_records',projectId:project.id,expectedProjectVersion:0,records:[{recordId:person,expectedVersion:0}],reason:'Project contact'});
  assert.equal((await f.projectRelationships(ai,w.id,project.id)).relationships[0].target.id,source);
  const p2=await approve({kind:'create_node',nodeKind:'project',name:'Separate'});assert.equal((await f.projectRelationships(ai,w.id,p2.id)).relationships.length,0);
  const collection=await f.preview(ai,w.id,{kind:'create_collection_link',config:{kind:'form',name:'Provide company name',typeId:configured.typeId,fields:['name'],days:7}});await assert.rejects(f.confirm(ai,w.id,collection.id,collection.digest),/cannot approve/);const publicLink=await f.confirm(a,w.id,collection.id,collection.digest);assert.match(publicLink.url,/collect#/);assert.equal((await db.query('SELECT count(*)::int AS n FROM form_submissions')).rows[0].n,0);const submissionId=randomUUID();await db.query('INSERT INTO form_submissions(id,workspace_id,link_id,type_id,nonce,data) VALUES($1,$2,$3,$4,$5,$6)',[submissionId,w.id,publicLink.id,configured.typeId,randomUUID(),JSON.stringify({name:'Submitted'})]);assert.equal((await f.collectionResponses(ai,w.id)).responses[0].data.name,'Submitted');const intake=await f.preview(ai,w.id,{kind:'accept_collection_response',submissionId,data:{name:'Reviewed submission'}});assert.equal(intake.fieldChanges[0].after,'Reviewed submission');await assert.rejects(f.confirm(ai,w.id,intake.id,intake.digest),/cannot approve/);await f.confirm(a,w.id,intake.id,intake.digest);assert.ok((await f.collectionResponses(ai,w.id)).responses[0].record_id);await approve({kind:'revoke_collection_link',linkId:publicLink.id,reason:'Finished collection'});assert.ok((await db.query('SELECT revoked_at FROM external_links WHERE id=$1',[publicLink.id])).rows[0].revoked_at);
  const retiredResponse=randomUUID();await db.query('INSERT INTO form_submissions(id,workspace_id,link_id,type_id,nonce,data) VALUES($1,$2,$3,$4,$5,$6)',[retiredResponse,w.id,publicLink.id,configured.typeId,randomUUID(),JSON.stringify({name:'Retained response',retiredSecret:'Human source only'})]);
  await assert.rejects(f.preview(ai,w.id,{kind:'accept_collection_response',submissionId:retiredResponse,data:{name:'Retained response'}}),/retired|unavailable/);
  const privateType=(await save({kind:'create_type',name:'Restricted',fields:[{key:'secret',name:'Secret',kind:'text',ai:false}]})).objects[0].id;
  await save({kind:'create_record',typeId:privateType,data:{secret:'Do not share'}});
  await s.share(a,w.id,editor.userId,'editor',[],[configured.typeId],true);
  const content={name:'Bound interface',format:'frontend-js',sourceAccess:'bindings',bindings:[{typeId:configured.typeId,fields:['name']}],source:`const project=tools.call('project.records',{});if(project.records.some(r=>r.typeId!==${JSON.stringify(configured.typeId)}))throw new Error('scope leak');const rows=tools.call('records.read',{typeId:${JSON.stringify(configured.typeId)}}).rows;if(input.event.action==='edit')tools.call('records.propose',[{kind:'update_record',recordId:rows[0].id,expectedVersion:rows[0].version,data:{name:'Human correction'}}]);return {html:'<p>'+rows[0].data.name+'</p>'};`};
  await assert.rejects(f.preview(ai,w.id,{kind:'save_component',projectId:project.id,content}),/generic cannot bypass/);
  const componentPreview=await f.preview(a,w.id,{kind:'save_component',projectId:project.id,content});const component=await f.confirm(a,w.id,componentPreview.id,componentPreview.digest);assert.equal((await f.readComponent(editor,w.id,component.id)).component.source_access,'bindings');assert.equal((await f.nodes(editor,w.id)).nodes.length,1);
  await assert.rejects(f.preview(editor,w.id,{kind:'save_component',projectId:project.id,content}),/Only an owner/);
  const run=await f.runFrontend(editor,w.id,{componentId:component.id,expectedVersion:0,event:{kind:'click',action:'edit'}});assert.ok(run.proposal);await f.confirm(editor,w.id,run.proposal.id,run.proposal.digest);assert.ok((await s.records(editor,w.id,configured.typeId)).rows.some(r=>r.data.name==='Human correction'));
  // New field restriction blocks even owner-approved source access when a required binding is hidden.
  await s.share(a,w.id,editor.userId,'editor',['name'],[configured.typeId],true);await assert.rejects(f.readComponent(editor,w.id,component.id),/unavailable/);
  const filePreview=await s.previewFile(a,w.id,{filename:'source.txt',mime:'text/plain',bytes:Buffer.from('Saved source'),ai:true});const file=(await s.commit(a,filePreview.id,filePreview.digest)).objects[0] as any;
  await db.query("UPDATE extractions SET status='ready',text_content='Saved source' WHERE version_id=$1",[file.versionId]);
  const fileComponent=await approve({kind:'save_component',projectId:project.id,content:{name:'Attached text',format:'frontend-js',sourceAccess:'bindings',assets:[{name:'source',versionId:file.versionId}],source:"const source=tools.call('files.text',{name:'source'});return {html:'<p>'+source.text+'</p>'};"}});
  assert.match((await f.runFrontend(ai,w.id,{componentId:fileComponent.id,expectedVersion:0})).html,/Saved source/);
  const independentCopy=await approve({kind:'copy_component',sourceComponentId:fileComponent.id,expectedVersion:0,projectId:null,name:'Independent copy'});assert.equal((await f.readComponent(a,w.id,independentCopy.id)).component.project_id,null);
  const copied=await approve({kind:'copy_component',sourceComponentId:fileComponent.id,expectedVersion:0,projectId:project.id,name:'Copied attachment'});
  assert.equal((await f.readComponent(a,w.id,copied.id)).component.assets[0].versionId,file.versionId);
  await s.setAccessRules(a,w.id,{expectedVersion:(await s.accessRules(a,w.id)).version,aiHiddenTypes:[],document:{documentId:file.id,allowedUsers:null,ai:false,expectedVersion:-1}});
  await assert.rejects(f.runFrontend(ai,w.id,{componentId:fileComponent.id,expectedVersion:0}),/unavailable|access/);
  assert.equal((await operationalStatus(db,a,w.id)).worker.status,'no_recent_heartbeat');await db.query("INSERT INTO worker_health(id,last_success_at) VALUES('synthetic',now())");assert.equal((await operationalStatus(db,a,w.id)).worker.status,'recent_heartbeat');await assert.rejects(operationalStatus(db,ai,w.id),/Human owner/);
 }finally{await pg.close();}
});

