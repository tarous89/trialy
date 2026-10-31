import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {appTemplates} from '../src/workspace/app-templates.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {Service} from '../src/domain/service.js';
import type {Database,Connection} from '../src/db/database.js';
import type {Actor} from '../src/shared/schema.js';

const manifest=JSON.parse(await readFile('templates/life-science/BUILD_MANIFEST.json','utf8'));
function setupFixture(contract:any,count=6){
 const records:any={},tableMap:any={},bindings:any[]=[];let ordinal=1;
 for(const [role,schema] of Object.entries(contract.schemas) as [string,any][]){
  const typeId='00000000-0000-4000-8000-'+String(ordinal++).padStart(12,'0');const fields=Object.fromEntries(schema.fields.map((f:any)=>[f.key,f.key]));tableMap[role]={typeId,fields,writableFields:schema.fields.map((f:any)=>f.key)};bindings.push({typeId,fields:Object.keys(fields)});
  records[role]=Array.from({length:count},(_,i)=>({id:randomUUID(),version:0,data:Object.fromEntries(schema.fields.map((f:any)=>[f.key,f.key==='name'?role+' '+String(i+1).padStart(3,'0'):f.kind==='select'?f.options[i%f.options.length]:f.kind==='date'?'2026-11-'+String(i%25+1).padStart(2,'0'):f.kind==='boolean'?true:['number','money'].includes(f.kind)?f.key.startsWith('score_')?3:i+1:f.kind==='relationship'?null:f.kind==='url'?'https://example.invalid/synthetic':f.key==='unit'?'AU':f.key==='currency'?'EUR':'Synthetic fixture'] ))}));
 }
 let calls:any[]=[],proposals:any[]=[];
 const tools={call(name:string,v:any){calls.push({name,v});const role=Object.keys(tableMap).find(r=>tableMap[r].typeId===v.typeId);if(name==='records.read'){assert.ok(role);const rows=records[role!].filter((r:any)=>Object.entries(v.filters||{}).every(([k,x])=>r.data[k]===x));return {rows:rows.slice(v.offset,v.offset+v.limit),total:rows.length,limit:v.limit,offset:v.offset};}if(name==='records.get'){const r=Object.values(records).flat().find((r:any)=>r.id===v.recordId) as any;assert.ok(r);const role=Object.keys(records).find(k=>records[k].includes(r));return {...r,typeId:tableMap[role!].typeId};}if(name==='records.propose'){proposals.push(...v);return {status:'proposed',count:v.length};}throw Error(name);}};
 return {records,tableMap,bindings,tools,get calls(){return calls;},get proposals(){return proposals;},reset(){calls=[];proposals=[];}};
}

test('23 life-science catalog contracts match all 143 scoped screens and authoring metadata',async()=>{
 const list=await appTemplates.list({query:'life-science',limit:50});assert.equal(list.total,23);assert.equal(manifest.templates.length,23);
 let screens=0;
 for(const item of manifest.templates){
  const template=await appTemplates.read({templateId:item.id,version:item.version});const contract=JSON.parse(await readFile('templates/life-science/contracts/'+item.slug+'.json','utf8'));
  assert.equal(template.engine,'frontend-js');assert.ok(template.documentation?.quickStart.length);assert.equal(template.documentation?.tasks.mode,'optional');assert.ok(template.documentation?.dataContract.includes('writableFields'));assert.ok(template.source!.length<180000);assert.ok(template.documentation?.limitations.some((x:string)=>x.includes('patient-level')));
  assert.equal(contract.screens.length,item.screens);screens+=contract.screens.length;
  const op=await appTemplates.operation({} as any,{} as any,'unused',{templateId:template.id,version:template.version,digest:template.digest,name:template.name});assert.equal(op.content.bindings.length,0);assert.equal(op.content.execution.length,0);
  await assert.rejects(appTemplates.operation({} as any,{} as any,'unused',{templateId:template.id,version:template.version,digest:'0'.repeat(64),name:template.name}),/changed/);
 }
 assert.equal(screens,143);
});

test('all domain screens render bounded real-data fixtures, empty states and safe source links',async()=>{
 for(const item of manifest.templates){
  const t=await appTemplates.read({templateId:item.id});const c=JSON.parse(await readFile('templates/life-science/contracts/'+item.slug+'.json','utf8'));const f=setupFixture(c,31);const run=new Function('templateConfiguration','templateBindings','input','tools',t.source!);
  for(let i=0;i<c.screens.length;i++){
   f.reset();const result=run({...t.defaults,tableMap:JSON.stringify(f.tableMap)},f.bindings,{saved:true,writable:true,state:{tab:i},event:{kind:'open',action:'',form:{}}},f.tools);
   assert.ok(result.html.includes(c.screens[i].name.replace(/&/g,'&amp;')),item.id+' '+i);assert.ok(result.html.length<=200000);assert.ok(result.css.length<=50000);assert.ok(JSON.stringify(result.state).length<100000);assert.ok(f.calls.length<=15,JSON.stringify({id:item.id,screen:i,calls:f.calls}));assert.equal(f.proposals.length,0);
   for(const x of f.calls.filter(x=>x.name==='records.read'))assert.ok(x.v.limit<=25);
   const empty=run({...t.defaults,tableMap:'{}'},[],{saved:false,writable:false,state:{tab:i},event:{kind:'open',action:'',form:{}}},{call(){throw Error('Unbound app must not read')}});assert.ok(empty.html.includes('connect')||empty.html.includes('Connect')||empty.html.includes('No table'));
  }
  const tableIndex=c.screens.findIndex((s:any)=>s.kind==='table');const role=c.screens[tableIndex].role;f.records[role][0].data.name='<img src=x onerror=alert(1)>';f.records[role][0].data.source='javascript:alert(1)';const output=run({...t.defaults,tableMap:JSON.stringify(f.tableMap)},f.bindings,{saved:true,writable:true,state:{tab:tableIndex},event:{kind:'open',action:'',form:{}}},f.tools);assert.ok(output.html.includes('&lt;img'));assert.ok(!output.html.includes('href="javascript:'));
 }
});

test('fields are explicitly bound; editing input does not submit; writes remain proposals',async()=>{
 const t=await appTemplates.read({templateId:'life.investor-crm'}),c=JSON.parse(await readFile('templates/life-science/contracts/investor-crm.json','utf8')),f=setupFixture(c),run=new Function('templateConfiguration','templateBindings','input','tools',t.source!);const tab=c.screens.findIndex((s:any)=>s.kind==='table'),role=c.screens[tab].role,r=f.records[role][0],config={...t.defaults,tableMap:JSON.stringify(f.tableMap)};
 let result=run(config,f.bindings,{saved:true,writable:true,state:{tab},event:{kind:'click',action:'edit:'+r.id,form:{}}},f.tools);assert.equal(result.state.version,0);
 f.reset();result=run(config,f.bindings,{saved:true,writable:true,state:result.state,event:{kind:'change',action:'submit-record',form:{name:'Unsaved input',_version:'0'}}},f.tools);assert.equal(f.proposals.length,0);assert.equal(result.state.draft.name,'Unsaved input');
 f.reset();const proposed=run(config,f.bindings,{saved:true,writable:true,state:result.state,event:{kind:'submit',action:'submit-record',form:{name:'Reviewed name',_version:'0'}}},f.tools);assert.equal(f.proposals.length,1);assert.equal(r.data.name.startsWith(role),true);assert.deepEqual(f.proposals[0],{kind:'update_record',recordId:r.id,expectedVersion:0,data:{name:'Reviewed name'}});assert.equal(proposed.state.proposed,true);
 const ro=JSON.parse(JSON.stringify(f.tableMap));for(const m of Object.values(ro) as any[])m.writableFields=[];f.reset();const noWrite=run({...config,tableMap:JSON.stringify(ro)},f.bindings,{saved:true,writable:true,state:{tab},event:{kind:'click',action:'add',form:{}}},f.tools);assert.equal(noWrite.state.detail,undefined);assert.equal(f.proposals.length,0);
 assert.throws(()=>run({...config,tableMap:JSON.stringify({[role]:{typeId:randomUUID()}})},f.bindings,{state:{tab},event:{kind:'open'}},f.tools),/authorized/);
});

test('saved backend fixture: four full schemas, preview/save/reopen, reviewed write, stale and revoked access',async()=>{
 const previousFlag=process.env.SIMPLE_APPS_ENABLED;process.env.SIMPLE_APPS_ENABLED='true';
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 try{
  const a:Actor={userId:randomUUID(),origin:'human'};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'fixture@example.invalid','Synthetic template fixture']);const service=new Service(db),f=new WorkspaceFoundation(db),w=await service.createWorkspace(a,'Template synthetic fixture');await service.setAi(a,w.id,true);
  const commit=async(op:any)=>{const p=await service.preview(a,w.id,op);return service.commit(a,p.id,p.digest);};
  const t=await appTemplates.read({templateId:'life.investor-crm'}),contract=JSON.parse(await readFile('templates/life-science/contracts/investor-crm.json','utf8'));const tableMap:any={},bindings:any[]=[],manifestFields:any[]=[];
  for(const [role,sch] of Object.entries(contract.schemas).slice(0,4) as [string,any][]){
   const fields=sch.fields.map((x:any)=>({key:x.key,name:x.label,kind:['url','email','longtext','relationship'].includes(x.kind)?'text':x.kind,required:x.required||false,ai:true,...(x.options?{options:x.options}:{})}));
   while(fields.length<28)fields.push({key:'extra_'+fields.length,name:'Additional contextual field '+fields.length,kind:'text',required:false,ai:true});
   const typeId=(await commit({kind:'create_type',name:sch.name,fields})).objects[0].id;const type=(await service.types(a,w.id)).find((x:any)=>x.id===typeId)!;tableMap[role]={typeId,fields:Object.fromEntries(sch.fields.map((x:any)=>[x.key,x.key])),writableFields:sch.fields.map((x:any)=>x.key)};bindings.push({typeId,fields:fields.map((x:any)=>x.key)});for(const field of fields)manifestFields.push({id:role+'_'+field.key,typeId,field:field.key,kind:field.kind,schemaVersion:type.version,mode:'write'});
   for(let i=0;i<3;i++)await commit({kind:'create_record',typeId,data:{name:role+' original '+i}});
  }
  const op=await appTemplates.operation(f,a,w.id,{templateId:t.id,version:t.version,digest:t.digest,name:'Investor fixture',configuration:{tableMap:JSON.stringify(tableMap)},bindings,manifest:{version:1,scope:'workspace',fields:manifestFields},requestKey:randomUUID()});
  const draft=await f.preview(a,w.id,op);const initial=await f.runFrontend(a,w.id,{previewId:draft.id});assert.ok(initial.html.includes('Fundraising Overview'));assert.equal((await db.query('SELECT id FROM workspace_components')).rows.length,0);
  const saved=await f.confirm(a,w.id,draft.id,draft.digest);assert.deepEqual(await f.confirm(a,w.id,draft.id,draft.digest),saved);
  const current=(await f.readComponent(a,w.id,saved.id)).component;const request={componentId:saved.id,expectedVersion:current.version};const tab=contract.screens.findIndex((x:any)=>x.kind==='table');const role=contract.screens[tab].role;const record=(await service.records(a,w.id,tableMap[role].typeId,{limit:25})).rows[0];
  const opened=await f.runFrontend(a,w.id,{...request,state:{tab},event:{kind:'click',action:'edit:'+record.id}});assert.equal((opened.state as any).version,record.version);
  const output=await f.runFrontend(a,w.id,{...request,state:opened.state,event:{kind:'submit',action:'submit-record',form:{name:'Reviewed synthetic edit',_version:String(record.version)}}});assert.ok(output.proposal);assert.equal((await f.record(db,a,w.id,record.id)).data.name,record.data.name);
  await f.confirm(a,w.id,output.proposal.id,output.proposal.digest);assert.equal((await f.record(db,a,w.id,record.id)).data.name,'Reviewed synthetic edit');
  const edit=await f.runFrontend(a,w.id,{...request,state:{tab},event:{kind:'click',action:'edit:'+record.id}});const stale=await f.runFrontend(a,w.id,{...request,state:edit.state,event:{kind:'submit',action:'submit-record',form:{name:'Stale proposal',_version:'1'}}});assert.ok(stale.proposal);await commit({kind:'update_record',recordId:record.id,expectedVersion:1,data:{name:'Concurrent owner edit'}});await assert.rejects(f.confirm(a,w.id,stale.proposal.id,stale.proposal.digest),/changed|stale/);
  await service.setAi(a,w.id,false);await assert.rejects(f.runFrontend({...a,origin:'ai'},w.id,request));assert.equal((await f.record(db,a,w.id,record.id)).data.name,'Concurrent owner edit');
 }finally{await pg.close();if(previousFlag===undefined)delete process.env.SIMPLE_APPS_ENABLED;else process.env.SIMPLE_APPS_ENABLED=previousFlag;}
});
