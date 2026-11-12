import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execute} from '../src/foundation/runtime.js';
import {appTemplates} from '../src/workspace/app-templates.js';
import {readCustomLayout} from '../src/shared/custom-layout.js';
import {fieldSchema} from '../src/shared/schema.js';

/* Programs 2.1.0: the catalog entry, prepared exactly as AppTemplates.operation prepends configuration, executed in production QuickJS. */
const entry=await appTemplates.read({templateId:'life.project-oversight',version:'2.1.0'});
const schema=JSON.parse(await readFile('templates/source/project-oversight/schema.example.json','utf8'));
const contract=JSON.parse(await readFile('templates/core-contract/v1.json','utf8'));
const demo=JSON.parse(await readFile('templates/source/project-oversight/demo_data.json','utf8')).records;
const roles=Object.keys(schema);
const fullMap=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:schema[r].readOnly?[]:Object.keys(schema[r].logicalFields)}]));
const fullBindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
const cfgFor=(map:any=fullMap,extra:any={})=>({...entry.defaults,tableMap:JSON.stringify(map),asOfOverride:'2026-11-11',...extra});
const source=(config:any=cfgFor(),b:any[]=fullBindings)=>`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(b)};\n${entry.source}`;
type Row={id:string,version:number,role:string,data:any};
const fresh=():Row[]=>structuredClone(demo);
async function render(rows:Row[],state:any={},event:any={kind:'open',action:''},opts:any={}){
 const changes:any[]=[];
 const output:any=await execute(source(opts.config,opts.bindings),{saved:opts.saved??true,writable:opts.writable??true,state,event},async(name,v:any)=>{
  if(name==='records.propose'){if(opts.failPropose)throw Error('denied');changes.push(...v);return {status:'proposed'};}
  assert.equal(name,'records.read');if(opts.read)return opts.read(v,rows);
  const all=rows.filter(r=>r.role===v.typeId).map(r=>({id:r.id,version:r.version,data:r.data}));
  return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};
 });return {output,changes,html:output.html as string,state:output.state};
}
function approve(rows:Row[],changes:any[]){for(const c of changes){if(c.kind==='create_record')rows.push({id:randomUUID(),version:0,role:c.typeId,data:c.data});else{const r=rows.find(x=>x.id===c.recordId)!;if(r.version!==c.expectedVersion)throw Error('stale version');r.data={...r.data,...c.data};r.version++;}}}
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ');
const item=(rows:Row[],name:string)=>rows.find(r=>r.role==='programs.plan_items'&&r.data.name===name)!;
const critLists=(html:string)=>[...html.matchAll(/<ol class="pg-crit">(.*?)<\/ol>/g)].map(m=>[...m[1].matchAll(/<li><span><strong>(.*?)<\/strong>/g)].map(x=>x[1]));

test('catalog entry, contract-shaped scalar schema and seven layout screens',async()=>{
 assert.equal(entry.version,'2.1.0');assert.equal(entry.name,'Programs');assert.equal(entry.engine,'frontend-js');
 assert.ok(entry.source!.length<180000);
 for(const def of Object.values(schema) as any[])for(const f of def.fields){assert.ok(fieldSchema.safeParse(f).success,JSON.stringify(f));assert.equal(f.multiple,false);assert.match(f.key,/^[a-z][a-z0-9_]{0,63}$/);}
 // Core roles use exactly the core data contract v1 fields (Programs owns the health fields on programs).
 for(const role of ['programs','people'])assert.deepEqual(schema[role].fields,contract.roles[role].fields.map(({owner,...f}:any)=>f),role);
 assert.equal(schema.people.optional,true);assert.equal(schema['runway.month_closes'].readOnly,undefined);assert.equal(schema['runway.month_closes'].integration,true);assert.equal(schema['runway.month_closes'].optional,true);
 const app=roles.filter(r=>!schema[r].optional&&r!=='programs');assert.deepEqual(app,['programs.plan_items','programs.slips','programs.decisions','programs.raid','programs.updates','programs.reports','programs.settings']);
 assert.equal(1+app.length,8,'eight tables at install');
 const runwayCloses=JSON.parse(await readFile('templates/source/cash-runway/schema.example.json','utf8'))['runway.month_closes'];
 for(const f of schema['runway.month_closes'].fields)assert.deepEqual(f,runwayCloses.fields.find((x:any)=>x.key===f.key),'Runway field '+f.key);
 const prepared=`const templateConfiguration=${JSON.stringify({...entry.defaults,heading:'Programs'})};\nconst templateBindings=[];\n${entry.source}`;
 const layout=readCustomLayout(prepared)!;assert.deepEqual(layout.schema.screens.map(s=>s.id),['overview','timeline','plan','decisions','raid','updates','settings']);
 assert.equal(entry.documentation!.tasks.mode,'optional');
 for(const k of ['quickStart','dataContract','interactionContract','lifecycle','limitations','examples','tasks'])assert.ok((entry.documentation as any)[k],k);
});

test('critical path matches the hand-computed fictional plan and crosses functions',async()=>{
 const rows=fresh();assert.equal(rows.filter(r=>r.role==='programs.plan_items').length,25);
 const r=await render(rows,{section:'timeline'});
 const [px101,px202]=critLists(r.html);
 // By hand: PX-101's latest key milestone is Phase 1 topline (31 Mar 2028); its predecessor chain runs CMC → Regulatory → Clinical.
 assert.deepEqual(px101,['API process development','GMP drug substance batch','Drug product release','IND package compiled','IND submission','FDA 30-day review','First participant dosed','Phase 1 SAD/MAD','Phase 1 topline data']);
 // PX-202's latest key milestone is First-in-human (15 Mar 2028): Other → Nonclinical → Regulatory → Clinical. GMP manufacturing is not on it.
 assert.deepEqual(px202,['Candidate selection','Pilot tox','GLP tox','CTA submission','CTA approval','First-in-human dose']);
 // "What drives this date": the driving chain of IND submission.
 const sel=await render(rows,r.state,{kind:'click',action:'select:'+item(rows,'IND submission').id});
 assert.match(text(sel.html),/What drives this date: IND submission/);
 assert.deepEqual(critLists(sel.html)[0],['API process development','GMP drug substance batch','Drug product release','IND package compiled','IND submission']);
 assert.equal((sel.html.match(/class="pg-bar[^"]*drive/g)||[]).length+(sel.html.match(/class="pg-diamond[^"]*drive/g)||[]).length,5);
});

test('a predecessor that would create a cycle is rejected at save, and a stored cycle disables the critical path',async()=>{
 const rows=fresh(),cs=item(rows,'Candidate selection'),fih=item(rows,'First-in-human dose');
 const open=await render(rows,{section:'plan'},{kind:'click',action:'edit:items:'+cs.id});
 const r=await render(rows,open.state,{kind:'submit',action:'save-record',form:{predecessor_id:fih.id}});
 assert.equal(r.changes.length,0);assert.match(r.state.notice,/cycle/);assert.ok(r.state.editor,'the draft stays open');assert.equal(r.state.editor.draft.predecessor_id,fih.id);
 const self=await render(rows,open.state,{kind:'submit',action:'save-record',form:{predecessor_id:cs.id}});assert.equal(self.changes.length,0);
 // A cycle written outside the app (e.g. directly in Database) is never shown as a critical path.
 cs.data.predecessor_id=fih.id;
 const t=await render(rows,{section:'timeline'});assert.match(text(t.html),/PX-202: critical path disabled, the predecessors form a cycle/);assert.equal(critLists(t.html).length,1);
 assert.match(text((await render(rows,{section:'overview'})).html),/Predecessor cycle in PX-202/);
});

test('moving a baselined committed milestone later needs a reason and writes exactly one slip; successors move only when accepted',async()=>{
 const rows=fresh(),ind=item(rows,'IND submission'),fda=item(rows,'FDA 30-day review');
 const open=await render(rows,{section:'plan'},{kind:'click',action:'edit:items:'+ind.id});
 const draft=await render(rows,open.state,{kind:'change',action:'draft:end_date',value:'2027-04-21',form:{end_date:'2027-04-21'}});
 assert.match(text(draft.html),/Committed date moves later by 21 days/);
 // Downstream preview: FDA review starts 22 Apr (+21 d, 30 Apr → 21 May). First participant dosed (31 May) is later than 22 May, so it does not move.
 assert.match(text(draft.html),/FDA 30-day review .*30 Apr 2027 → 21 May 2027 \(\+21 d\)/);assert.match(text(draft.html),/Also move these 1 successor/);
 const noReason=await render(rows,draft.state,{kind:'submit',action:'save-record',form:{end_date:'2027-04-21'}});
 assert.equal(noReason.changes.length,0);assert.match(noReason.state.notice,/slip reason/);assert.equal(noReason.state.editor.draft.end_date,'2027-04-21');
 const saved=await render(rows,noReason.state,{kind:'submit',action:'save-record',form:{end_date:'2027-04-21',slip_reason:'regulatory',slip_detail:'Agency asked for more CMC data'}});
 assert.equal(saved.changes.length,2,saved.state.notice);
 assert.deepEqual(saved.changes[0],{kind:'update_record',recordId:ind.id,expectedVersion:ind.version,data:{end_date:'2027-04-21'}});
 assert.deepEqual(saved.changes[1],{kind:'create_record',typeId:'programs.slips',data:{plan_item_id:ind.id,changed_on:'2026-11-11',old_end:'2027-03-31',new_end:'2027-04-21',days:21,reason:'regulatory',detail:'Agency asked for more CMC data'}});
 assert.ok(!saved.changes.some(c=>c.recordId===fda.id),'not accepted: successors unchanged');
 // Accepting the downstream preview moves FDA review in the same review, with its own slip (it is baselined and planned).
 const accepted=await render(rows,noReason.state,{kind:'submit',action:'save-record',form:{end_date:'2027-04-21',slip_reason:'regulatory',accept_downstream:'true'}});
 assert.equal(accepted.changes.length,4);const mv=accepted.changes.find(c=>c.recordId===fda.id);assert.deepEqual(mv,{kind:'update_record',recordId:fda.id,expectedVersion:fda.version,data:{start_date:'2027-04-22',end_date:'2027-05-21'}});
 assert.equal(accepted.changes.filter(c=>c.typeId==='programs.slips').length,2);
 approve(rows,saved.changes);const after=await render(rows,{section:'plan',detail:{role:'items',id:ind.id}});
 assert.match(text(after.html),/Slip story Original \(baseline\) 15 Mar 2027 Current 21 Apr 2027 \(\+37 days\)/);assert.match(text(after.html),/Regulatory Agency asked for more CMC data/);
 // No slip for an earlier date, for an item without a baseline, or for a done item.
 const earlier=await render(rows,(await render(rows,{},{kind:'click',action:'edit:items:'+fda.id})).state,{kind:'submit',action:'save-record',form:{end_date:'2027-04-25'}});assert.equal(earlier.changes.length,1);
 const cta=item(rows,'CTA submission');const nb=await render(rows,(await render(rows,{},{kind:'click',action:'edit:items:'+cta.id})).state,{kind:'submit',action:'save-record',form:{end_date:'2028-01-15'}});
 assert.equal(nb.changes.filter(c=>c.typeId==='programs.slips').length,0);
});

test('versions are captured when the editor opens and a failed proposal keeps the draft',async()=>{
 const rows=fresh(),ind=item(rows,'IND submission');
 const open=await render(rows,{},{kind:'click',action:'edit:items:'+ind.id});ind.version+=3;
 const r=await render(rows,open.state,{kind:'submit',action:'save-record',form:{notes:'Concurrent'}});assert.equal(r.changes[0].expectedVersion,ind.version-3);
 const failed=await render(rows,open.state,{kind:'submit',action:'save-record',form:{notes:'Kept draft'}},{failPropose:true});
 assert.equal(failed.changes.length,0);assert.equal(failed.state.editor.draft.notes,'Kept draft');assert.match(failed.state.notice,/not completed/);
});

test('health is a dated human judgement: never set by the app, stale after 45 days',async()=>{
 const rows=fresh();const o=await render(rows,{section:'overview'});
 assert.match(text(o.html),/PX-202 .*20 Aug 2026 Older than 45 days/);assert.match(text(o.html),/Health older than 45 days \(20 Aug 2026\): PX-202/);const cards=o.html.split('<article class="pg-pcard">');assert.doesNotMatch(cards[1],/Older than/);assert.match(cards[2],/Older than 45 days/);
 // No action other than the program editor proposes a health value.
 for(const s of ['overview','timeline','plan','decisions','raid','updates','settings'])assert.equal((await render(rows,{section:s})).changes.length,0);
 const p1=rows.find(r=>r.role==='programs'&&r.data.name==='PX-101')!;
 const ed=await render(rows,{section:'settings'},{kind:'click',action:'edit:programs:'+p1.id});
 const bad=await render(rows,ed.state,{kind:'submit',action:'save-record',form:{health:'red',health_rationale:'',health_date:''}});assert.equal(bad.changes.length,0);assert.match(bad.state.notice,/rationale and the assessment date/);
 const ok=await render(rows,ed.state,{kind:'submit',action:'save-record',form:{health:'red',health_rationale:'IND slips past Q1',health_date:'2026-11-10'}});assert.equal(ok.changes.length,1);assert.equal(ok.changes[0].data.health,'red');
 // A monthly update records its own health; it never writes the program's health.
 const up=await render(rows,{section:'updates'},{kind:'click',action:'add:updates'});
 const u=await render(rows,up.state,{kind:'submit',action:'save-record',form:{program_id:p1.id,month:'2026-11',health:'red',summary:'x'}});
 assert.equal(u.changes.length,1);assert.equal(u.changes[0].typeId,'programs.updates');assert.equal(u.changes[0].data.month,'2026-11-01');
 const dup=await render(rows,up.state,{kind:'submit',action:'save-record',form:{program_id:p1.id,month:'2026-10',health:'amber'}});assert.equal(dup.changes.length,0);assert.match(dup.state.notice,/already has an update/);
});

test('a saved leadership report is frozen and never changes after later edits',async()=>{
 const rows=fresh();const r=await render(rows,{section:'updates',upTab:'report'},{kind:'change',action:'report-month',value:'2026-10'});
 const saved=await render(rows,r.state,{kind:'submit',action:'report-save',form:{month:'2026-10',title:'October report',narrative:'IND on track.'}});
 assert.equal(saved.changes.length,1,saved.state.notice);const c=JSON.parse(saved.changes[0].data.contents);assert.equal(c.month,'2026-10');assert.equal(c.programs.length,2);assert.equal(saved.changes[0].data.saved_on,'2026-11-11');
 assert.deepEqual(c.slips.map((s:any)=>s.item),['GMP drug substance batch']);
 approve(rows,saved.changes);const report=rows.find(x=>x.role==='programs.reports')!;
 const before=text((await render(rows,{section:'updates',upTab:'archive',reportView:report.id})).html);
 // Later edits: an update is rewritten, an item renamed, a new slip recorded.
 rows.find(x=>x.role==='programs.updates')!.data.summary='Rewritten later';item(rows,'GMP drug substance batch').data.name='Renamed batch';
 rows.push({id:randomUUID(),version:0,role:'programs.slips',data:{plan_item_id:item(rows,'IND submission').id,changed_on:'2026-10-20',old_end:'2027-03-31',new_end:'2027-04-30',days:30,reason:'other'}});
 const after=text((await render(rows,{section:'updates',upTab:'archive',reportView:report.id})).html);
 assert.equal(after,before);assert.match(after,/Frozen report/);assert.match(after,/GMP drug substance batch/);assert.doesNotMatch(after,/Rewritten later|Renamed batch/);
});

test('Runway link: cash markers when readable, a short note and no error when missing or unreadable',async()=>{
 const rows=fresh();const tl=text((await render(rows,{section:'timeline'})).html);
 // Snapshot Oct 2026: closing cash 24.0M − 0.6M per month from Nov 2026; cash-out Feb 2030 (first month below zero).
 // IND submission, Mar 2027 = month 5 → 21.0M; cushion = months after it until cash-out = 35 (green).
 assert.match(tl,/IND submission .*EUR 21\.0M · 35 months cushion/);assert.match(tl,/Phase 1 topline data .*EUR 13\.8M · 23 months cushion/);
 assert.doesNotMatch(tl,/Drug product release Priya Shah · 15 Feb 2027 · \+14 days EUR/,'non-key milestones have no marker');
 const noRunway=Object.fromEntries(Object.entries(fullMap).filter(([k])=>k!=='runway.month_closes'));
 const missing=await render(rows,{section:'timeline'},undefined,{config:cfgFor(noRunway)});
 assert.match(text(missing.html),/Cash markers are hidden: this app has no cash forecast table/);assert.doesNotMatch(missing.html,/cushion<\/span>|pg-banner bad/);
 const denied=await render(rows,{section:'timeline'},undefined,{read:(v:any,all:Row[])=>v.typeId==='runway.month_closes'?{unavailable:true}:{rows:all.filter(r=>r.role===v.typeId).slice(v.offset,v.offset+v.limit),total:all.filter(r=>r.role===v.typeId).length}});
 assert.match(text(denied.html),/Runway snapshots are not readable for you/);assert.doesNotMatch(denied.html,/cushion<\/span>|pg-banner bad/);
 assert.match(text(denied.html),/IND submission/,'the timeline still works');
});

test('manual cash forecast: entered months drive cash at key milestones and the hint offers Runway',async()=>{
 // Replace Runway's snapshot with monthly closing cash entered by hand: 24.0M in Nov 2026, −0.6M a month to 0.6M in Feb 2030.
 const rows=fresh().filter(r=>r.role!=='runway.month_closes');
 for(let i=0;i<40;i++){const d=new Date(Date.UTC(2026,10+i,1));rows.push({id:randomUUID(),version:0,role:'runway.month_closes',data:{month:d.toISOString().slice(0,10),closing_balance:24000000-600000*i,currency:'EUR'}});}
 const tl=text((await render(rows,{section:'timeline'})).html);
 // Mar 2027 = 24.0M − 4 × 0.6M = 21.6M; no negative month is entered, so the cushion is at least the 35 months to Feb 2030.
 assert.match(tl,/IND submission .*EUR 21\.6M · ≥ 35 months cushion/);
 const settings=(await render(rows,{section:'settings'})).html;
 assert.match(settings,/<h2>Cash forecast<\/h2>/);assert.match(text(settings),/Feb 2030 EUR 600k/);assert.match(settings,/data-action="add:closes"/);
});

test('partial reads disable the critical path and totals and say so',async()=>{
 const rows=fresh();
 const partial=await render(rows,{section:'timeline'},undefined,{read:(v:any,all:Row[])=>{const r=all.filter(x=>x.role===v.typeId);return v.typeId==='programs.plan_items'?{rows:r.slice(0,10),total:null}:{rows:r.slice(v.offset,v.offset+v.limit),total:r.length};}});
 assert.match(text(partial.html),/Partial data: critical path and totals are disabled/);assert.match(text(partial.html),/critical path disabled because plan items were not read completely/);assert.equal(critLists(partial.html).length,0);
 const o=await render(rows,{section:'overview'},undefined,{read:(v:any,all:Row[])=>v.typeId==='programs.raid'?{unavailable:true}:{rows:all.filter(x=>x.role===v.typeId).slice(v.offset,v.offset+v.limit),total:all.filter(x=>x.role===v.typeId).length}});
 assert.match(text(o.html),/You cannot read the RAID entry table/);assert.match(text(o.html),/Overdue items —/);
 // More rows than the read budget (800 per table) are never complete.
 const many=fresh();const base=item(many,'Pilot tox');for(let i=0;i<820;i++)many.push({...structuredClone(base),id:randomUUID()});
 assert.match(text((await render(many,{section:'timeline'})).html),/Partial data/);
});

test('gate outcome records follow-up milestones and cancellations in the same review; readiness is shown',async()=>{
 const rows=fresh(),gate=rows.find(r=>r.role==='programs.decisions'&&r.data.name==='IND go / no-go')!;
 const d=await render(rows,{section:'decisions'});assert.match(text(d.html),/IND go \/ no-go .*Readiness: 1 of 4 criteria met, 1 not met, 2 open/);
 const open=await render(rows,d.state,{kind:'click',action:'outcome:'+gate.id});const add=await render(rows,open.state,{kind:'click',action:'gate-follow-add'});
 const site=item(rows,'Final tox report');
 const noWhy=await render(rows,add.state,{kind:'submit',action:'gate-submit',form:{outcome:'conditional',decided_on:'2027-03-22',rationale:'',follow_name_0:'Extra tox species',follow_date_0:'2027-06-30',follow_fn_0:'nonclinical'}});
 assert.equal(noWhy.changes.length,0);assert.match(noWhy.state.notice,/rationale/);assert.equal(noWhy.state.gate.follow[0].name,'Extra tox species');
 const r=await render(rows,noWhy.state,{kind:'submit',action:'gate-submit',form:{outcome:'conditional',decided_on:'2027-03-22',approver:'Board',rationale:'Go if FDA agrees the species',follow_name_0:'Extra tox species',follow_date_0:'2027-06-30',follow_fn_0:'nonclinical',['cancel_'+site.id]:'true'}});
 assert.equal(r.changes.length,3,r.state.notice);
 assert.deepEqual(r.changes[0].data,{outcome:'conditional',decided_on:'2027-03-22',approver:'Board',rationale:'Go if FDA agrees the species'});
 assert.equal(r.changes[1].kind,'create_record');assert.equal(r.changes[1].data.program_id,gate.data.program_id);assert.equal(r.changes[1].data.item_type,'milestone');
 assert.deepEqual(r.changes[2],{kind:'update_record',recordId:site.id,expectedVersion:site.version,data:{status:'cancelled'}});
});

test('RAID: heat matrix filters, promotion keeps history; read-only users cannot propose',async()=>{
 const rows=fresh();const r=await render(rows,{section:'raid'},{kind:'click',action:'matrix:medium:high'});
 assert.match(r.html,/aria-pressed="true" aria-label="1 entries with medium likelihood and high impact"/);assert.match(text(r.html),/GMP batch yield below target/);assert.doesNotMatch(text(r.html),/Patent opposition window/);
 const risk=rows.find(x=>x.role==='programs.raid'&&x.data.name==='GMP batch yield below target')!;
 const p=await render(rows,{section:'raid'},{kind:'click',action:'promote:'+risk.id+':issue'});const c=await render(rows,p.state,{kind:'click',action:'confirm-promote'});
 assert.equal(c.changes.length,2);assert.equal(c.changes[0].data.raid_type,'issue');assert.equal(c.changes[0].data.linked_item_id,risk.id);assert.deepEqual(c.changes[1],{kind:'update_record',recordId:risk.id,expectedVersion:risk.version,data:{status:'closed'}});
 // Board viewer with a write restriction: every write control is disabled; Present mode and reports still open.
 const ro=await render(rows,{section:'plan'},undefined,{writable:false});assert.match(ro.html,/data-action="add:items" disabled/);
 const tryWrite=await render(rows,(await render(rows,{},{kind:'click',action:'edit:items:'+item(rows,'IND submission').id})).state,{kind:'submit',action:'save-record',form:{notes:'x'}},{writable:false});assert.equal(tryWrite.changes.length,0);
 assert.match(text((await render(rows,{section:'timeline'},{kind:'click',action:'present-on'},{writable:false})).html),/Present mode|Key milestones: original and current dates/);
});

test('every input carries data-ui-state and the as-of date comes from the runtime when not pinned',async()=>{
 const rows=fresh();const htmls:string[]=[];
 for(const s of ['overview','timeline','plan','decisions','raid','updates','settings'])htmls.push((await render(rows,{section:s,filtersOpen:true})).html);
 htmls.push((await render(rows,{},{kind:'click',action:'edit:items:'+item(rows,'IND submission').id})).html,(await render(rows,{section:'decisions'},{kind:'click',action:'outcome:'+rows.find(r=>r.role==='programs.decisions')!.id})).html,(await render(rows,{section:'updates',upTab:'report'})).html);
 for(const h of htmls)for(const tag of h.match(/<(input|select|textarea)\b[^>]*>/g)||[])assert.match(tag,/data-ui-state="true"/,tag);
 const today=new Date().toISOString().slice(0,10);const live=await render(rows,{section:'overview'},undefined,{config:cfgFor(fullMap,{asOfOverride:''})});
 assert.match(text(live.html),/As of \d+ \w{3} \d{4} \(today\)/);assert.doesNotMatch(live.html,/data-action="as-of"/);void today;
 // Layout profile from saved configuration wins over stale state.
 const layout=await render(rows,{layout:{tabs:['settings']}},undefined,{config:cfgFor(fullMap,{layoutProfile:JSON.stringify({heading:'Pipeline',tabs:['raid','overview','timeline','plan','decisions','updates','settings'],cols:{},visible:{updates:false}})})});
 assert.match(layout.html,/<h1 class="pg-title">Pipeline<\/h1>/);assert.ok(layout.html.indexOf('nav:raid')<layout.html.indexOf('nav:overview'));assert.doesNotMatch(/<nav[^]*?<\/nav>/.exec(layout.html)![0],/nav:updates/);
});

test('production design inspector accepts all seven screens',async()=>{
 const {inspectAppDesign}=await import('../src/workspace/design-quality.js');
 const frames:any[]=[];for(const s of ['overview','timeline','plan','decisions','raid','updates','settings']){const r=await render(fresh(),{section:s});frames.push({name:s,html:r.html,css:r.output.css});}
 const design=await inspectAppDesign(frames);assert.deepEqual(design.issues,[]);
});
