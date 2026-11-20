import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {addWorkspaceMcp} from '../src/server/workspace-foundation.js';
import {addAppMcp} from '../src/server/apps.js';

async function setup(){
 const pg=new PGlite();const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const owner={userId:randomUUID(),origin:'human' as const},ai={...owner,origin:'ai' as const,assistant:'claude' as const};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[owner.userId,owner.userId,'install@example.invalid','Installer']);
 const s=new Service(db),f=new WorkspaceFoundation(db),w=await s.createWorkspace(owner,'Install');await s.setAi(owner,w.id,true);
 const table=async(name:string)=>{const p=await s.preview(owner,w.id,{kind:'create_type',name,fields:[{key:'name',name:'Name',kind:'text',ai:true}]});return (await s.commit(owner,p.id,p.digest)).objects[0].id as string;};
 const handlers=new Map<string,any>();addWorkspaceMcp({registerTool:(name:string,_spec:any,handler:any)=>handlers.set(name,handler)} as any,f,ai,(h:any)=>h,{});
 return {db,s,f,w,owner,ai,table,handlers};
}
const app=(name:string,typeIds:string[],write=true)=>({name,format:'frontend-js',sourceAccess:'bindings',source:`return {html:${JSON.stringify('<h1>'+name+' '+typeIds.join(' ')+'</h1>')}};`,bindings:typeIds.map(typeId=>({typeId,fields:['name']})),
 manifest:{version:1,scope:'workspace',fields:typeIds.map((typeId,i)=>({id:'t'+i+'_name',typeId,field:'name',schemaVersion:0,kind:'text',mode:write?'write':'read'}))}});

test('I2, I3, A1: every new app is saved through the installation popup',async t=>{
 const {db,s,f,w,owner,ai,table,handlers}=await setup();
 try{
  const items=await table('Items');
  const second=await f.preview(owner,w.id,{kind:'create_node',nodeKind:'project',name:'Second project'}),project=await f.confirm(owner,w.id,second.id,second.digest);

  await t.test('without reviewed choices the server refuses, returning what the popup shows',async()=>{
   const draft=await f.preview(ai,w.id,{kind:'save_component',content:app('Built by Claude',[items])}),ready=await f.finalizeAppPreview(ai,w.id,draft.id,draft.digest);
   await assert.rejects(f.confirm(owner,w.id,ready.preview.id,ready.preview.digest,null),(e:any)=>{
    if(e.code!=='installation_required')return false;const {step}=JSON.parse(e.message);
    assert.deepEqual(step.team,{choice:'editor',options:['editor','viewer','none']});
    assert.ok(step.project.options.some((p:any)=>p.id===project.id));
    assert.equal(step.tables.length,1);assert.equal(step.tables[0].typeId,items);return true;});
   // The view's own approval tool sends null when the popup was skipped.
   await assert.rejects(handlers.get('approve_workspace_change')({workspaceId:w.id,previewId:ready.preview.id,digest:ready.preview.digest,confirmed:true}),(e:any)=>e.code==='installation_required');
  });

  await t.test('the popup choices are applied: project, team default, and a table created for the app becomes its own',async()=>{
   const draft=await f.preview(owner,w.id,{kind:'save_component',content:app('Chosen project',[items])});
   const step=await f.appInstallation(owner,w.id,draft.id);
   // Items was created by this person and no other app uses it: it is offered as the app's own table.
   assert.equal(step.tables[0].own,true);assert.deepEqual(step.tables[0].options,['read','write','new']);assert.equal(step.tables[0].choice,'write');
   await assert.rejects(f.confirm(owner,w.id,draft.id,draft.digest,{stepDigest:'0'.repeat(64)}),(e:any)=>e.code==='installation_changed');
   const saved=await f.confirm(owner,w.id,draft.id,draft.digest,{stepDigest:step.digest,projectId:project.id,teamDefault:'viewer'});
   const row=(await db.query('SELECT project_id,team_default_role FROM workspace_components WHERE id=$1',[saved.id])).rows[0];
   assert.deepEqual({...row},{project_id:project.id,team_default_role:'viewer'});
   assert.equal((await db.query('SELECT role FROM app_members WHERE app_id=$1 AND user_id=$2',[saved.id,owner.userId])).rows[0]?.role,'owner','the installer is the first owner');
   assert.equal((await db.query('SELECT origin_app_id FROM entity_types WHERE id=$1',[items])).rows[0].origin_app_id,saved.id);
   const audit=(await db.query("SELECT after_value FROM audit_events WHERE action='app.installed' AND object_id=$1",[saved.id])).rows[0].after_value;
   assert.equal(audit.teamDefault,'viewer');assert.equal(audit.projectId,project.id);
  });

  await t.test('direct template installs that skip the popup are refused',async()=>{
   const tools=new Map<string,any>();addAppMcp({registerTool:(name:string,_spec:any,handler:any)=>tools.set(name,handler)} as any,f,owner,(h:any)=>h,{});
   await assert.rejects(tools.get('install_app_template')({workspaceId:w.id,templateId:'x',version:'1.0.0',digest:'0'.repeat(64),requestKey:randomUUID(),name:'X',confirmed:true}),(e:any)=>e.code==='installation_required');
  });
 }finally{await db.close();}
});

test('I4, I5: table connections show their source and use, default to read-only across apps, and can be replaced by a new table',async t=>{
 const {db,s,f,w,owner,table}=await setup();
 try{
  const shared=await table('Shared contacts'),archived=await table('Old list');
  // Another app already uses Shared contacts.
  const first=await f.preview(owner,w.id,{kind:'save_component',content:app('Contacts app',[shared])});const existing=await f.confirm(owner,w.id,first.id,first.digest);
  await db.query('UPDATE entity_types SET archived_at=now() WHERE id=$1',[archived]);
  const draft=await f.preview(owner,w.id,{kind:'save_component',content:app('Outreach',[shared,archived])});
  const step=await f.appInstallation(owner,w.id,draft.id);
  const [contacts,old]=step.tables;

  await t.test('a table another app uses is read-only by default and names that app as its source',()=>{
   assert.equal(contacts.source,'Contacts app');assert.deepEqual(contacts.apps,['Contacts app']);
   assert.equal(contacts.intended,'write');assert.equal(contacts.choice,'read');assert.deepEqual(contacts.options,['read','write','new']);
  });
  await t.test('an archived source is shown as unavailable, with only a new table offered',()=>{
   assert.equal(old.status,'unavailable');assert.equal(old.reason,'archived');assert.deepEqual(old.options,['new']);
  });
  await t.test('an unavailable table cannot be connected',async()=>{
   await assert.rejects(f.confirm(owner,w.id,draft.id,draft.digest,{stepDigest:step.digest,connections:{[archived]:'read'}}),(e:any)=>e.code==='invalid_connection');
  });
  await db.query('UPDATE entity_types SET archived_at=NULL WHERE id=$1',[archived]);

  const fresh=await f.preview(owner,w.id,{kind:'save_component',content:app('Outreach two',[shared,archived])});
  const again=await f.appInstallation(owner,w.id,fresh.id);
  const saved=await f.confirm(owner,w.id,fresh.id,fresh.digest,{stepDigest:again.digest,connections:{[archived]:'new'}});
  const c=(await f.readComponent(owner,w.id,saved.id)).component;

  await t.test('the read-only default narrows the app’s field contract (writes beyond it are refused by requireManifestWrite)',()=>{
   const m=c.manifest.fields.find((x:any)=>x.typeId===shared);assert.equal(m.mode,'read');
  });
  await t.test('Create new replaces the suggested table with a new empty table, without copying records',async()=>{
   const replaced=c.bindings.find((b:any)=>b.typeId!==shared).typeId;assert.notEqual(replaced,archived);
   const type=(await db.query('SELECT name,origin_app_id FROM entity_types WHERE id=$1',[replaced])).rows[0];
   assert.equal(type.name,'Outreach two · Old list');assert.equal(type.origin_app_id,saved.id);
   assert.ok(c.source.includes(replaced)&&!c.source.includes(archived),'the app now reads the new table');
   assert.equal(Number((await db.query('SELECT count(*) AS n FROM records WHERE type_id=$1',[replaced])).rows[0].n),0);
   assert.ok(existing.id);
  });
 }finally{await db.close();}
});

test('3.4 (A4, I2): approving a change that affects access, connections or automations shows the popup again',async t=>{
 const {db,f,w,owner,ai,table,handlers}=await setup();
 try{
  const items=await table('Items'),notes=await table('Notes');
  const first=await f.preview(owner,w.id,{kind:'save_component',content:app('Board',[items])});
  const step=await f.appInstallation(owner,w.id,first.id),saved=await f.confirm(owner,w.id,first.id,first.digest,{stepDigest:step.digest});
  const version=async()=>(await db.query('SELECT version FROM workspace_components WHERE id=$1',[saved.id])).rows[0].version;
  const prepare=async(content:any)=>{const d=await f.preview(ai,w.id,{kind:'save_component',componentId:saved.id,expectedVersion:await version(),content});return (await f.finalizeAppPreview(ai,w.id,d.id,d.digest)).preview;};
  const approve=(p:any,installation?:any)=>handlers.get('approve_workspace_change')({workspaceId:w.id,previewId:p.id,digest:p.digest,confirmed:true,...(installation?{installation}:{})});

  await t.test('a change to the app’s own code alone is approved directly',async()=>{
   const p=await prepare({...app('Board',[items]),source:'return {html:"<h1>Board v2</h1>"};'});
   assert.equal((await f.appInstallation(owner,w.id,p.id)).impact,null);
   assert.ok((await approve(p)).id);
  });
  await t.test('a new table connection needs the popup, with only that section',async()=>{
   const p=await prepare(app('Board',[items,notes]));
   const {impact}=await f.appInstallation(owner,w.id,p.id);
   assert.equal(impact.kind,'change');assert.equal(impact.access,null);assert.deepEqual(impact.tables.map((x:any)=>x.typeId),[notes]);
   await assert.rejects(approve(p),(e:any)=>e.code==='installation_required'&&JSON.parse(e.message).step.digest===impact.digest);
   assert.ok((await approve(p,{stepDigest:impact.digest,connections:{[notes]:'read'}})).id);
   const c=(await f.readComponent(owner,w.id,saved.id)).component;assert.equal(c.manifest.fields.find((m:any)=>m.typeId===notes).mode,'read');
   assert.ok((await db.query("SELECT 1 FROM audit_events WHERE action='app.change_reviewed' AND object_id=$1",[saved.id])).rows.length);
  });
  await t.test('opening the app to people who can read its tables is an access change',async()=>{
   const p=await prepare({...app('Board',[items,notes]),sourceAccess:'workspace'});
   const {impact}=await f.appInstallation(owner,w.id,p.id);
   assert.deepEqual([impact.access.from,impact.access.to],['bindings','workspace']);assert.deepEqual(impact.tables,[]);assert.deepEqual(impact.removedTables,[]);
   await assert.rejects(approve(p),(e:any)=>e.code==='installation_required');
   assert.ok((await approve(p,{stepDigest:impact.digest})).id);
  });
 }finally{await db.close();}
});

test('A13 (3.6): dependency warnings for app and schema changes',async t=>{
 const {db,s,f,w,owner,ai,table}=await setup();
 try{
  const items=await table('Items'),notes=await table('Notes');
  const first=await f.preview(owner,w.id,{kind:'save_component',content:app('Tracker',[items,notes])});
  const saved=await f.confirm(owner,w.id,first.id,first.digest);
  // An automation of this app is triggered by Notes (inserted directly: only its configuration matters here).
  const automation=randomUUID();
  await db.query("INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,approved_by) VALUES($1,$2,$3,$4,$5,$3)",[automation,w.id,owner.userId,saved.id,JSON.stringify({name:'Weekly notes digest',trigger:{kind:'record_created',typeId:notes}})]);
  const version=async()=>(await db.query('SELECT version FROM workspace_components WHERE id=$1',[saved.id])).rows[0].version;

  await t.test('a change that affects nothing returns no report',async()=>{
   const p=await f.preview(ai,w.id,{kind:'save_component',componentId:saved.id,expectedVersion:await version(),content:{...app('Tracker',[items,notes]),source:'return {html:"<h1>v2</h1>"};'}});
   assert.equal('dependencies' in p,false);await f.discard(ai,w.id,p.id);
  });
  await t.test('removing a table an automation relies on is reported to the assistant, then refused at save',async()=>{
   const p=await f.preview(ai,w.id,{kind:'save_component',componentId:saved.id,expectedVersion:await version(),content:app('Tracker',[items])});
   assert.deepEqual(p.dependencies.map((d:any)=>[d.kind,d.id,d.name,d.breaking]),[['automation',automation,'Weekly notes digest',true]]);
   assert.match(p.dependencySummary,/Weekly notes digest/);assert.ok(p.dependencyNote);
   const ready=await f.finalizeAppPreview(ai,w.id,p.id,p.digest);
   await assert.rejects(f.confirm(owner,w.id,ready.preview.id,ready.preview.digest),(e:any)=>e.code==='dependency_breaks'&&JSON.parse(e.message).dependencies[0].id===automation);
   // Once the automation is resolved (here: deleted), the same change saves.
   await db.query('UPDATE app_actions SET paused=true,deleted_at=now() WHERE id=$1',[automation]);
   assert.ok((await f.confirm(owner,w.id,ready.preview.id,ready.preview.digest)).id);
  });
  await t.test('a schema change reports the apps that show the field, and is refused if that changed since it was prepared',async()=>{
   const type=(await db.query('SELECT version,fields FROM entity_types WHERE id=$1',[items])).rows[0];
   const change={kind:'update_type',typeId:items,expectedVersion:type.version,name:'Items',fields:[{key:'title',name:'Title',kind:'text',ai:true}]};
   const p=await s.preview(owner,w.id,change);
   const summary=(await db.query('SELECT summary FROM data_previews WHERE id=$1',[p.id])).rows[0].summary;
   assert.deepEqual(summary.dependencies.map((d:any)=>[d.kind,d.name,d.breaking]),[['app','Tracker',true]]);
   // Another app starts showing the field before the change is saved: the person must see the new report first.
   const other=await f.preview(owner,w.id,{kind:'save_component',content:app('Second',[items])});await f.confirm(owner,w.id,other.id,other.digest);
   await assert.rejects(s.commit(owner,p.id,p.digest),(e:any)=>e.code==='dependencies_changed');
  });
 }finally{await db.close();}
});
