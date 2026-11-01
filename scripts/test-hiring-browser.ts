import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {hiringFixture} from '../tests/fixtures/hiring.js';
import {frontendFrameDocument} from '../src/shared/frontend-frame.js';
import {prepareToolLayout} from '../src/workspace/tool-layout.js';
const x=await hiringFixture();let component=x.component;
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
 let current,proposal;const channel='hiring-test';window.api=async(name,args={})=>{const r=await fetch('/api',{method:'POST',body:JSON.stringify({name,args})});const data=await r.json();if(!r.ok)throw Error(data.error);return data;};
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
 await frame.getByRole('heading',{name:'Team pulse',exact:true}).waitFor();await page.screenshot({path:'/tmp/hiring-desktop.png',fullPage:true});
 assert.equal(await frame.locator('[aria-label="Planning month"]').isEnabled(),true);await frame.locator('[aria-label="Planning month"]').selectOption('2026-12');await frame.locator('[aria-label="Planning month"] option[value="2026-12"][selected]').waitFor({state:'attached'});
 for(const section of ['people','planner','forecast','requests','scenarios','overview']){await frame.locator('.hw-nav [data-action="nav|'+section+'"]').click();await frame.locator('.hw-nav [data-action="nav|'+section+'"][aria-current="page"]').waitFor();assert.equal(await frame.locator('h1').count(),1);}
 await frame.locator('.hw-nav [data-action="nav|scenarios"]').click();await frame.locator('[aria-label="Scenario"]').waitFor();assert.equal(await frame.locator('[aria-label="Scenario"]').isEnabled(),true);
 const scenarioId=(await x.s.records(x.actor,x.w.id,x.map.scenarios.typeId,{limit:100,offset:0})).rows[0].id;await frame.locator('[aria-label="Scenario"]').selectOption(scenarioId);await frame.locator('[aria-label="Scenario"] option[value="'+scenarioId+'"][selected]').waitFor({state:'attached'});
 await frame.locator('.hw-nav [data-action="nav|requests"]').click();await frame.locator('[data-action="new|requests"]').click();const form=frame.locator('#hw-edit');
 assert.equal(await form.locator('input:disabled,select:disabled,textarea:disabled').count(),0);
 await form.locator('[name="name"]').fill('Browser hiring need');await form.locator('[name="name"][value="Browser hiring need"]').waitFor();await form.locator('[name="fte"]').fill('0.5');await form.locator('[name="fte"][value="0.5"]').waitFor();
 await form.locator('[name="status"]').selectOption('Pending');await form.locator('[name="status"] option[value="Pending"][selected]').waitFor({state:'attached'});
 await form.locator('[name="targetStart"]').fill('2027-01');await form.locator('[name="targetStart"][value="2027-01"]').waitFor();
 await form.getByRole('button',{name:'Prepare for review'}).click();await page.locator('#approve').waitFor({state:'visible'});
 assert.equal((await x.s.records(x.actor,x.w.id,x.map.requests.typeId,{limit:100,offset:0})).rows.length,1);
 await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden'});assert.equal((await x.s.records(x.actor,x.w.id,x.map.requests.typeId,{limit:100,offset:0})).rows.length,2);
 await frame.locator('.hw-nav [data-action="nav|requests"]').click();const search=frame.getByRole('textbox',{name:'Search records'});await search.fill('Browser');await frame.locator('[data-action="search"][value="Browser"]').waitFor();assert.equal(await frame.locator('.hw-table tbody tr').count(),1);
 await frame.getByRole('button',{name:'Layout settings'}).click();await page.getByRole('button',{name:'Move Team pulse'}).waitFor();await page.getByRole('button',{name:'Move What-if plans'}).dragTo(page.getByRole('button',{name:'Move Team pulse'}));
 await page.getByRole('button',{name:'Fields',exact:true}).click();await page.getByRole('button',{name:'Move Status',exact:true}).click();await page.getByRole('button',{name:'Move Person',exact:true}).click();
 await page.getByRole('button',{name:'Review layout',exact:true}).click();await page.getByRole('button',{name:'Confirm layout',exact:true}).click();await frame.locator('.hw-nav button').first().filter({hasText:'What-if plans'}).waitFor();
 await page.reload();await frame.getByRole('heading',{name:'Team pulse',exact:true}).waitFor();assert.equal(await frame.locator('.hw-nav button').first().getAttribute('data-action'),'nav|scenarios');
 await frame.locator('.hw-nav [data-action="nav|people"]').click();await frame.getByRole('heading',{name:'Our people',exact:true}).waitFor();assert.equal(await frame.locator('.hw-table th').first().textContent(),'Status');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/hiring-mobile.png',fullPage:true});await frame.getByRole('button',{name:'Layout settings'}).click();await page.getByRole('button',{name:'Move What-if plans'}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Move Our people'}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Ignore changes',exact:true}).click();await frame.getByRole('heading',{name:'Our people',exact:true}).waitFor();assert.equal(await frame.locator('.hw-nav button').first().getAttribute('data-action'),'nav|scenarios');
 assert.deepEqual(errors,[]);assert.equal(await page.locator('#error').textContent(),'');console.log('PASS: hiring production frame, editable manifest drafts, month/search/scenario controls, reviewed DB save, six screens, native drag/save/reload, mobile keyboard/Ignore.');
}finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));await x.pg.close();}
