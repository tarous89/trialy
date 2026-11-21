import {transformSync} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
// Programs (life.project-oversight). Released packages are archived unchanged under templates/source/project-oversight/archive/<version>/.
// This builder builds the released 2.2.1 from its archive (its --check proves the published JSON and preview are unchanged) and the
// current package (3.0.0, the v2 app contract on the TrialAgents kit) from the source folder.
const base=new URL('../templates/source/project-oversight/',import.meta.url);
const check=process.argv.includes('--check');
async function output(url,text){if(check){if(await readFile(url,'utf8')!==text)throw Error('Generated file is stale: '+url.pathname);}else await writeFile(url,text);}
const minify=(body,pre='globalThis.__app=function(){')=>{const wrapped=transformSync(pre+body+'\n};',{minify:true,legalComments:'none'}).code.trim();if(!wrapped.startsWith(pre)||!wrapped.endsWith('};'))throw Error('Unexpected minifier output');return wrapped.slice(pre.length,-2);};
const helpers=async(entry,read)=>{entry.functions=await Promise.all((entry.functions??[]).map(async({sourceFiles,...f})=>({...f,source:(await Promise.all(sourceFiles.map(read))).map(x=>x.trim()).join('\n')})));if(!entry.functions.length)delete entry.functions;};

/* ---------- 2.2.1 (released): the 2.2.x build, unchanged, reading its archived package ---------- */
async function released(root){
 const read=n=>readFile(new URL(n,root),'utf8');
 const [metadata,source,css,demo,schema]=await Promise.all(['catalog.metadata.json','programs.source.js','programs.css','demo_data.json','schema.example.json'].map(read));
 const core=(await read('functions/digest-core.js')).trim();
 if(!source.includes('/*@digest-core*/'))throw Error('programs.source.js must contain the /*@digest-core*/ marker');
 const lines=source.replace('/*@digest-core*/',core).split('\n'),decl=lines.slice(0,2);
 if(!decl[0].startsWith('const templateLayoutSchema=')||!decl[1].startsWith('const appCommands='))throw Error('Lines 1 and 2 must declare templateLayoutSchema and appCommands');
 const entry=JSON.parse(metadata);entry.source='const PROGRAMS_CSS='+JSON.stringify(css)+';\n'+decl.join('\n')+'\n'+minify(lines.slice(2).join('\n'))+'\n';
 await helpers(entry,read);
 const serialized=JSON.stringify(entry,null,2)+'\n';
 if(Buffer.byteLength(serialized)>300000||entry.source.length>180000||css.length>50000)throw Error('Programs template exceeds catalog limits ('+entry.source.length+' source characters, '+Buffer.byteLength(serialized)+' bytes)');
 const catalog=new URL('../../apps/'+entry.id+'-'+entry.version+'.json',base);
 const preview=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Programs fictional preview</title><style>${css}</style><body><div style="padding:10px 16px;background:#fff;border-bottom:1px solid #E1DDE8;font:13px Inter,Arial,sans-serif;color:#3D3550">Fictional local demo, fixed as of 11 Nov 2026. Database review, permissions and persistent layout use the TrialAgents host.</div><div id="surface"></div><script>
const source=${JSON.stringify(entry.source).replaceAll('</','<\/')};
const demo=${demo};const metadata=${metadata};const schema=${schema};
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schema[role].logicalFields,writableFields:schema[role].readOnly?[]:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:role,fields:Object.values(schema[role].logicalFields)}));
const config={...metadata.defaults,demoLabel:true,asOfOverride:'2026-11-11',tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
let state={},rows=demo.records.map(r=>({...r})),proposal=null,next=1;
function dispatch(event){if(event.action==='tracker:layout'){alert('Layout is managed in native TrialAgents app settings. This file demonstrates the program screens only.');return;}
 const out=render({saved:true,writable:true,state,event},{call:(name,v)=>{if(name==='records.read'){const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};}if(name==='records.propose'){proposal=v;return {status:'proposed'};}if(name==='integrations.list')return {integrations:[]};throw Error('Unsupported preview capability');}},config,bindings);
 state=out.state;document.getElementById('surface').innerHTML=out.html;
 if(proposal){const changes=proposal;proposal=null;if(confirm('FICTIONAL LOCAL REVIEW ONLY\\n'+JSON.stringify(changes,null,2).slice(0,3000))){if(changes.some(c=>c.kind==='update_record'&&!rows.some(r=>r.id===c.recordId&&r.version===c.expectedVersion))){alert('Stale review: a record changed since the form opened.');return;}for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-9000-'+String(next++).padStart(12,'0'),version:0,data:c.data});else{const r=rows.find(r=>r.id===c.recordId);r.data={...r.data,...c.data};r.version++;}}dispatch({kind:'open',action:''});}}
}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:target.value??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit')eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();eventFor('submit',e.target);});
document.addEventListener('change',e=>eventFor('change',e.target));
dispatch({kind:'open',action:''});
</script></body></html>`;
 await output(catalog,serialized);await output(new URL('programs.preview.html',root),preview);
 return entry.version;
}

/* ---------- 3.0.0 (current): the v2 app contract on the kit ---------- */
async function current(root){
 const read=n=>readFile(new URL(n,root),'utf8');
 const [metadata,source,css,demo,schema]=await Promise.all(['catalog.metadata.json','programs.source.js','programs.css','demo_data.json','schema.example.json'].map(read));
 const core=(await read('functions/digest-core.js')).trim();
 if(!source.includes('/*@digest-core*/'))throw Error('programs.source.js must contain the /*@digest-core*/ marker');
 // Line 1 is the v2 marker; lines 2 and 3 are read by the host as data (layout schema, app commands) and kept verbatim.
 const lines=source.replace('/*@digest-core*/',core).split('\n'),decl=lines.slice(0,3);
 if(decl[0]!=="'use trialagents v2';"||!decl[1].startsWith('const templateLayoutSchema=')||!decl[2].startsWith('const appCommands='))throw Error('Line 1 must be the v2 marker, lines 2 and 3 the templateLayoutSchema and appCommands declarations');
 if(/records\.propose/.test(source))throw Error('A v2 app saves with records.save');
 const entry=JSON.parse(metadata);if(entry.version==='2.2.1')throw Error('The current package needs a version of its own');
 // The readable source is canonical; the catalog carries it minified. Host-provided names (input, tools, kit, templateConfiguration,
 // templateBindings, PROGRAMS_CSS) and the two declarations are free variables of the wrapper, so they are never renamed.
 entry.source=decl.join('\n')+'\nconst PROGRAMS_CSS='+JSON.stringify(css)+';\n'+minify(lines.slice(3).join('\n'))+'\n';
 await helpers(entry,read);
 const serialized=JSON.stringify(entry,null,2)+'\n';
 if(Buffer.byteLength(serialized)>380000||entry.source.length>240000||css.length>20000)throw Error('Programs template exceeds catalog limits ('+entry.source.length+' source characters, '+Buffer.byteLength(serialized)+' bytes)');
 const catalog=new URL('../../apps/'+entry.id+'-'+entry.version+'.json',base);
 // D40: the gallery preview runs the same code on clearly labelled fictional records, with the kit the runtime adds to every v2 app.
 const kitModule=transformSync(await readFile(new URL('../src/shared/app-kit.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm'}).code;
 const {KIT_SOURCE,kitCss}=await import('data:text/javascript;base64,'+Buffer.from(kitModule).toString('base64'));
 const preview=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Programs fictional preview</title><style>${kitCss()}${css}</style><body><div style="padding:8px 16px;background:#fff4dc;color:#5c3d00;font:13px Inter,Arial,sans-serif">Fictional demo data, fixed as of 16 Nov 2026. Edits stay in this page.</div><div id="message" style="padding:0 16px;font:13px Inter,Arial,sans-serif;color:#20383d"></div><div id="surface"></div><script>
const source=${JSON.stringify(KIT_SOURCE+'\n'+entry.source).replaceAll('</','<\/')};
const demo=${demo};const metadata=${metadata};const schema=${schema};
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schema[role].logicalFields,writableFields:schema[role].readOnly?[]:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:role,fields:Object.values(schema[role].logicalFields)}));
const config={...metadata.defaults,asOfOverride:'2026-11-16',tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
let state={},context=null,rows=demo.records.map(r=>({...r})),next=1;
const read=v=>{const all=rows.filter(r=>r.role===v.typeId&&!r.archived);return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};};
function apply(changes){for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-9000-'+String(next++).padStart(12,'0'),version:0,data:c.data});else{const r=rows.find(r=>r.id===c.recordId);if(!r||r.version!==c.expectedVersion)throw Error('Someone changed this record first.');if(c.kind==='archive_record')r.archived=true;else r.data={...r.data,...c.data};r.version++;}}}
function dispatch(event){let saves=[];
 const out=render({saved:true,writable:true,appRole:'owner',context,viewport:{width:innerWidth<560?'phone':innerWidth<900?'panel':'wide'},state,event},{call:(name,v)=>{if(name==='records.read')return read(v);if(name==='records.readMany')return {results:v.reads.map(read)};if(name==='records.save'){saves.push(...v.changes);return {status:'saving'};}if(name==='integrations.list')return {integrations:[]};if(name==='undo.list')return {entries:[]};throw Error('Not available in this preview');}},config,bindings);
 state=out.state;context=out.context??context;document.getElementById('message').textContent=out.notice?out.notice.message:'';
 if(saves.length){try{apply(saves);}catch(e){document.getElementById('message').textContent=e.message;}return dispatch({kind:'open',action:''});}
 document.getElementById('surface').innerHTML=out.html;}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:target.value??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit')eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();eventFor('submit',e.target);});
document.addEventListener('change',e=>eventFor('change',e.target));
dispatch({kind:'open',action:''});
</script></body></html>`;
 await output(catalog,serialized);await output(new URL('programs.preview.html',root),preview);
 return entry.version;
}

const built=[await released(new URL('archive/2.2.1/',base)),await current(base)];
if(built[0]!=='2.2.1'||built[1]===built[0])throw Error('The current package needs a version of its own');
console.log('Programs '+built.join(' and ')+': catalog and preview '+(check?'verified':'built'));
