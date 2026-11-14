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

P11a keeps published/draft execution capacity at 2/1 per process, with separate queues of at most 16/8 pending requests and two pending requests per user. Maximum wait is 1.5 seconds. Eligible navigation gets at most two busy retries with jittered 250/750 ms backoff. The queue never holds a database transaction. Admission revalidates access, including queued revocation tests with no sandbox execution. `runtimeQueued`/`runtimeQueueMs` measure waiting separately from execution; `runtimeBusy` includes full queues and expired waits. This is reliability under contention, not added processing capacity.

N3 propagates HTTP response disconnects and MCP request cancellation to the queue/runtime and between Home queries. On cancellation or timeout, sandbox computation stops immediately; `sandboxMs` continues until any host call already running has settled, so it can exceed the guest's 15-second deadline. This preserves durable action/connector receipts and prevents releasing a slot while host work is still active. No database-driver cancel is sent, and no cancelled mutation is replayed. Completed-response logs do not capture every disconnected request; these tests establish cancellation behavior, not production latency or saved CPU.
