import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {readFile,readdir} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
import {homeRevision} from '../src/workspace/home-revision.js';import {accountHome} from '../src/workspace/home.js';import {Service} from '../src/domain/service.js';import {WorkspaceFoundation} from '../src/workspace/service.js';import {withActor,setDatabaseContext} from '../src/db/context.js';import type {Database,Connection} from '../src/db/database.js';
import {baseApp,addApi} from '../src/server/app.js';import {addWorkspaceMcp} from '../src/server/workspace-foundation.js';import request from 'supertest';

test('Home revision checks use metadata only and detect account, app, field, project, document and assistant changes under RLS',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());for(const p of (await readdir('migrations')).filter(p=>p.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+p,'utf8'));
 const admin:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
 const owner={userId:randomUUID(),origin:'human' as const},member={userId:randomUUID(),origin:'human' as const},other={userId:randomUUID(),origin:'human' as const};
 for(const a of [owner,member,other])await admin.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,a.userId+'@example.invalid','Fixture']);
 const s=new Service(admin),f=new WorkspaceFoundation(admin),w=await s.createWorkspace(owner,'Private account'),unrelated=await s.createWorkspace(other,'Other account');
 const save=async(op:any)=>{const p=await s.preview(owner,w.id,op);return s.commit(owner,p.id,p.digest);};
 const table=(await save({kind:'create_type',name:'Private table',fields:[{key:'name',name:'Name',kind:'text',ai:true}]})).objects[0].id;
 const record=(await save({kind:'create_record',typeId:table,data:{name:'Secret record'}})).objects[0].id;
 await s.share(owner,w.id,member.userId,'editor',[],null,true);await s.setAi(owner,w.id,true);
 const draft=await f.preview(owner,w.id,{kind:'save_component',content:{name:'Private app',format:'frontend-js',sourceAccess:'bindings',source:'return {html:"Private source"};',bindings:[{typeId:table,fields:['name']}]}}),app=await f.confirm(owner,w.id,draft.id,draft.digest);
 const component=(await f.readComponent(owner,w.id,app.id)).component,project=component.project_id;
 await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const queries:string[]=[];const db:Database={query:(q,v)=>{queries.push(q);return db.transaction(tx=>tx.query(q,v));},transaction:fn=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return fn(tx as Connection);}),close:async()=>{}};
 const revision=(actor:any=owner)=>withActor(actor,()=>homeRevision(db,actor));
 const first=await revision();assert.match(first.revision,/^[a-f0-9]{64}$/);assert.deepEqual(Object.keys(first),['revision']);assert.deepEqual(await revision(),first);
 queries.length=0;await revision();assert.equal(queries.length,4);assert.ok(!queries.some(q=>/FROM records\b|SELECT \*|source|document_payloads/.test(q)));
 console.log('HOME_REVISION_PERFORMANCE',JSON.stringify({queries:queries.length}));
 const changed=async(update:()=>Promise<any>,actor:any=owner)=>{const before=await revision(actor);await update();assert.notDeepEqual(await revision(actor),before);};
 await changed(()=>admin.query("UPDATE workspace_components SET allowed_users='[]' WHERE id=$1",[app.id]),member);
 await changed(()=>admin.query('UPDATE workspace_nodes SET ai_enabled=false WHERE id=$1',[project]));
 await changed(()=>admin.query("UPDATE entity_types SET fields=jsonb_set(fields,'{0,ai}','false') WHERE id=$1",[table]));
 await changed(()=>admin.query("UPDATE workspaces SET permission_rules=$2 WHERE id=$1",[w.id,JSON.stringify([{subject:member.userId,kind:'tool',resourceId:app.id,read:'deny',write:'inherit'}])]),member);
 await changed(()=>admin.query('INSERT INTO project_records(id,workspace_id,project_id,record_id,created_by,reason) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),w.id,project,record,owner.userId,'Scope']));
 // Revocation removes an active membership from the digest; old revoked history is irrelevant.
 await changed(()=>admin.query('UPDATE project_records SET revoked_at=now() WHERE project_id=$1',[project]));
 const revoked=await revision();await admin.query("UPDATE project_records SET reason='Historical correction' WHERE project_id=$1",[project]);assert.deepEqual(await revision(),revoked);
 await changed(()=>admin.query('UPDATE project_records SET revoked_at=NULL WHERE project_id=$1',[project]));
 // Historical document versions remain relevant to attached sources and AI access.
 const document=randomUUID();
 for(const version of [2,1])await changed(()=>admin.query("INSERT INTO document_versions(id,document_id,workspace_id,filename,mime,byte_size,checksum,version,ai_enabled,created_by) VALUES($1,$2,$3,'source.txt','text/plain',0,'fixture',$4,false,$5)",[randomUUID(),document,w.id,version,owner.userId]));
 await changed(()=>admin.query('INSERT INTO document_access(document_id,workspace_id,allowed_users) VALUES($1,$2,$3)',[randomUUID(),w.id,JSON.stringify([owner.userId])]));
 await changed(()=>admin.query("INSERT INTO folder_access(workspace_id,folder,allowed_users) VALUES($1,'Private',$2)",[w.id,JSON.stringify([owner.userId])]));
 // Identically named folders written in one transaction must not cancel in XOR.
 const second=await s.createWorkspace(owner,'Second private workspace');
 await admin.transaction(async tx=>{for(const id of [w.id,second.id])await tx.query("INSERT INTO folder_access(workspace_id,folder,allowed_users) VALUES($1,'Same name',$2)",[id,JSON.stringify([owner.userId])]);});
 await changed(()=>admin.transaction(async tx=>{await tx.query("UPDATE folder_access SET allowed_users='[]' WHERE folder='Same name'");}));
 await changed(()=>admin.query('UPDATE workspace_access SET ai_enabled=false WHERE workspace_id=$1 AND user_id=$2',[w.id,member.userId]),{...member,origin:'ai'});
 await changed(()=>admin.query('UPDATE workspaces SET claude_enabled=false WHERE id=$1',[w.id]),{...owner,origin:'ai',assistant:'claude'});
 const isolated=await revision();await admin.query("UPDATE workspaces SET name='Other changed' WHERE id=$1",[unrelated.id]);assert.deepEqual(await revision(),isolated,'another tenant cannot invalidate this account');
 assert.notDeepEqual(await revision(member),await revision(owner),'identity is part of the revision');
 await changed(()=>admin.query('DELETE FROM workspace_access WHERE workspace_id=$1 AND user_id=$2',[w.id,member.userId]),member);
 const beforeRecord=await revision();await admin.query("UPDATE records SET data='{\"name\":\"New record value\"}',version=version+1 WHERE id=$1",[record]);assert.deepEqual(await revision(),beforeRecord,'ordinary record values refresh on return or explicit reload');
 const full=await withActor(owner,()=>accountHome(db,owner));assert.equal(full.revision,beforeRecord.revision);
 // Snapshot stamp precedes content: a mid-read metadata change must not certify old content.
 let injected=false;const racing:Database={...db,query:async(q,v)=>{if(!injected&&q.includes('FROM workspace_components WHERE workspace_id=$1')){injected=true;await admin.query("UPDATE workspace_components SET name='New app name' WHERE id=$1",[app.id]);}return db.query(q,v);}};
 const race=await withActor(owner,()=>accountHome(racing,owner));assert.ok(injected);assert.notEqual(race.revision,(await revision()).revision);
 const cancelled=new AbortController();cancelled.abort();queries.length=0;await assert.rejects(()=>withActor(owner,()=>accountHome(db,owner,{},cancelled.signal)),{name:'AbortError'});assert.equal(queries.length,0);
 const midway=new AbortController();let count=0;const stop:Database={...db,query:async(q,v)=>{const r=await db.query(q,v);if(q.includes('UNION ALL')&&q.includes("'membership'")){count++;midway.abort();}return r;}};
 await assert.rejects(()=>withActor(owner,()=>accountHome(stop,owner,{},midway.signal)),{name:'AbortError'});assert.equal(count,1);
 const web=baseApp();addApi(web,new Service(db),(req,res,next)=>{if(req.get('X-Fixture-Account')!=='owner'){res.status(401).json({message:'Sign in required'});return;}req.actor=owner;withActor(owner,next);});
 await request(web).get('/api/account/home/revision').expect(401);
 const http=await request(web).get('/api/account/home/revision').set('X-Fixture-Account','owner').expect(200);assert.deepEqual(http.body,await revision());assert.match(http.headers['cache-control'],/no-store/);
 const registered=new Map<string,any>();addWorkspaceMcp({registerTool:(name:string,config:any,handler:any)=>registered.set(name,{config,handler})} as any,new WorkspaceFoundation(db),owner,(fn:any)=>fn,{});
 const tool=registered.get('check_account_home');assert.deepEqual(tool.config.inputSchema,{});assert.deepEqual(tool.config._meta.ui.visibility,['app']);assert.deepEqual(await withActor(owner,()=>tool.handler({})),await revision());
});
