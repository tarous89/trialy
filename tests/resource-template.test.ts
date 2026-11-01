import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {appTemplates} from '../src/workspace/app-templates.js';import {execute} from '../src/foundation/runtime.js';import {readCustomLayout} from '../src/shared/custom-layout.js';import {fieldSchema} from '../src/shared/schema.js';
const entry=await appTemplates.read({templateId:'life.cro-resource-planning'}),root='templates/source/cro-resource-planning/';
const schemas=JSON.parse(await readFile(root+'schema.example.json','utf8')),demo=JSON.parse(await readFile(root+'demo_data.json','utf8'));
const bindings=Object.entries(schemas).map(([role,s]:any)=>({typeId:role,fields:s.fields.map((f:any)=>f.key)}));
const map=Object.fromEntries(Object.entries(schemas).map(([role,s]:any)=>[role,{typeId:role,fields:s.logicalFields,writableFields:Object.keys(s.logicalFields)}]));
const config={...entry.defaults,tableMap:JSON.stringify(map),startWeek:'2026-11-02'};
const source=(cfg:any=config)=>`const templateConfiguration=${JSON.stringify(cfg)};\nconst templateBindings=${JSON.stringify(bindings)};\n${entry.source}`;
async function run({data=demo,state={},event={kind:'open'},denied=[],cfg=config,short=false,unknown=false}:any={}){const changes:any[]=[];const out:any=await execute(source(cfg),{state,event,saved:true,writable:true},async(n,v:any)=>{if(n==='records.propose'){changes.push(...v);return {status:'proposed'};}assert.equal(n,'records.read');if(denied.includes(v.typeId))return {unavailable:true,total:null,rows:[]};const all=(data[v.typeId]||[]).map((r:any)=>({...r,data:Object.fromEntries(Object.entries(r.data).map(([k,value])=>[schemas[v.typeId].logicalFields[k],value]))}));return {rows:all.slice(v.offset,v.offset+(short?1:v.limit)),total:unknown?null:all.length};});return {out,changes};}
const person=(i:number)=>({id:'person'+i,version:1,data:{name:'Specialist '+i,role:'CRA',hoursPerWeek:40,status:'Active',archived:false}});
test('resource catalog source executes with host declarations, valid scalar schemas and five screens',async()=>{
 assert.doesNotMatch(entry.source!,/const templateConfiguration=/);assert.ok(readCustomLayout(source()));
 for(const s of Object.values(schemas) as any[])for(const f of s.fields){assert.ok(fieldSchema.safeParse(f).success);assert.equal(f.multiple,false);}
 const brief=JSON.parse(await readFile(root+'automation.schema.example.json','utf8'));for(const f of brief.fields)assert.ok(fieldSchema.safeParse(f).success);
 for(const screen of ['pulse','schedule','projects','people','outlook']){const {out}=await run({state:{screen}});assert.equal((out.html.match(/<h1>/g)||[]).length,1);assert.doesNotMatch(out.html,/could not be calculated|summaries are withheld/);}
 const {out}=await run();for(const expected of ['407 h','240 h','43 h'])assert.ok(out.html.includes(expected),expected);
});
test('drafts persist, readonly saves fail and stale edits/archive produce no changes',async()=>{
 const record=demo.bookings[0];const opened=await run({event:{kind:'click',action:'edit:bookings:'+record.id}});
 const changed=await run({state:opened.out.state,event:{kind:'change',action:'draft:name',form:{name:'Unsaved draft'}}});assert.equal(changed.out.state.dialog.draft.name,'Unsaved draft');assert.match(changed.out.html,/value="Unsaved draft"/);assert.equal(changed.changes.length,0);
 const readonly=await run({cfg:{...config,readOnly:true},state:changed.out.state,event:{kind:'submit',action:'save-record',form:{name:'No write'}}});assert.equal(readonly.changes.length,0);
 const data=structuredClone(demo);data.bookings[0].version++;
 const stale=await run({data,state:changed.out.state,event:{kind:'submit',action:'save-record',form:{name:'Stale'}}});assert.equal(stale.changes.length,0);assert.match(stale.out.html,/Record changed/);
 const del=await run({event:{kind:'click',action:'archive:bookings:'+record.id}});const archived=await run({data,state:del.out.state,event:{kind:'click',action:'confirm-archive'}});assert.equal(archived.changes.length,0);assert.match(archived.out.html,/Record changed/);
});
test('denied, unknown-total, short, truncated and invalid inputs withhold summaries',async()=>{
 const invalid=structuredClone(demo);delete invalid.people[0].data.hoursPerWeek;
 for(const input of [{denied:['availability']},{unknown:true},{short:true},{data:{...demo,people:Array.from({length:801},(_,i)=>person(i))}},{data:invalid}]){const {out}=await run(input);assert.match(out.html,/summaries are withheld/);assert.doesNotMatch(out.html,/No unfilled approved requirements/);}
 const empty=await run({data:{}});assert.doesNotMatch(empty.out.html,/summaries are withheld/);assert.match(empty.out.html,/Available<\/div><strong>0 h/);
 const invalidDate=await run({event:{kind:'click',action:'new:needs'}});const rejected=await run({state:invalidDate.out.state,event:{kind:'submit',action:'save-record',form:{name:'Invalid',projectId:demo.projects[0].id,role:'CRA',week:'2026-02-30',requiredHours:20,status:'Approved'}}});assert.equal(rejected.changes.length,0);
});
test('parent archives require complete child sources and reject live links',async()=>{
 for(const [role,record]of [['projects',demo.projects[0]],['people',demo.people[0]]] as any[]){const open=await run({event:{kind:'click',action:'archive:'+role+':'+record.id}});
  const linked=await run({state:open.out.state,event:{kind:'click',action:'confirm-archive'}});assert.equal(linked.changes.length,0);assert.match(linked.out.html,/linked records/);
  const denied=await run({state:open.out.state,denied:['bookings'],event:{kind:'click',action:'confirm-archive'}});assert.equal(denied.changes.length,0);assert.match(denied.out.html,/Cannot verify linked records/);
  const empty=await run({data:{[role]:[record]},state:open.out.state,event:{kind:'click',action:'confirm-archive'}});assert.equal(empty.changes.length,1);
 }
});
test('49 specialists and 15 projects remain reachable with independent pagination and project management',async()=>{
 const data={people:Array.from({length:49},(_,i)=>person(i)),projects:Array.from({length:15},(_,i)=>({id:'project'+i,version:1,data:{name:'Program '+i,status:'Active',archived:false}}))};
 const first=await run({data,state:{screen:'schedule'}});assert.match(first.out.html,/49 specialists · Page 1 of 3/);assert.doesNotMatch(first.out.html,/Specialist 48/);
 const last=await run({data,state:first.out.state,event:{kind:'click',action:'lanes:2'}});assert.match(last.out.html,/Specialist 48/);
 const projects=await run({data,state:{screen:'projects'}});assert.match(projects.out.html,/15 projects · Page 1 of 2/);
 const next=await run({data,state:projects.out.state,event:{kind:'click',action:'cards:1'}});assert.match(next.out.html,/Program 14/);
 const manage=await run({data,state:next.out.state,event:{kind:'click',action:'manage-projects'}});assert.match(manage.out.html,/Actions for Program 14/);
});
test('tentative projects do not inflate firm gaps and duplicate requirements do not double-count coverage',async()=>{
 const p=person(1),data={people:[p],projects:[{id:'project',version:1,data:{name:'Project',status:'Active',archived:false}}],needs:['a','b'].map(id=>({id,version:1,data:{name:id,projectId:'project',role:'CRA',week:'2026-11-02',requiredHours:20,status:'Approved',archived:false}})),bookings:[{id:'booking',version:1,data:{name:'Booking',personId:p.id,projectId:'project',week:'2026-11-02',hours:20,status:'Confirmed',archived:false}}]};
 const result=await run({data});assert.match(result.out.html,/Unfilled role need<\/div><strong>20 h/);
 data.projects[0].data.status='Tentative';const soft=await run({data});assert.match(soft.out.html,/Unfilled role need<\/div><strong>0 h/);
});
