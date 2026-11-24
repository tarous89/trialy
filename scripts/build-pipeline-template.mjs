import {transformSync} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
// Pipeline (life.pipeline): the platform version of the standalone prototype in prototypes/pipeline.
// The readable source in templates/source/pipeline/ is canonical; this builds the catalog JSON and the gallery preview
// (--check fails when either is stale). Released versions are never rebuilt in place: archive them under archive/<version>/.
const base=new URL('../templates/source/pipeline/',import.meta.url);
const check=process.argv.includes('--check');
async function output(url,text){if(check){if(await readFile(url,'utf8').catch(()=>null)!==text)throw Error('Generated file is stale: '+url.pathname);}else await writeFile(url,text);}
const minify=(body,pre='globalThis.__app=function(){')=>{const wrapped=transformSync(pre+body+'\n};',{minify:true,legalComments:'none'}).code.trim();if(!wrapped.startsWith(pre)||!wrapped.endsWith('};'))throw Error('Unexpected minifier output');return wrapped.slice(pre.length,-2);};
const read=n=>readFile(new URL(n,base),'utf8');
const [metadata,source,css,demo,schema]=await Promise.all(['catalog.metadata.json','pipeline.source.js','pipeline.css','demo_data.json','schema.example.json'].map(read));
// Line 1 is the v2 marker; line 2 is read by the host as data (app commands) and kept verbatim.
const lines=source.split('\n'),decl=lines.slice(0,2);
if(decl[0]!=="'use trialagents v2';"||!decl[1].startsWith('const appCommands='))throw Error('Line 1 must be the v2 marker and line 2 the appCommands declaration');
JSON.parse(decl[1].slice('const appCommands='.length).replace(/;$/,''));
if(/records\.propose/.test(source))throw Error('A v2 app saves with records.save');
if(/localStorage|sessionStorage|password/i.test(source))throw Error('Pipeline keeps no browser storage and no credentials of its own');
const entry=JSON.parse(metadata);
// Host-provided names (input, tools, kit, templateConfiguration, templateBindings, PIPELINE_CSS) are free variables of the wrapper, so they are never renamed.
entry.source=decl.join('\n')+'\nconst PIPELINE_CSS='+JSON.stringify(css)+';\n'+minify(lines.slice(2).join('\n'))+'\n';
const serialized=JSON.stringify(entry,null,2)+'\n';
if(Buffer.byteLength(serialized)>300000||entry.source.length>200000||css.length>20000)throw Error('Pipeline template exceeds catalog limits ('+entry.source.length+' source characters, '+Buffer.byteLength(serialized)+' bytes)');
const catalog=new URL('../../apps/'+entry.id+'-'+entry.version+'.json',base);
// The gallery preview runs the same code on clearly labelled fictional records, with the kit the runtime adds to every v2 app.
const kitModule=transformSync(await readFile(new URL('../src/shared/app-kit.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm'}).code;
const {KIT_SOURCE,kitCss}=await import('data:text/javascript;base64,'+Buffer.from(kitModule).toString('base64'));
const preview=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pipeline fictional preview</title><style>${kitCss()}${css}</style><body><div style="padding:8px 16px;background:#fff4dc;color:#5c3d00;font:13px Inter,Arial,sans-serif">Fictional demo data (NorthTherapeutics), fixed as of 15 Feb 2027. Edits stay in this page.</div><div id="message" style="padding:0 16px;font:13px Inter,Arial,sans-serif;color:#20383d"></div><div id="surface"></div><script>
const source=${JSON.stringify(KIT_SOURCE+'\n'+entry.source).replaceAll('</','<\/')};
const demo=${demo};const metadata=${metadata};const schema=${schema};
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schema[role].logicalFields,writableFields:schema[role].readOnly?[]:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:role,fields:Object.values(schema[role].logicalFields)}));
const config={...metadata.defaults,asOfOverride:'2027-02-15',tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
let state={},context=null,rows=demo.records.map(r=>({...r,data:{...r.data}})),next=1;
const read=v=>{const all=rows.filter(r=>r.role===v.typeId&&!r.archived);return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};};
function apply(changes){for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-9000-'+String(next++).padStart(12,'0'),version:0,data:c.data});else{const r=rows.find(r=>r.id===c.recordId);if(!r)throw Error('This record no longer exists.');if(c.kind==='archive_record')r.archived=true;else r.data={...r.data,...c.data};r.version++;}}}
function dispatch(event){let saves=[];
 const out=render({saved:true,writable:true,appRole:'owner',context,viewport:{width:innerWidth<560?'phone':innerWidth<900?'panel':'wide'},state,event},{call:(name,v)=>{if(name==='records.read')return read(v);if(name==='records.readMany')return {results:v.reads.map(read)};if(name==='records.save'){saves.push(...v.changes);return {status:'saving'};}if(name==='undo.list')return {actions:[]};throw Error('Not available in this preview');}},config,bindings);
 state=out.state;context=out.context??context;if(out.notice||event.kind!=='refresh')document.getElementById('message').textContent=out.notice?out.notice.message:'';
 if(saves.length){try{apply(saves);}catch(e){document.getElementById('message').textContent=e.message;}return dispatch({kind:'refresh',action:''});}
 document.getElementById('surface').innerHTML=out.html;}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:target.value??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.type==='submit'){e.preventDefault();eventFor('submit',b);return;}if(b.closest('[data-action]'))eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();eventFor('submit',e.target);});
document.addEventListener('change',e=>{if(!e.target.matches('input[data-ui-state]:not([type=date]),textarea[data-ui-state]'))eventFor('change',e.target);});
document.addEventListener('input',e=>{if(e.target.matches('input[data-ui-state]:not([type=date]),textarea[data-ui-state]')){const n=e.target.name,pos=e.target.selectionStart;eventFor('change',e.target);const again=n?document.querySelector('[name="'+n+'"]'):document.querySelector('[data-action="'+e.target.dataset.action+'"]');if(again){again.focus();try{again.setSelectionRange(pos,pos);}catch(x){}}}});
dispatch({kind:'open',action:''});
</script></body></html>`;
await output(catalog,serialized);await output(new URL('pipeline.preview.html',base),preview);
console.log('Pipeline '+entry.version+': catalog and preview '+(check?'verified':'built'));
