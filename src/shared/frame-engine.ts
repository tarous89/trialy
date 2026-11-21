import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {FRAME_ENGINE_SCRIPT} from './frame-engine.generated.js';
/**
 * P4 (5.1): the in-frame engine. The script is generated from src/frame-engine/; the binary is the QuickJS release build
 * without asyncify from the same quickjs-emscripten release the server runs, read once from the installed package.
 */
export {FRAME_ENGINE_SCRIPT};
let wasm:string|null=null;
export function frameEngineWasmBase64(){
 if(wasm===null){const require=createRequire(import.meta.url);const dir=require.resolve('@jitl/quickjs-wasmfile-release-sync/package.json').replace(/package\.json$/,'');wasm=readFileSync(dir+'dist/emscripten-module.wasm').toString('base64');}
 return wasm;
}
export const sha256Base64=(text:string)=>createHash('sha256').update(text).digest('base64');
