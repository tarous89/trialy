import {z} from 'zod';
import {id,type Actor,type Field} from '../shared/schema.js';
import {derived} from '../shared/formulas.js';
import {parseValue,normalizeData,uniqueKeys,keyValue,type ValidationIssue} from '../shared/validation.js';
import {access,typeAccess,visibleFields} from './permissions.js';
import {requireAssistantData} from './assistant-levels.js';
import {issuesOf} from './validation-issues.js';
import {assertRecordScope} from './effective-access.js';
import type {Service} from './service.js';

export const IMPORT_ROW_LIMIT=200;
export const importCheckSchema=z.object({
 typeId:id,
 headers:z.array(z.string().max(200)).min(1).max(100),
 rows:z.array(z.array(z.string().max(50000)).max(100)).min(1).max(IMPORT_ROW_LIMIT),
}).strict();
export type ImportCheck=z.infer<typeof importCheckSchema>;

type RowReport={row:number;status:'ready'|'problem'|'duplicate'|'conflict';data:Record<string,unknown>|null;issues:Omit<ValidationIssue,'status'>[];matches?:{row?:number;recordId?:string;key:string;differences?:string[]}[]};

/**
 * X3, X4 (4.2): check an import on the server before anything is prepared. Every row is parsed with the shared parser,
 * given the table's declared formatting rules and checked like a save. Rows that repeat a declared key are reported:
 * as duplicates when everything else matches too, as conflicts when other values differ. Nothing is merged, guessed
 * or written; the person decides which rows to import. Data rows are numbered from 1 (the header is not a row).
 */
export async function importReport(s:Service,a:Actor,w:string,input:unknown){
 const v=importCheckSchema.parse(input);
 const policy=await access(s.db,a,w,true);requireAssistantData(policy,a,true);
 const t=await typeAccess(s.db,a,w,v.typeId,true),fields:Field[]=visibleFields(t.type.fields,t.policy,a).filter(f=>!derived(f));
 // Columns: by key or by name, each matching exactly one writable field.
 const headers=v.headers.map(h=>h.replace(/^﻿/,'').trim());
 const columns=headers.map(h=>{const matches=fields.filter(f=>f.key===h||f.name.toLowerCase()===h.toLowerCase());return matches.length===1?matches[0]!:null;});
 const headerIssues=headers.flatMap((h,i)=>columns[i]?[]:[{field:null,row:null,code:'unknown_column',message:`Column "${h}" matches no field you can import into`}]);
 const keys=columns.filter(Boolean).map(f=>f!.key);if(new Set(keys).size!==keys.length)headerIssues.push({field:null,row:null,code:'duplicate_column',message:'Two columns fill the same field'});
 if(headerIssues.length)return {typeId:v.typeId,tableName:t.type.name,columns:headers.map((h,i)=>({header:h,field:columns[i]?.key??null})),headerIssues,rows:[],summary:{ready:0,problem:0,duplicate:0,conflict:0,total:v.rows.length}};
 const reports:RowReport[]=[];const seen=new Map<string,{row:number;data:Record<string,unknown>}>();
 const declared=uniqueKeys(t.type.fields).filter(k=>k.keys.every(key=>fields.some(f=>f.key===key)));
 for(const [index,cells] of v.rows.entries()){
  const row=index+1,issues:RowReport['issues']=[];let data:Record<string,unknown>={};
  if(cells.length!==headers.length)issues.push({field:null,row,code:'column_count',message:`Row ${row} has ${cells.length} values for ${headers.length} columns`});
  else{
   for(const [i,f] of columns.entries()){const parsed=parseValue(f!,cells[i]);if('issue' in parsed)issues.push({...parsed.issue,row});else if(parsed.value!==null)data[f!.key]=parsed.value;}
   data=normalizeData(t.type.fields,data);
   // Values that parsed are checked like a save; a column that did not parse is reported once, by the parser.
   const unparsed=new Set(issues.map(i=>i.field));
   try{await s.validateData(s.db,a,w,{...t.type,fields:t.type.fields.map((f:Field)=>({...f,unique:false}))},t.policy,data);}catch(e){issues.push(...issuesOf(e,row).filter(i=>!unparsed.has(i.field)).map(({status,...i})=>({...i,row})));}
   issues.sort((x,y)=>columns.findIndex(c=>c?.key===x.field)-columns.findIndex(c=>c?.key===y.field));
  }
  if(issues.length){reports.push({row,status:'problem',data:null,issues});continue;}
  // Declared keys: within the file first, then against saved records the person can see.
  const matches:NonNullable<RowReport['matches']>=[];
  for(const k of declared){const value=keyValue(k.keys,data);if(value===null)continue;const id=k.keys.join('+')+':'+value,earlier=seen.get(id);
   if(earlier)matches.push({row:earlier.row,key:k.name,differences:differing(fields,earlier.data,data)});else seen.set(id,{row,data});
   const existing=await s.keyTaken(s.db,w,v.typeId,k.keys,data);
   // A record outside the person's record scope is reported without its id or values.
   if(existing){let readable=true;try{await assertRecordScope(s.db,t.policy,existing);}catch{readable=false;}
    const r=readable?(await s.db.query('SELECT data FROM records WHERE id=$1',[existing])).rows[0]:null;
    matches.push(readable?{recordId:existing,key:k.name,differences:differing(fields,r?.data??{},data)}:{key:k.name,differences:['(a record you cannot open)']});}
  }
  const conflict=matches.some(m=>m.differences!.length);
  reports.push({row,status:matches.length?(conflict?'conflict':'duplicate'):'ready',data,issues:[],...(matches.length?{matches}:{})});
 }
 const count=(s:RowReport['status'])=>reports.filter(r=>r.status===s).length;
 return {typeId:v.typeId,tableName:t.type.name,columns:headers.map((h,i)=>({header:h,field:columns[i]!.key})),headerIssues:[],rows:reports,summary:{ready:count('ready'),problem:count('problem'),duplicate:count('duplicate'),conflict:count('conflict'),total:reports.length}};
}
/** Names of fields (filled in the import) whose values differ from the matching row or record. */
function differing(fields:Field[],before:Record<string,unknown>,after:Record<string,unknown>){
 return fields.filter(f=>Object.hasOwn(after,f.key)&&JSON.stringify(before[f.key]??null)!==JSON.stringify(after[f.key])).map(f=>f.name);
}
