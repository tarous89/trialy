import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {croSelectionSuite,text} from './fixtures/cro-selection.js';
import {listExchangeSubmissions,prepareExchangeEmailBatch,listExchanges} from '../src/domain/external-exchange.js';

/* CRO_SELECTION.md §13 acceptance 1: quick quote end to end, through the real installer, app runtime, workspace review,
 * platform exchange, supplier pages and email delivery. Fictional data only; a disposable database, not a deployed account. */
const unesc=(s:string)=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
test('Acceptance 1: quick quote — three suppliers in one confirmed send (one personalised by the assistant), two submit with files, accept, compare, decide, notify all',async()=>{
 const x=await croSelectionSuite();const {f,s,actor,ai,T}=x;
 try{
  const w=(await s.createWorkspace(actor,'Example Therapeutics')).id;await x.pg.query("UPDATE tenants SET name='Example Therapeutics' WHERE id=(SELECT tenant_id FROM workspaces WHERE id=$1)",[w]);
  const {receipt}=await x.install(w,T.sel,'CRO Selection');const id=receipt.appId,map=x.mapOf(await x.comp(w,id));
  assert.equal(Object.keys(map).length,15);
  const ui=x.app(w,id);await ui.open({section:'settings'});
  // Default templates: one reviewed save, never seeded by the installer.
  assert.equal((await x.rows(map['croselection.templates'].typeId)).length,0);
  await ui.click('seed-templates');await ui.approve();assert.equal((await x.rows(map['croselection.templates'].typeId)).length,10);
  const orgs:Record<string,string>={};
  for(const [k,name,mail] of [['quartz','Quartz Tox Labs BV (fictional)','eva@quartz.invalid'],['ember','Ember Bioanalytics AB (fictional)','finn@ember.invalid'],['sable','Sable Biosciences Inc (fictional)','dev@sable.invalid']]){orgs[k]=await x.save(w,map.organizations.typeId,{name,org_type:k==='sable'?'cro':'other',archived:false});await x.save(w,map.people.typeId,{name:'Contact at '+name,organization_id:orgs[k],email:mail,archived:false});}
  // 1. New quick quote (reviewed).
  await ui.open({section:'requests'});await ui.click('add:requests:quick_quote');
  const qs=(await x.rows(map['croselection.templates'].typeId)).find((r:any)=>r.data.name==='Quick quote questions')!.id,grid=(await x.rows(map['croselection.templates'].typeId)).find((r:any)=>r.data.name==='Preclinical study bid grid')!.id;
  await ui.submit('save-record',{name:'28-day GLP tox quote',service_type:'preclinical_study',scope:'28-day repeat-dose GLP toxicology study in rats with toxicokinetics (fictional).',assume_notes:'Three dose groups plus control.',assume_baseline:'In-life phase | 120000\nBioanalysis | 40000\nHistopathology | 30000\nReporting | 20000',currency:'EUR',cda_option:'none',response_deadline:'2026-12-31',question_set_id:qs,grid_template_id:grid,owner:'N. Clinical (fictional)'});
  assert.equal(ui.last.proposal.body.kind,'apply_component_records');assert.equal((await x.rows(map['croselection.requests'].typeId)).length,0,'nothing is written before approval');
  await ui.approve();const req=(await x.rows(map['croselection.requests'].typeId))[0];assert.equal(req.data.mode,'quick_quote');assert.equal(req.data.stage,'need');assert.equal(req.data.question_deadline,'2026-12-24','question deadline = response deadline − 7 days');
  // 2. Longlist: three suppliers; recipients come from their contacts.
  await ui.open({section:'vendors',requestId:req.id});
  for(const k of ['quartz','ember','sable']){await ui.submit('longlist-add',{organization_id:orgs[k],recipient_emails:''});await ui.approve();}
  const invs=await x.rows(map['croselection.invitations'].typeId);assert.equal(invs.length,3);assert.deepEqual(invs.map((i:any)=>i.data.recipient_emails).sort(),['dev@sable.invalid','eva@quartz.invalid','finn@ember.invalid']);
  assert.equal((await x.rows(map['croselection.requests'].typeId))[0].data.stage,'longlist');
  // 3. One exchange group for the round, with the proposals table as response form and the quick-quote email defaults.
  await ui.click('panel:round:rfp');assert.match(text(ui.html),/Create the quote round/);
  const brief=unesc(/name="summary"[^>]*>([^<]*)<\/textarea>/.exec(ui.html)![1]);assert.match(brief,/1\. What does your price include/);
  await ui.submit('create-round',{title:'Quote request: 28-day GLP tox',summary:brief,verify_email:'on'});
  const groupReview=ui.last.proposal.exchangeReview.group;assert.equal(ui.last.proposal.body.kind,'create_exchange_group');
  assert.equal(groupReview.typeId,map['croselection.proposals'].typeId);assert.deepEqual(groupReview.fields,['total','currency','start_weeks','duration_months','answers','notes']);
  assert.match(groupReview.emailDefaults.invitation.body,/would like a quote from \{recipient_company\}/);assert.equal(Object.keys(groupReview.emailDefaults).length,6);assert.equal(groupReview.gate,'acknowledgement');
  await ui.approve();await ui.open({section:'vendors'});
  const link=/data-action="(link-round:[0-9a-f-]+:rfp)"/.exec(ui.html)![1];await ui.click(link);await ui.approve();
  const groupId=(await x.rows(map['croselection.requests'].typeId))[0].data.rfp_group_id;assert.ok(groupId);
  // 4. One exchange per supplier, bound to its invitation record.
  await ui.open({section:'vendors'});await ui.submit('invite',Object.fromEntries([...invs.map((i:any)=>['inv_'+i.id,'on']),['days','30']]));
  assert.equal(ui.last.proposal.body.kind,'invite_exchange');assert.deepEqual(ui.last.proposal.body.recipients.map((r:any)=>r.recordId).sort(),invs.map((i:any)=>i.id).sort());
  await ui.approve();await ui.click('record-links');await ui.approve();
  const invited=await x.rows(map['croselection.invitations'].typeId);assert.ok(invited.every((i:any)=>i.data.status==='rfp_invited'&&i.data.rfp_exchange_id));
  const exOf=Object.fromEntries(invited.map((i:any)=>[i.data.organization_id,i.data.rfp_exchange_id]));
  assert.doesNotMatch(ui.html,/\/exchange#/,'the app never shows recipient links');
  // 5. The assistant personalises one email: it can prepare a batch but never send it.
  const personal='Dear {recipient_name},\n\nThank you for the quick call on Monday. As discussed, we would value a quote from {recipient_company} for "{title}" by {deadline}:\n{link}';
  const aiBatch=await prepareExchangeEmailBatch(x.db,ai,w,{groupId,emailType:'invitation',exchangeIds:[exOf[orgs.ember]],overrides:{[exOf[orgs.ember]]:{body:personal}}});
  assert.ok(!JSON.stringify(await listExchanges(x.db,ai,w,{groupId})).includes('/exchange#'),'assistants never receive links');
  const aiSend=await f.preview(ai,w,{kind:'send_exchange_email',batchId:aiBatch.batchId,digest:aiBatch.digest});
  await assert.rejects(()=>f.confirm({...ai,actionConfirmed:true},w,aiSend.id,aiSend.digest),/cannot approve|human/i);
  // The person sends all three in one confirmed send: default text for two, the assistant's text for Ember.
  const form:any={email_type:'invitation',name_kind:'organization'};for(const k of ['quartz','ember','sable'])form['to_'+exOf[orgs[k]]]='on';form['pers_'+exOf[orgs.ember]]=personal;
  await ui.submit('prepare-email',form);const batch=ui.state().batch;assert.equal(batch.recipients.length,3);
  const shown=[...ui.html.matchAll(/<pre>([\s\S]*?)<\/pre>/g)].map(m=>unesc(m[1]));assert.deepEqual(shown,batch.recipients.map((r:any)=>r.text),'the send review shows each email exactly as returned');
  assert.equal(batch.from,'Example Therapeutics at TrialAgents <no-reply@trialagents.com>');assert.ok(batch.recipients.find((r:any)=>r.exchangeId===exOf[orgs.ember]).personalised);
  assert.match(batch.recipients.find((r:any)=>r.exchangeId===exOf[orgs.quartz]).subject,/^Example Therapeutics: Quote request: 28-day GLP tox, reply by /);
  await ui.click('send-email');assert.equal(ui.last.proposal.body.kind,'send_exchange_email');assert.equal(x.sent.length,0);await ui.approve();await x.deliver();
  assert.equal(x.sent.length,3,'one confirmed send, three emails');
  for(const r of batch.recipients){const m=x.sent.find((e:any)=>e.to[0]===r.to);assert.equal(m.text,r.text,'delivered text = preview');assert.equal(m.subject,r.subject);assert.equal(m.from,batch.from);}
  assert.match(x.sent.find((e:any)=>e.to[0]==='finn@ember.invalid').text,/Thank you for the quick call on Monday/);
  // 6. Two suppliers submit with files; the third does not.
  const L=await x.links(w,groupId),byOrg=Object.fromEntries(invited.map((i:any)=>[i.data.organization_id,L[i.id]]));
  const bids:Record<string,any>={};
  for(const [k,mail,total,weeks,months] of [['quartz','eva@quartz.invalid',198000,6,5],['ember','finn@ember.invalid',214500,4,4]] as const){
   const p=await x.supplier(byOrg[orgs[k]],mail);assert.equal((await p.post('/acknowledge',{name:'Supplier '+k,email:mail})).status,200);
   const up=await p.post('/files',{filename:k+' quote (fictional).pdf',mime:'application/pdf',base64:Buffer.from('%PDF-1.4 quote '+k).toString('base64')});assert.equal(up.status,200,up.text);
   const sub=await p.post('/submit',{nonce:randomUUID(),confirmed:true,data:{total,currency:'EUR',start_weeks:weeks,duration_months:months,answers:'1. Includes TK and reports (fictional).'}});assert.equal(sub.status,200,sub.text);bids[k]={sub:sub.body.id,file:up.body.id};}
  // Unaccepted values and files stay out of AI reach.
  assert.ok((await listExchangeSubmissions(x.db,ai,w,{groupId})).submissions.every((v:any)=>v.data===null));
  await ui.open({section:'overview'});assert.match(text(ui.html),/Submission v1 from Quartz Tox Labs BV \(fictional\) to accept/);
  // 7. Accept into croselection.proposals (target new, linked to the invitation), and accept the files.
  await ui.open({section:'proposals'});
  for(const k of ['quartz','ember']){await ui.click('panel:accept:'+bids[k].sub);await ui.submit('accept-submit',{});const rv=ui.last.proposal.exchangeReview;assert.equal(rv.target.kind,'create_record');assert.equal(rv.proposed.source,'exchange');assert.equal(rv.proposed.round,'quote');await ui.approve();
   await ui.click('accept-file:'+bids[k].file);assert.equal(ui.last.proposal.body.kind,'accept_exchange_file');await ui.approve();}
  await ui.click('record-accepted');await ui.approve();
  const props=await x.rows(map['croselection.proposals'].typeId);assert.equal(props.length,2);
  const inv2=await x.rows(map['croselection.invitations'].typeId);
  for(const p of props){const i=inv2.find((v:any)=>v.id===p.data.invitation_id)!;assert.equal(i.data.status,'submitted');assert.equal(p.data.version,1);assert.ok(p.data.document_ids,'accepted file recorded on the proposal');}
  assert.equal(inv2.find((v:any)=>v.data.organization_id===orgs.sable)!.data.status,'rfp_invited');
  // 8. Compare: both proposals in the grid against the baseline (EUR 210,000).
  await ui.open({section:'proposals'});const t=text(ui.html);
  assert.match(t,/Total \(EUR\) 210,000 214,500 \+4,500 \(\+2\.1%\) Stated total, no lines yet 198,000 −12,000 \(−5\.7%\)/,'Ember 214,500 = +4,500 (+2.1%); Quartz 198,000 = −12,000 (−5.7%)');assert.match(t,/Lowest bid: Quartz Tox Labs BV \(fictional\) at EUR 198,000, 5\.7% below the baseline/);
  // 9. Decide (a person), then notify all three suppliers with private messages.
  await ui.open({section:'decision'});await ui.click('panel:decide:new');
  const quartzInv=inv2.find((v:any)=>v.data.organization_id===orgs.quartz)!.id;
  await ui.submit('decide',{invitation_id:quartzInv,rationale:'Lowest price, complete scope, start in 6 weeks (fictional).',approver:'R. Lead (fictional)',decided_on:'2026-11-13',start_date:'2027-01-11'});await ui.approve();
  const award=(await x.rows(map['croselection.awards'].typeId))[0];assert.equal(award.data.organization_id,orgs.quartz);assert.equal(award.data.total,198000);assert.equal(award.data.currency,'EUR');assert.equal(award.data.duration_months,5);
  const inv3=await x.rows(map['croselection.invitations'].typeId);assert.deepEqual(inv3.map((i:any)=>[i.data.organization_id,i.data.status]).sort(),[[orgs.quartz,'selected'],[orgs.ember,'not_selected'],[orgs.sable,'not_selected']].sort());
  x.sent.length=0;
  for(const i of inv3){await ui.submit('notice:'+i.id,{});assert.equal(ui.last.proposal.body.kind,'reply_exchange');assert.equal(ui.last.proposal.body.notify,true);await ui.approve();}
  await x.deliver();const notices=x.sent.filter((m:any)=>!/^Your verification code/.test(m.subject));assert.equal(notices.length,3);assert.ok(notices.every((m:any)=>/^Message from Example Therapeutics: Quote request: 28-day GLP tox$/.test(m.subject)));
  for(const [k,mail,re] of [['quartz','eva@quartz.invalid',/we have selected Quartz Tox Labs BV \(fictional\)/],['ember','finn@ember.invalid',/selected another supplier[\s\S]*debrief/],['sable','dev@sable.invalid',/selected another supplier/]] as const){const p=await x.supplier(byOrg[orgs[k]],mail);const m=(await p.get('/messages')).body.messages;assert.ok(m.some((v:any)=>re.test(v.body)),k);}
  await ui.open({section:'decision'});assert.equal((text(ui.html).match(/Notice sent/g)||[]).length,3);
 }finally{await x.pg.close();}
});

/* §13 acceptance 2: full selection end to end. Weighted scores and totals were computed by hand (QA.md). */
test('Acceptance 2: full selection — RFI → shortlist → RFP with pack and gated CDA → private reply and anonymised clarification → draft and resubmission → deadline → accept and map → blind scoring and qualification → bid defence → decision → notices → onboarding → handoff',async()=>{
 const x=await croSelectionSuite();const {f,s,actor,ai,T}=x;
 try{
  const w=(await s.createWorkspace(actor,'Example Therapeutics')).id;await x.pg.query("UPDATE tenants SET name='Example Therapeutics' WHERE id=(SELECT tenant_id FROM workspaces WHERE id=$1)",[w]);
  const {receipt}=await x.install(w,T.sel,'CRO Selection');const id=receipt.appId,map=x.mapOf(await x.comp(w,id)),tid=(r:string)=>map[r].typeId;
  const ui=x.app(w,id);await ui.open({section:'settings'});await ui.click('seed-templates');await ui.approve();
  const tpl=async(name:string)=>(await x.rows(tid('croselection.templates'))).find((r:any)=>r.data.name===name)!.id;
  const V=[['helix','Helix Clinical Research GmbH (fictional)','anna@helix.invalid'],['north','Northlake CRO Ltd (fictional)','ben@northlake.invalid'],['meri','Meridian Trials SAS (fictional)','cara@meridian.invalid'],['sable','Sable Biosciences Inc (fictional)','dev@sable.invalid']];
  const org:Record<string,string>={},mail:Record<string,string>={};
  for(const [k,n,m] of V){org[k]=await x.save(w,tid('organizations'),{name:n,org_type:'cro',archived:false});mail[k]=m;await x.save(w,tid('people'),{name:'Contact '+k+' (fictional)',organization_id:org[k],email:m,archived:false});}
  const pack=await x.doc(w,'PX-101-201 request pack (fictional).pdf','%PDF-1.4 request pack'),cdaDoc=await x.doc(w,'Mutual CDA (fictional).pdf','%PDF-1.4 mutual cda');
  await ui.open({section:'requests'});await ui.click('add:requests:full_selection');
  await ui.submit('save-record',{name:'PX-101 Phase 2 CRO',service_type:'clinical_study',scope:'Full-service CRO for a Phase 2 study (fictional).',assume_notes:'120 patients, 24 sites, 8 monitoring visits per site.',assume_baseline:'Study start-up | 180000\nMonitoring | 520000\nData management | 160000\nPass-through costs | 200000',currency:'EUR',cda_option:'send_pdf',cda_gate:'on',response_deadline:'2026-12-18',decision_due:'2027-01-15',question_set_id:await tpl('Clinical study RFP questions'),grid_template_id:'',criteria_set_id:await tpl('Standard selection criteria'),owner:'C. Ops (fictional)'});
  await ui.approve();const req=(await x.rows(tid('croselection.requests')))[0];assert.equal(req.data.cda_gate,true);
  // RFI round: its own exchange group, capability questions only.
  await ui.open({section:'vendors',requestId:req.id,round:'rfi'});
  for(const [k] of V){await ui.submit('longlist-add',{organization_id:org[k]});await ui.approve();}
  await ui.click('round:rfi');await ui.click('panel:round:rfi');const rfiBrief=/name="summary"[^>]*>([^<]*)<\/textarea>/.exec(ui.html)![1];assert.match(rfiBrief,/1\. Describe your experience/);
  await ui.submit('create-round',{title:'RFI: PX-101 Phase 2 CRO',summary:rfiBrief,verify_email:'on'});const rfiConf=ui.last.proposal.exchangeReview.group;assert.deepEqual(rfiConf.fields,['answers','notes']);assert.equal(rfiConf.gate,'none');assert.match(rfiConf.emailDefaults.invitation.body,/capability questionnaire/);
  await ui.approve();await ui.open({section:'vendors'});await ui.click(/data-action="(link-round:[0-9a-f-]+:rfi)"/.exec(ui.html)![1]);await ui.approve();
  const inv0=await x.rows(tid('croselection.invitations')),invOf=(k:string,list:any[]=inv0)=>list.find((i:any)=>i.data.organization_id===org[k])!;
  await ui.submit('invite',Object.fromEntries(inv0.map((i:any)=>['inv_'+i.id,'on']).concat([['days','14']])));await ui.approve();await ui.click('record-links');await ui.approve();
  const rfiGroup=(await x.rows(tid('croselection.requests')))[0].data.rfi_group_id;let L=await x.links(w,rfiGroup);
  for(const k of ['helix','north','meri']){const p=await x.supplier(L[invOf(k).id],mail[k]);const r=await p.post('/submit',{nonce:randomUUID(),confirmed:true,data:{answers:'1. Phase 2 experience (fictional '+k+').'}});assert.equal(r.status,200,r.text);}
  await ui.open({section:'proposals'});
  const rfiSubs=[...ui.html.matchAll(/data-action="panel:accept:([0-9a-f-]+)"/g)].map(m=>m[1]);assert.equal(rfiSubs.length,3);
  for(const sid of rfiSubs){await ui.click('panel:accept:'+sid);await ui.submit('accept-submit',{});assert.equal(ui.last.proposal.exchangeReview.proposed.round,'rfi');await ui.approve();}
  // Shortlist from the RFI answers; Sable did not answer and is declined.
  await ui.open({section:'vendors'});for(const k of ['helix','north','meri'])await (async()=>{await ui.click('inv-status:'+invOf(k).id+':shortlisted');await ui.approve();})();
  await ui.click('inv-status:'+invOf('sable').id+':declined');await ui.approve();
  // RFP round: request pack and CDA; the gate locks the pack until the signed CDA is accepted.
  await ui.click('round:rfp');await ui.click('panel:round:rfp');const rfpBrief=/name="summary"[^>]*>([^<]*)<\/textarea>/.exec(ui.html)![1];assert.match(rfpBrief,/Our assumptions[\s\S]*Bid grid[\s\S]*1\. Confirm that your price follows/);
  await ui.submit('create-round',{title:'RFP: PX-101 Phase 2 CRO',summary:rfpBrief,['doc_'+pack]:'on',cda_document:cdaDoc,verify_email:'on'});
  const rfpConf=ui.last.proposal.exchangeReview.group;assert.equal(rfpConf.gate,'signed_document');assert.equal(rfpConf.gateSlot,'signed_cda');assert.deepEqual(rfpConf.slots,[{key:'signed_cda',label:'Signed CDA',required:true}]);assert.deepEqual(rfpConf.documents.map((d:any)=>[d.versionId,d.gate]).sort(),[[pack,false],[cdaDoc,true]].sort());
  assert.match(rfpConf.emailDefaults.invitation.body,/submit a proposal/);
  await ui.approve();await ui.open({section:'vendors'});await ui.click(/data-action="(link-round:[0-9a-f-]+:rfp)"/.exec(ui.html)![1]);await ui.approve();
  assert.equal(/data-action="invite"[\s\S]*?<\/form>/.exec(ui.html)![0].match(/ name="inv_/g)!.length,3,'only the shortlist is offered for the RFP');
  const inv1=await x.rows(tid('croselection.invitations'));await ui.submit('invite',Object.fromEntries(['helix','north','meri'].map(k=>['inv_'+invOf(k,inv1).id,'on']).concat([['days','35']])));await ui.approve();
  await ui.click('record-links');await ui.approve();const inv2=await x.rows(tid('croselection.invitations'));
  for(const k of ['helix','north','meri']){assert.equal(invOf(k,inv2).data.status,'rfp_invited');assert.equal(invOf(k,inv2).data.cda_status,'sent');}
  const rfpGroup=(await x.rows(tid('croselection.requests')))[0].data.rfp_group_id;L=await x.links(w,rfpGroup);
  const P:Record<string,any>={};for(const k of ['helix','north','meri'])P[k]=await x.supplier(L[invOf(k,inv2).id],mail[k]);
  // Gate: pack locked, CDA downloadable; the signed CDA comes back into its slot; the owner accepts it in the supplier panel.
  assert.equal((await P.helix.get('/documents/'+pack)).status,403);assert.equal((await P.helix.get('/documents/'+cdaDoc)).status,200);
  for(const k of ['helix','north','meri']){const r=await P[k].post('/files',{filename:'Signed CDA '+k+' (fictional).pdf',mime:'application/pdf',base64:Buffer.from('%PDF-1.4 signed by '+k).toString('base64'),slot:'signed_cda'});assert.equal(r.status,200,r.text);}
  for(const k of ['helix','north','meri']){await ui.click('panel:supplier:'+invOf(k,inv2).id);assert.match(text(ui.html),/Signed CDA Received/);const fileId=/data-action="accept-file:([0-9a-f-]+)"/.exec(ui.html)![1];await ui.click('accept-file:'+fileId);await ui.approve();
   await ui.click('panel:supplier:'+invOf(k,inv2).id);await ui.click('cda-signed:'+invOf(k,inv2).id);await ui.approve();}
  assert.equal((await P.helix.get('/documents/'+pack)).status,200,'the pack unlocks once the signed CDA is accepted');
  assert.ok((await x.rows(tid('croselection.invitations'))).filter((i:any)=>i.data.status==='rfp_invited').every((i:any)=>i.data.cda_status==='signed'));
  // Questions: a private reply to Helix; Northlake's question becomes an anonymised clarification emailed to all.
  const qa=await P.helix.post('/messages',{body:'Can site selection start before contract signature?'});assert.equal(qa.status,200);
  const qb=await P.north.post('/messages',{body:'Northlake asks: is the central laboratory in scope?'});
  await ui.open({section:'messages'});assert.equal((text(ui.html).match(/1 unanswered/g)||[]).length,2,'one unanswered question each from Helix and Northlake');
  const exHelix=invOf('helix',await x.rows(tid('croselection.invitations'))).data.rfp_exchange_id;
  await ui.click('thread:'+exHelix);await ui.submit('reply',{body:'Yes, under a letter of intent.',notify:'on'});assert.equal(ui.last.proposal.body.kind,'reply_exchange');await ui.approve();
  await ui.click('to-clarification:'+qb.body.id);await ui.submit('publish',{question:'Is the central laboratory in scope?',body:'Yes. Price it as a pass-through cost.',notify:'on',source:qb.body.id});
  assert.equal(ui.last.proposal.exchangeReview.askerShownAs,'A recipient asked');assert.equal(ui.last.proposal.exchangeReview.recipients,3);await ui.approve();
  x.sent.length=0;await x.deliver();const clar=x.sent.filter((m:any)=>/^Clarification for all bidders/.test(m.subject));assert.equal(clar.length,3);assert.ok(clar.every((m:any)=>!/Northlake asks/.test(m.text)));
  assert.equal(x.sent.filter((m:any)=>/^Message from Example Therapeutics/.test(m.subject)).length,1,'the private reply is emailed only to Helix');
  for(const k of ['helix','meri']){const m=(await P[k].get('/messages')).body.messages;assert.ok(m.some((v:any)=>v.kind==='clarification'&&v.question==='A recipient asked: Is the central laboratory in scope?'));assert.equal(m.some((v:any)=>/letter of intent/.test(v.body)),k==='helix');}
  await ui.open({section:'messages'});assert.match(text(ui.html),/No unanswered question\./);assert.doesNotMatch(text(ui.html),/\d unanswered/);
  // Draft and resubmission until the deadline.
  assert.equal((await P.helix.post('/draft',{data:{total:1700000,currency:'EUR'}})).status,200);
  const v1=await P.helix.post('/submit',{nonce:randomUUID(),confirmed:true,data:{total:1720000,pass_through:215000,currency:'EUR',start_weeks:6,duration_months:20,answers:'Initial proposal (fictional).'}});assert.equal(v1.body.version,1);
  const v2=await P.helix.post('/submit',{nonce:randomUUID(),confirmed:true,data:{total:1650000,pass_through:210000,currency:'EUR',start_weeks:6,duration_months:20,answers:'Revised after the clarification (fictional).',assumptions_delta:'10% more on-site visits.'}});assert.equal(v2.body.version,2);
  const bn=await P.north.post('/files',{filename:'Northlake proposal (fictional).pdf',mime:'application/pdf',base64:Buffer.from('Northlake prices: start-up 150000; monitoring 310000; data 140000; pass-through 180000').toString('base64')});
  await P.north.post('/submit',{nonce:randomUUID(),confirmed:true,data:{total:780000,pass_through:180000,currency:'EUR',start_weeks:4,duration_months:18,answers:'Risk-based monitoring (fictional).',assumptions_delta:'40% fewer monitoring visits.'}});
  await P.meri.post('/submit',{nonce:randomUUID(),confirmed:true,data:{total:1060000,pass_through:195000,currency:'EUR',start_weeks:8,duration_months:21,answers:'Standard model (fictional).'}});
  // Deadline: the exchange expiry. Afterwards submissions are refused.
  await x.pg.query("UPDATE exchanges SET expires_at=now()-interval '1 minute' WHERE group_id=$1",[rfpGroup]);
  assert.equal((await P.helix.post('/submit',{nonce:randomUUID(),confirmed:true,data:{total:1,currency:'EUR'}})).status,403);
  // Accept the latest version of each supplier and its files; v1 of Helix is shown as superseded and not accepted.
  await ui.open({section:'proposals'});assert.match(text(ui.html),/version 1 Superseded by a newer version/);
  for(const sid of [v2.body.id,...[...ui.html.matchAll(/data-action="panel:accept:([0-9a-f-]+)"/g)].map(m=>m[1]).filter(v=>v!==v1.body.id&&v!==v2.body.id)]){await ui.click('panel:accept:'+sid);await ui.submit('accept-submit',{});await ui.approve();}
  await ui.click('accept-file:'+bn.body.id);await ui.approve();await ui.click('record-accepted');await ui.approve();
  const props=(await x.rows(tid('croselection.proposals'))).filter((p:any)=>p.data.round==='rfp');assert.equal(props.length,3);
  assert.equal(props.find((p:any)=>p.data.invitation_id===invOf('helix',inv2).id).data.version,2);
  // Map: the assistant proposes Northlake's lines from the accepted file; a person approves them.
  const pn=props.find((p:any)=>p.data.invitation_id===invOf('north',inv2).id)!;
  const lines=[['Study start-up',150000,null],['Monitoring',310000,'Assumes 40% fewer monitoring visits'],['Data management',140000,null],['Pass-through costs',180000,null]];
  const prep=await s.preview(ai,w,{kind:'bulk_records',changes:lines.map(([category,amount,deviation])=>({kind:'create_record',typeId:tid('croselection.proposal_lines'),data:{proposal_id:pn.id,category,amount,currency:'EUR',deviation}}))});
  await s.commit(actor,prep.id,prep.digest);
  await ui.open({section:'proposals'});let t=text(ui.html);
  assert.match(t,/Monitoring 520,000 [\s\S]*?310,000 −210,000 \(−40\.4%\) Assumes 40% fewer monitoring visits/);assert.match(t,/780,000 −280,000 \(−26\.4%\)/,'Northlake lines 780,000 vs baseline 1,060,000');
  // Blind scoring on the finalists.
  await ui.open({section:'vendors'});for(const k of ['helix','north']){await ui.click('inv-status:'+invOf(k,inv2).id+':finalist');await ui.approve();}
  await ui.open({section:'evaluation'});await ui.click('apply-criteria');await ui.approve();
  const crit=await x.rows(tid('croselection.criteria'));assert.equal(crit.length,6);const cid=(n:string)=>crit.find((c:any)=>c.data.name===n)!.id;
  const card=async(reviewer:string,scores:Record<string,number[]>,only?:number)=>{await ui.change('f:card:reviewer',reviewer);await ui.click('panel:card:open');const form:any={};
   for(const [k,vals] of Object.entries(scores))crit.forEach((c:any,i:number)=>{if(only===undefined||i<only)form['s_'+invOf(k,inv2).id+'_'+c.id]=String(vals[i]);});await ui.submit('save-scores',form);await ui.approve();};
  const order=['Relevant experience','Delivery team','Operational plan and timelines','Quality system','Price and price realism','Working relationship'];assert.deepEqual(crit.map((c:any)=>c.data.name),order);
  const A={helix:[5,4,4,4,3,4],north:[3,3,3,2,5,3]},B={helix:[4,4,3,4,3,5],north:[4,3,2,3,5,4]};
  await card('A. Reviewer (fictional)',A,3);t=text(ui.html);assert.match(t,/Prices are hidden/);assert.doesNotMatch(t,/EUR 1,650,000/);
  await card('A. Reviewer (fictional)',A);assert.match(text(ui.html),/Scoring is complete: prices are shown/);
  await card('B. Reviewer (fictional)',{helix:B.helix},2);t=text(ui.html);assert.match(t,/Prices are hidden: 10 scores missing from 2 reviewers/);assert.doesNotMatch(t,/EUR 780,000/);
  await card('B. Reviewer (fictional)',B);t=text(ui.html);assert.match(t,/Scoring is complete/);
  // Hand-checked: Helix means 4.5,4,3.5,4,3,4.5 → (112.5+80+70+60+45+22.5)/100 = 3.90; Northlake 3.5,3,2.5,2.5,5,3.5 → (87.5+60+50+37.5+75+17.5)/100 = 3.28, fails the mandatory Quality system (2.5 < 3).
  assert.match(t,/Helix Clinical Research GmbH \(fictional\) Finalist 3\.90 \/ 5 6 of 6 criteria scored Passes/);assert.match(t,/Northlake CRO Ltd \(fictional\) Finalist 3\.28 \/ 5 6 of 6 criteria scored Fails mandatory: Quality system/);
  assert.match(t,/EUR 1,650,000/);assert.match(t,/EUR 780,000/);
  // Qualification for Helix (all done) and the bid defence.
  await ui.click('apply-checklist:qualification:'+invOf('helix',inv2).id);await ui.approve();
  for(const c of (await x.rows(tid('croselection.checklist_items'))).filter((c:any)=>c.data.scope==='qualification')){await ui.click('check:'+c.id+':done');await ui.approve();}
  await ui.click('apply-checklist:bid_defence:'+invOf('helix',inv2).id);await ui.approve();
  const bd=(await x.rows(tid('croselection.checklist_items'))).filter((c:any)=>c.data.scope==='bid_defence');assert.equal(bd.length,4);await ui.click('check:'+bd[2].id+':done');await ui.approve();
  await ui.open({section:'evaluation'});assert.match(text(ui.html),/Helix Clinical Research GmbH \(fictional\) 5 \/ 5 done/);
  // Decision by a person, then notices to all three RFP suppliers.
  await ui.open({section:'decision'});await ui.click('panel:decide:new');
  await ui.submit('decide',{invitation_id:invOf('helix',inv2).id,rationale:'Highest weighted score (3.90); passes every mandatory criterion; realistic monitoring assumptions (fictional).',approver:'R. Lead (fictional)',decided_on:'2026-12-20',start_date:'2027-02-01',delivery_team:'Project lead, 4 CRAs, data manager (fictional).'});await ui.approve();
  const award=(await x.rows(tid('croselection.awards')))[0];assert.deepEqual([award.data.total,award.data.currency,award.data.duration_months,award.data.start_date],[1650000,'EUR',20,'2027-02-01']);
  x.sent.length=0;for(const k of ['helix','north','meri']){await ui.submit('notice:'+invOf(k,inv2).id,{});await ui.approve();}
  await x.deliver();assert.equal(x.sent.filter((m:any)=>/^Message from Example Therapeutics/.test(m.subject)).length,3);
  // Onboarding and handoff, then the request closes.
  await ui.click('apply-checklist:onboarding:');await ui.approve();
  for(const c of (await x.rows(tid('croselection.checklist_items'))).filter((c:any)=>c.data.scope==='onboarding')){await ui.click('check:'+c.id+':done');await ui.approve();}
  await ui.click('onboarding-status');await ui.approve();assert.equal((await x.rows(tid('croselection.awards')))[0].data.onboarding_status,'complete');
  await ui.click('prepare-handoff');await ui.approve();
  const h=JSON.parse((await x.rows(tid('croselection.awards')))[0].data.handoff_status);
  assert.equal(h.agreement.state,'draft_prepared');assert.deepEqual(h.runway.lines.map((l:any)=>[l.amount,l.monthly,l.months,l.start_month,l.end_month,l.category,l.driver]),[[1650000,82500,20,'2027-02-01','2028-09-01','Clinical','spread']]);assert.deepEqual(h.programs.milestones.map((m:any)=>m.date),['2027-01-18','2027-02-01','2027-05-02']);
  await ui.open({section:'decision'});await ui.click('link-agreement');await ui.approve();assert.ok((await x.rows(tid('croselection.awards')))[0].data.agreement_id);
  await ui.click('stage:closed');await ui.approve();assert.equal((await x.rows(tid('croselection.requests')))[0].data.stage,'closed');
 }finally{await x.pg.close();}
});

/* §13 acceptance 3, 7 and 8: CDA via Contracts and CDA skip; handoff with Contracts, Runway and Programs present; modularity (rule 9) and archive first. */
test('Acceptance 3, 7 and 8: CDA via Contracts and skip; handoff into Contracts, Runway and Programs; install orders, partner deleted, tab removed, archive stops links, restore re-enables unexpired ones, reinstall offers restore',async()=>{
 const x=await croSelectionSuite();const {f,s,actor,ai,T}=x;
 const change=(w:string,op:any)=>f.preview(actor,w,op).then((p:any)=>f.confirm(actor,w,p.id,p.digest));
 try{
  // Install order: Contracts, Runway and Programs first, then CRO Selection connects their shared tables at install (reuse, never copy).
  const w=(await s.createWorkspace(actor,'Example Therapeutics')).id;
  const ct=(await x.install(w,T.contracts,'Contracts')).receipt.appId,rw=(await x.install(w,T.runway,'Runway')).receipt.appId,pr=(await x.install(w,T.programs,'Programs')).receipt.appId;
  const cmap=x.mapOf(await x.comp(w,ct)),rmap=x.mapOf(await x.comp(w,rw)),pmap=x.mapOf(await x.comp(w,pr));
  const sel=await x.install(w,T.sel,'CRO Selection');const id=sel.receipt.appId,map=x.mapOf(await x.comp(w,id)),tid=(r:string)=>map[r].typeId;
  assert.deepEqual(sel.step.tables.map((t:any)=>t.role).sort(),['agreements','organizations','people','programs','studies'].filter(r=>sel.step.tables.some((t:any)=>t.role===r)).sort());
  assert.equal(map.agreements.typeId,cmap.agreements.typeId,'one agreements register');assert.equal(map.organizations.typeId,cmap.organizations.typeId);assert.equal(map.programs.typeId,pmap.programs.typeId);
  assert.deepEqual((await x.comp(w,id)).manifest.roles.filter((r:any)=>r.role==='croselection.awards').map((r:any)=>[r.contract,!!r.readOnly]),[['croselection.v1',false]]);
  const prog=await x.save(w,tid('programs'),{name:'PX-101',stage:'phase_1',status:'active',archived:false});
  const helix=await x.save(w,tid('organizations'),{name:'Helix Clinical Research GmbH (fictional)',org_type:'cro',archived:false}),kest=await x.save(w,tid('organizations'),{name:'Kestrel Labs (fictional)',org_type:'other',archived:false});
  const ui=x.app(w,id);await ui.open({section:'requests'});
  const mk=async(form:any)=>{await ui.click('add:requests:full_selection');await ui.submit('save-record',{service_type:'clinical_study',scope:'Fictional scope.',currency:'EUR',response_deadline:'2026-12-31',...form});await ui.approve();return (await x.rows(tid('croselection.requests'))).find((r:any)=>r.data.name===form.name)!;};
  const rc=await mk({name:'Phase 2 CRO (CDA via Contracts)',cda_option:'contracts',program_id:prog}),rs=await mk({name:'Bioanalysis (CDA skip)',cda_option:'skip',service_type:'bioanalytical'});
  // 3a. CDA via Contracts: the signed CDA is filed as a CDA / NDA agreement in the shared register; the invitation links to it.
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
  // 7. Decision and handoff with Contracts, Runway and Programs present.
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
  const pl=await s.preview(ai,w,{kind:'create_record',typeId:rmap['runway.plan_lines'].typeId,data:{name:line.name,direction:'spend',category:line.category,driver:line.driver,amount:line.amount,currency:line.currency,start_month:line.start_month,end_month:line.end_month,status:line.status,counterparty_id:line.counterparty_id,agreement_id:agId,program_id:prog,archived:false}});
  await s.commit(actor,pl.id,pl.digest);
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
  assert.match(text(ui.html),/Partial data/,'the missing people table is reported, not hidden');
  assert.equal(Number((await x.pg.query<any>('SELECT count(*)::int n FROM records WHERE workspace_id=$1',[w])).rows[0].n),records,'nothing deleted');
  await revise(map,c2.bindings,c2.manifest.fields);assert.equal(x.mapOf(await x.comp(w,id)).people.typeId,peopleType);
  // 8c. Archive the app: supplier links stop; restore re-enables the unexpired ones; reinstall offers the restore first.
  const sw=(await s.createWorkspace(actor,'Archive check')).id,a2=(await x.install(sw,T.sel,'CRO Selection')).receipt.appId,m2=x.mapOf(await x.comp(sw,a2)),u2=x.app(sw,a2);
  const o2=await x.save(sw,m2.organizations.typeId,{name:'Quartz (fictional)',org_type:'other',archived:false}),o3=await x.save(sw,m2.organizations.typeId,{name:'Ember (fictional)',org_type:'other',archived:false});
  await u2.open({section:'requests'});await u2.click('add:requests:quick_quote');await u2.submit('save-record',{name:'Q',service_type:'other',scope:'S',currency:'EUR',cda_option:'none',response_deadline:'2026-12-31'});await u2.approve();
  await u2.open({section:'vendors'});for(const [o,m] of [[o2,'q@quartz.invalid'],[o3,'e@ember.invalid']]){await u2.submit('longlist-add',{organization_id:o,recipient_emails:m});await u2.approve();}
  await u2.click('panel:round:rfp');await u2.submit('create-round',{title:'Q',summary:'S',verify_email:''});await u2.approve();await u2.open({section:'vendors'});await u2.click(/data-action="(link-round:[0-9a-f-]+:rfp)"/.exec(u2.html)![1]);await u2.approve();
  const iv=await x.rows(m2['croselection.invitations'].typeId);await u2.submit('invite',Object.fromEntries(iv.map((i:any)=>['inv_'+i.id,'on']).concat([['days','10']])));await u2.approve();
  const g2=(await x.rows(m2['croselection.requests'].typeId))[0].data.rfp_group_id,L=await x.links(sw,g2),[pa,pb]=[await x.supplier(L[iv[0].id],'q@quartz.invalid'),await x.supplier(L[iv[1].id],'e@ember.invalid')];
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
