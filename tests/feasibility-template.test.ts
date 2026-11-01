import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {appTemplates} from '../src/workspace/app-templates.js';import {execute} from '../src/foundation/runtime.js';import {readCustomLayout} from '../src/shared/custom-layout.js';import {fieldSchema} from '../src/shared/schema.js';
const entry=await appTemplates.read({templateId:'life.cro-site-feasibility'}),root='templates/source/cro-site-feasibility/';
const schemas=JSON.parse(await readFile(root+'schema.example.json','utf8')),demo=JSON.parse(await readFile(root+'demo_data.json','utf8')).records;
const bindings=Object.entries(schemas).map(([role,s]:any)=>({typeId:role,fields:s.fields.map((f:any)=>f.key)}));
const map=Object.fromEntries(Object.entries(schemas).map(([role,s]:any)=>[role,{typeId:role,fields:s.logicalFields,writableFields:Object.keys(s.logicalFields)}]));
const config={...entry.defaults,tableMap:JSON.stringify(map),asOf:'2026-11-01',sponsorScope:'Meridian Cell Therapeutics (fictional)'};
async function run({data=demo,state={},event={kind:'open'},denied=[],cfg=config,short=false,unknown=false,writable=true}:any={}){const changes:any[]=[];const out:any=await execute(`const templateConfiguration=${JSON.stringify(cfg)};\nconst templateBindings=${JSON.stringify(bindings)};\n${entry.source}`,{state,event,saved:true,writable},async(n,v:any)=>{if(n==='records.propose'){changes.push(...v);return {status:'proposed'};}assert.equal(n,'records.read');if(denied.includes(v.typeId))return {unavailable:true,total:null,rows:[]};const all=data.filter((r:any)=>r.role===v.typeId).map((r:any)=>({...r,data:Object.fromEntries(Object.entries(r.data).map(([k,value])=>[schemas[v.typeId].logicalFields[k],value]))}));return {rows:all.slice(v.offset,v.offset+(short?1:v.limit)),total:unknown?null:all.length};});return {out,changes};}
const click=(action:string)=>({kind:'click',action}),submit=(form:any)=>({kind:'submit',action:'save',form});
test('catalog and exact scalar schema pass; all screens render through real runtime and design gate',async()=>{
 assert.equal(entry.version,'1.2.1');assert.ok((await appTemplates.list()).templates.some(t=>t.id===entry.id));assert.ok(readCustomLayout('const templateConfiguration='+JSON.stringify(config)+';\n'+entry.source));
 for(const s of Object.values(schemas) as any[])for(const f of s.fields){assert.ok(fieldSchema.safeParse(f).success);assert.equal(f.multiple,false);}
 const frames=[];for(const tab of ['portfolio','requirements','sites','questionnaire','matrix','handoff']){const {out}=await run({state:{tab,filtersOpen:true}});assert.equal((out.html.match(/<h1>/g)||[]).length,1);assert.doesNotMatch(out.html,/Local demo error|unavailable or exceed/);for(const tag of out.html.match(/<(?:select|input|textarea)\b[^>]*>/g)||[])assert.match(tag,/data-ui-state/);frames.push({name:tab,html:out.html,css:out.css});}
 const {inspectAppDesign}=await import('../src/workspace/design-quality.js');const quality=await inspectAppDesign(frames);assert.deepEqual(quality.issues,[]);
});
test('archives preserve displayed versions and block every parent with dependencies or unreadable children',async()=>{
 for(const [role,id] of [['projects','p-101'],['sites','s-berlin'],['candidates','k-101'],['criteria','c-101']]){const opened=await run({event:click('delete:'+role+':'+id)});const linked=await run({state:opened.out.state,event:click('confirm-delete')});assert.equal(linked.changes.length,0);assert.match(linked.out.html,/linked records/);
 const denied=await run({state:opened.out.state,denied:['responses','tasks','candidates'],event:click('confirm-delete')});assert.equal(denied.changes.length,0);
 }
 const opened=await run({event:click('delete:sites:s-munich')});const data=structuredClone(demo);data.find((r:any)=>r.id==='s-munich').version++;const stale=await run({data,state:opened.out.state,event:click('confirm-delete')});assert.equal(stale.changes.length,0);assert.match(stale.out.html,/version changed/);
 const empty=await run({data:demo.filter((r:any)=>r.role==='sites'),state:opened.out.state,event:click('confirm-delete')});assert.equal(empty.changes.length,1);
});
test('approved answers and ratings require reset before editing; criterion revisions cannot reuse existing approvals',async()=>{
 const opened=await run({event:click('edit:responses:r-k-101-1')});const changed=await run({state:opened.out.state,event:submit({answer:'Changed',rating:'1'})});assert.equal(changed.changes.length,0);assert.match(changed.out.html,/fresh review/);
 const reset=await run({state:opened.out.state,event:submit({status:'Draft',answer:'Changed',rating:'1'})});assert.equal(reset.changes.length,1);assert.equal(reset.changes[0].data.reviewer,null);assert.equal(reset.changes[0].data.answered_at,null);
 const criteria=await run({event:click('edit:criteria:c-101')});const revision=await run({state:criteria.out.state,event:submit({revision:'v2',weight:90})});assert.equal(revision.changes.length,0);assert.match(revision.out.html,/Reset linked response approvals/);
 const data=structuredClone(demo);data.find((r:any)=>r.id==='c-101').data.revision='v2';assert.match((await run({data,state:{tab:'matrix'}})).out.html,/No sites can be ranked/);
});
test('unknown totals, missing schema keys, denied data and orphan institutions withhold rankings',async()=>{
 for(const args of [{unknown:true},{short:true},{denied:['responses']},{data:demo.concat(Array.from({length:801},(_,i)=>({...demo.find((r:any)=>r.role==='sites'),id:'site'+i})))}]){const {out}=await run({...args,state:{tab:'matrix'}});assert.match(out.html,/No sites can be ranked/);}
 const data=demo.filter((r:any)=>r.id!=='s-berlin');assert.match((await run({data,state:{tab:'matrix'}})).out.html,/Institution is missing or archived/);
 const empty=await run({data:[]});assert.match(empty.out.html,/first study/);
});
test('empty workflow has candidate creation and comparisons reach sites beyond the first five',async()=>{
 const {out}=await run({data:[],state:{tab:'matrix'}});assert.match(out.html,/new:candidates/);
 const data=demo.concat(Array.from({length:8},(_,i)=>({...demo.find((r:any)=>r.id==='k-103'),id:'extra'+i,data:{...demo.find((r:any)=>r.id==='k-103').data,name:'Extra candidate '+i}})));
 const first=await run({data,state:{tab:'matrix'}});assert.match(first.out.html,/Page 1 of 3/);const next=await run({data,state:first.out.state,event:click('compare-next')});assert.equal(next.out.state.comparePage,1);
});
test('drafts, read-only and conflicts; complete evidence can be selected with recorded sponsor approval',async()=>{
 const open=await run({event:click('edit:sites:s-munich')});const draft=await run({state:open.out.state,event:{kind:'change',action:'draft:name',value:'Unsaved name'}});assert.equal(draft.out.state.editor.draft.name,'Unsaved name');
 const denied=await run({writable:false,state:draft.out.state,event:submit({})});assert.equal(denied.changes.length,0);
 const data=structuredClone(demo);data.find((r:any)=>r.id==='s-munich').version++;const stale=await run({data,state:draft.out.state,event:submit({})});assert.equal(stale.changes.length,0);assert.match(stale.out.html,/version changed/);
 const selection=await run({event:click('edit:candidates:k-101')});const ready=await run({state:selection.out.state,event:submit({stage:'Selected',sponsorDecision:'Approved',decisionBy:'Sponsor reviewer',decisionDate:'2026-11-01',rationale:'Reviewed',source:'https://example.org/approval'})});assert.equal(ready.changes.length,1,ready.out.html);
});
