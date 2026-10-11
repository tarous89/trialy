# Shared records, contextual facts and reviewed backfill

Implemented checkpoint: migration 025. ChatGPT determines meaning and proposes interpretations; Trialy enforces current access, schema, versions and human approval. No fixed clinical workflow, entity-matching rulebook or automatic conversation capture is introduced.

## Shared project references

`link_project_records` associates up to 200 existing active records with a stable platform project ID. The preview lists the exact record IDs and versions and destination. There is no duplicate data table. Reads resolve the current shared values under both project and record access. `unlink_project_record` records a reversible association change without deleting the record or other project links; a later reviewed link can restore the association. Both actions have immutable revisions/audit linked to their approval. Adding project membership does not grant access to the underlying table or fields. Archived projects cannot receive link changes. Linked entries are protected from simplistic creation archival.

`list_project_records` provides paginated access; the shared web/embed Projects view has a separate Shared records and sources page. The existing conservative organization access policy remains: granular partial-workspace organization is not yet complete.

## Candidate field values

`record_fact` preserves a candidate value for an existing editable field, together with a supplied source label, rationale, original record version, optional project context and optional validity dates. Candidate values and authorizations are immutable. They do not change the main record. Labels describe supplied evidence; they are not independently verified source citations or original-file links.

`list_record_facts` returns current values, visible candidates and withdrawal history. Current field and contextual-project access is enforced every time. `entities.facts` provides the same read capability to code with the relevant declared table capability.

`prefer_record_fact` previews a global, undated candidate as the main value using the ordinary field-change/approval pipeline. Original data history and all alternatives remain intact. Dated or project-specific claims cannot be silently promoted into a global current value; an explicit separate correction is required if that interpretation is intended. Preference applies to the named record, not an automatic merge across every identity alias.

`retract_record_fact` preserves the candidate and adds an immutable withdrawal record. Withdrawal does not silently reverse a prior main-value edit; the existing field-history reversal/correction flow handles that separately. The project sources page exposes candidate review, preference, withdrawal and authorization history.

## Reviewed backfill

After the user approves the table/column and renews the relevant task scope, ChatGPT can read permitted existing records and source material and submit `prepare_record_backfill`. It accepts only updates to existing records, within that scope, and only into currently absent/null/empty fields. It never creates a schema, new record, identity link or overwrite of an existing non-empty value. It always prepares human review even when a valid standing write permission exists. All changes are validated again at confirmation and committed atomically with field history and source observations.

This is a tool for ChatGPT-directed extraction and review, not an autonomous source crawler. ChatGPT must supply the proposed values, concise source labels and interpretation. No model-provider account or background LLM integration is required.

## Remaining boundaries

Cross-table semantic mapping, automatic interpretation of history, per-alias preferred-value propagation, original-file citations, generalized contextual relationship queries and richer partial-data sharing remain future work. Existing same-table identity links and these candidate facts are complementary primitives. Browser/ChatGPT interaction acceptance remains pending.

## Reviewed cross-table identity claims

Migration 026 adds `link_cross_table_identity` and `unlink_cross_table_identity` through the existing workspace preview/confirmation path. ChatGPT proposes the two records, their current versions, explicit `fieldPairs` (`sourceField` / `preferredField`) and a rationale. Each pair describes semantic correspondence; it is not a conversion or a matching rule. Fields must have compatible kinds, cannot be computed, and relationship targets cannot change. The identity claim applies to this record pair only, not all future records in either table. Reusable mappings can now supply its field correspondence, as described below.

Every link and withdrawal requires human confirmation. Existing single-table maintenance grants cannot authorize these operations. The preview includes both original records, mappings and schema fingerprints; confirmation rejects changed records, schemas or permissions. This adds an audited identity claim without rewriting any record field, changing any relationship or transferring execution authority. Audit/revision evidence and the link retain the exact approval. Withdrawal preserves originals and previous evidence, including who withdrew the claim, why and with which approval.

`list_cross_table_links` and the project record's **Connections across tables** page show direct links, mapped comparisons, original values and withdrawals. Both endpoints require full current field access to both records; inaccessible counterpart links are omitted. Changed table definitions suspend comparisons until a new mapping is reviewed (withdraw the old link and propose its replacement). No transitive group or automatically resolved canonical value is inferred. Existing same-table `entities.read` stays within its existing scope and does not follow these links.

The new table is included in workspace exports, runtime-role provisioning and synthetic restore verification. Active links prevent treating a linked record as an unused reversible creation.

Still pending: contextual relationship traversal, per-alias reviewed value propagation and exact document/source citations. Users can already propose explicit ordinary field corrections, but cross-table linking itself never copies values. The live ChatGPT/browser interaction remains to be tested.

## Reusable table mappings

Migration 027 adds immutable `table_mappings`, append-only `table_mapping_revocations` and an optional mapping reference on cross-table links. ChatGPT proposes `save_table_mapping` with a name, source/preferred table IDs, field pairs and rationale. Human approval saves the exact correspondence and the current table definitions. This is a field correspondence, not an identity matching algorithm or future write permission.

Use `list_table_mappings` to inspect authorized definitions and their current status, then pass a usable `mappingId` to `link_cross_table_identity` with the two record versions and row-specific rationale. `fieldPairs` may be omitted when reusing a mapping. Both table direction and current schema fingerprints must match. Every proposed record link still gets its own preview, human approval and approval reference. One-type standing grants cannot approve mapping creation, revocation or cross-table links.

The **Reusable field mappings** screen in Projects lists definitions and opens their fields, approval and revocation history on a separate page. `revoke_table_mapping` uses the same review/confirmation path. Revocation prevents future reuse, including pending link previews, without changing previously accepted links or records. To correct a mapping, approve a new definition and revoke the old one; history is never edited in place. A schema change blocks reuse until a new mapping is reviewed. Existing pair-specific links retain their mapping snapshot and continue to be independently withdrawable.

Reads and approvals check current access to both tables and all their fields. Hidden counterpart tables/fields hide the mapping; stale mapping/schema previews cannot be confirmed. Existing original data is unchanged. Exports, runtime-role provisioning, recovery inventory and populated synthetic restore coverage include both new tables. Some earlier unsaved cross-table previews may need to be prepared again because their review envelope predates mapping references; saved links remain compatible.

## Completed shared-data additions — 11 October 2026

`setup_tracking` atomically reviews and saves a new or existing table, initial rows, project links and task scope. New types can have an optional person/organization/project/location concept; existing table selection pins its schema version. Purpose, inclusion criteria and source policy are explicit. The initial scope has autoWrite false.

`list_project_relationships` returns permission-filtered explicit relationships between linked records in one project. `propagate_linked_values` previews selected source fields against selected direct same-table or cross-table linked targets. Exact source/target versions, link state, field correspondence and schema/concept fingerprints are rechecked. A withdrawn/stale link or changed value invalidates approval. The resulting writes use normal per-field audit and reversal. No transitive propagation or implicit synchronization is performed.

`create_collection_link` and `revoke_collection_link` use workspace review. `list_collection_responses` exposes authorized response fields; `accept_collection_response` reviews the original and proposed record and saves an immutable acceptance. Unaccepted response files remain in the separate human review flow, not silently exposed to AI.
