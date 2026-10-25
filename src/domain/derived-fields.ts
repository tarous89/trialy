import {assertRecordScope} from './effective-access.js';
import {z} from 'zod';
import {getQuickJS} from 'quickjs-emscripten';
import type {Connection} from '../db/database.js';
import {typeAccess,visibleFields,projectData} from './permissions.js';
import {formulaOrder,dependencies} from '../shared/formulas.js';
import {fail,type Actor,type Field} from '../shared/schema.js';

/** Pure JSON-in/JSON-out computation. Guest code never executes in Node. */
export async function pureCode(source:string,input:unknown){
 const raw=JSON.stringify(input);if(raw.length>262144)throw Error('input_limit');
 const q=await getQuickJS(),rt=q.newRuntime();rt.setMemoryLimit(4*1024*1024);rt.setMaxStackSize(128*1024);
 const deadline=Date.now()+40;rt.setInterruptHandler(()=>Date.now()>deadline);const vm=rt.newContext();
 try{
  const result=vm.evalCode(`(()=>{'use strict';globalThis.Date=Object.freeze({parse:Date.parse,UTC:Date.UTC});Math.random=undefined;
   const input=JSON.parse(${JSON.stringify(raw)});
   const value=(function(input){${source}\n})(input);
   if(value===undefined||value&&typeof value.then==='function')throw Error('Return a JSON value');
   const raw=JSON.stringify(value,(_key,v)=>{if(typeof v==='number'&&!Number.isFinite(v))throw Error('non_finite');return v;});if(raw.length>50000)throw Error('output_limit');return raw;})()`);
  if(result.error){result.error.dispose();throw Error('execution_failed');}
  const value=JSON.parse(vm.getString(result.value));result.value.dispose();return value;
 }finally{vm.dispose();rt.dispose();}
}
const displaySchema=z.object({kind:z.enum(['text','badge','progress']),text:z.string().max(1000),value:z.number().finite().optional(),min:z.number().finite().optional(),max:z.number().finite().optional()}).strict();
export function checkOutput(field:Field,value:unknown){
 if(value===null)return;
 const kind=field.kind;
 if(['number','money'].includes(kind)&&!(typeof value==='number'&&Number.isFinite(value)))throw Error('output_type');
 if(kind==='boolean'&&typeof value!=='boolean')throw Error('output_type');
 if(['text','date'].includes(kind)&&typeof value!=='string')throw Error('output_type');
 if(kind==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(String(value))||Number.isNaN(Date.parse(String(value)))||new Date(String(value)).toISOString().slice(0,10)!==value))throw Error('output_type');
}
export async function validateDerived(db:Connection,a:Actor,w:string,typeId:string|undefined,fields:Field[]){
 formulaOrder(fields);
 const types=(await db.query('SELECT id,fields FROM entity_types WHERE workspace_id=$1',[w])).rows;
 const schemas=new Map<string,Field[]>(types.map(t=>[t.id,t.fields]));const own=typeId??'new';schemas.set(own,fields);
 for(const f of fields){
  if(f.renderer)validateRenderer(f,f.renderer);
  if(f.kind==='field'&&!f.targetTypeId)fail(400,'invalid_reference','Field references require a target table');
  if(f.targetTypeId)await typeAccess(db,a,w,f.targetTypeId);
  if(f.lookup){const ref=fields.find(v=>v.key===f.lookup!.reference)!;const t=await typeAccess(db,a,w,ref.targetTypeId!);
   const source=visibleFields(t.type.fields,t.policy,a).find(v=>v.key===f.lookup!.field);
   if(!source)fail(400,'invalid_lookup','Lookup source is unavailable');
   if(['sum','min','max'].includes(f.lookup.aggregate)&&!['number','money'].includes(source.kind))fail(400,'invalid_lookup','Numeric aggregation needs a numeric source');
   const output=f.lookup.aggregate==='count'?'number':f.lookup.aggregate==='join'?'text':source.kind;
   if(f.kind!==output&&!(['number','money'].includes(f.kind)&&['number','money'].includes(output)))fail(400,'invalid_lookup','Lookup output type does not match its source/aggregation');
  }
 }
 if(typeId){
  const previous=types.find(t=>t.id===typeId)?.fields??[];
  const removed=previous.filter((f:Field)=>!fields.some(n=>n.key===f.key)).map((f:Field)=>f.key);
  if(removed.length)for(const t of types)for(const f of t.fields as Field[])if(f.kind==='field'&&f.targetTypeId===typeId){
   const used=(await db.query("SELECT id FROM records WHERE workspace_id=$1 AND type_id=$2 AND (data->>$3::text=ANY($4::text[]) OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(data->$3::text)='array' THEN data->$3::text ELSE '[]'::jsonb END) v WHERE v=ANY($4::text[]))) LIMIT 1",[w,t.id,f.key,removed])).rows;
   if(used.length)fail(409,'field_dependency','A referenced field cannot be removed; update its references first');
  }
 }
 // Validate the whole graph, including existing lookups that point into an edited table.
 const active=new Set<string>(),done=new Set<string>();
 function visit(t:string,key:string){const tag=t+':'+key;if(done.has(tag))return;if(active.has(tag))fail(400,'formula_cycle','Circular derived-field dependency');
  const fs=schemas.get(t),f=fs?.find(v=>v.key===key);if(!f)fail(409,'field_dependency','A referenced field cannot be removed; update its dependants first');
  active.add(tag);for(const dep of dependencies(f))visit(t,dep);
  if(f.lookup){const ref=fs!.find(v=>v.key===f.lookup!.reference);if(!ref?.targetTypeId||ref.kind!=='relationship')fail(409,'field_dependency','A lookup requires its typed record reference');
   visit(ref.targetTypeId,f.lookup.field);
   const source=schemas.get(ref.targetTypeId)!.find(v=>v.key===f.lookup!.field)!;
   if(['sum','min','max'].includes(f.lookup.aggregate)&&!['number','money'].includes(source.kind))fail(409,'field_dependency','A source type change would invalidate a numeric lookup');
   const kind=f.lookup.aggregate==='count'?'number':f.lookup.aggregate==='join'?'text':source.kind;
   if(f.kind!==kind&&!(['number','money'].includes(f.kind)&&['number','money'].includes(kind)))fail(409,'field_dependency','A source type change would invalidate a lookup');}
  active.delete(tag);done.add(tag);
 }
 for(const [t,fs] of schemas)for(const f of fs)visit(t,f.key);
}

/** One request-local evaluation context: no cross-user caches, writes or external tools. */
export class DerivedReader{
 private schemas=new Map<string,Promise<{type:any;policy:any;fields:Field[]}>>();
 private rows=new Map<string,Promise<any>>();
 private values=new Map<string,Promise<any>>();
 private budget=0;
 private deadline=Date.now()+2500;
 constructor(private db:Connection,private actor:Actor,private workspace:string,private allowedTypes?:string[],private allowedFields?:Record<string,string[]>){}
 private schema(t:string){if(this.allowedTypes&&!this.allowedTypes.includes(t))throw Error('source_unavailable');if(!this.schemas.has(t))this.schemas.set(t,(async()=>{const {type,policy}=await typeAccess(this.db,this.actor,this.workspace,t);return {type,policy,fields:visibleFields(type.fields,policy,this.actor).filter(f=>!this.allowedFields||this.allowedFields[t]?.includes(f.key))};})());return this.schemas.get(t)!;}
 private row(id:string){if(!this.rows.has(id))this.rows.set(id,(async()=>{if(++this.budget>3000||Date.now()>this.deadline)throw Error('evaluation_limit');return (await this.db.query("SELECT id,type_id,version,CASE WHEN octet_length(data::text)<=262144 THEN data ELSE NULL END AS data FROM records WHERE workspace_id=$1 AND id::text=$2 AND state NOT IN ('archived','superseded')",[this.workspace,id])).rows[0];})());return this.rows.get(id)!;}
 private async value(row:any,key:string,stack:Set<string>):Promise<any>{
  const tag=row.id+':'+key;if(stack.has(tag))throw Error('dependency_cycle');if(this.values.has(tag))return this.values.get(tag)!;
  const next=new Set(stack);next.add(tag);
  const work=(async()=>{if(++this.budget>3000||Date.now()>this.deadline)throw Error('evaluation_limit');
   if(row.data===null)throw Error('input_limit');const {fields,policy}=await this.schema(row.type_id);await assertRecordScope(this.db,policy,row.id);const f=fields.find(v=>v.key===key);if(!f)throw Error('source_unavailable');
   if(f.computed){const input:Record<string,any>={};for(const dep of f.computed.fields)input[dep]=await this.value(row,dep,next);
    const output=await pureCode(f.computed.source,input);checkOutput(f,output);return output;}
   if(f.lookup){const ref=fields.find(v=>v.key===f.lookup!.reference)!;
    const linked=await this.value(row,ref.key,next),ids=Array.isArray(linked)?linked:linked?[linked]:[];
    const vals=[];for(const id of ids){const target=await this.row(id);if(!target||target.type_id!==ref.targetTypeId)throw Error('source_unavailable');vals.push(await this.value(target,f.lookup.field,next));}
    let output:any=null;
    if(f.lookup.aggregate==='count')output=vals.length;
    else if(f.lookup.aggregate==='first')output=vals[0]??null;
    else if(f.lookup.aggregate==='join')output=vals.filter(v=>v!==null).join(', ');
    else if(vals.length&&vals.every(v=>typeof v==='number'&&Number.isFinite(v)))output=f.lookup.aggregate==='sum'?vals.reduce((s,v)=>s+v,0):f.lookup.aggregate==='min'?Math.min(...vals):Math.max(...vals);
    checkOutput(f,output);return output;
   }
   return row.data[key]??null;
  })();this.values.set(tag,work);return work;
 }
 async read(row:any,renderers:Record<string,any>={}){
  const {type,fields,policy}=await this.schema(row.type_id);await assertRecordScope(this.db,policy,row.id);const data=projectData(row.data,fields),derived:Record<string,any>={},display:Record<string,any>={};
  for(const f of fields){if(f.computed||f.lookup){try{data[f.key]=await this.value(row,f.key,new Set());derived[f.key]={status:data[f.key]===null?'missing':'current',definitionVersion:type.version};}catch(e){delete data[f.key];derived[f.key]={status:'error',code:(e as Error).message==='source_unavailable'?'source_unavailable':'calculation_failed',definitionVersion:type.version};}}
   const renderer=renderers[f.key]??f.renderer;
   if(renderer?.kind==='code'&&Object.hasOwn(data,f.key)){try{const value=await pureCode(renderer.source??'',{value:data[f.key]});display[f.key]=['string','number','boolean'].includes(typeof value)?{text:String(value)}:displaySchema.parse(value);}catch{display[f.key]={error:'Display unavailable; showing underlying value'};}}
  }
  return {...row,data,derived,display};
 }
}

export function validateRenderer(field:Field,r:any){
 if(['progress','number'].includes(r.kind)&&!['number','money'].includes(field.kind))fail(400,'renderer_type','Numeric displays require numeric fields');
 if(r.kind==='progress'&&(r.max??100)<=(r.min??0))fail(400,'renderer_range','Maximum must exceed minimum');
 if(r.kind==='code'&&!r.source)fail(400,'renderer_source','Custom display code is required');
}

