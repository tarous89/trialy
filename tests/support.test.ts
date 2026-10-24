import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import request from 'supertest';
import session from 'express-session';
import type {Database,Connection} from '../src/db/database.js';
import {baseApp,addApi,errors} from '../src/server/app.js';
import {addLocalAuth} from '../src/server/auth.js';
import {Service} from '../src/domain/service.js';
test('support accepts authenticated validated requests and preserves CSRF protection',async()=>{
 const pg=new PGlite();try{
 for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+f,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const app=baseApp();app.use(session({secret:'synthetic-session-for-support-testing',resave:false,saveUninitialized:false,rolling:true}));const auth=addLocalAuth(app,db,'https://trialy.example');addApi(app,new Service(db),auth.human);app.use(errors);
 assert.equal((await request(app).post('/api/support').send({subject:'Help',message:'Details'})).status,401);
 const browser=request.agent(app),signup=await browser.get('/auth/login?mode=signup');assert.ok(!signup.text.includes('minlength="12"'));assert.ok(!signup.text.includes('name="otp"'));
 await browser.post('/auth/signup').type('form').send({email:'help@example.invalid',password:'short',intendedUse:'accepted',csrf:signup.text.match(/name="csrf" value="([^"]+)"/)![1]});
 const me=await browser.get('/api/me');const csrf=me.body.csrf;assert.equal(me.status,200);const expires=/Expires=([^;]+)/.exec(me.headers['set-cookie'][0])![1];assert.ok(new Date(expires).getTime()-Date.now()>29*24*3600000);
 assert.equal((await browser.post('/api/support').send({subject:'Help',message:'Details'})).status,403);
 assert.equal((await browser.post('/api/support').set('x-csrf-token',csrf).send({subject:' ',message:'Details'})).status,400);
 const saved=await browser.post('/api/support').set('x-csrf-token',csrf).send({subject:'Help',message:'Details'});assert.equal(saved.status,201,saved.text);
 const row=(await db.query('SELECT * FROM support_requests WHERE id=$1',[saved.body.id])).rows[0];assert.equal(row.user_id,me.body.user.id);assert.equal(row.message,'Details');
 }finally{await pg.close();}
});
