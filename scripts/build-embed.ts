import {fileURLToPath} from 'node:url';
import {build,type Plugin} from 'esbuild';
import {createHash} from 'node:crypto';
import {rm} from 'node:fs/promises';
import {relative} from 'node:path';
import {appPublicUrl,PLATFORM_ORIGIN} from '../src/shared/public-url.js';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
/* L4.5 (docs/scopes/LOADING_SPEED_2026-11-22.md, section 6 item 9): the widget is built in two parts.
 * Part one, inside dist/embed.html, is everything src/embed/main.tsx reaches: the first screen (Apps home, an app, a
 * preview). It is one scope-hoisted bundle, as before the split, so the first screen starts as fast as it did.
 * Part two is what only src/embed/late-pages.tsx reaches, written as one file to dist/widget-parts/ and downloaded by the
 * widget right after the first screen is shown (src/embed/late-part.tsx). Where part two imports a module part one
 * holds (React, the shared contexts, the kit), it uses part one's copy: part one publishes those modules' namespaces in
 * globalThis.__trialyShared and part two reads them there, so there is exactly one copy of every module.
 * TRIALY_WIDGET_SINGLE_FILE=1 (or --single-file) puts part two back inside the widget file. */
const singleFile=process.env.TRIALY_WIDGET_SINGLE_FILE==='1'||process.argv.includes('--single-file');
// Tests build the other variant elsewhere so a running server's dist/ is never replaced underneath it.
const out=(process.env.TRIALY_WIDGET_OUT_DIR??'dist').replace(/\/$/,'');
const LATE_FILE='__TRIALY_LATE_FILE__',LATE_INTEGRITY='__TRIALY_LATE_INTEGRITY__';
const plugins=():Plugin[]=>[{name:'embedded-brand-assets',setup(build){build.onResolve({filter:/^\/trialagents-mark-(?:black|white)(?:-96)?\.png\?url$/},args=>({path:fileURLToPath(new URL('../public/'+args.path.slice(1,-4),import.meta.url))}));}},
 // L3.6: the widget never selects another language for validation messages, so zod's translations (about 260 KB) stay out.
 // English is imported by zod directly and is kept; z.locales is empty in the widget.
 {name:'without-zod-translations',setup(build){build.onResolve({filter:/^\.\.\/locales\/index\.js$/},args=>/[\\/]zod[\\/]v4[\\/](?:classic|core|mini)[\\/]/.test(args.importer)?{path:'zod-locales',namespace:'empty'}:undefined);build.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'export {}',loader:'js'}));}}];
const common={bundle:true,minify:true,platform:'browser' as const,loader:{'.png':'dataurl' as const},write:false,metafile:true,external:['/fonts/*'],
 define:{'__TRIALY_APP_URL__':JSON.stringify(appPublicUrl(process.env,PLATFORM_ORIGIN)),'__TRIALY_LATE_PART__':JSON.stringify({file:LATE_FILE,integrity:LATE_INTEGRITY}),'process.env.NODE_ENV':'"production"'}};
const cwd=process.cwd(),key=(path:string)=>relative(cwd,path).replace(/\\/g,'/');
const inputs=(result:Awaited<ReturnType<typeof build>>)=>new Set(Object.values(result.metafile!.outputs).filter(o=>o.entryPoint||Object.keys(o.inputs).length).flatMap(o=>Object.keys(o.inputs)));
/** Part one: main.tsx, publishing the namespaces of the modules part two shares with it (set as the script finishes,
 * before React renders the first screen; part two runs only after that screen is shown). */
async function partOne(shared:string[]){
 const entry=shared.map((k,i)=>`import * as m${i} from ${JSON.stringify('./'+k)};`).join('')+`globalThis.__trialyShared={${shared.map((k,i)=>`${JSON.stringify(k)}:m${i}`).join(',')}};`+"import './src/embed/main.tsx';";
 return build({...common,stdin:{contents:entry,resolveDir:cwd,sourcefile:'widget-entry.ts',loader:'ts'},outfile:'widget.js',format:'iife',plugins:plugins()});
}
/** Part two: late-pages.tsx, with every module part one holds read from globalThis.__trialyShared. */
async function partTwo(held:Set<string>){
 const used=new Set<string>();
 const result=await build({...common,entryPoints:['src/embed/late-pages.tsx'],outfile:'late.js',format:'iife',globalName:'__trialyLatePages',plugins:[...plugins(),{name:'shared-with-part-one',setup(b):void{
  b.onResolve({filter:/.*/},async args=>{
   if(args.pluginData?.shared||args.kind==='entry-point'||args.namespace!=='file')return undefined;
   const resolved=await b.resolve(args.path,{importer:args.importer,resolveDir:args.resolveDir,kind:args.kind,pluginData:{shared:true}});
   if(resolved.errors.length||resolved.external||!resolved.path)return undefined;
   const k=key(resolved.path);if(!held.has(k))return undefined;
   used.add(k);return {path:k,namespace:'trialy-shared'};
  });
  // Part one has finished starting long before part two runs, so its exports are read once, as values.
  b.onLoad({filter:/.*/,namespace:'trialy-shared'},args=>({contents:`var n=globalThis.__trialyShared[${JSON.stringify(args.path)}],o={__esModule:true};for(var k in n)o[k]=n[k];module.exports=o;`,loader:'js'}));
 }}]});
 return {result,used:[...used].sort()};
}
let shared:string[]=[],first:Awaited<ReturnType<typeof partOne>>,second:Awaited<ReturnType<typeof partTwo>>;
for(let round=0;;round++){
 first=await partOne(shared);second=await partTwo(inputs(first));
 if(second.used.every(k=>shared.includes(k)))break;
 if(round>4)throw Error('Widget parts did not settle');
 shared=[...new Set([...shared,...second.used])].sort();
}
// Never two copies of a module: whatever part two bundles itself must be absent from part one.
const twice=[...inputs(second.result)].filter(k=>!k.startsWith('trialy-shared:')&&!k.startsWith('<define:')&&inputs(first).has(k)&&k!=='src/embed/late-pages.tsx');
if(twice.length)throw Error('Modules in both widget parts: '+twice.join(', '));
const text=(result:Awaited<ReturnType<typeof build>>)=>result.outputFiles!.find(f=>f.path.endsWith('.js'))!.text;
const late=text(second.result);
if(/\bimport\(/.test(late)||/\bimport\(/.test(text(first)))throw Error('The widget build must not contain import(): use src/embed/late-part.tsx');
const integrity='sha384-'+createHash('sha384').update(late).digest('base64'),lateFile=createHash('sha256').update(late).digest('hex').slice(0,20)+'.js';
await rm(out+'/widget-parts',{recursive:true,force:true});
if(!singleFile){await mkdir(out+'/widget-parts',{recursive:true});await writeFile(out+'/widget-parts/'+lateFile,late);}
const main=text(first).replaceAll(LATE_FILE,singleFile?'':lateFile).replaceAll(LATE_INTEGRITY,singleFile?'':integrity);
if(main.includes(LATE_FILE)||main.includes(LATE_INTEGRITY))throw Error('Widget part reference left in the widget');
const js=(singleFile?main+'\n'+late:main).replace(/<\/script/gi,'<\\/script');
await mkdir(out,{recursive:true});
await writeFile(out+'/widget-parts.json',JSON.stringify({singleFile,file:singleFile?null:lateFile,integrity:singleFile?null:integrity,bytes:Buffer.byteLength(late),shared},null,1)+'\n');
const css=`*{box-sizing:border-box}body{margin:0;background:#f4f7f5;color:#163a32;font:14px system-ui}main{padding:24px;max-width:1400px;margin:auto}h1{margin:4px 0;font-size:26px}h2{font-size:18px}header,nav,footer,.search{display:flex;gap:12px;align-items:center;flex-wrap:wrap}header{justify-content:space-between;margin-bottom:24px}section,.panel{background:white;border:1px solid #dce5df;border-radius:12px;padding:20px;margin:20px 0}label{display:block;margin:12px 0}label input,label select{display:block;width:100%;margin-top:6px}input,select,button{font:inherit;padding:9px 12px;border:1px solid #baccc2;border-radius:7px;background:white;color:inherit}button{cursor:pointer}button:hover{background:#e9f3ed}button:disabled{opacity:.5;cursor:default}input[type=checkbox]{width:auto}textarea{width:100%;box-sizing:border-box;padding:10px;font:13px ui-monospace,monospace}article{padding:12px 0;border-bottom:1px solid #ddd}table{width:100%;border-collapse:collapse;background:white}th,td{padding:12px;text-align:left;border-bottom:1px solid #e2e9e5;max-width:350px;overflow-wrap:anywhere}.scroll{overflow:auto;margin:16px 0}.templates{display:flex;gap:10px;flex-wrap:wrap}.error{background:#ffebe7;padding:12px}pre{white-space:pre-wrap;max-height:350px;overflow:auto}.footnote{display:block;margin-top:24px;color:#536d63}`;
await mkdir(out,{recursive:true});await writeFile(out+'/embed.html',`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>${css}\n${await readFile('src/shared/views.css','utf8')}\n${await readFile('src/shared/shell.css','utf8')}\n${(await readFile('src/shared/ui/design.css','utf8')).replace("/fonts/inter-variable.woff2",'data:font/woff2;base64,'+(await readFile('public/fonts/inter-variable.woff2')).toString('base64'))}${await readFile('src/shared/ui/brand.css','utf8')}${await readFile('src/shared/ui/app-covers.css','utf8')}${await readFile('src/shared/ui/notices.css','utf8')}${await readFile('src/shared/ui/platform-shell.css','utf8')}${await readFile('src/shared/preview-approval.css','utf8')}${await readFile('src/shared/app-pages.css','utf8')}${await readFile('src/shared/ui/setup-editor.css','utf8')}${await readFile('src/shared/ui/archived.css','utf8')}${await readFile('src/shared/ui/data-access.css','utf8')}</style></head><body><div id="root"></div><script>${js}</script></body></html>`);

