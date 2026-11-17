import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readAppCommands,validateAppCommands,checkInput} from '../src/workspace/app-commands.js';
import {readCustomLayout,updateCustomLayout} from '../src/shared/custom-layout.js';
import {entry,schema,fullMap,fullBindings,cfgFor,render,fresh,approve,text,croSelectionSuite} from './fixtures/cro-selection.js';

/* CRO Selection 2.1.0: app commands (AI-native control), customization and the platform integration changes.
 * A command replays the same events as the click path, so the proposals must be identical. Figures are the hand-checked ones of QA.md. */
delete process.env.APP_COMMANDS_ENABLED; // On by default.
const cmd=async(rows:any[],id:string,input:any={},opts:any={})=>{const r=await render(rows,{},{kind:'command',action:id,value:JSON.stringify(input),form:{}},opts);return {...r,c:r.state.command};};
const ok=(r:any)=>{assert.equal(r.c.ok,true,r.c.error);return r.c.result;};
const decls=readAppCommands(entry.source);

test('27 declared commands: valid, each answered by the app, read commands never propose',async()=>{
 assert.equal(decls.length,27);validateAppCommands(entry.source);
 assert.deepEqual(decls.filter(c=>c.mode==='read').map(c=>c.id),['schema.describe','overview.read','request.read','grid.read','evaluation.read','decision.read']);
 assert.deepEqual(decls.filter(c=>c.mode==='layout').map(c=>c.id),['layout.save']);
 const rows=fresh();
 for(const c of decls){const r=await cmd(rows,c.id,{});assert.ok(r.c,'answers '+c.id);assert.doesNotMatch(String(r.c.error||''),/has no command/,c.id);if(c.mode==='read'&&c.id!=='schema.describe'&&c.id!=='overview.read')assert.match(r.c.error,/Missing input: request_id/);}
 for(const id of ['schema.describe','overview.read'])assert.equal((await cmd(rows,id)).changes.length,0);
 for(const id of ['request.read','grid.read','evaluation.read','decision.read'])for(const request_id of ['req-p2','req-tox','req-bioa']){const r=await cmd(rows,id,{request_id});ok(r);assert.equal(r.changes.length,0);assert.doesNotMatch(JSON.stringify(r.c.result),/\/exchange#/,'no recipient link');}
 // Declared inputs are checked by the platform before the app runs (production IDs are UUIDs).
 const dec=decls.find(c=>c.id==='decision.record')!;assert.throws(()=>checkInput(dec.input,{request_id:randomUUID()}),/invitation_id is required/);
 assert.throws(()=>checkInput(decls.find(c=>c.id==='invitation.status')!.input,{invitation_id:randomUUID(),status:'selected'}),/must be one of/,'selected only through decision.record');
 assert.equal((await cmd(rows,'nope.read')).c.error,'CRO Selection has no command nope.read. Use list_app_commands.');
});

test('read commands return the app\'s own figures: grid, weighted scores, blind state, overview and decision',async()=>{
 const rows=fresh();
 const g=ok(await cmd(rows,'grid.read',{request_id:'req-p2'}));
 assert.deepEqual(g.suppliers.map((s:any)=>[s.supplier,s.version,s.total,s.deviation,s.deviation_pct]),[['Helix Clinical Research GmbH (fictional)',2,1650000,50000,3.1],['Meridian Trials SAS (fictional)',1,1580000,-20000,-1.2],['Northlake CRO Ltd (fictional)',1,1240000,-360000,-22.5]]);
 assert.equal(g.baseline.total,1600000);const mon=g.suppliers[0].cells.find((c:any)=>c.category==='Monitoring');assert.deepEqual([mon.amount,mon.baseline,mon.deviation,mon.deviation_pct],[560000,520000,40000,7.7]);
 assert.deepEqual(g.suppliers[2].other_currencies,{USD:40000},'listed, never converted');assert.equal(g.suppliers[0].pass_through_pct,12.7);assert.equal(g.lowest_bid.pct_vs_baseline,-22.5);
 const e=ok(await cmd(rows,'evaluation.read',{request_id:'req-p2'}));
 const helix=e.suppliers.find((s:any)=>s.invitation_id==='inv-helix');assert.equal(helix.weighted_score,3.9);assert.equal(e.weight_sum,100);assert.equal(e.prices_hidden,false);assert.deepEqual(helix.price,{total:1650000,currency:'EUR'});
 assert.deepEqual(e.qualification.find((q:any)=>q.invitation_id==='inv-northlake').issues.map((x:any)=>x.item),['Quality audit or questionnaire reviewed']);
 // Blind scoring on and one score missing: prices are hidden in the command result too.
 const blind=fresh();blind.find(r=>r.id==='settings')!.data.blind_scoring=true;
 const eb=ok(await cmd(blind,'evaluation.read',{request_id:'req-p2'}));assert.equal(eb.prices_hidden,true);assert.equal(eb.missing_scores,1);assert.ok(eb.suppliers.every((s:any)=>s.price==='hidden until scoring is complete'));
 const o=ok(await cmd(rows,'overview.read'));assert.deepEqual(o.requests.map((r:any)=>[r.id,r.stage]),[['req-p2','evaluation'],['req-tox','proposals'],['req-bioa','closed']]);assert.equal(o.recent_awards[0].request_id,'req-bioa');
 const d=ok(await cmd(rows,'decision.read',{request_id:'req-p2'}));assert.equal(d.award,null);assert.deepEqual(d.candidates.find((c:any)=>c.invitation_id==='inv-northlake').qualification_issues,['Quality audit or questionnaire reviewed']);
 const rq=ok(await cmd(rows,'request.read',{request_id:'req-p2'}));assert.equal(rq.request.assumptions.baseline.length>0,true);assert.match(rq.summary_for_leadership,/^# PX-101 Phase 2 study CRO/);assert.ok(rq.suppliers.find((s:any)=>s.invitation_id==='inv-helix').exchange.rfp.opened!==undefined);
 const sd=ok(await cmd(rows,'schema.describe'));assert.deepEqual(Object.keys(sd.forms),['requests','organizations','people','invitations','proposals','lines','criteria','checklist']);assert.ok(sd.only_people[0].startsWith('Supplier communication'));
});

test('parity: each propose command returns exactly the proposal of the click path',async()=>{
 const same=async(clicks:{state:any,events:any[]},id:string,input:any)=>{const rows=fresh();let st:any=clicks.state,last:any;for(const ev of clicks.events){last=await render(rows,st,ev);st=last.state;}const c=await cmd(fresh(),id,input);ok(c);assert.ok(last.changes.length,id+' click path proposes');assert.deepEqual(c.changes,last.changes,id);return c;};
 await same({state:{section:'requests',requestId:'req-tox'},events:[{kind:'click',action:'edit:requests:req-tox'},{kind:'submit',action:'save-record',form:{owner:'New owner (fictional)'}}]},'record.save',{role:'requests',id:'req-tox',fields:{owner:'New owner (fictional)'}});
 await same({state:{section:'requests',requestId:'req-tox'},events:[{kind:'click',action:'stage:questions'}]},'request.stage',{request_id:'req-tox',stage:'questions'});
 await same({state:{section:'vendors',requestId:'req-tox'},events:[{kind:'click',action:'inv-status:inv-q-ember:declined'}]},'invitation.status',{invitation_id:'inv-q-ember',status:'declined'});
 await same({state:{section:'proposals',requestId:'req-p2'},events:[{kind:'click',action:'add:lines:prop-northlake-1:Monitoring'},{kind:'submit',action:'save-record',form:{amount:'310000',currency:'EUR',deviation:'Assumes 40% fewer monitoring visits (fictional)'}}]},'lines.save',{proposal_id:'prop-northlake-1',lines:[{category:'Monitoring',amount:310000,currency:'EUR',deviation:'Assumes 40% fewer monitoring visits (fictional)'}]});
 await same({state:{section:'evaluation',requestId:'req-p2',f:{card:{reviewer:'C. Reviewer (fictional)'}}},events:[{kind:'click',action:'panel:card:open'},{kind:'submit',action:'save-scores',form:{'s_inv-helix_crit-exp':'4','e_inv-helix_crit-exp':'Two similar studies (fictional)'}}]},'scores.save',{request_id:'req-p2',reviewer:'C. Reviewer (fictional)',scores:[{invitation_id:'inv-helix',criterion_id:'crit-exp',score:4,evidence:'Two similar studies (fictional)'}]});
 await same({state:{section:'evaluation',requestId:'req-p2'},events:[{kind:'click',action:'check:chk-helix-4:done'}]},'checklist.set_status',{item_id:'chk-helix-4',status:'done'});
 await same({state:{section:'decision',requestId:'req-bioa'},events:[{kind:'click',action:'prepare-handoff'}]},'handoff.prepare',{request_id:'req-bioa'});
 await same({state:{section:'settings'},events:[{kind:'submit',action:'save-settings',form:{blind_scoring:true,question_deadline_days:'5'}}]},'settings.save',{fields:{blind_scoring:true,question_deadline_days:5}});
 // The award: the user's decision, recorded in the app or by the assistant at the user's request; the same records either way.
 const form={invitation_id:'inv-helix',rationale:'Best weighted score; qualification complete (fictional).',approver:'R. Lead (fictional)',decided_on:'2026-11-20',start_date:'2027-02-01',notify:false};
 const c=await same({state:{section:'decision',requestId:'req-p2'},events:[{kind:'click',action:'panel:decide:new'},{kind:'submit',action:'decide',form}]},'decision.record',{request_id:'req-p2',invitation_id:'inv-helix',rationale:form.rationale,approver:form.approver,decided_on:form.decided_on,start_date:form.start_date});
 assert.deepEqual(c.changes.filter((x:any)=>x.kind==='update_record').map((x:any)=>[x.recordId,x.data.status??x.data.stage]),[['inv-helix','selected'],['inv-meridian','not_selected'],['inv-northlake','not_selected'],['req-p2','decision']]);
 assert.equal(c.xwrites.length,0,'the command sends no notice');assert.match(c.c.result.notices,/a person sends them in Decision & onboarding → Notify all/);
});

test('the award by an assistant follows the same rules; supplier communication is never a command; viewers only read',async()=>{
 const rows=fresh();
 // Northlake has an open qualification issue: refused without the user's override reason, recorded with it.
 const base={request_id:'req-p2',invitation_id:'inv-northlake',rationale:'Lowest price (fictional).',approver:'R. Lead (fictional)',decided_on:'2026-11-20'};
 assert.match((await cmd(rows,'decision.record',base)).c.error,/Qualification has an open issue for Northlake CRO Ltd \(fictional\)/);
 const okd=await cmd(rows,'decision.record',{...base,override_reason:'Audit planned (fictional).'});ok(okd);assert.match(okd.changes.find((x:any)=>x.typeId==='croselection.awards').data.rationale,/Qualification override: Audit planned/);
 const awarded=fresh();awarded.push({id:'award-x',version:0,role:'croselection.awards',data:{request_id:'req-p2',organization_id:'org-helix',service_type:'clinical_study',currency:'EUR',rationale:'R',approver:'A',decided_on:'2026-11-20'}});
 assert.match((await cmd(awarded,'decision.record',{...base,invitation_id:'inv-helix'})).c.error,/already has a decision/);
 assert.match((await cmd(rows,'record.save',{role:'invitations',context:{request_id:'req-p2'},fields:{}})).c.error,/longlist\.add/);
 // No command reaches suppliers: none is declared, and replaying an exchange click from a command is refused by the app.
 assert.ok(!decls.some(c=>/exchange|notify|send|reply|publish|accept|invite|extend|revoke|round/.test(c.id)));
 assert.doesNotMatch(entry.source!,/'notify-all'[^\n]{0,40}COMMANDS/);
 // Viewers: read commands work, propose commands are refused by the app as well as by the platform.
 ok(await cmd(rows,'grid.read',{request_id:'req-p2'},{writable:false}));
 assert.match((await cmd(rows,'request.stage',{request_id:'req-tox',stage:'questions'},{writable:false})).c.error,/You cannot change this request/);
 // Unknown fields are refused, not ignored.
 assert.match((await cmd(rows,'record.save',{role:'requests',id:'req-tox',fields:{colour:'red'}})).c.error,/Not an editable field of the request form: colour/);
});

test('customization: additional fields, form and column layout, stage names and the opening screen',async()=>{
 const rows=fresh();
 // A field added to the organizations table and declared in the table map shows in the form and details and is saved by record.save.
 const map=structuredClone(fullMap) as any,b=structuredClone(fullBindings) as any[];
 map.organizations.extraFields=[{key:'oncology_years',label:'Years in oncology',kind:'number'},{key:'tier',label:'Tier',kind:'select',options:['preferred','approved']}];map.organizations.writableExtra=['oncology_years','tier'];
 map['croselection.invitations'].extraFields=[];b.find(x=>x.typeId==='organizations').fields.push('oncology_years','tier');b.find(x=>x.typeId==='croselection.invitations').fields.push('legacy_note');
 rows.find(r=>r.id==='org-helix')!.data.oncology_years=12;rows.find(r=>r.id==='inv-helix')!.data.legacy_note='Kept from an older version (fictional)';
 const opts={config:cfgFor(map),bindings:b};
 const ed=await render(rows,{section:'vendors',requestId:'req-p2'},{kind:'click',action:'edit:organizations:org-helix'},opts);
 assert.match(text(ed.html),/Additional fields Years in oncology/);assert.match(ed.html,/name="tier"/);
 const sv=await cmd(rows,'record.save',{role:'vendors',id:'org-helix',fields:{oncology_years:15,tier:'preferred'}},opts);ok(sv);assert.deepEqual(sv.changes[0].data,{oncology_years:15,tier:'preferred'});
 assert.match((await cmd(rows,'record.save',{role:'vendors',id:'org-helix',fields:{tier:'gold'}},opts)).c.error,/Choose a valid tier/);
 const sup=await render(rows,{section:'vendors',requestId:'req-p2'},{kind:'click',action:'panel:supplier:inv-helix'},opts);assert.match(text(sup.html),/Additional fields Legacy note Kept from an older version \(fictional\)/);assert.match(text(sup.html),/Years in oncology 12/);
 assert.match((await cmd(rows,'record.save',{role:'invitations',id:'inv-helix',fields:{legacy_note:'x'}},opts)).c.error,/Not an editable field/,'undeclared bound fields are read only');
 const sd=ok(await cmd(rows,'schema.describe',{},opts));assert.deepEqual(sd.forms.organizations.fields.filter((f:any)=>f.additional).map((f:any)=>[f.key,f.kind,f.writable]),[['oncology_years','number',true],['tier','select',true]]);
 // Layout: a command proposes a profile the platform accepts; the app then hides the column and the form field and uses the label.
 const lay=await cmd(rows,'layout.save',{hide:['vendors:country','line_form:units'],labels:{'line_form:deviation':'What changed'},defaults:{'line_form:currency':'EUR'},order:{line_form:['amount','category']}});ok(lay);
 const prepared=`const templateConfiguration=${JSON.stringify({...entry.defaults,heading:'CRO Selection'})};\nconst templateBindings=[];\n${entry.source}`;
 const next=updateCustomLayout(prepared,lay.layout);assert.ok(readCustomLayout(next));
 const cfg=cfgFor(fullMap,{layoutProfile:JSON.stringify(lay.layout)});
 const vh=(await render(rows,{section:'vendors',requestId:'req-p2'},{kind:'open',action:''},{config:cfg})).html;assert.match(vh,/<th scope="col">Type<\/th>/);assert.doesNotMatch(vh,/<th scope="col">Country<\/th>/);
 const line=await render(rows,{section:'proposals',requestId:'req-p2'},{kind:'click',action:'add:lines:prop-northlake-1:'},{config:cfg});
 assert.doesNotMatch(line.html,/name="units"/);assert.match(text(line.html),/What changed/);assert.ok(line.html.indexOf('name="amount"')<line.html.indexOf('name="category"'),'amount first');assert.equal(line.state.editor.draft.currency,'EUR');
 assert.match((await cmd(rows,'layout.save',{hide:['request_form:name']})).c.error,/Name is required and cannot be hidden/);
 assert.match((await cmd(rows,'layout.save',{defaults:{'line_form:currency':'XYZ'}})).c.error,/must be one of/);
 // A profile saved by the layout gear ("group:field") hides the column; 2.0.0 hid nothing because it read "group.field".
 const ov=await render(rows,{section:'overview'},{kind:'open',action:''},{config:cfgFor(fullMap,{layoutProfile:JSON.stringify({visible:{'requests:owner':false}})})});
 assert.doesNotMatch(text(ov.html),/could not be shown/);assert.match(ov.html,/<th scope="col">Stage<\/th>/);assert.doesNotMatch(ov.html,/<th scope="col">Owner<\/th>/);
 // Stage names and the opening screen: one reviewed settings change; stage keys are unchanged.
 const set=await cmd(rows,'settings.save',{fields:{stage_labels:{rfp:'Proposal round'},opening_screen:'requests'}});ok(set);approve(rows,set.changes);
 const first=await render(rows,{},{kind:'open',action:''});assert.equal(first.state.section,'requests');assert.match(text(first.html),/Proposal round/);
 const rq=ok(await cmd(rows,'request.read',{request_id:'req-tox'}));assert.equal(rq.request.stage,'proposals');
 assert.match((await cmd(rows,'settings.save',{fields:{stage_labels:{tender:'x'}}})).c.error,/Unknown stage: tender/);
});

test('Runway is no longer prepared in the handoff; the award agreement is labelled as shared with Contracts',async()=>{
 const rows=fresh();const r=await cmd(rows,'handoff.prepare',{request_id:'req-bioa'});ok(r);
 const h=JSON.parse(r.changes.find((c:any)=>c.recordId==='award-bioa').data.handoff_status);assert.deepEqual(h.runway,{state:'read_by_runway',role:'croselection.awards'});assert.ok(!('lines' in h.runway));
 approve(rows,r.changes);const t=text((await render(rows,{section:'decision',requestId:'req-bioa'})).html);
 assert.match(t,/Runway : reads this award directly\. In Runway, open Plan → From other sources and choose Add to plan/);assert.doesNotMatch(t,/Ask your assistant to propose it in Runway/);
 assert.match(t,/shared agreements register; change its status in Contracts/);
 assert.equal(entry.documentation!.tasks.mode,'none');assert.ok(!(entry as any).recommendedAutomations&&!(entry as any).automationFeatures,'no automations are declared');
 assert.match(entry.instructions,/never propose Runway plan lines from an award/);assert.match(entry.instructions,/Awarding a CRO is initiated by the user/);
});

test('real platform: list_app_commands and run_app_command as the assistant, a person confirms; Runway 2.2.0 reads the award',async()=>{
 const x=await croSelectionSuite();const {f,actor,ai,T}=x;
 const {listAppCommands,runAppCommand}=await import('../src/workspace/app-commands.js');
  try{
  const w=(await x.s.createWorkspace(actor,'Example Therapeutics')).id;
  const id=(await x.install(w,T.sel,'CRO Selection')).receipt.appId,map=x.mapOf(await x.comp(w,id)),tid=(r:string)=>map[r].typeId;
  assert.ok(map['croselection.settings'].fields.preferences,'new installs bind preferences');
  const c=await x.comp(w,id);const list=await listAppCommands(f,ai,w,{appId:id});assert.equal(list.commands.length,27);
  const run=async(command:string,input:any,who:any=ai)=>{const cc=await x.comp(w,id);return runAppCommand(f,who,w,{appId:id,expectedVersion:cc.version,command,input,requestKey:randomUUID()});};
  const confirm=async(out:any)=>{assert.equal(out.ok,true,out.error);assert.ok(out.proposal,'a review');return f.confirm(actor,w,out.proposal.previewId,out.proposal.digest);};
  const helix=await x.save(w,tid('organizations'),{name:'Helix Clinical Research GmbH (fictional)',org_type:'cro',archived:false});
  // The assistant sets up a quick quote; nothing is written until the person confirms each review.
  const mk=await run('record.save',{role:'requests',fields:{name:'Tox quote (fictional)',mode:'quick_quote',service_type:'preclinical_study',scope:'28-day GLP tox (fictional).',currency:'EUR',cda_option:'none',response_deadline:'2026-12-31',assumptions:{notes:'Rats (fictional).',baseline:[{category:'In-life phase',amount:100000}]}}});
  assert.equal((await x.rows(tid('croselection.requests'))).length,0);await confirm(mk);const rq=(await x.rows(tid('croselection.requests')))[0];
  assert.deepEqual(JSON.parse(rq.data.assumptions).baseline,[{category:'In-life phase',amount:100000}]);
  await confirm(await run('longlist.add',{request_id:rq.id,organization_id:helix,recipient_emails:['lab@helix.invalid']}));
  const inv=(await x.rows(tid('croselection.invitations')))[0];
  await x.save(w,tid('croselection.proposals'),{invitation_id:inv.id,round:'quote',version:1,submitted_on:'2026-12-01',source:'manual',total:98000,currency:'EUR',duration_months:6,accepted_on:'2026-12-02'});
  const prop=(await x.rows(tid('croselection.proposals')))[0];
  await confirm(await run('lines.save',{proposal_id:prop.id,lines:[{category:'In-life phase',amount:98000,currency:'EUR',deviation:'Fewer recovery animals (fictional)'}]}));
  const grid=await run('grid.read',{request_id:rq.id});assert.deepEqual(grid.result.suppliers.map((s:any)=>[s.total,s.deviation]),[[98000,-2000]]);assert.equal(grid.proposal,null);
  // The user asks the assistant to award: decision.record prepares it; the person confirms; the award is the published output.
  const dec=await run('decision.record',{request_id:rq.id,invitation_id:inv.id,rationale:'Only bidder; within baseline (fictional).',approver:'R. Lead (fictional)',decided_on:'2026-12-10',start_date:'2027-01-04'});
  assert.match(dec.result.notices,/nobody is notified|Notify all/);await confirm(dec);
  const award=(await x.rows(tid('croselection.awards')))[0];assert.deepEqual([award.data.organization_id,award.data.total,award.data.currency],[helix,98000,'EUR']);
  assert.equal((await x.rows(tid('croselection.invitations')))[0].data.status,'selected');
  // Layout through a command is a presentation-only review of the same app.
  const lay=await run('layout.save',{hide:['vendors:country']});assert.equal(lay.ok,true,lay.error);assert.ok(lay.proposal);
  // Runway 2.2.0 connects the croselection.awards role to CRO Selection's awards (platform dialog, a person) and offers it in Plan.
  await x.pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.cash-runway' AND version='2.2.0'");
  const R=await new (await import('../src/workspace/app-templates.js')).AppTemplates(undefined,x.db).read({templateId:'life.cash-runway',version:'2.2.0'});
  const rw=(await x.install(w,R,'Runway')).receipt.appId;
  // Installed after CRO Selection, Runway's Use existing data? step connects the published awards by default (read only).
  const rmap=x.mapOf(await x.comp(w,rw));assert.equal(rmap['croselection.awards'].typeId,tid('croselection.awards'),'Runway reads CRO Selection\'s awards');
  const rc=await x.comp(w,rw);const src=await runAppCommand(f,actor,w,{appId:rw,expectedVersion:rc.version,command:'sources.read',input:{},requestKey:randomUUID()});
  assert.equal(src.ok,true,src.error);const aw=src.result.roles.find((r:any)=>r.role==='croselection.awards');assert.equal(aw.items.length,1,'the award is offered in Runway');
  assert.ok(c);
 }finally{await x.pg.close();}
});
