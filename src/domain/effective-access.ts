import {z} from 'zod';
import type {Connection} from '../db/database.js';
import {fail,id,type Actor,type Field} from '../shared/schema.js';

export const accessRuleSchema=z.object({subject:z.union([id,z.literal('chatgpt')]),kind:z.enum(['project','tool','table','column']),resourceId:id,field:z.string().max(64).optional(),read:z.enum(['inherit','allow','deny']).default('inherit'),write:z.enum(['inherit','allow','deny']).default('inherit'),bindings:z.array(z.object({toolId:id.optional(),typeId:id,fields:z.array(z.string()),writable:z.array(z.string()),projectId:id.nullable()})).optional()}).strict();
export type AccessRule=z.infer<typeof accessRuleSchema>;
export function rulesFor(p:any,a:Actor):AccessRule[]{return (p.permission_rules??[]).filter((r:AccessRule)=>r.subject===a.userId||(a.origin==='ai'&&r.subject==='chatgpt'));}
export function dataRules(p:any,a:Actor,t:string,key?:string){return rulesFor(p,a).filter(r=>r.resourceId===t&&(r.kind==='table'||(r.kind==='column'&&r.field===key)));}
export function denied(rules:AccessRule[],action:'read'|'write'){return rules.some(r=>r.read==='deny'||(action==='write'&&r.write==='deny'));}
export function resourceGrant(p:any,a:Actor,kind:'project'|'tool',resourceId:string,parents:string[]=[]) {
 const rules=rulesFor(p,a).filter(r=>(r.kind===kind&&r.resourceId===resourceId)||(r.kind==='project'&&parents.includes(r.resourceId)));
 const owner=p.role==='owner';
 const read=(owner||p.direct_data!==false||rules.some(r=>r.subject===a.userId&&r.read==='allow'))&&!denied(rules,'read');
 const write=read&&p.role!=='inspector'&&(owner||(p.direct_data!==false&&!['viewer','inspector'].includes(p.role))||rules.some(r=>r.subject===a.userId&&r.write==='allow'))&&!denied(rules,'write');
 return {read,write,rules};
}
/** Context is constructed by the server after resolving the saved tool. Never accepted from generated code. */
export async function toolPolicy(db:Connection,a:Actor,p:any,toolId:string){
 const c=(await db.query('SELECT * FROM workspace_components WHERE id=$1 AND workspace_id=$2',[toolId,p.id])).rows[0];if(!c)fail(404,'not_found','Tool unavailable');
 const parents:string[]=[];let current=c.project_id;
 while(current){if(parents.includes(current))fail(409,'folder_cycle','Invalid project hierarchy');parents.push(current);const n=(await db.query('SELECT * FROM workspace_nodes WHERE id=$1 AND workspace_id=$2',[current,p.id])).rows[0];if(!n||(p.role!=='owner'&&n.allowed_users!==null&&!n.allowed_users.includes(a.userId))||(a.origin==='ai'&&!n.ai_enabled))fail(403,'tool_access','Project access is restricted');current=n.parent_id;}
 if((p.role!=='owner'&&c.allowed_users!==null&&!c.allowed_users.includes(a.userId))||(a.origin==='ai'&&!c.ai_enabled))fail(403,'tool_access','Tool access is restricted');
 const grant=resourceGrant(p,a,'tool',c.id,parents);if(!grant.read)fail(403,'tool_access','You do not have access to this tool');
 // Legacy source may contain copied values; only reviewed bound resources support scoped sharing.
 if(p.direct_data===false&&c.source_access!=='bindings')fail(403,'tool_source_scope','This tool needs a reviewed connected-data version before sharing');
 const scopes=grant.rules.filter(r=>r.subject===a.userId&&r.read==='allow').flatMap(r=>r.bindings??[]);
 return {c,grant,scopes};
}
export async function applyTypePolicy(db:Connection,a:Actor,p:any,type:any){
 const owner=p.role==='owner',legacy=owner||(p.direct_data!==false&&(!p.allowed_types||p.allowed_types.includes(type.id)));
 if(a.origin==='ai'&&p.ai_hidden_types?.includes(type.id))return {...p,typeId:type.id,read_fields:[],write_fields:[],scope_project:null};
 if(!owner&&p.database_browse===false&&!a.accessToolId)return {...p,typeId:type.id,read_fields:[],write_fields:[],scope_project:null};
 const tool=a.accessToolId?await toolPolicy(db,a,p,a.accessToolId):null;
 const bound=tool?.c.bindings.find((b:any)=>b.typeId===type.id);
 const source=tool?.scopes.filter(s=>s.typeId===type.id&&(!s.toolId||s.toolId===tool.c.id)&&(s.projectId===null||s.projectId===tool.c.project_id&&tool.c.manifest?.scope==='project'))??[];
 const read:string[]=[],write:string[]=[];
 for(const f of type.fields as Field[]){
  const rules=dataRules(p,a,type.id,f.key),base=legacy||rules.some(r=>r.subject===a.userId&&r.read==='allow');
  const toolRead=!!bound?.fields.includes(f.key)&&(owner||source.some(s=>s.fields.includes(f.key))||base);
  const canRead=(tool?toolRead:base)&&!denied(rules,'read');
  if(!canRead)continue;read.push(f.key);
  const baseWrite=(legacy&&!['viewer','inspector'].includes(p.role))||rules.some(r=>r.subject===a.userId&&r.write==='allow');
  const toolWrite=!!tool?.grant.write&&(owner||source.some(s=>s.writable.includes(f.key))||baseWrite)&&(!tool.c.manifest||tool.c.manifest.fields.some((m:any)=>m.typeId===type.id&&m.field===f.key&&m.mode==='write'));
  if(p.role!=='inspector'&&(tool?toolWrite:p.role!=='viewer'&&baseWrite)&&!denied(rules,'write'))write.push(f.key);
 }
 // Tool context always limits records to its declared project, even for an owner.
 const scopeProject=tool?.c.manifest?.scope==='project'?tool.c.project_id:null;
 if(tool?.c.manifest?.scope==='project'&&!scopeProject)fail(403,'project_scope','Project data scope is unavailable');
 const allowed_types=tool?tool.c.bindings.map((b:any)=>b.typeId).filter((t:string)=>!denied(dataRules(p,a,t),'read')&&!(a.origin==='ai'&&p.ai_hidden_types?.includes(t))):p.allowed_types;return {...p,allowed_types,typeId:type.id,read_fields:read,write_fields:write,scope_project:scopeProject??null};
}
export async function assertRecordScope(db:Connection,p:any,recordId:string){if(p.scope_project&&!(await db.query('SELECT 1 FROM project_records WHERE workspace_id=$1 AND project_id=$2 AND record_id=$3 AND revoked_at IS NULL',[p.id,p.scope_project,recordId])).rows.length)fail(404,'not_found','Record is outside the permitted scope');}
export function assertWritable(p:any,keys:string[]){if(keys.some(k=>!p.write_fields?.includes(k)))fail(403,'field_read_only','Editing is restricted for one or more fields');}
export function rowFence(p:any,args:any[],alias='records'){if(!p.scope_project)return '';args.push(p.scope_project);return ` AND EXISTS(SELECT 1 FROM project_records access_scope WHERE access_scope.workspace_id=${alias}.workspace_id AND access_scope.record_id=${alias}.id AND access_scope.project_id=$${args.length} AND access_scope.revoked_at IS NULL)`;}
