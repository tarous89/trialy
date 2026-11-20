import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,withDatabaseContext,databaseContext,setDatabaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppRoles} from '../src/domain/app-sharing.js';
import {AccessRequests} from '../src/domain/access-requests.js';
import {processServiceJob} from '../src/app-services/jobs.js';
import {readApp} from '../src/workspace/apps.js';
import {baseApp,addApi,errors} from '../src/server/app.js';
import {parseAppUrl,appUrl,appSignInReturn,accessRequestParam} from '../src/shared/app-route.js';
import request from 'supertest';
import type {Actor} from '../src/shared/schema.js';

test('the emailed link opens the app page and names the request',()=>{
 const appId=randomUUID(),workspaceId=randomUUID(),requestId=randomUUID(),link=`/apps/${appId}?workspaceId=${workspaceId}&accessRequest=${requestId}`;
 assert.deepEqual([parseAppUrl(link)!.appId,parseAppUrl(link)!.workspaceId],[appId,workspaceId]);
 assert.equal(accessRequestParam(link.slice(link.indexOf('?'))),requestId);assert.equal(accessRequestParam('?accessRequest=1'),null);assert.equal(accessRequestParam('?workspaceId='+workspaceId),null);
 // Signing in first still returns to the app.
 assert.equal(appSignInReturn(link),appUrl({appId,workspaceId}));assert.equal(parseAppUrl(link+'&other=1'),null);
});

// A5: a team member asks for access; everyone who may grant that role is told; the first answer counts.
test('access requests reach the people who may grant the role, and the first answer wins',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
  const setup:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  // The deployed service and its email worker: restricted roles, with the acting person in the database context.
  const db:Database={query:(q,v)=>db.transaction(tx=>tx.query(q,v)),transaction:fn=>pg.transaction(async tx=>{await tx.exec(databaseContext().service==='worker'?'SET LOCAL ROLE trialy_worker':'SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return fn(tx as Connection);}),close:async()=>{}};
  const person=():Actor=>({userId:randomUUID(),origin:'human'}),owner=person(),alice=person(),bob=person(),vic=person(),ivy=person(),ned=person(),nia=person(),zed=person(),gus=person();
  const people=[[owner,'Owner'],[alice,'Alice'],[bob,'Bob'],[vic,'Vic'],[ivy,'Ivy'],[ned,'Ned'],[nia,'Nia'],[zed,'Zed'],[gus,'Gus']] as const,mail=(a:Actor)=>people.find(x=>x[0]===a)![1].toLowerCase()+'@example.invalid';
  for(const [a,name] of people)await setup.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,mail(a),name]);
  const boot=new Service(setup),w=(await boot.createWorkspace(owner,'Requests')).id;
  for(const a of [alice,bob,vic,ned,nia,zed])await boot.share(owner,w,a.userId,'editor',[],null,false);
  for(const a of [ivy,gus])await boot.share(owner,w,a.userId,'viewer',[],null,false);
  const f=new WorkspaceFoundation(db),roles=new AppRoles(db),requests=new AccessRequests(db);
  const change=(a:Actor,op:any)=>withActor(a,async()=>{const p=await f.preview(a,w,op);return f.confirm(a,w,p.id,p.digest);});
  const project=await change(owner,{kind:'create_node',nodeKind:'project',name:'Work'});
  const app=await change(alice,{kind:'save_component',projectId:project.id,content:{name:'Pipeline',format:'text',source:'v1'}});
  const as=<T>(a:Actor,fn:(a:Actor)=>Promise<T>)=>withActor(a,()=>fn(a));
  const ask=(a:Actor,role:string,note?:string)=>as(a,a=>requests.request(a,w,{appId:app.id,role,...(note?{note}:{})}));
  const answer=(a:Actor,requestId:string,approve:boolean)=>as(a,a=>requests.decide(a,w,{appId:app.id,requestId,approve}));
  const jobs=async(requestId:string,step='asked')=>(await setup.query("SELECT * FROM app_service_jobs WHERE payload->'accessRequest'->>'id'=$1 AND payload->'accessRequest'->>'step'=$2 ORDER BY created_at",[requestId,step])).rows as any[];
  const sentTo=async(requestId:string,role:string)=>(await jobs(requestId)).filter(j=>j.request_key.includes(':'+role+':')).map(j=>j.payload.message.to[0]).sort();

  // Alice owns the app; Bob edits; Vic views; Ivy views and is view-only in the organization; Gus is a guest who views. Nobody else can open it.
  await as(alice,a=>roles.setTeamDefault(a,w,{appId:app.id,role:'none'}));
  await as(alice,a=>roles.setRole(a,w,{appId:app.id,userId:bob.userId,role:'editor'}));
  for(const a of [vic,ivy])await as(alice,x=>roles.setRole(x,w,{appId:app.id,userId:a.userId,role:'viewer'}));
  await setup.query('UPDATE workspace_access SET direct_data=false WHERE user_id=$1',[gus.userId]);
  await setup.query("UPDATE workspaces SET permission_rules=permission_rules||$2::jsonb,access_version=access_version+1 WHERE id=$1",[w,JSON.stringify([{subject:gus.userId,kind:'tool',resourceId:app.id,read:'allow',write:'deny'}])]);
  assert.equal((await setup.query('SELECT kind FROM memberships WHERE user_id=$1',[gus.userId])).rows[0].kind,'guest');
  assert.equal((await setup.query('SELECT trialy_security.app_role($1,$2) AS role',[app.id,gus.userId])).rows[0].role,'viewer');

  // U3: opening an app tells the page which role the person holds (component.app_role), so the header can say "View only".
  const location={appId:app.id,workspaceId:w};
  assert.deepEqual(await Promise.all([alice,bob,vic].map(a=>as(a,async x=>(await readApp(f,x,location) as any).component.app_role))),['owner','editor','viewer']);
  await assert.rejects(as(ned,a=>readApp(f,a,location)),(e:any)=>e.status===403&&e.code==='tool_access');

  // Ned cannot open the app and asks to view it: owners, editors and viewers are told. The guest, the organization
  // view-only viewer and Ned himself are not. Ned never receives the app's name.
  await assert.rejects(as(ned,a=>f.component(db,a,w,app.id)),/access|not found/i);
  const first=await ask(ned,'viewer','For the weekly review');
  assert.deepEqual([first.role,first.status,first.emailed,first.note],['viewer','pending',true,'For the weekly review']);
  assert.ok(!JSON.stringify(first).includes('Pipeline'));assert.deepEqual(Object.keys(first).sort(),['appId','createdAt','decidedAt','emailed','id','note','role','status']);
  assert.deepEqual(await sentTo(first.id,'viewer'),[alice,bob,owner,vic].map(mail).sort());
  const asked=(await jobs(first.id))[0];assert.match(asked.payload.message.subject,/^Ned asks to view Pipeline$/);
  assert.match(asked.payload.message.text,new RegExp(`/apps/${app.id}\\?workspaceId=${w}&accessRequest=${first.id}`));assert.match(asked.payload.message.text,/For the weekly review/);
  // Asking again changes nothing and sends nothing new.
  assert.equal((await ask(ned,'viewer')).id,first.id);assert.equal((await jobs(first.id)).length,4);
  // The email worker sends an open request's email.
  const sent:any[]=[],email=async(m:any)=>{sent.push(m);return {id:'provider-'+sent.length};},work=()=>withDatabaseContext({service:'worker'},()=>processServiceJob(db,{email}));
  assert.equal(await work(),true);assert.equal(sent.length,1);assert.equal((await setup.query("SELECT count(*) AS n FROM app_service_jobs WHERE status='succeeded'")).rows[0].n,1);

  // Asking to edit instead raises the same request: only owners and editors are told.
  const raised=await ask(ned,'editor');assert.deepEqual([raised.id,raised.role],[first.id,'editor']);
  assert.deepEqual(await sentTo(first.id,'editor'),[alice,bob,owner].map(mail).sort());
  assert.equal((await ask(ned,'viewer')).role,'editor','a lower request never replaces a higher open one');

  // Who sees what. The person who asked sees only their own request, without names.
  const forBob=await as(bob,a=>requests.list(a,w,app.id));
  assert.deepEqual(forBob.requests.map((r:any)=>[r.id,r.name,r.role,r.canApprove,r.canDecline]),[[first.id,'Ned','editor',true,false]]);assert.equal(forBob.mine,null);
  assert.deepEqual((await as(vic,a=>requests.list(a,w,app.id))).requests,[],'a viewer cannot grant Editor');
  assert.equal((await as(alice,a=>requests.list(a,w,app.id))).requests[0].canDecline,true);
  const forNed=await as(ned,a=>requests.list(a,w,app.id));assert.deepEqual([forNed.role,forNed.requests,forNed.mine!.id],[null,[],first.id]);assert.ok(!JSON.stringify(forNed).includes('Pipeline'));
  assert.ok(!('name' in await as(ned,a=>requests.read(a,w,app.id,first.id))));
  await assert.rejects(as(vic,a=>requests.read(a,w,app.id,first.id)),/not available/);
  await assert.rejects(as(zed,a=>requests.read(a,w,app.id,first.id)),/not available/);

  // Only a signed-in team member asks or answers.
  await assert.rejects(ask({...nia,origin:'ai'},'viewer'),/cannot approve/);
  await assert.rejects(answer({...bob,origin:'ai'},first.id,true),/cannot approve/);
  await assert.rejects(ask(gus,'editor'),/Only team members/);
  await assert.rejects(ask(bob,'editor'),/already have this access/);await assert.rejects(ask(alice,'viewer'),/already have this access/);
  await assert.rejects(answer(ned,first.id,true),/not available/);

  // A viewer cannot approve an Editor request; declining is for owners; an editor approves, and that grant is recorded as theirs.
  await assert.rejects(answer(vic,first.id,true),/viewing only/);
  await assert.rejects(answer(bob,first.id,false),/Only an owner of this app can decline/);
  const approved=await answer(bob,first.id,true);
  assert.deepEqual([approved.status,approved.alreadyHandled,approved.decidedBy,approved.name,approved.canApprove],['approved',false,'Bob','Ned',false]);
  const nedNow=(await as(alice,a=>roles.members(a,w,app.id))).people.find(p=>p.userId===ned.userId)!;
  assert.deepEqual([nedNow.role,nedNow.source,nedNow.grantedBy],['editor','granted','Bob']);assert.ok(nedNow.grantedAt);
  // The first answer wins: a later approval or decline sees who handled it and changes nothing.
  const late=await answer(alice,first.id,true);assert.deepEqual([late.alreadyHandled,late.status,late.decidedBy],[true,'approved','Bob']);
  assert.deepEqual([(await answer(owner,first.id,false)).alreadyHandled,(await setup.query('SELECT status,decided_by FROM app_access_requests WHERE id=$1',[first.id])).rows[0]],[true,{status:'approved',decided_by:bob.userId}]);
  assert.equal((await as(alice,a=>roles.members(a,w,app.id))).people.find(p=>p.userId===ned.userId)!.grantedBy,'Bob');
  assert.deepEqual((await as(alice,a=>requests.list(a,w,app.id))).requests,[]);
  // Ned is told. Emails about the request that were not sent yet are dropped, because it is no longer open.
  const told=(await jobs(first.id,'answered'))[0];assert.deepEqual([told.payload.message.to,told.payload.message.subject,told.user_id],[[mail(ned)],'You can now edit Pipeline',bob.userId]);
  while(await work());
  assert.deepEqual((await setup.query("SELECT status,count(*)::int AS n FROM app_service_jobs GROUP BY status ORDER BY status")).rows,[{status:'failed',n:6},{status:'succeeded',n:2}]);
  assert.equal(sent[1].subject,'You can now edit Pipeline');
  assert.deepEqual((await setup.query("SELECT action,actor_id FROM audit_events WHERE action LIKE 'app.access_request%' ORDER BY event_sequence")).rows.map(r=>[r.action,r.actor_id]),[['app.access_requested',ned.userId],['app.access_requested',ned.userId],['app.access_request_decided',bob.userId]]);

  // A viewer may grant Viewer. Someone who is view-only in the organization may ask too, and cannot answer.
  const second=await ask(nia,'viewer');assert.deepEqual(await sentTo(second.id,'viewer'),[alice,bob,ned,owner,vic].map(mail).sort());
  assert.equal((await as(vic,a=>requests.list(a,w,app.id))).requests[0].canApprove,true);assert.deepEqual((await as(ivy,a=>requests.list(a,w,app.id))).requests,[]);
  await assert.rejects(answer(ivy,second.id,true),/not permitted/);
  const ivyAsks=await ask(ivy,'editor');assert.deepEqual(await sentTo(ivyAsks.id,'editor'),[alice,bob,ned,owner].map(mail).sort());

  // Row security, for a caller that skips the application. Zed cannot open the app and sees no request; Nia sees her own; Bob, who can open it, sees them.
  const visible=async(a:Actor)=>(await as(a,()=>db.query('SELECT id FROM app_access_requests ORDER BY created_at'))).rows.map(r=>r.id);
  assert.deepEqual(await visible(zed),[]);assert.deepEqual(await visible(nia),[second.id]);assert.deepEqual(await visible(bob),[first.id,second.id,ivyAsks.id]);
  const sql=(a:Actor,q:string,v:any[])=>as(a,()=>db.query(q,v)),approve="UPDATE app_access_requests SET status='approved',decided_by=$2,decided_at=now() WHERE id=$1 RETURNING id";
  await assert.rejects(sql(nia,approve,[second.id,nia.userId]),/cannot answer/);
  assert.deepEqual((await sql(zed,approve,[second.id,zed.userId])).rows,[],'a person who cannot open the app cannot touch its requests');
  await assert.rejects(sql(vic,approve,[second.id,vic.userId]),/Grant the role before approving/);
  await assert.rejects(sql(vic,approve,[ivyAsks.id,vic.userId]),/Grant the role before approving/);
  await assert.rejects(sql(bob,"UPDATE app_access_requests SET status='declined',decided_by=$2,decided_at=now() WHERE id=$1",[second.id,bob.userId]),/Only an owner of this app can decline/);
  await assert.rejects(sql(bob,"UPDATE app_access_requests SET status='pending',decided_by=NULL,decided_at=NULL WHERE id=$1",[first.id]),/already answered/);
  await assert.rejects(sql(zed,"INSERT INTO app_access_requests(id,workspace_id,app_id,user_id,requested_role) VALUES($1,$2,$3,$4,'viewer')",[randomUUID(),w,app.id,nia.userId]),/row-level security|team members/);
  await assert.rejects(sql({...zed,origin:'ai'},"INSERT INTO app_access_requests(id,workspace_id,app_id,user_id,requested_role) VALUES($1,$2,$3,$4,'viewer')",[randomUUID(),w,app.id,zed.userId]),/signed-in person|row-level security/);
  await assert.rejects(sql(gus,"INSERT INTO app_access_requests(id,workspace_id,app_id,user_id,requested_role) VALUES($1,$2,$3,$4,'editor')",[randomUUID(),w,app.id,gus.userId]),/team members/);
  await assert.rejects(sql(zed,'DELETE FROM app_access_requests WHERE id=$1',[second.id]),/permission denied/);

  // An owner declines; the email does not name the app. Nia may ask again, and withdraw.
  const declined=await answer(alice,second.id,false);assert.deepEqual([declined.status,declined.decidedBy,declined.alreadyHandled],['declined','Alice',false]);
  assert.equal((await as(alice,a=>roles.members(a,w,app.id))).people.find(p=>p.userId===nia.userId)!.role,'none');
  const refusal=(await jobs(second.id,'answered'))[0].payload.message;assert.deepEqual(refusal.to,[mail(nia)]);assert.ok(!JSON.stringify(refusal).includes('Pipeline'));
  const third=await ask(nia,'viewer');assert.notEqual(third.id,second.id);
  await assert.rejects(as(bob,a=>requests.cancel(a,w,app.id,third.id)),/not available/);
  const withdrawn=await as(nia,a=>requests.cancel(a,w,app.id,third.id));assert.deepEqual([withdrawn.status,withdrawn.alreadyHandled],['cancelled',false]);
  assert.equal((await as(nia,a=>requests.cancel(a,w,app.id,third.id))).alreadyHandled,true);
  assert.equal((await answer(alice,third.id,true)).alreadyHandled,true);assert.equal((await as(alice,a=>roles.members(a,w,app.id))).people.find(p=>p.userId===nia.userId)!.role,'none');
  // Asking over and over is limited to three requests a day for one app.
  const fourth=await ask(nia,'viewer');await as(nia,a=>requests.cancel(a,w,app.id,fourth.id));
  await assert.rejects(ask(nia,'viewer'),/several times today/);

  // A person whose access an owner removed asks again: only owners can undo a removal, so only owners are told.
  await as(alice,a=>roles.setRole(a,w,{appId:app.id,userId:vic.userId,role:'none'}));
  const back=await ask(vic,'viewer');assert.deepEqual(await sentTo(back.id,'viewer'),[alice,owner].map(mail).sort());
  assert.deepEqual((await as(bob,a=>requests.list(a,w,app.id))).requests.filter((r:any)=>r.id===back.id),[]);
  await assert.rejects(answer(bob,back.id,true),/lower or remove/);
  assert.equal((await answer(owner,back.id,true)).decidedBy,'Owner');assert.equal((await as(alice,a=>roles.members(a,w,app.id))).people.find(p=>p.userId===vic.userId)!.grantedBy,'Owner');

  // The same over HTTP, as the website calls it.
  process.env.SIMPLE_APPS_ENABLED='true';let actor:Actor=zed;const http=baseApp();addApi(http,new Service(db),(req:any,_res:any,next:any)=>{req.actor=actor;req.session={csrf:'x'};withActor(actor,next);});http.use(errors);
  const url=`/api/workspaces/${w}/apps/${app.id}/access-requests`,by=(a:Actor)=>{actor=a;return request(http);};
  assert.equal((await by(zed).post(url).send({role:'owner'})).status,400);
  const posted=await by(zed).post(url).send({role:'viewer',note:'Please'});assert.deepEqual([posted.status,posted.body.status,posted.body.role],[200,'pending','viewer']);assert.ok(!posted.text.includes('Pipeline'));
  const zedSees=await by(zed).get(url);assert.deepEqual([zedSees.body.role,zedSees.body.mine.id,zedSees.body.requests],[null,posted.body.id,[]]);
  assert.ok((await by(alice).get(url)).body.requests.some((r:any)=>r.id===posted.body.id&&r.name==='Zed'&&r.note==='Please'));
  assert.deepEqual([(await by(vic).get(url+'/'+posted.body.id)).body.canApprove,(await by(gus).get(url+'/'+posted.body.id)).status],[true,404]);
  const okay=await by(vic).post(url+'/'+posted.body.id).send({approve:true});assert.deepEqual([okay.status,okay.body.status,okay.body.decidedBy,okay.body.alreadyHandled],[200,'approved','Vic',false]);
  const again=await by(alice).post(url+'/'+posted.body.id).send({approve:false});assert.deepEqual([again.status,again.body.alreadyHandled,again.body.decidedBy,again.body.status],[200,true,'Vic','approved']);
  assert.deepEqual([(await by(zed).delete(url+'/'+posted.body.id)).body.alreadyHandled,(await by(bob).delete(url+'/'+posted.body.id)).status],[true,404]);
  assert.equal((await as(zed,async a=>(await readApp(f,a,location) as any).component.app_role)),'viewer');

  // Email that cannot be queued does not lose the request: it stays open for the people who can answer it.
  await setup.query("INSERT INTO app_service_jobs(id,workspace_id,user_id,kind,request_key,digest,payload,deadline_at,status) SELECT gen_random_uuid(),$1,$2,'email','fill:'||n,'x','{}',now(),'cancelled' FROM generate_series(1,1000) n",[w,owner.userId]);
  const quiet=await ask(zed,'editor');assert.deepEqual([quiet.status,quiet.emailed],['pending',false]);assert.deepEqual(await jobs(quiet.id),[]);
  assert.ok((await as(alice,a=>requests.list(a,w,app.id))).requests.some((r:any)=>r.id===quiet.id&&r.name==='Zed'));
  // A person who left the team is no longer listed as asking.
  await setup.query('DELETE FROM workspace_access WHERE workspace_id=$1 AND user_id=$2',[w,zed.userId]);
  assert.ok(!(await as(alice,a=>requests.list(a,w,app.id))).requests.some((r:any)=>r.id===quiet.id));
 }finally{await pg.close();}
});
