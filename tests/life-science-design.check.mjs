import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {inspectAppDesign} from '../src/workspace/design-quality.ts';
import {apps,buildSchemas,exampleRows} from '../templates/life-science/definitions.mjs';
const launch=chromium.launch.bind(chromium);
if(process.env.CHROMIUM_EXECUTABLE)chromium.launch=o=>launch({...o,executablePath:process.env.CHROMIUM_EXECUTABLE});
const results=[];
for(const a of apps.slice(Number(process.env.QA_START||0),Number(process.env.QA_END||apps.length))){
 const t=JSON.parse(await readFile('templates/apps/life.'+a.slug+'-1.0.0.json','utf8')),schemas=buildSchemas(a),records=exampleRows(a,schemas),bindings=[],map={};
 for(const [role,s]of Object.entries(schemas)){const fields=Object.fromEntries(s.fields.map(f=>[f.key,f.key]));map[role]={typeId:role,fields,writableFields:Object.keys(fields)};bindings.push({typeId:role,fields:Object.keys(fields)});}
 const run=new Function('templateConfiguration','templateBindings','input','tools',t.source);
 const tools={call(name,v){if(name==='records.read'){const rows=records[v.typeId]||[];return {rows:rows.slice(v.offset,v.offset+v.limit),total:rows.length};}throw Error(name);}};
 const frames=a.screens.map((s,i)=>({name:s.name,...run({...t.defaults,tableMap:JSON.stringify(map)},bindings,{saved:true,writable:true,state:{tab:i},event:{kind:'open'}},tools)}));
 const report=await inspectAppDesign(frames);results.push({app:a.slug,...report});console.log(a.slug,report.status,JSON.stringify(report.issues));
}
await writeFile(process.env.TEMPLATE_QA_OUTPUT||'/tmp/life-science-design-qa.json',JSON.stringify(results,null,2));
if(results.some(r=>r.status!=='passed'))process.exitCode=1;
