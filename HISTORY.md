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
