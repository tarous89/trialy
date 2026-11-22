import {isDeepStrictEqual} from 'node:util';
import {z} from 'zod';
import {id,fail,type Actor} from '../shared/schema.js';
import {access} from '../domain/permissions.js';
import {appRole} from '../domain/app-roles.js';
import {AppTemplates,appTemplateEntry} from './app-templates.js';
import {catalogBody} from './catalog-source.js';
import type {WorkspaceFoundation} from './service.js';
import {recentSpeedUpdate} from './speed-updates.js';

/* Updating an installed catalog app to a newer published version of the same app (and, 7.1, upgrading it to a new major version).
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

/** The options the target version accepts, carried over from the saved configuration (7.1). A saved value is kept when
 * the target still has the option and the value fits its type; otherwise the target's default applies. Options the
 * target no longer has (for example the old layout profile) are dropped. Nothing else of the app changes. */
export function carryConfiguration(saved:Record<string,unknown>,to:{options:Record<string,any>;defaults:Record<string,unknown>}){
 const configuration:Record<string,unknown>={},kept:string[]=[],added:string[]=[];
 for(const [name,o] of Object.entries(to.options)){
  const v=saved[name],fits=v!==undefined&&typeof v===o.type&&!(typeof v==='number'&&!Number.isFinite(v))&&!(typeof v==='string'&&(v.length>10000||(o.enum&&!o.enum.includes(v))));
  // A layout saved for the earlier major version describes its screens, not the rebuilt ones: it starts again from the default.
  if(fits&&name!=='layoutProfile'){configuration[name]=v;kept.push(name);continue;}
  const d=to.defaults?.[name]??o.default;if(d!==undefined)configuration[name]=d;added.push(name);
 }
 return {configuration,kept,added,removed:Object.keys(saved).filter(k=>!Object.hasOwn(to.options,k)).sort()};
}
const configLine=/^const templateConfiguration=(.+);\n/;
const savedConfiguration=(source:string)=>{try{const m=configLine.exec(source);const v=m?JSON.parse(m[1]):{};return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch{return {};}};
const major=(v:string)=>Number(v.split('.')[0]);

/** D41: a copy whose code is exactly a published version that is no longer approved (withdrawn after its replacement
 * was approved) is still that version, so its owner can move it to an approved one. Only the starting point may be a
 * withdrawn version; the version it moves to is always an approved one. */
async function withdrawnVersion(f:WorkspaceFoundation,body:string){
 const rows=(await f.db.query("SELECT digest,payload FROM app_template_catalog WHERE status<>'approved' AND md5(payload->>'source')=md5($1::text)",[body])).rows;
 for(const r of rows){if(r.payload?.source!==body)continue;const entry=appTemplateEntry.safeParse(r.payload);if(entry.success)return {...entry.data,digest:r.digest as string};}
 return null;
}

async function resolve(f:WorkspaceFoundation,a:Actor,w:string,componentId:string){
 const {component:c}=await f.readComponent(a,w,componentId);
 if(c.archived||c.project_archived||c.format!=='frontend-js'||typeof c.source!=='string')return {c,none:'not_applicable'} as const;
 const body=catalogBody(c.source);if(body===null)return {c,none:'not_catalog'} as const;
 const catalog=new AppTemplates(undefined,f.db),from=await catalog.matching(body)??await withdrawnVersion(f,body);
 // D14: changed code is never replaced. Unchanged code of a version that was withdrawn since can still move (D41).
 if(!from)return {c,none:'changed_or_unlisted'} as const;
 const candidates=(await catalog.versions(from.id)).filter(t=>!t.deprecated&&newer(t.version,from.version)).reverse();
 if(!candidates.length)return {c,none:'current'} as const;
 const schemas=(await f.db.query("SELECT version,install_schema FROM app_template_catalog WHERE template_id=$1 AND version=ANY($2::text[]) AND (status='approved' OR version=$3)",[from.id,[from.version,...candidates.map(t=>t.version)],from.version])).rows;
 const schema=(version:string)=>canonical(schemas.find(r=>r.version===version)?.install_schema??null);
 // The newest version this copy can move to: an update (only the code changes) or, for a new major version that names
 // this one in upgradeFrom, an upgrade (code and options; same tables and helpers, so records and connections carry across).
 for(const to of candidates){
  const sameData=to.engine===from.engine&&typeof to.source==='string'&&isDeepStrictEqual(schema(from.version),schema(to.version))&&isDeepStrictEqual(helpers(from.functions),helpers(to.functions));
  if(!sameData)continue;
  if(isDeepStrictEqual(canonical(from.options),canonical(to.options))&&isDeepStrictEqual(canonical(from.defaults),canonical(to.defaults)))return {c,from,to,body,kind:'update' as const};
  if(major(to.version)>major(from.version)&&(to.upgradeFrom??[]).includes(from.version))return {c,from,to,body,kind:'upgrade' as const};
 }
 // A version that changes tables or helpers, or does not name this one, needs its own reviewed installation.
 return {c,none:'needs_review'} as const;
}

/** What the open app could be updated to. Never changes anything. */
export async function readAppUpdate(f:WorkspaceFoundation,a:Actor,w:string,componentId:string){
 const r=await resolve(f,a,w,id.parse(componentId));
 // 7.2 (P11): an automatic speed update shows once in the header while the app is at the version it produced.
 const recent=await recentSpeedUpdate(f.db,w,r.c.id,r.c.version);
 if('none' in r)return {available:false as const,reason:r.none,...(recent?{recent}:{})};
 const p=await access(f.db,a,w);
 const settings=r.kind==='upgrade'?carryConfiguration(savedConfiguration(r.c.source),r.to):null;
 return {available:true as const,componentId:r.c.id,expectedVersion:r.c.version,templateId:r.to.id,name:r.to.name,fromVersion:r.from.version,toVersion:r.to.version,toDigest:r.to.digest,
  // A3: a catalog update changes the app's code, so it is offered to the app's owners.
  canUpdate:!p.archived&&await appRole(f.db,a,p,r.c.id)==='owner',
  // 7.1 (D41): a new major version. Records, table connections and settings carry across; settings it no longer has are listed.
  ...(recent?{recent}:{}),
  ...(settings?{kind:'upgrade' as const,settings:{kept:settings.kept,added:settings.added,removed:settings.removed}}:{})};
}

/** A private review of the update. Nothing is saved until it is confirmed like any other app change. */
export async function prepareAppUpdate(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 const v=appUpdateRequest.parse(input),r=await resolve(f,a,w,v.componentId);
 if('none' in r)fail(409,'update_unavailable','This app has no update available. Reopen it.');
 const {c,to,body}=r;
 if(c.version!==v.expectedVersion)fail(409,'stale_version','This app changed. Reopen it.');
 if(to.version!==v.toVersion||to.digest!==v.toDigest)fail(409,'template_changed','A different version is now available. Reopen the app.');
 // A3: only the app's owners change its code (the save is owner-only too; this refuses before anything is prepared).
 const p=await access(f.db,a,w);if(p.archived||await appRole(f.db,a,p,c.id)!=='owner')fail(403,'app_owner_required','Only an owner of this app can update it.');
 const head=c.source.slice(0,c.source.length-body.length);
 // An update keeps the generated configuration and bindings lines exactly; an upgrade rewrites the configuration line
 // with the settings carried over (7.1) and keeps the bindings line, so the same tables stay connected.
 const source=(r.kind==='upgrade'?head.replace(configLine,()=>'const templateConfiguration='+JSON.stringify(carryConfiguration(savedConfiguration(c.source),to).configuration)+';\n'):head)+to.source;
 const preview=await f.preview(a,w,{kind:'save_component',componentId:c.id,expectedVersion:c.version,projectId:c.project_id,catalogOrigin:{id:to.id,version:to.version,digest:to.digest},
  content:{name:c.name,source,format:c.format,sourceAccess:c.source_access,resourceKind:c.resource_kind,manifest:c.manifest,bindings:c.bindings,assets:c.assets??[],execution:c.execution??[]}});
 return {preview:preview.reviewState==='draft'?(await f.finalizeAppPreview(a,w,preview.id,preview.digest)).preview:preview,update:{name:to.name,fromVersion:r.from.version,toVersion:to.version,...(r.kind==='upgrade'?{kind:'upgrade' as const}:{})}};
}
