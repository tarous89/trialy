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
import {appIntegrations,readIntegration,chooseIntegrationSource} from '../src/workspace/integrations.js';
import type {Database,Connection} from '../src/db/database.js';
import type {Actor} from '../src/shared/schema.js';

/* Modular apps §7, in-app integrations: Programs 2.1.0 keeps its own cash forecast (manual entry), suggests Runway subtly,
 * and once Runway is in the workspace lets the user choose one source, used from then on. Nothing is merged. */
async function setup(){
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const actor:Actor={userId:randomUUID(),origin:'human'};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'owner@example.invalid','Owner']);
 const f=new WorkspaceFoundation(db),s=new Service(db);
 await syncTemplateCatalog(db);
 // 2.1.0 is a draft in the catalog; it is approved only inside this test database.
 await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.project-oversight' AND version='2.1.0'");
 const catalog=new AppTemplates(undefined,db);
 const P=await catalog.read({templateId:'life.project-oversight',version:'2.1.0'}),R=await catalog.read({templateId:'life.cash-runway',version:'2.1.0'});
 const install=async(w:string,t:any,name:string,connections:Record<string,string>={})=>{
  const target={install:{templateId:t.id,version:t.version,digest:t.digest,name,requestKey:randomUUID()}};
  const step=await dataAccessStep(f,actor,w,target);
  return {step,receipt:step.needed?await confirmDataAccess(f,actor,w,{...target,connections,stepDigest:step.digest}):await installCatalogApp(f,actor,w,target.install)};
 };
 const comp=async(w:string,id:string)=>(await f.readComponent(actor,w,id)).component;
 const mapOf=(c:any)=>JSON.parse(JSON.parse(/^const templateConfiguration=(.+);\n/.exec(c.source)![1]).tableMap);
 const save=async(w:string,typeId:string,data:any)=>{const p=await s.preview(actor,w,{kind:'create_record',typeId,data});return (await s.commit(actor,p.id,p.digest)).objects[0].id as string;};
 const open=async(w:string,id:string,state:any={})=>{const c=await comp(w,id);return f.runFrontend(actor,w,{componentId:c.id,expectedVersion:c.version,state,event:{kind:'open'}});};
 const offer=async(w:string,id:string)=>(await appIntegrations(db,actor,w,await comp(w,id))).find((x:any)=>x.role==='runway.month_closes');
 const count=async(typeId:string)=>(await pg.query<any>("SELECT count(*)::int n FROM records WHERE type_id=$1 AND state<>'archived'",[typeId])).rows[0].n as number;
 return {pg,db,f,s,actor,P,R,install,comp,mapOf,save,open,offer,count};
}
async function milestone(x:any,w:string,map:any){
 const prog=await x.save(w,map.programs.typeId,{name:'TX-1',stage:'phase_1',status:'active',archived:false});
 await x.save(w,map['programs.plan_items'].typeId,{name:'IND filing',program_id:prog,item_type:'milestone',function:'regulatory',end_date:'2027-06-20',status:'planned',is_key:true,archived:false});
}

test('manual entry first, a subtle offer to add Runway, then the user chooses Runway as the source and it is used from then on',async()=>{
 const x=await setup();const {f,s,actor,P,R}=x;
 try{
  const w=(await s.createWorkspace(actor,'Programs then Runway')).id;
  const p=await x.install(w,P,'Programs');assert.deepEqual(p.step.tables,[]);
  const map=x.mapOf(await x.comp(w,p.receipt.appId)),own=map['runway.month_closes'].typeId;
  assert.ok(own,'Programs gets its own cash forecast table');assert.ok(map['runway.month_closes'].writableFields.includes('closing_balance'));
  assert.deepEqual(await x.offer(w,p.receipt.appId),{role:'runway.month_closes',name:'Runway month closes',source:'own',chosen:false,provider:'Runway',offer:'install'});
  await milestone(x,w,map);
  // Manual cash forecast: 1,000,000 falling 30,000 a month from Dec 2026; Jun 2027 = 790,000; first negative month Sep 2029.
  for(let i=0;i<34;i++){const d=new Date(Date.UTC(2026,11+i,1));await x.save(w,own,{month:d.toISOString().slice(0,10),closing_balance:1000000-30000*(i+1)+(i===33?-100000:0),currency:'EUR'});}
  const manual=(await x.open(w,p.receipt.appId,{section:'timeline'})).html;
  assert.match(manual,/IND filing<\/strong>.*EUR 790k/);assert.match(manual,/Works with Runway\. <button[^>]*data-trialy-integration="install runway\.month_closes"[^>]*>Add Runway<\/button>/);
  assert.match((await x.open(w,p.receipt.appId,{section:'settings'})).html,/<h2>Cash forecast<\/h2>/);
  // Adding Runway (it can connect Programs' programs table) does not change Programs; the offer becomes "connect".
  const r=await x.install(w,R,'Runway');const rmap=x.mapOf(await x.comp(w,r.receipt.appId));
  assert.equal(x.mapOf(await x.comp(w,p.receipt.appId))['runway.month_closes'].typeId,own);
  assert.equal((await x.offer(w,p.receipt.appId)).offer,'connect');
  assert.match((await x.open(w,p.receipt.appId,{section:'timeline'})).html,/data-trialy-integration="connect runway\.month_closes"[^>]*>Use its cash data/);
  // The dialog shows both sources side by side.
  const both=await readIntegration(f,actor,w,{appId:p.receipt.appId,role:'runway.month_closes'});
  assert.equal(both.own!.records,34);assert.ok(both.own!.recent.length>0);
  assert.deepEqual(both.providers.map((q:any)=>[q.appName,q.typeId,q.records]),[['Runway',rmap['runway.month_closes'].typeId,0]]);
  // Assistants cannot choose; the user's choice is one reviewed app save.
  await assert.rejects(chooseIntegrationSource(f,{...actor,origin:'ai'},w,{appId:p.receipt.appId,expectedVersion:both.version,role:'runway.month_closes',source:rmap['runway.month_closes'].typeId}),/cannot approve its own changes/);
  await chooseIntegrationSource(f,actor,w,{appId:p.receipt.appId,expectedVersion:both.version,role:'runway.month_closes',source:rmap['runway.month_closes'].typeId});
  const after=await x.comp(w,p.receipt.appId),amap=x.mapOf(after);
  assert.equal(amap['runway.month_closes'].typeId,rmap['runway.month_closes'].typeId);assert.deepEqual(amap['runway.month_closes'].writableFields,[]);
  assert.ok(after.manifest.fields.filter((m:any)=>m.typeId===rmap['runway.month_closes'].typeId).every((m:any)=>m.mode==='read'));
  assert.ok(!after.bindings.some((b:any)=>b.typeId===own),'the own table is no longer used by Programs');
  assert.equal(await x.count(own),34,'manual entries stay in Database; nothing is copied or merged');
  assert.equal((await x.offer(w,p.receipt.appId)).offer,null,'the decided source is not suggested again');
  await assert.rejects(chooseIntegrationSource(f,actor,w,{appId:p.receipt.appId,expectedVersion:after.version,role:'runway.month_closes',source:'own'}),/already chose/);
  // Cash at milestones now comes from Runway's snapshots only.
  const months=Array.from({length:40},(_,i)=>{const d=new Date(Date.UTC(2026,10+i,1));return {m:d.toISOString().slice(0,7),l:0,p:0,c:1000000-30000*(i+1),k:1000000-30000*(i+1)};});
  await x.save(w,rmap['runway.month_closes'].typeId,{month:'2026-10-01',closing_balance:1000000,currency:'EUR',closed:true,metrics:JSON.stringify({v:2,asOf:'2026-10',currency:'EUR',months})});
  const linked=(await x.open(w,p.receipt.appId,{section:'timeline'})).html;
  assert.match(linked,/EUR 760k · 25 months cushion/);assert.doesNotMatch(linked,/data-trialy-integration/);
  assert.match((await x.open(w,p.receipt.appId,{section:'settings'})).html,/From Runway, snapshot of Oct 2026\. Read-only here\./);
 }finally{await x.pg.close();}
});

test('keeping the app\'s own entries is also final; Runway first connects at install',async()=>{
 const x=await setup();const {f,s,actor,P,R}=x;
 try{
  const w=(await s.createWorkspace(actor,'Keep own')).id;
  const p=await x.install(w,P,'Programs');const own=x.mapOf(await x.comp(w,p.receipt.appId))['runway.month_closes'].typeId;
  await x.install(w,R,'Runway');
  const both=await readIntegration(f,actor,w,{appId:p.receipt.appId,role:'runway.month_closes'});
  await chooseIntegrationSource(f,actor,w,{appId:p.receipt.appId,expectedVersion:both.version,role:'runway.month_closes',source:'own'});
  assert.equal(x.mapOf(await x.comp(w,p.receipt.appId))['runway.month_closes'].typeId,own);
  assert.deepEqual(await x.offer(w,p.receipt.appId),{role:'runway.month_closes',name:'Runway month closes',source:'own',chosen:true,provider:'Runway',offer:null});

  // Runway first: Programs' install offers Runway's month closes (Connect by default) and no own cash table is created.
  const w2=(await s.createWorkspace(actor,'Runway first')).id;
  const r=await x.install(w2,R,'Runway');const rmap=x.mapOf(await x.comp(w2,r.receipt.appId));
  const before=(await x.pg.query<any>('SELECT count(*)::int n FROM entity_types WHERE workspace_id=$1',[w2])).rows[0].n;
  const p2=await x.install(w2,P,'Programs');
  assert.deepEqual(p2.step.tables.map((t:any)=>[t.role,t.alternative]).sort(),[['programs','new'],['runway.month_closes','new']]);
  const pmap=x.mapOf(await x.comp(w2,p2.receipt.appId));
  assert.equal(pmap['runway.month_closes'].typeId,rmap['runway.month_closes'].typeId);assert.deepEqual(pmap['runway.month_closes'].writableFields,[]);
  assert.equal((await x.offer(w2,p2.receipt.appId)).source,'linked');
  assert.equal((await x.pg.query<any>('SELECT count(*)::int n FROM entity_types WHERE workspace_id=$1',[w2])).rows[0].n-before,8,'seven Programs tables and people; no own cash table');
 }finally{await x.pg.close();}
});
