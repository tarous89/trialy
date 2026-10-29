import {withActor} from '../db/context.js';
import type {Express} from 'express';
import {rateLimit} from 'express-rate-limit';
import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {readFile} from 'node:fs/promises';
import {GuestDrafts,guestHandle,guestBundle,guestDestination} from '../workspace/guest-drafts.js';
import {frontendRequest} from '../workspace/frontend.js';
import {AppError,fail} from '../shared/schema.js';
import {token} from './local-oauth.js';
declare module 'express-session'{interface SessionData{draftReturn?:boolean}}
export function addGuestMcp(server:McpServer,d:GuestDrafts,metadata:any,connected=false){
 const safe=(fn:(v:any)=>Promise<any>)=>async(v:any)=>{try{const result=await fn(v);return {content:[{type:'text' as const,text:JSON.stringify(result)}],structuredContent:{result}};}catch(e){return {isError:true,content:[{type:'text' as const,text:e instanceof AppError?e.message:e instanceof z.ZodError?e.issues.map(x=>x.message).join('; '):'Temporary workspace unavailable. Your preview has not been saved.'}]};}};
 const meta={...metadata,securitySchemes:[{type:'noauth'}]};
 server.registerTool('preview_tracker',{title:'Connect to create',description:'Legacy entry point. Creating projects, trackers, forms, dashboards and automations requires a connected account. Connect, call initialize_account, then prepare_tracker to show a temporary tracker before saving. No new anonymous preview is created.',inputSchema:{bundle:guestBundle},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},_meta:{...metadata}},async()=>({isError:true,content:[{type:'text' as const,text:connected?'Your account is connected. Call initialize_account, then prepare_tracker to show the temporary tracker before saving; no project is required.':'Connect your TrialAgents account to create your tracker, form, dashboard or automation.'}],_meta:connected?{}:{'mcp/www_authenticate':[`Bearer resource_metadata="${process.env.PUBLIC_URL??'https://trialy-web.onrender.com'}/.well-known/oauth-protected-resource/mcp"`]}}));
 server.registerTool('open_tracker_preview',{title:'Open temporary tracker',description:'Reopen the same temporary tracker or check its save receipt. A preview handle never grants access to account data. Do not display the capability token in chat.',inputSchema:{handle:guestHandle},annotations:{readOnlyHint:true},_meta:meta},safe(v=>d.read(v.handle)));
 server.registerTool('run_tracker_preview',{title:'Run temporary interface',description:'Run isolated read-only temporary frontend code. No account data, network, files or database writes.',inputSchema:{handle:guestHandle,component:z.number().int().min(0).max(9),request:frontendRequest},annotations:{readOnlyHint:true},_meta:{...meta,ui:{...meta.ui,visibility:['app']}}},safe(v=>d.run(v)));
}
export function addGuestRoutes(app:Express,d:GuestDrafts,base:string){
 const persist=(req:any)=>new Promise<void>((resolve,reject)=>req.session.save((e:any)=>e?reject(e):resolve()));
 app.get('/save-preview',async(req,res)=>{req.session.draftReturn=true;req.session.csrf??=token();await persist(req);res.set('Cache-Control','no-store').set('Referrer-Policy','no-referrer').type('html').send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Save to TrialAgents</title><style>body{font:16px system-ui;background:#f4f7f5;color:#163a32;margin:0;padding:28px}main{max-width:840px;margin:auto;background:white;padding:28px;border-radius:16px}button,a{font:inherit;padding:12px;color:#17634c}button{cursor:pointer}pre{white-space:pre-wrap;overflow:auto;max-height:320px}#status{padding:14px 0}table{border-collapse:collapse}td,th{padding:8px;border:1px solid #ddd}.scroll{overflow:auto}</style></head><body><main><small>TRIALY</small><h1>Keep your tracker or page</h1><p id="status" role="status">Opening your temporary workspace…</p><div id="content"></div><div id="actions"></div></main><script src="/guest-save.js" defer></script></body></html>`);});
 app.get('/guest-save.js',async(_req,res)=>res.type('application/javascript').send(await readFile(new URL('./guest-save.js',import.meta.url),'utf8')));
 const limit=rateLimit({windowMs:60000,limit:30,standardHeaders:'draft-8',legacyHeaders:false});
 app.post('/guest/inspect',limit,async(req,res)=>{
  if(req.get('origin')!==new URL(base).origin)fail(403,'origin','Open the save page in TrialAgents');
  const draft=await d.read(req.body.handle);
  const account=req.session.userId?(await d.db.query('SELECT email FROM local_accounts WHERE user_id=$1',[req.session.userId])).rows[0]:null;
  req.session.csrf??=token();await persist(req);
  res.set('Cache-Control','no-store').json({...draft,csrf:req.session.csrf,destinations:account?await withActor({userId:req.session.userId!,origin:'human'},()=>d.destinations({userId:req.session.userId!,origin:'human'},req.body.handle)):[],account:account?{email:account.email,userId:req.session.userId}:null});
 });
 app.post('/guest/save',limit,async(req,res)=>{
  if(req.get('origin')!==new URL(base).origin||!req.session.csrf||req.get('x-csrf-token')!==req.session.csrf)fail(403,'csrf','Refresh the review before saving');
  const body=z.object({handle:guestHandle,digest:z.string().length(64),accountId:z.string().uuid(),confirmed:z.literal(true),allowAi:z.literal(true),destination:guestDestination.optional()}).strict().parse(req.body);
  if(!req.session.userId)fail(401,'sign_in','Connect your account to save');
  if(body.accountId!==req.session.userId)fail(409,'account_changed','The signed-in account changed. Review the destination account again.');
  const receipt=await withActor({userId:req.session.userId,origin:'human'},()=>d.claim({userId:req.session.userId!,origin:'human'},body.handle,body.digest,body.destination));
  delete req.session.draftReturn;await persist(req);res.set('Cache-Control','no-store').json(receipt);
 });
}

