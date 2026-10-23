import {withDatabaseContext,databaseContext} from '../db/context.js';
import type {Express,RequestHandler} from 'express';
import {randomBytes,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Service,audit,checksum} from '../domain/service.js';
import {access} from '../domain/permissions.js';
import {id,fail,type Actor} from '../shared/schema.js';
import type {Connection} from '../db/database.js';
export function addInvitations(app:Express,s:Service,human:RequestHandler){
 const root='/api/workspaces/:workspaceId/invitations';
 const owner=async(tx:Connection,a:Actor,w:string,write=false)=>{const p=await access(tx,a,w,write);if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','Human owner required');return p;};
 app.get(root,human,async(req,res)=>{const w=id.parse(req.params.workspaceId);await owner(s.db,req.actor!,w);res.set('Cache-Control','no-store');res.json((await s.db.query('SELECT id,label,role,allowed_types,expires_at,revoked_at,accepted_by,accepted_at FROM workspace_invitations WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 100',[w])).rows);});
 app.post(root,human,async(req,res)=>{
  const w=id.parse(req.params.workspaceId),input=z.object({label:z.string().trim().min(1).max(100),role:z.enum(['editor','viewer','inspector']),allowedTypes:z.array(id).min(1).max(500),days:z.number().int().min(1).max(30),confirmed:z.literal(true)}).parse(req.body),raw=randomBytes(32).toString('base64url');
  const invitationId=await s.db.transaction(async tx=>{await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await owner(tx,req.actor!,w,true),types=(await tx.query('SELECT id FROM entity_types WHERE workspace_id=$1',[w])).rows;if(input.allowedTypes.some(id=>!types.some(t=>t.id===id)))fail(400,'invalid_type','Choose tables in this workspace');const invitationId=randomUUID();await tx.query('INSERT INTO workspace_invitations(id,workspace_id,owner_id,token_hash,label,role,allowed_types,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,now()+$8*interval \'1 day\')',[invitationId,w,req.actor!.userId,checksum(raw),input.label,input.role,JSON.stringify([...new Set(input.allowedTypes)]),input.days]);await audit(tx,req.actor!,p,'invitation.created',invitationId,null,input);return invitationId;});res.set('Cache-Control','no-store');res.json({id:invitationId,path:'/join#'+raw});
 });
 app.post(root+'/:invitationId/revoke',human,async(req,res)=>{const w=id.parse(req.params.workspaceId);await s.db.transaction(async tx=>{await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await owner(tx,req.actor!,w);const r=(await tx.query('UPDATE workspace_invitations SET revoked_at=now() WHERE id=$1 AND workspace_id=$2 AND accepted_by IS NULL RETURNING id',[id.parse(req.params.invitationId),w])).rows[0];if(!r)fail(409,'unavailable','Invitation is unavailable or already accepted; manage colleague access instead');await audit(tx,req.actor!,p,'invitation.revoked',r.id,null,{revoked:true});});res.json({ok:true});});
 app.use('/api/invitation',human,(req,_res,next)=>{const raw=z.string().regex(/^[A-Za-z0-9_-]{43}$/).parse(req.get('x-trialy-invitation'));withDatabaseContext({...databaseContext(),invitationHash:checksum(raw)},next);});
 async function lookup(tx:Connection,raw:unknown){const token=z.string().regex(/^[A-Za-z0-9_-]{43}$/).parse(raw);const r=(await tx.query('SELECT * FROM workspace_invitations WHERE token_hash=$1',[checksum(token)])).rows[0];if(!r||r.revoked_at||new Date(r.expires_at).getTime()<=Date.now())fail(404,'unavailable','This invitation is unavailable');return r;}
 app.get('/api/invitation',human,async(req,res)=>{const r=await lookup(s.db,req.get('x-trialy-invitation'));if(r.accepted_by&&r.accepted_by!==req.actor!.userId)fail(404,'unavailable','This invitation is unavailable');const p=await owner(s.db,{userId:r.owner_id,origin:'human'},r.workspace_id,true);const tables=(await s.db.query('SELECT id,name FROM entity_types WHERE workspace_id=$1',[r.workspace_id])).rows.filter(t=>r.allowed_types.includes(t.id));res.set('Cache-Control','no-store');res.json({workspace:p.name,role:r.role,tables,accepted:!!r.accepted_by});});
 app.post('/api/invitation',human,async(req,res)=>{
  z.object({confirmed:z.literal(true)}).parse(req.body);
  const result=await s.db.transaction(async tx=>{const initial=await lookup(tx,req.get('x-trialy-invitation'));await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[initial.workspace_id]);const r=await lookup(tx,req.get('x-trialy-invitation'));if(r.accepted_by){if(r.accepted_by!==req.actor!.userId)fail(404,'unavailable','This invitation is unavailable');return {workspaceId:r.workspace_id,accepted:true};}
   const p=await owner(tx,{userId:r.owner_id,origin:'human'},r.workspace_id,true),userId=req.actor!.userId;
   const membership=(await tx.query('SELECT role FROM memberships WHERE tenant_id=$1 AND user_id=$2',[p.tenant_id,userId])).rows[0];if(membership?.role==='owner'||(await tx.query('SELECT user_id FROM workspace_access WHERE workspace_id=$1 AND user_id=$2',[r.workspace_id,userId])).rows.length)fail(409,'existing_access','You already have access; ask the owner to edit it instead');
   const tables=(await tx.query('SELECT id FROM entity_types WHERE workspace_id=$1',[r.workspace_id])).rows;if(r.allowed_types.some((id:string)=>!tables.some(t=>t.id===id)))fail(409,'changed','The table selection changed; ask for a new invitation');
   await tx.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'viewer') ON CONFLICT DO NOTHING",[p.tenant_id,userId]);
   await tx.query('INSERT INTO workspace_access(workspace_id,user_id,role,allowed_types,ai_enabled) VALUES($1,$2,$3,$4,false)',[r.workspace_id,userId,r.role,JSON.stringify(r.allowed_types)]);
   await tx.query('UPDATE workspace_invitations SET accepted_by=$2,accepted_at=now() WHERE id=$1',[r.id,userId]);await audit(tx,req.actor!,p,'invitation.accepted',r.id,null,{userId,role:r.role,allowedTypes:r.allowed_types,ai:false,invitedBy:r.owner_id});return {workspaceId:r.workspace_id,accepted:true};
  });res.set('Cache-Control','no-store');res.json(result);
 });
}
