import {derived} from './formulas.js';
import type {Field} from './schema.js';
export function csvRows(text:string,maxRows=1000):string[][]{
 if(text.length>1024*1024)throw Error('Choose a CSV under 1 MiB.');
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
 const finish=()=>{row.push(cell);if(row.some(x=>x!==''))rows.push(row);if(rows.length>maxRows)throw Error('CSV row limit exceeded.');row=[];cell='';closed=false;};
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(quoted){quoted=false;closed=true;}else if(!cell&&!closed)quoted=true;else throw Error('Unexpected quote in CSV.');}
 else if(c===','&&!quoted){row.push(cell);cell='';closed=false;}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;finish();}else{if(closed)throw Error('Unexpected text after quoted CSV value.');cell+=c;}}
 if(quoted)throw Error('Unclosed quoted CSV value.');finish();return rows;
}
export function csvRecords(text:string,fields:Field[]):Record<string,unknown>[] {
 const rows=csvRows(text,201);const headers=rows.shift()?.map(h=>h.replace(/^\uFEFF/,'').trim());if(!headers?.length||!rows.length)throw Error('Include a header and at least one data row.');
 const columns=headers.map(h=>{const matches=fields.filter(f=>!derived(f)&&(f.key===h||f.name===h));if(matches.length!==1)throw Error(`Unknown or ambiguous column: ${h}`);return matches[0];});
 if(new Set(columns.map(f=>f.key)).size!==columns.length)throw Error('Duplicate columns.');
 return rows.map((values,index)=>{if(values.length!==columns.length)throw Error(`Row ${index+2} has a different number of columns.`);return Object.fromEntries(columns.map((f,i)=>{const v=values[i];if(v==='')return [f.key,null];if(f.multiple){let ids;try{ids=JSON.parse(v);}catch{throw Error(`Row ${index+2}: use a JSON array of reference IDs for ${f.name}.`);}if(!Array.isArray(ids)||ids.some(x=>typeof x!=='string'))throw Error('Expected a JSON array of reference IDs');return [f.key,ids];}if(['number','money'].includes(f.kind)){const n=Number(v);if(!Number.isFinite(n)||!v.trim())throw Error(`Row ${index+2}: ${f.name} must be numeric.`);return [f.key,n];}if(f.kind==='boolean'){if(!['true','false','yes','no'].includes(v.toLowerCase()))throw Error(`Row ${index+2}: use true/false for ${f.name}.`);return [f.key,['true','yes'].includes(v.toLowerCase())];}return [f.key,v];}));});
}

