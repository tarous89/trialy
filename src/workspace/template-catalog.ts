import {archivedTemplateApps} from './archive.js';
import {requireCurrentAction} from '../domain/write-authorization.js';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {z} from 'zod';
import type {Database} from '../db/database.js';
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

export const catalogInstallation=z.object({templateId:z.string().max(80),version:z.string().max(30),digest:z.string().regex(/^[a-f0-9]{64}$/),requestKey:z.string().uuid(),name:z.string().trim().min(1).max(100),createNew:z.boolean().optional()}).strict();
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
  for(const [role,def] of Object.entries(row.install_schema) as [string,any][]){
   const base=(v.name+' · '+def.name).slice(0,90);let tableName=base,index=2;while(usedNames.has(tableName))tableName=base+' ('+(index++)+')';usedNames.add(tableName);
   const p=await service.preview(a,w,{kind:'create_type',name:tableName,fields:def.fields});
   const saved=await service.commit(a,p.id,p.digest),typeId=saved.objects[0].id;
   map[role]={typeId,fields:def.logicalFields,writableFields:Object.keys(def.logicalFields)};
   bindings.push({typeId,fields:def.fields.map((x:any)=>x.key)});
   fields.push(...def.fields.map((x:any)=>({id:role+'_'+x.key,typeId,field:x.key,schemaVersion:0,kind:x.kind,mode:'write'})));
  }
  const catalog=new AppTemplates(undefined,db),template=await catalog.read({templateId:v.templateId,version:v.version});
  const configuration:any={};
  if(template.options.tableMap)configuration.tableMap=JSON.stringify(map);
  const today=new Date().toISOString().slice(0,10);
  for(const key of ['asOf','asOfDate','cutoff','startWeek'])if(template.options[key])configuration[key]=today;
  if(template.options.planMonth)configuration.planMonth=today.slice(0,7);
  const operation=await catalog.operation(scoped,a,w,{...v,configuration,bindings,manifest:fields.length?{version:1,scope:'workspace',fields}:undefined});
  // Approved immutable publisher source has already been reviewed; normal validation still runs.
  const draft=await scoped.preview(a,w,operation,true),preview=draft.reviewState==='draft'?(await scoped.finalizeAppPreview(a,w,draft.id,draft.digest)).preview:draft,saved=await scoped.confirm(a,w,preview.id,preview.digest);
  const result={appId:saved.id,workspaceId:w,url:appUrl({appId:saved.id,workspaceId:w,source:'component'}),templateRequestKey:v.requestKey,templateId:v.templateId,templateVersion:v.version,templateDigest:v.digest,name:v.name};
  await tx.query('INSERT INTO workspace_receipts(id,workspace_id,user_id,digest,result) VALUES($1,$2,$3,$4,$5)',[randomUUID(),w,a.userId,v.digest,JSON.stringify(result)]);
  return result;
 });
}

function canonical(value:any):any{return Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;}
