import {fail,type Field} from './schema.js';
export function formulaOrder(fields:Field[]):Field[]{
 const done=new Set<string>(),active=new Set<string>(),order:Field[]=[];
 const visit=(f:Field)=>{if(done.has(f.key))return;if(active.has(f.key))fail(400,'formula_cycle','Calculated fields cannot have circular dependencies');active.add(f.key);
  if(f.formula){if(!['number','money'].includes(f.kind)||f.required||f.unique)fail(400,'invalid_formula','Calculated fields must be optional numeric fields without uniqueness');for(const key of f.formula.fields){const source=fields.find(s=>s.key===key);if(!source||!['number','money'].includes(source.kind))fail(400,'invalid_formula','Calculation requires numeric fields from this table');visit(source);}order.push(f);}
  active.delete(f.key);done.add(f.key);
 };fields.forEach(visit);return order;
}
export function calculate(fields:Field[],data:Record<string,any>){
 const result={...data};for(const f of formulaOrder(fields)){const values=f.formula!.fields.map(key=>result[key]);let n:number|null=null;
  if(values.every(v=>typeof v==='number'&&Number.isFinite(v))){const [first,...rest]=values;switch(f.formula!.operator){case 'sum':n=values.reduce((a,b)=>a+b,0);break;case 'product':n=values.reduce((a,b)=>a*b,1);break;case 'difference':n=rest.reduce((a,b)=>a-b,first);break;case 'ratio':n=rest.some(v=>v===0)?null:rest.reduce((a,b)=>a/b,first);}}
  result[f.key]=n!==null&&Number.isFinite(n)?n:null;
 }return result;
}
export const editableData=(fields:Field[],data:Record<string,any>)=>Object.fromEntries(Object.entries(data).filter(([key])=>!fields.find(f=>f.key===key)?.formula));
