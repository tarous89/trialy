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
import {readIntegration,chooseIntegrationSource} from '../src/workspace/integrations.js';
import {listAppCommands,runAppCommand,resolveAppOpen} from '../src/workspace/app-commands.js';
import type {Database,Connection} from '../src/db/database.js';
import type {Actor} from '../src/shared/schema.js';

/* Runway 2.2.0 on the real installer, runtime and review path: app commands, integrations and recommended automations. */
process.env.APP_COMMANDS_ENABLED='true';
async function setup(){
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const actor:Actor={userId:randomUUID(),origin:'human'};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'owner@example.invalid','Owner']);
 const f=new WorkspaceFoundation(db),s=new Service(db);
 await syncTemplateCatalog(db);
 // 2.2.0 and Programs 2.1.0 are drafts; they are approved only inside this test database.
 await pg.query("UPDATE app_template_catalog SET status='approved' WHERE (template_id='life.cash-runway' AND version='2.2.0') OR (template_id='life.project-oversight' AND version='2.1.0')");
 const catalog=new AppTemplates(undefined,db);
 const R=await catalog.read({templateId:'life.cash-runway',version:'2.2.0'}),P=await catalog.read({templateId:'life.project-oversight',version:'2.1.0'});
 const install=async(w:string,t:any,name:string)=>{const target={install:{templateId:t.id,version:t.version,digest:t.digest,name,requestKey:randomUUID()}};const step=await dataAccessStep(f,actor,w,target);return step.needed?confirmDataAccess(f,actor,w,{...target,connections:{},stepDigest:step.digest}):installCatalogApp(f,actor,w,target.install);};
 const comp=async(w:string,id:string)=>(await f.readComponent(actor,w,id)).component;
 const mapOf=(c:any)=>JSON.parse(JSON.parse(/^const templateConfiguration=(.+);\n/.exec(c.source)![1]).tableMap);
 const save=async(w:string,typeId:string,data:any)=>{const p=await s.preview(actor,w,{kind:'create_record',typeId,data});return (await s.commit(actor,p.id,p.digest)).objects[0].id as string;};
 return {pg,db,f,s,actor,R,P,install,comp,mapOf,save};
}

test('installed Runway 2.2.0: tables, roles, recommended automations, and commands through the real review path',async()=>{
 const x=await setup();const {f,actor,pg}=x;
 try{
  const w=(await x.s.createWorkspace(actor,'Runway 2.2')).id;
  const r=await x.install(w,x.R,'Runway');const c=await x.comp(w,r.appId),map=x.mapOf(c);
  assert.deepEqual(Object.keys(map).sort(),['agreements','contracts.obligations','croselection.awards','fundraise.tranches','organizations','programs','programs.plan_items','runway.actuals','runway.budgets','runway.fx_rates','runway.month_closes','runway.plan_lines','runway.positions','runway.scenarios','runway.settings'].sort());
  assert.ok(!map['runway.milestones']&&!map['runway.scenario_changes'],'new installs create no legacy tables');
  assert.deepEqual(c.manifest.recommendedAutomations.map((a:any)=>a.key),['runway_below_target','month_close_reminder','monthly_fx_rates','monthly_runway_digest']);
  const fx=c.manifest.recommendedAutomations.find((a:any)=>a.key==='monthly_fx_rates');
  assert.deepEqual(fx.research.writeBindings,[{role:'runway.fx_rates',fields:['month','currency','rate_per_eur','source','source_ref'],allowCreate:true,allowUpdate:false}],'create-only result storage for rates');
  assert.ok(c.manifest.roles.filter((r:any)=>r.integration).map((r:any)=>r.role).sort().join()==='contracts.obligations,croselection.awards,fundraise.tranches,programs.plan_items');
  // Commands: listed, run, and confirmed only through the ordinary review.
  const list=await listAppCommands(f,actor,w,{appId:c.id});assert.equal(list.commands.length,37);
  const settings=await runAppCommand(f,actor,w,{appId:c.id,expectedVersion:c.version,command:'settings.save',input:{fields:{reporting_currency:'EUR',opening_balance:500000,opening_date:'2026-10-31',runway_target_months:18,trailing_window_months:3,loaded_cost_pct:0,min_cash_reserve:0,enabled_currencies:'EUR',categories:''}},requestKey:randomUUID()});
  assert.equal(settings.ok,true,settings.error);assert.ok(settings.proposal);
  await f.confirm(actor,w,settings.proposal!.previewId,settings.proposal!.digest);
  const line=await runAppCommand(f,actor,w,{appId:c.id,expectedVersion:c.version,command:'line.save',input:{fields:{name:'Burn',direction:'spend',category:'G&A',driver:'monthly',amount:50000,currency:'EUR',start_month:'2026-11',status:'committed'}},requestKey:randomUUID()});
  assert.equal(line.ok,true,line.error);await f.confirm(actor,w,line.proposal!.previewId,line.proposal!.digest);
  const sum=await runAppCommand(f,actor,w,{appId:c.id,expectedVersion:c.version,command:'summary.read',input:{},requestKey:randomUUID()});
  assert.equal(sum.result.runway.months,10);assert.equal(sum.result.runway.cash_out,'2027-09');
  // An assistant runs the same commands; its proposals still need the person's confirmation.
  const ai={...actor,origin:'ai' as const};
  const ms=await runAppCommand(f,ai,w,{appId:c.id,expectedVersion:c.version,command:'milestone.save',input:{fields:{name:'IND filing',end_date:'2027-03'}},requestKey:randomUUID()});
  assert.equal(ms.ok,true,ms.error);assert.equal((await pg.query<any>('SELECT count(*)::int n FROM records WHERE type_id=$1',[map['programs.plan_items'].typeId])).rows[0].n,0);
  await f.confirm(actor,w,ms.proposal!.previewId,ms.proposal!.digest);
  const after=await runAppCommand(f,ai,w,{appId:c.id,expectedVersion:c.version,command:'summary.read',input:{},requestKey:randomUUID()});
  assert.deepEqual(after.result.milestones.map((m:any)=>[m.name,m.month]),[['IND filing','2027-03']]);
  // Layout through a command is a presentation-only review of the same app.
  const lay=await runAppCommand(f,ai,w,{appId:c.id,expectedVersion:c.version,command:'layout.save',input:{labels:{'line_form:name':'Line name'}},requestKey:randomUUID()});
  assert.equal(lay.ok,true,lay.error);assert.ok(lay.proposal);
 }finally{await pg.close();}
});

test('Programs linked inside Runway: milestones are read only, labelled with Programs and opened there',async()=>{
 const x=await setup();const {f,actor,pg}=x;
 try{
  const w=(await x.s.createWorkspace(actor,'Linked')).id;
  const r=await x.install(w,x.R,'Runway');const p=await x.install(w,x.P,'Programs');
  const pmap=x.mapOf(await x.comp(w,p.appId)),rc0=await x.comp(w,r.appId),rmap=x.mapOf(rc0);
  const prog=await x.save(w,rmap.programs.typeId,{name:'TX-1',stage:'phase_1',status:'active',archived:false});
  const item=await x.save(w,pmap['programs.plan_items'].typeId,{name:'IND filing',program_id:prog,item_type:'milestone',function:'regulatory',end_date:'2027-06-20',status:'planned',is_key:true,archived:false});
  const dialog=await readIntegration(f,actor,w,{appId:r.appId,role:'programs.plan_items'});
  assert.deepEqual(dialog.providers.map((q:any)=>q.appName),['Programs']);
  await chooseIntegrationSource(f,actor,w,{appId:r.appId,expectedVersion:dialog.version,role:'programs.plan_items',source:pmap['programs.plan_items'].typeId});
  const rc=await x.comp(w,r.appId);
  const out=await f.runFrontend(actor,w,{componentId:rc.id,expectedVersion:rc.version,state:{section:'plan',planTab:'milestones'},event:{kind:'open'}});
  assert.match(out.html,/From Programs\. Read only here; make changes in Programs\./);
  assert.match(out.html,new RegExp('data-trialy-open="programs\\.plan_items '+item+'"'));
  const open=await resolveAppOpen(f,actor,w,{appId:rc.id,role:'programs.plan_items',recordId:item});
  assert.equal(open.kind,'app');assert.match(open.href,new RegExp('^/apps/'+p.appId));
  // The command path refuses before the server; a direct proposal from Runway names the writer.
  const cmd=await runAppCommand(f,actor,w,{appId:rc.id,expectedVersion:rc.version,command:'milestone.save',input:{id:item,fields:{name:'Moved'}},requestKey:randomUUID()});
  assert.equal(cmd.ok,false);
  const refused=await f.preview(actor,w,{kind:'apply_component_records',componentId:rc.id,expectedVersion:rc.version,changes:[{kind:'update_record',recordId:item,expectedVersion:0,data:{name:'Moved'}}]}).catch(e=>e);
  assert.equal(refused.code,'role_read_only');assert.equal(refused.details.writerAppName,'Programs');
  // Key milestones from Programs reach Runway's cash-at-milestone, read only.
  const sum=await runAppCommand(f,actor,w,{appId:rc.id,expectedVersion:rc.version,command:'summary.read',input:{},requestKey:randomUUID()});
  assert.equal(sum.ok,true);
 }finally{await pg.close();}
});
