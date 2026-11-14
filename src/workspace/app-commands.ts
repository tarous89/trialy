import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {access,typeAccess} from '../domain/permissions.js';
import {audit} from '../domain/evidence.js';
import {toolPolicy} from '../domain/effective-access.js';
import {appUrl} from '../shared/app-route.js';
import {fail,failWith,id,type Actor} from '../shared/schema.js';
import {appRoles,outputWriter} from './role-contracts.js';
import type {WorkspaceFoundation} from './service.js';

/**
 * App commands (docs/product/app-template-blueprints/apps/RUNWAY.md §14.3): an app declares the actions a person can take
 * by clicking, and an assistant runs the same action by name. The app's own code runs in the isolated engine as the
 * assistant principal; reads, permissions and column restrictions are unchanged. A propose command returns the same
 * exact records.propose batch a click would create, as a review a person confirms. Nothing commits here.
 *
 * Declaration: one single-line JSON array at the top level of the source, next to templateLayoutSchema:
 *   const appCommands=[{"id":"summary.read","label":"Read the runway summary","mode":"read","input":{...}}];
 * It is read as data and never executed by the host.
 */
export const commandId=z.string().regex(/^[a-z][a-z0-9_]{0,31}(\.[a-z][a-z0-9_]{0,31}){0,3}$/,'Use a lowercase dotted command id such as summary.read');
const schemaKeys=new Set(['type','description','properties','required','additionalProperties','items','enum','minLength','maxLength','minimum','maximum','minItems','maxItems','pattern','format']);
const types=['object','string','number','integer','boolean','array','null'];
/** A small JSON Schema subset; enough to describe form inputs, checked before the app runs. */
function checkSchema(s:any,depth=0):void{
 if(depth>6)throw Error('Input schemas nest at most six levels');
 if(!s||typeof s!=='object'||Array.isArray(s))throw Error('Each input schema is an object');
 for(const k of Object.keys(s))if(!schemaKeys.has(k))throw Error('Unsupported input schema keyword: '+k);
 const t=Array.isArray(s.type)?s.type:s.type===undefined?[]:[s.type];
 if(t.some((x:any)=>!types.includes(x)))throw Error('Unsupported input type');
 if(s.properties){if(typeof s.properties!=='object'||Object.keys(s.properties).length>100)throw Error('At most 100 properties');for(const v of Object.values(s.properties))checkSchema(v,depth+1);}
 if(s.items)checkSchema(s.items,depth+1);
 if(s.required&&(!Array.isArray(s.required)||s.required.some((x:any)=>typeof x!=='string')))throw Error('required lists property names');
 if(s.enum&&(!Array.isArray(s.enum)||s.enum.length>200))throw Error('enum lists at most 200 values');
 if(s.format&&!['date','month','uuid'].includes(s.format))throw Error('Supported formats: date, month, uuid');
}
export const appCommand=z.object({
 id:commandId,label:z.string().trim().min(1).max(100),
 /** read: returns a result and writes nothing. propose: returns the click path's exact change for review. layout: a presentation-only layout review. */
 mode:z.enum(['read','propose','layout']),
 description:z.string().trim().max(400).optional(),
 screen:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/).optional(),
 input:z.record(z.string(),z.unknown()).default({type:'object',properties:{},additionalProperties:false}).superRefine((s,c)=>{try{checkSchema(s);if(s.type!=='object')throw Error('Command input is an object');}catch(e){c.addIssue({code:'custom',message:(e as Error).message});}})
}).strict();
export const appCommands=z.array(appCommand).max(60).refine(v=>new Set(v.map(c=>c.id)).size===v.length,'Declare each command id once');
export type AppCommand=z.infer<typeof appCommand>;
const line=/^const appCommands=(.+);$/m;

/** Commands the current saved source declares. Malformed declarations read as none at runtime; saves are strict. */
export function readAppCommands(source:unknown):AppCommand[]{
 if(typeof source!=='string')return [];
 const m=line.exec(source);if(!m)return [];
 try{return appCommands.parse(JSON.parse(m[1]));}catch{return [];}
}
/** Strict check on every app save: a declaration that is present must be valid. */
export function validateAppCommands(source:unknown){
 if(typeof source!=='string')return;
 const m=line.exec(source);if(!m)return;
 let value:unknown;try{value=JSON.parse(m[1]);}catch{fail(400,'app_commands','appCommands must be a single-line JSON array');}
 const parsed=appCommands.safeParse(value);
 if(!parsed.success)fail(400,'app_commands','Invalid appCommands: '+parsed.error.issues.slice(0,3).map(i=>(i.path.length?i.path.join('.')+': ':'')+i.message).join('; '));
}

/** Validates a command input against its declared schema subset. */
export function checkInput(s:any,v:any,path='input'):void{
 const t:string[]=Array.isArray(s.type)?s.type:s.type?[s.type]:[];
 const kind=v===null?'null':Array.isArray(v)?'array':typeof v==='number'&&Number.isInteger(v)?'integer':typeof v;
 if(t.length&&!t.some(x=>x===kind||x==='number'&&kind==='integer'))fail(400,'command_input',`${path} must be ${t.join(' or ')}`);
 if(s.enum&&!s.enum.some((x:any)=>x===v))fail(400,'command_input',`${path} must be one of ${s.enum.slice(0,20).join(', ')}`);
 if(typeof v==='string'){
  if(s.minLength!==undefined&&v.length<s.minLength)fail(400,'command_input',`${path} is too short`);
  if(s.maxLength!==undefined&&v.length>s.maxLength)fail(400,'command_input',`${path} is too long`);
  if(s.pattern){let re:RegExp;try{re=new RegExp(s.pattern);}catch{fail(400,'command_input','Invalid declared pattern');}if(!re.test(v))fail(400,'command_input',`${path} has an invalid format`);}
  if(s.format==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(v))fail(400,'command_input',`${path} must be a date (YYYY-MM-DD)`);
  if(s.format==='month'&&!/^\d{4}-\d{2}(-01)?$/.test(v))fail(400,'command_input',`${path} must be a month (YYYY-MM)`);
  if(s.format==='uuid'&&!id.safeParse(v).success)fail(400,'command_input',`${path} must be a record ID`);
 }
 if(typeof v==='number'){
  if(!Number.isFinite(v))fail(400,'command_input',`${path} must be a finite number`);
  if(s.minimum!==undefined&&v<s.minimum)fail(400,'command_input',`${path} must be at least ${s.minimum}`);
  if(s.maximum!==undefined&&v>s.maximum)fail(400,'command_input',`${path} must be at most ${s.maximum}`);
 }
 if(Array.isArray(v)){
  if(s.minItems!==undefined&&v.length<s.minItems)fail(400,'command_input',`${path} needs at least ${s.minItems} items`);
  if(s.maxItems!==undefined&&v.length>s.maxItems)fail(400,'command_input',`${path} allows at most ${s.maxItems} items`);
  if(s.items)v.forEach((x,i)=>checkInput(s.items,x,path+'['+i+']'));
 }
 if(kind==='object'){
  for(const k of s.required??[])if(v[k]===undefined)fail(400,'command_input',`${path}.${k} is required`);
  for(const [k,x] of Object.entries(v)){const p=s.properties?.[k];if(!p){if(s.additionalProperties===false)fail(400,'command_input',`${path}.${k} is not an input of this command`);continue;}checkInput(p,x,path+'.'+k);}
 }
}

export const commandsList=z.object({appId:id}).strict();
export const commandRun=z.object({appId:id,expectedVersion:z.number().int().min(0),command:commandId,input:z.record(z.string(),z.unknown()).default({}),requestKey:id}).strict();
const enabled=()=>process.env.APP_COMMANDS_ENABLED==='true';
const RESULT_LIMIT=64000;

async function openApp(f:WorkspaceFoundation,a:Actor,w:string,appId:string){
 const actor={...a,accessToolId:appId};
 const c=await f.component(f.db,actor,w,appId);
 if(c.archived||c.project_archived)fail(409,'app_archived','Restore the app before using its commands');
 if(c.format!=='frontend-js')fail(400,'app_commands_unsupported','This app has no commands');
 const policy=await access(f.db,actor,w);
 const writable=!policy.archived&&policy.role!=='inspector'&&(await toolPolicy(f.db,actor,policy,appId)).grant.write;
 return {c,actor,writable};
}

/** list_app_commands: what the current saved version declares, filtered by what the caller may do. */
export async function listAppCommands(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 if(!enabled())fail(404,'app_commands_disabled','App commands are not enabled in this workspace yet.');
 const v=commandsList.parse(input),{c,writable}=await openApp(f,a,w,v.appId);
 const all=readAppCommands(c.source);
 return {appId:c.id,appName:c.name,version:c.version,writable,
  commands:all.filter(x=>x.mode==='read'||writable),
  hidden:writable?0:all.filter(x=>x.mode!=='read').length,
  howToRun:'run_app_command with this version. Read commands return the app\'s own results. Propose and layout commands return a review; confirm it with confirm_workspace_change only after the user agrees to that exact change.'};
}

/** run_app_command: runs the saved app with {kind:"command"} and returns its result or its exact proposal for review. */
export async function runAppCommand(f:WorkspaceFoundation,a:Actor,w:string,input:unknown,signal?:AbortSignal){
 if(!enabled())fail(404,'app_commands_disabled','App commands are not enabled in this workspace yet.');
 const v=commandRun.parse(input),{c,actor,writable}=await openApp(f,a,w,v.appId);
 if(c.version!==v.expectedVersion)fail(409,'stale_version','The app changed. List its commands again.');
 const command=readAppCommands(c.source).find(x=>x.id===v.command);
 if(!command)fail(404,'unknown_command','This app has no such command. Use list_app_commands.');
 if(command.mode!=='read'&&!writable)fail(403,'command_read_only','You can read this app but not change it. Only its read commands are available.');
 checkInput(command.input,v.input);
 const serialized=JSON.stringify(v.input);if(Buffer.byteLength(serialized)>50000)fail(400,'input_limit','Command input is too large');
 const fingerprint=createHash('sha256').update(JSON.stringify([c.id,c.version,v.command,v.input])).digest('hex');
 // A replayed propose command returns the review it created; nothing is prepared twice.
 if(command.mode!=='read'){
  const saved=(await f.db.query("SELECT result FROM workspace_receipts WHERE workspace_id=$1 AND user_id=$2 AND result->>'commandRequestKey'=$3",[w,a.userId,v.requestKey])).rows[0];
  if(saved){if(saved.result.fingerprint!==fingerprint)fail(409,'request_conflict','This request key was used for a different command or input. Use a new request key.');return {...saved.result.response,requestReused:true};}
 }
 const output=await f.runFrontend(actor,w,{componentId:c.id,expectedVersion:c.version,state:null,event:{kind:'command',action:command.id,value:serialized,form:{}}},signal);
 const reply=output?.state&&typeof output.state==='object'?(output.state as any).command:undefined;
 if(!reply||typeof reply!=='object')fail(502,'command_no_result','The app did not answer this command. It may need an update.');
 let result=reply.result??null;
 if(Buffer.byteLength(JSON.stringify(result))>RESULT_LIMIT)result={truncated:true,message:'The result exceeded the command result limit. Narrow the request (for example a shorter period).'};
 const proposal=output.proposal??null;
 if(command.mode==='read'&&proposal)fail(500,'command_contract','A read command proposed changes; the app must be fixed.');
 const response={appId:c.id,version:c.version,command:command.id,mode:command.mode,ok:reply.ok!==false&&!reply.error,result,...(reply.error?{error:String(reply.error).slice(0,1000)}:{}),
  proposal:proposal?{previewId:proposal.id,digest:proposal.digest,reviewState:proposal.reviewState,summary:proposal.summary??null,changes:proposal.changes??proposal.operation?.changes??null}:null,
  ...(proposal?{nextStep:'Show the user exactly what this review changes. Confirm it with confirm_workspace_change (previewId, digest) only after the user agrees; otherwise leave it unconfirmed.'}:{})};
 const policy=await access(f.db,actor,w);
 await audit(f.db,actor,policy,'app.command',c.id,null,{command:command.id,mode:command.mode,ok:response.ok,proposal:proposal?.id??null});
 if(command.mode!=='read')await f.db.query('INSERT INTO workspace_receipts(id,workspace_id,user_id,digest,result) VALUES($1,$2,$3,$4,$5)',[randomUUID(),w,a.userId,fingerprint,JSON.stringify({commandRequestKey:v.requestKey,fingerprint,response})]);
 return response;
}

/** Writer details for a role this app reads from another app: name, and whether this person may open it (never its ID). */
export async function roleWriterInfo(f:WorkspaceFoundation,a:Actor,w:string,typeId:string,role:string){
 const writer=await outputWriter(f.db,w,typeId,role);
 if(!writer||writer.deleted)return null;
 let canOpen=false;
 if(!writer.archived){try{const {accessToolId:_ignored,...person}=a;await f.component(f.db,{...person,accessToolId:writer.appId},w,writer.appId);canOpen=true;}catch{canOpen=false;}}
 return {appName:writer.name,canOpen,appId:writer.appId};
}

export const openSource=z.object({appId:id,role:z.string().min(1).max(81),recordId:id.optional()}).strict();
/** "Edit in App": where a read-only connected value can be changed. Navigation only; nothing is written. */
export async function resolveAppOpen(f:WorkspaceFoundation,a:Actor,w:string,input:unknown){
 if(!enabled())fail(404,'app_commands_disabled','Opening the source app is not enabled yet.');
 const v=openSource.parse(input),c=await f.component(f.db,{...a,accessToolId:v.appId},w,v.appId);
 const r=(await appRoles(f.db,w,c)).find(x=>x.role===v.role&&x.typeId&&(x.readOnly||x.linked));
 if(!r)fail(404,'not_found','This value is not read from another app');
 const writer=await roleWriterInfo(f,a,w,r.typeId!,r.role);
 if(writer?.canOpen)return {kind:'app',appName:writer.appName,href:appUrl({appId:writer.appId,workspaceId:w,source:'component',route:{path:'/',...(v.recordId?{recordId:v.recordId}:{})}})};
 try{const {accessToolId:_ignored,...person}=a;const t=await typeAccess(f.db,person,w,r.typeId!);return {kind:'database',tableName:t.type.name,href:'/?tab=database&workspaceId='+encodeURIComponent(w)};}
 catch{failWith(403,'open_unavailable','You do not have access to where this value is kept.',{role:r.role,writerAppName:writer?.appName??null});}
}
