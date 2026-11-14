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
import {readRecipes} from '../src/automations/recipes-schema.js';
import {entry,schema,demo,fullMap,fullBindings,cfgFor,fresh,render,approve,text,session,id,without,root,type Row} from './fixtures/partnerships.js';

/* PARTNERSHIPS.md §13: package checklist and app behaviour on the fictional demo set (production QuickJS, platform response shapes). */
const rowsOf=(role:string)=>(demo.records as Row[]).filter(r=>r.role===role);
const ORG=(name:string)=>id('organizations',d=>d.name===name),OPP=(name:string)=>id('partnerships.opportunities',d=>d.name===name);
const bool=(v:any)=>v===true||v==='true';
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
 assert.deepEqual(own.sort(),['activities','asset_profiles','briefs','conferences','follow_ups','opportunities','research_reports','settings','signals','stage_history','tag_categories','views'].map(x=>'partnerships.'+x).sort());
 for(const r of own)assert.equal(schema[r].contract,'partnerships.v1');
 const F=(r:string)=>Object.fromEntries(schema[r].fields.map((f:any)=>[f.key,f]));
 // §7 fields, kinds, required flags and options.
 const spec:Record<string,string>={'partnerships.settings':'digest_text:text,stalled_days:number,lost_reasons:text,team:text,team_members:text,custom_fields:text,option_lists:text,stage_config:text,preferences:text',
  'partnerships.asset_profiles':'program_id:text*,directions:text,deal_types:text,territories:text,target_profile:text,materials:text,research_focus:text,research_exclusions:text,status:select*',
  'partnerships.opportunities':'name:text*,organization_id:text*,program_id:text*,direction:select*,stage:select*,stage_on:date,owner:text*,priority:select,fit:number,fit_rationale:text,source:select,contact_ids:text,next_step:text,next_date:date,lost_reason:text,cda_agreement_id:text,dataroom_room_id:text,term_sheet_agreement_id:text,agreement_id:text,tags:text,archived:boolean',
  'partnerships.stage_history':'opportunity_id:text*,from_stage:text,to_stage:text*,changed_on:date*,changed_by:text,note:text',
  'partnerships.activities':'opportunity_id:text,organization_id:text*,kind:select*,occurred_on:date*,person_ids:text,team:text,summary:text,materials:text,conference_id:text,logged_by:select,tags:text',
  'partnerships.follow_ups':'opportunity_id:text,activity_id:text,title:text*,owner:text*,due:date*,status:select*,done_on:date,owner_member_id:text',
  'partnerships.conferences':'name:text*,starts_on:date*,ends_on:date,location:text,platform:select,deadlines:text,goals:text,team:text,status:select*,tag_value:text*',
  'partnerships.briefs':'opportunity_id:text,conference_id:text,meeting_on:date,content:text*,sources:text,written_by:select,written_on:date*,status:select',
  'partnerships.research_reports':'run_on:date*,run_id:text,cadence:select,period:text,summary:text*,new_signals:number,new_targets:number,sources:text,written_by:select',
  'partnerships.signals':'organization_id:text,opportunity_id:text,program_id:text,kind:select*,title:text*,why:text*,source_url:text*,published_on:date,found_on:date*,status:select*,dismiss_reason:text,run_id:text',
  'partnerships.tag_categories':'name:text*,values:text,multiple:boolean,standard:boolean,archived:boolean',
  'partnerships.views':'name:text*,filters:text*,layout:select*,columns:text,sort:text,shared:boolean,owner:text*'};
 for(const [r,s] of Object.entries(spec))for(const x of s.split(',')){const [k,kind]=x.split(':'),f=F(r)[k];assert.ok(f,r+'.'+k);assert.equal(f.kind,kind.replace('*',''),r+'.'+k);assert.equal(f.required,kind.endsWith('*'),r+'.'+k+' required');assert.equal(f.multiple,false);}
 assert.deepEqual(F('partnerships.opportunities').stage.options,['identified','contacted','non_confidential','cda','confidential_evaluation','term_sheet','exclusivity_diligence','signed','lost','on_hold']);
 assert.deepEqual(F('partnerships.opportunities').direction.options,['out_license','in_license','co_development','research_collaboration','academic','platform','other']);
 assert.deepEqual(F('partnerships.briefs').status.options,['draft','reviewed']);assert.deepEqual(F('partnerships.research_reports').cadence.options,['daily','weekly','monthly']);
 for(const k of ['digest_cadence','digest_day','digest_time','time_zone','digest_recipients','research_enabled'])assert.equal(F('partnerships.settings')[k],undefined,'schedules and recipients live in the automations, not in settings: '+k);
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
 const view=rows.find(r=>r.role==='partnerships.views'&&r.data.name==='APAC contacted')!;await ben.change('pick-view',view.id);assert.deepEqual(ben.state.flt,{stage:['contacted'],program:[],direction:[],owner:[],priority:[],source:[],organization:[],tags:{Region:['Asia-Pacific']},custom:{}});
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

test('acceptance 4 (automations): research, digest and briefs are install recipes; research saves to the app; settings hold no schedule',async()=>{
 const recipes=readRecipes(entry);assert.deepEqual(recipes.unavailable,[]);assert.deepEqual(recipes.recommended.map(r=>r.key),['partner_research','partner_digest','meeting_briefs']);
 const [res,dig,brief]=recipes.recommended as any[];
 const w=schedule.parse(res.trigger) as any;assert.deepEqual([w.frequency,w.weekdays,w.time,w.timeZone],['weekly',[1],'07:00','Europe/Berlin']);assert.equal(nextCalendar(w,new Date('2026-11-14T12:00:00Z')).toISOString(),'2026-11-16T06:00:00.000Z');
 // Research must store its results: create-only signals and one report per run, nothing else (no opportunities, stages or other apps).
 assert.deepEqual(res.research.writeBindings.map((b:any)=>[b.role,b.allowCreate,b.allowUpdate]),[['partnerships.signals',true,false],['partnerships.research_reports',true,false]]);
 assert.deepEqual(brief.research.writeBindings.map((b:any)=>[b.role,b.allowCreate,b.allowUpdate]),[['partnerships.briefs',true,false]]);
 for(const r of [res,brief])for(const b of [...r.research.readBindings,...r.research.writeBindings])for(const k of b.fields)assert.ok(schema[b.role].logicalFields[k],b.role+'.'+k);
 assert.match(res.research.instructions,/Every run, also when nothing new was found, save one partnerships\.research_reports row/);
 assert.match(res.research.instructions,/at most 3 items per section[\s\S]*150 words[\s\S]*empty sections left out[\s\S]*no deal terms/);
 assert.deepEqual(dig.trigger,{kind:'after',recipe:'partner_research',when:'completed'});assert.match(dig.email.text,/\{\{run\.summary\}\}/);
 assert.deepEqual([brief.trigger.kind,brief.trigger.role,brief.trigger.field,brief.trigger.offsetMinutes],['record_date','partnerships.activities','occurred_on',-1440]);assert.match(brief.research.instructions,/status draft/);
 // The app holds no schedule or recipients and shows the automations it is linked to, plus each run's saved report.
 const rows=fresh(),st=await render(rows,{section:'settings'}),t=text(st.html);
 assert.doesNotMatch(st.html,/pt-schedule|digest_cadence|digest_recipients|research_enabled/);
 assert.match(t,/Partner research Weekly, Monday 07:00[\s\S]*Digest email After each research run[\s\S]*Meeting briefs The day before linked meetings[\s\S]*Last research report: 9 Nov 2026/);
 assert.match(st.html,/href="https:\/\/platform\.trialagents\.com\/automations"/);
 const runs=text((await render(rows,{section:'research',rsub:'runs'})).html);assert.match(runs,/9 Nov 2026 week of 9 Nov 4 3 Partnerships · week of 9 Nov/);assert.match(runs,/2 Nov 2026 week of 2 Nov 1 0/);
 // The digest preview uses the cadence of the latest report (weekly here), and still renders before any report exists.
 assert.match(t,/Partnerships · week of 16 Nov:/);assert.match(text((await render(rows.filter(r=>r.role!=='partnerships.research_reports'),{section:'settings'})).html),/No research report yet/);
});

test('follow-up reminders (chat path) route to the owner\'s member ID; draft briefs from the automation are marked reviewed',async()=>{
 const X=JSON.parse(await readFile(root+'automation.examples.json','utf8')),sub=(v:any):any=>typeof v==='string'?(/^REPLACE_MEMBER_EMAIL$/.test(v)?'member@example.invalid':/^REPLACE_/.test(v)?randomUUID():v):Array.isArray(v)?v.map(sub):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,sub(x)])):v;
 assert.deepEqual(Object.keys(X).sort(),['note','reminderDue','reminderOverdue']);
 for(const k of ['reminderDue','reminderOverdue']){const c=sub(X[k]);c.recordTypeId=c.trigger.typeId;const a=actionConfig.parse(c);assert.equal(a.trigger.kind,'record_date');assert.deepEqual(a.conditions,[{field:'status',operator:'equals',value:'open'}]);assert.equal((a.steps[0] as any).memberField,'owner_member_id');}
 assert.equal(sub(X.reminderOverdue).trigger.offsetMinutes,1440);assert.doesNotMatch(JSON.stringify(X),/@(?!example)/);
 const rows=fresh(),s=session(rows),o=OPP('Ironvale: NWB-101 Japan rights');await s.click('open:opp:'+o);await s.click('panel:fu:'+o);await s.submit('save-fu',{title:'Send the CMC summary',owner:'Marc',due:'2026-11-18'});
 assert.equal(s.changes[0].data.owner_member_id,'00000000-0000-4000-a000-000000000002');await s.approve();
 await s.open({section:'settings',panel:null});await s.submit('save-settings',{team:'Anna, Marc, Sofia',team_members:'Anna | not-a-member',stalled_days:'21'});assert.equal(s.changes.length,0);assert.match(s.state.notice,/member ID/);
 const draft=rows.find(r=>r.role==='partnerships.briefs'&&r.data.status==='draft')!;await s.click('open:brief:'+draft.id);assert.match(text(s.html),/Draft Written by Claude/);
 await s.click('brief-reviewed:'+draft.id);assert.deepEqual(s.changes[0].data,{status:'reviewed'});await s.approve();assert.equal(draft.data.status,'reviewed');
 const meet=rows.find(r=>r.role==='partnerships.activities'&&['meeting','call','conference_meeting'].includes(r.data.kind)&&r.data.opportunity_id&&!rows.some(b=>b.role==='partnerships.briefs'&&b.data.activity_id===r.id))!;
 await s.click('add:briefs:'+meet.id);await s.submit('save-record',{content:'One page'});assert.equal(s.changes[0].data.status,'reviewed','a brief a person writes is reviewed');
});

/* Customization: what Claude or ChatGPT (or a person) can change through reviewed proposals, within the app's scope. */
const CF_MAP=()=>{const m=structuredClone(fullMap);m['partnerships.opportunities'].fields.milestone_value='milestone_value';m['partnerships.opportunities'].fields.region_priority='region_priority';m['partnerships.opportunities'].writableFields.push('milestone_value','region_priority');return m;};
const CF_BIND=()=>fullBindings.map((b:any)=>b.typeId==='partnerships.opportunities'?{...b,fields:[...b.fields,'milestone_value','region_priority']}:b);
const withCustom=(rows:Row[])=>{const st=rows.find(r=>r.role==='partnerships.settings')!;st.data={...st.data,custom_fields:JSON.stringify([{table:'opportunities',key:'milestone_value',label:'Milestone value (USD m)',kind:'number',column:true},{table:'opportunities',key:'region_priority',label:'Region priority',kind:'select',options:['Tier 1','Tier 2'],column:false,filter:true},{table:'opportunities',key:'not_bound',label:'Unbound',kind:'text'}])};
 for(const [name,v,p] of [['Ironvale: NWB-101 Japan rights',40,'Tier 1'],['Pinehollow: NWB-101 Korea licence',12,'Tier 2'],['Maplecrest: NWB-101 regional licence',75,'Tier 1']] as const){const o=rows.find(r=>r.role==='partnerships.opportunities'&&r.data.name===name)!;o.data={...o.data,milestone_value:v,region_priority:p};}return rows;};

test('customization: a registered custom field is a column, a sortable value, a filter, a drawer row and an editor input; unbound fields stay out',async()=>{
 const rows=withCustom(fresh()),opts={config:cfgFor(CF_MAP()),bindings:CF_BIND()},s=session(rows,opts);
 await s.open({section:'pipeline',mode:'list'});const head=[...s.html.matchAll(/<th scope="col"[^>]*>([^<]*)<\/th>/g)].map(m=>m[1]);
 assert.deepEqual(head,['Opportunity','Partner','Asset','Direction','Stage','Owner','Next step','Fit','Tags','Milestone value (USD m)']);assert.doesNotMatch(s.html,/Unbound|Region priority<\/th>/);
 await s.change('sort','cf:milestone_value|desc');const names=[...text(s.html).matchAll(/(Maplecrest: NWB-101 regional licence|Ironvale: NWB-101 Japan rights|Pinehollow: NWB-101 Korea licence)/g)].map(m=>m[1]);assert.deepEqual(names.slice(0,3),['Maplecrest: NWB-101 regional licence','Ironvale: NWB-101 Japan rights','Pinehollow: NWB-101 Korea licence']);
 assert.match(s.html,/<label class="pt-field" for="pt-flt-cf_region_priority">Region priority/);await s.change('flt:cf:region_priority','Tier 2');assert.match(text(s.html),/Pinehollow: NWB-101 Korea licence/);assert.doesNotMatch(text(s.html),/Ironvale: NWB-101 Japan rights/);
 const o=rows.find(r=>r.role==='partnerships.opportunities'&&r.data.name==='Ironvale: NWB-101 Japan rights')!;await s.click('open:opp:'+o.id);assert.match(text(s.html),/Milestone value \(USD m\) 40/);
 await s.click('edit:opps:'+o.id);assert.match(s.html,/name="milestone_value"/);assert.match(s.html,/name="region_priority"/);
 await s.submit('save-record',{milestone_value:'55'});assert.deepEqual(s.changes[0].data,{milestone_value:55});
 await s.click('edit:opps:'+o.id);await s.submit('save-record',{milestone_value:'55',region_priority:'Tier 9'});assert.match(s.state.notice,/valid region priority/i);
 // Without the binding the app ignores the registration (the field must be on the table and in the app first).
 assert.doesNotMatch((await render(withCustom(fresh()),{section:'pipeline',mode:'list'})).html,/Milestone value/);
});

test('customization: saved views keep their own columns and sort; filters on priority, source and partner; layout gear covers every list',async()=>{
 const rows=withCustom(fresh()),opts={config:cfgFor(CF_MAP()),bindings:CF_BIND()},s=session(rows,opts);
 await s.open({section:'pipeline',mode:'list'});await s.change('me','Anna');await s.change('flt:direction','out_license');await s.change('sort','fit|desc');
 const cols=['name','partner','cf:milestone_value','stage'];await s.click('panel:saveview');s.state.viewCols=cols;await s.submit('save-view',{name:'Out-licensing by fit',shared:'on'});
 assert.deepEqual([JSON.parse(s.changes[0].data.sort),JSON.parse(s.changes[0].data.columns)],[{field:'fit',dir:'desc'},cols]);await s.approve();
 const view=rows.find(r=>r.role==='partnerships.views'&&r.data.name==='Out-licensing by fit')!;const m=session(rows,opts);await m.open({section:'pipeline',mode:'list'});await m.change('pick-view',view.id);
 assert.deepEqual([...m.html.matchAll(/<th scope="col"[^>]*>([^<]*)<\/th>/g)].map(x=>x[1]),['Opportunity','Partner','Milestone value (USD m)','Stage']);assert.deepEqual(m.state.sort,{field:'fit',dir:'desc'});
 // A view written by an assistant with unknown columns or sort keeps only what the app knows.
 rows.push({id:randomUUID(),version:0,role:'partnerships.views',data:{name:'Assistant view',filters:JSON.stringify({priority:['high'],source:['conference'],organization:[ORG('Cedarline Pharma')]}),layout:'list',columns:JSON.stringify(['name','bogus','priority']),sort:JSON.stringify({field:'nope'}),shared:true,owner:'Anna'}});
 const a=session(rows,opts);await a.open({section:'pipeline'});await a.change('pick-view',rows[rows.length-1].id);assert.deepEqual(a.state.viewCols,['name','priority']);assert.equal(a.state.sort,null);assert.equal(a.state.mode,'list');
 assert.match(text(a.html),/Cedarline: NWB-101 licence/);for(const r of rows.filter(r=>r.role==='partnerships.opportunities'&&!bool(r.data.archived)&&a.html.includes('open:opp:'+r.id)))assert.ok(r.data.priority==='high'&&r.data.source==='conference'&&r.data.organization_id===ORG('Cedarline Pharma'));
 // Layout: every list has a column group; reorder and hide through the layout profile; newer columns start hidden.
 const layout=JSON.parse(/^const templateLayoutSchema=(.+);$/m.exec(await readFile(root+'partnerships.source.js','utf8'))![1]);assert.deepEqual(Object.keys(layout.groups),['pipeline','partners','contacts','activity','followups','meetings']);
 const prof={cols:{activity:['summary','date']},visible:{'activity.logged_by':false,'contacts.email':true}},r2=await render(fresh(),{section:'activity'},undefined,{config:cfgFor(fullMap,{layoutProfile:JSON.stringify(prof)})});
 assert.deepEqual([...r2.html.matchAll(/<th scope="col"[^>]*>([^<]*)<\/th>/g)].map(x=>x[1]),['Summary','Date','Kind','Partner','Opportunity']);
 const r3=await render(fresh(),{section:'partners'},undefined,{config:cfgFor(fullMap,{layoutProfile:JSON.stringify(prof)})});assert.match(r3.html,/>Professional email<\/th>/);assert.doesNotMatch((await render(fresh(),{section:'partners'})).html,/>Professional email<\/th>/);
});

test('customization: stage labels, hidden and custom stages, activity kinds and deal types, and preferences',async()=>{
 const rows=fresh(),s=session(rows);const k=rows.find(r=>r.role==='partnerships.opportunities'&&r.data.stage==='exclusivity_diligence')!;k.data={...k.data,stage:'term_sheet'};await s.open({section:'settings'});
 await s.submit('save-stages',{label_cda:'CDA signed',hide_exclusivity_diligence:'on',...Object.fromEntries(['identified','contacted','non_confidential','confidential_evaluation','term_sheet','signed','lost','on_hold'].map(k=>['label_'+k,'']))});
 const cfg=JSON.parse(s.changes[0].data.stage_config);assert.deepEqual(cfg.labels,{cda:'CDA signed'});assert.deepEqual(cfg.hidden,['exclusivity_diligence']);await s.approve();
 await s.open({section:'pipeline',mode:'board'});assert.match(text(s.html),/CDA signed/);
 const open=rows.find(r=>r.role==='partnerships.opportunities'&&r.data.stage==='term_sheet')!;await s.click('open:opp:'+open.id);assert.doesNotMatch(s.html,/<option value="exclusivity_diligence"/);
 await s.open({section:'settings',panel:null});await s.submit('save-stages',{hide_term_sheet:'on'});assert.equal(s.changes.length,0);assert.match(s.state.notice,/open opportunities/);
 // A custom stage (added to the stage options by a reviewed table change, then registered) sits after its anchor and counts in the funnel there.
 const st=rows.find(r=>r.role==='partnerships.settings')!;st.data.stage_config=JSON.stringify({custom:[{key:'board_approval',label:'Board approval',after:'term_sheet'}]});open.data={...open.data,stage:'board_approval'};
 const b=await render(rows,{section:'pipeline',mode:'board'});const order=[...b.html.matchAll(/<section class="pt-col[^"]*" aria-label="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(order.slice(5,8),['Term sheet','Board approval','Exclusivity and diligence']);
 const f=await render(rows,{section:'pipeline',mode:'funnel'});assert.ok(text(f.html).includes('Term sheet'));
 // Lists: rename and hide activity kinds (a new kind needs a table change first); add a deal type.
 const l=session(rows);await l.open({section:'settings'});await l.submit('save-lists',{activity_kinds:'meeting | In-person meeting\nnote | Note | hidden\nwebinar | Webinar',deal_types:'license | Licence'});assert.equal(l.changes.length,0);assert.match(l.state.notice,/table change/);
 await l.submit('save-lists',{activity_kinds:'meeting | In-person meeting\nnote | Note | hidden',deal_types:'license | Licence\nnewco | NewCo spin-out'});const ol=JSON.parse(l.changes[0].data.option_lists);assert.deepEqual(ol,{activity_kinds:{meeting:'In-person meeting',note:'Note',hidden:['note']},deal_types:{license:'Licence',newco:'NewCo spin-out'}});await l.approve();
 await l.click('panel:log');assert.match(l.html,/In-person meeting/);assert.doesNotMatch(l.html,/<option value="note"/);
 const pf=rows.find(r=>r.role==='partnerships.asset_profiles')!;await l.click('edit:profiles:'+pf.id);assert.match(l.html,/NewCo spin-out/);
 // Preferences: the pipeline opens as a list with a shared default view and 10 rows per page; hidden overview panels.
 const view=rows.find(r=>r.role==='partnerships.views'&&r.data.shared===true)!;const p=session(rows);await p.open({section:'settings'});
 await p.submit('save-prefs',{pipeline_layout:'list',default_view:view.id,page_size:'10',ov_funnel_asset:'on',ov_followups:'on',ov_stalled:'on',ov_upcoming:'on',ov_signals:'on'});
 assert.deepEqual(JSON.parse(p.changes[0].data.preferences),{pipeline_layout:'list',default_view:view.id,page_size:10,overview_hidden:['funnel_direction']});await p.approve();
 const fresh2=session(rows);await fresh2.open({section:'pipeline'});assert.equal(fresh2.state.mode,view.data.layout||'list');assert.equal(fresh2.state.viewId,view.id);
 const ov=text((await render(rows,{section:'overview'})).html);assert.match(ov,/Funnel by asset/);assert.doesNotMatch(ov,/Funnel by direction/);
 await p.submit('save-prefs',{page_size:'500'});assert.match(p.state.notice,/10 to 50/);
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
