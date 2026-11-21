import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {appTemplateEntry} from '../src/workspace/app-templates.js';
import {validateRecipeDeclarations,readRecipes} from '../src/automations/recipes-schema.js';
import {validateAppFunctions} from '../src/workspace/app-functions-schema.js';
import * as kit from '../templates/source/radar-kit/archive/1.2.0/kit.mjs';
import {radarHarness} from './fixtures/radar.js';

/* Bio Radars wave 2 on kit 1.1.0 (BIO_RADAR.md §3, §5): Pipeline, Literature 2.0.0, Deal and Funding Radar, each in production QuickJS
 * with platform-shaped reads and its fictional demo set (tests/fixtures/radar.ts). Trial Radar (kit 1.0.0) has its own tests. */
const words=(t:string)=>t.split(/\s+/).filter(w=>/[A-Za-z0-9]/.test(w)).length;
const SLUGS=['pipeline-radar','literature-radar','deal-radar','funding-radar','patent-radar','market-radar','regulatory-radar'];
const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8')),outputs=JSON.parse(await readFile('templates/contracts/outputs.json','utf8')).roles,installers=JSON.parse(await readFile('templates/catalog-installers.json','utf8'));

for(const slug of SLUGS){
 const h=await radarHarness(slug),{radar,entry,schema,T}=h,rows0=()=>h.fresh();
 test(`${radar.name}: package, roles, contract, recipes and functions on kit 1.1.0; published through the seed`,async()=>{
  const raw=JSON.parse(await readFile(`templates/apps/${radar.id}-${radar.version}.json`,'utf8'));
  appTemplateEntry.parse(raw);validateRecipeDeclarations(raw);validateAppFunctions(raw,Object.keys(schema));assert.equal(radar.kit,'1.2.0');assert.ok(raw.source.length<180000);
  assert.deepEqual(Object.keys(schema),['organizations','programs',T('settings'),T('scopes'),T('tracker'),T('events'),T('runs')]);
  assert.equal(schema[T('events')].contract,'radar.v1');assert.equal(outputs[T('events')].writer,radar.id);
  assert.equal(schema[T('tracker')].contract,radar.trackerOutput?'radar.v1':radar.prefix+'.v1');assert.equal(!!outputs[T('tracker')],!!radar.trackerOutput,'tracker output registered only when the radar publishes it');
  assert.equal(installers[radar.id+'@'+radar.version],'templates/source/radars/'+slug+'/archive/'+radar.version+'/schema.example.json');
  assert.deepEqual(seed[radar.id],{schema:'templates/source/radars/'+slug+'/schema.example.json',version:radar.version},'published on owner approval (15 Nov 2026)');
  const [scan,alert]=readRecipes(raw).recommended as any[];assert.deepEqual([scan.key,alert.key],['scan','alert']);assert.ok(scan.research&&scan.email);
  const g=scan.research.writeBindings.find((b:any)=>b.role===T('tracker'));assert.deepEqual(g.exceptFields,kit.userOwned(radar));
  assert.equal(scan.trigger.time,'07:00');assert.equal(scan.trigger.frequency,radar.cadence);
  if(radar.cadence==='monthly')assert.deepEqual(scan.trigger.monthRule,{kind:'weekday',nth:1,weekday:1},'first Monday');else assert.deepEqual(scan.trigger.weekdays,[1]);
  for(const k of ['whenToUse','whenNotToUse','description'])assert.ok(raw[k].length>40,k);
  for(const f of radar.trackerFields)assert.ok(schema[T('tracker')].fields.some((x:any)=>x.key===f.key),f.key);
 });
 test(`${radar.name}: four screens, the tracker drawer and the calendar render with the demo data; reads are bounded`,async()=>{
  const s=h.session(rows0());
  for(const section of ['overview','tracker','events','setup']){const o=await s.open({section});assert.doesNotMatch(h.text(o.html),/could not be shown|Partial data/,section);assert.ok(o.calls.length<=16,section+' '+o.calls.length);}
  const item=rows0().find(r=>r.role===T('tracker'))!;await s.open({section:'tracker'});await s.click('open:item:'+item.id+':'+item.data.natural_key);assert.match(s.html,/role="dialog"/);
  await s.open({section:'events',esub:'calendar',month:'2026-11',panel:null});assert.match(h.text(s.html),/Nov 2026/);
  for(const sub of ['template','fields','automations']){const o=await s.open({section:'setup',ssub:sub});assert.doesNotMatch(h.text(o.html),/could not be shown/);}
  await s.open({section:'overview'});assert.match(h.text(s.html),new RegExp(radar.sources[radar.sources.length-1].name.replace(/[()]/g,'.')+' was not reachable in the last 3 runs'));
 });
 test(`${radar.name}: the brief carries the template, scopes, sources, current fields and user-owned fields`,async()=>{
  const b=(await h.runFunction('brief',rows0())).out.context;
  assert.deepEqual(b.research_template.rules.slice(0,8),kit.REQUIRED_RULES);assert.equal(b.active_scopes.length,1);assert.equal(b.active_scopes[0].sources.named[0].name,radar.sources[0].name);
  for(const f of radar.trackerFields.filter((f:any)=>!(radar.userOwnedFields||[]).includes(f.key)))assert.ok(b.return_format[T('tracker')][f.key],f.key);
  assert.deepEqual(b.user_owned_fields,kit.userOwned(radar));
 });
 test(`${radar.name}: the digest section (${radar.digestSection.title}) and the alert are written by app code`,async()=>{
  const rows=rows0(),run=rows.filter(r=>r.role===T('runs')).sort((a,b)=>String(b.data.run_on).localeCompare(String(a.data.run_on)))[0];
  const d=(await h.runFunction('digest_summary',rows,{records:[],run:{id:run.data.run_id,summary:run.data.summary}})).out;
  assert.equal(d.nonEmpty,true);assert.match(d.subject,new RegExp('^'+radar.name+' · '));assert.ok(words(d.text)<=210,String(words(d.text)));
  const watchedHigh=rows.some(e=>e.role===T('events')&&e.data.run_id===run.data.run_id&&e.data.impact==='high'&&rows.find(r=>r.id===e.data.item_id)?.data.watched===true);
  assert.equal((await h.runFunction('alert_summary',rows,{records:[],run:{id:run.data.run_id}})).out.nonEmpty,watchedHigh);
  return d;
 });
}

test('Literature Radar 2.0.0: synthesis note per scope, reading queue kept by people, must-read papers in the digest; 1.2.2 is retired, its package unchanged',async()=>{
 const h=await radarHarness('literature-radar'),rows=h.fresh(),s=h.session(rows);
 await s.open({section:'setup'});await s.click('new:scope');assert.match(s.html,/<textarea[^>]*name="def_synthesis"/,'the synthesis note is a multi-line field');
 await s.open({section:'tracker',panel:null});assert.match(h.text(s.html),/Reading queue/);await s.change('flt:queue_status','to_read');assert.ok(s.calls.some((c:any)=>c.v.filters?.queue_status==='to_read'),'the reading queue is a server-side filter');
 const run=rows.find(r=>r.role==='literatureradar.runs'&&r.data.run_on==='2026-11-16')!;const d=(await h.runFunction('digest_summary',rows,{records:[],run:{id:run.data.run_id,summary:run.data.summary}})).out;
 assert.match(d.text,/Must-read papers\n- .*: /);
 assert.ok(kit.userOwned(h.radar).includes('queue_status')&&kit.userOwned(h.radar).includes('assignee'));
 // 2.0.0 replaces 1.2.2 in the seed (migration 074 withdraws 1.2.2); the 1.2.2 package is unchanged for existing installs.
 assert.equal(seed['life.literature-radar'].version,'2.0.1');await readFile('templates/apps/life.literature-radar-1.2.2.json','utf8');
});

test('Deal and Funding Radar: trackers are radar.v1 outputs; digests show the largest disclosed amounts per currency and the most active investors',async()=>{
 for(const [slug,re] of [['deal-radar',/Largest disclosed deals\n- .*: 1,175 USD[\s\S]*Total disclosed this period: .*USD.*EUR|Total disclosed this period: .*EUR.*USD/],['funding-radar',/Rounds in your space\n- .*USD[\s\S]*Most active lead investors: Northstar Ventures \(fictional\) \(\d\)/]] as const){
  const h=await radarHarness(slug),rows=h.fresh();
  // Make every item part of the latest run, as a build would.
  const run=rows.find(r=>r.role===h.T('runs')&&r.data.run_on==='2026-11-16')!;for(const r of rows.filter(r=>r.role===h.T('tracker')))r.data.last_changed_run_id=run.data.run_id;
  const d=(await h.runFunction('digest_summary',rows,{records:[],run:{id:run.data.run_id,summary:run.data.summary}})).out;assert.match(d.text,re,d.text);
  assert.doesNotMatch(d.text,/Fernway Labs \(fictional\), Cedarline|undefined|NaN/);
  assert.equal(outputs[h.T('tracker')].versions['radar.v1'].fields.length,h.schema[h.T('tracker')].fields.length);
 }
 // Undisclosed deal terms are never counted.
 const h=await radarHarness('deal-radar');assert.ok(h.fresh().some(r=>r.role==='dealradar.deals'&&r.data.disclosed===false));
});

test('Patent Radar: monthly, "Not legal advice" on every screen and email, expiries in the next 24 months',async()=>{
 const h=await radarHarness('patent-radar'),rows=h.fresh(),s=h.session(rows);assert.equal(h.radar.cadence,'monthly');
 for(const section of ['overview','tracker','events','setup']){const o=await s.open({section});assert.match(h.text(o.html),/Not legal advice/,section);}
 await s.open({section:'overview'});const t=h.text(s.html);assert.match(t,/Coming up \(24 months\)/);
 assert.match(t,/US19000005 expires \(fictional\)/,'an expiry 7 months out is listed');assert.match(t,/EP9000001 expires \(fictional\)/,'an expiry 16 months out is listed');
 const run=rows.find(r=>r.role==='patentradar.runs'&&r.data.run_on==='2026-11-16')!;
 for(const e of rows.filter(r=>r.role==='patentradar.events'))e.data.run_id=run.data.run_id;for(const r of rows.filter(r=>r.role==='patentradar.families'))r.data.watched=true;
 const d=(await h.runFunction('digest_summary',rows,{records:[],run:{id:run.data.run_id,summary:run.data.summary}})).out;
 assert.match(d.subject,/dates in 24 months/);assert.match(d.text,/Not legal advice/);assert.match(d.text,/Coming up \(24 months\)\n- 30 Jun 2027 \(est\.\): US19000005 expires/);
 const a=(await h.runFunction('alert_summary',rows,{records:[],run:{id:run.data.run_id}})).out;assert.equal(a.nonEmpty,true);assert.match(a.text,/Not legal advice/);
 assert.match(JSON.stringify((await h.runFunction('brief',rows)).out.context),/not legal advice/i);
});

test('Market and Regulatory Radar: monthly, decisions and deadlines in the next 180 days, digest sections from their event kinds',async()=>{
 for(const [slug,title,coming] of [['market-radar','Approvals, HTA and pricing decisions',/CHMP opinion on Brevaloxin expected \(fictional\)/],['regulatory-radar','New guidances and designations',/EMA consultation on inhaled products closes \(fictional\)/]] as const){
  const h=await radarHarness(slug),rows=h.fresh(),s=h.session(rows);assert.equal(h.radar.cadence,'monthly');
  await s.open({section:'overview'});const t=h.text(s.html);assert.match(t,/Coming up \(180 days\)/,slug);assert.match(t,coming,slug);
  const run=rows.find(r=>r.role===h.T('runs')&&r.data.run_on==='2026-11-16')!;for(const e of rows.filter(r=>r.role===h.T('events')))e.data.run_id=run.data.run_id;
  const d=(await h.runFunction('digest_summary',rows,{records:[],run:{id:run.data.run_id,summary:run.data.summary}})).out;
  assert.match(d.text,new RegExp(title+'\\n- '),d.text);assert.match(d.text,/Coming up \(180 days\)/);assert.doesNotMatch(d.text,/undefined|NaN/);
 }
});
