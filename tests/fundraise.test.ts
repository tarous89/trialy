import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execute} from '../src/foundation/runtime.js';
import {appTemplates} from '../src/workspace/app-templates.js';
import {readCustomLayout} from '../src/shared/custom-layout.js';
import {fieldSchema} from '../src/shared/schema.js';

/* Fundraise 2.0.0: the catalog entry, prepared exactly as AppTemplates.operation prepends configuration, executed in production QuickJS. */
const entry=await appTemplates.read({templateId:'life.investor-crm',version:'2.0.0'});
const schema=JSON.parse(await readFile('templates/source/investor-crm/schema.example.json','utf8'));
const core=JSON.parse(await readFile('templates/core-contract/v1.json','utf8'));
const registry=JSON.parse(await readFile('templates/contracts/outputs.json','utf8')).roles;
const demo=JSON.parse(await readFile('templates/source/investor-crm/demo_data.json','utf8')).records;
const roles=Object.keys(schema);
const fullMap=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:Object.keys(schema[r].logicalFields)}]));
const fullBindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
const cfgFor=(map:any=fullMap,extra:any={})=>({...entry.defaults,tableMap:JSON.stringify(map),asOfOverride:'2026-11-11',...extra});
const source=(config:any=cfgFor(),b:any[]=fullBindings)=>`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(b)};\n${entry.source}`;
type Row={id:string,version:number,role:string,data:any};
const fresh=():Row[]=>structuredClone(demo);
async function render(rows:Row[],state:any={},event:any={kind:'open',action:''},opts:any={}){
 const changes:any[]=[];
 const output:any=await execute(source(opts.config,opts.bindings),{saved:opts.saved??true,writable:opts.writable??true,state,event},async(name,v:any)=>{
  if(name==='records.propose'){if(opts.failPropose)throw Error('denied');changes.push(...v);return {status:'proposed'};}
  if(name==='integrations.list')return {integrations:opts.integrations??[]};
  assert.equal(name,'records.read');if(opts.read)return opts.read(v,rows);
  const all=rows.filter(r=>r.role===v.typeId).map(r=>({id:r.id,version:r.version,data:r.data}));
  return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};
 });return {output,changes,html:output.html as string,state:output.state};
}
function approve(rows:Row[],changes:any[]){for(const c of changes){if(c.kind==='create_record')rows.push({id:randomUUID(),version:0,role:c.typeId,data:c.data});else{const r=rows.find(x=>x.id===c.recordId)!;if(r.version!==c.expectedVersion)throw Error('stale version');r.data={...r.data,...c.data};r.version++;}}}
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ');
const org=(rows:Row[],name:string)=>rows.find(r=>r.role==='organizations'&&r.data.name===name)!;
const seed=(rows:Row[])=>rows.find(r=>r.role==='fundraise.rounds'&&r.data.name==='Seed 2026')!;
const opp=(rows:Row[],name:string,round=seed(rows))=>rows.find(r=>r.role==='fundraise.opportunities'&&r.data.organization_id===org(rows,name).id&&r.data.round_id===round.id)!;
const strip=({ai,...f}:any)=>f;

test('catalog entry, contract-exact roles, the fundraise.tranches output and seven layout screens',async()=>{
 assert.equal(entry.version,'2.0.0');assert.equal(entry.name,'Fundraise');assert.equal(entry.engine,'frontend-js');assert.ok(entry.source!.length<180000);
 for(const def of Object.values(schema) as any[])for(const f of def.fields){assert.ok(fieldSchema.safeParse(f).success,JSON.stringify(f));assert.equal(f.multiple,false);assert.match(f.key,/^[a-z][a-z0-9_]{0,63}$/);}
 // Core roles use exactly the core data contract v1 fields.
 for(const role of ['organizations','people']){assert.equal(schema[role].contract,'core.v1');assert.deepEqual(schema[role].fields,core.roles[role].fields.map(({owner,...f}:any)=>f),role);}
 // The published output matches the registry entry exactly (field for field, ignoring the ai flag).
 assert.equal(schema['fundraise.tranches'].contract,'fundraise.v1');assert.equal(schema['fundraise.tranches'].optional,undefined);
 assert.deepEqual(schema['fundraise.tranches'].fields.map(strip),registry['fundraise.tranches'].versions['fundraise.v1'].fields);
 assert.equal(registry['fundraise.tranches'].writer,'life.investor-crm');
 // Integrations: optional + integration, the provider's contract, read-only never set (own table for manual entry).
 for(const role of ['dataroom.access_grants','dataroom.engagement']){const d=schema[role];assert.deepEqual([d.contract,d.optional,d.integration,d.readOnly],['dataroom.v1',true,true,undefined],role);assert.deepEqual(d.fields.map(strip),registry[role].versions['dataroom.v1'].fields,role);}
 const pi=schema['programs.plan_items'];assert.deepEqual([pi.contract,pi.optional,pi.integration,pi.readOnly],['programs.v2',true,true,undefined]);
 assert.deepEqual(pi.fields.map((f:any)=>f.key),['name','program_id','item_type','end_date','status','is_key'],'binds only the six fields');
 for(const f of pi.fields){const c=registry['programs.plan_items'].versions['programs.v2'].fields.find((x:any)=>x.key===f.key);const {description:_a,...mine}=strip(f),{description:_b,...theirs}=c;assert.deepEqual(mine,theirs,f.key);}
 const app=roles.filter(r=>r.startsWith('fundraise.'));assert.deepEqual(app,['fundraise.settings','fundraise.investor_profiles','fundraise.rounds','fundraise.opportunities','fundraise.activities','fundraise.tranches']);
 for(const r of app)assert.equal(schema[r].contract,'fundraise.v1',r);
 const prepared=`const templateConfiguration=${JSON.stringify({...entry.defaults,heading:'Fundraise'})};\nconst templateBindings=[];\n${entry.source}`;
 const layout=readCustomLayout(prepared)!;assert.deepEqual(layout.schema.screens.map(s=>s.id),['overview','pipeline','investors','round','activity','engagement','settings']);
 assert.equal(entry.documentation!.tasks.mode,'optional');
 for(const k of ['quickStart','dataContract','interactionContract','lifecycle','limitations','examples','tasks'])assert.ok((entry.documentation as any)[k],k);
 assert.match(entry.documentation!.dataContract,/dataroom\.v1/);assert.match(entry.documentation!.dataContract,/fundraise\.tranches fundraise\.v1/);
});

test('acceptance 1: only signed counts as raised; verbal and soft separate; reconciles with the hand-checked fictional round',async()=>{
 const r=await render(fresh());const t=text(r.html);
 // By hand (Seed 2026, EUR): signed Harbourline 3,000,000 + Meridian 2,000,000 = 5,000,000; verbal Northlake 6,000,000 + Calder 2,500,000 = 8,500,000;
 // soft Alder 500,000 + Fjordhaven 1,000,000 = 1,500,000; Redfern (rejected, soft 400,000) is not in the pipeline; progress 5,000,000 ÷ 15,000,000 = 33.3%.
 assert.match(t,/Raised EUR 5,000,000 of EUR 15,000,000 \(33\.3%\)/);
 assert.match(t,/Raised \(signed\) EUR 5\.0M Only signed commitments count Verbal EUR 8\.5M Not added to raised Soft EUR 1\.5M Not added to raised Progress 33\.3%/);
 assert.match(t,/Lead: Northlake Bio Ventures · term sheet received/);
 // Moving a verbal commitment to signed without a committed amount does not count it; with the amount it does.
 const rows=fresh();const n=opp(rows,'Northlake Bio Ventures');n.data.interest='signed';
 let x=text((await render(rows)).html);assert.match(x,/Raised EUR 5,000,000/);assert.match(x,/1 signed commitment without a committed amount: Northlake Bio Ventures/);
 n.data.amount_committed=6000000;x=text((await render(rows)).html);assert.match(x,/Raised EUR 11,000,000 of EUR 15,000,000 \(73\.3%\)/);assert.match(x,/Verbal EUR 2\.5M/);
 // The syndicate total on the Round screen is the same signed sum.
 assert.match(text((await render(fresh(),{section:'round'})).html),/Raised \(signed\) EUR 5,000,000 33\.3%/);
});

test('acceptance 2: an amount in another currency than the round is flagged and excluded from totals',async()=>{
 const t=text((await render(fresh())).html);
 assert.match(t,/1 amount in another currency excluded\. Silverpine Angels \(USD 250,000, signed\)\. Totals use EUR only; amounts are never converted\./);
 const rows=fresh();opp(rows,'Calder Life Sciences Fund').data.currency='GBP';
 const g=text((await render(rows)).html);assert.match(g,/2 amounts in another currency excluded/);assert.match(g,/Verbal EUR 6\.0M/);assert.match(g,/Raised EUR 5,000,000/);
 assert.match(text((await render(fresh(),{section:'round'})).html),/Silverpine Angels Signed USD 250,000 Other currency: excluded —/);
});

test('acceptance 3: stale and due lists match the fictional dataset with known dates',async()=>{
 const r=await render(fresh());
 const items=[...r.html.matchAll(/<li><span><span class="fr-pill [a-z]*">(Overdue|Due|Stale)<\/span> <strong>([^<]+)<\/strong><small class="fr-sub">([^<]+)<\/small>/g)].map(m=>[m[1],m[2].replace(/&#39;/g,"'"),m[3]]);
 // As of 11 Nov 2026, stale after 14 days (last activity before 28 Oct), due by 17 Nov 2026; overdue first, then due, then stale.
 assert.deepEqual(items,[
  ['Overdue','Alder Family Office','Next step: Share updated model · 5 Nov 2026'],
  ['Due','Northlake Bio Ventures','Next step: Return marked-up term sheet · 12 Nov 2026'],
  ['Due','Calder Life Sciences Fund','Follow up: Diligence session on CMC · 13 Nov 2026'],
  ['Due','Fjordhaven Partners','Next step: Partner meeting date · 14 Nov 2026'],
  ['Stale','Brightwater Growth','No activity logged (Contacted)'],
  ['Stale','Alder Family Office','No activity for 32 days (Partner meeting)'],
  ['Stale','Fjordhaven Partners','No activity for 15 days (First meeting)']]);
 // Harbourline's 22 Oct follow-up is closed by its later 3 Nov activity; committed and passed investors are never stale; the stale threshold is a setting.
 assert.doesNotMatch(text(r.html),/Harbourline Capital Follow up/);
 const rows=fresh();rows.find(x=>x.role==='fundraise.settings')!.data.stale_days=30;
 const t30=text((await render(rows)).html);assert.match(t30,/Stale Alder Family Office No activity for 32 days/);assert.doesNotMatch(t30,/Stale Fjordhaven/);
});

test('acceptance 4: assistant-proposed investors stay proposed until accepted; rejected ones never appear in the pipeline',async()=>{
 const rows=fresh();
 const pipe=await render(rows,{section:'pipeline'});assert.doesNotMatch(pipe.html,/Redfern Capital|Larchmont|Quarry Hill/);assert.match(text(pipe.html),/1 opportunity with a proposed or rejected investor not shown/);
 const inv=await render(rows,{section:'investors',invTab:'proposed'});const t=text(inv.html);
 assert.match(t,/Proposed \(2\)/);assert.match(t,/Larchmont Bio Fund/);assert.match(t,/Quarry Hill Ventures/);
 // A proposed investor cannot be added to a round.
 const blocked=await render(rows,{section:'investors'},{kind:'click',action:'add:opps:'+org(rows,'Larchmont Bio Fund').id});assert.match(blocked.state.notice,/Accept this investor before adding it to a round/);
 // Accept is an explicit reviewed change of profile_status only.
 const prof=rows.find(r=>r.role==='fundraise.investor_profiles'&&r.data.organization_id===org(rows,'Larchmont Bio Fund').id)!;
 const c=await render(rows,inv.state,{kind:'click',action:'decide:'+prof.id+':accepted'});
 const p=await render(rows,c.state,{kind:'click',action:'confirm-decide'});
 assert.deepEqual(p.changes,[{kind:'update_record',recordId:prof.id,expectedVersion:0,data:{profile_status:'accepted'}}]);assert.equal(prof.data.profile_status,'proposed','nothing changes before approval');
 approve(rows,p.changes);assert.match(text((await render(rows,{section:'investors'})).html),/Larchmont Bio Fund/);
 // Rejected: listed under Rejected, never on the board, and its amounts never count.
 assert.match(text((await render(rows,{section:'investors',invTab:'rejected'})).html),/Redfern Capital/);
 assert.match(text((await render(rows)).html),/Soft EUR 1\.5M/);
});

test('acceptance 5: saving an activity updates last_activity_on in the same reviewed save; versions are captured when the editor opens',async()=>{
 const rows=fresh(),o=opp(rows,'Fjordhaven Partners');
 const open=await render(rows,{section:'activity'},{kind:'click',action:'add:acts:'+o.id});assert.equal(open.state.editor.versions[o.id],0);
 o.version=0;// unchanged
 const sub=await render(rows,open.state,{kind:'submit',action:'save-record',form:{opportunity_id:o.id,activity_on:'2026-11-10',kind:'call',summary:'Partner meeting booked',follow_up_due:'2026-11-18'}});
 assert.equal(sub.changes.length,2,sub.state.notice);
 assert.deepEqual(sub.changes[0],{kind:'create_record',typeId:'fundraise.activities',data:{opportunity_id:o.id,activity_on:'2026-11-10',kind:'call',summary:'Partner meeting booked',follow_up_due:'2026-11-18',source:'manual'}});
 assert.deepEqual(sub.changes[1],{kind:'update_record',recordId:o.id,expectedVersion:0,data:{last_activity_on:'2026-11-10'}});
 approve(rows,sub.changes);assert.doesNotMatch(text((await render(rows)).html),/Stale Fjordhaven/);
 // An older activity never moves last_activity_on backwards; a failed proposal keeps the draft.
 const old=await render(rows,{section:'activity'},{kind:'click',action:'add:acts:'+o.id});
 const o2=await render(rows,old.state,{kind:'submit',action:'save-record',form:{opportunity_id:o.id,activity_on:'2026-10-01',kind:'email',summary:'Backfilled email'}});
 assert.equal(o2.changes.length,1);
 const f=await render(rows,old.state,{kind:'submit',action:'save-record',form:{opportunity_id:o.id,activity_on:'2026-11-11',kind:'email',summary:'Kept draft'}},{failPropose:true});
 assert.match(f.state.notice,/Action not completed/);assert.equal(f.state.editor.draft.summary,'Kept draft');
});

test('acceptance 7: a tranche milestone status comes from own entries, or from Programs once linked; "no milestone" otherwise',async()=>{
 const rows=fresh();let t=text((await render(rows,{section:'round'})).html);
 assert.match(t,/1 EUR 6,000,000 First close — 15 Dec 2026 Expected No milestone/);
 assert.match(t,/2 EUR 5,000,000 Lead candidate nominated Lead candidate nomination 31 Jul 2027 Expected On track \(planned, 30 Jun 2027\)/);
 assert.match(t,/3 EUR 4,000,000 IND-enabling tox data GLP tox readout 31 Oct 2027 Expected Milestone at risk/);
 assert.match(t,/Your own milestone entries/);assert.match(t,/Total EUR 15,000,000 100% of target/);
 rows.find(r=>r.role==='programs.plan_items'&&r.data.name==='Lead candidate nomination')!.data.status='done';
 assert.match(text((await render(rows,{section:'round'})).html),/Milestone done: met candidate/);
 // Linked to Programs: the milestones role is bound to Programs' plan items, read-only; own entries are no longer read.
 const prog:Row[]=fresh().filter(r=>r.role!=='programs.plan_items');const pid=randomUUID();
 prog.push({id:pid,version:3,role:'programs.plan_items',data:{name:'IND submission',program_id:randomUUID(),item_type:'milestone',end_date:'2027-03-31',status:'at_risk',is_key:true}});
 prog.push({id:randomUUID(),version:1,role:'programs.plan_items',data:{name:'GMP batch',program_id:randomUUID(),item_type:'activity',end_date:'2027-01-31',status:'planned',is_key:false}});
 prog.find(r=>r.role==='fundraise.tranches'&&r.data.tranche_no===2)!.data.milestone_id=pid;
 const linkedMap={...fullMap,'programs.plan_items':{...fullMap['programs.plan_items'],writableFields:[]}};
 const l=await render(prog,{section:'round'},undefined,{config:cfgFor(linkedMap),integrations:[{role:'programs.plan_items',source:'linked',chosen:true,offer:null}]});const lt=text(l.html);
 assert.match(lt,/Lead candidate nominated IND submission 31 Jul 2027 Expected Milestone at risk/);assert.match(lt,/IND-enabling tox data Milestone unavailable/);
 assert.match(lt,/From Programs \(plan items\), read-only here/);assert.doesNotMatch(l.html,/add:miles|GMP batch|data-trialy-integration/);
 // Unreadable milestones: the tranche says so; nothing else breaks.
 const u=text((await render(rows,{section:'round'},undefined,{read:(v:any,all:Row[])=>v.typeId==='programs.plan_items'?{unavailable:true,rows:[],total:null}:{rows:all.filter(r=>r.role===v.typeId).slice(v.offset,v.offset+v.limit),total:all.filter(r=>r.role===v.typeId).length}})).html);
 assert.match(u,/Milestone not readable/);assert.match(u,/No milestone/);
});

test('integration lines: one subtle data-trialy-integration button when the platform offers install or connect; none once linked or decided',async()=>{
 const rows=fresh();
 const install=await render(rows,{section:'engagement'},undefined,{integrations:[{role:'dataroom.access_grants',source:'own',offer:'install'},{role:'dataroom.engagement',source:'own',offer:'install'},{role:'programs.plan_items',source:'own',offer:'install'}]});
 assert.match(install.html,/Works with Data Room\. <button type="button" class="fr-linkbtn" data-trialy-integration="install dataroom\.access_grants">Add Data Room<\/button>/);
 assert.equal((install.html.match(/data-trialy-integration/g)||[]).length,1,'one line for both data-room roles');
 const r=await render(rows,{section:'round'},undefined,{integrations:[{role:'programs.plan_items',source:'own',offer:'install'}]});
 assert.match(r.html,/Works with Programs\. <button type="button" class="fr-linkbtn" data-trialy-integration="install programs\.plan_items">Add Programs<\/button>/);
 const connect=await render(rows,{section:'engagement'},undefined,{integrations:[{role:'dataroom.access_grants',source:'own',offer:'connect'},{role:'dataroom.engagement',source:'own',offer:'connect'}]});
 assert.match(connect.html,/Data Room is in your workspace\. <button[^>]*data-trialy-integration="connect dataroom\.access_grants"[^>]*>Use its data<\/button>/);
 // After access is linked, the views role is offered next.
 const next=await render(rows,{section:'engagement'},undefined,{integrations:[{role:'dataroom.access_grants',source:'linked',chosen:true,offer:null},{role:'dataroom.engagement',source:'own',offer:'connect'}]});
 assert.match(next.html,/data-trialy-integration="connect dataroom\.engagement"[^>]*>Use its view data/);
 const none=await render(rows,{section:'engagement'},undefined,{integrations:[{role:'dataroom.access_grants',source:'own',chosen:true,offer:null},{role:'dataroom.engagement',source:'own',chosen:true,offer:null}]});
 assert.doesNotMatch(none.html,/data-trialy-integration/);assert.match(none.html,/add:grants/);
 // Unsaved previews never call integrations.list and show no line.
 assert.doesNotMatch((await render(rows,{section:'engagement'},undefined,{saved:false,integrations:[{role:'dataroom.access_grants',source:'own',offer:'install'}]})).html,/data-trialy-integration/);
});

test('engagement: manual entries and signals; linked provider data is read-only; restricted or unavailable data says so',async()=>{
 const rows=fresh();const r=await render(rows,{section:'engagement'});const t=text(r.html);
 assert.match(t,/Your own entries: typed in, or proposed by the assistant from DocSend or ShareVault reports/);
 // By hand (as of 11 Nov): Northlake 4 + 2 views last viewed within 7 days = 6 → hot; Fjordhaven active, no views → never opened;
 // Harbourline views on 26 Sep, 5 Oct, then 8 Nov: 34 days without views → re-opened.
 assert.match(t,/Re-opened Harbourline Capital Re-opened the room on 8 Nov 2026 after 34 days\. Suggested: follow up this week\./);
 assert.match(t,/Hot Northlake Bio Ventures Viewed 6 times this week/);assert.match(t,/Never opened Fjordhaven Partners Has access, never opened/);
 assert.doesNotMatch(t,/Never opened Alder/,'invited, not active');
 assert.match(t,/Northlake Bio Ventures 2 documents viewed/);
 // Record access by hand (own table): a reviewed create with source manual.
 const a=await render(rows,{section:'engagement'},{kind:'click',action:'add:grants'});
 const s=await render(rows,a.state,{kind:'submit',action:'save-record',form:{organization_id:org(rows,'Oakmere Capital').id,status:'active',granted_on:'2026-11-11',room_name:'Seed 2026 data room'}});
 assert.equal(s.changes[0].typeId,'dataroom.access_grants');assert.equal(s.changes[0].data.source,'manual');
 // Linked: read-only, no record buttons, the provider's rows are read.
 const linkedMap={...fullMap,'dataroom.access_grants':{...fullMap['dataroom.access_grants'],writableFields:[]},'dataroom.engagement':{...fullMap['dataroom.engagement'],writableFields:[]}};
 const L=await render(rows,{section:'engagement'},undefined,{config:cfgFor(linkedMap),integrations:[{role:'dataroom.access_grants',source:'linked',chosen:true,offer:null},{role:'dataroom.engagement',source:'linked',chosen:true,offer:null}]});
 assert.match(text(L.html),/From the linked Data Room, read-only\. Give or revoke access in the Data Room app\./);assert.doesNotMatch(L.html,/add:grants|add:views|edit:grants/);
 const unread=(v:any,all:Row[])=>v.typeId.startsWith('dataroom.')?{unavailable:true,rows:[],total:null}:{rows:all.filter(x=>x.role===v.typeId).slice(v.offset,v.offset+v.limit),total:all.filter(x=>x.role===v.typeId).length};
 assert.match(text((await render(rows,{section:'engagement'},undefined,{read:unread})).html),/Restricted You cannot read the data-room tables/);
 const gone=await render(rows,{section:'engagement'},undefined,{read:unread,config:cfgFor(linkedMap),integrations:[{role:'dataroom.access_grants',source:'linked',offer:null}]});
 assert.match(text(gone.html),/Data Room data is unavailable/);assert.doesNotMatch(gone.html,/fr-banner bad/);
 assert.match(text((await render(rows,{},undefined,{read:unread})).html),/Raised EUR 5,000,000/,'the rest of Fundraise keeps working');
 // No data-room tables at all (removed tab): Engagement says so and nothing breaks.
 const noRoom={...fullMap};delete noRoom['dataroom.access_grants'];delete noRoom['dataroom.engagement'];
 assert.match(text((await render(rows,{section:'engagement'},undefined,{config:cfgFor(noRoom),bindings:fullBindings.filter(b=>!b.typeId.startsWith('dataroom.'))})).html),/This app has no data-room access table/);
});

test('pipeline: board by stage, filters, Move opens a reviewed edit; passing needs a reason; nothing is marked signed by the app',async()=>{
 const rows=fresh();const p=await render(rows,{section:'pipeline'});
 assert.match(p.html,/<div class="fr-board-wrap" role="region" aria-label="Pipeline board" tabindex="0">/);
 for(const s of ['Target','Contacted','First meeting','Partner meeting','Due diligence','Term sheet','Committed','Closed','Passed'])assert.match(p.html,new RegExp('<h3>'+s+' <span>'));
 assert.match(p.html,/fr-dot hot/);assert.match(p.html,/fr-dot never/);
 const f=await render(rows,{section:'pipeline',filters:{tier:'a'}});assert.match(f.html,/Northlake/);assert.doesNotMatch(f.html,/Alder Family Office/);
 const o=opp(rows,'Fjordhaven Partners');
 const m=await render(rows,{section:'pipeline'},{kind:'click',action:'move:'+o.id});assert.match(m.html,/Move Fjordhaven Partners/);assert.equal(m.changes.length,0);
 const need=await render(rows,m.state,{kind:'submit',action:'move-submit',form:{stage:'passed',interest:'none'}});assert.match(need.state.notice,/choose a pass reason/);assert.equal(need.changes.length,0);
 const ok=await render(rows,need.state,{kind:'submit',action:'move-submit',form:{stage:'passed',interest:'none',pass_reason:'want_in_vivo_data',pass_detail:'Second model'}});
 assert.deepEqual(ok.changes,[{kind:'update_record',recordId:o.id,expectedVersion:0,data:{stage:'passed',interest:'none',pass_reason:'want_in_vivo_data',pass_detail:'Second model'}}]);
 approve(rows,ok.changes);
 // Pass-reason patterns for the round and across rounds.
 const a=text((await render(rows,{section:'activity'})).html);
 assert.match(a,/This round 2 of 5 passes: too early; 2 of 5 passes: want in vivo data; 1 of 5 passes: outside mandate/);
 assert.match(a,/All rounds 3 of 6 passes: too early; 2 of 6 passes: want in vivo data; 1 of 6 passes: outside mandate/);
});

test('lead: marking a lead unmarks the previous one and sets the round lead in one review; offers compare side by side',async()=>{
 const rows=fresh(),c=opp(rows,'Calder Life Sciences Fund'),n=opp(rows,'Northlake Bio Ventures'),rd=seed(rows);
 const r=await render(rows,{section:'round'});const t=text(r.html);
 // Newest offers first: Calder (5 Nov), then Northlake (30 Oct). Post-money = amount + pre-money.
 assert.match(t,/Term Calder Life Sciences Fund Northlake Bio Ventures Amount EUR 5,000,000 EUR 6,000,000 Pre-money EUR 20,000,000 EUR 24,000,000 Post-money EUR 25,000,000 EUR 30,000,000 Instrument Convertible Priced/);
 const open=await render(rows,r.state,{kind:'click',action:'lead:'+c.id});const p=await render(rows,open.state,{kind:'click',action:'confirm-lead'});
 assert.deepEqual(p.changes,[{kind:'update_record',recordId:c.id,expectedVersion:0,data:{is_lead:true}},{kind:'update_record',recordId:n.id,expectedVersion:0,data:{is_lead:false}},{kind:'update_record',recordId:rd.id,expectedVersion:0,data:{lead_org_id:c.data.organization_id}}]);
 // Comparison selection: at most three; unchecking removes one.
 const un=await render(rows,r.state,{kind:'change',action:'cmp:'+n.id,value:false});assert.deepEqual(un.state.cmp,[c.id]);
});

test('partial and over-budget reads disable totals and say so; read-only users cannot propose',async()=>{
 const rows=fresh();
 const partial=await render(rows,{},undefined,{read:(v:any,all:Row[])=>{const l=all.filter(r=>r.role===v.typeId);return v.typeId==='fundraise.opportunities'?{rows:l.slice(0,5),total:null}:{rows:l.slice(v.offset,v.offset+v.limit),total:l.length};}});
 const t=text(partial.html);assert.match(t,/Partial data: totals are disabled\. Opportunities: partial read \(5 of more than 5 rows\)/);assert.match(t,/Totals withheld: the data was not read completely/);assert.doesNotMatch(t,/Raised EUR/);
 const denied=text((await render(rows,{},undefined,{read:(v:any,all:Row[])=>v.typeId==='fundraise.rounds'?{unavailable:true,rows:[],total:null}:{rows:all.filter(r=>r.role===v.typeId).slice(v.offset,v.offset+v.limit),total:all.filter(r=>r.role===v.typeId).length}})).html);
 assert.match(denied,/You cannot read the round table/);
 const ro=await render(rows,{section:'pipeline'},undefined,{writable:false});assert.doesNotMatch(ro.html,/data-action="add:opps"(?![^>]*disabled)/);
 const blocked=await render(rows,{section:'pipeline'},{kind:'click',action:'move:'+opp(rows,'Alder Family Office').id},{writable:false});
 const sub=await render(rows,blocked.state,{kind:'submit',action:'move-submit',form:{stage:'due_diligence',interest:'soft'}},{writable:false});assert.equal(sub.changes.length,0);assert.match(sub.state.notice,/cannot change opportunities/);
});

test('every input carries data-ui-state; the round selection applies immediately; saved layout wins over stale state',async()=>{
 const rows=fresh(),pre=rows.find(r=>r.role==='fundraise.rounds'&&r.data.name==='Pre-seed 2025')!;
 const htmls:string[]=[];
 for(const section of ['overview','pipeline','investors','round','activity','engagement','settings'])htmls.push((await render(rows,{section,filtersOpen:true})).html);
 htmls.push((await render(rows,{section:'pipeline'},{kind:'click',action:'add:opps'})).html,(await render(rows,{section:'pipeline'},{kind:'click',action:'move:'+opp(rows,'Alder Family Office').id})).html,(await render(rows,{section:'settings'},{kind:'click',action:'edit-settings'})).html);
 for(const h of htmls)for(const tag of h.match(/<(input|select|textarea)\b[^>]*>/g)||[])assert.match(tag,/data-ui-state="true"/,tag);
 // Changing the round selector recalculates the thermometer in the same render.
 const sw=await render(rows,{},{kind:'change',action:'round',value:pre.id});const t=text(sw.html);
 assert.match(t,/Pre-seed 2025 · Pre-seed · Closed/);assert.match(t,/Raised EUR 1,500,000 of EUR 2,000,000 \(75%\)/);assert.match(t,/Lead: Harbourline Capital · Closed/);
 const layout=await render(rows,{layout:{tabs:['settings']}},undefined,{config:cfgFor(fullMap,{layoutProfile:JSON.stringify({heading:'Seed raise',tabs:['round','overview','pipeline','investors','activity','engagement','settings'],cols:{},visible:{engagement:false,'investors:intro_path':false}})})});
 assert.match(layout.html,/<h1 class="fr-title">Seed raise<\/h1>/);assert.ok(layout.html.indexOf('nav:round')<layout.html.indexOf('nav:overview'));assert.doesNotMatch(/<nav[^]*?<\/nav>/.exec(layout.html)![0],/nav:engagement/);
 const inv=await render(rows,{section:'investors'},undefined,{config:cfgFor(fullMap,{layoutProfile:JSON.stringify({heading:'Fundraise',tabs:['overview','pipeline','investors','round','activity','engagement','settings'],cols:{},visible:{'investors:intro_path':false}})})});
 assert.doesNotMatch(inv.html,/<th scope="col">Intro path<\/th>/);assert.match(inv.html,/<th scope="col">Vintage<\/th>/);
 // Runtime as-of date when not pinned.
 const today=new Date().toISOString().slice(0,10),parts=today.split('-');
 assert.match((await render(rows,{},undefined,{config:cfgFor(fullMap,{asOfOverride:''})})).html,new RegExp('As of '+Number(parts[2])+' [A-Z][a-z]{2} '+parts[0]+' \\(today\\)'));
});

test('empty start: a round can be created from no data; settings are a reviewed write',async()=>{
 const rows:Row[]=[];const e=await render(rows);assert.match(text(e.html),/No round yet/);
 const a=await render(rows,e.state,{kind:'click',action:'add:rounds'});
 const s=await render(rows,a.state,{kind:'submit',action:'save-record',form:{name:'Seed 2027',round_type:'seed',currency:'EUR',status:'planning',target_amount:'10000000'}});
 assert.deepEqual(s.changes,[{kind:'create_record',typeId:'fundraise.rounds',data:{name:'Seed 2027',round_type:'seed',target_amount:10000000,currency:'EUR',status:'planning',archived:false}}]);
 approve(rows,s.changes);assert.match(text((await render(rows)).html),/Raised EUR 0 of EUR 10,000,000 \(0%\)/);
 const st=await render(rows,{section:'settings'},{kind:'click',action:'edit-settings'});
 const bad=await render(rows,st.state,{kind:'submit',action:'save-record',form:{stages:'target, wishlist'}});assert.match(bad.state.notice,/Unknown stages: wishlist/);
 const good=await render(rows,st.state,{kind:'submit',action:'save-record',form:{stale_days:'21'}});assert.equal(good.changes[0].kind,'create_record');assert.equal(good.changes[0].data.stale_days,21);
});

test('production design inspector accepts all seven screens',async()=>{
 const {inspectAppDesign}=await import('../src/workspace/design-quality.js');
 const frames:any[]=[];for(const section of ['overview','pipeline','investors','round','activity','engagement','settings']){const r=await render(fresh(),{section},undefined,{integrations:[{role:'dataroom.access_grants',source:'own',offer:'install'},{role:'programs.plan_items',source:'own',offer:'connect'}]});frames.push({name:section,html:r.html,css:r.output.css});}
 const o=await render(fresh(),{section:'pipeline'},{kind:'click',action:'details:opps:'+opp(fresh(),'Northlake Bio Ventures').id});frames.push({name:'opportunity-panel',html:o.html,css:o.output.css});
 const design=await inspectAppDesign(frames);assert.deepEqual(design.issues,[]);
});
