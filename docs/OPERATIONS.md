# Trialy operations and recovery

Development environment only. These procedures do not establish a production recovery guarantee or regulatory certification.

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
