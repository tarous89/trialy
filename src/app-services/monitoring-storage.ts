import {randomUUID} from 'node:crypto';
import type {Database} from '../db/database.js';
import {withActor} from '../db/context.js';
import {typeAccess,visibleFields} from '../domain/permissions.js';
import {audit,revision} from '../domain/evidence.js';
import {derived} from '../shared/formulas.js';
import {fail,type Actor} from '../shared/schema.js';
import {WorkspaceFoundation} from '../workspace/service.js';
import {maintenanceSchema} from '../workspace/schema.js';
import type {MonitoringConfig} from './monitoring-schema.js';

export type StorageGrant={body:ReturnType<typeof maintenanceSchema.parse>;schemaStamp:string};

/** Resolve write intent for the SAME automation review. Never create authority in preparation. */
export async function prepareResultStorage(db:Database,a:Actor,w:string,config:MonitoringConfig,monitorId:string){
 const actor:Actor={...a,origin:'ai',accessToolId:config.appId};
 return withActor(actor,async()=>{
  const f=new WorkspaceFoundation(db),app=await f.component(db,actor,w,config.appId);
  const next:MonitoringConfig={...config,storeResults:true};
  if(config.writeScopes.length&&!config.writeBindings){
   for(const ref of config.writeScopes){const scope=await f.scope(db,actor,w,ref.scopeId),body=maintenanceSchema.parse(scope.body);if(body.monitorId&&body.monitorId!==monitorId)fail(403,'monitoring_write_scope','This write permission belongs to another automation');if(!body.allowCreate&&!body.allowUpdate)fail(403,'result_storage_required','Research and drafting require permission to save results in the app database');}
   return {config:next,grants:[] as StorageGrant[]};
  }
  const requested=config.writeBindings??app.bindings.map((b:any)=>({...b,allowCreate:true,allowUpdate:true})),bindings=[];
  for(const binding of requested){
   const bound=app.bindings.find((b:any)=>b.typeId===binding.typeId);
   if(!bound||binding.fields.some((k:string)=>!bound.fields.includes(k)))fail(403,'monitoring_write_scope','Result storage must stay within the linked app');
   let writable:string[];
   try{const {type,policy}=await typeAccess(db,actor,w,binding.typeId,true);writable=visibleFields(type.fields,policy,actor).filter(f=>policy.write_fields.includes(f.key)&&!derived(f)).map(f=>f.key);}
   catch(e:any){if(config.writeBindings||![403,404].includes(e.status))throw e;continue;}
   if(config.writeBindings&&binding.fields.some((k:string)=>!writable.includes(k)))fail(403,'result_storage_required','The selected result fields are not writable by this assistant through the app');
   const fields=binding.fields.filter((k:string)=>writable.includes(k));if(fields.length)bindings.push({...binding,fields});
  }
  if(!bindings.length)fail(409,'result_storage_required','Research and drafting need a writable app database destination. Connect result fields and allow the selected assistant to write before activating.');
  if(bindings.length>20)fail(400,'result_storage_limit','Select at most 20 result tables');
  next.writeScopes=[];next.writeBindings=bindings;
  // Writers must be able to read their destination to deduplicate and reconcile saved results.
  next.readBindings=config.readBindings.map(b=>({...b,fields:[...b.fields]}));
  for(const b of bindings){const read=next.readBindings.find(r=>r.typeId===b.typeId);if(read)read.fields=[...new Set([...read.fields,...b.fields])];else next.readBindings.push({typeId:b.typeId,fields:b.fields});}
  if(next.readBindings.length>20)fail(400,'result_storage_limit','Select at most 20 read/result tables');
  const grants:StorageGrant[]=[];
  for(const binding of bindings){
   const body=maintenanceSchema.parse({monitorId,autoWrite:true,expiresAt:config.expiresAt,projectId:app.project_id,purpose:config.objective.slice(0,1000),inclusionCriteria:config.instructions.slice(0,1000),sourcePolicy:config.sourcePolicy.slice(0,1000),basis:'repeated_actions',bindings:[{typeId:binding.typeId,fields:binding.fields}],allowCreate:binding.allowCreate,allowUpdate:binding.allowUpdate,allowIdentityLinks:false,maxChanges:Math.min(config.maxChangesPerRun,200)});
   grants.push({body,schemaStamp:await f.scopeStamp(db,actor,w,body)});
  }
  return {config:next,grants};
 });
}

/** Called only inside the transaction that confirms the exact automation review. */
export async function saveResultStorage(db:Database,a:Actor,w:string,policy:any,grants:StorageGrant[],reviewId:string){
 const refs=[];
 for(const grant of grants){
  const id=randomUUID();
  await db.query('INSERT INTO maintenance_scopes(id,workspace_id,user_id,project_id,body,schema_stamp) VALUES($1,$2,$3,$4,$5,$6)',[id,w,a.userId,grant.body.projectId,JSON.stringify(grant.body),grant.schemaStamp]);
  const after={id,body:grant.body,version:0,schemaStamp:grant.schemaStamp,approvalId:reviewId};
  await revision(db,a,w,id,'maintenance_scope',0,after);await audit(db,a,policy,'monitoring.storage_authorized',id,null,after);
  refs.push({scopeId:id,version:0});
 }
 return refs;
}
