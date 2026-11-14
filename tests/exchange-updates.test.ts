import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {AsyncLocalStorage} from 'node:async_hooks';
import {PGlite} from '@electric-sql/pglite';
import request from 'supertest';
import {withActor,setDatabaseContext} from '../src/db/context.js';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {baseApp,errors} from '../src/server/app.js';
import {addExternalExchange} from '../src/server/external-exchange.js';
import {addWorkspaceMcp} from '../src/server/workspace-foundation.js';
import {checksum} from '../src/domain/evidence.js';
import {listExchanges,prepareExchangeEmailBatch,dispatchExchangeNotifications,listExchangeNotifications,listExchangeResponses,exchangeSeries,previewExchangeContent} from '../src/domain/external-exchange.js';
import {syncExchangeTracking} from '../src/domain/exchange-rooms.js';
import {deliverExchangeEmails,applyExchangeDeliveryEvents,queueEmail,FROM_ADDRESS} from '../src/app-services/exchange-email.js';
import {checkEmailClients,checksPassed,sanitise,serialise} from '../src/domain/exchange-update-content.js';
import {UPDATE_TITLE,SERIES,ASKS,updateContent,png} from './fixtures/exchange-update.js';
import type {Actor} from '../src/shared/schema.js';

// docs/product/EXTERNAL_EXCHANGE.md §6 (update extension, U1–U4) acceptance criteria 1–6, under the runtime role and row security.
const text=(html:string)=>html.replace(/<(script|style)[\s\S]*?<\/\1>/gi,'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
test('Exchange updates: rich content page and email, unsubscribe per series, "I can help" asks, series archive, assistants without links',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());for(const n of (await readdir('migrations')).filter(x=>x.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+n,'utf8'));await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();
 const db:Database={query:async(q,v)=>storage.getStore()?.query(q,v)??db.transaction(tx=>tx.query(q,v)),transaction:async fn=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async raw=>{await raw.exec('SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(q,v)=>{await setDatabaseContext(raw as any);return raw.query(q,v) as any;}};return storage.run(tx,()=>fn(tx));});},close:async()=>{}};
 const bypass:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
 const owner:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...owner,origin:'ai'},aiConfirm:Actor={...ai,actionConfirmed:true};
 await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[owner.userId,'ceo@acme-bio.invalid','Alex Morgan']);
 const s=new Service(db),f=new WorkspaceFoundation(db),run=<T>(a:Actor,fn:()=>Promise<T>)=>withActor(a,fn);
 const w=await run(owner,()=>s.createWorkspace(owner,'Investor relations'));await pg.query("UPDATE tenants SET name='Acme Bio' WHERE id=(SELECT tenant_id FROM workspaces WHERE id=$1)",[w.id]);
 const project=randomUUID();await pg.query("INSERT INTO workspace_nodes(id,workspace_id,name,kind) VALUES($1,$2,'Apps','project')",[project,w.id]);
 const save=(a:Actor,op:any)=>run(a,async()=>{const p=await s.preview(a,w.id,op);return s.commit(a,p.id,p.digest);});
 const prepare=(a:Actor,op:any):Promise<any>=>run(a,()=>f.preview(a,w.id,op));
 const confirm=(a:Actor,p:any):Promise<any>=>run(a,()=>f.confirm(a,w.id,p.id,p.digest));
 const change=async(a:Actor,op:any):Promise<any>=>confirm(a,await prepare(a,op));
 const humanOnly=async(op:any)=>{const p=await prepare(ai,op);await assert.rejects(confirm(aiConfirm,p),/cannot approve/);return p;};
 const document=async(filename:string,mime:string,bytes:Buffer)=>run(owner,async()=>{const p=await s.previewFile(owner,w.id,{filename,mime,bytes,ai:true});const o=(await s.commit(owner,p.id,p.digest)).objects[0] as any;return {...o,documentId:o.id};});
 const sel=(key:string,name:string,options:string[],more:any={})=>({key,name,kind:'select',options,ai:true,...more});
 const txt=(key:string,more:any={})=>({key,name:key,kind:'text',ai:true,...more});
 const deliveryFields=[txt('update_id'),txt('contact_id'),txt('investor_id'),txt('email',{required:true}),txt('version'),sel('status','Status',['queued','sent','bounced','read','revoked']),{key:'sent_on',name:'Sent',kind:'date',ai:true},{key:'first_read_on',name:'First read',kind:'date',ai:true},{key:'last_read_on',name:'Last read',kind:'date',ai:true},{key:'read_count',name:'Reads',kind:'number',ai:true},txt('exchange_id')];
 const deliveryType=(await save(owner,{kind:'create_type',name:'Deliveries',fields:deliveryFields})).objects[0].id as string;
 const strictDelivery=(await save(owner,{kind:'create_type',name:'Strict deliveries',fields:deliveryFields.map(x=>x.key==='status'?{...x,required:true}:x)})).objects[0].id as string;
 const responsesType=(await save(owner,{kind:'create_type',name:'Ask responses',fields:[txt('update_id'),txt('ask_key',{required:true}),txt('contact_id'),txt('investor_id'),{key:'responded_on',name:'Responded',kind:'date',ai:true,required:true},txt('message'),sel('status','Status',['new','following_up','done'],{required:true}),txt('owner')]})).objects[0].id as string;
 const chart=await document('Cash chart.png','image/png',png(1200,500)),webp=await document('Logo.webp','image/webp',Buffer.from('RIFF0000WEBPVP8 '));
 const appId=randomUUID();await pg.query("INSERT INTO workspace_components(id,workspace_id,project_id,name,format,source,bindings,source_access,created_by) VALUES($1,$2,$3,'Investor Updates','frontend-js',$4,$5,'bindings',$6)",[appId,w.id,project,"return {html:'<p>Investor updates</p>'};",JSON.stringify([{typeId:deliveryType,fields:['email','status']}]),owner.userId]);
 const app=baseApp();addExternalExchange(app,new Service(db));app.use(errors);
 const api=(token:string)=>({get:(path='')=>request(app).get('/external-exchange'+path).set('x-trialy-exchange',token),post:(path:string,body:any)=>request(app).post('/external-exchange'+path).set('x-trialy-exchange',token).send(body)});
 const asRecipient=(token:string,sql:string,params:any[]=[])=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await tx.query("SELECT set_config('trialy.exchange_link',$1,true)",[checksum(token)]);return (await tx.query<any>(sql,params)).rows;});
 const sent:any[]=[];const deliverAll=async()=>{sent.length=0;while(await deliverExchangeEmails(bypass,async(m:any,key:string)=>{sent.push({...m,key});return {id:'p-'+key};}));};
 const words=(x:any)=>JSON.stringify(x),tok=(e:any)=>e.url.split('#')[1] as string;
 const delivery=async(contact:string,email:string,update='oct')=>(await save(owner,{kind:'create_record',typeId:deliveryType,data:{update_id:update,contact_id:contact,investor_id:'inv-'+contact,email,version:'board'}})).objects[0].id as string;
 const rec=async(id:string)=>(await pg.query<any>('SELECT * FROM records WHERE id=$1',[id])).rows[0];
 const groupVersion=async(id:string)=>(await pg.query<any>('SELECT version FROM exchange_groups WHERE id=$1',[id])).rows[0].version as number;

 // U1. A room carries sanitised content as its main page; documents are optional; images come from platform documents.
 const content=updateContent(chart.versionId);
 const config={appId,kind:'room',title:UPDATE_TITLE,verifyEmail:false,levels:[{key:'board',name:'Board',entry:'none'}],content,series:SERIES.key,seriesName:SERIES.name,appRef:'update:oct',tracking:{deliveryTypeId:deliveryType,responsesTypeId:responsesType}};
 await assert.rejects(prepare(owner,{kind:'create_exchange_group',config:{title:'Request',content}}),/room settings/);
 await assert.rejects(prepare(owner,{kind:'create_exchange_group',config:{...config,content:{...content,html:content.html+`<img src="doc:${webp.versionId}" alt="">`}}}),/PNG, JPEG or GIF/);
 await assert.rejects(prepare(owner,{kind:'create_exchange_group',config:{...config,tracking:{deliveryTypeId:strictDelivery}}}),/cannot be required/);
 await assert.rejects(prepare(owner,{kind:'create_exchange_group',config:{...config,content:{...content,html:'<p><div data-ask="cmo_intro"></div></p>'}}}),/top level/);
 await assert.rejects(prepare(owner,{kind:'create_exchange_group',config:{...config,content:{...content,html:'<div data-ask="unknown"></div>'}}}),/not declared/);
 const createPreview=await prepare(ai,{kind:'create_exchange_group',config});
 assert.deepEqual(createPreview.exchangeReview.contentRemoved.sort(),['iframe','script']);const stored=createPreview.exchangeReview.group.content;
 assert.ok(!/<script|<iframe|onclick|tracker\.example/.test(stored.html),'scripts, frames, handlers and pixels are removed');assert.ok(stored.html.includes(`src="doc:${chart.versionId}"`));
 assert.deepEqual(stored.images,[{versionId:chart.versionId,documentId:chart.documentId,mime:'image/png',width:1200,height:500}]);
 assert.equal(serialise(sanitise(stored.html,ASKS.map(a=>a.key)).nodes),stored.html,'stored content is canonical');
 const oct=(await confirm(owner,createPreview)).group;assert.equal(oct.series,SERIES.key);assert.equal(oct.content.asks.length,2);assert.ok(oct.content.updatedAt);assert.ok(!words(oct).includes('image_token'));
 const [dA,dB,dC]=[await delivery('anna','anna@alpha.invalid'),await delivery('ben','ben@beta.invalid'),await delivery('cara','cara@gamma.invalid')];
 await assert.rejects(prepare(owner,{kind:'invite_exchange',groupId:oct.id,recipients:[{emails:['x@y.invalid']}]}),/delivery table/);
 const [exA,exB,exC]=(await change(owner,{kind:'invite_exchange',groupId:oct.id,recipients:[{emails:['anna@alpha.invalid'],name:'Anna',company:'Alpha Ventures',recordId:dA},{emails:['ben@beta.invalid'],name:'Ben',company:'Beta Capital',recordId:dB},{emails:['cara@gamma.invalid'],name:'Cara',company:'Gamma Partners',recordId:dC}]})).exchanges;
 const a=api(tok(exA)),b=api(tok(exB)),c=api(tok(exC));
 const pageA=(await a.get()).body;assert.equal(pageA.mode,'room');assert.equal(pageA.qa,false);assert.deepEqual(pageA.index,[],'documents are optional');
 assert.deepEqual(pageA.update.segments.filter((x:any)=>x.ask).map((x:any)=>x.ask.key),['cmo_intro','bd_partner'],'marked ask in place, the other after the content');
 const pageHtml=pageA.update.segments.filter((x:any)=>x.html).map((x:any)=>x.html).join('');assert.ok(!/<script|onclick|tracker\.example|image_token/.test(pageHtml));assert.match(pageA.update.confidentiality,/prepared for Anna/);
 const imageSrc=pageHtml.match(/src="(\/exchange-content\/[^"]+)"/)![1]!;assert.match(pageHtml,/width="552" height="230"/,'images fit the column with their natural proportions');
 const eventsBefore=Number((await pg.query<any>('SELECT count(*) AS n FROM exchange_events')).rows[0].n);
 const image=await request(app).get(imageSrc);assert.equal(image.status,200);assert.equal(image.headers['content-type'],'image/png');assert.equal(Number((await pg.query<any>('SELECT count(*) AS n FROM exchange_events')).rows[0].n),eventsBefore,'loading an image records nothing (no open pixel)');
 assert.equal((await request(app).get(imageSrc.replace(chart.versionId,webp.versionId))).status,404);assert.equal((await request(app).get('/exchange-content/'+'A'.repeat(43)+'/'+chart.versionId)).status,404);
 assert.equal((await a.post('/questions',{body:'A question'})).status,400,'update pages use asks, not Q&A');

 // U2 / acceptance 1–2. The update email: the same content as the page, email-safe HTML with a plain-text part, link, confidentiality footer, unsubscribe; exactly as reviewed.
 await assert.rejects(run(owner,()=>prepareExchangeEmailBatch(db,owner,w.id,{groupId:oct.id,emailType:'invitation'})),/not used for rooms/);
 const batch=await run(ai,()=>prepareExchangeEmailBatch(db,ai,w.id,{groupId:oct.id,emailType:'update',overrides:{[exB.id]:{body:'Dear Ben,\n\nAs promised at the board dinner, here is the October update.'}}}));
 assert.equal(batch.recipients.length,3);assert.equal(batch.replyTo,'ceo@acme-bio.invalid');assert.equal(batch.from,`Acme Bio at TrialAgents <${FROM_ADDRESS}>`);
 const mailA:any=batch.recipients.find((r:any)=>r.exchangeId===exA.id);assert.equal(mailA.subject,UPDATE_TITLE);
 for(const r of batch.recipients as any[])assert.ok(checksPassed(r.clientChecks),JSON.stringify(r.clientChecks));
 assert.ok(mailA.html.includes(exA.url)&&mailA.text.includes(exA.url),'the personal link in both parts');assert.ok(mailA.html.startsWith('<!DOCTYPE html>')&&mailA.html.includes('<!--[if mso]><table role="presentation" width="600"'));
 assert.match(mailA.text,/Confidential — prepared for Anna\. Please do not forward\./);assert.match(mailA.html,/Confidential — prepared for Anna\./);assert.match(mailA.text,/Report abuse/);assert.match(mailA.text,/Unsubscribe from Acme Bio board updates: http/);
 assert.match(mailA.text,/I can help: http[^\s]*\/exchange\?ask=cmo_intro#/);assert.ok(mailA.html.includes(`/exchange?ask=bd_partner#${tok(exA)}`));assert.ok(!/<script|onclick|tracker\.example/.test(mailA.html+mailA.text));
 assert.equal(mailA.headers['List-Unsubscribe-Post'],'List-Unsubscribe=One-Click');assert.match(mailA.headers['List-Unsubscribe'],/^<http[^>]+\/exchange-unsubscribe\/[0-9a-f-]{36}>$/);
 assert.ok((batch.recipients.find((r:any)=>r.exchangeId===exB.id) as any).text.startsWith('Dear Ben,\n\nAs promised'));
 // Acceptance 1: the content section of the email reads exactly like the online page (asks become links instead of buttons).
 const emailSection=mailA.html.split('<!-- trialagents:content -->')[1].split('<!-- /trialagents:content -->')[0];
 const pageText=pageA.update.segments.map((x:any)=>x.html?text(x.html):x.ask.text+' I can help').join(' ').replace(/\s+/g,' ').trim();
 assert.equal(text(emailSection),pageText);assert.equal((emailSection.match(/<img /g)??[]).length,1);assert.ok(emailSection.includes(imageSrc.split('/').slice(-2).join('/')),'the same image');
 for(const line of ['TL;DR: cash runway is 14.2 months','Runway | 14.2 months | −1.0','- ACM-204: IND filing moved from Q1 to Q2 2027','[Cash balance, May to October 2026]','Board portal (https://acme-bio.example/board)'])assert.ok(mailA.text.includes(line),line);
 // The client checks catch what Gmail, Outlook and Apple Mail would break.
 const broken=checkEmailClients('<html><body><div style="display:flex;max-width:600px;position:absolute;background-image:url(x);color:rgba(0,0,0,.5)"><img src="data:image/png;base64,AA"><svg></svg><script></script></div></body></html>','',{link:'https://x.invalid/exchange#t',unsubscribe:true});
 assert.ok(broken.gmail.some(m=>/data: images/.test(m))&&broken.gmail.some(m=>/position/.test(m)));assert.ok(broken.outlook.some(m=>/flex/.test(m))&&broken.outlook.some(m=>/max-width/.test(m))&&broken.outlook.some(m=>/width attribute/.test(m))&&broken.outlook.some(m=>/rgba/.test(m)));
 assert.ok(broken.appleMail.some(m=>/colour scheme/.test(m))&&broken.appleMail.some(m=>/auto-scaling/.test(m)));assert.ok(broken.text.some(m=>/empty/.test(m)));
 const big=checkEmailClients(mailA.html.replace('<!-- /trialagents:content -->','<p>'+'x'.repeat(110*1024)+'</p>'),mailA.text,{link:exA.url});assert.ok(big.gmail.some(m=>/clips/.test(m)));
 // Human confirmation, exactly as sent, Reply-To the sender.
 const sendPreview=await humanOnly({kind:'send_exchange_email',batchId:batch.batchId,digest:batch.digest});
 assert.deepEqual(sendPreview.exchangeReview.emails.map((m:any)=>m.html),batch.recipients.map((r:any)=>r.html));
 await confirm(owner,sendPreview);await deliverAll();assert.equal(sent.length,3);
 for(const m of sent){const r:any=batch.recipients.find((x:any)=>x.to===m.to[0]);assert.equal(m.html,r.html);assert.equal(m.text,r.text);assert.equal(m.subject,r.subject);assert.deepEqual(m.headers,r.headers);assert.equal(m.reply_to,'ceo@acme-bio.invalid');assert.ok(m.from.endsWith(` at TrialAgents <${FROM_ADDRESS}>`));}
 // Bounces are recorded and shown on the delivery record; the rate limit applies to update emails as to every exchange email.
 const benMail=sent.find(m=>m.to[0]==='ben@beta.invalid');
 await pg.query("INSERT INTO notification_events(id,provider_id,event_type,recipients) VALUES($1,$2,'email.bounced',$3)",['evt-'+randomUUID(),'p-'+benMail.key,JSON.stringify(['ben@beta.invalid'])]);
 await applyExchangeDeliveryEvents(bypass);assert.equal((await pg.query<any>('SELECT status FROM exchange_emails WHERE id=$1',[benMail.key])).rows[0].status,'bounced');
 await syncExchangeTracking(bypass);assert.equal((await rec(dB)).data.status,'bounced');assert.equal((await rec(dC)).data.status,'sent');assert.equal((await rec(dC)).data.sent_on,new Date().toISOString().slice(0,10));
 const limit=process.env.EXCHANGE_EMAIL_RECIPIENT_DAILY_LIMIT;process.env.EXCHANGE_EMAIL_RECIPIENT_DAILY_LIMIT='1';
 try{const again=await run(owner,()=>prepareExchangeEmailBatch(db,owner,w.id,{groupId:oct.id,emailType:'update',exchangeIds:[exA.id]}));await assert.rejects(change(owner,{kind:'send_exchange_email',batchId:again.batchId,digest:again.digest}),/already received 1 emails today/);}
 finally{if(limit===undefined)delete process.env.EXCHANGE_EMAIL_RECIPIENT_DAILY_LIMIT;else process.env.EXCHANGE_EMAIL_RECIPIENT_DAILY_LIMIT=limit;}

 // Acceptance 4. Ask responses arrive once per click with the note; who responded is visible only to the workspace.
 const nonce=randomUUID(),first=await a.post('/asks',{askKey:'cmo_intro',note:'I know two CMOs who ran oncology Phase 2s.',nonce});assert.equal(first.status,200,first.text);assert.equal(first.body.repeated,false);
 assert.equal((await a.post('/asks',{askKey:'cmo_intro',note:'I know two CMOs who ran oncology Phase 2s.',nonce})).body.repeated,true,'a retried click counts once');
 assert.equal((await a.post('/asks',{askKey:'bd_partner',nonce:randomUUID()})).status,200);assert.equal((await a.post('/asks',{askKey:'not_an_ask',nonce:randomUUID()})).status,404);
 assert.equal(Number((await pg.query<any>('SELECT count(*) AS n FROM exchange_ask_responses')).rows[0].n),2);
 const askedA=(await a.get()).body.update.asks;assert.equal(askedA.find((x:any)=>x.key==='cmo_intro').responses[0].note,'I know two CMOs who ran oncology Phase 2s.');
 assert.ok(!words((await c.get()).body).includes('two CMOs'),'other recipients never see a response');assert.equal((await asRecipient(tok(exC),'SELECT id FROM exchange_ask_responses')).length,0,'row security: only their own');
 assert.equal((await asRecipient(tok(exA),'SELECT id FROM exchange_ask_responses')).length,2);
 const listed=await run(owner,()=>listExchangeResponses(db,owner,w.id,{groupId:oct.id}));assert.deepEqual(listed.responses.map((r:any)=>[r.recipientName,r.askKey]).sort(),[['Anna','bd_partner'],['Anna','cmo_intro']]);
 await syncExchangeTracking(bypass);
 const rows=(await pg.query<any>('SELECT r.* FROM records r JOIN exchange_tracked_records t ON t.record_id=r.id WHERE t.exchange_id=$1 AND t.role=$2',[exA.id,'responses'])).rows;assert.equal(rows.length,2);
 const cmo=rows.find(r=>r.data.ask_key==='cmo_intro')!;assert.deepEqual([cmo.data.message,cmo.data.contact_id,cmo.data.investor_id,cmo.data.update_id,cmo.data.status,cmo.data.responded_on],['I know two CMOs who ran oncology Phase 2s.','anna','inv-anna','oct','new',new Date().toISOString().slice(0,10)]);
 await syncExchangeTracking(bypass);assert.equal(Number((await pg.query<any>('SELECT count(*) AS n FROM exchange_tracked_records WHERE role=$1',['responses'])).rows[0].n),2,'each response once');
 await save(owner,{kind:'update_record',recordId:cmo.id,expectedVersion:cmo.version,data:{status:'following_up',owner:'Alex'}});assert.equal((await rec(cmo.id)).data.status,'following_up','the workspace keeps the follow-up fields');
 await assert.rejects(save(owner,{kind:'update_record',recordId:cmo.id,expectedVersion:(await rec(cmo.id)).version,data:{message:'edited'}}),/recorded by TrialAgents/);
 await assert.rejects(save(ai,{kind:'create_record',typeId:responsesType,data:{ask_key:'x',responded_on:'2026-11-01',status:'new'}}),/recorded by TrialAgents/);
 const readA=(await rec(dA)).data;assert.equal(readA.status,'read');assert.ok(readA.read_count>=1);assert.equal(readA.first_read_on,new Date().toISOString().slice(0,10));assert.equal(readA.exchange_id,exA.id);
 await assert.rejects(save(owner,{kind:'update_record',recordId:dA,expectedVersion:(await rec(dA)).version,data:{read_count:0}}),/recorded by TrialAgents/);
 const statusA=(await run(owner,()=>listExchanges(db,owner,w.id,{groupId:oct.id}))).groups[0]!.exchanges.find((e:any)=>e.id===exA.id)!.status as any;assert.equal(statusA.delivery.status,'read');assert.equal(statusA.responses.length,2);

 // Acceptance 3. One-click unsubscribe per series, recorded per address and honoured by later sends.
 const caraMail=sent.find(m=>m.to[0]==='cara@gamma.invalid'),unsubscribePath=new URL(caraMail.headers['List-Unsubscribe'].slice(1,-1)).pathname;
 const confirmPage=await request(app).get(unsubscribePath);assert.equal(confirmPage.status,200);assert.match(confirmPage.text,/Stop sending <strong>Acme Bio board updates<\/strong>/);assert.equal(Number((await pg.query<any>('SELECT count(*) AS n FROM exchange_unsubscribes')).rows[0].n),0,'opening the link (or a link scanner) changes nothing');
 const oneClick=await request(app).post(unsubscribePath).type('form').send('List-Unsubscribe=One-Click');assert.equal(oneClick.status,200);assert.match(oneClick.text,/You are unsubscribed/);
 assert.equal((await request(app).post(unsubscribePath)).status,200);assert.equal(Number((await pg.query<any>('SELECT count(*) AS n FROM exchange_unsubscribes')).rows[0].n),1,'recorded once');
 assert.equal((await request(app).get('/exchange-unsubscribe/'+randomUUID())).status,404);
 const statusC=(await run(owner,()=>listExchanges(db,owner,w.id,{groupId:oct.id}))).groups[0]!.exchanges.find((e:any)=>e.id===exC.id)!.status as any;assert.equal(statusC.unsubscribed[0].email,'cara@gamma.invalid');
 assert.equal((await c.get()).status,200,'leaving the email list keeps the page');

 // A later update of the series (November): Cara is excluded from every send; Dan joins; Ben's October access is revoked.
 const nov=(await change(owner,{kind:'create_exchange_group',config:{...config,title:'Acme Bio — November 2026 board update',appRef:'update:nov',content:{...content,html:'<h1>November 2026 board update</h1><p>Enrolment reached 70%.</p><div data-ask="cmo_intro"></div>',asks:[ASKS[0]!]}}})).group;
 const dD=await delivery('dan','dan@delta.invalid','nov');const novRecords=[await delivery('anna','anna@alpha.invalid','nov'),await delivery('ben','ben@beta.invalid','nov'),await delivery('cara','cara@gamma.invalid','nov')];
 const inviteNov=await prepare(owner,{kind:'invite_exchange',groupId:nov.id,recipients:[{emails:['anna@alpha.invalid'],name:'Anna',recordId:novRecords[0]},{emails:['ben@beta.invalid'],name:'Ben',recordId:novRecords[1]},{emails:['cara@gamma.invalid'],name:'Cara',recordId:novRecords[2]},{emails:['dan@delta.invalid'],name:'Dan',recordId:dD}]});
 assert.deepEqual(inviteNov.exchangeReview.unsubscribed.map((u:any)=>u.email),['cara@gamma.invalid'],'the owner sees who left the series');
 const [nA,nB,nC,nD]=(await confirm(owner,inviteNov)).exchanges;
 const novBatch=await run(owner,()=>prepareExchangeEmailBatch(db,owner,w.id,{groupId:nov.id,emailType:'update'}));
 assert.deepEqual(novBatch.recipients.map((r:any)=>r.to).sort(),['anna@alpha.invalid','ben@beta.invalid','dan@delta.invalid']);assert.deepEqual(novBatch.excluded.map((x:any)=>[x.to,x.reason]),[['cara@gamma.invalid','unsubscribed']]);
 await assert.rejects(run(owner,()=>prepareExchangeEmailBatch(db,owner,w.id,{groupId:nov.id,emailType:'update',exchangeIds:[nC.id]})),/unsubscribed from this series/);
 const reminder=await run(owner,()=>prepareExchangeEmailBatch(db,owner,w.id,{groupId:nov.id,emailType:'access_changed'}));assert.ok(!reminder.recipients.some((r:any)=>r.to==='cara@gamma.invalid'),'every email type of the series');
 const direct=await bypass.transaction(tx=>queueEmail(tx,{workspaceId:w.id,groupId:nov.id,exchangeId:nC.id,emailType:'access_revoked',to:'cara@gamma.invalid',fromName:'Acme Bio at TrialAgents',replyTo:null,subject:'x',text:'x'}));assert.equal(direct.status,'suppressed','and every queue path');
 assert.equal((await pg.query<any>('SELECT diagnostic FROM exchange_emails WHERE id=$1',[direct.id])).rows[0].diagnostic,'unsubscribed');
 await change(owner,{kind:'send_exchange_email',batchId:novBatch.batchId,digest:novBatch.digest});
 await change(owner,{kind:'revoke_exchange',exchangeId:exB.id,reason:'Left the board',notify:false});

 // Acceptance 5. A person's archive lists only the earlier updates of the series sent to their address, newest first.
 const novA=(await api(tok(nA)).get()).body;assert.deepEqual(novA.series.archive.map((u:any)=>[u.title,u.link]),[[UPDATE_TITLE,'/exchange#'+tok(exA)]]);assert.equal(novA.series.name,SERIES.name);
 assert.deepEqual((await api(tok(nD)).get()).body.series.archive,[],'Dan received no October update');
 assert.deepEqual((await api(tok(nB)).get()).body.series.archive,[],'revoking Ben\'s October exchange hides only that update');assert.equal((await api(tok(nB)).get()).status,200);
 assert.deepEqual((await a.get()).body.series.archive,[],'the October page lists nothing earlier');
 assert.deepEqual((await api(tok(nC)).get()).body.series.archive.map((u:any)=>u.title),[UPDATE_TITLE],'Cara received October before she unsubscribed');
 const seriesView=await run(owner,()=>exchangeSeries(db,owner,w.id,{series:SERIES.key}));assert.deepEqual(seriesView.updates.map((u:any)=>u.title),['Acme Bio — November 2026 board update',UPDATE_TITLE]);assert.deepEqual(seriesView.unsubscribes.map((u:any)=>u.email),['cara@gamma.invalid']);

 // Content changes after people saw the update are reviewed; the page shows the new content, sent emails keep theirs.
 const corrected={...content,html:content.html.replace('62 of 100','63 of 100')};
 const correction=await humanOnly({kind:'update_exchange_content',groupId:oct.id,expectedVersion:await groupVersion(oct.id),content:corrected});assert.equal(correction.exchangeReview.seen,true);await confirm(owner,correction);
 assert.ok(words((await a.get()).body.update).includes('63 of 100'));assert.ok((await pg.query<any>('SELECT html FROM exchange_emails WHERE id=$1',[sent.find(m=>m.to[0]==='anna@alpha.invalid').key])).rows[0].html.includes('62 of 100'));

 // Acceptance 6. Assistants draft but cannot send or see links (MCP, app runtime, reviews).
 const tools=new Map<string,any>();addWorkspaceMcp({registerTool:(name:string,config:any,handler:any)=>tools.set(name,{config,handler})} as any,f,ai,(fn:any)=>fn,{});
 for(const name of ['preview_exchange_content','list_exchange_responses','list_exchange_series'])assert.ok(tools.has(name),name);
 const allTokens=[exA,exB,exC,nA,nB,nC,nD].map(tok),imageToken=imageSrc.split('/')[2]!;
 const leaks=(x:any)=>{const j=words(x);return allTokens.some(t=>j.includes(t))||j.includes(imageToken)||/exchange-unsubscribe\/[0-9a-f-]{36}/.test(j);};
 const mcpBatch:any=await run(ai,()=>tools.get('prepare_exchange_email').handler({workspaceId:w.id,groupId:nov.id,emailType:'update'}));assert.ok(!leaks(mcpBatch),'prepared emails reach assistants without links');assert.ok(mcpBatch.recipients[0].text.includes('[personal link]')&&mcpBatch.recipients[0].html.includes('[unsubscribe link]'));
 const mcpReview:any=await run(ai,()=>tools.get('prepare_workspace_change').handler({workspaceId:w.id,operation:{kind:'send_exchange_email',batchId:mcpBatch.batchId,digest:mcpBatch.digest}}));assert.ok(!leaks(mcpReview),'nor do send reviews');
 await assert.rejects(run(aiConfirm,()=>f.confirm(aiConfirm,w.id,mcpReview.id,mcpReview.digest)),/cannot approve/);
 for(const [name,args] of [['list_exchanges',{workspaceId:w.id,series:SERIES.key}],['list_exchange_series',{workspaceId:w.id,series:SERIES.key}],['list_exchange_responses',{workspaceId:w.id,groupId:oct.id}],['preview_exchange_content',{workspaceId:w.id,content}]] as const){const r=await run(ai,()=>tools.get(name).handler(args));assert.ok(!leaks(r),name);}
 const previewed:any=await run(ai,()=>previewExchangeContent(db,ai,w.id,{content}));assert.ok(previewed.emailHtml.includes(`doc:${chart.versionId}`));assert.ok(!/<script/.test(previewed.emailHtml));
 await pg.query('UPDATE workspace_components SET source=$2,version=version+1 WHERE id=$1',[appId,`const r=tools.call('exchange.prepareEmail',{groupId:'${nov.id}',emailType:'update'});const s=tools.call('exchange.series',{series:'${SERIES.key}'});if(input.event.kind==='click')tools.call('exchange.updateContent',{groupId:'${nov.id}',expectedVersion:${await groupVersion(nov.id)},content:{html:'<p>Corrected</p>'}});return {html:'<pre>'+JSON.stringify(r.recipients.map(x=>x.text))+'</pre><p>'+s.updates.length+' updates</p><button data-action="fix">Fix</button>'};`]);
 const asAssistant:any=await run(ai,()=>f.runFrontend(ai,w.id,{componentId:appId,expectedVersion:1}));assert.ok(asAssistant.html.includes('2 updates'));assert.ok(!leaks(asAssistant),'an app run by an assistant gets no links either');
 const asPerson:any=await run(owner,()=>f.runFrontend(owner,w.id,{componentId:appId,expectedVersion:1}));assert.ok(asPerson.html.includes(tok(nA)),'people see the email exactly as sent');
 const staged:any=await run(owner,()=>f.runFrontend(owner,w.id,{componentId:appId,expectedVersion:1,event:{kind:'click',action:'fix',value:null,form:{}}}));assert.equal(staged.proposal.body.kind,'update_exchange_content','seen content changes are reviewed');

 // Workspace notifications, archive stopping images and links, export.
 await dispatchExchangeNotifications(bypass);const notes=(await run(owner,()=>listExchangeNotifications(db,owner,w.id))).notifications;assert.ok(notes.some((n:any)=>n.kind==='ask'&&/Offered help: Introductions to an experienced CMO/.test(n.title)));assert.ok(notes.some((n:any)=>n.kind==='unsubscribed'));
 await change(owner,{kind:'archive_exchange_group',groupId:oct.id,archived:true});assert.equal((await request(app).get(imageSrc)).status,404);assert.equal((await a.get()).status,404);
 assert.deepEqual((await api(tok(nA)).get()).body.series.archive,[],'an archived update leaves the archive');
 await change(owner,{kind:'archive_exchange_group',groupId:oct.id,archived:false});assert.equal((await request(app).get(imageSrc)).status,200);
 const exported:any=await run(owner,()=>s.exportWorkspace(owner,w.id));assert.equal(exported.exchange_ask_responses.length,2);assert.equal(exported.exchange_unsubscribes.length,1);assert.ok(!words(exported.exchange_groups).includes(imageToken));
 for(const action of ['exchange.ask_response','exchange.unsubscribed','exchange.content_updated','exchange.group_created'])assert.ok((await pg.query<any>('SELECT 1 FROM audit_events WHERE workspace_id=$1 AND action=$2',[w.id,action])).rows.length,action);
});
