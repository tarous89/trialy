import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {Service} from '../src/domain/service.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {syncTemplateCatalog,installCatalogApp} from '../src/workspace/template-catalog.js';
import {runAppCommand} from '../src/workspace/app-commands.js';
import type {Database,Connection} from '../src/db/database.js';
import type {Actor} from '../src/shared/schema.js';

/* Programs 3.0.0 on a disposable database (7.4): installs from the catalog with its helpers, opens on the kit without writing, saves one
 * inline edit directly from a person's change (records.save, the version shown), refuses a stale one, and runs one app command that saves. */
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/\s+/g,' ');
test('installed Programs 3.0.0: open, one direct inline save, a stale edit refused, one saving command',async()=>{
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 try{
  const actor:Actor={userId:randomUUID(),origin:'human'};
  await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'programs-v2@example.invalid','Programs v2 (fictional)']);
  await syncTemplateCatalog(db);
  // 3.0.0 is a draft until the owner approves it; it is approved only inside this disposable database.
  assert.equal((await pg.query<any>("SELECT status FROM app_template_catalog WHERE template_id='life.project-oversight' AND version='3.0.0'")).rows[0].status,'draft');
  await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.project-oversight' AND version='3.0.0'");
  const f=new WorkspaceFoundation(db),s=new Service(db),w=(await s.createWorkspace(actor,'Programs v2 (fictional)')).id;
  const T=await new AppTemplates(undefined,db).read({templateId:'life.project-oversight',version:'3.0.0'});
  const {appId}=await installCatalogApp(f,actor,w,{templateId:T.id,version:T.version,digest:T.digest,name:'Programs',requestKey:randomUUID()});
  const comp=async()=>(await f.readComponent(actor,w,appId)).component;
  const c=await comp(),map=JSON.parse(JSON.parse(/^const templateConfiguration=(.+);\n/.exec(c.source)![1]).tableMap);
  assert.deepEqual(c.execution.map((b:any)=>b.name).sort(),['digest_brief','digest_email'],'helpers installed with the app');
  const save=async(role:string,data:any)=>{const p=await s.preview(actor,w,{kind:'create_record',typeId:map[role].typeId,data});return (await s.commit(actor,p.id,p.digest)).objects[0].id as string;};
  const rows=async(role:string)=>(await pg.query<any>("SELECT id,version,data FROM records WHERE type_id=$1 AND state<>'archived' ORDER BY created_at,id",[map[role].typeId])).rows;
  const run=async(state:any,event:any)=>{const cc=await comp();return f.runFrontend(actor,w,{componentId:cc.id,expectedVersion:cc.version,state,event}) as any;};
  // A fresh install opens on the kit, with the first action and no writes.
  const empty=await run({},{kind:'open',action:'',value:null,form:{}});
  assert.equal(empty.runtime,'trialy-frontend-js-v2');assert.match(empty.html,/class="k-app"/);assert.match(empty.html,/class="k-empty"[\s\S]*data-action="add:programs"/);
  assert.doesNotMatch(empty.html,/<header|<h1|pg-banner/);assert.ok(!empty.saved&&!empty.proposal);
  const p1=await save('programs',{name:'PX-101 (fictional)',stage:'ind_enabling',status:'active',health:'unassessed',archived:false});
  await save('programs.team',{program_id:p1,name:'Ana Ruiz',role:'CMC lead',archived:false});
  const gmp=await save('programs.plan_items',{name:'GMP batch',program_id:p1,item_type:'milestone',function:'cmc',status:'planned',end_date:'2027-01-31',is_key:true,archived:false});
  const plan=await run({screen:'plan'},{kind:'open',action:'',value:null,form:{}});
  assert.match(text(plan.html),/GMP batch/);const item=(await rows('programs.plan_items'))[0];
  assert.ok(plan.html.includes(`data-action="edit:${gmp}:owner:${item.version}"`));
  // One direct save from a person's change: no review, saved at once, the screen made again from the saved data.
  const edited=await run(plan.state,{kind:'change',action:`edit:${gmp}:owner:${item.version}`,value:'Ana Ruiz',form:{}});
  assert.ok(edited.saved,'saved directly');assert.ok(!edited.proposal);
  const after=(await rows('programs.plan_items'))[0];assert.equal(after.data.owner,'Ana Ruiz');assert.equal(after.version,item.version+1);
  // The version shown when editing started is sent: an edit from the older screen is refused, never overwritten.
  await assert.rejects(run(plan.state,{kind:'change',action:`edit:${gmp}:owner:${item.version}`,value:'Ben Ode',form:{}}),/changed|version|stale/i);
  assert.equal((await rows('programs.plan_items'))[0].data.owner,'Ana Ruiz');
  // One app command that saves (the platform's request key keeps a retry from saving twice).
  const cc=await comp();
  const cmd=await runAppCommand(f,actor,w,{appId,expectedVersion:cc.version,command:'item.save',input:{fields:{name:'IND submission',program_id:p1,item_type:'milestone',function:'regulatory',status:'planned',end_date:'2027-03-31',predecessor_id:gmp,is_key:true}},requestKey:randomUUID()});
  assert.equal(cmd.ok,true,(cmd as any).error);assert.ok((cmd as any).saved,'saved directly');
  assert.deepEqual((await rows('programs.plan_items')).map((r:any)=>r.data.name).sort(),['GMP batch','IND submission']);
  const read=await runAppCommand(f,actor,w,{appId,expectedVersion:cc.version,command:'timeline.read',input:{program_id:p1},requestKey:randomUUID()});
  assert.deepEqual(read.result.programs[0].critical_path.items.map((x:any)=>x.name),['GMP batch','IND submission']);
 }finally{await pg.close();}
});
