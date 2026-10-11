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
