# Trialy — Current Development

Updated: 2026-10-10  
Repository: tarous89/trialy  
Scope: [README.md](README.md)  
Decision/change log: [HISTORY.md](HISTORY.md)

## Current position

- Working development application, SQL migrations, background worker, standalone UI and MCP transport are implemented.
- Render web service, background worker and PostgreSQL are live in the confirmed workspace. Private Trialy plugin created.
- Current batch: configurable saved views and shared table/list/comparison/dashboard/timeline/calendar UI implemented. Deploy next; real ChatGPT connection/automatic opening remains an account-dependent acceptance check.
- No existing Trialegions application, data, infrastructure, or domain has been changed.

### Implementation checkpoint — 2026-10-10

A checked item below means that particular implementation exists; a partially implemented step is not complete merely because it has code.

| Step | Implemented now | Still needed |
| --- | --- | --- |
| 1 | TypeScript/React/API/worker scaffold, lockfile, migrations, health, CI, Docker and Render staging definition | Broader adapter contracts as integrations are added; live PostgreSQL migrations and Render boot verified |
| 2 | Self-hosted sign-up/login, PostgreSQL sessions and MCP OAuth with PKCE, tenant roles, workspace/table/field access, separate AI access, audited sharing | Implement recovery/verification/MFA and verify live session lifecycle; finer record/document/folder/view controls |
| 3 | Configurable typed fields, required validation, related-record references, pagination and visible-field search, versioned safe schema changes | Formula engine, configurable uniqueness/sorting/bulk operations; migration workflow for incompatible changes; verified person/document reference semantics |
| 4 | Temporary previews, explicit save/discard, digest binding, transactionally committed version 0/history/jobs, idempotency receipts, stale-edit rejection, shared record history and previewed restoration | Stronger separated database roles, preview infrastructure for multiple web instances; bulk/import previews |
| 5 | Authenticated MCP wiring with fourteen typed tools and an interactive MCP Apps workspace; transport tested locally | Live ChatGPT OAuth connection, remaining embedded views, cross-conversation proof and UI-only restricted-field path; account availability verification |
| 6 | Shared table/list/comparison/basic dashboard/timeline/calendar, saved-view editor with columns/filters/sort/group/date configuration, record forms and preview/save in both surfaces | Questionnaires, calculated/group totals across full datasets, record-level view restrictions and browser acceptance |
| 7 | Share with registered users, viewer/editor scopes, revocation, one-time/future action grants | Email invitations, guest/shared-view links; extend grant execution beyond report summaries |
| 8 | Original bytea payloads, SHA-256, immutable versions, upload preview/save/download, replacement-version UI and atomic job insertion | Record links, document display/review/expiry controls; separate storage adapter for later migration |
| 9 | Leased durable jobs, bounded retries, separate worker, isolated extraction subprocess, text/DOCX/PDF and image/scanned-PDF OCR paths, quiet availability states | Best-effort table extraction, richer Office coverage and per-capability statuses; representative OCR/PDF fixture validation |
| 10 | PostgreSQL full-text search, source/version references, bounded exact-version text reading and permission-filtered coverage gaps | Advanced filters, exact hit-to-page mapping and alternative original-reading tools |
| 11 | Previewed recurring summary configuration, current-rights checks, one-time/future grants, pause/resume, run history, exact-version internal approval | General triggers/conditions/actions, timezone schedules, reminders/routing and requested-action notifications |
| 12 | Not implemented | Email/calendar OAuth, external forms and inbound processing |
| 13 | Atomic versioned template installation; related CRO/RFP/proposal/study/commitment/risk tables | Complete proposal scoring/comparison/selection workflow, contract/change-order links, upgrades and workflow dashboards |
| 14 | Eleven editable template configurations cover the principal subject areas | Workflow-specific behaviours, training acknowledgements, communication/report integrations; these are starter configurations |
| 15 | Owner audit view and JSON export of originals, records, versions, approvals and audit; app suitability notice | Retention/legal-hold enforcement, inspection roles, readable inspection package, formal licence acceptance, operating procedures and evidence matrix |
| 16 | Internal approvals clearly separate from e-signatures | Provider pricing/suitability decision and conditional integration |
| 17 | Docker/Render staging blueprint, transaction integrity and restartable jobs | Least-privilege database roles, monitoring, backup/restore and production durability decision |
| 18 | Synthetic local app and focused backend/MCP checks | Full representative ChatGPT/standalone acceptance, onboarding, distribution and controlled brand cutover |

### ChatGPT onboarding implementation — 2026-10-10

- Removed the standalone-sign-in prerequisite for verified MCP users. The same issuer/subject resolves to one account, regardless of which surface is used first.
- Added `open_workspace` global/thread entrypoints and a self-contained interactive MCP Apps view. New users can confirm their first AI-accessible workspace inside the view. Existing access restrictions stay intact.
- Added account deduplication, preserved profile data, first-workspace/retry checks and entrypoint metadata checks. Build and nine focused subtests pass.
- Subsequent checkpoint: Render provisioning and private plugin creation completed. Real ChatGPT connection, browser rendering and post-OAuth auto-opening remain unverified. Full embedded feature parity is outstanding.
- Next execution instructions and concrete configuration are in [CHATGPT_SETUP.md](docs/CHATGPT_SETUP.md). Render workspace was subsequently confirmed. Existing-app self-hosted sign-in/OAuth is implemented; deployment subsequently completed.

### Self-hosted authentication and database checkpoint — 2026-10-10

- Replaced the external adapter with local signup/login, database sessions, MCP SDK OAuth, one-use codes, exact callbacks, S256 PKCE and rotating hashed tokens. Signup/consent returns directly to the registered ChatGPT callback.
- Build and 11 reported tests passed (ten leaf checks plus the parent), including the end-to-end local HTTP OAuth flow and rejected CSRF/verifier/code replay/refresh replay/account mismatch.
- Created Render Postgres `dpg-db58k25ckfvc739bb5f0-a` in Frankfurt. Updated Blueprint to use its exact database identity, generated session secret and built-in Render URL; removed external-provider prompts.
- Subsequent checkpoint: web/worker deployed through the user-approved dashboard fallback. Real ChatGPT verification remains pending. See [setup checkpoint](docs/CHATGPT_SETUP.md).

### Shared history and document views — 2026-10-10

- Added permission-filtered record version history in standalone and embedded workspaces. Current field restrictions apply to every historical snapshot; raw owner audit is not exposed to the model.
- Restoration requires all current fields and edit access, an earlier version and a reason. Preview displays the exact restored values. Commit rechecks record/schema versions and permissions, creates a new revision and preserves approvals; approved records return to review.
- Added embedded document listing, search coverage and bounded exact-version extracted-text reading. Shared text viewer handles partial/unavailable extraction quietly. Original upload/download remains standalone until host file handling is implemented.
- Standalone now offers New version for latest document originals; bytes, history and previous versions stay intact.
- Build and 13 reported tests pass. Two targeted checks cover restricted history, restoration/discard/retry/stale changes, unchanged approval evidence, document restrictions/quiet gaps and old-original preservation. No broad test expansion.
- No plugin package change needed: its server URL and identity are unchanged. Web deploy `dep-db596tnavr4c73et7vug` and worker deploy `dep-db596tnavr4c73et802g` are live on commit `89bbf7b`; live health returns 200.

### Configurable saved views — 2026-10-10

- Added previewed/versioned view creation and updates, including stale-edit protection. Config supports column selection, typed equals/contains/empty filters, ascending/descending sorting, table/list grouping and date-field selection.
- Filters and numeric-aware sorting execute in PostgreSQL before pagination; matching counts are for the full filtered set. SQL field keys and values are bound parameters.
- A view with any currently restricted field reference is omitted and cannot be executed by ID. This includes columns, filters, sorting, grouping and dates, avoiding hidden-field leakage through membership/count/order.
- Both interfaces use shared table/list/comparison/dashboard/timeline/calendar components and the same view editor. Layouts and groups show the current page, labelled explicitly; whole-result calendar loading and aggregates remain unfinished.
- One focused test covers filtering/sorting/pagination, versioned updates, stale saves, tenant/model restrictions and date requirements. Build and all 14 reported tests pass. Real host visual acceptance remains pending.

### Verification and practical boundaries

- `npm run build`: TypeScript check and production frontend bundle passed.
- `npm test`: 14 reported tests (13 leaf checks plus the parent suite), using the SQL migrations in PGlite. Covers tenant/model access, preview discard/save/retry/concurrency, append-only audit, original preservation after extraction failure, grant revocation, atomic template installation, sharing/review/scheduled summary/export, MCP transport permission filtering, and first-connection identity/workspace onboarding.
- Local demo successfully starts on loopback with persistent synthetic data. Chromium download failed in this environment, so visual browser acceptance is still outstanding. Real PostgreSQL migrations and deployment subsequently passed; real ChatGPT verification is still outstanding.
- OCR/PDF/Office extraction is bounded and implemented, but the automated source-preservation check uses a text file and an unsupported file. Unsupported or failed extraction leaves the original available.
- Authentication now runs within Trialy; no external identity-provider credentials are needed. Password recovery, verification and MFA remain incomplete. The MCP resource now provides interactive workspace selection, first-workspace setup, tables, record forms, templates and preview/save. Remaining views and UI-only access are unfinished.
- Preview storage is in-process with a 24-hour expiry and 100 MiB aggregate limit. Run one web instance. A process restart discards uncommitted previews; saved data remains in the database.
- Restricted users cannot access workspace documents or raw audit/export until finer document/history controls exist. This conservative boundary avoids exposing unrestricted originals through a restricted view.
- Action grants are currently executed only by the recurring report-summary worker. Other grant types are configuration groundwork, not automated import/create capabilities.
- Audit/original immutability is protected by database triggers against ordinary writes. The deployment still needs separate migration/runtime roles and operational administrator controls.
- The source-preservation guarantee is transaction-level. Production failover, backup retention and restore evidence remain Step 17 work before customer reliance.

This is one dependency-ordered building plan for the complete product, not a release roadmap. Conditional items are identified explicitly. Finish each step's small completion check and continue; do not invent extra approval rounds or broad test programmes.

## Working architecture and defaults

These are implementation defaults, not previously deployed capabilities. Adjust a default if implementation reveals a concrete problem, and record the reason in HISTORY.md.

- TypeScript application and API/MCP service; React shared UI for embedded and standalone surfaces.
- One modular backend, not a fleet of microservices. Both interfaces call the same domain operations and permission checks.
- PostgreSQL for tenants, configuration, records, revisions, audit events, jobs, original file bytes, and extracted text. Use typed relational metadata plus validated JSONB record values and explicit relationship records.
- Separate document payload storage from routine metadata queries. Use bytea for initial files, with a configurable practical upload limit (initial engineering default: 25 MiB).
- A PostgreSQL-backed job queue and transactional outbox; no Redis dependency initially.
- One Render web service, one worker when processing is introduced, and modest paid Render Postgres in Frankfurt. Use separate synthetic-data staging before customer production use.
- Existing maintained authentication/OAuth components; choose the concrete provider/library in Step 2 after checking current SDK compatibility and cost.
- Temporary previews use the browser or expiring temporary server storage, not authoritative database rows disguised as drafts. Initial preview expiry default: 24 hours where temporary server storage is necessary; previews are explicitly non-durable.
- Database transactions, audit integrity, permission checks, and safe retries are required from the first persistent writes.
- API/MCP operations have typed schemas and stable IDs. The model may propose configuration but cannot submit arbitrary executable code, unrestricted SQL, or its own authorisation claims.
- Brand and public URLs are configuration. Keep the internal Trialy identity stable.
- Synthetic records and one or a few test documents only during development. Never send test messages to real recipients.

## Ordered build steps

### 1. Scaffold the shared application

**Depends on:** these documents.

- [x] Establish web, server, worker, shared domain/schema, and reusable UI directories in one repository.
- [ ] Add dependency lockfile, environment-variable template without secrets, formatting/type checks, migration commands, and build/start commands.
- [x] Define common errors/statuses, stable identifiers, timestamps, actor context, tenant context, and request/idempotency IDs.
- [ ] Define interfaces for storage, processing, authorisation, preview/commit, and external adapters.
- [x] Add health endpoint, structured logs without document bodies, and synthetic seed data.

**Done when:** a clean checkout builds and serves the empty application locally. Record commands here.

### 2. Establish identity, tenants, and foundational permissions

**Depends on:** 1.

- [ ] Integrate maintained authentication, account linking, logout/revocation, and MFA support; do not build password cryptography.
- [x] Create tenants, users, memberships, workspaces, and owner/editor/viewer roles.
- [ ] Derive tenant/user identity server-side. Implement permission evaluation for workspace, type/table, field, document/folder, shared view, and action, with record restrictions where needed.
- [ ] Add separate AI-access grants whose effective scope cannot exceed human access. Enforce permissions for reads, writes, exports, and background operations.
- [x] Capture membership and permission changes in protected security audit events from this step onward.
- [x] Implement the standalone sign-in and minimal account/workspace shell.

**Done when:** two synthetic tenants cannot read or change each other's data, and a restricted field is withheld by the server.

### 3. Implement the configurable data foundation

**Depends on:** 2.

- [x] Create type definitions, field definitions, records, relationships, and configuration revisions.
- [ ] Support text, numeric/money, date/time, boolean, select/status, person, relationship, and document references.
- [ ] Implement schema validation, required fields, uniqueness where configured, pagination, filtering, sorting, and bulk operations.
- [ ] Add safe formulas/aggregations with dependency tracking and permission-aware results; never execute model-provided code.
- [x] Represent saved views as configuration; avoid fixed modules and duplicate business entities.
- [ ] Add migration handling for field changes, incompatible conversions, removal, and referenced records.

**Done when:** a CRO table and study table can be configured and linked, with invalid values rejected and no committed-write bypass.

### 4. Build preview, commit, versions, and audit together

**Depends on:** 2–3. No persistent business write ships without this path.

- [ ] Create isolated preview revisions for new structures, records, file selections, imports, and proposed edits.
- [x] Show exact destination, selected content, and change summary. Bind Save to an authenticated user and exact preview revision.
- [x] Commit accepted changes, version 0 or next revision, audit event, and any job/outbox entry in one transaction.
- [x] Include actor, time, old/new values, affected object/version, action origin, and reason where required.
- [ ] Protect audit history from ordinary application edits/deletion; separate operational administration permissions.
- [x] Implement idempotency receipt lookup, safe retry after interrupted responses, and optimistic concurrency checks.
- [x] Discarding previews changes nothing committed. Correction/restoration creates a new revision; approved historical content stays identifiable.
- [ ] Distinguish saved draft, in review, approved/effective, superseded, and archived states.
- [x] Clean up temporary previews without promising erasure of independent chat history or infrastructure logs.

**Done when:** preview/discard does not create an official record; confirm creates exactly one revision; retry is not duplicated; stale edits cannot overwrite silently.

### 5. Prove the ChatGPT integration early

**Depends on:** 2–4.

- [x] Verify current official SDK/authentication/distribution requirements before implementation.
- [x] Expose a small set of typed MCP tools: workspace discovery, schema/read/search, preview mutation, commit, and receipt/status lookup.
- [ ] Register an embedded interactive table/form with the same backend as standalone.
- [ ] Support authenticated create → preview → confirm → read-back across conversations.
- [ ] Prove UI-only access for one model-restricted field; omit it from model-visible responses, state, summaries, and tool results.
- [x] Provide a standalone route where a required embedded capability is unsupported.
- [ ] Record actual plan/account availability; do not introduce a Trialy organisational-account restriction.

**Done when:** one synthetic table can be created and edited inside ChatGPT, persists in standalone, and model-restricted content stays out of model-visible payloads.

### 6. Complete reusable views and manual interaction

**Depends on:** 3–5.

- [ ] Build table/list, record detail, form/questionnaire, comparison matrix, dashboard/report, timeline, and calendar components.
- [x] Add saved view columns, filters, sorting, grouping and date-field configuration through previewed/versioned changes.
- [ ] Add safe calculations and whole-result group aggregates.
- [x] Share record layouts, saved-view editor, record history and document text across both surfaces.
- [ ] Consolidate remaining editors and workflows; tabs remain configurable views.
- [ ] Add clear preview/save/discard states, quiet processing flags, permission-aware actions, and practical loading/empty states.
- [x] Persist approved configuration changes through the common commit path.

**Done when:** a user can configure and operate a tracker manually or conversationally using the same records.

### 7. Add sharing and one-time/future permissions

**Depends on:** 2, 4–6.

- [ ] Add collaborator invitations, role changes, scoped shared views, and revocation.
- [ ] Keep hidden fields and underlying unrelated records inaccessible, including through aggregations and exports.
- [ ] Offer Allow once or Allow future actions of this type; persist scope, destination, actor, workflow, and revocation status.
- [x] Re-evaluate current permissions at execution time; standing permission never exceeds the granting user's current rights.
- [x] Keep formal approvals/signatures separate from automation authorisation.
- [ ] Use expiring scoped guest access where external forms or document requests require it.

**Done when:** a restricted comparison can be shared without its financial fields, and revoking a future-action grant prevents subsequent execution.

### 8. Save original documents in PostgreSQL

**Depends on:** 4, 7.

- [ ] Create document metadata, immutable original versions, bytea payloads, checksums, and record links.
- [ ] Implement authenticated upload, preview/selection, confirmed commit, download, and document display.
- [x] Verify complete bytes and integrity before acknowledging Saved; commit metadata/audit with the original.
- [x] Never describe an external link, unfinished upload, or temporary copy as a saved original.
- [x] Support new original versions without overwriting older originals, with replacement preview in standalone.
- [ ] Add document review/expiry metadata controls.
- [ ] Keep file storage behind a simple interface for possible later migration.

**Done when:** a saved test document downloads byte-for-byte intact, and an interrupted save never produces a false Saved message.

### 9. Add durable background processing and quiet failure handling

**Depends on:** 8.

- [x] Implement durable jobs, worker leases, timeouts, restart recovery, bounded retries, and duplicate-safe execution.
- [ ] Add text extraction for supported text/PDF/Office formats, OCR for scanned pages, and best-effort table extraction.
- [ ] Preserve original version references, extraction method/version, page/section references, and per-capability processing status.
- [x] Default to one attempt plus one retry for transient failures; avoid repeated attempts on unsupported input.
- [x] After failure, retain the original and show only No extraction available or Partial extraction beside the document.
- [x] Keep diagnostics internal; no user notifications/toasts/emails for routine regenerable processing failures.
- [x] Continue other files and independent jobs. Keep only the specific dependent result incomplete/pending.
- [x] Do not generate content revisions merely for processing retries or publish stale results for a newer source version.

**Done when:** one intentionally unextractable file stays downloadable, shows a quiet flag, and does not prevent another file from completing.

### 10. Add document retrieval with coverage awareness

**Depends on:** 7, 9.

- [ ] Index extracted text for PostgreSQL full-text search; filter by workspace, document, type, version, and permissions.
- [ ] Return exact source/version and page/section references with retrieved passages.
- [x] Include counts/status for authorised documents with unavailable or partial extraction, even when absent from search results.
- [x] Apply AI-access restrictions before any content goes to the model; do not disclose restricted document existence through coverage counts.
- [ ] Allow authorised retrieval of originals when a supported alternative reading path exists.
- [ ] Keep embeddings/vector indexing deferred; define a replaceable index boundary without provisioning another service.

**Done when:** AI can answer from a permitted passage and accurately distinguish incomplete coverage from no matching information.

### 11. Build rules, scheduled work, and approvals

**Depends on:** 4, 7, 9–10.

- [ ] Implement constrained rule configuration: trigger, conditions, actions, destination, grant, and approval requirements.
- [ ] Support event triggers and schedules with timezone handling, execution history, pause/resume, retry, and cancellation.
- [x] Preview rule changes before activation; version configurations and use recorded one-time/future grants.
- [ ] Add internal reminders, recurring reports, overdue actions, proposal-arrival processing, and review routing.
- [x] Bind approval to the exact record/configuration version. Changes requiring renewed review invalidate the current approval state, not historical evidence.
- [x] Run independently of an active ChatGPT conversation; keep all application truth in the backend.
- [ ] Isolate failures and distinguish quiet derived-data gaps from failed requested actions requiring a concise notice.

**Done when:** a scheduled synthetic workflow runs while chat is closed, honours its grant, and cannot approve itself.

### 12. Connect communications and external collection

**Depends on:** 7, 9, 11.

- [ ] Define email/calendar adapters; integrate the first supported provider using scoped OAuth and safe token storage.
- [ ] Implement message/thread links, calendar events, draft/send, response capture, and follow-up tracking.
- [ ] Add external questionnaires and document requests using scoped invitations and tenant-safe destinations.
- [ ] Treat inbound messages/documents as untrusted content, not authority to invoke tools or send messages.
- [ ] Prevent duplicate sends on retries; apply one-time/future permissions and configured approval steps.
- [ ] Preserve sources first; extraction failures remain quiet under Step 9.

**Done when:** one end-to-end exchange using controlled test accounts is linked to the correct workspace and no duplicate send occurs.

### 13. Build the template engine and RFP-to-oversight workflow

**Depends on:** 6–12.

- [ ] Package templates as versioned configuration with stable entity references, installation preview, customisation, and explicit upgrade diffs.
- [ ] Implement RFP requirements/scope, CRO shortlist, proposal/clarification collection, budget/service comparison, scoring, reviews, and selection.
- [ ] Carry the chosen CRO, proposal, and agreed commitments into study/CRO oversight without duplicate entities.
- [ ] Implement milestones, responsibilities, deliverables, risks, issues, actions, decisions, budgets, contracts, and change orders.
- [ ] Add document versions, review requests, missing/expiring document tracking, and study dashboards.

**Done when:** one synthetic RFP becomes an active study tracker with its decision and source history intact.

### 14. Populate the rest of the agreed template library

**Depends on:** 13.

- [ ] Site identification/feasibility/management and PI database/engagement.
- [ ] SOP management and training coordination, with version-specific acknowledgements.
- [ ] Expert/KOL and advisory-board management.
- [ ] Congress and publication planning.
- [ ] Team tasks/projects, vendor/contracts, and budget/resource tracking.
- [ ] Email follow-up and recurring management reporting templates.
- [x] Reuse the primitives; introduce no separate hardcoded products or mandatory navigation modules.

**Done when:** each template installs as editable configuration. Use representative manual inspection, not a separate exhaustive test suite per template.

### 15. Complete controlled records, retention, and inspection support

**Depends on:** 4, 8, 11, 13.

- [ ] Define intended-use/record classes, responsible roles, retention rules, and legal holds.
- [ ] Add audit search/review, access review, controlled corrections, read-only archives, and restricted inspector access.
- [ ] Export originals, records, relationships, versions, source references, approval history, and audit data in readable and machine-readable forms.
- [ ] Define tenant offboarding, archive/export responsibilities, and controlled deletion subject to retention.
- [ ] Maintain a concise requirements-to-critical-checks matrix and evidence for intended regulated workflows.
- [ ] Document essential change, incident, recovery, supplier, training, and corrective-action responsibilities.
- [ ] Include licence/onboarding patient-data limitation without adding content screening.
- [ ] Record changes requiring customer configuration assessment; never imply arbitrary user configurations are automatically validated.

**Done when:** one study can be exported with interpretable history and retention controls prevent inappropriate destruction.

### 16. Decide and conditionally implement electronic signatures

**Depends on:** 11, 15.

- [ ] Compare suitable providers' production API pricing, minimum commitments, identity controls, evidence export, and regulatory fit.
- [ ] Distinguish sandbox access from usable production terms.
- [ ] If suitable and affordable, integrate explicit human signing bound to an exact version, signed evidence retention, and duplicate-safe callback handling.
- [ ] Otherwise record formal signatures as deferred; preserve internal approvals without labelling them regulated signatures.
- [x] Keep this conditional decision from blocking unrelated product completion.

**Done when:** the documented decision is supported by current terms; any implemented signature can be verified against its exact source version.

### 17. Establish production durability and operational readiness

**Depends on:** 8–16; conditional signatures may remain explicitly deferred.

- [ ] Measure actual storage, worker load, and backup/restore behaviour using representative modest data.
- [ ] Agree acceptable recovery time and explicit failure scenarios for no loss of acknowledged saves.
- [ ] Evaluate whether Render's available database arrangement meets that requirement; asynchronous HA alone is insufficient for strict zero-loss failover.
- [ ] Prefer existing infrastructure; add/replace infrastructure only when justified before customer reliance, with a documented migration and rollback path.
- [ ] Configure controlled production deployment, secret management, monitoring, restore procedure, support contacts, and production/staging isolation.
- [ ] Perform one representative restore and reconcile originals, records, revisions, and audit entries.
- [ ] Rehearse migration only if a migration is actually required; do not build a general migration platform.

**Done when:** actual recovery evidence supports the stated durability limits and no untested absolute guarantee is advertised.

### 18. Final integrated acceptance and publication preparation

**Depends on:** all required previous steps.

- [ ] Walk through RFP → proposals → selection → oversight in ChatGPT and standalone with synthetic data.
- [ ] Check permissions/model exclusion, preview/commit, history, quiet extraction failure, automation authorisation, and export using the lean checks below.
- [ ] Fix concrete failures; repeat only affected checks.
- [ ] Complete user onboarding/help and app distribution requirements.
- [ ] Prepare configurable Trialegions branding and a separate controlled cutover plan for the existing product/domain.
- [x] Record actual completion, remaining conditional items, and any customer-use limitations in this file and HISTORY.md.

**Done when:** the agreed product works end-to-end and is ready for hands-on testing/improvement. Publication and replacement of the existing Trialegions service are separately executed actions, not side effects of changing a label.

## Lean verification policy

Run ordinary build/type checks and these reusable critical checks as their capabilities are introduced:

1. **Access:** tenant separation, restricted fields/documents, and no model-visible leakage.
2. **Commit:** discard leaves no record; save creates one version/audit entry; retry and stale edit are safe.
3. **Sources:** save/download integrity; failed source save is not acknowledged; failed extraction keeps source and lets other work continue.
4. **Permissions/jobs:** standing-grant revocation, duplicate-safe execution, and no automatic human approval.
5. **Recovery/export:** one representative restore and complete study export.
6. **Experience:** one end-to-end synthetic RFP-to-oversight walkthrough across both interfaces.

Do not chase coverage percentages, snapshot every UI, test every cosmetic change, repeat full suites after unrelated edits, or build elaborate load/chaos infrastructure for a handful of test files. Add checks only for a concrete risk, observed regression, or applicable required gate. Lean testing still needs credible evidence for the authoritative-record claims.

## Maintenance after each work session

- Mark only completed boxes; leave unimplemented work unchecked.
- Update Current position with the active step, concrete next action, and actual blocker if any.
- Append a short dated HISTORY.md entry for meaningful changes.
- Record executed check results and deployment/commit references without inventing them.
- Update README.md only when scope or decisions change.
- Do not start work in the existing Trialegions repository or infrastructure.

