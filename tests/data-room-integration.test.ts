import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {dataRoomSuite,text} from './fixtures/data-room.js';
import {prepareExchangeEmailBatch,listExchanges} from '../src/domain/external-exchange.js';
import {roleTables,tableCompatible,readerAccepts,contractRegistry} from '../src/workspace/role-contracts.js';

/* DATA_ROOM.md §13 through the real installer, app runtime, workspace review, platform exchange in room mode (EXTERNAL_EXCHANGE.md §5),
 * party pages under the runtime role, platform tracking and email delivery. Fictional data only; disposable databases. */
const unesc=(s:string)=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
const mails=(sent:any[],re:RegExp)=>sent.filter((m:any)=>re.test(m.subject));
const b64=(s:string)=>Buffer.from(s).toString('base64');

async function setUp(x:any,name:string,org='Northwind Bio (fictional)'){
 const w=(await x.s.createWorkspace(x.actor,name)).id;await x.pg.query("UPDATE tenants SET name=$2 WHERE id=(SELECT tenant_id FROM workspaces WHERE id=$1)",[w,org]);return w;}
/* A room built through the app: new room → levels and sections → checklist items (three reviews). */
async function newRoom(x:any,ui:any,map:any,form:any){
 await ui.open({section:'rooms'});await ui.click('panel:newroom');await ui.submit('create-room',form);await ui.approve();
 const room=(await x.rows(map['dataroom.rooms'].typeId)).find((r:any)=>r.data.name===form.name);
 await ui.open({section:'rooms',roomId:room.id});await ui.click('setup-structure:'+room.id);await ui.approve();await ui.click('setup-items:'+room.id);await ui.approve();
 const levels=(await x.rows(map['dataroom.levels'].typeId)).filter((l:any)=>l.data.room_id===room.id).sort((a:any,b:any)=>a.data.order-b.data.order);
 const items=async()=>(await x.rows(map['dataroom.items'].typeId)).filter((i:any)=>i.data.room_id===room.id);
 return {room,levels,items};}
async function attach(ui:any,item:any,versionId:string,levelId:string,extra:any={}){await ui.click('panel:attach:'+item.id);await ui.submit('save-attach',{version_id:versionId,level_id:levelId,ready:'on',...extra});await ui.approve();}

test('Acceptance 1, 4, 6, 8: financing room end to end — template, gaps, two levels, three investors in one confirmed send, views tracked, versions and digest, assistants draft only',async()=>{
 const x=await dataRoomSuite();const {f,actor,ai,T}=x;
 try{
  const w=await setUp(x,'Northwind Bio');const {receipt}=await x.install(w,T.room,'Data Room');const id=receipt.appId,map=x.mapOf(await x.comp(w,id)),tid=(r:string)=>map[r].typeId;
  assert.equal(Object.keys(map).length,13);const ui=x.app(w,id);
  const inv:any={};for(const [k,org,person,mail] of [['alder','Alder Peak Capital (fictional)','Ana Fictus','ana@alder.invalid'],['birch','Birchway Ventures (fictional)','Ben Example','ben@birch.invalid'],['dune','Duneport Health Fund (fictional)','Dev Placeholder','dev@dune.invalid']]){const o=await x.save(w,tid('organizations'),{name:org,org_type:'investor',archived:false});inv[k]={org:o,person:await x.save(w,tid('people'),{name:person,organization_id:o,email:mail,archived:false}),mail};}
  // 1. Template → readiness gaps.
  const {room,levels,items}=await newRoom(x,ui,map,{name:'Series B data room',purpose:'financing',template_id:'builtin:financing',cda_option:'none',round_id:'Series B 2026'});
  assert.deepEqual(levels.map((l:any)=>[l.data.name,l.data.entry]),[['Non-confidential','none'],['Confidential','click_through']]);
  await ui.open({section:'index',roomId:room.id});assert.match(text(ui.html),/Readiness 0% 0 of 1[5-9] required items ready/,text(ui.html).slice(0,1500));assert.match(text(ui.html),/Missing required items: Company teaser or one-pager; Presentation deck/);
  // 2. Documents at two levels: the deck (Non-confidential, view-only) and the financial statements (Confidential).
  const deck=await x.doc(w,'Investor presentation.pdf','%PDF deck v1'),fin=await x.doc(w,'Financial statements FY2025.pdf','%PDF financial statements'),all=await items();
  await attach(ui,all.find((i:any)=>i.data.title==='Presentation deck'),deck,levels[0].id,{view_only:'on'});await attach(ui,all.find((i:any)=>i.data.title==='Financial statements'),fin,levels[1].id);
  await ui.open({section:'index',roomId:room.id});assert.match(text(ui.html),/2 of 1[5-9] required items ready/);
  // 3. Live: the room page is created on the person's click (nothing sent); the status change is one review.
  await ui.open({section:'rooms',roomId:room.id});await ui.click('panel:live');await ui.submit('go-live',{});assert.match(ui.state().notice,/The room is live/);await ui.approve();
  const g0=await x.room(w,'room:'+room.id);assert.equal(g0.kind,'room');assert.deepEqual(g0.documents.map((d:any)=>[d.filename,d.viewOnly]),[['Investor presentation.pdf',true],['Financial statements FY2025.pdf',false]]);
  assert.deepEqual((await x.pg.query<any>('SELECT role,type_id FROM exchange_tracked_tables WHERE group_id=$1 ORDER BY role',[g0.id])).rows.map((r:any)=>[r.role,r.type_id]),[['access',tid('dataroom.access_grants')],['engagement',tid('dataroom.engagement')]]);
  // 4. Three investors: parties are records; access and the invitation follow.
  for(const k of ['alder','birch','dune']){await ui.open({section:'parties',roomId:room.id});await ui.click('panel:party-new');await ui.submit('save-party',{organization_id:inv[k].org,person_id:inv[k].person,email:inv[k].mail,days:'180',['l_'+levels[0].id]:'on'});await ui.approve();}
  const grants=await x.rows(tid('dataroom.access_grants'));assert.equal(grants.length,3);assert.ok(grants.every((g:any)=>g.data.status===undefined&&g.data.room_purpose==='financing'));
  const before=ui.confirmations;
  await ui.click('panel:grant');await ui.submit('grant-access',{...Object.fromEntries(grants.map((g:any)=>['g_'+g.id,'on'])),days:'180'});assert.equal(ui.last.proposal,null);assert.match(ui.state().notice,/Private links created for 3 people\. Nothing has been sent/);
  const g1=await x.room(w,'room:'+room.id),exOf=Object.fromEntries(g1.exchanges.map((e:any)=>[e.recordId,e.id]));assert.equal(g1.exchanges.length,3);assert.doesNotMatch(ui.html,/\/exchange#/,'the app never shows links');
  // The person's own send review renders every email exactly as the platform returned it.
  await ui.submit('prepare-send',{name_kind:'organization'});const inApp=ui.state().batch;assert.equal(inApp.recipients.length,3);
  assert.deepEqual([...ui.html.matchAll(/<pre class="dr-mail-body">([\s\S]*?)<\/pre>/g)].map(m=>unesc(m[1])),inApp.recipients.map((r:any)=>r.text));
  // The assistant personalises one email (it can prepare the batch but never send it); the person confirms that exact batch once.
  const g=(k:string)=>grants.find((r:any)=>r.data.recipient_email===inv[k].mail).id,personal='Dear {recipient_name},\n\nThank you for Tuesday\'s call. As promised, here is our Series B room:\n{link}\n\nAccess: {deadline}.';
  const aiBatch=await prepareExchangeEmailBatch(x.db,ai,w,{groupId:g1.id,emailType:'access_granted',overrides:{[exOf[g('birch')]]:{body:personal}}});
  assert.ok(!JSON.stringify(await listExchanges(x.db,ai,w,{groupId:g1.id})).includes('/exchange#'),'assistants never receive links');
  const aiSend=await f.preview(ai,w,{kind:'send_exchange_email',batchId:aiBatch.batchId,digest:aiBatch.digest});await assert.rejects(()=>f.confirm({...ai,actionConfirmed:true},w,aiSend.id,aiSend.digest),/cannot approve/);
  const send=await f.preview(actor,w,{kind:'send_exchange_email',batchId:aiBatch.batchId,digest:aiBatch.digest});assert.equal(send.exchangeReview.emails.length,3);await f.confirm(actor,w,send.id,send.digest);
  await x.deliver();const invites=mails(x.sent,/access to Series B data room/);assert.equal(invites.length,3,'one confirmed send, three emails');
  for(const r of aiBatch.recipients){const m=invites.find((e:any)=>e.to[0]===r.to);assert.equal(m.text,r.text,'delivered = previewed');}
  assert.match(invites.find((e:any)=>e.to[0]==='ben@birch.invalid').text,/Thank you for Tuesday's call/);assert.match(invites.find((e:any)=>e.to[0]==='ana@alder.invalid').text,/has given you access to our data room for our financing/);
  assert.equal(ui.confirmations-before,0,'links on click; the only send confirmation is the batch');
  // 5. Two open the room; Ana views the deck twice (40 minutes apart); the deck is view-only, the statements are above her level.
  const L=await x.links(w,'room:'+room.id),ana=await x.party(L[g('alder')],'ana@alder.invalid'),ben=await x.party(L[g('birch')],'ben@birch.invalid');
  const page=(await ana.get()).body;assert.equal(page.mode,'room');assert.equal(page.endsAt.slice(0,10)>'2027-01-01',true);assert.ok(!JSON.stringify(page).includes('Financial statements'));
  assert.equal((await ben.get()).status,200);const v=await ana.post('/views',{versionId:deck});assert.equal(v.status,200,v.text);assert.equal((await ana.get('/documents/'+deck)).status,403,'view-only');
  await x.pg.query("INSERT INTO exchange_views(id,workspace_id,exchange_id,version_id,document_id,started_at,seconds) VALUES($1,$2,$3,$4,(SELECT document_id FROM document_versions WHERE id=$4),now()-interval '40 minutes',95)",[randomUUID(),w,exOf[g('alder')],deck]);
  // 6. Grants and engagement update automatically (tracked, no review); Fundraise finds them as a compatible dataroom.v1 provider.
  await x.track();const gr=Object.fromEntries((await x.rows(tid('dataroom.access_grants'))).map((r:any)=>[r.data.recipient_email,r.data]));
  assert.deepEqual([gr['ana@alder.invalid'].status,gr['ben@birch.invalid'].status,gr['dev@dune.invalid'].status],['active','active','invited']);assert.equal(gr['ana@alder.invalid'].source,'tracked');
  const eng=(await x.rows(tid('dataroom.engagement'))).map((r:any)=>r.data);assert.equal(eng.length,1);assert.deepEqual([eng[0].document_title,eng[0].view_count,eng[0].seconds_viewed>=95,eng[0].source],['Presentation deck',2,true,'tracked']);
  const reg=await contractRegistry(),rt=(await roleTables(x.db,w)).tables.filter((t:any)=>t.role.startsWith('dataroom.')&&t.role!=='dataroom.settings'&&['dataroom.access_grants','dataroom.engagement'].includes(t.role));
  for(const t of rt){assert.equal(t.appName,'Data Room');assert.ok(t.writable);assert.ok(readerAccepts(reg,t.role,['dataroom.v1'],t.contract));const type=(await x.pg.query<any>('SELECT fields FROM entity_types WHERE id=$1',[t.typeId])).rows[0];assert.ok(tableCompatible(reg.roles[t.role].versions['dataroom.v1'].fields as any,type.fields).compatible,t.role);}
  assert.equal(rt.length,2,'Fundraise ("Use its data") finds both outputs');
  await ui.open({section:'activity',roomId:room.id});assert.match(text(ui.html),/Ana Fictus Alder Peak Capital \(fictional\) 2 · · · · · · · · 0/);
  // Tracked fields cannot be edited by people or assistants.
  const anaGrant=(await x.rows(tid('dataroom.access_grants'))).find((r:any)=>r.data.recipient_email==='ana@alder.invalid');
  for(const who of [actor,ai])await assert.rejects(async()=>{const p=await x.s.preview(who,w,{kind:'update_record',recordId:anaGrant.id,expectedVersion:anaGrant.version,data:{status:'revoked'}});await x.s.commit(actor,p.id,p.digest);},/recorded by TrialAgents/);
  // 7. A new version keeps its place, shows Updated, and the approved daily digest lists it.
  const deckDoc=(await x.pg.query<any>('SELECT document_id FROM document_versions WHERE id=$1',[deck])).rows[0].document_id;
  const p2=await x.s.previewFile(actor,w,{filename:'Investor presentation.pdf',mime:'application/pdf',bytes:Buffer.from('%PDF deck v2'),ai:false,documentId:deckDoc,expectedVersion:0});const deck2=(await x.s.commit(actor,p2.id,p2.digest)).objects[0].versionId;
  // Their last visit was two hours ago (the platform moves "since your last visit" forward on a visit 30 minutes or more after the previous one).
  await x.pg.query("UPDATE exchange_visits SET last_seen_at=now()-interval '2 hours',previous_seen_at=NULL WHERE exchange_id=ANY($1::uuid[])",[g1.exchanges.map((e:any)=>e.id)]);
  await x.pg.query("UPDATE exchange_groups SET documents=(SELECT jsonb_agg(d||jsonb_build_object('addedAt',(now()-interval '3 hours')::text)) FROM jsonb_array_elements(documents) d) WHERE id=$1",[g1.id]);
  // The owner approves the daily digest text first; the digest then lists what changes after that.
  await ui.open({section:'rooms',roomId:room.id});await ui.click('panel:digest');await ui.submit('digest',{on:'on',subject:'{title}: documents added or updated',body:'Dear {recipient_name},\n\n{documents}\n\n{link}'});
  assert.equal(ui.last.proposal.body.kind,'approve_exchange_digest');await assert.rejects(()=>f.confirm({...ai,actionConfirmed:true},w,ui.last.proposal.id,ui.last.proposal.digest),/cannot approve|person|unrestricted document access/);await ui.approve();
  await ui.open({section:'index',roomId:room.id});assert.match(ui.html,/Use version 1/);await ui.click('use-version:'+all.find((i:any)=>i.data.title==='Presentation deck').id);
  assert.equal(ui.last.proposal.body.kind,'replace_exchange_document');assert.equal(ui.last.proposal.body.records.changes[0].data.version_id,deck2);await ui.approve();
  const upd=(await ana.get()).body.index.find((s:any)=>s.number==='1').documents.find((d:any)=>d.title==='Presentation deck');assert.deepEqual([upd.versionId,upd.badge],[deck2,'updated']);
  assert.equal(await x.digests(),3);await x.deliver();const dg=mails(x.sent,/documents added or updated/);assert.equal(dg.length,3);assert.ok(dg.every((m:any)=>/Presentation deck \(updated\)/.test(m.text)&&!/Financial statements/.test(m.text)),dg.map((m:any)=>m.text).join("\n=====\n").slice(0,1500));
  assert.equal(await x.digests(),0,'once a day');
  // 8. Assistants prepare the same operations (prepare_workspace_change): every grant, level change, publication, acceptance and revocation is a review they cannot confirm.
  // (An assistant cannot run the app's source here at all: the workspace holds documents that are not AI-readable.)
  await assert.rejects(()=>x.app(w,id,ai).open({section:'parties'}),/unrestricted document access/);
  for(const op of [{kind:'revoke_exchange',exchangeId:exOf[g('birch')],reason:'Process closed'},{kind:'set_exchange_levels',exchangeId:exOf[g('birch')],levels:g1.levels.map((l:any)=>l.key)},{kind:'invite_exchange',groupId:g1.id,recipients:[{emails:['new@x.invalid'],recordId:await x.save(w,tid('dataroom.access_grants'),{room_id:room.id,recipient_email:'new@x.invalid'})}],levels:[g1.levels[0].key]},{kind:'publish_exchange_answer',groupId:g1.id,question:'Q?',body:'A.',scope:'room'},{kind:'approve_exchange_digest',groupId:g1.id,expectedVersion:(await x.room(w,'room:'+room.id)).version,text:null}]){
   const pv=await f.preview(ai,w,op);await assert.rejects(()=>f.confirm({...ai,actionConfirmed:true},w,pv.id,pv.digest),/cannot approve|person|unrestricted document access/,op.kind);}
  assert.ok(!JSON.stringify((await (await x.party(L[g('birch')],'ben@birch.invalid')).get()).body).includes('Financial statements'),'nothing changed');
 }finally{await x.pg.close();}
});

test('Acceptance 2, 3, 5: licensing room with Contracts — signed CDA unlocks only its level, custom CMC level for one party, lowering hides at once, Q&A private and published',async()=>{
 const x=await dataRoomSuite();const {f,actor,ai,T}=x;
 try{
  const w=await setUp(x,'Northwind Bio licensing');const c=await x.install(w,T.contracts,'Contracts'),cmap=x.mapOf(await x.comp(w,c.receipt.appId));
  const {receipt}=await x.install(w,T.room,'Data Room',{});const id=receipt.appId,map=x.mapOf(await x.comp(w,id)),tid=(r:string)=>map[r].typeId;
  assert.equal(map.agreements.typeId,cmap.agreements.typeId,'one shared agreements table with Contracts');assert.equal(map.organizations.typeId,cmap.organizations.typeId);
  const ui=x.app(w,id),parties:any={};
  for(const [k,org,person,mail] of [['cedar','Cedarline Pharma (fictional)','Chloe Sample','chloe@cedar.invalid'],['elm','Elmstead Bio (fictional)','Eli Example','eli@elm.invalid']]){const o=await x.save(w,tid('organizations'),{name:org,org_type:'partner',archived:false});parties[k]={org:o,person:await x.save(w,tid('people'),{name:person,organization_id:o,email:mail,archived:false}),mail};}
  const {room,levels,items}=await newRoom(x,ui,map,{name:'NWB-101 licensing room',purpose:'licensing',template_id:'builtin:licensing',cda_option:'contracts',opportunity_ref:'Cedarline: NWB-101 licence'});
  assert.deepEqual(levels.map((l:any)=>l.data.entry),['none','signed_cda']);
  const teaser=await x.doc(w,'Non-confidential teaser.pdf','%PDF teaser'),plan=await x.doc(w,'Development plan.pdf','%PDF plan'),cda=await x.doc(w,'Mutual CDA.pdf','%PDF cda'),cmcDoc=await x.doc(w,'CMC overview.pdf','%PDF cmc'),all=await items();
  await attach(ui,all.find((i:any)=>i.data.title==='Company teaser or one-pager'),teaser,levels[0].id);await attach(ui,all.find((i:any)=>i.data.title==='Development plan'),plan,levels[1].id);
  await ui.open({section:'rooms',roomId:room.id});await ui.click('panel:live');await ui.submit('go-live',{cda_doc:cda});await ui.approve();
  for(const k of ['cedar','elm']){await ui.open({section:'parties',roomId:room.id});await ui.click('panel:party-new');assert.match(ui.html,/name="l_[^"]+"[^>]*checked[\s\S]*name="l_[^"]+"[^>]*checked/,'CDA level held, locked');await ui.submit('save-party',{organization_id:parties[k].org,person_id:parties[k].person,email:parties[k].mail,days:'',['l_'+levels[0].id]:'on',['l_'+levels[1].id]:'on'});await ui.approve();}
  const grants=await x.rows(tid('dataroom.access_grants')),gid=(k:string)=>grants.find((r:any)=>r.data.recipient_email===parties[k].mail).id;
  await ui.click('panel:grant');await ui.submit('grant-access',{...Object.fromEntries(grants.map((g:any)=>['g_'+g.id,'on'])),days:''});assert.match(ui.state().notice,/Private links created/);await ui.submit('prepare-send',{});assert.ok(ui.state().batch,ui.state().notice);await ui.click('confirm-send');await ui.approve();await x.deliver();
  const L=await x.links(w,'room:'+room.id),chloe=await x.party(L[gid('cedar')],'chloe@cedar.invalid'),eli=await x.party(L[gid('elm')],'eli@elm.invalid');
  // Acceptance 2: at Non-confidential the party sees the teaser and the CDA to sign, not the plan; uploads the signed CDA; acceptance opens Confidential for that party only.
  const p0=(await chloe.get()).body;assert.equal(p0.endsAt,null,'until revoked');assert.ok(JSON.stringify(p0).includes('Mutual CDA')&&!JSON.stringify(p0).includes('Development plan.pdf'));
  const conf=p0.levels.find((l:any)=>!l.open);assert.equal(conf.slotStatus,'requested');
  assert.equal((await chloe.post('/files',{filename:'CDA signed.pdf',mime:'application/pdf',base64:b64('%PDF signed'),slot:conf.slot})).status,200);
  await ui.open({section:'parties',roomId:room.id});assert.match(text(ui.html),/Accept signed CDA/);
  const btn=/data-action="(accept-cda:[^"]+)"/.exec(ui.html)![1];await ui.click(btn);const review=ui.last.proposal;assert.equal(review.body.kind,'accept_exchange_file');assert.equal(review.exchangeReview.unlocks,'Confidential');
  assert.deepEqual(review.body.records.changes.map((ch:any)=>ch.data.agreement_type??ch.data.cda_status),['signed','cda_nda']);await ui.approve();
  assert.ok(JSON.stringify((await chloe.get()).body).includes('Development plan.pdf'));assert.ok(!JSON.stringify((await eli.get()).body).includes('Development plan.pdf'),'only her level');
  await x.deliver();assert.equal(mails(x.sent,/your access changed/).filter((m:any)=>m.to[0]==='chloe@cedar.invalid').length,1,'email on confirm');
  assert.equal((await x.rows(cmap.agreements.typeId)).filter((a:any)=>a.data.agreement_type==='cda_nda').length,1,'filed for Contracts');
  // A custom level "CMC" added later, for one party only.
  await ui.open({section:'rooms',roomId:room.id});await ui.click('add:levels');await ui.submit('save-record',{name:'CMC',entry:'click_through'});await ui.approve();
  await ui.open({section:'rooms',roomId:room.id});await ui.click('define-levels');await ui.approve();const cmc=(await x.rows(tid('dataroom.levels'))).find((l:any)=>l.data.name==='CMC');
  const cmcItem=(await items()).find((i:any)=>i.data.title==='CMC overview and supply chain');await attach(ui,cmcItem,cmcDoc,cmc.id);
  await ui.open({section:'index',roomId:room.id});await ui.click('sync-room');await ui.approve();
  await ui.open({section:'parties',roomId:room.id});await ui.click('panel:levels:'+gid('cedar'));await ui.submit('save-levels',{['l_'+levels[0].id]:'on',['l_'+levels[1].id]:'on',['l_'+cmc.id]:'on',notify:'on'});await ui.approve();
  const pc=(await chloe.get()).body,cmcLv=pc.levels.find((l:any)=>l.name==='CMC');assert.equal(cmcLv.open,false);await chloe.post('/acknowledge',{name:'Chloe Sample',email:'chloe@cedar.invalid',level:cmcLv.key});
  assert.ok(JSON.stringify((await chloe.get()).body).includes('CMC overview.pdf'));assert.ok(!JSON.stringify((await eli.get()).body).includes('CMC'),'Eli never sees the CMC level');
  // Acceptance 5: questions → assign → draft (assistant) → approve → private answer; a second answer published to the room, asker anonymised.
  assert.equal((await chloe.post('/questions',{body:'Which CMO manufactures the clinical batches?',documentId:(await x.pg.query<any>('SELECT document_id FROM document_versions WHERE id=$1',[cmcDoc])).rows[0].document_id})).status,200);assert.equal((await eli.post('/questions',{body:'Is there an orphan designation?'})).status,200);
  await ui.open({section:'qa',roomId:room.id});assert.match(text(ui.html),/New questions from the room/);await ui.submit('log-questions',Object.fromEntries([...ui.html.matchAll(/name="(m_[^"]+)"/g)].map(m=>[m[1],'on'])));await ui.approve();
  const qs=await x.rows(tid('dataroom.questions')),q1=qs.find((q:any)=>/CMO/.test(q.data.question)),q2=qs.find((q:any)=>/orphan/.test(q.data.question));assert.equal(q1.data.grant_id,gid('cedar'));
  await ui.click('panel:answer:'+q1.id);await ui.ev({kind:'submit',action:'save-answer',value:'save',form:{assignee:'Kim CMO',due:'2026-11-20',category:'cmc',answer:''}});await ui.approve();
  // The assistant drafts the answer as a proposed record change, which a person approves; answering, approving and publishing stay with people.
  const qrow=(await x.rows(tid('dataroom.questions'))).find((q:any)=>q.id===q1.id);
  const draft=await x.s.preview(ai,w,{kind:'update_record',recordId:q1.id,expectedVersion:qrow.version,data:{answer:'Clinical batches are made by Corvane Biologics (fictional) under a GMP supply agreement.',status:'drafting'}});
  await x.s.commit(actor,draft.id,draft.digest);// a draft is a record change; sending it is not (below)
  for(const op of [{kind:'answer_exchange_question',questionId:q1.data.message_id,body:'x'}])await assert.rejects(async()=>{const pv=await f.preview(ai,w,op);await f.confirm({...ai,actionConfirmed:true},w,pv.id,pv.digest);},/cannot approve|person|unrestricted document access/);
  const answer=(await x.rows(tid('dataroom.questions'))).find((q:any)=>q.id===q1.id).data.answer;assert.match(answer,/Corvane/);
  await ui.open({section:'qa',roomId:room.id});await ui.click('panel:answer:'+q1.id);await ui.ev({kind:'submit',action:'save-answer',value:'private',form:{answer}});assert.match(ui.state().notice,/need approval/);
  await ui.ev({kind:'submit',action:'save-answer',value:'approve',form:{answer,approver:'Robin Lead'}});await ui.approve();
  await ui.click('panel:answer:'+q1.id);await ui.ev({kind:'submit',action:'save-answer',value:'private',form:{answer}});assert.equal(ui.last.proposal.body.kind,'answer_exchange_question');await ui.approve();await x.deliver();
  assert.deepEqual(mails(x.sent,/your question was answered/).map((m:any)=>m.to[0]),['chloe@cedar.invalid']);assert.match((await chloe.get()).body.questions[0].answers[0].body,/Corvane/);assert.ok(!JSON.stringify((await eli.get()).body).includes('Corvane'));
  await ui.click('panel:answer:'+q2.id);await ui.ev({kind:'submit',action:'save-answer',value:'approve',form:{answer:'An orphan designation application is planned for 2027.',approver:'Robin Lead'}});await ui.approve();
  await ui.click('panel:answer:'+q2.id);await ui.ev({kind:'submit',action:'save-answer',value:'publish',form:{answer:'An orphan designation application is planned for 2027.',public_question:'Is there an orphan designation?',publish_to:'room'}});await ui.approve();await x.deliver();
  assert.deepEqual(mails(x.sent,/a new answer for all parties/).map((m:any)=>m.to[0]).sort(),['chloe@cedar.invalid','eli@elm.invalid']);
  const seen=(await chloe.get()).body.published[0];assert.equal(seen.question,'A participant asked: Is there an orphan designation?');assert.ok(!JSON.stringify(seen).includes('Eli')&&!JSON.stringify(seen).includes('Elmstead'));
  // Acceptance 3: lowering Chloe to Non-confidential hides Confidential and CMC documents at once, in the index, search and "what changed".
  await ui.open({section:'parties',roomId:room.id});await ui.click('panel:levels:'+gid('cedar'));await ui.submit('save-levels',{['l_'+levels[0].id]:'on',notify:''});await ui.approve();
  const low=JSON.stringify((await chloe.get()).body);assert.ok(!low.includes('Development plan.pdf')&&!low.includes('CMC overview.pdf'));assert.equal((await chloe.get('/documents/'+plan)).status,404);
  // A CDA already on file in Contracts: the team records Confidential's entry step as met for Eli (reviewed); his page and row security open it, for him only.
  const elmCda=await x.save(w,cmap.agreements.typeId,{name:'CDA: Elmstead Bio (fictional)',counterparty_id:parties.elm.org,agreement_type:'cda_nda',status:'active',effective_date:'2026-09-01',archived:false});
  assert.notEqual((await eli.get('/documents/'+plan)).status,200,'locked before');
  await ui.open({section:'parties',roomId:room.id});await ui.click('panel:levels:'+gid('elm'));await ui.submit('save-levels',{['l_'+levels[0].id]:'on',['l_'+levels[1].id]:'on',cda_mode:'contracts',agreement_id:elmCda,notify:''});
  assert.deepEqual(ui.last.proposal.exchangeReview.entryRecorded,['Confidential']);assert.equal(ui.last.proposal.body.records.changes[0].data.cda_agreement_id,elmCda);await ui.approve();
  assert.ok(JSON.stringify((await eli.get()).body).includes('Development plan.pdf'));assert.equal((await eli.get('/documents/'+plan)).status,200,'row security opens it');
 }finally{await x.pg.close();}
});

test('Acceptance 7: modularity and archive first — alone, with partners, partner archived, a tab removed, app archived (links and tracking stop), restored',async()=>{
 const x=await dataRoomSuite();const {actor,T}=x;
 try{
  const w=await setUp(x,'Modularity');const {receipt}=await x.install(w,T.room,'Data Room');const id=receipt.appId,map=x.mapOf(await x.comp(w,id)),tid=(r:string)=>map[r].typeId;
  assert.equal(Object.keys(map).length,13);const ui=x.app(w,id);for(const s of ['overview','rooms','index','parties','activity','qa','settings']){await ui.open({section:s});assert.doesNotMatch(text(ui.html),/could not be shown|Partial data/,s);}
  assert.match(text(ui.html),/Assistants read rooms and Q&A you can read/);
  // Partners added later share organizations, people, programs and agreements; Data Room keeps working.
  const p=await x.install(w,T.programs,'Programs'),c=await x.install(w,T.contracts,'Contracts');const pm=x.mapOf(await x.comp(w,p.receipt.appId)),cm=x.mapOf(await x.comp(w,c.receipt.appId));
  assert.equal(pm.programs.typeId,map.programs.typeId);assert.equal(cm.agreements.typeId,map.agreements.typeId);
  const prog=await x.save(w,tid('programs'),{name:'NWB-101 (fictional)',stage:'phase_1',status:'active',archived:false});
  const {room,levels}=await newRoom(x,ui,map,{name:'Partner room',purpose:'partnering',template_id:'builtin:partnering',cda_option:'in_place',['p_'+prog]:'on'});assert.equal(room.data.program_ids,prog);
  const change=async(op:any)=>{const pv=await x.f.preview(actor,w,op);return x.f.confirm(actor,w,pv.id,pv.digest);};
  await change({kind:'archive_component',componentId:c.receipt.appId,expectedVersion:await x.version(c.receipt.appId),archived:true});
  await ui.open({section:'parties',roomId:room.id});assert.doesNotMatch(text(ui.html),/could not be shown/);
  // Remove one tab (Activity) in the layout and back: nothing is deleted.
  const cc=await x.comp(w,id),cfg=JSON.parse(/^const templateConfiguration=(.+);\n/.exec(cc.source)![1]);
  const withLayout=(v:any)=>cc.source.replace(/^const templateConfiguration=(.+);\n/,()=>'const templateConfiguration='+JSON.stringify({...cfg,layoutProfile:JSON.stringify(v)})+';\n');
  await change({kind:'save_component',componentId:cc.id,expectedVersion:cc.version,projectId:cc.project_id,content:{name:cc.name,format:'frontend-js',source:withLayout({visible:{activity:false}}),sourceAccess:cc.source_access??'workspace',bindings:cc.bindings,manifest:cc.manifest}});
  await ui.open({section:'overview'});assert.doesNotMatch(ui.html,/aria-label="Activity"/);assert.match(ui.html,/aria-label="Parties"/);
  // Live room with one person; archive the app: links stop and tracking stops; restore re-enables only unexpired grants; reinstall offers the restore first.
  const doc=await x.doc(w,'Teaser.pdf','%PDF t'),it=(await x.rows(tid('dataroom.items'))).find((i:any)=>i.data.title==='Company teaser or one-pager');await attach(ui,it,doc,levels[0].id);
  await ui.open({section:'rooms',roomId:room.id});await ui.click('panel:live');await ui.submit('go-live',{});await ui.approve();
  const o=await x.save(w,tid('organizations'),{name:'Cedarline (fictional)',org_type:'partner',archived:false});
  for(const mail of ['a@cedar.invalid','b@cedar.invalid']){await ui.open({section:'parties',roomId:room.id});await ui.click('panel:party-new');await ui.submit('save-party',{organization_id:o,email:mail,days:'30',['l_'+levels[0].id]:'on'});await ui.approve();}
  const grants=await x.rows(tid('dataroom.access_grants'));await ui.click('panel:grant');await ui.submit('grant-access',{...Object.fromEntries(grants.map((g:any)=>['g_'+g.id,'on'])),days:'30'});
  const L=await x.links(w,'room:'+room.id),[pa,pb]=[await x.party(L[grants[0].id],grants[0].data.recipient_email),await x.party(L[grants[1].id],grants[1].data.recipient_email)];
  assert.equal((await pa.get()).status,200);await x.pg.query("UPDATE exchanges SET expires_at=now()-interval '1 day' WHERE record_id=$1",[grants[1].id]);
  await change({kind:'archive_component',componentId:id,expectedVersion:await x.version(id),archived:true});
  assert.equal((await pa.get()).status,404,'archiving the app stops every link');assert.equal(await x.track(),0,'and every tracked update');
  const {installCatalogApp}=await import('../src/workspace/template-catalog.js');
  await assert.rejects(()=>installCatalogApp(x.f,actor,w,{templateId:T.room.id,version:T.room.version,digest:T.room.digest,name:'Data Room',requestKey:randomUUID()}),/Restore your archived Data Room app/);
  await change({kind:'archive_component',componentId:id,expectedVersion:await x.version(id),archived:false});
  assert.equal((await pa.get()).status,200,'unexpired grant works again');assert.equal((await pb.get()).status,404,'an expired grant stays closed');
  await x.track();assert.deepEqual((await x.rows(tid('dataroom.access_grants'))).map((g:any)=>g.data.status).sort(),['active','expired']);
 }finally{await x.pg.close();}
});
