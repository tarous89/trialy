import {readFile,writeFile} from 'node:fs/promises';
import {transformSync} from 'esbuild';
import {tsImport} from 'tsx/esm/api';
// Partnerships (life.partnership-tracker): catalog JSON and the offline fictional preview of every version this builder owns.
//  - 3.0.0 (draft, v2 app contract on the shared kit) from templates/source/partnership-tracker/.
//  - 2.2.1 (published) from templates/source/partnership-tracker/archive/2.2.1/, byte-identical to its released JSON.
// Earlier releases are archived unchanged (2.0.0, 2.1.0, 2.2.0 under archive/; 1.1.1 is built by build-partnership-template.mjs).
const base=new URL('../templates/source/partnership-tracker/',import.meta.url);
const check=process.argv.includes('--check');
async function output(url,text){if(check){if(await readFile(url,'utf8')!==text)throw Error('Generated file is stale: '+url.pathname);}else await writeFile(url,text);}
const PRE='globalThis.__app=function(input,tools,templateConfiguration,templateBindings){';
// The readable source is canonical; the catalog carries it with whitespace and redundant syntax removed (identifiers unchanged).
function minify(body){const wrapped=transformSync(PRE+body+'\n};',{minifyWhitespace:true,minifySyntax:true,legalComments:'none'}).code.trim();if(!wrapped.startsWith(PRE)||!wrapped.endsWith('};'))throw Error('Unexpected minifier output');return wrapped.slice(PRE.length,-2);}
const commandsLine=line=>{if(!/^const appCommands=\[.*\];$/.test(line))throw Error('The app commands line must declare appCommands');JSON.parse(line.slice(18,-1));return line;};

/* 2.2.1: the released v1 build, unchanged. */
async function build221(){
 const root=new URL('archive/2.2.1/',base),read=n=>readFile(new URL(n,root),'utf8');
 const [metadata,source,css,demo,schema]=await Promise.all(['catalog.metadata.json','partnerships.source.js','partnerships.css','demo_data.json','schema.example.json'].map(read));
 const nl=source.indexOf('\n'),layoutLine=source.slice(0,nl);if(!layoutLine.startsWith('const templateLayoutSchema='))throw Error('Line 1 must declare templateLayoutSchema');
 const nl2=source.indexOf('\n',nl+1),cmds=commandsLine(source.slice(nl+1,nl2));
 const entry=JSON.parse(metadata);entry.source='const PARTNERSHIPS_CSS='+JSON.stringify(css)+';\n'+layoutLine+'\n'+cmds+'\n'+minify(source.slice(nl2+1))+'\n';
 const serialized=JSON.stringify(entry,null,2)+'\n';
 if(Buffer.byteLength(serialized)>380000||entry.source.length>240000||css.length>50000)throw Error('Partnerships template exceeds catalog limits ('+entry.source.length+' source characters)');
 const preview=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Partnerships fictional preview</title><style>${css}</style><body><div style="padding:10px 16px;background:#fff;border-bottom:1px solid #DCE4EA;font:13px Inter,Arial,sans-serif;color:#1F3D57">Fictional local demo, fixed as of 14 Nov 2026. Reviews, documents, Contracts and Data Room links, automations, permissions and persistent layout use the TrialAgents host; this file contacts nobody and sends nothing.</div><div id="surface"></div><script>
const source=${JSON.stringify(entry.source).replaceAll('</','<\/')};
const demo=${demo};const metadata=${metadata};const schema=${schema};
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schema[role].logicalFields,writableFields:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:role,fields:Object.values(schema[role].logicalFields)}));
const config={...metadata.defaults,demoLabel:true,asOfOverride:demo.asOf,tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
let state={},rows=demo.records.map(r=>({...r})),proposal=null,next=1;
function dispatch(event){if(event.action==='tracker:layout'){alert('Layout is managed in native TrialAgents app settings. This file demonstrates the screens only.');return;}
 const out=render({saved:true,writable:true,state,event},{call:(name,v)=>{if(name==='records.read'){const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};}if(name==='records.propose'){proposal=v;return {status:'proposed'};}if(name==='documents.list')return {documents:demo.documents,total:demo.documents.length,complete:true};if(name==='integrations.list')return {integrations:[]};throw Error('Unsupported preview capability');}},config,bindings);
 state=out.state;document.getElementById('surface').innerHTML=out.html;
 if(proposal){const changes=proposal;proposal=null;if(confirm('FICTIONAL LOCAL REVIEW ONLY\\n'+JSON.stringify(changes,null,2).slice(0,3000))){if(changes.some(c=>c.kind==='update_record'&&!rows.some(r=>r.id===c.recordId&&r.version===c.expectedVersion))){alert('Stale review: a record changed since the form opened.');return;}for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-9000-'+String(next++).padStart(12,'0'),version:0,data:c.data});else{const r=rows.find(r=>r.id===c.recordId);r.data={...r.data,...c.data};r.version++;}}dispatch({kind:'open',action:''});}}
}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:(kind==='submit'&&window.__submitter?window.__submitter.value:target.value)??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit'&&!b.dataset.trialyIntegration)eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();window.__submitter=e.submitter||null;eventFor('submit',e.target);});
document.addEventListener('change',e=>eventFor('change',e.target));
dispatch({kind:'open',action:''});
</script></body></html>`;
 await output(new URL('../../apps/'+entry.id+'-'+entry.version+'.json',base),serialized);await output(new URL('partnerships.preview.html',root),preview);return entry.version;
}

/* 3.0.0: the v2 app. Line 1 of the body is the contract marker, line 2 the app commands (read by the host as data), then the app's
 * own few styles and the code. The runtime places the kit (helpers and styles) ahead of it. */
async function build300(){
 const read=n=>readFile(new URL(n,base),'utf8');
 const [metadata,source,css,demo,schema]=await Promise.all(['catalog.metadata.json','partnerships.source.js','partnerships.css','demo_data.json','schema.example.json'].map(read));
 const nl=source.indexOf('\n'),marker=source.slice(0,nl);if(marker!=="'use trialagents v2';")throw Error("Line 1 must be 'use trialagents v2';");
 const nl2=source.indexOf('\n',nl+1),cmds=commandsLine(source.slice(nl+1,nl2));
 const entry=JSON.parse(metadata);entry.source=marker+'\n'+cmds+'\nconst PARTNERSHIPS_CSS='+JSON.stringify(css.replace(/\s*\n\s*/g,''))+';\n'+minify(source.slice(nl2+1))+'\n';
 const serialized=JSON.stringify(entry,null,2)+'\n';
 if(Buffer.byteLength(serialized)>380000||entry.source.length>240000||css.length>8000)throw Error('Partnerships template exceeds catalog limits ('+entry.source.length+' source characters)');
 const {KIT_SOURCE,kitCss}=await tsImport('../src/shared/app-kit.ts',import.meta.url);
 // The gallery preview (D40): labelled fictional demo data, outside the app; it saves into this page's memory only and contacts nobody.
 const preview=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Partnerships fictional preview</title><style>${kitCss()}${css}</style><body><div style="padding:8px 16px;background:#fff4dc;color:#5c3d00;font:13px Inter,Arial,sans-serif">Fictional demo data, fixed as of 14 Nov 2026. Changes stay in this page; nothing is sent.</div><div id="surface"></div><script>
const source=${JSON.stringify(KIT_SOURCE+'\n'+entry.source).replaceAll('</','<\/')};
const demo=${demo};const metadata=${metadata};const schema=${schema};
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schema[role].logicalFields,writableFields:schema[role].readOnly?[]:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:role,fields:Object.values(schema[role].logicalFields)}));
const config={...metadata.defaults,asOfOverride:demo.asOf,tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
let state=null,rows=demo.records.map(r=>({...r})),next=1,undo=[];
const read=v=>{const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length,limit:v.limit,offset:v.offset};};
const tools={call(name,v){if(name==='records.read')return read(v);if(name==='records.readMany')return {results:v.reads.map(read)};
 if(name==='records.summarize'){const g={};for(const r of rows.filter(r=>r.role===v.typeId)){const k=r.data[v.groupBy]??'';g[k]=(g[k]||0)+1;}return {totals:{count:rows.filter(r=>r.role===v.typeId).length},groups:Object.entries(g).map(([label,count])=>({label,count}))};}
 if(name==='records.save'){const before=JSON.stringify(rows);for(const c of v.changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-9000-'+String(next++).padStart(12,'0'),version:0,data:c.data});else{const i=rows.findIndex(r=>r.id===c.recordId);if(i<0||rows[i].version!==c.expectedVersion)throw Error('Someone changed this record first.');if(c.kind==='archive_record')rows.splice(i,1);else rows[i]={...rows[i],data:{...rows[i].data,...c.data},version:rows[i].version+1};}}undo.unshift({undoId:String(next++),label:'Change',rows:before});return {status:'saving'};}
 if(name==='undo.list')return {actions:undo.map(u=>({undoId:u.undoId,label:u.label}))};if(name==='undo.run'){const u=undo.shift();if(u)rows=JSON.parse(u.rows);return {status:'undone'};}
 if(name==='documents.list')return {documents:demo.documents,total:demo.documents.length,complete:true};if(name==='integrations.list')return {integrations:[]};if(name==='roles.list')return {roles:[]};throw Error('Unavailable in this preview');}};
function dispatch(event){const width=innerWidth<560?'phone':innerWidth<900?'panel':'wide';const out=render({saved:true,writable:true,appRole:'owner',context:null,viewport:{width,coarse:false},state,event:{value:null,form:{},...event}},tools,config,bindings);
 state=out.state;document.getElementById('surface').innerHTML='<style>'+out.css+'</style>'+out.html;if(out.notice&&out.notice.kind==='error')alert(out.notice.message);}
function eventFor(kind,target,value){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:value!==undefined?value:target.type==='checkbox'?target.checked:target.value??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit'&&!b.dataset.trialyIntegration&&!b.dataset.trialyOpen)eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();eventFor('submit',e.target);});
document.addEventListener('change',e=>eventFor('change',e.target));
document.addEventListener('dragstart',e=>{const c=e.target.closest&&e.target.closest('[data-drag]');if(c)e.dataTransfer.setData('text/plain',c.dataset.drag);});
document.addEventListener('dragover',e=>{if(e.target.closest&&e.target.closest('[data-drop]'))e.preventDefault();});
document.addEventListener('drop',e=>{const col=e.target.closest&&e.target.closest('[data-drop]');if(!col)return;e.preventDefault();dispatch({kind:'change',action:col.dataset.dropAction,value:e.dataTransfer.getData('text/plain')+'>'+col.dataset.drop});});
dispatch({kind:'open',action:''});
</script></body></html>`;
 await output(new URL('../../apps/'+entry.id+'-'+entry.version+'.json',base),serialized);await output(new URL('partnerships.preview.html',base),preview);return entry.version+' ('+entry.source.length+' source characters)';
}
const built=[await build221(),await build300()];
console.log('Partnerships '+built.join(', ')+': catalog and preview '+(check?'verified':'built'));
