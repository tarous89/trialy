import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import type {Connection} from '../db/database.js';
import {catalogBody} from './catalog-source.js';
import {appBaseCss} from '../shared/app-design.js';
import {appShellCss} from '../shared/app-shells.js';
import {KIT_SOURCE,KIT_VERSION,kitCss} from '../shared/app-kit.js';

/**
 * P4, P8 (5.1, 5.2, 5.3; architecture E): which apps also run in the browser frame.
 *  - v1 server mode: the default for every installed app; every event is a server run.
 *  - v1 browser-compat: unchanged code of a catalog version switched on in templates/browser-runtime.json once that
 *    version's browser test passes (tests/frame-engine.test.ts). Installed copies are not changed; customized copies
 *    (any other code) stay on server mode.
 *  - v2 contract: source that declares 'use trialagents v2'. Such apps are written for the browser runtime.
 * The same source still runs on the server for the first screen, app commands, automations and public links.
 * APP_BROWSER_RUNTIME=off switches the browser runtime off everywhere (emergency switch).
 */
export type BrowserMode={mode:'compat'|'v2';templateId?:string;version?:string}|{mode:'server';reason:string};
const V2=/^\s*(['"])use trialagents v2\1;?\s*$/m;
const prefix=/^const templateConfiguration=[^\n]*;\nconst templateBindings=[^\n]*;\n/;
/** True when the source declares the v2 app contract (in its first lines, after the generated configuration lines). */
export function isV2Source(source:unknown){if(typeof source!=='string')return false;const body=source.replace(prefix,'');return V2.test(body.slice(0,400).split('\n').slice(0,3).join('\n'));}

const sha=(s:string)=>createHash('sha256').update(s,'utf8').digest('hex');
type Switches={compat:Record<string,string[]>};
let switches:Switches|null=null;
/** The per-version switch (5.2). Read once; a deployment changes it. */
export function browserSwitches():Switches{
 if(!switches){const raw=JSON.parse(readFileSync(new URL('../../templates/browser-runtime.json',import.meta.url),'utf8'));switches={compat:raw.compat??{}};}
 return switches;
}
let catalog:{stamp:string;byHash:Map<string,{templateId:string;version:string}>}|null=null;
async function catalogVersion(tx:Connection,source:string){
 const body=catalogBody(source);if(!body)return null;
 // Only the versions switched on for the browser matter here. A switched-on version keeps running in the browser after
 // it is withdrawn from the catalog, so copies that have not moved to its replacement do not fall back to server mode (D41).
 const compat=browserSwitches().compat,ids=Object.keys(compat);
 const s=(await tx.query("SELECT count(*)::int AS n, max(updated_at)::text AS u FROM app_template_catalog WHERE template_id=ANY($1::text[])",[ids])).rows[0],stamp=`${s?.n}|${s?.u}`;
 if(catalog?.stamp!==stamp){const rows=(await tx.query("SELECT template_id,version,payload->>'source' AS source FROM app_template_catalog WHERE template_id=ANY($1::text[])",[ids])).rows;catalog={stamp,byHash:new Map(rows.filter((r:any)=>typeof r.source==='string'&&(compat[r.template_id]??[]).includes(r.version)).map((r:any)=>[sha(r.source),{templateId:r.template_id,version:r.version}]))};}
 return catalog.byHash.get(sha(body))??null;
}

export async function browserMode(tx:Connection,content:any,event:{kind:string}):Promise<BrowserMode>{
 if(process.env.APP_BROWSER_RUNTIME==='off')return {mode:'server',reason:'switched_off'};
 if(event.kind==='command')return {mode:'server',reason:'command'};
 if(typeof content?.source!=='string'||content.format!=='frontend-js')return {mode:'server',reason:'format'};
 if(isV2Source(content.source))return {mode:'v2'};
 const found=await catalogVersion(tx,content.source);
 if(!found)return {mode:'server',reason:'customized'};
 if(!(browserSwitches().compat[found.templateId]??[]).includes(found.version))return {mode:'server',reason:'not_switched_on'};
 return {mode:'compat',...found};
}

/** The code that runs, on the server and in the frame: v2 apps get the shared kit helpers ahead of their own code (5.5). */
export function effectiveSource(source:string){return isV2Source(source)?KIT_SOURCE+'\n'+source:source;}
/** The platform styles the runtime adds to an app's own styles; the frame adds the same ones to a local screen. */
export function runtimeStyles(source:string){return isV2Source(source)?{base:kitCss(),shell:'',kit:KIT_VERSION}:{base:appBaseCss,shell:appShellCss};}
export function runtimeCssFor(source:string,html:string){const s=runtimeStyles(source);return s.base+(s.shell&&/\bta-[a-z-]+/.test(html)?s.shell:'');}
export const sourceDigest=(source:string)=>sha(source).slice(0,32);
/** Reads seeded with one screen, at most (bytes of JSON). Larger seeds keep the app on server mode for that screen. */
export const SEED_BYTES=2*1024*1024;
