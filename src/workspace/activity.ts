import {Service} from '../domain/service.js';
import {z} from 'zod';
import {id,type Actor} from '../shared/schema.js';
import type {Database} from '../db/database.js';
import {access} from '../domain/permissions.js';
import {WorkspaceFoundation} from './service.js';
import {Foundation} from '../foundation/service.js';
export const activityQuery=z.object({offset:z.number().int().min(0).default(0),limit:z.number().int().min(1).max(200).default(50),query:z.string().max(200).default(''),category:z.enum(['all','automation','access','deletion','data','configuration']).default('all'),outcome:z.enum(['all','failed','succeeded','queued','running','cancelled','completed','skipped']).default('all'),actorId:id.optional(),projectId:id.optional(),resourceId:id.optional(),since:z.iso.datetime().optional(),until:z.iso.datetime().optional(),before:z.iso.datetime().optional()});
/** Metadata only. Never return snapshots, payloads, diagnostics, source or bearer links. */
export async function activityPage(db:Database,a:Actor,w:string,input:unknown){
 const q=activityQuery.parse(input),p=await access(db,a,w),f=new WorkspaceFoundation(db);
 const [nodes,components,functions]=await Promise.all([f.nodes(a,w),f.components(a,w),new Foundation(db).functions(a,w).catch(()=>[])]);
 const permitted=[...nodes.nodes.map(n=>n.id),...components.map(c=>c.id),...functions.map(f=>f.id)];
 // Unrestricted human audit readers retain the existing audit entitlement. AI and
 // other members see only metadata for currently accessible project resources.
 let full=a.origin==='human'&&['owner','inspector'].includes(p.role)&&p.document_scope&&p.allowed_types===null&&!p.hidden_fields.length;
 if(full){try{await new Service(db).inspectionAccess(db,a,w);}catch(e){if((e as any).status!==403)throw e;full=false;}}
 const allowedTypes=(await new Service(db).types(a,w)).map(t=>t.id);
 const before=q.before??new Date().toISOString();
 const params=[w,a.userId,full,permitted,q.query,q.category,q.outcome,q.actorId??null,q.projectId??null,q.resourceId??null,q.since??null,q.until??null,before,q.limit+1,q.offset,allowedTypes];
 const rows=(await db.query(`WITH events AS (
 SELECT e.id::text id,e.created_at,e.actor_id,e.action,e.object_id resource_id,CASE WHEN e.action IN ('automation.failed','automation.cancelled') THEN split_part(e.action,'.',2) ELSE 'succeeded' END outcome,e.origin,
 CASE WHEN e.action ~ '(access|permission|grant|sharing)' THEN 'access' WHEN e.action ~ '(delet|archiv|remov)' THEN 'deletion' WHEN e.action ~ '(automation|execution|function)' THEN 'automation' WHEN e.action ~ '(record|field|data)' THEN 'data' ELSE 'configuration' END category,
 COALESCE(c.project_id,ec.project_id,n.id) project_id,COALESCE(c.name,n.name,fn.name,t.name,rt.name,'Workspace event') resource_name
 FROM audit_events e LEFT JOIN workspace_components c ON c.id=e.object_id AND c.workspace_id=e.workspace_id LEFT JOIN workspace_nodes n ON n.id=e.object_id AND n.workspace_id=e.workspace_id LEFT JOIN foundation_functions fn ON fn.id=e.object_id AND fn.workspace_id=e.workspace_id
 LEFT JOIN workspace_components ec ON ec.id::text=e.after_value->>'componentId' AND ec.workspace_id=e.workspace_id
 LEFT JOIN entity_types t ON t.id=e.object_id AND t.workspace_id=e.workspace_id LEFT JOIN records rec ON rec.id=e.object_id AND rec.workspace_id=e.workspace_id LEFT JOIN entity_types rt ON rt.id=rec.type_id
 WHERE e.workspace_id=$1 AND ($3::boolean OR e.source_run_id IS NULL OR e.after_value->>'componentId' IS NULL OR ec.id=ANY($4::uuid[])) AND ($3::boolean OR e.object_id=ANY($4::uuid[]) OR t.id=ANY($16::uuid[]) OR rec.type_id=ANY($16::uuid[]) OR (e.actor_id=$2 AND e.action IN ('automation.failed','automation.succeeded','automation.cancelled') AND e.object_id=e.source_run_id))
 UNION ALL
 SELECT 'run:'||r.id::text,r.created_at,r.user_id,'automation.'||r.status,fn.id,r.status,'worker','automation',c.project_id,COALESCE(fn.name,'Code execution')
 FROM foundation_runs r LEFT JOIN foundation_revisions rev ON rev.id=r.revision_id LEFT JOIN foundation_functions fn ON fn.id=rev.function_id LEFT JOIN workspace_components c ON c.id=(r.component_context->>'id')::uuid AND c.workspace_id=r.workspace_id
 WHERE r.workspace_id=$1 AND r.status IN ('queued','running') AND ($3::boolean OR (r.user_id=$2 AND (fn.id IS NULL OR fn.id=ANY($4::uuid[])) AND (c.id IS NULL OR c.id=ANY($4::uuid[]))))
 UNION ALL
 SELECT 'legacy:'||r.id::text,r.created_at,j.owner_id,'automation.'||r.status,j.id,r.status,'worker','automation',NULL::uuid,j.name FROM automation_runs r JOIN automations j ON j.id=r.automation_id WHERE r.workspace_id=$1 AND $3::boolean
 ) SELECT events.*,u.name AS actor_name FROM events JOIN users u ON u.id=events.actor_id WHERE ($5='' OR strpos(lower(action||' '||resource_name||' '||coalesce(resource_id::text,'')||' '||actor_id::text||' '||u.name),lower($5))>0)
 AND ($6='all' OR category=$6) AND ($7='all' OR outcome=$7) AND ($8::uuid IS NULL OR actor_id=$8) AND ($9::uuid IS NULL OR project_id=$9 OR EXISTS(SELECT 1 FROM project_records pr WHERE pr.workspace_id=$1 AND pr.project_id=$9 AND pr.record_id=events.resource_id AND pr.revoked_at IS NULL AND ($3::boolean OR pr.project_id=ANY($4::uuid[])))) AND ($10::uuid IS NULL OR resource_id=$10)
 AND ($11::timestamptz IS NULL OR events.created_at >= $11) AND ($12::timestamptz IS NULL OR events.created_at <= $12) AND events.created_at <= $13::timestamptz
 ORDER BY events.created_at DESC,events.id DESC LIMIT $14 OFFSET $15`,params)).rows;
 return {rows:rows.slice(0,q.limit),nextOffset:rows.length>q.limit?q.offset+q.limit:null,before,scope:full?'Workspace audit metadata':'Permitted resource activity and your execution statuses',projects:nodes.nodes.filter(n=>n.kind==='project').map(n=>({id:n.id,name:n.name}))};
}
