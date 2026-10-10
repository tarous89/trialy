import { z } from 'zod';
export const id = z.string().uuid();
export const fieldSchema = z.object({ key: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/), name: z.string().min(1).max(100), kind: z.enum(['text','number','money','date','boolean','select','relationship','person','document']), required: z.boolean().default(false), ai: z.boolean().default(true), options: z.array(z.string().max(100)).max(100).optional(), targetTypeId: id.optional() }).strict();
export const fieldsSchema = z.array(fieldSchema).min(1).max(100).refine(f => new Set(f.map(x=>x.key)).size===f.length, 'Duplicate field keys');
export type Field = z.infer<typeof fieldSchema>;
const values = z.record(z.string(), z.union([z.string().max(50000),z.number().finite(),z.boolean(),z.null()]));
export const viewKindSchema=z.enum(['table','list','form','comparison','dashboard','timeline','calendar']);
export const viewConfigSchema=z.object({
 columns:z.array(z.string()).min(1).max(100).optional(),dateField:z.string().optional(),groupBy:z.string().optional(),
 sort:z.object({field:z.string(),direction:z.enum(['asc','desc'])}).optional(),
 filters:z.array(z.object({field:z.string(),operator:z.enum(['equals','contains','empty']),value:z.union([z.string().max(500),z.number().finite(),z.boolean(),z.null()]).optional()})).max(10).default([])
}).strict();
export type ViewConfig=z.infer<typeof viewConfigSchema>;
export const viewFields=(config:ViewConfig)=>[...(config.columns??[]),config.dateField,config.groupBy,config.sort?.field,...(config.filters??[]).map(f=>f.field)].filter((k):k is string=>!!k);
export const operationSchema = z.discriminatedUnion('kind', [
 z.object({kind:z.literal('create_type'), name:z.string().min(1).max(100), fields:fieldsSchema}),
 z.object({kind:z.literal('update_type'), typeId:id, expectedVersion:z.number().int().min(0), name:z.string().min(1).max(100), fields:fieldsSchema}),
 z.object({kind:z.literal('create_record'), typeId:id, data:values}),
 z.object({kind:z.literal('update_record'), recordId:id, expectedVersion:z.number().int().min(0), data:values, reason:z.string().max(1000).optional()}),
 z.object({kind:z.literal('restore_record'), recordId:id, sourceVersion:z.number().int().min(0), expectedVersion:z.number().int().min(0), expectedTypeVersion:z.number().int().min(0), reason:z.string().trim().min(1).max(1000)}),
 z.object({kind:z.literal('create_view'),name:z.string().trim().min(1).max(100),typeId:id,viewKind:viewKindSchema,config:viewConfigSchema}),
 z.object({kind:z.literal('update_view'),viewId:id,expectedVersion:z.number().int().min(0),name:z.string().trim().min(1).max(100),typeId:id,viewKind:viewKindSchema,config:viewConfigSchema}),
 z.object({kind:z.literal('create_automation'), name:z.string().min(1).max(100), grantId:id, intervalMinutes:z.number().int().min(60).max(43200)}),
 z.object({kind:z.literal('install_template'), template:z.string().min(1).max(100)}),
]);
export type Operation = z.infer<typeof operationSchema>;
export type Actor = {userId:string; origin:'human'|'ai'|'worker'};
export class AppError extends Error { constructor(public status:number, public code:string, message:string) {super(message);} }
export function fail(status:number, code:string, message:string):never {throw new AppError(status,code,message);}
