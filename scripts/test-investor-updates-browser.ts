import {createServer} from 'node:http';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {investorUpdatesFixture} from '../tests/fixtures/investor-updates.js';
import {frontendFrameDocument} from '../src/shared/frontend-frame.js';
import {prepareContent,pageSegments} from '../src/domain/exchange-update-content.js';
/* Investor Updates 1.0.0 in the production sanitized frame with a manifest attached (INVESTOR_UPDATES.md §14 acceptance 15), at 1440 and 390 px:
 * five screens (no page overflow, no error banner), the update review drawer with its versions, a reviewed change through the real path,
 * then the recipient side: the update content the app sends, sanitised by the platform, rendered as the online page column and as the
 * email body at both widths, with the Gmail, Outlook and Apple Mail client checks. Fictional data; nothing is sent. */
const x=await investorUpdatesFixture();let queue:Promise<any>=Promise.resolve();const component=x.component;const frame=await frontendFrameDocument();const external:string[]=[];
const captured:any[]=[];
const server=createServer(async(req,res)=>{try{
 if(req.url==='/frame'){res.setHeader('Content-Type','text/html');res.end(frame);return;}
 if(req.url==='/api'){let body='';for await(const chunk of req)body+=chunk;const {name,args}=JSON.parse(body);let result:any;
  if(name==='run'){const run=()=>x.f.runFrontend(x.actor,x.w.id,{componentId:component.id,expectedVersion:component.version,...args});const p=queue.then(run,run);queue=p.catch(()=>{});result=await p;}
  else if(name==='confirm')result=await x.f.confirm(x.actor,x.w.id,args.id,args.digest);else throw Error('Unknown test request');
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return;}
 if(req.url?.startsWith('/page')){res.setHeader('Content-Type','text/html');res.end(captured[0]?.[req.url==='/page/email'?'email':'page']??'');return;}
 res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><body style="margin:0"><div id="error"></div><button id="approve" hidden>Confirm record changes</button><iframe id="app" src="/frame" style="width:100%;height:100vh;border:0;display:block"></iframe><script>
 let proposal,last={};const channel='iu-test';let chain=Promise.resolve();const api=(name,args={})=>{const run=async()=>{const r=await fetch('/api',{method:'POST',body:JSON.stringify({name,args})});const d=await r.json();if(!r.ok)throw Error(d.error);return d;};const p=chain.then(run,run);chain=p.catch(()=>{});return p;};let opened=false;
 function paint(out){document.querySelector('#app').contentWindow.postMessage({kind:'trialy.render',channel,appLinks:true,appOrigin:location.origin,...out},'*');proposal=out.proposal;document.querySelector('#approve').hidden=!proposal;last=out.state;}
 document.querySelector('#approve').onclick=async()=>{await api('confirm',{id:proposal.id,digest:proposal.digest});paint(await api('run',{state:last,event:{kind:'open'}}));};
 window.addEventListener('message',async e=>{if(e.source!==document.querySelector('#app').contentWindow)return;try{
  if(e.data.kind==='trialy.ready'){if(opened)return;opened=true;paint(await api('run',{event:{kind:'open'}}));}
  if(e.data.kind==='trialy.event'){if(e.data.event.action==='tracker:layout')return;paint(await api('run',{state:e.data.state,event:e.data.event}));}
 }catch(err){document.querySelector('#error').textContent=err.message;}});
 </script></body></html>`);
}catch(e){res.statusCode=400;res.end(JSON.stringify({error:(e as Error).message}));}});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const port=(server.address() as any).port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const shots=process.env.INVESTOR_UPDATES_SCREENSHOTS||'/tmp';
const overflow=(fr:any)=>fr.locator('html').evaluate((e:any)=>e.scrollWidth-e.clientWidth);
const rows=async(role:string)=>(await x.s.records(x.actor,x.w.id,x.map[role].typeId,{limit:200,offset:0})).rows as any[];
let current:any=null;
async function settle(){await current.waitForTimeout(150);}
async function go(fr:any,id:string){for(let i=0;i<5;i++){await fr.locator('.iu-nav [data-action="nav:'+id+'"]').click();try{await fr.locator('.iu-nav [data-action="nav:'+id+'"][aria-current="page"]').waitFor({timeout:6000});return;}catch(e){await current.waitForTimeout(400);}}throw Error('Navigation to '+id+' failed: '+await current.locator('#error').textContent());}
async function approve(page:any){await page.locator('#approve').waitFor({state:'visible',timeout:20000});await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden',timeout:20000});await settle();}
const drawer=(fr:any)=>fr.locator('[role="dialog"]').first();
try{
 for(const [width,height] of [[1440,1100],[390,900]]){
  const page=await browser.newPage({viewport:{width,height}}),errors:string[]=[];current=page;page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{const u=r.url();if(!u.startsWith('http://127.0.0.1')&&!u.startsWith('data:')&&!u.startsWith('about:'))external.push(u);});
  await page.goto(`http://127.0.0.1:${port}`);const fr=page.frameLocator('#app');
  try{await fr.getByRole('heading',{name:'Overview',exact:true}).waitFor({timeout:60000});}catch(e){throw Error('App did not open: '+(await page.locator('#error').textContent())+' '+errors.join(' '));}
  for(const id of ['overview','updates','investors','plans','settings']){await go(fr,id);
   assert.equal(await fr.getByText('could not be shown').count(),0,id+' '+width);assert.equal(await fr.getByText(/^Partial data/).count(),0,id+' '+width);assert.ok(await overflow(fr)<=0,'no page overflow on '+id+' at '+width);
   await page.screenshot({path:`${shots}/investor-updates-${id}-${width}.png`,fullPage:true});}
  // The review drawer: versions, fact panel with the changed Programs value, promise tracker; Close stays reachable.
  await go(fr,'updates');await fr.getByRole('button',{name:'Board – monthly update · October 2026'}).first().click();const dlg=drawer(fr);await dlg.waitFor();
  await dlg.getByText('Fact panel').waitFor();const box=await dlg.locator('.iu-mail-body').first().boundingBox();assert.ok(box&&box.height>200,'the version preview is visible ('+JSON.stringify(box)+')');await dlg.getByText(/Draft preclinical · now phase_1/).waitFor();await dlg.getByText(/this draft says 2027-Q2/).waitFor();
  assert.ok(await fr.getByRole('button',{name:'Close',exact:true}).first().isVisible());await page.screenshot({path:`${shots}/investor-updates-review-${width}.png`});
  if(width===1440){
   // A reviewed change through the real path: the block level change is written only after the person confirms.
   await dlg.locator('select[name="lv_b5"]').selectOption('investors');await dlg.locator('select[name="lv_b5"] option[selected][value="investors"]').waitFor({state:'attached'});
   await dlg.getByRole('button',{name:'Save levels'}).click();const before=(await rows('investorupdates.updates')).find((u:any)=>/October 2026/.test(u.data.title));
   assert.equal(JSON.parse(before.data.blocks).find((b:any)=>b.id==='b5').level,'board','nothing is written before approval');await approve(page);
   const after=(await rows('investorupdates.updates')).find((u:any)=>/October 2026/.test(u.data.title));assert.equal(JSON.parse(after.data.blocks).find((b:any)=>b.id==='b5').level,'investors');assert.equal(after.data.status,'in_review');
  }
  await fr.getByRole('button',{name:'Close',exact:true}).first().click();
  assert.deepEqual(errors,[],'no page errors at '+width);
 }
 // The recipient side: content the app builds for the board version, sanitised by the platform, as the page column and as the email body.
 const {fresh,render,approve:apply,fakeExchange}=await import('../tests/fixtures/investor-updates.js');const demoRows=fresh(),oct=demoRows.find(r=>r.role==='investorupdates.updates'&&r.data.period==='2026-10')!;oct.data.status='approved';oct.data.approved_2_by='Anna';
 const fx=fakeExchange();let st:any={};const step=async(ev:any)=>{const r=await render(demoRows,st,ev,{exchange:fx});st=r.state;return r;};
 await step({kind:'click',action:'send-open:'+oct.id});const prep=await step({kind:'click',action:'prepare-recipients'});apply(demoRows,prep.changes);await step({kind:'click',action:'create-links'});
 const content=fx.groups[0].config.content;const {content:stored,removed}=await prepareContent(content,async()=>[]);assert.deepEqual(removed,[],'the platform keeps the whole content');
 const segs=pageSegments(stored,(v:string)=>'/img/'+v);const pageHtml=segs.map((s:any)=>s.html?s.html:'<p><button style="padding:9px 16px">I can help</button></p>').join('');
 // The email exactly as the platform renders it for this group (update type, the app's default text), with its client checks.
 const {renderUpdateEmail,emailValues}=await import('../src/app-services/exchange-email.js');const group={content:stored,image_token:'img',series:'plan:board',series_name:'Board – monthly update',sender_name:'Anna',sender_company:'Northwind Bio (fictional)',title:fx.groups[0].config.title};
 const exchange={link_token:'t'.repeat(43),recipient_name:'Mara Okafor',recipient_company:'Alder Ventures (fictional)',recipient_emails:['mara@alder.example.invalid'],expires_at:null};
 const mail=renderUpdateEmail(fx.groups[0].config.emailDefaults.update,emailValues(group,exchange,{name:'Anna',company:'Northwind Bio (fictional)'}),{name:'Anna',company:'Northwind Bio (fictional)',email:'anna@northwind.invalid'},group,exchange,'00000000-0000-4000-8000-000000000001');
 for(const [client,issues] of Object.entries(mail.clientChecks))assert.deepEqual(issues,[],client+' client check');const email=mail.html;
 captured.push({page:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;font-family:Arial"><main style="max-width:600px;margin:0 auto;padding:16px">${pageHtml}</main></body></html>`,email});
 for(const [width,height] of [[1440,1000],[390,900]])for(const kind of ['page','email']){const page=await browser.newPage({viewport:{width,height}});await page.goto(`http://127.0.0.1:${port}/page/${kind==='email'?'email':'online'}`);
  const over=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.ok(over<=0,kind+' overflows at '+width+' by '+over);
  assert.ok(await page.getByText('Board only').count()>0,'the board version carries its board-only block');await page.screenshot({path:`${shots}/investor-updates-recipient-${kind}-${width}.png`,fullPage:true});await page.close();}
 assert.deepEqual(external,[],'nothing outside TrialAgents is contacted');
 console.log('Investor Updates browser test passed: 5 screens and the review drawer at 1440 and 390 px, a reviewed change, the recipient page column and email body at 1440 and 390 px (client checks clean).');
}finally{await browser.close();server.close();await x.pg.close();}
