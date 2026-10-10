import express, { type RequestHandler, type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z, ZodError } from 'zod';
import { randomUUID } from 'node:crypto';
import { AppError, id } from '../shared/schema.js';
import { Service } from '../domain/service.js';
import { templates } from '../domain/templates.js';
export function baseApp() {
 const app=express();app.disable('x-powered-by');app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],frameAncestors:["'self'"]}}}));
 app.use(express.json({limit:'36mb'}));app.use(rateLimit({windowMs:60000,limit:180,standardHeaders:'draft-8',legacyHeaders:false}));
 app.use((req,res,next)=>{const requestId=randomUUID();res.set('X-Request-ID',requestId);res.on('finish',()=>{if(process.env.NODE_ENV!=='test')console.log(JSON.stringify({requestId,method:req.method,status:res.statusCode,time:new Date().toISOString()}));});next();});
 app.get('/health',(_req,res)=>res.json({status:'ok',service:'trialy'}));return app;
}
export function addApi(app:express.Express,s:Service,human:RequestHandler) {
 app.get('/api/config',(_req,res)=>res.json({brand:process.env.BRAND_NAME??'Trialy',demo:process.env.LOCAL_DEMO==='true'&&process.env.NODE_ENV!=='production'}));
 app.use('/api',human);app.use('/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
 app.get('/api/me',async(req,res)=>{const u=(await s.db.query('SELECT id,name,email FROM users WHERE id=$1',[req.actor!.userId])).rows[0];res.json({user:u,csrf:req.session?.csrf,workspaces:await s.workspaces(req.actor!)});});
 app.post('/api/workspaces',async(req,res)=>res.status(201).json(await s.createWorkspace(req.actor!,z.string().trim().min(1).max(100).parse(req.body.name))));
 app.get('/api/templates',(_req,res)=>res.json(templates));
 app.param('workspaceId',(req,_res,next,value)=>{id.parse(value);next();});
 app.get('/api/workspaces/:workspaceId/types',async(req,res)=>res.json(await s.types(req.actor!,String(req.params.workspaceId))));
 app.get('/api/workspaces/:workspaceId/types/:typeId/records',async(req,res)=>{const opts=z.object({q:z.string().max(500).optional(),limit:z.coerce.number().int().min(1).max(100).optional(),offset:z.coerce.number().int().min(0).optional()}).parse(req.query);res.json(await s.records(req.actor!,String(req.params.workspaceId),id.parse(req.params.typeId),opts));});
 app.get('/api/workspaces/:workspaceId/records/:recordId/versions',async(req,res)=>res.json(await s.recordHistory(req.actor!,String(req.params.workspaceId),id.parse(req.params.recordId),z.coerce.number().int().min(0).default(0).parse(req.query.offset))));
 app.get('/api/workspaces/:workspaceId/documents/:versionId/text',async(req,res)=>res.json(await s.documentText(req.actor!,String(req.params.workspaceId),id.parse(req.params.versionId),z.coerce.number().int().min(0).default(0).parse(req.query.offset))));
 app.get('/api/workspaces/:workspaceId/views',async(req,res)=>res.json(await s.views(req.actor!,String(req.params.workspaceId))));
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
 app.get('/api/workspaces/:workspaceId/history',async(req,res)=>res.json(await s.history(req.actor!,String(req.params.workspaceId))));
 app.post('/api/workspaces/:workspaceId/ai-access',async(req,res)=>res.json(await s.setAi(req.actor!,String(req.params.workspaceId),z.boolean().parse(req.body.enabled))));
 app.get('/api/workspaces/:workspaceId/members',async(req,res)=>res.json(await s.members(req.actor!,String(req.params.workspaceId))));
 app.post('/api/workspaces/:workspaceId/members',async(req,res)=>{const p=z.object({userId:id,role:z.enum(['editor','viewer']),hiddenFields:z.array(z.string()).max(100),allowedTypes:z.array(id).nullable(),ai:z.boolean()}).parse(req.body);res.json(await s.share(req.actor!,String(req.params.workspaceId),p.userId,p.role,p.hiddenFields,p.allowedTypes,p.ai));});
 app.delete('/api/workspaces/:workspaceId/members/:userId',async(req,res)=>res.json(await s.unshare(req.actor!,String(req.params.workspaceId),id.parse(req.params.userId))));
 app.post('/api/workspaces/:workspaceId/records/:recordId/state',async(req,res)=>{const p=z.object({expectedVersion:z.number().int().min(0),state:z.enum(['in_review','approved','archived']),meaning:z.string().min(1).max(1000)}).parse(req.body);res.json(await s.transition(req.actor!,String(req.params.workspaceId),id.parse(req.params.recordId),p.expectedVersion,p.state,p.meaning));});
 app.get('/api/workspaces/:workspaceId/export',async(req,res)=>{const data=await s.exportWorkspace(req.actor!,String(req.params.workspaceId));res.set('Content-Disposition','attachment; filename="trialy-workspace-export.json"');res.json(data);});
 app.get('/api/workspaces/:workspaceId/automations',async(req,res)=>res.json(await s.automations(req.actor!,String(req.params.workspaceId))));
 app.get('/api/workspaces/:workspaceId/runs',async(req,res)=>res.json(await s.runs(req.actor!,String(req.params.workspaceId))));
 app.post('/api/workspaces/:workspaceId/automations/:automationId/pause',async(req,res)=>res.json(await s.pause(req.actor!,String(req.params.workspaceId),id.parse(req.params.automationId),z.boolean().parse(req.body.paused))));
 app.get('/api/workspaces/:workspaceId/grants',async(req,res)=>res.json(await s.grants(req.actor!,String(req.params.workspaceId))));
 app.post('/api/workspaces/:workspaceId/grants',async(req,res)=>{const g=z.object({action:z.enum(['records.create','documents.import','reports.prepare']),destination:z.string().min(1).max(200),future:z.boolean()}).parse(req.body);res.json(await s.grant(req.actor!,String(req.params.workspaceId),g.action,g.destination,g.future));});
 app.delete('/api/workspaces/:workspaceId/grants/:grantId',async(req,res)=>res.json(await s.revoke(req.actor!,String(req.params.workspaceId),id.parse(req.params.grantId))));
}
export const errors:ErrorRequestHandler=(error,_req,res,_next)=>{
 if(error instanceof ZodError){res.status(400).json({error:'invalid_input',message:error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')});return;}
 if(error instanceof AppError){res.status(error.status).json({error:error.code,message:error.message});return;}
 if(error?.code==='23505'){res.status(409).json({error:'conflict',message:'This already exists. Refresh and choose a different name.'});return;}
 if(error?.type==='entity.too.large'){res.status(413).json({error:'too_large',message:'Upload exceeds the configured limit.'});return;}
 console.error(JSON.stringify({event:'request_failed',code:error?.code??'unknown'}));res.status(500).json({error:'unavailable',message:'This action was not confirmed. Refresh its status before retrying.'});
};
