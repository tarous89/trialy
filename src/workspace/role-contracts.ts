import {readFile} from 'node:fs/promises';
import {z} from 'zod';
import type {Connection} from '../db/database.js';
import {typeAccess} from '../domain/permissions.js';
import {fail,id,type Actor} from '../shared/schema.js';

/**
 * Role-based connections (docs/product/MODULAR_APPS_AND_SHARED_DATA.md §7).
 * Apps never depend on which other app is installed; they declare role keys with a versioned contract.
 * Templates declare roles in their installer schema; custom apps declare them in their manifest (`manifest.roles`).
 */
export const roleKey=z.string().regex(/^[a-z][a-z0-9_]{0,39}(\.[a-z][a-z0-9_]{0,39})?$/,'Use a lowercase role key such as organizations or runway.month_closes');
export const contractKey=z.string().regex(/^[a-z][a-z0-9_]{0,39}\.v[0-9]{1,4}$/,'Use a versioned contract such as core.v1 or runway.v2');
export const roleDeclaration=z.object({
 role:roleKey,contract:contractKey,
 /** Contract versions this app reads (7.5). Defaults to [contract]. A newer superset version is also accepted. */
 reads:z.array(contractKey).min(1).max(10).optional(),
 /** Only ever connected, never created (another app's output, an optional shared table). */
 optional:z.boolean().optional(),
 readOnly:z.boolean().optional(),
 /** The bound table. Omitted only for an optional role that is not used. */
 typeId:id.optional(),
 /** Field keys to bind when an unconnected role is connected later (from the contract). */
 fields:z.array(z.string().regex(/^[a-z][a-z0-9_]{0,63}$/)).min(1).max(100).optional()
}).strict();
export type RoleDeclaration=z.infer<typeof roleDeclaration>;
export type ContractField={key:string;name:string;kind:string;required?:boolean;multiple?:boolean;options?:string[];owner?:string;description?:string};
export type RoleContract={role:string;name:string;kind:'core'|'output'|'app';writer?:string;description?:string;versions:Record<string,{fields:ContractField[]}>};
export type Registry={registry:'role-contracts';version:string;rules:string;core:{contract:string;source:string;rules:string};roles:Record<string,RoleContract>};

let cached:Promise<Registry>|null=null;
/** Core contract v1 and every published app output contract, in one read-only registry (gap 7.3). */
export function contractRegistry():Promise<Registry>{
 cached??=(async()=>{
  const core=JSON.parse(await readFile(new URL('../../templates/core-contract/v1.json',import.meta.url),'utf8'));
  const outputs=JSON.parse(await readFile(new URL('../../templates/contracts/outputs.json',import.meta.url),'utf8'));
  const roles:Record<string,RoleContract>={};
  for(const [role,def] of Object.entries(core.roles) as [string,any][])roles[role]={role,name:def.name,kind:'core',...(def.description?{description:def.description}:{}),versions:{[core.contract]:{fields:def.fields}}};
  for(const [role,def] of Object.entries(outputs.roles) as [string,any][])roles[role]={role,...def};
  return {registry:'role-contracts',version:outputs.version,rules:outputs.rules,core:{contract:core.contract,source:core.source,rules:core.rules},roles};
 })();
 return cached;
}

const sameField=(older:ContractField,newer:ContractField)=>newer.kind===older.kind&&!!newer.multiple===!!older.multiple&&(older.options??[]).every(o=>(newer.options??[]).includes(o));
/** A newer version is compatible for readers of an older one only if it is a superset (gap 7.5). */
export function isSuperset(newer:ContractField[],older:ContractField[]){return older.every(o=>{const n=newer.find(f=>f.key===o.key);return !!n&&sameField(o,n);});}
/** Whether a reader that declares `reads` can read a table written under `written`. */
export function readerAccepts(registry:Registry,role:string,reads:string[],written:string|null|undefined){
 if(!written||reads.includes(written))return true;
 const versions=registry.roles[role]?.versions;const w=versions?.[written];
 return !!w&&reads.some(r=>!!versions[r]&&isSuperset(w.fields,versions[r].fields));
}
/**
 * Field compatibility, exactly as template reuse checks it: same kind, scalar, the table offers every contract option,
 * and every required field is present. Fields in `missingOk` (owned optional core fields) may be missing; they are added.
 */
export function tableCompatible(fields:ContractField[],tableFields:any[],missingOk:Set<string>=new Set()){
 const problems:string[]=[];
 for(const x of fields){const f=tableFields.find((f:any)=>f.key===x.key);
  if(!f){if(!missingOk.has(x.key))problems.push(`missing ${x.key}`);continue;}
  if(f.kind!==x.kind)problems.push(`${x.key} is ${f.kind}, the contract needs ${x.kind}`);
  else if(!!f.multiple!==!!x.multiple)problems.push(`${x.key} has a different cardinality`);
  else if(x.kind==='select'&&!(x.options??[]).every(o=>(f.options??[]).includes(o)))problems.push(`${x.key} lacks contract options`);
 }
 return {compatible:!problems.length,problems,addFields:fields.filter(x=>!tableFields.some((f:any)=>f.key===x.key)).map(x=>x.key)};
}
export function contractFields(registry:Registry,role:string,contract:string){return registry.roles[role]?.versions[contract]?.fields??null;}

/** templateConfiguration.tableMap of a catalog app (role → {typeId, fields, writableFields}). */
export function templateTableMap(source:unknown):Record<string,any>|null{
 const line=/^const templateConfiguration=(.+);\n/.exec(String(source??''));if(!line)return null;
 try{const map=JSON.parse(JSON.parse(line[1]).tableMap||'null');return map&&typeof map==='object'?map:null;}catch{return null;}
}
export function withTableMap(source:string,map:any){return source.replace(/^const templateConfiguration=(.+);\n/,(_:string,json:string)=>'const templateConfiguration='+JSON.stringify({...JSON.parse(json),tableMap:JSON.stringify(map)})+';\n');}

export type AppRole=RoleDeclaration&{name:string;writable:boolean;source:'manifest'|'template';logicalFields?:Record<string,string>;def?:any};
/** Catalog origin of an installed app: the first revision that records it. */
async function catalogSchema(db:Connection,w:string,appId:string,cache?:Map<string,any>){
 const key='origin:'+appId;if(cache?.has(key))return cache.get(key);
 const row=(await db.query("SELECT snapshot->'catalogOrigin' AS origin FROM revisions WHERE workspace_id=$1 AND object_id=$2 AND object_kind='workspace_component' AND jsonb_typeof(snapshot->'catalogOrigin')='object' ORDER BY version DESC LIMIT 1",[w,appId])).rows[0];
 let schema=null;
 if(row?.origin?.id){const s=(await db.query('SELECT install_schema FROM app_template_catalog WHERE template_id=$1 AND version=$2',[row.origin.id,row.origin.version])).rows[0];schema=s?.install_schema??null;}
 cache?.set(key,schema);return schema;
}
/**
 * Roles an app declares. Custom apps (and templates installed since this change) declare them in manifest.roles;
 * earlier catalog installs are read from their templateConfiguration.tableMap and installer schema.
 */
export async function appRoles(db:Connection,w:string,c:any,cache?:Map<string,any>):Promise<AppRole[]>{
 const writes=(typeId?:string)=>!!typeId&&(c.manifest?.fields??[]).some((f:any)=>f.typeId===typeId&&f.mode==='write');
 const registry=await contractRegistry(),map=templateTableMap(c.source);
 if(Array.isArray(c.manifest?.roles)){
  const schema=map?await catalogSchema(db,w,c.id,cache):null;
  // A role whose table was unbound (a removed tab) is not connected; re-adding the binding reconnects it.
  const isBound=(t?:string)=>!!t&&(c.bindings??[]).some((b:any)=>b.typeId===t);
  return c.manifest.roles.map(({typeId,...r}:RoleDeclaration)=>({...r,...(isBound(typeId)?{typeId}:{}),name:registry.roles[r.role]?.name??schema?.[r.role]?.name??r.role,writable:!r.readOnly&&isBound(typeId)&&writes(typeId),source:map?'template':'manifest',...(schema?.[r.role]?{def:schema[r.role],logicalFields:schema[r.role].logicalFields}:{})}));
 }
 if(!map)return [];
 const schema=await catalogSchema(db,w,c.id,cache),out:AppRole[]=[];
 const bound=(typeId:any)=>typeof typeId==='string'&&(c.bindings??[]).some((b:any)=>b.typeId===typeId);
 for(const [role,def] of Object.entries(schema??{}) as [string,any][]){
  // Only roles with a versioned contract are role-labelled; earlier templates' plain table keys are not.
  if(!def?.contract||!roleKey.safeParse(role).success)continue;
  const m=map[role],typeId=bound(m?.typeId)?m.typeId:undefined;
  if(!typeId&&!def.optional)continue;
  out.push({role,contract:def.contract,...(def.optional?{optional:true}:{}),...(def.readOnly?{readOnly:true}:{}),...(typeId?{typeId}:{}),fields:def.fields.map((f:any)=>f.key),name:def.name,writable:!def.readOnly&&writes(typeId),source:'template',logicalFields:def.logicalFields,def});
 }
 // An installer schema is unavailable: keep the roles the table map binds.
 if(!schema)for(const [role,m] of Object.entries(map) as [string,any][])if(bound(m?.typeId)&&registry.roles[role]){const versions=Object.keys(registry.roles[role].versions);out.push({role,contract:versions.at(-1)!,typeId:m.typeId,name:registry.roles[role]?.name??role,writable:writes(m.typeId)&&(m.writableFields??[]).length>0,source:'template',logicalFields:m.fields});}
 return out;
}
export type RoleTable={appId:string;appName:string;archived:boolean;createdAt:any;role:string;contract:string;typeId:string;writable:boolean;readOnly:boolean};
/** Every table bound under a role by an app that is not permanently deleted (live apps first, in creation order). */
export async function roleTables(db:Connection,w:string,opts:{includeArchived?:boolean}={},cache?:Map<string,any>):Promise<{apps:any[];tables:RoleTable[]}>{
 const apps=(await db.query(`SELECT id,name,source,bindings,manifest,archived,created_at FROM workspace_components WHERE workspace_id=$1 AND deleted_at IS NULL ${opts.includeArchived?'':'AND NOT archived'} ORDER BY archived,created_at,id`,[w])).rows;
 const tables:RoleTable[]=[];
 for(const c of apps)for(const r of await appRoles(db,w,c,cache))if(r.typeId)tables.push({appId:c.id,appName:c.name,archived:!!c.archived,createdAt:c.created_at,role:r.role,contract:r.contract,typeId:r.typeId,writable:r.writable,readOnly:!!r.readOnly});
 return {apps,tables};
}

/** Current writer of an output table: the registered writer, else the first app that binds it writable. */
export async function outputWriter(db:Connection,w:string,typeId:string,role:string,cache?:Map<string,any>){
 const row=(await db.query('SELECT r.*,c.name,c.archived,c.deleted_at FROM role_writers r JOIN workspace_components c ON c.id=r.app_id WHERE r.workspace_id=$1 AND r.type_id=$2',[w,typeId])).rows[0];
 if(row)return {appId:row.app_id as string,name:row.name as string,archived:!!row.archived,deleted:!!row.deleted_at,contract:row.contract as string,registered:true};
 const {tables}=await roleTables(db,w,{includeArchived:true},cache);
 const first=tables.filter(t=>t.typeId===typeId&&t.role===role&&t.writable).sort((a,b)=>Number(a.archived)-Number(b.archived))[0];
 return first?{appId:first.appId,name:first.appName,archived:first.archived,deleted:false,contract:first.contract,registered:false}:null;
}

/**
 * Validates role declarations on an app save (gaps 7.2, 7.4, 7.5): known core roles and contract versions,
 * field compatibility exactly as template reuse checks it, read-only roles have no write fields,
 * one writer per output table (takeover only from an archived or deleted writer, by an owner), and readers
 * accept the writer's contract version. With `apply`, registers the writer in the same transaction.
 */
export async function validateAppRoles(db:Connection,a:Actor,w:string,app:{id?:string|null;name:string;manifest:any;bindings:any[];source?:string},opts:{takeover?:string[];apply?:boolean;role?:string}={}){
 const declared:RoleDeclaration[]|undefined=app.manifest?.roles;
 if(!declared?.length)return;
 const registry=await contractRegistry(),cache=new Map<string,any>();
 const parsed=declared.map(r=>roleDeclaration.parse(r));
 if(new Set(parsed.map(r=>r.role)).size!==parsed.length)fail(400,'duplicate_role','Each role key is declared once per app');
 const typed=parsed.filter(r=>r.typeId);if(new Set(typed.map(r=>r.typeId)).size!==typed.length)fail(400,'duplicate_role_table','A table carries one role per app');
 for(const r of parsed){
  const known=registry.roles[r.role],label=known?.name??r.role;
  if(!r.typeId&&!r.optional)fail(400,'role_unbound',`Bind a table for the ${label} role, or mark the role optional`);
  if(!known&&!r.role.includes('.'))fail(400,'unknown_core_role',`${r.role} is not a core role. Namespace app roles (for example myapp.items); new core roles are added to the core contract first.`);
  if(known){
   if(!known.versions[r.contract])fail(400,'unknown_contract',`${label} has no contract ${r.contract}. Published versions: ${Object.keys(known.versions).join(', ')}.`);
   for(const v of r.reads??[])if(!known.versions[v])fail(400,'unknown_contract',`${label} has no contract ${v}`);
  }
  if(r.fields&&known){const keys=known.versions[r.contract].fields.map(f=>f.key);const extra=r.fields.filter(k=>!keys.includes(k));if(extra.length)fail(400,'role_fields',`${label} ${r.contract} has no field ${extra.join(', ')}`);}
  if(!r.typeId)continue;
  // A role whose table is no longer bound (a removed tab) is simply not connected.
  const binding=app.bindings.find((b:any)=>b.typeId===r.typeId);if(!binding)continue;
  const writes=(app.manifest.fields??[]).filter((f:any)=>f.typeId===r.typeId&&f.mode==='write');
  if(r.readOnly&&writes.length)fail(400,'role_read_only',`${label} is declared read-only; bind its fields with mode read`);
  if(!known)continue;
  const {type}=await typeAccess(db,a,w,r.typeId);
  const contract=known.versions[r.contract].fields;
  // Readers bind a subset; writers of an output provide every contract field. Core owned fields may be missing (they are added).
  const owned=new Set(known.kind==='core'?contract.filter(f=>f.owner).map(f=>f.key):[]);
  const needed=r.readOnly||known.kind==='core'?contract.filter(f=>binding.fields.includes(f.key)||(known.kind==='core'&&f.required)):contract;
  const check=tableCompatible(needed,type.fields,owned);
  if(!check.compatible)fail(409,'role_incompatible',`${type.name} does not match ${label} ${r.contract}: ${check.problems.slice(0,3).join('; ')}`);
  if(known.kind!=='output')continue;
  const writer=await outputWriter(db,w,r.typeId,r.role,cache),self=app.id&&writer?.appId===app.id;
  if(!r.readOnly&&writes.length){
   if(writer&&!self){
    if(!writer.archived&&!writer.deleted)fail(409,'role_writer_exists',`${writer.name} writes ${label}. Bind it read-only, or archive ${writer.name} first.`);
    if(!opts.takeover?.includes(r.role))fail(409,'role_writer_takeover',`${writer.name} (archived) wrote ${label}. An owner can choose to take over writing it.`);
    if((await db.query("SELECT 1 FROM workspaces w JOIN memberships m ON m.tenant_id=w.tenant_id AND m.user_id=$2 WHERE w.id=$1 AND m.role='owner'",[w,a.userId])).rows.length===0)fail(403,'owner_required','Only the workspace owner can choose a new writer for an output');
   }
   // A writer moving to another version keeps its readers working only if the new version is a superset (7.5).
   if(writer?.contract&&writer.contract!==r.contract&&(self||!writer.registered)){
    const {tables}=await roleTables(db,w,{},cache);const broken=tables.filter(t=>t.typeId===r.typeId&&t.role===r.role&&t.appId!==app.id&&!readerAccepts(registry,r.role,[t.contract],r.contract));
    if(broken.length)fail(409,'contract_breaks_readers',`${r.contract} is not a superset of ${writer.contract}, which ${[...new Set(broken.map(t=>t.appName))].join(', ')} read${broken.length===1?'s':''}. Publish an additive version or update those apps first.`);
   }
   if(opts.apply&&app.id){
    if(!writer||self||!writer.registered&&writer.appId===app.id)await db.query('INSERT INTO role_writers(workspace_id,type_id,role,app_id,contract) VALUES($1,$2,$3,$4,$5) ON CONFLICT(workspace_id,type_id) DO UPDATE SET contract=EXCLUDED.contract,role=EXCLUDED.role WHERE role_writers.app_id=EXCLUDED.app_id',[w,r.typeId,r.role,app.id,r.contract]);
    else{
     if(!writer.registered)await db.query('INSERT INTO role_writers(workspace_id,type_id,role,app_id,contract) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[w,r.typeId,r.role,writer.appId,writer.contract]);
     await db.query('UPDATE role_writers SET app_id=$3,contract=$4,since=now(),taken_over_from=$5 WHERE workspace_id=$1 AND type_id=$2',[w,r.typeId,app.id,r.contract,writer.appId]);
    }
   }
  }
  else if(!readerAccepts(registry,r.role,r.reads??[r.contract],writer?.contract))fail(409,'contract_version',`${writer!.name} writes ${label} as ${writer!.contract}; this app reads ${(r.reads??[r.contract]).join(', ')}.`);
 }
}

/** Writes to an output table come only from its writer (gap 7.4). Database edits by people are unaffected. */
export async function requireRoleWriter(db:Connection,w:string,c:any,typeId:string,cache:Map<string,any>){
 const key='writer:'+c.id+':'+typeId;if(cache.has(key))return;
 const registry=await contractRegistry();
 for(const r of await appRoles(db,w,c,cache)){
  if(r.typeId!==typeId||registry.roles[r.role]?.kind!=='output')continue;
  const writer=await outputWriter(db,w,typeId,r.role,cache);
  if(writer&&writer.appId!==c.id)fail(403,'role_writer',`${writer.name} writes ${registry.roles[r.role].name}; ${c.name} can read it.`);
 }
 cache.set(key,true);
}
