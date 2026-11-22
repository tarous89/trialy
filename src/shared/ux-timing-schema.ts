import {z} from 'zod';
/**
 * P1 targets and P10 measurement, shared by the browser and the server.
 * open: opening an app until its content is on screen. interaction: a click or tap until the screen has responded.
 * save: an edit until the save is confirmed. Samples carry timing and coarse context only, never business data.
 * L1.0 (docs/scopes/LOADING_SPEED_2026-11-22.md, section 3), each from its request starting until it is on screen:
 * home: the Apps home cards; archive: the expanded archived apps list; templates: the template list.
 */
export const UX_TARGET_MS={open:2500,interaction:1000,save:1000,home:300,archive:300,templates:300} as const;
export const UX_TAP_TARGET_MS=100;
/** Upper bounds of the histogram buckets, in milliseconds. The last bucket takes everything slower. */
export const UX_BUCKETS=[50,100,200,500,1000,2500,5000,10000,60000] as const;
export const uxSampleSchema=z.object({metric:z.enum(['open','interaction','save','home','archive','templates']),ms:z.number().min(0).max(600000),host:z.enum(['web','chatgpt','claude','public']),width:z.enum(['phone','panel','desktop']),mode:z.enum(['server','browser']).default('server')}).strict();
export const uxBatchSchema=z.object({samples:z.array(uxSampleSchema).min(1).max(50)}).strict();
export type UxSample=z.input<typeof uxSampleSchema>;
export const uxBucket=(ms:number)=>UX_BUCKETS.find(b=>ms<=b)??UX_BUCKETS[UX_BUCKETS.length-1];
export const uxWidth=(px:number):'phone'|'panel'|'desktop'=>px<=480?'phone':px<=900?'panel':'desktop';
