/**
 * X3, X4 (package 4.1): the platform's deterministic checks, shared by every entry point.
 *
 * - One parser turns typed-in or imported text into a field's value (numbers, dates, yes/no, lists).
 *   It accepts only unambiguous input: "1,234.5" is a number, "1,5" is not; "2026-11-20" is a date, "11/12/2026" is not.
 * - Declared formatting rules (`normalize`) are applied only where the table declares them, never guessed.
 * - Value checks (type, date, options, range, format, length) collect every problem instead of stopping at the first.
 *
 * Checks that need the database (unique keys, references, people, documents) run on the server in
 * `Service.validateData`, which uses these same helpers and reports problems in the same shape.
 * This file has no server imports, so the browser can run the same checks before it sends a save.
 */
import type {Field} from './schema.js';

/** One problem with one value. `row` is the 1-based data row of an import or batch (null for a single save). */
export type ValidationIssue={field:string|null;row:number|null;code:string;message:string;status?:number};

export const FIELD_FORMATS=['email','url','phone','code'] as const;
export type FieldFormat=typeof FIELD_FORMATS[number];
export const NORMALIZE_RULES=['trim','collapse_spaces','lowercase','uppercase'] as const;
export type NormalizeRule=typeof NORMALIZE_RULES[number];

const FORMAT_PATTERNS:Record<FieldFormat,{test:(v:string)=>boolean;label:string}>={
 email:{test:v=>v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),label:'an email address'},
 url:{test:v=>{if(v.length>2000||!/^https?:\/\//i.test(v))return false;try{new URL(v);return true;}catch{return false;}},label:'a web address starting with http:// or https://'},
 phone:{test:v=>/^\+?[0-9][0-9 ().-]{4,30}$/.test(v)&&v.replace(/\D/g,'').length>=5,label:'a phone number'},
 code:{test:v=>/^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/.test(v),label:'a code of letters, digits, dots, dashes, slashes or underscores'},
};

export const isIsoDate=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const numberKind=(f:Pick<Field,'kind'>)=>f.kind==='number'||f.kind==='money';

/** A number written as plain digits, or with comma thousands groups. Spaces are ignored. Ambiguous decimal commas are refused. */
export function parseNumber(text:string):number|null{
 const v=text.trim().replace(/[\s  ]/g,'');
 if(!v)return null;
 if(/^[+-]?\d+(\.\d+)?$/.test(v)||/^[+-]?\.\d+$/.test(v))return Number(v);
 if(/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(v))return Number(v.replace(/,/g,''));
 return null;
}
/** ISO dates only (2026-11-20, or 2026/11/20). Day-first and month-first forms are ambiguous and refused. */
export function parseDate(text:string):string|null{
 const v=text.trim().replace(/\//g,'-');
 const m=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);if(!m)return null;
 const iso=`${m[1]}-${m[2]!.padStart(2,'0')}-${m[3]!.padStart(2,'0')}`;
 return isIsoDate(iso)?iso:null;
}
export function parseBoolean(text:string):boolean|null{const v=text.trim().toLowerCase();return ['true','yes','y','1'].includes(v)?true:['false','no','n','0'].includes(v)?false:null;}

/** Apply a field's declared formatting rules. Values the rules do not cover are returned unchanged. */
export function normalizeValue(f:Pick<Field,'kind'>&{normalize?:readonly NormalizeRule[]},value:unknown):unknown{
 const rules=f.normalize??[];if(!rules.length)return value;
 if(Array.isArray(value))return value.map(v=>normalizeValue(f,v));
 if(typeof value!=='string')return value;
 let v=value;
 if(rules.includes('trim'))v=v.trim();
 if(rules.includes('collapse_spaces'))v=v.replace(/\s+/g,' ');
 if(rules.includes('lowercase'))v=v.toLowerCase();
 if(rules.includes('uppercase'))v=v.toUpperCase();
 return v;
}
export function normalizeData(fields:readonly Field[],data:Record<string,unknown>):Record<string,unknown>{
 if(!fields.some(f=>f.normalize?.length))return data;
 return Object.fromEntries(Object.entries(data).map(([k,v])=>{const f=fields.find(x=>x.key===k);return [k,f?normalizeValue(f,v):v];}));
}

/**
 * Turn text (a form field, a CSV cell, a bound edit) into a field's value with the shared parser.
 * Typed values pass through unchanged and are checked by checkValue. Empty text means no value.
 */
export function parseValue(f:Field,raw:unknown):{value:unknown}|{issue:Omit<ValidationIssue,'row'>}{
 const bad=(message:string)=>({issue:{field:f.key,code:'invalid_value',message}});
 if(raw===undefined||raw===null)return {value:null};
 if(typeof raw!=='string')return {value:raw};
 if(raw.trim()==='')return {value:null};
 if(f.multiple){
  const t=raw.trim();
  if(t.startsWith('[')){let list;try{list=JSON.parse(t);}catch{return bad(`${f.name}: use a list such as ["a","b"]`);}if(!Array.isArray(list))return bad(`${f.name}: use a list of values`);
   const parsed=[];for(const item of list){const one=parseValue({...f,multiple:false},typeof item==='string'?item:item);if('issue' in one)return one;parsed.push(one.value);}return {value:parsed};}
  // A single value in a list field is a list of one; it is never split on commas, which may be part of the text.
  const one=parseValue({...f,multiple:false},raw);return 'issue' in one?one:{value:one.value===null?null:[one.value]};
 }
 if(numberKind(f)){const n=parseNumber(raw);return n===null?bad(`${f.name} must be a number (for example 1234.5 or 1,234.5)`):{value:n};}
 if(f.kind==='boolean'){const b=parseBoolean(raw);return b===null?bad(`${f.name}: use yes or no`):{value:b};}
 if(f.kind==='date'){const d=parseDate(raw);return d===null?bad(`${f.name} must be a date written as YYYY-MM-DD`):{value:d};}
 return {value:raw};
}

const rangeText=(v:number|string)=>String(v);
/**
 * Checks on one non-empty value that need no database: type, date, options, range, length and format.
 * Required values, unique keys and references are checked by the caller.
 */
export function checkValue(f:Field,v:unknown):Omit<ValidationIssue,'row'>[]{
 const issue=(code:string,message:string)=>({field:f.key,code,message});
 if(numberKind(f)){if(typeof v!=='number'||!Number.isFinite(v))return [issue('invalid_value',`${f.name} must be a number`)];}
 else if(f.kind==='boolean'){if(typeof v!=='boolean')return [issue('invalid_value',`${f.name} must be true or false`)];}
 else if(typeof v!=='string')return [issue('invalid_value',`${f.name} must be text`)];
 if(f.kind==='date'&&!isIsoDate(v))return [issue('invalid_value',`${f.name} must be a date`)];
 if(f.kind==='select'&&!f.options?.includes(v as string))return [issue('invalid_value',`${f.name} has an invalid option`)];
 const out=[];const r=f.range;
 if(r&&numberKind(f)&&typeof v==='number'){
  if(typeof r.min==='number'&&v<r.min)out.push(issue('out_of_range',`${f.name} must be at least ${rangeText(r.min)}`));
  if(typeof r.max==='number'&&v>r.max)out.push(issue('out_of_range',`${f.name} must be at most ${rangeText(r.max)}`));
 }
 if(r&&f.kind==='date'&&typeof v==='string'){
  if(typeof r.min==='string'&&v<r.min)out.push(issue('out_of_range',`${f.name} must be on or after ${r.min}`));
  if(typeof r.max==='string'&&v>r.max)out.push(issue('out_of_range',`${f.name} must be on or before ${r.max}`));
 }
 if(typeof v==='string'&&f.kind==='text'){
  if(r&&typeof r.min==='number'&&v.length<r.min)out.push(issue('out_of_range',`${f.name} must have at least ${r.min} characters`));
  if(r&&typeof r.max==='number'&&v.length>r.max)out.push(issue('out_of_range',`${f.name} must have at most ${r.max} characters`));
  if(f.format&&!FORMAT_PATTERNS[f.format].test(v))out.push(issue('invalid_format',`${f.name} must be ${FORMAT_PATTERNS[f.format].label}`));
 }
 return out;
}

/** Keys that must be unique together: every unique field, alone or with the fields it declares in `uniqueWith`. */
export function uniqueKeys(fields:readonly Field[]):{name:string;keys:string[]}[]{
 return fields.filter(f=>f.unique).map(f=>{const keys=[f.key,...(f.uniqueWith??[]).filter(k=>k!==f.key&&fields.some(x=>x.key===k))];return {name:keys.map(k=>fields.find(x=>x.key===k)!.name).join(' + '),keys};});
}
const blank=(v:unknown)=>v===undefined||v===null||v===''||(Array.isArray(v)&&!v.length);
/** The comparable value of a key in a record, or null when any part is empty (empty keys are never duplicates). */
export function keyValue(keys:readonly string[],data:Record<string,unknown>):string|null{
 if(keys.some(k=>blank(data[k])))return null;
 return JSON.stringify(keys.map(k=>{const v=data[k];return typeof v==='string'?v.trim().toLowerCase():v;}));
}

/** Validation settings on a field, as the schema stores them. */
export type FieldValidation={range?:{min?:number|string;max?:number|string};format?:FieldFormat;normalize?:NormalizeRule[];uniqueWith?:string[]};

/** Check the settings themselves when a table is defined (ranges fit the kind, combined keys name real fields). */
export function fieldValidationProblems(fields:readonly Field[]):string[]{
 const out:string[]=[];
 for(const f of fields){
  const r=f.range;
  if(r){
   if(numberKind(f)&&[r.min,r.max].some(x=>x!==undefined&&typeof x!=='number'))out.push(`${f.name}: a number range needs numbers`);
   else if(f.kind==='date'&&[r.min,r.max].some(x=>x!==undefined&&!isIsoDate(x)))out.push(`${f.name}: a date range needs YYYY-MM-DD dates`);
   else if(f.kind==='text'&&[r.min,r.max].some(x=>x!==undefined&&(typeof x!=='number'||!Number.isInteger(x)||x<0)))out.push(`${f.name}: a text length range needs whole numbers`);
   else if(!numberKind(f)&&f.kind!=='date'&&f.kind!=='text')out.push(`${f.name}: ranges apply to numbers, amounts, dates and text`);
   else if(r.min!==undefined&&r.max!==undefined&&r.min>r.max)out.push(`${f.name}: the lowest value is above the highest`);
  }
  if(f.format&&f.kind!=='text')out.push(`${f.name}: formats apply to text fields`);
  if(f.normalize?.includes('lowercase')&&f.normalize.includes('uppercase'))out.push(`${f.name}: choose lowercase or uppercase, not both`);
  if(f.uniqueWith?.length){
   if(!f.unique)out.push(`${f.name}: a combined key needs "Unique when filled"`);
   for(const k of f.uniqueWith)if(k===f.key||!fields.some(x=>x.key===k))out.push(`${f.name}: the combined key names an unknown field (${k})`);
  }
 }
 return out;
}
