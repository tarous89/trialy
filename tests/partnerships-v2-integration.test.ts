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
import {dataAccessStep,confirmDataAccess} from '../src/workspace/data-access.js';
import {listAppCommands,runAppCommand} from '../src/workspace/app-commands.js';
import type {Actor} from '../src/shared/schema.js';

/* Partnerships 3.0.0 end to end (7.4): a disposable database with every migration and the runtime role, the real catalog
 * installer, the app in the production runtime on the v2 contract (kit, records.save), one direct save and one app command.
 * 3.0.0 is a draft in the repository catalog; it is approved only inside this database. Fictional data only. */
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/\s+/g,' ');
test('Partnerships 3.0.0: install, every screen on the kit, an inline edit saves directly, a board move writes stage history, a write command saves',async()=>{
 const pg=new PGlite();for(const n of (await readdir('migrations')).filter(x=>x.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+n,'utf8'));await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();
 const db:Database={query:async(q,v)=>storage.getStore()?.query(q,v)??db.transaction(tx=>tx.query(q,v)),transaction:async fn=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async raw=>{await raw.exec(databaseContext().service==='worker'?'SET LOCAL ROLE trialy_worker':'SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(q,v)=>{await setDatabaseContext(raw as any);return raw.query(q,v) as any;}};return storage.run(tx,()=>fn(tx));});},close:()=>pg.close()};
 const raw:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const human:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...human,origin:'ai',connectionFamily:randomUUID(),clientId:randomUUID()};
 try{
  await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[human.userId,'anna@northwind.invalid','Anna (fictional)']);
  await pg.query("INSERT INTO oauth_tokens(hash,user_id,client_id,kind,family,expires_at) VALUES($1,$2,$3,'refresh',$4,$5)",[randomUUID(),human.userId,ai.clientId,ai.connectionFamily,Date.now()+86400000]);
  await syncTemplateCatalog(raw);
  assert.equal((await pg.query<any>("SELECT status FROM app_template_catalog WHERE template_id='life.partnership-tracker' AND version='3.0.0'")).rows[0].status,'draft','a draft until the owner approves it');
  await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.partnership-tracker' AND version='3.0.0'");
  await withActor(human,async()=>{
   const f=new WorkspaceFoundation(db),s=new Service(db),t=await new AppTemplates(undefined,db).read({templateId:'life.partnership-tracker',version:'3.0.0'});
   const w=(await s.createWorkspace(human,'Partnerships v2')).id;await s.setAi(human,w,true);
   const target={install:{templateId:t.id,version:t.version,digest:t.digest,name:'Partnerships',requestKey:randomUUID()}},step=await dataAccessStep(f,human,w,target);
   const receipt:any=step.needed?await confirmDataAccess(f,human,w,{...target,connections:{},stepDigest:step.digest,...(step.automations.length?{automations:step.automations.map((r:any)=>({key:r.key,enabled:false,settings:{}}))}:{})}):await installCatalogApp(f,human,w,target.install);
   const appId=receipt.appId,comp=async()=>(await f.readComponent(human,w,appId)).component,c0=await comp();
   const map=JSON.parse(JSON.parse(/^const templateConfiguration=(.+);\n/.exec(c0.source)![1]).tableMap);assert.equal(Object.keys(map).length,17);
   const save=async(typeId:string,data:any)=>{const p=await s.preview(human,w,{kind:'create_record',typeId,data});return (await s.commit(human,p.id,p.digest)).objects[0].id as string;};
   const rows=async(typeId:string)=>(await pg.query<any>("SELECT id,version,data FROM records WHERE type_id=$1 AND state<>'archived' ORDER BY created_at,id",[typeId])).rows;
   let state:any=null;const ev=async(event:any)=>{const c=await comp();const out:any=await f.runFrontend(human,w,{componentId:c.id,expectedVersion:c.version,state,event:{value:null,form:{},...event}});state=out.state;return out;};
   // Empty install: every screen renders on the kit, with its first action and no header of its own.
   for(const sc of ['overview','pipeline','partners','conferences','activity','research','lists','settings']){const out=await ev({kind:'click',action:'nav:'+sc});
    assert.equal(out.runtime,'trialy-frontend-js-v2',sc);assert.match(out.html,/class="k-app"/,sc);assert.doesNotMatch(out.html,/<header|<h1|could not be shown/,sc);if(sc!=='settings'&&sc!=='lists')assert.match(out.html,/k-empty/,sc);}
   const org=await save(map.organizations.typeId,{name:'Cedarline Pharma (fictional)',org_type:'partner',archived:false}),prog=await save(map.programs.typeId,{name:'NWB-101 (fictional)',code:'NWB-101',stage:'phase_1',archived:false});
   const T=map['partnerships.opportunities'].typeId,opp=await save(T,{name:'Cedarline: NWB-101',organization_id:org,program_id:prog,direction:'out_license',stage:'identified',stage_on:'2026-11-01',owner:'Anna',archived:false});
   // An inline edit saves directly (no review) with the version shown.
   await ev({kind:'click',action:'nav:pipeline'});await ev({kind:'click',action:'mode:list'});const before=(await rows(T))[0];
   const edit=await ev({kind:'change',action:'edit:'+opp+':next_step:'+before.version,value:'Send the deck'});assert.ok(edit.saved,'saved directly');assert.equal(edit.proposal??null,null);
   assert.equal((await rows(T))[0].data.next_step,'Send the deck');assert.match(text(edit.html),/Undo/);
   // A board drop moves the stage and writes stage history in the same save.
   await ev({kind:'click',action:'mode:board'});const drop=await ev({kind:'change',action:'move',value:opp+'>contacted'});assert.ok(drop.saved);
   assert.equal((await rows(T))[0].data.stage,'contacted');assert.equal((await rows(map['partnerships.stage_history'].typeId))[0].data.to_stage,'contacted');
   // A write command from the assistant with Data level Edit saves directly; a read command returns the app's own numbers.
   await pg.query("UPDATE assistant_limits SET data_level='edit' WHERE workspace_id=$1 AND user_id=$2",[w,human.userId]);
   const c=await comp(),cl=await listAppCommands(f,ai,w,{appId:c.id});assert.equal(cl.commands.length,50);
   const run=(command:string,input:any)=>runAppCommand(f,ai,w,{appId:c.id,expectedVersion:c.version,command,input,requestKey:randomUUID()});
   const mv:any=await run('opportunity.move_stage',{opportunity_id:opp,to:'non_confidential',note:'Deck shared'});assert.equal(mv.ok,true,mv.error);assert.ok(mv.saved);assert.equal(mv.proposal,null);
   assert.equal((await rows(T))[0].data.stage,'non_confidential');assert.equal((await rows(map['partnerships.stage_history'].typeId)).length,2);
   const ov:any=await run('overview.read',{});assert.equal(ov.ok,true,ov.error);assert.equal(ov.result.funnel.reached.non_confidential,1);
  });
 }finally{await pg.close();}
});
