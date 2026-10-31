import {z} from 'zod';
import {id} from './schema.js';

// Routes contain identifiers, never arbitrary form values, credentials or payloads.
export const appPagePath=z.string().max(500).regex(/^\/(?:[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*)?$/).default('/');
export const appRoute=z.object({path:appPagePath,recordId:id.optional(),page:z.number().int().min(0).max(1000000).optional()}).strict();
export const appSource=z.enum(['component','preview','function','collection','legacy']);
export const appLocation=z.object({appId:id,workspaceId:id,source:appSource.default('component'),route:appRoute.default({path:'/'})}).strict();
export type AppRoute=z.infer<typeof appRoute>;
export function appUrl(input:z.input<typeof appLocation>){
 const v=appLocation.parse(input),query=new URLSearchParams({workspaceId:v.workspaceId,source:v.source});
 if(v.route.recordId)query.set('recordId',v.route.recordId);
 if(v.route.page!==undefined)query.set('page',String(v.route.page));
 return `/apps/${v.appId}${v.route.path==='/'?'':v.route.path}?${query}`;
}
export function parseAppUrl(value:string){
 try{
  if(!value.startsWith('/apps/')||/[\\\u0000-\u0020]/.test(value))return null;
  const url=new URL(value,'https://app.invalid'),match=url.pathname.match(/^\/apps\/([^/]+)(\/.*)?$/);
  // Hosts may append attribution. It is never routing or sign-in return state.
  for(const key of ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id'])url.searchParams.delete(key);
  if(!match||url.hash||[...url.searchParams.keys()].some(k=>!['workspaceId','source','recordId','page'].includes(k))||[...url.searchParams.keys()].some(k=>url.searchParams.getAll(k).length!==1))return null;
  return appLocation.parse({appId:match[1],workspaceId:url.searchParams.get('workspaceId'),source:url.searchParams.get('source')??'component',route:{path:match[2]??'/',...(url.searchParams.has('recordId')?{recordId:url.searchParams.get('recordId')}:{}),...(url.searchParams.has('page')?{page:Number(url.searchParams.get('page'))}:{})}});
 }catch{return null;}
}
export function appSignInReturn(value:unknown):string|undefined{
 if(typeof value!=='string')return;
 if(value==='/join-app')return value;
 const parsed=parseAppUrl(value);if(parsed)return appUrl(parsed);
 try{if(!value.startsWith('/?')||/[\\\u0000-\u0020]/.test(value))return;const url=new URL(value,'https://app.invalid');if(url.hash||!['connectors','apps','automations'].includes(url.searchParams.get('tab')??'')||[...url.searchParams.keys()].some(k=>!['tab','workspaceId','connectionId','connectorReview','serviceApp','serviceReview','appId'].includes(k)||url.searchParams.getAll(k).length!==1))return;id.parse(url.searchParams.get('workspaceId'));for(const key of ['connectionId','connectorReview','serviceApp','serviceReview','appId'])if(url.searchParams.has(key))id.parse(url.searchParams.get(key));return url.pathname+url.search;}catch{return;}
}
