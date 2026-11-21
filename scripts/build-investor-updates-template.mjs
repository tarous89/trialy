import {readFile,writeFile} from 'node:fs/promises';
import {transformSync} from 'esbuild';
// Investor Updates (life.investor-updates): catalog JSON and the offline fictional preview of each version, generated from
// templates/source/investor-updates/. 2.0.0 (the v2 contract and the kit) is built from the folder itself; the published 1.0.1 is
// built byte-identical from archive/1.0.1/ (--check verifies both). The readable source is canonical; the catalog carries it with
// whitespace and redundant syntax removed (identifiers unchanged).
const repo=new URL('../',import.meta.url),check=process.argv.includes('--check');
async function output(url,text){if(check){if(await readFile(url,'utf8')!==text)throw Error('Generated file is stale: '+url.pathname);}else await writeFile(url,text);}
const minify=(pre,body)=>{const wrapped=transformSync(pre+body+'\n};',{minifyWhitespace:true,minifySyntax:true,legalComments:'none'}).code.trim();if(!wrapped.startsWith(pre)||!wrapped.endsWith('};'))throw Error('Unexpected minifier output');return wrapped.slice(pre.length,-2);};
const readAll=root=>Promise.all(['catalog.metadata.json','investor-updates.source.js','investor-updates.css','demo_data.json','schema.example.json'].map(n=>readFile(new URL(n,root),'utf8')));
const withFunctions=async(entry,root)=>{entry.functions=await Promise.all((entry.functions??[]).map(async({sourceFile,...f})=>({...f,source:(await readFile(new URL(sourceFile,root),'utf8')).trim()})));};
const limits=(entry,serialized,css)=>{if(Buffer.byteLength(serialized)>300000||entry.source.length>240000||css.length>50000)throw Error('Investor Updates template exceeds catalog limits ('+entry.source.length+' source characters, '+Buffer.byteLength(serialized)+' bytes)');};
const lineOf=(source,at,prefix,re)=>{const end=source.indexOf('\n',at),line=source.slice(at,end);if(!line.startsWith(prefix)||(re&&!re.test(line)))throw Error('Expected '+prefix);JSON.parse(line.slice(prefix.length,-1));return {line,next:end+1};};

/** 1.0.1 (published): unchanged builder, reading the archived package. Line 1 templateLayoutSchema, line 2 appCommands. */
async function buildV1(root){
 const [metadata,source,css,demo,schema]=await readAll(root);
 const a=lineOf(source,0,'const templateLayoutSchema='),b=lineOf(source,a.next,'const appCommands=',/^const appCommands=\[.*\];$/);
 const layoutLine=a.line,commandsLine=b.line;
 const pre='globalThis.__app=function(input,tools,templateConfiguration,templateBindings){';
 const entry=JSON.parse(metadata);entry.source='const INVESTOR_UPDATES_CSS='+JSON.stringify(css)+';\n'+layoutLine+'\n'+commandsLine+'\n'+minify(pre,source.slice(b.next))+'\n';
 await withFunctions(entry,root);
 const serialized=JSON.stringify(entry,null,2)+'\n';limits(entry,serialized,css);
 const preview=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Investor Updates fictional preview</title><style>${css}</style><body><div style="padding:10px 16px;background:#fff;border-bottom:1px solid #D8E2DD;font:13px Inter,Arial,sans-serif;color:#16302B">Fictional local demo, fixed as of ${demo.asOf}. Reviews, documents, sending, links, automations, permissions and persistent layout use the TrialAgents host; this file contacts nobody and sends nothing.</div><div id="surface"></div><script>
const source=${JSON.stringify(entry.source).replaceAll('</','<\/')};
const demo=${demo};const metadata=${metadata};const schema=${schema};
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schema[role].logicalFields,writableFields:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:role,fields:Object.values(schema[role].logicalFields)}));
const config={...metadata.defaults,demoLabel:true,asOfOverride:demo.asOf,companyName:demo.companyName,tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
let state={},rows=demo.records.map(r=>({...r})),proposal=null,next=1;
function dispatch(event){if(event.action==='tracker:layout'){alert('Layout is managed in native TrialAgents app settings. This file demonstrates the screens only.');return;}
 const out=render({saved:true,writable:true,state,event},{call:(name,v)=>{if(name==='records.read'){const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};}if(name==='records.propose'){proposal=v;return {status:'proposed'};}if(name==='documents.list')return {unavailable:true};if(name.startsWith('exchange.'))return {unavailable:true,message:'The exchange is available in the saved app.'};throw Error('Unsupported preview capability');}},config,bindings);
 state=out.state;document.getElementById('surface').innerHTML=out.html;
 if(proposal){const changes=proposal;proposal=null;if(confirm('FICTIONAL LOCAL REVIEW ONLY\\n'+JSON.stringify(changes,null,2).slice(0,3000))){if(changes.some(c=>c.kind==='update_record'&&!rows.some(r=>r.id===c.recordId&&r.version===c.expectedVersion))){alert('Stale review: a record changed since the form opened.');return;}for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-9300-'+String(next++).padStart(12,'0'),version:0,data:c.data});else{const r=rows.find(r=>r.id===c.recordId);r.data={...r.data,...c.data};r.version++;}}dispatch({kind:'open',action:''});}}
}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:target.value??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit'&&!b.dataset.trialyDocument)eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();eventFor('submit',e.target);});
document.addEventListener('change',e=>eventFor('change',e.target));
dispatch({kind:'open',action:''});
</script></body></html>`;
 await output(new URL('templates/apps/'+entry.id+'-'+entry.version+'.json',repo),serialized);await output(new URL('investor-updates.preview.html',root),preview);
 return entry.version+' ('+entry.source.length+' source characters, '+Buffer.byteLength(serialized)+' bytes)';
}

/** 2.0.0: the v2 contract. Line 1 is the marker, then templateLayoutSchema and appCommands (read by the host as single-line JSON,
 * never executed there), then the app's few own styles and the minified body. The runtime adds the kit's helpers and styles. */
async function buildV2(root){
 const [metadata,source,css,demo,schema]=await readAll(root);
 const first=source.indexOf('\n'),marker=source.slice(0,first);if(marker!=="'use trialagents v2';")throw Error("Line 1 must be 'use trialagents v2';");
 const a=lineOf(source,first+1,'const templateLayoutSchema='),b=lineOf(source,a.next,'const appCommands=',/^const appCommands=\[.*\];$/);
 const pre='globalThis.__app=function(input,tools,templateConfiguration,templateBindings,kit){';
 const entry=JSON.parse(metadata);entry.source=marker+'\n'+a.line+'\n'+b.line+'\nconst INVESTOR_UPDATES_CSS='+JSON.stringify(css)+';\n'+minify(pre,source.slice(b.next))+'\n';
 await withFunctions(entry,root);
 const serialized=JSON.stringify(entry,null,2)+'\n';limits(entry,serialized,css);
 // The kit as the runtime adds it (src/shared/app-kit.ts), loaded from the TypeScript source without a TypeScript runtime.
 const kitTs=await readFile(new URL('src/shared/app-kit.ts',repo),'utf8');
 const kitModule=await import('data:text/javascript;base64,'+Buffer.from(transformSync(kitTs,{loader:'ts',format:'esm'}).code).toString('base64'));
 const preview=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Investor Updates fictional preview</title><style>${kitModule.kitCss()}${css}</style><body><div id="demo-label" style="padding:10px 16px;background:#fff;border-bottom:1px solid #D8E2DD;font:13px Inter,Arial,sans-serif;color:#16302B">Fictional demo data, fixed as of ${demo.asOf}. Saves stay in this page; documents, sending, links, automations and permissions use the TrialAgents host. This file contacts nobody and sends nothing.<span id="notice" role="status" style="margin-left:12px;font-weight:600"></span></div><div id="surface"></div><script>
const source=${JSON.stringify(kitModule.KIT_SOURCE+'\n'+entry.source).replaceAll('</','<\/')};
const demo=${demo};const metadata=${metadata};const schema=${schema};
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schema[role].logicalFields,writableFields:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:role,fields:Object.values(schema[role].logicalFields)}));
const config={...metadata.defaults,asOfOverride:demo.asOf,companyName:demo.companyName,tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
let state={},rows=demo.records.map(r=>({...r})),next=1;
const read=v=>{const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};};
function apply(changes){for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-9300-'+String(next++).padStart(12,'0'),version:0,data:c.data});else if(c.kind==='archive_record')rows=rows.filter(r=>r.id!==c.recordId);else{const r=rows.find(r=>r.id===c.recordId);if(!r||r.version!==c.expectedVersion)throw Error('Someone changed this first.');r.data={...r.data,...c.data};r.version++;}}}
function dispatch(event){let saves=[];
 const call=(name,v)=>{if(name==='records.read')return read(v);if(name==='records.readMany')return {results:v.reads.map(read)};if(name==='records.save'){saves.push(...v.changes);return {status:'saving',count:v.changes.length};}if(name==='undo.list')return {actions:[]};if(name==='documents.list')return {unavailable:true};if(name.startsWith('exchange.'))return {unavailable:true,message:'The exchange is available in the saved app.'};throw Error('Unavailable in this preview');};
 let out=render({saved:true,writable:true,appRole:'owner',context:null,viewport:{width:innerWidth<600?'phone':'wide',coarse:false},state,event},{call},config,bindings);
 let notice=out.notice;if(saves.length){try{apply(saves);}catch(e){notice={kind:'error',message:e.message};}saves=[];out=render({saved:true,writable:true,appRole:'owner',context:null,state:out.state,event:{kind:'open',action:'',value:null,form:{}}},{call},config,bindings);notice=out.notice||notice;}
 state=out.state;document.getElementById('surface').innerHTML=out.html;document.getElementById('notice').textContent=notice?notice.message:'';
}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:target.value??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit'&&!b.dataset.trialyDocument)eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();eventFor('submit',e.target);});
document.addEventListener('change',e=>eventFor('change',e.target));
dispatch({kind:'open',action:''});
</script></body></html>`;
 await output(new URL('templates/apps/'+entry.id+'-'+entry.version+'.json',repo),serialized);await output(new URL('investor-updates.preview.html',root),preview);
 return entry.version+' ('+entry.source.length+' source characters, '+Buffer.byteLength(serialized)+' bytes)';
}
const base=new URL('templates/source/investor-updates/',repo);
const built=[await buildV1(new URL('archive/1.0.1/',base)),await buildV2(base)];
console.log('Investor Updates '+built.join(', ')+': catalog and preview '+(check?'verified':'built'));
