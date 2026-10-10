import { z } from 'zod';
export const id = z.string().uuid();
export const fieldSchema = z.object({ key: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/), name: z.string().min(1).max(100), kind: z.enum(['text','number','money','date','boolean','select','relationship','person','document']), required: z.boolean().default(false), ai: z.boolean().default(true), options: z.array(z.string().max(100)).max(100).optional(), targetTypeId: id.optional() }).strict();
export const fieldsSchema = z.array(fieldSchema).min(1).max(100).refine(f => new Set(f.map(x=>x.key)).size===f.length, 'Duplicate field keys');
export type Field = z.infer<typeof fieldSchema>;
const values = z.record(z.string(), z.union([z.string().max(50000),z.number().finite(),z.boolean(),z.null()]));
export const operationSchema = z.discriminatedUnion('kind', [
 z.object({kind:z.literal('create_type'), name:z.string().min(1).max(100), fields:fieldsSchema}),
 z.object({kind:z.literal('update_type'), typeId:id, expectedVersion:z.number().int().min(0), name:z.string().min(1).max(100), fields:fieldsSchema}),
 z.object({kind:z.literal('create_record'), typeId:id, data:values}),
 z.object({kind:z.literal('update_record'), recordId:id, expectedVersion:z.number().int().min(0), data:values, reason:z.string().max(1000).optional()}),
 z.object({kind:z.literal('create_view'), name:z.string().min(1).max(100), typeId:id, viewKind:z.enum(['table','list','form','comparison','dashboard','timeline','calendar']), config:z.object({columns:z.array(z.string()).optional(), dateField:z.string().optional(), groupBy:z.string().optional()})}),
 z.object({kind:z.literal('create_automation'), name:z.string().min(1).max(100), grantId:id, intervalMinutes:z.number().int().min(60).max(43200)}),
 z.object({kind:z.literal('install_template'), template:z.string().min(1).max(100)}),
]);
export type Operation = z.infer<typeof operationSchema>;
export type Actor = {userId:string; origin:'human'|'ai'|'worker'};
export class AppError extends Error { constructor(public status:number, public code:string, message:string) {super(message);} }
export function fail(status:number, code:string, message:string):never {throw new AppError(status,code,message);}
