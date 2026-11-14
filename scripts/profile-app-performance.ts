/** Local synthetic baseline only: real published QuickJS source, fictional records, no database or external services. */
import {readFile} from 'node:fs/promises';
import {execute} from '../src/foundation/runtime.js';
import {createRequestMetrics,metricSummary,withRequestMetrics} from '../src/db/metrics.js';
import {appTemplates} from '../src/workspace/app-templates.js';

const apps=[
 {id:'life.cash-runway',version:'2.1.0',directory:'cash-runway/archive/2.1.0',role:'runway.plan_lines'},
 {id:'life.project-oversight',version:'2.1.0',directory:'project-oversight',role:'programs.plan_items'},
 {id:'life.contracts',version:'1.0.0',directory:'contracts',role:'agreements'},
];
for(const app of apps){
 const root=`templates/source/${app.directory}`,schema=JSON.parse(await readFile(`${root}/schema.example.json`,'utf8'));
 const demo=JSON.parse(await readFile(`${root}/demo_data.json`,'utf8')).records as {id:string;version:number;role:string;data:Record<string,unknown>}[];
 const entry=await appTemplates.read({templateId:app.id,version:app.version});
 const roles=Object.entries(schema) as [string,{logicalFields:Record<string,string>;readOnly?:boolean}][];
 const bindings=roles.map(([role,s])=>({typeId:role,fields:Object.values(s.logicalFields)}));
 const tableMap=Object.fromEntries(roles.map(([role,s])=>[role,{typeId:role,fields:s.logicalFields,writableFields:s.readOnly?[]:Object.keys(s.logicalFields)}]));
 const configuration={...entry.defaults,tableMap:JSON.stringify(tableMap),asOfOverride:'2026-11-13'};
 const source=`const templateConfiguration=${JSON.stringify(configuration)};\nconst templateBindings=${JSON.stringify(bindings)};\n${entry.source}`;
 for(const volume of ['demo','250 rows'] as const){
  const rows=structuredClone(demo),seeds=rows.filter(r=>r.role===app.role);
  if(!seeds.length)throw Error(`Missing ${app.role} fixture`);
  if(volume==='250 rows')for(let i=seeds.length;i<250;i++)rows.push({...structuredClone(seeds[i%seeds.length]),id:`performance-fixture-${i}`});
  let state:any={};
  for(const event of [{kind:'open',action:''},{kind:'click',action:'nav:settings'}]){
   const metrics=createRequestMetrics();let reads=0,returnedRows=0;
   const output:any=await withRequestMetrics(metrics,()=>execute(source,{saved:true,writable:true,state,event},async(name,input:any)=>{
    if(name==='records.read'){
     const selected=rows.filter(r=>r.role===input.typeId),page=selected.slice(input.offset,input.offset+input.limit).map(({id,version,data})=>({id,version,data}));
     reads++;returnedRows+=page.length;return {rows:page,total:selected.length,limit:input.limit,offset:input.offset};
    }
    if(name==='integrations.list')return {integrations:[]};
    if(name==='documents.list')return {documents:[],total:0,complete:true};
    throw Error(`Unexpected capability in read-only fixture: ${name}`);
   }));
   state=output.state;
   console.log(JSON.stringify({app:app.id,version:app.version,fixture:volume,event:event.action||event.kind,fixtureRows:rows.length,expandedRole:app.role,recordsReads:reads,returnedRows,...metricSummary(metrics)}));
  }
 }
}
