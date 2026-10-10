import type {Express,RequestHandler} from 'express';
import {randomUUID,randomBytes} from 'node:crypto';
import {z} from 'zod';
import {rateLimit} from 'express-rate-limit';
import {Service,audit,checksum} from '../domain/service.js';
import {access,typeAccess,visibleFields} from '../domain/permissions.js';
import {id,fail,type Actor} from '../shared/schema.js';
import type {Connection,Database} from '../db/database.js';
const primitive=(f:any)=>!['document','relationship','person'].includes(f.kind);
const scoped=(tx:Connection):Database=>({query:(q,v)=>tx.query(q,v),transaction:fn=>fn(tx),close:async()=>{}});
export function addExternal(app:Express,s:Service,human:RequestHandler){
 const root='/api/workspaces/:workspaceId/exchange';
 const owner=async(tx:Connection,a:Actor,w:string,write=false)=>{const p=await access(tx,a,w,write);if(a.origin!=='human'||p.role!=='owner')fail(403,'owner_required','Human owner required');return p;};
 app.get(root,human,async(req,res)=>{const w=id.parse(req.params.workspaceId);await owner(s.db,req.actor!,w);res.set('Cache-Control','no-store');res.json({links:(await s.db.query('SELECT id,kind,name,type_id,fields,expires_at,revoked_at FROM external_links WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 100',[w])).rows,submissions:(await s.db.query('SELECT f.*,a.record_id FROM form_submissions f LEFT JOIN submission_acceptances a ON a.submission_id=f.id WHERE f.workspace_id=$1 ORDER BY f.created_at DESC LIMIT 100',[w])).rows});});
 app.post(root,human,async(req,res)=>{
  const w=id.parse(req.params.workspaceId),input=z.object({kind:z.enum(['form','view']),name:z.string().trim().min(1).max(100),typeId:id,fields:z.array(z.string()).min(1).max(100),viewId:id.optional(),days:z.number().int().min(1).max(90),confirmed:z.literal(true)}).parse(req.body);
  const raw=randomBytes(32).toString('base64url');const result=await s.db.transaction(async tx=>{
   await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await owner(tx,req.actor!,w,true),{type,policy}=await typeAccess(tx,req.actor!,w,input.typeId),fields=visibleFields(type.fields,policy,req.actor!);
   if(input.fields.some(k=>!fields.some(f=>f.key===k&&primitive(f)&&!(input.kind==='form'&&f.formula))))fail(400,'invalid_field','Choose permitted simple fields');
   if(input.kind==='form'&&fields.some(f=>f.required&&!input.fields.includes(f.key)))fail(400,'required_field','Include every required field');
   const view=input.viewId?(await tx.query('SELECT * FROM saved_views WHERE id=$1 AND workspace_id=$2 AND type_id=$3',[input.viewId,w,input.typeId])).rows[0]:null;
   if(input.kind==='view'&&!view)fail(400,'view_required','Choose a saved view');
   const linkId=randomUUID();await tx.query('INSERT INTO external_links(id,workspace_id,owner_id,token_hash,kind,name,type_id,type_version,fields,view_id,view_version,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now()+$12*interval \'1 day\')',[linkId,w,req.actor!.userId,checksum(raw),input.kind,input.name,input.typeId,type.version,JSON.stringify([...new Set(input.fields)]),view?.id??null,view?.version??null,input.days]);
   await audit(tx,req.actor!,p,'external_link.created',linkId,null,{...input,token:undefined});return {id:linkId};
  });res.set('Cache-Control','no-store');res.json({...result,path:'/collect#'+raw});
 });
 app.post(root+'/:linkId/revoke',human,async(req,res)=>{const w=id.parse(req.params.workspaceId);await s.db.transaction(async tx=>{await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await owner(tx,req.actor!,w);const link=(await tx.query('UPDATE external_links SET revoked_at=now() WHERE id=$1 AND workspace_id=$2 RETURNING id',[id.parse(req.params.linkId),w])).rows[0];if(!link)fail(404,'not_found','Link not found');await audit(tx,req.actor!,p,'external_link.revoked',link.id,null,{revoked:true});});res.json({ok:true});});
 const limited=rateLimit({windowMs:15*60000,limit:60,standardHeaders:true,legacyHeaders:false});
 app.use('/external-data',limited,(_req,res,next)=>{res.set('Cache-Control','no-store');res.set('Referrer-Policy','no-referrer');next();});
 async function linkFor(tx:Connection,raw:unknown){const key=z.string().regex(/^[A-Za-z0-9_-]{43}$/).parse(raw);const link=(await tx.query('SELECT * FROM external_links WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now()',[checksum(key)])).rows[0];if(!link)fail(404,'not_found','This link is unavailable');const actor:Actor={userId:link.owner_id,origin:'human'};const p=await owner(tx,actor,link.workspace_id);if(p.archived)fail(410,'link_inactive','This link is unavailable');const {type,policy}=await typeAccess(tx,actor,link.workspace_id,link.type_id);if(type.version!==link.type_version)fail(409,'form_changed','The configuration changed. Ask for a new link');if(link.view_id){const view=(await tx.query('SELECT version FROM saved_views WHERE id=$1',[link.view_id])).rows[0];if(!view||view.version!==link.view_version)fail(409,'view_changed','The view changed. Ask for a new link');}const fields=visibleFields(type.fields,policy,actor).filter(f=>link.fields.includes(f.key));if(fields.length!==link.fields.length)fail(403,'link_unavailable','The link is unavailable');return {link,actor,type,policy,fields};}
 app.get('/external-data',async(req,res)=>{const {link,actor,fields}=await linkFor(s.db,req.get('x-trialy-link'));const page=z.coerce.number().int().min(0).max(10000).default(0).parse(req.query.page);const result=link.kind==='view'?await s.records(actor,link.workspace_id,link.type_id,{viewId:link.view_id,limit:50,offset:page*50}):null;res.json({name:link.name,kind:link.kind,fields:fields.map(({key,name,kind,required,options})=>({key,name,kind,required,options})),rows:result?.rows.map(r=>({data:Object.fromEntries(fields.map(f=>[f.key,r.data[f.key]??null]))})),total:result?.total,page});});
 app.post('/external-data',async(req,res)=>{
  const input=z.object({nonce:id,confirmed:z.literal(true),data:z.record(z.string(),z.union([z.string().max(50000),z.number().finite(),z.boolean(),z.null()]))}).parse(req.body);if(Buffer.byteLength(JSON.stringify(input.data))>100000)fail(413,'too_large','Response is too large');
  const result=await s.db.transaction(async tx=>{const initial=await linkFor(tx,req.get('x-trialy-link'));await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[initial.link.workspace_id]);const {link,actor,type,policy,fields}=await linkFor(tx,req.get('x-trialy-link'));if(link.kind!=='form')fail(403,'read_only','This link is read-only');
   if(Object.keys(input.data).some(k=>!fields.some(f=>f.key===k)))fail(400,'invalid_field','Unexpected field');
   const old=(await tx.query('SELECT id,data FROM form_submissions WHERE link_id=$1 AND nonce=$2',[link.id,input.nonce])).rows[0];if(old){if(checksum(JSON.stringify(old.data,Object.keys(old.data).sort()))!==checksum(JSON.stringify(input.data,Object.keys(input.data).sort())))fail(409,'retry_mismatch','Submission differs from the original confirmation');return {id:old.id,status:'submitted'};}
   if(Number((await tx.query('SELECT count(*) AS count FROM form_submissions WHERE link_id=$1',[link.id])).rows[0].count)>=1000)fail(409,'form_closed','This form has reached its response limit');
   await new Service(scoped(tx)).validateData(tx,actor,link.workspace_id, {...type,fields:type.fields.map((f:any)=>({...f,unique:false}))},policy,input.data);
   const submissionId=randomUUID();await tx.query('INSERT INTO form_submissions(id,workspace_id,link_id,type_id,nonce,data) VALUES($1,$2,$3,$4,$5,$6)',[submissionId,link.workspace_id,link.id,link.type_id,input.nonce,JSON.stringify(input.data)]);return {id:submissionId,status:'submitted'};
  });res.json(result);
 });
}
