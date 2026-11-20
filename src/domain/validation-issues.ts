import {AppError,failWith} from '../shared/schema.js';
import type {ValidationIssue} from '../shared/validation.js';

/** At most this many problems travel back with one error; the count says how many there were. */
export const ISSUE_LIMIT=200;
const strip=({status,...issue}:ValidationIssue)=>issue;

/**
 * X3 (4.1): throw all collected problems at once. The error keeps the first problem's status, code and message, so
 * existing callers and checks behave as before, and lists every problem as details.issues {field,row,code,message}.
 */
export function throwIssues(issues:ValidationIssue[]):void{
 if(!issues.length)return;
 const first=issues[0]!;
 failWith(first.status??400,first.code,first.row?`Row ${first.row}: ${first.message}`:first.message,{issues:issues.slice(0,ISSUE_LIMIT).map(strip),issueCount:issues.length});
}

/** The problems an error carries: its issue list, or the error itself as one problem. Errors that are not about values (access, conflicts) are rethrown. */
export function issuesOf(error:unknown,row:number|null):ValidationIssue[]{
 if(!(error instanceof AppError))throw error;
 const list=(error.details as any)?.issues as ValidationIssue[]|undefined;
 if(list?.length)return list.map(i=>({...i,row:i.row??row,status:error.status}));
 if(error.status===400||error.code==='duplicate_value')return [{field:null,row,code:error.code,message:error.message,status:error.status}];
 throw error;
}

/** Run a check per row and report every row's problems together (rows are 1-based). */
export async function rowIssues<T>(items:readonly T[],check:(item:T,row:number)=>Promise<unknown>):Promise<ValidationIssue[]>{
 const issues:ValidationIssue[]=[];
 for(const [i,item] of items.entries()){try{await check(item,i+1);}catch(e){issues.push(...issuesOf(e,i+1));}}
 return issues;
}
/** Problems ordered by row, then in the order found. */
export const byRow=(issues:ValidationIssue[])=>[...issues].sort((x,y)=>(x.row??0)-(y.row??0));
