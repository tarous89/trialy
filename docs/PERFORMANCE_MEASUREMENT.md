# Performance measurement

Implementation increments of the [reviewed performance scope](scopes/PLATFORM_AND_APP_PERFORMANCE_2026-11-13.md), authorized 13 November 2026. These add measurements, the P04 static-asset fix, safe N2 session-write reduction, P02 startup deferral and P03 refresh coordination. They do not change templates, permission rules, saved data, integration contracts, execution limits or session expiry.

## Request counters

The existing request log retains `durationMs`, `queryCount`, `databaseMs`, `poolWaitMs` and `metadataHits`. The same allowlisted MCP tool labels now cover both `/mcp` and `/claude/mcp`. New measurements are numeric; SQL, parameters, records, cookies, tokens, capability inputs and outputs are never added to logs.

| Field | Meaning |
| --- | --- |
| `queryCount` | Existing application query calls; excludes transaction/context/session overhead. |
| `databaseRoundTrips` | PostgreSQL driver query invocations, including BEGIN, context setup, COMMIT/ROLLBACK and session-store queries. This is not a count of SQL statements inside multi-statement strings or individual wire-protocol messages. |
| `transactions`, `contextSets` | Transaction starts and context-setting calls, including failed attempts. |
| `postgresMs` | Sum of measured driver-call durations. Session calls include their internal pool wait; ordinary transaction checkout is separately reported in `poolWaitMs`. |
| `sessionQueries`, `sessionMs` | Session-store subset of database calls and elapsed time, including reads and touch writes. Session behavior is unchanged. |
| `sessionTouchesCoalesced` | This request shared an already-running write for the same session and exact expiry. The underlying driver call/time is counted once, on the initiating request; every waiting request still includes the wait in its total duration. |
| `sessionTouchWrites`, `sessionTouchNoops` | Rows updated by optimized expiry writes, and expiry queries that updated zero rows. A no-op can mean either unchanged expiry or an already-deleted session. These are not counts of session creation or changed session-data saves. |
| `sandboxRuns`, `sandboxMs` | Custom sandbox executions and total elapsed execution time, including startup and capability waits. Failed executions count too. |
| `sandboxStartupMs` | Fork-to-ready elapsed time, including child loading, WASM/runtime/context initialization and notification delivery. A failure before ready has no ready duration. |
| `capabilityCalls`, `capabilityMs`, `capabilityBytes` | Host capability calls, handler/serialization time and serialized result bytes attempted. No contents or capability arguments are recorded. |
| `runtimeBusy` | Published/draft custom runtime admission rejections for this request. |

Timings overlap and must not be added together. Startup is part of sandbox time; database work may occur inside a capability. These counters do not isolate IPC time, pure calculation time, CPU throttling or browser rendering. Logs describe completed HTTP responses; host cancellations and transport timing require separate tracing. Compare distributions on the same workload rather than a single request.

## Reproducible synthetic baseline

Run `node --import tsx scripts/profile-app-performance.ts`. It executes the immutable catalog source in the production QuickJS sandbox, using only bundled fictional records and mocked read capabilities. It opens each app and then navigates to Settings. A second fixture expands one table to 250 rows. It never contacts a database, connector, email provider or customer workspace.

Observed on 13 November 2026, before changing any template loading strategy:

| App | Expanded table | Demo rows across tables | Reads per open / Settings | Expanded rows across tables | Reads per open / Settings |
| --- | --- | ---: | ---: | ---: | ---: |
| Runway 2.1.0 | `runway.plan_lines` | 54 | 13 / 13 | 291 | 15 / 15 |
| Programs 2.1.0 | `programs.plan_items` | 47 | 10 / 10 | 272 | 12 / 12 |
| Contracts 1.0.0 | `agreements` | 64 | 9 / 9 | 298 | 11 / 11 |

These are `records.read` capability counts, not SQL or HTTP counts. Programs and Contracts each make one additional integration call. All loaded rows were returned on both open and Settings in these fixtures. The emitted timings are local diagnostics only: the fixture has no database/network cost and one observation per case, so it cannot establish production latency or forecast correctness.

The existing populated page fixture (`tests/page-performance.test.ts`: five trackers, 25 records) remains 32 application queries for Home, 28 for Access, 8 for Database rows, 10 for Logs and 5 for the catalog. The production-adapter test independently verifies one standalone application query incurs four driver calls, while two queries in one transaction incur five. Do not apply one multiplier to arbitrary mixed workloads.

## P04: asset behavior and acceptance

Vite's public `/assets` directory is served before session middleware with `public, max-age=31536000, immutable`. Missing, forbidden and invalid asset requests stop in that route; they cannot return SPA HTML. HTML from `/`, `/index.html` and deep links uses `no-cache`. Unhashed fonts/images retain revalidation; authenticated APIs retain their existing access checks and `no-store`.

The signed-in HTTP fixture uses the real session store and authorization middleware with a mocked PostgreSQL driver. An existing hashed asset required six driver calls with the previous middleware order and zero with the new order. The new route emits no session cookie. Conditional requests, CSS/HEAD, missing assets, hidden files, traversal, API authentication and session revocation are checked. This is an observed removal of database work, not a claimed production time saving.

## N2: redundant session writes

The session store rounds expiry to seconds. Overlapping `touch` calls for the same session and exact expiry now share an in-flight query; the entry disappears on success or error. The SQL updates the row only when the expiry differs. This also avoids duplicate row updates from another server instance, although those requests still issue their own query. Saves, deletes and pruning clear in-flight sharing; changed session data is persisted immediately. No session content, permission decision or completed query result is cached. There is no batching delay or background write queue.

The proposed hourly throttle is deliberately excluded: skipping a write can leave the stored expiry earlier than the rolling cookie, while adding expiry grace extends server validity. This narrower N2 implementation retains the existing expiry, cookie refresh, current session-version checks, failure callbacks and logout behavior. Single requests and isolated 30-second polls still refresh expiry normally. The benefit depends on actual request overlap and is smaller than an hourly write cap.

An actual `connect-pg-simple` store backed by PGlite, using the production session schema and a row-update trigger, produced this local comparison:

| Workload | Previous store | Optimized store |
| --- | ---: | ---: |
| 12 overlapping touches for one session/exact expiry | 12 driver queries, 12 row updates | 1 driver query, 1 row update |
| Later touch with the identical expiry | 1 query, 1 row update | 1 query, 0 row updates |
| Touch with a different expiry | 1 query, 1 row update | 1 query, 1 row update |

The separate real-auth fixture sends 12 signed-in requests: all 12 still read the session, check `session_version` and receive the rolling cookie, while only one expiry row update occurs. Tests also cover separate sessions/expiries, multiple store instances, failures and retries, concurrent save/delete boundaries, shorter expiry, expired sessions, immediate CSRF/MFA-state saves and account revocation. These are synthetic checks, not production latency measurements.

## P02: defer unrelated startup reads

The web shell no longer reads workspace-wide `/types` and `/views` when opening Home, modern Database or a direct saved-app/draft link. Database retains its own paged account catalog and row reads. Legacy screens and access editors request the metadata they consume; legacy functions opened from Home load schemas for that function’s workspace. Requests are scoped to the current user/workspace, late responses are ignored after leaving that scope, and failed loads offer retry. Metadata stays in memory only.

Collapsed Apps, Automations, table and field archive lists call the existing `list_archived_items` capability with optional `summaryOnly:true`. The response contains an authorized count and an empty `items` array. Expanding a section uses the original detailed read for restore/delete controls, record counts and dependency warnings. A section remembered as expanded intentionally loads details on reopening. Failed reads expose retry; collapsed or unmounted sections discard late detail replies. The same shared UI is used by the web and embedded hosts.

The summary preserves the existing workspace/tenant, owner/creator, ancestor, app and assistant access checks. It skips record/automation inventories and schema deletion-usage scans. It is **not a constant-query app count**: the existing per-app `component` authorization checks still run. Default reads and template-filtered archive discovery retain their detailed behavior unless the caller explicitly requests a summary. There are no migrations, template changes, app data changes or integration-contract changes; installed and planned templates do not require edits.

| Synthetic workload | Before | P02 |
| --- | ---: | ---: |
| Web Home or direct app/draft opening: unrelated workspace metadata requests | 2 (`types`, `views`) | 0 |
| Two permitted archived apps: application database queries | 18 (full details) | 14 (collapsed summary) |
| Details while an archive section is collapsed | Full inventory | Authorized count only |

The archive fixture runs with the runtime database role and row-level security. It compares detailed and summary visibility for owners, app creators, ancestor/app restrictions, explicit deny rules, ChatGPT/Claude access and unrelated accounts. It also exercises all archive kinds and retains restore, deletion, template discovery and purge checks. Browser regressions cover startup request absence, Database navigation, direct saved/draft links, legacy schema/view loading, failures/retry, late replies, remembered expansion, restore/delete and embedded summary/detail calls. These checks establish requests and work removed, not production latency savings. P03 below replaces repeated full Home polling with metadata checks.

## P03 — coordinate refresh and access checks

The shared scheduler merges focus/visibility event bursts over 100 ms, spaces automatic starts by at least one second and keeps one read in flight per subscription. It does not cache completed responses or replay writes. The web account check also shares its pending `/api/me` read. Temporary account errors retain the mounted app and draft; actual 401/403/404 responses clear the signed-in view. Hidden documents pause automatic checks. Mounted apps inside an inactive platform panel pause their checks and recheck when shown again.

Home still loads on opening, returning to the tab/panel, changing filters/pages, local mutations and retry. While Home remains visible, its 30-second timer uses `/api/account/home/revision` (app-only MCP tool `check_account_home`) instead of rebuilding previews and archives. A full account Home read supplies the baseline revision. An unchanged revision leaves Home and the archive list mounted; a changed revision clears both before an authorized reload, so a failed reload cannot leave revoked content visible. A temporary check failure retains usable content. Ordinary record-value edits do not invalidate this metadata stamp: Home thumbnails receive those values on return or the next full load. Open-app access/version checks remain periodic and never execute generated code; explicit app Refresh still executes normally.

The opaque revision hashes current actor-scoped workspace membership and metadata tuple identities (`xmin`), including types, app/project permissions, project record membership and document/folder restrictions. Other tenants cannot affect it. PostgreSQL hashes each metadata group before returning it, so database-to-server output is bounded. It reads no record values, source or document bytes, and sends only a hash to the client. It is an invalidation hint, never an access grant or write token. Existing full-read permission checks, final freshness checks and all write authorization remain in place. Home remounts when the embedded viewer identity changes; a failed replacement for the same viewer retains the existing app. The stamp is taken before content so a concurrent change cannot certify earlier content as current. No authorization result is cached across requests.

| Populated synthetic Home fixture | Before P03 | P03 |
| --- | ---: | ---: |
| Idle Home timer: application queries, excluding separate account/archive calls | 32 (full Home) | 4 (metadata check) |
| Full Home read: application queries | 32 | 33 (includes baseline revision) |
| Unchanged idle/return metadata: additional archive reads | Every Home refresh | 0 |

These are application-query counts, not latency or database round-trip measurements. The revision query still scans metadata and project-membership rows, so cost grows with their cardinality; it is not constant database work. Production latency and larger-account cost need measurement after release.

Superseded web Home requests use `AbortController`; the server stops abandoned Home reads at stage/loop boundaries after any active SQL finishes. This does not cancel SQL already executing, nor the unrelated sandbox execution work scoped elsewhere. The MCP host bridge has no request cancellation API, so embedded superseded replies are ignored. A host with an older tool catalog falls back to the original authorized full Home read until its catalog updates. Installed and planned templates, app features and integration contracts require no changes. Actual ChatGPT/Claude host acceptance remains pending; local embedded tests use a synthetic host. The request metrics allowlist labels both Home tool names without recording arguments. Background progress-bar presentation is still P06.

Validation includes deterministic scheduler checks, runtime-role/RLS revision and cancellation checks, REST authentication/no-store and MCP registration checks, and web/embedded browser scenarios for merged events, hidden panels, late replies, retry, revoked access, retained drafts and explicit Refresh. Production build/type checks and 19 focused backend checks pass. Across the focused browser runs, 72 distinct scenarios pass, including all 37 cases in the final continuity/app/refresh run. Full CI and deployment status remain on [PR #155](https://github.com/tarous89/trialy/pull/155).

## Production verification after release

1. Record the deployed commit and actual web/database instance configuration. Neither this document nor `render.yaml` proves production capacity.
2. Check a real built asset, its conditional response, a missing old asset, HTML deep links and private APIs. Confirm immutable assets have no `Set-Cookie`; missing assets return a non-HTML 404; HTML revalidates; private data stays uncached.
3. Capture authenticated cold/warm Home open, app open, Settings/tab/filter, save acknowledgement, refreshed view and return-to-tab runs. Include one and several workspaces and representative populated apps. Distinguish foreground actions and background work.
4. Compare request counts and p50/p95 time to usable content with database, session and sandbox counters. Check CPU/memory and busy rates from the actual host. Retain exact saves, revocation, app-version and tenant-isolation acceptance.
5. Test the deployed flow in actual ChatGPT and Claude as well as the web. Synthetic host tests do not establish real host acceptance.

Production before/after timings, hosting capacity and live-host acceptance remain pending. P14 is measurement support plus a synthetic baseline, not a completed production performance study. For N2, compare actual `sessionTouchesCoalesced`/`sessionTouchNoops` with session queries before estimating savings. Next scoped change: P06 foreground/background progress feedback, then basic P12.
