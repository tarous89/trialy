import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {feasibilityFixture} from '../tests/fixtures/feasibility.js';
import {frontendFrameDocument} from '../src/shared/frontend-frame.js';
import {prepareToolLayout} from '../src/workspace/tool-layout.js';
const x=await feasibilityFixture();let component=x.component;
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
 let current,proposal,lastState,queue=Promise.resolve();const channel='feasibility-test';window.api=async(name,args={})=>{const r=await fetch('/api',{method:'POST',body:JSON.stringify({name,args})});const data=await r.json();if(!r.ok)throw Error(data.error);return data;};
 function paint(out){lastState=out.state;document.querySelector('#app').contentWindow.postMessage({kind:'trialy.render',channel,appLinks:true,appOrigin:location.origin,...out},'*');proposal=out.proposal;document.querySelector('#approve').hidden=!proposal;}
 window.openApp=async()=>{const r=await api('read');current=r.component;paint(r.output);};
 document.querySelector('#approve').onclick=async()=>{await api('confirm_workspace_change',{previewId:proposal.id,digest:proposal.digest});await openApp();};
 window.addEventListener('message',async e=>{if(e.source!==document.querySelector('#app').contentWindow)return;try{if(e.data.kind==='trialy.ready')await openApp();if(e.data.kind==='trialy.event'){if(e.data.event.action==='tracker:layout'){mountSettings(current);return;}queue=queue.then(async()=>paint(await api('run',{state:lastState,event:e.data.event}))).catch(err=>{document.querySelector('#error').textContent=err.message;});await queue;}}catch(err){document.querySelector('#error').textContent=err.message;}});
 </script><script src="/bundle.js"></script></body></html>`);
 }catch(e){console.error('Fixture API failure:',(e as Error).message);res.statusCode=400;res.end(JSON.stringify({error:(e as Error).message}));}});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${(server.address() as any).port}`);const frame=page.frameLocator('#app');
 await frame.locator('h1').waitFor();
 for(const tab of ['requirements','sites','questionnaire','matrix','handoff','portfolio']){await frame.locator('nav [data-action="nav:'+tab+'"]').click();await frame.locator('nav [data-action="nav:'+tab+'"][aria-current="page"]').waitFor();assert.equal(await frame.locator('h1').count(),1);}
 const study=frame.locator('[data-action="set-study"]');assert.equal(await study.isEnabled(),true);await study.selectOption(x.ids['p-102']);await study.locator('option[value="'+x.ids['p-102']+'"][selected]').waitFor({state:'attached'});await study.selectOption(x.ids['p-101']);await study.locator('option[value="'+x.ids['p-101']+'"][selected]').waitFor({state:'attached'});
 await frame.locator('nav [data-action="nav:questionnaire"]').click();const candidate=frame.locator('[data-action="set-candidate"]');assert.equal(await candidate.isEnabled(),true);await candidate.selectOption(x.ids['k-103']);await candidate.locator('option[value="'+x.ids['k-103']+'"][selected]').waitFor({state:'attached'});
 await frame.locator('nav [data-action="nav:sites"]').click();const institution=frame.locator('[data-action="set-site"]');assert.equal(await institution.isEnabled(),true);await institution.selectOption(x.ids['s-munich']);await institution.locator('option[value="'+x.ids['s-munich']+'"][selected]').waitFor({state:'attached'});
 await frame.locator('[data-action="more-filters"]').click();const filter=frame.locator('[data-action="filter"]');assert.equal(await filter.isEnabled(),true);await filter.selectOption('Verified');await filter.locator('option[value="Verified"][selected]').waitFor({state:'attached'});
 await frame.locator('[data-action="new:sites"]').click();const form=frame.locator('form[data-action="save"]');assert.equal(await form.locator('input:disabled,select:disabled,textarea:disabled').count(),0);
 for(const [name,value]of [['name','Browser institution'],['country','Germany']]){await form.locator('[name="'+name+'"]').fill(value);await form.locator('[name="'+name+'"][value="'+value+'"]').waitFor();}
 await form.locator('[name="status"]').selectOption('Draft');await form.locator('[name="status"] option[value="Draft"][selected]').waitFor({state:'attached'});
 const before=(await x.s.records(x.actor,x.w.id,x.map.sites.typeId,{limit:100,offset:0})).rows.length;
 await form.getByRole('button',{name:'Prepare reviewed save',exact:true}).click();await page.locator('#approve').waitFor({state:'visible'});assert.equal((await x.s.records(x.actor,x.w.id,x.map.sites.typeId,{limit:100,offset:0})).rows.length,before);await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden'});
 const records=(await x.s.records(x.actor,x.w.id,x.map.sites.typeId,{limit:100,offset:0})).rows;assert.equal(records.length,before+1);const added=records.find((r:any)=>r.data.name==='Browser institution')!;
 await frame.locator('nav [data-action="nav:matrix"]').click();await frame.locator('[data-action="new:candidates"]').click();
 await form.locator('[name="name"]').fill('Browser candidate');await form.locator('[name="name"][value="Browser candidate"]').waitFor();await form.locator('[name="siteId"]').selectOption(added.id);await form.locator('[name="siteId"] option[value="'+added.id+'"][selected]').waitFor({state:'attached'});await form.locator('[name="stage"]').selectOption('Identified');await form.locator('[name="stage"] option[value="Identified"][selected]').waitFor({state:'attached'});
 await form.getByRole('button',{name:'Prepare reviewed save',exact:true}).click();await page.locator('#approve').waitFor({state:'visible'});await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden'});
 assert.ok((await x.s.records(x.actor,x.w.id,x.map.candidates.typeId,{limit:100,offset:0})).rows.some((r:any)=>r.data.site_id===added.id));console.log('PASS: all selectors, filters, retained drafts, reviewed institution and candidate creation');
 await frame.getByRole('button',{name:'Layout settings',exact:true}).click();await page.getByRole('button',{name:'Move Feasibility portfolio',exact:true}).waitFor();await page.getByRole('button',{name:'Move Selection & handoff',exact:true}).dragTo(page.getByRole('button',{name:'Move Feasibility portfolio',exact:true}));
 await page.getByRole('button',{name:'Fields',exact:true}).click();await page.getByRole('button',{name:'Move Sponsor',exact:true}).click();await page.getByRole('button',{name:'Move Study',exact:true}).click();
 await page.getByRole('button',{name:'Review layout',exact:true}).click();await page.getByRole('button',{name:'Confirm layout',exact:true}).click();await frame.locator('nav button').first().filter({hasText:'Selection & handoff'}).waitFor();
 await page.reload();await frame.locator('h1').waitFor();assert.equal(await frame.locator('nav button').first().getAttribute('data-action'),'nav:handoff');await frame.locator('nav [data-action="nav:portfolio"]').click();await frame.locator('nav [aria-current="page"][data-action="nav:portfolio"]').waitFor();assert.equal(await frame.locator('.sf-table th').first().textContent(),'Sponsor');
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:1100});for(const tab of ['portfolio','requirements','sites','questionnaire','matrix','handoff']){await frame.locator('nav [data-action="nav:'+tab+'"]').click();await frame.locator('nav [data-action="nav:'+tab+'"][aria-current="page"]').waitFor();assert.equal(await page.frames()[1].evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'No overflow '+width+' '+tab);}await page.screenshot({path:'/tmp/feasibility-'+width+'.png',fullPage:true});}
 await page.setViewportSize({width:390,height:844});await frame.getByRole('button',{name:'Layout settings',exact:true}).click();await page.getByRole('button',{name:'Move Selection & handoff',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Move Site profiles',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Ignore changes',exact:true}).click();await frame.locator('h1').waitFor();assert.equal(await frame.locator('nav button').first().getAttribute('data-action'),'nav:handoff');
 assert.deepEqual(errors,[]);assert.equal(await page.locator('#error').textContent(),'');console.log('PASS: six screens at 390/768/1440, native layout drag/field save/reload and mobile Ignore');

}finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));await x.pg.close();}
