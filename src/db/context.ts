import {AsyncLocalStorage} from 'node:async_hooks';
import type {Actor} from '../shared/schema.js';
export type DatabaseContext={actor?:Actor;publicLinkHash?:string;submissionNonce?:string;invitationHash?:string;service?:'worker'|'maintenance'};
const storage=new AsyncLocalStorage<DatabaseContext>();
export const databaseContext=()=>storage.getStore()??{};
export const withDatabaseContext=<T>(context:DatabaseContext,fn:()=>T):T=>storage.run(context,fn);
export const withActor=<T>(actor:Actor,fn:()=>T):T=>withDatabaseContext({...databaseContext(),actor},fn);
export async function setDatabaseContext(connection:{query:(sql:string,values?:any[])=>Promise<unknown>}){
 const c=databaseContext();await connection.query(`SELECT set_config('trialy.actor_id',$1,true),set_config('trialy.origin',$2,true),set_config('trialy.public_link',$3,true),set_config('trialy.submission_nonce',$4,true),set_config('trialy.invitation',$5,true),set_config('trialy.service',$6,true)`,[c.actor?.userId??'',c.actor?.origin??'',c.publicLinkHash??'',c.submissionNonce??'',c.invitationHash??'',c.service??'']);
}
