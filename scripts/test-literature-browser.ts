import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {literatureFixture} from '../tests/fixtures/literature.js';
import {frontendFrameDocument} from '../src/shared/frontend-frame.js';
import {prepareToolLayout} from '../src/workspace/tool-layout.js';
console.log("Fixture start");const x=await literatureFixture();console.log("Fixture ready");let component=x.component;
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
 let current,proposal,lastState,queue=Promise.resolve();const channel='literature-test';window.api=async(name,args={})=>{const r=await fetch('/api',{method:'POST',body:JSON.stringify({name,args})});const data=await r.json();if(!r.ok)throw Error(data.error);return data;};
 function paint(out){lastState=out.state;document.querySelector('#app').contentWindow.postMessage({kind:'trialy.render',channel,appLinks:true,appOrigin:location.origin,...out},'*');proposal=out.proposal;document.querySelector('#approve').hidden=!proposal;}
 window.openApp=async()=>{const r=await api('read');current=r.component;paint(r.output);};
 document.querySelector('#approve').onclick=async()=>{await api('confirm_workspace_change',{previewId:proposal.id,digest:proposal.digest});await openApp();};
 window.addEventListener('message',async e=>{if(e.source!==document.querySelector('#app').contentWindow)return;try{if(e.data.kind==='trialy.ready')await openApp();if(e.data.kind==='trialy.event'){if(e.data.event.action==='tracker:layout'){mountSettings(current);return;}queue=queue.then(async()=>paint(await api('run',{state:lastState,event:e.data.event}))).catch(err=>{document.querySelector('#error').textContent=err.message;});await queue;}}catch(err){document.querySelector('#error').textContent=err.message;}});
 </script><script src="/bundle.js"></script></body></html>`);
 }catch(e){console.error('Fixture API failure:',(e as Error).message);res.statusCode=400;res.end(JSON.stringify({error:(e as Error).message}));}});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors:string[]=[];page.on('pageerror',e=>errors.push(e.stack||e.message));page.setDefaultTimeout(45000);await page.goto(`http://127.0.0.1:${(server.address() as any).port}`);const fr=page.frameLocator('#app');await fr.locator('h1').waitFor();
 for(const width of [320,390,768,1100,1440]){await page.setViewportSize({width,height:1100});for(const tab of ['overview','topics','feed','queue','synthesis','monitor']){await fr.locator('[data-action="nav:'+tab+'"]').click();await fr.locator('[data-action="nav:'+tab+'"].active').waitFor();assert.equal(await page.frames()[1].evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Overflow '+width+' '+tab);}await page.screenshot({path:'/tmp/literature-'+width+'.png',fullPage:true});}
 await fr.locator('[data-action="nav:topics"]').click();await fr.locator('[data-action="new:topics"]').first().click();const form=fr.locator('form[data-action="save"]');assert.equal(await form.locator('input:disabled,textarea:disabled,select:disabled').count(),0);
 await form.getByRole('button',{name:'Propose for review',exact:true}).click();await fr.locator('.lr-editor [role="status"]').filter({hasText:'required'}).waitFor();
 for(const [name,value]of [['name','Browser topic'],['question','Synthetic research question'],['keywords','biomarker'],['startYear','2020'],['lastChecked','2026-10-31']]){await form.locator('[name="'+name+'"]').fill(value);await form.locator('[name="'+name+'"]').press('Tab');await page.waitForFunction(()=>!document.querySelector('#error')?.textContent);}
 await form.locator('[name="active"]').selectOption('false');await form.locator('[name="active"] option[selected][value="false"]').waitFor({state:'attached'});await form.getByRole('button',{name:'Propose for review',exact:true}).click();await page.locator('#approve').waitFor({state:'visible'});await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden'});
 const records=await x.s.records(x.actor,x.w.id,x.map.topics.typeId,{limit:100,offset:0});const saved=records.rows.find((r:any)=>r.data.name==='Browser topic');assert.ok(saved);assert.equal(saved.data.start_year,2020);assert.equal(saved.data.last_checked,'2026-10-31');assert.equal(saved.data.active,false);
 await fr.locator('[data-action="tracker:layout"]').click();await page.getByRole('button',{name:'Move Research topics',exact:true}).waitFor();await page.getByRole('button',{name:'Move Research topics',exact:true}).dragTo(page.getByRole('button',{name:'Move Research overview',exact:true}));await page.getByRole('button',{name:'Fields',exact:true}).click();await page.getByRole('button',{name:'Move Owner',exact:true}).first().click();await page.getByRole('button',{name:'Move Topic',exact:true}).click();await page.getByRole('button',{name:'Review layout',exact:true}).click();await page.getByRole('button',{name:'Confirm layout',exact:true}).click();await fr.locator('nav button').first().filter({hasText:'Research topics'}).waitFor();await page.reload();await fr.locator('h1').waitFor();assert.equal(await fr.locator('nav button').first().getAttribute('data-action'),'nav:topics');assert.equal(await fr.locator('table th').first().textContent(),'Owner');assert.deepEqual(errors,[]);assert.equal(await page.locator('#error').textContent(),'');console.log('PASS connected browser: six screens, five widths, form review, native layout reload');
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await x.pg.close();}
