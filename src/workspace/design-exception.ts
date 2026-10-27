import {z} from 'zod';
import {fail} from '../shared/schema.js';

// Only capabilities absent from the standard renderer belong here. Domain names,
// additional fields, styling, filters and calculations are never exceptions.
export const designExceptionSchema=z.object({
 capability:z.enum(['interactive_timeline','calendar','dependency_graph']),
 userRequirement:z.string().trim().min(20).max(1000),
 whyStandardInsufficient:z.string().trim().min(20).max(1000),
 fieldIds:z.array(z.string().min(1).max(64)).min(1).max(20)
}).strict();
export function validateDesignException(exception:z.infer<typeof designExceptionSchema>|undefined,content:any){
 if(!exception)fail(400,'design_exception_required','Use the default Vivid template. A custom design requires a structured designException identifying an unsupported interaction, the actual user requirement and its bound fields. A reason alone cannot unlock custom code.');
 const fields=exception.fieldIds.map(id=>content.manifest?.fields.find((f:any)=>f.id===id));
 if(new Set(exception.fieldIds).size!==exception.fieldIds.length||fields.some(f=>!f))fail(400,'design_exception_fields','Every exception field must be a distinct declared data binding');
 const dates=fields.filter(f=>f.kind==='date').length;
 const suitable=exception.capability==='interactive_timeline'?dates>=2:exception.capability==='calendar'?dates>=1:fields.some(f=>f.kind==='relationship');
 if(!suitable)fail(400,'design_exception_capability','The declared data does not support the required interaction. Use the standard template or supply the actual required date/relationship bindings.');
}
