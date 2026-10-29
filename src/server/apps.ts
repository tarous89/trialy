import type {Express} from 'express';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {backgroundMetadata} from './ui-resource.js';
import {id,type Actor} from '../shared/schema.js';
import {appLocation} from '../shared/app-route.js';
import {prepareApp,prepareSimpleApp,readApp} from '../workspace/apps.js';
import type {WorkspaceFoundation} from '../workspace/service.js';
export function addAppApi(app:Express,f:WorkspaceFoundation){
 app.post('/api/apps/resolve',async(req,res)=>res.json(await readApp(f,req.actor!,req.body)));
 app.post('/api/workspaces/:workspaceId/apps/prepare',async(req,res)=>res.json(await prepareSimpleApp(f,req.actor!,id.parse(req.params.workspaceId),req.body)));
}
export function addAppMcp(server:McpServer,f:WorkspaceFoundation,a:Actor,safe:any,metadata:any){
 server.registerTool('open_app',{title:'Open app',description:'Return a trusted Open app link for an authorized saved app or temporary preview, including its page route. The user opens the link in a separate tab; tool calls never open unsolicited tabs. No category is required.',inputSchema:appLocation.shape,annotations:{readOnlyHint:true,openWorldHint:false},_meta:metadata},safe(async(v:any)=>{const r=await readApp(f,a,v);return {screen:'app-link',...v,url:new URL(r.url,process.env.PUBLIC_URL??'https://trialy-web.onrender.com').href,name:'component' in r?r.component.name:'resource' in r?r.resource.name:'App preview'};}));
 server.registerTool('read_app',{description:'Resolve an authorized app, draft or existing saved resource. Returns a relative app URL; clients must resolve it against the trusted configured platform origin. This does not launch a browser tab.',inputSchema:appLocation.shape,annotations:{readOnlyHint:true,openWorldHint:false},_meta:backgroundMetadata(metadata)},safe((v:any)=>readApp(f,a,v)));
 server.registerTool('prepare_app',{description:'Prepare a simple app from JavaScript source and declared data bindings. No category is required. A calculator can have no tables. Use input.route for internal page state. Saving still uses the existing explicit workspace-change confirmation. Node, packages, raw networking and background services are not available.',inputSchema:{workspaceId:id,...prepareApp.shape},annotations:{readOnlyHint:false,openWorldHint:false,destructiveHint:false},_meta:backgroundMetadata(metadata)},safe(({workspaceId,...v}:any)=>prepareSimpleApp(f,a,workspaceId,v)));
}
