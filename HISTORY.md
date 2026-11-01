# Trialy — Project History

This file records meaningful decisions and completed development work. It is not the application's customer-record audit trail.

- [Scope and decisions](README.md)
- [Current development plan](DEVELOPMENT.md)

## Explicit automation status and current template guidance — 1 November 2026

Automation rows now show Enabled or Disabled as a readable badge on both desktop and mobile, independently of the action button label. Template guidance 1.3.6 distinguishes no automation, ChatGPT processing, standalone scheduled/database email and processing-to-email handoffs. It includes concrete authoring examples, current recipient/delivery safeguards and minimal UI expectations. Definition state remains distinct from connection readiness and delivery outcome; no scheduling or permission behavior changes.

## Simple automations and guarded email — 1 November 2026

Release 0.2.41 implements the approved notification scope with daily-or-slower email schedules, explicit database transitions, two-minute settling and current-state/access checks. Pending items coalesce, recipient deliveries are serialized globally (one/hour) and per account (15/rolling day), and ordinary limits defer delivery without disabling the rule. Bounded queue growth suspends abnormal rules. Research and its receipts remain independent of email failures. Migration 051 cancels unsent legacy app emails and fences old workers; unsafe legacy definitions pause for review.

Desktop/mobile authoring retains app/name, schedule/condition, instructions or message and approved team recipients. Backend controls are hidden. Dynamic template guidance 1.3.5, automation guide 1.2.0 and app-services guide 0.7.0 describe the same contract. Local verification includes synthetic bulk, revocation, idempotency, concurrency/budget and emergency-stop scenarios; no real emails are used in tests. Deployment verification is recorded separately after rollout.

## Definition-only automations and app-filtered Logs — 1 November 2026

Release 0.2.40 simplifies Automations to full-width app-linked instructions with trigger/frequency and direct Disable/Enable and Edit. Empty lists no longer display search, pagination, history or shared daily-runner settings. Sidebar order is Home, Database, Access, Automations, Connectors, Logs.

Logs now includes research and platform action run metadata, app filtering and CSV attribution, while preserving owner/current-app access checks and withholding private payloads. New app writes carry verified app context; existing unattributed database events are not guessed. Additional filters wrap in normal flow on both surfaces. Template guidance 1.3.2 and current context reflect these boundaries. No scheduler, app publication or database migration is required by these management changes. Validation covers 178 backend tests and 80 browser scenarios, including current-access filtering, run metadata privacy, empty states, draft preservation and inline filter geometry at desktop/mobile widths.

## App configuration and shared automation management — 1 November 2026

Release 0.2.39 shipped in [PR #86](https://github.com/tarous89/trialy/pull/86), commit `345eb6bb55ccd23110ac73d5690dd75bdea5ac27`. Both Render services were verified live; migrations and public MCP smoke checks passed. CI: 177 backend tests, 75 browser tests, build and production browser verification.

Added Projects/app/optional-tab access, unified app-linked Automations with reviewed schedule/prompt editing and history, disabled-state preservation, archive suspension, and repeated shared-runner setup guidance. Existing apps remain unchanged. Research uses the shared ChatGPT event connection; platform actions handle email. Model/reasoning preferences remain requested and unverified.

Live unattended activation was not established: worker signing storage and host event discovery/subscription remain explicit checks. [Current context](CONTEXT.md) and [operator setup](docs/OPERATIONS.md#shared-automation-activation) distinguish deployed code from activation. Shared template guidance and blueprint instructions now use this contract, including an explicit no-automation path and failure-isolation acceptance.

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

## Shared database and saved-component product clarification — 2026-10-11

Documentation-only update following explicit user agreement. No runtime, migration, deployment or customer-data change in this task.

- Expanded the active product definition to connected shared data maintained during normal work, projects/folders hosting ChatGPT-created components, and tools/workers with granular access and audit/version history.
- Added source observations, aliases, project-specific facts and reversible AI-led reconciliation. Preserve originals and alternatives; scoped ongoing maintenance need not ask about every normalization. Ambiguous identity never grants access or external-action authority.
- Added stable component identities/revisions, arbitrary generated-interface hosting within a supported isolated runtime, permission-aware moves/drag and drop, shared data bindings, external collection and cross-chat reopening.
- Replaced the execution-only roadmap with nine dependency-ordered development steps for the full clarified product. Archived the earlier execution checklist without changing historical completion evidence.
- Removed the minimal execution UI as the completion target and the exclusion of generated UI hosting. Retained the exclusion of fixed templates, business workflows and hardcoded action catalogues; user-generated workflows remain in scope.
- Retained Render/Postgres/original-file storage, self-hosted auth, preview/save and scoped future permissions, quiet extraction failure, source preservation, existing histories and lean testing. Provider accounts, conditional signatures, production recovery and publication remain explicit dependencies.
- Marked user-driven ChatGPT testing as started, without asserting complete host acceptance or treating unbuilt features as implemented.

## Database layers and interface behavior clarification — 2026-10-11

Documentation only; no runtime/deployment changes.

- Accepted platform/common/customer-specific schema layers, flexible ChatGPT-designed fields/types, inspect-before-create, contextual roles, record/schema reconciliation and logical customer isolation in shared PostgreSQL.
- Replaced study as a proposed common concept with general-purpose project; study remains an optional specialization. Project containers and their semantic relationships use one identity. Retained optional location; no required education concept.
- Recorded editable-by-default interfaces within permissions, authorized source inspection, and detail pages or short modals instead of below-content expansion.
- Added INTERFACE_RULES.md to separate these preferences from a proposed binding-based edit policy: live record updates versus presentation edits, protected calculations/snapshots and no silent overrides. Same-session versus later-session editing is not recommended as the authority boundary. Detailed editing semantics await user feedback.
- Updated roadmap contracts and UI tasks; preserved historical checklists and existing implementation status.

## Task-driven setup and scoped automatic maintenance approved — 2026-10-11

Documentation-only update; no application behavior or deployment changes.

- New structures are justified by multiple entries, repeated steps/actions, tracking/workflows or expected future growth, even with one initial record. Reuse existing authorized structures first; review and approve setup and maintenance scope.
- Within approved fields, relationships, purpose and inclusion criteria, automatically extract relevant facts, add eligible records and reconcile/update existing ones under revocable permission, without per-entry approval.
- Passing mentions do not create tables/columns or whole-message archives. Explicitly stored original files remain preserved. Scope applies to information available through authorized work, not every ChatGPT conversation.
- Explicitly requested structure changes require reviewed expansion; approved new fields can be populated from permitted sources and maintained thereafter. Preserve uncertainty, prior facts and reversible reconciliation.
- Updated active scope, architecture and roadmap, with focused capture-boundary acceptance checks. Existing implemented status and separately proposed interface edit semantics are unchanged.

## Projects and approved maintenance implementation — 2026-10-11

- Added additive migration 017: project/folder nodes, temporary database-backed workspace previews, maintenance scopes, durable receipts, immutable record observations and reversible identity links. No legacy records are deleted.
- Added shared Projects UI to standalone and embedded clients, separate detail/review screens, drag/drop and explicit moves, setup review and revocation. New project organization requires full workspace access until finer project permissions exist.
- Maintenance pins approved schema versions, tables, writable fields, operations and batch limit. Atomic writes reuse existing validation/audit/revisions and receipts; schema changes/revocation stop subsequent maintenance. Inclusion/source meaning is judged by ChatGPT, not a deterministic semantic classifier.
- Identity linking is non-destructive, same-table and reversible. It does not merge query output, rewrite historical relationships or implement general canonical-entity resolution yet.
- Added REST/MCP tools, source-evidence reads, export/inspection coverage and runtime-role grants. Plugin instruction update 0.2.2 preserves identity, audience, endpoint and default prompt.
- Basic validation: production build and 33 reported tests passed, including a synthetic capture/identity/permission/rollback scenario. Real ChatGPT UI acceptance remains unverified. Runtime `55dbeaf` is live on the existing Render web and worker services. Migration 017 applied successfully. Web deployment: `dep-db5oh0c9v7es7399vulg`; worker: `dep-db5oh0c9v7es7399vupg`. Private plugin 0.2.2 release `pluginrel_6acb88bb19c08191aa2022aebafded77` was read back with preserved endpoint, audience and default prompt. Initial runtime error scan was empty.

## 11 October 2026 — Saved component foundation

- Added durable source/configuration in projects, reviewed saves/moves/archive/recovery, immutable revision history, and source editor in web/ChatGPT workspace.
- Recovery creates a new revision without moving the component or duplicating shared records.
- Added conservative full-data-access checks for saved source, including AI field restrictions; generated HTML/JavaScript remains inert.
- Extended MCP/REST, export and synthetic restore coverage. Build and all 33 reported tests pass. Full ChatGPT rendering and production backup restoration remain unverified.
- Granular project/component sharing and generated interface execution remain next; no new provider, infrastructure cost, or fixed workflow was introduced.

Deployment: `ec9c67e` is live on the existing Render web and worker services. Initial error-log check is empty. No plugin package change or new resources were required; existing ChatGPT connections may need a tool refresh to discover the component read tools.

## 11 October 2026 — Project permissions and initial live interfaces

Added migration 019, inherited human/AI restrictions, owner-reviewed sharing and restriction-preserving moves. Pending confirmations, maintenance, observations, history and export honor the new boundaries. Added the generic `trialy-ui-v1` runtime for composed text/layout and live editable tables; confirmed cell edits update shared records. HTML/JavaScript remain inert source. Richer blocks, arbitrary frontend code, partial-data component access and provider/function integration remain pending. No new paid resources.

Deployment: `cb220b8` is live on the existing Render web and worker. Build, 34 reported tests, focused live-edit/access checks and synthetic restore passed; health/readiness returned 200 and the new interface bundle was verified. Initial deployment error logs are empty. Private plugin 0.2.3 (`pluginrel_6acb8fdc26e88191a143c0b25448c9ec`) was updated and read back; identity, audience, connection and default prompt were preserved. Actual ChatGPT/browser interaction remains unverified.

## 11 October 2026 — Correct frontend scope to code hosting

The user clarified that ChatGPT writes frontend code and Trialy stores/runs it. The custom text/table catalogue direction was a deviation. New authoring of `trialy-ui` is disabled, with existing data/history retained. Added migration 020, `frontend-js` isolated JavaScript render/event execution, HTML/CSS frame hosting, declared data reads and exact reviewed database-write proposals. Added read-only code previews before save, custom form/button events and unchanged component organization/access/history. Standard browser DOM/React/npm code and external providers are not implemented. Local Chromium launch was blocked by the environment, so browser/ChatGPT acceptance remains open.

Deployment: `bba0be6` is live on the existing Render web and worker. Build, 36 reported tests, focused frontend bridge checks and synthetic restore passed. Health/readiness/root/frame returned 200; bundle `index-HZ6lFYLU.js` and sandbox/CSP headers were verified. The rollout logs contained SIGTERM shutdowns of the previous instances; the subsequent error window was empty. Private plugin 0.2.4 (`pluginrel_6acb9569ccfc8191bdb03a034fbf981f`) was published and its changed files read back. Browser and real ChatGPT interaction remain unverified because Chromium could not launch locally.

## Durable data and file previews — 2026-10-11

Moved the remaining ordinary data/file previews from process memory into PostgreSQL (migration 021). Any replacement service can confirm the original preview ID/digest; binary originals are staged as bytea and transferred into original storage in the same transaction as metadata/history/receipt. A successful save removes its staging row atomically, retries return the receipt, failed or stale saves keep the draft until discard/expiry. Ownership and current authorization are checked at confirmation.

Previews expire after 24 hours and remain outside authoritative revisions/inspection exports. Limits are 1,000 previews/100 MiB per workspace, serialized against concurrent admissions. Periodic cleanup failures are logged without unhandled promise rejections. Infrastructure backups can retain staged content until those backups expire. Existing in-memory drafts from the old process cannot be migrated and require re-preparation on this one-time rollout; previously confirmed records are unaffected. No new resources, paid accounts or plugin package changes.

Validation: production build and focused service-replacement/file-integrity/expiry/permission tests, alongside the existing suite. Real ChatGPT/browser acceptance and managed-backup recovery remain open.

Runtime commit: `a8c0002`, additive migration 021. The existing 36 tests passed; the new focused persistence test passed after correcting its test-fixture parameter types. Build passed. No browser/ChatGPT acceptance claimed.

## Scope correction: explicit database-write approval — 11 October 2026

The user superseded automatic maintenance by default. Every database change must have a visible exact review and approval unless the user explicitly granted longer-term permission for that data type. Existing schema/task approval is not future-write authority. Longer-term permissions cannot be general workspace-wide write permissions. Every changed field value must retain before/after history linked to the exact approval or versioned grant, including changes made under longer-term permission. A fixed Changes and permissions area in both surfaces must support inspection, permission management and reviewed reversal as a new audited change.

Updated README, DEVELOPMENT, INTERFACE_RULES and the detailed WRITE_AUTHORIZATION contract. Moved enforcement, field-level authorization evidence, shared UI and safe reversal ahead of further automatic-maintenance work. This update changes scope/roadmap only; runtime and plugin enforcement are pending implementation. No customer data, grants or deployed runtime were changed by this documentation update.

## Approval enforcement, identity reads and component execution — 11 October 2026

Implemented migrations 022–023. Ordinary commits, workspace confirmations, function saves and grant/schedule approval require an authenticated human session. Embedded buttons open the secure standalone Changes & permissions review; model tool access alone cannot approve. Task scopes default to proposals; longer-term maintenance requires explicit autoWrite, one data type and expiry. New function grants pin one type, fields, schema version and expiry; old grants are retained but cannot write. Legacy fixed record-writing jobs pause.

Added immutable field-level before/after logging (including null versus unset and calculated fields), exact approval/grant references, permission-filtered history/export, recoverable pending reviews and grant management in both surfaces. Current-field reversal creates a new audited correction; stale versions, controlled records and unsafe required/derived changes are rejected. No historical approval evidence was fabricated. Full change-set reversal and some richer filtering remain open.

Added candidate search and accepted identity-group reads preserving originals, conflicting facts, observations and incoming references. Bounded functions can use entities.search/entities.read within declared types; no semantic auto-merge or relationship retargeting.

Saved components now declare exact owned function bindings and optional existing type-specific grants. Runtime functions.invoke stages up to three invocations per event, admitted atomically after successful render; functions.status reads the attached run. Generic UI/API run/status/cancel and componentContext schedules reuse the worker. Component version/access/archive and field coverage are checked before execution, after computation, on read and before writes. Source restore clears execution bindings. No external provider/account/paid infrastructure added.

Production build, all 38 reported tests, the focused duplicate-run admission rollback check, and isolated synthetic backup/restore passed for this checkpoint. Real browser/ChatGPT acceptance and managed production backup restore remain unverified.

Deployment: `f79f269` is live on the existing Render web and worker, migrations through 023. Web deploy `dep-db5sdmn40ujc73cq6o9g`, worker `dep-db5sdmn40ujc73cq6odg`. Health/readiness/root returned 200 and the current bundle is `index-BcT69dvP.js`. Private plugin 0.2.5 (`pluginrel_6acbc73edba48191bfded228547ac363`) was published and its changed files matched on readback; identity, audience, connection and default prompt were preserved. Rollout error entries were SIGTERM shutdowns of the old 14:07 instances, not failures of the new runtime. Real ChatGPT/browser acceptance remains open.

## 11 October 2026 — Reviewed batch reversal and history filters

Implemented selected field reversal across records through the same durable preview/human approval path. Multiple selected fields on one record become one validated correction/version; all records succeed together or none are changed. Later edits, hidden/derived fields, controlled records and invalid resulting values are rejected. Original history remains immutable and the reversal records the original change IDs.

New saved field deltas include a unique data-commit receipt ID, independent of a reused standing permission. REST/MCP and Changes & permissions support record, actor, date range, authorization kind/ID and saved-batch filters. Selection is explicit and limited to the current visible page. No schema migration, new infrastructure or external provider was introduced. Creation archival and real browser/ChatGPT verification remain open.

Added name search across accessible projects/folders/components and reviewed saved-component copies. Copies retain inherited source restrictions and destination access, preserve data bindings, have independent version-zero history with source provenance, and clear all function bindings. They never duplicate records, worker grants or schedules. Focused checks cover stale source rejection, AI access denial, sticky restrictions, cleared execution authority and idempotent save.

Validation: production build passed. The full 39-test suite passed after the history changes; the four focused authorization/workspace checks passed again after component copying. Browser/ChatGPT acceptance is still pending.

Deployment: commit `ee919f97936ad1be2ca9a72ecb1d399c5ad9c464` is live on the existing Render web (`dep-db5tf62vcj2c73f1g0lg`, 18:39:12 UTC) and worker (`dep-db5tf62vcj2c73f1g0pg`, 18:39:01 UTC). Health, readiness and root returned HTTP 200; the root serves `index-BwiHEkQu.js`. No error-level logs appeared in the checked post-deployment interval (18:39:13–18:39:29 UTC). Private plugin identity, connection and packaged version 0.2.5 are unchanged; the existing MCP endpoint serves the added operation/filter schemas. No real-host interaction acceptance is claimed.

## 11 October 2026 — Retained entry and project archival

Implemented reviewed archive/restore for unchanged new draft records. Whole-record access, current version and cross-workspace-type dependency checks protect linked work without exposing restricted values. Original data and field history are retained; each state change creates a revision and immutable audit event containing the exact authorization. Changes & permissions adds an Archived entries view with reviewed restoration. Active reads and aggregates exclude archived records; explicit archived/all queries retain access. Corrected input reversal/restoration validation for calculated fields so derived values are recalculated rather than treated as editable inputs.

Migration 024 adds owner-reviewed project/folder archive/restore with inherited state and exact descendant review. Archival clears component execution bindings in new revisions, revokes task scopes and pauses attached schedules. Restore retains those stopped permissions. Repeated component checks prevent old run contexts from resuming after restoration. Shared records and independently invoked workspace functions remain separate from project organization. Both web and embedded UI expose the new controls. No external provider, paid resource or customer-data deletion was introduced.

Validation: production build, four focused authorization/archival checks and synthetic PGlite backup/restore passed with migration 024. The broad run reported 40 passing checks and a native V8/WASM allocation crash in the execution test file (not an assertion failure). Both execution tests passed when rerun separately. Actual managed Render restore and browser/ChatGPT interaction verification remain outstanding.

Deployment: runtime `3bb1ccc79b054b2e345a1262c4c7726413b65ea3` is live on Render web (`dep-db5u6v3bc2fs739506j0`, 19:30:10 UTC) and worker (`dep-db5u6v3bc2fs739506n0`, 19:29:57 UTC), with migration 024. Health and readiness returned HTTP 200. No error-level logs appeared in the checked 19:30:11–19:30:31 UTC interval. The private plugin identity and packaged version 0.2.5 remain unchanged; new tools and UI are served by its existing MCP endpoint. Browser/ChatGPT interaction acceptance remains pending.

## 11 October 2026 — Shared project records and contextual facts

Migration 025 adds stable project-record associations, immutable candidate field values and immutable retractions. Reviewed linking/unlinking preserves a single shared record and all history. Current project and field access apply to reads; affiliation with a project never expands record permission. Candidate facts include source labels, rationale and optional project/date context. A reviewed undated global preference updates only the named main record through the existing field ledger; contextual claims remain contextual. The shared project UI exposes records, sources, candidate preferences, withdrawals and authorization evidence.

Added a scoped entities.facts code capability and a ChatGPT-directed backfill tool. Backfill is always preview-only until human confirmation, even with a standing grant, and only fills absent/null/empty fields on existing in-scope records. Source extraction/semantic judgment remains ChatGPT's role. Export, restricted-role SQL and synthetic recovery inventory include all new tables. Generated frontend record reads now honor the active-record archive filter consistently with standard APIs. Broader schema semantics, alias propagation, original-source citation binding and real-host UI verification remain open.

Validation: production build passed; nine focused shared-data, authorization, workspace and frontend checks passed. The expanded shared-data test also passed with mandatory backfill review and declared-table facts capability checks. Synthetic backup/restore passed with actual project links, a candidate and its withdrawal included in the inventory. No real browser/ChatGPT acceptance or managed Render recovery is claimed.

Deployment: runtime `23bede148d39cf3bb4479c31bee6e39728b1454a` is live on the existing Render web (`dep-db5uij2vcj2c73f2rujg`, 19:54:54 UTC) and worker (`dep-db5uij2vcj2c73f2rung`, 19:55:06 UTC), with migration 025. Health and readiness returned HTTP 200; the checked post-deployment error log interval (19:55:07–19:55:23 UTC) was empty. Private plugin identity and packaged version 0.2.5 are unchanged; its existing MCP endpoint serves the new tools and shared UI. No real ChatGPT/browser interaction verification is claimed.

## 11 October 2026 — direct cross-table identity claims

Added migration 026 and reviewed pair-specific field correspondence between records from different tables. Both originals and current values are preserved; every link/withdrawal requires human confirmation with current schema, version and access rechecks. Same-table maintenance grants and `entities.read` remain unchanged. REST/MCP reads and a separate shared-project comparison page show mapped differences and withdrawal evidence. Added export, archive-dependency, runtime-role and synthetic recovery coverage. No provider, account, resource or plugin-package change is required. Live deployment verification follows below; real host acceptance remains outstanding.

Verification: production build passed; seven focused cross-table/workspace/write-authorization checks passed, plus the shared-records scenario. Synthetic restore passed with populated cross-table link and withdrawal evidence. This remains an isolated PGlite rehearsal, not a managed Render restore. Browser/ChatGPT acceptance remains open.

Deployment closeout: runtime `ee74524185b17a9462e00ff420d6ec1744079929` is live on the existing Render web (`dep-db5uq5vavr4c73fgq8og`, 20:11:33 UTC) and worker (`dep-db5uq5vavr4c73fgq8lg`, 20:12:27 UTC). Pre-deploy migrations completed through 026. Health, readiness and root return HTTP 200; the root serves `index-EFLH4Dcy.js`. Private plugin identity, audience and package 0.2.5 remain unchanged; runtime tools are served by the existing MCP endpoint. Real ChatGPT acceptance and custom-app tool metadata refresh remain unverified. No user action or new account is required for the next implementation step.

Post-deploy log review found npm SIGTERM messages from the previous web process (its log began at 19:54:41 UTC) during replacement. These are recorded as shutdown messages, not evidence of a new runtime failure.

## 11 October 2026 — reusable reviewed table mappings

Added migration 027: immutable named field correspondence, append-only revocation and optional mapping references on cross-table links. Added reviewed save/revoke operations, permission-filtered REST/MCP listing and a shared Projects mapping-detail screen. Reusing a mapping still requires a separate human-approved record-link preview. Table direction, schema changes, hidden fields and revocation are enforced at confirmation; old links and originals remain unchanged. Export, restricted-role provisioning scripts and synthetic restore include the new evidence. No infrastructure, provider or plugin-package changes are needed.

Verification: production build and both focused cross-table/mapping scenarios passed. Checks cover human-only approval, stale schemas, revoked pending links, table direction, original/link preservation, hidden-field and workspace isolation, and immutable history. Synthetic restore with a populated mapping, linked record and mapping revocation passed. Real ChatGPT/browser acceptance and managed Render backup restore remain unverified. Deployment closeout follows.

Deployment: runtime `3f1fdafd7a9d3f5c49f3ce9bc315aea01d50cdf3` is live on the existing Render web (`dep-db5uvk3rjlhs73b6ngg0`, 20:22:48 UTC) and worker (`dep-db5uvk3rjlhs73b6ng9g`, 20:22:39 UTC), with migration 027. The initial post-deploy error-log window 20:22:39–20:22:58 UTC is empty. Private plugin package 0.2.5, identity and audience remain unchanged; MCP changes are served by the existing endpoint. No new paid resource/account or user decision is needed for the next step.

Health, readiness and root each returned HTTP 200 after deployment; the root serves the new `index-Bw7JulAV.js` bundle.

## 11 October 2026 — remaining foundation implementation and deployment

Migrations 028–031 add component document-version assets, owner-reviewed binding-scoped source release, worker health and optional common concept tags. Added atomic reviewed tracking setup; project relationship queries and bound frontend project/file reads; selected direct linked-value corrections; reviewed collection links/response acceptance; component drag/drop and owner operational status. Preserved approval-by-default, exact per-field history, original files and generic ChatGPT-authored code. No provider accounts, paid infrastructure, patient screening or templates introduced.

Roadmap consolidated into implemented foundation and explicit host/provider/production gates. Plugin source prepared as 0.2.6, preserving presentation, private audience, MCP binding and default prompt. Focused checks and populated synthetic recovery are recorded with final deployment evidence below.

### Verified deployment closeout

- Foundation commit `d91cbecf9565700e8654685c27c5acda08e7749a`; final runtime `4552f771a5647381d46b573a3ad5f825ea4773d3` (adds a tested AI guard for retired fields in historical collection responses). Both main and foundation-reset contain the changes.
- Render web deploy `dep-db5vdmvavr4c73fhg9v0` live 20:52:50 UTC; worker `dep-db5vdmvavr4c73fhg9rg` live 20:52:36 UTC. Migration predeploy succeeded through 031. Web bundle `index-C3KIO62n.js`; health/readiness and root return 200.
- Private workspace plugin 0.2.6 published as `pluginrel_6acbf6e9976c8191b2c42fef0dad7f89`. Readback verifies version, updated guidance, unchanged MCP endpoint and default prompt “Open my Trialy workspace.” Audience remains private. Updating this package does not refresh a separately configured custom app's tool metadata automatically.
- Build/type-check passed. Eight nearby focused scenarios passed; final combined and cross-table scenarios passed after bridge changes; the retired-field regression passed. Populated synthetic backup/restore passed through migration 031, including concept metadata, assets/source access, task setup and accepted responses. Evidence: docs/recovery-synthetic.json. No broad cosmetic testing added.
- Direct production SQL inspection was unavailable because the database's external allowlist is empty; networking was not broadened. Deployment and migration logs were inspected. No actual managed-backup restoration, production credential rotation or real ChatGPT/browser acceptance is claimed.
- Remaining gates and known runtime limits are in DEVELOPMENT.md. No new paid infrastructure, external provider account, recipient message or public publication occurred.


## 20 October 2026 — Approved field capability upgrade

Extended the existing foundation with permission-aware multi-reference fields, stable table/field references, typed read-time QuickJS computations and cross-table lookups, dependency checks, current-value queries, column renderers and graphical timelines. Shared app/embedded selectors and bulk editing retain exact review and version checks. Stored records are not rewritten by derived reads. Definitions are versioned through existing schema/view revisions. See docs/FIELD_CAPABILITIES.md for limits and host acceptance boundaries.

## 2026-10-20 — Anonymous tracker-to-account transition

Added isolated 24-hour tracker/page previews, persistent workspace save footer, account signup/sign-in return, explicit human account review, atomic import through existing audit/version paths and idempotent save receipts. Reused Intel connection/recovery behavior with the requested one-day retention. Protected account tools still require OAuth; no new grants or existing-data access. Guest-save integration test and full build/backend suite cover the change; real ChatGPT/browser acceptance remains unverified. See docs/GUEST_SAVE_FLOW.md.

## Customizable tools and interaction repairs — 2026-10-29

**Release:** 0.2.22; commit associated with this entry. No database migration or customer-record rewrite.

- Treat Vivid as an unchanged default preset; remove design-exception gates and allow saved tools to adopt custom interfaces while retaining data/access contracts. Dashboard edit capability follows explicitly reviewed bindings rather than its display category.
- Add persisted theme tokens, scoped CSS, custom tab icon paths, and Style settings. Explicit column appearance overrides semantic defaults; ordinary categories and multiple text values stay plain.
- Add Settings tab/column creation and removal, reviewed atomic schema additions, visibility/delete icon buttons, and spacing. Removing a view retains shared tables/records.
- Use one paginated Overview next-steps area; fix multiple-value Add/Remove focus and cached-value mutation; expire dismissible save notifications.
- Prefetch neighboring tabs and next pages with controls, retain bounded session snapshots for two minutes, coalesce pending tab clicks, and preserve permission/version revalidation and invalidation after writes.
- Validation: production build and type check; 104 backend tests; 15 browser scenarios including real Settings saves, brand overrides, pagination, multi-value keyboard editing, cache navigation after 20 seconds, and desktop/mobile preset parity. Plugin instructions independently forward-tested for branding and custom board requests without live writes. Actual ChatGPT host behavior still requires a user session check after publication.

### 2026-10-29 — Account page performance
- Reduced repeated metadata reads with per-read reuse and uncached final verification.
- Batched the database catalog; shared identical thumbnail samples; streamlined authorized audit reads.
- Removed duplicate Access loading and off-screen Tools polling; retained all UI and interaction contracts.
- Added query/connection timing diagnostics and performance/security/browser regression coverage.
