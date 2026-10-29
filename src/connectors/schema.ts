import {z} from 'zod';
import {id} from '../shared/schema.js';
export const connectorKey=z.string().regex(/^[a-z][a-z0-9_]{0,63}$/);
const scalar=z.union([z.string().max(4000),z.number().finite(),z.boolean(),z.null()]);
const field=z.object({name:connectorKey,kind:z.enum(['text','number','boolean']),required:z.boolean().default(false),choices:z.array(scalar).max(100).optional()}).strict();
const mapping=z.object({parameter:connectorKey,typeId:id,field:connectorKey,recordIds:z.array(id).max(100).optional()}).strict();
export const connectorOperation=z.object({
 id:connectorKey,name:z.string().trim().min(1).max(100),method:z.enum(['GET','POST','PUT','PATCH','DELETE']),
 path:z.string().max(500).regex(/^\/(?:[A-Za-z0-9_{}.-]+(?:\/[A-Za-z0-9_{}.-]+)*)?$/),
 effect:z.enum(['read','write','unknown']),parameters:z.array(field).max(30).default([]),
 constants:z.record(connectorKey,scalar).default({}),mappings:z.array(mapping).max(30).default([]),
 response:z.object({format:z.enum(['json','text']).default('json'),fields:z.array(connectorKey).max(50).default([])}).strict(),
 users:z.array(id).max(100),apps:z.array(id).max(100),aiEnabled:z.boolean().default(false),
 // External data may only be proposed into these bound destination fields.
 destinations:z.array(z.object({typeId:id,fields:z.array(connectorKey).min(1).max(50)}).strict()).max(20).default([])
}).strict().superRefine((v,c)=>{
 const names=v.parameters.map(p=>p.name);
 if(new Set(names).size!==names.length)c.addIssue({code:'custom',message:'Parameter names must be unique'});
 if(new Set(v.mappings.map(m=>m.parameter)).size!==v.mappings.length)c.addIssue({code:'custom',message:'Only one mapping per parameter'});
 for(const name of [...Object.keys(v.constants),...v.mappings.map(m=>m.parameter),...[...v.path.matchAll(/\{([a-z][a-z0-9_]*)\}/g)].map(m=>m[1])])if(!names.includes(name))c.addIssue({code:'custom',message:'Every input must have a declared parameter'});
 if(v.mappings.some(m=>Object.hasOwn(v.constants,m.parameter)))c.addIssue({code:'custom',message:'A mapped input cannot also be a constant'});
 if(v.path.includes('..')||v.path.includes('//')||v.path.replace(/\{[a-z][a-z0-9_]*\}/g,'').match(/[{}]/))c.addIssue({code:'custom',message:'Invalid operation path'});
 if(v.response.format==='json'&&!v.response.fields.length)c.addIssue({code:'custom',message:'Select permitted response fields'});
});
export const connectorConfig=z.object({
 type:z.literal('generic_https').default('generic_https'),name:z.string().trim().min(1).max(100),description:z.string().max(1000).default(''),
 baseUrl:z.url().max(1000).refine(s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/';}catch{return false;}},'Use an HTTPS origin without credentials, path, query or fragment'),
 auth:z.discriminatedUnion('kind',[z.object({kind:z.literal('none')}).strict(),z.object({kind:z.literal('bearer')}).strict(),z.object({kind:z.literal('header'),header:z.string().regex(/^(?:x-[a-z0-9-]+|api-key|apikey)$/i).max(80)}).strict()]),
 managers:z.array(id).max(100).default([]),enabled:z.boolean().default(true),expiresAt:z.iso.datetime().optional(),
 requestsPerMinute:z.number().int().min(1).max(60).default(30),requestsPerAppPerMinute:z.number().int().min(1).max(30).default(10),
 operations:z.array(connectorOperation).min(1).max(20)
}).strict().refine(v=>new Set(v.operations.map(o=>o.id)).size===v.operations.length,'Operation IDs must be unique');
export const connectorChange=z.object({connectionId:id.optional(),expectedVersion:z.number().int().min(0).optional(),config:connectorConfig}).strict().refine(v=>!!v.connectionId===(v.expectedVersion!==undefined),'Existing connections require their current version');
export const connectorCall=z.object({connectionId:id,operation:connectorKey,appId:id,appVersion:z.number().int().min(0),requestKey:id,parameters:z.record(connectorKey,scalar).default({}),records:z.record(connectorKey,id).default({})}).strict();
export const connectorApproval=z.object({digest:z.string().length(64),confirmed:z.literal(true)}).strict();
export type ConnectorConfig=z.infer<typeof connectorConfig>;
export type ConnectorOperation=z.infer<typeof connectorOperation>;
export type ConnectorCall=z.infer<typeof connectorCall>;
