import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execute} from '../src/foundation/runtime.js';
import {appTemplates} from '../src/workspace/app-templates.js';
import {readAppCommands} from '../src/workspace/app-commands.js';
import {readCustomLayout} from '../src/shared/custom-layout.js';
import {effectiveSource,isV2Source} from '../src/workspace/browser-runtime.js';

/* Runway 3.0.0 (7.3, G2–G8, G11, P3–P5): the v2 rebuild on the kit, run in production QuickJS with stub tools. */
const entry=await appTemplates.read({templateId:'life.cash-runway',version:'3.0.0'});
const previous=await appTemplates.read({templateId:'life.cash-runway',version:'2.2.1'});
const schema=JSON.parse(await readFile('templates/source/cash-runway/schema.example.json','utf8'));
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:Object.keys(schema[r].logicalFields)}]));
const bindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
const cfgOf=(t:any,over:any={})=>({...t.defaults,tableMap:JSON.stringify(map),...over});
const wrap=(t:any,config:any=cfgOf(t))=>`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(bindings)};\n${t.source}`;
type Row={id:string,version:number,role:string,data:any};
const pendingRead=(v:any)=>({pending:true,rows:[],total:null,limit:v.limit,offset:v.offset});
function readRows(rows:Row[],v:any){
 let all=rows.filter(r=>r.role===v.typeId&&Object.entries(v.filters||{}).every(([k,x])=>String(r.data[k])===String(x)));
 if(v.q)all=all.filter(r=>JSON.stringify(r.data).toLowerCase().includes(String(v.q).toLowerCase()));
 if(v.sort){const k=v.sort.field,d=v.sort.direction==='desc'?-1:1;all=all.slice().sort((a,b)=>String(a.data[k]??'').localeCompare(String(b.data[k]??''))*d);}
 return {rows:all.slice(v.offset??0,(v.offset??0)+(v.limit??25)).map(r=>({id:r.id,version:r.version,data:r.data})),total:all.length,limit:v.limit,offset:v.offset};}
async function render(rows:Row[],state:any={},event:any={kind:'open',action:''},opts:any={}){
 const saves:any[]=[],calls:string[]=[],layouts:any[]=[];
 const output:any=await execute(effectiveSource(wrap(opts.entry??entry,opts.config)),{saved:opts.saved??true,writable:opts.writable??true,appRole:opts.role??'owner',context:opts.context??null,viewport:{width:opts.width??'wide',coarse:false},state,event},async(name,v:any)=>{
  calls.push(name);
  if(name==='records.save'){saves.push(v.changes);return {status:'saving',count:v.changes.length};}
  if(name==='records.propose')throw Error('records.propose is not part of the v2 contract');
  if(name==='integrations.list')return {integrations:[]};
  if(name==='undo.list')return {actions:opts.undo??[]};
  if(name==='undo.run'){return {status:'undone'};}
  if(name==='layout.propose'){layouts.push(v);return {status:'proposed'};}
  if(name==='records.readMany')return opts.pending?{pending:true,results:v.reads.map(pendingRead)}:{results:v.reads.map((x:any)=>readRows(rows,x))};
  if(name==='records.read')return opts.pending?pendingRead(v):readRows(rows,v);
  if(name==='records.summarize'){if(opts.pending)return {pending:true,totals:null,groups:[]};const all=rows.filter(r=>r.role===v.typeId),g:Record<string,number>={};for(const r of all){const k=String(r.data[v.groupBy]??'');g[k]=(g[k]||0)+1;}return {totals:{count:all.length},groups:Object.entries(g).map(([label,count])=>({label,count}))};}
  throw Error('Unexpected capability '+name);
 });
 return {output,saves,calls,layouts,html:output.html as string,state:output.state,notice:output.notice};}
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ');
function apply(rows:Row[],changes:any[]){for(const c of changes){if(c.kind==='create_record')rows.push({id:randomUUID(),version:0,role:c.typeId,data:c.data});else{const i=rows.findIndex(x=>x.id===c.recordId);const r=rows[i];if(!r||r.version!==c.expectedVersion)throw Error('stale version');if(c.kind==='archive_record')rows.splice(i,1);else{r.data={...r.data,...c.data};r.version++;}}}}
const command=async(t:any,rows:Row[],id:string,input:any={},opts:any={})=>{const r=await render(rows,null,{kind:'command',action:id,value:JSON.stringify(input),form:{}},{...opts,entry:t});return {...r.state.command,saves:r.saves};};

function dataset(){
 const rows:Row[]=[];const add=(role:string,data:any)=>{const id=randomUUID();rows.push({id,version:0,role,data});return id;};
 const settings=add('runway.settings',{reporting_currency:'EUR',enabled_currencies:'EUR, USD',runway_target_months:18,trailing_window_months:3,min_cash_reserve:0,loaded_cost_pct:20,opening_balance:1000000,opening_date:'2026-06-30',categories:''});
 const p1=add('programs',{name:'TX-1',stage:'phase_1',status:'active',archived:false}),p2=add('programs',{name:'TX-2',stage:'preclinical',status:'active',archived:false});
 add('organizations',{name:'Acme CRO',org_type:'cro',archived:false});
 add('runway.fx_rates',{month:'2026-06-01',currency:'USD',rate_per_eur:1.10,source:'manual'});
 const L=(name:string,o:any)=>add('runway.plan_lines',{name,status:'committed',currency:'EUR',archived:false,...o});
 const rent=L('Lab rent',{direction:'spend',category:'Facilities',driver:'monthly',amount:10000,start_month:'2026-07-01'});
 const cro=L('CRO',{direction:'spend',category:'Clinical',program_id:p1,driver:'monthly',amount:20000,start_month:'2026-07-01'});
 L('Tox',{direction:'spend',category:'Research',program_id:p2,driver:'one_off',amount:50000,start_month:'2026-12-01'});
 const seed=L('Seed',{direction:'cash_in',category:'Other',driver:'one_off',amount:300000,start_month:'2027-01-01',cash_in_type:'equity'});
 const pos=add('runway.positions',{title:'Scientist',program_id:p1,start_month:'2026-07-01',annual_salary:60000,currency:'EUR',status:'current',archived:false});
 const hire=add('runway.positions',{title:'Clinical lead',program_id:p1,start_month:'2026-10-01',annual_salary:96000,currency:'EUR',status:'planned',archived:false});
 add('programs.plan_items',{name:'Phase 1 start',program_id:p1,item_type:'milestone',end_date:'2027-03-01',status:'planned',is_key:true,archived:false});
 return {rows,settings,p1,p2,rent,cro,seed,pos,hire};}
const SCREENS:[string,any][]=[['overview',{}],['cash_flow',{}],['plan',{planTab:'lines'}],['plan',{planTab:'milestones'}],['plan',{planTab:'budgets'}],['people',{}],['people',{view:'board'}],['scenarios',{}],['actuals',{}],['rates',{}],['programs',{}],['organizations',{}],['settings',{}]];

test('3.0.0 is a v2 major version that keeps the installer schema, commands, automations and options of 2.2.1',async()=>{
 assert.equal(entry.version,'3.0.0');assert.ok(isV2Source(wrap(entry)),'marker within the first lines after the generated configuration');
 assert.match(entry.source!,/^'use trialagents v2';\n/);
 assert.deepEqual((entry as any).upgradeFrom,['2.2.0','2.2.1']);
 assert.doesNotMatch(entry.source!,/records\.propose\(|tools\.call\('records\.propose'/);
 assert.doesNotMatch(entry.source!,/<header|<h1|<footer|prepared for review|Nothing changes until|\(reviewed\)/i);
 assert.ok(entry.source!.length<240000);
 const installers=JSON.parse(await readFile('templates/catalog-installers.json','utf8'));
 assert.equal(await readFile(installers['life.cash-runway@3.0.0'],'utf8'),await readFile(installers['life.cash-runway@2.2.1'],'utf8'),'byte-identical installer schema');
 assert.deepEqual(readAppCommands(entry.source),readAppCommands(previous.source),'same command names and inputs');
 assert.deepEqual((entry as any).recommendedAutomations,(previous as any).recommendedAutomations);
 assert.deepEqual(entry.functions,previous.functions);
 for(const k of ['tableMap','pageSize','layoutProfile','readOnly','heading'])assert.ok(entry.options[k],k);
 // The layout declaration keeps the 2.x screen ids, so saved layout profiles stay valid.
 assert.deepEqual(readCustomLayout(wrap(entry))!.schema.screens.map(s=>s.id),readCustomLayout(wrap(previous))!.schema.screens.map(s=>s.id));
});

test('every screen renders on the kit with no header, banner or footer of its own, at every width',async()=>{
 const d=dataset();
 for(const width of ['wide','panel','phone'])for(const [screen,extra] of SCREENS){
  const r=await render(d.rows,{screen,...extra},{kind:'open',action:''},{width});
  assert.doesNotMatch(r.html,/<header|<h1|<footer|rw-banner|role="alert"|position:\s*(fixed|sticky)/,screen);
  assert.match(r.html,/class="k-app"/);assert.match(r.html,/aria-current="page"/);
  assert.equal(r.calls.includes('records.save'),false,'opening never writes ('+screen+')');
  assert.equal(r.calls.filter(c=>c==='records.read'||c==='records.readMany').length<=4,true,screen+' reads in batches: '+r.calls.join(','));
 }
 const o=text((await render(d.rows)).html);
 assert.match(o,/Cash lasts/);assert.match(o,/Runway/);assert.match(o,/Cash at milestones/);assert.match(o,/Phase 1 start/);
 // Data lists have their own screens; Settings holds only business choices.
 const s=await render(d.rows,{screen:'settings'});assert.match(s.html,/data-action="settings:save"/);assert.doesNotMatch(text(s.html),/Monthly exchange rates|Organizations · /);
 assert.match(text((await render(d.rows,{screen:'rates'})).html),/USD/);
 assert.match((await render(d.rows,{screen:'programs'})).html,/value="TX-1"/);
 assert.match((await render(d.rows,{screen:'organizations'})).html,/value="Acme CRO"/);
});

test('each screen reads only its tables; lists read one sorted page and full-table counts come from records.summarize',async()=>{
 const d=dataset(),seen:Record<string,string[]>={};
 for(const [screen,extra] of SCREENS){const reads:string[]=[];await execute(effectiveSource(wrap(entry)),{saved:true,writable:true,appRole:'owner',context:null,state:{screen,...extra},event:{kind:'open',action:''}},async(name,v:any)=>{
  if(name==='records.readMany'){reads.push(...v.reads.map((x:any)=>x.typeId));return {results:v.reads.map((x:any)=>readRows(d.rows,x))};}
  if(name==='records.read'){reads.push(v.typeId);return readRows(d.rows,v);}
  if(name==='records.summarize'){reads.push('summary:'+v.typeId);return {totals:{count:1},groups:[]};}
  if(name==='integrations.list')return {integrations:[]};throw Error(name);});seen[screen+(extra.planTab?':'+extra.planTab:'')]=reads;}
 assert.deepEqual(seen.programs,['runway.settings','programs']);
 assert.deepEqual(seen.organizations,['runway.settings','organizations']);
 assert.deepEqual(seen.rates,['runway.settings','runway.fx_rates','summary:runway.fx_rates']);
 assert.deepEqual(seen.settings,['runway.settings']);
 assert.ok(!seen['plan:lines'].includes('runway.actuals')&&!seen['plan:lines'].includes('runway.month_closes'),'the lines register needs no closes or actuals');
 assert.ok(seen.actuals.includes('summary:runway.actuals'),'months count records over the whole table');
});

test('a value edited where it is shown saves at once with the version captured when editing started',async()=>{
 const d=dataset();const line=d.rows.find(r=>r.id===d.rent)!;line.version=3;
 const plan=await render(d.rows,{screen:'plan'});
 assert.match(plan.html,new RegExp('data-action="edit:'+d.rent+':amount:3"'));
 const r=await render(d.rows,plan.state,{kind:'change',action:'edit:'+d.rent+':amount:3',value:'12500'});
 assert.equal(r.saves.length,1);assert.deepEqual(r.saves[0],[{kind:'update_record',recordId:d.rent,expectedVersion:3,data:{amount:12500}}]);
 assert.equal(r.notice.kind,'success');assert.match(r.html,/value="12500"/,'the new value shows at once');
 // A refused value never saves; the message is the platform notice.
 const bad=await render(d.rows,plan.state,{kind:'change',action:'edit:'+d.rent+':amount:3',value:'-5'});
 assert.equal(bad.saves.length,0);assert.equal(bad.notice.kind,'error');assert.match(bad.notice.message,/cannot be negative/);
 // Drag and drop: a planned hire moves to current with its version.
 const people=await render(d.rows,{screen:'people',view:'board'});assert.match(people.html,/data-drop-action="move-position"/);
 const moved=await render(d.rows,people.state,{kind:'change',action:'move-position',value:d.hire+'>current'});
 assert.deepEqual(moved.saves[0],[{kind:'update_record',recordId:d.hire,expectedVersion:0,data:{status:'current'}}]);
 // Delete is an archive with Undo offered on the saved screen.
 const del=await render(d.rows,{screen:'plan'},{kind:'click',action:'delete:runway.plan_lines:x'});assert.equal(del.notice.kind,'error');
 const gone=await render(d.rows,{screen:'plan'},{kind:'click',action:'delete:lines:'+d.seed+':0'});
 assert.deepEqual(gone.saves[0],[{kind:'archive_record',recordId:d.seed,expectedVersion:0}]);assert.doesNotMatch(gone.html,/value="Seed"/,'removed at once');
 const after=await render(d.rows,gone.state,{kind:'open',action:''},{undo:[{undoId:'u1',label:'Delete Seed'}]});
 assert.match(after.html,/data-action="undo:u1"/);
 const undone=await render(d.rows,after.state,{kind:'click',action:'undo:u1'});assert.ok(undone.calls.includes('undo.run'));assert.equal(undone.notice.kind,'success');
 // A side panel creates a record.
 const add=await render(d.rows,{screen:'plan'},{kind:'click',action:'add:lines'});assert.match(add.html,/class="k-panel"/);
 const created=await render(d.rows,add.state,{kind:'submit',action:'panel:save',form:{name:'Assay',direction:'spend',category:'Research',driver:'one_off',amount:'250',currency:'EUR',start_month:'2026-11',status:'committed'}});
 assert.equal(created.saves.length,1);assert.equal(created.saves[0][0].kind,'create_record');assert.equal(created.saves[0][0].data.start_month,'2026-11-01');assert.equal(created.state.panel,null);
 // Editing in the panel sends only the changed values, with the version from when the panel opened.
 const edit=await render(d.rows,{screen:'plan'},{kind:'click',action:'open-edit:lines:'+d.cro});
 const saved=await render(d.rows,edit.state,{kind:'submit',action:'panel:save',form:{name:'CRO Phase 1',amount:'20000'}});
 assert.deepEqual(saved.saves[0],[{kind:'update_record',recordId:d.cro,expectedVersion:0,data:{name:'CRO Phase 1'}}]);
 // Viewers and unsaved previews never write.
 const viewer=await render(d.rows,plan.state,{kind:'change',action:'edit:'+d.rent+':amount:3',value:'1'},{writable:false,role:'viewer'});assert.equal(viewer.saves.length,0);assert.doesNotMatch(viewer.html,/data-action="edit:/);
});

test('Settings are for owners only; editors keep the opening balance',async()=>{
 const d=dataset();
 for(const role of ['editor','viewer']){const r=await render(d.rows,{screen:'settings'},{kind:'open',action:''},{role,writable:role==='editor'});
  assert.doesNotMatch(r.html,/data-action="nav:settings"|settings:save/,role);assert.notEqual(r.state.screen,'settings');}
 const editor=await render(d.rows,{},{kind:'submit',action:'settings:save',form:{runway_target_months:'12'}},{role:'editor'});
 assert.equal(editor.saves.length,0);assert.equal(editor.notice.kind,'error');
 const cell=await render(d.rows,{screen:'actuals'},{kind:'change',action:'edit:'+d.settings+':runway_target_months:0',value:'12'},{role:'editor'});assert.equal(cell.saves.length,0);
 const opening=await render(d.rows,{screen:'actuals'},{kind:'change',action:'edit:'+d.settings+':opening_balance:0',value:'900000'},{role:'editor'});
 assert.deepEqual(opening.saves[0],[{kind:'update_record',recordId:d.settings,expectedVersion:0,data:{opening_balance:900000}}]);
 const owner=await render(d.rows,{screen:'settings'},{kind:'submit',action:'settings:save',form:{runway_target_months:'12',reporting_currency:'EUR'}});
 assert.deepEqual(owner.saves[0],[{kind:'update_record',recordId:d.settings,expectedVersion:0,data:{runway_target_months:12}}]);
 const cmd=await command(entry,d.rows,'settings.save',{fields:{runway_target_months:12}},{role:'editor'});assert.equal(cmd.ok,false);assert.match(cmd.error,/owners/);
});

test('every empty screen offers its first action; pending reads show as loading, never as zero',async()=>{
 const none=await render([],{});assert.match(none.html,/class="k-empty"/);assert.match(none.html,/data-action="setup"/);
 const settingsOnly=dataset().rows.filter(r=>r.role==='runway.settings');
 const expect:Record<string,RegExp>={plan:/data-action="add:lines"/,people:/data-action="add:positions"/,scenarios:/data-action="preview-new"/,actuals:/data-action="(open-close|add:actuals)"/,rates:/data-action="add:rates"/,programs:/data-action="add:programs"/,organizations:/data-action="add:organizations"/};
 for(const [screen,re] of Object.entries(expect)){const r=await render(settingsOnly,{screen});assert.match(r.html,/class="k-empty"/,screen);assert.match(r.html,re,screen);}
 assert.match((await render(settingsOnly,{screen:'plan',planTab:'milestones'})).html,/data-action="add:programItems"/);
 for(const [screen,extra] of SCREENS){const r=await render(dataset().rows,{screen,...extra},{kind:'open',action:''},{pending:true});
  assert.match(text(r.html),/Loading/,screen);assert.doesNotMatch(text(r.html),/Set up your first runway|No plan lines yet|0 months|EUR 0\b/,screen);}
});

test('messages are platform notices; a month close and a budget lock save in one call',async()=>{
 const d=dataset();
 const open=await render(d.rows,{screen:'actuals'},{kind:'click',action:'open-close'});assert.equal(open.state.panel.kind,'close');assert.equal(open.state.panel.month,'2026-07');
 const r=await render(d.rows,open.state,{kind:'submit',action:'close-submit',form:{month:'2026-07',closing_balance:'965000',currency:'EUR',actual_Facilities:'10000',actual_Clinical:'20000',actual_People:'5000'}});
 assert.equal(r.saves.length,1);assert.equal(r.saves[0].length,4);assert.equal(r.notice.kind,'success');assert.match(r.notice.message,/July 2026|Jul 2026/);
 assert.doesNotMatch(r.html,/rw-banner|role="status"/);
 apply(d.rows,r.saves[0]);const close=d.rows.find(x=>x.role==='runway.month_closes')!;assert.equal(JSON.parse(close.data.metrics).asOf,'2026-07');
 const lock=await render(d.rows,{screen:'plan',planTab:'budgets'},{kind:'submit',action:'lock-budget',form:{year:'2026'}});
 assert.equal(lock.saves.length,1);assert.equal(lock.saves[0][0].data.year,2026);
 const err=await render(d.rows,{screen:'actuals'},{kind:'submit',action:'close-submit',form:{month:'2026-09',closing_balance:'1'}});assert.equal(err.saves.length,0);assert.equal(err.notice.kind,'error');assert.match(err.notice.message,/in order/);
});

test('commands run the same engine as 2.2.1 and save directly in one buffered call',async()=>{
 const d=dataset();
 for(const id of ['summary.read','cashflow.read','bridge.read','variance.read','sources.read']){
  const a=await command(entry,d.rows,id),b=await render(d.rows,null,{kind:'command',action:id,value:'{}',form:{}},{entry:previous});
  assert.equal(a.ok,true,id+': '+a.error);assert.deepEqual(a.result,b.state.command.result,id+' gives the 2.2.1 figures');}
 const ev=await command(entry,d.rows,'scenario.evaluate',{changes:[{kind:'move_cash_in',target_id:d.seed,months:4}]});assert.equal(ev.ok,true,ev.error);assert.equal(ev.saves.length,0);
 const close=await command(entry,d.rows,'month.close',{month:'2026-07',closing_balance:965000,actuals:{Facilities:10000,Clinical:20000}});
 assert.equal(close.ok,true,close.error);assert.equal(close.saves.length,1,'one save');assert.equal(close.saves[0].length,3);assert.ok(close.result.saved.length);
 const line=await command(entry,d.rows,'line.save',{id:d.rent,fields:{amount:11000}});assert.equal(line.ok,true,line.error);assert.deepEqual(line.saves[0],[{kind:'update_record',recordId:d.rent,expectedVersion:0,data:{amount:11000}}]);
 const arch=await command(entry,d.rows,'line.archive',{id:d.rent});assert.deepEqual(arch.saves[0],[{kind:'archive_record',recordId:d.rent,expectedVersion:0}]);
 const failed=await command(entry,d.rows,'month.close',{month:'2026-09',closing_balance:1});assert.equal(failed.ok,false);assert.equal(failed.saves.length,0);
 const layout=await render(d.rows,null,{kind:'command',action:'layout.save',value:JSON.stringify({hide:['people']}),form:{}});assert.equal(layout.state.command.ok,true,layout.state.command.error);assert.equal(layout.layouts.length,1);
});

test('the working program is kept as context across screens and visits',async()=>{
 const d=dataset();
 const r=await render(d.rows,{screen:'plan'},{kind:'change',action:'context',value:d.p2});
 assert.deepEqual(r.output.context,{program:d.p2});assert.doesNotMatch(r.html,/value="Lab rent"/);assert.match(r.html,/value="Tox"/);
 const next=await render(d.rows,{screen:'people'},{kind:'open',action:''},{context:{program:d.p2}});assert.equal(next.state.program,d.p2);
});

/* Design check under the current rules (1440, 400 and 390 px) on every screen. Needs a Chromium (APP_DESIGN_CHROMIUM). */
test('every screen passes the current design check',{skip:process.env.APP_DESIGN_CHECKS==='off'},async()=>{
 const {inspectAppDesign}=await import('../src/workspace/design-quality.js'),{kitCss}=await import('../src/shared/app-kit.js');
 const d=dataset(),frames:any[]=[];
 for(const [screen,extra] of SCREENS.filter(([s,e])=>!(s==='people'&&e.view))){const r=await render(d.rows,{screen,...extra});frames.push({name:screen+(extra.planTab?'-'+extra.planTab:''),html:r.html,css:kitCss()+r.output.css});}
 const report=await inspectAppDesign(frames.slice(0,12),'current');
 assert.equal(report.status,'passed',JSON.stringify(report.issues.filter((i:any)=>i.severity!=='warning').slice(0,8)));
});
