import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {ResourceTemplate,type McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {McpError,ErrorCode} from '@modelcontextprotocol/sdk/types.js';
// Content-addressed resources prevent a cached host widget from surviving a UI release.
let cached:Promise<{html:string;build:string;uri:string}>|undefined;
export function workspaceResource(){
 return cached??=loadWorkspaceResource();
}
async function loadWorkspaceResource(){
 const html=await readFile(new URL('../../dist/embed.html',import.meta.url),'utf8');
 const build=createHash('sha256').update(html).digest('hex').slice(0,16);
 return {html,build,uri:`ui://trialy/workspace-${build}.html`};
}
export function backgroundMetadata(metadata:any){
 const {ui,...rest}=metadata;
 delete rest['openai/outputTemplate'];
 return {...rest,...(ui?.visibility?{ui:{visibility:ui.visibility}}:{})};
}
export function registerWorkspaceResources(server:McpServer,bundle:Awaited<ReturnType<typeof workspaceResource>>,frameDomains:string[]){
 const mimeType='text/html;profile=mcp-app';
 const _meta={ui:{prefersBorder:true,csp:{connectDomains:[],resourceDomains:[],frameDomains:[...new Set(frameDomains)]}},'openai/widgetDescription':'The TrialAgents workspace: data, code, functions and confirmed saves inside ChatGPT.','openai/ui':{availableDisplayModes:['inline','fullscreen'],preferredDisplayMode:'fullscreen'}};
 const read=async(uri:URL)=>({contents:[{uri:uri.href,mimeType,text:bundle.html,_meta}]});
 server.registerResource('workspace',bundle.uri,{mimeType,_meta},read);
 server.registerResource('workspace-legacy','ui://trialy/workspace.html',{mimeType,_meta},read);
 // Hosts can retain a tool descriptor from an earlier deployment. Keep its UI
 // address readable; account data and permissions are still resolved at runtime.
 server.registerResource('workspace-cached',new ResourceTemplate('ui://trialy/workspace-{build}.html',{list:undefined}),{mimeType,_meta},async(uri,{build})=>{
  if(typeof build!=='string'||!/^[a-f0-9]{16}$/.test(build))throw new McpError(ErrorCode.InvalidParams,'Unknown workspace resource');
  return read(uri);
 });
}
