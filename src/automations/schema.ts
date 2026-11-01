import {z} from 'zod';
import {id} from '../shared/schema.js';
import {actionTrigger} from '../app-services/schema.js';
export const timeZone=z.string().max(100).refine(v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return true;}catch{return false;}},'Use an IANA timezone');
export const clock=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const schedule=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('calendar'),frequency:z.enum(['daily','weekly','monthly']),time:clock,timeZone,
  anchor:z.iso.date(),interval:z.number().int().min(1).max(52).default(1),weekdays:z.array(z.number().int().min(0).max(6)).min(1).max(7).default([1]),
  monthDay:z.number().int().min(1).max(31).default(1),monthEnd:z.enum(['skip','last_day']).default('last_day')}).strict(),
 z.object({kind:z.literal('after_success'),minutes:z.number().int().min(60).max(525600)}).strict(),
 z.object({kind:z.literal('once'),at:z.iso.datetime({offset:true})}).strict(),
 actionTrigger.options[4],actionTrigger.options[5]
]);
export type AutomationSchedule=z.infer<typeof schedule>;
export const executionPreference={mode:'chat',model:'latest_most_capable_available',reasoning:'high'} as const;
export const runnerPreferences=z.object({execution:z.object({mode:z.literal('chat'),model:z.literal('latest_most_capable_available'),reasoning:z.literal('high')}).strict().default(executionPreference),time:clock.default('06:00'),timeZone,emptyChecks:z.boolean().default(true)}).strict();
export const runnerChange=z.object({preferences:runnerPreferences,expectedVersion:z.number().int().min(0).optional()}).strict();
export const sharedAutomation=z.object({runnerId:id,trigger:schedule,initialLookbackDays:z.number().int().min(1).max(365).default(7),
 catchUp:z.enum(['coalesce','replay']).default('coalesce'),completionActionId:id.optional(),completionActionVersion:z.number().int().min(0).optional(),
 // Data-collection monitors notify only after an actually committed write receipt.
 completionRequiresSavedChanges:z.boolean().default(false)
}).strict().refine(v=>!!v.completionActionId===(v.completionActionVersion!==undefined),'Specify the approved completion action version');
export const claimInput=z.object({runnerId:id,occurrenceId:id,requestKey:id}).strict();
export const checkpointInput=z.object({occurrenceId:id,claimToken:id,checkpoint:z.object({summary:z.string().max(6000),cursor:z.string().max(1000).optional(),requestKeys:z.array(id).max(100).default([])}).strict()}).strict();
