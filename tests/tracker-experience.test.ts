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
 const emptyContacts:any=await f.runFrontend(a,w.id,{previewId:p.id,event:{kind:'click',action:'tab:1'}});assert.match(emptyContacts.html,/Alex Morgan \(example\)/);assert.ok(emptyContacts.tracker);assert.equal(emptyContacts.tracker.pages.length,2);assert.equal(emptyContacts.controls.length,0);
 const firstLine=op.content.source.split('\n')[0],reorderedConfig=JSON.parse(firstLine.slice(13,-1));reorderedConfig.tabs.reverse();
 const reordered=await f.preview(a,w.id,{...op,content:{...op.content,source:'const config='+JSON.stringify(reorderedConfig)+';\n'+op.content.source.slice(firstLine.length+1)}});
 const reorderedContacts=await f.runFrontend(a,w.id,{previewId:reordered.id,event:{kind:'click',action:'tab:0'}});assert.match(reorderedContacts.html,/Alex Morgan \(example\)/);assert.doesNotMatch(reorderedContacts.html,/Example biotech/);await f.discard(a,w.id,reordered.id);
 const receipt=await f.confirm(a,w.id,p.id,p.digest);let component=(await f.readComponent(a,w.id,receipt.id)).component;assert.equal(component.project_id,null);
 const row=(await save({kind:'create_record',typeId:companies,data:{name:'Real authorized company',source:'User'}})).objects[0].id;
 rendered=await f.runFrontend(a,w.id,{componentId:receipt.id,expectedVersion:0,event:{kind:'click',action:'tab:0'}});assert.doesNotMatch(rendered.html,/Example biotech|University fixture/);assert.equal(rendered.controls[0].value,'Real authorized company');
 const contactsWithOtherData:any=await f.runFrontend(a,w.id,{componentId:receipt.id,expectedVersion:0,event:{kind:'click',action:'tab:1'}});assert.match(contactsWithOtherData.html,/Alex Morgan \(example\)/);assert.doesNotMatch(contactsWithOtherData.html,/Real authorized company/);assert.equal(contactsWithOtherData.controls.length,2);
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
 for(const name of ['initialize_account','read_workspace_schema','find_field_candidates','prepare_change']){const t=tools.find((t:any)=>t.name===name);assert.ok(t);assert.equal(t._meta['openai/outputTemplate'],undefined);}
 for(const name of ['open_workspace','open_tracker','open_tracker_draft','prepare_tracker'])assert.match(tools.find((t:any)=>t.name===name)._meta['openai/outputTemplate'],/workspace-[a-f0-9]{16}\.html$/);
 assert.equal(tools.filter((t:any)=>t.name==='open_tracker_preview').length,1,'Preserve legacy preview recovery');
});

test('empty account previews missing tables without writes; save is atomic, idempotent and project optional',async()=>{
 const pg=new PGlite();const db:Database={query:(s,v)=>pg.query(s,v) as any,transaction:f=>pg.transaction(tx=>f(tx as Connection)),close:()=>pg.close()};try{
 for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const a={userId:randomUUID(),origin:'human' as const};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'preview@example.invalid','Preview']);
 const service=new Service(db),f=new WorkspaceFoundation(db),w=await service.createWorkspace(a,'Fixture'),typeId=randomUUID();
 const setup={name:'New tracker',description:'Preview before saving',newTables:[{id:typeId,name:'Companies',fields:[{key:'name',name:'Company',kind:'text',ai:true},{key:'source',name:'Source',kind:'text',ai:true}]}],tabs:[{name:'Companies',typeId,columns:[{field:'name'},{field:'source'}]}],example:{name:'Example biotech',source:null}};
 const generated=await trackerOperation(f,a,w.id,setup),operation={kind:'create_tracker',setup,content:generated.content};
 const preview=await f.preview(a,w.id,operation),rendered=await f.runFrontend(a,w.id,{previewId:preview.id});assert.match(rendered.html,/Example biotech/);assert.deepEqual(await service.types(a,w.id),[]);assert.equal((await f.nodes(a,w.id)).nodes.length,0);assert.equal((await f.components(a,w.id)).length,0);
 await f.discard(a,w.id,preview.id);assert.deepEqual(await service.types(a,w.id),[]);
 const tampered=structuredClone(operation);tampered.content.source+='malicious';await assert.rejects(f.preview(a,w.id,tampered),/changed/);
 const failing=await f.preview(a,w.id,operation);const failingDb:Database={...db,transaction:fn=>db.transaction(tx=>fn({query:async(q:string,v?:any[])=>{if(q.includes('INSERT INTO workspace_components'))throw Error('Injected save failure');return tx.query(q,v);}} as Connection))};await assert.rejects(new WorkspaceFoundation(failingDb).confirm(a,w.id,failing.id,failing.digest),/Injected save failure/);assert.deepEqual(await service.types(a,w.id),[]);await f.discard(a,w.id,failing.id);
 const p=await f.preview(a,w.id,operation),receipt=await f.confirm(a,w.id,p.id,p.digest);assert.deepEqual(await f.confirm(a,w.id,p.id,p.digest),receipt);
 const c=(await f.readComponent(a,w.id,receipt.id)).component;assert.equal(c.project_id,null);assert.equal((await service.types(a,w.id)).length,1);assert.notEqual(c.bindings[0].typeId,typeId);assert.equal((await service.records(a,w.id,c.bindings[0].typeId,{limit:10,offset:0})).total,0);assert.equal((await f.nodes(a,w.id)).nodes.length,0);
 const node=await f.preview(a,w.id,{kind:'create_node',nodeKind:'project',name:'Outreach',parentId:null}),project=await f.confirm(a,w.id,node.id,node.digest);
 const existingSetup={...setup,newTables:[],projectId:project.id,tabs:[{...setup.tabs[0],typeId:c.bindings[0].typeId}]};const existing=await trackerOperation(f,a,w.id,existingSetup);const pp=await f.preview(a,w.id,{kind:'create_tracker',setup:existingSetup,content:existing.content});const pr=await f.confirm(a,w.id,pp.id,pp.digest);assert.equal((await f.readComponent(a,w.id,pr.id)).component.project_id,project.id);assert.equal((await service.types(a,w.id)).length,1);
 const rowPreview=await service.preview(a,w.id,{kind:'create_record',typeId:c.bindings[0].typeId,data:{name:'Real company'}});await service.commit(a,rowPreview.id,rowPreview.digest);
 const extendedSetup={...existingSetup,projectId:null,extendTables:[{typeId:c.bindings[0].typeId,expectedVersion:0,newFields:[{key:'follow_up',name:'Follow-up',kind:'date',ai:true}]}],tabs:[{...existingSetup.tabs[0],columns:[{field:'name'},{field:'source'},{field:'follow_up'}]}]};const extended=await trackerOperation(f,a,w.id,extendedSetup),ep=await f.preview(a,w.id,{kind:'create_tracker',setup:extendedSetup,content:extended.content});
 const output:any=await f.runFrontend(a,w.id,{previewId:ep.id,event:{kind:'click',action:'tab:0'}});assert.equal(output.controls?.find((c:any)=>c.label==='Follow-up')?.editable,false);assert.equal((await service.types(a,w.id))[0].fields.some((x:any)=>x.key==='follow_up'),false);
 await f.confirm(a,w.id,ep.id,ep.digest);assert.equal((await service.types(a,w.id))[0].fields.some((x:any)=>x.key==='follow_up'),true);assert.equal((await service.records(a,w.id,c.bindings[0].typeId,{limit:10,offset:0})).rows[0].data.name,'Real company');
 }finally{await db.close();}
});

test('only exact approved source receives the local renderer; custom overrides remain isolated',async()=>{
 const {standardTracker,trackerRenderer}=await import('../src/workspace/standard-tracker.js');
 const source='const config='+JSON.stringify({name:'Custom label',tabs:[]})+';\nconst theme="";\n'+trackerRenderer;
 assert.equal(standardTracker(source)?.config.name,'Custom label');
 assert.equal(standardTracker(source+'\n// user modification'),null);
 assert.equal(standardTracker('const config={};\nconst theme="";\nreturn {html:"Custom"};'),null);
});
