import {z} from 'zod';
import {fail} from '../shared/schema.js';
// Trusted server registrations only. Generated code cannot register URLs or adapters.
export type ToolDefinition={name:string;version:string;effect:'read'|'proposal';description:string;input:z.ZodType;invoke:(input:any)=>Promise<unknown>};
export class ToolGateway {
 private tools=new Map<string,ToolDefinition>();
 constructor(private allowed:ReadonlySet<string>,private check:()=>Promise<void>){}
 register(tool:ToolDefinition){if(this.tools.has(tool.name))throw new Error('Duplicate operation');this.tools.set(tool.name,tool);}
 async call(name:string,input:unknown){
  await this.check();
  if(name==='tools.list')return [...this.tools.values()].filter(t=>this.allowed.has(t.name)).map(({name,version,effect,description,input})=>({name,version,effect,description,inputSchema:z.toJSONSchema(input),outputSchema:{description:'JSON result, at most 1 MiB per call',type:['object','array','string','number','boolean','null']}}));
  const tool=this.tools.get(name);if(!tool||!this.allowed.has(name))fail(403,'capability_denied','Capability not declared');
  const result=await tool.invoke(tool.input.parse(input));
  if(JSON.stringify(result??null).length>1024*1024)fail(413,'result_limit','Operation result exceeds limit');
  return result;
 }
}
