import {readFile,writeFile} from 'node:fs/promises';
import {KIT_SOURCE,kitCss} from '../src/shared/app-kit.ts';
// Runway (life.cash-runway). 3.x is a v2 app on the kit (G14). Released packages are archived unchanged under
// templates/source/cash-runway/archive/<version>/; 2.2.1 is rebuilt from its archive with its own recipe, so its catalog
// JSON and preview stay byte-identical (--check verifies both versions).
const check=process.argv.includes('--check');
const base=new URL('../templates/source/cash-runway/',import.meta.url);
async function output(url,text){if(check){if(await readFile(url,'utf8')!==text)throw Error('Generated file is stale: '+url.pathname);}else await writeFile(url,text);}
const files=async root=>{const read=n=>readFile(new URL(n,root),'utf8');return Promise.all(['catalog.metadata.json','cash-runway.source.js','cash-runway.css','demo_data.json','schema.example.json'].map(read));};

/* 2.2.1 (released): the 2.x recipe, unchanged. */
async function legacy(root){
const [metadata,source,css,demo,schema]=await files(root);
const entry=JSON.parse(metadata);entry.source='const CASH_RUNWAY_CSS='+JSON.stringify(css)+';\n'+source;
const serialized=JSON.stringify(entry,null,2)+'\n';
if(Buffer.byteLength(serialized)>380000||entry.source.length>240000||css.length>50000)throw Error('Template exceeds catalog limits');
const catalog=new URL('../../../../apps/'+entry.id+'-'+entry.version+'.json',root);
const preview=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Runway fictional preview</title><style>${css}</style><body><div style="padding:10px 16px;background:#fff;border-bottom:1px solid #DCE4EA;font:13px Inter,Arial,sans-serif;color:#33475A">Fictional local demo. Database review, permissions and persistent layout use the TrialAgents host.</div><div id="surface"></div><script>
const source=${JSON.stringify(entry.source).replaceAll('</','<\/')};
const demo=${demo};const metadata=${metadata};const schema=${schema};
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schema[role].logicalFields,writableFields:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:role,fields:Object.values(schema[role].logicalFields)}));
const config={...metadata.defaults,demoLabel:true,tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
let state={},rows=demo.records.map(r=>({...r})),proposal=null,next=1;
function dispatch(event){if(event.action==='tracker:layout'){alert('Layout is managed in native TrialAgents app settings. This file demonstrates the finance screens only.');return;}
 const out=render({saved:true,writable:true,state,event},{call:(name,v)=>{if(name==='records.read'){const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};}if(name==='records.propose'){proposal=v;return {status:'proposed'};}throw Error('Unsupported preview capability');}},config,bindings);
 state=out.state;document.getElementById('surface').innerHTML=out.html;
 if(proposal){const changes=proposal;proposal=null;if(confirm('FICTIONAL LOCAL REVIEW ONLY\\n'+JSON.stringify(changes,null,2).slice(0,3000))){for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-8000-'+String(next++).padStart(12,'0'),version:0,data:c.data});else{const r=rows.find(r=>r.id===c.recordId);if(r&&r.version===c.expectedVersion){r.data={...r.data,...c.data};r.version++;}}}dispatch({kind:'open',action:''});}}
}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:target.value??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit')eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();eventFor('submit',e.target);});
document.addEventListener('change',e=>eventFor('change',e.target));
dispatch({kind:'open',action:''});
</script></body></html>`;
await output(catalog,serialized);await output(new URL('cash-runway.preview.html',root),preview);
return entry.version;}

/* 3.x: v2 contract. The marker stays the first line of the body; the app's few own styles follow it. */
async function current(root){
const [metadata,source,css,demo,schema]=await files(root);
if(!source.startsWith("'use trialagents v2';\n"))throw Error('The v2 marker must be the first line of cash-runway.source.js');
const entry=JSON.parse(metadata);entry.source="'use trialagents v2';\nconst CASH_RUNWAY_CSS="+JSON.stringify(css)+';\n'+source.slice("'use trialagents v2';\n".length);
const serialized=JSON.stringify(entry,null,2)+'\n';
if(Buffer.byteLength(serialized)>380000||entry.source.length>240000||css.length>20000)throw Error('Template exceeds catalog limits');
const catalog=new URL('../../apps/'+entry.id+'-'+entry.version+'.json',root);
// D40: the gallery preview runs on clearly labelled fictional records, in the browser only; nothing is installed or sent.
const preview=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Runway fictional preview</title><style>${kitCss()}</style><body><div role="note" style="padding:8px 16px;background:#fff4dc;color:#5c3d00;font:13px Inter,Arial,sans-serif">Fictional demo data. This preview runs in your browser only; nothing is saved or sent.</div><div id="surface"></div><script>
const source=${JSON.stringify(KIT_SOURCE+'\n'+entry.source).replaceAll('</','<\/')};
const demo=${demo};const metadata=${metadata};const schema=${schema};
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schema[role].logicalFields,writableFields:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:role,fields:Object.values(schema[role].logicalFields)}));
const config={...metadata.defaults,tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
let state={},rows=demo.records.map(r=>({...r,data:{...r.data}})),next=1,saved=null;
const read=v=>{const all=rows.filter(r=>r.role===v.typeId&&Object.entries(v.filters||{}).every(([k,x])=>String(r.data[k])===String(x))&&(!v.q||JSON.stringify(r.data).toLowerCase().includes(String(v.q).toLowerCase())));if(v.sort){const k=v.sort.field,d=v.sort.direction==='desc'?-1:1;all.sort((a,b)=>String(a.data[k]??'').localeCompare(String(b.data[k]??''))*d);}return {rows:all.slice(v.offset||0,(v.offset||0)+(v.limit||25)),total:all.length};};
const tools={call:(name,v)=>{
 if(name==='records.read')return read(v);
 if(name==='records.readMany')return {results:v.reads.map(read)};
 if(name==='records.summarize'){const all=rows.filter(r=>r.role===v.typeId),g={};for(const r of all){const k=String(r.data[v.groupBy]??'');g[k]=(g[k]||0)+1;}return {totals:{count:all.length},groups:Object.entries(g).map(([label,count])=>({label,count}))};}
 if(name==='integrations.list')return {integrations:[]};
 if(name==='undo.list')return {actions:[]};
 if(name==='records.save'){saved=v.changes;return {status:'saving',count:v.changes.length};}
 throw Error('Unavailable in the preview');}};
function apply(changes){for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-8000-'+String(next++).padStart(12,'0'),version:0,data:c.data});else if(c.kind==='archive_record')rows=rows.filter(r=>r.id!==c.recordId);else{const r=rows.find(r=>r.id===c.recordId);if(r){r.data={...r.data,...c.data};r.version++;}}}}
function dispatch(event){saved=null;const out=render({saved:true,writable:true,appRole:'owner',context:null,viewport:{width:innerWidth<600?'phone':innerWidth<900?'panel':'wide'},state,event},tools,config,bindings);
 state=out.state;document.getElementById('surface').innerHTML='<style>'+out.css+'</style>'+out.html;
 if(saved){apply(saved);dispatch({kind:'open',action:''});}}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:target.value??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit')eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();eventFor('submit',e.target);});
document.addEventListener('change',e=>eventFor('change',e.target));
dispatch({kind:'open',action:''});
</script></body></html>`;
await output(catalog,serialized);await output(new URL('cash-runway.preview.html',root),preview);
return entry.version;}

const old=await legacy(new URL('archive/2.2.1/',base)),now=await current(base);
console.log('Runway '+old+' and '+now+': catalog and preview '+(check?'verified':'built'));
