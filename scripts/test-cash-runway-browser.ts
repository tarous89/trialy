import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {cashFixture} from '../tests/fixtures/cash-runway.js';
import {frontendFrameDocument} from '../src/shared/frontend-frame.js';
import {prepareToolLayout} from '../src/workspace/tool-layout.js';
const x=await cashFixture();let component=x.component;
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
 let current,proposal;const channel='cash-test';window.api=async(name,args={})=>{const r=await fetch('/api',{method:'POST',body:JSON.stringify({name,args})});const data=await r.json();if(!r.ok)throw Error(data.error);return data;};
 function paint(out){document.querySelector('#app').contentWindow.postMessage({kind:'trialy.render',channel,appLinks:true,appOrigin:location.origin,...out},'*');proposal=out.proposal;document.querySelector('#approve').hidden=!proposal;}
 window.openApp=async()=>{const r=await api('read');current=r.component;paint(r.output);};
 document.querySelector('#approve').onclick=async()=>{await api('confirm_workspace_change',{previewId:proposal.id,digest:proposal.digest});await openApp();};
 window.addEventListener('message',async e=>{if(e.source!==document.querySelector('#app').contentWindow)return;try{if(e.data.kind==='trialy.ready')await openApp();if(e.data.kind==='trialy.event'){if(e.data.event.action==='tracker:layout'){mountSettings(current);return;}paint(await api('run',{state:e.data.state,event:e.data.event}));}}catch(err){document.querySelector('#error').textContent=err.message;}});
 </script><script src="/bundle.js"></script></body></html>`);
 }catch(e){console.error('Fixture API failure:',(e as Error).message);res.statusCode=400;res.end(JSON.stringify({error:(e as Error).message}));}});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${(server.address() as any).port}`);const frame=page.frameLocator('#app');
 await frame.getByRole('heading',{name:'Cash Runway',exact:true}).waitFor();
 for(const section of ['ledger','budget','scenario','forecast','briefing','overview']){await frame.locator('.cr-nav [data-action="nav:'+section+'"]').click();await frame.locator('.cr-nav [data-action="nav:'+section+'"][aria-current="page"]').waitFor();}
 await frame.locator('.cr-nav [data-action="nav:ledger"]').click();await frame.getByRole('button',{name:'Add record',exact:true}).click();
 const form=frame.locator('form[data-action="save-record"]');await form.locator('[name="name"]').fill('Browser budget');await form.locator('[name="name"][value="Browser budget"]').waitFor();
 await form.locator('[name="kind"]').selectOption('budget_out');await form.locator('[name="kind"] option[value="budget_out"][selected]').waitFor({state:'attached'});
 await form.locator('[name="period"]').fill('2026-11-01');await form.locator('[name="period"][value="2026-11-01"]').waitFor();
 await form.locator('[name="amount"]').fill('125');await form.locator('[name="amount"][value="125"]').waitFor();
 await form.locator('[name="currency"]').fill('EUR');await form.locator('[name="currency"][value="EUR"]').waitFor();
 assert.equal(await form.locator('input:disabled,select:disabled,textarea:disabled').count(),0);
 await form.getByRole('button',{name:'Prepare reviewed save'}).click();await page.locator('#approve').waitFor({state:'visible'});
 assert.equal((await x.s.records(x.actor,x.w.id,x.map.ledger.typeId,{limit:100,offset:0})).rows.length,3);
 await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden'});
 assert.equal((await x.s.records(x.actor,x.w.id,x.map.ledger.typeId,{limit:100,offset:0})).rows.length,4);
 await frame.getByRole('button',{name:'App layout settings'}).click();await page.getByRole('button',{name:'Move Financial overview'}).waitFor();await page.screenshot({path:'/tmp/cash-layout-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Move Cash forecast'}).dragTo(page.getByRole('button',{name:'Move Financial overview'}));
 await page.getByRole('button',{name:'Fields',exact:true}).click();
 await page.getByRole('button',{name:'Move Amount',exact:true}).click();await page.getByRole('button',{name:'Move Name',exact:true}).click();
 await page.getByRole('button',{name:'Review layout',exact:true}).click();await page.getByRole('button',{name:'Confirm layout',exact:true}).click();
 await frame.getByRole('heading',{name:'Cash Runway',exact:true}).waitFor();
 await frame.locator('.cr-nav button').first().filter({hasText:'Cash forecast'}).waitFor();
 await page.reload();try{await frame.getByRole('heading',{name:'Cash Runway',exact:true}).waitFor({timeout:10000});}catch(e){console.error('Reload diagnostic:',await page.locator('#error').textContent(),await frame.locator('body').innerText());throw e;}
 assert.equal(await frame.locator('.cr-nav button').first().getAttribute('data-action'),'nav:forecast');
 await frame.locator('.cr-nav [data-action="nav:ledger"]').click();assert.equal(await frame.locator('.cr-table th').first().textContent(),'Amount');
 await page.setViewportSize({width:390,height:844});await frame.getByRole('button',{name:'App layout settings'}).click();await page.getByRole('button',{name:'Move Cash forecast'}).waitFor();await page.screenshot({path:'/tmp/cash-layout-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Move Cash forecast'}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Move Expense tracker'}).focus();await page.keyboard.press('Enter');
 await page.getByRole('button',{name:'Ignore changes',exact:true}).click();await frame.getByRole('heading',{name:'Cash Runway',exact:true}).waitFor();assert.equal(await frame.locator('.cr-nav button').first().getAttribute('data-action'),'nav:forecast');
 assert.deepEqual(errors,[]);assert.equal(await page.locator('#error').textContent(),'');
 console.log('PASS: production sanitized frame, editable manifest-bound draft, exact DB review, six screens, native drag and pick/drop, save/reload, mobile ignore.');
}finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));await x.pg.close();}
