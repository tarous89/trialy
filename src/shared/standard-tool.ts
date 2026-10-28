import {z} from 'zod';
export const STANDARD_TEMPLATE='trialy.standard.v1';
/** Meaning is configurable; the component palette and geometry belong to Trialy. */
export function semanticTone(value:unknown):'green'|'blue'|'amber'|'red'{
 const text=String(value).trim().toLowerCase();
 if(/^(no|false)$|declin|reject|blocked|overdue|fail|not shortlisted|cancel|high/.test(text))return 'red';
 if(/^(yes|true)$|signed|selected|shortlisted|engaged|complete|approved|active|ready|done/.test(text))return 'green';
 if(/pending|progress|review|contact|outreach|discussion|agreement sent|hold|potential|medium|discovery|planned|follow.up/.test(text))return 'amber';
 return 'blue';
}
export function standardDefaults(config:any){
 return {...config,tabs:config.tabs.map((tab:any)=>{
  const columns=tab.columns.map((column:any)=>{
   if(!['select','boolean'].includes(column.kind))return column;
   const display=column.display??{};
   return {...column,display:{...display,kind:'badge',tone:display.tone??'neutral',valueTones:Object.fromEntries((column.kind==='boolean'?['true','false']:column.options??[]).map((value:string)=>[value,display.valueTones?.[value]??(display.tone&&display.tone!=='neutral'?display.tone:semanticTone(value))]))}};
  });
  const available=columns.filter((c:any)=>c.visible!==false&&['select','boolean'].includes(c.kind));
  const filters=tab.filterMode==='none'?[]:tab.filters?.length?tab.filters:tab.filterMode==='custom'?[]:[...available.filter((c:any)=>/status|stage|pipeline/i.test(c.field+' '+c.label)),...available.filter((c:any)=>!/status|stage|pipeline/i.test(c.field+' '+c.label))].slice(0,8).map((c:any)=>c.field);
  return {...tab,columns,filters};
 })};
}
export const iconSchema=z.enum(['people','document','checklist','contract']);
export const toneSchema=z.enum(['neutral','green','blue','amber','red']);
export const columnDisplay=z.object({kind:z.enum(['text','badge','number','progress','link']).default('text'),tone:toneSchema.default('neutral'),valueTones:z.record(z.string().max(100),toneSchema).optional(),prefix:z.string().max(30).optional(),suffix:z.string().max(30).optional(),decimals:z.number().int().min(0).max(8).optional(),min:z.number().finite().optional(),max:z.number().finite().optional()}).strict();
export const overviewSchema=z.object({showCounts:z.boolean().default(true),nextSteps:z.array(z.object({tabIndex:z.number().int().min(0).max(7),titleField:z.string(),textField:z.string(),heading:z.string().max(100).default('Next steps')}).strict()).max(8).default([])}).strict();
const value=z.union([z.string().max(50000),z.number().finite(),z.boolean(),z.array(z.union([z.string(),z.number()])).max(100),z.null()]);
const column=z.object({field:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),fieldId:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),label:z.string().max(100),kind:z.enum(['text','number','money','date','boolean','select','relationship','person','document','table','field']),visible:z.boolean(),editable:z.boolean(),multiple:z.boolean(),required:z.boolean(),options:z.array(z.string()).max(100),display:columnDisplay.optional()}).strict();
export const standardConfigSchema=z.object({overview:overviewSchema.optional(),pageSize:z.number().int().min(1).max(25),resourceKind:z.enum(['tracker','form','visualization']),name:z.string().max(100),description:z.string().max(500),tabs:z.array(z.object({name:z.string().max(60),icon:iconSchema.optional(),tableName:z.string(),typeId:z.string().uuid(),visible:z.boolean().optional(),filterMode:z.enum(['auto','custom','none']).optional(),filters:z.array(z.string()).max(8).default([]),columns:z.array(column).min(1).max(30),example:z.record(z.string(),value).optional()}).strict()).min(1).max(8),exampleTypeId:z.string().uuid(),example:z.record(z.string(),value),showExample:z.boolean()}).strict();
export function readStandardConfig(source:string):any|null{
 try{const value=JSON.parse(source);if(value.template===STANDARD_TEMPLATE&&value.config&&Object.keys(value).every(k=>['template','config'].includes(k)))return value.config;}catch{}
 const match=/^const config=([^\n]+);/.exec(source??'');try{return match?JSON.parse(match[1]):null;}catch{return null;}
}
const canonical=(value:any):any=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
export const standardSource=(config:unknown)=>JSON.stringify({template:STANDARD_TEMPLATE,config:canonical({pageSize:25,...(config as object)})});
