import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import type {Database,Connection} from '../db/database.js';
import {access,typeAccess,visibleFields} from './permissions.js';
import {accessRuleSchema,applyTypePolicy,resourceGrant,type AccessRule} from './effective-access.js';
import {audit} from './evidence.js';
import {fail,id,type Actor} from '../shared/schema.js';
export const accessUpdate=z.object({expectedVersion:z.number().int().min(0),subject:z.union([id,z.literal('chatgpt')]),role:z.enum(['viewer','editor','inspector']).optional(),databaseBrowse:z.boolean().optional(),directData:z.boolean().optional(),chatgpt:z.boolean().optional(),rule:accessRuleSchema.omit({subject:true,bindings:true}).optional()}).strict();
export class AccessManagement{
 constructor(private db:Database){}
 async overview(a:Actor,w:string){
  const p=await access(this.db,a,w);if(p.role!=='owner')return {workspaceId:w,version:p.access_version,canManage:false,people:[],connections:[{id:'chatgpt',name:'ChatGPT',enabled:p.ai_enabled&&p.user_ai!==false}],message:'Your access is managed by the account owner.'};
  const people=(await this.db.query(`SELECT u.id,u.name,u.email,CASE WHEN m.role='owner' THEN 'owner' ELSE wa.role END AS role,COALESCE(wa.database_browse,true) AS database_browse,COALESCE(wa.direct_data,true) AS direct_data,CASE WHEN m.role='owner' THEN true ELSE wa.ai_enabled END AS ai_enabled FROM memberships m JOIN users u ON u.id=m.user_id LEFT JOIN workspace_access wa ON wa.workspace_id=$1 AND wa.user_id=m.user_id WHERE m.tenant_id=$2 AND (m.role='owner' OR wa.user_id IS NOT NULL) ORDER BY CASE WHEN m.role='owner' THEN 0 ELSE 1 END,u.name`,[w,p.tenant_id])).rows;
  const tables=(await this.db.query('SELECT id,name,fields FROM entity_types WHERE workspace_id=$1 ORDER BY name',[w])).rows.map(t=>({...t,fields:t.fields.map((f:any)=>({key:f.key,name:f.name}))}));
  const projects=(await this.db.query('SELECT id,name,parent_id FROM workspace_nodes WHERE workspace_id=$1 AND archived=false ORDER BY name',[w])).rows;
  const tools=(await this.db.query('SELECT id,name,project_id,bindings,manifest,source_access FROM workspace_components WHERE workspace_id=$1 AND archived=false ORDER BY name',[w])).rows;
  return {workspaceId:w,version:p.access_version,canManage:true,people,tables,projects,tools,rules:p.permission_rules,connections:[{id:'chatgpt',name:'ChatGPT',enabled:p.ai_enabled,description:'Inherits each connected person’s access. Restrictions below can only reduce it.'}]};
 }
 async explain(a:Actor,w:string,subject:string){
  const owner=await access(this.db,a,w);if(owner.role!=='owner'&&subject!==a.userId)fail(403,'owner_required','Only the owner can inspect another person’s access');
  const target:Actor={userId:subject==='chatgpt'?a.userId:subject,origin:subject==='chatgpt'||owner.role!=='owner'&&a.origin==='ai'?'ai':'human'};
  const p=await access(this.db,{...target,origin:'human'},w),tables=(await this.db.query('SELECT * FROM entity_types WHERE workspace_id=$1 ORDER BY name',[w])).rows;
  if(target.origin==='ai'&&(!p.ai_enabled||(p.role!=='owner'&&!p.user_ai)))return {tables:tables.map(t=>({id:t.id,name:t.name,fields:t.fields.map((f:any)=>({key:f.key,name:f.name,read:false,write:false,sources:[]}))})),databaseBrowse:false,version:p.access_version,connectionEnabled:false};
  const tools=(await this.db.query('SELECT id,name,bindings FROM workspace_components WHERE workspace_id=$1 AND archived=false ORDER BY name',[w])).rows;
  const result=[];
  for(const t of tables){
   const direct=await applyTypePolicy(this.db,target,{...p,database_browse:true},t),directFields=visibleFields(t.fields,direct,target),sources:any[]=[];
   for(const c of tools.filter(c=>c.bindings.some((b:any)=>b.typeId===t.id))){try{const via=await applyTypePolicy(this.db,{...target,accessToolId:c.id},p,t),fields=visibleFields(t.fields,via,target);if(fields.length)sources.push({id:c.id,name:c.name,fields:fields.map(f=>f.key),writable:via.write_fields.filter((k:string)=>fields.some(f=>f.key===k)),scope:via.scope_project?'Project records':'All records in the bound table',projectId:via.scope_project});}catch{}}
   const fields=t.fields.map((f:any)=>{const grants=[...(directFields.some(v=>v.key===f.key)?[{id:'direct',name:p.role==='owner'?'Account owner':'Direct data access',read:true,write:direct.write_fields.includes(f.key),scope:'All records'}]:[]),...sources.filter(s=>s.fields.includes(f.key)).map(s=>({id:s.id,name:s.name,read:true,write:s.writable.includes(f.key),scope:s.scope}))];return {key:f.key,name:f.name,read:grants.length>0,write:grants.some(g=>g.write),sources:grants};});
   if(owner.role==='owner'||fields.some((f:any)=>f.read))result.push({id:t.id,name:t.name,fields:owner.role==='owner'?fields:fields.filter((f:any)=>f.read)});
  }
  return {tables:result,databaseBrowse:p.role==='owner'||p.database_browse,version:p.access_version};
 }
 async update(a:Actor,w:string,input:unknown){const v=accessUpdate.parse(input);if(a.origin!=='human')fail(403,'human_required','Save access changes in your signed-in owner session');
  return this.db.transaction(async tx=>{
   await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w);if(p.role!=='owner')fail(403,'owner_required','Only the account owner can change access');if(p.access_version!==v.expectedVersion)fail(409,'access_changed','Access changed. Refresh before saving.');
   if(v.subject!=='chatgpt'){
    const m=(await tx.query('SELECT role FROM memberships WHERE tenant_id=$1 AND user_id=$2',[p.tenant_id,v.subject])).rows[0];if(!m)fail(404,'not_found','Person not found');if(m.role==='owner')fail(400,'owner_access','Owner access is managed at account level');
    if(!(await tx.query('SELECT 1 FROM workspace_access WHERE workspace_id=$1 AND user_id=$2',[w,v.subject])).rows.length)fail(404,'not_found','Share this account with the colleague first');
   }
   const rules:AccessRule[]=[...(p.permission_rules??[])];let changed:any=null;
   if(v.rule){const r:AccessRule={...v.rule,subject:v.subject};
    if(r.kind==='database'||r.kind==='connection'){if(r.resourceId!==w)fail(404,'not_found','Database unavailable');}
    else if(r.kind==='workflow'){const workflow=(await tx.query('SELECT user_id AS creator FROM foundation_functions WHERE workspace_id=$1 AND id=$2 UNION ALL SELECT owner_id FROM automations WHERE workspace_id=$1 AND id=$2',[w,r.resourceId])).rows[0];if(!workflow)fail(404,'not_found','Workflow unavailable');if((r.read==='allow'||r.write==='allow')&&workflow.creator!==v.subject)fail(403,'private_workflow','Workflows remain private to their creator');}
    else if(r.kind==='table'||r.kind==='column'){const t=(await tx.query('SELECT fields FROM entity_types WHERE workspace_id=$1 AND id=$2',[w,r.resourceId])).rows[0];if(!t||(r.kind==='column'&&!t.fields.some((f:any)=>f.key===r.field)))fail(404,'not_found','Table or column unavailable');}
    else {
     const table=r.kind==='project'?'workspace_nodes':'workspace_components';if(!(await tx.query(`SELECT id FROM ${table} WHERE workspace_id=$1 AND id=$2`,[w,r.resourceId])).rows.length)fail(404,'not_found','Resource unavailable');
     if(r.read==='allow'&&r.subject!=='chatgpt'){
      const components=r.kind==='tool'?(await tx.query('SELECT * FROM workspace_components WHERE workspace_id=$1 AND id=$2',[w,r.resourceId])).rows:(await tx.query(`WITH RECURSIVE children AS (SELECT id FROM workspace_nodes WHERE workspace_id=$1 AND id=$2 UNION ALL SELECT n.id FROM workspace_nodes n JOIN children c ON n.parent_id=c.id WHERE n.workspace_id=$1) SELECT * FROM workspace_components WHERE workspace_id=$1 AND project_id IN (SELECT id FROM children) AND archived=false`,[w,r.resourceId])).rows;
      if(components.some(c=>c.source_access!=='bindings'))fail(409,'review_tool_source','An app contains saved source data. Convert it to reviewed connected bindings before scoped sharing.');
      r.bindings=components.flatMap(c=>c.bindings.map((b:any)=>({toolId:c.id,typeId:b.typeId,fields:b.fields,writable:r.write==='allow'?b.fields.filter((key:string)=>!c.manifest||c.manifest.fields.some((f:any)=>f.typeId===b.typeId&&f.field===key&&f.mode==='write')):[],projectId:c.manifest?.scope==='project'?c.project_id:null})));
     }
    }
    if(v.subject==='chatgpt'&&(r.read==='allow'||r.write==='allow'))fail(400,'connection_inheritance','Connections inherit user grants. They can only add restrictions.');
    const i=rules.findIndex(x=>x.subject===r.subject&&x.kind===r.kind&&x.resourceId===r.resourceId&&x.field===r.field);if(i>=0)rules.splice(i,1);if(r.read!=='inherit'||r.write!=='inherit')rules.push(r);changed=r;
   }
   if(v.subject==='chatgpt'){if(v.chatgpt!==undefined)await tx.query('UPDATE workspaces SET ai_enabled=$2 WHERE id=$1',[w,v.chatgpt]);}
   else await tx.query(`UPDATE workspace_access SET role=COALESCE($6,role),database_browse=COALESCE($3,database_browse),direct_data=COALESCE($4,direct_data),ai_enabled=CASE WHEN COALESCE($6,role)='inspector' THEN false ELSE COALESCE($5,ai_enabled) END WHERE workspace_id=$1 AND user_id=$2`,[w,v.subject,v.databaseBrowse??null,v.directData??null,v.chatgpt??null,v.role??null]);
   await tx.query('UPDATE workspaces SET permission_rules=$2,access_version=access_version+1 WHERE id=$1',[w,JSON.stringify(rules)]);
   await audit(tx,a,p,'access.policy_changed',w,{version:p.access_version,rules:p.permission_rules},{...v,rule:changed,version:p.access_version+1});return {saved:true,version:p.access_version+1};
  });
 }
}
