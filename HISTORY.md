# Trialy — Project History

This file records meaningful decisions and completed development work. It is not the application's customer-record audit trail.

- [Scope and decisions](README.md)
- [Current development plan](DEVELOPMENT.md)

## Documentation baseline — 2026-10-10

**Status:** scope agreed; development plan prepared; application implementation not started. No runtime, database, deployment, customer migration, or public-brand cutover has been performed by this documentation task.

### Original brief

- Establish a ChatGPT-first, configurable clinical and medical operations platform for small biotech teams.
- Use reusable workspaces, records/relationships, views/forms, documents, permissions, rules/actions, and templates.
- Make the full permitted application available in ChatGPT; retain a standalone application on the same backend.
- Use RFP → CRO selection → study/CRO oversight as the first complete workflow, while retaining the broader template scope.
- Develop one complete product in dependency order, not a sequence of marketed releases.

### Decisions agreed during scope review

1. Use **Trialy** for development; switch the public brand to **Trialegions** at a separate publication cutover. Keep the existing Trialegions project isolated.
2. Target EU and US regulated operational use. Trialy holds authoritative committed records rather than relying on another clinical platform.
3. Allow professional personal information. Explain patient-level data unsuitability through licence/onboarding; do not implement patient-content screening or quarantine.
4. Introduce preview → explicit save → version 0. Conversation and experimentation are not automatically persisted as official records.
5. Preserve history after commitment. Saved working drafts and formally approved records are different states.
6. Offer one-time or revocable future-action permissions with defined scopes.
7. Separate human access from model access; permit verified UI-only display of model-restricted information.
8. Do not require an organisational ChatGPT account. Actual availability remains subject to OpenAI's supported capabilities.
9. Authenticate all private data access and save only through the shared backend.
10. Start with modest paid Render infrastructure and PostgreSQL, including original file bytes. No additional object store or vector database initially.
11. Build text/structure extraction and full-text retrieval; defer vector indexing until needed.
12. Confirm Saved only after source persistence. Derived-processing failures retain the source, use bounded retries, show only quiet availability flags, and do not block unrelated work.
13. Record incomplete search coverage for AI; never treat unavailable extraction as evidence of absent information.
14. Implement transaction integrity, safe retries, and concurrency handling now. Resolve stronger production durability before real customer reliance; no absolute no-loss promise based merely on direct writes.
15. Include electronic signatures conditionally on suitable production API cost and requirements; otherwise defer explicitly and retain internal approvals.
16. Keep testing lean: critical integrity/access checks and one representative end-to-end workflow, without exhaustive cosmetic or template-by-template suites.

### Repository documentation

- README.md: full agreed vision, scope, boundaries, and decisions.
- HISTORY.md: this dated decision and change log.
- DEVELOPMENT.md: ordered implementation tasks, dependencies, practical defaults, acceptance checks, and current status.

## Development foundation implemented — 2026-10-10

**Status:** substantial implementation across Steps 1–11 and template/export groundwork in Steps 13–15. No step with missing acceptance evidence is represented as complete. No deployment, existing-product cutover or customer-data migration occurred.

- Added Node/TypeScript shared backend, React standalone UI, PostgreSQL migrations, durable worker, typed MCP transport, Docker and Render staging configuration, and focused CI.
- Built configurable tables/records/relationships, safe field changes, preview/confirm/discard, atomic versions/audit/job writes, save receipts, stale-edit handling and internal review tied to saved versions.
- Added tenant/workspace permissions, restricted fields/tables, independent AI access, audited registered-user sharing, and revocable one-time/future permissions. OIDC/OAuth wiring awaits a real provider and live verification.
- Store original files in Postgres with checksums and immutable versions. Extraction/OCR runs separately with bounded attempts, isolated subprocesses, quiet failure flags, and permission-aware full-text retrieval/coverage.
- Added eleven starter configuration templates, a related RFP/oversight data model, recurring permission-checked workspace summaries, and owner JSON exports containing original bytes and history.
- Kept patient suitability as a notice, with no content screening. Formal licence acceptance remains to implement. Internal approvals are not labelled electronic signatures.
- Practical defaults: 25 MiB uploads, 100 MiB temporary preview budget, 24-hour expiry, single web instance until shared preview routing/storage exists. Synthetic loopback demo uses PGlite only; real deployment uses PostgreSQL.
- Verification: production build/type check and eight focused subtests passed (nine counted with parent); local MCP transport tested against the shared permission checks. Local demo started. Browser visual check was blocked by a failed Chromium download. Real PostgreSQL, live identity/ChatGPT, OCR fixture acceptance and production restore have not been verified.
- Next: configure and prove the identity/ChatGPT connection, complete the embedded reusable UI, then work through unchecked DEVELOPMENT.md items. Communications, signatures, retention enforcement and production durability remain explicit unfinished work.

## ChatGPT-first connection and embedded workspace — 2026-10-10

- Confirmed the original platform scope remains unchanged. Work continues in this repository; plugin creator will register the hosted MCP connection rather than rebuild the app elsewhere.
- Verified MCP users can create their local account on first connection and later use standalone sign-in with the same identity. No email-based identity merging and no mandatory standalone onboarding detour.
- Replaced the raw result view with an interactive MCP Apps workspace: select workspace/table, search/page records, add/edit via preview, confirm/discard, install starter templates, and explicitly create a first AI-accessible workspace.
- Added global/thread entrypoints with fullscreen preference. ChatGPT/provider control the OAuth return and resumption; immediate automatic opening remains a live acceptance requirement, not a proven guarantee.
- Verification: build and nine focused subtests passed (ten including parent). No Render deployment, identity-provider setup or live plugin registration performed. The connector requires confirmation of the Render workspace before provisioning.
- Added docs/CHATGPT_SETUP.md with exact callback separation, provider configuration and minimal live acceptance steps.

## Existing authentication inspected — 2026-10-10

- User confirmed Render workspace `tea-cspqipl6l47c739nslfg` and requested reuse of existing authentication approaches rather than assuming Auth0 is needed.
- Read-only inspection confirmed Atablez has self-hosted email/password login and MCP SDK OAuth; Intel has self-hosted email/password sessions and account-bound OAuth consent with a signup/login return path to ChatGPT.
- Selected reuse of those patterns with separate Trialy identities, sessions, scopes, secrets and database. No shared existing-app accounts or infrastructure changes are implied.
- Removed Auth0 as a setup prerequisite and recorded the concrete replacement steps in docs/CHATGPT_SETUP.md. Trialy's external OIDC/JWT adapter has not yet been replaced; no deployment or live authentication test was performed in this inspection.

## Self-hosted authentication implemented — 2026-10-10

- Replaced external OIDC/JWT authentication with Trialy-local signup/login and MCP SDK OAuth, reusing the existing-app approach without sharing their accounts.
- Added migration 003 for local accounts, OAuth requests/clients and hashed access/refresh tokens. Implemented account-bound consent, signup continuation, exact callback return, S256 PKCE, single-use codes, refresh rotation/reuse revocation and CSRF/login throttling.
- Removed external-provider environment requirements and dependencies. Recovery/email verification/MFA and production account administration remain unfinished.
- Build and all 11 reported tests passed, including local HTTP signup → callback → authenticated MCP and negative replay/account-switch checks.
- Created paid Render Postgres `trialy-db` (`dpg-db58k25ckfvc739bb5f0-a`), Frankfurt, PostgreSQL 17/basic 256 MB/1 GB storage. No existing-app resources were changed.
- Prepared Blueprint to adopt the matching database and create web/worker with generated secrets. Dashboard application is pending because the connector cannot apply Blueprints or create a worker. Live ChatGPT registration/auto-opening is not yet verified.

## Render deployment and private plugin — 2026-10-10

- Applied Blueprint in the confirmed workspace using user-approved browser fallback. Associated existing database; created web and worker on Starter in Frankfurt. Both are deployed and real PostgreSQL migrations completed.
- Verified live health, login and OAuth discovery; MCP POST requires authentication and supplies the resource-metadata challenge. No customer data or existing apps were changed.
- Created private Trialy plugin 0.1.0, `Plugin_145611061ed08191b8c73a391b6c6806`, release `pluginrel_6aca8d839e908191a19121a10e4c0c5d`, backed by verified https://trialy-web.onrender.com/mcp. Added reproducible package source and preview/save workflow instructions.
- No new application test suite added for deployment-only work. User OAuth connection, real ChatGPT return/automatic opening and embedded save/read-back remain the next acceptance check, not claimed as complete.

## Shared record history and document reading — 2026-10-10

- Continued Steps 4–6, 8 and 10 while the user-account ChatGPT acceptance check remains pending.
- Added reusable version-history and extracted-text views to standalone and embedded surfaces, plus three permission-filtered MCP read tools.
- Added previewed restoration with reason, exact source/current/schema versions, all-field permission requirement, stale-edit rejection, new revision and preserved approval history. No old approval is reapplied.
- Added standalone document replacement upload preserving older originals. Processing failures remain quiet coverage states.
- Build and 13 reported tests pass; focused new checks cover permission leakage, restore/discard/retry/stale edits, approval preservation and original version integrity. Actual host rendering/automatic opening is still unverified.

- Deployment confirmed: commit `89bbf7b`, web `dep-db596tnavr4c73et7vug`, worker `dep-db596tnavr4c73et802g`; both live. Health 200.

## Configurable saved views and shared layouts — 2026-10-10

- Continued Steps 3, 5 and 6: shared record layouts in both surfaces, including comparison and calendar, plus saved-view configuration for columns, typed filters, sorting, grouping and dates.
- Saved configuration still uses explicit preview/commit and version/audit history. Updates reject stale view versions. Backend applies filters/sorting before pagination; UI identifies page-scoped layouts/groups.
- Views referencing any inaccessible field are withheld and cannot be executed by ID. Added `list_views`; `read_records` accepts an authorised saved-view ID.
- Build and 14 reported tests pass, with one targeted new test for sorting/pagination, history/stale updates and restricted criteria. Actual ChatGPT connection/rendering remains unverified.

- Deployment confirmed for `5ceb14c`: web `dep-db59hijbc2fs738ijneg` and worker `dep-db59hirbc2fs738ijnig` live. Public UI bundle and health verified after web switchover.

## How to maintain history

Append a dated entry after meaningful completed work or a changed decision. Include what changed, why, the affected development step, a short verification result, relevant commit/deployment reference when known, and the next action.

Do not mark planned work as implemented. Keep older decisions visible and mark later replacements explicitly. Do not confuse these documentation entries with document/record version 0 or software release numbers.


## 2026-10-10 — Extended configurable workflow and preservation implementation

- Added atomic CSV/bulk writes, uniqueness and validated person/document references, whole-result aggregates/month filtering, protected numeric calculations and bounded previewed field/data migrations. Stale schema/data previews cannot silently change the confirmed outcome.
- Extended embedded field editing, CSV imports and original upload/download via host-supported APIs; actual ChatGPT file/return behavior still needs host acceptance.
- Added document metadata/review/expiry controls, exact-version acknowledgements, archival/retention/hold policies and readable inspection packages. These are internal approvals, not regulated electronic signatures.
- Expanded the RFP configuration with source-linked weighted evaluations, contracts and change orders; added due/overdue report conditions with current-rights checks.
- Added signup intended-use acknowledgement, own-connection revocation, expired authentication cleanup, database readiness, prepared least-privilege role grants and offline integrity/recovery tooling.
- Replaced memory-heavy pdf-parse with installed Poppler after a synthetic isolated extraction exposed an out-of-memory failure. The replacement passed the same synthetic PDF check. Added quiet bounded CSV/PDF table extraction states.
- Added operations, acceptance, customer responsibilities, migration/cutover and signature-decision documents. Formal signatures remain conditional pending provider and production terms.
- Validation: production build and 18 reported tests pass (17 leaf checks plus parent), including atomic bulk failure, full-result aggregates, formula permissions, stale schema/data migration, preservation and inspector access. Synthetic isolated PDF extraction passed. Deployment verification follows below. Production recovery, provider credentials, real host acceptance and the advanced items left open in DEVELOPMENT.md are not claimed complete.

### Final access-boundary review

- Prevent AI-visible older originals from revealing control metadata or reviewed-version IDs belonging to a later restricted original. Added the case to the document permission check.
- Keep access revocation and pausing available on an archived workspace, and serialize grant changes with workspace commits/worker execution.

### Render verification — 2026-10-10

- Commit `97c143f35ead57c21fe12502844bc4037870134b` deployed successfully: web `dep-db5a487avr4c73eu6gi0`, worker `dep-db5a487avr4c73eu6gmg`; both report live. Migration 004 applied. Health/readiness return 200 and public UI bundle matches `index-CZqj9bjn.js`.
- Live synthetic signup/notice acceptance, authenticated workspace/table/record creation, preview/confirmation, identical retry receipt, formula read-back and full-result numeric aggregate passed against Render PostgreSQL.
- One small synthetic text original downloaded byte-for-byte, matched the exported SHA-256 and reached extraction status ready. JSON and HTML inspection exports succeeded. The synthetic workspace `f405a932-635e-43a7-b581-37d6f7adc241` was archived after verification. No external messages were sent.
- This verifies the deployed basic save/processing/export path, not managed disaster recovery or the real ChatGPT connection/automatic opening. No existing Trialegions service, data or domain was changed.

## Account security and integration sequencing — 2026-10-10

- User deferred real plugin testing and integrations requiring developer accounts until the end. Independent implementation continues without those prerequisites.
- Added standalone account-security controls for password changes and explicit account-wide revocation. Both require the current password and CSRF protection, invalidate all browser sessions, revoke connected-app tokens and account-bound pending OAuth codes/consents, and require a fresh sign-in. Saved clinical work is untouched.
- Session epochs prevent a stale browser session from becoming valid again. OAuth exchanges and consent serialize with account revocation to prevent concurrent token issuance escaping revocation. Already-authorized requests in flight may finish; these controls apply at subsequent authorization checks.
- Added append-only account security activity without storing credentials; latest 20 events are visible only to the account owner. Migration 005 and the prepared runtime role include the new table.
- Basic checks: build passed; existing test suite passed (18 reported), extended for incorrect-password/CSRF rejection, old-password failure after change, other-session invalidation, token invalidation and immutable security activity. MFA and provider-backed recovery/verification remain unfinished. No new provider account or email sending was required.

## Remaining core implementation batch — 2026-10-10

- Added independent table AI exclusions, table-scoped field keys, colleague table selectors/editing, version-checked permission changes, and document-level user/AI rules across reads, search, original downloads, writes and reviews. Restricted inspectors cannot bypass rules through inspection exports/history.
- Added authenticator MFA using maintained otplib, encrypted secrets, replay prevention, single-use hashed recovery codes, enrollment confirmation, login challenges and disable confirmation. No new provider account required.
- Added expiring/revocable bearer links for selected-column saved views and external forms. Immutable source submissions identify respondents as unverified link holders. Duplicate-safe submission and separate owner preview/acceptance preserve the source and create versioned working records atomically. No emails sent.
- Added record/document event-triggered reports and daily schedules in local IANA time zones. Existing grant revocation and execution-time access remain enforced. DST gaps skip a day; repeated times run once.
- Added tracked template baselines and explicit additive upgrade previews, conflict detection and preservation of customer modifications and records. Older untracked installations remain untouched.
- Seven additive migrations (006–012); prepared runtime-role grants and recovery inventory updated. No runtime role/production credential changes applied.
- Build passed. 26 reported checks passed, including focused new access, MFA, intake/shared view, event summary, DST and template upgrade checks. Fixed an old flaky check to inspect protected fields instead of searching random identifiers for a numeric substring.
- Isolated PGlite data-directory backup/restore passed: records, originals, revisions, audits, receipts and queued jobs matched; original bytes and history protection verified. Evidence: docs/recovery-synthetic.json. This is not evidence of a Render managed-backup restore or production RPO/RTO.
- Real ChatGPT/plugin testing, provider registration and publication remain deferred by the user. Remaining independent refinements remain listed in DEVELOPMENT.md; this is not a claim that every original scope item is finished.

- Extended the batch with scoped automated draft creation, atomic grant/receipt/run handling, non-cascading worker changes, due-date gating and visible paused failures. Added inherited folder restrictions and owner-only moves across controlled folders, with focused bypass/revocation checks.

### Deployment evidence

- Code commit `f9cca6bcf840e8c3f18224504a2783ded3d111cc` deployed successfully to both Render services. Web deployment `dep-db5b9r3rjlhs73al3oig`; worker deployment `dep-db5b9r3rjlhs73al3on0`.
- `/ready` returned 200. `/` and `/collect` returned 200 with the current `index-CJeiyYxt.js` bundle. Plugin-host acceptance remains deferred.

## Full-scope continuation — 2026-10-10

- Added owner-created, expiring/revocable single-use colleague invitations, signup/login return to invitation review, explicit recipient acceptance and table-scoped access with AI disabled. No email provider or messages required.
- Added ordered conditional questionnaire rules/help/required answers, server-side hidden-answer rejection, recipient file preview/confirmation, atomic immutable PostgreSQL source intake, duplicate-safe retry and owner acceptance into versioned documents. Exports retain external sources and provenance.
- Added explicit adoption of compatible older template installations, preserving renamed tables/custom extra fields and requiring migration for conflicts.
- Added bounded offline XLSX/PPTX extraction; cached/raw spreadsheet values and slide-order text are labelled partial. Originals survive unsupported or failed processing.
- Build and 29 reported checks passed. The old core-test setup was changed to load every migration, fixing an outdated-schema failure. Recovery rehearsal now includes unaccepted external-file bytes; isolated restore passed (not a managed Render restore).
- Real ChatGPT host testing, provider-account integrations, production recovery decisions and public brand cutover remain deferred. Generalized review routing/action types and optional record restrictions remain unfinished.

Deployment verification: code `c5015cec1b188c3919e1a0118c8d00fedb938b42` is live on both existing Render services. Web deploy `dep-db5bmlc9v7es738vvc1g`; worker deploy `dep-db5bmlc9v7es738vvbug`. `/join` returned 200 with `index-DrExHbhY.js`; `/ready` returned 200/ready. No private-plugin package change, existing-product change or real external messaging occurred.

## Review routing and in-app reminders — 2026-10-11

- Added previewed owner routing to a named reviewer, creating an exact-version in-review revision. Added immutable approve/request-changes/cancel outcomes and idempotent decision retries. Enforced the assignment on the existing approval endpoint too; stale requests cannot approve edited records.
- Added a Reviews & reminders screen with saved-record selection, review instructions/due dates, assigned document reviews and reminder read receipts. Fixed legacy template adoption previews to display the mapping/diff instead of an empty generic record preview.
- Added workspace-scoped once/future self-reminder automations on existing schedule/event/condition machinery. Execution rechecks grants/access; completion and inbox storage are atomic. No external notifications or real recipient messages sent.
- Updated inspection exports, runtime-role SQL and recovery inventory for migration 015. Build and 30 reported tests pass. Managed backup testing, ChatGPT host acceptance and provider setup remain deferred.

Deployment: `b2dce02b15c602f4c58294836b38dc2283d3ca1f` is live on both existing Render services: web `dep-db5bsuivcj2c73ei7pu0`, worker `dep-db5bsuivcj2c73ei7q20`. No plugin package change or new infrastructure/account was needed.

Live read-only verification for `b2dce02`: home returned 200 with `index-DQkJhY92.js`; `/ready` returned 200/ready. Live browser/ChatGPT review-workflow acceptance remains outstanding.

## Foundation scope correction — 11 October 2026

The user clarified that Trialy is currently only a foundation for ChatGPT to use persistent data, execute code and access tools. Templates and specific workflows are not in the current build scope. The user approved keeping the existing project, correcting the architecture and separating reusable infrastructure from rigid business features.

- Created `foundation-reset` from `87adf5d`; no new repository or live infrastructure.
- Replaced README.md and DEVELOPMENT.md with the corrected scope and dependency-ordered foundation plan. The old scope/checklist are preserved under `docs/archive/` and explicitly superseded.
- Added docs/FOUNDATION_ARCHITECTURE.md: responsibility boundaries, proposed execution/broker/data contracts, experiment/commit/function persistence, capability grants, dependency map, retirement/rollback and one generic acceptance example.
- Froze further template/business-feature expansion. The old remaining-feature list is no longer the active backlog.
- No arbitrary-code runtime, general tool gateway or saved-function registry is claimed implemented. Runtime-host selection is a later feasibility decision; extraction subprocesses are not a substitute for an untrusted-code sandbox.
- This checkpoint changes documentation only. No saved records, original files, audit histories, applied migrations, existing schedules or deployed screens are deleted or changed. Last live runtime remains `b2dce02`.
- Validation: checked local Markdown targets in active root/architecture documents and verified the diff contains documentation only. No application tests or deployment were necessary for this checkpoint.

## 2026-10-11 — Foundation execution implementation

Implemented the corrected data/code/tools scope on foundation-reset: extracted permission-filtered data/query/document service; added bounded QuickJS/WASM runtime with JSON-only capability broker, temporary run/proposal staging, exact atomic commits, immutable function revisions, once/future grants, leased jobs/cancellation/recovery, interval/daily/event schedules, source-run audit provenance, result/artifact original-file saves, and shared web/MCP/embedded controls. Generic schema proposals are supported; predefined clinical workflows are not expanded. Legacy management remains explicitly available and existing rules/history/data are preserved.

Migration 016 is additive. No new provider account or Render service is needed. Updated inspection exports, runtime-role SQL and synthetic recovery evidence include saved functions. Pinned runtime: quickjs-wasm-0.32.0-v1. Plugin skill updated in place to the new scope, preserving identity and connection configuration. Actual host acceptance, live external providers, production credentials/recovery policies and managed backup restore remain deferred/open as documented in EXECUTION.md.

Deployment verified: runtime commit `3234b5b12a08db4147bd4f9c1d35e25bb5ce32dd`; Render web deploy `dep-db5ikdjbc2fs738pn0gg` and worker deploy `dep-db5ikdjbc2fs738pn0kg` both live. `/health`, `/ready`, and root returned 200; served bundle `index-D4Z-BT8U.js` matches the built implementation. Initial post-deploy error-log scan was empty. Existing 32 reported regression checks passed; final focused foundation acceptance and production build passed after boundary fixes. Synthetic recovery evidence includes migration 016 and saved functions. No real ChatGPT host session or external provider was exercised.

Private plugin identity and audience preserved. Instructions updated and obsolete template claims removed from its listing. Version `0.2.1`, release `pluginrel_6acb2b134dc881918d6f4fce33d9e84e`; source read-back confirmed the skill, connection and default prompt.
