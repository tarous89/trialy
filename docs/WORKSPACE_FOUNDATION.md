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

Projects now hold saved source/configuration (`text`, `markdown`, `json`, `javascript`, or `html`) with stable component IDs and declared table/field bindings. `prepare_workspace_change` supports save, move, archive/unarchive and recovery operations. Confirmation atomically saves a revision, audit entry and idempotent receipt. Drafts remain in PostgreSQL for 24 hours and do not enter saved history until confirmed.

`list_project_components`, `read_project_component`, and `read_component_history` reopen this work across sessions. The shared Projects screen includes a source editor, explicit project moves and revision recovery. Recovery creates a new revision of the old content while retaining the current project/archive state. Moving or archiving does not modify shared records or execute code. Existing jobs are not yet attached to components.

**Current boundary:** this is source storage, not generated-interface execution. HTML/JavaScript are escaped text in React, with no iframe, eval, network bridge or token access. The full generated UI host remains on the roadmap; no fixed template catalogue was added. Component access conservatively requires unrestricted workspace data access, including every field and original document for AI, because source may contain copied values beyond declared bindings. Bindings are references, not an authority grant. Granular project/component sharing, source provenance-aware disclosure, assets, live binding editing, drag-and-drop component moves and function attachment remain pending.

Export/inspection includes components and their immutable generic revisions. The synthetic restore rehearsal covers a saved component; it is not a managed production backup restore.
