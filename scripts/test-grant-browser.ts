import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {grantFixture} from '../tests/fixtures/grant.js';
import {frontendFrameDocument} from '../src/shared/frontend-frame.js';
import {prepareToolLayout} from '../src/workspace/tool-layout.js';
console.log("Fixture start");const x=await grantFixture();console.log("Fixture ready");let component=x.component;
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
 let current,proposal,lastState,queue=Promise.resolve();const channel='grant-test';window.api=async(name,args={})=>{const r=await fetch('/api',{method:'POST',body:JSON.stringify({name,args})});const data=await r.json();if(!r.ok)throw Error(data.error);return data;};
 function paint(out){lastState=out.state;document.querySelector('#app').contentWindow.postMessage({kind:'trialy.render',channel,appLinks:true,appOrigin:location.origin,...out},'*');proposal=out.proposal;document.querySelector('#approve').hidden=!proposal;}
 window.openApp=async()=>{const r=await api('read');current=r.component;paint(r.output);};
 document.querySelector('#approve').onclick=async()=>{await api('confirm_workspace_change',{previewId:proposal.id,digest:proposal.digest});await openApp();};
 window.addEventListener('message',async e=>{if(e.source!==document.querySelector('#app').contentWindow)return;try{if(e.data.kind==='trialy.ready')await openApp();if(e.data.kind==='trialy.event'){if(e.data.event.action==='tracker:layout'){mountSettings(current);return;}queue=queue.then(async()=>paint(await api('run',{state:lastState,event:e.data.event}))).catch(err=>{document.querySelector('#error').textContent=err.message;});await queue;}}catch(err){document.querySelector('#error').textContent=err.message;}});
 </script><script src="/bundle.js"></script></body></html>`);
 }catch(e){console.error('Fixture API failure:',(e as Error).message);res.statusCode=400;res.end(JSON.stringify({error:(e as Error).message}));}});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors:string[]=[];page.on('pageerror',e=>errors.push(e.stack||e.message));
 page.setDefaultTimeout(45000);console.log('Browser ready');await page.goto(`http://127.0.0.1:${(server.address() as any).port}`);const frame=page.frameLocator('#app');
 await frame.locator('h1').waitFor();console.log('Frame ready');



 for(const screen of ['opportunities','eligibility','applications','deadlines','review','pulse']){await frame.locator('nav [data-action="nav:'+screen+'"]').click();await frame.locator('nav [data-action="nav:'+screen+'"][aria-current="page"]').waitFor();assert.equal(await frame.locator('h1').count(),1);}
 console.log('Routes passed');await frame.locator('[data-action="nav:eligibility"]').click();const select=frame.locator('[data-action="selectCall"]');await select.waitFor();assert.equal(await select.isEnabled(),true);await select.selectOption(x.ids.opp002);await select.locator('option[selected][value="'+x.ids.opp002+'"]').waitFor({state:'attached'});
 await frame.locator('[data-action="menu:criteria:'+x.ids['check-002-1']+'"]').waitFor();
 await frame.locator('nav [data-action="nav:opportunities"]').click();await frame.locator('[data-action="search"]').fill('unmatched search phrase');await frame.locator('[data-action="search"]').press('Tab');await frame.getByText('No matching funding calls.',{exact:true}).waitFor();
 await frame.locator('[data-action="add:opportunities"]').click();const form=frame.locator('form[data-action="submit"]');assert.equal(await form.locator('input:disabled,select:disabled,textarea:disabled').count(),0);
 for(const [name,value]of [['title','Browser grant'],['funder','Synthetic funder'],['amountMax','12345']]){await form.locator('[name="'+name+'"]').fill(value);await form.locator('[name="'+name+'"]').press('Tab');await form.locator('[name="'+name+'"][value="'+value+'"]').waitFor();}
 await form.locator('[name="deadline"]').fill('2026-12-18');await form.locator('[name="deadline"]').press('Tab');await form.locator('[name="deadline"][value="2026-12-18"]').waitFor();
 await form.locator('[name="status"]').selectOption('Watchlist');await form.locator('[name="status"] option[selected][value="Watchlist"]').waitFor({state:'attached'});
 await form.getByRole('button',{name:'Show additional fields',exact:true}).click();await form.locator('[name="notes"]').fill('Retained research context');await form.locator('[name="notes"]').press('Tab');await form.locator('[name="notes"]').filter({hasText:'Retained research context'}).waitFor();
 const before=(await x.s.records(x.actor,x.w.id,x.map.opportunities.typeId,{limit:100,offset:0})).rows.length;
 await form.getByRole('button',{name:'Prepare review',exact:true}).click();await page.locator('#approve').waitFor({state:'visible'});assert.equal((await x.s.records(x.actor,x.w.id,x.map.opportunities.typeId,{limit:100,offset:0})).rows.length,before);await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden'});assert.equal((await x.s.records(x.actor,x.w.id,x.map.opportunities.typeId,{limit:100,offset:0})).rows.length,before+1);
 console.log('Controls and reviewed creation passed');await frame.getByRole('button',{name:'Configure layout',exact:true}).click();await page.getByRole('button',{name:'Move Funding pulse',exact:true}).waitFor();await page.getByRole('button',{name:'Move Opportunities',exact:true}).dragTo(page.getByRole('button',{name:'Move Funding pulse',exact:true}));await page.getByRole('button',{name:'Fields',exact:true}).click();await page.getByRole('button',{name:'Move Funder',exact:true}).click();await page.getByRole('button',{name:'Move Opportunity',exact:true}).click();
 await page.getByRole('button',{name:'Review layout',exact:true}).click();await page.getByRole('button',{name:'Confirm layout',exact:true}).click();await frame.locator('nav button').first().filter({hasText:'Opportunities'}).waitFor();await page.reload();await frame.locator('h1').waitFor();assert.equal(await frame.locator('nav button').first().getAttribute('data-action'),'nav:opportunities');assert.equal(await frame.locator('table th').first().textContent(),'Funder');
 console.log('Native layout passed');for(const width of [320,390,768,1100,1440]){await page.setViewportSize({width,height:1100});for(const screen of ['pulse','opportunities','eligibility','applications','deadlines','review']){await frame.locator('nav [data-action="nav:'+screen+'"]').click();await frame.locator('nav [data-action="nav:'+screen+'"][aria-current="page"]').waitFor();assert.equal(await page.frames()[1].evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'No overflow '+width+' '+screen);}await page.screenshot({path:'/tmp/grant-'+width+'.png',fullPage:true});}
 await page.setViewportSize({width:320,height:1100});await frame.locator('nav [data-action="nav:opportunities"]').click();await frame.locator('[data-action="add:opportunities"]').click();const mobileForm=frame.locator('form[data-action="submit"]');await mobileForm.getByRole('button',{name:'Prepare review',exact:true}).click();await frame.locator('[role="dialog"] [role="status"]').filter({hasText:'Provide an opportunity name and funder.'}).waitFor();
 await mobileForm.locator('[name="title"]').fill('Long biotechnology funding opportunity for the translational and manufacturing research programme');await mobileForm.locator('[name="title"]').press('Tab');await mobileForm.getByRole('button',{name:'Show additional fields',exact:true}).click();await mobileForm.locator('[name="notes"]').fill('Draft retained while additional fields are open.');await mobileForm.locator('[name="notes"]').press('Tab');await mobileForm.getByRole('button',{name:'Prepare review',exact:true}).scrollIntoViewIfNeeded();assert.equal(await mobileForm.getByRole('button',{name:'Prepare review',exact:true}).isVisible(),true);assert.equal(await page.frames()[1].evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);await page.screenshot({path:'/tmp/grant-mobile-drawer.png',fullPage:true});await mobileForm.getByRole('button',{name:'Cancel',exact:true}).click();await frame.locator('[role="dialog"]').waitFor({state:'detached'});assert.equal(await frame.locator('[role="dialog"]').count(),0);
 assert.deepEqual(errors,[]);assert.equal(await page.locator('#error').textContent(),'');console.log('PASS: six routes/five widths; text/date/number/select/textarea retention; reviewed create; native screen and column drag/reload');

}catch(e){console.error(e);throw e;}finally{await browser.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await x.pg.close();}
