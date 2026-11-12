import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {Database,Connection} from '../db/database.js';
import {audit} from '../domain/evidence.js';
import {access} from '../domain/permissions.js';
import {requireCurrentAction} from '../domain/write-authorization.js';
import {fail,id,type Actor} from '../shared/schema.js';
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
export const dataAccessTarget=z.object({install}).strict();
export const dataAccessPrepareShape={install,connections};
export const dataAccessCommitShape={install,connections,stepDigest:digest64};
const prepareInput=z.object(dataAccessPrepareShape).strict(),commitInput=z.object(dataAccessCommitShape).strict();
const tx=(db:Connection):Database=>({query:db.query.bind(db) as any,transaction:fn=>fn(db),close:async()=>{}});

/** The existing tables an installation can connect to, one row per role. `needed` is false when there are none. */
export async function dataAccessStep(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 const v=dataAccessTarget.parse(input);
 const row=(await f.db.query("SELECT install_schema,payload FROM app_template_catalog WHERE template_id=$1 AND version=$2 AND status='approved'",[v.install.templateId,v.install.version])).rows[0];
 if(!row)fail(404,'not_found','Template unavailable');
 const tables=(await sharedTableCandidates(f.db,a,w,row.install_schema)).map((r:any)=>({role:r.role,name:r.name,readOnly:r.readOnly,
  // Another app's read-only output cannot be created by this app; its second option is to not use it.
  alternative:r.readOnly?'skip':'new',candidates:r.candidates.map((c:any)=>({typeId:c.typeId,name:c.name,records:c.records,apps:c.apps})),choice:r.candidates[0].typeId}));
 const identity={install:{templateId:v.install.templateId,version:v.install.version},tables:tables.map(t=>[t.role,t.candidates.map((c:any)=>c.typeId)])};
 return {app:v.install.name??row.payload?.name??v.install.templateId,needed:tables.length>0,tables,digest:createHash('sha256').update(JSON.stringify(identity)).digest('hex')};
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
  const sf=new WorkspaceFoundation(tx(t)),step=await dataAccessStep(sf,a,w,{install:v.install});
  if(step.digest!==v.stepDigest)fail(409,'data_access_changed','Your tables changed. Review the choice again.');
  validate(step,v.connections);
  const sharedTables=Object.fromEntries(step.tables.map((r:any)=>[r.role,v.connections[r.role]??r.choice]));
  const i=v.install,receipt=await installCatalogApp(sf,a,w,{templateId:i.templateId,version:i.version,digest:i.digest!,name:i.name!,requestKey:i.requestKey!,...(i.createNew?{createNew:true}:{}),...(Object.keys(sharedTables).length?{sharedTables}:{})});
  await audit(t,a,await access(t,a,w),'workspace.data_access_step',receipt.appId,null,{tables:sharedTables});
  await t.query("DELETE FROM workspace_previews WHERE workspace_id=$1 AND user_id=$2 AND body->'operation'->>'kind'='data_access_step'",[w,a.userId]);
  return receipt;
 });
}
