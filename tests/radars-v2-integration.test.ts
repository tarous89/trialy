import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {withActor} from '../src/db/context.js';
import {isV2Source} from '../src/workspace/browser-runtime.js';
import {inspectAppDesign} from '../src/workspace/design-quality.js';
import {text,suite,seedDemo,installRadar} from './fixtures/trial-radar-db.js';

/* 7.3 / 7.4: the eight Bio Radars on kit 2.0.0 on a disposable database. Each new version is a draft (approved here, as the owner would),
 * installs from the catalog with the same three read-only functions and two recommended automations as before, takes its fictional demo
 * data, renders every screen and panel in the production runtime under the v2 contract, and passes the current design rules at the
 * browser, assistant-panel and phone widths. Trial Radar also saves one value directly (records.save) and refuses a stale version. */
const RADARS=[['trial-radar','life.trial-radar','2.0.0'],['pipeline-radar','life.pipeline-radar','2.0.0'],['literature-radar','life.literature-radar','3.0.0'],['deal-radar','life.deal-radar','2.0.0'],
 ['funding-radar','life.funding-radar','2.0.0'],['patent-radar','life.patent-radar','2.0.0'],['market-radar','life.market-radar','2.0.0'],['regulatory-radar','life.regulatory-radar','2.0.0']] as const;

test('Bio Radars 2.0.0 (Literature 3.0.0) install, render every screen and panel with the kit, and pass the current design rules',async()=>{
 const x=await suite();
 try{await withActor(x.human,async()=>{
  for(const [slug,id,version] of RADARS){
   const radar=JSON.parse(await readFile('templates/source/radars/'+slug+'/radar.json','utf8')),w=await x.workspace(radar.name+' 2');
   const {step,receipt}=await installRadar(x,w,id,version);assert.deepEqual(step.automations.map((r:any)=>r.key),['scan','alert'],slug);
   const c=await x.comp(w,receipt.appId),map=x.mapOf(c);assert.ok(isV2Source(c.source),slug);
   assert.deepEqual(c.execution.map((b:any)=>b.name).sort(),['alert_summary','brief','digest_summary'],slug);
   await seedDemo(x,w,map,slug);
   const tracker=radar.prefix+'.'+radar.trackerTable,ui=x.app(w,receipt.appId),frames:any[]=[];
   for(const st of [{screen:'overview'},{screen:'tracker'},{screen:'events',esub:'review'},{screen:'events',esub:'calendar',month:'2026-11'},{screen:'scopes'},{screen:'settings'}]){
    const out=await ui.open({...st,panel:null});const t=text(out.html);
    assert.doesNotMatch(t,/could not be shown|could not be read|Loading/,slug+' '+JSON.stringify(st)+': '+t.slice(0,300));assert.doesNotMatch(out.html,/<h1|rd-banner|rd-foot/,slug);
    assert.equal(out.runtime,'trialy-frontend-js-v2',slug);frames.push({name:radar.name+' '+st.screen+(st.esub??''),html:out.html,css:out.css});}
   assert.match(frames[5].html,/data-action="save-template"/,'the owner who installed it sees Settings');
   const item=(await x.rows(map[tracker].typeId))[0];await ui.open({screen:'tracker',panel:null});await ui.click('open:item:'+item.id+':'+item.data.natural_key);frames.push({name:radar.name+' item',html:ui.html,css:ui.last.css});
   await ui.open({screen:'scopes',panel:null});await ui.click('new:scope');frames.push({name:radar.name+' scope',html:ui.html,css:ui.last.css});
   const design=await inspectAppDesign(frames,'current');assert.deepEqual(design.issues,[],radar.name+': '+JSON.stringify(design.issues.slice(0,3)));
   if(slug==='trial-radar'){
    // One direct save from an inline value: one records.save with the version shown, saved at once, no review.
    await ui.open({screen:'tracker',panel:null});const before=(await x.rows(map[tracker].typeId)).find((r:any)=>r.id===item.id);const field=map[tracker].fields.watched;
    const out=await ui.change('edit:'+item.id+':watched:'+before.version,!(before.data[field]===true));
    assert.ok(out.saved,'saved directly');assert.equal(out.proposal??null,null,'no review');
    const after=(await x.rows(map[tracker].typeId)).find((r:any)=>r.id===item.id);assert.equal(after.version,before.version+1);assert.equal(after.data[field],!(before.data[field]===true));
    // The same edit from the earlier version is refused: someone (here, the same person) changed it first.
    await assert.rejects(ui.change('edit:'+item.id+':watched:'+before.version,before.data[field]===true),/changed|stale|version/i);
    assert.equal((await x.rows(map[tracker].typeId)).find((r:any)=>r.id===item.id).version,after.version);
   }
  }
 });}finally{await x.pg.close();}
});
