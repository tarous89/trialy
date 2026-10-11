// Run-scoped facade over the reusable data/query/document foundation.
import type {DataService} from '../domain/data-service.js';
import {recordQuerySchema,id,fail,type Actor} from '../shared/schema.js';
import {z} from 'zod';
import type {Scope} from './schema.js';
export const dataInputSchemas:Record<string,z.ZodType>={
 'tables.list':z.object({}).strict(),'views.list':z.object({}).strict(),
 'records.read':recordQuerySchema.extend({typeId:id}).strict(),
 'records.aggregate':recordQuerySchema.extend({typeId:id,groupBy:z.string().max(64).optional(),metric:z.string().max(64).optional()}).strict(),
 'documents.list':z.object({}).strict(),'documents.text':z.object({versionId:id,offset:z.number().int().min(0).optional()}).strict(),
 'documents.search':z.object({query:z.string().min(1).max(500)}).strict()
};
export class DataCapabilities {
 constructor(private service:DataService,private actor:Actor,private workspaceId:string,private scope:Scope){}
 private table(value:unknown){const t=id.parse(value);if(!this.scope.typeIds.includes(t))fail(403,'capability_denied','Table outside declared scope');return t;}
 async invoke(name:string,input:unknown):Promise<unknown>{
  const s=this.service,a=this.actor,w=this.workspaceId;
  if(name==='tables.list')return (await s.types(a,w)).filter(t=>this.scope.typeIds.includes(t.id));
  if(name==='views.list')return (await s.views(a,w)).filter(v=>this.scope.typeIds.includes(v.type_id));
  if(name==='records.read'){const p=recordQuerySchema.extend({typeId:id}).strict().parse(input);return s.records(a,w,this.table(p.typeId),p);}
  if(name==='records.aggregate'){const p=recordQuerySchema.extend({typeId:id,groupBy:z.string().max(64).optional(),metric:z.string().max(64).optional()}).strict().parse(input);return s.aggregate(a,w,this.table(p.typeId),p);}
  if(name.startsWith('documents.')){
   if(!this.scope.documents)fail(403,'capability_denied','Documents outside declared scope');
   if(name==='documents.list')return s.documents(a,w);
   if(name==='documents.text'){const p=z.object({versionId:id,offset:z.number().int().min(0).optional()}).strict().parse(input);return s.documentText(a,w,p.versionId,p.offset);}
   if(name==='documents.search'){const p=z.object({query:z.string().min(1).max(500)}).strict().parse(input);return s.search(a,w,p.query);}
  }
  fail(400,'unknown_tool','Unknown data capability');
 }
}
