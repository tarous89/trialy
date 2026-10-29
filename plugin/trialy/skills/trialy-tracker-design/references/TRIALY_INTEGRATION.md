# Trialy runtime integration

Current visual authority: [TEMPLATE_REUSE.md](TEMPLATE_REUSE.md) and the fixed component kit extracted from the supplied HTML. Use it as the default and honor explicit user customization; backend authorization and persistence rules still apply.

The HTML and screenshot are preserved reference assets, not the whole plugin interface. Start from their Theme 2 styling and interaction patterns unless the user specifies otherwise. Adapt business labels, tabs and fields to instructions and authorized data. Do not populate unrelated trackers with fictional vendors. If showing example rows, label them as examples and keep them separate from real data.

Read the sibling trialy-workspace skill and current frontend/execution contracts before implementation. The browser HTML example uses DOM event handlers and local memory. Trialy frontend-js uses the isolated trialy-frontend-js-v1 render/event contract; port interactions to supported data-action events and state. Do not paste the HTML script into QuickJS, relax the sandbox, or imply local Save is a database commit. Read all paginated design resources to completion through read_tracker_design if this package is not locally available.

The app owns identity, account connection and cross-tracker navigation. A persistent header outside the generated tracker contains Trialy and Open app. Tracker title, tabs, Layout and Access control belong to the tracker surface.

Access policy is stored and enforced by the backend independently of generated source. The trusted Access control entry opens the existing component sharing review. Component access currently supports eligible-user allowlists and AI access, constrained by project/workspace/data permissions. Owner/Editor/Viewer badges and per-tab/per-column overrides in the reference are a design model, not a claim of implemented enforcement. Do not expose active-looking unsupported permission toggles. Implement additional policy semantics on the backend before offering them. Hiding columns is presentation, never authorization. Replacing tracker source cannot grant permissions or reset policies.

Require a connected account before creating a tracker or other tool. Call initialize_account in the background to initialize account storage automatically; do not ask for workspace creation. Projects are optional: use projectId:null and a workspace-scoped manifest for independent tools. Reuse existing authorized fields. Organization through move_tool never changes data bindings or access. Previously issued temporary previews retain their recovery path until expiry, but preview_tracker no longer creates new drafts.

## Connected resource contract

Before choosing columns, call read_workspace_schema and find_field_candidates, paging through relevant schema. Strongly prefer compatible existing fields and relationship paths. Consider context, type, units and cardinality, not just labels. Create a field only if no existing field correctly represents the fact; explain why in the schema review. Schema-only fields cannot be read without authorization and must not be copied to evade restrictions.

Save new account-backed trackers with resourceKind: tracker and a version 1 manifest. Each manifest field names id, typeId, field, schemaVersion, kind and mode (read/write), plus optional local label. Every data binding must be covered. Default scope: workspace for an independent tracker in Home. Use project scope when the user intends linked project records only; project placement alone never changes data scope. Use resourceKind: visualization with read-only fields for dashboards. Read docs/CONNECTED_RESOURCES.md for the current enforcement boundary.

For data entry, return controls:[{slot,fieldId,recordId}] from frontend-js and place a span with data-trialy-slot matching each slot in the generated HTML. The server supplies current values and the trusted frame supplies inputs and reviewed edits. Mark only transient filters/layout inputs data-ui-state. Do not hand-code business inputs with local-only Save behavior. Calculations and charts must use declared live reads. Newly created records use the reviewed records.propose path; project linkage follows that save.

## Shipped connected skeleton

Use prepare_tracker for the default implementation; the approved HTML CSS is reused directly with assets/connected-tracker.js. The server verifies existing fields or temporary newTables definitions and supplies the manifest. prepare_tracker displays the preview immediately, without opening Home or committing schema. Approval saves required new tables and tracker together. The template reads only explicit bound tables; it never selects the first account table. One fictional example is displayed in each empty data tab and never included in write proposals or totals. Override with showExample:false when requested.

The template supports reviewed persistent presentation changes through layout.propose; this cannot add/rebind fields or alter permissions. Saved cells stage in the trusted frame. The dark floating footer shows one sentence and Save edits; that click authorizes the exact visible changes, which are validated, proposed and confirmed with a digest on the backend. The dismiss control restores the original values. Layout saving follows the same flow. Errors retain edits and never report an unconfirmed save. Add record inserts an unsaved inline row; saving uses the protected reviewed backend write. Source remains visible by default. Every saved tracker opens using open_tracker; schema tools are background operations.

Use Vivid as a reusable default. Users may customize branding, fonts, icons, layouts and interactions or request fully custom frontend-js code, including revisions of saved template tools. No design exception or capability whitelist is required. Use prepare_tracker / prepare_tracker_revision for template configuration and theme; use save_component for custom source with authorized bindings and a complete manifest. Preserve database validation, access controls, reviewed writes and audit logging.

## Responsive execution

The approved renderer runs once against bounded backend reads, then a fixed, CSP-hashed browser copy handles tabs, search, sort, details and layout over that authorized snapshot. These local actions do not call MCP or reread tables. Pagination beyond the loaded page, reopening, writes and permission rechecks use the backend. Search/sort applies to the loaded page, as labeled. Exact legacy default renderers are upgraded on display; custom source is preserved. No eval, arbitrary browser scripts, network access or policy bypass is introduced. This is an HTML template implementation, not a separate generic table UI.

Default new trackers to all columns visible and multiple-value editable fields (except dates/status/boolean and scalar calculated or unique identity fields). Preserve reused schema cardinality. Previews remain private, reopenable from Home, and labelled Preview until saved, discarded or expired (24 hours). Choose an existing matching project from context or null before preparing a preview; Save has no project picker. The visible save confirms that exact destination.

For the complete reference-to-runtime map and reusable skeleton contract, read [REFERENCE_PARITY.md](REFERENCE_PARITY.md). Neutral ordinary text/links override the specimen’s green source links and generic tags.


Standard tool creation now stores configuration for trialy.standard.v1. See CONFIGURATION.md for typed inputs and revisions; the application owns all HTML/CSS.
