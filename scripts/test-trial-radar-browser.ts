import {createServer} from 'node:http';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {withActor} from '../src/db/context.js';
import {frontendFrameDocument} from '../src/shared/frontend-frame.js';
import {suite,seedDemo} from '../tests/fixtures/trial-radar-db.js';
/* Trial Radar 1.0.0 in the production sanitized frame with a manifest attached (BIO_RADAR.md §5), at 1440 and 390 px: four screens with
 * no page overflow and no error banner, and the main interactions through the real UI and the reviewed path: open a trial and watch it,
 * dismiss an event with a typed reason, edit the research template, the calendar, and the layout gear. Screenshots go to
 * TRIAL_RADAR_SCREENSHOTS (default /tmp). Fictional data only. */
process.env.APP_DESIGN_CHECKS='off';
const x=await suite();const w=await withActor(x.human,()=>x.workspace('Browser'));
const {receipt}=await withActor(x.human,()=>x.install(w,'Trial Radar',false));const map=x.mapOf(await withActor(x.human,()=>x.comp(w,receipt.appId)));
await withActor(x.human,()=>seedDemo(x,w,map));
const frame=await frontendFrameDocument();const host:string[]=[];let queue:Promise<any>=Promise.resolve();
const server=createServer(async(req,res)=>{try{
 if(req.url==='/frame'){res.setHeader('Content-Type','text/html');res.end(frame);return;}
 if(req.url==='/api'){let body='';for await(const chunk of req)body+=chunk;const {name,args}=JSON.parse(body);let result:any;
  if(name==='run'){const run=async()=>withActor(x.human,async()=>{const c=await x.comp(w,receipt.appId);return x.f.runFrontend(x.human,w,{componentId:c.id,expectedVersion:c.version,...args});});const p=queue.then(run,run);queue=p.catch(()=>{});result=await p;}
  else if(name==='confirm')result=await withActor(x.human,()=>x.f.confirm(x.human,w,args.id,args.digest));
  else if(name==='host'){host.push(args.event);result={};}else throw Error('Unknown test request');
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return;}
 res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><body style="margin:0"><div id="error"></div><button id="approve" hidden>Confirm record changes</button><iframe id="app" src="/frame" style="width:100%;height:100vh;border:0;display:block"></iframe><script>
 let proposal,last={};const channel='rd-test';let chain=Promise.resolve();const api=(name,args={})=>{const run=async()=>{const r=await fetch('/api',{method:'POST',body:JSON.stringify({name,args})});const d=await r.json();if(!r.ok)throw Error(d.error);return d;};const p=chain.then(run,run);chain=p.catch(()=>{});return p;};let opened=false;
 function paint(out){document.querySelector('#app').contentWindow.postMessage({kind:'trialy.render',channel,appLinks:true,appOrigin:location.origin,...out},'*');proposal=out.proposal;document.querySelector('#approve').hidden=!proposal;last=out.state;}
 document.querySelector('#approve').onclick=async()=>{await api('confirm',{id:proposal.id,digest:proposal.digest});paint(await api('run',{state:last,event:{kind:'open'}}));};
 window.addEventListener('message',async e=>{if(e.source!==document.querySelector('#app').contentWindow)return;try{
  if(e.data.kind==='trialy.ready'){if(opened)return;opened=true;paint(await api('run',{state:{asOf:null},event:{kind:'open'}}));}
  if(e.data.kind==='trialy.event'){if(e.data.event.action==='tracker:layout'){await api('host',{event:'tracker:layout'});return;}paint(await api('run',{state:e.data.state,event:e.data.event}));}
 }catch(err){document.querySelector('#error').textContent=err.message;}});
 </script></body></html>`);
}catch(e){res.statusCode=400;res.end(JSON.stringify({error:(e as Error).message}));}});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const shots=process.env.TRIAL_RADAR_SCREENSHOTS||'/tmp';
const overflow=(fr:any)=>fr.locator('html').evaluate((e:any)=>e.scrollWidth-e.clientWidth);
let current:any=null;const settle=async()=>{await current.waitForTimeout(200);};
async function go(fr:any,id:string){await fr.locator('.rd-nav [data-action="nav:'+id+'"]').click();await fr.locator('.rd-nav [data-action="nav:'+id+'"][aria-current="page"]').waitFor({timeout:30000});await settle();}
async function approve(page:any){await page.locator('#approve').waitFor({state:'visible',timeout:30000});await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden',timeout:30000});await settle();}
const rows=async(role:string)=>(await x.pg.query<any>("SELECT id,data FROM records WHERE type_id=$1 AND state<>'archived' ORDER BY created_at,id",[map[role].typeId])).rows;
try{
 for(const [width,height] of [[1440,1100],[390,900]]){
  const page=await browser.newPage({viewport:{width,height}}),errors:string[]=[];current=page;page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${(server.address() as any).port}`);const fr=page.frameLocator('#app');
  try{await fr.getByRole('heading',{name:'Trial Radar',exact:true}).waitFor({timeout:60000});}catch(e){throw Error('App did not open: '+(await page.locator('#error').textContent())+' '+errors.join(' '));}
  // Layout: four screens, no page overflow, no error banner; a screenshot of each.
  for(const id of ['overview','tracker','events','setup']){await go(fr,id);assert.equal(await fr.locator('.rd-banner.bad').count(),0,id+' '+width);assert.ok(await overflow(fr)<=0,'no page overflow on '+id+' at '+width);await page.screenshot({path:`${shots}/trial-radar-${id}-${width}.png`,fullPage:true});}
  // Overview shows the 3-run hint for WHO ICTRP and estimates as est.
  await go(fr,'overview');await fr.getByText(/WHO ICTRP was not reachable in the last 3 runs/).waitFor();assert.ok(await fr.locator('.rd-est').count()>0);
  // Trials: open a trial, the drawer's close stays reachable; watch an unwatched trial through the review.
  await go(fr,'tracker');const target=(await rows('trialradar.trials')).filter((r:any)=>!r.data.watched)[width===1440?0:1];
  await fr.getByRole('button',{name:target.data.natural_key,exact:true}).click();const dlg=fr.locator('[role="dialog"]').first();await dlg.waitFor();
  if(width===390)await page.screenshot({path:`${shots}/trial-radar-trial-390.png`});
  await dlg.getByRole('button',{name:'Watch',exact:true}).click();await approve(page);assert.equal((await rows('trialradar.trials')).find((r:any)=>r.id===target.id).data.watched,true);
  await fr.getByRole('button',{name:'Close',exact:true}).first().click();await settle();
  // Events: dismiss a new event with a typed reason (a textarea in the sanitized frame).
  await go(fr,'events');const ev=(await rows('trialradar.events')).find((r:any)=>r.data.status==='new');
  await fr.locator('[data-action^="open:event:'+ev.id+'"]').first().click();await fr.locator('[role="dialog"]').first().getByRole('button',{name:'Dismiss…'}).click();
  const reason=fr.locator('textarea[name="dismiss_reason"]');await reason.fill('Different indication (fictional)');await reason.dispatchEvent('change');await fr.locator('textarea[name="dismiss_reason"]').filter({hasText:'Different indication'}).waitFor();
  await fr.locator('[role="dialog"] button[type="submit"]').filter({hasText:'Dismiss'}).click();await approve(page);assert.equal((await rows('trialradar.events')).find((r:any)=>r.id===ev.id).data.status,'dismissed');
  // Calendar renders a month grid without overflow.
  await fr.getByRole('tab',{name:'Calendar'}).click();await settle();assert.ok(await overflow(fr)<=0,'calendar at '+width);await page.screenshot({path:`${shots}/trial-radar-calendar-${width}.png`,fullPage:true});
  // Setup: the research template editor saves a new version (typed into the sanitized frame).
  await go(fr,'setup');await fr.getByRole('tab',{name:'Research template'}).click();await settle();
  const note=fr.locator('input[name="note"]');await note.fill('Browser edit '+width);await note.dispatchEvent('change');await fr.locator('input[name="note"][value="Browser edit '+width+'"]').waitFor({state:'attached'});
  await fr.getByRole('button',{name:/^Save as version/}).click();await approve(page);await page.screenshot({path:`${shots}/trial-radar-template-${width}.png`,fullPage:true});
  // The layout gear goes to the host.
  await fr.getByRole('button',{name:'App layout settings'}).click();await settle();
  assert.equal(errors.length,0,errors.join(' '));await page.close();
 }
 const set=(await rows('trialradar.settings'))[0].data;assert.equal(set.research_template_version,3,'two template versions saved through the UI');
 assert.ok(host.includes('tracker:layout'));
 console.log('Trial Radar browser checks passed at 1440 and 390 px. Screenshots in '+shots);
}finally{await browser.close();server.close();await x.pg.close();}
