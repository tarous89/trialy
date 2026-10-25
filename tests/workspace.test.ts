import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import type {Actor} from '../src/shared/schema.js';
test('Workspace: exact setup, bounded maintenance, source preservation, reversible identity and isolation',async()=>{
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(s,v)=>pg.query(s,v) as any,transaction:f=>pg.transaction(tx=>f(tx as Connection)),close:()=>pg.close()};
 try{
 const s=new Service(db),f=new WorkspaceFoundation(db),a:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...a,origin:'ai'},other:Actor={userId:randomUUID(),origin:'human'};
 for(const u of [a,other])await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[u.userId,u.userId,'synthetic@example.invalid','Synthetic']);
 const w=await s.createWorkspace(a,'Workspace'),outside=await s.createWorkspace(other,'Other');await s.setAi(a,w.id,true);
 const save=async(op:any)=>{const p=await s.preview(a,w.id,op);return s.commit(a,p.id,p.digest);};
 const change=async(op:any)=>{const p=await f.preview(ai,w.id,op);return f.confirm(a,w.id,p.id,p.digest);};
 const draft=await f.preview(ai,w.id,{kind:'create_node',nodeKind:'folder',name:'Research'});assert.equal((await f.nodes(ai,w.id)).nodes.length,0);
 const folder=await f.confirm(a,w.id,draft.id,draft.digest);assert.deepEqual(await f.confirm(a,w.id,draft.id,draft.digest),folder);
 const project=await change({kind:'create_node',nodeKind:'project',name:'Partner engagement',parentId:folder.id});
 await assert.rejects(change({kind:'move_node',nodeId:folder.id,expectedVersion:0,parentId:folder.id}),/itself/);
 await assert.rejects(f.nodes(other,w.id));await assert.rejects(f.preview(a,outside.id,{kind:'create_node',nodeKind:'project',name:'No'}));
 const table=(await save({kind:'create_type',name:'Organizations',fields:[{key:'name',name:'Name',kind:'text',ai:true},{key:'address',name:'Address',kind:'text',ai:true}]})).objects[0].id;
 // Component previews are durable drafts; saving source never executes it.
 const componentInput={kind:'save_component',projectId:project.id,content:{name:'Outreach view',format:'html',source:'<script>throw new Error("must stay inert")</script>',bindings:[{typeId:table,fields:['name']}]}};
 const componentDraft=await f.preview(ai,w.id,componentInput);assert.equal((await f.components(ai,w.id)).length,0);
 const fresh=new WorkspaceFoundation(db);const component=await fresh.confirm(a,w.id,componentDraft.id,componentDraft.digest);
 assert.equal((await f.readComponent(ai,w.id,component.id)).component.source,componentInput.content.source);
 assert.equal((await f.componentHistory(ai,w.id,component.id)).length,1);
 await assert.rejects(f.readComponent(other,w.id,component.id));await assert.rejects(f.readComponent(a,outside.id,component.id));
 await change({...componentInput,componentId:component.id,expectedVersion:0,content:{...componentInput.content,source:'New version'}});
 await assert.rejects(change({...componentInput,componentId:component.id,expectedVersion:0}),/changed/);
 const destination=await change({kind:'create_node',nodeKind:'project',name:'Conference'});
 await change({kind:'move_component',componentId:component.id,expectedVersion:1,projectId:destination.id});
 await change({kind:'restore_component',componentId:component.id,expectedVersion:2,revisionVersion:0});
 const restored=(await f.readComponent(a,w.id,component.id)).component;assert.equal(restored.source,componentInput.content.source);assert.equal(restored.project_id,destination.id);assert.equal(restored.version,3);
 await change({kind:'archive_component',componentId:component.id,expectedVersion:3,archived:true});
 assert.equal((await f.componentHistory(a,w.id,component.id)).length,5);
 await assert.rejects(change({...componentInput,projectId:folder.id}),/Choose a project/);
 await assert.rejects(change({...componentInput,content:{...componentInput.content,format:'json',source:'not JSON'}}),/valid JSON/);
 const body={autoWrite:true,expiresAt:new Date(Date.now()+86400000).toISOString(),projectId:project.id,purpose:'CRO outreach',inclusionCriteria:'CROs involved in this project',sourcePolicy:'Information supplied in authorized project work',basis:'tracking',bindings:[{typeId:table,fields:['name']}],allowCreate:true,allowUpdate:true,allowIdentityLinks:true,maxChanges:5};
 const scope=await change({kind:'save_scope',scope:body});
 const batch={requestKey:randomUUID(),scopeId:scope.id,expectedScopeVersion:0,sourceLabel:'User supplied shortlist',interpretation:'Two eligible CRO name observations',changes:[{kind:'create_record',typeId:table,data:{name:'Example CRO Ltd'}},{kind:'create_record',typeId:table,data:{name:'Example CRO'}}]};
 const receipt=await f.maintain(ai,w.id,batch);assert.equal(receipt.recordIds.length,2);assert.deepEqual(await f.maintain(ai,w.id,batch),receipt);assert.equal((await s.records(a,w.id,table)).total,2);
 await assert.rejects(f.maintain(ai,w.id,{...batch,interpretation:'Changed request'}),/match/);
 await assert.rejects(f.maintain(ai,w.id,{...batch,requestKey:randomUUID(),changes:[{kind:'update_record',recordId:receipt.recordIds[0],expectedVersion:0,data:{address:'Out of scope'}}]}),/approved/);
 const link=await change({kind:'link_identity',sourceRecordId:receipt.recordIds[1],preferredRecordId:receipt.recordIds[0],sourceVersion:0,preferredVersion:0,rationale:'User confirmed matching identity'});
 let evidence=await f.evidence(ai,w.id,receipt.recordIds[1]);assert.equal(evidence.links.length,1);assert.equal(evidence.observations[0].data.name,'Example CRO');assert.equal((await s.records(a,w.id,table)).total,2);
 await change({kind:'unlink_identity',linkId:link.id,expectedVersion:0,reason:'Different legal entities'});assert.ok((await f.evidence(ai,w.id,receipt.recordIds[1])).links[0].revoked_at);
 const update={...batch,requestKey:randomUUID(),changes:[{kind:'update_record',recordId:receipt.recordIds[0],expectedVersion:0,data:{name:'Revised name'}}]};await f.maintain(ai,w.id,update);
 const history=await f.evidence(ai,w.id,receipt.recordIds[0]);assert.equal(history.observations.length,2);assert.equal(history.observations[1].data.name,'Example CRO Ltd');
 // Late failure must roll back earlier mutations and observations.
 await assert.rejects(f.maintain(ai,w.id,{...batch,requestKey:randomUUID(),changes:[{kind:'create_record',typeId:table,data:{name:'Must roll back'}},{kind:'update_record',recordId:receipt.recordIds[0],expectedVersion:0,data:{name:'Stale'}}]}));assert.equal((await s.records(a,w.id,table)).total,2);
 await save({kind:'update_type',typeId:table,expectedVersion:0,name:'Organizations',fields:[{key:'name',name:'Name',kind:'text',ai:true},{key:'address',name:'Address',kind:'text',ai:true},{key:'city',name:'City',kind:'text',ai:true}]});
 assert.equal((await f.scopes(ai,w.id))[0].schemaChanged,true);await assert.rejects(f.maintain(ai,w.id,{...batch,requestKey:randomUUID()}),/schema/);
 const expanded=await change({kind:'save_scope',scopeId:scope.id,expectedVersion:0,scope:{...body,bindings:[{typeId:table,fields:['name','address']}]}});assert.equal(expanded.version,1);
 await f.maintain(ai,w.id,{...batch,requestKey:randomUUID(),expectedScopeVersion:1,changes:[{kind:'update_record',recordId:receipt.recordIds[0],expectedVersion:1,data:{address:'Approved address'}}]});
 await f.revoke(a,w.id,scope.id);await assert.rejects(f.maintain(ai,w.id,{...batch,requestKey:randomUUID(),expectedScopeVersion:1}),/permission changed/);
 await assert.rejects(db.query('UPDATE record_observations SET source_label=$1',['changed']),/append-only/);
 await change({kind:'archive_component',componentId:component.id,expectedVersion:4,archived:false});
 // Fixture represents a legacy interface saved before code-only authoring.
 await db.query("UPDATE workspace_components SET format='trialy-ui' WHERE id=$1",[component.id]);
 const uiSource=JSON.stringify({runtime:'trialy-ui-v1',blocks:[{kind:'text',text:'<script>inert text</script>'},{kind:'table',title:'Organizations',typeId:table,fields:['name']}]});
 await change({kind:'save_component',componentId:component.id,expectedVersion:5,projectId:destination.id,content:{name:'Live organizations',format:'trialy-ui',source:uiSource,bindings:[{typeId:table,fields:['name']}]}});
 const rendered=await f.renderComponent(ai,w.id,component.id,1);assert.equal(rendered.rows.length,2);assert.deepEqual(Object.keys(rendered.rows[0].data),['name']);
 const row=rendered.rows[0];const edit={kind:'edit_component_record',componentId:component.id,expectedVersion:6,recordId:row.id,recordVersion:row.version,field:'name',value:'Inline correction'};
 await assert.rejects(change({...edit,field:'address'}),/not editable/);
 const editPreview=await f.preview(ai,w.id,edit);const edited=await f.confirm(a,w.id,editPreview.id,editPreview.digest);assert.deepEqual(await f.confirm(a,w.id,editPreview.id,editPreview.digest),edited);
 assert.equal((await f.record(db,a,w.id,row.id)).data.name,'Inline correction');await assert.rejects(change(edit),/changed/);
 await assert.rejects(change({kind:'save_component',componentId:component.id,expectedVersion:6,projectId:destination.id,content:{name:'Bad binding',format:'trialy-ui',source:uiSource,bindings:[]}}),/declared/);
 const exported=await s.exportWorkspace(a,w.id);assert.equal(exported.workspace_nodes.length,3);assert.equal(exported.workspace_components.length,1);assert.equal(exported.maintenance_scopes.length,1);assert.equal(exported.identity_links.length,1);assert.equal(exported.record_observations.length,4);
 await save({kind:'update_type',typeId:table,expectedVersion:1,name:'Organizations',fields:[{key:'name',name:'Name',kind:'text',ai:true},{key:'address',name:'Address',kind:'text',ai:true},{key:'city',name:'City',kind:'text',ai:true},{key:'private',name:'Private',kind:'text',ai:false}]});
 await assert.rejects(f.readComponent(ai,w.id,component.id),/every workspace field/);
 assert.equal((await f.readComponent(a,w.id,component.id)).component.id,component.id);
 await s.setAccessRules(a,w.id,{expectedVersion:(await s.accessRules(a,w.id)).version,aiHiddenTypes:[table]});assert.deepEqual((await f.nodes(ai,w.id)).nodes,[]);await assert.rejects(f.readComponent(ai,w.id,component.id));await assert.rejects(f.evidence(ai,w.id,receipt.recordIds[0]));
 }finally{await db.close();}
});
test('Project access: inherited restrictions, sticky moves, stale approval, AI revocation and inspection',async()=>{
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(s,v)=>pg.query(s,v) as any,transaction:f=>pg.transaction(tx=>f(tx as Connection)),close:()=>pg.close()};
 try{
 const s=new Service(db),f=new WorkspaceFoundation(db),owner:Actor={userId:randomUUID(),origin:'human'},member:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...owner,origin:'ai'};
 for(const a of [owner,member])await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'test@example.invalid','Test']);
 const w=await s.createWorkspace(owner,'Access');await s.setAi(owner,w.id,true);await s.share(owner,w.id,member.userId,'editor',[],null,true);
 const change=async(op:any)=>{const p=await f.preview(owner,w.id,op);return f.confirm(owner,w.id,p.id,p.digest);};
 const folder=await change({kind:'create_node',nodeKind:'folder',name:'Restricted'}),project=await change({kind:'create_node',nodeKind:'project',name:'Project',parentId:folder.id}),publicProject=await change({kind:'create_node',nodeKind:'project',name:'Public'});
 const c=await change({kind:'save_component',projectId:project.id,content:{name:'Saved',format:'text',source:'Sensitive content'}});
 assert.equal((await f.components(member,w.id)).length,1);
 const stale=await f.preview(member,w.id,{kind:'rename_node',nodeId:publicProject.id,expectedVersion:0,name:'Changed'});
 await change({kind:'set_project_access',nodeId:folder.id,expectedVersion:0,allowedUsers:[],ai:false});
 assert.equal((await f.nodes(member,w.id)).nodes.length,1);assert.equal((await f.nodes(ai,w.id)).nodes.length,1);assert.equal((await f.components(member,w.id)).length,0);
 await assert.rejects(f.readComponent(ai,w.id,c.id));await assert.rejects(f.componentHistory(member,w.id,c.id));await assert.rejects(f.confirm(member,w.id,stale.id,stale.digest),/changed/);
 await assert.rejects(f.preview(member,w.id,{kind:'set_project_access',nodeId:publicProject.id,expectedVersion:0,allowedUsers:null,ai:true}),/owner/);
 await change({kind:'move_component',componentId:c.id,expectedVersion:0,projectId:publicProject.id});
 await assert.rejects(f.readComponent(member,w.id,c.id));await assert.rejects(f.readComponent(ai,w.id,c.id));
 await change({kind:'move_node',nodeId:project.id,expectedVersion:0,parentId:null});
 assert.equal((await f.nodes(member,w.id)).nodes.length,1);
 await change({kind:'set_component_access',componentId:c.id,expectedVersion:1,allowedUsers:[member.userId],ai:true});
 assert.equal((await f.readComponent(member,w.id,c.id)).component.id,c.id);
 assert.equal((await f.componentHistory(member,w.id,c.id)).length,2); // old restricted-project source revision is hidden
 await s.share(owner,w.id,member.userId,'inspector',[],null,false);await assert.rejects(s.exportWorkspace(member,w.id),/restricted/);await assert.rejects(s.history(member,w.id),/restricted/);
 assert.equal((await s.exportWorkspace(owner,w.id)).workspace_components.length,1);
 }finally{await db.close();}
});

