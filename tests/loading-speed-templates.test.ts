import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,readdir,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import express from 'express';
import request from 'supertest';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {syncTemplateCatalog} from '../src/workspace/template-catalog.js';
import {templateMedia} from '../src/workspace/template-media.js';
import {templateAvailable} from '../src/workspace/template-availability.js';
import {addAppApi,addTemplateCardRoute} from '../src/server/apps.js';
import {addMcp} from '../src/server/mcp.js';
import {baseApp} from '../src/server/app.js';
import type {Actor} from '../src/shared/schema.js';

/* Loading speed session L3 (docs/scopes/LOADING_SPEED_2026-11-22.md): templates and the plugin path.
 * L3.1 the template list is one query and, while the catalog is unchanged, nothing is re-read or re-sent;
 * L3.2 card images at the size shown, kept by fingerprint; L3.3 a public card address for plugin widgets;
 * L3.4 previews kept by fingerprint; L3.5 plugin requests reuse a prepared tool list; L3.6 the widget file budget. */
const LIST_BUDGET=1,CARD_BYTES=60_000,WIDGET_BYTES=1_900_000;
async function setup(){
 const pg=new PGlite(),log:{sql:string;rows:any[]}[]=[];let on=false;
 const record=async(sql:string,run:Promise<any>)=>{const r=await run;if(on)log.push({sql,rows:r.rows});return r;};
 const db:Database={query:(q,v)=>record(q,pg.query(q,v)) as any,transaction:fn=>pg.transaction(tx=>fn({query:(q:string,v:any)=>record(q,tx.query(q,v))} as Connection)),close:()=>pg.close()};
 for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+f,'utf8'));
 await syncTemplateCatalog(db);
 const measure=async<T>(fn:()=>Promise<T>)=>{log.length=0;on=true;try{const value=await fn();return {value,queries:log.length,log:[...log]};}finally{on=false;}};
 return {pg,db,measure};
}

test('L3.1: the template list costs one query and an unchanged catalog is neither re-read nor re-sent',async()=>{
 const {pg,db,measure}=await setup();
 try{
  for(const channel of ['platform','chatgpt','claude'] as const){
   const catalog=new AppTemplates(undefined,db,channel);
   const first=await measure(()=>catalog.list({limit:50}));
   assert.ok(first.queries<=LIST_BUDGET,`${channel}: list ${first.queries} queries exceeds ${LIST_BUDGET}`);
   assert.match(first.value.catalog,/^[a-f0-9]{32}$/);assert.ok(first.value.templates.length>0);
   const again=await measure(()=>catalog.list({limit:50}));
   assert.equal(again.queries,LIST_BUDGET);assert.deepEqual(again.value,first.value);
   // Nothing re-read: the held versions come back without their payload.
   assert.ok(again.log[0].rows.every(r=>r.payload===null),'an unchanged catalog does not read template payloads again');
   const held=await measure(()=>catalog.list({limit:50,catalog:first.value.catalog}));
   assert.equal(held.queries,LIST_BUDGET);assert.deepEqual(held.value,{catalog:first.value.catalog,unchanged:true});
   assert.ok(Buffer.byteLength(JSON.stringify(held.value))<100,'nothing re-sent');
   // Searching keeps the fingerprint of the whole catalog.
   assert.equal((await catalog.list({query:'zzz-no-match'})).catalog,first.value.catalog);
  }
  // Channels see different catalogs, so their fingerprints differ when their lists differ.
  const web=await new AppTemplates(undefined,db,'platform').list({limit:50}),all=await new AppTemplates(undefined,db).list({limit:50});
  assert.notEqual(web.catalog,all.catalog);
  // A changed catalog (a version withdrawn) changes the fingerprint and sends the list again.
  const catalog=new AppTemplates(undefined,db,'platform'),before=await catalog.list({limit:50}),gone=before.templates[0];
  await pg.query("UPDATE app_template_catalog SET status='draft' WHERE template_id=$1",[gone.id]);
  const after=await catalog.list({limit:50,catalog:before.catalog});
  assert.notEqual(after.catalog,before.catalog);assert.equal(after.unchanged,undefined);
  assert.ok(!after.templates.some(t=>t.id===gone.id));assert.equal(after.templates.length,before.templates.length-1);
 }finally{await pg.close();}
});

const jpegSize=(b:Buffer)=>{let i=2;while(i<b.length){const m=b[i+1],l=b.readUInt16BE(i+2);if(m>=0xc0&&m<=0xc3)return {height:b.readUInt16BE(i+5),width:b.readUInt16BE(i+7)};i+=2+l;}return null;};
test('L3.2: every listed template has a card image at the size shown, current with its screenshot',async()=>{
 execFileSync(process.execPath,['scripts/build-template-cards.mjs','--check'],{stdio:'pipe'});
 const {pg,db,measure}=await setup();
 try{
  const catalog=new AppTemplates(undefined,db,'platform');
  for(const t of (await catalog.list({limit:50})).templates){
   const card=await measure(()=>templateMedia(catalog,t.id,t.version,'card'));
   assert.ok(card.queries<=1,'approval is checked with one query');
   const bytes=card.value as Buffer,shot=await templateMedia(catalog,t.id,t.version,'screenshot') as Buffer;
   assert.deepEqual(jpegSize(bytes),{width:720,height:480},t.id);
   assert.ok(bytes.length<=CARD_BYTES&&bytes.length<shot.length/2,`${t.id}: card ${bytes.length} bytes`);
  }
 }finally{await pg.close();}
});

test('L3.2-L3.4: card images and previews are kept for good by fingerprint; the plugin card address is public and exact',async()=>{
 const {pg,db}=await setup();
 try{
  const app=express();app.use(express.json());addTemplateCardRoute(app,db);addAppApi(app,new WorkspaceFoundation(db));
  const t=(await new AppTemplates(undefined,db,'platform').list({limit:50})).templates[0];
  const base=`/api/app-templates/${t.id}/${t.version}`;
  for(const kind of ['card','screenshot','preview']){
   const exact=await request(app).get(`${base}/${kind}?d=${t.digest}`);
   assert.equal(exact.status,200,kind);assert.equal(exact.headers['cache-control'],'private, max-age=31536000, immutable',kind);
   const loose=await request(app).get(`${base}/${kind}`);
   assert.match(loose.headers['cache-control'],/no-cache|no-store/,kind);
  }
  assert.ok(Number((await request(app).get(`${base}/card?d=${t.digest}`)).headers['content-length'])<=CARD_BYTES);
  const card=await request(app).get(`/template-cards/chatgpt/${t.id}/${t.version}/${t.digest}.jpg`);
  assert.equal(card.status,200);assert.equal(card.headers['cache-control'],'public, max-age=31536000, immutable');
  assert.equal(card.headers['cross-origin-resource-policy'],'cross-origin');assert.equal(card.headers['content-type'],'image/jpeg');
  assert.equal((await request(app).get(`/template-cards/chatgpt/${t.id}/${t.version}/${'0'.repeat(64)}.jpg`)).status,404,'another digest');
  assert.equal((await request(app).get(`/template-cards/other/${t.id}/${t.version}/${t.digest}.jpg`)).status,404,'unknown channel');
  assert.equal((await request(app).get(`/template-cards/chatgpt/../../etc/passwd/${t.digest}.jpg`)).status,404);
  const hidden=(await new AppTemplates(undefined,db).list({limit:50})).templates.find(x=>!templateAvailable(x.id,'chatgpt'));
  if(hidden)assert.equal((await request(app).get(`/template-cards/chatgpt/${hidden.id}/${hidden.version}/${hidden.digest}.jpg`)).status,404,'switched off for the channel');
  await pg.query("UPDATE app_template_catalog SET status='draft' WHERE template_id=$1",[t.id]);
  assert.equal((await request(app).get(`/template-cards/chatgpt/${t.id}/${t.version}/${t.digest}.jpg`)).status,404,'withdrawn');
  assert.equal((await request(app).get(`${base}/card?d=${t.digest}`)).status>=400,true,'withdrawn on the website too');
 }finally{await pg.close();}
});

test('L3.3, L3.5: plugin requests reuse a prepared tool list, build one tool per call and never share authorization',async()=>{
 const {pg,db}=await setup(),previous=process.env.SIMPLE_APPS_ENABLED;process.env.SIMPLE_APPS_ENABLED='true';
 try{
  const s=new Service(db),people:Actor[]=[];
  for(const name of ['Ada','Bo']){const human:Actor={userId:randomUUID(),origin:'human'};await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[human.userId,human.userId,human.userId+'@example.invalid',name]);const w=(await s.createWorkspace(human,name+' org')).id;await s.setAi(human,w,true);people.push(human);}
  const serve=()=>{let who:Actor|undefined;const app=baseApp(100000);addMcp(app,s,(req,_res,next)=>{req.actor=who;next();});
   return {as:(a:Actor|undefined)=>{who=a&&{...a,origin:'ai',assistant:'chatgpt'} as Actor;},rpc:async(method:string,params:any={})=>(await request(app).post('/mcp').set('Accept','application/json, text/event-stream').set('Authorization','Bearer test').send({jsonrpc:'2.0',id:1,method,params})).body};};
  const cold=serve(),warm=serve();
  // The prepared list is exactly what a full build lists, for every caller of the same endpoint variant.
  warm.as(people[0]);const prepared=(await warm.rpc('tools/list')).result.tools;
  assert.ok(prepared.length>=190,`${prepared.length} tools`);
  for(const person of people){warm.as(person);cold.as(person);
   assert.deepEqual((await warm.rpc('tools/list')).result.tools,prepared);
   assert.deepEqual((await cold.rpc('tools/list')).result.tools,prepared);}
  // Signed out (ChatGPT's optional sign-in) is its own variant.
  warm.as(undefined);cold.as(undefined);const guest=(await warm.rpc('tools/list')).result.tools;
  assert.deepEqual((await warm.rpc('tools/list')).result.tools,guest);assert.deepEqual((await serve().rpc('tools/list')).result.tools,guest);
  warm.as(people[0]);
  // The widget's resource lets card images load from the platform origin.
  const resource=(await warm.rpc('resources/list')).result.resources[0];
  assert.ok(resource._meta.ui.csp.resourceDomains.length===1);
  const cards=prepared.find((t:any)=>t.name==='read_app_template_cards');assert.deepEqual(cards._meta.ui.visibility,['app']);
  // Calls alternate between two people on one server: each sees only their own account, before and after the
  // tool groups are learned.
  for(let round=0;round<2;round++)for(const [i,person] of people.entries()){
   warm.as(person);const listed=JSON.parse((await warm.rpc('tools/call',{name:'list_workspaces',arguments:{}})).result.content[0].text);
   assert.deepEqual(listed.map((w:any)=>w.name),[['Ada','Bo'][i]+' org']);
  }
  // Calls in every tool group still work when only their group is built.
  warm.as(people[0]);
  for(const [name,args] of [['read_app_design',{}],['list_app_templates',{}],['read_workspace_guide',{}],['read_tracker_design',{}],['list_tables',{workspaceId:randomUUID()}]] as const){
   const r=(await warm.rpc('tools/call',{name,arguments:args})).result;assert.ok(r,name);
   if(name!=='list_tables')assert.notEqual(r.isError,true,name);
  }
  const cardsRead=(await warm.rpc('tools/call',{name:'read_app_template_cards',arguments:{items:[{templateId:'life.cash-runway',version:'0.0.0'},...(await new AppTemplates(undefined,db,'chatgpt').list({limit:2})).templates.map((t:any)=>({templateId:t.id,version:t.version}))]}})).result;
  assert.equal(Object.keys(cardsRead._meta.templateCards).length,2,'unavailable versions are left out');
  for(const v of Object.values(cardsRead._meta.templateCards))assert.match(v as string,/^data:image\/jpeg;base64,/);
  // An unknown tool answers as before (full build).
  const unknown=await warm.rpc('tools/call',{name:'no_such_tool',arguments:{}}),fresh=await serve().rpc('tools/call',{name:'no_such_tool',arguments:{}});
  assert.deepEqual(unknown,fresh);
  // Removing access takes effect on the next request: nothing about access is kept between requests.
  const ws=(await s.workspaces(people[1]))[0].id;await s.setAi(people[1],ws,false);warm.as(people[1]);
  const after=(await warm.rpc('tools/call',{name:'list_workspaces',arguments:{}})).result;
  assert.deepEqual(JSON.parse(after.content[0].text),[]);
 }finally{if(previous===undefined)delete process.env.SIMPLE_APPS_ENABLED;else process.env.SIMPLE_APPS_ENABLED=previous;await pg.close();}
});

test('L3.6: the plugin widget file stays within its budget',async()=>{
 const brand=await readFile('src/shared/BrandMark.tsx','utf8');
 for(const file of brand.match(/\/trialagents-mark-[a-z0-9-]+\.png/g)!)assert.ok((await stat('public'+file)).size<=16_000,file);
 if(!existsSync('dist/embed.html'))return; // built by npm run build (CI builds before testing)
 const html=await readFile('dist/embed.html','utf8');
 assert.ok(Buffer.byteLength(html)<=WIDGET_BYTES,`dist/embed.html ${Buffer.byteLength(html)} bytes exceeds ${WIDGET_BYTES}`);
 assert.ok(!html.includes('\\u05D0')&&!/\\u04[0-9a-f]{2}/i.test(html),'zod translations stay out of the widget');
});
