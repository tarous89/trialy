# Typed fields, references and custom displays

Approved capability upgrade, 20 October 2026. Extends the shared foundation; no business templates or patient-data scope changes.

## Field contract

`kind` remains the output/storage type. A field without a derivation is stored. `relationship`, `person`, `document`, `table`, and `field` are references. Set `multiple: true` for a list of up to 100 distinct reference IDs. Documents identify exact document-version IDs; fields identify stable keys within `targetTypeId`. Display names can change without changing keys or breaking links.

- `computed: {fields: ["budget", "target"], source: "return input.budget - input.target;"}` derives a typed value.
- `lookup: {reference: "vendors", field: "budget", aggregate: "sum"}` reads a field through a typed relationship. Aggregations: first, sum, count, min, max, join.
- Existing numeric `formula` definitions retain their stored, audited behavior. They cannot depend on live-derived fields; use `computed` for that case.
- Computed/lookup fields are optional scalar text, number, money, date or boolean outputs, and cannot be entered, imported, unique, or directly reversed. Revise their definition through the usual reviewed schema change.

JavaScript receives only declared inputs. It runs in a fresh QuickJS/WASM context with a 4 MiB guest heap, bounded stack and 40 ms execution deadline. It has no Node, network, tools or write capabilities. Date.parse and Date.UTC are available for explicit date inputs; current time, zero-argument Date and random values are unavailable. For days remaining, use an explicit as-of date field. Non-finite numbers, wrong output types and execution failures are explicit errors.

Dependency validation rejects local/cross-table cycles and removal or incompatible changes to lookup source fields. Source permissions are checked on every read. Functions also need the linked table in their execution scope; access to the destination table alone does not widen that scope.

## Read and query behavior

New computed and lookup values are evaluated on read from current permitted records, without writing results back to business records. Refresh reads to observe committed source changes. Archived/missing/inaccessible references fail explicitly. Missing values are null; failures are not zero or successful blanks. Each derived result carries status and schema-definition version.

Search, saved filters, sorting and aggregation evaluate before pagination. To bound request cost, derived-table queries support up to 1,000 source records and 3,000 dependency evaluations, with a 2.5-second request evaluation budget. Above the table limit the request fails rather than returning partial totals. Runtime failures are shown per field; numeric summaries disclose unavailable calculations. Large-scale materialized calculations are not part of this release.

Historical record revisions preserve stored values. Live-derived values are not retrospective snapshots; calculation definitions remain in the existing immutable schema revisions. Approving a definition authorizes its read-time evaluation, not writes or external actions.

## App and MCP

The shared field editor configures code, lookups, multiple links and defaults. Both the app and embedded interface use searchable, paginated reference selectors. `reference_options` exposes the same permitted targets through MCP. Table/field/user/document references are validated at save time.

Bulk editing selects records on the current page and prepares one atomic `bulk_records` proposal carrying each record's version. CSV import accepts JSON arrays for multi-reference cells. All record-changing routes retain the existing exact preview, human approval (or applicable explicit grant), stale-version checks, receipts and per-field audit history. Schema changes are pinned to the workspace schema fingerprint.

The model cannot approve its own proposal. Embedded approvals continue to use the authenticated standalone review portal. A trusted in-chat human confirmation channel remains a host integration gate; no weaker model-callable confirmation was introduced.

## Visualization

A field's `renderer` is its reusable default across views. A saved view can override renderers by field key. Definitions/configurations are versioned with their parent schema/view.

Display kinds: text, badge, progress, number and code. Numeric displays support min/max, prefix/suffix and decimals through the schema/MCP. Code receives `input.value` only and returns text or `{kind: "text" | "badge" | "progress", text, value?, min?, max?}`. Returned text is escaped by React; no arbitrary HTML executes in a cell. Failures fall back to the underlying value. Sorting and filtering always use underlying typed values.

For arbitrary HTML/CSS interfaces, use the existing isolated saved frontend-code host. This release does not replace it with a fixed component catalogue or add a separate global renderer registry.

Saved timelines accept dateField and optional endDateField and render bars over the loaded page's date extent. Open a record to edit dates through the existing review path; bars do not silently reschedule records. View columns, grouping, filters, sort and renderer overrides remain saved configuration.

## Validation and release boundaries

`tests/derived-fields.test.ts` exercises a synthetic CRO proposal comparison: linked vendors, sum lookups, budget variance, date arithmetic, custom display, source edits, current values, scoped runtime reads, model self-approval rejection, hidden-source propagation, saved-view filtering/aggregation, reference search, cycles and unavailable sources. Existing suites cover approval/audit, reversals, concurrent/stale changes, tenants, documents, frontend isolation and workspace execution.

No customer data is used in tests. No database migration is required: existing versioned JSON schemas and view configuration store the additive contract. Python, external adapters, trusted in-chat approval, a global renderer registry, retrospective derived-value snapshots and large-table materialization remain outside the implemented release.
