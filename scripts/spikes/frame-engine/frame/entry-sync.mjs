// Frame script with the QuickJS release build without asyncify (same quickjs-emscripten release as the server).
import variant from '@jitl/quickjs-wasmfile-release-sync';
import wasmBase64 from '@jitl/quickjs-wasmfile-release-sync/wasm';
import {newQuickJSWASMModuleFromVariant,newVariant} from 'quickjs-emscripten-core';
import {install} from './harness.mjs';
install({name:'release-sync',wasmBase64,create:options=>newQuickJSWASMModuleFromVariant(newVariant(variant,options))});
