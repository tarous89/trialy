# Standard tracker loading

Standard tools retain configuration-only definitions and the approved application-owned renderer. The compiled server adapter calls the same renderer with asynchronous, parallel data reads; the browser adapter renders locally from authorized snapshots. No saved source is evaluated in Node: only the shipped renderer is compiled. Legacy configurations that fail the current configuration schema fall back to the isolated runtime, as does custom source.

## Read path

- `read_project_component(includeOutput: true)` and `open_tracker` return the component and first standard view together. The app and plugin consume that initial output without another render request.
- Standard rendering shares one database transaction/security context. Queries run at the PostgreSQL default READ COMMITTED isolation; permission/version checks run before data is returned. No cross-request permission cache is used.
- The active tab loads one bounded page. Inactive tabs do not load rows. Overview statistics request counts only; configured next-step panels and visualization samples load bounded pages.
- Page records, field policies and calculated outputs are reused to build controls. Project membership checks are batched. Lookup and custom calculation code retains its sandbox, read scope and evaluation limits.
- Read-only renders do not acquire a workspace write lock. Changes still require reviewed proposals, current permissions and optimistic record versions.

## Browser behavior

The same iframe stays mounted for navigation and successful saves. Authorized pages are held in component-instance memory for 15 seconds, at most 16 pages. Cache keys include table, page, page size and filters. Permission-version or configuration changes invalidate snapshots; successful saves discard old pages. Nothing is stored in localStorage, service workers or a shared browser data cache.

An optional background request prefetches the first visible table from Overview, or the next page of the active table. It never changes the visible view. Generation checks discard results arriving after navigation/save/unmount. Cached navigation cannot bypass pending-edit review. Existing focus/periodic access rechecks clear the view if access changes.

The public, user-data-free frame shell supports HTTP revalidation. Authenticated data is not made public-cacheable. Request logs include path and duration, without request bodies or query strings.

## Verification and limits

The populated integration fixture measures 25 rows with 6 fields, including computed values. Its query budget rejects a return to per-cell authorization queries. Other tests cover scope, stale writes, drafts, typed controls, cache expiry/invalidation and bounded memory.

Local embedded-database timings are diagnostic, not a production latency SLA. Browser host/network latency, unusually expensive computations, and custom-code runtime costs remain separate factors. Counts are current SQL aggregates, not asynchronously materialized values; only expensive aggregates demonstrated by profiling should gain a dependency-aware materialization system. Existing page-local search/sort semantics remain unchanged.
