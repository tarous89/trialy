import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {croFixture} from '../tests/fixtures/cro.js';
import {frontendFrameDocument} from '../src/shared/frontend-frame.js';
import {prepareToolLayout} from '../src/workspace/tool-layout.js';
const x=await croFixture();let component=x.component;
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
 let current,proposal;const channel='cro-test';window.api=async(name,args={})=>{const r=await fetch('/api',{method:'POST',body:JSON.stringify({name,args})});const data=await r.json();if(!r.ok)throw Error(data.error);return data;};
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
 await frame.getByRole('heading',{name:'CRO Oversight',exact:true}).waitFor();
 assert.equal(await frame.locator('#scope').isEnabled(),true);await frame.locator('#scope').selectOption(x.projectId);await frame.locator('#scope option[value="'+x.projectId+'"][selected]').waitFor({state:'attached'});
 for(const section of ['work','scorecard','issues','meetings','reports','overview']){await frame.locator('.co-nav [data-action="go:'+section+'"]').click();await frame.locator('.co-nav [data-action="go:'+section+'"][aria-current="page"]').waitFor();assert.equal(await frame.locator('h1').count(),1);}
 await frame.locator('.co-nav [data-action="go:work"]').click();await frame.getByRole('button',{name:'Filters',exact:true}).click();assert.equal(await frame.locator('[data-action="filter"]').isEnabled(),true);
 const filterValue=await frame.locator('[data-action="filter"] option').nth(1).getAttribute('value');await frame.locator('[data-action="filter"]').selectOption(filterValue!);await frame.locator('[data-action="filter"] option[value="'+filterValue+'"][selected]').waitFor({state:'attached'});await frame.locator('[data-action="filter"]').selectOption('all');await frame.locator('[data-action="filter"] option[value="all"][selected]').waitFor({state:'attached'});
 await frame.locator('[data-action="create:tasks"]').click();const form=frame.locator('form[data-action="record-save"]');
 assert.equal(await form.locator('input:disabled,select:disabled,textarea:disabled').count(),0);
 await form.locator('[name="name"]').fill('Browser deliverable');await form.locator('[name="name"][value="Browser deliverable"]').waitFor();
 await form.locator('[name="status"]').selectOption('Planned');await form.locator('[name="status"] option[value="Planned"][selected]').waitFor({state:'attached'});
 await form.locator('[name="due"]').fill('2026-12-01');await form.locator('[name="due"][value="2026-12-01"]').waitFor();
 await form.locator('[name="notes"]').fill('Keep this draft');await form.locator('[name="notes"]').filter({hasText:'Keep this draft'}).waitFor();
 assert.equal(await form.locator('[name="name"]').inputValue(),'Browser deliverable');
 await form.getByRole('button',{name:'Prepare reviewed save'}).click();await page.locator('#approve').waitFor({state:'visible'});
 assert.equal((await x.s.records(x.actor,x.w.id,x.map.tasks.typeId,{limit:100,offset:0})).rows.length,1);
 await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden'});const records=(await x.s.records(x.actor,x.w.id,x.map.tasks.typeId,{limit:100,offset:0})).rows;assert.equal(records.length,2);assert.equal(records.find((r:any)=>r.data.name==='Browser deliverable')?.data.notes,'Keep this draft');
 await frame.locator('.co-nav [data-action="go:work"]').click();const search=frame.getByRole('textbox',{name:'Search records'});await search.fill('Browser');await frame.locator('[data-action="search"][value="Browser"]').waitFor();assert.equal(await frame.locator('.co-table tbody tr').count(),1);
 await frame.getByRole('button',{name:'Actions for Browser deliverable',exact:true}).click();await frame.locator('.co-menu').getByRole('button',{name:'Edit',exact:true}).click();await form.locator('[name="name"][value="Browser deliverable"]').waitFor();await form.getByRole('button',{name:'Cancel',exact:true}).click();await form.waitFor({state:'detached'});
 console.log('PASS: six screens, draft controls and reviewed DB save.');await page.screenshot({path:'/tmp/cro-desktop.png',fullPage:true});
 await frame.getByRole('button',{name:'Layout settings'}).click();await page.getByRole('button',{name:'Move Overview'}).waitFor();await page.getByRole('button',{name:'Move Reports',exact:true}).dragTo(page.getByRole('button',{name:'Move Overview'}));
 await page.getByRole('button',{name:'Fields',exact:true}).click();await page.getByRole('button',{name:'Move CRO',exact:true}).click();await page.getByRole('button',{name:'Move Engagement',exact:true}).click();
 await page.getByRole('button',{name:'Review layout',exact:true}).click();await page.getByRole('button',{name:'Confirm layout',exact:true}).click();await frame.locator('.co-nav button').first().filter({hasText:'Reports'}).waitFor();
 console.log('PASS: native layout review and save.');await page.reload();await frame.getByRole('heading',{name:'CRO Oversight',exact:true}).waitFor();assert.equal(await frame.locator('.co-nav button').first().getAttribute('data-action'),'go:reports');await frame.locator('.co-nav [data-action="go:overview"]').click();await frame.locator('.co-nav [data-action="go:overview"][aria-current="page"]').waitFor();assert.equal(await frame.locator('.co-table th').first().textContent(),'CRO name');
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:1100});assert.equal(await page.frames()[1].evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'No page overflow at '+width);}
 await page.setViewportSize({width:390,height:844});const navBoxes=await frame.locator('.co-nav button').evaluateAll(els=>els.map(el=>({x:el.getBoundingClientRect().x,right:el.getBoundingClientRect().right})));assert.equal(navBoxes.length,6);assert.ok(navBoxes.every(b=>b.x>=0&&b.right<=390),'All six compact navigation controls fit');await page.screenshot({path:'/tmp/cro-mobile.png',fullPage:true});await frame.getByRole('button',{name:'Layout settings'}).click();await page.getByRole('button',{name:'Move Reports',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Move Work packages'}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Ignore changes',exact:true}).click();await frame.getByRole('heading',{name:'CRO Oversight',exact:true}).waitFor();assert.equal(await frame.locator('.co-nav button').first().getAttribute('data-action'),'go:reports');
 assert.deepEqual(errors,[]);assert.equal(await page.locator('#error').textContent(),'');console.log('PASS: CRO production frame, draft persistence, engagement/filter/search controls, reviewed DB save, six screens, native layout save/reload, mobile keyboard/Ignore and responsive widths.');
}finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));await x.pg.close();}
