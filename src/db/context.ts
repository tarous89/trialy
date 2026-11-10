import {AsyncLocalStorage} from 'node:async_hooks';
import type {Actor} from '../shared/schema.js';
export type DatabaseContext={actor?:Actor;appShareHash?:string;publicLinkHash?:string;submissionNonce?:string;invitationHash?:string;service?:'worker'|'maintenance'};
const storage=new AsyncLocalStorage<DatabaseContext>();
export const databaseContext=()=>storage.getStore()??{};
export const withDatabaseContext=<T>(context:DatabaseContext,fn:()=>T):T=>storage.run(context,fn);
export const withActor=<T>(actor:Actor,fn:()=>T):T=>withDatabaseContext({...databaseContext(),actor},fn);
export const databaseContextValues=(c:DatabaseContext)=>[c.actor?.userId??'',c.actor?.origin??'',c.publicLinkHash??'',c.submissionNonce??'',c.invitationHash??'',c.service??'',c.actor?.accessToolId??'',c.appShareHash??'',c.actor?.origin==='ai'?(c.actor.assistant??'chatgpt'):''];
export async function setDatabaseContext(connection:{query:(sql:string,values?:any[])=>Promise<unknown>},values=databaseContextValues(databaseContext())){
 await connection.query(`SELECT set_config('trialy.actor_id',$1,true),set_config('trialy.origin',$2,true),set_config('trialy.public_link',$3,true),set_config('trialy.submission_nonce',$4,true),set_config('trialy.invitation',$5,true),set_config('trialy.service',$6,true),set_config('trialy.tool_id',$7,true),set_config('trialy.app_share',$8,true),set_config('trialy.assistant',$9,true)`,values);
}

