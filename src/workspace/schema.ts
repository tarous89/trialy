import {trackerSetup} from './tracker-template.js';
import {resourceKind,resourceManifest} from './resource-contract.js';
import {exchangeSchema} from '../domain/exchange.js';
import {componentRecordChanges} from './frontend.js';
import {z} from 'zod';
import {id,recordWriteSchema,fieldsSchema,newFieldsSchema,dataConceptSchema} from '../shared/schema.js';
const text=z.string().trim().min(1).max(1000);
export const maintenanceSchema=z.object({
 autoWrite:z.boolean().default(false),expiresAt:z.iso.datetime().optional(),
 projectId:id,purpose:text,inclusionCriteria:text,sourcePolicy:text,
 basis:z.enum(['multiple_entries','repeated_actions','tracking','expected_reuse']),
 bindings:z.array(z.object({typeId:id,fields:z.array(z.string().min(1).max(64)).min(1).max(100)}).strict()).min(1).max(100),
 allowCreate:z.boolean(),allowUpdate:z.boolean(),allowIdentityLinks:z.boolean().default(false),
 maxChanges:z.number().int().min(1).max(200).default(50)
}).strict().refine(v=>new Set(v.bindings.map(b=>b.typeId)).size===v.bindings.length,'Duplicate table bindings').refine(v=>!v.autoWrite||(v.bindings.length===1&&!!v.expiresAt),'Longer-term permission requires exactly one data type and an expiry');
export const componentContent=z.object({
 resourceKind:resourceKind.optional(),manifest:resourceManifest.nullable().optional(),
 name:z.string().trim().min(1).max(100),
 sourceAccess:z.enum(['workspace','bindings']).default('workspace'),
 format:z.enum(['text','markdown','json','javascript','html','trialy-ui','frontend-js']),
 source:z.string().max(200000),
 assets:z.array(z.object({name:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),versionId:id}).strict()).max(20).default([]),
 execution:z.array(z.object({name:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),revisionId:id,grantId:id.optional()}).strict()).max(20).default([]),
 bindings:z.array(z.object({typeId:id,fields:z.array(z.string().min(1).max(64)).min(1).max(100)}).strict()).max(100).default([])
}).strict();
export const fieldPairsSchema=z.array(z.object({sourceField:z.string().min(1).max(64),preferredField:z.string().min(1).max(64)}).strict()).min(1).max(100);
const identityLinkSchema=z.object({kind:z.literal('link_identity'),sourceRecordId:id,preferredRecordId:id,sourceVersion:z.number().int().min(0),preferredVersion:z.number().int().min(0),rationale:text}).strict();
export const maintenanceBatch=z.object({
 requestKey:id,scopeId:id,expectedScopeVersion:z.number().int().min(0),
 sourceLabel:text,interpretation:text,
 changes:z.array(recordWriteSchema).max(200).default([]),
 links:z.array(identityLinkSchema).max(50).default([])
}).strict().refine(v=>v.changes.length+v.links.length>0,'Provide changes or identity links');
export const workspaceOperation=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('create_node'),nodeKind:z.enum(['folder','project']),name:z.string().trim().min(1).max(100),description:z.string().trim().max(2000).default(''),parentId:id.nullable().default(null),initialAccess:z.object({expectedVersion:z.number().int().min(0),rules:z.array(z.object({subject:z.union([id,z.literal('chatgpt')]),read:z.boolean(),write:z.boolean()}).strict().refine(v=>v.read||!v.write,{message:'Editing requires viewing'})).max(1000)}).strict().optional()}).strict(),
 z.object({kind:z.literal('move_node'),nodeId:id,expectedVersion:z.number().int().min(0),parentId:id.nullable()}).strict(),
 z.object({kind:z.literal('rename_node'),nodeId:id,expectedVersion:z.number().int().min(0),name:z.string().trim().min(1).max(100),description:z.string().trim().max(2000).optional()}).strict(),
 z.object({kind:z.literal('save_scope'),scope:maintenanceSchema,scopeId:id.optional(),expectedVersion:z.number().int().min(0).optional()}).strict(),
 identityLinkSchema,
 z.object({kind:z.literal('accept_collection_response'),submissionId:id,data:z.record(z.string(),z.union([z.string().max(50000),z.number().finite(),z.boolean(),z.array(z.union([z.string().max(50000),z.number().finite()])).max(100),z.null()]))}).strict(),
 z.object({kind:z.literal('create_collection_link'),config:exchangeSchema}).strict(),
 z.object({kind:z.literal('revoke_collection_link'),linkId:id,reason:text}).strict(),
 z.object({kind:z.literal('setup_tracking'),projectId:id,expectedProjectVersion:z.number().int().min(0),purpose:text,inclusionCriteria:text,sourcePolicy:text,basis:z.enum(['multiple_entries','repeated_actions','tracking','expected_reuse']),table:z.discriminatedUnion('kind',[z.object({kind:z.literal('new'),concept:dataConceptSchema,name:z.string().min(1).max(100),fields:newFieldsSchema}).strict(),z.object({kind:z.literal('existing'),typeId:id,expectedVersion:z.number().int().min(0),fields:z.array(z.string().min(1).max(64)).min(1).max(100)}).strict()]),initialRows:z.array(z.record(z.string(),z.union([z.string().max(50000),z.number().finite(),z.boolean(),z.array(z.union([z.string().max(50000),z.number().finite()])).max(100),z.null()]))).max(200).default([])}).strict(),
 z.object({kind:z.literal('propagate_linked_values'),sourceRecordId:id,sourceVersion:z.number().int().min(0),fields:z.array(z.string().min(1).max(64)).min(1).max(100),targets:z.array(z.object({recordId:id,expectedVersion:z.number().int().min(0),linkId:id,linkKind:z.enum(['same_table','cross_table'])}).strict()).min(1).max(50),reason:text}).strict(),
 z.object({kind:z.literal('save_table_mapping'),sourceTypeId:id,preferredTypeId:id,name:z.string().trim().min(1).max(100),fieldPairs:fieldPairsSchema,rationale:text}).strict(),
 z.object({kind:z.literal('revoke_table_mapping'),mappingId:id,reason:text}).strict(),
 z.object({kind:z.literal('link_cross_table_identity'),sourceRecordId:id,preferredRecordId:id,sourceVersion:z.number().int().min(0),preferredVersion:z.number().int().min(0),mappingId:id.optional(),fieldPairs:fieldPairsSchema.optional(),rationale:text}).strict(),
 z.object({kind:z.literal('unlink_cross_table_identity'),linkId:id,expectedVersion:z.number().int().min(0),reason:text}).strict(),
 z.object({kind:z.literal('unlink_identity'),linkId:id,expectedVersion:z.number().int().min(0),reason:text}).strict(),
 z.object({kind:z.literal('create_automation_template'),report:z.enum(['due','missing']),setup:trackerSetup}).strict(),
 z.object({kind:z.literal('create_tracker'),setup:trackerSetup,content:componentContent}).strict(),
 z.object({kind:z.literal('save_component'),projectId:id.nullable().default(null),componentId:id.optional(),expectedVersion:z.number().int().min(0).optional(),content:componentContent}).strict(),
 z.object({kind:z.literal('move_component'),componentId:id,expectedVersion:z.number().int().min(0),projectId:id.nullable()}).strict(),
 z.object({kind:z.literal('archive_component'),componentId:id,expectedVersion:z.number().int().min(0),archived:z.boolean()}).strict(),
 z.object({kind:z.literal('apply_component_records'),componentId:id,expectedVersion:z.number().int().min(0),changes:componentRecordChanges}).strict(),
 z.object({kind:z.literal('edit_component_record'),componentId:id,expectedVersion:z.number().int().min(0),recordId:id,recordVersion:z.number().int().min(0),field:z.string().min(1).max(64),value:z.union([z.string().max(50000),z.number().finite(),z.boolean(),z.array(z.union([z.string().max(50000),z.number().finite()])).max(100),z.null()])}).strict(),
 z.object({kind:z.literal('set_project_access'),nodeId:id,expectedVersion:z.number().int().min(0),allowedUsers:z.array(id).max(500).nullable(),ai:z.boolean()}).strict(),
 z.object({kind:z.literal('set_component_access'),componentId:id,expectedVersion:z.number().int().min(0),allowedUsers:z.array(id).max(500).nullable(),ai:z.boolean()}).strict(),
 z.object({kind:z.literal('apply_maintenance'),batch:maintenanceBatch}).strict(),
 z.object({kind:z.literal('restore_component'),componentId:id,expectedVersion:z.number().int().min(0),revisionVersion:z.number().int().min(0)}).strict(),
 z.object({kind:z.literal('archive_node'),nodeId:id,expectedVersion:z.number().int().min(0),archived:z.boolean(),reason:z.string().trim().min(1).max(1000)}).strict(),
 z.object({kind:z.literal('link_project_records'),projectId:id,expectedProjectVersion:z.number().int().min(0),records:z.array(z.object({recordId:id,expectedVersion:z.number().int().min(0)}).strict()).min(1).max(200),reason:text}).strict(),
 z.object({kind:z.literal('unlink_project_record'),linkId:id,expectedVersion:z.number().int().min(0),reason:text}).strict(),
 z.object({kind:z.literal('record_fact'),recordId:id,expectedVersion:z.number().int().min(0),field:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),value:z.union([z.string().max(50000),z.number().finite(),z.boolean(),z.array(z.union([z.string().max(50000),z.number().finite()])).max(100),z.null()]),projectId:id.optional(),validFrom:z.string().datetime().optional(),validUntil:z.string().datetime().optional(),sourceLabel:text,rationale:text}).strict(),
 z.object({kind:z.literal('prefer_record_fact'),factId:id,expectedVersion:z.number().int().min(0),reason:text}).strict(),
 z.object({kind:z.literal('retract_record_fact'),factId:id,reason:text}).strict(),
 z.object({kind:z.literal('copy_component'),sourceComponentId:id,expectedVersion:z.number().int().min(0),projectId:id,name:z.string().trim().min(1).max(100)}).strict()
]);
export type WorkspaceOperation=z.infer<typeof workspaceOperation>;


