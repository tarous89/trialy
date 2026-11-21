import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {GUIDE_VERSION,guideChecksum} from '../workspace/guide.js';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
// 5.6 (D37): the design references were replaced by one guide and one technical reference. Their resource names stay as
// aliases so older plugins keep working; the kit's source assets and the automation references are unchanged.
const GUIDE='../../templates/APP_GUIDE.md',REFERENCE='../../templates/APP_REFERENCE.md';
const paths={baseline:GUIDE,monitoring:'../workspace/references/SHARED_AUTOMATIONS.md','legacy-monitoring':'../workspace/references/APP_MONITORING.md',services:'../workspace/references/APP_SERVICES.md',components:'assets/vivid-template/components.json',template:REFERENCE,styles:'assets/vivid-template/theme.css',catalog:'assets/vivid-template/catalog.html',manifest:'assets/vivid-template/manifest.json',configuration:REFERENCE,parity:REFERENCE,skeleton:'assets/connected-tracker.js',workflow:'../workspace/WORKSPACE.md',skill:GUIDE,integration:REFERENCE,theme:GUIDE,data:REFERENCE,interaction:GUIDE,discovery:GUIDE,qa:GUIDE,html:'assets/approved-theme2-reference.html'} as const;
export const designRequest=z.object({resource:z.enum(['baseline','monitoring','legacy-monitoring','services','components','template','styles','catalog','manifest','configuration','parity','skeleton','workflow','skill','integration','theme','data','interaction','discovery','qa','html']).default('skill'),offset:z.number().int().min(0).default(0)}).strict();
export async function readTrackerDesign(input:unknown){
 const {resource,offset}=designRequest.parse(input);
 let source=await readFile(new URL('../../resources/tracker-design/'+paths[resource],import.meta.url),'utf8');
 if(resource==='skeleton')source=await readFile(new URL('../../resources/tracker-design/assets/vivid-template/runtime.js',import.meta.url),'utf8')+source;
 if(offset>source.length)throw new Error('Offset exceeds resource length');
 const text=source.slice(offset,offset+12000),end=offset+text.length;
 return {resource,...(paths[resource]===GUIDE?{alias:'guide'}:paths[resource]===REFERENCE?{alias:'reference'}:{}),version:GUIDE_VERSION,guideChecksum:guideChecksum(),resources:Object.keys(paths),sha256:createHash('sha256').update(source).digest('hex'),offset,totalCharacters:source.length,nextOffset:end<source.length?end:null,text};
}
export function addTrackerDesignMcp(server:McpServer){
 server.registerTool('read_app_monitoring_guide',{description:'Read current TrialAgents Automations instructions for recurring app work. Defaults to shared scheduling, including for older clients. Use mode legacy only to maintain or execute an existing legacy monitor identified by read_app_monitoring; never to create a new per-app ChatGPT task. Page through nextOffset; contains no account data.',inputSchema:{offset:z.number().int().min(0).default(0),mode:z.enum(['current','legacy']).default('current')},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},_meta:{securitySchemes:[{type:'noauth'}]}},async({offset,mode})=>{const result=await readTrackerDesign({resource:mode==='legacy'?'legacy-monitoring':'monitoring',offset});return {content:[{type:'text' as const,text:JSON.stringify(result)}],structuredContent:{result}};});
 server.registerTool('read_app_services',{description:'Read the current app sharing, TrialAgents email notification, durable LLM/API connector, background action and trigger contracts. Page through nextOffset. Contains no account data.',inputSchema:{offset:z.number().int().min(0).default(0)},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},_meta:{securitySchemes:[{type:'noauth'}]}},async({offset})=>{const result=await readTrackerDesign({resource:'services',offset});return {content:[{type:'text' as const,text:JSON.stringify(result)}],structuredContent:{result}};});
 server.registerTool('read_tracker_design',{title:'Read tracker design defaults',description:'Returns paginated versioned tracker documentation, the HTML reference, or the standard renderer source. Includes a content hash and nextOffset. Contains no account data.',inputSchema:designRequest.shape,annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},_meta:{securitySchemes:[{type:'noauth'}]}},async input=>{
  try{const result=await readTrackerDesign(input);return {content:[{type:'text' as const,text:JSON.stringify(result)}],structuredContent:{result}};}
  catch{return {isError:true,content:[{type:'text' as const,text:'Design resource unavailable or offset invalid.'}]};}
 });
}


