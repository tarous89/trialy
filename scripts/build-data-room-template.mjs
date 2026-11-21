import {readFile,writeFile} from 'node:fs/promises';
import {transformSync} from 'esbuild';
// Data Room (life.data-room): catalog JSON and the offline fictional preview, generated from templates/source/data-room/.
// 2.0.0 (v2 app contract, kit) is built from the source folder; 1.1.1 is built byte-identical from archive/1.1.1/ (1.0.0 and
// 1.1.0 are archived unchanged and not rebuilt). --check (part of `npm run build`) fails when any generated file is stale.
const check=process.argv.includes('--check');
const base=new URL('../templates/source/data-room/',import.meta.url);
async function output(url,text){if(check){if(await readFile(url,'utf8')!==text)throw Error('Generated file is stale: '+url.pathname);}else await writeFile(url,text);}
const minify=body=>{const pre='globalThis.__app=function(input,tools,templateConfiguration,templateBindings){';
 const wrapped=transformSync(pre+body+'\n};',{minifyWhitespace:true,minifySyntax:true,legalComments:'none'}).code.trim();
 if(!wrapped.startsWith(pre)||!wrapped.endsWith('};'))throw Error('Unexpected minifier output');return wrapped.slice(pre.length,-2);};
const lineAt=(source,from,prefix)=>{const nl=source.indexOf('\n',from),line=source.slice(from,nl);if(!line.startsWith(prefix))throw Error('Expected a line starting with '+prefix);return [line,nl+1];};

async function build(root,v2){
 const read=n=>readFile(new URL(n,root),'utf8');
 const [metadata,source,css,demo,schema]=await Promise.all(['catalog.metadata.json','data-room.source.js','data-room.css','demo_data.json','schema.example.json'].map(read));
 const entry=JSON.parse(metadata);
 // The readable source is canonical; the catalog carries it with whitespace and redundant syntax removed (identifiers unchanged).
 // The declaration lines are kept verbatim: the platform reads templateLayoutSchema and appCommands as data, and v2 code
 // declares the contract on its first line (constants the builder adds come after it).
 if(v2){
  let at=0,marker,layoutLine,commandsLine;[marker,at]=lineAt(source,at,"'use trialagents v2';");[layoutLine,at]=lineAt(source,at,'const templateLayoutSchema=');[commandsLine,at]=lineAt(source,at,'const appCommands=');
  if(marker!=="'use trialagents v2';"||!commandsLine.endsWith(';'))throw Error('Lines 1–3 must be the v2 marker, templateLayoutSchema and appCommands');
  entry.source=marker+'\n'+layoutLine+'\n'+commandsLine+'\nconst DATAROOM_CSS='+JSON.stringify(css)+';\n'+minify(source.slice(at))+'\n';
 }else{
  let at=0,layoutLine,commandsLine;[layoutLine,at]=lineAt(source,at,'const templateLayoutSchema=');[commandsLine,at]=lineAt(source,at,'const appCommands=');
  if(!commandsLine.endsWith(';'))throw Error('Line 2 must declare appCommands');
  entry.source='const DATAROOM_CSS='+JSON.stringify(css)+';\n'+layoutLine+'\n'+commandsLine+'\n'+minify(source.slice(at))+'\n';
 }
 // E7 read-only helpers: source lives in functions/*.js and is inlined into the immutable catalog entry (unchanged in 2.0.0).
 entry.functions=await Promise.all((entry.functions??[]).map(async({sourceFile,...f})=>({...f,source:(await read(sourceFile)).trim()})));
 const serialized=JSON.stringify(entry,null,2)+'\n';
 if(Buffer.byteLength(serialized)>300000||entry.source.length>240000||css.length>(v2?12000:50000))throw Error('Data Room template exceeds catalog limits ('+entry.source.length+' source characters)');
 await output(new URL('../../apps/'+entry.id+'-'+entry.version+'.json',base),serialized);
 await output(new URL('data-room.preview.html',root),v2?await previewV2(entry,metadata,demo,schema):previewV1(entry,metadata,css,demo,schema));
 return entry.version;
}

/* 2.0.0 gallery preview (D40): the fictional demo set, clearly labelled, run in this page with the kit placed ahead of the code
 * exactly as the platform runtime does. Saves change only this page's copy; sends and room changes are refused. */
async function previewV2(entry,metadata,demo,schema){
 const {KIT_SOURCE,kitCss}=await import('../src/shared/app-kit.ts');
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Data Room fictional preview</title><style>${kitCss()}</style><style id="app"></style><body><p style="margin:0;padding:8px 16px;background:#fff4dc;color:#5c3d00;font:13px Inter,Arial,sans-serif">Fictional demo data, fixed as of 13 Nov 2026. Sends, links and room changes need TrialAgents; this page contacts nobody.</p><div id="surface"></div><script>
const source=${JSON.stringify(KIT_SOURCE+'\n'+entry.source).replaceAll('</','<\\/')};
const demo=${demo};const metadata=${metadata};const schema=${schema};
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(role=>[role,{typeId:role,fields:schema[role].logicalFields,writableFields:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:role,fields:Object.values(schema[role].logicalFields)}));
const config={...metadata.defaults,asOfOverride:demo.asOf,tableMap:JSON.stringify(map)};
const render=new Function('input','tools','templateConfiguration','templateBindings',source);
const X=demo.exchange;let state={},rows=demo.records.map(r=>({...r})),next=1,notice=null;
const read=v=>{const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};};
function exchange(name,v){if(name==='exchange.list')return {groups:X.groups.filter(g=>(!v.groupId||g.id===v.groupId)&&(!v.appRef||g.appRef===v.appRef)),nextOffset:null};
 if(name==='exchange.listQuestions')return {questions:X.questions.filter(q=>!v.groupId||q.groupId===v.groupId),published:X.published,nextOffset:null};
 if(name==='exchange.listEmails')return {emails:X.emails.filter(m=>m.groupId===v.groupId),nextOffset:null};
 if(name==='exchange.listSubmissions')return {submissions:X.submissions.filter(s=>s.groupId===v.groupId),nextOffset:null};
 throw Error('This fictional preview sends nothing and changes no room. In TrialAgents you confirm it once.');}
function apply(changes){for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-9000-'+String(next++).padStart(12,'0'),version:0,data:c.data});else{const r=rows.find(r=>r.id===c.recordId);if(!r)continue;if(c.kind==='archive_record'){rows.splice(rows.indexOf(r),1);continue;}r.data={...r.data,...c.data};r.version++;}}}
function dispatch(event){let saves=[];
 const out=render({saved:true,writable:true,appRole:'owner',context:null,viewport:{width:innerWidth<560?'phone':innerWidth<900?'panel':'wide',coarse:false},state,event},{call:(name,v)=>{
  if(name==='records.read')return read(v);if(name==='records.readMany')return {results:v.reads.map(read)};
  if(name==='records.save'){if(!v.changes.length)throw Error('nothing');saves.push(...v.changes);return {status:'saving',count:v.changes.length};}
  if(name==='documents.list')return {documents:demo.documents,total:demo.documents.length,complete:true};
  if(name==='undo.list')return {actions:[]};
  if(name.startsWith('exchange.'))return exchange(name,v);throw Error('Unavailable in the preview');}},config,bindings);
 state=out.state;if(saves.length){apply(saves);dispatch({kind:'open',action:''});return;}
 document.getElementById('app').textContent=out.css||'';document.getElementById('surface').innerHTML=out.html;
 if(out.notice&&event.kind!=='open')alert(out.notice.message);}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:(kind==='submit'&&window.__submitter?window.__submitter.value:target.value)??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit'&&!b.dataset.trialyDocument)eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();window.__submitter=e.submitter||null;eventFor('submit',e.target);});
document.addEventListener('change',e=>{if(!e.target.closest('form')||e.target.dataset.action)eventFor('change',e.target);});
dispatch({kind:'open',action:''});
</script></body></html>`;
}

/* 1.1.1 preview, unchanged. */
function previewV1(entry,metadata,css,demo,schema){
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Data Room fictional preview</title><style>${css}</style><body><div style="padding:10px 16px;background:#fff;border-bottom:1px solid #DCE4EA;font:13px Inter,Arial,sans-serif;color:#1F3D57">Fictional local demo, fixed as of 13 Nov 2026. Party pages, emails, documents, Database review, permissions and persistent layout use the TrialAgents host; this file contacts nobody.</div><div id="surface"></div><script>
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
 if(name==='exchange.listQuestions')return {questions:X.questions.filter(q=>!v.groupId||q.groupId===v.groupId),published:X.published,nextOffset:null};
 if(name==='exchange.listEmails')return {emails:X.emails.filter(m=>m.groupId===v.groupId),nextOffset:null};
 if(name==='exchange.defaultEmail')return {unavailable:true};
 if(name==='exchange.prepareEmail')throw Error('The send review needs the TrialAgents host. This preview sends nothing.');
 return {status:'review_required'};}
function dispatch(event){if(event.action==='tracker:layout'){alert('Layout is managed in native TrialAgents app settings. This file demonstrates the screens only.');return;}
 const out=render({saved:true,writable:true,state,event},{call:(name,v)=>{if(name==='records.read'){const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};}if(name==='records.propose'){proposal=v;return {status:'proposed'};}if(name.startsWith('exchange.')){if(!name.match(/^exchange\\.(list|status|listSubmissions|listMessages|listEmails|defaultEmail|prepareEmail)$/))alert('FICTIONAL LOCAL PREVIEW: '+name+' would be shown for review in TrialAgents. Nothing is sent.');return exchange(name,v);}if(name==='documents.list')return {documents:demo.documents,total:demo.documents.length,complete:true};if(name==='integrations.list')return {integrations:[]};throw Error('Unsupported preview capability');}},config,bindings);
 state=out.state;document.getElementById('surface').innerHTML=out.html;
 if(proposal){const changes=proposal;proposal=null;if(confirm('FICTIONAL LOCAL REVIEW ONLY\\n'+JSON.stringify(changes,null,2).slice(0,3000))){if(changes.some(c=>c.kind==='update_record'&&!rows.some(r=>r.id===c.recordId&&r.version===c.expectedVersion))){alert('Stale review: a record changed since the form opened.');return;}for(const c of changes){if(c.kind==='create_record')rows.push({role:c.typeId,id:'00000000-0000-4000-9000-'+String(next++).padStart(12,'0'),version:0,data:c.data});else{const r=rows.find(r=>r.id===c.recordId);r.data={...r.data,...c.data};r.version++;}}dispatch({kind:'open',action:''});}}
}
function eventFor(kind,target){const trigger=target.closest('[data-action]');if(!trigger)return;const form=trigger.closest('form');dispatch({kind,action:trigger.dataset.action,value:target.type==='checkbox'?target.checked:(kind==='submit'&&window.__submitter?window.__submitter.value:target.value)??null,form:form?Object.fromEntries(new FormData(form)):{}});}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&b.type!=='submit'&&!b.dataset.trialyDocument)eventFor('click',b);});
document.addEventListener('submit',e=>{e.preventDefault();window.__submitter=e.submitter||null;eventFor('submit',e.target);});
document.addEventListener('change',e=>eventFor('change',e.target));
dispatch({kind:'open',action:''});
</script></body></html>`;
}

const built=[await build(new URL('archive/1.1.1/',base),false),await build(base,true)];
console.log('Data Room '+built.join(' and ')+': catalog and preview '+(check?'verified':'built'));
