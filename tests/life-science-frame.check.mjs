/** Actual shipped sandbox-frame contract. Synthetic data only; never a live host claim. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {chromium} from 'playwright';
import {frontendFrameDocument} from '../src/shared/frontend-frame.ts';
import {apps,buildSchemas,exampleRows} from '../templates/life-science/definitions.mjs';
const output=process.env.TEMPLATE_QA_OUTPUT||'/tmp/life-science-frame-qa';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox']});
const frameDoc=await frontendFrameDocument();const results=[];let screens=0;const errors=[];
try{
for(const app of apps.slice(Number(process.env.QA_START||0),Number(process.env.QA_END||apps.length))){
 const template=JSON.parse(await readFile('templates/apps/life.'+app.slug+'-1.0.0.json','utf8'));
 const schemas=buildSchemas(app),records=exampleRows(app,schemas),map={},bindings=[];
 for(const [role,schema]of Object.entries(schemas)){
  const typeId=randomUUID(),fields=Object.fromEntries(schema.fields.map(f=>[f.key,f.key]));map[role]={typeId,fields,writableFields:Object.keys(fields)};bindings.push({typeId,fields:Object.keys(fields)});
  const original=records[role];records[role]=Array.from({length:31},(_,i)=>({...structuredClone(original[i%original.length]),id:randomUUID(),data:{...original[i%original.length].data,name:original[i%original.length].data.name+' '+i}}));
 }
 const run=new Function('templateConfiguration','templateBindings','input','tools',template.source);
 const config={...template.defaults,tableMap:JSON.stringify(map)},calls=[],proposals=[];
 const tools={call(name,v){calls.push({name,v});if(name==='records.read'){const role=Object.keys(map).find(k=>map[k].typeId===v.typeId);assert.ok(role);const all=records[role].filter(r=>Object.entries(v.filters||{}).every(([k,x])=>r.data[k]===x));return{rows:all.slice(v.offset,v.offset+v.limit),total:all.length,limit:v.limit,offset:v.offset};}if(name==='records.get'){for(const [role,rows]of Object.entries(records)){const record=rows.find(r=>r.id===v.recordId);if(record)return {...record,typeId:map[role].typeId};}throw Error('Record unavailable');}if(name==='records.propose'){proposals.push(...v);return{status:'proposed'};}throw Error(name);}};
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push({app:app.slug,error:e.message}));
 let delay=0,failNext=false;
 const render=(event={kind:'open'},state={})=>run(config,bindings,{saved:true,writable:true,event,state},tools);
 await page.exposeFunction('renderEvent',async(event,state)=>{if(delay)await new Promise(r=>setTimeout(r,delay));if(failNext){failNext=false;throw Error('Synthetic transient failure');}return render(event,state);});
 await page.setContent('<!doctype html><html><head><style>html,body{margin:0;height:100%;}iframe{width:100%;height:100%;border:0;display:block}</style></head><body><script>window.__paints=0;window.__events=[];window.__errors=[];window.__send=(out)=>{window.__output=out;document.querySelector("iframe").contentWindow.postMessage({kind:"trialy.render",channel:"synthetic-template-qa",...out,connected:true,appLinks:true,appOrigin:"https://platform.trialagents.com"},"*")};window.addEventListener("message",async e=>{if(e.source!==document.querySelector("iframe").contentWindow)return;const d=e.data;if(d.kind==="trialy.ready")__send(window.__initial);else if(d.kind==="trialy.rendered")__paints++;else if(d.kind==="trialy.event"){__events.push(d);try{__send(await window.renderEvent(d.event,d.state))}catch(err){__errors.push(String(err))}}});</script><iframe sandbox="allow-scripts" title="Actual trusted frame"></iframe></body></html>');
 await page.evaluate(({doc,initial})=>{window.__initial=initial;document.querySelector('iframe').srcdoc=doc;},{doc:frameDoc,initial:render()});
 await page.waitForFunction('window.__paints>0');const loc=page.frameLocator('iframe');
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:1000});
  for(let i=0;i<app.screens.length;i++){
   const before=await page.evaluate('window.__paints');await loc.locator('[role="tab"][data-action="nav:'+i+'"]').click();await page.waitForFunction(n=>window.__paints>n,before);
   const info=await loc.locator('html').evaluate(el=>{const b=document.querySelector('.tracker-toolbar'),s=b?.querySelector('.search'),a=b?.querySelector(':scope>.primary');return{overflow:el.scrollWidth>innerWidth+1,toolbar:s&&a?Math.abs(s.getBoundingClientRect().y-a.getBoundingClientRect().y)<8:true,heading:document.querySelector('#ls-screen h2')?.textContent};});
   assert.equal(info.overflow,false,app.slug+' '+width+' '+i+' viewport');assert.equal(info.toolbar,true,app.slug+' toolbar');screens++;
  }
 }
 const table=app.screens.findIndex(s=>s.kind==='table');let before=await page.evaluate('window.__paints');await loc.locator('[role="tab"][data-action="nav:'+table+'"]').click();await page.waitForFunction(n=>window.__paints>n,before);
 const count=calls.length,disclosure=loc.getByRole('button',{name:/Filters/});if(await disclosure.isVisible()){await disclosure.click();await page.waitForTimeout(20);assert.equal(calls.length,count);await disclosure.press('Escape');}
 failNext=true;const text=await loc.locator('#ls-screen').textContent();await loc.locator('[data-action="sort"]').selectOption('-name',{force:true});await page.waitForFunction('window.__errors.length===1');assert.equal(await loc.locator('#ls-screen').textContent(),text);
 before=await page.evaluate('window.__paints');await loc.locator('[data-action="add"]').click();await page.waitForFunction(n=>window.__paints>n,before);
 const name=loc.locator('.ls-record-form [name="name"]');before=await page.evaluate('window.__paints');await name.fill('Synthetic bridge record');await page.waitForFunction(n=>window.__paints>n,before);
 assert.equal(await name.inputValue(),'Synthetic bridge record');assert.equal(await name.evaluate(el=>document.activeElement===el),true,app.slug+' input focus must survive trusted frame repaint');assert.equal(proposals.length,0,'Input must never submit');
 before=await page.evaluate('window.__paints');await loc.getByRole('button',{name:'Review changes',exact:true}).click();await page.waitForFunction(n=>window.__paints>n,before);assert.equal(proposals.length,1);assert.equal(proposals[0].data.name,'Synthetic bridge record');
 before=await page.evaluate('window.__paints');await loc.getByRole('button',{name:'Cancel',exact:true}).click();await page.waitForFunction(n=>window.__paints>n,before);assert.equal(await loc.getByRole('dialog',{name:'Record details'}).count(),0);
 if(['investor-crm','cash-runway','experiment-notebook'].includes(app.slug)){before=await page.evaluate('window.__paints');await loc.locator('[role="tab"][data-action="nav:0"]').click();await page.waitForFunction(n=>window.__paints>n,before);await page.screenshot({path:output+'/'+app.slug+'-390.png'});}
 results.push({app:app.slug,screens:app.screens.length,passed:true,calls:calls.length});console.log(app.slug+' bridge passed');await page.close();
}
assert.equal(errors.length,0);console.log(JSON.stringify({screens,apps:results.length,errors}));
}finally{await writeFile(output+'/result.json',JSON.stringify({screens,results,errors},null,2));await browser.close();}
