import type {Express} from 'express';
import type {Service} from '../domain/service.js';
import {fail} from '../shared/schema.js';
import {appPublicUrl} from '../shared/public-url.js';
export async function stripe(path:string,body?:Record<string,string>,key?:string){
 if(!process.env.STRIPE_SECRET_KEY)fail(503,'subscription_unavailable','Subscriptions are temporarily unavailable. Please contact support.');
 const r=await fetch('https://api.stripe.com/v1'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+process.env.STRIPE_SECRET_KEY,'Stripe-Version':'2026-10-28.endive',...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(key?{'Idempotency-Key':key}:{})},...(body?{body:new URLSearchParams(body)}:{}),signal:AbortSignal.timeout(15000)});
 if(!r.ok)fail(502,'subscription_failed','Subscription details could not be updated. Please try again.');return r.json() as Promise<any>;
}
export function addSubscription(app:Express,s:Service){
 const user=async(id:string)=>(await s.db.query('SELECT id,email,stripe_customer_id,stripe_subscription_id,stripe_checkout_id FROM users WHERE id=$1',[id])).rows[0];
 async function current(u:any){
  if(u.stripe_checkout_id){const c=await stripe('/checkout/sessions/'+encodeURIComponent(u.stripe_checkout_id));if(c.status==='complete'&&c.payment_status==='paid'&&c.client_reference_id===u.id&&c.metadata?.product==='trialagents_team'&&typeof c.subscription==='string'){await s.db.query('UPDATE users SET stripe_subscription_id=$2,stripe_customer_id=$3,stripe_checkout_id=NULL WHERE id=$1',[u.id,c.subscription,c.customer]);u.stripe_subscription_id=c.subscription;u.stripe_customer_id=c.customer;}}
  if(!u.stripe_subscription_id)return {plan:'personal',status:null,price:{amount:0,currency:'eur',interval:'month',intervalCount:1},upcomingPayment:null};
  const subscription=await stripe('/subscriptions/'+encodeURIComponent(u.stripe_subscription_id)),active=['active','trialing'].includes(subscription.status),items=subscription.items?.data??[],item=items[0];
  const price=active&&item?{amount:items.reduce((n:number,i:any)=>n+(i.price.unit_amount??0)*(i.quantity??1),0),currency:item.price.currency,interval:item.price.recurring?.interval,intervalCount:item.price.recurring?.interval_count??1}:active?null:{amount:0,currency:'eur',interval:'month',intervalCount:1};
  let upcomingPayment=null,paymentUnavailable=false;
  if(active&&!subscription.cancel_at_period_end&&!subscription.cancel_at){try{const invoice=await stripe('/invoices/create_preview',{subscription:u.stripe_subscription_id});upcomingPayment={amount:invoice.amount_due,currency:invoice.currency,date:invoice.next_payment_attempt??invoice.due_date??item?.current_period_end??null};}catch{paymentUnavailable=true;}}
  return {plan:active?'team':'personal',status:subscription.status,price,upcomingPayment,paymentUnavailable};
 }
 app.get('/api/account/subscription',async(req,res)=>{const u=await user(req.actor!.userId);res.json({...await current(u),checkoutAvailable:!!process.env.STRIPE_SECRET_KEY});});
 app.post('/api/account/subscription/checkout',async(req,res)=>{const result=await s.db.transaction(async tx=>{const u=(await tx.query('SELECT id,email,stripe_customer_id,stripe_subscription_id,stripe_checkout_id FROM users WHERE id=$1 FOR UPDATE',[req.actor!.userId])).rows[0];if(u.stripe_subscription_id){const sub=await stripe('/subscriptions/'+encodeURIComponent(u.stripe_subscription_id));if(!['canceled','incomplete_expired'].includes(sub.status))fail(409,'already_subscribed','Manage your existing subscription instead.');}
  if(u.stripe_checkout_id){const previous=await stripe('/checkout/sessions/'+encodeURIComponent(u.stripe_checkout_id));if(previous.status==='open')return {url:previous.url};if(previous.status==='complete')fail(409,'checkout_complete','Refresh Subscription to see your updated plan.');}
  const origin=new URL(appPublicUrl()).origin,session=await stripe('/checkout/sessions',{mode:'subscription',client_reference_id:u.id,'metadata[product]':'trialagents_team','subscription_data[metadata][product]':'trialagents_team',...(u.stripe_customer_id?{customer:u.stripe_customer_id}:{customer_email:u.email}),success_url:origin+'/?tab=access&settings=subscription',cancel_url:origin+'/?tab=access&settings=subscription','line_items[0][quantity]':'1','line_items[0][price_data][currency]':'eur','line_items[0][price_data][unit_amount]':'49000','line_items[0][price_data][recurring][interval]':'month','line_items[0][price_data][product_data][name]':'TrialAgents Team'},'team-'+u.id+'-'+(u.stripe_checkout_id??u.stripe_subscription_id??'initial'));
  await tx.query('UPDATE users SET stripe_checkout_id=$2 WHERE id=$1',[u.id,session.id]);return {url:session.url};});res.json(result);});
 app.post('/api/account/subscription/portal',async(req,res)=>{const u=await user(req.actor!.userId);if(!u.stripe_customer_id)fail(409,'no_subscription','No subscription to manage.');res.json(await stripe('/billing_portal/sessions',{customer:u.stripe_customer_id,return_url:new URL(appPublicUrl()).origin+'/?tab=access&settings=subscription'}));});
}
