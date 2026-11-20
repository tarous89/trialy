import {z} from 'zod';
import type {Database} from '../db/database.js';
import {AppError,fail,id,type Actor,type Field} from '../shared/schema.js';
import {access,typeAccess,visibleFields} from './permissions.js';
import {assertRecordScope} from './effective-access.js';
import {appRole} from './app-roles.js';

/**
 * A7: the log of one app, for its owners. What happened in the app and to it: saves, access and sharing,
 * records changed from inside it, and its automations. Read-only (A10): nothing here restores anything.
 *
 * Values: only record changes carry values, and only for the fields the reader may read today, decided by the
 * same checks as record history (typeAccess, record scope, visibleFields). Every other entry is who, what and
 * when. Saved code, settings, automation instructions and run results never leave the database row.
 */
export const appLogQuery=z.object({offset:z.number().int().min(0).max(100000).default(0),limit:z.number().int().min(1).max(100).default(25)}).strict();
const J=JSON.stringify,quote=(name:unknown)=>typeof name==='string'&&name.trim()?`“${name.trim().slice(0,80)}”`:'an automation';
const ROLE:Record<string,string>={owner:'an owner',editor:'an editor',viewer:'a viewer'};
const RECORD:Record<string,string>={'record.created':'Added a record','record.updated':'Changed a record','record.reversed':'Changed a record','record.deleted':'Deleted a record','record.archived':'Archived a record','record.in_review':'Sent a record for review','record.approved':'Approved a record','record.changes_requested':'Asked for changes to a record','record.migrated':'Updated a record after a table change','record.creation_archived':'Removed a newly added record','record.creation_restored':'Brought back a removed record'};
const APP:Record<string,string>={'workspace.copy_component':'Created the app as a copy','workspace.move_component':'Moved the app','tool.moved':'Moved the app','workspace.archive_component':'Archived the app','workspace.restore_archived_component':'Restored the app','workspace.set_component_access':'Changed who can open the app','app.shared':'Shared the app','component.project_archived':'The project of this app was archived','component.records_applied':'Saved records from the app','app.command':'Ran a command in the app','workspace.data_access_step':'Changed which tables the app uses','workspace.integration_source':'Changed where the app gets its information','function.saved':'Saved an automation step for the app','automation_recipe.approved':'Approved an automation for the app','automation.test_requested':'Started a test run of an automation'};
const RUN:Record<string,string>={succeeded:'finished',completed:'finished',no_update:'finished with nothing new',partial:'finished in part',failed:'failed',blocked:'could not run',cancelled:'was stopped',unknown:'ended without a clear result'};
const text=(value:unknown)=>{const full=typeof value==='string'?value:J(value);return {text:full?.slice(0,500)??'null',truncated:(full?.length??0)>500};};
/** One plain line. Built from the action and a few named facts, never from saved code, settings or record values. */
function describe(r:any,people:Map<string,string>,table:string|null){
 const f=r.facts??{},where=table?` in ${table}`:'';
 if(r.run_status)return `${quote(r.run_name)} ${RUN[r.run_status]??'started'}`;
 if(r.action.startsWith('record.'))return (RECORD[r.action]??'Changed a record')+where;
 if(r.action==='workspace.save_component'||r.action==='workspace.create_tracker')return f.created?'Created the app':'Saved a new version of the app';
 if(r.action==='app.role_changed'){const who=people.get(f.userId)??'someone';return f.role==='none'?`Removed ${who}’s access`:ROLE[f.role]?`Made ${who} ${ROLE[f.role]}`:`Changed ${who}’s role`;}
 if(r.action==='app.team_default_changed')return f.teamDefault==='none'?'Set the team default to no access':f.teamDefault==='viewer'?'Set the team default to Viewer':'Set the team default to Editor';
 if(r.action==='monitoring.authorized'||r.action==='app_action.authorized')return `Set up ${quote(f.configName??f.name)}`;
 if(r.action==='monitoring.copied'||r.action==='app_action.copied')return `Copied ${quote(f.name)} with the app, switched off`;
 if(r.action==='monitoring.controlled')return f.enabled?'Switched an automation on':'Switched an automation off';
 if(r.action==='app_action.paused')return f.paused?'Switched an automation off':'Switched an automation on';
 if(r.action==='automation.archived_with_app')return `Switched ${quote(f.name)} off because the app was archived`;
 if(r.action==='automation.restored_disabled')return `Brought ${quote(f.name)} back, switched off`;
 return APP[r.action]??(r.action.startsWith('monitoring.')||r.action.startsWith('app_action.')?'Changed an automation':'Made a change in the app');
}

export class AppLogs{
 constructor(readonly db:Database){}

 /** Newest first. Only an owner of the app (an organization owner owns every app) may read it. */
 async appLog(a:Actor,w:string,appId:string,input:unknown={}){
  const q=appLogQuery.parse(input??{}),p=await access(this.db,a,w),role=await appRole(this.db,a,p,appId);
  if(!role)fail(404,'not_found','App unavailable');if(role!=='owner')fail(403,'app_owner_required','Only an owner of this app can see its activity');
  const c=(await this.db.query('SELECT id,name FROM workspace_components WHERE id=$1 AND workspace_id=$2 AND deleted_at IS NULL',[appId,w])).rows[0];if(!c)fail(404,'not_found','App unavailable');
  // Entries of this app: about the app itself, written from inside it, or about one of its automations.
  // Row security lets only the person who set up a research automation or an email step read its rows
  // (monitor_scope, migration 047; notification_owner, migration 051), so their switches and runs show for
  // that person alone until automations move to the app's owners (package 6.1).
  const rows=(await this.db.query(`SELECT l.*,u.name AS actor_name FROM (
   SELECT e.id::text AS id,e.created_at,e.actor_id,e.action,e.object_id,e.origin,rec.type_id,
    CASE WHEN e.action LIKE 'record.%' THEN e.before_value->'data' END AS before_data,CASE WHEN e.action LIKE 'record.%' THEN e.after_value->'data' END AS after_data,
    jsonb_build_object('created',e.before_value IS NULL OR e.before_value='null'::jsonb,'role',e.after_value->'role','userId',e.after_value->'userId','teamDefault',e.after_value->'teamDefault','name',e.after_value->'name','configName',e.after_value->'config'->'name','paused',e.after_value->'paused','enabled',e.after_value->'enabled') AS facts,
    NULL::text AS run_status,NULL::text AS run_name
   FROM audit_events e LEFT JOIN records rec ON rec.id=e.object_id AND rec.workspace_id=e.workspace_id
   WHERE e.workspace_id=$1 AND e.action NOT IN ('monitoring.started','monitoring.finished','monitoring.test_finished')
    AND (e.object_id=$2 OR e.after_value->>'componentId'=$2::text OR e.after_value->>'appId'=$2::text OR e.after_value->'config'->>'appId'=$2::text
     OR EXISTS(SELECT 1 FROM app_actions j WHERE j.id=e.object_id AND j.workspace_id=e.workspace_id AND j.app_id=$2)
     OR EXISTS(SELECT 1 FROM app_monitors m WHERE m.id=e.object_id AND m.workspace_id=e.workspace_id AND m.app_id=$2))
   UNION ALL
   SELECT 'run:'||r.id::text,r.created_at,r.user_id,'automation.run',j.id,'worker',NULL::uuid,NULL::jsonb,NULL::jsonb,NULL::jsonb,r.status,j.config->>'name'
   FROM app_action_runs r JOIN app_actions j ON j.id=r.action_id AND j.workspace_id=r.workspace_id WHERE r.workspace_id=$1 AND j.app_id=$2
   UNION ALL
   SELECT 'research:'||r.id::text,r.started_at,r.user_id,'automation.run',m.id,'worker',NULL::uuid,NULL::jsonb,NULL::jsonb,NULL::jsonb,r.status,m.config->>'name'
   FROM app_monitor_runs r JOIN app_monitors m ON m.id=r.monitor_id AND m.workspace_id=r.workspace_id WHERE r.workspace_id=$1 AND m.app_id=$2
   UNION ALL
   SELECT 'email:'||b.id::text,b.created_at,b.user_id,'automation.run',j.id,'worker',NULL::uuid,NULL::jsonb,NULL::jsonb,NULL::jsonb,b.status,j.config->>'name'
   FROM app_notification_batches b JOIN app_actions j ON j.id=b.action_id AND j.workspace_id=b.workspace_id WHERE b.workspace_id=$1 AND b.app_id=$2
  ) l JOIN users u ON u.id=l.actor_id ORDER BY l.created_at DESC,l.id DESC LIMIT $3 OFFSET $4`,[w,appId,q.limit+1,q.offset])).rows;
  const page=rows.slice(0,q.limit),ids=[...new Set(page.map(r=>r.facts?.userId).filter((v:unknown)=>typeof v==='string'&&id.safeParse(v).success))];
  const people=new Map<string,string>(ids.length?(await this.db.query('SELECT id,name FROM users WHERE id=ANY($1::uuid[])',[ids])).rows.map((u:any)=>[u.id,u.name]):[]);
  // Today's table permissions decide what an old entry may show. A table the reader cannot read gives no values and no table name.
  const tables=new Map<string,Promise<{type:any;policy:any}|null>>();
  const readable=(typeId:string)=>{if(!tables.has(typeId))tables.set(typeId,typeAccess(this.db,a,w,typeId).catch(e=>{if(e instanceof AppError)return null;throw e;}));return tables.get(typeId)!;};
  const result=[];for(const r of page){
   let table:string|null=null,changes:any[]|undefined;
   if(r.type_id&&r.action.startsWith('record.')){const t=await readable(r.type_id);
    if(t)try{await assertRecordScope(this.db,t.policy,r.object_id);const before=r.before_data??{},after=r.after_data??{};table=t.type.name;
     changes=visibleFields(t.type.fields as Field[],t.policy,a).filter(f=>J(before[f.key])!==J(after[f.key])).map(f=>({field:f.name,before:Object.hasOwn(before,f.key)?text(before[f.key]):{text:'Not set',truncated:false},after:Object.hasOwn(after,f.key)?text(after[f.key]):{text:'Not set',truncated:false}}));
    }catch(e){if(!(e instanceof AppError))throw e;table=null;changes=undefined;}}
   result.push({id:r.id,at:r.created_at,actorId:r.actor_id,actorName:r.actor_name,origin:r.origin,action:r.action,description:describe(r,people,table),...(changes?.length?{changes}:{})});
  }
  return {appId,name:c.name,rows:result,nextOffset:rows.length>q.limit?q.offset+q.limit:null};
 }
}
