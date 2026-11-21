import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {execute} from '../src/foundation/runtime.js';
import {appTemplates,appTemplateEntry} from '../src/workspace/app-templates.js';
import {effectiveSource,isV2Source} from '../src/workspace/browser-runtime.js';
import {readAppCommands} from '../src/workspace/app-commands.js';
import {kitCss} from '../src/shared/app-kit.js';
import {inspectAppDesign} from '../src/workspace/design-quality.js';

/* Partnerships 3.0.0 (7.3, 7.4): the v2 rebuild on the kit, rendered in production QuickJS with stub platform tools and the
 * fictional demo set (as of 14 Nov 2026). 2.2.1 stays as published (tests/partnerships.test.ts). */
const root='templates/source/partnership-tracker/';
const entry=await appTemplates.read({templateId:'life.partnership-tracker',version:'3.0.0'});
const v221=JSON.parse(await readFile('templates/apps/life.partnership-tracker-2.2.1.json','utf8'));
const schema=JSON.parse(await readFile(root+'schema.example.json','utf8')),demo=JSON.parse(await readFile(root+'demo_data.json','utf8'));
const roles=Object.keys(schema);
const fullMap=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:schema[r].readOnly?[]:Object.keys(schema[r].logicalFields)}]));
const fullBindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
type Row={id:string,version:number,role:string,data:any};
const fresh=():Row[]=>structuredClone(demo.records);
const SCREENS=['overview','pipeline','partners','conferences','activity','research','lists','settings'];
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ');
const id=(role:string,pred:(d:any)=>boolean)=>(demo.records as Row[]).find(r=>r.role===role&&pred(r.data))!.id;

async function render(rows:Row[],state:any,event:any,opts:any={}){
 const calls:string[]=[],saves:any[][]=[],config={...entry.defaults,tableMap:JSON.stringify(opts.map??fullMap),asOfOverride:demo.asOf};
 const source=effectiveSource(`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(opts.bindings??fullBindings)};\n${entry.source}`);
 const read=(v:any)=>{if(opts.pending)return {pending:true,rows:[],total:null};const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset,v.offset+v.limit).map(r=>({id:r.id,version:r.version,data:r.data})),total:all.length,limit:v.limit,offset:v.offset};};
 const output:any=await execute(source,{saved:opts.saved??true,writable:opts.writable??true,appRole:opts.role??'owner',context:opts.context??null,viewport:{width:opts.width??'wide',coarse:false},state,event:{value:null,form:{},...event}},async(name:string,v:any)=>{
  calls.push(name);
  if(name==='records.readMany')return opts.pending?{pending:true,results:v.reads.map(()=>({pending:true,rows:[],total:null}))}:{results:v.reads.map(read)};
  if(name==='records.read')return read(v);
  if(name==='records.summarize'){if(opts.pending)return {pending:true,totals:null,groups:[]};const g:any={};for(const r of rows.filter(x=>x.role===v.typeId)){const k=r.data[v.groupBy]??'';g[k]=(g[k]||0)+1;}return {groups:Object.entries(g).map(([label,count])=>({label,count}))};}
  if(name==='records.save'){saves.push(v.changes);for(const c of v.changes){if(c.kind==='create_record')rows.push({id:randomUUID(),version:0,role:c.typeId,data:c.data});else{const r=rows.find(x=>x.id===c.recordId)!;if(r.version!==c.expectedVersion)throw Error('stale_value');if(c.kind==='archive_record')rows.splice(rows.indexOf(r),1);else{r.data={...r.data,...c.data};r.version++;}}}return {status:'saving',count:v.changes.length};}
  if(name==='records.propose')throw Error('v2 apps never propose');
  if(name==='documents.list')return {documents:demo.documents};if(name==='integrations.list')return {integrations:[]};if(name==='roles.list')return {roles:[]};
  if(name==='undo.list')return {actions:[{undoId:'00000000-0000-4000-8000-00000000aaaa',label:'Stage change'}]};if(name==='undo.run')return {status:'undone'};
  throw Error('Unexpected capability '+name);
 });
 return {output,html:output.html as string,state:output.state,notice:output.notice,calls,saves};
}
const session=(rows:Row[],opts:any={})=>{let state:any=null;const s:any={
 async ev(event:any){const out=await render(rows,state,event,opts);state=out.state;s.last=out;return out;},
 click:(action:string)=>s.ev({kind:'click',action}),change:(action:string,value:any)=>s.ev({kind:'change',action,value}),submit:(action:string,form:any={})=>s.ev({kind:'submit',action,form}),open:()=>s.ev({kind:'open',action:''}),state:()=>state};return s;};

test('package: 3.0.0 draft on the v2 contract, same installer schema, helpers, automations and command names as 2.2.1; builder --check builds both',async()=>{
 const raw=JSON.parse(await readFile('templates/apps/life.partnership-tracker-3.0.0.json','utf8'));
 assert.ok(appTemplateEntry.safeParse(raw).success);assert.equal(raw.version,'3.0.0');assert.deepEqual(raw.upgradeFrom,['2.1.0','2.2.0','2.2.1']);
 assert.equal(raw.source.split('\n')[0],"'use trialagents v2';",'the marker is the first line of the body');assert.ok(isV2Source(`const templateConfiguration={};\nconst templateBindings=[];\n${raw.source}`));
 assert.ok(raw.source.length<200000,'source '+raw.source.length);assert.ok(raw.source.length<v221.source.length-35000,'far smaller than 2.2.1 ('+raw.source.length+' vs '+v221.source.length+')');
 const body=raw.source.split('\n').slice(2).join('\n');assert.doesNotMatch(body,/records\.propose|<header|<h1|\(reviewed\)|Nothing changes until|prepared for (TrialAgents )?review|key \| Label|Member IDs \(/i);
 assert.doesNotMatch(raw.source,/position:\s*(fixed|sticky)/,'no fixed bars of its own');
 // Data carries across (7.1): the installer schema, recommended automations, options the installer writes, functions and command names/inputs are unchanged.
 assert.equal(await readFile(root+'schema.example.json','utf8'),await readFile(root+'archive/2.2.1/schema.example.json','utf8'));
 assert.deepEqual(raw.recommendedAutomations,v221.recommendedAutomations);assert.deepEqual(raw.functions??null,v221.functions??null);
 assert.ok(raw.options.tableMap&&raw.options.pageSize&&raw.options.readOnly&&raw.options.asOfOverride);for(const k of ['heading','layoutProfile','demoLabel'])assert.ok(!(k in raw.options),k+' served the old design');
 const a=readAppCommands(raw.source),b=readAppCommands(v221.source);assert.equal(a.length,50);assert.deepEqual(a.map(c=>[c.id,c.mode,c.input]),b.map(c=>[c.id,c.mode,c.input]));
 const installers=JSON.parse(await readFile('templates/catalog-installers.json','utf8'));
 assert.equal(installers['life.partnership-tracker@3.0.0'],root+'schema.example.json');assert.equal(installers['life.partnership-tracker@2.2.1'],root+'archive/2.2.1/schema.example.json');
 const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8'));assert.equal(seed['life.partnership-tracker'].version,'2.2.1','a draft until the owner approves it (O4)');
 assert.match(execFileSync('node',['scripts/build-partnerships-template.mjs','--check'],{encoding:'utf8'}),/2\.2\.1, 3\.0\.0 .*verified/);
 assert.match(raw.instructions,/save directly/);assert.doesNotMatch(raw.instructions+JSON.stringify(raw.documentation),/Settings: add the standard|member IDs, lost reasons|the layout gear/);
});

test('every screen renders on the kit at every width, with side navigation and no header, title or banner of its own',async()=>{
 const rows=fresh(),s=session(rows);
 for(const width of ['wide','panel','phone'])for(const sc of SCREENS){const out=await render(rows,{section:sc},{kind:'open',action:''},{width});
  assert.match(out.html,/class="k-app"/,sc);assert.match(out.html,/class="k-layout"/,sc);assert.match(out.html,new RegExp('data-action="nav:'+sc+'" aria-current="page"'),sc);
  assert.doesNotMatch(out.html,/<header|<h1|role="alert"|pt-banner|could not be shown|Partial data/,sc);assert.equal(out.notice,undefined,sc);assert.ok(!out.calls.includes('records.propose'));}
 // Each screen reads its tables in fixed batches; a screen change reads nothing the frame does not already hold.
 const o=await s.click('nav:overview');assert.deepEqual(o.calls,['records.readMany','records.summarize']);
 const p=await s.click('nav:pipeline');assert.equal(p.calls.filter((c:string)=>c==='records.readMany').length,2,'core and deals');
 const r=await s.click('nav:research');assert.ok(!r.calls.includes('records.read'));
 assert.match(text(o.html),/13 Open opportunities/);assert.match(text(p.html),/Maplecrest: NWB-101 regional licence/);
});

test('settings are for owners only; editors and viewers see no Settings screen',async()=>{
 const rows=fresh();
 const owner=await render(rows,{section:'settings'},{kind:'open',action:''},{role:'owner'});assert.match(owner.html,/data-action="settings:save"/);assert.match(owner.html,/data-action="nav:settings"/);
 for(const role of ['editor','viewer']){const out=await render(rows,{section:'settings'},{kind:'open',action:''},{role,writable:role==='editor'});
  assert.doesNotMatch(out.html,/nav:settings|settings:save/,role);assert.match(out.html,/data-action="nav:overview" aria-current="page"/,role);}
 const ed=await render(rows,{section:'settings'},{kind:'submit',action:'settings:save',form:{stalled_days:'30',page_size:'25'}},{role:'editor'});assert.equal(ed.saves.length,0);
 // The owner's Settings form saves only business choices, in one change of the settings row.
 const sv=await render(rows,{section:'settings'},{kind:'submit',action:'settings:save',form:{stalled_days:'30',pipeline_layout:'List',default_view:'All opportunities',page_size:'25',digest_text:''}});
 assert.equal(sv.saves.length,1);assert.equal(sv.saves[0][0].kind,'update_record');assert.equal(sv.saves[0][0].data.stalled_days,30);assert.equal(JSON.parse(sv.saves[0][0].data.preferences).pipeline_layout,'list');
 assert.equal(sv.notice.kind,'success');
 // Team names, lost reasons and stages are data lists on their own screen, without "key | Label" text areas or member IDs.
 const lists=await render(rows,{section:'lists'},{kind:'open',action:''});assert.doesNotMatch(lists.html,/<textarea|member/i);assert.match(lists.html,/data-action="lost:rename:0"/);assert.match(lists.html,/data-action="stage:hide:cda"/);
});

test('edits save at once with the version captured when editing started: inline cell, board drop and move menu, side panel, delete',async()=>{
 const rows=fresh(),s=session(rows),opp=rows.find(r=>r.role==='partnerships.opportunities'&&r.data.stage==='contacted')!;
 await s.click('nav:pipeline');await s.click('mode:list');
 assert.match(s.last.html,new RegExp('data-action="edit:'+opp.id+':next_step:'+opp.version+'"'));
 const e=await s.change('edit:'+opp.id+':next_step:'+opp.version,'Send the deck');assert.deepEqual(e.saves,[[{kind:'update_record',recordId:opp.id,expectedVersion:0,data:{next_step:'Send the deck'}}]]);assert.equal(e.notice.kind,'success');
 assert.match(e.html,/data-action="undo:last"/,'Undo is offered after a save');
 const u=await s.click('undo:last');assert.ok(u.calls.includes('undo.list')&&u.calls.includes('undo.run'));
 // Drag and drop: a drop on another column saves the stage and its history in one save.
 await s.click('mode:board');assert.match(s.last.html,/class="k-board"/);assert.match(s.last.html,new RegExp('data-drag="'+opp.id+'"'));
 const d=await s.change('move',opp.id+'>non_confidential');assert.equal(d.saves.length,1);assert.equal(d.saves[0][0].expectedVersion,1);assert.equal(d.saves[0][0].data.stage,'non_confidential');assert.equal(d.saves[0][1].typeId,'partnerships.stage_history');assert.equal(d.saves[0][1].data.from_stage,'contacted');
 // Lost needs a reason: the move menu opens a small panel first, and nothing saves until it is given.
 const m=await s.change('move-menu:'+opp.id,'lost');assert.equal(m.saves.length,0);assert.match(m.html,/k-panel/);assert.match(text(m.html),/Move to Lost/);
 const none=await s.submit('move-stage',{on:'2026-11-14'});assert.equal(none.saves.length,0);assert.equal(none.notice.kind,'error');assert.match(none.notice.message,/reason/);
 const lost=await s.submit('move-stage',{reason:'No budget',on:'2026-11-14'});assert.equal(lost.saves[0][0].data.lost_reason,'No budget');assert.equal(lost.saves[0][0].expectedVersion,2);
 // A panel keeps the version from when it opened, even when the record changed since.
 const other=rows.find(r=>r.role==='partnerships.opportunities'&&r.data.stage==='cda')!;await s.click('open:opp:'+other.id);other.version=7;
 await s.change('f:opp:to','term_sheet');const mv=await s.submit('move-stage',{to:'term_sheet',on:'2026-11-14',note:''});assert.equal(mv.saves[0][0].expectedVersion,0,'the version from when the panel opened, so the platform refuses a stale save');
 // Delete is an archive with the captured version.
 other.version=0;const p=await s.click('open:opp:'+other.id);assert.match(p.html,new RegExp('data-action="delete:opps:'+other.id+'"'));
 const del=await s.click('delete:opps:'+other.id);assert.deepEqual(del.saves,[[{kind:'archive_record',recordId:other.id,expectedVersion:0}]]);
 // Never a write while opening.
 const open=await s.open();assert.equal(open.saves.length,0);
});

test('forms in side panels: new opportunity, log activity with a stage move and follow-ups, conference meeting and outcome, accept a target',async()=>{
 const rows=fresh(),s=session(rows),org=id('organizations',d=>d.name==='Cedarline Pharma'),prog=id('programs',d=>d.code==='NWB-101');
 await s.click('nav:pipeline');const a=await s.click('add:opps:'+org);assert.match(a.html,/k-panel/);assert.doesNotMatch(a.html,/reviewed/i);
 const c=await s.submit('save-record',{name:'Cedarline: NWB-101 Japan',program_id:prog,direction:'out_license',owner:'Anna','tag_Channel':'Conference'});
 assert.equal(c.saves.length,1);const n=c.saves[0][0];assert.equal(n.kind,'create_record');assert.deepEqual([n.data.stage,n.data.organization_id,JSON.parse(n.data.tags).Channel[0]],['identified',org,'Conference']);
 const opp=rows.find(r=>r.data.name==='Cedarline: NWB-101 Japan')!;
 await s.click('panel:log:'+opp.id);const l=await s.submit('save-log',{kind:'meeting',occurred_on:'2026-11-14',organization_id:org,opportunity_id:opp.id,summary:'Liked the deck',to:'contacted',fu1_title:'Send CMC summary',fu1_owner:'Anna',fu1_due:'2026-11-18'});
 assert.equal(l.notice.kind,'success',l.notice.message);assert.deepEqual(l.saves[0].map((x:any)=>x.typeId??x.kind),['partnerships.activities','update_record','partnerships.stage_history','partnerships.follow_ups'].map(x=>x==='update_record'?x:x));
 assert.equal(l.saves[0][3].data.owner_member_id,'00000000-0000-4000-a000-000000000001','member IDs are kept from settings, never shown');
 const conf=id('partnerships.conferences',d=>d.name==='BIO-Europe 2026');await s.click('nav:conferences');await s.change('pick-conf',conf);assert.deepEqual(s.last.output.context,{me:null,conf},'the conference is the remembered working context');
 await s.click('panel:meeting');const mt=await s.submit('save-meeting',{organization_id:org,opportunity_id:opp.id,occurred_on:'2026-11-18',status:'confirmed'});assert.equal(mt.saves[0][0].data.conference_id,conf);
 const meet=rows.find(r=>r.role==='partnerships.activities'&&r.data.conference_id===conf&&r.data.organization_id===org)!;
 await s.click('panel:outcome:'+meet.id);const oc=await s.submit('save-outcome',{status:'held',outcome:'Wants data',fu_title:'Send data',fu_owner:'Marc',fu_due:'2026-11-25'});assert.equal(oc.saves[0][0].expectedVersion,meet.version-1);assert.equal(oc.saves[0].length,2);
 const sig=rows.find(r=>r.role==='partnerships.signals'&&r.data.kind==='target_suggestion'&&r.data.status==='new')!;await s.click('nav:research');await s.click('rsub:targets');
 await s.click('panel:accept:'+sig.id);const ac=await s.submit('accept-signal',{organization_id:org,program_id:prog,direction:'out_license',owner:'Sofia',priority:'medium'});assert.equal(ac.saves[0][0].data.source,'research');assert.equal(ac.saves[0][1].data.status,'accepted');
});

test('every empty screen offers its first action; pending reads show as loading, never as empty or zero',async()=>{
 const empty:Row[]=rows0();function rows0(){return [];}
 for(const sc of SCREENS.filter(x=>x!=='settings')){const out=await render(empty,{section:sc},{kind:'open',action:''});
  const blocks=out.html.match(/<div class="k-empty">[\s\S]*?<\/div>/g)??[];
  if(sc==='lists'){assert.match(out.html,/data-action="std-cats"/);continue;}
  assert.ok(blocks.length,sc+' has an empty state');assert.match(out.html,/<div class="k-empty">[\s\S]*?(data-action="[^"]+"|href="platform:automations")/,sc+' offers a first action');}
 for(const [sub,act] of [['followups','panel:fu'],['materials','panel:log']]){const out=await render(empty,{section:'activity',sub},{kind:'open',action:''});assert.match(out.html,new RegExp('k-empty[\\s\\S]*data-action="'+act+'"'),sub);}
 for(const rsub of ['signals','targets','assets','runs']){const out=await render(empty,{section:'research',rsub},{kind:'open',action:''});assert.match(out.html,/k-empty[\s\S]*(data-action|href="platform:automations")/,rsub);}
 for(const sc of SCREENS){const out=await render(fresh(),{section:sc},{kind:'open',action:''},{pending:true});assert.match(text(out.html),/Loading…/,sc);assert.doesNotMatch(out.html,/k-empty|k-stat/,sc+' never empty or zero while loading');}
 // A write while loading is refused rather than saved against incomplete data.
 const w=await render(fresh(),{section:'activity'},{kind:'click',action:'fu-done:'+id('partnerships.follow_ups',()=>true)},{pending:true});assert.equal(w.saves.length,0);assert.equal(w.notice.kind,'error');
});

test('messages are platform notices: errors and successes come back as notice, never as an app banner',async()=>{
 const rows=fresh(),s=session(rows);await s.click('nav:pipeline');await s.click('panel:saveview');
 const e=await s.submit('save-view',{name:'Mine'});assert.equal(e.notice.kind,'error');assert.match(e.notice.message,/You are/);assert.doesNotMatch(e.html,/role="alert"|role="status"[^>]*>[^<]*You are/);
 await s.change('me','Anna');await s.change('flt:direction','out_license');assert.deepEqual(s.last.output.context,{me:'Anna',conf:id('partnerships.conferences',d=>d.name==='BIO-Europe 2026')});
 await s.click('panel:saveview');const ok=await s.submit('save-view',{name:'Mine'});assert.equal(ok.notice.kind,'success');assert.equal(JSON.parse(ok.saves[0][0].data.filters).direction[0],'out_license');
 // Read-only: viewers see values, no inline inputs and no write buttons; a forced action is refused with a notice.
 const v=await render(rows,{section:'pipeline',mode:'list'},{kind:'open',action:''},{role:'viewer',writable:false});assert.doesNotMatch(v.html,/data-action="edit:|data-action="add:|data-drag=/);
 const f=await render(rows,{section:'activity'},{kind:'click',action:'fu-done:'+id('partnerships.follow_ups',()=>true)},{role:'viewer',writable:false});assert.equal(f.saves.length,0);assert.equal(f.notice.kind,'error');
});

test('app commands keep the 2.2.x names and inputs; reads write nothing, writes save directly in one records.save',async()=>{
 const rows=fresh(),run=async(cid:string,input:any={})=>{const r=await render(rows,null,{kind:'command',action:cid,value:JSON.stringify(input)});return {...r.state.command,saves:r.saves,calls:r.calls};};
 const sd=await run('schema.describe');assert.equal(sd.ok,true);assert.deepEqual(sd.result.screens.map((x:any)=>x.id),SCREENS);assert.equal(sd.saves.length,0);
 const ov=await run('overview.read');assert.equal(ov.result.funnel.open,13);assert.equal(ov.saves.length,0);
 const opp=id('partnerships.opportunities',d=>d.stage==='cda');
 const mv=await run('opportunity.move_stage',{opportunity_id:opp,to:'confidential_evaluation',note:'CDA signed'});assert.equal(mv.ok,true,mv.error);assert.equal(mv.saves.length,1);assert.equal(mv.saves[0].length,2);
 const log=await run('activity.log',{partner_id:id('organizations',d=>d.name==='Cedarline Pharma'),kind:'call',occurred_on:'2026-11-14',summary:'Call',follow_ups:[{title:'Book a call',due:'2026-11-20',owner:'Marc'}]});assert.equal(log.ok,true,log.error);assert.equal(log.saves[0].length,2);
 const bad=await run('opportunity.move_stage',{opportunity_id:opp,to:'lost'});assert.equal(bad.ok,false);assert.match(bad.error,/reason/);assert.equal(bad.saves.length,0);
 const st=await run('stages.save',{labels:{cda:'NDA'}});assert.equal(st.ok,true,st.error);assert.equal(JSON.parse(st.saves[0][0].data.stage_config).labels.cda,'NDA');
 const set=await run('settings.save',{team_members:{Anna:'00000000-0000-4000-a000-000000000009'}});assert.equal(set.ok,true,set.error);
 const lay=await run('layout.save',{hide:['pipeline:fit']});assert.equal(lay.ok,false);assert.match(lay.error,/app change/);
 const arc=await run('record.archive',{table:'contact',record_id:id('people',()=>true)});assert.equal(arc.saves[0][0].kind,'archive_record');
});

test('design check (current rules) at 1440, 400 and 390 on every screen and the main panels',async t=>{
 const rows=fresh(),frames:any[]=[];
 for(const sc of SCREENS){const out=await render(rows,{section:sc},{kind:'open',action:''});frames.push({name:sc,html:out.html,css:kitCss()+out.output.css});}
 const opp=id('partnerships.opportunities',d=>d.stage==='cda');for(const a of ['open:opp:'+opp,'panel:log:'+opp]){const out=await render(rows,{section:'pipeline'},{kind:'click',action:a});frames.push({name:a.split(':')[0]+'-'+a.split(':')[1],html:out.html,css:kitCss()+out.output.css});}
 let result;try{result=await inspectAppDesign(frames,'current');}catch(e){if((e as any).code==='design_check_unavailable'){t.skip('no browser for the design check here');return;}throw e;}
 assert.deepEqual(result.issues,[]);
});
