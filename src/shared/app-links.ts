import {appLocation,appPagePath,appUrl,parseAppUrl} from './app-route.js';
import type {z} from 'zod';
// This function is also serialized into the isolated trusted frame. Keep it self-contained.
export function frameLinkTarget(href:string,origin:string,current:{appId?:string;workspaceId?:string;source?:string}|null){
 if(!href||href.length>2000||/[\\\u0000-\u0020]/.test(href)||href.startsWith('//'))return null;
 try{
  const absolute=/^[a-z][a-z0-9+.-]*:/i.test(href);
  if(absolute&&!/^(https?:|mailto:|tel:)/i.test(href))return null;
  const url=new URL(href,origin);
  if(url.username||url.password)return null;
  if(absolute&&(url.origin!==origin||!url.pathname.startsWith('/apps/')))return {href:url.href,external:true};
  if(href.startsWith('/apps/')||absolute&&url.pathname.startsWith('/apps/')){
   for(const key of ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id'])url.searchParams.delete(key);
   const match=url.pathname.match(/^\/apps\/([a-f0-9-]{36})(?:\/[A-Za-z0-9_-]+)*$/i),uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
   if(!match||!uuid.test(match[1])||!uuid.test(url.searchParams.get('workspaceId')||'')||url.hash||[...url.searchParams.keys()].some(k=>!['workspaceId','source','recordId','page'].includes(k)||url.searchParams.getAll(k).length!==1))return null;
   const source=url.searchParams.get('source')||'component';
   if(!['component','preview','function','collection','legacy'].includes(source)||url.searchParams.has('recordId')&&!uuid.test(url.searchParams.get('recordId')!)||url.searchParams.has('page')&&!/^(0|[1-9][0-9]{0,5}|1000000)$/.test(url.searchParams.get('page')!))return null;
   return {href:url.href,external:match[1]!==current?.appId||url.searchParams.get('workspaceId')!==current?.workspaceId||source!==(current?.source||'component')};
  }
  return {href,external:false};
 }catch{return null;}
}
export function resolveAppLink(href:string,current:z.infer<typeof appLocation>,origin:string){
 if(!href||href.length>2000||/[\\\u0000-\u0020]/.test(href)||href.startsWith('//'))return null;
 try{
  if(/^[a-z][a-z0-9+.-]*:/i.test(href)){
   const url=new URL(href);if(!['https:','http:','mailto:','tel:'].includes(url.protocol)||url.username||url.password)return null;
   if(url.origin!==origin||!url.pathname.startsWith('/apps/'))return {kind:'external' as const,href:url.href};
   href=url.pathname+url.search;
  }
  if(href.startsWith('/apps/')){const next=parseAppUrl(href);return next?{kind:next.appId===current.appId&&next.workspaceId===current.workspaceId&&next.source===current.source?'internal' as const:'app' as const,href:appUrl(next)}:null;}
  const page=new URL(href,'https://route.invalid'+current.route.path.replace(/\/?$/,'/'));
  if(page.hash||[...page.searchParams.keys()].some(k=>!['recordId','page'].includes(k))||[...page.searchParams.keys()].some(k=>page.searchParams.getAll(k).length!==1))return null;
  const next=appLocation.parse({...current,route:{path:appPagePath.parse(page.pathname),...(page.searchParams.has('recordId')?{recordId:page.searchParams.get('recordId')}:{}),...(page.searchParams.has('page')?{page:Number(page.searchParams.get('page'))}:{})}});
  return {kind:'internal' as const,href:appUrl(next)};
 }catch{return null;}
}
