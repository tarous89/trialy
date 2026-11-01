import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {resourceFixture} from '../tests/fixtures/resource.js';
import {frontendFrameDocument} from '../src/shared/frontend-frame.js';
import {prepareToolLayout} from '../src/workspace/tool-layout.js';
const x=await resourceFixture();let component=x.component;
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
 let current,proposal;const channel='resource-test';window.api=async(name,args={})=>{const r=await fetch('/api',{method:'POST',body:JSON.stringify({name,args})});const data=await r.json();if(!r.ok)throw Error(data.error);return data;};
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
 await frame.getByRole('heading',{name:'Delivery pulse',exact:true}).waitFor();
 for(const section of ['schedule','projects','people','outlook','pulse']){await frame.locator('[data-action="nav:'+section+'"]').first().click();await frame.locator('.cro-navbtn[data-action="nav:'+section+'"][aria-current="page"]').waitFor();assert.equal(await frame.locator('h1').count(),1);}
 await frame.locator('.cro-navbtn[data-action="nav:schedule"]').click();const filter=frame.locator('[data-action="role-filter"]');assert.equal(await filter.isEnabled(),true);
 await filter.selectOption('CRA');await filter.locator('option[value="CRA"][selected]').waitFor({state:'attached'});await filter.selectOption('All');await filter.locator('option[value="All"][selected]').waitFor({state:'attached'});
 await frame.locator('[data-action="new:bookings"]').first().click();const form=frame.locator('form[data-action="save-record"]');
 assert.equal(await form.locator('input:disabled,select:disabled').count(),0);
 await form.locator('[name="name"]').fill('Browser booking');await form.locator('[name="name"][value="Browser booking"]').waitFor();
 await form.locator('[name="personId"]').selectOption(x.personId);await form.locator('[name="personId"] option[value="'+x.personId+'"][selected]').waitFor({state:'attached'});
 await form.locator('[name="projectId"]').selectOption(x.projectId);await form.locator('[name="projectId"] option[value="'+x.projectId+'"][selected]').waitFor({state:'attached'});
 await form.locator('[name="week"]').fill('2026-11-02');await form.locator('[name="week"][value="2026-11-02"]').waitFor();
 await form.locator('[name="hours"]').fill('8');await form.locator('[name="hours"][value="8"]').waitFor();
 await form.locator('[name="status"]').selectOption('Confirmed');await form.locator('[name="status"] option[value="Confirmed"][selected]').waitFor({state:'attached'});
 assert.equal(await form.locator('[name="name"]').inputValue(),'Browser booking');
 await form.getByRole('button',{name:'Prepare reviewed save'}).click();await page.locator('#approve').waitFor({state:'visible'});
 assert.equal((await x.s.records(x.actor,x.w.id,x.map.bookings.typeId,{limit:100,offset:0})).rows.length,1);
 await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden'});const records=(await x.s.records(x.actor,x.w.id,x.map.bookings.typeId,{limit:100,offset:0})).rows;assert.equal(records.length,2);assert.equal(records.find((r:any)=>r.data.name==='Browser booking')?.data.hours,8);
 await frame.locator('.cro-navbtn[data-action="nav:projects"]').click();await frame.getByRole('button',{name:'Manage projects',exact:true}).click();await frame.getByRole('button',{name:'Actions for Sponsor program',exact:true}).click();await frame.locator('.cro-menu').getByRole('button',{name:'Edit',exact:true}).click();await form.locator('[name="name"][value="Sponsor program"]').waitFor();await form.getByRole('button',{name:'Cancel',exact:true}).click();await form.waitFor({state:'detached'});
 const search=frame.getByRole('textbox',{name:'Search records'});await search.fill('Sponsor');await frame.locator('[data-action="search"][value="Sponsor"]').waitFor();assert.equal(await frame.locator('.cro-table tbody tr').count(),1);
 assert.ok((await frame.locator('h1').boundingBox())!.y<120,'Short project register starts near the top');console.log('PASS: five screens, filters, draft persistence, reviewed DB save and project management.');await page.screenshot({path:'/tmp/resource-desktop.png',fullPage:true});
 await frame.getByRole('button',{name:'Layout settings'}).click();await page.getByRole('button',{name:'Move Delivery pulse'}).waitFor();await page.getByRole('button',{name:'Move Capacity outlook',exact:true}).dragTo(page.getByRole('button',{name:'Move Delivery pulse'}));
 await page.getByRole('button',{name:'Fields',exact:true}).click();await page.getByRole('button',{name:'Move Status',exact:true}).click();await page.getByRole('button',{name:'Move Name',exact:true}).click();
 await page.getByRole('button',{name:'Review layout',exact:true}).click();await page.getByRole('button',{name:'Confirm layout',exact:true}).click();await frame.locator('.cro-navbtn').first().filter({hasText:'Capacity outlook'}).waitFor();
 await page.reload();await frame.locator('h1').waitFor();assert.equal(await frame.locator('.cro-navbtn').first().getAttribute('data-action'),'nav:outlook');
 await frame.locator('.cro-navbtn[data-action="nav:people"]').click();await frame.getByRole('heading',{name:'People & skills',exact:true}).waitFor();assert.equal(await frame.locator('.cro-table th').first().textContent(),'Status');
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:1100});assert.equal(await page.frames()[1].evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'No page overflow at '+width);}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/resource-mobile.png',fullPage:true});await frame.getByRole('button',{name:'Layout settings'}).click();await page.getByRole('button',{name:'Move Capacity outlook',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Move Team schedule'}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Ignore changes',exact:true}).click();await frame.locator('h1').waitFor();assert.equal(await frame.locator('.cro-navbtn').first().getAttribute('data-action'),'nav:outlook');
 assert.deepEqual(errors,[]);assert.equal(await page.locator('#error').textContent(),'');console.log('PASS: resource production frame, desktop drag/field order/save/reload, mobile keyboard/Ignore and 390/768/1440 widths.');
}finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));await x.pg.close();}
