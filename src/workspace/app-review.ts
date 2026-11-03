import {readStandardConfig} from '../shared/standard-tool.js';
/** Human-readable scope of an exact app revision, without record values or code. */
export function appRevisionReview(before:any,operation:any){
 const next=operation.content,oldConfig=readStandardConfig(before.source),config=readStandardConfig(next.source),changes:string[]=[];
 const fieldNames=(bindings:any[],other:any[],source:any)=>bindings.flatMap(b=>b.fields.filter((key:string)=>!other.some(o=>o.typeId===b.typeId&&o.fields.includes(key))).map((key:string)=>{const tab=source?.tabs?.find((t:any)=>t.typeId===b.typeId),column=tab?.columns?.find((c:any)=>c.field===key);return (tab?.name?tab.name+' · ':'')+(column?.label??key.replaceAll('_',' '));}));
 const added=fieldNames(next.bindings??[],before.bindings??[],config),removed=fieldNames(before.bindings??[],next.bindings??[],oldConfig);
 if(added.length)changes.push('Add app access to: '+added.join(', ')+'.');
 if(removed.length)changes.push('Remove app access to: '+removed.join(', ')+'.');
 if(next.name!==before.name)changes.push('Rename app to '+next.name+'.');
 if(config?.description!==oldConfig?.description)changes.push('Update the app description.');
 if(next.source!==before.source)changes.push(config&&oldConfig?'Update the app layout and field configuration.':'Update the app interface and behavior.');
 if(next.sourceAccess!==undefined&&next.sourceAccess!==before.source_access)changes.push('Change the app’s database access scope.');
 if(JSON.stringify(next.execution??[])!==JSON.stringify(before.execution??[]))changes.push('Change the app’s permitted actions.');
 if(operation.setup?.newTables?.length)changes.push('Create tables: '+operation.setup.newTables.map((t:any)=>t.name).join(', ')+'.');
 if(operation.setup?.extendTables?.length)changes.push('Add database fields: '+operation.setup.extendTables.flatMap((t:any)=>t.newFields.map((f:any)=>f.name)).join(', ')+'.');
 return {title:'Update '+before.name,changes:changes.length?changes:['Save the prepared app configuration.'],note:'Saving applies these changes to the existing app. Automation setup is saved separately.'};
}
