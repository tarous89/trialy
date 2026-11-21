import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Database} from '../db/database.js';
import {fail,type Actor} from '../shared/schema.js';
import {access} from './permissions.js';
import {audit} from './evidence.js';
import {requireHuman} from './write-authorization.js';
import {reviewAuthority} from './external-exchange.js';

/**
 * Session 6, package 6.9 (X2, D34): a reviewer rejects what came in from outside, with a reason the sender sees
 * on their private page (exchanges). Nothing is deleted: the original stays as it arrived, and a rejected item
 * can no longer be accepted.
 */
export const rejectionKind=z.enum(['form_submission','exchange_submission','exchange_file']);
export const rejectionInput=z.object({reason:z.string().trim().min(1).max(1000)}).strict();
export async function rejectExternal(db:Database,a:Actor,w:string,kind:z.infer<typeof rejectionKind>,objectId:string,reason:string){requireHuman(a);return db.transaction(async tx=>{
 const p=await access(tx,a,w,true);
 if(kind==='form_submission'){
  const s=(await tx.query('SELECT f.id FROM form_submissions f LEFT JOIN submission_acceptances x ON x.submission_id=f.id WHERE f.id=$1 AND f.workspace_id=$2 AND x.submission_id IS NULL',[objectId,w])).rows[0];
  if(!s)fail(409,'submission_unavailable','This response is unavailable or already accepted');
  if(p.role!=='owner'&&p.workspace_role!=='editor')fail(403,'reviewer_required','Only a team member who can edit this table reviews what comes in');
 }else{
  const row=kind==='exchange_submission'
   ?(await tx.query('SELECT x.group_id FROM exchange_submissions s JOIN exchanges x ON x.id=s.exchange_id LEFT JOIN exchange_acceptances acc ON acc.submission_id=s.id WHERE s.id=$1 AND s.workspace_id=$2 AND acc.submission_id IS NULL',[objectId,w])).rows[0]
   :(await tx.query('SELECT x.group_id FROM exchange_files f JOIN exchanges x ON x.id=f.exchange_id LEFT JOIN exchange_file_acceptances acc ON acc.file_id=f.id WHERE f.id=$1 AND f.workspace_id=$2 AND acc.file_id IS NULL AND f.removed_at IS NULL',[objectId,w])).rows[0];
  if(!row)fail(409,'unavailable','This item is unavailable or already accepted');
  const g=(await tx.query('SELECT app_id FROM exchange_groups WHERE id=$1',[row.group_id])).rows[0];
  await reviewAuthority(tx,a,w,g?.app_id??null);
 }
 const r=await tx.query('INSERT INTO external_rejections(id,workspace_id,object_kind,object_id,reason,rejected_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(object_kind,object_id) DO NOTHING RETURNING id',[randomUUID(),w,kind,objectId,reason,a.userId]);
 if(r.rows.length)await audit(tx,a,p,'external.rejected',objectId,null,{kind,reason});
 return {id:objectId,kind,rejected:true,reason};
});}
/** Rejected items, for refusing a later acceptance and for the sender's page. */
export async function isRejected(db:{query:Database['query']},kind:string,objectId:string){return (await db.query('SELECT 1 FROM external_rejections WHERE object_kind=$1 AND object_id=$2',[kind,objectId])).rows.length>0;}
