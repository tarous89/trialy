import type {Actor} from '../shared/schema.js';
import {fail} from '../shared/schema.js';
import {standardTracker} from '../workspace/standard-tracker.js';
import {standardSource} from '../shared/standard-tool.js';

/** Optional, application-owned tracker sections. Absence preserves app-level access. */
export function appSections(c:any){
 const tracker=standardTracker(c.source??'');
 return tracker?tracker.config.tabs.filter((t:any)=>t.accessId).map((t:any)=>({id:t.accessId,name:t.name,typeId:t.typeId,fields:t.columns.map((f:any)=>f.field)})):[];
}
export function sectionRules(p:any,a:Actor,appId:string){return (p.permission_rules??[]).filter((r:any)=>r.kind==='app_section'&&r.resourceId===appId&&(r.subject===a.userId||a.origin==='ai'&&r.subject==='chatgpt'));}
export function sectionGrant(p:any,a:Actor,appId:string,sectionId?:string){
 const rules=sectionId?sectionRules(p,a,appId).filter((r:any)=>r.field===sectionId):[];
 const read=!rules.some((r:any)=>r.read==='deny');return {read,write:read&&!rules.some((r:any)=>r.write==='deny')};
}
export function sectionFields(p:any,a:Actor,c:any,typeId:string,write=false):string[]|null{
 if(!sectionRules(p,a,c.id).some((r:any)=>r.read==='deny'||write&&r.write==='deny'))return null;
 const tracker=standardTracker(c.source??'');if(!tracker||!tracker.config.tabs.some((t:any)=>t.accessId))return null;
 return [...new Set<string>(tracker.config.tabs.filter((t:any)=>t.typeId===typeId&&sectionGrant(p,a,c.id,t.accessId)[write?'write':'read']).flatMap((t:any)=>t.columns.filter((f:any)=>!write||f.editable).map((f:any)=>f.field)))];
}
/** Project source as well as records: forbidden labels, examples and overview references never leave the server. */
export function projectAppSections(p:any,a:Actor,c:any,current=c){
 const rules=sectionRules(p,a,c.id);if(!rules.some((r:any)=>r.read==='deny'||r.write==='deny'))return c;
 const tracker=standardTracker(c.source??'');if(!tracker)return {...c,source:'return {html:"<p>No sections are shared with you.</p>",state:{}};',bindings:[],manifest:null,assets:[],execution:[],sectionsEmpty:true};
 const config=tracker.config,indices:number[]=[],tabs=config.tabs.flatMap((t:any,i:number)=>{
  const g=sectionGrant(p,a,c.id,t.accessId);
  // A historical tab predating accessId must not bypass a current restriction.
  if(!t.accessId)for(const part of appSections(current).filter((s:any)=>s.typeId===t.typeId&&s.fields.some((f:string)=>t.columns.some((c:any)=>c.field===f)))){const now=sectionGrant(p,a,c.id,part.id);g.read&&=now.read;g.write&&=now.write;}
  if(!g.read)return [];indices.push(i);return [{...t,columns:t.columns.map((f:any)=>({...f,editable:f.editable&&g.write}))}];});
 const fields=tabs.flatMap((t:any)=>t.columns),bindings=c.bindings.map((b:any)=>({...b,fields:b.fields.filter((f:string)=>tabs.some((t:any)=>t.typeId===b.typeId&&t.columns.some((v:any)=>v.field===f)))})).filter((b:any)=>b.fields.length);
 const projected={...config,tabs,showExample:config.showExample&&indices.includes(0),example:indices.includes(0)?config.example:{},overview:indices.length===config.tabs.length?config.overview:undefined};
 return {...c,source:tabs.length?standardSource(projected):'return {html:"<p>No sections are shared with you.</p>",state:{}};',bindings,manifest:c.manifest?{...c.manifest,fields:c.manifest.fields.filter((f:any)=>fields.some((x:any)=>x.fieldId===f.id)).map((f:any)=>({...f,mode:fields.find((x:any)=>x.fieldId===f.id)?.editable?f.mode:'read'}))}:null,assets:[],execution:[],sectionsEmpty:!tabs.length};
}
/** Existing restrictions cannot disappear through a source/layout revision or restore. */
export function validateSectionRevision(p:any,previous:any,next:any){
 const sections=appSections(next),ids=sections.map((s:any)=>s.id);
 if(new Set(ids).size!==ids.length)fail(400,'duplicate_section','Use a unique accessId for each protected tab');
 if(sections.length&&((next.execution??[]).length||(next.assets??[]).length))fail(400,'section_capabilities','Section access currently supports standard record tabs without attached functions or assets');
 if(!previous)return;
 const protectedIds=(p.permission_rules??[]).filter((r:any)=>r.kind==='app_section'&&r.resourceId===previous.id&&(r.read==='deny'||r.write==='deny')).map((r:any)=>r.field);
 for(const old of appSections(previous).filter((s:any)=>protectedIds.includes(s.id))){const section=sections.find((s:any)=>s.id===old.id);if(!section||section.typeId!==old.typeId||old.fields.some((f:string)=>!section.fields.includes(f)))fail(409,'section_policy_conflict','Keep restricted section identities and bindings, or explicitly review their access rules before replacing them');
  const before=standardTracker(previous.source)?.config.tabs??[];
  for(const tab of standardTracker(next.source)?.config.tabs??[]){if(tab.accessId===old.id||tab.typeId!==old.typeId)continue;const prior=before.find((t:any)=>t.typeId===tab.typeId&&(tab.accessId?t.accessId===tab.accessId:!t.accessId&&t.name===tab.name));if(tab.columns.some((f:any)=>old.fields.includes(f.field)&&!prior?.columns.some((p:any)=>p.field===f.field&&(!f.editable||p.editable))))fail(409,'section_policy_conflict','Review restricted data access before exposing it through another section');}
 }
}
