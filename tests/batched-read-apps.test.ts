import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execute} from '../src/foundation/runtime.js';
import {appTemplates} from '../src/workspace/app-templates.js';
/* Catalog apps converted to records.readMany: the published source, run in the production runtime on fictional records,
 * must render exactly what it renders with one call per read, in fewer calls. No database or external service. */
const APPS:{id:string;directory:string}[]=[
 {id:'life.cash-runway',directory:'cash-runway'},
 {id:'life.contracts',directory:'contracts'},
 {id:'life.cro-selection',directory:'cro-selection'},
 {id:'life.data-room',directory:'data-room'},
 {id:'life.investor-crm',directory:'investor-crm'},
 {id:'life.investor-updates',directory:'investor-updates'},
 {id:'life.partnership-tracker',directory:'partnership-tracker'},
 {id:'life.project-oversight',directory:'project-oversight'},
 {id:'life.deal-radar',directory:'radars/deal-radar'},
 {id:'life.funding-radar',directory:'radars/funding-radar'},
 {id:'life.literature-radar',directory:'radars/literature-radar'},
 {id:'life.market-radar',directory:'radars/market-radar'},
 {id:'life.patent-radar',directory:'radars/patent-radar'},
 {id:'life.pipeline-radar',directory:'radars/pipeline-radar'},
 {id:'life.regulatory-radar',directory:'radars/regulatory-radar'},
 {id:'life.trial-radar',directory:'radars/trial-radar'},
];
const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8'));
type Row={id:string;version:number;role:string;data:Record<string,unknown>};
for(const app of APPS)test(`${app.id}: batched reads render the same screens in fewer calls`,async()=>{
 const root=`templates/source/${app.directory}`,schema=JSON.parse(await readFile(`${root}/schema.example.json`,'utf8'));
 const demoFile=JSON.parse(await readFile(`${root}/demo_data.json`,'utf8')),demo=demoFile.records as Row[];
 const entry=await appTemplates.read({templateId:app.id,version:seed[app.id].version});
 const roles=Object.entries(schema) as [string,{logicalFields:Record<string,string>;readOnly?:boolean}][];
 const bindings=roles.map(([role,s])=>({typeId:role,fields:Object.values(s.logicalFields)}));
 const tableMap=Object.fromEntries(roles.map(([role,s])=>[role,{typeId:role,fields:s.logicalFields,writableFields:s.readOnly?[]:Object.keys(s.logicalFields)}]));
 const configuration={...entry.defaults,tableMap:JSON.stringify(tableMap),asOfOverride:demoFile.asOf??'2026-11-13'};
 const source=`const templateConfiguration=${JSON.stringify(configuration)};\nconst templateBindings=${JSON.stringify(bindings)};\n${entry.source}`;
 const counts=new Map<string,number>();for(const r of demo)counts.set(r.role,(counts.get(r.role)??0)+1);
 const largest=[...counts].sort((a,b)=>b[1]-a[1])[0][0];
 for(const volume of ['demo','long table','restricted table'] as const){
  const rows=structuredClone(demo),seeds=rows.filter(r=>r.role===largest);
  if(volume==='long table')for(let i=seeds.length;i<350;i++)rows.push({...structuredClone(seeds[i%seeds.length]),id:`long-table-${i}`});
  const restricted=volume==='restricted table'?largest:undefined;
  const run=async(batching:boolean)=>{
   let state:any={},calls=0,reads=0;const outputs:any[]=[];
   const one=(input:any)=>{
    reads++;if(input.typeId===restricted)return {unavailable:true,message:'This table is restricted',rows:[],total:null,limit:input.limit,offset:input.offset};
    // Filters, search and sort apply to the whole table before paging, as on the platform.
    let selected=rows.filter(r=>r.role===input.typeId&&Object.entries(input.filters??{}).every(([k,x])=>String(r.data[k])===x)&&(!input.q||Object.values(r.data).some(x=>String(x).toLowerCase().includes(String(input.q).toLowerCase()))));
    if(input.sort){const f=input.sort.field,d=input.sort.direction==='desc'?-1:1;selected=selected.slice().sort((a:any,b:any)=>{const x=a.data[f],y=b.data[f];if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return (typeof x==='number'?x-(y as number):String(x).localeCompare(String(y)))*d;});}
    return {rows:selected.slice(input.offset,input.offset+input.limit).map(({id,version,data})=>({id,version,data})),total:selected.length,limit:input.limit,offset:input.offset};
   };
   for(const event of [{kind:'open',action:''},{kind:'click',action:'nav:settings'}]){
    const output:any=await execute(source,{saved:true,writable:true,state,event},async(name,input:any)=>{
     if(name==='records.read'){calls++;return one(input);}
     if(name==='records.readMany'){
      if(!batching)throw Error('Capability unavailable');
      assert.ok(Array.isArray(input.reads)&&input.reads.length>=2&&input.reads.length<=12,'a batch holds 2 to 12 reads');
      calls++;return {results:input.reads.map(one)};
     }
     if(name==='integrations.list')return {integrations:[]};
     if(name==='roles.list')return {roles:[]};
     if(name==='documents.list'||name==='files.list')return {documents:[],files:[],total:0,complete:true};
     throw Error(`Unexpected capability in read-only fixture: ${name}`);
    });
    state=output.state;outputs.push({html:output.html,css:output.css,state:output.state});
   }
   return {outputs,calls,reads};
  };
  const single=await run(false),batched=await run(true);
  assert.deepEqual(batched.outputs,single.outputs,`${volume}: identical screens and state`);
  assert.equal(batched.reads,single.reads,`${volume}: the same reads, each still counted`);
  console.log(JSON.stringify({app:app.id,version:entry.version,fixture:volume,reads:single.reads,callsSingle:single.calls,callsBatched:batched.calls}));
  assert.ok(single.calls<6||batched.calls<=Math.ceil(single.calls/2),`${volume}: ${batched.calls} calls instead of ${single.calls}`);
 }
});
