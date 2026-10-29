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
