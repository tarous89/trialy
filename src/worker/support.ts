import type {Database} from '../db/database.js';
import {resendEmail,type EmailTransport} from '../app-services/jobs.js';
export async function deliverSupport(db:Database,send:EmailTransport=resendEmail){
 const request=await db.transaction(async tx=>{const r=(await tx.query("SELECT s.*,u.email,u.name FROM support_requests s JOIN users u ON u.id=s.user_id WHERE s.delivery_status='pending' AND s.available_at<=now() ORDER BY s.created_at FOR UPDATE OF s SKIP LOCKED LIMIT 1")).rows[0];if(r)await tx.query("UPDATE support_requests SET attempts=attempts+1,available_at=now()+interval '2 minutes' WHERE id=$1",[r.id]);return r;});
 if(!request)return false;
 try{const r=await send({from:'TrialAgents Support <notifications@trialagents.com>',to:[process.env.SUPPORT_EMAIL??'support@trialagents.com'],subject:'Support: '+request.subject,text:`From: ${request.name} <${request.email}>\nReference: ${request.id}\n\n${request.message}`},'support-'+request.id,AbortSignal.timeout(20000));await db.query("UPDATE support_requests SET delivery_status='sent',provider_id=$2 WHERE id=$1",[request.id,r.id]);}
 catch{await db.query("UPDATE support_requests SET available_at=now()+interval '15 minutes' WHERE id=$1",[request.id]);console.error(JSON.stringify({event:'support_delivery_retry',requestId:request.id}));}return true;
}
