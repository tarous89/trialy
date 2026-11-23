import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,readdir,mkdtemp,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import request from 'supertest';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {syncTemplateCatalog} from '../src/workspace/template-catalog.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {addMcp} from '../src/server/mcp.js';
import {baseApp,addApi} from '../src/server/app.js';
import {addPublicAssets,addWebFallback} from '../src/server/static-assets.js';
import {workspaceResource} from '../src/server/ui-resource.js';
import {frameVersion} from '../src/workspace/frame-url.js';
import * as known from '../src/shared/last-known.js';
import {standardSource} from '../src/shared/standard-tool.js';
import type {Actor} from '../src/shared/schema.js';

/* Loading speed session L4 (docs/scopes/LOADING_SPEED_2026-11-22.md): instant return visits.
 * L4.1 last known basics hold no records and belong to one person; L4.2 static and list responses are compressed and
 * cached as they should be; L4.5 the widget is two parts, the second public, exact and also readable through the
 * assistant, with a single-file switch; L4.6 the Claude widget carries the font once. */
const WIDGET_BYTES=1_700_000,PART_BYTES=260_000,CLAUDE_BYTES=2_550_000,BASICS_BYTES=12_000;
const built=existsSync('dist/embed.html')&&existsSync('dist/widget-parts.json');
async function setup(){
 const pg=new PGlite();
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as unknown as Connection)),close:()=>pg.close()};
 for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+f,'utf8'));
 await syncTemplateCatalog(db);
 return {pg,db};
}
class MemoryStorage{
 values=new Map<string,string>();get length(){return this.values.size;}
 key(i:number){return [...this.values.keys()][i]??null;}getItem(k:string){return this.values.get(k)??null;}
 setItem(k:string,v:string){this.values.set(k,String(v));}removeItem(k:string){this.values.delete(k);}clear(){this.values.clear();}
}

test('L4.1: last known basics hold names, kinds, dates and counts only, for one person, and go on sign-out',()=>{
 const storage=new MemoryStorage();known.lastKnownStorageForTests(storage as unknown as Storage);
 const home={projects:[{id:'p1',name:'Oncology',workspaceId:'w1',createdAt:'2026-11-01'}],total:21,nextOffset:20,archivedApps:{w1:3},revision:'r1',
  resources:[
   ...Array.from({length:20},(_,i)=>({id:'a'+i,workspaceId:'w1',name:'App '+i,kind:'tracker',source:'component',projectIds:['p1'],updatedAt:'2026-11-2'+(i%9),description:'',placementVersion:4,canMove:true,
    snapshot:{kind:'table',tabs:['Sites'],columns:['Site','PI'],rows:[['Charité','Dr. Secret Value'+i]],total:12}})),
   {id:'draft',workspaceId:'w1',name:'Unsaved draft',kind:'tracker',source:'preview',projectIds:[],updatedAt:'2026-11-23',status:'Preview'},
  ]};
 // Nothing is kept or shown until the host names the signed-in person.
 known.rememberHome('k',home);assert.equal(storage.length,0);assert.equal(known.knownHome('k'),undefined);
 known.setLastKnownViewer('ada');known.rememberHome('k',home);
 const stored=storage.getItem('trialy-last-known:v1')!;
 assert.ok(!stored.includes('Secret Value')&&!stored.includes('snapshot')&&!stored.includes('rows'),'no records or miniatures');
 assert.ok(!stored.includes('Unsaved draft'),'no drafts');
 assert.ok(Buffer.byteLength(stored)<=BASICS_BYTES,`${Buffer.byteLength(stored)} bytes for 20 cards`);
 const basics=known.knownHome('k')!;
 assert.equal(basics.remembered,true);assert.equal(basics.resources.length,20);assert.deepEqual(basics.archivedApps,{w1:3});assert.equal(basics.total,21);
 assert.deepEqual(Object.keys(basics.resources[0]).sort(),['canMove','description','id','kind','name','projectIds','source','updatedAt','workspaceId']);
 assert.equal(basics.resources[0].canMove,false,'remembered cards offer no move until checked');
 assert.equal(known.knownHome('other'),undefined,'only the exact read that was shown');
 // A changed revision or lost access forgets what was remembered (src/shared/useHomeData.ts).
 known.forgetHome();assert.equal(known.knownHome('k'),undefined);known.rememberHome('k',home);
 // Templates (catalog data) and an app's frame (name and tab names).
 known.rememberTemplates({catalog:'c'.repeat(32),templates:[{id:'t',name:'Runway'}]});assert.equal(known.knownTemplates()!.catalog,'c'.repeat(32));
 known.rememberApp('w1','a1',{name:'Site tracker',tabs:['Overview','Sites']});assert.deepEqual(known.knownApp('w1','a1'),{name:'Site tracker',tabs:['Overview','Sites']});
 assert.deepEqual(known.appTabNames({source:standardSource({name:'T',description:'',tabs:[{name:'Sites'},{name:'Hidden',visible:false},{name:'Contacts'}]})}),['Sites','Contacts']);
 assert.deepEqual(known.appTabNames({source:"return {html:''}"}),[]);
 known.forgetApp('w1','a1');assert.equal(known.knownApp('w1','a1'),undefined,'an app the person lost is forgotten');
 // Old basics are not shown.
 const now=Date.now;try{Date.now=()=>now()+15*86400000;assert.equal(known.knownHome('k'),undefined);}finally{Date.now=now;}
 // Another person on this device: everything of the first person is removed.
 known.setLastKnownViewer('bo');assert.equal(known.knownHome('k'),undefined);assert.equal(storage.length,0);
 known.rememberHome('k',home);known.setLastKnownViewer('ada');assert.equal(known.knownHome('k'),undefined,'Bo’s basics are never shown to Ada');
 // Sign-out removes everything.
 known.setLastKnownViewer('ada');known.rememberHome('k',home);known.forgetLastKnown();assert.equal(storage.length,0);assert.equal(known.knownHome('k'),undefined);
 // Where the host refuses storage nothing is kept and nothing fails.
 known.lastKnownStorageForTests(null);known.setLastKnownViewer('ada');known.rememberHome('k',home);assert.equal(known.knownHome('k'),undefined);assert.equal(known.lastKnownAvailable(),false);
 const refusing={getItem(){throw Error('SecurityError');},setItem(){throw Error('SecurityError');},removeItem(){throw Error('SecurityError');}};
 (globalThis as any).localStorage=refusing;known.lastKnownStorageForTests(undefined);
 try{known.setLastKnownViewer('ada');known.rememberHome('k',home);assert.equal(known.knownHome('k'),undefined);known.forgetLastKnown();}
 finally{delete (globalThis as any).localStorage;known.lastKnownStorageForTests(undefined);}
});

test('L4.5: the widget is two parts; the second is one public, exact file, also readable through the assistant',{skip:!built&&'dist not built (npm run build)'},async()=>{
 const html=await readFile('dist/embed.html','utf8'),manifest=JSON.parse(await readFile('dist/widget-parts.json','utf8'));
 assert.equal(manifest.singleFile,false);assert.match(manifest.file,/^[a-f0-9]{20}\.js$/);
 const part=await readFile('dist/widget-parts/'+manifest.file,'utf8');
 assert.equal('sha384-'+createHash('sha384').update(part).digest('base64'),manifest.integrity,'integrity names the file exactly');
 assert.ok(html.includes(manifest.file)&&html.includes(manifest.integrity),'the widget names its second part');
 assert.ok(Buffer.byteLength(html)<=WIDGET_BYTES,`dist/embed.html ${Buffer.byteLength(html)} bytes exceeds ${WIDGET_BYTES}`);
 assert.ok(Buffer.byteLength(part)<=PART_BYTES,`second part ${Buffer.byteLength(part)} bytes exceeds ${PART_BYTES}`);
 // Pages the first screen never shows are in the second part only (their own text is a marker).
 for(const marker of ['Find your next app','No automations configured.','No matching records.','Schedule this saved revision','New project name']){
  assert.ok(part.includes(marker),`${marker} in the second part`);assert.ok(!html.includes(marker),`${marker} not in the widget file`);
 }
 // The first screen's own code stays inside the widget.
 for(const marker of ['Loading your work','Checking for changes','Loading app'])assert.ok(html.includes(marker),`${marker} in the widget file`);
 assert.ok(!/\bimport\(/.test(html)&&!/\bimport\(/.test(part),'no dynamic import: hosts give the widget no base address');
 const {pg,db}=await setup();
 try{
  const s=new Service(db),human:Actor={userId:randomUUID(),origin:'human'};
  await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[human.userId,human.userId,'p@example.invalid','P']);
  const app=baseApp(100000);addMcp(app,s,(req,_res,next)=>{req.actor={...human,origin:'ai',assistant:'chatgpt'} as Actor;next();});
  const served=await request(app).get('/widget-parts/'+manifest.file).set('Accept-Encoding','br');
  assert.equal(served.status,200);assert.match(served.headers['content-type'],/^application\/javascript/);
  assert.equal(served.headers['cache-control'],'public, max-age=31536000, immutable');
  assert.equal(served.headers['cross-origin-resource-policy'],'cross-origin');assert.equal(served.headers['access-control-allow-origin'],'*');
  assert.equal(served.headers['content-encoding'],'br');
  assert.equal((await request(app).get('/widget-parts/'+manifest.file)).text,part);
  for(const other of ['0'.repeat(20)+'.js','..%2Fembed.html',manifest.file.replace('.js','.map')])assert.equal((await request(app).get('/widget-parts/'+other)).status,404,other);
  const rpc=async(method:string,params:any)=>(await request(app).post('/mcp').set('Accept','application/json, text/event-stream').set('Authorization','Bearer test').send({jsonrpc:'2.0',id:1,method,params})).body.result;
  const tool=(await rpc('tools/list',{})).tools.find((t:any)=>t.name==='read_widget_part');
  assert.deepEqual(tool._meta.ui.visibility,['app'],'widget only');
  const read=await rpc('tools/call',{name:'read_widget_part',arguments:{file:manifest.file}});
  assert.equal(read._meta.widgetPart,part);assert.equal(read.structuredContent.integrity,manifest.integrity);assert.deepEqual(read.content,[],'nothing for the assistant to read');
  assert.equal((await rpc('tools/call',{name:'read_widget_part',arguments:{file:'0'.repeat(20)+'.js'}})).isError,true);
 }finally{await pg.close();}
});

test('L4.5: the build switch puts everything back into one file',{timeout:180_000},async()=>{
 const out=await mkdtemp(join(tmpdir(),'widget-single-'));
 try{
  execFileSync(process.execPath,['--import','tsx','scripts/build-embed.ts'],{env:{...process.env,TRIALY_WIDGET_SINGLE_FILE:'1',TRIALY_WIDGET_OUT_DIR:out},stdio:'pipe'});
  const manifest=JSON.parse(await readFile(join(out,'widget-parts.json'),'utf8')),html=await readFile(join(out,'embed.html'),'utf8');
  assert.equal(manifest.singleFile,true);assert.equal(manifest.file,null);assert.equal(existsSync(join(out,'widget-parts')),false,'no second file');
  for(const marker of ['Find your next app','No automations configured.','Loading your work'])assert.ok(html.includes(marker),marker);
  assert.ok(!html.includes('__TRIALY_LATE_FILE__')&&!html.includes('__TRIALY_LATE_INTEGRITY__'));
 }finally{await rm(out,{recursive:true,force:true});}
});

test('L4.6: the Claude widget carries the Inter font once',{skip:!built&&'dist not built (npm run build)'},async()=>{
 const claude=(await workspaceResource('claude')).html,chatgpt=(await workspaceResource()).html;
 assert.equal((claude.match(/data:font\/woff2;base64,/g)??[]).length,1,'one copy of the font');
 assert.equal((chatgpt.match(/data:font\/woff2;base64,/g)??[]).length,1);
 assert.ok(Buffer.byteLength(claude)<=CLAUDE_BYTES,`Claude resource ${Buffer.byteLength(claude)} bytes exceeds ${CLAUDE_BYTES}`);
 assert.ok(claude.includes('/*trialy-widget-font*/'),'the frame names where the widget puts its font');
});

test('L4.2: every static and list response is compressed and cached as it should be',{skip:!existsSync('dist/web/index.html')&&'dist not built (npm run build)'},async()=>{
 const {pg,db}=await setup(),previous=process.env.SIMPLE_APPS_ENABLED;process.env.SIMPLE_APPS_ENABLED='true';
 try{
  const s=new Service(db),human:Actor={userId:randomUUID(),origin:'human'};
  await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[human.userId,human.userId,'h@example.invalid','H']);
  const w=(await s.createWorkspace(human,'Org')).id;await s.setAi(human,w,true);
  const app=baseApp(100000);addPublicAssets(app);
  app.get('/test/events',(_req,res)=>{res.type('text/event-stream');res.write('data: tick\n\n'.repeat(400));res.end();});
  addApi(app,s,(req,_res,next)=>{req.actor=human;next();});
  addMcp(app,s,(req,_res,next)=>{req.actor={...human,origin:'ai',assistant:'chatgpt'} as Actor;next();});
  addWebFallback(app);
  const assets=await readdir('dist/web/assets'),js=assets.find(f=>f.endsWith('.js'))!,css=assets.find(f=>f.endsWith('.css'))!;
  const get=(path:string)=>request(app).get(path).set('Accept-Encoding','br, gzip');
  const year='public, max-age=31536000, immutable';
  const check=async(path:string,cache:RegExp|string|null,encoded:boolean,res?:any)=>{const r=res??await get(path);assert.ok(r.status<300,`${path}: ${r.status}`);
   if(cache===null){/* set by the sign-in middleware in production (no-store) */}else if(typeof cache==='string')assert.equal(r.headers['cache-control'],cache,path);else assert.match(String(r.headers['cache-control']),cache,path);
   assert.equal(r.headers['content-encoding'],encoded?'br':undefined,`${path} content-encoding`);return r;};
  // Static.
  await check('/assets/'+js,/^public, max-age=31536000, immutable$|^public, max-age=31536000$/,true);
  assert.match(String((await get('/assets/'+js)).headers['cache-control']),/immutable/);
  await check('/assets/'+css,/max-age=31536000/,true);
  await check('/','no-cache',true);await check('/apps/x','no-cache',true);
  await check('/start.js',/max-age=0/,true);
  // Unhashed files are revalidated so a release is seen at once (tests/static-assets.test.ts); woff2 is already compressed.
  await check('/fonts/inter-variable.woff2',/max-age=0/,false);
  await check('/trialagents-mark-black-96.png',/max-age=0/,false);
  await check('/frontend/frame?v='+frameVersion(),year,true);await check('/frontend/frame','public, max-age=0, must-revalidate',true);
  if(built){const manifest=JSON.parse(await readFile('dist/widget-parts.json','utf8'));await check('/widget-parts/'+manifest.file,year,true);}
  const t=(await new AppTemplates(undefined,db,'chatgpt').list({limit:1})).templates[0];
  await check(`/template-cards/chatgpt/${t.id}/${t.version}/${t.digest}.jpg`,year,false);
  // Lists: never cached (they depend on who asks), compressed when worth it.
  const home=await check('/api/account/home','no-store',false);assert.match(String(home.headers.vary),/accept-encoding/i);
  await check('/api/app-templates/list','no-store',true,await request(app).post('/api/app-templates/list').set('Accept-Encoding','br').send({limit:50}));
  const mcp=(method:string,params:any={})=>request(app).post('/mcp').set('Accept','application/json, text/event-stream').set('Accept-Encoding','br').set('Authorization','Bearer test').send({jsonrpc:'2.0',id:1,method,params});
  // Signed-in MCP answers are no-store from the bearer check (src/server/auth.ts), which this test replaces.
  await check('tools/list',null,true,await mcp('tools/list'));
  const uri=(await mcp('resources/list')).body.result.resources[0].uri;
  await check('resources/read',null,true,await mcp('resources/read',{uri}));
  await check('signed-out tools/list','no-store',true,await request(app).post('/mcp').set('Accept','application/json, text/event-stream').set('Accept-Encoding','br').send({jsonrpc:'2.0',id:1,method:'tools/list',params:{}}));
  // Event streams reach the client as they are written.
  const events=await get('/test/events');assert.equal(events.headers['content-encoding'],undefined,'event streams are not compressed');
  // A client that asks for nothing compressed gets it uncompressed.
  assert.equal((await request(app).get('/assets/'+js).set('Accept-Encoding','identity')).headers['content-encoding'],undefined);
 }finally{if(previous===undefined)delete process.env.SIMPLE_APPS_ENABLED;else process.env.SIMPLE_APPS_ENABLED=previous;await pg.close();}
});
