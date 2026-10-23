import {Service} from '../domain/service.js';
import {z} from 'zod';
import type {Actor} from '../shared/schema.js';
import type {Database} from '../db/database.js';
import {access,typeAccess,visibleFields} from '../domain/permissions.js';
import {WorkspaceFoundation} from './service.js';
import {Foundation} from '../foundation/service.js';
export const homeQuery=z.object({offset:z.number().int().min(0).default(0),limit:z.number().int().min(1).max(100).default(40),query:z.string().max(200).default(''),projectId:z.string().default(''),kind:z.enum(['all','tracker','form','visualization','automation']).default('all'),sort:z.enum(['updated','name']).default('updated')});
export async function workspaceHome(db:Database,a:Actor,w:string,input:unknown={}){
 const q=homeQuery.parse(input);
 const p=await access(db,a,w),f=new WorkspaceFoundation(db),engine=new Foundation(db);
 const [tree,components]=await Promise.all([f.nodes(a,w),f.components(a,w)]);
 const projects=tree.nodes.filter(n=>n.kind==='project'&&!n.effective_archived).map(n=>({id:n.id,name:n.name}));
 const resources:any[]=components.filter(c=>!c.archived&&!c.project_archived).map(c=>({id:c.id,name:c.name,kind:['tracker','form','visualization'].includes(c.resource_kind)?c.resource_kind:'generic',source:'component',projectIds:c.project_id?[c.project_id]:[],updatedAt:c.updated_at??c.created_at,description:c.resource_kind==='generic'?'Saved custom interface':`${c.bindings?.length??0} connected tables · revision ${c.version+1}`}));
 // Automation source is never loaded or executed for Home thumbnails.
 if(p.ai_enabled&&(p.role==='owner'||p.user_ai)){
  const functions=await engine.functions(a,w),schedules=await engine.schedules(a,w);
  for(const fn of functions){try{const revision=await engine.revision(a,w,fn.revision_id);const related=components.filter(c=>(c.execution??[]).some((b:any)=>b.revisionId===fn.revision_id));const attached=schedules.filter(s=>s.revision_id===fn.revision_id);resources.push({id:fn.id,revisionId:fn.revision_id,name:fn.name,kind:'automation',source:'function',projectIds:[...new Set(related.map(c=>c.project_id).filter(Boolean))],updatedAt:revision.created_at,description:attached.length?`${attached.filter(s=>!s.paused).length} active schedules · ${attached.length} total`:'Saved function · run on demand'});}catch(e){if(![403,404].includes((e as any).status))throw e;}}
 }
 if(p.role==='owner')for(const l of (await db.query('SELECT id,name,kind,type_id,fields,project_id,created_at FROM external_links WHERE workspace_id=$1 AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC',[w])).rows){try{if(l.project_id)await f.nodeAccess(db,a,w,l.project_id);const {type,policy}=await typeAccess(db,a,w,l.type_id);if(!l.fields.every((k:string)=>visibleFields(type.fields,policy,a).some(f=>f.key===k)))continue;resources.push({id:l.id,name:l.name,kind:l.kind==='form'?'form':'visualization',source:'collection',projectIds:l.project_id?[l.project_id]:[],updatedAt:l.created_at,description:`Shared ${l.kind==='form'?'form':'view'} · ${l.fields.length} connected fields`});}catch(e){if(![403,404].includes((e as any).status))throw e;}}
 for(const job of await new Service(db).automations(a,w))resources.push({id:job.id,name:job.name,kind:'automation',source:'legacy',projectIds:[],updatedAt:job.created_at,description:`${job.paused?'Paused':'Active'} · every ${job.interval_minutes} minutes`,status:job.paused?'Paused':'Active'});
 const placements=(await db.query("SELECT 'component' AS source,id AS tool_id,home_project_id AS project_id,home_placement_version AS version FROM workspace_components WHERE workspace_id=$1 AND home_placement_version>0 UNION ALL SELECT 'function',id,home_project_id,home_placement_version FROM foundation_functions WHERE workspace_id=$1 AND home_placement_version>0 UNION ALL SELECT 'collection',id,home_project_id,home_placement_version FROM external_links WHERE workspace_id=$1 AND home_placement_version>0 UNION ALL SELECT 'legacy',id,home_project_id,home_placement_version FROM automations WHERE workspace_id=$1 AND home_placement_version>0",[w])).rows;
 for(let i=resources.length-1;i>=0;i--){const r=resources[i],placement=placements.find(x=>x.source===r.source&&x.tool_id===r.id);r.placementVersion=placement?.version??0;r.canMove=p.role==='owner'||p.role==='editor';
  if(placement){try{if(placement.project_id)await f.activeNode(db,a,w,placement.project_id);r.projectIds=placement.project_id?[placement.project_id]:[];}catch{resources.splice(i,1);}}
 }
 const matches=resources.filter(r=>(!q.projectId||(q.projectId==='unassigned'?r.projectIds.length===0:r.projectIds.includes(q.projectId)))&&(q.kind==='all'||r.kind===q.kind)&&(!q.query||`${r.name} ${r.description}`.toLowerCase().includes(q.query.toLowerCase()))).sort((a,b)=>q.sort==='name'?a.name.localeCompare(b.name)||a.id.localeCompare(b.id):new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime()||a.id.localeCompare(b.id));
 const page=matches.slice(q.offset,q.offset+q.limit);
 // Read-only schema previews contain field names, never sampled values or executable HTML.
 for(const resource of page){const c=components.find(c=>c.id===resource.id);const labels:string[]=[];for(const b of c?.bindings??[]){try{const {type,policy}=await typeAccess(db,a,w,b.typeId);for(const field of visibleFields(type.fields,policy,a))if((b.fields??[]).includes(field.key))labels.push(field.name);}catch(e){if(![403,404].includes((e as any).status))throw e;}}resource.previewFields=labels.slice(0,4);}
 return {projects,resources:page,total:matches.length,nextOffset:q.offset+q.limit<matches.length?q.offset+q.limit:null};
}
