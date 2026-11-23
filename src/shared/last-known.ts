import {readStandardConfig} from './standard-tool.js';
/**
 * L4.1 (docs/scopes/LOADING_SPEED_2026-11-22.md, choice D and default 4): last known basics.
 * What Apps home, the archived count, the template list and an app's frame last showed, kept on this device so a return
 * visit shows them at once, marked as being checked, and replaces them when the server answers. Only names, kinds, dates,
 * counts and tab names: never records, card miniatures, field values, code or anything about access. Kept for one person:
 * nothing is read or written until the host names the signed-in person (setLastKnownViewer), a different person clears
 * everything, and signing out clears everything (forgetLastKnown). Where the host does not allow storage (a sandboxed
 * plugin frame, a private window, storage switched off), every function does nothing and the surfaces behave as before.
 * Showing basics never decides access: every action still goes to the server, which checks access on every request.
 */
const KEY='trialy-last-known:v1',MAX_AGE_MS=14*86400000,MAX_HOMES=4,MAX_APPS=24;
type Stamped<T>={at:number;value:T};
type Entry={viewer:string;home:Record<string,Stamped<HomeBasics>>;templates?:Stamped<{catalog:string;templates:any[]}>;apps:Record<string,Stamped<AppBasics>>};
export type HomeBasics={projects:{id:string;name:string;workspaceId?:string;createdAt?:string}[];resources:any[];total:number;nextOffset:number|null;archivedApps:any;revision?:string;remembered:true};
export type AppBasics={name:string;tabs:string[]};
let viewer:string|null=null,store:Storage|null|undefined;
function storage(){
 if(store!==undefined)return store;
 try{const s=globalThis.localStorage;const probe=KEY+':probe';s.setItem(probe,'1');s.removeItem(probe);store=s;}catch{store=null;}
 return store;
}
function read():Entry|null{
 const s=storage();if(!s||!viewer)return null;
 try{const value=JSON.parse(s.getItem(KEY)??'null');if(value&&typeof value==='object'&&value.viewer===viewer)return {home:{},apps:{},...value};}catch{/* unreadable: start again */}
 return null;
}
function write(change:(entry:Entry)=>void){
 const s=storage();if(!s||!viewer)return;
 const entry=read()??{viewer,home:{},apps:{}};change(entry);
 try{s.setItem(KEY,JSON.stringify(entry));}catch{/* full or refused: nothing is kept */}
}
const fresh=<T>(item:Stamped<T>|undefined)=>item&&Date.now()-item.at<=MAX_AGE_MS?item.value:undefined;
const newest=<T>(items:Record<string,Stamped<T>>,limit:number)=>Object.fromEntries(Object.entries(items).sort((a,b)=>b[1].at-a[1].at).slice(0,limit));
/** The host names the signed-in person. Basics of anyone else on this device are removed. */
export function setLastKnownViewer(id:string|null|undefined){
 const next=id?String(id):null;if(next===viewer)return;viewer=next;
 const s=storage();if(!s||!next)return;
 try{const value=JSON.parse(s.getItem(KEY)??'null');if(value&&value.viewer!==next)s.removeItem(KEY);}catch{try{s.removeItem(KEY);}catch{}}
}
/** Sign-out (or any end of the session the host sees): nothing is kept. */
export function forgetLastKnown(){viewer=null;const s=storage();try{s?.removeItem(KEY);}catch{}}
export const lastKnownAvailable=()=>!!storage();
/** Tests only: use this storage (null: storage refused; undefined: look again). */
export function lastKnownStorageForTests(value:Storage|null|undefined){store=value;viewer=null;}

/** Apps home: card names, kinds, dates and placements, project names, counts. Card miniatures (record values) are left out. */
export function rememberHome(key:string,data:any){
 if(!data||!Array.isArray(data.resources))return;
 const basics:HomeBasics={
  projects:(data.projects??[]).map((p:any)=>({id:p.id,name:p.name,...(p.workspaceId?{workspaceId:p.workspaceId}:{}),...(p.createdAt?{createdAt:p.createdAt}:{})})),
  // Drafts (source preview) expire and belong to one conversation: they are not kept.
  resources:data.resources.filter((r:any)=>r.source!=='preview').map((r:any)=>({id:r.id,...(r.workspaceId?{workspaceId:r.workspaceId}:{}),name:r.name,kind:r.kind,source:r.source,projectIds:r.projectIds??[],updatedAt:r.updatedAt,description:r.description??'',...(r.status?{status:r.status}:{}),...(r.revisionId?{revisionId:r.revisionId}:{}),canMove:false})),
  total:Number(data.total)||0,nextOffset:data.nextOffset??null,archivedApps:data.archivedApps??0,...(typeof data.revision==='string'?{revision:data.revision}:{}),remembered:true,
 };
 write(entry=>{entry.home=newest({...entry.home,[key]:{at:Date.now(),value:basics}},MAX_HOMES);});
}
export function knownHome(key:string):HomeBasics|undefined{return fresh(read()?.home[key]);}
/** A changed revision or lost access: what was remembered for this read may no longer be visible to this person. */
export function forgetHome(key?:string){write(entry=>{if(key===undefined)entry.home={};else delete entry.home[key];});}
/** Before the person is known (the website's first read starts with the account check): whether this device holds any
 * remembered Home, so that read can be quiet. Says nothing about whose; the basics themselves wait for the person. */
export function lastKnownHomeStored(){const s=storage();if(!s)return false;try{const value=JSON.parse(s.getItem(KEY)??'null');return !!value&&Object.values<any>(value.home??{}).some(item=>Date.now()-item.at<=MAX_AGE_MS);}catch{return false;}}

/** The template list: catalog data only (the same for everyone on a channel), kept with its catalog fingerprint. */
export function rememberTemplates(value:{catalog:string;templates:any[]}){write(entry=>{entry.templates={at:Date.now(),value};});}
export function knownTemplates(){return fresh(read()?.templates);}

/** An app's frame: its name and tab names. */
const appKey=(workspaceId:string,appId:string)=>workspaceId+':'+appId;
export function rememberApp(workspaceId:string|undefined,appId:string|undefined,basics:{name?:string;tabs?:string[]}){
 if(!workspaceId||!appId||typeof basics.name!=='string'||!basics.name)return;
 const value:AppBasics={name:basics.name.slice(0,200),tabs:(basics.tabs??[]).filter(t=>typeof t==='string').slice(0,12).map(t=>t.slice(0,80))};
 write(entry=>{entry.apps=newest({...entry.apps,[appKey(workspaceId,appId)]:{at:Date.now(),value}},MAX_APPS);});
}
export function knownApp(workspaceId:string|undefined,appId:string|undefined){return workspaceId&&appId?fresh(read()?.apps[appKey(workspaceId,appId)]):undefined;}
export function forgetApp(workspaceId:string|undefined,appId:string|undefined){if(workspaceId&&appId)write(entry=>{delete entry.apps[appKey(workspaceId,appId)];});}
/** Tab names of a saved app, where its layout names them (standard trackers); other apps keep their name only. */
export function appTabNames(component:any):string[]{
 const config=typeof component?.source==='string'?readStandardConfig(component.source):null;
 return Array.isArray(config?.tabs)?config.tabs.filter((t:any)=>t&&t.visible!==false&&typeof t.name==='string').map((t:any)=>t.name):[];
}
