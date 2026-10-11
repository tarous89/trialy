import {z} from 'zod';
import {id,recordWriteSchema} from '../shared/schema.js';
// General code runtime, not a catalogue of UI blocks.
export const frontendRequest=z.object({
 componentId:id.optional(),previewId:id.optional(),expectedVersion:z.number().int().min(0).optional(),
 state:z.unknown().default(null),event:z.object({kind:z.enum(['open','click','change','submit']),action:z.string().max(100).default(''),value:z.union([z.string().max(50000),z.boolean(),z.null()]).default(null),form:z.record(z.string().max(100),z.union([z.string().max(50000),z.boolean()])).default({})}).strict().default({kind:'open',action:'',value:null,form:{}})
}).strict().refine(v=>!!v.componentId!==!!v.previewId,'Choose one saved component or draft');
export const frontendOutput=z.object({html:z.string().max(200000),css:z.string().max(50000).default(''),state:z.unknown().default(null)}).strict();
export const frontendRead=z.object({typeId:id,limit:z.number().int().min(1).max(100).default(50),offset:z.number().int().min(0).max(1000000).default(0)}).strict();
export const componentRecordChanges=z.array(recordWriteSchema).min(1).max(50);
