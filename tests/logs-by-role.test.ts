import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import express from 'express';
import request from 'supertest';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,setDatabaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppRoles} from '../src/domain/app-sharing.js';
import {AppLogs} from '../src/domain/app-log.js';
import {activityPage,activityDetails} from '../src/workspace/activity.js';
import {AutomationManagement} from '../src/automations/management.js';
import {addAppApi} from '../src/server/apps.js';
import {addWorkspaceMcp} from '../src/server/workspace-foundation.js';
import type {Actor} from '../src/shared/schema.js';

// A7: organization owners read the organization log, an app's owners read that app's log, everyone else reads
// the history of records they can read. Today's table permissions decide what an old entry may show.
test('logs and history follow roles, and old entries follow today\'s table permissions',async t=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
  const setup:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  // The deployed service: restricted role, with the acting person in the database context.
  const db:Database={query:(q,v)=>db.transaction(tx=>tx.query(q,v)),transaction:fn=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return fn(tx as Connection);}),close:async()=>{}};
  const person=():Actor=>({userId:randomUUID(),origin:'human'}),owner=person(),alice=person(),dana=person(),bob=person(),vic=person(),ina=person(),carol=person();
  for(const [a,name] of [[owner,'Owner'],[alice,'Alice'],[dana,'Dana'],[bob,'Bob'],[vic,'Vic'],[ina,'Ina'],[carol,'Carol']] as const)await setup.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,name.toLowerCase()+'@example.invalid',name]);
  const boot=new Service(setup),w=(await boot.createWorkspace(owner,'Logs')).id;
  for(const a of [alice,dana,bob,vic,carol])await boot.share(owner,w,a.userId,'editor',[],null,false);
  await boot.share(owner,w,ina.userId,'inspector',[],null,false);
  const s=new Service(db),f=new WorkspaceFoundation(db),roles=new AppRoles(db),logs=new AppLogs(db);
  const as=<T>(a:Actor,fn:()=>Promise<T>)=>withActor(a,fn);
  const save=async(a:Actor,op:any)=>as(a,async()=>{const p=await s.preview(a,w,op);return (await s.commit(a,p.id,p.digest)).objects[0];});
  const change=(a:Actor,op:any)=>as(a,async()=>{const p=await f.preview(a,w,op);return f.confirm(a,w,p.id,p.digest);});
  const rule=(rules:any[])=>setup.query('UPDATE workspaces SET permission_rules=permission_rules||$2::jsonb,access_version=access_version+1 WHERE id=$1',[w,JSON.stringify(rules)]);
  const log=(a:Actor,appId:string,page:any={})=>as(a,()=>logs.appLog(a,w,appId,page));
  const words=(v:unknown)=>JSON.stringify(v);

  const sites=(await save(owner,{kind:'create_type',name:'Sites',fields:[{key:'name',name:'Name',kind:'text',required:true,ai:true},{key:'budget',name:'Budget',kind:'text',ai:true}]})).id as string;
  const contacts=(await save(owner,{kind:'create_type',name:'Contacts',fields:[{key:'name',name:'Name',kind:'text',required:true,ai:true},{key:'phone',name:'Phone',kind:'text',ai:true}]})).id as string;
  const project=await change(owner,{kind:'create_node',nodeKind:'project',name:'Work'});
  const app=await change(alice,{kind:'save_component',projectId:project.id,content:{name:'Pipeline',format:'text',source:'v1',bindings:[{typeId:sites,fields:['name','budget']},{typeId:contacts,fields:['name','phone']}]}});
  const other=await change(carol,{kind:'save_component',projectId:project.id,content:{name:'Other',format:'text',source:'v1'}});
  await as(alice,()=>roles.setRole(alice,w,{appId:app.id,userId:vic.userId,role:'viewer'}));
  await as(alice,()=>roles.setRole(alice,w,{appId:app.id,userId:dana.userId,role:'owner'}));
  // Records changed from inside the app carry the app in their log entry.
  const inApp=(a:Actor):Actor=>({...a,accessToolId:app.id});
  const site=(await save(inApp(alice),{kind:'create_record',typeId:sites,data:{name:'SITE-SENTINEL',budget:'BUDGET-SENTINEL'}})).id as string;
  await save(inApp(alice),{kind:'update_record',recordId:site,expectedVersion:0,data:{budget:'BUDGET-SECOND'}});
  const contact=(await save(inApp(alice),{kind:'create_record',typeId:contacts,data:{name:'CONTACT-SENTINEL',phone:'PHONE-SENTINEL'}})).id as string;
  // A record changed outside the app is not part of the app's log.
  const outside=(await save(owner,{kind:'create_record',typeId:sites,data:{name:'OUTSIDE-SENTINEL',budget:'OUTSIDE-BUDGET'}})).id as string;

  await t.test('the organization log is for organization owners; an inspector and a member cannot read it',async()=>{
   assert.ok((await as(owner,()=>s.history(owner,w))).some((e:any)=>e.action==='app.role_changed'));
   for(const a of [ina,bob,alice])await assert.rejects(as(a,()=>s.history(a,w)),/organization owners/);
   assert.equal((await as(owner,()=>activityPage(db,owner,w,{limit:200}))).scope,'Workspace audit metadata');
   // An inspector keeps the inspection copy with records and their history, but without the organization log.
   // (Checked without row security: under the deployed role the database already refuses an inspector's export, because it cannot write the export's own log entry.)
   const copy=await boot.exportWorkspace(ina,w);assert.deepEqual(copy.audit_events,[]);assert.ok(copy.records.length>=3&&copy.revisions.length>0);
   await assert.rejects(as(ina,()=>s.exportWorkspace(ina,w)),/row-level security/);
   assert.ok((await as(owner,()=>s.exportWorkspace(owner,w))).audit_events.length>0);
   // On the Activity page an inspector or a member sees record events for records they can read, and nothing about apps they do not own.
   for(const a of [ina,bob]){const page=await as(a,()=>activityPage(db,a,w,{limit:200}));assert.notEqual(page.scope,'Workspace audit metadata');
    assert.ok(page.rows.some((r:any)=>r.action==='record.created'),'record events stay');
    assert.deepEqual(page.rows.filter((r:any)=>!/^record\./.test(r.action)).map((r:any)=>r.action),[],'no app, project or table events');}
   // An app owner also sees the events of the app they own there, and not those of another app.
   const mine=await as(alice,()=>activityPage(db,alice,w,{limit:200}));
   assert.ok(mine.rows.some((r:any)=>r.action==='app.role_changed'&&r.resource_id===app.id));assert.ok(!mine.rows.some((r:any)=>r.resource_id===other.id||r.resource_id===project.id));
  });

  await t.test('an app owner reads the log of their app and not of another app; editors and viewers cannot',async()=>{
   const page=await log(alice,app.id,{limit:100});assert.equal(page.name,'Pipeline');assert.equal(page.nextOffset,null);
   const lines=page.rows.map((r:any)=>r.description);
   for(const line of ['Created the app','Made Vic a viewer','Made Dana an owner','Added a record in Sites','Changed a record in Sites','Added a record in Contacts'])assert.ok(lines.includes(line),line+' missing from '+words(lines));
   assert.ok(page.rows.every((r:any)=>r.actorName==='Alice'&&r.at&&r.action&&r.id));
   // Newest first, with the values the reader may read today.
   assert.deepEqual(lines.slice(0,3),['Added a record in Contacts','Changed a record in Sites','Added a record in Sites']);
   assert.deepEqual(page.rows[1].changes,[{field:'Budget',before:{text:'BUDGET-SENTINEL',truncated:false},after:{text:'BUDGET-SECOND',truncated:false}}]);
   assert.ok(!words(page).includes('OUTSIDE-SENTINEL'),'a record changed outside the app is not in its log');
   // Saved code and settings never leave the row: an entry is a line, who and when.
   assert.ok(!words(page).includes('"source"')&&!words(page).includes('bindings'));
   // Paging.
   const first=await log(alice,app.id,{limit:2}),second=await log(alice,app.id,{limit:2,offset:first.nextOffset});
   assert.equal(first.nextOffset,2);assert.deepEqual([...first.rows,...second.rows].map((r:any)=>r.id),page.rows.slice(0,4).map((r:any)=>r.id));
   // The organization owner owns every app; a co-owner reads the same log.
   assert.equal((await log(owner,app.id,{limit:100})).rows.length,page.rows.length);assert.equal((await log(dana,app.id,{limit:100})).rows.length,page.rows.length);
   // Another app: its own owner only, and nothing of the first app in it.
   const theirs=await log(carol,other.id);assert.deepEqual(theirs.rows.map((r:any)=>r.description),['Created the app']);
   await assert.rejects(log(carol,app.id),/owner of this app/);await assert.rejects(log(alice,other.id),/owner of this app/);
   for(const a of [bob,vic,ina])await assert.rejects(log(a,app.id),/owner of this app/);
   await assert.rejects(log(alice,randomUUID()),/App unavailable/);
   // Earlier versions of the app belong to its log: owners only.
   assert.ok((await as(alice,()=>f.componentHistory(alice,w,app.id))).length>=1);assert.ok((await as(owner,()=>f.componentHistory(owner,w,app.id))).length>=1);
   for(const a of [bob,vic])await assert.rejects(as(a,()=>f.componentHistory(a,w,app.id)),/owner of this app/);
   // The website route and the assistant operation reach the same check.
   const site=(a:Actor)=>{const web=express();web.use((req:any,_res,next)=>{req.actor=a;withActor(a,()=>next());});addAppApi(web,f);return request(web).get(`/api/workspaces/${w}/apps/${app.id}/log?offset=1`);};
   const viaSite=await site(alice);assert.equal(viaSite.status,200);assert.equal(viaSite.body.rows[0].id,page.rows[1].id);assert.equal((await site(bob)).status,403);
   const operation=(a:Actor)=>{const handlers=new Map<string,any>();addWorkspaceMcp({registerTool:(name:string,_config:any,handler:any)=>handlers.set(name,handler)} as any,f,a,(handler:any)=>handler,{});return as<any>(a,()=>handlers.get('read_app_log')({workspaceId:w,appId:app.id,limit:1}));};
   assert.equal((await operation(alice)).rows[0].id,page.rows[0].id);await assert.rejects(operation(bob),/owner of this app/);
  });

  await t.test('an app owner blocked from a table sees its entries without values',async()=>{
   const before=await log(dana,app.id,{limit:100});assert.ok(words(before).includes('BUDGET-SENTINEL')&&words(before).includes('PHONE-SENTINEL'));
   await rule([{subject:dana.userId,kind:'table',resourceId:sites,read:'deny',write:'deny'},{subject:dana.userId,kind:'column',resourceId:contacts,field:'phone',read:'deny',write:'deny'}]);
   const after=await log(dana,app.id,{limit:100});assert.equal(after.rows.length,before.rows.length,'the entries stay: who, what and when');
   for(const hidden of ['SITE-SENTINEL','BUDGET-SENTINEL','BUDGET-SECOND','PHONE-SENTINEL','Sites','Budget','Phone'])assert.ok(!words(after).includes(hidden),hidden+' must not show');
   const lines=after.rows.map((r:any)=>r.description);assert.deepEqual(lines.slice(0,3),['Added a record in Contacts','Changed a record','Added a record']);
   assert.equal(after.rows[1].changes,undefined);assert.equal(after.rows[2].changes,undefined);
   // The table Dana can still read keeps the columns she can read.
   assert.deepEqual(after.rows[0].changes,[{field:'Name',before:{text:'Not set',truncated:false},after:{text:'CONTACT-SENTINEL',truncated:false}}]);
   // Alice is not restricted and still sees the values.
   assert.ok(words(await log(alice,app.id,{limit:100})).includes('BUDGET-SENTINEL'));
  });

  await t.test('a viewer sees history only for records and fields they can read now',async()=>{
   await rule([{subject:vic.userId,kind:'column',resourceId:sites,field:'budget',read:'deny',write:'deny'},{subject:vic.userId,kind:'table',resourceId:contacts,read:'deny',write:'deny'}]);
   for(const a of [vic,inApp(vic)]){
    const history=await as(a,()=>s.recordHistory(a,w,site));assert.equal(history.revisions.length,2);
    assert.deepEqual(history.fields.map((x:any)=>x.key),['name']);assert.ok(history.revisions.every((v:any)=>v.data.name==='SITE-SENTINEL'&&!('budget' in v.data)));
    await assert.rejects(as(a,()=>s.recordHistory(a,w,contact)),/not found/i);
    const changes=await as(a,()=>s.fieldChanges(a,w,{}));assert.ok(changes.changes.length>0);
    assert.ok(changes.changes.every((c:any)=>c.type_id===sites&&c.field_key==='name'),'only readable fields of readable tables');
    for(const hidden of ['BUDGET-SENTINEL','BUDGET-SECOND','CONTACT-SENTINEL','PHONE-SENTINEL'])assert.ok(!words(history).includes(hidden)&&!words(changes).includes(hidden),hidden+' must not show');
   }
   // The Activity page: record events only, with the changed fields the viewer can read.
   const page=await as(vic,()=>activityPage(db,vic,w,{limit:200}));
   assert.deepEqual(page.rows.filter((r:any)=>!/^record\./.test(r.action)),[]);
   assert.ok(!page.rows.some((r:any)=>r.resource_id===contact),'no events of a table the viewer cannot read');
   assert.ok(page.rows.every((r:any)=>!r.changed_fields.includes('Budget')));
   const created=page.rows.find((r:any)=>r.resource_id===outside&&r.action==='record.created');assert.deepEqual(created.changed_fields,['Name']);assert.ok(!words(page).includes('OUTSIDE-BUDGET'));
   const details=await as(vic,()=>activityDetails(db,vic,w,created.id));assert.deepEqual(details.changes.map((c:any)=>c.field),['Name']);assert.ok(!words(details).includes('OUTSIDE-BUDGET'));
   const contactEvent=(await setup.query("SELECT id FROM audit_events WHERE object_id=$1 AND action='record.created'",[contact])).rows[0] as any;
   await assert.rejects(as(vic,()=>activityDetails(db,vic,w,contactEvent.id)),/unavailable|not found/i);
   // An editor without restrictions reads the full history of the records they can read, and still no app log.
   assert.deepEqual((await as(bob,()=>s.recordHistory(bob,w,site))).fields.map((x:any)=>x.key),['name','budget']);
  });

  await t.test('automation runs: every owner of the app sees the outcomes of its actions and research (T1, A7)',async()=>{
   const tenant=((await setup.query('SELECT tenant_id FROM workspaces WHERE id=$1',[w])).rows[0] as any).tenant_id;
   const action=randomUUID(),monitor=randomUUID();
   await setup.query('INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,approved_by,paused) VALUES($1,$2,$3,$4,$5,$3,true)',[action,w,alice.userId,app.id,JSON.stringify({name:'Weekly summary',appId:app.id,instructions:'PROMPT-SENTINEL'})]);
   await setup.query("INSERT INTO app_action_runs(id,workspace_id,user_id,action_id,action_version,occurrence,status,results,diagnostic) VALUES($1,$2,$3,$4,0,'one','succeeded',$5,'DIAGNOSTIC-SENTINEL')",[randomUUID(),w,alice.userId,action,JSON.stringify({value:'RESULT-SENTINEL'})]);
   await setup.query("INSERT INTO app_monitors(id,workspace_id,user_id,app_id,config,scope_stamp,enabled) VALUES($1,$2,$3,$4,$5,'stamp',false)",[monitor,w,alice.userId,app.id,JSON.stringify({name:'Research watch',appId:app.id,objective:'PROMPT-SENTINEL'})]);
   await setup.query("INSERT INTO app_monitor_runs(id,workspace_id,user_id,monitor_id,monitor_version,occurrence_key,status,config_snapshot,result,finished_at) VALUES($1,$2,$3,$4,0,'one','completed','{}',$5,now())",[randomUUID(),w,alice.userId,monitor,JSON.stringify({summary:'RESULT-SENTINEL'})]);
   const event=(act:string,object:string,after:any)=>setup.query("INSERT INTO audit_events(id,workspace_id,tenant_id,actor_id,action,object_id,origin,before_value,after_value) VALUES($1,$2,$3,$4,$5,$6,'human','null',$7)",[randomUUID(),w,tenant,alice.userId,act,object,JSON.stringify(after)]);
   await event('app_action.paused',action,{paused:true});await event('monitoring.controlled',monitor,{enabled:false});
   const lines=async(a:Actor)=>{const page=await log(a,app.id,{limit:100});for(const hidden of ['PROMPT-SENTINEL','RESULT-SENTINEL','DIAGNOSTIC-SENTINEL'])assert.ok(!words(page).includes(hidden),hidden+' must not show');return page.rows.map((r:any)=>r.description);};
   // The person who set both up, and owns the app, sees both.
   const creator=await lines(alice);assert.ok(creator.includes('“Weekly summary” finished')&&creator.includes('“Research watch” finished'));assert.equal(creator.filter(l=>l==='Switched an automation off').length,2);
   // Session 6 (6.1): another owner of the app, and the organization owner, see every run and switch of the app's automations.
   for(const a of [dana,owner]){const seen=await lines(a);assert.ok(seen.includes('“Weekly summary” finished'));assert.ok(seen.includes('“Research watch” finished'));assert.equal(seen.filter(l=>l==='Switched an automation off').length,2);}
   for(const a of [bob,vic])await assert.rejects(log(a,app.id),/owner of this app/);
   // Every owner of the app reads its detailed history; editors and viewers do not.
   assert.equal((await as(owner,()=>new AutomationManagement(db).history(owner,w,'action',action))).rows.length,1);
   assert.equal((await as(owner,()=>new AutomationManagement(db).history(owner,w,'research',monitor))).rows.length,1);
   await assert.rejects(as(bob,()=>new AutomationManagement(db).history(bob,w,'action',action)),/owner|unavailable/i);
  });
 }finally{await pg.close();}
});
