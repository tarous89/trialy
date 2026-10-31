import {z} from 'zod';
import type {Database} from '../db/database.js';
import {id,fail,type Actor} from '../shared/schema.js';
import {access} from '../domain/permissions.js';
import {requireCurrentAction} from '../domain/write-authorization.js';
import {audit} from '../domain/evidence.js';
import {WorkspaceFoundation} from './service.js';
import {workspaceHome} from './home.js';
export const moveToolInput=z.object({toolId:id,source:z.enum(['component','function','collection','legacy']),projectId:id.nullable(),expectedVersion:z.number().int().min(0),confirmed:z.literal(true)}).strict();
/** Placement is organization only. It never rewrites record scope, sharing or execution grants. */
export async function moveTool(db:Database,a:Actor,w:string,input:unknown){
 requireCurrentAction(a);const v=moveToolInput.parse(input);
 return db.transaction(async tx=>{
  const policy=await access(tx,a,w,true);
  await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))',[w]);
  const local:Database={query:(q,args)=>tx.query(q,args),transaction:fn=>fn(tx),close:async()=>{}};
  const f=new WorkspaceFoundation(local);
  if(v.projectId){const target=(await f.activeNode(tx,a,w,v.projectId))[0];if(target.kind!=='project')fail(400,'project_required','Choose a project');}
  let resource:any,offset:number|null=0;
  if(v.source==='component'){
   // A move needs the app's authorization and placement, never Home thumbnails,
   // unrelated apps, generated code or database-row previews.
   let c:any;try{c=await f.component(tx,a,w,v.toolId);}catch(e){if([403,404].includes((e as any).status))fail(404,'tool_unavailable','App is unavailable. Refresh Home.');throw e;}
   if(!c.archived&&!c.project_archived)resource={placementVersion:c.home_placement_version,projectIds:(c.home_placement_version?c.home_project_id:c.project_id)?[c.home_placement_version?c.home_project_id:c.project_id]:[]};
  }else do{const page=await workspaceHome(local,a,w,{offset,limit:100});resource=page.resources.find(r=>r.id===v.toolId&&r.source===v.source);offset=page.nextOffset;}while(!resource&&offset!==null);
  if(!resource)fail(404,'tool_unavailable','App is unavailable. Refresh Home.');
  if(resource.placementVersion!==v.expectedVersion)fail(409,'stale_version','The app was moved elsewhere. Refresh Home before moving again.');
  const table={component:'workspace_components',function:'foundation_functions',collection:'external_links',legacy:'automations'}[v.source];
  const changed=await tx.query(`UPDATE ${table} SET home_project_id=$1,home_placement_version=home_placement_version+1 WHERE workspace_id=$2 AND id=$3 AND home_placement_version=$4 RETURNING id`,[v.projectId,w,v.toolId,v.expectedVersion]);
  if(!changed.rows.length)fail(409,'stale_version','The app changed. Refresh Home before moving again.');
  await audit(tx,a,policy,'tool.moved',v.toolId,{projectIds:resource.projectIds},{projectId:v.projectId,source:v.source,version:v.expectedVersion+1},'Organizational move; data scope and access unchanged');
  return {status:'saved',toolId:v.toolId,projectId:v.projectId,version:v.expectedVersion+1};
 });
}
