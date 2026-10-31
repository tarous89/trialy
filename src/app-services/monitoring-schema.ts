import {z} from 'zod';
import {id} from '../shared/schema.js';
import {sharedAutomation} from '../automations/schema.js';

const text=(max:number)=>z.string().trim().min(1).max(max);
const version=z.number().int().min(0);
const zone=text(100).refine(v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return true;}catch{return false;}},'Use an IANA timezone');
export const monitoringConfig=z.object({
 name:text(100),appId:id,objective:text(2000),instructions:text(12000),sourcePolicy:text(4000),
 schedule:z.object({description:text(300),timeZone:zone}).strict(),
 notificationPolicy:text(1000).default('Report meaningful findings and blockers; remain quiet when there is no relevant update.'),
 readBindings:z.array(z.object({typeId:id,fields:z.array(text(64)).min(1).max(100)}).strict()).max(20).default([]),
 writeScopes:z.array(z.object({scopeId:id,version}).strict()).max(20).default([]),
 maxRunsPerDay:z.number().int().min(1).max(24).default(24),maxChangesPerRun:z.number().int().min(1).max(1000).default(100),
 expiresAt:z.iso.datetime({offset:true}),automation:sharedAutomation.optional(),authoringKey:text(100).optional()
}).strict().superRefine((v,c)=>{
 if(new Set(v.readBindings.map(b=>b.typeId)).size!==v.readBindings.length||v.readBindings.some(b=>new Set(b.fields).size!==b.fields.length)||new Set(v.writeScopes.map(s=>s.scopeId)).size!==v.writeScopes.length)c.addIssue({code:'custom',message:'Bindings, fields and write scopes must be unique'});
});
export const monitoringChange=z.object({monitorId:id.optional(),expectedVersion:version.optional(),config:monitoringConfig}).strict().refine(v=>!v.monitorId||v.expectedVersion!==undefined,'An update needs the current monitoring version');
export const monitoringTask=z.object({monitorId:id,expectedVersion:version,taskId:text(200),schedule:text(4000),timeZone:zone,timingMode:z.enum(['exact_schedule','flexible_schedule','condition_watch'])}).strict();
export const monitoringStart=z.object({monitorId:id,expectedVersion:version,occurrenceKey:text(200)}).strict();
export const monitoringFinish=z.object({runId:id,status:z.enum(['completed','no_update','partial','blocked','failed']),summary:text(12000),coverage:z.object({through:z.iso.datetime({offset:true}),notes:text(2000)}).strict().optional(),sources:z.array(z.object({url:z.url().refine(v=>/^https?:\/\//.test(v),'Use an HTTP source URL'),title:text(300)}).strict()).max(100).default([])}).strict().refine(v=>!v.coverage||['completed','no_update'].includes(v.status),'Partial or failed work cannot advance coverage');
export type MonitoringConfig=z.infer<typeof monitoringConfig>;
