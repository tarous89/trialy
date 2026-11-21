import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execute} from '../src/foundation/runtime.js';
import {appTemplates} from '../src/workspace/app-templates.js';
import {isV2Source,effectiveSource,runtimeStyles} from '../src/workspace/browser-runtime.js';
import {inspectAppDesign} from '../src/workspace/design-quality.js';

/* 7.3, 7.4 (G2–G8, G11, P3–P5): Fundraise 3.0.0 on the v2 contract and the kit, prepared as the host prepares it (configuration,
 * bindings, then the published code with the kit in front), executed in production QuickJS with stub platform answers. */
const entry=await appTemplates.read({templateId:'life.investor-crm',version:'3.0.0'});
const previous=await appTemplates.read({templateId:'life.investor-crm',version:'2.0.1'});
const schema=JSON.parse(await readFile('templates/source/investor-crm/schema.example.json','utf8'));
const demo=JSON.parse(await readFile('templates/source/investor-crm/demo_data.json','utf8')).records;
const roles=Object.keys(schema);
const fullMap=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:Object.keys(schema[r].logicalFields)}]));
const fullBindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
const cfgFor=(map:any=fullMap,extra:any={})=>({...entry.defaults,tableMap:JSON.stringify(map),asOfOverride:'2026-11-11',...extra});
const prepared=(config:any=cfgFor(),b:any[]=fullBindings)=>`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(b)};\n${entry.source}`;
type Row={id:string,version:number,role:string,data:any};
const fresh=():Row[]=>structuredClone(demo);
const SCREENS=['overview','pipeline','investors','round','activity','engagement','settings'];
async function render(rows:Row[],state:any=null,event:any={kind:'open',action:'',value:null,form:{}},opts:any={}){
 const saves:any[]=[],calls:string[]=[];
 const page=(v:any)=>{if(opts.pending?.includes(v.typeId))return {pending:true,rows:[],total:null};const all=rows.filter(r=>r.role===v.typeId).map(r=>({id:r.id,version:r.version,data:r.data}));return {rows:all.slice(v.offset??0,(v.offset??0)+(v.limit??25)),total:all.length};};
 const output:any=await execute(effectiveSource(prepared(opts.config,opts.bindings)),{saved:opts.saved??true,writable:opts.writable??true,appRole:opts.appRole??'owner',context:opts.context??null,viewport:opts.viewport??{width:'wide',coarse:false},state,event},async(name,v:any)=>{
  calls.push(name);
  if(name==='records.readMany'){if(opts.pending==='all')return {pending:true,results:v.reads.map(()=>({pending:true,rows:[],total:null}))};return {results:v.reads.map(page)};}
  if(name==='records.read')return page(v);
  if(name==='records.save'){if(opts.failSave)throw Error('denied');saves.push(...v.changes);return {status:'saving',count:v.changes.length};}
  if(name==='integrations.list')return {integrations:opts.integrations??[]};
  if(name==='undo.list')return {actions:opts.undo??[]};
  if(name==='undo.run'){if(opts.undoFails)throw Error('This action can no longer be undone here');return {undone:true};}
  throw Error('Unexpected capability '+name);
 });
 return {output,saves,calls,html:output.html as string,state:output.state,notice:output.notice};
}
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ');
const withoutPanel=(html:string)=>html.replace(/<aside class="k-panel"[\s\S]*<\/aside>/,'');
const org=(rows:Row[],name:string)=>rows.find(r=>r.role==='organizations'&&r.data.name===name)!;
const seed=(rows:Row[])=>rows.find(r=>r.role==='fundraise.rounds'&&r.data.name==='Seed 2026')!;
const opp=(rows:Row[],name:string)=>rows.find(r=>r.role==='fundraise.opportunities'&&r.data.organization_id===org(rows,name).id&&r.data.round_id===seed(rows).id)!;
const nav=(id:string)=>({kind:'click',action:'nav:'+id,value:null,form:{}});

test('3.0.0: v2 marker, same tables, helpers, automations and contracts as 2.0.1, upgrade path and a draft',async()=>{
 assert.equal(entry.version,'3.0.0');assert.deepEqual((entry as any).upgradeFrom,['2.0.0','2.0.1']);
 assert.ok(isV2Source(prepared()),'the marker is within the first lines after the host configuration');
 assert.equal(entry.source!.split('\n')[0],"'use trialagents v2';");
 assert.ok(entry.source!.length<240000);assert.doesNotMatch(entry.source!,/records\.propose/);
 assert.deepEqual(entry.functions,previous.functions,'helpers are identical');
 assert.deepEqual((entry as any).recommendedAutomations,(previous as any).recommendedAutomations);
 const installers=JSON.parse(await readFile('templates/catalog-installers.json','utf8'));
 assert.equal(await readFile(installers['life.investor-crm@3.0.0'],'utf8'),await readFile(installers['life.investor-crm@2.0.1'],'utf8'),'byte-identical installer schema');
 assert.deepEqual(Object.keys(entry.options).sort(),['asOfOverride','pageSize','readOnly','tableMap']);
 for(const k of ['tableMap','pageSize','asOfOverride'])assert.deepEqual(entry.options[k],previous.options[k],k);
 const seedFile=JSON.parse(await readFile('templates/catalog-seed.json','utf8'));assert.equal(seedFile['life.investor-crm'].version,'2.0.1','3.0.0 waits for owner approval (O4)');
 assert.equal(runtimeStyles(entry.source!).kit,'trialagents.kit.1');
});

test('every screen renders on the kit with no own header, title, banner or footer; totals follow the 2.0.1 rules',async()=>{
 let state:any=null;
 for(const id of SCREENS){const r=await render(fresh(),state,nav(id));state=r.state;
  assert.equal(r.state.screen,id);assert.match(r.html,/^<div class="k-app">/);
  for(const bad of [/<header/,/<h1/,/fr-banner/,/role="alert"/,/<footer/,/position:\s*(fixed|sticky)/,/Prepared for|until you approve|reviewed\)/i,/As of \d/])assert.doesNotMatch(r.html,bad,id+' '+bad);
  assert.match(r.html,/aria-label="Fundraise screens"/,id);
 }
 const t=text((await render(fresh())).html);
 // By hand (Seed 2026, EUR): signed 3,000,000 + 2,000,000; verbal 6,000,000 + 2,500,000; soft 500,000 + 1,000,000; Redfern (rejected) excluded.
 assert.match(t,/Raised EUR 5,000,000 of EUR 15,000,000 \(33\.3%\)/);
 assert.match(t,/EUR 5\.0M Raised \(signed\) EUR 8\.5M Verbal, not raised EUR 1\.5M Soft, not raised 33\.3% Progress/);
 assert.match(t,/Lead: Northlake Bio Ventures · term sheet received/);
 assert.match(t,/1 amount in another currency excluded: Silverpine Angels \(USD 250,000, signed\)\. Totals use EUR only; amounts are never converted\./);
 assert.match(text((await render(fresh(),{screen:'round'})).html),/Raised \(signed\) EUR 5,000,000 · 33\.3% of target/);
});

test('inline edits save at once with the version shown; a bad value returns an error notice and saves nothing',async()=>{
 const rows=fresh(),o=opp(rows,'Fjordhaven Partners');o.version=4;
 const open=await render(rows,{screen:'overview',panel:{kind:'opp',id:o.id}});
 assert.match(open.html,new RegExp('data-action="edit:'+o.id+':next_step:4"'),'the panel edits values in place');
 const r=await render(rows,open.state,{kind:'change',action:'edit:'+o.id+':next_step:4',value:'Send the deck',form:{}});
 assert.deepEqual(r.saves,[{kind:'update_record',recordId:o.id,expectedVersion:4,data:{next_step:'Send the deck'}}]);
 assert.deepEqual(r.notice,{kind:'success',message:'Next step saved'});
 const bad=await render(rows,open.state,{kind:'change',action:'edit:'+o.id+':amount_indicated:4',value:'-5',form:{}});
 assert.deepEqual(bad.saves,[]);assert.equal(bad.notice.kind,'error');assert.match(bad.notice.message,/cannot be negative/);
 assert.doesNotMatch(bad.html,/fr-banner|role="alert"/,'the error is the platform notice, not a banner');
 // An activity dated after the opportunity's last activity moves last_activity_on forward in the same save.
 const act=rows.find(x=>x.role==='fundraise.activities'&&x.data.opportunity_id===o.id)!;
 const moved=await render(rows,{screen:'activity'},{kind:'change',action:'edit:'+act.id+':activity_on:'+act.version,value:'2026-11-10',form:{}});
 assert.deepEqual(moved.saves,[{kind:'update_record',recordId:act.id,expectedVersion:act.version,data:{activity_on:'2026-11-10'}},{kind:'update_record',recordId:o.id,expectedVersion:4,data:{last_activity_on:'2026-11-10'}}]);
});

test('the pipeline is a drag-and-drop board with a move menu; passing asks why first',async()=>{
 const rows=fresh(),o=opp(rows,'Fjordhaven Partners');o.version=2;
 const p=await render(rows,null,nav('pipeline'));
 assert.match(p.html,/class="k-board"/);assert.match(p.html,new RegExp('data-drag="'+o.id+'~2"'));assert.match(p.html,new RegExp('data-action="move-menu:'+o.id+'~2"'));assert.match(p.html,/data-drop-action="move"/);
 assert.doesNotMatch(p.html,/Redfern Capital/,'rejected investors never appear on the board');
 const drop=await render(rows,p.state,{kind:'change',action:'move',value:o.id+'~2>partner_meeting',form:{}});
 assert.deepEqual(drop.saves,[{kind:'update_record',recordId:o.id,expectedVersion:2,data:{stage:'partner_meeting'}}]);assert.equal(drop.notice.kind,'success');
 const menu=await render(rows,p.state,{kind:'change',action:'move-menu:'+o.id+'~2',value:'term_sheet',form:{}});
 assert.deepEqual(menu.saves,[{kind:'update_record',recordId:o.id,expectedVersion:2,data:{stage:'term_sheet'}}]);
 const pass=await render(rows,p.state,{kind:'change',action:'move',value:o.id+'~2>passed',form:{}});
 assert.deepEqual(pass.saves,[]);assert.equal(pass.state.panel.kind,'pass');assert.match(pass.html,/Why did Fjordhaven Partners pass\?/);
 const none=await render(rows,pass.state,{kind:'submit',action:'pass:submit',value:null,form:{pass_reason:'',pass_detail:''}});
 assert.deepEqual(none.saves,[]);assert.match(none.notice.message,/Choose why/);
 const done=await render(rows,pass.state,{kind:'submit',action:'pass:submit',value:null,form:{pass_reason:'valuation',pass_detail:'Too rich'}});
 assert.deepEqual(done.saves,[{kind:'update_record',recordId:o.id,expectedVersion:2,data:{stage:'passed',pass_reason:'valuation',pass_detail:'Too rich'}}]);assert.equal(done.state.panel,null);
 // Viewers see the same board without drag, menus or inline values.
 const v=await render(rows,null,nav('pipeline'),{appRole:'viewer',writable:false});
 assert.doesNotMatch(v.html,/data-drag|move-menu|data-action="edit:/);assert.match(text(v.html),/Fjordhaven Partners/);
});

test('one-click saves: create with a side panel, mark lead, accept, remove (archive) and settings',async()=>{
 const rows=fresh(),o=opp(rows,'Fjordhaven Partners'),north=opp(rows,'Northlake Bio Ventures'),rd=seed(rows);
 const open=await render(rows,{screen:'activity'},{kind:'click',action:'add:acts:'+o.id,value:null,form:{}});
 assert.equal(open.state.panel.kind,'create');assert.match(open.html,/<aside class="k-panel"/);assert.match(open.html,/data-action="create:acts"/);
 const sub=await render(rows,open.state,{kind:'submit',action:'create:acts',value:null,form:{opportunity_id:o.id,activity_on:'2026-11-10',kind:'call',summary:'Partner meeting booked',follow_up_due:'2026-11-18'}});
 assert.deepEqual(sub.saves,[{kind:'create_record',typeId:'fundraise.activities',data:{opportunity_id:o.id,activity_on:'2026-11-10',kind:'call',summary:'Partner meeting booked',follow_up_due:'2026-11-18',source:'manual'}},{kind:'update_record',recordId:o.id,expectedVersion:0,data:{last_activity_on:'2026-11-10'}}]);
 assert.equal(sub.state.panel,null);
 const missing=await render(rows,open.state,{kind:'submit',action:'create:acts',value:null,form:{opportunity_id:o.id,activity_on:'2026-11-10',kind:'call',summary:''}});
 assert.deepEqual(missing.saves,[]);assert.match(missing.notice.message,/Summary is required/);assert.equal(missing.state.panel.draft.kind,'call','the draft is kept');
 // Mark lead unmarks the previous lead and sets the round's lead in the same save.
 const harbour=opp(rows,'Harbourline Capital');
 const lead=await render(rows,{screen:'round'},{kind:'click',action:'lead:'+harbour.id+'~'+harbour.version,value:null,form:{}});
 assert.deepEqual(lead.saves,[{kind:'update_record',recordId:harbour.id,expectedVersion:harbour.version,data:{is_lead:true}},{kind:'update_record',recordId:north.id,expectedVersion:north.version,data:{is_lead:false}},{kind:'update_record',recordId:rd.id,expectedVersion:rd.version,data:{lead_org_id:harbour.data.organization_id}}]);
 const prof=rows.find(r=>r.role==='fundraise.investor_profiles'&&r.data.organization_id===org(rows,'Larchmont Bio Fund').id)!;
 const acc=await render(rows,{screen:'investors',invTab:'proposed'},{kind:'click',action:'decide:'+prof.id+'~'+prof.version+':accepted',value:null,form:{}});
 assert.deepEqual(acc.saves,[{kind:'update_record',recordId:prof.id,expectedVersion:prof.version,data:{profile_status:'accepted'}}]);
 const tr=rows.find(r=>r.role==='fundraise.tranches')!;
 const rm=await render(rows,{screen:'round'},{kind:'click',action:'archive:tranches:'+tr.id+'~'+tr.version,value:null,form:{}});
 assert.deepEqual(rm.saves,[{kind:'archive_record',recordId:tr.id,expectedVersion:tr.version}]);
 const set=rows.find(r=>r.role==='fundraise.settings')!;
 const s=await render(rows,{screen:'settings'},{kind:'submit',action:'settings:save:'+set.version,value:null,form:{default_currency:'EUR',stale_days:'21',stages:set.data.stages,pass_reasons:set.data.pass_reasons,modalities:set.data.modalities,therapeutic_areas:set.data.therapeutic_areas,dev_stages:set.data.dev_stages}});
 assert.deepEqual(s.saves,[{kind:'update_record',recordId:set.id,expectedVersion:set.version,data:{stale_days:21}}]);
 const badSet=await render(rows,{screen:'settings'},{kind:'submit',action:'settings:save:'+set.version,value:null,form:{stale_days:'500'}});
 assert.deepEqual(badSet.saves,[]);assert.equal(badSet.notice.kind,'error');
});

test('settings are for owners only; viewers and previews save nothing',async()=>{
 for(const appRole of ['editor','viewer']){
  const r=await render(fresh(),null,nav('settings'),{appRole,writable:appRole==='editor'});
  assert.notEqual(r.state.screen,'settings',appRole);assert.doesNotMatch(r.html,/data-action="nav:settings"/,appRole);assert.doesNotMatch(r.html,/settings:save/,appRole);
  const set=fresh().find(x=>x.role==='fundraise.settings')!;
  const s=await render(fresh(),{screen:'overview'},{kind:'submit',action:'settings:save:'+set.version,value:null,form:{stale_days:'21'}},{appRole,writable:appRole==='editor'});
  assert.deepEqual(s.saves,[],appRole);}
 const owner=await render(fresh(),null,nav('settings'));assert.match(owner.html,/data-action="settings:save:0"/);
 for(const opts of [{appRole:'viewer',writable:false},{saved:false}]){
  for(const id of SCREENS.slice(0,6)){const r=await render(fresh(),null,nav(id),opts);assert.doesNotMatch(r.html,/data-action="(edit:|add:|archive:|lead:|decide:)/,id);}}
});

test('every empty screen offers its first action; pending reads show loading, never zero',async()=>{
 const empty=[{id:'s',version:0,role:'fundraise.settings',data:{}}];
 const firsts:Record<string,RegExp>={overview:/add:rounds/,pipeline:/add:rounds/,investors:/add:orgs/,round:/add:rounds/,activity:/add:rounds/,engagement:/add:grants/};
 for(const [id,first] of Object.entries(firsts)){const r=await render(empty,null,nav(id));assert.match(r.html,/class="k-empty"/,id);assert.match(r.html,first,id);}
 const oneRound=[...empty,{id:'r1',version:0,role:'fundraise.rounds',data:{name:'Seed',round_type:'seed',currency:'EUR',status:'active'}}];
 assert.match((await render(oneRound,null,nav('pipeline'))).html,/class="k-empty"[\s\S]*add:opps/);
 assert.match((await render(oneRound,null,nav('round'))).html,/No tranches yet[\s\S]*add:tranches/);
 assert.match((await render(oneRound,null,nav('round'))).html,/No milestones yet[\s\S]*add:miles/);
 for(const id of SCREENS){const r=await render(fresh(),null,nav(id),{pending:'all'});
  assert.match(r.html,/Loading…/,id);assert.doesNotMatch(text(r.html),/EUR 0|No round yet|No investors yet|Raised/,id);}
 // A panel's own reads load separately: the screen stays while the panel loads.
 const rows=fresh(),o=opp(rows,'Fjordhaven Partners');
 const panel=await render(rows,{screen:'overview',panel:{kind:'opp',id:o.id}},{kind:'open',action:'',value:null,form:{}},{pending:['people']});
 assert.match(text(panel.html),/Raised EUR 5,000,000/);assert.match(panel.html,/<aside class="k-panel"[\s\S]*Loading…/);
});

test('reads: each screen reads only its tables in one batched call; undo is listed on open only and runs from a click',async()=>{
 const r=await render(fresh(),null,nav('settings'));assert.deepEqual(r.calls,['records.readMany']);
 const reads:any[]=[];const rows=fresh();
 await execute(effectiveSource(prepared()),{saved:true,writable:true,appRole:'owner',context:null,state:{screen:'investors'},event:{kind:'click',action:'nav:pipeline',value:null,form:{}}},async(name,v:any)=>{reads.push([name,v]);const all=rows.filter(x=>x.role===v.typeId);return name==='records.readMany'?{results:v.reads.map((x:any)=>({rows:rows.filter(y=>y.role===x.typeId),total:rows.filter(y=>y.role===x.typeId).length}))}:{rows:all,total:all.length};});
 assert.deepEqual(reads.map(x=>x[0]),['records.readMany'],'screen changes need no undo or integration request');
 assert.deepEqual(reads[0][1].reads.map((x:any)=>x.typeId),['fundraise.settings','fundraise.rounds','organizations','fundraise.investor_profiles','fundraise.opportunities','dataroom.access_grants','dataroom.engagement']);
 const opened=await render(fresh(),null,undefined,{undo:[{undoId:'u1',label:'Saved next step',at:'2026-11-11T10:00:00Z'}]});
 assert.ok(opened.calls.includes('undo.list'));assert.match(opened.html,/data-action="undo:u1"[^>]*>Undo saved next step/);
 const undone=await render(fresh(),opened.state,{kind:'click',action:'undo:u1',value:null,form:{}});
 assert.ok(undone.calls.includes('undo.run'));assert.deepEqual(undone.notice,{kind:'success',message:'Undone'});
 const refused=await render(fresh(),opened.state,{kind:'click',action:'undo:u1',value:null,form:{}},{undoFails:true});assert.equal(refused.notice.kind,'error');
 assert.ok(!(await render(fresh(),null,undefined,{appRole:'viewer',writable:false})).calls.includes('undo.list'));
});

test('the selected round is the working context, kept across screens and visits',async()=>{
 const rows=fresh(),other=rows.find(r=>r.role==='fundraise.rounds'&&r.id!==seed(rows).id)!;
 const r=await render(rows,{screen:'pipeline'},{kind:'change',action:'round',value:other.id,form:{}});
 assert.deepEqual(r.output.context,{round:other.id});
 const back=await render(rows,null,undefined,{context:{round:other.id}});assert.equal(back.state.round,other.id);
 assert.match(back.html,new RegExp('<option value="'+other.id+'" selected'));
});

test('works at phone, panel and wide widths: side navigation on wide, tabs otherwise',async()=>{
 assert.match((await render(fresh())).html,/class="k-layout"/);
 for(const width of ['phone','panel'])assert.doesNotMatch((await render(fresh(),null,undefined,{viewport:{width,coarse:true}})).html,/class="k-layout"/,width);
});

test('design check under current rules at 1440, 400 and 390 px',{skip:process.env.APP_DESIGN_CHECKS==='off'},async t=>{
 const css=runtimeStyles(entry.source!).base;const frames=[];let state:any=null;
 for(const id of SCREENS){const r=await render(fresh(),state,nav(id));state=r.state;frames.push({name:id,html:r.html,css:css+r.output.css});}
 const o=opp(fresh(),'Fjordhaven Partners');const p=await render(fresh(),{screen:'pipeline',panel:{kind:'opp',id:o.id}});frames.push({name:'details',html:p.html,css:css+p.output.css});
 const report=await inspectAppDesign(frames,'current');
 assert.equal(report.status,'passed',JSON.stringify(report.issues,null,1));
 for(const w of report.warnings)t.diagnostic(`warning ${w.screen} ${w.width} ${w.code} ${w.element}: ${w.message}`);
});
void randomUUID;void withoutPanel;
