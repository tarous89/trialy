import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {trackerOperation} from '../src/workspace/tracker-template.js';
import {prepareToolLayout} from '../src/workspace/tool-layout.js';
import {standardTracker} from '../src/workspace/standard-tracker.js';
import type {Database,Connection} from '../src/db/database.js';

test('four-tab tracker budgets cover publication checks, wide schemas and layout saves',async()=>{
 const pg=new PGlite();let queries:string[]=[],changeAccess=false,validationReads=0;
 const query=(tx:Connection)=>async(sql:string,args?:any[])=>{queries.push(sql);if(validationReads&&sql==='SELECT * FROM workspace_components WHERE id=$1 AND workspace_id=$2'&&++validationReads===3)await tx.query('UPDATE workspace_components SET version=version+1 WHERE id=$1',[args![0]]);if(changeAccess&&sql.includes('octet_length(selected::text)')){changeAccess=false;await tx.query('UPDATE workspaces SET access_version=access_version+1 WHERE id=$1',[args![0]]);}return {...await tx.query(sql,args),_parsers:[(value:unknown)=>value]};};
 const db:Database={query:query(pg as any),transaction:fn=>pg.transaction(tx=>fn({query:query(tx as any)})),close:()=>pg.close()};
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const actor={userId:randomUUID(),origin:'human' as const};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'performance@example.invalid','Performance fixture']);
  const service=new Service(db),f=new WorkspaceFoundation(db),w=await service.createWorkspace(actor,'Wide tracker fixture');
  const save=async(operation:any)=>{const p=await service.preview(actor,w.id,operation);return service.commit(actor,p.id,p.digest);};
  const tabs=[];
  for(const [index,size] of [28,21,12,18].entries()){
   const fields=Array.from({length:size},(_,i)=>({key:'field_'+i,name:'Field '+i,kind:i>0&&i<=5?'select':'text',ai:true,...(i>0&&i<=5?{options:['Active','Pending']}:{})}));
   const id=(await save({kind:'create_type',name:'Table '+index,fields})).objects[0].id;
   await save({kind:'bulk_records',changes:Array.from({length:25},(_,r)=>({kind:'create_record',typeId:id,data:Object.fromEntries(fields.map((field,i)=>[field.key,i>0&&i<=5?'Active':'Value '+r]))}))});
   tabs.push({name:'Tab '+index,typeId:id,filters:fields.slice(1,6).map(f=>f.key),columns:fields.map((field,i)=>({field:field.key,visible:i<9}))});
  }
  const op=await trackerOperation(f,actor,w.id,{name:'Wide tracker',description:'Representative multi-table fixture',omitSource:true,showExample:false,tabs});const p=await f.preview(actor,w.id,op),receipt=await f.confirm(actor,w.id,p.id,p.digest);
  const measure=async(name:string,run:()=>Promise<any>,ceiling:number)=>{queries=[];const start=performance.now(),result=await run();console.log('TRACKER_PERFORMANCE',JSON.stringify({name,queries:queries.length,ms:Math.round(performance.now()-start)}));assert.ok(queries.length<=ceiling,`${name}: ${queries.length} SQL calls > ${ceiling}`);return result;};
  const first=await measure('initial tab',()=>f.runFrontend(actor,w.id,{componentId:receipt.id,expectedVersion:0,event:{kind:'click',action:'tab:0'}}),38);
  assert.equal(first.tracker.config.tabs.length,4);assert.equal(first.controls.length,476);
  const next=await measure('next tab with publication token',()=>f.runFrontend(actor,w.id,{componentId:receipt.id,expectedVersion:0,viewId:first.viewId,state:first.state,event:{kind:'click',action:'tab:1'}}),38);
  assert.equal(next.tracker.pages[0].result.total,25);assert.equal(next.controls.length,462);
  const {component}=await f.readComponent(actor,w.id,receipt.id),config=standardTracker(component.source)!.config;
  const designSetting=process.env.APP_DESIGN_CHECKS;
  process.env.APP_DESIGN_CHECKS='on';
  const originalPrepare=WorkspaceFoundation.prototype.prepareRenderedTracker;
  let layout:any;
  try{layout=await measure('prepare rename with production design checks',()=>prepareToolLayout(f,actor,w.id,{componentId:receipt.id,expectedVersion:0,name:'Renamed tracker',description:'',tabs:config.tabs.map((t:any,i:number)=>({originalIndex:i,typeId:t.typeId,name:t.name,visible:true,columns:t.columns.map((c:any)=>({fieldId:c.fieldId,field:c.field,label:c.label,visible:c.visible,...(c.display?{display:c.display}:{})}))}))}),30);
  assert.ok(!queries.some(q=>q.includes('octet_length(selected::text)')),'renaming must not load tab records');
  // A real layout edit must still take the browser design-check path.
  WorkspaceFoundation.prototype.prepareRenderedTracker=async()=>{throw Error('Full design preparation invoked');};
  await assert.rejects(prepareToolLayout(f,actor,w.id,{componentId:receipt.id,expectedVersion:0,name:'Renamed tracker',description:'',tabs:config.tabs.map((t:any,i:number)=>({originalIndex:i,typeId:t.typeId,name:i===0?'Changed tab':t.name,visible:true,columns:t.columns.map((c:any)=>({fieldId:c.fieldId,field:c.field,label:c.label,visible:c.visible,...(c.display?{display:c.display}:{})}))}))}),/Full design preparation invoked/);
  }finally{WorkspaceFoundation.prototype.prepareRenderedTracker=originalPrepare;if(designSetting===undefined)delete process.env.APP_DESIGN_CHECKS;else process.env.APP_DESIGN_CHECKS=designSetting;}
  assert.deepEqual(layout.body.content.bindings,component.bindings);assert.deepEqual(layout.body.content.manifest,component.manifest);
  // Reused validation metadata must be checked again before any app write.
  validationReads=1;await assert.rejects(f.confirm(actor,w.id,layout.id,layout.digest),/Access or schema changed/);validationReads=0;
  assert.equal((await f.readComponent(actor,w.id,receipt.id)).component.version,0);
  assert.equal((await db.query('SELECT id FROM workspace_receipts WHERE id=$1',[layout.id])).rows.length,0);
  await measure('confirm layout',()=>f.confirm(actor,w.id,layout.id,layout.digest),45);
  const replay=await f.confirm(actor,w.id,layout.id,layout.digest);assert.equal(replay.id,receipt.id);assert.equal(replay.version,1);
  const saved=await measure('read saved layout with output',()=>f.readComponent(actor,w.id,receipt.id,true),48);assert.equal(saved.component.version,1);assert.ok(saved.initialOutput.tracker);assert.equal(saved.component.name,'Renamed tracker');assert.equal(saved.initialOutput.tracker.config.name,'Renamed tracker');assert.equal(saved.initialOutput.tracker.pages[0].result.total,25);
  changeAccess=true;await assert.rejects(f.runFrontend(actor,w.id,{componentId:receipt.id,expectedVersion:1,event:{kind:'click',action:'tab:0'}}),/Access or schema changed|Permissions changed/);
 }finally{await pg.close();}
});
