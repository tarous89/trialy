import {functionDeclarations,readAppFunctions} from './app-functions-schema.js';
import {recipeDeclarations} from '../automations/recipes-schema.js';
import {contractRegistry} from './role-contracts.js';
import type {Database} from '../db/database.js';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {appPreparationFields} from '../shared/app-design.js';
import {GUIDE_VERSION,guideFiles} from './guide.js';
import {fail,id,type Actor} from '../shared/schema.js';
import {componentContent} from './schema.js';
import {trackerSetup,trackerOperation} from './tracker-template.js';
import type {WorkspaceFoundation} from './service.js';
import {templateAvailable,requireTemplateAvailable,type TemplateChannel} from './template-availability.js';
const key=z.string().regex(/^[a-z][a-z0-9.-]{0,79}$/),version=z.string().regex(/^\d+\.\d+\.\d+$/);
const option=z.object({type:z.enum(['string','number','boolean']),description:z.string().max(1000),required:z.boolean().default(false),default:z.union([z.string(),z.number(),z.boolean()]).optional(),enum:z.array(z.string()).max(50).optional()}).strict();
const prose=z.string().min(1).max(6000),items=z.array(prose).min(1).max(20);
const documentation=z.object({quickStart:items,dataContract:prose,interactionContract:prose,lifecycle:prose,limitations:items,examples:z.array(z.object({prompt:prose,expectedBehavior:prose}).strict()).min(1).max(5),tasks:z.object({mode:z.enum(['optional','none']),whenUseful:prose,readRequirements:prose,outputContract:prose,promptExample:prose}).strict()}).strict();
export const appTemplateEntry=z.object({...recipeDeclarations,...functionDeclarations,id:key,version,name:z.string().min(1).max(100),description:z.string().min(1).max(1000),tags:z.array(z.string().max(50)).max(20),whenToUse:z.string().min(1).max(2000),whenNotToUse:z.string().min(1).max(2000),instructions:z.string().min(1).max(20000),documentation:documentation.optional(),engine:z.enum(['tracker','frontend-js']),defaults:z.record(z.string(),z.unknown()).default({}),options:z.record(z.string().regex(/^[a-z][a-zA-Z0-9_]{0,63}$/),option).default({}),source:z.string().max(240000).optional(),examples:z.array(z.record(z.string(),z.unknown())).max(5).default([]),deprecated:z.boolean().default(false),
 /* 7.1, 7.2: a new major version names the earlier versions it upgrades (same tables and helpers; options may differ),
  * and a version can be declared speed-only by its publisher (applied automatically to unchanged copies, D15). */
 upgradeFrom:z.array(version).max(20).optional(),speedOnly:z.boolean().optional()}).strict();
export const templateQuery=z.object({query:z.string().max(200).default(''),offset:z.number().int().min(0).default(0),limit:z.number().int().min(1).max(50).default(20)}).strict();
export const templateRead=z.object({templateId:key,version:version.optional(),includeFunctionSource:z.boolean().default(false)}).strict();
/** 5.6: guide (design) and reference (technical); authoring and usage are the old names of the same two, kept as aliases. */
export const templateGuidanceRequest=z.object({resource:z.enum(['guide','reference','authoring','usage','contracts']).default('guide'),offset:z.number().int().min(0).default(0)}).strict();
export const templateGuidance={tool:'read_app_template_guidance',version:GUIDE_VERSION,resources:['guide','reference','contracts'],aliases:{authoring:'guide',usage:'reference'},hostedAttribution:'Apps open inside TrialAgents below its header, which shows the app name and status. Add no header, sidebar, message bar, footer or attribution badge of your own; use the host navigation adapter for same-tab app links and the Apps destination.',usage:'Read the guide (design principles) before designing or changing an app, and the reference (runtime, data, saving, installation) before writing code or installing; read contracts (the role contract registry) before declaring roles on a custom app.'};
export async function readTemplateGuidance(input:unknown={}){
 const {resource:asked,offset}=templateGuidanceRequest.parse(input),resource=asked==='authoring'?'guide':asked==='usage'?'reference':asked;
 // contracts: the read-only role contract registry (core contract v1 and every published app output contract), as JSON text.
 const files=guideFiles(),source=resource==='contracts'?JSON.stringify(await contractRegistry(),null,1):resource==='guide'?files.guide:files.reference;
 if(offset>source.length)fail(400,'guidance_offset','Offset exceeds guidance length');
 const text=source.slice(offset,offset+12000),end=offset+text.length;
 return {...templateGuidance,resource,...(asked!==resource?{alias:asked}:{}),guideChecksum:files.checksum,sha256:createHash('sha256').update(source).digest('hex'),offset,totalCharacters:source.length,nextOffset:end<source.length?end:null,text};
}
export const templatePrepare=z.object({...appPreparationFields,templateId:key,version,digest:z.string().regex(/^[a-f0-9]{64}$/),name:z.string().trim().min(1).max(100),projectId:id.nullable().default(null),configuration:z.record(z.string(),z.unknown()).default({}),bindings:componentContent.shape.bindings,manifest:componentContent.shape.manifest}).strict();
const directory=new URL('../../templates/apps/',import.meta.url);
type CatalogEntry=z.infer<typeof appTemplateEntry>&{digest:string};
/** Validated payloads of published versions, by identity and digest. Frozen: every caller shares them. */
const parsedCatalog=new Map<string,CatalogEntry>(),CATALOG_CACHE_LIMIT=500;
function deepFreeze<T>(value:T):T{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const v of Object.values(value as object))deepFreeze(v);}return value;}
/** Publisher-controlled files only. Never load an arbitrary caller URL or filesystem path. */
export class AppTemplates{
 /** With a channel, apps switched off for it (templates/catalog-availability.json) are neither listed nor readable. Without one, the whole approved catalog is visible (installed apps, internal checks). */
 constructor(private root:URL|string=directory,private db?:Database,private channel?:TemplateChannel){}
 private async entries(){return (await this.allEntries()).filter(t=>!this.channel||templateAvailable(t.id,this.channel));}
 private async allEntries(){
  if(this.db){
   // Approval status is read on every call. A published version is immutable (syncTemplateCatalog), so its
   // validated payload is loaded once per process and reused; only versions not yet held are fetched.
   const approved=(await this.db.query("SELECT template_id,version,digest FROM app_template_catalog WHERE status='approved' ORDER BY template_id,version")).rows;
   const held=(r:any)=>parsedCatalog.get(r.template_id+'@'+r.version+'#'+r.digest),missing=approved.filter(r=>!held(r));
   if(missing.length){
    const rows=(await this.db.query("SELECT template_id,version,digest,payload FROM app_template_catalog WHERE status='approved' AND digest=ANY($1::text[])",[missing.map(r=>r.digest)])).rows;
    for(const r of rows){if(parsedCatalog.size>=CATALOG_CACHE_LIMIT)parsedCatalog.clear();parsedCatalog.set(r.template_id+'@'+r.version+'#'+r.digest,deepFreeze({...appTemplateEntry.parse(r.payload),digest:r.digest}));}
   }
   // A version withdrawn between the two reads is simply left out.
   return approved.map(held).filter((t):t is CatalogEntry=>!!t);
  }
  const names=(await readdir(this.root)).filter(n=>n.endsWith('.json')).sort();if(names.length>500)fail(500,'catalog_limit','Template catalog exceeds its bounded size');
  const entries=[];const seen=new Set<string>();
  for(const name of names){const raw=await readFile(this.root instanceof URL?new URL(name,this.root):`${this.root}/${name}`,'utf8');if(Buffer.byteLength(raw)>380000)fail(500,'template_limit','Template too large');const input=JSON.parse(raw);const value=appTemplateEntry.parse(input);const identity=value.id+'@'+value.version;if(seen.has(identity))fail(500,'template_duplicate','Duplicate template version');seen.add(identity);entries.push({...value,digest:createHash('sha256').update(raw).digest('hex')});}
  return entries;
 }
 /** Every approved version of one app, oldest first (installed copies are matched against these). */
 async versions(templateId:string){return (await this.allEntries()).filter(t=>t.id===templateId).sort((a,b)=>compare(a.version,b.version));}
 /** The approved version whose code is exactly this saved template code, if any. */
 async matching(body:string){return (await this.allEntries()).find(t=>typeof t.source==='string'&&t.source.length===body.length&&t.source===body)??null;}
 async list(input:unknown={}){
  const q=templateQuery.parse(input),latest=new Map<string,Awaited<ReturnType<AppTemplates['entries']>>[number]>();
  for(const t of await this.entries()){const prev=latest.get(t.id);if(!prev||compare(t.version,prev.version)>0)latest.set(t.id,t);}
  const matches=[...latest.values()].filter(t=>!t.deprecated&&q.query.toLowerCase().split(/\s+/).every(term=>`${t.name} ${t.description} ${t.tags.join(' ')} ${t.whenToUse}`.toLowerCase().includes(term))).sort((a,b)=>a.name.localeCompare(b.name));
  return {guidance:templateGuidance,templates:matches.slice(q.offset,q.offset+q.limit).map(({source,options,defaults,instructions,documentation,examples,functions,recommendedAutomations,automationFeatures,...summary})=>({...summary,functionCount:readAppFunctions({functions}).functions.length,automationCount:recommendedAutomations?.length??0})),total:matches.length,nextOffset:q.offset+q.limit<matches.length?q.offset+q.limit:null};
 }
 async identity(input:unknown){
  const v=templateRead.parse(input);if(this.channel)requireTemplateAvailable(v.templateId,this.channel);
  if(!this.db||!v.version){const t=await this.read(v);return {id:t.id,version:t.version,digest:t.digest};}
  const t=(await this.db.query("SELECT template_id,version,digest FROM app_template_catalog WHERE template_id=$1 AND version=$2 AND status='approved'",[v.templateId,v.version])).rows[0];
  if(!t)fail(404,'not_found','Template unavailable');return {id:t.template_id,version:t.version,digest:t.digest};
 }
 async read(input:unknown){const v=templateRead.parse(input);const matches=(await this.entries()).filter(t=>t.id===v.templateId&&(!v.version||t.version===v.version)).sort((a,b)=>compare(b.version,a.version));const t=matches[0];if(!t)fail(404,'not_found','Template unavailable');const declarations=readAppFunctions(t);return {...t,functions:declarations.functions.map(({source,...f})=>({...f,...(v.includeFunctionSource?{source}:{})})),functionUnavailable:declarations.unavailable,guidance:templateGuidance,configurationSchema:t.engine==='tracker'?z.toJSONSchema(trackerSetup,{io:"input",unrepresentable:"any"}):{type:'object',additionalProperties:false,properties:Object.fromEntries(Object.entries(t.options).map(([k,o])=>[k,{type:o.type,description:o.description,...(o.enum?{enum:o.enum}:{}),...(o.default!==undefined?{default:o.default}:{})}])),required:Object.entries(t.options).filter(([,o])=>o.required&&o.default===undefined).map(([k])=>k)}};}
 async operation(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
  const v=templatePrepare.parse(input),t=await this.read({...vPick(v),includeFunctionSource:true});if(t.deprecated)fail(409,'template_retired','Choose an active template');if(t.digest!==v.digest)fail(409,'template_changed','Template changed; read it again before preparing');
  const catalogOrigin={id:t.id,version:t.version,digest:t.digest},preparation={requestKey:v.requestKey,replacesPreviewId:v.replacesPreviewId,expectedDigest:v.expectedDigest};
  if(t.engine==='tracker'){
   if(v.bindings.length||v.manifest)fail(400,'template_bindings','Use tracker tabs and fields for database bindings');
   const setup=trackerSetup.parse({...t.defaults,...v.configuration,name:v.name,projectId:v.projectId});const built=await trackerOperation(f,a,w,setup);return {kind:'create_tracker',setup,content:{...built.content,manifest:{...built.content.manifest,...(t.functions.length?{functions:t.functions}:{})}},catalogOrigin,preparation};
  }
  const configuration=configure(t.options,{...t.defaults,...v.configuration});if(!t.source)fail(500,'template_source','Template source missing');
  const source=`const templateConfiguration=${JSON.stringify(configuration)};\nconst templateBindings=${JSON.stringify(v.bindings)};\n${t.source}`;
  return {kind:'save_component',projectId:v.projectId,catalogOrigin,preparation,content:{name:v.name,format:'frontend-js',source,bindings:v.bindings,manifest:t.functions.length?{...(v.manifest??{version:1,scope:'workspace',fields:[]}),functions:readAppFunctions(t).functions}:v.manifest,sourceAccess:'workspace',assets:[],execution:[]}};
 }
}
function vPick(v:z.infer<typeof templatePrepare>){return {templateId:v.templateId,version:v.version};}
function compare(a:string,b:string){const x=a.split('.').map(Number),y=b.split('.').map(Number);return x[0]-y[0]||x[1]-y[1]||x[2]-y[2];}
function configure(options:Record<string,z.infer<typeof option>>,input:Record<string,unknown>){
 const result:Record<string,unknown>={};for(const name of Object.keys(input))if(!Object.hasOwn(options,name))fail(400,'template_option','Unknown template option: '+name);
 for(const [name,o]of Object.entries(options)){const v=input[name]??o.default;if(v===undefined){if(o.required)fail(400,'template_option','Missing template option: '+name);continue;}if(typeof v!==o.type||(typeof v==='number'&&!Number.isFinite(v))||(typeof v==='string'&&(v.length>10000||(o.enum&&!o.enum.includes(v)))))fail(400,'template_option','Invalid template option: '+name);result[name]=v;}return result;
}
export const appTemplates=new AppTemplates();
