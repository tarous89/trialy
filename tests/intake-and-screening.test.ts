import {withActor,setDatabaseContext} from '../src/db/context.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import request from 'supertest';
import {baseApp,errors} from '../src/server/app.js';
import {addExternal} from '../src/server/external.js';
import {Service} from '../src/domain/service.js';
import {screenFile} from '../src/domain/file-screening.js';
import type {Database,Connection} from '../src/db/database.js';

// Session 6, package 6.9 (X2, D33–D36).
const zip=(names:string[],flag=0)=>Buffer.concat(names.map(n=>{const name=Buffer.from(n),h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(flag,6);h.writeUInt32LE(0,18);h.writeUInt16LE(name.length,26);return Buffer.concat([h,name]);}));
test('files are screened: allowed type, content that matches it, no programs, macros or encryption',()=>{
 const ok=(filename:string,bytes:Buffer)=>screenFile({filename,bytes}).status;
 assert.equal(ok('proposal.pdf',Buffer.from('%PDF-1.7\n1 0 obj')),'passed');
 assert.equal(ok('proposal.pdf',Buffer.from('just text')),'failed','content must match the type');
 assert.equal(ok('locked.pdf',Buffer.from('%PDF-1.7\n/Encrypt 5 0 R')),'failed');
 assert.equal(ok('prices.csv',Buffer.from('a,b\n1,2')),'passed');
 assert.equal(ok('setup.exe',Buffer.from('MZ\x90')),'failed');
 assert.equal(ok('report.pdf',Buffer.from('MZ\x90\x00')),'failed','a program renamed as a PDF');
 assert.equal(ok('budget.xlsm',zip(['[Content_Types].xml'])),'failed','macro-enabled formats');
 assert.equal(ok('budget.xlsx',zip(['[Content_Types].xml','xl/vbaProject.bin'])),'failed','macros inside an Office file');
 assert.equal(ok('budget.xlsx',zip(['[Content_Types].xml','xl/workbook.xml'])),'passed');
 assert.equal(ok('pack.zip',zip(['a.pdf'],1)),'failed','encrypted archive');
 assert.equal(ok('pack.zip',zip(['run.sh'])),'failed','an archive with a script');
 assert.equal(ok('notes.unknown',Buffer.from('x')),'failed','types outside the list');
});

test('a direct-intake form creates records from valid responses; duplicates and files wait for review; a response sent back cannot be accepted',async()=>{
 const pg=new PGlite();for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+f,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()},s=new Service(db),actor={userId:randomUUID(),origin:'human' as const};
 try{
  await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'intake@example.invalid','Owner']);const w=await s.createWorkspace(actor,'Intake');const save=async(op:any)=>{const p=await s.preview(actor,w.id,op);return s.commit(actor,p.id,p.digest);};
  const t=(await save({kind:'create_type',name:'Applications',fields:[{key:'name',name:'Name',kind:'text',required:true},{key:'email',name:'Email',kind:'text',unique:true}]})).objects[0]!;
  await pg.exec(await readFile('ops/runtime-role.sql','utf8'));const runtime:Database={query:(q,v)=>runtime.transaction(tx=>tx.query(q,v)),transaction:f=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return f(tx as Connection);}),close:async()=>{}};
  const app=baseApp();addExternal(app,new Service(runtime),(req,_res,next)=>{req.actor=actor;withActor(actor,next);});app.use(errors);const root=`/api/workspaces/${w.id}/exchange`;
  const created=await request(app).post(root).send({kind:'form',name:'Apply',typeId:t.id,fields:['name','email'],days:7,intake:'direct',fileRequest:{label:'CV',required:false,maxFiles:1},confirmed:true});assert.equal(created.status,200,created.text);
  const token=created.body.path.split('#')[1],submit=(data:any,files:any[]=[])=>request(app).post('/external-data').set('x-trialy-link',token).send({nonce:randomUUID(),confirmed:true,data,files});
  const records=async()=>(await db.query<any>('SELECT data FROM records WHERE type_id=$1 ORDER BY created_at',[t.id])).rows.map(r=>r.data.email);
  // A valid routine response becomes a record straight away (D33).
  const first=await submit({name:'Ada',email:'ada@example.invalid'});assert.equal(first.status,200,first.text);
  assert.deepEqual(await records(),['ada@example.invalid']);
  const accepted=(await db.query<any>('SELECT intake FROM submission_acceptances WHERE submission_id=$1',[first.body.id])).rows[0];assert.equal(accepted.intake,true,'marked as intake, so no assistant run starts (D36)');
  // An invalid response says what is wrong and stores nothing.
  assert.equal((await submit({email:'no-name@example.invalid'})).status,400);
  // A response that repeats a unique value is received like any other, but waits for review: nothing leaks.
  const again=await submit({name:'Ada again',email:'ada@example.invalid'});assert.equal(again.status,200,again.text+JSON.stringify(again.body));assert.equal(again.body.status,'submitted');
  assert.deepEqual(await records(),['ada@example.invalid']);
  // Every file goes to review: a response with a file creates no record yet; a file that fails screening is refused with a retry message.
  const cv={filename:'cv.pdf',mime:'application/pdf',base64:Buffer.from('%PDF-1.4 cv').toString('base64')};
  const withFile=await submit({name:'Bo',email:'bo@example.invalid'},[cv]);assert.equal(withFile.status,200,withFile.text);assert.deepEqual(await records(),['ada@example.invalid']);
  const bad=await submit({name:'Cy',email:'cy@example.invalid'},[{filename:'cv.pdf',mime:'application/pdf',base64:Buffer.from('MZ program').toString('base64')}]);
  assert.equal(bad.status,422);assert.match(bad.body.message??bad.text,/try again/);
  assert.equal((await db.query<any>("SELECT screening_status FROM submission_files")).rows.every((r:any)=>r.screening_status==='passed'),true);
  // A reviewer sends the duplicate back; it can no longer be accepted.
  const back=await request(app).post(`/api/workspaces/${w.id}/external-rejections/form_submission/${again.body.id}`).send({reason:'Already applied'});assert.equal(back.status,200,back.text);
  await assert.rejects(s.preview(actor,w.id,{kind:'accept_submission',submissionId:again.body.id,typeId:t.id,data:{name:'Ada again',email:'ada2@example.invalid'}}),/unavailable/);
 }finally{await pg.close();}
});
