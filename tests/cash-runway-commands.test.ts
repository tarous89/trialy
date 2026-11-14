import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execute} from '../src/foundation/runtime.js';
import {appTemplates} from '../src/workspace/app-templates.js';
import {readAppCommands} from '../src/workspace/app-commands.js';
import {readCustomLayout,updateCustomLayout} from '../src/shared/custom-layout.js';
import {inspectAppDesign} from '../src/workspace/design-quality.js';

/* Runway 2.2.0 (RUNWAY.md §14): app commands, scenarios, customization and integrations, in production QuickJS. */
const entry=await appTemplates.read({templateId:'life.cash-runway',version:'2.2.0'});
const schema=JSON.parse(await readFile('templates/source/cash-runway/schema.example.json','utf8'));
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:Object.keys(schema[r].logicalFields)}]));
const bindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
const cfgOf=(over:any={})=>({...entry.defaults,tableMap:JSON.stringify(map),...over});
const source=(config:any=cfgOf(),b:any[]=bindings)=>`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(b)};\n${entry.source}`;
type Row={id:string,version:number,role:string,data:any};
async function render(rows:Row[],state:any={},event:any={kind:'open',action:''},opts:any={}){
 const changes:any[]=[],layouts:any[]=[];
 const output:any=await execute(source(opts.config,opts.bindings),{saved:opts.saved??true,writable:opts.writable??true,state,event},async(name,v:any)=>{
  if(name==='records.propose'){changes.push(...v);return {status:'proposed'};}
  if(name==='layout.propose'){layouts.push(v);return {status:'proposed'};}
  if(name==='integrations.list')return {integrations:opts.integrations??[]};
  assert.equal(name,'records.read');
  const all=rows.filter(r=>r.role===v.typeId).map(r=>({id:r.id,version:r.version,data:opts.strip?Object.fromEntries(Object.entries(r.data).filter(([k])=>!opts.strip.includes(r.role+'.'+k))):r.data}));
  return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};
 });return {output,changes,layouts,html:output.html as string,state:output.state};
}
const command=async(rows:Row[],id:string,input:any={},opts:any={})=>{const r=await render(rows,null,{kind:'command',action:id,value:JSON.stringify(input),form:{}},opts);return {...r.state.command,changes:r.changes,layouts:r.layouts};};
function approve(rows:Row[],changes:any[]){for(const c of changes){if(c.kind==='create_record')rows.push({id:randomUUID(),version:0,role:c.typeId,data:c.data});else{const r=rows.find(x=>x.id===c.recordId)!;if(r.version!==c.expectedVersion)throw Error('stale version');r.data={...r.data,...c.data};r.version++;}}}
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ');

function dataset(){
 const rows:Row[]=[];const add=(role:string,data:any)=>{const id=randomUUID();rows.push({id,version:0,role,data});return id;};
 add('runway.settings',{reporting_currency:'EUR',enabled_currencies:'EUR, USD',runway_target_months:18,trailing_window_months:3,min_cash_reserve:0,loaded_cost_pct:20,opening_balance:1000000,opening_date:'2026-06-30',categories:''});
 const p1=add('programs',{name:'TX-1',stage:'phase_1',status:'active',archived:false}),p2=add('programs',{name:'TX-2',stage:'preclinical',status:'active',archived:false});
 add('runway.fx_rates',{month:'2026-06-01',currency:'USD',rate_per_eur:1.10,source:'manual'});
 const L=(name:string,o:any)=>add('runway.plan_lines',{name,status:'committed',currency:'EUR',archived:false,...o});
 const rent=L('Lab rent',{direction:'spend',category:'Facilities',driver:'monthly',amount:10000,start_month:'2026-07-01'});
 const cro=L('CRO',{direction:'spend',category:'Clinical',program_id:p1,driver:'monthly',amount:20000,start_month:'2026-07-01'});
 const tox=L('Tox',{direction:'spend',category:'Research',program_id:p2,driver:'one_off',amount:50000,start_month:'2026-12-01'});
 const seed=L('Seed',{direction:'cash_in',category:'Other',driver:'one_off',amount:300000,start_month:'2027-01-01',cash_in_type:'equity'});
 const pos=add('runway.positions',{title:'Scientist',program_id:p1,start_month:'2026-07-01',annual_salary:60000,currency:'EUR',status:'current',archived:false});
 const ms=add('programs.plan_items',{name:'Phase 1 start',program_id:p1,item_type:'milestone',end_date:'2027-03-01',status:'planned',is_key:true,archived:false});
 return {rows,p1,p2,rent,cro,tox,seed,pos,ms};
}

test('the catalog declares every command as data; each one runs and answers',async()=>{
 const commands=readAppCommands(entry.source);
 assert.equal(commands.length,37);
 assert.deepEqual([...new Set(commands.map(c=>c.mode))].sort(),['layout','propose','read']);
 const d=dataset();
 for(const c of commands.filter(c=>c.mode==='read')){const r=await command(d.rows,c.id,c.id==='cashflow.drill'?{month:'2026-08',category:'Clinical'}:{});assert.equal(r.ok,true,c.id+': '+r.error);assert.equal(r.changes.length,0,c.id+' writes nothing');}
 assert.equal((await command(d.rows,'nope')).ok,false);
 // The installer schema creates no runway.milestones or runway.scenario_changes tables; integrations get Runway's own tables.
 assert.ok(!roles.includes('runway.milestones')&&!roles.includes('runway.scenario_changes'));
 for(const r of ['programs.plan_items','croselection.awards','contracts.obligations','fundraise.tranches'])assert.equal(schema[r].integration,true,r);
});

test('a command proposes exactly what the click path proposes',async()=>{
 const d=dataset(),fields={name:'New CRO',direction:'spend',category:'Clinical',program_id:d.p1,driver:'monthly',amount:1500,currency:'EUR',start_month:'2027-01',status:'committed'};
 const cmd=await command(d.rows,'line.save',{fields});assert.equal(cmd.ok,true,cmd.error);
 const open=await render(d.rows,{section:'plan'},{kind:'click',action:'add:lines'});
 // A person's submit posts every rendered field of the form as text.
 const rendered=Object.fromEntries([...open.html.matchAll(/name="([a-z_]+)" data-ui-state="true" data-action="draft:/g)].map(m=>[m[1],String(open.state.editor.draft[m[1]]??'')]));
 const click=await render(d.rows,open.state,{kind:'submit',action:'save-record',form:{...rendered,...Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,String(v)]))}});
 assert.deepEqual(cmd.changes,click.changes);
 assert.ok(cmd.result.runway_effect.before.months>=cmd.result.runway_effect.after.months,'the runway effect is shown before saving');
 // Edits carry the version captured when the form opened; unknown fields are refused, never ignored.
 const edit=await command(d.rows,'line.save',{id:d.cro,fields:{amount:25000}});
 assert.equal(edit.changes[0].kind,'update_record');assert.equal(edit.changes[0].expectedVersion,0);assert.equal(edit.changes[0].data.amount,25000);
 assert.match((await command(d.rows,'line.save',{id:d.cro,fields:{colour:'red'}})).error,/Unknown field/);
 // A failing step leaves no partial proposal.
 const bad=await command(d.rows,'actuals.save',{rows:[{month:'2026-07',category:'Clinical',direction:'spend',amount:100,currency:'EUR'},{month:'2026-07',category:'Clinical',direction:'spend',amount:-5,currency:'EUR'}]});
 assert.equal(bad.ok,false);assert.equal(bad.changes.length,0);
 const ok=await command(d.rows,'actuals.save',{rows:[{month:'2026-07',category:'Clinical',direction:'spend',amount:100,currency:'EUR'},{month:'2026-07',category:'Research',direction:'spend',amount:50,currency:'EUR'}]});
 assert.equal(ok.changes.length,2);
});

test('read commands return exactly the figures the screens show',async()=>{
 const d=dataset();
 const s=await command(d.rows,'summary.read');assert.equal(s.ok,true);
 // By hand: 1,000,000 at Jun 2026; 36,000/month from Jul (rent 10,000, CRO 20,000, scientist 60,000 ÷ 12 × 1.2); tox −50,000 in Dec 2026 → 734,000;
 // seed +300,000 in Jan 2027 → 998,000; then 27 more months to Apr 2029 (26,000 ≥ 0); May 2029 is negative. Runway 34 months.
 assert.deepEqual([s.result.as_of,s.result.runway.months,s.result.runway.lasts_until,s.result.runway.cash_out,s.result.runway.start_raise],['2026-06',34,'2029-04','2029-05','2027-11']);
 assert.deepEqual(s.result.milestones.map((m:any)=>[m.name,m.month,m.cash]),[['Phase 1 start','2027-03',926000]]);
 const ov=text((await render(d.rows,{section:'overview'})).html);
 assert.ok(ov.includes(s.result.sentence),'the runway sentence is the overview sentence');
 const cf=await command(d.rows,'cashflow.read',{from:'2026-07',to:'2026-08'});
 assert.deepEqual(cf.result.rows.map((r:any)=>r.month),['2026-07','2026-08']);
 assert.equal(cf.result.rows[0].opening,1000000);
 assert.equal(cf.result.rows[0].spend.Facilities,10000);assert.equal(cf.result.rows[0].people,6000);
 const csv=await command(d.rows,'export.csv');assert.match(csv.result.csv,/^Month,Opening,Cash in,/);
 const drill=await command(d.rows,'cashflow.drill',{month:'2026-08',category:'Clinical'});
 assert.deepEqual(drill.result.items.map((x:any)=>[x.name,x.converted]),[['CRO',20000]]);
});

test('scenarios: assistant-saved ones are current and adoptable; drafts preview and need saving; new change kinds adopt correctly',async()=>{
 const d=dataset();
 const changes=[{kind:'add_line',line:{name:'Bridge',direction:'cash_in',category:'Other',driver:'one_off',amount:500000,currency:'EUR',start_month:'2027-06',status:'committed',cash_in_type:'equity'}},
  {kind:'stop_line',target_id:d.rent,from_month:'2027-01'},{kind:'shift_line',target_id:d.tox,months:2},{kind:'scale_line',target_id:d.seed,pct:50},
  {kind:'scale_category',category:'Clinical',pct:-25,from_month:'2026-10'},{kind:'shift_position',target_id:d.pos,months:1},{kind:'change_salary',target_id:d.pos,pct:10}];
 const ev=await command(d.rows,'scenario.evaluate',{changes});assert.equal(ev.ok,true,ev.error);
 assert.equal(ev.result.changes.length,7);assert.ok(ev.result.difference_months>0,'the what-if extends runway');assert.equal(ev.changes.length,0,'evaluating stores nothing');
 // Saved through the command: one review, stamped with the current forecast.
 const saved=await command(d.rows,'scenario.save',{name:'Bridge plan',changes});assert.equal(saved.ok,true,saved.error);
 assert.equal(saved.changes.length,1);assert.equal(saved.changes[0].data.status,'saved');assert.ok(saved.changes[0].data.based_on_version);
 approve(d.rows,saved.changes);const sc=d.rows.find(r=>r.role==='runway.scenarios')!;
 const scen=text((await render(d.rows,{section:'scenarios'})).html);assert.ok(scen.includes('Bridge plan saved')&&!scen.includes('Bridge plan saved Outdated'),'not outdated after saving');
 const adopt=await command(d.rows,'scenario.adopt',{scenario_id:sc.id});assert.equal(adopt.ok,true,adopt.error);
 const kinds=adopt.changes.map((c:any)=>c.kind+':'+(c.recordId===d.rent?'rent':c.recordId===d.tox?'tox':c.recordId===d.seed?'seed':c.recordId===d.pos?'pos':c.recordId===d.cro?'cro':c.recordId===sc.id?'scenario':c.data?.name??'?'));
 assert.deepEqual(kinds.sort(),['create_record:Bridge','create_record:CRO','update_record:cro','update_record:pos','update_record:rent','update_record:scenario','update_record:seed','update_record:tox'].sort());
 const pos=adopt.changes.find((c:any)=>c.recordId===d.pos);assert.deepEqual(pos.data,{start_month:'2026-08-01',annual_salary:66000});
 const split=adopt.changes.find((c:any)=>c.kind==='create_record'&&c.data.name==='CRO');assert.equal(split.data.amount,15000);assert.equal(split.data.start_month,'2026-10-01');
 assert.equal(adopt.changes.find((c:any)=>c.recordId===d.cro).data.end_month,'2026-09-01');
 // A forecast change outdates it; adoption is then refused.
 d.rows.find(r=>r.id===d.rent)!.version++;
 assert.match((await command(d.rows,'scenario.adopt',{scenario_id:sc.id})).error,/forecast changed/);
 // A draft written directly (for example with prepare_change) previews in the app, cannot be adopted, and saving stamps it.
 d.rows.push({id:randomUUID(),version:0,role:'runway.scenarios',data:{name:'Assistant draft',status:'draft',changes_json:JSON.stringify([{kind:'shift_program',target_id:d.p1,months:3}])}});
 const draft=d.rows.at(-1)!;
 const list=text((await render(d.rows,{section:'scenarios'})).html);assert.match(list,/Assistant draft draft/);assert.ok(list.includes('Open draft'));
 assert.match((await command(d.rows,'scenario.adopt',{scenario_id:draft.id})).error,/Only saved scenarios/);
 const opened=await render(d.rows,{section:'scenarios'},{kind:'click',action:'preview-from:'+draft.id});
 assert.equal(opened.state.preview.fromDraft,draft.id);assert.match(text(opened.html),/Draft scenario: saving it stamps it/);
 const stamp=await render(d.rows,opened.state,{kind:'click',action:'preview-save',form:{preview_name:'Assistant draft'}});
 assert.equal(stamp.changes[0].kind,'update_record');assert.equal(stamp.changes[0].recordId,draft.id);assert.equal(stamp.changes[0].data.status,'saved');assert.ok(stamp.changes[0].data.based_on_version);
 // The command saves a draft the same way.
 const byCmd=await command(d.rows,'scenario.save',{name:'Assistant draft',draft_id:draft.id,changes:[{kind:'shift_program',target_id:d.p1,months:3}]});
 assert.deepEqual(byCmd.changes,stamp.changes);
});

test('month close, budget lock and commentary by command freeze the same records as the UI; months close in order',async()=>{
 const d=dataset();
 const cmd=await command(d.rows,'month.close',{month:'2026-07',closing_balance:960000,actuals:{Facilities:10000,Clinical:21000},commentary:'On plan'});
 assert.equal(cmd.ok,true,cmd.error);
 const open=await render(d.rows,{section:'actuals'},{kind:'click',action:'open-close',value:'2026-07'});
 const ui=await render(d.rows,open.state,{kind:'submit',action:'close-submit',form:{month:'2026-07',closing_balance:'960000',currency:'EUR',cash_in_amount:'',cash_in_type:'',commentary:'On plan',actual_Facilities:'10000',actual_Clinical:'21000'}});
 assert.deepEqual(cmd.changes,ui.changes);
 assert.match((await command(d.rows,'month.close',{month:'2026-09',closing_balance:1})).error,/Close months in order/);
 approve(d.rows,cmd.changes);
 const lock=await command(d.rows,'budget.lock',{year:'2026'});assert.equal(lock.ok,true,lock.error);assert.equal(lock.changes[0].typeId,'runway.budgets');
 const note=await command(d.rows,'commentary.save',{month:'2026-07',commentary:'Revised'});
 assert.deepEqual(Object.values(note.changes[0].data),['Revised']);
 assert.equal((await command(d.rows,'variance.read',{month:'2026-07'})).ok,true);
});

test('restricted salaries and read-only users: commands follow the same rules as the screens',async()=>{
 const d=dataset();
 const restricted={strip:['runway.positions.annual_salary']};
 const s=await command(d.rows,'summary.read',{},restricted);assert.equal(s.result.restricted,true);
 assert.match((await command(d.rows,'cashflow.read',{},restricted)).error,/restricted/);
 const all=JSON.stringify(await Promise.all(['summary.read','schema.describe','sources.read','scenario.compare','bridge.read'].map(id=>command(d.rows,id,{},restricted))));
 assert.ok(!all.includes('60000')&&!all.includes('6000'),'no salary or people cost appears in any result');
 assert.match((await command(d.rows,'scenario.evaluate',{changes:[{kind:'change_salary',target_id:d.pos,amount:1}]},restricted)).error,/restricted/);
 const ro=await command(d.rows,'line.save',{fields:{name:'X'}},{writable:false});assert.equal(ro.ok,false);assert.equal(ro.changes.length,0);
});

test('customization: categories, form layout, labels, defaults and extra fields without a code change',async()=>{
 const d=dataset();
 const add=await command(d.rows,'category.add',{name:'Regulatory'});assert.equal(add.ok,true,add.error);
 assert.match(add.changes[0].data.categories,/Regulatory/);assert.equal(add.result.schema_change.tables.length,2);
 approve(d.rows,add.changes);
 const hide=await command(d.rows,'category.hide',{name:'G&A'});assert.ok(!hide.changes[0].data.categories.includes('G&A'));
 assert.match((await command(d.rows,'category.hide',{name:'People'})).error,/cannot be hidden/);
 approve(d.rows,hide.changes);
 const editor=text((await render(d.rows,{section:'plan'},{kind:'click',action:'add:lines'})).html);assert.ok(editor.includes('Regulatory'));
 // Layout: hide an optional field, relabel, default; required fields cannot be hidden.
 const lay=await command(d.rows,'layout.save',{hide:['line_form:notes'],labels:{'line_form:name':'Line name'},defaults:{'line_form:category':'Clinical'},order:{line_form:['amount']}});
 assert.equal(lay.ok,true,lay.error);
 assert.match((await command(d.rows,'layout.save',{hide:['line_form:amount']})).error,/required/);
 // The proposed profile is what the native layout settings would save.
 const src=source();const layout=readCustomLayout(src)!;assert.ok(layout.schema.groups.line_form);
 const next=updateCustomLayout(src,lay.layouts[0]);
 const cfg=JSON.parse(/^const templateConfiguration=(.+);\n/.exec(next)![1]);
 const f=await render(d.rows,{section:'plan'},{kind:'click',action:'add:lines'},{config:cfgOf({layoutProfile:cfg.layoutProfile})});
 const t=text(f.html);assert.ok(t.includes('Line name *'));assert.ok(!/ Notes /.test(t.slice(t.indexOf('Add plan line'))));
 assert.equal(f.state.editor.draft.category,'Clinical');
 assert.ok(t.indexOf('Amount *')<t.indexOf('Line name *'),'amount is moved first');
 // Extra fields bound through the configuration appear in the form and in proposals; calculations ignore them.
 const extra={...map,'runway.actuals':{...map['runway.actuals'],extraFields:[{key:'cost_centre',label:'Cost centre',kind:'text'}],writableExtra:['cost_centre']}};
 const xb=bindings.map(b=>b.typeId==='runway.actuals'?{...b,fields:[...b.fields,'cost_centre']}:b);
 const xr=await command(d.rows,'record.save',{role:'actuals',fields:{month:'2026-07',category:'Clinical',direction:'spend',amount:5,currency:'EUR',cost_centre:'CC-10'}},{config:cfgOf({tableMap:JSON.stringify(extra)}),bindings:xb});
 assert.equal(xr.ok,true,xr.error);assert.equal(xr.changes[0].data.cost_centre,'CC-10');
 const desc=await command(d.rows,'schema.describe',{},{config:cfgOf({tableMap:JSON.stringify(extra)}),bindings:xb});
 assert.ok(desc.result.forms.actuals.fields.some((x:any)=>x.key==='cost_centre'&&x.additional));
});

test('integrations: own entries go to the plan once, changes are flagged, linked data is read only with Edit in App',async()=>{
 const d=dataset();const org=randomUUID();d.rows.push({id:org,version:0,role:'organizations',data:{name:'CRO Ltd',org_type:'cro'}});
 const award=randomUUID();d.rows.push({id:award,version:0,role:'croselection.awards',data:{organization_id:org,service_type:'clinical_study',program_id:d.p1,total:120000,currency:'EUR',start_date:'2027-01-01',duration_months:12,decided_on:'2026-11-01'}});
 const pay=randomUUID();d.rows.push({id:pay,version:0,role:'contracts.obligations',data:{title:'Milestone fee',kind:'payment',direction:'they_owe',due_date:'2027-04-01',amount:50000,currency:'USD',status:'open'}});
 d.rows.push({id:randomUUID(),version:0,role:'contracts.obligations',data:{title:'Annual report',kind:'report',direction:'we_owe',status:'open'}});
 const tr=randomUUID();d.rows.push({id:tr,version:0,role:'fundraise.tranches',data:{tranche_no:2,amount:2000000,currency:'EUR',condition:'IND',expected_on:'2027-09-01',status:'expected'}});
 const src=await command(d.rows,'sources.read');
 assert.deepEqual(src.result.roles.map((r:any)=>[r.role,r.items.length]),[['croselection.awards',1],['contracts.obligations',1],['fundraise.tranches',1]]);
 const a=await command(d.rows,'source.add_to_plan',{role:'awards',record_id:award});assert.equal(a.ok,true,a.error);
 assert.deepEqual([a.changes[0].data.driver,a.changes[0].data.amount,a.changes[0].data.end_month,a.changes[0].data.source_role,a.changes[0].data.source_version],['spread',120000,'2027-12-01','croselection.awards','0']);
 const ui=await render(d.rows,{section:'plan'},{kind:'click',action:'source-add:awards:'+award});assert.deepEqual(ui.changes,a.changes);
 assert.equal((await command(d.rows,'source.add_to_plan',{role:'obligations',record_id:pay})).changes[0].data.direction,'cash_in');
 assert.equal((await command(d.rows,'source.add_to_plan',{role:'tranches',record_id:tr})).changes[0].data.status,'contingent');
 approve(d.rows,a.changes);const line=d.rows.at(-1)!;
 assert.match((await command(d.rows,'source.add_to_plan',{role:'awards',record_id:award})).error,/already in the plan/);
 // The source changes: the line is flagged, nothing changes on its own, and Update line proposes the new values.
 const aw=d.rows.find(r=>r.id===award)!;aw.data={...aw.data,total:150000};aw.version=1;
 assert.match(text((await render(d.rows,{section:'plan'})).html),/Source changed/);
 const up=await command(d.rows,'source.update_line',{line_id:line.id});assert.deepEqual(up.changes[0].data,{amount:150000,source_version:'1'});
 // Linked: the provider's records are read only; only verified obligations are offered; Edit in App opens the writer.
 const linked={integrations:[{role:'contracts.obligations',source:'linked',provider:'Contracts',writer:{appName:'Contracts',canOpen:true},offer:null},{role:'programs.plan_items',source:'linked',provider:'Programs',writer:{appName:'Programs',canOpen:true},offer:null}]};
 assert.equal((await command(d.rows,'sources.read',{},linked)).result.roles[1].items.length,0,'unverified provider rows are not offered');
 d.rows.find(r=>r.id===pay)!.data.verified=true;
 const plan=text((await render(d.rows,{section:'plan'},{kind:'open',action:''},linked)).html);
 assert.match(plan,/From Contracts\. Read only here; make changes in Contracts\./);
 assert.match((await render(d.rows,{section:'plan'},{kind:'open',action:''},linked)).html,/data-trialy-open="contracts\.obligations [0-9a-f-]+">Edit in Contracts/);
 // Programs milestones once linked: read only in Runway, Edit in Programs.
 const ms=await render(d.rows,{section:'plan',planTab:'milestones'},{kind:'open',action:''},linked);
 assert.match(ms.html,/data-trialy-open="programs\.plan_items [0-9a-f-]+">Edit in Programs/);
 assert.match((await command(d.rows,'milestone.save',{id:d.ms,fields:{name:'Moved'}},linked)).error,/cannot change|no milestone form|cannot/i);
 // Not linked: the subtle hint offers to use the provider's data (the platform dialog does the rest).
 const offer=await render(d.rows,{section:'plan',planTab:'milestones'},{kind:'open',action:''},{integrations:[{role:'programs.plan_items',source:'own',provider:'Programs',offer:'connect'}]});
 assert.match(offer.html,/data-trialy-integration="connect programs\.plan_items">Use its data/);
 // Own milestone list: added and edited in Runway; new items are milestones.
 const m=await command(d.rows,'milestone.save',{fields:{name:'IND filing',end_date:'2027-08',program_id:d.p2}});assert.equal(m.ok,true,m.error);
 assert.deepEqual([m.changes[0].typeId,m.changes[0].data.item_type,m.changes[0].data.end_date],['programs.plan_items','milestone','2027-08-01']);
});

test('production design inspector accepts the 2.2.0 screens: sources, milestone list, new change kinds and a draft',async()=>{
 const d=dataset();
 d.rows.push({id:randomUUID(),version:0,role:'croselection.awards',data:{service_type:'cmc',total:90000,currency:'EUR',start_date:'2027-02-01',decided_on:'2026-11-01'}});
 d.rows.push({id:randomUUID(),version:0,role:'runway.scenarios',data:{name:'Draft',status:'draft',changes_json:JSON.stringify([{kind:'shift_program',target_id:d.p1,months:2}])}});
 const frames:any[]=[];
 for(const [name,state,event] of [['plan',{section:'plan'},{kind:'open',action:''}],['milestones',{section:'plan',planTab:'milestones'},{kind:'open',action:''}],['scenarios',{section:'scenarios'},{kind:'click',action:'preview-new'}],['settings',{section:'settings'},{kind:'open',action:''}]] as any){
  let r=await render(d.rows,state,event);if(name==='scenarios')r=await render(d.rows,r.state,{kind:'change',action:'change-draft',form:{kind:'add_line'}});
  frames.push({name,html:r.html,css:r.output.css});}
 const report=await inspectAppDesign(frames);
 assert.equal(report.status,'passed',JSON.stringify(report.issues.slice(0,5)));
});
