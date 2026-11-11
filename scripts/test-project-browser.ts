import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {programsFixture} from '../tests/fixtures/programs.js';
import {frontendFrameDocument} from '../src/shared/frontend-frame.js';
import {prepareToolLayout} from '../src/workspace/tool-layout.js';
const x=await programsFixture();let component=x.component;
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {CustomToolLayout} from './src/shared/CustomToolLayout';
let root;window.mountSettings=(component)=>{document.querySelector('#app').hidden=true;root=createRoot(document.querySelector('#settings'));root.render(<CustomToolLayout component={component} call={window.api} onBack={()=>{root.unmount();document.querySelector('#app').hidden=false;}} onAccess={()=>{}} onSaved={c=>{root.unmount();document.querySelector('#app').hidden=false;window.openApp();}}/>);};`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}});
const frame=await frontendFrameDocument();
const server=createServer(async(req,res)=>{try{
 if(req.url==='/frame'){res.setHeader('Content-Type','text/html');res.end(frame);return;}
 if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);return;}
 if(req.url==='/api'){
  let body='';for await(const chunk of req)body+=chunk;const {name,args}=JSON.parse(body);let result:any;
  if(name==='read')result={component,output:await x.f.runFrontend(x.actor,x.w.id,{componentId:component.id,expectedVersion:component.version,event:{kind:'open'}})};
  else if(name==='run')result=await x.f.runFrontend(x.actor,x.w.id,{componentId:component.id,expectedVersion:component.version,...args});
  else if(name==='prepare_tool_layout')result=await prepareToolLayout(x.f,x.actor,x.w.id,args);
  else if(name==='confirm_workspace_change')result=await x.f.confirm(x.actor,x.w.id,args.previewId,args.digest);
  else if(name==='discard_workspace_preview')result=await x.f.discard(x.actor,x.w.id,args.previewId);
  else if(name==='read_project_component'){result=await x.f.readComponent(x.actor,x.w.id,args.componentId,args.includeOutput);component=result.component;}
  else throw Error('Unknown test request');res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return;
 }
 res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><body><div id="error"></div><button id="approve" hidden>Confirm record changes</button><div id="settings"></div><iframe id="app" src="/frame" style="width:100%;height:950px;border:0"></iframe><script>
 let current,proposal;const channel='programs-test';window.api=async(name,args={})=>{const r=await fetch('/api',{method:'POST',body:JSON.stringify({name,args})});const data=await r.json();if(!r.ok)throw Error(data.error);return data;};
 function paint(out){document.querySelector('#app').contentWindow.postMessage({kind:'trialy.render',channel,appLinks:true,appOrigin:location.origin,...out},'*');proposal=out.proposal;document.querySelector('#approve').hidden=!proposal;}
 window.openApp=async()=>{const r=await api('read');current=r.component;paint(r.output);};
 document.querySelector('#approve').onclick=async()=>{await api('confirm_workspace_change',{previewId:proposal.id,digest:proposal.digest});await openApp();};
 window.addEventListener('message',async e=>{if(e.source!==document.querySelector('#app').contentWindow)return;try{if(e.data.kind==='trialy.ready')await openApp();if(e.data.kind==='trialy.event'){if(e.data.event.action==='tracker:layout'){mountSettings(current);return;}paint(await api('run',{state:e.data.state,event:e.data.event}));}}catch(err){document.querySelector('#error').textContent=err.message;}});
 </script><script src="/bundle.js"></script></body></html>`);
 }catch(e){console.error('Fixture API failure:',(e as Error).message);res.statusCode=400;res.end(JSON.stringify({error:(e as Error).message}));}});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const slips=async()=>(await x.s.records(x.actor,x.w.id,x.map['programs.slips'].typeId,{limit:100,offset:0})).rows;
const overflow=(frame:any)=>frame.locator('html').evaluate((e:any)=>e.scrollWidth-e.clientWidth);
// The runtime allows one render per workspace and user; a click during a pending render is retried, as a user would.
async function go(page:any,frame:any,section:string){for(let i=0;i<4;i++){await frame.locator('.pg-nav [data-action="nav:'+section+'"]').click();try{await frame.locator('.pg-nav [data-action="nav:'+section+'"][aria-current="page"]').waitFor({timeout:4000});await page.evaluate(()=>{document.querySelector('#error')!.textContent='';});return;}catch(e){if(!/busy/.test(await page.locator('#error').textContent()||''))throw e;await page.evaluate(()=>{document.querySelector('#error')!.textContent='';});await page.waitForTimeout(400);}}throw Error('Navigation to '+section+' stayed busy');}
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${(server.address() as any).port}`);const frame=page.frameLocator('#app');
 await frame.getByRole('heading',{name:'Programs',exact:true}).waitFor();await frame.getByText('Candidate selection · PX-202, 15 Dec 2026 (34 days)').waitFor();
 for(const section of ['timeline','plan','decisions','raid','updates','settings','overview']){await go(page,frame,section);assert.equal(await frame.locator('.pg-banner.bad').count(),0,section);}
 await page.screenshot({path:'/tmp/programs-desktop-1440.png',fullPage:true});
 // Timeline: the Gantt scrolls horizontally inside its card; the page does not.
 await go(page,frame,'timeline');await frame.locator('.pg-gantt-wrap').waitFor();
 const wrap=await frame.locator('.pg-gantt-wrap').evaluate((e:any)=>[e.scrollWidth,e.clientWidth]);assert.ok(wrap[0]>wrap[1],'Gantt scrolls inside its card');assert.equal(await overflow(frame),0);
 await frame.getByText('EUR 21.0M · 35 months cushion').waitFor();
 await page.screenshot({path:'/tmp/programs-timeline-1440.png',fullPage:true});
 // What drives this date, then Edit dates: a later committed date needs a reason and writes one slip in the same review.
 await frame.locator('button.pg-diamond[aria-label^="IND submission"]').click();await frame.getByRole('heading',{name:'What drives this date: IND submission'}).waitFor();
 await frame.getByRole('button',{name:'Edit dates'}).click();
 const form=frame.locator('form[data-action="save-record"]');
 await form.locator('[name="end_date"]').fill('2027-04-21');await form.locator('[name="end_date"]').dispatchEvent('change');
 await frame.getByText('Committed date moves later by 21 days.').waitFor();await frame.getByText('Also move these 1 successor').waitFor();
 await form.locator('[name="slip_reason"]').selectOption('regulatory');await form.locator('[name="slip_reason"] option[value="regulatory"][selected]').waitFor({state:'attached'});
 await form.locator('[name="slip_detail"]').fill('Agency asked for more CMC data');await form.locator('[name="slip_detail"]').dispatchEvent('change');await form.locator('[name="slip_detail"][value="Agency asked for more CMC data"]').waitFor();
 assert.equal(await form.locator('input:disabled,select:disabled,textarea:disabled').count(),0);
 const before=(await slips()).length;
 await form.getByRole('button',{name:'Prepare reviewed save'}).click();await page.locator('#approve').waitFor({state:'visible'});
 assert.equal((await slips()).length,before,'nothing is written before approval');
 await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden'});
 assert.equal((await slips()).length,before+1);
 // Native layout gear: drag a screen, review, confirm, reload.
 await frame.getByRole('button',{name:'App layout settings'}).click();await page.getByRole('button',{name:'Move Overview'}).waitFor();
 await page.getByRole('button',{name:'Move RAID'}).dragTo(page.getByRole('button',{name:'Move Overview'}));
 await page.getByRole('button',{name:'Review layout',exact:true}).click();await page.getByRole('button',{name:'Confirm layout',exact:true}).click();
 await frame.locator('.pg-nav button').first().filter({hasText:'RAID'}).waitFor();await page.waitForTimeout(500);
 await page.reload();try{await frame.getByRole('heading',{name:'Programs',exact:true}).waitFor({timeout:10000});}catch(e){console.error('Reload diagnostic:',await page.locator('#error').textContent());throw e;}
 assert.equal(await frame.locator('.pg-nav button').first().getAttribute('data-action'),'nav:raid');
 // Mobile 390: one page scroll, Gantt still scrolls inside its card, keyboard pick-and-place with Ignore.
 await page.setViewportSize({width:390,height:844});
 for(const section of ['overview','timeline','plan','decisions','raid','updates','settings']){await go(page,frame,section);assert.equal(await overflow(frame),0,'390 overflow on '+section);}
 await go(page,frame,'timeline');const m=await frame.locator('.pg-gantt-wrap').evaluate((e:any)=>[e.scrollWidth,e.clientWidth]);assert.ok(m[0]>m[1]);
 await page.screenshot({path:'/tmp/programs-mobile-390.png',fullPage:true});
 await frame.getByRole('button',{name:'App layout settings'}).click();await page.getByRole('button',{name:'Move RAID'}).waitFor();
 await page.getByRole('button',{name:'Move RAID'}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Move Timeline'}).focus();await page.keyboard.press('Enter');
 await page.getByRole('button',{name:'Ignore changes',exact:true}).click();await frame.getByRole('heading',{name:'Programs',exact:true}).waitFor();assert.equal(await frame.locator('.pg-nav button').first().getAttribute('data-action'),'nav:raid');
 assert.deepEqual(errors,[]);assert.equal(await page.locator('#error').textContent(),'');
 console.log('PASS: production sanitized frame, seven screens, Gantt scrolls inside its card at 1440 and 390 with no page overflow, cash markers, what-drives-this-date, manifest-bound slip draft with exact DB review (one slip), native drag and pick/drop, save/reload, mobile ignore.');
}finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));await x.pg.close();}
