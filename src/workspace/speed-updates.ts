import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import type {Database,Connection} from '../db/database.js';
import {withDatabaseContext} from '../db/context.js';
import {audit,revision} from '../domain/evidence.js';
import {AppTemplates} from './app-templates.js';
import {catalogBody} from './catalog-source.js';

/* P11, D14, D15 (7.2): automatic speed-only updates.
 * A publisher declares a catalog version speed-only (`speedOnly:true` in its entry), and the owner approves it with the
 * version (O4). The machine check is that nothing but the template code changes: same engine, same tables and fields
 * (installer schema), same options and defaults and the same helper functions. A copy is updated only while its code is
 * exactly an approved earlier version (D14: layout and option changes do not count, customized code is skipped).
 * The update keeps the configuration and bindings lines, writes a new revision and an audit entry
 * (`component.speed_updated`, origin `platform`) and is shown once in the app's header (readAppUpdate `recent`). */
const canonical=(v:any):any=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const helpers=(functions:any)=>canonical((Array.isArray(functions)?functions:[]).map((f:any)=>({...f,source:typeof f.source==='string'?f.source.replace(/"(version|kit)":"\d+\.\d+\.\d+"/g,'"$1":""'):f.source})));
const older=(a:string,b:string)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);return (x[0]-y[0]||x[1]-y[1]||x[2]-y[2])<0;};
const sha=(s:string)=>createHash('sha256').update(s,'utf8').digest('hex');

/** True when `to` may replace `from` without anyone's review: declared speed-only and machine-checked (D15). */
export function speedOnlyCompatible(from:any,to:any,schemaFrom:unknown,schemaTo:unknown){
 return to.speedOnly===true&&from.id===to.id&&older(from.version,to.version)&&from.engine===to.engine&&to.engine==='frontend-js'&&typeof to.source==='string'&&typeof from.source==='string'
  &&isDeepStrictEqual(canonical(schemaFrom??null),canonical(schemaTo??null))
  &&isDeepStrictEqual(canonical(from.options),canonical(to.options))
  &&isDeepStrictEqual(canonical(from.defaults),canonical(to.defaults))
  &&isDeepStrictEqual(helpers(from.functions),helpers(to.functions));
}

/** Pairs (earlier approved version → newest approved speed-only version that may replace it). */
export async function speedUpdatePlan(db:Database|Connection){
 const catalog=new AppTemplates(undefined,db as Database);
 const rows=(await db.query("SELECT template_id,version,install_schema FROM app_template_catalog WHERE status='approved'")).rows;
 const schema=(id:string,v:string)=>rows.find((r:any)=>r.template_id===id&&r.version===v)?.install_schema??null;
 const ids=[...new Set(rows.map((r:any)=>String(r.template_id)))],plan:{from:any;to:any}[]=[];
 for(const id of ids){
  const versions=(await catalog.versions(id)).filter(t=>!t.deprecated);
  for(const from of versions){
   // The newest version this one can move to without review.
   const to=versions.filter(t=>speedOnlyCompatible(from,t,schema(id,from.version),schema(id,t.version))).at(-1);
   if(to)plan.push({from,to});
  }
 }
 return plan;
}

/** One pass over every workspace (worker, hourly). Returns how many copies were updated. */
export async function applySpeedUpdates(db:Database,limit=200){
 return withDatabaseContext({service:'worker'},async()=>{
  const plan=await speedUpdatePlan(db);let updated=0;
  for(const {from,to} of plan){
   if(updated>=limit)break;
   // Unchanged copies end with the earlier version's exact code behind their two generated lines.
   const candidates=(await db.query("SELECT id,workspace_id FROM workspace_components WHERE format='frontend-js' AND NOT archived AND deleted_at IS NULL AND length(source)>=$2 AND right(source,$2)=$1 LIMIT $3",[from.source,from.source.length,limit-updated])).rows;
   for(const c of candidates)if(await updateOne(db,c.workspace_id,c.id,from,to))updated++;
  }
  return updated;
 });
}

async function updateOne(db:Database,w:string,componentId:string,from:any,to:any){
 return db.transaction(async tx=>{
  const c=(await tx.query('SELECT * FROM workspace_components WHERE id=$1 AND workspace_id=$2 FOR UPDATE',[componentId,w])).rows[0];
  if(!c||c.archived||c.deleted_at||typeof c.source!=='string')return false;
  const body=catalogBody(c.source);if(body===null||sha(body)!==sha(from.source))return false;
  const p=(await tx.query('SELECT id,tenant_id,archived FROM workspaces WHERE id=$1',[w])).rows[0];if(!p||p.archived)return false;
  // Recorded under an owner of the app (or of the organization); the origin says the platform made it.
  const owner=(await tx.query("SELECT user_id FROM app_members WHERE app_id=$1 AND role='owner' ORDER BY granted_at NULLS LAST LIMIT 1",[c.id])).rows[0]?.user_id
   ??(await tx.query("SELECT user_id FROM memberships WHERE tenant_id=$1 AND role='owner' ORDER BY user_id LIMIT 1",[p.tenant_id])).rows[0]?.user_id;
  if(!owner)return false;
  const a={userId:String(owner),origin:'platform' as any},source=c.source.slice(0,c.source.length-body.length)+to.source,version=c.version+1;
  await tx.query('UPDATE workspace_components SET source=$1,version=$2 WHERE id=$3',[source,version,c.id]);
  const catalogOrigin={id:to.id,version:to.version,digest:to.digest};
  await revision(tx,a,w,c.id,'workspace_component',version,{...c,source,version,catalogOrigin,speedUpdate:{fromVersion:from.version,toVersion:to.version}});
  await audit(tx,a,p,'component.speed_updated',c.id,{version:c.version,templateId:from.id,templateVersion:from.version},{version,templateId:to.id,templateVersion:to.version,digest:to.digest,automatic:true});
  return true;
 });
}

/** The latest automatic speed update of an app, while the app is still at the version it produced (header status). */
export async function recentSpeedUpdate(tx:Connection|Database,w:string,componentId:string,currentVersion:number){
 const r=(await tx.query("SELECT after_value,created_at FROM audit_events WHERE workspace_id=$1 AND object_id=$2 AND action='component.speed_updated' AND created_at>now()-interval '7 days' ORDER BY created_at DESC LIMIT 1",[w,componentId])).rows[0];
 if(!r||Number(r.after_value?.version)!==currentVersion)return null;
 return {toVersion:String(r.after_value.templateVersion),at:new Date(r.created_at).toISOString()};
}
