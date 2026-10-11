import {z} from 'zod';
import {id} from '../shared/schema.js';
export const interfaceSchema=z.object({
 runtime:z.literal('trialy-ui-v1'),layout:z.enum(['stack','grid']).default('stack'),
 blocks:z.array(z.discriminatedUnion('kind',[
  z.object({kind:z.literal('text'),text:z.string().max(10000),heading:z.boolean().default(false)}).strict(),
  z.object({kind:z.literal('table'),title:z.string().max(200),typeId:id,fields:z.array(z.string().min(1).max(64)).min(1).max(100),editable:z.boolean().default(true)}).strict()
 ])).min(1).max(30)
}).strict();
