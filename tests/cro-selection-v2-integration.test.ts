import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {croSelectionSuite,text} from './fixtures/cro-selection.js';
import {tookEffect,settleCommand} from './settle.js';

/* CRO Selection 3.0.0 (v2) through the real installer, app runtime, direct saves, app commands, platform exchange (one confirmation when
 * something goes out), supplier pages and email delivery. Fictional data only; a disposable database, not a deployed account. */
const unesc=(s:string)=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');

test('3.0.0 installed and used: direct saves and an inline edit, a command, then a quick quote sent with one confirmation, a submission accepted with one confirmation',async()=>{
 const x=await croSelectionSuite('3.0.0');const {f,s,actor,ai,T}=x;
 const {listAppCommands,runAppCommand}=await import('../src/workspace/app-commands.js');
 try{
  assert.equal(T.sel.version,'3.0.0');
  const w=(await s.createWorkspace(actor,'Example Therapeutics')).id;await x.pg.query("UPDATE tenants SET name='Example Therapeutics' WHERE id=(SELECT tenant_id FROM workspaces WHERE id=$1)",[w]);
  const {receipt}=await x.install(w,T.sel,'CRO Selection');const id=receipt.appId,map=x.mapOf(await x.comp(w,id)),tid=(r:string)=>map[r].typeId;
  assert.equal(Object.keys(map).length,14);
  const ui=x.app(w,id);
  // Opening the installed app writes nothing and offers the first action.
  await ui.open();assert.match(ui.html,/class="k-empty"/);assert.match(ui.html,/data-action="add:requests:quick_quote"/);assert.equal(ui.last.proposal,null);assert.doesNotMatch(ui.html,/<header|<h1/);
  const orgs:Record<string,string>={};
  for(const [k,name,mail] of [['quartz','Quartz Tox Labs BV (fictional)','eva@quartz.invalid'],['ember','Ember Bioanalytics AB (fictional)','finn@ember.invalid'],['sable','Sable Biosciences Inc (fictional)','dev@sable.invalid']]){orgs[k]=await x.save(w,tid('organizations'),{name,org_type:k==='sable'?'cro':'other',archived:false});await x.save(w,tid('people'),{name:'Contact at '+name,organization_id:orgs[k],email:mail,archived:false});}
  // 1. A new quick quote saves directly from the form (P5): no review, the platform notice says so.
  await ui.open({section:'requests'});await ui.click('add:requests:quick_quote');assert.match(ui.html,/class="k-panel"/);
  await ui.submit('save-record',{name:'28-day GLP tox quote',service_type:'preclinical_study',scope:'28-day repeat-dose GLP toxicology study in rats with toxicokinetics (fictional).',assume_notes:'Three dose groups plus control.',assume_baseline:'In-life phase | 120000\nBioanalysis | 40000\nHistopathology | 30000\nReporting | 20000',currency:'EUR',cda_option:'none',response_deadline:'2026-12-31',owner:'N. Clinical (fictional)'});
  assert.equal(ui.last.proposal,null,'saved directly, no review');assert.ok(ui.last.saved,'the platform saved it');assert.deepEqual(ui.last.notice,{kind:'success',message:'Saved.'});
  let req=(await x.rows(tid('croselection.requests')))[0];assert.equal(req.data.mode,'quick_quote');assert.equal(req.data.question_deadline,'2026-12-24');assert.match(req.data.questions,/^What does your price include/);
  // 2. An inline edit with the version shown on screen.
  assert.match(ui.html,new RegExp(`data-action="edit:${req.id}:owner:${req.version}"`));
  await ui.change(`edit:${req.id}:owner:${req.version}`,'D. Lead (fictional)');assert.equal(ui.last.proposal,null);
  req=(await x.rows(tid('croselection.requests')))[0];assert.equal(req.data.owner,'D. Lead (fictional)');
  // A stale version is refused by the platform and nothing changes.
  await assert.rejects(()=>ui.change(`edit:${req.id}:owner:${req.version-1}`,'Someone else'),/stale|changed|version/i);assert.equal((await x.rows(tid('croselection.requests')))[0].data.owner,'D. Lead (fictional)');
  // 3. An app command as the assistant (Data level Edit): its record change saves directly.
  const list=await listAppCommands(f,ai,w,{appId:id});assert.equal(list.commands.length,27);
  const cc=await x.comp(w,id);const cmd=await runAppCommand(f,ai,w,{appId:id,expectedVersion:cc.version,command:'longlist.add',input:{request_id:req.id,organization_id:orgs.quartz},requestKey:randomUUID()});
  assert.equal(cmd.ok,true,cmd.error);assert.ok(tookEffect(cmd));await settleCommand(f,actor,w,cmd);
  const read=await runAppCommand(f,ai,w,{appId:id,expectedVersion:cc.version,command:'request.read',input:{request_id:req.id},requestKey:randomUUID()});assert.equal(read.ok,true,read.error);
  // 4. The other two suppliers from the screen: direct saves.
  await ui.open({section:'vendors',requestId:req.id});
  for(const k of ['ember','sable']){await ui.submit('longlist-add',{organization_id:orgs[k],recipient_emails:''});assert.equal(ui.last.proposal,null);}
  const invs=await x.rows(tid('croselection.invitations'));assert.deepEqual(invs.map((i:any)=>i.data.recipient_emails).sort(),['dev@sable.invalid','eva@quartz.invalid','finn@ember.invalid']);
  const before=ui.confirmations;
  // 5. Round and links are prepared on click (nothing reaches anyone); the send is the one confirmation and carries the invited status.
  await ui.click('panel:round:rfp');const brief=unesc(/name="summary"[^>]*>([^<]*)<\/textarea>/.exec(ui.html)![1]);assert.match(brief,/1\. What does your price include/);
  await ui.submit('create-round',{title:'Quote request: 28-day GLP tox',summary:brief,verify_email:'on'});assert.equal(ui.last.proposal,null);
  await ui.open({section:'vendors'});await ui.submit('invite',Object.fromEntries([...invs.map((i:any)=>['inv_'+i.id,'on']),['days','30']]));assert.equal(ui.last.proposal,null);
  const g1=await x.round(w,'request:'+req.id+':rfp');assert.equal(g1.exchanges.length,3);assert.equal(x.sent.length,0);assert.doesNotMatch(ui.html,/\/exchange#/);
  const form:any={email_type:'invitation',name_kind:'organization'};for(const e of g1.exchanges)form['to_'+e.id]='on';
  await ui.submit('prepare-email',form);assert.equal(ui.state().batch.recipients.length,3);
  await ui.click('send-email');const review=ui.last.proposal;assert.equal(review.body.kind,'send_exchange_email');
  assert.deepEqual(review.body.records.changes.map((c:any)=>c.data.status??c.data.stage).sort(),['rfp','rfp_invited','rfp_invited','rfp_invited'],'the record changes of the click travel with the send');
  assert.equal(x.sent.length,0,'nothing goes out before the confirmation');
  await ui.approve();await x.deliver();assert.equal(x.sent.length,3);assert.equal(ui.confirmations-before,1,'round, links and send: one confirmation');
  assert.ok((await x.rows(tid('croselection.invitations'))).every((i:any)=>i.data.status==='rfp_invited'));
  // 6. A supplier submits; accepting it is one confirmation that creates the proposal and marks the supplier submitted (session 6 flow).
  const L=await x.links(w,'request:'+req.id+':rfp'),quartzInv=invs.find((i:any)=>i.data.organization_id===orgs.quartz)!;
  const p=await x.supplier(L[quartzInv.id],'eva@quartz.invalid');assert.equal((await p.post('/acknowledge',{name:'Supplier quartz',email:'eva@quartz.invalid'})).status,200);
  const sub=await p.post('/submit',{nonce:randomUUID(),confirmed:true,data:{total:198000,currency:'EUR',start_weeks:6,duration_months:5,answers:'1. Includes TK and reports (fictional).'}});assert.equal(sub.status,200,sub.text);
  await ui.open({section:'proposals'});assert.match(text(ui.html),/Quartz Tox Labs BV \(fictional\) · version 1/);
  await ui.click('panel:accept:'+sub.body.id);await ui.submit('accept-submit',{});const rv=ui.last.proposal;
  assert.equal(rv.exchangeReview.target.kind,'create_record');assert.ok(rv.body.records.changes.some((c:any)=>c.data.status==='submitted'));
  await ui.approve();
  const props=await x.rows(tid('croselection.proposals'));assert.equal(props.length,1);assert.equal(props[0].data.total,198000);
  assert.equal((await x.rows(tid('croselection.invitations'))).find((i:any)=>i.id===quartzInv.id).data.status,'submitted');
  await ui.open({section:'proposals'});assert.match(text(ui.html),/Total \(EUR\) 210,000 198,000 −12,000 \(−5\.7%\)/);
  // 7. Settings are for the app's owners; the installer's user owns the app.
  await ui.open({section:'settings'});assert.match(text(ui.html),/Default currency/);
 }finally{await x.pg.close();}
});
