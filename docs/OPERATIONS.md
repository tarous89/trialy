# TrialAgents operations and recovery

Development environment only. These procedures do not establish a production recovery guarantee or regulatory certification.

## Shared automation activation

Current operator handoff for release 0.2.39, recorded 1 November 2026 (Europe/Berlin). App availability does not depend on completing these steps. The historical operational notes below retain their original scope; use [current context](../CONTEXT.md) and the [automation engine](scopes/APP_AUTOMATION_ENGINE_2026-10-31.md) for this feature.

1. In [trialy-web](https://dashboard.render.com/web/srv-db58ppo473hc73a9ds10), open **Environment** and copy the existing `CONNECTOR_ENCRYPTION_KEY` value. In [trialy-worker](https://dashboard.render.com/worker/srv-db58ppo473hc73a9ds00), set the same variable to the exact same value and select **Save and deploy**. Do not generate a replacement, overwrite the web key, log the value or put it in chat/GitHub. Existing encrypted credentials/subscription signing material depend on that key. The Render connector cannot read it; use the secure dashboard.
2. Verify the worker deploy and its `app_services_ready` event: `automationSigningStorageConfigured` must be true. This boolean proves key presence only, not that it matches or that subscription decryption works. Verify signing/decryption through the authorized subscription cycle; never print secrets as proof. Keep email configuration independent of ChatGPT readiness.
3. Refresh the existing custom MCP connection at `https://platform.trialagents.com/mcp` and start a new Work chat. Verify current management/setup tools, event discovery, the actual host subscription and an unattended no-write verification cycle. Follow [ChatGPT setup](CHATGPT_SETUP.md#current-connection-and-automation-setup). Do not invent callbacks or replace event delivery with polling without an explicit design decision.
4. Record server release, worker deploy, connection state, actual host task/subscription identifiers and verification receipt in owner-only operational records. Never put secrets, private identifiers or customer prompts in public documentation. Distinguish approved/enabled definitions from connection readiness and completed work.

At the 0.2.39 release check, signing storage was false and this host exposed only GitHub events plus an older TrialAgents tool catalog. These are dated observations: recheck after configuration/metadata refresh. If TrialAgents remains unavailable, inspect host/plugin event support and workspace controls; refreshing alone does not guarantee activation. Local/foreground tests and accepted callbacks do not prove unattended execution.

Keep `APP_AUTOMATIONS_ENABLED=false` available on web/worker as the independent automation kill switch. Preserve queued work, receipts and app data during troubleshooting. Never bind `/health` or ordinary app requests to optional scheduling health. Disable stops new/uncommitted effects; it cannot undo already committed writes or dispatched emails.

References: [Render environment variables](https://render.com/docs/configure-environment-variables), [OpenAI MCP Events](https://developers.openai.com/plugins/build/mcp-events).

## Runtime and migrations

Use a single web instance while previews are in memory. Saved records and originals live in PostgreSQL; previews can disappear on restart. The worker can restart without losing committed originals or queued work. Extraction gets two attempts and then a quiet availability flag.

`DATABASE_URL` is the runtime connection. `MIGRATION_DATABASE_URL`, when set, is used only by `npm run db:migrate`. Apply `ops/runtime-role.sql` with the migration owner, provision a separate non-owner runtime login and grant it membership in `trialy_runtime`. Keep the migration credential out of the running web/worker environment where the deployment system supports a separate migration job. The existing development deployment still uses its original database owner connection; role separation is prepared, not applied. Test a save, original download and worker run after changing credentials. Update role grants when adding tables.

`/health` is process liveness; `/ready` queries PostgreSQL and returns 503 if unavailable. Configure infrastructure checks against `/ready` after deploying it. Monitor database capacity, connection use, web 5xx, restarts and worker failures. Extraction failures alone are not user alerts. Missing or corrupt originals require operational investigation.

## Backup and restore exercise

Before customer onboarding, agree retention, acceptable recovery point (RPO), recovery time (RTO), geographic requirements, budget and who is on call. Configure a Render database plan with the selected recovery capability and independently verify the actual retention/recovery settings. A transaction receipt is not protection against regional loss or a damaged backup.

1. Stop synthetic writes for a repeatable drill and save `npm run recovery:inventory --silent` output to an access-controlled evidence location. It reads a consistent snapshot, counts key tables and verifies every original's byte size and SHA-256 without printing file contents.
2. Create a provider recovery point or PostgreSQL custom-format dump using a compatible `pg_dump`; use secret environment/configuration rather than credentials in command history. Store encrypted backups outside the app container. Apply the agreed access and retention policy to backups, too.
3. Restore into a **new isolated database**, using a compatible `pg_restore`. Never restore over the live database as a routine test. Do not connect its worker, outbound email or calendar adapters until isolation is confirmed.
4. Run the migrations and `npm run recovery:inventory --silent` against the restored database. Compare table counts and the sorted original ID/checksum list to the baseline. Test one login, existing record revision, original download and idempotent save receipt with synthetic data.
5. Record backup timestamp, restore start/end, measured recovery point/time, source and restored commit/schema versions, count/hash comparison and operator. Preserve failure evidence and repeat only the failed part after correction.
6. Cut over only after verification; revoke old credentials and invalidate sessions/tokens when the incident requires it. Retain the old database until verification and the agreed retention period permit its removal.

A workspace JSON/HTML export is an inspection and portability copy, not a complete service backup: it omits authentication, tenant membership, job leases and secrets. `npm run export:verify -- workspace.json` verifies original bytes and current record/revision correspondence offline. Never import a workspace export by overwriting audit rows.

## Incident and change procedure

For an unconfirmed save, check its receipt before retrying. For an unavailable original, stop affected changes, preserve diagnostic IDs and infrastructure evidence, investigate database/payload integrity, and restore to an isolated target. Keep document contents, session secrets and tokens out of logs/tickets.

Every code change records the problem, commit, migration impact and focused verification in HISTORY.md. Verify build and relevant checks before deployment. Backward-compatible additive migrations can roll forward; inspect schema compatibility before rolling back application code. Never roll back a database by deleting audit history. Record operational incidents, access changes and provider recovery actions separately from user business history.

## Infrastructure migration

The app and worker run in Docker; PostgreSQL contains originals and application state. Move a consistent database backup with IDs, checksums, histories and sequences intact; verify as above. Keep the public URL stable if possible. Changing it requires OAuth issuer/callback and ChatGPT connection checks, cookie/session treatment and reconnecting clients where needed. This is manageable migration work, not an instantaneous host switch. Large bytea originals increase backup duration and database size. The original-store adapter provides an eventual object-storage seam; that migration still requires a verified copy and controlled reference cutover.

## Customer responsibilities and offboarding

The customer designates an accountable workspace owner, reviewers, access approvers and retention owner. Before relying on a configured workflow, they assess its intended use, fields, calculations, sources, reviews and applicable record requirements. Template installation does not validate arbitrary later configuration. Document and train users on preview versus saved work, source coverage flags, human approval and the patient-data limitation. Clinical/medical operations records are within intended scope; patient-level processing and regulated signatures are not claimed.

Review hosting, AI-host and future communications/signature suppliers for the actual contracted services, regions, access, subprocessors, incident contacts and recoverability. Record the assessment, contract versions and responsible owner; this code repository is not evidence of executed supplier agreements. Log corrective actions with an owner, cause, change and verification when an incident requires them.

For offboarding, confirm an authorized owner, remove AI and colleague access, export and verify originals/history, archive the workspace, and retain data/backups according to the recorded retention/hold requirements. This application intentionally has no destructive customer-record deletion endpoint. Any eventual disposal workflow needs documented authorization, hold checks, due-date checks and treatment of backup copies; do not bypass preservation triggers or erase history during ordinary support.


## MFA encryption and new access surfaces

MFA uses otplib TOTP and AES-256-GCM encryption bound to the account ID. `MFA_ENCRYPTION_KEY` may supply a stable secret of at least 32 characters; otherwise the stable `SESSION_SECRET` is used through a domain-separated HKDF. Preserve that source key separately with recovery material. Do not rotate it blindly: existing encrypted authenticator secrets need controlled re-encryption before a key change. Secret decryption failure must not bypass MFA. Manual authenticator setup avoids sending secrets to external QR services. Recovery codes are shown once and stored only as hashes. Email/password recovery is still provider-dependent.

External links are bearer capabilities. Only share with intended recipients; recipients can forward them. Tokens are shown once, placed in URL fragments and sent in a dedicated request header. Do not log that header. Revocation stops future fetches/submissions, not copies already downloaded. External responses are unverified statements, not authenticated approvals or signatures.

Migrations 006–012 add permission rules, MFA state, external exchange, an audit event sequence tracked template baselines, record automation actions and folder rules. Apply migrations before new code. Apply the updated runtime-role grants when that role is introduced, including sequence usage. These migrations preserve existing original/history rows. A rollback of MFA-enabled application code must never reintroduce password-only login; roll forward or restrict sign-in while repairing.

`npm run recovery:rehearse` performs a fully isolated synthetic PGlite backup/restore and updates `docs/recovery-synthetic.json`. It never accesses Render. The successful rehearsal covers original byte integrity, record/history/audit/receipt/job correspondence and append-only protection. The managed Render restore procedure above remains unexecuted.

## Invitation links and external file intake

- Owners create single-use invitation links for explicit existing tables and a viewer/editor/inspector role. Initial AI and document browsing are disabled. These are bearer invitations, not email-verified identities; share them privately through an existing channel. Revocation stops unused links; remove colleague access after acceptance. Retries never reapply removed access.
- Invitation tokens are hashed server-side and carried in fragments/headers. The join page temporarily keeps the token in tab session storage while signup/login completes and clears it after acceptance. Invitations expire within 1–30 days (UI: seven). No email provider is needed.
- Form rules support ordered questions, help text, required-when-visible answers and equality conditions on earlier visible answers. Required table fields cannot be conditional. Hidden answers are dropped in the browser and rejected at the API. Schema changes still invalidate existing links.
- Optional file requests accept up to three files per response, at most 5 MiB each; each link has a 100 MiB cumulative file cap. Original bytes, checksums and immutable intake save in the same transaction as the response. A receipt is returned only after commit. Retrying a nonce with changed answers/files fails.
- Source files stay outside the working document register until an owner previews/confirms acceptance. Acceptance creates version zero, preserves the unverified external provenance and starts normal quiet extraction. Files start AI-disabled. Revoke a filled request and issue a new one if capacity is needed; no automatic source deletion occurs.
- JSON/HTML inspection exports include external intake and original attachments. Export verification checks attachment checksums too. Restricted runtime SQL grants insert/read only for immutable intake; apply separately when runtime credentials are provisioned.

## Office extraction additions

The worker image includes Python 3 for offline XLSX/PPTX reading. Limits: ZIP 5,000 parts / 50 MiB expanded; XML part 8 MiB; 128 MiB process address space / 45 CPU seconds; 60-second child timeout. No XML entity declarations, formulas, macros or external relationships execute. XLSX reads up to 50 sheets / 5,000 cells each, retaining sparse cell positions and cached formula values (no recalculation or display-format/date conversion). PPTX reads up to 200 slides in presentation order; notes, images and chart internals are not extracted. Output is capped and always marked partial. Unsupported/encrypted/corrupt files retain their originals under the existing bounded-retry, quiet-unavailable behavior.

## Adopting legacy templates

An owner explicitly maps every canonical template table to a different existing workspace table, then previews/commits. Adoption requires compatibility with current template field definitions/relationships, preserves renamed tables and additional local fields, and changes only the tracked baseline. Conflicts require a separately reviewed schema migration; no historic template version is invented. A concurrent schema change invalidates the preview.

## Review routing and self-reminders

Use Reviews & reminders to choose a saved record and eligible reviewer, then preview/confirm the request. Routing creates a new in-review record version. The assignment remains open when the record is edited and becomes stale; owners cancel it before requesting a new review. Existing approval routes enforce this assignment. Request changes returns the exact reviewed record to draft with a new revision. Cancellation preserves the current record. All outcomes remain immutable. Only unrestricted human editors/owners can decide; formal electronic signatures are not provided.

For scheduled in-app reminders, create a `reminders.create` permission for the workspace in Access, choose once/future, and configure a Remind me in TrialAgents automation. Only the owner configures this action; it targets the same user, not colleagues or external recipients. The worker stores the run and reminder in one transaction with grant consumption. Empty due-date conditions take no action. Revoked access/grants pause the rule. The inbox rechecks current permissions and only marks entries read, never deletes them. Latest-run detail is bounded to 50 runs, while the inbox shows up to 100 reminders. No derived extraction failures generate these reminders.

Migration 015 adds immutable request, decision, reminder and read-receipt tables. Include them in recovery inventories and future managed restore checks. The previous synthetic restore evidence ends at migration 014 and remains labelled accordingly.

## Foundation execution (migration 016)

See [EXECUTION.md](EXECUTION.md). Migrate before deploying the web/worker pair. The existing worker now dispatches code jobs separately from legacy rules; no additional resources are provisioned. Forward migration 016 only adds foundation tables and an audit provenance column. Existing approvals, sources and histories remain intact.

Rollout: push the tested foundation branch, fast-forward main, verify both Render deployments, `/health`, `/ready`, and recent worker logs. Rollback application code to `b2dce02` if needed, leaving additive migration 016 and its saved data intact. Pause foundation schedules first when the new API is available; the older worker does not process those schedules. Never drop saved-function/history tables to roll back a UI.

The latest synthetic restore evidence includes migration 016 and saved functions. It still does not establish managed Render restore success, production RPO/RTO, no-loss failover or clinical validation. Temporary run staging can occur in infrastructure backups; retention/erasure policies must account for their lifecycle before onboarding customers.

## Operational health and current production gates

Migration 030 adds a worker heartbeat every 15 seconds and last success/error times. Human owners can open Projects → Operational status to see worker freshness (90-second threshold), workspace run/extraction counts and stored-original bytes. These are operational indicators, not proof of backup integrity or guaranteed job completion. Quiet extraction failures stay available as source-coverage flags. Production alert delivery remains dependent on a configured provider.

Apply `ops/runtime-role.sql` with a migration/table-owner connection, then grant the role to a separately provisioned non-owner login and use that login for web/worker runtime. Run migrations with separate owner credentials. Do not assume merely committing this SQL changes deployed credentials. The connected Render SQL tool is read-only. Choose retention/RPO/RTO and an isolated restore target before a real managed recovery rehearsal. `npm run recovery:inventory` is read-only; `npm run recovery:rehearse` uses synthetic local PGlite, never customer data.
