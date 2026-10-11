import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import type {Actor} from '../src/shared/schema.js';
test('Frontend code: read-only drafts, bound reads, reviewed atomic writes, stale versions and access revocation',async()=>{
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(s,v)=>pg.query(s,v) as any,transaction:f=>pg.transaction(tx=>f(tx as Connection)),close:()=>pg.close()};
 try{
 const service=new Service(db),f=new WorkspaceFoundation(db),a:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...a,origin:'ai'},viewer:Actor={userId:randomUUID(),origin:'human'};
 for(const u of [a,viewer])await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[u.userId,u.userId,'synthetic@example.invalid','Synthetic']);
 const w=await service.createWorkspace(a,'Frontend test');await service.setAi(a,w.id,true);await service.share(a,w.id,viewer.userId,'viewer',[],null,true);
 const save=async(op:any)=>{const draft=await service.preview(a,w.id,op);return service.commit(a,draft.id,draft.digest);};
 const change=async(op:any)=>{const draft=await f.preview(a,w.id,op);return f.confirm(a,w.id,draft.id,draft.digest);};
 const table=(await save({kind:'create_type',name:'Contacts',fields:[{key:'name',name:'Name',kind:'text'},{key:'notes',name:'Notes',kind:'text'}]})).objects[0].id;
 const record=(await save({kind:'create_record',typeId:table,data:{name:'Original',notes:'Not bound'}})).objects[0].id;
 const project=await change({kind:'create_node',nodeKind:'project',name:'Code project'});
 const source=`const result=tools.call('records.read',{typeId:${JSON.stringify(table)}});const r=result.rows[0];
 if(input.event.action==='rename')tools.call('records.propose',[{kind:'update_record',recordId:r.id,expectedVersion:r.version,data:{name:'Renamed'}}]);
 if(input.event.action==='bad')tools.call('records.propose',[{kind:'update_record',recordId:r.id,expectedVersion:r.version,data:{notes:'Forbidden'}}]);
 if(input.event.action==='fail'){tools.call('records.propose',[{kind:'update_record',recordId:r.id,expectedVersion:r.version,data:{name:'Never saved'}}]);throw new Error('fail');}
 return {html:'<form data-action="rename"><button>Rename</button></form>',css:'button{color:green}',state:{data:r.data,host:typeof process+'/'+typeof fetch+'/'+typeof document}};`;
 const content={name:'My code',format:'frontend-js',source,bindings:[{typeId:table,fields:['name']}]};
 const draft=await f.preview(ai,w.id,{kind:'save_component',projectId:project.id,content});
 const initial=await f.runFrontend(ai,w.id,{previewId:draft.id});assert.deepEqual((initial.state as any).data,{name:'Original'});assert.equal((initial.state as any).host,'undefined/undefined/undefined');assert.equal(initial.proposal,null);assert.equal((await f.components(ai,w.id)).length,0);
 await assert.rejects(f.runFrontend(ai,w.id,{previewId:draft.id,event:{kind:'submit',action:'rename'}}));
 const saved=await f.confirm(a,w.id,draft.id,draft.digest);
 const request={componentId:saved.id,expectedVersion:0,event:{kind:'submit',action:'rename'}};
 const run=await f.runFrontend(ai,w.id,request);assert.ok(run.proposal);assert.equal((await f.record(db,a,w.id,record)).data.name,'Original');
 const receipt=await f.confirm(a,w.id,run.proposal.id,run.proposal.digest);assert.deepEqual(await f.confirm(a,w.id,run.proposal.id,run.proposal.digest),receipt);assert.equal((await f.record(db,a,w.id,record)).data.name,'Renamed');
 await assert.rejects(f.runFrontend(viewer,w.id,request));
 await assert.rejects(f.runFrontend(ai,w.id,{...request,event:{kind:'click',action:'bad'}}),/bindings/);
 const before=(await f.pending(ai,w.id)).length;await assert.rejects(f.runFrontend(ai,w.id,{...request,event:{kind:'click',action:'fail'}}));assert.equal((await f.pending(ai,w.id)).length,before);
 await assert.rejects(f.runFrontend(ai,w.id,{...request,expectedVersion:1}),/revision/);
 const stale=await f.runFrontend(ai,w.id,request);assert.ok(stale.proposal);const staleProposal=stale.proposal;await save({kind:'update_record',recordId:record,expectedVersion:1,data:{name:'Concurrent update'}});await assert.rejects(f.confirm(a,w.id,staleProposal.id,staleProposal.digest),/changed/);
 await change({kind:'set_project_access',nodeId:project.id,expectedVersion:0,allowedUsers:null,ai:false});await assert.rejects(f.runFrontend(ai,w.id,request));
 const final=await f.runFrontend(a,w.id,{componentId:saved.id,expectedVersion:0});assert.equal((final.state as any).data.name,'Concurrent update');
 }finally{await db.close();}
});

test('Frame shell uses a hash-only trusted script and an HTTP sandbox without same-origin or forms',async()=>{
 const {baseApp}=await import('../src/server/app.js');const {default:request}=await import('supertest');const {createHash}=await import('node:crypto');const {FRAME_SCRIPT}=await import('../src/shared/frontend-frame.js');
 const response=await request(baseApp()).get('/frontend/frame').expect(200);
 const hash=createHash('sha256').update(FRAME_SCRIPT).digest('base64');assert.ok(response.headers['content-security-policy'].includes(`script-src 'sha256-${hash}'`));
 assert.ok(response.headers['content-security-policy'].includes('sandbox allow-scripts;'));assert.ok(response.headers['content-security-policy'].includes("form-action 'none'"));assert.equal(response.headers['x-frame-options'],undefined);assert.ok(!response.headers['content-security-policy'].includes('allow-same-origin'));assert.ok(response.text.includes(FRAME_SCRIPT));
});
