import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {fieldsSchema,type Actor,type Field} from '../src/shared/schema.js';
import {parseNumber,parseDate,parseValue,checkValue,normalizeValue,keyValue} from '../src/shared/validation.js';

export async function freshDatabase(){
 const pg=new PGlite();for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+f,'utf8'));
 const db:Database={query:(sql,v)=>pg.query(sql,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 return db;
}

test('X3 shared parser accepts only unambiguous numbers, dates and yes/no',()=>{
 assert.equal(parseNumber('1234.5'),1234.5);assert.equal(parseNumber('1,234.5'),1234.5);assert.equal(parseNumber(' -12 '),-12);assert.equal(parseNumber('1 234'),1234);
 assert.equal(parseNumber('1,5'),null,'a decimal comma is ambiguous');assert.equal(parseNumber('12,34'),null);assert.equal(parseNumber('abc'),null);assert.equal(parseNumber(''),null);
 assert.equal(parseDate('2026-11-20'),'2026-11-20');assert.equal(parseDate('2026/1/5'),'2026-01-05');
 assert.equal(parseDate('11/12/2026'),null,'day-first and month-first are ambiguous');assert.equal(parseDate('2026-02-30'),null);
 const amount={key:'amount',name:'Amount',kind:'money',required:false,ai:true} as Field;
 assert.deepEqual(parseValue(amount,'2,500'),{value:2500});assert.ok('issue' in parseValue(amount,'2,5'));
 assert.deepEqual(parseValue({key:'ok',name:'OK',kind:'boolean',required:false,ai:true} as Field,'Yes'),{value:true});
 assert.deepEqual(parseValue({key:'tags',name:'Tags',kind:'text',required:false,ai:true,multiple:true} as Field,'a, b'),{value:['a, b']},'a list field never splits text on commas');
 assert.deepEqual(parseValue({key:'tags',name:'Tags',kind:'text',required:false,ai:true,multiple:true} as Field,'["a","b"]'),{value:['a','b']});
});

test('X3 value checks: ranges, formats and lengths; X4 declared formatting only',()=>{
 const score={key:'score',name:'Score',kind:'number',required:false,ai:true,range:{min:0,max:10}} as Field;
 assert.deepEqual(checkValue(score,5),[]);assert.equal(checkValue(score,11)[0]!.code,'out_of_range');assert.equal(checkValue(score,-1)[0]!.message,'Score must be at least 0');
 const due={key:'due',name:'Due',kind:'date',required:false,ai:true,range:{min:'2026-01-01'}} as Field;
 assert.equal(checkValue(due,'2025-12-31')[0]!.code,'out_of_range');assert.deepEqual(checkValue(due,'2026-01-01'),[]);
 const email={key:'email',name:'Email',kind:'text',required:false,ai:true,format:'email',range:{max:20}} as Field;
 assert.deepEqual(checkValue(email,'a@b.co'),[]);assert.deepEqual(checkValue(email,'not an email but long').map(i=>i.code),['out_of_range','invalid_format'],'every problem with one value is reported');
 assert.equal(normalizeValue({kind:'text',normalize:['trim','collapse_spaces','uppercase']},'  ab   cd '),'AB CD');
 assert.equal(normalizeValue({kind:'text'},'  kept as typed  '),'  kept as typed  ','no rule, no change');
 assert.equal(keyValue(['a','b'],{a:' X ',b:1}),keyValue(['a','b'],{a:'x',b:1}));assert.equal(keyValue(['a','b'],{a:'x'}),null,'an incomplete key is never a duplicate');
 // Settings are checked when the table is defined.
 assert.throws(()=>fieldsSchema.parse([{key:'n',name:'N',kind:'number',range:{min:5,max:1}}]),/lowest value is above the highest/);
 assert.throws(()=>fieldsSchema.parse([{key:'n',name:'N',kind:'text',unique:true,uniqueWith:['missing']}]),/unknown field/);
 assert.throws(()=>fieldsSchema.parse([{key:'n',name:'N',kind:'number',format:'email'}]),/formats apply to text/);
});

test('X3 every write path reports all problems by field and row; combined keys; X4 rules applied on save',async()=>{
 const db=await freshDatabase(),s=new Service(db),owner:Actor={userId:randomUUID(),origin:'human'};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[owner.userId,owner.userId,'test@example.invalid','Owner']);
 const w=(await s.createWorkspace(owner,'Validation')).id;
 const save=async(op:unknown)=>{const p=await s.preview(owner,w,op);return s.commit(owner,p.id,p.digest);};
 const typeId=(await save({kind:'create_type',name:'Sites',fields:[
  {key:'code',name:'Site code',kind:'text',required:true,unique:true,uniqueWith:['country'],normalize:['trim','uppercase'],format:'code'},
  {key:'country',name:'Country',kind:'select',options:['DE','FR']},
  {key:'patients',name:'Patients',kind:'number',range:{min:0,max:500}},
  {key:'contact',name:'Contact',kind:'text',format:'email'}]})).objects[0].id;
 // One record with several problems: every one is reported, the first decides the error.
 await assert.rejects(s.preview(owner,w,{kind:'create_record',typeId,data:{country:'UK',patients:900,contact:'nobody'}}),(e:any)=>{
  assert.equal(e.code,'required_field');assert.deepEqual(e.details.issues.map((i:any)=>[i.field,i.code]),[['code','required_field'],['country','invalid_value'],['patients','out_of_range'],['contact','invalid_format']]);return true;});
 // Declared formatting is applied: " b-01 " is stored as "B-01".
 const first=await save({kind:'create_record',typeId,data:{code:' b-01 ',country:'DE',patients:10}});
 assert.equal((await db.query('SELECT data FROM records WHERE id=$1',[first.objects[0].id])).rows[0].data.code,'B-01');
 // Combined key: the same code in another country is fine, in the same country it is a duplicate (case and spaces ignored).
 await save({kind:'create_record',typeId,data:{code:'B-01',country:'FR'}});
 await assert.rejects(s.preview(owner,w,{kind:'create_record',typeId,data:{code:'b-01',country:'DE'}}),(e:any)=>e.code==='duplicate_value'&&/Site code \+ Country must be unique together/.test(e.message));
 // Changing the other part of a key is checked against the record as it will be.
 const fr=(await db.query("SELECT id,version FROM records WHERE type_id=$1 AND data->>'country'='FR'",[typeId])).rows[0];
 await assert.rejects(s.preview(owner,w,{kind:'update_record',recordId:fr.id,expectedVersion:fr.version,data:{country:'DE'}}),(e:any)=>e.code==='duplicate_value');
 // An import with problems on several rows reports each row and writes nothing.
 await assert.rejects(s.preview(owner,w,{kind:'bulk_records',changes:[{code:'C-1',country:'DE'},{code:'C-2',patients:-4},{code:'c-1',country:'DE'},{code:'bad code!',country:'FR'}].map(data=>({kind:'create_record',typeId,data}))}),(e:any)=>{
  assert.deepEqual(e.details.issues.map((i:any)=>[i.row,i.field,i.code]),[[2,'patients','out_of_range'],[3,'code','duplicate_value'],[4,'code','invalid_format']]);return true;});
 await assert.rejects(s.preview(owner,w,{kind:'bulk_records',changes:[{code:'C-1',country:'DE'},{code:' c-1',country:'DE'}].map(data=>({kind:'create_record',typeId,data}))}),(e:any)=>e.details.issues[0].row===2&&/repeats row 1/.test(e.details.issues[0].message));
 assert.equal((await db.query('SELECT count(*)::int AS n FROM records WHERE type_id=$1',[typeId])).rows[0].n,2);
 await db.close();
});

test('X3, X4 import report: every row checked on the server, duplicates and conflicts reported, nothing written or merged',async()=>{
 const {importReport}=await import('../src/domain/import-report.js');
 const db=await freshDatabase(),s=new Service(db),owner:Actor={userId:randomUUID(),origin:'human'};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[owner.userId,owner.userId,'test@example.invalid','Owner']);
 const w=(await s.createWorkspace(owner,'Imports')).id;
 const save=async(op:unknown)=>{const p=await s.preview(owner,w,op);return s.commit(owner,p.id,p.digest);};
 const typeId=(await save({kind:'create_type',name:'Investigators',fields:[
  {key:'email',name:'Email',kind:'text',required:true,unique:true,format:'email',normalize:['trim','lowercase']},
  {key:'name',name:'Name',kind:'text'},{key:'trials',name:'Trials',kind:'number',range:{min:0}},{key:'since',name:'Since',kind:'date'}]})).objects[0].id;
 await save({kind:'create_record',typeId,data:{email:'ana@site.org',name:'Ana'}});
 const before=(await db.query('SELECT count(*)::int AS n FROM records')).rows[0].n;
 const report=await importReport(s,owner,w,{typeId,headers:['Email','name','Trials','Since'],rows:[
  ['  Ben@Site.org','Ben','1,200','2024-03-01'],   // ready: parsed and normalized
  ['ana@site.org','Ana','',''],                    // duplicate of a saved record, same values
  ['ANA@site.org','Ana Smith','',''],              // conflict: same key, different name
  ['ben@site.org','Ben','1200','2024-03-01'],      // repeats row 1
  ['not-an-email','Cy','-3','03/01/2024'],         // several problems
  ['','Dee','2','']]});                            // required value missing
 assert.deepEqual(report.rows.map(r=>r.status),['ready','duplicate','conflict','duplicate','problem','problem']);
 assert.deepEqual(report.rows[0]!.data,{email:'ben@site.org',name:'Ben',trials:1200,since:'2024-03-01'});
 assert.deepEqual(report.rows[2]!.matches![0]!.differences,['Name']);
 assert.equal(report.rows[3]!.matches![0]!.row,1);
 assert.deepEqual(report.rows[4]!.issues.map(i=>[i.field,i.code]),[['email','invalid_format'],['trials','out_of_range'],['since','invalid_value']],'every column with a problem is reported');
 assert.deepEqual(report.rows[5]!.issues.map(i=>[i.row,i.field,i.code]),[[6,'email','required_field']]);
 assert.deepEqual(report.summary,{ready:1,problem:2,duplicate:2,conflict:1,total:6});
 const unknown=await importReport(s,owner,w,{typeId,headers:['Email','Fax'],rows:[['a@b.co','1']]});
 assert.equal(unknown.headerIssues[0]!.code,'unknown_column');
 assert.equal((await db.query('SELECT count(*)::int AS n FROM records')).rows[0].n,before,'checking writes nothing');
 await db.close();
});
