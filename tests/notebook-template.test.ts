import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {appTemplates} from '../src/workspace/app-templates.js';import {execute} from '../src/foundation/runtime.js';import {readCustomLayout} from '../src/shared/custom-layout.js';import {fieldSchema} from '../src/shared/schema.js';
const entry=await appTemplates.read({templateId:'life.experiment-notebook'}),root='templates/source/experiment-notebook/';
const schemas=JSON.parse(await readFile(root+'schema_mapping.example.json','utf8')),demo=JSON.parse(await readFile(root+'demo_data.json','utf8')).records;
const bindings=Object.entries(schemas).map(([role,s]:any)=>({typeId:role,fields:s.fields.map((f:any)=>f.key)}));
const map=Object.fromEntries(Object.entries(schemas).map(([role,s]:any)=>[role,{typeId:role,fields:s.logicalFields,writableFields:Object.keys(s.logicalFields)}]));
const config={...entry.defaults,tableMap:JSON.stringify(map),asOf:'2026-11-01',sponsorScope:'Meridian Cell Therapeutics (fictional)'};
async function run({data=demo,state={},event={kind:'open'},denied=[],cfg=config,short=false,unknown=false,writable=true}:any={}){const changes:any[]=[];const out:any=await execute(`const templateConfiguration=${JSON.stringify(cfg)};\nconst templateBindings=${JSON.stringify(bindings)};\n${entry.source}`,{state,event,saved:true,writable},async(n,v:any)=>{if(n==='records.propose'){changes.push(...v);return {status:'proposed'};}assert.equal(n,'records.read');if(denied.includes(v.typeId))return {unavailable:true,total:null,rows:[]};const all=data.filter((r:any)=>r.role===v.typeId).map((r:any)=>({...r,data:Object.fromEntries(Object.entries(r.data).map(([k,value])=>[schemas[v.typeId].logicalFields[k],value]))}));return {rows:all.slice(v.offset,v.offset+(short?1:v.limit)),total:unknown?null:all.length};});return {out,changes};}

const click=(action:string)=>({kind:'click',action}),submit=(form:any)=>({kind:'submit',action:'save',form});
test('whole catalog, scalar schemas, native layout and production design gate',async()=>{
 assert.equal(entry.version,'1.2.2');assert.ok((await appTemplates.list()).templates.some(t=>t.id===entry.id));
 for(const s of Object.values(schemas) as any[])for(const f of s.fields){assert.ok(fieldSchema.safeParse(f).success);assert.equal(f.multiple,false);}
 assert.ok(readCustomLayout('const templateConfiguration='+JSON.stringify(config)+';\n'+entry.source));
 const frames=[];for(const tab of ['overview','directory','entry','protocols','results','summary']){const {out}=await run({state:{tab,project:'proj-cell',experiment:'exp-001'}});assert.equal((out.html.match(/<h1>/g)||[]).length,1);for(const tag of out.html.match(/<(?:select|input|textarea)\b[^>]*>/g)||[])assert.match(tag,/data-ui-state/);frames.push({name:tab,html:out.html,css:out.css});}
 const {inspectAppDesign}=await import('../src/workspace/design-quality.js');assert.deepEqual((await inspectAppDesign(frames)).issues,[]);
});
test('empty start, retained submission drafts, denied and incomplete sources',async()=>{
 assert.match((await run({data:[]})).out.html,/data-action="new:projects"/);
 const opened=await run({data:[],event:click('new:projects')});
 const saved=await run({data:[],state:opened.out.state,event:submit({name:'Lab project'})});assert.equal(saved.changes.length,1);assert.equal(saved.out.state.editor.draft.name,'Lab project');
 for(const args of [{denied:['experiments']},{unknown:true},{short:true},{cfg:{...config,tableMap:JSON.stringify({...map,experiments:{...map.experiments,fields:{}}})}},{writable:false}]){const result=await run({...args,state:opened.out.state,event:submit({name:'Retained'})});assert.equal(result.changes.length,0);assert.ok(result.out.state.editor);}
});
test('archive preserves original version and rechecks new dependencies',async()=>{
 const data=demo.filter((r:any)=>r.role==='projects');const id=data[0].id;
 const opened=await run({data,event:click('delete:projects:'+id)});assert.equal(opened.out.state.confirm.expectedVersion,1);
 const changed=structuredClone(data);changed[0].version++;
 const stale=await run({data:changed,state:opened.out.state,event:click('confirm-delete')});assert.equal(stale.changes.length,0);assert.match(stale.out.html,/version changed/);
 const linked=await run({state:opened.out.state,event:click('confirm-delete')});assert.equal(linked.changes.length,0);
 const valid=await run({data,state:opened.out.state,event:click('confirm-delete')});assert.equal(valid.changes[0].expectedVersion,1);
});
test('reviewed evidence freezes, original editor versions and draft errors',async()=>{
 const o=await run({event:click('edit:measurements:m-erk-vehicle-1')});const blocked=await run({state:o.out.state,event:submit({value:900})});assert.equal(blocked.changes.length,0);assert.match(blocked.out.html,/Return/);assert.equal(blocked.out.state.editor.draft.value,900);
 const data=demo.filter((r:any)=>r.role==='projects');const edit=await run({data,event:click('edit:projects:'+data[0].id)});const changed=structuredClone(data);changed[0].version++;
 const stale=await run({data:changed,state:edit.out.state,event:submit({name:'Retain me'})});assert.equal(stale.changes.length,0);assert.match(stale.out.html,/version changed/);assert.equal(stale.out.state.editor.draft.name,'Retain me');
});
test('layout column order affects actual tables and form fields',async()=>{
 const cfg={...config,layoutProfile:JSON.stringify({cols:{experiments:['scientist','name','code']},visible:{'experiments:code':false}})};
 const out=(await run({cfg,state:{tab:'directory'}})).out;
 assert.ok(out.html.indexOf('<th>Scientist</th>')<out.html.indexOf('<th>Experiment title</th>'));
 const editor=(await run({cfg,event:click('new:experiments')})).out;assert.match(editor.html,/Show additional fields/);const extra=(await run({cfg,state:editor.state,event:click('draft-extra')})).out;assert.match(extra.html,/name="code"/);
});
test('unknown totals and invalid multiple values never produce authoritative stats',async()=>{
 const missing=await run({unknown:true,state:{tab:'results'}});assert.match(missing.out.html,/No assay chart calculated/);
 const data=structuredClone(demo);data.find((r:any)=>r.role==='measurements').data.value=[10,20];assert.match((await run({data,state:{tab:'results'}})).out.html,/No assay chart calculated/);
});
test('numeric summaries separate time points and reject duplicate blank-time evidence',async()=>{
 const data=structuredClone(demo);const base=data.find((r:any)=>r.id==='m-erk-vehicle-1');
 data.push({...base,id:'later',data:{...base.data,timePoint:'Later',value:1000,replicate:'Later'}});
 const result=await run({data,state:{tab:'results',project:'proj-cell',experiment:'exp-001'}});assert.match(result.out.html,/1000.00/);assert.match(result.out.html,/100.33/);
});
test('partial write permission retains required readonly values without proposing them',async()=>{
 const cfg={...config,tableMap:JSON.stringify({...map,experiments:{...map.experiments,writableFields:['name','notes']}})};
 const data=demo.filter((r:any)=>!['reports','interpretations'].includes(r.role)).map((r:any)=>r.role==='experiments'?{...r,data:{...r.data,status:'Running'}}:r);
 const edit=await run({cfg,data,event:click('edit:experiments:exp-001')});const result=await run({cfg,data,state:edit.out.state,event:submit({name:'Renamed',notes:'Updated'})});assert.equal(result.changes.length,1);assert.deepEqual(Object.keys(result.changes[0].data).sort(),['name','notes']);
});
test('large evidence windows stay incomplete; measurement registers reach later pages',async()=>{
 const base=demo.find((r:any)=>r.role==='measurements');const data=demo.concat(Array.from({length:80},(_,i)=>({...base,id:'page-'+i,data:{...base.data,replicate:'page-'+i}})));
 const first=await run({data,state:{tab:'results',project:'proj-cell',experiment:'exp-001'}});assert.match(first.out.html,/Page 1 of/);
 const second=await run({data,state:first.out.state,event:click('next')});assert.match(second.out.html,/Page 2 of/);
 const huge=data.concat(Array.from({length:701},(_,i)=>({...base,id:'huge-'+i})));assert.match((await run({data:huge,state:{tab:'results'}})).out.html,/No assay chart calculated/);
});
test('blank time point duplicate keys normalize and reviewed records can explicitly reset',async()=>{
 const data=demo.filter((r:any)=>!['reports','interpretations'].includes(r.role)).map((r:any)=>r.role==='experiments'?{...r,data:{...r.data,status:'Running'}}:r.role==='measurements'?{...r,data:{...r.data,timePoint:null}}:r);
 const base=data.find((r:any)=>r.id==='m-erk-vehicle-1');const open=await run({data,event:click('new:measurements')});const duplicate=await run({data,state:open.out.state,event:submit({...base.data,timePoint:''})});assert.equal(duplicate.changes.length,0);assert.match(duplicate.out.html,/already exists/);
 const report=demo.find((r:any)=>r.role==='reports'&&r.data.status==='Reviewed');if(report){const edit=await run({event:click('edit:reports:'+report.id)});const reset=await run({state:edit.out.state,event:submit({status:'Draft'})});assert.equal(reset.changes.length,1);assert.equal(reset.changes[0].data.approved_at,null);}
});
