import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readCustomLayout} from '../src/shared/custom-layout.js';
import {fieldSchema} from '../src/shared/schema.js';
import {appTemplates} from '../src/workspace/app-templates.js';
import {entry,schema,demo,roles,fullMap,fullBindings,cfgFor,render,fresh,freshExchange,approve,text} from './fixtures/cro-selection.js';

/* CRO Selection 2.0.0 in production QuickJS with the fictional demo set (as of 13 Nov 2026) and a mocked platform exchange.
 * Every total, deviation and score asserted below was computed by hand (QA.md), not by the app's formulas. */
const contract=JSON.parse(await readFile('templates/core-contract/v1.json','utf8'));
const registry=JSON.parse(await readFile('templates/contracts/outputs.json','utf8'));
const strip=(fs:any[])=>fs.map(({owner,ai,...f}:any)=>f);

test('catalog entry, scalar schema, roles as in scope §7, croselection.awards in the registry, eight layout screens, draft status and retirements',async()=>{
 assert.equal(entry.version,'2.0.0');assert.equal(entry.name,'CRO Selection');assert.equal(entry.engine,'frontend-js');assert.ok(entry.source!.length<180000,String(entry.source!.length));
 for(const def of Object.values(schema) as any[])for(const f of def.fields){assert.ok(fieldSchema.safeParse(f).success,JSON.stringify(f));assert.equal(f.multiple,false);assert.match(f.key,/^[a-z][a-z0-9_]{0,63}$/);}
 const modes=Object.fromEntries(roles.map(r=>[r,[schema[r].contract,!!schema[r].optional,!!schema[r].readOnly]]));
 assert.deepEqual(modes,{organizations:['core.v1',false,false],people:['core.v1',true,false],programs:['core.v1',true,false],studies:['core.v1',true,false],agreements:['core.v1',true,false],
  ...Object.fromEntries(['settings','requests','invitations','proposals','proposal_lines','criteria','scores','checklist_items','awards'].map(k=>['croselection.'+k,['croselection.v1',false,false]]))});
 // Core roles bind exactly the contract's non-owned fields; agreements: core fields only (Contracts-owned fields are left to Contracts).
 for(const r of ['organizations','people','programs','studies','agreements'])assert.deepEqual(strip(schema[r].fields),strip(contract.roles[r].fields.filter((f:any)=>!f.owner)),r);
 // The output contract is published with writer life.cro-selection and the writer table provides every field of it.
 const out=registry.roles['croselection.awards'];assert.equal(out.kind,'output');assert.equal(out.writer,'life.cro-selection');assert.deepEqual(strip(schema['croselection.awards'].fields),out.versions['croselection.v1'].fields);
 assert.deepEqual(out.versions['croselection.v1'].fields.filter((f:any)=>f.required).map((f:any)=>f.key),['request_id','organization_id','service_type','currency','rationale','approver','decided_on']);
 const prepared=`const templateConfiguration=${JSON.stringify({...entry.defaults,heading:'CRO Selection'})};\nconst templateBindings=[];\n${entry.source}`;
 assert.deepEqual(readCustomLayout(prepared)!.schema.screens.map(s=>s.id),['overview','requests','vendors','messages','proposals','evaluation','decision','settings']);
 for(const k of ['quickStart','dataContract','interactionContract','lifecycle','limitations','examples','tasks'])assert.ok((entry.documentation as any)[k],k);
 // A draft until the owner approves it; 1.0.1 stays immutable and installable; both replaced versions are marked for archival.
 const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8')),installers=JSON.parse(await readFile('templates/catalog-installers.json','utf8')),ret=JSON.parse(await readFile('templates/catalog-retirements.json','utf8')).retirements;
 assert.equal(seed['life.cro-selection'].version,'1.0.1');assert.equal(installers['life.cro-selection@2.0.0'],'templates/source/cro-selection/schema.example.json');assert.equal(installers['life.cro-selection@1.0.1'],'templates/source/cro-selection/archive/1.0.1/schema.example.json');
 const old=await appTemplates.read({templateId:'life.cro-selection',version:'1.0.1'});assert.equal(old.version,'1.0.1');
 assert.deepEqual(ret.map((r:any)=>[r.templateId,r.version,r.replacedBy]),[['life.cro-selection','1.0.1','life.cro-selection@2.0.0'],['life.sponsor-rfp-management','1.0.1','life.cro-selection@2.0.0']]);
 for(const r of ret)assert.ok(await appTemplates.read({templateId:r.templateId,version:r.version}),r.templateId);
});

test('every screen renders for each request with no error, no link and labelled inputs',async()=>{
 const rows=fresh();
 for(const s of ['overview','requests','vendors','messages','proposals','evaluation','decision','settings'])for(const requestId of ['req-p2','req-tox','req-bioa']){
  const {html}=await render(rows,{section:s,requestId});assert.doesNotMatch(text(html),/could not be shown|Partial data/,s+' '+requestId);assert.doesNotMatch(html,/\/exchange#/,'no recipient link on '+s);
  for(const m of html.matchAll(/<(input|select|textarea)\b[^>]*>/g))if(!/type="(submit|hidden)"/.test(m[0])){assert.match(m[0],/data-ui-state="true"/,m[0]);assert.match(m[0],/data-action="/,m[0]);assert.match(m[0],/ name="/,m[0]);}}
});

test('acceptance 4: grid totals and deviations match the hand-checked set; other currencies are listed, not converted',async()=>{
 const t=text((await render(fresh(),{section:'proposals',requestId:'req-p2'})).html);
 // Baseline 1,600,000. Helix v2 lines: 170+250+560+150+95+60+75+80+210 = 1,650,000 (+50,000, +3.1%); monitoring 560,000 vs 520,000 = +40,000 (+7.7%).
 assert.match(t,/Helix Clinical Research GmbH \(fictional\) \(v2\)/,'the latest accepted version');assert.match(t,/Monitoring 520,000 560,000 \+40,000 \(\+7\.7%\) Assumes 10% more on-site visits/);
 // Northlake EUR lines: 150+200+310+140+80+50+60+70+180 = 1,240,000 (−360,000, −22.5%); USD 40,000 listed separately.
 assert.match(t,/Total \(EUR\) 1,600,000 1,650,000 \+50,000 \(\+3\.1%\) 1,580,000 −20,000 \(−1\.2%\) Stated total, no lines yet 1,240,000 −360,000 \(−22\.5%\)/);
 assert.match(t,/Pass-through costs 200,000 210,000 \+10,000 \(\+5%\) Ask — 180,000 −20,000 \(−10%\) \+ USD 40,000/);assert.match(t,/Other currencies — — — USD 40,000 Listed, never converted/);
 assert.doesNotMatch(t,/1,280,000|1,276,/,'USD is never added to the EUR total');
 // Pass-through share: Helix 210,000 / 1,650,000 = 12.7%; realism check: Northlake 22.5% below the baseline.
 assert.match(t,/Of which pass-through — 210,000 12\.7% of the total/);assert.match(t,/Lowest bid: Northlake CRO Ltd \(fictional\) at EUR 1,240,000, 22\.5% below the baseline/);
 // A bid in another currency is never compared with the baseline.
 const rows=fresh();rows.find(r=>r.id==='prop-meridian-1')!.data.currency='GBP';
 assert.match(text((await render(rows,{section:'proposals',requestId:'req-p2'})).html),/GBP 1,580,000 Other currency: not converted, not compared/);
});

test('acceptance 5: blind scoring hides prices until complete or revealed; a qualification issue blocks "selected" without an override reason',async()=>{
 const rows=fresh();rows.find(x=>x.id==='settings')!.data.blind_scoring=true;
 // Blind scoring is off by default (owner decision); with it on, prices are hidden until scoring is complete.
 assert.match(text((await render(fresh(),{section:'evaluation',requestId:'req-p2'})).html),/EUR 1,240,000/,'off by default: prices shown');
 // Demo: B. Reviewer has not scored Northlake's working relationship → 1 score missing → prices hidden.
 let r=await render(rows,{section:'evaluation',requestId:'req-p2'});let t=text(r.html);
 assert.match(t,/Prices are hidden: 1 score missing from 2 reviewers/);assert.doesNotMatch(t,/EUR 1,650,000|EUR 1,240,000/);
 // Hand-checked weighted scores: Helix A/B means 4.5,4,3.5,4,3,4.5 → 3.90; Northlake has 5 of 6 criteria scored → no weighted score yet.
 assert.match(t,/Helix Clinical Research GmbH \(fictional\) Finalist 3\.90 \/ 5 6 of 6 criteria scored Passes/);assert.match(t,/Northlake CRO Ltd \(fictional\) Finalist — 6 of 6 criteria scored|Northlake CRO Ltd \(fictional\) Finalist 3\.\d\d/);
 // Reveal (a person, this session) shows prices before completion and says so.
 r=await render(rows,r.state,{kind:'click',action:'reveal'});t=text(r.html);assert.match(t,/Prices were revealed before scoring was complete/);assert.match(t,/EUR 1,650,000/);
 assert.match(text((await render(rows,r.state,{kind:'click',action:'reveal'},{writable:false})).html),/Only people who can edit this app reveal prices/);
 // Completing the missing score shows prices without a reveal: Northlake (3.5,3,2.5,2.5,5,(3+4)/2) → (87.5+60+50+37.5+75+17.5)/100 = 3.28, fails Quality system.
 rows.push({id:'score-x',version:0,role:'croselection.scores',data:{request_id:'req-p2',invitation_id:'inv-northlake',criterion_id:'crit-rel',reviewer:'B. Reviewer (fictional)',score:4,evidence:null}});
 t=text((await render(rows,{section:'evaluation',requestId:'req-p2'})).html);assert.match(t,/Scoring is complete: prices are shown/);assert.match(t,/3\.28 \/ 5 6 of 6 criteria scored Fails mandatory: Quality system/);assert.match(t,/EUR 1,240,000/);
 // Blind scoring off in Settings: prices always shown.
 const off=fresh();assert.match(text((await render(off,{section:'evaluation',requestId:'req-p2'})).html),/EUR 1,240,000/);
 // Qualification: Northlake has an issue. Deciding for Northlake without a reason is refused; with a reason the override is recorded.
 const open=await render(rows,{section:'decision',requestId:'req-p2'},{kind:'click',action:'panel:decide:new'});
 const form={invitation_id:'inv-northlake',rationale:'Lowest price (fictional).',approver:'R. Lead (fictional)',decided_on:'2026-11-20'};
 const refused=await render(rows,open.state,{kind:'submit',action:'decide',form});assert.equal(refused.changes.length,0);assert.match(refused.state.notice,/Qualification has an open issue for Northlake CRO Ltd \(fictional\) \(Quality audit or questionnaire reviewed\)/);
 const ok=await render(rows,refused.state,{kind:'submit',action:'decide',form:{...form,override_reason:'CAPA closure evidence received by phone; audit planned (fictional).'}});
 const award=ok.changes.find(c=>c.typeId==='croselection.awards')!;assert.match(award.data.rationale,/Qualification override: CAPA closure/);
 assert.deepEqual(ok.changes.filter(c=>c.kind==='update_record').map(c=>[c.recordId,c.data.status??c.data.stage]),[['inv-helix','not_selected'],['inv-meridian','not_selected'],['inv-northlake','selected'],['req-p2','decision']]);
 // "Selected" is never set by a status button.
 assert.match((await render(rows,{section:'vendors',requestId:'req-p2'},{kind:'click',action:'inv-status:inv-helix:selected'})).state.notice,/selected by recording the decision/);
});

test('acceptance 6 (app side): exchange writes only from explicit clicks, one per action; previews and read-only users cannot write; links are never rendered',async()=>{
 const rows=fresh();
 const r=await render(rows,{section:'messages',requestId:'req-p2',round:'rfp',thread:'00000000-0000-4000-8000-0000000000e5'},{kind:'submit',action:'reply',form:{body:'Thanks (fictional).',notify:'on'}});
 assert.deepEqual(r.xwrites.map(w=>w.name),['exchange.reply']);assert.match(r.state.notice,/Only this supplier will see it/);
 // A change event cannot trigger an exchange write; nor can a preview or a read-only user.
 const ch=await render(rows,{section:'proposals',requestId:'req-p2'},{kind:'change',action:'accept-file:00000000-0000-4000-8000-0000000000f7',value:'x'});assert.equal(ch.xwrites.length,0);assert.match(ch.state.notice,/explicit click/);
 const pv=await render(rows,{section:'decision',requestId:'req-p2'},{kind:'click',action:'request-cda'},{saved:false});assert.equal(pv.xwrites.length,0);assert.match(pv.state.notice,/Save the app/);
 const ro=await render(rows,{section:'messages',requestId:'req-p2',round:'rfp',thread:'00000000-0000-4000-8000-0000000000e5'},{kind:'submit',action:'reply',form:{body:'x'}},{writable:false});assert.equal(ro.xwrites.length,0);
 assert.match(ro.html,/<button type="submit" class="cs-btn cs-btn-primary" disabled>Reply privately \(reviewed\)/);
 // The send review shows the batch exactly as returned; elsewhere no link appears.
 const v=await render(rows,{section:'vendors',requestId:'req-tox'},{kind:'submit',action:'prepare-email',form:{email_type:'invitation','to_00000000-0000-4000-8000-0000000000e8':'on','pers_00000000-0000-4000-8000-0000000000e8':'Personal text {link}'}});
 assert.match(v.html,/<pre>Personal text \{link\}\n\nhttps:\/\/platform\.trialagents\.com\/exchange#TOKEN<\/pre>/);
 const after=await render(rows,v.state,{kind:'click',action:'send-email'});assert.deepEqual(after.xwrites,[{name:'exchange.sendEmail',value:{batchId:v.state.batch.batchId,digest:v.state.batch.digest}}]);
 const other=await render(rows,{...after.state,section:'overview'});assert.doesNotMatch(other.html,/\/exchange#/);
 // Partial or failing exchange reads say so and never claim "nothing waiting".
 const down=await render(rows,{section:'overview'},{kind:'open',action:''},{exchangeFails:true});assert.match(text(down.html),/Exchange data could not be read: Capability unavailable/);assert.doesNotMatch(text(down.html),/Nothing is waiting/);assert.match(text(down.html),/Supplier status could not be read completely\. Open requests 2 .* Waiting on us — /);
});

test('acceptance 3 (app side): CDA via Contracts files the signed CDA as an agreement; CDA skip records "in place elsewhere"',async()=>{
 const rows=fresh();const rq=rows.find(r=>r.id==='req-p2')!;rq.data.cda_option='contracts';
 const a=await render(rows,{section:'vendors',requestId:'req-p2'},{kind:'click',action:'cda-file:inv-helix'});
 assert.deepEqual(a.changes,[{kind:'create_record',typeId:'agreements',data:{name:'CDA — Helix Clinical Research GmbH (fictional) (PX-101 Phase 2 study CRO)',counterparty_id:'org-helix',agreement_type:'cda_nda',status:'active',effective_date:'2026-11-13',archived:false}}]);
 approve(rows,a.changes);const ag=rows.find(r=>r.role==='agreements'&&r.data.agreement_type==='cda_nda')!;
 const b=await render(rows,a.state,{kind:'click',action:'cda-file:inv-helix'});assert.deepEqual(b.changes,[{kind:'update_record',recordId:'inv-helix',expectedVersion:0,data:{cda_agreement_id:ag.id,cda_status:'signed'}}]);
 const sk=await render(rows,{section:'vendors',requestId:'req-bioa'},{kind:'submit',action:'cda-elsewhere:inv-b-quartz',form:{cda_in_place_on:'2025-11-15'}});
 assert.deepEqual(sk.changes,[{kind:'update_record',recordId:'inv-b-quartz',expectedVersion:0,data:{cda_status:'in_place_elsewhere',cda_in_place_on:'2025-11-15'}}]);
});

test('drafts survive a failed proposal; record versions are captured when a form opens; partial reads disable totals',async()=>{
 const rows=fresh();
 const open=await render(rows,{section:'requests',requestId:'req-tox'},{kind:'click',action:'edit:requests:req-tox'});
 const typed=await render(rows,open.state,{kind:'change',action:'draft:owner',value:'New owner (fictional)'});assert.equal(typed.state.editor.draft.owner,'New owner (fictional)');
 rows.find(r=>r.id==='req-tox')!.version=3;// edited meanwhile
 const saved=await render(rows,typed.state,{kind:'submit',action:'save-record',form:{owner:'New owner (fictional)'}});assert.equal(saved.changes[0].expectedVersion,0,'the version from when the form opened');
 const failed=await render(rows,typed.state,{kind:'submit',action:'save-record',form:{owner:'New owner (fictional)'}},{failPropose:true});assert.equal(failed.state.editor.draft.owner,'New owner (fictional)');assert.ok(failed.state.notice,'the failure is shown');
 const partial=await render(fresh(),{section:'overview'},{kind:'open',action:''},{read:(v:any,rs:any[])=>{const all=rs.filter(r=>r.role===v.typeId);return {rows:all.slice(0,1),total:all.length};}});
 assert.match(text(partial.html),/Partial data: totals, scores and "nothing waiting" answers are disabled/);assert.match(text(partial.html),/Open requests —/);
 const unbound=await render(fresh(),{section:'proposals',requestId:'req-p2'},{kind:'open',action:''},{config:cfgFor(Object.fromEntries(Object.entries(fullMap).filter(([k])=>k!=='croselection.proposal_lines')))});
 assert.match(text(unbound.html),/Proposal line table is not connected/);
});

test('calculation edge cases: stated total without lines, quick quote stages, question deadline default, criteria weights',async()=>{
 const rows=fresh();
 // Quick quote: no RFI or bid defence in the stepper.
 const q=text((await render(rows,{section:'requests',requestId:'req-tox'})).html);assert.doesNotMatch(q,/RFI|Bid defence/);assert.match(q,/1\. Need [^0-9]*2\. Longlist [^0-9]*3\. RFP \/ request [^0-9]*4\. Questions/);
 // New request: question deadline = response deadline − settings days (7); the CDA gate needs "send PDF".
 const add=await render(rows,{section:'requests'},{kind:'click',action:'add:requests:full_selection'});
 const base={name:'X',service_type:'cmc',scope:'S',currency:'EUR',cda_option:'skip',response_deadline:'2027-01-10'};
 assert.equal((await render(rows,add.state,{kind:'submit',action:'save-record',form:base})).changes[0].data.question_deadline,'2027-01-03');
 assert.match((await render(rows,add.state,{kind:'submit',action:'save-record',form:{...base,cda_gate:'on'}})).state.notice,/CDA gate needs the option/);
 // Default templates: a new request starts from the built-in questions and cost categories for its service type, editable on the request.
 const made=(await render(rows,add.state,{kind:'submit',action:'save-record',form:base})).changes[0].data;
 assert.equal(made.cost_categories.split('\n')[0],'Process development','CMC bid grid');assert.match(made.questions,/^Confirm that your price follows the bid grid/);assert.match(made.rfi_questions,/^Describe your experience/);
 const quick=await render(rows,{section:'requests'},{kind:'click',action:'add:requests:quick_quote'});
 const q2=(await render(rows,quick.state,{kind:'submit',action:'save-record',form:{...base,service_type:'preclinical_study'}})).changes[0].data;assert.match(q2.questions,/^What does your price include/);assert.equal(q2.rfi_questions,undefined,'a quick quote has no RFI');
 // Decision texts fill the supplier and request names.
 rows.push({id:'award-tox',version:0,role:'croselection.awards',data:{request_id:'req-tox',organization_id:'org-quartz',service_type:'preclinical_study',total:198000,currency:'EUR',rationale:'R',approver:'A',decided_on:'2026-11-13'}});
 rows.find(r=>r.id==='inv-q-quartz')!.data.status='selected';for(const id of ['inv-q-ember','inv-q-sable'])rows.find(r=>r.id===id)!.data.status='not_selected';
 // Notify all: one review, one private message per supplier, the winner text and the text for the others (with the debrief offer).
 const n=await render(rows,{section:'decision',requestId:'req-tox'},{kind:'submit',action:'notify-all',form:{}});
 assert.deepEqual(n.xwrites.map(w=>w.name),['exchange.replyAll']);const rp=n.xwrites[0].value.replies;assert.equal(rp.length,3);assert.equal(n.xwrites[0].value.notify,true);
 assert.match(rp.find((x:any)=>x.exchangeId.endsWith('e7')).body,/we have selected Quartz Tox Labs BV \(fictional\) for "28-day GLP toxicology study quote"/);
 assert.equal(rp.filter((x:any)=>/selected another supplier for this work\.\s+This says nothing against (Ember|Sable)[\s\S]*If you would like a short debrief call/.test(x.body)).length,2);
});

test('production design inspector accepts all eight screens and the main panels',async()=>{
 const {inspectAppDesign}=await import('../src/workspace/design-quality.js');
 const frames:any[]=[];
 for(const [s,requestId] of [['overview','req-p2'],['requests','req-p2'],['vendors','req-p2'],['messages','req-p2'],['proposals','req-p2'],['evaluation','req-p2'],['decision','req-bioa'],['settings','req-p2']]){const r=await render(fresh(),{section:s,requestId});frames.push({name:s,html:r.html,css:r.output.css});}
 for(const [s,a] of [['requests','panel:round:rfp'],['vendors','panel:supplier:inv-helix'],['proposals','panel:accept:00000000-0000-4000-8000-0000000000b7'],['decision','panel:decide:new'],['requests','edit:requests:req-p2'],['proposals','panel:proposal:prop-northlake-1']]){const r=await render(fresh(),{section:s,requestId:'req-p2'},{kind:'click',action:a});frames.push({name:a,html:r.html,css:r.output.css});}
 // The inspector takes at most 10 frames per run.
 for(const part of [frames.slice(0,8),frames.slice(8)]){const design=await inspectAppDesign(part);assert.deepEqual(design.issues,[]);}
});
