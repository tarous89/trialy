import {z} from 'zod';
import {contractSchema} from '../foundation/schema.js';
import {roleKey} from './role-contracts.js';
import {readRecipes} from '../automations/recipes-schema.js';

export const appReadCapabilities=['tables.list','entities.read','entities.search','entities.facts','records.read','records.aggregate','views.list'] as const;
export const appFunction=z.object({
 name:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),purpose:z.string().trim().min(1).max(200),
 source:z.string().min(1).max(90000),inputContract:contractSchema,outputContract:contractSchema,
 scope:z.object({capabilities:z.array(z.enum(appReadCapabilities)).max(7),roles:z.array(roleKey).max(20),documents:z.literal(false)}).strict()
}).strict().refine(v=>new Set(v.scope.roles).size===v.scope.roles.length,'Function roles must be unique');
export type AppFunction=z.infer<typeof appFunction>;
// Optional publisher content is isolated at discovery. Approval uses the strict validator below.
export const functionDeclarations={functions:z.unknown().optional()};
export function readAppFunctions(value:any,roles?:Iterable<string>){
 const functions:AppFunction[]=[],unavailable:string[]=[],known=roles?new Set(roles):null,raw=value?.functions;
 if(raw===undefined)return {functions,unavailable};
 if(!Array.isArray(raw)||raw.length>10||Buffer.byteLength(JSON.stringify(raw))>300000)return {functions,unavailable:['invalid_functions']};
 const counts=new Map<string,number>();for(const x of raw)if(typeof x?.name==='string')counts.set(x.name,(counts.get(x.name)??0)+1);
 for(const x of raw){const r=appFunction.safeParse(x);if(!r.success||counts.get(x.name)!==1||known&&r.data.scope.roles.some(k=>!known.has(k))){unavailable.push(typeof x?.name==='string'?x.name:'invalid_function');continue;}functions.push(r.data);}
 return {functions,unavailable};
}
export function validateAppFunctions(value:any,roles?:Iterable<string>,bindings:string[]=[],references=true){
 if(value?.functions!==undefined)z.array(appFunction).max(10).parse(value.functions);
 const result=readAppFunctions(value,roles);if(result.unavailable.length)throw Error('Invalid app functions (declaration, duplicate name or unknown role): '+result.unavailable.join(', '));
 if(references){const names=new Set([...bindings,...result.functions.map(f=>f.name)]);for(const r of readRecipes(value).recipes)for(const name of [r.research?.briefBinding,r.email?.summaryBinding])if(name&&!names.has(name))throw Error('Missing app function binding: '+name);}
 return result.functions;
}
export const functionRoles=(manifest:any):Record<string,string>=>({...manifest?.automationRoles,...Object.fromEntries((manifest?.roles??[]).filter((r:any)=>r.typeId).map((r:any)=>[r.role,r.typeId]))});
export const declaredFunctionRoles=(manifest:any)=>new Set([...Object.keys(manifest?.automationRoles??{}),...(manifest?.roles??[]).map((r:any)=>r.role)]);
