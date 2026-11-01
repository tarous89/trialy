import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {appTemplates} from '../src/workspace/app-templates.js';import {execute} from '../src/foundation/runtime.js';import {readCustomLayout} from '../src/shared/custom-layout.js';import {fieldSchema} from '../src/shared/schema.js';
const entry=await appTemplates.read({templateId:'life.cro-oversight'}),root='templates/source/cro-oversight/';
const schemas=JSON.parse(await readFile(root+'schema.example.json','utf8')),demo=JSON.parse(await readFile(root+'demo_data.json','utf8')).records;
const bindings=Object.entries(schemas).map(([role,s]:any)=>({typeId:role,fields:s.fields.map((f:any)=>f.key)}));
const map=Object.fromEntries(Object.entries(schemas).map(([role,s]:any)=>[role,{typeId:role,fields:s.logicalFields,writableFields:Object.keys(s.logicalFields)}]));
const config={...entry.defaults,tableMap:JSON.stringify(map),asOf:'2026-11-01'};
const source=(cfg:any=config)=>`const templateConfiguration=${JSON.stringify(cfg)};\nconst templateBindings=${JSON.stringify(bindings)};\n${entry.source}`;
async function run({rows=demo,state={},event={kind:'open'},denied=[],cfg=config,short=false,totalUnknown=false}:any={}){const changes:any[]=[];const out:any=await execute(source(cfg),{state,event,saved:true,writable:true},async(n,v:any)=>{if(n==='records.propose'){changes.push(...v);return {status:'proposed'};}assert.equal(n,'records.read');if(denied.includes(v.typeId))return {unavailable:true,total:null,rows:[]};const all=rows.filter((r:any)=>r.role===v.typeId).map((r:any)=>({...r,data:Object.fromEntries(Object.entries(r.data).map(([k,v])=>[schemas[r.role].logicalFields[k],v]))}));return {rows:all.slice(v.offset,v.offset+(short?1:v.limit)),total:totalUnknown&&v.typeId!=='projects'?null:all.length};});return {out,changes};}
test('CRO catalog, scalar schemas and six QuickJS screens conform to host contracts',async()=>{
 assert.ok((await appTemplates.list({query:'CRO Oversight'})).templates.some(t=>t.id===entry.id));
 for(const s of Object.values(schemas) as any[])for(const f of s.fields){assert.ok(fieldSchema.safeParse(f).success);assert.equal(f.multiple,false);}
 assert.ok(readCustomLayout(source()));
 for(const view of ['overview','work','scorecard','issues','meetings','reports']){const {out}=await run({state:{view}});assert.equal((out.html.match(/<h1>/g)||[]).length,1);assert.doesNotMatch(out.html,/Unable to render/);}
 const {out}=await run();assert.match(out.html,/83%/);
});
test('host form events preserve drafts; edits and archive retain original versions',async()=>{
 const record=demo.find((x:any)=>x.role==='tasks');const opened=await run({event:{kind:'click',action:'edit:tasks:'+record.id}});
 const changed=await run({state:opened.out.state,event:{kind:'change',action:'draft:name',value:'New name',form:{name:'New name'}}});assert.equal(changed.out.state.dialog.draft.name,'New name');assert.equal(changed.changes.length,0);
 const rows=demo.map((x:any)=>x.id===record.id?{...x,version:x.version+1}:x);
 const saved=await run({rows,state:changed.out.state,event:{kind:'submit',action:'record-save',form:{name:'New name'}}});assert.equal(saved.changes[0].expectedVersion,record.version);
 const del=await run({event:{kind:'click',action:'delete:tasks:'+record.id}});const archived=await run({rows,state:del.out.state,event:{kind:'click',action:'delete-confirm'}});assert.equal(archived.changes[0].expectedVersion,record.version);
});
test('engagement archive is blocked by linked, denied, short, unknown-total or truncated child data',async()=>{
 const record=demo.find((x:any)=>x.role==='projects');const del=await run({event:{kind:'click',action:'delete:projects:'+record.id}});
 for(const args of [{},{denied:['tasks','assessments','requirements','activities','reports']},{short:true},{totalUnknown:true},{rows:[...demo,...Array.from({length:801},(_,i)=>({role:'reports',id:'r'+i,version:1,data:{name:'Report',projectId:record.id}}))]}]){
  const result=await run({...args,state:del.out.state,event:{kind:'click',action:'delete-confirm'}});assert.equal(result.changes.length,0);assert.match(result.out.html,/Cannot verify linked records|still has linked records/);
 }
 const unlinked=await run({rows:[record],state:del.out.state,event:{kind:'click',action:'delete-confirm'}});assert.equal(unlinked.changes.length,1);
});
test('scope changes update the same render; strict closure validation rejects invalid calendar dates',async()=>{
 const project=demo.find((x:any)=>x.role==='projects'),other=demo.find((x:any)=>x.role==='projects'&&x.id!==project.id);
 const changed=await run({state:{view:'work'},event:{kind:'change',action:'scope',value:project.id}});assert.equal(changed.out.state.project,project.id);assert.doesNotMatch(changed.out.html,new RegExp(demo.find((x:any)=>x.role==='tasks'&&x.data.projectId===other.id).data.name));
 const opened=await run({event:{kind:'click',action:'create:requirements'}});const bad=await run({state:opened.out.state,event:{kind:'submit',action:'record-save',form:{name:'Invalid closure',projectId:project.id,status:'Closed',closed:'2026-02-30'}}});assert.equal(bad.changes.length,0);assert.match(bad.out.html,/Invalid date/);
 const short=await run({short:true});assert.match(short.out.html,/incomplete coverage/);assert.match(short.out.html,/Summary withheld/);assert.doesNotMatch(short.out.html,/No confirmed exceptions/);
 const blank=await run({rows:[]});assert.doesNotMatch(blank.out.html,/Unable to render/);
});
test('read-only drafts cannot propose writes and record pagination exposes later rows',async()=>{
 const opened=await run({event:{kind:'click',action:'create:projects'}});const denied=await run({cfg:{...config,readOnly:true},state:opened.out.state,event:{kind:'submit',action:'record-save',form:{name:'No write',provider:'CRO',study:'Program'}}});assert.equal(denied.changes.length,0);assert.match(denied.out.html,/not authorized/);
 const project=demo.find((r:any)=>r.role==='projects');const rows=[project,...Array.from({length:49},(_,i)=>({role:'tasks',id:'p'+i,version:1,data:{name:'Package '+i,projectId:project.id,status:'Planned'}}))];
 const first=await run({rows,state:{view:'work'}});assert.match(first.out.html,/49 records · page 1 of 2/);assert.doesNotMatch(first.out.html,/Package 48/);
 const next=await run({rows,state:first.out.state,event:{kind:'click',action:'page-next'}});assert.match(next.out.html,/Package 48/);assert.match(next.out.html,/page 2 of 2/);
});
