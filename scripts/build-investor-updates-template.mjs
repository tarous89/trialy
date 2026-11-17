import {readFile,writeFile} from 'node:fs/promises';
import {transformSync} from 'esbuild';
// Investor Updates (life.investor-updates) 1.x: catalog JSON and the offline fictional preview, generated from templates/source/investor-updates/.
// The readable source is canonical; the catalog carries it with whitespace and redundant syntax removed (identifiers unchanged). Line 1
// (templateLayoutSchema) and line 2 (appCommands) are kept verbatim: the host reads them as single-line JSON and never executes them.
const root=new URL('../templates/source/investor-updates/',import.meta.url),read=n=>readFile(new URL(n,root),'utf8');
const [metadata,source,css,demo,schema]=await Promise.all(['catalog.metadata.json','investor-updates.source.js','investor-updates.css','demo_data.json','schema.example.json'].map(read));
const nl=source.indexOf('\n'),layoutLine=source.slice(0,nl);if(!layoutLine.startsWith('const templateLayoutSchema='))throw Error('Line 1 must declare templateLayoutSchema');JSON.parse(layoutLine.slice(27,-1));
const nl2=source.indexOf('\n',nl+1),commandsLine=source.slice(nl+1,nl2);if(!/^const appCommands=\[.*\];$/.test(commandsLine))throw Error('Line 2 must declare appCommands');JSON.parse(commandsLine.slice(18,-1));
const pre='globalThis.__app=function(input,tools,templateConfiguration,templateBindings){';
const wrapped=transformSync(pre+source.slice(nl2+1)+'\n};',{minifyWhitespace:true,minifySyntax:true,legalComments:'none'}).code.trim();
if(!wrapped.startsWith(pre)||!wrapped.endsWith('};'))throw Error('Unexpected minifier output');
const entry=JSON.parse(metadata);entry.source='const INVESTOR_UPDATES_CSS='+JSON.stringify(css)+';\n'+layoutLine+'\n'+commandsLine+'\n'+wrapped.slice(pre.length,-2)+'\n';
// E7 read-only helpers: source lives in functions/*.js and is inlined into the immutable catalog entry.
entry.functions=await Promise.all((entry.functions??[]).map(async({sourceFile,...f})=>({...f,source:(await read(sourceFile)).trim()})));
const serialized=JSON.stringify(entry,null,2)+'\n';
if(Buffer.byteLength(serialized)>300000||entry.source.length>240000||css.length>50000)throw Error('Investor Updates template exceeds catalog limits ('+entry.source.length+' source characters, '+Buffer.byteLength(serialized)+' bytes)');
const catalog=new URL('../../apps/'+entry.id+'-'+entry.version+'.json',root);
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
async function output(url,text){if(process.argv.includes('--check')){if(await readFile(url,'utf8')!==text)throw Error('Generated file is stale: '+url.pathname);}else await writeFile(url,text);}
await output(catalog,serialized);await output(new URL('investor-updates.preview.html',root),preview);
console.log('Investor Updates '+entry.version+': catalog and preview '+(process.argv.includes('--check')?'verified':'built')+' ('+entry.source.length+' source characters, '+Buffer.byteLength(serialized)+' bytes)');
