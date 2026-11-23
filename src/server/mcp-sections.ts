import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
/** L3.5 (docs/scopes/LOADING_SPEED_2026-11-22.md): named groups of tool registrations. A plugin tool call runs only the
 * groups that hold the tool it names, so it does not build the other ~200 tool descriptors. Which group holds which tool is
 * learned from a build that ran every group, per endpoint variant; a call whose tool is not found falls back to the full build.
 * Groups only describe and register tools: every handler is still created per request, with that request's actor. */
export type McpSections={run(name:string,register:()=>void):void};
const all:McpSections={run:(_name,register)=>register()};
const held=Symbol('mcp-sections');
export function mcpSections(server:McpServer):McpSections{return (server as any)[held]??all;}
export function useMcpSections(server:McpServer,sections:McpSections){(server as any)[held]=sections;}
/** Runs a group when its path leads to target (undefined: every group), and records the group path of every tool registered. */
export function sectionRecorder(target:string|undefined){
 const path:string[]=[],tools=new Map<string,string>();
 const sections:McpSections={run(name,register){
  path.push(name);const here=path.join('/');
  try{if(target===undefined||target===here||target.startsWith(here+'/'))register();}finally{path.pop();}
 }};
 return {sections,tools,current:()=>path.join('/'),record(tool:string){tools.set(tool,path.join('/'));}};
}
