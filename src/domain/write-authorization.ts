import type {Actor} from '../shared/schema.js';
import {fail} from '../shared/schema.js';
import type {Connection} from '../db/database.js';
export type WriteAuthorization={kind:'approval'|'maintenance_grant'|'execution_grant';id:string;version?:number;digest?:string;context?:string;changeSetId?:string;reverses?:string|string[]};
export function requireHuman(a:Actor){if(a.origin!=='human')fail(403,'human_approval_required','Review and approve in the authenticated Trialy app. ChatGPT cannot approve its own changes.');}
export async function setWriteAuthorization(tx:Connection,a:Actor,authorization:WriteAuthorization){await tx.query("SELECT set_config('trialy.write_authorization',$1,true)",[JSON.stringify({...authorization,actorId:a.userId,origin:a.origin})]);}
