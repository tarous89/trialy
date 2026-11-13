import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import {PGlite} from '@electric-sql/pglite';
import request from 'supertest';
import {sessionWritePool} from '../src/server/session-writes.js';
import {measuredSessionPool} from '../src/server/session-metrics.js';
import {createRequestMetrics,metricSummary,withRequestMetrics} from '../src/db/metrics.js';
import {Postgres} from '../src/db/database.js';
import {configureAuth} from '../src/server/auth.js';
import {baseApp,errors} from '../src/server/app.js';

const Store=connectPg(session),day=86400000;
const value=(expires:number)=>({cookie:{expires:new Date(expires),originalMaxAge:30*day,httpOnly:true},userId:'synthetic-user',sessionVersion:0,csrf:'synthetic-csrf'}) as session.SessionData;
const touch=(store:InstanceType<typeof Store>,sid:string,sess:session.SessionData)=>new Promise<void>((resolve,reject)=>store.touch(sid,sess,((e?:Error)=>e?reject(e):resolve()) as ()=>void));
const set=(store:InstanceType<typeof Store>,sid:string,sess:session.SessionData)=>new Promise<void>((resolve,reject)=>store.set(sid,sess,e=>e?reject(e):resolve()));
const get=(store:InstanceType<typeof Store>,sid:string)=>new Promise<session.SessionData|null|undefined>((resolve,reject)=>store.get(sid,(e,s)=>e?reject(e):resolve(s)));
const destroy=(store:InstanceType<typeof Store>,sid:string)=>new Promise<void>((resolve,reject)=>store.destroy(sid,e=>e?reject(e):resolve()));

async function fixture(){
 const db=new PGlite();
 await db.exec(`CREATE TABLE session(sid varchar PRIMARY KEY,sess json NOT NULL,expire timestamp NOT NULL);
 CREATE TABLE updates(n integer NOT NULL); INSERT INTO updates VALUES(0);
 CREATE FUNCTION count_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN UPDATE updates SET n=n+1; RETURN NEW; END $$;
 CREATE TRIGGER changed AFTER UPDATE ON session FOR EACH ROW EXECUTE FUNCTION count_update();`);
 const pool={query:async(sql:string,values?:any[])=>{const result=await db.query(sql,values);return {rows:result.rows,rowCount:result.affectedRows??result.rows.length};}} as any;
 const writes=async()=>Number((await db.query<{n:number}>('SELECT n FROM updates')).rows[0].n);
 const expiry=async(sid:string)=>Number((await db.query<{n:number}>('SELECT extract(epoch FROM expire::timestamptz)::double precision n FROM session WHERE sid=$1',[sid])).rows[0]?.n);
 return {db,pool,writes,expiry};
}

test('real session store collapses 12 equal touches to one query/write and skips duplicate row writes across instances',async()=>{
 const x=await fixture(),base=Date.now()+30*day;
 const baseline=new Store({pool:measuredSessionPool(x.pool),pruneSessionInterval:false});
 const optimized=new Store({pool:sessionWritePool(measuredSessionPool(x.pool)),pruneSessionInterval:false});
 const second=new Store({pool:sessionWritePool(measuredSessionPool(x.pool)),pruneSessionInterval:false});
 try{
  await set(baseline,'baseline',value(base));await set(optimized,'optimized',value(base));
  const old=createRequestMetrics(),metrics=Array.from({length:12},createRequestMetrics);
  await withRequestMetrics(old,()=>Promise.all(Array.from({length:12},()=>touch(baseline,'baseline',value(base+1000)))));
  assert.equal(old.sessionQueries,12);assert.equal(await x.writes(),12);
  await Promise.all(metrics.map(m=>withRequestMetrics(m,()=>touch(optimized,'optimized',value(base+1000)))));
  assert.equal(metrics.reduce((n,m)=>n+m.sessionQueries,0),1);
  assert.equal(metrics.reduce((n,m)=>n+m.sessionTouchesCoalesced,0),11);
  assert.equal(metrics.reduce((n,m)=>n+m.sessionTouchWrites,0),1);assert.equal(await x.writes(),13);
  assert.equal(await x.expiry('optimized'),await x.expiry('baseline'));
  const noops=createRequestMetrics();await withRequestMetrics(noops,async()=>{
   await touch(optimized,'optimized',value(base+1000));await touch(second,'optimized',value(base+1000));
  });
  assert.equal(noops.sessionQueries,2,'sequential and other-process requests still query PostgreSQL');
  assert.equal(noops.sessionTouchNoops,2);assert.equal(await x.writes(),13);
  await touch(optimized,'optimized',value(base+2000));assert.equal(await x.expiry('optimized'),Math.ceil((base+2000)/1000));assert.equal(await x.writes(),14);
  assert.doesNotMatch(JSON.stringify(metrics.map(metricSummary)),/synthetic|csrf|optimized|UPDATE/);
 }finally{baseline.close();optimized.close();second.close();await x.db.close();}
});

test('expiry, short sessions, immediate saves and logout keep the existing store semantics',async()=>{
 const x=await fixture(),plain=new Store({pool:x.pool,pruneSessionInterval:false}),store=new Store({pool:sessionWritePool(x.pool),pruneSessionInterval:false});
 try{
  const base=Date.now();await set(plain,'plain',value(base+30*day));await set(store,'safe',value(base+30*day));
  for(const offset of [1,1000,1800000,3599999,3600000,30*day]){
   const next=value(base+30*day+offset);await touch(plain,'plain',next);await touch(store,'safe',next);
   assert.equal(await x.expiry('safe'),await x.expiry('plain'),'no hourly rounding or expiry grace');
  }
  const changed={...value(base+60000),csrf:'new-csrf',mfaLogin:{userId:'synthetic-user',sessionVersion:0,expires:base+30000}};
  await set(store,'safe',changed);assert.equal((await get(store,'safe'))?.csrf,'new-csrf');
  assert.equal((await get(store,'safe'))?.mfaLogin?.expires,base+30000);
  await touch(store,'safe',value(base+2000));assert.equal(await x.expiry('safe'),Math.ceil((base+2000)/1000),'shorter expiry is not suppressed');
  await set(store,'expired',value(base-2000));assert.equal(await get(store,'expired'),undefined);
  await destroy(store,'safe');await touch(store,'safe',value(base+30*day));assert.equal(await get(store,'safe'),undefined,'touch never recreates a destroyed session');
 }finally{plain.close();store.close();await x.db.close();}
});

test('failed shared writes reach every callback, retry normally and never share different sessions or expiries',async()=>{
 let release!:()=>void,fail=true,queries=0;const gate=new Promise<void>(r=>release=r);
 const pool={query:async()=>{queries++;await gate;if(fail)throw Error('synthetic database failure');return {rows:[],rowCount:1};}} as any;
 const store=new Store({pool:sessionWritePool(measuredSessionPool(pool)),pruneSessionInterval:false}),base=Date.now()+30*day;
 try{
  const first=Promise.allSettled(Array.from({length:8},()=>touch(store,'same',value(base))));
  await new Promise(setImmediate);assert.equal(queries,1);release();
  assert.ok((await first).every(r=>r.status==='rejected'&&/synthetic database failure/.test(r.reason.message)));
  fail=false;await touch(store,'same',value(base));assert.equal(queries,2,'a failed promise must not be reused');
  await Promise.all([touch(store,'other',value(base)),touch(store,'same',value(base+1000)),touch(store,'same',value(base+2000))]);
  assert.equal(queries,5);
 }finally{store.close();}
});

test('save and destroy separate in-flight touch sharing and unsupported store queries pass through',async()=>{
 const calls:{sql:string;values:any[];finish:()=>void}[]=[];
 const raw={query:(sql:string,values:any[])=>new Promise(resolve=>calls.push({sql,values,finish:()=>resolve({rows:[],rowCount:1})}))} as any;
 const pool=sessionWritePool(raw),store=new Store({pool,pruneSessionInterval:false}),sess=value(Date.now()+30*day);
 try{
  const first=touch(store,'same',sess);await new Promise(setImmediate);
  const save=set(store,'same',sess);await new Promise(setImmediate);
  const second=touch(store,'same',sess);await new Promise(setImmediate);assert.equal(calls.length,3);
  calls[0].finish();await first;
  const third=touch(store,'same',sess);await new Promise(setImmediate);assert.equal(calls.length,3,'old completion must not delete the newer shared write');
  const remove=destroy(store,'same');await new Promise(setImmediate);
  const fourth=touch(store,'same',sess);await new Promise(setImmediate);assert.equal(calls.length,5);
  calls.slice(1).forEach(c=>c.finish());await Promise.all([save,second,third,remove,fourth]);
  const custom=pool.query('UPDATE "other_session" SET expire=$1 WHERE sid=$2',[123,'other']);
  assert.equal(calls.at(-1)?.sql,'UPDATE "other_session" SET expire=$1 WHERE sid=$2');calls.at(-1)!.finish();await custom;
 }finally{store.close();}
});

test('real auth still reads each session, refreshes cookies, persists CSRF and checks revocation on every request',async t=>{
 const x=await fixture(),clock=Date.now(),secret='synthetic-session-write-secret-for-testing-only',sid='synthetic-signed-session';
 t.mock.method(Date,'now',()=>clock);
 const seed=new Store({pool:x.pool,pruneSessionInterval:false});
 await set(seed,sid,value(clock+30*day-1000));seed.close();
 let version=0,checks=0,reads=0;
 const db=new Postgres('postgres://unused');db.pool={
  query:async(sql:string,values:any[])=>{if(sql.startsWith('SELECT sess'))reads++;return x.pool.query(sql,values);},
  connect:async()=>({query:async(sql:string)=>{if(sql.includes('SELECT session_version')){checks++;return {rows:[{session_version:version}],rowCount:1};}return {rows:[],rowCount:0};},release(){}}),
 } as any;
 const app=baseApp(),auth=configureAuth(app,db,{NODE_ENV:'test',SESSION_SECRET:secret,APP_PUBLIC_URL:'https://platform.example.invalid'});
 app.get('/api/probe',auth.human,(req,res)=>res.json({csrf:req.session.csrf}));
 app.post('/api/csrf',auth.human,(req,res)=>{req.session.csrf='changed-csrf';res.json({ok:true});});app.use(errors);
 const signature=createHmac('sha256',secret).update(sid).digest('base64').replace(/=+$/,'');
 const cookie='trialy_session='+encodeURIComponent(`s:${sid}.${signature}`);
 try{
  const results=await Promise.all(Array.from({length:12},()=>request(app).get('/api/probe').set('Cookie',cookie)));
  for(const r of results){assert.equal(r.status,200);assert.ok(r.headers['set-cookie']);const expiry=r.headers['set-cookie'][0].match(/Expires=([^;]+)/)?.[1];assert.equal(Date.parse(expiry!),Math.floor((clock+30*day)/1000)*1000);}
  assert.equal(reads,12);assert.equal(checks,12);assert.equal(await x.writes(),1);
  assert.equal((await request(app).post('/api/csrf').set('Cookie',cookie).set('x-csrf-token','wrong')).status,403);
  assert.equal((await request(app).post('/api/csrf').set('Cookie',cookie).set('x-csrf-token','synthetic-csrf')).status,200);
  assert.equal((await request(app).get('/api/probe').set('Cookie',cookie)).body.csrf,'changed-csrf');
  const before=checks;version=1;assert.equal((await request(app).get('/api/probe').set('Cookie',cookie)).status,401);assert.equal(checks,before+1);
  assert.equal((await x.db.query('SELECT sid FROM session WHERE sid=$1',[sid])).rows.length,0,'revocation still regenerates the browser session');
 }finally{await x.db.close();}
});
