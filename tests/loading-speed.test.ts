import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {accountHome} from '../src/workspace/home.js';
import {archivedItems} from '../src/workspace/archive.js';
import type {Actor} from '../src/shared/schema.js';

// L1.0 budgets (docs/scopes/LOADING_SPEED_2026-11-22.md, section 3): Apps home and archived apps cost
// the same number of queries for any number of apps, and never read app code.
const HOME_BUDGET=14,ARCHIVE_LIST_BUDGET=6,ARCHIVE_COUNT_BUDGET=5;
const readsCode=(sql:string)=>/workspace_components/.test(sql)&&/(SELECT \*|SELECT \*,|[\s,(]source[\s,)]|c\.\*)/.test(sql.replace(/\s+/g,' '))&&!/ AS source\b/.test(sql);
async function account(apps:number){
 const pg=new PGlite(),log:string[]=[];
 const db:Database={query:(sql,v)=>{log.push(sql);return pg.query(sql,v) as any;},transaction:fn=>pg.transaction(tx=>fn({query:(sql,v)=>{log.push(sql);return tx.query(sql,v) as any;}} as Connection)),close:()=>pg.close()};
 for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+f,'utf8'));
 const owner:Actor={userId:randomUUID(),origin:'human'},member:Actor={userId:randomUUID(),origin:'human'};
 for(const a of [owner,member])await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,a.userId+'@example.invalid','Fixture']);
 const s=new Service(db),w=(await s.createWorkspace(owner,'Speed')).id;await s.setAi(owner,w,true);await s.share(owner,w,member.userId,'editor',[],null,true);
 const p=await s.preview(owner,w,{kind:'create_type',name:'Companies',fields:[{key:'name',name:'Name',kind:'text',ai:true}]}),table=(await s.commit(owner,p.id,p.digest)).objects[0].id;
 const project=randomUUID();await pg.query("INSERT INTO workspace_nodes(id,workspace_id,kind,name) VALUES($1,$2,'project','Work')",[project,w]);
 // About 200 KB of code per app, as catalog apps carry (templates/source/*/*.source.js).
 const code='// app code\n'+'x'.repeat(200_000);
 for(let i=0;i<apps;i++){const archived=i%4===3;
  await pg.query(`INSERT INTO workspace_components(id,workspace_id,project_id,name,format,source,bindings,created_by,source_access,archived,archived_at) VALUES($1,$2,$3,$4,'frontend-js',$5,$6,$7,'bindings',$8,$9)`,
   [randomUUID(),w,i%2?project:null,'App '+String(i).padStart(3,'0'),code,JSON.stringify([{typeId:table,fields:['name']}]),i%3?member.userId:owner.userId,archived,archived?new Date().toISOString():null]);}
 const f=new WorkspaceFoundation(db);
 const measure=async<T>(fn:()=>Promise<T>)=>{log.length=0;const value=await fn();return {value,queries:log.length,code:log.filter(readsCode)};};
 return {pg,w,owner,member,assistant:{...owner,origin:'ai'} as Actor,f,db,measure};
}
test('Apps home and archived apps keep their query budgets for any number of apps',async()=>{
 const small=await account(4),large=await account(40);
 try{
  for(const who of ['owner','member','assistant'] as const){
   const counts:number[]=[];
   for(const x of [small,large]){
    const home=await x.measure(()=>accountHome(x.db,x[who],{limit:20}));
    assert.deepEqual(home.code,[],`${who}: Apps home reads no app code`);
    assert.ok(home.queries<=HOME_BUDGET,`${who}: Apps home ${home.queries} queries exceeds ${HOME_BUDGET}`);
    counts.push(home.queries);console.log(JSON.stringify({who,home:home.queries}));
    // The archived count arrives with the cards and matches the collapsed "Show archived" count.
    const summary=await x.measure(()=>archivedItems(x.f,x[who],x.w,{kind:'apps',summaryOnly:true}));
    assert.equal((home.value as any).archivedApps[x.w],summary.value.count);
    assert.ok(summary.queries<=ARCHIVE_COUNT_BUDGET,`${who}: archived count ${summary.queries} queries`);assert.deepEqual(summary.code,[]);
    const list=await x.measure(()=>archivedItems(x.f,x[who],x.w,{kind:'apps'}));
    assert.equal(list.value.items.length,summary.value.count);assert.deepEqual(list.code,[]);
    assert.ok(list.queries<=ARCHIVE_LIST_BUDGET,`${who}: archived list ${list.queries} queries exceeds ${ARCHIVE_LIST_BUDGET}`);
    for(const item of list.value.items)assert.deepEqual(item.keeps.tables.map((t:any)=>t.name),['Companies']);
   }
   assert.equal(counts[1],counts[0],`${who}: Apps home costs the same for 4 and 40 apps (${counts.join(' vs ')})`);
  }
  assert.equal((await accountHome(large.db,large.owner,{limit:100})).resources.length,30);
 }finally{await small.pg.close();await large.pg.close();}
});
