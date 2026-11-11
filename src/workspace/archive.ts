import {z} from 'zod';
import type {Connection,Database} from '../db/database.js';
import {id,fail,type Actor} from '../shared/schema.js';
import {access} from '../domain/permissions.js';
import {audit,revision} from '../domain/evidence.js';
import {archivedFieldsOf} from '../domain/archive.js';
import {requireCurrentAction,requireHuman} from '../domain/write-authorization.js';
import {cleanupRemovedAppFields} from './app-cleanup.js';
import type {WorkspaceFoundation} from './service.js';

/** Optional automatic purge (MODULAR_APPS_AND_SHARED_DATA.md §6). Off unless enabled. */
export const ARCHIVE_PURGE_DAYS=90;
export const archivePurgeEnabled=(env:NodeJS.ProcessEnv=process.env)=>env.ARCHIVE_PURGE_ENABLED==='true';
export const archivedQuery=z.object({kind:z.enum(['apps','automations','tables','fields']),typeId:id.optional(),templateId:z.string().max(80).optional()}).strict();
export const archivedDeletion=z.object({kind:z.enum(['app','automation','table','field']),id,key:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/).optional(),confirmed:z.literal(true)}).strict();

const USES:Record<string,string>={field:'Referenced by another field',view:'Used by a saved view',link:'Used by a shared form or view',scope:'Used by a maintenance scope',function:'Used by a function',connector:'Used by a connector',automation:'Used by an automation',cross_table_link:'Linked to records in another table',table_mapping:'Used by a table mapping'};
const plural=(n:number,one:string,many=one+'s')=>`${n} ${n===1?one:many}`;
/** One-line reason shown beside a disabled Delete; null when the item is empty and unused. */
export function deletionBlocker(usage:any,table=false):string|null{
 if(!usage)return 'Unavailable';
 if(Number(usage.values)>0)return `Contains ${plural(Number(usage.values),table?'record':'value')}`;
 const app=usage.apps?.[0];if(app)return `Used by ${app.archived?'archived app':'app'} ${app.name}`;
 const use=usage.uses?.[0];return use?USES[use]??'Still in use':null;
}
const purgeAt=(archivedAt:string|Date|null,blocked:string|null)=>archivePurgeEnabled()&&!blocked&&archivedAt?new Date(new Date(archivedAt).getTime()+ARCHIVE_PURGE_DAYS*86400000).toISOString():null;
const usage=async(db:Connection,w:string,t:string,k:string|null)=>(await db.query('SELECT trialy_security.archived_item_usage($1,$2,$3) AS u',[w,t,k])).rows[0]?.u;

/**
 * Archived items for the "Show archived" lists and MCP include-archived reads.
 * Only people who can restore them see them: workspace owners, and for apps
 * also the app's creator. Everyone else gets an empty list and a zero count.
 */
export async function archivedItems(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 const v=archivedQuery.parse(input),db=f.db,p=await access(db,a,w),owner=p.role==='owner',human=a.origin==='human';
 const items:any[]=[];
 if(v.kind==='apps'){
  const rows=v.templateId?await archivedTemplateApps(db,a,w,v.templateId):(await db.query('SELECT id,name,project_id,archived_at,created_by,bindings,version FROM workspace_components WHERE workspace_id=$1 AND archived AND deleted_at IS NULL ORDER BY archived_at DESC NULLS LAST,name,id',[w])).rows;
  for(const r of rows){
   if(!owner&&r.created_by!==a.userId)continue;
   try{await f.component(db,a,w,r.id,false);}catch(e){if([403,404].includes((e as any).status))continue;throw e;}
   const tables=(await db.query("SELECT t.id,t.name,(SELECT count(*)::int FROM records x WHERE x.type_id=t.id AND x.workspace_id=t.workspace_id) AS records FROM entity_types t WHERE t.workspace_id=$1 AND t.deleted_at IS NULL AND t.id::text IN (SELECT b->>'typeId' FROM jsonb_array_elements($2::jsonb) b) ORDER BY t.name,t.id",[w,JSON.stringify(r.bindings)])).rows;
   const automations=Number((await db.query('SELECT (SELECT count(*) FROM app_monitors WHERE app_id=$1 AND deleted_at IS NULL)+(SELECT count(*) FROM app_actions WHERE app_id=$1 AND deleted_at IS NULL) AS n',[r.id])).rows[0].n);
   items.push({kind:'app',id:r.id,name:r.name,version:r.version,archivedAt:r.archived_at,canRestore:true,canDelete:owner&&human,deleteBlockedReason:owner?(human?null:'Delete permanently on the TrialAgents website'):'Only the workspace owner can delete permanently',keeps:{tables,automations}});
  }
 }else if(owner&&v.kind==='automations'){
  const rows=(await db.query(`SELECT d.*,c.name AS app_name FROM (
   SELECT id,app_id,'research' AS kind,config->>'name' AS name,archived_with_app_at,workspace_id,user_id FROM app_monitors WHERE deleted_at IS NULL AND archived_with_app_at IS NOT NULL
   UNION ALL SELECT id,app_id,'action',config->>'name',archived_with_app_at,workspace_id,user_id FROM app_actions WHERE deleted_at IS NULL AND archived_with_app_at IS NOT NULL
  ) d JOIN workspace_components c ON c.id=d.app_id AND c.workspace_id=d.workspace_id WHERE d.workspace_id=$1 AND d.user_id=$2 AND c.archived AND c.deleted_at IS NULL ORDER BY d.archived_with_app_at DESC,d.id`,[w,a.userId])).rows;
  for(const r of rows)items.push({kind:'automation',automationKind:r.kind,id:r.id,name:r.name,appId:r.app_id,appName:r.app_name,archivedAt:r.archived_with_app_at,canRestore:true,restoreVia:{kind:'app',id:r.app_id,name:r.app_name},canDelete:false,deleteBlockedReason:`Deleted together with app ${r.app_name}`});
 }else if(owner&&v.kind==='tables'){
  const rows=(await db.query('SELECT id,name,version,archived_at,archived_fields FROM entity_types WHERE workspace_id=$1 AND archived_at IS NOT NULL AND deleted_at IS NULL ORDER BY archived_at DESC,name,id',[w])).rows;
  for(const t of rows){const u=await usage(db,w,t.id,null),blocked=deletionBlocker(u,true);
   items.push({kind:'table',id:t.id,name:t.name,version:t.version,archivedAt:t.archived_at,fields:archivedFieldsOf(t).length,records:Number(u?.values??0),canRestore:true,canDelete:!blocked&&human,deleteBlockedReason:blocked??(human?null:'Delete permanently on the TrialAgents website'),purgeAt:purgeAt(t.archived_at,blocked)});}
 }else if(owner&&v.kind==='fields'){
  if(!v.typeId)fail(400,'table_required','Choose a table');
  const t=(await db.query('SELECT id,name,version,archived_fields FROM entity_types WHERE id=$1 AND workspace_id=$2 AND deleted_at IS NULL',[v.typeId,w])).rows[0];if(!t)fail(404,'not_found','Table not found');
  for(const x of archivedFieldsOf(t)){const u=await usage(db,w,t.id,x.field.key),blocked=deletionBlocker(u);
   items.push({kind:'field',id:t.id,typeId:t.id,tableVersion:t.version,key:x.field.key,name:x.field.name,fieldKind:x.field.kind,archivedAt:x.archivedAt,values:Number(u?.values??0),canRestore:true,canDelete:!blocked&&human,deleteBlockedReason:blocked??(human?null:'Delete permanently on the TrialAgents website'),purgeAt:purgeAt(x.archivedAt,blocked)});}
 }
 return {kind:v.kind,workspaceId:w,count:items.length,items,policy:'Archived items are hidden from search, totals, exports, pickers and default lists. Permanent deletion is a human owner action on the TrialAgents website.'};
}

/**
 * Owner-only permanent deletion of an archived item, from the website only.
 * Apps keep their tables and records; tables and fields must be empty and
 * unused. Deleted apps and tables remain as tombstones: history is never removed.
 */
export async function deleteArchivedItem(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 requireHuman(a);requireCurrentAction(a);const v=archivedDeletion.parse(input);
 return f.db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w,true);
  if(p.role!=='owner')fail(403,'owner_required','Only the workspace owner can delete archived items permanently');
  if(v.kind==='automation')fail(409,'delete_with_app','Archived automations are deleted together with their app');
  if(v.kind==='app'){
   const c=(await tx.query('SELECT * FROM workspace_components WHERE id=$1 AND workspace_id=$2 FOR UPDATE',[v.id,w])).rows[0];
   if(!c||c.deleted_at)fail(404,'not_found','App not found');if(!c.archived)fail(409,'not_archived','Archive the app before deleting it permanently');
   const keeps=(await tx.query("SELECT t.id,t.name,(SELECT count(*)::int FROM records x WHERE x.type_id=t.id AND x.workspace_id=t.workspace_id) AS records FROM entity_types t WHERE t.workspace_id=$1 AND t.id::text IN (SELECT b->>'typeId' FROM jsonb_array_elements($2::jsonb) b)",[w,JSON.stringify(c.bindings)])).rows;
   // The trigger retires its suspended automations; fields only it used are archived (never removed).
   await tx.query('UPDATE workspace_components SET deleted_at=now(),version=version+1 WHERE id=$1',[c.id]);
   await revision(tx,a,w,c.id,'workspace_component',c.version+1,{...c,deleted:true,version:c.version+1});
   await cleanupRemovedAppFields(tx,a,w,p,c,{...c,bindings:[]});
   await audit(tx,a,p,'app.deleted_permanently',c.id,{name:c.name,archived:true},{deleted:true,keeps},`Kept ${plural(keeps.length,'table')} and ${plural(keeps.reduce((n:number,t:any)=>n+t.records,0),'record')} in Database`);
   return {status:'deleted',kind:'app',id:c.id,keeps};
  }
  const t=(await tx.query('SELECT * FROM entity_types WHERE id=$1 AND workspace_id=$2 FOR UPDATE',[v.id,w])).rows[0];
  if(!t||t.deleted_at)fail(404,'not_found','Table not found');
  if(v.kind==='table'){
   if(!t.archived_at)fail(409,'not_archived','Only archived tables can be deleted permanently');
   const blocked=deletionBlocker(await usage(tx,w,t.id,null),true);if(blocked)fail(409,'in_use',blocked);
   await tx.query('UPDATE entity_types SET deleted_at=now(),version=version+1 WHERE id=$1',[t.id]);
   await revision(tx,a,w,t.id,'type',t.version+1,{id:t.id,name:t.name,fields:t.fields,archivedFields:archivedFieldsOf(t),deleted:true,version:t.version+1});
   await audit(tx,a,p,'table.deleted_permanently',t.id,{name:t.name,archived:true},{name:t.name,archived:true,deleted:true},'Empty and unused');
   return {status:'deleted',kind:'table',id:t.id};
  }
  const archived=archivedFieldsOf(t),item=archived.find(x=>x.field.key===v.key);if(!item)fail(404,'not_found','Archived field not found');
  const blocked=deletionBlocker(await usage(tx,w,t.id,item.field.key));if(blocked)fail(409,'in_use',blocked);
  const archivedFields=archived.filter(x=>x!==item),version=t.version+1;
  await tx.query('UPDATE entity_types SET archived_fields=$1,version=$2 WHERE id=$3',[JSON.stringify(archivedFields),version,t.id]);
  await revision(tx,a,w,t.id,'type',version,{id:t.id,name:t.name,fields:t.fields,archivedFields,version});
  await audit(tx,a,p,'field.deleted_permanently',t.id,{field:item.field},{deleted:item.field.key},'Empty and unused');
  return {status:'deleted',kind:'field',id:t.id,key:item.field.key};
 });
}

/** Archived, restorable apps installed from a catalog template (by install receipt or saved origin). */
export async function archivedTemplateApps(db:Connection,a:Actor,w:string,templateId:string){
 const p=await access(db,a,w);
 return (await db.query(`SELECT c.id,c.name,c.project_id,c.archived_at,c.created_by,c.bindings,c.version FROM workspace_components c WHERE c.workspace_id=$1 AND c.archived AND c.deleted_at IS NULL AND ($3::boolean OR c.created_by=$4)
  AND (c.id::text IN (SELECT result->>'appId' FROM workspace_receipts WHERE workspace_id=$1 AND result->>'templateId'=$2)
   OR EXISTS(SELECT 1 FROM revisions r WHERE r.workspace_id=$1 AND r.object_id=c.id AND r.object_kind='workspace_component' AND r.snapshot->'catalogOrigin'->>'id'=$2))
  ORDER BY c.archived_at DESC NULLS LAST,c.id`,[w,templateId,p.role==='owner',a.userId])).rows;
}
/** Worker: purge fields/tables archived ≥90 days that are still empty and unused (when enabled). */
export async function purgeArchivedSchema(db:Database){
 if(!archivePurgeEnabled())return 0;
 return db.transaction(async tx=>Number((await tx.query('SELECT trialy_security.purge_archived_schema() AS n')).rows[0].n));
}
