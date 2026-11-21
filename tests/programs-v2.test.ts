import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execute} from '../src/foundation/runtime.js';
import {appTemplates} from '../src/workspace/app-templates.js';
import {readAppCommands} from '../src/workspace/app-commands.js';
import {effectiveSource,isV2Source} from '../src/workspace/browser-runtime.js';
import {kitCss} from '../src/shared/app-kit.js';

/* Programs 3.0.0 (7.3, 7.4): the v2 app contract on the kit. Every screen rendered in production QuickJS with stub tools and
 * fictional data: no own header, notices instead of banners, inline saves with records.save and the version shown, Settings for
 * owners only, an action on every empty screen, pending reads shown as loading, the program as working context. */
const entry=await appTemplates.read({templateId:'life.project-oversight',version:'3.0.0'});
const released=await appTemplates.read({templateId:'life.project-oversight',version:'2.2.1',includeFunctionSource:true});
const schema=JSON.parse(await readFile('templates/source/project-oversight/schema.example.json','utf8'));
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:r==='people'?[]:Object.keys(schema[r].logicalFields)}]));
const bindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
const AS_OF='2026-11-16';
const cfgOf=(over:any={})=>({...entry.defaults,tableMap:JSON.stringify(map),asOfOverride:AS_OF,...over});
const source=(config:any=cfgOf())=>effectiveSource(`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(bindings)};\n${entry.source}`);
type Row={id:string,version:number,role:string,data:any};
const SCREENS=['overview','timeline','plan','decisions','raid','updates','programs','team','cash','settings'];
async function render(rows:Row[],state:any={},event:any={kind:'open',action:''},opts:any={}){
 const saves:any[]=[],calls:string[]=[],layouts:any[]=[];
 const read=(v:any)=>{if(opts.pending)return {pending:true,rows:[],total:null};if(opts.denied===v.typeId)return {unavailable:true,rows:[],total:null};const all=rows.filter(r=>r.role===v.typeId).map(r=>({id:r.id,version:r.version,data:r.data}));return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};};
 const output:any=await execute(source(opts.config),{saved:opts.saved??true,writable:opts.writable??true,appRole:opts.role??'owner',context:opts.context??null,viewport:{width:opts.width??'wide',coarse:false},state,event},async(name,v:any)=>{
  calls.push(name);
  if(name==='records.save'){saves.push(...v.changes);return {status:'saving',count:v.changes.length};}
  if(name==='records.readMany')return opts.pending?{pending:true,results:v.reads.map(()=>({pending:true,rows:[],total:null}))}:{results:v.reads.map(read)};
  if(name==='records.read')return read(v);
  if(name==='integrations.list')return {integrations:opts.integrations??[]};
  if(name==='undo.list')return {actions:opts.undo??[]};
  if(name==='undo.run'){return {status:'undone'};}
  if(name==='layout.propose'){layouts.push(v);return {status:'proposed'};}
  throw Error('Unexpected capability '+name);
 });
 return {output,saves,calls,layouts,html:output.html as string,state:output.state,notice:output.notice};
}
const command=async(rows:Row[],id:string,input:any={},opts:any={})=>{const r=await render(rows,null,{kind:'command',action:id,value:JSON.stringify(input),form:{}},opts);return {...r.state.command,saves:r.saves,layouts:r.layouts,calls:r.calls};};
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ');
const UUIDS=/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/i;
const ANA='3f0b7c1e-2a4d-4c6e-9f10-0a1b2c3d4e5f';
function dataset(){
 const rows:Row[]=[];const add=(role:string,data:any)=>{const id=randomUUID();rows.push({id,version:1,role,data});return id;};
 add('programs.settings',{functions:'cmc, nonclinical, clinical, regulatory, other',stages:'',due_soon_days:90,update_day:5,reminder_days:7});
 const p1=add('programs',{name:'PX-101 (fictional)',stage:'ind_enabling',status:'active',lead:'Ana Ruiz',health:'amber',health_rationale:'CMC tight',health_date:'2026-11-02',archived:false});
 const p2=add('programs',{name:'PX-202 (fictional)',stage:'preclinical',status:'active',health:'unassessed',archived:false});
 add('programs.team',{program_id:p1,name:'Ana Ruiz',member_id:ANA,role:'CMC lead',added_on:'2026-11-01',archived:false});
 add('programs.team',{program_id:p1,name:'Ben Ode',role:'Clinical lead',archived:false});
 const I=(o:any)=>add('programs.plan_items',{program_id:p1,item_type:'milestone',function:'cmc',status:'planned',is_key:false,archived:false,...o});
 const gmp=I({name:'GMP batch',owner:'Ana Ruiz',owner_member_id:ANA,start_date:'2026-10-01',end_date:'2027-01-31',baseline_start:'2026-10-01',baseline_end:'2027-01-31',remind_on:'2027-01-24',assigned_on:'2026-11-01'});
 const tox=I({name:'GLP tox report',function:'nonclinical',owner:'Ben Ode',start_date:'2027-02-01',end_date:'2027-02-28',baseline_start:'2027-02-01',baseline_end:'2027-02-28',predecessor_id:gmp});
 const ind=I({name:'IND submission',function:'regulatory',start_date:'2027-03-01',end_date:'2027-03-31',baseline_end:'2027-03-31',predecessor_id:tox,is_key:true});
 const late=I({name:'Stability protocol',item_type:'activity',owner:'Ana Ruiz',owner_member_id:ANA,end_date:'2026-11-10',status:'in_progress'});
 const soon=I({name:'Release spec',owner:'Ana Ruiz',owner_member_id:ANA,end_date:'2026-11-20',status:'planned',remind_on:'2026-11-16'});
 const other=add('programs.plan_items',{program_id:p2,name:'Candidate selection',item_type:'milestone',function:'other',status:'planned',end_date:'2026-12-15',is_key:true,archived:false});
 const gate=add('programs.decisions',{name:'IND go / no-go',program_id:p1,kind:'gate',target_date:'2026-12-01',criteria:'[met] Tox plan\n[open] GMP batch released',outcome:'pending',archived:false});
 const risk=add('programs.raid',{name:'CDMO capacity',program_id:p1,raid_type:'risk',likelihood:'high',impact:'high',owner:'Ana Ruiz',owner_member_id:ANA,next_review:'2026-11-12',status:'open',archived:false});
 const assum=add('programs.raid',{name:'Tox slot holds',program_id:p1,raid_type:'assumption',likelihood:'medium',impact:'high',owner:'Ben Ode',next_review:'2026-12-15',status:'open',archived:false});
 add('programs.slips',{plan_item_id:late,changed_on:'2026-11-13',old_end:'2026-11-03',new_end:'2026-11-10',days:7,reason:'manufacturing',detail:''});
 add('programs.updates',{program_id:p1,month:'2026-11-01',health:'amber',summary:'On track except CMC.'});
 add('runway.month_closes',{month:'2026-12-01',closing_balance:4200000,currency:'EUR'});
 return {rows,p1,p2,gmp,tox,ind,late,soon,other,gate,risk,assum};
}
const nav=(screen:string)=>({screen});

test('3.0.0 is a v2 app with the 2.2.1 schema, helpers, automations and commands',async()=>{
 assert.equal(entry.version,'3.0.0');assert.deepEqual((entry as any).upgradeFrom,['2.2.0','2.2.1']);
 const body=entry.source!;assert.ok(body.startsWith("'use trialagents v2';\n"));assert.ok(isV2Source(`const templateConfiguration={};\nconst templateBindings=[];\n${body}`));
 assert.doesNotMatch(body,/records\.propose/);assert.ok(body.length<240000);
 // The installer schema is the released one, byte for byte; helpers, automations and commands are unchanged.
 assert.equal(await readFile('templates/source/project-oversight/schema.example.json','utf8'),await readFile('templates/source/project-oversight/archive/2.2.1/schema.example.json','utf8'));
 const installers=JSON.parse(await readFile('templates/catalog-installers.json','utf8'));
 assert.equal(installers['life.project-oversight@2.2.1'],'templates/source/project-oversight/archive/2.2.1/schema.example.json');assert.equal(installers['life.project-oversight@3.0.0'],'templates/source/project-oversight/schema.example.json');
 const raw=JSON.parse(await readFile('templates/apps/life.project-oversight-3.0.0.json','utf8')),old=JSON.parse(await readFile('templates/apps/life.project-oversight-2.2.1.json','utf8'));
 assert.deepEqual(raw.functions,old.functions);assert.deepEqual(raw.recommendedAutomations,old.recommendedAutomations);assert.deepEqual(raw.automationFeatures,old.automationFeatures);
 assert.deepEqual(readAppCommands(raw.source),readAppCommands(old.source));
 assert.equal(raw.options.tableMap.description,old.options.tableMap.description);for(const k of Object.keys(raw.options))assert.ok(old.options[k],k);
 assert.ok(released.version==='2.2.1');
 const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8'));assert.equal(seed['life.project-oversight'].version,'2.2.1','3.0.0 ships as a draft');
});

test('every screen renders on the kit with no own header, banner, footer or raw IDs, from one batched read',async()=>{
 const d=dataset();
 for(const screen of SCREENS){
  const r=await render(d.rows,nav(screen));
  assert.doesNotMatch(r.html,/<header|<h1|<footer|pg-banner|role="alert"|could not be shown/,screen);
  assert.match(r.html,/class="k-app"/,screen);assert.match(r.html,/data-action="nav:overview"/,screen);
  assert.doesNotMatch(text(r.html),UUIDS,screen+': no record or member IDs on screen');
  assert.doesNotMatch(text(r.html),/prepared for review|until you approve|\(reviewed\)|Reviewed data change/i,screen);
  assert.equal(r.calls.filter(c=>c==='records.readMany').length,1,screen+': one batched read');assert.equal(r.calls.filter(c=>c==='records.read').length,0,screen);
  assert.equal(r.saves.length,0,screen+': opening never writes');
  assert.deepEqual(r.output.context,{program:''},screen);
 }
 // Each screen reads only its tables: the Settings screen reads programs and settings, not the plan.
 const s=await render(d.rows,nav('settings'));assert.match(text(s.html),/Function lanes/);
 const team=await render(d.rows,nav('team'));assert.match(text(team.html),/Ana Ruiz.*Linked/);assert.match(text(team.html),/Ben Ode.*Name only/);assert.ok(!team.html.includes(ANA));
});

test('values are edited in place and saved at once with the version shown; errors come back as a notice',async()=>{
 const d=dataset();const soon=d.rows.find(r=>r.id===d.soon)!;
 const plan=await render(d.rows,nav('plan'));
 assert.ok(plan.html.includes(`data-action="edit:${d.soon}:owner:1"`),'owner is an inline cell');
 const r=await render(d.rows,plan.state,{kind:'change',action:`edit:${d.soon}:owner:1`,value:'Ben Ode',form:{}});
 assert.equal(r.saves.length,1);const c=r.saves[0];assert.equal(c.kind,'update_record');assert.equal(c.recordId,d.soon);assert.equal(c.expectedVersion,1);
 // The app keeps the notification fields: Ben is not linked, so the member link and reminder are cleared.
 assert.deepEqual(c.data,{owner:'Ben Ode',owner_member_id:null,assigned_on:null,remind_on:null});
 assert.deepEqual(r.notice,{kind:'success',message:'Saved'});assert.equal(r.state.undoHint,true);
 // Status from the select; an invalid value is refused with a notice and nothing saved.
 const s=await render(d.rows,plan.state,{kind:'change',action:`edit:${d.soon}:status:1`,value:'done',form:{}});assert.equal(s.saves[0].data.status,'done');assert.equal(s.saves[0].expectedVersion,1);
 const bad=await render(d.rows,plan.state,{kind:'change',action:`edit:${d.soon}:status:1`,value:'finished',form:{}});
 assert.equal(bad.saves.length,0);assert.equal(bad.notice.kind,'error');assert.doesNotMatch(bad.html,/role="alert"|pg-banner/);
 const early=await render(d.rows,plan.state,{kind:'change',action:`edit:${d.gmp}:end_date:1`,value:'2026-09-01',form:{}});assert.equal(early.saves.length,0);assert.match(early.notice.message,/end date is before the start date/);
 assert.equal(soon.version,1);
});

test('a later committed date asks for the slip reason and saves the item and one slip together',async()=>{
 const d=dataset();const plan=await render(d.rows,nav('plan'));
 const moved=await render(d.rows,plan.state,{kind:'change',action:`edit:${d.gmp}:end_date:1`,value:'2027-02-21',form:{}});
 assert.equal(moved.saves.length,0);assert.equal(moved.notice.kind,'info');assert.equal(moved.state.panel.role,'items');assert.equal(moved.state.panel.draft.end_date,'2027-02-21');
 assert.match(text(moved.html),/Slip reason/);assert.match(text(moved.html),/Downstream impact/);assert.match(moved.html,/class="k-panel"/);
 const missing=await render(d.rows,moved.state,{kind:'submit',action:'panel:save',form:{end_date:'2027-02-21'}});assert.equal(missing.saves.length,0);assert.match(missing.notice.message,/slip reason/);assert.ok(missing.state.panel,'the draft stays open');
 const saved=await render(d.rows,moved.state,{kind:'submit',action:'panel:save',form:{end_date:'2027-02-21',slip_reason:'cro_vendor',accept_downstream:'true'}});
 const kinds=saved.saves.map((c:any)=>c.kind+':'+(c.typeId??c.recordId));
 assert.ok(kinds.includes('update_record:'+d.gmp));assert.equal(saved.saves.filter((c:any)=>c.typeId==='programs.slips').length,3,'one slip for the item and one per baselined successor pushed');
 assert.equal(saved.saves.find((c:any)=>c.recordId===d.gmp).expectedVersion,1);assert.equal(saved.state.panel,null);
});

test('the plan board moves status by drag and drop or the card menu; archive is an archive_record with the version',async()=>{
 const d=dataset();const board=await render(d.rows,{screen:'plan',plan:{view:'board'}});
 assert.match(board.html,/class="k-board"/);assert.match(board.html,new RegExp(`data-drag="${d.soon}"`));
 const drop=await render(d.rows,board.state,{kind:'change',action:'move',value:`${d.soon}>at_risk`,form:{}});
 assert.deepEqual([drop.saves[0].recordId,drop.saves[0].expectedVersion,drop.saves[0].data.status],[d.soon,1,'at_risk']);
 const menu=await render(d.rows,board.state,{kind:'change',action:`move-menu:${d.soon}`,value:'done',form:{}});assert.equal(menu.saves[0].data.status,'done');
 const open=await render(d.rows,nav('raid'),{kind:'click',action:`open:raid:${d.assum}`,form:{}});
 const archived=await render(d.rows,open.state,{kind:'click',action:`archive:raid:${d.assum}`,form:{}});
 assert.deepEqual(archived.saves,[{kind:'archive_record',recordId:d.assum,expectedVersion:1}]);
 const blocked=await render(d.rows,nav('plan'),{kind:'click',action:`archive:items:${d.gmp}`,form:{}});assert.equal(blocked.saves.length,0);assert.match(blocked.notice.message,/predecessor/);
});

test('Settings are business choices for owners only',async()=>{
 const d=dataset();
 const owner=await render(d.rows,nav('settings'));assert.match(owner.html,/data-action="nav:settings"/);assert.match(owner.html,/data-action="settings:save"/);
 for(const role of ['editor','viewer']){const r=await render(d.rows,nav('settings'),{kind:'open',action:''},{role});
  assert.doesNotMatch(r.html,/nav:settings|settings:save/,role);assert.equal(r.state.screen,'overview',role);}
 const saved=await render(d.rows,owner.state,{kind:'submit',action:'settings:save',form:{functions:'clinical, cmc',stages:'',due_soon_days:'60',update_day:'5',reminder_days:'7',health_definitions:'Green: on plan.'}});
 assert.equal(saved.saves.length,1);assert.equal(saved.saves[0].kind,'update_record');assert.deepEqual(saved.saves[0].data,{functions:'clinical, cmc',due_soon_days:60,health_definitions:'Green: on plan.'});
 const refused=await command(d.rows,'settings.save',{fields:{due_soon_days:30}},{role:'editor'});assert.equal(refused.ok,false);assert.equal(refused.saves.length,0);
 // Viewers see values but no editable cells or add buttons.
 const viewer=await render(d.rows,nav('plan'),{kind:'open',action:''},{role:'viewer'});assert.doesNotMatch(viewer.html,/data-action="edit:|data-action="add:/);
});

test('every empty screen offers its first action',async()=>{
 const none:Row[]=[];
 for(const screen of SCREENS.filter(s=>s!=='settings')){const r=await render(none,nav(screen));if(screen==='settings')continue;
  const empty=/class="k-empty"[\s\S]*?<button[^>]*data-action="(add:[a-z]+|up:[a-z]+)"/.exec(r.html);assert.ok(empty,screen+' offers a first action');}
 // With a program but nothing else, each data screen offers its own first record.
 const d=dataset(),one=d.rows.filter(r=>r.role==='programs'||r.role==='programs.settings');
 for(const [screen,act] of [['plan','add:items'],['timeline','add:items'],['decisions','add:decisions'],['raid','add:raid'],['updates','add:updates'],['team','add:team'],['cash','add:closes']] as const){
  const r=await render(one,nav(screen));assert.match(r.html,new RegExp(`class="k-empty"[\\s\\S]*data-action="${act}"`),screen);}
 const reports=await render(d.rows,{screen:'updates',up:{tab:'archive'}});assert.match(reports.html,/class="k-empty"[\s\S]*data-action="up:report"/);
});

test('reads still on their way show as loading, never as empty or zero',async()=>{
 for(const screen of SCREENS.filter(s=>s!=='settings')){const r=await render([],nav(screen),{kind:'open',action:''},{pending:true});
  assert.match(r.html,/Loading…/,screen);assert.doesNotMatch(r.html,/k-empty|No programs yet|k-stat/,screen);}
 // A table the person cannot read is labelled, not shown as zero.
 const d=dataset();const r=await render(d.rows,nav('overview'),{kind:'open',action:''},{denied:'programs.raid'});assert.match(text(r.html),/could not be read completely/);assert.match(r.html,/<b>—<\/b><span>Open high risks/);
});

test('the selected program is the working context across screens and visits',async()=>{
 const d=dataset();
 const pick=await render(d.rows,nav('plan'),{kind:'change',action:'context',value:d.p2,form:{}});
 assert.deepEqual(pick.output.context,{program:d.p2});assert.match(text(pick.html),/Candidate selection/);assert.doesNotMatch(text(pick.html),/GMP batch/);
 const next=await render(d.rows,pick.state,{kind:'click',action:'nav:raid',form:{}});assert.deepEqual(next.output.context,{program:d.p2});assert.match(next.html,/class="k-empty"/);
 // A new visit starts from the remembered context.
 const visit=await render(d.rows,{},{kind:'open',action:''},{context:{program:d.p1}});assert.equal(visit.state.prog,d.p1);assert.doesNotMatch(text(visit.html),/PX-202 \(fictional\)\s+Unassessed/);
 const gone=await render(d.rows,{},{kind:'open',action:''},{context:{program:randomUUID()}});assert.deepEqual(gone.output.context,{program:''});
});

test('Undo is offered after a save and runs from a click',async()=>{
 const d=dataset();const plan=await render(d.rows,nav('plan'));
 const saved=await render(d.rows,plan.state,{kind:'change',action:`edit:${d.soon}:owner:1`,value:'Ben Ode',form:{}});
 const again=await render(d.rows,saved.state,{kind:'open',action:''},{undo:[{undoId:'11111111-2222-4333-8444-555555555555',label:'Edit plan item'}]});
 assert.ok(again.calls.includes('undo.list'));assert.match(again.html,/data-action="undo:11111111-2222-4333-8444-555555555555"/);
 const undo=await render(d.rows,again.state,{kind:'click',action:'undo:11111111-2222-4333-8444-555555555555',form:{}});assert.ok(undo.calls.includes('undo.run'));assert.equal(undo.notice.kind,'success');
 // Screen changes and filters make no server-only call.
 const local=await render(d.rows,again.state,{kind:'change',action:'filter:plan:q',value:'GMP',form:{}});assert.ok(!local.calls.includes('undo.list'));
});

test('gate outcomes, baselines, promotions and reports save directly from the person’s action',async()=>{
 const d=dataset();
 const gate=await render(d.rows,nav('decisions'),{kind:'click',action:`outcome:${d.gate}`,form:{}});assert.match(gate.html,/class="k-panel"/);
 const out=await render(d.rows,gate.state,{kind:'submit',action:'gate:save',form:{outcome:'go',decided_on:'2026-11-16',approver:'Board',rationale:'Ready.',cancel_none:'true'}});
 assert.equal(out.saves.length,1);assert.deepEqual(out.saves[0].data,{outcome:'go',decided_on:'2026-11-16',approver:'Board',rationale:'Ready.'});
 const base=await render(d.rows,nav('plan'),{kind:'click',action:`baseline:${d.p1}`,form:{}});assert.deepEqual(base.saves.map((c:any)=>c.recordId).sort(),[d.late,d.soon].sort());
 const promo=await render(d.rows,nav('raid'),{kind:'click',action:`promote:${d.assum}:risk`,form:{}});assert.deepEqual(promo.saves.map((c:any)=>c.kind),['create_record','update_record']);
 const rep=await render(d.rows,{screen:'updates',up:{tab:'report'}},{kind:'submit',action:'report:save',form:{month:'2026-11',title:'November',narrative:''}});
 assert.equal(rep.saves.length,1);assert.equal(rep.saves[0].typeId,'programs.reports');assert.ok(JSON.parse(rep.saves[0].data.contents).programs.length===2);
});

test('app commands keep their names and inputs and save directly through the same handlers',async()=>{
 const d=dataset();
 for(const c of readAppCommands(entry.source!)!.filter(c=>c.mode==='read')){const input=c.id==='item.drivers'?{item_id:d.ind}:c.id==='item.impact'?{item_id:d.gmp,end_date:'2027-02-21'}:c.id==='report.preview'?{month:'2026-11'}:{};
  const r=await command(d.rows,c.id,input);assert.equal(r.ok,true,c.id+': '+r.error);assert.equal(r.saves.length,0,c.id);}
 const tl=await command(d.rows,'timeline.read',{program_id:d.p1});assert.deepEqual(tl.result.programs[0].critical_path.items.map((x:any)=>x.name),['GMP batch','GLP tox report','IND submission']);
 const save=await command(d.rows,'item.save',{id:d.gmp,fields:{end_date:'2027-02-21'},slip_reason:'cro_vendor'});
 assert.equal(save.ok,true,save.error);assert.equal(save.calls.filter((c:string)=>c==='records.save').length,1);assert.equal(save.saves.length,2);assert.ok(save.result.saved.length);assert.equal(save.result.impact.slip_required,true);
 const team=await command(d.rows,'team.save',{fields:{program_id:d.p2,name:'Cleo Park',member_id:ANA}});assert.equal(team.ok,true,team.error);assert.equal(team.saves[0].data.member_id,ANA);assert.equal(team.saves[0].data.added_on,AS_OF);
 const arch=await command(d.rows,'record.archive',{role:'raid',id:d.risk});assert.deepEqual(arch.saves,[{kind:'archive_record',recordId:d.risk,expectedVersion:1}]);
 const gate=await command(d.rows,'gate.record',{gate_id:d.gate,outcome:'conditional',decided_on:'2026-11-16',rationale:'Pending batch',follow_ups:[{name:'Batch release',end_date:'2027-01-15',function:'cmc'}],cancel_item_ids:[d.soon]});
 assert.equal(gate.ok,true,gate.error);assert.equal(gate.saves.length,3);
 const layout=await command(d.rows,'layout.save',{hide:['items:predecessor_id']});assert.equal(layout.ok,true,layout.error);assert.equal(layout.layouts[0].visible['items:predecessor_id'],false);
 const hidden=await render(d.rows,nav('plan'),{kind:'open',action:''},{config:cfgOf({layoutProfile:JSON.stringify(layout.layouts[0])})});assert.doesNotMatch(hidden.html,/>Predecessor</);
});

test('the program team shows names, never member IDs; notification links are kept by the app',async()=>{
 const d=dataset();const team=await render(d.rows,nav('team'));
 const add=await render(d.rows,team.state,{kind:'click',action:'add:team',form:{}});assert.doesNotMatch(add.html,/member_id|Member ID/);
 const created=await render(d.rows,add.state,{kind:'submit',action:'panel:save',form:{program_id:d.p1,name:'Dee Lin',role:'QA'}});assert.equal(created.saves[0].data.member_id,undefined);assert.equal(created.saves[0].data.name,'Dee Lin');
 const dup=await render(d.rows,add.state,{kind:'submit',action:'panel:save',form:{program_id:d.p1,name:'ana ruiz'}});assert.equal(dup.saves.length,0);assert.match(dup.notice.message,/already on this program team/);
 // A team change leaves owner links behind; the Team screen offers to bring them up to date in one save.
 const rows=d.rows.map(r=>r.role==='programs.team'&&r.data.name==='Ben Ode'?{...r,data:{...r.data,member_id:'7d2e9a40-1b3c-4d5e-8f60-112233445566'}}:r);
 const drift=await render(rows,nav('team'));assert.match(text(drift.html),/Update owners and reminders/);
 const fix=await render(rows,drift.state,{kind:'click',action:'reminders',form:{}});assert.ok(fix.saves.length>=2);assert.ok(fix.saves.every((c:any)=>c.kind==='update_record'&&c.expectedVersion===1));
});

test('design check under current rules at 1440, 400 and 390 px',{skip:process.env.APP_DESIGN_CHECKS==='off'},async()=>{
 const {inspectAppDesign}=await import('../src/workspace/design-quality.js');const d=dataset();const frames:any[]=[];
 for(const st of [nav('overview'),nav('timeline'),nav('plan'),{screen:'plan',plan:{view:'board'}},nav('decisions'),nav('raid'),nav('updates'),nav('programs'),nav('team'),nav('cash'),nav('settings')]){const r=await render(d.rows,st);frames.push({name:JSON.stringify(st),html:r.html,css:kitCss()+r.output.css});}
 const p=await render(d.rows,nav('plan'),{kind:'click',action:`open:items:${d.gmp}`,form:{}});frames.push({name:'item panel',html:p.html,css:kitCss()+p.output.css});
 for(const [st,ev,o] of [[{screen:'decisions'},{kind:'click',action:`outcome:${d.gate}`,form:{}},{}],[{screen:'updates',up:{tab:'report'}},{kind:'open',action:''},{}],[{screen:'updates',up:{tab:'digests'}},{kind:'open',action:''},{}],[nav('timeline'),{kind:'open',action:''},{width:'phone'}],[nav('plan'),{kind:'open',action:''},{width:'phone',role:'viewer'}],[nav('overview'),{kind:'open',action:''},{width:'panel'}]] as any[]){const r=await render(d.rows,st,ev,o);frames.push({name:JSON.stringify(st)+(o.width??''),html:r.html,css:kitCss()+r.output.css});}
 for(const batch of [frames.slice(0,12),frames.slice(12)]){const result=await inspectAppDesign(batch,'current');assert.deepEqual(result.issues,[],JSON.stringify(result.issues,null,1));}
});
