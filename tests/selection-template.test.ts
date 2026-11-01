import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {appTemplates} from '../src/workspace/app-templates.js';import {execute} from '../src/foundation/runtime.js';import {readCustomLayout} from '../src/shared/custom-layout.js';import {fieldSchema} from '../src/shared/schema.js';
const entry=await appTemplates.read({templateId:'life.cro-selection'}),root='templates/source/cro-selection/';
const schemas=JSON.parse(await readFile(root+'schema.example.json','utf8')),demo=Object.entries(JSON.parse(await readFile(root+'demo_data.json','utf8'))).flatMap(([role,records]:any)=>records.map((r:any)=>({...r,role})));
const bindings=Object.entries(schemas).map(([role,s]:any)=>({typeId:role,fields:s.fields.map((f:any)=>f.key)}));
const map=Object.fromEntries(Object.entries(schemas).map(([role,s]:any)=>[role,{typeId:role,fields:s.logicalFields,writableFields:Object.keys(s.logicalFields)}]));
const config={...entry.defaults,tableMap:JSON.stringify(map),asOf:'2026-11-01',sponsorScope:'Meridian Cell Therapeutics (fictional)'};
async function run({data=demo,state={},event={kind:'open'},denied=[],cfg=config,short=false,unknown=false,writable=true}:any={}){const changes:any[]=[];const out:any=await execute(`const templateConfiguration=${JSON.stringify(cfg)};\nconst templateBindings=${JSON.stringify(bindings)};\n${entry.source}`,{state,event,saved:true,writable},async(n,v:any)=>{if(n==='records.propose'){changes.push(...v);return {status:'proposed'};}assert.equal(n,'records.read');if(denied.includes(v.typeId))return {unavailable:true,total:null,rows:[]};const all=data.filter((r:any)=>r.role===v.typeId).map((r:any)=>({...r,data:Object.fromEntries(Object.entries(r.data).map(([k,value])=>[schemas[v.typeId].logicalFields[k],value]))}));return {rows:all.slice(v.offset,v.offset+(short?1:v.limit)),total:unknown?null:all.length};});return {out,changes};}
const click=(action:string)=>({kind:'click',action}),submit=(form:any)=>({kind:'submit',action:'save-record',form});

test('catalog, scalar schema, native layout and all routes pass real runtime/design checks',async()=>{
 assert.equal(entry.version,'1.0.1');assert.ok((await appTemplates.list()).templates.some(t=>t.id===entry.id));
 assert.ok(readCustomLayout('const templateConfiguration='+JSON.stringify(config)+';\n'+entry.source));
 for(const s of Object.values(schemas) as any[])for(const f of s.fields){assert.ok(fieldSchema.safeParse(f).success);assert.equal(f.multiple,false);}
 const frames=[];for(const screen of ['overview','shortlist','criteria','comparison','decision']){const {out}=await run({state:{screen,selectionId:'sel001'}});assert.equal((out.html.match(/<h1>/g)||[]).length,1);assert.doesNotMatch(out.html,/bindings are absent/);for(const tag of out.html.match(/<(?:select|input|textarea)\b[^>]*>/g)||[])assert.match(tag,/data-ui-state/);frames.push({name:screen,html:out.html,css:out.css});}
 const {inspectAppDesign}=await import('../src/workspace/design-quality.js');const quality=await inspectAppDesign(frames);assert.deepEqual(quality.issues,[]);
});
test('draft retention, read-only, original versions and all form controls',async()=>{
 const open=await run({event:click('edit:vendors:ven005')});
 for(const tag of open.out.html.match(/<(?:select|input|textarea)\b[^>]*>/g)||[])assert.match(tag,/data-ui-state/);
 const draft=await run({state:open.out.state,event:{kind:'change',action:'draft:name',value:'Unsaved name'}});assert.equal(draft.out.state.drawer.draft.name,'Unsaved name');
 const denied=await run({state:draft.out.state,writable:false,event:submit({})});assert.equal(denied.changes.length,0);
 const data=structuredClone(demo);data.find((r:any)=>r.id==='ven005').version++;
 const stale=await run({data,state:draft.out.state,event:submit({})});assert.equal(stale.changes.length,0);assert.match(stale.out.html,/version changed/);assert.equal(stale.out.state.drawer.draft.name,'Unsaved name');
 const saved=await run({state:draft.out.state,event:submit({})});assert.equal(saved.changes[0].data.name,'Unsaved name');assert.equal(saved.changes[0].expectedVersion,1);
});
test('denied, unknown, truncated reads and absent fields fail closed, including orphan archives',async()=>{
 const open=await run({event:click('archive:vendors:ven005')});
 for(const args of [{denied:['bids']},{unknown:true},{short:true},{cfg:{...config,tableMap:JSON.stringify({...map,ratings:{...map.ratings,fields:{}}})}}]){
 const result=await run({...args,state:open.out.state,event:click('confirm-archive')});assert.equal(result.changes.length,0);assert.match(result.out.html,/incomplete/);
 }
 const data=demo.filter((r:any)=>r.role==='vendors');const archive=await run({data,state:open.out.state,event:click('confirm-archive')});assert.equal(archive.changes.length,1);
 const changed=structuredClone(data);changed.find((r:any)=>r.id==='ven005').version++;assert.equal((await run({data:changed,state:open.out.state,event:click('confirm-archive')})).changes.length,0);
 for(const [role,id]of [['selections','sel001'],['vendors','ven001'],['criteria','crit001']]){const o=await run({event:click('archive:'+role+':'+id)});assert.equal((await run({state:o.out.state,event:click('confirm-archive')})).changes.length,0);}
});
test('selection switches immediately, comparison pages cover extra CROs and duplicate assessments reject',async()=>{
 const changed=await run({state:{screen:'overview',selectionId:'sel001'},event:{kind:'change',action:'selection:choose',value:'sel002'}});assert.match(changed.out.html,/2026-12-04/);assert.doesNotMatch(changed.out.html,/2026-11-18/);
 const data=demo.concat(Array.from({length:6},(_,i)=>({...demo.find((r:any)=>r.id==='bid001'),id:'bid-extra-'+i})));
 const first=await run({data,state:{screen:'comparison',selectionId:'sel001'}});assert.match(first.out.html,/Page 1 of 2/);const next=await run({data,state:first.out.state,event:click('compare:next')});assert.match(next.out.html,/Page 2 of 2/);
 const o=await run({event:click('duplicate:ratings:rat001')});assert.equal(o.out.state.drawer.draft.score,'');const dup=await run({state:o.out.state,event:submit({score:4,evidence:'Evidence'})});assert.equal(dup.changes.length,0);assert.match(dup.out.html,/already rated/);
});
test('approved decisions require full evidence and freeze supporting records until reset',async()=>{
 const o=await run({state:{selectionId:'sel001'},event:click('edit:decisions:dec001')});
 const form={status:'Approved',approver:'Decision owner',approvedAt:'2026-11-01'};
 const approved=await run({state:o.out.state,event:submit(form)});assert.equal(approved.changes.length,1,approved.out.html);
 for(const args of [{denied:['ratings']},{unknown:true},{short:true}])assert.equal((await run({...args,state:o.out.state,event:submit(form)})).changes.length,0);
 const data=structuredClone(demo);data.find((r:any)=>r.id==='dec001').data.status='Approved';
 const edit=await run({data,event:click('edit:bids:bid002')});const blocked=await run({data,state:edit.out.state,event:submit({fee:42})});assert.equal(blocked.changes.length,0);assert.match(blocked.out.html,/Return the linked approved decision/);
});

test('layout-hidden evidence and approver remain editable in additional drawer fields',async()=>{
 for(const [role,field]of [['ratings','evidence'],['decisions','approver']]){const open=await run({event:click('add:'+role)});assert.match(open.out.html,/Show additional fields/);const extra=await run({state:open.out.state,event:click('draft-extra')});assert.match(extra.out.html,new RegExp('name="'+field+'"'));}
});
