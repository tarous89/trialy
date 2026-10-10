import type {Express} from 'express';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {Service,audit} from '../domain/service.js';
import {access} from '../domain/permissions.js';
import {id,fail} from '../shared/schema.js';
import type {Database} from '../db/database.js';
export function addReviews(app:Express,s:Service){
 const root='/api/workspaces/:workspaceId';
 app.get(root+'/inbox',async(req,res)=>{
  const w=id.parse(req.params.workspaceId),a=req.actor!,p=await access(s.db,a,w);if(a.origin!=='human')fail(403,'human_required','Open the human review workspace');
  const full=!p.hidden_fields.length&&p.allowed_types===null;
  const reviews=full?(await s.db.query(`SELECT q.*,u.name AS reviewer_name,r.data,r.version AS current_version,r.state,t.name AS table_name,d.outcome,d.meaning FROM record_review_requests q JOIN records r ON r.id=q.record_id JOIN entity_types t ON t.id=r.type_id JOIN users u ON u.id=q.reviewer_id LEFT JOIN record_review_decisions d ON d.request_id=q.id WHERE q.workspace_id=$1 AND ($2 OR q.reviewer_id=$3 OR q.requested_by=$3) ORDER BY q.created_at DESC LIMIT 100`,[w,p.role==='owner',a.userId])).rows:[];
  const runs=await s.runs(a,w),reminders=(await s.db.query('SELECT i.id,i.run_id,i.created_at,r.created_at AS read_at FROM inbox_reminders i LEFT JOIN inbox_read_receipts r ON r.reminder_id=i.id WHERE i.workspace_id=$1 AND i.user_id=$2 ORDER BY i.created_at DESC LIMIT 100',[w,a.userId])).rows.map(i=>({...i,run:runs.find(r=>r.id===i.run_id)??{summary:{title:'Reminder details are no longer available under current access'}}}));
  const allDocuments=full?await s.documents(a,w):[];const documents=allDocuments.filter(d=>d.review_status==='in_review'&&d.reviewer_id===a.userId&&!allDocuments.some(v=>v.document_id===d.document_id&&v.version>d.version));
  res.json({reviews,reminders,documents,canRoute:p.role==='owner',userId:a.userId});
 });
 app.get(root+'/reviewers',async(req,res)=>{const w=id.parse(req.params.workspaceId),p=await access(s.db,req.actor!,w);if(req.actor!.origin!=='human'||p.role!=='owner')fail(403,'owner_required','Human owner required');const users=(await s.db.query('SELECT u.id,u.name,u.email FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.tenant_id=$1',[p.tenant_id])).rows,result=[];for(const u of users){try{const policy=await access(s.db,{userId:u.id,origin:'human'},w,true);if(!policy.hidden_fields.length&&policy.allowed_types===null)result.push(u);}catch{}}res.json(result);});
 app.post(root+'/reviews/:requestId/decision',async(req,res)=>{
  const w=id.parse(req.params.workspaceId),requestId=id.parse(req.params.requestId),a=req.actor!,input=z.object({outcome:z.enum(['approved','changes_requested','cancelled']),meaning:z.string().trim().min(1).max(1000),confirmed:z.literal(true)}).parse(req.body);
  const result=await s.db.transaction(async tx=>{
   await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w,true);if(a.origin!=='human'||p.hidden_fields.length||p.allowed_types!==null)fail(403,'full_review_required','Human full-workspace editing access required');
   const q=(await tx.query('SELECT * FROM record_review_requests WHERE id=$1 AND workspace_id=$2',[requestId,w])).rows[0];if(!q)fail(404,'not_found','Request not found');
   if(input.outcome==='cancelled'?p.role!=='owner':q.reviewer_id!==a.userId)fail(403,'assigned_reviewer','Only the assigned reviewer can decide; only the owner can cancel');
   const previous=(await tx.query('SELECT * FROM record_review_decisions WHERE request_id=$1',[requestId])).rows[0];if(previous){if(previous.actor_id!==a.userId||previous.outcome!==input.outcome||previous.meaning!==input.meaning)fail(409,'decision_exists','This request already has a different decision');return {id:q.record_id,version:previous.resulting_version,outcome:previous.outcome};}
   const r=(await tx.query('SELECT * FROM records WHERE id=$1 AND workspace_id=$2',[q.record_id,w])).rows[0];
   if(input.outcome!=='cancelled'&&(r.version!==q.record_version||r.state!=='in_review'))fail(409,'stale_review','Record changed; ask the owner for a new review request');
   if(input.outcome==='approved'){const scoped:Database={query:(sql,v)=>tx.query(sql,v),transaction:fn=>fn(tx),close:async()=>{}};const saved=await new Service(scoped).transition(a,w,r.id,r.version,'approved',input.meaning);return {id:saved.id,version:saved.version,outcome:'approved'};}
   const version=input.outcome==='changes_requested'?r.version+1:r.version;
   if(input.outcome==='changes_requested'){await tx.query("UPDATE records SET state='draft',version=$2,updated_at=now() WHERE id=$1",[r.id,version]);await tx.query("INSERT INTO revisions(id,workspace_id,object_id,object_kind,version,snapshot,actor_id) VALUES($1,$2,$3,'record',$4,$5,$6)",[randomUUID(),w,r.id,version,JSON.stringify({data:r.data,state:'draft'}),a.userId]);}
   if(input.outcome==='changes_requested')await audit(tx,a,p,'record.changes_requested',r.id,{state:r.state,version:r.version},{state:'draft',version},input.meaning);
   await tx.query('INSERT INTO record_review_decisions(request_id,workspace_id,actor_id,outcome,meaning,resulting_version) VALUES($1,$2,$3,$4,$5,$6)',[requestId,w,a.userId,input.outcome,input.meaning,version]);await audit(tx,a,p,'review.'+input.outcome,r.id,{requestId,version:q.record_version},{version},input.meaning);return {id:r.id,version,outcome:input.outcome};
  });res.json(result);
 });
 app.post(root+'/inbox/:reminderId/read',async(req,res)=>{const w=id.parse(req.params.workspaceId),a=req.actor!;await access(s.db,a,w);const reminderId=id.parse(req.params.reminderId);const r=(await s.db.query('SELECT id FROM inbox_reminders WHERE id=$1 AND workspace_id=$2 AND user_id=$3',[reminderId,w,a.userId])).rows[0];if(!r)fail(404,'not_found','Reminder not found');await s.db.query('INSERT INTO inbox_read_receipts(reminder_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[reminderId,a.userId]);res.json({ok:true});});
}
