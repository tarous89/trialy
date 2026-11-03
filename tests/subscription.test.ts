import {test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {baseApp,errors} from '../src/server/app.js';
import {addSubscription} from '../src/server/subscription.js';
test('subscription checkout uses server pricing, reuses pending checkout and verifies payment ownership',async()=>{
 const original=globalThis.fetch,key=process.env.STRIPE_SECRET_KEY;process.env.STRIPE_SECRET_KEY='synthetic';
 const u:any={id:'owner',email:'owner@example.invalid',stripe_checkout_id:null,stripe_subscription_id:null};let state='open',reference='other',calls=0;
 const db:any={query:async(q:string,v:any[])=>{if(q.startsWith('SELECT'))return {rows:[{...u}]};if(q.includes('stripe_subscription_id=$2')){u.stripe_subscription_id=v[1];u.stripe_customer_id=v[2];u.stripe_checkout_id=null;}else if(q.includes('stripe_checkout_id=$2'))u.stripe_checkout_id=v[1];return {rows:[]};},transaction:async(fn:any)=>fn(db)};
 globalThis.fetch=async(url:any,init:any)=>{const path=String(url);if(init.method==='POST'){calls++;const params=new URLSearchParams(init.body);assert.equal(params.get('line_items[0][price_data][unit_amount]'),'49000');assert.equal(params.get('client_reference_id'),'owner');return Response.json({id:'cs_synthetic',url:'https://checkout.stripe.com/synthetic'});}if(path.includes('/subscriptions/'))return Response.json({status:'active'});return Response.json({status:state,payment_status:'paid',client_reference_id:reference,metadata:{product:'trialagents_team'},subscription:'sub_synthetic',customer:'cus_synthetic',url:'https://checkout.stripe.com/synthetic'});};
 try{const app=baseApp();app.use((req,_res,next)=>{req.actor={userId:'owner',origin:'human'};next();});addSubscription(app,{db} as any);app.use(errors);
 assert.equal((await request(app).post('/api/account/subscription/checkout').send({amount:1})).status,200);assert.equal((await request(app).post('/api/account/subscription/checkout').send({})).status,200);assert.equal(calls,1);
 state='complete';assert.equal((await request(app).get('/api/account/subscription')).body.plan,'personal');reference='owner';assert.equal((await request(app).get('/api/account/subscription')).body.plan,'team');assert.equal((await request(app).post('/api/account/subscription/checkout')).status,409);
 }finally{globalThis.fetch=original;if(key===undefined)delete process.env.STRIPE_SECRET_KEY;else process.env.STRIPE_SECRET_KEY=key;}
});
