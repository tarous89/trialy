import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {trackerOperation} from '../src/workspace/tracker-template.js';
import {prepareToolLayout} from '../src/workspace/tool-layout.js';
import {standardTracker} from '../src/workspace/standard-tracker.js';
import {standardDefaults,standardSource} from '../src/shared/standard-tool.js';
import {toolThemeSchema} from '../src/shared/tool-theme.js';

test('rebrand, extend Settings and remove a view column without losing shared records',async()=>{
 const pg=new PGlite(),db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const a={userId:randomUUID(),origin:'human' as const},ai={...a,origin:'ai' as const};
  await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'theme@example.invalid','Theme fixture']);
  const service=new Service(db),f=new WorkspaceFoundation(db),w=await service.createWorkspace(a,'Fixture');
  const save=async(op:any)=>{const p=await service.preview(a,w.id,op);return service.commit(a,p.id,p.digest);};
  const typeId=(await save({kind:'create_type',name:'Companies',fields:[{key:'name',name:'Company',kind:'text',ai:true,multiple:true}]})).objects[0].id;
  const recordId=(await save({kind:'create_record',typeId,data:{name:['Alpha','Beta']}})).objects[0].id;
  const op=await trackerOperation(f,ai,w.id,{name:'Outreach',description:'Fixture',omitSource:true,showExample:false,tabs:[{name:'Companies',typeId,columns:[{field:'name'}]}]});
  const p=await f.preview(ai,w.id,op),receipt=await f.confirm(a,w.id,p.id,p.digest);
  const config=standardTracker(op.content.source)!.config,theme={primary:'#003B71',accent:'#00A3E0',success:'#65B32E',surface:'#FFFFFF',background:'#F3F6F8'};
  const layout={componentId:receipt.id,expectedVersion:0,name:'Outreach',description:'Fixture',theme,tabs:config.tabs.map((t:any,i:number)=>({originalIndex:i,typeId:t.typeId,name:t.name,visible:true,columns:t.columns.map((c:any)=>({fieldId:c.fieldId,field:c.field,label:c.label,visible:true}))}))};
  const themed=await prepareToolLayout(f,ai,w.id,layout);await f.confirm(a,w.id,themed.id,themed.digest);
  let current=(await f.readComponent(a,w.id,receipt.id)).component;
  assert.deepEqual(current.bindings,op.content.bindings);assert.deepEqual((await f.record(db,a,w.id,recordId)).data.name,['Alpha','Beta']);
  const rendered=await f.runFrontend(ai,w.id,{componentId:receipt.id,expectedVersion:1});assert.match(rendered.css,/#003B71/);assert.match(rendered.css,/#00A3E0/);
  const draftId=randomUUID();
  const extended=await prepareToolLayout(f,ai,w.id,{...layout,expectedVersion:1,extendTables:[{typeId,expectedVersion:0,newFields:[{key:'notes',name:'Notes',kind:'text',multiple:true,ai:true}]}],newTables:[{id:draftId,name:'Activities',fields:[{key:'name',name:'Activity',kind:'text',ai:true}]}],tabs:[{...layout.tabs[0],columns:[...layout.tabs[0].columns,{field:'notes',label:'Notes',visible:true}]},{typeId:draftId,name:'Activities',visible:true,columns:[{field:'name',label:'Activity',visible:true}]}]});
  assert.equal((await service.types(a,w.id)).length,1);assert.equal((await service.types(a,w.id))[0].fields.length,1);
  await f.confirm(a,w.id,extended.id,extended.digest);
  current=(await f.readComponent(a,w.id,receipt.id)).component;const updated=standardTracker(current.source)!.config;
  assert.equal(updated.tabs.length,2);assert.equal(updated.tabs[0].columns.length,2);assert.notEqual(updated.tabs[1].typeId,draftId);assert.deepEqual(updated.theme,theme);
  assert.deepEqual((await f.record(db,a,w.id,recordId)).data.name,['Alpha','Beta']);
  const removed=await prepareToolLayout(f,ai,w.id,{...layout,expectedVersion:2});await f.confirm(a,w.id,removed.id,removed.digest);
  assert.equal((await service.types(a,w.id)).length,2);assert.equal((await service.types(a,w.id)).find((t:any)=>t.id===typeId).fields.length,2);
  assert.deepEqual((await f.record(db,a,w.id,recordId)).data.name,['Alpha','Beta']);
  await assert.rejects(prepareToolLayout(f,ai,w.id,{...layout,expectedVersion:2}),/changed/);
 }finally{await db.close();}
});

test('explicit styling wins over semantic defaults, without changing the pristine preset',()=>{
 const fields=[{field:'company',label:'Company',kind:'text',multiple:true},{field:'channel',label:'Channel',kind:'select',options:['Email']},{field:'status',label:'Status',kind:'select',options:['Active']},{field:'priority',label:'Priority',kind:'select',options:['High'],display:{kind:'text'}},{field:'outcome',label:'Outcome',kind:'select',options:['Done'],display:{kind:'badge',tone:'neutral'}}];
 const columns=standardDefaults({tabs:[{columns:fields}]}).tabs[0].columns;
 assert.equal(columns[0].display,undefined);assert.equal(columns[1].display,undefined);assert.equal(columns[2].display.valueTones.Active,'green');assert.deepEqual(columns[3].display,{kind:'text'});assert.deepEqual(columns[4].display,{kind:'badge',tone:'neutral'});
 assert.equal(toolThemeSchema.safeParse({primary:'red; background:url(https://example.invalid)'}).success,false);
});
