import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {recordUxTiming,uxPercentile,uxTimingSummary} from '../src/server/ux-timing.js';
import {UX_BUCKETS,UX_TARGET_MS,uxBucket,uxWidth} from '../src/shared/ux-timing-schema.js';

// P1/P10: speed is measured on real usage as anonymous daily histograms and compared with the targets.
test('speed samples are bucketed, summarized against the targets, and carry no identifiers',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
  assert.deepEqual(UX_TARGET_MS,{open:2500,interaction:1000,save:1000});
  assert.equal(uxBucket(0),50);assert.equal(uxBucket(100),100);assert.equal(uxBucket(101),200);assert.equal(uxBucket(999999),UX_BUCKETS[UX_BUCKETS.length-1]);
  assert.equal(uxWidth(390),'phone');assert.equal(uxWidth(700),'panel');assert.equal(uxWidth(1440),'desktop');
  const sample=(metric:string,ms:number,width='desktop')=>({metric,ms,host:'web',width});
  await recordUxTiming(db,{samples:[sample('interaction',80),sample('interaction',90),sample('interaction',450),sample('interaction',3000),sample('open',1800),sample('open',2200,'phone'),sample('save',700)]});
  await recordUxTiming(db,{samples:[sample('interaction',95)]});
  const rows=(await db.query("SELECT bucket_ms,samples::int AS samples FROM ux_timing_daily WHERE metric='interaction' ORDER BY bucket_ms")).rows;
  assert.deepEqual(rows,[{bucket_ms:100,samples:3},{bucket_ms:500,samples:1},{bucket_ms:5000,samples:1}]);
  assert.equal(uxPercentile(rows,.5),100);assert.equal(uxPercentile(rows,.75),500);assert.equal(uxPercentile(rows,.95),5000);assert.equal(uxPercentile([],.5),null);
  const summary=await uxTimingSummary(db,7),of=(metric:string,width:string)=>summary.find(s=>s.metric===metric&&s.width===width)!;
  assert.deepEqual({...of('interaction','desktop')},{metric:'interaction',host:'web',width:'desktop',mode:'server',samples:5,p50:100,p75:500,p95:5000,targetMs:1000,meetsTarget:true});
  assert.equal(of('open','phone').p75,2500);assert.equal(of('open','phone').meetsTarget,true);assert.equal(of('save','desktop').meetsTarget,true);
  await recordUxTiming(db,{samples:[sample('save',4000),sample('save',4200),sample('save',4100)]});
  assert.equal((await uxTimingSummary(db,7)).find(s=>s.metric==='save')!.meetsTarget,false);
  // Nothing that could identify a person, app, record or value is accepted or stored.
  for(const extra of [{userId:'u'},{appId:'a'},{recordId:'r'},{value:'secret'},{name:'App'}])await assert.rejects(recordUxTiming(db,{samples:[{...sample('open',10),...extra}]}));
  await assert.rejects(recordUxTiming(db,{samples:[]}));await assert.rejects(recordUxTiming(db,{samples:[sample('open',-1)]}));await assert.rejects(recordUxTiming(db,{samples:[{...sample('open',1),host:'elsewhere'}]}));
  const columns=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='ux_timing_daily' ORDER BY column_name")).rows.map((r:any)=>r.column_name);
  assert.deepEqual(columns,['bucket_ms','day','host','metric','mode','samples','width']);
 }finally{await pg.close();}
});

// The deployed service connects with the restricted role; a table it cannot write to records nothing.
test('the restricted runtime role can record speed samples',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
  const db:Database={query:(q,v)=>db.transaction(tx=>tx.query(q,v)),transaction:fn=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');return fn(tx as Connection);}),close:async()=>{}};
  const sample={metric:'open',ms:900,host:'web',width:'desktop',mode:'server'};
  assert.deepEqual(await recordUxTiming(db,{samples:[sample]}),{recorded:1});
  assert.deepEqual(await recordUxTiming(db,{samples:[sample]}),{recorded:1});
  assert.equal(Number((await pg.query<{samples:string}>('SELECT sum(samples) AS samples FROM ux_timing_daily')).rows[0].samples),2);
 }finally{await pg.close();}
});
