import type {Database} from '../db/database.js';
import {access} from './permissions.js';
import {fail,type Actor} from '../shared/schema.js';
export async function operationalStatus(db:Database,a:Actor,w:string){
 const p=await access(db,a,w);if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','Human owner required');
 const worker=(await db.query('SELECT max(heartbeat_at) AS heartbeat_at,max(last_success_at) AS last_success_at,max(last_error_at) AS last_error_at FROM worker_health')).rows[0];
 const counts=async(table:'foundation_runs'|'jobs')=>(await db.query(`SELECT status,count(*)::int AS count FROM ${table} WHERE workspace_id=$1 GROUP BY status ORDER BY status`,[w])).rows;
 return {checkedAt:new Date().toISOString(),database:'reachable',worker:{...worker,status:worker.heartbeat_at&&Date.now()-new Date(worker.heartbeat_at).getTime()<90000?'recent_heartbeat':'no_recent_heartbeat'},runs:await counts('foundation_runs'),extraction:await counts('jobs'),originals:(await db.query('SELECT count(*)::int AS count,coalesce(sum(byte_size),0)::text AS bytes FROM document_versions WHERE workspace_id=$1',[w])).rows[0],meaning:'Operational indicators, not backup verification. Extraction unavailability preserves originals and is not a lost-save alert.'};
}
