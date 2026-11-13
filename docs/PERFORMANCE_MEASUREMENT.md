# Performance measurement

Implementation increments of the [reviewed performance scope](scopes/PLATFORM_AND_APP_PERFORMANCE_2026-11-13.md), authorized 13 November 2026. These add measurements, the P04 static-asset fix and safe N2 session-write reduction. They do not change templates, permissions, data, integrations, execution limits or session expiry.

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

## Production verification after release

1. Record the deployed commit and actual web/database instance configuration. Neither this document nor `render.yaml` proves production capacity.
2. Check a real built asset, its conditional response, a missing old asset, HTML deep links and private APIs. Confirm immutable assets have no `Set-Cookie`; missing assets return a non-HTML 404; HTML revalidates; private data stays uncached.
3. Capture authenticated cold/warm Home open, app open, Settings/tab/filter, save acknowledgement, refreshed view and return-to-tab runs. Include one and several workspaces and representative populated apps. Distinguish foreground actions and background work.
4. Compare request counts and p50/p95 time to usable content with database, session and sandbox counters. Check CPU/memory and busy rates from the actual host. Retain exact saves, revocation, app-version and tenant-isolation acceptance.
5. Test the deployed flow in actual ChatGPT and Claude as well as the web. Synthetic host tests do not establish real host acceptance.

Production before/after timings, hosting capacity and live-host acceptance remain pending. P14 is measurement support plus a synthetic baseline, not a completed production performance study. For N2, compare actual `sessionTouchesCoalesced`/`sessionTouchNoops` with session queries before estimating savings. Next scoped change: P02 startup deferral.
