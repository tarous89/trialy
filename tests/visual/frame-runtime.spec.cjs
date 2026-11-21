// 5.1, 5.2, 5.8: the app frame runs switched-on catalog apps itself. Hard gate, for every switched-on app at the browser,
// assistant-panel and phone widths: changing screens makes no server request and gives the same screen the server
// renders. For the v2 example: filtering makes no request, an edit makes exactly one and shows at once, and a failed
// save brings the earlier value back. Soft gate: screen changes are timed against 0.1 s, 1 s and 2.5 s; only 2.5 s fails.
// The frame is the real one served by the platform (/frontend/frame); a page on another origin stands in for the host.
const {test,expect}=require('@playwright/test');
const {execFileSync}=require('node:child_process');
const data=JSON.parse(execFileSync(process.execPath,['--import','tsx','scripts/frame-gate-data.ts'],{maxBuffer:256*1024*1024}).toString());
const base='http://127.0.0.1:4179';
const WIDTHS=[{name:'browser',width:1440,height:900},{name:'assistant panel',width:400,height:820},{name:'phone',width:390,height:844}];
const hostPage=`<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0"><iframe id="f" sandbox="allow-scripts" title="App" style="width:100vw;height:100vh;border:0;display:block" src="${base}/frontend/frame"></iframe><script>
 const canon=v=>Array.isArray(v)?v.map(canon):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v;
 const key=(n,i)=>n+'|'+JSON.stringify(canon(i===undefined?{}:i));
 window.msgs=[];window.answers=new Map();window.requests={events:0,reads:0};
 // The host's side of read_app_data: every missing read is one request, answered from the platform's data.
 addEventListener('message',e=>{if(e.source!==f.contentWindow)return;const m=e.data;window.msgs.push(m);
  if(m.kind==='trialy.event')window.requests.events++;
  if(m.kind==='trialy.reads'){window.requests.reads++;f.contentWindow.postMessage({kind:'trialy.reads-result',channel:m.channel,id:m.id,results:m.reads.map(r=>{const a=window.answers.get(key(r.name,r.input));return a?a:{...r,error:'Capability unavailable'};})},'*');}
 });
 window.send=m=>f.contentWindow.postMessage(m,'*');
</script></body></html>`;

async function openApp(page,app,viewport){
 await page.setViewportSize({width:viewport.width,height:viewport.height});
 await page.setContent(hostPage);
 await page.waitForFunction(()=>window.msgs.some(m=>m.kind==='trialy.ready'));
 await page.evaluate(app=>{for(const a of app.answers)window.answers.set(a.name+'|'+JSON.stringify((function canon(v){return Array.isArray(v)?v.map(canon):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v;})(a.input===undefined?{}:a.input)),a);
  window.send({kind:'trialy.render',channel:'gate',fresh:true,html:app.open.html,css:app.open.css,state:app.open.state,controls:[],connected:false,fill:app.browser.version==='v2',browser:app.browser,verify:{state:null,event:{kind:'open',action:'',value:null,form:{}}}});},app);
 await page.waitForFunction(()=>window.msgs.some(m=>m.kind==='trialy.engine'&&m.status!=='warm'),null,{timeout:30000});
 const status=await page.evaluate(()=>window.msgs.find(m=>m.kind==='trialy.engine'&&m.status!=='warm'));
 expect(status.status,`${app.id}: the engine loads and the first screen matches the server`).toBe('loaded');
 // Background preparation of linked screens may ask for reads once; the frame says when it has settled.
 await page.waitForFunction(()=>window.msgs.some(m=>m.kind==='trialy.engine'&&m.status==='warm'),null,{timeout:30000});
 return page.frameLocator('#f');
}
async function act(page,frame,selector,how){
 const before=await page.evaluate(()=>({...window.requests,n:window.msgs.length}));
 await frame.locator(selector).first()[how.kind](...(how.args||[]));
 await page.waitForFunction(n=>window.msgs.slice(n).some(m=>m.kind==='trialy.local'||m.kind==='trialy.event'),before.n);
 const after=await page.evaluate(n=>({...window.requests,local:window.msgs.slice(n).filter(m=>m.kind==='trialy.local')}),before.n);
 return {events:after.events-before.events,reads:after.reads-before.reads,local:after.local};
}

for(const viewport of WIDTHS)for(const app of data.filter(a=>a.browser.version==='v1'))test(`${app.id} ${app.version} at ${viewport.name} width: screen changes make no request and match the server`,async({page})=>{
 const frame=await openApp(page,app,viewport),times=[];
 for(const screen of app.screens){
  const r=await act(page,frame,`[data-action="${screen.action}"]`,{kind:'dispatchEvent',args:['click']});
  expect(r.events,`${screen.action}: no server run`).toBe(0);expect(r.reads,`${screen.action}: no read request`).toBe(0);
  expect(r.local.length,`${screen.action}: made in the frame`).toBe(1);
  expect(r.local[0].html,`${screen.action}: the screen the server renders`).toBe(screen.html);
  times.push(r.local[0].ms);
  // No horizontal page scroll in the frame at any width (P9). v1 apps were not built for narrow widths: reported, not failed, until the rebuild (7.3).
  const overflow=await frame.locator('body').evaluate(b=>b.scrollWidth-b.clientWidth);
  if(overflow>1)test.info().annotations.push({type:'layout',description:`${screen.action}: ${overflow}px wider than the ${viewport.width}px frame`});
 }
 const worst=Math.max(...times);
 test.info().annotations.push({type:'speed',description:`screen changes (ms): ${times.map(t=>t.toFixed(1)).join(', ')}; under 0.1 s: ${times.filter(t=>t<100).length}/${times.length}; under 1 s: ${times.filter(t=>t<1000).length}/${times.length}`});
 expect(worst,'soft gate: no screen change takes 2.5 s').toBeLessThan(2500);
});

test('v2 example: filtering makes no request, an edit makes one and shows at once, a failed save comes back, the board moves by menu',async({page})=>{
 const app=data.find(a=>a.id==='v2-example'),frame=await openApp(page,app,WIDTHS[0]);
 let r=await act(page,frame,'select[data-action="filter:stage"]',{kind:'selectOption',args:['Won']});
 expect(r.events+r.reads,'filtering loaded data').toBe(0);expect(r.local[0].html).toContain('Cobalt');expect(r.local[0].html).not.toContain('Acme');
 r=await act(page,frame,'select[data-action="filter:stage"]',{kind:'selectOption',args:['']});
 // The value is typed; the save happens on change (when the field is left).
 await frame.locator('input[data-action="edit:d1:amount:1"]').first().fill('175');
 await frame.locator('input[data-action="edit:d1:amount:1"]').first().blur();
 await page.waitForFunction(()=>window.requests.events>=1);
 const sent=await page.evaluate(()=>window.msgs.filter(m=>m.kind==='trialy.event'));
 expect(sent.length,'an edit makes exactly one request').toBe(1);expect(sent[0].optimistic).toBe(true);expect(sent[0].event.action).toBe('edit:d1:amount:1');
 await expect(frame.locator('input[data-action="edit:d1:amount:1"]')).toHaveValue('175');
 // The server refuses the save: the earlier value and screen come back.
 await page.evaluate(()=>window.send({kind:'trialy.server-idle',channel:'gate',failed:true}));
 await expect(frame.locator('input[data-action="edit:d1:amount:1"]')).toHaveValue('100');
 r=await act(page,frame,'[data-action="nav:board"]',{kind:'dispatchEvent',args:['click']});
 expect(r.events+r.reads,'changing screens').toBe(0);
 r=await act(page,frame,'select[data-action="move-menu:d1"]',{kind:'selectOption',args:['Won']});
 expect(r.events,'a move is one request').toBe(1);
});
