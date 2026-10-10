import type { Express, RequestHandler } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import type { Service } from '../domain/service.js';
import { operationSchema, id, AppError } from '../shared/schema.js';
export function addMcp(app:Express,s:Service,authenticate:RequestHandler) {
 app.post('/mcp',authenticate,async(req,res)=>{
  const actor=req.actor!;const server=new McpServer({name:'trialy',version:'0.1.0'});
  const resource='ui://trialy/workspace.html';
  const metadata={securitySchemes:[{type:'oauth2',scopes:[process.env.MCP_SCOPE??'trialy']}], 'openai/outputTemplate':resource};
  const result=(data:unknown)=>({content:[{type:'text' as const,text:JSON.stringify(data)}],structuredContent:{result:data}});
  const safe=(fn:(v:any)=>Promise<any>)=>async(v:any)=>{try{return result(await fn(v));}catch(e){return {isError:true,content:[{type:'text' as const,text:e instanceof AppError?e.message:'The action could not complete. Check its status before retrying.'}]};}};
  server.registerResource('workspace',resource,{mimeType:'text/html+skybridge'},async()=>({contents:[{uri:resource,mimeType:'text/html+skybridge',text:widget,_meta:{'openai/widgetDescription':'Trialy workspace results and save previews.','openai/widgetPrefersBorder':true,'openai/widgetCSP':{connect_domains:[],resource_domains:[]}}}]}));
  server.registerTool('list_workspaces',{title:'Open Trialy',description:'List workspaces the connected user has explicitly permitted AI to access.',inputSchema:{},annotations:{readOnlyHint:true},_meta:metadata},safe(()=>s.workspaces(actor)));
  server.registerTool('list_tables',{title:'List tables',description:'Get table schemas with inaccessible fields removed.',inputSchema:{workspaceId:id},annotations:{readOnlyHint:true},_meta:metadata},safe(v=>s.types(actor,v.workspaceId)));
  server.registerTool('read_records',{title:'Read records',description:'Read and search permitted records. Search only covers fields the model may access.',inputSchema:{workspaceId:id,typeId:id,q:z.string().max(500).optional(),limit:z.number().int().min(1).max(100).optional(),offset:z.number().int().min(0).optional()},annotations:{readOnlyHint:true},_meta:metadata},safe(v=>s.records(actor,v.workspaceId,v.typeId,v)));
  server.registerTool('prepare_change',{title:'Preview change',description:'Prepare a temporary unsaved change. Show the preview and obtain explicit confirmation before commit_change. Never assume a proposal has been saved.',inputSchema:{workspaceId:id,operation:operationSchema},annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},_meta:metadata},safe(v=>s.preview(actor,v.workspaceId,v.operation)));
  server.registerTool('commit_change',{title:'Save to Trialy',description:'Persist the exact preview only after the user explicitly confirms this preview. This creates an auditable version. Never call merely because a preview was requested. Use the returned receipt as evidence of saving.',inputSchema:{previewId:id,digest:z.string().length(64),confirmed:z.literal(true)},annotations:{readOnlyHint:false,destructiveHint:true,idempotentHint:true,openWorldHint:false},_meta:metadata},safe(v=>s.commit(actor,v.previewId,v.digest)));
  server.registerTool('discard_preview',{title:'Discard preview',description:'Discard a temporary preview without altering committed records.',inputSchema:{previewId:id},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false}},safe(v=>s.discard(actor,v.previewId)));
  server.registerTool('save_status',{title:'Check save status',description:'Reconcile an interrupted save before retrying. Saved receipts contain no document contents.',inputSchema:{previewId:id},annotations:{readOnlyHint:true}},safe(v=>s.receipt(actor,v.previewId)));
  server.registerTool('search_documents',{title:'Search documents',description:'Search only authorised AI-readable documents. Report coverage gaps: unavailable or partial extraction is not evidence that information is absent.',inputSchema:{workspaceId:id,query:z.string().min(1).max(500)},annotations:{readOnlyHint:true},_meta:metadata},safe(v=>s.search(actor,v.workspaceId,v.query)));
  const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
  res.on('close',()=>{void transport.close();void server.close();});await server.connect(transport);await transport.handleRequest(req,res,req.body);
 });
 app.get('/mcp',(_req,res)=>res.status(405).set('Allow','POST').end());
}
const widget=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:14px system-ui;color:#183934;background:#f5f8f6;margin:0;padding:20px}h2{font-size:18px;margin:0 0 12px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:white;padding:16px;border-radius:12px;max-height:480px;overflow:auto}small{color:#58726b}</style></head><body><h2>Trialy workspace</h2><small id="status">Connected workspace results</small><pre id="result"></pre><script>function draw(){const d=window.openai?.toolOutput?.result??window.openai?.toolOutput??{};document.getElementById('result').textContent=JSON.stringify(d,null,2);document.getElementById('status').textContent=d.status==='preview'?'Preview · not saved':d.status==='saved'?'Saved to Trialy':'Authorised workspace results';}window.addEventListener('openai:set_globals',draw);draw();</script></body></html>`;
