import {z} from 'zod';
import {id,recordWriteSchema} from '../shared/schema.js';
import {appRoute} from '../shared/app-route.js';
// General code runtime, not a catalogue of UI blocks.
export const frontendRequest=z.object({
 viewId:id.optional(),componentId:id.optional(),previewId:id.optional(),expectedVersion:z.number().int().min(0).optional(),route:appRoute.optional(),
 /** P5 (4.4): one key per save attempt, so a retried save never saves twice. */
 requestKey:id.optional(),
 state:z.unknown().default(null),event:z.object({kind:z.enum(['open','click','change','submit','command']),action:z.string().max(200).default(''),value:z.union([z.string().max(50000),z.boolean(),z.null()]).default(null),form:z.record(z.string().max(100),z.union([z.string().max(50000),z.boolean()])).default({})}).strict().default({kind:'open',action:'',value:null,form:{}})
}).strict().refine(v=>!!v.componentId!==!!v.previewId,'Choose one saved component or draft').refine(v=>!v.viewId||!!v.componentId,'Runtime views belong to saved apps');
export const frontendOutput=z.object({controls:z.array(z.object({slot:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),fieldId:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),recordId:id}).strict()).max(500).optional(),html:z.string().max(200000),css:z.string().max(50000).default(''),state:z.unknown().default(null)}).strict();
export const frontendRead=z.object({q:z.string().max(500).optional(),sort:z.object({field:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),direction:z.enum(['asc','desc'])}).strict().optional(),typeId:id,limit:z.number().int().min(0).max(100).default(25),offset:z.number().int().min(0).max(1000000).default(0),filters:z.record(z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),z.string().max(100)).default({})}).strict();
/** D19 (4.6): an app's delete is an archive of a record the person can edit in full; Undo brings it back. */
export const archiveRecordChange=z.object({kind:z.literal('archive_record'),recordId:id,expectedVersion:z.number().int().min(0)}).strict();
export const appRecordChange=z.union([recordWriteSchema,archiveRecordChange]);
export const componentRecordChanges=z.array(appRecordChange).min(1).max(50);
/** P5, B3 (4.4): one direct save from an app. The request key makes a retry return the first result instead of saving twice. */
export const saveAppRecordsRequest=z.object({componentId:id,expectedVersion:z.number().int().min(0),viewId:id.optional(),requestKey:id,changes:componentRecordChanges}).strict();
/** G8 (4.6): Undo one of the person's own recent actions in the open app. */
export const undoAppChangeRequest=z.object({componentId:id,viewId:id,undoId:id}).strict();


/** P3 (4.3): reads an app asks for in one request (read_app_data). Each is one read capability and its input. */
export const readAppDataRequest=z.object({componentId:id,expectedVersion:z.number().int().min(0),viewId:id.optional(),reads:z.array(z.object({name:z.string().max(64),input:z.unknown()}).strict()).min(1).max(12)}).strict();
