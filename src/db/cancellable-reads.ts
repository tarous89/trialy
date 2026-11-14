import type {Connection,Database} from './database.js';
/** Only for pure read paths. Finish the current query, then stop before the next
 * read. Does not send PostgreSQL cancellation or open/extend a transaction.
 * Never wrap a mutation, an action, or a connector with this adapter.
 */
export function cancellableReads(db:Database,signal?:AbortSignal):Database{
 if(!signal)return db;
 const query=(connection:Connection):Connection['query']=>async(sql,values)=>{
  signal.throwIfAborted();const result=await connection.query(sql,values);signal.throwIfAborted();return result;
 };
 return {query:query(db),transaction:fn=>{signal.throwIfAborted();return db.transaction(tx=>fn({query:query(tx)}));},close:async()=>{}};
}
