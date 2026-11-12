import {z} from 'zod';
import type {Database,Connection} from '../db/database.js';
import {access,typeAccess} from '../domain/permissions.js';
import {audit} from '../domain/evidence.js';
import {requireCurrentAction} from '../domain/write-authorization.js';
import {Service} from '../domain/service.js';
import {fail,id,type Actor} from '../shared/schema.js';
import {WorkspaceFoundation} from './service.js';
import {manifestFieldId} from './template-catalog.js';
import {appRoles,contractRegistry,readerAccepts,roleKey,roleTables,tableCompatible,templateTableMap,withTableMap,withTemplateBindings,type AppRole,type ContractField} from './role-contracts.js';

/**
 * In-app integrations (docs/product/MODULAR_APPS_AND_SHARED_DATA.md §7): an app keeps its own table for data another app
 * can provide (manual entry). Inside the app a subtle hint offers to add the providing app, or, once it is added, to choose
 * which data the app uses: its own entries or the other app's records. The choice is final for that app; nothing is merged.
 */
const tx=(db:Connection):Database=>({query:db.query.bind(db) as any,transaction:fn=>fn(db),close:async()=>{}});
export const integrationRead=z.object({appId:id,role:roleKey}).strict();
export const integrationChoice=z.object({appId:id,expectedVersion:z.number().int().min(0),role:roleKey,source:z.union([z.literal('own'),id])}).strict();

async function needs(r:AppRole):Promise<ContractField[]>{
 if(r.def?.fields)return r.def.fields;
 const fields=(await contractRegistry()).roles[r.role]?.versions[r.contract]?.fields??[];
 return r.fields?fields.filter(f=>r.fields!.includes(f.key)):fields;
}
/** The approved catalog template that provides a role (its registry writer), if any. */
async function providerTemplate(db:Connection,role:string){
 const writer=(await contractRegistry()).roles[role]?.writer;if(!writer)return null;
 const row=(await db.query("SELECT template_id,version,digest,payload->>'name' AS name FROM app_template_catalog WHERE template_id=$1 AND status='approved' ORDER BY created_at DESC LIMIT 1",[writer])).rows[0];
 return row?{templateId:row.template_id,version:row.version,digest:row.digest,name:row.name}:null;
}
/** Live apps' tables that provide a role and that this app can read under its contract. */
async function providers(db:Connection,a:Actor,w:string,appId:string|null,r:AppRole,checkAccess=true){
 const registry=await contractRegistry(),fields=await needs(r),out:any[]=[];
 for(const t of (await roleTables(db,w)).tables){
  if(t.role!==r.role||t.appId===appId||t.integration||t.readOnly||!t.writable)continue;
  // The running app has app-scoped access and cannot read other apps' tables: it only learns that a provider exists (name, no data).
  // The connect dialog runs as the user and checks readability and compatibility.
  if(!checkAccess){const type=(await db.query('SELECT archived_at,deleted_at FROM entity_types WHERE id=$1 AND workspace_id=$2',[t.typeId,w])).rows[0];if(!type||type.archived_at||type.deleted_at||!readerAccepts(registry,r.role,r.reads??[r.contract],t.contract))continue;if(!out.some(x=>x.typeId===t.typeId))out.push({appId:t.appId,appName:t.appName,typeId:t.typeId});continue;}
  let type:any;try{type=(await typeAccess(db,a,w,t.typeId)).type;}catch{continue;}
  if(type.archived_at||type.deleted_at||!tableCompatible(fields,type.fields).compatible||!readerAccepts(registry,r.role,r.reads??[r.contract],t.contract))continue;
  if(!out.some(x=>x.typeId===t.typeId))out.push({appId:t.appId,appName:t.appName,typeId:t.typeId,tableName:type.name});
 }
 return out;
}

/** For the running app: each integration, where its data comes from, and the subtle offer to show (install, connect or none). */
export async function appIntegrations(db:Connection,a:Actor,w:string,c:any){
 const registry=await contractRegistry(),out:any[]=[];
 for(const r of (await appRoles(db,w,c)).filter(x=>x.integration)){
  const template=await providerTemplate(db,r.role),found=c.id&&!r.linked&&!r.chosen?await providers(db,a,w,c.id,r,false):[];
  const name=found[0]?.appName??template?.name??registry.roles[r.role]?.name??r.role;
  out.push({role:r.role,name:registry.roles[r.role]?.name??r.name,source:r.linked?'linked':'own',chosen:!!r.chosen,provider:name,
   // Saved apps only; a decided source is never suggested again.
   offer:!c.id||r.linked||r.chosen?null:found.length?'connect':template?'install':null});
 }
 return out;
}

async function summary(db:Connection,a:Actor,w:string,typeId:string,keys:string[]){
 try{
  const {type}=await typeAccess(db,a,w,typeId);
  const page:any=await new Service(tx(db)).records(a,w,typeId,{limit:3,offset:0});
  const shown=keys.filter(k=>type.fields.some((f:any)=>f.key===k)).slice(0,2);
  return {tableName:type.name,records:Number(page.total??page.rows?.length??0),recent:(page.rows??[]).map((r:any)=>shown.map(k=>r.data?.[k]).filter((v:any)=>v!==null&&v!==undefined&&v!=='').map(String).join(' · ')).filter(Boolean)};
 }catch{return {tableName:null,records:null,recent:[],restricted:true};}
}

/** The connect dialog: both sources side by side (counts and the latest entries), or the template to add. */
export async function readIntegration(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 const v=integrationRead.parse(input),db=f.db,c=await f.component(db,a,w,v.appId);
 const r=(await appRoles(db,w,c)).find(x=>x.role===v.role&&x.integration);if(!r)fail(404,'not_found','This app has no such integration');
 const fields=await needs(r),keys=fields.map(x=>x.key),registry=await contractRegistry();
 // The app's own name for this data (e.g. Programs' "Cash forecast"), else the contract's.
 return {appId:c.id,appName:c.name,version:c.version,role:r.role,name:r.def?.name??registry.roles[r.role]?.name??r.name,source:r.linked?'linked':'own',chosen:!!r.chosen,
  own:r.typeId&&!r.linked?{typeId:r.typeId,...await summary(db,a,w,r.typeId,keys)}:null,
  providers:await Promise.all((await providers(db,a,w,c.id,r)).map(async p=>({...p,...await summary(db,a,w,p.typeId,keys)}))),
  // A providing app exists but its data is not readable for this user: say so instead of offering a second copy.
  restricted:(await providers(db,a,w,c.id,r,false)).length>(await providers(db,a,w,c.id,r)).length,
  template:await providerTemplate(db,r.role)};
}

/** Saves the user's choice in one reviewed app save: keep the app's own entries, or read the other app's table from now on. */
export async function chooseIntegrationSource(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 requireCurrentAction(a);
 const v=integrationChoice.parse(input);
 return f.db.transaction(async t=>{
  await t.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);
  const db=tx(t),sf=new WorkspaceFoundation(db),c=await sf.component(db,a,w,v.appId);
  if(c.version!==v.expectedVersion)fail(409,'stale_version','The app changed. Open it again.');
  const r=(await appRoles(db,w,c)).find(x=>x.role===v.role&&x.integration);if(!r)fail(404,'not_found','This app has no such integration');
  if(r.linked||r.chosen)fail(409,'integration_decided','This app already chose where this data comes from.');
  if(!Array.isArray(c.manifest?.roles))fail(409,'integration_labels','Update the app before choosing a data source.');
  let manifest:any,bindings=c.bindings,source=c.source;
  if(v.source==='own'){manifest={...c.manifest,roles:c.manifest.roles.map((x:any)=>x.role===r.role?{...x,chosen:true}:x)};}
  else{
   const p=(await providers(db,a,w,c.id,r)).find(x=>x.typeId===v.source);if(!p)fail(409,'integration_unavailable','That data is no longer available. Open the dialog again.');
   const type=(await typeAccess(db,a,w,p.typeId)).type,keys=(await needs(r)).map(x=>x.key),own=r.typeId;
   // Read the other app's table from now on. The app's own entries stay in Database; nothing is copied or merged.
   bindings=[...c.bindings.filter((b:any)=>b.typeId!==own&&b.typeId!==p.typeId),{typeId:p.typeId,fields:keys}];
   manifest={...c.manifest,fields:[...c.manifest.fields.filter((m:any)=>m.typeId!==own&&m.typeId!==p.typeId),...keys.map(k=>({id:manifestFieldId(r.role,k),typeId:p.typeId,field:k,schemaVersion:type.version,kind:type.fields.find((x:any)=>x.key===k).kind,mode:'read'}))],
    roles:c.manifest.roles.map((x:any)=>x.role===r.role?{...x,typeId:p.typeId,readOnly:true,linked:true,chosen:true}:x)};
   const map=templateTableMap(c.source);
   if(map){const logical=r.logicalFields??Object.fromEntries(keys.map(k=>[k,k]));source=withTemplateBindings(withTableMap(c.source,{...map,[r.role]:{typeId:p.typeId,fields:logical,writableFields:[]}}),bindings);}
  }
  const op={kind:'save_component',componentId:c.id,expectedVersion:c.version,projectId:c.project_id,content:{name:c.name,format:c.format,source,sourceAccess:c.source_access??'workspace',resourceKind:c.resource_kind??'generic',manifest,bindings,assets:c.assets??[],execution:c.execution??[]}};
  const draft=await sf.preview(a,w,op,true),preview=draft.reviewState==='draft'?(await sf.finalizeAppPreview(a,w,draft.id,draft.digest)).preview:draft;
  const saved=await sf.confirm(a,w,preview.id,preview.digest);
  await audit(t,a,await access(t,a,w),'workspace.integration_source',c.id,{role:r.role,typeId:r.typeId??null},{role:r.role,source:v.source});
  return {...saved,role:r.role,source:v.source==='own'?'own':'linked'};
 });
}
