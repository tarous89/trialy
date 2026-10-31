# Standard tracker loading

Template tools store configuration and optional theme overrides and the approved application-owned renderer. The compiled server adapter calls the same renderer with asynchronous, parallel data reads; the browser adapter renders locally from authorized snapshots. No saved source is evaluated in Node: only the shipped renderer is compiled. Legacy configurations that fail the current configuration schema fall back to the isolated runtime, as does custom source.

## Read path

- `read_project_component(includeOutput: true)` and `open_tracker` return the component and first standard view together. The app and plugin consume that initial output without another render request.
- Standard rendering shares one database transaction/security context. Queries run at the PostgreSQL default READ COMMITTED isolation; permission/version checks run before data is returned. No cross-request permission cache is used.
- The active tab loads one bounded page. Inactive tabs do not load rows. Overview statistics request counts only; configured next-step panels and visualization samples load bounded pages.
- Page records, field policies and calculated outputs are reused to build controls. Project membership checks are batched. Lookup and custom calculation code retains its sandbox, read scope and evaluation limits.
- Read-only renders do not acquire a workspace write lock. Changes still require reviewed proposals, current permissions and optimistic record versions.

## Browser behavior

The same iframe stays mounted for navigation and successful saves. Authorized pages are held in component-instance memory for 120 seconds, at most 16 pages. Cache keys include table, page, page size and filters. Permission-version or configuration changes invalidate snapshots; successful saves discard old pages. Nothing is stored in localStorage, service workers or a shared browser data cache.

Optional background requests prefetch up to two neighboring tabs and the next page of the active table. It never changes the visible view. Generation checks discard results arriving after navigation/save/unmount. Cached navigation cannot bypass pending-edit review. Existing focus/periodic access rechecks clear the view if access changes.

The public, user-data-free frame shell supports HTTP revalidation. Authenticated data is not made public-cacheable. Request logs include path and duration, without request bodies or query strings.

## Verification and limits

The populated integration fixture measures 25 rows with 6 fields, including computed values. Its query budget rejects a return to per-cell authorization queries. Other tests cover scope, stale writes, drafts, typed controls, cache expiry/invalidation and bounded memory.

Local embedded-database timings are diagnostic, not a production latency SLA. Browser host/network latency, unusually expensive computations, and custom-code runtime costs remain separate factors. Counts are current SQL aggregates, not asynchronously materialized values; only expensive aggregates demonstrated by profiling should gain a dependency-aware materialization system. Existing page-local search/sort semantics remain unchanged.

Neighboring tabs and the next data page are prefetched sequentially with bounded memory, including the signed controls needed for local rendering. Both previews and saved tools can use the cache. Successful writes clear snapshots; access/version rechecks still clear unavailable views. Repeated pending tab navigation is coalesced to the most recent target.

## Account pages — October 29, 2026

Tools, Access, Database and Logs reuse only an allowlisted set of permission/schema
lookups inside a single read operation. Keys include SQL parameters and the runtime
actor/tool context. Every reused result is fetched again, uncached, before the
response returns; a concurrent metadata change rejects the response. Existing
explicit table/project access rechecks bypass reuse. No cross-request permission
or record cache is introduced, and database row-level security remains unchanged.

Account schema discovery fetches one bounded batch of metadata and applies each
workspace's policy. The existing catalog filtering/order/pagination remain intact.
Tool thumbnails share identical table/project sample reads within the response.
Logs skip building per-tool entitlement lists only after establishing the existing
unrestricted human audit entitlement; restricted/AI reads retain the full checks.

No styles, DOM layout, controls, response fields, record limits or thumbnails change.
Access no longer repeats its initial grid request. Only typed search is debounced;
initial loads and pagination start immediately. Off-screen app Tools polling stops,
while navigation back and visible-page access rechecks continue. Database navigation
finishes catalog refresh before scheduling the row refresh.

Synthetic regression fixture (five trackers, one two-field table, 25 records):

| Read | Before SQL calls | After SQL calls |
| --- | ---: | ---: |
| Tools | 143 | 31 |
| Access grid | 61 | 25 |
| Database records | 11 | 8 |
| Logs (25 events) | 50 | 8 |
| Catalog (25 tables) | 54 | 5 |

Counts exclude transaction/context statements and include final freshness checks.
These are query-count improvements, not claims about production wall-clock latency.
`tests/page-performance.test.ts` checks query budgets and complete returned data.
`tests/read-metadata.test.ts` covers concurrent changes, mutation isolation, runtime
actor/tool separation, nesting and uncached records/counts. Browser tests verify
one initial Access read, fresh subject changes, and hidden/visible Tools polling.

Request logs add `queryCount`, `databaseMs`, `poolWaitMs` and `metadataHits` alongside
existing duration/status. No SQL text, parameters or record values are logged.
`databaseMs` sums business SQL execution time (can overlap across parallel calls),
not transaction/context overhead; `poolWaitMs` sums connection acquisition time.
No speculative indexes, migrations, hosting upgrades or progressive rendering added.

## Four-tab trackers and layout saves — October 31, 2026

A tracker with four bound tables, 28/21/12/18 fields and several filters exposed gaps
in the earlier tests. Shared rendering and browser snapshots had reduced work,
but the later publication/view checks repeated component, workspace and schema
reads. The standard frontend transaction did not use the request-local metadata
reuse already deployed for account pages. The prior one-table/six-field budget
was too permissive to catch this. Browser coverage mainly exercised warm two-tab
navigation, missing a foreground click overlapping an in-flight prefetch.

A sampled production hour contained 16 frontend requests taking 368–2342 ms
(median 849 ms), often with 134–146 SQL calls; database time dominated and pool
wait was mostly zero. One confirmation took 1486 ms. MCP logs then identified
only `/mcp`, so their slower outliers cannot be reliably attributed to layout
saving or a particular tool. These are sampled server timings, not an end-to-end
ChatGPT measurement or a promise about every app.

The standard-render transaction now reuses allowlisted metadata and performs
uncached final comparison before releasing output. Layout preparation uses the
same request-local mechanism; confirmation remains uncached and separately
reviewed. The four-table synthetic fixture produces these SQL-call counts:

| Operation | Before | After |
| --- | ---: | ---: |
| Initial data tab | 133 | 30 |
| Next tab with publication token | 105 | 30 |
| Prepare layout | 63 | 22 |
| Confirm layout | 63 | 63 |
| Read saved component and output | 151 | 39 |

Counts include final freshness checks and exclude transaction/context statements.
Local PGlite durations are diagnostic only. `tests/tracker-performance.test.ts`
sets small explicit headroom above these counts and injects an access change
during rendering to ensure it rejects stale output. Production latency still
includes network/host transport, database execution and confirmation writes.

Identical pending navigation reads now share one request per mounted app, including
a foreground click during prefetch. The key retains app/version/view, route,
state and event; completed results and mutations are not stored in this map.
Overview counts may reuse the total of a fresh matching authorized page in the
existing browser snapshot. The 120-second TTL, 16-page bound, access checks and
invalidation remain unchanged. No cross-user or server-side record cache is added.

Layout saving previously made four serial calls: prepare, confirm, read component,
and render. It now makes three: prepare, confirm, read component with output. The
new runtime consumes that exact version's output, avoiding the extra host round
trip. This does not remove real confirmation work or promise instant cold loads.

`tests/visual/zz-tracker-responsive.spec.cjs` covers both standalone and host bridge
surfaces with a wide four-tab tracker, narrow-to-wide toolbar reflow, active filters,
keyboard dismissal, an intentionally delayed prefetch, and no redundant initial
render after a saved layout. Keep these tests when changing publication/access
code. MCP request metrics now include an allowlisted tool name for frontend reads,
layout preparation, confirmation, component reads and access checks, without
logging arguments, record data or filter values. Diagnose with tool/path, query
count, database time, pool wait and request duration before adding another cache.

Responsive toolbar lessons and future-template requirements are maintained in
[`templates/TEMPLATE_AUTHORING.md`](../templates/TEMPLATE_AUTHORING.md). These shared
runtime fixes apply to valid standard configurations and exact recognized legacy
renderers on their next load. Custom source is not silently rewritten; data,
schema, app identity and sharing are unchanged.

Responsive CSS is gated by a frame capability marker. A page opened before this
release keeps its filters visible with the previous wrapping behavior when it
receives new server markup. Refreshing loads the single-line disclosure handler;
the rollout never leaves an older frame with hidden filters and an inert button.
Both browser surfaces include a missing-marker compatibility regression.

The production PostgreSQL transaction result carries parser functions in addition
to rows/counts. Metadata reuse clones only the `Connection` data contract, never
the full driver result. The four-tab fixture now includes these non-cloneable
internals, and `tests/read-metadata.test.ts` checks clone isolation and the final
freshness check with this result shape. A live authorized component/output read
is required in release verification, in addition to health checks and PGlite tests.
