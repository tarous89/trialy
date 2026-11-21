import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {fundraiseFixture} from './fixtures/fundraise.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {Service} from '../src/domain/service.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {syncTemplateCatalog,installCatalogApp} from '../src/workspace/template-catalog.js';
import type {Database,Connection} from '../src/db/database.js';
import type {Actor} from '../src/shared/schema.js';

/* 7.3, 7.4: Fundraise 3.0.0 installed and run on a disposable database. 3.0.0 is a draft until the owner approves it (O4),
 * so it is approved only inside this database. */
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ');

test('Fundraise 3.0.0 installs from the catalog, opens on its first action and saves a new round directly',async()=>{
 const pg=new PGlite();
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
  const actor:Actor={userId:randomUUID(),origin:'human'};
  await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'owner@example.invalid','Owner']);
  const f=new WorkspaceFoundation(db),s=new Service(db);
  await syncTemplateCatalog(db);
  assert.equal((await pg.query<any>("SELECT status FROM app_template_catalog WHERE template_id='life.investor-crm' AND version='3.0.0'")).rows[0]?.status,'draft','imported as a draft');
  await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.investor-crm' AND version='3.0.0'");
  const t=await new AppTemplates(undefined,db).read({templateId:'life.investor-crm',version:'3.0.0'});
  const w=(await s.createWorkspace(actor,'Fundraise 3')).id;
  const receipt=await installCatalogApp(f,actor,w,{templateId:t.id,version:t.version,digest:t.digest,name:'Fundraise',requestKey:randomUUID()});
  const comp=async()=>(await f.readComponent(actor,w,receipt.appId)).component;
  const c=await comp();
  const map=JSON.parse(JSON.parse(/^const templateConfiguration=(.+);\n/.exec(c.source)![1]).tableMap);
  assert.equal(Object.keys(map).length,12,'the same twelve roles as 2.0.1');
  const opened=await f.runFrontend(actor,w,{componentId:c.id,expectedVersion:c.version,event:{kind:'open'}});
  assert.equal(opened.runtime,'trialy-frontend-js-v2');assert.doesNotMatch(opened.html,/<header|<h1/);
  assert.match(opened.html,/class="k-empty"/);assert.match(opened.html,/data-action="add:rounds"/);assert.match(opened.html,/data-action="nav:settings"/,'the installer is the owner');
  const panel=await f.runFrontend(actor,w,{componentId:c.id,expectedVersion:c.version,viewId:opened.viewId,state:opened.state,event:{kind:'click',action:'add:rounds'}});
  assert.match(panel.html,/data-action="create:rounds"/);
  const saved=await f.runFrontend(actor,w,{componentId:c.id,expectedVersion:c.version,viewId:opened.viewId,state:panel.state,event:{kind:'submit',action:'create:rounds',form:{name:'Seed 2027',round_type:'seed',target_amount:'12000000',currency:'EUR',status:'active'}}});
  assert.ok(saved.saved,'saved directly, without a review');assert.equal(saved.proposal,null);
  const rounds=(await s.records(actor,w,map['fundraise.rounds'].typeId,{limit:10,offset:0})).rows;
  assert.deepEqual(rounds.map((r:any)=>[r.data.name,r.data.target_amount,r.data.currency,r.data.archived]),[['Seed 2027',12000000,'EUR',false]]);
  assert.match(text(saved.html),/Raised EUR 0 of EUR 12,000,000 \(0%\)/,'the screen is made again from the saved data');
 }finally{await pg.close();}
});

test('installed Fundraise 3.0.0 with data: inline edit, board move and Undo save directly; a stale version is refused',async()=>{
 const x=await fundraiseFixture({version:'3.0.0'});const {f,s,w,actor,component,map}=x;
 try{
  const run=(viewId:string|undefined,state:any,event:any)=>f.runFrontend(actor,w.id,{componentId:component.id,expectedVersion:component.version,...(viewId?{viewId}:{}),state,event});
  const rows=async(role:string)=>(await s.records(actor,w.id,map[role].typeId,{limit:200,offset:0})).rows;
  const opened=await run(undefined,null,{kind:'open'});
  assert.match(text(opened.html),/Raised EUR 5,000,000 of EUR 15,000,000 \(33\.3%\)/);
  const org=(await rows('organizations')).find((r:any)=>r.data.name==='Fjordhaven Partners')!;
  const opp=(await rows('fundraise.opportunities')).find((r:any)=>r.data.organization_id===org.id)!;
  // One direct save: an inline value, with the version shown.
  const edit=await run(opened.viewId,opened.state,{kind:'change',action:`edit:${opp.id}:next_step:${opp.version}`,value:'Send the updated deck'});
  assert.ok(edit.saved);assert.equal(edit.proposal,null);
  let now=(await rows('fundraise.opportunities')).find((r:any)=>r.id===opp.id)!;assert.equal(now.data.next_step,'Send the updated deck');
  assert.match(edit.html,/data-action="undo:[0-9a-f-]+"/,'the screen made again after the save offers Undo');
  // A board move saves the stage.
  const board=await run(opened.viewId,edit.state,{kind:'click',action:'nav:pipeline'});
  const moved=await run(opened.viewId,board.state,{kind:'change',action:'move',value:`${opp.id}~${now.version}>partner_meeting`});
  assert.ok(moved.saved);now=(await rows('fundraise.opportunities')).find((r:any)=>r.id===opp.id)!;assert.equal(now.data.stage,'partner_meeting');
  // Undo reverses the person's own last action.
  const undoId=/data-action="undo:([0-9a-f-]+)"/.exec(moved.html)![1];
  const undone=await run(opened.viewId,moved.state,{kind:'click',action:'undo:'+undoId});
  assert.equal(undone.notice?.kind,'success',JSON.stringify(undone.notice));
  now=(await rows('fundraise.opportunities')).find((r:any)=>r.id===opp.id)!;assert.equal(now.data.stage,'first_meeting');
  // A value someone changed after it was drawn is refused, never overwritten.
  await x.save({kind:'update_record',recordId:opp.id,expectedVersion:now.version,data:{next_step:'Concurrent edit'}});
  await assert.rejects(run(opened.viewId,undone.state,{kind:'change',action:`edit:${opp.id}:next_step:${now.version}`,value:'Stale edit'}),/changed|version|stale/i);
  assert.equal((await rows('fundraise.opportunities')).find((r:any)=>r.id===opp.id)!.data.next_step,'Concurrent edit');
 }finally{await x.pg.close();}
});
