import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execute} from '../src/foundation/runtime.js';
import {appTemplates} from '../src/workspace/app-templates.js';
import {readCustomLayout,updateCustomLayout} from '../src/shared/custom-layout.js';

/* Runway 2.0.0: the catalog entry, prepared exactly as AppTemplates.operation prepends configuration, executed in production QuickJS. */
const entry=await appTemplates.read({templateId:'life.cash-runway',version:'2.0.0'});
const schema=JSON.parse(await readFile('templates/source/cash-runway/schema.example.json','utf8'));
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:Object.keys(schema[r].logicalFields)}]));
const bindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
const cfg={...entry.defaults,tableMap:JSON.stringify(map)};
const source=(config:any=cfg)=>`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(bindings)};\n${entry.source}`;
type Row={id:string,version:number,role:string,data:any};
async function render(rows:Row[],state:any={},event:any={kind:'open',action:''},opts:any={}){
 const changes:any[]=[];
 const output:any=await execute(source(opts.config),{saved:opts.saved??true,writable:opts.writable??true,state,event},async(name,v:any)=>{
  if(name==='records.propose'){changes.push(...v);return {status:'proposed'};}
  assert.equal(name,'records.read');if(opts.read)return opts.read(v,rows);
  const all=rows.filter(r=>r.role===v.typeId).map(r=>({id:r.id,version:r.version,data:opts.strip?Object.fromEntries(Object.entries(r.data).filter(([k])=>!opts.strip.includes(r.role+'.'+k))):r.data}));
  return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};
 });return {output,changes,html:output.html as string,state:output.state};
}
/* Apply an approved proposal to the in-memory fixture, rejecting stale versions like the server does. */
function approve(rows:Row[],changes:any[]){for(const c of changes){if(c.kind==='create_record')rows.push({id:randomUUID(),version:0,role:c.typeId,data:c.data});else{const r=rows.find(x=>x.id===c.recordId)!;if(r.version!==c.expectedVersion)throw Error('stale version');r.data={...r.data,...c.data};r.version++;}}}
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ');

/* Fictional reconciliation dataset (RUNWAY.md §12.11): two currencies, one payment schedule, three hires, one contingent grant, two closed months. */
function dataset(){
 const rows:Row[]=[];const add=(role:string,data:any)=>{const id=randomUUID();rows.push({id,version:0,role,data});return id;};
 add('settings',{reporting_currency:'EUR',enabled_currencies:'EUR, USD',runway_target_months:18,trailing_window_months:3,min_cash_reserve:0,loaded_cost_pct:20,opening_balance:1000000,opening_date:'2026-06-30',categories:'Clinical, Research, People, Facilities, Other'});
 const p1=add('programs',{name:'TX-1',archived:false});
 add('rates',{month:'2026-07-01',currency:'USD',rate_per_eur:1.10,source:'manual'});add('rates',{month:'2026-08-01',currency:'USD',rate_per_eur:1.25,source:'manual'});
 const L=(name:string,o:any)=>add('lines',{name,status:'committed',currency:'EUR',archived:false,...o});
 L('Lab rent',{direction:'spend',category:'Facilities',driver:'monthly',amount:10000,start_month:'2026-07-01'});
 const cro=L('US CRO',{direction:'spend',category:'Clinical',program_id:p1,driver:'monthly',amount:12500,currency:'USD',start_month:'2026-07-01',end_month:'2027-06-01'});
 for(const [m,a] of [['2026-09-01',30000],['2026-12-01',30000],['2027-03-01',40000]] as const)L('Tox study',{direction:'spend',category:'Research',driver:'one_off',amount:a,start_month:m,schedule_group:'tox'});
 const seed=L('Seed extension',{direction:'cash_in',category:'Other',driver:'one_off',amount:200000,start_month:'2027-01-01',cash_in_type:'equity'});
 L('Grant',{direction:'cash_in',category:'Other',driver:'one_off',amount:250000,currency:'USD',start_month:'2027-02-01',status:'contingent',cash_in_type:'grant'});
 const P=(title:string,o:any)=>add('positions',{title,currency:'EUR',archived:false,...o});
 P('CEO',{start_month:'2026-01-01',annual_salary:120000,status:'current'});P('Scientist',{start_month:'2026-07-01',annual_salary:60000,status:'current'});P('Clinical lead',{start_month:'2026-10-01',annual_salary:96000,currency:'USD',status:'planned'});
 add('milestones',{name:'Phase 1 start',program_id:p1,target_month:'2027-01-01',archived:false});
 add('actuals',{month:'2026-07-01',category:'Clinical',program_id:p1,direction:'spend',amount:11000,currency:'USD'});
 add('actuals',{month:'2026-08-01',category:'Clinical',program_id:p1,direction:'spend',amount:12500,currency:'USD'});
 return {rows,p1,cro,seed};
}
async function closeMonth(rows:Row[],month:string,balance:number,actuals:Record<string,number>){
 const open=await render(rows,{section:'actuals'},{kind:'click',action:'open-close',value:month});assert.ok(open.state.closeDraft,open.state.notice);
 const r=await render(rows,open.state,{kind:'submit',action:'close-submit',form:{month,closing_balance:String(balance),currency:'EUR',...Object.fromEntries(Object.entries(actuals).map(([k,v])=>['actual_'+k,String(v)]))}});
 assert.ok(r.changes.length,r.state.notice);approve(rows,r.changes);return r;
}
async function reconciled(){
 const d=dataset();
 await closeMonth(d.rows,'2026-07',962000,{Facilities:10000,People:18000});
 const lock=await render(d.rows,{section:'plan',planTab:'budgets'},{kind:'submit',action:'lock-budget',form:{year:'2026'}});
 const locked=await render(d.rows,lock.state,{kind:'click',action:'confirm-lock'});assert.equal(locked.changes.length,1,locked.state.notice);approve(d.rows,locked.changes);
 await closeMonth(d.rows,'2026-08',924000,{Facilities:9000,People:19000});
 return d;
}

test('catalog entry is a new immutable major version that keeps 1.2.2 discoverable',async()=>{
 assert.equal(entry.version,'2.0.0');assert.equal(entry.name,'Runway');assert.equal(entry.engine,'frontend-js');
 assert.doesNotMatch(entry.source!,/const templateConfiguration=|const templateBindings=/);
 assert.equal((await appTemplates.read({templateId:'life.cash-runway'})).version,'2.0.0');
 assert.equal((await appTemplates.read({templateId:'life.cash-runway',version:'1.2.2'})).version,'1.2.2');
 assert.equal(roles.length,13);for(const r of roles)for(const f of schema[r].fields){assert.equal(f.multiple,false);assert.match(f.key,/^[a-z][a-z0-9_]{0,63}$/);}
 assert.deepEqual(readCustomLayout(source())!.schema.screens.map(s=>s.id),['overview','cash_flow','plan','people','scenarios','actuals','settings']);
});

test('totals reconcile by hand against the fictional §12 dataset',async()=>{
 const {rows}=await reconciled();
 const closes=rows.filter(r=>r.role==='closes').sort((a,b)=>a.data.month.localeCompare(b.data.month));
 assert.equal(closes.length,2);
 // July close (as of Jul 2026, cash 962,000): 27 months; August close (924,000): 26 months, cash-out Nov 2028.
 assert.equal(closes[0].data.runway_months,27);assert.equal(closes[1].data.runway_months,26);assert.equal(closes[1].data.cash_out_month,'2028-11-01');assert.equal(closes[1].data.runway_status,'ok');
 const m=JSON.parse(closes[1].data.metrics);
 assert.equal(m.asOf,'2026-08');assert.equal(m.start,924000);assert.equal(m.runway.lastsUntil,'2028-10');assert.equal(m.runway.startRaise,'2027-05');assert.equal(m.runwayContingent.months,31);
 // August burn: 9,000 rent + 12,500 USD / 1.25 = 10,000 clinical + 19,000 people = 38,000.
 assert.deepEqual(m.burn.spend,{Clinical:10000,Facilities:9000,People:19000});assert.equal(m.burn.net,38000);
 assert.deepEqual(Object.fromEntries(m.variance.rows.map((r:any)=>[r.cat,[r.budget,r.actual]])),{Clinical:[10000,10000],People:[18000,19000],Facilities:[10000,9000]});
 // Forecast months: Sep 68,000 spend (rent, CRO, tox, CEO 12,000, scientist 6,000); Oct adds the USD hire 8,000 × 1.2 / 1.25 = 7,680.
 assert.deepEqual(m.months.slice(0,2).map((x:any)=>[x.m,x.l,x.p,x.c]),[['2026-09',50000,18000,0],['2026-10',20000,25680,0]]);
 assert.deepEqual(m.milestones,[{name:'Phase 1 start',m:'2027-01',cash:843280,cushion:21,beyond:false}]);
 // Budget 2026 locked once, as of July: July clinical uses July's rate (12,500 / 1.10).
 const budget=rows.filter(r=>r.role==='budgets');assert.equal(budget.length,1);const t=JSON.parse(budget[0].data.totals);
 assert.equal(t.months['2026-07'].spend.Clinical,11363.64);assert.equal(t.months['2026-06'].spend.People,12000);assert.equal(t.months['2026-12'].spend.Research,30000);
 const o=await render(rows);const tx=text(o.html);
 assert.match(tx,/Cash lasts until Oct 2028, 21 months after Phase 1 start\./);
 assert.match(tx,/Runway 26 months/);assert.match(tx,/Cash-out month Nov 2028/);assert.match(tx,/Start raising by May 2027/);assert.match(tx,/With contingent cash 31 months/);
 assert.match(tx,/Trailing runway needs 3 closed months/);
 assert.match(tx,/Runway 26 months → 26 months ±0 months/);
 // Bridge: a new 5,000/month spend line from Sep 2026. Oct 2028 closing becomes 4,000 − 26 × 5,000 < 0; the last month at or above zero is Jun 2028 (146,720 − 22 × 5,000 = 36,720), so runway 26 → 22.
 rows.push({id:randomUUID(),version:0,role:'lines',data:{name:'Assay service',direction:'spend',category:'Research',driver:'monthly',amount:5000,currency:'EUR',start_month:'2026-09-01',status:'committed',archived:false}});
 const br=text((await render(rows)).html);assert.match(br,/Spend lines −4 months/);assert.match(br,/Closed months and bank balance ±0 months/);assert.match(br,/Runway 26 months → 22 months −4 months/);
 assert.match(tx,/Phase 1 start TX-1 Jan 2027 EUR 843,280 21 months/);
 assert.doesNotMatch(o.html,/rw-banner bad/);
});

test('USD line converts with the month rate; missing rate flags and excludes; contingent cash never changes base runway',async()=>{
 const {rows}=await reconciled();
 const cf=await render(rows,{section:'cash_flow'});const tx=text(cf.html);
 assert.match(tx,/Sep 2026 924k 0 10k 30k 18k 10k 68k 856k/);
 const drill=await render(rows,cf.state,{kind:'click',action:'drill:2026-09|Clinical'});const dt=text(drill.html);
 assert.match(dt,/US CRO committed monthly TX-1 USD 12,500 0\.8000 EUR 10,000/);
 const withC=await render(rows,{section:'cash_flow',cf:{source:'forecast',contingent:true,page:0}});assert.match(text(withC.html),/Feb 2027 \S+ 200k/);
 const over=await render(rows,{},{kind:'open'});assert.match(text(over.html),/Runway 26 months/);
 // A GBP line without any GBP rate is excluded, flagged, and never guessed.
 rows.push({id:randomUUID(),version:0,role:'lines',data:{name:'UK assay',direction:'spend',category:'Research',driver:'monthly',amount:5000,currency:'GBP',start_month:'2026-09-01',status:'committed',archived:false}});
 const flagged=text((await render(rows)).html);assert.match(flagged,/Missing exchange rate: GBP for Sep 2026/);assert.match(flagged,/Runway 26 months/);
});

test('what-if previews write nothing; shift moves only that program; saved scenarios go outdated; adopt writes only affected lines with captured versions',async()=>{
 const {rows,p1,cro,seed}=await reconciled();
 let r=await render(rows,{section:'scenarios'},{kind:'click',action:'preview-new'});
 r=await render(rows,r.state,{kind:'submit',action:'change-add',form:{preview_name:'Delay TX-1',kind:'shift_program',target_id:p1,months:'3'}});
 assert.equal(r.changes.length,0);assert.match(text(r.html),/Runway 26 months → 25 months Cash-out Oct 2028/);
 r=await render(rows,{...r.state,compare:['forecast','preview']});const cmp=text(r.html);assert.match(cmp,/Cash at Phase 1 start EUR 843,280 · Jan 2027 EUR 676,240 · Apr 2027/);
 const save=await render(rows,r.state,{kind:'click',action:'preview-save',form:{preview_name:'Delay TX-1'}});assert.equal(save.changes.length,1);approve(rows,save.changes);
 const sc=rows.find(x=>x.role==='scenarios')!;const step2=await render(rows,save.state,{kind:'click',action:'save-changes:'+sc.id});
 assert.equal(step2.changes.length,1);assert.equal(step2.changes[0].data.scenario_id,sc.id);approve(rows,step2.changes);
 const open=await render(rows,{section:'scenarios'},{kind:'click',action:'adopt:'+sc.id});const plan=open.state.adopt.changes;
 assert.deepEqual(plan.map((c:any)=>c.recordId).sort(),[cro,rows.find(x=>x.role==='milestones')!.id,sc.id].sort());
 assert.deepEqual(plan.find((c:any)=>c.recordId===cro).data,{start_month:'2026-10-01',end_month:'2027-09-01'});
 // A change after the adoption review opened is rejected, not overwritten.
 const croRow=rows.find(x=>x.id===cro)!;croRow.version++;
 const confirm=await render(rows,open.state,{kind:'click',action:'confirm-adopt'});assert.throws(()=>approve(rows,confirm.changes),/stale/);
 // Any forecast change marks the saved scenario outdated and blocks adoption.
 rows.find(x=>x.id===seed)!.version++;const out=await render(rows,{section:'scenarios'});assert.match(text(out.html),/Delay TX-1 saved Outdated/);
 const blocked=await render(rows,{section:'scenarios'},{kind:'click',action:'adopt:'+sc.id});assert.equal(blocked.state.adopt,undefined);assert.match(blocked.state.notice,/forecast changed/);
});

test('locked budgets and snapshots stay frozen; months close in order',async()=>{
 const {rows}=await reconciled();const before=JSON.stringify(rows.filter(r=>r.role==='budgets'||r.role==='closes').map(r=>r.data));
 const line=rows.find(r=>r.role==='lines'&&r.data.name==='Lab rent')!;const ed=await render(rows,{section:'plan'},{kind:'click',action:'edit:lines:'+line.id});
 const sub=await render(rows,ed.state,{kind:'submit',action:'save-record',form:{amount:'15000'}});approve(rows,sub.changes);
 assert.equal(JSON.stringify(rows.filter(r=>r.role==='budgets'||r.role==='closes').map(r=>r.data)),before);
 const again=await render(rows,{section:'plan',planTab:'budgets'},{kind:'submit',action:'lock-budget',form:{year:'2026'}});assert.match(again.state.notice,/already locked/);
 const skip=await render(rows,{section:'actuals'},{kind:'click',action:'open-close',value:'2026-10'});
 const bad=await render(rows,skip.state,{kind:'submit',action:'close-submit',form:{month:'2026-10',closing_balance:'1',currency:'EUR',actual_Other:'1'}});
 assert.equal(bad.changes.length,0);assert.match(bad.state.notice,/next month to close is Sep 2026/);assert.ok(bad.state.closeDraft);
});

test('restricted salaries: snapshots only, no salary values anywhere; read-only users cannot write',async()=>{
 const {rows}=await reconciled();
 for(const section of ['overview','people','cash_flow','scenarios','actuals','plan','settings']){
  const r=await render(rows,{section},{kind:'open'},{strip:['positions.annual_salary'],writable:false});
  assert.doesNotMatch(r.html,/120,000|60,000|96,000|12,000|7,680|25,680/,section);assert.doesNotMatch(r.html,/This screen could not be calculated/);
  assert.doesNotMatch(r.html,/<button[^>]*data-action="(add:|edit-settings|open-close|preview-new)[^"]*"(?![^>]*disabled)/,section);
  if(section==='overview')assert.match(text(r.html),/Approved snapshot · Aug 2026.*Live people cost: restricted/);
 }
 const people=await render(rows,{section:'people'},{kind:'open'},{strip:['positions.annual_salary']});assert.match(text(people.html),/People cost next month Restricted/);
});

test('incomplete, unavailable and over-budget reads never claim a complete runway',async()=>{
 const {rows}=dataset();
 const short=await render(rows,{},{kind:'open'},{read:(v:any,all:Row[])=>{const x=all.filter(r=>r.role===v.typeId);return {rows:x.slice(0,1),total:v.typeId==='lines'?x.length+5:x.length};}});
 assert.match(text(short.html),/No exact runway claim.*plan line table could not be read completely/);
 const denied=await render(rows,{},{kind:'open'},{read:(v:any,all:Row[])=>v.typeId==='rates'?{unavailable:true,rows:[],total:null}:{rows:all.filter(r=>r.role===v.typeId),total:all.filter(r=>r.role===v.typeId).length}});
 assert.match(text(denied.html),/You do not have access to the exchange rate table/);
 const unknown=await render(rows,{},{kind:'open'},{read:(v:any,all:Row[])=>({rows:all.filter(r=>r.role===v.typeId),total:v.typeId==='positions'?null:all.filter(r=>r.role===v.typeId).length})});
 assert.match(text(unknown.html),/position table could not be read completely/);
 const many=rows.concat(Array.from({length:801},(_,i)=>({id:'a'+i,version:0,role:'actuals',data:{month:'2026-07-01',category:'Other',direction:'spend',amount:1,currency:'EUR'}})));
 assert.match(text((await render(many)).html),/actual table could not be read completely \(800 of 803 rows\)/);
 const empty=await render([]);assert.match(text(empty.html),/Set up your first runway/);assert.doesNotMatch(empty.html,/Cash lasts/);
 const unbound=await render(rows,{},{kind:'open'},{config:{...cfg,tableMap:JSON.stringify({...map,rates:undefined})}});assert.match(text(unbound.html),/exchange rate table is not bound/);
});

test('drafts survive re-renders and failed proposals; edits carry the version captured when the editor opened',async()=>{
 const {rows}=dataset();const line=rows.find(r=>r.role==='lines')!;
 const start=await render(rows,{section:'plan'},{kind:'click',action:'edit:lines:'+line.id});
 assert.match(start.html,/<button type="submit" class="rw-btn rw-btn-primary" disabled>Prepare reviewed save/);
 const changed=await render(rows,start.state,{kind:'change',action:'draft:name',form:{name:'Changed rent',amount:'11000'}});
 assert.equal(changed.changes.length,0);assert.match(changed.html,/value="Changed rent"/);assert.match(changed.html,/data-ui-state="true" data-action="draft:name"/);
 assert.match(changed.html,/Runway effect before saving/);assert.match(changed.html,/<button type="submit" class="rw-btn rw-btn-primary">Prepare reviewed save/);
 const failed=await render(rows,changed.state,{kind:'submit',action:'save-record',form:{name:'Changed rent',amount:'-5'}});
 assert.equal(failed.changes.length,0);assert.match(failed.state.notice,/cannot be negative/);assert.equal(failed.state.editor.draft.name,'Changed rent');
 line.version=3;// concurrent update after the editor opened
 const sub=await render(rows,failed.state,{kind:'submit',action:'save-record',form:{name:'Changed rent',amount:'11000'}});
 assert.equal(sub.changes[0].expectedVersion,0);assert.deepEqual(sub.changes[0].data,{name:'Changed rent',amount:11000});
 for(const action of ['add:lines','add:positions','add:rates','edit-settings']){const r=await render(rows,{section:'plan'},{kind:'click',action});for(const el of r.html.match(/<(input|select|textarea)\b[^>]*>/g)!)assert.match(el,/data-ui-state="true"/,el);}
 const preview=await render(rows,{},{kind:'open'},{saved:false});assert.match(preview.html,/Preview: save the app/);
 const noWrite=await render(rows,{section:'plan'},{kind:'click',action:'add:lines'},{saved:false});assert.doesNotMatch(noWrite.html,/<button type="submit" class="rw-btn rw-btn-primary">/);
});

test('every screen renders the fictional demo within frame and state limits',async()=>{
 const demo=JSON.parse(await readFile('templates/source/cash-runway/demo_data.json','utf8')).records;
 for(const section of ['overview','cash_flow','plan','people','scenarios','actuals','settings']){const r=await render(demo,{section});assert.doesNotMatch(r.html,/could not be calculated|rw-banner bad/,section);assert.ok(r.html.length<200000);assert.ok(Buffer.byteLength(JSON.stringify(r.state))<100000);}
});

test('custom layout changes only configuration and rejects invalid scope',()=>{
 const original=source(),parsed=readCustomLayout(original)!;assert.ok(parsed);
 const profile=structuredClone(parsed.profile);profile.tabs.reverse();profile.cols.lines.reverse();profile.heading='Board runway';
 const updated=updateCustomLayout(original,profile),next=readCustomLayout(updated)!;
 assert.deepEqual(next.profile,profile);assert.equal(updated.slice(next.prefix.length),original.slice(parsed.prefix.length));
 assert.throws(()=>updateCustomLayout(original,{...profile,tabs:['other']}));
 assert.throws(()=>updateCustomLayout(original,{...profile,visible:Object.fromEntries(profile.tabs.map(id=>[id,false]))}));
 assert.throws(()=>updateCustomLayout(original,{...profile,cols:{...profile.cols,secret:['x']}}));
});

test('production design inspector accepts all seven screens and the scenario builder',async()=>{
 const {inspectAppDesign}=await import('../src/workspace/design-quality.js');
 const demo=JSON.parse(await readFile('templates/source/cash-runway/demo_data.json','utf8')).records;
 const frames:any[]=[];
 for(const section of ['overview','cash_flow','plan','people','scenarios','actuals','settings']){const r=await render(demo,{section});frames.push({name:section,html:r.html,css:r.output.css});}
 // The scenario builder is inline; drawers scroll inside their own body, which this inspector reads as overlap, so they are checked in the browser test.
 const builder=await render(demo,{section:'scenarios'},{kind:'click',action:'preview-new'});frames.push({name:'scenario-preview',html:builder.html,css:builder.output.css});
 const design=await inspectAppDesign(frames);assert.deepEqual(design.issues,[]);
});
