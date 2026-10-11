import {frontendFrameDocument,FRAME_SCRIPT} from '../shared/frontend-frame.js';
import {createHash} from 'node:crypto';
import {addFoundationApi} from './foundation.js';
import {addReviews} from './reviews.js';
import {addInvitations} from './invitations.js';
import {addExternal} from './external.js';
import express, { type RequestHandler, type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z, ZodError } from 'zod';
import { randomUUID } from 'node:crypto';
import { AppError, id, recordQuerySchema, fieldChangeQuerySchema } from '../shared/schema.js';
import { Service } from '../domain/service.js';
import {inspectionHtml} from '../domain/inspection.js';
import { templates } from '../domain/templates.js';
export function baseApp() {
 const app=express();app.disable('x-powered-by');app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],frameAncestors:["'self'"]}}}));
 // Public stateless frame shell. HTTP sandbox also protects direct navigation.
 app.get('/frontend/frame',async(_req,res)=>{
  const hash=createHash('sha256').update(FRAME_SCRIPT).digest('base64');
  res.removeHeader('X-Frame-Options');res.set('Content-Security-Policy',`sandbox allow-scripts; default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`);
  res.set('Cache-Control','no-store');res.set('Cross-Origin-Resource-Policy','cross-origin');res.type('html').send(await frontendFrameDocument());
 });
 app.use(express.json({limit:'36mb'}));app.use(rateLimit({windowMs:60000,limit:180,standardHeaders:'draft-8',legacyHeaders:false}));
 app.use((req,res,next)=>{const requestId=randomUUID();res.set('X-Request-ID',requestId);res.on('finish',()=>{if(process.env.NODE_ENV!=='test')console.log(JSON.stringify({requestId,method:req.method,status:res.statusCode,time:new Date().toISOString()}));});next();});
 app.get('/health',(_req,res)=>res.json({status:'ok',service:'trialy'}));return app;
}
export function addApi(app:express.Express,s:Service,human:RequestHandler) {
 addExternal(app,s,human);
 addInvitations(app,s,human);
 app.get('/api/config',(_req,res)=>res.json({brand:process.env.BRAND_NAME??'Trialy',demo:process.env.LOCAL_DEMO==='true'&&process.env.NODE_ENV!=='production'}));
 app.use('/api',human);app.use('/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
 addReviews(app,s);
 addFoundationApi(app,s);
 app.get('/api/me',async(req,res)=>{const u=(await s.db.query('SELECT id,name,email FROM users WHERE id=$1',[req.actor!.userId])).rows[0];res.json({user:u,csrf:req.session?.csrf,workspaces:await s.workspaces(req.actor!)});});
 app.post('/api/workspaces',async(req,res)=>res.status(201).json(await s.createWorkspace(req.actor!,z.string().trim().min(1).max(100).parse(req.body.name))));
 app.get('/api/templates',(_req,res)=>res.json(templates));
 app.param('workspaceId',(req,_res,next,value)=>{id.parse(value);next();});
 app.get('/api/workspaces/:workspaceId/template-upgrades',async(req,res)=>res.json(await s.templateUpgrades(req.actor!,String(req.params.workspaceId))));
 app.get('/api/workspaces/:workspaceId/types',async(req,res)=>res.json(await s.types(req.actor!,String(req.params.workspaceId))));
 app.get('/api/workspaces/:workspaceId/types/:typeId/records',async(req,res)=>{const opts=recordQuerySchema.parse(req.query);res.json(await s.records(req.actor!,String(req.params.workspaceId),id.parse(req.params.typeId),opts));});
 app.get('/api/workspaces/:workspaceId/records/:recordId/versions',async(req,res)=>res.json(await s.recordHistory(req.actor!,String(req.params.workspaceId),id.parse(req.params.recordId),z.coerce.number().int().min(0).default(0).parse(req.query.offset))));
 app.get('/api/workspaces/:workspaceId/documents/:versionId/text',async(req,res)=>res.json(await s.documentText(req.actor!,String(req.params.workspaceId),id.parse(req.params.versionId),z.coerce.number().int().min(0).default(0).parse(req.query.offset))));
 app.get('/api/workspaces/:workspaceId/types/:typeId/aggregate',async(req,res)=>res.json(await s.aggregate(req.actor!,String(req.params.workspaceId),id.parse(req.params.typeId),recordQuerySchema.extend({groupBy:z.string().optional(),metric:z.string().optional()}).parse(req.query))));
 app.get('/api/workspaces/:workspaceId/views',async(req,res)=>res.json(await s.views(req.actor!,String(req.params.workspaceId))));
 app.get('/api/workspaces/:workspaceId/previews',async(req,res)=>res.json(await s.pendingChanges(req.actor!,id.parse(req.params.workspaceId))));
 app.get('/api/workspaces/:workspaceId/creation-archives',async(req,res)=>res.json(await s.creationArchives(req.actor!,id.parse(req.params.workspaceId),z.coerce.number().int().min(0).default(0).parse(req.query.offset))));
 app.get('/api/workspaces/:workspaceId/field-changes',async(req,res)=>res.json(await s.fieldChanges(req.actor!,id.parse(req.params.workspaceId),fieldChangeQuerySchema.parse(req.query))));
 app.post('/api/workspaces/:workspaceId/previews',async(req,res)=>res.status(201).json(await s.preview(req.actor!,String(req.params.workspaceId),req.body)));
 app.post('/api/previews/:previewId/commit',async(req,res)=>{const body=z.object({digest:z.string().length(64),confirmed:z.literal(true)}).parse(req.body);res.json(await s.commit(req.actor!,id.parse(req.params.previewId),body.digest));});
 app.delete('/api/previews/:previewId',async(req,res)=>res.json(await s.discard(req.actor!,id.parse(req.params.previewId))));
 app.get('/api/receipts/:previewId',async(req,res)=>res.json(await s.receipt(req.actor!,id.parse(req.params.previewId))));
 app.get('/api/workspaces/:workspaceId/documents',async(req,res)=>res.json(await s.documents(req.actor!,String(req.params.workspaceId))));
 app.post('/api/workspaces/:workspaceId/documents/preview',async(req,res)=>{
  const f=z.object({filename:z.string().min(1).max(250),mime:z.string().min(1).max(150),base64:z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/),ai:z.boolean().default(false),documentId:id.optional(),expectedVersion:z.number().int().min(0).optional()}).parse(req.body);
  res.json(await s.previewFile(req.actor!,String(req.params.workspaceId),{...f,bytes:Buffer.from(f.base64,'base64')}));
 });
 app.get('/api/workspaces/:workspaceId/documents/:versionId/download',async(req,res)=>{
  const d=await s.original(req.actor!,String(req.params.workspaceId),id.parse(req.params.versionId));res.set('Content-Type','application/octet-stream');res.set('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(d.filename)}`);res.send(d.bytes);
 });
 app.get('/api/workspaces/:workspaceId/search',async(req,res)=>res.json(await s.search(req.actor!,String(req.params.workspaceId),z.string().min(1).max(500).parse(req.query.q))));
 app.get('/api/workspaces/:workspaceId/policy',async(req,res)=>res.json(await s.workspacePolicy(req.actor!,String(req.params.workspaceId))));
 app.post('/api/workspaces/:workspaceId/documents/:versionId/acknowledge',async(req,res)=>{const b=z.object({meaning:z.string().trim().min(1).max(1000),confirmed:z.literal(true)}).parse(req.body);res.json(await s.acknowledgeDocument(req.actor!,String(req.params.workspaceId),id.parse(req.params.versionId),b.meaning));});
 app.post('/api/workspaces/:workspaceId/documents/:versionId/review',async(req,res)=>{const b=z.object({expectedVersion:z.number().int().min(-1),state:z.enum(['in_review','approved']),meaning:z.string().trim().min(1).max(1000),confirmed:z.literal(true)}).parse(req.body);res.json(await s.reviewDocument(req.actor!,String(req.params.workspaceId),id.parse(req.params.versionId),b.expectedVersion,b.state,b.meaning));});
 app.get('/api/workspaces/:workspaceId/history',async(req,res)=>res.json(await s.history(req.actor!,String(req.params.workspaceId),z.object({offset:z.coerce.number().int().min(0).optional(),action:z.string().max(100).optional(),actorId:id.optional()}).parse(req.query))));
 app.post('/api/workspaces/:workspaceId/ai-access',async(req,res)=>res.json(await s.setAi(req.actor!,String(req.params.workspaceId),z.boolean().parse(req.body.enabled))));
 app.get('/api/workspaces/:workspaceId/access-rules',async(req,res)=>res.json(await s.accessRules(req.actor!,String(req.params.workspaceId))));
 app.post('/api/workspaces/:workspaceId/access-rules',async(req,res)=>{const input=z.object({expectedVersion:z.number().int().min(0),aiHiddenTypes:z.array(id).max(500),folder:z.object({name:z.string().min(1).max(100),allowedUsers:z.array(id).max(500).nullable(),ai:z.boolean()}).optional(),document:z.object({documentId:id,allowedUsers:z.array(id).max(500).nullable(),ai:z.boolean(),expectedVersion:z.number().int().min(-1)}).optional()}).parse(req.body);res.json(await s.setAccessRules(req.actor!,String(req.params.workspaceId),input));});
 app.get('/api/workspaces/:workspaceId/members',async(req,res)=>res.json(await s.members(req.actor!,String(req.params.workspaceId))));
 app.post('/api/workspaces/:workspaceId/members',async(req,res)=>{const p=z.object({userId:id,role:z.enum(['editor','viewer','inspector']),hiddenFields:z.array(z.string().max(160)).max(10000),allowedTypes:z.array(id).nullable(),ai:z.boolean()}).parse(req.body);res.json(await s.share(req.actor!,String(req.params.workspaceId),p.userId,p.role,p.hiddenFields,p.allowedTypes,p.ai));});
 app.delete('/api/workspaces/:workspaceId/members/:userId',async(req,res)=>res.json(await s.unshare(req.actor!,String(req.params.workspaceId),id.parse(req.params.userId))));
 app.post('/api/workspaces/:workspaceId/records/:recordId/state',async(req,res)=>{const p=z.object({expectedVersion:z.number().int().min(0),state:z.enum(['in_review','approved','archived']),meaning:z.string().min(1).max(1000)}).parse(req.body);res.json(await s.transition(req.actor!,String(req.params.workspaceId),id.parse(req.params.recordId),p.expectedVersion,p.state,p.meaning));});
 app.get('/api/workspaces/:workspaceId/export',async(req,res)=>{const data=await s.exportWorkspace(req.actor!,String(req.params.workspaceId));if(req.query.format==='html'){res.set('Content-Disposition','attachment; filename="trialy-inspection.html"');res.type('html').send(inspectionHtml(data));}else{res.set('Content-Disposition','attachment; filename="trialy-workspace-export.json"');res.json(data);}});
 app.get('/api/workspaces/:workspaceId/automations',async(req,res)=>res.json(await s.automations(req.actor!,String(req.params.workspaceId))));
 app.get('/api/workspaces/:workspaceId/runs',async(req,res)=>res.json(await s.runs(req.actor!,String(req.params.workspaceId))));
 app.post('/api/workspaces/:workspaceId/automations/:automationId/pause',async(req,res)=>res.json(await s.pause(req.actor!,String(req.params.workspaceId),id.parse(req.params.automationId),z.boolean().parse(req.body.paused))));
 app.get('/api/workspaces/:workspaceId/grants',async(req,res)=>res.json(await s.grants(req.actor!,String(req.params.workspaceId))));
 app.post('/api/workspaces/:workspaceId/grants',async(req,res)=>{const g=z.object({action:z.enum(['records.create','documents.import','reports.prepare','reminders.create']),destination:z.string().min(1).max(200),future:z.boolean()}).parse(req.body);res.json(await s.grant(req.actor!,String(req.params.workspaceId),g.action,g.destination,g.future));});
 app.delete('/api/workspaces/:workspaceId/grants/:grantId',async(req,res)=>res.json(await s.revoke(req.actor!,String(req.params.workspaceId),id.parse(req.params.grantId))));
}
export const errors:ErrorRequestHandler=(error,_req,res,_next)=>{
 if(error instanceof ZodError){res.status(400).json({error:'invalid_input',message:error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')});return;}
 if(error instanceof AppError){res.status(error.status).json({error:error.code,message:error.message});return;}
 if(error?.code==='23505'){res.status(409).json({error:'conflict',message:'This already exists. Refresh and choose a different name.'});return;}
 if(error?.type==='entity.too.large'){res.status(413).json({error:'too_large',message:'Upload exceeds the configured limit.'});return;}
 console.error(JSON.stringify({event:'request_failed',code:error?.code??'unknown'}));res.status(500).json({error:'unavailable',message:'This action was not confirmed. Refresh its status before retrying.'});
};
