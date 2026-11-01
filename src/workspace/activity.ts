import {withReadMetadata} from '../db/read-metadata.js';
import {activityEvidence,recordEventChanges} from './activity-evidence.js';
import {Service} from '../domain/service.js';
import {z} from 'zod';
import {id,type Actor,fail} from '../shared/schema.js';
import type {Database} from '../db/database.js';
import {access} from '../domain/permissions.js';
import {WorkspaceFoundation} from './service.js';
import {Foundation} from '../foundation/service.js';
export const activityQuery=z.object({eventId:id.optional(),offset:z.number().int().min(0).default(0),limit:z.number().int().min(1).max(200).default(25),query:z.string().max(200).default(''),category:z.enum(['all','automation','access','deletion','data','configuration']).default('all'),outcome:z.enum(['all','failed','succeeded','queued','running','cancelled','completed','skipped','no_update','partial','blocked','waiting','unknown']).default('all'),actorId:id.optional(),projectId:id.optional(),appId:id.optional(),resourceId:id.optional(),since:z.iso.datetime().optional(),until:z.iso.datetime().optional(),before:z.iso.datetime().optional()});
/** Metadata only. Never return snapshots, payloads, diagnostics, source or bearer links. */
export async function activityPage(db:Database,a:Actor,w:string,input:unknown){return withReadMetadata(db,db=>activityPageRead(db,a,w,input));}
async function activityPageRead(db:Database,a:Actor,w:string,input:unknown){
 const q=activityQuery.parse(input),p=await access(db,a,w),f=new WorkspaceFoundation(db);
 // Unrestricted human audit readers retain the existing audit entitlement. AI and
 // other members see only metadata for currently accessible project resources.
 let full=a.origin==='human'&&['owner','inspector'].includes(p.role)&&p.document_scope&&p.allowed_types===null&&!p.hidden_fields.length;
 if(full){try{await new Service(db).inspectionAccess(db,a,w);}catch(e){if((e as any).status!==403)throw e;full=false;}}
 const [nodes,components,functions]=await Promise.all([f.nodes(a,w),full?db.query('SELECT id,name FROM workspace_components WHERE workspace_id=$1 ORDER BY name,id',[w]).then(r=>r.rows):f.components(a,w),full?Promise.resolve([]):new Foundation(db).functions(a,w).catch(()=>[])]);
 const permitted=[...nodes.nodes.map(n=>n.id),...components.map(c=>c.id),...functions.map(f=>f.id)];
 const tables=await new Service(db).types(a,w),allowedTypes=tables.map(t=>t.id);
 const before=q.before??new Date().toISOString();
 const params=[w,a.userId,full,permitted,q.query,q.category,q.outcome,q.actorId??null,q.projectId??null,q.resourceId??null,q.since??null,q.until??null,before,q.limit+1,q.offset,allowedTypes,q.eventId??null,q.appId??null];
 const rows=(await db.query(`WITH events AS (
 SELECT e.id::text id,e.created_at,e.actor_id,e.action,e.object_id resource_id,CASE WHEN e.action IN ('automation.failed','automation.cancelled') THEN split_part(e.action,'.',2) ELSE 'succeeded' END outcome,e.origin,
 CASE WHEN e.action ~ '(access|permission|grant|sharing)' THEN 'access' WHEN e.action ~ '(delet|archiv|remov)' THEN 'deletion' WHEN e.action ~ '(automation|monitoring|app_action|execution|function)' THEN 'automation' WHEN e.action ~ '(record|field|data)' THEN 'data' ELSE 'configuration' END category,
 COALESCE(c.project_id,ec.project_id,n.id) project_id,COALESCE(m.config->>'name',j.config->>'name',c.name,n.name,fn.name,t.name,rt.name,'Workspace event') resource_name,COALESCE(c.id,ec.id) app_id,COALESCE(c.name,ec.name) app_name
 FROM audit_events e LEFT JOIN workspace_components c ON c.id=e.object_id AND c.workspace_id=e.workspace_id LEFT JOIN workspace_nodes n ON n.id=e.object_id AND n.workspace_id=e.workspace_id LEFT JOIN foundation_functions fn ON fn.id=e.object_id AND fn.workspace_id=e.workspace_id
 LEFT JOIN app_monitor_runs mr ON mr.id=e.object_id AND mr.workspace_id=e.workspace_id
 LEFT JOIN app_monitors m ON m.id::text=coalesce(mr.monitor_id::text,e.after_value->>'monitorId',CASE WHEN e.action LIKE 'monitoring.%' THEN e.object_id::text END) AND m.workspace_id=e.workspace_id
 LEFT JOIN app_action_runs ar ON ar.id=e.object_id AND ar.workspace_id=e.workspace_id
 LEFT JOIN app_actions j ON j.id=coalesce(ar.action_id,CASE WHEN e.action LIKE 'app_action.%' THEN e.object_id END) AND j.workspace_id=e.workspace_id
 LEFT JOIN workspace_components ec ON ec.id::text=coalesce(e.after_value->>'componentId',e.after_value->>'appId',e.after_value->'config'->>'appId',m.app_id::text,j.app_id::text) AND ec.workspace_id=e.workspace_id
 LEFT JOIN entity_types t ON t.id=e.object_id AND t.workspace_id=e.workspace_id LEFT JOIN records rec ON rec.id=e.object_id AND rec.workspace_id=e.workspace_id LEFT JOIN entity_types rt ON rt.id=rec.type_id
 WHERE e.workspace_id=$1 AND e.action NOT IN ('monitoring.started','monitoring.finished') AND ($3::boolean OR coalesce(c.id,ec.id) IS NULL OR coalesce(c.id,ec.id)=ANY($4::uuid[])) AND ($3::boolean OR e.source_run_id IS NULL OR e.after_value->>'componentId' IS NULL OR ec.id=ANY($4::uuid[])) AND ($3::boolean OR e.object_id=ANY($4::uuid[]) OR (e.actor_id=$2 AND e.action ~ '^(monitoring|app_action)[.]' AND ec.id=ANY($4::uuid[])) OR t.id=ANY($16::uuid[]) OR rec.type_id=ANY($16::uuid[]) OR (e.actor_id=$2 AND e.action IN ('automation.failed','automation.succeeded','automation.cancelled') AND e.object_id=e.source_run_id))
 UNION ALL
 SELECT 'run:'||r.id::text,r.created_at,r.user_id,'automation.'||r.status,fn.id,r.status,'worker','automation',c.project_id,COALESCE(fn.name,'Code execution'),c.id,c.name
 FROM foundation_runs r LEFT JOIN foundation_revisions rev ON rev.id=r.revision_id LEFT JOIN foundation_functions fn ON fn.id=rev.function_id LEFT JOIN workspace_components c ON c.id=(r.component_context->>'id')::uuid AND c.workspace_id=r.workspace_id
 WHERE r.workspace_id=$1 AND r.status IN ('queued','running') AND ($3::boolean OR (r.user_id=$2 AND (fn.id IS NULL OR fn.id=ANY($4::uuid[])) AND (c.id IS NULL OR c.id=ANY($4::uuid[]))))
 UNION ALL
 SELECT 'legacy:'||r.id::text,r.created_at,j.owner_id,'automation.'||r.status,j.id,r.status,'worker','automation',NULL::uuid,j.name,NULL::uuid,NULL::text FROM automation_runs r JOIN automations j ON j.id=r.automation_id WHERE r.workspace_id=$1 AND $3::boolean
 UNION ALL
 SELECT 'monitor:'||r.id::text,r.started_at,r.user_id,'monitoring.'||r.status,m.id,r.status,'worker','automation',c.project_id,m.config->>'name',c.id,c.name
 FROM app_monitor_runs r JOIN app_monitors m ON m.id=r.monitor_id AND m.workspace_id=r.workspace_id JOIN workspace_components c ON c.id=m.app_id AND c.workspace_id=r.workspace_id
 WHERE r.workspace_id=$1 AND r.user_id=$2 AND ($3::boolean OR c.id=ANY($4::uuid[]))
 UNION ALL
 SELECT 'action:'||r.id::text,r.created_at,r.user_id,'app_action.'||r.status,j.id,r.status,'worker','automation',c.project_id,j.config->>'name',c.id,c.name
 FROM app_action_runs r JOIN app_actions j ON j.id=r.action_id AND j.workspace_id=r.workspace_id JOIN workspace_components c ON c.id=j.app_id AND c.workspace_id=r.workspace_id
 WHERE r.workspace_id=$1 AND r.user_id=$2 AND ($3::boolean OR c.id=ANY($4::uuid[]))
 ) SELECT events.*,count(*) OVER() AS total_count,u.name AS actor_name FROM events JOIN users u ON u.id=events.actor_id WHERE ($5='' OR strpos(lower(action||' '||resource_name||' '||coalesce(app_name,'')||' '||coalesce(resource_id::text,'')||' '||actor_id::text||' '||u.name),lower($5))>0)
 AND ($18::uuid IS NULL OR app_id=$18) AND ($17::uuid IS NULL OR events.id=$17::text) AND ($6='all' OR category=$6) AND ($7='all' OR outcome=$7) AND ($8::uuid IS NULL OR actor_id=$8) AND ($9::uuid IS NULL OR project_id=$9 OR EXISTS(SELECT 1 FROM project_records pr WHERE pr.workspace_id=$1 AND pr.project_id=$9 AND pr.record_id=events.resource_id AND pr.revoked_at IS NULL AND ($3::boolean OR pr.project_id=ANY($4::uuid[])))) AND ($10::uuid IS NULL OR resource_id=$10)
 AND ($11::timestamptz IS NULL OR events.created_at >= $11) AND ($12::timestamptz IS NULL OR events.created_at <= $12) AND events.created_at <= $13::timestamptz
 ORDER BY events.created_at DESC,events.id DESC LIMIT $14 OFFSET $15`,params)).rows;
 return {total:Number(rows[0]?.total_count??0),rows:await activityEvidence(db,a,w,rows.slice(0,q.limit),tables,full),nextOffset:rows.length>q.limit?q.offset+q.limit:null,before,scope:full?'Workspace audit metadata':'Permitted resource activity and your execution statuses',apps:components.map(c=>({id:c.id,name:c.name})),projects:nodes.nodes.filter(n=>n.kind==='project').map(n=>({id:n.id,name:n.name}))};
}


export async function activityDetails(db:Database,a:Actor,w:string,eventId:string){const page=await activityPage(db,a,w,{eventId,limit:1});if(!page.rows.length)fail(404,'not_found','Event unavailable');return recordEventChanges(db,a,w,eventId,page.scope==='Workspace audit metadata');}
