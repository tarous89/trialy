import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {appTemplates} from '../src/workspace/app-templates.js';
import {entry,render,apply,fresh,text,SCREENS,isV2Source,fullMap,cfgFor,type Row} from './fixtures/contracts-v2.js';

/* Contracts 2.0.0 (7.3, 7.4): the v2 rebuild on the kit, run in production QuickJS with stub tools exactly as the platform
 * runs a v2 catalog app (configuration lines, then the kit, then the app). Fixtures are the fictional demo records. */
const terms=(rows:Row[],ag:string)=>rows.find(r=>r.role==='contracts.terms'&&r.data.agreement_id===ag)!;
const ownChrome=(html:string)=>html.replace(/<aside class="k-panel"[\s\S]*?<\/header>/g,'');
const action=(html:string,re:RegExp)=>{const m=re.exec(html);assert.ok(m,'no control matching '+re);return m![1];};
const neverProposes=(calls:{name:string}[])=>assert.ok(!calls.some(c=>c.name==='records.propose'),'records.propose is a v1 capability');

test('2.0.0 entry: v2 marker first, same installer schema and options as 1.1.1, upgrade path, no review texts',async()=>{
 assert.equal(entry.version,'2.0.0');assert.equal(entry.engine,'frontend-js');assert.ok(entry.source!.length<240000);
 assert.ok(isV2Source(`const templateConfiguration={};\nconst templateBindings=[];\n${entry.source}`));
 assert.equal(entry.source!.split('\n')[0],"'use trialagents v2';");
 assert.deepEqual((entry as any).upgradeFrom,['1.1.0','1.1.1']);
 const installers=JSON.parse(await readFile('templates/catalog-installers.json','utf8'));
 assert.equal(installers['life.contracts@1.1.1'],'templates/source/contracts/archive/1.1.1/schema.example.json');
 assert.equal(await readFile(installers['life.contracts@2.0.0'],'utf8'),await readFile(installers['life.contracts@1.1.1'],'utf8'),'byte-identical installer schema');
 const old=await appTemplates.read({templateId:'life.contracts',version:'1.1.1'});
 assert.match(old.source!,/records\.propose/);assert.equal((old as any).upgradeFrom,undefined,'the released version is unchanged');
 // Options: tableMap and the business options stay; the presentation-only ones of the old design are gone.
 assert.deepEqual(Object.keys(entry.options),['tableMap','pageSize','readOnly','asOfOverride']);
 for(const k of Object.keys(entry.options))assert.ok(k in old.options,k);
 assert.deepEqual(entry.options.tableMap,old.options.tableMap);
 assert.deepEqual((entry as any).functions??[],(old as any).functions??[]);assert.deepEqual((entry as any).recommendedAutomations??[],(old as any).recommendedAutomations??[]);
 const src=entry.source!;
 assert.doesNotMatch(src,/records\.propose|<h1|<header|ct-banner|tracker:layout|templateLayoutSchema|position:\s*(fixed|sticky)/);
 assert.doesNotMatch(src+JSON.stringify(entry.documentation)+entry.instructions,/prepared for (TrialAgents )?review|Nothing changes until|\(reviewed\)|Prepare reviewed/i);
 for(const k of ['quickStart','dataContract','interactionContract','lifecycle','limitations','examples','tasks'])assert.ok((entry.documentation as any)[k],k);
 assert.match(entry.instructions,/records\.save/);
});

test('every screen renders at every width with the kit, no own header, banner or footer, and remembers the screen',async()=>{
 const rows=fresh();
 for(const width of ['wide','panel','phone'])for(const screen of SCREENS){
  const r=await render(rows,{screen},{kind:'open',action:''},{viewport:{width,coarse:width==='phone'}});
  assert.match(r.html,/^<div class="k-app"><main class="k-main">/,screen);
  assert.doesNotMatch(ownChrome(r.html),/<header|<h1|<footer|ct-banner|role="alert"/,screen);
  assert.match(r.html,new RegExp('data-action="nav:'+screen+'" aria-current="page"'),screen);
  assert.deepEqual(r.output.context,{screen});assert.equal(r.notice,undefined,screen);assert.equal(r.saves.length,0,'opening never writes');neverProposes(r.calls);
  assert.equal(r.html.includes('class="k-layout"'),width==='wide',screen+' '+width+': side navigation only when wide');
 }
 // The working context comes back on the next visit.
 assert.match((await render(rows,{},{kind:'open'},{context:{screen:'pipeline'}})).html,/class="k-board"/);
 // Technical details stay off the screens: no record IDs or versions in the visible text.
 const det=await render(rows,{screen:'agreements'},{kind:'click',action:'details:agreements:ag-msa-helix'});
 assert.doesNotMatch(text(det.html),/ag-msa-helix|version \d|Record ID/);assert.match(det.html,/href="platform:logs"/);
});

test('each screen reads only its tables, in one batched read per group',async()=>{
 const rows=fresh(),typesRead=(calls:any[])=>new Set(calls.filter(c=>c.name==='records.readMany').flatMap(c=>c.input.reads.map((x:any)=>x.typeId)));
 const settings=await render(rows,{screen:'settings'});assert.deepEqual([...typesRead(settings.calls)],['contracts.settings']);
 const ms=await render(rows,{screen:'milestones'});assert.deepEqual([...typesRead(ms.calls)].sort(),['programs','programs.plan_items']);
 const pipe=await render(rows,{screen:'pipeline'});assert.deepEqual([...typesRead(pipe.calls)].sort(),['agreements','contracts.settings','contracts.terms','organizations']);
 assert.ok(!pipe.calls.some(c=>c.name==='records.read'||c.name.startsWith('documents.')||c.name==='integrations.list'));
 for(const screen of SCREENS){const r=await render(rows,{screen});assert.ok(r.calls.filter(c=>c.name==='records.readMany').length<=5,screen);}
});

test('settings are shown to owners only',async()=>{
 const rows=fresh();
 const owner=await render(rows,{screen:'settings'});assert.match(owner.html,/data-action="nav:settings"/);assert.match(owner.html,/<form class="k-card" data-action="settings:save">/);
 for(const appRole of ['editor','viewer'] as const){
  const r=await render(rows,{screen:'settings'},{kind:'open'},{appRole});
  assert.doesNotMatch(r.html,/nav:settings|settings:save/,appRole);assert.match(r.html,/data-action="nav:overview" aria-current="page"/,appRole);
  const sub=await render(rows,{screen:'settings'},{kind:'submit',action:'settings:save',form:{default_currency:'USD'}},{appRole});assert.equal(sub.saves.length,0,appRole);
 }
 // An owner's change saves the one settings row directly.
 const s=await render(rows,{screen:'settings'},{kind:'submit',action:'settings:save',form:{default_currency:'USD',reminder_days:'14, 30',agreement_types:'msa, cda_nda',obligation_kinds:'payment'}});
 assert.deepEqual(s.saves,[{kind:'update_record',recordId:'settings-1',expectedVersion:0,data:{default_currency:'USD',reminder_days:'14, 30',agreement_types:'msa, cda_nda',obligation_kinds:'payment'}}]);
 assert.deepEqual(s.notice,{kind:'success',message:'Settings saved'});
 const bad=await render(rows,{screen:'settings'},{kind:'submit',action:'settings:save',form:{reminder_days:'soon'}});assert.equal(bad.saves.length,0);assert.equal(bad.notice.kind,'error');assert.doesNotMatch(bad.html,/role="alert"/);
});

test('every empty screen offers its first action',async()=>{
 for(const screen of SCREENS.filter(s=>s!=='settings')){
  const r=await render([],{screen});
  assert.match(r.html,/class="k-empty"><h3>[^<]+<\/h3>(<p class="k-muted">[^<]*<\/p>)?<button type="button" class="k-button k-button--primary" data-action="(add:[a-z]+|add-child:[^"]+)"/,screen);
 }
 // With programs but no milestones, the first action is Add milestone; with an agreement, Families offers Add child agreement.
 const ms=await render(fresh().filter(r=>r.role!=='programs.plan_items'),{screen:'milestones'});assert.match(ms.html,/data-action="add:milestones">Add milestone/);
 const msa=fresh().filter(r=>r.role==='agreements'&&r.id==='ag-msa-helix'||r.role==='organizations');
 assert.match((await render(msa,{screen:'families'})).html,/data-action="add-child:ag-msa-helix">Add child agreement/);
 // Viewers see the empty state without an action they cannot take.
 assert.doesNotMatch((await render([],{screen:'agreements'},{kind:'open'},{writable:false,appRole:'viewer'})).html,/k-button--primary" data-action="add:/);
});

test('reads still on their way show as loading, never as empty or zero',async()=>{
 const rows=fresh();
 for(const screen of SCREENS){
  const r=await render(rows,{screen},{kind:'open'},{pending:()=>true});
  assert.match(r.html,/class="k-muted ct-loading" role="status"[^>]*>Loading/,screen);
  assert.doesNotMatch(text(r.html),/No agreements yet|No obligations yet|Nothing|None\.|No counterparties|Active agreements/,screen);
  assert.equal(r.saves.length,0);
 }
 // Only obligations pending: the obligations screen waits, the pipeline (which does not need them) shows.
 const pending=(t:string)=>t==='contracts.obligations';
 assert.match((await render(rows,{screen:'obligations'},{kind:'open'},{pending})).html,/Loading obligations/);
 assert.match((await render(rows,{screen:'pipeline'},{kind:'open'},{pending})).html,/class="k-board"/);
 // An inline edit while its record is still loading saves nothing.
 assert.equal((await render(rows,{screen:'agreements'},{kind:'change',action:'edit:ag-lease:status:0',value:'expired'},{pending:()=>true})).saves.length,0);
});

test('inline edits save at once with the version captured when the value was shown, and recalculate key-term dates',async()=>{
 const rows=fresh();rows.find(r=>r.id==='ag-brightwater')!.version=3;terms(rows,'ag-brightwater').version=2;
 const reg=await render(rows,{screen:'agreements'});
 const status=action(reg.html,/<select class="k-cell" data-action="(edit:ag-brightwater:status:\d+)"/);assert.equal(status,'edit:ag-brightwater:status:3');
 // Status: the agreement and the day the status started, in one save.
 const s=await render(rows,{screen:'agreements'},{kind:'change',action:status,value:'terminated'});
 assert.deepEqual(s.saves,[{kind:'update_record',recordId:'ag-brightwater',expectedVersion:3,data:{status:'terminated'}},{kind:'update_record',recordId:'terms-ag-brightwater',expectedVersion:2,data:{status_since:'2026-11-12'}}]);
 assert.deepEqual(s.notice,{kind:'success',message:'Status saved'});neverProposes(s.calls);
 // Expiry: 31 Jan 2027 − 30 days notice = 1 Jan 2027, stored with the new date.
 const expiry=action(reg.html,/data-action="(edit:ag-brightwater:expiry_date:\d+)"/);
 const e=await render(rows,{screen:'agreements'},{kind:'change',action:expiry,value:'2027-01-31'});
 assert.deepEqual(e.saves,[{kind:'update_record',recordId:'ag-brightwater',expectedVersion:3,data:{expiry_date:'2027-01-31'}},{kind:'update_record',recordId:'terms-ag-brightwater',expectedVersion:2,data:{notice_deadline:'2027-01-01'}}]);
 // The version sent is the one shown, even when the record changed since (the server refuses it, never overwrites).
 rows.find(r=>r.id==='ag-brightwater')!.version=4;
 assert.equal((await render(rows,{screen:'agreements'},{kind:'change',action:status,value:'expired'})).saves[0].expectedVersion,3);
 // Invalid values are refused with a message next to nothing else: no save, one notice.
 const bad=await render(rows,{screen:'agreements'},{kind:'change',action:'edit:ag-lease:expiry_date:0',value:'2020-01-01'});
 assert.equal(bad.saves.length,0);assert.deepEqual(bad.notice,{kind:'error',message:'The expiry date is before the effective date.'});
 // Obligations, counterparties and milestones edit in place too.
 const ob=await render(rows,{screen:'obligations'},{kind:'change',action:'edit:ob-sow2-b3:status:0',value:'done'});
 assert.deepEqual(ob.saves,[{kind:'update_record',recordId:'ob-sow2-b3',expectedVersion:0,data:{status:'done'}}]);
 const org=await render(rows,{screen:'counterparties'},{kind:'change',action:'edit:org-helix:country:0',value:'Netherlands'});
 assert.deepEqual(org.saves,[{kind:'update_record',recordId:'org-helix',expectedVersion:0,data:{country:'Netherlands'}}]);
 const ms=await render(rows,{screen:'milestones'},{kind:'change',action:'edit:ms-ind:is_key:0',value:false});
 assert.deepEqual(ms.saves,[{kind:'update_record',recordId:'ms-ind',expectedVersion:0,data:{is_key:false}}]);
 // Viewers see values, not editable cells, and cannot save.
 const view=await render(rows,{screen:'agreements'},{kind:'open'},{writable:false,appRole:'viewer'});assert.doesNotMatch(view.html,/class="k-cell"/);
 assert.equal((await render(rows,{screen:'agreements'},{kind:'change',action:status,value:'expired'},{writable:false,appRole:'viewer'})).saves.length,0);
});

test('side panels: edit many fields, create with key terms next, archive with Undo',async()=>{
 const rows=fresh();rows.find(r=>r.id==='ag-kestrel')!.version=5;
 const open=await render(rows,{screen:'agreements'},{kind:'click',action:'open-edit:agreements:ag-kestrel'});
 assert.match(open.html,/<aside class="k-panel" role="dialog"[^>]*aria-label="Edit agreement"/);assert.match(open.html,/<form data-action="save:record">/);
 rows.find(r=>r.id==='ag-kestrel')!.version=6;// someone else saved meanwhile
 const sv=await render(rows,open.state,{kind:'submit',action:'save:record',form:{name:'Scientific advisory agreement — Kestrel (renewed)',total_value:'30000',currency:'EUR'}});
 assert.equal(sv.saves.length,1);assert.equal(sv.saves[0].expectedVersion,5,'the version captured when editing started');assert.equal(sv.saves[0].data.name,'Scientific advisory agreement — Kestrel (renewed)');
 assert.equal(sv.state.panel,null);assert.equal(sv.notice.kind,'success');
 // A choice inside a form is kept across screens of the same panel and saves nothing.
 const add=await render(rows,{screen:'agreements'},{kind:'click',action:'add:agreements'});
 const pick=await render(rows,add.state,{kind:'change',action:'save:record',form:{name:'MTA — Northwind',agreement_type:'mta',counterparty_id:'org-northwind',status:'drafting'}});
 assert.equal(pick.saves.length,0);assert.match(pick.html,/<option value="mta" selected>MTA<\/option>/);
 const created=await render(rows,pick.state,{kind:'submit',action:'save:record',form:{name:'MTA — Northwind',agreement_type:'mta',counterparty_id:'org-northwind',status:'drafting'}});
 assert.equal(created.saves[0].kind,'create_record');assert.equal(created.saves[0].typeId,'agreements');assert.equal(created.saves[0].data.archived,false);
 apply(rows,created.saves);
 // The server renders once more from the saved data: the key terms of the new agreement open, with Undo offered.
 const after=await render(rows,created.state,{kind:'open',action:''},{undo:[{undoId:'00000000-0000-4000-8000-00000000u001',label:'Create agreement'}]});
 assert.ok(after.calls.some(c=>c.name==='undo.list'));assert.deepEqual(after.notice,{kind:'success',message:'New agreement saved'},'the save message survives the re-render');assert.equal(after.state.flash,null);assert.match(after.html,/data-action="undo:00000000-0000-4000-8000-00000000u001">Undo create agreement/);
 assert.match(after.html,/aria-label="Key terms: MTA — Northwind"/);assert.match(after.html,/is saved\. Add its key terms now/);
 const newId=rows.find(r=>r.data.name==='MTA — Northwind')!.id;
 const kt=await render(rows,after.state,{kind:'submit',action:'save:terms',form:{renewal:'none',governing_law:'Danish'}});
 assert.deepEqual(kt.saves,[{kind:'create_record',typeId:'contracts.terms',data:{agreement_id:newId,extraction_status:'none',renewal:'none',governing_law:'Danish',status_since:'2026-11-12'}}]);
 // Undo is run from the person's click.
 const u=await render(rows,after.state,{kind:'click',action:'undo:00000000-0000-4000-8000-00000000u001'});
 assert.deepEqual(u.calls.find(c=>c.name==='undo.run')!.input,{undoId:'00000000-0000-4000-8000-00000000u001'});assert.deepEqual(u.notice,{kind:'success',message:'Undone'});
 // Archive is archive_record with the version shown; an agreement with children is kept.
 const ar=await render(rows,{screen:'agreements',panel:{kind:'detail',role:'agreements',id:'ag-lease'}},{kind:'click',action:'archive:agreements:ag-lease'});
 assert.deepEqual(ar.saves,[{kind:'archive_record',recordId:'ag-lease',expectedVersion:0}]);
 const kids=await render(rows,{screen:'agreements'},{kind:'click',action:'archive:agreements:ag-msa-helix'});assert.equal(kids.saves.length,0);assert.equal(kids.notice.kind,'error');
});

test('pipeline: drag and drop (or the card menu) saves the stage; Mark signed opens the signature panel',async()=>{
 const rows=fresh();rows.find(r=>r.id==='ag-aldric')!.version=2;
 const board=await render(rows,{screen:'pipeline'});
 assert.match(board.html,/<section class="k-column" data-drop="drafting" data-drop-action="move">/);assert.match(board.html,/<select data-action="move-menu:ag-aldric"/);
 const drop=await render(rows,{screen:'pipeline'},{kind:'change',action:'move',value:'ag-aldric>in_negotiation'});
 assert.deepEqual(drop.saves,[{kind:'update_record',recordId:'ag-aldric',expectedVersion:2,data:{status:'in_negotiation'}},{kind:'update_record',recordId:'terms-ag-aldric',expectedVersion:0,data:{status_since:'2026-11-12'}}]);
 const menu=await render(rows,{screen:'pipeline'},{kind:'change',action:'move-menu:ag-aldric',value:'out_for_signature'});assert.equal(menu.saves[0].data.status,'out_for_signature');
 assert.equal((await render(rows,{screen:'pipeline'},{kind:'change',action:'move',value:'ag-aldric>active'})).saves.length,0);
 const sign=await render(rows,{screen:'pipeline'},{kind:'click',action:'sign:ag-cda-meridian-2026'});assert.match(sign.html,/aria-label="Mark signed: CDA — Meridian Pharma KK \(partnering 2026\)"/);
 const signed=await render(rows,sign.state,{kind:'submit',action:'save:sign',form:{signed_on:'2026-11-10',effective_date:'2026-11-10',expiry_date:'2028-11-10',confidentiality_years:'3',cda_direction:'mutual'}});
 assert.deepEqual(signed.saves[0],{kind:'update_record',recordId:'ag-cda-meridian-2026',expectedVersion:0,data:{status:'active',signed_on:'2026-11-10',effective_date:'2026-11-10',expiry_date:'2028-11-10'}});
 assert.equal(signed.saves[1].data.confidentiality_end,'2031-11-10');assert.equal(signed.state.panel.kind,'detail');
});

test('verification of assistant proposals at the assistant-panel width: one block per value, a decision each, one save',async()=>{
 const rows=fresh();
 const r=await render(rows,{screen:'overview'},{kind:'click',action:'review:ag-corvane'},{viewport:{width:'panel',coarse:false}});
 assert.match(r.html,/aria-label="Verify: Supply agreement — Corvane/);
 assert.ok((r.html.match(/class="ct-review-item"/g)??[]).length>=4);assert.doesNotMatch(r.html.replace(/<aside class="k-panel"[\s\S]*$/,''),/ct-review/);
 assert.doesNotMatch(r.html.slice(r.html.indexOf('k-panel')),/<table/,'no table inside the verification panel');
 assert.ok(r.calls.filter(c=>c.name==='documents.quote').length<=15);
 const ok=await render(rows,r.state,{kind:'submit',action:'save:review',form:{verified_by:'Dana (fictional)',terms_decision:'verify','ob_ob-corvane-capacity':'verify','ob_ob-corvane-forecast':'skip','ob_ob-corvane-audit':'reject'}});
 assert.deepEqual(ok.saves.map(c=>[c.kind,c.recordId]),[['update_record','terms-ag-corvane'],['update_record','ob-corvane-capacity'],['archive_record','ob-corvane-audit']]);
 assert.equal(ok.saves[0].data.extraction_status,'verified');assert.equal(ok.saves[0].data.verified_by,'Dana (fictional)');assert.equal(ok.saves[0].data.verified_on,'2026-11-12');
 const none=await render(rows,r.state,{kind:'submit',action:'save:review',form:{terms_decision:'verify'}});assert.equal(none.saves.length,0);assert.match(none.notice.message,/Enter your name/);
});

test('calculations match the 1.1.1 hand-checked set on the new screens',async()=>{
 const rows=fresh(),ov=text((await render(rows,{screen:'overview'})).html);
 assert.match(ov,/Cancel Data processing agreement — Brightwater Data Services by 1 Dec 2026 or it renews for 12 months \(in 19 days\)/);
 const fam=text((await render(rows,{screen:'families'})).html);assert.match(fam,/Family value \(EUR\) EUR 2,200,000 Also in USD \(not converted\) USD 40,000 Added by change orders EUR 150,000 · 6\.8%/);
 const cda=text((await render(rows,{screen:'cdas',cdaQuery:'northwind'})).html);assert.match(cda,/Yes — 1 active CDA with Northwind Bio/);assert.match(cda,/confidential until 1 Mar 2032/);
 const ob=text((await render(rows,{screen:'obligations'})).html);assert.match(ob,/SOW 2 bioanalysis invoice — batch 3 .*31 Oct 2026 Overdue/);
 // A partial read withholds totals and says so (no banner).
 const partial=await render(rows,{screen:'overview'},{kind:'open'},{totalFor:t=>t==='agreements'?2000:undefined});
 assert.match(text(partial.html),/Partial data: Agreement: 16 of 2000 rows read/);assert.match(text(partial.html),/— Active agreements/);assert.doesNotMatch(partial.html,/role="alert"/);
});

test('notices replace banners, and opening, previews and read-only settings never write',async()=>{
 const rows=fresh();
 const err=await render(rows,{screen:'cdas'},{kind:'submit',action:'cda-request',form:{counterparty_id:'',purpose:''}});
 assert.deepEqual(err.notice,{kind:'error',message:'Choose the counterparty organization (add it in Counterparties if it is new).'});assert.doesNotMatch(err.html,/role="alert"|ct-banner/);
 const ok=await render(rows,{screen:'cdas'},{kind:'submit',action:'cda-request',form:{counterparty_id:'org-aurora',purpose:'Evaluate a second antibody'}});
 assert.equal(ok.saves[0].data.agreement_type,'cda_nda');assert.equal(ok.notice.kind,'success');assert.equal(ok.state.after.terms.purpose,'Evaluate a second antibody');
 const preview=await render(rows,{screen:'agreements'},{kind:'change',action:'edit:ag-lease:status:0',value:'expired'},{saved:false});assert.equal(preview.saves.length,0);
 const ro=await render(rows,{screen:'agreements'},{kind:'change',action:'edit:ag-lease:status:0',value:'expired'},{config:cfgFor(fullMap,{readOnly:true})});assert.equal(ro.saves.length,0);
 // Upload: the platform opens its upload; the app offers to attach the returned version.
 const reg=await render(rows,{screen:'agreements'},{kind:'click',action:'details:agreements:ag-lease'});assert.match(reg.html,/data-trialy-document="upload attach:ag-lease"/);
 const up=await render(rows,reg.state,{kind:'change',action:'document:uploaded:attach:ag-lease',value:'00000000-0000-4000-8000-0000000000b7'});
 assert.match(up.html,/aria-label="Attach the signed original"/);
 const at=await render(rows,up.state,{kind:'click',action:'save:attach'});assert.equal(at.saves[0].data.document_version_id,'00000000-0000-4000-8000-0000000000b7');assert.match(at.notice.message,/not AI-readable/);
});

/* P9, G13: 1.1.1 had overlapping controls in its verification dialog at the assistant-panel width; every 2.0.0 screen and
 * panel passes the production design inspector under the current rules at 1440, 400 and 390 px. */
test('design check under the current rules: every screen and panel at 1440, 400 and 390 px',async()=>{
 const {inspectAppDesign}=await import('../src/workspace/design-quality.js');const {kitCss}=await import('../src/shared/app-kit.js');
 const rows=fresh(),frames:any[]=[];
 const add=async(name:string,state:any,event?:any,opts:any={})=>{const r=await render(rows,state,event??{kind:'open',action:''},opts);frames.push({name,html:r.html,css:kitCss()+r.output.css});};
 for(const screen of SCREENS)await add(screen,{screen});
 await add('agreements-filters',{screen:'agreements',filtersOpen:true,docSearch:true,query:'capacity'});
 await add('cda-answer',{screen:'cdas',cdaQuery:'meridian'});
 await add('pipeline-panel-width',{screen:'pipeline'},undefined,{viewport:{width:'panel',coarse:false}});
 const screens=frames.splice(0);
 await add('agreement-details',{screen:'agreements'},{kind:'click',action:'details:agreements:ag-corvane'});
 await add('verify-proposals',{screen:'overview'},{kind:'click',action:'review:ag-corvane'},{viewport:{width:'panel',coarse:false}});
 await add('edit-obligation',{screen:'obligations'},{kind:'click',action:'open-edit:obligations:ob-sow1-fee'});
 await add('key-terms',{screen:'agreements'},{kind:'click',action:'terms:ag-kestrel'});
 await add('mark-signed',{screen:'pipeline'},{kind:'click',action:'sign:ag-cda-meridian-2026'});
 await add('attach',{screen:'agreements'},{kind:'click',action:'attach:ag-lease'});
 await add('renewal',{screen:'agreements'},{kind:'click',action:'renewal:ag-brightwater'});
 await add('due-diligence',{screen:'agreements'},{kind:'click',action:'dd:open'});
 for(const batch of [screens,frames]){const design=await inspectAppDesign(batch,'current');assert.deepEqual(design.issues,[],JSON.stringify(design.issues,null,1));}
});
