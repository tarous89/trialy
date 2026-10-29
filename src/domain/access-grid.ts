import {withReadMetadata} from '../db/read-metadata.js';
import {Foundation} from '../foundation/service.js';
import {randomUUID,createHash} from 'node:crypto';
import {z} from 'zod';
import type {Database} from '../db/database.js';
import {id,fail,type Actor} from '../shared/schema.js';
import {access,visibleFields} from './permissions.js';
import {rulesFor,resourceGrant,toolPolicy,workflowGrant} from './effective-access.js';
import {AccessManagement} from './access-management.js';
import {Service} from './service.js';
import {WorkspaceFoundation} from '../workspace/service.js';
export const gridChange=z.object({subject:z.union([id,z.literal('all'),z.literal('chatgpt')]),kind:z.enum(['project','tool','database','table','column','workflow','connection']),resourceId:id,field:z.string().max(64).optional(),read:z.boolean(),write:z.boolean()}).strict().refine(v=>v.read||!v.write,{message:'Editing requires viewing'});
export const gridBatch=z.object({expectedVersion:z.number().int().min(0),changes:z.array(gridChange).min(1).max(200)}).strict();
export type GridChange=z.infer<typeof gridChange>;
type State=boolean|'mixed';
const combine=(values:State[]):State=>!values.length?false:values.every(v=>v===true)?true:values.every(v=>v===false)?false:'mixed';
export const rowKey=(kind:string,id:string,field?:string)=>[kind,id,field??''].join(':');
export class AccessGrid{
 constructor(private db:Database){}
 async directory(a:Actor){const result=[];for(const w of await new Service(this.db).workspaces(a)){const p=await access(this.db,a,w.id);result.push({id:w.id,name:w.name,owned:p.role==='owner'});}return {workspaces:result};}
 async read(a:Actor,w:string,subject=a.userId){return withReadMetadata(this.db,db=>new AccessGrid(db).readGrid(a,w,subject));}
 private async readGrid(a:Actor,w:string,subject=a.userId){
  const p=await access(this.db,a,w),manage=p.role==='owner',am=new AccessManagement(this.db);
  const overview=await am.overview(a,w),f=new WorkspaceFoundation(this.db);
  const people=manage?overview.people:[{id:a.userId,name:'You',role:p.role}];
  if(!manage&&subject!=='all'&&subject!==a.userId)fail(403,'owner_required','Only your own access is visible');
  if(manage&&subject!=='all'&&subject!=='chatgpt'&&!people.some(x=>x.id===subject))fail(404,'not_found','Person unavailable');
  const selected=subject==='chatgpt'?['chatgpt']:subject==='all'?(people.filter(x=>x.role!=='owner').length?people.filter(x=>x.role!=='owner'):people).map(x=>x.id):[subject];
  const trees=await f.nodes(a,w),components=await f.components(a,w);
  const projects=trees.nodes.filter(n=>!n.effective_archived),tools=components.filter(c=>!c.archived&&!c.project_archived);
  const workflows=(await this.db.query("SELECT id,name,user_id AS creator,'function' AS source FROM foundation_functions WHERE workspace_id=$1 UNION ALL SELECT id,name,owner_id,'legacy' FROM automations WHERE workspace_id=$1 ORDER BY name",[w])).rows;
  const subjects:any[]=[];
  for(const s of selected){
   const actor:Actor={userId:s==='chatgpt'?a.userId:s,origin:s==='chatgpt'||!manage&&a.origin==='ai'?'ai':'human'};
   // Human policy allows owners to inspect an explicitly disabled connection without enabling it.
   const policy=await access(this.db,{...actor,origin:'human'},w),blocked=actor.origin==='ai'&&(!policy.ai_enabled||(policy.role!=='owner'&&!policy.user_ai));
   const explanation=await am.explain(a,w,s==='chatgpt'?'chatgpt':s),rows:any[]=[];
   const add=(kind:string,resourceId:string,name:string,read:State,write:State,extra:any={})=>rows.push({key:rowKey(kind,resourceId,extra.field),kind,resourceId,name,read:blocked?false:read,write:blocked?false:write,canChange:manage&&(s==='chatgpt'||policy.role!=='owner'),canChangeWrite:policy.role!=='inspector'&&(policy.role!=='viewer'||['project','tool','connection'].includes(kind)),...extra});
   for(const c of tools){let read=false,write=false;try{const t=await toolPolicy(this.db,actor,policy,c.id);read=t.grant.read;write=t.grant.write;if(c.bindings.length){const exposed=explanation.tables.flatMap((t:any)=>t.fields.flatMap((field:any)=>field.sources.filter((x:any)=>x.id===c.id)));read=read&&exposed.length>0;write=write&&exposed.some((x:any)=>x.write);}}catch{}add('tool',c.id,c.name,read,write,{parentId:c.project_id});}
   for(const project of projects){const parents:string[]=[];let n=projects.find(x=>x.id===project.parent_id);while(n&&!parents.includes(n.id)){parents.push(n.id);n=projects.find(x=>x.id===n.parent_id);}const grant=resourceGrant(policy,actor,'project',project.id,parents);const children=rows.filter(r=>r.kind==='tool'&&r.parentId===project.id);add('project',project.id,project.name,children.length?combine(children.map(r=>r.read)):grant.read,children.length?combine(children.map(r=>r.write)):grant.write,{parentId:project.parent_id});}
   for(const table of explanation.tables){for(const field of table.fields)add('column',table.id,field.name,field.read,field.write,{field:field.key,parentId:table.id,sources:field.sources});add('table',table.id,table.name,combine(table.fields.map((x:any)=>x.read)),combine(table.fields.map((x:any)=>x.write)),{parentId:w});}
   const tables=rows.filter(r=>r.kind==='table');add('database',w,'Database',tables.length?combine(tables.map(r=>r.read)):policy.direct_data!==false,tables.length?combine(tables.map(r=>r.write)):policy.direct_data!==false&&!['viewer','inspector'].includes(policy.role));
   for(const workflow of workflows){const workflowActor={...actor,origin:'ai' as const},grant=workflowGrant(policy,workflowActor,workflow);if(grant.read){try{if(workflow.source==='function'){const revision=(await this.db.query('SELECT id FROM foundation_revisions WHERE function_id=$1 ORDER BY version DESC LIMIT 1',[workflow.id])).rows[0];if(!revision)throw Error('No revision');await new Foundation(this.db).revision(workflowActor,w,revision.id);}else if(!(await new Service(this.db).automations(actor,w)).some(r=>r.id===workflow.id))throw Error('Unavailable');}catch{grant.read=false;grant.write=false;}}add('workflow',workflow.id,workflow.name,grant.read,grant.write,{source:workflow.source,canChange:manage&&(s==='chatgpt'||policy.role!=='owner')&&(workflow.creator===actor.userId),hint:workflow.creator===actor.userId?'Workflow data restrictions still apply.':'Private to its creator'});}
   if(manage)add('connection',w,'ChatGPT',s==='chatgpt'?policy.ai_enabled:policy.ai_enabled&&(policy.role==='owner'||policy.user_ai),(s==='chatgpt'?policy.ai_enabled:policy.ai_enabled&&(policy.role==='owner'||policy.user_ai))&&!rulesFor(policy,{...actor,origin:'ai'}).some(r=>r.kind==='connection'&&r.write==='deny'),{canChange:s==='chatgpt'||!['owner','inspector'].includes(policy.role)});
   subjects.push({id:s,rows,restrictions:rulesFor(policy,actor).filter(r=>r.read==='deny'||r.write==='deny').map(r=>({key:rowKey(r.kind,r.resourceId,r.field),read:r.read==='deny',write:r.read==='deny'||r.write==='deny'}))});
  }
  const keys=[...new Set(subjects.flatMap(s=>s.rows.map((r:any)=>r.key)))];
  const rows=keys.map(key=>{const group=subjects.map(s=>s.rows.find((r:any)=>r.key===key)).filter(Boolean);const row={...group[0],read:combine(group.map(r=>r.read)),write:combine(group.map(r=>r.write)),canChange:group.some(r=>r.canChange),canChangeWrite:group.every(r=>r.canChangeWrite),sources:group.flatMap(r=>r.sources??[])};return row;}).filter(row=>manage||row.read!==false);
  return {workspaceId:w,name:p.name,version:p.access_version,canManage:manage,subject:manage?subject:a.userId,people:manage?people:[],restrictions:manage?subjects.flatMap(s=>s.restrictions):[],connections:manage?overview.connections:[],rows,tools:manage?tools.map(c=>({id:c.id,name:c.name,bindings:c.bindings})):[],message:manage?null:'You can use shared resources according to these permissions. Only the owner can change access.'};
 }
 async expand(a:Actor,w:string,input:unknown){const batch=gridBatch.parse(input),p=await access(this.db,a,w);if(p.role!=='owner')fail(403,'owner_required','Only the account owner can change access');if(p.access_version!==batch.expectedVersion)fail(409,'access_changed','Access changed. Refresh before saving.');const people=(await new AccessManagement(this.db).overview(a,w)).people.filter(x=>x.role!=='owner');const changes=batch.changes.flatMap(c=>c.subject==='all'?people.map(person=>({...c,subject:person.id})):[c]);if(!changes.length)fail(400,'no_people','There are no other users to update');if(changes.length>1000)fail(400,'change_limit','Select fewer users or rows');return {batch,changes,people};}
 async prepare(a:Actor,w:string,input:unknown){const {batch}=await this.expand(a,w,input);await this.db.query('DELETE FROM workspace_previews WHERE user_id=$1 AND expires_at<now()',[a.userId]);if(Number((await this.db.query('SELECT count(*) AS n FROM workspace_previews WHERE user_id=$1',[a.userId])).rows[0].n)>=50)fail(429,'preview_limit','Too many pending previews');const reviewId=randomUUID(),body=JSON.stringify({operation:{kind:'access_grid'},batch}),digest=createHash('sha256').update(body).digest('hex');await this.db.query('INSERT INTO workspace_previews(id,workspace_id,user_id,body,digest) VALUES($1,$2,$3,$4,$5)',[reviewId,w,a.userId,body,digest]);return {reviewId};}
 async draft(a:Actor,w:string,reviewId:string){const p=await access(this.db,a,w);if(p.role!=='owner')fail(403,'owner_required','Only the owner can review access');const r=(await this.db.query("SELECT body FROM workspace_previews WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND expires_at>now()",[reviewId,w,a.userId])).rows[0];if(!r||r.body.operation?.kind!=='access_grid')fail(404,'not_found','Access review expired or unavailable');return gridBatch.parse(r.body.batch);}
 async save(a:Actor,w:string,input:unknown){if(a.origin!=='human')fail(403,'human_required','Save changes in your signed-in owner session');return this.db.transaction(async tx=>{await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const db:Database={query:tx.query.bind(tx),transaction:fn=>fn(tx),close:async()=>{}},grid=new AccessGrid(db),{batch,changes,people}=await grid.expand(a,w,input),am=new AccessManagement(db);let version=batch.expectedVersion;
  for(const c of changes){const person=people.find(p=>p.id===c.subject);if(c.kind==='connection'){if(c.resourceId!==w)fail(400,'invalid_resource','Connection is outside this workspace');const r=await am.update(a,w,{expectedVersion:version,subject:c.subject,chatgpt:c.read});version=r.version;const limits=await am.update(a,w,{expectedVersion:version,subject:c.subject,rule:{kind:'connection',resourceId:w,read:'inherit',write:c.write?'inherit':'deny'}});version=limits.version;continue;}
   // Connection checkmarks restore inheritance; they never create an independent grant.
   const rule={kind:c.kind,resourceId:c.resourceId,...(c.field?{field:c.field}:{}),read:c.read?(c.subject==='chatgpt'?'inherit':'allow'):'deny',write:c.write?(c.subject==='chatgpt'?'inherit':'allow'):'deny'};
   if(c.write&&person?.role==='inspector')fail(403,'read_only_role','Inspectors are read-only');
   if(c.write&&person?.role==='viewer'&&['database','table','column','workflow'].includes(c.kind))fail(403,'editor_required','Direct database and workflow editing requires the Editor role');
   const r=await am.update(a,w,{expectedVersion:version,subject:c.subject,rule,...(c.kind==='database'&&c.read&&c.subject!=='chatgpt'?{databaseBrowse:true}:{})});version=r.version;
  }return {saved:true,version};
 });}
}
