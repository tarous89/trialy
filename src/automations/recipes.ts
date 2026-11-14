import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Database} from '../db/database.js';
import {withActor} from '../db/context.js';
import {access} from '../domain/permissions.js';
import {audit,checksum} from '../domain/evidence.js';
import {requireCurrentAction} from '../domain/write-authorization.js';
import {fail,id,type Actor} from '../shared/schema.js';
import {appPublicUrl} from '../shared/public-url.js';
import {WorkspaceFoundation} from '../workspace/service.js';
import {AppActions} from '../app-services/service.js';
import {AppMonitoring} from '../app-services/monitoring.js';
import {chatServiceReview,checkServiceReview} from '../app-services/review.js';
import {AutomationService,adapter} from './service.js';
import {actorAssistant,requireAutomationOwner} from './ownership.js';
import {readRecipes,configuredRecipe,recipeSettings,type AutomationRecipe} from './recipes-schema.js';

export const recipesEnabled=()=>process.env.APP_AUTOMATION_RECIPES_ENABLED==='true';
const canonical=(v:any):any=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const recipeDigest=(v:unknown)=>checksum(JSON.stringify(canonical(v)));
export const recipePreparation=z.object({appId:id,key:z.string().max(64),contextRecordId:id.optional(),settings:recipeSettings.default({})}).strict();
const scope=(c:any)=>recipeDigest({bindings:c.bindings,manifest:c.manifest,execution:c.execution});
async function owner(db:Database,a:Actor,w:string){const p=await access(db,a,w,true);if(p.role!=='owner')fail(403,'owner_required','Only the owner can set up app automations');return p;}
async function app(db:Database,a:Actor,w:string,appId:string){await owner(db,a,w);const c=(await new WorkspaceFoundation(db).readComponent(a,w,appId)).component;if(c.archived||c.project_archived)fail(409,'app_archived','Restore the app before setting up automation');return c;}
export function recipeRoles(c:any){return {...c.manifest?.automationRoles,...Object.fromEntries((c.manifest?.roles??[]).filter((r:any)=>r.typeId).map((r:any)=>[r.role,r.typeId]))};}

async function liveDefinition(db:Database,row:any){
 if(!row.definition_id)return false;
 const table=row.definition_kind==='research'?'app_monitors':'app_actions';
 return !!(await db.query(`SELECT id FROM ${table} WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND app_id=$4 AND deleted_at IS NULL`,[row.definition_id,row.workspace_id,row.user_id,row.app_id])).rows.length;
}

/** Persist reviewed inputs only. Optional resolution belongs to the post-install worker. */
export function installationRecipeIntent(recipe:AutomationRecipe,settings:z.infer<typeof recipeSettings>,step:any,templateDigest:string){
 const runners=step.automationRunners.filter((r:any)=>settings.runnerId===undefined||r.id===settings.runnerId);
 const runner=recipe.research&&settings.runnerId!==null&&runners.length===1?runners[0]:null;
 return {recipe,contextRecordId:null,installation:{templateDigest,settings:{...settings,runnerId:settings.runnerId??runner?.id??null,recipients:settings.recipients??[step.automationRecipient]},runnerVersion:runner?.version??null,runnerAssistant:runner?.assistant??null},expiresAt:new Date(Date.now()+recipe.lifetimeDays*86400000).toISOString()};
}

export async function recipeSetupOptions(db:Database,a:Actor,w:string){
 const runners=(await db.query('SELECT id,version,assistant,enabled FROM automation_runners WHERE workspace_id=$1 AND user_id=$2 ORDER BY assistant',[w,a.userId])).rows.filter(r=>a.origin!=='ai'||r.assistant===(a.assistant??'chatgpt'));
 const recipient=(await db.query('SELECT email FROM users WHERE id=$1',[a.userId])).rows[0]?.email;
 return {runners,recipient};
}

/** Bounded discovery is independent of app loading and never creates definitions. */
export async function readAppRecipes(db:Database,a:Actor,w:string,appId:string){
 const c=await app(db,a,w,appId),declarations=readRecipes(c.manifest);
 if(!recipesEnabled())return {appId,recipes:[],setups:[],enabled:false};
 const setups=(await db.query(`SELECT s.id,s.recipe_key,s.context_key,
 CASE WHEN s.definition_id IS NOT NULL AND m.id IS NULL AND d.id IS NULL THEN 'cancelled' ELSE s.status END AS status,
 CASE WHEN m.id IS NOT NULL OR d.id IS NOT NULL THEN s.definition_id END AS definition_id,s.definition_kind,s.diagnostic,s.assistant
 FROM automation_recipe_setups s LEFT JOIN app_monitors m ON s.definition_kind='research' AND m.id=s.definition_id AND m.deleted_at IS NULL
 LEFT JOIN app_actions d ON s.definition_kind='action' AND d.id=s.definition_id AND d.deleted_at IS NULL
 WHERE s.workspace_id=$1 AND s.user_id=$2 AND s.app_id=$3 ORDER BY s.created_at DESC LIMIT 100`,[w,a.userId,appId])).rows;
 return {appId,...await recipeSetupOptions(db,a,w),recipes:declarations.recipes,unavailable:declarations.unavailable,setups:setups.map(s=>({...s,status:s.status==='active'?'configured':s.status})),enabled:true};
}

export async function listRecipeSetups(db:Database,a:Actor,w:string,appId?:string,offset=0){
 await owner(db,a,w);if(!recipesEnabled())return {rows:[],nextOffset:null};
 const rows=(await db.query("SELECT s.id,s.app_id,s.recipe_key,s.body->'recipe'->>'name' AS name,s.status,s.diagnostic,s.revision FROM automation_recipe_setups s WHERE workspace_id=$1 AND user_id=$2 AND status IN ('pending','needs_setup') AND ($3::uuid IS NULL OR app_id=$3) ORDER BY created_at DESC,id LIMIT 21 OFFSET $4",[w,a.userId,appId??null,offset])).rows;
 const visible=[];for(const r of rows.slice(0,20))try{const c=await app(db,a,w,r.app_id);visible.push({...r,appName:c.name});}catch{}
 return {rows:visible,nextOffset:rows.length>20?offset+20:null};
}
export async function cancelRecipeSetup(db:Database,a:Actor,w:string,setupId:string,revision:number){
 requireCurrentAction(a);return db.transaction(async tx=>{await owner(adapter(tx),a,w);await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);
 const row=(await tx.query('SELECT * FROM automation_recipe_setups WHERE id=$1 AND workspace_id=$2 AND user_id=$3 FOR UPDATE',[setupId,w,a.userId])).rows[0];
 if(!row||row.revision!==revision||await liveDefinition(adapter(tx),row))fail(409,'setup_changed','Reload setup; manage saved definitions from the automation list');
 // Like pausing a saved automation, cancellation may stop either assistant's work.
 await tx.query("UPDATE automation_recipe_setups SET status='cancelled',revision=revision+1,diagnostic='owner_cancelled',updated_at=now() WHERE id=$1",[row.id]);return {id:row.id,status:'cancelled'};
 });
}
export async function recipeContexts(db:Database,a:Actor,w:string,appId:string,key:string,offset=0){
 const c=await app(db,a,w,appId),r=readRecipes(c.manifest).recipes.find(r=>r.key===key),typeId=r?.contextRole&&recipeRoles(c)[r.contextRole];
 if(!typeId)fail(400,'recipe_context','This feature does not need an app entry');
 const f=new WorkspaceFoundation(db),actor={...a,accessToolId:appId},rows=(await db.query("SELECT id FROM records WHERE workspace_id=$1 AND type_id=$2 AND state<>'archived' ORDER BY id LIMIT 21 OFFSET $3",[w,typeId,offset])).rows,visible=[];
 for(const row of rows.slice(0,20))try{const record=await withActor(actor,()=>f.record(db,actor,w,row.id)),fields=c.bindings.find((x:any)=>x.typeId===typeId)?.fields??[];const label=fields.map((k:string)=>record.data[k]).find((x:any)=>typeof x==='string'&&x);visible.push({id:row.id,label:typeof label==='string'?label.slice(0,150):'App entry'});}catch{}
 return {rows:visible,nextOffset:rows.length>20?offset+20:null};
}

/** Freeze actual identities at approval, including account recipient and runner (if configured). */
export async function recipeIntent(db:Database,a:Actor,w:string,c:any,recipe:AutomationRecipe,settings:z.infer<typeof recipeSettings>,contextRecordId?:string){
 const r=configuredRecipe(recipe,settings),roles=recipeRoles(c);
 if(!!r.contextRole!==!!contextRecordId)fail(400,'recipe_context','Select an app entry for this feature');
 let contextLabel:string|null=null;
 if(contextRecordId){const record=await new WorkspaceFoundation(db).record(db,{...a,accessToolId:c.id},w,contextRecordId);if(record.state==='archived'||record.type_id!==roles[r.contextRole!])fail(403,'record_scope','Choose a current entry from this app feature');const fields=c.bindings.find((x:any)=>x.typeId===record.type_id)?.fields??[],label=fields.map((k:string)=>record.data[k]).find((x:any)=>typeof x==='string'&&x);contextLabel=typeof label==='string'?label.slice(0,150):'Selected app entry';}
 const account=(await db.query('SELECT email FROM users WHERE id=$1',[a.userId])).rows[0];
 // Choosing no runner keeps a pending, non-executing intent. A later connection never enables it automatically.
 const runners=r.research&&settings.runnerId!==null?(await db.query('SELECT id,version,assistant FROM automation_runners WHERE workspace_id=$1 AND user_id=$2 AND ($3::uuid IS NULL OR id=$3) ORDER BY created_at LIMIT 3',[w,a.userId,settings.runnerId??null])).rows:[];
 const eligible=runners.filter(x=>a.origin!=='ai'||(x.assistant??'chatgpt')===(a.assistant??'chatgpt'));
 const runner=eligible.length===1?eligible[0]:null;

 const parent=r.trigger.kind==='after'?(await db.query("SELECT m.id,m.version FROM automation_recipe_setups s JOIN app_monitors m ON m.id=s.definition_id WHERE s.workspace_id=$1 AND s.user_id=$2 AND s.app_id=$3 AND s.recipe_key=$4 AND s.context_key='' AND m.deleted_at IS NULL AND m.workspace_id=$1 AND m.user_id=$2 AND m.app_id=$3",[w,a.userId,c.id,r.trigger.recipe])).rows[0]??null:null;
 const summary=r.email?.summaryBinding?c.execution.find((x:any)=>x.name===r.email?.summaryBinding):null;
 const installed=(await db.query("SELECT result FROM workspace_receipts WHERE workspace_id=$1 AND user_id=$2 AND result->>'appId'=$3 AND result ? 'templateId' LIMIT 1",[w,a.userId,c.id])).rows[0]?.result;
 const provenance=installed?{appId:c.id,templateId:installed.templateId,templateVersion:installed.templateVersion,templateDigest:installed.templateDigest}:{appId:c.id};
 const brief=r.research?.briefBinding?c.execution.find((x:any)=>x.name===r.research?.briefBinding):null;
 return {recipe:r,parent,brief:brief?{binding:brief.name,revisionId:brief.revisionId}:null,provenance,summary:summary?{binding:summary.name,revisionId:summary.revisionId}:null,roles,scope:scope(c),appVersion:c.version,contextRecordId:contextRecordId??null,contextLabel,runnerId:settings.runnerId??runner?.id??null,runnerVersion:runner?.version??null,runnerAssistant:runner?.assistant??null,recipients:settings.recipients??[account.email.toLowerCase()],expiresAt:new Date(Date.now()+r.lifetimeDays*86400000).toISOString()};
}

export async function saveRecipeIntent(db:Database,a:Actor,w:string,appId:string,body:any){
 requireCurrentAction(a);const p=await owner(db,a,w),digest=recipeDigest(body),context=body.contextRecordId??'';
 const prior=(await db.query('SELECT * FROM automation_recipe_setups WHERE workspace_id=$1 AND user_id=$2 AND app_id=$3 AND recipe_key=$4 AND context_key=$5 FOR UPDATE',[w,a.userId,appId,body.recipe.key,context])).rows[0];
 if(prior){requireAutomationOwner(a,prior.assistant);const live=await liveDefinition(db,prior);if(live||prior.status==='pending'&&prior.digest===digest)return {id:prior.id,status:live?'existing':prior.status,definitionId:live?prior.definition_id:null,definitionKind:prior.definition_kind};}
 const setupId=prior?.id??randomUUID();
 if(prior)await db.query("UPDATE automation_recipe_setups SET body=$2,digest=$3,status='pending',attempts=0,diagnostic=NULL,definition_id=NULL,definition_kind=NULL,definition_version=NULL,revision=revision+1,available_at=now(),updated_at=now(),assistant=$4 WHERE id=$1",[setupId,JSON.stringify(body),digest,actorAssistant(a)]);
 else await db.query('INSERT INTO automation_recipe_setups(id,workspace_id,user_id,app_id,recipe_key,context_key,assistant,body,digest) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[setupId,w,a.userId,appId,body.recipe.key,context,actorAssistant(a),JSON.stringify(body),digest]);
 const saved=(await db.query('SELECT revision,assistant FROM automation_recipe_setups WHERE id=$1',[setupId])).rows[0];
 await db.query('INSERT INTO automation_recipe_approvals(id,setup_id,revision,workspace_id,user_id,assistant,body,digest) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),setupId,saved.revision,w,a.userId,saved.assistant,JSON.stringify(body),digest]);
 await audit(db,a,p,'automation_recipe.approved',setupId,null,{digest,appId,recipe:body.recipe.key,contextRecordId:body.contextRecordId});
 return {id:setupId,status:'pending',definitionId:null};
}

export async function prepareAppRecipe(db:Database,a:Actor,w:string,input:unknown){
 if(!recipesEnabled())fail(409,'recipes_unavailable','App automation features are not enabled');
 const v=recipePreparation.parse(input),c=await app(db,a,w,v.appId),recipe=readRecipes(c.manifest).recipes.find(r=>r.key===v.key);
 if(!recipe)fail(404,'recipe_unavailable','This app feature is unavailable');
 const body={appId:c.id,...await recipeIntent(db,a,w,c,recipe,v.settings,v.contextRecordId)},reviewId=randomUUID(),digest=recipeDigest(body);
 await db.query("INSERT INTO app_service_previews(id,workspace_id,user_id,kind,body,digest,assistant) VALUES($1,$2,$3,'automation_recipe',$4,$5,$6)",[reviewId,w,a.userId,JSON.stringify(body),digest,actorAssistant(a)]);
 return {id:reviewId,kind:'automation_recipe',digest,body,...chatServiceReview(w,reviewId,'automation_recipe',digest,body),status:'review_required',reviewUrl:appPublicUrl()+'/?tab=apps&workspaceId='+w+'&serviceReview='+reviewId};
}
export async function confirmAppRecipe(db:Database,a:Actor,w:string,reviewId:string,digest:string,review?:string){
 requireCurrentAction(a);if(!recipesEnabled())fail(409,'recipes_unavailable','App automation features are not enabled');
 return db.transaction(async tx=>{const d=adapter(tx);await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const r=await new AppActions(d).preview(a,w,reviewId);
 if(r.kind!=='automation_recipe'||r.digest!==digest)fail(409,'review_changed','Review changed');checkServiceReview(a,w,r,review);if(r.consumed_at)return r.result;
 const c=await app(d,a,w,r.body.appId);if(scope(c)!==r.body.scope)fail(409,'scope_changed','App features changed; review again');
 const result=await saveRecipeIntent(d,a,w,c.id,r.body);await tx.query('UPDATE app_service_previews SET consumed_at=now(),result=$2 WHERE id=$1',[reviewId,JSON.stringify(result)]);return result;
 });
}

/** One bounded, database-only step in the existing isolated automation worker. */
export async function reconcileRecipeSetups(db:Database){
 if(!recipesEnabled())return false;
 const candidate=(await db.query("SELECT id,workspace_id FROM automation_recipe_setups WHERE status='pending' AND available_at<=now() ORDER BY available_at,id LIMIT 1")).rows[0];if(!candidate)return false;
 await db.transaction(async tx=>{
  await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[candidate.workspace_id]);
  const row=(await tx.query("SELECT * FROM automation_recipe_setups WHERE id=$1 AND status='pending' FOR UPDATE SKIP LOCKED",[candidate.id])).rows[0];if(!row)return;
  const d=adapter(tx),approved=row.body,w=row.workspace_id;let b=approved,r=b.recipe as AutomationRecipe;
  // Authority is the exact durable owner approval above; the worker cannot invent or expand it.
  const a:Actor={userId:row.user_id,origin:row.assistant?'ai':'human',...(row.assistant?{assistant:row.assistant}:{}),actionConfirmed:true};
  await tx.query('SAVEPOINT recipe_setup');
  try{await withActor(a,async()=>{
   const approval=(await tx.query('SELECT digest,body,assistant FROM automation_recipe_approvals WHERE setup_id=$1 AND revision=$2',[row.id,row.revision])).rows[0];
   if(!approval||approval.digest!==row.digest||approval.assistant!==row.assistant||recipeDigest(approval.body)!==row.digest||recipeDigest(approved)!==row.digest)fail(409,'review_changed','Stored approval changed');
   const c=await app(d,a,w,row.app_id);
   if(approved.installation){
    if(c.version!==0)fail(409,'scope_changed','App changed after installation; review automation setup');
    const settings=recipeSettings.parse(approved.installation.settings);
    b={...await recipeIntent(d,a,w,c,r,settings),expiresAt:approved.expiresAt};r=b.recipe;
    if(b.provenance.templateDigest!==approved.installation.templateDigest)fail(409,'scope_changed','Installed template changed');
    if(b.runnerVersion!==approved.installation.runnerVersion||b.runnerAssistant!==approved.installation.runnerAssistant)fail(409,'runner_changed','Review setup after the background connection changed');
   }else if(scope(c)!==b.scope)fail(409,'scope_changed','App scope changed');
   if(Date.parse(b.expiresAt)<=Date.now())fail(409,'approval_expired','Automation approval expired');
   const type=(role:string)=>{const t=b.roles[role];if(!t||!c.bindings.some((x:any)=>x.typeId===t))fail(409,'role_unavailable','The app feature needs a connected table');return t;};
   let trigger:any={...r.trigger};if(trigger.kind==='record_date')trigger.catchUpDays=7;if('role' in trigger){const {role,...rest}=trigger;trigger={...rest,typeId:type(role)};}
   if(r.contextRole&&b.contextRecordId)trigger.recordId=b.contextRecordId;
   // A fresh approval after deletion must not reuse a retired research authoring key.
   const authoringKey='recipe_'+row.id.replaceAll('-','')+'_r'+row.revision;
   let saved:any;
   if(r.research){
    if(r.research.briefBinding&&!b.brief)fail(409,'brief_binding','Bind the reviewed research brief first');
    if(!b.runnerId)fail(409,'runner_required','Choose a verified background connection');
    const runner=await new AutomationService(d).runner(a,w,b.runnerId);if(runner.version!==b.runnerVersion)fail(409,'runner_changed','Review setup after the background connection changed');
    await new AutomationService(d).requireReady(a,w,b.runnerId);
    const s=new AppMonitoring(d),p=await s.prepare(a,w,{config:{name:r.name,appId:c.id,inheritAppAccess:true,...(b.brief?{brief:b.brief}:{}),objective:r.research.objective,instructions:r.research.instructions,sourcePolicy:r.research.sourcePolicy,readBindings:r.research.readBindings.map(x=>({typeId:type(x.role),fields:x.fields})),writeScopes:[],schedule:{description:r.description,timeZone:trigger.timeZone??'UTC'},automation:{runnerId:b.runnerId,trigger},authoringKey,expiresAt:b.expiresAt}});
    saved=await s.confirm(a,w,p.id,p.digest,p.review);
   }else{
    if(r.email?.summaryBinding&&!b.summary)fail(409,'summary_binding','Bind the reviewed summary function first');
    if(trigger.kind==='after'){
     const parent=(await tx.query("SELECT s.* FROM automation_recipe_setups s LEFT JOIN app_monitors m ON m.id=s.definition_id AND m.deleted_at IS NULL WHERE s.workspace_id=$1 AND s.user_id=$2 AND s.app_id=$3 AND s.recipe_key=$4 AND s.context_key='' AND (s.definition_id IS NULL OR m.id IS NOT NULL)",[w,a.userId,c.id,trigger.recipe])).rows[0];
     if(!b.parent&&parent?.status==='pending'){await tx.query("UPDATE automation_recipe_setups SET available_at=now()+interval '10 seconds',diagnostic='waiting_for_parent' WHERE id=$1",[row.id]);return;}
     if(!b.parent&&(!parent?.definition_id||parent.status!=='active'))fail(409,'parent_required','Enable the selected research feature first');
     trigger={kind:'database',source:'automation_runs',automationId:b.parent?.id??parent.definition_id,automationVersion:b.parent?.version??parent.definition_version,includeEmpty:trigger.when==='completed',meaningful:trigger.when==='meaningful',events:['updated'],fields:['status'],becomes:{field:'status',operator:'equals',value:'completed'}};
    }
    const s=new AppActions(d),p=await s.prepare(a,w,{config:{name:r.name,appId:c.id,appVersion:c.version,trigger,...(trigger.typeId?{recordTypeId:trigger.typeId,fields:[...new Set([...(r.email?.fields??[]),...(r.email?.memberField?[r.email.memberField]:[]),...(trigger.field?[trigger.field]:[]),...(trigger.fields??[]),...(trigger.becomes?[trigger.becomes.field]:[])])]}:{}),steps:[{id:'email',kind:'email',...(r.email?.memberField?{memberField:r.email.memberField}:{}),...(b.summary?{summary:b.summary}:{}),to:b.recipients,subject:r.email!.subject,text:r.email!.text}],authoringKey,expiresAt:b.expiresAt}});
    saved=await s.confirm(a,w,p.id,p.digest,p.review);
   }
   await tx.query("UPDATE automation_recipe_setups SET status='active',definition_id=$2,definition_kind=$3,definition_version=$4,diagnostic=NULL,updated_at=now() WHERE id=$1",[row.id,saved.id,r.research?'research':'action',saved.version]);
  });await tx.query('RELEASE SAVEPOINT recipe_setup');
  }catch(e:any){await tx.query('ROLLBACK TO SAVEPOINT recipe_setup');const retry=['40001','40P01','53300','57P01','57014','08006'].includes(e.code)&&row.attempts<2;await tx.query("UPDATE automation_recipe_setups SET status=$2,attempts=attempts+1,diagnostic=$3,available_at=now()+interval '30 seconds',updated_at=now() WHERE id=$1",[row.id,retry?'pending':'needs_setup',typeof e.code==='string'?e.code.slice(0,100):'setup_unavailable']);}
 });return true;
}
