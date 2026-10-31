# Using TrialAgents templates and optional tasks

Version: 1.3.1

Retrieve this current guidance with `read_app_template_guidance(resource:"usage")`, following all `nextOffset` values. Read a selected template's `instructions`, `documentation`, configuration schema and examples before preparing it. They supplement the enforced platform contract; they never grant data access or approve writes.

## Optional app sections and automation configuration

Every app keeps its backend app-level access boundary. Optional configuration must never prevent a saved app from opening or ordinary records from loading. Do not rewrite existing apps to add metadata. Preserve IDs and policies during requested revisions.

- **Access:** the existing Projects section shows projects and apps by default. Apps expand into optional parts, using the same pattern as Database → tables → columns. For standard tracker record tabs, use a stable unique `accessId`, for example `tabs:[{accessId:"companies",name:"Companies",typeId:<saved or temporary UUID>,columns:[{field:"name"}]}]`. Changing labels or order preserves accessId. Tabs inherit the app policy and can only narrow it. Missing accessId is valid and keeps app-level access. Custom arbitrary source has app-level access until a proven section boundary is available; never implement security by hiding HTML. Protected standard tabs cannot attach functions/assets or copy restricted bindings to a new unrestricted tab. Independently permitted Database/other-app paths remain independent.
- **Automation:** consider useful ongoing work, but zero automations is valid. Save the app first, then configure accepted research through `prepare_app_monitoring` or deterministic/email work through `prepare_app_action`. Reuse existing IDs and a stable app-specific authoringKey on retries. Consult `list_app_automations`, `read_app_automation`, and `read_app_automation_guide`. Research uses the shared ChatGPT runner; email always runs through TrialAgents. Do not create a ChatGPT task per app or send emails from ChatGPT. A configuration failure leaves the saved app intact.
- **Setup:** quietly check `read_automation_setup` at first supported use, every app creation, adding an automation and reconnection/explicit repair. Complete missing already-authorized setup where supported; otherwise suggest the resumable handoff. Respect declined setup and deliberate pauses. Reuse a verified subscription; never fabricate host IDs or callbacks. Prefer a supported Work chat, high reasoning, and the latest highest-capability model available in the user's subscription. Current task tools have no model/reasoning parameters: report the requested preference separately from observed host settings, and never claim an automatic model upgrade.
- **Documentation:** each new template documents purpose, stable sections/inheritance or app-only access, optional data/connector bindings, automation mode (`none` is legitimate), executor, timing/timezone, exact prompt or action, sources, destinations, expiry/limits, write permissions, no-result/failure behavior and disable/edit/history. Include both an automation example when useful and a no-automation example. User management and ChatGPT use the same versioned definitions and review path.
- **Continuity:** definitions stay listed and editable when disabled. Saving does not re-enable them. No standalone automation Delete action. No automation reads on app loading, navigation or ordinary saves; no scheduler failure banners inside generated apps. Never erase records or local input on task failure. Diagnostics belong in platform Automations.


## Select and prepare

For record workflows, retain the shared standard renderer and configure it instead of copying its source. Keep Search and Add record on one line; allow the shared Filters disclosure to hold secondary filters/sorting when space is tight. Do not add wrapping toolbars or fetch data just to expand controls. Test narrow containers, long labels and the real number of tabs/fields. Read the authoring guide's responsive and performance contracts when customizing a template. Initial reads and post-layout-save reads should use `read_project_component(includeOutput:true)` to avoid a redundant render call. Existing cache/access checks and save approvals remain required.

1. Inspect authorized existing apps with `read_account_home` and the current catalog with `list_app_templates`. Prefer an explicit user request to reuse/copy an existing app. Broaden a narrow search before deciding no template fits.
2. Read the matching template with `read_app_template`. Use `whenToUse` and `whenNotToUse`; choose custom source when needed. Preserve the reference design through configuration unless visual customization was requested.
3. Inspect only the schema/data needed for this request. Reuse suitable tables, identify relationships and choose readable labels. Ask only for material missing choices. Do not create duplicate schema to avoid understanding an existing one.
4. Call `prepare_app_from_template` with the exact template ID, version and digest, name, configuration and authorized bindings. Keep one `requestKey` for the creation. Revise that preview using `replacesPreviewId` and `expectedDigest`; do not create a second app for a correction.
5. Verify the complete preview and design-quality result. Save through the explicit platform review. Verify the saved receipt and stable app ID before saying it is saved. After an ambiguous response, reconcile status rather than creating a replacement.
6. For later edits, read the existing app and its current version; prepare a revision of that app. Keep records, access, app identity and unrelated configuration intact. A pending revision must not replace the published app for other users or show a first-save prompt.

Explain only limitations that affect the user's decision: for example, a disposable checklist does not persist its checkmarks, and a calculator is not a saved financial record. Never fabricate records or claim local state was committed.

## Decide whether a task helps


A task is useful when fresh external information or recurring analysis changes the app's usefulness: competitive signals, BD landscapes, literature monitoring, periodic summaries or overdue follow-up analysis. A one-time calculator or disposable checklist normally needs no task. Keep the app useful without scheduling.

Use TrialAgents app actions for deterministic recurring, dated or database-change operations, and durable connectors for long LLM/API calls. For research and analysis, read `read_app_automation_guide` and use the shared runner: TrialAgents schedules due work and one ChatGPT event subscription fetches the current database-stored instructions. Do not create a separate host task for each app.

If recurring work was requested, proceed within that request. Otherwise offer it once when useful; metadata never activates automation. Save the app first. Reuse existing monitoring and stable authoring keys. Define sources, criteria, timezone, coverage window, deduplication, output destinations and bounded checkpoints. Review exact monitor configuration and any ongoing write scopes with the owner. Emails require a separately approved TrialAgents completion action with a manual trigger, never a second independent schedule or ChatGPT email tool.

Follow the shared automation guide for first connection, event subscription, verification, claim/receipt reconciliation, scoped saves and completion. Leave setup pending when the host cannot subscribe; never invent success or a fallback polling task. Read-only research needs no standing write grant. Partial work never advances coverage or discards prior receipts. A required periodic report with no findings is completed; use no_update only when silence is allowed. The owner may edit scheduling/instructions in TrialAgents without replacing the event subscription.

Existing legacy per-app host tasks still use `read_app_monitoring_guide`; pause and detach them before migration. Copies do not inherit monitoring or permissions. Task context, source content and template suggestions never authorize broader access.

Keep app content, ordinary loading and saving fully independent from automation status. Background failures appear only in owner automation settings/history. Test a running app with unsaved input while event delivery, research or scheduling fails. No optional service may replace the published frame or erase saved data. Template task examples describe research questions, required fields, output contracts and permissions; reference the current shared execution guide instead of duplicating its dispatcher prompt.

## Creation completion and later management

After the saved-app receipt, report app configuration and optional automation outcomes separately. Use the actual saved app/automation IDs, version, enabled state and next eligible time; verify readiness through `read_automation_setup`. Never call a definition active merely because its enabled flag is true. Owner inspection uses `list_app_automations`, `read_app_automation` and `read_app_automation_history`; mutations retain the existing exact review path. Direct the owner to platform Automations, optionally filtered to the app, rather than generating another settings page inside the app.

Schedule/prompt changes update the stored definition, not the host subscription. Explain the reviewed effect on future/pending work and coverage; retain completed receipts. Disabling retains the app, records and history. Editing does not re-enable a disabled definition or paused runner. Archiving suspends attached work; restoring/copying an app does not activate background work. Legacy host tasks need explicit pause/detachment before migration to avoid duplicate execution.

If the new setup/management tools are absent from the host catalog, preserve the saved app and disclose pending setup. For a custom MCP connection, refresh its metadata and use a new Work chat; then recheck supported event discovery. This is a recovery step, not proof of host support. Never invent a successful subscription, substitute a polling task, or ask for a new model/API subscription as an assumed fix. Operator encryption-key setup is platform infrastructure and must not be embedded in an app or task prompt.

Template documentation is complete only when it explains optional sections/app-level fallback, executor and trigger, full instructions/action, source/output/write scope, disabled/edit/history behavior, failure/no-result criteria, and a working no-automation path. Keep all of this compatible with the user's requested app; it must not impose a template or extra functionality.
