# Dynamic templates and existing-app reuse

Approved and implemented 30 October 2026. Extends the simple-app scope without changing the app UI or the database, approval and audit boundaries.

## Stable discovery contract

Before creating an app, the plugin checks authorized app metadata and the server catalog. It reads only the selected app source or template. Templates are optional accelerators; arbitrary supported custom apps remain allowed.

- `list_app_templates`: bounded, searchable summaries, use/avoid guidance, latest active version and digest. No source in list responses.
- `read_app_template`: one exact version, current instructions, configuration schema, defaults, examples and sandboxed source where applicable.
- `prepare_app_from_template`: exact version/digest, server-validated configuration and authorized bindings; displays an unsaved preview.
- `prepare_app_from_existing`: source app and exact version; shared or separate database choice; new app preview. Original apps and records are untouched.

Discovery is quiet. Preparation opens the extension. Save uses the existing digest-bound confirmation and returns to Home. No template, source text or catalog guidance can grant permission, approve a write or override runtime limits.

## Publishing templates without a plugin release

The publisher maintains versioned JSON files in `templates/apps/`. Add a file and deploy the server through the existing repository release process. The server reads the directory at discovery time; the tool names and input shapes do not change. No plugin package upload is required for new templates using the supported engines. This is a repository-managed catalog, not an end-user upload facility or an admin gallery.

Keep published versions immutable. Add a new semantic version for changes and retain old files. A digest binds each read to preparation, so in-place changes reject an old preparation request. Mark a retired version deprecated to prevent new preparation. The latest deprecated version hides the template from discovery; explicit old active versions remain readable/preparable. Existing app source/configuration and saved data remain intact regardless of catalog changes. The shared Vivid runtime still receives normal platform maintenance; catalog versions do not freeze the entire platform runtime.

Supported engines:

- `tracker`: Vivid `trackerSetup` configuration, including existing or proposed new tables, fields, views, theme, examples and pagination. Database structures are created only with the reviewed app save.
- `frontend-js`: sandboxed app source, declared database bindings and optional business manifest. Source receives JSON-encoded `templateConfiguration` and `templateBindings`. Configurable fields support bounded strings, finite numbers, booleans and string enums; unknown fields are rejected. The existing sandbox and manifest checks validate actual execution/data usage.

Initial catalog: Vivid tracker, budget calculator and planning checklist. The latter two explicitly keep state local and do not claim persistence. Catalog assets/source and detailed guidance are served on demand; packaged references remain compatibility documentation.

Adding a new engine, networking capability, authentication model or integration remains a server/tool contract change and may require a plugin release and OpenAI review. Dynamic templates are not a review exemption. Public submission is a separate action.

## Existing-app reuse and data isolation

Find candidates with `read_account_home`; use `read_app` to read authorized source/configuration. The new reuse tool supports:

- `shared_data`: the new interface references the existing authorized tables. It does not clone their rows.
- `separate_data`: supply complete replacement bindings/source, or tracker configuration with new tables. Original table bindings are rejected. New tracker tables and the app save atomically; no records are copied.

Source access, archived state and version are checked during preparation, rendering and confirmation. Copies created by this flow are creator-only, further restricted by any target project. AI is enabled only when the copy is made through an authorized AI actor; a human copy does not silently release source to AI. Function grants, file references, schedules and connector authorizations are not inherited. Source depending on those must be adapted or separately authorized. General authored source may contain literals: users/builders must review adapted content, not assume rebinding automatically removes hard-coded data or links.

Template and reuse provenance are included in the reviewed operation and saved component revision/audit snapshot. The original app remains unchanged. Existing legacy duplicate controls retain their prior restriction-preserving behavior.

## Validation

Tests cover discovery of added files without a tool/package change, old-version reads, pagination, digest conflicts, rejected unknown configuration, sandbox rendering for starter templates, reviewed atomic table creation, shared/separate data, creator-only copies, no cloned records/grants, denied source access and stale-source rejection at save. Existing core/browser suites remain release gates.

## Optional background work

Current contract: [Apps, access and automations](APP_CONFIGURATION_AND_AUTOMATIONS.md#chatgpt-app-creation-and-authoring-standard) applies to every template/custom app. Consider interface, data, app access, connectors and optional automations. Standard tracker tabs may declare stable accessId values; omission keeps app-level access. Use the unified Automations list for owner editing/disable/history. Recheck shared runner setup on every app creation without blocking saving, duplicating subscriptions or resuming a deliberate pause.

Every template's instructions must classify requested research/analysis as shared ChatGPT automation and email/deterministic effects as TrialAgents app actions. Read the current `read_app_automation_guide`; executable timing and detailed instructions live in the database, not generated app source or a per-template task. Save the app first, reuse the owner/workspace runner, inspect existing monitors, and propose separately reviewed definitions with stable authoring keys. Describe sources, eligibility, deduplication, coverage, destinations, quiet behavior and bounded checkpoints. Provide one concrete example and an explicit no-automation path. No template may activate automation merely by being selected.

Acceptance must include scheduler, callback and research failure while the existing app remains mounted and usable with saved data and in-progress input intact. Never render automation errors or a mandatory loading state inside generated app content. Automation history is owner-only management UI. Research receipt replay must not duplicate records; failed follow-up email must not repeat research. See `plugin/trialy/skills/trialy-workspace/references/SHARED_AUTOMATIONS.md` for the current authoring/execution contract.

## Current authoring context and release maintenance

Release 0.2.39 provides the app/section/automation contracts above. Guidance 1.3.1 adds the required configuration handoff, executor examples, separate save/readiness reporting and host metadata recovery. Start with [current project context](../../CONTEXT.md), then read the complete [authoring](../../templates/TEMPLATE_AUTHORING.md) and [usage](../../templates/TEMPLATE_USAGE.md) guidance. The [shared blueprint contract](app-template-blueprints/DESIGN_AND_BUILD_CONTRACT.md) applies the same rules to all candidate apps; candidates remain unimplemented until separately built and accepted.

Update both guidance versions and `templateGuidance.version` together. The server returns content hashes and pagination, so readers must follow `nextOffset` to the end. Test version parity and valid schema examples before deployment. Guidance-only changes need no rewritten historical template JSON, app migration or new plugin package. Changes to bundled skills/manifests still need package publication, and newly introduced server tools need host discovery/refresh before a conversation can call them. Never equate a repository release with installed-package refresh or unattended activation.
