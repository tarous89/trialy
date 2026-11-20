// Spike 1.9 fixtures: the published catalog source of the three largest catalog apps, prepared exactly as the
// existing harnesses prepare it (tests/batched-read-apps.test.ts, tests/fixtures/partnerships.ts, tests/fixtures/cro-selection.ts
// and the scripts/build-*-template.mjs preview builders): the host-prepended configuration and bindings, the fictional demo
// records, and the platform response shapes for tools.call. Nothing here touches a database or the network.
import {readFile} from 'node:fs/promises';
export {createStore,inputFor} from './store.mjs';

export const REPO=new URL('../../../',import.meta.url);
const json=async path=>JSON.parse(await readFile(new URL(path,REPO),'utf8'));

/** The three apps named by the spike, with the screen used for the navigation measurement. */
export const APPS=[
 {id:'life.partnership-tracker',directory:'partnership-tracker',file:'partnerships.source.js',nav:'nav:pipeline'},
 {id:'life.cash-runway',directory:'cash-runway',file:'cash-runway.source.js',nav:'nav:cash_flow'},
 {id:'life.cro-selection',directory:'cro-selection',file:'cro-selection.source.js',nav:'nav:evaluation'},
];

/** Rows in the largest table of the "long table" fixture, as in tests/batched-read-apps.test.ts. */
export const LONG_TABLE_ROWS=350;

export async function loadFixtures(){
 const seed=await json('templates/catalog-seed.json'),out=[];
 for(const app of APPS){
  const root=`templates/source/${app.directory}`,version=seed[app.id].version;
  const [entry,schema,demoFile]=await Promise.all([json(`templates/apps/${app.id}-${version}.json`),json(`${root}/schema.example.json`),json(`${root}/demo_data.json`)]);
  const readable=await readFile(new URL(`${root}/${app.file}`,REPO),'utf8');
  const roles=Object.entries(schema);
  const bindings=roles.map(([role,s])=>({typeId:role,fields:Object.values(s.logicalFields)}));
  const tableMap=Object.fromEntries(roles.map(([role,s])=>[role,{typeId:role,fields:s.logicalFields,writableFields:s.readOnly?[]:Object.keys(s.logicalFields)}]));
  const configuration={...entry.defaults,tableMap:JSON.stringify(tableMap),asOfOverride:demoFile.asOf??'2026-11-13'};
  // AppTemplates.operation (src/workspace/app-templates.ts:85) prepends exactly these two lines to the catalog source.
  const source=`const templateConfiguration=${JSON.stringify(configuration)};\nconst templateBindings=${JSON.stringify(bindings)};\n${entry.source}`;
  const layout=JSON.parse(/^const templateLayoutSchema=(.+);$/m.exec(entry.source)[1]);
  const counts=new Map();for(const r of demoFile.records)counts.set(r.role,(counts.get(r.role)??0)+1);
  const largest=[...counts].sort((a,b)=>b[1]-a[1])[0][0];
  const long=structuredClone(demoFile.records),seeds=long.filter(r=>r.role===largest);
  for(let i=seeds.length;i<LONG_TABLE_ROWS;i++)long.push({...structuredClone(seeds[i%seeds.length]),id:`long-table-${i}`});
  out.push({
   id:app.id,version,nav:app.nav,screens:layout.screens.map(s=>s.id),largestTable:largest,
   readableSourceBytes:Buffer.byteLength(readable),catalogSourceChars:entry.source.length,sourceChars:source.length,source,
   data:{
    demo:{records:demoFile.records,documents:demoFile.documents??[],exchange:demoFile.exchange??null},
    long:{records:long,documents:demoFile.documents??[],exchange:demoFile.exchange??null},
   },
  });
 }
 return out;
}
