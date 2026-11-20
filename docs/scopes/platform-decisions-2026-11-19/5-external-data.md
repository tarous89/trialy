# Code review notes: External sharing, validation, history and restore (X1–X4, A2, A7, A9, A10)

Evidence for the [implementation scope](../PLATFORM_DECISIONS_IMPLEMENTATION_2026-11-19.md). Produced by reading the code at commit `376f29d` on 19 November 2026; nothing was run. Line numbers refer to that commit. Where these notes list open questions, the scope's **Defaults adopted** section gives the answer to build to.

Gap analysis: external sharing, validation, history and restore (X1–X4, A7, A9, A10, A2 data side). Read-only; nothing was run. Line numbers are from the current checkout (files have very long lines, so a line is often a whole function).

## 1. Current state

1. Three external mechanisms exist, none modelled as Publish/Collect/Disclose: collection links (`external_links`, kind `form`|`view`, `/home/user/trialy/src/domain/exchange.ts:13`), per-recipient exchanges (`exchange_groups.kind` `request`|`room`, `/home/user/trialy/src/domain/external-exchange.ts:31`), and app shares (`email`|`public`, mode `view`|`edit`, `/home/user/trialy/src/app-services/sharing.ts:14`).
2. A `request` group bundles form, documents out, documents back and messages in one config; a `room` bundles documents, levels, Q&A and updates.
3. Public app links create a synthetic user with a tenant `memberships` row (`sharing.ts:22`); email shares add a viewer membership on accept (`/home/user/trialy/migrations/046_app_services.sql:79`).
4. Every external response lands in a holding table and needs a human accept (`accept_submission` owner-only, `/home/user/trialy/src/domain/service.ts:142`; `accept_exchange_submission`/`accept_exchange_file`, `external-exchange.ts:124-137`, human-only at `:197`).
5. There is no file screening: only size and base64 checks (`/home/user/trialy/src/server/external-exchange.ts:180-183`, `/home/user/trialy/src/server/external.ts` submit). Unaccepted files are kept out of assistant reads (`external-exchange.ts:304`). There is no reject operation.
6. One validation choke point exists: `Service.validateData` (`service.ts:82-108`), reached from web, MCP `prepare_change`, app `records.propose` (`/home/user/trialy/src/workspace/service.ts:994-996`), maintenance (`:1113`), automations (`/home/user/trialy/src/worker/automations.ts:32`) and external submits (`external.ts:40`, `external-exchange.ts:198`).
7. It checks required, type, strict ISO date, options, single-field unique and references. It fails on the first error with a message only, has no ranges and no composite keys. External submits switch unique off.
8. History is append-only (`/home/user/trialy/migrations/001_core.sql:42-46`) and already projected through current field visibility (`/home/user/trialy/src/domain/data-service.ts:105-113`, `/home/user/trialy/src/workspace/activity-evidence.ts:27,43`).
9. Restore-from-history exists in five operations (`/home/user/trialy/src/shared/schema.ts:42,43,52,60-63`) plus `restore_component` (`/home/user/trialy/src/workspace/schema.ts:75`).
10. "Delete" is an owner-only archive of draft records in Database (`service.ts:118-133,397-404`); apps cannot delete (`schema.ts:29`). Field-level access has five sources (see A2).

## 2. Per decision

**X1 — partly met. Size L.**
- Gap: no mode concept; `request` enables Collect and Disclose together; a public app with `edit` lets anonymous link holders write (Publish enabling Collect); external principals get organization membership; email verification can be switched off for confidential disclosures (`external-exchange.ts:120` defaults it on only when documents exist).
- Already met: per-recipient tokens, expiry, revocation, levels, row security.
- Data model: a `mode` column on `exchange_groups`, `external_links` and `app_shares`, with a backfill (`view` link and public app → publish; `form` and `request` form → collect; `room`, documents-out and updates → disclose). A non-member external principal for public apps; migrate the existing synthetic `memberships` rows.
- Server: reject cross-mode config in `exchangeReview` (`external-exchange.ts:104-112`) and `exchangeSchema`; force `verify_email` when gate ≠ none or kind = room; remove public `edit`; `access()` (`/home/user/trialy/src/domain/permissions.ts:6-11`) must resolve a share principal without membership.
- UI: `CollectionsPanel.tsx`, `ExchangesPanel.tsx`, `AppServicesPanel.tsx`, `PublicApp.tsx` get a mode choice per workflow.
- MCP: `prepare_workspace_change` text (`/home/user/trialy/src/server/workspace-foundation.ts:139`), `prepare_app_sharing`, the `exchange.*` app API (`external-exchange.ts:380`), template guidance.
- Tests: `exchange.test.ts`, `external-exchange.test.ts`, `exchange-rooms.test.ts`, `app-services.test.ts`, `database-isolation.test.ts`.

**X2 — not met. Size L.**
- Gap: no direct intake; acceptance is owner-only rather than "reviewer with the required rights"; no screening; no rejected or failed state shown to the submitter.
- Already met: originals preserved (immutable `submission_files`, `exchange_files`), assistant isolation of unaccepted files.
- Existing precedent, but unvalidated: tracked "responses" tables are written directly at `/home/user/trialy/src/domain/exchange-rooms.ts:204-209`, bypassing `validateData`.
- Data model: an intake flag per form (direct vs review); file `screening_status` (pending/passed/failed plus reason) on both file tables; submission and file rejection tables.
- Server: on submit, validate (including unique), then create the record under a platform authorization kind `external_intake`; route `target:'bound'` and all files to review; a screening step before any download, accept or assistant read; reject operations; the recipient status endpoint returns "retry needed".
- UI: `PublicExchange.tsx`, `RecipientExchange.tsx` (field errors, file status), `ReviewInbox.tsx`.
- MCP: `list_collection_responses`, `list_exchange_submissions` texts (`workspace-foundation.ts:149,159`).
- Tests: new intake, screening and rejection suites.

**X3 — partly met. Size L.**
- Missing: configured ranges (`fieldSchema` has none; `min`/`max` exist only on the renderer, `schema.ts:6,10`); composite or declared keys; number and date parsing (typed values only; CSV parsing is client-side in `/home/user/trialy/src/shared/csv.ts`); errors per field or import row (first failure aborts with no field key or row index, `service.ts:87-104`; `bulk_records` at `:185,440`).
- Also: external submits skip unique; tracked writes skip validation; the unique check has no database constraint, so it can race.
- Data model: field `min`/`max`, `format`, table `uniqueKeys` in the `entity_types` JSON (no SQL migration needed beyond an optional key index).
- Server: refactor `validateData` to collect `{field,row,code,message}` and throw once via `failWith`; add a shared parse step; a server-side import validation endpoint; route `trackExchange` through it.
- UI: `BulkImport.tsx` row report, `TrackerRecordForm.tsx`, `DatabaseCreateRow.tsx`, `FieldEditor.tsx` (range and key settings), external pages.
- MCP: error details in `prepare_change` and `records.propose`; schema guide.
- Tests: `core.test.ts`, `derived-fields.test.ts`, a new validation matrix per entry point.

**X4 — partly met. Size M.**
- Met: no auto-merge anywhere (identity and cross-table links are reviewed claims, `workspace-foundation.ts:135,145,174`); submissions never call an assistant.
- Gap: no declared formatting rules, no declared duplicate keys beyond single-field unique, no conflict report (imports abort instead).
- Work: reuses the X3 model (format rules such as trim, case, date and number format; `uniqueKeys`); import returns a duplicates and conflicts report and leaves source rows untouched; check the assistant Data level in the maintenance path (cross-area A4). Tests: import duplicates, conflict report.

**A7 — partly met. Size M.**
- Met: Logs UI is read-only (`LogsPanel.tsx` calls only `read_workspace_activity`, `read_activity_changes`); history is projected by current access; append-only triggers.
- Gap: the "full" audit is owner or inspector (`/home/user/trialy/src/workspace/activity.ts:17`), and run logs are limited to the run's own user (the `r.user_id=$2` branches, `activity.ts:41-50`), so an app owner who did not create the automation sees nothing.
- Work: add an app-owner scope to `activityPage` and automation history; switch projection from field to table level after A2. Depends on the app-owner role from the roles area. Tests: `home-activity.test.ts`, `effective-access.test.ts`.

**A9 — partly met. Size M.**
- Met: archived lists in Apps, Automations and Database (`ArchivedItems.tsx`, `/home/user/trialy/src/workspace/archive.ts:34-60`); restored automations stay off (`/home/user/trialy/migrations/060_archive_first_lifecycle.sql:38-40`, `workspace/service.ts:133-136`); dependency check on restore.
- Gap: archived fields can be restored (`restore_archived_schema` with `fields`, `ArchivedItems.tsx:42`); an app save or restore silently restores archived fields and tables (`restoreBoundSchema`, `workspace/service.ts:1060`, `/home/user/trialy/src/domain/archive.ts:92-93`); an automation can only be archived with its app, with no archive or restore of its own (`archive.ts:53` `restoreVia`).
- Work: restrict `restore_archived_schema` to whole tables; make app save fail with "restore the table from Database first"; automation-level archive belongs to the automations area.

**A10 — not met. Size M to remove, M for Undo.**
- Removal list is in section 3.
- Undo design: keep the existing engines (`reverseBatch`, `service.ts:271-290`; `creationArchive`, `:238-264`) and re-key them from "any history entry, any time" to "the caller's own commit receipt in the current session".
- New `undo_change` operation taking the receipt id. Checks: same actor; a session key stored on `commit_receipts` (web session, or the app runtime `viewId` in assistant hosts); every record still at the version that receipt produced (the rule at `service.ts:281`); current access and validation re-run. It writes a normal new revision and audit event.
- Delete in apps: add `delete_record` (archive state) to `recordWriteSchema` and `records.propose`; Undo returns the prior state.
- UI: an Undo helper in the app runtime (`ComponentRuntime.tsx`, `FrontendCodeRuntime.tsx`), not in Logs.

**A2 data side — not met. Size L.**
- Field-level sources: `workspace_access.hidden_fields` (`permissions.ts:19`, `MemberFields.tsx`, `/home/user/trialy/src/server/app.ts:114`); `permission_rules` kind `column` (`/home/user/trialy/src/domain/effective-access.ts:6,12`, `AccessPanel.tsx:63`); the field `ai` flag (`schema.ts:10`, `permissions.ts:30`); `app_section` field rules (`effective-access.ts:44`); share bindings `fields`/`writable` (`sharing.ts:18`).
- Database functions also read column rules (`/home/user/trialy/migrations/042_access_grid.sql:12`, `057_claude_connection.sql:98`).
- Migration: fail closed. A column deny becomes a table deny for that subject; a field with `ai:false` puts its table in `ai_hidden_types`; then give owners a report and a "move to separate table" tool. After that, remove the column settings and keep "hide column" in view config only.
- Tests: `access-grid.test.ts`, `effective-access.test.ts`, `security.test.ts`, `database-isolation.test.ts`.

## 3. Remove or restrict

| Item | Where | User-visible effect | Preserve |
|---|---|---|---|
| `restore_record` | `schema.ts:52`, `service.ts:53-66,479-483`, `RecordHistory.tsx:12`, `web/main.tsx:157,195`, `embed/main.tsx:198`, `canRestore` at `data-service.ts:112` | Version history becomes read-only; no "restore version" button | `revisions`, `record.restored` audit rows |
| `reverse_field_change(s)` | `schema.ts:43,63`, `service.ts:183,220,271,472` | No reversal from field history; engine reused for Undo | `record_field_changes`, `record.reversed` events |
| `archive_created_record`, `restore_archived_creation` | `schema.ts:60-61`, `service.ts:238-264,406`, route `app.ts:91`, MCP `list_creation_archives` (`/home/user/trialy/src/server/mcp.ts:55`) | No archive or restore of a new entry from history; the list stays as read-only history or is dropped | Audit events; records archived this way stay archived |
| `ChangesPanel.tsx` | Not mounted anywhere | None (dead code) | — |
| MCP texts | `record_versions` "Restore is a separate previewed change" (`mcp.ts:85`), `read_component_history` (`workspace-foundation.ts:168`), `resources/workspace/WORKSPACE.md:170`, `docs/WRITE_AUTHORIZATION.md`, `templates/TEMPLATE_AUTHORING.md`, `TEMPLATE_USAGE.md` | Assistants stop offering restore | — |
| Field restore and implicit restore on app save | `ArchivedItems.tsx:42`, `archive.ts:66,92` | A field returns only through a normal schema edit (redefining the key already restores it, `service.ts:467`) | `archived_fields`, record values |
| `restore_component` (A12, cross-area) | `workspace/schema.ts:75`, `workspace/service.ts:842`, `ComponentEditor.tsx:47` | No "Review recovery" of an old app revision | Revisions as read-only history |
| Column access settings, `ai` field toggle | A2 list above | Access is set per table only | Existing restrictions converted fail-closed |
| Public app `edit` mode, share memberships | `sharing.ts:14,22` | Public links are read-only; link holders are not members | Existing links until expiry |

Tests that reference removed operations: `write-authorization.test.ts` (7), `core.test.ts`, `workspace.test.ts`, `archive-first.test.ts`, `shared-records.test.ts`, `cross-table.test.ts`, `automation-steps-and-fields.test.ts`.

## 4. Build order, dependencies, risks, questions

**Order**
1. X3 validation core (unblocks X2 and X4).
2. A10 and A9 removals (independent, small).
3. X4 rules and import report.
4. X1 mode model.
5. X2 direct intake and screening.
6. Session Undo and app delete.
7. A7 app-owner logs.
8. A2 migration, last.

**Cross-area dependencies**
- Undo needs direct record saves (B3/P5) and the authoring Undo rule (G8).
- A7 and "reviewer with required rights" need the app-owner and editor roles (R3/R4).
- A2 needs the table-level access model from the access area.
- Automation-level archive belongs to T1.
- Catalog apps that call `exchange.acceptSubmission` (CRO Selection, `templates/source/cro-selection`) change with X2.

**Risks**
- Restricted values copied outside records: old `revisions` snapshots, `audit_events` before/after values, stored previews, runtime view caches, legacy app source. Projection must stay keyed to the current schema after columns move.
- Direct intake creates records that can fire record-change automations, which could bring an assistant into a routine submission; exclude that or gate it.
- Removing public-share membership touches `access()` and the row-security functions.
- Collect-all validation changes error shapes that tests and apps rely on.
- Not checked: whether installed catalog apps depend on the removed restore operations; test contents beyond name matches.

**Questions for the product owner (default in brackets)**
1. Are archived fields restorable? [No field-level restore; only whole tables.]
2. What is a "session" for Undo in the assistant panel? [The open app view, capped at 8 hours; web also ends at sign-out.]
3. Which submissions are routine? [New records in a table the app marks as intake; any update of an existing record and every file go to review.]
4. How deep is file screening? [Type allow-list, content-type match, size, block executables, macros and encrypted archives now; a malware scanner is a separate service decision.]
5. Does Publish allow a live view link? [Yes, read-only and labelled live; public `edit` is removed.]
6. A2 migration: fail closed or auto-split? [Fail closed plus an owner report.]
7. Is an emailed app invitation to an outsider a teammate invite? [Yes, handled in the roles area.]

### Critical Files for Implementation
- /home/user/trialy/src/domain/service.ts
- /home/user/trialy/src/shared/schema.ts
- /home/user/trialy/src/domain/external-exchange.ts
- /home/user/trialy/src/domain/effective-access.ts
- /home/user/trialy/src/workspace/service.ts
