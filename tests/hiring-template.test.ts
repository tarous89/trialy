import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {appTemplates} from '../src/workspace/app-templates.js';import {execute} from '../src/foundation/runtime.js';import {readCustomLayout,updateCustomLayout} from '../src/shared/custom-layout.js';import {fieldSchema} from '../src/shared/schema.js';
const entry=await appTemplates.read({templateId:'life.hiring-resource-management'}),root='templates/source/biotech-hiring/';
const schemas=JSON.parse(await readFile(root+'schema.example.json','utf8')),demo=JSON.parse(await readFile(root+'demo_data.json','utf8'));
const bindings=Object.entries(schemas).map(([role,s]:any)=>({typeId:role,fields:s.fields.map((f:any)=>f.key)}));
const map=Object.fromEntries(Object.entries(schemas).map(([role,s]:any)=>[role,{typeId:role,fields:s.logicalFields,writableFields:Object.keys(s.logicalFields)}]));
const config={...entry.defaults,tableMap:JSON.stringify(map),planMonth:'2026-11'};
const source=(cfg:any=config)=>`const templateConfiguration=${JSON.stringify(cfg)};\nconst templateBindings=${JSON.stringify(bindings)};\n${entry.source}`;
async function run({rows=demo,state={},event={kind:'open'},denied='',cfg=config}:any={}){const changes:any[]=[];const out:any=await execute(source(cfg),{state,event,saved:true,writable:true},async(n,v:any)=>{if(n==='records.propose'){changes.push(...v);return {status:'proposed'};}assert.equal(n,'records.read');if(v.typeId===denied)return {unavailable:true,total:null,rows:[]};const all=rows.filter((r:any)=>r.role===v.typeId).map((r:any)=>({...r,data:Object.fromEntries(Object.entries(r.data).map(([k,v])=>[schemas[r.role].logicalFields[k],v]))}));return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};});return {out,changes};}
const person=(i:number,status='Active')=>({role:'staff',id:'p'+i,version:1,data:{name:'Person '+i,fte:1,status,function:'CMC',availableFrom:'2026-11'}});
test('hiring catalog and five scalar schema examples validate; all six screens run in QuickJS',async()=>{
 for(const v of Object.values(schemas) as any[])for(const f of v.fields)assert.ok(fieldSchema.safeParse(f).success,f.key);
 for(const screen of ['overview','people','planner','forecast','requests','scenarios']){const {out}=await run({state:{screen}});assert.equal((out.html.match(/<h1>/g)||[]).length,1);assert.doesNotMatch(out.html,/Capacity totals and forecasts are withheld/);}
 assert.ok(readCustomLayout(source()));
});
test('upcoming hires never supply baseline; unknown and truncated data never claim zero shortage',async()=>{
 const upcoming=await run({rows:[person(1,'Upcoming')]});assert.match(upcoming.out.html,/hw-big">0 /);assert.doesNotMatch(upcoming.out.html,/hw-big">1 /);
 const active=await run({rows:[person(1)]});assert.match(active.out.html,/hw-big">1 /);
 for(const input of [{denied:'staff'},{rows:Array.from({length:501},(_,i)=>person(i))},{rows:[{...person(1),data:{name:'Unknown',status:'Active'}}]}]){
  const {out}=await run({...input,state:{screen:'forecast'}});assert.match(out.html,/Capacity totals and forecasts are withheld/);assert.doesNotMatch(out.html,/No shortage found/);
 }
});
test('49-person timeline exposes every person by pagination, and month/scenario controls retain state',async()=>{
 const rows=Array.from({length:49},(_,i)=>person(i));const first=await run({rows,state:{screen:'planner'}});assert.match(first.out.html,/49 resources · Page 1 of 2/);assert.doesNotMatch(first.out.html,/<strong>Person 48<\/strong>/);
 const second=await run({rows,state:first.out.state,event:{kind:'click',action:'timeline-page|1'}});assert.match(second.out.html,/<strong>Person 48<\/strong>/);assert.match(second.out.html,/Page 2 of 2/);
 const month=await run({event:{kind:'change',action:'select-month',value:'2026-12'}});assert.match(month.out.html,/value="2026-12" selected/);
 const farMonth=await run({state:{screen:'planner'},event:{kind:'click',action:'month|2028-01'}});assert.match(farMonth.out.html,/value="2028-01" selected/);
});
test('draft input survives changes; edit/archive proposals retain original record version',async()=>{
 const rows=[person(1)];const start=await run({rows,event:{kind:'click',action:'edit|staff|p1'}});
 const changed=await run({rows,state:start.out.state,event:{kind:'change',action:'draft|name',form:{name:'Unsaved draft'}}});assert.equal(changed.changes.length,0);assert.match(changed.out.html,/value="Unsaved draft"/);
 const concurrent=[{...person(1),version:2}];const saved=await run({rows:concurrent,state:changed.out.state,event:{kind:'submit',action:'save-record',form:{name:'Unsaved draft'}}});assert.equal(saved.changes[0].expectedVersion,1);
 const del=await run({rows,event:{kind:'click',action:'delete|staff|p1'}});const archived=await run({rows:concurrent,state:del.out.state,event:{kind:'click',action:'confirm-delete'}});assert.equal(archived.changes[0].expectedVersion,1);
});
test('native layout rereads saved configuration rather than stale UI state',async()=>{
 const layout=readCustomLayout(source())!;const profile=structuredClone(layout.profile);profile.tabs.reverse();profile.cols.staff.reverse();profile.heading='Our resources';
 assert.deepEqual(readCustomLayout(updateCustomLayout(source(),profile))!.profile,profile);
 const {out}=await run({state:{layout:{tabs:['overview'],heading:'Stale'}},cfg:{...config,layoutProfile:JSON.stringify(profile)}});assert.match(out.html,/Our resources/);assert.doesNotMatch(out.html,/Stale/);
});

test('invalid scenario assumptions withhold totals while keeping the correction register available',async()=>{
 const rows=[...demo,{role:'scenarios',id:'invalid',version:1,data:{name:'Needs correction',hireShiftMonths:0}}];
 const {out}=await run({rows,state:{screen:'scenarios'}});assert.match(out.html,/Capacity totals and forecasts are withheld/);assert.match(out.html,/Needs correction/);assert.match(out.html,/new\|scenarios/);assert.doesNotMatch(out.html,/Scenario shortage months/);
});
