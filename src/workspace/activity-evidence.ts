import type {Database} from '../db/database.js';
import {type Actor,fail} from '../shared/schema.js';
import {typeAccess,visibleFields} from '../domain/permissions.js';
import {assertRecordScope} from '../domain/effective-access.js';
/** Add bounded, permission-filtered descriptions, never raw audit snapshots. */
export async function activityEvidence(db:Database,a:Actor,w:string,rows:any[],tables:any[],full=false){
 const ids=rows.filter(r=>!r.id.includes(':')).map(r=>r.id);if(!ids.length)return rows.map(r=>({...r,changed_fields:[],authorization_kind:'unrecorded',authorized_by:null}));
 const evidence=(await db.query(`SELECT e.id,rec.type_id,
 ARRAY(SELECT k FROM jsonb_object_keys(CASE WHEN jsonb_typeof(e.before_value->'data')='object' THEN e.before_value->'data' ELSE '{}'::jsonb END||CASE WHEN jsonb_typeof(e.after_value->'data')='object' THEN e.after_value->'data' ELSE '{}'::jsonb END) AS k WHERE (e.before_value->'data'->k) IS DISTINCT FROM (e.after_value->'data'->k)) AS fields,
 ARRAY(SELECT k FROM jsonb_object_keys(CASE WHEN jsonb_typeof(e.before_value)='object' THEN e.before_value ELSE '{}'::jsonb END||CASE WHEN jsonb_typeof(e.after_value)='object' THEN e.after_value ELSE '{}'::jsonb END) AS k WHERE (e.before_value->k) IS DISTINCT FROM (e.after_value->k)) AS attributes,
 coalesce(auth.value->>'kind',CASE WHEN cr.actor_id IS NOT NULL OR wr.user_id IS NOT NULL OR fr.user_id IS NOT NULL THEN 'approval' END) AS authorization_kind,
 coalesce(eg.user_id,ms.user_id,cr.actor_id,wr.user_id,fr.user_id) AS authorizer_id,
 coalesce(auth.value->>'id',cr.preview_id::text,wr.id::text,fr.id::text) AS authorization_id
 FROM audit_events e LEFT JOIN records rec ON rec.id=e.object_id AND rec.workspace_id=e.workspace_id
 LEFT JOIN LATERAL (SELECT coalesce(e.after_value->'authorization',
 (SELECT fc."authorization" FROM record_field_changes fc WHERE fc.workspace_id=e.workspace_id AND fc.record_id=e.object_id AND fc.created_at=e.created_at AND fc.actor_id=e.actor_id AND fc.before_value IS NOT DISTINCT FROM e.before_value->'data'->fc.field_key AND fc.after_value IS NOT DISTINCT FROM e.after_value->'data'->fc.field_key ORDER BY fc.id LIMIT 1)) AS value) auth ON true
 LEFT JOIN foundation_grants eg ON eg.workspace_id=e.workspace_id AND auth.value->>'kind'='execution_grant' AND eg.id::text=auth.value->>'id'
 LEFT JOIN maintenance_scopes ms ON ms.workspace_id=e.workspace_id AND auth.value->>'kind'='maintenance_grant' AND ms.id::text=auth.value->>'id'
 LEFT JOIN LATERAL (SELECT preview_id,actor_id FROM commit_receipts WHERE workspace_id=e.workspace_id AND (preview_id::text=auth.value->>'id' OR (auth.value IS NULL AND created_at=e.created_at AND actor_id=e.actor_id)) ORDER BY created_at,preview_id LIMIT 1) cr ON true
 LEFT JOIN LATERAL (SELECT id,user_id FROM workspace_receipts WHERE workspace_id=e.workspace_id AND (id::text=auth.value->>'id' OR (auth.value IS NULL AND created_at=e.created_at AND user_id=e.actor_id)) ORDER BY created_at,id LIMIT 1) wr ON true
 LEFT JOIN LATERAL (SELECT id,user_id FROM foundation_receipts WHERE workspace_id=e.workspace_id AND (id::text=auth.value->>'id' OR (auth.value IS NULL AND created_at=e.created_at AND user_id=e.actor_id)) ORDER BY created_at,id LIMIT 1) fr ON true
 WHERE e.workspace_id=$1 AND e.id=ANY($2::uuid[])`,[w,ids])).rows;
 const userIds=[...new Set(evidence.map(e=>e.authorizer_id).filter(Boolean))];const users=userIds.length?(await db.query('SELECT id,name FROM users WHERE id=ANY($1::uuid[])',[userIds])).rows:[];
 const labels:Record<string,string>={name:'Name',description:'Description',source:'Layout / code',manifest:'Connected fields',bindings:'Data sources',execution:'Actions',archived:'Archive status',state:'Record status',fields:'Table columns',allowed_users:'People with access',ai_enabled:'ChatGPT access',rules:'Access permissions',config:'Configuration',parent_id:'Project location',project_id:'Project',role:'Role',ai:'ChatGPT access',read:'View permission',write:'Edit permission'};
 const policies=new Map<string,ReturnType<typeof typeAccess>>();
 return Promise.all(rows.map(async r=>{const e=evidence.find(e=>e.id===r.id);if(!e)return {...r,changed_fields:[],authorization_kind:'unrecorded',authorized_by:null};let changed:string[]=[];let canReadChanges=false;
 if(e.type_id){try{if(!policies.has(e.type_id))policies.set(e.type_id,typeAccess(db,a,w,e.type_id));const {type,policy}=await policies.get(e.type_id)!;await assertRecordScope(db,policy,r.resource_id);canReadChanges=true;changed=(e.fields??[]).flatMap((key:string)=>{const field=visibleFields(type.fields,policy,a).find((f:any)=>f.key===key);return field?[field.name]:[];});}catch{} }
 else changed=(e.attributes??[]).flatMap((key:string)=>labels[key]?[labels[key]]:[]);
 return {...r,changed_fields:changed,has_change_values:(canReadChanges&&changed.length>0)||(!e.type_id&&full),authorization_kind:e.authorization_kind??(r.origin==='human'?'direct_action':'unrecorded'),authorized_by:users.find(u=>u.id===e.authorizer_id)?.name??(r.origin==='human'&&!e.authorization_kind?r.actor_name:null),authorized_by_id:e.authorizer_id??(r.origin==='human'&&!e.authorization_kind?r.actor_id:null),authorization_id:e.authorization_id??null};}));
}
export async function recordEventChanges(db:Database,a:Actor,w:string,eventId:string,full=false){
 const event=(await db.query("SELECT action,object_id,before_value,after_value,before_value->'data' AS before_data,after_value->'data' AS after_data FROM audit_events WHERE workspace_id=$1 AND id=$2",[w,eventId])).rows[0];if(!event)fail(404,'not_found','Event unavailable');
 const record=(await db.query('SELECT type_id FROM records WHERE workspace_id=$1 AND id=$2',[w,event.object_id])).rows[0];if(!record){
  if(!full)return {changes:[]};const before=event.before_value??{},after=event.after_value??{};const value=(v:any)=>({text:v===undefined?'Not recorded':String(v).slice(0,500),truncated:String(v??'').length>500});
  const labels:Record<string,string>={name:'Name',description:'Description',state:'Status',role:'Role',enabled:'Enabled',ai:'ChatGPT access',archived:'Archived',databaseBrowse:'Browse database',directData:'Direct data access',chatgpt:'ChatGPT access'};
  const changes=Object.entries(labels).filter(([key])=>(typeof after[key]==='string'||typeof after[key]==='boolean'||typeof before[key]==='string'||typeof before[key]==='boolean')&&before[key]!==after[key]).map(([key,field])=>({field,before:value(before[key]),after:value(after[key])}));
  if(event.action==='access.policy_changed'&&after.rule){const r=after.rule,old=(before.rules??[]).find((v:any)=>v.subject===r.subject&&v.kind===r.kind&&v.resourceId===r.resourceId&&v.field===r.field);const person=r.subject==='chatgpt'?'ChatGPT':(await db.query('SELECT name FROM users WHERE id::text=$1',[r.subject])).rows[0]?.name??'User';const resource=(await db.query('SELECT name FROM entity_types WHERE workspace_id=$1 AND id::text=$2 UNION ALL SELECT name FROM workspace_components WHERE workspace_id=$1 AND id::text=$2 UNION ALL SELECT name FROM workspace_nodes WHERE workspace_id=$1 AND id::text=$2',[w,r.resourceId])).rows[0]?.name??r.kind;for(const [key,label] of [['read','Can view'],['write','Can edit']])if((old?.[key]??'inherit')!==r[key])changes.push({field:`${person} · ${resource}${r.field?' / '+r.field:''} · ${label}`,before:value(old?.[key]??'inherit'),after:value(r[key])});}
  return {changes};
 }

 const {type,policy}=await typeAccess(db,a,w,record.type_id);await assertRecordScope(db,policy,event.object_id);
 const before=event.before_data??{},after=event.after_data??{};const text=(value:any)=>{const full=typeof value==='string'?value:JSON.stringify(value);return {text:full?.slice(0,500)??'null',truncated:(full?.length??0)>500};};
 return {changes:visibleFields(type.fields,policy,a).filter(f=>JSON.stringify(before[f.key])!==JSON.stringify(after[f.key])).map(f=>({field:f.name,before:Object.hasOwn(before,f.key)?text(before[f.key]):{text:'Not set',truncated:false},after:Object.hasOwn(after,f.key)?text(after[f.key]):{text:'Not set',truncated:false}}))};
}
