import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation,READ_BATCH_LIMIT} from '../src/workspace/service.js';
import type {Actor} from '../src/shared/schema.js';
test('records.readMany returns what separate reads return, with every read checked and far fewer lookups',async()=>{
 const pg=new PGlite();let queries=0;for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(s,v)=>{queries++;return pg.query(s,v) as any;},transaction:f=>pg.transaction(tx=>f({query:(s:string,v?:any[])=>{queries++;return tx.query(s,v);}} as Connection)),close:()=>pg.close()};
 try{
  const service=new Service(db),f=new WorkspaceFoundation(db),a:Actor={userId:randomUUID(),origin:'human'};
  await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'batch@example.invalid','Batch']);
  const w=await service.createWorkspace(a,'Batch');
  const save=async(op:any)=>{const draft=await service.preview(a,w.id,op);return service.commit(a,draft.id,draft.digest);};
  const change=async(op:any)=>{const draft=await f.preview(a,w.id,op);return f.confirm(a,w.id,draft.id,draft.digest);};
  const tables:string[]=[];
  for(const name of ['Companies','Contacts','Deals','Notes']){const id=(await save({kind:'create_type',name,fields:[{key:'name',name:'Name',kind:'text'},{key:'stage',name:'Stage',kind:'select',options:['A','B']}]})).objects[0].id;tables.push(id);for(let i=0;i<5;i++)await save({kind:'create_record',typeId:id,data:{name:name+' '+i,stage:i%2?'A':'B'}});}
  const [companies,contacts,deals,unbound]=tables;
  const reads=[{typeId:companies,limit:3},{typeId:contacts,limit:5,sort:{field:'name',direction:'desc'}},{typeId:deals,filters:{stage:'A'}},{typeId:companies,limit:2,offset:3},{typeId:contacts,q:'Contacts 1'},{typeId:deals,limit:1}];
  const shape="const view=r=>({total:r.total,limit:r.limit,offset:r.offset,rows:r.rows.map(x=>x.data.name)});";
  const app=async(name:string,body:string)=>{const saved=await change({kind:'save_component',projectId:null,content:{name,format:'frontend-js',source:shape+body,bindings:[companies,contacts,deals].map(typeId=>({typeId,fields:['name','stage']}))}});return saved.component?.id??saved.objects?.[0]?.id??saved.id;};
  const separate=await app('Separate',`const reads=${JSON.stringify(reads)};return {html:'<p>ok</p>',state:{results:reads.map(r=>view(tools.call('records.read',r)))}};`);
  const batched=await app('Batched',`const out=tools.call('records.readMany',{reads:${JSON.stringify(reads)}});return {html:'<p>ok</p>',state:{results:out.results.map(view)}};`);
  const run=async(componentId:string)=>{queries=0;const output=await f.runFrontend(a,w.id,{componentId,expectedVersion:0});return {state:output.state as any,queries};};
  const one=await run(separate),many=await run(batched);
  assert.equal(one.state.results.length,6);assert.deepEqual(many.state,one.state);
  assert.deepEqual(one.state.results[0],{total:5,limit:3,offset:0,rows:one.state.results[0].rows});assert.equal(one.state.results[2].total,2);
  console.log(JSON.stringify({separateQueries:one.queries,batchedQueries:many.queries}));
  assert.ok(many.queries<one.queries*0.7,`${many.queries} is not clearly fewer than ${one.queries}`);
  // Every read in a batch is checked like a single read: an unbound table fails the run, as it does alone.
  const outside=await app('Outside',`return {html:'<p>ok</p>',state:tools.call('records.readMany',{reads:[{typeId:${JSON.stringify(companies)}},{typeId:${JSON.stringify(unbound)}}]})};`);
  await assert.rejects(f.runFrontend(a,w.id,{componentId:outside,expectedVersion:0}));
  const tooMany=await app('Too many',`return {html:'<p>ok</p>',state:tools.call('records.readMany',{reads:${JSON.stringify(Array(READ_BATCH_LIMIT+1).fill({typeId:companies,limit:1}))}})};`);
  await assert.rejects(f.runFrontend(a,w.id,{componentId:tooMany,expectedVersion:0}));
  const empty=await app('Empty',`return {html:'<p>ok</p>',state:tools.call('records.readMany',{reads:[]})};`);
  await assert.rejects(f.runFrontend(a,w.id,{componentId:empty,expectedVersion:0}));
  // The run's total read count stays bounded however reads are grouped.
  const flood=await app('Flood',`const reads=${JSON.stringify(Array(READ_BATCH_LIMIT).fill({typeId:companies,limit:1}))};for(let i=0;i<9;i++)tools.call('records.readMany',{reads});return {html:'<p>ok</p>',state:null};`);
  await assert.rejects(f.runFrontend(a,w.id,{componentId:flood,expectedVersion:0}));
 }finally{await pg.close();}
});
