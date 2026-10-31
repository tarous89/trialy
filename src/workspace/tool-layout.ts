import {columnDisplay} from '../shared/standard-tool.js';
import {toolThemeSchema} from '../shared/tool-theme.js';
import {z} from 'zod';
import {id,fail,type Actor} from '../shared/schema.js';
import {standardTracker} from './standard-tracker.js';
import {trackerOperation,trackerSetup} from './tracker-template.js';
import {WorkspaceFoundation} from './service.js';
import {withReadMetadata} from '../db/read-metadata.js';
export const toolLayoutRequest=z.object({componentId:id,expectedVersion:z.number().int().min(0),name:z.string().trim().min(1).max(100),description:z.string().max(500),theme:toolThemeSchema.optional(),newTables:trackerSetup.shape.newTables,extendTables:trackerSetup.shape.extendTables,tabs:z.array(z.object({originalIndex:z.number().int().min(0).optional(),typeId:id,name:z.string().trim().min(1).max(60),visible:z.boolean(),columns:z.array(z.object({fieldId:z.string().max(100).optional(),field:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),label:z.string().trim().min(1).max(100),visible:z.boolean(),display:columnDisplay.optional()}).strict()).min(1).max(100)}).strict()).min(1).max(8)}).strict();
export async function prepareToolLayout(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 // Preparation writes only a private proposal. Reuse its read metadata in one
 // session and recheck it before releasing the proposal; confirmation stays separate.
 return f.db.transaction(tx=>withReadMetadata({query:tx.query.bind(tx),transaction:fn=>fn(tx),close:async()=>{}},db=>prepareLayout(new WorkspaceFoundation(db),a,w,input)));
}
async function prepareLayout(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 const v=toolLayoutRequest.parse(input),{component:c}=await f.readComponent(a,w,v.componentId),standard=standardTracker(c.source);
 if(c.version!==v.expectedVersion)fail(409,'stale_version','This app changed. Reopen its settings.');
 if(!standard)fail(400,'custom_layout','Update this custom layout in ChatGPT, keeping its authorized data bindings.');
 const old=standard.config,indices=v.tabs.flatMap(t=>t.originalIndex===undefined?[]:[t.originalIndex]);
 if(new Set(indices).size!==indices.length||indices.some(i=>!old.tabs[i])||!v.tabs.some(t=>t.visible))fail(400,'layout_scope','Use distinct existing tabs and keep at least one visible tab.');
 const remapped=v.tabs.length!==old.tabs.length||v.tabs.some(t=>{const prev=old.tabs[t.originalIndex??-1];return !prev||prev.typeId!==t.typeId||prev.columns.length!==t.columns.length||t.columns.some(col=>!prev.columns.some((x:any)=>x.fieldId===col.fieldId&&x.field===col.field));});
 if((remapped||v.newTables.length||v.extendTables.length)&&c.execution?.length)fail(400,'execution_mapping','Update custom actions and their bindings together in ChatGPT before changing sources.');
 const overview=old.overview?{...old.overview,nextSteps:old.overview.nextSteps.flatMap((p:any)=>{const i=v.tabs.findIndex(t=>t.originalIndex===p.tabIndex);return i>=0&&[p.titleField,p.textField].every(field=>v.tabs[i].columns.some(c=>c.field===field))?[{...p,tabIndex:i}]:[]})}:undefined;
 const setup=trackerSetup.parse({theme:v.theme??old.theme,overview,name:v.name,description:v.description,pageSize:old.pageSize??25,projectId:c.project_id,scope:c.manifest?.scope??'workspace',resourceKind:c.resource_kind,allowEdits:old.tabs.some((t:any)=>t.columns.some((col:any)=>col.editable)),newTables:v.newTables,extendTables:v.extendTables,tabs:v.tabs.map(t=>{const prev=old.tabs[t.originalIndex??-1];return {name:t.name,icon:prev?.icon,iconPath:prev?.iconPath,typeId:t.typeId,visible:t.visible,filterMode:prev?.filterMode,...(!remapped&&prev?.example?{example:prev.example}:{}),filters:(prev?.filters??[]).filter((field:string)=>t.columns.some(col=>col.field===field)),columns:t.columns.map(col=>{const original=prev?.columns.find((x:any)=>x.fieldId===col.fieldId&&x.field===col.field);return {field:col.field,label:col.label,visible:col.visible,display:col.display??original?.display,editable:original?.editable??true};})};}),showExample:old.showExample,example:remapped?undefined:old.example,omitSource:true});
 const operation=await trackerOperation(f,a,w,setup);
 if(v.newTables.length||v.extendTables.length)return f.preview(a,w,{kind:'create_tracker',componentId:c.id,expectedVersion:c.version,setup,content:operation.content});
 return f.preview(a,w,{...operation,componentId:c.id,expectedVersion:c.version,content:{...operation.content,sourceAccess:c.source_access,assets:c.assets??[],execution:c.execution??[]}});
}
