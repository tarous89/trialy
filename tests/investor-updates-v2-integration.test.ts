import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {AsyncLocalStorage} from 'node:async_hooks';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,setDatabaseContext,databaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {syncTemplateCatalog,installCatalogApp} from '../src/workspace/template-catalog.js';
import {runAppCommand} from '../src/workspace/app-commands.js';
import type {Actor} from '../src/shared/schema.js';

/* Investor Updates 2.0.0 (7.4) on a disposable database with every migration and the runtime role: the draft catalog row approved
 * here (as the owner would, O4), installed by the real catalog installer, opened in the production runtime, one direct save from a
 * person's click (records.save, no review), one inline edit with the shown version, and one app command that saves directly. */
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ');
test('install 2.0.0, open every screen, save directly from a click and an inline edit, and run a write command',async()=>{
 const pg=new PGlite();for(const n of (await readdir('migrations')).filter(x=>x.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+n,'utf8'));await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();
 const db:Database={query:async(q,v)=>storage.getStore()?.query(q,v)??db.transaction(tx=>tx.query(q,v)),transaction:async fn=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async raw=>{await raw.exec(databaseContext().service==='worker'?'SET LOCAL ROLE trialy_worker':'SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(q,v)=>{await setDatabaseContext(raw as any);return raw.query(q,v) as any;}};return storage.run(tx,()=>fn(tx));});},close:()=>pg.close()};
 const raw:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const human:Actor={userId:randomUUID(),origin:'human'};
 await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[human.userId,'anna@northwind.invalid','Anna (fictional)']);
 try{
  await syncTemplateCatalog(raw);
  assert.equal((await pg.query<any>("SELECT status FROM app_template_catalog WHERE template_id='life.investor-updates' AND version='2.0.0'")).rows[0].status,'draft','2.0.0 is imported as a draft (O4)');
  await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.investor-updates' AND version='2.0.0'");
  await withActor(human,async()=>{
   const f=new WorkspaceFoundation(db),s=new Service(db),catalog=new AppTemplates(undefined,db);
   const t=await catalog.read({templateId:'life.investor-updates',version:'2.0.0'});
   const w=(await s.createWorkspace(human,'Board and investors')).id;
   const receipt=await installCatalogApp(f,{...human,actionConfirmed:true} as any,w,{templateId:t.id,version:t.version,digest:t.digest,name:'Investor Updates',requestKey:randomUUID(),createNew:true});
   const comp=async()=>(await f.readComponent(human,w,receipt.appId)).component;
   const map=JSON.parse(JSON.parse(/^const templateConfiguration=(.+);\n/.exec((await comp()).source)![1]).tableMap),TY=(r:string)=>map[r].typeId;
   const rows=async(r:string)=>(await pg.query<any>("SELECT id,version,data FROM records WHERE type_id=$1 AND state<>'archived' ORDER BY created_at,id",[TY(r)])).rows;
   let state:any={};const ev=async(event:any)=>{const c=await comp();const out:any=await f.runFrontend(human,w,{componentId:c.id,expectedVersion:c.version,state,event:{value:null,form:{},...event}});state=out.state;return out;};
   // A first open writes nothing and offers the first action on the empty Overview.
   const first=await ev({kind:'open',action:''});assert.equal(first.runtime,'trialy-frontend-js-v2');assert.match(first.html,/class="k-empty".*data-action="setup-standard"/);assert.doesNotMatch(first.html,/<header|<h1/);
   assert.equal(first.proposal,null);for(const r of ['investorupdates.categories','investorupdates.templates'])assert.equal((await rows(r)).length,0);
   // One click saves directly: no review, the screen is made again from the saved data.
   const setup=await ev({kind:'click',action:'setup-standard'});assert.equal(setup.proposal??null,null,'no review for record changes');assert.ok(setup.saved,'saved directly');
   assert.equal((await rows('investorupdates.categories')).length,3);assert.equal((await rows('investorupdates.templates')).length,5);assert.equal((await rows('investorupdates.settings')).length,1);
   for(const section of ['overview','updates','investors','plans','settings']){const out=await ev({kind:'click',action:'nav:'+section});assert.doesNotMatch(text(out.html),/could not be shown/,section);assert.ok(!out.notice||out.notice.kind!=='error',section+': '+JSON.stringify(out.notice));}
   // An inline edit with the version shown on screen.
   await ev({kind:'click',action:'nav:investors'});const cats=await ev({kind:'click',action:'sub:categories'});
   const board=(await rows('investorupdates.categories')).find((c:any)=>c.data.kind==='board');const act='edit:'+board.id+':categories__name:'+board.version;assert.ok(cats.html.includes('data-action="'+act+'"'));
   const edited=await ev({kind:'change',action:act,value:'Board of directors'});assert.ok(edited.saved);assert.equal((await rows('investorupdates.categories')).find((c:any)=>c.id===board.id).data.name,'Board of directors');
   const stale=await ev({kind:'change',action:act,value:'Board again'}).catch((e:any)=>e);assert.ok(stale instanceof Error,'the old version is a conflict, never an overwrite');
   // A write command saves directly with its request key.
   const c=await comp();const cmd=await runAppCommand(f,human,w,{appId:c.id,expectedVersion:c.version,command:'meeting.create',input:{title:'December board meeting',meeting_date:'2026-12-10',category_ids:[board.id]},requestKey:randomUUID()});
   assert.equal(cmd.ok,true,cmd.error);const ms=await rows('investorupdates.meetings');assert.equal(ms.length,1);assert.equal(ms[0].data.title,'December board meeting');
  });
 }finally{await pg.close();}
});
