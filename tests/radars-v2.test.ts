import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {appTemplateEntry} from '../src/workspace/app-templates.js';
import {validateRecipeDeclarations} from '../src/automations/recipes-schema.js';
import {validateAppFunctions} from '../src/workspace/app-functions-schema.js';
import {isV2Source} from '../src/workspace/browser-runtime.js';
import * as kit from '../templates/source/radar-kit/kit.mjs';
import {radarV2,type Row} from './fixtures/radar-v2.js';

/* 7.3 / 7.4: the eight Bio Radars rebuilt on kit 2.0.0 and the v2 app contract (G2–G8, G11, P3–P5, P9), in production QuickJS with the
 * platform kit in front (tests/fixtures/radar-v2.ts). The released 1.x versions (2.x for Literature) keep their own tests
 * (tests/radars.test.ts, tests/trial-radar.test.ts) and packages. */
const RADARS:[string,string,string[]][]=[['trial-radar','2.0.0',['1.0.0','1.0.1']],['pipeline-radar','2.0.0',['1.0.0','1.0.1']],['deal-radar','2.0.0',['1.0.0','1.0.1']],['funding-radar','2.0.0',['1.0.0','1.0.1']],
 ['patent-radar','2.0.0',['1.0.0','1.0.1']],['market-radar','2.0.0',['1.0.0','1.0.1']],['regulatory-radar','2.0.0',['1.0.0','1.0.1']],['literature-radar','3.0.0',['2.0.0','2.0.1']]];
const canonical=(v:any):any=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
/** As src/workspace/app-update.ts compares helpers: only the generated version and kit labels may differ. */
const helpers=(fs:any[])=>canonical(fs.map(f=>({...f,source:f.source.replace(/"(version|kit)":"\d+\.\d+\.\d+"/g,'"$1":""')})));
const json=async(p:string)=>JSON.parse(await readFile(p,'utf8'));
const seed=await json('templates/catalog-seed.json'),installers=await json('templates/catalog-installers.json');
const REVIEW_TEXT=/prepared for (TrialAgents )?review|until a person approves|\(reviewed\)|Nothing changes until/i;

/** Every screen, view and panel of a radar with its demo data. */
async function frames(h:Awaited<ReturnType<typeof radarV2>>,s:any,rows:Row[]){
 const out:{name:string,html:string,out:any,calls:any[]}[]=[],add=(name:string)=>out.push({name,html:s.html,out:s.out,calls:s.calls});
 for(const screen of ['overview','tracker','events','scopes','settings']){await s.open({screen,panel:null,esub:'review'});add(screen);}
 await s.open({screen:'events',esub:'all',panel:null});add('events all');
 await s.open({screen:'events',esub:'calendar',month:'2026-11',panel:null});add('events calendar');
 const item=rows.find(r=>r.role===h.T('tracker'))!;await s.open({screen:'tracker',panel:null});await s.click('open:item:'+item.id+':'+item.data.natural_key);add('item panel');
 await s.click('mode:edit');add('item edit');
 const ev=rows.find(r=>r.role===h.T('events'))!;await s.open({screen:'events',esub:'all',panel:null});await s.click('open:event:'+ev.id+':'+ev.data.natural_key);add('event panel');
 await s.open({screen:'scopes',panel:null});await s.click('new:scope');add('scope panel');
 await s.open({screen:'tracker',panel:null});await s.click('new:item');add('new item panel');
 await s.open({panel:null});
 return out;
}

for(const [slug,version,from] of RADARS){
 const h=await radarV2(slug),{radar,entry,T}=h;
 test(`${radar.name} ${version}: a v2 package with the same tables, contracts, automations and helpers as ${from.join(' and ')}; a draft`,async()=>{
  const raw=await json(`templates/apps/${radar.id}-${version}.json`);
  appTemplateEntry.parse(raw);validateRecipeDeclarations(raw);validateAppFunctions(raw,Object.keys(h.schema));
  assert.equal(radar.version,version);assert.equal(radar.kit,'2.0.0');assert.deepEqual(raw.upgradeFrom,from);
  // The marker is the template body's first line; the kit and its styles come from the platform.
  assert.equal(raw.source.split('\n')[0],"'use trialagents v2';");assert.ok(isV2Source(`const templateConfiguration={};\nconst templateBindings=[];\n${raw.source}`));
  assert.ok(raw.source.length<240000&&raw.source.length<80000,String(raw.source.length));
  assert.doesNotMatch(raw.source,/records\.propose|templateLayoutSchema|tracker:layout|rd-banner|rd-foot|<header|<h1/);
  assert.ok(!/const kit=/.test(raw.source),'no copy of the platform kit');
  // Options: tableMap and the installer's defaults stay; the old design's heading, layout profile and demo label are gone.
  assert.deepEqual(Object.keys(raw.options),['tableMap','pageSize','readOnly','asOfOverride']);
  for(const old of from){
   const prev=await json(`templates/apps/${radar.id}-${old}.json`),prevSchema=await json(installers[radar.id+'@'+old]);
   assert.deepEqual(helpers(raw.functions),helpers(prev.functions),'helpers as in '+old);
   assert.deepEqual(raw.recommendedAutomations,prev.recommendedAutomations,'automations as in '+old);
   assert.equal(JSON.stringify(prevSchema),JSON.stringify(h.schema),'installer schema as in '+old);
   assert.equal(Object.keys(prev.options).includes('tableMap'),true);
   assert.match(installers[radar.id+'@'+old],/\/archive\//,'the released version points to its archive');
  }
  assert.equal(installers[radar.id+'@'+version],'templates/source/radars/'+slug+'/schema.example.json');
  assert.notEqual(seed[radar.id].version,version,'a draft: the owner approves new versions (O4)');
  const outputs=(await json('templates/contracts/outputs.json')).roles;assert.equal(outputs[T('events')].writer,radar.id);
  assert.match(raw.instructions,/records\.save/);assert.doesNotMatch(raw.instructions+JSON.stringify(raw.documentation),/records\.propose|layout gear|Setup →|a person approves/);
 });

 test(`${radar.name} ${version}: every screen and panel renders with the kit; no own header, banner, footer or review wording; one batched read per screen`,async()=>{
  const rows=h.fresh(),s=h.session(rows),all=await frames(h,s,rows);
  for(const f of all){
   assert.doesNotMatch(f.html,/<header(?![^>]*>\s*<h2)|<h1|rd-banner|rd-foot|role="alert"|position:\s*fixed/,f.name);
   assert.doesNotMatch(h.text(f.html),REVIEW_TEXT,f.name);assert.doesNotMatch(h.text(f.html),/could not be shown|undefined|NaN/,f.name);
   assert.ok(f.calls.every((c:any)=>c.name!=='records.propose'),f.name);
   assert.ok(f.calls.filter((c:any)=>c.name.startsWith('records.read')).length<=3,f.name+': '+f.calls.map((c:any)=>c.name).join(','));
   assert.match(f.html,/class="k-app"/,f.name);assert.equal(f.out.notice,undefined,f.name+' '+JSON.stringify(f.out.notice));
  }
  assert.match(all.find(f=>f.name==='overview')!.html,/class="k-stat"/);assert.match(all.find(f=>f.name==='tracker')!.html,/class="k-table"/);
  assert.match(all.find(f=>f.name==='item panel')!.html,/class="k-panel"/);assert.match(all.find(f=>f.name==='item panel')!.html,/<div inert>/,'the screen behind a panel is inert');
  // No Automations, version history or "Build now" screens: those stay with the platform and the assistant.
  for(const f of all)assert.doesNotMatch(h.text(f.html),/Version history|Build now or refresh now|Return format the research uses|Export this page/,f.name);
  // The disclaimer is a quiet line in the Overview's content (and in every email), never a footer bar.
  if(radar.disclaimer){assert.match(h.text(all[0].html),new RegExp(radar.disclaimer.slice(0,16)));assert.match(all[0].html,/<p class="k-muted k-small">Not|<p class="k-muted k-small">[A-Z]/);}
 });

 test(`${radar.name} ${version}: edits save directly with the version shown when the edit started; Undo; notices instead of banners`,async()=>{
  const rows=h.fresh(),s=h.session(rows),tracker=rows.filter(r=>r.role===T('tracker')),item=tracker[0];
  const sel=radar.trackerFields.find((f:any)=>f.kind==='select'&&radar.listColumns.includes(f.key)&&!(radar.userOwnedFields||[]).includes(f.key))??radar.trackerFields.find((f:any)=>f.kind==='date'&&radar.listColumns.includes(f.key));
  await s.open({screen:'tracker'});
  // Inline: a select (or, for Market Radar, a date) value where it is shown.
  const value=sel.kind==='select'?sel.options.find((o:string)=>o!==item.data[sel.key]):item.data[sel.key]==='2027-03-15'?'2027-03-16':'2027-03-15';const v0=item.version;
  assert.match(s.html,new RegExp('data-action="edit:'+item.id+':'+sel.key+':'+v0+'"'));
  await s.change('edit:'+item.id+':'+sel.key+':'+v0,value);
  assert.deepEqual(s.saves,[{kind:'update_record',recordId:item.id,expectedVersion:v0,data:{[sel.key]:value}}]);
  assert.equal(item.data[sel.key],value);assert.equal(s.first.notice.kind,'success');
  // Undo is offered on the screen rendered after the save, and undoes it.
  const undo=/data-action="(undo:[^"]+)"/.exec(s.html);assert.ok(undo,'Undo offered');
  await s.click(undo![1]);assert.ok(s.calls.some((c:any)=>c.name==='undo.run'));assert.notEqual(item.data[sel.key],value);assert.equal(s.out.notice.kind,'success');assert.doesNotMatch(s.html,/data-action="undo:/);
  // Watch inline (a checkbox).
  const w=item.version,was=item.data.watched===true;await s.change('edit:'+item.id+':watched:'+w,!was);assert.deepEqual(s.saves,[{kind:'update_record',recordId:item.id,expectedVersion:w,data:{watched:!was}}]);
  // A side panel keeps the version it opened with: a change by someone else meanwhile is a conflict, not overwritten.
  await s.open({screen:'tracker',panel:null});await s.click('open:item:'+item.id+':'+item.data.natural_key);await s.click('mode:edit');const opened=item.version;
  item.version+=1;
  const form:any={sources:'Registry record https://example.invalid/x',user_notes:'Checked (fictional)'};
  const out=await s.ev({kind:'submit',action:'save-item',form}).catch((e:any)=>e);
  assert.ok(out instanceof Error&&/stale_value/.test(String(out)),'the save carried the opened version '+opened);
  item.version-=1;await s.submit('save-item',form);assert.equal(s.saves[0].expectedVersion,opened);assert.equal(item.data.user_notes,'Checked (fictional)');
  // Events: Mark reviewed carries the event's version; dismissing needs a reason (the error is a notice, next to nothing else).
  const ev=rows.find(r=>r.role===T('events')&&r.data.status==='new')!;await s.open({screen:'events',esub:'review',panel:null});
  await s.click('review:'+ev.id+':'+ev.version);assert.deepEqual(s.saves,[{kind:'update_record',recordId:ev.id,expectedVersion:ev.version-1,data:{status:'reviewed'}}]);
  const ev2=rows.find(r=>r.role===T('events')&&r.data.status==='new')!;await s.click('open:event:'+ev2.id+':'+ev2.data.natural_key);await s.click('mode:dismiss');
  await s.submit('dismiss-event',{dismiss_reason:''});assert.equal(s.saves.length,0);assert.deepEqual(s.out.notice,{kind:'error',message:'Give a reason for dismissing this event.'});assert.doesNotMatch(s.html,/rd-banner|role="alert"/);
  await s.submit('dismiss-event',{dismiss_reason:'Not our indication (fictional)'});assert.equal(s.saves[0].data.status,'dismissed');assert.equal(ev2.data.dismiss_reason,'Not our indication (fictional)');
  // Scopes: status in place; a new scope from the side panel; remove archives it.
  const scope=rows.find(r=>r.role===T('scopes'))!;await s.open({screen:'scopes',panel:null});await s.change('scope-status:'+scope.id+':'+scope.version,'paused');assert.deepEqual(s.saves[0],{kind:'update_record',recordId:scope.id,expectedVersion:scope.version-1,data:{status:'paused'}});
  await s.click('new:scope');const f:any={name:'New scope (fictional)',status:'active',src_name_0:radar.sources[0].name,src_priority_0:'1'};for(const sf of radar.scopeFields)f['def_'+sf.key]='x (fictional)';
  await s.submit('save-scope',f);assert.equal(s.saves[0].kind,'create_record');assert.equal((s.saves[0] as any).typeId,T('scopes'));
  const created=rows.find(r=>r.role===T('scopes')&&r.data.name==='New scope (fictional)')!;await s.click('open:scope:'+created.id);await s.click('remove-scope');assert.deepEqual(s.saves,[{kind:'archive_record',recordId:created.id,expectedVersion:0}]);
  // Bulk: everything shown on To review, at most 50, each with its own version.
  await s.open({screen:'events',esub:'review',panel:null});const before=rows.filter(r=>r.role===T('events')&&r.data.status==='new').length;
  if(before){await s.click('review-shown');assert.equal(s.saves.length,before);assert.ok(s.saves.every((c:any)=>c.kind==='update_record'&&Number.isInteger(c.expectedVersion)));}
  // Nothing is saved while opening.
  await s.open({screen:'overview'});assert.equal(s.saves.length,0);
 });

 test(`${radar.name} ${version}: settings for owners only; viewers see no edit controls; each empty screen offers its first action; pending reads show as loading`,async()=>{
  for(const appRole of ['editor','viewer']){
   const s=h.session(h.fresh(),{appRole});await s.open({screen:'overview'});assert.doesNotMatch(s.html,/data-action="nav:settings"/,appRole);
   await s.click('nav:settings');assert.doesNotMatch(s.html,/Research template|settings:save/,appRole);
   await s.open({screen:'tracker'});if(appRole==='viewer'){assert.doesNotMatch(s.html,/class="k-cell"|data-action="new:item"/);await s.open({screen:'scopes'});assert.doesNotMatch(s.html,/data-action="new:scope"|scope-status:/);}
   else assert.match(s.html,/class="k-cell"/);
  }
  const owner=h.session(h.fresh());await owner.open({screen:'settings'});assert.match(owner.html,/data-action="save-template"/);assert.match(owner.html,/data-action="settings:save"/);
  // Owners change the research template; the required rules stay locked.
  await owner.submit('save-template',{instruction:'Watch only phase 3 (fictional).',rules:'Prefer primary sources.\n'+kit.REQUIRED_RULES[0],note:'Narrower'});
  const t=JSON.parse(owner.saves[0].data.research_template);assert.deepEqual(t,{instruction:'Watch only phase 3 (fictional).',rules:['Prefer primary sources.']});assert.equal(owner.saves[0].data.research_template_version,2);
  await owner.submit('settings:save',{lookback_days:'30',language:'German'});assert.deepEqual([owner.saves[0].data.lookback_days,owner.saves[0].data.language],[30,'German']);
  const editor=h.session(h.fresh(),{appRole:'editor'});await editor.submit('save-template',{instruction:'x'});assert.equal(editor.saves.length,0);
  // Empty app: every screen offers its first action.
  const empty=h.session([]);
  for(const [st,act] of [[{screen:'overview'},'new:scope'],[{screen:'tracker'},'new:scope'],[{screen:'events',esub:'review'},'esub:all'],[{screen:'events',esub:'all'},'new:scope'],[{screen:'events',esub:'calendar'},'month-today'],[{screen:'scopes'},'new:scope']] as const){
   await empty.open(st);assert.match(empty.html,/class="k-empty"/,JSON.stringify(st));assert.match(empty.html,new RegExp('data-action="'+act+'"'),JSON.stringify(st));}
  // Pending reads (the frame's answer for data on its way) show as loading, never as empty or zero.
  const pend=h.session(h.fresh(),{pendingFor:[T('tracker'),T('events')]});
  await pend.open({screen:'tracker'});assert.match(pend.html,/aria-busy="true"/);assert.doesNotMatch(pend.html,/class="k-empty"|No .* yet/);
  await pend.open({screen:'overview'});assert.match(h.text(pend.html),/… Trials tracked|… [A-Z]/);assert.doesNotMatch(h.text(pend.html),/No new high-impact events| 0 [A-Z]/);
  await pend.open({screen:'events'});assert.match(pend.html,/aria-busy="true"/);assert.doesNotMatch(h.text(pend.html),/Nothing new to review/);
  // A submit whose check is still loading saves nothing yet (the frame runs it again when the data arrives).
  await pend.open({screen:'tracker'});await pend.click('new:item');const scope=h.fresh().find(r=>r.role===T('scopes'))!;
  await pend.submit('add-item',{natural_key:'X-1',title:'X (fictional)',scope_id:scope.id,sources:'Note https://example.invalid/1'});assert.equal(pend.saves.length,0);assert.equal(pend.out.notice,undefined);
  // Restricted data is said, not shown as empty: one notice and an inline line.
  const r=h.session(h.fresh(),{read:(q:any,rows:Row[])=>q.typeId===T('events')?{unavailable:true,rows:[],total:null}:h.platformRead(rows,q)});
  await r.open({screen:'events'});assert.match(h.text(r.html),/could not be read/);assert.equal(r.out.notice.kind,'error');
 });

 test(`${radar.name} ${version}: the chosen scope is the person's working context; filters, search and paging use loaded data`,async()=>{
  const rows=h.fresh(),s=h.session(rows),scopes=rows.filter(r=>r.role===T('scopes'));
  await s.open({screen:'tracker'});const reads=s.calls.length;
  await s.change('q',String(rows.find(r=>r.role===T('tracker'))!.data.natural_key).slice(0,6));assert.equal(s.calls.length,reads,'search reads nothing new');
  await s.change('flt:show','active');assert.equal(s.calls.length,reads,'filters read nothing new');
  if(scopes.length>1){
   await s.change('q','');await s.change('context',scopes[1].id);assert.deepEqual(s.context,{scope:scopes[1].id});
   const shown=(s.html.match(/data-action="open:item:/g)||[]).length,expected=rows.filter(r=>r.role===T('tracker')&&r.data.scope_id===scopes[1].id&&r.data.dismissed!==true).length;
   assert.equal(shown,Math.min(expected,25));
   await s.open({screen:'overview'});assert.ok(s.calls.some((c:any)=>c.name==='records.readMany'&&c.v.reads.some((q:any)=>q.filters?.scope_id===scopes[1].id)),'Overview totals for the scope come from the full data');
  }
  // Add an item: duplicates are refused; a new one is created with its source.
  await s.change('context','');await s.click('new:item');const scope=scopes[0],dupKey=rows.find(r=>r.role===T('tracker'))!.data.natural_key;
  await s.submit('add-item',{natural_key:dupKey,title:'x',scope_id:scope.id,sources:'Note https://example.invalid/1'});assert.equal(s.saves.length,0);assert.equal(s.out.notice.kind,'error');
  await s.submit('add-item',{natural_key:'NEW-KEY-1',title:'New item (fictional)',scope_id:scope.id,sources:'Note https://example.invalid/1'});
  assert.equal(s.saves[0].kind,'create_record');assert.equal(s.saves[0].data.natural_key,'NEW-KEY-1');assert.match(s.saves[0].data.sources,/example\.invalid/);
 });
}

test('Bio Radars kit 2.0.0: 1.2.0 is archived unchanged; the app source, kit and generator keep the released packages byte-identical',async()=>{
 assert.equal(kit.KIT_VERSION,'2.0.0');assert.equal(kit.APP_CONTRACT,'v2');
 for(const f of ['brief-core.js','functions/common.js','functions/brief.js','functions/digest.js','functions/alert.js'])assert.equal(await readFile('templates/source/radar-kit/'+f,'utf8'),await readFile('templates/source/radar-kit/archive/1.2.0/'+f,'utf8'),f+': the helpers are kit 1.2.0\'s');
 const old=await import('../templates/source/radar-kit/archive/1.2.0/kit.mjs');assert.equal(old.KIT_VERSION,'1.2.0');
 for(const [slug] of RADARS){const r=await json('templates/source/radars/'+slug+'/radar.json');assert.deepEqual(kit.installerSchema(r),r.dataKit?(await import('../templates/source/radar-kit/archive/'+r.dataKit+'/kit.mjs')).installerSchema(r):old.installerSchema(r));}
 // Released packages: still v1, still in the seed where they were.
 const trial=await json('templates/apps/life.trial-radar-1.0.1.json');assert.match(trial.source,/records\.propose/);assert.equal(seed['life.trial-radar'].version,'1.0.1');
});
