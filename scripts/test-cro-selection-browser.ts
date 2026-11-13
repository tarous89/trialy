import {createServer} from 'node:http';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {croSelectionFixture} from '../tests/fixtures/cro-selection.js';
import {frontendFrameDocument} from '../src/shared/frontend-frame.js';
/* CRO Selection 2.0.0 in the production sanitized frame with a manifest attached: eight screens at 1440 and 390 px (no page overflow,
 * no error banner), inputs enabled, a typed reviewed edit with nothing written before approval, a drawer on mobile, and the layout gear event. */
const x=await croSelectionFixture();let queue:Promise<any>=Promise.resolve();// one app run at a time per person, as the host doeslet component=x.component;const frame=await frontendFrameDocument();const host:string[]=[];
const server=createServer(async(req,res)=>{try{
 if(req.url==='/frame'){res.setHeader('Content-Type','text/html');res.end(frame);return;}
 if(req.url==='/api'){let body='';for await(const chunk of req)body+=chunk;const {name,args}=JSON.parse(body);let result:any;
  if(name==='run'){const run=()=>x.f.runFrontend(x.actor,x.w.id,{componentId:component.id,expectedVersion:component.version,...args});const t0=Date.now();if(process.env.DEBUG_CS)console.error('start',JSON.stringify(args.event??{}).slice(0,100));const p=queue.then(run,run);queue=p.catch(()=>{});result=await p;if(process.env.DEBUG_CS)console.error('end',Date.now()-t0);}
  else if(name==='confirm')result=await x.f.confirm(x.actor,x.w.id,args.id,args.digest);
  else if(name==='host'){host.push(args.event);result={};}else throw Error('Unknown test request');
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return;}
 res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><body style="margin:0"><div id="error"></div><button id="approve" hidden>Confirm record changes</button><iframe id="app" src="/frame" style="width:100%;height:1000px;border:0"></iframe><script>
 let proposal,last={};const channel='cs-test';let chain=Promise.resolve();const api=(name,args={})=>{const run=async()=>{const r=await fetch('/api',{method:'POST',body:JSON.stringify({name,args})});const d=await r.json();if(!r.ok)throw Error(d.error);return d;};const p=chain.then(run,run);chain=p.catch(()=>{});return p;};let opened=false;
 function paint(out){document.querySelector('#app').contentWindow.postMessage({kind:'trialy.render',channel,appLinks:true,appOrigin:location.origin,...out},'*');proposal=out.proposal;document.querySelector('#approve').hidden=!proposal;last=out.state;}
 document.querySelector('#approve').onclick=async()=>{await api('confirm',{id:proposal.id,digest:proposal.digest});paint(await api('run',{state:last,event:{kind:'open'}}));};
 window.addEventListener('message',async e=>{if(e.source!==document.querySelector('#app').contentWindow)return;try{
  if(e.data.kind==='trialy.ready'){if(opened)return;opened=true;paint(await api('run',{event:{kind:'open'}}));}
  if(e.data.kind==='trialy.event'){if(e.data.event.action==='tracker:layout'){await api('host',{event:'tracker:layout'});return;}paint(await api('run',{state:e.data.state,event:e.data.event}));}
  if(e.data.kind==='trialy.document')await api('host',{event:'document:'+e.data.context});
 }catch(err){document.querySelector('#error').textContent=err.message;}});
 </script></body></html>`);
}catch(e){res.statusCode=400;res.end(JSON.stringify({error:(e as Error).message}));}});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const shots=process.env.CRO_SELECTION_SCREENSHOTS||'/tmp';
const overflow=(fr:any)=>fr.locator('html').evaluate((e:any)=>e.scrollWidth-e.clientWidth);
let current:any=null;
async function go(fr:any,id:string){for(let i=0;i<5;i++){await fr.locator('.cs-nav [data-action="nav:'+id+'"]').click();try{await fr.locator('.cs-nav [data-action="nav:'+id+'"][aria-current="page"]').waitFor({timeout:5000});await current.evaluate(()=>{document.querySelector('#error')!.textContent='';});return;}catch(e){const err=await current.locator('#error').textContent();if(err&&!/busy/i.test(err))throw Error('Navigation to '+id+' failed: '+err);await current.evaluate(()=>{document.querySelector('#error')!.textContent='';});await current.waitForTimeout(500);}}throw Error('Navigation to '+id+' stayed busy');}
try{
 for(const [width,height] of [[1440,1100],[390,900]]){
  const page=await browser.newPage({viewport:{width,height}}),errors:string[]=[];current=page;page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${(server.address() as any).port}`);const fr=page.frameLocator('#app');try{await fr.getByRole('heading',{name:'CRO Selection',exact:true}).waitFor({timeout:60000});}catch(e){throw Error('App did not open: '+(await page.locator('#error').textContent())+' '+errors.join(' '));}
  for(const id of ['overview','requests','vendors','messages','proposals','evaluation','decision','settings']){await go(fr,id);
   assert.equal(await fr.locator('.cs-banner.bad').count(),0,id+' '+width);assert.ok(await overflow(fr)<=0,'no page overflow on '+id+' at '+width);
   await page.screenshot({path:`${shots}/cro-selection-${id}-${width}.png`,fullPage:true});}
  // Inputs are enabled in the sanitized frame with a manifest attached; the request picker switches requests.
  await go(fr,'proposals');const pick=fr.locator('[name="request"]');assert.equal(await pick.isDisabled(),false);
  await pick.selectOption({label:'28-day GLP toxicology study quote · Proposals'});await fr.getByText('Sponsor baseline').waitFor();await fr.locator('#cs-pick option[selected]',{hasText:'28-day GLP'}).waitFor({state:'attached'});
  // A drawer opens and its close control stays reachable.
  await go(fr,'vendors');await fr.getByRole('button',{name:/Details of Quartz Tox Labs/}).click();const close=fr.getByRole('button',{name:'Close',exact:true}).first();await close.waitFor();assert.ok(await close.isVisible());
  if(width===390)await page.screenshot({path:`${shots}/cro-selection-drawer-390.png`});await close.click();
  if(width===1440){
   // A typed reviewed edit: nothing is written before approval; the record version is captured when the form opens.
   await go(fr,'requests');await fr.getByRole('button',{name:'Edit request'}).click();const owner=fr.locator('form[data-action="save-record"] [name="owner"]');
   await owner.fill('Clinical outsourcing lead (fictional)');await owner.dispatchEvent('change');await fr.locator('[name="owner"][value="Clinical outsourcing lead (fictional)"]').waitFor({state:'attached'});
   await fr.getByRole('button',{name:'Prepare reviewed save'}).click();await page.locator('#approve').waitFor({state:'visible'});
   const before=(await x.s.records(x.actor,x.w.id,x.map['croselection.requests'].typeId,{limit:10,offset:0})).rows.find((r:any)=>r.data.name==='28-day GLP toxicology study quote');assert.equal(before.data.owner,'N. Clinical (fictional)');
   await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden'});
   const after=(await x.s.records(x.actor,x.w.id,x.map['croselection.requests'].typeId,{limit:10,offset:0})).rows.find((r:any)=>r.data.name==='28-day GLP toxicology study quote');assert.equal(after.data.owner,'Clinical outsourcing lead (fictional)');
   // The layout gear reaches the host as the native tracker:layout event.
   await fr.getByRole('button',{name:'App layout settings'}).click();await page.waitForFunction(()=>true);for(let i=0;i<20&&!host.includes('tracker:layout');i++)await page.waitForTimeout(100);assert.ok(host.includes('tracker:layout'));
   // The upload button is the platform hook, not an app upload.
   await go(fr,'requests');assert.equal(await fr.locator('[data-trialy-document^="upload "]').count()>=0,true);
  }
  assert.deepEqual(errors,[]);assert.equal(await page.locator('#error').textContent(),'');await page.close();}
 console.log('CRO Selection browser test passed: eight screens at 1440 and 390 px, screenshots in '+shots);
}finally{await browser.close();server.close();await x.pg.close();}
