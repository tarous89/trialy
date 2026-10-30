import {appPublicUrl,PLATFORM_ORIGIN} from '../shared/public-url.js';
import type {Express} from 'express';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {backgroundMetadata} from './ui-resource.js';
import {id,type Actor} from '../shared/schema.js';
import {appLocation} from '../shared/app-route.js';
import {prepareApp,prepareSimpleApp,prepareRenderedApp,readApp,openApp} from '../workspace/apps.js';
import type {WorkspaceFoundation} from '../workspace/service.js';
export function addAppApi(app:Express,f:WorkspaceFoundation){
 app.post('/api/apps/resolve',async(req,res)=>res.json(await readApp(f,req.actor!,req.body)));
 app.post('/api/workspaces/:workspaceId/apps/prepare',async(req,res)=>res.json(await prepareSimpleApp(f,req.actor!,id.parse(req.params.workspaceId),req.body)));
}
export function addAppMcp(server:McpServer,f:WorkspaceFoundation,a:Actor,safe:any,metadata:any){
 server.registerTool('open_app',{title:'Open app',description:'Open the authorized saved app or temporary preview inside the TrialAgents extension, including its requested page. Always show this interactive extension when presenting an app; a chat link is optional and never replaces it. Resources without an embedded app open the platform. Returns a secondary standalone URL. Existing permissions apply; this does not save or open a browser tab.',inputSchema:appLocation.shape,annotations:{readOnlyHint:true,openWorldHint:false},_meta:metadata},safe(async(v:any)=>{const r=await openApp(f,a,v);return {...r,url:new URL(r.url,appPublicUrl(process.env,PLATFORM_ORIGIN)).href};}));
 server.registerTool('read_app',{description:'Resolve an authorized app, draft or existing saved resource. Returns a relative app URL; clients must resolve it against the trusted configured platform origin. This does not launch a browser tab.',inputSchema:appLocation.shape,annotations:{readOnlyHint:true,openWorldHint:false},_meta:backgroundMetadata(metadata)},safe((v:any)=>readApp(f,a,v)));
 server.registerTool('prepare_app',{title:'Preview app',description:'Prepare and display a temporary app inside the TrialAgents extension from JavaScript source and declared data bindings. No category is required. A calculator can have no tables. Use input.route for internal page state. The response includes preview.id; displayStatus=awaiting_client does not prove host display. Saving still requires the existing explicit workspace-change confirmation. If display fails, retry opening the same preview once with open_app, then open_workspace. Node, packages, raw networking and background services are not available.',inputSchema:{workspaceId:id,...prepareApp.shape},annotations:{readOnlyHint:false,openWorldHint:false,destructiveHint:false},_meta:metadata},safe(({workspaceId,...v}:any)=>prepareRenderedApp(f,a,workspaceId,v)));
}
