import {fail,assistantOf,ASSISTANT_NAMES,type Actor,type Assistant} from '../shared/schema.js';

/**
 * Automations belong to the assistant that created them (NULL: created on the web).
 * An assistant may read and pause any of the owner's automations, but only edits,
 * resumes, tests and runs its own. Human (web) sessions manage everything.
 */
export function actorAssistant(a:Actor):Assistant|null{return a.origin==='ai'?assistantOf(a):null;}
export function ownedBy(row:{assistant?:string|null}):Assistant|null{return row.assistant==='claude'||row.assistant==='chatgpt'?row.assistant:null;}
export function canEdit(a:Actor,owner:Assistant|null){return a.origin!=='ai'||!owner||owner===assistantOf(a);}
export function requireAutomationOwner(a:Actor,owner:Assistant|null){
 if(canEdit(a,owner))return;
 const name=ASSISTANT_NAMES[owner!];
 fail(403,'other_assistant_automation',`This automation runs in ${name}. Edit, resume or test it in ${name} or on the TrialAgents website. You can still pause it here.`);
}
/** Only the runner's own assistant may use it; pausing is the exception and passes {pausing:true}. */
export function requireRunnerOwner(a:Actor,runner:{assistant?:string|null},pausing=false){
 if(pausing)return;
 if(a.origin==='ai'&&(ownedBy(runner)??'chatgpt')!==assistantOf(a))fail(404,'runner_unavailable','Background connection unavailable');
}
/** Background work acts as the runner's own assistant, so Access switches and restrictions for that assistant apply. */
export function runnerActor(row:{user_id:string;assistant?:string|null}):Actor{return {userId:row.user_id,origin:'ai',...(row.assistant==='claude'?{assistant:'claude' as const}:{})};}
/** The AI principal an automation is validated and executed as: its owning assistant, else ChatGPT (pre-Claude behaviour). */
export function asOwner(a:Actor,owner:Assistant|null):Actor{const {assistant:_,...rest}=a;return {...rest,origin:'ai',...(owner==='claude'?{assistant:'claude' as const}:{})};}
