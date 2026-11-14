import {readRecipes,recipeChoices} from '../automations/recipes-schema.js';
import {recipesEnabled,installationRecipeIntent,saveRecipeIntent,recipeDigest,recipeSetupOptions} from '../automations/recipes.js';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {Database,Connection} from '../db/database.js';
import {audit} from '../domain/evidence.js';
import {access} from '../domain/permissions.js';
import {AccessGrid,rowKey} from '../domain/access-grid.js';
import {AccessManagement} from '../domain/access-management.js';
import {requireCurrentAction} from '../domain/write-authorization.js';
import {fail,id,ASSISTANT_NAMES,type Actor} from '../shared/schema.js';
import {WorkspaceFoundation} from './service.js';
import {installCatalogApp,sharedTableCandidates} from './template-catalog.js';
import {roleKey} from './role-contracts.js';

/**
 * Data access step (docs/product/MODULAR_APPS_AND_SHARED_DATA.md §7): when an app is installed and existing tables can serve
 * its roles, the user chooses per table: connect the existing table, or create a new one. Nothing else is asked, and nothing
 * connects after installation. With nothing to connect the step is skipped and the app gets new tables.
 */
const digest64=z.string().regex(/^[a-f0-9]{64}$/);
const install=z.object({templateId:z.string().max(80),version:z.string().max(30),digest:digest64.optional(),name:z.string().trim().min(1).max(100).optional(),requestKey:z.string().uuid().optional(),createNew:z.boolean().optional()}).strict();
/** Per role: the existing table to connect, or 'new' (another app's read-only output: not used). Omitted roles connect. */
const connections=z.record(roleKey,z.union([id,z.literal('new')])).default({});
/** Who can use the app: people none/view/edit, ChatGPT and Claude none/read/propose. Omitted subjects keep the project's access. */
const accessLevels=z.array(z.object({subject:z.union([id,z.literal('chatgpt'),z.literal('claude')]),level:z.enum(['none','view','edit','read','propose'])}).strict()).max(500).default([]);
export const dataAccessTarget=z.object({install}).strict();
export const dataAccessPrepareShape={install,connections};
export const dataAccessCommitShape={install,connections,access:accessLevels,automations:recipeChoices.optional(),stepDigest:digest64};
const prepareInput=z.object(dataAccessPrepareShape).strict(),commitInput=z.object(dataAccessCommitShape).strict();
const tx=(db:Connection):Database=>({query:db.query.bind(db) as any,transaction:fn=>fn(db),close:async()=>{}});

/** Who can use the new app. It inherits the project's access; only the owner, signed in on the website, changes it here. */
async function accessSection(db:Connection,a:Actor,w:string){
 const p=await access(db,a,w);
 if(p.role!=='owner'||a.origin!=='human')return {canChange:false,people:[],assistants:[],version:p.access_version};
 const project=(await db.query("SELECT id FROM workspace_nodes WHERE workspace_id=$1 AND kind='project' AND parent_id IS NULL AND archived=false ORDER BY CASE WHEN name='Project 1' THEN 0 ELSE 1 END,created_at,id LIMIT 1",[w])).rows[0]?.id;
 const key=project?rowKey('project',project):null,grid=new AccessGrid(tx(db));
 const level=async(subject:string)=>{if(!key)return null;try{const r=(await grid.read(a,w,subject)).rows.find((x:any)=>x.key===key);return r?{read:r.read===true,write:r.write===true}:null;}catch{return null;}};
 const people=[];for(const x of (await new AccessManagement(tx(db)).overview(a,w)).people.filter((x:any)=>x.role!=='owner')){const g=await level(x.id);people.push({id:x.id,name:x.name||x.email,level:!g?'view':g.write?'edit':g.read?'view':'none',levels:x.role==='inspector'?['none','view']:['none','view','edit']});}
 const assistants=[];for(const x of ['chatgpt','claude'] as const){const g=await level(x);assistants.push({id:x,name:ASSISTANT_NAMES[x],level:!g?'propose':g.write?'propose':g.read?'read':'none',levels:['none','read','propose']});}
 return {canChange:true,people,assistants,version:p.access_version};
}

/** The existing tables an installation can connect to (one row per role) and who can use the app. Skipped when there is nothing to decide. */
export async function dataAccessStep(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 const v=dataAccessTarget.parse(input);
 const row=(await f.db.query("SELECT install_schema,payload,digest FROM app_template_catalog WHERE template_id=$1 AND version=$2 AND status='approved'",[v.install.templateId,v.install.version])).rows[0];
 if(!row)fail(404,'not_found','Template unavailable');
 const tables=(await sharedTableCandidates(f.db,a,w,row.install_schema)).map((r:any)=>({role:r.role,name:r.name,readOnly:r.readOnly,
  // Another app's read-only output cannot be created by this app; its second option is to not use it.
  alternative:r.readOnly?'skip':'new',candidates:r.candidates.map((c:any)=>({typeId:c.typeId,name:c.name,records:c.records,apps:c.apps})),choice:r.candidates[0].typeId}));
 const accessRows=await accessSection(f.db,a,w);
 const canAutomate=recipesEnabled()&&(await access(f.db,a,w)).role==='owner';
 const offers=canAutomate?readRecipes(row.payload):{recommended:[],unavailable:[]};
 const account=offers.recommended.length?(await f.db.query('SELECT email FROM users WHERE id=$1',[a.userId])).rows[0]:null;
 const setupOptions=offers.recommended.length?await recipeSetupOptions(f.db,a,w):{runners:[]};
 const identity={runners:setupOptions.runners,automationRecipes:offers.recommended,templateDigest:row.digest,recipient:account?.email??null,install:{templateId:v.install.templateId,version:v.install.version},tables:tables.map(t=>[t.role,t.candidates.map((c:any)=>c.typeId)]),access:[accessRows.version,...[...accessRows.people,...accessRows.assistants].map((x:any)=>[x.id,x.level])]};
 // Shown when there are tables to connect, or when the signed-in owner can decide access before the app exists.
 return {app:v.install.name??row.payload?.name??v.install.templateId,needed:tables.length>0||accessRows.canChange||offers.recommended.length>0,automations:offers.recommended,automationRunners:setupOptions.runners,automationRecipient:account?.email??null,automationUnavailable:offers.unavailable,tables,access:accessRows,digest:createHash('sha256').update(JSON.stringify(identity)).digest('hex')};
}

function validate(step:any,choices:Record<string,string>){
 for(const [role,choice] of Object.entries(choices)){const t=step.tables.find((x:any)=>x.role===role);if(!t)fail(409,'data_access_changed','Your tables changed. Review the choice again.');if(choice!=='new'&&!t.candidates.some((c:any)=>c.typeId===choice))fail(409,'data_access_changed','That table is no longer available. Review the choice again.');}
}

/** An assistant prepares the step with proposed choices; only the user confirms it in the review view. */
export async function prepareDataAccess(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 const v=prepareInput.parse(input),step=await dataAccessStep(f,a,w,{install:v.install});validate(step,v.connections);
 if(a.origin==='ai'&&Object.keys(v.connections).length)await f.db.query('INSERT INTO workspace_previews(id,workspace_id,user_id,body,digest) VALUES(gen_random_uuid(),$1,$2,$3,$4)',[w,a.userId,JSON.stringify({operation:{kind:'data_access_step'},proposal:v.connections}),step.digest]);
 return {...step,tables:step.tables.map((t:any)=>v.connections[t.role]?{...t,choice:v.connections[t.role]}:t),confirmation:'Shown to the user when they add the app. Assistants cannot confirm it.'};
}
/** Choices an assistant proposed for this installation, to prefill the dialog. */
export async function preparedChoices(db:Connection,a:Actor,w:string,step:any){
 return (await db.query("SELECT body FROM workspace_previews WHERE workspace_id=$1 AND user_id=$2 AND body->'operation'->>'kind'='data_access_step' AND expires_at>now() AND digest=$3 ORDER BY expires_at DESC LIMIT 1",[w,a.userId,step.digest])).rows[0]?.body?.proposal??null;
}

/** Installs the app with the reviewed choices in one transaction, or nothing. */
export async function confirmDataAccess(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 requireCurrentAction(a);
 const v=commitInput.parse(input);
 if(!v.install.digest||!v.install.requestKey||!v.install.name)fail(400,'install_request','Installation needs the template digest, name and request key');
 return f.db.transaction(async t=>{
  await access(t,a,w,true);await t.query('SELECT pg_advisory_xact_lock(hashtext($1))',[a.userId+':'+w+':'+v.install.requestKey]);
  const requestDigest=recipeDigest(v),replay=(await t.query("SELECT digest,result FROM workspace_receipts WHERE workspace_id=$1 AND user_id=$2 AND result->>'dataAccessRequestKey'=$3",[w,a.userId,v.install.requestKey])).rows[0];
  if(replay){if(replay.digest!==requestDigest)fail(409,'receipt_conflict','Request differs from its saved installation');return replay.result;}
  const sf=new WorkspaceFoundation(tx(t)),step=await dataAccessStep(sf,a,w,{install:v.install});
  if(step.digest!==v.stepDigest)fail(409,'data_access_changed','Your tables changed. Review the choice again.');
  validate(step,v.connections);
  const sharedTables=Object.fromEntries(step.tables.map((r:any)=>[r.role,v.connections[r.role]??r.choice]));
  const i=v.install,receipt=await installCatalogApp(sf,a,w,{templateId:i.templateId,version:i.version,digest:i.digest!,name:i.name!,requestKey:i.requestKey!,...(i.createNew?{createNew:true}:{}),...(Object.keys(sharedTables).length?{sharedTables}:{})});
  // Access chosen before installing: app rules saved by the Access tab's own rules, in the same transaction.
  const current=new Map<string,string>([...step.access.people,...step.access.assistants].map((x:any)=>[x.id,x.level]));
  for(const x of v.access)if(!current.has(x.subject)||!([...step.access.people,...step.access.assistants].find((r:any)=>r.id===x.subject)!.levels.includes(x.level)))fail(400,'invalid_access','Choose a listed person or assistant and one of its access levels');
  const changes=v.access.filter(x=>current.get(x.subject)!==x.level).map(x=>({subject:x.subject,kind:'tool' as const,resourceId:receipt.appId,read:x.level!=='none',write:x.level==='edit'||x.level==='propose'}));
  if(changes.length){if(!step.access.canChange)fail(403,'human_required','Change access in your signed-in owner session on the TrialAgents website.');await new AccessGrid(tx(t)).save(a,w,{expectedVersion:(await access(t,a,w)).access_version,changes});}
  await audit(t,a,await access(t,a,w),'workspace.data_access_step',receipt.appId,null,{tables:sharedTables,access:changes.map(c=>({subject:c.subject,read:c.read,write:c.write}))});
  await t.query("DELETE FROM workspace_previews WHERE workspace_id=$1 AND user_id=$2 AND body->'operation'->>'kind'='data_access_step'",[w,a.userId]);
  const selections=v.automations??[];
  if(selections.some(x=>!step.automations.some((r:any)=>r.key===x.key)))fail(409,'recipes_changed','Review the app automations again');
  const setups:any[]=[];if(selections.some(x=>x.enabled)){
   for(const choice of selections.filter(x=>x.enabled)){const recipe=step.automations.find((r:any)=>r.key===choice.key)!;
    // An opted-out parent leaves its follow-up unselected, never an independent email schedule.
    if(recipe.trigger.kind==='after'&&!selections.some(x=>x.enabled&&x.key===(recipe.trigger as any).recipe)){setups.push({key:recipe.key,status:'opted_out',reason:'parent_not_selected'});continue;}
    setups.push({key:recipe.key,...await saveRecipeIntent(tx(t),a,w,receipt.appId,installationRecipeIntent(recipe,choice.settings,step,i.digest!))});
   }
  }
  for(const recipe of step.automations)if(!selections.some(x=>x.key===recipe.key&&x.enabled))setups.push({key:recipe.key,status:v.automations===undefined?'not_reviewed':'opted_out'});
  const result={...receipt,dataAccessRequestKey:v.install.requestKey,automations:setups,automationStatus:setups.some(x=>x.status==='pending')?'pending':'none'};
  await t.query('INSERT INTO workspace_receipts(id,workspace_id,user_id,digest,result) VALUES(gen_random_uuid(),$1,$2,$3,$4)',[w,a.userId,requestDigest,JSON.stringify(result)]);
  return result;
 });
}
