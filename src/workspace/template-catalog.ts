import {archivedTemplateApps} from './archive.js';
import {requireCurrentAction} from '../domain/write-authorization.js';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {z} from 'zod';
import type {Database,Connection} from '../db/database.js';
import {typeAccess} from '../domain/permissions.js';
import {fail,type Actor} from '../shared/schema.js';
import {Service} from '../domain/service.js';
import {WorkspaceFoundation} from './service.js';
import {AppTemplates,appTemplateEntry} from './app-templates.js';
import {appUrl} from '../shared/app-route.js';

/** Migration/operator connection only. Existing status is never reset on deploy. */
export async function syncTemplateCatalog(db:Database){
 const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8'));
 const installers=JSON.parse(await readFile('templates/catalog-installers.json','utf8'));
 for(const file of (await readdir('templates/apps')).filter(n=>n.endsWith('.json'))){
  const raw=await readFile('templates/apps/'+file,'utf8'),payload=appTemplateEntry.parse(JSON.parse(raw)),digest=createHash('sha256').update(raw).digest('hex');
  const initial=seed[payload.id],schemaFile=installers[payload.id+'@'+payload.version],schema=schemaFile?JSON.parse(await readFile(schemaFile,'utf8')):{};
  const status=initial?.version===payload.version?'approved':'draft';
  const old=(await db.query('SELECT digest,install_schema FROM app_template_catalog WHERE template_id=$1 AND version=$2',[payload.id,payload.version])).rows[0];
  if(old&&(old.digest!==digest||JSON.stringify(canonical(old.install_schema))!==JSON.stringify(canonical(schema))))throw Error('Published template versions are immutable: '+payload.id+'@'+payload.version);
  await db.query('INSERT INTO app_template_catalog(template_id,version,status,digest,payload,install_schema) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',[payload.id,payload.version,status,digest,JSON.stringify(payload),JSON.stringify(schema)]);
 }
}

export const catalogInstallation=z.object({templateId:z.string().max(80),version:z.string().max(30),digest:z.string().regex(/^[a-f0-9]{64}$/),requestKey:z.string().uuid(),name:z.string().trim().min(1).max(100),createNew:z.boolean().optional(),
 /** Per shareable role: an existing table ID to reuse, or 'new' for separate data (optional roles: not connected). Omitted roles default to reuse when exactly one compatible table exists. */
 sharedTables:z.record(z.string().max(80),z.union([z.string().uuid(),z.literal('new')])).optional()}).strict();
export const catalogInstallationRead=z.object({templateId:z.string().max(80),version:z.string().max(30)}).strict();
/** One transaction: empty tables + app + existing audit/permission paths, or nothing. */
export async function installCatalogApp(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 requireCurrentAction(a);
 const v=catalogInstallation.parse(input);
 return f.db.transaction(async tx=>{
  await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))',[a.userId+':'+w+':'+v.requestKey]);
  const db:Database={query:tx.query.bind(tx),transaction:fn=>fn(tx),close:async()=>{}};
  const scoped=new WorkspaceFoundation(db),service=new Service(db);
  await scoped.policy(tx,a,w,true);
  // Scope receipt lookup to actor/workspace; a retry never creates duplicate tables.
  const prior=(await tx.query("SELECT result FROM workspace_receipts WHERE workspace_id=$1 AND user_id=$2 AND result->>'templateRequestKey'=$3",[w,a.userId,v.requestKey])).rows[0];
  if(prior){if(prior.result.templateId!==v.templateId||prior.result.templateVersion!==v.version||prior.result.templateDigest!==v.digest||prior.result.name!==v.name)fail(409,'receipt_conflict','Request differs from its saved installation');return prior.result;}
  const row=(await tx.query("SELECT * FROM app_template_catalog WHERE template_id=$1 AND version=$2 AND status='approved'",[v.templateId,v.version])).rows[0];
  if(!row)fail(404,'not_found','Template unavailable');
  if(row.digest!==v.digest)fail(409,'template_changed','Reload the template catalog');
  // Restoring an archived app from this template is offered before creating a new one.
  if(!v.createNew){const archived=await archivedTemplateApps(tx,a,w,v.templateId);if(archived.length)fail(409,'archived_app_available',`Restore your archived ${archived[0].name} app, or choose to install a new copy.`);}
  const map:any={},bindings:any[]=[],fields:any[]=[];
  const usedNames=new Set((await tx.query('SELECT name FROM entity_types WHERE workspace_id=$1',[w])).rows.map(r=>r.name));
  // Reuse, never copy (modular apps rule 1): shareable roles connect to an existing compatible table by default.
  const shared=await sharedTableCandidates(db,a,w,row.install_schema);
  for(const role of Object.keys(v.sharedTables??{}))if(!shared.some(s=>s.role===role)&&v.sharedTables![role]!=='new')fail(409,'shared_table_unavailable','That existing table can no longer be reused. Reload and choose again.');
  for(const [role,def] of Object.entries(row.install_schema) as [string,any][]){
   const s=shared.find(x=>x.role===role),choice=v.sharedTables?.[role];let reuse:any=null;
   if(s&&choice&&choice!=='new'){reuse=s.candidates.find((c:any)=>c.typeId===choice);if(!reuse)fail(409,'shared_table_unavailable','That existing table can no longer be reused. Reload and choose again.');}
   // "Install a new copy" without an explicit choice starts fresh (rule 8); the Use dialog always sends the choice.
   else if(s&&choice===undefined&&!v.createNew){if(s.candidates.length===1)reuse=s.candidates[0];else if(s.candidates.length>1&&!def.optional)fail(409,'shared_table_choice',`Choose which existing ${def.name} table to use, or choose separate data.`);}
   if(reuse){
    let type=(await tx.query('SELECT * FROM entity_types WHERE id=$1 AND workspace_id=$2',[reuse.typeId,w])).rows[0];
    const add=def.fields.filter((x:any)=>!type.fields.some((f:any)=>f.key===x.key));
    // Shared schemas only grow: missing contract fields are added as optional fields in this same reviewed installation.
    if(add.length){const p=await service.preview(a,w,{kind:'update_type',typeId:type.id,expectedVersion:type.version,name:type.name,fields:[...type.fields,...add.map((x:any)=>({...x,required:false}))]});await service.commit(a,p.id,p.digest);type=(await tx.query('SELECT * FROM entity_types WHERE id=$1 AND workspace_id=$2',[reuse.typeId,w])).rows[0];}
    const keys=def.fields.map((x:any)=>x.key);
    map[role]={typeId:type.id,fields:def.logicalFields,writableFields:def.readOnly?[]:Object.keys(def.logicalFields)};
    bindings.push({typeId:type.id,fields:keys});
    fields.push(...def.fields.map((x:any)=>({id:manifestFieldId(role,x.key),typeId:type.id,field:x.key,schemaVersion:type.version,kind:type.fields.find((f:any)=>f.key===x.key).kind,mode:def.readOnly?'read':'write'})));
    continue;
   }
   // Optional roles (a partner app's output, an optional shared table) are only ever connected, never created.
   if(def.optional)continue;
   const base=(v.name+' · '+def.name).slice(0,90);let tableName=base,index=2;while(usedNames.has(tableName))tableName=base+' ('+(index++)+')';usedNames.add(tableName);
   const p=await service.preview(a,w,{kind:'create_type',name:tableName,fields:def.fields});
   const saved=await service.commit(a,p.id,p.digest),typeId=saved.objects[0].id;
   map[role]={typeId,fields:def.logicalFields,writableFields:Object.keys(def.logicalFields)};
   bindings.push({typeId,fields:def.fields.map((x:any)=>x.key)});
   fields.push(...def.fields.map((x:any)=>({id:manifestFieldId(role,x.key),typeId,field:x.key,schemaVersion:0,kind:x.kind,mode:'write'})));
  }
  if(new Set(fields.map(x=>x.id)).size!==fields.length)fail(500,'template_schema','Installer field identities collide');
  const catalog=new AppTemplates(undefined,db),template=await catalog.read({templateId:v.templateId,version:v.version});
  const configuration:any={};
  if(template.options.tableMap)configuration.tableMap=JSON.stringify(map);
  const today=new Date().toISOString().slice(0,10);
  for(const key of ['asOf','asOfDate','cutoff','startWeek'])if(template.options[key])configuration[key]=today;
  if(template.options.planMonth)configuration.planMonth=today.slice(0,7);
  // createNew and sharedTables only steer installation above; the strict preparation schema accepts neither.
  const {createNew:_createNew,sharedTables:_sharedTables,...request}=v;
  const operation=await catalog.operation(scoped,a,w,{...request,configuration,bindings,manifest:fields.length?{version:1,scope:'workspace',fields}:undefined});
  // Approved immutable publisher source has already been reviewed; normal validation still runs.
  const draft=await scoped.preview(a,w,operation,true),preview=draft.reviewState==='draft'?(await scoped.finalizeAppPreview(a,w,draft.id,draft.digest)).preview:draft,saved=await scoped.confirm(a,w,preview.id,preview.digest);
  const result={appId:saved.id,workspaceId:w,url:appUrl({appId:saved.id,workspaceId:w,source:'component'}),templateRequestKey:v.requestKey,templateId:v.templateId,templateVersion:v.version,templateDigest:v.digest,name:v.name};
  await tx.query('INSERT INTO workspace_receipts(id,workspace_id,user_id,digest,result) VALUES($1,$2,$3,$4,$5)',[randomUUID(),w,a.userId,v.digest,JSON.stringify(result)]);
  return result;
 });
}

/**
 * Existing tables an installation can reuse: for each shareable role (core contract roles and optional
 * partner roles), tables that a live app already binds under the same role key, that the installer can
 * read, and whose fields are compatible (same kinds for shared keys, every required field present).
 * Missing optional fields are listed in addFields and are added only for writable roles.
 */
export async function sharedTableCandidates(db:Connection,a:Actor,w:string,schema:Record<string,any>):Promise<any[]>{
 const roles=(Object.entries(schema??{}) as [string,any][]).filter(([,d])=>d?.contract==='core.v1'||d?.optional===true);
 if(!roles.length)return [];
 const core=JSON.parse(await readFile('templates/core-contract/v1.json','utf8'));
 const comps=(await db.query('SELECT id,name,source,bindings FROM workspace_components WHERE workspace_id=$1 AND NOT archived AND deleted_at IS NULL ORDER BY created_at,id',[w])).rows;
 const bound=new Map<string,Map<string,string[]>>();
 for(const c of comps){
  const line=/^const templateConfiguration=(.+);\n/.exec(String(c.source??''));if(!line)continue;
  let tableMap:any;try{tableMap=JSON.parse(JSON.parse(line[1]).tableMap||'{}');}catch{continue;}
  for(const [role,m] of Object.entries(tableMap??{}) as [string,any][]){
   if(!roles.some(([r])=>r===role)||typeof m?.typeId!=='string'||!(c.bindings??[]).some((b:any)=>b.typeId===m.typeId))continue;
   const byType=bound.get(role)??new Map();const apps=byType.get(m.typeId)??[];if(!apps.includes(c.name))apps.push(c.name);byType.set(m.typeId,apps);bound.set(role,byType);
  }
 }
 const out:any[]=[];
 for(const [role,def] of roles){
  const candidates:any[]=[];
  for(const [typeId,apps] of bound.get(role)??[]){
   let type:any;try{type=(await typeAccess(db,a,w,typeId)).type;}catch{continue;}
   if(type.archived_at||type.deleted_at)continue;
   // A core table has every contract field; only fields an app owns may be missing (they are added). A partner output has every declared field.
   const owned=def.contract==='core.v1'?new Set((core.roles?.[role]?.fields??[]).filter((f:any)=>f.owner).map((f:any)=>f.key)):new Set();
   const compatible=def.fields.every((x:any)=>{const f=type.fields.find((f:any)=>f.key===x.key);return f?f.kind===x.kind&&!f.multiple&&(x.kind!=='select'||(x.options??[]).every((o:string)=>(f.options??[]).includes(o))):owned.has(x.key);});
   const addFields=def.fields.filter((x:any)=>!type.fields.some((f:any)=>f.key===x.key)).map((x:any)=>x.key);
   if(!compatible||(def.readOnly&&addFields.length))continue;
   const records=Number((await db.query("SELECT count(*) AS n FROM records WHERE type_id=$1 AND workspace_id=$2 AND state<>'archived'",[typeId,w])).rows[0].n);
   candidates.push({typeId,name:type.name,records,apps,addFields});
  }
  if(candidates.length)out.push({role,name:def.name,optional:def.optional===true,readOnly:def.readOnly===true,candidates});
 }
 return out;
}
/** What Use will reuse for an approved template (read only). */
export async function readCatalogInstallation(db:Database,a:Actor,w:string,input:unknown){
 const v=catalogInstallationRead.parse(input);
 const row=(await db.query("SELECT install_schema FROM app_template_catalog WHERE template_id=$1 AND version=$2 AND status='approved'",[v.templateId,v.version])).rows[0];
 if(!row)fail(404,'not_found','Template unavailable');
 return {templateId:v.templateId,version:v.version,roles:await sharedTableCandidates(db,a,w,row.install_schema)};
}

/** Manifest field IDs allow [a-z0-9_]; role keys may be namespaced (e.g. runway.plan_lines, programs.plan_items). */
export function manifestFieldId(role:string,key:string){return (role+'_'+key).toLowerCase().replace(/[^a-z0-9_]/g,'_').slice(0,64);}
function canonical(value:any):any{return Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;}
