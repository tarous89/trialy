import {standardSource,readStandardConfig} from '../src/shared/standard-tool.js';
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
 let rendered:any=await f.runFrontend(a,w.id,{previewId:p.id});assert.doesNotMatch(rendered.html,/Example biotech/);const companyExample=await f.runFrontend(a,w.id,{previewId:p.id,event:{kind:"click",action:"tab:0"}});assert.match(companyExample.html,/Example biotech/);assert.doesNotMatch(rendered.html,/University fixture/);assert.match(rendered.css,/#102022/);assert.equal((await service.records(a,w.id,companies,{limit:50,offset:0})).total,0);
 const emptyContacts:any=await f.runFrontend(a,w.id,{previewId:p.id,event:{kind:'click',action:'tab:1'}});assert.match(emptyContacts.html,/Alex Morgan \(example\)/);assert.ok(emptyContacts.tracker);assert.equal(emptyContacts.tracker.pages.length,1);assert.equal(emptyContacts.controls.length,0);
 const reorderedConfig=readStandardConfig(op.content.source);reorderedConfig.tabs.reverse();
 const reordered=await f.preview(a,w.id,{...op,content:{...op.content,source:standardSource(reorderedConfig)}});
 const reorderedContacts=await f.runFrontend(a,w.id,{previewId:reordered.id,event:{kind:'click',action:'tab:0'}});assert.match(reorderedContacts.html,/Alex Morgan \(example\)/);assert.doesNotMatch(reorderedContacts.html,/Example biotech/);await f.discard(a,w.id,reordered.id);
 const ai={...a,origin:'ai' as const};
 await assert.rejects(f.preview(ai,w.id,{...op,content:{...op.content,source:op.content.source+'\n// custom design'}}),/default Vivid template/);
 const customContent={...op.content,source:'return {html:"<main>Schedule timeline</main>",css:"",state:{}};'};
 await assert.rejects(f.preview(ai,w.id,{...op,designChangeReason:'The requested interactive schedule timeline cannot be expressed by the table template.',content:customContent}),/structured designException/);
 const custom=await f.preview(a,w.id,{...op,content:customContent});
 const customOutput=await f.resolveTrackerPreview(a,w.id,custom.id);assert.match(customOutput.initialOutput.html,/Schedule timeline/);await f.discard(ai,w.id,custom.id);
 const receipt=await f.confirm(a,w.id,p.id,p.digest);let component=(await f.readComponent(a,w.id,receipt.id)).component;assert.equal(component.project_id,null);
 await assert.rejects(f.preview(ai,w.id,{...op,componentId:component.id,expectedVersion:0,designChangeReason:'The requested interactive schedule timeline cannot be expressed by the table template.',content:customContent}),/Saved standard designs cannot be replaced/);
 const row=(await save({kind:'create_record',typeId:companies,data:{name:'Real authorized company',source:'User'}})).objects[0].id;
 rendered=await f.runFrontend(a,w.id,{componentId:receipt.id,expectedVersion:0,event:{kind:'click',action:'tab:0'}});assert.doesNotMatch(rendered.html,/Example biotech|University fixture/);assert.equal(rendered.controls[0].value,'Real authorized company');
 const contactsWithOtherData:any=await f.runFrontend(a,w.id,{componentId:receipt.id,expectedVersion:0,event:{kind:'click',action:'tab:1'}});assert.match(contactsWithOtherData.html,/Alex Morgan \(example\)/);assert.doesNotMatch(contactsWithOtherData.html,/Real authorized company/);assert.equal(contactsWithOtherData.controls.length,0);
 const edit=await f.runFrontend(a,w.id,{componentId:receipt.id,expectedVersion:0,event:{kind:'submit',action:'bound-batch',form:{['bound:f_0_0:'+row+':0']:'Updated company',['bound:f_0_1:'+row+':0']:'Reviewed source'}}});assert.ok(edit.proposal);assert.equal((await f.record(db,a,w.id,row)).data.name,'Real authorized company');await f.confirm(a,w.id,edit.proposal!.id,edit.proposal!.digest);assert.equal((await f.record(db,a,w.id,row)).data.name,'Updated company');
 await assert.rejects(f.runFrontend(a,w.id,{componentId:receipt.id,expectedVersion:0,event:{kind:'submit',action:'bound-batch',form:{['bound:f_0_0:'+row+':0']:'Stale'}}}),/changed/);
 const opened=await f.runFrontend(a,w.id,{componentId:receipt.id,expectedVersion:0,event:{kind:'click',action:'settings'}});assert.match(opened.html,/Database table:/);assert.match(opened.html,/Database column:/);assert.ok(opened.html.includes(op.content.bindings[0].typeId));const state=opened.state as any;state.layoutDraft.name='Outreach revised';state.layoutDraft.tabs[0].columns[0].label='Company';
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
 const preview=await f.preview(a,w.id,operation),rendered=await f.runFrontend(a,w.id,{previewId:preview.id,event:{kind:"click",action:"tab:0"}});assert.match(rendered.html,/Example biotech/);assert.deepEqual(await service.types(a,w.id),[]);assert.equal((await f.nodes(a,w.id)).nodes.length,0);assert.equal((await f.components(a,w.id)).length,0);
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

test('Home resumes private previews; saves remove preview and retain all visible fields and typed multiple values',async()=>{
 const {workspaceHome}=await import('../src/workspace/home.js');
 const pg=new PGlite();const db:Database={query:(s,v)=>pg.query(s,v) as any,transaction:f=>pg.transaction(tx=>f(tx as Connection)),close:()=>pg.close()};try{
 for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const a={userId:randomUUID(),origin:'human' as const};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'defaults@example.invalid','Defaults']);
 const s=new Service(db),f=new WorkspaceFoundation(db),w=await s.createWorkspace(a,'Defaults'),typeId=randomUUID();
 const fields=[{key:'name',name:'Company',kind:'text'},{key:'source',name:'Source',kind:'text'},{key:'status',name:'Status',kind:'select',options:['Pending','Active']},{key:'due',name:'Due',kind:'date'},{key:'active',name:'Active',kind:'boolean'},{key:'channel',name:'Channels',kind:'select',options:['Email','LinkedIn']},{key:'amount',name:'Amounts',kind:'number'},{key:'notes',name:'Notes',kind:'text'}];
 const setup={name:'Visible preview',description:'Typed values',newTables:[{id:typeId,name:'Companies',fields}],tabs:[{name:'Companies',typeId,columns:fields.map(f=>({field:f.key}))}]};
 const op=await trackerOperation(f,a,w.id,setup),p=await f.preview(a,w.id,{kind:'create_tracker',setup,content:op.content});
 let home=await workspaceHome(db,a,w.id);assert.equal(home.resources.length,1);assert.equal(home.resources[0].status,'Preview');assert.equal(home.resources[0].source,'preview');assert.equal(home.resources[0].canMove,false);assert.ok(!JSON.stringify(home).includes('const config='));assert.equal((await s.types(a,w.id)).length,0);
 const other={userId:randomUUID(),origin:'human' as const};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[other.userId,other.userId,'other@example.invalid','Other']);await db.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'owner')",[(await db.query('SELECT tenant_id FROM workspaces WHERE id=$1',[w.id])).rows[0].tenant_id,other.userId]);assert.equal((await workspaceHome(db,other,w.id)).resources.length,0);await assert.rejects(f.runFrontend(other,w.id,{previewId:p.id}));
 const config=readStandardConfig(op.content.source);assert.ok(config.tabs[0].columns.every((c:any)=>c.visible));assert.deepEqual(config.tabs[0].columns.map((c:any)=>c.multiple),[true,true,false,false,false,true,true,true]);
 const saved=await f.confirm(a,w.id,p.id,p.digest),component=(await f.readComponent(a,w.id,saved.id)).component;home=await workspaceHome(db,a,w.id);assert.equal(home.resources.length,1);assert.equal(home.resources[0].source,'component');assert.equal(home.resources[0].status,undefined);assert.equal(component.project_id,null);
 const table=component.bindings[0].typeId;
 const data={name:['Example, Inc.','Trading name'],source:['https://example.invalid','User supplied'],status:'Active',due:'2026-10-23',active:true,channel:['Email','LinkedIn'],amount:[12.5,30],notes:['A long note, with a comma','Another note']};
 const rp=await s.preview(a,w.id,{kind:'create_record',typeId:table,data}),row=(await s.commit(a,rp.id,rp.digest)).objects[0].id;assert.deepEqual((await f.record(db,a,w.id,row)).data,data);
 const rendered:any=await f.runFrontend(a,w.id,{componentId:saved.id,expectedVersion:0,event:{kind:'click',action:'tab:0'}});assert.equal(rendered.controls?.find((c:any)=>c.label==='Amounts')?.multiple,true);
 const edit=await f.runFrontend(a,w.id,{componentId:saved.id,expectedVersion:0,event:{kind:'submit',action:'bound-batch',form:{['bound:f_0_6:'+row+':0']:'[4.5,9]'}}});await f.confirm(a,w.id,edit.proposal!.id,edit.proposal!.digest);assert.deepEqual((await f.record(db,a,w.id,row)).data.amount,[4.5,9]);
 await assert.rejects(s.preview(a,w.id,{kind:'create_record',typeId:table,data:{amount:['wrong']}}),/number/);await assert.rejects(s.preview(a,w.id,{kind:'create_record',typeId:table,data:{channel:['Fax']}}),/option/);await assert.rejects(s.preview(a,w.id,{kind:'create_record',typeId:table,data:{status:['Active','Pending']}}),/text/);await assert.rejects(s.preview(a,w.id,{kind:'create_record',typeId:table,data:{name:['duplicate','duplicate']}}),/distinct/);
 const hidden=await trackerOperation(f,a,w.id,{name:'Custom',description:'Override',tabs:[{name:'Companies',typeId:table,columns:fields.map(x=>({field:x.key,visible:x.key!=='notes'}))}]});assert.equal(readStandardConfig(hidden.content.source).tabs[0].columns[7].visible,false);
 const expired=await f.preview(a,w.id,hidden);await db.query("UPDATE workspace_previews SET expires_at=now()-interval '1 second' WHERE id=$1",[expired.id]);assert.ok(!(await workspaceHome(db,a,w.id)).resources.some(r=>r.id===expired.id));
 }finally{await db.close();}
});

test('canonical skeleton exposes neutral editable examples and bounded sizing without record operations',async()=>{
 const {trackerRenderer}=await import('../src/workspace/standard-tracker.js');
 const render=new Function('config','theme','input','tools',trackerRenderer);
 const columns=Array.from({length:14},(_,i)=>({field:'field_'+i,fieldId:'f_0_'+i,label:'Field '+i,visible:true,editable:true,kind:i===1?'select':'text',multiple:i!==1,options:['Active']}));
 const config={name:'Wide tracker',description:'',showExample:true,tabs:[{name:'Records',typeId:'table',columns,example:{field_0:['https://example.invalid','Ordinary text']}}]};
 const reads:any[]=[];const tools={call:(name:string,args:any)=>{assert.equal(name,'records.read');reads.push(args);return {rows:[],total:0};}};
 let output=render(config,'',{state:{tab:0},saved:false},tools);
 assert.equal(output.controls.length,0);assert.match(output.html,/Edit example Field 0/);assert.match(output.html,/data-action="example:0:0"/);assert.match(output.html,/example-input" hidden/);assert.match(output.html,/class="tag"/);assert.match(output.html,/min-width:2744px/);assert.equal((output.html.match(/data-resize-column=/g)||[]).length,14);assert.match(output.html,/data-resize-row="table:example"/);
 output=render(config,'',{state:output.state,event:{action:'resize-column:f_0_0',value:9999}},tools);assert.equal(output.state.widths.f_0_0,650);
 output=render(config,'',{state:output.state,event:{action:'resize-row:table:example',value:-20}},tools);assert.equal(output.state.heights['table:example'],38);
 output=render(config,'',{state:output.state,event:{action:'example:0:0',value:'Demo change'}},tools);assert.match(output.html,/Demo change/);assert.equal(output.controls.length,0);assert.equal(config.tabs[0].example.field_0[1],'Ordinary text');assert.equal(output.state.widths.f_0_0,650);
 const {readTrackerDesign}=await import('../src/server/tracker-design.js');
 const resource=await readTrackerDesign({resource:'skeleton'});assert.equal(resource.text,trackerRenderer.slice(0,12000));assert.ok(resource.resources.includes('parity'));
});

test('connected account identity is app-only metadata and never infers data access',async()=>{
 const {default:request}=await import('supertest'),{baseApp}=await import('../src/server/app.js'),{addMcp}=await import('../src/server/mcp.js');
 const userId=randomUUID();let queries=0;
 const db={query:async(sql:string,args:any[])=>{queries++;assert.equal(args[0],userId);assert.match(sql,/SELECT name,email FROM users/);return {rows:[{name:'Connected user',email:'connected@example.invalid'}]};}} as unknown as Database;
 const app=baseApp();addMcp(app,new Service(db),(req,_res,next)=>{req.actor={userId,origin:'ai'};next();});
 const list=await request(app).post('/mcp').set('Authorization','Bearer fixture').set('Accept','application/json, text/event-stream').send({jsonrpc:'2.0',id:1,method:'tools/list'});
 assert.deepEqual(list.body.result.tools.find((t:any)=>t.name==='read_connected_account')._meta.ui.visibility,['app']);
 const response=await request(app).post('/mcp').set('Authorization','Bearer fixture').set('Accept','application/json, text/event-stream').send({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'read_connected_account',arguments:{}}});
 assert.equal(response.body.result._meta.accountIdentity.email,'connected@example.invalid');assert.equal(response.body.result.structuredContent.result.connected,true);assert.ok(!JSON.stringify(response.body.result.content).includes('connected@example.invalid'));assert.ok(!JSON.stringify(response.body.result.structuredContent).includes('connected@example.invalid'));assert.equal(queries,1);
 const anonymous=await request(app).post('/mcp').set('Accept','application/json, text/event-stream').send({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'read_connected_account',arguments:{}}});assert.equal(anonymous.body.result.isError,true);assert.equal(queries,1);
});


test('standard inline row and details actions preserve data until an explicit save',async()=>{
 const {trackerRenderer}=await import('../src/workspace/standard-tracker.js');
 const render=new Function('config','theme','input','tools',trackerRenderer);
 const config={name:'Outreach',description:'',showExample:false,tabs:[{name:'Companies',typeId:'table',columns:[{field:'name',fieldId:'f_0_0',label:'Company',kind:'text',editable:true,visible:true},{field:'internal',fieldId:'f_0_1',label:'Required hidden field',kind:'text',editable:true,visible:false,required:true}]}]};
 const row={id:'record',version:0,data:{name:'Existing'}};
 const calls:string[]=[];const tools={call:(name:string)=>{calls.push(name);assert.equal(name,'records.read');return {rows:[row],total:1};}};
 let out=render(config,'',{saved:true,writable:true,state:{tab:0},event:{action:'tracker:add'}},tools);
 assert.match(out.html,/class="draft-row"/);assert.match(out.html,/New Company/);assert.match(out.html,/New Required hidden field/);assert.match(out.html,/data-action="save-new"/);assert.doesNotMatch(out.html,/role="dialog"/);
 out=render(config,'',{saved:true,writable:true,state:out.state,event:{action:'draft:name',value:'New company'}},tools);
 assert.equal(out.state.newRow.data.name,'New company');assert.equal(row.data.name,'Existing');
 out=render(config,'',{saved:true,writable:true,state:out.state,event:{action:'discard-new'}},tools);assert.equal(out.state.newRow,null);assert.doesNotMatch(out.html,/class="draft-row"/);
 out=render(config,'',{saved:true,writable:true,state:out.state,event:{action:'details:record'}},tools);
 for(const action of ['save-edits','tracker:duplicate:record','tracker:delete:record'])assert.ok(out.html.includes('data-action="'+action+'"'));
 assert.match(out.html,/M4 7h16M4 12h16M4 17h16/); // actual reference settings icon
 assert.doesNotMatch(out.html,/↗/);assert.ok(calls.every(c=>c==='records.read'));
 out=render(config,'',{saved:true,writable:false,state:{tab:0},event:{action:'tracker:add'}},tools);assert.equal(out.state.newRow,undefined);
});

