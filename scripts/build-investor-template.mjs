import {readFile,writeFile} from 'node:fs/promises';
import {transformSync} from 'esbuild';
// Fundraise (life.investor-crm). 3.x is built from templates/source/investor-crm/ (the v2 app contract on the platform kit);
// the released 2.0.1 package is archived unchanged under archive/2.0.1/ and rebuilt from there byte-identically.
// The released Investor CRM 1.0.1 and Fundraise 2.0.0 files are archived under archive/1.0.1/ and archive/2.0.0/;
// their catalog JSON is immutable and no longer generated.
const check=process.argv.includes('--check');
async function output(url,text){if(check){if(await readFile(url,'utf8')!==text)throw Error('Generated file is stale: '+url.pathname);}else await writeFile(url,text);}
const base=new URL('../templates/source/investor-crm/',import.meta.url);

/* ---------- 2.0.1 (archived, v1 contract): exactly the released build ---------- */
{
const root=new URL('archive/2.0.1/',base),read=n=>readFile(new URL(n,root),'utf8');
const [metadata,source,css,demo,schema]=await Promise.all(['catalog.metadata.json','fundraise.source.js','fundraise.css','demo_data.json','schema.example.json'].map(read));
const entry=JSON.parse(metadata);entry.source='const FUNDRAISE_CSS='+JSON.stringify(css)+';\n'+source;
// E7 read-only helpers: source lives in functions/*.js and is inlined into the immutable catalog entry.
entry.functions=await Promise.all((entry.functions??[]).map(async({sourceFile,...f})=>({...f,source:(await read(sourceFile)).trim()})));
const serialized=JSON.stringify(entry,null,2)+'\n';
if(entry.version!=='2.0.1')throw Error('archive/2.0.1 must hold Fundraise 2.0.1');
if(Buffer.byteLength(serialized)>300000||entry.source.length>180000||css.length>50000)throw Error('Fundraise template exceeds catalog limits');
const catalog=new URL('../../../../apps/'+entry.id+'-'+entry.version+'.json',root);
const preview=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fundraise fictional preview</title><style>${css}</style><body><div style="padding:10px 16px;background:#fff;border-bottom:1px solid #DCE4EA;font:13px Inter,Arial,sans-serif;color:#2E4A45">Fictional local demo, fixed as of 11 Nov 2026. Database review, permissions, integrations and persistent layout use the TrialAgents host.</div><div id="surface"></div><script>
const source=${JSON.stringify(entry.source).replaceAll('</','<\/')};
const demo=${demo};const metadata=${metadata};const schema=${schema};
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schema[role].logicalFields,writableFields:schema[role].readOnly?[]:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:role,fields:Object.values(schema[role].logicalFields)}));
const config={...metadata.defaults,demoLabel:true,asOfOverride:'2026-11-11',tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
let state={},rows=demo.records.map(r=>({...r})),proposal=null,next=1;
function dispatch(event){if(event.action==='tracker:layout'){alert('Layout is managed in native TrialAgents app settings. This file demonstrates the screens only.');return;}
 const out=render({saved:true,writable:true,state,event},{call:(name,v)=>{if(name==='records.read'){const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};}if(name==='integrations.list')return {integrations:[]};if(name==='records.propose'){proposal=v;return {status:'proposed'};}throw Error('Unsupported preview capability');}},config,bindings);
 state=out.state;document.getElementById('surface').innerHTML=out.html;
 if(proposal){const changes=proposal;proposal=null;if(confirm('FICTIONAL LOCAL REVIEW ONLY\\n'+JSON.stringify(changes,null,2).slice(0,3000))){if(changes.some(c=>c.kind==='update_record'&&!rows.some(r=>r.id===c.recordId&&r.version===c.expectedVersion))){alert('Stale review: a record changed since the form opened.');return;}for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-9100-'+String(next++).padStart(12,'0'),version:0,data:c.data});else{const r=rows.find(r=>r.id===c.recordId);r.data={...r.data,...c.data};r.version++;}}dispatch({kind:'open',action:''});}}
}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:target.value??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit')eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();eventFor('submit',e.target);});
document.addEventListener('change',e=>eventFor('change',e.target));
dispatch({kind:'open',action:''});
</script></body></html>`;
await output(catalog,serialized);await output(new URL('fundraise.preview.html',root),preview);
console.log('Fundraise '+entry.version+': catalog and preview '+(check?'verified':'built'));
}

/* ---------- 3.x (v2 contract on the platform kit) ---------- */
{
const root=base,read=n=>readFile(new URL(n,root),'utf8');
const [metadata,source,css,demo,schema]=await Promise.all(['catalog.metadata.json','fundraise.source.js','fundraise.css','demo_data.json','schema.example.json'].map(read));
// The v2 marker must be the first line of the body (after the host's configuration lines); the app's own styles follow it.
const nl=source.indexOf('\n'),marker=source.slice(0,nl);if(marker!=="'use trialagents v2';")throw Error("Line 1 must be 'use trialagents v2';");
if(/records\.propose|<header|<h1/.test(source))throw Error('A v2 Fundraise source never proposes records or draws its own header');
const entry=JSON.parse(metadata);entry.source=marker+'\nconst FUNDRAISE_CSS='+JSON.stringify(css)+';\n'+source.slice(nl+1);
entry.functions=await Promise.all((entry.functions??[]).map(async({sourceFile,...f})=>({...f,source:(await read(sourceFile)).trim()})));
const serialized=JSON.stringify(entry,null,2)+'\n';
if(Buffer.byteLength(serialized)>300000||entry.source.length>240000||css.length>20000)throw Error('Fundraise template exceeds catalog limits ('+entry.source.length+' source characters)');
const catalog=new URL('../../apps/'+entry.id+'-'+entry.version+'.json',root);
// The gallery preview runs the same code with the kit the runtime adds, on labelled fictional records (D40).
const kitModule=transformSync(await readFile(new URL('../src/shared/app-kit.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm'}).code;
const {KIT_SOURCE,kitCss}=await import('data:text/javascript;base64,'+Buffer.from(kitModule).toString('base64'));
const styles=kitCss()+css;
const preview=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fundraise fictional preview</title><style>${styles.replaceAll('</','<\/')}#fr-demo{display:flex;gap:12px;flex-wrap:wrap;align-items:center;padding:8px 16px;background:#fff;border-bottom:1px solid #e5ece9;font:13px Inter,Arial,sans-serif;color:#20383d}#fr-demo output{color:#0a8065;font-weight:600}</style><body><div id="fr-demo"><strong>Fictional demo data</strong><span>Fixed as of 11 Nov 2026. Edits stay in this page.</span><output id="fr-notice"></output></div><div id="surface"></div><script>
const source=${JSON.stringify(KIT_SOURCE+'\n'+entry.source).replaceAll('</','<\/')};
const demo=${demo};const metadata=${metadata};const schema=${schema};
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schema[role].logicalFields,writableFields:schema[role].readOnly?[]:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:role,fields:Object.values(schema[role].logicalFields)}));
const config={...metadata.defaults,asOfOverride:'2026-11-11',tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
let state=null,context=null,rows=demo.records.map(r=>({...r})),next=1;
const read=v=>{const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset||0,(v.offset||0)+(v.limit||25)),total:all.length};};
function apply(changes){for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-9100-'+String(next++).padStart(12,'0'),version:0,data:c.data});else if(c.kind==='archive_record')rows=rows.filter(r=>r.id!==c.recordId);else{const r=rows.find(r=>r.id===c.recordId);if(!r||r.version!==c.expectedVersion)throw Error('Someone changed this record first.');r.data={...r.data,...c.data};r.version++;}}}
function dispatch(event){let saved=null;
 const tools={call:(name,v)=>{if(name==='records.read')return read(v);if(name==='records.readMany')return {results:v.reads.map(read)};if(name==='integrations.list')return {integrations:[]};if(name==='records.save'){saved=v.changes;return {status:'saving',count:v.changes.length};}throw Error('Not available in this preview');}};
 const width=innerWidth<560?'phone':innerWidth<900?'panel':'wide';
 let out=render({saved:true,writable:true,appRole:'owner',context,viewport:{width,coarse:false},state,event},tools,config,bindings);
 if(saved){try{apply(saved);}catch(e){out={...out,notice:{kind:'error',message:e.message}};}const n=out.notice;out=render({saved:true,writable:true,appRole:'owner',context:out.context,viewport:{width,coarse:false},state:out.state,event:{kind:'open',action:'',value:null,form:{}}},tools,config,bindings);if(n)out.notice=n;}
 state=out.state;context=out.context??context;document.getElementById('surface').innerHTML=out.html;document.getElementById('fr-notice').textContent=out.notice?out.notice.message:'';
}
function eventFor(kind,target,value){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:value!==undefined?value:target.type==='checkbox'?target.checked:target.value??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit')eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();eventFor('submit',e.target);});
document.addEventListener('change',e=>{if(e.target.matches('[data-action]'))eventFor('change',e.target);});
let dragged=null;
document.addEventListener('dragstart',e=>{const c=e.target.closest&&e.target.closest('[data-drag]');dragged=c?c.dataset.drag:null;});
document.addEventListener('dragover',e=>{if(dragged&&e.target.closest('[data-drop]'))e.preventDefault();});
document.addEventListener('drop',e=>{const col=e.target.closest('[data-drop]');if(!dragged||!col)return;e.preventDefault();const id=dragged;dragged=null;dispatch({kind:'change',action:col.dataset.dropAction,value:id+'>'+col.dataset.drop,form:{}});});
dispatch({kind:'open',action:'',value:null,form:{}});
</script></body></html>`;
await output(catalog,serialized);await output(new URL('fundraise.preview.html',root),preview);
console.log('Fundraise '+entry.version+': catalog and preview '+(check?'verified':'built'));
}
