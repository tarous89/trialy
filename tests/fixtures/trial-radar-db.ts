import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {AsyncLocalStorage} from 'node:async_hooks';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../../src/db/database.js';
import {databaseContext,setDatabaseContext} from '../../src/db/context.js';
import {Service} from '../../src/domain/service.js';
import {WorkspaceFoundation} from '../../src/workspace/service.js';
import {AppTemplates} from '../../src/workspace/app-templates.js';
import {syncTemplateCatalog} from '../../src/workspace/template-catalog.js';
import {dataAccessStep,confirmDataAccess} from '../../src/workspace/data-access.js';
import type {Actor} from '../../src/shared/schema.js';

/* Trial Radar on a disposable database: every migration and the runtime role, the real catalog sync and installer (Use existing data?),
 * the app in the production runtime and reviewed changes confirmed by a person. Fixture (readable): one owner "Ana (fictional)" and
 * workspaces created per test; every company, registry ID and URL is invented. Used by tests/trial-radar-integration.test.ts and
 * scripts/test-trial-radar-browser.ts. */
export const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ');
export async function suite(){
 const pg=new PGlite();for(const n of (await readdir('migrations')).filter(x=>x.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+n,'utf8'));await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();
 const db:Database={query:async(q,v)=>storage.getStore()?.query(q,v)??db.transaction(tx=>tx.query(q,v)),transaction:async fn=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async raw=>{await raw.exec(databaseContext().service==='worker'?'SET LOCAL ROLE trialy_worker':'SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(q,v)=>{await setDatabaseContext(raw as any);return raw.query(q,v) as any;}};return storage.run(tx,()=>fn(tx));});},close:()=>pg.close()};
 const raw:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const human:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...human,origin:'ai',assistant:'claude',connectionFamily:randomUUID(),clientId:randomUUID()};
 await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[human.userId,'ana@northwind.invalid','Ana (fictional)']);
 await pg.query("INSERT INTO oauth_tokens(hash,user_id,client_id,kind,family,expires_at) VALUES($1,$2,$3,'refresh',$4,$5)",[randomUUID(),human.userId,ai.clientId,ai.connectionFamily,Date.now()+86400000]);
 await syncTemplateCatalog(raw);
 // Trial Radar 1.0.0 is published: the seed approves it on first import.
 assert.equal((await pg.query<any>("SELECT status FROM app_template_catalog WHERE template_id='life.trial-radar' AND version='1.0.0'")).rows[0].status,'approved');
 const f=new WorkspaceFoundation(db),s=new Service(db),catalog=new AppTemplates(undefined,db);
 const T=await catalog.read({templateId:'life.trial-radar',version:'1.0.0'});
 const install=async(w:string,name='Trial Radar',enabled=true)=>{const target={install:{templateId:T.id,version:T.version,digest:T.digest,name,requestKey:randomUUID()}};const step=await dataAccessStep(f,human,w,target);
  return {step,receipt:await confirmDataAccess(f,human,w,{...target,connections:{},stepDigest:step.digest,automations:step.automations.map((r:any)=>({key:r.key,enabled,settings:{}}))})};};
 const comp=async(w:string,id:string)=>(await f.readComponent(human,w,id)).component;
 const mapOf=(c:any)=>JSON.parse(JSON.parse(/^const templateConfiguration=(.+);\n/.exec(c.source)![1]).tableMap);
 const app=(w:string,id:string,who:Actor=human)=>{let state:any={asOf:null};const v:any={html:'',last:null,state:()=>state,
  async ev(event:any){const c=await comp(w,id);const out:any=await f.runFrontend(who,w,{componentId:c.id,expectedVersion:c.version,state,event:{value:null,form:{},...event}});state=out.state;v.html=out.html;v.last=out;return out;},
  open:(st:any={})=>{state={...state,...st};return v.ev({kind:'open',action:''});},click:(a:string)=>v.ev({kind:'click',action:a}),change:(a:string,value:any)=>v.ev({kind:'change',action:a,value}),submit:(a:string,form:any={})=>v.ev({kind:'submit',action:a,form}),
  async approve(out:any=v.last){if(!out?.proposal)throw Error('No proposal: '+(out?.state?.notice??''));const r=await f.confirm(human,w,out.proposal.id,out.proposal.digest);await v.ev({kind:'open',action:''});return r;}};return v;};
 const rows=async(typeId:string)=>(await pg.query<any>("SELECT id,version,data FROM records WHERE type_id=$1 AND state<>'archived' ORDER BY created_at,id",[typeId])).rows;
 const save=async(w:string,typeId:string,data:any)=>{const p=await s.preview(human,w,{kind:'create_record',typeId,data});return (await s.commit(human,p.id,p.digest)).objects[0].id as string;};
 const workspace=async(name:string)=>{const w=(await s.createWorkspace(human,name)).id;await s.setAi(human,w,true);return w;};
 return {pg,db,raw,human,ai,f,s,T,install,comp,mapOf,app,rows,save,workspace,text};
}

/** Saves the fictional demo set into an installed Trial Radar (reviewed creates by the owner), remapping record IDs. */
export async function seedDemo(x:Awaited<ReturnType<typeof suite>>,w:string,map:any){
 const demo=JSON.parse(await readFile('templates/source/radars/trial-radar/demo_data.json','utf8'));const ids:Record<string,string>={};
 const fix=(v:any)=>typeof v==='string'&&ids[v]?ids[v]:v;
 for(const role of ['trialradar.settings','trialradar.scopes','trialradar.trials','trialradar.events','trialradar.runs'])for(const r of demo.records.filter((d:any)=>d.role===role)){
  const data:any={};for(const [k,v] of Object.entries(r.data)){if(v===null||v===undefined)continue;data[k]=k==='scope_ids'?JSON.stringify(JSON.parse(String(v)).map(fix)):k==='sources_report'?JSON.stringify(JSON.parse(String(v)).map((s:any)=>({...s,scope_id:fix(s.scope_id)}))):fix(v);}
  ids[r.id]=await x.save(w,map[role].typeId,data);}
 return {ids,asOf:demo.asOf as string};
}
