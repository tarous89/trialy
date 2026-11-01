import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {appTemplates} from '../src/workspace/app-templates.js';import {execute} from '../src/foundation/runtime.js';import {readCustomLayout} from '../src/shared/custom-layout.js';import {fieldSchema} from '../src/shared/schema.js';
const entry=await appTemplates.read({templateId:'life.grant-pipeline'}),root='templates/source/grant-pipeline/';
const schemas=JSON.parse(await readFile(root+'schema.example.json','utf8')),demo=Object.entries(JSON.parse(await readFile(root+'demo_data.json','utf8'))).flatMap(([role,records]:any)=>records.map((r:any)=>({...r,role})));
const bindings=Object.entries(schemas).map(([role,s]:any)=>({typeId:role,fields:s.fields.map((f:any)=>f.key)}));
const map=Object.fromEntries(Object.entries(schemas).map(([role,s]:any)=>[role,{typeId:role,fields:s.logicalFields,writableFields:Object.keys(s.logicalFields)}]));
const config={...entry.defaults,tableMap:JSON.stringify(map),asOf:'2026-11-01'};
async function run({data=demo,state={},event={kind:'open'},denied=[],cfg=config,short=false,unknown=false,writable=true}:any={}){const changes:any[]=[];const out:any=await execute(`const templateConfiguration=${JSON.stringify(cfg)};\nconst templateBindings=${JSON.stringify(bindings)};\n${entry.source}`,{state,event,saved:true,writable},async(n,v:any)=>{if(n==='records.propose'){changes.push(...v);return {status:'proposed'};}assert.equal(n,'records.read');if(denied.includes(v.typeId))return {unavailable:true,total:null,rows:[]};const all=data.filter((r:any)=>r.role===v.typeId).map((r:any)=>({...r,data:Object.fromEntries(Object.entries(r.data).map(([k,value])=>[schemas[v.typeId].logicalFields[k],value]))}));return {rows:all.slice(v.offset,v.offset+(short?1:v.limit)),total:unknown?null:all.length};});return {out,changes};}

const click=(action:string)=>({kind:'click',action}),submit=(form:any)=>({kind:'submit',action:'submit',form});
test('Grant catalog, exact schemas, all routes and production design inspector',async()=>{
 assert.equal(entry.version,'1.0.1');assert.ok((await appTemplates.list()).templates.some(t=>t.id===entry.id));
 for(const s of Object.values(schemas) as any[])for(const f of s.fields){assert.ok(fieldSchema.safeParse(f).success);assert.equal(f.multiple,false);}
 assert.ok(readCustomLayout('const templateConfiguration='+JSON.stringify(config)+';\n'+entry.source));
 const frames=[];for(const screen of ['pulse','opportunities','eligibility','applications','deadlines','review']){const {out}=await run({state:{screen,opportunityId:'opp002'}});assert.equal((out.html.match(/<h1>/g)||[]).length,1);for(const tag of out.html.match(/<(?:select|input|textarea)\b[^>]*>/g)||[])assert.match(tag,/data-ui-state/);frames.push({name:screen,html:out.html,css:out.css});}
 const {inspectAppDesign}=await import('../src/workspace/design-quality.js');assert.deepEqual((await inspectAppDesign(frames)).issues,[]);
});
test('incomplete reads and missing fields cannot claim zero totals, eligibility or safe archives',async()=>{
 const data=demo.filter((r:any)=>r.role==='opportunities'),id=data[0].id;const open=await run({data,event:click('archive:opportunities:'+id)});
 for(const args of [{denied:['criteria']},{unknown:true},{short:true},{cfg:{...config,tableMap:JSON.stringify({...map,criteria:{...map.criteria,fields:{}}})}}]){
  assert.match((await run({...args})).out.html,/withheld/);assert.match((await run({...args,state:{screen:'eligibility'}})).out.html,/assessment withheld/);assert.equal((await run({...args,state:open.out.state,event:click('confirm-archive')})).changes.length,0);
 }
});
test('editor and archive original versions; draft retention on failure',async()=>{
 const data=demo.filter((r:any)=>r.role==='opportunities'),id=data[0].id;const edit=await run({data,event:click('edit:opportunities:'+id)}),del=await run({data,event:click('archive:opportunities:'+id)});const changed=structuredClone(data);changed[0].version++;
 const stale=await run({data:changed,state:edit.out.state,event:submit({title:'Retained'})});assert.equal(stale.changes.length,0);assert.match(stale.out.html,/version changed/);assert.equal(stale.out.state.draft.title,'Retained');
 assert.equal((await run({data:changed,state:del.out.state,event:click('confirm-archive')})).changes.length,0);
 const valid=await run({data,state:edit.out.state,event:submit({title:'Renamed'})});assert.equal(valid.changes[0].expectedVersion,1);assert.equal(valid.out.state.draft.title,'Renamed');
 const zero=data.map((r:any)=>({...r,version:0}));const z=await run({data:zero,event:click('edit:opportunities:'+id)});assert.equal((await run({data:zero,state:z.out.state,event:submit({title:'Version zero'})})).changes[0].expectedVersion,0);
});
test('scope changes update checklist immediately and approved evidence is frozen',async()=>{
 const changed=await run({state:{screen:'eligibility',opportunityId:'opp001'},event:{kind:'change',action:'selectCall',value:'opp002'}});
 for(const r of demo.filter((r:any)=>r.role==='criteria'&&r.data.opportunityId==='opp002'))assert.ok(changed.out.html.includes(r.data.name));
 for(const r of demo.filter((r:any)=>r.role==='criteria'&&r.data.opportunityId==='opp001'))assert.ok(!changed.out.html.includes('menu:criteria:'+r.id));
 const approved=demo.find((r:any)=>r.role==='applications'&&r.data.eligibilityDecision==='Eligible');assert.ok(approved);
 const c=demo.find((r:any)=>r.role==='criteria'&&r.data.opportunityId===approved.data.opportunityId);const edit=await run({event:click('edit:criteria:'+c.id)});const blocked=await run({state:edit.out.state,event:submit({status:'No'})});assert.equal(blocked.changes.length,0);assert.match(blocked.out.html,/Return linked eligibility/);
});
test('empty start, valid scalar submissions, orphan references and currency relabeling',async()=>{
 const open=await run({data:[],event:click('add:opportunities')});const created=await run({data:[],state:open.out.state,event:submit({title:'New call',funder:'Funder',status:'Watchlist',currency:'EUR'})});assert.equal(created.changes[0].kind,'create_record');
 const m=await run({event:click('add:milestones')});assert.equal((await run({state:m.out.state,event:submit({title:'Task',applicationId:'missing',due:'2026-12-01'})})).changes.length,0);
 const data=demo.filter((r:any)=>r.role==='opportunities');const e=await run({data,event:click('edit:opportunities:opp001')});assert.equal((await run({data,state:e.out.state,event:submit({currency:'USD'})})).changes.length,0);
 assert.equal((await run({data,state:e.out.state,event:submit({amountMax:'garbage'})})).changes.length,0);
});
test('application pagination and layout field order/hidden controls are functional',async()=>{
 const b=demo.find((r:any)=>r.role==='applications');const data=demo.concat(Array.from({length:35},(_,i)=>({...b,id:'extra-'+i})));const first=await run({data,state:{screen:'applications'}});assert.match(first.out.html,/page 1 of 3/);assert.match((await run({data,state:first.out.state,event:click('page:next')})).out.html,/page 2 of 3/);
 const cfg={...config,layoutProfile:JSON.stringify({cols:{opportunities:['funder','title']},visible:{'opportunities:title':false}})};const open=await run({cfg,event:click('add:opportunities')});assert.match(open.out.html,/Show additional fields/);assert.match((await run({cfg,state:open.out.state,event:click('draft-extra')})).out.html,/name="title"/);
});
test('large windows, scalar arrays and read-only views fail closed',async()=>{
 const base=demo.find((r:any)=>r.role==='criteria');const huge=demo.concat(Array.from({length:205},(_,i)=>({...base,id:'overflow-'+i})));
 assert.match((await run({data:huge,state:{screen:'review'}})).out.html,/withheld/);
 const invalid=structuredClone(demo);invalid.find((r:any)=>r.role==='opportunities').data.amountMax=[100,200];assert.match((await run({data:invalid})).out.html,/withheld/);
 const opened=await run({data:[],event:click('add:opportunities')});const result=await run({data:[],writable:false,state:opened.out.state,event:submit({title:'Unsaved',funder:'Funder'})});assert.equal(result.changes.length,0);assert.ok(result.out.state.drawer);
});
test('currency totals, distinct dates, review reset and duplicate approval state',async()=>{
 const result=await run({state:{screen:'review'}});assert.match(result.out.html,/EUR 165,000/);assert.match(result.out.html,/USD 430,000/);assert.doesNotMatch(result.out.html,/EUR 595,000/);
 const due=await run({state:{screen:'opportunities'}});assert.match(due.out.html,/18 Nov 2026/);
 const approved=demo.find((r:any)=>r.role==='applications'&&r.data.eligibilityDecision==='Eligible');const open=await run({event:click('edit:applications:'+approved.id)});const reset=await run({state:open.out.state,event:submit({eligibilityDecision:'Pending'})});assert.equal(reset.changes.length,1);assert.equal(reset.changes[0].data.eligibility_decision,'Pending');
 const copy=await run({event:click('duplicate:applications:'+approved.id)});assert.equal(copy.out.state.draft.eligibilityDecision,'Pending');assert.equal(copy.out.state.draft.stage,'Researching');assert.equal(copy.out.state.draft.awardNoticeUrl,'');
});

test('hidden draft scalars, copied empty dates, missing currency and same-day verification',async()=>{
 const added=await run({data:[],event:click('add:opportunities')});
 const typed=await run({data:[],state:added.out.state,event:{kind:'change',action:'draft:amountMax',value:'123.5'}});
 const proposed=await run({data:[],state:typed.out.state,event:submit({title:'Hidden amount',funder:'Funder'})});assert.equal(proposed.changes[0].data.amount_max,123.5);
 const invalid=await run({data:[],state:{...typed.out.state,draft:{...typed.out.state.draft,amountMax:'bad'}},event:submit({title:'Invalid',funder:'Funder'})});assert.equal(invalid.changes.length,0);
 const b=demo.find((r:any)=>r.role==='applications'&&r.data.stage==='Awarded');const copy=await run({event:click('duplicate:applications:'+b.id)});const saved=await run({state:copy.out.state,event:submit({project:'Copied draft'})});assert.equal(saved.changes[0].data.award_date,null);assert.equal(saved.changes[0].data.awarded_amount,null);assert.equal(saved.changes[0].data.submitted_at,null);
 const missing=structuredClone(demo);missing.find((r:any)=>r.id===b.id).data.currency=null;assert.match((await run({data:missing,state:{screen:'review'}})).out.html,/Funding totals are withheld/);
 const data=demo.filter((r:any)=>r.role==='opportunities');const e=await run({data,event:click('edit:opportunities:opp001')});const revised=await run({data,state:e.out.state,event:submit({deadline:'2026-12-01',deadlineVersion:'new-notice',verifiedAt:e.out.state.draft.verifiedAt})});assert.equal(revised.changes.length,1);
 const check=await run({data:[...data],event:click('add:criteria')});const future=await run({data:[...data],state:check.out.state,event:submit({name:'Future assessment',status:'Yes',reviewer:'Reviewer',reason:'Evidence',evidenceUrl:'https://example.invalid',assessedAt:'2027-01-01'})});assert.equal(future.changes.length,0);
});
test('optional email recipe uses the actual action schema and rechecks source/status conditions',async()=>{
 const {actionConfig,matches}=await import('../src/app-services/schema.js');const {randomUUID}=await import('node:crypto');const raw=await readFile(root+'automation.example.json','utf8');const example=JSON.parse(raw.replaceAll('APP_UUID',randomUUID()).replaceAll('OPPORTUNITIES_UUID',randomUUID()).replaceAll('SELECTED_REGISTERED_OWNER_EMAIL','owner@example.invalid').replaceAll('APPROVED_EXPIRY_ISO','2026-12-31T00:00:00Z'));
 const c=actionConfig.parse(example);assert.equal(c.steps.length,1);assert.equal(c.trigger.kind,'database');if(c.trigger.kind!=='database')throw Error('wrong trigger');assert.equal(matches({status:'Open'},[c.trigger.becomes!]),true);assert.equal(matches({status:'Watchlist'},[c.trigger.becomes!]),false);assert.equal(matches({verified_at:null,source_url:'https://example.invalid',archived:false},c.conditions),false);assert.equal(matches({verified_at:'2026-11-01',source_url:'https://example.invalid',archived:true},c.conditions),false);assert.equal(matches({verified_at:'2026-11-01',source_url:'https://example.invalid',archived:false},c.conditions),true);
});
