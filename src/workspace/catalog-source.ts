import {createHash} from 'node:crypto';
import type {Connection} from '../db/database.js';

// A catalog app's saved source is the approved template code behind two generated
// lines: its configuration (options and the layout profile) and its bindings.
// Layout reviews rewrite only the configuration line (see shared/custom-layout.ts).
const prefix=/^const templateConfiguration=[^\n]*;\nconst templateBindings=[^\n]*;\n/;
const sha=(s:string)=>createHash('sha256').update(s,'utf8').digest('hex');
let cache:{stamp:string;hashes:Set<string>}|null=null;

/** The template code of a saved catalog app, without its generated configuration and bindings lines. */
export function catalogBody(source:string){const m=prefix.exec(source);return m?source.slice(m[0].length):null;}

/** True when the saved source is unchanged code of an approved catalog template version.
 * Such code is publisher-controlled and holds no workspace data, so running it exposes
 * only what the platform's per-request checks allow the caller to read. */
export async function isCatalogSource(tx:Connection,source:unknown){
 if(typeof source!=='string')return false;const body=catalogBody(source);if(!body)return false;
 const s=(await tx.query("SELECT count(*)::int AS n, max(updated_at)::text AS u FROM app_template_catalog WHERE status='approved'")).rows[0],stamp=`${s?.n}|${s?.u}`;
 if(cache?.stamp!==stamp){const rows=(await tx.query("SELECT payload->>'source' AS source FROM app_template_catalog WHERE status='approved'")).rows;cache={stamp,hashes:new Set(rows.filter(r=>typeof r.source==='string').map(r=>sha(r.source)))};}
 return cache.hashes.has(sha(body));
}
