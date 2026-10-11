import { z } from 'zod';
export const id = z.string().uuid();
export const fieldSchema = z.object({ key: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/), name: z.string().min(1).max(100), kind: z.enum(['text','number','money','date','boolean','select','relationship','person','document']), required: z.boolean().default(false), ai: z.boolean().default(true), options: z.array(z.string().max(100)).max(100).optional(), targetTypeId: id.optional(), unique:z.boolean().optional(), formula:z.object({operator:z.enum(['sum','product','difference','ratio']),fields:z.array(z.string()).min(2).max(10)}).strict().optional() }).strict();
export const fieldsSchema = z.array(fieldSchema).min(1).max(100).refine(f => new Set(f.map(x=>x.key)).size===f.length, 'Duplicate field keys');
export type Field = z.infer<typeof fieldSchema>;
const values = z.record(z.string(), z.union([z.string().max(50000),z.number().finite(),z.boolean(),z.null()]));
export const viewKindSchema=z.enum(['table','list','form','comparison','dashboard','timeline','calendar']);
export const viewConfigSchema=z.object({
 columns:z.array(z.string()).min(1).max(100).optional(),dateField:z.string().optional(),groupBy:z.string().optional(),metric:z.string().optional(),
 sort:z.object({field:z.string(),direction:z.enum(['asc','desc'])}).optional(),
 filters:z.array(z.object({field:z.string(),operator:z.enum(['equals','contains','empty']),value:z.union([z.string().max(500),z.number().finite(),z.boolean(),z.null()]).optional()})).max(10).default([])
}).strict();
export type ViewConfig=z.infer<typeof viewConfigSchema>;
export const viewFields=(config:ViewConfig)=>[...(config.columns??[]),config.dateField,config.groupBy,config.metric,config.sort?.field,...(config.filters??[]).map(f=>f.field)].filter((k):k is string=>!!k);
export const recordWriteSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('create_record'),typeId:id,data:values}),
 z.object({kind:z.literal('update_record'),recordId:id,expectedVersion:z.number().int().min(0),data:values,reason:z.string().max(1000).optional()})
]);
export const recordQuerySchema=z.object({q:z.string().max(500).optional(),viewId:id.optional(),limit:z.coerce.number().int().min(1).max(100).optional(),offset:z.coerce.number().int().min(0).optional(),dateField:z.string().max(64).optional(),dueBefore:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional()});
export const fieldChangeQuerySchema=z.object({typeId:id.optional(),recordId:id.optional(),actorId:id.optional(),authorizationId:id.optional(),changeSetId:id.optional(),authorizationKind:z.enum(['approval','maintenance_grant','execution_grant','unattributed']).optional(),since:z.string().datetime().optional(),until:z.string().datetime().optional(),offset:z.coerce.number().int().min(0).default(0)});
export type FieldChangeQuery=z.infer<typeof fieldChangeQuerySchema>;
export type RecordQuery=z.infer<typeof recordQuerySchema>;
export const operationSchema = z.discriminatedUnion('kind', [
 z.object({kind:z.literal('reverse_field_change'),changeId:id,expectedVersion:z.number().int().min(0),reason:z.string().trim().min(1).max(1000)}),
 z.object({kind:z.literal('request_review'),recordId:id,expectedVersion:z.number().int().min(0),reviewerId:id,note:z.string().trim().min(1).max(1000),dueOn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()}),
 z.object({kind:z.literal('accept_submission'),submissionId:id,typeId:id,data:values}),
 z.object({kind:z.literal('create_type'), name:z.string().min(1).max(100), fields:fieldsSchema}),
 z.object({kind:z.literal('update_type'), typeId:id, expectedVersion:z.number().int().min(0), name:z.string().min(1).max(100), fields:fieldsSchema}),
 z.object({kind:z.literal('create_record'), typeId:id, data:values}),
 z.object({kind:z.literal('update_record'), recordId:id, expectedVersion:z.number().int().min(0), data:values, reason:z.string().max(1000).optional()}),
 z.object({kind:z.literal('migrate_type'),typeId:id,expectedVersion:z.number().int().min(0),name:z.string().min(1).max(100),fields:fieldsSchema,mappings:z.record(z.string(),z.object({from:z.string(),conversion:z.enum(['copy','text','number','boolean'])})).default({}),reason:z.string().trim().min(1).max(1000)}),
 z.object({kind:z.literal('bulk_records'),changes:z.array(recordWriteSchema).min(1).max(200)}),
 z.object({kind:z.literal('restore_record'), recordId:id, sourceVersion:z.number().int().min(0), expectedVersion:z.number().int().min(0), expectedTypeVersion:z.number().int().min(0), reason:z.string().trim().min(1).max(1000)}),
 z.object({kind:z.literal('create_view'),name:z.string().trim().min(1).max(100),typeId:id,viewKind:viewKindSchema,config:viewConfigSchema}),
 z.object({kind:z.literal('update_view'),viewId:id,expectedVersion:z.number().int().min(0),name:z.string().trim().min(1).max(100),typeId:id,viewKind:viewKindSchema,config:viewConfigSchema}),
 z.object({kind:z.literal('set_workspace_policy'),expectedVersion:z.number().int().min(0),archived:z.boolean(),legalHold:z.boolean(),retentionUntil:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),reason:z.string().trim().min(1).max(1000)}),
 z.object({kind:z.literal('document_controls'),documentId:id,expectedVersion:z.number().int().min(-1),linkedRecordId:id.nullable(),reviewerId:id.nullable(),expiresOn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),folder:z.string().max(100)}),
 z.object({kind:z.literal('create_automation'), name:z.string().min(1).max(100), grantId:id, action:z.discriminatedUnion('kind',[z.object({kind:z.literal('create_record'),typeId:id,data:values}),z.object({kind:z.literal('remind_me')})]).optional(),intervalMinutes:z.number().int().min(60).max(43200),schedule:z.discriminatedUnion('kind',[z.object({kind:z.literal('daily'),time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),timeZone:z.string().max(100).refine(v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return true;}catch{return false;}},'Choose a valid IANA time zone')}),z.object({kind:z.enum(['records.changed','documents.saved'])})]).optional(),conditions:z.object({typeId:id,dateField:z.string().max(64),viewId:id.optional(),daysAhead:z.number().int().min(0).max(90)}).optional()}),
 z.object({kind:z.literal('adopt_template'),template:z.string().min(1).max(100),mapping:z.record(z.string().max(100),id)}),
 z.object({kind:z.literal('upgrade_template'),template:z.string().min(1).max(100),expectedVersion:z.number().int().min(1)}),
 z.object({kind:z.literal('install_template'), template:z.string().min(1).max(100)}),
 z.object({kind:z.literal('reverse_field_changes'),changes:z.array(z.object({changeId:id,expectedVersion:z.number().int().min(0)})).min(1).max(200),reason:z.string().trim().min(1).max(1000)}),
]);
export type Operation = z.infer<typeof operationSchema>;
export type Actor = {userId:string; origin:'human'|'ai'|'worker'};
export class AppError extends Error { constructor(public status:number, public code:string, message:string) {super(message);} }
export function fail(status:number, code:string, message:string):never {throw new AppError(status,code,message);}
