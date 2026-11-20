import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import request from 'supertest';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,setDatabaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AccessManagement} from '../src/domain/access-management.js';
import {AccessGrid} from '../src/domain/access-grid.js';
import {markAppTables} from '../src/domain/effective-access.js';
import {baseApp,addApi,errors} from '../src/server/app.js';
import {addWorkspaceMcp} from '../src/server/workspace-foundation.js';
import type {Actor} from '../src/shared/schema.js';
import {seedColumnRule,seedHiddenFields,retired} from './legacy-restrictions.js';

// A2 with default D1: access to data is set per table, per person: Edit, View only or Blocked.
// Per-column permissions are retired. The ones that exist keep working and can only be lifted, by an organization owner.
// The application runs as the deployed service does: restricted database role, the acting person in the database context.
async function world(){
 const pg=new PGlite();
 for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const setup:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
 const db:Database={query:(q,v)=>db.transaction(tx=>tx.query(q,v)),transaction:fn=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return fn(tx as Connection);}),close:async()=>{}};
 const person=():Actor=>({userId:randomUUID(),origin:'human'}),owner=person(),mia=person(),ben=person();
 for(const [a,name] of [[owner,'Owner'],[mia,'Mia'],[ben,'Ben']] as const)await setup.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,name.toLowerCase()+'@example.invalid',name]);
 const boot=new Service(setup),w=(await boot.createWorkspace(owner,'Table access')).id;
 for(const a of [mia,ben])await boot.share(owner,w,a.userId,'editor',[],null,true);
 const s=new Service(db),f=new WorkspaceFoundation(db),am=new AccessManagement(db),grid=new AccessGrid(db);
 const data=(a:Actor,op:any)=>withActor(a,async()=>{const p=await s.preview(a,w,op);return s.commit(a,p.id,p.digest);});
 const change=(a:Actor,op:any)=>withActor(a,async()=>{const p=await f.preview(a,w,op);return f.confirm(a,w,p.id,p.digest);});
 const table=async(name:string,keys:string[])=>{const id=(await data(owner,{kind:'create_type',name,fields:keys.map(key=>({key,name:key[0].toUpperCase()+key.slice(1),kind:'text',ai:true}))})).objects[0].id;const record=(await data(owner,{kind:'create_record',typeId:id,data:Object.fromEntries(keys.map(k=>[k,name+' '+k]))})).objects[0].id;return {id,record};};
 const project=await change(owner,{kind:'create_node',nodeKind:'project',name:'Work'});
 const app=async(name:string,typeId:string,fields:string[])=>(await change(owner,{kind:'save_component',projectId:project.id,content:{name,format:'frontend-js',sourceAccess:'bindings',bindings:[{typeId,fields}],source:`return {html:'<p>${name}</p>',state:tools.call('records.read',{typeId:'${typeId}'})};`}})).id as string;
 const version=async()=>(await setup.query('SELECT access_version FROM workspaces WHERE id=$1',[w])).rows[0].access_version as number;
 const update=async(a:Actor,subject:string,rule:any)=>withActor(a,async()=>am.update(a,w,{expectedVersion:await version(),subject,rule}));
 const stored=async()=>({rules:((await setup.query('SELECT permission_rules FROM workspaces WHERE id=$1',[w])).rows[0].permission_rules as any[]).filter(r=>r.kind==='column'),hidden:Object.fromEntries((await setup.query('SELECT user_id,hidden_fields FROM workspace_access WHERE workspace_id=$1',[w])).rows.filter(r=>r.hidden_fields.length).map(r=>[r.user_id,r.hidden_fields]))});
 const rows=async(a:Actor,typeId:string)=>(await withActor(a,()=>s.records(a,w,typeId))).rows as any[];
 return {pg,setup,db,owner,mia,ben,w,s,f,am,grid,data,change,table,app,version,update,stored,rows};
}

test('table access per person: Edit, View only and Blocked hold for records, through an app, for an assistant and in the database',async()=>{
 const x=await world(),{pg,setup,db,owner,mia,w,s,f,grid,data,update,rows}=x;
 try{
  const sites=await x.table('Sites',['name','budget']),contacts=await x.table('Contacts',['name','phone']),visits=await x.table('Visits',['name']);
  const apps={sites:await x.app('Sites app',sites.id,['name','budget']),contacts:await x.app('Contacts app',contacts.id,['name','phone']),visits:await x.app('Visits app',visits.id,['name'])};
  const ai:Actor={...mia,origin:'ai'};
  const level=async(t:string)=>{const r=(await withActor(owner,()=>grid.read(owner,w,mia.userId))).rows.find((r:any)=>r.kind==='table'&&r.resourceId===t);return !r||r.read===false?'Blocked':r.write===true?'Edit':r.write===false?'View only':'Mixed';};
  const add=(a:Actor,t:string)=>withActor(a,()=>s.preview(a,w,{kind:'create_record',typeId:t,data:{name:'Added'}}));
  const open=async(a:Actor,appId:string)=>(await withActor(a,()=>f.runFrontend(a,w,{componentId:appId,expectedVersion:0})) as any).state.rows.length as number;
  const addInApp=(a:Actor,appId:string,t:string)=>withActor(a,()=>f.preview(a,w,{kind:'apply_component_records',componentId:appId,expectedVersion:0,changes:[{kind:'create_record',typeId:t,data:{name:'Added in the app'}}]}));
  // What the database itself lets this person do, whatever the application asks for.
  const inDatabase=(a:Actor,t:string)=>withActor(a,()=>db.transaction(async tx=>({read:(await tx.query('SELECT id FROM records WHERE workspace_id=$1 AND type_id=$2',[w,t])).rows.length,changed:await tx.query('UPDATE records SET data=data WHERE workspace_id=$1 AND type_id=$2 RETURNING id',[w,t]).then(r=>r.rows.length,()=>0)})));

  // Edit is what a team member has until an organization owner says otherwise.
  for(const t of [sites,contacts,visits])assert.equal(await level(t.id),'Edit');
  assert.equal((await rows(mia,sites.id)).length,1);await add(mia,sites.id);await add(ai,sites.id);assert.equal(await open(mia,apps.sites),1);await addInApp(mia,apps.sites,sites.id);await addInApp(ai,apps.sites,sites.id);
  assert.deepEqual(await inDatabase(mia,sites.id),{read:1,changed:1});

  // View only: read everywhere, change nowhere.
  await update(owner,mia.userId,{kind:'table',resourceId:contacts.id,read:'allow',write:'deny'});assert.equal(await level(contacts.id),'View only');
  for(const a of [mia,ai]){assert.equal((await rows(a,contacts.id))[0].data.phone,'Contacts phone');await assert.rejects(add(a,contacts.id),/read-only|not permitted|restricted/);assert.equal(await open(a,apps.contacts),1);await assert.rejects(addInApp(a,apps.contacts,contacts.id),/read-only|not permitted|restricted/);}
  await assert.rejects(data(mia,{kind:'update_record',recordId:contacts.record,expectedVersion:0,data:{name:'Changed'}}),/read-only|not permitted|restricted/);
  assert.deepEqual(await inDatabase(mia,contacts.id),{read:1,changed:0});

  // Blocked: the table is not there for this person, in the list of tables, in the app or for the assistant.
  await update(owner,mia.userId,{kind:'table',resourceId:visits.id,read:'deny',write:'deny'});assert.equal(await level(visits.id),'Blocked');
  for(const a of [mia,ai]){await assert.rejects(rows(a,visits.id),/not found/i);await assert.rejects(add(a,visits.id));await assert.rejects(open(a,apps.visits));await assert.rejects(addInApp(a,apps.visits,visits.id));assert.ok(!(await withActor(a,()=>s.types(a,w))).some((t:any)=>t.id===visits.id));}
  assert.deepEqual(await inDatabase(mia,visits.id),{read:0,changed:0});
  // The other tables and the other people are untouched.
  assert.equal(await level(sites.id),'Edit');assert.equal((await rows(x.ben,visits.id)).length,1);assert.equal((await rows(owner,visits.id)).length,1);await add(mia,sites.id);

  // The levels can be changed back, and only an organization owner sets them.
  await assert.rejects(update(mia,mia.userId,{kind:'table',resourceId:visits.id,read:'inherit',write:'inherit'}),/owner/);
  await assert.rejects(update({...owner,origin:'ai'},mia.userId,{kind:'table',resourceId:visits.id,read:'inherit',write:'inherit'}),/signed-in/);assert.equal(await level(visits.id),'Blocked');
  await update(owner,mia.userId,{kind:'table',resourceId:visits.id,read:'allow',write:'deny'});assert.equal(await level(visits.id),'View only');assert.equal((await rows(mia,visits.id)).length,1);await assert.rejects(add(mia,visits.id));
  await update(owner,mia.userId,{kind:'table',resourceId:contacts.id,read:'inherit',write:'inherit'});assert.equal(await level(contacts.id),'Edit');await add(mia,contacts.id);await addInApp(ai,apps.contacts,contacts.id);
  assert.deepEqual(await inDatabase(mia,contacts.id),{read:1,changed:1});

  // A table added for an app says so in the grid: it follows the role on that app.
  await withActor(owner,()=>db.transaction(tx=>markAppTables(tx,w,apps.visits,[visits.id])));
  const read=await withActor(owner,()=>grid.read(owner,w,mia.userId)),visitRow=read.rows.find((r:any)=>r.kind==='table'&&r.resourceId===visits.id),siteRow=read.rows.find((r:any)=>r.kind==='table'&&r.resourceId===sites.id);
  assert.equal(visitRow.appName,'Visits app');assert.equal(visitRow.hint,'Follows the role on Visits app');assert.equal(siteRow.appName,undefined);assert.equal(siteRow.hint,undefined);
  // No column rule or hidden field was written by any of this.
  assert.deepEqual(await x.stored(),{rules:[],hidden:{}});assert.deepEqual(read.legacy,[]);void setup;
 }finally{await pg.close();}
});

test('per-column permissions are frozen: none can be added at any entry point, existing ones stay enforced, and only an organization owner lifts them',async()=>{
 const x=await world(),{pg,setup,db,owner,mia,ben,w,s,f,am,grid,data,update,rows,stored}=x;
 try{
  const sites=await x.table('Sites',['name','budget']),contacts=await x.table('Contacts',['name','phone']),costs=await x.table('Costs',['name','budget']);
  const sitesApp=await x.app('Sites app',sites.id,['name','budget']),namesApp=await x.app('Site names',sites.id,['name']);
  const ai=(a:Actor):Actor=>({...a,origin:'ai'}),cell=async(a:Actor,t:{id:string},key:string)=>(await rows(a,t.id))[0].data[key];
  let actor:Actor=owner;const web=baseApp();addApi(web,s,(req:any,_res:any,next:any)=>{req.actor=actor;req.session={csrf:'x'};withActor(actor,next);});web.use(errors);
  const post=(a:Actor,path:string,body:any)=>{actor=a;return request(web).post(`/api/workspaces/${w}${path}`).send(body);};
  const tool=(a:Actor,name:string,args:any)=>{const handlers=new Map<string,any>();addWorkspaceMcp({registerTool:(n:string,_config:any,handler:any)=>handlers.set(n,handler)} as any,f,a,(handler:any)=>handler,{});return withActor(a,()=>handlers.get(name)({workspaceId:w,...args}));};
  const refused=(r:request.Response)=>{assert.equal(r.status,409,r.text);assert.equal(r.body.error,'column_permissions_retired');assert.equal(r.body.message,'Per-column permissions are no longer offered. Put information for a different audience in its own table.');};
  const before=await x.version();

  // 1. Nothing new: every way in refuses a column restriction, for a person and for an assistant, hidden or view only.
  const budget={kind:'column',resourceId:sites.id,field:'budget'},gridRow={subject:mia.userId,...budget};
  for(const subject of [mia.userId,'chatgpt','claude'])for(const level of [{read:'deny',write:'deny'},{read:'inherit',write:'deny'}]){
   await assert.rejects(update(owner,subject,{...budget,...level}),retired);
   refused(await post(owner,'/effective-access',{expectedVersion:before,subject,rule:{...budget,...level}}));
   await assert.rejects(tool(ai(owner),'update_effective_access',{change:{expectedVersion:before,subject,rule:{...budget,...level}}}),retired);
  }
  await assert.rejects(update(owner,mia.userId,{...budget,read:'allow',write:'allow'}),retired); // nor a per-column grant
  for(const subject of [mia.userId,'all','claude'])for(const level of [{read:true,write:false},{read:false,write:false}]){
   const batch={expectedVersion:before,changes:[{...gridRow,subject,...level}]};
   await assert.rejects(withActor(owner,()=>grid.save(owner,w,batch)),retired);
   await assert.rejects(withActor(owner,()=>grid.prepare(owner,w,batch)),retired);
   refused(await post(owner,'/access-grid',batch));
   await assert.rejects(tool(ai(owner),'save_access_grid',{batch}),retired);
  }
  // A column change hidden in a batch of allowed changes refuses the whole batch.
  await assert.rejects(withActor(owner,()=>grid.save(owner,w,{expectedVersion:before,changes:[{subject:mia.userId,kind:'table',resourceId:contacts.id,read:true,write:false},{...gridRow,read:true,write:false}]})),retired);
  // Hidden fields: not for someone who already has access, not for someone new.
  const newcomer:Actor={userId:randomUUID(),origin:'human'};await setup.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[newcomer.userId,newcomer.userId,'new@example.invalid','New']);
  for(const who of [ben,newcomer])for(const hidden of [['budget'],[sites.id+':budget']]){
   await assert.rejects(withActor(owner,()=>s.share(owner,w,who.userId,'editor',hidden,null,true)),retired);
   refused(await post(owner,'/members',{userId:who.userId,role:'editor',hiddenFields:hidden,allowedTypes:null,ai:true}));
  }
  assert.equal((await setup.query('SELECT 1 FROM workspace_access WHERE workspace_id=$1 AND user_id=$2',[w,newcomer.userId])).rows.length,0);
  // Invitations.
  for(const level of [{read:'deny',write:'deny'},{read:'inherit',write:'deny'}])refused(await post(owner,'/invitations',{label:'Colleague',role:'viewer',allowedTypes:null,accessRules:[{...budget,...level}],days:7,confirmed:true}));
  assert.equal((await setup.query('SELECT count(*)::int AS n FROM workspace_invitations WHERE workspace_id=$1',[w])).rows[0].n,0);
  // Nothing was stored and nobody lost anything.
  assert.deepEqual(await stored(),{rules:[],hidden:{}});assert.equal(await x.version(),before);assert.equal(await cell(mia,sites,'budget'),'Sites budget');
  // The same doors still take table access.
  assert.equal((await post(owner,'/access-grid',{expectedVersion:before,changes:[{subject:mia.userId,kind:'table',resourceId:costs.id,read:true,write:false}]})).status,200);
  assert.equal((await post(owner,'/invitations',{label:'Colleague',role:'viewer',allowedTypes:null,accessRules:[{kind:'table',resourceId:costs.id,read:'deny',write:'deny'}],days:7,confirmed:true})).status,200);
  assert.ok((await tool(ai(owner),'save_access_grid',{batch:{expectedVersion:await x.version(),changes:[{subject:mia.userId,kind:'table',resourceId:costs.id,read:true,write:true}]}})).reviewUrl);

  // 2. What already exists (seeded the way older organizations have it) keeps working exactly as before.
  await seedColumnRule(setup,w,{subject:mia.userId,resourceId:sites.id,field:'budget'}); // hidden
  await seedColumnRule(setup,w,{subject:mia.userId,resourceId:contacts.id,field:'phone',read:'inherit',write:'deny'}); // view only
  await seedColumnRule(setup,w,{subject:'claude',resourceId:contacts.id,field:'phone'}); // hidden from one assistant
  await seedHiddenFields(setup,w,ben.userId,['budget',contacts.id+':phone']); // a bare key hides the column in every table
  const enforced=async()=>{
   for(const a of [mia,ai(mia)]){assert.equal(await cell(a,sites,'budget'),undefined);assert.equal(await cell(a,sites,'name'),'Sites name');}
   await assert.rejects(data(mia,{kind:'update_record',recordId:sites.record,expectedVersion:0,data:{budget:'9'}}));
   // Through an app: one that uses the hidden column fails closed for her; one that does not still opens, without the column.
   await assert.rejects(withActor(mia,()=>f.runFrontend(mia,w,{componentId:sitesApp,expectedVersion:0})),/unavailable/);await assert.rejects(withActor(mia,()=>f.toolTables(mia,w,sitesApp)),/unavailable/);
   const viaApp=(await withActor(mia,()=>f.runFrontend(mia,w,{componentId:namesApp,expectedVersion:0})) as any).state.rows[0].data;assert.equal(viaApp.name,'Sites name');assert.equal(viaApp.budget,undefined);
   assert.equal(await cell(mia,contacts,'phone'),'Contacts phone');await assert.rejects(data(mia,{kind:'update_record',recordId:contacts.record,expectedVersion:0,data:{phone:'1'}}),/restricted/);
   assert.equal(await cell({...owner,origin:'ai',assistant:'claude'},contacts,'phone'),undefined);assert.equal(await cell(ai(owner),contacts,'phone'),'Contacts phone');
   for(const a of [ben,ai(ben)]){assert.equal(await cell(a,sites,'budget'),undefined);assert.equal(await cell(a,costs,'budget'),undefined);assert.equal(await cell(a,contacts,'phone'),undefined);assert.equal(await cell(a,contacts,'name'),'Contacts name');}
  };
  await enforced();
  const mine=async(subject:string)=>(await withActor(owner,()=>grid.read(owner,w,subject))).legacy.map((r:any)=>[r.table,r.column,r.level]);
  assert.deepEqual(await mine(mia.userId),[['Contacts','Phone','View only'],['Sites','Budget','Hidden']]);assert.deepEqual(await mine('claude'),[['Contacts','Phone','Hidden']]);assert.deepEqual(await mine('chatgpt'),[]);
  assert.deepEqual(await mine(ben.userId),[['Contacts','Phone','Hidden'],['Costs','Budget','Hidden'],['Sites','Budget','Hidden']]);
  // People are not told which columns are kept from them, and their column rows cannot be changed.
  assert.deepEqual((await withActor(mia,()=>grid.read(mia,w))).legacy,[]);
  const columns=(await withActor(owner,()=>grid.read(owner,w,mia.userId))).rows.filter((r:any)=>r.kind==='column');
  assert.deepEqual(columns.filter((r:any)=>r.canChange).map((r:any)=>r.name).sort(),['Budget','Phone']);assert.ok(columns.length>2);

  // 3. Saving something else never drops or loosens one.
  const kept=await stored();
  await update(owner,mia.userId,{kind:'table',resourceId:sites.id,read:'allow',write:'deny'});await update(owner,mia.userId,{kind:'table',resourceId:sites.id,read:'inherit',write:'inherit'});
  await withActor(owner,async()=>am.update(owner,w,{expectedVersion:await x.version(),subject:ben.userId,role:'viewer'}));await withActor(owner,async()=>am.update(owner,w,{expectedVersion:await x.version(),subject:ben.userId,role:'editor'}));
  await withActor(owner,async()=>grid.save(owner,w,{expectedVersion:await x.version(),changes:[{subject:'all',kind:'table',resourceId:costs.id,read:true,write:true},{subject:mia.userId,kind:'tool',resourceId:sitesApp,read:true,write:true}]}));
  await withActor(owner,()=>s.share(owner,w,ben.userId,'editor',null,null,true));assert.equal((await post(owner,'/members',{userId:ben.userId,role:'editor',allowedTypes:null,ai:true})).status,200);
  assert.deepEqual(await stored(),kept);await enforced();
  // An existing one cannot be tightened either: view only stays view only.
  await assert.rejects(update(owner,mia.userId,{kind:'column',resourceId:contacts.id,field:'phone',read:'deny',write:'deny'}),retired);
  await assert.rejects(withActor(owner,async()=>grid.save(owner,w,{expectedVersion:await x.version(),changes:[{subject:mia.userId,kind:'column',resourceId:contacts.id,field:'phone',read:false,write:false}]})),retired);
  assert.deepEqual(await stored(),kept);

  // 4. Only an organization owner, signed in, lifts one.
  const liftRule={kind:'column',resourceId:sites.id,field:'budget',read:'inherit',write:'inherit'},liftRow={subject:mia.userId,kind:'column',resourceId:sites.id,field:'budget',read:true,write:true};
  for(const a of [mia,ben]){
   await assert.rejects(update(a,mia.userId,liftRule),/owner/);await assert.rejects(update(a,ben.userId,liftRule),/owner/);
   await assert.rejects(withActor(a,async()=>grid.save(a,w,{expectedVersion:await x.version(),changes:[liftRow]})),/owner/);
   await assert.rejects(withActor(a,()=>s.share(a,w,ben.userId,'editor',[],null,true)),/owner/i);
   assert.equal((await post(a,'/effective-access',{expectedVersion:await x.version(),subject:mia.userId,rule:liftRule})).status,403);
   assert.equal((await post(a,'/access-grid',{expectedVersion:await x.version(),changes:[liftRow]})).status,403);
   assert.equal((await post(a,'/members',{userId:ben.userId,role:'editor',hiddenFields:[],allowedTypes:null,ai:true})).status,403);
  }
  // An assistant acting for the owner cannot either: it can only prepare the change for the owner to confirm.
  await assert.rejects(update(ai(owner),mia.userId,liftRule),/signed-in/);await assert.rejects(withActor(ai(owner),async()=>grid.save(ai(owner),w,{expectedVersion:await x.version(),changes:[liftRow]})),/signed-in/);
  assert.ok((await tool(ai(owner),'save_access_grid',{batch:{expectedVersion:await x.version(),changes:[liftRow]}})).reviewUrl);
  assert.deepEqual(await stored(),kept);await enforced();

  // The owner loosens hidden to view only: Mia now reads the budget and still cannot change it.
  await update(owner,mia.userId,{kind:'column',resourceId:sites.id,field:'budget',read:'inherit',write:'deny'});
  assert.equal(await cell(mia,sites,'budget'),'Sites budget');await assert.rejects(data(mia,{kind:'update_record',recordId:sites.record,expectedVersion:0,data:{budget:'9'}}),/restricted/);assert.deepEqual((await mine(mia.userId))[1],['Sites','Budget','View only']);
  // Then lifts it, through the grid; the rule is gone, not replaced by a per-column grant.
  await withActor(owner,async()=>grid.save(owner,w,{expectedVersion:await x.version(),changes:[liftRow]}));
  assert.ok(!(await stored()).rules.some(r=>r.subject===mia.userId&&r.field==='budget'));await data(mia,{kind:'update_record',recordId:sites.record,expectedVersion:0,data:{budget:'9'}});assert.equal(await cell(ai(mia),sites,'budget'),'9');
  assert.equal((await withActor(mia,()=>f.runFrontend(mia,w,{componentId:sitesApp,expectedVersion:0})) as any).state.rows[0].data.budget,'9');
  // The view-only rule and the assistant's rule are lifted through the Access change; the others stay.
  await update(owner,mia.userId,{kind:'column',resourceId:contacts.id,field:'phone',read:'inherit',write:'inherit'});await data(mia,{kind:'update_record',recordId:contacts.record,expectedVersion:0,data:{phone:'1'}});
  assert.equal((await post(owner,'/effective-access',{expectedVersion:await x.version(),subject:'claude',rule:{kind:'column',resourceId:contacts.id,field:'phone',read:'inherit',write:'inherit'}})).status,200);
  assert.equal(await cell({...owner,origin:'ai',assistant:'claude'},contacts,'phone'),'1');assert.deepEqual((await stored()).rules,[]);
  // Ben's hidden fields. Lifting the bare key for one table keeps it hidden in every other table.
  await update(owner,ben.userId,{kind:'column',resourceId:sites.id,field:'budget',read:'inherit',write:'inherit'});
  assert.deepEqual((await stored()).hidden,{[ben.userId]:[contacts.id+':phone',costs.id+':budget']});assert.equal(await cell(ben,sites,'budget'),'9');assert.equal(await cell(ben,costs,'budget'),undefined);assert.equal(await cell(ben,contacts,'phone'),undefined);
  // One through the grid, the last by saving the person's access with a shorter list. A longer list is still refused.
  assert.equal((await post(owner,'/access-grid',{expectedVersion:await x.version(),changes:[{subject:ben.userId,kind:'column',resourceId:contacts.id,field:'phone',read:true,write:true}]})).status,200);
  assert.deepEqual((await stored()).hidden,{[ben.userId]:[costs.id+':budget']});assert.equal(await cell(ben,contacts,'phone'),'1');
  refused(await post(owner,'/members',{userId:ben.userId,role:'editor',hiddenFields:[costs.id+':budget','name'],allowedTypes:null,ai:true}));
  assert.equal((await post(owner,'/members',{userId:ben.userId,role:'editor',hiddenFields:[],allowedTypes:null,ai:true})).status,200);
  assert.deepEqual(await stored(),{rules:[],hidden:{}});assert.equal(await cell(ai(ben),costs,'budget'),'Costs budget');assert.deepEqual(await mine(ben.userId),[]);
  // Once lifted it cannot come back.
  await assert.rejects(update(owner,mia.userId,{kind:'column',resourceId:sites.id,field:'budget',read:'deny',write:'deny'}),retired);void db;
 }finally{await pg.close();}
});
