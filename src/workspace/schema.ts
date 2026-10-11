import {z} from 'zod';
import {id,recordWriteSchema} from '../shared/schema.js';
const text=z.string().trim().min(1).max(1000);
export const maintenanceSchema=z.object({
 projectId:id,purpose:text,inclusionCriteria:text,sourcePolicy:text,
 basis:z.enum(['multiple_entries','repeated_actions','tracking','expected_reuse']),
 bindings:z.array(z.object({typeId:id,fields:z.array(z.string().min(1).max(64)).min(1).max(100)}).strict()).min(1).max(100),
 allowCreate:z.boolean(),allowUpdate:z.boolean(),allowIdentityLinks:z.boolean().default(false),
 maxChanges:z.number().int().min(1).max(200).default(50)
}).strict().refine(v=>new Set(v.bindings.map(b=>b.typeId)).size===v.bindings.length,'Duplicate table bindings');
export const workspaceOperation=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('create_node'),nodeKind:z.enum(['folder','project']),name:z.string().trim().min(1).max(100),parentId:id.nullable().default(null)}).strict(),
 z.object({kind:z.literal('move_node'),nodeId:id,expectedVersion:z.number().int().min(0),parentId:id.nullable()}).strict(),
 z.object({kind:z.literal('rename_node'),nodeId:id,expectedVersion:z.number().int().min(0),name:z.string().trim().min(1).max(100)}).strict(),
 z.object({kind:z.literal('save_scope'),scope:maintenanceSchema,scopeId:id.optional(),expectedVersion:z.number().int().min(0).optional()}).strict(),
 z.object({kind:z.literal('link_identity'),sourceRecordId:id,preferredRecordId:id,sourceVersion:z.number().int().min(0),preferredVersion:z.number().int().min(0),rationale:text}).strict(),
 z.object({kind:z.literal('unlink_identity'),linkId:id,expectedVersion:z.number().int().min(0),reason:text}).strict()
]);
export const maintenanceBatch=z.object({
 requestKey:id,scopeId:id,expectedScopeVersion:z.number().int().min(0),
 sourceLabel:text,interpretation:text,
 changes:z.array(recordWriteSchema).max(200).default([]),
 links:z.array(workspaceOperation.options[4]).max(50).default([])
}).strict().refine(v=>v.changes.length+v.links.length>0,'Provide changes or identity links');
export type WorkspaceOperation=z.infer<typeof workspaceOperation>;
