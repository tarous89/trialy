import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
const paths={skill:'SKILL.md',integration:'references/TRIALY_INTEGRATION.md',theme:'references/THEME_2_VIVID.md',data:'references/DATA_AND_LIFECYCLE.md',interaction:'references/UI_INTERACTION_CONTRACT.md',discovery:'references/DISCOVERY_AND_STRUCTURE.md',qa:'references/QA_AND_EXAMPLES.md',html:'assets/approved-theme2-reference.html'} as const;
export const designRequest=z.object({resource:z.enum(['skill','integration','theme','data','interaction','discovery','qa','html']).default('skill'),offset:z.number().int().min(0).default(0)}).strict();
export async function readTrackerDesign(input:unknown){
 const {resource,offset}=designRequest.parse(input);
 const source=await readFile(new URL('../../plugin/trialy/skills/trialy-tracker-design/'+paths[resource],import.meta.url),'utf8');
 if(offset>source.length)throw new Error('Offset exceeds resource length');
 const text=source.slice(offset,offset+12000),end=offset+text.length;
 return {resource,version:'0.2.12',resources:Object.keys(paths),sha256:createHash('sha256').update(source).digest('hex'),offset,totalCharacters:source.length,nextOffset:end<source.length?end:null,text};
}
export function addTrackerDesignMcp(server:McpServer){
 server.registerTool('read_tracker_design',{title:'Read tracker design defaults',description:'Before building or revising a tracker, read skill and integration, then relevant references to completion using nextOffset. Defaults yield to user instructions and existing authorized data. HTML is the tracker-only reference, not the plugin interface. Public read-only documentation; no account data.',inputSchema:designRequest.shape,annotations:{readOnlyHint:true,openWorldHint:false},_meta:{securitySchemes:[{type:'noauth'}]}},async input=>{
  try{const result=await readTrackerDesign(input);return {content:[{type:'text' as const,text:JSON.stringify(result)}],structuredContent:{result}};}
  catch{return {isError:true,content:[{type:'text' as const,text:'Design resource unavailable or offset invalid.'}]};}
 });
}
