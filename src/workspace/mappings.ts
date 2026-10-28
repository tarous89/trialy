import {randomUUID} from 'node:crypto';
import type {Connection} from '../db/database.js';
import {access,typeAccess,visibleFields} from '../domain/permissions.js';
import {audit,revision,checksum} from '../domain/evidence.js';
import type {WriteAuthorization} from '../domain/write-authorization.js';
import {fail,type Actor,type Field} from '../shared/schema.js';
import type {WorkspaceOperation} from './schema.js';
const J=JSON.stringify;
type Pair={sourceField:string;preferredField:string};
type MappingOperation=Extract<WorkspaceOperation,{kind:'save_table_mapping'|'revoke_table_mapping'}>;
export const mappingStamp=(sourceId:string,source:Field[],preferredId:string,preferred:Field[],sourceConcept?:string|null,preferredConcept?:string|null)=>checksum(J(sourceConcept||preferredConcept?[sourceId,source,preferredId,preferred,sourceConcept??null,preferredConcept??null]:[sourceId,source,preferredId,preferred]));
export function validatePairs(pairs:Pair[],source:Field[],preferred:Field[]){
 if(!pairs.length)fail(400,'mapping_fields','Provide field pairs or a reviewed mapping');
 if(new Set(pairs.map(v=>v.sourceField)).size!==pairs.length||new Set(pairs.map(v=>v.preferredField)).size!==pairs.length)fail(400,'mapping_duplicate','Map each field at most once');
 for(const pair of pairs){const s=source.find(f=>f.key===pair.sourceField),t=preferred.find(f=>f.key===pair.preferredField);
  if(!s||!t||s.kind!==t.kind||s.formula||t.formula||s.targetTypeId!==t.targetTypeId)fail(400,'mapping_fields','Choose compatible visible fields; computed fields and relationship retargeting are not supported');
 }
}
export class TableMappings {
 constructor(private db:Connection){}
 private async tables(a:Actor,w:string,sourceId:string,preferredId:string,write=false){
  const source=await typeAccess(this.db,a,w,sourceId,write),preferred=await typeAccess(this.db,a,w,preferredId,write);
  for(const t of [source,preferred])if(visibleFields(t.type.fields,t.policy,a).length!==t.type.fields.length)fail(403,'mapping_scope','Mapping decisions require access to all fields of both tables');
  return {source:source.type,preferred:preferred.type,schemaStamp:mappingStamp(sourceId,source.type.fields,preferredId,preferred.type.fields,source.type.concept,preferred.type.concept)};
 }
 private async row(w:string,mappingId:string){
  const m=(await this.db.query('SELECT m.*,r.created_at AS revoked_at,r.actor_id AS revoked_by,r.reason AS revocation_reason,r."authorization" AS revocation_authorization FROM table_mappings m LEFT JOIN table_mapping_revocations r ON r.mapping_id=m.id WHERE m.workspace_id=$1 AND m.id=$2',[w,mappingId])).rows[0];
  if(!m)fail(404,'not_found','Table mapping not found');return m;
 }
 async review(a:Actor,w:string,op:MappingOperation){
  const old=op.kind==='revoke_table_mapping'?await this.row(w,op.mappingId):null;
  if(old?.revoked_at)fail(409,'mapping_revoked','Mapping already revoked');
  const sourceId=op.kind==='save_table_mapping'?op.sourceTypeId:old.source_type_id,preferredId=op.kind==='save_table_mapping'?op.preferredTypeId:old.preferred_type_id;
  const {source,preferred,schemaStamp}=await this.tables(a,w,sourceId,preferredId,true);
  if(source.id===preferred.id)fail(400,'mapping_type','Choose two different tables');
  const pairs=op.kind==='save_table_mapping'?op.fieldPairs:old.field_pairs;
  if(op.kind==='save_table_mapping')validatePairs(pairs,source.fields,preferred.fields);
  return {mappingId:old?.id??null,name:op.kind==='save_table_mapping'?op.name:old.name,source:{id:source.id,name:source.name,version:source.version,fields:source.fields},preferred:{id:preferred.id,name:preferred.name,version:preferred.version,fields:preferred.fields},fieldPairs:pairs,schemaStamp,effect:op.kind==='save_table_mapping'?'Save reusable field correspondence only. Each record identity claim still requires human approval.':'Stop future reuse. Existing reviewed links and their original evidence remain unchanged.'};
 }
 async resolve(a:Actor,w:string,mappingId:string,sourceTypeId:string,preferredTypeId:string){
  const m=await this.row(w,mappingId),current=await this.tables(a,w,m.source_type_id,m.preferred_type_id,true);
  if(m.revoked_at)fail(409,'mapping_revoked','Mapping is revoked; choose or prepare a new mapping');
  if(m.source_type_id!==sourceTypeId||m.preferred_type_id!==preferredTypeId)fail(400,'mapping_type','Mapping direction must match the two record types');
  if(m.schema_stamp!==current.schemaStamp)fail(409,'mapping_schema_changed','Table structure changed; review a new mapping before reuse');
  validatePairs(m.field_pairs,current.source.fields,current.preferred.fields);return m;
 }
 async list(a:Actor,w:string,offset=0){
  // Check workspace access even when no mappings exist.
  await access(this.db,a,w);
  const rows=(await this.db.query('SELECT id FROM table_mappings WHERE workspace_id=$1 ORDER BY created_at,id LIMIT 26 OFFSET $2',[w,offset])).rows,mappings=[];
  for(const {id} of rows.slice(0,25)){
   const m=await this.row(w,id);let current;
   try{current=await this.tables(a,w,m.source_type_id,m.preferred_type_id);}catch(e){if([403,404].includes((e as any).status))continue;throw e;}
   mappings.push({...m,sourceName:current.source.name,preferredName:current.preferred.name,schemaChanged:m.schema_stamp!==current.schemaStamp,usable:!m.revoked_at&&m.schema_stamp===current.schemaStamp});
  }
  return {mappings,nextOffset:rows.length>25?offset+25:null};
 }
 async apply(a:Actor,w:string,policy:any,op:MappingOperation,authorization?:WriteAuthorization){
  const review=await this.review(a,w,op),id=op.kind==='save_table_mapping'?randomUUID():op.mappingId;
  if(op.kind==='save_table_mapping')await this.db.query('INSERT INTO table_mappings(id,workspace_id,source_type_id,preferred_type_id,name,field_pairs,schema_stamp,rationale,created_by,"authorization") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,w,op.sourceTypeId,op.preferredTypeId,op.name,J(op.fieldPairs),review.schemaStamp,op.rationale,a.userId,J(authorization)]);
  else await this.db.query('INSERT INTO table_mapping_revocations(mapping_id,workspace_id,actor_id,reason,"authorization") VALUES($1,$2,$3,$4,$5)',[id,w,a.userId,op.reason,J(authorization)]);
  const snapshot={...review,active:op.kind==='save_table_mapping',authorization};await revision(this.db,a,w,id,'table_mapping',op.kind==='save_table_mapping'?0:1,snapshot);await audit(this.db,a,policy,'workspace.'+op.kind,id,null,snapshot,op.kind==='save_table_mapping'?op.rationale:op.reason);
  return {workspaceId:w,workspaceFoundation:true,status:'saved',id};
 }
}
