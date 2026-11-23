import {z} from 'zod';
import {appPreparationFields} from '../shared/app-design.js';
import {appLocation,appUrl} from '../shared/app-route.js';
import {id,fail,type Actor} from '../shared/schema.js';
import {componentContent} from './schema.js';
import type {WorkspaceFoundation} from './service.js';
import {workspaceHome} from './home.js';
export const prepareApp=z.object({...appPreparationFields,projectId:id.nullable().default(null),appId:id.optional(),expectedVersion:z.number().int().min(0).optional(),content:componentContent.omit({resourceKind:true}).extend({format:z.literal('frontend-js').default('frontend-js')})}).strict();
export async function prepareSimpleApp(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 const result=await f.prepareRenderedTracker(a,w,appOperation(input));return result.preview??result;
}
export async function prepareRenderedApp(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 return f.prepareRenderedTracker(a,w,appOperation(input));
}
function appOperation(input:unknown){
 const v=prepareApp.parse(input);
 return {kind:'save_component' as const,preparation:{requestKey:v.requestKey,replacesPreviewId:v.replacesPreviewId,expectedDigest:v.expectedDigest},projectId:v.projectId,componentId:v.appId,expectedVersion:v.expectedVersion,content:{...v.content,resourceKind:'generic' as const}};
}
/** includeOutput: also return the app's first render for this route (website open in one request).
 * browser (L2.2): what the host's app frame can take with that first screen (seeded reads; code only when it lacks it). */
export async function readApp(f:WorkspaceFoundation,a:Actor,input:unknown,includeOutput=false,browser?:unknown){
 const v=appLocation.parse(input),w=v.workspaceId;
 if(v.source==='component'){
  // B1: opening an app brings back the person's pending change to it, wherever it was prepared. L2.1: looked up alongside the app, not after it.
  const pending=f.pendingAppChanges(a,w,v.appId).catch(()=>({changes:[]}));
  const {component,initialOutput}=await f.readComponent(a,w,v.appId,includeOutput?'optional':false,v.route,browser) as any;
  if(component.archived||component.project_archived)fail(404,'not_found','App unavailable');
  const pendingChange=(await pending).changes[0];
  return {...v,url:appUrl(v),component,...(initialOutput?{initialOutput}:{}),...(pendingChange?{pendingChange}:{})};
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
/** Open the authorized app in the host; non-visual resources keep the platform visible.
 * L2.6: a saved app's first screen for the requested route comes with it as `initialOutput`; the MCP tool hands it to the
 * widget only (result metadata), so the widget paints without asking again. Optional: without it the widget renders itself. */
export async function openApp(f:WorkspaceFoundation,a:Actor,input:unknown){
 const r=await readApp(f,a,input,true);
 const display='preview' in r?r.preview:'component' in r&&r.component.format==='frontend-js'?{screen:'tracker',workspaceId:r.workspaceId,component:r.component}:{screen:'platform',workspaceId:r.workspaceId};
 const initialOutput=display.screen==='tracker'&&'component' in r?(r as any).initialOutput:undefined;
 return {...display,appId:r.appId,route:r.route,url:r.url,name:'component' in r?r.component.name:'resource' in r?r.resource.name:'App preview',...(initialOutput?{initialOutput}:{})};
}
