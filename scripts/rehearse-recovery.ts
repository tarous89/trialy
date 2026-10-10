// Isolated synthetic engine rehearsal. Does not connect to or claim recovery of Render backups.
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Service} from '../src/domain/service.js';
import type {Database,Connection} from '../src/db/database.js';
const adapter=(pg:PGlite):Database=>({query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()});
const started=Date.now(),source=new PGlite();for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await source.exec(await readFile('migrations/'+f,'utf8'));
const db=adapter(source),service=new Service(db),actor={userId:randomUUID(),origin:'human' as const};
await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'restore@example.invalid','Synthetic restore']);
const workspace=await service.createWorkspace(actor,'Synthetic restore rehearsal');
async function save(input:any){const preview=await service.preview(actor,workspace.id,input);return service.commit(actor,preview.id,preview.digest);}
const type=(await save({kind:'create_type',name:'Milestones',fields:[{key:'name',name:'Name',kind:'text',required:true}]})).objects[0]!;
const record=(await save({kind:'create_record',typeId:type.id,data:{name:'Initial milestone'}})).objects[0]!;
await save({kind:'update_record',recordId:record.id,expectedVersion:0,data:{name:'Reviewed milestone'},reason:'Synthetic revision'});
const original=Buffer.from('Synthetic original retained across backup and restore.');const upload=await service.previewFile(actor,workspace.id,{filename:'synthetic.txt',mime:'text/plain',bytes:original,ai:false});const document=(await service.commit(actor,upload.id,upload.digest)).objects[0] as any;
const tables=['records','document_versions','document_payloads','revisions','audit_events','commit_receipts','jobs'];
async function inventory(conn:Database){const result:Record<string,any>={};for(const table of tables){const rows=(await conn.query(`SELECT * FROM ${table} ORDER BY ${table==='document_payloads'?'version_id':table==='commit_receipts'?'preview_id':'id'}`)).rows;result[table]={count:rows.length,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};}return result;}
const before=await inventory(db),archive=await source.dumpDataDir();await source.close();const restoreStarted=Date.now();const restored=new PGlite({loadDataDir:archive}),restoredDb=adapter(restored);await restored.waitReady;const after=await inventory(restoredDb);assert.deepEqual(after,before);
const restoredService=new Service(restoredDb);assert.deepEqual((await restoredService.original(actor,workspace.id,document.versionId)).bytes,original);assert.equal((await restoredService.records(actor,workspace.id,type.id)).rows[0].data.name,'Reviewed milestone');await assert.rejects(restoredDb.query('DELETE FROM audit_events'));
const migrationHashes:Record<string,string>={};for(const name of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())migrationHashes[name]=createHash('sha256').update(await readFile('migrations/'+name)).digest('hex');
const evidence={migrations:migrationHashes,date:new Date().toISOString(),environment:'Isolated PGlite synthetic data-directory backup and restore',status:'passed',backupBytes:archive.size,restoreMilliseconds:Date.now()-restoreStarted,totalMilliseconds:Date.now()-started,inventory:after,originalBytesVerified:true,historyProtectionVerified:true,limitations:['Not a Render backup restore','Does not establish production RPO/RTO or zero-loss failover','No customer data or production credentials used']};await writeFile('docs/recovery-synthetic.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));await restored.close();
