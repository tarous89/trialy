import {isDeepStrictEqual} from 'node:util';
import {z} from 'zod';
import {id,fail,type Actor} from '../shared/schema.js';
import {access} from '../domain/permissions.js';
import {appRole} from '../domain/app-roles.js';
import {AppTemplates} from './app-templates.js';
import {catalogBody} from './catalog-source.js';
import type {WorkspaceFoundation} from './service.js';

/* Updating an installed catalog app to a newer published version of the same app.
 * Offered only when nothing but the template code would change: the saved code is exactly an approved
 * version, a newer approved version exists, and both versions have the same tables and fields
 * (installer schema), the same options and the same helper functions. The update keeps the app's
 * configuration and bindings lines, its name, layout, data, access and automations, and goes through
 * the same review and confirmation as any other change to an app. */
export const appUpdateRequest=z.object({componentId:id,expectedVersion:z.number().int().min(0),toVersion:z.string().regex(/^\d+\.\d+\.\d+$/),toDigest:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
const canonical=(v:any):any=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
/* Helper functions are installed with the app and are not replaced by this update, so they must be the same in both
 * versions. Generated helpers embed their app's version and kit numbers in a constant; those labels alone may differ.
 * The installed helpers then keep the label they were installed with. */
const helpers=(functions:any)=>canonical((Array.isArray(functions)?functions:[]).map((f:any)=>({...f,source:typeof f.source==='string'?f.source.replace(/"(version|kit)":"\d+\.\d+\.\d+"/g,'"$1":""'):f.source})));
const newer=(a:string,b:string)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);return (x[0]-y[0]||x[1]-y[1]||x[2]-y[2])>0;};

async function resolve(f:WorkspaceFoundation,a:Actor,w:string,componentId:string){
 const {component:c}=await f.readComponent(a,w,componentId);
 if(c.archived||c.project_archived||c.format!=='frontend-js'||typeof c.source!=='string')return {c,none:'not_applicable'} as const;
 const body=catalogBody(c.source);if(body===null)return {c,none:'not_catalog'} as const;
 const catalog=new AppTemplates(undefined,f.db),from=await catalog.matching(body);
 // Changed code, or a version that is no longer approved, is never replaced automatically.
 if(!from)return {c,none:'changed_or_unlisted'} as const;
 const to=(await catalog.versions(from.id)).filter(t=>!t.deprecated&&newer(t.version,from.version)).at(-1);
 if(!to)return {c,none:'current'} as const;
 const schemas=(await f.db.query("SELECT version,install_schema FROM app_template_catalog WHERE template_id=$1 AND version=ANY($2::text[]) AND status='approved'",[from.id,[from.version,to.version]])).rows;
 const schema=(version:string)=>canonical(schemas.find(r=>r.version===version)?.install_schema??null);
 const same=to.engine===from.engine&&typeof to.source==='string'
  &&isDeepStrictEqual(schema(from.version),schema(to.version))
  &&isDeepStrictEqual(canonical(from.options),canonical(to.options))
  &&isDeepStrictEqual(helpers(from.functions),helpers(to.functions))
  &&isDeepStrictEqual(canonical(from.defaults),canonical(to.defaults));
 // A version that changes tables, options or helpers needs its own reviewed upgrade, not this one.
 if(!same)return {c,none:'needs_review'} as const;
 return {c,from,to,body} as const;
}

/** What the open app could be updated to. Never changes anything. */
export async function readAppUpdate(f:WorkspaceFoundation,a:Actor,w:string,componentId:string){
 const r=await resolve(f,a,w,id.parse(componentId));
 if('none' in r)return {available:false as const,reason:r.none};
 const p=await access(f.db,a,w);
 return {available:true as const,componentId:r.c.id,expectedVersion:r.c.version,templateId:r.to.id,name:r.to.name,fromVersion:r.from.version,toVersion:r.to.version,toDigest:r.to.digest,
  // A3: a catalog update changes the app's code, so it is offered to the app's owners.
  canUpdate:!p.archived&&await appRole(f.db,a,p,r.c.id)==='owner'};
}

/** A private review of the update. Nothing is saved until it is confirmed like any other app change. */
export async function prepareAppUpdate(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 const v=appUpdateRequest.parse(input),r=await resolve(f,a,w,v.componentId);
 if('none' in r)fail(409,'update_unavailable','This app has no update available. Reopen it.');
 const {c,to,body}=r;
 if(c.version!==v.expectedVersion)fail(409,'stale_version','This app changed. Reopen it.');
 if(to.version!==v.toVersion||to.digest!==v.toDigest)fail(409,'template_changed','A different version is now available. Reopen the app.');
 // Keep the generated configuration and bindings lines exactly; replace only the template code behind them.
 const source=c.source.slice(0,c.source.length-body.length)+to.source;
 const preview=await f.preview(a,w,{kind:'save_component',componentId:c.id,expectedVersion:c.version,projectId:c.project_id,catalogOrigin:{id:to.id,version:to.version,digest:to.digest},
  content:{name:c.name,source,format:c.format,sourceAccess:c.source_access,resourceKind:c.resource_kind,manifest:c.manifest,bindings:c.bindings,assets:c.assets??[],execution:c.execution??[]}});
 return {preview:preview.reviewState==='draft'?(await f.finalizeAppPreview(a,w,preview.id,preview.digest)).preview:preview,update:{name:to.name,fromVersion:r.from.version,toVersion:to.version}};
}
