import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {appTemplateEntry} from '../src/workspace/app-templates.js';
import {actionConfig} from '../src/app-services/schema.js';
import {monitoringConfig} from '../src/app-services/monitoring-schema.js';
import {schedule} from '../src/automations/schema.js';
import {nextCalendar} from '../src/automations/schedules.js';
import {entry,schema,demo,fullMap,cfgFor,fresh,render,approve,text,session,id,without,root,type Row} from './fixtures/partnerships.js';

/* PARTNERSHIPS.md §13: package checklist and app behaviour on the fictional demo set (production QuickJS, platform response shapes). */
const rowsOf=(role:string)=>(demo.records as Row[]).filter(r=>r.role===role);
const ORG=(name:string)=>id('organizations',d=>d.name===name),OPP=(name:string)=>id('partnerships.opportunities',d=>d.name===name);
const SCREENS=['overview','pipeline','partners','conferences','activity','research','settings'];

test('package: catalog entry, seven screens, limits, build --check, installer, draft status, retirement of 1.1.1',async()=>{
 assert.equal(entry.id,'life.partnership-tracker');assert.equal(entry.version,'2.0.0');assert.equal(entry.name,'Partnerships');
 assert.ok(appTemplateEntry.safeParse(JSON.parse(await readFile('templates/apps/life.partnership-tracker-2.0.0.json','utf8'))).success);
 const layout=JSON.parse(/^const templateLayoutSchema=(.+);$/m.exec(await readFile(root+'partnerships.source.js','utf8'))![1]);
 assert.deepEqual(layout.screens.map((s:any)=>s.id),SCREENS);
 assert.ok(entry.source!.length<=180000,'source '+entry.source!.length);assert.ok(Buffer.byteLength(JSON.stringify(entry))<=300000);
 assert.doesNotMatch(entry.source!,/const templateConfiguration|const templateBindings/,'the host prepends configuration and bindings');
 assert.match(execFileSync('node',['scripts/build-partnerships-template.mjs','--check'],{encoding:'utf8'}),/verified/);
 assert.match(execFileSync('node',['scripts/build-partnership-template.mjs','--check'],{encoding:'utf8'}),/1\.1\.1: catalog and preview verified/);
 const installers=JSON.parse(await readFile('templates/catalog-installers.json','utf8'));
 assert.equal(installers['life.partnership-tracker@2.0.0'],root+'schema.example.json');assert.equal(installers['life.partnership-tracker@1.1.1'],root+'archive/1.1.1/schema_mapping.example.json');
 const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8'));assert.equal(seed['life.partnership-tracker'].version,'1.1.1','2.0.0 stays a draft until the owner approves it');
 const ret=JSON.parse(await readFile('templates/catalog-retirements.json','utf8')).retirements.find((r:any)=>r.templateId==='life.partnership-tracker');
 assert.deepEqual([ret.version,ret.replacedBy],['1.1.1','life.partnership-tracker@2.0.0']);
 const m=JSON.parse(await readFile(root+'catalog.metadata.json','utf8'));assert.equal(m.documentation.tasks.mode,'optional');
 assert.match(m.whenNotToUse,/Fundraise[\s\S]*Contracts[\s\S]*email campaigns|outreach/);
});

test('roles as in §7: shared core roles, Contracts agreements read-only, dataroom.v1 integrations, partnerships.v1 tables',async()=>{
 const core=JSON.parse(await readFile('templates/core-contract/v1.json','utf8')).roles,reg=JSON.parse(await readFile('templates/contracts/outputs.json','utf8')).roles;
 for(const r of ['organizations','people','programs']){assert.equal(schema[r].contract,'core.v1');assert.ok(!schema[r].optional,r+' is a read/write shared role');
  for(const f of core[r].fields.filter((x:any)=>!x.owner)){const mine=schema[r].fields.find((x:any)=>x.key===f.key);assert.ok(mine,r+'.'+f.key);assert.equal(mine.kind,f.kind);assert.deepEqual(mine.options??null,f.options??null);}}
 assert.deepEqual([schema.agreements.contract,schema.agreements.optional,schema.agreements.readOnly],['core.v1',true,true]);
 assert.deepEqual(schema.agreements.fields.map((f:any)=>f.key),core.agreements.fields.filter((f:any)=>!f.owner).map((f:any)=>f.key),'core fields only');
 for(const r of ['dataroom.access_grants','dataroom.engagement']){assert.deepEqual([schema[r].contract,schema[r].optional,schema[r].integration],['dataroom.v1',true,true]);assert.equal(reg[r].writer,'life.data-room');
  for(const f of schema[r].fields){const c=reg[r].versions['dataroom.v1'].fields.find((x:any)=>x.key===f.key);assert.ok(c,r+'.'+f.key);assert.equal(f.kind,c.kind);assert.deepEqual(f.options??null,c.options??null);}}
 const own=Object.keys(schema).filter(r=>r.startsWith('partnerships.'));
 assert.deepEqual(own.sort(),['activities','asset_profiles','briefs','conferences','follow_ups','opportunities','settings','signals','stage_history','tag_categories','views'].map(x=>'partnerships.'+x).sort());
 for(const r of own)assert.equal(schema[r].contract,'partnerships.v1');
 const F=(r:string)=>Object.fromEntries(schema[r].fields.map((f:any)=>[f.key,f]));
 // §7 fields, kinds, required flags and options.
 const spec:Record<string,string>={'partnerships.settings':'digest_cadence:select*,digest_day:select,digest_time:text,digest_recipients:text,digest_text:text,research_enabled:boolean,stalled_days:number,lost_reasons:text',
  'partnerships.asset_profiles':'program_id:text*,directions:text,deal_types:text,territories:text,target_profile:text,materials:text,research_focus:text,research_exclusions:text,status:select*',
  'partnerships.opportunities':'name:text*,organization_id:text*,program_id:text*,direction:select*,stage:select*,stage_on:date,owner:text*,priority:select,fit:number,fit_rationale:text,source:select,contact_ids:text,next_step:text,next_date:date,lost_reason:text,cda_agreement_id:text,dataroom_room_id:text,term_sheet_agreement_id:text,agreement_id:text,tags:text,archived:boolean',
  'partnerships.stage_history':'opportunity_id:text*,from_stage:text,to_stage:text*,changed_on:date*,changed_by:text,note:text',
  'partnerships.activities':'opportunity_id:text,organization_id:text*,kind:select*,occurred_on:date*,person_ids:text,team:text,summary:text,materials:text,conference_id:text,logged_by:select,tags:text',
  'partnerships.follow_ups':'opportunity_id:text,activity_id:text,title:text*,owner:text*,due:date*,status:select*,done_on:date',
  'partnerships.conferences':'name:text*,starts_on:date*,ends_on:date,location:text,platform:select,deadlines:text,goals:text,team:text,status:select*,tag_value:text*',
  'partnerships.briefs':'opportunity_id:text,conference_id:text,meeting_on:date,content:text*,sources:text,written_by:select,written_on:date*',
  'partnerships.signals':'organization_id:text,opportunity_id:text,program_id:text,kind:select*,title:text*,why:text*,source_url:text*,published_on:date,found_on:date*,status:select*,dismiss_reason:text,run_id:text',
  'partnerships.tag_categories':'name:text*,values:text,multiple:boolean,standard:boolean,archived:boolean',
  'partnerships.views':'name:text*,filters:text*,layout:select*,shared:boolean,owner:text*'};
 for(const [r,s] of Object.entries(spec))for(const x of s.split(',')){const [k,kind]=x.split(':'),f=F(r)[k];assert.ok(f,r+'.'+k);assert.equal(f.kind,kind.replace('*',''),r+'.'+k);assert.equal(f.required,kind.endsWith('*'),r+'.'+k+' required');assert.equal(f.multiple,false);}
 assert.deepEqual(F('partnerships.opportunities').stage.options,['identified','contacted','non_confidential','cda','confidential_evaluation','term_sheet','exclusivity_diligence','signed','lost','on_hold']);
 assert.deepEqual(F('partnerships.opportunities').direction.options,['out_license','in_license','co_development','research_collaboration','academic','platform','other']);
 assert.deepEqual(F('partnerships.settings').digest_cadence.options,['daily','weekly','monthly']);assert.deepEqual(F('partnerships.settings').digest_day.options,['mon','tue','wed','thu','fri','sat','sun']);
 assert.deepEqual(F('partnerships.signals').kind.options,['deal','trial','pipeline','financing','people','news','target_suggestion']);
 for(const [r,d] of Object.entries(schema) as any)for(const f of d.fields)assert.match(f.key,/^[a-z][a-z0-9_]{0,63}$/,r+'.'+f.key);
});

test('fictional demo data as §13 lists: 3 assets, 12 partners, 20 contacts, 18 opportunities in all directions, a conference with briefs, signals',()=>{
 assert.equal(rowsOf('programs').length,3);assert.equal(rowsOf('organizations').length,12);assert.equal(rowsOf('people').length,20);
 const opps=rowsOf('partnerships.opportunities');assert.equal(opps.length,18);assert.deepEqual([...new Set(opps.map(o=>o.data.direction))].sort(),[...schema['partnerships.opportunities'].fields.find((f:any)=>f.key==='direction').options].sort());
 const conf=rowsOf('partnerships.conferences').find(c=>c.data.starts_on>demo.asOf)!;assert.ok(rowsOf('partnerships.briefs').filter(b=>b.data.conference_id===conf.id).length>=5);
 assert.ok(rowsOf('partnerships.signals').filter(s=>s.data.kind==='target_suggestion').length>=2&&rowsOf('partnerships.signals').filter(s=>s.data.kind!=='target_suggestion').length>=3);
 for(const r of demo.records as Row[])for(const v of Object.values(r.data))if(typeof v==='string'&&/@/.test(v)&&!/^\{|\[/.test(v))assert.match(v,/\.invalid$/,'fictional emails only');
 // Every opportunity's current stage is its last stage history entry.
 for(const o of opps){const h=rowsOf('partnerships.stage_history').filter(x=>x.data.opportunity_id===o.id).sort((a,b)=>a.data.changed_on.localeCompare(b.data.changed_on));assert.equal(h.at(-1)!.data.to_stage,o.data.stage,o.data.name);}
});

test('seven screens and their sub-views render on the demo set without errors or partial-data banners',async()=>{
 const rows=fresh();
 for(const section of SCREENS)for(const extra of [{},{mode:'list'},{mode:'funnel'},{sub:'followups'},{sub:'materials'},{sub:'week',me:'Anna'},{rsub:'targets'},{rsub:'assets'},{rsub:'runs'}]){
  const out=await render(rows,{section,...extra});const t=text(out.html);assert.doesNotMatch(t,/could not be shown|Partial data|undefined|NaN|Invalid Date/,section+' '+JSON.stringify(extra));
  assert.match(out.html,/data-action="tracker:layout"/);for(const s of SCREENS)assert.match(out.html,new RegExp('data-action="nav:'+s+'"'));}
 // The native layout profile reorders and hides screens and list columns.
 const cfg=cfgFor(fullMap,{layoutProfile:JSON.stringify({tabs:['pipeline','overview'],visible:{research:false,'pipeline.fit':false},cols:{pipeline:['partner','name']}})});
 const out=await render(rows,{section:'pipeline',mode:'list'},undefined,{config:cfg});
 assert.ok(out.html.indexOf('nav:pipeline')<out.html.indexOf('nav:overview'));assert.doesNotMatch(out.html,/nav:research/);
 const heads=[...out.html.matchAll(/<th scope="col"[^>]*>([^<]*)<\/th>/g)].map(m=>m[1]);assert.deepEqual(heads.slice(0,2),['Partner','Opportunity']);assert.ok(!heads.includes('Fit'));
});

test('funnel and win/loss match the stage history (independent fixture, §8)',async()=>{
 const P='p',O='o',rows:Row[]=[{id:P,version:0,role:'programs',data:{name:'Asset A',code:'A',stage:'preclinical'}},{id:O,version:0,role:'organizations',data:{name:'Org'}}];
 const opp=(k:string,stage:string,path:string[],extra:any={})=>{rows.push({id:k,version:0,role:'partnerships.opportunities',data:{name:k,organization_id:O,program_id:P,direction:'out_license',stage,owner:'Anna',stage_on:'2026-10-01',...extra}});path.forEach((s,i)=>rows.push({id:k+'h'+i,version:0,role:'partnerships.stage_history',data:{opportunity_id:k,from_stage:i?path[i-1]:null,to_stage:s,changed_on:'2026-09-0'+(i+1)}}));};
 opp('a','contacted',['identified','contacted']);opp('b','cda',['identified','contacted','non_confidential','cda']);opp('c','lost',['identified','contacted','non_confidential','lost'],{lost_reason:'No budget'});
 opp('d','signed',['identified','contacted','non_confidential','cda','confidential_evaluation','term_sheet','exclusivity_diligence','signed'],{source:'conference'});opp('e','identified',[]);opp('f','on_hold',['identified','cda','on_hold'],{lost_reason:'Partner reorganisation'});
 // reached: a=1, b=3, c=2, d=7, e=0, f=3 (skipped stages count up to the furthest one).
 const expect=[6,5,4,3,1,1,1,1];
 const out=await render(rows,{section:'pipeline',mode:'funnel'},undefined,{});const t=text(out.html);
 const stages=['Identified','Contacted','Non-confidential','CDA','Confidential evaluation','Term sheet','Exclusivity and diligence','Signed'];
 stages.forEach((s,i)=>assert.match(t,new RegExp(s+' '+expect[i]+(i&&expect[i-1]?' '+Math.round(expect[i]/expect[i-1]*100)+'%':'')+'(\\s|$)'),s));
 assert.match(t,/Signed 1 Lost 1 On hold 1 Win rate \(signed ÷ signed \+ lost\) 50%/);assert.match(t,/No budget 1/);assert.match(t,/Partner reorganisation 1/);
 const ov=text((await render(rows,{section:'overview'})).html);assert.match(ov,new RegExp('A '+expect.join(' ')+' 1'),'overview funnel by asset: stages then lost');
 // The demo overview matches an independent count from the demo stage history.
 const ST=['identified','contacted','non_confidential','cda','confidential_evaluation','term_sheet','exclusivity_diligence','signed'],H=rowsOf('partnerships.stage_history');
 for(const p of rowsOf('programs')){const os=rowsOf('partnerships.opportunities').filter(o=>o.data.program_id===p.id);const counts=ST.map((_,i)=>os.filter(o=>Math.max(ST.indexOf(o.data.stage),...H.filter(h=>h.data.opportunity_id===o.id).map(h=>ST.indexOf(h.data.to_stage)))>=i).length);
  assert.match(text((await render(fresh(),{section:'overview'})).html),new RegExp(p.data.code+' '+counts.join(' ')+' '+os.filter(o=>o.data.stage==='lost').length));}
});

test('stage moves write stage history in the same review; lost needs a reason; the version from opening is kept',async()=>{
 const rows=fresh(),s=session(rows),o=OPP('Ironvale: NWB-101 Japan rights');
 await s.click('open:opp:'+o);await s.change('f:opp:to','lost');assert.match(s.html,/name="reason"/);
 await s.submit('move-stage',{to:'lost',on:'2026-11-14'});assert.equal(s.changes.length,0);assert.match(s.state.notice,/reason/);
 await s.submit('move-stage',{to:'cda',on:'2026-11-14',note:'CDA requested'});
 const [u,h]=s.changes;assert.equal(u.kind,'update_record');assert.equal(u.recordId,o);assert.equal(u.expectedVersion,0);assert.deepEqual([u.data.stage,u.data.stage_on],['cda','2026-11-14']);
 assert.equal(h.kind,'create_record');assert.equal(h.typeId,'partnerships.stage_history');assert.deepEqual([h.data.opportunity_id,h.data.from_stage,h.data.to_stage,h.data.changed_on],[o,'non_confidential','cda','2026-11-14']);
 // A concurrent change after the panel opened: the old version is proposed and rejected; nothing is overwritten.
 const t=session(rows);await t.click('open:opp:'+o);await s.approve();assert.equal(rows.find(r=>r.id===o)!.data.stage,'cda');assert.equal(rows.find(r=>r.id===o)!.version,1);
 await t.submit('move-stage',{to:'term_sheet',on:'2026-11-14'});assert.equal(t.changes[0].expectedVersion,0,'the version from when the panel opened');assert.throws(()=>approve(rows,t.changes),/stale/);assert.equal(rows.find(r=>r.id===o)!.data.stage,'cda');
});

test('after-meeting log: one review with an activity, materials and versions, a stage change with history and two follow-ups',async()=>{
 const rows=fresh(),s=session(rows),o=OPP('Pinehollow: NWB-101 Korea licence'),org=ORG('Pinehollow Pharma'),uma=id('people',d=>d.name==='Uma Schema'),deck=demo.documents[0];
 await s.click('panel:log:'+o);assert.match(s.html,/Materials shared \(document and version\)/);
 await s.change('f:log:to','non_confidential');
 await s.submit('save-log',{kind:'meeting',occurred_on:'2026-11-14',organization_id:org,opportunity_id:o,team:'Marc',summary:'Walked through the deck; interest in Korea rights.',['p_'+uma]:'on',['doc_'+deck.versionId]:'on',to:'non_confidential',fu1_title:'Send CMC summary',fu1_owner:'Anna',fu1_due:'2026-11-17',fu2_title:'Book follow-up call',fu2_owner:'Marc',fu2_due:'2026-11-21'});
 const ch=s.changes;assert.equal(ch.length,5,s.state.notice);
 const act=ch.find((c:any)=>c.typeId==='partnerships.activities');assert.equal(act.data.person_ids,uma);assert.equal(act.data.logged_by,'user');
 assert.deepEqual(JSON.parse(act.data.materials),[{document_id:deck.documentId,version_id:deck.versionId,title:'NWB-101 non-confidential deck',version:3}]);
 assert.equal(ch.find((c:any)=>c.kind==='update_record').data.stage,'non_confidential');assert.equal(ch.find((c:any)=>c.typeId==='partnerships.stage_history').data.to_stage,'non_confidential');
 assert.deepEqual(ch.filter((c:any)=>c.typeId==='partnerships.follow_ups').map((c:any)=>[c.data.owner,c.data.due,c.data.status]),[['Anna','2026-11-17','open'],['Marc','2026-11-21','open']]);
 await s.approve();const mats=text((await s.ev({kind:'click',action:'sub:materials'})).html);
});

test('"Have we spoken to them?": history checks on new opportunities, contacts, target acceptance and conference meetings',async()=>{
 const rows=fresh(),s=session(rows),glen=ORG('Glenmoor Biologics');
 await s.click('add:opps:'+glen);assert.match(text(s.html),/Earlier decline: Glenmoor Biologics — Glenmoor: NWB-202 licence \(2025\) \(Lost: No strategic fit/);
 await s.click('close');await s.click('add:people:'+glen);assert.match(text(s.html),/Earlier decline/);
 await s.click('close');await s.click('open:org:'+glen);assert.match(text(s.html),/Declined or paused before: Glenmoor: NWB-202 licence \(2025\) — No strategic fit/);
 const sug=id('partnerships.signals',d=>d.title==='Glenmoor Biologics');await s.click('close');await s.click('panel:accept:'+sug);assert.match(text(s.html),/Earlier decline: Glenmoor Biologics/);
 await s.click('close');const c=await s.open({section:'conferences'});assert.match(text(c.html),/Glenmoor Biologics Declined before: No strategic fit/);
 // A fresh partner has no history.
 await s.click('add:opps:'+ORG('Quillmont Bio'));assert.match(text(s.html),/We have spoken to them|No earlier/);
});

test('acceptance 1: conference prep and after — tag view, who to meet, briefs, outcome with next step and follow-up',async()=>{
 const rows=fresh(),s=session(rows);await s.open({section:'conferences'});const t=text(s.html);
 assert.match(t,/BIO-Europe 2026/);assert.match(t,/Meetings and requests \(8\)/);assert.match(t,/Briefs ready 6 \/ 7/);assert.match(t,/Who to meet/);assert.match(t,/Meeting schedule final/);
 await s.click('conf-view');assert.equal(s.state.section,'pipeline');assert.deepEqual(s.state.flt.tags,{Conference:['BIO-Europe 2026']});
 const tagged=rowsOf('partnerships.opportunities').filter(o=>JSON.parse(o.data.tags).Conference?.includes('BIO-Europe 2026'));
 for(const o of tagged)assert.match(text(s.html),new RegExp(o.data.name.replace(/[()]/g,'.')));assert.doesNotMatch(text(s.html),/Fernbrook: NWB-202 licence/);
 // Save the conference view as a shared view (who saves it: Anna).
 await s.change('me','Anna');await s.click('panel:saveview');await s.submit('save-view',{name:'BIO-Europe 2026 prep',shared:'on'});assert.deepEqual(JSON.parse(s.changes[0].data.filters).tags,{Conference:['BIO-Europe 2026']});await s.approve();
 // After the event: the outcome, next step and a follow-up from one meeting, in one review.
 const m=id('partnerships.activities',d=>d.kind==='conference_meeting'&&d.status==='confirmed'&&d.opportunity_id===OPP('Ironvale: NWB-101 Japan rights'));
 const after=session(rows);await after.open({section:'conferences'});await after.click('panel:outcome:'+m);await after.submit('save-outcome',{status:'held',outcome:'Wants CMC package after CDA',next_step:'Send CDA',next_date:'2026-11-24',fu_title:'Send CDA to Ironvale',fu_owner:'Marc',fu_due:'2026-11-21'});
 assert.deepEqual(after.changes.map((c:any)=>c.typeId??'update'),['update','update','partnerships.follow_ups']);assert.equal(after.changes[2].data.activity_id,m);
 await after.approve();const late=await render(rows,{section:'conferences'},undefined,{config:cfgFor(fullMap,{asOfOverride:'2026-11-25'})});
 assert.match(text(late.html),/After the event[\s\S]*Ironvale Pharma Wants CMC package after CDA Send CDA · 24 Nov Send CDA to Ironvale \(Marc\)/);
});

test('acceptance 5: custom category Region; a shared view (Region + stage) is visible to the team, a private one only to its owner',async()=>{
 const rows=fresh().filter(r=>r.role!=='partnerships.views'&&!(r.role==='partnerships.tag_categories'&&r.data.name==='Region')).map(r=>{if(r.role!=='partnerships.opportunities')return r;const t=JSON.parse(r.data.tags);delete t.Region;return {...r,data:{...r.data,tags:JSON.stringify(t)}};}),s=session(rows);
 await s.open({section:'settings'});assert.match(text(s.html),/Conference Standard[\s\S]*Channel Standard[\s\S]*Asset group Standard/);
 await s.submit('add-cat',{name:'Region',values:'Europe\nNorth America\nAsia-Pacific',multiple:''});assert.equal(JSON.parse(s.changes[0].data.values).length,3);await s.approve();
 // Tag two opportunities with Region values (reviewed).
 for(const [name,region] of [['Ironvale: NWB-101 Japan rights','Asia-Pacific'],['Pinehollow: NWB-101 Korea licence','Asia-Pacific']]){await s.click('open:opp:'+OPP(name));await s.submit('save-tags',{['tag_Region']:region,['tag_Channel']:'Conference','tag_Conference__BIO-Europe 2026':'on','tag_Asset group':'Fibrosis'});await s.approve();}
 await s.open({section:'pipeline',panel:null});await s.change('me','Anna');await s.change('flt:tag:Region','Asia-Pacific');await s.change('flt:stage','contacted');assert.match(text(s.html),/Pinehollow: NWB-101 Korea licence/);assert.doesNotMatch(text(s.html),/Ironvale: NWB-101 Japan rights/);
 await s.click('panel:saveview');await s.submit('save-view',{name:'APAC contacted',shared:'on'});await s.approve();
 await s.change('flt:stage','');await s.click('panel:saveview');await s.submit('save-view',{name:'Anna APAC (private)'});await s.approve();
 const ben=session(rows);await ben.open({section:'pipeline'});await ben.change('me','Marc');const opts=[...ben.html.matchAll(/<option value="[^"]+"[^>]*>([^<]*· (?:shared|private))<\/option>/g)].map(m=>m[1]);
 assert.deepEqual(opts,['APAC contacted · shared']);
 const view=rows.find(r=>r.role==='partnerships.views'&&r.data.name==='APAC contacted')!;await ben.change('pick-view',view.id);assert.deepEqual(ben.state.flt,{stage:['contacted'],program:[],direction:[],owner:[],tags:{Region:['Asia-Pacific']}});
 assert.match(text(ben.html),/Pinehollow: NWB-101 Korea licence/);assert.doesNotMatch(text(ben.html),/Ironvale: NWB-101 Japan rights/);
 const priv=rows.find(r=>r.role==='partnerships.views'&&r.data.name==='Anna APAC (private)')!;await ben.change('pick-view',priv.id);assert.equal(ben.state.viewId,'','Marc cannot open Anna\'s private view');
 const anna=session(rows);await anna.open({section:'pipeline'});await anna.change('me','Anna');assert.match(anna.html,/Anna APAC \(private\) · private/);
 // Only the owner can change or remove a view.
 await ben.change('pick-view',view.id);await ben.click('archive-view');assert.equal(ben.changes.length,0);assert.match(ben.state.notice,/Only Anna/);
});

test('acceptance 3: CDA from Contracts and a Data Room room show status and engagement; without either, fields stay manual and nothing breaks',async()=>{
 const rows=fresh(),s=session(rows),o=OPP('Cedarline: NWB-101 licence');await s.click('open:opp:'+o);const t=text(s.html);
 assert.match(t,/CDA CDA: Cedarline Pharma \(mutual\) Signed, active/);assert.match(t,/Data room NWB-101 licensing room Active Invited/);assert.match(t,/Engagement: 11 views, about 39 min, last 12 Nov 2026\. Most viewed: Key data package \(6\)/);
 // Link a term sheet from Contracts (reviewed); the app never writes the agreements table.
 const ts=id('agreements',d=>d.name.startsWith('Term sheet'));const s2=session(rows);await s2.click('open:opp:'+OPP('Fernbrook: NWB-202 licence'));assert.match(text(s2.html),/Term sheet Term sheet: Fernbrook Therapeutics NWB-202 licence In negotiation/);
 await s2.submit('save-gates',{cda_agreement_id:'',term_sheet_agreement_id:ts,agreement_id:'',dataroom_room_id:''});assert.ok(s2.changes.every((c:any)=>c.kind==='update_record'&&c.recordId===OPP('Fernbrook: NWB-202 licence')));
 // Installed without Contracts and Data Room: no agreements binding, own manual data room table empty.
 const map=without('agreements','dataroom.access_grants','dataroom.engagement'),cfg=cfgFor(map),b=Object.keys(map).map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
 const alone=fresh().filter(r=>!['agreements','dataroom.access_grants','dataroom.engagement'].includes(r.role));
 for(const section of SCREENS){const out=await render(alone,{section},undefined,{config:cfg,bindings:b});assert.doesNotMatch(text(out.html),/could not be shown|Partial data/,section);}
 const m=session(alone,{config:cfg,bindings:b});await m.click('open:opp:'+o);const mt=text(m.html);assert.match(mt,/CDA \(manual reference\)/);assert.match(mt,/Contracts is not connected/);assert.match(mt,/CDA 0{8}-\S+ Manual reference/);
 await m.submit('save-gates',{cda_agreement_id:'CDA signed 20 Sep, on file',dataroom_room_id:'Shared room at partner'});assert.deepEqual(m.changes[0].data,{cda_agreement_id:'CDA signed 20 Sep, on file',dataroom_room_id:'Shared room at partner'});
 await m.approve();await m.click('open:opp:'+o);assert.match(text(m.html),/CDA CDA signed 20 Sep, on file Manual reference/);
 // Data Room present but not linked: a manual access entry goes to the app's own table; once linked the role is read-only.
 const own=session(fresh());await own.click('open:opp:'+OPP('Maplecrest: NWB-101 regional licence'));await own.submit('add-grant',{room_name:'Maplecrest evaluation room',status:'invited',granted_on:'2026-11-14'});assert.equal(own.changes[0].typeId,'dataroom.access_grants');assert.equal(own.changes[0].data.source,'manual');
 const lmap=structuredClone(fullMap);lmap['dataroom.access_grants'].writableFields=[];const linked=session(fresh(),{config:cfgFor(lmap),integrations:[{role:'dataroom.access_grants',source:'linked',offer:null}]});await linked.click('open:opp:'+OPP('Maplecrest: NWB-101 regional licence'));assert.doesNotMatch(linked.html,/Record data room access by hand/);
 const offer=await render(fresh(),{section:'overview'},undefined,{integrations:[{role:'dataroom.access_grants',source:'own',offer:'connect'}]});assert.match(offer.html,/data-trialy-integration="connect dataroom.access_grants"/);
});

test('acceptance 4 (app side): target suggestions accepted into an opportunity, dismissed with a reason; digest in the §6 format',async()=>{
 const rows=fresh(),s=session(rows),sug=id('partnerships.signals',d=>d.title==='Quillmont Bio');
 await s.open({section:'research',rsub:'targets'});assert.match(text(s.html),/Quillmont Bio[\s\S]*Rivermint Oncology/);
 await s.click('panel:accept:'+sug);await s.submit('accept-signal',{organization_id:ORG('Quillmont Bio'),program_id:id('programs',d=>d.code==='NWB-101'),direction:'co_development',owner:'Anna',priority:'medium',fit:'4'});
 const [opp,sig]=s.changes;assert.equal(opp.kind,'create_record');assert.deepEqual([opp.data.stage,opp.data.source,opp.data.stage_on],['identified','research','2026-11-14']);assert.equal(sig.recordId,sug);assert.equal(sig.data.status,'accepted');await s.approve();
 const new_=rows.find(r=>r.role==='partnerships.opportunities'&&r.data.name==='Quillmont Bio: NWB-101')!;assert.ok(new_);
 const rv=id('partnerships.signals',d=>d.title==='Rivermint Oncology (fictional)');await s.click('panel:accept:'+rv);assert.match(text(s.html),/is not a partner yet/);await s.click('add-suggested-org');assert.equal(s.changes[0].data.name,'Rivermint Oncology (fictional)');
 const d=id('partnerships.signals',x=>x.kind==='financing');await s.click('panel:dismiss:'+d);await s.submit('dismiss-signal',{reason:''});assert.equal(s.changes.length,0);await s.submit('dismiss-signal',{reason:'Already known'});assert.deepEqual(s.changes[0].data,{status:'dismissed',dismiss_reason:'Already known'});
 // Digest preview: subject, sections in order, max 3 items, about 150 words, no deal terms.
 const st=await render(fresh(),{section:'settings'});const subj=/id="pt-digest-subject">([^<]*)</.exec(st.html)![1],body=/id="pt-digest">([\s\S]*?)<\/pre>/.exec(st.html)![1].replace(/&#39;/g,"'").replace(/&amp;/g,'&');
 assert.equal(subj,'Partnerships · week of 16 Nov: 3 moved · 5 due · 4 new signals');
 const lines=body.split('\n').filter(Boolean);assert.deepEqual(lines.map(l=>l.split(':')[0]),['Moved','Due this week','Stalled','Coming up','New about your targets','Suggested targets','Open Partnerships →']);
 assert.ok((subj+' '+body).split(/\s+/).filter(w=>/[A-Za-z0-9]/.test(w)).length<=165);for(const l of lines.slice(0,-1))assert.ok(l.split(' · ').filter(x=>!/^\d+ more/.test(x)).length<=3||l.startsWith('Due'),l);
 assert.match(body,/Stalled: Oakvane Therapeutics, no activity 23 days \(Confidential evaluation\)/);assert.match(body,/Coming up: BIO-Europe 2026, 17 Nov–19 Nov: 8 meetings, 6 briefs ready/);
 const secret=[...rowsOf('partnerships.opportunities').map(o=>o.data.fit_rationale),...rowsOf('partnerships.briefs').map(b=>b.data.content.slice(0,30)),...rowsOf('agreements').map(a=>a.data.name),...rowsOf('partnerships.activities').map(a=>a.data.summary).filter(Boolean)];
 for(const x of secret)assert.ok(!body.includes(x),'no deal terms or notes in the digest: '+x);
 // Empty sections are left out; with nothing at all one line says so.
 const quiet=fresh().filter(r=>!['partnerships.signals','partnerships.follow_ups','partnerships.stage_history','partnerships.conferences','partnerships.activities'].includes(r.role)).map(r=>r.role==='partnerships.opportunities'?{...r,data:{...r.data,stage_on:'2026-11-13'}}:r);
 const q=/id="pt-digest">([\s\S]*?)<\/pre>/.exec((await render(quiet,{section:'settings'})).html)![1];assert.equal(q,'Nothing moved, nothing is due and there are no new signals this week.\n\nOpen Partnerships →');
});

test('acceptance 4 (schedule): weekly Monday 07:00 by default; switching to daily or monthly changes the schedule',async()=>{
 const sched=async(rows:Row[],st:any={})=>JSON.parse(/id="pt-schedule">([^<]*)</.exec((await render(rows,{section:'settings',...st})).html)![1].replace(/&quot;/g,'"'));
 const empty=fresh().filter(r=>r.role!=='partnerships.settings');const w=schedule.parse(await sched(empty)) as any;
 assert.deepEqual([w.frequency,w.weekdays,w.time,w.timeZone],['weekly',[1],'07:00','Europe/Berlin']);assert.equal(nextCalendar(w,new Date('2026-11-14T12:00:00Z')).toISOString(),'2026-11-16T06:00:00.000Z');
 const rows=fresh(),s=session(rows);await s.open({section:'settings'});await s.change('f:settings:digest_cadence','daily');assert.equal((await sched(rows,s.state)).frequency,'daily');
 await s.submit('save-settings',{digest_cadence:'daily',digest_time:'07:00',time_zone:'Europe/Berlin',stalled_days:'21',research_enabled:'on',digest_recipients:'Anna, Marc',team:'Anna, Marc, Sofia'});assert.equal(s.changes[0].data.digest_cadence,'daily');await s.approve();
 const d=schedule.parse(await sched(rows)) as any;assert.equal(d.frequency,'daily');assert.equal(nextCalendar(d,new Date('2026-11-14T12:00:00Z')).toISOString(),'2026-11-15T06:00:00.000Z');
 assert.match(text((await render(rows,{section:'settings'})).html),/Partnerships · 14 Nov:/);
 await s.submit('save-settings',{digest_cadence:'monthly',digest_time:'06:30',time_zone:'Europe/Berlin',stalled_days:'21',research_enabled:'on'});await s.approve();
 const m=schedule.parse(await sched(rows)) as any;assert.deepEqual([m.frequency,m.monthDay,m.time],['monthly',1,'06:30']);assert.equal(nextCalendar(m,new Date('2026-11-14T12:00:00Z')).toISOString(),'2026-12-01T05:30:00.000Z');
 await s.submit('save-settings',{digest_cadence:'weekly',digest_day:'mon',digest_time:'25:00'});assert.equal(s.changes.length,0);assert.match(s.state.notice,/HH:MM/);
});

test('automation recipes validate: research and briefs on the user\'s runner, digest on research completion, reminders on follow-up dates',async()=>{
 const X=JSON.parse(await readFile(root+'automation.examples.json','utf8')),sub=(v:any):any=>typeof v==='string'?(/^REPLACE_MEMBER_EMAIL$/.test(v)?'member@example.invalid':/^REPLACE_/.test(v)?randomUUID():v):Array.isArray(v)?v.map(sub):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,sub(x)])):v;
 const fixIds=(c:any)=>{const t=c.trigger;if(t?.typeId&&c.recordTypeId)c.recordTypeId=t.typeId;return c;};
 const research=monitoringConfig.parse(sub(X.research));assert.equal((research.automation!.trigger as any).frequency,'weekly');assert.deepEqual((research.automation!.trigger as any).weekdays,[1]);assert.equal(research.writeScopes.length,1);
 monitoringConfig.parse(sub(X.briefs));
 const digest=actionConfig.parse(fixIds(sub(X.digest)));assert.equal((digest.trigger as any).source,'automation_runs');assert.equal(digest.steps.length,1);assert.match((digest.steps[0] as any).text,/\{\{run\.summary\}\}/);
 for(const k of ['reminderDue','reminderOverdue']){const a=actionConfig.parse(fixIds(sub(X[k])));assert.equal(a.trigger.kind,'record_date');assert.deepEqual(a.conditions,[{field:'status',operator:'equals',value:'open'}]);}
 // Recipients are members only (placeholders) and no recipe writes to anyone outside the workspace.
 assert.doesNotMatch(JSON.stringify(X),/@(?!example)/);
 const m=JSON.parse(await readFile(root+'catalog.metadata.json','utf8'));assert.match(m.documentation.tasks.whenUseful,/weekly Monday 07:00/);assert.match(m.documentation.tasks.whenUseful,/at most 3 items per section[\s\S]*150 words[\s\S]*empty sections left out[\s\S]*no deal terms/);
});

test('acceptance 7 and 8: no screen or action sends email or contacts partners; every write is a reviewed proposal',async()=>{
 const rows=fresh(),seen=new Set<string>();
 const all=async(st:any,ev?:any)=>{const out=await render(rows,st,ev);out.calls.forEach(c=>seen.add(c));assert.doesNotMatch(out.html,/mailto:|exchange\.|sendEmail/);return out;};
 for(const section of SCREENS)await all({section});
 for(const r of rowsOf('partnerships.opportunities').slice(0,6))await all({},{kind:'click',action:'open:opp:'+r.id});
 for(const r of rowsOf('organizations').slice(0,4))await all({},{kind:'click',action:'open:org:'+r.id});
 for(const a of ['panel:log','panel:fu','panel:meeting','add:opps','add:people','add:confs'])await all({section:'conferences'},{kind:'click',action:a});
 assert.deepEqual([...seen].sort(),['documents.list','integrations.list','records.read'].sort());
 // Writes come only from records.propose; a read-only copy or an unsaved preview proposes nothing.
 const o=OPP('Ironvale: NWB-101 Japan rights');
 const ro=await render(rows,{panel:{type:'opp',id:o,version:0}},{kind:'submit',action:'move-stage',form:{to:'cda'}},{writable:false});assert.equal(ro.changes.length,0);assert.match(ro.state.notice,/cannot/);
 const pv=await render(rows,{panel:{type:'opp',id:o,version:0}},{kind:'submit',action:'move-stage',form:{to:'cda'}},{saved:false});assert.equal(pv.changes.length,0);
 const ok=await render(rows,{panel:{type:'opp',id:o,version:0}},{kind:'submit',action:'move-stage',form:{to:'cda'}});assert.ok(ok.calls.includes('records.propose'));assert.match(ok.state.notice,/Prepared for TrialAgents review|prepared for review/);
});

test('incomplete reads disable changes and complete totals; drafts survive a failed proposal',async()=>{
 const rows=fresh();
 for(const read of [(v:any,rs:Row[])=>v.typeId==='partnerships.stage_history'?{unavailable:true}:{rows:rs.filter(r=>r.role===v.typeId).slice(v.offset,v.offset+v.limit),total:rs.filter(r=>r.role===v.typeId).length},
  (v:any,rs:Row[])=>{const all=rs.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset,v.offset+1),total:all.length};},
  (v:any,rs:Row[])=>{const all=rs.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset,v.offset+v.limit),total:null};}]){
  const out=await render(rows,{section:'overview'},undefined,{read});assert.match(text(out.html),/Partial data/);
  const w=await render(rows,{panel:{type:'opp',id:OPP('Ironvale: NWB-101 Japan rights'),version:0}},{kind:'submit',action:'move-stage',form:{to:'cda'}},{read});assert.equal(w.changes.length,0);}
 const missing=structuredClone(fullMap);delete missing['partnerships.follow_ups'];assert.match(text((await render(rows,{section:'overview'},undefined,{config:cfgFor(missing)})).html),/Follow-up table is not connected/);
 const bad=fresh();bad.find(r=>r.role==='partnerships.opportunities')!.data.name=['array'];assert.match(text((await render(bad,{section:'pipeline'})).html),/could not be read/);
 const s=session(rows,{failPropose:true});await s.click('panel:log');await s.change('f:log:summary','Kept draft');await s.submit('save-log',{kind:'note',occurred_on:'2026-11-14',organization_id:ORG('Kestrelwood Bio'),summary:'Kept draft'});
 assert.match(s.state.notice,/denied|unavailable/i);assert.equal(s.state.f.log.summary,'Kept draft');assert.equal(s.state.panel.type,'log');
});
