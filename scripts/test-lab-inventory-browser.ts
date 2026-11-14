import {createServer} from 'node:http';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {labFixture} from '../tests/fixtures/lab-inventory.js';
import {frontendFrameDocument} from '../src/shared/frontend-frame.js';
/* Lab Inventory 2.0.0 in the production sanitized frame with a manifest attached (LAB_INVENTORY.md §12 acceptance 10): six screens at
 * 1440 and 390 px and the mobile item page (QR route /item) at 390 px, with no page overflow and no error banner; text, number, date,
 * select and textarea inputs are enabled; a reviewed "Used one" from the item page writes nothing before approval; an item panel opens on
 * mobile with its close control reachable; the label sheet renders; the layout gear reaches the host. Screenshots in LAB_SCREENSHOTS. */
const x=await labFixture();let queue:Promise<any>=Promise.resolve();const component=x.component;const frame=await frontendFrameDocument();const host:string[]=[];let route:any=null;
const server=createServer(async(req,res)=>{try{
 if(req.url==='/frame'){res.setHeader('Content-Type','text/html');res.end(frame);return;}
 if(req.url==='/api'){let body='';for await(const chunk of req)body+=chunk;const {name,args}=JSON.parse(body);let result:any;
  if(name==='run'){const run=()=>x.f.runFrontend(x.actor,x.w.id,{componentId:component.id,expectedVersion:component.version,...args,...(route?{route}:{})});const p=queue.then(run,run);queue=p.catch(()=>{});result=await p;}
  else if(name==='confirm')result=await x.f.confirm(x.actor,x.w.id,args.id,args.digest);
  else if(name==='host'){host.push(args.event);result={};}else throw Error('Unknown test request');
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return;}
 res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><body style="margin:0"><div id="error"></div><button id="approve" hidden>Confirm record changes</button><iframe id="app" src="/frame" style="width:100%;height:1000px;border:0"></iframe><script>
 let proposal,last={};const channel='li-test';let chain=Promise.resolve();const api=(name,args={})=>{const run=async()=>{const r=await fetch('/api',{method:'POST',body:JSON.stringify({name,args})});const d=await r.json();if(!r.ok)throw Error(d.error);return d;};const p=chain.then(run,run);chain=p.catch(()=>{});return p;};let opened=false;
 function paint(out){document.querySelector('#app').contentWindow.postMessage({kind:'trialy.render',channel,appLinks:true,appOrigin:location.origin,...out},'*');proposal=out.proposal;document.querySelector('#approve').hidden=!proposal;last=out.state;}
 document.querySelector('#approve').onclick=async()=>{await api('confirm',{id:proposal.id,digest:proposal.digest});paint(await api('run',{state:last,event:{kind:'open'}}));};
 window.addEventListener('message',async e=>{if(e.source!==document.querySelector('#app').contentWindow)return;try{
  if(e.data.kind==='trialy.ready'){if(opened)return;opened=true;paint(await api('run',{event:{kind:'open'}}));}
  if(e.data.kind==='trialy.event'){if(e.data.event.action==='tracker:layout'){await api('host',{event:'tracker:layout'});return;}paint(await api('run',{state:e.data.state,event:e.data.event}));}
 }catch(err){document.querySelector('#error').textContent=err.message;}});
 </script></body></html>`);
}catch(e){res.statusCode=400;res.end(JSON.stringify({error:(e as Error).message}));}});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${(server.address() as any).port}`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const shots=process.env.LAB_SCREENSHOTS||'/tmp';
const overflow=(fr:any)=>fr.locator('html').evaluate((e:any)=>e.scrollWidth-e.clientWidth);
let current:any=null;
async function go(fr:any,id:string){for(let i=0;i<5;i++){await fr.locator('.li-nav [data-action="nav:'+id+'"]').click();try{await fr.locator('.li-nav [data-action="nav:'+id+'"][aria-current="page"]').waitFor({timeout:5000});await current.evaluate(()=>{document.querySelector('#error')!.textContent='';});return;}catch(e){const err=await current.locator('#error').textContent();if(err&&!/busy/i.test(err))throw Error('Navigation to '+id+' failed: '+err);await current.evaluate(()=>{document.querySelector('#error')!.textContent='';});await current.waitForTimeout(500);}}throw Error('Navigation to '+id+' stayed busy');}
const lotsOf=async(name:string)=>{const it=(await x.s.records(x.actor,x.w.id,x.map['labinventory.items'].typeId,{limit:100,offset:0})).rows.find((r:any)=>r.data.name===name);return {it,lots:(await x.s.records(x.actor,x.w.id,x.map['labinventory.lots'].typeId,{limit:100,offset:0})).rows.filter((l:any)=>l.data.item_id===it.id)};};
try{
 for(const [width,height] of [[1440,1100],[390,900]]){
  const page=await browser.newPage({viewport:{width,height}}),errors:string[]=[];current=page;page.on('pageerror',e=>errors.push(e.message));route=null;
  await page.goto(url);const fr=page.frameLocator('#app');try{await fr.getByRole('heading',{name:'Lab Inventory',exact:true}).waitFor({timeout:60000});}catch(e){throw Error('App did not open: '+(await page.locator('#error').textContent())+' '+errors.join(' '));}
  for(const id of ['overview','inventory','requests','orders','locations','settings']){await go(fr,id);
   assert.equal(await fr.locator('.li-banner.bad').count(),0,id+' '+width);assert.ok(await overflow(fr)<=0,'no page overflow on '+id+' at '+width);
   await page.screenshot({path:`${shots}/lab-inventory-${id}-${width}.png`,fullPage:true});}
  // Inputs are enabled in the sanitized frame with a manifest: text (search), select (filter), number, date and textarea (forms).
  await go(fr,'inventory');const q=fr.locator('#li-q');assert.equal(await q.isDisabled(),false);await q.fill('tips');await q.press('Enter');await q.dispatchEvent('change');await fr.getByText('Pipette tips 1000 µL (fictional)').first().waitFor();
  await fr.locator('#li-fl-category').selectOption({label:'Consumable'});await fr.locator('#li-fl-category').dispatchEvent('change');
  // An item panel (drawer) opens and its close control stays reachable.
  await fr.getByRole('button',{name:'Details Pipette tips 200 µL (fictional)'}).click();const close=fr.getByRole('button',{name:'Close',exact:true}).first();await close.waitFor();assert.ok(await close.isVisible());await fr.getByText('Usage history').first().waitFor();
  if(width===390)await page.screenshot({path:`${shots}/lab-inventory-item-panel-390.png`});await close.click();
  await go(fr,'requests');await fr.getByRole('button',{name:'New request'}).click();const qty=fr.locator('#li-request-quantity'),note=fr.locator('#li-request-note');
  assert.equal(await qty.isDisabled(),false);assert.equal(await note.isDisabled(),false);await fr.locator('#li-request-item_id').selectOption({label:'Agarose (fictional) (FX-0119)'});
  await fr.getByText('We already have it').waitFor();await fr.getByRole('button',{name:'Close',exact:true}).first().click();
  await go(fr,'orders');await fr.getByRole('button',{name:/Receive order/}).first().click();assert.equal(await fr.locator('input[type="date"]').first().isDisabled(),false);await fr.getByRole('button',{name:'Close',exact:true}).first().dispatchEvent('click');await fr.locator('.li-overlay').waitFor({state:'detached'});
  if(width===1440){
   await fr.getByRole('button',{name:'App layout settings'}).click();for(let i=0;i<20&&!host.includes('tracker:layout');i++)await page.waitForTimeout(100);assert.ok(host.includes('tracker:layout'));
   // QR label sheet (A4, 21 labels).
   await go(fr,'inventory');await fr.getByRole('button',{name:/Print QR labels/}).click();await fr.locator('[name="x_'+(await lotsOf('Pipette tips 200 µL (fictional)')).it.id+'"]').check();
   await fr.getByRole('button',{name:'Show label sheet'}).click();await fr.locator('.li-sheet .li-qr').first().waitFor();await page.screenshot({path:`${shots}/lab-inventory-labels-1440.png`,fullPage:true});
   await fr.getByRole('button',{name:'Done'}).click();
  }
  assert.deepEqual(errors,[]);assert.equal(await page.locator('#error').textContent(),'');await page.close();}
 // The mobile item page, as opened from a QR label: "Used one" takes the earliest-expiring lot, nothing is written before approval.
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors:string[]=[];current=page;page.on('pageerror',e=>errors.push(e.message));
 const fbs=await lotsOf('Fetal bovine serum (fictional)');route={path:'/item',recordId:fbs.it.id};
 await page.goto(url);const fr=page.frameLocator('#app');await fr.getByRole('heading',{name:'Fetal bovine serum (fictional)'}).waitFor({timeout:60000});
 assert.ok(await overflow(fr)<=0,'no overflow on the item page');assert.equal(await fr.locator('.li-rail').count(),0);await fr.getByText('Use next: lot L80748').waitFor();
 await page.screenshot({path:`${shots}/lab-inventory-item-page-390.png`,fullPage:true});
 const me=fr.locator('#li-me');await me.fill('Ana Silva');await me.dispatchEvent('change');await fr.locator('#li-me[value="Ana Silva"]').waitFor({state:'attached'});
 await fr.getByRole('button',{name:'Used one',exact:true}).first().click();await page.locator('#approve').waitFor({state:'visible'});
 const earliest=fbs.lots.find((l:any)=>l.data.lot_number==='L80748');
 assert.equal((await lotsOf('Fetal bovine serum (fictional)')).lots.find((l:any)=>l.id===earliest.id).data.quantity,1,'nothing written before approval');
 await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden'});
 const after=(await lotsOf('Fetal bovine serum (fictional)')).lots.find((l:any)=>l.id===earliest.id).data;assert.deepEqual([after.quantity,after.status],[0,'used_up']);
 const mv=(await x.s.records(x.actor,x.w.id,x.map['labinventory.movements'].typeId,{limit:200,offset:0})).rows.filter((m:any)=>m.data.lot_id===earliest.id&&m.data.kind==='used');assert.deepEqual(mv.map((m:any)=>[m.data.quantity_change,m.data.via]),[[-1,'qr']]);
 await fr.getByText(/Use next: lot (?!L80748)/).waitFor();await page.screenshot({path:`${shots}/lab-inventory-item-page-after-390.png`,fullPage:true});
 assert.deepEqual(errors,[]);await page.close();
 console.log('Lab Inventory browser test passed: six screens at 1440 and 390 px and the mobile item page at 390 px; screenshots in '+shots);
}finally{await browser.close();server.close();await x.pg.close();}
