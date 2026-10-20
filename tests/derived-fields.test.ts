import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {Service} from '../src/domain/service.js';
import {pureCode,DerivedReader} from '../src/domain/derived-fields.js';
import type {Database,Connection} from '../src/db/database.js';
import type {Actor} from '../src/shared/schema.js';

test('pure computation has no tools, clock or network and enforces bounds',async()=>{
 assert.equal(await pureCode('return input.a + input.b;',{a:2,b:3}),5);
 assert.equal(await pureCode('return (Date.parse(input.end)-Date.parse(input.start))/86400000;',{start:'2026-10-01',end:'2026-10-20'}),19);
 assert.equal(await pureCode('return typeof process + typeof fetch + typeof tools;',{}),'undefinedundefinedundefined');
 for(const source of ['while(true){}','return Date.now();','return new Date();','return 1/0;','return Math.random();'])await assert.rejects(pureCode(source,{}));
});

test('CRO comparison: reviewed references, current computed values, views and isolation',async t=>{
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(sql,v)=>pg.query(sql,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const s=new Service(db),owner:Actor={userId:randomUUID(),origin:'human'};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$4,$2,$3)',[owner.userId,'test@example.invalid','Test',owner.userId]);
 const w=await s.createWorkspace(owner,'CRO comparison');await s.setAi(owner,w.id,true);const ai:Actor={...owner,origin:'ai'};
 const save=async(op:any)=>{const p=await s.preview(owner,w.id,op);return s.commit(owner,p.id,p.digest);};
 const field=(key:string,kind='text',extra:any={})=>({key,name:key,kind,...extra});
 const cro=(await save({kind:'create_type',name:'CROs',fields:[field('name'),field('budget','number'),field('private_budget','number',{ai:false})]})).objects[0].id;
 const c1=(await save({kind:'create_record',typeId:cro,data:{name:'CRO A',budget:100,private_budget:700}})).objects[0].id;
 const c2=(await save({kind:'create_record',typeId:cro,data:{name:'CRO B',budget:200}})).objects[0].id;
 const fields=[field('name'),field('cros','relationship',{targetTypeId:cro,multiple:true}),field('budget','number',{lookup:{reference:'cros',field:'budget',aggregate:'sum'}}),field('target','number'),field('variance','number',{computed:{source:'return input.budget === null ? null : input.budget-input.target;',fields:['budget','target']},renderer:{kind:'code',source:'return "EUR " + input.value;'}}),field('start','date'),field('end','date'),field('days','number',{computed:{fields:['start','end'],source:'return (Date.parse(input.end)-Date.parse(input.start))/86400000;'}})];
 const study=(await save({kind:'create_type',name:'Studies',fields})).objects[0].id;
 const record=(await save({kind:'create_record',typeId:study,data:{name:'Phase II',cros:[c1,c2],target:250,start:'2026-10-01',end:'2026-10-20'}})).objects[0].id;
 await t.test('current values and display never write to business records',async()=>{
  const before=await db.query('SELECT data,version FROM records WHERE id=$1',[record]);const read=(await s.records(owner,w.id,study)).rows[0];
  assert.equal(read.data.budget,300);assert.equal(read.data.variance,50);assert.equal(read.data.days,19);assert.equal(read.display.variance.text,'EUR 50');assert.equal(read.derived.variance.status,'current');
  assert.deepEqual((await db.query('SELECT data,version FROM records WHERE id=$1',[record])).rows,before.rows);
  await save({kind:'update_record',recordId:c1,expectedVersion:0,data:{budget:150}});
  assert.equal((await s.records(owner,w.id,study)).rows[0].data.variance,100);
 });
 await t.test('execution scope cannot read a linked table without its capability',async()=>{
  const r=(await s.records(owner,w.id,study,{},[study])).rows[0];assert.equal(r.data.budget,undefined);assert.equal(r.derived.budget.status,'error');
 });
 await t.test('frontend field bindings constrain transitive calculation inputs',async()=>{
  const row=(await db.query('SELECT * FROM records WHERE id=$1',[record])).rows[0];
  const restricted=new DerivedReader(db,owner,w.id,[study,cro],{[study]:['variance'],[cro]:['budget']});
  assert.equal((await restricted.read(row)).data.variance,undefined);
  const bound=new DerivedReader(db,owner,w.id,[study,cro],{[study]:['variance','budget','target','cros'],[cro]:['budget']});
  assert.equal((await bound.read(row)).data.variance,100);
 });
 await t.test('read-only fields and human approval enforced across MCP proposals',async()=>{
  await assert.rejects(s.preview(owner,w.id,{kind:'update_record',recordId:record,expectedVersion:0,data:{variance:42}}),/unavailable/);
  const p=await s.preview(ai,w.id,{kind:'update_record',recordId:record,expectedVersion:0,data:{target:200}});await assert.rejects(s.commit(ai,p.id,p.digest),/cannot approve/i);
  assert.equal((await s.records(owner,w.id,study)).rows[0].data.target,250);
 });
 await t.test('cross-table hidden input does not leak through derived values',async()=>{
  const next=[...fields,field('secret','number',{lookup:{reference:'cros',field:'private_budget',aggregate:'sum'}}),field('secret_echo','text',{computed:{source:'return String(input.secret);',fields:['secret']}})];
  await save({kind:'update_type',typeId:study,expectedVersion:0,name:'Studies',fields:next});
  const r=(await s.records(ai,w.id,study)).rows[0];assert.equal(r.data.secret,undefined);assert.equal(r.data.secret_echo,undefined);assert.equal(r.derived.secret.status,'error');
  assert.equal((await s.records(ai,w.id,study,{q:'700'})).total,0);
 });
 await t.test('saved views filter and aggregate underlying derived values',async()=>{
  const view=(await save({kind:'create_view',name:'Over budget',typeId:study,viewKind:'table',config:{filters:[{field:'variance',operator:'equals',value:100}],sort:{field:'variance',direction:'desc'},renderers:{variance:{kind:'progress'}}}})).objects[0].id;
  assert.equal((await s.records(owner,w.id,study,{viewId:view})).total,1);
  assert.equal((await s.aggregate(owner,w.id,study,{viewId:view,metric:'variance'})).totals.sum,100);
 });
 await t.test('cycles, schema dependencies and invalid references fail before saving',async()=>{
  await assert.rejects(s.preview(owner,w.id,{kind:'create_type',name:'Cycle',fields:[field('a','number',{computed:{fields:['b'],source:'return input.b;'}}),field('b','number',{computed:{fields:['a'],source:'return input.a;'}})]}),/circular/i);
  await assert.rejects(s.preview(owner,w.id,{kind:'create_record',typeId:study,data:{cros:[randomUUID()]}}),/unavailable/i);
  const opts=await s.referenceOptions(owner,w.id,study,'cros','CRO B');assert.equal(opts.options[0].id,c2);
  await assert.rejects(s.preview(owner,w.id,{kind:'migrate_type',typeId:cro,expectedVersion:0,name:'CROs',fields:[field('name')],reason:'remove referenced budget',mappings:{}}),/referenced field/i);
 });
 await t.test('source deletion and execution errors are explicit, not fabricated zeroes',async()=>{
  await db.query("UPDATE records SET state='archived' WHERE id=$1",[c2]);const r=(await s.records(owner,w.id,study)).rows[0];assert.equal(r.derived.budget.status,'error');assert.equal(r.data.variance,undefined);
 });
 await db.close();
});
