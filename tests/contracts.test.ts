import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execute} from '../src/foundation/runtime.js';
import {appTemplates} from '../src/workspace/app-templates.js';
import {readCustomLayout} from '../src/shared/custom-layout.js';
import {fieldSchema} from '../src/shared/schema.js';

/* Contracts 1.0.0: the catalog entry, prepared exactly as AppTemplates.operation prepends configuration, executed in production QuickJS.
 * Fixtures are the fictional demo records; every date and total below was computed by hand (QA.md), not by the app's formulas. */
const entry=await appTemplates.read({templateId:'life.contracts',version:'1.0.0'});
const schema=JSON.parse(await readFile('templates/source/contracts/schema.example.json','utf8'));
const contract=JSON.parse(await readFile('templates/core-contract/v1.json','utf8'));
const registry=JSON.parse(await readFile('templates/contracts/outputs.json','utf8'));
const demo=JSON.parse(await readFile('templates/source/contracts/demo_data.json','utf8')).records;
const roles=Object.keys(schema);
const fullMap=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:Object.keys(schema[r].logicalFields)}]));
const fullBindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
const cfgFor=(map:any=fullMap,extra:any={})=>({...entry.defaults,tableMap:JSON.stringify(map),asOfOverride:'2026-11-12',...extra});
const source=(config:any=cfgFor(),b:any[]=fullBindings)=>`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(b)};\n${entry.source}`;
type Row={id:string,version:number,role:string,data:any};
const fresh=():Row[]=>structuredClone(demo);
const DOCS=[{documentId:'00000000-0000-4000-8000-0000000000a6',versionId:'00000000-0000-4000-8000-0000000000b6',version:0,latest:true,filename:'Corvane supply agreement (signed).pdf',mime:'application/pdf',byteSize:200000,aiReadable:true,extraction:'ready',uploadedOn:'2025-09-23'},
 {documentId:'00000000-0000-4000-8000-0000000000a7',versionId:'00000000-0000-4000-8000-0000000000b7',version:0,latest:true,filename:'Lab lease (scan).pdf',mime:'application/pdf',byteSize:900000,aiReadable:false,extraction:'unavailable',uploadedOn:'2024-01-05'}];
async function render(rows:Row[],state:any={},event:any={kind:'open',action:''},opts:any={}){
 const changes:any[]=[],calls:string[]=[];
 const output:any=await execute(source(opts.config,opts.bindings),{saved:opts.saved??true,writable:opts.writable??true,state,event},async(name,v:any)=>{
  calls.push(name);
  if(name==='records.propose'){if(opts.failPropose)throw Error('denied');changes.push(...v);return {status:'proposed'};}
  if(name==='integrations.list')return {integrations:opts.integrations??[{role:'programs.plan_items',name:'Plan items',source:'own',chosen:false,provider:'Programs',offer:'install'}]};
  if(name==='documents.list')return opts.docs??{documents:DOCS,total:DOCS.length,complete:true};
  if(name==='documents.search')return {hits:[{documentId:DOCS[0].documentId,versionId:DOCS[0].versionId,version:0,filename:DOCS[0].filename,passage:'annual capacity reservation fee of EUR 300,000',pages:[7]}],coverage:{total:2,pending:0,unavailable:1,partial:0}};
  if(name==='documents.quote')return opts.quote?opts.quote(v):{versionId:v.versionId,status:'ready',found:true,page:v.page,pages:[v.page],onPage:true};
  assert.equal(name,'records.read');if(opts.read)return opts.read(v,rows);
  const all=rows.filter(r=>r.role===v.typeId).map(r=>({id:r.id,version:r.version,data:r.data}));
  return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};
 });return {output,changes,calls,html:output.html as string,state:output.state};
}
function approve(rows:Row[],changes:any[]){for(const c of changes){if(c.kind==='create_record')rows.push({id:randomUUID(),version:0,role:c.typeId,data:c.data});else{const r=rows.find(x=>x.id===c.recordId)!;if(r.version!==c.expectedVersion)throw Error('stale version');r.data={...r.data,...c.data};r.version++;}}}
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ');
const terms=(rows:Row[],ag:string)=>rows.find(r=>r.role==='contracts.terms'&&r.data.agreement_id===ag)!;

test('catalog entry, contract-shaped scalar schema, roles as in the scope and seven layout screens',async()=>{
 assert.equal(entry.version,'1.0.0');assert.equal(entry.name,'Contracts');assert.equal(entry.engine,'frontend-js');assert.ok(entry.source!.length<180000);
 for(const def of Object.values(schema) as any[])for(const f of def.fields){assert.ok(fieldSchema.safeParse(f).success,JSON.stringify(f));assert.equal(f.multiple,false);assert.match(f.key,/^[a-z][a-z0-9_]{0,63}$/);}
 // Core roles: the core contract v1 fields; Contracts owns the seven optional agreements fields; Programs-owned health fields are not bound.
 const strip=(fs:any[])=>fs.map(({owner,...f}:any)=>f);
 assert.deepEqual(schema.agreements.fields,strip(contract.roles.agreements.fields));
 assert.deepEqual(contract.roles.agreements.fields.filter((f:any)=>f.owner).map((f:any)=>[f.key,f.owner]),['parent_id','program_id','study_id','total_value','currency','signed_on','owner'].map(k=>[k,'life.contracts']));
 for(const role of ['organizations','people','studies'])assert.deepEqual(schema[role].fields,strip(contract.roles[role].fields),role);
 assert.deepEqual(schema.programs.fields,contract.roles.programs.fields.filter((f:any)=>!f.owner));
 // Section 5: modes exactly as declared.
 const modes=Object.fromEntries(roles.map(r=>[r,[schema[r].contract,!!schema[r].optional,!!schema[r].integration,!!schema[r].readOnly]]));
 assert.deepEqual(modes,{agreements:['core.v1',false,false,false],organizations:['core.v1',false,false,false],people:['core.v1',true,false,false],programs:['core.v1',true,false,false],studies:['core.v1',true,false,false],
  'programs.plan_items':['programs.v2',true,true,false],'contracts.settings':['contracts.v1',false,false,false],'contracts.terms':['contracts.v1',false,false,false],'contracts.obligations':['contracts.v1',false,false,false]});
 // Integration binds name, program_id, item_type, end_date, status, is_key, identical to Programs' fields.
 const programsPlan=JSON.parse(await readFile('templates/source/project-oversight/schema.example.json','utf8'))['programs.plan_items'].fields;
 assert.deepEqual(schema['programs.plan_items'].fields.map((f:any)=>f.key),['name','program_id','item_type','end_date','status','is_key']);
 for(const f of schema['programs.plan_items'].fields)assert.deepEqual(f,programsPlan.find((x:any)=>x.key===f.key));
 // The output contract is published in the registry and the writer table provides every field of it.
 const out=registry.roles['contracts.obligations'];assert.equal(out.kind,'output');assert.equal(out.writer,'life.contracts');
 assert.deepEqual(schema['contracts.obligations'].fields.map(({ai,...f}:any)=>f),out.versions['contracts.v1'].fields);
 const prepared=`const templateConfiguration=${JSON.stringify({...entry.defaults,heading:'Contracts'})};\nconst templateBindings=[];\n${entry.source}`;
 assert.deepEqual(readCustomLayout(prepared)!.schema.screens.map(s=>s.id),['overview','register','families','obligations','cdas','pipeline','settings']);
 assert.equal(entry.documentation!.tasks.mode,'optional');for(const k of ['quickStart','dataContract','interactionContract','lifecycle','limitations','examples','tasks'])assert.ok((entry.documentation as any)[k],k);
});

test('acceptance 1: notice deadline and confidentiality end match the hand-checked set and are stored on save',async()=>{
 const rows=fresh();
 // Stored demo values, checked by hand: 14 Jun 2027 − 90 d = 16 Mar 2027; 30 Sep 2027 − 180 d = 3 Apr 2027; 31 Dec 2026 − 30 d = 1 Dec 2026;
 // 1 Mar 2027 + 5 y = 1 Mar 2032; no expiry: 10 Jan 2026 + 3 y = 10 Jan 2029; 29 Feb 2024 + 2 y = 28 Feb 2026 (month-end clamp).
 for(const [ag,nd,ce] of [['ag-msa-helix','2027-03-16',null],['ag-corvane','2027-04-03',null],['ag-brightwater','2026-12-01',null],['ag-kestrel','2027-01-01',null],['ag-lease','2028-07-04',null],['ag-cda-northwind',null,'2032-03-01'],['ag-cda-lumen',null,'2029-01-10'],['ag-cda-meridian-2023',null,'2026-02-28']]){const t=terms(rows,ag as string).data;assert.equal(t.notice_deadline,nd,ag as string);assert.equal(t.confidentiality_end,ce,ag as string);}
 const det=text((await render(rows,{section:'register'},{kind:'click',action:'details:agreements:ag-msa-helix'})).html);
 assert.match(det,/Notice deadline 16 Mar 2027 \(in 124 days\)/);
 // Edit the Brightwater notice period: 31 Dec 2026 − 45 d = 16 Nov 2026, stored in the same reviewed change.
 const open=await render(rows,{section:'register'},{kind:'click',action:'terms:ag-brightwater'});
 const saved=await render(rows,open.state,{kind:'submit',action:'save-terms',form:{notice_days:'45'}});
 assert.deepEqual(saved.changes,[{kind:'update_record',recordId:'terms-ag-brightwater',expectedVersion:0,data:{notice_days:45,notice_deadline:'2026-11-16'}}]);
 // Renewal "none" clears the stored deadline.
 const none=await render(rows,(await render(rows,{},{kind:'click',action:'terms:ag-kestrel'})).state,{kind:'submit',action:'save-terms',form:{renewal:'none'}});
 assert.deepEqual(none.changes[0].data,{renewal:'none',notice_deadline:null});
 // Changing an agreement's expiry recomputes its stored dates in the same review: 31 Mar 2027 − 30 d = 1 Mar 2027.
 const ed=await render(rows,{section:'register'},{kind:'click',action:'edit:agreements:ag-brightwater'});
 const moved=await render(rows,ed.state,{kind:'submit',action:'save-record',form:{expiry_date:'2027-03-31'}});
 assert.deepEqual(moved.changes.map(c=>c.data),[{expiry_date:'2027-03-31'},{notice_deadline:'2027-03-01'}]);
 // Signing a CDA with an expiry on 29 Feb 2028 and 2 years of confidentiality stores 28 Feb 2030.
 const sign=await render(rows,{section:'pipeline'},{kind:'click',action:'sign:ag-cda-meridian-2026'});
 const signed=await render(rows,sign.state,{kind:'submit',action:'sign-submit',form:{signed_on:'2026-11-12',effective_date:'2026-11-12',expiry_date:'2028-02-29',confidentiality_years:'2',cda_direction:'mutual'}});
 assert.deepEqual(signed.changes[0].data,{status:'active',signed_on:'2026-11-12',effective_date:'2026-11-12',expiry_date:'2028-02-29'});
 assert.equal(signed.changes[1].data.confidentiality_end,'2030-02-28');assert.equal(signed.changes[1].data.status_since,'2026-11-12');
});

test('acceptance 2: family value per currency, other currencies separate, change-order share, earliest expiry and next notice',async()=>{
 const r=await render(fresh(),{section:'families'});const t=text(r.html);
 // By hand: SOW 1 1,200,000 + SOW 2 850,000 + CO 1 150,000 = EUR 2,200,000 (MSA has no value); CO 2 USD 40,000 apart; share 150,000 / 2,200,000 = 6.8 %.
 assert.match(t,/Family value \(EUR\) EUR 2,200,000/);assert.match(t,/Also in USD \(not converted\) USD 40,000/);assert.match(t,/Added by change orders EUR 150,000 · 6\.8%/);
 assert.match(t,/Master services agreement — Helix Clinical Research.*Earliest expiry \(active\) 31 Dec 2026 Next notice deadline 16 Mar 2027/);
 assert.match(t,/Family value \(USD\) USD 500,000.*1 member without a value is not in the total/);
 // Partial reads withhold totals.
 const partial=await render(fresh(),{section:'families'},undefined,{read:(v:any,rows:Row[])=>{const all=rows.filter(x=>x.role===v.typeId);return {rows:all.slice(0,3),total:all.length+50};}});
 assert.match(text(partial.html),/Partial data/);assert.doesNotMatch(text(partial.html),/2,200,000/);
 // Add a child: preset parent, counterparty and currency; a cycle is rejected.
 const add=await render(fresh(),{section:'families'},{kind:'click',action:'add-child:ag-sow1'});assert.equal(add.state.editor.draft.parent_id,'ag-sow1');assert.equal(add.state.editor.draft.agreement_type,'change_order');
 const cyc=await render(fresh(),(await render(fresh(),{},{kind:'click',action:'edit:agreements:ag-msa-helix'})).state,{kind:'submit',action:'save-record',form:{parent_id:'ag-co1'}});
 assert.equal(cyc.changes.length,0);assert.match(cyc.state.notice,/cannot sit under itself/);assert.ok(cyc.state.editor,'draft kept');
});

test('obligations: next due of recurring ones, overdue, payments by currency, and unverified never counted as confirmed',async()=>{
 const r=await render(fresh(),{section:'obligations'});const t=text(r.html);
 // By hand (as of 12 Nov 2026): quarterly from 31 Mar 2025 → 31 Dec 2026; monthly from 28 Feb 2025 → 28 Nov 2026; annual from 30 Sep 2025 → 30 Sep 2027.
 assert.match(t,/SOW 1 quarterly service fee .*?31 Dec 2026/);assert.match(t,/Monthly enrolment report .*?28 Nov 2026/);assert.match(t,/Annual diligence report to Aurora .*?30 Sep 2027/);
 assert.match(t,/SOW 2 bioanalysis invoice — batch 3 .*?31 Oct 2026 Overdue/);
 assert.match(r.html,/<th scope="col">EUR we pay<\/th>/);assert.match(r.html,/<th scope="col">USD we pay<\/th>/);
 assert.match(t,/Month EUR we pay EUR we receive USD we pay USD we receive Nov 2026 2,000 · · · Dec 2026 102,000 · 40,000 ·/,'by hand: 100,000 fee + 2,000 retainer; USD 40,000 apart');assert.match(t,/Dec 2026 1 unverified/,'the unverified quarterly forecast is flagged, not listed');
 const ov=text((await render(fresh(),{section:'overview'})).html);
 assert.match(ov,/Cancel Data processing agreement — Brightwater Data Services by 1 Dec 2026 or it renews for 12 months \(in 19 days\)/);
 assert.match(ov,/1 overdue obligations 4 unverified extractions 3 in flight/);
 assert.match(ov,/Supply agreement — Corvane Biologics \(PX-101 drug product\) 3 proposed obligations from the assistant · unverified, not counted/);
 assert.doesNotMatch(ov,/Annual capacity reservation fee/,'unverified obligations are not listed as due');
 // Status changes are reviewed.
 const c=await render(fresh(),{section:'obligations'},{kind:'click',action:'ob-status:ob-sow2-b3:done'});const done=await render(fresh(),c.state,{kind:'click',action:'confirm-ob-status'});
 assert.deepEqual(done.changes,[{kind:'update_record',recordId:'ob-sow2-b3',expectedVersion:0,data:{status:'done'}}]);
 // An obligation a person enters in the app is their own confirmed entry.
 const add=await render(fresh(),{section:'obligations'},{kind:'click',action:'add:obligations'});
 const created=await render(fresh(),add.state,{kind:'submit',action:'save-record',form:{agreement_id:'ag-kestrel',title:'Board report',kind:'report',direction:'we_owe',status:'open',due_date:'2027-01-15'}});
 assert.equal(created.changes[0].data.verified,true);
});

test('acceptance 3 (app side): proposals show quotes and pages, are checked against the original, and only a named person verifies them',async()=>{
 const rows=fresh();
 const open=await render(rows,{section:'overview'},{kind:'click',action:'review:ag-corvane'});const h=text(open.html);
 assert.match(h,/“The Customer shall pay an annual capacity reservation fee of EUR 300,000 on each anniversary of the Effective Date\.” \(p\. 7\) Quote found on page 7/);
 assert.match(h,/Notice period \(days\) 180 “Such notice shall be given at least one hundred and eighty \(180\) days before expiry of the Initial Term\.” \(p\. 3\)/);
 assert.ok(open.calls.filter(c=>c==='documents.quote').length>=6);
 // A quote that is not in the original, or not on the stated page, is shown as such.
 const odd=await render(rows,{section:'overview'},{kind:'click',action:'review:ag-corvane'},{quote:(v:any)=>v.quote.includes('audit')?{found:false,status:'ready',pages:[]}:v.quote.includes('forecast')?{found:true,status:'ready',page:v.page,pages:[5],onPage:false}:{found:true,status:'ready',page:v.page,pages:[v.page],onPage:true}});
 assert.match(text(odd.html),/Quote not found in the original/);assert.match(text(odd.html),/Found, but on page 5/);
 // No name: nothing is proposed and the draft stays.
 const anon=await render(rows,open.state,{kind:'submit',action:'review-submit',form:{verified_by:'',terms_decision:'verify'}});
 assert.equal(anon.changes.length,0);assert.match(anon.state.notice,/Enter your name/);assert.ok(anon.state.review);
 const ok=await render(rows,open.state,{kind:'submit',action:'review-submit',form:{verified_by:'Alex (fictional)',terms_decision:'verify','ob_ob-corvane-capacity':'verify','ob_ob-corvane-forecast':'skip','ob_ob-corvane-audit':'reject'}});
 assert.deepEqual(ok.changes,[{kind:'update_record',recordId:'terms-ag-corvane',expectedVersion:0,data:{extraction_status:'verified',verified_by:'Alex (fictional)',verified_on:'2026-11-12'}},
  {kind:'update_record',recordId:'ob-corvane-capacity',expectedVersion:0,data:{verified:true}},{kind:'update_record',recordId:'ob-corvane-audit',expectedVersion:0,data:{archived:true}}]);
 approve(rows,ok.changes);rows.find(r=>r.id==='ob-corvane-audit')!.data.archived=true;
 const after=text((await render(rows,{section:'overview'})).html);assert.match(after,/1 unverified extractions/);
 // Documents: the AI-readable flag and extraction status come from the platform; a non-AI-readable original is reported.
 rows.find(r=>r.id==='terms-ag-lease')!.data.document_version_id=DOCS[1].versionId;
 assert.match(text((await render(rows,{},{kind:'click',action:'details:agreements:ag-lease'})).html),/AI-readable No — assistants cannot extract from it Text extraction Unavailable/);
 assert.match(text((await render(rows,{},{kind:'click',action:'details:agreements:ag-corvane'})).html),/Corvane supply agreement \(signed\)\.pdf · v0 AI-readable Yes/);
 // Unsaved previews never read documents.
 const prev=await render(rows,{},{kind:'click',action:'details:agreements:ag-corvane'},{saved:false});assert.ok(!prev.calls.some(c=>c.startsWith('documents.')));assert.match(text(prev.html),/Documents show in the saved app/);
 // Register search can include the signed originals, with coverage.
 const search=await render(rows,{section:'register',query:'capacity reservation',docSearch:true});
 assert.match(text(search.html),/In signed originals Supply agreement — Corvane Biologics.*page 7.*1 without readable text/);
});

test('acceptance 4: "Have we signed a CDA with…?" returns the agreement, direction and confidentiality end',async()=>{
 const yes=text((await render(fresh(),{section:'cdas',cdaQuery:'northwind'})).html);
 assert.match(yes,/Yes — 1 active CDA with Northwind Bio Mutual CDA — Northwind Bio Active · Mutual · signed 27 Feb 2025 · term to 1 Mar 2027 · confidential until 1 Mar 2032/);
 const old=text((await render(fresh(),{section:'cdas',cdaQuery:'Meridian'})).html);
 assert.match(old,/Only expired or ended CDAs with Meridian/);assert.match(old,/Incoming \(we receive\) · signed 28 Feb 2023 · term to 29 Feb 2024 · confidential until 28 Feb 2026/);assert.match(old,/Out for signature · Mutual · not signed/);
 assert.match(text((await render(fresh(),{section:'cdas',cdaQuery:'lumen'})).html),/Outgoing \(we disclose\) · signed 10 Jan 2026 · confidential until 10 Jan 2029/);
 assert.match(text((await render(fresh(),{section:'cdas',cdaQuery:'Nobody Ltd'})).html),/No organization matches/);
 // Partial reads never answer "no".
 const partial=await render(fresh(),{section:'cdas',cdaQuery:'Brightwater'},undefined,{read:(v:any,rows:Row[])=>{const all=rows.filter(x=>x.role===v.typeId);return {rows:all,total:all.length+5};}});
 assert.match(text(partial.html),/Not sure: the register was not read completely/);
 // New CDA request in two fields: drafting agreement now, its purpose saved as key terms once the record exists.
 const rows=fresh();const req=await render(rows,{section:'cdas'},{kind:'submit',action:'cda-submit',form:{counterparty_id:'org-kestrel',purpose:'Evaluate an advisory collaboration'}});
 assert.deepEqual(req.changes,[{kind:'create_record',typeId:'agreements',data:{name:'CDA — Kestrel Advisory Ltd',agreement_type:'cda_nda',counterparty_id:'org-kestrel',status:'drafting',archived:false}}]);
 approve(rows,req.changes);const next=await render(rows,req.state,{kind:'click',action:'pending-save:0'});
 const t=next.changes[0];assert.equal(t.kind,'create_record');assert.equal(t.typeId,'contracts.terms');assert.deepEqual([t.data.purpose,t.data.cda_direction,t.data.status_since,t.data.extraction_status],['Evaluate an advisory collaboration','mutual','2026-11-12','none']);
});

test('acceptance 5: pipeline moves are reviewed; signing activates and prompts for the signed original, which is attached by review',async()=>{
 const rows=fresh();const board=await render(rows,{section:'pipeline'});const t=text(board.html);
 assert.match(t,/Drafting 1 .*Clinical trial agreement — St Aldric University Hospital.*10 days in status/);assert.match(t,/In negotiation 1 .*58 days in status/);assert.match(t,/Out for signature 1 .*13 days in status/);
 const ask=await render(rows,board.state,{kind:'click',action:'move:ag-aldric:in_negotiation'});assert.equal(ask.changes.length,0,'a move opens a confirmation first');
 const mv=await render(rows,ask.state,{kind:'click',action:'confirm-move'});
 assert.deepEqual(mv.changes,[{kind:'update_record',recordId:'ag-aldric',expectedVersion:0,data:{status:'in_negotiation'}},{kind:'update_record',recordId:'terms-ag-aldric',expectedVersion:0,data:{status_since:'2026-11-12'}}]);
 await assert.rejects(Promise.resolve().then(async()=>{const bad=await render(rows,board.state,{kind:'click',action:'move:ag-aldric:active'});if(bad.state.notice.includes('Mark signed'))throw Error('rejected');}),/rejected/);
 const sign=await render(rows,board.state,{kind:'click',action:'sign:ag-cda-meridian-2026'});const s=await render(rows,sign.state,{kind:'submit',action:'sign-submit',form:{signed_on:'2026-11-10'}});
 assert.equal(s.changes[0].data.status,'active');assert.match(s.state.notice,/add the signed original/);
 assert.match(s.html,/data-trialy-document="upload attach:ag-cda-meridian-2026"/,'the signed-original upload is offered');
 // The platform upload returns the new version; the app proposes attaching it (document and version IDs, extraction pending).
 const up=await render(rows,s.state,{kind:'change',action:'document:uploaded:attach:ag-corvane',value:DOCS[0].versionId});assert.ok(up.state.attach);
 const at=await render(rows,{...up.state,attach:{...up.state.attach,agreementId:'ag-kestrel',termsVersion:0}},{kind:'click',action:'confirm-attach'});
 assert.deepEqual(at.changes,[{kind:'update_record',recordId:'terms-ag-kestrel',expectedVersion:0,data:{document_id:DOCS[0].documentId,document_version_id:DOCS[0].versionId,extraction_status:'none'}}]);
 // Read-only users: every write control disabled, nothing proposed.
 const ro=await render(rows,{section:'pipeline',signed:'ag-cda-meridian-2026'},undefined,{writable:false});assert.match(ro.html,/data-action="move:ag-aldric:in_negotiation" disabled/);assert.match(ro.html,/data-trialy-document="upload attach:[^"]+" disabled/);
 const roTry=await render(rows,ask.state,{kind:'click',action:'confirm-move'},{writable:false});assert.equal(roTry.changes.length,0);
});

test('expires before milestone, the Programs integration hint, and graceful degradation without milestones, people or programs',async()=>{
 const rows=fresh();const ov=text((await render(rows,{section:'overview'})).html);
 assert.match(ov,/Supply agreement — Corvane Biologics \(PX-101 drug product\) Expires 30 Sep 2027, before Phase 1 topline data \(31 Mar 2028\)/);
 const s=await render(rows,{section:'settings'});assert.match(s.html,/Works with Programs\. <button[^>]*data-trialy-integration="install programs\.plan_items"[^>]*>Add Programs<\/button>/);
 const c=await render(rows,{section:'settings'},undefined,{integrations:[{role:'programs.plan_items',source:'own',offer:'connect'}]});assert.match(c.html,/data-trialy-integration="connect programs\.plan_items"[^>]*>Use its milestones/);
 const linked=await render(rows,{section:'settings'},undefined,{integrations:[{role:'programs.plan_items',source:'linked',offer:null}]});assert.match(text(linked.html),/From Programs, read only here/);assert.doesNotMatch(linked.html,/data-trialy-integration|add:milestones/);
 // Without optional roles the app works and hides the dependent features.
 const map={...fullMap};for(const r of ['programs.plan_items','people','programs','studies'])delete (map as any)[r];
 const bare=fullBindings.filter(b=>map[b.typeId]);
 for(const sct of ['overview','register','families','obligations','cdas','pipeline','settings']){const h=await render(rows,{section:sct},undefined,{config:cfgFor(map),bindings:bare});assert.doesNotMatch(h.html,/ct-banner bad|could not be shown/,sct);}
 assert.doesNotMatch(text((await render(rows,{section:'overview'},undefined,{config:cfgFor(map),bindings:bare})).html),/before Phase 1/);
 assert.match(text((await render(rows,{section:'settings'},undefined,{config:cfgFor(map),bindings:bare})).html),/no milestones table, so milestone links are hidden/);
});

test('partial and unavailable reads disable totals and say so; versions are captured at open; failed proposals keep the draft',async()=>{
 const un=await render(fresh(),{section:'overview'},undefined,{read:(v:any,rows:Row[])=>v.typeId==='contracts.obligations'?{unavailable:true,rows:[],total:null}:{rows:rows.filter(x=>x.role===v.typeId),total:rows.filter(x=>x.role===v.typeId).length}});
 assert.match(text(un.html),/Partial data.*You cannot read the obligation table/);assert.match(text(un.html),/— overdue obligations/);
 const unknown=await render(fresh(),{section:'register'},undefined,{read:(v:any,rows:Row[])=>{const all=rows.filter(x=>x.role===v.typeId);return {rows:all,total:null};}});assert.match(text(unknown.html),/Partial data/);
 const rows=fresh();const open=await render(rows,{section:'register'},{kind:'click',action:'edit:agreements:ag-kestrel'});
 rows.find(r=>r.id==='ag-kestrel')!.version=3;
 const sub=await render(rows,open.state,{kind:'submit',action:'save-record',form:{owner:'New owner'}});assert.equal(sub.changes[0].expectedVersion,0,'the version from when the editor opened');
 const fail=await render(rows,open.state,{kind:'submit',action:'save-record',form:{owner:'Kept draft'}},{failPropose:true});
 assert.match(fail.state.notice,/Action not completed/);assert.equal(fail.state.editor.draft.owner,'Kept draft');
 assert.throws(()=>approve(rows,sub.changes),/stale/);
 const cur=await render(fresh(),{section:'register'},{kind:'click',action:'edit:agreements:ag-kestrel'});
 const money=await render(fresh(),cur.state,{kind:'submit',action:'save-record',form:{total_value:'abc'}});assert.equal(money.changes.length,0);assert.match(money.state.notice,/number/);
});

test('due-diligence list, renewal decision note and register filters',async()=>{
 const dd=await render(fresh(),{section:'register'},{kind:'click',action:'dd-open'});
 const f=await render(fresh(),dd.state,{kind:'change',action:'dd-draft',form:{type_licence_in:'true',type_cmo_supply:'true',status_active:'true',min:'100000'}});
 const box=/<textarea[^>]*id="ct-dd-text"[^>]*>([^<]*)<\/textarea>/.exec(f.html)![1];
 assert.match(box,/Exclusive licence — Aurora Institute.*USD 500,000/);assert.match(box,/Supply agreement — Corvane.*EUR 2,400,000.*renewal option, notice by 3 Apr 2027.*\(terms not yet verified\)/);assert.doesNotMatch(box,/Brightwater/);
 const rn=await render(fresh(),{},{kind:'click',action:'renewal:ag-brightwater'});
 const dec=await render(fresh(),rn.state,{kind:'submit',action:'renewal-submit',form:{decision:'renegotiate',note:'Ask for a lower fee'}});
 assert.equal(dec.changes[0].data.notes,'Renewal decision on 2026-11-12: renegotiate — Ask for a lower fee.');assert.deepEqual(dec.changes[1].data,{status:'in_negotiation'});
 const filt=text((await render(fresh(),{section:'register',filters:{agreement_type:'cda_nda',status:'active'}})).html);assert.match(filt,/Showing 1–2 of 2/);
 const unv=text((await render(fresh(),{section:'register',filters:{verified:'unverified'}})).html);assert.match(unv,/Showing 1–1 of 1/);assert.match(unv,/Corvane/);
});

test('every input carries data-ui-state, the as-of date comes from the runtime, and saved layout wins',async()=>{
 const rows=fresh();const htmls:string[]=[];
 for(const s of ['overview','register','families','obligations','cdas','pipeline','settings'])htmls.push((await render(rows,{section:s,filtersOpen:true,cdaQuery:'meridian'})).html);
 for(const a of ['edit:agreements:ag-sow1','terms:ag-corvane','review:ag-corvane','sign:ag-aldric','renewal:ag-kestrel','dd-open','attach:ag-kestrel','add:obligations','details:agreements:ag-msa-helix','edit-settings'])htmls.push((await render(rows,{},{kind:'click',action:a})).html);
 for(const h of htmls)for(const tag of h.match(/<(input|select|textarea)\b[^>]*>/g)||[])assert.match(tag,/data-ui-state="true"/,tag);
 const live=await render(rows,{section:'overview'},undefined,{config:cfgFor(fullMap,{asOfOverride:''})});assert.match(text(live.html),/As of \d+ \w{3} \d{4} \(today\)/);
 const layout=await render(rows,{layout:{tabs:['settings']}},undefined,{config:cfgFor(fullMap,{layoutProfile:JSON.stringify({heading:'Agreements',tabs:['cdas','overview','register','families','obligations','pipeline','settings'],cols:{},visible:{pipeline:false}})})});
 assert.match(layout.html,/<h1 class="ct-title">Agreements<\/h1>/);assert.ok(layout.html.indexOf('nav:cdas')<layout.html.indexOf('nav:overview'));assert.doesNotMatch(/<nav[^]*?<\/nav>/.exec(layout.html)![0],/nav:pipeline/);
});

test('production design inspector accepts all seven screens and the main panels',async()=>{
 const {inspectAppDesign}=await import('../src/workspace/design-quality.js');
 const frames:any[]=[];for(const s of ['overview','register','families','obligations','cdas','pipeline','settings']){const r=await render(fresh(),{section:s});frames.push({name:s,html:r.html,css:r.output.css});}
 for(const a of ['review:ag-corvane','details:agreements:ag-msa-helix']){const r=await render(fresh(),{},{kind:'click',action:a});frames.push({name:a,html:r.html,css:r.output.css});}
 const design=await inspectAppDesign(frames);assert.deepEqual(design.issues,[]);
});
