# PostgreSQL runtime isolation

Migration 035 enables row-level security on workspace-bearing tables and parent-scoped revisions, payloads and extractions. Every pooled application query runs in a transaction with transaction-local actor/origin/capability context. Missing context denies workspace rows; commit/rollback clears context before connection reuse. Authenticated API/MCP, account claims, public links and invitations establish their own validated context.

Record policies additionally enforce workspace/table membership and AI table restrictions. Authorized members can still discover table schema without reading records. Public form submissions are limited to the presented link and response nonce. Quota helpers return only capacity booleans while counting all submissions. Public view projection, JSON field restrictions, document/folder rules, resource/project scopes and write approvals remain enforced in the shared backend. This is not SQL-level JSON-field masking. Authentication/session and anonymous draft storage remain service-level tables protected by their backend handlers.

The web role cannot obtain worker authority by setting a context variable. Worker context is accepted only for a login inheriting `trialy_worker`. That service role processes jobs across workspaces; each automation/function still applies its existing actor/grant checks. RLS trusts authenticated context set by backend code; it is not protection against arbitrary code execution with application credentials.

## Deployment

The existing Render pre-deploy hook has private-network database access. `npm run db:migrate` applies migrations and, when configured, provisions a restricted login through `scripts/provision-runtime.ts`. The database remains private; external SQL access is not required.

Each service receives a distinct random URL-safe secret (43–128 characters) in `TRIALY_RUNTIME_PASSWORD`, plus `TRIALY_RUNTIME_KIND=web` or `worker`. Provisioning is serialized and idempotent. It applies `ops/runtime-role.sql`, creates/updates `trialy_web_login` or `trialy_worker_login`, and grants only the corresponding runtime group. Provisioning errors expose a SQLSTATE, never the password or statement. Keep secrets in Render, never Git or chat.

At startup `runtimeConnection` uses the database host/name from `DATABASE_URL` with the restricted login, replaces the JavaScript environment URL, removes bootstrap secret variables and enables the mandatory runtime audit. The audit rejects owner authority, elevated role flags, schema CREATE, TRUNCATE, mutable protected history and missing workspace RLS. A successful startup logs `runtime_role_verified` with only the role name. `npm run db:runtime-audit` uses the same connection selection.

Roll out code first, then merge the per-service secret variables into Render and deploy both services. Verify pre-deploy success, both role-verification log entries, `/ready`, worker processing and authenticated MCP reads. Do not silently restore owner privileges if the restricted connection fails. Reapply grants through migrations after schema changes. New workspace tables must have RLS policies or startup fails.

**Credential boundary:** the owner URL still exists in Render service configuration for the pre-deploy hook and inherited bootstrap environment. Removing it from `process.env` does not remove platform-level access or erase the original OS environment. Complete owner-secret separation requires moving migrations to a dedicated job and configuring only restricted URLs on web/worker. This rollout restricts the connections actually used by application queries; it does not claim that stronger credential separation.

## Verification

- `tests/database-isolation.test.ts`: missing actor, two-workspace reads/writes, mismatched table/workspace, restricted-table schema discovery, concurrent transaction context, web/worker separation, reviewed writes, extraction jobs, public nonce isolation and aggregate quotas.
- `tests/runtime-role.test.ts`: actual denied DDL/TRUNCATE/history mutations and audit regression detection.
- `tests/runtime-provision.test.ts`: idempotent provisioning, both login groups, secret replacement and privilege audits.
- Exchange, invitation and guest-claim HTTP tests run their handlers under the real restricted SQL role, including signup, review, retries, revocation, public file intake and existing-table reuse.
- `scripts/test-connected-browser.ts` uses the restricted role for real app requests, cookie sessions and CSRF, then checks tracker rendering, field/revision revalidation and session revocation in Chromium.

PGlite tests exercise PostgreSQL policy semantics locally. Live role logs and authenticated reads verify deployment separately. Manual ChatGPT iframe/navigation and approval-return acceptance is a distinct host check; a passing standalone browser test does not prove that UI flow.
