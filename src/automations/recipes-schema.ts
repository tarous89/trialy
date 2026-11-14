import {z} from 'zod';
import {actionTrigger} from '../app-services/schema.js';
import {schedule} from './schema.js';
import {roleKey} from '../workspace/role-contracts.js';

const key=z.string().regex(/^[a-z][a-z0-9_]{0,63}$/);
const text=(n:number)=>z.string().trim().min(1).max(n);
const binding=z.object({role:roleKey,fields:z.array(key).min(1).max(100)}).strict();
export const recipeTrigger=z.union([
 schedule.options[0],schedule.options[2],
 actionTrigger.options[4].omit({typeId:true,recordId:true,catchUpDays:true}).extend({role:roleKey}),
 z.object(actionTrigger.options[5].shape).omit({typeId:true,source:true,automationId:true,automationVersion:true,includeEmpty:true,meaningful:true,recordId:true}).extend({role:roleKey}),
 z.object({kind:z.literal('after'),recipe:key,when:z.enum(['completed','meaningful']).default('meaningful')}).strict()
]);
/** Portable declarations use role keys, never another installation's table/automation IDs. */
export const automationRecipe=z.object({
 key,name:text(100),description:text(300),trigger:recipeTrigger,
 contextRole:roleKey.optional(),lifetimeDays:z.number().int().min(1).max(365).default(365),
 research:z.object({briefBinding:key.optional(),objective:text(2000),instructions:text(12000),sourcePolicy:text(4000),readBindings:z.array(binding).max(20).default([])}).strict().optional(),
 email:z.object({memberField:key.optional(),summaryBinding:key.optional(),subject:text(200),text:text(20000),fields:z.array(key).max(100).default([])}).strict().optional()
}).strict().superRefine((v,c)=>{
 if(!!v.research===!!v.email)c.addIssue({code:'custom',message:'Choose research or email; follow-up email is a separate recipe'});
 if(v.research&&v.trigger.kind==='after')c.addIssue({code:'custom',message:'Only email recipes consume research completions'});
 if(v.contextRole&&(!('role' in v.trigger)||v.trigger.role!==v.contextRole))c.addIssue({code:'custom',message:'Context must match the trigger role'});
});
export type AutomationRecipe=z.infer<typeof automationRecipe>;
export const recipeDeclarations={recommendedAutomations:z.array(z.unknown()).max(10).catch([]).optional(),automationFeatures:z.array(z.unknown()).max(30).catch([]).optional()};
export const recipeSettings=z.object({trigger:recipeTrigger.optional(),runnerId:z.uuid().nullable().optional(),recipients:z.array(z.email()).min(1).max(20).optional()}).strict();
export const recipeChoice=z.object({key,enabled:z.boolean(),settings:recipeSettings.default({})}).strict();
export const recipeChoices=z.array(recipeChoice).max(10).refine(v=>new Set(v.map(x=>x.key)).size===v.length,'Choose each recipe once');

/** Malformed optional declarations never make a legacy catalog/app unreadable. */
export function readRecipes(value:any){
 const recipes:AutomationRecipe[]=[],recommended:AutomationRecipe[]=[],unavailable:string[]=[];
 const all=[...(Array.isArray(value?.recommendedAutomations)?value.recommendedAutomations.slice(0,10).map((r:any)=>({r,recommended:true})):[]),...(Array.isArray(value?.automationFeatures)?value.automationFeatures.slice(0,30).map((r:any)=>({r,recommended:false})):[])];
 const counts=new Map<string,number>();for(const {r} of all)if(typeof r?.key==='string')counts.set(r.key,(counts.get(r.key)??0)+1);
 for(const {r,recommended:isRecommended} of all){const p=automationRecipe.safeParse(r);if(!p.success||counts.get(r.key)!==1||isRecommended&&p.data.contextRole){unavailable.push(typeof r?.key==='string'?r.key:'invalid_recipe');continue;}recipes.push(p.data);if(isRecommended)recommended.push(p.data);}
 for(const r of [...recipes])if(r.trigger.kind==='after'&&!recipes.some(p=>p.key===(r.trigger as any).recipe&&p.research&&!p.contextRole&&(!recommended.includes(r)||recommended.includes(p)))){unavailable.push(r.key);recipes.splice(recipes.indexOf(r),1);const i=recommended.indexOf(r);if(i>=0)recommended.splice(i,1);}
 return {recipes,recommended,unavailable};
}

export function configuredRecipe(recipe:AutomationRecipe,settings:z.infer<typeof recipeSettings>):AutomationRecipe{
 const trigger=settings.trigger??recipe.trigger;
 // The editor may adjust timing, never change a reviewed dependency or data scope.
 if(trigger.kind!==recipe.trigger.kind||('role' in trigger&&(!('role' in recipe.trigger)||trigger.role!==recipe.trigger.role))||trigger.kind==='after'&&JSON.stringify(trigger)!==JSON.stringify(recipe.trigger))throw Error('Recipe trigger scope changed');
 return automationRecipe.parse({...recipe,trigger});
}

/** Publishing is strict; runtime discovery remains tolerant of optional corrupt declarations. */
export function validateRecipeDeclarations(value:any){
 for(const [field,max] of [['recommendedAutomations',10],['automationFeatures',30]] as const)if(value[field]!==undefined)z.array(automationRecipe).max(max).parse(value[field]);
 const parsed=readRecipes(value);if(parsed.unavailable.length)throw Error('Invalid automation declarations: '+parsed.unavailable.join(', '));
}
