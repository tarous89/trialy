import {requireWorkflow} from '../domain/effective-access.js';
import {nextDaily} from '../shared/schedules.js';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Database} from '../db/database.js';
import {type Actor,recordWriteSchema,fail,type Operation} from '../shared/schema.js';
import {Service,checksum} from '../domain/service.js';
import {Foundation} from './service.js';
import {DataCapabilities,dataInputSchemas} from './data.js';
import {ToolGateway} from './tools.js';
import {execute,RUNTIME} from './runtime.js';
import {programSchema,scopeSchema,checkContract,capabilityNames,schemaChangeSchema} from './schema.js';
const J=JSON.stringify;
export async function dispatchSchedules(db:Database){
 return db.transaction(async tx=>{
  const row=(await tx.query('SELECT * FROM foundation_schedules WHERE NOT paused AND next_at<=now() ORDER BY next_at FOR UPDATE SKIP LOCKED LIMIT 1')).rows[0];if(!row)return false;
  const f=new Foundation({query:tx.query.bind(tx),transaction:fn=>fn(tx),close:async()=>{}}),a:Actor={userId:row.user_id,origin:'ai'};
  // Permission failures pause only this schedule. Never broaden its authority or code revision.
  await tx.query('SAVEPOINT schedule_dispatch');
  try{
   await f.checkComponent(a,row.workspace_id,row.component_context,row.revision_id,row.grant_id);
   const revision=await f.revision(a,row.workspace_id,row.revision_id);await requireWorkflow(tx,a,row.workspace_id,revision.function_id,true);if(revision.runtime!==RUNTIME)throw new Error('Runtime unavailable');
   if(row.grant_id){const grant=(await f.grants(a,row.workspace_id)).find(g=>g.id===row.grant_id);if(!grant||grant.authorization_version!==1||new Date(grant.expires_at).getTime()<=Date.now()||grant.revoked_at||!grant.future)throw new Error('Grant unavailable');}
   const active=(await tx.query("SELECT id FROM foundation_runs WHERE schedule_id=$1 AND status IN ('queued','running') LIMIT 1",[row.id])).rows.length;
   let eligible=true,cursor=row.event_cursor;
   if(row.trigger?.kind==='event'){
    const events=(await tx.query('SELECT event_sequence,action,source_run_id FROM audit_events WHERE workspace_id=$1 AND event_sequence>$2 ORDER BY event_sequence LIMIT 200',[row.workspace_id,row.event_cursor])).rows;
    eligible=events.some(e=>!e.source_run_id&&(row.trigger.event==='records.changed'?e.action.startsWith('record.'):e.action==='document.saved'));cursor=events.at(-1)?.event_sequence??cursor;
   }
   if(!active&&eligible)await f.enqueue(a,row.workspace_id,{source:revision.body.source,scope:revision.body.scope,toolCatalog:revision.body.toolCatalog,dependencies:revision.body.dependencies,input:row.input},randomUUID(),revision.id,row.id,row.grant_id,row.component_context??undefined);
   const next=row.trigger?.kind==='daily'?nextDaily(row.trigger,new Date()):new Date(Date.now()+(row.trigger?.kind==='event'?60:row.interval_minutes*60)*1000);
   await tx.query('UPDATE foundation_schedules SET next_at=$2,event_cursor=$3 WHERE id=$1',[row.id,next,active?row.event_cursor:cursor]);
   await tx.query('RELEASE SAVEPOINT schedule_dispatch');
  }catch{await tx.query('ROLLBACK TO SAVEPOINT schedule_dispatch');await tx.query('UPDATE foundation_schedules SET paused=true WHERE id=$1',[row.id]);}
  return true;
 });
}
export async function runFoundation(db:Database){
 const f=new Foundation(db);
 // A crash after computation or a lost response cannot duplicate a committed write.
 const pending=(await db.query("SELECT r.* FROM foundation_runs r LEFT JOIN foundation_receipts c ON c.id=r.id WHERE r.status='succeeded' AND r.grant_id IS NOT NULL AND r.proposal IS NOT NULL AND r.diagnostic IS NULL AND r.expires_at>now() AND c.id IS NULL ORDER BY r.created_at LIMIT 1")).rows[0];
 if(pending){try{await f.commit({userId:pending.user_id,origin:'ai'},pending.workspace_id,pending.id,pending.proposal_digest,pending.grant_id);}catch{await db.query("UPDATE foundation_runs SET diagnostic='automatic_commit_unavailable' WHERE id=$1",[pending.id]);}return true;}
 const token=randomUUID();const row=await db.transaction(async tx=>{
  const r=(await tx.query("SELECT * FROM foundation_runs WHERE NOT cancel_requested AND expires_at>now() AND (status='queued' OR (status='running' AND lease_until<now())) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1")).rows[0];if(!r)return null;
  if(r.attempts>=2){await tx.query("UPDATE foundation_runs SET status='failed',diagnostic='attempt_limit',finished_at=now() WHERE id=$1",[r.id]);return null;}
  await tx.query("UPDATE foundation_runs SET status='running',attempts=attempts+1,lease_token=$2,lease_until=now()+interval '30 seconds' WHERE id=$1",[r.id,token]);return r;
 });if(!row)return false;
 const actor:Actor={userId:row.user_id,origin:'ai'},controller=new AbortController();let checking=false;
 const poll=setInterval(()=>{if(checking)return;checking=true;void db.query('SELECT status,lease_token,cancel_requested FROM foundation_runs WHERE id=$1',[row.id]).then(({rows})=>{const r=rows[0];if(!r||r.status!=='running'||r.lease_token!==token||r.cancel_requested)controller.abort();}).catch(()=>controller.abort()).finally(()=>{checking=false;});},250);
 try{
  const program=programSchema.parse(row.program);await f.checkComponent(actor,row.workspace_id,row.component_context,row.revision_id,row.grant_id);await f.validateScope(actor,row.workspace_id,program.scope);const before=await f.stamps(actor,row.workspace_id);
  if(row.revision_id){const revision=await f.revision(actor,row.workspace_id,row.revision_id);await requireWorkflow(db,actor,row.workspace_id,revision.function_id,true);if(revision.runtime!==RUNTIME||revision.body.toolCatalog!==program.toolCatalog||revision.body.source!==program.source||J(scopeSchema.parse(revision.body.scope))!==J(program.scope))throw new Error('revision_mismatch');checkContract(revision.body.inputContract,program.input);}
  const changes:Operation[]=[];
  const gateway=new ToolGateway(new Set(program.scope.capabilities),async()=>{
   if(controller.signal.aborted)throw new Error('cancelled');await f.checkComponent(actor,row.workspace_id,row.component_context,row.revision_id,row.grant_id);await f.validateScope(actor,row.workspace_id,program.scope);
   if((await f.stamps(actor,row.workspace_id)).access!==before.access)throw new Error('access_changed');
   if(row.grant_id){const g=(await f.grants(actor,row.workspace_id)).find(g=>g.id===row.grant_id);if(!g||g.authorization_version!==1||new Date(g.expires_at).getTime()<=Date.now()||g.revoked_at||(!g.future&&g.used_at)||g.revision_id!==row.revision_id)throw new Error('grant_unavailable');}
  });
  const data=new DataCapabilities(f.data,actor,row.workspace_id,program.scope);
  for(const name of capabilityNames.filter(n=>n!=='changes.propose'&&n!=='schema.propose'&&n!=='test.echo'))gateway.register({name,version:'1',effect:'read',description:`Permission-filtered ${name}`,input:dataInputSchemas[name],invoke:input=>data.invoke(name,input)});
  gateway.register({name:'test.echo',version:'1',effect:'read',description:'Synthetic JSON echo; no external provider or credentials',input:z.unknown(),invoke:async input=>input});
  gateway.register({name:'changes.propose',version:'1',effect:'proposal',description:'Collect exact record changes; no writes until confirmation or matching standing grant',input:z.array(recordWriteSchema).min(1).max(200),invoke:async proposed=>{
   if(changes.length+proposed.length>200)fail(413,'change_limit','Too many changes');
   for(const change of proposed){const t=change.kind==='create_record'?change.typeId:(await db.query('SELECT type_id FROM records WHERE workspace_id=$1 AND id=$2',[row.workspace_id,change.recordId])).rows[0]?.type_id;if(!program.scope.typeIds.includes(t))fail(403,'capability_denied','Change outside declared tables');}
   const preview=await f.data.preview(actor,row.workspace_id,{kind:'bulk_records',changes:proposed});await f.data.discard(actor,preview.id);
   if(J([...changes,...proposed]).length>1024*1024)fail(413,'proposal_limit','Proposed changes exceed 1 MiB');changes.push(...proposed);return {proposed:proposed.length,saved:false};
  }});
  gateway.register({name:'schema.propose',version:'1',effect:'proposal',description:'Propose a table/schema/view change for explicit confirmation; never covered by a record-write grant',input:schemaChangeSchema,invoke:async operation=>{
   if(changes.length>=200||J([...changes,operation]).length>1024*1024)fail(413,'proposal_limit','Proposal limit exceeded');
   if('typeId' in operation&&!program.scope.typeIds.includes(operation.typeId))fail(403,'capability_denied','Table outside declared scope');
   const preview=await f.data.preview(actor,row.workspace_id,operation);await f.data.discard(actor,preview.id);changes.push(operation);return {proposed:1,saved:false};
  }});
  const result=await execute(program.source,program.input,(name,input)=>gateway.call(name,input),controller.signal);
  if(row.revision_id){const revision=await f.revision(actor,row.workspace_id,row.revision_id);await requireWorkflow(db,actor,row.workspace_id,revision.function_id,true);checkContract(revision.body.outputContract,result);}
  await f.checkComponent(actor,row.workspace_id,row.component_context,row.revision_id,row.grant_id);
  const after=await f.stamps(actor,row.workspace_id);if(after.data!==before.data||after.access!==before.access)throw new Error('data_changed');
  const digest=changes.length?checksum(J({runId:row.id,sourceDigest:row.source_digest,changes,stamp:before})):null;
  await db.query("UPDATE foundation_runs SET status='succeeded',result=$3,proposal=$4,proposal_digest=$5,data_stamp=$6,access_stamp=$7,finished_at=now(),lease_until=NULL WHERE id=$1 AND lease_token=$2 AND status='running' AND NOT cancel_requested",[row.id,token,J(result),changes.length?J(changes):null,digest,before.data,before.access]);
 }catch(e){const allowed=['execution_timeout','execution_failed','execution_interrupted','output_limit','capability_limit','contract_mismatch','data_changed','access_changed','grant_unavailable'];const diagnostic=e instanceof Error&&allowed.includes(e.message)?e.message:'execution_unavailable';await db.query("UPDATE foundation_runs SET status='failed',diagnostic=$3,finished_at=now(),lease_until=NULL WHERE id=$1 AND lease_token=$2 AND status='running'",[row.id,token,diagnostic]);}
 finally{clearInterval(poll);controller.abort();}
 return true;
}
export async function foundationMaintenance(db:Database){await db.query('DELETE FROM foundation_previews WHERE expires_at<now()');await db.query("DELETE FROM foundation_runs WHERE expires_at<now() AND (status<>'running' OR lease_until<now())");}

