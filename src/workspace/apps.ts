import {z} from 'zod';
import {appLocation,appUrl} from '../shared/app-route.js';
import {id,fail,type Actor} from '../shared/schema.js';
import {componentContent} from './schema.js';
import type {WorkspaceFoundation} from './service.js';
import {workspaceHome} from './home.js';
export const prepareApp=z.object({projectId:id.nullable().default(null),appId:id.optional(),expectedVersion:z.number().int().min(0).optional(),content:componentContent.omit({resourceKind:true}).extend({format:z.literal('frontend-js').default('frontend-js')})}).strict();
export async function prepareSimpleApp(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 return f.preview(a,w,appOperation(input));
}
export async function prepareRenderedApp(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 return f.prepareRenderedTracker(a,w,appOperation(input));
}
function appOperation(input:unknown){
 const v=prepareApp.parse(input);
 return {kind:'save_component' as const,projectId:v.projectId,componentId:v.appId,expectedVersion:v.expectedVersion,content:{...v.content,resourceKind:'generic' as const}};
}
export async function readApp(f:WorkspaceFoundation,a:Actor,input:unknown){
 const v=appLocation.parse(input),w=v.workspaceId;
 if(v.source==='component'){
  const {component}=await f.readComponent(a,w,v.appId);
  if(component.archived||component.project_archived)fail(404,'not_found','App unavailable');
  return {...v,url:appUrl(v),component};
 }
 if(v.source==='preview'){
  const resolved=await f.resolveTrackerPreview(a,w,v.appId);
  if(resolved.screen==='tracker-unavailable')fail(404,'not_found','Preview unavailable');
  return {...v,url:appUrl(v),preview:resolved};
 }
 // Home already applies the existing workflow/collection/automation authorization.
 // Resolve the exact legacy item without widening access or returning bearer links.
 for(let offset=0;;offset+=100){
  const page=await workspaceHome(f.db,a,w,{offset,limit:100});
  const resource=page.resources.find((r:any)=>r.id===v.appId&&r.source===v.source);
  if(resource)return {...v,url:appUrl(v),resource};
  if(page.resources.length<100)break;
 }
 fail(404,'not_found','App unavailable');
}
/** Open the authorized app in the host; non-visual resources keep the platform visible. */
export async function openApp(f:WorkspaceFoundation,a:Actor,input:unknown){
 const r=await readApp(f,a,input);
 const display='preview' in r?r.preview:'component' in r&&r.component.format==='frontend-js'?{screen:'tracker',workspaceId:r.workspaceId,component:r.component}:{screen:'platform',workspaceId:r.workspaceId};
 return {...display,appId:r.appId,route:r.route,url:r.url,name:'component' in r?r.component.name:'resource' in r?r.resource.name:'App preview'};
}
