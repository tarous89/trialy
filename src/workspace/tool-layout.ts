import {z} from 'zod';
import {id,fail,type Actor} from '../shared/schema.js';
import {standardTracker} from './standard-tracker.js';
import {trackerOperation} from './tracker-template.js';
import type {WorkspaceFoundation} from './service.js';
export const toolLayoutRequest=z.object({componentId:id,expectedVersion:z.number().int().min(0),name:z.string().trim().min(1).max(100),description:z.string().max(500),tabs:z.array(z.object({originalIndex:z.number().int().min(0),typeId:id,name:z.string().trim().min(1).max(60),visible:z.boolean(),columns:z.array(z.object({fieldId:z.string().max(100),field:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),label:z.string().trim().min(1).max(100),visible:z.boolean()}).strict()).min(1).max(30)}).strict()).min(1).max(8)}).strict();
export async function prepareToolLayout(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 const v=toolLayoutRequest.parse(input),{component:c}=await f.readComponent(a,w,v.componentId),standard=standardTracker(c.source);
 if(c.version!==v.expectedVersion)fail(409,'stale_version','This tool changed. Reopen its settings.');
 if(!standard)fail(400,'custom_layout','Custom code needs a reviewed code update when its sources change. Continue in ChatGPT.');
 const old=standard.config;
 if(v.tabs.length!==old.tabs.length||new Set(v.tabs.map(t=>t.originalIndex)).size!==v.tabs.length||!v.tabs.some(t=>t.visible))fail(400,'layout_scope','Keep the existing tabs and at least one visible tab.');
 let remapped=false;
 for(const t of v.tabs){const prev=old.tabs[t.originalIndex];if(!prev||t.columns.length!==prev.columns.length||new Set(t.columns.map(c=>c.fieldId)).size!==t.columns.length)fail(400,'layout_scope','Keep the existing fields.');for(const col of t.columns){const original=prev.columns.find((c:any)=>c.fieldId===col.fieldId);if(!original)fail(400,'layout_scope','Unknown field');if(original.field!==col.field||prev.typeId!==t.typeId)remapped=true;}}
 if(remapped&&c.execution?.length)fail(400,'execution_mapping','This tool has custom actions. Update their bindings in ChatGPT before changing sources.');
 const operation=await trackerOperation(f,a,w,{name:v.name,description:v.description,projectId:c.project_id,scope:c.manifest?.scope??'workspace',resourceKind:c.resource_kind,tabs:v.tabs.map(t=>({name:t.name,typeId:t.typeId,columns:t.columns.map(col=>({field:col.field,label:col.label,visible:col.visible,editable:old.tabs[t.originalIndex].columns.find((x:any)=>x.fieldId===col.fieldId).editable}))})),showExample:false,omitSource:true});
 const rebuilt=standardTracker(operation.content.source)!;
 rebuilt.config.tabs.forEach((t:any,i:number)=>t.visible=v.tabs[i].visible);
 operation.content.source='const config='+JSON.stringify(rebuilt.config)+';\n'+operation.content.source.split('\n').slice(1).join('\n');
 return f.preview(a,w,{...operation,componentId:c.id,expectedVersion:c.version,content:{...operation.content,sourceAccess:c.source_access,assets:c.assets??[],execution:c.execution??[]}});
}
