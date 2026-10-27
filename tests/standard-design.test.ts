import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {trackerOperation} from '../src/workspace/tracker-template.js';
import {standardTracker} from '../src/workspace/standard-tracker.js';

test('standard defaults preserve existing multi-value data, filter before pagination and gate custom capabilities',async()=>{
 const pg=new PGlite();const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 try{
  for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
  const human={userId:randomUUID(),origin:'human' as const},ai={...human,origin:'ai' as const};
  await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[human.userId,human.userId,'design@example.invalid','Design fixture']);
  const s=new Service(db),f=new WorkspaceFoundation(db),w=await s.createWorkspace(human,'Design');
  const save=async(body:any)=>{const p=await s.preview(human,w.id,body);return s.commit(human,p.id,p.digest);};
  const typeId=(await save({kind:'create_type',name:'Existing outreach',fields:[{key:'name',name:'Company',kind:'text',ai:true},{key:'status',name:'Status',kind:'select',multiple:true,options:['Research','Engaged','Declined'],ai:true},{key:'start',name:'Start',kind:'date',ai:true},{key:'end',name:'End',kind:'date',ai:true}]})).objects[0].id;
  for(let i=0;i<27;i++)await save({kind:'create_record',typeId,data:{name:'Company '+i,status:i===26?['Engaged','Research']:['Research']}});
  const op=await trackerOperation(f,ai,w.id,{name:'Outreach',description:'Existing schema',omitSource:true,showExample:false,tabs:[{name:'Companies',typeId,columns:[{field:'name'},{field:'status',display:{kind:'badge',tone:'neutral'}},{field:'start'},{field:'end'}]}]});
  const config=standardTracker(op.content.source)!.config;
  assert.deepEqual(config.tabs[0].filters,['status']);assert.equal(config.tabs[0].columns[1].multiple,true);
  assert.equal(config.tabs[0].columns[1].display.valueTones.Engaged,'green');assert.equal(config.tabs[0].columns[1].display.valueTones.Declined,'red');
  const p=await f.preview(ai,w.id,op),receipt=await f.confirm(human,w.id,p.id,p.digest);
  const output:any=await f.runFrontend(ai,w.id,{componentId:receipt.id,expectedVersion:0,state:{tab:0},event:{kind:'change',action:'filter:status',value:'Engaged'}});
  assert.equal(output.tracker.pages[0].result.total,1);assert.equal(output.tracker.pages[0].result.rows[0].data.name,'Company 26');
  const noMatch:any=await f.runFrontend(ai,w.id,{componentId:receipt.id,expectedVersion:0,state:{tab:0},event:{kind:'change',action:'filter:status',value:'Declined'}});assert.equal(noMatch.tracker.pages[0].result.total,0);
  assert.equal((await s.records(human,w.id,typeId,{limit:50,offset:0})).total,27);assert.equal((await s.types(human,w.id))[0].fields.find((x:any)=>x.key==='status')?.multiple,true);
  const custom={...op,content:{...op.content,source:'return {html:"<main>Timeline</main>",state:{}};'}};
  await assert.rejects(f.preview(ai,w.id,{...custom,designChangeReason:'I would like to change the design for outreach.'}),/structured designException/);
  const exception={capability:'interactive_timeline',userRequirement:'Drag task start and end dates on a time axis.',whyStandardInsufficient:'The table can edit dates but cannot drag intervals on a time axis.',fieldIds:['f_0_2','f_0_3']};
  await assert.rejects(f.preview(ai,w.id,{...custom,designException:{...exception,fieldIds:['f_0_0']}}),/does not support/);
  await assert.rejects(f.preview(ai,w.id,{...custom,designException:{...exception,capability:'colored_status'}}));
  await assert.rejects(f.preview(ai,w.id,{...custom,content:{...custom.content,resourceKind:'generic',manifest:null},designException:exception}),/generic cannot bypass/);
  const {resourceKind,...unclassified}=custom.content;await assert.rejects(f.preview(ai,w.id,{...custom,content:unclassified}),/generic cannot bypass/);
  const allowed=await f.preview(ai,w.id,{...custom,designException:exception});assert.equal(allowed.body.designException.capability,'interactive_timeline');
  await assert.rejects(f.preview(ai,w.id,{...custom,componentId:receipt.id,expectedVersion:0,designException:exception}),/cannot be replaced/);
  await f.discard(ai,w.id,allowed.id);
 }finally{await db.close();}
});
