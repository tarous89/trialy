import type {Connection} from '../db/database.js';
import {fail,type Actor} from '../shared/schema.js';
import {access,visibleFields} from '../domain/permissions.js';
import {rulesFor,denied,toolDecision,toolProjectStep,typePolicyFor} from '../domain/effective-access.js';
import {assistantLevels,assistantDataBlocked,assistantNamesOnly,appNameOnly,requireAssistantApps,requireAssistantData} from '../domain/assistant-levels.js';
import {sectionRules} from '../domain/app-sections.js';
import {catalogSourceHashes} from './catalog-source.js';
import {standardTracker} from './standard-tracker.js';
import {Service} from '../domain/service.js';

/**
 * L1.1 (docs/scopes/LOADING_SPEED_2026-11-22.md, choice A): the lean app index.
 *
 * The apps a person may see, worked out for the whole workspace in a fixed number of queries
 * and without reading app code. It applies the same rules as the per-app check
 * (WorkspaceFoundation.component, toolPolicy, typeAccess): the decisions are the shared pure
 * functions toolDecision, toolProjectStep and typePolicyFor; only the loading is batched.
 * tests/app-index.test.ts compares it with the per-app check on generated accounts, both ways.
 *
 * Active apps follow WorkspaceFoundation.components(); archived apps follow archivedItems()
 * (restorable by the workspace owner or the app's creator, no table check).
 * Access is never remembered between requests (choice H): every call reads it afresh.
 */
export type AppIndexRow={id:string;workspace_id:string;project_id:string|null;name:string;format:string;resource_kind:string;version:number;archived:boolean;archived_at:string|null;created_at:string;created_by:string|null;project_archived:boolean;app_role:string;execution?:any[];home_project_id?:string|null;home_placement_version?:number};
const COLUMNS='id,workspace_id,project_id,name,format,bindings,version,archived,created_by,created_at,allowed_users,ai_enabled,execution,assets,source_access,resource_kind,manifest,home_project_id,home_placement_version,archived_at,deleted_at,team_default_role';
const quiet=(e:unknown)=>{const status=(e as any)?.status;return typeof status==='number'&&status<500;};

/** Project chain exactly as WorkspaceFoundation.nodeAccess walks it, from preloaded nodes. */
export function nodeChain(p:any,a:Actor,nodes:Map<string,any>,id:string|null){
 let current:string|null=id;const chain:any[]=[];
 while(current){if(denied(rulesFor(p,a).filter(r=>r.kind==='project'&&r.resourceId===current),'read'))fail(404,'not_found','Project unavailable');const n=nodes.get(current);if(!n)fail(404,'not_found','Project not found');if(chain.some(v=>v.id===n.id))fail(409,'folder_cycle','Invalid folder hierarchy');
  if((p.role!=='owner'&&n.allowed_users!==null&&!n.allowed_users.includes(a.userId))||(a.origin==='ai'&&!n.ai_enabled))fail(404,'not_found','Project or folder not found');chain.push(n);current=n.parent_id;}
 return chain;
}
/** toolPolicy's own project walk (403 rather than 404, no project-rule check: that is resourceGrant's). */
function toolParents(p:any,a:Actor,nodes:Map<string,any>,id:string|null){
 const parents:string[]=[];let current=id;
 while(current){if(parents.includes(current))fail(409,'folder_cycle','Invalid project hierarchy');parents.push(current);const n=nodes.get(current);toolProjectStep(p,a,n);current=n.parent_id;}
 return parents;
}

/** Whether saved, non-catalog source may be shown to this person (componentSourcePolicy), decided once per workspace. */
async function sourceRestriction(db:Connection,a:Actor,w:string,p:any){
 if(p.allowed_types!==null||p.hidden_fields.length)return 'scope' as const;
 if(p.role==='owner')return null;
 const rules=(await db.query('SELECT allowed_users,ai_enabled FROM document_access WHERE workspace_id=$1 UNION ALL SELECT allowed_users,ai_enabled FROM folder_access WHERE workspace_id=$1',[w])).rows;
 const privateFiles=a.origin==='ai'?(await db.query('SELECT id FROM document_versions WHERE workspace_id=$1 AND ai_enabled=false LIMIT 1',[w])).rows.length:0;
 const documents=!!privateFiles||rules.some(r=>(r.allowed_users!==null&&!r.allowed_users.includes(a.userId))||(a.origin==='ai'&&!r.ai_enabled));
 const fields=!documents&&(await db.query('SELECT fields FROM entity_types WHERE workspace_id=$1',[w])).rows.some(t=>visibleFields(t.fields,p,a).length!==t.fields.length);
 return documents||fields?'restricted' as const:null;
}
// Mirrors catalogBody (catalog-source.ts): the generated configuration and bindings lines, then the template code.
const CATALOG_PREFIX='^const templateConfiguration=[^\\n]*;\\nconst templateBindings=[^\\n]*;\\n';

/** Every project row of the workspace, keyed by id, for nodeChain and appIndex. */
export async function workspaceNodes(db:Connection,w:string){return new Map<string,any>((await db.query('SELECT * FROM workspace_nodes WHERE workspace_id=$1 ORDER BY name,id',[w])).rows.map((n:any)=>[n.id,n]));}
export async function appIndex(db:Connection,a:Actor,w:string,{include='all',policy,nodes:known}:{include?:'active'|'archived'|'all';policy?:any;nodes?:Map<string,any>}={}):Promise<AppIndexRow[]>{
 const p=policy??await access(db,a,w);
 const owner=p.role==='owner',names=assistantNamesOnly(p,a),validate=!assistantDataBlocked(p,a);
 const where=include==='active'?' AND NOT archived':include==='archived'?' AND archived':'';
 const [rows,nodes]=await Promise.all([
  db.query(`SELECT ${COLUMNS},(SELECT m.role FROM app_members m WHERE m.app_id=workspace_components.id AND m.user_id=$2) AS member_role FROM workspace_components WHERE workspace_id=$1 AND deleted_at IS NULL${where} ORDER BY name,id`,[w,a.userId]).then(r=>r.rows),
  known??workspaceNodes(db,w),
 ]);
 if(!rows.length)return [];
 let appsBlocked=false;try{requireAssistantApps(p,a,false);}catch(e){if(!quiet(e))throw e;appsBlocked=true;}
 // Archived apps are listed only to people who can restore them (archivedItems).
 const candidates=rows.filter((c:any)=>!c.archived||owner||c.created_by===a.userId);
 // Saved source rules: one workspace decision; catalog code is recognized by its hash, computed by the database.
 const restriction=candidates.some((c:any)=>c.source_access!=='bindings')?await sourceRestriction(db,a,w,p):null;
 let catalog=new Set<string>();
 if(restriction==='restricted'){
  const ids=candidates.filter((c:any)=>c.source_access!=='bindings').map((c:any)=>c.id);
  const [hashes,approved]=await Promise.all([db.query(`SELECT id,CASE WHEN source ~ $2 THEN encode(sha256(convert_to(regexp_replace(source,$2,''),'UTF8')),'hex') END AS body FROM workspace_components WHERE id=ANY($1::uuid[])`,[ids,CATALOG_PREFIX]),catalogSourceHashes(db)]);
  catalog=new Set(hashes.rows.filter((r:any)=>r.body&&approved.has(r.body)).map((r:any)=>r.id));
 }
 // Tables named by active apps' connections, and the person's role on apps that own them, in one query each.
 const checking=validate?candidates.filter((c:any)=>!c.archived):[];
 const typeIds=[...new Set(checking.flatMap((c:any)=>(c.bindings??[]).map((b:any)=>b.typeId)))];
 const types=new Map<string,any>(typeIds.length?(await db.query('SELECT * FROM entity_types WHERE workspace_id=$1 AND id::text=ANY($2::text[])',[w,typeIds])).rows.map((t:any)=>[t.id,t]):[]);
 const origins=owner||p.direct_data===false?[]:[...new Set([...types.values()].map(t=>t.origin_app_id).filter(Boolean))];
 const appRoles=new Map<string,string|null>(origins.length?(await db.query('SELECT x::text AS app_id,trialy_security.app_role(x,$2) AS role FROM unnest($1::uuid[]) x',[origins,a.userId])).rows.map((r:any)=>[r.app_id,r.role]):[]);
 const dataLevel=a.origin==='ai'?(await assistantLevels(db,a,p)).data:'edit';
 // Rare paths that need saved source: section rules (sectionFields) and connections that fail unless the app is a standard tracker.
 const sources=new Map<string,string>();
 const loadSources=async(ids:string[])=>{const missing=ids.filter(id=>!sources.has(id));if(missing.length)for(const r of (await db.query('SELECT id,source FROM workspace_components WHERE id=ANY($1::uuid[])',[missing])).rows)sources.set(r.id,r.source);};
 await loadSources(checking.filter((c:any)=>sectionRules(p,a,c.id).length).map((c:any)=>c.id));
 let documents:any[]|undefined;
 const result:AppIndexRow[]=[];
 const bindingsOk=(c:any,tool:any)=>{
  const at={...a,accessToolId:c.id};
  for(const b of c.bindings){
   requireAssistantData(p,at,false);
   const t=types.get(b.typeId);if(!t)fail(404,'not_found','Table not found');
   const policy=typePolicyFor(at,p,t,{dataLevel,appRole:!owner&&t.origin_app_id&&p.direct_data!==false?appRoles.get(t.origin_app_id)??null:undefined,tool:sectionRules(p,a,c.id).length?{...tool,c:{...tool.c,source:sources.get(c.id)}}:tool});
   if(!policy.read_fields.length)fail(404,'not_found','Table not found');
   const fields=visibleFields(t.fields,policy,at);
   if(new Set(b.fields).size!==b.fields.length||b.fields.some((k:string)=>!fields.some(f=>f.key===k)))fail(403,'component_binding','Component references unavailable fields');
  }
 };
 const decide=async(c:any,standard?:boolean)=>{
  const archived=c.archived,namesOnly=archived?false:names;
  if(c.source_access!=='bindings'){if(restriction==='scope')fail(403,'workspace_scope','Workspace organization currently requires full workspace access');if(restriction==='restricted'&&!catalog.has(c.id))fail(403,'component_scope','Saved source is restricted');}
  if(!namesOnly&&appsBlocked)fail(403,'assistant_apps_blocked','Apps are blocked');
  const at={...a,accessToolId:c.id};
  const chain=nodeChain(p,at,nodes,c.project_id);
  if((p.role!=='owner'&&c.allowed_users!==null&&!c.allowed_users.includes(a.userId))||(a.origin==='ai'&&!c.ai_enabled))fail(404,'not_found','Component not found');
  const tool=toolDecision(p,at,c,toolParents(p,at,nodes,c.project_id));
  if(!archived&&validate&&standard!==true){
   try{bindingsOk(c,tool);}catch(e){if(standard===false||!quiet(e))throw e;return 'retry' as const;}
  }
  if(!namesOnly&&c.assets?.length){
   documents??=await new Service({query:db.query.bind(db),transaction:(fn:any)=>fn(db),close:async()=>{}}).documents(a,w);
   if(new Set(c.assets.map((v:any)=>v.name)).size!==c.assets.length)fail(400,'asset_name','Asset names must be unique');
   if(c.assets.some((asset:any)=>!documents!.some(d=>d.id===asset.versionId)))fail(403,'asset_scope','An attached file is unavailable');
  }
  const sectioned=sectionRules(p,a,c.id).some((r:any)=>r.read==='deny'||r.write==='deny');
  const {bindings,allowed_users,ai_enabled,assets,source_access,manifest,team_default_role,member_role,deleted_at,...meta}=c;
  const row={...meta,execution:sectioned?[]:c.execution,project_archived:chain.some(n=>n.archived),app_role:tool.role};
  return namesOnly?{...appNameOnly(row),created_by:c.created_by,home_project_id:c.home_project_id,home_placement_version:c.home_placement_version} as AppIndexRow:row as AppIndexRow;
 };
 // Failures exclude an app exactly as the per-app paths do: components() skips any failure;
 // archivedItems() skips refusals (403, 404) and lets anything else fail the read.
 const settle=async(c:any,standard?:boolean)=>{try{return await decide(c,standard);}catch(e){const status=(e as any)?.status;if(!c.archived||status===403||status===404)return null;throw e;}};
 const decided:(AppIndexRow|'retry'|null)[]=[];
 for(const c of candidates)decided.push(await settle(c));
 const retry=candidates.filter((_c:any,i:number)=>decided[i]==='retry');
 if(retry.length){
  // A failed connection check passes only for a standard tracker, which is decided from its saved source.
  await loadSources(retry.map((c:any)=>c.id));
  for(let i=0;i<candidates.length;i++)if(decided[i]==='retry'){const r=await settle(candidates[i],!!standardTracker(sources.get(candidates[i].id)??''));decided[i]=r==='retry'?null:r;}
 }
 // Database order (name, id), as the per-app paths return it.
 for(const r of decided)if(r&&r!=='retry')result.push(r);
 return result;
}
