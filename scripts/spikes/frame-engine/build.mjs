// Spike 1.9: builds the frame documents. One inline script per engine build (QuickJS glue + harness + the WASM bytes as
// base64), under the product frame's own CSP text, which is read from the product source so the spike cannot drift from it.
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {gzipSync,brotliCompressSync,constants} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {REPO} from './fixtures.mjs';

const here=new URL('./',import.meta.url);
export const ENGINES={
 sync:{entry:'frame/entry-sync.mjs',wasm:'node_modules/@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.wasm',label:'QuickJS release, sync build'},
 asyncify:{entry:'frame/entry-asyncify.mjs',wasm:'node_modules/@jitl/quickjs-wasmfile-release-asyncify/dist/emscripten-module.wasm',label:'QuickJS release, asyncify build (the server build)'},
};
const sizes=buffer=>({raw:buffer.length,gzip:gzipSync(buffer,{level:9}).length,brotli:brotliCompressSync(buffer,{params:{[constants.BROTLI_PARAM_QUALITY]:11,[constants.BROTLI_PARAM_SIZE_HINT]:buffer.length}}).length});

/** The CSP the product frame carries today, as a template with ${hash} (src/shared/frontend-frame.ts; the same text follows `sandbox allow-scripts` in src/server/app.ts). */
export async function productPolicy(){
 const frame=await readFile(new URL('src/shared/frontend-frame.ts',REPO),'utf8'),server=await readFile(new URL('src/server/app.ts',REPO),'utf8');
 const meta=/http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(frame)?.[1];
 if(!meta||!meta.includes("script-src 'sha256-${hash}'"))throw new Error('The product frame CSP was not found in src/shared/frontend-frame.ts');
 if(!server.includes('`sandbox allow-scripts${')||!server.includes(meta))throw new Error('src/server/app.ts no longer sends the same frame CSP as the frame document');
 return meta;
}
/** Frame policies under test. `product` is today's; the others add one keyword each. */
export const FRAME_POLICIES={
 product:{script:'',extra:'',label:'unchanged (hash only)'},
 wasm:{script:" 'wasm-unsafe-eval'",extra:'',label:"+ 'wasm-unsafe-eval'"},
 eval:{script:" 'unsafe-eval'",extra:'',label:"+ 'unsafe-eval'"},
 'wasm+worker':{script:" 'wasm-unsafe-eval'",extra:'; worker-src blob:',label:"+ 'wasm-unsafe-eval' and worker-src blob:"},
};
export function framePolicy(template,kind,hash){
 const p=FRAME_POLICIES[kind];
 return template.replace("script-src 'sha256-${hash}'",`script-src 'sha256-${hash}'${p.script}`)+p.extra;
}

export async function buildFrames(){
 const template=await productPolicy(),engines={};
 for(const [name,engine] of Object.entries(ENGINES)){
  const built=await build({entryPoints:[fileURLToPath(new URL(engine.entry,here))],bundle:true,minify:true,format:'iife',platform:'browser',target:'es2022',write:false,
   loader:{'.wasm':'base64'},
   // The emscripten glue resolves its .wasm file name against import.meta.url even when the bytes are handed over (they always are here); nothing is fetched.
   define:{'import.meta.url':'"https://frame.invalid/engine.js"'},logLevel:'silent',absWorkingDir:fileURLToPath(REPO)});
  const script=built.outputFiles[0].text.replace(/<\/script/gi,'<\\/script').replace(/<!--/g,'<\\!--');
  const hash=createHash('sha256').update(script).digest('base64');
  const wasm=await readFile(new URL(engine.wasm,REPO)),base64=Buffer.from(wasm.toString('base64'));
  const document=kind=>`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${framePolicy(template,kind,hash)}"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:15px Arial,sans-serif;margin:0;color:#183d32}*{box-sizing:border-box}</style><style id="app-css"></style></head><body><div id="root"></div><script>${script}</script></body></html>`;
  const whole=Buffer.from(document('wasm'));
  engines[name]={name,label:engine.label,hash,document,header:kind=>`sandbox allow-scripts; ${framePolicy(template,kind,hash)}`,
   sizes:{wasm:sizes(wasm),wasmBase64:sizes(base64),glueAndHarness:sizes(Buffer.from(script.replace(base64.toString(),''))),frameDocument:sizes(whole)}};
 }
 return {template,engines};
}

if(import.meta.url===`file://${process.argv[1]}`){
 const {template,engines}=await buildFrames();
 console.log('Product frame CSP:',template);
 for(const e of Object.values(engines))console.log(e.name,JSON.stringify(e.sizes));
}
