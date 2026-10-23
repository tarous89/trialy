# Database-role rollout and remaining isolation work

## Current boundary

Trialy checks workspace, table, field, project/resource and grant permissions in shared backend services. The deployed database connection remains the original owner connection. The SQL role in `ops/runtime-role.sql` restricts database operations and protects history, but does not implement tenant/field row-level security. Do not describe either the role or the startup audit as RLS.

On 23 October 2026 the connected Render SQL operation could not reach `trialy-db`: its external IP allowlist is empty, and the hosted MCP server has no published source IP to allowlist. That operation is read-only in any case. Leave the private database private. Provision credentials and apply SQL from an authorized private-network shell/job or another approved administrative connection. No credential should be pasted into chat or committed.

## Concrete rollout sequence

1. Establish a dedicated migration job with the database-owner credential. Run `npm run db:migrate`, then apply `ops/runtime-role.sql` against that same database. Keep this credential out of the long-running web/worker environment. Reapply/review role grants after schema additions.
2. Provision a separate login with a generated secret using the database administration interface. It must have NOSUPERUSER, NOBYPASSRLS, NOCREATEDB and NOCREATEROLE, no ownership/owner-role membership, and membership in `trialy_runtime`. Store its connection string in deployment secret storage.
3. Run `npm run db:runtime-audit` with `DATABASE_URL` set to that login. It prints only the role name and privilege findings, never the URL or password. It must return `restricted:true` and exit zero. An owner connection, inherited ownership, schema CREATE, TRUNCATE, or update/delete on protected history fails the audit.
4. Run synthetic account/session, read, reviewed save, original download, public form intake, guest claim, export and worker smoke checks using the restricted login in a staging environment. No production business records should be used as test fixtures.
5. Configure the web and worker with the restricted `DATABASE_URL` and `REQUIRE_RESTRICTED_DATABASE_ROLE=true`. The startup guard then refuses an overprivileged connection. Remove their owner-dependent `preDeployCommand: npm run db:migrate` after moving migrations to the dedicated job; do not make the runtime role a migration owner to bypass this dependency. Deploy both services, verify `/ready`, worker heartbeat, reviewed writes and runtime logs.
6. Keep the dedicated migration job available for roll-forward fixes. Do not automatically restore owner privileges on runtime failures. No schema rollback is required for this additive audit/guard change.

The current Render blueprint still describes the existing owner-backed development setup. It has not been silently switched to credentials that do not exist. The guard remains opt-in until the preceding steps have been verified.

## Tenant/row isolation is a separate remaining implementation

A non-owner role alone still has service-wide permitted table access. Before enabling PostgreSQL RLS, define and test trusted per-transaction actor/workspace context across authenticated API/MCP requests, background workers, public bearer-link submissions, anonymous draft claims, authentication/session storage and exports. Defaults must fail closed, worker/service authority must be explicit, and connection-pool reuse must reset context. Do not enable a partial RLS policy that breaks public forms or gives every worker implicit owner authority. Field projection and resource/record scope checks remain necessary alongside RLS.

## Validation

`tests/runtime-role.test.ts` applies all migrations and the real grant script to isolated PostgreSQL-compatible PGlite, switches roles, verifies denied DDL/TRUNCATE/history mutations and permitted reads, then deliberately grants TRUNCATE and confirms the audit detects the regression. This validates SQL privileges locally, not the production credential rollout or tenant isolation.
