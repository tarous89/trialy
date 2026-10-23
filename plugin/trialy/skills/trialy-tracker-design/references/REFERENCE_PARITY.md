# Reference-to-skeleton contract

Read this with TRIALY_INTEGRATION.md before constructing or revising a tracker. This is the concrete mapping of the approved HTML's structure, CSS and event handlers to the connected implementation. It overrides older aspirational language elsewhere in the package. User instructions take precedence over presentation defaults.

## Reuse, do not reconstruct

`assets/approved-theme2-reference.html` is the preserved visual/behavioral specimen. `assets/connected-tracker.js` is the executable reusable skeleton, compiled by `prepare_tracker`. The compiler imports the reference's complete stylesheet, supplies a validated configuration and declared bindings, and appends the skeleton unchanged. The same renderer runs in isolated server rendering and in the trusted browser frame. The frame, not generated code, supplies real editors, resize pointer handling, pending edits and database actions.

For a new tracker change the configuration: title, description, tabs, authorized field bindings, labels, explicit visibility overrides and fictional examples. Do not ask the model to rewrite an entire HTML document from memory. Do not paste the specimen's local database, permission simulation or vendor logic into a connected tracker. For intentional custom source, retain the applicable contract and test that source separately; custom source is not automatically upgraded or trusted to execute in the browser.

The server exposes this document as `read_tracker_design(resource:"parity")` and the exact renderer as `resource:"skeleton"`. Follow nextOffset until null. The skeleton is a render-function body, not a standalone HTML file: inputs are config, theme, input and tools; output is html, css, controls and state. Its dependencies are deliberately supplied by the platform.

## Detailed feature mapping

| Reference structure / handlers | Connected skeleton rule and status |
| --- | --- |
| Root tokens and final Vivid Tints overrides | Import complete reference CSS in order. System sans-serif, 16px body, dark ink #102022 and muted #46585b. Preserve spacing, borders, focus rings, settings layout and semantic status colors. |
| displayValue / source-link / tags | Latest user override: ordinary names, prose, emails, URLs and lists use neutral ink. Multiple values alone never justify colored tags. Color only categorical status/choice/boolean and permission states. Source URLs currently display as neutral text in the sandbox; outbound navigation is not supplied by this skeleton. |
| trackerView / renderTabs / renderStats | Title and optional short subtitle; tabs with icon-only settings on right. Host owns logo/navigation. Overview shows actual authorized totals and one example card per empty tab. No fictional metric counts. Domain-specific next-action/ratio cards require explicit derived bindings, not copied CRO logic. |
| renderTable / colWidth / colGroup | Every configured field shown by default, including Source, unless explicitly hidden. Explicit colgroup widths and sum-based table width prevent compression. Initial width 190px, notes/source/next-action 235px, pinned Details 84px. Horizontal overflow only; no table-owned vertical scrollbar. |
| column pointer resize | Drag header's right edge, 85–650px. Keyboard arrows change by 10px. Stable field IDs retain sizing through local tab/filter/details changes. Pointer cancellation restores original size. |
| row pointer resize | Drag bottom edge in Details cell, 38–180px, initial 54px. Keyboard arrows change by 10px. Keys use table and record identity. Long content is clipped when collapsed; full editor/details reveals it. |
| Sizing persistence | Width/height preferences are local to the open tracker session, like the specimen's memory-local preferences. They are not database field changes or shared saved-layout settings. Reopening can reset them. Do not promise cross-session persistence. |
| beginCellEdit / beginDetailEdit / editControl | Click neutral value to reveal typed editor; first column is editable, not a details link. Real permitted primitive fields use trusted controls. Multi-value fields have separate values with add/remove controls. Derived/restricted fields remain read-only. References are read-only inline; use supported record form for relationship creation. |
| finishInline / stage / pendingFor | Editing stages values. Blur/Enter closes editor; Escape cancels the current editor session. Pending real edits highlight green; table and details use the same bound identity/pending map. No write occurs from typing. |
| savePending / discardPending / renderEdits | Host's dark fixed floating footer: concise sentence, Save edits, quiet Ignore edits. Real writes use exact validated proposal/digest/version. Discard restores originals. Failure retains pending changes. |
| Empty-tab examples | Exactly one labelled fictional example per empty tab. Its permitted fields can be edited locally to try the UI (multiple values: one per line). Example edits never enter backend controls, record proposals, metrics or Save tracker. On reopen they may reset. No unrelated existing records or fictional source URLs. |
| showRow / showDetails / renderDetails | Rightmost pinned Details arrow only. Drawer spans full available viewport, even with one row, thin left divider, no shadow, light backdrop. Full permitted fields, same pending values. Page-level vertical scrolling, Escape/backdrop close, focus trap and focus restoration. |
| drawer resize | Left-edge drag and keyboard; minimum365px, full width on mobile. Host header/footer remain fixed; no independent short table-height drawer. |
| visibleRows / renderFilters / compare | Local search and ascending sort on loaded authorized page. Pagination fetches additional pages. Scope is visibly labelled “this page.” Domain filters, descending/header sort and manual-rank logic from the specimen are not generic shipped controls. Never claim whole-database filtering from a page snapshot. |
| editForm / saveNewRecord | Add record uses trusted host form and reviewed backend save. Disabled until tracker is saved/writable. It is not a local example insertion. |
| duplicateSelected / deleteSelected | Not supplied by generic skeleton. Use separately authorized backend operations; do not add decorative buttons or copy local array mutation from specimen. |
| createRelatedVendor / returnToForm | Nested create-related-and-return is not supplied. Existing authorized reference picker is supported in the record form; never fabricate relationships. |
| followupForm / nextAction / qualification checks | Vendor-domain examples only, not universal features. Follow-up history, ranking constraints, evidence and calculated workflows need actual schema, logic and authorization. |
| settings / renderSettings / collectSettings | Full-page Settings, only Layout and Access control. Tracker name then description; Tabs: drag/name/visibility; Columns: tab selector then drag/label/read-only backend type/visibility. Spacing from reference. Save layout uses host footer; back/discard abandons presentation draft. |
| moveDraft / dragHandle | Drag reorder and Alt+Up/Down alternatives, stable field identities. Renaming labels never renames DB keys; hiding is presentation only. |
| addSettingsTab / addSettingsColumn | Create/rebind via ChatGPT's validated schema/tracker workflow. Not local-only Add tab/column buttons. Existing fields strongly preferred; no silently replaced types or merged data. |
| effectiveColumnAccess / changedAccess / changePersonRole | Reference's Owner/Editor/Viewer/Custom, per-tab/per-column UI is a prototype policy model. Connected Access opens actual backend sharing; do not expose simulated toggles. Backend authorization always wins; schema visibility is not row access. |
| saveSettings | Validated persistent metadata, order, labels and visibility only. Binding/type/security changes require their own backend workflow. Preserve at least one visible tab. |
| mobile CSS / keyboard / focus | Single document vertical scroll, horizontal table overflow, fixed Details, full-width drawer, wrapping toolbar/settings. All icon-only controls labelled, resize and reorder keyboard accessible, visible focus. |

## Release acceptance gates

Test the actual shipped renderer and bridge, not just phrases in this skill. At minimum: a wide multi-value tracker, neutral ordinary text/URLs, semantic pills, click/edit/blur/Escape, table ↔ details value consistency, example edit without any record writes, real save/discard and stale-write rejection, pointer and keyboard sizing with bounds, size retention after tab changes, full-height details, mobile horizontal overflow, settings save, and zero backend calls for local interactions.

Keep the preserved HTML intact. When changing the skeleton register the previous exact renderer hash so saved standard trackers upgrade; never replace custom source. Audit any older unsaved preview whose approved digest embeds previous source: do not mutate an approved payload behind its digest. Regenerate if incompatible.
