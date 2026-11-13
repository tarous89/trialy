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
import {AccessGrid} from '../src/domain/access-grid.js';
import {baseApp,errors} from '../src/server/app.js';
import {addExternalExchange} from '../src/server/external-exchange.js';
import {addWorkspaceMcp} from '../src/server/workspace-foundation.js';
import {listExchanges,listExchangeSubmissions,listExchangeMessages,exchangeEmailDefault,prepareExchangeEmailBatch,readExchangeEmails,dispatchExchangeNotifications,listExchangeNotifications,sweepExchangeDeadlines} from '../src/domain/external-exchange.js';
import {deliverExchangeEmails,applyExchangeDeliveryEvents,runScheduledExchangeBatches,displayName,FROM_ADDRESS,platformDefaults} from '../src/app-services/exchange-email.js';
import type {Actor} from '../src/shared/schema.js';

// docs/product/EXTERNAL_EXCHANGE.md §4 acceptance criteria, under the runtime role and row security.
process.env.EXCHANGE_EXPOSE_CODES='true';
test('External exchange: per-recipient links, drafts and deadline, gates, messages, email rules, AI limits, revocation, archive and audit',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());for(const n of (await readdir('migrations')).filter(x=>x.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+n,'utf8'));await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();
 const db:Database={query:async(q,v)=>storage.getStore()?.query(q,v)??db.transaction(tx=>tx.query(q,v)),transaction:async fn=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async raw=>{await raw.exec('SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(q,v)=>{await setDatabaseContext(raw as any);return raw.query(q,v) as any;}};return storage.run(tx,()=>fn(tx));});},close:async()=>{}};
 const bypass:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
 const owner:Actor={userId:randomUUID(),origin:'human'},member:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...owner,origin:'ai'};
 await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[owner.userId,'owner@sponsor.invalid','Alex Owner']);await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[member.userId,'member@sponsor.invalid','Sam Member']);
 const s=new Service(db),f=new WorkspaceFoundation(db),run=<T>(a:Actor,fn:()=>Promise<T>)=>withActor(a,fn);
 const w=await run(owner,()=>s.createWorkspace(owner,'Clinical ops'));await pg.query("UPDATE tenants SET name='Acme Bio' WHERE id=(SELECT tenant_id FROM workspaces WHERE id=$1)",[w.id]);
 const project=randomUUID();await pg.query("INSERT INTO workspace_nodes(id,workspace_id,name,kind) VALUES($1,$2,'Apps','project')",[project,w.id]);
 const save=(a:Actor,op:any)=>run(a,async()=>{const p=await s.preview(a,w.id,op);return s.commit(a,p.id,p.digest);});
 const prepare=(a:Actor,op:any)=>run(a,()=>f.preview(a,w.id,op));
 const change=(a:Actor,op:any):Promise<any>=>run(a,async()=>{const p=await f.preview(a,w.id,op);return f.confirm(a,w.id,p.id,p.digest);});
 const bids=(await save(owner,{kind:'create_type',name:'Bids',fields:[{key:'name',name:'Supplier',kind:'text',required:true,ai:true},{key:'price',name:'Price',kind:'number',ai:true},{key:'notes',name:'Notes',kind:'text',ai:true}]})).objects[0].id as string;
 const recordA=(await save(owner,{kind:'create_record',typeId:bids,data:{name:'Alpha CRO'}})).objects[0],recordB=(await save(owner,{kind:'create_record',typeId:bids,data:{name:'Beta CRO'}})).objects[0];
 const document=async(filename:string,mime:string,text:string,aiReadable=false)=>run(owner,async()=>{const p=await s.previewFile(owner,w.id,{filename,mime,bytes:Buffer.from(text),ai:aiReadable});return (await s.commit(owner,p.id,p.digest)).objects[0].versionId as string;});
 const rfpDoc=await document('RFP pack.pdf','application/pdf','%PDF-1.4 request for proposal'),cdaDoc=await document('CDA.pdf','application/pdf','%PDF-1.4 confidentiality agreement');
 const appId=randomUUID();await pg.query("INSERT INTO workspace_components(id,workspace_id,project_id,name,format,source,bindings,source_access,created_by) VALUES($1,$2,$3,'CRO Bids','frontend-js',$4,$5,'bindings',$6)",[appId,w.id,project,"const r=tools.call('exchange.list',{});return {html:'<p>'+r.groups.length+' groups</p>'};",JSON.stringify([{typeId:bids,fields:['name','price','notes']}]),owner.userId]);
 const app=baseApp();addExternalExchange(app,new Service(db));app.use(errors);
 const api=(token:string,session='')=>({get:(path='')=>request(app).get('/external-exchange'+path).set('x-trialy-exchange',token).set(session?{'x-trialy-exchange-session':session}:{}),post:(path:string,body:any)=>request(app).post('/external-exchange'+path).set('x-trialy-exchange',token).set(session?{'x-trialy-exchange-session':session}:{}).send(body),del:(path:string)=>request(app).delete('/external-exchange'+path).set('x-trialy-exchange',token).set(session?{'x-trialy-exchange-session':session}:{})});
 const audits=async(action:string):Promise<any[]>=>(await pg.query('SELECT * FROM audit_events WHERE workspace_id=$1 AND action=$2',[w.id,action])).rows;
 const sent:any[]=[];const transport=async(payload:any,key:string)=>{sent.push({...payload,key});return {id:'provider-'+key.slice(0,8)};};
 const deliverAll=async()=>{while(await deliverExchangeEmails(bypass,transport));};

 // 1. Two recipients in one group get different links bound to their own records.
 const groupPreview=await prepare(owner,{kind:'create_exchange_group',config:{appId,title:'RFP: Phase II monitoring',summary:'Please quote monitoring services.',dates:[{label:'Bid defence',date:'2026-12-15'}],typeId:bids,fields:['name','price','notes'],documents:[rfpDoc],slots:[]}});
 assert.equal(groupPreview.exchangeReview.group.gate,'acknowledgement');assert.equal(groupPreview.exchangeReview.group.verifyEmail,true);
 const group=(await run(owner,()=>f.confirm(owner,w.id,groupPreview.id,groupPreview.digest))).group;assert.equal(group.senderCompany,'Acme Bio');
 const invitePreview=await prepare(ai,{kind:'invite_exchange',groupId:group.id,recipients:[{emails:['anna@alpha.invalid'],name:'Anna',company:'Alpha CRO',recordId:recordA.id},{emails:['ben@beta.invalid'],name:'Ben',company:'Beta CRO',recordId:recordB.id}],days:30});
 const invited=(await run(owner,()=>f.confirm(owner,w.id,invitePreview.id,invitePreview.digest))).exchanges;assert.equal(invited.length,2);
 const [exA,exB]=invited,tokenA=exA.url.split('#')[1],tokenB=exB.url.split('#')[1];assert.notEqual(tokenA,tokenB);assert.match(exA.url,/\/exchange#[A-Za-z0-9_-]{43}$/);
 assert.equal((await audits('exchange.invited')).length,2);
 assert.equal((await api(randomUUID().replace(/-/g,'')+'abcdefghijk').get()).status,404);

 // 2. Email verification is on because documents are shared; a wrong address is refused; the code opens a session.
 const gateA=await api(tokenA).get();assert.equal(gateA.status,200,gateA.text);assert.equal(gateA.body.verification.required,true);assert.equal(gateA.body.documents,undefined);
 assert.equal((await api(tokenA).post('/verify',{email:'stranger@elsewhere.invalid'})).status,400);
 const codeA=await api(tokenA).post('/verify',{email:'anna@alpha.invalid'});assert.equal(codeA.status,200,codeA.text);
 assert.equal((await api(tokenA).post('/verify/confirm',{verificationId:codeA.body.verificationId,code:codeA.body.code==='000000'?'000001':'000000'})).status,400);
 const sessionA=(await api(tokenA).post('/verify/confirm',{verificationId:codeA.body.verificationId,code:codeA.body.code})).body.session;assert.ok(sessionA);
 const a=api(tokenA,sessionA);const pageA:any=await a.get();assert.equal(pageA.status,200,pageA.text);assert.equal(pageA.body.title,'RFP: Phase II monitoring');assert.equal(pageA.body.sender.company,'Acme Bio');assert.equal(pageA.body.documents[0].locked,true);assert.equal(pageA.body.recipient.email,'anna@alpha.invalid');
 assert.ok(!JSON.stringify(pageA.body).includes('ben@beta.invalid'),'other recipients stay invisible');

 // 3. Click-through acknowledgement gates documents; each download is logged.
 assert.equal((await a.get('/documents/'+rfpDoc)).status,403);
 assert.equal((await a.post('/acknowledge',{name:'Anna Example',email:'anna@alpha.invalid'})).status,200);
 const download=await a.get('/documents/'+rfpDoc).buffer(true).parse((res,cb)=>{const chunks:Buffer[]=[];res.on('data',c=>chunks.push(c));res.on('end',()=>cb(null,Buffer.concat(chunks)));});assert.equal(download.status,200);assert.equal(download.body.toString(),'%PDF-1.4 request for proposal');
 assert.equal((await audits('exchange.acknowledged'))[0].after_value.name,'Anna Example');assert.equal((await audits('exchange.downloaded')).length,1);
 const statusA=(await run(owner,()=>listExchanges(db,owner,w.id,{groupId:group.id}))).groups[0]!.exchanges.find((e:any)=>e.id===exA.id)!.status;assert.ok(statusA.opened);assert.ok(statusA.acknowledged);assert.equal(statusA.downloads.length,1);assert.equal(statusA.state,'opened');

 // 4. Drafts, files (10 × 25 MB) and versioned resubmission until the deadline; lockout afterwards.
 assert.equal((await a.post('/draft',{data:{name:'Alpha CRO',price:120000,secret:'x'}})).status,400);
 assert.equal((await a.post('/draft',{data:{name:'Alpha CRO',price:120000}})).status,200);
 const file=(text:string,filename='bid.txt')=>({filename,mime:'text/plain',base64:Buffer.from(text).toString('base64')});
 assert.equal((await a.post('/files',{...file(''),base64:''})).status,413);
 const upload=await a.post('/files',file('Alpha bid v1'));assert.equal(upload.status,200,upload.text);
 const draftPage=await a.get();assert.equal(draftPage.body.draft.data.price,120000);assert.equal(draftPage.body.draft.files.length,1);
 const nonce=randomUUID();const v1=await a.post('/submit',{nonce,confirmed:true,data:{name:'Alpha CRO',price:120000}});assert.equal(v1.status,200,v1.text);assert.equal(v1.body.version,1);
 assert.equal((await a.post('/submit',{nonce,confirmed:true,data:{name:'Alpha CRO',price:120000}})).body.id,v1.body.id);
 assert.equal((await a.post('/submit',{nonce,confirmed:true,data:{name:'Alpha CRO',price:1}})).status,409);
 assert.equal((await a.post('/submit',{nonce:randomUUID(),confirmed:true,data:{price:5}})).status,400,'required question');
 const v2=await a.post('/submit',{nonce:randomUUID(),confirmed:true,data:{name:'Alpha CRO',price:118000,notes:'Revised'}});assert.equal(v2.body.version,2);
 assert.equal(Number((await pg.query<any>('SELECT count(*) AS n FROM exchange_submissions WHERE exchange_id=$1',[exA.id])).rows[0].n),2);assert.equal((await pg.query<any>('SELECT submission_id FROM exchange_files WHERE id=$1',[upload.body.id])).rows[0]!.submission_id,v1.body.id);
 await assert.rejects(pg.query('DELETE FROM exchange_submissions'));
 const b0=api(tokenB);const codeB=await b0.post('/verify',{email:'ben@beta.invalid'});const sessionB=(await b0.post('/verify/confirm',{verificationId:codeB.body.verificationId,code:codeB.body.code})).body.session;const b=api(tokenB,sessionB);
 assert.equal((await b.post('/acknowledge',{name:'Ben Example',email:'ben@beta.invalid'})).status,200);
 const vB=await b.post('/submit',{nonce:randomUUID(),confirmed:true,data:{name:'Beta CRO',price:99000}});assert.equal(vB.status,200,vB.text);
 await pg.query("UPDATE exchanges SET expires_at=now()-interval '1 minute' WHERE id=$1",[exA.id]);
 const closedPage=await a.get();assert.equal(closedPage.status,200);assert.equal(closedPage.body.closed,true);assert.equal(closedPage.body.submissions.length,2);
 assert.equal((await a.post('/draft',{data:{name:'Late'}})).status,403);assert.equal((await a.post('/submit',{nonce:randomUUID(),confirmed:true,data:{name:'Late'}})).status,403);assert.equal((await a.post('/files',file('late'))).status,403);
 assert.equal((await a.post('/messages',{body:'Can we still ask?'})).status,200,'messages stay open after the deadline by default');
 const extendPreview=await prepare(owner,{kind:'extend_exchange',exchangeId:exA.id,days:10,notify:false});assert.equal(extendPreview.exchangeReview.email,null);await run(owner,()=>f.confirm(owner,w.id,extendPreview.id,extendPreview.digest));
 assert.equal((await a.get()).body.closed,false);assert.equal((await a.post('/draft',{data:{name:'Alpha CRO'}})).status,200);

 // 5. Submissions land on the right invitation records; AI reads accepted submissions only.
 const human=await run(owner,()=>listExchangeSubmissions(db,owner,w.id,{groupId:group.id}));assert.equal(human.submissions.length,3);assert.equal(human.submissions.find((x:any)=>x.id===vB.body.id)!.boundRecordId,recordB.id);
 const aiView=await run(ai,()=>listExchangeSubmissions(db,ai,w.id,{groupId:group.id}));assert.ok(aiView.submissions.every((x:any)=>x.data===null&&!x.accepted));assert.ok(!JSON.stringify(aiView).includes('Alpha bid v1'));
 const acceptA=await prepare(owner,{kind:'accept_exchange_submission',submissionId:v2.body.id,data:{name:'Alpha CRO',price:118000,notes:'Revised'},target:'bound'});assert.equal(acceptA.exchangeReview.target.recordId,recordA.id);
 await assert.rejects(run(ai,()=>f.confirm({...ai,actionConfirmed:true},w.id,acceptA.id,acceptA.digest)),/cannot approve/);
 const acceptedA=await run(owner,()=>f.confirm(owner,w.id,acceptA.id,acceptA.digest));assert.equal(acceptedA.recordId,recordA.id);
 assert.equal((await run(owner,()=>f.record(db,owner,w.id,recordA.id))).data.price,118000);
 const acceptB=await change(owner,{kind:'accept_exchange_submission',submissionId:vB.body.id,data:{name:'Beta CRO',price:99000},target:'new'});assert.notEqual(acceptB.recordId,recordB.id);
 assert.equal((await run(owner,()=>s.records(owner,w.id,bids))).total,3);
 await assert.rejects(prepare(owner,{kind:'accept_exchange_submission',submissionId:v2.body.id,data:{name:'Alpha CRO'}}),/already accepted/);
 assert.equal((await run(ai,()=>listExchangeSubmissions(db,ai,w.id,{exchangeId:exA.id}))).submissions.find((x:any)=>x.id===v2.body.id)!.data.price,118000);
 assert.equal((await audits('exchange.accepted')).length,2);

 // 6. Signed document required: other documents unlock only after the owner accepts the signed upload; unaccepted uploads stay out of AI reach.
 const signedGroup=(await change(owner,{kind:'create_exchange_group',config:{appId,title:'CDA first',typeId:bids,fields:['name','price','notes'],documents:[cdaDoc,rfpDoc],gateDocument:cdaDoc,gate:'signed_document',gateSlot:'signed_cda',slots:[{key:'signed_cda',label:'Signed CDA',required:true}],verifyEmail:false}})).group;
 const exC=(await change(owner,{kind:'invite_exchange',groupId:signedGroup.id,recipients:[{emails:['cara@gamma.invalid'],name:'Cara',company:'Gamma CRO'}],days:14})).exchanges[0],c=api(exC.url.split('#')[1]);
 const pageC=await c.get();assert.equal(pageC.status,200,pageC.text);assert.equal(pageC.body.verification.required,false);assert.deepEqual(pageC.body.documents.map((d:any)=>[d.filename,d.locked]),[['CDA.pdf',false],['RFP pack.pdf',true]]);assert.equal(pageC.body.slots[0].status,'requested');
 assert.equal((await c.get('/documents/'+rfpDoc)).status,403);assert.equal((await c.get('/documents/'+cdaDoc)).status,200);
 assert.equal((await c.post('/files',{...file('signed','CDA signed.pdf'),slot:'missing'})).status,404);
 const signed=await c.post('/files',{...file('signed by Cara','CDA signed.pdf'),slot:'signed_cda'});assert.equal(signed.status,200,signed.text);assert.equal((await c.get()).body.slots[0].status,'received');assert.equal((await c.get('/documents/'+rfpDoc)).status,403);
 assert.equal((await run(ai,()=>s.documents(ai,w.id))).length,0,'unaccepted upload is not a document');
 const acceptFile=await prepare(owner,{kind:'accept_exchange_file',fileId:signed.body.id,ai:false});await assert.rejects(run(ai,()=>f.confirm({...ai,actionConfirmed:true},w.id,acceptFile.id,acceptFile.digest)),/cannot approve/);
 const accepted=await run(owner,()=>f.confirm(owner,w.id,acceptFile.id,acceptFile.digest));assert.ok(accepted.versionId);
 assert.equal((await run(owner,()=>s.original(owner,w.id,accepted.versionId))).bytes.toString(),'signed by Cara');assert.equal((await run(ai,()=>s.documents(ai,w.id))).length,0,'accepted without AI access stays hidden from AI');
 assert.equal((await c.get()).body.slots[0].status,'accepted');assert.equal((await c.get('/documents/'+rfpDoc)).status,200);
 const statusC=(await run(owner,()=>listExchanges(db,owner,w.id,{groupId:signedGroup.id}))).groups[0]!.exchanges[0]!.status;assert.equal(statusC.documentsBack[0].status,'accepted');

 // 7. Private replies stay private; published clarifications reach every recipient anonymised and by email.
 const askedA=await a.post('/messages',{body:'Is a 20% pass-through acceptable?'});assert.equal(askedA.status,200);
 assert.ok(!(await b.get('/messages')).body.messages.some((m:any)=>m.body.includes('pass-through')));
 const owned:any=await run(owner,()=>listExchangeMessages(db,owner,w.id,{groupId:group.id,markRead:true}));assert.ok(owned.messages.some((m:any)=>m.id===askedA.body.id&&m.recipientName==='Anna'));
 const replyPreview=await prepare(owner,{kind:'reply_exchange',exchangeId:exA.id,body:'Yes, within the stated assumptions.'});assert.equal(replyPreview.exchangeReview.email.to[0],'anna@alpha.invalid');
 await assert.rejects(run(ai,()=>f.confirm({...ai,actionConfirmed:true},w.id,replyPreview.id,replyPreview.digest)),/cannot approve/);await run(owner,()=>f.confirm(owner,w.id,replyPreview.id,replyPreview.digest));
 assert.ok((await a.get('/messages')).body.messages.some((m:any)=>m.body.includes('within the stated')));assert.ok(!(await b.get('/messages')).body.messages.some((m:any)=>m.body.includes('within the stated')));
 const clarification=await change(owner,{kind:'publish_exchange_clarification',groupId:group.id,question:'Is a 20% pass-through acceptable?',body:'Pass-through costs up to 20% are acceptable for all bidders.',sourceMessageId:askedA.body.id});
 for(const page of [a,b]){const m=(await page.get('/messages')).body.messages.find((x:any)=>x.kind==='clarification');assert.equal(m.question,'A recipient asked: Is a 20% pass-through acceptable?');assert.ok(!JSON.stringify(m).match(/Anna|anna@/));}
 assert.deepEqual(clarification.emails.map((e:any)=>e.status),['queued','queued']);
 await deliverAll();const clarificationMails=sent.filter(m=>m.subject.startsWith('Clarification published'));assert.equal(clarificationMails.length,2);assert.deepEqual(clarificationMails.map(m=>m.to[0]).sort(),['anna@alpha.invalid','ben@beta.invalid']);
 assert.ok(sent.every(m=>m.from.endsWith(` <${FROM_ADDRESS}>`)));assert.ok(clarificationMails.every(m=>m.text.includes('/exchange#')&&m.text.includes('Report abuse')));assert.ok(!/Anna|anna@/.test(clarificationMails.find(m=>m.to[0]==='ben@beta.invalid')!.text),'the asker is never named');

 // 8. Outbound email: defaults with placeholders, workspace defaults replace app defaults, display name rules, batch edit and personalisation shown exactly as sent, human confirmation, bounce handling, limits.
 assert.equal((await run(owner,()=>exchangeEmailDefault(db,owner,w.id,{groupId:group.id,emailType:'invitation'}))).source,'platform');
 await change(owner,{kind:'save_exchange_email_default',emailType:'invitation',text:{subject:'{title}: your quote by {deadline}',body:'Hello {recipient_name} at {recipient_company},\n\n{sender_name} ({sender_company}) invites you to quote.\n\n{link}'}});
 const resolved=await run(owner,()=>exchangeEmailDefault(db,owner,w.id,{groupId:group.id,emailType:'invitation'}));assert.equal(resolved.source,'workspace');assert.equal(resolved.subject,'{title}: your quote by {deadline}');
 assert.equal(displayName('Acme Bio Clinical Ops at TrialAgents'),'Acme Bio Clinical Ops at TrialAgents');assert.equal(displayName('Acme <Bio>'),'Acme Bio at TrialAgents');assert.throws(()=>displayName('   '));
 await assert.rejects(run(ai,()=>prepareExchangeEmailBatch(db,ai,w.id,{groupId:group.id,emailType:'invitation',exchangeIds:[exC.id]})),/Choose recipients of this exchange group/);
 const batch=await run(ai,()=>prepareExchangeEmailBatch(db,ai,w.id,{groupId:group.id,emailType:'invitation',nameKind:'person',body:'Hello {recipient_name},\n\nWe would value a quote from {recipient_company} for {title}. Please respond by {deadline}.',overrides:{[exB.id]:{body:'Dear Ben,\n\nAs discussed on the phone, please add the biostatistics option.\n{link}'}}}));
 assert.equal(batch.displayName,'Alex at TrialAgents');assert.equal(batch.from,`Alex at TrialAgents <${FROM_ADDRESS}>`);assert.equal(batch.replyTo,'owner@sponsor.invalid');assert.equal(batch.recipients.length,2);
 const mailA=batch.recipients.find((r:any)=>r.exchangeId===exA.id)!,mailB=batch.recipients.find((r:any)=>r.exchangeId===exB.id)!;
 assert.equal(mailA.subject,'RFP: Phase II monitoring: your quote by '+mailA.subject.split(' by ')[1]);assert.ok(mailA.text.startsWith('Hello Anna,\n\nWe would value a quote from Alpha CRO'));assert.ok(mailA.text.includes('Your page: '+exA.url),'link appended when the body has no {link}');assert.ok(mailA.text.includes('Replies go to owner@sponsor.invalid'));
 assert.ok(mailB.personalised&&mailB.text.includes('biostatistics option')&&mailB.text.includes(exB.url)&&!mailB.text.includes('Your page: '));
 const sendPreview=await prepare(ai,{kind:'send_exchange_email',batchId:batch.batchId,digest:batch.digest});assert.deepEqual(sendPreview.exchangeReview.emails.map((e:any)=>e.text),[mailA.text,mailB.text]);
 await assert.rejects(run(ai,()=>f.confirm({...ai,actionConfirmed:true},w.id,sendPreview.id,sendPreview.digest)),/cannot approve/);
 await assert.rejects(prepare(owner,{kind:'send_exchange_email',batchId:batch.batchId,digest:'0'.repeat(64)}),/Prepare the email again/);
 const sendResult=await run(owner,()=>f.confirm(owner,w.id,sendPreview.id,sendPreview.digest));assert.equal(sendResult.queued.length,2);
 await assert.rejects(prepare(owner,{kind:'send_exchange_email',batchId:batch.batchId,digest:batch.digest}),/already confirmed/);
 sent.length=0;await deliverAll();assert.equal(sent.length,2);const deliveredA=sent.find(m=>m.to[0]==='anna@alpha.invalid');assert.equal(deliveredA.from,`Alex at TrialAgents <${FROM_ADDRESS}>`);assert.equal(deliveredA.reply_to,'owner@sponsor.invalid');assert.equal(deliveredA.subject,mailA.subject);assert.equal(deliveredA.text,mailA.text);assert.equal(sent.find(m=>m.to[0]==='ben@beta.invalid').text,mailB.text);
 assert.ok(!JSON.stringify(sent).includes('attachments')&&!JSON.stringify(sent).match(/<img|pixel/i));
 assert.equal((await run(owner,()=>prepareExchangeEmailBatch(db,owner,w.id,{groupId:group.id,emailType:'reminder',exchangeIds:[exA.id]}))).nameKind,'person','last display-name choice is remembered per user and workspace');
 const emailsA=(await run(owner,()=>readExchangeEmails(db,owner,w.id,{exchangeId:exA.id}))).emails;assert.ok(emailsA.some((e:any)=>e.emailType==='invitation'&&e.status==='sent'&&e.from==='Alex at TrialAgents'));
 const providerB=(await pg.query<any>("SELECT provider_id FROM exchange_emails WHERE to_email='ben@beta.invalid' AND email_type='invitation'")).rows[0].provider_id;
 await pg.query('SELECT trialy_security.ingest_notification_event($1,$2,$3,$4::jsonb)',['evt-1',providerB,'email.bounced',JSON.stringify(['ben@beta.invalid'])]);await applyExchangeDeliveryEvents(bypass);
 assert.equal((await pg.query<any>("SELECT status FROM exchange_emails WHERE provider_id=$1",[providerB])).rows[0].status,'bounced');assert.equal(Number((await pg.query<any>("SELECT count(*) AS n FROM notification_suppressions WHERE email='ben@beta.invalid'")).rows[0].n),1);
 const afterBounce=await change(owner,{kind:'extend_exchange',exchangeId:exB.id,days:5,notify:true});sent.length=0;await deliverAll();assert.equal(sent.length,0,'suppressed recipients are not emailed');assert.equal((await pg.query<any>('SELECT status FROM exchange_emails WHERE id=$1',[afterBounce.emails[0].id])).rows[0].status,'suppressed');
 assert.equal((await audits('exchange.email_sent')).length,2);
 process.env.EXCHANGE_EMAIL_DAILY_LIMIT='1';await assert.rejects(change(owner,{kind:'reply_exchange',exchangeId:exA.id,body:'Over the limit',notify:true}),/per day/);delete process.env.EXCHANGE_EMAIL_DAILY_LIMIT;
 const reminder=await run(owner,()=>prepareExchangeEmailBatch(db,owner,w.id,{groupId:group.id,emailType:'reminder',exchangeIds:[exA.id],scheduleAt:new Date(Date.now()+1500).toISOString()}));const reminderPreview=await prepare(owner,{kind:'send_exchange_email',batchId:reminder.batchId,digest:reminder.digest});assert.match(reminderPreview.exchangeReview.effect,/scheduled time/);
 assert.equal((await run(owner,()=>f.confirm(owner,w.id,reminderPreview.id,reminderPreview.digest))).scheduledAt!==null,true);
 assert.equal(await runScheduledExchangeBatches(bypass),0);await new Promise(r=>setTimeout(r,1700));assert.equal(await runScheduledExchangeBatches(bypass),1);
 sent.length=0;await deliverAll();assert.equal(sent.length,1);assert.equal(sent[0].text,reminder.recipients[0].text);assert.equal((await audits('exchange.reminder_sent')).length,1);

 // 9. Access right: members need "Send to people outside the workspace"; owners grant it in the Access grid.
 await run(owner,()=>s.share(owner,w.id,member.userId,'editor',[],null,true));
 await assert.rejects(prepare(member,{kind:'invite_exchange',groupId:group.id,recipients:[{emails:['dan@delta.invalid']}],days:7}),/not granted/);
 const grid=new AccessGrid(db);const before=await run(owner,()=>grid.read(owner,w.id,member.userId));const right=before.rows.find((r:any)=>r.kind==='external_send');assert.equal(right.read,false);assert.equal(right.canChange,true);
 await run(owner,()=>grid.save(owner,w.id,{expectedVersion:before.version,changes:[{subject:member.userId,kind:'external_send',resourceId:w.id,read:true,write:true}]}));
 assert.equal((await run(owner,()=>grid.read(owner,w.id,member.userId))).rows.find((r:any)=>r.kind==='external_send').read,true);assert.equal((await run(owner,()=>grid.read(owner,w.id,owner.userId))).rows.find((r:any)=>r.kind==='external_send').read,true);
 assert.ok((await prepare(member,{kind:'invite_exchange',groupId:group.id,recipients:[{emails:['dan@delta.invalid']}],days:7})).id);
 await run(owner,async()=>grid.save(owner,w.id,{expectedVersion:(await grid.read(owner,w.id,member.userId)).version,changes:[{subject:member.userId,kind:'external_send',resourceId:w.id,read:false,write:false}]}));
 await assert.rejects(prepare(member,{kind:'invite_exchange',groupId:group.id,recipients:[{emails:['dan@delta.invalid']}],days:7}),/not granted/);

 // 10. Workspace notifications (in-app and email) for submissions, messages, uploaded documents and passed deadlines.
 await pg.query("UPDATE exchanges SET expires_at=now()-interval '1 minute' WHERE id=$1",[exC.id]);assert.equal(await sweepExchangeDeadlines(bypass),1);
 assert.ok(await dispatchExchangeNotifications(bypass)>0);assert.equal(await dispatchExchangeNotifications(bypass),0,'each event notifies once');
 const notes=await run(owner,()=>listExchangeNotifications(db,owner,w.id));assert.ok(['submission','message','document','deadline'].every(k=>notes.notifications.some((n:any)=>n.kind===k)));
 assert.ok((await pg.query("SELECT 1 FROM exchange_emails WHERE email_type='workspace_notification' AND to_email='owner@sponsor.invalid'")).rows.length>0);assert.ok(!(await pg.query("SELECT 1 FROM exchange_emails WHERE email_type='workspace_notification' AND to_email NOT LIKE '%@sponsor.invalid'")).rows.length,'only registered members are notified');

 // 11. App runtime and MCP interface.
 const rendered:any=await run(owner,()=>f.runFrontend(owner,w.id,{componentId:appId,expectedVersion:0}));assert.ok(rendered.html.includes('2 groups'),rendered.html);
 await pg.query("UPDATE workspace_components SET source=$2,version=version+1 WHERE id=$1",[appId,"if(input.event.kind==='click'){tools.call('exchange.reply',{exchangeId:'"+exA.id+"',body:'From the app',notify:false});}return {html:'<button data-action=\"reply\">Reply</button>'};"]);
 const staged:any=await run(owner,()=>f.runFrontend(owner,w.id,{componentId:appId,expectedVersion:1,event:{kind:'click',action:'reply',value:null,form:{}}}));assert.equal(staged.proposal.body.kind,'reply_exchange');assert.equal(staged.proposal.exchangeReview.exchangeId,exA.id);
 await run(owner,()=>f.confirm(owner,w.id,staged.proposal.id,staged.proposal.digest));assert.ok((await a.get('/messages')).body.messages.some((m:any)=>m.body==='From the app'));
 const tools=new Map<string,any>();addWorkspaceMcp({registerTool:(name:string,config:any,handler:any)=>tools.set(name,{config,handler})} as any,f,ai,(fn:any)=>fn,{});
 for(const name of ['list_exchanges','list_exchange_submissions','list_exchange_messages','read_exchange_email_default','prepare_exchange_email','list_exchange_emails','list_exchange_notifications'])assert.ok(tools.has(name),name);
 const mcpList:any=await run(ai,()=>tools.get('list_exchanges').handler({workspaceId:w.id,appId}));assert.equal(mcpList.groups.length,2);assert.ok(!JSON.stringify(mcpList).includes(tokenA),'assistants never see links');

 // 12. Revocation stops access immediately and keeps everything received; archiving the app stops links until it is restored (only unexpired ones work again).
 await change(owner,{kind:'revoke_exchange',exchangeId:exA.id,reason:'Supplier withdrew',notify:false});
 assert.equal((await a.get()).status,404);assert.equal(Number((await pg.query<any>('SELECT count(*) AS n FROM exchange_submissions WHERE exchange_id=$1',[exA.id])).rows[0].n),2);assert.equal(Number((await pg.query<any>('SELECT count(*) AS n FROM exchange_files WHERE exchange_id=$1',[exA.id])).rows[0].n),1);
 assert.ok((await run(owner,()=>listExchangeSubmissions(db,owner,w.id,{exchangeId:exA.id}))).submissions.length===2);assert.equal((await audits('exchange.revoked')).length,1);
 await assert.rejects(prepare(owner,{kind:'extend_exchange',exchangeId:exA.id,days:3}),/revoked/);
 assert.equal((await b.get()).status,200);
 const componentVersion=async()=>(await pg.query<any>('SELECT version FROM workspace_components WHERE id=$1',[appId])).rows[0].version;
 await change(owner,{kind:'archive_component',componentId:appId,expectedVersion:await componentVersion(),archived:true});assert.equal((await b.get()).status,404);assert.equal((await c.get()).status,404);
 await assert.rejects(prepare(owner,{kind:'invite_exchange',groupId:group.id,recipients:[{emails:['x@y.invalid']}],days:7}),/Restore the app/);
 await change(owner,{kind:'archive_component',componentId:appId,expectedVersion:await componentVersion(),archived:false});assert.equal((await b.get()).status,200);const restoredC=await c.get();assert.equal(restoredC.status,200);assert.equal(restoredC.body.closed,true,'expired exchanges stay closed after restore');

 // 13. Audit log covers invitations, sends, opens, acknowledgements, downloads, submissions, messages, clarifications, acceptances and revocations.
 const actions=new Set((await pg.query('SELECT DISTINCT action FROM audit_events WHERE workspace_id=$1',[w.id])).rows.map((r:any)=>r.action));
 for(const action of ['exchange.group_created','exchange.invited','exchange.email_sent','exchange.opened','exchange.verified','exchange.acknowledged','exchange.downloaded','exchange.submitted','exchange.message','exchange.clarification','exchange.accepted','exchange.file_accepted','exchange.revoked','exchange.extended','exchange.reminder_sent'])assert.ok(actions.has(action),action);
 assert.equal(platformDefaults.invitation.body.includes('{link}'),true);
 const exported:any=await run(owner,()=>s.exportWorkspace(owner,w.id));assert.equal(exported.exchanges.length,3);assert.ok(exported.exchanges.every((e:any)=>!('link_token' in e)&&!('token_hash' in e)));assert.equal(exported.exchange_files.length,2);assert.ok(exported.exchange_files.every((f:any)=>typeof f.base64==='string'&&!f.bytes));assert.equal(exported.exchange_submissions.length,3);
});
