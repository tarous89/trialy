import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {AsyncLocalStorage} from 'node:async_hooks';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,withDatabaseContext,setDatabaseContext,databaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {syncTemplateCatalog} from '../src/workspace/template-catalog.js';
import {dataAccessStep,confirmDataAccess} from '../src/workspace/data-access.js';
import {reconcileRecipeSetups,prepareAppRecipe,confirmAppRecipe} from '../src/automations/recipes.js';
import {Foundation} from '../src/foundation/service.js';
import {runFoundation} from '../src/foundation/worker.js';
import {AppActions} from '../src/app-services/service.js';
import {dispatchNotificationBatch} from '../src/app-services/notifications.js';
import type {Actor} from '../src/shared/schema.js';

/* Contracts 1.1.0 weekly "actions needed" email on the real platform, with restricted database roles:
 * offered switched on at install, Needs setup until its read-only summary function is bound, then one plain email listing what needs action. */
test('Contracts 1.1.0: the actions-needed email installs on, needs its summary binding, then sends the deterministic list',async()=>{
 process.env.APP_AUTOMATION_RECIPES_ENABLED='true';
 const pg=new PGlite();for(const name of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+name,'utf8'));
 await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();
 const db:Database={query:async(s,v)=>{const tx=storage.getStore();return tx?tx.query(s,v):db.transaction(t=>t.query(s,v));},transaction:async fn=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async raw=>{await raw.exec(databaseContext().service==='worker'?'SET LOCAL ROLE trialy_worker':'SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(s,v)=>{await setDatabaseContext(raw as any);return raw.query(s,v) as any;}};return storage.run(tx,()=>fn(tx));});},close:()=>pg.close()};
 const a:Actor={userId:randomUUID(),origin:'human'};
 await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'owner@example.invalid','Owner (fictional)']);
 const worker=<T>(fn:()=>T)=>withDatabaseContext({service:'worker'},fn);
 // Catalog import is an operator step (migration connection); 1.1.0 is approved only inside this disposable database.
 await syncTemplateCatalog({query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}});
 await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.contracts' AND version='1.1.0'");
 try{await withActor(a,async()=>{
  const f=new WorkspaceFoundation(db),s=new Service(db),w=(await s.createWorkspace(a,'Contracts email')).id;await s.setAi(a,w,true);
  const C=await new AppTemplates(undefined,db).read({templateId:'life.contracts',version:'1.1.0'});
  const target={install:{templateId:C.id,version:C.version,digest:C.digest,name:'Contracts',requestKey:randomUUID()}};
  const step=await dataAccessStep(f,a,w,target);
  assert.deepEqual(step.automations.map((r:any)=>r.key),['contract_actions'],'one install recommendation, shown in the Add app dialog');
  const receipt=await confirmDataAccess(f,a,w,{...target,connections:{},access:[],automations:[{key:'contract_actions',enabled:true,settings:{}}],stepDigest:step.digest});
  for(let i=0;i<3;i++)await worker(()=>reconcileRecipeSetups(db));
  const setup=(await pg.query<any>('SELECT status,diagnostic FROM automation_recipe_setups WHERE app_id=$1',[receipt.appId])).rows;
  assert.equal(setup.length,1);assert.equal(setup[0].status,'needs_setup','no function can be attached at install');
  let app=(await f.readComponent(a,w,receipt.appId)).component;assert.equal(app.name,'Contracts','the app is saved and usable');

  // Fictional records: one agreement out for signature, one active agreement with a notice deadline in 30 days.
  const map=JSON.parse(JSON.parse(/^const templateConfiguration=(.+);\n/.exec(app.source)![1]).tableMap);
  const save=async(role:string,data:any)=>{const p=await s.preview(a,w,{kind:'create_record',typeId:map[role].typeId,data});return (await s.commit(a,p.id,p.digest)).objects[0].id as string;};
  const org=await save('organizations',{name:'Northwind Bio'});
  const pending=await save('agreements',{name:'Mutual CDA — Northwind Bio',agreement_type:'cda_nda',counterparty_id:org,status:'out_for_signature'});
  const today=new Date().toISOString().slice(0,10),plus=(n:number)=>new Date(Date.parse(today)+n*86400000).toISOString().slice(0,10);
  const active=await save('agreements',{name:'Data processing agreement — Brightwater',status:'active',agreement_type:'data_processing',expiry_date:plus(40)});
  await save('contracts.terms',{agreement_id:pending,status_since:plus(-5),extraction_status:'none'});
  await save('contracts.terms',{agreement_id:active,renewal:'automatic',notice_days:30,extraction_status:'verified'});

  // Setup as the instructions describe: fill the table map, prepare the read-only function, bind it, then set up the automation.
  const body=C.instructions.slice(C.instructions.indexOf('const TABLE_MAP=__TABLE_MAP__;')).replace('__TABLE_MAP__',JSON.stringify(map));
  const typeIds=['agreements','organizations','contracts.settings','contracts.terms','contracts.obligations'].map(r=>map[r].typeId);
  const foundation=new Foundation(db),p=await foundation.prepareFunction(a,w,{name:'Contracts actions summary',source:body,scope:{capabilities:['records.read'],typeIds,documents:false},inputContract:{type:'object'},outputContract:{type:'object',required:['nonEmpty','text']}});
  const fn=await foundation.saveFunction(a,w,p.id,p.digest);
  const {id,version,...content}=app as any;
  const rev=await f.preview(a,w,{kind:'save_component',componentId:receipt.appId,expectedVersion:app.version,projectId:app.project_id??null,content:{name:app.name,format:app.format,source:app.source,bindings:app.bindings,manifest:app.manifest,sourceAccess:app.source_access??app.sourceAccess,assets:app.assets??[],execution:[...(app.execution??[]),{name:'actions_summary',revisionId:fn.revisionId}]}} as any);
  await f.confirm(a,w,rev.id,rev.digest);app=(await f.readComponent(a,w,receipt.appId)).component;
  assert.ok(app.execution.some((x:any)=>x.name==='actions_summary'));
  const review=await prepareAppRecipe(db,a,w,{appId:receipt.appId,key:'contract_actions'});assert.equal(review.body.summary?.binding,'actions_summary');
  await confirmAppRecipe(db,a,w,review.id,review.digest);
  for(let i=0;i<3;i++)await worker(()=>reconcileRecipeSetups(db));
  const live=(await pg.query<any>('SELECT status,definition_id FROM automation_recipe_setups WHERE app_id=$1',[receipt.appId])).rows[0];assert.equal(live.status,'active');

  // A run: the email text is the summary's list, plain and deterministic.
  const actions=new AppActions(db),batch=await actions.runNow(a,w,live.definition_id,randomUUID());
  const tick=async()=>{await pg.query('UPDATE app_notification_batches SET not_before=now() WHERE id=$1',[batch.id]);await worker(()=>dispatchNotificationBatch(db));};
  await tick();await worker(()=>runFoundation(db));await tick();
  const jobs=(await pg.query<any>('SELECT payload FROM app_service_jobs WHERE app_id=$1',[receipt.appId])).rows;assert.equal(jobs.length,1);
  const msg=jobs[0].payload.message;assert.equal(msg.subject,'Contracts: 2 actions needed');
  assert.match(msg.text,/Deadlines \(1\)\n- Data processing agreement — Brightwater: notice deadline/);
  assert.match(msg.text,/Waiting for signature \(1\)\n- Mutual CDA — Northwind Bio: Out for signature, since .* \(5 days\)/);
  assert.doesNotMatch(msg.text,/To check/);
 });}finally{await pg.close();delete process.env.APP_AUTOMATION_RECIPES_ENABLED;}
});
