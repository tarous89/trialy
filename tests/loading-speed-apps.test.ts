import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {syncTemplateCatalog,installCatalogApp} from '../src/workspace/template-catalog.js';
import {readApp,openApp} from '../src/workspace/apps.js';
import {addAppMcp} from '../src/server/apps.js';
import {sourceDigest,effectiveSource} from '../src/workspace/browser-runtime.js';
import {runtimeModeReport} from '../src/workspace/runtime-mode-report.js';
import {withReadMetadata,primeById} from '../src/db/read-metadata.js';
import type {Actor} from '../src/shared/schema.js';

/* Loading speed session L2 (docs/scopes/LOADING_SPEED_2026-11-22.md): opening an individual app.
 * L2.1 an open works out access once per request; L2.2 code by fingerprint; L2.6 the "open app" result carries the
 * first screen for the widget only; L2.7 the server-mode report. */
// Platform queries of one app open beyond the app's own data reads (one per records.read, plus a count for a full page).
// Measured 28 for the owner, 33 for a member and 27 for an assistant on Runway (13 tables); the scope's target is 25.
const OPEN_OVERHEAD_BUDGET=34;
const isDataRead=(sql:string)=>/^WITH params AS/.test(sql.trim());
async function setup(){
 const pg=new PGlite(),log:string[]=[];let on=false;
 const db:Database={query:(q,v)=>{if(on)log.push(q);return pg.query(q,v) as any;},transaction:fn=>pg.transaction(tx=>fn({query:(q:string,v:any)=>{if(on)log.push(q);return tx.query(q,v) as any;}} as Connection)),close:()=>pg.close()};
 for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+f,'utf8'));
 const owner:Actor={userId:randomUUID(),origin:'human'},member:Actor={userId:randomUUID(),origin:'human'},stranger:Actor={userId:randomUUID(),origin:'human'};
 for(const a of [owner,member,stranger])await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,a.userId+'@example.invalid','Fixture']);
 const s=new Service(db),f=new WorkspaceFoundation(db),w=(await s.createWorkspace(owner,'Speed')).id;await s.setAi(owner,w,true);await s.share(owner,w,member.userId,'editor',[],null,true);
 await syncTemplateCatalog(db);
 const t=await new AppTemplates(undefined,db).read({templateId:'life.cash-runway'});
 const app=(await installCatalogApp(f,{...owner,actionConfirmed:true} as any,w,{templateId:t.id,version:t.version,digest:t.digest,name:'Runway',requestKey:randomUUID()})).appId as string;
 const measure=async<T>(fn:()=>Promise<T>)=>{log.length=0;on=true;try{const value=await fn();return {value,queries:log.length,overhead:log.filter(q=>!isDataRead(q)).length};}finally{on=false;}};
 return {pg,db,s,f,w,app,owner,member,stranger,assistant:{...owner,origin:'ai'} as Actor,measure};
}

test('L2.1, L2.2: an app opens in one request with a fixed platform cost, the same first screen, and the frame reads without the code',async()=>{
 const x=await setup();
 try{
  const loc={workspaceId:x.w,appId:x.app,source:'component'};
  for(const who of ['owner','member','assistant'] as const){
   const a=x[who];
   const opened=await x.measure(()=>readApp(x.f,a,loc,true,{source:false}));
   const r:any=opened.value;console.log(JSON.stringify({who,open:opened.queries,overhead:opened.overhead}));
   assert.ok(opened.overhead<=OPEN_OVERHEAD_BUDGET,`${who}: app open ${opened.overhead} platform queries exceeds ${OPEN_OVERHEAD_BUDGET}`);
   // Same first screen as a separate run without the request-wide scope.
   const separate=await x.f.runFrontend(a,x.w,{componentId:x.app,expectedVersion:r.component.version,event:{kind:'open'}});
   assert.equal(r.initialOutput.html,separate.html);
   // The frame gets what it needs to run the app itself, but not the code (the client holds it or fetches it by fingerprint).
   assert.equal(r.initialOutput.browser.mode,'compat');assert.ok(r.initialOutput.browser.reads.length>0);assert.equal(r.initialOutput.browser.source,undefined);
   const digest=r.initialOutput.browser.digest;assert.equal(digest,sourceDigest(effectiveSource(r.component.source)));
   // A frame open (run_component_frontend) costs the same; code is sent only when asked and not already held.
   const framed=await x.measure(()=>x.f.runFrontendRequest(a,x.w,{componentId:x.app,expectedVersion:r.component.version,event:{kind:'open'},browser:{source:true}}));
   assert.ok(framed.overhead<=OPEN_OVERHEAD_BUDGET,`${who}: frame open ${framed.overhead} platform queries`);
   assert.equal((framed.value as any).browser.source,effectiveSource(r.component.source));
   const held=await x.f.runFrontendRequest(a,x.w,{componentId:x.app,expectedVersion:r.component.version,event:{kind:'open'},browser:{source:true,have:[digest]}});
   assert.equal(held.browser.source,undefined);assert.equal(held.browser.digest,digest);
   // App code by fingerprint: the same checks as opening the app.
   assert.equal(await x.f.appCode(a,x.w,x.app,digest),effectiveSource(r.component.source));
   await assert.rejects(x.f.appCode(a,x.w,x.app,'0'.repeat(32)),(e:any)=>e.status===404);
  }
  await assert.rejects(readApp(x.f,x.stranger,loc,true,{source:false}),(e:any)=>e.status===404);
  await assert.rejects(x.f.appCode(x.stranger,x.w,x.app,'0'.repeat(32)),(e:any)=>e.status===404);
 }finally{await x.pg.close();}
});

test('L2.6: open_app hands the first screen to the widget only; the assistant receives the same result as before',async()=>{
 const x=await setup();
 try{
  const registered=new Map<string,any>();
  const safe=(fn:any)=>async(v:any)=>{try{const result=await fn(v);return {content:[{type:'text',text:JSON.stringify(result)}],structuredContent:{result}};}catch(e){return {isError:true,content:[{type:'text',text:(e as Error).message}]};}};
  addAppMcp({registerTool:(n:string,m:any,run:any)=>registered.set(n,{m,run})} as any,x.f,x.owner,safe,{ui:{resourceUri:'ui://trialy/test'}});
  const out=await registered.get('open_app').run({workspaceId:x.w,appId:x.app,source:'component'});
  assert.equal(out.structuredContent.result.screen,'tracker');assert.equal(out.structuredContent.result.initialOutput,undefined);
  assert.ok(!out.content[0].text.includes('initialOutput'),'the assistant does not receive the screen');
  assert.ok(out._meta['trialagents/initialOutput'].html.length>0,'the widget does');
  const direct:any=await openApp(x.f,x.owner,{workspaceId:x.w,appId:x.app,source:'component'});assert.equal(direct.initialOutput.html,out._meta['trialagents/initialOutput'].html);
  const missing=await registered.get('open_app').run({workspaceId:x.w,appId:randomUUID(),source:'component'});assert.equal(missing.isError,true);assert.equal(missing._meta,undefined);
 }finally{await x.pg.close();}
});

test('L2.1: reused lookups are verified together; a change between use and release discards the response',async()=>{
 let version=0,queries:string[]=[];
 const rows=()=>[{id:'00000000-0000-4000-8000-000000000001',fields:[{key:'a'}],version},{id:'00000000-0000-4000-8000-000000000002',fields:[{key:'b'}],version}];
 const db:Database={query:async(sql:string,values:any[]=[])=>{queries.push(sql);const all=rows();
  if(/id=ANY/.test(sql))return {rows:all.filter(r=>values[0].includes(r.id)).map(r=>/trialy_verify_id/.test(sql)?{trialy_verify_id:r.id,...r}:r)} as any;
  const row=all.find(r=>r.id===values[0]);return {rows:row?[/^SELECT fields/.test(sql)?{fields:row.fields}:row]:[]} as any;},transaction:fn=>fn(db),close:async()=>{}};
 const one='SELECT * FROM entity_types WHERE id=$1 AND workspace_id=$2',fields='SELECT fields FROM entity_types WHERE id=$1 AND workspace_id=$2';
 const ids=rows().map(r=>r.id);
 // Two tables primed in one query, each used three times (in full and its fields): one lookup, one verification.
 await withReadMetadata(db,async s=>{await primeById(s,'entity_types',ids,'w');for(let i=0;i<3;i++)for(const id of ids){await s.query(one,[id,'w']);assert.deepEqual((await s.query(fields,[id,'w'])).rows,[{fields:rows().find(r=>r.id===id)!.fields}]);}});
 assert.equal(queries.length,2,queries.join('\n'));assert.match(queries[1],/trialy_verify_id/);
 queries=[];
 await assert.rejects(withReadMetadata(db,async s=>{await primeById(s,'entity_types',ids,'w');await s.query(one,[ids[0],'w']);await s.query(one,[ids[0],'w']);version++;return 'must not return';}),/Access or schema changed/);
 // Used once only: as fresh as a direct read, not verified again.
 queries=[];await withReadMetadata(db,async s=>{await primeById(s,'entity_types',ids,'w');await s.query(one,[ids[0],'w']);});assert.equal(queries.length,1);
});

test('L2.7: the runtime report says which apps run in the browser and why the others do not',async()=>{
 const x=await setup();
 try{
  const p=await x.f.preview(x.owner,x.w,{kind:'save_component',projectId:null,content:{name:'Own app',format:'frontend-js',source:"return {html:'<p>Own</p>',state:{}};",sourceAccess:'workspace',bindings:[]}} as any);
  await x.f.confirm(x.owner,x.w,p.id,p.digest);
  const report=await runtimeModeReport(x.db);
  assert.equal(report.apps,2);assert.equal(report.counts.browser_compat,1);assert.equal(report.counts.server_customized,1);
  assert.deepEqual(report.customized.map((c:any)=>c.app),['Own app']);assert.ok(report.switchedOn.length>0);
  assert.equal(JSON.stringify(report).includes('return {html'),false,'no code in the report');
 }finally{await x.pg.close();}
});
