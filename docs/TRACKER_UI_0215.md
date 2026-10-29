# TrialAgents 0.2.15 — previews and field defaults

Home lists the current user's valid frontend tracker/form/visualization creation previews alongside saved work, with an explicit Preview badge. Listings include only authorized metadata, not generated code or sample values. Previews remain temporary (24 hours), cannot be moved as saved objects, and disappear on save, discard or expiry. Reopening rechecks permissions and validity. Older drafts invalidated by schema or template changes must be regenerated; saved trackers are preserved.

The save footer has one sentence and one Save action, without a destination selector. ChatGPT's workflow now inspects existing projects and chooses a clear contextual match before preparing the exact save; otherwise it uses Home. This is model-guided selection, not a name-matching heuristic in the browser. No project is created implicitly. Later moves remain available.

New tracker columns default to visible; explicit visibility settings remain respected. New fields in prepare_tracker (new tables and extensions), task setup, and application field-creation controls default to multiple values, except date/status/boolean, scalar calculated fields and unique identity fields. Existing schemas and values are not migrated. The low-level generic schema API preserves its existing contract; the skill instructs ChatGPT to supply multiple:true for newly declared fields through that API. Explicit single-value overrides remain supported.

Multiple text, numeric, money and select values are validated individually, alongside existing reference lists. Scalars remain valid for backward compatibility. Trusted tracker editing, record entry, standalone and embedded database editing, public forms, workspace writes and CSV import accept the supported arrays. Values containing commas remain intact. Public form conditions match any selected value. Reference access checks remain per-item; invalid options, duplicate lists and wrong numeric types are rejected. Lists are bounded to 100 values.

Home uses the approved Theme 2 font stack, 16px base text, larger controls and darker text. Welcome copy, redundant headings, empty project navigation and technical footer text were removed. Projects, filters, search, layout switching and New remain available. Generated tracker styles remain isolated.

Validation: 70 backend tests, TypeScript and production builds; real QuickJS/PGlite synthetic-host browser acceptance for Home preview reopening, exact save, project destination, multi-value add/edit/save/reopen, layout, mobile and custom-action approval boundaries. Standalone Home/navigation/Database redaction/export browser checks also pass. Screenshots are in docs/design/tracker-experience. Real ChatGPT host acceptance remains user-side.

Release: existing main-branch Render web and worker services; no migration or configuration changes. Refresh the app and TrialAgents connector, then use a new chat for updated creation instructions.
