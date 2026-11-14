import {isDeepStrictEqual} from 'node:util';
import type {Database} from '../db/database.js';
import type {Actor} from '../shared/schema.js';
import {fail} from '../shared/schema.js';
import {Foundation} from '../foundation/service.js';
import {readAppFunctions,functionRoles} from './app-functions-schema.js';

/** Declaration/source and table identities are pinned; field access remains the app's current access. */
export async function materializeAppFunctions(db:Database,a:Actor,w:string,appId:string,content:any,before?:any){
 const f=new Foundation(db),definitions=readAppFunctions(content.manifest).functions,old=readAppFunctions(before?.manifest).functions,roles=functionRoles(content.manifest);
 let execution=[...(content.execution??[])];
 // Removing a declaration removes its installed helper, never an unrelated custom function.
 for(const previous of old)if(!definitions.some(d=>d.name===previous.name)){
  const binding=execution.find(b=>b.name===previous.name);if(binding&&!binding.grantId)try{await f.appFunctionRevision(a,w,binding.revisionId,appId);execution=execution.filter(b=>b!==binding);}catch(e:any){if(![403,404].includes(e.status))throw e;}
 }
 for(const d of definitions){
  const current=execution.find(b=>b.name===d.name),previous=old.find(x=>x.name===d.name);
  // Explicit binding removal stays removed. A later changed/new declaration is a new reviewed action.
  if(before&&!current&&isDeepStrictEqual(previous,d)&&d.scope.roles.every(role=>functionRoles(before.manifest)[role]===roles[role]))continue;
  const map=Object.fromEntries(d.scope.roles.filter(role=>roles[role]).map(role=>[role,roles[role]]));
  if(d.scope.roles.some(role=>!map[role]||!content.bindings.some((b:any)=>b.typeId===map[role]))){execution=execution.filter(b=>b.name!==d.name);continue;}
  const scope={capabilities:d.scope.capabilities,typeIds:[...new Set(Object.values(map))],documents:false,appId};
  const source=`const appRoles=Object.freeze(${JSON.stringify(map)});\n${d.source}`;
  if(current&&!current.grantId){const r=await f.appFunctionRevision(a,w,current.revisionId,appId);if(r.body.source===source&&isDeepStrictEqual(r.body.scope,scope)&&isDeepStrictEqual(r.body.inputContract,d.inputContract)&&isDeepStrictEqual(r.body.outputContract,d.outputContract))continue;}
  const saved=await f.saveAppFunction(a,w,{name:d.name,source,scope,inputContract:d.inputContract,outputContract:d.outputContract},content.bindings);
  execution=execution.filter(b=>b.name!==d.name);execution.push({name:d.name,revisionId:saved.revisionId});
 }
 if(execution.length>20)fail(400,'function_limit','An app can bind at most twenty functions');return execution;
}
/** Copies/restores retain ONLY installed read-only app helpers. Legacy execution grants are never revived. */
export async function safeAppHelpers(db:Database,a:Actor,w:string,source:any){
 const f=new Foundation(db),bindings:any[]=[];
 for(const b of source.execution??[]){if(b.grantId)continue;try{const r=await f.appFunctionRevision(a,w,b.revisionId,source.id);if(r.body.scope.typeIds.every((id:string)=>source.bindings.some((x:any)=>x.typeId===id)))bindings.push(b);}catch(e:any){if(![403,404,409].includes(e.status))throw e;}}
 return bindings;
}
export async function appHelpersOnly(db:Database,a:Actor,w:string,c:any){return (await safeAppHelpers(db,a,w,c)).length===(c.execution??[]).length;}
export function retainHelperManifest(previous:any,next:any){
 if(!previous?.functions)return next;
 return {...next,functions:previous.functions,...Object.fromEntries(['automationRoles','roles','recommendedAutomations','automationFeatures'].filter(k=>previous[k]!==undefined).map(k=>[k,previous[k]]))};
}
