import {z} from 'zod';
import {id,operationSchema} from '../shared/schema.js';
const genericOptions=operationSchema.options.filter(option=>!['request_review','accept_submission','create_automation','adopt_template','upgrade_template','install_template'].includes(option.shape.kind.value));
export const foundationOperationSchema=z.union(genericOptions as [typeof genericOptions[number],typeof genericOptions[number],...typeof genericOptions[number][]]);
const schemaOptions=operationSchema.options.filter(option=>['create_type','update_type','migrate_type','create_view','update_view'].includes(option.shape.kind.value));
export const schemaChangeSchema=z.union(schemaOptions as [typeof schemaOptions[number],typeof schemaOptions[number],...typeof schemaOptions[number][]]);
export const capabilityNames=['tables.list','entities.read','entities.search','entities.facts','records.read','records.aggregate','views.list','documents.list','documents.text','documents.search','changes.propose','schema.propose','test.echo'] as const;
export const scopeSchema=z.object({capabilities:z.array(z.enum(capabilityNames)).max(20),typeIds:z.array(id).max(100),documents:z.boolean().default(false)}).strict();
export const contractSchema=z.object({type:z.enum(['object','array','string','number','boolean','null','any']),required:z.array(z.string().max(100)).max(100).default([])}).strict();
const json=z.unknown().refine(v=>{try{return JSON.stringify(v??null).length<=262144;}catch{return false;}},'Input exceeds limit');
export const TOOL_CATALOG='trialy-capabilities-v1';
export const programSchema=z.object({toolCatalog:z.literal(TOOL_CATALOG).default(TOOL_CATALOG),dependencies:z.array(z.never()).max(0).default([]),source:z.string().min(1).max(100000),scope:scopeSchema,input:json.default(null)}).strict();
export const functionSchema=programSchema.omit({input:true}).extend({name:z.string().trim().min(1).max(100),functionId:id.optional(),expectedVersion:z.number().int().min(0).optional(),inputContract:contractSchema,outputContract:contractSchema}).strict();
export const componentContextSchema=z.object({id,version:z.number().int().min(0),binding:z.string().min(1).max(64)}).strict();
export const invokeSchema=z.object({componentContext:componentContextSchema.optional(),revisionId:id,input:json.default(null),grantId:id.optional()}).strict();
export const triggerSchema=z.discriminatedUnion('kind',[z.object({kind:z.literal('daily'),time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),timeZone:z.string().max(100).refine(v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return true;}catch{return false;}})}),z.object({kind:z.literal('event'),event:z.enum(['records.changed','documents.saved'])})]);
export const scheduleSchema=invokeSchema.extend({trigger:triggerSchema.optional(),intervalMinutes:z.number().int().min(1).max(43200),grantId:id.optional()}).strict();
export type Scope=z.infer<typeof scopeSchema>;
export function checkContract(contract:z.infer<typeof contractSchema>,value:unknown){const actual=value===null?'null':Array.isArray(value)?'array':typeof value;if(contract.type!=='any'&&contract.type!==actual)throw new Error('contract_mismatch');if(contract.required.length&&(actual!=='object'||contract.required.some(k=>!Object.hasOwn(value as object,k))))throw new Error('contract_mismatch');}
