import {readFile,writeFile} from 'node:fs/promises';
import {tsImport} from 'tsx/esm/api';
// Contracts (life.contracts): catalog JSON and the offline fictional preview, generated from templates/source/contracts/.
// 2.0.0 (v2 app contract and kit, 7.3) is built from the folder itself; the released 1.1.1 package is built unchanged from
// archive/1.1.1/ so its JSON and preview stay byte-identical. Earlier releases (archive/1.0.0, archive/1.1.0) are no longer generated.
const check=process.argv.includes('--check');
async function output(url,text){if(check){if(await readFile(url,'utf8')!==text)throw Error('Generated file is stale: '+url.pathname);}else await writeFile(url,text);}
const files=['catalog.metadata.json','contracts.source.js','contracts.css','demo_data.json','schema.example.json'];
const apps=new URL('../templates/apps/',import.meta.url);

/* ---------- 1.1.1 (released, v1 contract): exactly the 1.1.1 build ---------- */
{
const root=new URL('../templates/source/contracts/archive/1.1.1/',import.meta.url),read=n=>readFile(new URL(n,root),'utf8');
const [metadata,source,css,demo,schema]=await Promise.all(files.map(read));
const entry=JSON.parse(metadata);entry.source='const CONTRACTS_CSS='+JSON.stringify(css)+';\n'+source;
const serialized=JSON.stringify(entry,null,2)+'\n';
if(entry.version!=='1.1.1'||Buffer.byteLength(serialized)>300000||entry.source.length>180000||css.length>50000)throw Error('Contracts 1.1.1 template exceeds catalog limits');
const preview=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Contracts fictional preview</title><style>${css}</style><body><div style="padding:10px 16px;background:#fff;border-bottom:1px solid #E1DDE8;font:13px Inter,Arial,sans-serif;color:#3D3550">Fictional local demo, fixed as of 12 Nov 2026. Documents, Claude and ChatGPT, Database review, permissions and persistent layout use the TrialAgents host.</div><div id="surface"></div><script>
const source=${JSON.stringify(entry.source).replaceAll('</','<\/')};
const demo=${demo};const metadata=${metadata};const schema=${schema};
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schema[role].logicalFields,writableFields:schema[role].readOnly?[]:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:role,fields:Object.values(schema[role].logicalFields)}));
const config={...metadata.defaults,demoLabel:true,asOfOverride:'2026-11-12',tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
let state={},rows=demo.records.map(r=>({...r})),proposal=null,next=1;
function dispatch(event){if(event.action==='tracker:layout'){alert('Layout is managed in native TrialAgents app settings. This file demonstrates the contract screens only.');return;}
 const out=render({saved:true,writable:true,state,event},{call:(name,v)=>{if(name==='records.read'){const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};}if(name==='records.propose'){proposal=v;return {status:'proposed'};}if(name==='integrations.list')return {integrations:[{role:'programs.plan_items',source:'own',offer:'install'}]};if(name.startsWith('documents.'))return {unavailable:true,message:'Documents are available in TrialAgents'};throw Error('Unsupported preview capability');}},config,bindings);
 state=out.state;document.getElementById('surface').innerHTML=out.html;
 if(proposal){const changes=proposal;proposal=null;if(confirm('FICTIONAL LOCAL REVIEW ONLY\\n'+JSON.stringify(changes,null,2).slice(0,3000))){if(changes.some(c=>c.kind==='update_record'&&!rows.some(r=>r.id===c.recordId&&r.version===c.expectedVersion))){alert('Stale review: a record changed since the form opened.');return;}for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-9000-'+String(next++).padStart(12,'0'),version:0,data:c.data});else{const r=rows.find(r=>r.id===c.recordId);r.data={...r.data,...c.data};r.version++;}}dispatch({kind:'open',action:''});}}
}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:target.value??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit')eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();eventFor('submit',e.target);});
document.addEventListener('change',e=>eventFor('change',e.target));
dispatch({kind:'open',action:''});
</script></body></html>`;
await output(new URL(entry.id+'-'+entry.version+'.json',apps),serialized);await output(new URL('contracts.preview.html',root),preview);
console.log('Contracts '+entry.version+': catalog and preview '+(check?'verified':'built'));
}

/* ---------- 2.0.0 (v2 app contract, kit) ---------- */
{
const root=new URL('../templates/source/contracts/',import.meta.url),read=n=>readFile(new URL(n,root),'utf8');
const [metadata,source,css,demo,schema]=await Promise.all(files.map(read));
const {KIT_SOURCE,kitCss}=await tsImport('../src/shared/app-kit.ts',import.meta.url);
const marker="'use trialagents v2';\n";
if(!source.startsWith(marker))throw Error('Contracts 2.x source must start with the v2 marker');
const entry=JSON.parse(metadata);
// The marker stays the first line of the body; the app's few own styles follow it.
entry.source=marker+'const CONTRACTS_CSS='+JSON.stringify(css)+';\n'+source.slice(marker.length);
const serialized=JSON.stringify(entry,null,2)+'\n';
if(!/^2\./.test(entry.version)||Buffer.byteLength(serialized)>300000||entry.source.length>240000||css.length>20000)throw Error('Contracts 2.x template exceeds catalog limits');
if(/records\.propose|<h1|<header/.test(source))throw Error('Contracts 2.x must not propose records or draw its own header');
/* The gallery preview (D40): labelled fictional demo data, the kit ahead of the app's code as the runtime adds it, and a
 * local stand-in for records.save. Nothing here reaches a workspace. */
const preview=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Contracts fictional preview</title><style>${kitCss()}${css}body{margin:0}.demo-label{padding:8px 16px;background:#fff4dc;color:#5c3d00;font:13px Inter,Arial,sans-serif;border-bottom:1px solid #e5ece9}.demo-notice{padding:8px 16px;font:13px Inter,Arial,sans-serif;background:#ecf6f2;color:#20383d}.demo-notice:empty{display:none}</style><body><div class="demo-label">Fictional demo data, fixed as of 12 Nov 2026. In TrialAgents the platform header, messages and documents surround this app.</div><div class="demo-notice" id="notice" role="status"></div><div id="surface"></div><script>
const source=${JSON.stringify(KIT_SOURCE+'\n'+entry.source).replaceAll('</','<\/')};
const demo=${demo};const metadata=${metadata};const schema=${schema};
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schema[role].logicalFields,writableFields:schema[role].readOnly?[]:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:role,fields:Object.values(schema[role].logicalFields)}));
const config={...metadata.defaults,asOfOverride:'2026-11-12',tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
let state={},rows=demo.records.map(r=>({...r})),next=1,context=null;
const page=v=>{const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset||0,(v.offset||0)+(v.limit||25)),total:all.length,limit:v.limit||25,offset:v.offset||0};};
function apply(changes){for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-9000-'+String(next++).padStart(12,'0'),version:0,data:c.data});else if(c.kind==='archive_record')rows=rows.filter(r=>r.id!==c.recordId);else{const r=rows.find(r=>r.id===c.recordId);if(r){r.data={...r.data,...c.data};r.version++;}}}}
function dispatch(event){let saves=null;
 const viewport={width:innerWidth<600?'phone':innerWidth<900?'panel':'wide',coarse:false};
 const call=(name,v)=>{if(name==='records.read')return page(v);if(name==='records.readMany')return {results:v.reads.map(page)};if(name==='records.save'){saves=v.changes;return {status:'saving',count:v.changes.length};}
  if(name==='integrations.list')return {integrations:[{role:'programs.plan_items',source:'own',offer:'install'}]};if(name==='undo.list')return {entries:[]};if(name.startsWith('documents.'))return {unavailable:true};throw Error('Not available in the preview');};
 const out=render({saved:true,writable:true,appRole:'owner',context,viewport,state,event},{call},config,bindings);
 state=out.state;context=out.context??context;document.getElementById('surface').innerHTML=out.html;document.getElementById('notice').textContent=out.notice?out.notice.message:'';
 if(saves){apply(saves);dispatch({kind:'open',action:''});if(out.notice)document.getElementById('notice').textContent=out.notice.message;}
}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:target.value??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit'&&!b.dataset.trialyDocument&&!b.dataset.trialyIntegration)eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();eventFor('submit',e.target);});
document.addEventListener('change',e=>eventFor('change',e.target));
document.addEventListener('dragstart',e=>{const c=e.target.closest('[data-drag]');if(c)e.dataTransfer.setData('text/plain',c.dataset.drag);});
document.addEventListener('dragover',e=>{if(e.target.closest('[data-drop]'))e.preventDefault();});
document.addEventListener('drop',e=>{const col=e.target.closest('[data-drop]');if(!col)return;e.preventDefault();dispatch({kind:'change',action:col.dataset.dropAction,value:e.dataTransfer.getData('text/plain')+'>'+col.dataset.drop,form:{}});});
dispatch({kind:'open',action:''});
</script></body></html>`;
await output(new URL(entry.id+'-'+entry.version+'.json',apps),serialized);await output(new URL('contracts.preview.html',root),preview);
console.log('Contracts '+entry.version+': catalog and preview '+(check?'verified':'built'));
}
