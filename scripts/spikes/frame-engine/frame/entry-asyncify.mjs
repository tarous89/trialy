// Frame script with the exact build the server uses today (RELEASE_ASYNC, src/foundation/runtime-child.mjs).
// The spike calls it synchronously: reads come from an in-memory store, so no host call suspends the guest.
import variant from '@jitl/quickjs-wasmfile-release-asyncify';
import wasmBase64 from '@jitl/quickjs-wasmfile-release-asyncify/wasm';
import {newQuickJSAsyncWASMModuleFromVariant,newVariant} from 'quickjs-emscripten-core';
import {install} from './harness.mjs';
install({name:'release-asyncify',wasmBase64,create:options=>newQuickJSAsyncWASMModuleFromVariant(newVariant(variant,options))});
