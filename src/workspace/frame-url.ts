import {createHash} from 'node:crypto';
import {FRAME_SCRIPT} from '../shared/frontend-frame.js';
import {FRAME_ENGINE_SCRIPT,frameEngineWasmBase64} from '../shared/frame-engine.js';
import {appPublicUrl} from '../shared/public-url.js';
import {bundledAppFont} from './design-quality.js';

/**
 * P2 (4.7): the app frame is served as a cached file. Its address names a fingerprint of everything the document holds
 * (script, font, popup setting), so a browser keeps it for good and a release that changes it gets a new address.
 */
export function frameVersion(simpleApps=process.env.SIMPLE_APPS_ENABLED==='true'){
 return createHash('sha256').update(FRAME_SCRIPT).update('\0').update(FRAME_ENGINE_SCRIPT).update('\0').update(frameEngineWasmBase64()).update('\0').update(bundledAppFont).update(simpleApps?'\0popups':'\0').digest('hex').slice(0,16);
}
export function frameUrl(){const url=new URL('/frontend/frame',appPublicUrl());url.searchParams.set('v',frameVersion());return url.toString();}
