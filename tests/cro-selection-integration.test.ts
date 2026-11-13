import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {croSelectionSuite,text} from './fixtures/cro-selection.js';
import {listExchangeSubmissions,prepareExchangeEmailBatch,listExchanges} from '../src/domain/external-exchange.js';

/* CRO_SELECTION.md §13 through the real installer, app runtime, workspace review, platform exchange (guidance 1.3.23: one confirmation
 * when something goes out), supplier pages and email delivery. Fictional data only; disposable databases, not a deployed account. */
const unesc=(s:string)=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
const notices=(sent:any[])=>sent.filter((m:any)=>!/^Your verification code/.test(m.subject));

test('Acceptance 1: quick quote — three suppliers in one confirmed send (one personalised by the assistant), two submit with files, accept, compare, decide and notify all',async()=>{
 const x=await croSelectionSuite();const {f,s,actor,ai,T}=x;
 try{
  const w=(await s.createWorkspace(actor,'Example Therapeutics')).id;await x.pg.query("UPDATE tenants SET name='Example Therapeutics' WHERE id=(SELECT tenant_id FROM workspaces WHERE id=$1)",[w]);
  const {receipt}=await x.install(w,T.sel,'CRO Selection');const id=receipt.appId,map=x.mapOf(await x.comp(w,id)),tid=(r:string)=>map[r].typeId;
  assert.equal(Object.keys(map).length,14);
  const ui=x.app(w,id);
  const orgs:Record<string,string>={};
  for(const [k,name,mail] of [['quartz','Quartz Tox Labs BV (fictional)','eva@quartz.invalid'],['ember','Ember Bioanalytics AB (fictional)','finn@ember.invalid'],['sable','Sable Biosciences Inc (fictional)','dev@sable.invalid']]){orgs[k]=await x.save(w,tid('organizations'),{name,org_type:k==='sable'?'cro':'other',archived:false});await x.save(w,tid('people'),{name:'Contact at '+name,organization_id:orgs[k],email:mail,archived:false});}
  // 1. New quick quote: the built-in questions and preclinical cost categories are copied onto the request (reviewed).
  await ui.open({section:'requests'});await ui.click('add:requests:quick_quote');
  await ui.submit('save-record',{name:'28-day GLP tox quote',service_type:'preclinical_study',scope:'28-day repeat-dose GLP toxicology study in rats with toxicokinetics (fictional).',assume_notes:'Three dose groups plus control.',assume_baseline:'In-life phase | 120000\nBioanalysis | 40000\nHistopathology | 30000\nReporting | 20000',currency:'EUR',cda_option:'none',response_deadline:'2026-12-31',owner:'N. Clinical (fictional)'});
  assert.equal((await x.rows(tid('croselection.requests'))).length,0,'nothing is written before approval');await ui.approve();
  const req=(await x.rows(tid('croselection.requests')))[0];assert.equal(req.data.mode,'quick_quote');assert.equal(req.data.question_deadline,'2026-12-24');assert.match(req.data.questions,/^What does your price include/);assert.match(req.data.cost_categories,/^Study design and protocol/);
  // 2. Longlist: recipients come from the vendors' contacts (reviewed).
  await ui.open({section:'vendors',requestId:req.id});
  for(const k of ['quartz','ember','sable']){await ui.submit('longlist-add',{organization_id:orgs[k],recipient_emails:''});await ui.approve();}
  const invs=await x.rows(tid('croselection.invitations'));assert.deepEqual(invs.map((i:any)=>i.data.recipient_emails).sort(),['dev@sable.invalid','eva@quartz.invalid','finn@ember.invalid']);
  const before=ui.confirmations;
  // 3. The round and the links are prepared on click: nothing reaches anyone, so there is no separate review.
  await ui.click('panel:round:rfp');const brief=unesc(/name="summary"[^>]*>([^<]*)<\/textarea>/.exec(ui.html)![1]);assert.match(brief,/1\. What does your price include/);assert.match(brief,/Study design and protocol/);
  await ui.submit('create-round',{title:'Quote request: 28-day GLP tox',summary:brief,verify_email:'on'});assert.equal(ui.last.proposal,null);assert.match(ui.state().notice,/Round created\. Nothing was sent/);
  const g0=await x.round(w,'request:'+req.id+':rfp');assert.equal(g0.typeId,tid('croselection.proposals'));assert.deepEqual(g0.fields,['total','currency','start_weeks','duration_months','answers','notes']);
  assert.deepEqual(Object.keys(g0.emailDefaults),['invitation']);assert.match(g0.emailDefaults.invitation.body,/would like a quote from \{recipient_company\}/);
  await ui.open({section:'vendors'});await ui.submit('invite',Object.fromEntries([...invs.map((i:any)=>['inv_'+i.id,'on']),['days','30']]));assert.equal(ui.last.proposal,null);assert.match(ui.state().notice,/3 private links created\. Nothing was sent/);
  const g1=await x.round(w,'request:'+req.id+':rfp');assert.deepEqual(g1.exchanges.map((e:any)=>e.recordId).sort(),invs.map((i:any)=>i.id).sort(),'one exchange per supplier, bound to its invitation');
  assert.equal(x.sent.length,0);assert.doesNotMatch(ui.html,/\/exchange#/,'the app never shows recipient links');
  const exOf=Object.fromEntries(g1.exchanges.map((e:any)=>[invs.find((i:any)=>i.id===e.recordId).data.organization_id,e.id]));
  // 4. The assistant personalises one email: it can prepare a batch but never send it.
  const personal='Dear {recipient_name},\n\nThank you for the quick call on Monday. As discussed, we would value a quote from {recipient_company} for "{title}" by {deadline}:\n{link}';
  const aiBatch=await prepareExchangeEmailBatch(x.db,ai,w,{groupId:g1.id,emailType:'invitation',exchangeIds:[exOf[orgs.ember]],overrides:{[exOf[orgs.ember]]:{body:personal}}});
  assert.ok(!JSON.stringify(await listExchanges(x.db,ai,w,{groupId:g1.id})).includes('/exchange#'),'assistants never receive links');
  const aiSend=await f.preview(ai,w,{kind:'send_exchange_email',batchId:aiBatch.batchId,digest:aiBatch.digest});
  await assert.rejects(()=>f.confirm({...ai,actionConfirmed:true},w,aiSend.id,aiSend.digest),/cannot approve/);
  // 5. One confirmation: three emails exactly as previewed (default text, Ember personalised) and the three suppliers marked invited.
  const form:any={email_type:'invitation',name_kind:'organization'};for(const k of ['quartz','ember','sable'])form['to_'+exOf[orgs[k]]]='on';form['pers_'+exOf[orgs.ember]]=personal;
  await ui.submit('prepare-email',form);const batch=ui.state().batch;assert.equal(batch.recipients.length,3);
  const shown=[...ui.html.matchAll(/<pre>([\s\S]*?)<\/pre>/g)].map(m=>unesc(m[1]));assert.deepEqual(shown,batch.recipients.map((r:any)=>r.text),'the send review shows each email exactly as returned');
  assert.equal(batch.from,'Example Therapeutics at TrialAgents <no-reply@trialagents.com>');assert.ok(batch.recipients.find((r:any)=>r.exchangeId===exOf[orgs.ember]).personalised);
  await ui.click('send-email');const review=ui.last.proposal;assert.equal(review.body.kind,'send_exchange_email');
  assert.deepEqual(review.body.records.changes.map((c:any)=>c.data.status??c.data.stage).sort(),['rfp','rfp_invited','rfp_invited','rfp_invited'],'the invited status and the stage are in the same review');
  assert.equal(review.exchangeReview.plan.recipients.length,3);assert.equal(x.sent.length,0);
  await ui.approve();await x.deliver();assert.equal(x.sent.length,3,'one confirmation, three emails');
  for(const r of batch.recipients){const m=x.sent.find((e:any)=>e.to[0]===r.to);assert.equal(m.text,r.text,'delivered text = preview');assert.equal(m.subject,r.subject);assert.equal(m.from,batch.from);}
  assert.match(x.sent.find((e:any)=>e.to[0]==='finn@ember.invalid').text,/Thank you for the quick call on Monday/);
  assert.ok((await x.rows(tid('croselection.invitations'))).every((i:any)=>i.data.status==='rfp_invited'));assert.equal((await x.rows(tid('croselection.requests')))[0].data.stage,'rfp');
  assert.equal(ui.confirmations-before,1,'round, links and send: one confirmation');
  // 6. Two suppliers submit with files; Ember revises its quote (the app shows only the latest version).
  const L=await x.links(w,'request:'+req.id+':rfp'),byOrg=Object.fromEntries(invs.map((i:any)=>[i.data.organization_id,L[i.id]]));const bids:Record<string,any>={};
  for(const [k,mail,total,weeks,months] of [['quartz','eva@quartz.invalid',198000,6,5],['ember','finn@ember.invalid',219000,4,4]] as const){
   const p=await x.supplier(byOrg[orgs[k]],mail);assert.equal((await p.post('/acknowledge',{name:'Supplier '+k,email:mail})).status,200);
   const up=await p.post('/files',{filename:k+' quote (fictional).pdf',mime:'application/pdf',base64:Buffer.from('%PDF-1.4 quote '+k).toString('base64')});assert.equal(up.status,200,up.text);
   const sub=await p.post('/submit',{nonce:randomUUID(),confirmed:true,data:{total,currency:'EUR',start_weeks:weeks,duration_months:months,answers:'1. Includes TK and reports (fictional).'}});assert.equal(sub.status,200,sub.text);bids[k]={sub:sub.body.id,file:up.body.id,page:p};}
  const rev=await bids.ember.page.post('/submit',{nonce:randomUUID(),confirmed:true,data:{total:214500,currency:'EUR',start_weeks:4,duration_months:4,answers:'Revised (fictional).'}});assert.equal(rev.body.version,2);bids.ember.sub=rev.body.id;
  assert.ok((await listExchangeSubmissions(x.db,ai,w,{groupId:g1.id})).submissions.every((v:any)=>v.data===null),'unaccepted values stay out of AI reach');
  await ui.open({section:'proposals'});const t0=text(ui.html);assert.match(t0,/Ember Bioanalytics AB \(fictional\) · version 2 Latest of 2 versions/);assert.doesNotMatch(t0,/Ember Bioanalytics AB \(fictional\) · version 1/,'older versions are not offered');
  // 7. Accept: one review creates the proposal and marks the supplier submitted.
  for(const k of ['quartz','ember']){await ui.click('panel:accept:'+bids[k].sub);await ui.submit('accept-submit',{});const rv=ui.last.proposal;assert.equal(rv.exchangeReview.target.kind,'create_record');assert.equal(rv.exchangeReview.proposed.round,'quote');
   assert.ok(rv.body.records.changes.some((c:any)=>c.data.status==='submitted'));await ui.approve();
   await ui.click('accept-file:'+bids[k].file);assert.equal(ui.last.proposal.body.kind,'accept_exchange_file');await ui.approve();}
  const props=await x.rows(tid('croselection.proposals'));assert.equal(props.length,2);assert.deepEqual(props.map((p:any)=>p.data.version).sort(),[1,2]);
  const inv2=await x.rows(tid('croselection.invitations'));assert.deepEqual(inv2.map((i:any)=>[i.data.organization_id,i.data.status]).sort(),[[orgs.quartz,'submitted'],[orgs.ember,'submitted'],[orgs.sable,'rfp_invited']].sort());
  // 8. Compare against the baseline (EUR 210,000).
  await ui.open({section:'proposals'});const t=text(ui.html);
  assert.match(t,/Total \(EUR\) 210,000 214,500 \+4,500 \(\+2\.1%\) Stated total, no lines yet 198,000 −12,000 \(−5\.7%\)/,'Ember 214,500 = +4,500 (+2.1%); Quartz 198,000 = −12,000 (−5.7%)');
  // 9. Decide and notify all three suppliers: one confirmation.
  await ui.open({section:'decision'});await ui.click('panel:decide:new');const n0=ui.confirmations;x.sent.length=0;
  const quartzInv=inv2.find((v:any)=>v.data.organization_id===orgs.quartz)!.id;
  await ui.submit('decide',{invitation_id:quartzInv,rationale:'Lowest price, complete scope, start in 6 weeks (fictional).',approver:'R. Lead (fictional)',decided_on:'2026-11-13',start_date:'2027-01-11',notify:'on'});
  assert.equal(ui.last.proposal.body.kind,'reply_exchanges');assert.equal(ui.last.proposal.body.replies.length,3);assert.ok(ui.last.proposal.body.records.changes.some((c:any)=>c.typeId===tid('croselection.awards')));
  await ui.approve();assert.equal(ui.confirmations-n0,1);
  const award=(await x.rows(tid('croselection.awards')))[0];assert.deepEqual([award.data.organization_id,award.data.total,award.data.currency,award.data.duration_months],[orgs.quartz,198000,'EUR',5]);
  assert.deepEqual((await x.rows(tid('croselection.invitations'))).map((i:any)=>[i.data.organization_id,i.data.status]).sort(),[[orgs.quartz,'selected'],[orgs.ember,'not_selected'],[orgs.sable,'not_selected']].sort());
  await x.deliver();const n=notices(x.sent);assert.equal(n.length,3);assert.ok(n.every((m:any)=>/^New message about Quote request: 28-day GLP tox$/.test(m.subject)),'platform default subject for messages');
  for(const [k,mail,re] of [['quartz','eva@quartz.invalid',/we have selected Quartz Tox Labs BV \(fictional\)/],['ember','finn@ember.invalid',/selected another supplier[\s\S]*debrief/],['sable','dev@sable.invalid',/selected another supplier/]] as const){const p=await x.supplier(byOrg[orgs[k]],mail);assert.ok((await p.get('/messages')).body.messages.some((v:any)=>re.test(v.body)),k);}
  await ui.open({section:'decision'});assert.equal((text(ui.html).match(/Notified /g)||[]).length,3);
  console.log('# quick quote confirmations (after setting up vendors):',ui.confirmations-before);
 }finally{await x.pg.close();}
});

test('Acceptance 2: full selection — RFI → shortlist → RFP with pack and gated CDA → private reply and anonymised clarification → draft and resubmission → deadline → accept and map → scoring and qualification → bid defence → decision with notices → onboarding → handoff',async()=>{
 const x=await croSelectionSuite();const {s,actor,ai,T}=x;
 try{
  const w=(await s.createWorkspace(actor,'Example Therapeutics')).id;await x.pg.query("UPDATE tenants SET name='Example Therapeutics' WHERE id=(SELECT tenant_id FROM workspaces WHERE id=$1)",[w]);
  const {receipt}=await x.install(w,T.sel,'CRO Selection');const id=receipt.appId,map=x.mapOf(await x.comp(w,id)),tid=(r:string)=>map[r].typeId;const ui=x.app(w,id);
  const V=[['helix','Helix Clinical Research GmbH (fictional)','anna@helix.invalid'],['north','Northlake CRO Ltd (fictional)','ben@northlake.invalid'],['meri','Meridian Trials SAS (fictional)','cara@meridian.invalid'],['sable','Sable Biosciences Inc (fictional)','dev@sable.invalid']];
  const org:Record<string,string>={},mail:Record<string,string>={};
  for(const [k,n,m] of V){org[k]=await x.save(w,tid('organizations'),{name:n,org_type:'cro',archived:false});mail[k]=m;await x.save(w,tid('people'),{name:'Contact '+k+' (fictional)',organization_id:org[k],email:m,archived:false});}
  const pack=await x.doc(w,'PX-101-201 request pack (fictional).pdf','%PDF-1.4 request pack'),cdaDoc=await x.doc(w,'Mutual CDA (fictional).pdf','%PDF-1.4 mutual cda');
  await ui.open({section:'requests'});await ui.click('add:requests:full_selection');
  await ui.submit('save-record',{name:'PX-101 Phase 2 CRO',service_type:'clinical_study',scope:'Full-service CRO for a Phase 2 study (fictional).',assume_notes:'120 patients, 24 sites, 8 monitoring visits per site.',assume_baseline:'Study start-up | 180000\nMonitoring | 520000\nData management | 160000\nPass-through costs | 200000',cost_categories:'Study start-up\nMonitoring\nData management\nPass-through costs',currency:'EUR',cda_option:'send_pdf',cda_gate:'on',response_deadline:'2026-12-18',decision_due:'2027-01-15',owner:'C. Ops (fictional)'});
  await ui.approve();const req=(await x.rows(tid('croselection.requests')))[0];assert.equal(req.data.cda_gate,true);assert.match(req.data.rfi_questions,/^Describe your experience/);
  const ref=(round:string)=>'request:'+req.id+':'+round;
  await ui.open({section:'vendors',requestId:req.id});for(const [k] of V){await ui.submit('longlist-add',{organization_id:org[k]});await ui.approve();}
  const inv0=await x.rows(tid('croselection.invitations')),invOf=(k:string,l:any[]=inv0)=>l.find((i:any)=>i.data.organization_id===org[k])!;
  const sendInvites=async(round:string)=>{const g=await x.round(w,ref(round));const form:any={email_type:'invitation'};for(const e of g.exchanges)form['to_'+e.id]='on';await ui.open({section:'vendors'});await ui.submit('prepare-email',form);await ui.click('send-email');await ui.approve();};
  // RFI: its own exchange group; links on click; one confirmation sends the questionnaire and marks the longlist RFI-invited.
  await ui.click('round:rfi');await ui.click('panel:round:rfi');const rfiBrief=unesc(/name="summary"[^>]*>([^<]*)<\/textarea>/.exec(ui.html)![1]);assert.match(rfiBrief,/1\. Describe your experience/);
  await ui.submit('create-round',{title:'RFI: PX-101 Phase 2 CRO',summary:rfiBrief,verify_email:'on'});const rfi=await x.round(w,ref('rfi'));assert.deepEqual(rfi.fields,['answers','notes']);assert.equal(rfi.gate,'none');assert.match(rfi.emailDefaults.invitation.body,/capability questionnaire/);
  await ui.open({section:'vendors'});await ui.submit('invite',Object.fromEntries(inv0.map((i:any)=>['inv_'+i.id,'on']).concat([['days','14']])));
  await sendInvites('rfi');assert.ok((await x.rows(tid('croselection.invitations'))).every((i:any)=>i.data.status==='rfi_invited'));
  let L=await x.links(w,ref('rfi'));
  for(const k of ['helix','north','meri']){const p=await x.supplier(L[invOf(k).id],mail[k]);assert.equal((await p.post('/submit',{nonce:randomUUID(),confirmed:true,data:{answers:'1. Phase 2 experience (fictional '+k+').'}})).status,200);}
  await ui.open({section:'proposals'});const rfiSubs=[...ui.html.matchAll(/data-action="panel:accept:([0-9a-f-]+)"/g)].map(m=>m[1]);assert.equal(rfiSubs.length,3);
  for(const sid of rfiSubs){await ui.click('panel:accept:'+sid);await ui.submit('accept-submit',{});assert.equal(ui.last.proposal.exchangeReview.proposed.round,'rfi');await ui.approve();}
  // Shortlist from the RFI answers; Sable did not answer and is declined.
  await ui.open({section:'vendors'});for(const k of ['helix','north','meri']){await ui.click('inv-status:'+invOf(k).id+':shortlisted');await ui.approve();}
  await ui.click('inv-status:'+invOf('sable').id+':declined');await ui.approve();
  // RFP round: pack and CDA; the gate locks the pack until the signed CDA is accepted.
  await ui.click('round:rfp');await ui.click('panel:round:rfp');const rfpBrief=unesc(/name="summary"[^>]*>([^<]*)<\/textarea>/.exec(ui.html)![1]);assert.match(rfpBrief,/Our assumptions[\s\S]*Bid grid[\s\S]*Study start-up; Monitoring; Data management; Pass-through costs[\s\S]*1\. Confirm that your price follows/);
  await ui.submit('create-round',{title:'RFP: PX-101 Phase 2 CRO',summary:rfpBrief,['doc_'+pack]:'on',cda_document:cdaDoc,verify_email:'on'});
  const rfp=await x.round(w,ref('rfp'));assert.equal(rfp.gate,'signed_document');assert.equal(rfp.gateSlot,'signed_cda');assert.deepEqual(rfp.slots,[{key:'signed_cda',label:'Signed CDA',required:true}]);assert.deepEqual(rfp.documents.map((d:any)=>[d.versionId,d.gate]).sort(),[[pack,false],[cdaDoc,true]].sort());
  await ui.open({section:'vendors'});assert.equal(/data-action="invite"[\s\S]*?<\/form>/.exec(ui.html)![0].match(/ name="inv_/g)!.length,3,'only the shortlist is offered for the RFP');
  await ui.submit('invite',Object.fromEntries(['helix','north','meri'].map(k=>['inv_'+invOf(k).id,'on']).concat([['days','35']])));
  await sendInvites('rfp');const inv2=await x.rows(tid('croselection.invitations'));
  for(const k of ['helix','north','meri']){assert.equal(invOf(k,inv2).data.status,'rfp_invited');assert.equal(invOf(k,inv2).data.cda_status,'sent');}
  L=await x.links(w,ref('rfp'));const P:Record<string,any>={};for(const k of ['helix','north','meri'])P[k]=await x.supplier(L[invOf(k,inv2).id],mail[k]);
  assert.equal((await P.helix.get('/documents/'+pack)).status,403);assert.equal((await P.helix.get('/documents/'+cdaDoc)).status,200);
  for(const k of ['helix','north','meri'])assert.equal((await P[k].post('/files',{filename:'Signed CDA '+k+' (fictional).pdf',mime:'application/pdf',base64:Buffer.from('%PDF-1.4 signed by '+k).toString('base64'),slot:'signed_cda'})).status,200);
  // Accepting the signed CDA marks it signed in the same review and unlocks the pack.
  for(const k of ['helix','north','meri']){await ui.click('panel:supplier:'+invOf(k,inv2).id);const a=/data-action="(accept-file:[0-9a-f-]+:[0-9a-f-]+)"/.exec(ui.html)![1];await ui.click(a);assert.ok(ui.last.proposal.body.records.changes.some((c:any)=>c.data.cda_status==='signed'));await ui.approve();}
  assert.equal((await P.helix.get('/documents/'+pack)).status,200);assert.ok((await x.rows(tid('croselection.invitations'))).filter((i:any)=>i.data.status==='rfp_invited').every((i:any)=>i.data.cda_status==='signed'));
  // Questions: a private reply to Helix; Northlake's question becomes an anonymised clarification emailed to all.
  await P.helix.post('/messages',{body:'Can site selection start before contract signature?'});const qb=await P.north.post('/messages',{body:'Northlake asks: is the central laboratory in scope?'});
  await ui.open({section:'messages'});assert.equal((text(ui.html).match(/1 unanswered/g)||[]).length,2);
  const exHelix=(await x.round(w,ref('rfp'))).exchanges.find((e:any)=>e.recordId===invOf('helix',inv2).id).id;
  await ui.click('thread:'+exHelix);await ui.submit('reply',{body:'Yes, under a letter of intent.',notify:'on'});assert.equal(ui.last.proposal.body.kind,'reply_exchange');await ui.approve();
  await ui.click('to-clarification:'+qb.body.id);await ui.submit('publish',{question:'Is the central laboratory in scope?',body:'Yes. Price it as a pass-through cost.',notify:'on',source:qb.body.id});
  assert.equal(ui.last.proposal.exchangeReview.askerShownAs,'A recipient asked');assert.equal(ui.last.proposal.exchangeReview.recipients,3);await ui.approve();
  x.sent.length=0;await x.deliver();const clar=x.sent.filter((m:any)=>/^Clarification published/.test(m.subject));assert.equal(clar.length,3);assert.ok(clar.every((m:any)=>!/Northlake asks/.test(m.text)));
  for(const k of ['helix','meri']){const m=(await P[k].get('/messages')).body.messages;assert.ok(m.some((v:any)=>v.kind==='clarification'&&v.question==='A recipient asked: Is the central laboratory in scope?'));assert.equal(m.some((v:any)=>/letter of intent/.test(v.body)),k==='helix');}
  await ui.open({section:'messages'});assert.match(text(ui.html),/No unanswered question\./);
  // Draft and resubmission until the deadline; the app offers only the latest version.
  assert.equal((await P.helix.post('/draft',{data:{total:1700000,currency:'EUR'}})).status,200);
  const v1=await P.helix.post('/submit',{nonce:randomUUID(),confirmed:true,data:{total:1720000,pass_through:215000,currency:'EUR',start_weeks:6,duration_months:20,answers:'Initial (fictional).'}});assert.equal(v1.body.version,1);
  const v2=await P.helix.post('/submit',{nonce:randomUUID(),confirmed:true,data:{total:1650000,pass_through:210000,currency:'EUR',start_weeks:6,duration_months:20,answers:'Revised after the clarification (fictional).',assumptions_delta:'10% more on-site visits.'}});assert.equal(v2.body.version,2);
  const bn=await P.north.post('/files',{filename:'Northlake proposal (fictional).pdf',mime:'application/pdf',base64:Buffer.from('Northlake prices (fictional)').toString('base64')});
  await P.north.post('/submit',{nonce:randomUUID(),confirmed:true,data:{total:780000,pass_through:180000,currency:'EUR',start_weeks:4,duration_months:18,answers:'Risk-based monitoring (fictional).',assumptions_delta:'40% fewer monitoring visits.'}});
  await P.meri.post('/submit',{nonce:randomUUID(),confirmed:true,data:{total:1060000,pass_through:195000,currency:'EUR',start_weeks:8,duration_months:21,answers:'Standard model (fictional).'}});
  await x.pg.query("UPDATE exchanges SET expires_at=now()-interval '1 minute' WHERE group_id=$1",[rfp.id]);
  assert.equal((await P.helix.post('/submit',{nonce:randomUUID(),confirmed:true,data:{total:1,currency:'EUR'}})).status,403,'closed after the deadline');
  await ui.open({section:'proposals'});const offered=[...ui.html.matchAll(/data-action="panel:accept:([0-9a-f-]+)"/g)].map(m=>m[1]);assert.ok(offered.includes(v2.body.id));assert.ok(!offered.includes(v1.body.id),'v1 is not offered');assert.equal(offered.length,3);
  for(const sid of offered){await ui.click('panel:accept:'+sid);await ui.submit('accept-submit',{});await ui.approve();}
  await ui.click('accept-file:'+bn.body.id);await ui.approve();
  const props=(await x.rows(tid('croselection.proposals'))).filter((p:any)=>p.data.round==='rfp');assert.equal(props.length,3);assert.equal(props.find((p:any)=>p.data.invitation_id===invOf('helix',inv2).id).data.version,2);
  assert.equal((await x.rows(tid('croselection.requests')))[0].data.stage,'proposals');
  // Map: the assistant proposes Northlake's lines from the accepted file; a person approves them.
  const pn=props.find((p:any)=>p.data.invitation_id===invOf('north',inv2).id)!;
  const lines=[['Study start-up',150000,null],['Monitoring',310000,'Assumes 40% fewer monitoring visits'],['Data management',140000,null],['Pass-through costs',180000,null]];
  const prep=await s.preview(ai,w,{kind:'bulk_records',changes:lines.map(([category,amount,deviation])=>({kind:'create_record',typeId:tid('croselection.proposal_lines'),data:{proposal_id:pn.id,category,amount,currency:'EUR',deviation}}))});await s.commit(actor,prep.id,prep.digest);
  await ui.open({section:'proposals'});let t=text(ui.html);
  assert.match(t,/Monitoring 520,000 [\s\S]*?310,000 −210,000 \(−40\.4%\) Assumes 40% fewer monitoring visits/);assert.match(t,/780,000 −280,000 \(−26\.4%\)/,'Northlake lines 780,000 vs baseline 1,060,000');
  // Scoring (blind scoring switched on in Settings for this selection) on the finalists.
  await ui.open({section:'settings'});await ui.submit('save-settings',{blind_scoring:'on'});await ui.approve();
  await ui.open({section:'vendors'});for(const k of ['helix','north']){await ui.click('inv-status:'+invOf(k,inv2).id+':finalist');await ui.approve();}
  await ui.open({section:'evaluation'});await ui.click('apply-criteria');await ui.approve();
  const order=['Relevant experience','Delivery team','Operational plan and timelines','Quality system','Price and price realism','Working relationship'];
  const crit=(await x.rows(tid('croselection.criteria'))).sort((a:any,b:any)=>order.indexOf(a.data.name)-order.indexOf(b.data.name));assert.deepEqual(crit.map((c:any)=>c.data.name),order);
  const card=async(reviewer:string,scores:Record<string,number[]>,only?:number)=>{await ui.change('f:card:reviewer',reviewer);await ui.click('panel:card:open');const form:any={};
   for(const [k,vals] of Object.entries(scores))crit.forEach((c:any,i:number)=>{if(only===undefined||i<only)form['s_'+invOf(k,inv2).id+'_'+c.id]=String(vals[i]);});await ui.submit('save-scores',form);await ui.approve();};
  const A={helix:[5,4,4,4,3,4],north:[3,3,3,2,5,3]},B={helix:[4,4,3,4,3,5],north:[4,3,2,3,5,4]};
  await card('A. Reviewer (fictional)',A,3);t=text(ui.html);assert.match(t,/Prices are hidden/);assert.doesNotMatch(t,/EUR 1,650,000/);
  await card('A. Reviewer (fictional)',A);await card('B. Reviewer (fictional)',{helix:B.helix},2);t=text(ui.html);assert.match(t,/Prices are hidden: 10 scores missing from 2 reviewers/);
  await card('B. Reviewer (fictional)',B);t=text(ui.html);assert.match(t,/Scoring is complete/);
  // Hand-checked: Helix 3.90; Northlake 3.28, fails the mandatory Quality system (2.5 < 3).
  assert.match(t,/Helix Clinical Research GmbH \(fictional\) Finalist 3\.90 \/ 5 6 of 6 criteria scored Passes/);assert.match(t,/Northlake CRO Ltd \(fictional\) Finalist 3\.28 \/ 5 6 of 6 criteria scored Fails mandatory: Quality system/);
  // Qualification is possible for any supplier at any stage, including one that is not a finalist (Meridian).
  assert.match(t,/Qualification[\s\S]*Meridian Trials SAS \(fictional\)/);
  await ui.click('apply-checklist:qualification:'+invOf('helix',inv2).id);await ui.approve();
  for(const c of (await x.rows(tid('croselection.checklist_items'))).filter((c:any)=>c.data.scope==='qualification')){await ui.click('check:'+c.id+':done');await ui.approve();}
  await ui.click('apply-checklist:bid_defence:'+invOf('helix',inv2).id);await ui.approve();
  // Decision and notices to all three RFP suppliers in one confirmation.
  await ui.open({section:'decision'});await ui.click('panel:decide:new');x.sent.length=0;
  await ui.submit('decide',{invitation_id:invOf('helix',inv2).id,rationale:'Highest weighted score (3.90); passes every mandatory criterion (fictional).',approver:'R. Lead (fictional)',decided_on:'2026-12-20',start_date:'2027-02-01',delivery_team:'Project lead, 4 CRAs, data manager (fictional).',notify:'on'});
  assert.equal(ui.last.proposal.body.replies.length,3);await ui.approve();
  const award=(await x.rows(tid('croselection.awards')))[0];assert.deepEqual([award.data.total,award.data.currency,award.data.duration_months,award.data.start_date],[1650000,'EUR',20,'2027-02-01']);
  await x.deliver();assert.equal(notices(x.sent).length,3);
  // Onboarding and handoff, then the request closes.
  await ui.click('apply-checklist:onboarding:');await ui.approve();
  for(const c of (await x.rows(tid('croselection.checklist_items'))).filter((c:any)=>c.data.scope==='onboarding')){await ui.click('check:'+c.id+':done');await ui.approve();}
  await ui.click('onboarding-status');await ui.approve();assert.equal((await x.rows(tid('croselection.awards')))[0].data.onboarding_status,'complete');
  await ui.click('prepare-handoff');await ui.approve();
  const h=JSON.parse((await x.rows(tid('croselection.awards')))[0].data.handoff_status);
  assert.equal(h.agreement.state,'draft_prepared');assert.deepEqual(h.runway.lines.map((l:any)=>[l.amount,l.monthly,l.months,l.start_month,l.end_month,l.category,l.driver]),[[1650000,82500,20,'2027-02-01','2028-09-01','Clinical','spread']]);assert.deepEqual(h.programs.milestones.map((m:any)=>m.date),['2027-01-18','2027-02-01','2027-05-02']);
  await ui.open({section:'decision'});await ui.click('link-agreement');await ui.approve();assert.ok((await x.rows(tid('croselection.awards')))[0].data.agreement_id);
  await ui.click('stage:closed');await ui.approve();assert.equal((await x.rows(tid('croselection.requests')))[0].data.stage,'closed');
  console.log('# full selection confirmations (from the new request):',ui.confirmations);
 }finally{await x.pg.close();}
});

test('Acceptance 3, 7 and 8: CDA via Contracts and skip; handoff into Contracts, Runway and Programs; assistants cannot decide; install orders, partner deleted, tab removed, archive stops links, restore re-enables unexpired ones, reinstall offers restore',async()=>{
 const x=await croSelectionSuite();const {f,s,actor,ai,T}=x;
 const change=(w:string,op:any)=>f.preview(actor,w,op).then((p:any)=>f.confirm(actor,w,p.id,p.digest));
 try{
  const w=(await s.createWorkspace(actor,'Example Therapeutics')).id;
  const ct=(await x.install(w,T.contracts,'Contracts')).receipt.appId,rw=(await x.install(w,T.runway,'Runway')).receipt.appId,pr=(await x.install(w,T.programs,'Programs')).receipt.appId;
  const cmap=x.mapOf(await x.comp(w,ct)),rmap=x.mapOf(await x.comp(w,rw)),pmap=x.mapOf(await x.comp(w,pr));
  const sel=await x.install(w,T.sel,'CRO Selection');const id=sel.receipt.appId,map=x.mapOf(await x.comp(w,id)),tid=(r:string)=>map[r].typeId;
  assert.equal(map.agreements.typeId,cmap.agreements.typeId,'one agreements register');assert.equal(map.organizations.typeId,cmap.organizations.typeId);assert.equal(map.programs.typeId,pmap.programs.typeId);
  assert.deepEqual((await x.comp(w,id)).manifest.roles.filter((r:any)=>r.role==='croselection.awards').map((r:any)=>[r.contract,!!r.readOnly]),[['croselection.v1',false]]);
  const prog=await x.save(w,tid('programs'),{name:'PX-101',stage:'phase_1',status:'active',archived:false});
  const helix=await x.save(w,tid('organizations'),{name:'Helix Clinical Research GmbH (fictional)',org_type:'cro',archived:false}),kest=await x.save(w,tid('organizations'),{name:'Kestrel Labs (fictional)',org_type:'other',archived:false});
  const ui=x.app(w,id);await ui.open({section:'requests'});
  const mk=async(form:any)=>{await ui.click('add:requests:full_selection');await ui.submit('save-record',{service_type:'clinical_study',scope:'Fictional scope.',currency:'EUR',response_deadline:'2026-12-31',...form});await ui.approve();return (await x.rows(tid('croselection.requests'))).find((r:any)=>r.data.name===form.name)!;};
  const rc=await mk({name:'Phase 2 CRO (CDA via Contracts)',cda_option:'contracts',program_id:prog}),rs=await mk({name:'Bioanalysis (CDA skip)',cda_option:'skip',service_type:'bioanalytical'});
  // 3a. CDA via Contracts: filed as a CDA / NDA agreement in the shared register; the invitation links to it.
  await ui.open({section:'vendors',requestId:rc.id});await ui.submit('longlist-add',{organization_id:helix,recipient_emails:'anna@helix.invalid'});await ui.approve();
  const inv=(await x.rows(tid('croselection.invitations'))).find((i:any)=>i.data.request_id===rc.id)!;
  await ui.click('panel:supplier:'+inv.id);await ui.click('cda-file:'+inv.id);await ui.approve();
  const cda=(await x.rows(cmap.agreements.typeId)).find((a:any)=>a.data.agreement_type==='cda_nda')!;assert.equal(cda.data.counterparty_id,helix);
  await ui.click('panel:supplier:'+inv.id);await ui.click('cda-file:'+inv.id);await ui.approve();
  const linked=(await x.rows(tid('croselection.invitations'))).find((i:any)=>i.id===inv.id)!;assert.equal(linked.data.cda_agreement_id,cda.id);assert.equal(linked.data.cda_status,'signed');
  const contractsUi=x.app(w,ct);await contractsUi.open({section:'cdas'});assert.match(text(contractsUi.html),/CDA — Helix Clinical Research GmbH \(fictional\)/,'Contracts shows the filed CDA');
  // 3b. CDA skip: "in place elsewhere" with its date.
  await ui.open({section:'vendors',requestId:rs.id});await ui.submit('longlist-add',{organization_id:kest,recipient_emails:'lab@kestrel.invalid'});await ui.approve();
  const inv2=(await x.rows(tid('croselection.invitations'))).find((i:any)=>i.data.request_id===rs.id)!;await ui.submit('cda-elsewhere:'+inv2.id,{cda_in_place_on:'2026-03-01'});await ui.approve();
  assert.deepEqual(((await x.rows(tid('croselection.invitations'))).find((i:any)=>i.id===inv2.id)!.data as any).cda_status,'in_place_elsewhere');
  // 7. Decision (no round, so no notices) and handoff with Contracts, Runway and Programs present.
  await x.save(w,tid('croselection.proposals'),{invitation_id:inv.id,round:'rfp',version:1,submitted_on:'2026-12-01',source:'manual',total:1200000,currency:'EUR',duration_months:12,accepted_on:'2026-12-02'});
  await ui.open({section:'decision',requestId:rc.id});await ui.click('panel:decide:new');
  await ui.submit('decide',{invitation_id:inv.id,rationale:'Only qualified bidder (fictional).',approver:'R. Lead (fictional)',decided_on:'2026-12-10',start_date:'2027-01-04'});await ui.approve();
  // Assistants never decide: with the documented Database rule (croselection.awards: Claude and ChatGPT read, no write) neither can prepare an award.
  const {AccessGrid}=await import('../src/domain/access-grid.js');const grid=new AccessGrid(x.db);
  const gv=(await grid.read(actor,w)).version??(await x.pg.query<any>('SELECT access_version FROM workspaces WHERE id=$1',[w])).rows[0].access_version;
  await grid.save(actor,w,{expectedVersion:gv,changes:(['claude','chatgpt'] as const).map(subject=>({subject,kind:'table',resourceId:tid('croselection.awards'),read:true,write:false}))});
  for(const who of [ai,{...ai,assistant:'claude'}])await assert.rejects(()=>s.preview(who,w,{kind:'create_record',typeId:tid('croselection.awards'),data:{request_id:rc.id,organization_id:helix,service_type:'clinical_study',currency:'EUR',rationale:'x',approver:'x',decided_on:'2026-12-11'}}),/This table is read-only/);
  assert.equal((await s.records(ai,w,tid('croselection.awards'),{limit:5,offset:0})).rows.length,1,'assistants still read the award');
  await ui.click('prepare-handoff');assert.equal(ui.last.proposal.body.kind,'apply_component_records');await ui.approve();
  const award=(await x.rows(tid('croselection.awards')))[0],h=JSON.parse(award.data.handoff_status);assert.equal(h.agreement.state,'draft_prepared');
  const msa=(await x.rows(cmap.agreements.typeId)).find((a:any)=>a.data.agreement_type==='msa')!;assert.equal(msa.data.status,'drafting');assert.equal(msa.data.counterparty_id,helix);
  await contractsUi.open({section:'pipeline'});assert.match(text(contractsUi.html),/MSA — Helix Clinical Research GmbH \(fictional\)/,'the draft agreement is in Contracts\' pipeline');
  await ui.click('link-agreement');await ui.approve();const agId=(await x.rows(tid('croselection.awards')))[0].data.agreement_id;assert.equal(agId,msa.id);
  // The assistant proposes the prepared items in the owning apps' tables; a person approves; Runway and Programs then show them.
  const [line]=h.runway.lines,ms=h.programs.milestones;
  const pl=await s.preview(ai,w,{kind:'create_record',typeId:rmap['runway.plan_lines'].typeId,data:{name:line.name,direction:'spend',category:line.category,driver:line.driver,amount:line.amount,currency:line.currency,start_month:line.start_month,end_month:line.end_month,status:line.status,counterparty_id:line.counterparty_id,agreement_id:agId,program_id:prog,archived:false}});await s.commit(actor,pl.id,pl.digest);
  const pm=await s.preview(ai,w,{kind:'bulk_records',changes:ms.map((m:any)=>({kind:'create_record',typeId:pmap['programs.plan_items'].typeId,data:{name:m.name,program_id:prog,item_type:'milestone',function:m.function,end_date:m.date,status:'planned',is_key:m.key,archived:false}}))});await s.commit(actor,pm.id,pm.digest);
  assert.deepEqual([line.amount,line.monthly,line.start_month,line.end_month],[1200000,100000,'2027-01-01','2027-12-01']);
  assert.equal((await x.rows(rmap['runway.plan_lines'].typeId)).length,1);assert.equal((await x.rows(pmap['programs.plan_items'].typeId)).length,3);
  for(const [appId,sec] of [[rw,'overview'],[pr,'overview'],[ct,'register']] as const){const v=x.app(w,appId);await v.open({section:sec});assert.doesNotMatch(text(v.html),/could not be shown/);}
  // 8a. Partner deleted (archived): CRO Selection keeps working, with the agreements still readable.
  await change(w,{kind:'archive_component',componentId:ct,expectedVersion:await x.version(ct),archived:true});
  await ui.open({section:'decision',requestId:rc.id});assert.doesNotMatch(text(ui.html),/could not be shown|Partial data/);assert.match(text(ui.html),/Award contract MSA — Helix Clinical Research GmbH \(fictional\) \(Phase 2 CRO \(CDA via Contracts\)\) — Drafting/);
  // 8b. Remove one tab (people) and add it back: nothing deleted, the same table reconnects.
  const c2=await x.comp(w,id),peopleType=map.people.typeId,records=Number((await x.pg.query<any>('SELECT count(*)::int n FROM records WHERE workspace_id=$1',[w])).rows[0].n);
  const withMap=(src:string,m:any)=>src.replace(/^const templateConfiguration=(.+);\n/,(_:string,json:string)=>'const templateConfiguration='+JSON.stringify({...JSON.parse(json),tableMap:JSON.stringify(m)})+';\n');
  const revise=async(m:any,b:any[],man:any[])=>{const cc=await x.comp(w,id);return change(w,{kind:'save_component',componentId:cc.id,expectedVersion:cc.version,projectId:cc.project_id,content:{name:cc.name,format:'frontend-js',source:withMap(cc.source,m),sourceAccess:cc.source_access??'workspace',bindings:b,manifest:{...cc.manifest,fields:man}}});};
  const noPeople={...map};delete noPeople.people;
  await revise(noPeople,c2.bindings.filter((b:any)=>b.typeId!==peopleType),c2.manifest.fields.filter((m:any)=>m.typeId!==peopleType));
  for(const sec of ['vendors','requests']){await ui.open({section:sec,requestId:rc.id});assert.doesNotMatch(text(ui.html),/could not be shown/,sec);}
  assert.equal(Number((await x.pg.query<any>('SELECT count(*)::int n FROM records WHERE workspace_id=$1',[w])).rows[0].n),records,'nothing deleted');
  await revise(map,c2.bindings,c2.manifest.fields);assert.equal(x.mapOf(await x.comp(w,id)).people.typeId,peopleType);
  // 8c. Archive the app: supplier links stop; restore re-enables the unexpired ones; reinstall offers the restore first.
  const sw=(await s.createWorkspace(actor,'Archive check')).id,a2=(await x.install(sw,T.sel,'CRO Selection')).receipt.appId,m2=x.mapOf(await x.comp(sw,a2)),u2=x.app(sw,a2);
  const o2=await x.save(sw,m2.organizations.typeId,{name:'Quartz (fictional)',org_type:'other',archived:false}),o3=await x.save(sw,m2.organizations.typeId,{name:'Ember (fictional)',org_type:'other',archived:false});
  await u2.open({section:'requests'});await u2.click('add:requests:quick_quote');await u2.submit('save-record',{name:'Q',service_type:'other',scope:'S',currency:'EUR',cda_option:'none',response_deadline:'2026-12-31'});await u2.approve();
  const q=(await x.rows(m2['croselection.requests'].typeId))[0];
  await u2.open({section:'vendors',requestId:q.id});for(const [o,m] of [[o2,'q@quartz.invalid'],[o3,'e@ember.invalid']]){await u2.submit('longlist-add',{organization_id:o,recipient_emails:m});await u2.approve();}
  await u2.click('panel:round:rfp');await u2.submit('create-round',{title:'Q',summary:'S'});
  const iv=await x.rows(m2['croselection.invitations'].typeId);await u2.open({section:'vendors'});await u2.submit('invite',Object.fromEntries(iv.map((i:any)=>['inv_'+i.id,'on']).concat([['days','10']])));
  const L=await x.links(sw,'request:'+q.id+':rfp'),[pa,pb]=[await x.supplier(L[iv[0].id],'q@quartz.invalid'),await x.supplier(L[iv[1].id],'e@ember.invalid')];
  assert.equal((await pa.get()).status,200);await x.pg.query("UPDATE exchanges SET expires_at=now()-interval '1 day' WHERE record_id=$1",[iv[1].id]);
  await change(sw,{kind:'archive_component',componentId:a2,expectedVersion:await x.version(a2),archived:true});
  assert.equal((await pa.get()).status,404);assert.equal((await pb.get()).status,404);
  const {installCatalogApp}=await import('../src/workspace/template-catalog.js');
  await assert.rejects(()=>installCatalogApp(f,actor,sw,{templateId:T.sel.id,version:T.sel.version,digest:T.sel.digest,name:'CRO Selection',requestKey:randomUUID()}),/Restore your archived CRO Selection app/);
  await change(sw,{kind:'archive_component',componentId:a2,expectedVersion:await x.version(a2),archived:false});
  assert.equal((await pa.get()).status,200,'unexpired link works again');const closed=await pb.get();assert.equal(closed.status,200);assert.equal(closed.body.closed,true,'expired link stays closed');
  await u2.open({section:'vendors'});assert.doesNotMatch(text(u2.html),/could not be shown/);
 }finally{await x.pg.close();}
});
