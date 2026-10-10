import {isDeepStrictEqual} from 'node:util';
import type {Connection} from '../db/database.js';
import {templates,templateLinks} from './templates.js';
import {fail,type Field} from '../shared/schema.js';
export async function templateDiff(tx:Connection,w:string,templateId:string){
 const installed=(await tx.query('SELECT * FROM template_installations WHERE workspace_id=$1 AND template_id=$2',[w,templateId])).rows[0],latest=templates.find(t=>t.id===templateId);
 if(!installed||!latest)fail(404,'template_untracked','This installation has no tracked baseline. Existing tables are preserved; automatic upgrade is unavailable');
 const tables=(await tx.query('SELECT * FROM entity_types WHERE workspace_id=$1 ORDER BY id',[w])).rows;
 const additions:any[]=[],newTables:any[]=[],conflicts:string[]=[];
 for(const table of latest.tables){const baseline=installed.tables.find((t:any)=>t.name===table.name),current=baseline?tables.find(t=>t.id===baseline.id):null;
  if(!baseline){if(tables.some(t=>t.name===table.name))conflicts.push(`${table.name}: an unrelated table already uses this name`);else newTables.push(table);continue;}
  if(!current){conflicts.push(`${table.name}: installed table is unavailable`);continue;}
  const fields:Field[]=[];
  for(const field of table.fields){const targetName=templateLinks[table.name]?.[field.key],target=installed.tables.find((t:any)=>t.name===targetName);const desired=target?{...field,kind:'relationship' as const,targetTypeId:target.id}:field;
   const previous=baseline.fields.find((f:Field)=>f.key===field.key),present=current.fields.find((f:Field)=>f.key===field.key);
   if(!previous&&!present){if(desired.required||desired.formula)conflicts.push(`${table.name}.${field.key}: requires a reviewed data migration`);else fields.push(desired);}
   else if(!previous&&present){if(!isDeepStrictEqual(present,desired))conflicts.push(`${table.name}.${field.key}: a custom field already uses this key`);}
   else if(!isDeepStrictEqual(previous,desired)&&!isDeepStrictEqual(present,desired))conflicts.push(`${table.name}.${field.key}: upstream definition changed; review a field migration`);
   // Local edits to existing fields are retained, including removed fields and renamed tables.
  }
  if(fields.length)additions.push({typeId:current.id,name:current.name,expectedVersion:current.version,fields:[...current.fields,...fields],added:fields.map(f=>f.key)});
 }
 return {templateId,installedVersion:installed.version,availableVersion:latest.version,additions,newTables,conflicts,baseline:installed.tables};
}
