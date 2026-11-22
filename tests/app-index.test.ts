import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {appIndex} from '../src/workspace/app-index.js';
import {archivedItems} from '../src/workspace/archive.js';
import {access} from '../src/domain/permissions.js';
import {trackerOperation} from '../src/workspace/tracker-template.js';
import type {Actor} from '../src/shared/schema.js';

// L1.1 (docs/scopes/LOADING_SPEED_2026-11-22.md): the batched app index returns exactly the apps the
// per-app check returns, in both directions, for every person and assistant on generated accounts.
const seeded=(seed:number)=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
test('the lean app index agrees with the per-app check on generated accounts',async()=>{
 for(const seed of [1,2,3,4]){
  const pg=new PGlite(),rnd=seeded(seed),pick=<T>(xs:readonly T[])=>xs[Math.floor(rnd()*xs.length)]!,chance=(p:number)=>rnd()<p;
  try{
   for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+f,'utf8'));
   const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
   const human=():Actor=>({userId:randomUUID(),origin:'human'});
   const owner=human(),members=[human(),human(),human(),human(),human(),human()];
   for(const [i,a] of [owner,...members].entries())await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,`p${i}@example.invalid`,'Person '+i]);
   const s=new Service(db),f=new WorkspaceFoundation(db),w=(await s.createWorkspace(owner,'Index '+seed)).id;await s.setAi(owner,w,true);
   await db.query('UPDATE workspaces SET claude_enabled=true WHERE id=$1',[w]);
   const save=async(op:any)=>{const p=await s.preview(owner,w,op);return s.commit(owner,p.id,p.digest);};
   const tables:any[]=[];
   for(let t=0;t<3;t++)tables.push((await save({kind:'create_type',name:'Table '+t,fields:[{key:'name',name:'Name',kind:'text',ai:true},{key:'secret',name:'Secret',kind:'text',ai:t!==1},{key:'status',name:'Status',kind:'text',ai:true}]})).objects[0]);
   // Two real standard trackers (connections checked against their saved source), then generated apps.
   const ai={...owner,origin:'ai' as const};
   for(let i=0;i<2;i++){const op=await trackerOperation(f,ai,w,{name:'Tracker '+i,description:'Fixture',omitSource:true,tabs:[{name:'Rows',typeId:tables[i].id,columns:[{field:'name'},{field:i===0?'secret':'status'}]}]});const p=await f.preview(ai,w,op);const ready=await f.finalizeAppPreview(ai,w,p.id,p.digest);await f.confirm({...ai,actionConfirmed:true,footerApproval:true},w,ready.preview.id,ready.preview.digest);}
   const roles=['editor','viewer','editor','inspector','editor','viewer'];
   for(const [i,m] of members.entries())await s.share(owner,w,m.userId,roles[i]!,[],i===4?[tables[0].id,tables[2].id]:null,i!==5);
   await db.query('UPDATE workspace_access SET hidden_fields=$3 WHERE workspace_id=$1 AND user_id=$2',[w,members[2]!.userId,JSON.stringify([tables[0].id+':secret'])]);
   // Restricted variants: no direct data, no database browsing, a hidden-for-assistants table.
   await db.query('UPDATE workspace_access SET direct_data=false WHERE workspace_id=$1 AND user_id=$2',[w,members[5]!.userId]);
   if(chance(.5))await db.query('UPDATE workspace_access SET database_browse=false WHERE workspace_id=$1 AND user_id=$2',[w,members[0]!.userId]);
   if(chance(.5))await db.query('UPDATE workspaces SET ai_hidden_types=$2 WHERE id=$1',[w,JSON.stringify([tables[1].id])]);
   await db.query('INSERT INTO assistant_limits(workspace_id,user_id,assistant,data_level,apps_level) VALUES($1,$2,$3,$4,$5)',[w,members[0]!.userId,'chatgpt',pick(['blocked','view','edit']),pick(['blocked','view','edit'])]);
   await db.query('UPDATE workspaces SET claude_data_level=$2,claude_apps_level=$3 WHERE id=$1',[w,pick(['view','edit','blocked']),pick(['view','edit'])]);
   // Projects (top level only): some restricted to people, some closed to assistants, some archived.
   const people=[owner,...members].map(a=>a.userId),nodes:any[]=[];
   for(let n=0;n<6;n++){const id=randomUUID(),parent=null;
    await db.query('INSERT INTO workspace_nodes(id,workspace_id,kind,name,parent_id,allowed_users,ai_enabled,archived) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,w,'project','Project '+n,parent,chance(.3)?JSON.stringify([pick(people),pick(people)]):null,!chance(.2),chance(.15)]);nodes.push({id});}
   const apps:string[]=[];
   for(let i=0;i<30;i++){const id=randomUUID(),archived=chance(.25),t=pick(tables),fields=chance(.2)?['name','missing']:chance(.4)?['name','secret']:['name'];
    await db.query(`INSERT INTO workspace_components(id,workspace_id,project_id,name,format,source,bindings,created_by,allowed_users,ai_enabled,source_access,team_default_role,archived,archived_at)
     VALUES($1,$2,$3,$4,'text',$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[id,w,chance(.8)?pick(nodes).id:null,'App '+i,'source '+i,JSON.stringify(chance(.8)?[{typeId:t.id,fields}]:[]),pick(people),chance(.25)?JSON.stringify([pick(people)]):null,!chance(.15),chance(.5)?'bindings':'workspace',pick(['editor','editor','viewer','none']),archived,archived?new Date().toISOString():null]);
    apps.push(id);
    if(chance(.25))await db.query('INSERT INTO app_members(workspace_id,app_id,user_id,role) VALUES($1,$2,$3,$4) ON CONFLICT(app_id,user_id) DO UPDATE SET role=excluded.role',[w,id,pick(people),pick(['owner','editor','viewer'])]);
   }
   // A table owned by an app: people without a role on that app do not see it.
   await db.query('UPDATE entity_types SET origin_app_id=$2 WHERE id=$1',[tables[2].id,pick(apps)]);
   // Per-person and per-assistant rules on apps, projects and sections.
   const rules:any[]=[];
   for(let r=0;r<10;r++)rules.push({subject:chance(.2)?pick(['chatgpt','claude']):pick(people),kind:pick(['tool','tool','project']),resourceId:pick([...apps,...nodes.map(n=>n.id)]),read:pick(['deny','allow','inherit']),write:pick(['deny','inherit'])});
   rules.push({subject:pick(people),kind:'app_section',resourceId:pick(apps),field:'section',read:'deny',write:'inherit'});
   await db.query('UPDATE workspaces SET permission_rules=$2 WHERE id=$1',[w,JSON.stringify(rules)]);

   const actors:Actor[]=[owner,...members].flatMap(a=>[a,{...a,origin:'ai' as const},{...a,origin:'ai' as const,assistant:'claude'} as Actor]);
   let compared=0;
   for(const a of actors){
    const key=(r:any)=>[r.id,r.name,r.resource_kind,r.project_id,!!r.project_archived,r.app_role].join('|');
    let expected:any[]|null=null,expectedError:any=null;
    try{expected=(await f.components(a,w)).filter((c:any)=>!c.archived);}catch(e){expectedError=e;}
    let actual:any[]|null=null,actualError:any=null;
    try{actual=await appIndex(db,a,w,{include:'active'});}catch(e){actualError=e;}
    assert.equal(!!actualError,!!expectedError,`seed ${seed}, ${a.origin} ${a.userId}: ${actualError?.message??expectedError?.message}`);
    if(expectedError){assert.equal(actualError.status,expectedError.status);continue;}
    assert.deepEqual(actual!.map(key),expected!.map(key),`seed ${seed}: active apps for ${a.origin}/${(a as any).assistant??''} ${people.indexOf(a.userId)}`);
    // Reference: the per-app check archivedItems() used before L1.4 (restorable by the owner or the app's creator).
    const archived:string[]=[];const isOwner=(await access(db,a,w)).role==='owner';
    for(const r of (await db.query('SELECT id,created_by FROM workspace_components WHERE workspace_id=$1 AND archived AND deleted_at IS NULL',[w])).rows){if(!isOwner&&r.created_by!==a.userId)continue;try{await f.component(db,a,w,r.id,false);archived.push(r.id);}catch(e){if(![403,404].includes((e as any).status))throw e;}}
    archived.sort();
    assert.deepEqual((await archivedItems(f,a,w,{kind:'apps'})).items.map((x:any)=>x.id).sort(),archived);
    assert.equal((await archivedItems(f,a,w,{kind:'apps',summaryOnly:true})).count,archived.length);
    assert.deepEqual((await appIndex(db,a,w,{include:'archived'})).map(r=>r.id).sort(),archived,`seed ${seed}: archived apps for ${a.origin} ${people.indexOf(a.userId)}`);
    compared+=expected!.length+archived.length;
   }
   assert.ok(compared>40,`seed ${seed} compared only ${compared} decisions`);
  }finally{await pg.close();}
 }
});
