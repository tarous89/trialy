import {z} from 'zod';
import type {Database} from '../db/database.js';
import {id,fail,type Actor} from '../shared/schema.js';
import {requireHuman} from '../domain/write-authorization.js';
import {access} from '../domain/permissions.js';
import {AppMonitoring} from '../app-services/monitoring.js';
import {AppActions} from '../app-services/service.js';
import {WorkspaceFoundation} from '../workspace/service.js';
import {appUrl} from '../shared/app-route.js';
import {adapter,AutomationService} from './service.js';
export const automationKind=z.enum(['research','action']);
export const automationList=z.object({appId:id.optional(),query:z.string().max(100).default(''),executor:z.enum(['all','chatgpt','trialagents']).default('all'),state:z.enum(['all','enabled','disabled']).default('all'),offset:z.number().int().min(0).max(100000).default(0)}).strict();
/** Management adapter over the existing stores. Never called by the app runtime. */
export class AutomationManagement{
 constructor(readonly db:Database){}
 async owner(a:Actor,w:string){const p=await access(this.db,a,w);if(p.role!=='owner')fail(403,'owner_required','Only the owner can manage app automations');}
 async list(a:Actor,w:string,input:unknown){await this.owner(a,w);const v=automationList.parse(input);
  const rows=(await this.db.query(`SELECT d.*,c.name AS app_name,c.archived AS app_archived FROM (
   SELECT m.id,m.app_id,m.workspace_id,m.user_id,m.version,'research' AS kind,'chatgpt' AS executor,m.config->>'name' AS name,m.enabled,m.config->>'expiresAt' AS expires_at,coalesce(m.config->'automation'->'trigger',m.config->'schedule') AS trigger,d.next_at,d.last_success_at,d.diagnostic,m.created_at,
    (SELECT status FROM app_monitor_runs r WHERE r.monitor_id=m.id ORDER BY started_at DESC,id DESC LIMIT 1) AS last_status,m.config->'automation'->>'runnerId' AS runner_id
   FROM app_monitors m LEFT JOIN automation_dispatch d ON d.monitor_id=m.id
   UNION ALL
   SELECT a.id,a.app_id,a.workspace_id,a.user_id,a.version,'action','trialagents',a.config->>'name',NOT a.paused,a.config->>'expiresAt',a.config->'trigger',a.next_at,NULL,a.last_error,a.created_at,
    (SELECT status FROM app_action_runs r WHERE r.action_id=a.id ORDER BY created_at DESC,id DESC LIMIT 1),NULL
   FROM app_actions a
  ) d JOIN workspace_components c ON c.id=d.app_id AND c.workspace_id=d.workspace_id
  WHERE d.workspace_id=$1 AND d.user_id=$2 AND ($3::uuid IS NULL OR d.app_id=$3)
   AND ($4='' OR position(lower($4) in lower(d.name||' '||c.name))>0)
   AND ($5='all' OR d.executor=$5) AND ($6='all' OR d.enabled=($6='enabled'))
  ORDER BY d.created_at,d.id LIMIT 21 OFFSET $7`,[w,a.userId,v.appId??null,v.query,v.executor,v.state,v.offset])).rows;
  let connection:any=null;if(rows.some(r=>r.runner_id)){try{connection=await new AutomationService(this.db).setup(a,w);}catch{connection={state:'unavailable'};}}
  const visible=[];for(const row of rows.slice(0,20)){try{const c=await new WorkspaceFoundation(this.db).component(this.db,a,w,row.app_id,false);visible.push({...row,app_archived:c.archived||c.project_archived,connectionState:row.kind==='research'?(row.runner_id?connection?.state??'unavailable':'legacy_unverified'):null});}catch(e){if(![403,404].includes((e as any).status))throw e;}}
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
