import type {Connection} from '../db/database.js';
import {browserMode,browserSwitches,catalogVersion} from './browser-runtime.js';
import {standardTracker} from './standard-tracker.js';

/**
 * L2.7 (loading speed): which installed apps run in the browser frame and which stay on server mode, and why.
 * Reads every active saved app once (code included), decides its mode exactly as opening it does (browserMode) and
 * returns counts plus the lists an owner can act on. Holds no records. Run by the owner with `npm run apps:runtime-report`.
 *  - not_switched_on: unchanged code of an approved catalog version not listed in templates/browser-runtime.json. Such a
 *    version moves to browser mode by listing it there once its browser test passes (tests/frame-engine.test.ts).
 *  - customized: catalog code that was changed, or code written for one workspace. It stays on server mode until its code
 *    declares the v2 contract; the list names each app so its owner can decide.
 *  - standard trackers are counted apart: they keep their own browser copy of the renderer, not the app frame engine.
 */
export async function runtimeModeReport(db:Connection){
 const rows=(await db.query(`SELECT c.id,c.workspace_id,c.name,c.format,c.source,w.name AS workspace_name FROM workspace_components c
  JOIN workspaces w ON w.id=c.workspace_id WHERE c.deleted_at IS NULL AND NOT c.archived ORDER BY w.name,c.name,c.id`)).rows;
 const counts:Record<string,number>={},candidates=new Map<string,{templateId:string;version:string;apps:number}>(),customized:any[]=[];
 for(const c of rows){
  let key:string;
  if(standardTracker(c.source))key='standard_tracker';
  else{const mode=await browserMode(db,c,{kind:'open'});key=mode.mode==='server'?'server_'+mode.reason:'browser_'+mode.mode;
   if(mode.mode==='server'&&mode.reason==='customized')customized.push({workspace:c.workspace_name,workspaceId:c.workspace_id,app:c.name,appId:c.id});
   if(mode.mode==='server'&&mode.reason==='not_switched_on'){const found=await catalogVersion(db,c.source);if(found){const k=found.templateId+'@'+found.version,v=candidates.get(k)??{...found,apps:0};v.apps++;candidates.set(k,v);}}}
  counts[key]=(counts[key]??0)+1;
 }
 return {apps:rows.length,counts,switchCandidates:[...candidates.values()].sort((a,b)=>b.apps-a.apps||a.templateId.localeCompare(b.templateId)),
  switchedOn:Object.entries(browserSwitches().compat).flatMap(([id,versions])=>versions.map(v=>id+'@'+v)),customized};
}
