import {readFile,writeFile} from 'node:fs/promises';
import {transformSync} from 'esbuild';
// Lab Inventory (life.inventory-management) 2.x: catalog JSON and the offline fictional preview, generated from templates/source/inventory-management/.
// The released 1.0.2 package is archived unchanged under archive/1.0.2/ and still built by build-inventory-template.mjs.
const root=new URL('../templates/source/inventory-management/',import.meta.url),read=n=>readFile(new URL(n,root),'utf8');
const [metadata,source,css,demo,schema]=await Promise.all(['catalog.metadata.json','lab-inventory.source.js','lab-inventory.css','demo_data.json','schema.example.json'].map(read));
// The readable source is canonical; the catalog carries it with whitespace and redundant syntax removed (identifiers unchanged) so it stays under the
// 180,000-character catalog limit with room for the host-prepended configuration. Line 1 (templateLayoutSchema) is kept verbatim.
const nl=source.indexOf('\n'),layoutLine=source.slice(0,nl);if(!layoutLine.startsWith('const templateLayoutSchema='))throw Error('Line 1 must declare templateLayoutSchema');
const pre='globalThis.__app=function(input,tools,templateConfiguration,templateBindings){';
const wrapped=transformSync(pre+source.slice(nl+1)+'\n};',{minifyWhitespace:true,minifySyntax:true,legalComments:'none'}).code.trim();
if(!wrapped.startsWith(pre)||!wrapped.endsWith('};'))throw Error('Unexpected minifier output');
const entry=JSON.parse(metadata);entry.source='const LABINVENTORY_CSS='+JSON.stringify(css)+';\n'+layoutLine+'\n'+wrapped.slice(pre.length,-2)+'\n';
const serialized=JSON.stringify(entry,null,2)+'\n';
if(Buffer.byteLength(serialized)>300000||entry.source.length>180000||css.length>50000)throw Error('Lab Inventory template exceeds catalog limits ('+entry.source.length+' source characters)');
const catalog=new URL('../../apps/'+entry.id+'-'+entry.version+'.json',root);
const preview=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lab Inventory fictional preview</title><style>${css}</style><body><div style="padding:10px 16px;background:#fff;border-bottom:1px solid #DCE4EA;font:13px Inter,Arial,sans-serif;color:#1F3D57">Fictional local demo, fixed as of 14 Nov 2026. Reviews, permissions, QR links and persistent layout use the TrialAgents host; this file contacts nobody.</div><div id="surface"></div><script>
const source=${JSON.stringify(entry.source).replaceAll('</','<\/')};
const demo=${demo};const metadata=${metadata};const schema=${schema};
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schema[role].logicalFields,writableFields:schema[role].readOnly?[]:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:role,fields:Object.values(schema[role].logicalFields)}));
const config={...metadata.defaults,demoLabel:true,asOfOverride:demo.asOf,tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
let state={},rows=demo.records.map(r=>({...r})),proposal=null,next=1;
function dispatch(event){if(event.action==='tracker:layout'){alert('Layout is managed in native TrialAgents app settings. This file demonstrates the screens only.');return;}
 const out=render({saved:true,writable:true,state,event},{call:(name,v)=>{if(name==='records.read'){let all=rows.filter(r=>r.role===v.typeId);if(v.sort){const k=v.sort.field,d=v.sort.direction==='desc'?-1:1;all=all.slice().sort((a,b)=>String(a.data[k]??'').localeCompare(String(b.data[k]??''))*d);}return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};}if(name==='records.propose'){proposal=v;return {status:'proposed'};}throw Error('Unsupported preview capability');}},config,bindings);
 state=out.state;document.getElementById('surface').innerHTML=out.html;
 if(proposal){const changes=proposal;proposal=null;if(confirm('FICTIONAL LOCAL REVIEW ONLY\\n'+JSON.stringify(changes,null,2).slice(0,3000))){if(changes.some(c=>c.kind==='update_record'&&!rows.some(r=>r.id===c.recordId&&r.version===c.expectedVersion))){alert('Stale review: a record changed since the form opened.');return;}for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-9000-'+String(next++).padStart(12,'0'),version:0,data:c.data});else{const r=rows.find(r=>r.id===c.recordId);r.data={...r.data,...c.data};r.version++;}}dispatch({kind:'open',action:''});}}
}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:(kind==='submit'&&window.__submitter?window.__submitter.value:target.value)??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit')eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();window.__submitter=e.submitter||null;eventFor('submit',e.target);});
document.addEventListener('change',e=>eventFor('change',e.target));
dispatch({kind:'open',action:''});
</script></body></html>`;
async function output(url,text){if(process.argv.includes('--check')){if(await readFile(url,'utf8')!==text)throw Error('Generated file is stale: '+url.pathname);}else await writeFile(url,text);}
await output(catalog,serialized);await output(new URL('lab-inventory.preview.html',root),preview);
console.log('Lab Inventory '+entry.version+': catalog and preview '+(process.argv.includes('--check')?'verified':'built')+' ('+entry.source.length+' source characters)');
