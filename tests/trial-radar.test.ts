import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {appTemplateEntry} from '../src/workspace/app-templates.js';
import {validateRecipeDeclarations,readRecipes,automationRecipe} from '../src/automations/recipes-schema.js';
import {validateAppFunctions} from '../src/workspace/app-functions-schema.js';
import {schedule} from '../src/automations/schema.js';
import {nextCalendar} from '../src/automations/schedules.js';
import * as kit from '../templates/source/radar-kit/kit.mjs';
import {entry,radar,schema,demo,fresh,session,render,text,runFunction,T,fullBindings,cfgFor,fullMap,type Row} from './fixtures/trial-radar.js';

/* BIO_RADAR.md §5 for the radar kit and Trial Radar 1.0.0, in production QuickJS with platform-shaped reads (tests/fixtures/trial-radar.ts).
 * Fixture: the fictional demo set (2 scopes, 12 trials, 14 events, 3 runs; WHO ICTRP not reachable in all 3 runs), as of 16 Nov 2026.
 * The database, installer, runner, grants and email delivery are covered by tests/trial-radar-integration.test.ts. */
const rowsOf=(rows:Row[],t:string)=>rows.filter(r=>r.role===t);
const lastRun=(rows:Row[])=>rowsOf(rows,T('runs')).sort((a,b)=>String(b.data.run_on).localeCompare(String(a.data.run_on)))[0];
const words=(t:string)=>t.split(/\s+/).filter(w=>/[A-Za-z0-9]/.test(w)).length;

test('package: the generator is deterministic and the catalog entry, recipes, functions, installer and contract validate',async()=>{
 await promisify(execFile)('node',['scripts/build-radar-templates.mjs','--check']);
 const raw=JSON.parse(await readFile('templates/apps/life.trial-radar-1.0.0.json','utf8'));
 appTemplateEntry.parse(raw);validateRecipeDeclarations(raw);validateAppFunctions(raw,Object.keys(schema));
 assert.equal(raw.id,'life.trial-radar');assert.equal(raw.version,'1.0.0');assert.ok(raw.whenToUse&&raw.whenNotToUse);assert.ok(raw.source.length<180000);
 assert.ok(raw.source.includes('const templateLayoutSchema={"screens":[{"id":"overview","label":"Overview"},{"id":"tracker","label":"Trials"},{"id":"events","label":"Events"},{"id":"setup","label":"Setup"}]'));
 assert.deepEqual(raw.functions.map((f:any)=>f.name),['brief','digest_summary','alert_summary']);
 for(const f of raw.functions){assert.deepEqual(f.scope.capabilities,['records.read','tables.list']);assert.equal(f.scope.documents,false);}
 // Roles: core organizations (read/write), optional read-only programs, five app tables; events is the radar.v1 output.
 assert.deepEqual(Object.keys(schema),['organizations','programs','trialradar.settings','trialradar.scopes','trialradar.trials','trialradar.events','trialradar.runs']);
 assert.deepEqual([schema.programs.optional,schema.programs.readOnly],[true,true]);assert.equal(schema['trialradar.events'].contract,'radar.v1');
 const outputs=JSON.parse(await readFile('templates/contracts/outputs.json','utf8'));const out=outputs.roles['trialradar.events'];
 assert.deepEqual([out.kind,out.writer],['output','life.trial-radar']);assert.match(out.description,/dismissed rows .* are never counted/);
 assert.deepEqual(out.versions['radar.v1'].fields.map((f:any)=>f.key),schema['trialradar.events'].fields.map((f:any)=>f.key));
 assert.equal(JSON.parse(await readFile('templates/catalog-installers.json','utf8'))['life.trial-radar@1.0.0'],'templates/source/radars/trial-radar/schema.example.json');
 // Published on owner approval (15 Nov 2026): the seed approves 1.0.0 on first import.
 assert.equal(JSON.parse(await readFile('templates/catalog-seed.json','utf8'))['life.trial-radar'].version,'1.0.0');
 // Trial specifics (§3): scope fields, tracker fields, natural key, event kinds, digest section, sources with TrialAgents Intel first.
 assert.deepEqual(radar.scopeFields.map((f:any)=>f.key),['indication','interventions','sponsors','phases','countries']);
 for(const k of ['registry_ids','title','sponsor_id','asset','phase','status','enrollment','primary_endpoint','primary_completion','completion_estimated','countries','sites_count','last_change'])assert.ok(schema['trialradar.trials'].fields.some((f:any)=>f.key===k),k);
 assert.deepEqual(radar.eventKinds.map((k:any)=>k.key),['trial_registered','status_change','date_change','enrollment_change','endpoint_change','results_posted','readout','trial_stopped']);
 assert.deepEqual(radar.sources.map((s:any)=>[s.name,s.priority]),[['TrialAgents Intel (EU CTIS)',1],['ClinicalTrials.gov',2],['WHO ICTRP',3],['Company releases',4]]);
 assert.match(radar.naturalKey.rule,/EU CT number .* otherwise the NCT ID/);
});

test('§2.4 recommended automations: scan + digest is one automation (E5), alert after the scan, grants exclude user-owned fields (E6)',()=>{
 const [scan,alert]=readRecipes(entry).recommended as any[];
 assert.equal(scan.key,'scan');assert.ok(scan.research&&scan.email,'research then email in one recipe');assert.equal(scan.research.briefBinding,'brief');assert.equal(scan.email.summaryBinding,'digest_summary');assert.equal(scan.email.when,'meaningful');
 assert.deepEqual(scan.trigger,{kind:'calendar',frequency:'weekly',time:'07:00',timeZone:'Europe/Berlin',anchor:'2026-11-16',interval:1,weekdays:[1],monthDay:1,monthEnd:'last_day'});
 const next=nextCalendar(schedule.parse(scan.trigger) as any,new Date('2026-11-17T12:00:00Z'));assert.equal(next.toISOString(),'2026-11-23T06:00:00.000Z','Monday 07:00 Berlin');
 const grant=(role:string)=>scan.research.writeBindings.find((b:any)=>b.role===role);
 assert.deepEqual([grant(T('trials')).fields,grant(T('trials')).allowCreate,grant(T('trials')).allowUpdate],['all',true,true]);
 assert.deepEqual(grant(T('trials')).exceptFields,['watched','seen_run_id','dismissed','user_notes','archived']);
 assert.deepEqual([grant(T('events')).allowCreate,grant(T('events')).allowUpdate],[true,false],'events are create-only: research never changes a reviewed or dismissed event');
 assert.deepEqual(grant(T('events')).exceptFields,['dismiss_reason','reviewed_by','archived']);
 assert.deepEqual([grant(T('runs')).allowCreate,grant(T('runs')).allowUpdate],[true,false]);assert.ok(!grant(T('scopes'))&&!grant(T('settings')),'research never edits scopes or the template');
 assert.deepEqual([alert.key,alert.trigger],['alert',{kind:'after',recipe:'scan',when:'meaningful'}]);assert.equal(alert.email.summaryBinding,'alert_summary');
 assert.ok(scan.name.length<=60&&alert.name.length<=60);
});

test('kit readiness: a monthly radar is only a definition; the kit gives it valid tables, recipes, functions and docs',async()=>{
 const other={...radar,slug:'patent-radar-test',id:'life.patent-radar-test',name:'Patent Radar (test)',prefix:'patentradar',trackerTable:'families',trackerLabel:'Patents',itemLabel:'patent family',itemsLabel:'patent families',cadence:'monthly',
  scopeFields:[{key:'targets',name:'Targets',kind:'text',required:true}],trackerFields:[{key:'family_id',name:'Family ID',kind:'text'},{key:'title',name:'Title',kind:'text',required:true},{key:'expiry_estimate',name:'Expiry estimate',kind:'date'},{key:'expiry_is_estimate',name:'Expiry is an estimate',kind:'boolean'}],
  naturalKey:{label:'family ID',rule:'The patent family ID.'},dateField:{key:'expiry_estimate',estimated:'expiry_is_estimate',label:'Expiry'},eventKinds:[{key:'patent_granted',label:'Patent granted'},{key:'expiry_upcoming',label:'Expiry upcoming'}],
  digestSection:{title:'New grants and legal events',kinds:['patent_granted'],hint:'grants'},listColumns:['natural_key','title','expiry_estimate'],sources:[{name:'Espacenet',covers:'EPO',priority:1,notes:''}]};
 const recipes=kit.recipes(other);for(const r of recipes)automationRecipe.parse(r);
 assert.deepEqual(recipes[0].trigger,{kind:'calendar',time:'07:00',timeZone:'Europe/Berlin',anchor:'2026-11-16',frequency:'monthly',monthRule:{kind:'weekday',nth:1,weekday:1}},'first Monday of the month');
 const fns=kit.functionDecls(other,{common:'',brief:'return {context:{}};',digest:'return {nonEmpty:false,text:""};',alert:'return {nonEmpty:false,text:""};'});
 const schemaOther=kit.installerSchema(other);validateAppFunctions({functions:fns,recommendedAutomations:recipes},Object.keys(schemaOther));
 assert.deepEqual(Object.keys(schemaOther).slice(2),['patentradar.settings','patentradar.scopes','patentradar.families','patentradar.events','patentradar.runs']);
 assert.equal(kit.outputContract(other).writer,'life.patent-radar-test');assert.equal(kit.layoutSchema(other).screens[1].label,'Patents');
 const docs=kit.catalogText(other);assert.ok(docs.instructions.length<20000&&docs.documentation.dataContract.length<=6000&&docs.documentation.interactionContract.length<=6000);
});

test('four screens render with the demo data; empty and partial data are labelled; reads are bounded',async()=>{
 const s=session(fresh());
 for(const section of ['overview','tracker','events','setup']){const o=await s.open({section});assert.doesNotMatch(text(o.html),/could not be shown|Partial data/,section);assert.ok(o.calls.length<=20,section+' used '+o.calls.length+' calls');}
 const empty=session([]);await empty.open({section:'overview'});assert.match(text(empty.html),/No run yet/);await empty.open({section:'tracker'});assert.match(text(empty.html),/Add a scope in Setup first/);
 const partial=session(fresh(),{read:(v:any,rows:Row[])=>v.typeId===T('events')?{unavailable:true}:{rows:rows.filter(r=>r.role===v.typeId).slice(0,v.limit),total:rows.filter(r=>r.role===v.typeId).length}});
 await partial.open({section:'overview'});assert.match(text(partial.html),/Partial data/);
 // Unsaved preview: every write control is disabled.
 const preview=await render(fresh(),{section:'tracker'},{kind:'open',action:''},{saved:false});assert.match(preview.html,/data-action="new:item" disabled/);
});

test('acceptance 2: a new scope is prefilled with the definition fields and the standard sources, TrialAgents Intel first; unsourced rows cannot be saved',async()=>{
 const rows=fresh(),s=session(rows);await s.open({section:'setup'});await s.click('new:scope');
 const h=text(s.html);for(const f of ['Indication','Mechanism or interventions','Sponsors to watch','Phases','Countries or regions'])assert.match(h,new RegExp(f));
 assert.match(s.html,/name="src_name_0" [^>]*value="TrialAgents Intel \(EU CTIS\)"/);assert.match(s.html,/name="src_name_1" [^>]*value="ClinicalTrials.gov"/);
 await s.submit('save-scope',{name:'Lupus nephritis (fictional)',def_indication:'lupus nephritis',src_name_0:'TrialAgents Intel (EU CTIS)',src_priority_0:'1',src_name_1:'ClinicalTrials.gov',src_priority_1:'2',status:'active'});
 assert.equal(s.changes.length,1);const c=s.changes[0];assert.equal(c.kind,'create_record');assert.equal(c.typeId,T('scopes'));
 assert.deepEqual(JSON.parse(c.data.sources).map((x:any)=>x.name),['TrialAgents Intel (EU CTIS)','ClinicalTrials.gov']);assert.deepEqual(JSON.parse(c.data.definition),{indication:'lupus nephritis'});
 await s.submit('save-scope',{name:'No indication'});assert.equal(s.changes.length,0);assert.match(text(s.html),/Enter indication/);
 // Adding a trial by hand needs a source.
 await s.open({section:'tracker',panel:null});await s.click('new:item');const scope=rowsOf(rows,T('scopes'))[0].id;
 await s.submit('add-item',{natural_key:'2026-599999-10-00',title:'A fictional trial',scope_id:scope,sources:''});assert.equal(s.changes.length,0);assert.match(text(s.html),/Unsourced rows cannot be saved/);
 await s.submit('add-item',{natural_key:'2026-599999-10-00',title:'A fictional trial',scope_id:scope,sources:'CTIS record https://registry.example.invalid/2026-599999-10-00'});
 assert.equal(s.changes[0].data.natural_key,'2026-599999-10-00');assert.deepEqual(JSON.parse(s.changes[0].data.sources)[0].url,'https://registry.example.invalid/2026-599999-10-00');
});

test('brief (§2.3): template with locked rules, active scopes with sources and since dates, current fields and recorded keys; nothing to do without an active scope',async()=>{
 const rows=fresh(),{out}=await runFunction('brief',rows),b=out.context;
 assert.equal(b.research_template.version,1);assert.deepEqual(b.research_template.rules.slice(0,8),kit.REQUIRED_RULES);
 assert.equal(b.active_scopes.length,2);assert.equal(b.active_scopes[0].sources.named[0].name,'TrialAgents Intel (EU CTIS)');assert.equal(b.active_scopes[0].sources.defaultRoute,'web');
 assert.equal(b.active_scopes[0].last_run_on,'2026-11-16');assert.equal(b.active_scopes[0].since,'2026-11-16');assert.equal(b.active_scopes[0].run_kind,'refresh');
 assert.ok(b.return_format[T('trials')].phase.startsWith('select'));assert.ok(b.recorded.trials.includes('2025-510000-11-00'));assert.equal(b.recorded.trials_complete,true);
 // A new scope without a run: since = today - lookback, run kind build.
 rows.push({id:'00000000-0000-4000-8000-000000009001',version:0,role:T('scopes'),data:{name:'New (fictional)',definition:'{"indication":"x"}',sources:'[]',status:'active'}});
 const fresh2=(await runFunction('brief',rows)).out.context.active_scopes.find((s:any)=>s.name==='New (fictional)');assert.equal(fresh2.run_kind,'build');assert.equal(fresh2.last_run_on,null);
 // Paused or archived scopes are not researched; with none active the brief says to save nothing.
 for(const r of rowsOf(rows,T('scopes')))r.data.status='paused';
 const none=(await runFunction('brief',rows)).out.context;assert.equal(none.active_scopes.length,0);assert.match(none.nothing_to_do,/save nothing and finish with no_update/);
});

test('acceptance 5: editing the research template creates a version the next brief uses; required rules cannot be removed; restore default and restore a version',async()=>{
 const rows=fresh(),s=session(rows);await s.open({section:'setup',ssub:'template'});
 assert.match(text(s.html),/Required rules \(always included, cannot be removed\)/);assert.equal((s.html.match(/class="rd-lock"/g)||[]).length,8);
 assert.doesNotMatch(s.html,/name="rules"[^>]*>[^<]*Every fact needs a source/,'required rules are not in the editable field');
 await s.submit('save-template',{instruction:'Watch IPF trials only (fictional edit).',rules:'Every fact needs a source URL or reference and a date.\nPrefer EU CT numbers.',note:'Narrowed'});
 assert.equal(s.changes.length,1);await s.approve();
 const set=rowsOf(rows,T('settings'))[0].data;assert.equal(set.research_template_version,2);assert.deepEqual(JSON.parse(set.research_template),{instruction:'Watch IPF trials only (fictional edit).',rules:['Prefer EU CT numbers.']},'a required rule pasted into the editable rules is dropped there');
 const b=(await runFunction('brief',rows)).out.context;assert.equal(b.research_template.version,2);assert.equal(b.research_template.instruction,'Watch IPF trials only (fictional edit).');
 assert.deepEqual(b.research_template.rules,[...kit.REQUIRED_RULES,'Prefer EU CT numbers.'],'required rules always first, then the user\'s');
 assert.equal(JSON.parse(set.research_template_history).map((h:any)=>h.version).join(),'1,2');
 await s.click('restore-template');await s.approve();const after=rowsOf(rows,T('settings'))[0].data;assert.equal(after.research_template_version,3);assert.equal(JSON.parse(after.research_template).instruction,radar.instruction);
 await s.click('restore-version:2');await s.approve();assert.equal(JSON.parse(rowsOf(rows,T('settings'))[0].data.research_template).instruction,'Watch IPF trials only (fictional edit).');assert.equal(rowsOf(rows,T('settings'))[0].data.research_template_version,4);
 await s.submit('save-template',{instruction:'',rules:''});assert.equal(s.changes.length,0);assert.match(text(s.html),/cannot be empty/);
});

test('acceptance 6: a custom tracker field appears in the table and in the brief\'s return format; hiding it hides it in the table only',async()=>{
 const rows=fresh();for(const r of rowsOf(rows,T('trials')))r.data.biomarker='MUC5B (fictional)';
 const bindings=fullBindings.map(b=>b.typeId===T('trials')?{...b,fields:[...b.fields,'biomarker']}:b);const opts={bindings};
 const s=session(rows,opts);await s.open({section:'tracker'});assert.match(text(s.html),/Biomarker/);assert.match(text(s.html),/MUC5B \(fictional\)/);
 await s.open({section:'setup',ssub:'fields'});assert.match(text(s.html),/biomarker .* Custom/);assert.match(s.html,/&quot;biomarker&quot;: &quot;text, custom field&quot;/);
 const extra={[T('trials')]:[{key:'biomarker',name:'Biomarker',kind:'text',required:false,multiple:false}]};
 const b=(await runFunction('brief',rows,{},{extraFields:extra})).out.context;assert.match(b.return_format[T('trials')].biomarker,/custom field/);assert.ok(b.current_fields.some((f:any)=>f.key==='biomarker'&&f.custom));
 await s.submit('save-labels',{label_biomarker:'Biomarker',show_biomarker:'hidden'});await s.approve();
 await s.open({section:'tracker'});assert.doesNotMatch(text(s.html),/MUC5B/,'hidden in the table');
 assert.match((await runFunction('brief',rows,{},{extraFields:extra})).out.context.return_format[T('trials')].biomarker,/custom field/,'still in the research');
});

test('acceptance 7 and the Trial extra: the source report shows each named source; a source not reachable in 3 consecutive runs shows a hint',async()=>{
 const rows=fresh(),s=session(rows);await s.open({section:'overview'});
 assert.match(text(s.html),/WHO ICTRP was not reachable in the last 3 runs/);assert.match(text(s.html),/TrialAgents Intel \(EU CTIS\) Used EU CT numbers recorded/);
 // Only two unreachable runs: no hint.
 const runs=rowsOf(rows,T('runs')).sort((a,b)=>String(a.data.run_on).localeCompare(String(b.data.run_on)));runs[0].data.sources_report=JSON.stringify(JSON.parse(runs[0].data.sources_report).map((s:any)=>({...s,sources:s.sources.map((x:any)=>({...x,status:'used'}))})));
 await s.open({section:'overview'});assert.doesNotMatch(text(s.html),/not reachable in the last 3 runs/);
 // Intel unreachable in the latest run: the report says so and the run's trials come from ClinicalTrials.gov (NCT IDs).
 const last=lastRun(rows);last.data.sources_report=JSON.stringify([{scope_id:rowsOf(rows,T('scopes'))[0].id,sources:[{name:'TrialAgents Intel (EU CTIS)',status:'not_reachable',note:'Connector unavailable (fictional)'},{name:'ClinicalTrials.gov',status:'used',note:'Fallback'}]}]);
 await s.open({section:'overview'});assert.match(text(s.html),/TrialAgents Intel \(EU CTIS\) Not reachable Connector unavailable \(fictional\)/);assert.match(text(s.html),/ClinicalTrials.gov Used Fallback/);
});

test('acceptance 8: estimates show "est." in the tracker, the calendar, the event panel and the emails',async()=>{
 const rows=fresh(),s=session(rows);await s.open({section:'tracker'});assert.match(s.html,/rd-est/);
 const estRow=rowsOf(rows,T('trials')).find(r=>r.data.completion_estimated===true)!;assert.match(text(s.html),new RegExp(estRow.data.primary_completion.slice(0,4)+' est\\.'));
 await s.open({section:'events',esub:'calendar',month:'2027-01'});assert.match(text(s.html),/Topline readout expected · FX-104 \(fictional\) est\./);
 const run=lastRun(rows);const ev=rowsOf(rows,T('events')).find(e=>e.data.run_id===run.data.run_id&&e.data.impact==='high')!;ev.data.expected=true;
 const {out}=await runFunction('digest_summary',rows,{records:[],run:{id:run.data.run_id,summary:run.data.summary}});assert.match(out.text,/\(est\.\)/);
});

test('acceptance 3 and 4 (app side): the digest is written by app code within ~200 words, empty sections left out, nothing without changes; the alert only for watched high-impact events, one email per run',async()=>{
 const rows=fresh(),run=lastRun(rows),id=run.data.run_id;
 const d=(await runFunction('digest_summary',rows,{records:[],run:{id,summary:run.data.summary}})).out;
 assert.equal(d.nonEmpty,true);assert.match(d.subject,/^Trial Radar · \d+ \w+ \d{4}: \d+ high-impact · \d+ new · \d+ dates in 90 days$/);
 assert.ok(words(d.text)<=210,words(d.text)+' words');assert.match(d.text,/^Bottom line: /);assert.match(d.text,/High impact\n- /);assert.match(d.text,/Coverage: .* not reachable: WHO ICTRP/);assert.match(d.text,/https:\/\/platform\.trialagents\.com$/);
 assert.ok(d.text.split('\n').filter((l:string)=>l.startsWith('- ')).length<=9,'at most 3 items per section');
 // A run that changed nothing sends nothing; a run with no high-impact section leaves the section out.
 assert.equal((await runFunction('digest_summary',rows,{records:[],run:{id:'00000000-0000-4000-9100-999999999999'}})).out.nonEmpty,false);
 const quiet=fresh();for(const e of rowsOf(quiet,T('events')))if(e.data.run_id===id)e.data.impact='low';assert.doesNotMatch((await runFunction('digest_summary',quiet,{records:[],run:{id}})).out.text,/High impact/);
 // Alert: the last run has two high-impact events on a watched trial → one email naming both.
 const a=(await runFunction('alert_summary',rows,{records:[],run:{id}})).out;assert.equal(a.nonEmpty,true);assert.match(a.subject,/^Trial Radar alert · .*\(\+1 more\)$/);assert.match(a.text,/What happened: .*Status changed/);assert.match(a.text,/Why it matters: /);
 for(const r of rowsOf(rows,T('trials')))r.data.watched=false;assert.equal((await runFunction('alert_summary',rows,{records:[],run:{id}})).out.nonEmpty,false,'unwatched: no alert');
});

test('acceptance 10 and tracker actions: people act through reviewed proposals only; watch, mark seen, dismiss and edit keep the version they opened with',async()=>{
 const rows=fresh(),s=session(rows);const changed=rowsOf(rows,T('trials')).find(r=>r.data.changed_fields==='["status"]')!;
 await s.open({section:'tracker'});await s.click('open:item:'+changed.id+':'+changed.data.natural_key);assert.match(text(s.html),/Changed by the run of/);assert.match(s.html,/rd-kv rd-changed/);
 await s.click('seen:'+changed.id);assert.deepEqual(s.changes.map((c:any)=>[c.kind,c.data]),[['update_record',{seen_run_id:changed.data.last_changed_run_id}]]);await s.approve();
 await s.click('open:item:'+changed.id+':'+changed.data.natural_key);assert.doesNotMatch(text(s.html),/Changed by the run of/);
 await s.click('unwatch:'+changed.id);assert.deepEqual(s.changes[0].data,{watched:false});
 // Edit opened at version N; a concurrent change makes the old form fail instead of overwriting.
 await s.click('open:item:'+changed.id+':'+changed.data.natural_key);await s.click('edit:item');const v=s.state.panel.version;changed.version++;
 await s.submit('save-item',{status:'completed',sources:'Registry https://registry.example.invalid/x'});assert.equal(s.changes[0].expectedVersion,v,'the version from when the editor opened');
 assert.throws(()=>{for(const c of s.changes){const r=rows.find(x=>x.id===c.recordId)!;if(r.version!==c.expectedVersion)throw Error('stale version');}},/stale/);
 // Every write the app makes is a records.propose; it never sends email or calls anything else.
 const all=new Set<string>();for(const section of ['overview','tracker','events','setup']){const o=await s.open({section,panel:null});for(const c of o.calls)all.add(c.name);}assert.deepEqual([...all].sort(),['records.read']);
});

test('events: the review queue, mark reviewed, dismiss with a reason, duplicates merged, a page reviewed at once',async()=>{
 const rows=fresh(),s=session(rows);await s.open({section:'events'});const queued=rowsOf(rows,T('events')).filter(e=>e.data.status==='new').length;assert.match(text(s.html),new RegExp(queued+' events'));
 const ev=rowsOf(rows,T('events')).find(e=>e.data.status==='new')!;await s.click('review-event:'+ev.id);assert.deepEqual(s.changes[0].data,{status:'reviewed'});await s.approve();
 await s.open({section:'events',esub:'feed'});await s.click('open:event:'+ev.id+':'+ev.data.natural_key);await s.click('dismiss-form:'+ev.id);await s.submit('dismiss-event',{dismiss_reason:''});assert.equal(s.changes.length,0);assert.match(text(s.html),/Give a reason/);
 await s.submit('dismiss-event',{dismiss_reason:'Other indication (fictional)'});assert.deepEqual(s.changes[0].data,{status:'dismissed',dismiss_reason:'Other indication (fictional)'});
 // Two events with the same key from two runs show as one row with both sources.
 const dup={...structuredClone(ev),id:'00000000-0000-4000-8000-000000009999',data:{...ev.data,status:'new',sources:JSON.stringify([{title:'Second source (fictional)',url:'https://news.example.invalid/2'}])}};ev.data.status='new';rows.push(dup);
 await s.open({section:'events',panel:null});assert.match(text(s.html),/Merged with 1 duplicate/);assert.match(text(s.html),/Second source \(fictional\)/);
 await s.click('review-page');assert.ok(s.changes.length>0&&s.changes.length<=50);assert.ok(s.changes.every((c:any)=>c.data.status==='reviewed'));
});

test('acceptance 12: 5,000 events and 2,000 trials stay responsive: bounded calls per screen, server-side filters/sort/paging, the last page reachable',async()=>{
 const rows=fresh(),scope=rowsOf(rows,T('scopes'))[0].id,run=lastRun(rows).data.run_id;
 for(let i=0;i<2000;i++)rows.push({id:`10000000-0000-4000-8000-${String(i).padStart(12,'0')}`,version:0,role:T('trials'),data:{natural_key:'2026-5'+String(i).padStart(5,'0')+'-10-00',title:'Load trial '+i+' (fictional)',scope_id:scope,phase:['phase_2','phase_3'][i%2],status:'recruiting',enrollment:100+i,primary_completion:'2027-0'+(1+i%9)+'-15',completion_estimated:i%2===0,sources:'[]',watched:i%50===0,last_changed_run_id:i%100===0?run:null,changed_fields:'["status"]'}});
 for(let i=0;i<5000;i++)rows.push({id:`20000000-0000-4000-8000-${String(i).padStart(12,'0')}`,version:0,role:T('events'),data:{natural_key:'K'+i+'|status_change|2026-11-0'+(1+i%9),kind:'status_change',title:'Load event '+i,scope_id:scope,occurred_on:'2026-'+(10+i%3)+'-0'+(1+i%9),occurred_month:'2026-'+(10+i%3),impact:['high','medium','low','none'][i%4],status:i%3===0?'new':'reviewed',sources:'[]',run_id:i%500===0?run:'x'}});
 const s=session(rows);
 for(const st of [{section:'overview'},{section:'tracker'},{section:'events'},{section:'events',esub:'feed'},{section:'events',esub:'calendar',month:'2026-11'},{section:'setup'}]){
  const t0=performance.now(),o=await s.open(st),ms=performance.now()-t0;
  assert.ok(o.calls.length<=20,JSON.stringify(st)+' used '+o.calls.length+' calls');assert.ok(o.calls.every((c:any)=>c.name!=='records.read'||c.v.limit<=100),'every read is one bounded page');
  assert.ok(ms<4000,JSON.stringify(st)+' took '+Math.round(ms)+' ms');assert.doesNotMatch(text(o.html),/Partial data|could not be shown/);}
 await s.open({section:'tracker'});assert.match(text(s.html),/2,?012 trials|2012 trials/);
 await s.change('flt:phase','phase_3');assert.ok(s.calls.some((c:any)=>c.v.filters?.phase==='phase_3'),'filter sent to the server');assert.match(text(s.html),/100\d trials/);
 await s.click('sort:enrollment');assert.ok(s.calls.some((c:any)=>c.v.sort?.field==='enrollment'));
 for(let i=0;i<60;i++){await s.click('next-page');if(/data-action="next-page" disabled/.test(s.html))break;}assert.match(s.html,/data-action="next-page" disabled/,'the last page is reachable');
 await s.open({section:'events',esub:'feed'});assert.match(text(s.html),/50\d\d events/);
});
