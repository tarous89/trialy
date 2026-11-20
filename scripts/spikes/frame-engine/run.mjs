// Spike 1.9 (P4, D21): can the server's QuickJS engine run inside the sandboxed app frame, and how fast is it there?
// One command, from the repository root:   node scripts/spikes/frame-engine/run.mjs
// See README.md in this folder for options and for what is simulated.
import http from 'node:http';
import os from 'node:os';
import {fork} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {buildFrames,FRAME_POLICIES} from './build.mjs';
import {loadFixtures,createStore,inputFor,REPO,LONG_TABLE_ROWS} from './fixtures.mjs';

const {chromium}=createRequire(import.meta.url)('playwright');
// --high-priority: ask the scheduler to prefer this run (and the browser it starts) over other work on a shared machine.
if(process.argv.includes('--high-priority'))try{os.setPriority(-19);}catch{console.error('Could not raise the process priority; continuing at normal priority.');}
const flag=(name,fallback)=>{const hit=process.argv.find(a=>a.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):fallback;};
const quick=process.argv.includes('--quick');
const RENDERS=Number(flag('renders',quick?5:30)),COLD=Number(flag('cold',quick?2:7)),SCREEN_RENDERS=Number(flag('screen-renders',quick?3:7));
const RATES=flag('rates',quick?'1,4':'1,2,4,6').split(',').map(Number);
const ONLY=flag('only','sizes,matrix,limits,parity,cold,bench,screens').split(',');
const VIEWPORT={width:412,height:915}; // a phone-sized frame for every run, so layout work is comparable across CPU rates
const MIB=1024*1024;

const stats=values=>{const s=values.slice().sort((a,b)=>a-b),at=q=>s[Math.min(s.length-1,Math.max(0,Math.ceil(q*s.length)-1))];
 return {n:s.length,median:s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2,p95:at(0.95),min:s[0],max:s[s.length-1]};};
const round=v=>typeof v==='number'?Math.round(v*10)/10:v;
const log=(...a)=>console.error(new Date().toISOString().slice(11,19),...a);

// ---------- pages: the host (parent) page and the frame, on two different local origins ----------
const {template,engines}=await buildFrames();
const apps=await loadFixtures();
const attribute=text=>text.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
const STRICT=script=>`default-src 'none'; script-src 'self' 'unsafe-inline'${script}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src data:; connect-src 'none'`;
/** Parent (host) policies. `strict` stands for a host we do not control; it is NOT the real Claude or ChatGPT policy. */
const PARENT_POLICIES={
 none:{label:'no CSP',policy:()=>null},
 strict:{label:"restrictive, no 'wasm-unsafe-eval', no frame-src",policy:()=>STRICT('')},
 'strict+frame':{label:"restrictive, no 'wasm-unsafe-eval', frame-src allows the frame origin",policy:o=>STRICT('')+`; frame-src ${o}`},
 'strict+wasm':{label:"restrictive, with 'wasm-unsafe-eval'",policy:()=>STRICT(" 'wasm-unsafe-eval'")},
 'strict+eval':{label:"restrictive, with 'unsafe-eval'",policy:()=>STRICT(" 'unsafe-eval'")},
 'strict+wasm+worker':{label:"restrictive, with 'wasm-unsafe-eval' and worker-src blob:",policy:()=>STRICT(" 'wasm-unsafe-eval'")+'; worker-src blob:'},
};
const shell=body=>`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%;display:block}</style></head><body>${body}</body></html>`;
const srcdocFrame=(engine,frame)=>`<iframe name="app-frame" title="Saved frontend code" sandbox="allow-scripts" referrerpolicy="no-referrer" srcdoc="${attribute(engines[engine].document(frame))}"></iframe>`;
let frameOrigin='',hostOrigin='';
function respond(res,html,policy){const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Cross-Origin-Resource-Policy':'cross-origin'};if(policy)headers['Content-Security-Policy']=policy;res.writeHead(200,headers);res.end(html);}
const handler=(req,res)=>{
 const url=new URL(req.url,'http://local'),q=Object.fromEntries(url.searchParams);
 if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
 if(!engines[q.engine]||!FRAME_POLICIES[q.frame]||(q.parent&&!PARENT_POLICIES[q.parent])){res.writeHead(404);res.end();return;}
 // (a) the frame document served from its own origin with the product header: `sandbox allow-scripts; <policy>`.
 if(url.pathname==='/frame')return respond(res,engines[q.engine].document(q.frame),engines[q.engine].header(q.frame));
 const parent=PARENT_POLICIES[q.parent].policy(frameOrigin);
 // A stand-in for an assistant's widget document: it carries the host's policy and renders the frame with srcdoc.
 if(url.pathname==='/widget')return respond(res,shell(srcdocFrame(q.engine,q.frame)),parent);
 if(url.pathname==='/host'){
  if(q.shape==='served')return respond(res,shell(`<iframe name="app-frame" title="Saved frontend code" sandbox="allow-scripts" referrerpolicy="no-referrer" src="${frameOrigin}/frame?engine=${q.engine}&amp;frame=${encodeURIComponent(q.frame)}"></iframe>`),parent);
  if(q.shape==='srcdoc')return respond(res,shell(srcdocFrame(q.engine,q.frame)),parent);
  if(q.shape==='nested')return respond(res,shell(`<iframe name="widget" sandbox="allow-scripts allow-same-origin" src="${frameOrigin}/widget?engine=${q.engine}&amp;frame=${encodeURIComponent(q.frame)}&amp;parent=${encodeURIComponent(q.parent)}"></iframe>`),null);
 }
 res.writeHead(404);res.end();
};
const listen=()=>new Promise(resolve=>{const server=http.createServer(handler);server.listen(0,'127.0.0.1',()=>resolve(server));});
const hostServer=await listen(),frameServer=await listen();
hostOrigin=`http://127.0.0.1:${hostServer.address().port}`;frameOrigin=`http://127.0.0.1:${frameServer.address().port}`;

const executablePath=process.env.CHROMIUM_PATH||(existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined);
// Sandboxed frames stay in the page's renderer process, so the CPU rate set on the page also applies to the frame
// from its first instruction. Each run checks this with a calibration loop inside the frame.
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-features=IsolateSandboxedIframes']});

/** Opens one host page and returns the app frame once its engine start has settled. */
async function open({shape,engine='sync',frame='wasm',parent='none',rate=1}){
 const context=await browser.newContext({viewport:VIEWPORT}),page=await context.newPage(),consoleErrors=[];
 page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().replace(/'sha256-[^']+'/g,"'sha256-…'").slice(0,400));});
 const cdp=await context.newCDPSession(page);if(rate!==1)await cdp.send('Emulation.setCPUThrottlingRate',{rate});
 await page.goto(`${hostOrigin}/host?shape=${shape}&engine=${engine}&frame=${encodeURIComponent(frame)}&parent=${encodeURIComponent(parent)}`,{waitUntil:'load'});
 let target=null,boot=null;const started=Date.now(),patience=4000*Math.max(1,rate);
 while(Date.now()-started<patience*4){
  target=page.frames().find(f=>f.name()==='app-frame')??null;
  if(target){
   const state=await target.evaluate(()=>typeof window.__spike==='object'?'ready':document.readyState).catch(()=>'gone');
   if(state==='ready'){boot=await target.evaluate(()=>window.__spike.boot);break;}
   // The frame finished loading (or was refused) and the frame script never ran.
   if(state!=='loading'&&Date.now()-started>patience)break;
  }
  await new Promise(r=>setTimeout(r,50));
 }
 return {context,page,frame:boot?target:null,boot,consoleErrors,close:()=>context.close()};
}
const openEvent={kind:'open',action:''};
const eventsFor=app=>[{label:'navigation',event:{kind:'click',action:app.nav}},{label:'open',event:openEvent}];
const loadApp=(frame,app,fixture,mode)=>frame.evaluate(job=>window.__spike.loadApp(job),{source:app.source,data:app.data[fixture],mode});
const renderIn=(frame,state,event,dom=false)=>frame.evaluate(([s,e,d])=>window.__spike.render(s,e,d),[state,event,dom]);

const loadAverage=()=>Math.round(os.loadavg()[0]*100)/100; // other work on the machine slows every number below; it is recorded, not hidden
const results={
 meta:{date:new Date().toISOString(),chromium:browser.version(),node:process.version,cpu:os.cpus()[0]?.model,cores:os.cpus().length,platform:`${os.platform()} ${os.release()}`,
  loadAverageAtStart:loadAverage(),processPriority:os.getPriority(),renders:RENDERS,coldSamples:COLD,rates:RATES,viewport:VIEWPORT,longTableRows:LONG_TABLE_ROWS,productFramePolicy:template,
  launchArgs:['--no-sandbox','--disable-dev-shm-usage','--disable-features=IsolateSandboxedIframes']},
 apps:apps.map(a=>({id:a.id,version:a.version,readableSourceBytes:a.readableSourceBytes,catalogSourceChars:a.catalogSourceChars,installedSourceChars:a.sourceChars,navigation:a.nav,screens:a.screens,largestTable:a.largestTable,demoRecords:a.data.demo.records.length,longRecords:a.data.long.records.length})),
};

// Results are written after every stage (results/<name>.json and .md), so a long run that is interrupted keeps what it measured.
const outDir=new URL('results/',import.meta.url),name=flag('out',quick?'quick':'latest'),{report}=await import('./report.mjs');
async function save(){
 results.meta.loadAverageAtEnd=loadAverage();await mkdir(outDir,{recursive:true});
 await writeFile(new URL(`${name}.json`,outDir),JSON.stringify(results,(k,v)=>typeof v==='number'?Math.round(v*100)/100:v,1)+'\n');
 const markdown=report(results);await writeFile(new URL(`${name}.md`,outDir),markdown);return markdown;
}

// ---------- 1. sizes ----------
if(ONLY.includes('sizes'))results.sizes=Object.fromEntries(Object.values(engines).map(e=>[e.name,{label:e.label,...e.sizes}]));

// ---------- 2. CSP matrix ----------
if(ONLY.includes('matrix')){
 const rows=[
  {shape:'served',parent:'none',frame:'product'},{shape:'served',parent:'none',frame:'wasm'},{shape:'served',parent:'none',frame:'wasm',engine:'asyncify'},{shape:'served',parent:'none',frame:'eval'},
  {shape:'served',parent:'strict+frame',frame:'wasm'},{shape:'served',parent:'strict',frame:'wasm'},
  {shape:'served',parent:'none',frame:'wasm+worker'},{shape:'served',parent:'strict+frame',frame:'wasm+worker'},
  {shape:'srcdoc',parent:'none',frame:'product'},{shape:'srcdoc',parent:'none',frame:'wasm'},{shape:'srcdoc',parent:'none',frame:'wasm',engine:'asyncify'},{shape:'srcdoc',parent:'none',frame:'eval'},
  {shape:'srcdoc',parent:'strict',frame:'wasm'},{shape:'srcdoc',parent:'strict',frame:'eval'},{shape:'srcdoc',parent:'strict+wasm',frame:'wasm'},{shape:'srcdoc',parent:'strict+wasm',frame:'product'},{shape:'srcdoc',parent:'strict+eval',frame:'wasm'},{shape:'srcdoc',parent:'strict+eval',frame:'eval'},
  {shape:'srcdoc',parent:'none',frame:'wasm+worker'},{shape:'srcdoc',parent:'strict+wasm',frame:'wasm+worker'},{shape:'srcdoc',parent:'strict+wasm+worker',frame:'wasm+worker'},
  {shape:'nested',parent:'strict',frame:'wasm'},{shape:'nested',parent:'strict+wasm',frame:'wasm'},
 ];
 const app=apps[0];results.matrix=[];
 for(const row of rows){
  const engine=row.engine??'sync',o=await open({...row,engine}),entry={shape:row.shape,parent:row.parent,frame:row.frame,engine,frameScriptRan:!!o.frame,wasmAllowed:null,engineStarted:false,rendered:false,nativeFunction:null,worker:null};
  if(o.frame){
   entry.wasmAllowed=o.boot.wasmAllowed;entry.engineStarted=o.boot.ok;entry.error=o.boot.ok?undefined:(o.boot.wasmError??o.boot.error);
   entry.nativeFunction=o.boot.nativeFunction;
   if(o.boot.ok){await loadApp(o.frame,app,'demo','quickjs');const r=await renderIn(o.frame,{},openEvent,true);entry.rendered=r.out.html.length>1000;entry.htmlChars=r.out.html.length;}
   if(row.frame==='wasm+worker'||(row.shape==='served'&&row.frame==='wasm'&&row.parent==='none'&&engine==='sync')){
    const w=await o.frame.evaluate(job=>window.__spike.workerProbe(job),{source:app.source,data:app.data.demo,state:{},event:{value:null,form:{},...openEvent},sizes:[16*MIB]});
    entry.worker={started:w.stage!=='construct'&&w.stage!=='error'&&w.stage!=='timeout',engineStarted:!!w.boot?.ok,rendered:!!w.ok,stage:w.stage,error:w.error??w.boot?.error,sync:w.sync};
   }
   entry.violations=[...new Set((await o.frame.evaluate(()=>window.__spike.violations)).map(v=>`${v.directive} blocked ${v.blocked}`))];
  }
  entry.consoleErrors=[...new Set(o.consoleErrors)].slice(0,4);
  results.matrix.push(entry);await o.close();
  log('matrix',row.shape,row.parent,row.frame,engine,'→ script',entry.frameScriptRan,'engine',entry.engineStarted,'render',entry.rendered,'native',entry.nativeFunction,entry.worker?'worker '+JSON.stringify({started:entry.worker.started,engine:entry.worker.engineStarted,rendered:entry.worker.rendered,stage:entry.worker.stage}):'');
 }
}

await save();
// ---------- 3. synchronous compile / instantiate limits ----------
if(ONLY.includes('limits')){
 results.limits=[];
 for(const engine of ['sync','asyncify']){const o=await open({shape:'served',engine,frame:'wasm'});results.limits.push({build:engine,...await o.frame.evaluate(sizes=>window.__spike.syncProbe(sizes),engine==='sync'?[MIB,8*MIB,8*MIB+1,16*MIB]:[])});await o.close();}
 log('limits',JSON.stringify(results.limits));
}

await save();
// ---------- 4. same output as the server ----------
/** Runs one event in the product's own runtime child process (src/foundation/runtime-child.mjs), unchanged. */
function serverRender(app,fixture,state,event){
 return new Promise((resolve,reject)=>{
  const store=createStore(app.data[fixture]),child=fork(fileURLToPath(new URL('src/foundation/runtime-child.mjs',REPO)),[],{stdio:['ignore','ignore','ignore','ipc']});
  const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('server runtime timed out'));},30000);
  child.on('message',m=>{
   if(m.kind==='call'){const request=JSON.parse(m.raw);try{child.send({kind:'reply',ok:true,raw:JSON.stringify(store(request.name,request.input)??null)});}catch{child.send({kind:'reply',ok:false,error:'Capability unavailable'});}}
   else if(m.kind==='done'){clearTimeout(timer);child.kill('SIGKILL');m.ok?resolve(JSON.parse(m.raw)):reject(new Error('server runtime failed'));}
  });
  child.send({kind:'start',source:app.source,input:inputFor(state,event),deadline:Date.now()+15000});
 });
}
if(ONLY.includes('parity')){
 results.parity=[];
 const pages={sync:await open({shape:'served',engine:'sync',frame:'eval'}),asyncify:await open({shape:'served',engine:'asyncify',frame:'wasm'})};
 for(const app of apps){
  const reference=[];let state={};
  for(const e of [openEvent,{kind:'click',action:app.nav}]){const out=await serverRender(app,'demo',state,e);reference.push(out);state=reference[0].state;}
  const same=async(frame,mode)=>{await loadApp(frame,app,'demo',mode);const a=(await renderIn(frame,{},openEvent)).out,b=(await renderIn(frame,a.state,{kind:'click',action:app.nav})).out;
   return JSON.stringify([a,b])===JSON.stringify(reference);};
  const row={app:app.id,events:['open',app.nav],frameSync:await same(pages.sync.frame,'quickjs'),frameAsyncify:await same(pages.asyncify.frame,'quickjs'),frameNative:await same(pages.sync.frame,'native')};
  results.parity.push(row);log('parity',JSON.stringify(row));
 }
 for(const p of Object.values(pages))await p.close();
}

await save();
// ---------- 5. cold start ----------
if(ONLY.includes('cold')){
 results.cold=[];const app=apps[0];
 for(const rate of RATES)for(const engine of ['sync','asyncify'])for(const shape of ['served','srcdoc']){
  const samples=[];
  for(let i=0;i<COLD;i++){
   const o=await open({shape,engine,frame:'wasm',rate});if(!o.frame||!o.boot.ok)throw new Error(`cold start failed: ${JSON.stringify(o.boot)} ${o.consoleErrors.join(' | ')}`);
   const load=await loadApp(o.frame,app,'demo','quickjs'),first=await renderIn(o.frame,{},openEvent,true);
   samples.push({scriptStartMs:o.boot.scriptStartMs,decodeMs:o.boot.decodeMs,instantiateMs:o.boot.instantiateMs,contextMs:o.boot.contextMs,engineStartMs:o.boot.bootMs,readyAtMs:o.boot.readyAtMs,loadSourceMs:load.loadMs,firstRenderMs:first.ms,firstDomMs:first.domMs});
   await o.close();
  }
  const row={rate,engine,shape,app:app.id,samples:samples.length,loadAverage:loadAverage()};for(const key of Object.keys(samples[0]))row[key]=stats(samples.map(s=>s[key]));
  results.cold.push(row);log('cold',rate+'x',engine,shape,'engine start median',round(row.engineStartMs.median),'ready at',round(row.readyAtMs.median),'load source',round(row.loadSourceMs.median),'first render',round(row.firstRenderMs.median));
 }
}

await save();
// ---------- 6. renders with a kept-alive context ----------
const MODES=[{mode:'quickjs-sync',engine:'sync',frame:'wasm',run:'quickjs'},{mode:'quickjs-asyncify',engine:'asyncify',frame:'wasm',run:'quickjs'},{mode:'native',engine:'sync',frame:'eval',run:'native'}];
if(ONLY.includes('bench')){
 results.calibration=[];results.bench=[];
 for(const rate of RATES)for(const m of MODES){
  const o=await open({shape:'served',engine:m.engine,frame:m.frame,rate});if(!o.frame||!o.boot.ok)throw new Error(`bench frame failed: ${JSON.stringify(o.boot)}`);
  results.calibration.push({rate,mode:m.mode,loadAverage:loadAverage(),...await o.frame.evaluate(()=>window.__spike.calibrate())});
  for(const app of apps)for(const fixture of ['demo','long']){
   const load=await loadApp(o.frame,app,fixture,m.run),first=await renderIn(o.frame,{},openEvent,true);
   const n=fixture==='long'?Math.max(20,Math.ceil(RENDERS*2/3)):RENDERS;
   const b=await o.frame.evaluate(job=>window.__spike.bench(job),{state:first.out.state,events:eventsFor(app),n,dom:true});
   for(const s of b.series){
    const total=s.renderMs.map((v,i)=>v+s.domMs[i]);
    const row={rate,mode:m.mode,app:app.id,fixture,event:s.label,action:s.label==='open'?'open':app.nav,loadSourceMs:load.loadMs,firstOpenRenderMs:first.ms,render:stats(s.renderMs),store:stats(s.storeMs),dom:stats(s.domMs),total:stats(total),calls:s.calls,htmlChars:s.htmlChars,nodes:s.nodes,memoryBefore:b.memoryBefore,memoryAfter:b.memoryAfter};
    results.bench.push(row);log('bench',rate+'x',m.mode,app.id,fixture,s.label,'render median',round(row.render.median),'p95',round(row.render.p95),'dom median',round(row.dom.median),'total p95',round(row.total.p95));
   }
  }
  await o.close();
 }
}

await save();
// ---------- 7. every screen, QuickJS sync, demo data ----------
if(ONLY.includes('screens')){
 results.screens=[];
 for(const rate of RATES.filter(r=>r===1||r===4)){
  const o=await open({shape:'served',engine:'sync',frame:'wasm',rate});
  for(const app of apps){
   await loadApp(o.frame,app,'demo','quickjs');const first=await renderIn(o.frame,{},openEvent,true);
   const b=await o.frame.evaluate(job=>window.__spike.bench(job),{state:first.out.state,events:app.screens.map(s=>({label:s,event:{kind:'click',action:'nav:'+s}})),n:SCREEN_RENDERS,dom:true});
   for(const s of b.series)results.screens.push({rate,app:app.id,screen:s.label,render:stats(s.renderMs),dom:stats(s.domMs),total:stats(s.renderMs.map((v,i)=>v+s.domMs[i])),htmlChars:s.htmlChars,nodes:s.nodes});
  }
  await o.close();
 }
 log('screens done');
}

await browser.close();hostServer.close();frameServer.close();

console.log(await save());
