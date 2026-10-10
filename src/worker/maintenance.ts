import type {Database} from '../db/database.js';
export async function maintenance(db:Database){
 await db.transaction(async tx=>{
  await tx.query('DELETE FROM oauth_data WHERE expires_at IS NOT NULL AND expires_at<$1',[Date.now()]);
  // Keep used refresh ancestors while any family token is alive, preserving replay detection.
  await tx.query('DELETE FROM oauth_tokens WHERE family IN (SELECT family FROM oauth_tokens GROUP BY family HAVING max(expires_at)<$1)',[Date.now()]);
  await tx.query('DELETE FROM session WHERE expire<now()');
 });
}
