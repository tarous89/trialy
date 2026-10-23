import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {readFile,readdir} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';import {Service} from '../src/domain/service.js';import {WorkspaceFoundation} from '../src/workspace/service.js';import {trackerOperation,applyTrackerLayout} from '../src/workspace/tracker-template.js';import {backgroundMetadata,workspaceResource} from '../src/server/ui-resource.js';
test('designed outreach tracker excludes unrelated PI records, persists bindings, examples stay fictional, edits/layout require review',async()=>{
 const pg=new PGlite();const db:Database={query:(s,v)=>pg.query(s,v) as any,transaction:f=>pg.transaction(tx=>f(tx as Connection)),close:()=>pg.close()};try{
 for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const a={userId:randomUUID(),origin:'human' as const};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'fixture@example.invalid','Fixture']);
 const service=new Service(db),f=new WorkspaceFoundation(db),w=await service.createWorkspace(a,'Fixture');
 const save=async(op:any)=>{const p=await service.preview(a,w.id,op);return service.commit(a,p.id,p.digest);};
 const table=async(name:string)=> (await save({kind:'create_type',name,fields:[{key:'name',name:'Name',kind:'text',ai:true},{key:'source',name:'Source',kind:'text',ai:true}]})).objects[0].id;
 const pi=await table('PI Engagement Tracker');await save({kind:'create_record',typeId:pi,data:{name:'University fixture',source:'Unrelated'}});
 const companies=await table('Companies'),contacts=await table('Contacts');
 const setup={name:'Biotech outreach',description:'Companies and people for LinkedIn and email outreach.',tabs:[{name:'Companies',typeId:companies,columns:[{field:'name'},{field:'source'}]},{name:'Contacts',typeId:contacts,columns:[{field:'name'},{field:'source'}]}],example:{name:'Example biotech',source:null}};
 const op=await trackerOperation(f,a,w.id,setup),p=await f.preview(a,w.id,op);
 let rendered:any=await f.runFrontend(a,w.id,{previewId:p.id});assert.match(rendered.html,/Example biotech/);assert.doesNotMatch(rendered.html,/University fixture/);assert.match(rendered.css,/#102022/);assert.equal((await service.records(a,w.id,companies,{limit:50,offset:0})).total,0);
 const receipt=await f.confirm(a,w.id,p.id,p.digest);let component=(await f.readComponent(a,w.id,receipt.id)).component;assert.equal(component.project_id,null);
 const row=(await save({kind:'create_record',typeId:companies,data:{name:'Real authorized company',source:'User'}})).objects[0].id;
 rendered=await f.runFrontend(a,w.id,{componentId:receipt.id,expectedVersion:0,event:{kind:'click',action:'tab:0'}});assert.doesNotMatch(rendered.html,/Example biotech|University fixture/);assert.equal(rendered.controls[0].value,'Real authorized company');
 const edit=await f.runFrontend(a,w.id,{componentId:receipt.id,expectedVersion:0,event:{kind:'submit',action:'bound-batch',form:{['bound:f_0_0:'+row+':0']:'Updated company',['bound:f_0_1:'+row+':0']:'Reviewed source'}}});assert.ok(edit.proposal);assert.equal((await f.record(db,a,w.id,row)).data.name,'Real authorized company');await f.confirm(a,w.id,edit.proposal!.id,edit.proposal!.digest);assert.equal((await f.record(db,a,w.id,row)).data.name,'Updated company');
 await assert.rejects(f.runFrontend(a,w.id,{componentId:receipt.id,expectedVersion:0,event:{kind:'submit',action:'bound-batch',form:{['bound:f_0_0:'+row+':0']:'Stale'}}}),/changed/);
 const opened=await f.runFrontend(a,w.id,{componentId:receipt.id,expectedVersion:0,event:{kind:'click',action:'settings'}});const state=opened.state as any;state.layoutDraft.name='Outreach revised';state.layoutDraft.tabs[0].columns[0].label='Company';
 const layout=await f.runFrontend(a,w.id,{componentId:receipt.id,expectedVersion:0,state,event:{kind:'click',action:'save-layout'}});assert.ok(layout.proposal);assert.equal((await f.readComponent(a,w.id,receipt.id)).component.name,'Biotech outreach');await f.confirm(a,w.id,layout.proposal!.id,layout.proposal!.digest);component=(await f.readComponent(a,w.id,receipt.id)).component;assert.equal(component.name,'Outreach revised');assert.deepEqual(component.bindings,op.content.bindings);assert.equal((await f.record(db,a,w.id,row)).data.name,'Updated company');
 const malicious=structuredClone(state.layoutDraft);malicious.tabs[0].typeId=pi;assert.throws(()=>applyTrackerLayout(component,malicious),/bindings/);
 await assert.rejects(trackerOperation(f,a,w.id,{...setup,tabs:[{name:'Bad',typeId:companies,columns:[{field:'missing'}]}]}),/authorized/);
 }finally{await db.close();}
});
test('embedded resources are content-addressed and background tools retain auth without opening UI',async()=>{
 const bundle=await workspaceResource();assert.match(bundle.uri,/workspace-[a-f0-9]{16}\.html$/);assert.ok(bundle.html.includes('ty-embed-content'));
 const meta=backgroundMetadata({ui:{resourceUri:bundle.uri},'openai/outputTemplate':bundle.uri,'openai/widgetAccessible':true,securitySchemes:[{type:'oauth2'}]});assert.equal(meta['openai/outputTemplate'],undefined);assert.equal(meta.ui,undefined);assert.deepEqual(meta.securitySchemes,[{type:'oauth2'}]);
});

test('MCP exposes a single registered tracker draft tool and no navigation metadata on schema reads',async()=>{
 const {default:request}=await import('supertest'),{baseApp}=await import('../src/server/app.js'),{addMcp}=await import('../src/server/mcp.js');
 const app=baseApp();addMcp(app,new Service({} as Database),(_q,_r,next)=>next());
 const response=await request(app).post('/mcp').set('Accept','application/json, text/event-stream').send({jsonrpc:'2.0',id:1,method:'tools/list'});assert.equal(response.status,200);const tools=response.body.result.tools;
 for(const name of ['read_workspace_schema','find_field_candidates','prepare_tracker','prepare_change']){const t=tools.find((t:any)=>t.name===name);assert.ok(t);assert.equal(t._meta['openai/outputTemplate'],undefined);}
 for(const name of ['open_workspace','open_tracker','open_tracker_draft'])assert.match(tools.find((t:any)=>t.name===name)._meta['openai/outputTemplate'],/workspace-[a-f0-9]{16}\.html$/);
 assert.equal(tools.filter((t:any)=>t.name==='open_tracker_preview').length,1,'Preserve legacy preview recovery');
});
