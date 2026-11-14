import {randomUUID} from 'node:crypto';
import type {Connection} from '../db/database.js';
import {access} from '../domain/permissions.js';
import {audit} from '../domain/evidence.js';
import {fail,type Actor} from '../shared/schema.js';
import {syncDispatch} from './service.js';
import {recipeDigest} from './recipes.js';
import {nextAction} from '../app-services/service.js';
import {monitoringConfig} from '../app-services/monitoring-schema.js';
import {actionConfig} from '../app-services/schema.js';

/** Snapshot definitions only. Runs, external tasks, deliveries and approvals are never copied. */
export async function appAutomationCopies(tx:Connection,a:Actor,w:string,appId:string){
 if((await access(tx,a,w,true)).role!=='owner')fail(403,'owner_required','Only the owner can include automations when duplicating an app');
 const research=(await tx.query('SELECT id,version,config,scope_stamp,enabled,assistant FROM app_monitors WHERE deleted_at IS NULL AND workspace_id=$1 AND user_id=$2 AND app_id=$3 ORDER BY id',[w,a.userId,appId])).rows;
 const actions=(await tx.query('SELECT id,version,config,scope_stamp,paused,assistant,follow_up_of FROM app_actions WHERE deleted_at IS NULL AND workspace_id=$1 AND user_id=$2 AND app_id=$3 ORDER BY id',[w,a.userId,appId])).rows;
 const total=Number((await tx.query('SELECT count(*) AS n FROM app_monitors WHERE deleted_at IS NULL AND workspace_id=$1 AND user_id=$2',[w,a.userId])).rows[0].n);
 if(total+research.length>100)fail(409,'monitoring_limit','Copying these automations would exceed the 100 research automation limit. Duplicate without automations or reduce the existing definitions.');
 return {research,actions};
}

export async function copyAppAutomations(tx:Connection,a:Actor,w:string,appId:string,snapshot:Awaited<ReturnType<typeof appAutomationCopies>>){
 const policy=await access(tx,a,w,true);
 const ids=new Map([...snapshot.research,...snapshot.actions].map(row=>[row.id,randomUUID()]));
 const linkedId=(old:string)=>{const id=ids.get(old);if(!id)fail(409,'automation_copy_link','An automation references a definition outside this app. Review the source automation before copying it.');return id;};
 for(const row of snapshot.research){
  const config=monitoringConfig.parse({...row.config,appId});
  // Result grants belong to the original automation; copying never copies authority.
  if(config.storeResults){config.writeScopes=[];delete config.writeBindings;}
  if(config.automation?.completionActionId){config.automation.completionActionId=linkedId(config.automation.completionActionId);config.automation.completionActionVersion=0;}
  const id=ids.get(row.id)!;
  await tx.query('INSERT INTO app_monitors(id,workspace_id,user_id,app_id,config,scope_stamp,enabled,assistant) VALUES($1,$2,$3,$4,$5,$6,false,$7)',[id,w,a.userId,appId,JSON.stringify(config),row.scope_stamp,row.assistant]);
  // A fresh dispatch starts from the copied schedule, never the original run cursor.
  await syncDispatch(tx,a,w,id,0,config);
  await audit(tx,a,policy,'monitoring.copied',id,null,{...config,version:0,enabled:false,copiedFrom:{id:row.id,version:row.version}});
 }
 for(const row of snapshot.actions){
  const config=actionConfig.parse({...row.config,appId,appVersion:0});
  if(config.trigger.kind==='database'&&config.trigger.source==='automation_runs'){config.trigger.automationId=linkedId(config.trigger.automationId!);config.trigger.automationVersion=0;}
  await tx.query(`INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,scope_stamp,paused,next_at,approved_by,event_cursor,assistant,follow_up_of)
   VALUES($1,$2,$3,$4,$5,$6,true,$7,$3,(SELECT coalesce(max(event_sequence),0) FROM audit_events WHERE workspace_id=$2),$8,$9)`,[ids.get(row.id),w,a.userId,appId,JSON.stringify(config),row.scope_stamp,nextAction(config),row.assistant,row.follow_up_of?linkedId(row.follow_up_of):null]);
  await audit(tx,a,policy,'app_action.copied',ids.get(row.id)!,null,{...config,version:0,paused:true,copiedFrom:{id:row.id,version:row.version}});
 }
 for(const [oldId,newId] of ids){const setups=(await tx.query('SELECT * FROM automation_recipe_setups WHERE workspace_id=$1 AND user_id=$2 AND definition_id=$3',[w,a.userId,oldId])).rows;for(const setup of setups){const body={...setup.body,copiedFrom:{appId:setup.app_id,setupId:setup.id}};const followUp=setup.follow_up_id?ids.get(setup.follow_up_id)??null:null;await tx.query("INSERT INTO automation_recipe_setups(id,workspace_id,user_id,app_id,recipe_key,context_key,body,digest,status,definition_id,definition_kind,definition_version,diagnostic,assistant,follow_up_id,follow_up_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10,0,'copied_disabled',$11,$12,$13)",[randomUUID(),w,a.userId,appId,setup.recipe_key,setup.context_key,JSON.stringify(body),recipeDigest(body),newId,setup.definition_kind,setup.assistant,followUp,followUp?0:null]);}}
 return {research:snapshot.research.length,actions:snapshot.actions.length,enabled:false};
}
