import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Connection,Database} from '../db/database.js';
import {audit} from '../domain/evidence.js';
import {access,typeAccess} from '../domain/permissions.js';
import {markAppTables} from '../domain/effective-access.js';
import {Service} from '../domain/service.js';
import {fail,id,type Actor} from '../shared/schema.js';
import type {WorkspaceFoundation} from './service.js';

/**
 * I2, I3, I5, A1 (package 3.3, with 3.5 table connections): the one installation popup for every new app.
 *
 * Catalog installs use the catalog's own step (`data-access.ts`), which shows the same sections. This module covers
 * every other new app (built by an assistant, from a template preview or by a person): on its first Save the
 * person sees the project, the team's default role, each table connection and any optional automations, and the
 * server refuses to save the app without those reviewed choices (`confirm` with `installation`).
 */
const digest64=z.string().regex(/^[a-f0-9]{64}$/);
export const TEAM_DEFAULTS=['editor','viewer','none'] as const;
/** Per existing table the app connects to: keep it with read or read/write use, or replace it with a new empty table (I4, I5). */
export const connectionChoice=z.enum(['read','write','new']);
export const installationChoice=z.object({stepDigest:digest64,projectId:id.optional(),teamDefault:z.enum(TEAM_DEFAULTS).default('editor'),connections:z.record(id,connectionChoice).default({})}).strict();
export type InstallationChoice=z.infer<typeof installationChoice>;
const tx=(db:Connection):Database=>({query:db.query.bind(db) as any,transaction:fn=>fn(db),close:async()=>{}});
export const isNewApp=(op:any)=>['create_tracker','save_component'].includes(op?.kind)&&!op.componentId;

/** The existing tables a new app connects to, with what the app does with them. */
function boundTables(op:any){
 const out=new Map<string,{fields:string[];write:boolean}>();
 if(op.kind==='create_tracker'){
  const drafts=new Set((op.setup?.newTables??[]).map((t:any)=>t.id));
  for(const tab of op.setup?.tabs??[]){if(drafts.has(tab.typeId))continue;const e=out.get(tab.typeId)??{fields:[],write:false};
   for(const c of tab.columns??[]){if(!e.fields.includes(c.field))e.fields.push(c.field);if(c.editable!==false)e.write=true;}
   if(!(tab.columns??[]).length)e.write=true;out.set(tab.typeId,e);}
  for(const x of op.setup?.extendTables??[]){const e=out.get(x.typeId)??{fields:[],write:true};e.write=true;out.set(x.typeId,e);}
  return out;
 }
 const manifest=op.content?.manifest;
 for(const b of op.content?.bindings??[]){
  // With a reviewed manifest, the app writes only the fields it declares for writing. Without one, its bindings are read/write.
  const write=manifest?(manifest.fields??[]).some((f:any)=>f.typeId===b.typeId&&f.mode==='write'):true;
  out.set(b.typeId,{fields:b.fields,write});
 }
 return out;
}

/** I3, I4: one row per existing table the app connects to: its source, intended use, and the choices offered. */
async function connectionRows(f:WorkspaceFoundation,db:Connection,a:Actor,w:string,op:any,only?:Set<string>){
 const tables:any[]=[];
 for(const [typeId,use] of boundTables(op)){
  if(only&&!only.has(typeId))continue;
  let type:any=null,reason:string|null=null;
  try{type=(await typeAccess(db,a,w,typeId)).type;}catch(e){if(![403,404].includes((e as any).status))throw e;reason='not_available';}
  if(type&&(type.archived_at||type.deleted_at)){reason='archived';}
  // Which other apps use the table, by name, limited to apps this person can open (A13: within the caller's access).
  const users=(await db.query("SELECT id,name FROM workspace_components WHERE workspace_id=$1 AND deleted_at IS NULL AND archived=false AND bindings @> $2::jsonb AND id IS DISTINCT FROM $3 ORDER BY name",[w,JSON.stringify([{typeId}]),op.componentId??null])).rows;
  const apps:string[]=[];for(const u of users){try{await f.component(db,{...a,accessToolId:u.id},w,u.id,false,true);apps.push(u.name);}catch{/* not visible to this person: not named */}}
  const origin=type?.origin_app_id?(await db.query('SELECT name FROM workspace_components WHERE id=$1 AND workspace_id=$2',[type.origin_app_id,w])).rows[0]?.name??null:null;
  // A table this person created for the app while building it, used by no other app, becomes the app's own (A2, I5).
  const own=!!type&&(!type.origin_app_id||type.origin_app_id===op.componentId)&&users.length===0&&(await db.query("SELECT 1 FROM audit_events WHERE workspace_id=$1 AND object_id=$2 AND action='type.created' AND actor_id=$3 LIMIT 1",[w,typeId,a.userId])).rows.length>0;
  const shared=!own&&(apps.length>0||users.length>0);
  // I4: a link to another app's table is read-only unless the installer expressly allows writing. The read-only choice needs
  // the app's reviewed field contract (manifest) to be enforced, so an app without one offers its table as read/write only.
  const canNarrow=op.kind==='save_component'&&!!op.content?.manifest;
  const options=reason?['new']:[...(use.write?(canNarrow?['read','write']:['write']):['read']),'new'];
  const choice=reason?'new':use.write&&shared&&canNarrow?'read':use.write?'write':'read';
  tables.push({typeId,name:type?.name??'Unavailable table',source:origin??apps[0]??(own?'Created for this app':'Database'),apps,own,
   intended:use.write?'write':'read',fields:use.fields.length,status:reason?'unavailable':'available',...(reason?{reason}:{}),options,choice});
 }
 return tables;
}

/** What the popup shows for a new app's first save. Read only. */
export async function installationStep(f:WorkspaceFoundation,db:Connection,a:Actor,w:string,op:any){
 if(!isNewApp(op))fail(400,'not_new_app','Only a new app is installed');
 const p=await access(db,a,w);
 const nodes=(await f.nodes(a,w)).nodes.filter((n:any)=>n.kind==='project'&&!n.archived&&!n.effective_archived);
 const current=op.kind==='create_tracker'?op.setup?.projectId:op.projectId;
 const fallback=current??(await db.query('SELECT ensure_default_project($1) AS id',[w])).rows[0]?.id??nodes[0]?.id??null;
 const projects=nodes.map((n:any)=>({id:n.id,name:n.name}));
 if(fallback&&!projects.some((x:any)=>x.id===fallback)){const n=(await db.query('SELECT id,name FROM workspace_nodes WHERE id=$1 AND workspace_id=$2',[fallback,w])).rows[0];if(n)projects.unshift({id:n.id,name:n.name});}
 const tables:any[]=await connectionRows(f,db,a,w,op);
 for(const t of op.kind==='create_tracker'?op.setup?.newTables??[]:[])tables.push({typeId:t.id,name:t.name,source:'New table',apps:[],own:true,intended:'write',fields:t.fields.length,status:'new',options:[],choice:'new'});
 const manifest=op.content?.manifest??{};
 const automations=[...(manifest.recommendedAutomations??[]),...(manifest.automationFeatures??[])].slice(0,20).map((r:any)=>({key:r.key??r.name,name:r.name??r.label??r.key,purpose:r.description??r.purpose??null,schedule:r.trigger?.description??r.schedule??null}));
 const app={name:op.kind==='create_tracker'?op.setup?.name??op.content?.name:op.content?.name,purpose:op.setup?.description??op.content?.description??manifest.purpose??null};
 const identity={project:projects.map((x:any)=>x.id),fallback,tables:tables.map(t=>[t.typeId,t.status,t.options,t.choice]),automations:automations.map(x=>x.key),owner:p.role};
 return {app,project:{choice:fallback,options:projects},team:{choice:'editor',options:[...TEAM_DEFAULTS]},tables,automations,
  automationNote:automations.length?'Optional automations are set up after installing, in Automations, with the app selected.':null,
  digest:createHash('sha256').update(JSON.stringify(identity)).digest('hex')};
}

/** Applies the reviewed connection choices to the app before it is saved (I4, I5): read-only narrowing or a new empty table. */
async function applyConnections(db:Connection,a:Actor,w:string,original:any,rows:any[],connections:Record<string,string>,name?:string|null){
 const op=structuredClone(original);let content=JSON.stringify(op.kind==='create_tracker'?{source:op.content?.source,manifest:op.content?.manifest}:op.content);
 const created:string[]=[],own:string[]=[],decisions:any[]=[];
 for(const t of rows.filter((x:any)=>x.status!=='new')){
  const picked=connections[t.typeId]??t.choice;
  if(!t.options.includes(picked))fail(400,'invalid_connection',`Choose one of the listed options for ${t.name}`);
  decisions.push({typeId:t.typeId,use:picked});
  if(picked==='new'){
   // I4, I5: replace the suggested table with a new empty one with the same fields. Nothing is copied or merged.
   const source=t.status==='unavailable'?null:(await typeAccess(db,a,w,t.typeId)).type;
   const binding=op.kind==='create_tracker'?null:(op.content.bindings??[]).find((b:any)=>b.typeId===t.typeId);
   const keys=binding?binding.fields:(op.setup?.tabs??[]).filter((x:any)=>x.typeId===t.typeId).flatMap((x:any)=>(x.columns??[]).map((c:any)=>c.field));
   if(!source)fail(409,'connection_unavailable',`${t.name} is unavailable. Ask your assistant to prepare the app again with a new table.`);
   const fields=source.fields.filter((x:any)=>keys.includes(x.key)).map(({key,name,kind,options,multiple,targetTypeId,ai}:any)=>({key,name,kind,...(options?{options}:{}),...(multiple?{multiple}:{}),...(targetTypeId?{targetTypeId}:{}),...(ai===false?{ai}:{})}));
   const appName=String(name??'App').slice(0,40),used=new Set((await db.query('SELECT name FROM entity_types WHERE workspace_id=$1',[w])).rows.map((r:any)=>r.name));
   let tableName=(appName+' · '+source.name).slice(0,90),n=2;const base=tableName;while(used.has(tableName))tableName=base+' ('+(n++)+')';
   if(op.kind==='create_tracker'){
    const draft=randomUUID();op.setup.newTables=[...(op.setup.newTables??[]),{id:draft,name:tableName,fields}];
    for(const tab of op.setup.tabs)if(tab.typeId===t.typeId)tab.typeId=draft;
    content=content.replaceAll(t.typeId,draft);
   }else{
    const service=new Service(tx(db)),p=await service.preview(a,w,{kind:'create_type',name:tableName,fields}),saved=await service.commit(a,p.id,p.digest);
    const fresh=saved.objects[0].id,type=(await db.query('SELECT version FROM entity_types WHERE id=$1',[fresh])).rows[0];
    created.push(fresh);content=content.replaceAll(t.typeId,fresh);
    // Field contracts recorded the old table's schema version; a new table starts at its own.
    const c=JSON.parse(content);for(const m of c.manifest?.fields??[])if(m.typeId===fresh)m.schemaVersion=type.version;content=JSON.stringify(c);
   }
   continue;
  }
  if(t.own)own.push(t.typeId);
  // I4: read-only use of a table the app would write. The reviewed field contract is narrowed, so the platform refuses its writes.
  if(picked==='read'&&t.intended==='write'){
   if(op.kind==='create_tracker'){for(const tab of op.setup.tabs)if(tab.typeId===t.typeId)for(const c of tab.columns??[])c.editable=false;}
   else{const c=JSON.parse(content);for(const m of c.manifest?.fields??[])if(m.typeId===t.typeId)m.mode='read';content=JSON.stringify(c);}
  }
 }
 if(op.kind==='create_tracker'){const c=JSON.parse(content);if(op.content){op.content.source=c.source;if(c.manifest!==undefined)op.content.manifest=c.manifest;}}
 else op.content=JSON.parse(content);
 if(op.kind==='create_tracker'){const c=JSON.parse(content);if(op.content){op.content.source=c.source;if(c.manifest!==undefined)op.content.manifest=c.manifest;}}
 else op.content=JSON.parse(content);
 return {op,created,own,decisions};
}

/** Applies the reviewed project and table choices to the new app before it is saved. Returns what to finish after saving. */
export async function prepareInstallation(f:WorkspaceFoundation,db:Connection,a:Actor,w:string,original:any,input:unknown){
 if(input===undefined||input===null)fail(409,'installation_required',JSON.stringify({message:'Review the installation (project, team access, table connections) before saving this new app.',step:await installationStep(f,db,a,w,original)}));
 const choice=installationChoice.parse(input),step=await installationStep(f,db,a,w,original);
 if(step.digest!==choice.stepDigest)fail(409,'installation_changed','Projects, tables or access changed. Review the installation again.');
 const projectId=choice.projectId??step.project.choice;
 if(!projectId||!step.project.options.some((x:any)=>x.id===projectId))fail(400,'project_required','Choose one of the listed projects');
 const op=structuredClone(original);
 if(op.kind==='create_tracker')op.setup.projectId=projectId;else op.projectId=projectId;
 const applied=await applyConnections(db,a,w,op,step.tables,choice.connections,step.app.name);
 return {op:applied.op,finish:{choice:{...choice,projectId},created:applied.created,own:applied.own,decisions:applied.decisions,step}};
}

/** After the app is saved: team default (A1), the app's own tables (A2), and the installation record (I2). */
export async function finishInstallation(db:Connection,a:Actor,w:string,appId:string,plan:{choice:InstallationChoice;created:string[];own:string[];decisions:any[];step:any}){
 const p=await access(db,a,w);
 if(plan.choice.teamDefault!=='editor'){
  await db.query('UPDATE workspace_components SET team_default_role=$1 WHERE id=$2 AND workspace_id=$3',[plan.choice.teamDefault,appId,w]);
  await db.query('UPDATE workspaces SET access_version=access_version+1 WHERE id=$1',[w]);
 }
 await markAppTables(db,w,appId,[...plan.created,...plan.own]);
 await audit(db,a,p,'app.installed',appId,null,{projectId:plan.choice.projectId,teamDefault:plan.choice.teamDefault,connections:plan.decisions,newTables:plan.created,appTables:plan.own});
}

/** Names of what an app runs or offers to run: helpers, bound functions, recommended automations and automation features. */
function automationKeys(content:any){
 const m=content?.manifest??{},out=new Map<string,string>();
 for(const x of content?.execution??[])out.set('execution:'+x.name,x.name);
 for(const x of m.functions??[])out.set('function:'+x.name,x.purpose??x.name);
 for(const x of m.recommendedAutomations??[])out.set('recipe:'+(x.key??x.name),x.name??x.key);
 for(const x of m.automationFeatures??[])out.set('feature:'+(x.key??x.name),x.name??x.label??x.key);
 return out;
}

/**
 * A4, I2 (package 3.4): what an approved change to an existing app does to access, table connections or automations.
 * Null when it affects none of them: the footer then approves directly. Otherwise approval opens the installation popup
 * with only the affected sections, and the server refuses the change without the reviewed choices.
 */
export async function changeImpact(f:WorkspaceFoundation,db:Connection,a:Actor,w:string,op:any){
 if(!['create_tracker','save_component'].includes(op?.kind)||!op.componentId)return null;
 const prev=(await db.query('SELECT name,bindings,manifest,execution,source_access FROM workspace_components WHERE id=$1 AND workspace_id=$2 AND deleted_at IS NULL',[op.componentId,w])).rows[0];
 if(!prev)return null;
 const before=new Set<string>((prev.bindings??[]).map((b:any)=>b.typeId)),after=new Set<string>(boundTables(op).keys());
 const added=new Set([...after].filter(x=>!before.has(x))),removed=[...before].filter(x=>!after.has(x));
 const removedTables:string[]=[];for(const typeId of removed){try{removedTables.push((await typeAccess(db,a,w,typeId)).type.name);}catch{removedTables.push('A table you cannot see');}}
 const sourceAccess=op.kind==='save_component'?op.content?.sourceAccess??'workspace':prev.source_access;
 const accessChange=sourceAccess!==prev.source_access?{from:prev.source_access,to:sourceAccess,
  text:sourceAccess==='bindings'?'People who can read the app’s connected tables will also see the app’s full saved code.':'Only people with full access to the organization’s data will be able to open the app.'}:null;
 const was=automationKeys({manifest:prev.manifest,execution:prev.execution}),now=automationKeys(op.kind==='save_component'?op.content:{manifest:op.content?.manifest,execution:prev.execution});
 const automations={added:[...now].filter(([k])=>!was.has(k)).map(([,v])=>v),removed:[...was].filter(([k])=>!now.has(k)).map(([,v])=>v)};
 // Only what needs a decision opens the popup: a new connection, a change of who can read the app, a new automation.
 // Removals need none (what relies on them is checked separately, 3.6); they are listed when the popup opens anyway.
 if(!added.size&&!accessChange&&!automations.added.length)return null;
 const tables=added.size?await connectionRows(f,db,a,w,op,added):[];
 const identity={app:op.componentId,version:op.expectedVersion,access:accessChange,tables:tables.map(t=>[t.typeId,t.status,t.options,t.choice]),removed,automations};
 return {kind:'change',app:{name:op.content?.name??prev.name},access:accessChange,tables,removedTables,automations,
  digest:createHash('sha256').update(JSON.stringify(identity)).digest('hex')};
}
export const changeChoice=z.object({stepDigest:digest64,connections:z.record(id,connectionChoice).default({})}).strict();
/** Applies the reviewed choices for a change that affects access, connections or automations (3.4). */
export async function prepareChange(f:WorkspaceFoundation,db:Connection,a:Actor,w:string,original:any,input:unknown){
 const impact=await changeImpact(f,db,a,w,original);
 if(!impact)return null;
 if(input===null)fail(409,'installation_required',JSON.stringify({message:'This change affects access, table connections or automations. Review it in the installation popup before approving.',step:impact}));
 const choice=changeChoice.parse(input);
 if(choice.stepDigest!==impact.digest)fail(409,'installation_changed','The app or its tables changed. Review the change again.');
 const applied=await applyConnections(db,a,w,original,impact.tables,choice.connections,impact.app.name);
 return {op:applied.op,finish:{created:applied.created,own:applied.own,decisions:applied.decisions,impact}};
}
export async function finishChange(db:Connection,a:Actor,w:string,appId:string,plan:{created:string[];own:string[];decisions:any[];impact:any}){
 await markAppTables(db,w,appId,[...plan.created,...plan.own]);
 await audit(db,a,await access(db,a,w),'app.change_reviewed',appId,null,{connections:plan.decisions,newTables:plan.created,access:plan.impact.access,removedTables:plan.impact.removedTables,automations:plan.impact.automations});
}
