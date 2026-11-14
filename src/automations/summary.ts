import {z} from 'zod';
import type {Database} from '../db/database.js';
import {fail,type Actor} from '../shared/schema.js';
export const summaryBinding=z.object({binding:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),revisionId:z.uuid()}).strict();
export const summaryOutput=z.object({nonEmpty:z.boolean(),subject:z.string().trim().min(1).max(200).optional(),text:z.string().max(20000)}).strict().refine(v=>!v.nonEmpty||v.text.trim().length>0,'A nonempty summary needs content');
/** Summary code is immutable, explicitly bound and read-only in the existing isolated runtime. */
export async function validateSummary(db:Database,a:Actor,w:string,c:any,summary:z.infer<typeof summaryBinding>){
 const binding=c.execution.find((b:any)=>b.name===summary.binding);
 if(!binding||binding.revisionId!==summary.revisionId||binding.grantId)fail(403,'summary_binding','Review a read-only summary binding for this app');
 const {Foundation}=await import('../foundation/service.js');
 const f=new Foundation(db),revision=await f.revision(a,w,summary.revisionId),scope=revision.body.scope;
 if(scope.documents||scope.capabilities.some((x:string)=>!['tables.list','entities.read','entities.search','entities.facts','records.read','records.aggregate','views.list','test.echo'].includes(x)))fail(403,'summary_scope','Summary functions can only read approved app data');
 await f.checkComponent(a,w,{id:c.id,version:c.version,binding:binding.name},binding.revisionId);
 return binding;
}
