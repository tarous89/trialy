import {createServer} from 'node:http';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {partnershipsFixture} from '../tests/fixtures/partnerships.js';
import {frontendFrameDocument} from '../src/shared/frontend-frame.js';
/* Partnerships 2.0.0 in the production sanitized frame with a manifest attached (PARTNERSHIPS.md §13), at 1440 and 390 px:
 * seven screens (no page overflow, no error banner) and every acceptance criterion through the real UI and the reviewed path:
 * 1 conference prep, view and after-event outcome; 2 after-meeting log; 3 gates; 4 research review and digest; 5 saved views;
 * 6 funnel and win/loss; 7 no outreach; 8 proposals only; 9 layout gear (archiving is covered by the integration test); 10 layout. */
const x=await partnershipsFixture();let queue:Promise<any>=Promise.resolve();const component=x.component;const frame=await frontendFrameDocument();const host:string[]=[];const external:string[]=[];
const server=createServer(async(req,res)=>{try{
 if(req.url==='/frame'){res.setHeader('Content-Type','text/html');res.end(frame);return;}
 if(req.url==='/api'){let body='';for await(const chunk of req)body+=chunk;const {name,args}=JSON.parse(body);let result:any;
  if(name==='run'&&process.env.DEBUG_PT&&args.event&&args.event.kind!=='open')console.error('EV',JSON.stringify(args.event).slice(0,400));
  if(name==='run'){const run=()=>x.f.runFrontend(x.actor,x.w.id,{componentId:component.id,expectedVersion:component.version,...args});const p=queue.then(run,run);queue=p.catch(()=>{});result=await p;}
  else if(name==='confirm')result=await x.f.confirm(x.actor,x.w.id,args.id,args.digest);
  else if(name==='host'){host.push(args.event);result={};}else throw Error('Unknown test request');
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return;}
 res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><body style="margin:0"><div id="error"></div><button id="approve" hidden>Confirm record changes</button><iframe id="app" src="/frame" style="width:100%;height:100vh;border:0;display:block"></iframe><script>
 let proposal,last={};const channel='pt-test';let chain=Promise.resolve();const api=(name,args={})=>{const run=async()=>{const r=await fetch('/api',{method:'POST',body:JSON.stringify({name,args})});const d=await r.json();if(!r.ok)throw Error(d.error);return d;};const p=chain.then(run,run);chain=p.catch(()=>{});return p;};let opened=false;
 function paint(out){document.querySelector('#app').contentWindow.postMessage({kind:'trialy.render',channel,appLinks:true,appOrigin:location.origin,...out},'*');proposal=out.proposal;document.querySelector('#approve').hidden=!proposal;last=out.state;}
 document.querySelector('#approve').onclick=async()=>{await api('confirm',{id:proposal.id,digest:proposal.digest});paint(await api('run',{state:last,event:{kind:'open'}}));};
 window.addEventListener('message',async e=>{if(e.source!==document.querySelector('#app').contentWindow)return;try{
  if(e.data.kind==='trialy.ready'){if(opened)return;opened=true;paint(await api('run',{event:{kind:'open'}}));}
  if(e.data.kind==='trialy.event'){if(e.data.event.action==='tracker:layout'){await api('host',{event:'tracker:layout'});return;}paint(await api('run',{state:e.data.state,event:e.data.event}));}
  if(e.data.kind==='trialy.integration')await api('host',{event:'integration:'+e.data.request});
 }catch(err){document.querySelector('#error').textContent=err.message;}});
 </script></body></html>`);
}catch(e){res.statusCode=400;res.end(JSON.stringify({error:(e as Error).message}));}});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const shots=process.env.PARTNERSHIPS_SCREENSHOTS||'/tmp';
const overflow=(fr:any)=>fr.locator('html').evaluate((e:any)=>e.scrollWidth-e.clientWidth);
const rows=async(role:string)=>(await x.s.records(x.actor,x.w.id,x.map[role].typeId,{limit:200,offset:0})).rows as any[];
let current:any=null;
async function settle(){await current.waitForTimeout(150);await current.evaluate(()=>new Promise(r=>setTimeout(r,50)));}
async function go(fr:any,id:string){for(let i=0;i<5;i++){await fr.locator('.pt-nav [data-action="nav:'+id+'"]').click();try{await fr.locator('.pt-nav [data-action="nav:'+id+'"][aria-current="page"]').waitFor({timeout:6000});return;}catch(e){const err=await current.locator('#error').textContent();if(err&&!/busy/i.test(err))throw Error('Navigation to '+id+' failed: '+err);await current.evaluate(()=>{document.querySelector('#error')!.textContent='';});await current.waitForTimeout(400);}}throw Error('Navigation to '+id+' stayed busy');}
/* Approve the TrialAgents review the host shows; nothing is written before this click. */
async function approve(page:any){await page.locator('#approve').waitFor({state:'visible',timeout:20000});await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden',timeout:20000});await settle();}
async function pick(fr:any,sel:string,value:string){const s=fr.locator(sel).first();await s.selectOption(value);await fr.locator(sel+' option[selected][value="'+value+'"]').first().waitFor({state:'attached',timeout:10000});}
async function fill(fr:any,sel:string,value:string){const f=fr.locator(sel).first();await f.fill(value);await f.dispatchEvent('change');
 if(await f.evaluate((e:any)=>e.tagName)==='TEXTAREA')await fr.locator(sel).filter({hasText:value}).first().waitFor({timeout:10000});else await fr.locator(sel+'[value='+JSON.stringify(value)+']').first().waitFor({state:'attached',timeout:10000});}
/* Check a box and wait until the app re-rendered it checked (the next event then carries the new state). */
async function tick(fr:any,loc:any){await loc.check();await loc.dispatchEvent('change');const id=await loc.getAttribute('id');await fr.locator('[id="'+id+'"][checked]').waitFor({state:'attached',timeout:10000});}
const drawer=(fr:any)=>fr.locator('[role="dialog"]').first();
try{
 for(const [width,height] of [[1440,1100],[390,900]]){
  const page=await browser.newPage({viewport:{width,height}}),errors:string[]=[];current=page;page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{const u=r.url();if(!u.startsWith('http://127.0.0.1')&&!u.startsWith('data:')&&!u.startsWith('about:'))external.push(u);});
  await page.goto(`http://127.0.0.1:${(server.address() as any).port}`);const fr=page.frameLocator('#app');
  try{await fr.getByRole('heading',{name:'Partnerships',exact:true}).waitFor({timeout:60000});}catch(e){throw Error('App did not open: '+(await page.locator('#error').textContent())+' '+errors.join(' '));}
  // 10 Layout: seven screens, no page overflow, no error banner; a screenshot of each.
  for(const id of ['overview','pipeline','partners','conferences','activity','research','settings']){await go(fr,id);
   assert.equal(await fr.locator('.pt-banner.bad').count(),0,id+' '+width);assert.ok(await overflow(fr)<=0,'no page overflow on '+id+' at '+width);
   await page.screenshot({path:`${shots}/partnerships-${id}-${width}.png`,fullPage:true});}
  // 7 Outreach: no mail links anywhere, and every Partnerships screen loads without contacting anything outside TrialAgents.
  assert.equal(await fr.locator('a[href^="mailto:"]').count(),0);
  // 3 Gates: the opportunity panel shows the CDA status from Contracts and Data Room access and engagement; the close control stays reachable.
  await go(fr,'pipeline');await fr.getByRole('button',{name:/Cedarline: NWB-101 licence/}).first().click();const dlg=drawer(fr);await dlg.waitFor();
  await dlg.getByText('CDA: Cedarline Pharma (mutual)').first().waitFor();await dlg.getByText('Signed, active').first().waitFor();await dlg.getByText(/Engagement: 11 views/).waitFor();
  const close=fr.getByRole('button',{name:'Close',exact:true}).first();assert.ok(await close.isVisible());if(width===390)await page.screenshot({path:`${shots}/partnerships-opportunity-390.png`});await close.click();
  if(width===1440){
   // 6 Funnel and win/loss from stage history.
   await fr.getByRole('button',{name:'Funnel',exact:true}).click();await fr.getByText('Win rate (signed ÷ signed + lost)').waitFor();await fr.getByText('Loss and on-hold reasons').waitFor();
   const counts=await fr.locator('.pt-funnel .pt-funnel-n strong').allTextContents();assert.deepEqual(counts.map(Number),[18,16,13,9,6,3,2,1]);
   // 1 Conference: decline warning on a request, the conference tag view in one click, then save it as a shared view (5).
   await go(fr,'conferences');await fr.getByText(/Declined before: No strategic fit/).first().waitFor();
   await fr.getByRole('button',{name:'Open its pipeline view'}).click();await fr.locator('.pt-nav [data-action="nav:pipeline"][aria-current="page"]').waitFor();await fr.getByText('Pinehollow: NWB-101 Korea licence').first().waitFor();
   assert.equal(await fr.getByText('Fernbrook: NWB-202 licence').count(),0,'only BIO-Europe 2026 opportunities');
   await pick(fr,'[name="me"]','Anna');await fr.getByRole('button',{name:'Save as view'}).click();const sv=drawer(fr);await sv.waitFor();
   await fill(fr,'[name="name"]','BIO-Europe 2026 team view');await tick(fr,fr.locator('[name="shared"]'));
   await fr.getByRole('button',{name:'Save view (reviewed)'}).click();
   assert.ok(!(await rows('partnerships.views')).some((v:any)=>v.data.name==='BIO-Europe 2026 team view'),'8: nothing is written before approval');await approve(page);
   assert.equal((await rows('partnerships.views')).find((v:any)=>v.data.name==='BIO-Europe 2026 team view').data.shared,true);
   // 5 Saved views: Region + stage shared view visible to the team; Anna's private view hidden from Marc.
   await fr.getByRole('button',{name:'Clear filters'}).click();await settle();await pick(fr,'[name="flt_tag:Region"]','Asia-Pacific');await pick(fr,'[name="flt_stage"]','contacted');await fr.getByText('Pinehollow: NWB-101 Korea licence').first().waitFor();
   await fr.getByRole('button',{name:'Save as view'}).click();await fill(fr,'[name="name"]','APAC contacted');await tick(fr,fr.locator('[name="shared"]'));await fr.getByRole('button',{name:'Save view (reviewed)'}).click();await approve(page);
   await pick(fr,'[name="me"]','Marc');const options=await fr.locator('[name="view"] option').allTextContents();
   assert.ok(options.includes('APAC contacted · shared')&&options.includes('BIO-Europe 2026 team view · shared'));assert.ok(!options.some(o=>o.startsWith('Anna – my CDAs')),'a private view is not visible to others');
   await pick(fr,'[name="me"]','Anna');assert.ok((await fr.locator('[name="view"] option').allTextContents()).includes('Anna – my CDAs · private'));
   // 2 After-meeting log: one review with activity, materials and versions, the stage change (stage history) and two follow-ups.
   await go(fr,'pipeline');await fr.locator('[name="view"]').selectOption('');await fr.locator('[name="view"] option[selected]').waitFor({state:'detached',timeout:10000});await fr.getByRole('button',{name:'Clear filters'}).click();await fr.getByRole('button',{name:'Clear filters'}).waitFor({state:'detached',timeout:10000});await fr.getByRole('button',{name:/Ironvale: NWB-101 Japan rights/}).first().click();await drawer(fr).waitFor();await fr.getByRole('button',{name:'Log activity'}).click();
   const form=fr.locator('form[data-action="save-log"]');await form.waitFor();assert.equal(await form.locator('input:disabled,select:disabled,textarea:disabled').count(),0,'inputs work in the sanitized frame');
   await fill(fr,'form[data-action="save-log"] [name="summary"]','Liam liked deck v3; wants the CMC summary.');
   await tick(fr,form.getByLabel('NWB-101 non-confidential deck v0'));
   await tick(fr,form.getByLabel('Liam Stand'));
   await pick(fr,'form[data-action="save-log"] [name="to"]','cda');
   await fill(fr,'form[data-action="save-log"] [name="fu1_title"]','Send CMC summary');await pick(fr,'form[data-action="save-log"] [name="fu1_owner"]','Anna');
   await fill(fr,'form[data-action="save-log"] [name="fu2_title"]','Book follow-up call');await pick(fr,'form[data-action="save-log"] [name="fu2_owner"]','Marc');
   const before=(await rows('partnerships.stage_history')).length;await form.getByRole('button',{name:'Save (reviewed)'}).click();assert.equal((await rows('partnerships.stage_history')).length,before);await approve(page);
   const ironvale=(await rows('partnerships.opportunities')).find((o:any)=>o.data.name==='Ironvale: NWB-101 Japan rights');assert.equal(ironvale.data.stage,'cda');
   assert.equal((await rows('partnerships.stage_history')).filter((h:any)=>h.data.opportunity_id===ironvale.id&&h.data.to_stage==='cda').length,1);
   const fus=(await rows('partnerships.follow_ups')).filter((f:any)=>['Send CMC summary','Book follow-up call'].includes(f.data.title));assert.deepEqual(fus.map((f:any)=>f.data.owner).sort(),['Anna','Marc']);
   const act=(await rows('partnerships.activities')).find((a:any)=>a.data.summary==='Liam liked deck v3; wants the CMC summary.');assert.deepEqual(JSON.parse(act.data.materials).map((m:any)=>[m.title,m.version]),[['NWB-101 non-confidential deck',0]]);
   await drawer(fr).getByText('Liam liked deck v3; wants the CMC summary.').first().waitFor();await fr.getByRole('button',{name:'Close',exact:true}).first().click();await drawer(fr).waitFor({state:'detached'});
   await go(fr,'activity');await fr.getByRole('button',{name:'Materials log'}).click();await fr.getByRole('region',{name:'Materials log'}).getByText('NWB-101 non-confidential deck').first().waitFor();
   // 1 After the event: outcome, next step and a follow-up for one meeting.
   await go(fr,'conferences');await fr.locator('[data-action^="panel:outcome:"]').first().click();const oc=fr.locator('form[data-action="save-outcome"]');await oc.waitFor();
   await fill(fr,'form[data-action="save-outcome"] [name="outcome"]','Interested in Japan rights after CDA');await fill(fr,'form[data-action="save-outcome"] [name="fu_title"]','Send CDA to Ironvale');await pick(fr,'form[data-action="save-outcome"] [name="fu_owner"]','Marc');
   await oc.getByRole('button',{name:'Save outcome (reviewed)'}).click();await approve(page);assert.ok((await rows('partnerships.follow_ups')).some((f:any)=>f.data.title==='Send CDA to Ironvale'&&f.data.activity_id));
   // 4 Research: accept a target suggestion (history check shown), creating an opportunity at Identified; the digest preview and the cadence switch.
   await go(fr,'research');await fr.getByRole('button',{name:'Target suggestions'}).click();await fr.getByRole('button',{name:'Accept Glenmoor Biologics'}).click();await drawer(fr).getByText(/Earlier decline: Glenmoor Biologics/).waitFor();
   await pick(fr,'form[data-action="accept-signal"] [name="owner"]','Sofia');await fr.getByRole('button',{name:'Accept (reviewed)'}).click();await approve(page);
   const acc=(await rows('partnerships.opportunities')).filter((o:any)=>o.data.source==='research'&&o.data.stage==='identified'&&o.data.owner==='Sofia');assert.equal(acc.length,1);
   await go(fr,'settings');const subject=await fr.locator('#pt-digest-subject').textContent();assert.match(subject!,/^Partnerships · week of \d+ \w+: \d+ moved · \d+ due · \d+ new signals$/);
   const body=await fr.locator('#pt-digest').textContent();assert.ok((subject+' '+body).split(/\s+/).filter(w=>/[A-Za-z0-9]/.test(w)).length<=165);assert.match(body!,/Open Partnerships →$/);
   await fr.getByText('Every Monday at 07:00 (Europe/Berlin)').first().waitFor();await pick(fr,'[name="digest_cadence"]','daily');await fr.getByText('Every day at 07:00 (Europe/Berlin)').first().waitFor();
   await fr.getByRole('button',{name:'Save settings (reviewed)'}).click();await approve(page);assert.equal((await rows('partnerships.settings'))[0].data.digest_cadence,'daily');
   assert.match((await fr.locator('#pt-schedule').textContent())!,/"frequency":"daily"/);
   // 9 The layout gear reaches the host as the native tracker:layout event; the Data Room integration offer is the platform hook.
   await fr.getByRole('button',{name:'App layout settings'}).click();for(let i=0;i<20&&!host.includes('tracker:layout');i++)await page.waitForTimeout(100);assert.ok(host.includes('tracker:layout'));
  }else{
   // Mobile forms: add a follow-up from My week and mark one done, both reviewed.
   await go(fr,'activity');await fr.getByRole('button',{name:'My week'}).click();await pick(fr,'[name="me"]','Anna');await fr.getByText('My opportunities needing a step').waitFor();
   await fr.getByRole('button',{name:'Follow-ups',exact:true}).click();await fr.getByRole('button',{name:'Add follow-up'}).click();const ff=fr.locator('form[data-action="save-fu"]');await ff.waitFor();
   await fill(fr,'form[data-action="save-fu"] [name="title"]','Mobile follow-up');await pick(fr,'form[data-action="save-fu"] [name="owner"]','Sofia');await page.screenshot({path:`${shots}/partnerships-followup-390.png`});
   await ff.getByRole('button',{name:'Add (reviewed)'}).click();await approve(page);assert.ok((await rows('partnerships.follow_ups')).some((f:any)=>f.data.title==='Mobile follow-up'&&f.data.owner==='Sofia'));
   await fr.getByRole('button',{name:'Mark Mobile follow-up done'}).click();await approve(page);assert.equal((await rows('partnerships.follow_ups')).find((f:any)=>f.data.title==='Mobile follow-up').data.status,'done');
   assert.ok(await overflow(fr)<=0,'no overflow after mobile forms');
  }
  assert.deepEqual(errors,[]);assert.equal(await page.locator('#error').textContent(),'');await page.close();}
 assert.deepEqual(external,[],'7: nothing leaves the TrialAgents host');
 console.log('Partnerships browser test passed: seven screens and the §13 acceptance flows at 1440 and 390 px, screenshots in '+shots);
}finally{await browser.close();server.close();await x.pg.close();}
