import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {withActor,withDatabaseContext} from '../src/db/context.js';
import {reconcileRecipeSetups} from '../src/automations/recipes.js';
import {inspectAppDesign} from '../src/workspace/design-quality.js';
import {text,suite,seedDemo,installRadar} from './fixtures/trial-radar-db.js';

/* Bio Radars waves 2 and 3 (kit 1.1.0) on a disposable database: each radar installs from the catalog with its three read-only functions and two
 * recommended automations, takes its fictional demo data, renders every screen and drawer without errors, passes the design gate at 1440 and
 * 390 px, and (Deal, Funding) publishes its tracker as a radar.v1 output with one writer. The end-to-end run, digest and alert pipeline is
 * covered once for the kit by tests/trial-radar-integration.test.ts. */
const RADARS=[['pipeline-radar','life.pipeline-radar','1.0.0'],['literature-radar','life.literature-radar','2.0.0'],['deal-radar','life.deal-radar','1.0.0'],['funding-radar','life.funding-radar','1.0.0'],['patent-radar','life.patent-radar','1.0.0'],['market-radar','life.market-radar','1.0.0'],['regulatory-radar','life.regulatory-radar','1.0.0']] as const;

test('Kit 1.1.0 radars install, take their demo data, render every screen and pass the design gate',async()=>{
 const x=await suite();
 try{await withActor(x.human,async()=>{
  for(const [slug,id,version] of RADARS){
   const radar=JSON.parse(await readFile('templates/source/radars/'+slug+'/radar.json','utf8')),w=await x.workspace(radar.name);
   const {step,receipt}=await installRadar(x,w,id,version);assert.deepEqual(step.automations.map((r:any)=>r.key),['scan','alert'],slug);
   const c=await x.comp(w,receipt.appId),map=x.mapOf(c);assert.deepEqual(c.execution.map((b:any)=>b.name).sort(),['alert_summary','brief','digest_summary'],slug);
   const tracker=radar.prefix+'.'+radar.trackerTable;assert.ok(map[tracker]&&map[radar.prefix+'.events'],slug);
   const roleOf=(r:string)=>(c.manifest.roles??[]).find((x:any)=>x.role===r);assert.equal(roleOf(tracker).contract,radar.trackerOutput?'radar.v1':radar.prefix+'.v1');
   await seedDemo(x,w,map,slug);
   const ui=x.app(w,receipt.appId),frames:any[]=[];
   for(const st of [{section:'overview'},{section:'tracker'},{section:'events'},{section:'events',esub:'calendar',month:'2026-11'},{section:'setup'},{section:'setup',ssub:'template'},{section:'setup',ssub:'fields'}]){
    const out=await ui.open({...st,panel:null});assert.doesNotMatch(text(out.html),/could not be shown|Partial data/,slug+' '+JSON.stringify(st));frames.push({name:radar.name+' '+st.section+(st.esub??st.ssub??''),html:out.html,css:out.css});}
   const item=(await x.rows(map[tracker].typeId))[0];await ui.open({section:'tracker',panel:null});await ui.click('open:item:'+item.id+':'+item.data.natural_key);frames.push({name:radar.name+' drawer',html:ui.html,css:ui.last.css});
   await ui.open({section:'setup',panel:null});await ui.click('new:scope');frames.push({name:radar.name+' scope',html:ui.html,css:ui.last.css});
   assert.deepEqual((await inspectAppDesign(frames)).issues,[],radar.name);
  }
 });}finally{await x.pg.close();}
});

test('Kit 1.1.0 radars: automations are created on install and wait for a runner; Deal and Funding trackers keep one writer',async()=>{
 process.env.APP_AUTOMATION_RECIPES_ENABLED='true';const x=await suite();
 try{await withActor(x.human,async()=>{
  const w=await x.workspace('Outputs');
  for(const [slug,id,version] of RADARS){const {receipt}=await installRadar(x,w,id,version,true);for(let i=0;i<3;i++)await withDatabaseContext({service:'worker'},()=>reconcileRecipeSetups(x.db));
   const rows=(await x.pg.query<any>('SELECT recipe_key,status FROM automation_recipe_setups WHERE app_id=$1 ORDER BY recipe_key',[receipt.appId])).rows;
   assert.deepEqual(rows.map((r:any)=>r.recipe_key),['alert','scan'],slug);assert.equal(rows.find((r:any)=>r.recipe_key==='scan').status,'needs_setup','no runner: Needs setup');}
  // A second Deal Radar in the same workspace binds dealradar.deals read-only or gets its own table; it never becomes a second writer.
  const second=await installRadar(x,w,'life.deal-radar','1.0.0');const m1=(await x.pg.query<any>("SELECT manifest FROM workspace_components WHERE id=$1",[second.receipt.appId])).rows[0].manifest;
  const deals=(m1.roles??[]).find((r:any)=>r.role==='dealradar.deals');assert.ok(deals,'role declared');
  const writers=(await x.pg.query<any>("SELECT count(*)::int AS n FROM workspace_components c, jsonb_array_elements(c.manifest->'roles') r WHERE c.workspace_id=$1 AND r->>'role'='dealradar.deals' AND r->>'typeId'=$2 AND coalesce((r->>'readOnly')::boolean,false)=false",[w,deals.typeId])).rows[0].n;
  assert.equal(writers,1,'one writer per output table');
 });}finally{delete process.env.APP_AUTOMATION_RECIPES_ENABLED;await x.pg.close();}
});
