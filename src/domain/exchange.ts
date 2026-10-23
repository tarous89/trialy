import {requireCurrentAction} from './write-authorization.js';
import {activeProject} from './project-context.js';
import {derived} from '../shared/formulas.js';
import {randomUUID,randomBytes} from 'node:crypto';
import {z} from 'zod';
import {questionsSchema,questionProblem} from '../shared/questions.js';
import {id,fail,viewFields,type Actor} from '../shared/schema.js';
import {access,typeAccess,visibleFields} from './permissions.js';
import {audit,checksum} from './evidence.js';
import type {Connection} from '../db/database.js';
import type {WriteAuthorization} from './write-authorization.js';
export const exchangeSchema=z.object({projectId:id.optional(),kind:z.enum(['form','view']),name:z.string().trim().min(1).max(100),typeId:id,fields:z.array(z.string()).min(1).max(100),questions:questionsSchema.optional(),fileRequest:z.object({label:z.string().trim().min(1).max(200),required:z.boolean(),maxFiles:z.number().int().min(1).max(3)}).optional(),viewId:id.optional(),days:z.number().int().min(1).max(90)}).strict();
export async function exchangeReview(tx:Connection,a:Actor,w:string,input:z.infer<typeof exchangeSchema>){
 if(input.projectId){if(input.kind!=='form')fail(400,'project_form','Project context is supported for response forms');await activeProject(tx,a,w,input.projectId);}
 const p=await access(tx,a,w,true);if(p.role!=='owner')fail(403,'owner_required','Owner required');
 const {type,policy}=await typeAccess(tx,a,w,input.typeId),fields=visibleFields(type.fields,policy,a);
 if(new Set(input.fields).size!==input.fields.length||input.fields.some(k=>!fields.some(f=>f.key===k&&!['document','relationship','person'].includes(f.kind)&&!(input.kind==='form'&&derived(f)))))fail(400,'invalid_field','Choose distinct permitted simple fields');
 if(input.kind==='form'&&fields.some(f=>f.required&&!input.fields.includes(f.key)))fail(400,'required_field','Include every required field');
 const view=input.viewId?(await tx.query('SELECT * FROM saved_views WHERE id=$1 AND workspace_id=$2 AND type_id=$3',[input.viewId,w,input.typeId])).rows[0]:null;
 if(input.kind==='view'&&!view)fail(400,'view_required','Choose a saved view');
 if(view&&viewFields(view.config).some(k=>!fields.some(f=>f.key===k)))fail(403,'view_scope','View uses unavailable fields');
 const selected=fields.filter(f=>input.fields.includes(f.key)),questions=input.kind==='form'?(input.questions??selected.map(f=>({field:f.key,required:f.required,help:''}))):[];
 const problem=input.kind==='form'?questionProblem(questions,selected):null;if(problem)fail(400,'invalid_questions',problem);
 if(input.kind==='view'&&input.fileRequest)fail(400,'read_only','File requests require a response form');
 return {input,typeVersion:type.version,fields:selected,view: view?{id:view.id,version:view.version,config:view.config}:null,questions,publicAccess:'Anyone holding the generated link until expiry or revocation',effect:input.kind==='view'?'Share these selected fields from this LIVE view, including future matching values. No edit permission.':'Collect submissions and requested originals only. Responses enter the shared database only after separate reviewed acceptance.'};
}
export async function createExchange(tx:Connection,a:Actor,w:string,input:z.infer<typeof exchangeSchema>,authorization?:WriteAuthorization){
 requireCurrentAction(a);
 const review=await exchangeReview(tx,a,w,input),p=await access(tx,a,w,true),raw=randomBytes(32).toString('base64url'),linkId=randomUUID();
 await tx.query('INSERT INTO external_links(id,workspace_id,owner_id,token_hash,kind,name,type_id,type_version,fields,view_id,view_version,questions,file_request,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now()+$14*interval \'1 day\')',[linkId,w,a.userId,checksum(raw),input.kind,input.name,input.typeId,review.typeVersion,JSON.stringify(input.fields),review.view?.id??null,review.view?.version??null,JSON.stringify(review.questions),input.fileRequest?JSON.stringify(input.fileRequest):null,input.days]);
 if(input.projectId)await tx.query('UPDATE external_links SET project_id=$1 WHERE id=$2',[input.projectId,linkId]);
 await audit(tx,a,p,'external_link.created',linkId,null,{...review,authorization});return {id:linkId,path:'/collect#'+raw,url:new URL('/collect#'+raw,process.env.PUBLIC_URL??process.env.RENDER_EXTERNAL_URL??'http://localhost:3000').toString()};
}

