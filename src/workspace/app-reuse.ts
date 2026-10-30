import {z} from 'zod';
import {id,fail,type Actor} from '../shared/schema.js';
import {componentContent} from './schema.js';
import {standardTracker} from './standard-tracker.js';
import {trackerSetup,trackerOperation} from './tracker-template.js';
import type {WorkspaceFoundation} from './service.js';
export const reuseApp=z.object({appId:id,expectedVersion:z.number().int().min(0),name:z.string().trim().min(1).max(100),mode:z.enum(['shared_data','separate_data']),projectId:id.nullable().default(null),configuration:z.record(z.string(),z.unknown()).optional(),content:componentContent.omit({name:true,execution:true,assets:true,sourceAccess:true}).optional()}).strict();
/** Read permission is enforced before source is copied; commit rechecks provenance. */
export async function reuseAppOperation(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 const v=reuseApp.parse(input),{component:c}=await f.readComponent(a,w,v.appId);
 if(c.archived||c.project_archived||c.format!=='frontend-js')fail(404,'not_found','Active app source unavailable');
 if(c.version!==v.expectedVersion)fail(409,'stale_version','Read the current app before reusing it');
 const reuseOrigin={componentId:c.id,version:c.version,mode:v.mode};
 if(v.configuration&&v.content)fail(400,'reuse_configuration','Choose template configuration or custom source');
 if(v.configuration){
  const standard=standardTracker(c.source);if(!standard)fail(400,'custom_app','Custom apps require complete adapted content');
  const config=standard.config;
  const setup=trackerSetup.parse({omitSource:true,description:config.description??'',resourceKind:c.resource_kind??'tracker',example:config.example,scope:c.manifest?.scope??'workspace',theme:config.theme,pageSize:config.pageSize,showExample:config.showExample,overview:config.overview,tabs:config.tabs.map((t:any)=>({name:t.name,icon:t.icon,iconPath:t.iconPath,example:t.example,typeId:t.typeId,visible:t.visible,filters:t.filters,filterMode:t.filterMode,columns:t.columns.map((col:any)=>({field:col.field,label:col.label,visible:col.visible,editable:col.editable,display:col.display}))})),...v.configuration,projectId:v.projectId,name:v.name});
  const built=await trackerOperation(f,a,w,setup);return {kind:'create_tracker',setup,content:built.content,reuseOrigin};
 }
 if(v.mode==='separate_data'&&!v.content)fail(400,'reuse_data','Provide new table configuration or fully adapted source and bindings for separate data');
 const content=componentContent.parse(v.content?{...v.content,name:v.name,format:'frontend-js',sourceAccess:'workspace'}:{name:v.name,format:c.format,source:c.source,bindings:c.bindings,manifest:c.manifest,resourceKind:c.resource_kind,sourceAccess:'workspace'});
 return {kind:'save_component',projectId:v.projectId,content,reuseOrigin};
}
