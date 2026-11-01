import {z} from 'zod';
import type {Database} from '../db/database.js';
import {id,fail,type Actor} from '../shared/schema.js';
import {requireHuman} from '../domain/write-authorization.js';
import {access} from '../domain/permissions.js';
import {AppMonitoring} from '../app-services/monitoring.js';
import {AppActions} from '../app-services/service.js';
import {WorkspaceFoundation} from '../workspace/service.js';
import {appUrl} from '../shared/app-route.js';
import {adapter} from './service.js';
export const automationKind=z.enum(['research','action']);
export const automationList=z.object({appId:id.optional(),query:z.string().max(100).default(''),executor:z.enum(['all','chatgpt','trialagents']).default('all'),state:z.enum(['all','enabled','disabled']).default('all'),offset:z.number().int().min(0).max(100000).default(0)}).strict();
/** Management adapter over the existing stores. Never called by the app runtime. */
export class AutomationManagement{
 constructor(readonly db:Database){}
 async owner(a:Actor,w:string){const p=await access(this.db,a,w);if(p.role!=='owner')fail(403,'owner_required','Only the owner can manage app automations');}
 async options(a:Actor,w:string,appId:string){
  await this.owner(a,w);const f=new WorkspaceFoundation(this.db),p=await access(this.db,a,w),app=await f.component(this.db,a,w,appId);
  if(app.archived||app.project_archived)fail(409,'app_archived','Choose an active app');
  const tables=(await f.toolTables(a,w,appId)).map((t:any)=>({...t,fields:t.fields.filter((field:any)=>field.ai!==false&&app.bindings.some((b:any)=>b.typeId===t.id&&b.fields.includes(field.key)))}));
  const candidates=(await this.db.query("SELECT u.id,u.name,u.email FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.tenant_id=$1 AND u.subject NOT LIKE 'public-app|%' ORDER BY u.name,u.id",[p.tenant_id])).rows;
  const members=[];for(const member of candidates){try{await f.component(this.db,{userId:member.id,origin:'human'},w,appId);members.push(member);}catch(e){if(![403,404].includes((e as any).status))throw e;}}
  const owner=members.find(m=>m.id===a.userId);if(!owner)fail(403,'owner_required','Owner unavailable');
  const scopes=(await f.scopes(a,w)).filter((s:any)=>!s.revoked_at&&!s.schemaChanged&&s.body.autoWrite&&Date.parse(s.body.expiresAt)>Date.now()&&s.body.projectId===app.project_id&&s.body.bindings.length===1&&s.body.bindings.every((b:any)=>b.fields.every((key:string)=>tables.some((t:any)=>t.id===b.typeId&&t.fields.some((field:any)=>field.key===key&&field.writable))))).map((s:any)=>({scopeId:s.id,version:s.version}));
  return {owner,members:members.filter(m=>m.id!==owner.id),tables,writeScopes:scopes};
 }
 async list(a:Actor,w:string,input:unknown){await this.owner(a,w);const v=automationList.parse(input);
  const rows=(await this.db.query(`SELECT d.*,c.name AS app_name,c.archived AS app_archived FROM (
   SELECT m.id,m.app_id,m.workspace_id,m.user_id,m.version,'research' AS kind,'chatgpt' AS executor,m.config->>'name' AS name,m.enabled,m.config->>'expiresAt' AS expires_at,coalesce(m.config->'automation'->'trigger',m.config->'schedule') AS trigger,m.created_at,
    concat_ws(E'\\n\\n',m.config->>'objective',m.config->>'instructions') AS prompt,NULL::jsonb AS steps,(m.config->'automation' IS NULL AND m.task IS NOT NULL) AS external_schedule
   FROM app_monitors m
   UNION ALL
   SELECT a.id,a.app_id,a.workspace_id,a.user_id,a.version,'action','trialagents',a.config->>'name',NOT a.paused,a.config->>'expiresAt',a.config->'trigger',a.created_at,NULL,a.config->'steps',false
   FROM app_actions a
  ) d JOIN workspace_components c ON c.id=d.app_id AND c.workspace_id=d.workspace_id
  WHERE d.workspace_id=$1 AND d.user_id=$2 AND ($3::uuid IS NULL OR d.app_id=$3)
   AND ($4='' OR position(lower($4) in lower(d.name||' '||c.name))>0)
   AND ($5='all' OR d.executor=$5) AND ($6='all' OR d.enabled=($6='enabled'))
  ORDER BY d.created_at,d.id LIMIT 21 OFFSET $7`,[w,a.userId,v.appId??null,v.query,v.executor,v.state,v.offset])).rows;
  const visible=[];for(const row of rows.slice(0,20)){try{const c=await new WorkspaceFoundation(this.db).component(this.db,a,w,row.app_id,false);
   const {steps,external_schedule,...definition}=row;
   const prompt=row.kind==='research'?row.prompt:(steps??[]).map((s:any)=>s.kind==='email'?`Email: ${s.subject}\n${s.text}`:s.kind==='connector'?`Run connector operation: ${s.operation}`:`Run app action: ${s.binding}`).join('\n\n');
   visible.push({...definition,prompt,externalSchedule:external_schedule,app_url:appUrl({workspaceId:w,appId:c.id}),app_archived:c.archived||c.project_archived});
  }catch(e){if(![403,404].includes((e as any).status))throw e;}}
  return {rows:visible,nextOffset:rows.length>20?v.offset+20:null};
 }
 async read(a:Actor,w:string,kind:'research'|'action',automationId:string){await this.owner(a,w);
  const table=kind==='research'?'app_monitors':'app_actions';
  const r=(await this.db.query(`SELECT * FROM ${table} WHERE id=$1 AND workspace_id=$2 AND user_id=$3`,[automationId,w,a.userId])).rows[0];if(!r)fail(404,'not_found','Automation unavailable');
  const c=await new WorkspaceFoundation(this.db).component(this.db,a,w,r.app_id,false);
  return {id:r.id,version:r.version,kind,executor:kind==='research'?'chatgpt':'trialagents',enabled:kind==='research'?r.enabled:!r.paused,config:r.config,app:{id:c.id,name:c.name,url:appUrl({workspaceId:w,appId:c.id}),archived:c.archived||c.project_archived},managementOnly:true,task:r.task??null};
 }
 async control(a:Actor,w:string,kind:'research'|'action',automationId:string,version:number,enabled:boolean){requireHuman(a);return this.db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const db=adapter(tx),s=new AutomationManagement(db),r=await s.read(a,w,kind,automationId);if(r.version!==version)fail(409,'automation_changed','Reopen the current automation before changing it');
  if(kind==='research')return new AppMonitoring(db).control(a,w,automationId,version,enabled);
  return new AppActions(db).control(a,w,automationId,!enabled);
 });}
 async history(a:Actor,w:string,kind:'research'|'action',automationId:string,offset=0){await this.read(a,w,kind,automationId);
  if(kind==='research')return new AppMonitoring(this.db).runs(a,w,automationId,offset);
  // Summaries do not release historical record payloads or old execution prompts.
  const sql=`SELECT id,status,created_at AS started_at,finished_at FROM app_action_runs WHERE action_id=$1 AND user_id=$2 ORDER BY created_at DESC,id DESC LIMIT 21 OFFSET $3`;
  const rows=(await this.db.query(sql,[automationId,a.userId,offset])).rows;return {rows:rows.slice(0,20),nextOffset:rows.length>20?offset+20:null};
 }
}
