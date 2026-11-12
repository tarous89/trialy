import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {contractsFixture,pdf} from '../tests/fixtures/contracts.js';
import {frontendFrameDocument} from '../src/shared/frontend-frame.js';
import {prepareToolLayout} from '../src/workspace/tool-layout.js';
/* Contracts 1.0.0 in the production sanitized frame with a manifest attached: seven screens at 1440 and 390, reviewed pipeline move and
 * signature, the data-trialy-document upload hook (the harness plays the host's upload review), human verification, native layout. */
const x=await contractsFixture();let component=x.component;
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {CustomToolLayout} from './src/shared/CustomToolLayout';
let root;window.mountSettings=(component)=>{document.querySelector('#app').hidden=true;root=createRoot(document.querySelector('#settings'));root.render(<CustomToolLayout component={component} call={window.api} onBack={()=>{root.unmount();document.querySelector('#app').hidden=false;}} onAccess={()=>{}} onSaved={c=>{root.unmount();document.querySelector('#app').hidden=false;window.openApp();}}/>);};`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}});
const frame=await frontendFrameDocument();
const uploads:string[]=[];
const server=createServer(async(req,res)=>{try{
 if(req.url==='/frame'){res.setHeader('Content-Type','text/html');res.end(frame);return;}
 if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);return;}
 if(req.url==='/api'){
  let body='';for await(const chunk of req)body+=chunk;const {name,args}=JSON.parse(body);let result:any;
  if(name==='read')result={component,output:await x.f.runFrontend(x.actor,x.w.id,{componentId:component.id,expectedVersion:component.version,event:{kind:'open'}})};
  else if(name==='run')result=await x.f.runFrontend(x.actor,x.w.id,{componentId:component.id,expectedVersion:component.version,...args});
  // The host's upload review (DocumentUploadDialog: preview_document_upload, then commit_change), played by the harness.
  else if(name==='upload'){uploads.push(args.context);const p=await x.s.previewFile(x.actor,x.w.id,{filename:'Meridian CDA (signed, fictional).pdf',mime:'application/pdf',bytes:pdf([['CDA (FICTIONAL)','Signed on 10 November 2026.']]),ai:true});result=(await x.s.commit(x.actor,p.id,p.digest)).objects[0];}
  else if(name==='prepare_tool_layout')result=await prepareToolLayout(x.f,x.actor,x.w.id,args);
  else if(name==='confirm_workspace_change')result=await x.f.confirm(x.actor,x.w.id,args.previewId,args.digest);
  else if(name==='discard_workspace_preview')result=await x.f.discard(x.actor,x.w.id,args.previewId);
  else if(name==='read_project_component'){result=await x.f.readComponent(x.actor,x.w.id,args.componentId,args.includeOutput);component=result.component;}
  else throw Error('Unknown test request');res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return;
 }
 res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><body><div id="error"></div><button id="approve" hidden>Confirm record changes</button><div id="settings"></div><iframe id="app" src="/frame" style="width:100%;height:950px;border:0"></iframe><script>
 let current,proposal;const channel='contracts-test';window.api=async(name,args={})=>{const r=await fetch('/api',{method:'POST',body:JSON.stringify({name,args})});const data=await r.json();if(!r.ok)throw Error(data.error);return data;};
 function paint(out){document.querySelector('#app').contentWindow.postMessage({kind:'trialy.render',channel,appLinks:true,appOrigin:location.origin,...out},'*');proposal=out.proposal;document.querySelector('#approve').hidden=!proposal;window.lastState=out.state;}
 window.openApp=async()=>{const r=await api('read');current=r.component;paint(r.output);};
 document.querySelector('#approve').onclick=async()=>{await api('confirm_workspace_change',{previewId:proposal.id,digest:proposal.digest});paint(await api('run',{state:window.lastState,event:{kind:'open'}}));};
 window.addEventListener('message',async e=>{if(e.source!==document.querySelector('#app').contentWindow)return;try{
  if(e.data.kind==='trialy.ready')await openApp();
  if(e.data.kind==='trialy.document'&&e.data.channel===channel){const saved=await api('upload',{context:e.data.context});paint(await api('run',{state:window.lastState,event:{kind:'change',action:'document:uploaded:'+e.data.context,value:saved.versionId,form:{}}}));}
  if(e.data.kind==='trialy.event'){if(e.data.event.action==='tracker:layout'){mountSettings(current);return;}paint(await api('run',{state:e.data.state,event:e.data.event}));}
 }catch(err){document.querySelector('#error').textContent=err.message;}});
 </script><script src="/bundle.js"></script></body></html>`);
 }catch(e){console.error('Fixture API failure:',(e as Error).message);res.statusCode=400;res.end(JSON.stringify({error:(e as Error).message}));}});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const rows=async(role:string)=>(await x.s.records(x.actor,x.w.id,x.map[role].typeId,{limit:100,offset:0})).rows;
const overflow=(frame:any)=>frame.locator('html').evaluate((e:any)=>e.scrollWidth-e.clientWidth);
async function go(page:any,frame:any,section:string){for(let i=0;i<4;i++){await frame.locator('.ct-nav [data-action="nav:'+section+'"]').click();try{await frame.locator('.ct-nav [data-action="nav:'+section+'"][aria-current="page"]').waitFor({timeout:4000});await page.evaluate(()=>{document.querySelector('#error')!.textContent='';});return;}catch(e){if(!/busy/.test(await page.locator('#error').textContent()||''))throw e;await page.evaluate(()=>{document.querySelector('#error')!.textContent='';});await page.waitForTimeout(400);}}throw Error('Navigation to '+section+' stayed busy');}
const shots=process.env.CONTRACTS_SCREENSHOTS||'/tmp';
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${(server.address() as any).port}`);const frame=page.frameLocator('#app');
 await frame.getByRole('heading',{name:'Contracts',exact:true}).waitFor();await frame.getByText(/Cancel Data processing agreement — Brightwater Data Services by 1 Dec 2026 or it renews for 12 months/).waitFor();
 for(const section of ['register','families','obligations','cdas','pipeline','settings','overview']){await go(page,frame,section);assert.equal(await frame.locator('.ct-banner.bad').count(),0,section);await page.screenshot({path:shots+'/contracts-'+section+'-1440.png',fullPage:true});}
 // Families: master and children per currency.
 await go(page,frame,'families');await frame.getByText('EUR 2,200,000').first().waitFor();
 // The sanitizer keeps no open attribute: families start collapsed with the total in the summary and expand on click.
 await frame.locator('.ct-family summary').filter({hasText:'Helix'}).click();await frame.getByText('EUR 150,000 · 6.8%').waitFor();
 // CDA check typed into the sanitized frame (manifest attached: inputs enabled).
 await go(page,frame,'cdas');const q=frame.locator('[name="cda_query"]');assert.equal(await q.isDisabled(),false);await q.fill('Northwind');await q.dispatchEvent('change');await frame.locator('[name="cda_query"][value="Northwind"]').waitFor({state:'attached'});
 await frame.getByText(/confidential until 1 Mar 2032/).first().waitFor();
 // Pipeline: a reviewed move; nothing is written before approval.
 await go(page,frame,'pipeline');
 await frame.getByRole('button',{name:/Move Clinical trial agreement .* to In negotiation/}).click();await frame.getByRole('button',{name:'Review move'}).click();
 await page.locator('#approve').waitFor({state:'visible'});
 const aldric=x.ids['ag-aldric'];assert.equal((await rows('agreements')).find((r:any)=>r.id===aldric).data.status,'drafting');
 await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden'});
 assert.equal((await rows('agreements')).find((r:any)=>r.id===aldric).data.status,'in_negotiation');
 // Mark signed: dates, then the prompt for the signed original; the upload hook reaches the host, which returns the version to attach.
 await frame.getByRole('button',{name:/Mark CDA — Meridian Pharma KK \(partnering 2026\) signed/}).click();
 const sign=frame.locator('form[data-action="sign-submit"]');await sign.locator('[name="signed_on"]').fill('2026-11-10');await sign.locator('[name="signed_on"]').dispatchEvent('change');await sign.locator('[name="signed_on"][value="2026-11-10"]').waitFor({state:'attached'});
 await sign.locator('[name="expiry_date"]').fill('2028-11-10');await sign.locator('[name="expiry_date"]').dispatchEvent('change');await sign.locator('[name="expiry_date"][value="2028-11-10"]').waitFor({state:'attached'});
 await sign.locator('[name="confidentiality_years"]').fill('5');await sign.locator('[name="confidentiality_years"]').dispatchEvent('change');await sign.locator('[name="confidentiality_years"][value="5"]').waitFor({state:'attached'});await frame.getByText('10 Nov 2033').waitFor();
 assert.equal(await sign.locator('input:disabled,select:disabled').count(),0);
 await sign.getByRole('button',{name:'Prepare reviewed signature'}).click();await page.locator('#approve').waitFor({state:'visible'});await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden'});
 const meridian=x.ids['ag-cda-meridian-2026'];const signedRow=(await rows('agreements')).find((r:any)=>r.id===meridian).data;assert.deepEqual([signedRow.status,signedRow.signed_on],['active','2026-11-10']);
 assert.equal((await rows('contracts.terms')).find((r:any)=>r.data.agreement_id===meridian).data.confidentiality_end,'2033-11-10');
 await frame.locator('[data-trialy-document="upload attach:'+meridian+'"]').first().click();
 await frame.getByRole('heading',{name:/Attach the signed original to CDA — Meridian/}).waitFor();assert.deepEqual(uploads,['attach:'+meridian]);
 await frame.getByText('Yes: your assistant can propose its terms').waitFor();
 await frame.getByRole('button',{name:'Review attachment'}).click();await page.locator('#approve').waitFor({state:'visible'});await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden'});
 const attached=(await rows('contracts.terms')).find((r:any)=>r.data.agreement_id===meridian).data;assert.ok(attached.document_version_id);assert.equal(attached.extraction_status,'none');
 // Human verification of assistant proposals: name required, one reviewed batch.
 await go(page,frame,'overview');await frame.getByRole('button',{name:/^Verify Supply agreement — Corvane/}).first().click();
 const rv=frame.locator('form[data-action="review-submit"]');await rv.locator('[name="verified_by"]').fill('Owner (fictional)');await rv.locator('[name="verified_by"]').dispatchEvent('change');await rv.locator('[name="verified_by"][value="Owner (fictional)"]').waitFor({state:'attached'});
 await rv.getByRole('button',{name:'Prepare reviewed verification'}).click();await page.locator('#approve').waitFor({state:'visible'});
 assert.equal((await rows('contracts.obligations')).filter((r:any)=>r.data.verified===false).length,3,'nothing verified before approval');
 await page.locator('#approve').click();await page.locator('#approve').waitFor({state:'hidden'});
 assert.equal((await rows('contracts.obligations')).filter((r:any)=>r.data.verified===false).length,0);
 assert.equal((await rows('contracts.terms')).find((r:any)=>r.data.agreement_id===x.ids['ag-corvane']).data.verified_by,'Owner (fictional)');
 // Native layout gear: drag a screen, review, confirm, reload.
 await frame.getByRole('button',{name:'App layout settings'}).click();await page.getByRole('button',{name:'Move Overview'}).waitFor();
 await page.getByRole('button',{name:'Move CDAs'}).dragTo(page.getByRole('button',{name:'Move Overview'}));
 await page.getByRole('button',{name:'Review layout',exact:true}).click();await page.getByRole('button',{name:'Confirm layout',exact:true}).click();
 await frame.locator('.ct-nav button').first().filter({hasText:'CDAs'}).waitFor();await page.waitForTimeout(500);
 await page.reload();await frame.getByRole('heading',{name:'Contracts',exact:true}).waitFor({timeout:10000});
 assert.equal(await frame.locator('.ct-nav button').first().getAttribute('data-action'),'nav:cdas');
 // Mobile 390: one page scroll on every screen; the family tree collapses.
 await page.setViewportSize({width:390,height:844});
 for(const section of ['overview','register','families','obligations','cdas','pipeline','settings']){await go(page,frame,section);assert.equal(await overflow(frame),0,'390 overflow on '+section);await page.screenshot({path:shots+'/contracts-'+section+'-390.png',fullPage:true});}
 await go(page,frame,'families');const fam=frame.locator('.ct-family details').first();assert.equal(await fam.evaluate((d:any)=>d.open),false);await frame.locator('.ct-family summary').first().click();assert.equal(await fam.evaluate((d:any)=>d.open),true,'family tree expands on mobile');assert.equal(await overflow(frame),0,'expanded tree fits 390');await frame.locator('.ct-family summary').first().click();assert.equal(await fam.evaluate((d:any)=>d.open),false,'and collapses');
 assert.deepEqual(errors,[]);assert.equal(await page.locator('#error').textContent(),'');
 console.log('PASS: production sanitized frame with manifest, seven screens at 1440 and 390 with no page overflow, family values, CDA check, reviewed pipeline move and signature (confidentiality end stored), upload hook to the host and reviewed attachment, human verification batch, native layout drag/save/reload, collapsible family tree on mobile.');
}finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));await x.pg.close();}
