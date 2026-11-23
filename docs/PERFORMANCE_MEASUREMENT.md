# Performance measurement

Implementation increments of the [reviewed performance scope](scopes/PLATFORM_AND_APP_PERFORMANCE_2026-11-13.md), authorized 13 November 2026. These add measurements, the P04 static-asset fix, safe N2 session-write reduction, P02 startup deferral, P03 refresh coordination, P06 loading feedback and basic P12 save/reload feedback. They do not change templates, permission rules, saved data, integration contracts, execution limits or session expiry.

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
| `runtimeBusy` | Published/draft custom runtime admission rejections (queue full/per-user limit/wait expired) for this request. |
| `runtimeDetached` | Frontend executions whose started host call exceeded the five-second stop grace and continued in the background, with the same app/user key still blocked. |
| `runtimeQueued`, `runtimeQueueMs` | Requests that waited for admission and their wait duration, including expired waits; separate from sandbox time. No actor/app identifiers are recorded. |

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

Home still loads on opening, returning to the tab/panel, changing filters/pages, local mutations and retry. While Home remains visible, its 30-second timer uses `/api/account/home/revision` (app-only MCP tool `check_account_home`) instead of rebuilding previews and archives. A full account Home read supplies the baseline revision. An unchanged revision leaves Home and the archive list mounted; a changed revision clears both before an authorized reload, so a failed reload cannot leave revoked content visible. A temporary check failure retains usable content. Ordinary record-value edits do not invalidate this metadata stamp: Home card sample rows **and record totals** receive current values on return or the next full load. While the tab remains continuously idle, a collaborator's record addition/edit does not refresh either preview field. Open-app access/version checks remain periodic and never execute generated code; explicit app Refresh still executes normally.

The opaque revision hashes current actor-scoped workspace membership and metadata tuple identities (`xmin`), including types, app/project permissions, project record membership and document/folder restrictions. Other tenants cannot affect it. PostgreSQL hashes each metadata group before returning it, so database-to-server output is bounded. It reads no record values, source or document bytes, and sends only a hash to the client. It is an invalidation hint, never an access grant or write token. Existing full-read permission checks, final freshness checks and all write authorization remain in place. Home remounts when the embedded viewer identity changes; a failed replacement for the same viewer retains the existing app. The stamp is taken before content so a concurrent change cannot certify earlier content as current. No authorization result is cached across requests.

| Populated synthetic Home fixture | Before P03 | P03 |
| --- | ---: | ---: |
| Idle Home timer: application queries, excluding separate account/archive calls | 32 (full Home) | 4 (metadata check) |
| Full Home read: application queries | 32 | 33 (includes baseline revision) |
| Unchanged idle/return metadata: additional archive reads | Every Home refresh | 0 |

These are application-query counts, not latency or database round-trip measurements. The revision query still scans metadata and project-membership rows, so cost grows with their cardinality; it is not constant database work. Production latency still needs measurement. Larger synthetic account profiles and their limitations are recorded in the review follow-up below.

Superseded web Home requests use `AbortController`; the server stops abandoned Home reads at stage/loop boundaries after any active SQL finishes. This does not cancel SQL already executing, nor the unrelated sandbox execution work scoped elsewhere. The MCP host bridge has no request cancellation API, so embedded superseded replies are ignored. A host with an older tool catalog falls back to the original authorized full Home read until its catalog updates. Installed and planned templates, app features and integration contracts require no changes. Actual ChatGPT/Claude host acceptance remains pending; local embedded tests use a synthetic host. The request metrics allowlist labels both Home tool names without recording arguments. P06 below makes routine background work quiet in the global progress bar.

Validation includes deterministic scheduler checks, runtime-role/RLS revision and cancellation checks, REST authentication/no-store and MCP registration checks, and web/embedded browser scenarios for merged events, hidden panels, late replies, retry, revoked access, retained drafts and explicit Refresh. Production build/type checks and 19 focused backend checks pass. Across the focused browser runs, 72 distinct scenarios pass, including all 37 cases in the final continuity/app/refresh run. Full CI and deployment status remain on [PR #155](https://github.com/tarous89/trialy/pull/155).

## P06 — foreground progress and quiet background work

The web API helper and embedded tool adapter now share local `background` request options. The global progress bar counts only foreground waits; a background request can neither start the bar nor keep it visible after the last foreground operation settles. The existing 150 ms delay and main-column positioning remain unchanged. The option is transport/UI metadata only and is never included in API bodies or MCP arguments.

| Operation | Feedback |
| --- | --- |
| Initial account/Home/app load, navigation, filtering, paging, explicit retry, explicit Refresh and saves | Existing foreground bar after 150 ms, plus existing local loading/busy states |
| Routine account/app-access/Home revision checks and automatic return-to-tab Home refresh | Quiet global bar; existing content stays usable, and errors/revocation still follow their existing paths |
| Home reload after metadata invalidation | Local Home skeleton while potentially revoked content is replaced; quiet global bar |
| Collapsed archive count | Quiet global bar; failures still show the archive error and Retry |
| Expanded archive details | Existing local loading text and foreground bar |
| Optional standard-tracker tab/page prefetch | Quiet global bar |
| User navigation joining an already-pending prefetch | Foreground progress for the user's wait, without issuing another request |

The runtime tracks foreground consumers outside its existing in-flight read coordinator. This preserves visible feedback when a click shares a prefetch and keeps the transport call from being counted twice. Save proposals, confirmations and receipt/retry handling keep their existing execution and permission behavior. Both rejected and aborted foreground requests release their activity slot; background failures still reach the caller. This does not change request scheduling, prefetch limits, caching, permission checks, generated app source or backend execution times.

There are no data migrations, installed/planned template changes or integration-contract changes. Shared web/embedded shells receive the behavior automatically; actual ChatGPT/Claude host acceptance remains a release check. This is a perceived responsiveness improvement, not a measured latency reduction.

The P03 CI run passed 192 of 193 browser tests; its remaining visibility fixture expected a now-unnecessary initial read in an inactive panel. A separate test correction now verifies zero inactive reads and metadata-only periodic checks in an active panel, with a revision-bearing fixture. Both corrected cases pass locally. The full P06 browser rerun passed **206/206** cases without screenshot updates. After completing request-option forwarding through the legacy Projects/Resources wrappers, the final production build/type check and **26 focused browser checks** pass, covering held background requests overlapping searches/Refresh, return checks, archive details, native-save persistence/retry, save failures, revocation, shared prefetch and responsive bar placement. CI status is tracked on [PR #155](https://github.com/tarous89/trialy/pull/155).

P06 verification also reproduced a pre-existing standard-tracker navigation race on both the P03 and P06 builds: a held cold-tab response can override a later return to a cached tab. This is recorded under P09 in the recommendation scope. The save-persistence test waits for the destination tab before returning; it does not claim to cover superseded navigation. The first full P06 browser run passed 202/206 cases: this race interrupted one save test before cleanup and its renamed fixture record caused three subsequent screenshot differences. A fresh save/tracker run passed all seven cases; the corrected full-suite result is recorded above.

The preceding P03 core CI run completed with 538 passing checks and one failed test process: `pi-network-integration.test.ts` hit a native Node 24.22.2/V8 `jit_page_->allocations_.erase(addr) == 1` assertion while unregistering a WASM allocation. A local Node 24.22.1 recheck did not reproduce that assertion, but its bounded browser design inspection returned `design_check_unavailable`, so it is not recorded as a pass. No runtime flags, production limits or unrelated application code were changed to bypass these failures. The subsequent P06 head `b2dd1ac` passed both jobs of [Basic checks run 43500275982](https://github.com/tarous89/trialy/actions/runs/43500275982) and the [automation/settings UI workflow](https://github.com/tarous89/trialy/actions/runs/43500275951). This resolves that release check for P06; each later head still needs its own green CI.

## P12 — acknowledged saves and reload-only recovery

The trusted host now treats commit acknowledgement and view refresh as separate states. The receipt appears only after `confirm_workspace_change` or `commit_change` succeeds. Closing a save review therefore means the write was acknowledged; the visible receipt shows whether the refreshed view is ready.

| State | Behavior |
| --- | --- |
| Save not yet acknowledged | Existing busy/review controls; no “Saved” claim. A failed or interrupted commit keeps its exact proposal and existing retry path. |
| Save acknowledged, reload pending | “Saved. Updating this view…”; close the completed review and retain the submitted screen/inputs as read-only. |
| Post-save reload fails | Persistent “Saved. This view could not refresh.” with **Reload saved data/app**. It does not auto-dismiss with ordinary transient errors. |
| Reload retry | Reuse the receipt and issue the normal metadata/read/open refresh only. Never prepare, confirm or commit the acknowledged mutation again. Concurrent attempts share or are blocked by the active save task. |
| Read lease expired/incompatible | Renew only the open read without its stale view ID, retaining the original app/version and state. Other failures keep the retry notice. |
| Access lost, app archived or removed | Remove the retained view and inputs; keep the save acknowledgement beside the unavailable state. No stale-view retry or repeated background check. |
| Explicit Refresh to latest version | Can load the latest published app after an acknowledged save, without confirming it again. Ordinary retry remains on its captured read. |
| Reload succeeds | Replace the retained view with authoritative output, clear the receipt, and allow a distinct new edit/save. Leaving a draft/layout prevents its late read from reopening it. |

Coverage is shared `FrontendCodeRuntime` (web, embedded and public app hosts), draft publication/revision, and standard/custom layout editors. These hosts previously either suppressed refresh errors or, for the standard layout editor, repeated confirmation on retry. Standard record forms also retain their submitted form while reload is pending. Public app access and ordinary pre-acknowledgement save failures keep their existing authorization and exact-proposal behavior.

There are no template edits, template version bumps, migrations or integration/API contract changes. Existing and planned apps inherit the host feedback when they use these save paths; standalone business logic outside them is unchanged. This is **basic P12**: no selective refresh, dependency declarations, optimistic persisted values, warm workers or claimed reduction in backend execution time. The normal authoritative post-save refresh still runs. The receipt lives in the current UI session, not across a browser reload. Actual ChatGPT/Claude acceptance and production timing remain release checks.

Validation: production build/type checking passes. The full browser run passed **222/223** cases without screenshot updates. Its only failure was the new late-draft fixture: creating a separate app/table after preparing the draft invalidated that draft before Save appeared. Creating that app first fixes the setup; the held response is also scoped to the original app. With no product-code changes after the full run, all **17/17 P12 cases** then passed, covering all 223 distinct scenarios across the runs. These include delayed acknowledgement, persistent failure feedback, repeated reload-only attempts and subsequent distinct saves across web/embedded/public hosts, native cell saves at 390 px, draft metadata/render failures, standard/custom layout retries, permission loss, expired read leases, explicit latest-version refresh and late responses after navigation. Both mobile save-notice screenshots were visually checked. The existing publication test now waits for view refresh before starting another edit. New-head CI and actual ChatGPT/Claude acceptance remain pending.

## Production verification after release

1. Record the deployed commit and actual web/database instance configuration. Neither this document nor `render.yaml` proves production capacity.
2. Check a real built asset, its conditional response, a missing old asset, HTML deep links and private APIs. Confirm immutable assets have no `Set-Cookie`; missing assets return a non-HTML 404; HTML revalidates; private data stays uncached.
3. Capture authenticated cold/warm Home open, app open, Settings/tab/filter, save acknowledgement, refreshed view and return-to-tab runs. Include one and several workspaces and representative populated apps. Distinguish foreground actions and background work.
4. Compare request counts and p50/p95 time to usable content with database, session and sandbox counters. Check CPU/memory and busy rates from the actual host. Retain exact saves, revocation, app-version and tenant-isolation acceptance.
5. Test the deployed flow in actual ChatGPT and Claude as well as the web. Synthetic host tests do not establish real host acceptance.

Production before/after timings, hosting capacity and live-host acceptance remain pending. P14 is measurement support plus a synthetic baseline, not a completed production performance study. For N2, compare actual `sessionTouchesCoalesced`/`sessionTouchNoops` with session queries before estimating savings. Next scoped change: P11a bounded fair queuing and eligible read-only busy retry, followed by N3 abandoned-execution cancellation.

## PR #155 review follow-up

Confirmed frontend races are corrected without template changes. Same-scope metadata revalidation preserves the editor and its state; transient refresh failure retains it with an explicit retry notice, while authorization failure or a different scope clears it. Post-write account reads bypass pending pre-write reads; stale successes/errors cannot apply state. Idle Home checks cannot supersede a foreground reload, even if that reload finishes before the check. Return events during a running check queue one follow-up, and Home re-enabling performs one full read. Abandoned Home responses use `res.close` with `!res.writableFinished`; cancellation is still limited to safe read boundaries.

The revision query no longer constructs/sorts JSON arrays proportional to table size. Each metadata group accumulates a count and XOR of SHA-256 hashes of distinct tuple identities, including workspace identity for composite keys. Revoked project memberships are excluded. Historical document versions remain included because they can affect attached sources and AI restrictions. This is still an invalidation hint; all authorization remains authoritative. `max(xmin) + count` would not safely detect all row changes or commits arriving out of order.

Reproduce with `node --import tsx scripts/profile-home-revision.ts` and `node --import tsx scripts/profile-home-revision.ts --all-active` (or `--large` for the 50k/150k control). The frozen baseline SQL is from P12 head `38696a9`. The probe uses PGlite/PostgreSQL in WASM, the runtime role and RLS, six warm calls per case (discard first; median and maximum of the remaining five), and `EXPLAIN (ANALYZE, BUFFERS)`. It measures the revision aggregate plus its transaction/context setup with an already-authorized workspace directory, **not** the complete HTTP endpoint, authentication, workspace discovery or network latency. Default fixtures include 90% revoked project memberships; the all-active control isolates the case where that filter removes no rows.

| Workspaces | Document versions | Project memberships | Revoked memberships | Before median (ms) | After median (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 10,000 | 10,000 | 0% | 518.2 | 528.4 |
| 3 | 30,000 | 30,000 | 0% | 1,697.5 | 1,634.1 |
| 1 | 50,000 | 50,000 | 90% | 2,687.4 | 1,536.3 |
| 3 | 150,000 | 150,000 | 90% | 8,124.4 | 4,519.7 |

The all-active controls are approximately flat (one slightly slower, one slightly faster); this is not a universal latency improvement. The 90%-revoked cases show lower median query time. At 150k rows the baseline used two external merge sorts, each 4,416 KB; the replacement sorts only the 18 metadata-group results (18 KB), with fixed-size per-group aggregate state. Both versions return 1,811 bytes to the server. These local WASM numbers are not native PostgreSQL/Render forecasts, and five samples are insufficient for a dependable p95. [Raw measurements, maximum samples and sort details](measurements/home-revision-review-2026-11-13.json).

Production acceptance remains open: profile the native database at representative row counts and concurrent open tabs, including account-directory/RLS work and full Home loads. If scans remain material, a transactionally maintained revision counter is a separate design/migration; bounded aggregate memory does not make this query constant work. The single-workspace 4-query fixture above is not a fixed multi-workspace query budget.

Validation for the review corrections: production build/type check, 15 focused backend checks and 40 distinct focused browser checks pass. The browser set includes seven new regressions (access-save receipt/transient refresh, revocation, old idle replies/errors with foreground reads pending or completed, and re-enabling Home) plus 33 existing refresh/startup/progress cases. Backend checks cover fresh account reads, pending return scheduling/disposal, revoked membership history, historical documents, composite folder identities, tenant isolation and read cancellation. The earlier P12 head `38696a9` now has green core/full-browser and automation/settings CI. Review-fix commits still require their own CI; PR #155 remains unmerged and undeployed.

The review's empty-only template-profiling statement is outdated: the existing P14 section above includes populated demo and expanded synthetic profiles for Runway, Programs and Contracts. Their actual production before/after gains remain unmeasured. P05 deploy recovery and P09's known tab race remain follow-ups; CS2/DR2/IU2 are explicitly marked safety/reliability work in the scope.


## P11a and N3: contention and abandoned work

P11a keeps published/draft execution capacity at 2/1 per process, with separate queues of at most 16/8 pending requests and two pending requests per user. Maximum wait is 1.5 seconds. Eligible navigation gets at most two busy retries with jittered 250/750 ms backoff. The queue opens no database transaction. Only queued admission repeats access validation; immediate admission retains initial/capability/final checks without an extra round. Queued revocation tests start no sandbox. Fairness rotates waiting users; it does not preempt running work or reserve one running slot per user. `runtimeQueued`/`runtimeQueueMs` measure waiting separately from execution; `runtimeBusy` includes full queues and expired waits. This is reliability under contention, not added processing capacity.

N3 propagates HTTP response disconnects and MCP request cancellation to the queue/runtime and between Home queries. On cancellation or timeout, sandbox computation stops immediately. Frontend execution waits up to five seconds for a started host call, then settles and releases sandbox capacity while that call finishes its original receipt in the background. The same workspace/user/app key remains excluded until the call settles. `sandboxMs` ends at execution settlement (at most the 15-second guest deadline plus five-second grace); `runtimeDetached` marks this case. Late host-call/database timings may finish after the response log and are not guaranteed to appear in it. Other runtime callers retain their existing completion lifetime. This bounds frontend slot occupancy without interrupting or replaying started actions; it does not resolve database-pool exhaustion from indefinitely stuck SQL. No database-driver cancel is sent, and no cancelled mutation is replayed. Completed-response logs do not capture every disconnected request; these tests establish cancellation behavior, not production latency or saved CPU.

## N1 and repeated permission reads

Implemented 17 November 2026. Four changes, none of which alters a permission rule, a template or saved data:

1. **Read batching (N1).** Inside one HTTP or MCP request, consecutive standalone queries share a transaction: `BEGIN`, the security context and `COMMIT` are sent once per burst instead of once per query. The transaction ends as soon as the request stops querying for one event-loop turn, so it is never open while app code, a connector, a file read or any other non-database work runs. Anything other than a plain `SELECT` (writes, row locks, advisory locks, `trialy_security` functions) is committed before its caller continues. A failed statement rolls back only itself. Explicit transactions are unchanged and never share or wait behind the batch connection. The security context is still transaction-local and is set again whenever the calling actor scope changes. Workers and scripts are unaffected. `DB_READ_BATCHING=false` on the web service restores one transaction per query.
2. **Permission columns only.** A table permission check made for an app reads the app's permission columns, not its saved source. Source is read only when section rules exist for that app.
3. **Bounded reuse per unit of work.** Each pre-run check and each read-only app capability call (`records.read`, `records.get`, `project.records`, `project.relationships`, `roles.list`, `integrations.list`) reuses identical permission and schema lookups within itself, using the existing verified request-local mechanism: every reused result is read again uncached before the unit returns, and a change rejects it with `access_changed`. Nothing is reused between units, the post-execution recheck is unchanged, and proposing, running actions and connector calls are never reuse units. The per-request entry bound rose from 256 to 4,096 so that large accounts stay inside it.
4. **Apps page with archived helpers.** Helpers of an archived app are left out of the Apps page until the app is restored, instead of failing the page with `app_archived`.

Local synthetic observation, real migrations and approved catalog apps, one owner, one workspace. Driver round trips are modelled from the adapter rules verified in `tests/read-batch.test.ts` and `tests/request-metrics.test.ts`; they are not production timings.

| Read | Application queries before → after | Driver round trips before → after | Rows read before → after |
| --- | ---: | ---: | ---: |
| Apps page, 3 apps | 77 → 85 | 308 → 88 | 1.4 → 1.5 MB |
| Apps page, 32 apps | 2,452 → 899 | 9,808 → 938 | 109 → 20 MB |
| Open one catalog app: resolve | 28 → 28 | 112 → 31 | 0.5 → 0.1 MB |
| Open one catalog app: access check | 51 → 51 | 204 → 54 | 0.9 → 0.2 MB |
| Open one catalog app: run interface | 404 → 233 | 1,616 → 287 | 6.4 → 1.6 MB |
| Show archived apps, 10 archived | 92 → 92 | 368 → 95 | 2.6 → 1.6 MB |
| Archive an app (review and confirm) | 151 → 151 | 307 → 160 | 3.0 → 0.7 MB |

The Apps page at three apps runs a few more application queries than before because reused lookups are verified at the end; its round trips still fall by about 70%. Not changed here: the Apps page still checks every app before choosing a page (P01). Compare `durationMs`, `databaseRoundTrips`, `transactions` and `contextSets` in the request log for `/api/account/home`, `/api/apps/resolve` and the app run route before and after release.

## Template catalog and gallery screenshots

Implemented 17 November 2026.

- **Catalog payloads load once per process.** Each list, read, identity or preparation still reads which versions are approved (identity, version and digest only), so a withdrawal or a new approval applies on the next call. The validated payload of a published version, which is immutable, is loaded and validated once and then reused; only versions not yet held are fetched. Held entries are frozen because every caller shares them. The channel switches in `templates/catalog-availability.json` are applied on every call as before. At most 500 versions are held; a restart or deploy starts empty.
- **Gallery screenshots.** The gallery requests each screenshot with the listed catalog digest (`?d=`). When it matches the approved version, the response is `private, max-age=604800`; any other request keeps `private, no-cache`. Approval, the platform switch and the gallery manifest are still checked on every request that reaches the server. A screenshot regenerated for an unchanged version can stay in a browser for up to a week. Live previews keep `no-store`.

Local synthetic observation, 45 catalog rows and 32 approved apps: a template list or single-template read fell from 4.6 MB of rows and about 90 ms of server CPU on every call to no payload rows and about 5 ms after the first call in a process. The first call after a start still loads every approved payload once. Embedded hosts (ChatGPT and Claude) receive screenshots through the media tool and are unchanged.

## One request per screen, prepared runtime processes and batched reads

Implemented 18 November 2026.

- **One request per screen.** `read_project_component` with `includeOutput` (and the website's app open) now returns a custom app's first render with the read, as it already did for standard trackers. If that first render cannot be produced (busy runtime, an error in the app), the read still succeeds without it and the client renders and reports exactly as before. The website starts the Apps page read (`GET /api/account/home`, the same read as the existing `POST`, default filters only) and the app open (`GET /api/apps/resolve`, location in the `X-App-Location` header, first render included) alongside the account check instead of after it. An early result is used once, by the first identical request, within 15 seconds; a failed or unused one falls back to the normal request. A new account drops it.
- **Prepared runtime processes.** After a run, the next runtime process is started and prepared ahead of the next request. A process still serves exactly one run and is killed afterwards; no runtime, memory or state is shared between runs, and limits are unchanged. `APP_RUNTIME_WARM` sets how many wait (default 1, 0 to 4; 0 restores start-on-demand). Each waiting process holds memory, so raise it only with a larger instance. `sandboxStartupMs` reads 0 for a run that found a prepared process. A prepared process is started outside every request scope, and each run's capability calls are bound to the calling request's actor, database security context and counters.
- **Batched reads.** `records.readMany` takes 1 to 12 `records.read` requests and returns their results in order. Every read is checked like a single read; a run may make at most 100 batched reads; size budgets are unchanged. Permission lookups are made once for the batch and verified before it returns. Existing apps are unaffected until their source uses it (template guidance 1.3.33).

Local synthetic observation: a runtime start fell from a median of about 80 ms to about 16 ms when a prepared process was waiting (fast multi-core machine; the saving on a throttled half core is expected to be larger and is unmeasured). An app making six reads across three tables ran 185 application queries with separate reads and 124 with one batch. Request counts per screen: platform open 2 sequential steps to 1; app open from the Apps page 2 to 1; app open by URL 3 to 1.

## Batched reads in the 16 switched-on apps

Implemented 18 November 2026 as a patch release of every switched-on catalog app (see `docs/TEMPLATE_CATALOG.md` and `HISTORY.md`). Data calls for two consecutive screens (open, then one more render) on each app's demo data, from `tests/batched-read-apps.test.ts`, which runs the published source in the production runtime:

| App | Calls with one call per read | Calls with batched reads |
| --- | ---: | ---: |
| Runway 2.2.1 | 30 | 6 |
| Contracts 1.1.1 | 18 | 4 |
| CRO Selection 2.1.1 | 28 | 6 |
| Data Room 1.1.1 | 26 | 4 |
| Fundraise 2.0.1 | 24 | 4 |
| Investor Updates 1.0.1 | 26 | 4 |
| Partnerships 2.2.1 | 36 | 6 |
| Programs 2.2.1 | 24 | 4 |
| Each of the eight radars | 22 | 4 |

The number of reads is the same in both columns; each read is still checked and counted against the app's budget. Screens and state are identical in both modes on the demo data, on a 350-row table and with a restricted table. These are call counts on fictional records with no database: the server-side saving per call is the batched permission lookup measured above, and production timings remain unmeasured. Installed copies of earlier versions are unchanged.

## Experienced speed: targets and real-usage measurement (decisions P1 and P10, 20 November 2026)

**Targets (P1).** A click or tap gets a visible response within 0.1 s. Changing screens, filtering and sorting finish within 1 s. An app's main content is visible within about 2.5 s on a normal phone connection. An edit is saved within 1 s. In code: `UX_TARGET_MS` and `UX_TAP_TARGET_MS` in `src/shared/ux-timing-schema.ts`.

**What is measured.** The app runtime (`src/shared/FrontendCodeRuntime.tsx`) times three things as the person experiences them:

| Metric | From | To | Target |
| --- | --- | --- | --- |
| `open` | the app screen mounts | its first content is painted | 2.5 s |
| `interaction` | a click, tap or change inside the app | the screen has responded | 1 s (0.1 s once interaction runs in the browser, package 5.1) |
| `save` | an edit is confirmed | the server confirms the save | 1 s |

Each sample carries the time, the host (`web`, `chatgpt`, `claude`, `public`), a width class (`phone` up to 480 px, `panel` up to 900 px, `desktop`) and the runtime mode (`server` today, `browser` from package 5.1). It carries no user, organization, app, record or content identifier, and the server rejects any extra field.

**Where it goes.** Samples are batched (at most every five seconds) and sent quietly to `POST /api/telemetry/ux`, which adds them to daily histograms in `ux_timing_daily` (migration 080). Buckets end at 50, 100, 200, 500, 1000, 2500, 5000, 10000 and 60000 ms. A failed send is dropped; measurement never shows an error or delays the app.

**Reading it.** `npm run ux:report -- 14` prints, per metric, host, width and mode, the sample count, the median and the 75th and 95th percentile (as bucket upper bounds) and whether the 75th percentile meets the target. The 75th percentile is the pass mark, as is usual for experienced-speed targets.

**Limits today.**
- Only the web host sends samples. ChatGPT and Claude need a transport inside the embedded hosts; that is part of package 5.8. Phones are covered through the web host's `phone` width class.
- `interaction` currently includes the server round trip of every click, because apps still run on the server. It is the baseline the browser runtime (session 5) is measured against.
- **No production baseline exists yet.** The first real numbers appear after this change is released and used. Record them here, with the date and sample counts, before session 4 starts changing the save path. Lab numbers from this repository's synthetic fixtures are not a substitute and are not recorded as a baseline.

## Loading speed, session L1: Apps home and archived apps (22 November 2026)

Session L1 of the [loading speed scope](scopes/LOADING_SPEED_2026-11-22.md).

**What changed.**
- **One lean app index (L1.1).** `appIndex` (`src/workspace/app-index.ts`) decides which apps a person may see for the whole workspace in a fixed number of queries and without reading app code. The rules are the per-app check's own: `toolDecision`, `toolProjectStep` and `typePolicyFor` (`src/domain/effective-access.ts`) are the pure parts of `toolPolicy` and `applyTypePolicy`, now shared by both paths. Saved code is read only in two rare cases: an app with section rules, and an app whose table check fails unless it is a standard tracker. For a member without full access, catalog code is recognized by a hash the database computes, so the code itself never leaves the database. `tests/app-index.test.ts` compares the index with the per-app check, in both directions, for 21 people and assistants on each of four generated accounts (roles, projects closed to people or assistants, archived projects, app allowed users, team default roles, app owners, app and project rules, a section rule, hidden fields, no direct data, an app-owned table, assistant levels).
- **Apps home reads the index (L1.2).** Projects and Home placements are decided from the same preloaded project rows.
- **Card miniatures later (L1.3).** `read_home_snapshots` (`POST /api/account/home/snapshots`) returns the miniatures for the cards on screen after the cards are shown. Each app is checked again in that request. It is a quiet read: it never starts or keeps the loading bar.
- **Archived apps (L1.4).** The Home read returns the restorable archived count (`archivedApps`, per workspace on the account read), so the collapsed "Show archived apps (n)" needs no request. The expanded list takes the index plus one query for the apps, one for their tables and record counts, and one for their automation counts.
- **Website start (L1.5).** `index.html` draws the page frame before any script. `public/start.js` (a few hundred bytes, no build step) starts the account check and the first Apps home read before the 1 MB main script has downloaded; `src/shared/early-reads.ts` adopts them, once and only while fresh.
- **Plugins (L1.6).** `open_workspace` carries the first Apps home page (`home`); the widget paints from it, and saved views no longer hold the first paint.
- **Timings (L1.0).** `home`, `archive` and `templates` join `open`, `interaction` and `save` (migration 098), each from its read starting until it is on screen, target 0.3 s.

**Lab numbers.** Same synthetic account before and after, in-process database (`tests/loading-speed.test.ts` fixture: 200 KB of code per app, one in four archived). Bytes are the rows the server received from the database.

| Account | Read | Before: queries | Before: received | After: queries | After: received |
| --- | --- | --- | --- | --- | --- |
| 4 apps, owner | Apps home | 31 | 2.2 MB | 12 | 7 KB |
| 40 apps, owner | Apps home | 165 | 20.1 MB | 12 | 32 KB |
| 40 apps, member | Apps home | 164 | 20.1 MB | 11 | 32 KB |
| 40 apps, owner | Archived count | 62 | 2.0 MB | 3 | 8 KB |
| 40 apps, owner | Archived list | 82 | 2.0 MB | 6 | 12 KB |

The populated page fixture (`tests/page-performance.test.ts`) now takes 12 queries for Home (was 32) plus 20 for the five miniatures, read afterwards.

**Budgets enforced by tests.** `tests/loading-speed.test.ts` fails the build if Apps home exceeds 14 queries, the archived count 5 or the archived list 6, if Home costs a different number of queries for 4 and 40 apps, or if any of these reads selects app code. The scope's target of 6 for Home is not met: the remaining queries are the account directory, the revision stamp, the access lookup, the projects, the index, the person's own automations and links, Home placements and the read-metadata freshness checks. None grows with the number of apps.

**Still open.** Production numbers before and after (owner action, scope section 7.1); splitting the main script (L1.5); database-side paging and set queries for a person's own standalone automations, links and older automations (L1.2, C4, C5): they grow with that person's automations, not with apps.

## Loading speed, session L2: individual apps (22 November 2026)

Session L2 of the [loading speed scope](scopes/LOADING_SPEED_2026-11-22.md).

**What changed.**
- **Access worked out once per open (L2.1, architecture H).** Opening an app (`readComponent` with its first screen: the website's `GET /api/apps/resolve`, `read_project_component` with `includeOutput`, `open_app`) and a frame run that opens a screen (`runFrontendRequest`: `run_component_frontend` and `POST …/frontend/run` with event `open` and no save key) now run inside one request-wide `withReadMetadata` scope, in the app's own database context. Identical permission and schema lookups are made once and reused by every check and read of that request. Before the response is released every reused result is read again uncached and compared in full; any difference discards the response (`access_changed`), as before. Nothing is kept between requests. Events that may save keep their earlier per-unit checks.
- **Fewer, grouped lookups (L2.1).** An app's tables are read in one query (`primeById`) instead of one per table; reused rows of one table are verified in one query; a column lookup (`SELECT fields`, `SELECT source`) is taken from the full row already read. A catalog app's origin and installer schema, the approved provider of a role and the role table list join the reusable lookups. The person's runtime view does not: a run updates its read access, so it is read again before each of the app's reads. A records page shorter than asked gives its exact total without a second count query. The pending-change lookup runs alongside the app read.
- **Code by fingerprint (L2.2, architecture F).** A frame request names the code fingerprints the host holds (`browser.have`); code with one of them is not sent again. Every app open now also carries the frame's seeded reads (never the code), so the frame starts running the app itself right after the first screen: it takes the code from the app's own metadata when the fingerprint matches, and otherwise fetches it once by fingerprint (website: `GET /api/workspaces/:w/apps/:id/code/:digest`, `private, max-age=31536000, immutable`, signing out sends `Clear-Site-Data: "cache"`; plugins: the app-only `read_app_code`). Both check access like an open and serve only the current code of an app that runs in the frame.
- **Other tabs prepared after Overview (L2.4, architecture G).** A standard tracker prepares every other visible tab (at most 8), nearest first, instead of the two nearest. A browser-mode custom app prepares its linked screens in the frame (existing `warm`), now right after Overview because the open carries the seeded reads. Both are quiet (no loading bar), wait while the page is hidden and while a save runs, and stop when the person acts.
- **Opening from a card (L2.5).** The Apps page shows the app's name and loading frame at once and fills in the first screen when it arrives. While the website is idle it prefetches the app frame document (`/api/config` gives its versioned address).
- **Plugins: result-first open (L2.6, architecture E).** `open_app` carries the first screen in the tool result's widget-only metadata (`_meta['trialagents/initialOutput']`); the assistant's result is unchanged. The widget paints from it; the account and the table list load alongside and no longer hold the app back.
- **Server-mode report (L2.7).** `npm run apps:runtime-report` (owner, read-only) counts installed apps by mode and reason, lists catalog versions that switching on would move, and names customized apps per workspace. No records or code in its output.

**Lab numbers.** Runway (13 tables, fresh install, 15 reads on open), in-process database, `tests/loading-speed-apps.test.ts` fixture. Data reads are the app's own `records.read` calls; platform queries are everything else.

| Read | Before: queries | After: queries | After: platform queries |
| --- | --- | --- | --- |
| App open with first screen (website), owner | 596 | 58 | 43 |
| App open with first screen (website), member | 679 | 63 | 48 |
| App open with first screen, assistant | 596 | 57 | 42 |
| Frame open of a screen (`run_component_frontend`), owner | 527 | 56 | 41 |
| Plugin open (`open_app` and then the widget's own run), owner | 70 + 527 | 58, no second request | 43 |

Code sent per open of a 200 KB app: before, the app's metadata carried it (about 200 KB) and the first local event fetched it again with the frame's reads (another 200 KB); after, only the metadata copy, and the first event runs in the frame.

**Budget enforced by tests.** `tests/loading-speed-apps.test.ts` fails the build when an app open or a frame open takes more than 52 platform queries for the owner, a member or an assistant, when its first screen differs from a separate run, when the open sends code, or when held code is sent again. The scope's target of 25 is not met: the remaining platform queries are the person's access, the app, its project and the app permission (each read once and verified once), the app's tables (one query and one verification), the runtime view (opened, then read before each of the app's 15 reads), the role and integration lookups the app makes (about 10 for Runway) and the pending change. For a member, the source-access checks add about 5. None grows with the number of tables; the runtime view grows with the number of reads the app makes.

**Still open.** The open response still carries the app's code in its metadata (`component.source`), because the settings, layout and code editors read it; sending data only needs those editors to load code on demand (L2.2). The server still makes the first screen of browser-mode apps (L2.3, not built). The frame engine is not prepared ahead (L2.5). The 16 catalog versions hidden from at least one channel have no browser test and stay on server mode (L2.7). Production numbers before and after remain an owner action (scope section 7.1).

## Loading speed, session L3: templates and the plugin path (23 November 2026)

Session L3 of the [loading speed scope](scopes/LOADING_SPEED_2026-11-22.md).

**What changed.**
- **Template list by catalog fingerprint (L3.1).** The approved catalog is read in one query that returns a template's payload only when this process does not hold that exact version yet (before: a second query for the payloads, on a cold process). The list carries `catalog`, a fingerprint of the channel and every approved version and digest; `list_app_templates` (and `POST /api/app-templates/list`) with that `catalog` answers only `{catalog, unchanged:true}`. The summaries of one fingerprint are computed once per process. The website and the widget show a list they already hold at once and send the fingerprint as a quiet check (no loading bar); a changed catalog replaces the list.
- **Card images at the size shown (L3.2).** Each gallery screenshot (1440×960) has a 720×480 card (`resources/template-gallery/cards/`, written by `scripts/build-template-cards.mjs`, whose `--check` runs in `npm run build`). Website card, screenshot and preview addresses carrying the exact catalog digest are `private, max-age=31536000, immutable` (screenshots were 7 days, previews `no-store`). The server keeps the files it served in memory by version and digest; approval and the channel switch are still checked on every request (one query).
- **Plugin card images (L3.3).** The widget's resource declares the platform origin in `ui.csp.resourceDomains`, and cards load from `GET /template-cards/:channel/:templateId/:version/:digest.jpg`: public (catalog pictures, as `read_app_template_media` needs no sign-in), exact digest only, channel switch applied, `public, max-age=31536000, immutable`, `Cross-Origin-Resource-Policy: cross-origin`. When the host refuses the image, the cards on screen (observed as they come into view) are read in one `read_app_template_cards` call of up to 12 cards; if that call fails, each card falls back to `read_app_template_media` as before. All quiet.
- **Previews prepared on hover or focus (L3.4).** Website: a hidden, script-less frame loads the exact preview address, so the preview dialog's frame is served from the browser cache (a `fetch` does not help: browsers keep frame documents in their own cache entries). Widget: the preview is read with `read_app_template_media` and kept by version and digest for the life of the widget.
- **Prepared tool list (L3.5).** `tools/list` is answered from the list a full build produced for the same endpoint variant (sign-in, assistant, widget build, `SIMPLE_APPS_ENABLED`, public origins). `tools/call` registers only the named tool and runs only the tool group that holds it (`src/server/mcp-sections.ts`); which group holds which tool is learned from any build that ran every group. An unknown tool name, or a group map not yet learned, uses the full build. Every handler, and with it every authorization decision, is created per request with that request's actor; nothing about access is kept.
- **Widget file (L3.6).** The 810 px brand marks were inlined in the widget script as 495 KB of base64; the widget and the website now use 96 px copies (displayed at 22 to 28 px). zod's translations (261 KB; the widget only ever shows English messages) are left out of the widget build.

**Lab numbers.** In-process database (`tests/loading-speed-templates.test.ts` fixture and a scratch measurement of the same code), the 16 apps switched on for the website and ChatGPT, `SIMPLE_APPS_ENABLED=true`. MCP timings are per request through Express and the MCP transport, in process; an empty one-tool MCP server takes 1.9 ms on the same machine.

| Measure | Before | After |
| --- | --- | --- |
| Template list, queries (cold process / warm) | 2 / 1 | 1 / 1 |
| Template list, bytes sent, catalog unchanged | 22,032 | 63 (`unchanged`) |
| Card images, 16 cards, website | 16 requests, 1,846,338 bytes, kept 7 days | 16 requests, 639,781 bytes, kept for good |
| Card images, 16 cards, plugins | 16 tool calls through the assistant, 2,461,784 bytes of base64 | 16 image requests (639,781 bytes), no tool call; where refused, 2 tool calls for the cards on screen (853,041 bytes of base64 at most) |
| Preview open, website | every open from the server (`no-store`), about 242 KB | prepared on hover, opened from the browser cache |
| Preview open, plugins | read on click | read on hover or focus, kept for the widget's life |
| `tools/list` (200 tools, 516 KB) | 42 ms | 10 ms |
| `tools/call` (request total, by tool group) | 6.2 ms for every tool | 2.7 to 3.7 ms for tools outside the workspace group (3.4 ms for the app tools); about 5.6 ms for the `workspace/core` group (measured while other tests ran) |
| `dist/embed.html` (ChatGPT resource) | 2,574,192 bytes | 1,842,939 bytes |
| Claude resource (widget with the inline app frame) | 3,858,517 bytes | 3,127,264 bytes |

**Budgets enforced by tests.** `tests/loading-speed-templates.test.ts` fails the build when the template list takes more than one query on any channel, when an unchanged catalog reads a payload again or sends more than the fingerprint, when a card is missing, stale, not 720×480 or over 60 KB, when an exact media address is not kept for good, when the public card address serves another digest, an unknown channel, a switched-off or a withdrawn app, when the prepared tool list differs from a full build for any caller, when two people's calls on one server see each other's account or a removed access survives to the next request, and when `dist/embed.html` exceeds 1.9 MB. `tests/visual/template-loading.spec.cjs` checks in a browser that a hovered card's preview opens from the cache, that refused card images come in batched requests with no loading bar, that allowed ones need no tool request, and that returning to the templates sends only the fingerprint.

**Still open.** Keeping the template list across page loads is L4.1. Whether ChatGPT and Claude load images from the declared resource domain is untested in the real hosts (owner action 7.4); the batched read covers a refusal. The `workspace/core` tool group (about 90 tools) is still built in full for each of its calls. The widget still inlines the Inter font (470 KB as base64), every page of the workspace, and, for Claude, the app frame document (1.28 MB with a second copy of the font); each needs an owner decision (see the scope, section 9).
