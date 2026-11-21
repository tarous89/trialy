import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {Service} from '../src/domain/service.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {syncTemplateCatalog,installCatalogApp} from '../src/workspace/template-catalog.js';
import {dataAccessStep,confirmDataAccess} from '../src/workspace/data-access.js';
import {runAppCommand} from '../src/workspace/app-commands.js';
import type {Database,Connection} from '../src/db/database.js';
import type {Actor} from '../src/shared/schema.js';

/* Runway 3.0.0 (7.3/7.4) on the real installer and runtime: install, open, one direct save from a person's edit, one command. */
delete process.env.APP_COMMANDS_ENABLED;
test('installed Runway 3.0.0 opens empty with its first action, saves an edit directly and runs a write command',async()=>{
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 try{
  const actor:Actor={userId:randomUUID(),origin:'human'};
  await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'owner@example.invalid','Owner']);
  const f=new WorkspaceFoundation(db),s=new Service(db);
  await syncTemplateCatalog(db);
  // 3.0.0 is a draft until the owner approves it (O4); it is approved only inside this test database.
  assert.equal((await pg.query<any>("SELECT status FROM app_template_catalog WHERE template_id='life.cash-runway' AND version='3.0.0'")).rows[0].status,'draft');
  await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.cash-runway' AND version='3.0.0'");
  const t=await new AppTemplates(undefined,db).read({templateId:'life.cash-runway',version:'3.0.0'});
  const w=(await s.createWorkspace(actor,'Runway 3')).id;
  const target={install:{templateId:t.id,version:t.version,digest:t.digest,name:'Runway',requestKey:randomUUID()}};
  const step=await dataAccessStep(f,actor,w,target);
  const installed:any=step.needed?await confirmDataAccess(f,actor,w,{...target,connections:{},stepDigest:step.digest}):await installCatalogApp(f,actor,w,target.install);
  const c=(await f.readComponent(actor,w,installed.appId)).component;
  assert.equal((await db.query('SELECT count(*)::int n FROM records WHERE workspace_id=$1',[w])).rows[0].n,0,'nothing is seeded');
  const run=(state:any,event:any)=>f.runFrontend(actor,w,{componentId:c.id,expectedVersion:c.version,state,event});
  const opened:any=await run(null,{kind:'open',action:'',value:null,form:{}});
  assert.equal(opened.runtime,'trialy-frontend-js-v2');assert.match(opened.html,/Set up your first runway/);assert.match(opened.html,/data-action="setup"/);assert.doesNotMatch(opened.html,/<header|<h1/);
  // Set up through the panel: one direct save, no review.
  const panel:any=await run(opened.state,{kind:'click',action:'setup',value:null,form:{}});
  const setup:any=await run(panel.state,{kind:'submit',action:'panel:save',value:null,form:{reporting_currency:'EUR',opening_balance:'600000',opening_date:'2026-10-31',runway_target_months:'18',trailing_window_months:'3'}});
  assert.ok(setup.saved,'saved directly');assert.equal(setup.proposal,null);
  const map=JSON.parse(JSON.parse(/^const templateConfiguration=(.+);\n/.exec(c.source)![1]).tableMap);
  const settings=(await s.records(actor,w,map['runway.settings'].typeId,{limit:5,offset:0})).rows;assert.equal(settings.length,1);assert.equal(settings[0].data.opening_balance,600000);
  // A write command saves directly with the same checks.
  const line:any=await runAppCommand(f,actor,w,{appId:c.id,expectedVersion:c.version,command:'line.save',input:{fields:{name:'Burn',direction:'spend',category:'G&A',driver:'monthly',amount:50000,currency:'EUR',start_month:'2026-11',status:'committed'}},requestKey:randomUUID()});
  assert.equal(line.ok,true,line.error);assert.ok(line.saved);
  const sum:any=await runAppCommand(f,actor,w,{appId:c.id,expectedVersion:c.version,command:'summary.read',input:{},requestKey:randomUUID()});
  assert.equal(sum.result.runway.months,12);
  // An inline edit of the line where it is shown saves at once with its version.
  const lines=(await s.records(actor,w,map['runway.plan_lines'].typeId,{limit:5,offset:0})).rows,l=lines[0];
  const plan:any=await run(null,{kind:'click',action:'nav:plan',value:null,form:{}});
  assert.match(plan.html,new RegExp('edit:'+l.id+':amount:'+l.version));
  const edit:any=await run(plan.state,{kind:'change',action:'edit:'+l.id+':amount:'+l.version,value:'60000',form:{}});
  assert.ok(edit.saved);assert.equal(edit.notice?.kind,'success');
  assert.equal((await s.records(actor,w,map['runway.plan_lines'].typeId,{limit:5,offset:0})).rows[0].data.amount,60000);
  assert.match((await run(edit.state,{kind:'click',action:'nav:overview',value:null,form:{}})).html,/Cash lasts until/);
 }finally{await pg.close();}
});
