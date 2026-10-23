# Tracker creation and embedded delivery repair

## Problem and behavior

An existing chat displayed the old database-first shell and unrelated PI records while a Companies schema preview was being prepared. Current server HTML differed from that screenshot; the exact host caching/registration cause could not be established. The old unversioned resource URI, broad UI metadata on internal tools, JSON preview rendering and reference-only design workflow were confirmed weaknesses.

New workspace resources use a hash of the actual embedded bundle. Legacy resource reads still return the current bundle; new open tools advertise the versioned URI. Schema, read and prepare operations no longer carry navigation metadata. Explicit open_workspace, open_tracker_draft and open_tracker select Home, an actual unsaved tracker or a saved component. The separate legacy open_tracker_preview retains old guest recovery.

prepare_tracker validates existing authorized schema and generates frontend-js from the approved Theme 2 stylesheet and a reusable connected runtime. The model supplies the business tabs/fields and may choose a custom implementation for explicit user changes. Schema compatibility does not imply relevance of existing records. No first-table auto-selection or PI record copying is used. Exactly one fictional primary example appears only when all bound tables are empty; it never enters record writes or totals. Source fields are required unless the user explicitly customizes that default.

The generated tracker supports bound cell editing, an exact reviewed batch save, ignoring pending edits, trusted new-record entry, record details, page search/sort, pagination, and persistent reviewed layout labels/visibility/order. Layout changes preserve field identities and authorization. The frame grows to its content, technical controls are collapsed, and previews use readable structured summaries with technical details available on demand. Event queuing prevents a click immediately following an input change from being lost. Preview confirmation waits for its render to finish before replacing it with the saved tracker.

No database migration, environment changes, permissions expansion or production fixture data are required. No existing saved tracker source is silently rewritten.

## Verification

- 67 backend tests, including new tracker creation with an unrelated PI table, example isolation, real records, batch review, stale version denial, persistent layout and binding tamper rejection.
- Production embedded bundle in a synthetic MCP host using the real isolated JavaScript engine and database: Home, background-result navigation isolation, real preview, save/open, Add record, Ignore edits, Save edits, layout save, desktop/mobile.
- Existing Home/navigation/Database redaction/Logs export/mobile checks.
- Skill validation and an independent skill forward-test on the outreach prompt.
- Screenshots in tracker-experience/ contain synthetic data only.

## Remaining boundaries

Actual ChatGPT host acceptance and installed package refresh are separate from server deployment. Retest in a fresh chat after refreshing tools. The backend now serves the current instructions directly through read_tracker_design; the connector package cannot be assumed updated merely because its repository version is updated.

The default skeleton does not implement every interaction in the aspirational HTML reference: drag resizing/reordering, generic duplicate/delete, creating a related record inside its picker, and granular role overrides remain limited by current runtime/backend support. Keyboard ordering and the existing backend access editor are used; no fake controls or local-only persistence are added. The skill integration reference explicitly records these boundaries. Search and sort currently operate on the visible page and are labelled accordingly. Users can request custom frontend-js extensions.
