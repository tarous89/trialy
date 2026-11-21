import {readFile} from 'node:fs/promises';
import {appTemplates} from '../../src/workspace/app-templates.js';
/* 5.1, 5.8: the switched-on catalog apps prepared as an installed copy is (configuration and bindings before the
 * published code), with platform answers for their fictional demo records. Used by tests/frame-engine.test.ts and the
 * browser speed gate (tests/visual/frame-runtime.spec.cjs, through scripts/frame-gate-data.ts). No database or network. */
export const CATALOG_APPS:{id:string;directory:string}[]=[
 {id:'life.cash-runway',directory:'cash-runway'},{id:'life.contracts',directory:'contracts'},{id:'life.cro-selection',directory:'cro-selection'},
 {id:'life.data-room',directory:'data-room'},{id:'life.investor-crm',directory:'investor-crm'},{id:'life.investor-updates',directory:'investor-updates'},
 {id:'life.partnership-tracker',directory:'partnership-tracker'},{id:'life.project-oversight',directory:'project-oversight'},
 {id:'life.deal-radar',directory:'radars/deal-radar'},{id:'life.funding-radar',directory:'radars/funding-radar'},{id:'life.literature-radar',directory:'radars/literature-radar'},
 {id:'life.market-radar',directory:'radars/market-radar'},{id:'life.patent-radar',directory:'radars/patent-radar'},{id:'life.pipeline-radar',directory:'radars/pipeline-radar'},
 {id:'life.regulatory-radar',directory:'radars/regulatory-radar'},{id:'life.trial-radar',directory:'radars/trial-radar'},
];
/** Platform answers for the demo records, shaped as the platform answers them (filters, search and sort before paging). */
export function demoAnswers(demo:any){
 const rows=demo.records,X=demo.exchange,documents=demo.documents??[];
 const one=(input:any)=>{
  let selected=rows.filter((r:any)=>r.role===input.typeId&&Object.entries(input.filters??{}).every(([k,x])=>String(r.data[k])===x)&&(!input.q||Object.values(r.data).some(x=>String(x).toLowerCase().includes(String(input.q).toLowerCase()))));
  if(input.sort){const f=input.sort.field,d=input.sort.direction==='desc'?-1:1;selected=selected.slice().sort((a:any,b:any)=>{const x=a.data[f],y=b.data[f];if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return (typeof x==='number'?x-y:String(x).localeCompare(String(y)))*d;});}
  const limit=input.limit??25,offset=input.offset??0;
  return {rows:selected.slice(offset,offset+limit).map(({id,version,data}:any)=>({id,version,data})),total:selected.length,limit,offset};
 };
 return (name:string,input:any):any=>{
  if(name==='records.read')return one(input);
  if(name==='records.readMany')return {results:input.reads.map(one)};
  if(name==='integrations.list')return {integrations:[]};
  if(name==='roles.list')return {roles:[]};
  if(name==='documents.list')return {documents,total:documents.length,complete:true};
  if(name==='files.list')return {files:[]};
  if(name==='exchange.list'&&X)return {groups:X.groups.filter((g:any)=>(!input.groupId||g.id===input.groupId)&&(!input.appRef||g.appRef===input.appRef)),nextOffset:null};
  if(name==='exchange.status'&&X){for(const g of X.groups)for(const e of g.exchanges)if(e.id===input.exchangeId)return {exchangeId:e.id,recordId:e.recordId,status:e.status};throw new Error('Exchange not found');}
  if(name==='exchange.listSubmissions'&&X)return {submissions:X.submissions.filter((s:any)=>s.groupId===input.groupId||s.exchangeId===input.exchangeId),nextOffset:null};
  if(name==='exchange.listMessages'&&X)return {messages:X.messages.filter((m:any)=>!input.groupId||m.groupId===input.groupId).slice().reverse(),nextOffset:null};
  if(name==='exchange.listEmails'&&X)return {emails:X.emails.filter((m:any)=>m.groupId===input.groupId),nextOffset:null};
  if(name==='exchange.defaultEmail'&&X)return {emailType:input.emailType,subject:'Platform subject',body:'Platform body {link}',source:'app'};
  if(name==='exchange.notifications'&&X)return {notifications:[]};
  if(name.startsWith('exchange.')&&X)return {items:[],nextOffset:null};
  throw new Error('Capability unavailable');
 };
}
/** One catalog app at its seeded version, as installed with the demo schema, and its screens. */
export async function catalogDemo(app:{id:string;directory:string}){
 const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8'));
 const root=`templates/source/${app.directory}`,schema=JSON.parse(await readFile(`${root}/schema.example.json`,'utf8'));
 const demo=JSON.parse(await readFile(`${root}/demo_data.json`,'utf8'));
 const entry=await appTemplates.read({templateId:app.id,version:seed[app.id].version});
 const roles=Object.entries(schema) as [string,{logicalFields:Record<string,string>;readOnly?:boolean}][];
 const bindings=roles.map(([role,s])=>({typeId:role,fields:Object.values(s.logicalFields)}));
 const tableMap=Object.fromEntries(roles.map(([role,s])=>[role,{typeId:role,fields:s.logicalFields,writableFields:s.readOnly?[]:Object.keys(s.logicalFields)}]));
 const configuration={...entry.defaults,tableMap:JSON.stringify(tableMap),asOfOverride:demo.asOf??'2026-11-13'};
 const source=`const templateConfiguration=${JSON.stringify(configuration)};\nconst templateBindings=${JSON.stringify(bindings)};\n${entry.source}`;
 const layout=/^const templateLayoutSchema=(.+);$/m.exec(String(entry.source));
 const screens:string[]=layout?JSON.parse(layout[1]!).screens.map((s:any)=>s.id):['settings'];
 return {id:app.id,version:String(entry.version),source,screens,answer:demoAnswers(demo)};
}
