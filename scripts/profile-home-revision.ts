/** Synthetic PostgreSQL/WASM scale probe; no customer DB, credentials or network. */
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {Service} from '../src/domain/service.js';
import {homeRevisionForWorkspaces} from '../src/workspace/home-revision.js';
import {withActor,setDatabaseContext} from '../src/db/context.js';
import type {Database,Connection} from '../src/db/database.js';
const pg=new PGlite(),allActive=process.argv.includes('--all-active'),activeEvery=allActive?1:10;
try{
 for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const admin:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const owner={userId:randomUUID(),origin:'human' as const};await admin.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[owner.userId,'revision-profile@example.invalid','Synthetic owner']);
 const service=new Service(admin),spaces=[];
 for(let i=0;i<3;i++){
  const w=await service.createWorkspace(owner,'Synthetic workspace '+i),type=randomUUID(),project=randomUUID();
  await admin.query("INSERT INTO entity_types(id,workspace_id,name,fields) VALUES($1,$2,'Synthetic records','[]')",[type,w.id]);
  await admin.query("INSERT INTO workspace_nodes(id,workspace_id,kind,name) VALUES($1,$2,'project','Synthetic project')",[project,w.id]);
  spaces.push({id:w.id,type,project});
 }
 await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const db:Database={query:(q,v)=>db.transaction(tx=>tx.query(q,v)),transaction:fn=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return fn(tx as Connection);}),close:async()=>{}};
 const before=await readFile('tests/fixtures/home-revision-before-review.sql','utf8');let after='';
 await homeRevisionForWorkspaces({...db,query:async q=>{after=q;return {rows:[],rowCount:0};}},owner,spaces);
 let previous=0;
 for(const size of allActive?[10000]:process.argv.includes('--large')?[50000]:[1000,10000,50000]){
  for(const w of spaces){
   await admin.query("INSERT INTO records(id,workspace_id,type_id,data) SELECT md5($1::text||':record:'||n)::uuid,$1::uuid,$2::uuid,'{}' FROM generate_series($3::int,$4::int) n",[w.id,w.type,previous+1,size]);
   await admin.query("INSERT INTO project_records(id,workspace_id,project_id,record_id,created_by,reason,revoked_at) SELECT gen_random_uuid(),$1::uuid,$2::uuid,md5($1::text||':record:'||n)::uuid,$3::uuid,'Synthetic',CASE WHEN n%$6::int=0 THEN NULL ELSE now() END FROM generate_series($4::int,$5::int) n",[w.id,w.project,owner.userId,previous+1,size,activeEvery]);
   await admin.query("INSERT INTO document_versions(id,document_id,workspace_id,filename,mime,byte_size,checksum,version,ai_enabled,created_by) SELECT gen_random_uuid(),md5($1::text||':document:'||(n%1000))::uuid,$1::uuid,'synthetic.txt','text/plain',0,'synthetic',(n/1000)+1,true,$2::uuid FROM generate_series($3::int,$4::int) n",[w.id,owner.userId,previous+1,size]);
  }
  previous=size;await pg.exec('ANALYZE');
  for(const workspaceCount of [1,3])for(const [version,sql] of [['before',before],['after',after]]){
   const params=[spaces.slice(0,workspaceCount).map(w=>w.id),owner.userId],times:number[]=[];let bytes=0;
   for(let repeat=0;repeat<6;repeat++){const start=performance.now();const r=await withActor(owner,()=>db.query(sql,params));const elapsed=performance.now()-start;bytes=Buffer.byteLength(JSON.stringify(r.rows));if(repeat)times.push(elapsed);}
   times.sort((a,b)=>a-b);
   const plan:any=await withActor(owner,()=>db.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+sql,params));
   const nodes:any[]=[];const walk=(node:any)=>{nodes.push(node);for(const child of node.Plans??[])walk(child);};walk(plan.rows[0]['QUERY PLAN'][0].Plan);
   console.log(JSON.stringify({version,workspaceCount,documents:workspaceCount*size,projectMemberships:workspaceCount*size,activeMemberships:workspaceCount*size/activeEvery,medianMs:+times[2].toFixed(1),maxMs:+times[4].toFixed(1),replyBytes:bytes,sortNodes:nodes.filter(n=>n['Node Type']==='Sort').map(n=>({rows:n['Actual Rows'],method:n['Sort Method'],spaceKb:n['Sort Space Used']}))}));
  }
 }
}finally{await pg.close();}
