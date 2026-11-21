import type {Connection} from '../db/database.js';

/**
 * Session 6, package 6.7 (P7): one cheap, indexed read of a workspace's newest event (audit_workspace_sequence),
 * used by every database-triggered automation in it. A poll with nothing new since its cursor stops here:
 * no event scan, no access check and no lock beyond its own row.
 */
export async function latestEvent(tx:Connection,workspaceId:string){
 return Number((await tx.query('SELECT coalesce(max(event_sequence),0) AS n FROM audit_events WHERE workspace_id=$1',[workspaceId])).rows[0]?.n??0);
}
export const nothingNew=async(tx:Connection,workspaceId:string,cursor:number|string|null|undefined)=>(await latestEvent(tx,workspaceId))<=Number(cursor??0);
