import type {Database} from '../db/database.js';

export type AutomationServiceLabel={id:string;name:string};
/** Configuration metadata only: never return action parameters, recipients or credentials. */
export async function automationDependencies(db:Database,workspaceId:string,userId:string){
 const definitions=(await db.query(`SELECT id,app_id,version,'research' AS kind,config->>'name' AS name,enabled,
  config->'automation'->>'runnerId' AS runner_id,config->'automation'->>'completionActionId' AS followup_id,NULL::jsonb AS steps,NULL::jsonb AS trigger
  FROM app_monitors WHERE deleted_at IS NULL AND workspace_id=$1 AND user_id=$2
  UNION ALL SELECT id,app_id,version,'action',config->>'name',NOT paused,NULL,NULL,config->'steps',config->'trigger'
  FROM app_actions WHERE deleted_at IS NULL AND workspace_id=$1 AND user_id=$2 ORDER BY kind,id`,[workspaceId,userId])).rows;
 const connectorIds=[...new Set(definitions.flatMap(d=>(d.steps??[]).filter((s:any)=>s.kind==='connector').map((s:any)=>s.connectionId)))];
 const connectors=connectorIds.length?(await db.query('SELECT id,config->>\'name\' AS name FROM connectors WHERE workspace_id=$1 AND id=ANY($2::uuid[])',[workspaceId,connectorIds])).rows:[];
 const chatgpt={id:'chatgpt',name:'ChatGPT Work'};
 const stepServices=(d:any):AutomationServiceLabel[]=> (d?.steps??[]).map((s:any)=>s.kind==='email'?{id:'email',name:'Email'}:s.kind==='connector'?{id:s.connectionId,name:connectors.find(c=>c.id===s.connectionId)?.name??'Unavailable connector'}:{id:'trialagents',name:'TrialAgents'});
 return definitions.map(d=>{
  const parents=d.kind==='research'?[d]:definitions.filter(m=>m.kind==='research'&&(m.followup_id===d.id||d.trigger?.source==='automation_runs'&&d.trigger.automationId===m.id));
  const source=d.trigger?.source==='automation_runs'?definitions.find(m=>m.kind==='research'&&m.id===d.trigger.automationId):null;
  const blockedReason=d.trigger?.source==='automation_runs'?(!source||source.version!==d.trigger.automationVersion?'Research changed. Edit this email automation to select the updated research, save, then enable it.':!source.enabled?'The source research automation is disabled.':null):null;
  const services=d.kind==='research'?[chatgpt,...stepServices(definitions.find(a=>a.id===d.followup_id))]:[...parents.map(()=>chatgpt),...stepServices(d)];
  return {id:d.id,appId:d.app_id,version:d.version,kind:d.kind,name:d.name,enabled:d.enabled,blockedReason,
   runnerIds:[...new Set(parents.map(m=>m.runner_id).filter(Boolean))],services:[...new Map(services.map(s=>[s.id,s])).values()]};
 });
}
