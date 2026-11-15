import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {withActor,withDatabaseContext} from '../src/db/context.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {dataAccessStep,confirmDataAccess} from '../src/workspace/data-access.js';
import {AppMonitoring} from '../src/app-services/monitoring.js';
import {AutomationService} from '../src/automations/service.js';
import {AutomationEvents} from '../src/automations/events.js';
import {AutomationManagement} from '../src/automations/management.js';
import {reconcileRecipeSetups} from '../src/automations/recipes.js';
import {AppActions,dispatchAppActions} from '../src/app-services/service.js';
import {runFoundation} from '../src/foundation/worker.js';
import {inspectAppDesign} from '../src/workspace/design-quality.js';
import {withTemplateBindings} from '../src/workspace/role-contracts.js';
import type {Actor} from '../src/shared/schema.js';
import {text,suite} from './fixtures/trial-radar-db.js';
/* BIO_RADAR.md §5 for the kit and Trial Radar, end to end: a disposable database with every migration and the runtime role, the real
 * catalog installer and Use existing data? step, the app in the production runtime, reviewed changes confirmed by a person, the shared
 * research runner, the app's read-only functions, the scan + digest and alert email actions and their delivery jobs, and archive first.
 * Fixture (readable): one owner "Ana (fictional)", one workspace, Trial Radar with two scopes; every company, registry ID and URL is invented. */
const SCREENS=['overview','tracker','events','setup'];

test('Trial Radar installs from the catalog with its read-only functions; four screens render; design gate passes',async()=>{
 process.env.APP_AUTOMATION_RECIPES_ENABLED='true';
 const x=await suite();
 try{await withActor(x.human,async()=>{
  const w=await x.workspace('Radar');const {step,receipt}=await x.install(w);
  assert.deepEqual(step.automations.map((r:any)=>r.key),['scan','alert']);assert.equal(step.functions.length,3);
  const c=await x.comp(w,receipt.appId),map=x.mapOf(c);
  assert.deepEqual(c.execution.map((b:any)=>b.name).sort(),['alert_summary','brief','digest_summary']);
  for(const role of ['trialradar.settings','trialradar.scopes','trialradar.trials','trialradar.events','trialradar.runs','organizations'])assert.ok(map[role],role);
  assert.ok(!map.programs,'programs is optional and only connected, never created');
  const ui=x.app(w,receipt.appId),frames:any[]=[];
  for(const section of SCREENS){const out=await ui.open({section,panel:null});assert.doesNotMatch(text(out.html),/could not be shown|Partial data/,section+': '+text(out.html).slice(0,400));frames.push({name:section,html:out.html,css:out.css});}
  assert.deepEqual((await inspectAppDesign(frames)).issues,[]);
 });}finally{delete process.env.APP_AUTOMATION_RECIPES_ENABLED;await x.pg.close();}
});

test('Acceptance 1–8, 10, 11 and the Trial extra: install on a ready runner; scheduled runs read the brief and write trials (EU CT numbers), events and runs; the app writes the digest and alert; Intel unreachable falls back to ClinicalTrials.gov; field edits keep the scan running; archive pauses',async()=>{
 const x=await suite();const oldKey=process.env.CONNECTOR_ENCRYPTION_KEY;process.env.CONNECTOR_ENCRYPTION_KEY=randomBytes(32).toString('base64');process.env.APP_AUTOMATION_RECIPES_ENABLED='true';
 const transport=async(req:any)=>{const body=JSON.parse(req.body);return {status:200,body:body.type==='verification'?JSON.stringify({challenge:body.challenge}):'{}',bytes:2,durationMs:1};};
 const gpt:Actor={userId:x.human.userId,origin:'ai',connectionFamily:x.ai.connectionFamily,clientId:x.ai.clientId};
 const worker=<V>(fn:()=>Promise<V>)=>withDatabaseContext({service:'worker'},fn);
 try{await withActor(x.human,async()=>{
  const w=await x.workspace('Radar research');const s=new AutomationService(x.db),m=new AppMonitoring(x.db),manage=new AutomationManagement(x.db);
  // The owner's runner, connected and verified once (synthetic transport; no host or provider is contacted).
  const rp=await s.prepare(gpt,w,{preferences:{time:'06:00',timeZone:'Europe/Berlin'}});const runner=await s.confirm(x.human,w,rp.id,rp.digest);
  await new AutomationEvents(x.db,transport).subscribe(gpt,{name:'automation.ready',arguments:{workspaceId:w,runnerId:runner.id},delivery:{mode:'webhook',url:'https://callbacks.example.org/events',secret:'whsec_'+randomBytes(32).toString('base64')}} as any);
  const verify=(await s.agenda(gpt,w,runner.id)).rows[0],vc:any=await s.claim(gpt,w,{runnerId:runner.id,occurrenceId:verify.id,requestKey:randomUUID()});
  const [ready]=await Promise.all([s.setup(x.human,w,1),new Promise<void>((res,rej)=>setTimeout(()=>{void s.finish(gpt,w,{occurrenceId:verify.id,claimToken:vc.claimToken}).then(()=>res(),rej);},25))]);assert.equal(ready.state,'ready');

  // Acceptance 1: Add app offers both recommendations, selected; one approval creates them linked to the app on the runner.
  const {step,receipt}=await x.install(w);assert.deepEqual(step.automations.map((r:any)=>r.key),['scan','alert']);const id=receipt.appId,map=x.mapOf(await x.comp(w,id)),Tid=(r:string)=>map['trialradar.'+r].typeId;
  for(let i=0;i<4;i++){while(await worker(()=>reconcileRecipeSetups(x.db)));await x.pg.query("UPDATE automation_recipe_setups SET available_at=now() WHERE app_id=$1 AND status='pending'",[id]);}
  const setups=(await x.pg.query<any>('SELECT * FROM automation_recipe_setups WHERE app_id=$1 ORDER BY recipe_key',[id])).rows;assert.deepEqual(setups.map((r:any)=>[r.recipe_key,r.status]),[['alert','active'],['scan','active']],JSON.stringify(setups.map((r:any)=>r.diagnostic)));
  const scan=setups.find((r:any)=>r.recipe_key==='scan'),mon={id:scan.definition_id,version:scan.definition_version},digestAction=scan.follow_up_id,alertAction=setups.find((r:any)=>r.recipe_key==='alert').definition_id;
  assert.ok(digestAction,'scan + digest is one automation: its email step is linked to the research');
  const actions=(await x.pg.query<any>('SELECT id,config,follow_up_of FROM app_actions WHERE app_id=$1',[id])).rows;
  assert.equal(actions.find((a:any)=>a.id===digestAction).follow_up_of,mon.id);assert.equal(actions.find((a:any)=>a.id===alertAction).config.trigger.automationId,mon.id);
  assert.deepEqual(actions.find((a:any)=>a.id===digestAction).config.steps[0].to,['ana@northwind.invalid'],'recipients default to the owner');
  const listed=(await manage.list(x.human,w,{appId:id})).rows;assert.deepEqual(listed.find((r:any)=>r.id===mon.id).connectors,['chatgpt','email']);
  const due=(await x.pg.query<any>('SELECT next_at FROM automation_dispatch WHERE monitor_id=$1',[mon.id])).rows[0].next_at;assert.equal(new Date(due).getUTCDay(),1,'Monday');
  // Grants: trials create/update at run time (user-owned fields excluded), events and runs create-only; nothing else.
  const read=await m.read(gpt,w,mon.id),grants=read.context.writeScopes.map((g:any,i:number)=>({scopeId:read.config.writeScopes[i].scopeId,typeId:g.body.bindings[0].typeId,create:g.body.allowCreate,update:g.body.allowUpdate,fields:g.body.bindings[0].fields,dynamic:g.body.bindings[0].dynamic}));
  assert.deepEqual(grants.map((g:any)=>[g.typeId,g.create,g.update,g.dynamic]).sort(),[[Tid('trials'),true,true,true],[Tid('events'),true,false,true],[Tid('runs'),true,false,true]].sort());
  const G=(t:string)=>grants.find((g:any)=>g.typeId===Tid(t));for(const k of ['watched','seen_run_id','dismissed','user_notes'])assert.ok(!G('trials').fields.includes(k),k+' is never granted');
  assert.ok(G('events').fields.includes('status')&&!G('events').fields.includes('dismiss_reason'));

  // Acceptance 2: a scope from Setup (prefilled sources, TrialAgents Intel first), approved by the owner.
  const ui=x.app(w,id);await ui.open({section:'setup'});await ui.click('new:scope');
  await ui.submit('save-scope',{name:'IPF competitors (fictional)',def_indication:'idiopathic pulmonary fibrosis',def_phases:'phase_2, phase_3',src_name_0:'TrialAgents Intel (EU CTIS)',src_priority_0:'1',src_name_1:'ClinicalTrials.gov',src_priority_1:'2',src_name_2:'WHO ICTRP',src_priority_2:'3',src_name_3:'Company releases',src_priority_3:'4',status:'active'});await ui.approve();
  const scopeId=(await x.rows(Tid('scopes')))[0].id;

  /** One scheduled occurrence: claim, read the brief (the app's function, run by the worker), save rows through the grants, finish. */
  const today=new Date().toISOString().slice(0,10);
  async function run(save:(c:any,b:any)=>Promise<any>,result:any){
   const cur=await m.read(gpt,w,mon.id);await x.pg.query("INSERT INTO automation_occurrences(id,workspace_id,user_id,runner_id,monitor_id,monitor_version,occurrence_key,due_at,reason) VALUES($1,$2,$3,$4,$5,$6,$7,now(),'scheduled_due')",[randomUUID(),w,x.human.userId,runner.id,mon.id,cur.version,'weekly-'+randomUUID()]);
   const occ=(await s.agenda(gpt,w,runner.id)).rows.find((r:any)=>r.monitor_id===mon.id)!,c:any=await s.claim(gpt,w,{runnerId:runner.id,occurrenceId:occ.id,requestKey:randomUUID()});
   let b:any=await withActor(gpt,()=>m.brief(gpt,w,c.runId));for(let i=0;i<5&&b.state!=='ready';i++){await worker(()=>runFoundation(x.db));b=await withActor(gpt,()=>m.brief(gpt,w,c.runId));}assert.equal(b.state,'ready');
   await save(c,b.context);await s.finish(gpt,w,{occurrenceId:occ.id,claimToken:c.claimToken,result:typeof result==='function'?result(c):result});return {c,b:b.context};}
  const write=(c:any,t:string,changes:any[])=>withActor(gpt,()=>x.f.maintain(gpt,w,{scopeId:G(t).scopeId,expectedScopeVersion:0,requestKey:randomUUID(),sourceLabel:'https://registry.example.invalid',interpretation:'Trial registry changes (fictional)',changes} as any,undefined,false,c.runId));
  const src=(k:string)=>JSON.stringify([{title:'Registry record (fictional)',url:'https://registry.example.invalid/'+k,date:today}]);
  const report=(s:any[])=>JSON.stringify([{scope_id:scopeId,sources:s}]);
  const runRow=(c:any,b:any,s:any[],extra:any={})=>({kind:'create_record',typeId:Tid('runs'),data:{run_id:c.runId,scope_ids:JSON.stringify([scopeId]),kind:b.active_scopes[0].run_kind,run_on:today,assistant:'chatgpt',research_template_version:b.research_template.version,sources_report:report(s),status:'completed',summary:'Two new trials registered; one recruiting.',...extra}});
  const SOURCES=(intel:string,who='not_reachable')=>[{name:'TrialAgents Intel (EU CTIS)',status:intel,note:intel==='used'?'EU CT numbers recorded':'Connector unavailable (fictional)'},{name:'ClinicalTrials.gov',status:'used',note:''},{name:'WHO ICTRP',status:who,note:''},{name:'Company releases',status:'not_relevant',note:''}];
  const rounds:number[]=[];const mails=async()=>{const sent:any[]=[];rounds.length=0;const {dispatchNotificationBatch}=await import('../src/app-services/notifications.js');const {processServiceJob}=await import('../src/app-services/jobs.js');
   await x.pg.query("UPDATE app_actions SET next_at=now()-interval '1 day' WHERE app_id=$1",[id]);await worker(()=>dispatchAppActions(x.db));await worker(()=>dispatchAppActions(x.db));
   /* The platform sends at most one email per recipient per rolling hour. Each round: batches (and their summary functions), then jobs; then an hour passes. */
   for(let round=0;round<3;round++){const before=sent.length;
    for(let i=0;i<3;i++){await x.pg.query("UPDATE app_notification_batches SET not_before=now()-interval '1 day' WHERE app_id=$1 AND status IN ('collecting','sending')",[id]);while(await worker(()=>dispatchNotificationBatch(x.db)));await worker(()=>runFoundation(x.db));}
    await x.pg.query("UPDATE app_service_jobs SET available_at=now()-interval '1 minute' WHERE status='queued'");while(await worker(()=>processServiceJob(x.db,{email:async(p:any)=>{sent.push(p);return {id:'provider-'+sent.length};}})));
    rounds.push(sent.length-before);await x.pg.query("UPDATE app_notification_reservations SET reserved_at=reserved_at-interval '2 hours',attempted_at=attempted_at-interval '2 hours'");}
   return sent.map((p:any)=>({to:JSON.stringify(p),subject:String(p.subject??p.message?.subject??''),text:String(p.text??p.message?.text??'')}));};

  // Run 1 (build), Intel reachable: trials keyed by EU CT number, events, the run with its source report.
  const r1=await run(async(c,b)=>{
   assert.equal(b.active_scopes.length,1);assert.equal(b.active_scopes[0].sources.named[0].name,'TrialAgents Intel (EU CTIS)');assert.equal(b.active_scopes[0].run_kind,'build');assert.deepEqual(b.research_template.rules.slice(0,8),(await import('../templates/source/radar-kit/kit.mjs')).REQUIRED_RULES);
   await write(c,'trials',[{kind:'create_record',typeId:Tid('trials'),data:{natural_key:'2025-512345-12-00',registry_ids:'2025-512345-12-00, NCT09990101',title:'A phase 3 study of FX-301 in IPF (fictional)',sponsor_name:'Maplecrest Pharma (fictional)',phase:'phase_3',status:'recruiting',primary_completion:'2027-06-30',completion_estimated:true,scope_id:scopeId,sources:src('2025-512345-12-00'),last_verified_on:today,last_changed_run_id:c.runId,changed_fields:'["new"]'}},
    {kind:'create_record',typeId:Tid('trials'),data:{natural_key:'2025-523456-20-00',registry_ids:'2025-523456-20-00',title:'A phase 2 study of LT-12 in IPF (fictional)',sponsor_name:'Quillmont Bio (fictional)',phase:'phase_2',status:'not_yet_recruiting',scope_id:scopeId,sources:src('2025-523456-20-00'),last_verified_on:today,last_changed_run_id:c.runId,changed_fields:'["new"]'}}]);
   const trials=await x.rows(Tid('trials'));
   await write(c,'events',trials.map((t:any)=>({kind:'create_record',typeId:Tid('events'),data:{scope_id:scopeId,item_id:t.id,natural_key:t.data.natural_key+'|trial_registered|'+today,kind:'trial_registered',title:'Registered: '+t.data.title,occurred_on:today,occurred_month:today.slice(0,7),impact:'medium',direction:'threat',sources:t.data.sources,run_id:c.runId,status:'new'}})));
   await write(c,'runs',[runRow(c,b,SOURCES('used'),{items_added:2,events_added:2})]);
   // Grants hold: research cannot set a user-owned field, change an event, or save an unsourced row.
   await assert.rejects(()=>write(c,'trials',[{kind:'update_record',recordId:trials[0].id,expectedVersion:0,data:{watched:true}}]),'watched is never granted');
   const ev=(await x.rows(Tid('events')))[0];await assert.rejects(()=>write(c,'events',[{kind:'update_record',recordId:ev.id,expectedVersion:0,data:{title:'Rewritten'}}]),'events are create-only');
   await assert.rejects(()=>write(c,'trials',[{kind:'create_record',typeId:Tid('trials'),data:{natural_key:'NCT09990999',title:'Unsourced (fictional)',scope_id:scopeId}}]),'sources are required');
  },{status:'completed',summary:'Built Trial Radar: 2 trials.',findings:[{title:'2 trials registered',detail:'Fictional',relevant:true}]});
  const trials=await x.rows(Tid('trials'));assert.deepEqual(trials.map((t:any)=>t.data.natural_key).sort(),['2025-512345-12-00','2025-523456-20-00'],'Trial extra: Intel reachable records EU CT numbers');
  // Acceptance 3: the digest is written by the app's function from the run's rows; no alert (no watched high-impact event).
  let sent=await mails();assert.equal(sent.length,1,JSON.stringify(sent.map(s=>s.subject)));assert.match(sent[0].subject,/^Trial Radar · .*: 0 high-impact · 2 new · \d+ dates in 90 days$/);assert.match(sent[0].text,/Coverage: TrialAgents Intel \(EU CTIS\), ClinicalTrials.gov · not reachable: WHO ICTRP/);assert.match(sent[0].to,/ana@northwind\.invalid/);
  assert.ok(sent[0].text.split(/\s+/).length<=230);

  // The owner watches FX-301; Acceptance 5: edits the research template (version 2), which the next brief uses.
  await ui.open({section:'tracker'});const fx=trials.find((t:any)=>t.data.natural_key==='2025-512345-12-00');await ui.click('watch:'+fx.id);await ui.approve();
  await ui.open({section:'setup',ssub:'template'});await ui.submit('save-template',{instruction:'Watch IPF trials; EU first (fictional edit).',rules:'Prefer EU CT numbers.',note:'EU first'});await ui.approve();
  // Run 2 (refresh), Intel unreachable: the report says so and the run uses ClinicalTrials.gov (NCT IDs); a high-impact change on the watched trial.
  await run(async(c,b)=>{
   assert.equal(b.research_template.version,2);assert.equal(b.research_template.instruction,'Watch IPF trials; EU first (fictional edit).');assert.equal(b.active_scopes[0].run_kind,'refresh');assert.ok(b.recorded.trials.includes('2025-512345-12-00'));
   const t=(await x.rows(Tid('trials'))).find((r:any)=>r.id===fx.id);
   await write(c,'trials',[{kind:'update_record',recordId:fx.id,expectedVersion:t.version,data:{status:'suspended',last_changed_run_id:c.runId,changed_fields:'["status"]',last_verified_on:today}},{kind:'create_record',typeId:Tid('trials'),data:{natural_key:'NCT09990202',registry_ids:'NCT09990202',title:'A phase 2 study of BX-7 in IPF (fictional)',phase:'phase_2',status:'recruiting',scope_id:scopeId,sources:src('NCT09990202'),last_verified_on:today,last_changed_run_id:c.runId,changed_fields:'["new"]'}}]);
   await write(c,'events',[{kind:'create_record',typeId:Tid('events'),data:{scope_id:scopeId,item_id:fx.id,natural_key:'2025-512345-12-00|status_change|'+today,kind:'status_change',title:'FX-301 suspended (fictional)',occurred_on:today,occurred_month:today.slice(0,7),impact:'high',direction:'opportunity',so_what:'A competitor pause may open sites for NWB-101 (fictional).',sources:src('NCT09990101'),run_id:c.runId,status:'new'}}]);
   await write(c,'runs',[runRow(c,b,SOURCES('not_reachable'),{research_template_version:b.research_template.version,items_added:1,items_updated:1,events_added:1})]);
  },{status:'completed',summary:'FX-301 suspended.',findings:[{title:'FX-301 suspended',detail:'Fictional',relevant:true}]});
  sent=await mails();const subjects=sent.map(s=>s.subject).sort();assert.equal(sent.length,2,JSON.stringify(subjects));assert.equal(rounds[0],1,'the email limit holds the second email of the hour back');
  const alertMail=sent.find(s=>/alert/.test(s.subject))!;assert.match(alertMail.subject,/^Trial Radar alert · A phase 3 study of FX-301 in IPF \(fictional\): FX-301 suspended/);assert.match(alertMail.text,/Why it matters: A competitor pause/);
  assert.match(sent.find(s=>!/alert/.test(s.subject))!.text,/not reachable: TrialAgents Intel \(EU CTIS\), WHO ICTRP/);
  assert.ok((await x.rows(Tid('trials'))).some((t:any)=>t.data.natural_key==='NCT09990202'),'Trial extra: Intel unreachable, the run continues on ClinicalTrials.gov');
  await ui.open({section:'overview'});assert.match(text(ui.html),/TrialAgents Intel \(EU CTIS\) Not reachable Connector unavailable \(fictional\)/);assert.doesNotMatch(text(ui.html),/not reachable in the last 3 runs/);

  // Acceptance 6 and E6: the owner adds a custom field; the scan stays ready, the brief lists it and research can write it.
  const c0=await x.comp(w,id),typeId=Tid('trials'),type=(await x.pg.query<any>('SELECT version,fields FROM entity_types WHERE id=$1',[typeId])).rows[0];
  const sv=async(op:any)=>{const p=await x.s.preview(x.human,w,op);return x.s.commit(x.human,p.id,p.digest);};
  await sv({kind:'update_type',typeId,expectedVersion:type.version,name:'Trials',fields:[...type.fields,{key:'biomarker',name:'Biomarker',kind:'text',ai:true}]});
  const manifest={...c0.manifest,fields:[...c0.manifest.fields,{...c0.manifest.fields.find((f:any)=>f.typeId===typeId&&f.field==='title'),id:'biomarker',field:'biomarker',label:'Biomarker'}]};
  // A reviewed app save binds the field and updates the source's templateBindings header (as the platform's integration path does).
  const nb=c0.bindings.map((b:any)=>b.typeId===typeId?{...b,fields:[...b.fields,'biomarker']}:b);
  const pv=await x.f.preview(x.human,w,{kind:'save_component',componentId:c0.id,expectedVersion:c0.version,projectId:c0.project_id,content:{name:c0.name,format:c0.format,source:withTemplateBindings(c0.source,nb),sourceAccess:c0.source_access,manifest,execution:c0.execution,bindings:nb}});await x.f.confirm(x.human,w,pv.id,pv.digest);
  assert.equal((await m.read(gpt,w,mon.id)).availability,'ready','no re-approval after a field is added');
  // Run 3, WHO ICTRP unreachable for the third time: the hint appears.
  await run(async(c,b)=>{assert.ok(b.current_fields.some((f:any)=>f.key==='biomarker'&&f.custom),'the brief lists the custom field');assert.match(b.return_format['trialradar.trials'].biomarker,/custom field/);
   const t=(await x.rows(Tid('trials'))).find((r:any)=>r.data.natural_key==='NCT09990202');await write(c,'trials',[{kind:'update_record',recordId:t.id,expectedVersion:t.version,data:{biomarker:'MUC5B (fictional)',last_changed_run_id:c.runId,changed_fields:'["biomarker"]',last_verified_on:today}}]);
   await write(c,'runs',[runRow(c,b,SOURCES('used'),{items_updated:1})]);},{status:'completed',summary:'Biomarker recorded.',findings:[{title:'Biomarker',detail:'Fictional',relevant:true}]});
  assert.equal((await x.rows(Tid('trials'))).find((r:any)=>r.data.natural_key==='NCT09990202').data.biomarker,'MUC5B (fictional)');
  await ui.open({section:'overview'});assert.match(text(ui.html),/WHO ICTRP was not reachable in the last 3 runs/);
  await ui.open({section:'tracker'});assert.match(text(ui.html),/Biomarker/);assert.match(text(ui.html),/MUC5B \(fictional\)/);
  await mails();

  // With no active scope a run saves nothing and finishes no_update: no digest, no alert.
  await ui.open({section:'setup'});await ui.click('scope-status:'+scopeId+':paused');await ui.approve();
  await run(async(_c,b)=>{assert.equal(b.active_scopes.length,0);assert.match(b.nothing_to_do,/no_update/);},{status:'no_update',summary:'No active scope.'});
  assert.equal((await mails()).length,0);

  // Acceptance 11: archiving the app pauses the scan, its digest and the alert; restoring brings them back switched off.
  const change=async(op:any)=>{const p=await x.f.preview(x.human,w,op);return x.f.confirm(x.human,w,p.id,p.digest);};
  await change({kind:'archive_component',componentId:id,expectedVersion:(await x.comp(w,id)).version,archived:true});
  assert.ok((await x.pg.query<any>('SELECT archived_with_app_at FROM app_monitors WHERE id=$1',[mon.id])).rows[0].archived_with_app_at);
  for(const a of [digestAction,alertAction])assert.ok((await x.pg.query<any>('SELECT archived_with_app_at FROM app_actions WHERE id=$1',[a])).rows[0].archived_with_app_at);
  await change({kind:'archive_component',componentId:id,expectedVersion:(await x.comp(w,id)).version,archived:false});
  assert.equal((await x.pg.query<any>('SELECT enabled FROM app_monitors WHERE id=$1',[mon.id])).rows[0].enabled,false,'restored switched off');
  void r1;
 });}finally{process.env.CONNECTOR_ENCRYPTION_KEY=oldKey;delete process.env.APP_AUTOMATION_RECIPES_ENABLED;await x.pg.close();}
});

test('Acceptance 1 without a runner: the scan shows Needs setup, the alert waits, nothing runs and every screen works',async()=>{
 process.env.APP_AUTOMATION_RECIPES_ENABLED='true';const x=await suite();
 try{await withActor(x.human,async()=>{
  const w=await x.workspace('No runner');const {receipt}=await x.install(w);
  for(let i=0;i<4;i++)await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(x.db));
  const rows=(await x.pg.query<any>('SELECT recipe_key,status,diagnostic FROM automation_recipe_setups WHERE app_id=$1 ORDER BY recipe_key',[receipt.appId])).rows;
  assert.deepEqual(rows.map((r:any)=>r.recipe_key),['alert','scan']);assert.equal(rows.find((r:any)=>r.recipe_key==='scan').status,'needs_setup');assert.notEqual(rows.find((r:any)=>r.recipe_key==='alert').status,'active','the alert waits for the scan');
  assert.equal((await x.pg.query('SELECT id FROM app_monitors WHERE app_id=$1',[receipt.appId])).rows.length,0);assert.equal((await x.pg.query('SELECT id FROM app_actions WHERE app_id=$1',[receipt.appId])).rows.length,0);
  const ui=x.app(w,receipt.appId);for(const section of SCREENS){await ui.open({section});assert.doesNotMatch(text(ui.html),/could not be shown|Partial data/,section);}
  // Opting out of both at install also leaves a fully working app (app independence).
  const opted=await x.install(w,'Trial Radar (no automations)',false);for(let i=0;i<2;i++)await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(x.db));
  assert.equal((await x.pg.query('SELECT id FROM automation_recipe_setups WHERE app_id=$1',[opted.receipt.appId])).rows.length,0);
  const u2=x.app(w,opted.receipt.appId);await u2.open({section:'setup'});await u2.click('new:scope');await u2.submit('save-scope',{name:'Manual (fictional)',def_indication:'x',src_name_0:'ClinicalTrials.gov',status:'active'});await u2.approve();
  assert.equal((await x.rows(x.mapOf(await x.comp(w,opted.receipt.appId))['trialradar.scopes'].typeId)).length,1);
 });}finally{delete process.env.APP_AUTOMATION_RECIPES_ENABLED;await x.pg.close();}
});

test('Acceptance 9 and modularity: trialradar.events (radar.v1) has one writer; another app reads it read-only and leaves dismissed rows out; Programs connects when installed and its archive leaves the radar working',async()=>{
 const x=await suite();
 try{await withActor(x.human,async()=>{
  const w=await x.workspace('Readers');
  await x.pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.project-oversight' AND version='2.1.0'");
  const catalog=new AppTemplates(undefined,x.db),programs=await catalog.read({templateId:'life.project-oversight',version:'2.1.0'});
  const pt={install:{templateId:programs.id,version:programs.version,digest:programs.digest,name:'Programs',requestKey:randomUUID()}},ps=await dataAccessStep(x.f,x.human,w,pt);const pr=ps.needed?await confirmDataAccess(x.f,x.human,w,{...pt,connections:{},stepDigest:ps.digest}):null;
  const progApp=pr!.appId;const {receipt}=await x.install(w);const id=receipt.appId,map=x.mapOf(await x.comp(w,id));
  assert.ok(map.programs,'Programs shared at install');assert.deepEqual(map.programs.writableFields,[],'read-only');
  const progMap=x.mapOf(await x.comp(w,progApp));assert.equal(map.programs.typeId,progMap.programs.typeId);
  await x.save(w,map.programs.typeId,{name:'NWB-101 (fictional)',stage:'phase_2',archived:false});
  const ui=x.app(w,id);await ui.open({section:'setup'});await ui.click('new:scope');assert.match(text(ui.html),/NWB-101 \(fictional\)/,'the scope can link a program');
  // Events written by the radar (here by the owner) with every status.
  const E=map['trialradar.events'].typeId,scope=await x.save(w,map['trialradar.scopes'].typeId,{name:'S (fictional)',definition:'{}',sources:'[]',status:'active'});
  for(const status of ['new','reviewed','dismissed'])await x.save(w,E,{scope_id:scope,natural_key:'K|readout|2026-12-01|'+status,kind:'readout',title:'Readout '+status+' (fictional)',impact:'high',sources:'[{"title":"x","url":"https://x.invalid"}]',status});
  // A reader app binds the output read-only through its role (radar.v1); a second writer is refused.
  const fields=['scope_id','natural_key','kind','title','impact','status','occurred_on','expected'],etype=(await x.pg.query<any>('SELECT version,fields FROM entity_types WHERE id=$1',[E])).rows[0];
  const mf=(mode:string)=>fields.map(f=>({id:f,typeId:E,field:f,schemaVersion:etype.version,kind:etype.fields.find((y:any)=>y.key===f).kind,mode,label:f}));
  const reader=await x.f.preview(x.human,w,{kind:'save_component',content:{name:'Radar reader (fictional)',format:'frontend-js',sourceAccess:'bindings',source:"const r=tools.call('records.read',{typeId:'"+E+"',limit:100});return {html:'<main><h1>Reader</h1><p>'+r.rows.filter(x=>x.data.status!=='dismissed').map(x=>x.data.title).join(', ')+'</p></main>'};",bindings:[{typeId:E,fields}],manifest:{version:1,scope:'workspace',fields:mf('read'),roles:[{role:'trialradar.events',contract:'radar.v1',readOnly:true,typeId:E}]}}});
  const saved=await x.f.confirm(x.human,w,reader.id,reader.digest);
  const out:any=await x.f.runFrontend(x.human,w,{componentId:saved.id,expectedVersion:(await x.comp(w,saved.id)).version,state:{},event:{kind:'open',action:'',value:null,form:{}}});
  assert.match(text(out.html),/Readout new \(fictional\), Readout reviewed \(fictional\)/);assert.doesNotMatch(text(out.html),/Readout dismissed/);
  await assert.rejects(async()=>{const p=await x.f.preview(x.human,w,{kind:'save_component',content:{name:'Second writer (fictional)',format:'frontend-js',sourceAccess:'bindings',source:"return {html:'<main><h1>W</h1></main>'};",bindings:[{typeId:E,fields}],manifest:{version:1,scope:'workspace',fields:mf('write'),roles:[{role:'trialradar.events',contract:'radar.v1',typeId:E}]}}});await x.f.confirm(x.human,w,p.id,p.digest);},/Trial Radar writes Trial Radar events\. Bind it read-only/);
  // Archiving Programs leaves Trial Radar working.
  const change=async(op:any)=>{const p=await x.f.preview(x.human,w,op);return x.f.confirm(x.human,w,p.id,p.digest);};
  await change({kind:'archive_component',componentId:progApp,expectedVersion:(await x.comp(w,progApp)).version,archived:true});
  for(const section of SCREENS){await ui.open({section,panel:null});assert.doesNotMatch(text(ui.html),/could not be shown/,section);}
 });}finally{await x.pg.close();}
});

test('Acceptance 12 and 13: 5,000 events and 2,000 trials in the real runtime stay responsive; populated screens pass the design gate at 1440 and 390',async()=>{
 const x=await suite();
 try{await withActor(x.human,async()=>{
  const w=await x.workspace('Load');const {receipt}=await x.install(w);const id=receipt.appId,map=x.mapOf(await x.comp(w,id)),Tid=(r:string)=>map['trialradar.'+r].typeId;
  const scope=await x.save(w,Tid('scopes'),{name:'IPF (fictional)',definition:'{"indication":"IPF"}',sources:JSON.stringify([{name:'TrialAgents Intel (EU CTIS)',priority:1}]),status:'active'});
  const run=randomUUID();await x.save(w,Tid('runs'),{run_id:run,scope_ids:JSON.stringify([scope]),kind:'refresh',run_on:'2026-11-16',sources_report:JSON.stringify([{scope_id:scope,sources:[{name:'TrialAgents Intel (EU CTIS)',status:'used',note:''}]}]),status:'completed',summary:'Load run (fictional).'});
  await x.pg.query(`INSERT INTO records(id,workspace_id,type_id,data,state) SELECT gen_random_uuid(),$1,$2,jsonb_build_object('natural_key','2026-5'||lpad(i::text,5,'0')||'-10-00','title','Load trial '||i||' (fictional)','scope_id',$3::text,'phase',(ARRAY['phase_2','phase_3'])[1+i%2],'status','recruiting','enrollment',100+i,'primary_completion','2027-0'||(1+i%9)||'-15','completion_estimated',i%2=0,'sources','[{"title":"Registry (fictional)","url":"https://registry.example.invalid/x"}]','watched',i%50=0,'last_changed_run_id',CASE WHEN i%100=0 THEN $4 END,'changed_fields','["status"]'),'approved' FROM generate_series(1,2000) i`,[w,Tid('trials'),scope,run]);
  await x.pg.query(`INSERT INTO records(id,workspace_id,type_id,data,state) SELECT gen_random_uuid(),$1,$2,jsonb_build_object('natural_key','K'||i||'|status_change|2026-11-0'||(1+i%9),'kind','status_change','title','Load event '||i||' (fictional)','scope_id',$3::text,'occurred_on','2026-1'||(i%2)||'-0'||(1+i%9),'occurred_month','2026-1'||(i%2),'impact',(ARRAY['high','medium','low','none'])[1+i%4],'status',CASE WHEN i%3=0 THEN 'new' ELSE 'reviewed' END,'sources','[{"title":"Registry (fictional)","url":"https://registry.example.invalid/e"}]','run_id',CASE WHEN i%500=0 THEN $4 ELSE 'x' END),'approved' FROM generate_series(1,5000) i`,[w,Tid('events'),scope,run]);
  const ui=x.app(w,id),frames:any[]=[],times:Record<string,number>={};
  for(const [name,st] of [['overview',{section:'overview'}],['tracker',{section:'tracker'}],['events',{section:'events'}],['feed',{section:'events',esub:'feed'}],['calendar',{section:'events',esub:'calendar',month:'2026-11'}],['setup',{section:'setup'}],['template',{section:'setup',ssub:'template'}],['fields',{section:'setup',ssub:'fields'}]] as const){
   const t0=performance.now(),out=await ui.open({...st,panel:null});times[name]=Math.round(performance.now()-t0);
   assert.doesNotMatch(text(out.html),/could not be shown|Partial data/,name);frames.push({name,html:out.html,css:out.css});}
  assert.match(text(frames.find(f=>f.name==='tracker').html),/2,?000 trials/);assert.match(text(frames.find(f=>f.name==='feed').html),/5,?000 events/);
  // Bounded pages: the slowest screen renders well under the runtime's 15 s limit even on the in-process test database.
  assert.ok(Math.max(...Object.values(times))<10000,JSON.stringify(times));
  await ui.open({section:'tracker'});const t0=performance.now();for(let i=0;i<3;i++)await ui.click('next-page');assert.ok(performance.now()-t0<20000);
  const item=(await x.pg.query<any>("SELECT id,data FROM records WHERE type_id=$1 AND data->>'last_changed_run_id' IS NOT NULL LIMIT 1",[Tid('trials')])).rows[0];
  await ui.open({section:'tracker',page:0});await ui.click('open:item:'+item.id+':'+item.data.natural_key);frames.push({name:'trial panel',html:ui.html,css:ui.last.css});
  assert.deepEqual((await inspectAppDesign(frames)).issues,[],'1440 and 390 px');
  console.log('# Trial Radar render times (ms, in-process PGlite):',JSON.stringify(times));
 });}finally{await x.pg.close();}
});
