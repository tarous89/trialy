# Projects and maintenance — implemented boundaries

Migration 017 adds generic project/folder organization and approved record maintenance. The shared Projects panel is available in standalone and embedded workspaces. No new provider or paid resource is needed.

## Supported

- Preview/confirm/discard project/folder creation, rename and move; drag/drop prepares an exact move preview. Cycles and cross-workspace parents are rejected. Stable project IDs survive moves.
- Review a maintenance scope against existing tables: purpose, inclusion criteria, source policy, task basis, approved fields, create/update/link permissions and batch limit. Initial table creation remains a separate existing schema preview/save step.
- Routine `maintain_workspace_records` MCP writes under an existing user-owned scope. Schema fingerprints, AI permissions, expected record/scope revisions, batch limit and writable-field bindings are checked inside the transaction. No implicit schema expansion.
- Exact request-key replay receipts, original observations and existing record revisions/audit. Revoking or editing scope stops old authorizations. Re-approval after schema expansion enables explicit backfill from permitted input.
- Same-table reversible identity links. Both source records and their original relationships survive; links explicitly identify the preferred record. No transitive chains, destructive merges or automatic collapsed query output.
- Evidence tool returns up to 100 latest observations plus active/revoked links. Full record field access is required; inaccessible links are omitted. Existing record-history tools expose earlier saved values.
- Owner/inspector exports include project nodes, scopes, receipts, links, observations and revision/audit evidence. Temporary previews expire after 24 hours and are cleaned when preparing another preview; infrastructure backup retention still applies.

## Authorization and semantic limits

Project/folder metadata requires unrestricted workspace access in this implementation. It inherits workspace membership rather than introducing project-specific shares. Maintenance scopes belong to their approving user and cannot be borrowed by another member. AI-disabled tables/fields remain unavailable even when launched from the standalone interface.

The server enforces identity, tenant, tables/fields, operations, schema version, concurrency and limits. It cannot independently prove that supplied text means “an eligible CRO” or that a source label is accurate: ChatGPT must follow the reviewed inclusion/source policy and preserve uncertainty. This is an agent-driven capability, not a background agent silently monitoring every conversation. Scope text is not an override of backend permissions. External source fetching and scheduled maintenance are not added by this change.

App-only MCP confirmation metadata follows the existing host integration; real host enforcement/human-origin assurance remains to verify. Do not claim a regulated electronic signature or complete safety merely because a tool is app-only.

## Remaining product work

General canonical entities and relationship-aware queries; schema-semantic reconciliation; cross-type matching; project-specific facts linked by a generalized relationship service; generated UI component source/revisions/hosting; component moves; finer project sharing; scheduled maintenance integration; external providers; production recovery validation. The editing-policy proposals in INTERFACE_RULES.md are not silently marked implemented here.

## Verification and rollback

`tests/workspace.test.ts` exercises setup without implicit writes, exact retries, out-of-scope fields, preserved observations, unlinking, stale-write rollback, schema expansion/reapproval, revocation, isolation and immutable evidence. Existing regression tests remain intact. Synthetic backup rehearsal includes these tables; it is not an actual Render backup restore.

Migration 017 is additive. Roll back application code if necessary while retaining the new tables and evidence; never delete saved nodes, scopes, observations or links as a rollback shortcut.

## Saved components (migration 018)

Tools can exist independently or within projects and hold saved source/configuration (`text`, `markdown`, `json`, `javascript`, or `html`) with stable component IDs and declared table/field bindings. `prepare_workspace_change` supports save, move, archive/unarchive and recovery operations. Confirmation atomically saves a revision, audit entry and idempotent receipt. Drafts remain in PostgreSQL for 24 hours and do not enter saved history until confirmed.

`list_project_components`, `read_project_component`, and `read_component_history` reopen this work across sessions. The shared Projects screen includes a source editor, explicit project moves and revision recovery. Recovery creates a new revision of the old content while retaining the current project/archive state. Moving or archiving does not modify shared records or execute code. Existing jobs are not yet attached to components.

**Current boundary:** this is source storage, not generated-interface execution. HTML/JavaScript are escaped text in React, with no iframe, eval, network bridge or token access. The full generated UI host remains on the roadmap; no fixed template catalogue was added. Component access conservatively requires unrestricted workspace data access, including every field and original document for AI, because source may contain copied values beyond declared bindings. Bindings are references, not an authority grant. Granular project/component sharing, source provenance-aware disclosure, assets, live binding editing, drag-and-drop component moves and function attachment remain pending.

Export/inspection includes components and their immutable generic revisions. The synthetic restore rehearsal covers a saved component; it is not a managed production backup restore.

## Project access and initial interface runtime (migration 019)

Folder/project and component allowlists now narrow workspace permissions. A null allowlist adds no human restriction; an empty list allows only the human owner. Every ancestor restriction applies, and AI must also be enabled on every ancestor and the component. Owner human access is retained; owner AI access does not bypass AI restrictions. Only owners may prepare reviewed sharing changes. This does not invite people, grant workspace membership, or change underlying table/document access.

Moves copy the old effective restrictions onto the moved item before applying the destination restrictions. Consequently a move cannot silently broaden access. Owners can separately review an explicit sharing expansion. Source/configuration saves cannot disguise a move. Access/organization changes invalidate pending confirmations. Maintenance rechecks project access and its approved access context before each write; a changed context requires renewed scope review. Observation reads respect their originating project, and unrestricted inspection/export is denied to inspectors excluded from any project/component. Components are not yet attached to background jobs, so no component execution authority is inferred from these permissions.

The new `trialy-ui` component format supports runtime `trialy-ui-v1`: a JSON description with `layout` (`stack` or `grid`) and a sequence of composable blocks. Text blocks accept `kind: "text"`, `text` and optional `heading`. Table blocks accept `kind: "table"`, `title`, `typeId`, `fields`, and optional `editable` (true by default). Every table field must be declared in component `bindings`. This is a general layout vocabulary, not a business template catalogue.

The trusted React renderer escapes text and supports live paginated tables. It does not evaluate generated JavaScript, insert raw HTML, load remote assets, or give generated source a network/token bridge. Open a saved `trialy-ui` component to render it; configuration/history are a separate page. A cell edit prepares `edit_component_record` for review; confirmation updates the shared record with version checks, an audit trail and idempotent receipt. Formula fields and viewer/inspector access are read-only. Presentation edits change only component configuration. This implements the basic stored-field versus presentation distinction; project-local overrides and richer computed editing are not implemented.

Limitations: forms/charts/actions, arbitrary frontend code, asset packages, provisional live rendering before initial save, and function attachment remain pending. Partial-data viewers still cannot open general saved source; conservative workspace-wide field/document access checks remain in addition to project/component controls. The ChatGPT surface uses the authenticated MCP actor's AI permissions; this increment does not claim a separate human-only data channel within ChatGPT. Full host/browser acceptance remains outstanding.

## Frontend scope correction

The user rejected a proprietary component catalogue. `trialy-ui` is now compatibility-only; new UI authoring uses ChatGPT-written `frontend-js` code. The supported runtime and honest limitations are described in [FRONTEND_CODE.md](FRONTEND_CODE.md). Prior text/table implementation notes above describe historical behavior, not a plan to build more UI block types.

## 11 October update: approval, identity reads and execution bindings

Earlier descriptions of automatic maintenance are superseded by WRITE_AUTHORIZATION.md. Scopes are now preview-only by default. Long-term writes require reviewed autoWrite:true, exactly one type and expiry. maintain_workspace_records otherwise returns a durable apply_maintenance proposal. Confirmation commits observations, records and receipts together; fields retain exact approval/grant evidence.

read_shared_identity resolves an accepted same-table star into preferred values, retained originals, conflicts, authorized observations and up to 100 incoming relationships. find_identity_candidates searches up to ten permitted types, 25 results each. These are search/read primitives: ChatGPT decides semantics; no fuzzy match automatically becomes a merge. Runtime entities.read excludes cross-table relationships to respect declared capabilities.

Component content includes execution:[{name,revisionId,grantId?}]. Functions remain owned by their author, not delegated to everyone who can view a component. Bindings require all currently readable fields of the function's declared types. Workers and commits recheck current component version/access and attached grant. Moves/edits/archive invalidate prior execution contexts; source restore clears execution bindings. Generic schedules can include componentContext and pause if it becomes invalid.

### Reviewed copies and organization search

Projects includes name search over currently accessible projects, folders and component metadata. Component configuration can preview a copy of its saved source into a selected project. Copies have a new ID and version-zero history; linked data stays shared rather than duplicated. Source and inherited access restrictions are retained, destination restrictions also apply, and function bindings/grants are cleared. Copy provenance records the original component/version in the new revision. Source version and current access are rechecked at approval. Legacy block components cannot be copied into new catalogue instances.

### Project and folder archive

Migration 024 adds retained node archival. An owner reviews the exact descendant nodes, component versions, task scopes and attached schedules before saving. Changes to the reviewed contents require a fresh preview. The archived state is inherited; source/history stay readable under current access, while editing, moves, generated interfaces, task maintenance and component-bound execution are blocked. Archival gives each descendant component a new revision with empty function bindings, revokes active task scopes and pauses attached schedules. Old queued/running component contexts fail their repeated permission/version checks.

Restoration reopens organization only. It never restarts scopes, bindings or schedules; these require new reviewed setup. Individually archived descendants remain archived. Shared database records and independently invoked workspace functions are unaffected by project organization. The Projects UI hides archived work by default and offers Show archived and reviewed restore.
