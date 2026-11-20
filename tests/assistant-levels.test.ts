import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,setDatabaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {access} from '../src/domain/permissions.js';
import {AssistantLevelSettings,assistantLevels} from '../src/domain/assistant-levels.js';
import {MemberRemoval} from '../src/domain/member-removal.js';
import {prepareDataAccess} from '../src/workspace/data-access.js';
import {AppError,type Actor,type Assistant} from '../src/shared/schema.js';

const code=(c:string)=>(e:unknown)=>e instanceof AppError&&e.code===c;
const via=(a:Actor,assistant:Assistant):Actor=>({...a,origin:'ai',assistant,actionConfirmed:true});

// A4: Data and Apps levels per assistant, as the organization maximum and each person's own limit.
// Runs as the deployed service does: the restricted database role, with the acting person or assistant in the database context.
test('assistant levels: Data and Apps, organization maximum and personal limit',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());
 for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const setup:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
 const db:Database={query:(q,v)=>db.transaction(tx=>tx.query(q,v)),transaction:fn=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return fn(tx as Connection);}),close:async()=>{}};
 const person=():Actor=>({userId:randomUUID(),origin:'human'}),owner=person(),alice=person(),bob=person();
 for(const [a,name] of [[owner,'Owner'],[alice,'Alice'],[bob,'Bob']] as const)await setup.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,name.toLowerCase()+'@example.invalid',name]);
 const w=(await new Service(setup).createWorkspace(owner,'Levels')).id;
 for(const a of [alice,bob])await new Service(setup).share(owner,w,a.userId,'editor',[],null,true);
 const s=new Service(db),f=new WorkspaceFoundation(db),settings=new AssistantLevelSettings(db);
 const as=<T>(a:Actor,fn:()=>Promise<T>)=>withActor(a,fn);
 const save=(a:Actor,op:unknown)=>as(a,async()=>{const p=await s.preview(a,w,op);return s.commit(a,p.id,p.digest);});
 const change=(a:Actor,op:any)=>as(a,async()=>{const p=await f.preview(a,w,op);return f.confirm(a,w,p.id,p.digest);});
 const maximum=(assistant:Assistant,data:string,apps:string)=>as(owner,()=>settings.setMaximum(owner,w,{assistant,data,apps}));
 const mine=(a:Actor,assistant:Assistant,data:string,apps:string)=>as(a,()=>settings.setMine(a,w,{assistant,data,apps}));
 const levels=(a:Actor)=>as(a,async()=>{const l=await assistantLevels(db,a,await access(db,a,w));return [l.data,l.apps];});
 const sql=(a:Actor,q:string,v:any[]=[])=>as(a,()=>db.query(q,v));

 const typeId=(await save(owner,{kind:'create_type',name:'Sites',fields:[{key:'name',name:'Name',kind:'text',required:true}]})).objects[0].id;
 const recordId=(await save(owner,{kind:'create_record',typeId,data:{name:'Lyon'}})).objects[0].id;
 const project=await change(owner,{kind:'create_node',nodeKind:'project',name:'Work'});
 const app=await change(alice,{kind:'save_component',projectId:project.id,content:{name:'Pipeline',format:'text',source:'v1'}});
 // A second app, connected to the table and owned by the organization owner.
 const board=await change(owner,{kind:'save_component',projectId:project.id,content:{name:'Sites board',format:'text',source:'board',bindings:[{typeId,fields:['name']}]}});
 const names=async(a:Actor)=>(await as(a,()=>s.records(a,w,typeId))).rows.map((r:any)=>r.data.name).sort();
 const rename=(a:Actor,name:string)=>as(a,async()=>{const version=(await setup.query('SELECT version FROM records WHERE id=$1',[recordId])).rows[0].version;return s.preview(a,w,{kind:'update_record',recordId,expectedVersion:version,data:{name}});});
 const appChange=(a:Actor,source:string)=>as(a,async()=>{const version=(await setup.query('SELECT version FROM workspace_components WHERE id=$1',[app.id])).rows[0].version;return f.preview(a,w,{kind:'save_component',componentId:app.id,expectedVersion:version,projectId:project.id,content:{name:'Pipeline',format:'text',source}});});
 const newApp=(a:Actor)=>as(a,()=>f.preview(a,w,{kind:'save_component',projectId:project.id,content:{name:'Another',format:'text',source:'new'}}));
 const source=async(a:Actor)=>(await as(a,()=>f.readComponent(a,w,app.id))).component.source;
 const listed=async(a:Actor)=>as(a,()=>f.components(a,w));
 const claude=via(alice,'claude'),chatgpt=via(alice,'chatgpt');

 await t.test('by default both assistants are Edit for Data and Apps',async()=>{
  const view=await as(alice,()=>settings.read(alice,w));
  assert.deepEqual(view.assistants.map((x:any)=>[x.id,x.maximum,x.mine,x.effective]),[['chatgpt',{data:'edit',apps:'edit'},{data:'edit',apps:'edit'},{data:'edit',apps:'edit'}],['claude',{data:'edit',apps:'edit'},{data:'edit',apps:'edit'},{data:'edit',apps:'edit'}]]);
  assert.equal(view.canSetMaximum,false);assert.equal(view.canSetMine,true);assert.equal(view.people,undefined);
  assert.deepEqual(await levels(claude),['edit','edit']);assert.deepEqual(await levels(alice),['edit','edit']);
  assert.deepEqual(await names(claude),['Lyon']);
  const p=await rename(claude,'Lyon 2');await as(claude,()=>s.commit(claude,p.id,p.digest));assert.deepEqual(await names(alice),['Lyon 2']);
  assert.equal(await source(claude),'v1');assert.ok((await appChange(claude,'by claude')).id);
  const apps=await listed(claude);assert.deepEqual(apps.map((c:any)=>[c.name,c.bindings.length]),[['Pipeline',0],['Sites board',1]]);
 });

 await t.test('Data = View only: the assistant reads records and changes none; the person still edits',async()=>{
  const before=(await setup.query('SELECT access_version FROM workspaces WHERE id=$1',[w])).rows[0].access_version;
  const saved=await maximum('claude','view','edit');
  assert.deepEqual(saved.assistants.find((x:any)=>x.id==='claude')!.maximum,{data:'view',apps:'edit'});
  assert.ok((await setup.query('SELECT access_version FROM workspaces WHERE id=$1',[w])).rows[0].access_version>before);
  assert.deepEqual(await names(claude),['Lyon 2']);
  await assert.rejects(rename(claude,'No'),(e:any)=>e.code==='assistant_data_view_only'&&e.status===403&&e.message==='Claude is set to View only for data. An organization owner can change this under Access.');
  await assert.rejects(save(claude,{kind:'create_record',typeId,data:{name:'No'}}),code('assistant_data_view_only'));
  await assert.rejects(as(claude,()=>f.preview(claude,w,{kind:'record_fact',recordId,expectedVersion:1,field:'name',value:'No',sourceLabel:'Test',rationale:'Test'})),code('assistant_data_view_only'));
  // The database refuses the same change if the application is bypassed, and still lets the assistant read.
  await assert.rejects(sql(claude,"UPDATE records SET data='{\"name\":\"No\"}' WHERE id=$1",[recordId]),/row-level security/);
  assert.equal((await sql(claude,'SELECT id FROM records WHERE workspace_id=$1',[w])).rows.length,1);
  // The person, and their other assistant, are not limited.
  const own=await rename(alice,'Lyon 3');await as(alice,()=>s.commit(alice,own.id,own.digest));
  const other=await rename(chatgpt,'Lyon 4');await as(chatgpt,()=>s.commit(chatgpt,other.id,other.digest));assert.deepEqual(await names(alice),['Lyon 4']);
  // Apps is a separate permission: with Apps = Edit the assistant still prepares an app change.
  assert.ok((await appChange(claude,'data is view only')).id);
 });

 await t.test('Data = Blocked: no records or tables, but apps are listed and an owned app can be changed',async()=>{
  await maximum('claude','blocked','edit');
  await assert.rejects(names(claude),(e:any)=>e.code==='assistant_data_blocked'&&e.message==='Claude is set to Blocked for data. An organization owner can change this under Access.');
  assert.deepEqual(await as(claude,()=>s.types(claude,w)),[]);
  await assert.rejects(as(claude,()=>s.documents(claude,w)),code('assistant_data_blocked'));
  await assert.rejects(rename(claude,'No'),code('assistant_data_blocked'));
  assert.equal((await sql(claude,'SELECT id FROM records WHERE workspace_id=$1',[w])).rows.length,0,'the database hides records too');
  // The workspace still opens: apps are listed by name, and the assistant prepares a change to the app its person owns.
  assert.ok((await as(claude,()=>s.workspaces(claude))).some((x:any)=>x.id===w));
  const apps=await listed(claude);assert.deepEqual(apps.map((c:any)=>[c.name,c.app_role]),[['Pipeline','owner'],['Sites board','editor']]);
  for(const c of apps){assert.equal('source' in c,false);assert.equal('bindings' in c,false);assert.equal('manifest' in c,false);}
  // An app without table connections can be read; one that shows a table cannot, because the table is closed.
  assert.equal(await source(claude),'v1');
  await assert.rejects(as(claude,()=>f.readComponent(claude,w,board.id)),code('assistant_data_blocked'));
  const draft=await appChange(claude,'while data is blocked');assert.ok(draft.id);
  // A person approves it; the assistant's draft did not change the app by itself.
  assert.equal(await source(alice),'v1');await as(alice,()=>f.confirm(alice,w,draft.id,draft.digest));assert.equal(await source(alice),'while data is blocked');
  // Bob's Claude does not own the app: it still cannot change it (R3), whatever its level.
  await assert.rejects(appChange(via(bob,'claude'),'not mine'),code('app_owner_required'));
  assert.deepEqual(await names(chatgpt),['Lyon 4']);
  await maximum('claude','edit','edit');
 });

 await t.test('Apps = View only reads app code and prepares no change; Apps = Blocked reads none',async()=>{
  await maximum('claude','edit','view');
  assert.equal(await source(claude),'while data is blocked');
  await assert.rejects(appChange(claude,'No'),(e:any)=>e.code==='assistant_apps_view_only'&&e.message==='Claude is set to View only for apps. An organization owner can change this under Access.');
  await assert.rejects(newApp(claude),code('assistant_apps_view_only'));
  await assert.rejects(as(claude,()=>f.preview(claude,w,{kind:'archive_component',componentId:app.id,expectedVersion:1,archived:true})),code('assistant_apps_view_only'));
  await assert.rejects(as(claude,()=>f.beginAppUpdate(claude,w,app.id,1)),code('assistant_apps_view_only'));
  await assert.rejects(as(claude,()=>prepareDataAccess(f,claude,w,{})),code('assistant_apps_view_only'));
  await assert.rejects(as(claude,()=>f.prepareRenderedTracker(claude,w,{kind:'save_component',projectId:project.id,content:{name:'Another',format:'text',source:'new'}})),code('assistant_apps_view_only'));
  assert.deepEqual((await listed(claude)).map((c:any)=>[c.name,c.bindings.length]),[['Pipeline',0],['Sites board',1]]);
  // Data is a separate permission: records stay readable and changeable.
  assert.deepEqual(await names(claude),['Lyon 4']);assert.ok((await rename(claude,'Lyon 5')).id);
  assert.ok((await appChange(chatgpt,'chatgpt may')).id,'ChatGPT is set separately');

  await maximum('claude','edit','blocked');
  await assert.rejects(source(claude),(e:any)=>e.code==='assistant_apps_blocked'&&e.status===403);
  await assert.rejects(as(claude,()=>f.componentHistory(claude,w,app.id)),code('assistant_apps_blocked'));
  await assert.rejects(appChange(claude,'No'),code('assistant_apps_blocked'));
  await assert.rejects(newApp(claude),code('assistant_apps_blocked'));
  const apps=await listed(claude);assert.deepEqual(apps.map((c:any)=>c.name),['Pipeline','Sites board']);for(const c of apps){assert.equal('source' in c,false);assert.equal('bindings' in c,false);}
  await assert.rejects(as(claude,()=>f.readComponent(claude,w,board.id)),code('assistant_apps_blocked'));
  assert.deepEqual(await names(claude),['Lyon 4']);
  assert.equal(await source(alice),'while data is blocked');assert.equal(await source(chatgpt),'while data is blocked');
  await maximum('claude','edit','edit');
 });

 await t.test('a personal limit only tightens, per person and per assistant',async()=>{
  // Looser than the maximum: nothing is gained.
  await maximum('claude','view','view');await mine(alice,'claude','edit','edit');
  assert.deepEqual(await levels(claude),['view','view']);await assert.rejects(rename(claude,'No'),code('assistant_data_view_only'));
  // Tighter than the maximum: the limit wins, and the message points to the person's own setting.
  await maximum('claude','edit','edit');await mine(alice,'claude','blocked','view');
  assert.deepEqual(await levels(claude),['blocked','view']);
  await assert.rejects(names(claude),(e:any)=>e.code==='assistant_data_blocked'&&e.message==='Claude is set to Blocked for data. You can change your own limit under Connections.');
  await assert.rejects(appChange(claude,'No'),code('assistant_apps_view_only'));
  // Only Alice's Claude: Bob's Claude and Alice's ChatGPT keep the maximum.
  assert.deepEqual(await levels(via(bob,'claude')),['edit','edit']);assert.deepEqual(await names(via(bob,'claude')),['Lyon 4']);
  assert.deepEqual(await levels(chatgpt),['edit','edit']);assert.deepEqual(await names(chatgpt),['Lyon 4']);
  assert.deepEqual(await names(alice),['Lyon 4']);
  // Both set: both places are named.
  await maximum('claude','view','edit');await mine(alice,'claude','view','edit');
  await assert.rejects(rename(claude,'No'),(e:any)=>e.message==='Claude is set to View only for data. An organization owner can change this under Access, and you can change your own limit under Connections.');
  const view=await as(alice,()=>settings.read(alice,w)),shown=view.assistants.find((x:any)=>x.id==='claude')!;
  assert.deepEqual([shown.maximum,shown.mine,shown.effective],[{data:'view',apps:'edit'},{data:'view',apps:'edit'},{data:'view',apps:'edit'}]);
  // Organization owners see everyone's limits; members see only their own.
  const all=await as(owner,()=>settings.read(owner,w));assert.equal(all.canSetMaximum,true);
  assert.deepEqual(all.people!.map((x:any)=>[x.name,x.limits.claude.data]),[['Alice','view'],['Bob','edit'],['Owner','edit']]);
  await maximum('claude','edit','edit');await mine(alice,'claude','edit','edit');
 });

 await t.test('Blocked for both leaves the assistant nothing in the workspace',async()=>{
  await mine(alice,'chatgpt','blocked','blocked');
  await assert.rejects(as(chatgpt,()=>access(db,chatgpt,w)),code('not_found'));
  assert.equal((await as(chatgpt,()=>s.workspaces(chatgpt))).some((x:any)=>x.id===w),false);
  assert.equal((await sql(chatgpt,'SELECT id FROM workspace_components WHERE workspace_id=$1',[w])).rows.length,0);
  // Without row security in the way, the application itself says why.
  await assert.rejects(withActor(chatgpt,()=>access(setup,chatgpt,w)),(e:any)=>e.code==='assistant_blocked'&&e.message==='ChatGPT is set to Blocked for data and apps. You can change your own limit under Connections.');
  assert.deepEqual(await names(claude),['Lyon 4']);assert.deepEqual(await names(alice),['Lyon 4']);
  await mine(alice,'chatgpt','edit','edit');assert.deepEqual(await names(chatgpt),['Lyon 4']);
 });

 await t.test('who may change what, in the application and in the database',async()=>{
  await assert.rejects(as(alice,()=>settings.setMaximum(alice,w,{assistant:'claude',data:'edit',apps:'edit'})),code('owner_required'));
  await assert.rejects(as(via(owner,'claude'),()=>settings.setMaximum(via(owner,'claude'),w,{assistant:'claude',data:'edit',apps:'edit'})),code('human_required'));
  await assert.rejects(as(claude,()=>settings.setMine(claude,w,{assistant:'claude',data:'edit',apps:'edit'})),code('human_required'));
  await assert.rejects(as(alice,()=>settings.setMine(alice,w,{assistant:'claude',data:'everything',apps:'edit'})));
  await mine(alice,'claude','view','view');
  // Direct SQL as Bob under the restricted role: he cannot see, change or create Alice's limit.
  assert.equal((await sql(bob,'SELECT 1 FROM assistant_limits WHERE user_id=$1',[alice.userId])).rows.length,0);
  await sql(bob,"UPDATE assistant_limits SET data_level='edit',apps_level='edit' WHERE user_id=$1",[alice.userId]);
  assert.deepEqual((await setup.query("SELECT data_level,apps_level FROM assistant_limits WHERE workspace_id=$1 AND user_id=$2 AND assistant='claude'",[w,alice.userId])).rows[0],{data_level:'view',apps_level:'view'});
  await assert.rejects(sql(bob,"INSERT INTO assistant_limits(workspace_id,user_id,assistant,data_level,apps_level) VALUES($1,$2,'chatgpt','blocked','blocked')",[w,alice.userId]),/row-level security/);
  await assert.rejects(sql(bob,'DELETE FROM assistant_limits WHERE user_id=$1',[alice.userId]),/permission denied/);
  // Alice's own assistant cannot loosen her limit either, and a member cannot change the organization maximum.
  await sql(claude,"UPDATE assistant_limits SET data_level='edit' WHERE user_id=$1",[alice.userId]);
  assert.equal((await setup.query("SELECT data_level FROM assistant_limits WHERE workspace_id=$1 AND user_id=$2 AND assistant='claude'",[w,alice.userId])).rows[0].data_level,'view');
  await assert.rejects(sql(alice,"UPDATE workspaces SET claude_data_level='view' WHERE id=$1",[w]),/organization owner/);
  await assert.rejects(sql(via(owner,'claude'),"UPDATE workspaces SET claude_data_level='view' WHERE id=$1",[w]),/organization owner/);
  // The owner reads every limit, also in the database, and both kinds of change are in the audit log.
  assert.equal((await sql(owner,'SELECT 1 FROM assistant_limits WHERE user_id=$1',[alice.userId])).rows.length,2);
  const logged=(await setup.query("SELECT action,count(*)::int AS n FROM audit_events WHERE workspace_id=$1 AND action LIKE 'assistant.%' GROUP BY action ORDER BY action",[w])).rows;
  assert.deepEqual(logged.map((r:any)=>r.action),['assistant.limit_changed','assistant.maximum_changed']);
  const last=(await setup.query("SELECT actor_id,after_value AS after FROM audit_events WHERE workspace_id=$1 AND action='assistant.limit_changed' ORDER BY event_sequence DESC LIMIT 1",[w])).rows[0];
  assert.equal(last.actor_id,alice.userId);assert.deepEqual(last.after,{assistant:'claude',data:'view',apps:'view'});
  // A person who is removed from the organization leaves no limits behind.
  await as(owner,()=>new MemberRemoval(db).remove(owner,w,alice.userId));
  assert.equal((await setup.query('SELECT 1 FROM assistant_limits WHERE user_id=$1',[alice.userId])).rows.length,0);
 });
});

// Migration 085 maps the earlier switches to levels: nobody's assistant gains anything.
test('existing assistant switches become levels',async()=>{
 const pg=new PGlite();
 try{
  const files=(await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort(),at=files.indexOf('085_assistant_levels.sql');assert.ok(at>0);
  for(const file of files.slice(0,at))await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  const person=():Actor=>({userId:randomUUID(),origin:'human'}),owner=person(),second=person(),ann=person(),ben=person(),cat=person();
  for(const u of [owner,second,ann,ben,cat])await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[u.userId,u.userId,u.userId+'@example.invalid','User']);
  const s=new Service(db),open=(await s.createWorkspace(owner,'Open')).id,closed=(await s.createWorkspace(second,'Closed')).id;
  for(const u of [ann,ben,cat])await s.share(owner,open,u.userId,'editor',[],null,true);
  // Organization switches: ChatGPT off in one workspace, Claude limited to reading by a connection rule in the other.
  await db.query('UPDATE workspaces SET ai_enabled=false WHERE id=$1',[closed]);
  // Per person: Ann's ChatGPT off, Ben's Claude off, Cat's ChatGPT read-only and her Claude without any access.
  await db.query('UPDATE workspace_access SET ai_enabled=false WHERE workspace_id=$1 AND user_id=$2',[open,ann.userId]);
  await db.query('UPDATE workspace_access SET claude_enabled=false WHERE workspace_id=$1 AND user_id=$2',[open,ben.userId]);
  const rules=[{subject:'claude',kind:'connection',resourceId:open,read:'inherit',write:'deny'},
   {subject:cat.userId,kind:'connection',resourceId:open,read:'inherit',write:'deny'},
   {subject:cat.userId,kind:'connection',resourceId:open,field:'claude',read:'deny',write:'inherit'},
   {subject:ann.userId,kind:'table',resourceId:open,read:'deny',write:'inherit'}];
  await db.query('UPDATE workspaces SET permission_rules=$2 WHERE id=$1',[open,JSON.stringify(rules)]);
  for(const file of files.slice(at))await pg.exec(await readFile('migrations/'+file,'utf8'));

  const space=async(id:string)=>(await db.query('SELECT chatgpt_data_level,chatgpt_apps_level,claude_data_level,claude_apps_level,ai_enabled,claude_enabled,permission_rules FROM workspaces WHERE id=$1',[id])).rows[0];
  const c=await space(closed),o=await space(open);
  assert.deepEqual([c.chatgpt_data_level,c.chatgpt_apps_level,c.claude_data_level,c.claude_apps_level],['blocked','blocked','edit','edit']);
  assert.deepEqual([o.chatgpt_data_level,o.chatgpt_apps_level,o.claude_data_level,o.claude_apps_level],['edit','edit','view','view']);
  // The old switches and rules are kept as they were.
  assert.equal(c.ai_enabled,false);assert.equal(c.claude_enabled,true);assert.deepEqual(o.permission_rules,rules);
  const limits=(await db.query('SELECT user_id,assistant,data_level,apps_level FROM assistant_limits WHERE workspace_id=$1',[open])).rows;
  const limit=(u:Actor,assistant:string)=>{const r=limits.find((r:any)=>r.user_id===u.userId&&r.assistant===assistant);return r?[r.data_level,r.apps_level]:null;};
  assert.deepEqual(limit(ann,'chatgpt'),['blocked','blocked']);assert.equal(limit(ann,'claude'),null,'a table rule is not an assistant level');
  assert.deepEqual(limit(ben,'claude'),['blocked','blocked']);assert.equal(limit(ben,'chatgpt'),null);
  assert.deepEqual(limit(cat,'chatgpt'),['view','view']);assert.deepEqual(limit(cat,'claude'),['blocked','blocked']);
  assert.equal(limits.length,4);assert.equal((await db.query('SELECT 1 FROM assistant_limits WHERE workspace_id=$1',[closed])).rows.length,0);

  // Through the application nothing was gained, and nothing that worked before stopped working.
  const levels=async(a:Actor,w:string)=>{const l=await assistantLevels(db,a,await access(db,a,w));return [l.data,l.apps];};
  await assert.rejects(access(db,via(second,'chatgpt'),closed),code('ai_disabled'));
  assert.deepEqual(await levels(via(second,'claude'),closed),['edit','edit']);
  await assert.rejects(access(db,via(ann,'chatgpt'),open),code('ai_disabled'));
  await assert.rejects(access(db,via(ben,'claude'),open),code('ai_disabled'));
  assert.deepEqual(await levels(via(ben,'chatgpt'),open),['edit','edit']);
  assert.deepEqual(await levels(via(owner,'claude'),open),['view','view']);
  await assert.rejects(access(db,via(owner,'claude'),open,true),code('connection_read_only'));
  assert.deepEqual(await levels(via(cat,'chatgpt'),open),['view','view']);
  await assert.rejects(access(db,via(cat,'chatgpt'),open,true),code('connection_read_only'));
  // Cat's Claude could open the workspace before and see nothing in it; now it is told that it is blocked.
  await assert.rejects(access(db,via(cat,'claude'),open),code('assistant_blocked'));
  const view=await new AssistantLevelSettings(db).read(cat,open);
  assert.deepEqual(view.assistants.map((x:any)=>[x.id,x.maximum.data,x.mine.data,x.effective.data]),[['chatgpt','edit','view','view'],['claude','view','blocked','blocked']]);
 }finally{await pg.close();}
});
