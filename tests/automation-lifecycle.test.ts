import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,setDatabaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AutomationManagement} from '../src/automations/management.js';
import {MemberRemoval} from '../src/domain/member-removal.js';
import {archivedItems} from '../src/workspace/archive.js';
import {resumeAction} from '../src/app-services/service.js';
import type {Actor} from '../src/shared/schema.js';

// Session 6, package 6.2 (A11, A9, T4): removal, archive and restore of one automation, and resuming from now.
test('a removed member\'s automations stay off with the reason and can be moved; one automation archives and restores on its own; resuming never replays',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
  const setup:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  const db:Database={query:(q,v)=>db.transaction(tx=>tx.query(q,v)),transaction:fn=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return fn(tx as Connection);}),close:async()=>{}};
  const one=async(q:string,v:unknown[]=[])=>((await setup.query(q,v)).rows as any[])[0];
  const person=():Actor=>({userId:randomUUID(),origin:'human'}),owner=person(),alice=person();
  for(const [a,name] of [[owner,'Owner'],[alice,'Alice']] as const)await setup.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,name.toLowerCase()+'@example.invalid',name]);
  const boot=new Service(setup),w=(await boot.createWorkspace(owner,'Main')).id;
  await boot.share(owner,w,alice.userId,'editor',[],null,false);
  const f=new WorkspaceFoundation(db),manage=new AutomationManagement(db);
  const change=(a:Actor,op:any)=>withActor(a,async()=>{const p=await f.preview(a,w,op);return f.confirm(a,w,p.id,p.digest);});
  const project=await change(owner,{kind:'create_node',nodeKind:'project',name:'Work'});
  const app=await change(alice,{kind:'save_component',projectId:project.id,content:{name:'Deals',format:'text',source:'Deals'}});
  const research=randomUUID(),action=randomUUID();
  await setup.query("INSERT INTO app_monitors(id,workspace_id,user_id,app_id,config,scope_stamp,enabled) VALUES($1,$2,$3,$4,$5,'s',true)",[research,w,alice.userId,app.id,JSON.stringify({name:'Weekly research'})]);
  const config={name:'Digest',appId:app.id,appVersion:0,trigger:{kind:'interval',minutes:120},steps:[{id:'run',kind:'function',binding:'refresh'}],expiresAt:new Date(Date.now()+86400000).toISOString()};
  await setup.query("INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,approved_by,paused,next_at) VALUES($1,$2,$3,$4,$5,$3,false,now()+interval '1 hour')",[action,w,alice.userId,app.id,JSON.stringify(config)]);

  // A11: removal switches both off with the reason; the organization owner inherits the app and sees them linked to Alice.
  await withActor(owner,()=>new MemberRemoval(db).remove(owner,w,alice.userId));
  const listed=(await withActor(owner,()=>manage.list(owner,w,{}))).rows;
  assert.deepEqual(listed.map((r:any)=>[r.kind,r.enabled,r.mine,r.linkedOwner.name]).sort(),[['action',false,false,'Alice'],['research',false,false,'Alice']]);
  assert.ok(listed.every((r:any)=>/left the organization/.test(r.offReason)),'the reason is shown');
  // "Set up again or move": the new owner moves it; it stays off until they switch it on.
  const r=listed.find((x:any)=>x.kind==='research');
  const moved=await withActor(owner,()=>manage.move(owner,w,'research',r.id,r.version));
  assert.equal(moved.linkedOwner.id,owner.userId);assert.equal(moved.enabled,false);

  // A9: archive one automation on its own. It is off, hidden from the list and listed as archived without its app.
  const act=listed.find((x:any)=>x.kind==='action');
  await withActor(owner,()=>manage.archive(owner,w,'action',action,act.version));
  assert.ok((await one('SELECT archived_at FROM app_actions WHERE id=$1',[action])).archived_at);
  assert.ok(!(await withActor(owner,()=>manage.list(owner,w,{}))).rows.some((x:any)=>x.id===action));
  const archived=await withActor(owner,()=>archivedItems(f,owner,w,{kind:'automations'}));
  const item=archived.items.find((x:any)=>x.id===action);assert.ok(item);assert.equal(item.restoreVia,undefined);
  await assert.rejects(withActor(owner,()=>manage.control(owner,w,'action',action,act.version,true)),(e:any)=>e.code==='automation_archived');
  const restored=await withActor(owner,()=>manage.restore(owner,w,'action',action));
  assert.deepEqual([restored.restored,restored.enabled],[true,false]);
  const back=await one('SELECT archived_at,paused FROM app_actions WHERE id=$1',[action]);assert.equal(back.archived_at,null);assert.equal(back.paused,true,'restored automations come back switched off');

  // Restore-then-enable defect: an action with no next run is scheduled again from now, and events from while it was off are skipped.
  await setup.query('UPDATE app_actions SET next_at=NULL,event_cursor=0 WHERE id=$1',[action]);
  const before=Date.now(),row=await one('SELECT * FROM app_actions WHERE id=$1',[action]);
  const next=await setup.transaction(tx=>resumeAction(tx,row));
  assert.ok(next&&next.getTime()>=before+119*60000,'the next interval run counts from now');
  const after=await one('SELECT next_at,event_cursor FROM app_actions WHERE id=$1',[action]);
  assert.ok(after.next_at);assert.equal(Number(after.event_cursor),Number((await one('SELECT coalesce(max(event_sequence),0) AS n FROM audit_events WHERE workspace_id=$1',[w])).n));
 }finally{await pg.close();}
});
