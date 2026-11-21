import {readFile,writeFile,readdir} from 'node:fs/promises';
import {transformSync} from 'esbuild';
/* Kits are versioned: a released radar pins the kit it was built with (radar.json "kit"); frozen kits live in radar-kit/archive/<version>/. */
/* Bio Radars generator (BIO_RADAR.md §5). For every radar definition under templates/source/radars/<slug>/ (the current version) and
 * templates/source/radars/<slug>/archive/<version>/ (released versions, kept byte-identical) it builds, from the kit that version pins:
 *  - the immutable catalog entry templates/apps/<id>-<version>.json (app source, CSS, read-only functions, recommended automations, docs),
 *  - the installer schema schema.example.json next to the definition (pointed to by templates/catalog-installers.json),
 *  - the offline fictional preview <slug>.preview.html next to the definition,
 *  - the radar's output contract in templates/contracts/outputs.json (radar.v1) and its catalog-installers.json entry.
 * Kit 2.x builds a v2 app ('use trialagents v2', the platform kit, direct saves). Its tables, output contracts, recommended automations and
 * helper functions come from the kit named by "dataKit" (the predecessor's kit) when the radar sets one, so an upgrade carries data across.
 * --check (part of npm run build) fails when any generated file is stale. A released version is never rewritten: bump the radar's version. */
const check=process.argv.includes('--check');
const radarsRoot=new URL('../templates/source/radars/',import.meta.url),kitBase=new URL('../templates/source/radar-kit/',import.meta.url);
const current=await import(new URL('kit.mjs',kitBase).href),kits={};
async function loadKit(version){
 if(kits[version])return kits[version];
 const root=!version||version===current.KIT_VERSION?kitBase:new URL('archive/'+version+'/',kitBase),readKit=n=>readFile(new URL(n,root),'utf8');
 const kit=root===kitBase?current:await import(new URL('kit.mjs',root).href);if(version&&kit.KIT_VERSION!==version)throw Error('Kit '+version+' not found');
 const [appSource,css,briefCore,common,brief,digest,alert]=await Promise.all(['radar.source.js','radar.css','brief-core.js','functions/common.js','functions/brief.js','functions/digest.js','functions/alert.js'].map(readKit));
 return kits[version]={kit,appSource,css,briefCore,common,brief,digest,alert};
}
const outputs=[];
async function output(url,text){if(check){let current=null;try{current=await readFile(url,'utf8');}catch{}if(current!==text)throw Error('Generated file is stale: '+url.pathname+' (run node scripts/build-radar-templates.mjs)');}else await writeFile(url,text);outputs.push(url.pathname);}
const minifyBody=body=>{
 const pre='globalThis.__app=function(input,tools,templateConfiguration,templateBindings){';
 const wrapped=transformSync(pre+body+'\n};',{minifyWhitespace:true,minifySyntax:true,legalComments:'none'}).code.trim();
 if(!wrapped.startsWith(pre)||!wrapped.endsWith('};'))throw Error('Unexpected minifier output');
 return wrapped.slice(pre.length,-2);
};

/* Kit 1.x (released versions): unchanged. */
function buildSource({kit,appSource,css,briefCore},radar){
 const layoutLine='const templateLayoutSchema='+JSON.stringify(kit.layoutSchema(radar))+';';
 const body='const RADAR='+JSON.stringify(kit.radarRuntime(radar))+';\n'+briefCore+'\n'+appSource;
 return 'const RADAR_CSS='+JSON.stringify(css)+';\n'+layoutLine+'\n'+minifyBody(body)+'\n';
}
function legacyEntry(K,radar,meta){
 const {kit,briefCore,common,brief,digest,alert}=K;
 const source=buildSource(K,radar),functions=kit.functionDecls(radar,{common:briefCore+'\n'+common,brief,digest,alert}),{instructions,documentation}=kit.catalogText(radar);
 return {source,entry:{id:radar.id,version:radar.version,name:radar.name,description:meta.description,tags:meta.tags,whenToUse:meta.whenToUse,whenNotToUse:meta.whenNotToUse,instructions,documentation,engine:'frontend-js',
  defaults:{heading:radar.name,tableMap:'{}',pageSize:25,layoutProfile:'{}',readOnly:false,demoLabel:false,asOfOverride:''},
  options:{heading:{type:'string',description:'App heading shown above every screen.',default:radar.name},
   tableMap:{type:'string',description:`JSON object keyed by stable role key: organizations (core.v1, read/write), programs (core.v1, optional, read-only) and the app roles ${Object.values(kit.roles(radar)).join(', ')}. Each value is {typeId:<authorized table UUID>, fields:{<logical key>:<real field key>}, writableFields:[<logical keys>]}. The installer writes it; never invent table IDs.`,default:'{}'},
   pageSize:{type:'number',description:'Rows per page in lists (10 to 50).',default:25},
   layoutProfile:{type:'string',description:'Stringified native layout profile (heading, tabs, cols, visible) written by the layout gear review. Do not edit by hand.',default:'{}'},
   readOnly:{type:'boolean',description:'Disable every write control in this copy.',default:false},
   demoLabel:{type:'boolean',description:'Label the data as fictional (offline preview only).',default:false},
   asOfOverride:{type:'string',description:'Pinned as-of date YYYY-MM-DD for previews and tests. Leave empty in real apps.',default:''}},
  source,examples:[{configuration:{heading:radar.name,pageSize:25},description:'Default configuration; the installer writes tableMap.'}],
  functions,recommendedAutomations:kit.recipes(radar)}};
}
function legacyPreview(css,source,radar,demo,schema){
 const roleKeys=Object.keys(schema).filter(k=>demo.records.some(r=>r.role===k)||k!=='programs');
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${radar.name} fictional preview</title><style>${css}</style><body><div style="padding:10px 16px;background:#fff;border-bottom:1px solid #DCE4EA;font:13px Inter,Arial,sans-serif;color:#1F3D57">Fictional local demo, fixed as of ${demo.asOf}. Reviews, automations, permissions and layout use the TrialAgents host; this file contacts nobody and sends nothing.</div><div id="surface"></div><script>
const source=${JSON.stringify(source).replaceAll('</','<\\/')};
const demo=${JSON.stringify(demo)};const schema=${JSON.stringify(schema)};const roles=${JSON.stringify(roleKeys)};
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schema[role].logicalFields,writableFields:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:role,fields:Object.values(schema[role].logicalFields)}));
const config={heading:${JSON.stringify(radar.name)},pageSize:25,layoutProfile:'{}',demoLabel:true,asOfOverride:demo.asOf,tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
let state={},rows=demo.records.map(r=>({...r})),proposal=null,next=1;
const match=(r,v)=>Object.entries(v.filters||{}).every(([k,x])=>String(r.data[k])===x)&&(!v.q||Object.values(r.data).some(x=>String(x).toLowerCase().includes(String(v.q).toLowerCase())));
function read(v){let all=rows.filter(r=>r.role===v.typeId&&match(r,v));if(v.sort){const f=v.sort.field,d=v.sort.direction==='desc'?-1:1;all=all.slice().sort((a,b)=>{const x=a.data[f],y=b.data[f];if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return (typeof x==='number'?x-y:String(x).localeCompare(String(y)))*d;});}return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};}
function dispatch(event){if(event.action==='tracker:layout'){alert('Layout is managed in native TrialAgents app settings.');return;}
 const out=render({saved:true,writable:true,state,event},{call:(name,v)=>{if(name==='records.read')return read(v);if(name==='records.propose'){proposal=v;return {status:'proposed'};}throw Error('Unsupported preview capability');}},config,bindings);
 state=out.state;document.getElementById('surface').innerHTML=out.html;
 if(proposal){const changes=proposal;proposal=null;if(confirm('FICTIONAL LOCAL REVIEW ONLY\\n'+JSON.stringify(changes,null,2).slice(0,3000))){for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-9000-'+String(next++).padStart(12,'0'),version:0,data:c.data});else{const r=rows.find(r=>r.id===c.recordId);if(r){r.data={...r.data,...c.data};r.version++;}}}dispatch({kind:'open',action:''});}}
}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:target.value??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit')eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();eventFor('submit',e.target);});
document.addEventListener('change',e=>eventFor('change',e.target));
dispatch({kind:'open',action:''});
</script></body></html>`;
}

/* Kit 2.x: the v2 contract. The marker is line 1 of the template body (after the generated configuration and bindings lines). */
let platformKit=null;
async function v2Entry(K,D,radar,meta){
 const {kit,appSource,css,briefCore}=K;
 const body='const RADAR='+JSON.stringify(kit.appRuntime(radar))+';\n'+briefCore+'\n'+appSource;
 const source="'use trialagents v2';\nconst RADAR_CSS="+JSON.stringify(css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s*\n\s*/g,''))+';\n'+minifyBody(body)+'\n';
 /* Same tables, contracts, automations and helpers as the predecessor (D41): built by the data kit with this radar's version label. */
 const functions=D.kit.functionDecls(radar,{common:D.briefCore+'\n'+D.common,brief:D.brief,digest:D.digest,alert:D.alert}),{instructions,documentation}=kit.catalogText(radar);
 return {source,entry:{id:radar.id,version:radar.version,name:radar.name,description:meta.description,tags:meta.tags,whenToUse:meta.whenToUse,whenNotToUse:meta.whenNotToUse,instructions,documentation,engine:'frontend-js',
  defaults:{tableMap:'{}',pageSize:25,readOnly:false,asOfOverride:''},
  options:{tableMap:{type:'string',description:`JSON object keyed by stable role key: organizations (core.v1, read/write), programs (core.v1, optional, read-only) and the app roles ${Object.values(D.kit.roles(radar)).join(', ')}. Each value is {typeId:<authorized table UUID>, fields:{<logical key>:<real field key>}, writableFields:[<logical keys>]}. The installer writes it; never invent table IDs.`,default:'{}'},
   pageSize:{type:'number',description:'Rows per page in lists (10 to 50).',default:25},
   readOnly:{type:'boolean',description:'Disable every write control in this copy.',default:false},
   asOfOverride:{type:'string',description:'Pinned as-of date YYYY-MM-DD for previews and tests. Leave empty in real apps.',default:''}},
  source,examples:[{configuration:{pageSize:25},description:'Default configuration; the installer writes tableMap.'}],
  functions,recommendedAutomations:D.kit.recipes(radar),upgradeFrom:radar.upgradeFrom}};
}
/* Gallery preview (D40): fictional, labelled data in a local copy of the v2 runtime (the platform kit helpers and styles). Saves change the
 * local rows only; nothing is sent. */
async function v2Preview(source,radar,demo,schema){
 platformKit??=await import(new URL('../src/shared/app-kit.ts',import.meta.url).href);
 const roleKeys=Object.keys(schema).filter(k=>demo.records.some(r=>r.role===k)||k!=='programs');
 const css=platformKit.kitCss()+JSON.parse(/^const RADAR_CSS=(.*);$/m.exec(source)[1]);
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${radar.name} fictional preview</title><style>${css}</style><body><p style="margin:0;padding:8px 16px;background:#fff4dc;color:#5c3d00;font:13px Inter,Arial,sans-serif">Fictional demo data, fixed as of ${demo.asOf}. This local preview contacts nobody and sends nothing.</p><div id="surface"></div><script>
const source=${JSON.stringify(platformKit.KIT_SOURCE+'\n'+source).replaceAll('</','<\\/')};
const demo=${JSON.stringify(demo)};const schema=${JSON.stringify(schema)};const roles=${JSON.stringify(roleKeys)};
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schema[role].logicalFields,writableFields:schema[role].readOnly?[]:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:role,fields:Object.values(schema[role].logicalFields)}));
const config={pageSize:25,asOfOverride:demo.asOf,tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
let state={},context=null,rows=demo.records.map(r=>({...r,data:{...r.data}})),next=1;
const match=(r,v)=>Object.entries(v.filters||{}).every(([k,x])=>String(r.data[k])===x)&&(!v.q||Object.values(r.data).some(x=>String(x).toLowerCase().includes(String(v.q).toLowerCase())));
function read(v){let all=rows.filter(r=>r.role===v.typeId&&match(r,v));if(v.sort){const f=v.sort.field,d=v.sort.direction==='desc'?-1:1;all=all.slice().sort((a,b)=>{const x=a.data[f],y=b.data[f];if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return (typeof x==='number'?x-y:String(x).localeCompare(String(y)))*d;});}const limit=v.limit??25,offset=v.offset||0;return {rows:limit===0?[]:all.slice(offset,offset+limit),total:all.length};}
function save(changes){for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-9000-'+String(next++).padStart(12,'0'),version:0,data:c.data});else{const r=rows.find(r=>r.id===c.recordId);if(!r)continue;if(c.kind==='archive_record')rows=rows.filter(x=>x!==r);else{r.data={...r.data,...c.data};r.version++;}}}}
function dispatch(event){const saves=[];
 const out=render({saved:true,writable:true,appRole:'owner',context,viewport:{width:innerWidth<560?'phone':innerWidth<900?'panel':'wide',coarse:false},state,event},{call:(name,v)=>{if(name==='records.read')return read(v);if(name==='records.readMany')return {results:v.reads.map(read)};if(name==='records.save'){saves.push(...v.changes);return {status:'saving',count:v.changes.length};}if(name==='undo.list')return {actions:[]};throw Error('Not available in the preview');}},config,bindings);
 state=out.state;if(out.context!==undefined)context=out.context;document.getElementById('surface').innerHTML=out.html;
 if(saves.length){save(saves);dispatch({kind:'open',action:''});}
}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:target.value??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit')eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();eventFor('submit',e.target);});
document.addEventListener('change',e=>{if(e.target.closest('form')&&!e.target.dataset.action)return;eventFor('change',e.target);});
dispatch({kind:'open',action:''});
</script></body></html>`;
}

const slugs=(await readdir(radarsRoot,{withFileTypes:true})).filter(d=>d.isDirectory()&&!d.name.startsWith('_')).map(d=>d.name).sort();
const contracts=JSON.parse(await readFile(new URL('../templates/contracts/outputs.json',import.meta.url),'utf8'));
const installers=JSON.parse(await readFile(new URL('../templates/catalog-installers.json',import.meta.url),'utf8'));
const byVersion=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);return x[0]-y[0]||x[1]-y[1]||x[2]-y[2];};
for(const slug of slugs){
 const top=new URL(slug+'/',radarsRoot);let archived=[];
 try{archived=(await readdir(new URL('archive/',top),{withFileTypes:true})).filter(d=>d.isDirectory()&&/^\d+\.\d+\.\d+$/.test(d.name)).map(d=>d.name).sort(byVersion);}catch{}
 /* Released versions first (oldest to newest), then the current definition. */
 for(const dir of archived.map(v=>new URL('archive/'+v+'/',top)).concat([top])){
  const readR=n=>readFile(new URL(n,dir),'utf8');
  let radar;try{radar=JSON.parse(await readR('radar.json'));}catch{continue;}
  const meta=JSON.parse(await readR('catalog.metadata.json')),demo=JSON.parse(await readR('demo_data.json'));
  if(radar.slug!==slug)throw Error(slug+': radar.json slug must match its folder');
  if(dir!==top&&!dir.pathname.endsWith('/'+radar.version+'/'))throw Error(slug+': archive/'+radar.version+' holds another version');
  const K=await loadKit(radar.kit),v2=Number(K.kit.KIT_VERSION.split('.')[0])>=2,D=v2&&radar.dataKit?await loadKit(radar.dataKit):K;
  const {source,entry}=v2?await v2Entry(K,D,radar,meta):legacyEntry(K,radar,meta);
  if(v2&&!entry.upgradeFrom?.length)throw Error(radar.name+' '+radar.version+': list the earlier versions with the same tables in upgradeFrom');
  const serialized=JSON.stringify(entry,null,2)+'\n';
  if(Buffer.byteLength(serialized)>300000||source.length>(v2?240000:180000)||entry.functions.some(f=>f.source.length>90000))throw Error(radar.name+' exceeds catalog limits ('+source.length+' source characters, '+Buffer.byteLength(serialized)+' bytes)');
  await output(new URL('../templates/apps/'+radar.id+'-'+radar.version+'.json',import.meta.url),serialized);
  const schema=D.kit.installerSchema(radar);
  await output(new URL('schema.example.json',dir),JSON.stringify(schema,null,2)+'\n');
  Object.assign(contracts.roles,D.kit.outputContracts?D.kit.outputContracts(radar):{[D.kit.roles(radar).events]:D.kit.outputContract(radar)});
  installers[radar.id+'@'+radar.version]='templates/source/radars/'+slug+'/'+(dir===top?'':'archive/'+radar.version+'/')+'schema.example.json';
  /* Offline preview: the same source with fictional records; nothing is sent. */
  await output(new URL(slug+'.preview.html',dir),v2?await v2Preview(source,radar,demo,schema):legacyPreview(K.css,source,radar,demo,schema));
  console.log(radar.name+' '+radar.version+': catalog entry, installer schema and preview '+(check?'verified':'built')+' ('+source.length+' source characters)');
 }
}
await output(new URL('../templates/contracts/outputs.json',import.meta.url),JSON.stringify(contracts,null,2)+'\n');
await output(new URL('../templates/catalog-installers.json',import.meta.url),JSON.stringify(installers,null,2)+'\n');
