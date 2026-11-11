import {readFile,writeFile} from 'node:fs/promises';
// Programs (life.project-oversight) 2.x. The released 1.0.1 files are archived unchanged under templates/source/project-oversight/archive/1.0.1/.
const root=new URL('../templates/source/project-oversight/',import.meta.url),read=n=>readFile(new URL(n,root),'utf8');
const [metadata,source,css,demo,schema]=await Promise.all(['catalog.metadata.json','programs.source.js','programs.css','demo_data.json','schema.example.json'].map(read));
const entry=JSON.parse(metadata);entry.source='const PROGRAMS_CSS='+JSON.stringify(css)+';\n'+source;
const serialized=JSON.stringify(entry,null,2)+'\n';
if(Buffer.byteLength(serialized)>300000||entry.source.length>180000||css.length>50000)throw Error('Programs template exceeds catalog limits');
const catalog=new URL('../../apps/'+entry.id+'-'+entry.version+'.json',root);
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
 const out=render({saved:true,writable:true,state,event},{call:(name,v)=>{if(name==='records.read'){const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};}if(name==='records.propose'){proposal=v;return {status:'proposed'};}throw Error('Unsupported preview capability');}},config,bindings);
 state=out.state;document.getElementById('surface').innerHTML=out.html;
 if(proposal){const changes=proposal;proposal=null;if(confirm('FICTIONAL LOCAL REVIEW ONLY\\n'+JSON.stringify(changes,null,2).slice(0,3000))){if(changes.some(c=>c.kind==='update_record'&&!rows.some(r=>r.id===c.recordId&&r.version===c.expectedVersion))){alert('Stale review: a record changed since the form opened.');return;}for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-9000-'+String(next++).padStart(12,'0'),version:0,data:c.data});else{const r=rows.find(r=>r.id===c.recordId);r.data={...r.data,...c.data};r.version++;}}dispatch({kind:'open',action:''});}}
}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:target.value??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit')eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();eventFor('submit',e.target);});
document.addEventListener('change',e=>eventFor('change',e.target));
dispatch({kind:'open',action:''});
</script></body></html>`;
async function output(url,text){if(process.argv.includes('--check')){if(await readFile(url,'utf8')!==text)throw Error('Generated file is stale: '+url.pathname);}else await writeFile(url,text);}
await output(catalog,serialized);await output(new URL('programs.preview.html',root),preview);
console.log('Programs '+entry.version+': catalog and preview '+(process.argv.includes('--check')?'verified':'built'));
