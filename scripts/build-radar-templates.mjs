import {readFile,writeFile,readdir} from 'node:fs/promises';
import {transformSync} from 'esbuild';
import * as kit from '../templates/source/radar-kit/kit.mjs';
/* Bio Radars generator (BIO_RADAR.md §5). For every radar definition under templates/source/radars/<slug>/ it builds, from the shared kit:
 *  - the immutable catalog entry templates/apps/<id>-<version>.json (app source, CSS, read-only functions, recommended automations, docs),
 *  - the installer schema templates/source/radars/<slug>/schema.example.json (pointed to by templates/catalog-installers.json),
 *  - the offline fictional preview templates/source/radars/<slug>/<slug>.preview.html,
 *  - the radar's output contract in templates/contracts/outputs.json (radar.v1) and its catalog-installers.json entry.
 * --check (part of npm run build) fails when any generated file is stale. A released version is never rewritten: bump the radar's version. */
const check=process.argv.includes('--check');
const kitRoot=new URL('../templates/source/radar-kit/',import.meta.url),radarsRoot=new URL('../templates/source/radars/',import.meta.url);
const readKit=n=>readFile(new URL(n,kitRoot),'utf8');
const [appSource,css,briefCore,common,brief,digest,alert]=await Promise.all(['radar.source.js','radar.css','brief-core.js','functions/common.js','functions/brief.js','functions/digest.js','functions/alert.js'].map(readKit));
const outputs=[];
async function output(url,text){if(check){let current=null;try{current=await readFile(url,'utf8');}catch{}if(current!==text)throw Error('Generated file is stale: '+url.pathname+' (run node scripts/build-radar-templates.mjs)');}else await writeFile(url,text);outputs.push(url.pathname);}

export function buildSource(radar){
 const layoutLine='const templateLayoutSchema='+JSON.stringify(kit.layoutSchema(radar))+';';
 const body='const RADAR='+JSON.stringify(kit.radarRuntime(radar))+';\n'+briefCore+'\n'+appSource;
 const pre='globalThis.__app=function(input,tools,templateConfiguration,templateBindings){';
 const wrapped=transformSync(pre+body+'\n};',{minifyWhitespace:true,minifySyntax:true,legalComments:'none'}).code.trim();
 if(!wrapped.startsWith(pre)||!wrapped.endsWith('};'))throw Error('Unexpected minifier output');
 return 'const RADAR_CSS='+JSON.stringify(css)+';\n'+layoutLine+'\n'+wrapped.slice(pre.length,-2)+'\n';
}

const slugs=(await readdir(radarsRoot,{withFileTypes:true})).filter(d=>d.isDirectory()).map(d=>d.name).sort();
const contracts=JSON.parse(await readFile(new URL('../templates/contracts/outputs.json',import.meta.url),'utf8'));
const installers=JSON.parse(await readFile(new URL('../templates/catalog-installers.json',import.meta.url),'utf8'));
for(const slug of slugs){
 const dir=new URL(slug+'/',radarsRoot),readR=n=>readFile(new URL(n,dir),'utf8');
 const radar=JSON.parse(await readR('radar.json')),meta=JSON.parse(await readR('catalog.metadata.json')),demo=JSON.parse(await readR('demo_data.json'));
 if(radar.slug!==slug)throw Error(slug+': radar.json slug must match its folder');
 const source=buildSource(radar),functions=kit.functionDecls(radar,{common:briefCore+'\n'+common,brief,digest,alert}),{instructions,documentation}=kit.catalogText(radar);
 const entry={id:radar.id,version:radar.version,name:radar.name,description:meta.description,tags:meta.tags,whenToUse:meta.whenToUse,whenNotToUse:meta.whenNotToUse,instructions,documentation,engine:'frontend-js',
  defaults:{heading:radar.name,tableMap:'{}',pageSize:25,layoutProfile:'{}',readOnly:false,demoLabel:false,asOfOverride:''},
  options:{heading:{type:'string',description:'App heading shown above every screen.',default:radar.name},
   tableMap:{type:'string',description:`JSON object keyed by stable role key: organizations (core.v1, read/write), programs (core.v1, optional, read-only) and the app roles ${Object.values(kit.roles(radar)).join(', ')}. Each value is {typeId:<authorized table UUID>, fields:{<logical key>:<real field key>}, writableFields:[<logical keys>]}. The installer writes it; never invent table IDs.`,default:'{}'},
   pageSize:{type:'number',description:'Rows per page in lists (10 to 50).',default:25},
   layoutProfile:{type:'string',description:'Stringified native layout profile (heading, tabs, cols, visible) written by the layout gear review. Do not edit by hand.',default:'{}'},
   readOnly:{type:'boolean',description:'Disable every write control in this copy.',default:false},
   demoLabel:{type:'boolean',description:'Label the data as fictional (offline preview only).',default:false},
   asOfOverride:{type:'string',description:'Pinned as-of date YYYY-MM-DD for previews and tests. Leave empty in real apps.',default:''}},
  source,examples:[{configuration:{heading:radar.name,pageSize:25},description:'Default configuration; the installer writes tableMap.'}],
  functions,recommendedAutomations:kit.recipes(radar)};
 const serialized=JSON.stringify(entry,null,2)+'\n';
 if(Buffer.byteLength(serialized)>300000||source.length>180000||functions.some(f=>f.source.length>90000))throw Error(radar.name+' exceeds catalog limits ('+source.length+' source characters, '+Buffer.byteLength(serialized)+' bytes)');
 await output(new URL('../templates/apps/'+radar.id+'-'+radar.version+'.json',import.meta.url),serialized);
 const schema=kit.installerSchema(radar);
 await output(new URL('schema.example.json',dir),JSON.stringify(schema,null,2)+'\n');
 contracts.roles[kit.roles(radar).events]=kit.outputContract(radar);
 installers[radar.id+'@'+radar.version]='templates/source/radars/'+slug+'/schema.example.json';
 /* Offline preview: the same source and CSS with fictional records; reviews are simulated locally and nothing is sent. */
 const roleKeys=Object.keys(schema).filter(k=>demo.records.some(r=>r.role===k)||k!=='programs');
 const preview=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${radar.name} fictional preview</title><style>${css}</style><body><div style="padding:10px 16px;background:#fff;border-bottom:1px solid #DCE4EA;font:13px Inter,Arial,sans-serif;color:#1F3D57">Fictional local demo, fixed as of ${demo.asOf}. Reviews, automations, permissions and layout use the TrialAgents host; this file contacts nobody and sends nothing.</div><div id="surface"></div><script>
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
 await output(new URL(slug+'.preview.html',dir),preview);
 console.log(radar.name+' '+radar.version+': catalog entry, installer schema and preview '+(check?'verified':'built')+' ('+source.length+' source characters)');
}
await output(new URL('../templates/contracts/outputs.json',import.meta.url),JSON.stringify(contracts,null,2)+'\n');
await output(new URL('../templates/catalog-installers.json',import.meta.url),JSON.stringify(installers,null,2)+'\n');
