import type {Actor} from '../shared/schema.js';
import {fail} from '../shared/schema.js';
import type {Connection} from '../db/database.js';
export type WriteAuthorization={kind:'approval'|'maintenance_grant'|'execution_grant';id:string;version?:number;digest?:string;context?:string;changeSetId?:string;reverses?:string|string[]};
export function requireHuman(a:Actor){if(a.origin!=='human')fail(403,'human_approval_required','Review and approve in the authenticated TrialAgents app. ChatGPT cannot approve its own changes.');}
export async function setWriteAuthorization(tx:Connection,a:Actor,authorization:WriteAuthorization){await tx.query("SELECT set_config('trialy.write_authorization',$1,true)",[JSON.stringify({...authorization,actorId:a.userId,origin:a.origin})]);}

// Set only by explicit authenticated action endpoints, never by generated code or workers.
export function requireCurrentAction(a:Actor){if(a.origin==='human'||(a.origin==='ai'&&a.actionConfirmed===true))return;requireHuman(a);}
