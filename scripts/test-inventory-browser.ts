import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {inventoryFixture} from '../tests/fixtures/inventory.js';
import {frontendFrameDocument} from '../src/shared/frontend-frame.js';
import {prepareToolLayout} from '../src/workspace/tool-layout.js';
console.log("Fixture start");const x=await inventoryFixture();console.log("Fixture ready");let component=x.component;
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
 let current,proposal,lastState,queue=Promise.resolve();const channel='inventory-test';window.api=async(name,args={})=>{const r=await fetch('/api',{method:'POST',body:JSON.stringify({name,args})});const data=await r.json();if(!r.ok)throw Error(data.error);return data;};
 function paint(out){lastState=out.state;document.querySelector('#app').contentWindow.postMessage({kind:'trialy.render',channel,appLinks:true,appOrigin:location.origin,...out},'*');proposal=out.proposal;document.querySelector('#approve').hidden=!proposal;}
 window.openApp=async()=>{const r=await api('read');current=r.component;paint(r.output);};
 document.querySelector('#approve').onclick=async()=>{await api('confirm_workspace_change',{previewId:proposal.id,digest:proposal.digest});await openApp();};
 window.addEventListener('message',async e=>{if(e.source!==document.querySelector('#app').contentWindow)return;try{if(e.data.kind==='trialy.ready')await openApp();if(e.data.kind==='trialy.event'){if(e.data.event.action==='tracker:layout'){mountSettings(current);return;}queue=queue.then(async()=>paint(await api('run',{state:lastState,event:e.data.event}))).catch(err=>{document.querySelector('#error').textContent=err.message;});await queue;}}catch(err){document.querySelector('#error').textContent=err.message;}});
 </script><script src="/bundle.js"></script></body></html>`);
 }catch(e){console.error('Fixture API failure:',(e as Error).message);res.statusCode=400;res.end(JSON.stringify({error:(e as Error).message}));}});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(45000);
 await page.goto(`http://127.0.0.1:${(server.address() as any).port}`);const frame=page.frameLocator('#app');await frame.locator('h1').waitFor();
 for(const route of ['overview','items','movements','locations','requests','forecast']){await frame.locator('[data-action="nav:'+route+'"]').click();await frame.locator('[data-action="nav:'+route+'"][aria-current="page"]').waitFor();assert.equal(await frame.locator('h1').count(),1);}
 await frame.locator('[data-action="nav:items"]').click();await frame.locator('[data-action="add:items"]').click();let form=frame.locator('form[data-action="save-editor"]');assert.equal(await form.locator('input:disabled,select:disabled,textarea:disabled').count(),0);
 for(const [name,value]of [['name','Browser stock'],['sku','BROWSER-1'],['unit','boxes'],['reorder_point','2']]){await form.locator('[name="'+name+'"]').fill(value);await form.locator('[name="'+name+'"]').press('Tab');await form.locator('[name="'+name+'"][value="'+value+'"]').waitFor();}
 await form.locator('[name="category"]').selectOption('Consumable');await form.locator('[name="category"] option[selected][value="Consumable"]').waitFor({state:'attached'});
 await form.locator('[name="notes"]').fill('Preserved inventory context');await form.locator('[name="notes"]').press('Tab');await form.locator('[name="notes"]').filter({hasText:'Preserved inventory context'}).waitFor();
 await form.getByRole('button',{name:'Prepare reviewed save',exact:true}).click();await page.locator('#approve').waitFor({state:'visible'});await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden'});
 assert.ok((await x.s.records(x.actor,x.w.id,x.map.items.typeId,{limit:100,offset:0})).rows.some((r:any)=>r.data.name==='Browser stock'));
 await frame.locator('[data-action="nav:movements"]').click();const date=frame.locator('form [name="date"]');await date.fill('2026-10-31');await date.press('Tab');await frame.locator('[name="date"][value="2026-10-31"]').waitFor();
 const movementForm=frame.locator('form[data-action="save-movement"]');
 const lot=(await x.s.records(x.actor,x.w.id,x.map.lots.typeId,{limit:100,offset:0})).rows[0];
 await movementForm.locator('[name="item_id"]').selectOption(lot.data.item_id);await movementForm.locator('[name="item_id"] option[selected][value="'+lot.data.item_id+'"]').waitFor({state:'attached'});
 await movementForm.locator('[name="lot_id"]').selectOption(lot.id);await movementForm.locator('[name="lot_id"] option[selected][value="'+lot.id+'"]').waitFor({state:'attached'});
 await movementForm.locator('[name="to_location_id"]').selectOption(lot.data.location_id);await movementForm.locator('[name="to_location_id"] option[selected][value="'+lot.data.location_id+'"]').waitFor({state:'attached'});
 for(const [name,value]of [['name','Browser receipt'],['quantity','2']]){await movementForm.locator('[name="'+name+'"]').fill(value);await movementForm.locator('[name="'+name+'"]').press('Tab');await movementForm.locator('[name="'+name+'"][value="'+value+'"]').waitFor();}
 await movementForm.getByRole('button',{name:'Review movement',exact:true}).click();await page.locator('#approve').waitFor({state:'visible'});await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden'});
 assert.ok((await x.s.records(x.actor,x.w.id,x.map.movements.typeId,{limit:100,offset:0})).rows.some((r:any)=>r.data.name==='Browser receipt'));
 console.log('Sanitized controls, draft retention and reviewed save passed');
 await frame.getByRole('button',{name:'Open layout settings',exact:true}).click();await page.getByRole('button',{name:'Move Overview',exact:true}).waitFor();
 await page.getByRole('button',{name:'Move Inventory',exact:true}).dragTo(page.getByRole('button',{name:'Move Overview',exact:true}));
 await page.getByRole('button',{name:'Fields',exact:true}).click();await page.getByRole('button',{name:'Move Category',exact:true}).click();await page.getByRole('button',{name:'Move Item',exact:true}).click();
 await page.getByRole('button',{name:'Review layout',exact:true}).click();await page.getByRole('button',{name:'Confirm layout',exact:true}).click();await frame.locator('nav button').first().filter({hasText:'Inventory'}).waitFor();await page.reload();await frame.locator('h1').waitFor();assert.equal(await frame.locator('nav button').first().getAttribute('data-action'),'nav:items');
 await frame.locator('[data-action="nav:items"]').click();assert.equal(await frame.locator('table th').first().textContent(),'Category');
 await frame.getByRole('button',{name:'Open layout settings',exact:true}).click();await page.getByRole('button',{name:'Move Overview',exact:true}).click();await page.getByRole('button',{name:'Move Inventory',exact:true}).click();await page.getByRole('button',{name:'Ignore changes',exact:true}).click();await page.reload();await frame.locator('h1').waitFor();assert.equal(await frame.locator('nav button').first().getAttribute('data-action'),'nav:items');
 console.log('Native layout drag, keyboard/click, confirmation, Ignore and reopen passed');
 for(const width of [320,390,768,1100,1440]){await page.setViewportSize({width,height:1100});for(const route of ['overview','items','movements','locations','requests','forecast']){await frame.locator('[data-action="nav:'+route+'"]').click();await frame.locator('[data-action="nav:'+route+'"][aria-current="page"]').waitFor();assert.equal(await page.frames()[1].evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'Overflow '+width+' '+route);}await page.screenshot({path:'/tmp/inventory-'+width+'.png',fullPage:true});}
 await page.setViewportSize({width:320,height:1100});await frame.locator('[data-action="nav:items"]').click();await frame.locator('[data-action="add:items"]').click();await frame.getByRole('button',{name:'Prepare reviewed save',exact:true}).scrollIntoViewIfNeeded();assert.ok(await frame.getByRole('button',{name:'Prepare reviewed save',exact:true}).isVisible());await page.screenshot({path:'/tmp/inventory-mobile-drawer.png'});await frame.getByRole('button',{name:'Close editor',exact:true}).click();await frame.locator('[role="dialog"]').waitFor({state:'detached'});assert.deepEqual(errors,[]);assert.equal(await page.locator('#error').textContent(),'');console.log('PASS: six routes at five widths; mobile drawer; production frame and native layout');
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await x.pg.close();}
