import {readFile,writeFile} from 'node:fs/promises';
import {transformSync} from 'esbuild';
// CRO Selection (life.cro-selection): catalog JSON and the offline fictional preview, generated from templates/source/cro-selection/.
// 3.0.0 (the folder itself) is the rebuild on the kit and the v2 contract ('use trialagents v2'). 2.1.1 is archived unchanged under
// archive/2.1.1/ and rebuilt from there, so --check proves its released JSON and preview stay byte for byte.
// The released 1.0.1 files are archived unchanged under archive/1.0.1/ (built by build-selection-template.mjs).
// The 2.0.0 and 2.1.0 packages are archived under archive/2.0.0/ and archive/2.1.0/; their catalog JSON files are not rebuilt.
const base=new URL('../templates/source/cro-selection/',import.meta.url);
const check=process.argv.includes('--check');
async function output(url,text){if(check){if(await readFile(url,'utf8')!==text)throw Error('Generated file is stale: '+url.pathname);}else await writeFile(url,text);}
const minify=body=>{const pre='globalThis.__app=function(input,tools,templateConfiguration,templateBindings){';
 const wrapped=transformSync(pre+body+'\n};',{minifyWhitespace:true,minifySyntax:true,legalComments:'none'}).code.trim();
 if(!wrapped.startsWith(pre)||!wrapped.endsWith('};'))throw Error('Unexpected minifier output');return wrapped.slice(pre.length,-2);};

/* ---------- 2.1.1 (released, v1): exactly the 2.1.1 builder, reading the archived package ---------- */
async function buildV1(root){
 const read=n=>readFile(new URL(n,root),'utf8');
 const [metadata,source,css,demo,schema]=await Promise.all(['catalog.metadata.json','cro-selection.source.js','cro-selection.css','demo_data.json','schema.example.json'].map(read));
 const nl=source.indexOf('\n'),nl2=source.indexOf('\n',nl+1),layoutLine=source.slice(0,nl),commandsLine=source.slice(nl+1,nl2);
 if(!layoutLine.startsWith('const templateLayoutSchema='))throw Error('Line 1 must declare templateLayoutSchema');
 if(!commandsLine.startsWith('const appCommands=')||!commandsLine.endsWith(';'))throw Error('Line 2 must declare appCommands on one line');
 const entry=JSON.parse(metadata);entry.source='const CROSELECTION_CSS='+JSON.stringify(css)+';\n'+layoutLine+'\n'+commandsLine+'\n'+minify(source.slice(nl2+1))+'\n';
 const serialized=JSON.stringify(entry,null,2)+'\n';
 if(Buffer.byteLength(serialized)>300000||entry.source.length>240000||css.length>50000)throw Error('CRO Selection template exceeds catalog limits ('+entry.source.length+' source characters)');
 const preview=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CRO Selection fictional preview</title><style>${css}</style><body><div style="padding:10px 16px;background:#fff;border-bottom:1px solid #DCE4EA;font:13px Inter,Arial,sans-serif;color:#1F3D57">Fictional local demo, fixed as of 13 Nov 2026 (CRO Selection 2.1.0). Supplier pages, emails, documents, Database review, permissions and persistent layout use the TrialAgents host; this file contacts nobody.</div><div id="surface"></div><script>
const source=${JSON.stringify(entry.source).replaceAll('</','<\/')};
const demo=${demo};const metadata=${metadata};const schema=${schema};
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schema[role].logicalFields,writableFields:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:role,fields:Object.values(schema[role].logicalFields)}));
const config={...metadata.defaults,demoLabel:true,asOfOverride:demo.asOf,tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
const X=demo.exchange;let state={},rows=demo.records.map(r=>({...r})),proposal=null,next=1;
function exchange(name,v){if(name==='exchange.list')return {groups:X.groups.filter(g=>(!v.groupId||g.id===v.groupId)&&(!v.appRef||g.appRef===v.appRef)),nextOffset:null};
 if(name==='exchange.status'){for(const g of X.groups)for(const e of g.exchanges)if(e.id===v.exchangeId)return {exchangeId:e.id,recordId:e.recordId,status:e.status};throw Error('not found');}
 if(name==='exchange.listSubmissions')return {submissions:X.submissions.filter(s=>s.groupId===v.groupId),nextOffset:null};
 if(name==='exchange.listMessages')return {messages:X.messages.filter(m=>!v.groupId||m.groupId===v.groupId).slice().reverse(),nextOffset:null};
 if(name==='exchange.listEmails')return {emails:X.emails.filter(m=>m.groupId===v.groupId),nextOffset:null};
 if(name==='exchange.defaultEmail')return {unavailable:true};
 if(name==='exchange.prepareEmail')throw Error('The send review needs the TrialAgents host. This preview sends nothing.');
 return {status:'review_required'};}
function dispatch(event){if(event.action==='tracker:layout'){alert('Layout is managed in native TrialAgents app settings. This file demonstrates the screens only.');return;}
 const out=render({saved:true,writable:true,state,event},{call:(name,v)=>{if(name==='records.read'){const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};}if(name==='records.propose'){proposal=v;return {status:'proposed'};}if(name.startsWith('exchange.')){if(!name.match(/^exchange\\.(list|status|listSubmissions|listMessages|listEmails|defaultEmail|prepareEmail)$/))alert('FICTIONAL LOCAL PREVIEW: '+name+' would be shown for review in TrialAgents. Nothing is sent.');return exchange(name,v);}if(name==='documents.list')return {documents:demo.documents,total:demo.documents.length,complete:true};throw Error('Unsupported preview capability');}},config,bindings);
 state=out.state;document.getElementById('surface').innerHTML=out.html;
 if(proposal){const changes=proposal;proposal=null;if(confirm('FICTIONAL LOCAL REVIEW ONLY\\n'+JSON.stringify(changes,null,2).slice(0,3000))){if(changes.some(c=>c.kind==='update_record'&&!rows.some(r=>r.id===c.recordId&&r.version===c.expectedVersion))){alert('Stale review: a record changed since the form opened.');return;}for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-9000-'+String(next++).padStart(12,'0'),version:0,data:c.data});else{const r=rows.find(r=>r.id===c.recordId);r.data={...r.data,...c.data};r.version++;}}dispatch({kind:'open',action:''});}}
}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:target.value??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit'&&!b.dataset.trialyDocument)eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();eventFor('submit',e.target);});
document.addEventListener('change',e=>eventFor('change',e.target));
dispatch({kind:'open',action:''});
</script></body></html>`;
 await output(new URL('../../../../apps/'+entry.id+'-'+entry.version+'.json',root),serialized);await output(new URL('cro-selection.preview.html',root),preview);
 return entry.version;
}

/* ---------- 3.0.0 (v2 contract, kit) ---------- */
// The kit (src/shared/app-kit.ts) is read from the platform source, so the preview shows exactly what the runtime adds.
const kitModule=await import('data:text/javascript;base64,'+Buffer.from(transformSync(await readFile(new URL('../src/shared/app-kit.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm'}).code).toString('base64'));
async function buildV2(root){
 const read=n=>readFile(new URL(n,root),'utf8');
 const [metadata,source,css,demo,schema]=await Promise.all(['catalog.metadata.json','cro-selection.source.js','cro-selection.css','demo_data.json','schema.example.json'].map(read));
 const lines=source.split('\n');
 // Line 1: the v2 marker (the runtime looks for it in the first lines after the generated configuration). Line 2: templateLayoutSchema
 // (form and column layout an assistant may change through layout.save). Line 3: appCommands, read by the host as data. All verbatim.
 if(lines[0]!=="'use trialagents v2';")throw Error("Line 1 must be 'use trialagents v2';");
 if(!lines[1].startsWith('const templateLayoutSchema='))throw Error('Line 2 must declare templateLayoutSchema');
 if(!lines[2].startsWith('const appCommands=')||!lines[2].endsWith(';'))throw Error('Line 3 must declare appCommands on one line');
 const entry=JSON.parse(metadata);
 entry.source=lines[0]+'\n'+lines[1]+'\n'+lines[2]+'\nconst CROSELECTION_CSS='+JSON.stringify(css)+';\n'+minify(lines.slice(3).join('\n'))+'\n';
 const serialized=JSON.stringify(entry,null,2)+'\n';
 if(Buffer.byteLength(serialized)>300000||entry.source.length>240000||css.length>20000)throw Error('CRO Selection template exceeds catalog limits ('+entry.source.length+' source characters)');
 const preview=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CRO Selection fictional preview</title><style>${kitModule.kitCss()}${css}html,body{height:auto}</style><body><p style="margin:0;padding:8px 16px;background:#fff;border-bottom:1px solid #e5ece9;font:13px Inter,Arial,sans-serif;color:#20383d">Fictional demo data, fixed as of ${demo.asOf} (CRO Selection ${entry.version}). This file contacts nobody: supplier pages, emails and the send review need TrialAgents.</p><div id="surface"></div><script>
const source=${JSON.stringify(kitModule.KIT_SOURCE+'\n'+entry.source).replaceAll('</','<\/')};
const demo=${demo};const metadata=${metadata};const schema=${schema};
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schema[role].logicalFields,writableFields:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:role,fields:Object.values(schema[role].logicalFields)}));
const config={...metadata.defaults,asOfOverride:demo.asOf,tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
const X=demo.exchange;let state={},rows=demo.records.map(r=>({...r})),next=1;
function exchange(name,v){if(name==='exchange.list')return {groups:X.groups.filter(g=>(!v.groupId||g.id===v.groupId)&&(!v.appRef||g.appRef===v.appRef)),nextOffset:null};
 if(name==='exchange.status'){for(const g of X.groups)for(const e of g.exchanges)if(e.id===v.exchangeId)return {exchangeId:e.id,recordId:e.recordId,status:e.status};throw Error('not found');}
 if(name==='exchange.listSubmissions')return {submissions:X.submissions.filter(s=>s.groupId===v.groupId),nextOffset:null};
 if(name==='exchange.listMessages')return {messages:X.messages.filter(m=>!v.groupId||m.groupId===v.groupId).slice().reverse(),nextOffset:null};
 if(name==='exchange.listEmails')return {emails:X.emails.filter(m=>m.groupId===v.groupId),nextOffset:null};
 if(name==='exchange.defaultEmail')return {unavailable:true};
 if(name==='exchange.prepareEmail')throw Error('The send review needs TrialAgents. This preview sends nothing.');
 alert('Fictional preview: TrialAgents would show this for confirmation. Nothing is sent.');return {status:'review_required'};}
const read=v=>{const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset,v.offset+v.limit).map(r=>({id:r.id,version:r.version,data:r.data})),total:all.length,limit:v.limit,offset:v.offset};};
function save(changes){for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-9000-'+String(next++).padStart(12,'0'),version:1,data:c.data});else{const r=rows.find(x=>x.id===c.recordId);if(!r)continue;if(c.kind==='archive_record')r.data={...r.data,archived:true};else r.data={...r.data,...c.data};r.version++;}}}
let notice=null;
function dispatch(event){let saved=null;
 const out=render({saved:true,writable:true,appRole:'owner',context:null,viewport:{width:innerWidth<600?'phone':'wide',coarse:false},state,event},{call:(name,v)=>{if(name==='records.read')return read(v);if(name==='records.readMany')return {results:v.reads.map(read)};if(name==='records.save'){saved=(saved||[]).concat(v.changes);return {status:'saving',count:v.changes.length};}if(name==='undo.list')return {actions:[]};if(name.startsWith('exchange.'))return exchange(name,v);if(name==='documents.list')return {documents:demo.documents,total:demo.documents.length,complete:true};throw Error('Unavailable in this preview');}},config,bindings);
 state=out.state;document.getElementById('surface').innerHTML=out.html;if(out.notice)notice=out.notice;
 if(saved){save(saved);dispatch({kind:'open',action:''});return;}
 if(notice){const n=notice;notice=null;setTimeout(()=>alert(n.message),0);}
}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:target.value??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit'&&!b.dataset.trialyDocument)eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();eventFor('submit',e.target);});
document.addEventListener('change',e=>{if(e.target.closest('form')&&!/^(edit|f|draft|filter|query|pick-request|move)/.test(e.target.dataset.action||''))return;eventFor('change',e.target);});
dispatch({kind:'open',action:''});
</script></body></html>`;
 await output(new URL('../../apps/'+entry.id+'-'+entry.version+'.json',root),serialized);await output(new URL('cro-selection.preview.html',root),preview);
 return entry.version;
}
const built=[await buildV1(new URL('archive/2.1.1/',base)),await buildV2(base)];
console.log('CRO Selection '+built.join(' and ')+': catalog and preview '+(check?'verified':'built'));
