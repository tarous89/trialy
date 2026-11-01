import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {appTemplates} from '../src/workspace/app-templates.js';import {execute} from '../src/foundation/runtime.js';import {readCustomLayout} from '../src/shared/custom-layout.js';import {fieldSchema} from '../src/shared/schema.js';
const entry=await appTemplates.read({templateId:'life.cro-rfp-management'}),root='templates/source/cro-rfp-management/';
const schemas=JSON.parse(await readFile(root+'schema.example.json','utf8')),demo=JSON.parse(await readFile(root+'demo_data.json','utf8')).records;
const bindings=Object.entries(schemas).map(([role,s]:any)=>({typeId:role,fields:s.fields.map((f:any)=>f.key)}));
const map=Object.fromEntries(Object.entries(schemas).map(([role,s]:any)=>[role,{typeId:role,fields:s.logicalFields,writableFields:Object.keys(s.logicalFields)}]));
const config={...entry.defaults,tableMap:JSON.stringify(map),asOf:'2026-11-01'};
async function run({data=demo,state={},event={kind:'open'},denied=[],cfg=config,short=false,unknown=false,writable=true}:any={}){const changes:any[]=[];const out:any=await execute(`const templateConfiguration=${JSON.stringify(cfg)};\nconst templateBindings=${JSON.stringify(bindings)};\n${entry.source}`,{state,event,saved:true,writable},async(n,v:any)=>{if(n==='records.propose'){changes.push(...v);return {status:'proposed'};}assert.equal(n,'records.read');if(denied.includes(v.typeId))return {unavailable:true,total:null,rows:[]};const all=data.filter((r:any)=>r.role===v.typeId).map((r:any)=>({...r,data:Object.fromEntries(Object.entries(r.data).map(([k,value])=>[schemas[v.typeId].logicalFields[k],value]))}));return {rows:all.slice(v.offset,v.offset+(short?1:v.limit)),total:unknown?null:all.length};});return {out,changes};}
const click=(action:string)=>({kind:'click',action}),submit=(form:any)=>({kind:'submit',action:'save-record',form});
test('entire catalog validates; source, scalar schema and all six screens run in production engine',async()=>{
 assert.equal(entry.version,'1.2.1');assert.ok((await appTemplates.list()).templates.some(t=>t.id===entry.id));
 assert.ok(readCustomLayout('const templateConfiguration='+JSON.stringify(config)+';\n'+entry.source));
 for(const s of Object.values(schemas) as any[])for(const f of s.fields){assert.ok(fieldSchema.safeParse(f).success,JSON.stringify(f));assert.equal(f.multiple,false);}
 for(const screen of ['overview','intake','questions','library','reviews','proposal']){const {out}=await run({state:{screen,showFilters:true}});assert.doesNotMatch(out.html,/View unavailable|Some authorized data/);assert.equal((out.html.match(/<h1>/g)||[]).length,1);for(const tag of out.html.match(/<(?:select|input|textarea)\b[^>]*>/g)||[])assert.match(tag,/data-ui-state/);}
});
test('drafts retain input; stale edit/archive and partial child archive are blocked',async()=>{
 const record=demo.find((r:any)=>r.role==='reviews'),bid=demo.find((r:any)=>r.role==='bids');
 const opened=await run({event:click('edit:reviews:'+record.id)});const draft=await run({state:opened.out.state,event:{kind:'change',action:'draft:name',value:'My draft'}});assert.equal(draft.out.state.editor.draft.name,'My draft');
 const data=structuredClone(demo);data.find((r:any)=>r.id===record.id).version++;
 const stale=await run({data,state:draft.out.state,event:submit({name:'My draft'})});assert.equal(stale.changes.length,0);assert.match(stale.out.html,/Record changed/);assert.equal(stale.out.state.editor.draft.name,'My draft');
 const openedArchive=await run({event:click('del:reviews:'+record.id)});const archive=await run({data,state:openedArchive.out.state,event:click('archive')});assert.equal(archive.changes.length,0);assert.match(archive.out.html,/Record changed/);
 const parent=await run({event:click('del:bids:'+bid.id)});
 for(const options of [{denied:['questions','reviews','proposals']},{short:true},{unknown:true},{}]){const r=await run({...options,state:parent.out.state,event:click('archive')});assert.equal(r.changes.length,0);}
 const allowed=await run({data:[bid],state:parent.out.state,event:click('archive')});assert.equal(allowed.changes.length,1);assert.equal(allowed.changes[0].expectedVersion,bid.version);
 const denied=await run({writable:false,state:opened.out.state,event:submit({name:'No'})});assert.equal(denied.changes.length,0);
});
test('library destination is enabled, retained and versioned; copying resets approval',async()=>{
 const lib=demo.find((r:any)=>r.role==='library'&&r.data.reviewDue>'2026-11-01'),question=demo.find((r:any)=>r.role==='questions');
 const opened=await run({state:{bidId:question.data.bidId},event:click('reuse:'+lib.id)});
 const chosen=await run({state:opened.out.state,event:{kind:'change',action:'reuse-question',value:question.id}});assert.equal(chosen.out.state.reuse.questionId,question.id);assert.match(chosen.out.html,/data-action="reuse-question"/);
 const event={kind:'submit',action:'reuse-save',form:{questionId:question.id}},copied=await run({state:chosen.out.state,event});assert.equal(copied.changes.length,1);assert.equal(copied.changes[0].data.status,'Drafted');assert.equal(copied.changes[0].data.approved_on,null);assert.equal(copied.changes[0].data.library_id,lib.id);
 for(const row of [question,lib]){const data=structuredClone(demo);data.find((r:any)=>r.id===row.id).version++;const stale=await run({data,state:chosen.out.state,event});assert.equal(stale.changes.length,0);assert.match(stale.out.html,/Record changed/);}
});
test('mixed currencies are separated in totals and preserved on rows',async()=>{
 const data=structuredClone(demo),bids=data.filter((r:any)=>r.role==='bids');bids[0].data.valueEstimate=100;bids[0].data.currency='EUR';bids[1].data.valueEstimate=200;bids[1].data.currency='USD';
 const {out}=await run({data});assert.match(out.html,/EUR 100 · USD 200/);assert.doesNotMatch(out.html,/EUR 300/);
 const intake=await run({data,state:{screen:'intake'}});assert.match(intake.out.html,/USD 200/);
 delete bids[1].data.currency;assert.match((await run({data})).out.html,/Unknown — verify amounts and currencies/);
});
test('denied, unknown totals, array relations and truncation cannot claim ready',async()=>{
 const arrays=structuredClone(demo);arrays.find((r:any)=>r.role==='questions').data.bidId=['bad'];
 for(const args of [{denied:['questions']},{unknown:true},{short:true},{data:arrays},{data:demo.concat(Array.from({length:801},(_,i)=>({...demo.find((r:any)=>r.role==='questions'),id:'extra'+i})))}]){const {out}=await run(args);assert.match(out.html,/Some authorized data/);assert.doesNotMatch(out.html,/Ready for manual submission/);}
 const empty=await run({data:[]});assert.match(empty.out.html,/No bid has been created/);assert.doesNotMatch(empty.out.html,/Some authorized data/);
});
test('bid selection updates proposal and delivery information in the same render',async()=>{
 const bids=demo.filter((r:any)=>r.role==='bids');const first=await run({state:{screen:'proposal',bidId:bids[0].id}});const next=await run({state:first.out.state,event:{kind:'change',action:'active-bid',value:bids[1].id}});assert.match(next.out.html,new RegExp('edit:bids:'+bids[1].id));assert.doesNotMatch(next.out.html,new RegExp('edit:bids:'+bids[0].id));
});
test('production design gate accepts all six screens',async()=>{
 const {inspectAppDesign}=await import('../src/workspace/design-quality.js');const frames=[];
 for(const screen of ['overview','intake','questions','library','reviews','proposal']){const {out}=await run({state:{screen}});frames.push({name:screen,html:out.html,css:out.css});}
 const quality=await inspectAppDesign(frames);assert.deepEqual(quality.issues,[]);
});
test('mandatory approval/submission checks and bounded library pagination remain enforced',async()=>{
 const bid=demo.find((r:any)=>r.role==='bids'),q=demo.find((r:any)=>r.role==='questions');
 for(const [role,row,form]of [['bids',bid,{status:'Submitted',submittedOn:'2026-11-01',deliveryStatus:'Manually sent'}],['questions',q,{status:'Approved',answer:''}],['questions',q,{status:'Not applicable',mandatory:true}]] as any[]){const opened=await run({event:click('edit:'+role+':'+row.id)});const result=await run({state:opened.out.state,event:submit(form)});assert.equal(result.changes.length,0);}
 const lib=demo.find((r:any)=>r.role==='library'),data=demo.filter((r:any)=>r.role!=='library').concat(Array.from({length:60},(_,i)=>({...lib,id:'lib'+i,data:{...lib.data,name:'Library item '+i}})));
 const first=await run({data,state:{screen:'library'}});assert.match(first.out.html,/Page 1 of 3/);assert.doesNotMatch(first.out.html,/Library item 59/);
 const second=await run({data,state:first.out.state,event:click('next')});const third=await run({data,state:second.out.state,event:click('next')});assert.match(third.out.html,/Library item 59/);
});
test('complete approved evidence permits Ready and manual submission without currency relabeling',async()=>{
 const bid=structuredClone(demo.find((r:any)=>r.role==='bids'));
 const data=[bid,...demo.filter((r:any)=>r.data.bidId===bid.id).map((r:any)=>({...r,data:{...r.data,status:'Approved',answer:'Reviewed answer',reviewer:'Reviewer',approvedOn:'2026-11-01',owner:'Reviewer',reviewedAt:'2026-11-01',evidence:'Reviewed evidence',body:'Reviewed proposal',sources:'Saved source references',reviewedOn:'2026-11-01'}}))];
 const result=await run({data});assert.match(result.out.html,/Ready for manual submission/);
 const opened=await run({data,event:click('edit:bids:'+bid.id)});
 for(const status of ['Ready','Submitted']){const r=await run({data,state:opened.out.state,event:submit({status,submittedOn:'2026-11-01',deliveryStatus:'Manually sent'})});assert.equal(r.changes.length,1);assert.equal(r.changes[0].data.currency,bid.data.currency);}
 const invalid=await run({data,state:opened.out.state,event:submit({status:'Ready',decision:'No bid'})});assert.equal(invalid.changes.length,0);
});
