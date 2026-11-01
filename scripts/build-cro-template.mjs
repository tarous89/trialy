import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../templates/source/cro-oversight/',import.meta.url),read=n=>readFile(new URL(n,root),'utf8');
const [metadata,source,css,demo]=await Promise.all(['catalog.metadata.json','source.js','style.css','demo_data.json'].map(read));
const entry=JSON.parse(metadata);const first=source.indexOf('\n');entry.source=source.slice(0,first)+'\nconst CRO_OVERSIGHT_CSS='+JSON.stringify(css)+';\n'+source.slice(first+1);
const serialized=JSON.stringify(entry,null,2)+'\n';
if(Buffer.byteLength(serialized)>300000||entry.source.length>180000)throw Error('Template exceeds catalog limits');
const catalog=new URL('../../apps/'+entry.id+'-'+entry.version+'.json',root);
const preview=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CRO Oversight fictional preview</title><style>${css}</style><body><div id="surface"></div><script>
const source=${JSON.stringify(entry.source).replaceAll('</','<\/')};
const demo=(${demo}).records;const metadata=${metadata};
const roles=['projects','tasks','assessments','requirements','activities','reports'];
const map=Object.fromEntries(roles.map(role=>{const fields=[...new Set(demo.filter(r=>r.role===role).flatMap(r=>Object.keys(r.data)))];return [role,{typeId:role,fields:Object.fromEntries(fields.map(k=>[k,k])),writableFields:fields}]}));
const bindings=roles.map(role=>({typeId:role,fields:Object.keys(map[role].fields)}));
const config={...metadata.defaults,asOf:'2026-11-01',demoLabel:true,tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
let state={},rows=demo,proposal=null;
function dispatch(event){if(event.action==='tracker:layout'){alert('Layout is managed in native TrialAgents App Settings. This file demonstrates the CRO oversight screens only.');return;}
 const out=render({saved:true,writable:true,state,event},{call:(name,v)=>{if(name==='records.read'){const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};}if(name==='records.propose'){proposal=v;return {status:'proposed'};}throw Error('Unsupported preview capability');}},config,bindings);
 state=out.state;document.getElementById('surface').innerHTML=out.html;
 if(proposal){const changes=proposal;proposal=null;if(confirm('FICTIONAL LOCAL REVIEW ONLY\\n'+JSON.stringify(changes,null,2))){for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:crypto.randomUUID(),version:0,data:c.data});else{const r=rows.find(r=>r.id===c.recordId);if(r&&r.version===c.expectedVersion){r.data={...r.data,...c.data};r.version++;}}}dispatch({kind:'open',action:''});}}
}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:target.value??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit')eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();eventFor('submit',e.target);});
document.addEventListener('change',e=>eventFor('change',e.target));
dispatch({kind:'open',action:''});
</script></body></html>`;
async function output(url,text){if(process.argv.includes('--check')){if(await readFile(url,'utf8')!==text)throw Error('Generated file is stale: '+url.pathname);}else await writeFile(url,text);}
await output(catalog,serialized);await output(new URL('preview.html',root),preview);
console.log('CRO Oversight '+entry.version+': catalog and preview '+(process.argv.includes('--check')?'verified':'built'));
