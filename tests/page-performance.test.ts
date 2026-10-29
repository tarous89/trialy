import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {trackerOperation} from '../src/workspace/tracker-template.js';
import {accountHome} from '../src/workspace/home.js';
import {accountCatalog} from '../src/workspace/catalog.js';
import {databasePage} from '../src/workspace/database-browser.js';
import {activityPage} from '../src/workspace/activity.js';
import {AccessGrid} from '../src/domain/access-grid.js';
import type {Database,Connection} from '../src/db/database.js';
test('page reads avoid repeated metadata work while preserving complete results',async()=>{
 const pg=new PGlite();let queries=0;
 const db:Database={query:(sql,v)=>{queries++;return pg.query(sql,v) as any;},transaction:fn=>pg.transaction(tx=>fn({query:(sql,v)=>{queries++;return tx.query(sql,v) as any;}})),close:()=>pg.close()};
 try{
 for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+f,'utf8'));
 const owner={userId:randomUUID(),origin:'human' as const},ai={...owner,origin:'ai' as const};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[owner.userId,owner.userId,'perf@example.invalid','Performance fixture']);
 const s=new Service(db),f=new WorkspaceFoundation(db),w=await s.createWorkspace(owner,'Performance fixture');await s.setAi(owner,w.id,true);
 const save=async(op:any)=>{const p=await s.preview(owner,w.id,op);return s.commit(owner,p.id,p.digest);};
 const table=(await save({kind:'create_type',name:'Companies',fields:[{key:'name',name:'Name',kind:'text',ai:true},{key:'status',name:'Status',kind:'select',options:['Active','Pending'],ai:true}]})).objects[0].id;
 for(let i=0;i<25;i++)await save({kind:'create_record',typeId:table,data:{name:'Company '+i,status:'Active'}});
 for(let i=0;i<5;i++){const op=await trackerOperation(f,ai,w.id,{name:'Tracker '+i,description:'Performance fixture',omitSource:true,tabs:[{name:'Companies',typeId:table,columns:[{field:'name'},{field:'status'}]}]});const p=await f.preview(ai,w.id,op);await f.confirm({...ai,actionConfirmed:true},w.id,p.id,p.digest);}
 const measure=async<T>(name:string,fn:()=>Promise<T>,ceiling:number)=>{queries=0;const value=await fn();console.log(JSON.stringify({page:name,queries}));assert.ok(queries<=ceiling,`${name}: ${queries} queries exceeds ${ceiling}`);return value;};
 const home=await measure('Tools',()=>accountHome(db,owner,{limit:20}),60);assert.equal(home.resources.length,5);for(const r of home.resources){assert.equal(r.snapshot.total,25);assert.equal(r.snapshot.rows.length,3);}
 const grid=await measure('Access',()=>new AccessGrid(db).read(owner,w.id),45);assert.equal(grid.rows.filter(r=>r.kind==='tool').length,5);
 const rows=await measure('Database rows',()=>databasePage(db,owner,w.id,{typeId:table,limit:25}),15);assert.equal(rows.total,25);assert.equal(rows.rows.length,25);
 const logs=await measure('Logs',()=>activityPage(db,owner,w.id,{limit:25}),20);assert.equal(logs.rows.length,25);assert.ok(logs.total>25);
 for(let i=1;i<25;i++)await save({kind:'create_type',name:'Table '+i,fields:[{key:'name',name:'Name',kind:'text',ai:true}]});
 const catalog=await measure('Database catalog',()=>accountCatalog(db,owner,{limit:25}),8);assert.equal(catalog.tables.length,25);assert.equal(catalog.nextOffset,null);
 }finally{await pg.close();}
});
