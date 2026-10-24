import {readFile} from 'node:fs/promises';
import {z} from 'zod';
import {id,fail,fieldsSchema,newFieldsSchema,type Actor} from '../shared/schema.js';
import {typeAccess,visibleFields} from '../domain/permissions.js';
import {derived} from '../shared/formulas.js';
import {Service} from '../domain/service.js';
import type {WorkspaceFoundation} from './service.js';
const key=z.string().regex(/^[a-z][a-z0-9_]{0,63}$/);
export const trackerSetup=z.object({
 name:z.string().trim().min(1).max(100),description:z.string().max(500),projectId:id.nullable().default(null),
 extendTables:z.array(z.object({typeId:id,expectedVersion:z.number().int().min(0),newFields:newFieldsSchema}).strict()).max(8).default([]),
 newTables:z.array(z.object({id,name:z.string().trim().min(1).max(100),fields:newFieldsSchema}).strict()).max(8).default([]),
 scope:z.enum(['workspace','project']).default('workspace'),
 tabs:z.array(z.object({name:z.string().min(1).max(60),typeId:id,example:z.record(key,z.union([z.string().max(500),z.number(),z.boolean(),z.array(z.union([z.string().max(500),z.number()])).max(100),z.null()])).optional(),columns:z.array(z.object({field:key,label:z.string().min(1).max(100).optional(),visible:z.boolean().optional(),editable:z.boolean().default(true)}).strict()).min(1).max(30)}).strict()).min(1).max(8),
 example:z.record(key,z.union([z.string().max(500),z.number(),z.boolean(),z.array(z.union([z.string().max(500),z.number()])).max(100),z.null()])).optional(),
 showExample:z.boolean().default(true),omitSource:z.boolean().default(false)
}).strict();
export async function trackerOperation(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 const v=trackerSetup.parse(input);if(v.scope==='project'&&!v.projectId)fail(400,'project_required','Project-scoped data requires a project');
 if(new Set(v.newTables.map(t=>t.id)).size!==v.newTables.length)fail(400,'duplicate_table','Draft table IDs must be unique');
 for(const t of v.newTables){if(!v.tabs.some(tab=>tab.typeId===t.id))fail(400,'unused_table','Draft tables must be used by the tracker');if((await f.db.query('SELECT id FROM entity_types WHERE id=$1',[t.id])).rows.length)fail(409,'table_collision','Draft IDs must not replace existing tables');await new Service(f.db).validate(f.db,a,w,{kind:'create_type',name:t.name,fields:t.fields});}
 const extensions=new Map<string,any>();
 for(const extension of v.extendTables){
  if(extensions.has(extension.typeId)||v.newTables.some(t=>t.id===extension.typeId)||!v.tabs.some(t=>t.typeId===extension.typeId))fail(400,'invalid_extension','Extend each existing bound table once');
  const resolved=await typeAccess(f.db,a,w,extension.typeId,true);const merged=fieldsSchema.parse([...resolved.type.fields,...extension.newFields]);
  await new Service(f.db).validate(f.db,a,w,{kind:'update_type',typeId:extension.typeId,expectedVersion:extension.expectedVersion,name:resolved.type.name,fields:merged});
  extensions.set(extension.typeId,{...resolved,type:{...resolved.type,fields:merged,version:resolved.type.version+1}});
 }
 const fields:any[]=[],bindings:any[]=[],tabs:any[]=[];
 for(const [i,tab] of v.tabs.entries()){
  const draft=v.newTables.find(t=>t.id===tab.typeId);const resolved=draft?null:extensions.get(tab.typeId)??await typeAccess(f.db,a,w,tab.typeId);const type=resolved?.type??{...draft!,version:0},allowed=resolved?visibleFields(type.fields,resolved.policy,a):type.fields.filter((f:any)=>a.origin!=='ai'||f.ai);
  if(new Set(tab.columns.map(c=>c.field)).size!==tab.columns.length)fail(400,'duplicate_column','Each tab field must be unique');
  const columns=tab.columns.map((c,columnIndex)=>{const field=allowed.find((x:any)=>x.key===c.field);if(!field)fail(403,'field_unavailable','Choose an authorized existing field');
   const fieldId='f_'+i+'_'+columnIndex,mode=c.editable&&!derived(field)?'write':'read';
   fields.push({id:fieldId,typeId:tab.typeId,field:c.field,schemaVersion:type.version,kind:field.kind,mode,label:c.label??field.name});
   const requested=(input as any).tabs[i].columns[columnIndex];const visible=requested.visible??true;
   return {...c,visible,label:c.label??field.name,fieldId,kind:field.kind,multiple:!!field.multiple,options:field.options??[],editable:mode==='write',required:!!field.required};});
  if(!v.omitSource&&!columns.some(c=>/^(source|sources|provenance)$/i.test(c.field)||/^source$/i.test(c.label)))fail(400,'source_required','Include a compatible Source field, or set omitSource only for an explicit user customization. Do not invent source values.');
  const binding=bindings.find(b=>b.typeId===tab.typeId);if(binding)binding.fields=[...new Set([...binding.fields,...columns.map(c=>c.field)])];else bindings.push({typeId:tab.typeId,fields:columns.map(c=>c.field)});
  if(tab.example&&Object.keys(tab.example).some(k=>!columns.some(c=>c.field===k)))fail(400,'example_field','Example fields must belong to their tab');
  tabs.push({name:tab.name,tableName:type.name,typeId:tab.typeId,columns,...(tab.example?{example:Object.fromEntries(Object.entries(tab.example).sort(([a],[b])=>a.localeCompare(b)))}:{})});
 }
 if(v.example&&Object.keys(v.example).some(k=>!tabs[0].columns.some((c:any)=>c.field===k)))fail(400,'example_field','Example fields must belong to the first tab');
 const root=new URL('../../plugin/trialy/skills/trialy-tracker-design/assets/',import.meta.url);
 const reference=await readFile(new URL('approved-theme2-reference.html',root),'utf8');
 const css=[...reference.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
 const runtime=await readFile(new URL('connected-tracker.js',root),'utf8');
 const config={name:v.name,description:v.description,tabs,exampleTypeId:tabs[0].typeId,example:v.example?Object.fromEntries(Object.entries(v.example).sort(([a],[b])=>a.localeCompare(b))):{},showExample:v.showExample};
 return {kind:'save_component' as const,projectId:v.projectId,content:{name:v.name,format:'frontend-js' as const,resourceKind:'tracker' as const,sourceAccess:'workspace' as const,bindings,manifest:{version:1 as const,scope:v.scope,fields},source:`const config=${JSON.stringify(config)};\nconst theme=${JSON.stringify(css)};\n${runtime}`}};
}
export const trackerLayout=z.object({name:z.string().trim().min(1).max(100),description:z.string().max(500),tabs:z.array(z.object({typeId:id,name:z.string().trim().min(1).max(60),visible:z.boolean(),columns:z.array(z.object({field:key,label:z.string().trim().min(1).max(100),visible:z.boolean()}).strict()).min(1).max(30)}).strict()).min(1).max(8)}).strict();
export function applyTrackerLayout(content:any,input:unknown){
 const layout=trackerLayout.parse(input),line=content.source.split('\n')[0];
 if(!line.startsWith('const config=')||!line.endsWith(';'))fail(400,'template_required','Layout editing requires a standard tracker');
 const config=JSON.parse(line.slice(13,-1));
 if(layout.tabs.length!==config.tabs.length)fail(400,'layout_scope','Adding a tab requires a reviewed binding change');
 const used=new Set<number>();const tabs=layout.tabs.map(t=>{const index=config.tabs.findIndex((old:any,i:number)=>!used.has(i)&&old.typeId===t.typeId&&old.columns.length===t.columns.length&&old.columns.every((c:any)=>t.columns.some(n=>n.field===c.field)));if(index<0)fail(400,'layout_scope','Layout cannot alter data bindings');used.add(index);const old=config.tabs[index];if(new Set(t.columns.map(c=>c.field)).size!==t.columns.length)fail(400,'duplicate_column','Columns must be unique');return {...old,name:t.name,visible:t.visible,columns:t.columns.map(c=>({...old.columns.find((f:any)=>f.field===c.field),label:c.label,visible:c.visible}))};});
 if(!tabs.some(t=>t.visible))fail(400,'layout_empty','Keep at least one tab visible');
 return {name:layout.name,manifest:{...content.manifest,fields:content.manifest.fields.map((f:any)=>({...f,label:tabs.flatMap(t=>t.columns).find((c:any)=>c.fieldId===f.id)?.label??f.label}))},source:'const config='+JSON.stringify({...config,name:layout.name,description:layout.description,tabs})+';\n'+content.source.slice(line.length+1)};
}
