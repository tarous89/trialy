import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {Database,Connection} from '../db/database.js';
import {access,typeAccess} from '../domain/permissions.js';
import {audit} from '../domain/evidence.js';
import {AccessGrid,rowKey} from '../domain/access-grid.js';
import {AccessManagement} from '../domain/access-management.js';
import {requireCurrentAction} from '../domain/write-authorization.js';
import {Service} from '../domain/service.js';
import {fail,id,ASSISTANT_NAMES,type Actor} from '../shared/schema.js';
import {WorkspaceFoundation} from './service.js';
import {workspaceOperation} from './schema.js';
import {installCatalogApp,manifestFieldId,sharedTableCandidates} from './template-catalog.js';
import {appRoles,contractRegistry,readerAccepts,roleKey,roleTables,outputWriter,tableCompatible,templateTableMap,withTableMap,withTemplateBindings,type AppRole,type ContractField} from './role-contracts.js';

/**
 * Data access step (docs/product/MODULAR_APPS_AND_SHARED_DATA.md §7): one review shown on every app add or save with
 * new or changed bindings. (1) Existing tables this app can use, by role; (2) other live apps that declare an optional
 * role this app provides; (3) who can use the app. Save commits app, connections and access in one transaction.
 */
const digest64=z.string().regex(/^[a-f0-9]{64}$/);
const install=z.object({templateId:z.string().max(80),version:z.string().max(30),digest:digest64.optional(),name:z.string().trim().min(1).max(100).optional(),requestKey:z.string().uuid().optional(),createNew:z.boolean().optional()}).strict();
const targetShape={previewId:id.optional(),digest:digest64.optional(),install:install.optional(),componentId:id.optional()};
const oneTarget=(v:any)=>[v.previewId,v.install,v.componentId].filter(Boolean).length===1&&(!v.previewId||!!v.digest);
export const dataAccessTarget=z.object(targetShape).strict();
export const dataAccessRead=dataAccessTarget.refine(oneTarget,'Name one app preview (with its digest), template installation or saved app');
const level=z.enum(['none','view','edit','read','propose']);
const choices={
 /** Section 1, per role: the existing table to connect, or skip ("Do not connect"; for a core role at install: separate data). */
 connections:z.record(roleKey,z.union([id,z.literal('skip')])).default({}),
 /** Section 2: connect or not, per other app and role. */
 consumers:z.array(z.object({appId:id,role:roleKey,connect:z.boolean()}).strict()).max(100).default([]),
 /** Section 3: access level per person (none/view/edit) or worker (none/read/propose). Omitted subjects keep their access. */
 access:z.array(z.object({subject:z.union([id,z.literal('chatgpt'),z.literal('claude')]),level}).strict()).max(500).default([])
};
export const dataAccessPrepareShape={...targetShape,...choices};
export const dataAccessCommitShape={...targetShape,...choices,stepDigest:digest64};
export const dataAccessPrepare=z.object({...targetShape,...choices}).strict().refine(oneTarget,'Name one app preview (with its digest), template installation or saved app');
export const dataAccessCommit=z.object({...targetShape,...choices,stepDigest:digest64}).strict().refine(oneTarget,'Name one app preview (with its digest), template installation or saved app');

type Target={kind:'preview'|'install'|'app';appId:string|null;name:string;projectId:string|null;roles:AppRole[];provides:{role:string;contract:string;typeId?:string;fields?:ContractField[]}[];changed:boolean;schema?:Record<string,any>;identity:any};
const tx=(db:Connection):Database=>({query:db.query.bind(db) as any,transaction:fn=>fn(db),close:async()=>{}});

async function declines(db:Connection,w:string){return new Set((await db.query('SELECT app_id,role FROM app_role_choices WHERE workspace_id=$1',[w])).rows.map(r=>r.app_id+':'+r.role));}
async function defaultProject(db:Connection,w:string){return (await db.query("SELECT id FROM workspace_nodes WHERE workspace_id=$1 AND kind='project' AND parent_id IS NULL AND archived=false ORDER BY CASE WHEN name='Project 1' THEN 0 ELSE 1 END,created_at,id LIMIT 1",[w])).rows[0]?.id??null;}
const bindingKey=(b:any[])=>JSON.stringify((b??[]).map((x:any)=>[x.typeId,[...x.fields].sort()]).sort());
const canonical=(v:any):any=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const rolesKey=(m:any)=>JSON.stringify(canonical((m?.roles??[]).slice().sort((x:any,y:any)=>x.role<y.role?-1:1)));

/** What is being added or saved, and the roles it declares and provides. */
async function target(f:WorkspaceFoundation,db:Connection,a:Actor,w:string,v:any):Promise<Target>{
 const registry=await contractRegistry();
 if(v.install){
  const row=(await db.query("SELECT install_schema,payload FROM app_template_catalog WHERE template_id=$1 AND version=$2 AND status='approved'",[v.install.templateId,v.install.version])).rows[0];
  if(!row)fail(404,'not_found','Template unavailable');
  const schema=row.install_schema??{};
  const provides=(Object.entries(schema) as [string,any][]).filter(([r,d])=>d.contract&&!d.optional&&roleKey.safeParse(r).success).map(([role,d])=>({role,contract:d.contract,fields:d.fields}));
  return {kind:'install',appId:null,name:v.install.name??row.payload?.name??v.install.templateId,projectId:await defaultProject(db,w),roles:[],provides,changed:true,schema,identity:{install:{templateId:v.install.templateId,version:v.install.version}}};
 }
 let c:any,previous:any=null,changed=true;
 if(v.componentId){c=await f.component(db,a,w,v.componentId);if(c.archived)fail(409,'component_changed','Restore the app first');changed=true;}
 else{
  const draft=(await db.query('SELECT body FROM workspace_previews WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND expires_at>now()',[v.previewId,w,a.userId])).rows[0];
  if(!draft)fail(404,'not_found','Preview expired or unavailable');
  const op=workspaceOperation.parse(draft.body.operation);
  if(op.kind==='save_component'||op.kind==='create_tracker'){
   previous=op.componentId?await f.component(db,a,w,op.componentId):null;
   c={...(previous??{}),id:op.componentId??null,name:op.content.name,source:op.content.source,bindings:op.content.bindings,manifest:op.content.manifest===undefined?previous?.manifest??null:op.content.manifest,project_id:op.kind==='create_tracker'?op.setup.projectId:op.projectId};
   changed=!previous||bindingKey(previous.bindings)!==bindingKey(c.bindings)||rolesKey(previous.manifest)!==rolesKey(c.manifest);
  }
  else if(op.kind==='copy_component'){const source=await f.component(db,a,w,op.sourceComponentId);c={...source,id:null,name:op.name,project_id:op.projectId};}
  else if(op.kind==='archive_component'&&!op.archived){c=await f.component(db,a,w,op.componentId,false);}
  else if(op.kind==='restore_component'){c=await f.component(db,a,w,op.componentId);changed=true;}
  else fail(400,'data_access_target','The data access step applies to app additions and saves');
 }
 const roles=await appRoles(db,w,c);
 const provides=roles.filter(r=>r.typeId&&(r.writable||registry.roles[r.role]?.kind==='core')).map(r=>({role:r.role,contract:r.contract,typeId:r.typeId}));
 return {kind:v.componentId?'app':'preview',appId:c.id??null,name:c.name,projectId:c.project_id??null,roles,provides,changed,identity:v.componentId?{componentId:v.componentId,version:c.version}:{previewId:v.previewId,digest:v.digest}};
}

/** Field requirements of a declared role: the installer schema's fields, or the contract's fields the app named. */
async function needs(r:AppRole):Promise<ContractField[]|null>{
 if(r.def?.fields)return r.def.fields;
 const fields=(await contractRegistry()).roles[r.role]?.versions[r.contract]?.fields;if(!fields)return null;
 return r.fields?fields.filter(f=>r.fields!.includes(f.key)):fields;
}

/** Existing tables bound by other live apps under a role, with what the current user may see. */
async function roleCandidates(f:WorkspaceFoundation,db:Connection,a:Actor,w:string,r:AppRole,self:string|null){
 const registry=await contractRegistry(),fields=await needs(r);if(!fields)return [];
 const owned=new Set(registry.roles[r.role]?.kind==='core'?(registry.roles[r.role].versions[r.contract]?.fields??[]).filter(f=>f.owner).map(f=>f.key):[]);
 const byType=new Map<string,string[]>();
 for(const t of (await roleTables(db,w)).tables)if(t.role===r.role&&t.appId!==self){const apps=byType.get(t.typeId)??[];if(!apps.includes(t.appName))apps.push(t.appName);byType.set(t.typeId,apps);}
 const out:any[]=[];
 for(const [typeId,apps] of byType){
  const type=(await db.query('SELECT name,fields,archived_at,deleted_at FROM entity_types WHERE id=$1 AND workspace_id=$2',[typeId,w])).rows[0];
  if(!type||type.archived_at||type.deleted_at)continue;
  let readable=true;try{await typeAccess(db,a,w,typeId);}catch{readable=false;}
  // Restricted tables are shown as restricted, without counts or fields, and cannot be connected here.
  if(!readable){out.push({typeId,name:type.name,apps,restricted:true,records:null,addFields:[]});continue;}
  const check=tableCompatible(fields,type.fields,r.readOnly?new Set():owned);if(!check.compatible)continue;
  if(registry.roles[r.role]?.kind==='output'){const writer=await outputWriter(db,w,typeId,r.role);if(!readerAccepts(registry,r.role,r.reads??[r.contract],writer?.contract))continue;}
  const records=Number((await db.query("SELECT count(*) AS n FROM records WHERE type_id=$1 AND workspace_id=$2 AND state<>'archived'",[typeId,w])).rows[0].n);
  out.push({typeId,name:type.name,apps,restricted:false,records,addFields:check.addFields});
 }
 return out;
}

async function accessSection(db:Connection,a:Actor,w:string,appId:string|null,projectId:string|null){
 const p=await access(db,a,w);
 const note='Team and worker access is managed by the account owner on the TrialAgents website (Access).';
 if(p.role!=='owner')return {canChange:false,note:'Your access is managed by the account owner.',people:[],workers:[],version:p.access_version};
 const key=appId?rowKey('tool',appId):projectId?rowKey('project',projectId):null;
 const grid=new AccessGrid(tx(db)),people=(await new AccessManagement(tx(db)).overview(a,w)).people.filter((x:any)=>x.role!=='owner');
 const levelOf=async(subject:string)=>{if(!key)return null;try{const row=(await grid.read(a,w,subject)).rows.find((r:any)=>r.key===key);return row?{read:row.read===true,write:row.write===true}:null;}catch{return null;}};
 const out:any[]=[];
 for(const person of people){const g=await levelOf(person.id);out.push({id:person.id,name:person.name||person.email,role:person.role,level:!g?'view':g.write?'edit':g.read?'view':'none',levels:person.role==='inspector'?['none','view']:['none','view','edit']});}
 const workers:any[]=[];
 // Inside ChatGPT or Claude only that assistant is listed; its automation runners act through the same connection.
 for(const x of a.origin==='ai'?[a.assistant==='claude'?'claude':'chatgpt']:['chatgpt','claude']){const g=await levelOf(x);workers.push({id:x,name:ASSISTANT_NAMES[x as 'chatgpt'|'claude'],level:!g?'propose':g.write?'propose':g.read?'read':'none',levels:['none','read','propose'],hint:'Each person’s connection and its automation runners. Assistants never write directly: edits are proposals for review.'});}
 // Access changes stay a signed-in owner action on the website (Access); inside an assistant they are shown, not changed.
 return {canChange:a.origin==='human',note:a.origin==='human'?'New apps inherit the project’s current access. Change only what should differ.':note,people:out,workers,version:p.access_version,inherits:!appId};
}

/** Builds the step for an app add or save. `remembered` choices are skipped unless the user opens Connect explicitly (a saved app target). */
export async function dataAccessStep(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 const v=dataAccessRead.parse(input),db=f.db;
 const t=await target(f,db,a,w,v),declined=await declines(db,w),registry=await contractRegistry(),explicit=t.kind==='app';
 const existing:any[]=[];
 if(t.kind==='install')for(const r of await sharedTableCandidates(db,a,w,t.schema!)){
  const def=t.schema![r.role];
  existing.push({role:r.role,name:r.name,contract:def.contract??null,mode:r.readOnly?'read':'write',core:registry.roles[r.role]?.kind==='core'&&!r.optional,optional:r.optional,candidates:r.candidates.map((c:any)=>({...c,restricted:false})),choice:r.candidates[0].typeId,skipLabel:r.optional?'Do not connect':'Use separate data (new table)',remembered:false});
 }
 else for(const r of t.roles){
  if(r.typeId||!r.optional)continue;
  const remembered=!!t.appId&&declined.has(t.appId+':'+r.role);if(remembered&&!explicit)continue;
  const candidates=await roleCandidates(f,db,a,w,r,t.appId);if(!candidates.length)continue;
  const first=candidates.find((c:any)=>!c.restricted);
  existing.push({role:r.role,name:r.name,contract:r.contract,mode:r.readOnly?'read':'write',core:false,optional:true,candidates,choice:first?.typeId??'skip',skipLabel:'Do not connect',remembered});
 }
 // Section 2: other live apps that declare an optional role this app provides (late connection, §7.1).
 const consumers:any[]=[];
 if(t.provides.length)for(const c of await f.components(a,w)){
  if(c.archived||c.project_archived||c.id===t.appId)continue;
  const full=(await db.query('SELECT id,name,source,bindings,manifest FROM workspace_components WHERE id=$1',[c.id])).rows[0];
  for(const r of await appRoles(db,w,full)){
   const p=t.provides.find(x=>x.role===r.role);if(!p||r.typeId||!r.optional||declined.has(c.id+':'+r.role))continue;
   if(!readerAccepts(registry,r.role,r.reads??[r.contract],p.contract))continue;
   const required=await needs(r);if(!required)continue;
   const offered=p.typeId?(await db.query('SELECT fields FROM entity_types WHERE id=$1',[p.typeId])).rows[0]?.fields??[]:p.fields??[];
   const owned=new Set(registry.roles[r.role]?.kind==='core'&&!r.readOnly?(registry.roles[r.role].versions[r.contract]?.fields??[]).filter(f=>f.owner).map(f=>f.key):[]);
   if(!tableCompatible(required,offered,owned).compatible)continue;
   consumers.push({appId:c.id,appName:c.name,role:r.role,name:r.name,contract:r.contract,mode:r.readOnly?'read':'write',connect:true});
  }
 }
 const accessRows=await accessSection(db,a,w,t.appId,t.projectId);
 const needed=explicit||t.changed||existing.length>0||consumers.length>0;
 const identity={target:t.identity,existing:existing.map(r=>({role:r.role,candidates:r.candidates.map((c:any)=>[c.typeId,c.restricted])})),consumers:consumers.map(c=>[c.appId,c.role]),access:{version:accessRows.version,people:accessRows.people.map((p:any)=>[p.id,p.level]),workers:accessRows.workers.map((x:any)=>[x.id,x.level])}};
 const step={target:{kind:t.kind,appId:t.appId,name:t.name,...t.identity},needed,existing,consumers,access:accessRows,
  summary:summarize(existing.map(r=>({...r,choice:r.choice})),consumers,0),
  rules:'Connect is the default for core roles and compatible optional roles. "Do not connect" is remembered for this app and role until you choose Connect from the app or the Access tab. Nothing connects without this review.',
  digest:createHash('sha256').update(JSON.stringify(identity)).digest('hex')};
 return step;
}
function summarize(existing:any[],consumers:any[],accessChanges:number){
 const connected=existing.filter(r=>r.choice&&r.choice!=='skip').length,apps=consumers.filter(c=>c.connect);
 const parts=[connected?`Connects ${connected} ${connected===1?'table':'tables'}`:'Connects no existing tables'];
 if(apps.length)parts.push(`gives ${[...new Set(apps.map(c=>c.appName))].join(', ')} ${apps.every(c=>c.mode==='read')?'read':''} access to ${apps.length}`.replace('  ',' '));
 parts.push(accessChanges?`changes access for ${accessChanges}`:'team access unchanged');
 return parts.join(', ');
}

/** An assistant prepares the step with proposed choices; only the user confirms it in the platform's review view. */
export async function prepareDataAccess(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 const v=dataAccessPrepare.parse(input),{connections,consumers,access:levels,...targetInput}=v;
 const step=await dataAccessStep(f,a,w,targetInput);
 validateChoices(step,v);
 const proposal={connections,consumers,access:levels};
 const applied={...step,existing:step.existing.map((r:any)=>connections[r.role]?{...r,choice:connections[r.role]}:r),consumers:step.consumers.map((c:any)=>{const x=consumers.find(y=>y.appId===c.appId&&y.role===c.role);return x?{...c,connect:x.connect}:c;})};
 if(a.origin==='ai')await f.db.query("INSERT INTO workspace_previews(id,workspace_id,user_id,body,digest) VALUES(gen_random_uuid(),$1,$2,$3,$4)",[w,a.userId,JSON.stringify({operation:{kind:'data_access_step'},target:step.target,proposal}),step.digest]);
 return {...applied,summary:summarize(applied.existing,applied.consumers,levels.length),proposal,confirmation:'Shown for review. The user saves it in the TrialAgents review view; assistants cannot confirm it.'};
}

function validateChoices(step:any,v:any){
 for(const [role,choice] of Object.entries(v.connections??{}) as [string,string][]){const row=step.existing.find((r:any)=>r.role===role);if(!row)fail(409,'data_access_changed',`Nothing to connect for ${role}. Review the data access step again.`);if(choice!=='skip'&&!row.candidates.some((c:any)=>c.typeId===choice&&!c.restricted))fail(403,'table_unavailable','Choose a table you can read, or Do not connect');}
 for(const c of v.consumers??[])if(!step.consumers.some((x:any)=>x.appId===c.appId&&x.role===c.role))fail(409,'data_access_changed','That app connection is no longer offered. Review the data access step again.');
 for(const x of v.access??[]){const row=[...step.access.people,...step.access.workers].find((r:any)=>r.id===x.subject);if(!row||!row.levels.includes(x.level))fail(400,'invalid_access','Choose a listed person or worker and one of its access levels');if(row.level!==x.level&&!step.access.canChange)fail(403,'human_required','Change team and worker access in your signed-in owner session on the TrialAgents website.');}
}

/** Connects a declared role of an app to an existing table: bindings, manifest fields and role label, in one reviewed app save. */
export async function connectRole(f:WorkspaceFoundation,a:Actor,w:string,appId:string,role:string,typeId:string){
 const db=f.db,c=await f.component(db,a,w,appId),r=(await appRoles(db,w,c)).find(x=>x.role===role);
 if(!r)fail(404,'role_unavailable','This app does not declare that role');
 if(r.typeId===typeId)return null;
 if(r.typeId)fail(409,'role_connected','This role is already connected to another table');
 const fields=await needs(r);if(!fields)fail(409,'role_contract','The role contract is unknown');
 let type=(await typeAccess(db,a,w,typeId)).type;
 const registry=await contractRegistry(),owned=new Set(registry.roles[role]?.kind==='core'&&!r.readOnly?(registry.roles[role].versions[r.contract]?.fields??[]).filter(f=>f.owner).map(f=>f.key):[]);
 const check=tableCompatible(fields,type.fields,owned);if(!check.compatible)fail(409,'role_incompatible',`${type.name} does not match ${r.name}: ${check.problems.slice(0,3).join('; ')}`);
 // Shared schemas only grow: missing owned optional contract fields are added in this same transaction.
 if(check.addFields.length){const service=new Service(db);const add=fields.filter(x=>check.addFields.includes(x.key)).map(x=>({ai:true,multiple:false,...x,required:false}));const p=await service.preview(a,w,{kind:'update_type',typeId,expectedVersion:type.version,name:type.name,fields:[...type.fields,...add]});await service.commit(a,p.id,p.digest);type=(await db.query('SELECT * FROM entity_types WHERE id=$1 AND workspace_id=$2',[typeId,w])).rows[0];}
 const keys=fields.map(x=>x.key),mode=r.readOnly?'read':'write';
 const manifest={...(c.manifest??{version:1,scope:'workspace',fields:[]}),fields:[...(c.manifest?.fields??[]).filter((m:any)=>m.typeId!==typeId),...keys.map(k=>({id:manifestFieldId(role,k),typeId,field:k,schemaVersion:type.version,kind:type.fields.find((f:any)=>f.key===k).kind,mode}))]};
 if(Array.isArray(c.manifest?.roles))manifest.roles=c.manifest.roles.map((x:any)=>x.role===role?{...x,typeId}:x);
 let source=c.source;const map=templateTableMap(c.source);
 const bindings=[...c.bindings.filter((b:any)=>b.typeId!==typeId),{typeId,fields:keys}];
 if(map){const logical=r.logicalFields??Object.fromEntries(keys.map(k=>[k,k]));source=withTemplateBindings(withTableMap(c.source,{...map,[role]:{typeId,fields:logical,writableFields:r.readOnly?[]:Object.keys(logical)}}),bindings);}
 const op={kind:'save_component',componentId:c.id,expectedVersion:c.version,projectId:c.project_id,content:{name:c.name,format:c.format,source,sourceAccess:c.source_access??'workspace',resourceKind:c.resource_kind??'generic',manifest,bindings,assets:c.assets??[],execution:c.execution??[]}};
 const draft=await f.preview(a,w,op,true),preview=draft.reviewState==='draft'?(await f.finalizeAppPreview(a,w,draft.id,draft.digest)).preview:draft;
 return f.confirm(a,w,preview.id,preview.digest);
}

/** Saves the reviewed step: the app (preview, installation or nothing for a saved app), connections and access, or nothing. */
export async function confirmDataAccess(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 requireCurrentAction(a);
 const v=dataAccessCommit.parse(input),{stepDigest,connections,consumers,access:levels,...targetInput}=v;
 return f.db.transaction(async t=>{
  await t.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);
  const db=tx(t),sf=new WorkspaceFoundation(db);
  const step=await dataAccessStep(sf,a,w,targetInput);
  if(step.digest!==stepDigest)fail(409,'data_access_changed','Data, apps or access changed. Review the data access step again.');
  validateChoices(step,v);
  const choice=(r:any)=>connections[r.role]??r.choice;
  // 1. The app.
  let receipt:any,appId:string;
  if(targetInput.install){
   const i=targetInput.install;if(!i.digest||!i.requestKey||!i.name)fail(400,'install_request','Installation needs the template digest, name and request key');
   const sharedTables=Object.fromEntries(step.existing.map((r:any)=>[r.role,choice(r)==='skip'?'new':choice(r)]));
   receipt=await installCatalogApp(sf,a,w,{templateId:i.templateId,version:i.version,digest:i.digest,name:i.name,requestKey:i.requestKey,...(i.createNew?{createNew:true}:{}),...(Object.keys(sharedTables).length?{sharedTables}:{})});appId=receipt.appId;
  }
  else if(targetInput.previewId){receipt=await sf.confirm(a,w,targetInput.previewId,targetInput.digest!);appId=receipt.id;}
  else{appId=targetInput.componentId!;receipt={workspaceId:w,status:'saved',id:appId};}
  const p=await access(t,a,w),log:any={app:appId,connections:[],consumers:[],access:[]};
  const remember=(app:string,role:string)=>t.query("INSERT INTO app_role_choices(workspace_id,app_id,role,choice,decided_by) VALUES($1,$2,$3,'declined',$4) ON CONFLICT(app_id,role) DO UPDATE SET decided_by=EXCLUDED.decided_by,decided_at=now()",[w,app,role,a.userId]);
  const forget=(app:string,role:string)=>t.query('DELETE FROM app_role_choices WHERE app_id=$1 AND role=$2',[app,role]);
  // 2. Existing data this app can use.
  for(const r of step.existing){
   const c=choice(r);log.connections.push({role:r.role,choice:c});
   if(c==='skip'){if(r.optional)await remember(appId,r.role);continue;}
   await forget(appId,r.role);
   if(!targetInput.install)await connectRole(sf,a,w,appId,r.role,c);
  }
  // 3. Other apps that can use this app's data: connected to the table the saved app now binds under that role.
  if(step.consumers.length){
   const saved=await sf.component(db,a,w,appId),provided=await appRoles(db,w,saved);
   for(const c of step.consumers){
    const connect=consumers.find(x=>x.appId===c.appId&&x.role===c.role)?.connect??c.connect;log.consumers.push({appId:c.appId,role:c.role,connect});
    if(!connect){await remember(c.appId,c.role);continue;}
    const typeId=provided.find(x=>x.role===c.role)?.typeId;if(!typeId)fail(409,'data_access_changed','The saved app does not provide that role. Review again.');
    await forget(c.appId,c.role);await connectRole(sf,a,w,c.appId,c.role,typeId);
   }
  }
  // 4. Who can use this app: the same rules the Access tab saves.
  const current=new Map<string,string>([...step.access.people,...step.access.workers].map((x:any)=>[x.id,x.level]));
  const changes=levels.filter(x=>current.get(x.subject)!==x.level).map(x=>({subject:x.subject,kind:'tool' as const,resourceId:appId,read:x.level!=='none',write:x.level==='edit'||x.level==='propose'}));
  if(changes.length){if(a.origin!=='human')fail(403,'human_required','Change team and worker access in your signed-in owner session on the TrialAgents website.');const version=(await access(t,a,w)).access_version;await new AccessGrid(db).save(a,w,{expectedVersion:version,changes});log.access=changes.map(c=>({subject:c.subject,read:c.read,write:c.write}));}
  // Every choice is logged.
  await audit(t,a,p,'workspace.data_access_step',appId,null,log);
  await t.query("DELETE FROM workspace_previews WHERE workspace_id=$1 AND user_id=$2 AND body->'operation'->>'kind'='data_access_step'",[w,a.userId]);
  return {...receipt,appId,dataAccess:{summary:summarize(step.existing.map((r:any)=>({...r,choice:choice(r)})),step.consumers.map((c:any)=>({...c,connect:consumers.find(x=>x.appId===c.appId&&x.role===c.role)?.connect??c.connect})),changes.length),...log}};
 });
}

/** Proposed choices an assistant prepared for this target, to prefill the review view. */
export async function preparedChoices(db:Connection,a:Actor,w:string,step:any){
 const row=(await db.query("SELECT body FROM workspace_previews WHERE workspace_id=$1 AND user_id=$2 AND body->'operation'->>'kind'='data_access_step' AND expires_at>now() AND digest=$3 ORDER BY expires_at DESC LIMIT 1",[w,a.userId,step.digest])).rows[0];
 return row?.body?.proposal??null;
}

/** Remembered "Do not connect" choices the current user can see, for the Access tab's Connect action. */
export async function declinedConnections(f:WorkspaceFoundation,a:Actor,w:string){
 await access(f.db,a,w);const registry=await contractRegistry();
 const rows=(await f.db.query('SELECT c.app_id,c.role,c.decided_at FROM app_role_choices c JOIN workspace_components a ON a.id=c.app_id WHERE c.workspace_id=$1 AND NOT a.archived AND a.deleted_at IS NULL ORDER BY c.decided_at DESC',[w])).rows;
 const apps=await f.components(a,w),out=[];
 for(const r of rows){const app=apps.find((c:any)=>c.id===r.app_id);if(!app)continue;out.push({appId:r.app_id,appName:app.name,role:r.role,name:registry.roles[r.role]?.name??r.role,decidedAt:r.decided_at});}
 return {connections:out};
}
