// The engine script of the app frame (bundled by scripts/build-frame-engine.mjs into src/shared/frame-engine.generated.ts).
// It only defines window.TrialyEngine; src/shared/frontend-frame.ts decides when to use it. The engine binary is not in
// this script: the frame document carries it as a non-executable data block, read once at start.
import variant from '@jitl/quickjs-wasmfile-release-sync';
import {newQuickJSWASMModuleFromVariant,newVariant} from 'quickjs-emscripten-core';
import {startEngine,readKey} from './engine-core.js';
import {createStore,createLocalApp,STORE_TTL} from './local-runtime.js';
function decode(base64:string){const binary=atob(base64),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}
Object.defineProperty(window,'TrialyEngine',{value:Object.freeze({
 start:(base64:string)=>startEngine({wasm:decode(base64).buffer as ArrayBuffer,create:(options:any)=>newQuickJSWASMModuleFromVariant(newVariant(variant as any,options) as any)}),
 createStore,createLocalApp,readKey,STORE_TTL,
})});
