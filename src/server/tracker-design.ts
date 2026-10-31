import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
const paths={monitoring:'../trialy-workspace/references/APP_MONITORING.md',services:'../trialy-workspace/references/APP_SERVICES.md',components:'assets/vivid-template/components.json',template:'references/TEMPLATE_REUSE.md',styles:'assets/vivid-template/theme.css',catalog:'assets/vivid-template/catalog.html',manifest:'assets/vivid-template/manifest.json',configuration:'references/CONFIGURATION.md',parity:'references/REFERENCE_PARITY.md',skeleton:'assets/connected-tracker.js',workflow:'../trialy-workspace/SKILL.md',skill:'SKILL.md',integration:'references/TRIALY_INTEGRATION.md',theme:'references/THEME_2_VIVID.md',data:'references/DATA_AND_LIFECYCLE.md',interaction:'references/UI_INTERACTION_CONTRACT.md',discovery:'references/DISCOVERY_AND_STRUCTURE.md',qa:'references/QA_AND_EXAMPLES.md',html:'assets/approved-theme2-reference.html'} as const;
export const designRequest=z.object({resource:z.enum(['monitoring','services','components','template','styles','catalog','manifest','configuration','parity','skeleton','workflow','skill','integration','theme','data','interaction','discovery','qa','html']).default('skill'),offset:z.number().int().min(0).default(0)}).strict();
export async function readTrackerDesign(input:unknown){
 const {resource,offset}=designRequest.parse(input);
 let source=await readFile(new URL('../../plugin/trialy/skills/trialy-tracker-design/'+paths[resource],import.meta.url),'utf8');
 if(resource==='skeleton')source=await readFile(new URL('../../plugin/trialy/skills/trialy-tracker-design/assets/vivid-template/runtime.js',import.meta.url),'utf8')+source;
 if(offset>source.length)throw new Error('Offset exceeds resource length');
 const text=source.slice(offset,offset+12000),end=offset+text.length;
 return {resource,version:'0.6.0',resources:Object.keys(paths),sha256:createHash('sha256').update(source).digest('hex'),offset,totalCharacters:source.length,nextOffset:end<source.length?end:null,text};
}
export function addTrackerDesignMcp(server:McpServer){
 server.registerTool('read_app_monitoring_guide',{description:'Read template-independent recurring research, analysis and reporting setup for any saved app. Explains ChatGPT task creation, scoped data permissions, durable runs and task linking. Page through nextOffset; contains no account data.',inputSchema:{offset:z.number().int().min(0).default(0)},annotations:{readOnlyHint:true,openWorldHint:false},_meta:{securitySchemes:[{type:'noauth'}]}},async({offset})=>{const result=await readTrackerDesign({resource:'monitoring',offset});return {content:[{type:'text' as const,text:JSON.stringify(result)}],structuredContent:{result}};});
 server.registerTool('read_app_services',{description:'Read the current app sharing, TrialAgents email notification, durable LLM/API connector, background action and trigger contracts. Page through nextOffset. Contains no account data.',inputSchema:{offset:z.number().int().min(0).default(0)},annotations:{readOnlyHint:true,openWorldHint:false},_meta:{securitySchemes:[{type:'noauth'}]}},async({offset})=>{const result=await readTrackerDesign({resource:'services',offset});return {content:[{type:'text' as const,text:JSON.stringify(result)}],structuredContent:{result}};});
 server.registerTool('read_tracker_design',{title:'Read tracker design defaults',description:'Returns paginated versioned tracker documentation, the HTML reference, or the standard renderer source. Includes a content hash and nextOffset. Contains no account data.',inputSchema:designRequest.shape,annotations:{readOnlyHint:true,openWorldHint:false},_meta:{securitySchemes:[{type:'noauth'}]}},async input=>{
  try{const result=await readTrackerDesign(input);return {content:[{type:'text' as const,text:JSON.stringify(result)}],structuredContent:{result}};}
  catch{return {isError:true,content:[{type:'text' as const,text:'Design resource unavailable or offset invalid.'}]};}
 });
}


