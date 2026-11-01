import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execute} from '../src/foundation/runtime.js';
import {appTemplates} from '../src/workspace/app-templates.js';
import {readCustomLayout,updateCustomLayout} from '../src/shared/custom-layout.js';
const entry=await appTemplates.read({templateId:'life.cash-runway',version:'1.2.2'});
const schemas=JSON.parse(await readFile('templates/source/cash-runway/schema.example.json','utf8'));
const demo=JSON.parse(await readFile('templates/source/cash-runway/demo_data.json','utf8')).records;
const roles=Object.keys(schemas),bindings=roles.map(typeId=>({typeId,fields:Object.values(schemas[typeId].logicalFields)}));
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schemas[role].logicalFields,writableFields:Object.keys(schemas[role].logicalFields)}]));
const cfg={...entry.defaults,tableMap:JSON.stringify(map),cutoff:'2026-09-30'};
const source=(config:any=cfg)=>`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(bindings)};\n${entry.source}`;
async function render(rows:any[]=demo,config:any=cfg,state:any={},event:any={kind:'open',action:''}){
 const changes:any[]=[];
 const output:any=await execute(source(config),{saved:true,writable:true,state,event},async(name,v:any)=>{
  if(name==='records.propose'){changes.push(...v);return {status:'proposed'};}
  assert.equal(name,'records.read');const all=rows.filter(r=>r.role===v.typeId).map(r=>({...r,data:Object.fromEntries(Object.entries(r.data).map(([k,v])=>[schemas[r.role].logicalFields[k],v]))}));return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};
 });return {output,changes};
}
const row=(id:string,kind:string,period:string,amount:number)=>({role:'ledger',id,version:0,data:{name:id,kind,period,amount,currency:'EUR'}});
test('cash template executes six screens in production QuickJS, with bounded data and exact dates',async()=>{
 for(const section of ['overview','ledger','budget','scenario','forecast','briefing']){const {output}=await render(demo,cfg,{section});assert.match(output.html,/Cash Runway/);assert.doesNotMatch(output.html,/Unable to calculate this screen/);}
 assert.match((await render()).output.html,/EUR 4,699,376/);
 const rows=[row('opening','opening','2026-09-10',1000),row('old','actual_out','2026-09-09',200),row('in-range','actual_out','2026-09-15',50),row('later','actual_out','2026-09-25',100),row('future-opening','opening','2026-10-01',9999)];
 const out=(await render(rows,{...cfg,cutoff:'2026-09-15'})).output;
 assert.match(out.html,/EUR 950/);assert.match(out.html,/2026-09-15 actuals cutoff/);assert.match(out.html,/Monthly forecast requires/);assert.doesNotMatch(out.html,/Beyond 24 months/);
 assert.match((await render(rows,{...cfg,cutoff:'2026-09-30'})).output.html,/EUR 850/);
 assert.match((await render(rows,{...cfg,cutoff:'2026-02-30'})).output.html,/Not available/);
 assert.match((await render(Array.from({length:801},(_,i)=>row(String(i),'opening','2026-09-01',1000)))).output.html,/Not available/);
});
test('draft changes retain user input and stale record version, submit only proposes',async()=>{
 const r=demo.find((r:any)=>r.role==='ledger');const start=await render(demo,cfg,{}, {kind:'click',action:'edit:ledger:'+r.id});
 const changed=await render(demo,cfg,start.output.state,{kind:'change',action:'draft:name',form:{name:'Changed draft'}});
 assert.equal(changed.changes.length,0);assert.match(changed.output.html,/value="Changed draft"/);assert.match(changed.output.html,/data-ui-state="true" data-action="draft:name"/);
 const concurrent=demo.map((x:any)=>x.id===r.id?{...x,version:x.version+1}:x);
 const submitted=await render(concurrent,cfg,changed.output.state,{kind:'submit',action:'save-record',form:{name:'Changed draft'}});
 assert.equal(submitted.changes[0].expectedVersion,r.version);assert.equal(submitted.changes[0].data.name,'Changed draft');
});
test('custom layout changes only configuration and rejects invalid scope',()=>{
 const original=source(),parsed=readCustomLayout(original)!;assert.ok(parsed);
 const profile=structuredClone(parsed.profile);profile.tabs.reverse();profile.cols.ledger.reverse();profile.heading='Board cash';
 const updated=updateCustomLayout(original,profile),next=readCustomLayout(updated)!;
 assert.deepEqual(next.profile,profile);assert.equal(updated.slice(next.prefix.length),original.slice(parsed.prefix.length));
 assert.throws(()=>updateCustomLayout(original,{...profile,tabs:['other']}));
 assert.throws(()=>updateCustomLayout(original,{...profile,visible:Object.fromEntries(profile.tabs.map(id=>[id,false]))}));
 assert.throws(()=>updateCustomLayout(original,{...profile,cols:{...profile.cols,secret:['x']}}));
});
