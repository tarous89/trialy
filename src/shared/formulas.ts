import {fail,type Field} from './schema.js';
export const derived=(f:Field)=>!!(f.formula||f.computed||f.lookup);
export const dependencies=(f:Field)=>f.formula?.fields??f.computed?.fields??(f.lookup?[f.lookup.reference]:[]);
export function formulaOrder(fields:Field[]):Field[]{
 const done=new Set<string>(),active=new Set<string>(),order:Field[]=[];
 const visit=(f:Field)=>{if(done.has(f.key))return;if(active.has(f.key))fail(400,'formula_cycle','Calculated fields cannot have circular dependencies');active.add(f.key);
  if([f.formula,f.computed,f.lookup].filter(Boolean).length>1)fail(400,'invalid_formula','Choose one calculation definition');
  if(f.multiple&&f.unique)fail(400,'invalid_reference','Multiple references cannot be marked unique');
  if(f.multiple&&['date','boolean'].includes(f.kind))fail(400,'invalid_value','Dates and booleans must be single values');
  if(f.computed||f.lookup){
   if(f.required||f.unique||f.multiple||!['text','number','money','date','boolean'].includes(f.kind))fail(400,'invalid_formula','Derived fields must have a scalar output type and cannot be required or unique');
   for(const key of dependencies(f)){const source=fields.find(s=>s.key===key);if(!source)fail(400,'invalid_formula','Unknown dependency');visit(source);}
   if(f.lookup){const ref=fields.find(s=>s.key===f.lookup!.reference);if(ref?.kind!=='relationship'||!ref.targetTypeId)fail(400,'invalid_lookup','A lookup needs a typed record reference');}
  }
  if(f.formula){if(!['number','money'].includes(f.kind)||f.required||f.unique||f.multiple)fail(400,'invalid_formula','Calculated fields must be optional numeric fields without uniqueness');for(const key of f.formula.fields){const source=fields.find(s=>s.key===key);if(!source||source.computed||source.lookup||source.multiple||!['number','money'].includes(source.kind))fail(400,'invalid_formula','Calculation requires numeric fields from this table');visit(source);}order.push(f);}
  active.delete(f.key);done.add(f.key);
 };fields.forEach(visit);return order;
}
export function calculate(fields:Field[],data:Record<string,any>){
 const result={...data};for(const f of formulaOrder(fields)){const values=f.formula!.fields.map(key=>result[key]);let n:number|null=null;
  if(values.every(v=>typeof v==='number'&&Number.isFinite(v))){const [first,...rest]=values;switch(f.formula!.operator){case 'sum':n=values.reduce((a,b)=>a+b,0);break;case 'product':n=values.reduce((a,b)=>a*b,1);break;case 'difference':n=rest.reduce((a,b)=>a-b,first);break;case 'ratio':n=rest.some(v=>v===0)?null:rest.reduce((a,b)=>a/b,first);}}
  result[f.key]=n!==null&&Number.isFinite(n)?n:null;
 }return result;
}
export const editableData=(fields:Field[],data:Record<string,any>)=>Object.fromEntries(Object.entries(data).filter(([key])=>!fields.some(f=>f.key===key&&derived(f))));

