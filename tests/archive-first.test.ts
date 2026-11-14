import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {AsyncLocalStorage} from 'node:async_hooks';
import {PGlite} from '@electric-sql/pglite';
import {withActor,setDatabaseContext} from '../src/db/context.js';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {schemaCatalog} from '../src/workspace/catalog.js';
import {archivedItems,deleteArchivedItem} from '../src/workspace/archive.js';
import {installCatalogApp} from '../src/workspace/template-catalog.js';
import express from 'express';
import request from 'supertest';
import {addWorkspaceApi} from '../src/server/workspace-foundation.js';
import {foundationClient} from '../src/web/foundation-client.js';

// MODULAR_APPS_AND_SHARED_DATA.md §6: archive first, under the runtime role and RLS.
async function fixture(t:any){
 const pg=new PGlite();t.after(()=>pg.close());for(const n of (await readdir('migrations')).filter(x=>x.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+n,'utf8'));await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();const db:Database={query:async(q,v)=>storage.getStore()?.query(q,v)??db.transaction(tx=>tx.query(q,v)),transaction:async fn=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async raw=>{await raw.exec('SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(q,v)=>{await setDatabaseContext(raw as any);return raw.query(q,v) as any;}};return storage.run(tx,()=>fn(tx));});},close:()=>pg.close()};
 const a={userId:randomUUID(),origin:'human' as const};await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[a.userId,a.userId+'@example.invalid','Owner']);
 const s=new Service(db),f=new WorkspaceFoundation(db);
 const w=await withActor(a,()=>s.createWorkspace(a,'Archive first')),project=randomUUID();await pg.query("INSERT INTO workspace_nodes(id,workspace_id,name,kind) VALUES($1,$2,'Apps','project')",[project,w.id]);
 const run=<T>(fn:()=>Promise<T>)=>withActor(a,fn);
 const createTable=(name:string,keys:string[])=>run(async()=>{const p=await s.preview(a,w.id,{kind:'create_type',name,fields:keys.map(key=>({key,name:key[0].toUpperCase()+key.slice(1),kind:'text',ai:true}))});return (await s.commit(a,p.id,p.digest)).objects[0].id as string;});
 const rawApp=async(name:string,bindings:any[],archived=false)=>{const id=randomUUID();await pg.query("INSERT INTO workspace_components(id,workspace_id,project_id,name,format,source,bindings,source_access,created_by,archived) VALUES($1,$2,$3,$4,'frontend-js','return {html:\"<h1>App</h1>\"};',$5,'bindings',$6,$7)",[id,w.id,project,name,JSON.stringify(bindings),a.userId,archived]);return id;};
 const confirm=(op:any)=>run(async()=>{const p=await f.preview(a,w.id,op);return {preview:p,saved:await f.confirm(a,w.id,p.id,p.digest)};});
 const version=async(id:string)=>(await pg.query<any>('SELECT version FROM workspace_components WHERE id=$1',[id])).rows[0].version;
 const saveBindings=async(id:string,name:string,bindings:any[])=>confirm({kind:'save_component',componentId:id,expectedVersion:await version(id),projectId:project,content:{name,format:'frontend-js',source:'return {html:"<h1>App</h1>"};',sourceAccess:'bindings',bindings}});
 const archive=async(id:string,archived:boolean)=>confirm({kind:'archive_component',componentId:id,expectedVersion:await version(id),archived});
 const type=async(id:string)=>(await pg.query<any>('SELECT * FROM entity_types WHERE id=$1',[id])).rows[0];
 const keys=(fields:any[])=>fields.map((f:any)=>f.key??f.field.key);
 const events=async(action:string)=>Number((await pg.query<any>('SELECT count(*) n FROM audit_events WHERE action=$1',[action])).rows[0].n);
 return {pg,db,a,s,f,w,project,run,createTable,rawApp,confirm,saveBindings,archive,type,keys,events};
}

test('archive then restore keeps every field and brings automations back switched off',async t=>{
 const {pg,a,f,w,run,createTable,rawApp,archive,type,keys,events}=await fixture(t);
 const table=await createTable('Plan',['month','amount']),app=await rawApp('Runway',[{typeId:table,fields:['month','amount']}]);
 const monitor=randomUUID(),action=randomUUID();
 await pg.query("INSERT INTO app_monitors(id,workspace_id,user_id,app_id,config,scope_stamp) VALUES($1,$2,$3,$4,'{\"name\":\"Research\"}','stamp')",[monitor,w.id,a.userId,app]);
 await pg.query("INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,approved_by) VALUES($1,$2,$3,$4,'{\"name\":\"Email\"}',$3)",[action,w.id,a.userId,app]);
 const archived=await archive(app,true);
 assert.equal(archived.preview.archiveReview.automationsPaused,2);
 assert.deepEqual(keys((await type(table)).fields),['month','amount']);assert.deepEqual((await type(table)).archived_fields,[]);
 assert.ok((await pg.query<any>('SELECT archived_at FROM workspace_components WHERE id=$1',[app])).rows[0].archived_at);
 // Archived items are listed only for restore; default automation lists hide them.
 const apps=await run(()=>archivedItems(f,a,w.id,{kind:'apps'}));assert.equal(apps.count,1);assert.equal(apps.items[0].canDelete,true);assert.deepEqual(apps.items[0].keeps.tables.map((x:any)=>x.id),[table]);
 const automations=await run(()=>archivedItems(f,a,w.id,{kind:'automations'}));assert.deepEqual(automations.items.map((x:any)=>x.id).sort(),[monitor,action].sort());assert.ok(automations.items.every((x:any)=>!x.canDelete&&x.restoreVia.id===app));
 for(const kind of ['apps','automations']){const summary=await run(()=>archivedItems(f,a,w.id,{kind,summaryOnly:true}));assert.equal(summary.count,kind==='apps'?1:2);assert.deepEqual(summary.items,[]);}
 const ai=await run(()=>archivedItems(f,{...a,origin:'ai'},w.id,{kind:'apps'}));assert.equal(ai.items[0].canDelete,false);
 // A live app with the same name makes the restored app "(restored)".
 await rawApp('Runway',[]);
 const restored=await archive(app,false);
 assert.equal(restored.preview.archiveReview.name,'Runway (restored)');
 const row=(await pg.query<any>('SELECT name,archived,archived_at FROM workspace_components WHERE id=$1',[app])).rows[0];assert.deepEqual([row.name,row.archived,row.archived_at],['Runway (restored)',false,null]);
 assert.deepEqual(keys((await type(table)).fields),['month','amount']);
 const m=(await pg.query<any>('SELECT enabled,deleted_at,archived_with_app_at FROM app_monitors WHERE id=$1',[monitor])).rows[0];assert.deepEqual([m.enabled,m.deleted_at,m.archived_with_app_at],[false,null,null]);
 const j=(await pg.query<any>('SELECT paused,deleted_at,archived_with_app_at FROM app_actions WHERE id=$1',[action])).rows[0];assert.deepEqual([j.paused,j.deleted_at,j.archived_with_app_at],[true,null,null]);
 assert.equal(await events('automation.archived_with_app'),2);assert.equal(await events('automation.restored_disabled'),2);assert.equal(await events('workspace.restore_archived_component'),1);
 assert.equal((await run(()=>archivedItems(f,a,w.id,{kind:'automations'}))).count,0);
});

test('removing a tab archives its unused fields and table; re-adding it reconnects the same ones',async t=>{
 const {pg,a,s,f,w,run,createTable,rawApp,saveBindings,type,keys,events}=await fixture(t);
 const plan=await createTable('Plan lines',['label','amount']),raid=await createTable('RAID',['risk']),app=await rawApp('Programs',[{typeId:plan,fields:['label','amount']},{typeId:raid,fields:['risk']}]);
 await saveBindings(app,'Programs',[{typeId:plan,fields:['label']}]);
 const p1=await type(plan),r1=await type(raid);
 assert.deepEqual(keys(p1.fields),['label']);assert.deepEqual(keys(p1.archived_fields),['amount']);assert.equal(p1.archived_at,null);
 assert.deepEqual(r1.fields,[]);assert.deepEqual(keys(r1.archived_fields),['risk']);assert.ok(r1.archived_at);
 assert.equal(await events('table.archived'),1);
 // Hidden from Database, pickers and assistant schema listings.
 assert.ok(!(await run(()=>s.types(a,w.id))).some((x:any)=>x.id===raid));
 assert.ok(!(await run(()=>schemaCatalog(f.db,a,w.id,{limit:25}))).tables.some((x:any)=>x.id===raid));
 assert.deepEqual((await run(()=>archivedItems(f,a,w.id,{kind:'tables'}))).items.map((x:any)=>x.id),[raid]);
 assert.deepEqual((await run(()=>archivedItems(f,a,w.id,{kind:'fields',typeId:plan}))).items.map((x:any)=>x.key),['amount']);
 // Re-adding the tab binds the same tables and fields; the reviewed save restores them.
 const readd=await saveBindings(app,'Programs',[{typeId:plan,fields:['label','amount']},{typeId:raid,fields:['risk']}]);
 assert.deepEqual(readd.preview.archiveReview.restores.map((r:any)=>[r.typeId,r.tableArchived,r.fields.map((f:any)=>f.key)]),[[plan,false,['amount']],[raid,true,['risk']]]);
 const p2=await type(plan),r2=await type(raid);
 assert.deepEqual(keys(p2.fields),['label','amount']);assert.deepEqual(p2.archived_fields,[]);
 assert.deepEqual(keys(r2.fields),['risk']);assert.equal(r2.archived_at,null);
 assert.equal(await events('field.restored'),2);assert.equal(await events('table.restored'),1);
 assert.ok((await run(()=>s.types(a,w.id))).some((x:any)=>x.id===raid));
 assert.equal((await pg.query<any>('SELECT count(*)::int n FROM entity_types WHERE workspace_id=$1',[w.id])).rows[0].n,2,'no duplicate tables');
});

test('a field used by an archived app is not archived until that app is deleted permanently',async t=>{
 const {f,a,w,run,createTable,rawApp,saveBindings,archive,type,keys}=await fixture(t);
 const table=await createTable('Organizations',['name','tier']),archivedApp=await rawApp('Contracts',[{typeId:table,fields:['name','tier']}]),live=await rawApp('Programs',[{typeId:table,fields:['name','tier']}]);
 await archive(archivedApp,true);
 await saveBindings(live,'Programs',[{typeId:table,fields:['name']}]);
 assert.deepEqual(keys((await type(table)).fields),['name','tier'],'archived app still protects tier');
 await run(()=>deleteArchivedItem(f,a,w.id,{kind:'app',id:archivedApp,confirmed:true}));
 const after=await type(table);assert.deepEqual(keys(after.fields),['name']);assert.deepEqual(keys(after.archived_fields),['tier']);
 await assert.rejects(()=>archive(archivedApp,false),/not found|Component not found/i);
});

test('permanent deletion is a human owner action for archived, empty and unused items only',async t=>{
 const {pg,s,f,a,w,run,createTable,rawApp,saveBindings,type,keys,events}=await fixture(t);
 const table=await createTable('Studies',['code','phase','site','notes']),app=await rawApp('Studies',[{typeId:table,fields:['code','phase','site','notes']}]);
 await saveBindings(app,'Studies',[{typeId:table,fields:['code']}]);
 assert.deepEqual(keys((await type(table)).archived_fields),['phase','site','notes']);
 // A value written later blocks deletion; so does a binding from an archived app.
 await pg.query('INSERT INTO records(id,workspace_id,type_id,data) VALUES($1,$2,$3,$4)',[randomUUID(),w.id,table,JSON.stringify({phase:'II'})]);
 await rawApp('Legacy',[{typeId:table,fields:['site']}],true);
 const fields=(await run(()=>archivedItems(f,a,w.id,{kind:'fields',typeId:table}))).items;
 const by=(k:string)=>fields.find((x:any)=>x.key===k);
 assert.deepEqual([by('phase').canDelete,by('phase').deleteBlockedReason],[false,'Contains 1 value']);
 assert.deepEqual([by('site').canDelete,by('site').deleteBlockedReason],[false,'Used by archived app Legacy']);
 assert.deepEqual([by('notes').canDelete,by('notes').deleteBlockedReason],[true,null]);
 assert.equal(by('notes').purgeAt,null,'automatic purge is off unless enabled');
 await assert.rejects(()=>run(()=>deleteArchivedItem(f,a,w.id,{kind:'field',id:table,key:'phase',confirmed:true})),/Contains 1 value/);
 await assert.rejects(()=>run(()=>deleteArchivedItem(f,a,w.id,{kind:'field',id:table,key:'site',confirmed:true})),/Used by archived app Legacy/);
 await assert.rejects(()=>run(()=>deleteArchivedItem(f,{...a,origin:'ai',actionConfirmed:true},w.id,{kind:'field',id:table,key:'notes',confirmed:true})),/authenticated TrialAgents app/);
 await assert.rejects(()=>run(()=>deleteArchivedItem(f,a,w.id,{kind:'automation',id:app,confirmed:true})),/deleted together with their app/);
 await run(()=>deleteArchivedItem(f,a,w.id,{kind:'field',id:table,key:'notes',confirmed:true}));
 assert.deepEqual(keys((await type(table)).archived_fields),['phase','site']);assert.equal(await events('field.deleted_permanently'),1);
 // Owner restore through the reviewed data operation; values were never removed.
 const tableVersion=(await type(table)).version,p=await run(()=>s.preview(a,w.id,{kind:'restore_archived_schema',typeId:table,expectedVersion:tableVersion,fields:['phase']}));
 await run(()=>s.commit(a,p.id,p.digest));
 assert.deepEqual(keys((await type(table)).fields),['code','phase']);
 // Tables: delete only when archived, empty and unused; deleted tables cannot be restored.
 const empty=await createTable('Scratch',['x']),scratch=await rawApp('Scratch',[{typeId:empty,fields:['x']}]);await saveBindings(scratch,'Scratch',[]);
 const filled=await createTable('Kept',['y']),kept=await rawApp('Kept',[{typeId:filled,fields:['y']}]);await saveBindings(kept,'Kept',[]);
 assert.ok((await type(empty)).archived_at);assert.ok((await type(filled)).archived_at);
 await pg.query('INSERT INTO records(id,workspace_id,type_id,data,state) VALUES($1,$2,$3,$4,$5)',[randomUUID(),w.id,filled,'{}','archived']);
 const tables=(await run(()=>archivedItems(f,a,w.id,{kind:'tables'}))).items;
 assert.equal(tables.find((x:any)=>x.id===filled).deleteBlockedReason,'Contains 1 record');
 await assert.rejects(()=>run(()=>deleteArchivedItem(f,a,w.id,{kind:'table',id:filled,confirmed:true})),/Contains 1 record/);
 await run(()=>deleteArchivedItem(f,a,w.id,{kind:'table',id:empty,confirmed:true}));
 assert.ok((await type(empty)).deleted_at);assert.equal(await events('table.deleted_permanently'),1);
 assert.ok(!(await run(()=>archivedItems(f,a,w.id,{kind:'tables'}))).items.some((x:any)=>x.id===empty));
 await assert.rejects(()=>run(async()=>{const q=await s.preview(a,w.id,{kind:'restore_archived_schema',typeId:empty,expectedVersion:(await type(empty)).version});return s.commit(a,q.id,q.digest);}),/deleted permanently/);
});

test('optional purge removes only items archived 90 days ago that are still empty and unused, as the worker',async t=>{
 const {pg,w,createTable,rawApp,saveBindings,type,keys,events}=await fixture(t);
 const table=await createTable('Cash',['eligible','populated','bound','recent']),app=await rawApp('Cash',[{typeId:table,fields:['eligible','populated','bound','recent']}]);
 await saveBindings(app,'Cash',[]);
 const gone=await createTable('Gone',['g']),goneApp=await rawApp('Gone',[{typeId:gone,fields:['g']}]);await saveBindings(goneApp,'Gone',[]);
 const full=await createTable('Full',['h']),fullApp=await rawApp('Full',[{typeId:full,fields:['h']}]);await saveBindings(fullApp,'Full',[]);
 await pg.query('INSERT INTO records(id,workspace_id,type_id,data) VALUES($1,$2,$3,$4)',[randomUUID(),w.id,table,JSON.stringify({populated:12})]);
 await pg.query('INSERT INTO records(id,workspace_id,type_id,data) VALUES($1,$2,$3,$4)',[randomUUID(),w.id,full,'{}']);
 await rawApp('Archived user',[{typeId:table,fields:['bound']}],true);
 const old=new Date(Date.now()-91*86400000).toISOString();
 await pg.query(`UPDATE entity_types SET archived_fields=(SELECT jsonb_agg(CASE WHEN x->'field'->>'key'='recent' THEN x ELSE jsonb_set(x,'{archivedAt}',to_jsonb($2::text)) END) FROM jsonb_array_elements(archived_fields) x) WHERE workspace_id=$1 AND archived_fields<>'[]'`,[w.id,old]);
 await pg.query('UPDATE entity_types SET archived_at=$2 WHERE workspace_id=$1 AND archived_at IS NOT NULL',[w.id,old]);
 const purge=async(worker:boolean)=>pg.transaction(async tx=>{await tx.exec(`SET LOCAL ROLE ${worker?'trialy_worker':'trialy_runtime'}`);await tx.query("SELECT set_config('trialy.service',$1,true)",[worker?'worker':'']);return (await tx.query<any>('SELECT trialy_security.purge_archived_schema() n')).rows[0].n;});
 assert.equal(await purge(false),0,'only the worker may purge');
 // eligible, g and h (empty even though Full has a record), plus the empty Gone table.
 assert.equal(await purge(true),4);
 assert.deepEqual(keys((await type(table)).archived_fields).sort(),['bound','populated','recent']);
 assert.ok((await type(gone)).deleted_at);assert.equal((await type(full)).deleted_at,null,'a table with records is never purged');
 assert.equal(await events('field.purged'),3);assert.equal(await events('table.purged'),1);
 assert.equal(await purge(true),0,'idempotent');
});

test('installing a template whose app is archived offers restore before creating a new copy',async t=>{
 const {pg,a,f,w,run,rawApp}=await fixture(t);
 const app=await rawApp('Runway',[],true),digest='a'.repeat(64);
 await pg.query("INSERT INTO app_template_catalog(template_id,version,status,digest,payload,install_schema) VALUES('life.test-runway','1.0.0','approved',$1,'{}','{}')",[digest]);
 await pg.query('INSERT INTO workspace_receipts(id,workspace_id,user_id,digest,result) VALUES($1,$2,$3,$4,$5)',[randomUUID(),w.id,a.userId,digest,JSON.stringify({appId:app,templateId:'life.test-runway'})]);
 // An unrelated archived app must never be offered for this template.
 const other=await rawApp('Revised generic app',[],true);
 assert.deepEqual((await run(()=>archivedItems(f,a,w.id,{kind:'apps'}))).items.map((x:any)=>x.id).sort(),[app,other].sort());
 assert.deepEqual((await run(()=>archivedItems(f,a,w.id,{kind:'apps',templateId:'life.test-runway'}))).items.map((x:any)=>x.id),[app]);
 // The website path (client mapping + REST route) keeps the template filter too.
 let path='';await foundationClient(async(p:string)=>{path=p;return {};})('list_archived_items',{workspaceId:w.id,kind:'apps',templateId:'life.test-runway'});
 assert.match(path,/[?&]templateId=life\.test-runway(&|$)/);
 const web=express();web.use((req:any,_res,next)=>{req.actor=a;withActor(a,()=>next());});addWorkspaceApi(web,f);
 const listed=await request(web).get(path).expect(200);assert.deepEqual(listed.body.items.map((x:any)=>x.id),[app]);
 await foundationClient(async(p:string)=>{path=p;return {};})('list_archived_items',{workspaceId:w.id,kind:'apps',templateId:'life.test-runway',summaryOnly:true});
 const summary=await request(web).get(path).expect(200);assert.equal(summary.body.count,1);assert.deepEqual(summary.body.items,[]);assert.equal(summary.body.summaryOnly,true);
 await assert.rejects(()=>run(()=>installCatalogApp(f,a,w.id,{templateId:'life.test-runway',version:'1.0.0',digest,requestKey:randomUUID(),name:'Runway'})),/Restore your archived Runway app/);
});

test('migration 060 recovers fields removed and automations deleted by app archiving under 059',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());const files=(await readdir('migrations')).filter(x=>x.endsWith('.sql')).sort();
 for(const n of files.filter(n=>n<'060'))await pg.exec(await readFile('migrations/'+n,'utf8'));
 const [user,tenant,w,project,kept,emptied,app,retired,suspended]=Array.from({length:9},()=>randomUUID());
 await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[user,'owner@example.invalid','Owner']);
 await pg.query("INSERT INTO tenants(id,name) VALUES($1,'T')",[tenant]);await pg.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'owner')",[tenant,user]);
 await pg.query("INSERT INTO workspaces(id,tenant_id,name) VALUES($1,$2,'W')",[w,tenant]);await pg.query("INSERT INTO workspace_nodes(id,workspace_id,name,kind) VALUES($1,$2,'Apps','project')",[project,w]);
 const field=(key:string)=>({key,name:key,kind:'text',ai:true});
 await pg.query("INSERT INTO entity_types(id,workspace_id,name,fields,version) VALUES($1,$3,'Kept',$4,1),($2,$3,'Emptied','[]',1)",[kept,emptied,w,JSON.stringify([field('keep'),field('again')])]);
 // 059 cleanup audits: Kept lost "gone" (and "again", which was re-added later); Emptied lost everything.
 const audit=(type:string,before:any[],after:any[],at:string)=>pg.query("INSERT INTO audit_events(id,workspace_id,tenant_id,actor_id,action,object_id,origin,before_value,after_value,created_at) VALUES($1,$2,$3,$4,'app.empty_fields_removed',$5,'human',$6,$7,$8)",[randomUUID(),w,tenant,user,type,JSON.stringify({fields:before}),JSON.stringify({fields:after,componentId:app}),at]);
 await audit(kept,[field('keep'),field('gone'),field('again')],[field('keep')],'2026-11-10T10:00:00Z');await audit(emptied,[field('solo')],[],'2026-11-10T11:00:00Z');
 await pg.query("INSERT INTO workspace_components(id,workspace_id,project_id,name,format,source,bindings,created_by) VALUES($1,$2,$3,'Runway','frontend-js','',$4,$5)",[app,w,project,JSON.stringify([{typeId:kept,fields:['keep']}]),user]);
 for(const id of [retired,suspended])await pg.query("INSERT INTO app_monitors(id,workspace_id,user_id,app_id,config,scope_stamp) VALUES($1,$2,$3,$4,'{}','s')",[id,w,user,app]);
 await pg.query("UPDATE app_monitors SET enabled=false,deleted_at=now()-interval '1 day' WHERE id=$1",[retired]);
 // Archive exactly as 059 did it: the trigger soft-deletes in the archiving transaction.
 await pg.transaction(async tx=>{await tx.query('UPDATE workspace_components SET archived=true,version=1 WHERE id=$1',[app]);await tx.query("INSERT INTO revisions(id,workspace_id,object_id,object_kind,version,snapshot,actor_id) VALUES($1,$2,$3,'workspace_component',1,'{\"archived\":true}',$4)",[randomUUID(),w,app,user]);});
 assert.ok((await pg.query<any>('SELECT deleted_at FROM app_monitors WHERE id=$1',[suspended])).rows[0].deleted_at);
 for(const n of files.filter(n=>n>='060'))await pg.exec(await readFile('migrations/'+n,'utf8'));
 const k=(await pg.query<any>('SELECT fields,archived_fields,archived_at FROM entity_types WHERE id=$1',[kept])).rows[0];
 assert.deepEqual(k.archived_fields.map((x:any)=>[x.field.key,x.appId]),[['gone',app]]);assert.equal(k.archived_at,null);
 const e=(await pg.query<any>('SELECT archived_fields,archived_at FROM entity_types WHERE id=$1',[emptied])).rows[0];
 assert.deepEqual(e.archived_fields.map((x:any)=>x.field.key),['solo']);assert.equal(new Date(e.archived_at).toISOString(),'2026-11-10T11:00:00.000Z');
 assert.ok((await pg.query<any>('SELECT archived_at FROM workspace_components WHERE id=$1',[app])).rows[0].archived_at);
 const s=(await pg.query<any>('SELECT enabled,deleted_at,archived_with_app_at FROM app_monitors WHERE id=$1',[suspended])).rows[0];
 assert.equal(s.enabled,false);assert.equal(s.deleted_at,null);assert.ok(s.archived_with_app_at);
 assert.ok((await pg.query<any>('SELECT deleted_at FROM app_monitors WHERE id=$1',[retired])).rows[0].deleted_at,'retired before archive stays retired');
});

test('archive summaries preserve owner, creator, ancestor, assistant and tenant visibility without inventories',async t=>{
 const {pg,db,a,f,w,project,run,createTable,rawApp}=await fixture(t);
 const table=await createTable('Counted table',['name']);
 await pg.query("INSERT INTO records(id,type_id,workspace_id,data) VALUES($1,$2,$3,'{\"name\":\"Private value\"}')",[randomUUID(),table,w.id]);
 const first=await rawApp('First private app',[{typeId:table,fields:['name']}],true),second=await rawApp('Second private app',[],true);
 const queries:string[]=[],original=db.query.bind(db);db.query=async(q,v)=>{queries.push(q);return original(q,v);};
 const compare=async(actor:any,kind:string,extra:any={})=>withActor(actor,async()=>{
  queries.length=0;const detailed=await archivedItems(f,actor,w.id,{kind,...extra}),full=queries.length;
  queries.length=0;const summary=await archivedItems(f,actor,w.id,{kind,...extra,summaryOnly:true}),count=queries.length;
  assert.equal(summary.count,detailed.count);assert.deepEqual(summary.items,[]);
  assert.doesNotMatch(JSON.stringify(summary),/Private value|First private app|Second private app|canDelete|keeps/);
  assert.ok(!queries.some(q=>q.includes('archived_item_usage')||q.includes('count(*)::int FROM records')||q.includes('count(*) FROM app_monitors')));
  return {full,count,total:summary.count};
 });
 const measured=await compare(a,'apps');assert.equal(measured.total,2);assert.equal(measured.full-measured.count,4);console.log('ARCHIVE_SUMMARY_PERFORMANCE',JSON.stringify(measured));
 const empty=await createTable('Archived empty table',['gone']);await pg.query("UPDATE entity_types SET fields='[]',archived_at=now(),archived_fields=$2 WHERE id=$1",[empty,JSON.stringify([{field:{key:'gone',name:'Gone',kind:'text',ai:true},archivedAt:new Date().toISOString(),archivedBy:a.userId}])]);
 assert.equal((await compare(a,'tables')).total,1);assert.equal((await compare(a,'fields',{typeId:empty})).total,1);
 const creator={userId:randomUUID(),origin:'human' as const};
 await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[creator.userId,'creator@example.invalid','Creator']);
 const tenant=(await pg.query<any>('SELECT tenant_id FROM workspaces WHERE id=$1',[w.id])).rows[0].tenant_id;
 await pg.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'editor')",[tenant,creator.userId]);
 await pg.query("INSERT INTO workspace_access(workspace_id,user_id,role,ai_enabled) VALUES($1,$2,'editor',true)",[w.id,creator.userId]);
 await pg.query('UPDATE workspace_components SET created_by=$2 WHERE id=$1',[first,creator.userId]);
 assert.equal((await compare(creator,'apps')).total,1);assert.equal((await compare(creator,'tables')).total,0);assert.equal((await compare(creator,'fields',{typeId:empty})).total,0);
 await pg.query('UPDATE workspace_nodes SET allowed_users=$2 WHERE id=$1',[project,JSON.stringify([a.userId])]);assert.equal((await compare(creator,'apps')).total,0);
 await pg.query('UPDATE workspace_nodes SET allowed_users=NULL WHERE id=$1',[project]);
 await pg.query('UPDATE workspace_components SET allowed_users=$2 WHERE id=$1',[first,JSON.stringify([a.userId])]);assert.equal((await compare(creator,'apps')).total,0);
 await pg.query('UPDATE workspace_components SET allowed_users=NULL WHERE id=$1',[first]);
 await pg.query('UPDATE workspaces SET permission_rules=$2,ai_enabled=true,claude_enabled=true WHERE id=$1',[w.id,JSON.stringify([{subject:a.userId,kind:'tool',resourceId:second,read:'deny',write:'inherit'}])]);
 assert.equal((await compare(a,'apps')).total,1);
 await pg.query('UPDATE workspace_components SET ai_enabled=false WHERE id=$1',[first]);
 assert.equal((await compare({...a,origin:'ai'},'apps')).total,0);
 assert.equal((await compare({...a,origin:'ai',assistant:'claude'},'apps')).total,0);
 await assert.rejects(()=>run(()=>archivedItems(f,a,randomUUID(),{kind:'apps',summaryOnly:true})),/Workspace not found/);
 const outsider={userId:randomUUID(),origin:'human' as const};await assert.rejects(()=>withActor(outsider,()=>archivedItems(f,outsider,w.id,{kind:'apps',summaryOnly:true})),/Workspace not found/);
});
