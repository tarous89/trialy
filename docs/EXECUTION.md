# Execution foundation — implemented contract

11 October 2026. This describes code, not a compliance certification or production recovery guarantee.

## Runtime and hosting

The first supported language is JavaScript, pinned to `quickjs-wasm-0.32.0-v1` with an explicit empty dependency manifest and tool catalog `trialy-capabilities-v1`. There are no user-installable dependencies. Material adapter changes must change the catalog version and require new reviewed function revisions/grants. A program is a synchronous function body with `input` and `tools.call(name, input)` / `tools.list()`. Return a JSON value. It is interpreted by QuickJS inside a fresh WebAssembly instance, never Node eval or Node vm. The guest cannot access Node objects, environment variables, files, network, subprocesses, modules or provider credentials. All broker arguments/results cross as JSON strings. Imports and asynchronous guest functions are unsupported; broker calls transparently wait for the host.

Each run has its own disposable child process as a lifecycle boundary, a WASM memory with a hard 64 MiB maximum (verified at initialization), 16 MiB QuickJS heap limit, 256 KiB guest stack, 15-second wall deadline, 1 MiB result/proposal bounds, 100 tool calls and 4 MiB total broker responses. The child receives a sanitized environment. Parent timeout/cancellation kills the child; the WASM boundary—not merely the subprocess—isolates code from the host. The interpreter and Node/WASM implementation remain trusted dependencies and need security updates. This is not an independently assessed sandbox or a general Python/OS container.

This runs in the existing Render worker image using the pinned npm package. No new service, credentials, disk or provider account is needed. One worker executes one program at a time. Queue admission allows five pending runs, 200 submissions per user per 24 hours and a 50 MiB soft temporary-storage budget (already admitted bounded runs can finish); 50 function previews per user. These are development limits, not a sizing guarantee.

## Data and tools

`src/domain/data-service.ts` is the shared permission-filtered record/query/document layer. Existing callers inherit it through Service. `src/foundation/data.ts` applies the run's narrower table/document scope. The capability gateway accepts trusted server registrations only; discovery returns version, effect class and input schemas. No arbitrary method names or URLs reach the database/server.

Capabilities: tables.list, records.read, records.aggregate, views.list, documents.list, documents.text, documents.search, changes.propose, schema.propose and test.echo. Reads use current AI permissions even when execution was launched from the standalone app. Hidden fields cannot influence queries/aggregates. Programs can paginate and join authorized results in JavaScript within the call/read budgets. `test.echo` is a synthetic adapter, not a live external integration.

Record proposals accept create/update changes with exact expected versions. Schema proposals accept user-defined tables, migrations and views. Schema changes always need explicit confirmation; record-write grants never authorize schema changes. File artifacts are returned as JSON `{artifacts:[{filename,mime,base64}]}` and saved through a separate original-file preview/confirmation; a whole result can also be saved as JSON. Saved originals use existing PostgreSQL byte storage, checksum validation and quiet asynchronous extraction.

## Experiment → save

Experiments and function previews are temporary PostgreSQL staging rows, excluded from immutable official revision history and inspection exports. They survive a web restart but expire after 24 hours; workers remove expired rows. Infrastructure backups can retain expired staging rows until those backup copies expire. Do not promise immediate erasure from backups or label experiments as saved work. A selected result becomes saved only after original-file confirmation.

A completed run binds its exact proposed operations to the run/user/workspace, program/input digest, current schema/data and access fingerprints. Any intervening workspace data/configuration change makes a proposal stale. This intentionally conservative first implementation favors correctness over unrelated-write concurrency. Confirmation applies that stored write set, never re-executes source. All local writes, revisions, provenance and durable receipt commit together. Failed batches roll back. Repeated confirmation returns the original receipt. Temporary request idempotency lasts while the 24-hour run row exists; committed receipts do not expire with it.

Function save is a separate exact preview and immutable revision with runtime, source, capability manifest and top-level input/output type/required-key contracts. Saved functions are private to their creator within the workspace for now. Function save grants no effects. Earlier exact revision IDs remain readable/invocable. Arbitrary dependency installation and full JSON Schema validation are not implemented.

## Background execution and permissions

Queued runs use leases and up to two claims after worker interruption. Failed user programs are not blindly retried. Cancellation stops queued/running work; it cannot undo committed effects. Current access is checked during broker calls, after computation and before effects. Permission changes hide old temporary results. A revoked grant blocks the next operation/commit.

Once/future grants bind user/workspace, exact function revision, allowed destination table IDs and maximum record changes per invocation. They do not grant additional data visibility. One-time grants are consumed atomically with writes. Code editing, a new function version, or schema proposal does not inherit a record-write grant. Invocations without a selected grant remain preview-only.

Schedules bind exact revisions and fixed inputs. Interval, daily IANA-time-zone and record/document event triggers are supported by the API; the minimal UI offers interval scheduling. Events coalesce ordered audit batches, poll every minute, and exclude code-generated audit events using source_run_id to prevent self-trigger loops. Daily timing reuses the DST-aware clock. A schedule cannot overlap its own pending run. Permission/dispatch failure pauses that schedule. Automatic commit recovery uses the same immutable receipt; there are no external write effects to retry.

## UI, compatibility and evidence

The default workspace presents data, documents, code/functions/runs, history and access. The embedded app uses the same execution backend. Human confirmation tools have app-only host visibility; do not mistake that metadata for independently verified human identity or a regulated electronic signature. Real ChatGPT OAuth return, app-only controls, auto-opening, files and cross-chat acceptance remain explicitly deferred.

`/?legacy=1` keeps management/history for existing business rules and reviews. The old runner remains separate and active; no data or histories are deleted and no rule is translated into code. Shared generic reads were extracted; the proven commit/validation implementation is still shared with legacy operation handlers. Further physical module splitting can happen without changing the foundation contract.

JSON/HTML inspection exports include saved functions/revisions/grants/schedules/receipts. Temporary run/source/results are omitted. The synthetic backup/restore rehearsal now includes immutable saved functions, original byte checks and history protection through migration 016. This is not a restore of a managed Render backup.

## Boundaries still requiring later work or decisions

- Live external provider adapters, tenant connection credentials, provider-specific idempotency/reconciliation and external write consent. No remote write adapter is enabled; the gateway rejects unknown tools. ChatGPT's own connected tools are not inherited by a worker.
- Actual ChatGPT host acceptance (deferred by the user).
- Production runtime database credentials, monitoring/alerts, retention/recovery/geography decisions and an actual managed backup restore. Existing runtime-role SQL includes new tables but has not been applied to production identities.
- Public name/domain cutover and any regulated electronic-signature provider are separate decisions.

Do not create new paid resources or claim production/clinical validation to fill these gaps.
