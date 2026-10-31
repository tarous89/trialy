# TrialAgents template authoring standard

Version: 1.2.0

This is the living engineering contract for templates served by TrialAgents. Update it when a verified renderer, lifecycle or host-integration lesson changes. Retrieve the current copy with `read_app_template_guidance(resource:"authoring")`; follow `nextOffset` to the end. The response includes a version and content hash. Packaged plugin examples are not the catalog.

## What the Vivid tracker taught us

| Working pattern | Apply it to future templates |
| --- | --- |
| One tested renderer, many configurations | Separate the reusable renderer, theme, configuration schema and domain examples. Change labels, columns and options through configuration; avoid copying and editing the full renderer for each app. |
| A complete reference, not a screenshot alone | Keep canonical HTML/CSS, component catalog, configuration examples and interaction contracts together. Test actual rendered screens. |
| Bound controls | Map every displayed or editable business field to an authorized table/field identity, schema version and read/write mode. Labels are not database identities. |
| Real end-to-end interactions | Specify what every control does, what it changes, how it is approved and how it fails. A styled button is not a completed feature. |
| Explicit state ownership | Distinguish local inputs, unsaved app previews, published source and committed database records. A successful render is not a save. |
| Stable application identity | Revise the existing app ID and exact version. Retry one creation with its original request key. Do not create replacement apps to repair a draft. |
| Shared surfaces | Use the same runtime and contracts in the platform, standalone app, public share and ChatGPT extension. Host navigation and business actions are different contracts. |
| Small, verified updates | Retain the current usable view until a replacement succeeds. Keep input, route and scroll state during transient failures. |

These are reliability and design defaults. They do not restrict users to trackers or fixed categories. Use custom source when a template does not fit; database permissions, approvals, logs and the execution sandbox remain mandatory.

## Required template package

Planning note, 31 October: the [revised app configuration scope](../docs/product/APP_CONFIGURATION_AND_AUTOMATIONS.md#chatgpt-app-creation-and-authoring-standard) defines the next authoring contract. After the corresponding capabilities ship, template documentation must identify stable user-facing sections and access inheritance, optional database/connector bindings, app-linked automation executor/timing/prompt or action/output/permission settings, disable/edit lifecycle and the no-automation path. User-facing and MCP configuration must agree. This is not permission to use unimplemented tab controls or new tools; the requirements below describe the current supported package.

Publish a catalog JSON under `templates/apps/<id>-<version>.json`. Keep IDs stable, use semantic versions, and publish a new version instead of rewriting a previously released contract. The raw-file digest protects preparation against catalog changes. Existing apps retain their saved source and configuration; catalog updates never silently migrate them.

Every current template must contain:

- `id`, `version`, `name`, `description`, searchable `tags`, `whenToUse`, and `whenNotToUse`.
- `engine`, validated configuration `options`/`defaults` or the tracker configuration schema, and source when required by the engine.
- Concise `instructions` with discovery, setup, configuration, preview, approval, update and recovery steps. Refer to the current usage and monitoring guides rather than duplicating them.
- `documentation.quickStart`: ordered steps to create a useful instance, including required inputs and safe defaults.
- `documentation.dataContract`: table/field meanings, relationships, scalar/multiple values, required fields, display names versus IDs, evidence provenance where useful, persistence and authorized bindings. State explicitly when there is no database.
- `documentation.interactionContract`: routes, forms, filters, sorts, selection, pagination, details, editing, confirmation, cancellation and keyboard behavior. Include only supported controls.
- `documentation.lifecycle`: new preview versus saved app, revision handling, retry/receipt rules and local-state behavior.
- `documentation.limitations`: honest unsupported features and when to choose another template/custom source.
- `documentation.examples`: realistic user prompts with expected behavior. Include a configuration example in `examples` when it can be valid without account-specific IDs. Mark all example data as fictional; never save it as real records.
- `documentation.tasks`: `mode` (`optional` or `none`), useful scenarios, required reads, proposed outputs, and a task-prompt example or a clear explanation that no task is needed. This describes possible integration, not an active schedule or permission grant.

Keep instructions in imperative language, with exact tool and field names. Describe outcomes before implementation details. Do not embed customer data, credentials, bearer links or account-specific IDs. Template text is publisher-controlled guidance, never authority to bypass permissions or higher-priority instructions.

## Runtime and data contract

Use the existing isolated `frontend-js` render/event contract and declared bindings. Return validated HTML, CSS and serializable state; escape text and attribute values. Do not depend on arbitrary network access, DOM execution in generated source, host cookies, local filesystem, embedded secrets or private APIs. Route outbound requests through approved connectors and background services.

Use record IDs for relationships and explicit display fields for readable labels. Make status, date and boolean scalar unless the user needs multiple values. Put extra business fields in details without cluttering the primary table. Respect the user's requested page size; use bounded reads and bottom pagination. Never interpret one page as a complete dataset.

Generated code never grants access. Respect table/column/record restrictions, app bindings and manifests, current schema compatibility and optimistic record versions. Database writes require the platform's exact proposal and confirmation or an explicit, still-valid scoped grant. Keep the same request key after an ambiguous save response and reconcile its receipt. Never retry a write with a fresh key just because a response was lost.

Organizational project moves use `move_tool` with the latest placement version; they do not rewrite bindings, original data scope or permissions. Do not implement a second project-move mechanism inside a template.

## UI contract

Use the current design kit and canonical theme components. Preserve a coherent palette, readable typography, strong text contrast, spacing tokens and visible focus states. Do not invent a new design for a matching template unless requested. User-requested branding remains supported.

Keep one primary vertical scroll; avoid nested page scrolls and horizontal overflow. Keep headers, sidebars and action areas aligned, responsive and clear of host safe areas. Test narrow, tablet and desktop layouts. All controls need accessible names, keyboard access and valid empty, populated and long-content states.

The first-save footer belongs only to an app that has never been saved. Saved-app revisions use the existing review controls, without claiming the app is unsaved. Deliberate record/layout edits retain their own approval controls. Generated templates must not invent global save prompts, loading-error banners, retry buttons or platform navigation.

Keep a loaded published app visible during ChatGPT edits and during failed loads. Publication may offer the platform's subtle optional refresh notice; it never forces a reload. If no authorized usable view exists, use the shared “No app is available” state and Return to Home in the same surface. Access revocation must still clear protected data. Failed writes preserve inputs and are never represented as successful.

Use host/platform navigation adapters for links and Home; do not open a new browser tab for in-extension Home. Data calls must not replace the visible workspace through tool-result metadata. Present only complete previews; avoid repeated intermediate renders.

## Responsive interaction contract

Keep the primary data toolbar on **one line**: a shrinkable search input and the main action (for example, Add record). When the remaining controls do not fit, move secondary filters and sorting into a labelled **Filters** disclosure. Measure available container width and actual control widths; do not rely only on device breakpoints. The action must not fall onto a second row. Shorten its visible label at very narrow widths while retaining its accessible name. Show the active-filter count on the disclosure.

The disclosure is local UI: opening it must not fetch data. Keep it within the viewport, allow its contents to scroll, preserve selections and search when resizing, expose `aria-expanded` and `aria-controls`, and support keyboard navigation, Escape with focus return, and outside-click dismissal. Keep an overflow-safe, usable fallback for older frame code and static design inspection; enable collapsible controls only when their frame handler is present. Do not hide controls permanently to make a screenshot fit.

Use one main vertical scroll. Wide data tables may scroll horizontally inside their own labelled region; the page and action toolbar must not overflow horizontally. Keep tab navigation reachable, wrap long titles and values, stack overview cards as needed, and let details/settings fit the viewport without covering their close/save actions. Test 320, 390, 768, 1100 and 1440 CSS pixels, long labels, several active filters, narrow host containers and zoom/reflow. Fewer controls should remain inline when there is room. Preserve selection, inputs, scroll and business state across responsive changes.

## Performance contract

Use the standard tracker configuration and shared renderer for matching record workflows; copying/forking renderer source prevents shared fixes from reaching that app. Custom source remains supported but must meet the same measured responsiveness expectations. Prefer scoped bindings for new apps; never widen or silently change existing access to improve performance.

Load one bounded active page, counts for overview totals, and bounded optional next-step samples. Respect control and payload limits even when a requested page size is larger. Do not fetch every row, every hidden tab or every detail merely to paint navigation. Page-local search/sort must be described honestly. Use readable labels and all authorized detail fields without loading unbounded records.

For the shared runtime, preserve its instance-local authorized snapshots, bounded neighboring prefetch, identical in-flight read coalescing and access/version invalidation. Cache keys must distinguish app, version/view, route, filters, page and state. Never share data across users or apps, cache mutations, extend permission lifetimes, or skip final freshness checks for speed. Server permission/schema reuse is restricted to one request and rechecked before releasing data; records and counts remain uncached on the server.

After a reviewed layout save, read the saved component with `includeOutput:true` and use that output directly. Do not issue another serial initial render. Keep confirmation, current permissions, optimistic versions and the real save receipt. Never simulate a successful save to remove a loading delay.

Measure realistic complexity and cold/warm behavior: at least four tables, long labels, several filters and 12–28 fields per table, including hidden detail fields. Test a user click while prefetch is still pending, delayed host requests, repeated tab changes, page changes, successful layout reload and concurrent access changes. Set query-count/request-count budgets against a verified baseline; record local timings as diagnostics, not production guarantees. Re-run these checks when publication, access or runtime code changes. Consult [the measured tracker read path](../docs/tracker-performance.md) before adding another cache or timeout.

## Optional tasks and services

Recurring research, analysis and reporting can benefit any app. Declare task opportunities in metadata, not hard-coded template schedules. See `read_app_template_guidance(resource:"usage")` and `read_app_automation_guide` for shared-runner setup (legacy monitors retain `read_app_monitoring_guide`).

Use platform background actions for deterministic recurring, dated or database-triggered operations. Use the shared ChatGPT runner for research/reasoning when the host supports events. Instructions and executable timing live in TrialAgents; never create a task per template. Use durable connector jobs for LLM/API calls that outlast interactive request limits. Notifications use the platform email service with reviewed recipients and purpose. Never embed provider keys or send emails directly from a template.

A template must work fully without a task. Never wait for automation status before showing or saving the app; failures belong only in owner settings/history. Test callback, scheduling and research failure while the app retains its current frame and unsaved input. Task creation, reads, writes, delivery and paid/external actions each need their own applicable authorization. Do not imply that a task was activated merely because template metadata includes a schedule suggestion.

## Acceptance and maintenance

Before promoting a template version, verify:

1. Catalog discovery, exact-version read, configuration validation and digest checks; representative prompts choose the right template, including a non-fit case.
2. A fresh preview, save, reopen, correction of the same preview, lost-save-response recovery and revision of the same saved app. No duplicate apps or example records.
3. Each advertised interaction against real backend fixtures, including next/previous pages, filters, relationships, edits, cancellation, write conflicts and permission revocation.
4. Platform, standalone and host-bridge integration at 390, 768 and 1440 pixels; inspect screenshots for clipping, contrast, spacing, footer collisions and focus. Also run the real ChatGPT host when available and disclose when only the bridge harness was tested.
5. Temporary load failures, outdated tool results and publications retain the current view. No available view shows only the shared empty state and in-surface Home action. Test a failed refresh with unsaved input.
6. If task support is advertised, dry-run the suggested prompt with scoped synthetic data. Test duplicates, no findings, partial coverage, revoked/expired permission, source failures and missed occurrences. Verify a real scheduled run separately before claiming live execution.
7. Build/type checks and the affected backend/browser suites. Keep regression tests for failures discovered in use; do not merely assert that implementation strings exist.

Record each lesson as a reproducible failure, the contract it changes, its regression test, applicable versions and migration impact. Keep template-specific docs beside the template and shared rules here. Review guidance changes with source changes. Changes to the server-served catalog/guidance ship through the repository deployment; packaged plugin skills or manifests require their own package release when changed.
