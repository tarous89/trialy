# Approved tracker UI and responsive interactions — 0.2.14

The previous implementation copied the approved CSS but rebuilt a reduced interface. Every tab/search/detail event also reran QuickJS and reread all bound tables. Its content-sized iframe limited the drawer height, while draft and review controls accumulated above the tracker.

This release uses the approved title/subtitle, tabs, toolbar, table and Settings structure in one shared renderer. Standard trackers receive an authorized bounded snapshot and trusted controls; the fixed browser copy handles tabs, search, sort, details and layout immediately. Only exact known template source receives this path. The preceding default renderer is upgraded on opening without modifying stored source; user-customized source remains in QuickJS.

Save, record creation, edits and layout actions use a dark floating footer with one sentence and primary CTA. A trusted footer click authorizes the exact visible changes; backend previews, digest confirmation, permissions, stale-version checks, audit and idempotent receipts still apply. Custom events cannot impersonate that approval. Failures retain drafts and retries reuse the receipt.

Each empty data tab gets one typed, clearly labeled fictional example, with meaningful tint pills. A populated tab shows real records; examples never enter totals or database writes. Optional per-tab examples support tailored content. Default visible fields are the first five plus Source, unless visibility is explicitly specified; all bound fields remain in Details and Layout.

The host header and action footer stay fixed. The remaining tracker document is the only vertical scroller. Tables scroll horizontally, and row details occupy the full available viewport with a resizable left divider. Settings follows Tracker / Tabs / Columns, a selected-tab dropdown, display labels, readonly database types, visibility, drag handles and Alt+Arrow keyboard reordering.

## Verification

- Production build and TypeScript check pass.
- All 69 backend tests pass, including authorization, stale edits, atomic schema saves, example isolation and custom-source recognition.
- Embedded production bundle tested with real QuickJS and PGlite behind a synthetic MCP host: preview-first save to Home/project, record creation, edit/discard, pending edits across tabs, persistent layout, colored fields, settings, mobile and an untrusted custom-action approval regression.
- Tab/details/search interactions produce zero runtime requests; local tab switches measured around 0.1 seconds including browser-test overhead. This is local evidence, not a production latency guarantee.
- Geometry checks verify a one-row tracker opens viewport-height details, fixed footer and no nested vertical element scrollers.
- Home/navigation/Database redaction/filtered export/mobile regression passes.
- Screenshots in `docs/design/tracker-experience/` capture the actual production bundle and were visually inspected.

## Deployment and test

No migration, infrastructure or environment changes are needed. Deploy the existing web and worker services from main. Refresh the Trialy connector/tool definitions and start a fresh test conversation; reopen saved standard trackers to load the new renderer. The deployed `read_tracker_design` workflow is versioned with the server. Independently cached/installed plugin package synchronization is not assumed.

Actual ChatGPT-host behavior must be tested after refresh; the automated embedding harness does not reproduce every host sizing or cache behavior. Search/sort is scoped to the loaded page; pagination still fetches authorized server data. Adding database fields/tabs, granular permission semantics, table/row resizing and generic duplicate/delete remain separate supported-backend work, not fake template controls.
